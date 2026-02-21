// ============================================================
// LIVE RESSURSKART SCRIPT (ALT+O)
// Viser sanntidsposisjon for alle merkede ressurser i Leaflet-kart
// Henter siste 4010 XML-posisjon og oppdaterer hvert 60. sekund
// ============================================================

(function() {
  // Sjekk om hotkey-listener allerede er installert
  if (window.__liveRessurskartHotkeyInstalled) {
    console.log('✅ Live Ressurskart-script er allerede aktiv');
    return;
  }

  window.__liveRessurskartHotkeyInstalled = true;
  
  // Konfigurerbar oppdateringsintervall (sekunder)
  const UPDATE_INTERVAL = 60;
  
  // Zoom-nivå for enkelt markør (19 = helt inn, 1 = helt ut)
  // 13 = ca 2 zoom ut fra maksimum, passer for by-nivå
  const SINGLE_MARKER_ZOOM = 14;
  window.SINGLE_MARKER_ZOOM = SINGLE_MARKER_ZOOM; // Eksporter for map-vindu
  
  console.log("🚀 Starter Live Ressurskart-script");
  
  document.addEventListener('keydown', function(e) {
    // Alt+O (både lowercase og uppercase)
    if (e.altKey && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      openLiveMap();
    }
  });

  async function openLiveMap() {
    const SELECTED_BG = "rgb(148, 169, 220)";
    
    // Finn alle merkede ressurser
    const allSelectedRows = [...document.querySelectorAll("tr")].filter(tr =>
      getComputedStyle(tr).backgroundColor === SELECTED_BG &&
      tr.id?.startsWith("R")
    );
    
    if (allSelectedRows.length === 0) {
      alert("Ingen ressurser er merket.");
      return;
    }
    
    console.log(`📍 Fant ${allSelectedRows.length} merkede ressurser`);
    
    // Åpne nytt vindu med kart (samme dimensjoner som Rutekalkulering)
    const width = Math.floor(window.innerWidth / 2);
    const height = Math.floor(window.innerHeight * 0.9);
    const mapWindow = window.open(
      '', 
      'LiveMap', 
      `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
    );
    
    if (!mapWindow) {
      alert("Popup blokkert – tillat popup og prøv igjen.");
      return;
    }
    
    // Sjekk om vinduet allerede er initialisert
    const isAlreadyInitialized = mapWindow.document.getElementById('map') !== null;
    
    if (isAlreadyInitialized) {
      console.log("📍 Gjenbruker eksisterende kart-vindu");
      // Lagre nye ressurser
      window.currentMapWindow = mapWindow;
      window.currentResources = allSelectedRows;
      // Oppdater kartdata med nye ressurser
      updateMapData();
      return;
    }
    
    // Første gang - bygg HTML med Leaflet
    console.log("📍 Initialiserer nytt kart-vindu");
    
    // Bygg HTML med Leaflet
    mapWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Live Ressurskart - NISSY</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            overflow: hidden;
          }
          
          #header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          #header h1 {
            font-size: 20px;
            font-weight: 600;
          }
          
          #controls {
            display: flex;
            gap: 15px;
            align-items: center;
          }
          
          #status {
            font-size: 13px;
            padding: 6px 12px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          }
          
          #updateInterval {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
          }
          
          #refreshBtn {
            padding: 8px 16px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          #refreshBtn:hover {
            background: #f0f0f0;
            transform: translateY(-1px);
          }
          
          #map {
            height: calc(100vh - 60px);
            width: 100%;
          }
          
          .custom-marker-wrapper {
            background: transparent;
            border: none;
          }
          
          .vehicle-marker {
            background: #4CAF50;
            border: 3px solid white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
            margin: 0 auto;
          }
          
          .vehicle-marker:hover {
            transform: scale(1.2);
          }
          
          .leaflet-popup-content-wrapper {
            border-radius: 8px;
            padding: 0;
            overflow: hidden;
          }
          
          .leaflet-popup-content {
            margin: 0;
            min-width: 250px;
          }
          
          .popup-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 15px;
            font-weight: 600;
            font-size: 16px;
          }
          
          .popup-body {
            padding: 15px;
          }
          
          .popup-row {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .popup-row:last-child {
            margin-bottom: 0;
          }
          
          .popup-label {
            font-weight: 600;
            color: #666;
            min-width: 80px;
          }
          
          .popup-value {
            color: #333;
          }
          
          .popup-link {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 13px;
            transition: background 0.2s;
          }
          
          .popup-link:hover {
            background: #5568d3;
          }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>🗺️ Live Ressurskart - NISSY</h1>
          <div id="controls">
            <div id="status">
              <span id="vehicleCount">0</span> biler | 
              Sist oppdatert: <span id="lastUpdate">-</span>
            </div>
            <label style="font-size: 13px;">
              Oppdater hvert 
              <input type="number" id="updateInterval" value="${UPDATE_INTERVAL}" min="10" max="300" style="width: 60px;"> 
              sekund
            </label>
            <button id="refreshBtn">🔄 Oppdater nå</button>
          </div>
        </div>
        <div id="map"></div>
        
        <script>
          // Initialiser kart (senter på Norge/Trøndelag)
          const map = L.map('map').setView([63.4305, 10.3951], 10);
          
          // Legg til OpenStreetMap tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);
          
          // Lagre markører for å kunne fjerne dem ved oppdatering
          let markers = [];
          let updateTimer = null;
          
          // Funksjon for å formatere tidspunkt
          function formatTimestamp(isoString) {
            if (!isoString || isoString === "Ukjent") return "Ukjent";
            const dt = new Date(isoString);
            if (isNaN(dt)) return "Ukjent";
            const pad = n => n.toString().padStart(2, "0");
            return pad(dt.getHours()) + ":" + pad(dt.getMinutes());
          }
          
          // Funksjon for å hente ikon og tittel basert på eventType
          function getIconAndTitle(eventType) {
            switch (eventType) {
              case "1701": return { icon: "➕", title: "Påstigning" };
              case "1702": return { icon: "➖", title: "Avstigning" };
              case "1703": return { icon: "❌", title: "Bomtur" };
              case "1709": return { icon: "📍", title: "Bil ved node" };
              default: return { icon: "❓", title: "Ukjent hendelse" };
            }
          }
          
          // Funksjon for å legge til markører
          window.addVehicleMarkers = function(vehicles) {
            // Hent zoom-nivå fra parent window
            const singleMarkerZoom = window.opener.SINGLE_MARKER_ZOOM || 13;
            
            // Fjern gamle markører
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            
            if (vehicles.length === 0) {
              alert("Fant ingen posisjonsdata for de merkede ressursene.");
              return;
            }
            
            // Oppdater status
            document.getElementById('vehicleCount').textContent = vehicles.length;
            const now = new Date();
            document.getElementById('lastUpdate').textContent = 
              now.getHours().toString().padStart(2, '0') + ':' + 
              now.getMinutes().toString().padStart(2, '0');
            
            // Legg til nye markører
            const bounds = [];
            
            vehicles.forEach(v => {
              if (!v.lat || !v.lon) return;
              
              const lat = parseFloat(v.lat);
              const lon = parseFloat(v.lon);
              
              // Formater tidspunkt for label
              const timeLabel = formatTimestamp(v.timestamp);
              
              // Custom ikon med tidsstempel
              const customIcon = L.divIcon({
                className: 'custom-marker-wrapper',
                html: '<div style="text-align: center;">' +
                      '<div class="vehicle-marker">🚕</div>' +
                      '<div style="font-size: 11px; font-weight: 600; color: #333; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; margin-top: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); white-space: nowrap;">' + timeLabel + '</div>' +
                      '</div>',
                iconSize: [50, 60],
                iconAnchor: [25, 30]
              });
              
              const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
              
              // Tooltip ved hover (kompakt info)
              const eventInfo = getIconAndTitle(v.eventType);
              marker.bindTooltip(
                '<strong>' + v.licensePlate + '</strong><br>' +
                eventInfo.icon + ' ' + eventInfo.title,
                {
                  direction: 'top',
                  offset: [0, -25]
                }
              );
              
              // Popup ved klikk (full info)
              const popupContent = \`
                <div class="popup-header">
                  🚕 \${v.licensePlate}
                </div>
                <div class="popup-body">
                  <div class="popup-row">
                    <span class="popup-label">Turnummer:</span>
                    <span class="popup-value">\${v.turId}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Siste hendelse:</span>
                    <span class="popup-value">\${eventInfo.icon} \${eventInfo.title}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Tidspunkt:</span>
                    <span class="popup-value">\${formatTimestamp(v.timestamp)}</span>
                  </div>
                  <div class="popup-row">
                    <span class="popup-label">Posisjon:</span>
                    <span class="popup-value">\${lat.toFixed(4)}, \${lon.toFixed(4)}</span>
                  </div>
                  <a href="\${v.nissyUrl}" target="_blank" class="popup-link">
                    📋 Åpne i NISSY Admin
                  </a>
                </div>
              \`;
              
              marker.bindPopup(popupContent, { offset: [0, -10] });
              markers.push(marker);
              bounds.push([lat, lon]);
            });
            
            // Zoom til alle markører
            if (bounds.length > 0) {
              if (bounds.length === 1) {
                // Kun én markør - zoom til konfigurerbart nivå
                map.setView(bounds[0], singleMarkerZoom);
              } else {
                // Flere markører - zoom til alle
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          };
          
          // Manuel refresh-knapp
          document.getElementById('refreshBtn').addEventListener('click', () => {
            window.opener.updateMapData();
          });
          
          // Auto-refresh
          function startAutoUpdate() {
            if (updateTimer) {
              clearInterval(updateTimer);
            }
            
            const interval = parseInt(document.getElementById('updateInterval').value) * 1000;
            updateTimer = setInterval(() => {
              window.opener.updateMapData();
            }, interval);
          }
          
          // Start auto-update når intervall endres
          document.getElementById('updateInterval').addEventListener('change', startAutoUpdate);
          
          // Start auto-update
          startAutoUpdate();
          
          // Cleanup når vindu lukkes
          window.addEventListener('beforeunload', () => {
            if (updateTimer) {
              clearInterval(updateTimer);
            }
          });
        </script>
      </body>
      </html>
    `);
    
    mapWindow.document.close();
    
    // Vent til vindu og Leaflet er klart
    await new Promise(resolve => {
      const checkReady = () => {
        if (mapWindow.L && mapWindow.document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
    
    // Lagre referanse til ressurser
    window.currentMapWindow = mapWindow;
    window.currentResources = allSelectedRows;
    
    // Hent initial data
    updateMapData();
  }

  // Funksjon for å hente og oppdatere kartdata
  window.updateMapData = async function() {
    if (!window.currentMapWindow || window.currentMapWindow.closed) {
      console.log("Kart-vindu er lukket");
      return;
    }
    
    // Forhindre dobbel kjøring
    if (window.isUpdating) {
      console.log("⏳ Oppdatering pågår allerede...");
      return;
    }
    
    window.isUpdating = true;
    
    console.log("🔄 Oppdaterer kartdata...");
    
    const vehicles = [];
    
    for (const row of window.currentResources) {
      const licensePlate = row.cells[1]?.textContent.trim();
      if (!licensePlate) continue;
      
      // Hent turId
      const img = row.querySelector('img[onclick*="searchStatus?id="]');
      if (!img) continue;
      
      const turId = img.getAttribute("onclick")?.match(/searchStatus\?id=(\d+)/)?.[1];
      if (!turId) continue;
      
      try {
        // Hent siste 4010 XML-posisjon
        const positionData = await fetchLatestPosition(licensePlate, turId);
        
        if (positionData) {
          vehicles.push({
            licensePlate: licensePlate,
            turId: turId,
            lat: positionData.lat,
            lon: positionData.lon,
            timestamp: positionData.timestamp,
            eventType: positionData.eventType,
            nissyUrl: "/administrasjon/admin/searchStatus?id=" + turId
          });
        }
      } catch (e) {
        console.error("Feil ved henting av posisjon for " + licensePlate + ":", e);
      }
    }
    
    console.log("✓ Hentet posisjon for " + vehicles.length + " biler");
    
    // Send data til kart-vindu
    if (window.currentMapWindow && !window.currentMapWindow.closed) {
      window.currentMapWindow.addVehicleMarkers(vehicles);
    }
    
    // Frigjør oppdateringsflagg
    window.isUpdating = false;
  };

  // Funksjon for å hente siste 4010-posisjon for en ressurs
  async function fetchLatestPosition(licensePlate, turId) {
    try {
      // POST til searchStatus for å få requisitionId
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/administrasjon/admin/searchStatus", false); // Sync for enkelhet
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      
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
      
      if (xhr.status !== 200) return null;
      
      const html = xhr.responseText;
      const m = html.match(/getRequisitionDetails\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return null;
      
      const [, requisitionId, db, tripId, highlightTripNr] = m;
      
      // Hent AJAX details
      const detailUrl = "/administrasjon/admin/ajax_reqdetails?id=" + requisitionId + "&db=" + db + "&tripid=" + tripId + "&showSutiXml=true&hideEvents=&full=true&highlightTripNr=" + highlightTripNr;
      
      const resp = await fetch(detailUrl);
      const detailHtml = await resp.text();
      
      // Finn siste 4010 XML-link
      const rows = detailHtml.split('<tr');
      let latest4010Url = null;
      
      for (const row of rows) {
        const tdMatches = row.match(/<td[^>]*>.*?<\/td>/g);
        if (!tdMatches || tdMatches.length < 4) continue;
        
        const turIdCell = tdMatches[3];
        const turIdMatch = turIdCell.match(/<nobr>(\d+)<\/nobr>/);
        if (!turIdMatch || turIdMatch[1] !== turId) continue;
        
        const sutiTdMatch = row.match(/<td\s+valign="top">(\d+)/);
        if (!sutiTdMatch) continue;
        
        const sutiCode = sutiTdMatch[1];
        
        if (sutiCode === '4010') {
          const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
          if (xmlLinkMatch) {
            latest4010Url = xmlLinkMatch[1];
            // Ta siste 4010 (ikke break, fortsett å søke)
          }
        }
      }
      
      if (!latest4010Url) return null;
      
      // Parse 4010 XML
      const xmlResp = await fetch(latest4010Url);
      const xmlText = await xmlResp.text();
      
      const preMatch = xmlText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (!preMatch) return null;
      
      // Unescape HTML entities
      const txt = document.createElement("textarea");
      txt.innerHTML = preMatch[1];
      let unescapedXml = txt.value;
      
      // Fjern whitespace før XML-deklarasjon
      unescapedXml = unescapedXml.trim();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(unescapedXml, "text/xml");
      
      // Sjekk for parsing-feil
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error("XML parsing error:", parseError.textContent);
        return null;
      }
      
      // Sjekk at det er riktig ressurs
      const idVeh = xmlDoc.querySelector("referencesTo > idVehicle");
      if (!idVeh || idVeh.getAttribute("id") !== licensePlate) return null;
      
      // Hent koordinater og eventType
      const pickup = xmlDoc.querySelector("pickupConfirmation");
      if (!pickup) return null;
      
      const eventType = pickup.getAttribute("eventType");
      
      const node = pickup.querySelector("nodeConfirmed");
      if (!node) return null;
      
      const timeNode = node.querySelector("timesNode > time");
      const timestamp = timeNode?.getAttribute("time") || null;
      
      const geo = node.querySelector("addressNode > geographicLocation");
      const lat = geo?.getAttribute("lat");
      const lon = geo?.getAttribute("long");
      
      if (!lat || !lon) return null;
      
      return {
        lat: lat,
        lon: lon,
        timestamp: timestamp,
        eventType: eventType
      };
      
    } catch (e) {
      console.error("Feil ved parsing av 4010 XML:", e);
      return null;
    }
  }

  console.log("⌨️  Live Ressurskart snarvei: ALT+O");
  console.log("✅ Live Ressurskart-script lastet");
   
})();
