(async () => {
  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/dev/scripts/';
  
  const scripts = [
    'NISSY-fiks.js',
    'Ressursinfo.js',
    'Bestillingsmodul.js',
    'Rutekalkulering.js'
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
        path: '/loader-basic-dev',
        title: 'Loader Basic DEV',
        event: true
      });
    }
  } catch (e) {}
  
  console.log('📦 Laster NISSY Basic DEV...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script + `?t=${Date.now()}`);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Basic DEV lastet!');

  // ============================================================
  // LEGG TIL SCRIPT-KNAPPER I GRENSESNITTET
  // ============================================================
  (() => {
    console.log("🔧 Legger til NISSY script-knapper...");

    function addCustomButtons() {
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
      
      // Sjekk om knappene allerede er installert
      if (targetTable.querySelector('.nissy-script-header')) {
        console.log("✅ NISSY script-knapper allerede installert");
        return;
      }
      
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
            width: 200px !important;
            min-width: 150px;
          }
        `;
        document.head.appendChild(style);
      }
      
      // HTML for knapper (kun Basic-funksjoner)
      const rowsHTML = `
        <tr class="nissy-script-header" style="background: linear-gradient(to bottom, #e8f4f8 0%, #d4e9f5 100%);">
          <td colspan="2" style="padding: 6px 8px; text-align: center; font-weight: bold; color: #2c5f8d; font-size: 11px;">
            🚀 NISSY Basic-funksjoner 🚀
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left">
            <input type="button" value="🗺️ Rutekalkulering (Alt+Q)" class="bigbutton nissy-script-btn" 
                   data-hotkey="q" title="Åpne rute i Google Maps for merkede bestillinger på ventende/pågående oppdrag">
          </td>
          <td valign="top" align="right">
            <input type="button" value="🚕 Ressursinfo (Alt+D)" class="bigbutton nissy-script-btn" 
                   data-hotkey="d" title="Vis telefonnummer til sjåfør, faktiske/planlagte tider, koordinater m.m. for merket ressurs">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left">
            <input type="button" value="📝 Bestillingsmodul (Alt+N)" class="bigbutton nissy-script-btn" 
                   data-hotkey="n" title="Åpne foretrukket bestillingsmodul">
          </td>
          <td valign="top" align="right">
            <!-- tom celle -->
          </td>
        </tr>
        <tr class="nissy-script-separator">
          <td colspan="2" style="padding: 4px 0 8px 0;">
            <div style="border-bottom: 2px solid #4a90e2; margin: 0 8px;"></div>
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
        <h2 style="margin: 0 0 15px 0; color: #333;">🎉 NISSY Basic Lastet!</h2>
        <p style="background: #fff3cd; padding: 8px; border-radius: 4px; color: #856404; font-weight: bold; margin: 0 0 15px 0;">
          ⚠️ DEV VERSION - Test branch
        </p>
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
          <br>
          <strong>Avanserte funksjoner:</strong><br>
          • ALT+Q → Rutekalkulering (Google Maps)<br>
          • ALT+D → Ressursinfo pop-up<br>
          • ALT+N → Bestillingsmodul<br>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 4px;">
          <strong>📖 Fullstendig dokumentasjon:</strong><br>
          <a href="https://github.com/olorinmaia/NISSY/blob/dev/docs/BASIC.md" 
             target="_blank" 
             style="color: #4a90e2; text-decoration: none; font-weight: bold;">
            Åpne BASIC.md →
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
      maxHeight: '80vh',
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
