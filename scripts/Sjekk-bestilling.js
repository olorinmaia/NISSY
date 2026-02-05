// ================================================================================
// Script som sjekker bestillinger for duplikater, datofeil, og problematiske spesielle behov
// Sjekker ventende og pågående oppdrag, lar deg søke etter feil for å rette opp
// 
// Funksjonalitet:
// - Duplikater: Pasienter med mer enn 2 bestillinger
// - Rute-duplikater: Samme fra eller til adresse
// - Datofeil: Hentetid og leveringstid har ulik dato
// - Problematiske spesielle behov: Kombinasjoner som ERS+RB som skaper problemer
// 
// Kolonnevalidering: Alle nødvendige kolonner må finnes
// ================================================================================

(() => {
  // --- SPERRE MOT DUPLIKAT KJØRING ---
  if (window.__sjekkBestillingActive) {
    console.warn("⚠️ Sjekk-bestilling er allerede aktiv - ignorerer ny forespørsel");
    return;
  }
  window.__sjekkBestillingActive = true;

  let modalDiv = null;
  let overlayDiv = null;

  // ============================================================
  // PROBLEMATISK KOMBINASJON AV SPESIELLE BEHOV
  // ============================================================
  const PROBLEMATIC_NEED_COMBINATIONS = [
    { needs: ['ERS', 'RB'], description: 'ERS + RB (Elektrisk rullestol + Rullestolbil)' },
    { needs: ['LB', 'LF'], description: 'LB + LF (Trenger hele baksetet + God benplass og regulerbart sete)' },
    // Legg til flere kombinasjoner her etter behov
    // { needs: ['X', 'Y'], description: 'X + Y beskrivelse' },
  ];

  // ============================================================
  // HJELPEFUNKSJON: Sjekk om behov inneholder problematisk kombinasjon
  // ============================================================
  function hasProblematicNeedCombination(behovStr) {
    if (!behovStr) return null;
    
    const needs = behovStr.split(',').map(n => n.trim()).filter(Boolean);
    
    for (const combo of PROBLEMATIC_NEED_COMBINATIONS) {
      const hasAllNeeds = combo.needs.every(need => needs.includes(need));
      if (hasAllNeeds) {
        return combo;
      }
    }
    
    return null;
  }

  // ============================================================
  // HJELPEFUNKSJON: Valider at nødvendige kolonner finnes
  // ============================================================
  function validateColumns(table, containerName, requiredColumns) {
    const missingColumns = [];
    
    for (const colName of requiredColumns) {
      const index = findColumnIndex(table, colName);
      if (index === -1) {
        missingColumns.push(colName);
      }
    }
    
    if (missingColumns.length > 0) {
      const msg = `⚠️ ${containerName}: Mangler følgende kolonner: ${missingColumns.join(', ')}`;
      console.error(msg);
      showErrorToast(msg);
      throw new Error(msg);
    }
  }

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

  function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const hours = parseInt(match[3], 10);
    const minutes = parseInt(match[4], 10);
    return day * 24 * 60 + hours * 60 + minutes;
  }

  function extractDate(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2})\.(\d{1,2})/);
    if (!match) return null;
    return `${match[1]}.${match[2]}`;
  }

  function datesAreDifferent(hentetid, leveringstid) {
    const hentetidDate = extractDate(hentetid);
    const leveringstidDate = extractDate(leveringstid);
    if (!hentetidDate || !leveringstidDate) return false;
    return hentetidDate !== leveringstidDate;
  }

  // Funksjon for å finne kolonne-indeks basert på header-tekst
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

  function extractVentendeData() {
    const container = document.querySelector('#ventendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Sjekk om det finnes noen bestillinger
    const rows = [...container.querySelectorAll('tr[id^="V-"]')];
    if (rows.length === 0) {
      // Ingen bestillinger, skip kolonnevalidering
      return [];
    }
    
    // Valider nødvendige kolonner for ventende oppdrag
    const requiredColumns = ['Pnavn', 'Reise', 'Opp', 'Fra', 'Behov'];
    validateColumns(table, 'Ventende oppdrag', requiredColumns);
    
    // Finn kolonne-indekser dynamisk
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const reiseIndex = findColumnIndex(table, 'Reise');
    const oppIndex = findColumnIndex(table, 'Opp');
    const fraIndex = findColumnIndex(table, 'Fra');
    const behovIndex = findColumnIndex(table, 'Behov');
    
    const data = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length <= Math.max(navnIndex, reiseIndex, oppIndex, fraIndex, behovIndex)) continue;
      
      const reknr = row.getAttribute('title');
      const navn = cells[navnIndex]?.textContent.trim();
      const hentetid = cells[reiseIndex]?.textContent.trim();
      const leveringstid = cells[oppIndex]?.textContent.trim();
      const adresseCell = cells[fraIndex]?.innerHTML || '';
      const [fra, til] = adresseCell.split('<br>').map(s => s.trim());
      const behov = cells[behovIndex]?.textContent.trim();
      
      if (navn && hentetid) {
        data.push({
          reknr,
          navn,
          hentetid,
          leveringstid,
          fra: fra || '',
          til: til || '',
          behov: behov || '',
          type: 'Ventende',
          status: ''
        });
      }
    }
    
    return data;
  }

  function extractPagaendeData() {
    const container = document.querySelector('#pagaendeoppdrag');
    if (!container) return [];
    
    const table = container.querySelector('table');
    if (!table) return [];
    
    // Sjekk om det finnes noen bestillinger
    const rows = [...container.querySelectorAll('tr[id^="P-"]')];
    if (rows.length === 0) {
      // Ingen bestillinger, skip kolonnevalidering
      return [];
    }
    
    // Valider nødvendige kolonner for pågående oppdrag
    const requiredColumns = ['Pnavn', 'Start', 'Oppm', 'Fra', 'Til', 'Behov'];
    validateColumns(table, 'Pågående oppdrag', requiredColumns);
    
    // Finn kolonne-indekser dynamisk
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const startIndex = findColumnIndex(table, 'Start');
    const oppIndex = findColumnIndex(table, 'Oppm');
    const fraIndex = findColumnIndex(table, 'Fra');
    const tilIndex = findColumnIndex(table, 'Til');
    const statusIndex = findColumnIndex(table, 'Status');
    const toggleIndex = findColumnIndex(table, 'T');
    const behovIndex = findColumnIndex(table, 'Behov');
    
    const data = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      
      const hasMultipleBookings = cells.some(cell => 
        cell.querySelector('div.even.row-image') || cell.querySelector('div.odd.row-image')
      );
      
      if (hasMultipleBookings) {
        const navnDivs = cells[navnIndex]?.querySelectorAll('div.row-image') || [];
        const hentetidDivs = cells[startIndex]?.querySelectorAll('div.row-image') || [];
        const leveringstidDivs = cells[oppIndex]?.querySelectorAll('div.row-image') || [];
        const fraDivs = cells[fraIndex]?.querySelectorAll('div.row-image') || [];
        const tilDivs = cells[tilIndex]?.querySelectorAll('div.row-image') || [];
        const statusDivs = cells[statusIndex]?.querySelectorAll('div.row-image') || [];
        const behovDivs = cells[behovIndex]?.querySelectorAll('div.row-image') || [];
        const imgContainers = cells[toggleIndex]?.querySelectorAll('div.row-image') || [];
        const actionContainers = cells[cells.length - 1]?.querySelectorAll('div.row-image') || [];
        
        for (let i = 0; i < navnDivs.length; i++) {
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
          
          let status = '';
          if (statusDivs[i]) {
            const statusText = statusDivs[i].textContent.trim();
            if (statusText.toLowerCase().includes('ikke møtt')) {
              status = 'ikke møtt';
            }
          }
          
          const navn = navnDivs[i]?.textContent.trim();
          const hentetid = hentetidDivs[i]?.textContent.trim();
          const leveringstid = leveringstidDivs[i]?.textContent.trim();
          const fra = fraDivs[i]?.textContent.trim();
          const til = tilDivs[i]?.textContent.trim();
          const behov = behovDivs[i]?.textContent.trim();
          
          if (navn && hentetid) {
            data.push({
              reknr,
              navn,
              hentetid,
              leveringstid,
              fra: fra || '',
              til: til || '',
              behov: behov || '',
              type: 'Pågående',
              status
            });
          }
        }
      } else {
        let reknr = '';
        
        const lastCell = cells[cells.length - 1];
        if (lastCell) {
          const questionImg = lastCell.querySelector('img[onclick*="searchStatus"]');
          if (questionImg) {
            const onclick = questionImg.getAttribute('onclick');
            const reknrMatch = onclick?.match(/nr=(\d+)/);
            if (reknrMatch) reknr = reknrMatch[1];
          }
        }
        
        let status = '';
        if (cells[statusIndex]) {
          const statusText = cells[statusIndex].textContent.trim();
          if (statusText.toLowerCase().includes('ikke møtt')) {
            status = 'ikke møtt';
          }
        }
        
        const navn = cells[navnIndex]?.textContent.trim();
        const hentetid = cells[startIndex]?.textContent.trim();
        const leveringstid = cells[oppIndex]?.textContent.trim();
        const fra = cells[fraIndex]?.textContent.trim();
        const til = cells[tilIndex]?.textContent.trim();
        const behov = cells[behovIndex]?.textContent.trim();
        
        if (navn && hentetid) {
          data.push({
            reknr,
            navn,
            hentetid,
            leveringstid,
            fra: fra || '',
            til: til || '',
            behov: behov || '',
            type: 'Pågående',
            status
          });
        }
      }
    }
    
    return data;
  }

  function findDuplicates() {
    const ventendeData = extractVentendeData();
    const pagaendeData = extractPagaendeData();
    const allData = [...ventendeData, ...pagaendeData];
    
    const grouped = new Map();
    for (const item of allData) {
      if (!grouped.has(item.navn)) {
        grouped.set(item.navn, []);
      }
      grouped.get(item.navn).push(item);
    }
    
    const duplicates = [];
    const excludedNames = new Set();
    for (const [navn, items] of grouped.entries()) {
      if (items.length > 2) {
        items.sort((a, b) => {
          const timeA = parseTime(a.hentetid);
          const timeB = parseTime(b.hentetid);
          if (timeA === null) return 1;
          if (timeB === null) return -1;
          return timeA - timeB;
        });
        duplicates.push({ navn, items, reason: 'Mer enn 2 bestillinger' });
        excludedNames.add(navn);
      }
    }
    
    return { duplicates, excludedNames };
  }

  function findSameRouteDuplicates(excludedNames) {
    const ventendeData = extractVentendeData();
    const pagaendeData = extractPagaendeData();
    const allData = [...ventendeData, ...pagaendeData];
    
    const grouped = new Map();
    for (const item of allData) {
      if (!grouped.has(item.navn)) {
        grouped.set(item.navn, []);
      }
      grouped.get(item.navn).push(item);
    }
    
    const duplicates = [];
    const processedPairs = new Set(); // For å unngå duplikater
    
    for (const [navn, items] of grouped.entries()) {
      if (excludedNames.has(navn)) continue;
      
      if (items.length < 2) continue;
      
      // Sjekk for duplikater basert på Fra-adresse, Til-adresse, eller begge
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const item1 = items[i];
          const item2 = items[j];
          
          // Lag en unik nøkkel for dette paret (sortert for å unngå duplikater)
          const pairKey = [item1.reknr, item2.reknr].sort().join('|');
          if (processedPairs.has(pairKey)) continue;
          
          const sameFra = item1.fra === item2.fra && item1.fra !== '';
          const sameTil = item1.til === item2.til && item1.til !== '';
          
          if (sameFra || sameTil) {
            processedPairs.add(pairKey);
            
            // Bestem reason basert på hva som matcher
            let reason = '';
            if (sameFra && sameTil) {
              reason = 'Samme fra- og til-adresse';
            } else if (sameFra) {
              reason = 'Samme fra-adresse';
            } else if (sameTil) {
              reason = 'Samme til-adresse';
            }
            
            // Sjekk om vi allerede har en gruppe for dette navnet
            const existingDup = duplicates.find(d => d.navn === navn);
            if (existingDup) {
              // Legg til items hvis de ikke allerede finnes
              if (!existingDup.items.some(it => it.reknr === item1.reknr)) {
                existingDup.items.push(item1);
              }
              if (!existingDup.items.some(it => it.reknr === item2.reknr)) {
                existingDup.items.push(item2);
              }
              // Oppdater reason hvis det er en mer spesifikk match
              if (reason === 'Samme fra- og til-adresse') {
                existingDup.reason = reason;
              }
            } else {
              // Opprett ny duplikat-gruppe
              duplicates.push({
                navn,
                items: [item1, item2],
                reason
              });
            }
          }
        }
      }
    }
    
    // Sorter items i hver duplikat-gruppe etter tid
    for (const dup of duplicates) {
      dup.items.sort((a, b) => {
        const timeA = parseTime(a.hentetid);
        const timeB = parseTime(b.hentetid);
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return timeA - timeB;
      });
    }
    
    return duplicates;
  }

  function findDateMismatches() {
    const ventendeData = extractVentendeData();
    const pagaendeData = extractPagaendeData();
    const allData = [...ventendeData, ...pagaendeData];
    
    const mismatches = [];
    
    for (const item of allData) {
      if (datesAreDifferent(item.hentetid, item.leveringstid)) {
        mismatches.push({
          navn: item.navn,
          items: [item],
          reason: 'Hentetid og leveringstid har ulik dato'
        });
      }
    }
    
    return mismatches;
  }

  function findProblematicNeeds() {
    const ventendeData = extractVentendeData();
    const pagaendeData = extractPagaendeData();
    const allData = [...ventendeData, ...pagaendeData];
    
    const problematic = [];
    
    for (const item of allData) {
      const combo = hasProblematicNeedCombination(item.behov);
      if (combo) {
        problematic.push({
          navn: item.navn,
          items: [item],
          reason: `Problematisk behov: ${combo.description}`,
          problematicCombo: combo
        });
      }
    }
    
    return problematic;
  }

  function searchInPlanning(navn) {
    closeModal();
    
    // Sett søketype til "NAVN"
    const searchTypeSelect = document.getElementById('searchType');
    if (searchTypeSelect) {
      searchTypeSelect.value = 'name';
    }
    
    // Utfør søk
    const searchInput = document.getElementById('searchPhrase');
    if (searchInput) {
      searchInput.value = navn;
      searchInput.focus();
      
      setTimeout(() => {
        const searchButton = document.getElementById('buttonSearch');
        if (searchButton) {
          searchButton.click();
        }
      }, 100);
    }
  }

  function closeModal() {
    // Fjern elementer først
    if (overlayDiv && overlayDiv.parentNode) {
      document.body.removeChild(overlayDiv);
    }
    if (modalDiv && modalDiv.parentNode) {
      document.body.removeChild(modalDiv);
    }
    document.removeEventListener('keydown', handleEscape);
    overlayDiv = null;
    modalDiv = null;
    
    // Frigjør sperre ETTER at modalen er fjernet
    window.__sjekkBestillingActive = false;
  }

  function handleEscape(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
    }
  }

  function showModal(countDuplicates, routeDuplicates, dateMismatches, problematicNeeds) {
    // IKKE kall closeModal() her siden det ville frigjort sperren
    // Fjern bare eksisterende modal uten å frigjøre sperren
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
      z-index: 9999;
    `;
    overlayDiv.addEventListener('click', closeModal);
    document.body.appendChild(overlayDiv);
    
    // Lag modal
    modalDiv = document.createElement('div');
    
    const totalIssues = countDuplicates.length + routeDuplicates.length + dateMismatches.length + problematicNeeds.length;
    
    let html = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 95%; max-height: 90vh; overflow-y: auto; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="position: sticky; top: 0; background: #007bff; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; z-index: 1;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🔍 Sjekk av bestillinger</h2>
        <button id="closeModalBtn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px;">✕</button>
      </div>

      <div style="padding: 20px;">
    `;
    
    if (totalIssues === 0) {
      html += `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 16px; color: #28a745; font-weight: 500; margin: 0;">✓ Ingen duplikater eller andre feil funnet</p>
        </div>
      `;
    } else {
      html += '<div style="margin-bottom: 20px;">';
      if (problematicNeeds.length > 0) {
        html += `<div style="background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #dc3545;">♿ ${problematicNeeds.length} bestilling${problematicNeeds.length === 1 ? '' : 'er'} med problematisk kombinasjon av spesielle behov</div>`;
      }
      if (countDuplicates.length > 0) {
        html += `<div style="background: #fff3cd; color: #856404; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #ffc107;">📊 ${countDuplicates.length} pasient${countDuplicates.length === 1 ? '' : 'er'} med mer enn 2 bestillinger</div>`;
      }
      if (routeDuplicates.length > 0) {
        html += `<div style="background: #d1ecf1; color: #0c5460; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #17a2b8;">🔄 ${routeDuplicates.length} duplikat${routeDuplicates.length === 1 ? '' : 'er'} med samme fra- eller til-adresse</div>`;
      }
      if (dateMismatches.length > 0) {
        html += `<div style="background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; border-left: 4px solid #dc3545;">📅 ${dateMismatches.length} bestilling${dateMismatches.length === 1 ? '' : 'er'} med ulik dato på hentetid og leveringstid</div>`;
      }
      html += '</div>';
      
      if (problematicNeeds.length > 0) {
        html += '<h3 style="color: #721c24; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">♿ Bestillinger med problematisk kombinasjon av spesielle behov</h3>';
        html += renderDuplicates(problematicNeeds, 'problematic');
      }
      
      if (dateMismatches.length > 0) {
        html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">📅 Bestillinger med datofeil (hentetid ≠ leveringstid)</h3>';
        html += renderDuplicates(dateMismatches, 'date');
      }
      
      if (countDuplicates.length > 0) {
        html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">📊 Pasienter med mer enn 2 bestillinger</h3>';
        html += renderDuplicates(countDuplicates, 'count');
      }
      
      if (routeDuplicates.length > 0) {
        html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">🔄 Duplikater med samme fra- eller til-adresse</h3>';
        html += renderDuplicates(routeDuplicates, 'route');
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
    
    const searchButtons = modalDiv.querySelectorAll('.nissy-search-btn');
    searchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const navn = btn.getAttribute('data-navn');
        searchInPlanning(navn);
      });
    });
  }

  function renderDuplicates(duplicates, type) {
    let html = '';
    
    const colorMap = {
      'count': '#ffc107',
      'route': '#17a2b8',
      'date': '#dc3545',
      'problematic': '#dc3545'
    };
    
    const color = colorMap[type] || '#6c757d';
    
    for (const dup of duplicates) {
      html += `
        <div style="background: #f8f9fa; border-radius: 4px; padding: 12px; margin-bottom: 12px; border-left: 3px solid ${color};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 2px;">${dup.navn} <span style="font-size: 13px; color: #666; font-weight: 400;">(${dup.items.length} bestilling${dup.items.length === 1 ? '' : 'er'})</span></div>
              <div style="font-size: 12px; color: #666;">${dup.reason}</div>
            </div>
            <button class="nissy-search-btn" data-navn="${dup.navn}" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">
              🔍 Søk i planlegging
            </button>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #e9ecef;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Type</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Reknr</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Hentetid</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Leveringstid</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Behov</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Fra</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #495057;">Til</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      for (const item of dup.items) {
        const reknrDisplay = item.status 
          ? `${item.reknr} <span style="color: #dc3545;">(${item.status})</span>` 
          : item.reknr;
        
        const hentetidDate = extractDate(item.hentetid);
        const leveringstidDate = extractDate(item.leveringstid);
        const dateMismatch = hentetidDate !== leveringstidDate;
        
        const hentetidStyle = dateMismatch ? 'color: #dc3545; font-weight: 600;' : 'color: #495057;';
        const leveringstidStyle = dateMismatch ? 'color: #dc3545; font-weight: 600;' : 'color: #495057;';
        
        // Sjekk om dette er problematisk behov
        const problematicCombo = hasProblematicNeedCombination(item.behov);
        const behovStyle = problematicCombo 
          ? 'background: #f8d7da; color: #721c24; font-weight: 600; padding: 4px 6px; border-radius: 3px;' 
          : 'color: #495057;';
        const behovDisplay = item.behov || '-';
        
        html += `
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 6px 8px;"><span style="background: ${item.type === 'Ventende' ? '#ffc107' : '#17a2b8'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${item.type}</span></td>
            <td style="padding: 6px 8px; color: #495057;">${reknrDisplay}</td>
            <td style="padding: 6px 8px; ${hentetidStyle}">${item.hentetid}</td>
            <td style="padding: 6px 8px; ${leveringstidStyle}">${item.leveringstid}</td>
            <td style="padding: 6px 8px; ${behovStyle}">${behovDisplay}</td>
            <td style="padding: 6px 8px; color: #495057;">${item.fra}</td>
            <td style="padding: 6px 8px; color: #495057;">${item.til}</td>
          </tr>
        `;
      }
      
      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    return html;
  }

  // ============================================================
  // HOVEDKJØRING - wrapped i try-catch for kolonnevalidering
  // ============================================================
  try {
    const { duplicates: countDuplicates, excludedNames } = findDuplicates();
    const routeDuplicates = findSameRouteDuplicates(excludedNames);
    const dateMismatches = findDateMismatches();
    const problematicNeeds = findProblematicNeeds();
    showModal(countDuplicates, routeDuplicates, dateMismatches, problematicNeeds);
  } catch (error) {
    // Feil under kolonnevalidering eller datainnhenting
    // Feilmelding er allerede vist via showErrorToast()
    // Frigjør sperre og stopp scriptet
    console.error('Sjekk-bestilling feilet:', error);
    window.__sjekkBestillingActive = false;
  }
})();