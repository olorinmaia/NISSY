  // ================================================================================
  // Script som sjekker for duplikater blant alle bestillinger på valgt filter
  // Sjekker ventende og pågående oppdrag, lar deg søke etter feil for å rette opp
  // ================================================================================

(() => {
  let modalDiv = null;
  let overlayDiv = null;

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
    
    // Finn kolonne-indekser dynamisk
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const reiseIndex = findColumnIndex(table, 'Reise');
    const oppIndex = findColumnIndex(table, 'Opp');
    const fraIndex = findColumnIndex(table, 'Fra');
    
    if (navnIndex === -1 || reiseIndex === -1) return [];
    
    const rows = [...container.querySelectorAll('tr[id^="V-"]')];
    const data = [];
    
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length <= Math.max(navnIndex, reiseIndex, oppIndex, fraIndex)) continue;
      
      const reknr = row.getAttribute('title');
      const navn = cells[navnIndex]?.textContent.trim();
      const hentetid = cells[reiseIndex]?.textContent.trim();
      const leveringstid = cells[oppIndex]?.textContent.trim();
      const adresseCell = cells[fraIndex]?.innerHTML || '';
      const [fra, til] = adresseCell.split('<br>').map(s => s.trim());
      
      if (navn && hentetid) {
        data.push({
          reknr,
          navn,
          hentetid,
          leveringstid,
          fra: fra || '',
          til: til || '',
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
    
    // Finn kolonne-indekser dynamisk
    const navnIndex = findColumnIndex(table, 'Pnavn');
    const startIndex = findColumnIndex(table, 'Start');
    const oppIndex = findColumnIndex(table, 'Oppm');
    const fraIndex = findColumnIndex(table, 'Fra');
    const tilIndex = findColumnIndex(table, 'Til');
    const statusIndex = findColumnIndex(table, 'Status');
    const toggleIndex = findColumnIndex(table, 'T');
    
    if (navnIndex === -1 || startIndex === -1) return [];
    
    const rows = [...container.querySelectorAll('tr[id^="P-"]')];
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
          
          if (navn && hentetid) {
            data.push({
              reknr,
              navn,
              hentetid,
              leveringstid,
              fra: fra || '',
              til: til || '',
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
        
        if (navn && hentetid) {
          data.push({
            reknr,
            navn,
            hentetid,
            leveringstid,
            fra: fra || '',
            til: til || '',
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
    for (const [navn, items] of grouped.entries()) {
      if (excludedNames.has(navn)) continue;
      
      if (items.length < 2) continue;
      
      const routeGroups = new Map();
      for (const item of items) {
        const routeKey = `${item.fra}|${item.til}`;
        if (!routeGroups.has(routeKey)) {
          routeGroups.set(routeKey, []);
        }
        routeGroups.get(routeKey).push(item);
      }
      
      for (const [routeKey, routeItems] of routeGroups.entries()) {
        if (routeItems.length > 1) {
          routeItems.sort((a, b) => {
            const timeA = parseTime(a.hentetid);
            const timeB = parseTime(b.hentetid);
            if (timeA === null) return 1;
            if (timeB === null) return -1;
            return timeA - timeB;
          });
          duplicates.push({ 
            navn, 
            items: routeItems, 
            reason: 'Samme fra/til adresse' 
          });
        }
      }
    }
    
    return duplicates;
  }

  function searchInPlanning(navn) {
    closeModal();
    
    // ============================================================
    // SETT SØKETYPE TIL "NAVN"
    // Sikrer at søket gjøres på navn, ikke bookingnummer/personnummer
    // ============================================================
    const searchTypeSelect = document.getElementById('searchType');
    if (searchTypeSelect) {
      searchTypeSelect.value = 'name';
    }
    
    // ============================================================
    // UTFØR SØK
    // ============================================================
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
    if (overlayDiv && overlayDiv.parentNode) {
      document.body.removeChild(overlayDiv);
    }
    if (modalDiv && modalDiv.parentNode) {
      document.body.removeChild(modalDiv);
    }
    document.removeEventListener('keydown', handleEscape);
    overlayDiv = null;
    modalDiv = null;
  }

  function handleEscape(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
    }
  }

  function showModal(countDuplicates, routeDuplicates) {
    closeModal();
    
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
    
    const totalDuplicates = countDuplicates.length + routeDuplicates.length;
    
    let html = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 95%; max-height: 90vh; overflow-y: auto; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="position: sticky; top: 0; background: #007bff; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; z-index: 1;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Duplikatsjekk Bestillinger</h2>
        <button id="closeModalBtn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px;">✕</button>
      </div>

      <div style="padding: 20px;">
    `;
    
    if (totalDuplicates === 0) {
      html += `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 16px; color: #28a745; font-weight: 500; margin: 0;">✓ Ingen duplikater funnet</p>
        </div>
      `;
    } else {
      html += '<div style="margin-bottom: 20px;">';
      if (countDuplicates.length > 0) {
        html += `<div style="background: #fff3cd; color: #856404; padding: 10px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid #ffc107;">📊 ${countDuplicates.length} pasient${countDuplicates.length === 1 ? '' : 'er'} med mer enn 2 bestillinger</div>`;
      }
      if (routeDuplicates.length > 0) {
        html += `<div style="background: #d1ecf1; color: #0c5460; padding: 10px 12px; border-radius: 4px; border-left: 4px solid #17a2b8;">🔄 ${routeDuplicates.length} duplikat${routeDuplicates.length === 1 ? '' : 'er'} med samme fra/til adresse</div>`;
      }
      html += '</div>';
      
      if (countDuplicates.length > 0) {
        html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">Pasienter med mer enn 2 bestillinger</h3>';
        html += renderDuplicates(countDuplicates, 'count');
      }
      
      if (routeDuplicates.length > 0) {
        html += '<h3 style="color: #333; font-size: 15px; margin: 20px 0 12px 0; font-weight: 600;">Duplikater med samme fra/til adresse</h3>';
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
    for (const dup of duplicates) {
      html += `
        <div style="background: #f8f9fa; border-radius: 4px; padding: 12px; margin-bottom: 12px; border-left: 3px solid ${type === 'count' ? '#ffc107' : '#17a2b8'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 2px;">${dup.navn} <span style="font-size: 13px; color: #666; font-weight: 400;">(${dup.items.length} bestillinger)</span></div>
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
        
        html += `
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 6px 8px;"><span style="background: ${item.type === 'Ventende' ? '#ffc107' : '#17a2b8'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${item.type}</span></td>
            <td style="padding: 6px 8px; color: #495057;">${reknrDisplay}</td>
            <td style="padding: 6px 8px; color: #495057;">${item.hentetid}</td>
            <td style="padding: 6px 8px; color: #495057;">${item.leveringstid}</td>
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

  const { duplicates: countDuplicates, excludedNames } = findDuplicates();
  const routeDuplicates = findSameRouteDuplicates(excludedNames);
  showModal(countDuplicates, routeDuplicates);
})();
