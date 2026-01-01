(() => {
  // ============================================================
  // AVBESTILLING AV TURER SCRIPT (ALT+K)
  // Avbestiller merkede ressurser eller alle med status "Tildelt"
  // ============================================================

  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__avbestillingHotkeyInstalled) {
    console.log("✅ Avbestilling-script er allerede aktiv");
    return;
  }
  window.__avbestillingHotkeyInstalled = true;

  console.log("🚀 Starter Avbestilling-script");

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

    // ============================================================
    // HJELPEFUNKSJON: Finn alle ressurser med status "Tildelt"
    // ============================================================
    function extractAssigned() {
      const tildeltRows = Array.from(document.querySelectorAll("td[id*='Rxxxstatusxxx']"))
        .filter(td => td.textContent.trim() === "Tildelt")
        .map(td => td.closest("tr"))
        .map(parseRow)
        .filter(Boolean);
      
      // Fjern duplikater basert på rid
      return Array.from(new Map(tildeltRows.map(item => [item.rid, item])).values());
    }

    const selectedItems = extractSelected();
    const assignedItems = extractAssigned();

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
      max-height:220px;
      overflow:auto;
      border:1px solid #ddd;
      padding:10px;
      border-radius:6px;
      background:#fafafa;
    `;

    const listSelected = selectedItems
      .map(item => `• Ressurs: ${item.avtale}`)
      .join("\n");
    
    const listAssigned = assignedItems
      .map(item => `• Ressurs: ${item.avtale}`)
      .join("\n");

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        Avbestilling av turer
      </h2>
      
      <p style="margin:8px 0; font-weight:600; color:#555;">
        Valgte (markerte): ${selectedItems.length}
      </p>
      
      <pre style="${listBoxStyle}">
${listSelected || "Ingen"}
      </pre>
      
      <button 
        id="startSelected" 
        style="
          margin:12px 0 24px;
          padding:10px 20px;
          background:#e74c3c;
          color:#fff;
          border:none;
          border-radius:6px;
          font-size:14px;
          cursor:pointer;
          font-weight:600;
        "
      >
        Avbestill valgte
      </button>
      
      <p style="margin:8px 0; font-weight:600; color:#555;">
        Status = Tildelt: ${assignedItems.length}
      </p>
      
      <pre style="${listBoxStyle}">
${listAssigned || "Ingen"}
      </pre>
      
      <button 
        id="startAssigned" 
        style="
          margin:12px 0 24px;
          padding:10px 20px;
          background:#e67e22;
          color:#fff;
          border:none;
          border-radius:6px;
          font-size:14px;
          cursor:pointer;
          font-weight:600;
        "
      >
        Avbestill tildelte
      </button>
      
      <div 
        id="removeStatus" 
        style="
          margin:16px 0;
          padding:12px;
          background:#ecf0f1;
          border-radius:6px;
          font-size:13px;
          color:#555;
          min-height:24px;
        "
      >
      </div>
      
      <button 
        id="closeRemove" 
        style="
          padding:8px 24px;
          background:#95a5a6;
          color:#fff;
          border:none;
          border-radius:6px;
          font-size:13px;
          cursor:pointer;
        "
      >
        Lukk
      </button>
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
    async function removeItems(items, button) {
      if (items.length === 0) {
        statusBox.textContent = "Ingen turer å avbestille.";
        return;
      }

      // Deaktiver knapp mens prosessering pågår
      button.disabled = true;
      button.style.opacity = "0.6";
      button.style.cursor = "not-allowed";

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

      statusBox.textContent = "Ferdig! Alle avbestillinger er sendt.";
      
      // Refresh data
      if (typeof openPopp === "function") {
        openPopp('-1');
      }
    }

    // ============================================================
    // LUKK POPUP FUNKSJON
    // ============================================================
    function closePopup() {
      popup.remove();
      overlay.remove();
      
      // Refresh data
      if (typeof openPopp === "function") {
        openPopp('-1');
      }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    const btnSelected = popup.querySelector("#startSelected");
    const btnAssigned = popup.querySelector("#startAssigned");

    btnSelected.onclick = () => removeItems(selectedItems, btnSelected);
    btnAssigned.onclick = () => removeItems(assignedItems, btnAssigned);
    popup.querySelector("#closeRemove").onclick = closePopup;

    // Lukk ved klikk utenfor popup
    overlay.onclick = closePopup;

    // Lukk med ESC-tast
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }
  
  // ============================================================
  // SNARVEI-OVERSIKT
  // ============================================================
  console.log("⌨️  Avbestilling snarveier:");
  console.log("   ALT+K → Åpner pop-up for masseavbestilling av merkede turer)");
  console.log("✅ Avbestilling-script lastet");
  
})();
