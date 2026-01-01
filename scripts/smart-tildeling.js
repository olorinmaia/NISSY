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
    console.log("✅ Smart-tildeling er allerede aktiv");
    return;
  }
  window.__smartTildelingInstalled = true;

  console.log("🚀 Starter Smart-tildeling script");

  // ============================================================
  // KONSTANTER
  // ============================================================
  const TARGET_BG = "148, 169, 220"; // Bakgrunnsfarge for merkede rader
  
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
      setTimeout(pressEscKey, 100);
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
      currentToast.style.top = "50%";
      currentToast.style.right = `${window.innerWidth - rect.left + 5}px`;
      currentToast.style.left = "auto";
      currentToast.style.transform = "translate(0%,-50%)";
    } else {
      // Fallback: sentrer på skjermen
      currentToast.style.top = "50%";
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
  // HJELPEFUNKSJON: Simuler ESC-tast
  // ============================================================
  function pressEscKey() {
    document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    }));
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
  // HJELPEFUNKSJON: Sjekk om to tidsperioder overlapper
  // ============================================================
  function periodsOverlap(start1, end1, start2, end2) {
    // Spesialtilfelle: Identiske tider (returturer)
    if (start1 === end1 && start2 === end2) {
      return start1 === start2;
    }
    
    // Normal overlappsjekk
    return start1 < end2 && start2 < end1;
  }

  // ============================================================
  // HJELPEFUNKSJON: Tell maksimalt overlappende passasjerer
  // Analyserer alle turer og finner maks antall samtidige passasjerer
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
      
      const pickupTime = pickupCell ? parseTime(pickupCell.textContent.trim()) : null;
      const deliveryTime = deliveryCell ? parseTime(deliveryCell.textContent.trim()) : null;
      
      if (pickupTime === null || deliveryTime === null) continue;
      
      const companions = getCompanionCount(row);
      const passengers = companions + 1; // +1 for pasienten selv
      
      trips.push({ pickupTime, deliveryTime, passengers, companions });
    }

    if (trips.length === 0) return 0;

    // Grupper turer med identiske tider (returturer)
    const timeGroups = new Map();
    
    for (const trip of trips) {
      if (trip.pickupTime === trip.deliveryTime) {
        const key = trip.pickupTime;
        if (!timeGroups.has(key)) {
          timeGroups.set(key, []);
        }
        timeGroups.get(key).push(trip);
      }
    }

    let maxOverlap = 0;

    // Tell passasjerer i hver tidsgruppe
    for (const [time, group] of timeGroups.entries()) {
      let totalPassengers = 0;
      for (const trip of group) {
        totalPassengers += trip.passengers;
      }
      if (totalPassengers > maxOverlap) {
        maxOverlap = totalPassengers;
      }
    }

    // Sjekk overlapp mellom vanlige turer
    for (let i = 0; i < trips.length; i++) {
      if (trips[i].pickupTime === trips[i].deliveryTime) continue;
      
      let currentOverlap = trips[i].passengers;
      
      for (let j = 0; j < trips.length; j++) {
        if (i === j) continue;
        
        if (periodsOverlap(
          trips[i].pickupTime, trips[i].deliveryTime,
          trips[j].pickupTime, trips[j].deliveryTime
        )) {
          currentOverlap += trips[j].passengers;
        }
      }
      
      if (currentOverlap > maxOverlap) {
        maxOverlap = currentOverlap;
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
    
    if (!rows.length) return;
    
    const vids = rows.map(row => row.getAttribute("name")).filter(Boolean);
    if (!vids.length) return;
    
    showToast(`Tildeler ${vids.length} bestilling${vids.length === 1 ? '' : 'er'}...`);

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
          let msg = `✓ Tildelt ${medAgreement.length} bestilling${medAgreement.length === 1 ? '' : 'er'}:\n`;
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
    
    if (!rows.length) return;
    
    const vids = rows.map(row => row.getAttribute("name")).filter(Boolean);
    const maxOverlappingPassengers = countMaxOverlappingPassengers(rows);
    
    showToast(
      `Tildeler ${vids.length === 1 ? "1 bestilling" : vids.length + " bestillinger"}...\n` +
      `Samtidig reisende: ${maxOverlappingPassengers}`
    );
  
    // Sjekk om RB eller ERS finnes i bestillingene
    const hasRB = rows.some(row => {
      const cells = [...row.querySelectorAll("td")];
      const td = cells.length >= 4 ? cells[cells.length - 4] : null;
      return td ? /RB|ERS/.test(td.textContent) : false;
    });
  
    // Sjekk om en ressurs er merket
    const resourceRow = [...document.querySelectorAll("tr")].find(row => {
      const bg = getComputedStyle(row).backgroundColor;
      const id = row.id || "";
      return bg.includes(TARGET_BG) && 
             id.startsWith("Rxxx") && 
             !row.classList.contains("disabled");
    });
    
    // ============================================================
    // SCENARIO 1: RESSURS ER MERKET
    // Tildel alle bestillinger til denne ressursen
    // ============================================================
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
            `tildelt avtale ${display.agreementName}`
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
      if (e.altKey && e.key === "s") {
        e.preventDefault();
        runSmartAssignment();
      } else if (e.altKey && e.key === "t") {
        e.preventDefault();
        runIndividualAssignment();
      }
    });
    
    window.tildelingScript_AltS = true;
    window.tildelingScript_AltT = true;
  }

  // ============================================================
  // SNARVEI-OVERSIKT
  // ============================================================
  console.log("⌨️  Smart-tildeling snarveier:");
  console.log("   ALT+S → Smart tildeling (RB/ERS + passasjerregler)");
  console.log("   ALT+T → Tilordningsstøtte 2.0 (individuell tildeling)");
  console.log("✅ Smart-tildeling script lastet");

})();
