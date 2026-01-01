// Kombinert ressursinformasjon (3003 + 4010)
(function() {
  // Sjekk om hotkey-listener allerede er installert
  if (window.__ressursInfoHotkeyInstalled) {
    console.log('✅ Ressurinfo (Alt+D) er allerede installert!');
    return;
  }

  // Installer hotkey-listener
  window.__ressursInfoHotkeyInstalled = true;
  
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

    // Hent både 3003 og 4010 XML-lenker + tidspunkt for 3003
    // Filtrer på turId (4. <td> fra venstre) for å unngå unødvendig XML-parsing
    const xml3003Links = [];
    const xml4010Links = [];
    let time3003 = null;
    
    // Split HTML i rader
    const rows = detailHtml.split('<tr');
    
    for (const row of rows) {
      // Kun se på rader med SutiMsgReceived
      if (!row.includes('SutiMsgReceived')) continue;
      
      // Sjekk om raden inneholder riktig turId i 4. <td>
      // Regex for å finne alle <td> celler og sjekke 4. celle
      const tdMatches = row.match(/<td[^>]*>.*?<\/td>/g);
      if (!tdMatches || tdMatches.length < 4) continue;
      
      // 4. <td> (indeks 3) skal inneholde turId
      const turIdCell = tdMatches[3];
      const turIdMatch = turIdCell.match(/<nobr>(\d+)<\/nobr>/);
      
      // Hopp over hvis turId ikke matcher
      if (!turIdMatch || turIdMatch[1] !== turId) continue;
      
      // SUTI-koden (3003 eller 4010) står i en <td valign="top">
      const sutiTdMatch = row.match(/<td\s+valign="top">(\d+)/);
      if (!sutiTdMatch) continue;
      
      const sutiCode = sutiTdMatch[1];
      
      // Finn XML-lenken i samme rad
      const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
      if (xmlLinkMatch) {
        const url = xmlLinkMatch[1];
        
        if (sutiCode === '3003') {
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
    const phoneNumber = await extractPhoneNumber(xml3003Links);
    const eventData = await extractEventData(xml4010Links);

    // Vis popup
    showCombinedPopup(phoneNumber, eventData, turId, time3003);
  }

  /* ==========================
     HJELPEFUNKSJONER
     ========================== */
  async function unescapeHtml(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  async function fetchAndParseXML(url) {
    const resp = await fetch(url);
    const htmlText = await resp.text();

    const preMatch = htmlText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) throw new Error("Fant ikke <pre>-tagg i XML-siden.");

    const xmlStringEscaped = preMatch[1];
    const xmlString = await unescapeHtml(xmlStringEscaped.trim());

    const parser = new DOMParser();
    return parser.parseFromString(xmlString, "text/xml");
  }

  /* ==========================
     6. Hent telefonnummer (3003)
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
     7. Hent hendelser (4010)
     ========================== */
  async function extractEventData(xmlUrls) {
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

        const timeNode = node.querySelector("timesNode > time");
        const timestamp = timeNode?.getAttribute("time") || "Ukjent";

        const geo = node.querySelector("addressNode > geographicLocation");
        const lat = geo?.getAttribute("lat") || "";
        const lon = geo?.getAttribute("long") || "";

        const idOrderNode = node.querySelector("subOrderContent > idOrder");
        const bookingId = idOrderNode?.getAttribute("id") || "Ukjent";

        const contentNode = node.querySelector("contents > content[contentType='1001']");
        const name = contentNode?.getAttribute("name") || "Ukjent";

        results.push({
          bookingId,
          eventType,
          timestamp,
          lat,
          lon,
          name
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
     8. VIS KOMBINERT POPUP
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
                                title="Åpne tur ${turId}">${licensePlate}</a>
      </h2>
    `;

    // VIS 3003 TIDSPUNKT (når ressurs bekreftet)
    if (time3003) {
      // Konverter "24/12/2025 20:55:09" til "20:55"
      const timeOnly = time3003.split(' ')[1]?.substring(0, 5) || time3003;
      
      html += `
        <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ff9800;">
          <span style="font-weight: bold; color: #856404;">🚗 Oppdrag bekreftet: ${timeOnly}</span>
          ${!phoneNumber ? '<span style="margin-left: 10px; color: #d32f2f;">⚠️ Fant ikke telefonnummer</span>' : ''}
        </div>
      `;
    }

    // TELEFONNUMMER SEKSJON
    if (phoneNumber) {
      html += `
        <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">📞 Telefonnummer sjåfør:</div>
            <div style="font-size: 18px; font-weight: bold; color: #2e7d32;">
              ${phoneNumber}
            </div>
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
            <h3 style="margin: 0; font-size: 16px; color: #333;">
              SUTI 4010-hendelser
            </h3>
            <label style="font-size: 13px; cursor: pointer;">
              <input type="checkbox" id="toggle1709" checked>
              Vis 1709 (Bil ved node)
            </label>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: linear-gradient(to bottom, #f8f9fa, #e9ecef); border-bottom: 2px solid #dee2e6;">
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Bestilling</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Navn</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Type</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Tidspunkt</th>
                <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #495057;">Koordinater</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const r of eventData.events) {
        const { icon, title } = getIconAndTitle(r.eventType);
        const coordText = `Åpne i kart`;
        const gmapsUrl = `https://www.google.no/maps/search/?api=1&query=${r.lat},${r.lon}`;
        const formattedTime = formatTimestamp(r.timestamp);
        const rowClass = r.eventType === "1709" ? "row1709" : "";

        html += `
          <tr class="${rowClass}" style="border-bottom: 1px solid #e9ecef; background: white; transition: background-color 0.2s;">
            <td style="padding: 10px 8px;">
              <a href="/administrasjon/admin/searchStatus?nr=${r.bookingId}" 
                 style="color: #1976d2; text-decoration: none; font-weight: 500;"
                 title="Åpne bestilling">
                ${r.bookingId}
              </a>
            </td>
            <td style="padding: 10px 8px; color: #495057;">${r.name}</td>
            <td style="padding: 10px 8px;" title="${title}">
              <span style="display: inline-block; background: #e3f2fd; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                ${r.eventType} ${icon}
              </span>
            </td>
            <td style="padding: 10px 8px; color: #495057; font-family: monospace;">${formattedTime}</td>
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

      if (eventData.routeUrl) {
        html += `
          <a href="${eventData.routeUrl}" 
             style="
               display: inline-block;
               margin-top: 12px;
               padding: 10px 16px;
               background: #1976d2;
               color: white;
               text-decoration: none;
               border-radius: 6px;
               font-size: 14px;
             ">
            🗺️ Bilens faktiske kjørerute (åpne i kart)
          </a>
        `;
      }

      html += `</div>`;
    } else if (!phoneNumber) {
      html += `<p style="color: #666;">Ingen data funnet.</p>`;
    }

    html += `
      <button id="closePopup" style="
        margin-top: 15px;
        padding: 10px 20px;
        background: #666;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">
        Lukk (ESC)
      </button>
    `;

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
      if (p) p.remove();
      if (o) o.remove();
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
