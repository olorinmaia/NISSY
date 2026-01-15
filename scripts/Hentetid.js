(() => {
  // ============================================================
  // MASSEENDRING AV HENTETID SCRIPT (ALT+E)
  // Endrer hentetid på markerte bestillinger individuelt
  // STØTTER NÅ BÅDE VENTENDE OG PÅGÅENDE OPPDRAG
  // ============================================================
  
  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__endreTidHotkeyInstalled) {
    console.log("✅ Hentetid-script er allerede aktiv");
    return;
  }
  window.__endreTidHotkeyInstalled = true;

  console.log("🚀 Starter Hentetid-script");

  // Bakgrunnsfarge for merkede rader i NISSY
  const SELECTED_BG = "rgb(148, 169, 220)";
  
  // Konfigurerbar tekst-lengde
  const MAX_NAME_LENGTH = 20;
  const MAX_ADDRESS_LENGTH = 40;
  
  // Sperre for å forhindre flere samtidige popups
  let isPopupOpen = false;

  // ============================================================
  // HOTKEY REGISTRERING: ALT+E
  // ============================================================
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "e") {
      e.preventDefault();
      
      // Sjekk om popup allerede er åpen
      if (isPopupOpen) {
        console.log("⚠️ Popup er allerede åpen");
        return;
      }
      
      initializeTimeChange();
    }
  });

  // ============================================================
  // FEILMELDING-TOAST: Vises nederst på skjermen (rød bakgrunn)
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
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentErrorToast === toast) {
          currentErrorToast = null;
        }
      }, 300);
    }, 4000);
  }

  // ============================================================
  // HJELPEFUNKSJON: Valider tidspunkt
  // ============================================================
  function isValidTime(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return false;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 0 || hours > 23) {
      return false;
    }
    
    if (minutes < 0 || minutes > 59) {
      return false;
    }
    
    return true;
  }

  // ============================================================
  // HJELPEFUNKSJON: Trim tekst til maks lengde
  // ============================================================
  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }

  // ============================================================
  // HJELPEFUNKSJON: Sorter bestillinger basert på hentetid
  // ============================================================
  function sortBestillingerByTime(bestillinger, popup) {
    const updatedBestillinger = bestillinger.map(b => {
      const displayId = b.uniqueId || b.id;
      const input = popup ? popup.querySelector(`#time_${displayId}`) : null;
      const currentTime = input ? input.value.trim() : b.existingTime;
      
      // Returner oppdatert objekt med currentTime
      return {
        ...b,
        currentTime: currentTime || b.existingTime,
        existingTime: b.existingTime // Behold original
      };
    });

    // Sorter basert på currentTime
    updatedBestillinger.sort((a, b) => {
      const timeA = (a.currentTime || '00:00').replace(':', '');
      const timeB = (b.currentTime || '00:00').replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });

    return updatedBestillinger;
  }

  // ============================================================
  // HJELPEFUNKSJON: Rebuil bestillingslisten i popup
  // ============================================================
  function rebuildBestillingsList(bestillinger, popup, confirmButton) {
    const container = popup.querySelector('#bestillingerContainer');
    if (!container) return bestillinger;
  
    // Sorter bestillinger og få oppdaterte objekter med currentTime
    const sorted = sortBestillingerByTime(bestillinger, popup);
  
    // Bygg ny HTML
    const bestillingRows = sorted.map((b, index) => {
      const displayName = truncateText(b.name, MAX_NAME_LENGTH);
      const displayFrom = truncateText(b.fromAddress, MAX_ADDRESS_LENGTH);
      const displayTo = truncateText(b.toAddress, MAX_ADDRESS_LENGTH);
      
      // Bruk uniqueId hvis det finnes, ellers id
      const displayId = b.uniqueId || b.id;
      
      // Hent nåværende verdi fra input hvis den finnes
      const existingInput = popup.querySelector(`#time_${displayId}`);
      const currentValue = existingInput ? existingInput.value : b.currentTime || b.existingTime;
      const borderColor = existingInput ? existingInput.style.borderColor : '#2196f3';
      const bgColor = existingInput ? existingInput.style.background : '#fff';
      
      return `
      <div style="
        background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 4px;
        border: 1px solid #dee2e6;
      ">
        <div style="
          display: grid;
          grid-template-columns: 0.8fr 1.3fr auto;
          gap: 15px;
          align-items: center;
        ">
          <div style="
            font-size: 13px;
            font-weight: 600;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          " title="${b.name}">
            ${displayName}
          </div>
          <div style="
            font-size: 12px;
            color: #666;
            line-height: 1.3;
          " title="${b.fromAddress} → ${b.toAddress}">
            ${displayFrom} →<br>${displayTo}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <div>
              <div style="
                font-size: 9px;
                color: #666;
                margin-bottom: 2px;
                text-align: center;
              ">Hentetid</div>
              <input 
                type="text" 
                id="time_${displayId}"
                data-original="${b.existingTime}"
                value="${currentValue}"
                placeholder="HH:MM"
                maxlength="5"
                style="
                  padding: 6px 8px;
                  border: 2px solid ${borderColor};
                  border-radius: 4px;
                  font-size: 15px;
                  font-weight: 600;
                  width: 60px;
                  text-align: center;
                  font-family: 'Courier New', monospace;
                  background: ${bgColor};
                  color: #333;
                "
              >
            </div>
            ${b.oppmotetid ? `
              <div>
                <div style="
                  font-size: 9px;
                  color: #666;
                  margin-bottom: 2px;
                  text-align: center;
                ">Oppmøte</div>
                <div style="
                  padding: 6px 8px;
                  border: 2px solid #ccc;
                  border-radius: 4px;
                  font-size: 15px;
                  font-weight: 600;
                  width: 60px;
                  text-align: center;
                  background: #f8f8f8;
                  color: #666;
                  font-family: 'Courier New', monospace;
                ">${b.oppmotetid}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
  
    // Oppdater container
    container.innerHTML = bestillingRows;
    
    // Re-attach event listeners med de oppdaterte bestillingene
    attachEventListeners(sorted, popup, confirmButton);
    
    return sorted;
  }

  // ============================================================
  // HJELPEFUNKSJON: Attach event listeners til input-felt
  // ============================================================
  function attachEventListeners(bestillinger, popup, confirmButton) {
    // Legg til auto-formatering og keyboard-handling på tidsfeltene
    bestillinger.forEach((b, index) => {
      const displayId = b.uniqueId || b.id;
      const input = popup.querySelector(`#time_${displayId}`);
      if (!input) return;
      
      // Auto-formatering mens du skriver
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d:]/g, '');
        
        // Hvis bruker skriver tall etter kolon, ikke auto-formater
        if (value.includes(':')) {
          e.target.value = value;
        } else {
          // Auto-formater når det bare er tall
          if (value.length >= 3) {
            value = value.slice(0, 2) + ':' + value.slice(2, 4);
            e.target.value = value;
          }
        }
        
        // Fjern rød farge hvis bruker retter
        e.target.style.borderColor = '#2196f3';
        e.target.style.background = '#fff';
      });
      
      // Formatering og validering
      const handleFormat = (e) => {
        let value = e.target.value.replace(/[^\d]/g, '');
        
        if (value.length === 0) {
          e.target.value = '';
          return;
        }
        
        if (value.length === 2) {
          // "00" → "00:00"
          e.target.value = `${value}:00`;
        } else if (value.length === 3) {
          // "123" → "12:30"
          e.target.value = value.slice(0, 2) + ':' + value.slice(2) + '0';
        } else if (value.length >= 4) {
          // "1234" → "12:34"
          e.target.value = value.slice(0, 2) + ':' + value.slice(2, 4);
        } else if (value.length === 1) {
          // "1" → "01:00"
          e.target.value = '0' + value + ':00';
        }

        // Valider tidspunktet
        if (e.target.value && !isValidTime(e.target.value)) {
          e.target.style.borderColor = '#dc3545';
          e.target.style.background = '#fff5f5';
        } else {
          e.target.style.borderColor = '#2196f3';
          e.target.style.background = '#fff';
        }
      };
      
      input.addEventListener('blur', handleFormat);
      
      // Keyboard-handling
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          
          handleFormat(e);
          input.blur();
          
          setTimeout(() => {
            confirmButton.click();
          }, 50);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleFormat(e);
          
          // VIKTIG: Hent de oppdaterte bestillingene fra rebuild
          const sorted = rebuildBestillingsList(bestillinger, popup, confirmButton);
          
          // Finn nåværende index i sortert liste (bruk displayId for sammenligning)
          const currentIndex = sorted.findIndex(item => (item.uniqueId || item.id) === displayId);
          
          setTimeout(() => {
            if (e.shiftKey) {
              // Shift+Tab - gå til forrige
              if (currentIndex > 0) {
                // Gå til forrige felt
                const prevItem = sorted[currentIndex - 1];
                const prevDisplayId = prevItem.uniqueId || prevItem.id;
                const prevInput = popup.querySelector(`#time_${prevDisplayId}`);
                if (prevInput) {
                  prevInput.focus();
                  prevInput.select();
                }
              } else if (currentIndex === 0) {
                // Første felt - gå til Avbryt-knappen
                const cancelButton = popup.querySelector("#cancelChange");
                if (cancelButton) cancelButton.focus();
              } else {
                // currentIndex === -1: Feltet flyttet seg - gå til første felt
                const firstItem = sorted[0];
                const firstDisplayId = firstItem.uniqueId || firstItem.id;
                const firstInput = popup.querySelector(`#time_${firstDisplayId}`);
                if (firstInput) {
                  firstInput.focus();
                  firstInput.select();
                }
              }
            } else {
              // Tab - gå til neste
              if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
                // Gå til neste felt
                const nextItem = sorted[currentIndex + 1];
                const nextDisplayId = nextItem.uniqueId || nextItem.id;
                const nextInput = popup.querySelector(`#time_${nextDisplayId}`);
                if (nextInput) {
                  nextInput.focus();
                  nextInput.select();
                }
              } else {
                // Siste felt eller ugyldig index - gå til første felt
                const firstItem = sorted[0];
                const firstDisplayId = firstItem.uniqueId || firstItem.id;
                const firstInput = popup.querySelector(`#time_${firstDisplayId}`);
                if (firstInput) {
                  firstInput.focus();
                  firstInput.select();
                }
              }
            }
          }, 50);
        }
      });
    });
    
    // Legg til keyboard-handling på knappene for å kunne tabbe tilbake
    const cancelButton = popup.querySelector("#cancelChange");
    if (cancelButton && !cancelButton.dataset.keyboardAttached) {
      cancelButton.dataset.keyboardAttached = 'true';
      cancelButton.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          confirmButton.focus();
        } else if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          // Gå til siste input-felt
          const sorted = sortBestillingerByTime(bestillinger, popup);
          const lastItem = sorted[sorted.length - 1];
          const lastDisplayId = lastItem.uniqueId || lastItem.id;
          const lastInput = popup.querySelector(`#time_${lastDisplayId}`);
          if (lastInput) {
            lastInput.focus();
            lastInput.select();
          }
        }
      });
    }
    
    if (confirmButton && !confirmButton.dataset.keyboardAttached) {
      confirmButton.dataset.keyboardAttached = 'true';
      confirmButton.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          // Wrap til første input-felt
          const sorted = sortBestillingerByTime(bestillinger, popup);
          const firstItem = sorted[0];
          const firstDisplayId = firstItem.uniqueId || firstItem.id;
          const firstInput = popup.querySelector(`#time_${firstDisplayId}`);
          if (firstInput) {
            firstInput.focus();
            firstInput.select();
          }
        } else if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          cancelButton.focus();
        }
      });
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn alle merkede rader (V-, P- og Rxxx)
  // ============================================================
  function getAllSelectedRows() {
    return [...document.querySelectorAll("tr")].filter(tr => {
      const rowBg = getComputedStyle(tr).backgroundColor.replace(/\s+/g, '');
      return rowBg === SELECTED_BG.replace(/\s+/g, '');
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Marker rader på nytt (V-, P- og Rxxx)
  // ============================================================
  function reselectAllRows(selectedRows) {
    selectedRows.forEach(row => {
      const rowId = row.id;
      
      if (rowId.startsWith('V-')) {
        if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
          try {
            selectRow(rowId, g_voppLS);
          } catch (e) {
            console.warn("Kunne ikke markere ventende oppdrag:", rowId, e);
          }
        }
      } else if (rowId.startsWith('P-')) {
        // For pågående oppdrag, bruk g_poppLS
        // MERK: Vi markerer kun P-raden, ikke Rxxx, da de kan oppheve hverandre
        if (typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
          try {
            selectRow(rowId, g_poppLS);
          } catch (e) {
            console.warn("Kunne ikke markere pågående oppdrag:", rowId, e);
          }
        }
      }
      // VIKTIG: Ignorer Rxxx-rader når P-rader finnes, da de kan oppheve hverandre
      // (samme ressurs kan være merket både i Ressurser og Pågående oppdrag)
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks basert på header-link
  // ============================================================
  function findColumnIndex(tableSelector, headerLink) {
    const headers = document.querySelectorAll(`${tableSelector} thead th`);
    for (let i = 0; i < headers.length; i++) {
      const link = headers[i].querySelector(`a[href*="${headerLink}"]`);
      if (link) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Ekstraher kun tidspunkt fra tekst
  // ============================================================
  function extractTimeOnly(text) {
    if (!text) return "";
    
    text = text.trim();
    
    // Først prøv å finne tidspunkt på slutten av teksten
    const timeMatch = text.match(/(\d{2}:\d{2})$/);
    if (timeMatch) {
      return timeMatch[1];
    }
    
    // Hvis det bare er et tidspunkt
    const simpleTimeMatch = text.match(/^\d{2}:\d{2}$/);
    if (simpleTimeMatch) {
      return text;
    }
    
    return "";
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent tekst fra celle (med støtte for <div>)
  // ============================================================
  function getCellText(cell, rowClass = null) {
    if (!cell) return "";
    
    // Hvis det er en celle med flere <div> (pågående oppdrag)
    if (rowClass) {
      const divs = cell.querySelectorAll('div');
      for (const div of divs) {
        if (div.className === rowClass) {
          return div.textContent.trim();
        }
      }
    }
    
    // Sjekk om det er en <font> tag
    const fontTag = cell.querySelector('font');
    if (fontTag) {
      return fontTag.textContent.trim();
    }
    
    return cell.textContent.trim();
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent eksisterende hentetid fra rad
  // ============================================================
  function getExistingTime(row, columnIndex, rowClass = null) {
    if (columnIndex === -1) return "";
    
    const cells = row.querySelectorAll('td');
    if (columnIndex >= cells.length) return "";
    
    const cellText = getCellText(cells[columnIndex], rowClass);
    return extractTimeOnly(cellText);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent oppmøtetid (read-only)
  // ============================================================
  function getOppmotetid(row, columnIndex, rowClass = null) {
    if (columnIndex === -1) return "";
    
    const cells = row.querySelectorAll('td');
    if (columnIndex >= cells.length) return "";
    
    const cellText = getCellText(cells[columnIndex], rowClass);
    return extractTimeOnly(cellText);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent status fra rad
  // ============================================================
  function getStatus(row, columnIndex, rowClass = null) {
    if (columnIndex === -1) return "";
    
    const cells = row.querySelectorAll('td');
    if (columnIndex >= cells.length) return "";
    
    return getCellText(cells[columnIndex], rowClass);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent ID fra pågående oppdrag (popp_XXXXX)
  // ============================================================
  function getIdFromPaagaaende(row, rowClass = null) {
    const cells = row.querySelectorAll('td');
    
    // ID finnes i T-kolonnen (3. kolonne, indeks 2)
    if (cells.length < 3) return "";
    
    const tCell = cells[2];
    
    // Hvis rowClass er spesifisert (multi-bestilling)
    if (rowClass) {
      const divs = tCell.querySelectorAll('div');
      for (const div of divs) {
        if (div.className === rowClass) {
          const img = div.querySelector('img[id^="popp_"]');
          if (img) {
            const match = img.id.match(/popp_(\d+)/);
            return match ? match[1] : "";
          }
        }
      }
    } else {
      // Single bestilling
      const img = tCell.querySelector('img[id^="popp_"]');
      if (img) {
        const match = img.id.match(/popp_(\d+)/);
        return match ? match[1] : "";
      }
    }
    
    return "";
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent TS (ressurs-ID) fra pågående oppdrag
  // ============================================================
  function getTsFromPaagaaende(row) {
    const cells = row.querySelectorAll('td');
    
    // TS finnes i andre kolonne (indeks 1) - ressursnavn: "Levan-L-LB-XXXXXXXX"
    if (cells.length > 1) {
      const resourceCell = cells[1];
      const resourceText = resourceCell.textContent.trim();
      
      // Ekstraherer siste tall fra "Levan-L-LB-56515070"
      const match = resourceText.match(/(\d+)$/);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback: Søk etter searchStatus?id=
    for (const cell of cells) {
      const img = cell.querySelector('img[onclick*="searchStatus?id="]');
      if (img) {
        const match = img.getAttribute('onclick').match(/id=(\d+)/);
        return match ? match[1] : "";
      }
    }
    
    return "";
  }

  // ============================================================
  // HJELPEFUNKSJON: Opprett popup base
  // ============================================================
  function createPopupBase(width = "500px") {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "999998",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.4)"
    });
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    Object.assign(popup.style, {
      position: "fixed",
      zIndex: "999999",
      background: "#ffffff",
      padding: "20px 24px",
      borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
      fontFamily: "Segoe UI, Arial, sans-serif",
      maxWidth: width,
      maxHeight: "85vh",
      overflow: "auto"
    });

    // Sentrér popup
    const col2 = document.getElementById("col2");
    if (col2) {
      const rect = col2.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      
      popup.style.left = `${centerX}px`;
      popup.style.top = `${centerY}px`;
      popup.style.transform = "translate(-50%, -50%)";
    } else {
      popup.style.top = "50%";
      popup.style.left = "50%";
      popup.style.transform = "translate(-50%, -50%)";
    }

    return { overlay, popup };
  }

  // ============================================================
  // HJELPEFUNKSJON: Parse bestillingsinformasjon (VENTENDE)
  // ============================================================
  function parseVentendeRow(row, reiseTidIndex, oppTidIndex) {
    const id = row.getAttribute("name") || row.id.replace(/^V-/, "");
    const rekvNr = row.getAttribute("title") || "";
    
    const nameCell = Array.from(row.querySelectorAll('td'))
      .find(td => td.textContent.includes(','));
    const name = nameCell ? nameCell.textContent.trim() : '(ukjent)';
    
    const addressCell = Array.from(row.querySelectorAll('td'))
      .find(td => td.innerHTML.includes('<br>'));
    
    let fromAddress = '';
    let toAddress = '';
    
    if (addressCell) {
      const parts = addressCell.innerHTML.split('<br>');
      fromAddress = parts[0] ? parts[0].replace(/<[^>]*>/g, '').trim() : '';
      toAddress = parts[1] ? parts[1].replace(/<[^>]*>/g, '').trim() : '';
    }
    
    const existingTime = getExistingTime(row, reiseTidIndex);
    const oppmotetid = getOppmotetid(row, oppTidIndex);
    
    return { 
      id, 
      rekvNr, 
      name, 
      fromAddress,
      toAddress,
      existingTime,
      oppmotetid,
      row,
      source: 'ventende',
      ts: null // Ventende har ikke ts
    };
  }

  // ============================================================
  // HJELPEFUNKSJON: Parse bestillingsinformasjon (PÅGÅENDE)
  // ============================================================
  function parsePaagaaendeRow(row, startTimeIndex, oppTidIndex, nameIndex, fromIndex, toIndex, statusIndex) {
    const rowId = row.getAttribute("name") || row.id.replace(/^P-/, "");
    const ts = getTsFromPaagaaende(row);
    
    // Sjekk om denne raden har flere bestillinger (har <div> med row-image)
    const cells = row.querySelectorAll('td');
    const firstDataCell = cells[2]; // Tredje celle, ofte T-kolonnen
    
    if (!firstDataCell) return [];
    
    const divs = firstDataCell.querySelectorAll('div.row-image');
    
    if (divs.length === 0) {
      // Enkelt-bestilling (ingen <div> struktur)
      const status = getStatus(row, statusIndex);
      
      // Ignorer hvis ikke "Tildelt"
      if (status !== "Tildelt") {
        return [];
      }
      
      const id = getIdFromPaagaaende(row);
      const name = getCellText(cells[nameIndex]);
      
      // Fra/Til kan være i samme celle med <br>
      let fromAddress = '';
      let toAddress = '';
      
      if (fromIndex !== -1 && fromIndex < cells.length) {
        const addressText = cells[fromIndex].innerHTML;
        if (addressText.includes('<br>')) {
          const parts = addressText.split('<br>');
          fromAddress = parts[0] ? parts[0].replace(/<[^>]*>/g, '').trim() : '';
          toAddress = parts[1] ? parts[1].replace(/<[^>]*>/g, '').trim() : '';
        } else {
          fromAddress = getCellText(cells[fromIndex]);
        }
      }
      
      if (toIndex !== -1 && toIndex < cells.length && !toAddress) {
        toAddress = getCellText(cells[toIndex]);
      }
      
      const existingTime = getExistingTime(row, startTimeIndex);
      const oppmotetid = getOppmotetid(row, oppTidIndex);
      
      return [{
        id,
        ts,
        name,
        fromAddress,
        toAddress,
        existingTime,
        oppmotetid,
        row,
        source: 'pågående',
        rowClass: null
      }];
    } else {
      // Multi-bestilling (har <div> struktur)
      // Vi må iterere gjennom ALLE divs i rekkefølge, ikke filtrere på className
      const bestillinger = [];
      const numBestillinger = divs.length;
      
      // Hent alle div-arrays fra relevante kolonner
      const startTimeDivs = startTimeIndex !== -1 ? cells[startTimeIndex]?.querySelectorAll('div.row-image') : [];
      const oppTidDivs = oppTidIndex !== -1 ? cells[oppTidIndex]?.querySelectorAll('div.row-image') : [];
      const nameDivs = nameIndex !== -1 ? cells[nameIndex]?.querySelectorAll('div.row-image') : [];
      const fromDivs = fromIndex !== -1 ? cells[fromIndex]?.querySelectorAll('div.row-image') : [];
      const toDivs = toIndex !== -1 ? cells[toIndex]?.querySelectorAll('div.row-image') : [];
      const statusDivs = statusIndex !== -1 ? cells[statusIndex]?.querySelectorAll('div.row-image') : [];
      
      // Iterer gjennom hver bestilling basert på index
      for (let i = 0; i < numBestillinger; i++) {
        // Hent status for denne bestillingen
        const statusDiv = statusDivs[i];
        const status = statusDiv ? statusDiv.textContent.trim() : '';
        
        // Ignorer hvis ikke "Tildelt"
        if (status !== "Tildelt") {
          continue;
        }
        
        // Hent ID for denne bestillingen
        const tDiv = divs[i];
        const img = tDiv?.querySelector('img[id^="popp_"]');
        const id = img ? img.id.match(/popp_(\d+)/)?.[1] : '';
        
        if (!id) continue;
        
        // Hent data for denne bestillingen basert på index
        const name = nameDivs[i] ? nameDivs[i].textContent.trim() : '';
        const fromAddress = fromDivs[i] ? fromDivs[i].textContent.trim() : '';
        const toAddress = toDivs[i] ? toDivs[i].textContent.trim() : '';
        const existingTime = startTimeDivs[i] ? extractTimeOnly(startTimeDivs[i].textContent.trim()) : '';
        const oppmotetid = oppTidDivs[i] ? extractTimeOnly(oppTidDivs[i].textContent.trim()) : '';
        
        // Bruk unikt ID basert på popp_ID og index
        const uniqueId = `${id}_${i}`;
        
        bestillinger.push({
          id,
          ts,
          name,
          fromAddress,
          toAddress,
          existingTime,
          oppmotetid,
          row,
          source: 'pågående',
          rowClass: tDiv.className, // Behold for debugging
          uniqueId
        });
      }
      
      return bestillinger;
    }
  }

  // ============================================================
  // POPUP: Rediger hentetid for flere bestillinger
  // ============================================================
  function showTimeEditPopup(bestillinger, allSelectedRows) {
    isPopupOpen = true;
    
    const { overlay, popup } = createPopupBase("620px");

    // Sorter bestillinger initialt
    const sortedBestillinger = sortBestillingerByTime(bestillinger, null);

    // Tell antall fra hver kilde
    const ventendeCount = bestillinger.filter(b => b.source === 'ventende').length;
    const paagaaendeCount = bestillinger.filter(b => b.source === 'pågående').length;
    
    let sourceInfo = '';
    if (ventendeCount > 0 && paagaaendeCount > 0) {
      sourceInfo = ` (${ventendeCount} ventende, ${paagaaendeCount} pågående)`;
    } else if (ventendeCount > 0) {
      sourceInfo = ` (ventende)`;
    } else if (paagaaendeCount > 0) {
      sourceInfo = ` (pågående)`;
    }

    // Bygg HTML for hver bestilling
    const bestillingRows = sortedBestillinger.map((b, index) => {
      const displayName = truncateText(b.name, MAX_NAME_LENGTH);
      const displayFrom = truncateText(b.fromAddress, MAX_ADDRESS_LENGTH);
      const displayTo = truncateText(b.toAddress, MAX_ADDRESS_LENGTH);
      
      // Bruk uniqueId hvis det finnes, ellers id
      const displayId = b.uniqueId || b.id;
      
      return `
      <div style="
        background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 4px;
        border: 1px solid #dee2e6;
      ">
        <div style="
          display: grid;
          grid-template-columns: 0.8fr 1.3fr auto;
          gap: 15px;
          align-items: center;
        ">
          <div style="
            font-size: 13px;
            font-weight: 600;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          " title="${b.name}">
            ${displayName}
          </div>
          <div style="
            font-size: 12px;
            color: #666;
            line-height: 1.3;
          " title="${b.fromAddress} → ${b.toAddress}">
            ${displayFrom} →<br>${displayTo}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <div>
              <div style="
                font-size: 9px;
                color: #666;
                margin-bottom: 2px;
                text-align: center;
              ">Hentetid</div>
              <input 
                type="text" 
                id="time_${displayId}"
                data-original="${b.existingTime}"
                value="${b.existingTime}"
                placeholder="HH:MM"
                maxlength="5"
                style="
                  padding: 6px 8px;
                  border: 2px solid #2196f3;
                  border-radius: 4px;
                  font-size: 15px;
                  font-weight: 600;
                  width: 60px;
                  text-align: center;
                  font-family: 'Courier New', monospace;
                  background: #fff;
                  color: #333;
                "
              >
            </div>
            ${b.oppmotetid ? `
              <div>
                <div style="
                  font-size: 9px;
                  color: #666;
                  margin-bottom: 2px;
                  text-align: center;
                ">Oppmøte</div>
                <div style="
                  padding: 6px 8px;
                  border: 2px solid #ccc;
                  border-radius: 4px;
                  font-size: 15px;
                  font-weight: 600;
                  width: 60px;
                  text-align: center;
                  background: #f8f8f8;
                  color: #666;
                  font-family: 'Courier New', monospace;
                ">${b.oppmotetid}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');

    popup.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 18px; color: #333;">
          🕐 Endre hentetid
        </h2>
        <button 
          id="showMapButton"
          style="
            padding: 8px 16px;
            background: #17a2b8;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
          "
          title="Åpne merkede bestillinger i kart (Alt+W)"
        >
          🗺️ Vis i kart
        </button>
      </div>
      
      <div style="
        background:#e3f2fd;
        border:1px solid #2196f3;
        padding:8px 10px;
        border-radius:4px;
        margin-bottom:12px;
        font-size:12px;
        color:#1565c0;
      ">
        <strong>${bestillinger.length} bestillinger valgt</strong>${sourceInfo} - Juster hentetid individuelt
      </div>
      
      <div id="bestillingerContainer" style="
        max-height: 550px;
        overflow-y: auto;
        margin-bottom: 10px;
        padding-right: 4px;
      ">
        ${bestillingRows}
      </div>
      
      <div style="
        background:#fff3cd;
        border:1px solid #ffc107;
        padding:8px 10px;
        border-radius:4px;
        margin-bottom:10px;
        font-size:12px;
        color:#856404;
      ">
        💡 Tips: Skriv tid i format HH, HHMM (f.eks. 14 eller 1430). Tab = neste felt. Enter = lagre.
      </div>
      
      <div style="display:flex; gap:10px; justify-content:center;">
        <button 
          id="confirmChange" 
          style="
            padding:10px 24px;
            background:#28a745;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          💾 Lagre alle endringer
        </button>
        
        <button 
          id="cancelChange" 
          style="
            padding:10px 24px;
            background:#95a5a6;
            color:#fff;
            border:none;
            border-radius:6px;
            font-size:14px;
            cursor:pointer;
            font-weight:600;
          "
        >
          Avbryt
        </button>
      </div>
      
      <div 
        id="changeStatus" 
        style="
          margin:10px 0 0;
          padding:12px;
          background:#ecf0f1;
          border-radius:6px;
          font-size:13px;
          color:#555;
          min-height:24px;
          display:none;
        "
      >
      </div>
    `;

    document.body.appendChild(popup);
    
    const statusBox = popup.querySelector("#changeStatus");
    const confirmButton = popup.querySelector("#confirmChange");
    const showMapButton = popup.querySelector("#showMapButton");
    
    // Event handler for "Vis i kart" knappen
    showMapButton.onclick = () => {
      // 1. Blank ut eksisterende merkinger hvis knappen er enabled
      const clearButton = document.getElementById('buttonClearSelection');
      if (clearButton && !clearButton.disabled) {
        clearButton.click();
        
        // Vent litt for at blanking skal fullføres
        setTimeout(() => {
          // 2. Marker alle radene på nytt
          reselectAllRows(allSelectedRows);
          
          // 3. Åpne kartet
          setTimeout(() => {
            if (typeof showMapForSelectedItems === 'function') {
              showMapForSelectedItems(null);
            } else {
              console.error('showMapForSelectedItems er ikke tilgjengelig');
              showErrorToast('Kartfunksjonen er ikke tilgjengelig');
            }
          }, 100);
        }, 100);
      } else {
        // Hvis ingen blanking trengs, marker og åpne direkte
        reselectAllRows(allSelectedRows);
        
        setTimeout(() => {
          if (typeof showMapForSelectedItems === 'function') {
            showMapForSelectedItems(null);
          } else {
            console.error('showMapForSelectedItems er ikke tilgjengelig');
            showErrorToast('Kartfunksjonen er ikke tilgjengelig');
          }
        }, 100);
      }
    };
    
    // Attach event listeners til alle felt
    attachEventListeners(sortedBestillinger, popup, confirmButton);
    
    // Sett fokus på første tidsfelt og marker innholdet
    setTimeout(() => {
      const firstItem = sortedBestillinger[0];
      const firstDisplayId = firstItem.uniqueId || firstItem.id;
      const firstInput = popup.querySelector(`#time_${firstDisplayId}`);
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);

    const closePopup = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      isPopupOpen = false;
    };

    confirmButton.onclick = async () => {
      const changes = [];
      let invalidFields = [];
      
      for (const b of bestillinger) {
        const displayId = b.uniqueId || b.id;
        const input = popup.querySelector(`#time_${displayId}`);
        const newTime = input.value.trim();
        const originalTime = input.getAttribute('data-original');
        
        if (newTime === originalTime) {
          continue;
        }
        
        if (newTime) {
          if (!isValidTime(newTime)) {
            input.style.borderColor = '#dc3545';
            input.style.background = '#fff5f5';
            invalidFields.push(b.name);
            continue;
          }
          
          input.style.borderColor = '#28a745';
          input.style.background = '#f0fff0';
          changes.push({
            ...b,
            newTime: newTime
          });
        }
      }
      
      if (invalidFields.length > 0) {
        const fieldsList = invalidFields.length > 3 
          ? invalidFields.slice(0, 3).join(', ') + '...'
          : invalidFields.join(', ');
        showErrorToast(`⚠️ Ugyldig tidspunkt (må være mellom 00:00 og 23:59): ${fieldsList}`);
        return;
      }

      if (changes.length === 0) {
        showErrorToast("ℹ️ Ingen endringer å lagre - alle tidspunkt er uendret");
        return;
      }

      statusBox.style.display = "block";
      confirmButton.style.display = "none";
      popup.querySelector("#cancelChange").style.display = "none";
      
      bestillinger.forEach(b => {
        const displayId = b.uniqueId || b.id;
        const input = popup.querySelector(`#time_${displayId}`);
        if (input) input.disabled = true;
      });

      await processTimeChanges(changes, statusBox);

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = `✅ Ferdig! ${changes.length} ${changes.length === 1 ? 'bestilling' : 'bestillinger'} oppdatert.`;
      
      // Oppdater pågående oppdrag (dette oppdaterer alt)
      if (typeof openPopp === "function") {
        openPopp('-1');
        
        setTimeout(() => {
          reselectAllRows(allSelectedRows);
        }, 500);
      }
      
      const closeButton = document.createElement("button");
      closeButton.textContent = "Lukk";
      Object.assign(closeButton.style, {
        marginTop: "16px",
        padding: "10px 24px",
        background: "#95a5a6",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
        fontWeight: "600"
      });
      closeButton.onclick = closePopup;
      popup.appendChild(closeButton);
      
      setTimeout(() => closeButton.focus(), 100);
      closeButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closePopup();
        }
      });
    };

    popup.querySelector("#cancelChange").onclick = closePopup;
    overlay.onclick = closePopup;

    const escapeHandler = (e) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", escapeHandler);
  }

  // ============================================================
  // PROSESSER ENDRINGER: Oppdater hentetid for alle bestillinger
  // ============================================================
  async function processTimeChanges(changes, statusBox) {
    const userLink = [...document.querySelectorAll('a[href*="popup/changePassword"]')]
      .find(a => /id=\d+/.test(a.href));
    
    if (!userLink) {
      showErrorToast("Kunne ikke finne bruker-ID");
      return;
    }

    const userid = userLink.href.match(/id=(\d+)/)?.[1];
    if (!userid) {
      showErrorToast("Ugyldig bruker-ID");
      return;
    }

    let completed = 0;
    statusBox.textContent = `Behandler 0 av ${changes.length} bestillinger...`;

    for (const change of changes) {
      let url;
      
      // Bygg URL basert på kilde
      if (change.source === 'ventende') {
        // Ventende oppdrag: /rekvisisjon/requisition/editMultipleRequisitions?userid=108137&id=53221506&res=262000770171
        url = `/rekvisisjon/requisition/editMultipleRequisitions?userid=${userid}&id=${change.id}&res=${change.rekvNr}`;
      } else {
        // Pågående oppdrag: /rekvisisjon/requisition/editMultipleRequisitions?userid=108137&id=53221506,&ts=56515071
        url = `/rekvisisjon/requisition/editMultipleRequisitions?userid=${userid}&id=${change.id},&ts=${change.ts}`;
      }

      try {
        const html = await fetch(url, { credentials: "same-origin" }).then(r => r.text());
        const doc = new DOMParser().parseFromString(html, "text/html");
        
        const v = doc.querySelector('input[name="version_0"]')?.value;
        if (!v) {
          completed++;
          statusBox.textContent = `Behandler ${completed} av ${changes.length} bestillinger...`;
          continue;
        }

        const fd = new URLSearchParams({
          admin_param_1: "",
          admin_param_2: "",
          admin_param_3: "",
          admin_param_4: change.rekvNr || "",
          admin_param_5: "",
          admin_param_6: "",
          version_0: v,
          version_count: "1",
          editTreatmentDate: "",
          editTreatmentTime: "",
          editStartDate: "",
          editStartTime: change.newTime,
          editComment: "",
          editTransporterMessage: "",
          editNoOfCompanions: "",
          editFromName: "",
          editFromStreetName: "",
          editFromHouseNr: "",
          editFromHouseSubNr: "",
          "editFromCoordinates.x": "",
          "editFromCoordinates.y": "",
          "editFromCoordinates.z": "",
          editFromOrganizationId: "",
          editFromPostCode: "",
          editFromCity: "",
          editFromPhone: "",
          editToName: "",
          editToStreetName: "",
          editToHouseNr: "",
          editToHouseSubNr: "",
          "editToCoordinates.x": "",
          "editToCoordinates.y": "",
          "editToCoordinates.z": "",
          editToOrganizationId: "",
          editToPostCode: "",
          editToCity: "",
          editToPhone: "",
          callOnArrival: "",
          infoAboutPickup: "",
          selectedIndex: "0",
          action: "save",
          edits: ",4"
        });

        await fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: fd.toString()
        });

      } catch (error) {
        console.error("Feil ved oppdatering:", error);
      }

      completed++;
      statusBox.textContent = `Behandler ${completed} av ${changes.length} bestillinger...`;
    }
  }

  // ============================================================
  // HOVEDFUNKSJON: Finn merkede bestillinger og vis popup
  // ============================================================
  function initializeTimeChange() {
    const allSelectedRows = getAllSelectedRows();
    
    // Separer ventende og pågående
    const ventendeRows = allSelectedRows.filter(tr => (tr.id || "").startsWith("V-"));
    const paagaaendeRows = allSelectedRows.filter(tr => (tr.id || "").startsWith("P-"));

    // VALIDERING: Tillat ikke flere ressurser (P-rader) samtidig
    if (paagaaendeRows.length > 1) {
      const resourceNames = paagaaendeRows.map(r => {
        const cells = r.querySelectorAll('td');
        return cells[1]?.textContent.trim() || '(ukjent)';
      }).filter(Boolean);
      
      const choice = prompt(
        `Du har merket ${paagaaendeRows.length} ressurser på pågående oppdrag:\n\n` +
        resourceNames.map((name, i) => `${i + 1}. ${name}`).join('\n') +
        `\n\nVelg ressurs (1-${paagaaendeRows.length}) eller trykk Avbryt:`,
        "1"
      );
      
      // Sjekk om bruker trykket Avbryt
      if (choice === null) {
        return;
      }
      
      // Valider input
      const selectedIndex = parseInt(choice) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= paagaaendeRows.length) {
        showErrorToast(`Ugyldig valg. Velg et tall mellom 1 og ${paagaaendeRows.length}.`);
        return;
      }
      
      // Bruk kun valgt ressurs
      paagaaendeRows.length = 0;
      paagaaendeRows.push(allSelectedRows.filter(tr => (tr.id || "").startsWith("P-"))[selectedIndex]);
      
      // Oppdater allSelectedRows til å kun inneholde valgt ressurs + eventuelle ventende
      allSelectedRows.length = 0;
      allSelectedRows.push(...ventendeRows, ...paagaaendeRows);
    }

    let allBestillinger = [];

    // Prosesser ventende oppdrag
    if (ventendeRows.length > 0) {
      const reiseTidIndex = findColumnIndex('.ventendeoppdrag', 'tripStartDate');
      const oppTidIndex = findColumnIndex('.ventendeoppdrag', 'tripTreatmentDate');
      
      // Valider kritiske kolonner
      if (reiseTidIndex === -1) {
        showErrorToast("❌ Mangler kolonnen 'Reisetid' på ventende oppdrag. Vennligst legg til kolonnen i tabellen.");
        return;
      }
      
      // Sjekk om pasientnavn-kolonnen finnes (ikke strengt nødvendig, men anbefalt)
      const hasPatientNames = ventendeRows.every(row => {
        const nameCell = Array.from(row.querySelectorAll('td'))
          .find(td => td.textContent.includes(','));
        return nameCell !== undefined;
      });
      
      if (!hasPatientNames) {
        showErrorToast("❌ Mangler kolonnen 'Pnavn' (pasientnavn) på ventende oppdrag. Vennligst legg til kolonnen i tabellen.");
        return;
      }
      
      const ventendeBestillinger = ventendeRows.map(row => 
        parseVentendeRow(row, reiseTidIndex, oppTidIndex)
      );
      allBestillinger.push(...ventendeBestillinger);
    }

    // Prosesser pågående oppdrag
    if (paagaaendeRows.length > 0) {
      const startTimeIndex = findColumnIndex('#pagaendeoppdrag', 'tripStartTime');
      const oppTidIndex = findColumnIndex('#pagaendeoppdrag', 'tripTreatmentDate');
      const nameIndex = findColumnIndex('#pagaendeoppdrag', 'patientName');
      const fromIndex = findColumnIndex('#pagaendeoppdrag', 'tripFromAddress');
      const toIndex = findColumnIndex('#pagaendeoppdrag', 'tripToAddress');
      const statusIndex = findColumnIndex('#pagaendeoppdrag', 'resourceStatus');
      
      // Valider kritiske kolonner
      const missingColumns = [];
      if (startTimeIndex === -1) missingColumns.push("'Start' (hentetid)");
      if (nameIndex === -1) missingColumns.push("'Pnavn' (pasientnavn)");
      if (statusIndex === -1) missingColumns.push("'Status'");
      
      if (missingColumns.length > 0) {
        showErrorToast(`❌ Mangler kolonne(r) på pågående oppdrag: ${missingColumns.join(', ')}. Vennligst legg til i tabellen.`);
        return;
      }
      
      paagaaendeRows.forEach(row => {
        const bestillinger = parsePaagaaendeRow(row, startTimeIndex, oppTidIndex, nameIndex, fromIndex, toIndex, statusIndex);
        allBestillinger.push(...bestillinger);
      });
    }

    if (allBestillinger.length === 0) {
      showErrorToast("🕐 Vennligst marker bestillinger på ventende oppdrag eller én tur med status tildelt på pågående oppdrag og trykk på Hentetid-knappen eller Alt+E igjen.");
      return;
    }

    showTimeEditPopup(allBestillinger, allSelectedRows);
  }

  console.log("✅ Hentetid-script lastet");
})();