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
      const btn = document.getElementById("buttonClearSelection");
      if (!btn || btn.disabled) return;
      btn.click();
      return;
    }
  
    /* ---------- ALT + P : Merk alle ressurser pågående oppdrag ---------- */
    if (e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      const b = document.getElementById("buttonClearSelection");
      if (b) b.click();
  
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
      const b = document.getElementById("buttonClearSelection");
      if (b) b.click();
  
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
     DEL 2: UNIVERSAL XHR-LYTTER (PERSISTENT)
     ====================================================== */

  let activeWaiters = {
    filter: null,
    cancel: null,
    search: null,
    assign: null
  };

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
     DEL 3: FILTER-HÅNDTERING
     ====================================================== */

  const SELECT_NAMES = [
    "filter-resurser",
    "filter-ventende-oppdrag"
  ];

  function clickClearButton() {
    const btn = document.getElementById("buttonClearSelection");
    if (btn) {
      btn.click();
    }
  }

  function onSelectChange(e) {
    const select = e.target;
    if (!SELECT_NAMES.includes(select.name)) return;

    clickClearButton();

    waitForAjaxThen('filter', () => {
      openPopp("-1");
    });
  }

  document.addEventListener("change", onSelectChange, true);

  /* ======================================================
     DEL 4: KNAPP-HÅNDTERING
     ====================================================== */

  const btnSearch = document.getElementById("buttonSearch");
  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      waitForAjaxThen('search', () => {
        openPopp("-1");
      });
    });
  }

  const btnCancel = document.getElementById("buttonCancelSearch");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      waitForAjaxThen('cancel', () => {
        openPopp("-1");
      });
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
      }, 1500);
    });
  }

  [
    "buttonAssignVopps",
    "buttonAssignVoppsAssistConfirm"
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", onAssignClick);
    }
  });

    /* ======================================================
     DEL 5: LEGG TIL MANUELLE SCRIPT-KNAPPER (NEDERST)
     ====================================================== */

  (() => {
    console.log("🔧 Legger til manuelle script-knapper...");

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
            margin-right: 4px;
          }
          .nissy-manual-btn:hover {
            background: linear-gradient(135deg, #5a8bc4 0%, #4279b8 100%);
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
          <button class="nissy-manual-btn" data-script="auto-bestill" title="Bestiller opp alle turer på valgt filter automatisk">
            🤖 Auto-Bestill
          </button>
          <button class="nissy-manual-btn" data-script="sjekk-duplikat" title="Sjekk alle bestillinger på valgt filter for duplikater">
            🔍 Sjekk-Duplikat
          </button>
          <button class="nissy-manual-btn" data-script="sjekk-telefon" title="Sjekk alle bestillinger på valgt filter for manglende/ugyldig telefonnummer">
            📞 Sjekk-Telefon
          </button>
          <button class="nissy-manual-btn" data-script="statistikk" title="Vis statistikk for bestillinger og turer på valgt filter">
            📊 Statistikk
          </button>
          <button class="nissy-manual-btn" data-script="trondertaxi-loyve" title="Åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes">
            🚕 Trøndertaxi-Løyve
          </button>
        </div>
      `;
      
      // Legg til cellen etter "Dynamiske plakater"
      bottomTable.appendChild(newCell);
      
      // Koble knapper til scripts
      document.querySelectorAll('.nissy-manual-btn').forEach(button => {
        const scriptName = button.getAttribute('data-script');
        
        button.onclick = async () => {
          console.log(`🚀 Kjører ${scriptName}`);
          
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
              case 'sjekk-duplikat':
                scriptFile = 'Sjekk-duplikat.js';
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
      
      console.log("✅ Manuelle script-knapper installert (6 scripts)");
    }

    // Installer knapper når DOM er klar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addManualButtons);
    } else {
      setTimeout(addManualButtons, 400);
    }
  })();

  console.log("✅ NISSY-fiks-script lastet");
})();