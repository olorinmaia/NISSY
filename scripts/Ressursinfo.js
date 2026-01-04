// ============================================================
// RESSURSINFO SCRIPT (ALT+D)
// Henter ut nyttig info fra 2000/3003/4010 XML fra merket ressurs
// Presenter faktiske tider, koordinater, adresser i pop-up
// ============================================================

(function() {
  // Sjekk om hotkey-listener allerede er installert
  if (window.__ressursInfoHotkeyInstalled) {
    console.log('✅ Ressursinfo-script er allerede aktiv');
    return;
  }

  // Installer hotkey-listener
  window.__ressursInfoHotkeyInstalled = true;

  console.log("🚀 Starter Ressursinfo-script");
  
  document.addEventListener('keydown', function(e) {
    // Alt+D (keyCode 68 = D)
    if (e.altKey && e.key === 'd') {
      e.preventDefault();
      runResourceInfo();
    }
  });

async function runResourceInfo() {
  // HINDRE FLERE POPUPS SAMTIDIG
  if (document.getElementById("customResourcePopup")) {
    return;
  }

  const SELECTED_BG = "rgb(148, 169, 220)";

  /* ==========================
     1. Finn markert ressurs
     ========================== */
  const row = [...document.querySelectorAll("tr")].find(tr =>
    getComputedStyle(tr).backgroundColor === SELECTED_BG &&
    tr.id?.startsWith("R")
  );
  
  if (!row) {
    alert("Ingen ressurs er merket.");
    return;
  }

  const licensePlate = row.cells[1]?.textContent.trim();
  if (!licensePlate) {
    alert("Fant ikke løyvenummer i raden.");
    return;
  }

  /* ==========================
     2. Hent turId
     ========================== */
  const img = row.querySelector('img[onclick*="searchStatus?id="]');
  if (!img) {
    alert("Fant ikke turId på ressursen.");
    return;
  }
  
  const turId = img
    .getAttribute("onclick")
    ?.match(/searchStatus\?id=(\d+)/)?.[1];
  
  if (!turId) {
    alert("Kunne ikke hente turId.");
    return;
  }

  /* ==========================
     3. XHR POST → searchStatus
     ========================== */
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/administrasjon/admin/searchStatus", true);
  xhr.withCredentials = true;
  xhr.setRequestHeader(
    "Content-Type",
    "application/x-www-form-urlencoded"
  );

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) {
      alert("Feil ved oppslag mot searchStatus.");
      return;
    }
    parseSearchResult(xhr.responseText);
  };

  const formData =
    "submit_action=tripSearch" +
    "&requisitionNumber=" +
    "&attestId=" +
    "&ssn=" +
    "&treatmentDateFromSsn=" +
    "&treatmentDateToSsn=" +
    "&lastName=" +
    "&firstName=" +
    "&treatmentDateFromName=" +
    "&treatmentDateToName=" +
    "&council=-999999" +
    "&tripNr=" + encodeURIComponent(turId) +
    "&treatmentDateFromCommissioner=" +
    "&treatmentDateToCommissioner=" +
    "&commissionerUsername=" +
    "&chosenDispatchCenter.id=" +
    "&treatmentDateFromAttention=" +
    "&treatmentDateToAttention=" +
    "&_attentionUnresolvedOnly=on" +
    "&dbSelect=1";

  xhr.send(formData);

  /* ==========================
     4. Parse getRequisitionDetails
     ========================== */
  function parseSearchResult(html) {
    const m = html.match(
      /getRequisitionDetails\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/
    );
    if (!m) {
      alert("Fant ingen bestillinger på denne ressursen.");
      return;
    }
    const [, requisitionId, db, tripId, highlightTripNr] = m;
    fetchResourceData(requisitionId, db, tripId, highlightTripNr);
  }

  /* ==========================
     5. Hent data fra ajax_reqdetails
     ========================== */
  async function fetchResourceData(reqId, db, tripId, highlightTripNr) {
    const detailUrl = `/administrasjon/admin/ajax_reqdetails?id=${reqId}&db=${db}&tripid=${tripId}&showSutiXml=true&hideEvents=&full=true&highlightTripNr=${highlightTripNr}`;

    let detailHtml;
    try {
      const resp = await fetch(detailUrl);
      detailHtml = await resp.text();
    } catch (e) {
      alert("Klarte ikke hente AJAX-detaljer: " + e);
      return;
    }

    // Hent 2000, 3003 og 4010 XML-lenker + tidspunkt for 3003
    // Filtrer på turId (4. <td> fra venstre) for å unngå unødvendig XML-parsing
    const xml2000Links = [];
    const xml3003Links = [];
    const xml4010Links = [];
    let time3003 = null;
    
    // Split HTML i rader
    const rows = detailHtml.split('<tr');
    
    for (const row of rows) {
      // Sjekk om raden inneholder riktig turId i 4. <td>
      // Regex for å finne alle <td> celler og sjekke 4. celle
      const tdMatches = row.match(/<td[^>]*>.*?<\/td>/g);
      if (!tdMatches || tdMatches.length < 4) continue;
      
      // 4. <td> (indeks 3) skal inneholde turId
      const turIdCell = tdMatches[3];
      const turIdMatch = turIdCell.match(/<nobr>(\d+)<\/nobr>/);
      
      // Hopp over hvis turId ikke matcher
      if (!turIdMatch || turIdMatch[1] !== turId) continue;
      
      // SUTI-koden (2000, 3003 eller 4010) står i en <td valign="top">
      // For 2000: <td valign="top">2000
      // For 3003/4010 (SutiMsgReceived): <td valign="top">3003 eller 4010
      const sutiTdMatch = row.match(/<td\s+valign="top">(\d+)/);
      if (!sutiTdMatch) continue;
      
      const sutiCode = sutiTdMatch[1];
      
      // Finn XML-lenken i samme rad
      const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
      if (xmlLinkMatch) {
        const url = xmlLinkMatch[1];
        
        if (sutiCode === '2000') {
          xml2000Links.push(url);
        } else if (sutiCode === '3003') {
          xml3003Links.push(url);
          
          // Hent tidspunktet fra 2. <td> (indeks 1)
          if (!time3003 && tdMatches.length >= 2) {
            const timeCell = tdMatches[1];
            const timeMatch = timeCell.match(/<nobr>(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})<\/nobr>/);
            if (timeMatch) {
              time3003 = timeMatch[1];
            }
          }
        } else if (sutiCode === '4010') {
          xml4010Links.push(url);
        }
      }
    }

    // Parse data
    const orderData = await extractOrderData(xml2000Links);
    const phoneNumber = await extractPhoneNumber(xml3003Links);
    const eventData = await extractEventData(xml4010Links, orderData);

    // Vis popup
    showCombinedPopup(phoneNumber, eventData, turId, time3003);
  }

  /* ==========================
     HJELPEFUNKSJONER
     ========================== */
  async function unescapeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    let decoded = txt.value;
    
    // Fiks vanlige HTML-entities for norske tegn
    decoded = decoded
      .replace(/&oslash;/g, 'ø')
      .replace(/&Oslash;/g, 'Ø')
      .replace(/&aring;/g, 'å')
      .replace(/&Aring;/g, 'Å')
      .replace(/&aelig;/g, 'æ')
      .replace(/&AElig;/g, 'Æ');
    
    // Prøv å fikse mojibake hvis vi finner replacement character (�)
    if (decoded.includes('�')) {
      // Dette skjer når ISO-8859-1 bytes blir lest som UTF-8
      // Vi må re-encode til latin1 bytes, deretter decode som UTF-8
      try {
        // Encode hver karakter tilbake til sin byte-verdi
        const bytes = [];
        for (let i = 0; i < decoded.length; i++) {
          const char = decoded.charCodeAt(i);
          // Replacement character (�) har charCode 65533
          if (char === 65533) {
            // Dette var sannsynligvis en norsk karakter
            // Vi kan ikke gjette hva det var, så la den stå
            bytes.push(char);
          } else if (char < 256) {
            bytes.push(char);
          } else {
            bytes.push(char);
          }
        }
        
        // Prøv å decode som ISO-8859-1 først, deretter som UTF-8
        const latin1Decoder = new TextDecoder('iso-8859-1');
        const utf8Decoder = new TextDecoder('utf-8');
        
        // Konverter tilbake til bytes
        const uint8array = new Uint8Array(bytes);
        const latin1Text = latin1Decoder.decode(uint8array);
        
        // Sjekk om det hjelper
        if (!latin1Text.includes('�') || latin1Text.includes('æ') || latin1Text.includes('ø') || latin1Text.includes('å')) {
          decoded = latin1Text;
        }
      } catch (e) {
        console.log('Kunne ikke fikse charset:', e);
      }
    }
    
    // Siste forsøk: Erstatt alle � med tomme strenger hvis de fortsatt finnes
    // Dette er ikke ideelt, men bedre enn å vise �
    if (decoded.includes('�')) {
      console.warn('Fant uleselige tegn (�) i XML - disse fjernes');
      decoded = decoded.replace(/�/g, '');
    }
      
    return decoded;
  }

  async function fetchAndParseXML(url) {
    const resp = await fetch(url);
    
    // Prøv først å lese som ISO-8859-1 (Windows-1252) siden serveren ser ut til å sende det
    let htmlText;
    try {
      const buffer = await resp.arrayBuffer();
      
      // Prøv ISO-8859-1 først
      let decoder = new TextDecoder('iso-8859-1');
      htmlText = decoder.decode(buffer);
      
      // Hvis vi fortsatt har problemer, prøv UTF-8
      if (htmlText.includes('�') || !htmlText.includes('charset=UTF-8')) {
        decoder = new TextDecoder('utf-8', { fatal: false });
        const utf8Text = decoder.decode(buffer);
        
        // Bruk UTF-8 hvis det ser bedre ut
        if (!utf8Text.includes('�') || utf8Text.length > htmlText.length) {
          htmlText = utf8Text;
        }
      }
    } catch (e) {
      // Fallback til vanlig text()
      htmlText = await resp.text();
    }

    const preMatch = htmlText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) throw new Error("Fant ikke <pre>-tagg i XML-siden.");

    const xmlStringEscaped = preMatch[1];
    const xmlString = await unescapeHtml(xmlStringEscaped.trim());

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Sjekk for parsing-feil
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error("XML parsing error:", parseError.textContent);
    }
    
    return xmlDoc;
  }

  /* ==========================
     6. Hent bestillingsdata (2000)
     ========================== */
  async function extractOrderData(xmlUrls) {
    const orderMap = new Map(); // "bookingId-nodeType" -> { address, estimatedTime, name }

    for (const url of xmlUrls) {
      try {
        const xmlDoc = await fetchAndParseXML(url);

        // Hent alle noder
        const nodes = xmlDoc.querySelectorAll('route > node');
        
        for (const node of nodes) {
          const nodeType = node.getAttribute('nodeType');
          
          // Kun hentenoder (1803) og leveringsnoder (1804)
          if (nodeType !== '1803' && nodeType !== '1804') continue;

          // Hent content node for å få bookingId og navn
          const contentNode = node.querySelector('contents > content[contentType="1001"]');
          if (!contentNode) continue;
          
          // Hent bookingId fra subOrderContent
          const idOrderNode = contentNode.querySelector('subOrderContent > idOrder');
          if (!idOrderNode) continue;
          
          const bookingId = idOrderNode.getAttribute('id');
          if (!bookingId) continue;

          // Hent navn fra content node (her er charset riktig!)
          const name = contentNode.getAttribute('name') || 'Ukjent';

          // Hent adresse
          const addressNode = node.querySelector('addressNode');
          let address = 'Ukjent adresse';
          
          if (addressNode) {
            const addressName = addressNode.getAttribute('addressName') || '';
            const street = addressNode.getAttribute('street') || '';
            const streetNo = addressNode.getAttribute('streetNo') || '';
            const streetNoLetter = addressNode.getAttribute('streetNoLetter') || '';
            const postalNo = addressNode.getAttribute('postalNo') || '';
            const location = addressNode.getAttribute('location') || '';
            
            // Formater: "addressName/street streetNo, postalNo location"
            const parts = [];
            
            // Bruk addressName hvis tilgjengelig, ellers street + streetNo
            if (addressName) {
              parts.push(addressName);
            } else if (street) {
              const streetPart = [street, streetNo, streetNoLetter].filter(Boolean).join(' ');
              parts.push(streetPart);
            }
            
            if (postalNo || location) {
              parts.push([postalNo, location].filter(Boolean).join(' '));
            }
            
            if (parts.length > 0) {
              address = parts.join(', ');
            }
          }

          // Hent beregnet tid
          const timeNode = node.querySelector('timesNode > time');
          let estimatedTime = 'Ukjent';
          
          if (timeNode) {
            const timeStr = timeNode.getAttribute('time');
            if (timeStr) {
              // Format: "2026-01-03T14:00:00" -> "14:00"
              const timePart = timeStr.split('T')[1];
              if (timePart) {
                estimatedTime = timePart.substring(0, 5);
              }
            }
          }

          // Bruk bookingId+nodeType som nøkkel
          const key = `${bookingId}-${nodeType}`;
          orderMap.set(key, {
            address,
            estimatedTime,
            name  // ← Nytt: Legg til navn fra 2000 XML
          });
        }

      } catch (e) {
        console.error("Feil ved parsing av 2000 XML:", e);
      }
    }

    return orderMap;
  }

  /* ==========================
     7. Hent telefonnummer (3003)
     ========================== */
  async function extractPhoneNumber(xmlUrls) {
    let foundPhone = null;

    for (const url of xmlUrls) {
      try {
        const xmlDoc = await fetchAndParseXML(url);

        // Sjekk at licensePlate matcher
        const refIdVehicle = xmlDoc.querySelector('referencesTo > idVehicle');
        if (refIdVehicle) {
          const refId = refIdVehicle.getAttribute('id');
          if (refId !== licensePlate) continue;
        }

        // Frogne-format
        const frogneVehicle = [...xmlDoc.querySelectorAll('resourceDispatch > vehicle')].find(v => {
          const idVeh = v.querySelector('idVehicle');
          return idVeh && idVeh.getAttribute('id') === licensePlate;
        });

        if (frogneVehicle) {
          const phoneNode = frogneVehicle.querySelector('contactInfoVehicle > contactInfo[contactType="phone"]');
          if (phoneNode && phoneNode.hasAttribute("contactInfo")) {
            foundPhone = phoneNode.getAttribute("contactInfo").trim();
          }
        }

        // ITF/Cencom-format
        if (!foundPhone) {
          const driverPhoneNode = xmlDoc.querySelector('resourceDispatch > driver > contactInfoDriver > contactInfo[contactType="phone"]');
          if (driverPhoneNode && driverPhoneNode.hasAttribute("contactInfo")) {
            foundPhone = driverPhoneNode.getAttribute("contactInfo").trim();
          }
        }

        // Alternativ søk
        if (!foundPhone) {
          const vehicleById = [...xmlDoc.querySelectorAll('idVehicle')].find(v => v.getAttribute('id') === licensePlate);
          if (vehicleById) {
            const vehicleParent = vehicleById.parentNode;
            if (vehicleParent) {
              const phoneNode = vehicleParent.querySelector('contactInfo[contactType="phone"]');
              if (phoneNode && phoneNode.hasAttribute("contactInfo")) {
                foundPhone = phoneNode.getAttribute("contactInfo").trim();
              }
            }
          }
        }

        if (foundPhone) break;

      } catch (e) {
        console.error("Feil ved parsing av 3003 XML:", e);
      }
    }

    return foundPhone;
  }

  /* ==========================
     8. Hent hendelser (4010)
     ========================== */
  async function extractEventData(xmlUrls, orderMap) {
    const results = [];
    let routeCoords = [];
    let firstBookingId = null;

    for (const url of xmlUrls) {
      try {
        const xmlDoc = await fetchAndParseXML(url);

        const idVeh = xmlDoc.querySelector("referencesTo > idVehicle");
        if (!idVeh || idVeh.getAttribute("id") !== licensePlate) continue;

        // Hent turnummer
        if (!firstBookingId) {
          const mainBooking = xmlDoc.querySelector("referencesTo > idOrder");
          if (mainBooking) {
            firstBookingId = mainBooking.getAttribute("id");
          }
        }

        const pickup = xmlDoc.querySelector("pickupConfirmation");
        if (!pickup) continue;

        const eventType = pickup.getAttribute("eventType");
        const node = pickup.querySelector("nodeConfirmed");
        if (!node) continue;

        const nodeType = node.getAttribute("nodeType");
        const timeNode = node.querySelector("timesNode > time");
        const timestamp = timeNode?.getAttribute("time") || "Ukjent";

        const geo = node.querySelector("addressNode > geographicLocation");
        const lat = geo?.getAttribute("lat") || "";
        const lon = geo?.getAttribute("long") || "";

        const idOrderNode = node.querySelector("subOrderContent > idOrder");
        const bookingId = idOrderNode?.getAttribute("id") || "Ukjent";

        const contentNode = node.querySelector("contents > content[contentType='1001']");
        const name4010 = contentNode?.getAttribute("name") || "Ukjent";

        // Hent adresse, beregnet tid og navn fra 2000 XML
        let address = "Ikke funnet";
        let estimatedTime = "Ikke funnet";
        let name = name4010; // Fallback til 4010-navn hvis 2000 ikke finnes
        
        // Bruk bookingId+nodeType som nøkkel
        const key = `${bookingId}-${nodeType}`;
        if (orderMap.has(key)) {
          const orderInfo = orderMap.get(key);
          address = orderInfo.address;
          estimatedTime = orderInfo.estimatedTime;
          name = orderInfo.name; // ← Bruk navn fra 2000 XML (riktig charset!)
        }

        results.push({
          bookingId,
          eventType,
          timestamp,
          lat,
          lon,
          name,
          address,
          estimatedTime
        });

        // Samle ALLE koordinater først (inkludert 1709)
        if (lat && lon) {
          routeCoords.push({ lat, lon, timestamp, eventType });
        }

      } catch (e) {
        console.error("Feil ved parsing av 4010 XML:", e);
      }
    }

    // Sorter koordinater etter tidspunkt
    routeCoords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Fjern sekvensielle duplikater
    routeCoords = removeSequentialDuplicates(routeCoords);
    
    // VIKTIG: Hvis mer enn 5 koordinater, filtrer bort 1709
    let routeCoordsForMap = routeCoords;
    if (routeCoords.length > 5) {
      routeCoordsForMap = routeCoords.filter(c => c.eventType !== "1709");
    }

    // Generer rute-URL
    let routeUrl = "";
    if (routeCoordsForMap.length > 1) {
      const maxWaypoints = 23;
      const origin = routeCoordsForMap[0];
      const destination = routeCoordsForMap[routeCoordsForMap.length - 1];
      const waypointsCoords = routeCoordsForMap.slice(1, routeCoordsForMap.length - 1).slice(0, maxWaypoints);
      const waypoints = waypointsCoords.map(c => `${c.lat},${c.lon}`).join("|");

      routeUrl = `https://www.google.no/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`;
      if (waypoints) {
        routeUrl += `&waypoints=${waypoints}`;
      }
    }

    return {
      events: results,
      routeUrl,
      bookingId: firstBookingId
    };
  }

  function removeSequentialDuplicates(coords) {
    const cleaned = [];
    let prev = null;

    for (const c of coords) {
      if (!prev || c.lat !== prev.lat || c.lon !== prev.lon) {
        cleaned.push(c);
      }
      prev = c;
    }
    return cleaned;
  }

  function formatTimestamp(isoString) {
    if (!isoString || isoString === "Ukjent") return "Ukjent";

    const dt = new Date(isoString);
    if (isNaN(dt)) return "Ukjent";

    const pad = n => n.toString().padStart(2, "0");
    const hours = pad(dt.getHours());
    const minutes = pad(dt.getMinutes());

    return `${hours}:${minutes}`;
  }

  function getIconAndTitle(eventType) {
    switch (eventType) {
      case "1701": return { icon: "➕", title: "Påstigning" };
      case "1702": return { icon: "➖", title: "Avstigning" };
      case "1703": return { icon: "❌", title: "Bomtur" };
      case "1709": return { icon: "📍", title: "Bil ved node" };
      default: return { icon: "", title: "Ukjent type" };
    }
  }

  /* ==========================
     9. VIS KOMBINERT POPUP
     ========================== */
  function showCombinedPopup(phoneNumber, eventData, turId, time3003) {
    const rowRect = row.getBoundingClientRect();

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "customResourceOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0,0,0,0.3);
      z-index: 999998;
    `;

    // Popup
    const popup = document.createElement("div");
    popup.id = "customResourcePopup";
    popup.style.cssText = `
      position: fixed;
      top: 40px;
      left: ${rowRect.left - 20}px;
      background: white;
      padding: 15px 25px;
      border: 2px solid #666;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
      z-index: 999999;
      max-height: 90vh;
      overflow-y: auto;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #222;
      transform: translateX(-100%);
    `;

    let html = `
      <style>
        #customResourcePopup tbody tr:hover {
          background-color: #f1f3f5 !important;
        }
      </style>
      <h2 style="margin: 0 0 15px; font-size: 18px; color: #333;">
        Ressursinformasjon: <a href="/administrasjon/admin/searchStatus?id=${turId}" 
                                style="color: #1976d2; text-decoration: none;"
                                title="Åpne turnummer ${turId} i NISSY admin">${licensePlate}</a>
      </h2>
    `;

    // VIS 3003 TIDSPUNKT (når ressurs bekreftet)
    if (time3003) {
      // Konverter "24/12/2025 20:55:09" til "20:55"
      const timeOnly = time3003.split(' ')[1]?.substring(0, 5) || time3003;
      
      html += `
        <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ff9800;" title="Når 3003 XML ble mottatt">
          <span style="font-weight: bold;">🚕 Oppdrag bekreftet: </span>
          <span style="font-size: 15px; font-weight: bold; color: #856404;">${timeOnly}</span>
          ${!phoneNumber ? '<span style="margin-left: 10px; color: #d32f2f;">⚠️ Fant ikke telefonnummer</span>' : ''}
        </div>
      `;
    }

    // TELEFONNUMMER SEKSJON
    if (phoneNumber) {
      html += `
        <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #2e7d32;">
        <div>
          <span style="font-weight: bold;">📞 Telefonnummer sjåfør: </span>
          <span style="font-size: 15px; font-weight: bold; color: #2e7d32;">${phoneNumber}</span>
        </div>
          <div>
            <button id="copyPhoneBtn" style="
              background: #4caf50;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">
              📋 Kopier
            </button>
            <span id="copyConfirm" style="
              margin-left: 10px;
              color: #2e7d32;
              display: none;
              font-weight: bold;
            ">✔️ Kopiert!</span>
          </div>
        </div>
      `;
    }

    // 4010 HENDELSER SEKSJON
    if (eventData.events.length > 0) {
      html += `
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 16px; color: #333;" title="Hendelser basert informasjon i 2000 og 4010 XML">
              Vognløpshendelser
            </h3>
            <label style="font-size: 13px; cursor: pointer;" title="Vis/skjul 4010-1709 XML i Vognløpshendelser">
              <input type="checkbox" id="toggle1709" checked>
              Vis📍(Bil ved node)
            </label>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: linear-gradient(to bottom, #f8f9fa, #e9ecef); border-bottom: 2px solid #dee2e6;">
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Bestilling</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Navn</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;" title="Planlagt tidspunkt fra NISSY. (Bil ved node har ikke planlagt tidspunkt, hent/lever tid brukes)">Planlagt🕒</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;" title="Faktisk tid når hendelsen ble utført på taksameter">Faktisk🕒</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Hendelse</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;" title="Planlagt adresse fra NISSY">Adresse</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;" title="Koordinat til der hendelsen ble utført på taksameter">Koordinat</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const r of eventData.events) {
        const { icon, title } = getIconAndTitle(r.eventType);
        const coordText = `Vis i kart`;
        const gmapsUrl = `https://www.google.no/maps/search/?api=1&query=${r.lat},${r.lon}`;
        const formattedTime = formatTimestamp(r.timestamp);
        const rowClass = r.eventType === "1709" ? "row1709" : "";

        html += `
          <tr class="${rowClass}" style="border-bottom: 1px solid #e9ecef; background: white; transition: background-color 0.2s;">
            <td style="padding: 10px 8px;">
              <a href="/administrasjon/admin/searchStatus?nr=${r.bookingId}" 
                 style="color: #1976d2; text-decoration: none; font-weight: 500;"
                 title="Åpne bestilling ${r.bookingId} i NISSY admin">
                🧾 Åpne
              </a>
            </td>
            <td style="
              padding: 10px 8px; 
              color: #495057; 
              font-size: 12px;
              max-width: 150px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            " title="${r.name}">
              ${r.name}
            </td>
            <td style="padding: 10px 8px; color: #495057; font-family: monospace; text-align: right;" title="Planlagt tidspunkt fra NISSY. (Bil ved node har ikke planlagt tidspunkt, hent/lever tid brukes)">${r.estimatedTime}</td>
            <td style="padding: 10px 8px; color: #495057; font-family: monospace; text-align: right;" title="Faktisk tid når hendelsen ble utført på taksameter">${formattedTime}</td>            
            <td style="padding: 10px 8px; text-align: right;" title="${title} (${r.eventType})">
              <span style="display: inline-block; background: #e3f2fd; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
              ${icon}
              </span>
            </td>
            <td style="
              padding: 10px 8px; 
              color: #495057; 
              font-size: 12px;
              max-width: 250px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            " title="${r.address}">
              ${r.address}
            </td>
            <td style="padding: 10px 8px;">
              <a href="${gmapsUrl}" 
                 style="color: #1976d2; text-decoration: none;"
                 title="${title}">
                🗺️ ${coordText}
              </a>
            </td>
          </tr>
        `;
      }

      html += `
            </tbody>
          </table>
      `;

    html += `</div>`;
    } else if (!phoneNumber) {
      html += `<p style="color: #666;">Ingen data funnet.</p>`;
    }
    
    // BUNNSEKSJON MED KNAPPER
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
        <button id="closePopup" style="
          padding: 10px 20px;
          background: #666;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">
          Lukk
        </button>
    `;
    
    if (eventData.routeUrl) {
      html += `
        <a href="${eventData.routeUrl}" 
           style="
             padding: 10px 16px;
             background: #1976d2;
             color: white;
             text-decoration: none;
             border-radius: 6px;
             font-size: 14px;
           " title="Åpner kjørerute basert på faktiske koordinater fra taksameter i Google Maps">
          🗺️ Bilens faktiske kjørerute
        </a>
      `;
    }
    
    html += `</div>`;

    popup.innerHTML = html;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // EVENT LISTENERS

    // Kopier telefonnummer
    const copyBtn = popup.querySelector("#copyPhoneBtn");
    if (copyBtn && phoneNumber) {
      // Automatisk kopiering når popup åpnes
      (async () => {
        try {
          await navigator.clipboard.writeText(phoneNumber);
          // Vis bekreftelse og skjul knapp
          const confirm = popup.querySelector("#copyConfirm");
          if (confirm) {
            copyBtn.style.display = "none";
            confirm.textContent = "✔️ Kopiert til utklippstavle";
            confirm.style.color = "#2e7d32";
            confirm.style.display = "inline";
          }
        } catch (err) {
          // Vis advarsel hvis auto-kopiering feiler
          const confirm = popup.querySelector("#copyConfirm");
          if (confirm) {
            confirm.textContent = "⚠️ Klikk 'Kopier' for å kopiere";
            confirm.style.display = "inline";
            confirm.style.color = "#d32f2f";
          }
        }
      })();
      
      // Manuel kopiering via knapp (hvis auto-kopiering feilet)
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(phoneNumber);
          const confirm = popup.querySelector("#copyConfirm");
          copyBtn.style.display = "none";
          confirm.textContent = "✔️ Kopiert til utklippstavle";
          confirm.style.color = "#2e7d32";
          confirm.style.display = "inline";
        } catch (err) {
          alert("Kunne ikke kopiere: " + err);
        }
      });
    }

    // Toggle 1709
    const toggle1709 = popup.querySelector("#toggle1709");
    if (toggle1709) {
      toggle1709.addEventListener("change", () => {
        const rows1709 = popup.querySelectorAll(".row1709");
        rows1709.forEach(row => {
          row.style.display = toggle1709.checked ? "" : "none";
        });
      });
      toggle1709.dispatchEvent(new Event("change"));
    }

    // Åpne lenker i nytt vindu
    function openPopupWindow(url) {
      const width = Math.floor(window.innerWidth / 2);
      const height = Math.floor(window.innerHeight * 0.9);
      window.open(
        url,
        "_blank",
        `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
      );
    }

    const coordLinks = popup.querySelectorAll("a[href^='https://www.google.no/maps']");
    coordLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        openPopupWindow(link.href);
      });
    });

    const bookingLinks = popup.querySelectorAll("a[href^='/administrasjon/admin/searchStatus']");
    bookingLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        openPopupWindow(link.href);
      });
    });

    // Lukk popup
    function closePopup() {
      const p = document.getElementById("customResourcePopup");
      const o = document.getElementById("customResourceOverlay");
      
      if (p && p.parentNode) {
        p.parentNode.removeChild(p);
      }
      if (o && o.parentNode) {
        o.parentNode.removeChild(o);
      }
      
      document.removeEventListener("keydown", escHandler);
    }

    const closeBtn = popup.querySelector("#closePopup");
    if (closeBtn) {
      closeBtn.onclick = closePopup;
    }
    
    overlay.onclick = closePopup;

    function escHandler(e) {
      if (e.key === "Escape") {
        closePopup();
      }
    }
    document.addEventListener("keydown", escHandler);
  }

} // End runResourceInfo

  console.log("⌨️  Ressursinfo snarveier:");
  console.log("   ALT+D → Ressursinfo pop-up");
  console.log("✅ Ressursinfo-script lastet");
   
})(); // End wrapper