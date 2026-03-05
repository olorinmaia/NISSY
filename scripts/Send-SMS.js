// SendSMS.js – Egendefinert SMS-utsending (Alt+C)
// Støtter enkelt- og masse-sending, egendefinerte maler,
// automatisk utfylling fra bestillingsdata, og ISO-8859-1-encoding.
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
  // autoVelgHvis(info): valgfri funksjon – returnerer true for å auto-velge
  // ============================================================
  const SMS_MALER = [
    {
      navn: "Hentetidspunkt",
      tekst: (info) =>
        `Hei${info.fornavn ? " " + info.fornavn : ""}! Din transport er planlagt med henting kl. ${info.reiseTid} fra ${info.fraAdresse}. Spørsmål? Ring 05515. Hilsen Pasientreiser Nord-Trøndelag`,
    },
    {
      navn: "Planlagt transport",
      tekst: (info) =>
        `Hei${info.fornavn ? " " + info.fornavn : ""}! Din transport til oppmøte kl. ${info.oppTid} er planlagt. Estimert henting ca. kl. ${info.reiseTid}. Spørsmål? Ring 05515. Hilsen Pasientreiser Nord-Trøndelag`,
    },
    {
      navn: "Trondheim lufthavn",
      autoVelgHvis: (info) =>
        /trondheim lufthavn|værnes|TRD/i.test(info.fraAdresse),
      tekst: (info) =>
        `Hei${info.fornavn ? " " + info.fornavn : ""}. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt tilrettelagt transport fra Trondheim Lufthavn.\nRing 05515 når du har landet og er reiseklar slik at vi kan tildele din bestilling til transportør.\n\nMinner om at du kan se og endre dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
  ];
  // ============================================================

  // ============================================================
  // KONFIGURASJON
  // ============================================================
  const MAX_TEGN           = 480;
  const MAX_NAVN_LENGDE    = 22;
  const MAX_ADRESSE_LENGDE = 28;
  // ============================================================

  function kortTekst(str, maks) {
    if (!str) return "";
    return str.length > maks ? str.slice(0, maks) + "…" : str;
  }

  function erGyldigMobil(nr) {
    return /^[4-9]\d{7}$/.test(nr.replace(/\s/g, ""));
  }

  function encodeISO(str) {
    return encodeURIComponent(str.replace(/%/g, "%25"))
      .replace(/%C3%A6/gi, "%E6")
      .replace(/%C3%B8/gi, "%F8")
      .replace(/%C3%A5/gi, "%E5")
      .replace(/%C3%86/gi, "%C6")
      .replace(/%C3%98/gi, "%D8")
      .replace(/%C3%85/gi, "%C5");
  }

  // ============================================================
  // TOAST
  // ============================================================
  let _currentToast = null;

  function showToast(msg, type = "info", duration = 3500) {
    if (_currentToast && _currentToast.parentNode) {
      _currentToast.parentNode.removeChild(_currentToast);
    }
    const colors = { info: "#2980b9", success: "#27ae60", error: "#d9534f", warning: "#b09f2b" };
    const toast = document.createElement("div");
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed", bottom: "20px", left: "50%",
      transform: "translateX(-50%)", background: colors[type] || colors.info,
      color: "#fff", padding: "10px 20px", borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)", fontFamily: "Arial, sans-serif",
      fontSize: "13px", zIndex: "999999", opacity: "0",
      transition: "opacity 0.3s ease", whiteSpace: "nowrap",
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
  // POPUP-BASE
  // ============================================================
  function createPopupBase(minWidth = "480px") {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", zIndex: "999998", top: "0", left: "0",
      width: "100vw", height: "100vh", background: "rgba(0,0,0,0.35)",
    });
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position: "fixed", zIndex: "999999", background: "#ffffff",
      padding: "22px 26px", borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
      fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "13px",
      minWidth: minWidth, maxWidth: "750px", maxHeight: "85vh", overflow: "auto",
    });

    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      popup.style.left      = `${rect.left + rect.width / 2}px`;
      popup.style.top       = `${rect.top + rect.height / 2}px`;
      popup.style.transform = "translate(-50%, -50%)";
    } else {
      popup.style.top = "50%"; popup.style.left = "50%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    overlay.appendChild(popup);
    return { overlay, popup };
  }

  // ============================================================
  // FINN KOLONNE-INDEKS
  // ============================================================
  function findColumnIndex(tableSelector, sortKey) {
    const headers = document.querySelectorAll(`${tableSelector} thead th`);
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].querySelector(`a[href*="${sortKey}"]`)) return i;
    }
    return -1;
  }

  // ============================================================
  // HENT ALLE MERKEDE VENTENDE BESTILLINGER
  // ============================================================
  function getVentendeRader() {
    const SELECTED_BG = "rgb(148, 169, 220)";
    return Array.from(document.querySelectorAll("#ventendeoppdrag tbody tr"))
      .filter(r => r.id && r.id.startsWith("V-") && r.style.backgroundColor === SELECTED_BG);
  }

  // ============================================================
  // EKSTRAHER BESTILLINGSDATA FRA DOM-RAD
  // ============================================================
  function extractRowInfo(id, row) {
    const cells       = row.querySelectorAll("td");
    const reiseTidIdx = findColumnIndex("#ventendeoppdrag", "tripStartDate");
    const oppTidIdx   = findColumnIndex("#ventendeoppdrag", "tripTreatmentDate");
    const navnIdx     = findColumnIndex("#ventendeoppdrag", "patientName");
    const adresseIdx  = findColumnIndex("#ventendeoppdrag", "tripFromAddress");

    const pasientNavn  = navnIdx !== -1 ? (cells[navnIdx]?.textContent.trim() || "") : "";
    const fornavnMatch = pasientNavn.match(/,\s*(.+)/);
    const fornavn      = fornavnMatch ? fornavnMatch[1].trim() : "";
    const reiseTid     = reiseTidIdx !== -1 ? (cells[reiseTidIdx]?.textContent.trim().replace(/\s+/g, " ") || "") : "";
    const oppTid       = oppTidIdx   !== -1 ? (cells[oppTidIdx]?.textContent.trim().replace(/\s+/g, " ") || "") : "";

    let fraAdresse = "", tilAdresse = "";
    if (adresseIdx !== -1 && cells[adresseIdx]) {
      const parts = cells[adresseIdx].innerHTML.split(/<br\s*\/?>/i);
      fraAdresse = (parts[0] || "").replace(/<[^>]+>/g, "").trim();
      tilAdresse = (parts[1] || "").replace(/<[^>]+>/g, "").trim();
    }

    return { id, pasientNavn, fornavn, reiseTid, oppTid, fraAdresse, tilAdresse };
  }

  // ============================================================
  // HENT TELEFONNUMMER VIA NISSY
  // ============================================================
  async function fetchTelefon(rowId) {
    const url = `/planlegging/ajax-dispatch?update=false&action=showSendSMS&id=${encodeURIComponent(rowId)}`;
    try {
      const resp = await fetch(url, { credentials: "include" });
      const html = await resp.text();
      // Hent value= fra smsTo-feltet – matcher også tom streng
      let m = html.match(/id=["']smsTo["'][^>]*value=["']([^"']*)["']/i);
      if (!m) m = html.match(/value=["']([^"']*)["'][^>]*id=["']smsTo["']/i);
      if (m) return m[1].trim();
      return "";
    } catch (e) {
      console.error("[SendSMS] fetchTelefon feil:", e);
      return "";
    }
  }

  // ============================================================
  // SEND SMS VIA AJAX-DISPATCH
  // ============================================================
  async function sendSMS(rowId, telefon, melding) {
    const url =
      `/planlegging/ajax-dispatch` +
      `?update=false&action=setSendSMS` +
      `&to=${encodeURIComponent(telefon)}` +
      `&message=${encodeISO(melding)}` +
      `&id=${encodeURIComponent(rowId)}` +
      `&template=`;
    const resp = await fetch(url, { credentials: "include" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return true;
  }

  // ============================================================
  // ENKELT-SENDING (1 bestilling)
  // ============================================================
  async function openEnkeltPopup(info, telefon) {
    const existing = document.getElementById("__sendSMSOverlay");
    if (existing) existing.remove();

    const { overlay, popup } = createPopupBase("480px");
    overlay.id = "__sendSMSOverlay";

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "16px", borderBottom: "2px solid #025671", paddingBottom: "10px",
    });
    header.innerHTML = `
      <span style="font-size:15px;font-weight:bold;color:#025671;">📱 Send SMS</span>
      <button id="__smsBtnLukk" title="Lukk (Esc)"
        style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#666;padding:0 2px;">×</button>
    `;
    popup.appendChild(header);

    const infoBox = document.createElement("div");
    Object.assign(infoBox.style, {
      background: "#f0f8ff", border: "1px solid #c5d8e8",
      borderRadius: "5px", padding: "8px 12px", marginBottom: "16px", lineHeight: "1.6",
    });
    const visOppTid = info.reiseTid && info.oppTid && info.reiseTid < info.oppTid;
    infoBox.innerHTML = `
      <strong>${kortTekst(info.pasientNavn, MAX_NAVN_LENGDE) || "(ukjent)"}</strong>
      <span style="color:#555;margin-left:10px;">Hentetid: <b>${info.reiseTid}</b></span>
      ${visOppTid ? `<span style="color:#555;margin-left:10px;">Oppmøte: <b>${info.oppTid}</b></span>` : ""}
      ${(info.fraAdresse || info.tilAdresse)
        ? `<div style="font-size:11px;color:#777;margin-top:4px;">
             ${kortTekst(info.fraAdresse, MAX_ADRESSE_LENGDE) || "?"}
             &nbsp;→&nbsp;
             ${kortTekst(info.tilAdresse, MAX_ADRESSE_LENGDE) || "?"}
           </div>` : ""}
    `;
    popup.appendChild(infoBox);

    function skjemaRad(label, innhold) {
      const d = document.createElement("div");
      Object.assign(d.style, { display: "flex", alignItems: "flex-start", marginBottom: "11px", gap: "10px" });
      d.innerHTML = `
        <label style="width:82px;flex-shrink:0;font-weight:bold;padding-top:5px;">${label}</label>
        <div style="flex:1;">${innhold}</div>
      `;
      popup.appendChild(d);
      return d;
    }

    skjemaRad("Mobil:",
      `<input id="__smsTo" type="text" value="${telefon}"
         style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;" />`);

    skjemaRad("Mal:",
      `<select id="__smsMal" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        <option value="">– Velg mal –</option>
        ${SMS_MALER.map((m, i) => `<option value="${i}">${m.navn}</option>`).join("")}
       </select>`);

    skjemaRad("Melding:",
      `<textarea id="__smsMsg" rows="5"
          style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;
                 font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
       <div style="text-align:right;font-size:11px;margin-top:3px;">
         <span id="__smsTegn" style="color:#888;">0</span>
         <span style="color:#888;"> / ${MAX_TEGN} tegn</span>
       </div>`);

    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, { display: "flex", justifyContent: "flex-end", gap: "9px", marginTop: "6px" });
    btnRow.innerHTML = `
      <button id="__smsBtnSend"
        style="padding:7px 20px;border:none;border-radius:5px;background:#aaa;
               color:#fff;font-size:13px;font-weight:bold;cursor:not-allowed;"
        disabled>Send SMS</button>
      <button id="__smsBtnAvbryt"
        style="padding:7px 18px;border:1px solid #ccc;border-radius:5px;
               background:#f5f5f5;cursor:pointer;font-size:13px;">Avbryt</button>
    `;
    popup.appendChild(btnRow);

    const closePopup = () => { document.removeEventListener("keydown", escHandler); overlay.remove(); };
    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });
    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    document.addEventListener("keydown", escHandler);

    const malSelect = document.getElementById("__smsMal");
    const msgArea   = document.getElementById("__smsMsg");
    const tegnSpan  = document.getElementById("__smsTegn");

    function oppdaterEnkeltSendKnapp() {
      const sendBtn   = document.getElementById("__smsBtnSend");
      const telefonnr = document.getElementById("__smsTo")?.value.trim() || "";
      const harTekst  = msgArea.value.trim().length > 0;
      const aktiv     = telefonnr.length > 0 && harTekst;
      sendBtn.disabled        = !aktiv;
      sendBtn.style.background = aktiv ? "#025671" : "#aaa";
      sendBtn.style.cursor     = aktiv ? "pointer" : "not-allowed";
    }

    function oppdaterTegnteller() {
      const len = msgArea.value.length;
      tegnSpan.textContent = len;
      tegnSpan.style.color = len >= MAX_TEGN ? "#d9534f" : len >= MAX_TEGN * 0.9 ? "#b09f2b" : "#888";
      oppdaterEnkeltSendKnapp();
    }

    function velgMal(idx) {
      malSelect.value      = idx;
      msgArea.value        = SMS_MALER[idx].tekst(info).slice(0, MAX_TEGN);
      msgArea.style.height = "auto";
      msgArea.style.height = msgArea.scrollHeight + "px";
      oppdaterTegnteller();
    }

    malSelect.addEventListener("change", () => {
      const idx = parseInt(malSelect.value, 10);
      if (!isNaN(idx) && SMS_MALER[idx]) velgMal(idx);
      else oppdaterEnkeltSendKnapp();
    });

    msgArea.addEventListener("input", () => {
      if (msgArea.value.length > MAX_TEGN) msgArea.value = msgArea.value.slice(0, MAX_TEGN);
      oppdaterTegnteller();
    });

    document.getElementById("__smsTo").addEventListener("input", oppdaterEnkeltSendKnapp);

    const autoIdx = SMS_MALER.findIndex(m => m.autoVelgHvis?.(info));
    if (autoIdx !== -1) velgMal(autoIdx);

    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const telefonnr  = document.getElementById("__smsTo").value.trim();
      const meldingTxt = msgArea.value.trim();
      if (!telefonnr) { showToast("Telefonnummer mangler.", "warning"); return; }
      if (!meldingTxt) return;
      if (meldingTxt.length > MAX_TEGN) {
        showToast(`Meldingen er for lang (maks ${MAX_TEGN} tegn).`, "warning"); return;
      }
      const sendBtn = document.getElementById("__smsBtnSend");
      sendBtn.disabled = true; sendBtn.textContent = "Sender…"; sendBtn.style.background = "#888";
      try {
        await sendSMS(info.id, telefonnr, meldingTxt);
        // Lås skjema – popup forblir åpen
        document.getElementById("__smsTo").disabled  = true;
        malSelect.disabled  = true;
        msgArea.disabled    = true;
        sendBtn.textContent = "✅ Sendt";
        sendBtn.style.background = "#27ae60";
        document.getElementById("__smsBtnAvbryt").textContent = "Lukk";
      } catch (e) {
        console.error("[SendSMS] Send feil:", e);
        showToast("Feil ved sending av SMS. Sjekk konsoll.", "error");
        sendBtn.disabled = false; sendBtn.textContent = "Send SMS"; sendBtn.style.background = "#025671";
      }
    });

    setTimeout(() => { (telefon ? msgArea : document.getElementById("__smsTo")).focus(); }, 50);
  }

  // ============================================================
  // MASSE-SENDING (2+ bestillinger)
  // ============================================================
  async function openMassePopup(rader) {
    const existing = document.getElementById("__sendSMSOverlay");
    if (existing) existing.remove();

    const items = rader.map(row => ({
      info:    extractRowInfo(row.id, row),
      telefon: null,
      status:  "laster",
    }));

    const { overlay, popup } = createPopupBase("660px");
    overlay.id = "__sendSMSOverlay";

    // Tittel
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "16px", borderBottom: "2px solid #025671", paddingBottom: "10px",
    });
    header.innerHTML = `
      <span style="font-size:15px;font-weight:bold;color:#025671;">📱 Send SMS – ${rader.length} bestillinger</span>
      <button id="__smsBtnLukk" title="Lukk (Esc)"
        style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#666;padding:0 2px;">×</button>
    `;
    popup.appendChild(header);

    // Mal-velger (påkrevd)
    const malRad = document.createElement("div");
    Object.assign(malRad.style, { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" });
    malRad.innerHTML = `
      <label style="font-weight:bold;flex-shrink:0;">Mal:</label>
      <select id="__smsMassMal"
        style="flex:1;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        <option value="">– Velg mal (påkrevd) –</option>
        ${SMS_MALER.map((m, i) => `<option value="${i}">${m.navn}</option>`).join("")}
      </select>
    `;
    popup.appendChild(malRad);

    // Forhåndsvisning av mal-tekst (vises ved mal-valg)
    const malPreview = document.createElement("div");
    Object.assign(malPreview.style, {
      display: "none", background: "#f9f9f9", border: "1px solid #ddd",
      borderRadius: "5px", padding: "8px 12px", marginBottom: "4px",
      fontSize: "12px", color: "#444", whiteSpace: "pre-wrap", lineHeight: "1.5",
    });
    popup.appendChild(malPreview);

    const malPreviewTegn = document.createElement("div");
    Object.assign(malPreviewTegn.style, {
      display: "none", textAlign: "right", fontSize: "11px",
      color: "#888", marginBottom: "12px",
    });
    popup.appendChild(malPreviewTegn);

    // Fritekst-felt (synlig når ingen mal er valgt)
    const fritekstWrap = document.createElement("div");
    fritekstWrap.style.marginBottom = "12px";
    fritekstWrap.innerHTML = `
      <textarea id="__smsMassFritekst" rows="4"
        style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;
               font-size:12px;resize:vertical;box-sizing:border-box;"></textarea>
      <div style="text-align:right;font-size:11px;margin-top:2px;">
        <span id="__smsMassTegn" style="color:#888;">0</span>
        <span style="color:#888;"> / ${MAX_TEGN} tegn</span>
      </div>
    `;
    popup.appendChild(fritekstWrap);

    // Tabell
    const tblWrap = document.createElement("div");
    Object.assign(tblWrap.style, { overflowX: "auto", marginBottom: "14px" });
    const tbl = document.createElement("table");
    Object.assign(tbl.style, { width: "100%", borderCollapse: "collapse", fontSize: "12px" });
    tbl.innerHTML = `
      <thead>
        <tr style="background:#025671;color:#fff;text-align:left;">
          <th style="padding:7px 8px;font-weight:600;">Pasient</th>
          <th style="padding:7px 8px;font-weight:600;">Fra → Til</th>
          <th style="padding:7px 8px;font-weight:600;width:110px;">Mobil</th>
          <th style="padding:7px 8px;font-weight:600;width:50px;text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody id="__smsMassTabell"></tbody>
    `;
    tblWrap.appendChild(tbl);
    popup.appendChild(tblWrap);

    // Bygg tabellrader
    const tbody = tbl.querySelector("#__smsMassTabell");
    items.forEach((item, i) => {
      const { info } = item;
      const visOppTid = info.reiseTid && info.oppTid && info.reiseTid < info.oppTid;
      const adresse = [
        kortTekst(info.fraAdresse, MAX_ADRESSE_LENGDE),
        kortTekst(info.tilAdresse, MAX_ADRESSE_LENGDE),
      ].filter(Boolean).join(" → ");

      const tr = document.createElement("tr");
      tr.style.background = i % 2 === 0 ? "#fff" : "#f8f8f8";
      tr.innerHTML = `
        <td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;">
          <strong>${kortTekst(info.pasientNavn, MAX_NAVN_LENGDE) || "(ukjent)"}</strong>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;color:#555;">
          ${adresse || "–"}
          <div style="color:#777;font-size:11px;margin-top:1px;">
            ${info.reiseTid ? `Hentetid: ${info.reiseTid}` : ""}
            ${visOppTid ? ` · Oppmøte: ${info.oppTid}` : ""}
          </div>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;" id="__smsTlf_${i}">
          <span style="color:#aaa;font-style:italic;">Henter…</span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle;"
            id="__smsSt_${i}">⏳</td>
      `;
      tbody.appendChild(tr);

      tr.style.cursor = "pointer";
      tr.title = "Klikk for å se SMS-forhåndsvisning";
      tr.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return;
        if (!malErValgt) return;
        visPreviewForItem(item);
        tbody.querySelectorAll("tr").forEach(r => r.style.outline = "");
        tr.style.outline = "2px solid #025671";
        tr.style.outlineOffset = "-2px";
      });
    });

    // Knapper
    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, { display: "flex", justifyContent: "flex-end", gap: "9px" });
    btnRow.innerHTML = `
      <button id="__smsBtnSend"
        style="padding:7px 20px;border:none;border-radius:5px;background:#aaa;
               color:#fff;font-size:13px;font-weight:bold;cursor:not-allowed;"
        disabled>Send SMS</button>
      <button id="__smsBtnAvbryt"
        style="padding:7px 18px;border:1px solid #ccc;border-radius:5px;
               background:#f5f5f5;cursor:pointer;font-size:13px;">Avbryt</button>
    `;
    popup.appendChild(btnRow);

    const closePopup = () => { document.removeEventListener("keydown", escHandler); overlay.remove(); };
    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });
    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    document.addEventListener("keydown", escHandler);

    // Oppdater Send-knapp
    function oppdaterSendKnapp(malValgt) {
      const sendBtn = document.getElementById("__smsBtnSend");
      if (!sendBtn) return;
      const fritekstTekst = document.getElementById("__smsMassFritekst")?.value.trim() || "";
      const sendOk = malValgt || fritekstTekst.length > 0;
      const antallGyldig = items.filter(it => erGyldigMobil(it.telefon || "")).length;
      if (!sendOk || antallGyldig === 0) {
        sendBtn.disabled = true;
        sendBtn.style.background = "#aaa";
        sendBtn.style.cursor = "not-allowed";
        sendBtn.textContent = "Send SMS";
      } else {
        sendBtn.disabled = false;
        sendBtn.style.background = "#025671";
        sendBtn.style.cursor = "pointer";
        sendBtn.textContent = antallGyldig < items.length
          ? `Send SMS til ${antallGyldig} av ${items.length}`
          : `Send SMS til ${antallGyldig}`;
      }
    }

    // Hent telefonnummer parallelt
    let malErValgt = false;
    Promise.all(items.map(async (item, i) => {
      const tlf = await fetchTelefon(item.info.id);
      item.telefon = tlf;
      const tlfCell = document.getElementById(`__smsTlf_${i}`);
      const stCell  = document.getElementById(`__smsSt_${i}`);
      if (!tlfCell) return;

      if (erGyldigMobil(tlf)) {
        item.status = "ok";
        tlfCell.innerHTML = `<span style="color:#27ae60;font-weight:bold;">${tlf}</span>`;
        if (stCell) stCell.innerHTML = `<span style="color:#27ae60;">✓</span>`;
      } else {
        item.status = "mangler";
        tlfCell.innerHTML = `
          <input type="text" placeholder="Fyll inn mobil" value=""
            style="width:90px;padding:4px 6px;border:2px solid #d9534f;
                   border-radius:4px;font-size:12px;color:#333;box-sizing:border-box;" />
          <div style="color:#d9534f;font-size:10px;margin-top:2px;">Ingen SMS sendes</div>
        `;
        if (stCell) stCell.innerHTML = `<span style="color:#d9534f;">✗</span>`;

        tlfCell.querySelector("input").addEventListener("input", (e) => {
          const val = e.target.value.trim();
          item.telefon = val;
          const gyldig = erGyldigMobil(val);
          e.target.style.borderColor = gyldig ? "#27ae60" : "#d9534f";
          const infoDiv = tlfCell.querySelector("div");
          if (infoDiv) infoDiv.style.display = gyldig ? "none" : "block";
          if (stCell) stCell.innerHTML = gyldig
            ? `<span style="color:#27ae60;">✓</span>`
            : `<span style="color:#d9534f;">✗</span>`;
          item.status = gyldig ? "ok" : "mangler";
          oppdaterSendKnapp(malErValgt);
        });
      }
      oppdaterSendKnapp(malErValgt);
    }));

    // Mal-valg og auto-valg
    const massMalSelect = document.getElementById("__smsMassMal");

    const autoIdx = SMS_MALER.findIndex(m =>
      m.autoVelgHvis && items.every(it => m.autoVelgHvis(it.info))
    );
    if (autoIdx !== -1) {
      massMalSelect.value = autoIdx;
      malErValgt = true;
      fritekstWrap.style.display = "none";
      if (items[0]) visPreviewForItem(items[0]);
      tbody.querySelector("tr")?.style.setProperty("outline", "2px solid #025671");
      tbody.querySelector("tr")?.style.setProperty("outline-offset", "-2px");
      oppdaterSendKnapp(true);
    }

    function visPreviewForItem(item) {
      const malIdx = parseInt(massMalSelect.value, 10);
      if (isNaN(malIdx) || !SMS_MALER[malIdx]) return;
      const tekst = SMS_MALER[malIdx].tekst(item.info).slice(0, MAX_TEGN);
      malPreview.innerHTML = `<span style="font-size:10px;color:#888;display:block;margin-bottom:5px;">📋 ${kortTekst(item.info.pasientNavn, MAX_NAVN_LENGDE)}</span>${tekst.replace(/\n/g, "<br>")}`;
      malPreview.style.display = "block";
      const len = tekst.length;
      malPreviewTegn.textContent = `${len} / ${MAX_TEGN} tegn`;
      malPreviewTegn.style.color = len >= MAX_TEGN ? "#d9534f" : len >= MAX_TEGN * 0.9 ? "#b09f2b" : "#888";
      malPreviewTegn.style.display = "block";
    }

    massMalSelect.addEventListener("change", () => {
      const idx  = parseInt(massMalSelect.value, 10);
      malErValgt = !isNaN(idx) && !!SMS_MALER[idx];

      if (malErValgt) {
        fritekstWrap.style.display = "none";
        // Auto-forhåndsvis første bestilling
        tbody.querySelectorAll("tr").forEach(r => r.style.outline = "");
        const firstItem = items[0];
        if (firstItem) {
          visPreviewForItem(firstItem);
          tbody.querySelector("tr")?.style.setProperty("outline", "2px solid #025671");
          tbody.querySelector("tr")?.style.setProperty("outline-offset", "-2px");
        }
      } else {
        malPreview.style.display = "none";
        malPreviewTegn.style.display = "none";
        fritekstWrap.style.display = "block";
        tbody.querySelectorAll("tr").forEach(r => r.style.outline = "");
      }
      oppdaterSendKnapp(malErValgt);
    });

    // Fritekst-tegnteller og Send-knapp-oppdatering
    document.getElementById("__smsMassFritekst").addEventListener("input", (e) => {
      const ta = e.target;
      if (ta.value.length > MAX_TEGN) ta.value = ta.value.slice(0, MAX_TEGN);
      const len = ta.value.length;
      const tegnSpan = document.getElementById("__smsMassTegn");
      if (tegnSpan) {
        tegnSpan.textContent = len;
        tegnSpan.style.color = len >= MAX_TEGN ? "#d9534f" : len >= MAX_TEGN * 0.9 ? "#b09f2b" : "#888";
      }
      oppdaterSendKnapp(malErValgt);
    });

    // Send
    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const malIdx      = parseInt(massMalSelect.value, 10);
      const harMal      = !isNaN(malIdx) && !!SMS_MALER[malIdx];
      const fritekstTekst = document.getElementById("__smsMassFritekst")?.value.trim() || "";
      if (!harMal && !fritekstTekst) return;

      const sendBtn   = document.getElementById("__smsBtnSend");
      const avbrytBtn = document.getElementById("__smsBtnAvbryt");
      sendBtn.disabled   = true;
      avbrytBtn.disabled = true;
      document.getElementById("__smsBtnLukk").style.pointerEvents = "none";

      const gyldige = items.filter(it => erGyldigMobil(it.telefon || ""));
      let antallSendt = 0;
      let antallFeil  = 0;

      for (const item of gyldige) {
        const i      = items.indexOf(item);
        const stCell = document.getElementById(`__smsSt_${i}`);
        if (stCell) stCell.textContent = "⏳";
        sendBtn.textContent = `Sender ${antallSendt + 1} / ${gyldige.length}…`;

        try {
          const melding = harMal
            ? SMS_MALER[malIdx].tekst(item.info).slice(0, MAX_TEGN)
            : fritekstTekst.slice(0, MAX_TEGN);
          await sendSMS(item.info.id, item.telefon.replace(/\s/g, ""), melding);
          if (stCell) stCell.innerHTML = `<span style="color:#27ae60;">✅</span>`;
          antallSendt++;
        } catch (e) {
          console.error("[SendSMS] Feil for", item.info.id, e);
          if (stCell) stCell.innerHTML = `<span style="color:#d9534f;">❌</span>`;
          antallFeil++;
        }
      }

      sendBtn.textContent = `✅ Sendt ${antallSendt}${antallFeil ? ` (${antallFeil} feil)` : ""}`;
      sendBtn.style.background = antallFeil ? "#b09f2b" : "#27ae60";
      // Lås skjema
      massMalSelect.disabled = true;
      const fritekstEl = document.getElementById("__smsMassFritekst");
      if (fritekstEl) fritekstEl.disabled = true;
      avbrytBtn.textContent = "Lukk";
      avbrytBtn.disabled = false;
      document.getElementById("__smsBtnLukk").style.pointerEvents = "";
      showToast(
        antallFeil ? `Sendt ${antallSendt}, feil på ${antallFeil}` : `✅ Alle ${antallSendt} SMS sendt`,
        antallFeil ? "warning" : "success"
      );
    });
  }

  // ============================================================
  // INNGANG: dispatcher enkelt vs. masse
  // ============================================================
  async function openSendSMSPopup() {
    const rader = getVentendeRader();
    if (rader.length === 0) {
      showToast("Merk minst én bestilling i ventende oppdrag.", "warning");
      return;
    }
    if (rader.length === 1) {
      const info = extractRowInfo(rader[0].id, rader[0]);
      const telefon = await fetchTelefon(rader[0].id);
      openEnkeltPopup(info, telefon);
    } else {
      openMassePopup(rader);
    }
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