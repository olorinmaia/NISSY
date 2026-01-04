# Endringslogg

Alle viktige endringer i NISSY-scriptene vil bli dokumentert i denne filen.

## [Unreleased]

### Planlagt
- Automatisk oppdatering av scripts
- Nye script skal legges til fortløpende
- Flere tilpasbare innstillinger

---
## [1.2.0] - 04.01.2026

### 🎉 Utvidelse med nytt script Bestillingsmodul.js og 🚕 Ressursinfo forbedret!

#### Hva er nytt?
- **Ressursinfo.js** - Parser 2000 XML og henter ut navn, adresse, planlagt tid med korrekt æøå-formatering. Forbedret UI-visning.
- **Bestillingsmodul.js** - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen. Åpner bestillingsmodul i pop-up/iframe over Planlegging. Vedlagt alle script-pakkene.

## [1.1.0] - 02.01.2026

### 🎉 Utvidelse med 6 individuelle script!

#### Hva er nytt?
- **Alenebil.js** - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- **Auto-Bestill.js** - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- **Sjekk-Duplikat.js** - Sjekker alle bestillinger på valgt filter for duplikater, lar deg søke opp disse for å rette opp.
- **Sjekk-Telefon.js** - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- **Statistikk** - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
- **Trøndertaxi-løyve.js** - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister.
- **NISSY-fiks.js** - Har endret slik at Alt+W (Vis i kart) støtter uendelig antall bestillinger.

#### Dokumentasjon
- Oppdatert README.md iht. nye script som er lagt til samt installasjonsveiledning.

## [1.0.0] - 01.01.2026

### 🎉 Første offisielle release!

#### Hva er nytt?
- **NISSY-fiks.js** - Grunnleggende tastatursnarveier og kolonnejusteringer
  - ENTER i søkefelt → Søk
  - ESC → Nullstill søk + fokus søkefelt
  - ALT+F → Fokus søkefelt
  - F5 → Refresh data (openPopp)
  - CTRL+R/CMD+R → Blokkert
  - CTRL+1 → Fokus filter ventende oppdrag
  - CTRL+2 → Fokus filter ressurser
  - ALT+W → Vis i kart
  - ALT+G → Tildel oppdrag
  - ALT+B → Blank
  - ALT+P → Merk alle ressurser pågående oppdrag
  - ALT+V → Merk alle bestillinger ventende oppdrag
  - Automatisk kolonnejustering (skjuler/viser relevante kolonner)
  - Fikser bug med at filter ikke oppdaterer seg
  - Åpner alle turer ved bytting av filter automatisk
  - m.m..

- **Smart-tildeling.js** - Intelligent tildeling med RB/ERS og passasjerregler
  - ALT+S → Smart tildeling (batch med regler)
  - ALT+T → Tilordningsstøtte 2.0 (individuell tildeling)
  - Automatisk RB/ERS-deteksjon og avtalevalg
  - Passasjertelling med overlappsjekk
  - Støtte for direkte ressurs-tildeling
  - Visuell feedback med grå-markering under planlegging
  - Non-blocking kø-støtte (kan planlegge flere batch samtidig)

- **Rek-knapper.js** - Hurtigknapper for redigering og administrasjon
  - ALT+R → Vis rek-knapper på merkede rader
  - H-knapp → Hendelseslogg
  - S-knapp → Manuell statusendring (kun pågående)
  - K-knapp → Kopier bestilling
  - T-knapp → Lag retur og link sammen
  - R-knapp → Rediger (auto-fokus på hentetid)
  - Automatisk høydetilpasning til rad-bilder
  - Posisjonering som følger scroll

- **Rutekalkulering.js** - Google Maps integrasjon
  - ALT+Q → Åpne rutekalkulator
  - Støtte for ventende og pågående oppdrag
  - Automatisk filtrering av "Framme"-stopp
  - Google Maps consent-håndtering
  - Smart adressesamling med duplikat-fjerning

- **Avbestilling.js** - Masseavbestilling av turer
  - ALT+K → Avbestillingsdialog
  - To avbestillingsmodi: merkede ressurser eller alle "Tildelt"
  - Parallell XHR for rask prosessering
  - Progressbar med live-oppdatering
  - Sikkerhet: Ignorerer "Framme", "Startet", "Bomtur"

- **Ressursinfo.js** - Detaljert ressursinformasjon
  - ALT+D → Ressursinfo popup
  - Viser alle turer (pågående og ventende)
  - Tidsplan og kapasitetsoversikt
  - Spesielle krav og ledsagere

- **Loader-system** - Script-pakker med ulik innhold avhengig av arbeidsoppgaver
  - loader-basic.js → Inneholder basis-scriptene
  - loader-advanced.js → Inneholder nesten alle script
  - loader-expert.js → Full funksjonalitet - også script under utvikling
  - loader-*-dev.js → Utviklingsversjoner
  - Velkomst-popup med snarvei-oversikt
  - Automatisk refresh ved lukking
  - Lenke til dokumentasjon

#### Dokumentasjon
- Komplett README.md med installasjonsveiledning
- BASIC.md - Brukerveiledning for BASIC
- ADVANCED.md - Brukerveiledning for ADVANCED
- EXPERT.md - Brukerveiledning for EXPERT

#### Feilrettinger
- Rico-bibliotek `.remove()` konflikt → bruker `removeChild()` i alle scripts
- ESC-handler ikke fjernet ved lukking av loader-popup
- `cleanupSnippet` hoisting-feil i Rek-knapper.js
- Cache-busting for dev-loaders (`?t=${Date.now()}`)

---

## [0.9.0] - 30.12.2025 (Beta)

### Hva er nytt?
- Grunnleggende script-funksjonalitet
- GitHub repository opprettet
- Utviklings-branch (dev) etablert

### Endring
- Migrert fra Gist til GitHub repository
- Strukturert mappeorganisering

---

## Lenker

- [Repository](https://github.com/olorinmaia/NISSY)
- [Issues](https://github.com/olorinmaia/NISSY/issues)
- [Pull Requests](https://github.com/olorinmaia/NISSY/pulls)

---

**❤️ Make NISSY great again!? 🤓**
