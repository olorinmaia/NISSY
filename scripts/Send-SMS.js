// SendSMS.js – Egendefinert SMS-utsending (Alt+C)
// Støtter enkelt- og masse-sending, egendefinerte maler,
// automatisk utfylling fra bestillingsdata, og ISO-8859-1-encoding.
(function () {
  "use strict";

  if (window.__sendSMSActive) {
    console.log("✅ SendSMS er allerede aktiv");
    return;
  }

  // ── Kontor-tilgang ───────────────────────────────────────────
  const SEND_SMS_OFFICES = [
    'Pasientreiser Nord-Trøndelag',
    // Legg til flere kontorer her etter hvert
  ];
  const _officeCell  = document.querySelector('.topframe_small');
  const _officeMatch = _officeCell?.textContent.match(/Pasientreisekontor for (.+?)\s+(?:&nbsp;|-)/);
  const _office      = _officeMatch?.[1]?.trim() || null;
  if (!_office || !SEND_SMS_OFFICES.includes(_office)) {
    console.log(`ℹ️ SendSMS ikke tilgjengelig for kontor: ${_office || '(ukjent)'}`);
    return;
  }

  window.__sendSMSActive = true;

  // ============================================================
  // MALER PER KONTOR
  //
  // Hver kontor-nøkkel må matche eksakt navn i SEND_SMS_OFFICES.
  // Tre mal-typer per kontor:
  //   bestilling  – enkelt/masse-modus (har tilgang til info-variabler)
  //   fritekst    – ingen bestilling merket (kun statiske tekster)
  //   sjaafor     – sjåfør-SMS via ressurser-tabell (kun statiske tekster)
  //
  // Tilgjengelige variabler i bestilling-maler:
  //   info.pasientNavn  – f.eks. "Johnsen, Alf"
  //   info.fornavn      – f.eks. "Alf"
  //   info.reiseTid     – f.eks. "18:36"
  //   info.oppTid       – f.eks. "19:00"
  //   info.fraAdresse   – f.eks. "Brubakken 15, 7608 Levanger"
  //   info.tilAdresse   – f.eks. "St. Olavs Hospital, 7006 Trondheim"
  // autoVelgHvis(info): valgfri – returnerer true for å auto-velge malen
  // ============================================================

  const MALER_PER_KONTOR = {

    // ----------------------------------------------------------
    // Pasientreiser Nord-Trøndelag
    // ----------------------------------------------------------
    'Pasientreiser Nord-Trøndelag': {

      bestilling: [
        {
          navn: "Hentetidspunkt",
          tekst: (info) =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise er planlagt med henting ${formaterTid(info.reiseTid)} fra ${info.fraAdresse}.\nHentetid kan variere med +/- 15 minutter.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Planlagt reise til behandling",
          tekst: (info) =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise til ${info.tilAdresse} med oppmøte ${formaterTid(info.oppTid)} er planlagt.\nHenting ca. ${formaterTid(info.reiseTid)} fra ${info.fraAdresse}.\nHentetid kan variere med +/- 15 minutter.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Trondheim lufthavn",
          autoVelgHvis: (info) =>
            /trondheim lufthavn|værnes|TRD/i.test(info.fraAdresse),
          tekst: (info) =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn med henting ${formaterTid(info.reiseTid)}.\nRing 05515 når du har landet og er reiseklar slik at vi kan tildele din bestilling til transportør.\n\nDu kan se og endre dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Trondheim lufthavn - utenfor åpningstid",
          tekst: (info) =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn med henting ${formaterTid(info.reiseTid)} som er tildelt transportør.\nRing 07373 når du har landet og er reiseklar.\n\nDu kan se dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Ring oss tilbake",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515. \n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Forsinkelse",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDin transport er dessverre forsinket. Vi beklager ulempene dette medfører. For spørsmål ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
      ],

      fritekst: [
        {
          navn: "Hentetidspunkt",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise er planlagt med henting kl. TT:MM.\nHentetid kan variere med +/- 15 minutter.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Trondheim lufthavn",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn.\nRing 05515 når du har landet og er reiseklar slik at vi kan tildele din bestilling til transportør.\n\nDu kan se og endre dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Trondheim lufthavn - utenfor åpningstid",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn som er tildelt transportør.\nRing 07373 når du har landet og er reiseklar.\n\nDu kan se dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Ring oss tilbake",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515. \n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Forsinkelse",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDin transport er dessverre forsinket. Vi beklager ulempene dette medfører. For spørsmål ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Tildelt bestilling i ventetiden",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDet er tildelt en bestilling på taksameter som ønskes utført i ventetiden. For spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
      ],

      sjaafor: [
        {
          navn: "Tildelt bestilling i ventetiden",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nDet er tildelt en bestilling på taksameter som ønskes utført i ventetiden. For spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
        {
          navn: "Ring oss tilbake",
          tekst: () =>
            `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
        },
      ],

    },

    // ----------------------------------------------------------
    // Legg til nye kontor her:
    // ----------------------------------------------------------
    // 'Pasientreiser Sør-Trøndelag': {
    //   bestilling: [ ... ],
    //   fritekst:   [ ... ],
    //   sjaafor:    [ ... ],
    // },

  };

  // Hent maler for innlogget kontor
  const _kontorMaler    = MALER_PER_KONTOR[_office] || {};
  const SMS_MALER         = _kontorMaler.bestilling || [];
  const SMS_MALER_FRITEKST = _kontorMaler.fritekst  || [];
  const SMS_MALER_SJAAFOR  = _kontorMaler.sjaafor   || [];
  // ============================================================
  // ============================================================
  const MAX_TEGN           = 480;
  const MAX_NAVN_LENGDE    = 22;
  const MAX_ADRESSE_LENGDE = 28;
  // ============================================================

  function kortTekst(str, maks) {
    if (!str) return "";
    return str.length > maks ? str.slice(0, maks) + "…" : str;
  }

  function titleCase(str) {
    if (!str) return "";
    return str.toLowerCase()
      .split(/( |-)/g)
      .map(part => part.length > 0 && part !== " " && part !== "-"
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part)
      .join("");
  }

  // Formaterer tidstreng fra NISSY til lesbar SMS-tekst.
  // Samme dag: "16:59"     → "kl. 16:59"
  // Frem i tid: "06.03 08:00" → "06.03 kl. 08:00"
  function formaterTid(str) {
    if (!str) return str;
    const fremTid = str.match(/^(\d{2}\.\d{2})\s+(\d{2}:\d{2})$/);
    if (fremTid) return `${fremTid[1]} kl. ${fremTid[2]}`;
    const sammeDag = str.match(/^(\d{2}:\d{2})$/);
    if (sammeDag) return `kl. ${sammeDag[1]}`;
    return str;
  }

  function cleanAddressSuffixes(address) {
    if (!address) return address;
    return address.replace(/\s+[HU]\d{4}(?=,)/g, '');
  }

  // Normaliserer adresser fra CAPSLOCK til lesbar form.
  // Regler per mellomrom-separert token:
  //   – Inneholder både bokstav og siffer (f.eks. "7A", "25B", "10A") → behold store bokstaver
  //   – Er nøyaktig "veg", "vei" eller "gate" (uansett case) → skriv med små bokstaver
  //   – Alt annet → stor forbokstav, resten små
  // Kommaer og andre tegn bevares; behandles per token rundt komma.
  function normaliserAdresse(address) {
    if (!address) return address;

    // Normaliser kun vegadresser – disse kjennetegnes ved at delen før første komma
    // slutter på et husnummer (siffer, evt. etterfulgt av én bokstav): "35C," / "24,"
    // Behandlingssteder som "St. Olavs Hospital, 7006 Trondheim" har ikke dette mønsteret.
    const erVegadresse = /\d+[A-ZÆØÅa-zæøå]?\s*,/.test(address);
    if (!erVegadresse) return address;

    const ALLTID_LITEN = /^(veg|vei|gate)$/i;
    const BOKSTAV_OG_TALL = /^[a-zA-ZæøåÆØÅ]*\d+[a-zA-ZæøåÆØÅ]+$|^[a-zA-ZæøåÆØÅ]+\d+[a-zA-ZæøåÆØÅ]*$/;

    return address.replace(/[^\s,]+/g, token => {
      if (ALLTID_LITEN.test(token)) return token.toLowerCase();
      if (BOKSTAV_OG_TALL.test(token)) return token.toUpperCase();
      // Stor forbokstav, resten små – håndterer norske tegn
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    });
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
  // ENGANGS XHR-INTERCEPTOR + RE-MARKERING
  // ============================================================
  function onceAfterOpenPopp(callback) {
    const originalOpen = XMLHttpRequest.prototype.open;
    let restored = false;
    const restore = () => {
      if (!restored) { restored = true; XMLHttpRequest.prototype.open = originalOpen; }
    };
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === "string" && url.includes("action=openres") && url.includes("rid=-1")) {
        restore();
        this.addEventListener("load", () => setTimeout(callback, 50), { once: true });
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    setTimeout(restore, 3000);
  }

  function reMarkerRader(rowIds) {
    rowIds.forEach(rowId => {
      try {
        if (typeof selectRow !== "function") return;
        if (rowId.startsWith("P-") && typeof g_poppLS !== "undefined") {
          selectRow(rowId, g_poppLS);
        } else if (typeof g_voppLS !== "undefined") {
          selectRow(rowId, g_voppLS);
        }
      } catch (e) { /* ignorer hvis rad ikke finnes */ }
    });
  }

  function lukkOgOppdater(rowIds) {
    if (typeof openPopp !== "function") return;
    onceAfterOpenPopp(() => reMarkerRader(rowIds));
    openPopp("-1");
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
  // HENT ALLE MERKEDE PÅGÅENDE OPPDRAG
  // ============================================================
  function getPaagaaendeRader() {
    const SELECTED_BG = "rgb(148, 169, 220)";
    return Array.from(document.querySelectorAll("#pagaendeoppdrag tbody tr"))
      .filter(r => r.id && r.id.startsWith("P-") && r.style.backgroundColor === SELECTED_BG);
  }

  // Ekstraher enkeltbestillinger fra én pågående-rad.
  // Returnerer array av booking-objekter med valgbar=true for multi-booking rader.
  function extractPaagaaendeBookings(tr, idxMap) {
    const cells = tr.querySelectorAll("td");

    // RID hentes fra toggleManualStatusRequisition – finnes alltid på alle bestillinger,
    // til forskjell fra removePaagaaendeOppdrag som mangler på enkeltrad og første multi-booking.
    const statusImgs = Array.from(tr.querySelectorAll("img[onclick*='toggleManualStatusRequisition']"));
    const rids = statusImgs
      .map(img => img.getAttribute("onclick").match(/toggleManualStatusRequisition\(this,(\d+)\)/)?.[1])
      .filter(Boolean);

    if (rids.length === 0) return [];

    const isMulti = rids.length > 1;

    if (!isMulti) {
      const getText = (idx) => cells[idx]?.textContent.trim().replace(/\s+/g, " ") || "";
      const navn = titleCase(getText(idxMap.navn));
      return [{
        id:          `V-${rids[0]}`,
        pasientNavn: navn,
        fornavn:     navn.match(/,\s*(.+)/)?.[1]?.trim() || "",
        reiseTid:    getText(idxMap.reiseTid),
        oppTid:      getText(idxMap.oppTid),
        fraAdresse:  normaliserAdresse(cleanAddressSuffixes(getText(idxMap.fra))),
        tilAdresse:  normaliserAdresse(cleanAddressSuffixes(getText(idxMap.til))),
        valgbar:     false,
      }];
    } else {
      const getDivTexts = (idx) =>
        Array.from(cells[idx]?.querySelectorAll(".row-image") || [])
          .map(d => d.textContent.trim().replace(/\s+/g, " "));

      const starts  = getDivTexts(idxMap.reiseTid);
      const opptids = getDivTexts(idxMap.oppTid);
      const navns   = getDivTexts(idxMap.navn);
      const fraer   = getDivTexts(idxMap.fra);
      const tiler   = getDivTexts(idxMap.til);

      return rids.map((rid, i) => {
        const navn = titleCase(navns[i] || "");
        return {
          id:          `V-${rid}`,
          pasientNavn: navn,
          fornavn:     navn.match(/,\s*(.+)/)?.[1]?.trim() || "",
          reiseTid:    starts[i]  || "",
          oppTid:      opptids[i] || "",
          fraAdresse:  normaliserAdresse(cleanAddressSuffixes(fraer[i] || "")),
          tilAdresse:  normaliserAdresse(cleanAddressSuffixes(tiler[i] || "")),
          valgbar:     true,
        };
      });
    }
  }


  function extractRowInfo(id, row, idxMap) {
    const cells = row.querySelectorAll("td");
    const pasientNavn  = titleCase(cells[idxMap.navn]?.textContent.trim().replace(/\s+/g, " ") || "");
    const fornavnMatch = pasientNavn.match(/,\s*(.+)/);
    const fornavn      = fornavnMatch ? fornavnMatch[1].trim() : "";
    const reiseTid     = cells[idxMap.reiseTid]?.textContent.trim().replace(/\s+/g, " ") || "";
    const oppTid       = cells[idxMap.oppTid]?.textContent.trim().replace(/\s+/g, " ") || "";

    let fraAdresse = "", tilAdresse = "";
    const fraCell = cells[idxMap.fra];
    if (fraCell) {
      const parts = fraCell.innerHTML.split(/<br\s*\/?>/i);
      fraAdresse = normaliserAdresse(cleanAddressSuffixes((parts[0] || "").replace(/<[^>]+>/g, "").trim()));
      tilAdresse = normaliserAdresse(cleanAddressSuffixes((parts[1] || "").replace(/<[^>]+>/g, "").trim()));
    }

    return { id, pasientNavn, fornavn, reiseTid, oppTid, fraAdresse, tilAdresse };
  }

  // ============================================================
  // HENT TELEFONNUMMER VIA NISSY
  // Primær: showSendSMS (smsTo-felt)
  // Fallback: showreq (Tlf fra EPJ)
  // ============================================================
  async function fetchTelefon(rowId) {
    // Hent rid som tall – rowId er f.eks. "V-53221832"
    const rid = rowId.replace(/^[A-Z]-/i, "");

    try {
      const url = `/planlegging/ajax-dispatch?update=false&action=showSendSMS&id=${encodeURIComponent(rowId)}`;
      const resp = await fetch(url, { credentials: "include" });
      const html = await resp.text();
      let m = html.match(/id=["']smsTo["'][^>]*value=["']([^"']*)["']/i);
      if (!m) m = html.match(/value=["']([^"']*)["'][^>]*id=["']smsTo["']/i);
      const tlf = m?.[1]?.trim() || "";
      if (tlf) return tlf;
    } catch (e) {
      console.error("[SendSMS] fetchTelefon (showSendSMS) feil:", e);
    }

    // Fallback: hent fra rekvisisjonsvisning
    try {
      const url2 = `/planlegging/ajax-dispatch?update=false&action=showreq&rid=${encodeURIComponent(rid)}`;
      const resp2 = await fetch(url2, { credentials: "include" });
      const html2 = await resp2.text();
      const m2 = html2.match(/Tlf fra EPJ:<\/td>\s*<td[^>]*class="reqv_value"[^>]*>([^<]+)<\/td>/i);
      const tlf2 = (m2?.[1]?.trim() || "").replace(/^\+47/, "");
      if (tlf2) console.log(`[SendSMS] Bruker 'Tlf fra EPJ' for rid ${rid}: ${tlf2}`);
      return tlf2;
    } catch (e) {
      console.error("[SendSMS] fetchTelefon (showreq) feil:", e);
      return "";
    }
  }

  // ============================================================
  // SEND SMS VIA AJAX-DISPATCH (XHR, som NISSY bruker internt)
  // ============================================================
  // ============================================================
  // HENT REKVISISJONSNUMMER FRA RID (for logging)
  // Ventende: title-attributt på tr[name=rid] i #ventendeoppdrag
  // Pågående: searchStatus?nr= i question.gif onclick for aktuell rid
  // ============================================================
  function hentRekvnrFraRid(rid) {
    // Ventende: title="rekvnr" på raden
    const vRow = document.querySelector(`#ventendeoppdrag tr[name="${rid}"]`);
    if (vRow) return vRow.getAttribute("title") || null;

    // Pågående: finn riktig row-image via posisjon (indeks) av statusImg i sin td,
    // søk deretter question.gif i samme-indekserte row-image i siste td.
    const statusImg = document.querySelector(
      `#pagaendeoppdrag img[onclick*="toggleManualStatusRequisition(this,${rid})"]`
    );
    if (statusImg) {
      const rowImageDiv = statusImg.closest(".row-image");
      if (rowImageDiv) {
        // Finn hvilken indeks denne row-image har i sin parent-td
        const siblings = Array.from(rowImageDiv.parentElement.querySelectorAll(".row-image"));
        const idx = siblings.indexOf(rowImageDiv);
        // Gå opp til tr og finn siste td
        const tr = rowImageDiv.closest("tr");
        if (tr && idx !== -1) {
          const tds = tr.querySelectorAll("td");
          const lastTd = tds[tds.length - 1];
          const rowImages = lastTd?.querySelectorAll(".row-image");
          const targetDiv = rowImages?.[idx];
          if (targetDiv) {
            const qImg = targetDiv.querySelector(`img[onclick*="searchStatus?nr="]`);
            if (qImg) {
              const m = qImg.getAttribute("onclick").match(/searchStatus\?nr=(\d+)/);
              if (m) return m[1];
            }
          }
        }
      } else {
        // Enkeltbestilling uten row-image-divs
        const pRow = statusImg.closest("tr");
        if (pRow) {
          const qImg = pRow.querySelector(`img[onclick*="searchStatus?nr="]`);
          if (qImg) {
            const m = qImg.getAttribute("onclick").match(/searchStatus\?nr=(\d+)/);
            if (m) return m[1];
          }
        }
      }
    }
    return null;
  }

  function sendSMS(rowId, telefon, melding) {
    return new Promise((resolve, reject) => {
      const url =
        `/planlegging/ajax-dispatch` +
        `?update=false&action=setSendSMS` +
        `&to=${encodeURIComponent(telefon)}` +
        `&message=${encodeISO(melding)}` +
        `&id=${encodeURIComponent(rowId)}` +
        `&template=`;
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.withCredentials = true;
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(true);
        else reject(new Error(`HTTP ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Nettverksfeil"));
      xhr.send();
    });
  }

  // ============================================================
  // ENKELT-SENDING (1 bestilling)
  // ============================================================
  async function openEnkeltPopup(info, telefon, reselektId = null) {
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

    const malSelect = document.getElementById("__smsMal");
    const msgArea   = document.getElementById("__smsMsg");
    const tegnSpan  = document.getElementById("__smsTegn");

    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    let lukket = false;
    const closePopup = () => {
      if (lukket) return; lukket = true;
      document.removeEventListener("keydown", escHandler); overlay.remove(); lukkOgOppdater(reselektId ? [reselektId] : [info.id]);
    };

    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    document.addEventListener("keydown", escHandler);

    function oppdaterEnkeltSendKnapp() {
      const sendBtn   = document.getElementById("__smsBtnSend");
      const smsTo     = document.getElementById("__smsTo");
      const telefonnr = smsTo?.value.trim() || "";
      const harTekst  = msgArea.value.trim().length > 0;
      const gyldigTlf = erGyldigMobil(telefonnr);
      const aktiv     = gyldigTlf && harTekst;
      sendBtn.disabled         = !aktiv;
      sendBtn.style.background = aktiv ? "#025671" : "#aaa";
      sendBtn.style.cursor     = aktiv ? "pointer" : "not-allowed";
      if (smsTo && telefonnr.length > 0) {
        smsTo.style.borderColor = gyldigTlf ? "#ccc" : "#d9534f";
      } else if (smsTo) {
        smsTo.style.borderColor = "#ccc";
      }
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
      else {
        msgArea.value = "";
        oppdaterTegnteller();
      }
    });

    msgArea.addEventListener("input", () => {
      if (msgArea.value.length > MAX_TEGN) msgArea.value = msgArea.value.slice(0, MAX_TEGN);
      oppdaterTegnteller();
    });

    document.getElementById("__smsTo").addEventListener("input", oppdaterEnkeltSendKnapp);

    const autoIdx = SMS_MALER.findIndex(m => m.autoVelgHvis?.(info));
    if (autoIdx !== -1) velgMal(autoIdx);
    else oppdaterEnkeltSendKnapp();

    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const telefonnr  = document.getElementById("__smsTo").value.trim();
      const meldingTxt = msgArea.value.trim();
      if (!erGyldigMobil(telefonnr)) { showToast("Ugyldig mobilnummer (8 siffer).", "warning"); return; }
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
        // Logg SMS
        if (typeof window.nissyLoggSMS === "function") {
          const rid    = info.id.replace(/^[A-Z]-/i, "");
          const rekvnr = hentRekvnrFraRid(rid);
          const malIdx = parseInt(malSelect.value, 10);
          const malNavn = (!isNaN(malIdx) && SMS_MALER[malIdx]) ? SMS_MALER[malIdx].navn : "Fritekst";
          window.nissyLoggSMS([{ reqId: rid, title: rekvnr || rid, mal: malNavn }]);
        }
      } catch (e) {
        console.error("[SendSMS] Send feil:", e);
        showToast("Feil ved sending av SMS. Sjekk konsoll.", "error");
        sendBtn.disabled = false; sendBtn.textContent = "Send SMS"; sendBtn.style.background = "#025671";
      }
    });

    setTimeout(() => document.getElementById("__smsMal").focus(), 50);
  }

  // ============================================================
  // MASSE-SENDING (2+ bestillinger)
  // Tar en liste med {id, pasientNavn, fornavn, reiseTid, oppTid, fraAdresse, tilAdresse, valgbar}
  // ============================================================
  async function openMassePopup(infoObjekter, ekstraReselektIds = []) {
    const existing = document.getElementById("__sendSMSOverlay");
    if (existing) existing.remove();

    const items = infoObjekter.map(info => ({
      info,
      telefon:    null,
      inkludert:  true,  // kan settes false via checkbox
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
      <span style="font-size:15px;font-weight:bold;color:#025671;">📱 Send SMS – ${items.length} bestillinger</span>
      <button id="__smsBtnLukk" title="Lukk (Esc)"
        style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#666;padding:0 2px;">×</button>
    `;
    popup.appendChild(header);

    // Mal-velger
    const malRad = document.createElement("div");
    Object.assign(malRad.style, { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" });
    malRad.innerHTML = `
      <label style="font-weight:bold;flex-shrink:0;">Mal:</label>
      <select id="__smsMassMal"
        style="flex:1;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        <option value="">– Velg mal –</option>
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
          <th style="padding:7px 8px;font-weight:600;width:24px;text-align:center;"></th>
          <th style="padding:7px 8px;font-weight:600;">Pasient</th>
          <th style="padding:7px 8px;font-weight:600;">Fra → Til</th>
          <th style="padding:7px 8px;font-weight:600;width:90px;">Mobil</th>
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

      const cbDisabled = !info.valgbar ? "disabled title=\"Kan ikke velges bort\"" : "";
      tr.innerHTML = `
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle;">
          <input type="checkbox" data-idx="${i}" ${cbDisabled} checked
            style="cursor:${info.valgbar ? "pointer" : "default"};width:14px;height:14px;" />
        </td>
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

      // Checkbox-logikk
      const cb = tr.querySelector(`input[data-idx="${i}"]`);
      if (info.valgbar) {
        cb.addEventListener("change", () => {
          item.inkludert = cb.checked;
          tr.style.opacity = cb.checked ? "1" : "0.4";
          oppdaterSendKnapp(malErValgt);
        });
      }

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

    const rowIds = [
      ...items.map(it => it.info.id).filter(id => !id.startsWith("P-")),
      ...ekstraReselektIds,
    ];
    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    let lukket = false;
    const closePopup = () => {
      if (lukket) return; lukket = true;
      document.removeEventListener("keydown", escHandler); overlay.remove(); lukkOgOppdater(rowIds);
    };

    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    document.addEventListener("keydown", escHandler);

    function oppdaterSendKnapp(malValgt) {
      const sendBtn = document.getElementById("__smsBtnSend");
      if (!sendBtn) return;
      const fritekstTekst = document.getElementById("__smsMassFritekst")?.value.trim() || "";
      const sendOk = malValgt || fritekstTekst.length > 0;
      const inkluderte = items.filter(it => it.inkludert);
      const antallGyldig = inkluderte.filter(it => erGyldigMobil(it.telefon || "")).length;
      const antallTotal  = inkluderte.length;
      if (!sendOk || antallGyldig === 0) {
        sendBtn.disabled = true;
        sendBtn.style.background = "#aaa";
        sendBtn.style.cursor = "not-allowed";
        sendBtn.textContent = "Send SMS";
      } else {
        sendBtn.disabled = false;
        sendBtn.style.background = "#025671";
        sendBtn.style.cursor = "pointer";
        sendBtn.textContent = antallGyldig < antallTotal
          ? `Send SMS til ${antallGyldig} av ${antallTotal}`
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

      const gyldige = items.filter(it => it.inkludert && erGyldigMobil(it.telefon || ""));
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

        if (gyldige.indexOf(item) < gyldige.length - 1) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }

      sendBtn.textContent = `✅ Sendt ${antallSendt}${antallFeil ? ` (${antallFeil} feil)` : ""}`;
      sendBtn.style.background = antallFeil ? "#b09f2b" : "#27ae60";
      // Lås skjema
      massMalSelect.disabled = true;
      const fritekstEl = document.getElementById("__smsMassFritekst");
      if (fritekstEl) fritekstEl.disabled = true;
      tbl.querySelectorAll("input[type='checkbox']").forEach(cb => { cb.disabled = true; });
      avbrytBtn.textContent = "Lukk";
      avbrytBtn.disabled = false;
      document.getElementById("__smsBtnLukk").style.pointerEvents = "";
      showToast(
        antallFeil ? `Sendt ${antallSendt}, feil på ${antallFeil}` : `✅ Alle ${antallSendt} SMS sendt`,
        antallFeil ? "warning" : "success"
      );
      // Logg vellykkede SMS-sendinger
      if (typeof window.nissyLoggSMS === "function" && antallSendt > 0) {
        const malNavn = harMal ? SMS_MALER[malIdx].navn : "Fritekst";
        const loggDetails = gyldige
          .filter((_, gi) => {
            const stCell = document.getElementById(`__smsSt_${items.indexOf(gyldige[gi])}`);
            return stCell?.innerHTML.includes("✅");
          })
          .map(item => {
            const rid    = item.info.id.replace(/^[A-Z]-/i, "");
            const rekvnr = hentRekvnrFraRid(rid);
            return { reqId: rid, title: rekvnr || rid, mal: malNavn };
          });
        if (loggDetails.length > 0) window.nissyLoggSMS(loggDetails);
      }
    });

    setTimeout(() => document.getElementById("__smsMassMal").focus(), 50);
  }

  // ============================================================
  // FRITEKST-MODUS (ingen bestilling valgt)
  // ============================================================
  function openFritekstPopup() {
    const existing = document.getElementById("__sendSMSOverlay");
    if (existing) existing.remove();

    const { overlay, popup } = createPopupBase("480px");
    overlay.id = "__sendSMSOverlay";

    // Tittel
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
      `<input id="__smsTo" type="text"
         style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;" />`);

    skjemaRad("Mal:",
      `<select id="__smsMal" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        <option value="">– Velg mal –</option>
        ${SMS_MALER_FRITEKST.map((m, i) => `<option value="${i}">${m.navn}</option>`).join("")}
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

    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    let lukket = false;
    const closePopup = () => {
      if (lukket) return; lukket = true;
      document.removeEventListener("keydown", escHandler); overlay.remove();
      if (typeof openPopp === "function") openPopp("-1");
    };
    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    document.addEventListener("keydown", escHandler);

    const malSelect = document.getElementById("__smsMal");
    const msgArea   = document.getElementById("__smsMsg");
    const tegnSpan  = document.getElementById("__smsTegn");

    function oppdaterSendKnapp() {
      const sendBtn   = document.getElementById("__smsBtnSend");
      const smsTo     = document.getElementById("__smsTo");
      const telefonnr = smsTo?.value.trim() || "";
      const gyldigTlf = erGyldigMobil(telefonnr);
      const aktiv     = gyldigTlf && msgArea.value.trim().length > 0;
      sendBtn.disabled         = !aktiv;
      sendBtn.style.background = aktiv ? "#025671" : "#aaa";
      sendBtn.style.cursor     = aktiv ? "pointer" : "not-allowed";
      if (smsTo && telefonnr.length > 0) {
        smsTo.style.borderColor = gyldigTlf ? "#ccc" : "#d9534f";
      } else if (smsTo) {
        smsTo.style.borderColor = "#ccc";
      }
    }

    function oppdaterTegnteller() {
      const len = msgArea.value.length;
      tegnSpan.textContent = len;
      tegnSpan.style.color = len >= MAX_TEGN ? "#d9534f" : len >= MAX_TEGN * 0.9 ? "#b09f2b" : "#888";
      oppdaterSendKnapp();
    }

    malSelect.addEventListener("change", () => {
      const idx = parseInt(malSelect.value, 10);
      if (!isNaN(idx) && SMS_MALER_FRITEKST[idx]) {
        msgArea.value        = SMS_MALER_FRITEKST[idx].tekst().slice(0, MAX_TEGN);
        msgArea.style.height = "auto";
        msgArea.style.height = msgArea.scrollHeight + "px";
      } else {
        msgArea.value = "";
      }
      oppdaterTegnteller();
    });

    msgArea.addEventListener("input", () => {
      if (msgArea.value.length > MAX_TEGN) msgArea.value = msgArea.value.slice(0, MAX_TEGN);
      oppdaterTegnteller();
    });

    document.getElementById("__smsTo").addEventListener("input", oppdaterSendKnapp);

    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const telefonnr  = document.getElementById("__smsTo").value.trim();
      const meldingTxt = msgArea.value.trim();
      if (!erGyldigMobil(telefonnr) || !meldingTxt) return;
      const sendBtn = document.getElementById("__smsBtnSend");
      sendBtn.disabled = true; sendBtn.textContent = "Sender…"; sendBtn.style.background = "#888";
      try {
        // Fritekst-modus har ingen rad-ID – bruker tom streng
        await sendSMS("", telefonnr, meldingTxt);
        document.getElementById("__smsTo").disabled = true;
        malSelect.disabled  = true;
        msgArea.disabled    = true;
        sendBtn.textContent = "✅ Sendt";
        sendBtn.style.background = "#27ae60";
        document.getElementById("__smsBtnAvbryt").textContent = "Lukk";
      } catch (e) {
        console.error("[SendSMS] Feil:", e);
        showToast("Feil ved sending av SMS. Sjekk konsoll.", "error");
        sendBtn.disabled = false; sendBtn.textContent = "Send SMS"; sendBtn.style.background = "#025671";
      }
    });

    setTimeout(() => document.getElementById("__smsTo").focus(), 50);
  }

  // ============================================================
  // SJÅFØR-SMS (åpnes fra høyreklikk-meny på ressurs)
  // ============================================================

  // Henter telefonnummer fra SUTI 3003 for en ressurs-rad.
  // Returnerer streng eller null.
  async function fetchSjaaforTelefon(licensePlate, turId) {
    try {
      // 1) POST til searchStatus for å finne requisitionId
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/administrasjon/admin/searchStatus", false);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(
        "submit_action=tripSearch&requisitionNumber=&attestId=&ssn=&treatmentDateFromSsn=" +
        "&treatmentDateToSsn=&lastName=&firstName=&treatmentDateFromName=&treatmentDateToName=" +
        "&council=-999999&tripNr=" + encodeURIComponent(turId) +
        "&treatmentDateFromCommissioner=&treatmentDateToCommissioner=&commissionerUsername=" +
        "&chosenDispatchCenter.id=&treatmentDateFromAttention=&treatmentDateToAttention=" +
        "&_attentionUnresolvedOnly=on&dbSelect=1"
      );
      if (xhr.status !== 200) return null;

      const m = xhr.responseText.match(/getRequisitionDetails\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return null;
      const [, requisitionId, db, tripId, highlightTripNr] = m;

      // 2) Hent detaljer inkl. SUTI-XML-lenker
      const detailUrl =
        "/administrasjon/admin/ajax_reqdetails?id=" + requisitionId +
        "&db=" + db + "&tripid=" + tripId +
        "&showSutiXml=true&hideEvents=&full=true&highlightTripNr=" + highlightTripNr;
      const detailResp = await fetch(detailUrl);
      const detailHtml = await detailResp.text();

      // 3) Finn første/nyeste 3003-URL
      let latest3003Url = null;
      for (const row of detailHtml.split("<tr")) {
        const sutiMatch = row.match(/<td\s+valign="top">(\d+)/);
        if (sutiMatch?.[1] !== "3003") continue;
        const linkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
        if (linkMatch) { latest3003Url = linkMatch[1]; break; }
      }
      if (!latest3003Url) return null;

      // 4) Parse 3003-XML for telefonnummer
      const resp3003  = await fetch(latest3003Url);
      const buf3003   = await resp3003.arrayBuffer();
      let decoded     = new TextDecoder("iso-8859-1").decode(buf3003);
      if (decoded.includes("charset=UTF-8") && !decoded.includes("�")) {
        decoded = new TextDecoder("utf-8").decode(buf3003);
      }

      const pre3003 = decoded.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      let xmlStr;
      if (pre3003) {
        // HTML-unescape via textarea (samme metode som Ressursinfo.js)
        const txt = document.createElement("textarea");
        txt.innerHTML = pre3003[1].trim();
        xmlStr = txt.value;
      } else {
        xmlStr = decoded;
      }

      const parser  = new DOMParser();
      const xmlDoc  = parser.parseFromString(xmlStr, "text/xml");

      // ITF/Cencom-format
      const driverPhone = xmlDoc.querySelector(
        'resourceDispatch > driver > contactInfoDriver > contactInfo[contactType="phone"]'
      );
      if (driverPhone) return driverPhone.getAttribute("contactInfo")?.trim() || null;

      // Frogne-format (fallback)
      for (const veh of xmlDoc.querySelectorAll("resourceDispatch > vehicle")) {
        if (veh.querySelector("idVehicle")?.getAttribute("id") === licensePlate) {
          const ph = veh.querySelector('contactInfoVehicle > contactInfo[contactType="phone"]');
          if (ph) return ph.getAttribute("contactInfo")?.trim() || null;
        }
      }
      return null;
    } catch (e) {
      console.error("[SendSMS] fetchSjaaforTelefon feil:", e);
      return null;
    }
  }

  async function openSjaaforPopup(row) {
    if (document.getElementById("__sendSMSOverlay")) return;

    const licensePlate = row.querySelector("td[id*='loyvexxx']")?.textContent.trim() || "";
    const ressursId    = row.id;

    const turId = row.querySelector("img[onclick*='searchStatus?id=']")
      ?.getAttribute("onclick")?.match(/searchStatus\?id=(\d+)/)?.[1];
    if (!turId) {
      showToast("Fant ikke ressursens turn-ID.", "warning");
      return;
    }

    const har3003 = !/-\d{7,}$/.test(licensePlate);
    let telefon = null;
    if (har3003) {
      telefon = await fetchSjaaforTelefon(licensePlate, turId);
    }

    const { overlay, popup } = createPopupBase("480px");
    overlay.id = "__sendSMSOverlay";

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "16px", borderBottom: "2px solid #5a7a5a", paddingBottom: "10px",
    });
    header.innerHTML = `
      <span style="font-size:15px;font-weight:bold;color:#5a7a5a;">🚕 Send SMS til sjåfør – ${licensePlate}</span>
      <button id="__smsBtnLukk" title="Lukk (Esc)"
        style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#666;padding:0 2px;">×</button>
    `;
    popup.appendChild(header);

    function skjemaRad(label, html) {
      const d = document.createElement("div");
      Object.assign(d.style, { display: "flex", alignItems: "flex-start", marginBottom: "11px", gap: "10px" });
      d.innerHTML = `
        <label style="width:82px;flex-shrink:0;font-weight:bold;padding-top:5px;">${label}</label>
        <div style="flex:1;">${html}</div>
      `;
      popup.appendChild(d);
      return d;
    }

    const tlfVerdi  = telefon ? telefon.replace(/^\+47/, "") : "";
    skjemaRad("Mobil:",
      `<input id="__smsTo" type="text" value="${tlfVerdi}"
         style="width:100%;padding:5px 8px;border:1px solid ${tlfVerdi ? "#ccc" : "#d9534f"};border-radius:4px;font-size:13px;box-sizing:border-box;" />`);

    if (!tlfVerdi) {
      const noTlf = document.createElement("div");
      noTlf.style.cssText = "color:#d9534f;font-size:11px;margin-top:-7px;margin-bottom:8px;margin-left:92px;";
      noTlf.textContent = "Telefonnummer ikke funnet i SUTI 3003 – fyll inn manuelt";
      popup.appendChild(noTlf);
    }

    skjemaRad("Mal:",
      `<select id="__smsMal" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        <option value="">– Velg mal –</option>
        ${SMS_MALER_SJAAFOR.map((m, i) => `<option value="${i}">${m.navn}</option>`).join("")}
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

    const escHandler = (e) => { if (e.key === "Escape") closePopup(); };
    let lukket = false;
    const closePopup = () => {
      if (lukket) return; lukket = true;
      document.removeEventListener("keydown", escHandler);
      overlay.remove();
      if (typeof openPopp === "function") {
        if (typeof selectRow === "function" && typeof g_resLS !== "undefined") {
          const originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === "string" && url.includes("action=openres")) {
              const origOnload = this.onload;
              this.addEventListener("load", () => {
                XMLHttpRequest.prototype.open = originalOpen;
                setTimeout(() => selectRow(ressursId, g_resLS), 50);
              }, { once: true });
            }
            return originalOpen.call(this, method, url, ...rest);
          };
          setTimeout(() => XMLHttpRequest.prototype.open = originalOpen, 3000);
        }
        openPopp("-1");
      }
    };
    document.getElementById("__smsBtnLukk").addEventListener("click", closePopup);
    document.getElementById("__smsBtnAvbryt").addEventListener("click", closePopup);
    document.addEventListener("keydown", escHandler);

    const malSelect = document.getElementById("__smsMal");
    const msgArea   = document.getElementById("__smsMsg");
    const tegnSpan  = document.getElementById("__smsTegn");

    function oppdaterSendKnapp() {
      const sendBtn   = document.getElementById("__smsBtnSend");
      const smsTo     = document.getElementById("__smsTo");
      const tlf       = smsTo?.value.trim() || "";
      const gyldig    = erGyldigMobil(tlf);
      const harTekst  = msgArea.value.trim().length > 0;
      const aktiv     = gyldig && harTekst;
      sendBtn.disabled         = !aktiv;
      sendBtn.style.background = aktiv ? "#5a7a5a" : "#aaa";
      sendBtn.style.cursor     = aktiv ? "pointer" : "not-allowed";
      if (smsTo && tlf.length > 0) {
        smsTo.style.borderColor = gyldig ? "#ccc" : "#d9534f";
      } else if (smsTo) {
        smsTo.style.borderColor = "#ccc";
      }
    }

    function oppdaterTegnteller() {
      const len = msgArea.value.length;
      tegnSpan.textContent = len;
      tegnSpan.style.color = len >= MAX_TEGN ? "#d9534f" : len >= MAX_TEGN * 0.9 ? "#b09f2b" : "#888";
      oppdaterSendKnapp();
    }

    malSelect.addEventListener("change", () => {
      const idx = parseInt(malSelect.value, 10);
      if (!isNaN(idx) && SMS_MALER_SJAAFOR[idx]) {
        msgArea.value        = SMS_MALER_SJAAFOR[idx].tekst().slice(0, MAX_TEGN);
        msgArea.style.height = "auto";
        msgArea.style.height = msgArea.scrollHeight + "px";
      } else {
        msgArea.value = "";
      }
      oppdaterTegnteller();
    });

    msgArea.addEventListener("input", () => {
      if (msgArea.value.length > MAX_TEGN) msgArea.value = msgArea.value.slice(0, MAX_TEGN);
      oppdaterTegnteller();
    });

    document.getElementById("__smsTo").addEventListener("input", oppdaterSendKnapp);

    document.getElementById("__smsBtnSend").addEventListener("click", async () => {
      const tlf       = document.getElementById("__smsTo").value.trim();
      const meldingTxt = msgArea.value.trim();
      if (!erGyldigMobil(tlf) || !meldingTxt) return;
      const sendBtn = document.getElementById("__smsBtnSend");
      sendBtn.disabled = true; sendBtn.textContent = "Sender…"; sendBtn.style.background = "#888";
      try {
        await sendSMS(ressursId, tlf, meldingTxt);
        document.getElementById("__smsTo").disabled = true;
        malSelect.disabled  = true;
        msgArea.disabled    = true;
        sendBtn.textContent        = "✅ Sendt";
        sendBtn.style.background   = "#27ae60";
        document.getElementById("__smsBtnAvbryt").textContent = "Lukk";
        // Logg SMS til sjåfør
        if (typeof window.nissyLoggSMS === "function") {
          const malIdx  = parseInt(malSelect.value, 10);
          const malNavn = (!isNaN(malIdx) && SMS_MALER_SJAAFOR[malIdx]) ? SMS_MALER_SJAAFOR[malIdx].navn : "Fritekst";
          window.nissyLoggSMS([{
            reqId:  turId,
            title:  licensePlate,
            avtale: licensePlate,
            status: malNavn,
            mal:    malNavn,
          }]);
        }
      } catch (e) {
        console.error("[SendSMS] Sjåfør-feil:", e);
        showToast("Feil ved sending av SMS. Sjekk konsoll.", "error");
        sendBtn.disabled = false; sendBtn.textContent = "Send SMS"; sendBtn.style.background = "#5a7a5a";
      }
    });

    oppdaterSendKnapp();
    setTimeout(() => document.getElementById("__smsMal").focus(), 50);
  }

  // Eksponér for Hurtigmeny.js
  window.__openSjaaforSMSPopup = openSjaaforPopup;

  // ============================================================
  async function openSendSMSPopup() {
    if (document.getElementById("__sendSMSOverlay")) return;

    const ventendeRader   = getVentendeRader();
    const paagaaendeRader = getPaagaaendeRader();

    // ---- Ventende: kolonnevalidering ----
    let ventendeInfo = [];
    if (ventendeRader.length > 0) {
      const idx = {
        reiseTid: findColumnIndex("#ventendeoppdrag", "tripStartDate"),
        oppTid:   findColumnIndex("#ventendeoppdrag", "tripTreatmentDate"),
        navn:     findColumnIndex("#ventendeoppdrag", "patientName"),
        fra:      findColumnIndex("#ventendeoppdrag", "tripFromAddress"),
        til:      findColumnIndex("#ventendeoppdrag", "tripToAddress"),
      };
      const mangler = [];
      if (idx.reiseTid === -1) mangler.push("'Reisetid'");
      if (idx.oppTid   === -1) mangler.push("'Oppmøtetid'");
      if (idx.navn     === -1) mangler.push("'Pnavn'");
      if (idx.fra      === -1) mangler.push("'Fra'");
      if (idx.til      === -1) mangler.push("'Til'");
      if (mangler.length > 0) {
        showToast(`Mangler kolonne(r) på ventende oppdrag: ${mangler.join(", ")}. Legg til i tabellen.`, "warning");
        return;
      }
      ventendeInfo = ventendeRader.map(row => ({
        ...extractRowInfo(row.id, row, idx),
        valgbar: false,
      }));
    }

    // ---- Pågående: kolonnevalidering ----
    let paagaaendeInfo = [];
    if (paagaaendeRader.length > 0) {
      const idx = {
        reiseTid: findColumnIndex("#pagaendeoppdrag", "tripStartTime"),
        oppTid:   findColumnIndex("#pagaendeoppdrag", "tripTreatmentDate"),
        navn:     findColumnIndex("#pagaendeoppdrag", "patientName"),
        fra:      findColumnIndex("#pagaendeoppdrag", "tripFromAddress"),
        til:      findColumnIndex("#pagaendeoppdrag", "tripToAddress"),
      };
      const mangler = [];
      if (idx.reiseTid === -1) mangler.push("'Start' (hentetid)");
      if (idx.oppTid   === -1) mangler.push("'Oppmøtetid'");
      if (idx.navn     === -1) mangler.push("'Pnavn'");
      if (idx.fra      === -1) mangler.push("'Fra'");
      if (idx.til      === -1) mangler.push("'Til'");
      if (mangler.length > 0) {
        showToast(`Mangler kolonne(r) på pågående oppdrag: ${mangler.join(", ")}. Legg til i tabellen.`, "warning");
        return;
      }
      paagaaendeInfo = paagaaendeRader.flatMap(row => extractPaagaaendeBookings(row, idx));
    }

    const paagaaendeRadIds = paagaaendeRader.map(r => r.id);
    const alleInfo = [...ventendeInfo, ...paagaaendeInfo];

    if (alleInfo.length === 0) {
      openFritekstPopup();
      return;
    }
    if (alleInfo.length === 1) {
      const info = alleInfo[0];
      const telefon = await fetchTelefon(info.id);
      const reselektId = paagaaendeRadIds.length === 1 ? paagaaendeRadIds[0] : null;
      openEnkeltPopup(info, telefon, reselektId);
    } else {
      openMassePopup(alleInfo, paagaaendeRadIds);
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

  // Intercept NISSY sin Send SMS-knapp via event delegation.
  // NISSY-fiks gjenoppretter tbody.innerHTML og ødelegger direktelistenere,
  // så vi lytter på document i capture-fasen for å fange klikk uansett.
  document.addEventListener("click", (e) => {
    if (e.target?.id === "buttonSendSMS") {
      e.stopImmediatePropagation();
      openSendSMSPopup();
    }
  }, true);

  // Hold Send SMS-knappen alltid aktivert.
  // NISSY-fiks gjenskaper kontrollpanel-tbody med en setTimeout-forsinkelse,
  // så vi venter med en engangs-observer til tabellen faktisk finnes i DOM
  // før vi kobler oss til den lettere tbody-observeren.
  function observerSmsKnapp(knapp) {
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target.disabled) m.target.disabled = false;
      }
    }).observe(knapp, { attributes: true, attributeFilter: ["disabled"] });
  }

  function kobleSmsObserver() {
    const tbody = document.querySelector("table[data-nissy-simplified] tbody");
    if (!tbody) return false;
    new MutationObserver(() => {
      const knapp = document.getElementById("buttonSendSMS");
      if (knapp) observerSmsKnapp(knapp);
    }).observe(tbody, { childList: true });
    const knapp = document.getElementById("buttonSendSMS");
    if (knapp) observerSmsKnapp(knapp);
    return true;
  }

  if (!kobleSmsObserver()) {
    // Tabellen finnes ikke ennå – vent på at NISSY-fiks setter den opp
    const _ventObserver = new MutationObserver(() => {
      if (kobleSmsObserver()) _ventObserver.disconnect();
    });
    _ventObserver.observe(document.body, { childList: true, subtree: true });
  }

  console.log("✅ SendSMS lastet – Alt+C for å sende SMS");
})();
