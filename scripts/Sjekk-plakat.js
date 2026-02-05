// ================================================================================
// SJEKK PLAKAT - FINN RØD PLAKAT MED FRITEKST
// Finner alle bestillinger med rød plakat (poster-red*) og viser fritekst
// fra: Melding til pasientreisekontoret, Melding til transportøren, Merknad om hentested
// ================================================================================

(() => {
  // --- SPERRE MOT DUPLIKAT KJØRING ---
  if (window.__sjekkPlakatActive) {
    console.warn("⚠️ Sjekk-plakat er allerede aktiv - ignorerer ny forespørsel");
    return;
  }
  window.__sjekkPlakatActive = true;

  let modalDiv = null;
  let overlayDiv = null;

  // ============================================================
  // PROBLEMATISKE ORD/FRASER SOM SKAL FLAGGES
  // ============================================================
  const PROBLEMATIC_KEYWORDS = [
    'alenebil',
    'alene',
    'smitte',
    'hentes',
    'adresse',
    'framsete',
    'rullestol',
    'rullator',
    'lav bil',
    'høy bil',
    'liten bil',
    'forsete',
    'direktebil',
    'direkte',
    'sitte',
    'hjelp',
    'yrkesskade',
    'følges',
    'ledsager',
    'pårørende',
    'dopause',
    'toalett'
  ];

  // ============================================================
  // HJELPEFUNKSJON: Sjekk om fritekst inneholder problematiske ord
  // ============================================================
  function hasProblematicText(freetext) {
    if (!freetext) return false;
    
    const allText = [
      freetext.amtp || '',
      freetext.amtt || '',
      freetext.mohts || ''
    ].join(' ').toLowerCase();
    
    return PROBLEMATIC_KEYWORDS.some(keyword => allText.includes(keyword.toLowerCase()));
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn hvilke problematiske ord som finnes
  // ============================================================
  function findProblematicKeywords(freetext) {
    if (!freetext) return [];
    
    const allText = [
      freetext.amtp || '',
      freetext.amtt || '',
      freetext.mohts || ''
    ].join(' ').toLowerCase();
    
    return PROBLEMATIC_KEYWORDS.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
  }

  // ============================================================
  // HJELPEFUNKSJON: Bryt lang tekst til flere linjer
  // ============================================================
  function breakLongText(text, maxLength = 130) {
    if (!text || text.length <= maxLength) return text;
    
    // Finn mellomrom nærmest maxLength
    let breakPoint = text.lastIndexOf(' ', maxLength);
    if (breakPoint === -1) breakPoint = maxLength;
    
    return text.substring(0, breakPoint) + '<br>' + breakLongText(text.substring(breakPoint + 1), maxLength);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent bestillingsdata fra server
  // ============================================================
  async function fetchRequisitionData(requisitionId) {
    try {
      const url = `/planlegging/ajax-dispatch?update=false&action=showreq&rid=${requisitionId}`;
      const response = await fetch(url, { credentials: "same-origin" });
      
      // Serveren sender ISO-8859-1, men fetch leser som UTF-8
      // Vi må decode korrekt for å få norske tegn
      let text;
      try {
        const buffer = await response.arrayBuffer();
        
        // Prøv ISO-8859-1 først (NISSY's standard encoding)
        let decoder = new TextDecoder('iso-8859-1');
        text = decoder.decode(buffer);
        
        // Hvis vi fortsatt har problemer, prøv UTF-8
        if (text.includes('�')) {
          decoder = new TextDecoder('utf-8', { fatal: false });
          const utf8Text = decoder.decode(buffer);
          
          // Bruk UTF-8 hvis det ser bedre ut
          if (!utf8Text.includes('�')) {
            text = utf8Text;
          }
        }
      } catch (e) {
        console.warn('⚠️ Encoding fallback:', e);
        text = await response.text();
      }
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      // Sjekk for parsing-feil
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error("XML parsing error:", parseError.textContent);
        // Prøv å parse som HTML i stedet (mer tolerant)
        const htmlDoc = parser.parseFromString(text, "text/html");
        return htmlDoc;
      }
      
      return xmlDoc;
    } catch (error) {
      console.error("Feil ved henting av bestillingsdata:", error);
      return null;
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Parse fritekst fra XML-response
  // ============================================================
  function parseFreetextFromXML(xmlDoc) {
    if (!xmlDoc) return null;

    // Finn alle <td class="reqv_field"> og tilhørende <td class="reqv_value">
    const fieldCells = xmlDoc.querySelectorAll('td.reqv_field');
    
    const result = {
      amtp: '',  // Melding til pasientreisekontoret
      amtt: '',  // Melding til transportøren
      mohts: ''  // Merknad om hentested
    };

    for (const fieldCell of fieldCells) {
      const fieldName = fieldCell.textContent.trim();
      const valueCell = fieldCell.nextElementSibling;
      
      if (!valueCell || !valueCell.classList.contains('reqv_value')) continue;
      
      const value = valueCell.textContent.trim();
      
      if (fieldName === 'Melding til pasientreisekontoret:') {
        result.amtp = value;
      } else if (fieldName === 'Melding til transportøren:') {
        result.amtt = value;
      } else if (fieldName === 'Merknad om hentested:') {
        result.mohts = value;
      }
    }

    return result;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks basert på header-tekst
  // ============================================================
  function findColumnIndex(table, headerText) {
    const headers = table.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerContent = headers[i].textContent.trim().replace(/\s+/g, ' ');
      if (headerContent === headerText || headerContent.includes(headerText)) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks basert på eksakt tekst
  // ============================================================
  function findColumnIndexByText(containerSelector, exactText) {
    const container = document.querySelector(containerSelector);
    if (!container) return -1;
    
    const table = container.querySelector('table');
    if (!table) return -1;
    
    const headers = table.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerContent = headers[i].textContent.trim();
      if (headerContent === exactText) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn alle røde plakater i ventende oppdrag
  // ============================================================
  function findRedPostersVentende() {
    const container = document.querySelector('#ventendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Finn kolonne-indekser dynamisk (alle valgfrie bortsett fra plakat-kolonnen)
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const reiseIndex = findColumnIndex(table, 'Reise');
    const oppIndex = findColumnIndex(table, 'Opp');
    const fraIndex = findColumnIndex(table, 'Fra');
    const behovIndex = findColumnIndexByText('#ventendeoppdrag', 'Behov');
    const ledsagerIndex = findColumnIndexByText('#ventendeoppdrag', 'L');
    
    const rows = [...container.querySelectorAll('tr[id^="V-"]')];
    const results = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length === 0) continue;
      
      // Sjekk første celle for røde plakater
      const firstCell = cells[0];
      const redPosters = firstCell.querySelectorAll('img[src*="poster-red"]');
      
      if (redPosters.length === 0) continue;
      
      // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX)"
      let requisitionId = null;
      for (const img of redPosters) {
        const onmouseover = img.getAttribute('onmouseover');
        if (onmouseover) {
          const match = onmouseover.match(/showReq\(this,(\d+)/);
          if (match) {
            requisitionId = match[1];
            break;
          }
        }
      }
      
      if (!requisitionId) {
        // Fallback: bruk row name
        requisitionId = row.getAttribute('name');
      }
      
      if (!requisitionId) continue;
      
      const reknr = row.getAttribute('title') || '';
      const navn = navnIndex !== -1 ? (cells[navnIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
      const hentetid = reiseIndex !== -1 ? (cells[reiseIndex]?.textContent.trim() || '-') : '-';
      const leveringstid = oppIndex !== -1 ? (cells[oppIndex]?.textContent.trim() || '-') : '-';
      
      let fra = '';
      let til = '';
      if (fraIndex !== -1) {
        const adresseCell = cells[fraIndex]?.innerHTML || '';
        const parts = adresseCell.split('<br>').map(s => s.trim());
        fra = parts[0] || '';
        til = parts[1] || '';
      }
      
      const behov = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
      const ledsager = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
      
      results.push({
        requisitionId,
        reknr,
        navn,
        hentetid,
        leveringstid,
        fra,
        til,
        behov,
        ledsager,
        type: 'Ventende'
      });
    }
    
    return results;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn alle røde plakater i pågående oppdrag
  // ============================================================
  function findRedPostersPagaende() {
    const container = document.querySelector('#pagaendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Finn kolonne-indekser dynamisk (alle valgfrie bortsett fra toggle/plakat-kolonnen)
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const startIndex = findColumnIndex(table, 'Start');
    const oppIndex = findColumnIndex(table, 'Oppm');
    const fraIndex = findColumnIndex(table, 'Fra');
    const tilIndex = findColumnIndex(table, 'Til');
    const toggleIndex = findColumnIndex(table, 'T');
    const behovIndex = findColumnIndexByText('#pagaendeoppdrag', 'Behov');
    const ledsagerIndex = findColumnIndexByText('#pagaendeoppdrag', 'L');
    
    // Toggle-kolonnen MÅ finnes (der ligger plakaten)
    if (toggleIndex === -1) return [];
    
    const rows = [...container.querySelectorAll('tr[id^="P-"]')];
    const results = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      
      // Sjekk om denne raden har multi-booking struktur
      const hasMultipleBookings = cells.some(cell => 
        cell.querySelector('div.even.row-image') || cell.querySelector('div.odd.row-image')
      );
      
      if (hasMultipleBookings) {
        // Multi-booking struktur
        const toggleCell = cells[toggleIndex];
        if (!toggleCell) continue;
        
        const imgContainers = toggleCell.querySelectorAll('div.row-image');
        
        for (let i = 0; i < imgContainers.length; i++) {
          const container = imgContainers[i];
          const redPosters = container.querySelectorAll('img[src*="poster-red"]');
          
          if (redPosters.length === 0) continue;
          
          // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX,1320)"
          let requisitionId = null;
          for (const img of redPosters) {
            const onmouseover = img.getAttribute('onmouseover');
            if (onmouseover) {
              const match = onmouseover.match(/showReq\(this,(\d+)/);
              if (match) {
                requisitionId = match[1];
                break;
              }
            }
          }
          
          if (!requisitionId) continue;
          
          // Hent data fra tilsvarende div i andre kolonner (alle valgfrie)
          const navnDivs = navnIndex !== -1 ? (cells[navnIndex]?.querySelectorAll('div.row-image') || []) : [];
          const hentetidDivs = startIndex !== -1 ? (cells[startIndex]?.querySelectorAll('div.row-image') || []) : [];
          const leveringstidDivs = oppIndex !== -1 ? (cells[oppIndex]?.querySelectorAll('div.row-image') || []) : [];
          const fraDivs = fraIndex !== -1 ? (cells[fraIndex]?.querySelectorAll('div.row-image') || []) : [];
          const tilDivs = tilIndex !== -1 ? (cells[tilIndex]?.querySelectorAll('div.row-image') || []) : [];
          const behovDivs = behovIndex !== -1 ? (cells[behovIndex]?.querySelectorAll('div.row-image') || []) : [];
          const ledsagerDivs = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.querySelectorAll('div.row-image') || []) : [];
          
          // Finn reknr fra action containers
          const actionContainers = cells[cells.length - 1]?.querySelectorAll('div.row-image') || [];
          let reknr = '';
          
          if (actionContainers[i]) {
            const questionImg = actionContainers[i].querySelector('img[onclick*="searchStatus"]');
            if (questionImg) {
              const onclick = questionImg.getAttribute('onclick');
              const reknrMatch = onclick?.match(/nr=(\d+)/);
              if (reknrMatch) reknr = reknrMatch[1];
            }
          }
          
          if (!reknr && imgContainers[i]) {
            const questionImg = imgContainers[i].querySelector('img[onclick*="searchStatus"]');
            if (questionImg) {
              const onclick = questionImg.getAttribute('onclick');
              const reknrMatch = onclick?.match(/nr=(\d+)/);
              if (reknrMatch) reknr = reknrMatch[1];
            }
          }
          
          const navn = navnDivs[i]?.textContent.trim() || '(Ukjent)';
          const hentetid = hentetidDivs[i]?.textContent.trim() || '-';
          const leveringstid = leveringstidDivs[i]?.textContent.trim() || '-';
          const fra = fraDivs[i]?.textContent.trim() || '';
          const til = tilDivs[i]?.textContent.trim() || '';
          const behov = behovDivs[i]?.textContent.trim() || '';
          const ledsager = ledsagerDivs[i]?.textContent.trim() || '';
          
          results.push({
            requisitionId,
            reknr,
            navn,
            hentetid,
            leveringstid,
            fra,
            til,
            behov,
            ledsager,
            type: 'Pågående'
          });
        }
      } else {
        // Single booking struktur
        const toggleCell = cells[toggleIndex];
        if (!toggleCell) continue;
        
        const redPosters = toggleCell.querySelectorAll('img[src*="poster-red"]');
        
        if (redPosters.length === 0) continue;
        
        // Finn requisitionId fra onmouseover="showReq(this,XXXXXXXX,1320)"
        let requisitionId = null;
        for (const img of redPosters) {
          const onmouseover = img.getAttribute('onmouseover');
          if (onmouseover) {
            const match = onmouseover.match(/showReq\(this,(\d+)/);
            if (match) {
              requisitionId = match[1];
              break;
            }
          }
        }
        
        if (!requisitionId) {
          // Fallback: bruk row name
          requisitionId = row.getAttribute('name');
        }
        
        if (!requisitionId) continue;
        
        // Finn reknr fra action cell (siste celle)
        let reknr = '';
        const actionCell = cells[cells.length - 1];
        if (actionCell) {
          const questionImg = actionCell.querySelector('img[onclick*="searchStatus"]');
          if (questionImg) {
            const onclick = questionImg.getAttribute('onclick');
            const reknrMatch = onclick?.match(/nr=(\d+)/);
            if (reknrMatch) reknr = reknrMatch[1];
          }
        }
        
        const navn = navnIndex !== -1 ? (cells[navnIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
        const hentetid = startIndex !== -1 ? (cells[startIndex]?.textContent.trim() || '-') : '-';
        const leveringstid = oppIndex !== -1 ? (cells[oppIndex]?.textContent.trim() || '-') : '-';
        const fra = fraIndex !== -1 ? (cells[fraIndex]?.textContent.trim() || '') : '';
        const til = tilIndex !== -1 ? (cells[tilIndex]?.textContent.trim() || '') : '';
        const behov = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
        const ledsager = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
        
        results.push({
          requisitionId,
          reknr,
          navn,
          hentetid,
          leveringstid,
          fra,
          til,
          behov,
          ledsager,
          type: 'Pågående'
        });
      }
    }
    
    return results;
  }

  // ============================================================
  // HOVEDFUNKSJON: Hent data for alle røde plakater
  // ============================================================
  async function fetchAllRedPosterData() {
    const ventende = findRedPostersVentende();
    const pagaende = findRedPostersPagaende();
    
    const allPosters = [...ventende, ...pagaende];
    
    if (allPosters.length === 0) {
      return { all: [], problematic: [] };
    }
    
    console.log(`🔍 Fant ${allPosters.length} røde plakater, henter fritekst...`);
    
    // Hent data for alle
    const results = [];
    
    for (const poster of allPosters) {
      const xmlDoc = await fetchRequisitionData(poster.requisitionId);
      const freetext = parseFreetextFromXML(xmlDoc);
      
      // Legg kun til hvis det faktisk er fritekst
      if (freetext && (freetext.amtp || freetext.amtt || freetext.mohts)) {
        const isProblematic = hasProblematicText(freetext);
        const keywords = isProblematic ? findProblematicKeywords(freetext) : [];
        
        results.push({
          ...poster,
          freetext,
          isProblematic,
          problematicKeywords: keywords
        });
      }
    }
    
    // Sorter: problematiske først
    const problematic = results.filter(r => r.isProblematic);
    const normal = results.filter(r => !r.isProblematic);
    
    return {
      all: results,
      problematic,
      normal
    };
  }

  // ============================================================
  // HJELPEFUNKSJON: Åpne bestilling i modal
  // ============================================================
  function openRequisitionModal(requisitionId) {
    const url = `/rekvisisjon/requisition/redit?id=${requisitionId}&ns=true&noSerial=true`;
    window.open(url, '_blank', 'width=1200,height=800');
  }

  // ============================================================
  // HJELPEFUNKSJON: Lukk modal
  // ============================================================
  function closeModal() {
    document.removeEventListener('keydown', handleEscape);
    
    if (overlayDiv && overlayDiv.parentNode) {
      document.body.removeChild(overlayDiv);
    }
    if (modalDiv && modalDiv.parentNode) {
      document.body.removeChild(modalDiv);
    }
    
    overlayDiv = null;
    modalDiv = null;
    
    // Frigjør sperre ETTER at modalen er fjernet
    window.__sjekkPlakatActive = false;
  }

  function handleEscape(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Vis modal med resultater
  // ============================================================
  function showModal(data) {
    const { all, problematic, normal } = data;
    
    // Fjern eksisterende modal uten å frigjøre sperren
    if (overlayDiv && overlayDiv.parentNode) {
      document.body.removeChild(overlayDiv);
    }
    if (modalDiv && modalDiv.parentNode) {
      document.body.removeChild(modalDiv);
    }
    
    // Lag overlay
    overlayDiv = document.createElement('div');
    overlayDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9997;
    `;
    overlayDiv.addEventListener('click', closeModal);
    document.body.appendChild(overlayDiv);
    
    // Lag modal
    modalDiv = document.createElement('div');
    
    let html = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 95%; max-height: 90vh; overflow-y: auto; z-index: 9997; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="position: sticky; top: 0; background: #dc3545; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; z-index: 1;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🚩 Røde plakater med fritekst</h2>
        <button id="closeModalBtn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px;">✕</button>
      </div>

      <div style="padding: 20px;">
    `;
    
    if (all.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 16px; color: #28a745; font-weight: 500; margin: 0;">✓ Ingen røde plakater med fritekst funnet</p>
        </div>
      `;
    } else {
      // Vis totalt antall
      html += `<div style="background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #dc3545;">
        🚩 ${all.length} bestilling${all.length === 1 ? '' : 'er'} med rød plakat og fritekst
      </div>`;
      
      // Vis antall problematiske hvis det finnes noen
      if (problematic.length > 0) {
        html += `<div style="background: #fff3cd; color: #856404; padding: 10px 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #ffc107;">
          ⚠️ ${problematic.length} bestilling${problematic.length === 1 ? '' : 'er'} med problematisk fritekst (alenebil, rullestol osv.)
        </div>`;
        // ⚠️ ${problematic.length} bestilling${problematic.length === 1 ? '' : 'er'} med problematisk fritekst (${PROBLEMATIC_KEYWORDS.join(', ')})
        
        // Vis problematiske først
        html += '<h3 style="color: #856404; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">⚠️ Problematisk fritekst</h3>';
        html += renderPosters(problematic, true);
      }
      
      // Vis normale bestillinger
      if (normal.length > 0) {
        if (problematic.length > 0) {
          html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">📝 Øvrig fritekst</h3>';
        }
        html += renderPosters(normal, false);
      }
    }
    
    html += '</div></div>';
    modalDiv.innerHTML = html;
    
    modalDiv.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    document.body.appendChild(modalDiv);
    
    document.addEventListener('keydown', handleEscape);
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    // Legg til event listeners for redigeringsknapper
    const editButtons = modalDiv.querySelectorAll('.nissy-edit-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const requisitionId = btn.getAttribute('data-requisitionid');
        openRequisitionModal(requisitionId);
      });
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Render poster-cards med tabell
  // ============================================================
  function renderPosters(posters, isProblematic = false) {
    let html = '';
    
    for (const poster of posters) {
      const { requisitionId, reknr, navn, hentetid, leveringstid, fra, til, type, behov, ledsager, freetext, problematicKeywords } = poster;
      
      const borderColor = isProblematic ? '#ffc107' : '#dc3545';
      
      html += `
        <div style="background: #f8f9fa; border-radius: 4px; padding: 12px; margin-bottom: 12px; border-left: 3px solid ${borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 2px;">
                ${navn} 
                <span style="background: ${type === 'Ventende' ? '#ffc107' : '#17a2b8'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 6px;">${type}</span>
      `;
      
      // Vis problematiske nøkkelord hvis de finnes
      if (isProblematic && problematicKeywords && problematicKeywords.length > 0) {
        html += `
                <span style="background: #ffc107; color: #856404; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 6px; font-weight: 600;">⚠️ ${problematicKeywords.join(', ')}</span>
        `;
      }
      
      html += `
              </div>
              <div style="font-size: 12px; color: #666;">Reknr: ${reknr || 'N/A'}</div>
            </div>
            <button class="nissy-edit-btn" data-requisitionid="${requisitionId}" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">
              ✏️ Rediger
            </button>
          </div>
          
          <div style="overflow-x: auto; margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #e9ecef;">
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Hentetid</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Oppmøte</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Behov</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;" title="Antall ledsagere">L</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Fra</th>
                  <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Til</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 6px 8px; border: 1px solid #ddd;">${hentetid}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd;">${leveringstid}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.85em;">${behov || ''}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${ledsager || '-'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fra}">${fra}</td>
                  <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${til}">${til}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 8px;">📝 FRITEKST</div>
      `;
      
      if (freetext.amtp) {
        const brokenText = breakLongText(freetext.amtp);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #856404; margin-bottom: 2px;">Melding til pasientreisekontoret:</div>
            <div style="font-size: 12px; color: #856404;">${brokenText}</div>
          </div>
        `;
      }
      
      if (freetext.amtt) {
        const brokenText = breakLongText(freetext.amtt);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #d1ecf1; border-left: 3px solid #17a2b8; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #0c5460; margin-bottom: 2px;">Melding til transportøren:</div>
            <div style="font-size: 12px; color: #0c5460;">${brokenText}</div>
          </div>
        `;
      }
      
      if (freetext.mohts) {
        const brokenText = breakLongText(freetext.mohts);
        html += `
          <div style="margin-bottom: 6px; padding: 6px; background: #f8d7da; border-left: 3px solid #dc3545; border-radius: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #721c24; margin-bottom: 2px;">Merknad om hentested:</div>
            <div style="font-size: 12px; color: #721c24;">${brokenText}</div>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    return html;
  }

  // ============================================================
  // START SCRIPT
  // ============================================================
  (async () => {
    console.log('🚀 Starter Sjekk-plakat script...');
    
    const data = await fetchAllRedPosterData();
    
    console.log(`✅ Ferdig! Fant ${data.all.length} bestillinger med fritekst (${data.problematic.length} problematiske)`);
    
    showModal(data);
  })();
})();