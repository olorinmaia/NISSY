# NISSY V13.37 🚀

Her ligger en rekke javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system der utviklingen har stagnert i påvente av erstattersystem.
Disse scriptene gjør arbeidsdagen langt mer effektiv, samt gir mer nyttig informasjon til planleggingen ved få tastetrykk. 
Anbefalt måte å bruke disse scriptene på er å innstallere ett av script-pakkene ved hjelp av bokmerke, og legge til de andre individiuelle scriptene som egne bokmerker etter ønske.

## 📦 Innhold

### Script med snarveier som ligger i pakker
- **NISSY-fiks** - Inneholder bugfikser, tastatursnarveier og forbedringer.
  - Automatisk kolonnejustering (skjuler/viser relevante kolonner)
  - Fikser bug med at filter ikke oppdaterer seg
  - Åpner alle turer ved bytting av filter automatisk
  - Setter snarveier til ofte brukte NISSY-funksjoner. F5 refresher/åpner alle turer. Se tabell lengre nede.
- **Smart-tildeling** - Automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling uten behov for å velge avtale.
  - Mulighet for å definere regler for Storbil-avtaler når fler enn 3 pas. OBS! Tidspunkt må være nogenlunde korrekt for at den skal telle riktig.
- **Tilordningsstøtte 2.0** - Forbedret tilordningsstøtte, uendelig antall bestillinger kan merkes og tilordnes. Resultat vises i en diskret pop-up.
- **Rek-knapper** - Hurtigknapper for bestillinger på ventende/pågående oppdrag.
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Merk at det ikke er noen begrensninger på bestillingens status. Planlagte bestillinger som endres på en status "Startet" ressurs (etter 3003 XML og første 4010-1701 XML) vil ikke generere 2000-XML!
  - Dette er svært nyttig for å rette opp feil adresse, tidspunkt, egenandel etc. på planlagte bestillinger på pågående oppdrag.
- **Rutekalkulering** - Åpner merkede bestillinger/turer for rutekalkulering i Google maps.
- **Ressursinfo** - Rask tilgang til ressursinformasjon som planlagte/faktiske tider, adresser, posisjoner, telefonnummer til sjåfør.
- **Bestillingsmodul** - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen. Åpner valgt bestillingsmodul i pop-up liggende over planleggingsvinduet.
- **Avbestilling.js** - Lar deg masse-avbestille merkede turer. Ikke mulig og avbestille turer etter 3003 XML. 

### Individuelle script
- **Alenebil** - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- **Auto-Bestill** - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- **Sjekk-Duplikat** - Sjekker alle bestillinger på valgt filter for duplikater, lar deg søke opp disse for å rette opp.
- **Sjekk-Telefon** - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- **Statistikk** - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
- **Trøndertaxi-løyve** - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister.

## 📊 Oversikt alle features i script-pakker
Scriptene i tabell under har masse automatikk og dedikerte snarveier. De er plassert i script-pakker og trenger kun aktiveres en gang. 
Hvis du hard-refresher siden eller lukker nettleser må du aktivere script-pakken på nytt.
Under er en oversikt over de features som følger med i hver pakke.

| Features | Basic | Advanced |
|---------|-------|----------|
| NISSY-fiks | ✅ | ✅ |
| Rutekalkulering (ALT+Q) | ✅ | ✅ |
| Ressursinfo (ALT+D) | ✅ | ✅ |
| Bestillingsmodul (ALT+N) | ✅ | ✅ |
| Avbestill (ALT+K) | ❌ | ✅ |
| Smart-tildeling (ALT+S) | ❌ | ✅ |
| Tilordningstøtte 2.0 (ALT+T) | ❌ | ✅ |
| Rek-knapper (ALT+R) | ❌ | ✅ |

## 🚀 Installasjon

### Script-pakker 
Velg mellom **Basic** eller **Advanced**

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

3. Gi bokmerket et navn (f.eks. "NISSY-Advanced")
4. Klikk på bokmerket når du er inne i NISSY. Dette aktiverer all automatikk og snarveier og gir en pop-up med liste over snarveier og link til dokumentasjon.

### Individuelle Scripts
Følgende script må aktiveres manuelt og ha sitt eget bokmerke.
Opprett bokmerke som beskrevet tidligere og kopier koden tilhørende gitt script under og lim inn i URL.

**Alenebil** 
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Alenebil.js');eval(await s.text());})();
```
**Auto-Bestill** 
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Auto-Bestill.js');eval(await s.text());})();
```
**Sjekk-Duplikat** 
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Sjekk-duplikat.js');eval(await s.text());})();
```
**Sjekk-Telefon** 
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Sjekk-telefon.js');eval(await s.text());})();
```
**Statistikk** 
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Statistikk.js');eval(await s.text());})();
```
**Trøndertaxi-løyve**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/Trøndertaxi-løyve.js');eval(await s.text());})();
```

## ⌨️ Tastatursnarveier
Snarveiene hører til de ulike script-pakkene.

### Del 0: Grunnleggende
| Snarvei | Funksjon |
|---------|----------|
| `ALT+F` | Fokus søkefelt |
| `Enter` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk + fokus søkefelt |
| `F5` | Refresher all data og åpner alle turer |
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

### Del 2: Smart-tildeling
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
| `ALT+N` | Bestillingsmodul |
| `ALT+K` | Avbestilling av turer |

## 🔧 Funksjonalitet

### Smart-Tildeling (ALT+S)
- **Automatisk RB/ERS-deteksjon**: Tildeler til riktig avtale når RB eller ERS er påkrevd selv om første reisende ikke har RB/ERS-behov
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

**❤️ Make NISSY great 🤓**
