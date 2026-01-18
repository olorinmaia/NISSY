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
  const MAX_ADDRESS_LENGTH = 35;
  
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
      
      return {
        ...b,
        currentTime: currentTime || b.existingTime,
        existingTime: b.existingTime
      };
    });

    updatedBestillinger.sort((a, b) => {
      const timeA = (a.currentTime || '00:00').replace(':', '');
      const timeB = (b.currentTime || '00:00').replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });

    return updatedBestillinger;
  }

  // ============================================================
  // NY: Hent bestillingsdata fra server
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
  // NY: Fjern problematiske husnummer-suffikser (H0123, U0123 etc)
  // ============================================================
  /**
   * Fjerner problematiske husnummer-suffikser (H0123, U0123 etc)
   * @param {string} address - Original adresse
   * @returns {string} - Adresse uten suffikser
   */
  function cleanAddressSuffixes(address) {
    // Fjern space etterfulgt av H eller U og 4 siffer
    // Eksempel: "Ole Vigs gate 39 H0101, 7500 STJØRDAL" → "Ole Vigs gate 39, 7500 STJØRDAL"
    return address.replace(/\s+[HU]\d{4}(?=,)/g, '');
  }

  // ============================================================
  // NY: Parse adresse fra tekst (format: "Gatenavn 123A, 1234 Poststed")
  // ============================================================
  function parseAddress(addressText) {
    if (!addressText) return null;
    
    // Fjern <br/> tags og split på linjeskift
    const lines = addressText.split(/<br\s*\/?>/gi).map(line => line.trim()).filter(Boolean);
    
    if (lines.length === 0) return null;
    
    // Bruk siste linje som inneholder gateadresse (med komma eller postnummer)
    // Dette unngår organisasjonsnavn som "Kirkegata legesenter"
    let addressLine = lines[lines.length - 1];
    
    // Hvis siste linje bare er telefonnummer, bruk forrige linje
    if (addressLine.startsWith('Tlf:')) {
      addressLine = lines.length > 1 ? lines[lines.length - 2] : addressLine;
    }
    
    // Fjern H0101/U0101 suffikser før parsing
    addressLine = cleanAddressSuffixes(addressLine);
    
    // Mønster: "Gatenavn 123A, 1234 Poststed"
    const match = addressLine.match(/^(.+?)\s+(\d+)([A-Za-z]?),?\s+(\d{4})\s+(.+?)$/);
    
    if (!match) {
      console.warn("Kunne ikke parse adresse:", addressLine);
      return null;
    }
    
    return {
      gatenavn: match[1].trim(),
      husnummer: match[2],
      husbokstav: match[3] || "",
      postnummer: match[4],
      poststed: match[5].trim()
    };
  }

  // ============================================================
  // NY: Ekstraher data fra XML-dokument
  // ============================================================
  function extractRequisitionData(xmlDoc) {
    try {
      const rows = xmlDoc.querySelectorAll('tr');
      
      let behandlingsdato = '';
      let behandlingstid = '';
      let fraAdresse = null;
      let tilAdresse = null;
      let transportType = 'TAX';
      let valgteSpesielleBehov = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        
        const fieldText = cells[0].textContent.trim();
        
        if (fieldText === 'Reise til:') {
          const dateTimeText = cells[1].textContent.trim();
          const addressText = cells.length > 2 ? cells[2].innerHTML : '';
          
          const dateTimeMatch = dateTimeText.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
          if (dateTimeMatch) {
            const [, day, month, year] = dateTimeMatch;
            behandlingsdato = `${day}.${month}.${year.substring(2)}`;
            behandlingstid = `${dateTimeMatch[4]}:${dateTimeMatch[5]}`;
          }
          
          tilAdresse = parseAddress(addressText);
        }
        
        if (fieldText === 'Reise fra:') {
          const addressText = cells.length > 2 ? cells[2].innerHTML : '';
          fraAdresse = parseAddress(addressText);
        }
      });
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 1) return;
        
        const titleCell = cells[0];
        if (titleCell && titleCell.className === 'reqvtitle' && 
            titleCell.textContent.trim() === 'Spesielle behov (denne reisen)') {
          const nextRow = row.nextElementSibling;
          if (nextRow) {
            const needsCells = nextRow.querySelectorAll('td');
            if (needsCells.length > 0) {
              const innerTable = needsCells[0].querySelector('table');
              if (innerTable) {
                const innerCells = innerTable.querySelectorAll('td');
                innerCells.forEach(cell => {
                  const need = cell.textContent.trim();
                  if (need && need.length > 0) {
                    valgteSpesielleBehov.push(need);
                  }
                });
              }
            }
          }
        }
      });
      
      return {
        behandlingsdato,
        behandlingstid,
        valgteSpesielleBehov,
        fraAdresse,
        tilAdresse,
        transportType
      };
    } catch (error) {
      console.error("Feil ved parsing av XML-data:", error);
      return null;
    }
  }

  // ============================================================
  // NY: Beregn reisetid via API
  // ============================================================
  async function calculateTravelTime(requisitionData) {
    return new Promise((resolve, reject) => {
      try {
        const url = '/rekvisisjon/ajax/beregnReisetid';
        
        const cleanData = {
          behandlingsdato: requisitionData.behandlingsdato,
          behandlingstid: requisitionData.behandlingstid,
          valgteSpesielleBehov: requisitionData.valgteSpesielleBehov,
          fraAdresse: requisitionData.fraAdresse,
          tilAdresse: requisitionData.tilAdresse,
          transportType: requisitionData.transportType
        };
        
        // Manuell JSON-bygging for å unngå NISSY's overstyrte JSON.stringify
        const escapeString = (str) => {
          if (str === null || str === undefined) return '""';
          return '"' + String(str)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t') + '"';
        };
        
        const arrayToJson = (arr) => {
          if (!arr || !Array.isArray(arr)) return '[]';
          if (arr.length === 0) return '[]';
          return '[' + arr.map(item => escapeString(item)).join(',') + ']';
        };
        
        const objectToJson = (obj) => {
          if (!obj || typeof obj !== 'object') return 'null';
          const parts = [];
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const value = obj[key];
              if (value === null || value === undefined) {
                parts.push(escapeString(key) + ':""');
              } else {
                parts.push(escapeString(key) + ':' + escapeString(value));
              }
            }
          }
          return '{' + parts.join(',') + '}';
        };
        
        const bodyString = 
          '{' +
          '"behandlingsdato":' + escapeString(cleanData.behandlingsdato) + ',' +
          '"behandlingstid":' + escapeString(cleanData.behandlingstid) + ',' +
          '"valgteSpesielleBehov":' + arrayToJson(cleanData.valgteSpesielleBehov) + ',' +
          '"fraAdresse":' + objectToJson(cleanData.fraAdresse) + ',' +
          '"tilAdresse":' + objectToJson(cleanData.tilAdresse) + ',' +
          '"transportType":' + escapeString(cleanData.transportType) +
          '}';
        
        console.log('📋 Beregner reisetid:', bodyString);
        
        if (typeof jQuery !== 'undefined' && jQuery.post) {
          jQuery.post(url, bodyString, function(jsonData) {
            console.log('📥 Mottatt reisetid response:', jsonData);
            resolve(jsonData);
          }, "json");
        } else {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                console.log('📥 Mottatt reisetid response:', data);
                resolve(data);
              } catch (error) {
                console.error('Feil ved parsing av response:', error);
                reject(new Error('Kunne ikke parse JSON response'));
              }
            } else {
              console.error('HTTP error:', xhr.status, xhr.statusText);
              reject(new Error(`HTTP error! status: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            console.error('Network error');
            reject(new Error('Network error'));
          };
          
          xhr.send(bodyString);
        }
        
      } catch (error) {
        console.error("Feil ved beregning av reisetid:", error);
        reject(error);
      }
    });
  }

  // ============================================================
  // NY: Beregn hentetid fra oppmøtetid og reisetid
  // ============================================================
  function calculatePickupTime(behandlingstid, totalMinutes) {
    if (!behandlingstid || !isValidTime(behandlingstid)) {
      return null;
    }
    
    const [hours, minutes] = behandlingstid.split(':').map(Number);
    
    // Konverter til minutter
    let totalMinutesFromMidnight = hours * 60 + minutes;
    
    // Trekk fra reisetid
    totalMinutesFromMidnight -= totalMinutes;
    
    // Håndter negative verdier (går over midnatt)
    if (totalMinutesFromMidnight < 0) {
      totalMinutesFromMidnight += 24 * 60;
    }
    
    // Konverter tilbake til timer og minutter
    const newHours = Math.floor(totalMinutesFromMidnight / 60) % 24;
    const newMinutes = totalMinutesFromMidnight % 60;
    
    // Formater som HH:MM
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  // ============================================================
  // NY: Hovedfunksjon for å beregne og oppdatere hentetid
  // ============================================================
  async function autoCalculatePickupTime(bestilling, inputElement, calcButton, popup) {
    calcButton.disabled = true;
    calcButton.style.opacity = '0.5';
    calcButton.style.cursor = 'wait';
    calcButton.title = 'Beregner...';
    
    try {
      const xmlDoc = await fetchRequisitionData(bestilling.id);
      if (!xmlDoc) {
        showErrorToast('❌ Kunne ikke hente bestillingsdata');
        return;
      }
      
      const requisitionData = extractRequisitionData(xmlDoc);
      if (!requisitionData) {
        showErrorToast('❌ Kunne ikke parse bestillingsdata');
        return;
      }
      
      const displayId = bestilling.uniqueId || bestilling.id;
      const oppTimeInput = popup.querySelector(`#opptime_${displayId}`);
      const targetTime = oppTimeInput ? oppTimeInput.value.trim() : requisitionData.behandlingstid;
      
      if (!targetTime) {
        showErrorToast('❌ Oppmøtetid mangler - kan ikke beregne hentetid');
        return;
      }
      
      if (oppTimeInput && !isValidTime(targetTime)) {
        showErrorToast('❌ Ugyldig oppmøtetid - vennligst rett opp');
        oppTimeInput.style.borderColor = '#dc3545';
        oppTimeInput.style.background = '#fff5f5';
        return;
      }
      
      if (!requisitionData.fraAdresse || !requisitionData.tilAdresse) {
        showErrorToast('❌ Fra/til-adresse mangler - kan ikke beregne hentetid');
        return;
      }
      
      const modifiedRequisitionData = {
        ...requisitionData,
        behandlingstid: targetTime
      };
      
      const travelData = await calculateTravelTime(modifiedRequisitionData);
      if (!travelData || travelData.reisetid === undefined) {
        showErrorToast('❌ Kunne ikke beregne reisetid');
        return;
      }
      
      let totalMinutes = travelData.reisetid || 0;
      console.log('🧮 Reisetid (basis):', totalMinutes, 'min');
      
      if (travelData.tidstilleggSpesielleBehov) {
        Object.values(travelData.tidstilleggSpesielleBehov).forEach(tillegg => {
          console.log('🧮 Legger til tidstillegg behov:', tillegg, 'min');
          totalMinutes += tillegg || 0;
        });
      }
      
      if (travelData.tidstilleggRegionalt) {
        console.log('🧮 Legger til regionalt tillegg:', travelData.tidstilleggRegionalt, 'min');
        totalMinutes += travelData.tidstilleggRegionalt;
      }
      
      console.log('🧮 Total reisetid:', totalMinutes, 'min fra oppmøtetid:', targetTime);
      
      const pickupTime = calculatePickupTime(targetTime, totalMinutes);
      
      if (!pickupTime) {
        showErrorToast('❌ Kunne ikke beregne hentetid');
        return;
      }
      
      inputElement.value = pickupTime;
      inputElement.style.borderColor = '#28a745';
      inputElement.style.background = '#f0fff0';
      
      if (oppTimeInput) {
        oppTimeInput.style.borderColor = '#28a745';
        oppTimeInput.style.background = '#f0fff0';
      }
      
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`✅ Beregnet hentetid: ${pickupTime} (totalt ${totalMinutes} min)`);
      
    } catch (error) {
      console.error('Feil ved automatisk beregning:', error);
      showErrorToast('❌ Feil ved beregning av hentetid');
    } finally {
      calcButton.disabled = false;
      calcButton.style.opacity = '1';
      calcButton.style.cursor = 'pointer';
      calcButton.title = 'Beregn hentetid automatisk';
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Rebuil bestillingslisten i popup
  // ============================================================
  function rebuildBestillingsList(bestillinger, popup, confirmButton) {
    const container = popup.querySelector('#bestillingerContainer');
    if (!container) return bestillinger;
  
    // Sorter bestillinger og få oppdaterte objekter med currentTime
    const sorted = sortBestillingerByTime(bestillinger, popup);
    
    // Beregn om alle bestillinger er returer (trengs for spacer-styling)
    const allAreReturer = sorted.every(b => {
      if (!b.oppmotetid) return false;
      return b.existingTime === b.oppmotetid || 
             (b.existingTime && b.oppmotetid && b.existingTime.replace(':', '') >= b.oppmotetid.replace(':', ''));
    });
  
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
      
      // Hent nåværende oppmøtetid-verdi hvis feltet eksisterer
      const existingOppInput = popup.querySelector(`#opptime_${displayId}`);
      const currentOppValue = existingOppInput ? existingOppInput.value : b.oppmotetid;
      
      // Sjekk om dette er en retur (hentetid = oppmøtetid ELLER hentetid > oppmøtetid)
      // NISSY kan ha bestillinger hvor hentetid er senere enn oppmøtetid
      const isRetur = b.oppmotetid && (
        b.existingTime === b.oppmotetid || 
        (b.existingTime && b.oppmotetid && b.existingTime.replace(':', '') >= b.oppmotetid.replace(':', ''))
      );
      
      // Sjekk om oppmøtetid er forskjellig fra hentetid (ikke retur)
      const showEditableOppmotetid = b.oppmotetid && !isRetur;
      
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
            ${b.oppmotetid && !isRetur ? `
              <button 
                class="calc-time-btn" 
                data-id="${displayId}"
                style="
                  padding: 6px 8px;
                  background: #17a2b8;
                  margin-top: 13px;
                  color: #fff;
                  border: none;
                  border-radius: 4px;
                  font-size: 13px;
                  cursor: pointer;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                "
                title="Beregn hentetid automatisk"
              >
                🧮
              </button>
            ` : b.oppmotetid && !allAreReturer ? `
              <div style="width: 32px; height: 32px; margin-top: 13px;"></div>
            ` : ''}
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
                ${showEditableOppmotetid ? `
                  <input 
                    type="text" 
                    id="opptime_${displayId}"
                    data-original="${b.oppmotetid}"
                    value="${currentOppValue}"
                    placeholder="HH:MM"
                    maxlength="5"
                    style="
                      padding: 6px 8px;
                      border: 2px solid #ffc107;
                      border-radius: 4px;
                      font-size: 15px;
                      font-weight: 600;
                      width: 60px;
                      text-align: center;
                      background: #fffbf0;
                      color: #333;
                      font-family: 'Courier New', monospace;
                    "
                    title="Redigerbart felt for beregning. Endringen lagres IKKE i systemet, men brukes kun til å beregne hentetid."
                  >
                ` : `
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
                `}
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
    // Legg til event listeners på beregn-knappene
    bestillinger.forEach(b => {
      const displayId = b.uniqueId || b.id;
      const calcButton = popup.querySelector(`.calc-time-btn[data-id="${displayId}"]`);
      
      if (calcButton) {
        calcButton.onclick = async (e) => {
          e.preventDefault();
          const inputElement = popup.querySelector(`#time_${displayId}`);
          await autoCalculatePickupTime(b, inputElement, calcButton, popup);
        };
      }
    });
    
    // Legg til auto-formatering og keyboard-handling på oppmøtetid-feltene
    bestillinger.forEach(b => {
      const displayId = b.uniqueId || b.id;
      const oppTimeInput = popup.querySelector(`#opptime_${displayId}`);
      
      if (oppTimeInput) {
        // Auto-select ved klikk
        oppTimeInput.addEventListener('focus', (e) => {
          e.target.select();
        });
        
        // Auto-select ved museklikk (for å sikre at det fungerer i alle tilfeller)
        oppTimeInput.addEventListener('mouseup', (e) => {
          e.preventDefault();
        });
        
        // Auto-formatering mens du skriver
        oppTimeInput.addEventListener('input', (e) => {
          let value = e.target.value.replace(/[^\d:]/g, '');
          
          if (value.includes(':')) {
            e.target.value = value;
          } else {
            if (value.length >= 3) {
              value = value.slice(0, 2) + ':' + value.slice(2, 4);
              e.target.value = value;
            }
          }
          
          e.target.style.borderColor = '#ffc107';
          e.target.style.background = '#fffbf0';
        });
        
        // Keyboard-handling
        oppTimeInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            
            // Formater først
            handleOppFormat({ target: e.target });
            
            // Finn beregn-knappen for denne bestillingen
            const calcButton = popup.querySelector(`.calc-time-btn[data-id="${displayId}"]`);
            if (calcButton) {
              // Trigger beregning
              calcButton.click();
            }
          } else if (e.key === 'Tab') {
            e.preventDefault();
            
            // Formater først
            handleOppFormat({ target: e.target });
            
            // Hent sortert liste
            const sorted = sortBestillingerByTime(bestillinger, popup);
            const currentIndex = sorted.findIndex(item => (item.uniqueId || item.id) === displayId);
            
            setTimeout(() => {
              if (e.shiftKey) {
                // Shift+Tab - gå til forrige hentetid-felt
                if (currentIndex > 0) {
                  const prevItem = sorted[currentIndex - 1];
                  const prevDisplayId = prevItem.uniqueId || prevItem.id;
                  const prevInput = popup.querySelector(`#time_${prevDisplayId}`);
                  if (prevInput) {
                    prevInput.focus();
                    prevInput.select();
                  }
                } else {
                  // Første felt - gå til Avbryt-knappen
                  const cancelButton = popup.querySelector("#cancelChange");
                  if (cancelButton) cancelButton.focus();
                }
              } else {
                // Tab - gå til neste hentetid-felt
                if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
                  const nextItem = sorted[currentIndex + 1];
                  const nextDisplayId = nextItem.uniqueId || nextItem.id;
                  const nextInput = popup.querySelector(`#time_${nextDisplayId}`);
                  if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                  }
                } else {
                  // Siste felt - gå til første hentetid-felt
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
        
        // Formatering og validering ved blur
        const handleOppFormat = (e) => {
          let value = e.target.value.replace(/[^\d]/g, '');
          
          if (value.length === 0) {
            e.target.value = e.target.getAttribute('data-original');
            e.target.style.borderColor = '#ffc107';
            e.target.style.background = '#fffbf0';
            return;
          }
          
          if (value.length === 2) {
            e.target.value = `${value}:00`;
          } else if (value.length === 3) {
            e.target.value = value.slice(0, 2) + ':' + value.slice(2) + '0';
          } else if (value.length >= 4) {
            e.target.value = value.slice(0, 2) + ':' + value.slice(2, 4);
          } else if (value.length === 1) {
            e.target.value = '0' + value + ':00';
          }

          if (e.target.value && !isValidTime(e.target.value)) {
            e.target.style.borderColor = '#dc3545';
            e.target.style.background = '#fff5f5';
          } else {
            e.target.style.borderColor = '#ffc107';
            e.target.style.background = '#fffbf0';
          }
        };
        
        oppTimeInput.addEventListener('blur', handleOppFormat);
      }
    });
    
    // Legg til auto-formatering og keyboard-handling på tidsfeltene
    bestillinger.forEach((b, index) => {
      const displayId = b.uniqueId || b.id;
      const input = popup.querySelector(`#time_${displayId}`);
      if (!input) return;
      
      // Auto-select ved klikk
      input.addEventListener('focus', (e) => {
        e.target.select();
      });
      
      // Auto-select ved museklikk (for å sikre at det fungerer i alle tilfeller)
      input.addEventListener('mouseup', (e) => {
        e.preventDefault();
      });
      
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
  function parseVentendeRow(row, reiseTidIndex, oppTidIndex, nameIndex) {
    const id = row.getAttribute("name") || row.id.replace(/^V-/, "");
    const rekvNr = row.getAttribute("title") || "";
    
    // Bruk nameIndex i stedet
    const cells = row.querySelectorAll('td');
    const name = (nameIndex !== -1 && cells[nameIndex]) 
      ? cells[nameIndex].textContent.trim() 
      : '(ukjent)';
    
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

    // NY: Sjekk om ALLE bestillinger er returer
    const allAreReturer = sortedBestillinger.every(b => {
      if (!b.oppmotetid) return false; // Ingen oppmøtetid = ikke retur
      
      return b.existingTime === b.oppmotetid || 
             (b.existingTime && b.oppmotetid && b.existingTime.replace(':', '') >= b.oppmotetid.replace(':', ''));
    });

    // Bygg HTML for hver bestilling
    const bestillingRows = sortedBestillinger.map((b, index) => {
      const displayName = truncateText(b.name, MAX_NAME_LENGTH);
      const displayFrom = truncateText(b.fromAddress, MAX_ADDRESS_LENGTH);
      const displayTo = truncateText(b.toAddress, MAX_ADDRESS_LENGTH);
      
      // Bruk uniqueId hvis det finnes, ellers id
      const displayId = b.uniqueId || b.id;
      
      // Sjekk om dette er en retur (hentetid = oppmøtetid ELLER hentetid > oppmøtetid)
      // NISSY kan ha bestillinger hvor hentetid er senere enn oppmøtetid
      const isRetur = b.oppmotetid && (
        b.existingTime === b.oppmotetid || 
        (b.existingTime && b.oppmotetid && b.existingTime.replace(':', '') >= b.oppmotetid.replace(':', ''))
      );
      
      // Sjekk om oppmøtetid er forskjellig fra hentetid (ikke retur)
      const showEditableOppmotetid = b.oppmotetid && !isRetur;
      
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
            ${b.oppmotetid && !isRetur ? `
              <button 
                class="calc-time-btn" 
                data-id="${displayId}"
                style="
                  padding: 6px 8px;
                  background: #17a2b8;
                  margin-top: 13px;
                  color: #fff;
                  border: none;
                  border-radius: 4px;
                  font-size: 13px;
                  cursor: pointer;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                "
                title="Beregn hentetid automatisk"
              >
                🧮
              </button>
            ` : b.oppmotetid && !allAreReturer ? `
              <div style="width: 32px; height: 32px; margin-top: 13px;"></div>
            ` : ''}
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
                ${showEditableOppmotetid ? `
                  <input 
                    type="text" 
                    id="opptime_${displayId}"
                    data-original="${b.oppmotetid}"
                    value="${b.oppmotetid}"
                    placeholder="HH:MM"
                    maxlength="5"
                    style="
                      padding: 6px 8px;
                      border: 2px solid #ffc107;
                      border-radius: 4px;
                      font-size: 15px;
                      font-weight: 600;
                      width: 60px;
                      text-align: center;
                      background: #fffbf0;
                      color: #333;
                      font-family: 'Courier New', monospace;
                    "
                    title="Redigerbart felt for beregning. Endringen lagres IKKE i systemet, men brukes kun til å beregne hentetid."
                  >
                ` : `
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
                `}
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
        <div style="display: flex; gap: 8px;">
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
          <button 
            id="showRouteButton"
            style="
              padding: 8px 16px;
              background: #28a745;
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
            title="Åpne rute i Google Maps for merkede bestillinger (Alt+Q)"
          >
            🗺️ Rutekalkulering
          </button>
        </div>
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
        💡 Tips: Skriv tid i format HH, HHMM (f.eks. 14 eller 1430). Trykk 🧮 for automatisk beregning. Rediger oppmøtetid for å beregne mot et annet tidspunkt. Tab = neste felt. Enter = lagre.
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
    const showRouteButton = popup.querySelector("#showRouteButton");
    
    // Event handler for "Vis i kart" knappen
    showMapButton.onclick = () => {
      const clearButton = document.getElementById('buttonClearSelection');
      if (clearButton && !clearButton.disabled) {
        clearButton.click();
        
        setTimeout(() => {
          reselectAllRows(allSelectedRows);
          
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
    
    // Event handler for "Rutekalkulering" knappen (trigger Alt+Q)
    showRouteButton.onclick = () => {
      // Reselecter bestillinger først
      const clearButton = document.getElementById('buttonClearSelection');
      if (clearButton && !clearButton.disabled) {
        clearButton.click();
        
        setTimeout(() => {
          reselectAllRows(allSelectedRows);
          
          // Trigger Alt+Q
          setTimeout(() => {
            const event = new KeyboardEvent('keydown', {
              key: 'q',
              code: 'KeyQ',
              altKey: true,
              bubbles: true,
              cancelable: true
            });
            document.dispatchEvent(event);
          }, 100);
        }, 100);
      } else {
        reselectAllRows(allSelectedRows);
        
        // Trigger Alt+Q
        setTimeout(() => {
          const event = new KeyboardEvent('keydown', {
            key: 'q',
            code: 'KeyQ',
            altKey: true,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(event);
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
        // Ventende oppdrag
        url = `/rekvisisjon/requisition/editMultipleRequisitions?userid=${userid}&id=${change.id},&res=${change.rekvNr}`;
      } else {
        // Pågående oppdrag
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
          admin_param_5: change.ts || "",
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
  // HJELPEFUNKSJON: Hent status fra Ressurser-tabellen for en ressurs
  // ============================================================
  function getResourceStatus(resourceId) {
    const resourceRow = document.getElementById(`Rxxx${resourceId}`);
    if (!resourceRow) {
      console.warn(`Kunne ikke finne ressurs Rxxx${resourceId} i Ressurser-tabellen`);
      return null;
    }
    
    const statusCell = document.getElementById(`Rxxxstatusxxx${resourceId}`);
    if (!statusCell) {
      console.warn(`Kunne ikke finne status-celle for ressurs ${resourceId}`);
      return null;
    }
    
    return statusCell.textContent.trim();
  }

  // ============================================================
  // HOVEDFUNKSJON: Finn merkede bestillinger og vis popup
  // ============================================================
  function initializeTimeChange() {
    const allSelectedRows = getAllSelectedRows();
    
    // Separer ventende og pågående
    const ventendeRows = allSelectedRows.filter(tr => (tr.id || "").startsWith("V-"));
    const paagaaendeRows = allSelectedRows.filter(tr => (tr.id || "").startsWith("P-"));

    // VALIDERING: Sjekk status fra Ressurser-tabellen for pågående oppdrag
    const paagaaendeWithTildelt = paagaaendeRows.filter(row => {
      const resourceId = row.getAttribute("name") || row.id.replace(/^P-/, "");
      const status = getResourceStatus(resourceId);
      
      if (!status) return false;
      
      return status === 'Tildelt';
    });
    
    // Hvis noen ressurser ble filtrert bort, vis advarsel
    if (paagaaendeWithTildelt.length === 0 && paagaaendeRows.length > 0) {
      const statuses = paagaaendeRows.map(row => {
        const resourceId = row.getAttribute("name") || row.id.replace(/^P-/, "");
        const status = getResourceStatus(resourceId);
        const cells = row.querySelectorAll('td');
        const resourceName = cells[1]?.textContent.trim() || resourceId;
        return `${resourceName}: ${status || 'ikke funnet'}`;
      }).join(', ');
      
      showErrorToast(`❌ Ingen av de merkede ressursene har status "Tildelt". Status: ${statuses}`);
      
      // Hvis det BARE er pågående (ingen ventende), stopp helt
      if (ventendeRows.length === 0) {
        return;
      }
      // Ellers fortsett med bare ventende oppdrag
    }
    
    if (paagaaendeWithTildelt.length > 1) {
      const resourceNames = paagaaendeWithTildelt.map(r => {
        const cells = r.querySelectorAll('td');
        return cells[1]?.textContent.trim() || '(ukjent)';
      }).filter(Boolean);
      
      const choice = prompt(
        `Du har merket ${paagaaendeWithTildelt.length} ressurser med status "Tildelt" på pågående oppdrag:\n\n` +
        resourceNames.map((name, i) => `${i + 1}. ${name}`).join('\n') +
        `\n\nVelg ressurs (1-${paagaaendeWithTildelt.length}) eller trykk Avbryt:`,
        "1"
      );
      
      // Sjekk om bruker trykket Avbryt
      if (choice === null) {
        return;
      }
      
      // Valider input
      const selectedIndex = parseInt(choice) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= paagaaendeWithTildelt.length) {
        showErrorToast(`Ugyldig valg. Velg et tall mellom 1 og ${paagaaendeWithTildelt.length}.`);
        return;
      }
      
      // Bruk kun valgt ressurs
      paagaaendeRows.length = 0;
      paagaaendeRows.push(paagaaendeWithTildelt[selectedIndex]);
      
      // Oppdater allSelectedRows til å kun inneholde valgt ressurs + eventuelle ventende
      allSelectedRows.length = 0;
      allSelectedRows.push(...ventendeRows, ...paagaaendeRows);
    } else if (paagaaendeWithTildelt.length === 1) {
      // Kun én ressurs med Tildelt - bruk den
      paagaaendeRows.length = 0;
      paagaaendeRows.push(paagaaendeWithTildelt[0]);
      
      allSelectedRows.length = 0;
      allSelectedRows.push(...ventendeRows, ...paagaaendeRows);
    }

    let allBestillinger = [];

    // Prosesser ventende oppdrag
    if (ventendeRows.length > 0) {
      const reiseTidIndex = findColumnIndex('.ventendeoppdrag', 'tripStartDate');
      const oppTidIndex = findColumnIndex('.ventendeoppdrag', 'tripTreatmentDate');
      const nameIndex = findColumnIndex('.ventendeoppdrag', 'patientName');
      
      // Valider kritiske kolonner
      if (reiseTidIndex === -1) {
        showErrorToast("❌ Mangler kolonnen 'Reisetid' på ventende oppdrag. Vennligst legg til kolonnen i tabellen.");
        return;
      }
      if (nameIndex === -1) {
        showErrorToast("❌ Mangler kolonnen 'Pnavn' på ventende oppdrag. Vennligst legg til kolonnen i tabellen.");
        return;
      }
      
      const ventendeBestillinger = ventendeRows.map(row => 
        parseVentendeRow(row, reiseTidIndex, oppTidIndex, nameIndex)
      );
      allBestillinger.push(...ventendeBestillinger);
    }

    // Prosesser pågående oppdrag (kun hvis det finnes ressurser med Tildelt)
    if (paagaaendeRows.length > 0 && paagaaendeWithTildelt.length > 0) {
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
      showErrorToast("🕐 Vennligst marker bestillinger eller én tur med status tildelt og trykk på Hentetid-knappen eller Alt+E igjen.");
      return;
    }

    showTimeEditPopup(allBestillinger, allSelectedRows);
  }

  console.log("✅ Hentetid-script lastet");
})();