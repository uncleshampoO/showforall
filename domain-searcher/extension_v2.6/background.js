/**
 * Background Service Worker — Orchestrator & RDAP Verifier.
 * Replaces main.py (FastAPI) + verifier.py.
 *
 * Responsibilities:
 *   1. Receive commands from popup.js
 *   2. Open/find the expireddomains.net tab
 *   3. Coordinate content.js for scraping
 *   4. Verify domains via Verisign RDAP API
 *   5. Save results via storage.js
 *   6. Report progress back to popup
 */

// NOTE: importScripts is valid for MV3 classic service workers.
// If Chrome migrates to ES modules in the future, switch to static import.
importScripts("storage.js");

// --- State ---
let activeSearch = null; // { tabId, taskId, targetCount, found, cancelled }
let keepAliveInterval = null; // BUG-2 fix: prevent SW termination

// --- RDAP Verifier (replaces verifier.py) ---

/**
 * Check domain availability via Verisign RDAP API.
 * @param {string} domain - e.g. "example.com"
 * @returns {Promise<"available"|"taken"|"error">}
 */
async function checkDomainRDAP(domain) {
    const url = `https://rdap.verisign.com/com/v1/domain/${domain}`;
    try {
        const response = await fetch(url, { method: "GET" });
        if (response.status === 404) return "available";
        if (response.status === 200) return "taken";
        return "error";
    } catch (e) {
        console.warn(`RDAP error for ${domain}:`, e);
        return "error";
    }
}

/**
 * Verify a batch of domains with rate limiting.
 * @param {object[]} candidates - Array of { name, bl, ageYears, ... }
 * @param {function} onProgress - callback(domain, current, total)
 * @returns {Promise<object[]>} verified domains with updated status
 */
async function verifyDomains(candidates, onProgress) {
    const verified = [];
    const total = candidates.length;

    for (let i = 0; i < total; i++) {
        if (activeSearch?.cancelled) break;

        const candidate = candidates[i];
        const status = await checkDomainRDAP(candidate.name);
        candidate.status = status;

        if (status === "available") {
            verified.push(candidate);
        }

        if (onProgress) {
            onProgress(candidate, i + 1, total);
        }

        // Rate limiting: 1 second between RDAP queries
        if (i < total - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    return verified;
}

// --- Tab Management ---

/**
 * Find or create a tab with expireddomains.net.
 * @returns {Promise<number>} tabId
 */
async function getOrCreateEDTab() {
    const tabs = await chrome.tabs.query({ url: "*://member.expireddomains.net/*" });
    if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        return tabs[0].id;
    }

    const tab = await chrome.tabs.create({
        url: "https://member.expireddomains.net/",
        active: true,
    });
    return tab.id;
}

/**
 * Ensure content script is injected into the tab.
 * BUG-5 fix: After page navigation, old content script is destroyed.
 * @param {number} tabId
 */
async function ensureContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["filters.js", "content.js"],
        });
    } catch (e) {
        // Already injected or tab not ready — ignore
        console.debug("Content script injection:", e.message);
    }
}

/**
 * Send a message to a content script in a specific tab.
 * Waits for the tab to be ready and retries if content script is not yet loaded.
 * BUG-5 fix: Re-injects content script after navigation kills it.
 * @param {number} tabId
 * @param {object} message
 * @returns {Promise<any>}
 */
async function sendToTab(tabId, message) {
    // Wait for tab to complete loading
    await waitForTabComplete(tabId);

    // Retry mechanism for content script readiness
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, message);
            return response;
        } catch (e) {
            // Content script not ready — try re-injecting on attempt 2
            if (attempt === 2) {
                await ensureContentScript(tabId);
            }
            if (attempt < 5) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    throw new Error("Content script not responding after 6 attempts");
}

