(() => {
  // ============================================================
  // ALENEBIL-BEHOV SCRIPT
  // Setter det spesielle behovet "Alenebil" på markerte bestillinger
  // Nyttig når behovet er deaktivert i brukergrensesnittet
  // ============================================================
  
  // Bakgrunnsfarge for merkede rader i NISSY
  const SELECTED_BG = "rgb(148, 169, 220)";

  // ============================================================
  // BEKREFTELSESDIALOG
  // Viser en custom dialog med Ja/Nei-knapper
  // ============================================================
  function showConfirm(message) {
    return new Promise(resolve => {
      // Opprett overlay (mørk bakgrunn)
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.4)";
      overlay.style.zIndex = "1000000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      // Opprett dialog-boks
      const box = document.createElement("div");
      box.style.background = "#fff";
      box.style.padding = "20px";
      box.style.borderRadius = "8px";
      box.style.maxWidth = "420px";
      box.style.fontFamily = "Arial, sans-serif";
      box.style.textAlign = "center";

      // Melding
      const text = document.createElement("div");
      text.textContent = message;
      text.style.marginBottom = "20px";

      // Ja-knapp (grønn)
      const btnYes = document.createElement("button");
      btnYes.textContent = "Ja";
      btnYes.style.background = "#28a745";
      btnYes.style.color = "#fff";
      btnYes.style.border = "none";
      btnYes.style.padding = "8px 16px";
      btnYes.style.marginRight = "10px";
      btnYes.style.borderRadius = "4px";
      btnYes.onclick = () => {
        overlay.remove();
        resolve(true); // Returner true når bruker klikker Ja
      };

      // Nei-knapp (rød)
      const btnNo = document.createElement("button");
      btnNo.textContent = "Nei";
      btnNo.style.background = "#dc3545";
      btnNo.style.color = "#fff";
      btnNo.style.border = "none";
      btnNo.style.padding = "8px 16px";
      btnNo.style.borderRadius = "4px";
      btnNo.onclick = () => {
        overlay.remove();
        resolve(false); // Returner false når bruker klikker Nei
      };

      // Bygg dialogen
      box.append(text, btnYes, btnNo);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  // ============================================================
  // FEILMELDING
  // Viser en enkel alert-melding
  // ============================================================
  function showError(msg) {
    alert(msg);
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
    showError("Ingen bestillinger er merket på ventende oppdrag.");
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
        // Setter kun "Alenebil"-feltet (198) til true
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
          
          // *** VIKTIG: Setter Alenebil-behov ***
          "198": "true", // ID 198 = Alenebil-behov
          
          // Metadata
          selectedIndex: "0",
          action: "save",
          edits: ",208" // Indikerer hvilke felt som er endret
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
    // REFRESH DATA
    // Oppdater siden for å vise endringene
    // ============================================================
    try {
      openPopp("-1"); // Prøv NISSY's innebygde refresh
    } catch {
      location.reload(); // Fallback: Full side-reload
    }
  });
})();
