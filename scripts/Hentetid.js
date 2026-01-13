(() => {
  // ============================================================
  // MASSEENDRING AV HENTETID SCRIPT (ALT+E)
  // Endrer hentetid på markerte bestillinger individuelt
  // ============================================================
  
  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__endreTidHotkeyInstalled) {
    console.log("✅ Endre tid-script er allerede aktiv");
    return;
  }
  window.__endreTidHotkeyInstalled = true;

  console.log("🚀 Starter Endre tid-script");

  // Bakgrunnsfarge for merkede rader i NISSY
  const SELECTED_BG = "rgb(148, 169, 220)";
  
  // Konfigurerbar tekst-lengde
  const MAX_NAME_LENGTH = 20;
  const MAX_ADDRESS_LENGTH = 30;
  
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
    
    // Sjekk at timer er mellom 00-23
    if (hours < 0 || hours > 23) {
      return false;
    }
    
    // Sjekk at minutter er mellom 00-59
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
  // HJELPEFUNKSJON: Marker bestillinger på nytt
  // ============================================================
  function reselectRows(rowIds) {
    if (typeof selectRow !== 'function' || typeof g_voppLS === 'undefined') {
      console.warn("selectRow eller g_voppLS er ikke tilgjengelig");
      return;
    }
    
    rowIds.forEach(id => {
      try {
        selectRow('V-' + id, g_voppLS);
      } catch (e) {
        console.warn("Kunne ikke markere rad:", id, e);
      }
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks for "Reise tid"
  // ============================================================
  function findReiseTidColumnIndex() {
    const headers = document.querySelectorAll('.ventendeoppdrag thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerLink = headers[i].querySelector('a[href*="tripStartDate"]');
      if (headerLink) {
        return i;
      }
    }
    return -1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn kolonne-indeks for "Opp tid"
  // ============================================================
  function findOppTidColumnIndex() {
    const headers = document.querySelectorAll('.ventendeoppdrag thead th');
    for (let i = 0; i < headers.length; i++) {
      const headerLink = headers[i].querySelector('a[href*="tripTreatmentDate"]');
      if (headerLink) {
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
    
    const timeMatch = text.match(/(\d{2}:\d{2})$/);
    if (timeMatch) {
      return timeMatch[1];
    }
    
    const simpleTimeMatch = text.match(/^\d{2}:\d{2}$/);
    if (simpleTimeMatch) {
      return text;
    }
    
    return "";
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent eksisterende hentetid fra rad
  // ============================================================
  function getExistingTime(row, columnIndex) {
    if (columnIndex === -1) return "";
    
    const cells = row.querySelectorAll('td');
    if (columnIndex >= cells.length) return "";
    
    const cell = cells[columnIndex];
    
    const fontTag = cell.querySelector('font');
    if (fontTag) {
      return extractTimeOnly(fontTag.textContent);
    }
    
    return extractTimeOnly(cell.textContent);
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent oppmøtetid (read-only)
  // ============================================================
  function getOppmotetid(row, columnIndex) {
    if (columnIndex === -1) return "";
    
    const cells = row.querySelectorAll('td');
    if (columnIndex >= cells.length) return "";
    
    const cell = cells[columnIndex];
    const fontTag = cell.querySelector('font');
    
    if (fontTag) {
      return extractTimeOnly(fontTag.textContent);
    }
    
    return extractTimeOnly(cell.textContent);
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
  // HJELPEFUNKSJON: Parse bestillingsinformasjon
  // ============================================================
  function parseRowInfo(row, reiseTidIndex, oppTidIndex) {
    const id = row.getAttribute("name") || row.id.replace(/^V-/, "");
    const rekvNr = row.getAttribute("title") || "";
    
    const nameCell = Array.from(row.querySelectorAll('td'))
      .find(td => td.textContent.includes(','));
    const name = nameCell ? nameCell.textContent.trim() : '(ukjent)';
    
    // Hent adresse (Fra → Til) - inkluder alt (adresse, postnummer, poststed)
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
      row 
    };
  }

  // ============================================================
  // POPUP: Rediger hentetid for flere bestillinger
  // ============================================================
  function showTimeEditPopup(bestillinger) {
    // Sett popup som åpen
    isPopupOpen = true;
    
    const { overlay, popup } = createPopupBase("620px");

    // Bygg HTML for hver bestilling
    const bestillingRows = bestillinger.map((b, index) => {
      const displayName = truncateText(b.name, MAX_NAME_LENGTH);
      const displayFrom = truncateText(b.fromAddress, MAX_ADDRESS_LENGTH);
      const displayTo = truncateText(b.toAddress, MAX_ADDRESS_LENGTH);
      
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
          grid-template-columns: 0.9fr 1.2fr auto;
          gap: 10px;
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
            font-size: 11px;
            color: #666;
            line-height: 1.3;
          " title="${b.fromAddress} → ${b.toAddress}">
            <b>${displayFrom} →</b><br>${displayTo}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <div>
              <div style="
                font-size: 9px;
                color: #666;
                margin-bottom: 2px;
                text-align: center;
              "><b>Hentetid</b></div>
              <input 
                type="text" 
                id="time_${b.id}"
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
      <h2 style="margin:0 0 12px; font-size:18px; color:#333;">
        🕐 Endre hentetid
      </h2>
      
      <div style="
        background:#e3f2fd;
        border:1px solid #2196f3;
        padding:8px 10px;
        border-radius:4px;
        margin-bottom:12px;
        font-size:12px;
        color:#1565c0;
      ">
        <strong>${bestillinger.length} bestillinger valgt</strong> - Juster hentetid individuelt (format: HH:MM)
      </div>
      
      <div style="
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
        font-size:11px;
        color:#856404;
      ">
        💡 Tips: Skriv tid i format HH:MM (f.eks. 14:30). Tab = neste felt, Enter = lagre.
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
    
    // Legg til auto-formatering og keyboard-handling på tidsfeltene
    bestillinger.forEach((b, index) => {
      const input = popup.querySelector(`#time_${b.id}`);
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
          
          // Formater feltet
          handleFormat(e);
          
          // Fjern fokus fra input-feltet (dette gjør at blur-eventet kjører)
          input.blur();
          
          // Vent et lite øyeblikk for at blur skal bli synlig
          setTimeout(() => {
            confirmButton.click();
          }, 50);
        } else if (e.key === 'Tab') {
          // Tab = formater og gå til neste
          handleFormat(e);
        }
      });
    });
    
    // Sett fokus på første tidsfelt og marker innholdet
    setTimeout(() => {
      const firstInput = popup.querySelector(`#time_${bestillinger[0].id}`);
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);

    const closePopup = () => {
      popup.parentNode?.removeChild(popup);
      overlay.parentNode?.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
      isPopupOpen = false; // Frigi sperre
    };

    // Lagre bestillings-IDer for re-seleksjon
    const rowIds = bestillinger.map(b => b.id);

    confirmButton.onclick = async () => {
      // Valider og samle BARE endringer (hvor tid faktisk er endret)
      const changes = [];
      let invalidFields = [];
      
      for (const b of bestillinger) {
        const input = popup.querySelector(`#time_${b.id}`);
        const newTime = input.value.trim();
        const originalTime = input.getAttribute('data-original');
        
        // Hopp over hvis tiden ikke er endret
        if (newTime === originalTime) {
          continue;
        }
        
        if (newTime) {
          // Valider tidsformat og verdi
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
      
      // Deaktiver alle input-felt
      bestillinger.forEach(b => {
        const input = popup.querySelector(`#time_${b.id}`);
        if (input) input.disabled = true;
      });

      await processTimeChanges(changes, statusBox);

      statusBox.style.background = "#d4edda";
      statusBox.style.color = "#155724";
      statusBox.textContent = `✅ Ferdig! ${changes.length} ${changes.length === 1 ? 'bestilling' : 'bestillinger'} oppdatert.`;
      
      if (typeof openPopp === "function") {
        openPopp('-1');
        
        // Vent litt for at openPopp skal fullføre, deretter re-marker radene
        setTimeout(() => {
          reselectRows(rowIds);
        }, 500);
      }
      
      // Vis Lukk-knapp
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
      const url = `/rekvisisjon/requisition/editMultipleRequisitions?userid=${userid}&id=${change.id}&res=${change.rekvNr}`;

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
          admin_param_4: change.rekvNr,
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
    const rows = [...document.querySelectorAll("tr")].filter(tr =>
      getComputedStyle(tr).backgroundColor === SELECTED_BG &&
      (tr.id || "").startsWith("V-")
    );

    if (rows.length === 0) {
      showErrorToast("Ingen bestillinger er valgt på ventende oppdrag. Vennligst marker én eller flere.");
      return;
    }

    const reiseTidIndex = findReiseTidColumnIndex();
    const oppTidIndex = findOppTidColumnIndex();
    
    if (reiseTidIndex === -1) {
      showErrorToast("Kunne ikke finne 'Reise tid' kolonne");
      return;
    }

    const bestillinger = rows.map(row => parseRowInfo(row, reiseTidIndex, oppTidIndex));
    showTimeEditPopup(bestillinger);
  }

  console.log("✅ Endre tid-script lastet - Bruk Alt+E for å endre hentetid på merkede bestillinger");
})();
