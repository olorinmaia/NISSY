(() => {
  // ============================================================
  // STATISTIKK OVER BESTILLINGER / TURER 
  // Beregner antall bestillinger og samkjøringsgrad basert på 
  // valgt filter. Teller ventende/pågående oppdrag.
  // ============================================================
  
  // --- SPERRE MOT DUPLIKAT KJØRING ---
  if (window.__statistikkActive) {
    console.warn("⚠️ Statistikk er allerede aktiv - ignorerer ny forespørsel");
    return;
  }
  window.__statistikkActive = true;

  // --- VISUELL VENTER OVERLAY ---
  function visVenterOverlay() {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(2px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999999,
    });

    // Spinner
    const spinner = document.createElement("div");
    Object.assign(spinner.style, {
      width: "50px",
      height: "50px",
      border: "6px solid #ddd",
      borderTop: "6px solid #007ACC",
      borderRadius: "50%",
      animation: "spinner 0.8s linear infinite",
      marginBottom: "20px",
    });

    const styleTag = document.createElement("style");
    styleTag.textContent = `
      @keyframes spinner {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleTag);

    // Tekst
    const tekst = document.createElement("div");
    tekst.textContent = "Teller bestillinger og turer… Trykk ESC for å avbryte";
    Object.assign(tekst.style, {
      color: "white",
      fontSize: "20px",
      fontWeight: "600",
      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    });

    overlay.appendChild(spinner);
    overlay.appendChild(tekst);
    document.body.appendChild(overlay);

    // ESC for å avbryte spinner-overlay
    function escClose(e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escClose);
        // Frigjør sperre hvis bruker avbryter
        window.__statistikkActive = false;
      }
    }
    document.addEventListener("keydown", escClose);

    return () => {
      overlay.remove();
      document.removeEventListener("keydown", escClose);
    };
  }

  // --- VENTER PÅ AJAX-KALLET FRA openPopp('-1') ---
  function ventPåOpenPopp() {
    return new Promise(resolve => {

      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._isOpenPopp = url.includes("action=openres") && url.includes("rid=-1");
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        if (this._isOpenPopp) {
          this.addEventListener("load", () => {
            resolve(); // openPopp AJAX ferdig
          });
        }
        return originalSend.apply(this, args);
      };

    });
  }

  // --- STATISTIKKFUNKSJONEN (DIN ORIGINALE KODE) ---
  function lagStatistikk() {

    const ventendeBestillinger = Array.from(document.querySelectorAll('tr[id^="V-"]'));
    const antallVentende = ventendeBestillinger.length;
    const antallBestillingerVentende = antallVentende;

    const paagaaendeTurer = Array.from(document.querySelectorAll('tr[id^="P-"]'));
    const antallPaagaaende = paagaaendeTurer.length;

    let antallBestillingerPaagaaende = 0;
    paagaaendeTurer.forEach(tr => {
      const bestillinger = tr.querySelectorAll('img[id^="popp_"]');
      antallBestillingerPaagaaende += bestillinger.length;
    });

    const totaltBestillinger = antallBestillingerVentende + antallBestillingerPaagaaende;

    const samkjoeringsgrad = antallPaagaaende > 0
      ? (antallBestillingerPaagaaende / antallPaagaaende).toFixed(2)
      : "N/A";

    const ventendeFilterSelect = document.querySelector("select.filter[name='filter-ventende-oppdrag']");
    const ventendeFilterText = ventendeFilterSelect ? ventendeFilterSelect.selectedOptions[0].text.trim() : "Ingen filter";

    const paagaaendeFilterSelect = document.querySelector("select.filter[name='filter-resurser']");
    const paagaaendeFilterText = paagaaendeFilterSelect ? paagaaendeFilterSelect.selectedOptions[0].text.trim() : "Ingen filter";

    // === OPPRETT OVERLAY ===
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.3)",
      zIndex: 999999,
    });

    // === POPUP ===
    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position: "absolute",
      top: "15%",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#fff",
      borderRadius: "10px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
      padding: "25px 35px",
      zIndex: 1000000,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: "#222",
      width: "380px",
      maxWidth: "90%",
      textAlign: "center",
    });
    popup.addEventListener("click", e => e.stopPropagation());

    const heading = document.createElement("h2");
    heading.textContent = "Statistikk";
    heading.style.marginBottom = "5px";
    heading.style.color = "#007ACC";
    popup.appendChild(heading);

    const helpText = document.createElement("p");
    helpText.innerHTML = `
      (Synlig i valgte filter)<br>
      Ventende oppdrag: <strong>${ventendeFilterText}</strong><br>
      Pågående oppdrag: <strong>${paagaaendeFilterText}</strong>
    `;
    helpText.style.marginTop = "0";
    helpText.style.marginBottom = "20px";
    helpText.style.fontSize = "0.85em";
    helpText.style.color = "#666";
    popup.appendChild(helpText);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginBottom = "20px";

    const lagRad = (label, verdi) => {
      const tr = document.createElement("tr");

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;
      tdLabel.style.padding = "8px 5px";
      tdLabel.style.textAlign = "left";
      tdLabel.style.fontWeight = "600";
      tdLabel.style.borderBottom = "1px solid #ddd";

      const tdVerdi = document.createElement("td");
      tdVerdi.textContent = verdi;
      tdVerdi.style.padding = "8px 5px";
      tdVerdi.style.textAlign = "right";
      tdVerdi.style.fontWeight = "700";
      tdVerdi.style.borderBottom = "1px solid #ddd";
      tdVerdi.style.color = "#007ACC";

      tr.appendChild(tdLabel);
      tr.appendChild(tdVerdi);
      return tr;
    };

    table.appendChild(lagRad("Bestillinger totalt", totaltBestillinger));
    table.appendChild(lagRad("Bestillinger (Ventende oppdrag)", antallBestillingerVentende));
    table.appendChild(lagRad("Bestillinger (Pågående oppdrag)", antallBestillingerPaagaaende));
    table.appendChild(lagRad("Antall turer", antallPaagaaende));
    table.appendChild(lagRad("Samkjøringsgrad (bestillinger per tur)", samkjoeringsgrad));

    popup.appendChild(table);

    const lukkBtn = document.createElement("button");
    lukkBtn.textContent = "Lukk";
    Object.assign(lukkBtn.style, {
      padding: "10px 25px",
      fontSize: "16px",
      cursor: "pointer",
      borderRadius: "6px",
      border: "none",
      backgroundColor: "#007ACC",
      color: "white",
      fontWeight: "600",
      transition: "background-color 0.3s ease",
    });
    lukkBtn.onmouseenter = () => lukkBtn.style.backgroundColor = "#005f99";
    lukkBtn.onmouseleave = () => lukkBtn.style.backgroundColor = "#007ACC";

    // ESC for å lukke popup + overlay
    function escClosePopup(e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escClosePopup);
        // Frigjør sperre når popup lukkes
        window.__statistikkActive = false;
      }
    }
    document.addEventListener("keydown", escClosePopup);

    lukkBtn.onclick = () => {
      overlay.remove();
      document.removeEventListener("keydown", escClosePopup);
      // Frigjør sperre når popup lukkes
      window.__statistikkActive = false;
    };

    popup.appendChild(lukkBtn);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
  }

  // --- HOVEDFLYT ---
  (async () => {
    let fjernVenter = null;
    let overlayTimer = null;
    let ajaxFerdig = false;

    if (typeof openPopp === "function") {

      // Start AJAX-venting
      const vent = ventPåOpenPopp();

      // Start en timeout som først viser overlay etter 150 ms
      overlayTimer = setTimeout(() => {
        if (!ajaxFerdig) {
          fjernVenter = visVenterOverlay();
        }
      }, 150);

      openPopp('-1');  // Starter AJAX

      await vent;      // Venter til AJAX ferdig
      ajaxFerdig = true;

      // Hvis overlay ikke er vist enda – ikke vis den
      clearTimeout(overlayTimer);

      // Hvis overlay faktisk ble vist – fjern den
      if (fjernVenter) fjernVenter();
    }

    lagStatistikk();
  })();

})();
