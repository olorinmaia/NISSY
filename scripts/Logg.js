(() => {
  // ============================================================
  // HANDLINGSLOGG-SCRIPT
  // Logger handlinger som tildeling, avbestilling, fjerning, avplanlegging
  // Lagrer i localStorage og viser historikk. Ingen sensitiv data. 
  // For å se hva som er lagret, konsoll: localStorage.getItem('nissy_action_log')
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
  
  /* ======================================================
     GUARD – FORHINDRER DOBBEL INSTALLASJON
     ====================================================== */
  if (window.__nissyLoggInstalled) {
    //console.log("✅ Handlingslogg er allerede aktiv");
    showLoggPopup(); // Vis logg når scriptet kjøres på nytt
    return;
  }
  window.__nissyLoggInstalled = true;

  console.log("🚀 Starter Handlingslogg-script");
  
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
   * Finn kolonne-indeks basert på header-tekst
   */
  function findColumnIndex(table, headerText) {
    const headers = table.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].textContent.trim().replace(/\s+/g, ' ');
      if (text.includes(headerText)) {
        return i;
      }
    }
    return -1;
  }

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
    
    const reqId = row.getAttribute('name'); // Intern ID
    const title = row.getAttribute('title'); // Rekvisisjonsnummer
    const cells = row.querySelectorAll('td');
    
    
    // Finn kolonne-indekser DYNAMISK (sikkerhet mot endringer i NISSY)
    const container = document.querySelector('#ventendeoppdrag');
    if (!container) {
      console.warn('⚠️ NISSY-logg: Fant ikke #ventendeoppdrag container');
      return { reqId, title, tripTime: '', treatmentTime: '', fromPostal: '', toPostal: '' };
    }
    
    const table = container.querySelector('table');
    if (!table) {
      console.warn('⚠️ NISSY-logg: Fant ikke tabell i #ventendeoppdrag');
      return { reqId, title, tripTime: '', treatmentTime: '', fromPostal: '', toPostal: '' };
    }
    
    // Finn kolonne-indekser (alle valgfrie for sikkerhet)
    const reiseIndex = findColumnIndex(table, 'Reise');
    const oppIndex = findColumnIndex(table, 'Opp');
    const fraIndex = findColumnIndex(table, 'Fra');
    
    
    // Hent reisetid (hvis kolonne finnes)
    let tripTime = '';
    if (reiseIndex !== -1 && cells.length > reiseIndex) {
      const tripCell = cells[reiseIndex];
      const tripFont = tripCell.querySelector('font');
      if (tripFont) {
        tripTime = tripFont.textContent.trim();
      }
    }
    
    // Hent oppmøtetid (hvis kolonne finnes)
    let treatmentTime = '';
    if (oppIndex !== -1 && cells.length > oppIndex) {
      const treatmentCell = cells[oppIndex];
      const treatmentFont = treatmentCell.querySelector('font');
      if (treatmentFont) {
        treatmentTime = treatmentFont.textContent.trim();
      }
    }

    // Hent postnummer/poststed fra adresse-kolonne (hvis finnes)
    // KUN det som kommer etter siste komma (sensitiv info-beskyttelse)
    let fromPostal = '';
    let toPostal = '';
    
    if (fraIndex !== -1 && cells.length > fraIndex) {
      const addressCell = cells[fraIndex];
      const html = addressCell.innerHTML;
      
      // Split på <br> for å få fra og til separat
      const parts = html.split('<br>').map(p => {
        // Fjern HTML-tags og trim
        const text = p.replace(/<[^>]*>/g, '').trim();
        // Fjern "./" prefix hvis det finnes
        const cleaned = text.replace(/^\.\//, '').trim();
        
        // VIKTIG: Hent kun det som kommer etter siste komma (postnr + poststed)
        // Dette sikrer at vi IKKE lagrer gatenavn/institusjonsnavn
        const lastComma = cleaned.lastIndexOf(',');
        if (lastComma !== -1) {
          return cleaned.substring(lastComma + 1).trim();
        }
        return cleaned;
      }).filter(p => p.length > 0);
      
      if (parts.length >= 2) {
        fromPostal = parts[0];
        toPostal = parts[1];
      } else if (parts.length === 1) {
        fromPostal = parts[0];
        toPostal = parts[0];
      }
      
    }

    const result = {
      reqId: reqId || 'Ukjent',
      title: title || '',
      tripTime: tripTime || '',
      treatmentTime: treatmentTime || '',
      fromPostal: fromPostal || '',
      toPostal: toPostal || ''
    };
    
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
      localStorage.setItem(LOGG_STORAGE_KEY, serialized);
      
      
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
        
        const parsed = deserializeFromJS(stored);
        
        // Sjekk at det er et array
        if (Array.isArray(parsed)) {
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
    if (confirm('⚠️ Er du sikker på at du vil resette handlingsloggen?\n\nDette sletter all loggdata og kan ikke angres.')) {
      localStorage.removeItem(LOGG_STORAGE_KEY);
      showToast('🔄 Logg resatt');
      // Refresh popup hvis den er åpen
      showLoggPopup();
    }
  };

  /**
   * Slett alle loggoppføringer
   */
  function clearLog() {
    if (confirm('⚠️ Er du sikker på at du vil slette hele loggen?\n\nDette kan ikke angres.')) {
      localStorage.removeItem(LOGG_STORAGE_KEY);
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
   * Tell tildelinger totalt
   */
  function countTodaysAssignments() {
    const log = getLogEntries();
    
    let count = 0;
    log.forEach(entry => {
      if (entry.action === 'Tildeling' && entry.details) {
        count += entry.details.length;
      }
    });
    
    return count;
  }

  /**
   * Tell avbestillinger totalt
   */
  function countTodaysCancellations() {
    const log = getLogEntries();
    
    let count = 0;
    log.forEach(entry => {
      if (entry.action === 'Avbestilling' && entry.details) {
        count += entry.details.length;
      }
    });
    
    return count;
  }

  /**
   * Tell avplanlegginger totalt
   */
  function countTodaysRemovals() {
    const log = getLogEntries();
    
    let count = 0;
    log.forEach(entry => {
      if (entry.action === 'Avplanlegging' && entry.details) {
        count += entry.details.length;
      }
    });
    
    return count;
  }

  /**
   * Tell fjerninger totalt
   */
  function countTodaysRemovals2() {
    const log = getLogEntries();
    
    let count = 0;
    log.forEach(entry => {
      if (entry.action === 'Fjerning' && entry.details) {
        count += entry.details.length;
      }
    });
    
    return count;
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

    // State for filtrering
    let activeFilters = new Set(); // 'Tildeling', 'Avbestilling', etc.
    let searchQuery = '';

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
      max-width: 900px;
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
    title.textContent = '📋 Handlingslogg';
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

    // Funksjon for å oppdatere innhold basert på filtre og søk
    function updateContent() {
      // Filtrer logg basert på activeFilters og searchQuery
      let filteredLog = log;
      
      // Filtrer på action type
      if (activeFilters.size > 0) {
        filteredLog = filteredLog.filter(entry => activeFilters.has(entry.action));
      }
      
      // Filtrer på søk
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredLog = filteredLog.filter(entry => {
          // Søk i timestamp
          if (entry.timestamp && entry.timestamp.toLowerCase().includes(query)) return true;
          
          // Søk i detaljer
          if (entry.details) {
            return entry.details.some(detail => {
              // Søk i reqId, title, avtale, status, adresser
              return (
                (detail.reqId && detail.reqId.toLowerCase().includes(query)) ||
                (detail.title && detail.title.toLowerCase().includes(query)) ||
                (detail.avtale && detail.avtale.toLowerCase().includes(query)) ||
                (detail.status && detail.status.toLowerCase().includes(query)) ||
                (detail.fromPostal && detail.fromPostal.toLowerCase().includes(query)) ||
                (detail.toPostal && detail.toPostal.toLowerCase().includes(query))
              );
            });
          }
          return false;
        });
      }
      
      // Oppdater innholdet
      renderContent(filteredLog);
      
      // Oppdater filter-badges styling
      updateFilterBadges();
    }

    // Statistikk med klikkbare badges
    const statsText = document.createElement('div');
    statsText.style.cssText = 'flex: 1; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;';
    
    const todaysAssignments = countTodaysAssignments();
    const todaysCancellations = countTodaysCancellations();
    const todaysRemovals = countTodaysRemovals(); // Avplanlegging av bestillinger
    const todaysRemovals2 = countTodaysRemovals2(); // Fjerning av turer
    
    // Funksjon for å lage klikkbar badge
    function createFilterBadge(actionType, count, color) {
      const badge = document.createElement('span');
      badge.dataset.actionType = actionType;
      badge.style.cssText = `
        color: ${color};
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
        font-weight: bold;
      `;
      badge.innerHTML = `${count} ${actionType.toLowerCase()}${count !== 1 ? 'er' : ''}`;
      
      badge.onclick = () => {
        if (activeFilters.has(actionType)) {
          activeFilters.delete(actionType);
        } else {
          activeFilters.add(actionType);
        }
        updateContent();
      };
      
      return badge;
    }
    
    // Funksjon for å oppdatere badge-styling
    function updateFilterBadges() {
      statsText.querySelectorAll('[data-action-type]').forEach(badge => {
        const actionType = badge.dataset.actionType;
        const isActive = activeFilters.has(actionType);
        
        if (isActive) {
          badge.style.background = 'rgba(71, 124, 161, 0.15)';
          badge.style.textDecoration = 'underline';
        } else {
          badge.style.background = 'transparent';
          badge.style.textDecoration = 'none';
        }
      });
    }
    
    // Legg til badges
    if (todaysAssignments > 0) {
      statsText.appendChild(createFilterBadge('Tildeling', todaysAssignments, '#047CA1'));
    }
    
    if (todaysCancellations > 0) {
      if (todaysAssignments > 0) {
        const sep = document.createElement('span');
        sep.style.color = '#999';
        sep.textContent = '·';
        statsText.appendChild(sep);
      }
      statsText.appendChild(createFilterBadge('Avbestilling', todaysCancellations, '#e74c3c'));
    }
    
    if (todaysRemovals > 0) {
      if (todaysAssignments > 0 || todaysCancellations > 0) {
        const sep = document.createElement('span');
        sep.style.color = '#999';
        sep.textContent = '·';
        statsText.appendChild(sep);
      }
      statsText.appendChild(createFilterBadge('Avplanlegging', todaysRemovals, '#3498db'));
    }
    
    if (todaysRemovals2 > 0) {
      if (todaysAssignments > 0 || todaysCancellations > 0 || todaysRemovals > 0) {
        const sep = document.createElement('span');
        sep.style.color = '#999';
        sep.textContent = '·';
        statsText.appendChild(sep);
      }
      statsText.appendChild(createFilterBadge('Fjerning', todaysRemovals2, '#95a5a6'));
    }
    
    // Total count (ikke klikkbar) - tell antall elementer, ikke entries
    const totalSep = document.createElement('span');
    totalSep.style.color = '#999';
    totalSep.style.marginLeft = '10px';
    totalSep.textContent = '·';
    statsText.appendChild(totalSep);
    
    // Tell totalt antall elementer (details) - bruk getLogEntries() direkte
    let totalElements = 0;
    const allEntries = getLogEntries();
    allEntries.forEach(entry => {
      if (entry.details && Array.isArray(entry.details)) {
        totalElements += entry.details.length;
      }
    });
    
    const totalSpan = document.createElement('span');
    totalSpan.style.cssText = 'color: #666; margin-left: 10px;';
    totalSpan.textContent = `${totalElements} totalt`;
    statsText.appendChild(totalSpan);

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
    
    // Søkefelt
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      padding: 15px 20px;
      border-bottom: 1px solid #e0e0e0;
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Søk etter rekvisisjonsnummer, turnummer, poststed...';
    searchInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      box-sizing: border-box;
    `;
    
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      updateContent();
    };
    
    searchContainer.appendChild(searchInput);

    // Content med loggoppføringer
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    `;
    
    // Funksjon for å rendre innhold
    function renderContent(filteredLog) {
      content.innerHTML = '';
      
      if (filteredLog.length === 0) {
        const emptyMsg = log.length === 0 
          ? 'Ingen loggoppføringer ennå'
          : 'Ingen treff';
        const emptySubMsg = log.length === 0
          ? 'Handlinger som tildeling, avbestilling osv. vil bli logget her'
          : 'Prøv et annet filter eller søk';
        
        content.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #999;">
            <p style="font-size: 48px; margin: 0;">📋</p>
            <p style="margin: 10px 0 0 0;">${emptyMsg}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">${emptySubMsg}</p>
          </div>
        `;
      } else {
        filteredLog.forEach((entry, index) => {
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

        // Detaljer om bestillinger/turer
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

            let html = '';
            
            // Sjekk om dette er en tur (har avtale/status) eller bestilling (har tripTime)
            if (detail.avtale || detail.status) {
              // TUR: Vis avtale-turnummer med link til admin (id-basert)
              html = `<span style="color: #666;">Ressurs:</span> <a href="/administrasjon/admin/searchStatus?id=${detail.reqId}" 
                         style="color: #047CA1; text-decoration: none; font-weight: bold;"
                         data-admin-link="true" title="Søk etter ${detail.reqId} i NISSY admin">
                         ${detail.title || detail.reqId}
                      </a>`;
              if (detail.status) html += ` <span style="color: #999;">Status: ${detail.status}</span>`;
            } else {
              // BESTILLING: Vis rekvisisjonsnummer med link (nr-basert), reisetid og adresser
              html = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="flex: 1;">
                  <span style="color: #666;">Bestilling:</span> 
                  <a href="/administrasjon/admin/searchStatus?nr=${detail.title}" 
                     style="color: #047CA1; text-decoration: none; font-weight: bold;"
                     data-admin-link="true" title="Søk etter ${detail.title} i NISSY admin">
                     ${detail.title}
                  </a>`;
              
              if (detail.tripTime) html += ` <span style="color: #666;">🕑 ${detail.tripTime}</span>`;
              if (detail.treatmentTime) html += ` <span style="color: #666;">${detail.treatmentTime}</span>`;
              if (detail.fromPostal || detail.toPostal) {
                const route = detail.fromPostal && detail.toPostal 
                  ? `${detail.fromPostal} → ${detail.toPostal}` 
                  : (detail.fromPostal || detail.toPostal);
                html += ` <span style="color: #999;">📍 ${route}</span>`;
              }
              
              html += `</div>`;
              
              // Vis søkeknapp kun hvis bestillingen IKKE er avbestilt
              if (entry.action !== 'Avbestilling') {
                html += `
                  <button class="nissy-search-btn" data-reqnr="${detail.title}" 
                          style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 14px; line-height: 1; flex-shrink: 0;"
                          title="Søk etter ${detail.title} i planlegging">
                    🔍
                  </button>`;
              }
              
              html += `</div>`;
            }

            detailDiv.innerHTML = html;
            entryDiv.appendChild(detailDiv);
          });
        }

        content.appendChild(entryDiv);
      });
    }
      
      // Sett opp event listeners etter rendering
      setupEventListeners();
    }
    
    // Funksjon for å sette opp event listeners
    function setupEventListeners() {
      // Admin-linker
      const adminLinks = content.querySelectorAll("a[data-admin-link='true']");
      adminLinks.forEach(link => {
        link.addEventListener("click", e => {
          e.preventDefault();
          const width = Math.floor(window.innerWidth / 2);
          const height = Math.floor(window.innerHeight * 0.9);
          window.open(
            link.href,
            "_blank",
            `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
          );
        });
      });
      
      // Søkeknapper
      const searchButtons = content.querySelectorAll('.nissy-search-btn');
      searchButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const reqNr = btn.getAttribute('data-reqnr');
          closePopup();
          if (reqNr && window.searchInPlanningByReqNr) {
            setTimeout(() => {
              window.searchInPlanningByReqNr(reqNr);
            }, 100);
          }
        });
      });
    }
    
    // Initial rendering
    renderContent(log);

    // Sett sammen popup
    popup.appendChild(header);
    popup.appendChild(toolbar);
    popup.appendChild(searchContainer);
    popup.appendChild(content);
    
    // Funksjon for å lukke popup
    const closePopup = () => {
      if (popup && popup.parentNode) {
        popup.remove();
      }
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
      document.removeEventListener('keydown', escListener);
    };
    
    // Overlay-klikk for å lukke
    overlay.onclick = closePopup;
    
    // ESC-tast for å lukke
    const escListener = (e) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
    document.addEventListener('keydown', escListener);
    
    // Legg til overlay først, deretter popup
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }

  /**
   * Hent ikon basert på handlingstype
   */
  function getActionIcon(actionType) {
    const icons = {
      'Tildeling': '🚐',
      'Avbestilling': '❌',
      'Avplanlegging': '↩️',
      'Fjerning': '🗑️',
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
      listenersAdded = true;
    }

    if (btnAssignConfirm) {
      btnAssignConfirm.addEventListener('click', onAssignClick, true);
      listenersAdded = true;
    }

    if (!listenersAdded) {
      console.warn('⚠️ NISSY-logg: Fant ikke tildeling-knapper, prøver igjen om 1 sekund...');
      setTimeout(setupAssignListener, 1000);
    }
  }

  function onAssignClick(event) {
    
    // VIKTIG: Fang radene NÅ, før AJAX-kallet fjerner dem
    const selectedRowsAll = document.querySelectorAll(
      'tr[style*="background-color: rgb(148, 169, 220)"]'
    );
    
    // FILTRER: Kun V- rader (ventende oppdrag), ikke T- (turer) eller P- (pågående)
    const selectedRowsNow = Array.from(selectedRowsAll).filter(row => {
      return row.id && row.id.startsWith('V-');
    });
    
    
    // Ekstrahér informasjon NÅ (før radene potensielt fjernes)
    const detailsNow = [];
    if (selectedRowsNow.length > 0) {
      selectedRowsNow.forEach((row, index) => {
        const info = extractRowInfo(row);
        detailsNow.push(info);
      });
    }
    
    // Vent på at AJAX-kallet er ferdig, deretter logg
    setTimeout(() => {
      if (detailsNow.length > 0) {
        saveLogEntry('Tildeling', detailsNow);
      } else {
        console.warn('⚠️ NISSY-logg: Ingen rader ble funnet ved klikk');
        
        // Fallback: Prøv å finne rader etter litt ventetid (KUN ventende bestillinger)
        const selectedRowsLater = document.querySelectorAll(
          '#ventendeoppdrag tr[style*="background-color: rgb(148, 169, 220)"]'
        );
        
        // Filtrer til kun V- (ventende) rader
        const ventendeRows = Array.from(selectedRowsLater).filter(row => 
          row.id && row.id.startsWith('V-')
        );
        
        if (ventendeRows.length > 0) {
          const detailsLater = [];
          ventendeRows.forEach((row) => {
            detailsLater.push(extractRowInfo(row));
          });
          saveLogEntry('Tildeling', detailsLater);
        }
        // Hvis fortsatt ingen ventende bestillinger funnet, logg INGENTING
      }
    }, 300);
  }

  /**
   * Lytt på Alt+S (Smart-tildeling), Alt+T (Tilordning 2.0) og Alt+L (Vis logg)
   */
  function setupKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      // Alt+S - Smart-tildeling
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        onAssignClick(e);
      }
      
      // Alt+T - Tilordning 2.0
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        onAssignClick(e);
      }
      
      // Alt+L - Vis logg
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault(); // Forhindre browser default
        showLoggPopup();
      }
    }, true); // Capture phase
    
  }

  /**
   * Lytt på avbestilling-bekreftelse (#confirmRemove knapp)
   * Bruker MutationObserver for å fange når knappen dukker opp i DOM
   * Fanger både Alt+K og klikk på remove.gif
   */
  function setupCancelListener() {
    // MutationObserver som ser etter når #confirmRemove eller #confirmAvplanlegg blir lagt til i DOM
    const observer = new MutationObserver((mutations) => {
      // Sjekk for #confirmRemove (avbestilling/fjerning)
      const confirmBtn = document.getElementById('confirmRemove');
      if (confirmBtn && !confirmBtn.dataset.nissyLoggListenerAdded) {
        
        // Marker at vi har lagt til listener (unngå duplikater)
        confirmBtn.dataset.nissyLoggListenerAdded = 'true';
        
        // Legg til click listener
        confirmBtn.addEventListener('click', onCancelClick, { once: true, capture: true });
      }
      
      // Sjekk for #confirmAvplanlegg (avplanlegging av bestilling)
      const avplanleggBtn = document.getElementById('confirmAvplanlegg');
      if (avplanleggBtn && !avplanleggBtn.dataset.nissyLoggListenerAdded) {
        
        // Marker at vi har lagt til listener (unngå duplikater)
        avplanleggBtn.dataset.nissyLoggListenerAdded = 'true';
        
        // Legg til click listener
        avplanleggBtn.addEventListener('click', onAvplanleggClick, { once: true, capture: true });
      }
    });
    
    // Start observering av hele body for nye elementer
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
  }

  /**
   * Håndter avbestilling-klikk
   */
  function onCancelClick(event) {
    
    let detailsNow = [];
    let actionType = 'Avbestilling';
    
    // FØRST: Prøv å hente info fra popup-dialogen
    const confirmBtn = document.getElementById('confirmRemove');
    if (confirmBtn) {
      // Finn parent dialog
      const dialog = confirmBtn.closest('div[style*="position: fixed"]');
      if (dialog) {
        
        // Hent tittel (type handling)
        const h2 = dialog.querySelector('h2');
        const title = h2 ? h2.textContent.trim() : '';
        
        // Bestem action type basert på dialog tittel
        if (title.includes('Fjern fra planlegging')) {
          actionType = 'Fjerning'; // Turer
        } else if (title.includes('Avbestill')) {
          actionType = 'Avbestilling'; // Turer/bestillinger
        }
        
        // Sjekk om det er masse-avbestilling (har <pre> tag med liste)
        const preTag = dialog.querySelector('pre');
        if (preTag) {
          const text = preTag.textContent.trim();
          
          // Sjekk om det er bestillinger (har <strong> tags inne i pre)
          if (text.includes('<strong>') || preTag.querySelector('strong')) {
            
            // Parse HTML for å få strong tags
            const strongs = preTag.querySelectorAll('strong');
            const lines = text.split('•').filter(line => line.trim().length > 0);
            
            lines.forEach((line, index) => {
              // Format: "Salah, Mo (262000771511)\n  Kirkegata legesenter, 7600 Levanger → Brubakken 15, 7608 Levanger"
              
              // Parse reqId fra (nummer)
              const reqMatch = line.match(/\((\d+)\)/);
              const reqId = reqMatch ? reqMatch[1] : '';
              
              // Fjern strong-tags og hent adresse-delen
              const cleanLine = line.replace(/<\/?strong>/g, '').trim();
              const parts = cleanLine.split('\n').map(p => p.trim()).filter(p => p.length > 0);
              
              // parts[0] = "Salah, Mo (262000771511)"
              // parts[1] = "Kirkegata legesenter, 7600 Levanger → Brubakken 15, 7608 Levanger"
              const addressLine = parts.length > 1 ? parts[1] : '';
              
              
              // Parse adresser
              let fromPostal = '';
              let toPostal = '';
              
              if (addressLine.includes('→')) {
                const addrParts = addressLine.split('→').map(p => p.trim());
                
                // Fra-adresse: Hent kun postnr/poststed (etter siste komma)
                if (addrParts[0]) {
                  const fromLastComma = addrParts[0].lastIndexOf(',');
                  if (fromLastComma !== -1) {
                    fromPostal = addrParts[0].substring(fromLastComma + 1).trim();
                  }
                }
                
                // Til-adresse: Hent kun postnr/poststed (etter siste komma)
                if (addrParts[1]) {
                  const toLastComma = addrParts[1].lastIndexOf(',');
                  if (toLastComma !== -1) {
                    toPostal = addrParts[1].substring(toLastComma + 1).trim();
                  }
                }
              }
              
              if (reqId) {
                detailsNow.push({
                  reqId: reqId,
                  title: reqId,
                  tripTime: '',
                  treatmentTime: '',
                  fromPostal: fromPostal || '',
                  toPostal: toPostal || ''
                });
              }
            });
            
          } else {
            // Masse-avbestilling av turer
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            lines.forEach((line, index) => {
              // Format: "• Levan-L-LB-56516260 (Tildelt)"
              const trimmed = line.trim().replace(/^•\s*/, ''); // Fjern bullet
              
              // Parse: "Levan-L-LB-56516260 (Tildelt)"
              const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
              if (match) {
                const turInfo = match[1].trim(); // "Levan-L-LB-56516260"
                const status = match[2].trim();  // "Tildelt"
                
                // Parse tur-info for å få avtale og turnummer
                let avtale = '';
                let turnummer = '';
                
                if (turInfo.includes('-')) {
                  const parts = turInfo.split('-');
                  turnummer = parts[parts.length - 1]; // Siste del
                  avtale = parts.slice(0, -1).join('-'); // Resten
                } else {
                  turnummer = turInfo;
                }
                
                  
                detailsNow.push({
                  reqId: turnummer || 'Ukjent',
                  title: turInfo, // Hele strengen
                  avtale: avtale || 'Ukjent',
                  status: status || 'Ukjent',
                  tripTime: '',
                  treatmentTime: '',
                  fromPostal: '',
                  toPostal: ''
                });
              }
            });
            
          }
        } else {
          // Enkelt-avbestilling: Sjekk om det er bestilling eller tur
          const strong = dialog.querySelector('div[style*="background:#fafafa"] strong');
          const strongText = strong ? strong.textContent.trim() : '';
          
          // Sjekk om det er bestilling (format: "Navn (nummer)")
          const isOrder = strongText.match(/\((\d+)\)/);
          
          if (isOrder) {
            
            // Parse reqId
            const reqId = isOrder[1];
            
            // Hent adresser
            const addressSpan = dialog.querySelector('div[style*="background:#fafafa"] span');
            const addressText = addressSpan ? addressSpan.textContent.trim() : '';
            
            
            // Parse adresser
            let fromPostal = '';
            let toPostal = '';
            
            if (addressText.includes('→')) {
              const parts = addressText.split('→').map(p => p.trim());
              
              // Fra-adresse: Hent kun postnr/poststed (etter siste komma)
              if (parts[0]) {
                const fromLastComma = parts[0].lastIndexOf(',');
                if (fromLastComma !== -1) {
                  fromPostal = parts[0].substring(fromLastComma + 1).trim();
                }
              }
              
              // Til-adresse: Hent kun postnr/poststed (etter siste komma)
              if (parts[1]) {
                const toLastComma = parts[1].lastIndexOf(',');
                if (toLastComma !== -1) {
                  toPostal = parts[1].substring(toLastComma + 1).trim();
                }
              }
            }
            
            detailsNow.push({
              reqId: reqId,
              title: reqId,
              tripTime: '',
              treatmentTime: '',
              fromPostal: fromPostal || '',
              toPostal: toPostal || ''
            });
            
          } else {
            // Enkelt-avbestilling av tur
            
            const turInfo = strongText;
            
            // Hent status fra span
            const statusSpan = dialog.querySelector('div[style*="background:#fafafa"] span');
            const statusText = statusSpan ? statusSpan.textContent.trim() : '';
            
            
            // Parse tur-info for å få avtale og turnummer
            let avtale = '';
            let turnummer = '';
            
            if (turInfo.includes('-')) {
              const parts = turInfo.split('-');
              const lastPart = parts[parts.length - 1];
              
              // Sjekk om siste del har minst 8 siffer = turnummer
              // Eksempel: "Levan-LB-56516261" → lastPart = "56516261" (8 siffer) = turnummer
              // Eksempel: "TR-3079" → lastPart = "3079" (4 siffer) = løyvenummer
              if (lastPart.length >= 8 && /^\d+$/.test(lastPart)) {
                // Dette er et turnummer
                turnummer = lastPart;
                avtale = parts.slice(0, -1).join('-');
              } else {
                // Dette er løyvenummer - søk etter turnummer i DOM
                avtale = turInfo;
                
                // Søk i resurser-tabellen etter rad med dette løyvenummeret
                const allRows = document.querySelectorAll('#resurser tr[id^="Rxxx"]');
                for (const row of allRows) {
                  // Finn løyvenummer-cellen (inneholder løyvenummer som tekstinnhold)
                  const loyveCells = row.querySelectorAll('td[id*="loyvexxx"]');
                  for (const cell of loyveCells) {
                    if (cell.textContent.trim() === turInfo) {
                      // Funnet riktig rad! Søk etter turnummer i img onclick
                      const questionImg = row.querySelector('img[src*="question.gif"]');
                      if (questionImg && questionImg.onclick) {
                        // Parse: onclick="javascript:window.open(&quot;/administrasjon/admin/searchStatus?id=70117346&quot;,&quot;window&quot;);"
                        const onclickStr = questionImg.getAttribute('onclick');
                        const idMatch = onclickStr.match(/searchStatus\?id=(\d+)/);
                        if (idMatch) {
                          turnummer = idMatch[1];
                          break;
                        }
                      }
                    }
                  }
                  if (turnummer) break;
                }
                
                // Hvis vi ikke fant turnummer, bruk løyvenummer som fallback
                if (!turnummer) {
                  turnummer = turInfo;
                }
              }
            } else {
              // Ingen "-" i strengen = løyvenummer - søk etter turnummer i DOM
              avtale = turInfo;
              
              // Søk i resurser-tabellen etter rad med dette løyvenummeret
              const allRows = document.querySelectorAll('#resurser tr[id^="Rxxx"]');
              for (const row of allRows) {
                // Finn løyvenummer-cellen (inneholder løyvenummer som tekstinnhold)
                const loyveCells = row.querySelectorAll('td[id*="loyvexxx"]');
                for (const cell of loyveCells) {
                  if (cell.textContent.trim() === turInfo) {
                    // Funnet riktig rad! Søk etter turnummer i img onclick
                    const questionImg = row.querySelector('img[src*="question.gif"]');
                    if (questionImg && questionImg.onclick) {
                      // Parse: onclick="javascript:window.open(&quot;/administrasjon/admin/searchStatus?id=70117346&quot;,&quot;window&quot;);"
                      const onclickStr = questionImg.getAttribute('onclick');
                      const idMatch = onclickStr.match(/searchStatus\?id=(\d+)/);
                      if (idMatch) {
                        turnummer = idMatch[1];
                        break;
                      }
                    }
                  }
                }
                if (turnummer) break;
              }
              
              // Hvis vi ikke fant turnummer, bruk løyvenummer som fallback
              if (!turnummer) {
                turnummer = turInfo;
              }
            }
            
            // Lagre tur-info
            if (turInfo) {
              detailsNow.push({
                reqId: turnummer || 'Ukjent',
                title: turInfo, // Hele strengen (løyvenummer eller avtale-turnummer)
                avtale: avtale || 'Ukjent',
                status: statusText.replace('Status: ', '').trim() || 'Ukjent',
                tripTime: '',
                treatmentTime: '',
                fromPostal: '',
                toPostal: ''
              });
              
              }
          }
        }
      }
    }
    
    // DERETTER: Hvis ingen info fra popup, prøv å hente fra rader (for bestillinger)
    if (detailsNow.length === 0) {
      
      // Fang radene NÅ (både fra ventende og pågående)
      const selectedRowsVentende = document.querySelectorAll(
        '#ventendeoppdrag tr[style*="background-color: rgb(148, 169, 220)"]'
      );
      const selectedRowsPaagaaende = document.querySelectorAll(
        '#paagaaendeoppdrag tr[style*="background-color: rgb(148, 169, 220)"]'
      );
      
      // Kombiner og filtrer
      const allSelected = [...selectedRowsVentende, ...selectedRowsPaagaaende];
      const selectedRowsNow = allSelected.filter(row => {
        // Kun V- (ventende) eller P- (pågående) rader
        return row.id && (row.id.startsWith('V-') || row.id.startsWith('P-'));
      });
      
      
      if (selectedRowsNow.length === 0) {
        console.warn('⚠️ NISSY-logg: Ingen rader funnet ved avbestilling');
        return;
      }
      
      // Ekstrahér informasjon NÅ (før radene fjernes)
      selectedRowsNow.forEach((row, index) => {
        const info = extractRowInfo(row);
        detailsNow.push(info);
      });
    }
    
    // Logg avbestillingen/fjerningen
    setTimeout(() => {
      if (detailsNow.length > 0) {
        saveLogEntry(actionType, detailsNow);
      }
    }, 300);
  }

  /**
   * Håndter avplanlegging-klikk (bestillinger)
   */
  function onAvplanleggClick(event) {
    
    let detailsNow = [];
    
    // Finn parent dialog
    const avplanleggBtn = document.getElementById('confirmAvplanlegg');
    if (avplanleggBtn) {
      const dialog = avplanleggBtn.closest('div[style*="position: fixed"]');
      if (dialog) {
        
        // Hent strong tag: "Salah, Mo (262000771531)"
        const strong = dialog.querySelector('div[style*="background:#fafafa"] strong');
        const strongText = strong ? strong.textContent.trim() : '';
        
        // Parse: "Salah, Mo (262000771531)" → reqId: "262000771531"
        const reqMatch = strongText.match(/\((\d+)\)/);
        const reqId = reqMatch ? reqMatch[1] : '';
        
        
        // Hent adresser fra span: "Kirkegata legesenter, 7600 Levanger → Brubakken 15, 7608 Levanger"
        const addressSpan = dialog.querySelector('div[style*="background:#fafafa"] span');
        const addressText = addressSpan ? addressSpan.textContent.trim() : '';
        
        
        // Parse adresser for å få postnr/poststed
        let fromPostal = '';
        let toPostal = '';
        
        if (addressText.includes('→')) {
          const parts = addressText.split('→').map(p => p.trim());
          
          // Fra-adresse: Hent kun postnr/poststed (etter siste komma)
          if (parts[0]) {
            const fromLastComma = parts[0].lastIndexOf(',');
            if (fromLastComma !== -1) {
              fromPostal = parts[0].substring(fromLastComma + 1).trim();
            }
          }
          
          // Til-adresse: Hent kun postnr/poststed (etter siste komma)
          if (parts[1]) {
            const toLastComma = parts[1].lastIndexOf(',');
            if (toLastComma !== -1) {
              toPostal = parts[1].substring(toLastComma + 1).trim();
            }
          }
        }
        
        
        // Lagre bestillings-info
        if (reqId) {
          detailsNow.push({
            reqId: reqId,
            title: reqId,
            tripTime: '',
            treatmentTime: '',
            fromPostal: fromPostal || '',
            toPostal: toPostal || ''
          });
          
        }
      }
    }
    
    // Logg avplanleggingen
    setTimeout(() => {
      if (detailsNow.length > 0) {
        saveLogEntry('Avplanlegging', detailsNow);
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
      setupKeyboardListener(); // Keyboard shortcuts fungerer med en gang
      setupCancelListener(); // MutationObserver for avbestillinger
    });
  } else {
    setTimeout(setupAssignListener, 500);
    setupKeyboardListener(); // Keyboard shortcuts fungerer med en gang
    setupCancelListener(); // MutationObserver for avbestillinger
  }

  // Vis status i console
  const currentLog = getLogEntries();
  console.log(`✅ Handlingslogg-script lastet (${currentLog.length} oppføring${currentLog.length !== 1 ? 'er' : ''} i logg)`);
  
  /**
   * Søk i planlegging etter rekvisisjonsnummer
   */
  window.searchInPlanningByReqNr = function(reqNr) {
    // Sett søketype til "Rekvisisjonsnummer"
    const searchTypeSelect = document.getElementById('searchType');
    if (searchTypeSelect) {
      searchTypeSelect.value = 'requisitionNr';
    }
    
    // Utfør søk
    const searchInput = document.getElementById('searchPhrase');
    if (searchInput) {
      searchInput.value = reqNr;
      searchInput.focus();
      
      setTimeout(() => {
        const searchButton = document.getElementById('buttonSearch');
        if (searchButton) {
          searchButton.click();
        }
      }, 100);
    }
  };
})();