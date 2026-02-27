/**
 * Popup UI logic — communicates with background.js via chrome.runtime messaging.
 * Replaces the old popup.js that used WebSocket + fetch to localhost.
 */

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');

    const logStream = document.getElementById('logStream');
    const domainGrid = document.getElementById('domainGrid');
    const progressOverlay = document.getElementById('progressOverlay');
    const progressMsg = document.getElementById('progressMsg');
    const progressFill = document.getElementById('progressFill');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    let fetchedDomains = [];
    let isSearching = false;

    // --- Init ---
    loadHistory();
    checkLoginStatus();
    checkActiveSearch(); // RISK-1: reconnect to running search

    // --- Event Listeners ---

    startBtn.addEventListener('click', () => {
        let count = parseInt(document.getElementById('domainCount').value, 10) || 10;
        // BUG-7 fix: Clamp to valid range
        count = Math.max(1, Math.min(100, count));
        document.getElementById('domainCount').value = count;

        isSearching = true;
        startBtn.disabled = true;
        progressOverlay.classList.add('active');
        progressMsg.textContent = 'Подготовка...';
        progressFill.style.width = '0%';
        exportBtn.style.display = 'none';
        stopBtn.textContent = 'Остановить';

        addLog(`Поиск запущен: ${count} доменов`, 'info');

        chrome.runtime.sendMessage({ action: "startSearch", targetCount: count }, (response) => {
            if (response?.started) {
                addLog('Команда отправлена в Service Worker', 'info');
            }
        });
    });

    stopBtn.addEventListener('click', () => {
        if (isSearching) {
            chrome.runtime.sendMessage({ action: "cancelSearch" });
            addLog('Поиск остановлен пользователем', 'info');
        }
        closeOverlay();
    });

    refreshBtn.addEventListener('click', loadHistory);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "clearHistory" }, () => {
                fetchedDomains = [];
                domainGrid.innerHTML = '';
                exportBtn.style.display = 'none';
                addLog('История очищена', 'info');
            });
        });
    }

    exportBtn.addEventListener('click', () => {
        if (!fetchedDomains.length) return;

        let csvContent = "\uFEFF"; // BOM for Excel UTF-8
        csvContent += "Domain,Backlinks,Age Years,Status\n";

        fetchedDomains.forEach(d => {
            csvContent += `${d.name},${d.bl},${d.ageYears},${d.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `domains_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addLog('CSV файл сохранен', 'success');
    });

    // --- Listen for progress from background ---

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.from !== "background") return;

        if (msg.message) {
            const logType = msg.type === 'error' ? 'error' : (msg.type === 'done' ? 'success' : 'info');
            addLog(msg.message, logType);
            progressMsg.textContent = msg.message;
        }

        if (msg.progress !== undefined) {
            progressFill.style.width = msg.progress + '%';
        }

        if (msg.type === 'candidate' || msg.type === 'result') {
            // Optimistically add/update domain in grid
            if (msg.domain) {
                addOrUpdateDomain(msg.domain);
            }
        }

        if (msg.type === 'done') {
            isSearching = false;
            progressMsg.textContent = 'Готово ✅';
            progressFill.style.width = '100%';
            stopBtn.textContent = 'Закрыть';
            exportBtn.style.display = 'block';
            loadHistory(); // Final refresh
        }

        if (msg.type === 'error') {
            isSearching = false;
            progressMsg.textContent = 'Ошибка ❌';
            stopBtn.textContent = 'Закрыть';
        }
    });

    // --- Functions ---

    function loadHistory() {
        chrome.runtime.sendMessage({ action: "getHistory", limit: 50 }, (response) => {
            if (response?.results) {
                fetchedDomains = response.results;
                renderDomains(fetchedDomains);
            }
        });
    }

    function checkLoginStatus() {
        // Check if there's a tab with expireddomains.net
        chrome.tabs.query({ url: "*://member.expireddomains.net/*" }, (tabs) => {
            if (tabs.length > 0) {
                statusDot.style.background = 'var(--success)';
                statusText.textContent = 'Вкладка ED открыта';
            } else {
                statusDot.style.background = 'var(--text-muted)';
                statusText.textContent = 'Откройте expireddomains.net';
            }
        });
    }

    function addOrUpdateDomain(domain) {
        // Check if already in list
        const existingIndex = fetchedDomains.findIndex(d => d.name === domain.name);
        if (existingIndex >= 0) {
            fetchedDomains[existingIndex] = domain;
        } else {
            fetchedDomains.unshift(domain);
        }
        renderDomains(fetchedDomains);
    }

    function renderDomains(domains) {
        domains.sort((a, b) => (b.bl || 0) - (a.bl || 0)); // Sort by BL descending
        domainGrid.innerHTML = '';
        domains.forEach(d => {
            const card = document.createElement('div');
            card.className = `domain-card ${d.status === 'available' ? 'available' : ''}`;
            card.onclick = () => copyToClipboard(d.name);

            // BUG-1 fix: use textContent for user-controlled data to prevent XSS
            const nameSpan = document.createElement('span');
            nameSpan.className = 'd-name';
            nameSpan.textContent = d.name;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'd-stats';

            const blBadge = document.createElement('span');
            blBadge.className = 'badge';
            blBadge.innerHTML = `BL <span>${Number(d.bl) || 0}</span>`;

            const ageBadge = document.createElement('span');
            ageBadge.className = 'badge';
            ageBadge.innerHTML = `AGE <span>${Number(d.ageYears || d.age_years) || 0}</span>`;

            const statusBadge = document.createElement('span');
            if (d.status === 'available') {
                statusBadge.className = 'status-badge available';
                statusBadge.textContent = 'AVAILABLE';
            } else if (d.status === 'taken') {
                statusBadge.className = 'status-badge taken';
                statusBadge.textContent = 'TAKEN';
            } else {
                statusBadge.className = 'status-badge pending';
                statusBadge.textContent = 'PENDING';
            }

            statsDiv.append(blBadge, ageBadge, statusBadge);
            card.append(nameSpan, statsDiv);
            domainGrid.appendChild(card);
        });

        if (domains.length > 0 && !progressOverlay.classList.contains('active')) {
            exportBtn.style.display = 'block';
        }
    }

    function closeOverlay() {
        progressOverlay.classList.remove('active');
        startBtn.disabled = false;
        isSearching = false;
        stopBtn.textContent = 'Остановить';
    }

    function addLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
        if (logStream.firstChild) {
            logStream.insertBefore(entry, logStream.firstChild);
        } else {
            logStream.appendChild(entry);
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 2000);
        });
    }

    // RISK-1 fix: Check if search is already running when popup opens
    function checkActiveSearch() {
        chrome.runtime.sendMessage({ action: "getSearchState" }, (response) => {
            if (response?.active && response.state) {
                isSearching = true;
                startBtn.disabled = true;
                progressOverlay.classList.add('active');
                progressMsg.textContent = response.state.message || 'Поиск идёт...';
                if (response.state.progress) {
                    progressFill.style.width = response.state.progress + '%';
                }
                addLog('Подключено к текущему поиску', 'info');
            }
        });
    }
});
