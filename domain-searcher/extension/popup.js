document.addEventListener('DOMContentLoaded', () => {
    // В Production версии эти настройки хардкодятся для простоты использования конечным пользователем
    const SERVER_URL = 'http://localhost:8000';
    const MANAGER_ID = 'default_user';

    const authBtn = document.getElementById('authBtn');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');

    const logStream = document.getElementById('logStream');
    const domainGrid = document.getElementById('domainGrid');
    const progressOverlay = document.getElementById('progressOverlay');
    const progressMsg = document.getElementById('progressMsg');
    const progressFill = document.getElementById('progressFill');

    let ws = null;
    let fetchedDomains = [];

    // Auto-load history on start
    fetchHistory();

    authBtn.addEventListener('click', async () => {
        addLog('Получение авторизации...', 'info');
        authBtn.disabled = true;

        chrome.cookies.getAll({ domain: "expireddomains.net" }, async (cookies) => {
            if (!cookies || cookies.length === 0) {
                addLog('Cookie не найдены. Войдите на expireddomains.net в соседней вкладке.', 'error');
                authBtn.disabled = false;
                return;
            }

            const storageState = {
                cookies: cookies.map(c => ({
                    name: c.name, value: c.value, domain: c.domain, path: c.path,
                    expires: c.expirationDate || -1, httpOnly: c.httpOnly, secure: c.secure,
                    sameSite: c.sameSite === "no_restriction" ? "None" : (c.sameSite === "unspecified" ? "Lax" : c.sameSite)
                })),
                origins: []
            };

            try {
                const res = await fetch(`${SERVER_URL}/api/session`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: MANAGER_ID, storage_state: storageState })
                });

                if (res.ok) {
                    addLog('Доступ синхронизирован!', 'success');
                    authBtn.textContent = '✅ Доступ синхронизирован';
                    authBtn.classList.add('success');
                } else {
                    addLog(`Ошибка сервера: ${res.statusText}`, 'error');
                }
            } catch (err) {
                addLog(`Сетевая ошибка. Сервер запущен?`, 'error');
            } finally {
                authBtn.disabled = false;
            }
        });
    });

    startBtn.addEventListener('click', () => {
        const count = document.getElementById('domainCount').value;
        const url = SERVER_URL.replace(/^http/, 'ws') + '/ws/search';

        startBtn.disabled = true;
        progressOverlay.classList.add('active');
        progressMsg.textContent = 'Подготовка парсера...';
        progressFill.style.width = '0%';
        exportBtn.style.display = 'none';

        try {
            ws = new WebSocket(url);
        } catch (e) {
            addLog(`Ошибка создания WebSocket: ${e.message}`, 'error');
            closeOverlay();
            return;
        }

        ws.onopen = () => {
            ws.send(JSON.stringify({ target_count: parseInt(count), username: MANAGER_ID }));
            addLog(`Соединение установлено. Начинаем поиск...`, 'info');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.message) {
                addLog(data.message, data.type === 'error' ? 'error' : (data.type === 'success' ? 'success' : 'info'));
                progressMsg.textContent = data.message;
            }

            if (data.progress !== undefined) {
                progressFill.style.width = data.progress + '%';
            }

            if (data.type === 'result' || data.type === 'candidate') {
                fetchHistory(); // Refresh grid gently
            }

            if (data.type === 'done') {
                addLog('Поиск успешно завершен!', 'success');
                progressMsg.textContent = 'Готово ✅';
                progressFill.style.width = '100%';
                stopBtn.textContent = 'Закрыть';
                exportBtn.style.display = 'block';
            }

            if (data.type === 'error') {
                progressMsg.textContent = 'Ошибка ❌';
                stopBtn.textContent = 'Закрыть';
            }
        };

        ws.onerror = () => {
            addLog('WebSocket соединение прервано.', 'error');
            closeOverlay();
        };

        ws.onclose = () => {
            stopBtn.textContent = 'Закрыть';
        };
    });

    stopBtn.addEventListener('click', () => {
        if (ws) ws.close();
        closeOverlay();
    });

    refreshBtn.addEventListener('click', fetchHistory);

    exportBtn.addEventListener('click', () => {
        if (!fetchedDomains.length) return;

        // Use BOM to fix Excel UTF-8 display issues
        let csvContent = "\uFEFF";
        csvContent += "Domain,Backlinks,Age Years,Status\n";

        fetchedDomains.forEach(d => {
            csvContent += `${d.name},${d.bl},${d.age_years},${d.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `domains_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    async function fetchHistory() {
        try {
            const res = await fetch(`${SERVER_URL}/api/history`);
            if (!res.ok) return;
            fetchedDomains = await res.json();
            renderDomains(fetchedDomains);
        } catch (err) {
            console.log('Backend not available yet', err);
        }
    }

    function renderDomains(domains) {
        domainGrid.innerHTML = '';
        domains.forEach(d => {
            const card = document.createElement('div');
            card.className = `domain-card ${d.status === 'available' ? 'available' : ''}`;
            card.onclick = () => copyToClipboard(d.name);

            const statusColor = d.status === 'available' ? 'var(--success)' : 'var(--text-muted)';

            card.innerHTML = `
                <span class="d-name">${d.name}</span>
                <div class="d-stats">
                    <span class="badge">BL <span>${d.bl}</span></span>
                    <span class="badge">AGE <span>${d.age_years}</span></span>
                    <span class="badge" style="color:${statusColor}; border-color: ${statusColor}30">${d.status.toUpperCase()}</span>
                </div>
            `;
            domainGrid.appendChild(card);
        });
        if (domains.length > 0 && exportBtn.style.display === 'none' && !progressOverlay.classList.contains('active')) {
            exportBtn.style.display = 'block';
        }
    }

    function closeOverlay() {
        progressOverlay.classList.remove('active');
        startBtn.disabled = false;
        stopBtn.textContent = 'Остановить';
    }

    function addLog(msg, type) {
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

    window.copyToClipboard = function (text) {
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 2000);
        });
    }
});