/**
 * Wait for a tab to finish loading.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function waitForTabComplete(tabId) {
    return new Promise((resolve) => {
        const check = async () => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab.status === "complete") return resolve();
            } catch (e) {
                return resolve(); // tab might be closed
            }
            setTimeout(check, 500);
        };
        check();
    });
}

// --- Main Search Orchestration ---

/**
 * Gaussian-distributed random delay — more human-like than flat random.
 * Using Box-Muller transform to generate normally distributed values.
 * @param {number} meanSec - Average delay in seconds
 * @param {number} stdDevSec - Standard deviation in seconds
 * @param {number} minSec - Minimum delay (floor)
 * @returns {Promise<void>}
 */
function humanDelay(meanSec = 20, stdDevSec = 8, minSec = 5) {
    // Box-Muller transform for Gaussian random
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const delay = Math.max(minSec, meanSec + gaussian * stdDevSec);
    console.log(`[DS] Human delay: ${delay.toFixed(1)}s`);
    return new Promise(r => setTimeout(r, delay * 1000));
}

/**
 * Simulate a human reading/scrolling a page before doing anything.
 * Random 10-30 second pause.
 */
function simulateReading() {
    const readTime = 10 + Math.random() * 20; // 10-30 sec
    console.log(`[DS] Simulating reading: ${readTime.toFixed(1)}s`);
    return new Promise(r => setTimeout(r, readTime * 1000));
}

/**
 * Run the full search pipeline.
 * @param {number} targetCount - How many domains to find
 * @param {function} sendProgress - Send progress updates to popup
 */
