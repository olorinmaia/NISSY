(() => { 

  /* ======================================================
     GUARD – FORHINDRER DOBBEL INSTALLASJON
     ====================================================== */
  if (window.__nissyMasterScriptInstalled) {
    console.log("✅ NISSY master-script er allerede aktiv");
    return;
  }
  window.__nissyMasterScriptInstalled = true;

  console.log("🚀 Starter NISSY master-script");

  /* ======================================================
     DEL 0: TASTATUR-HÅNDTERING
     - Enter i søkefelt → Søk
     - ESC → Nullstill søk + fokus søkefelt (kun hvis verdi)
     - ALT+F → Fokus søkefelt
     - F5 → openPopp('-1') - "Åpne alle" refresher all data og åpner alle turer
     - Ctrl+R / Cmd+R → blokkert
     - CTRL+1 → Fokus til filter ventende oppdrag
     - CTRL+2 → Fokus til filter ressurser
     - ALT+W → Vis i kart
     - ALT+G → Tildel oppdrag
     - ALT+B → Blank
     - ALT+P → Merk alle ressurser pågående oppdrag
     - ALT+V → Merk alle bestillinger ventende oppdrag
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
        searchInput.select(); // marker eksisterende tekst
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
  
        // Sett fokus tilbake til søkefeltet etter nullstilling
        setTimeout(() => {
          searchInput.focus();
          searchInput.select();
        }, 0);
  
        return;
      }
    }
  
    /* ---------- ALT + W : Vis i kart ---------- */
    if (e.altKey && e.key.toLowerCase() === "w") {
      const btn = document.getElementById("buttonShowMap");
      if (!btn || btn.disabled) return;
      btn.click();
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
        console.log("✅ Kolonne-endringer ferdig");
        return;
      }

      const url = base + list.shift();
      console.log("📊 Kolonne:", url);

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

    // Identify request type based on URL pattern
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

      if (this._requestType) {
        console.log("📤 XHR [" + this._requestType + "]:", url);
      }
    }

    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._requestType) {
      const requestType = this._requestType;

      this.addEventListener("load", () => {
        console.log("📡 XHR ferdig [" + requestType + "]");

        const waiter = activeWaiters[requestType];
        if (waiter) {
          console.log("✅ Kjører callback for [" + requestType + "]");
          clearTimeout(waiter.timeout);
          activeWaiters[requestType] = null;
          waiter.callback();
        }
      });
    }
    return originalSend.apply(this, args);
  };

  function waitForAjaxThen(type, callback) {
    console.log("➕ Venter på [" + type + "] XHR");

    activeWaiters[type] = {
      callback: callback,
      timeout: setTimeout(() => {
        console.log("⏱️ Timeout [" + type + "]");
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
      console.log("🧹 Klikker Blank-knappen");
      btn.click();
    }
  }

  function onSelectChange(e) {
    const select = e.target;
    if (!SELECT_NAMES.includes(select.name)) return;

    console.log("🔽 Filter endret:", select.name);

    clickClearButton();

    waitForAjaxThen('filter', () => {
      console.log("📬 Filter ferdig → åpner Popp");
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
      console.log("🔍 Søk");
      waitForAjaxThen('search', () => {
        console.log("📬 Søk ferdig → åpner Popp");
        openPopp("-1");
      });
    });
  }

  const btnCancel = document.getElementById("buttonCancelSearch");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      console.log("🔄 Nullstill");
      waitForAjaxThen('cancel', () => {
        console.log("📬 Nullstill ferdig → åpner Popp");
        openPopp("-1");
      });
    });
  }

  function onAssignClick() {
    console.log("🚚 Tildel/Tilordne oppdrag");

    waitForAjaxThen('assign', () => {
      console.log("📬 Tildel/Tilordning ferdig → sjekker rader");

      setTimeout(() => {
        const selectedRows = document.querySelectorAll(
          'tr[style*="background-color: rgb(148, 169, 220)"]'
        );

        if (selectedRows.length > 0) {
          console.log("⚠️ " + selectedRows.length + " markerte rader → hopper over openPopp");
        } else {
          console.log("✅ Ingen markerte rader → åpner Popp");
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

})();
