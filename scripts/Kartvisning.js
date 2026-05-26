// ============================================================
// KARTVISNING SCRIPT
// Erstatter NISSY sin "Vis i kart" (Alt+W / buttonShowMap)
// Henter reqId fra merkede rader (vopp + popp) og viser
// hente/leveringskoordinater i Leaflet/OpenStreetMap-kart
// ============================================================
// ORS-rutingresultater mellomlagres i localStorage i 7 dager
// for å spare API-kvoten. Hvis ruting gir uventede resultater,
// tøm cachen i konsollen med:
//   Object.keys(localStorage).filter(k => k.startsWith('ors_')).forEach(k => localStorage.removeItem(k))

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
    const frammeIds = new Set();
    const headers = document.querySelectorAll('#pagaendeoppdrag thead th');
    let statusColIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].querySelector('a[href*="resourceStatus"]')) { statusColIdx = i; break; }
    }
    Array.from(document.querySelectorAll('#pagaendeoppdrag tbody tr'))
      .filter(r => r.id?.startsWith('P-') && r.style.backgroundColor === SELECTED_BG)
      .forEach(tr => {
        const imgs = tr.querySelectorAll("img[onclick*='toggleManualStatusRequisition']");
        const cells = statusColIdx !== -1 ? [...tr.querySelectorAll('td')] : [];
        imgs.forEach((img, i) => {
          const m = img.getAttribute('onclick').match(/toggleManualStatusRequisition\(this,(\d+)\)/);
          if (!m) return;
          if (!reqIds.includes(m[1])) reqIds.push(m[1]);
          if (statusColIdx !== -1) {
            const statusDivs = cells[statusColIdx]?.querySelectorAll('div.row-image');
            const status = statusDivs?.length
              ? (statusDivs[i]?.textContent.trim() ?? '')
              : (cells[statusColIdx]?.textContent.trim() ?? '');
            if (status === 'Framme') frammeIds.add(m[1]);
          }
        });
      });
    return { ids: reqIds, frammeIds };
  }

  // ── Toast-hjelpere ────────────────────────────────────────
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

  // ── Adresse- og navneformatering ─────────────────────────
  function cleanAddressSuffixes(address) {
    if (!address) return address;
    return address.replace(/\s+[HU]\d{4}(?=,)/g, '');
  }

  function normaliserAdresse(address) {
    if (!address) return address;
    const erVegadresse = /\d+[A-ZÆØÅa-zæøå]?\s*,/.test(address);
    if (!erVegadresse) return address;
    const ALLTID_LITEN = /^(veg|vei|gate)$/i;
    const BOKSTAV_OG_TALL = /^[a-zA-ZæøåÆØÅ]*\d+[a-zA-ZæøåÆØÅ]+$|^[a-zA-ZæøåÆØÅ]+\d+[a-zA-ZæøåÆØÅ]*$/;
    return address.replace(/[^\s,]+/g, token => {
      if (ALLTID_LITEN.test(token)) return token.toLowerCase();
      if (BOKSTAV_OG_TALL.test(token)) return token.toUpperCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    });
  }

  function kortNavn(navn) {
    if (!navn) return navn;
    const deler = navn.trim().split(/\s+/);
    return deler.length <= 2 ? navn : deler[0] + ' ' + deler[deler.length - 1];
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
        const m = (rows['Geo-koordinater'] || '').match(/(\d{6,7})\s*\/\s*(-?\d{4,7})/);
        if (m) {
          const northing = parseInt(m[1]), easting = parseInt(m[2]);
          const ll = utmToLatLon(easting, northing);
          const rawAdresse = [rows['Adresse'], rows['Postnr / Sted']].filter(Boolean).join(', ');
          const loc = {
            lat: ll.lat, lon: ll.lon,
            adresse: normaliserAdresse(cleanAddressSuffixes(rawAdresse)),
            navn: rows['Navn'] || '',
            poststed: (rows['Postnr / Sted'] || '').replace(/^\d{4}\s*/, ''),
          };
          if (title === 'Hentested') result.hentested = loc;
          else result.leveringssted = loc;
        }
      } else if (title === 'Rekvisisjon') {
        result.reqNr  = rows['Rekvisisjon'] || '';
        result.status = rows['Rekvisisjonsstatus'] || '';
      } else if (title === 'Pasient') {
        result.pasientNavn = kortNavn(rows['Navn']) || '';
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

  // Kontor-nøkler: legg til / bytt ut når IT-ansvarlig sender ny nøkkel.
  // Gratis collaborative plan: https://account.heigit.org
  const ORS_KEYS = {
    'Pasientreiser Nord-Trøndelag': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEzZjFjNGE4OWU2MzQ3Y2M4ODYyZTY1MDVhMWRjMzYzIiwiaCI6Im11cm11cjY0In0=',
    'Kontoret for pasientreiser, Ålesund': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU5YTZmYWFmZGZhOTQxNzQ5OGMyY2UwMzkwZWEyYzA2IiwiaCI6Im11cm11cjY0In0=',
    'Pasientreiser Sør-Trøndelag': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ5MDM5NzZiMjAwYjRmY2I5MmFhNjUyNjJjOWU2OGI5IiwiaCI6Im11cm11cjY0In0=',
    'Pasientreiser Helse Bergen': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImRlZjdjZTY4MzQ1ZDRhYmM4NzIxZDU1ZTcxMzIxNjBmIiwiaCI6Im11cm11cjY0In0=',
    'Reisekontoret - Nordlandssykehuset HF': 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEwNjQ2MDUxMjQ0ZTQ5ZDQ5MzJjYzIyYTJkZmIxNDEzIiwiaCI6Im11cm11cjY0In0=',
  };
  // Personlige nøkler: brukerens egen kvote brukes fremfor kontorets.
  // Legg til id (fra popup/changePassword?id=XXXXX) → nøkkel.
  const ORS_USER_KEYS = {
    108137: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImVjODQwMjk1OTQyYzRjMzJhNmM1YWUyMWExN2U2Y2UzIiwiaCI6Im11cm11cjY0In0=', // alfeinarj
    113859: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFhYTUxNDg3NGMzZjRkN2RhZTExMzg4NWEwMzZjM2ZmIiwiaCI6Im11cm11cjY0In0=', // augustk
    144809: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM2ZWZkMmQ0OWI5MzQxOWM4ZWMwNDE5ZTI5YjI5MGM0IiwiaCI6Im11cm11cjY0In0=', // svelia
    168713: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZjMjQ5ZjQxZjdjNDRjOWE5ZjY0NThiYmQxZDk3YTMxIiwiaCI6Im11cm11cjY0In0=', // sutnes
  };
  const _officeMatch = document.querySelector('.topframe_small')?.textContent.match(/Pasientreisekontor for ([^\n]+)/);
  const _currentOffice = _officeMatch?.[1]?.trim() || null;
  const _userIdMatch = document.querySelector('a[href*="changePassword"]')?.getAttribute('href')?.match(/id=(\d+)/);
  const _currentUserId = _userIdMatch ? parseInt(_userIdMatch[1], 10) : null;
  const ORS_API_KEY = ORS_USER_KEYS[_currentUserId] || ORS_KEYS[_currentOffice] || null;
  const orsEnabled = !!ORS_API_KEY;
  // 'ors' eller 'osrm' — avgjør hvilken tjeneste som er primær for fergepipelinen
  const FERRY_ROUTING = 'ors';
  const orsReturReqs = orsEnabled;

  // ── Kart-vindu HTML (data sendes via window.opener) ───────
  function buildMapHtml() {
    return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>Kartvisning</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
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
    #routeToggleBtn, #labelToggleBtn, #frammeToggleBtn {
      padding:6px 14px; background:#CFECF5; color:#025671;
      border:none; border-radius:4px; font-weight:600; cursor:pointer;
      transition:all 0.2s; font-size:13px;
    }
    #routeToggleBtn.av, #labelToggleBtn.av, #frammeToggleBtn.av { background:rgba(255,255,255,0.2); color:#fff; opacity:0.7; }
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
    .leaflet-interactive:focus { outline: none; }
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
      position:relative; border-radius:50%; width:26px; height:26px;
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
    <h1>🗺️ Kartvisning</h1>
    <div id="controls">
      <button id="labelToggleBtn" title="Vis/skjul tid og adresse på ikoner">ℹ️ Info på ikon</button>
      <button id="routeToggleBtn" title="Beregnet kjørerute via ORS/OSRM">📐 Beregnet rute</button>
      <div id="routeInfo" style="display:none;font-size:13px;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:4px;"></div>
      <button id="frammeToggleBtn" style="display:none;" title="Vis/skjul Framme-bestillinger">Framme (0)</button>
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

      // Last Leaflet
      function loadScript(src, cb, onErr) {
        const s = document.createElement('script');
        s.src = src; s.crossOrigin = ''; s.onload = cb; s.onerror = onErr;
        document.head.appendChild(s);
      }
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', function () {
        initMap(reqDetails).catch(function (err) {
          console.error('[Kartvisning] initMap feilet:', err);
          document.getElementById('status').textContent = '⚠️ Kartvisning feilet – se konsoll';
        });
      }, function () {
        document.getElementById('status').textContent = '⚠️ Kartbibliotek lastet ikke';
        if (window.opener && window.opener._origOpen && window.opener._lastMapOpenArgs) {
          window.opener._origOpen.apply(window.opener, window.opener._lastMapOpenArgs);
        }
        window.close();
      });
    });

    async function initMap(reqDetails) {
      const map = L.map('map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors | Ruting: <a href="https://openrouteservice.org">openrouteservice</a>',
        maxZoom: 19
      }).addTo(map);

      // Forklaring
      const legend = document.createElement('div');
      legend.className = 'legend';
      legend.innerHTML =
        '<div><span style="font-size:14px">➕</span> Henting</div>' +
        '<div><span style="font-size:14px">➖</span> Levering</div>' +
        '<div><span class="icon-split" style="display:inline-flex;vertical-align:middle;width:18px;height:18px;font-size:9px;border-width:1.5px;">' +
        '<span class="icon-split-l">+</span><span class="icon-split-r">−</span></span> Begge</div>';
      document.getElementById('map').appendChild(legend);

      // ── Fergedata ────────────────────────────────────────────
      const FERGER = [
        {
          id: 'nearoysund',
          crossing_min: 25,
          leier: [
            {
              navn: 'Hofles', lat: 64.827474, lon: 11.612125,
              retning: 'Hofles → Lund',
              avganger: {
                'man-fre': ['05:50','07:10','08:30','09:50','11:10','13:00','14:00','15:20','16:40','18:00','20:00','21:30'],
                'lor':     ['07:15','08:30','09:50','11:10','14:00','15:20','16:40','20:00','21:30'],
                'son':     ['08:30','09:50','11:10','14:00','15:20','16:40','18:00','20:00','21:30']
              }
            },
            {
              navn: 'Lund', lat: 64.768195, lon: 11.623273,
              retning: 'Lund → Hofles',
              avganger: {
                'man-fre': ['06:20','07:40','09:00','10:20','11:40','13:30','14:30','15:50','17:10','18:30','20:30','22:00'],
                'lor':     ['07:40','09:00','10:20','11:40','14:30','15:50','17:10','20:30','22:00'],
                'son':     ['09:00','10:20','11:40','14:30','15:50','17:10','18:30','20:30','22:00']
              }
            }
          ]
        },
        {
          id: 'hofles-geisnes',
          crossing_min: 10,
          leier: [
            {
              navn: 'Hofles', lat: 64.827474, lon: 11.612125,
              retning: 'Hofles → Geisnes',
              avganger: {
                'man-fre': ['06:50','08:05','09:30','10:50','12:40','15:00','16:20','17:40','19:00','21:00','22:30'],
                'lor':     ['08:05','09:30','10:50','12:40','13:40','15:00','16:20','17:40','21:00','22:30'],
                'son':     ['08:05','09:30','10:50','12:40','15:00','16:20','17:40','19:00','21:00','22:30']
              }
            },
            {
              navn: 'Geisnes', lat: 64.815972, lon: 11.625307,
              retning: 'Geisnes → Hofles',
              avganger: {
                'man-fre': ['06:55','08:15','09:35','10:55','12:45','15:05','16:25','17:45','19:05','21:05','22:35'],
                'lor':     ['08:15','09:35','10:55','12:45','13:45','15:05','16:25','17:45','21:05','22:35'],
                'son':     ['08:15','09:35','10:55','12:45','15:05','16:25','17:45','19:05','21:05','22:35']
              }
            }
          ]
        },
        {
          id: 'leka',
          crossing_min: 20,
          leier: [
            {
              navn: 'Skei', lat: 65.088040, lon: 11.738099,
              mainland: false,
              retning: 'Skei → Gutvik',
              avganger: {
                'man-fre': ['06:50','08:00','09:35','10:35','12:40','13:40','14:40','15:40','16:40','18:15','19:15','21:00','22:00','23:15'],
                'lor': ['08:00','09:35','10:35','13:40','14:40','17:00','18:15','21:00'],
                'son': ['08:00','10:00','12:40','13:40','14:40','17:00','19:15','21:30']
              }
            },
            {
              navn: 'Gutvik', lat: 65.084413, lon: 11.828773,
              retning: 'Gutvik → Skei',
              avganger: {
                'man-fre': ['07:30','08:30','10:05','11:05','13:10','14:10','15:10','16:10','17:10','18:45','19:45','21:30','22:30','23:40'],
                'lor': ['08:30','10:05','11:05','14:10','15:10','17:30','18:45','21:30'],
                'son': ['08:30','10:30','13:10','14:10','15:10','17:30','19:45','22:00']
              }
            }
          ]
        },
        {
          id: 'ytterøy',
          crossing_min: 30,
          leier: [
            {
              navn: 'Hokstad', lat: 63.798396, lon: 11.168300,
              mainland: false,
              retning: 'Hokstad → Levanger',
              avganger: {
                'man-fre': ['04:55','06:05','07:15','08:35','09:50','11:20','12:35','13:50','14:35','15:00','16:10','17:20','18:35','19:45','20:55','22:35','23:45'],
                'lor': ['07:05','08:35','10:35','12:35','14:35','16:10','17:20','18:35','20:55','22:35'],
                'son': ['07:05','08:35','10:35','12:35','13:50','15:00','16:10','17:20','18:35','20:55','22:35']
              }
            },
            {
              navn: 'Levanger', lat: 63.749221, lon: 11.299541,
              retning: 'Levanger → Hokstad',
              avganger: {
                'man-fre': ['04:20','05:30','06:40','08:00','09:15','10:45','12:00','13:15','14:00','14:25','15:35','16:45','18:00','19:10','20:20','22:00','23:10'],
                'lor': ['06:30','08:00','10:00','12:00','14:00','15:35','16:45','18:00','20:20','22:00'],
                'son': ['06:30','08:00','10:00','12:00','13:15','14:25','15:35','16:45','18:00','20:20','22:00']
              }
            }
          ]
        },
        {
          id: 'jøa',
          crossing_min: 5,
          leier: [
            {
              navn: 'Seierstad', lat: 64.637475, lon: 11.345592,
              mainland: false,
              retning: 'Seierstad → Ølhammeren',
              avganger: {
                'man-fre': ['06:15','06:45','07:15','07:45','08:15','08:45','09:45','10:45',
                            '11:45','12:45','13:15','13:45','14:15','14:45','15:15','15:45',
                            '16:15','16:45','17:15','17:45','18:45','19:45','20:45','21:45','22:45'],
                'lor': ['06:15','06:45','07:15','07:45','08:45','09:45','10:45','11:45','12:45',
                        '13:45','14:45','15:45','16:45','17:45','18:45','19:45','20:45','21:45','22:45'],
                'son': ['06:15','07:45','08:45','09:45','10:45','11:45','12:45','13:45','14:45',
                        '15:45','16:45','17:45','18:45','19:45','20:45','21:45','22:45']
              }
            },
            {
              navn: 'Ølhammeren', lat: 64.636655, lon: 11.360349,
              retning: 'Ølhammeren → Seierstad',
              avganger: {
                'man-fre': ['06:30','07:00','07:30','08:00','08:30','09:00','10:00','11:00','12:00',
                            '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00',
                            '17:30','18:00','19:00','20:00','21:00','22:00','23:00'],
                'lor': ['06:30','07:00','07:30','08:00','09:00','10:00','11:00','12:00','13:00',
                        '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'],
                'son': ['06:30','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00',
                        '16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']
              }
            }
          ]
        },
        {
          id: 'gjerdinga',
          crossing_min: 10,
          leier: [
            {
              navn: 'Gjerdinga', lat: 64.945012, lon: 11.449137,
              mainland: false,
              retning: 'Gjerdinga → Eidshaug',
              note: '12:15 (man+ons). Skoledager: 13:15 (ons). Kun man: 20:00. Ons+fre: 21:00',
              avganger: {
                'man-fre': ['06:55','07:40','08:30','12:15','13:15','14:15','15:10','16:00','17:30','20:00','21:00'],
                'lor': ['10:00','15:45'],
                'son': ['11:00','15:05','19:00']
              }
            },
            {
              navn: 'Eidshaug', lat: 64.932361, lon: 11.464512,
              retning: 'Eidshaug → Gjerdinga',
              note: '12:30 (man+ons). Skoledager: 13:30 (ons). Kun man: 20:10. Ons+fre: 21:10',
              avganger: {
                'man-fre': ['07:30','08:00','08:45','12:30','13:30','14:30','15:40','16:20','18:00','20:10','21:10'],
                'lor': ['10:10','16:00'],
                'son': ['11:15','15:20','19:10']
              }
            }
          ]
        }
      ];

      function tidMin(a) {
        const s = Array.isArray(a) ? a[0] : a;
        const p = s.split(':');
        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
      }
      function minTil(m) {
        const h = Math.floor(m / 60) % 24, mn = m % 60;
        return (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn;
      }

      function makeFerjeIcon(leie, timeInfo, warning, warnColor) {
        const timePart = timeInfo
          ? '<div class="icon-label-time">' +
            '<span style="color:#00897b">' + timeInfo.avgang + '</span>' +
            (timeInfo.ankomst
              ? '<span style="color:#999">→</span><span style="color:#00695c">' + timeInfo.ankomst + '</span>'
              : '') +
            '</div>'
          : '';
        const warnPart = warning
          ? '<div class="icon-label-time"><span style="color:' + (warnColor || '#c62828') + '">' + warning + '</span></div>'
          : '';
        const label = (timePart || warnPart) ? '<div class="icon-label">' + timePart + warnPart + '</div>' : '';
        return L.divIcon({
          className: 'custom-marker-wrapper',
          html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
                '<div style="background:#e0f2f1;border:2px solid #00897b;border-radius:50%;width:26px;height:26px;' +
                'display:flex;align-items:center;justify-content:center;font-size:14px;' +
                'box-shadow:0 1px 4px rgba(0,0,0,.3);">⛴</div>' +
                label + '</div>',
          iconSize: [26, 55], iconAnchor: [13, 13]
        });
      }

      function ferjeTooltipDefault(leie, dk) {
        const avg = leie.avganger[dk || 'man-fre'] || leie.avganger['man-fre'];
        const lines = ['<b>⛴ ' + leie.retning + '</b>'];
        for (let i = 0; i < avg.length; i += 5)
          lines.push(avg.slice(i, i + 5).join('&nbsp;&nbsp;'));
        if (leie.note) lines.push('<span style="color:#aaa;font-size:11px">' + leie.note + '</span>');
        return lines.join('<br>');
      }

      function ferjeTooltipMedRute(leie, ankomstMin, relevante, nesteIdx) {
        const lines = ['<b>⛴ ' + leie.retning + '</b>'];
        if (ankomstMin !== null) lines.push('Est. ankomst: <b>' + minTil(ankomstMin) + '</b>');
        relevante.forEach(function (a, idx) {
          const erNeste = idx === nesteIdx;
          lines.push((erNeste ? '<b>' : '') + a + (erNeste ? '</b>' : ''));
        });
        if (leie.note) lines.push('<span style="color:#aaa;font-size:11px">' + leie.note + '</span>');
        return lines.join('<br>');
      }

      const ferjeMarkers = {};
      FERGER.forEach(function (ferge) {
        ferge.leier.forEach(function (leie) {
          const m = L.marker([leie.lat, leie.lon], {
            icon: makeFerjeIcon(leie, null), zIndexOffset: -50
          }).bindTooltip(ferjeTooltipDefault(leie), { direction: 'top', offset: [0, -8] });
          ferjeMarkers[leie.navn] = m;
        });
      });

      // ── Grupper stopp per koordinat ─────────────────────────
      function coordKey(lat, lon) { return lat.toFixed(5) + ',' + lon.toFixed(5); }

      // ── Ikon ────────────────────────────────────────────────
      function trunc(str, n) { return str && str.length > n ? str.slice(0, n - 1) + '…' : str || ''; }

      function makeIcon(hasPick, hasDel, pickTime, delTime, locName, pickCount, delCount, delIsLate, suggestedPickTime) {
        const delColor = delIsLate ? '#c62828' : '#1565c0';
        const timePart = (pickTime || delTime)
          ? '<div class="icon-label-time">' +
            (hasPick && hasDel
              ? (pickTime ? '<span style="color:#2e7d32">' + pickTime + '</span>' : '') +
                (pickTime && delTime ? '<span style="color:#999">·</span>' : '') +
                (delTime  ? '<span style="color:' + delColor + '">' + delTime  + '</span>' : '')
              : '<span style="color:' + (hasPick ? '#2e7d32' : delColor) + '">' +
                (hasPick ? pickTime : delTime) + '</span>') +
            '</div>'
          : '';
        const suggestedPart = (hasPick && suggestedPickTime)
          ? '<div style="color:#e65100;font-size:10px;line-height:1.2">→ ' + suggestedPickTime + '</div>'
          : '';
        const addrPart = locName
          ? '<div class="icon-label-addr">' + trunc(locName, 25) + '</div>'
          : '';
        const label = (timePart || suggestedPart || addrPart)
          ? '<div class="icon-label">' + timePart + suggestedPart + addrPart + '</div>'
          : '';

        function badgeHtml(count, color, side) {
          if (count <= 1) return '';
          return '<div style="position:absolute;top:-5px;' + side + ':-5px;background:' + color + ';color:#fff;' +
            'border-radius:50%;width:15px;height:15px;font-size:9px;font-weight:900;' +
            'display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;">' + count + '</div>';
        }

        if (hasPick && hasDel) {
          return L.divIcon({
            className: 'custom-marker-wrapper',
            html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
                  '<div style="position:relative;">' +
                  '<div class="icon-split"><div class="icon-split-l">+</div><div class="icon-split-r">−</div></div>' +
                  badgeHtml(pickCount, '#2e7d32', 'left') +
                  badgeHtml(delCount,  '#1565c0', 'right') +
                  '</div>' +
                  label + '</div>',
            iconSize: [26, 55], iconAnchor: [13, 13]
          });
        }
        const symbol  = hasPick ? '➕' : '➖';
        const color   = hasPick ? '#2e7d32' : '#1565c0';
        const bgColor = hasPick ? '#e8f5e9' : '#e3f2fd';
        const count   = hasPick ? pickCount : delCount;
        return L.divIcon({
          className: 'custom-marker-wrapper',
          html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
                '<div style="position:relative;">' +
                '<div style="background:' + bgColor + ';border:2px solid ' + color +
                ';border-radius:50%;width:26px;height:26px;display:flex;align-items:center;' +
                'justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.3);">' + symbol + '</div>' +
                badgeHtml(count, color, 'right') +
                '</div>' +
                label + '</div>',
          iconSize: [26, 55], iconAnchor: [13, 13]
        });
      }

      function groupTooltip(g) {
        const sted = (g.pickups[0] || g.deliveries[0]).stop;
        const lines = ['<b>📍 ' + (sted.navn || sted.adresse) + '</b>'];
        if (sted.navn && sted.adresse) lines.push(sted.adresse);
        g.pickups.forEach(function (e) {
          const t = e.req.pasientKlar ? ' kl.' + (e.req.pasientKlar.split(' ')[1] || '') : '';
          const sugg = foreslåttHent[e.req.reqId];
          const suggTekst = sugg ? ' <span style="color:#e65100;font-size:11px">→ hent ' + sugg + '?</span>' : '';
          lines.push('➕ ' + (e.req.pasientNavn || '?') + t + suggTekst);
        });
        let hasEst = false;
        g.deliveries.forEach(function (e) {
          const est = estimertLev[e.req.reqId];
          const oppmoteTid = (e.req.oppmote || '').split(' ')[1] || '';
          let tidTekst;
          if (est) {
            hasEst = true;
            const klarMin = parseMin(e.req.pasientKlar), oppMin = parseMin(e.req.oppmote);
            const erRetur = klarMin !== null && oppMin !== null && oppMin <= klarMin;
            const estStyle = est.isLate ? ' style="color:#c62828;font-weight:700"' : '';
            tidTekst = ' kl.<span' + estStyle + '>' + est.display + '</span>' +
              (!erRetur && oppmoteTid ? ' <span style="color:#888;font-size:11px">(oppmøte ' + oppmoteTid + ')</span>' : '');
          } else {
            tidTekst = oppmoteTid ? ' kl.' + oppmoteTid : '';
          }
          lines.push('➖ ' + (e.req.pasientNavn || '?') + tidTekst);
        });
        if (hasEst) lines.push('<span style="color:#888;font-size:11px">ℹ️ ~ = estimert leveringstid</span>');
        return lines.join('<br>');
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

      function resetFerjeMarkers() {
        FERGER.forEach(function (ferge) {
          ferge.leier.forEach(function (leie) {
            const m = ferjeMarkers[leie.navn];
            if (!m) return;
            if (map.hasLayer(m)) map.removeLayer(m);
            m.setIcon(makeFerjeIcon(leie, null));
            m.setTooltipContent(ferjeTooltipDefault(leie));
          });
        });
      }

      function haversine(a, b) {
        const R = 6371000, rad = Math.PI / 180;
        const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      }

      function validLL(s) { return s && isFinite(s.lat) && isFinite(s.lon); }


      function parseMin(s) {
        const t = s && s.split(' ')[1];
        if (!t) return null;
        const p = t.split(':');
        return p.length < 2 ? null : parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
      }
      function minToStr(m) {
        const h = Math.floor(m / 60) % 24, mn = m % 60;
        return (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn;
      }
      // Brukes kun i sortKey – ikke % 24, slik at tider forbi midnatt sorterer korrekt
      function minToSortStr(m) {
        const h = Math.floor(m / 60), mn = m % 60;
        return (h < 10 ? '0' : '') + h + ':' + (mn < 10 ? '0' : '') + mn;
      }

      // ── Routing-hjelpere for fergepipeline ───────────────────
      const _orsEnabled    = ${orsEnabled};
      const _orsKey        = '${ORS_API_KEY}';
      const _ferryRouting  = '${FERRY_ROUTING}';
      const _orsReturReqs  = ${orsReturReqs};

      const ORS_CACHE_DAYS = 7;
      function _orsCacheKey(lonA, latA, lonB, latB) {
        function r(n) { return Math.round(n * 10000) / 10000; }
        return 'ors_' + r(lonA) + ',' + r(latA) + '_' + r(lonB) + ',' + r(latB);
      }
      function _orsCacheGet(key) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const entry = JSON.parse(raw);
          return (Date.now() - entry.ts) / 86400000 <= ORS_CACHE_DAYS ? entry.sec : null;
        } catch (e) { return null; }
      }
      function _orsCacheSet(key, sec) {
        try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), sec: sec })); } catch (e) {}
      }

      function fetchDurationORS(lonA, latA, lonB, latB) {
        if (!_orsEnabled) return Promise.reject(new Error('ORS ikke aktivert'));
        const key = _orsCacheKey(lonA, latA, lonB, latB);
        const cached = _orsCacheGet(key);
        if (cached !== null) return Promise.resolve(cached);
        return fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car', {
          method: 'POST',
          headers: { 'Authorization': _orsKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: [[lonA, latA], [lonB, latB]] }),
          signal: AbortSignal.timeout(8000)
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          const sec = d.routes && d.routes[0] ? d.routes[0].summary.duration : null;
          if (sec !== null) _orsCacheSet(key, sec);
          return sec;
        });
      }

      function fetchDurationOSRM(lonA, latA, lonB, latB) {
        return fetch('https://router.project-osrm.org/route/v1/driving/' +
          lonA + ',' + latA + ';' + lonB + ',' + latB + '?overview=false',
          { signal: AbortSignal.timeout(5000) })
        .then(function (r) { return r.json(); })
        .then(function (d) { return d.routes && d.routes[0] ? d.routes[0].duration : null; });
      }

      function fetchSegmentDuration(lonA, latA, lonB, latB) {
        const primary   = _ferryRouting === 'ors' ? fetchDurationORS  : fetchDurationOSRM;
        const secondary = _ferryRouting === 'ors' ? fetchDurationOSRM : fetchDurationORS;
        return primary(lonA, latA, lonB, latB)
          .then(function (sec) {
            if (sec !== null) return sec;
            return secondary(lonA, latA, lonB, latB).catch(function () { return null; });
          })
          .catch(function () {
            return secondary(lonA, latA, lonB, latB).catch(function () { return null; });
          });
      }

      function fetchChainDurations(points, fallbackSecs) {
        function viaORS() {
          if (!_orsEnabled) return Promise.reject(new Error('ORS ikke aktivert'));
          return fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car', {
            method: 'POST',
            headers: { 'Authorization': _orsKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: points }),
            signal: AbortSignal.timeout(8000)
          })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            const segs = d.routes && d.routes[0] ? d.routes[0].segments : null;
            if (!segs) return null;
            let cum = 0;
            return segs.map(function (s) { cum += s.duration; return cum; });
          });
        }
        function viaOSRM() {
          const coords = points.map(function (p) { return p[0] + ',' + p[1]; }).join(';');
          return fetch('https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=false',
            { signal: AbortSignal.timeout(5000) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            const legs = data.routes && data.routes[0] ? data.routes[0].legs : null;
            if (!legs) return null;
            let cum = 0;
            return legs.map(function (leg) { cum += leg.duration; return cum; });
          });
        }
        const primary   = _ferryRouting === 'ors' ? viaORS  : viaOSRM;
        const secondary = _ferryRouting === 'ors' ? viaOSRM : viaORS;
        return primary()
          .then(function (res) {
            if (res) return res;
            return secondary().catch(function () { return null; });
          })
          .catch(function () {
            return secondary().catch(function () { return null; });
          })
          .then(function (res) { return res || fallbackSecs; });
      }

      // Returer med dårlig datakvalitet: oppmote <= pasientKlar → hent faktisk kjøretid fra rutingstjeneste
      const estimertLev = {};
      const foreslåttHent = {};
      const returReqs = reqDetails.filter(function (req) {
        if (!validLL(req.hentested) || !validLL(req.leveringssted)) return false;
        const hMin = parseMin(req.pasientKlar), lMin = parseMin(req.oppmote);
        return hMin !== null && lMin !== null && lMin <= hMin;
      });
      let luftlinjeFallback = false;
      if (returReqs.length > 0) {
        const osrmRes = await Promise.all(returReqs.map(function (req) {
          const h = req.hentested, l = req.leveringssted;
          return (_orsReturReqs ? fetchSegmentDuration : fetchDurationOSRM)(h.lon, h.lat, l.lon, l.lat)
            .then(function (sec) { return { req: req, sec: sec }; })
            .catch(function () { return { req: req, sec: null }; });
        }));
        osrmRes.forEach(function (result) {
          const req = result.req;
          const hMin = parseMin(req.pasientKlar);
          const dateStr = (req.pasientKlar || '').split(' ')[0];
          let travelMin;
          if (result.sec !== null) {
            travelMin = Math.round(result.sec / 60) + 5;
          } else {
            travelMin = Math.round(haversine(req.hentested, req.leveringssted) / 70000 * 60) + 10;
            luftlinjeFallback = true;
          }
          estimertLev[req.reqId] = { sortKey: dateStr + ' ' + minToSortStr(hMin + travelMin), display: '~' + minToStr(hMin + travelMin), isLate: false };
        });
      }

      // ── Tilstand for re-render ───────────────────────────────
      let currentMarkerLayers = [];
      let currentAllLL = [];
      let currentWaypoints = [];
      let currentWaypointMeta = [];
      let routeControl = null;
      let routeOn = true;
      let currentFiltered = [];
      let markersByKey = {};
      let groupsByKey = {};

      function earliestTime(entries, field) {
        return entries.map(function (e) { return (e.req[field] || '').split(' ')[1] || ''; })
          .filter(Boolean).sort()[0] || '';
      }
      function deliveryTime(entries) {
        const times = [];
        entries.forEach(function (e) {
          const est = estimertLev[e.req.reqId];
          if (est) { times.push({ sort: est.sortKey, display: est.display }); return; }
          const t = (e.req.oppmote || '').split(' ')[1] || '';
          if (t) times.push({ sort: t, display: t });
        });
        if (!times.length) return '';
        times.sort(function (a, b) { return a.sort.localeCompare(b.sort); });
        return times[0].display;
      }
      function deliveryIsLate(entries) {
        return entries.some(function (e) {
          const est = estimertLev[e.req.reqId];
          return est && est.isLate;
        });
      }
      function refreshMarker(k) {
        const marker = markersByKey[k], g = groupsByKey[k];
        if (!marker || !g) return;
        const pickTime  = earliestTime(g.pickups, 'pasientKlar');
        const delTime   = deliveryTime(g.deliveries);
        const delIsLate = deliveryIsLate(g.deliveries);
        const firstStop = (g.pickups[0] || g.deliveries[0]).stop;
        const locName = firstStop.navn || firstStop.adresse.split(',')[0] || '';
        const suggestedPickTime = g.pickups.length > 0
          ? g.pickups.map(function (e) { return foreslåttHent[e.req.reqId]; }).filter(Boolean)[0] || null
          : null;
        marker.setIcon(makeIcon(g.pickups.length > 0, g.deliveries.length > 0, pickTime, delTime, locName, g.pickups.length, g.deliveries.length, delIsLate, suggestedPickTime));
        if (marker.getTooltip()) marker.setTooltipContent(groupTooltip(g));
      }

      function renderBookings(filtered) {
        currentFiltered = filtered;
        currentMarkerLayers.forEach(function (l) { map.removeLayer(l); });
        currentMarkerLayers = [];
        if (routeControl) { routeControl.remove(); routeControl = null; }
        setRouteInfo(null);
        currentAllLL = [];
        currentWaypoints = [];
        currentWaypointMeta = [];
        markersByKey = {};
        groupsByKey = {};

        const groups = {};
        filtered.forEach(function (req) {
          function addToGroup(stop, isPickup) {
            const k = coordKey(stop.lat, stop.lon);
            if (!groups[k]) groups[k] = { lat: stop.lat, lon: stop.lon, pickups: [], deliveries: [] };
            (isPickup ? groups[k].pickups : groups[k].deliveries).push({ req, stop });
          }
          if (req.hentested)     addToGroup(req.hentested, true);
          if (req.leveringssted) addToGroup(req.leveringssted, false);
        });

        const timedStops = [];
        filtered.forEach(function (req) {
          const est = estimertLev[req.reqId];
          const isRetur = returReqs.some(function(r) { return r.reqId === req.reqId; });
          if (req.hentested)     timedStops.push({ lat: req.hentested.lat,     lon: req.hentested.lon,     t: req.pasientKlar  || '',                          reqId: req.reqId, isReturDel: false });
          if (req.leveringssted) timedStops.push({ lat: req.leveringssted.lat, lon: req.leveringssted.lon, t: est ? est.sortKey : (req.oppmote || ''), reqId: req.reqId, isReturDel: isRetur });
        });
        timedStops.sort(function (a, b) { return a.t.localeCompare(b.t); });
        let _prevKey = null;
        timedStops.filter(function (s) { return validLL(s); }).forEach(function (s) {
          const k = s.lat.toFixed(5) + ',' + s.lon.toFixed(5);
          if (k !== _prevKey) { currentWaypoints.push(L.latLng(s.lat, s.lon)); currentWaypointMeta.push({ reqId: s.reqId, isReturDel: s.isReturDel }); _prevKey = k; }
        });

        Object.values(groups).forEach(function (g) {
          const ll = [g.lat, g.lon];
          const k = coordKey(g.lat, g.lon);
          currentAllLL.push(ll);
          const pickTime  = earliestTime(g.pickups, 'pasientKlar');
          const delTime   = deliveryTime(g.deliveries);
          const delIsLate = deliveryIsLate(g.deliveries);
          const firstStop = (g.pickups[0] || g.deliveries[0]).stop;
          const locName = firstStop.navn || firstStop.adresse.split(',')[0] || '';
          const groupReqIds = g.pickups.concat(g.deliveries).map(function (e) { return e.req.reqId; })
            .filter(function (id, i, arr) { return arr.indexOf(id) === i; });
          const suggestedPickTime = g.pickups.length > 0
            ? g.pickups.map(function (e) { return foreslåttHent[e.req.reqId]; }).filter(Boolean)[0] || null
            : null;
          const marker = L.marker(ll, { icon: makeIcon(g.pickups.length > 0, g.deliveries.length > 0, pickTime, delTime, locName, g.pickups.length, g.deliveries.length, delIsLate, suggestedPickTime) })
            .addTo(map)
            .bindTooltip(groupTooltip(g), { direction: 'top', offset: [0, -8] });
          if (reqDetails.length > 1) {
            marker.on('click', function (e) {
              L.DomEvent.stopPropagation(e);
              activeHighlight = groupReqIds;
              filterPanel.style.display = 'block';
              applyRowStyles();
              const firstRow = filterRows[groupReqIds[0]];
              if (firstRow) firstRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
          }
          markersByKey[k] = marker;
          groupsByKey[k] = g;
          currentMarkerLayers.push(marker);
        });

        resetFerjeMarkers();
        if (routeOn && currentWaypoints.length >= 2) {
          drawRoute();
        } else {
          if (currentAllLL.length === 1)     map.setView(currentAllLL[0], 14);
          else if (currentAllLL.length > 1)  map.fitBounds(currentAllLL, { padding: [50, 50] });
        }

        updateStatus(filtered);
      }

      function drawRoute(isRedraw) {
        if (!routeOn || currentWaypoints.length < 2) return;

        const fallback = function () {
          const poly = L.polyline(currentWaypoints.map(function (w) { return [w.lat, w.lng]; }),
            { color: '#047CA1', weight: 3, opacity: 0.65, dashArray: '8,6' }).addTo(map);
          routeControl = { remove: function () { map.removeLayer(poly); } };
          if (currentAllLL.length === 1) map.setView(currentAllLL[0], 14);
          else if (currentAllLL.length > 1) map.fitBounds(currentAllLL, { padding: [50, 50] });
        };

        function applyLegs(legs, totalDist, totalDur) {
          const polys = [];
          legs.forEach(function (leg) {
            const poly = L.polyline(leg.latlngs, { color: '#047CA1', weight: 4, opacity: 0.7 }).addTo(map);
            poly.on('mouseover', function () { this.setStyle({ weight: 6, opacity: 1 }); });
            poly.on('mouseout',  function () { this.setStyle({ weight: 4, opacity: 0.7 }); });
            poly.bindTooltip('🛣 ' + formatDist(leg.dist) + '  ·  ⏱ ca. ' + formatTime(leg.dur),
              { sticky: true });
            polys.push(poly);
          });
          routeControl = { remove: function () { polys.forEach(function (p) { map.removeLayer(p); }); } };
          setRouteInfo('🛣 ' + formatDist(totalDist) + ' · ⏱ ca. ' + formatTime(totalDur));
          // Oppdater leveringstider for returer: beregn kjøretid fra hentestedet til leveringsstedet
          // langs den faktiske ruten. Pre-beregn kumulativ kjøretid fra rutestart til hvert veipunkt,
          // finn nærmeste veipunkt til hvert hentested, og trekk fra – uavhengig av om det er
          // mellomliggende leveringer (f.eks. retur Meråker→Frøya via levering i Trondheim).
          const _cumSecAtWp = [0];
          legs.forEach(function(leg, i) { _cumSecAtWp.push(_cumSecAtWp[i] + leg.dur); });
          const _returPickupSec = {};
          currentFiltered.filter(function(req) {
            return returReqs.some(function(r) { return r.reqId === req.reqId; });
          }).forEach(function(req) {
            if (!validLL(req.hentested)) return;
            let closestIdx = 0, closestDist = Infinity;
            currentWaypoints.forEach(function(wp, idx) {
              const d = haversine({ lat: wp.lat, lon: wp.lng }, req.hentested);
              if (d < closestDist) { closestDist = d; closestIdx = idx; }
            });
            _returPickupSec[req.reqId] = _cumSecAtWp[closestIdx];
          });
          legs.forEach(function(leg, i) {
            const _meta = currentWaypointMeta[i + 1];
            if (!_meta || !_meta.isReturDel) return;
            const _req = currentFiltered.find(function(r) { return r.reqId === _meta.reqId; });
            if (!_req || !validLL(_req.leveringssted)) return;
            const _klarMin = parseMin(_req.pasientKlar);
            if (_klarMin === null) return;
            const _fromPickupSec = _cumSecAtWp[i + 1] - (_returPickupSec[_meta.reqId] || 0);
            const _delivMin = _klarMin + Math.round(Math.max(0, _fromPickupSec) / 60) + 5;
            const _dateStr = (_req.pasientKlar || '').split(' ')[0];
            estimertLev[_meta.reqId] = { sortKey: _dateStr + ' ' + minToSortStr(_delivMin), display: '~' + minToStr(_delivMin), isLate: false };
            refreshMarker(coordKey(_req.leveringssted.lat, _req.leveringssted.lon));
          });
          // For flere retur-bestillinger: sjekk om oppdaterte leveringstider gir bedre rekkefølge.
          // Hvis ja, tegn ruten på nytt én gang med korrekte veipunkter.
          if (!isRedraw && returReqs.length >= 2) {
            const _newTimedStops = [];
            currentFiltered.forEach(function (req) {
              const _est = estimertLev[req.reqId];
              const _isRetur = returReqs.some(function(r) { return r.reqId === req.reqId; });
              if (req.hentested)     _newTimedStops.push({ lat: req.hentested.lat, lon: req.hentested.lon, t: req.pasientKlar || '', reqId: req.reqId, isReturDel: false });
              if (req.leveringssted) _newTimedStops.push({ lat: req.leveringssted.lat, lon: req.leveringssted.lon, t: _est ? _est.sortKey : (req.oppmote || ''), reqId: req.reqId, isReturDel: _isRetur });
            });
            _newTimedStops.sort(function (a, b) { return a.t.localeCompare(b.t); });
            const _newWps = [], _newMeta = [];
            let _prevK2 = null;
            _newTimedStops.filter(function(s) { return validLL(s); }).forEach(function(s) {
              const k = s.lat.toFixed(5) + ',' + s.lon.toFixed(5);
              if (k !== _prevK2) { _newWps.push(L.latLng(s.lat, s.lon)); _newMeta.push({ reqId: s.reqId, isReturDel: s.isReturDel }); _prevK2 = k; }
            });
            const _orderChanged = _newWps.length !== currentWaypoints.length ||
              _newWps.some(function(wp, i) {
                return Math.abs(wp.lat - currentWaypoints[i].lat) > 0.00001 ||
                       Math.abs(wp.lng - currentWaypoints[i].lng) > 0.00001;
              });
            if (_orderChanged) {
              currentWaypoints = _newWps;
              currentWaypointMeta = _newMeta;
              if (routeControl) { routeControl.remove(); routeControl = null; }
              setRouteInfo(null);
              drawRoute(true);
              return;
            }
          }
          let bounds = polys[0].getBounds();
          for (let i = 1; i < polys.length; i++) bounds.extend(polys[i].getBounds());
          map.fitBounds(bounds, { padding: [50, 50] });
          sjekkFerger(legs, polys);
        }

        function routeViaOsrm() {
          const coords = currentWaypoints.map(function (w) { return w.lng + ',' + w.lat; }).join(';');
          fetch('https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson&steps=true', {
            signal: AbortSignal.timeout(10000)
          })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            const route = data.routes && data.routes[0];
            if (!route) { fallback(); return; }
            const legs = route.legs.map(function (leg) {
              const latlngs = [];
              const steps = leg.steps.map(function (step) {
                const sl = step.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
                sl.forEach(function (pt) { latlngs.push(pt); });
                return { latlngs: sl, dur: step.duration };
              });
              return { latlngs: latlngs, dist: leg.distance, dur: leg.duration, steps: steps };
            });
            applyLegs(legs, route.distance, route.duration);
          })
          .catch(function () { fallback(); });
        }

        if (!${orsEnabled}) { routeViaOsrm(); return; }

        const coords = currentWaypoints.map(function (w) { return [w.lng, w.lat]; });
        fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': '${ORS_API_KEY}' },
            body: JSON.stringify({ coordinates: coords }),
            signal: AbortSignal.timeout(10000)
          })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            const feature = data.features && data.features[0];
            if (!feature) { routeViaOsrm(); return; }
            const allCoords = feature.geometry.coordinates;
            const wayPts = feature.properties.way_points;
            const legs = feature.properties.segments.map(function (seg, i) {
              const sliced = allCoords.slice(wayPts[i], wayPts[i + 1] + 1);
              const steps = (seg.steps || []).map(function (step) {
                const sc = allCoords.slice(step.way_points[0], step.way_points[1] + 1);
                return { latlngs: sc.map(function (c) { return [c[1], c[0]]; }), dur: step.duration };
              });
              return { latlngs: sliced.map(function (c) { return [c[1], c[0]]; }), dist: seg.distance, dur: seg.duration, steps: steps };
            });
            applyLegs(legs, feature.properties.summary.distance, feature.properties.summary.duration);
          })
          .catch(function () { routeViaOsrm(); });
      }

      function removeRoute() {
        if (routeControl) { routeControl.remove(); routeControl = null; }
        setRouteInfo(null);
        resetFerjeMarkers();
      }

      function sjekkFerger(legs, polys) {
        const RADIUS_M = 400;

        let startTid = null, startDato = null;
        if (currentFiltered.length) {
          const tider = currentFiltered.map(function (r) { return r.pasientKlar || ''; }).filter(Boolean).sort();
          if (tider.length) {
            const deler = tider[0].split(' ');
            startDato = deler[0];
            const tp = (deler[1] || '').split(':');
            if (tp.length >= 2) startTid = parseInt(tp[0], 10) * 60 + parseInt(tp[1], 10);
          }
        }

        const flatPts = [];
        legs.forEach(function (leg) {
          leg.latlngs.forEach(function (pt) {
            flatPts.push({ lat: pt[0], lon: pt[1] });
          });
        });

        function parseDatoStr(s) {
          const m = s && s.match(/^(\\d{2})\\.(\\d{2})\\.(\\d{4})$/);
          return m ? new Date(m[3] + '-' + m[2] + '-' + m[1]) : new Date(s);
        }
        const _datoObj = startDato ? parseDatoStr(startDato) : new Date();
        const dagNr = _datoObj.getDay();
        const dagKey = dagNr === 0 ? 'son' : dagNr === 6 ? 'lor' : 'man-fre';

        function computeTiming(leie, ankomstMin) {
          const avganger = leie.avganger[dagKey] || leie.avganger['man-fre'];
          if (!avganger) return null;
          const sortert = avganger.slice().sort(function (a, b) { return tidMin(a) - tidMin(b); });
          let etterIdx = sortert.length;
          for (let i = 0; i < sortert.length; i++) {
            if (tidMin(sortert[i]) >= ankomstMin) { etterIdx = i; break; }
          }
          const relevante = sortert.slice(Math.max(0, etterIdx - 1), Math.min(sortert.length, etterIdx + 2));
          const nesteIdx = relevante.findIndex(function (a) { return tidMin(a) >= ankomstMin; });
          const neste = nesteIdx >= 0 ? relevante[nesteIdx] : (relevante.length ? relevante[relevante.length - 1] : null);
          return { relevante: relevante, nesteIdx: nesteIdx, neste: neste };
        }

        // Påstigningssiden: vis rutetabell med fremhevet avgang; returnerer neste avgangstidspunkt i minutter eller null
        function visLeieBording(leie, fm, ankomstMin) {
          if (!map.hasLayer(fm)) fm.addTo(map);
          fm.setIcon(makeFerjeIcon(leie, null));
          fm.setTooltipContent(ferjeTooltipDefault(leie, dagKey));
          if (ankomstMin === null) return null;
          const timing = computeTiming(leie, ankomstMin);
          if (!timing) return null;
          if (timing.nesteIdx === -1) return null;

          const neste = timing.neste;
          const timeInfo = neste
            ? { avgang: Array.isArray(neste) ? neste[0] : neste }
            : null;
          fm.setIcon(makeFerjeIcon(leie, timeInfo));
          fm.setTooltipContent(ferjeTooltipMedRute(leie, ankomstMin, timing.relevante, timing.nesteIdx));
          return neste !== null ? tidMin(neste) : null;
        }

        // Avstigningssiden: vis kun estimert ankomsttid (ingen rutetabell)
        function visLeieAnkomst(leie, fm, ankomstMin) {
          if (!map.hasLayer(fm)) fm.addTo(map);
          const timeStr = '~' + minTil(ankomstMin);
          fm.setIcon(makeFerjeIcon(leie, { avgang: timeStr, ankomst: null }));
          fm.setTooltipContent('<b>⛴ ' + leie.navn + '</b><br>Est. fremme: <b>' + timeStr + '</b>');
        }

        function sjekkLeveringViaFerge(boardLeie, boardFm, exitLeie, crossingMin, nesteAvgangMin, boardAnkomstMin, bookings, boardFirstIdx) {
          const VENT_GRENSE = 20;
          const kandidater = bookings.filter(function (b) {
            if (!validLL(b.leveringssted) || parseMin(b.oppmote) === null) return false;
            let closestDelIdx = 0, closestDelDist = Infinity;
            flatPts.forEach(function (p, i) {
              const d = haversine({ lat: p.lat, lon: p.lon }, b.leveringssted);
              if (d < closestDelDist) { closestDelDist = d; closestDelIdx = i; }
            });
            if (closestDelIdx < boardFirstIdx) return false;
            // Utelat bestillinger der leveringssted er nær påstigningskaien – disse er på boardingsiden og krysser ikke fergen
            if (haversine(b.leveringssted, { lat: boardLeie.lat, lon: boardLeie.lon }) <= RADIUS_M) return false;
            // Utelat bestillinger der hentestedet er etter fergen – de krysser ikke fergen.
            // Unntak: hentested nær selve påstigningskaien krysser alltid fergen, uavhengig av ruteindeks.
            if (validLL(b.hentested) && haversine(b.hentested, { lat: boardLeie.lat, lon: boardLeie.lon }) > RADIUS_M) {
              let closestHentIdx = 0, closestHentDist = Infinity;
              flatPts.forEach(function (p, i) {
                const d = haversine({ lat: p.lat, lon: p.lon }, b.hentested);
                if (d < closestHentDist) { closestHentDist = d; closestHentIdx = i; }
              });
              if (closestHentIdx > boardFirstIdx) return false;
            }
            return true;
          });
          if (!kandidater.length) return;

          // Forrige avgangstid – basis for å beregne nødvendig forkorting av hentetiden
          const boardAvgSortert = ((boardLeie.avganger[dagKey] || boardLeie.avganger['man-fre']) || [])
            .slice().sort(function (a, b) { return tidMin(a) - tidMin(b); });
          const prevBoardAvgang = boardAvgSortert.filter(function (a) { return tidMin(a) < nesteAvgangMin; }).pop() || null;
          const prevAvgangMin = prevBoardAvgang !== null ? tidMin(prevBoardAvgang) : null;
          const minutterTidligere = prevAvgangMin !== null ? boardAnkomstMin - (prevAvgangMin - 10) : null;

          // Fase 1: individuelle kall – exit→levering (for sortering) + hentested→board (ventetid for returer)
          Promise.all(kandidater.map(function (b) {
            const klarMin = parseMin(b.pasientKlar);
            const oppmoteMin = parseMin(b.oppmote);
            const erRetur = klarMin !== null && oppmoteMin <= klarMin;
            const delFetch = fetchSegmentDuration(exitLeie.lon, exitLeie.lat, b.leveringssted.lon, b.leveringssted.lat)
              .catch(function () { return null; });
            if (erRetur && validLL(b.hentested)) {
              const boardFetch = fetchSegmentDuration(b.hentested.lon, b.hentested.lat, boardLeie.lon, boardLeie.lat)
                .catch(function () { return null; });
              return Promise.all([delFetch, boardFetch]).then(function (both) {
                return { b: b, indivSec: both[0], boardSec: both[1], erRetur: erRetur };
              });
            }
            return delFetch.then(function (sec) {
              return { b: b, indivSec: sec, boardSec: null, erRetur: erRetur };
            });
          })).then(function (phase1) {
            // Del opp og sorter nærmest-først (naturlig sekvensiell leveringsrekkefølge)
            const forwards = phase1.filter(function (r) { return !r.erRetur && r.indivSec !== null; });
            const returs   = phase1.filter(function (r) { return  r.erRetur && r.indivSec !== null; });
            forwards.sort(function (a, b) { return a.indivSec - b.indivSec; });
            returs.sort(function (a, b) { return a.indivSec - b.indivSec; });

            // Fase 2: flerstopps-rute for kumulative leveringstider
            // Én stopp → gjenbruk individuell tid (ingen ekstra kall). Flere stopp → ett kjedet kall.
            function chainFetch(sorted) {
              if (!sorted.length) return Promise.resolve([]);
              if (sorted.length === 1) return Promise.resolve([sorted[0].indivSec]);
              const points = [[exitLeie.lon, exitLeie.lat]]
                .concat(sorted.map(function (r) { return [r.b.leveringssted.lon, r.b.leveringssted.lat]; }));
              const fallback = sorted.map(function (r) { return r.indivSec; });
              return fetchChainDurations(points, fallback);
            }

            Promise.all([chainFetch(forwards), chainFetch(returs)]).then(function (chains) {
              const forwardSecs = chains[0];
              const returSecs   = chains[1];
              const advarsler = [];
              let maxDiff = 0;
              let maxVentMin = 0;

              forwards.forEach(function (r, i) {
                const cumSec = forwardSecs[i];
                if (cumSec === null) return;
                const estimertMin = nesteAvgangMin + crossingMin + Math.round(cumSec / 60);
                const dateStr = (r.b.oppmote || '').split(' ')[0];
                const oppmoteMin = parseMin(r.b.oppmote);
                const diff = oppmoteMin !== null ? estimertMin - oppmoteMin : 0;
                estimertLev[r.b.reqId] = { sortKey: dateStr + ' ' + minTil(estimertMin), display: '~' + minTil(estimertMin), isLate: diff > 0 };
                refreshMarker(coordKey(r.b.leveringssted.lat, r.b.leveringssted.lon));
                if (diff > 0) {
                  maxDiff = Math.max(maxDiff, diff);
                  advarsler.push('<span style="color:#c62828;font-size:11px">⚠️ ' + (r.b.pasientNavn || '?') +
                    ': levering ~' + minTil(estimertMin) + ' (<b>' + diff + ' min for sent</b>, oppmøte ' + minTil(oppmoteMin) + ')</span>');
                  if (minutterTidligere !== null && minutterTidligere > 0 && validLL(r.b.hentested)) {
                    const hKlarMin = parseMin(r.b.pasientKlar);
                    if (hKlarMin !== null) {
                      foreslåttHent[r.b.reqId] = minTil(hKlarMin - minutterTidligere);
                      refreshMarker(coordKey(r.b.hentested.lat, r.b.hentested.lon));
                    }
                  }
                }
              });

              returs.forEach(function (r, i) {
                const cumSec = returSecs[i];
                if (cumSec === null) return;
                const estimertMin = nesteAvgangMin + crossingMin + Math.round(cumSec / 60);
                const klarMin = parseMin(r.b.pasientKlar);
                const dateStr = (r.b.pasientKlar || r.b.oppmote || '').split(' ')[0];
                estimertLev[r.b.reqId] = { sortKey: dateStr + ' ' + minTil(estimertMin), display: '~' + minTil(estimertMin), isLate: false };
                refreshMarker(coordKey(r.b.leveringssted.lat, r.b.leveringssted.lon));
                if (r.boardSec !== null && klarMin !== null) {
                  const ankomstFerjeMin = klarMin + Math.round(r.boardSec / 60);
                  const ventMin = nesteAvgangMin - ankomstFerjeMin;
                  if (ventMin > VENT_GRENSE) maxVentMin = Math.max(maxVentMin, ventMin);
                }
              });

              if (!advarsler.length && maxVentMin === 0) return;
              const tooltip = boardFm.getTooltip();
              if (!tooltip) return;
              const alleLinjer = advarsler.slice();
              if (advarsler.length) {
                boardFm.setIcon(makeFerjeIcon(boardLeie, { avgang: minTil(nesteAvgangMin) }, '⚠️ ' + maxDiff + 'min'));
                if (minutterTidligere !== null && minutterTidligere > 0) {
                  alleLinjer.push('<span style="color:#e65100;font-size:11px">⬆ Hent <b>' + minutterTidligere + ' min</b> tidligere → rekker ' + minTil(prevAvgangMin) + '-fergen</span>');
                }
              } else if (maxVentMin > 0) {
                boardFm.setIcon(makeFerjeIcon(boardLeie, { avgang: minTil(nesteAvgangMin) }, '⏱ ' + maxVentMin + 'min', '#e65100'));
                alleLinjer.push('<span style="color:#e65100;font-size:11px">⏱ Ankommer ~' + maxVentMin + ' min før neste avgang</span>');
              }
              boardFm.setTooltipContent((tooltip.getContent() || '') +
                '<hr style="border:none;border-top:1px solid #bbdefb;margin:4px 0">' + alleLinjer.join('<br>'));
            });
          });
        }

        function findLegIdx(flatIdx) {
          let off = 0;
          for (let li = 0; li < legs.length; li++) {
            if (off + legs[li].latlngs.length > flatIdx) return li;
            off += legs[li].latlngs.length;
          }
          return legs.length - 1;
        }

        // Indekser i flatPts som allerede tilhører en detektert fergepassering.
        // Hindrer at en pier som deles mellom to ferger (f.eks. Hofles) plukkes opp
        // av feil ferge ved kombinerte ruter med flere fergepasseringer.
        const _claimedIdx = new Set();

        function splitPolyAtFerry(boardFlatIdx, exitFlatIdx, crossingMin, boardLat, boardLon, exitLat, exitLon) {
          function closestIdx(nearFlat, pierLat, pierLon) {
            const SEARCH = 80;
            let best = nearFlat, bestDist = Infinity;
            for (let i = Math.max(0, nearFlat - SEARCH); i < Math.min(flatPts.length, nearFlat + SEARCH); i++) {
              const d = haversine({ lat: flatPts[i].lat, lon: flatPts[i].lon }, { lat: pierLat, lon: pierLon });
              if (d < bestDist) { bestDist = d; best = i; }
            }
            return best;
          }
          function flatToLeg(targetFlat) {
            let off = 0;
            for (let li = 0; li < legs.length; li++) {
              const n = legs[li].latlngs.length;
              if (off + n > targetFlat) return { li: li, local: targetFlat - off };
              off += n;
            }
            return null;
          }
          function polyDist(latlngs) {
            let d = 0;
            for (let i = 1; i < latlngs.length; i++)
              d += haversine({ lat: latlngs[i-1][0], lon: latlngs[i-1][1] }, { lat: latlngs[i][0], lon: latlngs[i][1] });
            return d;
          }
          const boardBest = closestIdx(boardFlatIdx, boardLat, boardLon);
          const exitBest  = closestIdx(exitFlatIdx,  exitLat,  exitLon);
          const boardInfo = flatToLeg(boardBest);
          const exitInfo  = flatToLeg(exitBest);
          if (!boardInfo || !exitInfo || exitInfo.li !== boardInfo.li) return null;
          const bLeg = legs[boardInfo.li];
          const oldPoly = polys[boardInfo.li];
          if (oldPoly && map.hasLayer(oldPoly)) map.removeLayer(oldPoly);
          const preCoords  = bLeg.latlngs.slice(0, boardInfo.local + 1);
          const midCoords  = bLeg.latlngs.slice(boardInfo.local, exitInfo.local + 1);
          const postCoords = bLeg.latlngs.slice(exitInfo.local);
          const preDist  = polyDist(preCoords);
          const midDist  = polyDist(midCoords);
          const postDist = polyDist(postCoords);
          function mkSolid(latlngs, dist) {
            const p = L.polyline(latlngs, { color: '#047CA1', weight: 4, opacity: 0.7 }).addTo(map);
            p.on('mouseover', function () { this.setStyle({ weight: 6, opacity: 1 }); });
            p.on('mouseout',  function () { this.setStyle({ weight: 4, opacity: 0.7 }); });
            p.bindTooltip('🛣 ' + formatDist(dist), { sticky: true });
            return p;
          }
          const prePoly = preCoords.length >= 2 ? mkSolid(preCoords, preDist) : null;
          polys[boardInfo.li] = prePoly;
          if (midCoords.length >= 2) {
            const midPoly = L.polyline(midCoords, { color: '#047CA1', weight: 4, opacity: 0.5, dashArray: '8,6' }).addTo(map);
            midPoly.on('mouseover', function () { this.setStyle({ weight: 6, opacity: 0.8 }); });
            midPoly.on('mouseout',  function () { this.setStyle({ weight: 4, opacity: 0.5 }); });
            midPoly.bindTooltip('⛴ ' + formatDist(midDist) + '  ·  ⏱ ca. ' + formatTime(crossingMin * 60), { sticky: true });
            polys.push(midPoly);
          }
          const postPoly = postCoords.length >= 2 ? mkSolid(postCoords, postDist) : null;
          if (postPoly) polys.push(postPoly);
          return { prePoly: prePoly, preDist: preDist, postPoly: postPoly, postDist: postDist, legIdx: boardInfo.li };
        }

        FERGER.forEach(function (ferge) {
          // Finn leier som er nær rutelinjen, ignorer allerede-krevde indekser
          const detectedLeier = [];
          ferge.leier.forEach(function (leie) {
            let firstIdx = Infinity;
            flatPts.forEach(function (p, ptIdx) {
              if (!_claimedIdx.has(ptIdx) && haversine({ lat: p.lat, lon: p.lon }, { lat: leie.lat, lon: leie.lon }) <= RADIUS_M && ptIdx < firstIdx)
                firstIdx = ptIdx;
            });
            if (firstIdx < Infinity) detectedLeier.push({ leie: leie, firstIdx: firstIdx });
          });
          if (!detectedLeier.length) return;

          if (ferge.crossing_min && detectedLeier.length === 2) {
            // Retningssensitiv: leiet som opptrer først i ruten er påstigningssiden
            detectedLeier.sort(function (a, b) { return a.firstIdx - b.firstIdx; });
            // Krev ruteindeksene mellom de to leiene så ingen annen ferge tar samme segment
            for (let _ci = detectedLeier[0].firstIdx; _ci <= detectedLeier[1].firstIdx; _ci++) _claimedIdx.add(_ci);
            const board = detectedLeier[0].leie, exit = detectedLeier[1].leie;
            const boardFm = ferjeMarkers[board.navn], exitFm = ferjeMarkers[exit.navn];
            if (boardFm) { if (!map.hasLayer(boardFm)) boardFm.addTo(map); boardFm.setIcon(makeFerjeIcon(board, null)); boardFm.setTooltipContent(ferjeTooltipDefault(board, dagKey)); }
            if (exitFm)  { if (!map.hasLayer(exitFm))  exitFm.addTo(map);  exitFm.setIcon(makeFerjeIcon(exit, null));   exitFm.setTooltipContent(ferjeTooltipDefault(exit, dagKey)); }
            const postExitPolyInfo = splitPolyAtFerry(detectedLeier[0].firstIdx, detectedLeier[1].firstIdx, ferge.crossing_min, board.lat, board.lon, exit.lat, exit.lon);
            if (startTid !== null && boardFm) {
              const _legIdx = postExitPolyInfo ? postExitPolyInfo.legIdx : findLegIdx(detectedLeier[0].firstIdx);
              const _cumSec = legs.slice(0, _legIdx).reduce(function (s, l) { return s + l.dur; }, 0);
              const _legStart = legs[_legIdx].latlngs[0];
              fetchSegmentDuration(_legStart[1], _legStart[0], board.lon, board.lat).then(function (preSec) {
                const _preSec = preSec !== null ? preSec : legs[_legIdx].dur;
                const boardAnkomstMin = Math.round(startTid + (_cumSec + _preSec) / 60);
                if (postExitPolyInfo && postExitPolyInfo.prePoly)
                  postExitPolyInfo.prePoly.setTooltipContent('🛣 ' + formatDist(postExitPolyInfo.preDist) + '  ·  ⏱ ca. ' + formatTime(_preSec));
                const nesteAvgangMin = visLeieBording(board, boardFm, boardAnkomstMin);
                if (exitFm && nesteAvgangMin !== null) {
                  visLeieAnkomst(exit, exitFm, nesteAvgangMin + ferge.crossing_min);
                  const _legEnd = currentWaypoints[_legIdx + 1];
                  if (postExitPolyInfo && postExitPolyInfo.postPoly && _legEnd) {
                    fetchSegmentDuration(exit.lon, exit.lat, _legEnd.lng, _legEnd.lat).then(function (sec) {
                      if (sec !== null)
                        postExitPolyInfo.postPoly.setTooltipContent('🛣 ' + formatDist(postExitPolyInfo.postDist) + '  ·  ⏱ ca. ' + formatTime(sec));
                    });
                  }
                  sjekkLeveringViaFerge(board, boardFm, exit, ferge.crossing_min, nesteAvgangMin, boardAnkomstMin, currentFiltered, detectedLeier[0].firstIdx);
                } else if (nesteAvgangMin === null) {
                  const boardAvg = board.avganger[dagKey] || board.avganger['man-fre'];
                  if (boardAvg && boardAvg.length) {
                    const sisteAvgMinBoard = Math.max.apply(null, boardAvg.map(function (a) { return tidMin(a); }));
                    if (boardAnkomstMin > sisteAvgMinBoard) {
                      boardFm.setIcon(makeFerjeIcon(board, null, '🚫 Siste ferge'));
                      boardFm.setTooltipContent(ferjeTooltipDefault(board, dagKey) + '<br>' +
                        '<span style="color:#888;font-size:12px">Est. ankomst: <b>' + minTil(boardAnkomstMin) + '</b></span><br>' +
                        '<span style="color:#c62828;font-weight:700">⚠️ Siste ferge fra ' + board.navn + ' kl. ' + minTil(sisteAvgMinBoard) + ' – nås ikke</span><br>' +
                        '<span style="color:#888;font-size:11px">Ingen fergeberegning – planlegg manuelt</span>');
                    }
                  }
                }
              });
            }
          } else if (!ferge.crossing_min) {
            // Ingen overfartstid definert: vis leier som er nær ruten
            detectedLeier.forEach(function (item) {
              const fm = ferjeMarkers[item.leie.navn];
              if (!fm) return;
              if (!map.hasLayer(fm)) fm.addTo(map);
              fm.setIcon(makeFerjeIcon(item.leie, null));
              fm.setTooltipContent(ferjeTooltipDefault(item.leie, dagKey));
              if (startTid === null) return;
              const _li2 = findLegIdx(item.firstIdx);
              const _cum2 = legs.slice(0, _li2).reduce(function (s, l) { return s + l.dur; }, 0);
              const _ls2 = legs[_li2].latlngs[0];
              fetchSegmentDuration(_ls2[1], _ls2[0], item.leie.lon, item.leie.lat).then(function (sec) {
                const _pre2 = sec !== null ? sec : legs[_li2].dur;
                visLeieBording(item.leie, fm, Math.round(startTid + (_cum2 + _pre2) / 60));
              });
            });
          }
        });
      }

      function updateStatus(filtered) {
        const n = filtered.length, total = reqDetails.length;
        let text = n + ' bestilling' + (n !== 1 ? 'er' : '');
        if (n < total) text += ' av ' + total;
        if (luftlinjeFallback) text += ' · ⚠️ Lev.tid: luftlinje (rutingstjeneste svarte ikke)';
        if (total > 1) text += ' ▾';
        document.getElementById('status').textContent = text;
      }

      // ── Filterpanel ──────────────────────────────────────────
      const framme = reqDetails.filter(function (r) { return r.erFramme; });
      const aktive = reqDetails.filter(function (r) { return !r.erFramme; });
      let activeFilter = aktive.map(function (r) { return r.reqId; });

      const filterPanel = document.createElement('div');
      filterPanel.style.cssText =
        'position:fixed;top:48px;right:12px;background:#fff;border:1px solid #ccc;' +
        'border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);padding:10px 14px;' +
        'z-index:1000;min-width:200px;max-height:70vh;overflow-y:auto;display:none;font-size:13px;';

      const filterTitle = document.createElement('div');
      filterTitle.style.cssText = 'font-weight:600;margin-bottom:8px;color:#333;';
      filterTitle.textContent = 'Bestillinger';
      filterPanel.appendChild(filterTitle);

      function kortSted(loc) {
        if (!loc) return '';
        const hoved = loc.navn || loc.adresse.split(',')[0] || '';
        return hoved + (loc.poststed ? ', ' + loc.poststed : '');
      }

      function applyBtnLabel(n, total) {
        const word = total === 1 ? ' bestilling' : ' bestillinger';
        return n === total ? 'Vis alle ' + total + word : 'Vis ' + n + ' av ' + total;
      }

      const filterRows = {};
      const filterCbs = {};
      let activeHighlight = [];

      const sortedForFilter = reqDetails.slice().sort(function (a, b) {
        const tA = (a.pasientKlar || '').split(' ')[1] || '';
        const tB = (b.pasientKlar || '').split(' ')[1] || '';
        return tA.localeCompare(tB);
      });

      sortedForFilter.forEach(function (req, rowIdx) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:6px;margin-bottom:2px;cursor:pointer;padding:4px 5px;border-radius:3px;border-left:3px solid transparent;';
        filterRows[req.reqId] = row;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !req.erFramme;
        cb.style.marginTop = '2px';
        filterCbs[req.reqId] = cb;
        cb.addEventListener('change', function () {
          if (cb.checked) {
            if (!activeFilter.includes(req.reqId)) activeFilter.push(req.reqId);
          } else {
            activeFilter = activeFilter.filter(function (id) { return id !== req.reqId; });
          }
          const n = activeFilter.length;
          applyBtn.textContent = applyBtnLabel(n, reqDetails.length);
          applyBtn.disabled = n === 0;
          applyBtn.style.opacity = n === 0 ? '0.45' : '1';
          applyBtn.style.cursor  = n === 0 ? 'default' : 'pointer';
        });

        const fra = trunc(kortSted(req.hentested), 30);
        const til = trunc(kortSted(req.leveringssted), 30);
        const hentTid = (req.pasientKlar || '').split(' ')[1] || '';
        const levTid  = (req.oppmote    || '').split(' ')[1] || '';
        const tidDel  = hentTid ? hentTid + (levTid ? '–' + levTid : '') : levTid;

        const txt = document.createElement('span');
        txt.style.lineHeight = '1.3';
        const rute = [fra, til].filter(Boolean).join(' → ');
        txt.textContent = (tidDel ? tidDel + ' · ' : '') + rute;

        row.appendChild(cb);
        row.appendChild(txt);
        filterPanel.appendChild(row);
      });

      const applyBtn = document.createElement('button');
      applyBtn.textContent = applyBtnLabel(aktive.length, reqDetails.length);
      applyBtn.style.cssText =
        'margin-top:6px;width:100%;padding:6px;background:#025671;color:#fff;' +
        'border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:13px;';
      applyBtn.addEventListener('click', function () {
        filterPanel.style.display = 'none';
        activeHighlight = [];
        applyRowStyles();
        renderBookings(reqDetails.filter(function (r) { return activeFilter.includes(r.reqId); }));
      });
      filterPanel.appendChild(applyBtn);

      function applyRowStyles() {
        sortedForFilter.forEach(function (req, idx) {
          const r = filterRows[req.reqId];
          if (!r) return;
          if (activeHighlight.indexOf(req.reqId) !== -1) {
            r.style.background = '#fff3cd';
            r.style.borderLeftColor = '#e6820a';
          } else {
            r.style.background = idx % 2 === 0 ? '#f0f4f8' : '';
            r.style.borderLeftColor = 'transparent';
          }
        });
      }
      applyRowStyles();

      document.body.appendChild(filterPanel);

      const statusEl = document.getElementById('status');
      if (reqDetails.length > 1) {
        statusEl.style.cursor = 'pointer';
        statusEl.title = 'Klikk for å filtrere bestillinger';
        statusEl.addEventListener('click', function () {
          const isOpening = filterPanel.style.display === 'none';
          filterPanel.style.display = isOpening ? 'block' : 'none';
          if (!isOpening) { activeHighlight = []; applyRowStyles(); }
        });
      }
      map.on('click', function () {
        filterPanel.style.display = 'none';
        activeHighlight = [];
        applyRowStyles();
      });

      renderBookings(reqDetails.filter(function (r) { return activeFilter.includes(r.reqId); }));

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

      // Knapp – Framme
      const frammeBtn = document.getElementById('frammeToggleBtn');
      if (framme.length > 0) {
        frammeBtn.textContent = 'Framme (' + framme.length + ')';
        frammeBtn.style.display = '';
        frammeBtn.classList.add('av');
        frammeBtn.addEventListener('click', function () {
          const nowOff = frammeBtn.classList.contains('av');
          if (nowOff) {
            framme.forEach(function (r) {
              if (!activeFilter.includes(r.reqId)) activeFilter.push(r.reqId);
              if (filterCbs[r.reqId]) filterCbs[r.reqId].checked = true;
            });
            frammeBtn.classList.remove('av');
          } else {
            const frammeSet = new Set(framme.map(function (r) { return r.reqId; }));
            activeFilter = activeFilter.filter(function (id) { return !frammeSet.has(id); });
            framme.forEach(function (r) { if (filterCbs[r.reqId]) filterCbs[r.reqId].checked = false; });
            frammeBtn.classList.add('av');
          }
          const n = activeFilter.length;
          applyBtn.textContent = applyBtnLabel(n, reqDetails.length);
          applyBtn.disabled = n === 0;
          applyBtn.style.opacity = n === 0 ? '0.45' : '1';
          applyBtn.style.cursor = n === 0 ? 'default' : 'pointer';
          renderBookings(reqDetails.filter(function (r) { return activeFilter.includes(r.reqId); }));
        });
      }
    }
  </script>
