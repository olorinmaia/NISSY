(() => {
  // ============================================================
  // NISSY-fiks SCRIPT
  // Fikser en rekke bugs i NISSY
  // Legger på snarveier og forbedrer allerede eksisterende funksjoner
  // ============================================================
  
  /* ======================================================
     GUARD – FORHINDRER DOBBEL INSTALLASJON
     ====================================================== */
  if (window.__nissyMasterScriptInstalled) {
    console.log("✅ NISSY-fiks-script er allerede aktiv");
    return;
  }
  window.__nissyMasterScriptInstalled = true;

  console.log("🚀 Starter NISSY-fiks-script");

  /* ======================================================
     DEL 0: TASTATUR-HÅNDTERING
     ====================================================== */

  /* ---------- Blokker Alt alene (hindrer fokus til nettleserkrom) ----------
     Sporer om en annen tast ble trykket mens Alt holdes inne.
     Bare "Alt alene" (uten andre taster) blokkeres – Alt+E, Alt+F osv. fungerer normalt. */
  let _altPressedAlone = false;
  window.addEventListener("keydown", function (e) {
    if (e.key === "Alt") {
      _altPressedAlone = true;
    } else if (e.altKey) {
      _altPressedAlone = false;
    }
  }, true);
  window.addEventListener("keyup", function (e) {
    if (e.key === "Alt" && _altPressedAlone) {
      e.preventDefault();
    }
    _altPressedAlone = false;
  }, true);

  window.addEventListener("keydown", function (e) {
  
    const searchInput  = document.getElementById("searchPhrase");
    const searchButton = document.getElementById("buttonSearch");
    const cancelButton = document.getElementById("buttonCancelSearch");
  
    /* ---------- CTRL + 1 : Fokus filter ventende oppdrag ---------- */
    if (e.ctrlKey && e.key === "1") {
      const select = document.querySelector(
        'select[name="filter-ventende-oppdrag"]'
      );
      if (select) {
        e.preventDefault();
        select.focus();
      }
      return;
    }

    /* ---------- CTRL + 2 : Fokus filter ressurser ---------- */
    if (e.ctrlKey && e.key === "2") {
      const select = document.querySelector(
        'select[name="filter-resurser"]'
      );
      if (select) {
        e.preventDefault();
        select.focus();
      }
      return;
    }
    
    /* ---------- Alt + F : Fokus søk ---------- */
    if (e.altKey && e.key.toLowerCase() === "f") {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      return;
    }
  
    /* ---------- ENTER : Søk (kun i søkefelt) ---------- */
    if (
      e.key === "Enter" &&
      searchInput &&
      document.activeElement === searchInput
    ) {
      e.preventDefault();
      if (searchInput.value.trim() !== "" && searchButton) {
        searchButton.click();
      }
      return;
    }
  
    /* ---------- ESC : Nullstill søk + fokus ---------- */
    if (e.key === "Escape") {
      if (searchInput && cancelButton && searchInput.value.trim() !== "") {
        e.preventDefault();
        e.stopPropagation();
  
        cancelButton.click();
  
        setTimeout(() => {
          searchInput.focus();
          searchInput.select();
        }, 0);
  
        return;
      }
    }
  
    /* ---------- ALT + W : Vis i kart ---------- */
    if (e.altKey && e.key.toLowerCase() === "w") {
      e.preventDefault(); // Forhindre standard nettleser-oppførsel
      
      // Sjekk at funksjonen eksisterer før vi kaller den
      if (typeof showMapForSelectedItems === 'function') {
        showMapForSelectedItems(null);
      } else {
        console.error('showMapForSelectedItems er ikke tilgjengelig');
      }
      return;
    }
  
    /* ---------- ALT + G : Tildel oppdrag ---------- */
    if (e.altKey && e.key.toLowerCase() === "g") {
      const btn = document.getElementById("buttonAssignVopps");
      if (!btn || btn.disabled) return;
      btn.click();
      return;
    }
  
    /* ---------- ALT + B : Blank ---------- */
    if (e.altKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      clearSelection();
      return;
    }
  
    /* ---------- ALT + P : Merk alle ressurser pågående oppdrag ---------- */
    if (e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      clearSelection();
  
      setTimeout(() => {
        const c = document.getElementById("pagaendeoppdrag");
        if (!c) return;
        c.querySelectorAll(`tr[id^='P-']`).forEach(r => {
          try { selectRow(r.id, g_voppLS); } catch {}
        });
      }, 150);
      return;
    }
  
    /* ---------- ALT + V : Merk alle bestillinger ventende oppdrag ---------- */
    if (e.altKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      clearSelection();
  
      setTimeout(() => {
        const c = document.getElementById("ventendeoppdrag");
        if (!c) return;
        c.querySelectorAll(`tr[id^='V-']`).forEach(r => {
          try { selectRow(r.id, g_voppLS); } catch {}
        });
      }, 150);
      return;
    }
  
    /* ---------- F5 ---------- */
    if (e.key === "F5") {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openPopp === "function") {
        openPopp("-1");
      }
      return false;
    }
  
    /* ---------- Ctrl+R / Cmd+R ---------- */
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  
  }, true);

  /* ======================================================
     DEL 0B: FORBEDRET KARTVINDU (matcher Rutekalkulering)
     ====================================================== */
  
  (function setupMapWindowImprovement() {
    const originalWindowOpen = window.open;
    
    window.open = function(url, target, features) {
      // Sjekk om dette er "Vis i kart" (Alt+W)
      const isMap = url && (url.includes('mapDisplay') || url.includes('showmap') || url.includes('vis-i-kart'));
      
      if (isMap) {
        // Bruk SAMME vindu-features som Rutekalkulering.js:
        // - Halvparten av skjermbredden
        // - 90% av skjermhøyden
        // - Plassert på venstre side
        // Dette gir en side-ved-side layout med NISSY
        const mapFeatures = `width=${innerWidth / 2},height=${innerHeight * 0.9},left=0,top=50,resizable=yes,scrollbars=yes`;
        
        // Åpne vinduet med de nye features
        return originalWindowOpen.call(this, url, '_blank', mapFeatures);
      }
      
      // For andre URLs (inkludert Google Maps/rutekalkulering), bruk original
      return originalWindowOpen.call(this, url, target, features);
    };

  })();

  /* ======================================================
     DEL 1: KJØR KOLONNE-ENDRINGER (KUN ÉN GANG)
     ====================================================== */

  if (!window.__nissyColumnsApplied) {
    window.__nissyColumnsApplied = true;

    const base = "/planlegging/ajax-dispatch?did=all&";

    const urls = [
      "action=phidecol&cid=availableCapacity",
      "action=vhidecol&cid=tripTransportType",
      "action=pshowcol&cid=tripTreatmentDate",
      "action=pshowcol&cid=tripCompanions",
      "action=pshowcol&cid=tripSpecialRequirements",
      "action=pshowcol&cid=patientName"
    ];

    function xhrGet(url, callback) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.withCredentials = true; 
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          callback();
        }
      };
      xhr.send();
    }

    function runSequentially(list) {
      if (list.length === 0) {
        return;
      }

      const url = base + list.shift();
      xhrGet(url, () => runSequentially(list));
    }

    runSequentially(urls.slice());
  }

