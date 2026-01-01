# HOWTO: Bokmerkepakker for NISSY

Dette dokumentet forklarer hvordan du lager og vedlikeholder ulike pakker av NISSY-scripts for brukere med forskjellige behov.

## 📋 Konsept

I stedet for å vedlikeholde identisk kode i flere filer, bruker vi **loader-scripts** som henter individuelle komponenter fra samme repository.

### Fordeler:
- ✅ **Én kilde** - Vedlikehold kun NISSY-fiks.js, Smart-tildeling.js osv.
- ✅ **Ulike pakker** - Brukere velger sitt nivå (Basic, Advanced, Expert)
- ✅ **Lett å oppdatere** - Endre kun loader-filen for å legge til/fjerne scripts
- ✅ **Versjonering** - Bruk `/main/` eller `/v1.0/` i URL
- ✅ **Public er OK** - Ingen sensitiv data i scriptene

---

## 🗂️ Mappestruktur
```
NISSY/
├── README.md
├── scripts/
│   ├── NISSY-fiks.js           # Kjernekomponenter
│   ├── Smart-tildeling.js      # Individuell komponent
│   ├── Rek-knapper.js          # Individuell komponent
│   ├── Rutekalkulator.js       # Individuell komponent
│   ├── Avbestilling.js         # Individuell komponent
│   ├── Ressursinfo.js          # Individuell komponent
│   ├── loader-basic.js         # 📦 Pakke for nybegynnere
│   ├── loader-advanced.js      # 📦 Pakke for avanserte
│   └── loader-expert.js        # 📦 Pakke med alt
└── docs/
    ├── BASIC.md               # Guide for nybegynnere
    ├── ADVANCED.md            # Guide for avanserte
    └── EXPERT.md              # Guide for eksperter
```

---

## 🔧 Lage Loader-Scripts

### 1. Basic-pakke (scripts/loader-basic.js)

**For hvem:** Nybegynnere som bare trenger grunnleggende funksjoner

**Inneholder:**
- NISSY-fiks.js (tastatursnarveier og kolonnejusteringer)
```javascript
(async () => {
  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
  
  const scripts = [
    'NISSY-fiks.js'
  ];

  console.log('📦 Laster NISSY Basic...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Basic lastet!');
})();
```

**Bokmerke:**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-basic.js');eval(await s.text());})();
```

---

### 2. Advanced-pakke (scripts/loader-advanced.js)

**For hvem:** Erfarne brukere som trenger mer funksjonalitet

**Inneholder:**
- NISSY-fiks.js
- Smart-tildeling.js
- Rek-knapper.js
- Rutekalkulator.js
- Avbestilling.js
```javascript
(async () => {
  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
  
  const scripts = [
    'NISSY-fiks.js',
    'Smart-tildeling.js',
    'Rek-knapper.js',
    'Rutekalkulator.js',
    'Avbestilling.js'
  ];

  console.log('📦 Laster NISSY Advanced...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Advanced lastet!');
})();
```

**Bokmerke:**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

---

### 3. Expert-pakke (scripts/loader-expert.js)

**For hvem:** Power users som vil ha alle features

**Inneholder:**
- Alle scripts (alt tilgjengelig)
```javascript
(async () => {
  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
  
  const scripts = [
    'NISSY-fiks.js',
    'Smart-tildeling.js',
    'Rek-knapper.js',
    'Rutekalkulator.js',
    'Avbestilling.js',
    'Ressursinfo.js'
    // Legg til flere scripts her etter behov
  ];

  console.log('📦 Laster NISSY Expert (alle features)...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Expert lastet!');
})();
```

**Bokmerke:**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-expert.js');eval(await s.text());})();
```

---

## 📝 Vedlikehold

### Legge til nytt script:

1. **Opprett scriptet** (f.eks. `scripts/Ny-funksjon.js`)
2. **Legg til i passende loader:**
```javascript
   const scripts = [
     'NISSY-fiks.js',
     'Smart-tildeling.js',
     'Ny-funksjon.js'  // ← Legg til her
   ];
```
3. **Commit og push** - Alle brukere får automatisk oppdateringen

### Fjerne script:

