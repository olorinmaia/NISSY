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
            width: 360px;
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
        #toggleListBtn {
            background: none !important;
            color: #3b6fc8 !important;
            border: 1px solid #3b6fc8 !important;
            padding: 5px 10px !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            flex: none !important;
            width: 100%;
            text-align: left;
            margin-bottom: 8px;
            box-shadow: none !important;
            transform: none !important;
        }
        #toggleListBtn:hover {
            background: #eaf0fb !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .tur-filter-wrap {
            padding: 5px 0 6px;
        }
        .tur-filter-input {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 4px 8px;
            font-size: 12px;
            outline: none;
            font-family: Arial, sans-serif;
        }
        .tur-filter-input:focus {
            border-color: #3b6fc8;
        }
        .tur-list-container {
            max-height: 160px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            margin-bottom: 10px;
            background: #fff;
        }
        .tur-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .tur-table th {
            position: sticky;
            top: 0;
            background: #3b6fc8;
            color: white;
            padding: 5px 7px;
            text-align: left;
            font-weight: 600;
        }
        .tur-table th:first-child {
            width: 22px;
        }
        .tur-table th.sortable {
            cursor: pointer;
            user-select: none;
        }
        .tur-table th.sortable:hover {
            background: #2f5ba5;
        }
        .sort-indicator {
            margin-left: 4px;
            font-size: 10px;
            opacity: 0.75;
        }
        .tur-table td {
            padding: 4px 7px;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: middle;
        }
        .tur-table tr:last-child td {
            border-bottom: none;
        }
        .tur-table tr.tur-row:hover {
            background: #f0f5ff;
            cursor: pointer;
        }
        .tur-table tr.tur-row.deselected td {
            color: #aaa;
            text-decoration: line-through;
        }
        .tur-table input[type="checkbox"] {
            cursor: pointer;
            width: 14px;
            height: 14px;
            margin: 0;
        }
        #turListWrapper.locked {
            opacity: 0.6;
            pointer-events: none;
        }
    `;
    const styleTag = document.createElement("style");
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    // Finn alle [B]-knapper og hent data fra DOM
    function findButtons() {
        return Array.from(document.querySelectorAll('td.d a'))
            .filter(a => a.textContent.trim() === '[B]');
    }

    function getDispatchData(btns) {
        return btns.map(a => {
            const href = a.getAttribute('href') || '';
            const match = href.match(/immediateDispatch\('([^']+)',(\d+)\)/);
            if (!match) return null;
            const row = a.closest('tr');
            const id = match[2];
            const ressursTd = row ? row.querySelector(`[id^="Rxxxloyvexxx"]`) : null;
            const ressurs = ressursTd ? ressursTd.textContent.trim() : id;
            const starttid = (row && row.cells[2]) ? row.cells[2].textContent.trim() : '';
            return { reknr: match[1], id, ressurs, starttid };
        }).filter(Boolean);
    }

    const allData = getDispatchData(findButtons());
    const initialCount = allData.length;

    // Bygg panel HTML
    const panel = document.createElement('div');
    panel.className = "bpanel";
    panel.innerHTML = `
        <div class="bpanel-header">
            🤖 Auto-bestilling
        </div>
        <div class="bpanel-body">
            ${initialCount > 0 ? `<button id="toggleListBtn">▼ ${initialCount} turer valgt</button>` : ''}
            <div id="turListWrapper" style="display:none">
                <div class="tur-filter-wrap">
                    <input type="text" id="turFilter" class="tur-filter-input" placeholder="Filtrer på ressurs...">
                </div>
                <div class="tur-list-container">
                    <table class="tur-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="selectAllCb" checked title="Velg alle / ingen"></th>
                                <th id="thRessurs" class="sortable">Ressurs<span class="sort-indicator">⇅</span></th>
                                <th id="thStarttid" class="sortable">Starttid<span class="sort-indicator">⇅</span></th>
                            </tr>
                        </thead>
                        <tbody id="turTableBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="bpanel-buttons">
                <button id="startBtn">▶ Start</button>
                <button id="stopBtn" disabled>⏸ Stopp</button>
                <button id="closeBtn">Lukk</button>
            </div>
            <div id="status">${initialCount > 0 ? '<b>Inaktiv.</b>' : '<b>Ingen turer funnet.</b><br>Ingen turer med status Tildelt på valgt filter.'}</div>
        </div>
    `;

    // Overlay som blokkerer bakgrunnen
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.3);';
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Fyll tabellen
    const tbody = document.getElementById('turTableBody');
    allData.forEach((d, i) => {
        const tr = document.createElement('tr');
        tr.className = 'tur-row';
        tr.dataset.ressurs = d.ressurs.toLowerCase();
        tr.dataset.starttid = d.starttid;
        tr.innerHTML = `
            <td><input type="checkbox" class="tur-cb" data-idx="${i}" checked></td>
            <td>${d.ressurs}</td>
            <td>${d.starttid || '–'}</td>
        `;
        tr.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            const cb = tr.querySelector('.tur-cb');
            cb.checked = !cb.checked;
            updateRowStyle(tr, cb.checked);
            syncSelectAll();
        });
        tr.querySelector('.tur-cb').addEventListener('change', (e) => {
            updateRowStyle(tr, e.target.checked);
            syncSelectAll();
        });
        tbody.appendChild(tr);
    });

    // --- SORTERING ---
    let sortCol = null;
    let sortDir = 1;

    function sortTable(col) {
        sortDir = (sortCol === col) ? -sortDir : 1;
        sortCol = col;

        const thRessurs = document.getElementById('thRessurs');
        const thStarttid = document.getElementById('thStarttid');
        thRessurs.querySelector('.sort-indicator').textContent =
            sortCol === 'ressurs' ? (sortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';
        thStarttid.querySelector('.sort-indicator').textContent =
            sortCol === 'starttid' ? (sortDir === 1 ? ' ▲' : ' ▼') : ' ⇅';

        const rows = Array.from(tbody.querySelectorAll('.tur-row'));
        rows.sort((a, b) => {
            const aVal = col === 'ressurs' ? a.dataset.ressurs : a.dataset.starttid;
            const bVal = col === 'ressurs' ? b.dataset.ressurs : b.dataset.starttid;
            return sortDir * aVal.localeCompare(bVal, 'nb');
        });
        rows.forEach(r => tbody.appendChild(r));
    }

    document.getElementById('thRessurs').addEventListener('click', () => sortTable('ressurs'));
    document.getElementById('thStarttid').addEventListener('click', () => sortTable('starttid'));

    // --- FILTER ---
    document.getElementById('turFilter').addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        tbody.querySelectorAll('.tur-row').forEach(tr => {
            tr.style.display = (!query || tr.dataset.ressurs.includes(query)) ? '' : 'none';
        });
        syncSelectAll();
    });

    // --- AVHUKINGS-HJELPERE ---
    function updateRowStyle(tr, checked) {
        tr.classList.toggle('deselected', !checked);
    }

    function syncSelectAll() {
        const visibleCbs = Array.from(document.querySelectorAll('.tur-cb'))
            .filter(cb => cb.closest('tr').style.display !== 'none');
        const allChecked = visibleCbs.length > 0 && visibleCbs.every(cb => cb.checked);
        const noneChecked = visibleCbs.every(cb => !cb.checked);
        const selectAllCb = document.getElementById('selectAllCb');
        selectAllCb.checked = allChecked;
        selectAllCb.indeterminate = !allChecked && !noneChecked;
        updateToggleLabel();
    }

    function updateToggleLabel() {
        const btn = document.getElementById('toggleListBtn');
        if (!btn) return;
        const cbs = Array.from(document.querySelectorAll('.tur-cb'));
        const checkedCount = cbs.filter(cb => cb.checked).length;
        const total = cbs.length;
        const wrapper = document.getElementById('turListWrapper');
        const open = wrapper && wrapper.style.display !== 'none';
        const arrow = open ? '▲' : '▼';
        btn.textContent = checkedCount === total
            ? `${arrow} ${total} turer valgt`
            : `${arrow} ${checkedCount} av ${total} turer valgt`;
    }

    document.getElementById('selectAllCb').addEventListener('change', (e) => {
        document.querySelectorAll('.tur-cb').forEach(cb => {
            if (cb.closest('tr').style.display === 'none') return;
            cb.checked = e.target.checked;
            updateRowStyle(cb.closest('tr'), cb.checked);
        });
        updateToggleLabel();
    });

    document.getElementById('toggleListBtn')?.addEventListener('click', () => {
        const wrapper = document.getElementById('turListWrapper');
        wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
        updateToggleLabel();
        repositionPanel();
    });

    // --- POSISJONERING ---
    function repositionPanel() {
        const header = document.getElementById("headerTransportorer");
        const col2 = document.getElementById("col2");
        if (header && col2) {
            const headerRect = header.getBoundingClientRect();
            const col2Rect = col2.getBoundingClientRect();
            panel.style.top = `${headerRect.top - panel.offsetHeight - 1}px`;
            panel.style.left = `${col2Rect.left + (col2Rect.width / 2) - (panel.offsetWidth / 2)}px`;
        } else {
            panel.style.top = "20px";
            panel.style.right = "20px";
        }
    }
    repositionPanel();

    // --- VARIABLER ---
    let dispatches = [];
    let index = 0;
    let running = false;
    let timer = null;

    const startBtn = document.getElementById('startBtn');
    if (initialCount === 0) startBtn.disabled = true;
    const stopBtn = document.getElementById('stopBtn');
    const closeBtn = document.getElementById('closeBtn');
    const statusDiv = document.getElementById('status');

    function lockList() {
        document.getElementById('turListWrapper').classList.add('locked');
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
            running = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            statusDiv.innerHTML =
                `<b>✓ Ferdig!</b><br>${dispatches.length} tur${dispatches.length === 1 ? '' : 'er'} er bestilt opp. Lukk panelet for å oppdatere bildet.`;
        }
    }

    function startClicking() {
        if (dispatches.length === 0) {
            const checkedIndices = new Set(
                Array.from(document.querySelectorAll('.tur-cb'))
                    .filter(cb => cb.checked)
                    .map(cb => parseInt(cb.dataset.idx))
            );
            dispatches = allData.filter((_, i) => checkedIndices.has(i));

            if (dispatches.length === 0) {
                statusDiv.innerHTML = '<b>⚠️ Ingen turer valgt.</b><br>Huk av minst én tur i listen.';
                return;
            }

            lockList();
            index = 0;
        }

        running = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        const remaining = dispatches.length - index;
        statusDiv.innerHTML = index === 0
            ? `<b>Starter...</b><br>Bestiller opp ${dispatches.length} turer`
            : `<b>Fortsetter...</b><br>${remaining} tur${remaining === 1 ? '' : 'er'} gjenstår`;
        runNext();
    }

    function stopClicking() {
        running = false;
        clearTimeout(timer);
        const remaining = dispatches.length - index;
        statusDiv.innerHTML =
            `<b>⏸ Stoppet</b><br>${remaining} tur${remaining === 1 ? '' : 'er'} gjenstår å bestille opp`;
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

    function escListener(e) {
        if (e.key === "Escape") closePanel();
    }
    document.addEventListener('keydown', escListener);

    startBtn.onclick = startClicking;
    stopBtn.onclick = stopClicking;
    closeBtn.onclick = closePanel;

})();
