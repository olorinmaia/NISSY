# NISSY V13.37

Javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system som ikke oppdateres mer.

## 📦 Innhold

- **Smart-tildeling** - Automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling
- **Tilordningsstøtte 2.0** - Forbedret tilordning med toast-visning
- **Tastatur-snarveier** - Effektiv navigering og kontroll
- **Rek-knapper** - Hurtigknapper for rekvisisjoner på ventende/pågående oppdrag
- **Rutekalkulering** - Integrasjon med Google Maps rutekalkulering
- **Ressursinfo** - Rask tilgang til ressursinformasjon som faktiske tider, posisjoner.

## 🚀 Installasjon

### Metode 1: Direkte fra GitHub (Anbefalt)
1. Opprett et nytt bokmerke i nettleseren din
2. Lim inn følgende kode som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```
3. Gi bokmerket et navn (f.eks. "NISSY-script Advanced")
4. Klikk på bokmerket når du er inne i NISSY

### Metode 2: Individuelle Scripts
Last inn hvert script individuelt ved å bruke bokmerker fra [`bookmarklets/`](bookmarklets/) mappen.

## ⌨️ Tastatursnarveier

### Del 0: Grunnleggende Navigasjon
| Snarvei | Funksjon |
|---------|----------|
| `ALT+F` | Fokus søkefelt |
| `Enter` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk + fokus søkefelt |
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
| `ALT+Q` | Google Maps Rutekalkulering |
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

### Tilordningsstøtte 2.0 (ALT+T)
- Tildeler hver bestilling til sin egen avtale
- Ingen begrensning på antall bestillinger
- Viser popup med resultat for alle bestillinger
- Visuell feedback med grå-markering

### Passasjertelling
Scriptet teller automatisk:
- Antall bestillinger
- Ledsagere per bestilling
- Overlappende tidsperioder
- Maksimalt antall samtidig reisende

## 🐛 Kjente Issues

- `openPopp()` kan noen ganger trigge feilmelding i konsollen - dette er harmløst
- Enkelte gamle nettlesere støtter ikke `async/await` i bokmerker

## 🤝 Bidrag

Dette er et public repository for deling av javascript til brukere av NISSY Planlegging. Forbedringsforslag mottas gjerne via issues.

## 📝 Lisens

Privat - Kun for intern bruk i NISSY-systemet.

## 🔄 Changelog

Se [CHANGELOG.md](docs/CHANGELOG.md) for versjonhistorikk.

---

**❤️ Make NISSY great again!**
