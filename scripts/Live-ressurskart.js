// ============================================================
// LIVE RESSURSKART SCRIPT (ALT+Z)
// Viser sanntidsposisjon for alle merkede ressurser i Leaflet-kart
// Henter siste 2000 og 3003 XML og presenterer relevant data i popup
// Henter siste 4010 XML-posisjon og oppdaterer hvert 5. minutt
// ============================================================

(function() {
  // Sjekk om hotkey-listener allerede er installert
  if (window.__liveRessurskartHotkeyInstalled) {
    console.log('✅ Live Ressurskart-script er allerede aktiv');
    return;
  }

  window.__liveRessurskartHotkeyInstalled = true;
  
  // ============================================================
  // TOAST-FEILMELDING
  // ============================================================
  let currentErrorToast = null;
  
  function showErrorToast(msg) {
    if (currentErrorToast && currentErrorToast.parentNode) {
      currentErrorToast.parentNode.removeChild(currentErrorToast);
    }
    const toast = document.createElement("div");
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#d9534f",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      zIndex: "999999",
      opacity: "0",
      transition: "opacity 0.3s ease"
    });
    document.body.appendChild(toast);
    currentErrorToast = toast;
    setTimeout(() => { toast.style.opacity = "1"; }, 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        if (currentErrorToast === toast) currentErrorToast = null;
      }, 300);
    }, 4000);
  }
  window.showErrorToast = showErrorToast; // Eksporter så kart-vinduet kan bruke den
  
  // Sperre mot dobbel-åpning mens data lastes
  let isOpening = false;
  let loadingToast = null;

  function showLoadingToast(msg) {
    if (loadingToast && loadingToast.parentNode) {
      loadingToast.parentNode.removeChild(loadingToast);
    }
    const toast = document.createElement("div");
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#047CA1",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      zIndex: "999999",
      opacity: "0",
      transition: "opacity 0.3s ease"
    });
    document.body.appendChild(toast);
    loadingToast = toast;
    setTimeout(() => { toast.style.opacity = "1"; }, 10);
  }

  function hideLoadingToast() {
    if (!loadingToast) return;
    const toast = loadingToast;
    loadingToast = null;
    toast.style.opacity = "0";
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }
  
  // Konverter UTM sone N til WGS-84 (brukes for koordinater fra 2000 XML)
  function utmToLatLon(easting, northing, zone) {
    const k0 = 0.9996, a = 6378137, e2 = 0.00669437999014;
    const x = easting - 500000, y = northing;
    const e12 = e2 / (1 - e2);
    const M = y / k0;
    const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));
    const e1 = (1 - Math.sqrt(1-e2)) / (1 + Math.sqrt(1-e2));
    const p1 = mu + e1*(3/2 - 27*e1*e1/32)*Math.sin(2*mu)
              + e1*e1*(21/16 - 55*e1*e1/32)*Math.sin(4*mu)
              + e1*e1*e1*(151/96)*Math.sin(6*mu);
    const sp1 = Math.sin(p1), cp1 = Math.cos(p1), tp1 = Math.tan(p1);
    const N1 = a / Math.sqrt(1 - e2*sp1*sp1);
    const R1 = a*(1-e2) / Math.pow(1-e2*sp1*sp1, 1.5);
    const T1 = tp1*tp1, C1 = e12*cp1*cp1;
    const D = x / (N1*k0);
    const lat = p1 - N1*tp1/R1*(D*D/2 - D*D*D*D*(5+3*T1+10*C1-4*C1*C1-9*e12)/24);
    const lon0 = (zone*6 - 183) * Math.PI/180;
    const lon = lon0 + (D - D*D*D*(1+2*T1+C1)/6) / cp1;
    return { lat: lat*180/Math.PI, lon: lon*180/Math.PI };
  }

  // Zoom-nivå for enkelt markør (19 = helt inn, 1 = helt ut)
  // 13 = ca 2 zoom ut fra maksimum, passer for by-nivå
  const SINGLE_MARKER_ZOOM = 14;
  window.SINGLE_MARKER_ZOOM = SINGLE_MARKER_ZOOM; // Eksporter for map-vindu
  
  // Konfigurerbar oppdateringsintervall (minutter), default 5, min 1, max 30
  const UPDATE_INTERVAL = 5;
  
  console.log("🚀 Starter Live Ressurskart-script");
  
  document.addEventListener('keydown', function(e) {
    // Alt+Z (både lowercase og uppercase)
    if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
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
      showErrorToast("📡 Ingen ressurser er merket.");
      return;
    }
    
    console.log(`📍 Fant ${allSelectedRows.length} merkede ressurser`);

    // Sjekk om kartet allerede er åpent og gjenbruk det
    if (window.currentMapWindow && !window.currentMapWindow.closed &&
        window.currentMapWindow.document.getElementById('map') !== null) {
      console.log("📍 Gjenbruker eksisterende kart-vindu");
      window.currentMapWindow.focus();
      window.currentResources = allSelectedRows;
      updateMapData();
      return;
    }

    // Sperre mot dobbel-åpning
    if (isOpening) {
      console.log("⏳ Kart åpnes allerede – ignorerer ny forespørsel");
      return;
    }
    isOpening = true;

    // Hent posisjonsdata FØR vi åpner vinduet
    const resourceCount = allSelectedRows.filter(r => {
      const lp = r.cells[1]?.textContent.trim();
      return lp && !/-\d{8,}$/.test(lp);
    }).length;
    showLoadingToast(`📡 Henter posisjonsdata for ${resourceCount} ressurs${resourceCount !== 1 ? 'er' : ''}…`);

    let vehicles;
    try {
      vehicles = await fetchAllVehicleData(allSelectedRows);
    } finally {
      hideLoadingToast();
      isOpening = false;
    }

    if (vehicles.length === 0) {
      showErrorToast("📡 Fant ingen posisjonsdata for de merkede ressursene.");
      return;
    }
    
    // Åpne nytt vindu med kart
    const width = Math.floor(window.innerWidth / 2);
    const height = Math.floor(window.innerHeight * 0.9);
    const mapWindow = window.open(
      '', 
      'LiveMap', 
      `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
    );
    
    if (!mapWindow) {
      showErrorToast("📡 Popup blokkert – tillat popup og prøv igjen.");
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
        <title>Live Ressurskart</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            height: 100%;
          }
          body {
            font-family: Arial, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          #header {
            background: linear-gradient(to right, #025671, #169bbd);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            flex-shrink: 0;
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
            background: #CFECF5;
            color: #047CA1;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          #refreshBtn:hover {
            background: #81C5DA;
            transform: translateY(-1px);
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
            min-width: 280px;
            max-width: 600px;
          }
          
          .popup-header {
            background: linear-gradient(to right, #025671, #169bbd);
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
            gap: 6px;
          }

          .popup-row:last-child {
            margin-bottom: 0;
          }

          .popup-label {
            font-weight: 600;
            color: #666;
            min-width: 70px;
          }
          
          .popup-value {
            color: #333;
          }
          
          .popup-link {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            background: #047CA1 !important;
            color: #F5F5F5 !important;
            text-decoration: none !important;
            border-radius: 4px;
            font-size: 13px;
            transition: background 0.2s;
            font-weight: 600;
          }
          
          .popup-link:hover {
            background: #035f7d !important;
          }

          .leaflet-routing-container {
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>📡 Live Ressurskart</h1>
          <div id="controls">
            <button id="planStopsBtn" style="padding:8px 16px;background:#CFECF5;color:#047CA1;border:none;border-radius:4px;font-weight:600;cursor:default;opacity:0.5;transition:all 0.2s;" disabled>📍 Planlagte stopp</button>
            <div id="status">
              <span id="vehicleCount">0</span> biler |
              Sist oppdatert: <span id="lastUpdate">-</span>
            </div>
            <label style="font-size: 13px;">
              Oppdater hvert 
              <input type="number" id="updateInterval" value="${UPDATE_INTERVAL}" min="1" max="30" title="Angi en verdi mellom 1 og 30" style="width: 50px;"> 
              min
            </label>
            <button id="refreshBtn">🔄 Oppdater nå</button>
          </div>
        </div>
        <div id="map"></div>
      </body>
      </html>
    `);
    
    mapWindow.document.close();
    
    // Injiser JS-biblioteker dynamisk (unngår parser-blocking via document.write)
    await new Promise(resolve => {
      function loadScript(src, onload) {
        const s = mapWindow.document.createElement('script');
        s.src = src;
        s.onload = onload;
        mapWindow.document.head.appendChild(s);
      }
      // Last Leaflet, deretter MarkerCluster (rekkefølge er viktig)
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => {
        loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', () => {
          loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js', resolve);
        });
      });
    });
    
    // Injiser kartlogikk etter at L er tilgjengelig
    const initScript = mapWindow.document.createElement('script');
    initScript.textContent = `
// Initialiser kart (senter på Norge/Trøndelag)
const map = L.map('map').setView([63.4305, 10.3951], 10);

// Legg til OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// Cluster-gruppe for markører (byttes ut ved hver oppdatering)
let markerCluster = null;
let markers = [];
let updateTimer = null;
let activePlanStopLayer = null;
let activePlanStopTurId = null;
let activeVehicleData = null;
let userToggledOff = false;
let activeRouteControl = null;

function updatePlanStopsBtn() {
  const btn = document.getElementById('planStopsBtn');
  if (!btn) return;
  const hasStops = activeVehicleData && activeVehicleData.plannedStops && activeVehicleData.plannedStops.length > 0;
  if (!hasStops) {
    btn.textContent = '📍 Planlagte stopp';
    btn.disabled = true;
    btn.style.cursor = 'default';
    btn.style.opacity = '0.5';
    btn.style.background = '#CFECF5';
    btn.style.color = '#047CA1';
    return;
  }
  btn.disabled = false;
  btn.style.cursor = 'pointer';
  btn.style.opacity = '1';
  if (activePlanStopLayer && activePlanStopTurId === activeVehicleData.turId) {
    btn.textContent = '📍 Skjul planlagte stopp';
    btn.style.background = '#81C5DA';
    btn.style.color = '#025671';
  } else {
    btn.textContent = '📍 Vis planlagte stopp (' + activeVehicleData.plannedStops.length + ')';
    btn.style.background = '#CFECF5';
    btn.style.color = '#047CA1';
  }
}

function removeActiveRoute() {
  if (!activeRouteControl) return;
  activeRouteControl.remove();
  activeRouteControl = null;
}

function pickRepresentative(group, now) {
  let representative = group[0];
  let bestDiff = null;
  group.forEach(stop => {
    if (!stop.time) return;
    const diff = new Date(stop.time).getTime() - now;
    if (bestDiff === null) { bestDiff = diff; representative = stop; return; }
    if (bestDiff < 0 && diff >= 0) { bestDiff = diff; representative = stop; return; }
    if (bestDiff >= 0 && diff < 0) return;
    if (Math.abs(diff) < Math.abs(bestDiff)) { bestDiff = diff; representative = stop; }
  });
  return representative;
}

function togglePlannedStops(stops, turId) {
  if (activePlanStopTurId === turId && activePlanStopLayer) {
    map.removeLayer(activePlanStopLayer);
    activePlanStopLayer = null;
    activePlanStopTurId = null;
    removeActiveRoute();
    userToggledOff = true;
    updatePlanStopsBtn();
    return;
  }
  if (activePlanStopLayer) {
    map.removeLayer(activePlanStopLayer);
    activePlanStopLayer = null;
    removeActiveRoute();
  }
  const layer = L.layerGroup();
  const now = Date.now();

  // Grupper stopp per koordinat, velg representant nærmest i tid
  const groups = {};
  stops.forEach(stop => {
    const key = stop.lat + ',' + stop.lon;
    if (!groups[key]) groups[key] = [];
    groups[key].push(stop);
  });

  const groupList = Object.values(groups).map(group => ({
    group,
    representative: pickRepresentative(group, now)
  }));

  groupList.forEach(({ group, representative }) => {
    const isPickup = representative.type === '1803';
    const symbol = isPickup ? '➕' : '➖';
    const color = isPickup ? '#2e7d32' : '#1565c0';
    const bgColor = isPickup ? '#e8f5e9' : '#e3f2fd';
    const icon = L.divIcon({
      className: 'custom-marker-wrapper',
      html: '<div style="background:' + bgColor + ';border:2px solid ' + color + ';border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,0.3);color:' + color + ';font-weight:bold;">' + symbol + '</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const sorted = group.slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const tooltipLines = sorted.map(s => {
      const t = s.time ? s.time.split('T')[1]?.substring(0, 5) : '–';
      return (s.type === '1803' ? '➕ Henting' : '➖ Levering') + ' ' + t;
    });
    const address = sorted[0].address || '';
    const tooltipHtml = tooltipLines.join('<br>') + (address ? '<br>' + address : '');

    const marker = L.marker([representative.lat, representative.lon], { icon });
    marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -10] });
    layer.addLayer(marker);
  });

  layer.addTo(map);
  activePlanStopLayer = layer;
  activePlanStopTurId = turId;
  userToggledOff = false;
  updatePlanStopsBtn();

  // Tegn rute fra bilens posisjon → planlagte stopp i kronologisk rekkefølge
  if (activeVehicleData && activeVehicleData.lat && activeVehicleData.lon && groupList.length > 0) {
    const vLat = parseFloat(activeVehicleData.lat);
    const vLon = parseFloat(activeVehicleData.lon);

    // Sorter grupper etter representantens tid, stigende
    const sortedGroups = groupList.slice().sort((a, b) =>
      (a.representative.time || '').localeCompare(b.representative.time || '')
    );

    const waypoints = [
      L.latLng(vLat, vLon),
      ...sortedGroups.map(({ representative: r }) => L.latLng(r.lat, r.lon))
    ];

    const fallbackPolyline = (dashed) => {
      const poly = L.polyline(waypoints.map(w => [w.lat, w.lng]), {
        color: '#047CA1', weight: 3, opacity: 0.65,
        dashArray: dashed ? '8, 6' : null
      }).addTo(map);
      activeRouteControl = { remove: () => map.removeLayer(poly) };
    };

    try {
      const ctrl = L.Routing.control({
        waypoints,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
          timeout: 10000
        }),
        lineOptions: { styles: [{ color: '#047CA1', weight: 4, opacity: 0.7 }] },
        createMarker: () => null,
        addWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: false,
        show: false
      }).addTo(map);

      ctrl.on('routingerror', () => {
        map.removeControl(ctrl);
        fallbackPolyline(true);
      });

      activeRouteControl = { remove: () => map.removeControl(ctrl) };
    } catch (e) {
      fallbackPolyline(true);
    }
  }
}

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
    case "3003": return { icon: "🏴", title: "Oppdrag bekreftet" };
    case "5021": return { icon: "📡", title: "Auto-posisjon" };
    default: return { icon: "❓", title: "Ukjent hendelse" };
  }
}

// Funksjon for å legge til markører
window.addVehicleMarkers = function(vehicles) {
  // Hent zoom-nivå fra parent window
  const singleMarkerZoom = window.opener.SINGLE_MARKER_ZOOM || 13;
  
  // Fjern gammel cluster-gruppe og planlagte stopp fra kart
  if (markerCluster) {
    map.removeLayer(markerCluster);
    markerCluster = null;
  }
  if (activePlanStopLayer) {
    map.removeLayer(activePlanStopLayer);
    activePlanStopLayer = null;
    activePlanStopTurId = null;
  }
  markers = [];
  
  if (vehicles.length === 0) {
    return;
  }
  
  // Oppdater status
  document.getElementById('vehicleCount').textContent = vehicles.length;
  const now = new Date();
  document.getElementById('lastUpdate').textContent = 
    now.getHours().toString().padStart(2, '0') + ':' + 
    now.getMinutes().toString().padStart(2, '0');
  
  // Opprett ny marker cluster group
  markerCluster = L.markerClusterGroup({
    maxClusterRadius: 20,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    spiderfyOnEveryZoom: true,
    animate: true
  });
  
  // Toggle spiderfy ved klikk på cluster
  markerCluster.on('clusterclick', function(e) {
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
    
    const marker = L.marker([lat, lon], { icon: customIcon });
    
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
    const adresseRow = (v.eventType !== '5021' && v.address)
      ? '<div class="popup-row">' +
          '<span class="popup-label">Adresse:</span>' +
          '<span class="popup-value" title="' + v.address + '" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom;">' + v.address + '</span>' +
        '</div>'
      : '';
    
    // Telefon med clipboard-kopiering og tooltip
    const phoneRow = v.phoneNumber
      ? '<div class="popup-row">' +
          '<span class="popup-label">Sjåfør:</span>' +
          '<span class="popup-value">' +
            '<span id="phoneSpan_' + v.turId + '" ' +
              'title="Klikk for å kopiere til utklippstavlen" ' +
              'style="cursor:pointer;" ' +
              'data-phone="' + v.phoneNumber + '">' +
              '📞 ' + v.phoneNumber +
            '</span>' +
            '<span id="phoneCopied_' + v.turId + '" ' +
              'style="display:none;margin-left:8px;color:#2e7d32;font-size:12px;">✔ Kopiert</span>' +
          '</span>' +
        '</div>'
      : '';
    
    // Turdata-tabell
    let turdataHtml = '';
    if (v.tripData && v.tripData.length > 0) {
      const now = new Date();
      const tableRows = v.tripData.map(t => {
        const isPast = t.hentetidRaw && new Date(t.hentetidRaw) < now;
        const rowStyle = isPast ? 'color:#bbb;' : 'color:#333;';
        return '<tr style="' + rowStyle + '">' +
          '<td style="padding:4px 6px;font-family:monospace;white-space:nowrap;">' + t.hentetid + '</td>' +
          '<td style="padding:4px 6px;font-family:monospace;white-space:nowrap;">' + t.oppmote + '</td>' +
          '<td style="padding:4px 6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + t.fra + ' → ' + t.til + '">' + t.fra + '</td>' +
          '<td style="padding:4px 6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + t.til + '">' + t.til + '</td>' +
          '</tr>';
      }).join('');
      
      turdataHtml =
        '<details class="turdata-details" style="margin-top:10px;border-top:1px solid #eee;padding-top:8px;">' +
          '<summary style="cursor:pointer;font-weight:600;color:#555;font-size:13px;user-select:none;">' +
            '<span class="turdata-arrow">▶</span> Planlagte bestillinger (' + v.tripData.length + ')' +
          '</summary>' +
          '<div style="overflow-x:auto;margin-top:8px;">' +
            '<table style="border-collapse:collapse;font-size:12px;width:100%;">' +
              '<thead>' +
                '<tr style="background:#f5f5f5;color:#666;font-weight:600;">' +
                  '<th style="padding:4px 6px;text-align:left;white-space:nowrap;">Hent</th>' +
                  '<th style="padding:4px 6px;text-align:left;white-space:nowrap;">Lever</th>' +
                  '<th style="padding:4px 6px;text-align:left;">Fra</th>' +
                  '<th style="padding:4px 6px;text-align:left;">Til</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + tableRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</details>';
    }
    
    const avtaleRow = v.avtaleNavn
      ? '<div class="popup-row">' +
          '<span class="popup-label">Avtale:</span>' +
          '<span class="popup-value" title="' + v.avtaleNavn + '" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom;">' + v.avtaleNavn + '</span>' +
        '</div>'
      : '';

    const popupContent =
      '<div class="popup-header">' +
        '<a href="' + v.nissyUrl + '" target="_blank" ' +
           'title="Tur ' + v.turId + ' – Åpne i NISSY Admin" ' +
           'style="color:white;text-decoration:none;cursor:pointer;">🚕 ' + v.licensePlate + '</a>' +
      '</div>' +
      '<div class="popup-body">' +
        avtaleRow +
        '<div class="popup-row">' +
          '<span class="popup-label">Hendelse:</span>' +
          '<span class="popup-value">' + eventInfo.icon + ' ' + eventInfo.title +
            (v.timestamp ? ' <span style="color:#888;font-size:12px;">(' + formatTimestamp(v.timestamp) + ')</span>' : '') +
          '</span>' +
        '</div>' +
        (v.dispatchCoord ? (
          '<div class="popup-row">' +
            '<span class="popup-label">Hendelse:</span>' +
            '<span class="popup-value">🏴 Oppdrag bekreftet (3003)' +
              (v.time3003 ? (' <span style="color:#888;font-size:12px;">(' + (v.time3003.split(' ')[1]?.substring(0,5) || v.time3003) + ')</span>') : '') +
            '</span>' +
          '</div>' +
          '<div class="popup-row">' +
            '<span class="popup-label">Adresse:</span>' +
            '<span class="popup-value" style="font-family:monospace;font-size:12px;">' + v.dispatchCoord.lat.toFixed(6) + ', ' + v.dispatchCoord.lon.toFixed(6) + '</span>' +
          '</div>'
        ) : '') +
        adresseRow +
        phoneRow +
        turdataHtml +
      '</div>';
    
    marker.bindPopup(popupContent, { offset: [0, -10] });
    
    // Håndter interaksjon via popupopen (unngår script-tag i HTML-streng)
    marker.on('popupopen', function() {
      const popupEl = marker.getPopup().getElement();
      if (!popupEl) return;
      
      // Pil-toggle for turdata
      const details = popupEl.querySelector('.turdata-details');
      if (details) {
        details.addEventListener('toggle', function() {
          const arrow = details.querySelector('.turdata-arrow');
          if (arrow) arrow.textContent = details.open ? '▼' : '▶';
          // Vent til DOM er oppdatert med ny høyde, så forskyv kart (uten re-rendering av innhold)
          setTimeout(function() {
            const popup = marker.getPopup();
            if (popup && popup._adjustPan) popup._adjustPan();
          }, 0);
        });
      }
      
      // Mobilnummer – kopier til utklippstavle ved klikk
      const phoneSpan = popupEl.querySelector('#phoneSpan_' + v.turId);
      const phoneCopied = popupEl.querySelector('#phoneCopied_' + v.turId);
      if (phoneSpan && phoneCopied) {
        phoneSpan.addEventListener('click', function() {
          const num = phoneSpan.getAttribute('data-phone');
          navigator.clipboard.writeText(num).then(() => {
            phoneCopied.style.display = 'inline';
            setTimeout(() => {
              phoneCopied.style.display = 'none';
            }, 2500);
          }).catch(() => {
            phoneSpan.title = 'Kopiering feilet – prøv manuelt';
          });
        });
      }

      // Sett aktiv kjøretøy for header-knapp
      if (activePlanStopTurId !== v.turId) userToggledOff = false; // Nullstill ved bilbytte
      activeVehicleData = v;
      updatePlanStopsBtn();
      // Auto-vis: vis alltid med mindre stopp allerede vises for denne bilen eller brukeren skjulte dem
      const alreadyShowingThisVehicle = activePlanStopLayer && activePlanStopTurId === v.turId;
      if (!alreadyShowingThisVehicle && !userToggledOff && v.plannedStops && v.plannedStops.length > 0) {
        togglePlannedStops(v.plannedStops, v.turId);
        if (markers.length === 1) {
          const allCoords = [[parseFloat(v.lat), parseFloat(v.lon)], ...v.plannedStops.map(s => [s.lat, s.lon])];
          map.fitBounds(allCoords, { padding: [60, 60], animate: true });
        }
      }
    });
    markerCluster.addLayer(marker);
    markers.push(marker);
    bounds.push([lat, lon]);
  });
  
  // Sett kartvisning FØR markørene legges til – unngår innflyvningsanimasjon
  if (bounds.length > 0) {
    if (bounds.length === 1) {
      map.setView(bounds[0], singleMarkerZoom, { animate: false });
    } else {
      map.fitBounds(bounds, { padding: [50, 50], animate: false });
    }
  }
  
  // Legg cluster til kart (kartet er allerede på riktig posisjon)
  map.addLayer(markerCluster);
  
  // Åpne popup automatisk ved én ressurs
  if (bounds.length === 1) {
    markers[0].openPopup();
  }
};

// Manuel refresh-knapp
document.getElementById('refreshBtn').addEventListener('click', () => {
  window.opener.updateMapData(false);
});

// Planlagte stopp-knapp (header)
document.getElementById('planStopsBtn').addEventListener('click', () => {
  if (activeVehicleData && activeVehicleData.plannedStops && activeVehicleData.plannedStops.length > 0) {
    togglePlannedStops(activeVehicleData.plannedStops, activeVehicleData.turId);
  }
});

// Auto-refresh
function startAutoUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  
  const rawVal = parseInt(document.getElementById('updateInterval').value) || 1;
  const clampedVal = Math.max(1, Math.min(30, rawVal));
  document.getElementById('updateInterval').value = clampedVal;
  const interval = clampedVal * 60000;
  updateTimer = setInterval(() => {
    window.opener.updateMapData(true); // stille ved auto-refresh
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
    `;
    mapWindow.document.head.appendChild(initScript);
    
    // Vent til addVehicleMarkers er registrert av initScript
    await new Promise(resolve => {
      const checkReady = () => {
        if (mapWindow.addVehicleMarkers) {
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
    
    // Send allerede hentede data til kartet direkte
    mapWindow.addVehicleMarkers(vehicles);
  }

  // Felles funksjon for å hente posisjonsdata for alle ressurser (uten toasts)
  async function fetchAllVehicleData(rows) {
    const vehicles = [];
    
    for (const row of rows) {
      const licensePlate = row.cells[1]?.textContent.trim();
      if (!licensePlate) continue;
      
      // Ressurser med navn som slutter på 8+ siffer etter siste "-" har ikke mottatt 3003 enda
      if (/-\d{8,}$/.test(licensePlate)) {
        console.log(`⏭️ Hopper over ${licensePlate} – ikke registrert (mangler 3003)`);
        continue;
      }
      
      const img = row.querySelector('img[onclick*="searchStatus?id="]');
      if (!img) continue;
      
      const turId = img.getAttribute("onclick")?.match(/searchStatus\?id=(\d+)/)?.[1];
      if (!turId) continue;
      
      try {
        const positionData = await fetchLatestPosition(licensePlate, turId);
        if (positionData) {
          vehicles.push({
            licensePlate,
            turId,
            lat: positionData.lat,
            lon: positionData.lon,
            timestamp: positionData.timestamp,
            eventType: positionData.eventType,
            address: positionData.address || null,
            phoneNumber: positionData.phoneNumber || null,
            tripData: positionData.tripData || [],
            plannedStops: positionData.plannedStops || [],
            avtaleNavn: positionData.avtaleNavn || null,
            nissyUrl: "/administrasjon/admin/searchStatus?id=" + turId
          });
        }
      } catch (e) {
        console.error("Feil ved henting av posisjon for " + licensePlate + ":", e);
      }
    }
    
    console.log("✓ Hentet posisjon for " + vehicles.length + " biler");
    return vehicles;
  }

  // Funksjon for å hente og oppdatere kartdata (brukes ved auto-refresh og manuell oppdatering)
  window.updateMapData = async function(silent = false) {
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
    
    if (!silent) {
      const resourceCount = (window.currentResources || []).filter(r => {
        const lp = r.cells[1]?.textContent.trim();
        return lp && !/-\d{8,}$/.test(lp);
      }).length;
      showLoadingToast(`📡 Henter posisjonsdata for ${resourceCount} ressurs${resourceCount !== 1 ? 'er' : ''}…`);
    }
    
    try {
      const vehicles = await fetchAllVehicleData(window.currentResources);
      if (window.currentMapWindow && !window.currentMapWindow.closed) {
        window.currentMapWindow.addVehicleMarkers(vehicles);
      }
    } finally {
      if (!silent) hideLoadingToast();
      window.isUpdating = false;
    }
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
      
      // Finn alle 4010-URLer (nyeste sist), samt 3003, 2000 og 5021
      const rows = detailHtml.split('<tr');
      const all4010Urls = [];
      let latest3003Url = null;
      let latest2000Url = null;
      let latest5021Url = null;
      let time3003 = null;
      
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
            all4010Urls.push(xmlLinkMatch[1]); // Samle alle, nyeste havner sist
          }
        } else if (sutiCode === '3003') {
          const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
          if (xmlLinkMatch && !latest3003Url) {
            latest3003Url = xmlLinkMatch[1]; // Første/nyeste 3003
            // Hent tidspunkt fra 2. <td> (samme metode som Ressursinfo)
            if (!time3003 && tdMatches && tdMatches.length >= 2) {
              const timeCell = tdMatches[1];
              const timeMatch = timeCell.match(/<nobr>(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})<\/nobr>/);
              if (timeMatch) time3003 = timeMatch[1];
            }
          }
        } else if (sutiCode === '2000') {
          const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
          if (xmlLinkMatch) {
            latest2000Url = xmlLinkMatch[1]; // Siste/nyeste 2000
          }
        } else if (sutiCode === '5021') {
          const xmlLinkMatch = row.match(/href="([^"]*sutiXml\?id=\d+)"/);
          if (xmlLinkMatch) {
            latest5021Url = xmlLinkMatch[1]; // Alltid overskriv – siste/nyeste 5021
          }
        }
      }

      if (all4010Urls.length === 0 && !latest3003Url && !latest5021Url) return null;
      
      // Hent 3003 og 2000 parallelt (uavhengig av hvilken 4010 vi ender opp med)
      const [resp3003, resp2000, resp5021] = await Promise.all([
        latest3003Url ? fetch(latest3003Url) : Promise.resolve(null),
        latest2000Url ? fetch(latest2000Url) : Promise.resolve(null),
        latest5021Url ? fetch(latest5021Url) : Promise.resolve(null)
      ]);
      
      const unescape = raw => {
        const ta = document.createElement("textarea");
        ta.innerHTML = raw;
        return ta.value.trim();
      };
      
      const parser = new DOMParser();
      
      // ── Parse 4010 XML – prøv fra nyeste til eldste til vi finner koordinater ──
      let eventType = null, timestamp = null, lat = null, lon = null;
      let bookingId4010 = null, nodeType4010 = null;
      
      for (let i = all4010Urls.length - 1; i >= 0; i--) {
        const xmlText = await fetch(all4010Urls[i]).then(r => r.text());
        const preMatch = xmlText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        if (!preMatch) continue;
        
        const xmlDoc4010 = parser.parseFromString(unescape(preMatch[1]), "text/xml");
        if (xmlDoc4010.querySelector('parsererror')) continue;
        
        const idVeh = xmlDoc4010.querySelector("referencesTo > idVehicle");
        if (!idVeh || idVeh.getAttribute("id") !== licensePlate) {
          console.log(`⏭️ 4010 #${i + 1} mangler idVehicle (SUTI override) – prøver eldre`);
          continue;
        }
        
        const pickup = xmlDoc4010.querySelector("pickupConfirmation");
        if (!pickup) continue;
        
        const node4010 = pickup.querySelector("nodeConfirmed");
        if (!node4010) continue;
        
        const geo = node4010.querySelector("addressNode > geographicLocation");
        const candidateLat = geo?.getAttribute("lat");
        const candidateLon = geo?.getAttribute("long");
        
        if (!candidateLat || !candidateLon) {
          console.log(`⏭️ 4010 #${i + 1} mangler koordinater (SUTI override) – prøver eldre`);
          continue;
        }
        
        // Funnet et 4010 med koordinater
        eventType = pickup.getAttribute("eventType");
        timestamp = node4010.querySelector("timesNode > time")?.getAttribute("time") || null;
        lat = candidateLat;
        lon = candidateLon;
        const idOrderNode4010 = node4010.querySelector("subOrderContent > idOrder");
        bookingId4010 = idOrderNode4010?.getAttribute("id") || null;
        nodeType4010 = node4010.getAttribute("nodeType") || null;
        break;
      }
      
      // Ingen 4010 hadde koordinater – kan fortsatt ha 3003-koordinat
      
      // address settes etter at bookingMap er bygget fra 2000
      let address = null;
      
      // ── Parse 3003 XML (mobilnummer + posisjon ved oppdragsbekreftelse) ──
      let phoneNumber = null;
      let dispatchCoord = null;
      if (resp3003) {
        try {
          const buf3003 = await resp3003.arrayBuffer();
          const decoded3003 = new TextDecoder('iso-8859-1').decode(buf3003);
          const pre3003 = decoded3003.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
          if (pre3003) {
            const xmlDoc3003 = parser.parseFromString(unescape(pre3003[1]), "text/xml");
            // ITF/Cencom-format
            const driverPhone = xmlDoc3003.querySelector(
              'resourceDispatch > driver > contactInfoDriver > contactInfo[contactType="phone"]'
            );
            if (driverPhone) {
              phoneNumber = driverPhone.getAttribute("contactInfo")?.trim() || null;
            }
            // Frogne-format (fallback)
            if (!phoneNumber) {
              for (const veh of xmlDoc3003.querySelectorAll('resourceDispatch > vehicle')) {
                const idVeh3003 = veh.querySelector('idVehicle');
                if (idVeh3003?.getAttribute('id') === licensePlate) {
                  const ph = veh.querySelector('contactInfoVehicle > contactInfo[contactType="phone"]');
                  if (ph) phoneNumber = ph.getAttribute("contactInfo")?.trim() || null;
                  break;
                }
              }
            }
            // Hent kjøretøyposisjon ved oppdragsbekreftelse
            const startLoc = xmlDoc3003.querySelector('vehiclestartLocation');
            if (startLoc) {
              const slat = startLoc.getAttribute('lat');
              const slon = startLoc.getAttribute('long');
              if (slat && slon) dispatchCoord = { lat: parseFloat(slat), lon: parseFloat(slon) };
            }
          }
        } catch (e) {
          console.warn("Feil ved parsing av 3003:", e);
        }
      }
      
      // ── Parse 5021 XML (intervallposisjon) ──
      let lat5021 = null, lon5021 = null, timestamp5021 = null;
      if (resp5021) {
        try {
          const xmlText5021 = await resp5021.text();
          const pre5021 = xmlText5021.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
          if (pre5021) {
            const xmlDoc5021 = parser.parseFromString(unescape(pre5021[1]), "text/xml");
            if (!xmlDoc5021.querySelector('parsererror')) {
              const geo5021 = xmlDoc5021.querySelector('order > route > node > addressNode > geographicLocation');
              if (geo5021) {
                lat5021 = geo5021.getAttribute('lat');
                lon5021 = geo5021.getAttribute('long');
              }
              const time5021Node = xmlDoc5021.querySelector('order > route > node > timesNode > time');
              if (time5021Node) timestamp5021 = time5021Node.getAttribute('time');
            }
          }
        } catch (e) {
          console.warn("Feil ved parsing av 5021:", e);
        }
      }

      // ── Velg nyeste hendelse mellom 4010, 3003 og 5021 ──
      // Konverter time3003 "DD/MM/YYYY HH:MM:SS" til ISO for sammenligning
      let time3003Iso = null;
      if (time3003) {
        try {
          const [dp, tp] = time3003.split(' ');
          const [d, m, y] = dp.split('/');
          time3003Iso = `${y}-${m}-${d}T${tp}`;
        } catch (e) {}
      }

      const has4010 = !!(lat && lon);
      const has3003 = !!(dispatchCoord);
      const has5021 = !!(lat5021 && lon5021);

      if (!has4010 && !has3003 && !has5021) return null;

      // Finn nyeste kilde via ISO-sammenligning
      let activeTime = has4010 ? (timestamp || '') : '';
      let activeSource = has4010 ? '4010' : null;

      if (has3003 && time3003Iso && (!activeTime || time3003Iso > activeTime)) {
        activeSource = '3003';
        activeTime = time3003Iso;
      }
      if (has5021 && timestamp5021 && (!activeTime || timestamp5021 > activeTime)) {
        activeSource = '5021';
        activeTime = timestamp5021;
      }

      if (activeSource === '3003') {
        lat = String(dispatchCoord.lat);
        lon = String(dispatchCoord.lon);
        timestamp = time3003Iso;
        eventType = '3003';
      } else if (activeSource === '5021') {
        lat = lat5021;
        lon = lon5021;
        timestamp = timestamp5021;
        eventType = '5021';
        address = null; // Vis koordinater i popup, ikke adresse fra 2000
      }

      // ── Parse 2000 XML (planlagte turer + avtalenavn) ──
      let tripData = [];
      let avtaleNavn = null;
      let plannedStops = [];
      if (resp2000) {
        try {
          const buf2000 = await resp2000.arrayBuffer();
          const decoded2000 = new TextDecoder('iso-8859-1').decode(buf2000);
          const pre2000 = decoded2000.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
          if (pre2000) {
            const xmlStr2000 = unescape(pre2000[1])
              .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
            let xmlDoc2000 = parser.parseFromString(xmlStr2000, "text/xml");

            if (xmlDoc2000.querySelector('parsererror')) {
              console.warn("2000 XML-parserfeil – prøver HTML-parser");
              const htmlDoc2000 = parser.parseFromString(xmlStr2000, "text/html");
              if (htmlDoc2000.querySelector('SUTI')) {
                xmlDoc2000 = htmlDoc2000;
              }
            }

            if (!xmlDoc2000.querySelector('parsererror')) {
              // Hent avtalenavn fra orgReceiver
              const orgReceiver = xmlDoc2000.querySelector('orgReceiver');
              if (orgReceiver) avtaleNavn = orgReceiver.getAttribute('name') || null;

              const bookingMap = new Map();

              const formatAddr = addrNode => {
                if (!addrNode) return 'Ukjent';
                const an = addrNode.getAttribute('addressName') || '';
                const st = addrNode.getAttribute('street') || '';
                const sn = addrNode.getAttribute('streetNo') || '';
                const sl = addrNode.getAttribute('streetNoLetter') || '';
                const pn = addrNode.getAttribute('postalNo') || '';
                const lo = addrNode.getAttribute('location') || '';
                const streetPart = an || [st, sn, sl].filter(Boolean).join(' ');
                return [streetPart, [pn, lo].filter(Boolean).join(' ')].filter(Boolean).join(', ');
              };
              
              for (const n of xmlDoc2000.querySelectorAll('route > node')) {
                const nodeType = n.getAttribute('nodeType');
                if (nodeType !== '1803' && nodeType !== '1804') continue;
                
                const contentNode = n.querySelector('contents > content[contentType="1001"]');
                if (!contentNode) continue;
                const idOrderNode = contentNode.querySelector('idOrder');
                if (!idOrderNode) continue;
                const bookingId = idOrderNode.getAttribute('id');
                if (!bookingId) continue;
                
                const timeStr = n.querySelector('timesNode > time')?.getAttribute('time') || null;
                const address2000 = formatAddr(n.querySelector('addressNode'));

                // Samle planlagte stopp med koordinater (dedupliisert per node)
                const geo2000 = n.querySelector('addressNode > geographicLocation');
                if (geo2000?.getAttribute('typeOfCoordinate') === 'UTM') {
                  const utmE = parseFloat(geo2000.getAttribute('long'));
                  const utmN = parseFloat(geo2000.getAttribute('lat'));
                  const utmZone = parseInt(geo2000.getAttribute('zone')) || 33;
                  if (!isNaN(utmE) && !isNaN(utmN) && !plannedStops.some(s => s.utmE === utmE && s.utmN === utmN)) {
                    const wgs = utmToLatLon(utmE, utmN, utmZone);
                    plannedStops.push({ type: nodeType, lat: wgs.lat, lon: wgs.lon, address: address2000, time: timeStr });
                  }
                }

                if (!bookingMap.has(bookingId)) bookingMap.set(bookingId, { hent: null, lever: null });
                const entry = bookingMap.get(bookingId);
                
                if (nodeType === '1803') {
                  entry.hent = { time: timeStr, address: address2000 };
                } else {
                  entry.lever = { time: timeStr, address: address2000 };
                }
              }
              
              for (const [, entry] of bookingMap) {
                if (!entry.hent) continue;
                tripData.push({
                  hentetidRaw: entry.hent.time,
                  hentetid: entry.hent.time ? entry.hent.time.split('T')[1]?.substring(0, 5) : '–',
                  oppmote: entry.lever?.time ? entry.lever.time.split('T')[1]?.substring(0, 5) : '–',
                  fra: entry.hent.address,
                  til: entry.lever?.address || '–'
                });
              }
              
              // Slå opp adressen for siste hendelse via bookingId + nodeType fra 4010
              if (activeSource !== '5021' && bookingId4010 && bookingMap.has(bookingId4010)) {
                const entry4010 = bookingMap.get(bookingId4010);
                if (nodeType4010 === '1803') {
                  address = entry4010.hent?.address || null;
                } else if (nodeType4010 === '1804') {
                  address = entry4010.lever?.address || null;
                }
              }
              
              tripData.sort((a, b) => {
                if (!a.hentetidRaw) return 1;
                if (!b.hentetidRaw) return -1;
                return a.hentetidRaw.localeCompare(b.hentetidRaw);
              });
            }
          }
        } catch (e) {
          console.warn("Feil ved parsing av 2000:", e);
        }
      }
      
      return {
        lat,
        lon,
        timestamp,
        eventType,
        address,
        plannedStops,
        phoneNumber,
        tripData,
        avtaleNavn,
        dispatchCoord,
        time3003
      };
      
    } catch (e) {
      console.error("Feil ved parsing av 4010 XML:", e);
      return null;
    }
  }

  console.log("⌨️  Live Ressurskart snarvei: ALT+Z");
  console.log("✅ Live Ressurskart-script lastet");
   
})();