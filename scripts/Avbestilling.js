(() => {
  // ============================================================
  // AVBESTILLING AV TURER OG BESTILLINGER SCRIPT (ALT+K)
  // Avbestiller merkede ressurser eller uplanlagte bestillinger
  // ============================================================

  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__avbestillingHotkeyInstalled) {
    console.log("✅ Avbestilling-script er allerede aktiv");
    return;
  }
  window.__avbestillingHotkeyInstalled = true;

  console.log("🚀 Starter Avbestilling-script");

  // ============================================================
  // KONFIGURASJON
  // ============================================================
  const MIN_DIGITS_AFTER_DASH = 5;
  
  // Miljø-baserte "Ansvarlig"-koder
  const RESPONSIBILITY_CODES = {
    test: {
      'Behandler': '285',
      'Foreldrerepresentasjon': '315',
      'Fullmektig': '313',
      'Hjemmesykepleie': '287',
      'Institusjon': '301',
      'Omsorgssenter': '288',
      'Pasient': '282',
      'Pasientreisekontor': '312',
      'Pårørende': '283',
      'Rekvirent': '284',
      'Skole / Barnehage': '300',
      'Transportør': '286',
      'Vergemål': '314'
    },
    prod: {
      'Behandler': '191',
      'Foreldrerepresentasjon': '224',
      'Fullmektig': '222',
      'Hjemmesykepleie': '193',
      'Institusjon': '200',
      'Omsorgssenter': '194',
      'Pasient': '188',
      'Pasientreisekontor': '197',
      'Pårørende': '189',
      'Rekvirent': '190',
      'Skole / Barnehage': '199',
      'Transportør': '192',
      'Vergemål': '223'
    }
  };

  // Detekter miljø basert på URL
  const isTestEnvironment = window.location.hostname.includes('test');
  const currentCodes = isTestEnvironment ? RESPONSIBILITY_CODES.test : RESPONSIBILITY_CODES.prod;

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
    
    const lastDashIndex = name.lastIndexOf("-");
    if (lastDashIndex === -1) return false;
    
    const afterDash = name.substring(lastDashIndex + 1);
    const digitsOnly = afterDash.match(/^\d+$/);
    if (!digitsOnly) return false;
    
    return afterDash.length >= MIN_DIGITS_AFTER_DASH;
  }

  // ============================================================
  // HOVEDFUNKSJON: Initialiserer avbestilling når ALT+K trykkes
  // ============================================================
  function initializeAvbestilling() {
    const highlightColor = "rgb(148, 169, 220)";
    const baseUrlTur = "/planlegging/ajax-dispatch?did=all&action=remove&rid=";
    const baseUrlBestilling = "/planlegging/ajax-dispatch?did=all&action=remove&vid=";

    // ============================================================
    // HJELPEFUNKSJON: Parse tur-rad (pågående oppdrag)
    // ============================================================
    function parseTurRow(row) {
      // Ignorer ventende oppdrag (V-)
      if (row.id?.startsWith("V-")) return null;
      if (row.querySelector("img[onclick*='removeVentendeOppdrag']")) return null;
      
      // Ignorer pågående oppdrag-prefix (P-) - vi vil ha de med RID
      if (row.id?.startsWith("P-")) return null;
      if (row.querySelector("img[onclick*='removePaagaaendeOppdrag']")) return null;

      // Hent ressurs-ID (rid)
      let rid = row.getAttribute("name") || 
                row.id?.match(/(\d{5,})/)?.[1] || 
                row.querySelector("img[onclick*='removeResurs']")
                  ?.getAttribute("onclick")
                  ?.match(/removeResurs\('(\d+)'/)?.[1];
      
      if (!rid) return null;

      // Hent avtale-navn
      let avtale = row.querySelector("td[id*='Rxxxloyve']")
        ?.textContent.trim() ?? "(ukjent)";
      
      // Validering
      if (!isValidResourceName(avtale)) {
        console.log(`⚠️  Ignorerer ressurs med ugyldig navn: ${avtale}`);
        return null;
      }
      
      // Hent status
      let status = row.querySelector("td[id*='Rxxxstatusxxx']")
        ?.textContent.trim() ?? "";

      return { type: 'tur', rid, avtale, status, row };
    }

    // ============================================================
    // HJELPEFUNKSJON: Parse bestilling-rad (ventende oppdrag)
    // ============================================================
    function parseBestillingRow(row) {
      // Kun ventende oppdrag (V-)
      if (!row.id?.startsWith("V-")) return null;

      // Hent bestillings-ID (vid)
      let vid = row.getAttribute("name") || 
                row.id?.match(/V-(\d+)/)?.[1];
      
      if (!vid) return null;

      // Hent rekvisisjonsnummer fra title-attributt
      let rekvNr = row.getAttribute("title") || "";

      // Hent pasientnavn
      let pasient = Array.from(row.querySelectorAll("td"))
        .find(td => td.textContent.includes(","))
        ?.textContent.trim() ?? "(ukjent)";

      // Legg til rekvisisjonsnummer hvis det finnes
      if (rekvNr) {
        pasient += ` (${rekvNr})`;
      }

      // Hent adresse/info
      let info = Array.from(row.querySelectorAll("td"))
        .find(td => td.innerHTML.includes("<br>"))
        ?.innerHTML.replace(/<br>/g, " → ").trim() ?? "";

      return { type: 'bestilling', vid, pasient, info, row };
    }

    // ============================================================
    // HJELPEFUNKSJON: Finn merkede rader
    // ============================================================
    function extractSelected() {
      const highlightedRows = Array.from(document.querySelectorAll("tr"))
        .filter(row => {
          const rowBg = row.style.backgroundColor.replace(/\s+/g, '');
          return rowBg === highlightColor.replace(/\s+/g, '');
        });

      const turer = highlightedRows
        .map(parseTurRow)
        .filter(Boolean)
        .filter(item => !["Framme", "Startet", "Bomtur"].includes(item.status));

      const bestillinger = highlightedRows
        .map(parseBestillingRow)
        .filter(Boolean);

      return { turer, bestillinger };
    }

    const { turer, bestillinger } = extractSelected();

    // ============================================================
    // FEILHÅNDTERING: Ingen merkede elementer
    // ============================================================
    if (turer.length === 0 && bestillinger.length === 0) {
      showErrorPopup("Ingen turer eller bestillinger er merket");
      return;
    }

    // ============================================================
    // FEILHÅNDTERING: Både turer og bestillinger er merket
    // ============================================================
    if (turer.length > 0 && bestillinger.length > 0) {
      showChoicePopup(turer, bestillinger);
      return;
    }

    // ============================================================
    // Vis popup basert på hva som er merket
    // ============================================================
    if (turer.length > 0) {
      showTurPopup(turer, baseUrlTur);
    } else {
      showBestillingPopup(bestillinger, baseUrlBestilling);
    }
  }

  // ============================================================
  // POPUP: Valg mellom turer og bestillinger
  // ============================================================
  function showChoicePopup(turer, bestillinger) {
    const { overlay, popup } = createPopupBase();

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ⚠️ Velg hva du vil avbestille
      </h2>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:20px;">
        <p style="margin:0; font-size:13px; color:#856404;">
          <strong>OBS:</strong> Du har merket både turer og bestillinger.<br>
          Velg hva du ønsker å avbestille.
        </p>
      </div>
      
      <div style="display:grid; gap:12px; margin-bottom:20px;">
        <button 
          id="chooseTurer" 
          style="
            padding:16px;
            background:#3498db;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
            text-align:left;
          "
        >
          🚗 Avbestill ${turer.length} ${turer.length === 1 ? 'tur' : 'turer'}
        </button>
        
        <button 
          id="chooseBestillinger" 
          style="
            padding:16px;
            background:#e67e22;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
            text-align:left;
          "
        >
          📋 Avbestill ${bestillinger.length} ${bestillinger.length === 1 ? 'bestilling' : 'bestillinger'}
        </button>
      </div>
      
      <button 
        id="cancelChoice" 
        style="
          padding:10px 24px;
          background:#95a5a6;
          color:#fff;
          border:none;
          border-radius:6px;
          font-size:13px;
          cursor:pointer;
          font-weight:600;
          width:100%;
        "
      >
        Avbryt
      </button>
    `;

    document.body.appendChild(popup);

    const closeChoice = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
    };

    popup.querySelector("#chooseTurer").onclick = () => {
      closeChoice();
      showTurPopup(turer, "/planlegging/ajax-dispatch?did=all&action=remove&rid=");
    };

    popup.querySelector("#chooseBestillinger").onclick = () => {
      closeChoice();
      showBestillingPopup(bestillinger, "/planlegging/ajax-dispatch?did=all&action=remove&vid=");
    };

    popup.querySelector("#cancelChoice").onclick = closeChoice;
    overlay.onclick = closeChoice;
  }

  // ============================================================
  // POPUP: Avbestill turer
  // ============================================================
  function showTurPopup(turer, baseUrl) {
    const { overlay, popup } = createPopupBase();

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

    const listTurer = turer
      .map(item => `• ${item.avtale}`)
      .join("\n");

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ⚠️ Avbestill merkede turer
      </h2>
      
      <p style="margin:8px 0 4px; font-weight:600; color:#555; font-size:15px;">
        Du er i ferd med å avbestille ${turer.length} ${turer.length === 1 ? 'tur' : 'turer'}:
      </p>
      
      <pre style="${listBoxStyle}">
${listTurer}
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
    const confirmButton = popup.querySelector("#confirmRemove");

    // Sett fokus på bekreft-knappen
    setTimeout(() => confirmButton.focus(), 100);

    // Håndter Enter-tast på bekreft-knapp
    confirmButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmButton.click();
      }
    });

    const closePopup = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
    };

    confirmButton.onclick = async () => {
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";

      // Grå ut turer umiddelbart
      disableRows(turer.map(t => t.rid), 'tur');

      let completed = 0;
      statusBox.textContent = `Sender 0 av ${turer.length} avbestillinger...`;

      await Promise.all(turer.map(item =>
        new Promise(resolve => {
          sendXHR(baseUrl + encodeURIComponent(item.rid), () => {
            completed++;
            statusBox.textContent = `Sender ${completed} av ${turer.length} avbestillinger...`;
            resolve();
          });
        })
      ));

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Alle avbestillinger er sendt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Vis Lukk-knapp
      const closeButton = document.createElement("button");
      closeButton.textContent = "Lukk";
      Object.assign(closeButton.style, {
        marginTop: "16px",
        padding: "10px 24px",
        background: "#95a5a6",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
        fontWeight: "600"
      });
      closeButton.onclick = closePopup;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopup();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup;

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // POPUP: Avbestill bestillinger
  // ============================================================
  function showBestillingPopup(bestillinger, baseUrl) {
    const { overlay, popup } = createPopupBase();

    const listBoxStyle = `
      text-align:left;
      font-size:13px;
      max-height:300px;
      overflow:auto;
      border:1px solid #ddd;
      padding:10px;
      border-radius:6px;
      background:#fafafa;
      margin-bottom:16px;
    `;

    const listBestillinger = bestillinger
      .map(item => `• ${item.pasient}\n  ${item.info}`)
      .join("\n\n");

    // Bygg ansvarlig-options
    const responsibilityOptions = Object.entries(currentCodes)
      .map(([name, code]) => `<option value="${code}">${name}</option>`)
      .join('');

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ⚠️ Avbestill merkede bestillinger
      </h2>
      
      <p style="margin:8px 0 4px; font-weight:600; color:#555; font-size:15px;">
        Du er i ferd med å avbestille ${bestillinger.length} ${bestillinger.length === 1 ? 'bestilling' : 'bestillinger'}:
      </p>
      
      <pre style="${listBoxStyle}">
${listBestillinger}
      </pre>
      
      <div style="background:#e3f2fd; border:1px solid #2196f3; padding:12px; border-radius:6px; margin-bottom:16px;">
        <label style="display:block; margin-bottom:8px; font-weight:600; color:#1565c0; font-size:14px;">
          Ansvarlig for avbestilling:
        </label>
        <select 
          id="responsibilityCode" 
          style="
            width:100%;
            padding:8px;
            border:1px solid #2196f3;
            border-radius:4px;
            font-size:14px;
            background:#fff;
          "
        >
          ${responsibilityOptions}
        </select>
        <p style="margin:8px 0 0; font-size:12px; color:#1565c0;">
          💡 Dette valget gjelder for alle merkede bestillinger
        </p>
      </div>
      
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
    const responsibilitySelect = popup.querySelector("#responsibilityCode");
    const confirmButton = popup.querySelector("#confirmRemove");

    // Sett fokus på ansvarlig-feltet
    setTimeout(() => responsibilitySelect.focus(), 100);

    // Håndter Enter-tast i dropdown
    responsibilitySelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmButton.click();
      }
    });

    // Håndter Enter-tast på bekreft-knapp
    confirmButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmButton.click();
      }
    });

    const closePopup = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
    };

    confirmButton.onclick = async () => {
      const code = responsibilitySelect.value;
      
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";
      responsibilitySelect.disabled = true;

      // Grå ut bestillinger umiddelbart
      disableRows(bestillinger.map(b => b.vid), 'bestilling');

      let completed = 0;
      statusBox.textContent = `Sender 0 av ${bestillinger.length} avbestillinger...`;

      // Send alle requests parallelt
      await Promise.all(bestillinger.map(item =>
        new Promise(resolve => {
          const url = baseUrl + encodeURIComponent(item.vid) + "&code=" + code;
          sendXHR(url, () => {
            completed++;
            statusBox.textContent = `Sender ${completed} av ${bestillinger.length} avbestillinger...`;
            resolve();
          });
        })
      ));

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Alle avbestillinger er sendt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Vis Lukk-knapp
      const closeButton = document.createElement("button");
      closeButton.textContent = "Lukk";
      Object.assign(closeButton.style, {
        marginTop: "16px",
        padding: "10px 24px",
        background: "#95a5a6",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
        fontWeight: "600"
      });
      closeButton.onclick = closePopup;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopup();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup;

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // HJELPEFUNKSJON: Opprett popup base
  // ============================================================
  function createPopupBase() {
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
      padding: "20px 24px",
      borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
      fontFamily: "Segoe UI, Arial, sans-serif",
      textAlign: "center",
      maxWidth: "650px",
      maxHeight: "80vh",
      overflow: "auto"
    });

    // Sentrér popup over col2
    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      
      popup.style.left = `${centerX}px`;
      popup.style.top = `${centerY}px`;
      popup.style.transform = "translate(-50%, -50%)";
    } else {
      // Fallback: sentrér på hele skjermen
      popup.style.top = "50%";
      popup.style.left = "50%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    return { overlay, popup };
  }

  // ============================================================
  // HJELPEFUNKSJON: Vis feilmelding
  // ============================================================
  function showErrorPopup(message) {
    const { overlay, popup } = createPopupBase();

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
        Vennligst merk elementene du ønsker å avbestille og prøv igjen.
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

    const closeErrorPopup = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', errorEscHandler);
    };

    popup.querySelector("#closeError").onclick = closeErrorPopup;
    overlay.onclick = closeErrorPopup;

    const errorEscHandler = (e) => {
      if (e.key === "Escape") closeErrorPopup();
    };
    document.addEventListener("keydown", errorEscHandler);

    setTimeout(closeErrorPopup, 4000);
  }

  // ============================================================
  // HJELPEFUNKSJON: Grå ut rader under planlegging
  // Bruker systemets innebygde ListSelectionGroup.disableSelection
  // ============================================================
  function disableRows(ids, type = 'bestilling') {
    if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.disableSelection) {
      let elementsToDisable;
      
      if (type === 'bestilling') {
        // Bestillinger trenger V-prefix
        elementsToDisable = ids.map(id => 'V-' + id);
      } else if (type === 'tur') {
        // Turer bruker ID direkte (eller R-prefix hvis nødvendig)
        elementsToDisable = ids.map(id => {
          const idStr = id.toString();
          // Hvis ID allerede starter med R, bruk som den er
          if (idStr.startsWith('R')) return idStr;
          // Ellers legg til R-prefix
          return 'R-' + idStr;
        });
      }
      
      try {
        ListSelectionGroup.disableSelection(
          elementsToDisable, 
          ListSelectionGroup.sourceSelectionLists[0]
        );
      } catch (e) {
        console.warn("Kunne ikke bruke ListSelectionGroup.disableSelection:", e);
      }
    }
  }

  // ============================================================
  // XHR FUNKSJON: Send avbestilling til server
  // ============================================================
  function sendXHR(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.withCredentials = true;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        callback();
      }
    };

    xhr.onerror = function () {
      console.error("XHR-feil på:", url);
      callback();
    };

    xhr.send();
  }

  console.log("✅ Avbestilling-script lastet");
})();