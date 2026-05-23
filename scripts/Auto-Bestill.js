// Laget av Alf Einar Johnsen, aej@hnt.no, Pasientreiser Nord-Trøndelag, 20.11.2025
(function() {
// ============================================================
// Auto-Bestilling av turer med status Tildelt [B]
// Åpner en pop-up som lar deg trykke på en knapp for å bestille
// opp alle turer med 0.25 sekunders mellomrom på valgt filter
// ============================================================

    // --- SPERRE MOT DUPLIKAT KJØRING ---
    if (window.__autobestillActive) {
        console.log("⚠️ Auto-bestilling er allerede aktiv! Lukk det eksisterende panelet før du starter på nytt.");
        return;
    }
    window.__autobestillActive = true;

    // --- STIL ---
    const css = `
        .bpanel {
            position: fixed;
            background: #f9f9f9;
            border-radius: 12px;
            padding: 0;
            border: 1px solid #ccc;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            font-family: Arial, sans-serif;
            z-index: 99999;
            width: 330px;
        }
        .bpanel-header {
            background: linear-gradient(135deg, #3b6fc8 0%, #2f5ba5 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px 12px 0 0;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .bpanel-header svg {
            width: 20px;
            height: 20px;
            fill: white;
        }
        .bpanel-body {
            padding: 16px;
        }
        .bpanel-buttons {
            display: flex;
            gap: 6px;
            margin-bottom: 12px;
        }
        .bpanel button {
            background: #3b6fc8;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            flex: 1;
            transition: all 0.2s;
        }
        .bpanel button:hover {
            background: #2f5ba5;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .bpanel button:active {
            transform: translateY(0);
        }
        .bpanel button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .bpanel #stopBtn {
            background: #e67e22;
        }
        .bpanel #stopBtn:hover {
            background: #d35400;
        }
        .bpanel #closeBtn {
            background: #b43838;
            flex: 0.5;
        }
        .bpanel #closeBtn:hover {
            background: #902c2c;
        }
        .bpanel #status {
            margin-top: 12px;
            padding: 10px;
            font-size: 12px;
            color: #333;
            line-height: 1.5;
            background: #fff;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            word-wrap: break-word;
        }
        .bpanel #status b {
            color: #3b6fc8;
        }
    `;
    const styleTag = document.createElement("style");
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    // Tell antall [B] før vi lager panelet
    const initialCount = Array.from(document.querySelectorAll('td.d a'))
        .filter(a => a.textContent.trim() === '[B]').length;

    // Lag panel med header og ikon
    const panel = document.createElement('div');
    panel.className = "bpanel";
    panel.innerHTML = `
        <div class="bpanel-header">
            🤖 Auto-bestilling
        </div>
        <div class="bpanel-body">
            <div class="bpanel-buttons">
                <button id="startBtn">▶ Start</button>
                <button id="stopBtn" disabled>⏸ Stopp</button>
                <button id="closeBtn">Lukk</button>
            </div>
            <div id="status"><b>Inaktiv.</b><br><b>${initialCount}</b> tur${initialCount === 1 ? '' : 'er'} funnet som kan bestilles opp på valgt filter.</div>
        </div>
    `;
    // Overlay som blokkerer bakgrunnen
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.3);';
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Posisjonering: sentrert horisontalt over col2, bunnen mot toppen av headerTransportorer
    const header = document.getElementById("headerTransportorer");
    const col2 = document.getElementById("col2");
    
    if (header && col2) {
        const headerRect = header.getBoundingClientRect();
        const col2Rect = col2.getBoundingClientRect();
        const panelHeight = panel.offsetHeight;
        const panelWidth = panel.offsetWidth;
        
        // Plasser panelet slik at bunnen er ved toppen av header (med 1px gap)
        panel.style.top = `${headerRect.top - panelHeight - 1}px`;
        
        // Sentrer horisontalt over col2
        panel.style.left = `${col2Rect.left + (col2Rect.width / 2) - (panelWidth / 2)}px`;
    } else {
        // Fallback hvis header eller col2 ikke finnes
        panel.style.top = "20px";
        panel.style.right = "20px";
    }

    // Variabler
    let dispatches = [];
    let index = 0;
    let running = false;
    let timer = null;

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const closeBtn = document.getElementById('closeBtn');
    const statusDiv = document.getElementById('status');

    // Funksjoner
    function findButtons() {
        return Array.from(document.querySelectorAll('td.d a'))
            .filter(a => a.textContent.trim() === '[B]');
    }

    function getDispatchCalls(btns) {
        return btns.map(a => {
            const href = a.getAttribute('href') || '';
            const match = href.match(/immediateDispatch\('([^']+)',(\d+)\)/);
            return match ? { reknr: match[1], id: match[2] } : null;
        }).filter(Boolean);
    }

    function onceAfterOpenPopp(callback) {
        const originalOpen = XMLHttpRequest.prototype.open;
        let restored = false;

        const restore = () => {
            if (!restored) {
                restored = true;
                XMLHttpRequest.prototype.open = originalOpen;
            }
        };

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && url.includes('action=openres') && url.includes('rid=-1')) {
                restore();
                this.addEventListener('load', function() {
                    setTimeout(callback, 50);
                }, { once: true });
            }
            return originalOpen.call(this, method, url, ...rest);
        };

        setTimeout(restore, 3000);
    }

    function runNext() {
        if (!running) return;
        if (index < dispatches.length) {
            const { reknr, id } = dispatches[index];
            if (typeof immediateDispatch === 'function') {
                immediateDispatch(reknr, id);
            }
            statusDiv.innerHTML =
                `<b>Aktiv</b><br>Bestiller opp tur ${index + 1} av ${dispatches.length}`;
            index++;
            timer = setTimeout(runNext, 250);
        } else {
            statusDiv.innerHTML = `<b>Oppdaterer...</b><br>Refresher planleggingsbildet...`;
            onceAfterOpenPopp(() => {
                const newBtns = findButtons();
                running = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                if (newBtns.length > 0) {
                    statusDiv.innerHTML =
                        `<b>✓ Ferdig!</b><br>Alle turer bestilt opp. Fant <b>${newBtns.length}</b> nye tur${newBtns.length === 1 ? '' : 'er'} som kan bestilles opp.`;
                } else {
                    statusDiv.innerHTML = '<b>✓ Ferdig!</b><br>Alle turer er bestilt opp!';
                }
            });
            openPopp("-1");
        }
    }

    function startClicking() {
        dispatches = getDispatchCalls(findButtons());
        index = 0;
        running = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusDiv.innerHTML =
            `<b>Starter...</b><br>Fant ${dispatches.length} turer å bestille opp`;
        runNext();
    }

    function stopClicking() {
        running = false;
        clearTimeout(timer);
        const remaining = dispatches.length - index;
        statusDiv.innerHTML =
            `<b>⏸ Stoppet</b><br>${remaining} turer gjenstår å bestille opp`;
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    function closePanel() {
        stopClicking();
        overlay.remove();
        panel.remove();
        document.removeEventListener('keydown', escListener);
        window.__autobestillActive = false;
        openPopp("-1");
    }

    // ESC = lukk panel
    function escListener(e) {
        if (e.key === "Escape") {
            closePanel();
        }
    }
    document.addEventListener('keydown', escListener);

    // Knapper
    startBtn.onclick = startClicking;
    stopBtn.onclick = stopClicking;
    closeBtn.onclick = closePanel;

})();