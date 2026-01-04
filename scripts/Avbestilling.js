(() => {
  // ============================================================
  // AVBESTILLING AV TURER SCRIPT (ALT+K)
  // Avbestiller kun merkede ressurser (krever aktiv merking)
  // ============================================================

  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__avbestillingHotkeyInstalled) {
    console.log("✅ Avbestilling-script er allerede aktiv");
    return;
  }
  window.__avbestillingHotkeyInstalled = true;

  console.log("🚀 Starter Avbestilling-script");

  // ============================================================
  // KONFIGURASJON: Minimum antall siffer etter siste "-"
  // For å unngå at turer etter 3003 men før 4010-1701 avbestilles
  // ============================================================
  const MIN_DIGITS_AFTER_DASH = 5;

  // ============================================================
  // HOTKEY REGISTRERING: ALT+K
  // ============================================================
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      initializeAvbestilling();
    }
  });

  // ============================================================
  // HJELPEFUNKSJON: Valider ressursnavn
  // ============================================================
  function isValidResourceName(name) {
    if (!name) return false;
    
    // Finn siste "-" i navnet
    const lastDashIndex = name.lastIndexOf("-");
    if (lastDashIndex === -1) return false; // Ingen "-" funnet
    
    // Hent tekst etter siste "-"
    const afterDash = name.substring(lastDashIndex + 1);
    
    // Sjekk om det er kun siffer og minst MIN_DIGITS_AFTER_DASH siffer
    const digitsOnly = afterDash.match(/^\d+$/);
    if (!digitsOnly) return false;
    
    return afterDash.length >= MIN_DIGITS_AFTER_DASH;
  }

  // ============================================================
  // HOVEDFUNKSJON: Initialiserer avbestilling når ALT+K trykkes
  // ============================================================
  function initializeAvbestilling() {
    const highlightColor = "rgb(148, 169, 220)";
    const baseUrl = "/planlegging/ajax-dispatch?did=all&action=remove&rid=";

    // ============================================================
    // HJELPEFUNKSJON: Parse rad og hent data
    // ============================================================
    function parseRow(row) {
      // Ignorer ventende oppdrag (V-)
      if (row.id?.startsWith("V-")) return null;
      if (row.querySelector("img[onclick*='removeVentendeOppdrag']")) return null;
      
      // Ignorer pågående oppdrag (P-)
      if (row.id?.startsWith("P-")) return null;
      if (row.querySelector("img[onclick*='removePaagaaendeOppdrag']")) return null;

      // Hent ressurs-ID (rid)
      let rid = row.getAttribute("name") || 
                row.id?.match(/(\d{5,})/)?.[1] || 
                row.querySelector("img[onclick*='removeResurs']")
                  ?.getAttribute("onclick")
                  ?.match(/removeResurs\('(\d+)'/)?.[1];
      
      if (!rid) return null;

      // Hent turnummer
      let turnummer = row.querySelector("img[onclick*='searchStatus']")
        ?.getAttribute("onclick")
        ?.match(/id=(\d+)/)?.[1];
      
      // Hent avtale-navn
      let avtale = row.querySelector("td[id*='Rxxxloyve']")
        ?.textContent.trim() ?? "(ukjent)";
      
      // ============================================================
      // VALIDERING: Sjekk om ressursnavnet er gyldig
      // ============================================================
      if (!isValidResourceName(avtale)) {
        console.log(`⚠️  Ignorerer ressurs med ugyldig navn: ${avtale}`);
        return null;
      }
      
      // Hent status
      let status = row.querySelector("td[id*='Rxxxstatusxxx']")
        ?.textContent.trim() ?? "";

      return { rid, turnummer, avtale, status, row };
    }

    // ============================================================
    // HJELPEFUNKSJON: Finn merkede (highlightede) ressurser
    // ============================================================
    function extractSelected() {
      return Array.from(document.querySelectorAll("tr"))
        .filter(row => {
          const rowBg = row.style.backgroundColor.replace(/\s+/g, '');
          return rowBg === highlightColor.replace(/\s+/g, '');
        })
        .map(parseRow)
        .filter(Boolean) // Fjern null-verdier
        .filter(item => !["Framme", "Startet", "Bomtur"].includes(item.status));
    }

    const selectedItems = extractSelected();

    // ============================================================
    // FEILHÅNDTERING: Ingen merkede turer
    // ============================================================
    if (selectedItems.length === 0) {
      showErrorPopup("Ingen turer er merket");
      return;
    }

    // ============================================================
    // OPPRETT POPUP OVERLAY
    // ============================================================
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "999998",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "transparent"
    });
    document.body.appendChild(overlay);

    // ============================================================
    // OPPRETT POPUP
    // ============================================================
    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position: "fixed",
      zIndex: "999999",
      background: "#ffffff",
      padding: "20px 24px",
      borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
      fontFamily: "Segoe UI, Arial, sans-serif",
      textAlign: "center",
      maxWidth: "650px",
      maxHeight: "80vh",
      overflow: "auto"
    });

    // Posisjonér popup mot col2
    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      popup.style.top = `${rect.top}px`;
      popup.style.right = `${window.innerWidth - rect.left + 5}px`;
      popup.style.left = "auto";
      popup.style.transform = "none";
    } else {
      // Fallback hvis col2 ikke finnes
      popup.style.top = "50%";
      popup.style.left = "33%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    // ============================================================
    // POPUP INNHOLD
    // ============================================================
    const listBoxStyle = `
      text-align:left;
      font-size:13px;
      max-height:300px;
      overflow:auto;
      border:1px solid #ddd;
      padding:10px;
      border-radius:6px;
      background:#fafafa;
      margin-bottom:20px;
    `;

    const listSelected = selectedItems
      .map(item => `• Ressurs: ${item.avtale}`)
      .join("\n");

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ⚠️ Avbestill merkede turer
      </h2>
      
      <p style="margin:8px 0 4px; font-weight:600; color:#555; font-size:15px;">
        Du er i ferd med å avbestille ${selectedItems.length} ${selectedItems.length === 1 ? 'tur' : 'turer'}:
      </p>
      
      <pre style="${listBoxStyle}">
${listSelected}
      </pre>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:20px;">
        <p style="margin:0; font-size:13px; color:#856404;">
          <strong>⚠️ OBS:</strong> Denne handlingen kan ikke angres!
        </p>
      </div>
      
      <div style="display:flex; gap:10px; justify-content:center;">
        <button 
          id="confirmRemove" 
          style="
            padding:10px 24px;
            background:#e74c3c;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          Ja, avbestill
        </button>
        
        <button 
          id="cancelRemove" 
          style="
            padding:10px 24px;
            background:#95a5a6;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          Avbryt
        </button>
      </div>
      
      <div 
        id="removeStatus" 
        style="
          margin:16px 0 0;
          padding:12px;
          background:#ecf0f1;
          border-radius:6px;
          font-size:13px;
          color:#555;
          min-height:24px;
          display:none;
        "
      >
      </div>
    `;

    document.body.appendChild(popup);
    const statusBox = popup.querySelector("#removeStatus");

    // ============================================================
    // XHR FUNKSJON: Send avbestilling til server
    // ============================================================
    function sendXHR(url, callback) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.withCredentials = true;

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          callback(); // Ferdig uansett status
        }
      };

      xhr.onerror = function () {
        console.error("XHR-feil på:", url);
        callback();
      };

      xhr.send();
    }

    // ============================================================
    // AVBESTILLINGSFUNKSJON: Sender parallelle XHR requests
    // ============================================================
    async function removeItems(items) {
      // Vis statusboks
      statusBox.style.display = "block";
      
      // Skjul knapper
      popup.querySelector("#confirmRemove").style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";

      let completed = 0;
      statusBox.textContent = `Sender 0 av ${items.length} avbestillinger...`;

      // Send alle requests parallelt
      await Promise.all(items.map(item =>
        new Promise(resolve => {
          sendXHR(baseUrl + encodeURIComponent(item.rid), () => {
            completed++;
            statusBox.textContent = `Sender ${completed} av ${items.length} avbestillinger...`;
            resolve();
          });
        })
      ));

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Alle avbestillinger er sendt.";
      
      // Refresh data
      if (typeof openPopp === "function") {
        openPopp('-1');
      }

      // Auto-lukk etter 3 sekunder
      setTimeout(() => {
        closePopup();
      }, 3000);
    }

    // ============================================================
    // LUKK POPUP FUNKSJON
    // ============================================================
    function closePopup() {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      // Fjern ESC-listener
      document.removeEventListener('keydown', escapeHandler);

      if (typeof openPopp === 'function') {
        openPopp('-1');
      }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    popup.querySelector("#confirmRemove").onclick = () => removeItems(selectedItems);
    popup.querySelector("#cancelRemove").onclick = closePopup;

    // Lukk ved klikk utenfor popup
    overlay.onclick = closePopup;

    // Lukk med ESC-tast
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        closePopup();
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // HJELPEFUNKSJON: Vis feilmelding
  // ============================================================
  function showErrorPopup(message) {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "999998",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "transparent"
    });
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position: "fixed",
      zIndex: "999999",
      background: "#ffffff",
      padding: "24px 28px",
      borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
      fontFamily: "Segoe UI, Arial, sans-serif",
      textAlign: "center",
      maxWidth: "450px"
    });

    // Posisjonér popup mot col2
    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      popup.style.top = `${rect.top}px`;
      popup.style.right = `${window.innerWidth - rect.left + 5}px`;
      popup.style.left = "auto";
      popup.style.transform = "none";
    } else {
      popup.style.top = "50%";
      popup.style.left = "33%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    popup.innerHTML = `
      <div style="
        background:#f8d7da;
        border:1px solid #f5c6cb;
        padding:16px;
        border-radius:6px;
        margin-bottom:20px;
      ">
        <h3 style="margin:0 0 8px; font-size:18px; color:#721c24;">
          ⚠️ Feil
        </h3>
        <p style="margin:0; font-size:14px; color:#721c24;">
          ${message}
        </p>
      </div>
      
      <p style="margin:0 0 20px; font-size:13px; color:#555;">
        Vennligst merk turene du ønsker å avbestille og prøv igjen.
      </p>
      
      <button 
        id="closeError" 
        style="
          padding:10px 24px;
          background:#95a5a6;
          color:#fff;
          border:none;
          border-radius:6px;
          font-size:14px;
          cursor:pointer;
          font-weight:600;
        "
      >
        OK
      </button>
    `;

    document.body.appendChild(popup);

    function closeErrorPopup() {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.removeEventListener('keydown', errorEscHandler);
    }

    popup.querySelector("#closeError").onclick = closeErrorPopup;
    overlay.onclick = closeErrorPopup;

    const errorEscHandler = (e) => {
      if (e.key === "Escape") {
        closeErrorPopup();
      }
    };
    document.addEventListener("keydown", errorEscHandler);

    // Auto-lukk etter 4 sekunder
    setTimeout(closeErrorPopup, 4000);
  }
  
  // ============================================================
  // SNARVEI-OVERSIKT
  // ============================================================
  console.log("⌨️  Avbestilling snarveier");
  console.log("   ALT+K → Avbestill merkede turer");
  //console.log(`   Validering: Ressursnavn må slutte med minst ${MIN_DIGITS_AFTER_DASH} siffer etter siste "-"`);
  console.log("✅ Avbestilling-script lastet");
  
})();