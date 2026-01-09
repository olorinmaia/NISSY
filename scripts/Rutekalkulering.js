(() => {
  // ============================================================
  // RUTEKALKULERING SCRIPT (ALT+Q)
  // Åpner Google Maps med rute basert på merkede bestillinger
  // ============================================================

  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__RuteKalkHotkeyInstalled) {
    console.log("✅ Rutekalkulering-script er allerede aktiv");
    return;
  }
  window.__RuteKalkHotkeyInstalled = true;

  console.log("🚀 Starter Rutekalkulering-script");

  // ============================================================
  // ADRESSE-NORMALISERING
  // Konverterer adresser som Google Maps ikke finner
  // til korrekte adresser
  // ============================================================
  const ADDRESS_MAPPINGS = {
    // Sykehuset Levanger - poliklinikker/avdelinger
    "Øye pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Dialyse, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Kreft pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kreft pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Nyre pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Lunge pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Nevro pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Hem / Inf pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Bildediagnostikk, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Gastro pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Ønh pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kir / Ort pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Kir / Ort pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Akuttpsyk sengepost, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Revma pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",

    

    // Sykehuset Namsos - avdelinger/poliklinikker
    "Ort D3, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Ort D3, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Allmennpsyk pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kreft pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Dialyse, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Øye pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Med pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Bildediagnostikk, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kir / Ort pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Ønh pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kreft pol/laboratoriet, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Urologisk pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Øye pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Bildediagnostikk, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Nevro pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Recovery / Dagkir, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    
    // ============================================================
    // LEGG TIL FLERE MAPPINGS HER ETTER BEHOV:
    // "Problematisk adresse": "Korrekt adresse",
    // ============================================================
  };

  /**
   * Normaliserer en adresse ved å sjekke om den finnes i mapping-listen
   * @param {string} address - Original adresse
   * @returns {string} - Normalisert adresse (eller original hvis ingen mapping)
   */
  function normalizeAddress(address) {
    const trimmedAddress = address.trim();
    
    // Sjekk om adressen finnes i mapping-listen
    if (ADDRESS_MAPPINGS.hasOwnProperty(trimmedAddress)) {
      const normalized = ADDRESS_MAPPINGS[trimmedAddress];
      return normalized;
    }
    
    // Ingen mapping funnet - returner original adresse
    return trimmedAddress;
  }

  // ============================================================
  // GOOGLE MAPS CONSENT-HÅNDTERING
  // Google Maps krever at bruker godtar vilkår første gang
  // ============================================================
  function ensureGoogleConsent(callback) {
    // Sjekk om bruker allerede har godtatt vilkår (lagret i sessionStorage)
    if (sessionStorage.getItem("gmapsConsentOK") === "1") {
      callback(true);
      return;
    }
  
    // Vis instruksjon til bruker
    alert(
      "Google Maps må åpnes én gang for å godta vilkår.\n\n" +
      "Godta vilkår, lukk vinduet – trykk Alt+Q igjen."
    );
    
    // Åpne Google Maps i nytt vindu
    const googleMapsWindow = window.open(
      "https://www.google.no/maps",
      "_blank",
      "width=800,height=600"
    );
  
    // Sjekk om popup ble blokkert
    if (!googleMapsWindow) {
      alert("Popup blokkert – tillat popup og prøv igjen.");
      callback(false);
      return;
    }
  
    // Poll for å sjekke om vinduet er lukket
    const checkInterval = setInterval(() => {
      if (googleMapsWindow.closed) {
        clearInterval(checkInterval);
        // Marker at bruker har godtatt vilkår
        sessionStorage.setItem("gmapsConsentOK", "1");
      }
    }, 500);
    
    // Returner false siden bruker må godta først
    callback(false);
  }

  // ============================================================
  // HOTKEY REGISTRERING: ALT+Q
  // ============================================================
  document.addEventListener("keydown", (e) => {
    // Sjekk om ALT+Q er trykket
    if (!(e.altKey && e.key.toLowerCase() === "q")) return;
    e.preventDefault();

    // Sjekk Google Maps consent først
    ensureGoogleConsent((consentOK) => {
      if (!consentOK) {
        // Bruker må godta vilkår først
        return;
      }

      // ============================================================
      // FINN MERKEDE RADER
      // ============================================================
      const TARGET_BG = "148, 169, 220"; // Bakgrunnsfarge for merkede rader
      
      // Finn alle rader med riktig bakgrunnsfarge
      const allMarkedRows = Array.from(document.querySelectorAll("tr"))
        .filter(row => window.getComputedStyle(row).backgroundColor.includes(TARGET_BG));

      // Del opp i ventende og pågående oppdrag
      const ventendeRows = allMarkedRows.filter(row => (row.id || "").startsWith("V-"));
      const paagaaendeRows = allMarkedRows.filter(row => (row.id || "").startsWith("P-"));

      // Sjekk om vi fant noen rader
      if (!ventendeRows.length && !paagaaendeRows.length) {
        alert("Fant ingen markerte rader.");
        return;
      }

      // ============================================================
      // REGEX FOR ADRESSE-VALIDERING
      // Matcher adresser som inneholder postnummer (4 siffer)
      // Eksempel: "Olav Tryggvasons gate 28, 7011 Trondheim"
      // ============================================================
      const addressRegex = /,\s*\d{4}\s+\S.*$/;

      // ============================================================
      // HJELPEFUNKSJON: Fjern duplikater som følger etter hverandre
      // Fjerner også duplikater av normaliserte adresser (f.eks. forskjellige
      // avdelinger på samme sykehus som er blitt konvertert til samme adresse)
      // [A, A, B, C, C, A] → [A, B, C, A]
      // ["Dialyse Levanger", "Kreft pol Levanger", "Annen gate"] 
      // → ["Sykehuset Levanger", "Annen gate"]
      // ============================================================
      const removeConsecutiveDuplicates = (array) => {
        return array.filter((value, index) => {
          if (index === 0) return true; // Behold første element alltid
          
          // Normaliser begge adresser før sammenligning
          const currentNormalized = normalizeAddress(value);
          const previousNormalized = normalizeAddress(array[index - 1]);
          
          // Behold bare hvis forskjellig fra forrige (etter normalisering)
          return currentNormalized !== previousNormalized;
        });
      };

      // ============================================================
      // HJELPEFUNKSJON: Bygg Google Maps URL
      // ============================================================
      function buildGoogleMapsUrl(addressList) {
        if (!addressList.length) return null;
        
        const origin = encodeURIComponent(addressList[0]);
        const destination = encodeURIComponent(addressList[addressList.length - 1]);
        
        let url = `https://www.google.no/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        
        // Legg til waypoints hvis det er flere enn 2 adresser
        if (addressList.length > 2) {
          const waypoints = addressList
            .slice(1, -1) // Ta alle utenom første og siste
            .map(encodeURIComponent)
            .join("|");
          url += "&waypoints=" + waypoints;
        }
        
        return url;
      }

      // ============================================================
      // HJELPEFUNKSJON: Hent adresser fra en celle
      // ============================================================
      function extractAddressesFromCell(cell) {
        if (!cell) return [];
        
        const addresses = [];
        
        // Sjekk om cellen har sub-divs (for sammensatte turer)
        const rowDivs = cell.querySelectorAll("div.even.row-image, div.odd.row-image");
        
        if (rowDivs.length) {
          // Cellen har sub-divs - hent fra hver div
          rowDivs.forEach(div => {
            const text = div.textContent.trim();
            if (addressRegex.test(text)) {
              const normalizedText = text.replace(/\s+/g, " "); // Normaliser whitespace
              addresses.push(normalizeAddress(normalizedText)); // Normaliser adresse
            }
          });
        } else {
          // Cellen har kun tekst direkte
          const text = cell.textContent.trim();
          if (addressRegex.test(text)) {
            const normalizedText = text.replace(/\s+/g, " ");
            addresses.push(normalizeAddress(normalizedText)); // Normaliser adresse
          }
        }
        
        return addresses;
      }

      // ============================================================
      // HJELPEFUNKSJON: Filtrer ut adresser merket som "Framme"
      // Brukes for pågående oppdrag hvor noen stopp allerede er besøkt
      // ============================================================
      function filterOutFrammeAddresses(row, addressList) {
        const cells = [...row.querySelectorAll("td")];
        
        // Finn cellen som inneholder status-divs
        const statusCell = cells.find(cell => {
          const divs = [...cell.querySelectorAll("div.even.row-image, div.odd.row-image")];
          return divs.some(div => div.textContent.trim() === "Framme");
        });
        
        if (!statusCell) return addressList; // Ingen "Framme" status funnet
        
        // Hent alle status-divs
        const statusDivs = [...statusCell.querySelectorAll("div.even.row-image, div.odd.row-image")];
        
        // Filtrer ut adresser hvor tilsvarende status er "Framme"
        return addressList.filter((address, index) => {
          return statusDivs[index]?.textContent.trim() !== "Framme";
        });
      }

      // ============================================================
      // PROSESSER VENTENDE OPPDRAG
      // Ventende oppdrag har fra/til i samme celle, separert med <br>
      // ============================================================
      const ventendeFromAddresses = [];
      const ventendeToAddresses = [];
      
      ventendeRows.forEach(row => {
        // Finn celle med klassen 'd' som inneholder <br>
        const addressCell = [...row.querySelectorAll("td.d")].find(cell => 
          cell.innerHTML.includes("<br>")
        );
        
        if (!addressCell) return;
        
        // Split på <br> for å få fra/til
        const parts = addressCell.innerHTML
          .split(/<br\s*\/?>/i)
          .map(part => part.trim());
        
        // Legg til fra-adresse
        if (addressRegex.test(parts[0])) {
          const normalizedAddress = parts[0].replace(/\s+/g, " ");
          ventendeFromAddresses.push(normalizeAddress(normalizedAddress));
        }
        
        // Legg til til-adresse
        if (addressRegex.test(parts[1])) {
          const normalizedAddress = parts[1].replace(/\s+/g, " ");
          ventendeToAddresses.push(normalizeAddress(normalizedAddress));
        }
      });

      // ============================================================
      // PROSESSER PÅGÅENDE OPPDRAG
      // Pågående oppdrag har separate celler for hver adresse
      // ============================================================
      const paagaaendeFromAddresses = [];
      const paagaaendeToAddresses = [];
      
      paagaaendeRows.forEach(row => {
        // Finn alle celler som inneholder adresser
        const addressCells = [...row.querySelectorAll("td")]
          .filter(cell => extractAddressesFromCell(cell).length > 0);
        
        if (!addressCells.length) return;
        
        // Første celle = fra-adresser
        let fromAddresses = filterOutFrammeAddresses(
          row, 
          extractAddressesFromCell(addressCells[0])
        );
        paagaaendeFromAddresses.push(...fromAddresses);
        
        // Resten av cellene = til-adresser
        for (let i = 1; i < addressCells.length; i++) {
          let toAddresses = filterOutFrammeAddresses(
            row,
            extractAddressesFromCell(addressCells[i])
          );
          paagaaendeToAddresses.push(...toAddresses);
        }
      });

      // ============================================================
      // KOMBINER ALLE ADRESSER I RIKTIG REKKEFØLGE
      // Rekkefølge: ventende fra → pågående fra → ventende til → pågående til
      // Dette gir en logisk flyt gjennom alle stopp
      // ============================================================
      const allAddresses = [
        ...ventendeFromAddresses,
        ...paagaaendeFromAddresses,
        ...ventendeToAddresses,
        ...paagaaendeToAddresses
      ];
      
      // Fjern duplikater som følger etter hverandre
      const finalAddressList = removeConsecutiveDuplicates(allAddresses);

      // Sjekk om vi fant noen adresser
      if (!finalAddressList.length) {
        alert("Ingen adresser funnet.");
        return;
      }

      // ============================================================
      // BYGG OG ÅPNE GOOGLE MAPS URL
      // ============================================================
      const googleMapsUrl = buildGoogleMapsUrl(finalAddressList);
      
      if (!googleMapsUrl) {
        alert("Kunne ikke lage Google Maps-URL.");
        return;
      }

      // Åpne Google Maps i nytt vindu (halvparten av skjermbredden)
      window.open(
        googleMapsUrl,
        "_blank",
        `width=${innerWidth / 2},height=${innerHeight * 0.9},left=0,top=50,resizable=yes,scrollbars=yes`
      );
    });
  });

  console.log("✅ Rutekalkulering-script lastet");
})();