async function runSearch(targetCount, sendProgress) {
    // BUG-2 fix: Keep Service Worker alive during long-running search
    keepAliveInterval = setInterval(() => {
        chrome.runtime.getPlatformInfo(() => { });
    }, 25000);

    // 1. Create task
    const taskId = await createTask(targetCount);
    const scrapeTarget = targetCount * 3; // Oversample for filtering

    activeSearch = {
        tabId: null,
        taskId,
        targetCount,
        found: 0,
        cancelled: false,
    };

    // RISK-1 fix: Persist search state so popup can reconnect
    await chrome.storage.session.set({
        ds_active_search: { taskId, targetCount, status: "running", message: "Запуск..." }
    });

    try {
        // 2. Get or create tab
        sendProgress({ type: "status", message: "🔍 Поиск вкладки expireddomains.net...", progress: 5 });
        const tabId = await getOrCreateEDTab();
        activeSearch.tabId = tabId;

        // 3. Wait for page + check login
        await waitForTabComplete(tabId);
        await new Promise(r => setTimeout(r, 2000)); // Wait for content script

        sendProgress({ type: "status", message: "🔑 Проверка авторизации...", progress: 10 });

        let loginResult;
        try {
            loginResult = await sendToTab(tabId, { action: "checkLogin" });
        } catch (e) {
            sendProgress({ type: "error", message: "❌ Content Script не загрузился. Перейдите на expireddomains.net и попробуйте снова." });
            return;
        }

        if (!loginResult?.loggedIn) {
            sendProgress({
                type: "error",
                message: "❌ Вы не залогинены на expireddomains.net. Пожалуйста, войдите в аккаунт в любой вкладке и попробуйте снова."
            });
            return;
        }

        sendProgress({ type: "status", message: "✅ Авторизация подтверждена", progress: 15 });

        // 4. Navigate to Deleted .com via tab click (human-like)
        sendProgress({ type: "status", message: "📍 Переход в раздел Deleted .com...", progress: 20 });

        // Check if we're already on the right page
        let locationCheck;
        try {
            locationCheck = await sendToTab(tabId, { action: "isOnDeletedCom" });
        } catch (e) {
            locationCheck = { onPage: false };
        }

        if (!locationCheck?.onPage) {
            // Click the "Deleted .com" tab like a human would
            const clickResult = await sendToTab(tabId, { action: "goToDeletedCom" });

            if (!clickResult?.clicked) {
                sendProgress({
                    type: "error",
                    message: "❌ Не удалось найти вкладку 'Deleted .com' на странице. Откройте раздел Deleted Domains вручную и попробуйте снова."
                });
                return;
            }

            // Wait for page to load after clicking the tab
            await new Promise(r => setTimeout(r, 3000));
            await waitForTabComplete(tabId);
            await ensureContentScript(tabId);
            await new Promise(r => setTimeout(r, 2000));
        }

        // 5. Wait for table to be ready
        sendProgress({ type: "status", message: "⏳ Ожидание загрузки таблицы...", progress: 25 });
        await humanDelay(1, 3);

        // 6. Scrape pages
        sendProgress({ type: "status", message: "📝 Начинаем сбор доменов...", progress: 30 });

        const allCandidates = [];
        let pageNum = 1;
        let emptyPagesInRow = 0;
        const maxPages = Math.min(Math.ceil(scrapeTarget / 25), 7); // Max 7 pages per session
        let nextBreakAt = 2 + Math.floor(Math.random() * 3); // Random: break after 2-4 pages

        for (let p = 0; p < maxPages; p++) {
            if (activeSearch.cancelled) break;
            if (allCandidates.length >= scrapeTarget) break;

            // Coffee break at random intervals (every 2-4 pages)
            if (p > 0 && p >= nextBreakAt) {
                const breakDuration = 90 + Math.floor(Math.random() * 90); // 90-180 sec
                sendProgress({
                    type: "status",
                    message: `☕ Перерыв ${Math.round(breakDuration / 60)} мин для безопасности...`,
                    progress: 30 + (p / maxPages) * 40
                });
                await new Promise(r => setTimeout(r, breakDuration * 1000));
                nextBreakAt = p + 2 + Math.floor(Math.random() * 3); // Next break after 2-4 more pages
            }

            // Simulate human reading the page before parsing
            await simulateReading();

            // Parse current page
            let parseResult;
            try {
                parseResult = await sendToTab(tabId, { action: "parsePage" });
            } catch (e) {
                console.warn(`Failed to parse page ${pageNum}:`, e);
                // Try re-injecting content script and retry once
                await ensureContentScript(tabId);
                await new Promise(r => setTimeout(r, 2000));
                try {
                    parseResult = await sendToTab(tabId, { action: "parsePage" });
                } catch (e2) {
                    console.error(`Retry also failed for page ${pageNum}:`, e2);
                    break;
                }
            }

            if (parseResult?.domains && parseResult.domains.length > 0) {
                emptyPagesInRow = 0; // Reset counter
                for (const domain of parseResult.domains) {
                    domain.sourcePage = pageNum;
                    allCandidates.push(domain);

                    // Save to storage immediately
                    await saveDomainResult(taskId, domain);

                    // Report candidate to popup
                    const progress = 30 + Math.min((allCandidates.length / scrapeTarget) * 40, 40);
                    sendProgress({
                        type: "candidate",
                        domain,
                        progress,
                        message: `📦 Собрано: ${allCandidates.length}/${scrapeTarget}`
                    });
                }
            } else {
                emptyPagesInRow++;

                // On first empty page, fetch debug info
                if (emptyPagesInRow === 1 && p === 0) {
                    try {
                        const debugInfo = await sendToTab(tabId, { action: "getDebugInfo" });
                        console.log("[DS] Debug info:", JSON.stringify(debugInfo));
                        if (debugInfo) {
                            const details = `URL: ${debugInfo.url}, Tables: ${debugInfo.tableClasses?.join(", ") || "none"}, ` +
                                `Namelinks: ${debugInfo.namelinksCount}, LoggedIn: ${debugInfo.hasLogout}`;
                            sendProgress({
                                type: "status",
                                message: `🔍 Диагностика: ${details}`
                            });
                        }
                    } catch (dbgErr) {
                        console.warn("Debug info failed:", dbgErr);
                    }
                }

                // RISK-2: If 3 pages in a row are empty, warn user
                if (emptyPagesInRow >= 3) {
                    sendProgress({
                        type: "status",
                        message: "⚠️ 3 пустых страницы подряд. Возможно, сайт обновил верстку или фильтры слишком строгие."
                    });
                    break;
                }
            }

            // Go to next page if available
            if (!parseResult?.hasNext || allCandidates.length >= scrapeTarget) break;

            // Human delay before clicking next — 15-45 sec like reading
            await humanDelay(25, 10, 15);

            sendProgress({
                type: "status",
                message: `📄 Переход на стр. ${pageNum + 1}...`,
                progress: 30 + (p / maxPages) * 40
            });

            try {
                await sendToTab(tabId, { action: "clickNext" });
                // Page reloads after click — wait and re-inject content script
                await new Promise(r => setTimeout(r, 3000));
                await waitForTabComplete(tabId);
                await ensureContentScript(tabId);
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.warn("Navigation error:", e);
                // Try re-inject and continue
                await ensureContentScript(tabId);
                await new Promise(r => setTimeout(r, 2000));
            }

            pageNum++;
        }

        if (allCandidates.length === 0) {
            sendProgress({ type: "error", message: "❌ Домены не найдены. Возможно, фильтры слишком строгие или аккаунт ограничен." });
            await updateTask(taskId, "failed", 0);
            return;
        }

        // 7. Verify via RDAP
        sendProgress({ type: "status", message: `🔎 Проверка доступности ${allCandidates.length} доменов через RDAP...`, progress: 70 });

        const verifiedDomains = await verifyDomains(allCandidates, (domain, current, total) => {
            const progress = 70 + Math.min((current / total) * 25, 25);

            // Update domain status in storage
            saveDomainResult(taskId, domain);

            sendProgress({
                type: domain.status === "available" ? "result" : "status",
                domain,
                progress,
                message: `🔎 Проверено: ${current}/${total}`
            });
        });

        // 8. Complete
        const availableCount = verifiedDomains.length;
        await updateTask(taskId, "completed", availableCount);

        sendProgress({
            type: "done",
            message: `✅ Поиск завершен! Найдено ${availableCount} свободных доменов из ${allCandidates.length} проверенных.`,
            progress: 100
        });

    } catch (e) {
        console.error("Search error:", e);
        sendProgress({ type: "error", message: `💥 Ошибка: ${e.message}` });
        if (activeSearch?.taskId) {
            await updateTask(activeSearch.taskId, "failed", 0);
        }
    } finally {
        activeSearch = null;
        // BUG-2 fix: Stop keepalive
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        // RISK-1 fix: Clear active search state
        await chrome.storage.session.remove("ds_active_search");
    }
}

