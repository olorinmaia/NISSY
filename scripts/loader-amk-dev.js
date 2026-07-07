(async () => {
  // ============================================================
  // URL-VALIDERING
  // Sjekk at vi er på riktig side før vi laster scripts
  // ============================================================
  const VALID_ORIGINS = [
    'https://nissy6.pasientreiser.nhn.no',
    'https://nissy6.qa.pasientreiser.nhn.no',
    'https://nissy6.test.pasientreiser.nhn.no'
  ];
  const currentUrl = window.location.href;
  const validOrigin = VALID_ORIGINS.some(o => currentUrl.startsWith(o));

  if (!validOrigin) {
    if (currentUrl.includes('/planlegging')) {
      (() => {
        const ov = document.createElement('div');
        Object.assign(ov.style, { position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
          background:'rgba(0,0,0,0.5)', zIndex:'999999', display:'flex', alignItems:'center', justifyContent:'center' });
        const box = document.createElement('div');
        box.innerHTML = `
          <h3 style="margin:0 0 12px;color:#c0392b;">⚠️ Feil URL oppdaget</h3>
          <p style="margin:0 0 12px;color:#333;font-size:14px;">For at scriptene skal virke som tiltenkt må ny URL til NISSY planlegging benyttes.<br><br>Oppdater bokmerket ditt til riktig URL:</p>
          <a href="https://nissy6.pasientreiser.nhn.no/planlegging/"
             style="display:block;padding:8px 12px;background:#f0f8ff;border:1px solid #4a90e2;
                    border-radius:4px;color:#4a90e2;font-family:monospace;font-size:13px;
                    word-break:break-all;text-decoration:none;margin-bottom:16px;"
          >https://nissy6.pasientreiser.nhn.no/planlegging/</a>
          <button id="_nissyUrlOk" style="padding:8px 20px;background:#4a90e2;color:white;border:none;
                  border-radius:6px;cursor:pointer;font-size:14px;width:100%;">OK</button>`;
        Object.assign(box.style, { background:'white', padding:'24px', borderRadius:'10px',
          boxShadow:'0 8px 30px rgba(0,0,0,0.3)', maxWidth:'420px', width:'90%', fontFamily:'Arial, sans-serif' });
        ov.appendChild(box);
        document.body.appendChild(ov);
        const close = () => ov.remove();
        box.querySelector('#_nissyUrlOk').onclick = close;
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
      })();
    }
    return;
  }

  if (!currentUrl.includes('/planlegging')) {
    console.warn('⚠️ NISSY: Scriptet kjører kun på /planlegging-siden');
    return;
  }

  if (!document.querySelector('.topframe_small')?.textContent.includes('Pasientreisekontor for')) {
    console.warn('⚠️ NISSY: Ikke logget inn i NISSY Planlegging');
    return;
  }

  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/dev/scripts/';
  window.NISSY_LOADER = 'amk-dev';

  const scripts = [
    'NISSY-fiks.js',
    'Rutekalkulering.js',
    'Bestillingsmodul.js',
    'Adminmodul.js',
    'Ressursinfo.js',
    'Live-ressurskart.js',
    'Hurtigmeny.js',
    'Send-SMS.js',
    'Logg.js',
    'Darkmode.js',
    'Kartvisning.js',
    // Manuelle scripts (knapper nederst i footer via NISSY-fiks) - preloades
    // slik at de aktiveres momentant ved klikk/hotkey uten ny GitHub-henting
    'Alenebil.js',
    'Auto-Bestill.js',
    'Sjekk-bestilling.js',
    'Sjekk-plakat.js',
    'Sjekk-telefon.js',
    'Statistikk.js',
    'Trøndertaxi-løyve.js'
  ];
  
  // ============================================================
  // ANONYM BRUKSSTATISTIKK PER KONTOR
  // Logger kun kontor-navn (ingen persondata)
  // ============================================================
  try {
    const officeCell  = document.querySelector('.topframe_small');
    const officeMatch = officeCell?.textContent.match(/Pasientreisekontor for ([^\n]+)/);
    const office      = officeMatch?.[1]?.trim() || 'Ukjent kontor';

    const gcScript = document.createElement('script');
    gcScript.async = true;
    gcScript.src   = '//gc.zgo.at/count.js';
    gcScript.setAttribute('data-goatcounter', 'https://nissy.goatcounter.com/count');
    gcScript.setAttribute('data-goatcounter-settings', JSON.stringify({ no_onload: true }));
    gcScript.onload = () => {
      window.goatcounter?.count({ path: '/nissy/' + office, title: 'NISSY – ' + office });
      window.goatcounter?.count({ path: '/nissy-loader/amk-dev', title: 'Loader: amk-dev', event: true });
    };
    document.head.appendChild(gcScript);
  } catch (e) {}

  // ============================================================
  // LASTE-OVERLAY: Blokkerer input mens scriptene lastes inn
  // Kan ikke avbrytes manuelt - fjernes automatisk når lastingen er ferdig
  // ============================================================
  const nissyLoadingOverlay = document.createElement('div');
  Object.assign(nissyLoadingOverlay.style, {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    zIndex: 999999
  });
  const nissyLoadingSpinner = document.createElement('div');
  Object.assign(nissyLoadingSpinner.style, {
    width: '50px', height: '50px', border: '6px solid #ddd', borderTop: '6px solid #4A81BF',
    borderRadius: '50%', animation: 'nissyLoaderSpin 0.8s linear infinite', marginBottom: '20px'
  });
  const nissyLoadingSpinnerCss = document.createElement('style');
  nissyLoadingSpinnerCss.textContent = `@keyframes nissyLoaderSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(nissyLoadingSpinnerCss);
  const nissyLoadingText = document.createElement('div');
  nissyLoadingText.textContent = 'Laster inn AMK DEV script-pakke…';
  Object.assign(nissyLoadingText.style, {
    color: 'white', fontSize: '18px', fontWeight: '600', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
  });
  nissyLoadingOverlay.appendChild(nissyLoadingSpinner);
  nissyLoadingOverlay.appendChild(nissyLoadingText);
  document.body.appendChild(nissyLoadingOverlay);
  // Sikkerhetsnett: fjern overlay selv om en enkelt script-fetch skulle henge
  const nissyLoadingSafetyTimer = setTimeout(() => {
    nissyLoadingOverlay.remove();
    nissyLoadingSpinnerCss.remove();
  }, 20000);

  console.log('📦 Laster NISSY AMK DEV...');

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
    // Liten pause mellom hver henting - unngår 429 Too Many Requests fra GitHub raw-content
    await new Promise(r => setTimeout(r, 200));
  }
  
  clearTimeout(nissyLoadingSafetyTimer);
  nissyLoadingOverlay.remove();
  nissyLoadingSpinnerCss.remove();

  console.log('✅ NISSY AMK DEV lastet!');

  // Patch versjonsnummer til -dev (venter på NISSY-fiks sin footer-timeout på 400ms)
  setTimeout(() => {
    const ver = window.__nissyScriptVersion;
    if (!ver || ver.endsWith('-dev')) return;
    const parts = ver.split('.');
    parts[2] = String(Number(parts[2]) + 1);
    const devVer = parts.join('.') + '-dev';
    const vLink = document.querySelector('#nissy-fiks-about a');
    if (vLink) vLink.textContent = 'v' + devVer;
    const vStrong = document.querySelector('#nissy-about-popup strong');
    if (vStrong) vStrong.textContent = 'NISSY Scripts v' + devVer;
    window.__nissyScriptVersion = devVer;
  }, 600);

  // ============================================================
  // DELT INNHOLD: Tastatursnarveier + lenker
  // nissySnarveierliste: brukes i snarveiervindu (F2)
  // nissyPopupKort: brukes i startup-popup
  // ============================================================
  const nissySnarveierliste = `
    <h3 style="margin: 0 0 8px 0; color: #555;">⌨️ Tastatursnarveier:</h3>
    <div style="font-size: 13px; color: #666; line-height: 1.7;">
      <strong>Grunnleggende:</strong><br>
      • F1 → Brukerveiledning<br>
      • F2 → Tastatursnarveier (dette vinduet)<br>
      • ALT+F → Fokus søkefelt<br>
      • ENTER (i søkefelt) → Søk<br>
      • ESC → Nullstill søk + fokus søkefelt<br>
      • F5 → Refresher alle bestillinger/turer og åpner alle turer<br>
      • CTRL+1 → Fokus filter ventende oppdrag<br>
      • CTRL+2 → Fokus filter ressurser<br>
      • ALT+G → Tildel oppdrag<br>
      • ALT+B → Blank<br>
      • ALT+P → Merk alle ressurser pågående oppdrag<br>
      • ALT+V → Merk alle bestillinger ventende oppdrag<br>
      • ALT+H → Hent rekvisisjon<br>
      • ALT+M → Møteplass<br>
      <br>
      <strong>Avanserte funksjoner:</strong><br>
      • ALT+Q → Rutekalkulering (Google Maps)<br>
      • ALT+W → Kartvisning<br>
      • ALT+D → Ressursinfo<br>
      • ALT+N → Bestillingsmodul<br>
      • ALT+A → Adminmodul<br>
      • ALT+J → Handlingslogg<br>
      • ALT+Z → Live ressurskart<br>
      • ALT+C → Send SMS<br>
      <br>
      <strong>Manuelle scripts:</strong><br>
      • ALT+1 → Auto-Bestill<br>
      • ALT+2 → Sjekk-Bestilling<br>
      • ALT+3 → Sjekk-Plakat<br>
      • ALT+4 → Sjekk-Telefon<br>
      • ALT+5 → Statistikk<br>
    </div>`;

  const nissyPopupKort = `
    <div style="padding: 12px; background: #f5f0ff; border-left: 4px solid #7c6cd9; border-radius: 4px;">
      <strong>⌨️ Tastatursnarveier:</strong><br>
      <a href="#" onclick="window.nissyShowSnarveier?.(); return false;"
         style="color: #7c6cd9; text-decoration: none; font-weight: bold;">Vis tastatursnarveier →</a>
    </div>
    <div style="margin-top: 10px; padding: 12px; background: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 4px;">
      <strong>📖 Brukerveiledning:</strong><br>
      <a href="https://github.com/olorinmaia/NISSY/blob/dev/docs/AMK.md" target="_blank"
         style="color: #4a90e2; text-decoration: none; font-weight: bold;">Åpne AMK.md →</a>
    </div>
    <div style="margin-top: 10px; padding: 12px; background: #f0fff8; border-left: 4px solid #27ae60; border-radius: 4px;">
      <strong>📖 Fullstendig dokumentasjon:</strong><br>
      <a href="https://github.com/olorinmaia/NISSY/blob/dev/README.md" target="_blank"
         style="color: #27ae60; text-decoration: none; font-weight: bold;">Åpne README.md →</a>
    </div>
    <div style="margin-top: 10px; padding: 12px; background: #f7f6f4; border-left: 4px solid #e2934a; border-radius: 4px;">
      <strong>📝 Endringslogg:</strong><br>
      <a href="https://github.com/olorinmaia/NISSY/blob/dev/docs/CHANGELOG.md" target="_blank"
         style="color: #e2934a; text-decoration: none; font-weight: bold;">Åpne CHANGELOG.md →</a>
    </div>`;

  // ============================================================
  // LEGG TIL DIVERSE KNAPPER ØVERST OG SKJUL FILTER
  // ============================================================
  (() => {
    console.log("🔧 Legger til knapper i header...");

    // Skjul filter og 'Nullstill oppsett'-link i header, ikke i bruk og tar opp plass
    const efilter = document.getElementById('efilter');
    if (efilter) {
      efilter.remove();
    }
    const nullstillLink = document.querySelector('a[onclick*="deleteCookies"]');
    if (nullstillLink) nullstillLink.remove();

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

      // Opprett knapper
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
      helpBtn.href = 'https://github.com/olorinmaia/NISSY/blob/dev/docs/AMK.md';
      helpBtn.target = '_blank';
      helpBtn.title = 'Åpne brukerveiledning for NISSY AMK (F1)';
      helpBtn.textContent = '📖 Hjelp';

      window.nissyShowSnarveier = function() {
        if (window._nissySnarveierWin && !window._nissySnarveierWin.closed) {
          window._nissySnarveierWin.focus();
          return;
        }
        const w = window.open('', 'nissy-snarveier',
          'width=380,height=760,toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no');
        if (!w) return;
        window._nissySnarveierWin = w;
        const html = `<!DOCTYPE html><html lang="no"><head>
<meta charset="UTF-8"><title>NISSY – Snarveier</title>
<style>* { box-sizing: border-box; } body { font-family: Arial, sans-serif; margin: 0; padding: 14px 16px; background: white; }</style>
</head><body>${nissySnarveierliste}</body></html>`;
        w.document.open();
        w.document.write(html);
        w.document.close();
      };

      const snarveierBtn = document.createElement('button');
      snarveierBtn.id = 'nissy-snarveier-btn';
      snarveierBtn.className = 'nissy-header-btn';
      snarveierBtn.type = 'button';
      snarveierBtn.title = 'Vis tastatursnarveier (F2)';
      snarveierBtn.textContent = '⌨️ Snarveier';
      snarveierBtn.addEventListener('click', () => window.nissyShowSnarveier());

      const bestillingsBtn = document.createElement('button');
      bestillingsBtn.id = 'nissy-bestilling-btn';
      bestillingsBtn.className = 'nissy-header-btn';
      bestillingsBtn.type = 'button';
      bestillingsBtn.title = 'Åpne bestillingsmodul (Alt+N)';
      bestillingsBtn.textContent = '📝 Bestillingsmodul';
      bestillingsBtn.addEventListener('click', () => triggerHotkey('n'));

      const adminBtn = document.createElement('button');
      adminBtn.id = 'nissy-admin-btn';
      adminBtn.className = 'nissy-header-btn';
      adminBtn.type = 'button';
      adminBtn.title = 'Åpne adminmodul (Alt+A)';
      adminBtn.textContent = '⚙️ Adminmodul';
      adminBtn.addEventListener('click', () => triggerHotkey('a'));
      
      const loggBtn = document.createElement('button');
      loggBtn.id = 'nissy-logg-btn';
      loggBtn.className = 'nissy-header-btn';
      loggBtn.type = 'button';
      loggBtn.title = 'Åpne handlingslogg (Alt+J)';
      loggBtn.textContent = '📋 Handlingslogg';
      loggBtn.addEventListener('click', () => triggerHotkey('j'));

      const liveKartBtn = document.createElement('button');
      liveKartBtn.id = 'nissy-livekart-btn';
      liveKartBtn.className = 'nissy-header-btn';
      liveKartBtn.type = 'button';
      liveKartBtn.disabled = true;
      liveKartBtn.title = 'Viser siste hendelse og plassering i kart med tilhørende info for merkede ressurser. Oppdateres automatisk om vindu ikke lukkes (Alt+Z)';
      liveKartBtn.textContent = '📡 Live Ressurskart';
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
      firstTd.appendChild(snarveierBtn);
      firstTd.appendChild(bestillingsBtn);
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

      document.addEventListener('keydown', e => {
        if (e.key === 'F1') { e.preventDefault(); helpBtn.click(); }
        if (e.key === 'F2') { e.preventDefault(); window.nissyShowSnarveier?.(); }
      });

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
          .nissy-script-btn:disabled:hover {
            background: #999;
            transform: none;
            box-shadow: none;
          }
        `;
        document.head.appendChild(style);
      }
      
      // HTML for knapper (Rutekalkulering, Ressursinfo, Send SMS og Kartvisning)
      const rowsHTML = `
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 5px; padding-bottom: 2px;">
            <input id="nissy-btn-rutekalkulering" type="button" value="🧭 Rutekalkulering (Alt+Q)" class="bigbutton nissy-script-btn"
                   data-hotkey="q" title="Åpne rute i Google Maps for merkede bestillinger på ventende/pågående oppdrag">
          </td>
          <td valign="top" align="right" style="padding-top: 5px; padding-bottom: 2px;">
            <input id="nissy-btn-ressursinfo" type="button" value="🚕 Ressursinfo (Alt+D)" class="bigbutton nissy-script-btn"
                   data-hotkey="d" title="Vis telefonnummer til sjåfør, faktiske/planlagte tider, koordinater m.m. for merket ressurs">
          </td>
        </tr>
        <tr class="nissy-script-row">
          <td valign="top" align="left" style="padding-top: 2px; padding-bottom: 5px;">
            <input id="nissy-btn-send-sms" type="button" value="📱 Send SMS (Alt+C)" class="bigbutton nissy-script-btn"
                   data-hotkey="c" title="Send SMS til merkede bestillinger på ventende/pågående oppdrag eller til sjåfør for merket ressurs">
          </td>
          <td valign="top" align="right" style="padding-top: 2px; padding-bottom: 5px;">
            <input id="nissy-btn-kartvisning" type="button" value="🗺️ Kartvisning (Alt+W)" class="bigbutton nissy-script-btn"
                   data-hotkey="w" title="Vis hente- og leveringskoordinater i kart med beregnet rute og kjøretid for merkede bestillinger">
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
            { id: 'nissy-btn-rutekalkulering', enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-ressursinfo',     enabled: hasRessurs },
            { id: 'nissy-btn-send-sms',        enabled: true },
            { id: 'nissy-btn-kartvisning',     enabled: hasSource || hasPaagaaende },
            { id: 'nissy-btn-alenebil',        enabled: hasSource },
            { id: 'nissy-livekart-btn',        enabled: hasRessurs },
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
  // REORGANISER KONTROLLPANEL
  // Skjul Send SMS/Vis i kart (erstattet av custom knapper over)
  // og flytt resten av høyre kolonne opp én rad, slik at alt tar
  // én rad i høyden: Blank → Send SMS-raden, Smart-søk → Vis i
  // kart-raden, søkefelt → Møteplass-raden, Søk/Nullstill →
  // søkefelt-raden. Venstre kolonne (Tildel oppdrag,
  // Tilordningsstøtte, Møteplass) ligger urørt.
  // Kjøres etter NISSY-fiks (300ms) – bruk 500ms for å garantere rekkefølge
  // ============================================================
  setTimeout(() => {
    const sendSmsBtn     = document.getElementById('buttonSendSMS');
    const showMapBtn     = document.getElementById('buttonShowMap');
    const blankBtn       = document.getElementById('buttonClearSelection');
    const searchTypeEl   = document.getElementById('searchType');
    const searchPhraseEl = document.getElementById('searchPhrase');
    const searchBtnEl    = document.getElementById('buttonSearch');

    const sendSmsTd      = sendSmsBtn?.closest('td');
    const showMapTd      = showMapBtn?.closest('td');
    const searchTypeTd   = searchTypeEl?.closest('td');
    const searchPhraseTd = searchPhraseEl?.closest('td');
    const searchBtnTd    = searchBtnEl?.closest('td');

    if (!sendSmsTd || !showMapTd || !blankBtn || !searchTypeTd || !searchPhraseTd || !searchBtnTd) {
      console.warn('⚠️ Reorganisering: fant ikke alle knapper');
      return;
    }

    // Skjul originale knapper som er erstattet av custom knapper
    sendSmsBtn.style.display = 'none';
    showMapBtn.style.display = 'none';

    // Flytt høyre kolonne opp én rad
    sendSmsTd.appendChild(blankBtn);

    showMapTd.innerHTML = '';
    showMapTd.appendChild(searchTypeEl);

    while (searchPhraseTd.firstChild) searchTypeTd.appendChild(searchPhraseTd.firstChild);

    while (searchBtnTd.firstChild) searchPhraseTd.appendChild(searchBtnTd.firstChild);

    console.log('✅ Kontrollpanel reorganisert for AMK');
  }, 500);

  // ============================================================
  // VIS SNARVEI-POPUP (eller toast hvis "ikke vis igjen" er valgt)
  // ============================================================
  setTimeout(() => {
    const SKIP_KEY = 'nissy-skip-startup-popup';

    const openPoppWhenReady = () => {
      if (typeof openPopp !== 'function') return;
      if (window.__nissyColumnsReady) { openPopp('-1'); return; }
      const t = setInterval(() => {
        if (window.__nissyColumnsReady) { clearInterval(t); openPopp('-1'); }
      }, 50);
      setTimeout(() => clearInterval(t), 8000);
    };

    if (localStorage.getItem(SKIP_KEY) === '1') {
      const toast = document.createElement('div');
      toast.textContent = '✅ NISSY AMK (DEV) lastet! Starter overvåking…';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', left: '50%',
        transform: 'translateX(-50%)', background: '#27ae60',
        color: '#fff', padding: '10px 20px', borderRadius: '5px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontFamily: 'Arial, sans-serif',
        fontSize: '13px', zIndex: '999999', opacity: '0',
        transition: 'opacity 0.3s ease', whiteSpace: 'nowrap',
      });
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '1'; }, 10);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
      fetch(BASE + 'Overvåk-ventende.js').then(r => r.text()).then(code => eval(code)).catch(() => {});
      openPoppWhenReady();
      return;
    }

    const popup = document.createElement('div');
    popup.innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="margin: 0 0 15px 0; color: #333;">🎉 NISSY AMK lastet!</h2>
        <p style="background: #fff3cd; padding: 8px; border-radius: 4px; color: #856404; font-weight: bold; margin: 0 0 15px 0;">
          ⚠️ DEV VERSION - Test branch
        </p>
        ${nissyPopupKort}

        <div style="display:flex;gap:8px;margin-top:20px;">
          <button id="closeNissyPopup" style="
            flex:1;padding:10px 24px;background:#4a90e2;color:white;
            border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;
          ">Lukk og start overvåking →</button>
          <button id="closeNissyPopupSkip" style="
            padding:10px 16px;background:#f5f5f5;color:#555;
            border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:12px;
          ">Ikke vis igjen</button>
        </div>
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
    openPoppWhenReady();

    const closePopup = async (skip = false) => {
      if (skip) localStorage.setItem(SKIP_KEY, '1');
      if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', escHandler);
      try {
        const response = await fetch(BASE + 'Overvåk-ventende.js');
        const code = await response.text();
        eval(code);
        console.log('✅ Overvåk-ventende.js startet automatisk');
      } catch (err) {
        console.error('❌ Feil ved lasting av Overvåk-ventende.js:', err);
      }
    };

    popup.querySelector('#closeNissyPopup').onclick = () => closePopup(false);
    popup.querySelector('#closeNissyPopupSkip').onclick = () => closePopup(true);
    overlay.onclick = () => closePopup(false);

    const escHandler = (e) => { if (e.key === 'Escape') closePopup(false); };
    document.addEventListener('keydown', escHandler);
  }, 500);
})();