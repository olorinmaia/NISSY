// ============================================================
// KARTVISNING SCRIPT
// Erstatter NISSY sin "Vis i kart" (Alt+W / buttonShowMap)
// Henter reqId fra merkede rader (vopp + popp) og viser
// hente/leveringskoordinater i Leaflet/OpenStreetMap-kart
// ============================================================

(function () {
  if (window.__kartvisningInstalled) {
    console.log('✅ Kartvisning-script er allerede aktiv');
    return;
  }
  window.__kartvisningInstalled = true;
  console.log('🗺️ Starter Kartvisning-script');

  const SELECTED_BG = 'rgb(148, 169, 220)';

  // ── Hent merkede reqIds ───────────────────────────────────

  function getVoppReqIds() {
    return Array.from(document.querySelectorAll('#ventendeoppdrag tbody tr'))
      .filter(r => r.id?.startsWith('V-') && r.style.backgroundColor === SELECTED_BG)
      .map(r => r.id.replace('V-', ''));
  }

  function getPoppReqIds() {
    const reqIds = [];
    Array.from(document.querySelectorAll('#pagaendeoppdrag tbody tr'))
      .filter(r => r.id?.startsWith('P-') && r.style.backgroundColor === SELECTED_BG)
      .forEach(tr => {
        // Én popp-rad kan inneholde flere bestillinger – hent alle reqIds via toggleManualStatusRequisition
        const imgs = tr.querySelectorAll("img[onclick*='toggleManualStatusRequisition']");
        imgs.forEach(img => {
          const m = img.getAttribute('onclick').match(/toggleManualStatusRequisition\(this,(\d+)\)/);
          if (m && !reqIds.includes(m[1])) reqIds.push(m[1]);
        });
      });
    return reqIds;
  }

  // ── Toast-hjelpere ────────────────────────────────────────
  let _loadingToast = null;

  function _toast(msg, bg, durationMs) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)', background: bg, color: '#fff',
      padding: '10px 20px', borderRadius: '5px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      fontFamily: 'Arial,sans-serif', fontSize: '14px',
      zIndex: '999999', opacity: '0', transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '1'; }, 10);
    if (durationMs) {
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.parentNode?.removeChild(t), 300);
      }, durationMs);
    }
    return t;
  }

  function showLoading(msg) {
    hideLoading();
    _loadingToast = _toast(msg, '#047CA1', 0);
  }

  function hideLoading() {
    if (!_loadingToast) return;
    const t = _loadingToast;
    _loadingToast = null;
    t.style.opacity = '0';
    setTimeout(() => t.parentNode?.removeChild(t), 300);
  }

  function showError(msg) { _toast(msg, '#d9534f', 4000); }

  // ── UTM33N → WGS84 ───────────────────────────────────────
  function utmToLatLon(easting, northing) {
    const zone = 33;
    const k0 = 0.9996, a = 6378137, e2 = 0.00669437999014;
    const x = easting - 500000, y = northing;
    const e12 = e2 / (1 - e2);
    const M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p1 = mu + e1 * (3 / 2 - 27 * e1 * e1 / 32) * Math.sin(2 * mu)
      + e1 * e1 * (21 / 16 - 55 * e1 * e1 / 32) * Math.sin(4 * mu)
      + e1 * e1 * e1 * (151 / 96) * Math.sin(6 * mu);
    const sp1 = Math.sin(p1), cp1 = Math.cos(p1), tp1 = Math.tan(p1);
    const N1 = a / Math.sqrt(1 - e2 * sp1 * sp1);
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sp1 * sp1, 1.5);
    const T1 = tp1 * tp1, C1 = e12 * cp1 * cp1;
    const D = x / (N1 * k0);
    const lat = p1 - N1 * tp1 / R1 * (D * D / 2 - D * D * D * D * (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e12) / 24);
    const lon0 = (zone * 6 - 183) * Math.PI / 180;
    const lon = lon0 + (D - D * D * D * (1 + 2 * T1 + C1) / 6) / cp1;
    return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
  }

  // ── Parser for ajax_reqdetails HTML ──────────────────────
  function parseReqDetails(html, reqId) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = {
      reqId,
      reqNr: '', status: '', pasientNavn: '',
      oppmote: '', pasientKlar: '',
      hentested: null, leveringssted: null
    };

    doc.querySelectorAll('fieldset').forEach(fs => {
      const legend = fs.querySelector('legend.fieldname');
      if (!legend) return;
      const title = legend.textContent.trim();

      const rows = {};
      fs.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 2) {
          const key = cells[0].textContent.replace(':', '').trim();
          rows[key] = cells[1].textContent.replace(/\s+/g, ' ').trim();
        }
      });

      if (title === 'Hentested' || title === 'Leveringssted') {
        const m = (rows['Geo-koordinater'] || '').match(/(\d{6,7})\s*\/\s*(\d{6,7})/);
        if (m) {
          const northing = parseInt(m[1]), easting = parseInt(m[2]);
          const ll = utmToLatLon(easting, northing);
          const loc = {
            lat: ll.lat, lon: ll.lon,
            adresse: [rows['Adresse'], rows['Postnr / Sted']].filter(Boolean).join(', '),
            navn: rows['Navn'] || '',
          };
          if (title === 'Hentested') result.hentested = loc;
          else result.leveringssted = loc;
        }
      } else if (title === 'Rekvisisjon') {
        result.reqNr  = rows['Rekvisisjon'] || '';
        result.status = rows['Rekvisisjonsstatus'] || '';
      } else if (title === 'Pasient') {
        result.pasientNavn = rows['Navn'] || '';
      } else if (title === 'Reise') {
        result.oppmote    = rows['Oppmøtetidspunkt'] || '';
        result.pasientKlar = rows['Pasient klar fra'] || '';
      }
    });

    return result;
  }

  async function fetchReqDetails(reqId) {
    const url = `/administrasjon/admin/ajax_reqdetails?id=${reqId}&db=1&tripid=&showSutiXml=false&hideEvents=true&full=true&highlightTripNr=`;
    try {
      const resp = await fetch(url);
      const html = await resp.text();
      return parseReqDetails(html, reqId);
    } catch (e) {
      console.error(`[Kartvisning] Feil ved henting av req ${reqId}:`, e);
      return { reqId, hentested: null, leveringssted: null };
    }
  }

  // ── Kart-vindu HTML (data sendes via window.opener) ───────
  function buildMapHtml() {
    return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>Kartvisning</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { height:100%; }
    body { font-family:Arial,sans-serif; display:flex; flex-direction:column; overflow:hidden; }
    #header {
      background: linear-gradient(to right, #025671, #169bbd);
      color:#fff; padding:10px 20px;
      display:flex; justify-content:space-between; align-items:center;
      flex-shrink:0; box-shadow:0 2px 4px rgba(0,0,0,0.2);
    }
    #header h1 { font-size:17px; font-weight:600; }
    #controls { display:flex; gap:10px; align-items:center; }
    #routeToggleBtn, #labelToggleBtn {
      padding:6px 14px; background:#CFECF5; color:#025671;
      border:none; border-radius:4px; font-weight:600; cursor:pointer;
      transition:all 0.2s; font-size:13px;
    }
    #routeToggleBtn.av, #labelToggleBtn.av { background:rgba(255,255,255,0.2); color:#fff; opacity:0.7; }
    .icon-label { display:flex; flex-direction:column; align-items:center; margin-top:1px;
      text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff; }
    .icon-label-time { display:flex; gap:3px; font-size:10px; font-weight:700; white-space:nowrap; line-height:1.2; }
    .icon-label-addr { font-size:10px; font-weight:600; color:#333; max-width:180px;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.2; }
    .labels-hidden .icon-label { display:none !important; }
    #status { font-size:13px; padding:5px 12px; background:rgba(255,255,255,0.2); border-radius:4px; }
    #map { width:100%; height:calc(100vh - 48px); }
    .custom-marker-wrapper { background:transparent; border:none; }
    .leaflet-routing-container { display:none; }
    .leaflet-popup-content-wrapper { border-radius:8px; padding:0; overflow:hidden; }
    .leaflet-popup-content { margin:0; min-width:240px; max-width:320px; }
    .popup-header {
      background:linear-gradient(to right,#025671,#169bbd);
      color:#fff; padding:9px 13px; font-weight:600; font-size:13px;
    }
    .popup-body { padding:10px 13px; font-size:12.5px; }
    .popup-section { margin-bottom:8px; }
    .popup-section-title { font-weight:700; color:#444; margin-bottom:4px; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }
    .popup-stop { padding:3px 0; border-bottom:1px solid #f0f0f0; }
    .popup-stop:last-child { border-bottom:none; }
    .popup-stop-name { font-weight:600; color:#222; }
    .popup-stop-tid { color:#666; font-size:12px; }
    .legend {
      position:absolute; bottom:24px; right:12px; z-index:1000;
      background:rgba(255,255,255,0.95); border-radius:6px;
      padding:7px 11px; font-size:12px; box-shadow:0 1px 4px rgba(0,0,0,0.2);
      line-height:2;
    }
    .icon-split {
      position:relative; border-radius:50%; width:28px; height:28px;
      overflow:hidden; border:2px solid #555; box-shadow:0 1px 4px rgba(0,0,0,.3);
    }
    .icon-split-l {
      position:absolute; top:0; left:0; width:50%; height:100%;
      background:#e8f5e9; display:flex; align-items:center;
      justify-content:center; font-size:12px; font-weight:900; color:#2e7d32;
    }
    .icon-split-r {
      position:absolute; top:0; right:0; width:50%; height:100%;
      background:#e3f2fd; display:flex; align-items:center;
      justify-content:center; font-size:12px; font-weight:900; color:#1565c0;
    }
  </style>
</head>
<body>
  <div id="header">
    <h1>🗺️ Kartvisning – bestillinger</h1>
    <div id="controls">
      <button id="labelToggleBtn" title="Vis/skjul tid og adresse på ikoner">🏷 Info på ikon</button>
      <button id="routeToggleBtn" title="Beregnet kjørerute via OSRM">📐 Beregnet rute</button>
      <div id="routeInfo" style="display:none;font-size:13px;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:4px;"></div>
      <div id="status">Laster kart…</div>
    </div>
  </div>
  <div id="map"></div>
  <script>
    window.addEventListener('load', function () {
      const reqDetails = window.opener && window.opener._kartvisningData;
      if (!reqDetails || !reqDetails.length) {
        document.getElementById('status').textContent = 'Ingen data';
        return;
      }

      // Last Leaflet, deretter Routing Machine
      function loadScript(src, cb) {
        const s = document.createElement('script');
        s.src = src; s.crossOrigin = ''; s.onload = cb;
        document.head.appendChild(s);
      }
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function () {
        loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js', function () {
          initMap(reqDetails);
        });
      });
    });

    function initMap(reqDetails) {
      const map = L.map('map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      // Forklaring
      const legend = document.createElement('div');
      legend.className = 'legend';
      legend.innerHTML =
        '<div><span style="font-size:14px">➕</span> Hentested</div>' +
        '<div><span style="font-size:14px">➖</span> Leveringssted</div>' +
        '<div><span class="icon-split" style="display:inline-flex;vertical-align:middle;width:18px;height:18px;font-size:9px;border-width:1.5px;">' +
        '<span class="icon-split-l">+</span><span class="icon-split-r">−</span></span> Begge</div>';
      document.getElementById('map').appendChild(legend);

      // ── Grupper stopp per koordinat ─────────────────────────
      function coordKey(lat, lon) { return lat.toFixed(5) + ',' + lon.toFixed(5); }

      const groups = {}; // key → { pickups: [], deliveries: [], lat, lon }

      reqDetails.forEach(function (req) {
        function addToGroup(stop, isPickup) {
          const k = coordKey(stop.lat, stop.lon);
          if (!groups[k]) groups[k] = { lat: stop.lat, lon: stop.lon, pickups: [], deliveries: [] };
          (isPickup ? groups[k].pickups : groups[k].deliveries).push({ req, stop });
        }
        if (req.hentested)    addToGroup(req.hentested, true);
        if (req.leveringssted) addToGroup(req.leveringssted, false);
      });

      // ── Ikon ────────────────────────────────────────────────
      function trunc(str, n) { return str && str.length > n ? str.slice(0, n - 1) + '…' : str || ''; }

      function makeIcon(hasPick, hasDel, pickTime, delTime, locName) {
        const timePart = (pickTime || delTime)
          ? '<div class="icon-label-time">' +
            (hasPick && hasDel
              ? (pickTime ? '<span style="color:#2e7d32">' + pickTime + '</span>' : '') +
                (pickTime && delTime ? '<span style="color:#999">·</span>' : '') +
                (delTime  ? '<span style="color:#1565c0">' + delTime  + '</span>' : '')
              : '<span style="color:' + (hasPick ? '#2e7d32' : '#1565c0') + '">' +
                (hasPick ? pickTime : delTime) + '</span>') +
            '</div>'
          : '';
        const addrPart = locName
          ? '<div class="icon-label-addr">' + trunc(locName, 25) + '</div>'
          : '';
        const label = (timePart || addrPart)
          ? '<div class="icon-label">' + timePart + addrPart + '</div>'
          : '';

        if (hasPick && hasDel) {
          return L.divIcon({
            className: 'custom-marker-wrapper',
            html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
                  '<div class="icon-split"><div class="icon-split-l">+</div><div class="icon-split-r">−</div></div>' +
                  label + '</div>',
            iconSize: [28, 55], iconAnchor: [14, 14]
          });
        }
        const symbol  = hasPick ? '➕' : '➖';
        const color   = hasPick ? '#2e7d32' : '#1565c0';
        const bgColor = hasPick ? '#e8f5e9' : '#e3f2fd';
        return L.divIcon({
          className: 'custom-marker-wrapper',
          html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
                '<div style="background:' + bgColor + ';border:2px solid ' + color +
                ';border-radius:50%;width:28px;height:28px;display:flex;align-items:center;' +
                'justify-content:center;font-size:15px;box-shadow:0 1px 4px rgba(0,0,0,.3);">' + symbol + '</div>' +
                label + '</div>',
          iconSize: [28, 55], iconAnchor: [14, 14]
        });
      }

      // ── Popup for gruppert markør ────────────────────────────
      function stopRows(entries, isPickup) {
        if (!entries.length) return '';
        const label = isPickup ? '➕ Hentested' : '➖ Leveringssted';
        const rows = entries.map(function (e) {
          const time = isPickup ? e.req.pasientKlar : e.req.oppmote;
          const tid  = time ? (time.split(' ')[1] || time) : '';
          const navn = e.req.pasientNavn || '–';
          return '<div class="popup-stop">' +
            '<div class="popup-stop-name">' + navn + '</div>' +
            (tid ? '<div class="popup-stop-tid">kl. ' + tid + '</div>' : '') +
            '</div>';
        }).join('');
        return '<div class="popup-section"><div class="popup-section-title">' + label +
               ' (' + entries.length + ')</div>' + rows + '</div>';
      }

      function groupPopup(g) {
        const adresse = (g.pickups[0] || g.deliveries[0]).stop;
        const headerTxt = (adresse.navn || adresse.adresse.split(',')[0]);
        return '<div class="popup-header">📍 ' + headerTxt + '</div>' +
               '<div class="popup-body">' +
               stopRows(g.pickups, true) +
               stopRows(g.deliveries, false) +
               '</div>';
      }

      function groupTooltip(g) {
        const lines = [];
        g.pickups.forEach(function (e) {
          const t = e.req.pasientKlar ? ' kl.' + (e.req.pasientKlar.split(' ')[1] || '') : '';
          lines.push('➕ ' + (e.req.pasientNavn || '?') + t);
        });
        g.deliveries.forEach(function (e) {
          const t = e.req.oppmote ? ' kl.' + (e.req.oppmote.split(' ')[1] || '') : '';
          lines.push('➖ ' + (e.req.pasientNavn || '?') + t);
        });
        const sted = (g.pickups[0] || g.deliveries[0]).stop;
        return (sted.navn || sted.adresse.split(',')[0]) + '<br>' + lines.join('<br>');
      }

      // ── Rute-waypoints (beregnes før initial zoom) ───────────
      function formatDist(m) { return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m'; }
      function formatTime(s) {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return h ? h + ' t ' + m + ' min' : m + ' min';
      }
      function setRouteInfo(text) {
        const el = document.getElementById('routeInfo');
        if (text) { el.textContent = text; el.style.display = ''; }
        else { el.style.display = 'none'; el.textContent = ''; }
      }

      const timedStops = [];
      reqDetails.forEach(function (req) {
        if (req.hentested)    timedStops.push({ lat: req.hentested.lat,    lon: req.hentested.lon,    t: req.pasientKlar || '' });
        if (req.leveringssted) timedStops.push({ lat: req.leveringssted.lat, lon: req.leveringssted.lon, t: req.oppmote || '' });
      });
      timedStops.sort(function (a, b) { return a.t.localeCompare(b.t); });

      const seen = new Set();
      const waypoints = timedStops.filter(function (s) {
        const k = s.lat.toFixed(5) + ',' + s.lon.toFixed(5);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).map(function (s) { return L.latLng(s.lat, s.lon); });

      let routeControl = null;
      let routeOn = true;

      // Rutekalkulering vil håndtere zoom – hopp over innledende fitBounds i så fall
      const willRoute = routeOn && waypoints.length >= 2;

      // ── Bygg markører ────────────────────────────────────────
      function earliestTime(entries, field) {
        return entries.map(function (e) { return (e.req[field] || '').split(' ')[1] || ''; })
          .filter(Boolean).sort()[0] || '';
      }

      const allLL = [];
      Object.values(groups).forEach(function (g) {
        const ll = [g.lat, g.lon];
        allLL.push(ll);
        const pickTime = earliestTime(g.pickups, 'pasientKlar');
        const delTime  = earliestTime(g.deliveries, 'oppmote');
        const firstStop = (g.pickups[0] || g.deliveries[0]).stop;
        const locName = firstStop.navn || firstStop.adresse.split(',')[0] || '';
        L.marker(ll, { icon: makeIcon(g.pickups.length > 0, g.deliveries.length > 0, pickTime, delTime, locName) })
          .addTo(map)
          .bindPopup(groupPopup(g))
          .bindTooltip(groupTooltip(g), { direction: 'top', offset: [0, -8] });
      });

      if (!willRoute) {
        if (allLL.length === 1)     map.setView(allLL[0], 14);
        else if (allLL.length > 1)  map.fitBounds(allLL, { padding: [50, 50] });
      }

      function drawRoute() {
        if (!routeOn || waypoints.length < 2) return;
        const fallback = function () {
          const poly = L.polyline(waypoints.map(function (w) { return [w.lat, w.lng]; }),
            { color: '#047CA1', weight: 3, opacity: 0.65, dashArray: '8,6' }).addTo(map);
          routeControl = { remove: function () { map.removeLayer(poly); } };
        };
        try {
          const ctrl = L.Routing.control({
            waypoints,
            router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'driving', timeout: 10000 }),
            lineOptions: { styles: [{ color: '#047CA1', weight: 4, opacity: 0.7 }] },
            createMarker: function () { return null; },
            addWaypoints: false, routeWhileDragging: false,
            showAlternatives: false, fitSelectedRoutes: false, show: false
          }).addTo(map);
          ctrl.on('routesfound', function (e) {
            const route = e.routes[0];
            setRouteInfo('🛣 ' + formatDist(route.summary.totalDistance) + ' · ⏱ ca. ' + formatTime(route.summary.totalTime));
            if (route.coordinates && route.coordinates.length > 1) {
              map.fitBounds(L.latLngBounds(route.coordinates), { padding: [50, 50] });
            }
          });
          ctrl.on('routingerror', function () { map.removeControl(ctrl); setRouteInfo(null); fallback(); });
          routeControl = { remove: function () { map.removeControl(ctrl); } };
        } catch (e) { fallback(); }
      }

      function removeRoute() {
        if (routeControl) { routeControl.remove(); routeControl = null; }
        setRouteInfo(null);
      }

      drawRoute();

      // Knapp – rute
      const btn = document.getElementById('routeToggleBtn');
      btn.addEventListener('click', function () {
        routeOn = !routeOn;
        if (routeOn) { drawRoute(); btn.classList.remove('av'); }
        else { removeRoute(); btn.classList.add('av'); }
      });

      // Knapp – labels (tid + adresse på ikoner)
      let showLabels = true;
      const labelBtn = document.getElementById('labelToggleBtn');
      labelBtn.addEventListener('click', function () {
        showLabels = !showLabels;
        document.body.classList.toggle('labels-hidden', !showLabels);
        labelBtn.classList.toggle('av', !showLabels);
      });

      const antall = reqDetails.length;
      document.getElementById('status').textContent =
        antall + ' bestilling' + (antall !== 1 ? 'er' : '');
    }
  </script>
</body>
</html>`;
  }

  // ── Åpne kart-vindu ───────────────────────────────────────
  function openKartWindow(reqDetails) {
    const width  = Math.floor(window.innerWidth / 2);
    const height = Math.floor(window.innerHeight * 0.9);

    // Lagre data på parent-vinduet så popup kan hente det via window.opener
    window._kartvisningData = reqDetails;

    const mapWindow = window.open(
      '', 'NissyKartvisning',
      `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
    );
    if (!mapWindow) {
      showError('Popup blokkert – tillat popup og prøv igjen');
      return;
    }
    mapWindow.document.write(buildMapHtml());
    mapWindow.document.close();
  }

  // ── Hovedfunksjon ─────────────────────────────────────────
  async function visKart() {
    const voppIds = getVoppReqIds();
    const poppIds = getPoppReqIds();
    const alleIds = [...new Set([...voppIds, ...poppIds])];

    if (alleIds.length === 0) {
      showError('Ingen bestillinger er merket');
      return;
    }

    const vTxt = voppIds.length ? `${voppIds.length} ventende` : '';
    const pTxt = poppIds.length ? `${poppIds.length} pågående` : '';
    showLoading(`Henter koordinater for ${[vTxt, pTxt].filter(Boolean).join(' + ')}…`);

    let allDetails;
    try {
      allDetails = await Promise.all(alleIds.map(id => fetchReqDetails(id)));
    } finally {
      hideLoading();
    }

    const med  = allDetails.filter(d => d.hentested || d.leveringssted);
    const uten = allDetails.filter(d => !d.hentested && !d.leveringssted);

    if (uten.length > 0) {
      console.warn('[Kartvisning] Ingen koordinater for:', uten.map(d => d.reqId));
    }
    if (med.length === 0) {
      showError('Fant ingen koordinater for de merkede bestillingene');
      return;
    }

    openKartWindow(med);
  }

  // ── Intercepter window.open for mapDisplay.jsp ────────────
  const _origOpen = window.open;
  window.open = function (url, target, features) {
    if (url && url.includes('mapDisplay')) {
      visKart();
      return null;
    }
    return _origOpen.call(this, url, target, features);
  };

  console.log('✅ Kartvisning klar – trykk Vis i kart (Alt+W) med merkede bestillinger');
})();
