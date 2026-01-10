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
                <button id="closeBtn">X</button>
            </div>
            <div id="status"><b>Inaktiv.</b><br><b>${initialCount}</b> tur${initialCount === 1 ? '' : 'er'} funnet som kan bestilles opp på valgt filter.</div>
        </div>
    `;
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
    let buttons = [];
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

    function clickNext() {
        if (!running) return;
        if (index < buttons.length) {
            buttons[index].click();
            statusDiv.innerHTML =
                `<b>Aktiv</b><br>Bestiller opp tur nummer ${index + 1} av ${buttons.length}`;
            index++;
            timer = setTimeout(clickNext, 250);
        } else {
            buttons = findButtons();
            if (buttons.length > 0) {
                index = 0;
                statusDiv.innerHTML =
                    `<b>Aktiv</b><br>Fant ${buttons.length} flere turer å bestille opp, fortsetter...`;
                timer = setTimeout(clickNext, 250);
            } else {
                statusDiv.innerHTML =
                    '<b>✓ Ferdig!</b><br>Alle turer er bestilt opp!';
                running = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }
        }
    }

    function startClicking() {
        buttons = findButtons();
        index = 0;
        running = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusDiv.innerHTML =
            `<b>Starter...</b><br>Fant ${buttons.length} knapper`;
        clickNext();
    }

    function stopClicking() {
        running = false;
        clearTimeout(timer);
        const remaining = buttons.length - index;
        statusDiv.innerHTML = 
            `<b>⏸ Stoppet</b><br>${remaining} turer gjenstår å bestille opp`;
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    function closePanel() {
        stopClicking();
        panel.remove();
        document.removeEventListener('keydown', escListener);
        // Frigjør sperren når panelet lukkes
        window.__autobestillActive = false;
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