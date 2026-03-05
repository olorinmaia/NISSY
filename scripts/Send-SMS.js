// SendSMS.js – Egendefinert SMS-utsending (Alt+C)
// Erstatter NISSY sin innebygde SMS-popup med en mer fleksibel løsning.
// Støtter egendefinerte maler, automatisk utfylling fra bestillingsdata,
// og direkte sending via NISSY sin ajax-dispatch.
(function () {
  "use strict";

  if (window.__sendSMSActive) {
    console.log("✅ SendSMS er allerede aktiv");
    return;
  }
  window.__sendSMSActive = true;

  // ============================================================
  // EGENDEFINERTE MALER – rediger tekstene her i kildekoden
  // Tilgjengelige variabler i mal-funksjonen:
  //   info.pasientNavn   – f.eks. "NISSY, Alf"
  //   info.fornavn       – f.eks. "Alf"
  //   info.reiseTid      – f.eks. "18:36"
  //   info.oppTid        – f.eks. "19:00"
  //   info.fraAdresse    – f.eks. "Brubakken 15, 7608 Levanger"
  //   info.tilAdresse    – f.eks. "St. Olavs Hospital, 7006 Trondheim"
  // ============================================================
  const SMS_MALER = [
    {
      navn: "Hentetidspunkt",
      tekst: (info) =>
        `Hei${info.fornavn ? " " + info.fornavn : ""}! Din transport er planlagt med henting kl. ${info.reiseTid} fra ${info.fraAdresse}. Spørsmål? Ring 800 41 004. Hilsen Pasientreiser Nord-Trøndelag`,
    },
    {
      navn: "Planlagt transport",
      tekst: (info) =>
        `Hei${info.fornavn ? " " + info.fornavn : ""}! Din transport til oppmøte kl. ${info.oppTid} er planlagt. Estimert henting ca. kl. ${info.reiseTid}. Spørsmål? Ring 800 41 004. Hilsen Pasientreiser Nord-Trøndelag`,
    },
  ];
  // ============================================================

  // ============================================================
  // TOAST-FUNKSJONER
  // ============================================================
  let _currentToast = null;

  function showToast(msg, type = "info", duration = 3500) {
    if (_currentToast && _currentToast.parentNode) {
      _currentToast.parentNode.removeChild(_currentToast);
    }
    const colors = {
      info:    "#2980b9",
      success: "#27ae60",
      error:   "#d9534f",
      warning: "#b09f2b",
    };
    const toast = document.createElement("div");
    toast.textContent = msg;
    Object.assign(toast.style, {
      position:     "fixed",
      bottom:       "20px",
      left:         "50%",
      transform:    "translateX(-50%)",
      background:   colors[type] || colors.info,
      color:        "#fff",
      padding:      "10px 20px",
      borderRadius: "5px",
      boxShadow:    "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily:   "Arial, sans-serif",
      fontSize:     "13px",
      zIndex:       "999999",
      opacity:      "0",
      transition:   "opacity 0.3s ease",
      whiteSpace:   "nowrap",
    });
    document.body.appendChild(toast);
    _currentToast = toast;
    setTimeout(() => { toast.style.opacity = "1"; }, 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        if (_currentToast === toast) _currentToast = null;
      }, 300);
    }, duration);
  }

  // ============================================================
  // HJELPEFUNKSJON: Opprett popup-base (overlay + sentrert boks)
  // ============================================================
  function createPopupBase(minWidth = "480px") {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position:   "fixed",
      zIndex:     "999998",
      top:        "0",
      left:       "0",
      width:      "100vw",
      height:     "100vh",
      background: "rgba(0,0,0,0.35)",
    });
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position:     "fixed",
      zIndex:       "999999",
      background:   "#ffffff",
      padding:      "22px 26px",
      borderRadius: "10px",
      boxShadow:    "0 8px 30px rgba(0,0,0,0.28)",
      fontFamily:   "Segoe UI, Arial, sans-serif",
      fontSize:     "13px",
      minWidth:     minWidth,
      maxWidth:     "600px",
      maxHeight:    "85vh",
      overflow:     "auto",
    });

    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      popup.style.left      = `${rect.left + rect.width / 2}px`;
      popup.style.top       = `${rect.top + rect.height / 2}px`;
      popup.style.transform = "translate(-50%, -50%)";
    } else {
      popup.style.top       = "50%";
      popup.style.left      = "50%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    overlay.appendChild(popup);
    return { overlay, popup };
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks fra header-link
  // ============================================================
  function findColumnIndex(tableSelector, sortKey) {
    const headers = document.querySelectorAll(`${tableSelector} thead th`);
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].querySelector(`a[href*="${sortKey}"]`)) return i;
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent markert ventende bestilling
  // Returnerer null (ingen/fler valgt) eller { id, row }
  // ============================================================
  function getEnkelVentendeRad() {
    const SELECTED_BG = "rgb(148, 169, 220)";
    const rows = Array.from(
      document.querySelectorAll("#ventendeoppdrag tbody tr")
    ).filter(
      (r) => r.id && r.id.startsWith("V-") &&
             r.style.backgroundColor === SELECTED_BG
    );
    if (rows.length === 0) return { feil: "ingen" };
    if (rows.length > 1)  return { feil: "fler" };
    return { id: rows[0].id, row: rows[0] };
  }

  // ============================================================
  // HJELPEFUNKSJON: Ekstraher bestillingsdata fra DOM-rad
  // ============================================================
  function extractRowInfo(id, row) {
    const cells = row.querySelectorAll("td");

    const reiseTidIdx = findColumnIndex("#ventendeoppdrag", "tripStartDate");
    const oppTidIdx   = findColumnIndex("#ventendeoppdrag", "tripTreatmentDate");
    const navnIdx     = findColumnIndex("#ventendeoppdrag", "patientName");
    const adresseIdx  = findColumnIndex("#ventendeoppdrag", "tripFromAddress");

    const pasientNavn = navnIdx !== -1
      ? (cells[navnIdx]?.textContent.trim() || "")
      : "";

    // Fornavn: etter komma i "ETTERNAVN, Fornavn"
    const fornavnMatch = pasientNavn.match(/,\s*(.+)/);
    const fornavn = fornavnMatch ? fornavnMatch[1].trim() : "";

    const reiseTid = reiseTidIdx !== -1
      ? (cells[reiseTidIdx]?.textContent.trim().replace(/\s+/g, " ") || "")
      : "";

    const oppTid = oppTidIdx !== -1
      ? (cells[oppTidIdx]?.textContent.trim().replace(/\s+/g, " ") || "")
      : "";

    let fraAdresse = "";
    let tilAdresse = "";
    if (adresseIdx !== -1 && cells[adresseIdx]) {
      const parts = cells[adresseIdx].innerHTML.split(/<br\s*\/?>/i);
      fraAdresse = (parts[0] || "").replace(/<[^>]+>/g, "").trim();
      tilAdresse = (parts[1] || "").replace(/<[^>]+>/g, "").trim();
    }

    return { id, pasientNavn, fornavn, reiseTid, oppTid, fraAdresse, tilAdresse };
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent telefonnummer via NISSY showSendSMS
  // ============================================================
  async function fetchTelefon(rowId) {
    const url = `/planlegging/ajax-dispatch?update=false&action=showSendSMS&id=${encodeURIComponent(rowId)}`;
    try {
      const resp = await fetch(url, { credentials: "include" });
      const html = await resp.text();

      // Prøv ulike attribute-ordener
      let m = html.match(/id=["']smsTo["'][^>]*value=["']([^"']+)["']/i);
      if (!m) m = html.match(/value=["']([^"']+)["'][^>]*id=["']smsTo["']/i);
      if (m && m[1]) return m[1].trim();

      // Siste fallback: 8-sifret norsk mobilnummer
      const m2 = html.match(/\b([4-9]\d{7})\b/);
      return m2 ? m2[1] : "";
    } catch (e) {
      console.error("[SendSMS] fetchTelefon feil:", e);
      return "";
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Encode melding til ISO-8859-1 percent-encoding
  // NISSY-serveren dekoder som ISO-8859-1, ikke UTF-8.
  // encodeURIComponent gir f.eks. æ → %C3%A6 (UTF-8),
  // men serveren forventer %E6 (ISO-8859-1).
  // ============================================================
  function encodeISO(str) {
    return encodeURIComponent(str)
      .replace(/%C3%A6/gi, "%E6")   // æ
      .replace(/%C3%B8/gi, "%F8")   // ø
      .replace(/%C3%A5/gi, "%E5")   // å
      .replace(/%C3%86/gi, "%C6")   // Æ
      .replace(/%C3%98/gi, "%D8")   // Ø
      .replace(/%C3%85/gi, "%C5");  // Å
  }

  // ============================================================
  // HJELPEFUNKSJON: Send SMS via ajax-dispatch
  // ============================================================
  async function sendSMS(rowId, telefon, melding) {
    const url =
      `/planlegging/ajax-dispatch` +
      `?update=false` +
      `&action=setSendSMS` +
      `&to=${encodeURIComponent(telefon)}` +
      `&message=${encodeISO(melding)}` +
      `&id=${encodeURIComponent(rowId)}` +
      `&template=`;

    const resp = await fetch(url, { credentials: "include" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return true;
  }

  // ============================================================
  // MAIN: Åpne SendSMS-popup
  // ============================================================
  async function openSendSMSPopup() {
    // Valider valg
    const { id, row, feil } = getEnkelVentendeRad();
    if (feil === "ingen") {
      showToast("Merk én bestilling i ventende oppdrag først.", "warning");
      return;
    }
    if (feil === "fler") {
      showToast("Merk kun én bestilling for å sende SMS.", "warning");
      return;
    }

    // Hent data
    const info = extractRowInfo(id, row);

    showToast("Henter telefonnummer…", "info", 5000);
    const telefon = await fetchTelefon(id);

    // Fjern evt. eksisterende popup
    const existing = document.getElementById("__sendSMSOverlay");
    if (existing) existing.remove();

    // ── Bygg popup ──────────────────────────────────────────
    const { overlay, popup } = createPopupBase("480px");
    overlay.id = "__sendSMSOverlay";

    // Tittelrad
    const header = document.createElement("div");
    Object.assign(header.style, {
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      marginBottom:   "16px",
      borderBottom:   "2px solid #025671",
      paddingBottom:  "10px",
    });
    header.innerHTML = `
      <span style="font-size:15px;font-weight:bold;color:#025671;">📱 Send SMS</span>
      <button id="__smsBtnLukk" title="Lukk (Esc)"
        style="background:none;border:none;font-size:20px;line-height:1;
               cursor:pointer;color:#666;padding:0 2px;">×</button>
    `;
    popup.appendChild(header);

    // Bestillingsinfo-boks
    const infoBox = document.createElement("div");
    Object.assign(infoBox.style, {
      background:   "#f0f8ff",
      border:       "1px solid #c5d8e8",
      borderRadius: "5px",
      padding:      "8px 12px",
      marginBottom: "16px",
      lineHeight:   "1.6",
    });
    infoBox.innerHTML = `
      <strong>${info.pasientNavn || "(ukjent)"}</strong>
      <span style="color:#555;margin-left:10px;">Reisetid: <b>${info.reiseTid}</b></span>
      <span style="color:#555;margin-left:10px;">Oppmøte: <b>${info.oppTid}</b></span>
      ${info.fraAdresse
        ? `<div style="font-size:11px;color:#777;margin-top:2px;">${info.fraAdresse}</div>`
        : ""}
    `;
    popup.appendChild(infoBox);

    // Skjema
    function row2(label, content) {
      const d = document.createElement("div");
      Object.assign(d.style, {
        display:      "flex",
        alignItems:   "flex-start",
        marginBottom: "11px",
        gap:          "10px",
      });
      d.innerHTML = `
        <label style="width:82px;flex-shrink:0;font-weight:bold;padding-top:5px;">${label}</label>
        <div style="flex:1;">${content}</div>
      `;
      popup.appendChild(d);
      return d;
    }

    row2(
      "Telefon:",
      `<input id="__smsTo" type="text" value="${telefon}"
         style="width:100%;padding:5px 8px;border:1px solid #ccc;
                border-radius:4px;font-size:13px;box-sizing:border-box;" />`
    );

    row2(
      "Mal:",
      `<select id="__smsMal"
         style="width:100%;padding:5px 8px;border:1px solid #ccc;
                border-radius:4px;font-size:13px;">
        <option value="">– Velg mal –</option>
        ${SMS_MALER.map((m, i) => `<option value="${i}">${m.navn}</option>`).join("")}
       </select>`
    );

    row2(
      "Melding:",
      `<textarea id="__smsMsg" rows="5"
          style="width:100%;padding:6px 8px;border:1px solid #ccc;
                 border-radius:4px;font-size:13px;resize:vertical;
                 box-sizing:border-box;"></textarea>
       <div style="text-align:right;font-size:11px;color:#888;margin-top:3px;">
         <span id="__smsTegn">0</span> tegn
       </div>`
    );

    // Knapperekke
    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display:        "flex",
      justifyContent: "flex-end",
      gap:            "9px",
      marginTop:      "6px",
    });
    btnRow.innerHTML = `
      <button id="__smsBtnAvbryt"
        style="padding:7px 18px;border:1px solid #ccc;border-radius:5px;
               background:#f5f5f5;cursor:pointer;font-size:13px;">
        Avbryt
      </button>
      <button id="__smsBtnSend"
        style="padding:7px 20px;border:none;border-radius:5px;
               background:#025671;color:#fff;cursor:pointer;
               font-size:13px;font-weight:bold;">
        Send SMS
      </button>
    `;
    popup.appendChild(btnRow);

    // ── Event-handlers ──────────────────────────────────────
    const closePopup = () => overlay.remove();

    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });

    // ESC lukker
    const escHandler = (e) => {
      if (e.key === "Escape") { closePopup(); document.removeEventListener("keydown", escHandler); }
    };
    document.addEventListener("keydown", escHandler);

    // Mal-valg fyller meldingsfeltet
    const malSelect = document.getElementById("__smsMal");
    const msgArea   = document.getElementById("__smsMsg");
    const tegnSpan  = document.getElementById("__smsTegn");

    malSelect.addEventListener("change", () => {
      const idx = parseInt(malSelect.value, 10);
      if (!isNaN(idx) && SMS_MALER[idx]) {
        msgArea.value  = SMS_MALER[idx].tekst(info);
        tegnSpan.textContent = msgArea.value.length;
      }
    });

    msgArea.addEventListener("input", () => {
      tegnSpan.textContent = msgArea.value.length;
    });

    // Send-knapp
    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const telefonnr  = document.getElementById("__smsTo").value.trim();
      const meldingTxt = msgArea.value.trim();

      if (!telefonnr) {
        showToast("Telefonnummer mangler.", "warning");
        return;
      }
      if (!meldingTxt) {
        showToast("Meldingen er tom.", "warning");
        return;
      }

      const sendBtn = document.getElementById("__smsBtnSend");
      sendBtn.disabled    = true;
      sendBtn.textContent = "Sender…";
      sendBtn.style.background = "#888";

      try {
        await sendSMS(id, telefonnr, meldingTxt);
        showToast(`✅ SMS sendt til ${telefonnr}`, "success");
        closePopup();
      } catch (e) {
        console.error("[SendSMS] Send feil:", e);
        showToast("Feil ved sending av SMS. Sjekk konsoll.", "error");
        sendBtn.disabled    = false;
        sendBtn.textContent = "Send SMS";
        sendBtn.style.background = "#025671";
      }
    });

    // Fokus
    setTimeout(() => {
      if (!telefon) {
        document.getElementById("__smsTo").focus();
      } else {
        msgArea.focus();
      }
    }, 50);
  }

  // ============================================================
  // HURTIGTAST: Alt+C
  // ============================================================
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      openSendSMSPopup();
    }
  });

  console.log("✅ SendSMS lastet – Alt+C for å sende SMS");
})();