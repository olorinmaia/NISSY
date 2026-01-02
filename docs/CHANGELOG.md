# Changelog

Alle viktige endringer i NISSY-scriptet vil bli dokumentert i denne filen.

## [Unreleased]

### Planlagt
- Automatisk oppdatering av scripts
- Nye script skal legges til fortløpende
- Flere tilpasbare innstillinger

---

## [1.0.0] - 01-01-2026

### 🎉 Første offisielle release!

#### Added
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

- **Loader-system** - Modulært lastesystem
  - loader-basic.js → Nybegynnerpakke
  - loader-advanced.js → Avansert pakke
  - loader-expert.js → Full funksjonalitet
  - loader-*-dev.js → Utviklingsversjoner
  - Velkomst-popup med snarvei-oversikt
  - Automatisk refresh ved lukking
  - Lenke til dokumentasjon

#### Documentation
- Komplett README.md med installasjonsveiledning
- BASIC.md - Nybegynnerdokumentasjon
- ADVANCED.md - Avansert brukerveiledning
- EXPERT.md - Full funksjonsoversikt

#### Fixed
- Rico-bibliotek `.remove()` konflikt → bruker `removeChild()` i alle scripts
- ESC-handler ikke fjernet ved lukking av loader-popup
- `cleanupSnippet` hoisting-feil i Rek-knapper.js
- Cache-busting for dev-loaders (`?t=${Date.now()}`)

---

## [0.9.0] - 30.12.2025 (Beta)

### Added
- Grunnleggende script-funksjonalitet
- GitHub repository opprettet
- Utviklings-branch (dev) etablert

### Changed
- Migrert fra Gist til GitHub repository
- Strukturert mappeorganisering

---

## Versjonsforklaring

### Kategorier

- **Added** - Nye features
- **Changed** - Endringer i eksisterende funksjonalitet
- **Deprecated** - Features som snart fjernes
- **Removed** - Fjernede features
- **Fixed** - Bugfixes
- **Security** - Sikkerhetsfikser

---

## Lenker

- [Repository](https://github.com/olorinmaia/NISSY)
- [Issues](https://github.com/olorinmaia/NISSY/issues)
- [Pull Requests](https://github.com/olorinmaia/NISSY/pulls)

---

**❤️ Make NISSY great again!**
