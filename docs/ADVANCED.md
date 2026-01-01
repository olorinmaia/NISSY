# NISSY Advanced - Avansert brukerveiledning

![NISSY Advanced](https://img.shields.io/badge/NISSY-Advanced-orange)

## 🎯 For hvem?

NISSY Advanced er for deg som:
- Har erfaring med NISSY Basic
- Trenger avansert tildelingsfunksjonalitet
- Vil spare tid på repetitive oppgaver
- Håndterer mange bestillinger daglig

## 📦 Hva får du?

### Alt fra Basic, pluss:

- ✅ **Smart-tildeling.js** - Intelligent tildeling med RB/ERS og passasjerregler
- ✅ **Rek-knapper.js** - Hurtigknapper for redigering, hendelseslogg, kopiering, m.m.

### Nye snarveier:

| Snarvei | Funksjon |
|---------|----------|
| `ALT+S` | Smart tildeling (RB/ERS + passasjerregler) |
| `ALT+T` | Tilordningsstøtte 2.0 (individuell tildeling) |
| `ALT+R` | Rek-knapper (H, S, K, T, R) |

## 📥 Installasjon

### Opprett bokmerke

Kopier og lim inn som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

Navn: `NISSY Advanced`

## 🚀 Nye funksjoner

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

**Avtale-regler:**

**RB/ERS-regler** (når RB eller ERS finnes):
```
4116→4120, 8942→9041, 8918→9035, 8948→9043, 8950→9043,
8922→9034, 8932→9039, 8946→9114, 8920→9035, 8928→9038,
8914→9031, 8934→9040, 8936→9040, 8954→9045, 8958→9046,
8940→9041, 8952→9044, 8956→9045, 8930→9037, 8938→9039,
8926→9038, 8916→9032, 8960→9046, 8924→9036, 8944→9042
```

**Flere reisende-regler** (når >3 samtidig reisende, UTEN RB/ERS):
```
8942→8943, 8918→8919, 8948→8949, 8950→8951, 8922→8923,
8932→8933, 8946→8947, 8920→8921, 8928→8929, 8914→8915,
8934→8935, 8936→8937, 8954→8955, 8958→8959, 8940→8941,
8952→8953, 8956→8957, 8930→8931, 8938→8939, 8926→8927,
8916→8917, 8960→8961, 8924→8925, 8944→8945
```

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

## ⌨️ Komplette snarveier

### Fra NISSY Basic:

Se [BASIC.md](BASIC.md) for alle grunnleggende snarveier.

### Nye i Advanced:

| Snarvei | Funksjon | Beskrivelse |
|---------|----------|-------------|
| `ALT+S` | Smart tildeling | RB/ERS og passasjerregler |
| `ALT+T` | Tilordningsstøtte 2.0 | Individuell tildeling |
| `ALT+R` | Rek-knapper | H, S, K, T, R knapper |

## 💡 Arbeidsflyt-eksempler

### Scenario 1: Mange bestillinger med RB

1. `ALT+V` - Merk alle ventende bestillinger
2. `ALT+S` - Smart tildeling (velger automatisk RB-avtale)
3. Ferdig!

### Scenario 2: Individuell tildeling

1. Merk bestillinger som skal ha egen avtale
2. `ALT+T` - Tilordningsstøtte 2.0
3. Se resultat i popup

### Scenario 3: Rask redigering

1. Merk bestillinger som skal redigeres
2. `ALT+R` - Vis rek-knapper
3. Klikk `R` på hver rad for å redigere
4. ESC for å lukke

### Scenario 4: Retur-turer

1. Merk bestilling
2. `ALT+R` - Vis rek-knapper
3. Klikk `T` - Lag retur og link sammen
4. Modal åpnes med returbestilling

## 🆙 Oppgradering til Expert

NISSY Expert legger til:
- Avbestilling (ALT+K) - Masseavbestill turer

[Se EXPERT.md](EXPERT.md)

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

1. **Kombiner snarveier**: `ALT+V` → `ALT+S` (merk alle → smart tildel)
2. **Rek-knapper + Smart tildeling**: Rediger først, tildel etterpå
3. **Bruk ALT+T for komplekse situasjoner**: Når hver bestilling trenger egen bil
4. **ESC lukker alt**: Rek-knapper, modaler, popups

## 📞 Support

Fant du en bug eller har forslag?
- Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)

---

**Laget med ❤️ for å gjøre NISSY bedre**
