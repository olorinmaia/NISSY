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
    'Smart-tildeling.js',
    'Rek-knapper.js',
    'Rutekalkulering.js',
    'Avbestilling.js',
    'Bestillingsmodul.js',
    'Adminmodul.js',
    'Hentetid.js',
    'Ressursinfo.js'
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
        path: '/loader-advanced',
        title: 'Loader Advanced',
        event: true
      });
    }
  } catch (e) {}
  
  console.log('📦 Laster NISSY Advanced...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Advanced lastet!');

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
            background: linear-gradient(135deg, #6b9bd1 0%, #5a8bc4 100%);
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
            background: linear-gradient(135deg, #5a8bc4 0%, #4279b8 100%);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .nissy-header-btn:active {
            transform: translateY(0);
          }
        `;
        document.head.appendChild(style);
      }

      // Opprett knapper
      const helpBtn = document.createElement('a');
      helpBtn.id = 'nissy-help-btn';
      helpBtn.className = 'nissy-header-btn';
      helpBtn.href = 'https://github.com/olorinmaia/NISSY/blob/main/docs/ADVANCED.md';
      helpBtn.target = '_blank';
      helpBtn.title = 'Åpne brukerveiledning for NISSY Advanced';
      helpBtn.textContent = '📖 Brukerveiledning';

      const adminBtn = document.createElement('button');
      adminBtn.id = 'nissy-admin-btn';
      adminBtn.className = 'nissy-header-btn';
      adminBtn.type = 'button';
      adminBtn.title = 'Åpne adminmodul';
      adminBtn.textContent = '⚙️ Adminmodul (Alt+A)';
      adminBtn.addEventListener('click', () => triggerHotkey('a'));

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
      firstTd.appendChild(helpBtn);
      firstTd.appendChild(adminBtn);

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
      
      // Legg til CSS for bredere knapper
      if (!document.getElementById('nissy-script-button-styles')) {
        const style = document.createElement('style');
        style.id = 'nissy-script-button-styles';
        style.textContent = `
          .nissy-script-btn {
            background: linear-gradient(135deg, #6b9bd1 0%, #5a8bc4 100%);
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
            background: linear-gradient(135deg, #5a8bc4 0%, #4279b8 100%);
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
          }
        `;
        document.head.appendChild(style);
      }
      
      // HTML for knapper
      const rowsHTML = `

        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="🪄 Smart-tildeling (Alt+S)" class="bigbutton nissy-script-btn" 
                   data-hotkey="s" title="Smart tildeling med RB/ERS + passasjerregler uten behov for å velge avtale">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="✖️ Avbestilling (Alt+K)" class="bigbutton nissy-script-btn" 
                   data-hotkey="k" title="Masse-avbestill markerte turer eller bestillinger">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="📆 Tilordning 2.0 (Alt+T)" class="bigbutton nissy-script-btn" 
                   data-hotkey="t" title="Tilordninger bestillinger til hver sin avtale, ingen begrensning på antall">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="🗺️ Rutekalkulering (Alt+Q)" class="bigbutton nissy-script-btn" 
                   data-hotkey="q" title="Åpne rute i Google Maps for merkede bestillinger på ventende/pågående oppdrag">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="🕐 Hentetid (Alt+E)" class="bigbutton nissy-script-btn" 
                   data-hotkey="e" title="Endre hentetid for merkede bestillinger på ventende oppdrag">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 2px;">
            <input type="button" value="🚕 Ressursinfo (Alt+D)" class="bigbutton nissy-script-btn" 
                   data-hotkey="d" title="Vis telefonnummer til sjåfør, faktiske/planlagte tider, koordinater m.m. for merket ressurs">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 10px;">
            <input type="button" value="🔠 Rek-knapper (Alt+R)" class="bigbutton nissy-script-btn" 
                   data-hotkey="r" title="Lager hurtigknapper for merkede bestillinger på ventende/pågående oppdrag">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 10px;">
            <input type="button" value="📝 Bestillingsmodul (Alt+N)" class="bigbutton nissy-script-btn" 
                   data-hotkey="n" title="Åpne foretrukket bestillingsmodul. Trykk Alt+H for 'Hent rekvisisjon'">
          </td>
        </tr>
      `;
      
      // Sett inn FØR første rad (over Merknad/Avvik)
      firstRow.insertAdjacentHTML('beforebegin', rowsHTML);
      
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
        <h2 style="margin: 0 0 15px 0; color: #333;">🎉 NISSY Advanced lastet!</h2>
        
        <h3 style="margin: 15px 0 8px 0; color: #555;">⌨️ Tastatursnarveier:</h3>
        <div style="font-size: 13px; color: #666;">
          <strong>Grunnleggende:</strong><br>
          • ALT+F → Fokus søkefelt<br>
          • ENTER (i søkefelt) → Søk<br>
          • ESC → Nullstill søk + fokus søkefelt<br>
          • F5 → Refresh data<br>
          • CTRL+1 → Fokus filter ventende oppdrag<br>
          • CTRL+2 → Fokus filter ressurser<br>
          • ALT+W → Vis i kart<br>
          • ALT+G → Tildel oppdrag<br>
          • ALT+B → Blank<br>
          • ALT+P → Merk alle ressurser pågående oppdrag<br>
          • ALT+V → Merk alle bestillinger ventende oppdrag<br>
          • ALT+H → Hent rekvisisjon<br>
          <br>
          <strong>Avanserte funksjoner:</strong><br>
          • ALT+S → Smart tildeling (RB/ERS + passasjerregler)<br>
          • ALT+T → Tilordningsstøtte 2.0<br>
          • ALT+E → Hentetid<br>
          • ALT+R → Rek-knapper<br>
          • ALT+Q → Rutekalkulering (Google Maps)<br>
          • ALT+K → Avbestilling<br>
          • ALT+D → Ressursinfo pop-up<br>
          • ALT+N → Bestillingsmodul<br>
          • ALT+A → Adminmodul<br>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 4px;">
          <strong>📖 Fullstendig dokumentasjon:</strong><br>
          <a href="https://github.com/olorinmaia/NISSY/blob/main/docs/ADVANCED.md" 
             target="_blank" 
             style="color: #4a90e2; text-decoration: none; font-weight: bold;">
            Åpne ADVANCED.md →
          </a>
        </div>

        <div style="margin-top: 10px; padding: 12px; background: #f7f6f4; border-left: 4px solid #e2934a; border-radius: 4px;">
          <strong>📝 Endringslogg:</strong><br>
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
