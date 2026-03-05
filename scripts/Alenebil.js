(() => {
  // ============================================================
  // ALENEBIL-BEHOV SCRIPT
  // Setter det spesielle behovet "Alenebil" på markerte bestillinger
  // Nyttig når behovet er deaktivert i brukergrensesnittet
  // ============================================================
  
  // Bakgrunnsfarge for merkede rader i NISSY
  const SELECTED_BG = "rgb(148, 169, 220)";

  // ============================================================
  // MILJØ-BASERT KONFIGURASJON
  // Forskjellige verdier for TEST, QA og PROD
  // ============================================================
  const ENVIRONMENT_CONFIG = {
    test: {
      fieldId: '289',      // Alenebil felt-ID i TEST
      editsValue: ',299'   // Edits-verdi i TEST
    },
    qa: {
      fieldId: '198',      // Alenebil felt-ID i QA
      editsValue: ',208'   // Edits-verdi i QA
    },
    prod: {
      fieldId: '198',      // Alenebil felt-ID i PROD
      editsValue: ',208'   // Edits-verdi i PROD
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
    
    // Fade out etter 4 sekunder
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
    }, 4000);
  }

  // ============================================================
  // BEKREFTELSESDIALOG
  // Viser en custom dialog med Ja/Nei-knapper
  // Sentrert horisontalt over ventende oppdrag i NISSY-stil
  // ============================================================
  function showConfirm(message) {
    return new Promise(resolve => {
      // Finn ventende oppdrag container for horisontal sentrering
      const col2 = document.getElementById("bodyVentendeOppdrag");
      const col2Rect = col2 ? col2.getBoundingClientRect() : null;

      // Opprett overlay (mørk bakgrunn)
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(0, 0, 0, 0.4)",
        zIndex: "1000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      });

      // Opprett dialog-boks
      const box = document.createElement("div");
      Object.assign(box.style, {
        background: "#fff",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "420px",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(0, 0, 0, 0.1)"
      });

      // Horisontal sentrering over col2 hvis mulig
      if (col2Rect) {
        box.style.position = "absolute";
        box.style.left = `${col2Rect.left + (col2Rect.width / 2)}px`;
        box.style.transform = "translateX(-50%)";
      }

      // Header med ikon
      const header = document.createElement("div");
      Object.assign(header.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px"
      });
      
      const icon = document.createElement("span");
      icon.textContent = "🚗";
      icon.style.fontSize = "20px";
      
      const title = document.createElement("span");
      title.textContent = "Bekreft Alenebil";
      Object.assign(title.style, {
        fontSize: "16px",
        fontWeight: "600",
        color: "#333"
      });
      
      header.append(icon, title);

      // Melding
      const text = document.createElement("div");
      text.textContent = message;
      Object.assign(text.style, {
        marginBottom: "16px",
        lineHeight: "1.4",
        color: "#555",
        fontSize: "14px"
      });

      // Knapp-container
      const btnContainer = document.createElement("div");
      Object.assign(btnContainer.style, {
        display: "flex",
        gap: "10px",
        justifyContent: "flex-end"
      });

      // Cleanup-funksjon for å unngå dobbel-remove
      let isResolved = false;
      const cleanup = (result) => {
        if (isResolved) return;
        isResolved = true;
        
        document.removeEventListener("keydown", escHandler);
        if (overlay.parentNode) {
          overlay.remove();
        }
        resolve(result);
      };

      // Nei-knapp
      const btnNo = document.createElement("button");
      btnNo.textContent = "Nei";
      Object.assign(btnNo.style, {
        background: "#6c757d",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        transition: "all 0.2s"
      });
      btnNo.onmouseover = () => {
        btnNo.style.background = "#5a6268";
        btnNo.style.transform = "translateY(-1px)";
      };
      btnNo.onmouseout = () => {
        btnNo.style.background = "#6c757d";
        btnNo.style.transform = "translateY(0)";
      };
      btnNo.onclick = () => cleanup(false);

      // Ja-knapp (NISSY blå)
      const btnYes = document.createElement("button");
      btnYes.textContent = "Ja";
      Object.assign(btnYes.style, {
        background: "linear-gradient(135deg, #4A81BF 0%, #6896CA 100%)",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        transition: "all 0.2s"
      });
      btnYes.onmouseover = () => {
        btnYes.style.background = "linear-gradient(135deg, #35659E 0%, #5785B9 100%)";
        btnYes.style.transform = "translateY(-1px)";
      };
      btnYes.onmouseout = () => {
        btnYes.style.background = "linear-gradient(135deg, #4A81BF 0%, #6896CA 100%)";
        btnYes.style.transform = "translateY(0)";
      };
      btnYes.onclick = () => cleanup(true);

      // Bygg dialogen
      btnContainer.append(btnYes, btnNo);
      box.append(header, text, btnContainer);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // ESC for å lukke
      const escHandler = (e) => {
        if (e.key === "Escape") {
          cleanup(false);
        }
      };
      document.addEventListener("keydown", escHandler);

      // Klikk utenfor for å lukke
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup(false);
        }
      };
    });
  }

  // ============================================================
  // FINN MERKEDE BESTILLINGER
  // Filtrerer kun ventende oppdrag (V-) med riktig bakgrunnsfarge
  // ============================================================
  const rows = [...document.querySelectorAll("tr")].filter(tr =>
    getComputedStyle(tr).backgroundColor === SELECTED_BG &&
    (tr.id || "").startsWith("V-")
  );

  // Sjekk om noen bestillinger er merket
  if (rows.length === 0) {
    showErrorToast("🚗 Ingen bestillinger er valgt på ventende oppdrag. Vennligst marker én eller flere og trykk på Alenebil-knappen igjen.");
    return;
  }

  // ============================================================
  // BEKREFTELSESMELDING
  // Tilpass melding basert på antall merkede bestillinger
  // ============================================================
  let confirmText;
  if (rows.length === 1) {
    confirmText = `Er du sikker på at du ønsker å sette det spesielle behovet Alenebil ` +
      `på markert bestilling?`;
  } else {
    confirmText = `Er du sikker på at du ønsker å sette det spesielle behovet Alenebil ` +
      `på de ${rows.length} markerte bestillingene?`;
  }

  // ============================================================
  // HOVEDLOGIKK
  // Kjører kun hvis bruker bekrefter
  // ============================================================
  showConfirm(confirmText).then(async confirmed => {
    if (!confirmed) return; // Bruker klikket Nei

    // ============================================================
    // HENT BRUKER-ID
    // Finner brukerens ID fra "Endre passord"-lenken i menyen
    // ============================================================
    const userLink = [...document.querySelectorAll('a[href*="popup/changePassword"]')]
      .find(a => /id=\d+/.test(a.href));
    
    if (!userLink) return; // Kunne ikke finne bruker-ID

    const userid = userLink.href.match(/id=(\d+)/)?.[1];
    if (!userid) return; // Ugyldig bruker-ID

    // ============================================================
    // PROSESSER HVER MERKET BESTILLING
    // ============================================================
    for (const row of rows) {
      // Hent bestillings-ID fra rad
      const id = row.getAttribute("name") || row.id.replace(/^V-/, "");
      
      // Hent requisition number fra title-attributt
      const res = row.getAttribute("title");
      
      if (!id || !res) continue; // Hopp over hvis data mangler

      // Bygg URL for redigering
      const url =
        `/rekvisisjon/requisition/editMultipleRequisitions` +
        `?userid=${userid}&id=${id}&res=${res}`;

      try {
        // ============================================================
        // STEG 1: HENT REDIGERINGSSIDEN
        // Trenger versjonsnummer for å gjennomføre endringen
        // ============================================================
        const html = await fetch(url, { credentials: "same-origin" }).then(r => r.text());
        const doc = new DOMParser().parseFromString(html, "text/html");
        
        // Finn versjonsnummer fra skjema
        const v = doc.querySelector('input[name="version_0"]')?.value;
        if (!v) continue; // Hopp over hvis versjonsnummer mangler

        // ============================================================
        // STEG 2: BYGG POST-DATA
        // Setter kun "Alenebil"-feltet til true (bruker miljø-spesifikk config)
        // ============================================================
        const fd = new URLSearchParams({
          // Admin-parametere (tomme)
          admin_param_1: "",
          admin_param_2: "",
          admin_param_3: "",
          admin_param_4: res, // Requisition number
          admin_param_5: "",
          admin_param_6: "",
          
          // Versjonskontroll
          version_0: v,
          version_count: "1",
          
          // Behandling og tid (uendret)
          editTreatmentDate: "",
          editTreatmentTime: "",
          editStartDate: "",
          editStartTime: "",
          
          // Kommentarer (uendret)
          editComment: "",
          editTransporterMessage: "",
          
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
          infoAboutPickup: "",
          
          // *** VIKTIG: Setter Alenebil-behov (miljø-spesifikt) ***
          [config.fieldId]: "true", // Bruker miljø-spesifikk felt-ID
          
          // Metadata
          selectedIndex: "0",
          action: "save",
          edits: config.editsValue // Bruker miljø-spesifikk edits-verdi
        });

        // ============================================================
        // STEG 3: SEND POST-REQUEST
        // Lagrer endringen i NISSY
        // ============================================================
        await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: fd.toString()
        });
      } catch {
        // Ignorer feil for enkelte bestillinger, fortsett med neste
      }
    }

    // ============================================================
    // HJELPEFUNKSJON: Engangs XHR-interceptor for openPopp(-1)
    // Fyrer callback når /planlegging/ajax-dispatch?action=openres&rid=-1 er ferdig
    // ============================================================
    function onceAfterOpenPopp(callback) {
      const originalOpen = XMLHttpRequest.prototype.open;
      let restored = false;

      const restore = () => {
        if (!restored) {
          restored = true;
          XMLHttpRequest.prototype.open = originalOpen;
        }
      };

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' && url.includes('action=openres') && url.includes('rid=-1')) {
          restore();
          this.addEventListener('load', function() {
            // 50ms delay for DOM-oppdatering
            setTimeout(callback, 50);
          }, { once: true });
        }
        return originalOpen.call(this, method, url, ...rest);
      };

      // Sikkerhetsnett: restore etter 3s hvis openPopp aldri kalles
      setTimeout(restore, 3000);
    }

    // ============================================================
    // REFRESH DATA OG RE-MARKER BESTILLINGER
    // Oppdater siden for å vise endringene, deretter marker på nytt
    // ============================================================
    
    // Lagre bestillings-IDer for re-markering
    const rowIds = rows.map(row => row.id);
    
    // Sett opp callback for re-markering
    onceAfterOpenPopp(() => {
      // Marker bestillingene på nytt
      rowIds.forEach(rowId => {
        try {
          if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
            selectRow(rowId, g_voppLS);
          }
        } catch (e) {
          // Ignorer feil hvis rad ikke finnes lenger
        }
      });
    });

    // Trigger refresh
    openPopp("-1");
  });
})();