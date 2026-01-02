# NISSY - JavaScript Bugfixes, Automatisering & Snarveier

Javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system som ikke oppdateres mer.

## 📦 Innhold

- **Smart-tildeling** - Automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling
- **Tilordningsstøtte 2.0** - Forbedret tilordning med popup-visning
- **Tastatur-snarveier** - Effektiv navigering og kontroll
- **Rek-knapper** - Hurtigknapper for rekvisisjoner på ventende/pågående oppdrag
- **Ruteberegning** - Integrasjon med Google Maps rutekalkulering
- **Ressursinfo** - Rask tilgang til ressursinformasjon som faktiske tider, posisjoner.

## 🚀 Installasjon

### Metode 1: Direkte fra GitHub (Anbefalt)
1. Opprett et nytt bokmerke i nettleseren din
2. Lim inn følgende kode som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/combined-automation.js');eval(await s.text());})();
```
3. Gi bokmerket et navn (f.eks. "NISSY Loader")
4. Klikk på bokmerket når du er inne i NISSY

### Metode 2: Individuelle Scripts
Last inn hvert script individuelt ved å bruke bokmerker fra [`bookmarklets/`](bookmarklets/) mappen.

## ⌨️ Tastatursnarveier

### Del 0: Grunnleggende Navigasjon
| Snarvei | Funksjon |
|---------|----------|
| `Enter` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk + fokus søkefelt |
| `ALT+F` | Fokus søkefelt |
| `F5` | openPopp('-1') - Refresher all data og åpner alle turer |
| `CTRL+1` | Fokus til filter ventende oppdrag |
| `CTRL+2` | Fokus til filter ressurser |
| `CTRL+R` / `CMD+R` | Blokkert (unngå utilsiktet refresh) |

### Del 1: Oppdragshåndtering
| Snarvei | Funksjon |
|---------|----------|
| `ALT+W` | Vis i kart |
| `ALT+G` | Tildel oppdrag |
| `ALT+B` | Blank (nullstill) |
| `ALT+P` | Merk alle ressurser pågående oppdrag |
| `ALT+V` | Merk alle bestillinger ventende oppdrag |

### Del 2: Smart Tildeling
| Snarvei | Funksjon |
|---------|----------|
| `ALT+S` | Smart-tildel (med RB/ERS og passasjerregler) |
| `ALT+T` | Tilordningsstøtte 2.0 (individuell tildeling) |

### Del 3: Verktøy
| Snarvei | Funksjon |
|---------|----------|
| `ALT+Q` | Google Maps Rutekalkulator |
| `ALT+D` | Ressursinfo |
| `ALT+R` | Rek-knapper |
| `ALT+K` | Masse-avbestilling |

## 🔧 Funksjonalitet

### Smart-Tildeling (ALT+S)
- **Automatisk RB/ERS-deteksjon**: Tildeler til riktig avtale når RB eller ERS er påkrevd
- **Passasjertelling**: Teller overlappende passasjerer og velger riktig avtale ved >3 reisende
- **Ressurs-tildeling**: Støtter direkte tildeling til valgt ressurs
- **Visuell feedback**: Grå-markering av bestillinger under planlegging
- **Kø-støtte**: Kan planlegge flere batch mens tidligere fortsatt pågår

#### Avtale-regler
**RB/ERS-regler** (når RB eller ERS er påkrevd):
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

### Tilordningsstøtte 2.0 (ALT+T)
- Tildeler hver bestilling til sin egen avtale
- Viser popup med resultat for alle bestillinger
- Parallell prosessering av flere bestillinger
- Visuell feedback med grå-markering

### Passasjertelling
Scriptet teller automatisk:
- Antall bestillinger
- Ledsagere per bestilling
- Overlappende tidsperioder
- Maksimalt antall samtidig reisende

## 📁 Mappestruktur
```
NISSY/
├── README.md
├── scripts/
│   ├── smart-tildeling.js          # Snippet-versjon (ALT+S)
│   ├── tilordningsstotte.js        # Popup-versjon (ALT+T)
│   ├── tastatur-snarveier.js       # Del 0 snarveier
│   ├── rutekalk.js                 # Google Maps integrasjon
│   ├── ressursinfo.js              # Ressursinformasjon
│   ├── rekneknapper.js             # Reknearkfunksjoner
│   └── combined-automation.js      # Alt-i-ett (fremtidig)
├── bookmarklets/
│   ├── smart-tildeling.txt
│   ├── tilordningsstotte.txt
│   └── loader.txt
└── docs/
    ├── INSTALLATION.md
    ├── SHORTCUTS.md
    └── CHANGELOG.md
```

## 🐛 Kjente Issues

- `openPopp()` kan noen ganger trigge feilmelding i konsollen - dette er harmløst
- Enkelte gamle nettlesere støtter ikke `async/await` i bokmerker

## 🤝 Bidrag

Dette er et privat repository for intern bruk. Forbedringsforslag mottas gjerne via issues.

## 📝 Lisens

Privat - Kun for intern bruk i NISSY-systemet.

## 🔄 Changelog

Se [CHANGELOG.md](docs/CHANGELOG.md) for versjonhistorikk.

---

**❤️ Make NISSY great again!**
