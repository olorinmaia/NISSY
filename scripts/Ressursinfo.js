// ============================================================
// RESSURSINFO SCRIPT (ALT+D)
// Henter ut nyttig info fra 2000/3003/4010 XML fra merket ressurs
// Presenter planlagte/faktiske tider, koordinater, adresser, navn, avtale, områdekode i pop-up
// Hvis transportør er Trøndertaxi vises link til løyveregister
// ============================================================

(function() {
  // Sjekk om hotkey-listener allerede er installert
  if (window.__ressursInfoHotkeyInstalled) {
    console.log('✅ Ressursinfo-script er allerede aktiv');
    return;
  }

  // Installer hotkey-listener
  window.__ressursInfoHotkeyInstalled = true;
  
  // Sperre for å hindre multiple kjøringer samtidig
  let isRunning = false;

  // ============================================================
  // KONFIGURASJON
  // ============================================================
  
  // Routing-modus for kjørerute-kart
  // 'road' = Rute langs vei (OSRM routing)
  // 'straight' = Rett luftlinje mellom punkter
  const ROUTING_MODE = 'road'; // Endre til 'straight' for luftlinje

  console.log("🚀 Starter Ressursinfo-script");

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
  
  document.addEventListener('keydown', function(e) {
    // Alt+D (keyCode 68 = D)
    if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      
      // Sjekk om scriptet allerede kjører
      if (isRunning) {
        console.warn("⚠️ Ressursinfo kjører allerede - ignorerer ny forespørsel");
        return;
      }
      
      runResourceInfo();
    }
  });

async function runResourceInfo() {
  // Sett sperre
  isRunning = true;
  
  // HINDRE FLERE POPUPS SAMTIDIG
  if (document.getElementById("customResourcePopup")) {
    isRunning = false; // Frigjør sperre
    return;
  }

  const SELECTED_BG = "rgb(148, 169, 220)";

  /* ==========================
     1. Finn markert ressurs
     ========================== */
  const allSelectedRows = [...document.querySelectorAll("tr")].filter(tr =>
    getComputedStyle(tr).backgroundColor === SELECTED_BG &&
    tr.id?.startsWith("R")
  );
  
  if (allSelectedRows.length === 0) {
    showErrorToast("🚕 Ingen ressurser er valgt. Vennligst merk én og trykk på Ressursinfo-knappen eller Alt+D igjen.");
    isRunning = false; // Frigjør sperre
    return;
  }
  
  // Hvis flere ressurser er merket, vis valg-dialog
  if (allSelectedRows.length > 1) {
    const licensePlates = allSelectedRows.map(r => r.cells[1]?.textContent.trim()).filter(Boolean);
    
    const choice = prompt(
      `Du har merket ${allSelectedRows.length} ressurser:\n\n` +
      licensePlates.map((lp, i) => `${i + 1}. ${lp}`).join('\n') +
      `\n\nVelg ressurs (1-${allSelectedRows.length}) eller trykk Avbryt:`,
      "1"
    );
    
    // Sjekk om bruker trykket Avbryt
    if (choice === null) {
      isRunning = false; // Frigjør sperre
      return;
    }
    
    // Valider input
    const selectedIndex = parseInt(choice) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allSelectedRows.length) {
      alert(`Ugyldig valg. Velg et tall mellom 1 og ${allSelectedRows.length}.`);
      isRunning = false; // Frigjør sperre
      return;
    }
    
    // Bruk valgt ressurs
    var row = allSelectedRows[selectedIndex];
  } else {
    // Kun én ressurs merket
    var row = allSelectedRows[0];
  }
  
  const licensePlate = row.cells[1]?.textContent.trim();
  if (!licensePlate) {
    alert("Fant ikke løyvenummer i raden.");
    isRunning = false; // Frigjør sperre
    return;
  }

  /* ==========================
     2. Hent turId
     ========================== */
  const img = row.querySelector('img[onclick*="searchStatus?id="]');
  if (!img) {
    alert("Fant ikke turId på ressursen.");
    isRunning = false; // Frigjør sperre
    return;
  }
  
  const turId = img
    .getAttribute("onclick")
    ?.match(/searchStatus\?id=(\d+)/)?.[1];
  
  if (!turId) {
    alert("Kunne ikke hente turId.");
    isRunning = false; // Frigjør sperre
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
      isRunning = false; // Frigjør sperre
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
      isRunning = false; // Frigjør sperre
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
      isRunning = false; // Frigjør sperre
      return;
    }

    // Hent 2000, 3003 og 4010 XML-lenker + tidspunkt for 3003
    // Filtrer på turId (4. <td> fra venstre) for å unngå unødvendig XML-parsing
    const xml2000Links = [];
    const xml3003Links = [];
    const xml4010Links = [];
    let latest5021Url = null;
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
        } else if (sutiCode === '5021') {
          latest5021Url = url; // Alltid overskriv – siste/nyeste 5021
        }
      }
    }

    // Parse data
    const { orderMap, agreementInfo } = await extractOrderData(xml2000Links);
    const { phoneNumber, senderIdOrg, licensePlate: licensePlate3003, dispatchCoord } = await extractPhoneNumber(xml3003Links);
    const eventData = await extractEventData(xml4010Links, orderMap);

    // Legg til 3003-hendelse som første event i listen (vises i tabell og kart)
    if (dispatchCoord) {
      let dispatchTimestamp = null;
      if (time3003) {
        try {
          const [datePart, timePart] = time3003.split(' ');
          const [d, m, y] = datePart.split('/');
          dispatchTimestamp = `${y}-${m}-${d}T${timePart}`;
        } catch (e) {}
      }
      eventData.events.unshift({
        bookingId: null,
        eventType: "3003",
        timestamp: dispatchTimestamp,
        lat: String(dispatchCoord.lat),
        lon: String(dispatchCoord.lon),
        name: "Oppdrag bekreftet",
        address: "Bilens posisjon ved oppdragsbekreftelse",
        estimatedTime: "-"
      });
    }

    // Legg til 5021-hendelse (siste auto-posisjon)
    if (latest5021Url) {
      try {
        const xmlDoc5021 = await fetchAndParseXML(latest5021Url);
        const geo5021 = xmlDoc5021.querySelector('order > route > node > addressNode > geographicLocation');
        const time5021Node = xmlDoc5021.querySelector('order > route > node > timesNode > time');
        const lat5021 = geo5021?.getAttribute('lat');
        const lon5021 = geo5021?.getAttribute('long');
        const timestamp5021 = time5021Node?.getAttribute('time') || null;
        if (lat5021 && lon5021) {
          eventData.events.push({
            bookingId: null,
            eventType: "5021",
            timestamp: timestamp5021,
            lat: lat5021,
            lon: lon5021,
            name: "Auto-posisjon",
            address: "–",
            estimatedTime: "–"
          });
        }
      } catch (e) {
        console.warn("Feil ved parsing av 5021 XML:", e);
      }
    }

    // Sorter alle hendelser kronologisk
    eventData.events.sort((a, b) => {
      if (!a.timestamp || a.timestamp === 'Ukjent') return -1;
      if (!b.timestamp || b.timestamp === 'Ukjent') return 1;
      return a.timestamp.localeCompare(b.timestamp);
    });

    // Vis popup
    showCombinedPopup(phoneNumber, eventData, turId, time3003, agreementInfo, senderIdOrg, licensePlate3003);
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

    // Forsøk å fikse vanlige XML parsing-problemer
    let cleanedXml = xmlString
      // Fiks uescapede & tegn (men ikke &amp;, &lt;, &gt;, etc)
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanedXml, "text/xml");
    
    // Sjekk for parsing-feil
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error("XML parsing error:", parseError.textContent);
      console.error("Problematic XML snippet:", cleanedXml.substring(0, 500));
      
      // Prøv å parse som HTML i stedet (mer tolerant)
      const htmlDoc = parser.parseFromString(cleanedXml, "text/html");
      const sutiElement = htmlDoc.querySelector('SUTI');
      if (sutiElement) {
        console.warn("Bruker HTML parser i stedet for XML parser");
        return htmlDoc;
      }
    }
    
    return xmlDoc;
  }

  function formatBookingId(id) {
    // Hvis ID er kortere enn 7 tegn, vis hele
    if (id.length <= 7) return id;
    
    // Ellers vis ... + siste 4
    return `...${id.slice(-4)}`;
  }

  /* ==========================
     6. Hent bestillingsdata (2000)
     ========================== */
  async function extractOrderData(xmlUrls) {
    const orderMap = new Map(); // "bookingId-nodeType" -> { address, estimatedTime, name }
    let agreementInfo = null; // Avtale-info fra første 2000 XML

    for (const url of xmlUrls) {
      try {
        const xmlDoc = await fetchAndParseXML(url);

        // Hent avtale-info fra første 2000 XML (kun én gang)
        if (!agreementInfo) {
          const orgReceiver = xmlDoc.querySelector('orgReceiver');
          const idAgreement = xmlDoc.querySelector('agreement > idAgreement');
          
          if (orgReceiver || idAgreement) {
            agreementInfo = {
              avtaleNavn: orgReceiver?.getAttribute('name') || 'Ukjent',
              avtaleKode: idAgreement?.getAttribute('id') || 'Ukjent'
            };
          }
        }

        // Hent alle noder
        const nodes = xmlDoc.querySelectorAll('route > node');
        
        for (const node of nodes) {
          const nodeType = node.getAttribute('nodeType');
          
          // Kun hentenoder (1803) og leveringsnoder (1804)
          if (nodeType !== '1803' && nodeType !== '1804') continue;

          // Hent content node for å få bookingId og navn
          const contentNode = node.querySelector('contents > content[contentType="1001"]');
          if (!contentNode) continue;
          
          // Hent bookingId fra subOrderContent (bruk descendants, ikke direct child)
          const idOrderNode = contentNode.querySelector('idOrder');
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
            name
          });
        }

      } catch (e) {
        console.error("Feil ved parsing av 2000 XML:", e);
      }
    }

    return { orderMap, agreementInfo };
  }

  /* ==========================
     7. Hent telefonnummer (3003)
     ========================== */
  async function extractPhoneNumber(xmlUrls) {
    let foundPhone = null;
    let senderIdOrg = null;
    let licensePlateFrom3003 = null;
    let dispatchCoord = null;

    for (const url of xmlUrls) {
      try {
        const xmlDoc = await fetchAndParseXML(url);

        // Hent avsender-info (idOrg id)
        if (!senderIdOrg) {
          const orgSenderIdOrg = xmlDoc.querySelector('orgSender > idOrg');
          if (orgSenderIdOrg) {
            senderIdOrg = orgSenderIdOrg.getAttribute('id');
          }
        }

        // Hent koordinater fra vehiclestartLocation (hvis finnes)
        if (!dispatchCoord) {
          const startLoc = xmlDoc.querySelector('vehiclestartLocation');
          if (startLoc) {
            const lat = startLoc.getAttribute('lat');
            const lon = startLoc.getAttribute('long');
            if (lat && lon) {
              dispatchCoord = { lat: parseFloat(lat), lon: parseFloat(lon) };
            }
          }
        }

        // Sjekk at licensePlate matcher
        const refIdVehicle = xmlDoc.querySelector('referencesTo > idVehicle');
        if (refIdVehicle) {
          const refId = refIdVehicle.getAttribute('id');
          if (refId !== licensePlate) continue;
          
          // Lagre løyvenummer fra 3003 XML
          if (!licensePlateFrom3003) {
            licensePlateFrom3003 = refId;
          }
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

    return { 
      phoneNumber: foundPhone, 
      senderIdOrg: senderIdOrg,
      licensePlate: licensePlateFrom3003,
      dispatchCoord: dispatchCoord
    };
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
          name = orderInfo.name;
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

    return {
      events: results,
      bookingId: firstBookingId
    };
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
      case "3003": return { icon: "🏴", title: "Oppdrag bekreftet" };
      case "5021": return { icon: "📡", title: "Auto-posisjon" };
      default: return { icon: "", title: "Ukjent type" };
    }
  }

  /* ==========================
     9. ÅPNE KJØRERUTE I LEAFLET-KART
     ========================== */
  async function openRouteMap(events, licensePlate, turId) {
    // Åpne nytt vindu
    const width = Math.floor(window.innerWidth / 2);
    const height = Math.floor(window.innerHeight * 0.9);
    const mapWindow = window.open(
      '',
      'RouteMap_' + turId,
      `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
    );
    
    if (!mapWindow) {
      alert("Popup blokkert – tillat popup og prøv igjen.");
      return;
    }
    
    // Sjekk om vinduet allerede er initialisert
    const isAlreadyInitialized = mapWindow.document.getElementById('map') !== null;
    
    if (isAlreadyInitialized) {
      console.log("📍 Gjenbruker eksisterende kjørerute-vindu");
      // Oppdater data i eksisterende vindu
      window.currentRouteEvents = events;
      window.currentRoutingMode = ROUTING_MODE;
      
      // Kall reload-funksjon i child window hvis den finnes
      if (mapWindow.reloadRouteData) {
        mapWindow.reloadRouteData();
      }
      return;
    }
    
    console.log("📍 Initialiserer nytt kjørerute-vindu");
    
    // Serialiser events til JSON-streng (escapet for HTML)
    const eventsJson = JSON.stringify(events).replace(/</g, '\\x3C').replace(/>/g, '\\x3E');
    
    // Lagre events i parent window for child window access
    window.currentRouteEvents = events;
    window.currentRoutingMode = ROUTING_MODE; // Send routing-modus til map-vindu
    
    // Bygg HTML med Leaflet
    mapWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Kjørerute - ${licensePlate} - ${turId}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: Arial, sans-serif; overflow: hidden; display: flex; flex-direction: column; }
          
          #header {
            background: linear-gradient(to right, #025671, #169bbd);
            color: white;
            padding: 15px 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            flex-shrink: 0;
          }
          
          #header h1 {
            font-size: 18px;
            font-weight: 600;
          }
          
          #map {
            flex: 1;
            width: 100%;
            min-height: 0;
          }
          
          .custom-marker-wrapper {
            background: transparent;
            border: none;
          }
          
          .event-marker {
            background: white;
            border: 3px solid;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
            margin: 0 auto;
          }
          
          .event-marker:hover {
            transform: scale(1.2);
          }
          
          .event-1701 { border-color: #4CAF50; }
          .event-1702 { border-color: #2196F3; }
          .event-1703 { border-color: #F44336; }
          .event-1709 { border-color: #FF9800; }
          .event-5021 { border-color: #9c27b0; }

          /* Skjul routing control panel */
          .leaflet-routing-container {
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>🗺️ Kjørerute - ${licensePlate} - Tur ${turId}</h1>
        </div>
        <div id="map"></div>
        
      </body>
      </html>
    `);
    
    mapWindow.document.close();
    
    // Injiser JS-biblioteker dynamisk
    await new Promise(resolve => {
      function loadScript(src, onload) {
        const s = mapWindow.document.createElement('script');
        s.src = src;
        s.onload = onload;
        mapWindow.document.head.appendChild(s);
      }
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => {
        loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', () => {
          loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js', resolve);
        });
      });
    });
    
    // Injiser kartlogikk etter at bibliotekene er klare
    const initScript1 = mapWindow.document.createElement('script');
    initScript1.textContent = `
// Initialiser kart
const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// Hent event data fra parent window
const events = window.opener.currentRouteEvents;

function getIconAndTitle(eventType) {
  switch (eventType) {
    case "1701": return { icon: "➕", title: "Påstigning", color: "event-1701" };
    case "1702": return { icon: "➖", title: "Avstigning", color: "event-1702" };
    case "1703": return { icon: "❌", title: "Bomtur", color: "event-1703" };
    case "1709": return { icon: "📍", title: "Bil ved node", color: "event-1709" };
    case "3003": return { icon: "🏴", title: "Oppdrag bekreftet", color: "event-unknown" };
    case "5021": return { icon: "📡", title: "Auto-posisjon", color: "event-5021" };
    default: return { icon: "❓", title: "Ukjent", color: "event-unknown" };
  }
}

function formatTimestamp(isoString) {
  if (!isoString || isoString === "Ukjent") return "Ukjent";
  const dt = new Date(isoString);
  if (isNaN(dt)) return "Ukjent";
  const pad = n => n.toString().padStart(2, "0");
  return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
}

const markers = [];
const routeCoords = [];

// Opprett marker cluster group
const markerCluster = L.markerClusterGroup({
  maxClusterRadius: 20,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: false,  // Deaktiver auto-zoom ved klikk
  spiderfyOnEveryZoom: true    // Tillat spiderfy på alle zoom-nivåer
});

// Klikk for å spiderfy/unspiderfy (toggle)
markerCluster.on('clusterclick', function(e) {
  const cluster = e.layer;
  
  // Toggle: hvis allerede spiderfied → collapse, ellers → spiderfy
  if (cluster.getAllChildMarkers().length > 0 && cluster._icon) {
    // Sjekk om allerede spiderfied ved å se om cluster-ikon fortsatt finnes
    const isSpiderfied = cluster._group._featureGroup._map && 
                         !cluster._group._featureGroup._map.hasLayer(cluster);
    
    if (isSpiderfied) {
      cluster.unspiderfy();
    } else {
      cluster.spiderfy();
    }
  }
});

// Gjenbrukbar funksjon for å lage markør med popup
function createMarkerWithPopup(event, index) {
  const lat = parseFloat(event.lat);
  const lon = parseFloat(event.lon);
  const eventInfo = getIconAndTitle(event.eventType);
  const timeLabel = formatTimestamp(event.timestamp);
  
  // Custom ikon med tidsstempel
  const customIcon = L.divIcon({
    className: 'custom-marker-wrapper',
    html: '<div style="text-align: center;">' +
          '<div class="event-marker ' + eventInfo.color + '">' + eventInfo.icon + '</div>' +
          '<div style="font-size: 10px; font-weight: 600; color: #333; background: rgba(255,255,255,0.9); padding: 2px 4px; border-radius: 3px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap;">' + timeLabel + '</div>' +
          '</div>',
    iconSize: [50, 60],
    iconAnchor: [25, 30]
  });
  
  const marker = L.marker([lat, lon], { icon: customIcon });
  
  // Tooltip
  marker.bindTooltip(
    '<strong>' + (index + 1) + '. ' + eventInfo.title + '</strong><br>' +
    event.name,
    { direction: 'top', offset: [0, -30] }
  );
  
  // Popup
  marker.bindPopup(
    '<div style="min-width: 200px;">' +
    '<strong>' + eventInfo.icon + ' ' + eventInfo.title + '</strong><br>' +
    '<strong>Navn:</strong> ' + event.name + '<br>' +
    '<strong>Tidspunkt:</strong> ' + timeLabel + '<br>' +
    '<strong>Adresse:</strong> ' + event.address +
    '</div>',
    { offset: [0, -15] }  // Popup offset
  );
  
  return { marker: marker, coords: [lat, lon] };
}

// Legg til markører for hver hendelse
events.forEach((event, index) => {
  if (!event.lat || !event.lon) return;
  
  const result = createMarkerWithPopup(event, index);
  markerCluster.addLayer(result.marker);
  markers.push(result.marker);
  routeCoords.push(result.coords);
});

// Legg cluster til kart
map.addLayer(markerCluster);



// Hent routing-modus fra parent window
const routingMode = window.opener.currentRoutingMode || 'road';

// Tegn kjørerute mellom hendelsene
if (routeCoords.length > 1) {
  if (routingMode === 'road') {
    // MODUS: Rute langs vei (OSRM routing)
    const waypoints = routeCoords.map(coord => L.latLng(coord[0], coord[1]));
    
    try {
      const routingControl = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
          timeout: 10000  // 10 sekunder timeout
        }),
        lineOptions: {
          styles: [{ color: '#1976d2', weight: 4, opacity: 0.7 }]
        },
        createMarker: function() { return null; },
        addWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: false,
        show: false
      }).addTo(map);
      
      // Fallback ved routing-feil
      routingControl.on('routingerror', function(e) {
        console.warn('⚠️ OSRM routing feilet - bruker luftlinje som fallback');
        console.warn('Feilmelding:', e.error);
        
        // Fjern routing control
        map.removeControl(routingControl);
        
        // Vis luftlinje i stedet
        L.polyline(routeCoords, {
          color: '#1976d2',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 5'
        }).addTo(map);
      });
      
      console.log('✅ OSRM routing lastet');
      
    } catch (error) {
      console.error('❌ OSRM routing kastet exception - bruker luftlinje');
      console.error('Error:', error);
      
      // Fallback til luftlinje
      L.polyline(routeCoords, {
        color: '#1976d2',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5'
      }).addTo(map);
    }
  } else {
    // MODUS: Rett luftlinje
    L.polyline(routeCoords, {
      color: '#1976d2',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 5' // Stiplet linje for å vise at det er luftlinje
    }).addTo(map);
    
    console.log('✅ Luftlinje-routing lastet');
  }
}

// Zoom til alle markører
if (routeCoords.length > 0) {
  map.fitBounds(routeCoords, { padding: [50, 50] });
}

// Funksjon for å reloade data og resette zoom
window.reloadRouteData = function() {
  console.log('🔄 Reloader kjørerute-data og resetter zoom');
  
  // Fjern alle eksisterende markører og ruter
  map.eachLayer(function(layer) {
    // Behold kun base tile layer
    if (!(layer instanceof L.TileLayer)) {
      map.removeLayer(layer);
    }
  });
  
  // Hent oppdatert data fra parent
  const newEvents = window.opener.currentRouteEvents;
  const routingMode = window.opener.currentRoutingMode || 'road';
  
  if (!newEvents || newEvents.length === 0) {
    console.warn('Ingen events å vise');
    return;
  }
  
  // Re-initialiser markører og ruter
  const newMarkers = [];
  const newRouteCoords = [];
  const newMarkerCluster = L.markerClusterGroup({
    maxClusterRadius: 20,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    spiderfyOnEveryZoom: true
  });
  
  // Klikk for å toggle spiderfy
  newMarkerCluster.on('clusterclick', function(e) {
    const cluster = e.layer;
    
    if (cluster.getAllChildMarkers().length > 0 && cluster._icon) {
      const isSpiderfied = cluster._group._featureGroup._map && 
                           !cluster._group._featureGroup._map.hasLayer(cluster);
      
      if (isSpiderfied) {
        cluster.unspiderfy();
      } else {
        cluster.spiderfy();
      }
    }
  });
  
  // Bruk samme funksjon som ved første initialisering
  newEvents.forEach((event, index) => {
    if (!event.lat || !event.lon) return;
    
    const result = createMarkerWithPopup(event, index);
    newMarkerCluster.addLayer(result.marker);
    newMarkers.push(result.marker);
    newRouteCoords.push(result.coords);
  });
  
  map.addLayer(newMarkerCluster);
  
  // Tegn rute
  if (newRouteCoords.length > 1) {
    if (routingMode === 'road') {
      const waypoints = newRouteCoords.map(coord => L.latLng(coord[0], coord[1]));
      
      try {
        const routingControl = L.Routing.control({
          waypoints: waypoints,
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving',
            timeout: 10000
          }),
          lineOptions: {
            styles: [{ color: '#1976d2', weight: 4, opacity: 0.7 }]
          },
          createMarker: function() { return null; },
          addWaypoints: false,
          routeWhileDragging: false,
          showAlternatives: false,
          fitSelectedRoutes: false,
          show: false
        }).addTo(map);
        
        routingControl.on('routingerror', function(e) {
          console.warn('⚠️ OSRM routing feilet - bruker luftlinje som fallback');
          map.removeControl(routingControl);
          L.polyline(newRouteCoords, {
            color: '#1976d2',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 5'
          }).addTo(map);
        });
        
        console.log('✅ OSRM routing lastet');
      } catch (error) {
        console.error('❌ OSRM routing kastet exception - bruker luftlinje');
        L.polyline(newRouteCoords, {
          color: '#1976d2',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 5'
        }).addTo(map);
      }
    } else {
      L.polyline(newRouteCoords, {
        color: '#1976d2',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5'
      }).addTo(map);
      console.log('✅ Luftlinje-routing lastet');
    }
  }
  
  // Reset zoom til alle markører
  if (newRouteCoords.length > 0) {
    map.fitBounds(newRouteCoords, { padding: [50, 50] });
  }
};

    `;
    mapWindow.document.head.appendChild(initScript1);
  }
  
  /* ==========================
     9B. ÅPNE SINGLE EVENT I LEAFLET-KART
     ========================== */
  async function openSingleEventMap(event, licensePlate, turId) {
    if (!event.lat || !event.lon) {
      alert("Ingen koordinater tilgjengelig for denne hendelsen.");
      return;
    }
    
    const eventInfo = getIconAndTitle(event.eventType);
    
    // Åpne nytt vindu (alle enkelthendelser bruker samme vindu-navn)
    const width = Math.floor(window.innerWidth / 2);
    const height = Math.floor(window.innerHeight * 0.9);
    const mapWindow = window.open(
      '',
      'EventMap_Single', // Fast vindu-navn - alle hendelser deler samme vindu
      `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
    );
    
    if (!mapWindow) {
      alert("Popup blokkert – tillat popup og prøv igjen.");
      return;
    }
    
    // Sjekk om vinduet allerede er initialisert
    const isAlreadyInitialized = mapWindow.document.getElementById('map') !== null;
    
    if (isAlreadyInitialized) {
      console.log("📍 Oppdaterer enkelthendelse-vindu med ny data");
      
      // Oppdater data i eksisterende vindu
      const lat = parseFloat(event.lat);
      const lon = parseFloat(event.lon);
      
      if (mapWindow.updateEventData) {
        mapWindow.updateEventData({
          lat: lat,
          lon: lon,
          name: event.name,
          address: event.address,
          timestamp: event.timestamp,
          eventType: event.eventType,
          licensePlate: licensePlate,
          eventInfo: eventInfo
        });
      }
      
      mapWindow.focus();
      return;
    }
    
    console.log("📍 Initialiserer nytt enkelthendelse-vindu");
    
    const lat = parseFloat(event.lat);
    const lon = parseFloat(event.lon);
    
    mapWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${eventInfo.title} - ${licensePlate}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: Arial, sans-serif; overflow: hidden; display: flex; flex-direction: column; }
          
          #header {
            background: linear-gradient(to right, #025671, #169bbd);
            color: white;
            padding: 15px 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            flex-shrink: 0;
          }
          
          #header h1 {
            font-size: 18px;
            font-weight: 600;
          }
          
          #map {
            flex: 1;
            width: 100%;
            min-height: 0;
          }
          
          .custom-marker-wrapper {
            background: transparent;
            border: none;
          }
          
          .event-marker {
            background: white;
            border: 3px solid;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            margin: 0 auto;
          }
          
          .event-1701 { border-color: #4CAF50; }
          .event-1702 { border-color: #2196F3; }
          .event-1703 { border-color: #F44336; }
          .event-1709 { border-color: #FF9800; }
          .event-5021 { border-color: #9c27b0; }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>🗺️ ${eventInfo.icon} ${eventInfo.title} - ${licensePlate}</h1>
        </div>
        <div id="map"></div>
        
      </body>
      </html>
    `);
    
    // Lagre initData på mapWindow slik at injisert script kan lese det
    mapWindow.initData = {
      lat: lat,
      lon: lon,
      event: event,
      eventInfo: eventInfo
    };
    
    mapWindow.document.close();
    
    // Injiser Leaflet dynamisk
    await new Promise(resolve => {
      const s = mapWindow.document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = resolve;
      mapWindow.document.head.appendChild(s);
    });
    
    // Injiser kartlogikk
    const initScript2 = mapWindow.document.createElement('script');
    initScript2.textContent = `
function formatTimestamp(isoString) {
  if (!isoString || isoString === "Ukjent") return "Ukjent";
  const dt = new Date(isoString);
  if (isNaN(dt)) return "Ukjent";
  const pad = n => n.toString().padStart(2, "0");
  return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
}

const map = L.map('map').setView([window.initData.lat, window.initData.lon], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const eventInfo = {
  icon: window.initData.eventInfo.icon,
  title: window.initData.eventInfo.title,
  color: 'event-' + window.initData.event.eventType
};

// Funksjon for å hente ikon og tittel basert på eventType
function getIconAndTitle(eventType) {
  switch (eventType) {
    case "1701": return { icon: "➕", title: "Påstigning", color: "event-1701" };
    case "1702": return { icon: "➖", title: "Avstigning", color: "event-1702" };
    case "1703": return { icon: "❌", title: "Bomtur", color: "event-1703" };
    case "1709": return { icon: "📍", title: "Bil ved node", color: "event-1709" };
    case "5021": return { icon: "📡", title: "Auto-posisjon", color: "event-5021" };
    default: return { icon: "❓", title: "Ukjent", color: "event-unknown" };
  }
}

// Gjenbrukbar funksjon for å lage markør
function createEventMarker(lat, lon, name, address, timestamp, eventInfo) {
  const timeLabel = formatTimestamp(timestamp);
  
  // Custom ikon med tidsstempel
  const customIcon = L.divIcon({
    className: 'custom-marker-wrapper',
    html: '<div style="text-align: center;">' +
          '<div class="event-marker ' + eventInfo.color + '">' + eventInfo.icon + '</div>' +
          '<div style="font-size: 11px; font-weight: 600; color: #333; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap;">' + timeLabel + '</div>' +
          '</div>',
    iconSize: [50, 60],
    iconAnchor: [25, 30]
  });
  
  const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
  
  marker.bindPopup(
    '<div style="min-width: 200px;">' +
    '<strong>' + eventInfo.icon + ' ' + eventInfo.title + '</strong><br>' +
    '<strong>Navn:</strong> ' + name + '<br>' +
    '<strong>Tidspunkt:</strong> ' + timeLabel + '<br>' +
    '<strong>Adresse:</strong> ' + address +
    '</div>',
    { offset: [0, -15] }
  ).openPopup();
  
  return marker;
}

// Lag første markør
let currentMarker = createEventMarker(window.initData.lat, window.initData.lon, window.initData.event.name, window.initData.event.address, window.initData.event.timestamp, eventInfo);

// Funksjon for å oppdatere vindu med ny hendelse
window.updateEventData = function(newEvent) {
  // Fjern gammel markør
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }
  
  // Hent riktig eventInfo basert på eventType
  const newEventInfo = getIconAndTitle(newEvent.eventType);
  
  // Oppdater header
  document.querySelector('#header h1').textContent = 
    '🗺️ ' + newEventInfo.icon + ' ' + newEventInfo.title + ' - ' + newEvent.licensePlate;
  
  // Lag ny markør med gjenbrukbar funksjon
  currentMarker = createEventMarker(
    newEvent.lat, 
    newEvent.lon, 
    newEvent.name, 
    newEvent.address, 
    newEvent.timestamp,
    newEventInfo  // Bruk newEventInfo i stedet for newEvent.eventInfo
  );
  
  // Zoom til ny posisjon
  map.setView([newEvent.lat, newEvent.lon], 16);
};

    `;
    mapWindow.document.head.appendChild(initScript2);
  }

  /* ==========================
     10. VIS KOMBINERT POPUP
     ========================== */
  function showCombinedPopup(phoneNumber, eventData, turId, time3003, agreementInfo, senderIdOrg, licensePlate3003) {
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
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 18px; color: #333;">
          Ressursinformasjon: <a href="/administrasjon/admin/searchStatus?id=${turId}" 
                                  style="color: #1976d2; text-decoration: none;"
                                  title="Åpne turnummer ${turId} i NISSY admin">${licensePlate}</a>
        </h2>
    `;

    // Avtale-info til høyre
    if (agreementInfo) {
      html += `
        <div style="text-align: right; font-size: 13px; color: #666; max-width: 250px;" title="Områdekode: ${agreementInfo.avtaleKode}">
          <span style="font-weight: 500;"><b>Avtale:</b></span> ${agreementInfo.avtaleNavn}
        </div>
      `;
    }

    html += `</div>`;

    // VIS 3003 TIDSPUNKT (når ressurs bekreftet)
    if (time3003) {
      // Konverter "24/12/2025 20:55:09" til "20:55"
      const timeOnly = time3003.split(' ')[1]?.substring(0, 5) || time3003;
      
      
      // Sjekk om avsender er ITF (itf0010.967332550)
      const showLoyveLink = senderIdOrg && senderIdOrg.includes('itf0010.967332550');
      
      html += `
        <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ff9800; display: flex; justify-content: space-between; align-items: center;" title="Når 3003 XML ble mottatt">
          <div>
            <span style="font-weight: bold;">🚕 Oppdrag bekreftet: </span>
            <span style="font-size: 15px; font-weight: bold; color: #856404;">${timeOnly}</span>
            
            ${!phoneNumber ? '<span style="margin-left: 10px; color: #d32f2f;">⚠️ Fant ikke telefonnummer</span>' : ''}
          </div>
      `;
      
      // Legg til løyveregister-link hvis avsender er ITF
      if (showLoyveLink && licensePlate3003) {
        const loyveUrl = `https://pasientreiser.tronder.taxi/Loyver/Oversikt?Loyve=${encodeURIComponent(licensePlate3003)}`;
        html += `
          <div>
            <a href="${loyveUrl}" 
               style="
                 color: #1976d2;
                 text-decoration: none;
                 font-size: 13px;
                 padding: 4px 8px;
                 background: #e3f2fd;
                 border-radius: 4px;
               "
               title="Åpne Trøndertaxi sitt løyveregister for ${licensePlate3003}">
              📋 Løyveregister
            </a>
          </div>
        `;
      }
      
      html += `</div>`;
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
              <input type="checkbox" id="toggle1709" ${eventData.events.length <= 13 ? "checked" : ""}>
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
        const formattedTime = formatTimestamp(r.timestamp);
        const rowClass = r.eventType === "1709" ? "row1709" : "";
        
        // Escape JSON for data-attributt
        const eventJson = JSON.stringify(r).replace(/"/g, '&quot;');

        html += `
          <tr class="${rowClass}" style="border-bottom: 1px solid #e9ecef; background: white; transition: background-color 0.2s;">
            <td style="padding: 10px 8px;">
              ${r.bookingId
                ? `<a href="/administrasjon/admin/searchStatus?nr=${r.bookingId}"
                 style="color: #1976d2; text-decoration: none; font-weight: 500;"
                 title="Åpne bestilling ${r.bookingId} i NISSY admin">
                🧾${formatBookingId(r.bookingId)}
              </a>`
                : r.eventType === "5021"
                  ? `<span style="color: #7b1fa2; font-size: 13px;" title="Automatisk lokasjon">📡 5021</span>`
                  : `<span style="color: #ff9800; font-size: 13px;" title="Oppdragsbekreftelse fra taxi">🚕 3003</span>`
              }
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
              <a href="#" 
                 class="coord-link"
                 data-event="${eventJson}"
                 style="color: #1976d2; text-decoration: none;"
                 title="${title} - Vis i kart">
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
    
    if (eventData.events.length > 0) {
      html += `
        <button id="showRouteMap" style="
             padding: 10px 16px;
             background: #2980b9;
             color: white;
             border: none;
             border-radius: 6px;
             font-size: 14px;
             cursor: pointer;
           " title="Åpner kjørerute basert på faktiske hendelser fra taksameter i Leaflet-kart">
          🗺️ Vis kjørerute i kart
        </button>
      `;
    }
    
    html += `</div>`;

    popup.innerHTML = html;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    // Juster posisjon hvis popup går utenfor høyre kant av skjermen
    setTimeout(() => {
      const popupRect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Sjekk om popup går utenfor høyre kant
      if (popupRect.right > viewportWidth) {
        // Beregn hvor mye popup overlapper
        const overflow = popupRect.right - viewportWidth;

        // Flytt popup mot venstre (men ikke lengre enn nødvendig)
        const currentLeft = rowRect.left - 20;
        const newLeft = Math.max(10, currentLeft - overflow - 20); // 20px ekstra margin

        popup.style.left = `${newLeft}px`;
        popup.style.transform = 'translateX(0)'; // Fjern transform siden vi nå bruker absolutt left
      }

      // Sjekk også om popup går utenfor venstre kant (edge case)
      const updatedRect = popup.getBoundingClientRect();
      if (updatedRect.left < 0) {
        popup.style.left = '10px';
        popup.style.transform = 'translateX(0)';
      }
    }, 10); // Liten forsinkelse for å la DOM rendere

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

    
    const coordLinks = popup.querySelectorAll(".coord-link");
    coordLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const eventData = JSON.parse(link.getAttribute('data-event'));
        openSingleEventMap(eventData, licensePlate, turId);
      });
    });

    const bookingLinks = popup.querySelectorAll("a[href^='/administrasjon/admin/searchStatus']");
    bookingLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        // Åpne NISSY admin-linker uten consent-sjekk
        const width = Math.floor(window.innerWidth / 2);
        const height = Math.floor(window.innerHeight * 0.9);
        window.open(
          link.href,
          "_blank",
          `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
        );
      });
    });
    
    // Løyveregister-link (åpnes i nytt vindu uten consent-sjekk)
    const loyveLinks = popup.querySelectorAll("a[href^='https://pasientreiser.tronder.taxi/Loyver/Oversikt']");
    loyveLinks.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const width = Math.floor(window.innerWidth / 2);
        const height = Math.floor(window.innerHeight * 0.9);
        window.open(
          link.href,
          "_blank",
          `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
        );
      });
    });
    
    // Kjørerute-knapp (åpner Leaflet-kart)
    const showRouteMapBtn = popup.querySelector("#showRouteMap");
    if (showRouteMapBtn) {
      showRouteMapBtn.addEventListener("click", () => {
        openRouteMap(eventData.events, licensePlate, turId);
      });
    }

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
      
      // Frigjør sperre når popup lukkes
      isRunning = false;
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

  console.log("✅ Ressursinfo-script lastet");
   
})(); // End wrapper