</body>
</html>`;
  }

  // ── Åpne kart-vindu ───────────────────────────────────────
  function openKartWindow(reqDetails) {
    // Finn ledig plass til venstre og høyre for NISSY-vinduet
    const spaceLeft  = window.screenX;
    const spaceRight = window.screen.availWidth - (window.screenX + window.outerWidth);
    const minWidth   = 600;
    let width, left, top, height;
    if (spaceLeft >= spaceRight && spaceLeft >= minWidth) {
      width = spaceLeft; left = 0;
      top = 0; height = window.screen.availHeight;
    } else if (spaceRight >= minWidth) {
      width = spaceRight; left = window.screenX + window.outerWidth;
      top = 0; height = window.screen.availHeight;
    } else {
      // Ikke nok plass på noen side – bruk original oppførsel
      width = Math.max(minWidth, Math.floor(window.innerWidth / 2));
      left = 0; top = 0; height = window.screen.availHeight;
    }

    // Lagre data på parent-vinduet så popup kan hente det via window.opener
    window._kartvisningData = reqDetails;

    const mapWindow = window.open(
      '', 'NissyKartvisning',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!mapWindow) {
      showError('🗺️ Popup blokkert – tillat popup og prøv igjen');
      return;
    }
    mapWindow.document.write(buildMapHtml());
    mapWindow.document.close();
  }

  // ── Hovedfunksjon ─────────────────────────────────────────
  async function visKart() {
    const voppIds = getVoppReqIds();
    const { ids: poppIds, frammeIds } = getPoppReqIds();
    const alleIds = [...new Set([...voppIds, ...poppIds])];

    if (alleIds.length === 0) {
      showError('🗺️ Ingen bestillinger er merket');
      return;
    }

    if (alleIds.length > 16) {
      showError(`🗺️ For mange bestillinger merket (${alleIds.length}/16) – maks 16 støttes. Fjern noen og prøv igjen.`);
      return;
    }

    const allDetails = await Promise.all(alleIds.map(id => fetchReqDetails(id)));
    allDetails.forEach(d => { d.erFramme = frammeIds.has(d.reqId); });

    const med  = allDetails.filter(d => d.hentested || d.leveringssted);
    const uten = allDetails.filter(d => !d.hentested && !d.leveringssted);

    if (uten.length > 0) {
      console.warn('[Kartvisning] Ingen koordinater for:', uten.map(d => d.reqId));
    }
    if (med.length === 0) {
      _toast('🗺️ Fant ingen koordinater – åpner NISSY-kart', '#888', 3000);
      _origOpen.call(window, ...(_lastMapOpenArgs || ['', '_blank', '']));
      return;
    }

    openKartWindow(med);
  }

  // ── Intercepter window.open for mapDisplay.jsp ────────────
  const _origOpen = window.open;
  let _lastMapOpenArgs = null;
  window.open = function (url, target, features) {
    if (url && url.includes('mapDisplay')) {
      _lastMapOpenArgs = [url, target, features];
      visKart();
      return null;
    }
    return _origOpen.call(this, url, target, features);
  };

  console.log('✅ Kartvisning klar – trykk Vis i kart (Alt+W) med merkede bestillinger');
})();