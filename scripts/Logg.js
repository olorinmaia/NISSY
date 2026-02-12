(() => {
  // ============================================================
  // NISSY LOGG-SCRIPT
  // Logger handlinger som tildeling, avbestilling, avplanlegging
  // Lagrer i localStorage og viser historikk
  // ============================================================
  
  /* ======================================================
     KONFIGURASJON (MÅ VÆRE FØRST!)
     ====================================================== */
  const LOGG_STORAGE_KEY = 'nissy_action_log';
  const MAX_LOGG_ENTRIES = 500; // Maks antall loggoppføringer
  
  // VIKTIG: NISSY modifiserer JSON.stringify/parse, så vi serialiserer manuelt!
  
  /**
   * Konverter objekt til JavaScript literal string (ikke JSON!)
   */
  function serializeToJS(obj) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'string') return "'" + obj.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => serializeToJS(item)).join(',') + ']';
    }
    if (typeof obj === 'object') {
      const pairs = [];
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          pairs.push("'" + key + "':" + serializeToJS(obj[key]));
        }
      }
      return '{' + pairs.join(',') + '}';
    }
    return 'null';
  }
  
  /**
   * Parse JavaScript literal string tilbake til objekt
   */
  function deserializeFromJS(str) {
    // Bruk Function() constructor - NISSY kan ikke modifisere denne!
    return (new Function('return ' + str))();
  }
  
  console.log('🔧 NISSY-logg: Bruker manuell JavaScript serialisering');
  
  /* ======================================================
     GUARD – FORHINDRER DOBBEL INSTALLASJON
     ====================================================== */
  if (window.__nissyLoggInstalled) {
    console.log("✅ NISSY-logg er allerede aktiv");
    showLoggPopup(); // Vis logg når scriptet kjøres på nytt
    return;
  }
  window.__nissyLoggInstalled = true;

  console.log("🚀 Starter NISSY-logg-script");
  
  // Auto-reset hvis localStorage inneholder ugyldig data
  try {
    const stored = localStorage.getItem(LOGG_STORAGE_KEY);
    if (stored) {
      // Bruk deserializeFromJS i stedet for JSON.parse
      const parsed = deserializeFromJS(stored);
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ NISSY-logg: Ugyldig logg funnet ved oppstart, resetter...');
        localStorage.removeItem(LOGG_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn('⚠️ NISSY-logg: Korrupt logg funnet ved oppstart, resetter...');
    console.warn('⚠️ Feilmelding:', error.message);
    localStorage.removeItem(LOGG_STORAGE_KEY);
  }

  /* ======================================================
     HJELPE-FUNKSJONER
     ====================================================== */

  /**
   * Hent nåværende tidsstempel i lesbart format
   */
  function getCurrentTimestamp() {
    const now = new Date();
    const date = now.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const time = now.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `${date} ${time}`;
  }

  /**
   * Hent informasjon fra en rad (bestilling)
   */
  function extractRowInfo(row) {
    console.log('🔍 Ekstraherer info fra rad:', row.id);
    
    const reqId = row.getAttribute('name'); // Rekvisisjonsnummer
    const title = row.getAttribute('title'); // Pasient-ID eller annet
    const cells = row.querySelectorAll('td');
    
    console.log(`  - ReqId: ${reqId}`);
    console.log(`  - Title: ${title}`);
    console.log(`  - Antall celler: ${cells.length}`);
    
    // KOLONNE-STRUKTUR (basert på thead):
    // 0: Toggle (ikoner)
    // 1: Pnavn (patientName)
    // 2: Reisetid (tripStartDate)
    // 3: Opptid (tripTreatmentDate)
    // 4: Behov
    // 5: L (lengde?)
    // 6: Fra/Til adresser
    // 7: Handlinger (knapper)
    
    // Hent pasientnavn fra kolonne 1
    let patientName = '';
    if (cells.length > 1) {
      patientName = cells[1].textContent.trim();
      console.log(`  - Pasientnavn funnet i celle 1: ${patientName}`);
    }

    // Hent reisetid og oppmøtetid fra kolonne 2 og 3
    let tripTime = '';
    let treatmentTime = '';
    
    if (cells.length > 2) {
      const tripCell = cells[2];
      const tripFont = tripCell.querySelector('font');
      if (tripFont) {
        tripTime = tripFont.textContent.trim();
        console.log(`  - Reisetid funnet: ${tripTime}`);
      }
    }
    
    if (cells.length > 3) {
      const treatmentCell = cells[3];
      const treatmentFont = treatmentCell.querySelector('font');
      if (treatmentFont) {
        treatmentTime = treatmentFont.textContent.trim();
        console.log(`  - Oppmøtetid funnet: ${treatmentTime}`);
      }
    }

    // Hent fra/til adresser fra kolonne 6
    let addresses = '';
    if (cells.length > 6) {
      const addressCell = cells[6];
      const html = addressCell.innerHTML;
      
      // Prøv å splitte på <br> for å få fra og til separat
      const parts = html.split('<br>').map(p => {
        // Fjern HTML-tags og trim
        const text = p.replace(/<[^>]*>/g, '').trim();
        // Fjern "./" prefix hvis det finnes
        return text.replace(/^\.\//, '').trim();
      }).filter(p => p.length > 0);
      
      if (parts.length >= 2) {
        // Fra → Til format
        addresses = `${parts[0]} → ${parts[1]}`;
      } else if (parts.length === 1) {
        // Bare én adresse (uvanlig, men kan skje)
        addresses = parts[0];
      }
      
      console.log(`  - Adresser funnet i celle 6: ${addresses}`);
    }

    const result = {
      reqId: reqId || 'Ukjent',
      title: title || '',
      patientName: patientName || 'Ukjent pasient',
      tripTime: tripTime || '',
      treatmentTime: treatmentTime || '',
      addresses: addresses || ''
    };
    
    console.log('✅ Ferdig ekstrahert:', result);
    return result;
  }

  /**
   * Lagre en loggoppføring
   */
  function saveLogEntry(actionType, details) {
    // Guard: Ikke logg hvis ingen detaljer
    if (!details || details.length === 0) {
      console.warn('⚠️ NISSY-logg: Ingen detaljer å logge');
      return;
    }
    
    try {
      // Hent eksisterende logg
      let log = [];
      const stored = localStorage.getItem(LOGG_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = deserializeFromJS(stored);
          
          // Sjekk at det faktisk er et array
          if (Array.isArray(parsed)) {
            log = parsed;
            console.log('📖 NISSY-logg: Lastet eksisterende logg med', log.length, 'oppføring' + (log.length !== 1 ? 'er' : ''));
          } else {
            console.warn('⚠️ NISSY-logg: Eksisterende logg var ikke et array:', typeof parsed);
            log = [];
          }
        } catch (parseError) {
          console.warn('⚠️ NISSY-logg: Kunne ikke parse eksisterende logg:', parseError);
          log = [];
        }
      }

      // Legg til ny oppføring
      const entry = {
        timestamp: getCurrentTimestamp(),
        action: actionType,
        details: details
      };

      log.unshift(entry); // Legg til først (nyeste først)

      // Trim til maks antall oppføringer
      if (log.length > MAX_LOGG_ENTRIES) {
        log = log.slice(0, MAX_LOGG_ENTRIES);
      }

      // Lagre tilbake med manuell serialisering
      const serialized = serializeToJS(log);
      console.log('💾 NISSY-logg: Lagrer til localStorage:', {
        entries: log.length,
        size: serialized.length + ' bytes'
      });
      localStorage.setItem(LOGG_STORAGE_KEY, serialized);
      
      console.log('📝 NISSY-logg: Loggoppføring lagret:', entry);
      
      // Vis toast-melding
      showToast(`✅ ${actionType} logget (${details.length} bestilling${details.length !== 1 ? 'er' : ''})`);
      
    } catch (error) {
      console.error('❌ NISSY-logg: Feil ved lagring av loggoppføring:', error);
      showToast('⚠️ Kunne ikke lagre loggoppføring', 'error');
    }
  }

  /**
   * Hent alle loggoppføringer
   */
  function getLogEntries() {
    try {
      const stored = localStorage.getItem(LOGG_STORAGE_KEY);
      if (stored) {
        console.log('🔍 NISSY-logg: Leser fra localStorage:', {
          type: typeof stored,
          length: stored.length
        });
        
        const parsed = deserializeFromJS(stored);
        console.log('🔍 NISSY-logg: Deserialize-resultat:', {
          type: typeof parsed,
          isArray: Array.isArray(parsed),
          length: Array.isArray(parsed) ? parsed.length : 'N/A'
        });
        
        // Sjekk at det er et array
        if (Array.isArray(parsed)) {
          console.log('✅ NISSY-logg: Logg er et gyldig array med', parsed.length, 'oppføring' + (parsed.length !== 1 ? 'er' : ''));
          return parsed;
        } else {
          console.warn('⚠️ NISSY-logg: Lagret logg var ikke et array:', typeof parsed);
          console.warn('⚠️ NISSY-logg: Resetter logg');
          localStorage.removeItem(LOGG_STORAGE_KEY);
          return [];
        }
      }
    } catch (error) {
      console.error('❌ NISSY-logg: Feil ved henting av logg:', error);
      console.warn('⚠️ NISSY-logg: Resetter korrupt logg');
      localStorage.removeItem(LOGG_STORAGE_KEY);
    }
    return [];
  }

  /**
   * GLOBAL FUNKSJON: Reset logg (kan kalles fra console)
   */
  window.nissyLoggReset = function() {
    if (confirm('⚠️ Er du sikker på at du vil resette NISSY-loggen?\n\nDette sletter all loggdata og kan ikke angres.')) {
      localStorage.removeItem(LOGG_STORAGE_KEY);
      console.log('✅ NISSY-logg: Logg resatt');
      showToast('🔄 Logg resatt');
      // Refresh popup hvis den er åpen
      showLoggPopup();
    }
  };
  
  console.log('💡 TIP: Kjør nissyLoggReset() i console for å resette loggen hvis den blir korrupt');

  /**
   * Slett alle loggoppføringer
   */
  function clearLog() {
    if (confirm('⚠️ Er du sikker på at du vil slette hele loggen?\n\nDette kan ikke angres.')) {
      localStorage.removeItem(LOGG_STORAGE_KEY);
      console.log('✅ NISSY-logg: Logg slettet');
      showToast('🗑️ Logg slettet');
      showLoggPopup(); // Refresh popup
    }
  }

  /**
   * Eksporter logg til JSON-fil
   */
  /**
   * Vis toast-melding
   */
  function showToast(message, type = 'success') {
    // Sjekk om det allerede finnes en toast
    let toast = document.getElementById('nissy-logg-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nissy-logg-toast';
      document.body.appendChild(toast);
    }

    // Sett farge basert på type
    let bgColor = '#047CA1'; // default blå
    if (type === 'error') bgColor = '#d32f2f';
    if (type === 'warning') bgColor = '#f57c00';

    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    toast.textContent = message;
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);

    // Fade out etter 3 sekunder
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Vis logg i popup
   */
  function showLoggPopup() {
    // Fjern eksisterende popup og overlay hvis de finnes
    const existingPopup = document.getElementById('nissy-logg-popup');
    const existingOverlay = document.getElementById('nissy-logg-overlay');
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();

    const log = getLogEntries();

    // Opprett overlay FØRST
    const overlay = document.createElement('div');
    overlay.id = 'nissy-logg-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 99999;
    `;
    
    // Opprett popup
    const popup = document.createElement('div');
    popup.id = 'nissy-logg-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #047CA1;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 100000;
      width: 90%;
      max-width: 1000px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      font-family: Arial, sans-serif;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #047CA1 0%, #0398c7 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 6px 6px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = '📋 NISSY Handlingslogg';
    title.style.cssText = 'margin: 0; font-size: 18px; font-weight: bold;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(255,255,255,0.3)'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
    closeBtn.onclick = () => {
      // Sjekk at elementene fortsatt er i DOM før fjerning
      if (popup && popup.parentNode) {
        popup.remove();
      }
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Toolbar med knapper
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 10px 20px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    const statsText = document.createElement('span');
    statsText.textContent = `${log.length} oppføring${log.length !== 1 ? 'er' : ''}`;
    statsText.style.cssText = 'flex: 1; color: #666; font-size: 14px;';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Slett alle';
    clearBtn.style.cssText = `
      background: #d32f2f;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;
    clearBtn.onclick = clearLog;

    toolbar.appendChild(statsText);
    toolbar.appendChild(clearBtn);

    // Content med loggoppføringer
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    `;

    if (log.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <p style="font-size: 48px; margin: 0;">📋</p>
          <p style="margin: 10px 0 0 0;">Ingen loggoppføringer ennå</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">Handlinger som tildeling, avbestilling osv. vil bli logget her</p>
        </div>
      `;
    } else {
      log.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.style.cssText = `
          background: ${index % 2 === 0 ? '#f9f9f9' : 'white'};
          padding: 12px 15px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 4px solid #047CA1;
        `;

        const headerLine = document.createElement('div');
        headerLine.style.cssText = `
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-weight: bold;
        `;

        const actionSpan = document.createElement('span');
        actionSpan.textContent = `${getActionIcon(entry.action)} ${entry.action}`;
        actionSpan.style.cssText = 'color: #047CA1;';

        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = entry.timestamp;
        timestampSpan.style.cssText = 'color: #666; font-size: 12px; font-weight: normal;';

        headerLine.appendChild(actionSpan);
        headerLine.appendChild(timestampSpan);

        entryDiv.appendChild(headerLine);

        // Detaljer om bestillinger
        if (entry.details && entry.details.length > 0) {
          entry.details.forEach(detail => {
            const detailDiv = document.createElement('div');
            detailDiv.style.cssText = `
              background: white;
              padding: 8px 10px;
              margin-top: 6px;
              border-radius: 3px;
              font-size: 13px;
              border: 1px solid #e0e0e0;
            `;

            let html = `<strong>Rek.nr: ${detail.title}</strong>`;
            if (detail.patientName) html += ` - ${detail.patientName}`;
            if (detail.tripTime) html += `<br><span style="color: #666;">🕐 Reisetid: ${detail.tripTime}</span>`;
            if (detail.treatmentTime) html += ` <span style="color: #666;">📍 Oppmøte: ${detail.treatmentTime}</span>`;
            if (detail.addresses) html += `<br><span style="color: #666;">📍 ${detail.addresses}</span>`;

            detailDiv.innerHTML = html;
            entryDiv.appendChild(detailDiv);
          });
        }

        content.appendChild(entryDiv);
      });
    }

    // Sett sammen popup
    popup.appendChild(header);
    popup.appendChild(toolbar);
    popup.appendChild(content);
    
    // Overlay-klikk for å lukke
    overlay.onclick = () => {
      // Sjekk at elementene fortsatt er i DOM før fjerning
      if (popup && popup.parentNode) {
        popup.remove();
      }
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    };
    
    // Legg til overlay først, deretter popup
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }

  /**
   * Hent ikon basert på handlingstype
   */
  function getActionIcon(actionType) {
    const icons = {
      'Tildeling': '✅',
      'Avbestilling': '❌',
      'Avplanlegging': '📤',
      'Endring': '✏️',
      'Annet': '📝'
    };
    return icons[actionType] || '📝';
  }

  /* ======================================================
     LYTTE PÅ HANDLINGER
     ====================================================== */

  /**
   * Lytt på tildeling-knappen
   */
  function setupAssignListener() {
    const btnAssign = document.getElementById('buttonAssignVopps');
    const btnAssignConfirm = document.getElementById('buttonAssignVoppsAssistConfirm');

    let listenersAdded = false;

    if (btnAssign) {
      // Legg til vår listener (ikke erstatt eksisterende)
      btnAssign.addEventListener('click', onAssignClick, true); // true = capture phase
      console.log('✅ NISSY-logg: Lytter på Tildel oppdrag knapp');
      listenersAdded = true;
    }

    if (btnAssignConfirm) {
      btnAssignConfirm.addEventListener('click', onAssignClick, true);
      console.log('✅ NISSY-logg: Lytter på Tildel oppdrag (confirm) knapp');
      listenersAdded = true;
    }

    if (!listenersAdded) {
      console.warn('⚠️ NISSY-logg: Fant ikke tildeling-knapper, prøver igjen om 1 sekund...');
      setTimeout(setupAssignListener, 1000);
    }
  }

  function onAssignClick(event) {
    console.log('🔔 NISSY-logg: Tildel oppdrag klikket!');
    
    // VIKTIG: Fang radene NÅ, før AJAX-kallet fjerner dem
    const selectedRowsAll = document.querySelectorAll(
      'tr[style*="background-color: rgb(148, 169, 220)"]'
    );
    
    // FILTRER: Kun V- rader (ventende oppdrag), ikke T- (turer) eller P- (pågående)
    const selectedRowsNow = Array.from(selectedRowsAll).filter(row => {
      return row.id && row.id.startsWith('V-');
    });
    
    console.log(`🔍 NISSY-logg: Fant ${selectedRowsAll.length} valgte rader totalt, ${selectedRowsNow.length} ventende oppdrag (V-)`);
    
    // Ekstrahér informasjon NÅ (før radene potensielt fjernes)
    const detailsNow = [];
    if (selectedRowsNow.length > 0) {
      selectedRowsNow.forEach((row, index) => {
        const info = extractRowInfo(row);
        console.log(`📝 NISSY-logg: Rad ${index + 1}:`, info);
        detailsNow.push(info);
      });
    }
    
    // Vent på at AJAX-kallet er ferdig, deretter logg
    setTimeout(() => {
      if (detailsNow.length > 0) {
        console.log('✅ NISSY-logg: Lagrer tildeling basert på rader ved klikk');
        saveLogEntry('Tildeling', detailsNow);
      } else {
        console.warn('⚠️ NISSY-logg: Ingen rader ble funnet ved klikk');
        
        // Fallback: Prøv å finne rader etter litt ventetid
        const selectedRowsLater = document.querySelectorAll(
          'tr[style*="background-color: rgb(148, 169, 220)"]'
        );
        
        console.log(`🔍 NISSY-logg: Fant ${selectedRowsLater.length} valgte rader ETTER VENT`);
        
        if (selectedRowsLater.length > 0) {
          const detailsLater = [];
          selectedRowsLater.forEach((row) => {
            detailsLater.push(extractRowInfo(row));
          });
          saveLogEntry('Tildeling', detailsLater);
        }
      }
    }, 300);
  }

  /* ======================================================
     INITIALISER
     ====================================================== */

  // Start listeners når DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(setupAssignListener, 500);
    });
  } else {
    setTimeout(setupAssignListener, 500);
  }

  // Vis popup når scriptet kjøres
  setTimeout(() => {
    showLoggPopup();
  }, 100);

  // Vis status i console
  const currentLog = getLogEntries();
  console.log(`✅ NISSY-logg-script lastet (${currentLog.length} oppføring${currentLog.length !== 1 ? 'er' : ''} i logg)`);
})();