/**
 * Content Script — Injected into expireddomains.net pages.
 * Replaces the entire Playwright scraper (scraper.py).
 *
 * Listens for commands from background.js and:
 *   1. Checks if user is logged in
 *   2. Navigates to Deleted .com section
 *   3. Applies filters (age)
 *   4. Parses domain table rows
 *   5. Clicks "Next" for pagination
 *
 * All stealth logic (jitter, delays, mouse movement) is unnecessary
 * because this runs inside the user's real Chrome browser.
 */

const MIN_AGE_YEARS = 5;
const BASE_URL = "https://member.expireddomains.net";

// --- Utility ---

/**
 * Human-like delay to avoid rate limiting (not bot detection — just HTTP rate limits).
 * @param {number} minMs
 * @param {number} maxMs
 * @returns {Promise<void>}
 */
function humanDelay(minMs = 2000, maxMs = 5000) {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Wait for a selector to appear in the DOM.
 * @param {string} selector
 * @param {number} timeoutMs
 * @returns {Promise<Element|null>}
 */
function waitForSelector(selector, timeoutMs = 10000) {
    return new Promise(resolve => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeoutMs);
    });
}

/**
 * Wait for the page to fully load after navigation.
 * @returns {Promise<void>}
 */
function waitForPageLoad() {
    return new Promise(resolve => {
        if (document.readyState === "complete") return resolve();
        window.addEventListener("load", resolve, { once: true });
        // Safety timeout
        setTimeout(resolve, 15000);
    });
}

// --- Core Functions ---

/**
 * Check if user is logged in on expireddomains.net.
 * @returns {boolean}
 */
function checkLoggedIn() {
    return !!document.querySelector('a[href*="logout"]');
}

/**
 * Parse the domain listing table on the current page.
 * Uses multiple selector strategies to handle different site versions.
 * @returns {object[]} Array of { name, bl, ageYears, sourcePage, status }
 */
function parseCurrentPage() {
    const domains = [];

    // Strategy 1: Try multiple table selectors
    let rows = null;
    const tableSelectors = [
        "table#listing tr",
        "table.base1 tr",
        ".base1 tr",
        "table.base2 tr",
        "#listing tr",
    ];

    for (const sel of tableSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 1) { // >1 because first row is header
            rows = found;
            console.log(`[DS] Found ${found.length} rows with selector: ${sel}`);
            break;
        }
    }

    // Strategy 2: Fallback — find any table row that contains domain links
    if (!rows || rows.length <= 1) {
        const allRows = document.querySelectorAll("table tr");
        const domainRows = Array.from(allRows).filter(r =>
            r.querySelector('a.namelinks, td.field_domain a, a[href*="expireddomains.net/domain/"]')
        );
        if (domainRows.length > 0) {
            rows = domainRows;
            console.log(`[DS] Fallback: Found ${domainRows.length} rows with domain links`);
        }
    }

    if (!rows || rows.length === 0) {
        console.warn("[DS] No table rows found on page. URL:", window.location.href);
        return domains;
    }

    for (const row of rows) {
        try {
            // Find domain name — try multiple selectors
            const nameCell = row.querySelector("a.namelinks")
                || row.querySelector("td.field_domain a")
                || row.querySelector('a[href*="/domain/"]');
            if (!nameCell) continue;

            let domainName = nameCell.textContent.trim().toLowerCase();
            // Clean up: remove any trailing dots or whitespace
            domainName = domainName.replace(/\.$/, "");
            if (!domainName || !domainName.includes(".")) {
                // Might be just the name without TLD, append .com
                if (domainName && /^[a-z0-9-]+$/.test(domainName)) {
                    domainName = domainName + ".com";
                } else {
                    continue;
                }
            }

            // Extract BL (backlinks) — try multiple class names
            let blValue = 0;
            const blCell = row.querySelector("td.field_bl, td.field_dp, td.field_bl_dns");
            if (blCell) {
                const blText = blCell.textContent.trim().replace(/,/g, "").replace(/\./g, "");
                blValue = /^\d+$/.test(blText) ? parseInt(blText, 10) : 0;
            }

            // Extract age (Archive.org Birth Year or Whois Birth Year)
            let ageValue = 0;
            const ageCell = row.querySelector("td.field_abirth, td.field_wby, td.field_aby");
            if (ageCell) {
                const ageText = ageCell.textContent.trim();
                if (/^\d{4}$/.test(ageText)) {
                    const birthYear = parseInt(ageText, 10);
                    if (birthYear >= 1980 && birthYear <= 2026) {
                        ageValue = 2026 - birthYear;
                    }
                }
            }

            // Apply stop-word filter (isCleanDomain is loaded from filters.js)
            if (typeof isCleanDomain === "function" && !isCleanDomain(domainName)) {
                continue;
            }

            // Age check — only filter if we got a valid age
            if (ageValue > 0 && ageValue < MIN_AGE_YEARS) {
                continue;
            }

            domains.push({
                name: domainName,
                bl: blValue,
                ageYears: ageValue,
                sourcePage: 0, // Will be set by caller
                status: "pending",
            });
        } catch (e) {
            // Skip broken rows
            continue;
        }
    }

    console.log(`[DS] Parsed ${domains.length} domains from page`);
    return domains;
}