// --- Message Listener ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Popup: Start search
    if (msg.action === "startSearch") {
        const targetCount = msg.targetCount || 10;

        // Safety warning for big searches
        if (targetCount > 50) {
            console.warn("Large search requested:", targetCount);
        }

        runSearch(targetCount, async (progressData) => {
            // Forward progress to popup
            chrome.runtime.sendMessage({ ...progressData, from: "background" }).catch(() => {
                // Popup might be closed, that's ok
            });
            // RISK-1 fix: Persist latest status for popup reconnect
            if (progressData.message) {
                await chrome.storage.session.set({
                    ds_active_search: {
                        taskId: activeSearch?.taskId,
                        targetCount,
                        status: progressData.type,
                        message: progressData.message,
                        progress: progressData.progress || 0
                    }
                });
            }
        });

        sendResponse({ started: true });
        return;
    }

    // Popup: Cancel search
    if (msg.action === "cancelSearch") {
        if (activeSearch) {
            activeSearch.cancelled = true;
        }
        sendResponse({ cancelled: true });
        return;
    }

    // Popup: Get history
    if (msg.action === "getHistory") {
        getHistory(msg.limit || 50).then(results => {
            sendResponse({ results });
        });
        return true; // async response
    }

    // Popup: Clear history
    if (msg.action === "clearHistory") {
        clearHistory().then(() => sendResponse({ done: true }));
        return true;
    }

    // Content script: Ready notification
    if (msg.type === "contentReady") {
        console.log("Content script ready on:", msg.url);
        return;
    }

    // RISK-1: Popup asks for current search state
    if (msg.action === "getSearchState") {
        chrome.storage.session.get("ds_active_search", (data) => {
            sendResponse({
                active: !!activeSearch,
                state: data.ds_active_search || null
            });
        });
        return true; // async
    }
});
