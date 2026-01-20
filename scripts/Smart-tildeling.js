(() => {
  // ============================================================
  // SMART TILDELING SCRIPT
  // ALT+S: Smart tildeling med RB/ERS-regler og passasjertelling
  // ALT+T: Tilordningsstøtte 2.0 (individuell tildeling)
  // ============================================================

  // ============================================================
  // GUARD – FORHINDRER DOBBEL INSTALLASJON
  // ============================================================
  if (window.__smartTildelingInstalled) {
    console.log("✅ Smart-tildeling-script er allerede aktiv");
    return;
  }
  window.__smartTildelingInstalled = true;

  console.log("🚀 Starter Smart-tildeling-script");

  // ============================================================
  // KONSTANTER
  // ============================================================
  const TARGET_BG = "148, 169, 220"; // Bakgrunnsfarge for merkede rader
  const RETURN_TRIP_MARGIN = 5; // 5 minutters margin for å gruppere returer
  
  // Spesialbehov og deres kapasitetskrav
  // Bestillinger med disse behovene teller som angitt antall passasjerer
  const SPECIAL_NEEDS_CAPACITY = {
    "LB": 2  // Trenger hele baksetet - ingen kan sitte bak
    // Legg til flere behov her ved behov
  };
  
  // Regler når RB/ERS finnes i bestillingene
  const RB_ERS_RULES = {
    4116: 4120, 8942: 9041, 8918: 9035, 8948: 9043, 8950: 9043,
    8922: 9034, 8932: 9039, 8946: 9114, 8920: 9035, 8928: 9038,
    8914: 9031, 8934: 9040, 8936: 9040, 8954: 9045, 8958: 9046,
    8940: 9041, 8952: 9044, 8956: 9045, 8930: 9037, 8938: 9039,
    8926: 9038, 8916: 9032, 8960: 9046, 8924: 9036, 8944: 9042
  };
  
  // Regler når 3+ samtidig reisende UTEN RB/ERS
  const MULTIPLE_ORDERS_RULES = {
    8942: 8943, 8918: 8919, 8948: 8949, 8950: 8951, 8922: 8923,
    8932: 8933, 8946: 8947, 8920: 8921, 8928: 8929, 8914: 8915,
    8934: 8935, 8936: 8937, 8954: 8955, 8958: 8959, 8940: 8941,
    8952: 8953, 8956: 8957, 8930: 8931, 8938: 8939, 8926: 8927,
    8916: 8917, 8960: 8961, 8924: 8925, 8944: 8945
  };

  let currentToast = null;
  let currentErrorToast = null;

  // ============================================================
  // HJELPEFUNKSJON: Sjekk om det er merkede rader
  // ============================================================
  function hasSelectedRows() {
    return [...document.querySelectorAll("tr")].some(row => {
      const bg = getComputedStyle(row).backgroundColor;
      const id = row.id || "";
      return bg.includes(TARGET_BG) && 
             id.startsWith("V-") && 
             !row.classList.contains("disabled");
    });
  }

  // ============================================================
  // HJELPEFUNKSJON: Grå ut rader under planlegging
  // Bruker systemets innebygde ListSelectionGroup.disableSelection
  // ============================================================
  function disableRows(requisitionIds) {
    if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.disableSelection) {
      const elementsToDisable = requisitionIds.map(id => 'V-' + id);
      try {
        ListSelectionGroup.disableSelection(
          elementsToDisable, 
          ListSelectionGroup.sourceSelectionLists[0]
        );
      } catch (e) {
        console.warn("Kunne ikke bruke ListSelectionGroup.disableSelection:", e);
      }
    }
  }

  // ============================================================
  // HJELPEFUNKSJON: Refresh kun hvis ingen merkede rader
  // ============================================================
  function refreshIfNoSelection() {
    if (!hasSelectedRows()) {
      try {
        openPopp("-1");
      } catch {
        location.reload();
      }
    }
  }

  // ============================================================
  // TOAST-FUNKSJONER: Vis meldinger til bruker
  // ============================================================
  function showToast(message) {
    // Fjern eksisterende toast
    if (currentToast && currentToast.parentNode) {
      document.body.removeChild(currentToast);
    }
    
    // Opprett ny toast
    currentToast = document.createElement("div");
    currentToast.innerHTML = message;
    
    Object.assign(currentToast.style, {
      position: "fixed",
      background: "#ADD8E6",
      color: "#000",
      padding: "20px 30px",
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0,0,0,.3)",
      zIndex: "10000",
      fontSize: "14px",
      fontFamily: "Arial, sans-serif",
      maxWidth: "600px",
      textAlign: "left",
      lineHeight: "1.6",
      whiteSpace: "pre-line"
    });
    
    // Posisjonér toast mot col3
    const col3 = document.getElementById("col3");
    if (col3) {
      const rect = col3.getBoundingClientRect();
      currentToast.style.top = "35%"; // Flytt lengre opp (var 66%)
      currentToast.style.right = `${window.innerWidth - rect.left + 5}px`;
      currentToast.style.left = "auto";
      currentToast.style.transform = "translate(0%,-50%)";
    } else {
      // Fallback: sentrer på skjermen
      currentToast.style.top = "35%"; // Flytt lengre opp (var 66%)
      currentToast.style.left = "50%";
      currentToast.style.transform = "translate(-50%,-50%)";
    }
    
    document.body.appendChild(currentToast);
  }

  function updateToast(message) {
    if (currentToast) {
      currentToast.innerHTML = message;
    }
  }

  function hideToast(delay = 3000) {
    const toast = currentToast;
    if (!toast) return;
    
    setTimeout(() => {
      toast.style.transition = "opacity .3s";
      toast.style.opacity = "0";
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentToast === toast) {
          currentToast = null;
        }
      }, 300);
    }, delay);
  }

  // ============================================================
  // FEILMELDING-TOAST: Vises nederst på skjermen (rød bakgrunn)
  // ============================================================
  function showErrorToast(msg) {
    // Fjern eksisterende feilmelding-toast
    if (currentErrorToast && currentErrorToast.parentNode) {
      currentErrorToast.parentNode.removeChild(currentErrorToast);
    }
    
    const toast = document.createElement("div");
    toast.textContent = msg;
    
    // Styling (basert på Trøndertaxi-løyve.js)
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

  // ============================================================
  // HJELPEFUNKSJON: Hent antall ledsagere fra rad
  // Leter etter første celle med kun ett siffer (0-9)
  // ============================================================
  function getCompanionCount(row) {
    const cells = [...row.querySelectorAll("td")];
    
    for (let i = 0; i < cells.length; i++) {
      const text = cells[i].textContent.trim();
      if (/^[0-9]$/.test(text)) {
        const val = parseInt(text, 10);
        if (!isNaN(val)) return val;
      }
    }
    
    return 0;
  }

  // ============================================================
  // HJELPEFUNKSJON: Hent spesialbehov fra rad
  // Finner cellen under "Behov"-kolonnen og returnerer array av behov
  // ============================================================
  function getSpecialNeeds(row) {
    const cells = [...row.querySelectorAll("td")];
    
    // Finn kolonneindeks for "Behov" i header
    const headerRow = row.closest('table')?.querySelector('thead tr');
    if (!headerRow) return [];
    
    const headers = [...headerRow.querySelectorAll('th')];
    const behovIndex = headers.findIndex(th => th.textContent.trim() === 'Behov');
    
    if (behovIndex === -1 || behovIndex >= cells.length) return [];
    
    const behovText = cells[behovIndex].textContent.trim();
    if (!behovText) return [];
    
    // Split på komma for å håndtere flere behov (f.eks "LI,LB,ØH")
    return behovText.split(',').map(need => need.trim()).filter(Boolean);
  }

  // ============================================================
  // HJELPEFUNKSJON: Beregn kapasitetskrav basert på spesialbehov
  // Returnerer høyeste kapasitetskrav hvis flere behov finnes
  // ============================================================
  function getCapacityRequirement(specialNeeds) {
    if (!specialNeeds || specialNeeds.length === 0) return 1;
    
    let maxCapacity = 1;
    
    for (const need of specialNeeds) {
      const capacity = SPECIAL_NEEDS_CAPACITY[need];
      if (capacity && capacity > maxCapacity) {
        maxCapacity = capacity;
      }
    }
    
    return maxCapacity;
  }

  // ============================================================
  // HJELPEFUNKSJON: Parse tid til minutter fra midnatt
  // ============================================================
  function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    return hours * 60 + minutes;
  }

  // ============================================================
  // HJELPEFUNKSJON: Normaliser tidspar (håndter dårlig datakvalitet)
  // Hvis leveringstid er tidligere enn hentetid, sett leveringstid = hentetid
  // ============================================================
  function normalizeTimes(pickupTime, deliveryTime) {
    if (pickupTime === null || deliveryTime === null) {
      return { pickupTime, deliveryTime };
    }
    
    // Dårlig datakvalitet: leveringstid før hentetid
    if (deliveryTime < pickupTime) {
      return { pickupTime, deliveryTime: pickupTime };
    }
    
    return { pickupTime, deliveryTime };
  }

  // ============================================================
  // HJELPEFUNKSJON: Tell maksimalt overlappende passasjerer
  // Analyserer alle turer og finner maks antall samtidige passasjerer
  // FORBEDRET: Grupperer returer innenfor RETURN_TRIP_MARGIN
  // FORBEDRET: Håndterer spesialbehov som påvirker kapasitet
  //            Spesialbehov angir hvor mange plasser pasienten tar
  //            Ledsagere legges alltid til i tillegg
  // FORBEDRET: Returer som skjer samtidig med normale turer telles sammen
  // ============================================================
  function countMaxOverlappingPassengers(rows) {
    const trips = [];
    
    // Samle alle turer med tider og passasjerantall
    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")];
      let pickupCell, deliveryCell;
      
      // Sjekk om det er en navnekolonne
      const hasNameColumn = cells[1] && !/\d{2}:\d{2}/.test(cells[1].textContent);
      
      if (hasNameColumn) {
        pickupCell = cells[2];
        deliveryCell = cells[3];
      } else {
        pickupCell = cells[1];
        deliveryCell = cells[2];
      }
      
      let pickupTime = pickupCell ? parseTime(pickupCell.textContent.trim()) : null;
      let deliveryTime = deliveryCell ? parseTime(deliveryCell.textContent.trim()) : null;
      
      if (pickupTime === null || deliveryTime === null) continue;
      
      // Normaliser tider (håndter dårlig datakvalitet)
      const normalized = normalizeTimes(pickupTime, deliveryTime);
      pickupTime = normalized.pickupTime;
      deliveryTime = normalized.deliveryTime;
      
      const companions = getCompanionCount(row);
      const specialNeeds = getSpecialNeeds(row);
      const capacityRequirement = getCapacityRequirement(specialNeeds);
      
      // Beregn total kapasitet:
      // - Pasient tar enten 1 plass (normalt) eller mer (spesialbehov)
      // - Ledsagere legges alltid til i tillegg
      const passengers = capacityRequirement + companions;
      
      trips.push({ pickupTime, deliveryTime, passengers, isReturn: pickupTime === deliveryTime });
    }

    if (trips.length === 0) return 0;

    // Bruk event-basert tilnærming for å finne maksimal samtidig kapasitet
    const events = [];
    
    for (const trip of trips) {
      if (trip.isReturn) {
        // Retur: Behandles som eget event
        events.push({ time: trip.pickupTime, type: 'return', passengers: trip.passengers });
      } else {
        // Normal tur: Start og slutt
        events.push({ time: trip.pickupTime, type: 'start', passengers: trip.passengers });
        events.push({ time: trip.deliveryTime, type: 'end', passengers: trip.passengers });
      }
    }
    
    // Sorter events (start før end før return ved samme tid)
    // Dette sikrer at passasjerer som leveres trekkes fra FØR returer telles
    events.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      const order = { 'start': 0, 'end': 1, 'return': 2 };
      return order[a.type] - order[b.type];
    });
    
    let maxOverlap = 0;
    let currentOngoing = 0;  // Pågående normale turer
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.type === 'start') {
        currentOngoing += event.passengers;
        if (currentOngoing > maxOverlap) {
          maxOverlap = currentOngoing;
        }
      } 
      else if (event.type === 'end') {
        currentOngoing -= event.passengers;
      } 
      else if (event.type === 'return') {
        // Grupper alle returer innenfor RETURN_TRIP_MARGIN fra hverandre (kjede-logikk)
        let returnGroupTotal = event.passengers;
        let returnGroupStartTime = event.time;
        let returnGroupEndTime = event.time;
        let j = i + 1;
        let lastReturnTime = event.time;
        
        while (j < events.length && events[j].type === 'return') {
          // Sjekk om denne returen er innenfor margin av forrige i kjeden
          if (events[j].time <= lastReturnTime + RETURN_TRIP_MARGIN) {
            returnGroupTotal += events[j].passengers;
            returnGroupEndTime = events[j].time;
            lastReturnTime = events[j].time;  // Oppdater for neste i kjeden
            j++;
          } else {
            break;  // Utenfor margin, stopp gruppering
          }
        }
        
        // Sjekk fremover: Er det start-events innenfor RETURN_TRIP_MARGIN?
        // (Disse kan overlappe med returgruppen siden vi ikke vet returenes varighet)
        let overlappingStarts = 0;
        for (let k = j; k < events.length; k++) {
          if (events[k].type === 'start' && 
              events[k].time <= returnGroupEndTime + RETURN_TRIP_MARGIN) {
            overlappingStarts += events[k].passengers;
          } else if (events[k].time > returnGroupEndTime + RETURN_TRIP_MARGIN) {
            break; // For langt frem i tid
          }
        }
        
        // Test kapasitet: pågående turer + returgruppe + starts innenfor margin
        const totalCapacity = currentOngoing + returnGroupTotal + overlappingStarts;
        if (totalCapacity > maxOverlap) {
          maxOverlap = totalCapacity;
        }
        
        // Hopp over returer vi allerede har telt
        i = j - 1;
      }
    }

    return maxOverlap;
  }


  // ============================================================
  // ALT+T: TILORDNINGSSTØTTE 2.0
  // Tildeler hver bestilling til sin egen avtale (individuelt)
  // ============================================================
  function runIndividualAssignment() {
    // Finn merkede bestillinger (ikke grået ut)
    const rows = [...document.querySelectorAll("tr")].filter(row => {
      const bg = getComputedStyle(row).backgroundColor;
      const id = row.id || "";
      return bg.includes(TARGET_BG) && 
             id.startsWith("V-") && 
             !row.classList.contains("disabled");
    });
    
    // SJEKK: Ingen bestillinger valgt
    if (rows.length === 0) {
      showErrorToast("📆 Ingen bestillinger er valgt. Vennligst marker én eller flere og trykk på Tilordning 2.0-knappen eller Alt+T igjen.");
      return; // STOPP HER - ikke refresh
    }
    
    const vids = rows.map(row => row.getAttribute("name")).filter(Boolean);
    if (!vids.length) return;
    
    showToast(`Tilordner ${vids.length} bestilling${vids.length === 1 ? '' : 'er'}...`);

    // POST: Hent avtaleinformasjon for alle bestillinger
    const formData = new URLSearchParams();
    vids.forEach(id => formData.append("sourceList[]", id));
    
    const xhrPost = new XMLHttpRequest();
    xhrPost.open("POST", "/planlegging/ajax-dispatch/assignVoppsAssist");
    xhrPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
    xhrPost.onreadystatechange = () => {
      if (xhrPost.readyState !== 4) return;
      
      if (xhrPost.status !== 200) {
        updateToast("POST-request feilet");
        hideToast(3000);
        return;
      }
      
      let postData;
      try {
        postData = JSON.parse(xhrPost.responseText);
      } catch (e) {
        updateToast("Feil ved parsing av respons");
        hideToast(3000);
        return;
      }
      
      if (!postData.ids || postData.ids.length === 0) {
        updateToast("Ingen data returnert");
        hideToast(3000);
        return;
      }
      
      // Del opp i bestillinger med og uten avtale
      const utenAgreement = [];
      const medAgreement = [];
      const displayUtenAgreement = [];
      const displayMedAgreement = [];
      const vidsToDisable = [];
      
      postData.ids.forEach((item, i) => {
        if (!item.agreementId || item.agreementId.trim() === "") {
          utenAgreement.push(item);
          displayUtenAgreement.push(postData.display[i]);
        } else {
          medAgreement.push(item);
          displayMedAgreement.push(postData.display[i]);
          vidsToDisable.push(item.requisitionId);
        }
      });
      
      if (medAgreement.length === 0) {
        const msg = utenAgreement.length > 0
          ? `Følgende bestillinger mangler avtale:\n${displayUtenAgreement.map(d => d.requisitionName).join(', ')}`
          : "Ingen bestillinger å tildele";
        updateToast(msg);
        hideToast(3000);
        return;
      }
      
      // Grå ut bestillinger som skal tildeles
      disableRows(vidsToDisable);
      
      // GET: Utfør tildelingen
      const idsParam = encodeURIComponent(JSON.stringify(medAgreement));
      const getUrl = `/planlegging/ajax-dispatch?did=all&action=assresassist&ids=${idsParam}`;
      
      const xhrGet = new XMLHttpRequest();
      xhrGet.open("GET", getUrl);
      
      xhrGet.onreadystatechange = () => {
        if (xhrGet.readyState !== 4) return;
        
        if (xhrGet.status === 200) {
          // Bygg resultatmelding
          let msg = `✓ Tilordnet ${medAgreement.length} bestilling${medAgreement.length === 1 ? '' : 'er'}:\n`;
          msg += displayMedAgreement.map(d => `${d.requisitionName} → ${d.agreementName}`).join('\n');
          
          if (utenAgreement.length > 0) {
            msg += `\n\n✗ Mangler avtale (${utenAgreement.length}):\n`;
            msg += displayUtenAgreement.map(d => d.requisitionName).join(', ');
          }
          
          updateToast(msg);
          hideToast(3000);
          
          // Refresh kun hvis ingen nye merkede rader
          setTimeout(() => { refreshIfNoSelection(); }, 1000);
        } else {
          updateToast("GET-request feilet");
          hideToast(3000);
        }
      };
      
      xhrGet.send();
    };
    
    xhrPost.send(formData.toString());
  }

  // ============================================================
  // ALT+S: SMART TILDELING
  // Tildeler med RB/ERS-regler og passasjertelling
  // ============================================================
  function runSmartAssignment() {
    // Finn merkede bestillinger (ikke grået ut)
    const rows = [...document.querySelectorAll("tr")].filter(row => {
      const bg = getComputedStyle(row).backgroundColor;
      const id = row.id || "";
      return bg.includes(TARGET_BG) && 
             id.startsWith("V-") && 
             !row.classList.contains("disabled");
    });
    
    // SJEKK: Ingen bestillinger valgt
    if (rows.length === 0) {
      showErrorToast("🪄 Ingen bestillinger er valgt. Vennligst marker én eller flere og trykk på Smart-tildeling-knappen eller Alt+S igjen.");
      return; // STOPP HER - ikke refresh
    }
    
    const vids = rows.map(row => row.getAttribute("name")).filter(Boolean);
    const maxOverlappingPassengers = countMaxOverlappingPassengers(rows);
    
    showToast(
      `Smart-tildeler ${vids.length === 1 ? "1 bestilling" : vids.length + " bestillinger"}...\n` +
      `Samtidig reisende: ${maxOverlappingPassengers}`
    );
  
    // Sjekk om RB eller ERS finnes i bestillingene
    const hasRB = rows.some(row => {
      const cells = [...row.querySelectorAll("td")];
      const td = cells.length >= 4 ? cells[cells.length - 4] : null;
      return td ? /RB|ERS/.test(td.textContent) : false;
    });
  
    // ============================================================
    // SCENARIO 1: RESSURS ER MERKET
    // Tildel alle bestillinger til denne ressursen
    // ============================================================
    
    // Finn alle merkede ressurser
    const allResourceRows = [...document.querySelectorAll("tr")].filter(row => {
      const bg = getComputedStyle(row).backgroundColor;
      const id = row.id || "";
      return bg.includes(TARGET_BG) && 
             id.startsWith("R") && 
             !row.classList.contains("disabled");
    });
    
    let resourceRow = null;
    
    if (allResourceRows.length > 1) {
      // Flere ressurser er merket - vis valg-dialog
      const resourceNames = allResourceRows.map(row => {
        const nameCell = row.querySelectorAll("td")[1];
        return nameCell ? nameCell.textContent.trim() : "Ukjent";
      }).filter(Boolean);
      
      const choice = prompt(
        `Du har merket ${allResourceRows.length} ressurser:\n\n` +
        resourceNames.map((name, i) => `${i + 1}. ${name}`).join('\n') +
        `\n\nVelg ressurs (1-${allResourceRows.length}) eller trykk Avbryt:`,
        "1"
      );
      
      // Sjekk om bruker trykket Avbryt
      if (choice === null) {
        hideToast(0);
        return;
      }
      
      // Valider input
      const selectedIndex = parseInt(choice) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allResourceRows.length) {
        updateToast(`Ugyldig valg. Velg et tall mellom 1 og ${allResourceRows.length}.`);
        hideToast(3000);
        return;
      }
      
      // Bruk valgt ressurs
      resourceRow = allResourceRows[selectedIndex];
    } else if (allResourceRows.length === 1) {
      // Kun én ressurs merket
      resourceRow = allResourceRows[0];
    }
    
    if (resourceRow) {
      disableRows(vids);
      
      const rid = resourceRow.getAttribute("name");
      const resourceNameCell = resourceRow.querySelectorAll("td")[1];
      const resourceName = resourceNameCell ? resourceNameCell.textContent.trim() : "Ukjent";
      
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `/planlegging/ajax-dispatch?did=all&action=assres&rid=${rid}&vid=${encodeURIComponent(vids.join(","))}`);
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        
        updateToast(
          `${vids.length === 1 ? "1 bestilling" : vids.length + " bestillinger"} ` +
          `tildelt ressurs${resourceName ? `: ${resourceName}` : ""}`
        );
        hideToast(3000);
        refreshIfNoSelection();
      };
      
      xhr.onerror = () => {
        updateToast("Feil");
        hideToast(3000);
      };
      
      xhr.send();
      return;
    }
  
    // ============================================================
    // SCENARIO 2: INGEN RESSURS MERKET
    // Tildel til avtale med RB/ERS eller passasjer-regler
    // ============================================================
    
    // Bruk første bestilling for å finne avtale
    const baseVid = vids[0];
    const formData = new URLSearchParams();
    formData.append("sourceList[]", baseVid);
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/planlegging/ajax-dispatch/assignVoppsAssist");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      
      if (xhr.status !== 200) {
        updateToast("POST-request feilet");
        hideToast(3000);
        return;
      }
      
      let postData;
      try {
        postData = JSON.parse(xhr.responseText);
      } catch (e) {
        updateToast("Feil ved parsing av respons");
        hideToast(3000);
        return;
      }
      
      if (!postData.ids || postData.ids.length === 0) {
        updateToast("Ingen data returnert");
        hideToast(3000);
        return;
      }
      
      const data = postData.ids[0];
      const display = postData.display[0];
      
      // Sjekk om første bestilling mangler avtale
      if (!data.agreementId || data.agreementId.trim() === "") {
        updateToast(
          `✗ Første bestilling (${display.requisitionName}) mangler avtale.\n` +
          `Kan ikke tildele.`
        );
        hideToast(5000);
        return;
      }
      
      // Grå ut bestillinger som skal tildeles
      disableRows(vids);
      
      let agreementId = data.agreementId;
      let ruleApplied = false;
      
      // Anvend RB/ERS-regel hvis aktuelt
      if (hasRB && RB_ERS_RULES[agreementId]) {
        agreementId = RB_ERS_RULES[agreementId];
        ruleApplied = true;
      }
      // Eller anvend flere-reisende-regel hvis aktuelt
      else if (!hasRB && maxOverlappingPassengers > 3 && MULTIPLE_ORDERS_RULES[agreementId]) {
        agreementId = MULTIPLE_ORDERS_RULES[agreementId];
        ruleApplied = true;
      }
      
      // Utfør tildelingen
      const assignXhr = new XMLHttpRequest();
      assignXhr.open(
        "GET",
        `/planlegging/ajax-dispatch?did=all&action=asstrans&tid=${agreementId}&vid=${encodeURIComponent(vids.join(","))}`
      );
      
      assignXhr.onreadystatechange = () => {
        if (assignXhr.readyState !== 4) return;
        
        // Vis resultat
        if (ruleApplied) {
          updateToast(`${vids.length} bestillinger tildelt avtale iht. oppsett.`);
        } else {
          updateToast(
            `${vids.length === 1 ? "1 bestilling" : vids.length + " bestillinger"} ` +
            `tildelt avtale: ${display.agreementName}`
          );
        }
        
        hideToast(3000);
        refreshIfNoSelection();
      };
      
      assignXhr.onerror = () => {
        updateToast("Feil");
        hideToast(3000);
      };
      
      assignXhr.send();
    };
    
    xhr.onerror = () => {
      updateToast("Feil");
      hideToast(3000);
    };
    
    xhr.send(formData.toString());
  }

  // ============================================================
  // HOTKEY REGISTRERING
  // ============================================================
  if (!window.tildelingScript_AltS && !window.tildelingScript_AltT) {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        runSmartAssignment();
      } else if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        runIndividualAssignment();
      }
    });
    
    window.tildelingScript_AltS = true;
    window.tildelingScript_AltT = true;
  }

  console.log("✅ Smart-tildeling-script lastet");
})();