/**
 * Get debug info about the current page to help diagnose parsing failures.
 * @returns {object}
 */
function getPageDebugInfo() {
    return {
        url: window.location.href,
        title: document.title,
        hasTable: !!document.querySelector("table"),
        tableIds: Array.from(document.querySelectorAll("table")).map(t => t.id || "(no id)").slice(0, 5),
        tableClasses: Array.from(document.querySelectorAll("table")).map(t => t.className || "(no class)").slice(0, 5),
        namelinksCount: document.querySelectorAll("a.namelinks").length,
        hasLogout: !!document.querySelector('a[href*="logout"]'),
        bodySnippet: document.body?.innerText?.substring(0, 300) || "",
    };
}

/**
 * Check if there is a "Next" pagination link.
 * @returns {boolean}
 */
function hasNextPage() {
    return !!document.querySelector("a.next");
}

/**
 * Click the "Next" page link.
 */
function clickNextPage() {
    const nextLink = document.querySelector("a.next");
    if (nextLink) {
        nextLink.click();
        return true;
    }
    return false;
}

/**
 * Click on the "Deleted .com" tab link — human-like navigation.
 * @returns {boolean} true if clicked
 */
function clickDeletedCom() {
    // Strategy 1: Find by href
    let tab = document.querySelector('a[href*="/domains/expiredcom"]')
        || document.querySelector('a[href*="expiredcom"]');

    // Strategy 2: Find by text content
    if (!tab) {
        const allLinks = document.querySelectorAll("a");
        tab = Array.from(allLinks).find(el => {
            const text = el.textContent.trim().toLowerCase();
            return text === "deleted .com" || text === "deleted.com" || text.includes("deleted .com");
        });
    }

    if (tab) {
        console.log("[DS] Clicking 'Deleted .com' tab:", tab.href || tab.textContent);
        tab.click();
        return true;
    }

    console.warn("[DS] Could not find 'Deleted .com' tab link");
    return false;
}

/**
 * Check if we are currently on the Deleted .com listing page.
 * @returns {boolean}
 */
function isOnDeletedComPage() {
    const url = window.location.href.toLowerCase();
    return url.includes("/domains/expiredcom") || url.includes("expiredcom");
}

/**
 * Try to open the filter panel and set minimum age filter on expireddomains.net.
 */
async function applyFilters() {
    // BUG-4 fix: :has-text() is Playwright-only, use native DOM text search
    // 1. Try to open filter panel
    let filterToggle = document.querySelector(
        'a.showfilter, a[onclick*="showfilter"], .showfilter, #showfilter, a[href*="showfilter"]'
    );

    // Fallback: search by text content
    if (!filterToggle) {
        const allLinks = document.querySelectorAll('a, button');
        filterToggle = Array.from(allLinks).find(el => {
            const text = el.textContent.trim().toLowerCase();
            return text.includes('show filter') || text === 'filter';
        });
    }

    if (filterToggle) {
        filterToggle.click();
        await humanDelay(1000, 2000);
    }

    // 2. Try to set age filter
    const ageSelect = document.querySelector('select#fwhoisage, select[name="fwhoisage"]');
    if (ageSelect) {
        // Find option with ~2010 (16 years)
        for (const opt of ageSelect.options) {
            if (opt.text.includes("2010") || opt.text.includes("16 Year")) {
                ageSelect.value = opt.value;
                ageSelect.dispatchEvent(new Event("change", { bubbles: true }));
                break;
            }
        }
    } else {
        // Try input-based filter fields
        for (const fieldName of ["fage", "f_aby", "f_aby_min"]) {
            const input = document.querySelector(`input[name="${fieldName}"]`);
            if (input) {
                input.value = String(MIN_AGE_YEARS);
                input.dispatchEvent(new Event("input", { bubbles: true }));
                break;
            }
        }
    }

    // 3. Submit filter form
    const submitBtn = document.querySelector('input[name="button_submit"], button[type="submit"]');
    if (submitBtn) {
        await humanDelay(500, 1000);
        submitBtn.click();
    }
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "checkLogin") {
        sendResponse({ loggedIn: checkLoggedIn() });
        return;
    }

    if (msg.action === "parsePage") {
        const domains = parseCurrentPage();
        sendResponse({ domains, hasNext: hasNextPage() });
        return;
    }

    if (msg.action === "clickNext") {
        const success = clickNextPage();
        sendResponse({ success });
        return;
    }

    if (msg.action === "applyFilters") {
        applyFilters().then(() => {
            sendResponse({ done: true });
        });
        return true; // async response
    }

    if (msg.action === "getUrl") {
        sendResponse({ url: window.location.href });
        return;
    }

    if (msg.action === "goToDeletedCom") {
        const clicked = clickDeletedCom();
        sendResponse({ clicked });
        return;
    }

    if (msg.action === "isOnDeletedCom") {
        sendResponse({ onPage: isOnDeletedComPage() });
        return;
    }

    if (msg.action === "getDebugInfo") {
        sendResponse(getPageDebugInfo());
        return;
    }
});

// Announce content script is ready
chrome.runtime.sendMessage({ type: "contentReady", url: window.location.href });
