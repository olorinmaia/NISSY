// Zisson Click2Call – ring opp sjåfør/pasient direkte fra NISSY
// Eksponerer window.nissyZissonClickToCall(phoneNumber) og window.nissyZissonConfig()
// slik at andre script (Live-ressurskart, Ressursinfo, Sjekk-telefon m.fl.) kan
// koble på et ring-ikon uten å vite noe om Zisson-oppsettet.
//
// Brukernavn og API-token (JWT) lagres kun lokalt i denne nettleseren (localStorage).
//
// For å nullstille og tvinge på nytt oppsett, kjør følgende i konsollet:
// localStorage.removeItem('nissyZissonAgentGuid');
// localStorage.removeItem('nissyZissonDisplayName');

(function () {
  'use strict';

  if (window.__nissyZissonC2CInstalled) {
    console.warn('⚠️ Zisson Click2Call er allerede aktiv - ignorerer ny forespørsel');
    return;
  }
  window.__nissyZissonC2CInstalled = true;

  const API_BASE = 'https://app2.zisson.com/external-api/v1';

  const LS_JWT          = 'nissyZissonJwt';
  const LS_AGENT_GUID   = 'nissyZissonAgentGuid';
  const LS_DISPLAY_NAME = 'nissyZissonDisplayName'; // navn/brukernavn til valgt agent, kun for visning

  // ============================================================
  // LAGRET KONFIGURASJON
  // ============================================================
  function getJwt() {
    return localStorage.getItem(LS_JWT) || '';
  }

  function getAgentGuid() {
    return localStorage.getItem(LS_AGENT_GUID) || '';
  }

  function normalizeName(s) {
    return (s || '').toLowerCase().replace(/[^a-zæøå0-9]/g, '');
  }

  function getCurrentOfficeName() {
    const el = document.querySelector('.topframe_small');
    const m = el?.textContent.match(/Pasientreisekontor for ([^\n]+)/);
    return m?.[1]?.trim() || '';
  }

  // NISSY-kontornavn (fra getCurrentOfficeName) -> Zisson agent-group guid.
  // Brukes når kontornavnene ikke kan matches automatisk (se normalizeName).
  const OFFICE_GROUP_GUIDS = {
    'Pasientreiser Nord-Trøndelag': '805e65d0-3db5-4cf9-93c0-3c32297999a8',
  };

  async function fetchUsersAndGroups(jwt) {
    const [usersRes, groupsRes] = await Promise.all([
      fetch(`${API_BASE}/entities/users`, { headers: { 'Authorization': 'Bearer ' + jwt } }),
      fetch(`${API_BASE}/entities/agent-groups`, { headers: { 'Authorization': 'Bearer ' + jwt } })
    ]);
    if (usersRes.status === 401 || groupsRes.status === 401) throw new Error('JWT ugyldig/utløpt');
    if (!usersRes.ok) throw new Error(`Zisson API (users) ${usersRes.status}`);
    if (!groupsRes.ok) throw new Error(`Zisson API (groups) ${groupsRes.status}`);
    return { users: await usersRes.json(), groups: await groupsRes.json() };
  }

  // ============================================================
  // KONFIGURASJONSDIALOG (JWT + kontor + bruker)
  // ============================================================
  function configure() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:999998;display:flex;align-items:center;justify-content:center;';

      const box = document.createElement('div');
      box.style.cssText = 'background:white;padding:20px 24px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.3);max-width:420px;width:90%;font-family:Arial,sans-serif;font-size:13px;color:#222;';

      box.innerHTML = `
        <h3 style="margin:0 0 12px;">☎️ Zisson Click2Call - oppsett</h3>
        <label style="display:block;margin-bottom:4px;font-weight:bold;">API-token (JWT):</label>
        <input id="zc2c-jwt" type="password" style="width:100%;box-sizing:border-box;padding:6px;margin-bottom:8px;">
        <button id="zc2c-fetch" type="button" style="padding:6px 12px;margin-bottom:10px;cursor:pointer;">Hent brukerliste</button>
        <div id="zc2c-status" style="margin-bottom:10px;color:#666;"></div>
        <div id="zc2c-pickers" style="display:none;">
          <label style="display:block;margin-bottom:4px;font-weight:bold;">Kontor:</label>
          <select id="zc2c-group" style="width:100%;padding:6px;margin-bottom:8px;"></select>
          <label style="display:block;margin-bottom:4px;font-weight:bold;">Din bruker:</label>
          <select id="zc2c-user" style="width:100%;padding:6px;margin-bottom:8px;"></select>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button id="zc2c-save" type="button" style="flex:1;padding:8px;background:#4a90e2;color:white;border:none;border-radius:6px;cursor:pointer;" disabled>Lagre</button>
          <button id="zc2c-cancel" type="button" style="padding:8px 14px;background:#f5f5f5;border:1px solid #ccc;border-radius:6px;cursor:pointer;">Avbryt</button>
        </div>
      `;

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const jwtInput    = box.querySelector('#zc2c-jwt');
      const statusEl    = box.querySelector('#zc2c-status');
      const pickersEl   = box.querySelector('#zc2c-pickers');
      const groupSelect = box.querySelector('#zc2c-group');
      const userSelect  = box.querySelector('#zc2c-user');
      const saveBtn     = box.querySelector('#zc2c-save');
      const fetchBtn    = box.querySelector('#zc2c-fetch');

      jwtInput.value = getJwt();

      let usersData = [];

      function populateUsers(groupGuid) {
        userSelect.innerHTML = '';
        usersData
          .filter(u => u.groupGuid === groupGuid)
          .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'no'))
          .forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.guid;
            opt.textContent = `${u.firstName} ${u.lastName} (${u.username})`;
            userSelect.appendChild(opt);
          });
        saveBtn.disabled = userSelect.options.length === 0;
      }

      groupSelect.addEventListener('change', () => populateUsers(groupSelect.value));

      fetchBtn.addEventListener('click', async () => {
        const jwt = jwtInput.value.trim();
        if (!jwt) { statusEl.textContent = 'Lim inn JWT først.'; return; }
        statusEl.textContent = 'Henter...';
        pickersEl.style.display = 'none';
        saveBtn.disabled = true;
        try {
          const { users, groups } = await fetchUsersAndGroups(jwt);
          usersData = users;

          groupSelect.innerHTML = '';
          [...groups]
            .filter(g => g.name !== 'Default') // skjul uklar/generisk Zisson-gruppe
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'no'))
            .forEach(g => {
              const opt = document.createElement('option');
              opt.value = g.guid;
              opt.textContent = g.name || g.guid;
              groupSelect.appendChild(opt);
            });

          // Forhåndsvelg kontor basert på NISSY-sidens kontornavn
          const officeName = getCurrentOfficeName();
          const mappedGuid = OFFICE_GROUP_GUIDS[officeName];
          let match = mappedGuid && groups.find(g => g.guid === mappedGuid);
          if (!match) {
            const normalized = normalizeName(officeName);
            match = groups.find(g => normalizeName(g.name) === normalized);
          }
          if (match) groupSelect.value = match.guid;

          populateUsers(groupSelect.value);
          pickersEl.style.display = 'block';
          statusEl.textContent = `Fant ${usersData.length} brukere i ${groups.length} grupper.`;
        } catch (e) {
          statusEl.textContent = '❌ ' + e.message;
        }
      });

      box.querySelector('#zc2c-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      saveBtn.addEventListener('click', () => {
        const jwt = jwtInput.value.trim();
        const agentGuid = userSelect.value;
        const selectedUser = usersData.find(u => u.guid === agentGuid);
        if (!jwt || !agentGuid) return;

        localStorage.setItem(LS_JWT, jwt);
        localStorage.setItem(LS_AGENT_GUID, agentGuid);
        localStorage.setItem(LS_DISPLAY_NAME, selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.username})` : '');

        overlay.remove();
        resolve({ jwt, agentGuid });
      });

      // Hent automatisk hvis vi allerede har en lagret JWT
      if (jwtInput.value) fetchBtn.click();
    });
  }

  // Eksponert for manuell (re)konfigurering fra konsollet
  window.nissyZissonConfig = configure;

  // ============================================================
  // TELEFONNUMMER -> E.164 (norske numre)
  // ============================================================
  function toE164(raw) {
    let n = (raw || '').replace(/[\s().-]/g, '');
    if (n.startsWith('+')) return n;
    if (n.startsWith('00')) return '+' + n.slice(2);
    if (/^47\d{8}$/.test(n)) return '+' + n;
    if (/^\d{8}$/.test(n)) return '+47' + n;
    return n;
  }

  // ============================================================
  // TOAST-MELDING (samme stil som loader-toast)
  // ============================================================
  function showToast(message, isError) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      background: isError ? '#c0392b' : '#27ae60',
      color: '#fff', padding: '10px 20px', borderRadius: '5px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)', fontFamily: 'Arial, sans-serif',
      fontSize: '13px', zIndex: '999999', opacity: '0',
      transition: 'opacity 0.3s ease', whiteSpace: 'nowrap'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ============================================================
  // KLIKK-TIL-RING
  // ============================================================
  const RESPONSE_MESSAGES = {
    0: '📞 Ringer opp...',
    1: '❌ Fant ikke Zisson-agenten din',
    2: '❌ Ugyldig telefonnummer',
    3: '❌ Agenten er i feil status (f.eks. allerede i samtale)',
    4: '❌ Tidsavbrudd',
    5: '❌ Ukjent feil',
    6: '❌ Ikke implementert',
    7: '❌ Ugyldig avsendernummer (callerId)'
  };

  async function clickToCall(phoneNumber) {
    let jwt = getJwt();
    let agentGuid = getAgentGuid();
    if (!jwt || !agentGuid) {
      const cfg = await configure();
      if (!cfg) return;
      jwt = cfg.jwt;
      agentGuid = cfg.agentGuid;
    }

    const toNumber = toE164(phoneNumber);
    if (!confirm(`Ring ${toNumber} via Zisson?`)) return;

    try {
      const res = await fetch(`${API_BASE}/external-agent/click-to-call`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwt,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentGuid,
          toNumber,
          autoAnswer: true
        })
      });

      if (res.status === 401) {
        localStorage.removeItem(LS_JWT);
        throw new Error('JWT ugyldig/utløpt - kjør nissyZissonConfig() for å konfigurere på nytt');
      }
      if (!res.ok) throw new Error(`Zisson API ${res.status}: ${res.statusText}`);

      const data = await res.json();
      showToast(RESPONSE_MESSAGES[data.responseCode] || data.message || 'Ukjent respons', data.responseCode !== 0);
    } catch (e) {
      console.error('❌ Zisson click2call:', e);
      showToast('❌ ' + e.message, true);
    }
  }

  // Eksponert slik at andre script (og andre vinduer via window.opener) kan ringe
  window.nissyZissonClickToCall = clickToCall;

  // ============================================================
  // FELLES: RING-IKON
  // ============================================================
  function createCallIcon(phone, doc) {
    const btn = (doc || document).createElement('span');
    btn.textContent = '☎️';
    btn.title = 'Ring ' + phone + ' via Zisson';
    btn.style.cssText = 'cursor:pointer;margin-left:6px;';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      clickToCall(phone);
    });
    return btn;
  }

  // Gjenkjenner norske telefonnummer: 8 siffer, evt. med +47/0047-prefiks
  // og mellomrom/punktum/bindestrek som skilletegn (f.eks. "90 19 55 62").
  function extractPhoneFromValue(text) {
    const s = (text || '').trim();
    let digits = s.replace(/[\s().-]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('0047')) digits = digits.slice(4);
    else if (digits.length === 10 && digits.startsWith('47')) digits = digits.slice(2);
    return /^\d{8}$/.test(digits) ? s : null;
  }

  // Felt-etiketter som indikerer telefonnummer, f.eks. "Tlf:", "Mob:",
  // "Mob (2):", "Tlf fra EPJ:", "Telefonnummer sjåfør:", "Telefon:",
  // "Mobilnr (2):", "Telefon/mobilnr fra EPJ:"
  const PHONE_LABEL_RE = /(Tlf|Mob|Telefon)[\wæøåÆØÅ\s().]*:\s*$/i;

  // ============================================================
  // AUTO-INJISER RING-IKON VED [data-phone] I DENNE DOKUMENTET
  // ============================================================
  function addIcon(span) {
    span.classList.add('zisson-c2c-done');
    const phone = span.getAttribute('data-phone');
    if (!phone) return;

    span.insertAdjacentElement('afterend', createCallIcon(phone, span.ownerDocument));
  }

  // ============================================================
  // AUTO-INJISER RING-IKON PÅ PLAKAT (#reqposter) - alle telefonnummer
  // ============================================================
  function addPosterPhoneIcons(field) {
    field.classList.add('zisson-c2c-done');
    if (!field.closest('#reqposter')) return;

    const labelText = field.textContent.trim();

    // Vanlig tilfelle: egen etikett-celle ("Tlf:", "Mob:", "Mob (2):",
    // "Tlf fra EPJ:" osv.) med telefonnummeret i neste celle (reqv_value)
    if (PHONE_LABEL_RE.test(labelText)) {
      const valueCell = field.nextElementSibling;
      if (valueCell?.classList.contains('reqv_value')) {
        const phone = extractPhoneFromValue(valueCell.textContent);
        if (phone) {
          valueCell.appendChild(createCallIcon(phone, valueCell.ownerDocument));
          return;
        }
      }
    }

    // Telefonnummer skrevet inn i løpende tekst, f.eks. rekvirentens
    // adressefelt: "...Moafjæra 8C, 7606 Levanger, Tlf: 73604260 / 92091551"
    // Kan inneholde flere gyldige numre delt med "/" - legg til ikon for hvert.
    const m = field.textContent.match(/(?:Tlf|Mob)\.?\s*:\s*([+\d][\d\s/().+-]*\d)/i);
    if (m) {
      m[1].split('/').forEach(part => {
        const phone = extractPhoneFromValue(part);
        if (phone) field.appendChild(createCallIcon(phone, field.ownerDocument));
      });
    }
  }

  // ============================================================
  // AUTO-INJISER RING-IKON I RESSURSINFO-POPUP - "Telefonnummer sjåfør:" e.l.
  // ============================================================
  function addLabelValueIcon(span) {
    span.classList.add('zisson-c2c-done');
    if (!PHONE_LABEL_RE.test(span.textContent.trim())) return;

    const valueEl = span.nextElementSibling;
    if (!valueEl) return;

    const phone = extractPhoneFromValue(valueEl.textContent);
    if (!phone) return;

    valueEl.insertAdjacentElement('afterend', createCallIcon(phone, valueEl.ownerDocument));
  }

  // ============================================================
  // AUTO-INJISER RING-IKON I ADMIN-MODAL (#reqDetailsBody) - bestillingsinfo
  // ============================================================
  function addAdminFieldIcon(td) {
    td.classList.add('zisson-c2c-done');
    if (!PHONE_LABEL_RE.test(td.textContent.trim())) return;

    const valueCell = td.nextElementSibling;
    if (!valueCell || valueCell.tagName !== 'TD') return;

    // Verdien kan inneholde flere gyldige numre delt med "/" (f.eks. telefon til hentested)
    valueCell.textContent.split('/').forEach(part => {
      const phone = extractPhoneFromValue(part);
      if (phone) valueCell.appendChild(createCallIcon(phone, valueCell.ownerDocument));
    });
  }

  // ============================================================
  // ADMINMODUL-IFRAME (.adminmodul-modal iframe) - eget document
  // ============================================================
  function handleIframe(iframe) {
    iframe.classList.add('zisson-c2c-done');
    if (!iframe.closest('.adminmodul-modal')) return;

    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        watchDocument(doc);
      } catch (e) {
        // Cross-origin eller ikke tilgjengelig - ignorer
      }
    });
  }

  function processElement(el) {
    if (el.nodeType !== 1) return;

    if (el.matches?.('[data-phone]:not(.zisson-c2c-done)')) addIcon(el);
    el.querySelectorAll?.('[data-phone]:not(.zisson-c2c-done)').forEach(addIcon);

    if (el.matches?.('td.reqv_field:not(.zisson-c2c-done)')) addPosterPhoneIcons(el);
    el.querySelectorAll?.('td.reqv_field:not(.zisson-c2c-done)').forEach(addPosterPhoneIcons);

    if (el.matches?.('#customResourcePopup span:not(.zisson-c2c-done)')) addLabelValueIcon(el);
    el.querySelectorAll?.('#customResourcePopup span:not(.zisson-c2c-done)').forEach(addLabelValueIcon);

    if (el.matches?.('#reqDetailsBody td:not(.zisson-c2c-done)')) addAdminFieldIcon(el);
    el.querySelectorAll?.('#reqDetailsBody td:not(.zisson-c2c-done)').forEach(addAdminFieldIcon);

    if (el.matches?.('.adminmodul-modal iframe:not(.zisson-c2c-done)')) handleIframe(el);
    el.querySelectorAll?.('.adminmodul-modal iframe:not(.zisson-c2c-done)').forEach(handleIframe);
  }

  function watchDocument(doc) {
    processElement(doc.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(processElement);
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
  }

  watchDocument(document);

  console.log('✅ Zisson Click2Call aktivert. Kjør nissyZissonConfig() i konsollet for å sette/endre brukernavn og JWT.');
})();
