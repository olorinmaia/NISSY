(() => {
  // ============================================================
  // LØYVENUMMER-KOPIERING OG ÅPNING AV TRØNDERTAXI LØYVEREGISTER
  // ============================================================
  
  // ============================================================
  // TOAST-MELDING
  // Viser en midlertidig melding nederst på skjermen
  // ============================================================
  function showToast(msg, isError = false) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    
    // Styling
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: isError ? "#d9534f" : "#333", // Rød ved feil, grå ellers
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
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    
    // Fade out etter 3 sekunder
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // ============================================================
  // FINN LØYVENUMMER
  // Prøver to metoder: 1) Merket rad i NISSY, 2) turFooter i CTRL
  // ============================================================
  let loyvenummer = null;
  
  // ============================================================
  // METODE 1: MERKET RAD I NISSY
  // Ser etter rad med bakgrunnsfarge rgb(148, 169, 220)
  // ============================================================
  const allMarkedRows = [...document.querySelectorAll("tr")].filter(row =>
    window.getComputedStyle(row).backgroundColor === "rgb(148, 169, 220)" &&
       row.id?.startsWith("R")
                                                                    
  );
  
  if (allMarkedRows.length > 1) {
    // Flere ressurser er merket - vis valg-dialog
    const loyvenumre = allMarkedRows
      .map(row => row.children[1]?.innerText.trim())
      .filter(Boolean);
    
    const choice = prompt(
      `Du har merket ${allMarkedRows.length} ressurser:\n\n` +
      loyvenumre.map((lp, i) => `${i + 1}. ${lp}`).join('\n') +
      `\n\nVelg ressurs (1-${allMarkedRows.length}) eller trykk Avbryt:`,
      "1"
    );
    
    // Sjekk om bruker trykket Avbryt
    if (choice === null) {
      return;
    }
    
    // Valider input
    const selectedIndex = parseInt(choice) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allMarkedRows.length) {
      showToast(`Ugyldig valg. Velg et tall mellom 1 og ${allMarkedRows.length}.`, true);
      return;
    }
    
    // Bruk valgt ressurs
    loyvenummer = loyvenumre[selectedIndex];
    
  } else if (allMarkedRows.length === 1) {
    // Kun én ressurs merket
    loyvenummer = allMarkedRows[0].children[1]?.innerText.trim() || null;
  }
  
  // ============================================================
  // METODE 2: TURFOOTER I CTRL (FALLBACK)
  // Hvis ikke funnet i NISSY, prøv å finne i CTRL sin turFooter
  // ============================================================
  if (!loyvenummer) {
    const footer = document.querySelector("div.turFooter-module__turStatsContent--jEhIv p");
    
    if (footer) {
      // Søk etter mønster: TR-XXXXX
      const match = footer.innerText.match(/TR-\d+/);
      if (match) {
        loyvenummer = match[0];
      }
    }
  }
  
  // ============================================================
  // VALIDER OG KOPIER
  // ============================================================
  let url;
  
  if (!loyvenummer) {
    // Fant ikke løyvenummer - åpne generell oversikt
    showToast(
      "🚖 Fant ikke løyvenummer verken fra markert ressurs i NISSY eller turbehandling i CTRL. Åpner løyveregister til Trøndertaxi..",
      false // Normal melding (grå bakgrunn)
    );
    url = "https://pasientreiser.tronder.taxi/Loyver/Oversikt";
  } else {
    // Kopier til clipboard
    navigator.clipboard.writeText(loyvenummer)
      .then(() => {
        showToast(`Løyvenummer kopiert: ${loyvenummer}`);
      })
      .catch(() => {
        showToast("Kunne ikke kopiere til clipboard", true);
      });
    
    // Åpne med spesifikt løyvenummer
    url = `https://pasientreiser.tronder.taxi/Loyver/Oversikt?Loyve=${encodeURIComponent(loyvenummer)}`;
  }
  
  // ============================================================
  // ÅPNE TRØNDERTAXI SITT LØYVEREGISTER I NYTT VINDU
  // Åpner pasientreiser.tronder.taxi/Loyver/Oversikt
  // ============================================================
  
  // Beregn vindus-dimensjoner (halvparten av bredde, 90% av høyde)
  const width = Math.floor(window.innerWidth / 2);
  const height = Math.floor(window.innerHeight * 0.9);
  
  // Åpne vindu
  window.open(
    url,
    "PasientreiserOversikt", // Vindu-navn (gjenbruker samme vindu hvis allerede åpent)
    `width=${width},height=${height},left=0,top=50,resizable=yes,scrollbars=yes`
  );
})();
