# NISSY V13.37

Javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system som ikke vil bli fikset noe særlig mer på.
Disse scriptene gjør arbeidsdagen langt mer effektiv, samt gir mye mer nyttig informasjon til planleggingen ved få tastetrykk.

## 📦 Innhold

- **NISSY-fiks** - Masse bugfix, tastatursnarveier og forbedringer. Setter automatisk standard-kolonner.
- **Smart-tildeling** - Automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling uten behov for å velge avtale.
- **Tilordningsstøtte 2.0** - Forbedret tilordning med toast-visning, uendelig antall bestillinger kan merkes og tilordnes.
- **Rek-knapper** - Hurtigknapper for bestillinger på ventende/pågående oppdrag.
- **Rutekalkulering** - Åpner merkede bestillinger/turer for rutekalkulering i Google maps.
- **Ressursinfo** - Rask tilgang til ressursinformasjon som faktiske tider, posisjoner, telefonnummer til sjåfør.
- **Avbestilling** - Kan masse-avbestille merkede turer eller alle med status tildelt. **OBS! Kun tilgjengelig på EXPERT. Brukes på eget ansvar!**
- **Alenebil** - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- **Auto-Bestill** - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- **Sjekk-Duplikat** - Sjekker alle bestillinger på valgt filter for duplikater, lar deg søke opp disse for å rette opp.
- **Sjekk-Telefon** - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- **Trøndertaxi-løyve** - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister.

## 📊 Oversikt alle features i script-pakker
Scriptene under har mye automatikk og dedikerte snarveier. Disse har blitt plassert i script-pakker og trenger kun aktiveres en gang. 
Hvis du hard-refresher siden eller lukker nettleser må du aktivere script-pakken på nytt.
Under er en oversikt over de features som følger med i hver pakke.

| Features | Basic | Advanced | Expert |
|---------|-------|----------|--------|
| NISSY-fiks | ✅ | ✅ | ✅ |
| Rutekalkulering (ALT+Q) | ✅ | ✅ | ✅ |
| Ressursinfo (ALT+D) | ✅ | ✅ | ✅ |
| Smart-tildeling (ALT+S) | ❌ | ✅ | ✅ |
| Tilordningstøtte 2.0 (ALT+T) | ❌ | ✅ | ✅ |
| Rek-knapper (ALT+R) | ❌ | ✅ | ✅ |
| Avbestilling (ALT+K) | ❌ | ❌ | ✅ |

## 🚀 Installasjon

### Script-pakker 
Velg mellom **Basic**, **Advanced** eller **Expert**

1. Opprett et nytt bokmerke i nettleseren din
2. Lim inn følgende kode som URL:

**Basic**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-basic.js');eval(await s.text());})();
```

**Advanced**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

**Expert**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-expert.js');eval(await s.text());})();
```

3. Gi bokmerket et navn (f.eks. "NISSY-Advanced")
4. Klikk på bokmerket når du er inne i NISSY. Dette aktiverer all automatikk og snarveier.

### Individuelle Scripts
Følgende script må lastes inn manuelt og ha sitt eget bokmerke:

- **Alenebil** 
- **Auto-Bestill** 
- **Sjekk-Duplikat** 
- **Sjekk-Telefon** 
- **Trøndertaxi-løyve**

Opprett bokmerke som beskrevet tidligere og bruk URL fra scriptene som ligger i [`bookmarklets/`](bookmarklets/) mappen.

## ⌨️ Tastatursnarveier
Snarveiene hører til de ulike script-pakkene.

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