/* ======================================================
     DEL 1A: SETT KOLONNE-BREDDER (KUN ÉN GANG)
     ====================================================== */

  if (!window.__nissyColWidthsApplied) {
    window.__nissyColWidthsApplied = true;

    const colWidths = { col1: "33%", col2: "14.5%", col3: "52.5%" };
    for (const [id, width] of Object.entries(colWidths)) {
      const el = document.getElementById(id);
      if (el) el.style.flexBasis = width;
    }
  }

/* ======================================================
     DEL 1B: ERSTATT OG FORENKLE KONTROLLPANEL-TABELL
     Kjører tidlig og setter opp event handlers ETTER erstatning
     Fjerner unødvendige knapper og forenkler layout
     ====================================================== */

  (() => {
    console.log("🔧 Forenkler kontrollpanel-tabell...");

    function simplifyControlTable() {
      // Finn tabellen som inneholder buttonResourceComment (Merknad)
      const merknadButton = document.getElementById('buttonResourceComment');
      if (!merknadButton) {
        console.warn("⚠️ Fant ikke Merknad-knapp, prøver igjen om 500ms...");
        setTimeout(simplifyControlTable, 500);
        return;
      }

      const targetTable = merknadButton.closest('table');
      if (!targetTable) {
        console.warn("⚠️ Fant ikke målrette tabell");
        return;
      }

      // Sjekk om tabellen allerede er forenklet
      if (targetTable.hasAttribute('data-nissy-simplified')) {
        console.log("✅ Kontrollpanel allerede forenklet");
        return;
      }

      const tbody = targetTable.querySelector('tbody');
      if (!tbody) {
        console.warn("⚠️ Fant ikke tbody i tabell");
        return;
      }

      // Erstatt hele tbody-innholdet
      tbody.innerHTML = `
        <tr>
            <td valign="top" align="left"><input id="buttonResourceComment" type="button" value="Merknad" class="bigbutton" onclick="ButtonController.onClick(this)" disabled=""></td>
            <td valign="top" align="right">
                <input id="buttonResourceDeviation" type="button" value="Avvik" class="bigbutton" onclick="ButtonController.onClick(this)" disabled="">
            </td>
        </tr>
        <tr>
            <td valign="top" align="left"><input id="buttonAssignVopps" type="button" value="Tildel oppdrag" title="Snarvei: Alt+G" class="bigbutton" onclick="ButtonController.onClick(this)" disabled=""></td>
            <td valign="top" align="right">
                <input id="buttonSendSMS" type="button" value="Send SMS" class="bigbutton" onclick="ButtonController.onClick(this)">
            </td>
        </tr>
        <tr>
            <td valign="top" align="left"><input id="buttonAssignVoppsAssist" type="button" value="Tilordningsstøtte" class="bigbutton" onclick="ButtonController.onClick(this)"></td>
            <td valign="top" align="right"><input id="buttonShowMap" type="button" value="Vis i kart" title="Snarvei: Alt+W" class="bigbutton" onclick="ButtonController.onClick(this)" disabled=""></td>
        </tr>
        <tr>
            <td valign="top" align="left"><input id="buttonMeetingplace" type="button" value="Møteplass" title="Snarvei: Alt+M" class="bigbutton" onclick="ButtonController.onClick(this)" disabled=""></td>
            <td align="right">
                <select id="searchType" style="width:150px">
                    <option value="name">Navn</option>
                    <option value="bookingNr">Bookingnummer</option>
                    <option value="ssn">Personnummer</option>
                    <option value="requisitionNr">Rekvisisjonsnummer</option>
                    <option value="tripNr">Turnummer</option>
                </select>
            </td>
        </tr>
        <tr>
            <td valign="top" align="left"><input id="buttonClearSelection" type="button" value="Blank" title="Snarvei: Alt+B" class="bigbutton" onclick="ButtonController.onClick(this)" disabled=""></td>
            <td class="d_right" align="right">
                <input id="searchPhrase" type="text" title="Snarvei: Alt+F for å komme til søkefeltet" style="width:150px">
            </td>
        </tr>
        <tr>
            <td class="d_left" valign="bottom">
                <!-- tom plass for fremtidig bruk -->
            </td>
            <td class="d_right" align="right">
                <input type="button" id="buttonSearch" value="Søk" title="Snarvei: Trykk Enter etter du har skrevet noe i søkefeltet">&nbsp;
                <input type="button" id="buttonCancelSearch" value="Nullstill" title="Snarvei: Trykk ESC etter søk">
            </td>
        </tr>
      `;

      // Marker som forenklet
      targetTable.setAttribute('data-nissy-simplified', 'true');

      console.log("✅ Kontrollpanel-tabell forenklet");
      
      // Sett opp event handlers ETTER at tabellen er erstattet
      setupButtonHandlers();
    }

    // Kjør når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(simplifyControlTable, 300);
      });
    } else {
      setTimeout(simplifyControlTable, 300);
    }
  })();
  
  /* ======================================================
     DEL 1C: FJERN KONTOR-SPESIFIKKE ELEMENTER
     Fjerner elementer fra planleggingssiden basert på innlogget kontor
     ====================================================== */

  (() => {
    const _officeCell  = document.querySelector('.topframe_small');
    const _officeMatch = _officeCell?.textContent.match(/Pasientreisekontor for (.+?)\s+(?:&nbsp;|-)/);
    const _office1c    = _officeMatch?.[1]?.trim() || null;

    // Elementer som skal fjernes for Pasientreiser Nord-Trøndelag
    if (_office1c === 'Pasientreiser Nord-Trøndelag') {
      function removeNordTrondelagElements() {
        let allFound = true;

        const loyveBtn = document.getElementById('buttonTransporterPermit');
        if (loyveBtn) {
          loyveBtn.closest('tr')?.remove();
        } else {
          allFound = false;
        }

        const tfilter = document.getElementById('tfilter');
        if (tfilter) {
          tfilter.closest('tr')?.remove();
        } else {
          allFound = false;
        }

        const locusLogo = document.querySelector('img[src="/planlegging/images/locus_logo1.gif"]');
        if (locusLogo) {
          locusLogo.closest('table')?.closest('tr')?.remove();
        } else {
          allFound = false;
        }

        document.querySelectorAll('td.vspace').forEach(td => td.closest('tr')?.remove());

        const blankImg = document.querySelector('img[src="blank.gif"][width="1"][height="2"]');
        if (blankImg) {
          const next = blankImg.nextSibling;
          if (next?.nodeName === 'BR') next.remove();
          blankImg.remove();
        }

        document.querySelectorAll('img[src="blank.gif"].hspacing').forEach(img => img.remove());

        const bgTable = document.querySelector('footer table.bg-color');
        if (bgTable) bgTable.style.removeProperty('padding');

        if (!allFound) {
          setTimeout(removeNordTrondelagElements, 500);
        } else {
          console.log("✅ Fjernet Løyveregister og transportør-filter (Nord-Trøndelag)");
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(removeNordTrondelagElements, 300));
      } else {
        setTimeout(removeNordTrondelagElements, 300);
      }
    }
  })();

  /* ======================================================
     DEL 2: OVERVÅKING AV NISSY-LOGG FOR SESSION TIMEOUT
     Overvåker NISSY sin interne logg for feilmeldinger
     ====================================================== */

  let consecutiveFailures = 0;
  let sessionExpiredWarningShown = false;
  const FAILURE_THRESHOLD = 5; // Antall påfølgende feil før varsel

  function showSessionExpiredWarning() {
    if (sessionExpiredWarningShown) return; // Vis bare én gang
    sessionExpiredWarningShown = true;
    
    const userConfirmed = confirm(
      "⚠️ NISSY-økten svarer ikke eller har utløpt\n\n" +
      "Siden vil nå refreshes for å fikse problemet.\n\n" +
      "⚠️ VIKTIG: Etter refresh og evt. innlogging må du kjøre bokmerke med script-pakken på nytt!\n\n" +
      "Trykk OK for å fortsette."
    );
    
    if (userConfirmed) {
      window.location.reload();
    }
  }

  function setupLogMonitor() {
    const logger = document.getElementById("logger");
    if (!logger) {
      console.warn("⚠️ Fant ikke logger-element, prøver igjen om 2 sekunder...");
      setTimeout(setupLogMonitor, 2000);
      return;
    }

    console.log("👀 Overvåker NISSY-logg for session timeout...");

    // Observer for nye loggmeldinger
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Sjekk om det er en loggmelding-div
          if (node.nodeType === 1 && node.classList && node.classList.contains('logMsg')) {
            const message = node.textContent;
            
            // Sjekk for feilmeldinger
            if (message.includes("OBS! Handlingen") && message.includes("kunne ikke utføres")) {
              consecutiveFailures++;
              console.warn(`⚠️ NISSY-feil detektert (${consecutiveFailures}/${FAILURE_THRESHOLD}): ${message}`);
              
              if (consecutiveFailures >= FAILURE_THRESHOLD) {
                showSessionExpiredWarning();
              }
            }
            // Reset ved suksess-meldinger (ikke feil eller "opptatt")
            else if (!message.includes("Systemet er opptatt") && !message.includes("OBS!")) {
              if (consecutiveFailures > 0) {
                console.log("✅ NISSY-system tilbake til normal - resetter feil-teller");
                consecutiveFailures = 0;
              }
            }
          }
          
          // Sjekk også for røde error-ikoner (red.gif)
          if (node.nodeType === 1 && node.tagName === 'IMG' && node.src && node.src.includes('red.gif')) {
            // Red.gif vises ved feil - dette er også en indikator
            console.warn("🔴 Rød feil-ikon detektert i logger");
          }
        });
      });
    });

    // Start observering
    observer.observe(logger, {
      childList: true,
      subtree: false
    });

    console.log("✅ Logger-overvåkning aktivert");
  }

  // Start overvåkning når DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLogMonitor);
  } else {
    setTimeout(setupLogMonitor, 1000);
  }

  /* ======================================================
     DEL 3: UNIVERSAL XHR-LYTTER (PERSISTENT)
     ====================================================== */

  let activeWaiters = {
    filter: null,
    cancel: null,
    search: null,
    assign: null
  };

  let columnChangeDebounceTimer = null;
  const COLUMN_CHANGE_DEBOUNCE = 3000; // 3 sekunder debounce

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._requestUrl = url;

    if (url.includes('ajax-dispatch?did=all&')) {
      if (url.includes('vfilter=') || url.includes('rfilter=')) {
        this._requestType = 'filter';
      } else if (url.includes('search=none')) {
        this._requestType = 'cancel';
      } else if (url.includes('search=')) {
        this._requestType = 'search';
      } else if (url.includes('action=asstrans') || url.includes('action=assresassist')) {
        this._requestType = 'assign';
      } else if (url.includes('action=pshowcol') || url.includes('action=phidecol') || 
                 url.includes('action=vshowcol') || url.includes('action=vhidecol')) {
        this._requestType = 'columnchange';
      }
    }

    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._requestType) {
      const requestType = this._requestType;

      this.addEventListener("load", () => {
        const waiter = activeWaiters[requestType];
        if (waiter) {
          clearTimeout(waiter.timeout);
          activeWaiters[requestType] = null;
          waiter.callback();
        }
        
        // Kjør kolonnebegrensning på nytt ved kolonneendringer (med debounce)
        if (requestType === 'columnchange') {
          // Clear eksisterende timer
          if (columnChangeDebounceTimer) {
            clearTimeout(columnChangeDebounceTimer);
          }
          
          // Sett ny timer - kjører kun hvis ingen nye endringer kommer
          columnChangeDebounceTimer = setTimeout(() => {
            if (window.__reapplyColumnLimits) {
              window.__reapplyColumnLimits();
            }
            columnChangeDebounceTimer = null;
          }, COLUMN_CHANGE_DEBOUNCE);
        }
      });
    }
    return originalSend.apply(this, args);
  };

  function waitForAjaxThen(type, callback) {
    activeWaiters[type] = {
      callback: callback,
      timeout: setTimeout(() => {
        activeWaiters[type] = null;
        callback();
      }, 2000)
    };
  }

  /* ======================================================
     DEL 4: FILTER-HÅNDTERING
     ====================================================== */

  // Selects som skal kjøre clear + waitForAjax + openPopp
  const SELECTS_FULL_ACTION = [
    "filter-resurser",
    "filter-ventende-oppdrag"
  ];

  // Selects som KUN skal kjøre clear
  const SELECTS_CLEAR_ONLY = [
    "show-vopp-columns",
    "hide-vopp-columns",
    "filter-ventende-oppdrag-gruppe",
    "filter-resurser-gruppe",
    "show-popp-columns",
    "hide-popp-columns"
  ];

  function clearSelection() {
    if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
        ListSelectionGroup.clearAllSelections();
    }
  }

  function onSelectChange(e) {
    const select = e.target;
    if (!select || select.tagName !== "SELECT") return;
  
    if (SELECTS_CLEAR_ONLY.includes(select.name)) {
      clearSelection();
      return;
    }
  
    if (SELECTS_FULL_ACTION.includes(select.name)) {
      clearSelection();
  
      waitForAjaxThen("filter", () => {
        openPopp("-1");
      });
    }
  }

  document.addEventListener("change", onSelectChange, true);

  /* ======================================================
     DEL 5: KNAPP-HÅNDTERING
     Settes opp AV DEL 1B etter at tabellen er erstattet
     ====================================================== */

  function setupButtonHandlers() {
    console.log("🔧 Setter opp knapp-handlers...");

    const btnSearch = document.getElementById("buttonSearch");
    if (btnSearch) {
      btnSearch.addEventListener("click", () => {
        // Kall original NISSY-funksjon
        if (typeof performSearch === 'function') {
          performSearch();
        }
        
        // Deretter vår logikk
        waitForAjaxThen('search', () => {
          openPopp("-1");
          // Vent litt etter openPopp før highlighting
          setTimeout(() => {
            highlightSearchedRequisition();
          }, 300);
        });
      });
    } else {
      console.warn("⚠️ Fant ikke buttonSearch");
    }

    const btnCancel = document.getElementById("buttonCancelSearch");
    if (btnCancel) {
      btnCancel.addEventListener("click", () => {
        // Kall original NISSY-funksjon
        if (typeof cancelSearch === 'function') {
          cancelSearch();
        }
        
        // Deretter vår logikk
        waitForAjaxThen('cancel', () => {
          openPopp("-1");
          removeRequisitionHighlight();
        });
      });
    } else {
      console.warn("⚠️ Fant ikke buttonCancelSearch");
    }

    // Tildel oppdrag handler
    const btnAssign = document.getElementById("buttonAssignVopps");
    if (btnAssign) {
      btnAssign.addEventListener("click", onAssignClick);
    } else {
      console.warn("⚠️ Fant ikke buttonAssignVopps");
    }

    // Tildel oppdrag assist confirm (finnes andre steder, ikke i vår tabell)
    const btnAssignConfirm = document.getElementById("buttonAssignVoppsAssistConfirm");
    if (btnAssignConfirm) {
      btnAssignConfirm.addEventListener("click", onAssignClick);
    }
  }

  /* ======================================================
     HIGHLIGHT SØKT REKVISISJONSNUMMER
     Markerer den spesifikke bestillingen i en samlet tur
     ====================================================== */
  
  function highlightSearchedRequisition() {
    // Sjekk om søket er på rekvisisjonsnummer
    const searchType = document.getElementById("searchType");
    const searchPhrase = document.getElementById("searchPhrase");
    
    if (!searchType || !searchPhrase) return;
    if (searchType.value !== "requisitionNr") return;
    
    const searchedReqNr = searchPhrase.value.trim();
    if (!searchedReqNr) return;
    
    // Finn alle question.gif ikoner som inneholder rekvisisjonsnummeret
    const questionIcons = document.querySelectorAll('img[src="images/question.gif"]');
    
    questionIcons.forEach(icon => {
      const onclick = icon.getAttribute('onclick');
      if (onclick && onclick.includes(searchedReqNr)) {
        // Finn tabell-raden
        const tableRow = icon.closest('tr');
        if (!tableRow || !tableRow.id) return;
        
        if (tableRow.id.startsWith('P-')) {
          // PÅGÅENDE OPPDRAG
          // Finn parent div.row-image (finnes kun i pågående oppdrag)
          const rowDiv = icon.closest('div.row-image');
          if (rowDiv) {
            // Marker kun denne div-en med mørkere gul bakgrunn og border
            rowDiv.style.setProperty('background-color', '#ffd54f', 'important'); // Mørkere gul
            rowDiv.style.setProperty('border-left', '4px solid #ff6f00', 'important'); // Oransje venstre-border
            rowDiv.style.setProperty('border-radius', '2px', 'important');
            rowDiv.setAttribute('data-highlighted-req', 'true');
          }
          
          // Marker hele raden ETTER highlighting
          setTimeout(() => {
            if (typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
              try {
                selectRow(tableRow.id, g_poppLS);
              } catch (e) {
                console.warn('Kunne ikke markere pågående oppdrag rad:', e);
              }
            }
          }, 100);
          
        } else if (tableRow.id.startsWith('V-')) {
          // VENTENDE OPPDRAG
          // Marker hele raden
          if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
            try {
              selectRow(tableRow.id, g_voppLS);
            } catch (e) {
              console.warn('Kunne ikke markere ventende oppdrag rad:', e);
            }
          }
        }
      }
    });
  }
  
  function removeRequisitionHighlight() {
    // Fjern alle highlights
    const highlightedDivs = document.querySelectorAll('div[data-highlighted-req="true"]');
    highlightedDivs.forEach(div => {
      div.style.removeProperty('background-color');
      div.style.removeProperty('border-left');
      div.style.removeProperty('border-radius');
      div.removeAttribute('data-highlighted-req');
    });
  }

  function onAssignClick() {
    waitForAjaxThen('assign', () => {
      setTimeout(() => {
        const selectedRows = document.querySelectorAll(
          'tr[style*="background-color: rgb(148, 169, 220)"]'
        );

        if (selectedRows.length === 0) {
          openPopp("-1");
        }
      }, 150);
    });
  }

    /* ======================================================
     DEL 6: LEGG TIL MANUELLE SCRIPT-KNAPPER (NEDERST)
     ====================================================== */

  (() => {
    console.log("🔧 Legger til manuelle script-knapper...");

    // ============================================================
    // HJELPEFUNKSJON: Sjekk hvilket kontor brukeren er på
    // ============================================================
    function getCurrentOffice() {
      const topframeCell = document.querySelector('.topframe_small');
      if (!topframeCell) return null;
      
      const text = topframeCell.textContent;
      const match = text.match(/Pasientreisekontor for (.+?)\s+(?:&nbsp;|-)/)
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return null;
    }

    // ============================================================
    // LISTE OVER KONTORER MED TILGANG TIL SJEKK-PLAKAT
    // ============================================================
    const SJEKK_PLAKAT_OFFICES = [
      'Pasientreiser Nord-Trøndelag'
      // Legg til flere kontorer her etter hvert
      // 'Pasientreiser Sør-Trøndelag',
      // 'Pasientreiser Oslo',
    ];

    function hasSjekkPlakatAccess() {
      const office = getCurrentOffice();
      return office && SJEKK_PLAKAT_OFFICES.includes(office);
    }

    function addManualButtons() {
      // Finn bottomframe tabellen
      const bottomTable = document.querySelector('.bottomframe table tbody tr');
      
      if (!bottomTable) {
        console.warn("⚠️ Fant ikke bottomframe tabell");
        return;
      }
      
      // Sjekk om knappene allerede er lagt til
      if (document.getElementById('nissy-manual-scripts')) {
        console.log("✅ Manuelle script-knapper allerede installert");
        return;
      }
      
      // Legg til CSS for manuelle knapper
      if (!document.getElementById('nissy-manual-button-styles')) {
        const style = document.createElement('style');
        style.id = 'nissy-manual-button-styles';
        style.textContent = `
          .nissy-manual-btn {
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
            margin-right: 4px;
          }
          .nissy-manual-btn:hover {
            background: linear-gradient(135deg, #35659E 0%, #5785B9 100%);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .nissy-manual-btn:active {
            transform: translateY(0);
          }
          .nissy-manual-btn:disabled {
            background: #999;
            cursor: not-allowed;
            transform: none;
          }
          #nissy-manual-scripts {
            display: flex;
            gap: 4px;
            align-items: center;
            flex-wrap: wrap;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Opprett ny celle med knapper
      const newCell = document.createElement('td');
      newCell.className = 'd';
      newCell.setAttribute('valign', 'top');
      newCell.innerHTML = `
        <div id="nissy-manual-scripts">
          <button class="nissy-manual-btn" data-script="alenebil" title="Setter behovet 'Alenebil' på en eller flere merkede bestillinger.">
            🚗 Alenebil
          </button>
          <button class="nissy-manual-btn" data-script="auto-bestill" title="Åpner et verktøy som lar deg bestille opp alle turer på valgt filter">
            🤖 Auto-Bestill
          </button>
          <button class="nissy-manual-btn" data-script="sjekk-bestilling" title="Sjekk alle bestillinger på valgt filter for duplikater, forskjellig dato på hent og levering og andre feil som kan forårsake problemer">
            🔍 Sjekk-Bestilling
          </button>
          ${hasSjekkPlakatAccess() ? `
          <button class="nissy-manual-btn" data-script="sjekk-plakat" title="Finn alle røde plakater med fritekst på valgt filter, problematisk tekst vises først">
            🚩 Sjekk-Plakat
          </button>
          ` : ''}
          <button class="nissy-manual-btn" data-script="sjekk-telefon" title="Sjekk alle bestillinger på valgt filter for manglende/ugyldig telefonnummer">
            📞 Sjekk-Telefon
          </button>
          <button class="nissy-manual-btn" data-script="statistikk" title="Vis statistikk for bestillinger og turer på valgt filter">
            📊 Statistikk
          </button>
          <button class="nissy-manual-btn" data-script="trondertaxi-loyve" title="Åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes">
            🚖 Trøndertaxi-Løyve
          </button>
        </div>
      `;
      
      // Legg til cellen etter "Dynamiske plakater"
      bottomTable.appendChild(newCell);
      
      // Koble knapper til scripts
      document.querySelectorAll('.nissy-manual-btn').forEach(button => {
        const scriptName = button.getAttribute('data-script');
        
        button.onclick = async () => {
          const originalText = button.textContent;
          
          try {
            const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
            let scriptFile = '';
            
            // Map script navn til filnavn
            switch(scriptName) {
              case 'alenebil':
                scriptFile = 'Alenebil.js';
                break;
              case 'auto-bestill':
                scriptFile = 'Auto-Bestill.js';
                break;
              case 'sjekk-bestilling':
                scriptFile = 'Sjekk-bestilling.js';
                break;
              case 'sjekk-plakat':
                scriptFile = 'Sjekk-plakat.js';
                break;
              case 'sjekk-telefon':
                scriptFile = 'Sjekk-telefon.js';
                break;
              case 'statistikk':
                scriptFile = 'Statistikk.js';
                break;
              case 'trondertaxi-loyve':
                scriptFile = 'Trøndertaxi-løyve.js';
                break;
              default:
                throw new Error(`Ukjent script: ${scriptName}`);
            }
            
            // Last og kjør script
            const response = await fetch(BASE + scriptFile + `?t=${Date.now()}`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const code = await response.text();
            eval(code);
            
            // Ingen visuell feedback ved suksess
            
          } catch (err) {
            console.error(`❌ Feil ved lasting av ${scriptName}:`, err);
            
            // Visuell feedback - kun ved feil
            button.disabled = true;
            button.textContent = '❌ Feil';
            setTimeout(() => {
              button.textContent = originalText;
              button.disabled = false;
            }, 2000);
          }
        };
      });
      
      console.log("✅ Manuelle script-knapper installert");
    }

    // Installer knapper når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addManualButtons);
    } else {
      setTimeout(addManualButtons, 400);
    }
  })();

  /* ======================================================
     DEL 7: LUKK PLAKATER/POPUPS VED KLIKK UTENFOR
     ====================================================== */

  document.addEventListener('click', (e) => {
    // Finn åpne plakater/popups
    const reqPoster = document.getElementById('reqposter');
    const resPoster = document.getElementById('resposter');
    const showCost = document.getElementById('showcost');
    const showFilter = document.getElementById('showfilter');
    const showWait = document.getElementById('showwait');
    const showCapacity = document.getElementById('showcapacity');
    
    // Sjekk rekvisisjon-plakat
    if (reqPoster && reqPoster.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!reqPoster.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof hideRequisitionPoster === 'function') {
          hideRequisitionPoster();
        }
      }
    }

    // Sjekk kostnad/distanse-plakat
    if (showCost && showCost.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!showCost.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof closeTransportCost === 'function') {
          closeTransportCost();
        }
      }
    }

    // Sjekk filter-info plakat
    if (showFilter && showFilter.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!showFilter.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof closeFilterInfo === 'function') {
          closeFilterInfo();
        }
      }
    }

    // Sjekk venteliste-plakat
    if (showWait && showWait.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!showWait.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof closeRequisitionWait === 'function') {
          closeRequisitionWait();
        }
      }
    }

    // Sjekk kapasitet-redigering plakat
    if (showCapacity && showCapacity.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!showCapacity.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof hideEditCapacity === 'function') {
          hideEditCapacity();
        }
      }
    }

    // Sjekk ressurs-plakat
    if (resPoster && resPoster.style.display !== 'none') {
      // Sjekk om klikket var utenfor plakaten
      if (!resPoster.contains(e.target)) {
        // Kall eksisterende funksjon for å lukke
        if (typeof hideResource === 'function') {
          hideResource();
        }
      }
    }
  }, true);

  /* ======================================================
     DEL 7B: FORHINDRE AUTO-LUKKING VED MOUSEOUT
     Plakater forblir åpne til: klikk på kryss, klikk utenfor,
     eller hover over ny plakat (med delay)
     ====================================================== */

  (() => {
    let showReqDelayTimer = null;
    let pendingReqId = null;
    let pendingElement = null; // Lagre elementet vi holder over
    const POSTER_CHANGE_DELAY = 500;

    // Overstyr hideReqDynamic - ikke lukk plakat ved mouseout
    if (typeof window.hideReqDynamic === 'function') {
      window.hideReqDynamic = function() {
        // Clear NISSY sin show-timer
        if (RequisitionShow.reqTimerId != null) {
          clearTimeout(RequisitionShow.reqTimerId);
          RequisitionShow.reqTimerId = null;
        }
        RequisitionShow.reqTag = null;
        
        // IKKE cancel delay-timer - la den fullføre
        // IKKE lukk plakaten
      };
    }

    // Overstyr showReq for å legge til delay
    if (typeof window.showReq === 'function') {
      const originalShowReq = window.showReq;

      window.showReq = function(tag, reqId, posX) {
        const currentReqId = RequisitionShow.displayingRequisitionId;
        const reqPoster = document.getElementById('reqposter');
        const isPosterOpen = reqPoster && reqPoster.style.display !== 'none';

        // Hvis samme plakat som vises - cancel pending timer
        if (reqId === currentReqId && isPosterOpen) {
          if (showReqDelayTimer && pendingReqId !== reqId) {
            clearTimeout(showReqDelayTimer);
            showReqDelayTimer = null;
            pendingReqId = null;
            pendingElement = null;
          }
          return;
        }

        // Hvis samme pending - refresh timer
        if (reqId === pendingReqId && showReqDelayTimer) {
          clearTimeout(showReqDelayTimer);
          pendingElement = tag; // Oppdater element
          
          showReqDelayTimer = setTimeout(() => {
            // Sjekk om musen fortsatt er over elementet
            const rect = pendingElement ? pendingElement.getBoundingClientRect() : null;
            const mouseX = currentMouseX;
            const mouseY = currentMouseY;
            
            if (rect && mouseX >= rect.left && mouseX <= rect.right && 
                mouseY >= rect.top && mouseY <= rect.bottom) {
              RequisitionShow.reqTag = null;
              if (RequisitionShow.reqTimerId != null) {
                clearTimeout(RequisitionShow.reqTimerId);
                RequisitionShow.reqTimerId = null;
              }
              originalShowReq.call(this, tag, reqId, posX);
            }
            
            showReqDelayTimer = null;
            pendingReqId = null;
            pendingElement = null;
          }, POSTER_CHANGE_DELAY);
          return;
        }

        // Clear timer hvis ny plakat
        if (showReqDelayTimer && pendingReqId !== reqId) {
          clearTimeout(showReqDelayTimer);
          showReqDelayTimer = null;
          pendingReqId = null;
          pendingElement = null;
        }

        // Hvis plakat er åpen og ny plakat
        if (isPosterOpen && currentReqId !== null && currentReqId !== reqId) {
          pendingReqId = reqId;
          pendingElement = tag;
          
          showReqDelayTimer = setTimeout(() => {
            // Sjekk om musen fortsatt er over elementet
            const rect = pendingElement ? pendingElement.getBoundingClientRect() : null;
            const mouseX = currentMouseX;
            const mouseY = currentMouseY;
            
            if (rect && mouseX >= rect.left && mouseX <= rect.right && 
                mouseY >= rect.top && mouseY <= rect.bottom) {
              RequisitionShow.reqTag = null;
              if (RequisitionShow.reqTimerId != null) {
                clearTimeout(RequisitionShow.reqTimerId);
                RequisitionShow.reqTimerId = null;
              }
              originalShowReq.call(this, tag, reqId, posX);
            }
            
            showReqDelayTimer = null;
            pendingReqId = null;
            pendingElement = null;
          }, POSTER_CHANGE_DELAY);
        } else if (!isPosterOpen) {
          originalShowReq.call(this, tag, reqId, posX);
        }
      };
    }
  })();

  /* ======================================================
     DEL 8: BEGRENS TEKST I KOLONNER
     Finner dynamisk hvilke kolonner som skal begrenses
     Inkluderer: Ventende/Pågående oppdrag, Ressurser, Transportører/Avtaler
     Med retry-mekanisme for kolonner som lastes sent
     ====================================================== */

  (() => {
    let retryCount = 0;
    const MAX_RETRIES = 10; // Maks 10 forsøk
    const RETRY_INTERVAL = 5000; // 5 sekund mellom hvert forsøk

    function setupColumnLimits() {
      // Reset retry counter når manuelt kalt
      if (arguments[0] === 'manual') {
        retryCount = 0;
      }

      // Funksjon for å finne kolonneindeks basert på header-link
      function findColumnIndex(tableId, sortFunctionName, sortParameter) {
        const table = document.getElementById(tableId);
        if (!table) return -1;

        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
          const link = headers[i].querySelector(`a[href*="${sortFunctionName}('${sortParameter}')"]`);
          if (link) {
            return i + 1;
          }
        }
        return -1;
      }

      // Finn kolonneindekser for Ventende og Pågående oppdrag
      const ventende = {
        patientName: findColumnIndex('ventendeoppdrag', 'sortVentendeOppdragList', 'patientName'),
        address: findColumnIndex('ventendeoppdrag', 'sortVentendeOppdragList', 'tripFromAddress')
      };

      const paagaaende = {
        patientName: findColumnIndex('pagaendeoppdrag', 'sortPopp', 'patientName'),
        fromAddress: findColumnIndex('pagaendeoppdrag', 'sortPopp', 'tripFromAddress'),
        toAddress: findColumnIndex('pagaendeoppdrag', 'sortPopp', 'tripToAddress')
      };

      // FASTE kolonneindekser for Ressurser og Transportører/Avtaler (aldri endres)
      const ressurser = {
        permissionNr: 2 // Kolonne 2: "Ressurs"
      };

      const transportorer = {
        name: 2 // Kolonne 2: "Navn"
      };

      // Sjekk om vi fant alle kritiske kolonner (kun dynamiske)
      const allColumnsFound = 
        ventende.patientName > 0 &&
        ventende.address > 0 &&
        paagaaende.patientName > 0 &&
        paagaaende.fromAddress > 0 &&
        paagaaende.toAddress > 0;

      // Bygg CSS dynamisk basert på funne kolonner
      let cssRules = '';

      // === VENTENDE OPPDRAG ===
      if (ventende.patientName > 0) {
        cssRules += `
          #ventendeoppdrag tbody tr td:nth-child(${ventende.patientName}) {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `;
      }

      if (ventende.address > 0) {
        cssRules += `
          #ventendeoppdrag tbody tr td:nth-child(${ventende.address}) {
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `;
      }

      // === PÅGÅENDE OPPDRAG ===
      if (paagaaende.patientName > 0) {
        cssRules += `
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.patientName}) {
            max-width: 150px;
          }
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.patientName}),
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.patientName}) div.row-image {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `;
      }

      if (paagaaende.fromAddress > 0) {
        cssRules += `
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.fromAddress}) {
            max-width: 250px;
          }
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.fromAddress}),
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.fromAddress}) div.row-image {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `;
      }

      if (paagaaende.toAddress > 0) {
        cssRules += `
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.toAddress}) {
            max-width: 250px;
          }
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.toAddress}),
          #pagaendeoppdrag tbody tr td:nth-child(${paagaaende.toAddress}) div.row-image {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        `;
      }

      // === RESSURSER (FAST KOLONNE) ===
      cssRules += `
        #resurser tbody tr td:nth-child(${ressurser.permissionNr}) {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;

      // === TRANSPORTØRER/AVTALE (FAST KOLONNE) ===
      cssRules += `
        #transportorer tbody tr td:nth-child(${transportorer.name}) {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;

      // Legg til CSS
      const existingStyle = document.getElementById('nissy-column-limit-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'nissy-column-limit-styles';
      style.textContent = cssRules;
      document.head.appendChild(style);
      
      // Retry hvis ikke alle DYNAMISKE kolonner er funnet og vi har forsøk igjen
      if (!allColumnsFound && retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(setupColumnLimits, RETRY_INTERVAL);
      }
    }

    // Gjør setupColumnLimits tilgjengelig globalt for re-apply
    window.__reapplyColumnLimits = function() {
      setupColumnLimits('manual');
    };

    // Kjør når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(setupColumnLimits, 500);
      });
    } else {
      setTimeout(setupColumnLimits, 500);
    }
  })();
  console.log("✅ NISSY-fiks-script lastet");
})();