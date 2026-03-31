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
    "./Nevro pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Hem / Inf pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Bildediagnostikk, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Gastro pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Ønh pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kir / Ort pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Kir / Ort pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Akuttpsyk sengepost, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Revma pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Revma pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Lab prøvetaking, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Beinmasse pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Endo pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Allmennpsyk pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kir/Ort post 4, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Kir/Ort post 4, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "LMS, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Mottakelsen, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med B Hjerte, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kir dagenhet, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med B Nyre, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Fys med og rehab sengepost, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med D Slag, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med H Gastro, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Urologisk pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Fys med og rehab pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med H Hem, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med. overvåking (MOA), 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Med A Lunge, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "PD pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Med B Hjerte, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "SL. Hovedinngang, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "./Hovedinngang, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Gastro dagbeh, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "SLS, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Geriatrisk pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Kir post 3, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "ARA pol, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    "Fysio- og ergoterapi, 7600 Levanger": "Sykehuset Levanger, 7600 Levanger",
    
    // Sykehuset Namsos - avdelinger/poliklinikker
    "Ort D3, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Ort D3, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Med H5, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Allmennpsyk pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kreft pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Dialyse, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Øye pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Med pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Bildediagnostikk, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kir / Ort pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Kir / Ort pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Ønh pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Kreft pol/laboratoriet, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Urologisk pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Øye pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Bildediagnostikk, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Nevro pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Recovery / Dagkir, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Fedme pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Mottakelsen, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Med H4, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Allmennpsyk sengepost, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Dialyse dagbehandling [NA], 7803 Namsos": "Sykehuset Namsos, 7803 Namsos", 
    "Fysio- og ergoterapi, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Gyn/Føde/Barsel sengepost, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "SN. Hovedinngang, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "./Hovedinngang, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    "Geriatrisk pol, 7803 Namsos": "Sykehuset Namsos, 7803 Namsos",
    
    // St. Olavs hospital 
    "KVB 4. Barn 2 Kirurgi, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "KVB 6. Gynekologi kreft, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "BVS 1. ort pol, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    ".../Gastro 4. Sengeområde Seksjon lindrende behandling, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "Nevro 1. Hovedinngang vest, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "KVB 4. Barn 4, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "AHL 1. Poliklinikk karkirurgi, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    ".../BVS 4. Revma pol, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "AHL 1. Lunge pol, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "FORS 3. Polikinikk endokrinologi, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "KSS 1. Hud pol, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "AHL 5. Sengetun bryst- og endokrinkirurgi, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "AHL 4. Sengetun hjertemedisin (tun 4-5), 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "BVS 1. Skade pol, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "KSS 5. Sengetun hudsykdommer, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",
    "OSS U1 Hemodialyse, 7300 Orkanger": "St. Olavs hospital - Orkdal sjukehus",
    ".../KVB 6. Gynekologi dagbehandling, 7030 Trondheim": "St. Olavs hospital, 7030 Trondheim",

    // Helse Møre og Romsdal / Ålesund Sykehus / Kristiansand Sykehus osv..
    "Dialyseseksjonen Ålesund, 6017 Ålesund": "Ålesund sykehus",
    "Nyrepoliklinikk, 6017 Ålesund": "Ålesund sykehus",
    "Hustadvika Logopedhjelp, Molde/Logoped Ingvild Groven, 6415 Molde": "Romsdalsgata 15, 6415 Molde",
    "Hustadvika Logopedhjelp, Molde, 6415 Molde": "Romsdalsgata 15, 6415 Molde",
    "med. biokjemi lab, 6450 Hjelset": "Sjukehuset Nordmøre og Romsdal (SNR)",
    "Dialysen Kristiansund, 6508 Kristiansund N": "Kristiansund Sykehus",
    "Kreftpoliklinikken DMS, 6508 Kristiansund N": "Kristiansund Sykehus",
    "Kommunefysioterapi Averøy, 6530 Averøy": "Averøyveien 424, 6530 Averøy",

    // Diverse adresser 
    "Forradalsvegen 231, 7520 Hegra": "Fv28 231, 7520 Hegra",
    "Bjønndalsvegen 54A, 7670 Inderøy": "63.843515, 11.120222",
    "Brit&Brits/Fys. Heia, 7800 Namsos": "Brit & Brits Fysioterapi, 7800 Namsos",
    "Brit&amp;Brits/Fys. Heia, 7800 Namsos": "Brit & Brits Fysioterapi, 7800 Namsos",
    "Steinkjer rehab/Fysioterapi, 7725 Steinkjer": "DMS Inn-Trøndelag, 7725 Steinkjer",
    "Steinkjer rehab, 7725 Steinkjer": "DMS Inn-Trøndelag, 7725 Steinkjer",
    "Dialyse, 7725 Steinkjer": "DMS Inn-Trøndelag, 7725 Steinkjer",
    "Rørvik helsesenter/Dialyse, 7900 Rørvik": "Rørvik sykestue, 7900 Rørvik",
    "Fiskarbyen bofelleskap, 7970 Kolvereid": "Bjørkåsvegen 15D, 7970 Kolvereid",
    "Rindal Fysioterapi/Rindal Fysioterapi/Helge Pedersen, 6657 Rindal": "Sjukeheimsvegen 6, 6657 Rindal",
    "Skaun fysio/Fysio. Raquel Dulot Dela Cruz, 7353 Børsa": "Børsa fysioterapi AS, Lensmannsekra 3, 7353 Børsa",
    "Skaun fysio/Fysioterapeut Ida Regine Thorstensen, 7353 Børsa": "Børsa fysioterapi AS, Lensmannsekra 3, 7353 Børsa",
    "./Dagrehab kurbad, 7500 Stjørdal": "Breidablikkvegen 3, 7500 Stjørdal",
    "Seterbakkvegen 5, 7796 FOLLAFOSS": "Seterbakkveien 5, 7796 FOLLAFOSS",
    "Synnesvegen 279, 7960 Salsbruket": "64.81815371052468, 11.902412511524009",
    "Namsskogan fysikalske/Fys. Domås, 7890 Namsskogan": "Storholmveien 6, 7890 Namsskogan",
    "Midtbyen logoped, 7606 Levanger": "Moafjæra 8C, 7606 Levanger",
    "Namdalseid fys., 7750 Namdalseid": "Gløttvegen 2, 7750 Namdalseid",
    "Styrk/Fys. Brandt, 7600 Levanger": "Styrk Fysioterapi, 7600 Levanger",
    "Styrk/Fys. Selseth, 7600 Levanger": "Styrk Fysioterapi, 7600 Levanger",
    "Lierne fysioterapi/Fys. Hellgren, 7882 Nordli": "Stortangveien 16, 7882 Nordli",
    "Fysio og ergoterapitjenesten, 7804 Namsos": "Prestegårdsstien 4, 7804 Namsos",
    "Inderøy kom.fys./Fys. Sende, 7670 Inderøy": "Øvergata 20, 7670 Inderøy",
    "Meråker k.fys./Fys. Berg, 7530 Meråker": "Meråker kommune, Rådhusgata 7, 7530 Meråker",
    "Meråker k.fys., 7530 Meråker": "Meråker kommune, Rådhusgata 7, 7530 Meråker",
    "Flatanger fys., 7770 Flatanger": "Flatanger kommune, Lauvsneshaugen 25, 7770 Flatanger",
    "Fys. Sundrønning, 7770 Flatanger": "Flatanger kommune, Lauvsneshaugen 25, 7770 Flatanger",
    "Fys. Torunn Strøm, 7770 Flatanger": "Flatanger kommune, Lauvsneshaugen 25, 7770 Flatanger",
    "Vikna fysikalske, 7900 Rørvik": "Rørvik Helsehus, Kirkegata 10, 7900 Rørvik",
    "Inderøy kom.fys./Fys. Carlson, 7670 Inderøy": "Øvergata 20, 7670 Inderøy",
    "Frosta kom.fys./Varmebasseng, 7633 Frosta": "Nertunet 25, 7633 Frosta",
    "Fys. Tore Øseth, 7970 Kolvereid": "Sentrum campus, 7970 Kolvereid",
    
    // ============================================================
    // LEGG TIL FLERE MAPPINGS HER ETTER BEHOV:
    // "Problematisk adresse": "Korrekt adresse",
    // ============================================================
  };

  /**
   * Fjerner problematiske husnummer-suffikser (H0123, U0123 etc)
   * @param {string} address - Original adresse
   * @returns {string} - Adresse uten suffikser
   */
  function cleanAddressSuffixes(address) {
    // Fjern space etterfulgt av H eller U og 4 siffer
    // Eksempel: "NAMSOSVEGEN 23 H0201, 7750 NAMDALSEID" → "NAMSOSVEGEN 23, 7750 NAMDALSEID"
    return address.replace(/\s+[HU]\d{4}(?=,)/g, '');
  }

  /**
   * Parser en tidsstreng (HH:MM) til minutter fra midnatt
   * @param {string} timeStr - Tidsstreng f.eks. "08:30"
   * @returns {number|null} - Minutter fra midnatt, eller null
   */
  function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  /**
   * Normaliserer en adresse ved å sjekke om den finnes i mapping-listen
   * @param {string} address - Original adresse
   * @returns {string} - Normalisert adresse (eller original hvis ingen mapping)
   */
  function normalizeAddress(address) {
    // Først: Fjern problematiske suffikser
    const cleanedAddress = cleanAddressSuffixes(address);
    const trimmedAddress = cleanedAddress.trim();
    
    // Sjekk om adressen finnes i mapping-listen
    if (ADDRESS_MAPPINGS.hasOwnProperty(trimmedAddress)) {
      const normalized = ADDRESS_MAPPINGS[trimmedAddress];
      return normalized;
    }
    
    // Ingen mapping funnet - returner renset adresse
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
        showErrorToast("🗺️ Ingen bestillinger eller turer er valgt. Vennligst marker én eller flere og trykk på Rutekalkulering-knappen eller Alt+Q igjen.");
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
      // PROSESSER ALLE MERKEDE BESTILLINGER I FELLES POOL
      // Ventende og pågående behandles likt: sorteres kronologisk
      // etter hentetid, grupperes i segmenter der passasjerer sitter
      // i bilen samtidig (hente-adresser først, lever-adresser etter).
      // ============================================================
      const allBookings = [];

      // Felles hjelpefunksjon: finn kolonneindeks via header-link-attributt
      function findColIdx(tableSelector, headerLink) {
        const headers = document.querySelectorAll(`${tableSelector} thead th`);
        for (let i = 0; i < headers.length; i++) {
          if (headers[i].querySelector(`a[href*="${headerLink}"]`)) return i;
        }
        return -1;
      }

      // --- Ventende rader: kolonneindekser fra #ventendeoppdrag ---
      const vStartIdx   = findColIdx('#ventendeoppdrag', 'tripStartDate');
      const vTreatIdx   = findColIdx('#ventendeoppdrag', 'tripTreatmentDate');
      const vAdresseIdx = findColIdx('#ventendeoppdrag', 'tripFromAddress'); // Fra+Til i samme kolonne

      ventendeRows.forEach(row => {
        const cells = [...row.querySelectorAll("td")];

        // Hent adressecelle via kolonneindeks, fall tilbake på td.d med <br>
        const addressCell = vAdresseIdx !== -1
          ? cells[vAdresseIdx]
          : [...row.querySelectorAll("td.d")].find(cell => cell.innerHTML.includes("<br>"));
        if (!addressCell) return;

        const parts = addressCell.innerHTML
          .split(/<br\s*\/?>/i)
          .map(part => part.trim());

        const fromAddresses = [];
        const toAddresses = [];
        if (addressRegex.test(parts[0])) {
          fromAddresses.push(normalizeAddress(parts[0].replace(/\s+/g, " ")));
        }
        if (parts[1] && addressRegex.test(parts[1])) {
          toAddresses.push(normalizeAddress(parts[1].replace(/\s+/g, " ")));
        }
        if (!fromAddresses.length && !toAddresses.length) return;

        const startText = vStartIdx !== -1 ? (cells[vStartIdx]?.textContent.trim() ?? '') : '';
        const treatText = vTreatIdx !== -1 ? (cells[vTreatIdx]?.textContent.trim() ?? '') : '';

        allBookings.push({
          pickupTime:   parseTime(startText),
          deliveryTime: parseTime(treatText),
          fromAddresses,
          toAddresses
        });
      });

      // --- Pågående rader: kolonneindekser fra #pagaendeoppdrag ---
      const pStartIdx  = findColIdx('#pagaendeoppdrag', 'tripStartTime');
      const pTreatIdx  = findColIdx('#pagaendeoppdrag', 'tripTreatmentDate');
      const pFromIdx   = findColIdx('#pagaendeoppdrag', 'tripFromAddress');
      const pToIdx     = findColIdx('#pagaendeoppdrag', 'tripToAddress');
      const pStatusIdx = findColIdx('#pagaendeoppdrag', 'resourceStatus');

      paagaaendeRows.forEach(row => {
        if (pFromIdx === -1 || pToIdx === -1) return;
        const cells = [...row.querySelectorAll("td")];

        // Sjekk om det er en sammensatt tur (div.row-image per sub-oppdrag)
        const rowImages = pStartIdx !== -1
          ? cells[pStartIdx]?.querySelectorAll('div.row-image')
          : null;

        if (rowImages && rowImages.length > 0) {
          // Sammensatt tur: behandle hvert sub-oppdrag som egen booking
          rowImages.forEach((_, i) => {
            const status = pStatusIdx !== -1
              ? cells[pStatusIdx]?.querySelectorAll('div.row-image')[i]?.textContent.trim()
              : '';
            if (status === 'Framme') return;

            const fromText = cells[pFromIdx]?.querySelectorAll('div.row-image')[i]?.textContent.trim() ?? '';
            const toText   = cells[pToIdx]  ?.querySelectorAll('div.row-image')[i]?.textContent.trim() ?? '';
            const fromAddresses = addressRegex.test(fromText) ? [normalizeAddress(fromText.replace(/\s+/g, " "))] : [];
            const toAddresses   = addressRegex.test(toText)   ? [normalizeAddress(toText.replace(/\s+/g, " "))]   : [];
            if (!fromAddresses.length && !toAddresses.length) return;

            const startText = cells[pStartIdx]?.querySelectorAll('div.row-image')[i]?.textContent.trim() ?? '';
            const treatText = pTreatIdx !== -1
              ? (cells[pTreatIdx]?.querySelectorAll('div.row-image')[i]?.textContent.trim() ?? '')
              : '';

            allBookings.push({
              pickupTime:   parseTime(startText),
              deliveryTime: parseTime(treatText),
              fromAddresses,
              toAddresses
            });
          });
        } else {
          // Enkelt oppdrag
          const fromText = cells[pFromIdx]?.textContent.trim() ?? '';
          const toText   = cells[pToIdx]  ?.textContent.trim() ?? '';
          const fromAddresses = addressRegex.test(fromText) ? [normalizeAddress(fromText.replace(/\s+/g, " "))] : [];
          const toAddresses   = addressRegex.test(toText)   ? [normalizeAddress(toText.replace(/\s+/g, " "))]   : [];
          if (!fromAddresses.length && !toAddresses.length) return;

          const startText = pStartIdx !== -1 ? (cells[pStartIdx]?.textContent.trim() ?? '') : '';
          const treatText = pTreatIdx !== -1 ? (cells[pTreatIdx]?.textContent.trim() ?? '') : '';

          allBookings.push({
            pickupTime:   parseTime(startText),
            deliveryTime: parseTime(treatText),
            fromAddresses,
            toAddresses
          });
        }
      });

      // Normaliser returturer: levertid før hentetid = dårlig NISSY-datakvalitet
      // Sett levertid = hentetid slik at segmentlogikken håndterer dem korrekt
      for (const booking of allBookings) {
        if (booking.pickupTime !== null && booking.deliveryTime !== null &&
            booking.deliveryTime < booking.pickupTime) {
          booking.deliveryTime = booking.pickupTime;
        }
      }

      // Sorter kronologisk etter hentetid (bestillinger uten tid legges til slutt)
      allBookings.sort((a, b) => {
        if (a.pickupTime === null && b.pickupTime === null) return 0;
        if (a.pickupTime === null) return 1;
        if (b.pickupTime === null) return -1;
        return a.pickupTime - b.pickupTime;
      });

      // Grupper i segmenter: B tilhører samme segment som A hvis
      // B.pickupTime <= maks-levertid i segmentet (overlapper i bilen).
      // 5-minutters margin for returturer der hentetid ≈ levertid.
      const RETURN_TRIP_MARGIN = 5;
      const segments = [];
      if (allBookings.length > 0) {
        let currentSegment = [allBookings[0]];
        let segmentMaxDelivery = allBookings[0].deliveryTime;

        for (let i = 1; i < allBookings.length; i++) {
          const booking = allBookings[i];
          const overlaps = booking.pickupTime !== null &&
                           segmentMaxDelivery !== null &&
                           booking.pickupTime <= segmentMaxDelivery + RETURN_TRIP_MARGIN;

          if (overlaps) {
            currentSegment.push(booking);
            if (booking.deliveryTime !== null) {
              segmentMaxDelivery = Math.max(segmentMaxDelivery, booking.deliveryTime);
            }
          } else {
            segments.push(currentSegment);
            currentSegment = [booking];
            segmentMaxDelivery = booking.deliveryTime;
          }
        }
        segments.push(currentSegment);
      }

      // Bygg adresseliste: per segment → alle hente-adresser, så alle lever-adresser
      const allAddresses = [];
      for (const segment of segments) {
        for (const booking of segment) {
          allAddresses.push(...booking.fromAddresses);
        }
        for (const booking of segment) {
          allAddresses.push(...booking.toAddresses);
        }
      }
      
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
