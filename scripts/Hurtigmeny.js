// ============================================================
// Hurtigmeny.js — Egendefinert høyreklikk-meny for NISSY
// Ventende, Pågående og Ressurser
// ============================================================
(function () {
  'use strict';

  const SCRIPT_ID = 'Hurtigmeny_v1';
  if (window[SCRIPT_ID]) {
    console.log('[Hurtigmeny] Allerede installert.');
    return;
  }
  window[SCRIPT_ID] = true;

  // ── Stil ────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cm-overlay {
      position: fixed;
      inset: 0;
      z-index: 99998;
    }
    #cm-popup {
      position: fixed;
      z-index: 99999;
      background: #fff;
      border: 1px solid #047CA1;
      border-radius: 5px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.25);
      min-width: 230px;
      padding: 4px 0;
      font-family: Arial, sans-serif;
      font-size: 12px;
      user-select: none;
    }
    #cm-popup .cm-header {
      padding: 6px 12px 5px;
      font-weight: bold;
      font-size: 11px;
      color: #fff;
      border-radius: 4px 4px 0 0;
      margin-bottom: 3px;
      line-height: 1.3;
    }
    #cm-popup .cm-header .cm-subheader {
      font-weight: normal;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 1px;
    }
    #cm-popup.cm-ventende  .cm-header { background: #047CA1; }
    #cm-popup.cm-paagaende .cm-header { background: #5a6ea0; }
    #cm-popup.cm-ressurser .cm-header { background: #5a7a5a; }
    #cm-popup.cm-general   .cm-header { background: #4a4a6a; }
    #cm-popup.cm-general   .cm-item:hover { background: #e8e8f5; color: #4a4a6a; }

    #cm-popup .cm-item {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      cursor: pointer;
      color: #222;
      transition: background 0.1s;
    }
    #cm-popup .cm-item:hover { background: #CFECF5; color: #047CA1; }
    #cm-popup.cm-ressurser .cm-item:hover { background: #d8edcc; color: #3a6e3a; }

    #cm-popup .cm-item .cm-icon  { width: 18px; text-align: center; font-size: 13px; flex-shrink: 0; }
    #cm-popup .cm-item .cm-label { flex: 1; }
    #cm-popup .cm-item .cm-badge {
      font-size: 9px;
      background: #e8e8e8;
      color: #777;
      border-radius: 3px;
      padding: 1px 4px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    #cm-popup .cm-item .cm-badge.cm-single {
      background: #fff3cd;
      color: #856404;
    }

    #cm-popup .cm-separator {
      height: 1px;
      background: #dde;
      margin: 3px 8px;
    }
  `;
  document.head.appendChild(style);

  // ── Lukk meny ───────────────────────────────────────────────
  function closeMenu() {
    document.getElementById('cm-overlay')?.remove();
    document.getElementById('cm-popup')?.remove();
  }

  // ── Er raden merket (blå NISSY-markering)? ──────────────────
  function isRowSelected(row) {
    // rgb(148, 169, 220) er NISSYs valgt-farge — andre bakgrunnsfarger (grønn, gul) ignoreres
    return row.style.backgroundColor === 'rgb(148, 169, 220)';
  }

  // ── Finn nærmeste <tr> i riktig tabell ───────────────────────
  function findRow(el) {
    const ventende  = document.getElementById('ventendeoppdrag');
    const paagaende = document.getElementById('pagaendeoppdrag');
    const ressurser = document.getElementById('resurser');

    let node = el;
    while (node && node.tagName !== 'TR') node = node.parentElement;
    if (!node || node.tagName !== 'TR') return null;

    if (ventende  && ventende.contains(node)  && node.id?.startsWith('V-'))
      return { row: node, type: 'ventende'  };
    if (paagaende && paagaende.contains(node) && node.id?.startsWith('P-'))
      return { row: node, type: 'paagaende' };
    if (ressurser && ressurser.contains(node) && node.id?.startsWith('Rxxx'))
      return { row: node, type: 'ressurser' };
    return null;
  }

  // ── Velg rad automatisk hvis ikke merket ─────────────────────
  function selectRowIfNeeded(row, type) {
    if (isRowSelected(row)) return;
    const lsMap = { ventende: window.g_voppLS, paagaende: window.g_poppLS, ressurser: window.g_resLS };
    if (typeof selectRow === 'function') selectRow(row.id, lsMap[type]);
  }

  // ── Trigger Alt+key ──────────────────────────────────────────
  function triggerAlt(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key:      key.toUpperCase(),
      altKey:   true,
      bubbles:  true,
      cancelable: true,
      keyCode:  key.toUpperCase().charCodeAt(0),
      which:    key.toUpperCase().charCodeAt(0),
    }));
  }

  // ── Klikk en manual-script-knapp ─────────────────────────────
  function clickManualScript(name) {
    const btn = document.querySelector(`#nissy-manual-scripts [data-script="${name}"]`);
    if (btn) btn.click();
    else console.warn('[Hurtigmeny] Fant ikke manual-script:', name);
  }

  // ── Kontor-tilgang ───────────────────────────────────────────
  const SJEKK_PLAKAT_OFFICES = [
    'Pasientreiser Nord-Trøndelag',
    // Legg til flere kontorer her etter hvert
    // 'Pasientreiser Sør-Trøndelag',
  ];

  function getCurrentOffice() {
    // Prøv globale variabler først
    if (window.currentOffice)       return window.currentOffice;
    if (window.g_currentOfficeName) return window.g_currentOfficeName;
    // Prøv vanlige DOM-steder i NISSY
    const candidates = [
      '#officeSelect option:checked',
      '#office-name',
      '.office-name',
      '[id*="office"] option:checked',
      'select[name*="office"] option:checked',
      'select[name*="Office"] option:checked',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      const txt = el?.textContent?.trim() || el?.value?.trim();
      if (txt) return txt;
    }
    return null;
  }

  function hasSjekkPlakatAccess() {
    const office = getCurrentOffice();
    return office && SJEKK_PLAKAT_OFFICES.includes(office);
  }

  // ── Pasientnavn / ressursnavn fra rad ────────────────────────
  function getDisplayName(row, type) {
    if (type === 'ventende') {
      const cells = row.querySelectorAll('td.d[onclick]');
      return cells[0]?.textContent.trim() || '';
    }
    if (type === 'paagaende') {
      // Ressursnavn ligger alltid i 2. kolonne (<td> index 1)
      const cells = row.querySelectorAll('td');
      return cells[1]?.textContent.trim() || row.getAttribute('name') || '';
    }
    if (type === 'ressurser') {
      return row.querySelector('td[id*="loyvexxx"]')?.textContent.trim()
        || row.getAttribute('name') || '';
    }
    return '';
  }

  // ── Antall merkede rader ─────────────────────────────────────
  function countSelected(type) {
    const container = {
      ventende:  '#ventendeoppdrag',
      paagaende: '#pagaendeoppdrag',
      ressurser: '#resurser',
    }[type];
    if (!container) return 0;
    return document.querySelectorAll(
      `${container} tr[style*="rgb(148, 169, 220)"]`
    ).length;
  }

  // ── Lager et meny-item-objekt ────────────────────────────────
  function item(icon, label, hotkey, action, singleOnly = false) {
    return { icon, label, hotkey, action, singleOnly };
  }
  function sep() { return { type: 'sep' }; }

  // ── Klippebord-elementer (felles for alle menyer) ────────────
  function clipboardItems() {
    const items = [];
    const selectedText = window.getSelection()?.toString().trim() || '';
    const active = document.activeElement;
    const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password']);
    const isEditable = active && (
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable ||
      (active.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((active.type || 'text').toLowerCase()))
    );

    if (selectedText || isEditable) items.push(sep());

    if (selectedText) {
      items.push(item('✂️', 'Kopier merket tekst', 'Ctrl+C', () => {
        navigator.clipboard?.writeText(selectedText).catch(() => {
          document.execCommand('copy');
        });
      }));
    }

    if (isEditable) {
      items.push(item('📋', 'Lim inn tekst', 'Ctrl+V', () => {
        navigator.clipboard?.readText().then(text => {
          if (!text) return;
          const el = active;
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const start = el.selectionStart ?? el.value.length;
            const end   = el.selectionEnd   ?? el.value.length;
            el.value = el.value.slice(0, start) + text + el.value.slice(end);
            el.selectionStart = el.selectionEnd = start + text.length;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            document.execCommand('insertText', false, text);
          }
        }).catch(() => document.execCommand('paste'));
      }));
    }

    return items;
  }



  function ventendeMeny(row) {
    return [
      item('🪄', 'Smart-tildeling', 'Alt+S', () => triggerAlt('s')),
      item('📆', 'Tilordning 2.0',  'Alt+T', () => triggerAlt('t')),
      item('🚐', 'Samkjøring',      'Alt+X', () => triggerAlt('x')),
      sep(),
      item('🕐', 'Hentetid',        'Alt+E', () => triggerAlt('e')),
      item('✏️', 'Rediger', null, () => {
        const link = row.querySelector('a[href*="redit"]');
        if (link) window.open(link.href, '_blank');
      }, true /* kun denne rad */),
      item('🔠', 'Rek-knapper',     'Alt+R', () => triggerAlt('r')),
      item('🚗', 'Alenebil', null, () => clickManualScript('alenebil')),
      sep(),
      item('🗺️', 'Vis i kart',      'Alt+W', () => triggerAlt('w')),
      item('🗺️', 'Rutekalkulering', 'Alt+Q', () => triggerAlt('q')),
      sep(),
      item('🔍', 'Søk i admin', null, () => {
        row.querySelector('[onclick*="searchStatus"]')?.click();
      }, true),
      item('✖️', 'Avbestilling',     'Alt+K', () => triggerAlt('k')),
      ...clipboardItems(),
    ];
  }

  function paagaaendeMeny(row) {
    return [
      item('📡', 'Live Ressurskart', 'Alt+Z', () => triggerAlt('z')),
      item('🚕', 'Ressursinfo',      'Alt+D', () => triggerAlt('d')),
      item('🚐', 'Samkjøring',       'Alt+X', () => triggerAlt('x')),
      sep(),
      item('🕐', 'Hentetid',         'Alt+E', () => triggerAlt('e')),
      item('🔠', 'Rek-knapper',      'Alt+R', () => triggerAlt('r')),
      sep(),
      item('🗺️', 'Vis i kart',       'Alt+W', () => triggerAlt('w')),
      item('🗺️', 'Rutekalkulering',  'Alt+Q', () => triggerAlt('q')),
      sep(),
      item('🔍', 'Søk i admin', null, () => {
        // P-13525952 → id-tall er samme som Rxxx66240821 — hent fra name-attr på P-raden
        const ressursId = row.getAttribute('name');
        const ressursRow = document.getElementById('Rxxx' + ressursId);
        const qBtn = ressursRow?.querySelector('[onclick*="searchStatus"]');
        if (qBtn) qBtn.click();
        else console.warn('[ContextMenu] Fant ikke admin-link for ressurs:', ressursId);
      }, true),
      item('✖️', 'Avbestilling',      'Alt+K', () => triggerAlt('k')),
      ...clipboardItems(),
    ];
  }

  function ressurserMeny(row) {
    return [
      item('📡', 'Live Ressurskart', 'Alt+Z', () => triggerAlt('z')),
      item('🚕', 'Ressursinfo',      'Alt+D', () => triggerAlt('d')),
      sep(),
      item('🔍', 'Søk i admin', null, () => {
        row.querySelector('[onclick*="searchStatus"]')?.click();
      }, true),
      ...clipboardItems(),
    ];
  }


  // ── Vis popup ────────────────────────────────────────────────
  function showMenu(x, y, items, type, row) {
    closeMenu();

    const nSelected = countSelected(type);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cm-overlay';
    overlay.addEventListener('click', closeMenu);
    overlay.addEventListener('contextmenu', e => { e.preventDefault(); closeMenu(); });
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.id = 'cm-popup';
    popup.classList.add(`cm-${type}`);

    // Header
    const header = document.createElement('div');
    header.className = 'cm-header';
    const typeLabel = { ventende: '⏳ Ventende', paagaende: '🚗 Pågående', ressurser: '🚌 Ressurser' }[type];
    const navn = getDisplayName(row, type);
    header.innerHTML = `<div>${typeLabel}${navn ? ` — ${navn}` : ''}</div>`
      + (nSelected > 1
        ? `<div class="cm-subheader">${nSelected} rader merket — de fleste valg gjelder alle</div>`
        : '');
    popup.appendChild(header);

    // Elementer
    items.forEach(it => {
      if (it.type === 'sep') {
        const s = document.createElement('div');
        s.className = 'cm-separator';
        popup.appendChild(s);
        return;
      }

      const el = document.createElement('div');
      el.className = 'cm-item';

      // Badge: viser hurtigtast eller "(kun denne)"
      let badgeHtml = '';
      if (it.singleOnly && nSelected > 1) {
        badgeHtml = `<span class="cm-badge cm-single" title="Gjelder kun raden du høyreklikket på">kun denne</span>`;
      } else if (it.hotkey) {
        badgeHtml = `<span class="cm-badge">${it.hotkey}</span>`;
      }

      el.innerHTML = `<span class="cm-icon">${it.icon}</span><span class="cm-label">${it.label}</span>${badgeHtml}`;
      el.addEventListener('click', e => {
        e.stopPropagation();
        closeMenu();
        it.action();
      });
      popup.appendChild(el);
    });

    document.body.appendChild(popup);

    // Juster posisjon innenfor viewport
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = popup.offsetWidth  || 240;
    const ph = popup.offsetHeight || 350;
    popup.style.left = Math.min(x + 2, vw - pw - 8) + 'px';
    popup.style.top  = Math.min(y + 2, vh - ph - 8) + 'px';
  }

  // ── Høyreklikk-handler ───────────────────────────────────────
  // ── Er elementet inne i en annen pop-up? ────────────────────
  // Traverserer DOM oppover og sjekker etter flytende vinduer
  // (position fixed/absolute med z-index) som ikke er våre egne.
  function isInsidePopup(el) {
    const OWN_IDS = new Set(['cm-overlay', 'cm-popup']);
    let node = el;
    while (node && node !== document.body) {
      if (OWN_IDS.has(node.id)) return false; // våre egne — OK
      const tag = node.tagName?.toLowerCase();
      if (tag === 'dialog') return true;
      const cs = window.getComputedStyle(node);
      const pos = cs.position;
      const z   = parseInt(cs.zIndex, 10);
      if ((pos === 'fixed' || pos === 'absolute') && z > 100) return true;
      node = node.parentElement;
    }
    return false;
  }

  // ── Høyreklikk-handler ───────────────────────────────────────
  function onContextMenu(e) {
    // Ikke aktiver inne i andre pop-ups (Ressursinfo, Hentetid osv.)
    if (e.target.id !== 'cm-overlay' && isInsidePopup(e.target)) return;

    // Hvis menyen allerede er åpen dekker overlay-en alt —
    // finn det faktiske elementet under musepekeren og behandle det
    if (e.target.id === 'cm-overlay') {
      closeMenu();
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (elUnder && isInsidePopup(elUnder)) return;
      const found = elUnder ? findRow(elUnder) : null;
      e.preventDefault();
      e.stopPropagation();
      if (found) {
        const { row, type } = found;
        selectRowIfNeeded(row, type);
        const menuItems = {
          ventende:  ventendeMeny(row),
          paagaende: paagaaendeMeny(row),
          ressurser: ressurserMeny(row),
        }[type];
        showMenu(e.clientX, e.clientY, menuItems, type, row);
      } else {
        showGeneralMenu(e.clientX, e.clientY);
      }
      return;
    }

    const found = findRow(e.target);

    if (!found) {
      // Utenfor tabellene → generell meny
      e.preventDefault();
      e.stopPropagation();
      showGeneralMenu(e.clientX, e.clientY);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const { row, type } = found;

    // Merk rad automatisk om ikke merket fra før
    selectRowIfNeeded(row, type);

    const menuItems = {
      ventende:  ventendeMeny(row),
      paagaende: paagaaendeMeny(row),
      ressurser: ressurserMeny(row),
    }[type];

    showMenu(e.clientX, e.clientY, menuItems, type, row);
  }

  // ── Hjelpefunksjon: Sjekk hvilket kontor brukeren er på ─────
  function getCurrentOffice() {
    const topframeCell = document.querySelector('.topframe_small');
    if (!topframeCell) return null;
    const text  = topframeCell.textContent;
    const match = text.match(/Pasientreisekontor for (.+?)\s+(?:&nbsp;|-)/);
    return match?.[1]?.trim() || null;
  }

  // ── Sjekk-Plakat tilgang ─────────────────────────────────────
  function hasSjekkPlakatAccess() {
    const SJEKK_PLAKAT_OFFICES = [
      'Pasientreiser Nord-Trøndelag',
      // Legg til flere kontorer her etter hvert
    ];
    if (typeof getCurrentOffice !== 'function') return false;
    const office = getCurrentOffice();
    return office && SJEKK_PLAKAT_OFFICES.includes(office);
  }

  // ── Generell meny (utenfor tabellene) ───────────────────────
  function generalMeny() {
    const plakatAccess = hasSjekkPlakatAccess();
    return [
      // ── Moduler ──────────────────────────────────────────────
      item('📝', 'Bestillingsmodul', 'Alt+N', () => triggerAlt('n')),
      item('⚙️', 'Adminmodul',       'Alt+A', () => triggerAlt('a')),
      item('📋', 'Handlingslogg',    'Alt+L', () => triggerAlt('l')),
      sep(),
      // ── Sjekk-verktøy ────────────────────────────────────────
      item('🔍', 'Sjekk-Bestilling', null, () => clickManualScript('sjekk-bestilling')),
      ...(plakatAccess
        ? [item('🚩', 'Sjekk-Plakat', null, () => clickManualScript('sjekk-plakat'))]
        : []),
      item('📞', 'Sjekk-Telefon',    null, () => clickManualScript('sjekk-telefon')),
      sep(),
      // ── Diverse verktøy ──────────────────────────────────────
      item('🔔', 'Overvåk-Ventende', null, () => {
        const btn = document.getElementById('nissy-monitor-btn');
        if (btn) btn.click();
        else console.warn('[Hurtigmeny] Fant ikke #nissy-monitor-btn');
      }),
      item('🤖', 'Auto-Bestill',     null, () => clickManualScript('auto-bestill')),
      item('📊', 'Statistikk',       null, () => clickManualScript('statistikk')),
      sep(),
      item('📖', 'Brukerveiledning', null, () => {
        const btn = document.getElementById('nissy-help-btn');
        if (btn) btn.click();
        else console.warn('[Hurtigmeny] Fant ikke #nissy-help-btn');
      }),
      ...clipboardItems(),
    ];
  }

  // ── Vis generell meny ────────────────────────────────────────
  function showGeneralMenu(x, y) {
    closeMenu();

    const overlay = document.createElement('div');
    overlay.id = 'cm-overlay';
    overlay.addEventListener('click', closeMenu);
    overlay.addEventListener('contextmenu', e => { e.preventDefault(); closeMenu(); });
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.id = 'cm-popup';
    popup.classList.add('cm-general');

    const header = document.createElement('div');
    header.className = 'cm-header';
    header.textContent = '⚡ Hurtigmeny';
    popup.appendChild(header);

    generalMeny().forEach(it => {
      if (it.type === 'sep') {
        const s = document.createElement('div');
        s.className = 'cm-separator';
        popup.appendChild(s);
        return;
      }
      const el = document.createElement('div');
      el.className = 'cm-item';
      const badgeHtml = it.hotkey ? `<span class="cm-badge">${it.hotkey}</span>` : '';
      el.innerHTML = `<span class="cm-icon">${it.icon}</span><span class="cm-label">${it.label}</span>${badgeHtml}`;
      el.addEventListener('click', e => {
        e.stopPropagation();
        closeMenu();
        it.action();
      });
      popup.appendChild(el);
    });

    document.body.appendChild(popup);

    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = popup.offsetWidth  || 240;
    const ph = popup.offsetHeight || 350;
    popup.style.left = Math.min(x + 2, vw - pw - 8) + 'px';
    popup.style.top  = Math.min(y + 2, vh - ph - 8) + 'px';
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('contextmenu', onContextMenu, true);

  console.log('[Hurtigmeny] Installert — høyreklikk i ventende / pågående / ressurser.');
  if (typeof showToast === 'function') showToast('🖱️ Hurtigmeny aktivert', 2000);

})();