1. **Fjern fra loader-filen:**
```javascript
   const scripts = [
     'NISSY-fiks.js',
     // 'Gammelt-script.js'  // ← Kommentér ut eller slett
   ];
```
2. **Commit og push**

### Oppdatere eksisterende script:

1. **Rediger scriptet** (f.eks. `scripts/Smart-tildeling.js`)
2. **Commit og push** - Brukere får oppdateringen neste gang de laster siden

---

## 🔒 Hvorfor Public Repository?

**Problem med private repos:**
- `raw.githubusercontent.com` krever GitHub Personal Access Token
- Ikke praktisk for bokmerker
- Komplisert setup for sluttbrukere

**Løsning:**
- Gjør repo public
- Legg til `HVORFOR-PUBLIC.md` i rot:
```markdown
# Hvorfor dette repository er public

Dette repository inneholder kun automatiseringsskript uten sensitive data.

- ✅ Ingen passord, API-nøkler eller tokens
- ✅ Ingen persondata
- ✅ Kun JavaScript-kode for UI-forbedringer

Private gists kan brukes for testing før publisering.
```

---

## 🧪 Testing med Private Gists

For å teste nye features før publisering:

1. **Opprett secret gist** på https://gist.github.com/
2. **Test med bokmerke:**
```javascript
   javascript:(async()=>{const s=await fetch('https://gist.githubusercontent.com/USERNAME/GIST_ID/raw/FILENAME.js');eval(await s.text());})();
```
3. **Når ferdig testet:** Kopier til public repo

---

## 📚 Brukerdokumentasjon

### docs/BASIC.md
```markdown
# NISSY Basic - Nybegynnerveiledning

## 🎯 Hva får du?

- Tastatursnarveier (F5, ALT+F, CTRL+1, etc.)
- Automatisk kolonnetilpasning
- Forbedret søk og filtrering

## 📥 Installasjon

1. Opprett nytt bokmerke i nettleseren
2. Lim inn denne koden som URL:
```
   javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-basic.js');eval(await s.text());})();
```
3. Gi bokmerket navn: "NISSY Basic"
4. Klikk på bokmerket når du er inne i NISSY

## ⌨️ Snarveier

Se [hovedoversikt](../README.md#tastatursnarveier)
```

### docs/ADVANCED.md
```markdown
# NISSY Advanced - Avansert brukerveiledning

## 🎯 Hva får du?

Alt fra Basic, pluss:
- ALT+S: Smart tildeling
- ALT+T: Tilordningsstøtte 2.0
- ALT+R: Rek-knapper
- ALT+Q: Rutekalkulator
- ALT+K: Avbestilling

## 📥 Installasjon

[Samme som Basic, men med loader-advanced.js]

## ⌨️ Alle snarveier

[Komplett liste]
```

### docs/EXPERT.md
```markdown
# NISSY Expert - Full funksjonalitet

## 🎯 Hva får du?

Alt! Alle features og fremtidige oppdateringer.

## 📥 Installasjon

[Samme som Basic, men med loader-expert.js]

## ⚠️ Tips for eksperter

- Sjekk konsollen for debug-info
- Alle scripts har guards mot dobbel-lasting
- Kan kombineres med egne custom scripts
```

---

## 🚀 Quick Start

1. **Gjør repo public** (Settings → Danger Zone → Change visibility)
2. **Opprett loader-filene** i `scripts/` mappen
3. **Test bokmerkene** i NISSY
4. **Dokumenter** i README.md
5. **Del bokmerkene** med brukere

---

## ❓ FAQ

**Q: Kan brukere se kildekoden?**  
A: Ja, men det er helt greit. Ingen sensitiv data i scriptene.

**Q: Hva hvis jeg vil ha noe privat?**  
A: Bruk secret gists for testing, så publiser når klart.

**Q: Hvordan versjonerer jeg?**  
A: Bruk branches: `/main/`, `/v1.0/`, `/v2.0/` i URL.

**Q: Må jeg oppdatere alle bokmerkene når jeg endrer?**  
A: Nei! Brukere har én loader, du endrer kun individuelle scripts.

---

**Laget med ❤️ for NISSY**
