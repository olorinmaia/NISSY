# NISSY Advanced - Avansert brukerveiledning

![NISSY Advanced](https://img.shields.io/badge/NISSY-Advanced-orange)

## ⌨️ Alle tastatursnarveier

### Søk og navigasjon

| Snarvei | Funksjon |
|---------|----------|
| `ALT+F` | Fokus søkefelt (marker eksisterende tekst) |
| `ENTER` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk og sett fokus tilbake til søkefelt |
| `F5` | Refresh all data (openPopp) |

### Filter

| Snarvei | Funksjon |
|---------|----------|
| `CTRL+1` | Fokus til filter ventende oppdrag |
| `CTRL+2` | Fokus til filter ressurser |

### Oppdragshåndtering

| Snarvei | Funksjon |
|---------|----------|
| `ALT+W` | Vis i kart |
| `ALT+G` | Tildel oppdrag (åpner tildelingsdialogg) |
| `ALT+B` | Blank (fjern alle markeringer) |
| `ALT+P` | Merk alle ressurser i pågående oppdrag |
| `ALT+V` | Merk alle bestillinger i ventende oppdrag |

### Verktøy

| Snarvei | Funksjon |
|---------|----------|
| `ALT+S` | Smart tildeling (RB/ERS + passasjerregler) |
| `ALT+T` | Tilordningsstøtte 2.0 (individuell tildeling) |
| `ALT+R` | Rek-knapper (H, S, K, T, R) |
| `ALT+Q` | Åpne rutekalkulator i Google Maps |
| `ALT+D` | Vis ressursinfo popup |

## 📥 Installasjon

### Opprett bokmerke

Kopier og lim inn som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

Navn: `NISSY-Avansert`

## 📖 Detaljert brukerveiledning

### Rutekalkulator (ALT+Q)

1. Merk én eller flere bestillinger (klikk på radene)
2. Trykk `ALT+Q`
3. Første gang: Godta Google Maps vilkår, lukk vinduet, trykk `ALT+Q` igjen
4. Google Maps åpnes med rute for alle merkede bestillinger

**Tips:**
- Fungerer både for ventende og pågående oppdrag
- Filtrerer automatisk ut stopp som er markert som "Framme"
- Optimaliserer rekkefølgen for logisk flyt

### Ressursinfo (ALT+D)

1. Merk én ressurs
2. Trykk `ALT+D`
3. Popup viser:
   - Faktiske tider og koordinater på hver hendelse
   - Tidspunkt for mottak av 3003 XML
   - Link til NISSY admin for bestilling og tur
   - Telefonnummer til sjåfør (kopieres automatisk til utklippstavle)

### Automatiske kolonnejusteringer

Scriptet justerer automatisk kolonnevisning:

**Skjuler:**
- Ledig kapasitet (pågående oppdrag)
- Transporttype (ventende oppdrag)

**Viser:**
- Behandlingsdato (pågående oppdrag)
- Ledsagere (pågående oppdrag)
- Spesielle krav (pågående oppdrag)
- Pasientnavn (pågående oppdrag)

### Smart Tildeling (ALT+S)

Intelligent tildeling som automatisk:
- Detekterer RB/ERS i bestillinger
- Teller overlappende passasjerer
- Velger riktig avtale basert på regler

**Slik bruker du:**

1. **Merk bestillinger** du vil tildele
2. Trykk `ALT+S`
3. Scriptet:
   - Teller antall samtidig reisende
   - Sjekker om RB/ERS er påkrevd
   - Velger riktig avtale automatisk
   - Viser resultat i toast-melding

**Tildeling til ressurs:**
- Merk også en ressurs → tildeles direkte til ressursen

### Tilordningsstøtte 2.0 (ALT+T)

Tildeler hver bestilling til sin egen avtale (individuelt).

**Bruk:**
1. Merk flere bestillinger
2. Trykk `ALT+T`
3. Hver bestilling får sin egen avtale
4. Resultat vises med detaljer for hver bestilling

**Perfekt for:**
- Ulike pasienter/destinasjoner
- Hver bestilling krever egen bil
- Maksimal fleksibilitet

### Rek-knapper (ALT+R)

Viser hurtigknapper på merkede rader.

**Slik bruker du:**
1. Merk én eller flere rader
2. Trykk `ALT+R`
3. Knapper vises til venstre for hver rad:

| Knapp | Funksjon |
|-------|----------|
| **H** | Hendelseslogg |
| **S** | Manuell statusendring (kun pågående) |
| **K** | Kopier bestilling |
| **T** | Lag retur og link sammen |
| **R** | Rediger |

**Tips:**
- Klikk ESC for å lukke alle rek-knapper
- Knappene følger med ved scrolling
- Automatisk høydetilpasning til rad-bilder

## ❓ Feilsøking

### Smart tildeling velger feil avtale

- Sjekk at RB/ERS-reglene stemmer med ditt oppsett
- Verifiser antall samtidig reisende i toast-meldingen
- Kontakt admin hvis regler må oppdateres

### Rek-knapper vises ikke

- Bekreft at rader er markert (blå bakgrunn)
- Kun ventende og pågående oppdrag støttes
- Ressurs-rader støttes ikke

### Tilordningsstøtte 2.0 feiler

- Sjekk at alle bestillinger har avtale
- Se resultat-popup for detaljer
- Bestillinger uten avtale hoppes over

## 💪 Pro-tips

1. **Kombiner snarveier**: `ALT+V` → `ALT+T` (merk alle → tilordningsstøtte 2.0 (ingen begrensning på antall bestillinger))
2. **Rek-knapper + Smart tildeling**: Rediger først, tildel etterpå
3. **ESC lukker alt**: Rek-knapper, modaler, popups

## 📞 Support

Fant du en bug eller har forslag?
- Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)

---

**❤️ Make NISSY great again!**
