(async () => {
  // ============================================================
  // URL-VALIDERING
  // Sjekk at vi er på riktig side før vi laster scripts
  // ============================================================
  const currentUrl = window.location.href;
  
  if (!currentUrl.includes('/planlegging')) {
    console.warn('⚠️ NISSY: Feil URL - scriptet kjører kun på /planlegging');
    console.log('📍 Nåværende URL:', currentUrl);
    console.log('✅ Scriptet kjører på alle URLer som inneholder /planlegging');
    return;
  }

  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
  
  const scripts = [
    'NISSY-fiks.js',
    'Ressursinfo.js',
    'Bestillingsmodul.js',
    'Adminmodul.js',
    'Avbestilling.js',
    'Hentetid.js',
    'Rek-knapper.js',
    'Rutekalkulering.js',
    'Live-ressurskart.js',
    'Hurtigmeny.js',
    'Send-SMS.js',
    'Logg.js'
  ];
  
  // ============================================================
  // ANONYM BRUKSSTATISTIKK
  // Logger at loader ble brukt (ingen persondata)
  // ============================================================
  try {
    const script = document.createElement('script');
    script.async = true;
    script.src = '//gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', 'https://nissy.goatcounter.com/count');
    document.head.appendChild(script);
    
    // Track loader
    if (window.goatcounter) {
      window.goatcounter.count({
        path: '/loader-basic',
        title: 'Loader Basic',
        event: true
      });
    }
  } catch (e) {}
  
  console.log('📦 Laster NISSY Basic...');
  
  for (const script of scripts) {
    try {
      // Hopp over Logg.js hvis den allerede kjører
      if (script === 'Logg.js' && window.__nissyLoggInstalled) {
        console.log('⏭️ Hopper over Logg.js (allerede aktiv)');
        continue;
      }
      
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Basic lastet!');

  // ============================================================
  // LEGG TIL DIVERSE KNAPPER ØVERST OG SKJUL FILTER
  // ============================================================
  (() => {
    console.log("🔧 Legger til knapper i header...");

    // Skjul filter i header, ikke i bruk
    const efilter = document.getElementById('efilter');
    if (efilter) {
      efilter.remove();
    }

    // Skjuler Dynamiske plakater i footer
    const td = document.querySelector('td input#dynamic_poster')?.closest('td');
    if (td) {
      td.style.display = 'none';
    }
    
    function addHeaderButton() {
      // Sjekk om knappen allerede er installert
      if (document.getElementById('nissy-help-btn') || document.getElementById('nissy-admin-btn')) {
        console.log("✅ Knapper i header allerede installert");
        return;
      }

      // Finn første <td> i topTable
      const topTable = document.getElementById('topTable');
      if (!topTable) {
        console.warn("⚠️ Fant ikke topTable");
        return;
      }

      const firstTd = topTable.querySelector('tbody tr td');
      if (!firstTd) {
        console.warn("⚠️ Fant ikke første <td>");
        return;
      }

      // Legg til CSS for header-knapper
      if (!document.getElementById('nissy-header-button-styles')) {
        const style = document.createElement('style');
        style.id = 'nissy-header-button-styles';
        style.textContent = `
          .nissy-header-btn {
            background: linear-gradient(135deg, #4A81BF 0%, #6896CA 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
            margin-left: 6px;
          }
          .nissy-header-btn:hover {
            background: linear-gradient(135deg, #35659E 0%, #5785B9 100%);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .nissy-header-btn:active {
            transform: translateY(0);
          }
          .nissy-header-btn.monitor-active {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          }
          .nissy-header-btn.monitor-active:hover {
            background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
          }
          .nissy-header-btn:disabled {
            background: #999;
            cursor: not-allowed;
            transform: none;
            transition: none;
          }
          .nissy-header-btn:disabled:hover {
            background: #999;
            transform: none;
            box-shadow: none;
          }
        `;
        document.head.appendChild(style);
      }

      // Opprett knapp
      const monitorBtn = document.createElement('button');
      monitorBtn.id = 'nissy-monitor-btn';
      monitorBtn.className = 'nissy-header-btn';
      monitorBtn.type = 'button';
      monitorBtn.title = 'Start/stopp overvåking av ventende oppdrag';
      monitorBtn.textContent = '🔔 Overvåk-Ventende';
      monitorBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(BASE + 'Overvåk-ventende.js');
          const code = await response.text();
          eval(code);
        } catch (err) {
          console.error('❌ Feil ved lasting av Overvåk-ventende.js:', err);
        }
      });

      const darkmodeBtn = document.createElement('button');
      darkmodeBtn.id = 'nissy-darkmode-btn';
      darkmodeBtn.className = 'nissy-header-btn';
      darkmodeBtn.type = 'button';
      darkmodeBtn.title = 'Aktiver/deaktiver NISSY dark mode';
      darkmodeBtn.textContent = '🌙 Darkmode';
      darkmodeBtn.addEventListener('click', async () => {
        if (window.NissyDarkmode) {
          window.NissyDarkmode.toggle();
        } else {
          try {
            const response = await fetch(BASE + 'Darkmode.js');
            const code = await response.text();
            eval(code);
            if (window.NissyDarkmode && !document.getElementById('nissy-darkmode-css')) {
              window.NissyDarkmode.toggle();
            }
          } catch (err) {
            console.error('❌ Feil ved lasting av Darkmode.js:', err);
          }
        }
      });

      const helpBtn = document.createElement('a');
      helpBtn.id = 'nissy-help-btn';
      helpBtn.className = 'nissy-header-btn';
      helpBtn.href = 'https://github.com/olorinmaia/NISSY/blob/main/docs/BASIC.md';
      helpBtn.target = '_blank';
      helpBtn.title = 'Åpne brukerveiledning for NISSY Basic';
      helpBtn.textContent = '📖 Brukerveiledning';

      const adminBtn = document.createElement('button');
      adminBtn.id = 'nissy-admin-btn';
      adminBtn.className = 'nissy-header-btn';
      adminBtn.type = 'button';
      adminBtn.title = 'Åpne adminmodul';
      adminBtn.textContent = '⚙️ Adminmodul (Alt+A)';
      adminBtn.addEventListener('click', () => triggerHotkey('a'));
      
      const loggBtn = document.createElement('button');
      loggBtn.id = 'nissy-logg-btn';
      loggBtn.className = 'nissy-header-btn';
      loggBtn.type = 'button';
      loggBtn.title = 'Åpne handlingslogg (Alt+L)';
      loggBtn.textContent = '📋 Handlingslogg';
      loggBtn.addEventListener('click', () => triggerHotkey('l'));

      const liveKartBtn = document.createElement('button');
      liveKartBtn.id = 'nissy-livekart-btn';
      liveKartBtn.className = 'nissy-header-btn';
      liveKartBtn.type = 'button';
      liveKartBtn.disabled = true;
      liveKartBtn.title = 'Viser siste hendelse og plassering i kart med tilhørende info for merkede ressurser. Oppdateres automatisk om vindu ikke lukkes';
      liveKartBtn.textContent = '📡Live Ressurskart (Alt+Z)';
      liveKartBtn.addEventListener('click', () => triggerHotkey('z'));

      function triggerHotkey(key) {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            code: `Key${key.toUpperCase()}`,
            altKey: true,
            bubbles: true,
            cancelable: true
          })
        );
      }
      
      // Legg til knappene etter teksten i første <td>
      firstTd.appendChild(monitorBtn);
      firstTd.appendChild(darkmodeBtn);
      firstTd.appendChild(helpBtn);
      firstTd.appendChild(adminBtn);
      firstTd.appendChild(loggBtn);
      firstTd.appendChild(liveKartBtn);

      // Oppdater monitor-knappens status basert på om overvåking er aktiv
      function updateMonitorButtonStatus() {
        const isActive = window.ventendeMonitor !== undefined;
        if (isActive) {
          monitorBtn.classList.add('monitor-active');
          monitorBtn.title = 'Overvåking av ventende oppdrag er aktiv - Trykk for å stoppe';
        } else {
          monitorBtn.classList.remove('monitor-active');
          monitorBtn.title = 'Start overvåking av nye bestillinger på ventende oppdrag';
        }
      }

      // Oppdater status når knappen opprettes
      updateMonitorButtonStatus();

      // Sjekk status hvert 2. sekund
      setInterval(updateMonitorButtonStatus, 2000);

      console.log("✅ Knapper i header installert");
    }

    // Installer knapp når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addHeaderButton);
    } else {
      setTimeout(addHeaderButton, 300);
    }
  })();

  // ============================================================
  // LEGG TIL SCRIPT-KNAPPER I GRENSESNITTET
  // ============================================================
  (() => {
    function addCustomButtons() {
      // Sjekk om knappene allerede er installert
      if (document.querySelector('.nissy-script-row')) {
        console.log("✅ NISSY script-knapper allerede installert");
        return;
      }
      console.log("🔧 Legger til NISSY script-knapper...");
      
      // Finn riktig tabell (den med både Merknad og Tildel oppdrag)
      let targetTable = null;
      document.querySelectorAll('table').forEach(table => {
        const hasMerknad = table.querySelector('#buttonResourceComment');
        const hasTildel = table.querySelector('#buttonAssignVopps');
        if (hasMerknad && hasTildel) targetTable = table;
      });
      
      if (!targetTable) {
        console.warn("⚠️ Fant ikke tabell for knapper");
        return;
      }
      
      const tbody = targetTable.querySelector('tbody');
      if (!tbody) return;
      
      // Finn første rad med knapper (Merknad/Avvik)
      const firstRow = Array.from(tbody.querySelectorAll('tr')).find(row => 
        row.querySelector('#buttonResourceComment')
      );
      
      if (!firstRow) {
        console.warn("⚠️ Fant ikke første rad");
        return;
      }
      
      // Legg til CSS for knapper
      if (!document.getElementById('nissy-script-button-styles')) {
        const style = document.createElement('style');
        style.id = 'nissy-script-button-styles';
        style.textContent = `
          .nissy-script-btn {
            background: linear-gradient(135deg, #4A81BF 0%, #6896CA 100%);
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
            width: 180px !important;
            min-width: 140px;
          }
          .nissy-script-btn:hover {
            background: linear-gradient(135deg, #35659E 0%, #5785B9 100%);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .nissy-script-btn:active {
            transform: translateY(0);
          }
          .nissy-script-btn:disabled {
            background: #999;
            cursor: not-allowed;
            transform: none;
            transition: none;
          }
        `;
        document.head.appendChild(style);
      }
      
      // HTML for knapper (kun Basic-funksjoner)
      const rowsHTML = `
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 5px; padding-bottom: 2px;">
            <input id="nissy-btn-hentetid" type="button" value="🕐 Hentetid (Alt+E)" class="bigbutton nissy-script-btn"
                   data-hotkey="e" title="Endre hentetid for merkede bestillinger på ventende og pågående oppdrag (kun status tildelt)">
          </td>
          <td valign="top" align="right" style="padding-top: 5px; padding-bottom: 2px;">
            <input id="nissy-btn-avbestilling" type="button" value="✖️ Avbestilling (Alt+K)" class="bigbutton nissy-script-btn"
                   data-hotkey="k" title="Masse-avbestill markerte turer eller bestillinger">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 2px;">
            <input id="nissy-btn-rek-knapper" type="button" value="🔠 Rek-knapper (Alt+R)" class="bigbutton nissy-script-btn"
                   data-hotkey="r" title="Lager hurtigknapper for merkede bestillinger på ventende/pågående oppdrag. Trykk ESC for å lukke popup">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 2px;">
            <input id="nissy-btn-rutekalkulering" type="button" value="🗺️ Rutekalkulering (Alt+Q)" class="bigbutton nissy-script-btn"
                   data-hotkey="q" title="Åpne rute i Google Maps for merkede bestillinger på ventende/pågående oppdrag">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 5px;">
            <input type="button" value="📝 Bestillingsmodul (Alt+N)" class="bigbutton nissy-script-btn"
                   data-hotkey="n" title="Åpne foretrukket bestillingsmodul. Trykk Alt+H for 'Hent rekvisisjon'">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 5px;">
            <input id="nissy-btn-ressursinfo" type="button" value="🚕 Ressursinfo (Alt+D)" class="bigbutton nissy-script-btn"
                   data-hotkey="d" title="Vis telefonnummer til sjåfør, faktiske/planlagte tider, koordinater m.m. for merket ressurs">
          </td>
        </tr>
      `;
      
      // Sett inn FØR første rad (over Merknad/Avvik)
      firstRow.insertAdjacentHTML('beforebegin', rowsHTML);

      // Styr disabled-tilstand for NISSY-injiserte knapper
      if (typeof ListSelectionGroup !== 'undefined' && typeof ButtonController !== 'undefined') {
        function updateNissyButtonStates() {
          const source   = ListSelectionGroup.getSourceSelection();
          const target   = ListSelectionGroup.getTargetSelection();
          const resource = ListSelectionGroup.getResourceSelection();

          const hasSource     = source.some(id => id.startsWith('V-'));
          const hasRessurs    = resource.length > 0;
          const hasPaagaaende = target.some(id => id.startsWith('P-'));

          const rules = [
            { id: 'nissy-btn-hentetid',        enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-avbestilling',    enabled: hasSource || hasRessurs },
            { id: 'nissy-btn-rek-knapper',     enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-rutekalkulering', enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-ressursinfo',     enabled: hasRessurs },
            { id: 'buttonShowMap',             enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-alenebil',        enabled: hasSource },
            { id: 'nissy-livekart-btn',         enabled: hasRessurs },
          ];

          rules.forEach(({ id, enabled }) => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !enabled;
          });
        }

        ListSelectionGroup.addPostProcess(updateNissyButtonStates);

        const _origLsgClear = ListSelectionGroup.clearAllSelections;
        ListSelectionGroup.clearAllSelections = function() {
          _origLsgClear.call(ListSelectionGroup);
          updateNissyButtonStates();
        };

        const _origClear = ButtonController.clearAllSelections;
        ButtonController.clearAllSelections = function() {
          _origClear.call(ButtonController);
          updateNissyButtonStates();
        };

        updateNissyButtonStates();
      }

      // Koble knapper til hotkeys
      targetTable.querySelectorAll('.nissy-script-btn').forEach(button => {
        const hotkey = button.getAttribute('data-hotkey');
        if (hotkey) {
          button.onclick = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: hotkey, 
              altKey: true, 
              bubbles: true, 
              cancelable: true
            }));
          };
        }
      });
      
      console.log("✅ NISSY script-knapper installert");
    }

    // Installer knapper når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addCustomButtons);
    } else {
      setTimeout(addCustomButtons, 300);
    }
  })();

  // ============================================================
  // VIS SNARVEI-POPUP
  // ============================================================
  setTimeout(() => {
    const popup = document.createElement('div');
    popup.innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin: 0 0 15px 0; color: #333;">🎉 NISSY Basic lastet!</h2>
        <h3 style="margin: 15px 0 8px 0; color: #555;">⌨️ Tastatursnarveier:</h3>
        <div style="font-size: 13px; color: #666;">
          <strong>Grunnleggende:</strong><br>
          • ALT+F → Fokus søkefelt<br>
          • ENTER (i søkefelt) → Søk<br>
          • ESC → Nullstill søk + fokus søkefelt<br>
          • F5 → Refresher alle bestillinger/turer og åpner alle turer<br>
          • CTRL+1 → Fokus filter ventende oppdrag<br>
          • CTRL+2 → Fokus filter ressurser<br>
          • ALT+W → Vis i kart<br>
          • ALT+G → Tildel oppdrag<br>
          • ALT+B → Blank<br>
          • ALT+P → Merk alle ressurser pågående oppdrag<br>
          • ALT+V → Merk alle bestillinger ventende oppdrag<br>
          • ALT+H → Hent rekvisisjon<br>
          • ALT+M → Møteplass<br>
          <br>
          <strong>Avanserte funksjoner:</strong><br>
          • ALT+E → Hentetid<br>
          • ALT+R → Rek-knapper (ESC lukker)<br>
          • ALT+Q → Rutekalkulering (Google Maps)<br>
          • ALT+K → Avbestilling<br>
          • ALT+D → Ressursinfo pop-up<br>
          • ALT+N → Bestillingsmodul<br>
          • ALT+A → Adminmodul<br>
          • ALT+L → Handlingslogg<br>
          • ALT+Z → Live ressurskart<br>
          • ALT+C → Send SMS<br>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 4px;">
          <strong>📖 Fullstendig dokumentasjon:</strong><br>
          <a href="https://github.com/olorinmaia/NISSY/blob/main/docs/BASIC.md" 
             target="_blank" 
             style="color: #4a90e2; text-decoration: none; font-weight: bold;">
            Åpne BASIC.md →
          </a>
        </div>
        
        <div style="margin-top: 10px; padding: 12px; background: #f7f6f4; border-left: 4px solid #e2934a; border-radius: 4px;">
          <strong>📝 Endringslogg (V4.1.0):</strong><br>
          <a href="https://github.com/olorinmaia/NISSY/blob/main/docs/CHANGELOG.md" 
             target="_blank" 
             style="color: #e2934a; text-decoration: none; font-weight: bold;">
            Åpne CHANGELOG.md →
          </a>
        </div>

        <button id="closeNissyPopup" style="
          margin-top: 20px;
          padding: 10px 24px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          width: 100%;
        ">Lukk</button>
      </div>
    `;
    
    Object.assign(popup.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      zIndex: '999999',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    });

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '999998'
    });

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const closePopup = () => {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      document.removeEventListener('keydown', escHandler);
      
      if (typeof openPopp === 'function') {
        openPopp('-1');
      }
    };

    popup.querySelector('#closeNissyPopup').onclick = closePopup;
    overlay.onclick = closePopup;

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
    document.addEventListener('keydown', escHandler);
  }, 500);
})();
