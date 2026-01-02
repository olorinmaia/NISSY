# NISSY Expert - Full funksjonalitet

![NISSY Expert](https://img.shields.io/badge/NISSY-Expert-red)

## 🎯 For hvem?

NISSY Expert er for deg som:
- Vil ha **ALT** tilgjengelig funksjonalitet
- Er power user og ønsker maksimal effektivitet
- Håndterer store mengder data daglig
- Vil ha alle fremtidige features automatisk

## 📦 Hva får du?

### Alt fra Advanced, pluss:

- ✅ **Avbestilling.js** - Masseavbestilling av turer

**Totalt 6 scripts:**
1. NISSY-fiks.js
2. Smart-tildeling.js
3. Rek-knapper.js
4. Rutekalkulering.js
5. Ressursinfo.js
6. Avbestilling.js

## 📥 Installasjon

### Opprett bokmerke

Kopier og lim inn som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-expert.js');eval(await s.text());})();
```

Navn: `NISSY Expert`

## 🚀 Eksklusive funksjoner

### Avbestilling (ALT+K)

Masseavbestill merkede ressurser eller alle med status "Tildelt".

**Slik bruker du:**

1. **Alternativ 1 - Merkede ressurser:**
   - Merk ressursene du vil avbestille
   - Trykk `ALT+K`
   - Popup viser merkede ressurser
   - Klikk "Avbestill valgte"

2. **Alternativ 2 - Alle "Tildelt":**
   - Trykk `ALT+K` (ingen merking nødvendig)
   - Popup viser alle ressurser med status "Tildelt"
   - Klikk "Avbestill tildelte"

**Popup viser:**
- Liste over ressurser som skal avbestilles
- To separate knapper for valgte vs. tildelte
- Progressbar under avbestilling
- Resultatmelding

**Sikkerhet:**
- Ignorerer ressurser med status "Framme", "Startet", "Bomtur"
- Ingen ventende eller pågående oppdrag avbestilles
- Kun ressurser påvirkes

## ⌨️ Komplette snarveier

### Grunnleggende (fra NISSY Basic)

| Snarvei | Funksjon |
|---------|----------|
| `ENTER` | Søk (i søkefelt) |
| `ESC` | Nullstill søk + fokus |
| `ALT+F` | Fokus søkefelt |
| `F5` | Refresh data |
| `CTRL+1` | Fokus filter ventende oppdrag |
| `CTRL+2` | Fokus filter ressurser |
| `ALT+W` | Vis i kart |
| `ALT+G` | Tildel oppdrag |
| `ALT+B` | Blank |
| `ALT+P` | Merk alle pågående ressurser |
| `ALT+V` | Merk alle ventende bestillinger |

### Avansert (fra NISSY Advanced)

| Snarvei | Funksjon |
|---------|----------|
| `ALT+S` | Smart tildeling |
| `ALT+T` | Tilordningsstøtte 2.0 |
| `ALT+R` | Rek-knapper |

### Verktøy

| Snarvei | Funksjon |
|---------|----------|
| `ALT+Q` | Rutekalkulator (Google Maps) |
| `ALT+D` | Ressursinfo |

### Expert-eksklusiv

| Snarvei | Funksjon |
|---------|----------|
| `ALT+K` | **Avbestilling** |

## 💡 Avanserte arbeidsflyter

### Scenario 1: Fullstendig opprydding
```
1. ALT+K → Velg "Avbestill tildelte"
2. Vent på fullføring
3. F5 → Refresh data
4. Ferdig!
```

### Scenario 2: Selektiv avbestilling
```
1. Merk ressurser som skal avbestilles
2. ALT+K → "Avbestill valgte"
3. Bekreft i popup
4. F5 → Refresh
```

### Scenario 3: Kompleks tildeling + opprydding
```
1. ALT+V → Merk alle ventende
2. ALT+S → Smart tildeling
3. ALT+K → Avbestill gamle tildelte
4. ALT+Q → Sjekk rute
5. F5 → Refresh
```

### Scenario 4: Full redigering med rek-knapper
```
1. Merk bestillinger
2. ALT+R → Vis rek-knapper
3. Bruk H/S/K/T/R etter behov
4. ALT+S → Smart tildel når ferdig
5. ESC → Lukk rek-knapper
```

## 🎓 Expert-tips

### Effektivitet

1. **Tastatur-first**: Bruk kun tastatursnarveier, unngå mus
2. **Kombiner snarveier**: Kjed sammen for maksimal effekt
3. **F5 er din venn**: Refresh etter hver større operasjon
4. **ESC lukker alt**: Bruk liberalt for å rydde opp

### Avbestilling

1. **Sjekk alltid før avbestilling**: Popup viser hva som påvirkes
2. **Bruk "Tildelt"-funksjonen**: Rask opprydding i slutten av dagen
3. **Kombiner med smart tildeling**: Avbestill gammelt, tildel nytt

### Rek-knapper

1. **T-knappen (retur)**: Lager automatisk returbestilling og linker
2. **Modal posisjonering**: Venstreorientert for ventende, høyreorientert for pågående
3. **Auto-fokus**: Hentetid-felt får fokus automatisk ved redigering

### Smart tildeling

1. **Visuell feedback**: Bestillinger gråes ut under planlegging
2. **Kø-støtte**: Kan planlegge flere batch mens tidligere pågår
3. **Refresh kun ved behov**: Hvis nye rader merkes, venter systemet

## 🔧 Feilsøking

### Avbestilling feiler

- Sjekk at ressursene ikke har status "Framme", "Startet", eller "Bomtur"
- Verifiser i konsollen (F12) for feilmeldinger
- Ressurser uten gyldig ID hoppes over

### For mange scripts lastes

- Sjekk konsollen: Skal se "✅ NISSY Expert lastet!"
- Hver script har guard mot dobbel-lasting
- Last siden på nytt hvis noe virker rart

### Snarveier kolliderer

- Alle snarveier er unike
- ESC lukker aktive popups/modaler
- Ved konflikt: Last siden på nytt og kjør bokmerket igjen

## 📊 Oversikt alle features

| Feature | Basic | Advanced | Expert |
|---------|-------|----------|--------|
| Tastatursnarveier | ✅ | ✅ | ✅ |
| Kolonnejusteringer | ✅ | ✅ | ✅ |
| Rutekalkulator (ALT+Q) | ✅ | ✅ | ✅ |
| Ressursinfo (ALT+D) | ✅ | ✅ | ✅ |
| Smart tildeling (ALT+S) | ❌ | ✅ | ✅ |
| Tilordning 2.0 (ALT+T) | ❌ | ✅ | ✅ |
| Rek-knapper (ALT+R) | ❌ | ✅ | ✅ |
| Avbestilling (ALT+K) | ❌ | ❌ | ✅ |

## 🚀 Fremtidige features

Som Expert-bruker får du automatisk:
- Alle nye scripts som legges til
- Oppdateringer av eksisterende funksjoner
- Beta-features før andre

**Ingen ekstra installasjon nødvendig!**

## 📞 Support og bidrag

### Fant en bug?
Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)

### Har et forslag?
Pull requests er velkomne!

### Vil dele med andre?
Del bokmerke-lenken - alt er open source!

---

**❤️ Make NISSY great again!**
