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
  // FEILMELDING-TOAST: Vises nederst på skjermen (rød bakgrunn)
  // ============================================================
  let currentErrorToast = null;
  
  function showErrorToast(msg) {
    // Fjern eksisterende feilmelding-toast
    if (currentErrorToast && currentErrorToast.parentNode) {
      currentErrorToast.parentNode.removeChild(currentErrorToast);
    }
    
    const toast = document.createElement("div");
    toast.textContent = msg;
    
    // Styling
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#d9534f", // Rød bakgrunn for feil
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      zIndex: "999999",
      opacity: "0",
      transition: "opacity 0.3s ease"
    });
    
    document.body.appendChild(toast);
    currentErrorToast = toast;
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    
    // Fade out etter 5 sekunder
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentErrorToast === toast) {
          currentErrorToast = null;
        }
      }, 300);
    }, 5000);
  }

  // ============================================================
  // SUKSESS-TOAST: Vises nederst på skjermen (grønn bakgrunn)
  // ============================================================
  let currentSuccessToast = null;
  
  function showSuccessToast(msg) {
    // Fjern eksisterende suksess-toast
    if (currentSuccessToast && currentSuccessToast.parentNode) {
      currentSuccessToast.parentNode.removeChild(currentSuccessToast);
    }
    
    const toast = document.createElement("div");
    toast.textContent = msg;
    
    // Styling
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#5cb85c", // Grønn bakgrunn for suksess
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      zIndex: "999999",
      opacity: "0",
      transition: "opacity 0.3s ease"
    });
    
    document.body.appendChild(toast);
    currentSuccessToast = toast;
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    
    // Fade out etter 3 sekunder
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentSuccessToast === toast) {
          currentSuccessToast = null;
        }
      }, 300);
    }, 3000);
  }

  // ============================================================
  // KONFIGURASJON
  // ============================================================
  const MIN_DIGITS_AFTER_DASH = 6;
  
  // Sperre for å forhindre flere samtidige kjøringer
  let isProcessing = false;
  
  // Statuser som ikke skal avbestilles, men fjernes fra planlegging
  // Disse ressursene er allerede avbestilt/avbrutt
  const REMOVE_FROM_PLANNING_STATUSES = [
    'Avbrudd godtatt'
    // Legg til flere statuser her etter behov
  ];
  
  // Statuser som ikke kan avplanlegges fra pågående oppdrag
  const NO_AVPLANLEGGING_STATUSES = [
    'Framme',
    'Startet'
    // Legg til flere statuser her etter behov
  ];
  
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
    qa: {
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
  const hostname = window.location.hostname;
  let currentCodes;
  
  if (hostname.includes('test')) {
    currentCodes = RESPONSIBILITY_CODES.test;
  } else if (hostname.includes('qa')) {
    currentCodes = RESPONSIBILITY_CODES.qa;
  } else {
    currentCodes = RESPONSIBILITY_CODES.prod;
  }

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
  // INTERCEPT: Fang opp klikk på NISSY's avbestillingsknapper
  // Erstatt standard-dialogen med vår egen popup
  // ============================================================
  document.addEventListener("click", (e) => {
    const target = e.target;
    
    // Sjekk om det er remove.gif som ble klikket
    if (target.tagName === "IMG" && 
        target.src && 
        target.src.includes("remove.gif")) {
      
      const onclickAttr = target.getAttribute("onclick");
      if (!onclickAttr) return;
      
      // ============================================================
      // CASE 1: removeResourceStarted - Tur med status "Startet"
      // ============================================================
      const startedMatch = onclickAttr.match(/removeResourceStarted\('(\d+)','([^']+)'\)/);
      if (startedMatch) {
        e.preventDefault();
        e.stopPropagation();
        showErrorToast("⛔ Det er ikke lov å avbestille en tur som har status 'Startet'");
        return;
      }
      
      // ============================================================
      // CASE 2: removeResurs - Normal tur/ressurs avbestilling
      // ============================================================
      const resursMatch = onclickAttr.match(/removeResurs\('(\d+)','([^']+)'\)/);
      if (resursMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        const rid = resursMatch[1];
        const turNavn = resursMatch[2];
        
        // Finn raden for å hente mer informasjon
        const row = target.closest("tr");
        if (row) {
          let avtale = turNavn || "(ukjent)";
          let status = row.querySelector("td[id*='Rxxxstatusxxx']")?.textContent.trim() ?? "";
          
          // CASE 2A: Bekreftet status med ugyldig ressursnavn = bil er på vei
          if (status === "Bekreftet" && !isValidResourceName(avtale)) {
            showErrorToast("⛔ Det er ikke lov å avbestille en tur etter mottatt løyvenummer! Kontakt sjåfør for å lage bomtur!");
            return;
          }
          
          // CASE 2B: Sjekk om status krever "fjern fra planlegging" i stedet for avbestilling
          if (REMOVE_FROM_PLANNING_STATUSES.includes(status)) {
            // Bruk removeFromPlanning for allerede avbestilte/avbrutte turer
            removeFromPlanning(rid, avtale, status, row);
          } else {
            // Normal avbestilling
            showSingleTurPopup({ rid, avtale, status, row });
          }
        }
        return;
      }
      
      // ============================================================
      // CASE 3: removeResourceDidNotShow - Fjern fra planlegging (møtte ikke)
      // ============================================================
      const didNotShowMatch = onclickAttr.match(/removeResourceDidNotShow\('(\d+)','([^']+)'\)/);
      if (didNotShowMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        const rid = didNotShowMatch[1];
        const turNavn = didNotShowMatch[2];
        
        // Finn raden
        const row = target.closest("tr");
        
        // Send med rad-objekt til removeFromPlanning
        removeFromPlanning(rid, turNavn, "Møtte ikke", row);
        return;
      }
      
      // ============================================================
      // CASE 4: removeResourceCompleted - Fjern fra planlegging (fullført)
      // ============================================================
      const completedMatch = onclickAttr.match(/removeResourceCompleted\('(\d+)','([^']+)'\)/);
      if (completedMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        const rid = completedMatch[1];
        const turNavn = completedMatch[2];
        
        // Finn raden
        const row = target.closest("tr");
        
        // Send med rad-objekt til removeFromPlanning
        removeFromPlanning(rid, turNavn, "Fullført", row);
        return;
      }
      
      // ============================================================
      // CASE 5: removePaagaaendeOppdrag - Avplanlegging av pågående oppdrag
      // ============================================================
      const paagaaendeMatch = onclickAttr.match(/removePaagaaendeOppdrag\('(\d+)','(\d+)'\)/);
      if (paagaaendeMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        const pid = paagaaendeMatch[1]; // Bestillings-ID
        const rid = paagaaendeMatch[2]; // Ressurs-ID
        
        // Finn raden for å hente informasjon
        const row = target.closest("tr");
        if (row) {
          // Sjekk om dette er multi-bestilling (har div.row-image) eller single-bestilling
          const parentDiv = target.closest("div.row-image");
          const allColumns = [...row.querySelectorAll("td")];
          
          let pasient = "";
          let rekvNr = "";
          let fraAdresse = "";
          let tilAdresse = "";
          let status = "";
          
          if (parentDiv) {
            // ============================================================
            // MULTI-BESTILLING: Data er i div.row-image elementer
            // ============================================================
            let bestillingIndex = 0;
            
            // Finn hvilken index denne bestillingen har
            const actionColumn = row.querySelector("td.dr:last-child");
            if (actionColumn) {
              const allActionDivs = [...actionColumn.querySelectorAll("div.row-image")];
              bestillingIndex = allActionDivs.indexOf(parentDiv);
            }
            
            // Funksjon for å hente data fra riktig div i en kolonne
            const getDataFromColumn = (columnIndex) => {
              if (columnIndex >= allColumns.length) return "";
              const column = allColumns[columnIndex];
              const divs = [...column.querySelectorAll("div.row-image")];
              if (bestillingIndex < divs.length) {
                return divs[bestillingIndex].textContent.trim();
              }
              return "";
            };
            
            // Kolonneindekser: 5=Pasient, 8=Fra, 9=Til, 10=Status
            pasient = getDataFromColumn(5) || "(ukjent)";
            fraAdresse = getDataFromColumn(8);
            tilAdresse = getDataFromColumn(9);
            status = getDataFromColumn(10);
            
            // Hent rekvNr fra spørsmålstegn-ikonet i samme div
            const questionImg = parentDiv.querySelector("img[src*='question.gif']");
            if (questionImg) {
              const onclickMatch = questionImg.getAttribute("onclick")?.match(/nr=(\d+)/);
              if (onclickMatch) {
                rekvNr = onclickMatch[1];
              }
            }
          } else {
            // ============================================================
            // SINGLE-BESTILLING: Data er direkte i td elementer
            // ============================================================
            
            // Finn pasientnavn (inneholder komma, typisk kolonne 5)
            pasient = allColumns[5]?.textContent.trim() || "(ukjent)";
            
            // Fra-adresse er kolonne 8, til-adresse er kolonne 9, status er kolonne 10
            fraAdresse = allColumns[8]?.textContent.trim() || "";
            tilAdresse = allColumns[9]?.textContent.trim() || "";
            status = allColumns[10]?.textContent.trim() || "";
            
            // Hent rekvNr fra spørsmålstegn-ikonet (direkte i siste td)
            const questionImg = row.querySelector("img[src*='question.gif']");
            if (questionImg) {
              const onclickMatch = questionImg.getAttribute("onclick")?.match(/nr=(\d+)/);
              if (onclickMatch) {
                rekvNr = onclickMatch[1];
              }
            }
          }
          
          // Valider status - sjekk om bestillingen kan avplanlegges
          if (NO_AVPLANLEGGING_STATUSES.includes(status)) {
            showErrorToast(`⛔ Det er ikke lov å avplanlegge en bestilling som har status '${status}'`);
            return;
          }
          
          // Sjekk om det er samkjøring (flere bestillinger på ressursen)
          // Dette kan vi se ved å sjekke om det finnes div.row-image elementer
          const erSamkjort = !!parentDiv; // Hvis parentDiv finnes, er det multi-bestilling = samkjørt
          
          // Hent ressursnavn fra kolonne 1 for å validere
          const ressursNavn = allColumns[1]?.textContent.trim() || "";
          
          // Sjekk om dette er siste bestilling på en tur med løyvenummer
          // (bil er på vei = !isValidResourceName og ikke samkjørt)
          if (!erSamkjort && !isValidResourceName(ressursNavn)) {
            showErrorToast("⛔ Det er ikke lov å avplanlegge den siste bestillingen på en tur etter mottatt løyvenummer! Kontakt sjåfør for å lage bomtur!");
            return;
          }
          
          // Legg til rekvNr hvis funnet
          if (rekvNr) {
            pasient += ` (${rekvNr})`;
          }
          
          const info = fraAdresse && tilAdresse 
            ? `${fraAdresse} →<br> ${tilAdresse}` 
            : "";
          
          // Sjekk om turen er i fremtiden (for å tilpasse OBS-tekst)
          let erFremtidig = false;
          if (erSamkjort && parentDiv) {
            // Hent hentetid fra kolonne 3
            const actionColumn = row.querySelector("td.dr:last-child");
            let bestillingIndex = 0;
            if (actionColumn) {
              const allActionDivs = [...actionColumn.querySelectorAll("div.row-image")];
              bestillingIndex = allActionDivs.indexOf(parentDiv);
            }
            
            const hentetidColumn = allColumns[3];
            if (hentetidColumn) {
              const divs = [...hentetidColumn.querySelectorAll("div.row-image")];
              if (bestillingIndex < divs.length) {
                const hentetid = divs[bestillingIndex].textContent.trim();
                // Hvis hentetid inneholder punktum (.), er det en dato (dd.mm format)
                // Hvis ikke punktum, er det kun klokkeslett = dagens dato
                erFremtidig = hentetid.includes('.');
              }
            }
          } else if (erSamkjort && !parentDiv) {
            // Single bestilling format - sjekk direkte i td
            const hentetid = allColumns[3]?.textContent.trim() || "";
            erFremtidig = hentetid.includes('.');
          }
          
          // Vis popup for avplanlegging
          showAvplanleggingPopup({ pid, rid, pasient, info, erSamkjort, erFremtidig });
        }
        return;
      }
      
      // ============================================================
      // CASE 6: removeVentendeOppdrag - Bestilling (eksisterende logikk)
      // ============================================================
      if (target.id && target.id.startsWith("ReqNrDeleteV-")) {
        const ventendeMatch = onclickAttr.match(/removeVentendeOppdrag\('(\d+)','(\d+)'\)/);
        
        if (ventendeMatch) {
          e.preventDefault();
          e.stopPropagation();
          
          const vid = ventendeMatch[1];
          
          // Finn raden for å hente informasjon
          const row = target.closest("tr");
          if (row) {
            // Parse rad for å få info
            const rekvNr = row.getAttribute("title") || "";
            
            const cells = [...row.querySelectorAll("td")];
            let pasient = cells.find(td => td.textContent.includes(","))?.textContent.trim() ?? "(ukjent)";
            
            if (rekvNr) {
              pasient += ` (${rekvNr})`;
            }
            
            const info = cells.find(td => td.innerHTML.includes("<br>"))
              ?.innerHTML.replace(/<br>/g, " →<br>").trim() ?? "";
            
            // Vis popup for enkelt-avbestilling
            showSingleBestillingPopup({ vid, pasient, info });
          }
        }
      }
    }
  }, true); // true = capture phase for å fange før NISSY's handler

  // ============================================================
  // POPUP: Fjern fra planlegging (for fullført/ikke møtt)
  // ============================================================
  function removeFromPlanning(rid, turNavn, årsak, row = null) {
    // Sjekk sperre
    if (isProcessing) {
      console.log("⚠️ Fjerning pågår allerede, vennligst vent...");
      return;
    }
    
    isProcessing = true;
    
    const { overlay, popup } = createPopupBase();

    // Finn raden hvis ikke sendt med
    if (!row) {
      row = document.querySelector(`tr[name="${rid}"]`) || 
            document.querySelector(`tr[id*="${rid}"]`);
    }
    
    let status = "";
    if (row) {
      status = row.querySelector("td[id*='Rxxxstatusxxx']")?.textContent.trim() ?? "";
    }

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        🗑️ Fjern fra planlegging
      </h2>
      
      <div style="
        text-align:left;
        font-size:14px;
        padding:12px;
        border:1px solid #ddd;
        border-radius:6px;
        background:#fafafa;
        margin-bottom:16px;
      ">
        <strong>${turNavn}</strong><br>
        <span style="font-size:13px; color:#666;">Status: ${status || årsak}</span>
      </div>
      
      <div style="background:#e3f2fd; border:1px solid #2196f3; padding:12px; border-radius:6px; margin-bottom:16px;">
        <p style="margin:0; font-size:13px; color:#1565c0;">
          <strong>ℹ️</strong> Denne turen kan ikke avbestilles, men kan<br>fjernes fra planleggingsbildet.
        </p>
      </div>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:15px;">
        <p style="margin:0; font-size:13px; color:#856404;">
          <strong>⚠️ OBS:</strong> Denne handlingen kan ikke angres!
        </p>
      </div>
      
      <div style="display:flex; gap:10px; justify-content:center;">
        <button 
          id="confirmRemove" 
          style="
            padding:10px 24px;
            background:#f39c12;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          Fjern
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
      isProcessing = false;
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
    };

    confirmButton.onclick = async () => {
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";

      // Følg systemets mønster: clear selections først, deretter disable
      if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
        ListSelectionGroup.clearAllSelections();
      }
      
      // Grå ut tur umiddelbart via ListSelectionGroup
      disableRows([rid], 'tur');

      statusBox.textContent = `Fjerner fra planlegging...`;

      // Send forespørsel
      const url = `/planlegging/ajax-dispatch?did=all&action=removefromplanning&rid=${encodeURIComponent(rid)}`;
      
      await new Promise(resolve => {
        sendXHR(url, () => {
          resolve();
        });
      });

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Turen er fjernet fra planlegging.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

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
    // Sjekk om en prosess allerede kjører
    if (isProcessing) {
      console.log("⚠️ Avbestilling pågår allerede, vennligst vent...");
      return;
    }
    
    isProcessing = true;
    
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
        .filter(item => !["Framme", "Startet", "Venter på svar", "Bomtur"].includes(item.status))
        .filter(item => !REMOVE_FROM_PLANNING_STATUSES.includes(item.status)); // Filtrer bort allerede avbestilte

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
      showErrorToast("✖️ Ingen bestillinger eller turer er valgt. Vennligst marker én eller flere og trykk på Avbestilling-knappen eller Alt+K igjen.");
      isProcessing = false; // Frigi sperre
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
        ✖️ Velg hva du vil avbestille
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
      isProcessing = false; // Frigi sperre
    };

    popup.querySelector("#chooseTurer").onclick = () => {
      closeChoice();
      isProcessing = true; // Behold sperre for ny popup
      showTurPopup(turer, "/planlegging/ajax-dispatch?did=all&action=remove&rid=");
    };

    popup.querySelector("#chooseBestillinger").onclick = () => {
      closeChoice();
      isProcessing = true; // Behold sperre for ny popup
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
      .map(item => {
        let displayText = `• ${item.avtale}`;
        if (item.status) {
          displayText += ` (${item.status})`;
        }
        return displayText;
      })
      .join("\n");

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ✖️ Avbestill merkede turer
      </h2>
      
      <p style="margin:8px 0 4px; font-weight:600; color:#555; font-size:15px;">
        Du er i ferd med å avbestille ${turer.length} ${turer.length === 1 ? 'tur' : 'turer'}:
      </p>
      
      <pre style="${listBoxStyle}">
${listTurer}
      </pre>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:15px;">
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
          Avbestill
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
      isProcessing = false; // Frigi sperre når popup lukkes
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
    };

    confirmButton.onclick = async () => {
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";

      // Følg systemets mønster: clear selections først, deretter disable
      if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
        ListSelectionGroup.clearAllSelections();
      }
      
      // Grå ut turer umiddelbart via ListSelectionGroup
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
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // POPUP: Avbestill enkelt tur (fra remove-knapp)
  // ============================================================
  function showSingleTurPopup(tur) {
    // Sjekk sperre
    if (isProcessing) {
      console.log("⚠️ Avbestilling pågår allerede, vennligst vent...");
      return;
    }
    
    isProcessing = true;
    
    const baseUrl = "/planlegging/ajax-dispatch?did=all&action=remove&rid=";
    const { overlay, popup } = createPopupBase();

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ✖️ Avbestill tur
      </h2>
      
      <div style="
        text-align:left;
        font-size:14px;
        padding:12px;
        border:1px solid #ddd;
        border-radius:6px;
        background:#fafafa;
        margin-bottom:16px;
      ">
        <strong>${tur.avtale}</strong><br>
        <span style="font-size:13px; color:#666;">Status: ${tur.status || 'Ukjent'}</span>
      </div>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:15px;">
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
          Avbestill
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
      isProcessing = false;
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
    };

    confirmButton.onclick = async () => {
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";

      // Følg systemets mønster: clear selections først, deretter disable
      if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
        ListSelectionGroup.clearAllSelections();
      }
      
      // Grå ut tur umiddelbart via ListSelectionGroup
      disableRows([tur.rid], 'tur');

      statusBox.textContent = `Sender avbestilling...`;

      // Send avbestilling
      await new Promise(resolve => {
        const url = baseUrl + encodeURIComponent(tur.rid);
        sendXHR(url, () => {
          resolve();
        });
      });

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Avbestilling er sendt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

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
      .map(item => `• <strong>${item.pasient}</strong>\n  ${item.info}`)
      .join("\n\n");

    // Bygg ansvarlig-options
    const responsibilityOptions = Object.entries(currentCodes)
      .map(([name, code]) => `<option value="${code}">${name}</option>`)
      .join('');

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ✖️ Avbestill merkede bestillinger
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
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:15px;">
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
          Avbestill
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
      isProcessing = false; // Frigi sperre når popup lukkes
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
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

      // Send requests sekvensiellt - vent på fullføring av hver
      for (const item of bestillinger) {
        await new Promise(resolve => {
          const url = baseUrl + encodeURIComponent(item.vid) + "&code=" + code;
          sendXHR(url, () => {
            completed++;
            statusBox.textContent = `Sender ${completed} av ${bestillinger.length} avbestillinger...`;
            resolve();
          });
        });
      }

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Alle avbestillinger er sendt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // POPUP: Avbestill enkelt bestilling (fra remove-knapp)
  // ============================================================
  function showSingleBestillingPopup(bestilling) {
    // Sjekk sperre
    if (isProcessing) {
      console.log("⚠️ Avbestilling pågår allerede, vennligst vent...");
      return;
    }
    
    isProcessing = true;
    
    const baseUrl = "/planlegging/ajax-dispatch?did=all&action=remove&vid=";
    const { overlay, popup } = createPopupBase();

    // Bygg ansvarlig-options
    const responsibilityOptions = Object.entries(currentCodes)
      .map(([name, code]) => `<option value="${code}">${name}</option>`)
      .join('');

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ✖️ Avbestill bestilling
      </h2>
      
      <div style="
        text-align:left;
        font-size:14px;
        padding:12px;
        border:1px solid #ddd;
        border-radius:6px;
        background:#fafafa;
        margin-bottom:16px;
      ">
        <strong>${bestilling.pasient}</strong><br>
        <span style="font-size:13px; color:#666;">${bestilling.info}</span>
      </div>
      
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
      </div>
      
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:15px;">
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
          Avbestill
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
      isProcessing = false;
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
    };

    confirmButton.onclick = async () => {
      const code = responsibilitySelect.value;
      
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelRemove").style.display = "none";
      responsibilitySelect.disabled = true;

      // Grå ut bestilling umiddelbart
      disableRows([bestilling.vid], 'bestilling');

      statusBox.textContent = `Sender avbestilling...`;

      // Send avbestilling
      await new Promise(resolve => {
        const url = baseUrl + encodeURIComponent(bestilling.vid) + "&code=" + code;
        sendXHR(url, () => {
          resolve();
        });
      });

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Avbestilling er sendt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelRemove").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // POPUP: Avplanlegg pågående oppdrag
  // ============================================================
  function showAvplanleggingPopup(oppdrag) {
    // Sjekk sperre
    if (isProcessing) {
      console.log("⚠️ Avplanlegging pågår allerede, vennligst vent...");
      return;
    }
    
    isProcessing = true;
    
    const baseUrl = "/planlegging/ajax-dispatch?did=all&action=remove&pid=";
    const { overlay, popup } = createPopupBase();

    popup.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px; color:#333;">
        ↩️ Avplanlegg bestilling
      </h2>
      
      <div style="
        text-align:left;
        font-size:14px;
        padding:12px;
        border:1px solid #ddd;
        border-radius:6px;
        background:#fafafa;
        margin-bottom:16px;
      ">
        <strong>${oppdrag.pasient}</strong><br>
        <span style="font-size:13px; color:#666;">${oppdrag.info}</span>
      </div>
      
      ${oppdrag.erSamkjort ? `
      <div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:6px; margin-bottom:16px;">
        <p style="margin:0; font-size:13px; color:#856404;">
          <strong>⚠️ OBS:</strong> Bestillingen er samkjørt!<br>Juster andre bestillinger manuelt hvis nødvendig${oppdrag.erFremtidig ? '<br>eller informer turplanlegger' : ''}.
        </p>
      </div>
      ` : ''}
      
      <div style="display:flex; gap:10px; justify-content:center;">
        <button 
          id="confirmAvplanlegg" 
          style="
            padding:10px 24px;
            background:#3498db;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          Avplanlegg
        </button>
        
        <button 
          id="cancelAvplanlegg" 
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
        id="avplanleggStatus" 
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
    const statusBox = popup.querySelector("#avplanleggStatus");
    const confirmButton = popup.querySelector("#confirmAvplanlegg");

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
      isProcessing = false;
    };
    
    const closePopupWithRefresh = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      if (typeof openPopp === 'function') openPopp('-1');
      isProcessing = false;
    };

    confirmButton.onclick = async () => {
      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelAvplanlegg").style.display = "none";

      statusBox.textContent = `Avplanlegger bestilling...`;

      // Send avplanlegging
      await new Promise(resolve => {
        const url = baseUrl + encodeURIComponent(oppdrag.pid);
        sendXHR(url, () => {
          resolve();
        });
      });

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = "✅ Ferdig! Bestillingen er avplanlagt.";
      
      if (typeof openPopp === "function") openPopp('-1');
      
      // Nå kan overlay lukke med refresh
      overlay.onclick = closePopupWithRefresh;
      
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
      closeButton.onclick = closePopupWithRefresh;
      popup.appendChild(closeButton);
      
      // Sett fokus på Lukk-knappen og håndter Enter
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopupWithRefresh();
        }
      });
    };

    popup.querySelector("#cancelAvplanlegg").onclick = closePopup;
    overlay.onclick = closePopup; // Før operasjon - lukker uten refresh
    // overlay.onclick endres til closePopupWithRefresh etter suksess

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
      background: "rgba(0,0,0,0.3)"
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
      maxWidth: "380px",
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
  // HJELPEFUNKSJON: Grå ut rader under planlegging
  // Bruker systemets innebygde ListSelectionGroup.disableSelection
  // ============================================================
  function disableRows(ids, type = 'bestilling') {
    if (typeof ListSelectionGroup === 'undefined' || !ListSelectionGroup.disableSelection) {
      console.warn("ListSelectionGroup.disableSelection er ikke tilgjengelig");
      return;
    }
    
    let elementsToDisable;
    let targetList;
    
    if (type === 'bestilling') {
      // Bestillinger bruker V-prefix og er i sourceSelectionLists
      elementsToDisable = ids.map(id => 'V-' + id);
      targetList = ListSelectionGroup.sourceSelectionLists[0];
    } else if (type === 'tur') {
      // Turer/ressurser har to formater i systemet:
      // - Ressurs-liste: Rxxx{rid} (i targetSelectionLists eller resourceSelectionLists)
      // - Pågående oppdrag-liste: P-{rid} (i targetSelectionLists)
      
      // Vi må gråe ut begge, og de bruker forskjellige lister
      elementsToDisable = ids.flatMap(id => {
        const idStr = id.toString();
        return [
          'Rxxx' + idStr,  // Ressurs-rad
          'P-' + idStr     // Pågående oppdrag-rad
        ];
      });
      
      // Prøv først med targetSelectionLists (for ressurser og pågående oppdrag)
      targetList = ListSelectionGroup.targetSelectionLists && ListSelectionGroup.targetSelectionLists[0] 
        ? ListSelectionGroup.targetSelectionLists[0]
        : (ListSelectionGroup.resourceSelectionLists && ListSelectionGroup.resourceSelectionLists[0]
          ? ListSelectionGroup.resourceSelectionLists[0]
          : ListSelectionGroup.sourceSelectionLists[0]);
    }
    
    try {
      // Bruk systemets innebygde funksjon for å gråe ut
      ListSelectionGroup.disableSelection(elementsToDisable, targetList);
    } catch (e) {
      console.warn("Kunne ikke bruke ListSelectionGroup.disableSelection:", e);
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
