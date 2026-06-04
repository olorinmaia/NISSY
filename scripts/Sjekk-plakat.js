// ================================================================================
// SJEKK PLAKAT - FINN RØD PLAKAT MED FRITEKST
// Finner alle bestillinger med rød plakat (poster-red*) og viser fritekst
// fra: Melding til pasientreisekontoret, Melding til transportøren, Merknad om hentested
// 
// NY FUNKSJONALITET: Fjern merknader fra bestillinger
// ================================================================================

(() => {
  // --- SPERRE MOT DUPLIKAT KJØRING ---
  if (window.__sjekkPlakatActive) {
    console.warn("⚠️ Sjekk-plakat er allerede aktiv - ignorerer ny forespørsel");
    return;
  }
  window.__sjekkPlakatActive = true;

  let modalDiv = null;
  let overlayDiv = null;

  // ============================================================
  // MILJØ-BASERT KONFIGURASJON FOR FJERNING AV FRITEKST
  // ============================================================
  const ENVIRONMENT_CONFIG = {
    test: {
      editsValue: ',2,3,9'   // Edits-verdi for TEST
    },
    qa: {
      editsValue: ',2,3,9'   // Edits-verdi for QA
    },
    prod: {
      editsValue: ',2,3,9'   // Edits-verdi for PROD
    }
  };

  // Detekter miljø basert på URL
  const hostname = window.location.hostname;
  let config;
  
  if (hostname.includes('test')) {
    config = ENVIRONMENT_CONFIG.test;
  } else if (hostname.includes('qa')) {
    config = ENVIRONMENT_CONFIG.qa;
  } else {
    config = ENVIRONMENT_CONFIG.prod;
  }

  // ============================================================
  // PROBLEMATISKE ORD/FRASER SOM SKAL FLAGGES
  // ============================================================
  const PROBLEMATIC_KEYWORDS = [
    'alenebil',
    'smitte',
    'hentes',
    'adresse',
    'framsete',
    'rullestol',
    'rullator',
    'prekestol',
    'personbil',
    'lav bil',
    'høy bil',
    'liten bil',
    'forsete',
    'direkte',
    'sitte',
    'hjelp',
    'yrkesskade',
    'følges',
    'ledsager',
    'pårørende',
    'toalett',
    'dobesøk'
  ];

  // ============================================================
  // TOAST-MELDINGER
  // ============================================================
  let currentToast = null;
  
  /**
   * Vis en toast-melding nederst på skjermen
   * @param {string} msg - Melding å vise
   * @param {string} type - 'success' (grønn) eller 'error' (rød)
   */
  function showToast(msg, type = 'success') {
    // Fjern eksisterende toast
    if (currentToast && currentToast.parentNode) {
      currentToast.parentNode.removeChild(currentToast);
    }
    
    const toast = document.createElement("div");
    toast.textContent = msg;
    
    // Velg farge basert på type
    const bgColor = type === 'success' ? '#28a745' : '#d9534f';
    
    // Styling
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: bgColor,
      color: "#fff",
      padding: "12px 24px",
      borderRadius: "5px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      zIndex: "999999",
      opacity: "0",
      transition: "opacity 0.3s ease"
    });
    
    document.body.appendChild(toast);
    currentToast = toast;
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    
    // Fade out etter 4 sekunder
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentToast === toast) {
          currentToast = null;
        }
      }, 300);
    }, 4000);
  }

  // ============================================================
  // BEKREFTELSESDIALOG
  // ============================================================
  function showConfirm(message) {
    return new Promise(resolve => {
      // Opprett overlay (mørk bakgrunn)
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.zIndex = "10000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      // Opprett dialog-boks
      const box = document.createElement("div");
      box.style.background = "#fff";
      box.style.padding = "24px";
      box.style.borderRadius = "8px";
      box.style.maxWidth = "500px";
      box.style.fontFamily = "Arial, sans-serif";
      box.style.textAlign = "center";
      box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

      // Melding
      const text = document.createElement("div");
      text.innerHTML = message; // Endret fra textContent til innerHTML
      text.style.marginBottom = "20px";
      text.style.fontSize = "15px";
      text.style.lineHeight = "1.5";
      text.style.color = "#333";
      text.style.textAlign = "left"; // Venstrejustert for bedre lesbarhet av lister

      // OK-knapp (grønn)
      const btnOk = document.createElement("button");
      btnOk.textContent = "OK";
      btnOk.style.background = "#28a745";
      btnOk.style.color = "#fff";
      btnOk.style.border = "none";
      btnOk.style.padding = "10px 20px";
      btnOk.style.marginRight = "10px";
      btnOk.style.borderRadius = "4px";
      btnOk.style.fontSize = "14px";
      btnOk.style.cursor = "pointer";
      btnOk.style.fontWeight = "600";
      btnOk.onclick = () => {
        overlay.remove();
        resolve(true);
      };

      // Avbryt-knapp (grå)
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Avbryt";
      btnCancel.style.background = "#6c757d";
      btnCancel.style.color = "#fff";
      btnCancel.style.border = "none";
      btnCancel.style.padding = "10px 20px";
      btnCancel.style.borderRadius = "4px";
      btnCancel.style.fontSize = "14px";
      btnCancel.style.cursor = "pointer";
      btnCancel.style.fontWeight = "600";
      btnCancel.onclick = () => {
        overlay.remove();
        resolve(false);
      };

      // Bygg dialogen
      box.append(text, btnOk, btnCancel);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  // ============================================================
  // SPINNER-OVERLAY MED FREMDRIFT OG AVBRYT
  // ============================================================
  function visVenterOverlay(cancelRef) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
    });

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '50px',
      height: '50px',
      border: '6px solid #ddd',
      borderTop: '6px solid #dc3545',
      borderRadius: '50%',
      animation: 'sjekkPlakatSpinner 0.8s linear infinite',
      marginBottom: '20px',
    });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes sjekkPlakatSpinner {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleTag);

    const tekst = document.createElement('div');
    tekst.textContent = 'Henter plakat-data…';
    Object.assign(tekst.style, {
      color: 'white',
      fontSize: '20px',
      fontWeight: '600',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    });

    const hint = document.createElement('div');
    hint.textContent = 'Trykk ESC for å avbryte';
    Object.assign(hint.style, {
      color: 'rgba(255,255,255,0.7)',
      fontSize: '13px',
      marginTop: '8px',
    });

    overlay.appendChild(spinner);
    overlay.appendChild(tekst);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    function escClose(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        styleTag.remove();
        document.removeEventListener('keydown', escClose);
        cancelRef.cancelled = true;
        window.__sjekkPlakatActive = false;
      }
    }
    document.addEventListener('keydown', escClose);

    return {
      fjern: () => {
        if (overlay.isConnected) overlay.remove();
        if (styleTag.isConnected) styleTag.remove();
        document.removeEventListener('keydown', escClose);
      },
      settTekst: (txt) => { tekst.textContent = txt; }
    };
  }

  // ============================================================
  // FJERN FRITEKST FRA BESTILLING
  // ============================================================
  async function removeNotesFromRequisition(requisitionId, reknr) {
    // Bekreftelse
    const confirmed = await showConfirm(
      `Er du sikker på at du ønsker å fjerne alle merknader fra bestilling ${reknr}?<br><br>` +
      `Dette vil fjerne:<br>` +
      `• Melding til pasientreisekontoret<br>` +
      `• Melding til transportøren<br>` +
      `• Merknad om hentested`
    );
    
    if (!confirmed) return;

    try {
      // ============================================================
      // HENT BRUKER-ID
      // ============================================================
      const userLink = [...document.querySelectorAll('a[href*="popup/changePassword"]')]
        .find(a => /id=\d+/.test(a.href));
      
      if (!userLink) {
        showToast('❌ Kunne ikke finne bruker-ID', 'error');
        return;
      }

      const userid = userLink.href.match(/id=(\d+)/)?.[1];
      if (!userid) {
        showToast('❌ Ugyldig bruker-ID', 'error');
        return;
      }

      // ============================================================
      // STEG 1: HENT REDIGERINGSSIDEN
      // ============================================================
      const url = `/rekvisisjon/requisition/editMultipleRequisitions?userid=${userid}&id=${requisitionId}&res=${reknr}`;
      
      const html = await fetch(url, { credentials: "same-origin" }).then(r => r.text());
      const doc = new DOMParser().parseFromString(html, "text/html");
      
      // Finn versjonsnummer
      const version = doc.querySelector('input[name="version_0"]')?.value;
      if (!version) {
        showToast('❌ Kunne ikke finne versjonsnummer', 'error');
        return;
      }

      // ============================================================
      // STEG 2: BYGG POST-DATA FOR Å FJERNE MERKNADER
      // ============================================================
      const fd = new URLSearchParams({
        // Admin-parametere
        admin_param_1: "",
        admin_param_2: "",
        admin_param_3: "",
        admin_param_4: reknr,
        admin_param_5: "",
        admin_param_6: "",
        
        // Versjonskontroll
        version_0: version,
        version_count: "1",
        
        // Behandling og tid (uendret)
        editTreatmentDate: "",
        editTreatmentTime: "",
        editStartDate: "",
        editStartTime: "",
        
        // *** VIKTIG: Tøm alle merknadsfelt ***
        editComment: "",              // Melding til pasientreisekontoret
        editTransporterMessage: "",   // Melding til transportøren
        
        // Ledsagere (uendret)
        editNoOfCompanions: "",
        
        // Fra-adresse (uendret)
        editFromName: "",
        editFromStreetName: "",
        editFromHouseNr: "",
        editFromHouseSubNr: "",
        "editFromCoordinates.x": "",
        "editFromCoordinates.y": "",
        "editFromCoordinates.z": "",
        editFromOrganizationId: "",
        editFromPostCode: "",
        editFromCity: "",
        editFromPhone: "",
        
        // Til-adresse (uendret)
        editToName: "",
        editToStreetName: "",
        editToHouseNr: "",
        editToHouseSubNr: "",
        "editToCoordinates.x": "",
        "editToCoordinates.y": "",
        "editToCoordinates.z": "",
        editToOrganizationId: "",
        editToPostCode: "",
        editToCity: "",
        editToPhone: "",
        
        // Diverse (uendret)
        callOnArrival: "",
        infoAboutPickup: "",         // Merknad om hentested
        
        // Metadata
        selectedIndex: "0",
        action: "save",
        edits: config.editsValue      // Miljø-spesifikk edits-verdi (,2,3,9)
      });

      // ============================================================
      // STEG 3: SEND POST-REQUEST
      // ============================================================
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd.toString()
      });

      if (response.ok) {
        showToast(`✓ Merknader fjernet fra bestilling ${reknr}`, 'success');
        
        // ============================================================
        // VISUELL MARKERING I POPUP
        // ============================================================
        // Finn bestillings-kortet i DOM
        const posterCard = modalDiv.querySelector(`[data-reknr="${reknr}"]`);
        
        if (posterCard) {
          // Finn fritekst-boksen
          const freetextBox = posterCard.querySelector('div[style*="background: #fff; border: 1px solid #dee2e6"]');
          
          if (freetextBox) {
            // Legg til "Fjernet"-badge øverst
            const freetextHeader = freetextBox.querySelector('div');
            if (freetextHeader) {
              freetextHeader.innerHTML = '📝 FRITEKST <span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; font-weight: 600;">✓ FJERNET</span>';
            }
            
            // Stryk over all fritekst
            const freetextItems = freetextBox.querySelectorAll('div[style*="margin-bottom: 6px"]');
            freetextItems.forEach(item => {
              item.style.textDecoration = 'line-through';
              item.style.opacity = '0.5';
            });
            
            // Legg til grå overlay på hele fritekst-boksen
            freetextBox.style.position = 'relative';
            freetextBox.style.opacity = '0.6';
            freetextBox.style.backgroundColor = '#f5f5f5';
          }
          
          // Fjern "Fjern merknad(er)"-knappen
          const removeButton = posterCard.querySelector('.nissy-remove-notes-btn');
          if (removeButton) {
            removeButton.style.display = 'none';
          }
        }
        
        // Refresh data etter 3 sekunder (gir brukeren tid til å se endringen)
        setTimeout(() => {
          openPopp("-1");
        }, 1000);
      } else {
        showToast('❌ Feil ved lagring av endringer', 'error');
      }
    } catch (error) {
      console.error('Feil ved fjerning av merknader:', error);
      showToast('❌ En feil oppstod ved fjerning av merknader', 'error');
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Sjekk om fritekst inneholder problematiske ord
  // ============================================================
  function hasProblematicText(freetext) {
    if (!freetext) return false;
    
    const allText = [
      freetext.amtp || '',
      freetext.amtt || '',
      freetext.mohts || ''
    ].join(' ').toLowerCase();
    
    return PROBLEMATIC_KEYWORDS.some(keyword => allText.includes(keyword.toLowerCase()));
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn hvilke problematiske ord som finnes
  // ============================================================
  function findProblematicKeywords(freetext) {
    if (!freetext) return [];
    
    const allText = [
      freetext.amtp || '',
      freetext.amtt || '',
      freetext.mohts || ''
    ].join(' ').toLowerCase();
    
    return PROBLEMATIC_KEYWORDS.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
  }

  // ============================================================
  // HJELPEFUNKSJON: Bryt lang tekst til flere linjer
  // ============================================================
  function breakLongText(text, maxLength = 130) {
    if (!text || text.length <= maxLength) return text;
    
    // Finn mellomrom nærmest maxLength
    let breakPoint = text.lastIndexOf(' ', maxLength);
    if (breakPoint === -1) breakPoint = maxLength;
    
    return text.substring(0, breakPoint) + '<br>' + breakLongText(text.substring(breakPoint + 1), maxLength);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent bestillingsdata fra server
  // ============================================================
  async function fetchRequisitionData(requisitionId) {
    try {
      const url = `/planlegging/ajax-dispatch?update=false&action=showreq&rid=${requisitionId}`;
      const response = await fetch(url, { credentials: "same-origin" });
      
      // Serveren sender ISO-8859-1, men fetch leser som UTF-8
      // Vi må decode korrekt for å få norske tegn
      let text;
      try {
        const buffer = await response.arrayBuffer();
        
        // Prøv ISO-8859-1 først (NISSY's standard encoding)
        let decoder = new TextDecoder('iso-8859-1');
        text = decoder.decode(buffer);
        
        // Hvis vi fortsatt har problemer, prøv UTF-8
        if (text.includes('�')) {
          decoder = new TextDecoder('utf-8', { fatal: false });
          const utf8Text = decoder.decode(buffer);
          
          // Bruk UTF-8 hvis det ser bedre ut
          if (!utf8Text.includes('�')) {
            text = utf8Text;
          }
        }
      } catch (e) {
        console.warn('⚠️ Encoding fallback:', e);
        text = await response.text();
      }
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      // Sjekk for parsing-feil
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error("XML parsing error:", parseError.textContent);
        // Prøv å parse som HTML i stedet (mer tolerant)
        const htmlDoc = parser.parseFromString(text, "text/html");
        return htmlDoc;
      }
      
      return xmlDoc;
    } catch (error) {
      console.error("Feil ved henting av bestillingsdata:", error);
      return null;
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Parse fritekst fra XML-response
  // ============================================================
  function parseFreetextFromXML(xmlDoc) {
    if (!xmlDoc) return null;

    // Finn alle <td class="reqv_field"> og tilhørende <td class="reqv_value">
    const fieldCells = xmlDoc.querySelectorAll('td.reqv_field');
    
    const result = {
      amtp: '',  // Melding til pasientreisekontoret
      amtt: '',  // Melding til transportøren
      mohts: ''  // Merknad om hentested
    };

    for (const fieldCell of fieldCells) {
      const fieldName = fieldCell.textContent.trim();
      const valueCell = fieldCell.nextElementSibling;
      
      if (!valueCell || !valueCell.classList.contains('reqv_value')) continue;
      
      const value = valueCell.textContent.trim();
      
      if (fieldName === 'Melding til pasientreisekontoret:') {
        result.amtp = value;
      } else if (fieldName === 'Melding til transportøren:') {
        result.amtt = value;
      } else if (fieldName === 'Merknad om hentested:') {
        result.mohts = value;
      }
    }

    return result;
  }

  // ============================================================
  // HJELPEFUNKSJON: Fjern problematiske husnummer-suffikser (H0123, U0123 etc)
  // ============================================================
  /**
   * Fjerner problematiske husnummer-suffikser (H0123, U0123 etc)
   * @param {string} address - Original adresse
   * @returns {string} - Adresse uten suffikser
   */
  function cleanAddressSuffixes(address) {
    if (!address) return '';
    
    // Regex for å fjerne H0123, U0123, L0123 etc. (bokstav + 4 sifre)
    return address.replace(/\s+[A-Z]\d{4}/g, '');
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks basert på header-tekst
  // ============================================================
  function findColumnIndex(table, headerText) {
    const headers = table.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerContent = headers[i].textContent.trim().replace(/\s+/g, ' ');
      if (headerContent === headerText || headerContent.includes(headerText)) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks basert på eksakt tekst
  // ============================================================
  function findColumnIndexByText(containerSelector, exactText) {
    const container = document.querySelector(containerSelector);
    if (!container) return -1;
    
    const table = container.querySelector('table');
    if (!table) return -1;
    
    const headers = table.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerContent = headers[i].textContent.trim();
      if (headerContent === exactText) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn alle røde plakater i ventende oppdrag
  // ============================================================
  function findRedPostersVentende() {
    const container = document.querySelector('#ventendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Finn kolonne-indekser dynamisk (alle valgfrie bortsett fra plakat-kolonnen)
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const reiseIndex = findColumnIndex(table, 'Reise');
    const oppIndex = findColumnIndex(table, 'Opp');
    const fraIndex = findColumnIndex(table, 'Fra');
    const behovIndex = findColumnIndexByText('#ventendeoppdrag', 'Behov');
    const ledsagerIndex = findColumnIndexByText('#ventendeoppdrag', 'L');
    
    const rows = [...container.querySelectorAll('tr[id^="V-"]')];
    const results = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length === 0) continue;
      
      // Sjekk første celle for røde plakater
      const firstCell = cells[0];
      const redPosters = firstCell.querySelectorAll('img[src*="poster-red"]');
      
      if (redPosters.length === 0) continue;
      
      // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX)"
      let requisitionId = null;
      for (const img of redPosters) {
        const onmouseover = img.getAttribute('onmouseover');
        if (onmouseover) {
          const match = onmouseover.match(/showReq\(this,(\d+)/);
          if (match) {
            requisitionId = match[1];
            break;
          }
        }
      }
      
      if (!requisitionId) {
        // Fallback: bruk row name
        requisitionId = row.getAttribute('name');
      }
      
      if (!requisitionId) continue;
      
      const reknr = row.getAttribute('title') || '';
      const navn = navnIndex !== -1 ? (cells[navnIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
      const hentetid = reiseIndex !== -1 ? (cells[reiseIndex]?.textContent.trim() || '-') : '-';
      const leveringstid = oppIndex !== -1 ? (cells[oppIndex]?.textContent.trim() || '-') : '-';
      
      let fra = '';
      let til = '';
      if (fraIndex !== -1) {
        const adresseCell = cells[fraIndex]?.innerHTML || '';
        const parts = adresseCell.split('<br>').map(s => s.trim());
        fra = parts[0] || '';
        til = parts[1] || '';
      }
      
      const behov = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
      const ledsager = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
      
      results.push({
        requisitionId,
        reknr,
        navn,
        hentetid,
        leveringstid,
        fra,
        til,
        behov,
        ledsager,
        status: '', // Ventende bestillinger har ikke status-felt
        type: 'Ventende'
      });
    }
    
    return results;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn alle røde plakater i pågående oppdrag
  // ============================================================
  function findRedPostersPagaende() {
    const container = document.querySelector('#pagaendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Finn kolonne-indekser dynamisk (alle valgfrie bortsett fra toggle/plakat-kolonnen)
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const startIndex = findColumnIndex(table, 'Start');
    const oppIndex = findColumnIndex(table, 'Oppm');
    const fraIndex = findColumnIndex(table, 'Fra');
    const tilIndex = findColumnIndex(table, 'Til');
    const toggleIndex = findColumnIndex(table, 'T');
    const behovIndex = findColumnIndexByText('#pagaendeoppdrag', 'Behov');
    const ledsagerIndex = findColumnIndexByText('#pagaendeoppdrag', 'L');
    const statusIndex = findColumnIndex(table, 'Status');
    
    // Toggle-kolonnen MÅ finnes (der ligger plakaten)
    if (toggleIndex === -1) return [];
    
    const rows = [...container.querySelectorAll('tr[id^="P-"]')];
    const results = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      
      // Sjekk om denne raden har multi-booking struktur
      const hasMultipleBookings = cells.some(cell => 
        cell.querySelector('div.even.row-image') || cell.querySelector('div.odd.row-image')
      );
      
      if (hasMultipleBookings) {
        // Multi-booking struktur
        const toggleCell = cells[toggleIndex];
        if (!toggleCell) continue;
        
        const imgContainers = toggleCell.querySelectorAll('div.row-image');
        
        for (let i = 0; i < imgContainers.length; i++) {
          const container = imgContainers[i];
          const redPosters = container.querySelectorAll('img[src*="poster-red"]');
          
          if (redPosters.length === 0) continue;
          
          // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX,1320)"
          let requisitionId = null;
          for (const img of redPosters) {
            const onmouseover = img.getAttribute('onmouseover');
            if (onmouseover) {
              const match = onmouseover.match(/showReq\(this,(\d+)/);
              if (match) {
                requisitionId = match[1];
                break;
              }
            }
          }
          
          if (!requisitionId) continue;
          
          // Hent data fra tilsvarende div i andre kolonner (alle valgfrie)
          const navnDivs = navnIndex !== -1 ? (cells[navnIndex]?.querySelectorAll('div.row-image') || []) : [];
          const hentetidDivs = startIndex !== -1 ? (cells[startIndex]?.querySelectorAll('div.row-image') || []) : [];
          const leveringstidDivs = oppIndex !== -1 ? (cells[oppIndex]?.querySelectorAll('div.row-image') || []) : [];
          const fraDivs = fraIndex !== -1 ? (cells[fraIndex]?.querySelectorAll('div.row-image') || []) : [];
          const tilDivs = tilIndex !== -1 ? (cells[tilIndex]?.querySelectorAll('div.row-image') || []) : [];
          const behovDivs = behovIndex !== -1 ? (cells[behovIndex]?.querySelectorAll('div.row-image') || []) : [];
          const ledsagerDivs = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.querySelectorAll('div.row-image') || []) : [];
          const statusDivs = statusIndex !== -1 ? (cells[statusIndex]?.querySelectorAll('div.row-image') || []) : [];
          
          // Finn reknr fra action containers
          const actionContainers = cells[cells.length - 1]?.querySelectorAll('div.row-image') || [];
          let reknr = '';
          
          if (actionContainers[i]) {
            const questionImg = actionContainers[i].querySelector('img[onclick*="searchStatus"]');
            if (questionImg) {
              const onclick = questionImg.getAttribute('onclick');
              const reknrMatch = onclick?.match(/nr=(\d+)/);
              if (reknrMatch) reknr = reknrMatch[1];
            }
          }
          
          if (!reknr && imgContainers[i]) {
            const questionImg = imgContainers[i].querySelector('img[onclick*="searchStatus"]');
            if (questionImg) {
              const onclick = questionImg.getAttribute('onclick');
              const reknrMatch = onclick?.match(/nr=(\d+)/);
              if (reknrMatch) reknr = reknrMatch[1];
            }
          }
          
          const navn = navnDivs[i]?.textContent.trim() || '(Ukjent)';
          const hentetid = hentetidDivs[i]?.textContent.trim() || '-';
          const leveringstid = leveringstidDivs[i]?.textContent.trim() || '-';
          const fra = fraDivs[i]?.textContent.trim() || '';
          const til = tilDivs[i]?.textContent.trim() || '';
          const behov = behovDivs[i]?.textContent.trim() || '';
          const ledsager = ledsagerDivs[i]?.textContent.trim() || '';
          const status = statusDivs[i]?.textContent.trim() || '';
          
          results.push({
            requisitionId,
            reknr,
            navn,
            hentetid,
            leveringstid,
            fra,
            til,
            behov,
            ledsager,
            status,
            type: 'Pågående'
          });
        }
      } else {
        // Single booking struktur
        const toggleCell = cells[toggleIndex];
        if (!toggleCell) continue;
        
        const redPosters = toggleCell.querySelectorAll('img[src*="poster-red"]');
        
        if (redPosters.length === 0) continue;
        
        // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX,1320)"
        let requisitionId = null;
        for (const img of redPosters) {
          const onmouseover = img.getAttribute('onmouseover');
          if (onmouseover) {
            const match = onmouseover.match(/showReq\(this,(\d+)/);
            if (match) {
              requisitionId = match[1];
              break;
            }
          }
        }
        
        if (!requisitionId) {
          // Fallback: bruk row name
          requisitionId = row.getAttribute('name');
        }
        
        if (!requisitionId) continue;
        
        // Finn reknr fra action cell (siste celle)
        let reknr = '';
        const actionCell = cells[cells.length - 1];
        if (actionCell) {
          const questionImg = actionCell.querySelector('img[onclick*="searchStatus"]');
          if (questionImg) {
            const onclick = questionImg.getAttribute('onclick');
            const reknrMatch = onclick?.match(/nr=(\d+)/);
            if (reknrMatch) reknr = reknrMatch[1];
          }
        }
        
        const navn = navnIndex !== -1 ? (cells[navnIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
        const hentetid = startIndex !== -1 ? (cells[startIndex]?.textContent.trim() || '-') : '-';
        const leveringstid = oppIndex !== -1 ? (cells[oppIndex]?.textContent.trim() || '-') : '-';
        const fra = fraIndex !== -1 ? (cells[fraIndex]?.textContent.trim() || '') : '';
        const til = tilIndex !== -1 ? (cells[tilIndex]?.textContent.trim() || '') : '';
        const behov = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
        const ledsager = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
        const status = statusIndex !== -1 ? (cells[statusIndex]?.textContent.trim() || '') : '';
        
        results.push({
          requisitionId,
          reknr,
          navn,
          hentetid,
          leveringstid,
          fra,
          til,
          behov,
          ledsager,
          status,
          type: 'Pågående'
        });
      }
    }
    
    return results;
  }

  // ============================================================
  // HOVEDFUNKSJON: Hent data for alle røde plakater
  // ============================================================
  async function fetchAllRedPosterData() {
    const ventende = findRedPostersVentende();
    const pagaende = findRedPostersPagaende();
    
    const allPosters = [...ventende, ...pagaende];
    
    if (allPosters.length === 0) {
      return { all: [], problematic: [], normal: [] };
    }

    const ADVARSEL_GRENSE = 50;
    if (allPosters.length >= ADVARSEL_GRENSE) {
      const ok = await showConfirm(
        `<strong style="font-size:15px;">⚠️ ${allPosters.length} røde plakater funnet</strong><br><br>` +
        `Dette kan ta noen sekunder å hente.<br><br>` +
        `Hvis antallet virker uventet høyt, kan du lukke og justere filtrene i planleggingsbildet før du kjører på nytt.<br><br>` +
        `Vil du fortsette?`
      );
      if (!ok) {
        window.__sjekkPlakatActive = false;
        return null;
      }
    }

    console.log(`🔍 Fant ${allPosters.length} røde plakater, henter fritekst...`);

    const cancelRef = { cancelled: false };
    const { fjern: fjernSpinner, settTekst } = visVenterOverlay(cancelRef);
    const total = allPosters.length;

    const results = [];

    for (let i = 0; i < allPosters.length; i++) {
      if (cancelRef.cancelled) break;

      settTekst(`Henter plakat-data… ${i + 1}/${total}`);

      const poster = allPosters[i];
      const xmlDoc = await fetchRequisitionData(poster.requisitionId);
      const freetext = parseFreetextFromXML(xmlDoc);

      if (freetext && (freetext.amtp || freetext.amtt || freetext.mohts)) {
        const isProblematic = hasProblematicText(freetext);
        const keywords = isProblematic ? findProblematicKeywords(freetext) : [];

        results.push({
          ...poster,
          freetext,
          isProblematic,
          problematicKeywords: keywords
        });
      }
    }

    fjernSpinner();

    if (cancelRef.cancelled) return null;

    const problematic = results.filter(r => r.isProblematic);
    const normal = results.filter(r => !r.isProblematic);

    return { all: results, problematic, normal };
  }

  // ============================================================
  // HJELPEFUNKSJON: Åpne redigeringsmodal for bestilling
  // ============================================================
  function openRequisitionModal(requisitionId) {
    const url = `/rekvisisjon/requisition/redit?id=${requisitionId}&ns=true&noSerial=true`;
    window.open(url, '_blank', 'width=1200,height=800');
  }

  // ============================================================
  // HJELPEFUNKSJON: Lukk modal
  // ============================================================
  function closeModal() {
    if (modalDiv) {
      modalDiv.remove();
      modalDiv = null;
    }
    if (overlayDiv) {
      overlayDiv.remove();
      overlayDiv = null;
    }
    
    // Fjern event listener
    document.removeEventListener('keydown', handleEscape);
    
    // Fjern sperre
    window.__sjekkPlakatActive = false;
  }

  // ============================================================
  // EVENT HANDLER: ESC for å lukke modal
  // ============================================================
  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Vis modal med resultater
  // ============================================================
  function showModal(data) {
    const { all, problematic, normal } = data;
    
    // Opprett overlay
    overlayDiv = document.createElement('div');
    overlayDiv.style.position = 'fixed';
    overlayDiv.style.inset = '0';
    overlayDiv.style.background = 'rgba(0,0,0,0.5)';
    overlayDiv.style.zIndex = '9996';
    overlayDiv.addEventListener('click', closeModal);
    document.body.appendChild(overlayDiv);
    
    // Opprett modal
    modalDiv = document.createElement('div');
    
    let html = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 95%; max-height: 90vh; overflow-y: auto; z-index: 9997; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="position: sticky; top: 0; background: #dc3545; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; z-index: 1;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🚩 Røde plakater med fritekst</h2>
        <button id="closeModalBtn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px;">✕</button>
      </div>

      <div style="padding: 20px;">
    `;
    
    if (all.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 16px; color: #28a745; font-weight: 500; margin: 0;">✓ Ingen røde plakater med fritekst funnet</p>
        </div>
      `;
    } else {
      // Vis totalt antall 
      html += `<div style="background: #fff3cd; color: #856404; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #ffc107;">
        🚩 ${all.length} bestilling${all.length === 1 ? '' : 'er'} med rød plakat og fritekst
      </div>`;
      
      // Vis antall problematiske hvis det finnes noen
      if (problematic.length > 0) {
        html += `<div style="background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #dc3545;">
          ⚠️ ${problematic.length} bestilling${problematic.length === 1 ? '' : 'er'} med problematisk fritekst (alenebil, rullestol osv.)
        </div>`;
        
        // Vis problematiske først
        html += '<h3 style="color: #721c24; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">⚠️ Problematisk fritekst</h3>';
        html += renderPosters(problematic, true);
      }
      
      // Vis normale bestillinger
      if (normal.length > 0) {
        if (problematic.length > 0) {
          html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">📝 Øvrig fritekst</h3>';
        }
        html += renderPosters(normal, false);
      }
    }
    
    html += '</div></div>';
    modalDiv.innerHTML = html;
    
    modalDiv.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    document.body.appendChild(modalDiv);
    
    document.addEventListener('keydown', handleEscape);
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    // Legg til event listeners for redigeringsknapper
    const editButtons = modalDiv.querySelectorAll('.nissy-edit-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const requisitionId = btn.getAttribute('data-requisitionid');
        openRequisitionModal(requisitionId);
      });
    });
    
    // Legg til event listeners for "Fjern fritekst"-knapper
    const removeButtons = modalDiv.querySelectorAll('.nissy-remove-notes-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const requisitionId = btn.getAttribute('data-requisitionid');
        const reknr = btn.getAttribute('data-reknr');
        removeNotesFromRequisition(requisitionId, reknr);
      });
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Render poster-cards med tabell
  // ============================================================
  function renderPosters(posters, isProblematic = false) {
    let html = '';
    
    for (const poster of posters) {
      const { requisitionId, reknr, navn, hentetid, leveringstid, fra, til, type, behov, ledsager, freetext, problematicKeywords, status } = poster;
      
      const borderColor = isProblematic ? '#dc3545' : '#ffc107';
      
      // Sjekk om "Fjern fritekst"-knappen skal vises
      // Vis kun for: Ventende ELLER (Pågående OG Tildelt)
      const showRemoveButton = type === 'Ventende' || (type === 'Pågående' && status === 'Tildelt');
      
      // Begrens pasientnavn til 20 tegn
      const displayNavn = navn.length > 20 ? navn.substring(0, 20) + '...' : navn;
      
      html += `
        <div style="background: #f8f9fa; border-radius: 4px; padding: 12px; margin-bottom: 12px; border-left: 3px solid ${borderColor};" data-reknr="${reknr}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 2px;">
                ${displayNavn} 
                <span style="background: ${type === 'Ventende' ? '#ffc107' : '#17a2b8'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 6px;">${type}</span>
      `;
      
      // Vis status for pågående bestillinger
      if (type === 'Pågående' && status) {
        const statusColor = status === 'Tildelt' ? '#28a745' : '#6c757d';
        html += `
                <span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 6px;">${status}</span>
        `;
      }
      
      // Vis problematiske nøkkelord hvis de finnes
      if (isProblematic && problematicKeywords && problematicKeywords.length > 0) {
        html += `
                <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 6px; font-weight: 600;">⚠️ ${problematicKeywords.join(', ')}</span>
        `;
      }
      
      html += `
              </div>
              <div style="font-size: 12px; color: #666;">Reknr: ${reknr || 'N/A'}</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="nissy-edit-btn" data-requisitionid="${requisitionId}" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; white-space: nowrap;">
                ✏️ Rediger
              </button>
      `;
      
      // Kun vis "Fjern fritekst"-knappen for Ventende eller Tildelt bestillinger
      if (showRemoveButton) {
        html += `
              <button class="nissy-remove-notes-btn" data-requisitionid="${requisitionId}" data-reknr="${reknr}" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; white-space: nowrap;">
                🗑️ Fjern fritekst
              </button>
        `;
      }
      
      html += `
            </div>
          </div>
          
          <div style="overflow-x: auto; margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #e9ecef;">
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Hentetid</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Oppmøte</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Behov</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;" title="Antall ledsagere">L</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Fra</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Til</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 6px 8px; border: 1px solid #ddd;">${hentetid}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd;">${leveringstid}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.85em;">${behov || ''}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${ledsager || '-'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(fra)}">${cleanAddressSuffixes(fra)}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(til)}">${cleanAddressSuffixes(til)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 8px;">📝 FRITEKST</div>
      `;
      
      if (freetext.amtp) {
        const brokenText = breakLongText(freetext.amtp);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #856404; margin-bottom: 2px;">Melding til pasientreisekontoret:</div>
            <div style="font-size: 12px; color: #856404;">${brokenText}</div>
          </div>
        `;
      }
      
      if (freetext.amtt) {
        const brokenText = breakLongText(freetext.amtt);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #d1ecf1; border-left: 3px solid #17a2b8; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #0c5460; margin-bottom: 2px;">Melding til transportøren:</div>
            <div style="font-size: 12px; color: #0c5460;">${brokenText}</div>
          </div>
        `;
      }
      
      if (freetext.mohts) {
        const brokenText = breakLongText(freetext.mohts);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #f8d7da; border-left: 3px solid #dc3545; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #721c24; margin-bottom: 2px;">Merknad om hentested:</div>
            <div style="font-size: 12px; color: #721c24;">${brokenText}</div>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    return html;
  }

  // ============================================================
  // START SCRIPT
  // ============================================================
  (async () => {
    console.log('🚀 Starter Sjekk-plakat script...');
    
    const data = await fetchAllRedPosterData();
    if (!data) return;

    console.log(`✅ Ferdig! Fant ${data.all.length} bestillinger med fritekst (${data.problematic.length} problematiske)`);

    showModal(data);
  })();
})();