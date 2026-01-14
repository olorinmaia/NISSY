# 📝 Endringslogg

Alle viktige endringer i NISSY-scriptene vil bli dokumentert i denne filen.

## Planlagt
- Kontinuerlig forbedring av eksisterende scripts, nye script legges til fortløpende når testet ferdig
- Ser på mulighetene for enkel samkjøringsalgoritme

---
## 🚀 [2.6.1] - 14.01.2026

### Skjuling av ubrukte elementer

#### Hva er nytt?
- Fjerner filter i header og checkbox for dynamiske plakater i footer som ikke har noen funksjon lengre. 

## 🚀 [2.6.0] - 13.01.2026

### 🎉 Nytt script Hentetid

#### Hva er nytt?
- 🕐 **Hentetid** 
  - (Alt+E) Lar deg redigere hentetid på merkede bestillinger på ventende oppdrag. TODO: Gjøre det mulig på pågående oppdrag kun for status tildelt.

## 🚀 [2.5.0] - 11.01.2026

### 🎉 Nytt script Adminmodul og Avbestilling fungerer på bestillinger og masse nytt til NISSY-fiks

#### Hva er nytt?
- ⚙️ **Adminmodul** 
  - (Alt+A) Åpner admin-modulen i en ny pop-up iframe over planleggingsvinduet i med fokus i telefonnummer-feltet i person-fanen.
  - "?" og "R"-linker i planleggingsvinduet åpnes i Adminmodul/Bestillingsmodul-script istedenfor ny fane.
  - Auto-søk og scroller nederst på siden når turer og bestillinger åpnes i admin via "?" i planlegging.
- 📝 **Bestillingsmodul** 
  - Auto-scroll og fokus til hentetid når bestillinger redigeres i planlegging via "R"-knapp på ventende oppdrag.
  - Lagt på snarvei til "Hent rekvisisjon" i Alt+H
- ✖️ **Avbestilling** 
  - Kan nå avbestille flere bestillinger samtidig også. Må velge mellom turer eller bestillinger.
  - Hvis en bestilling krysses ut på ventende oppdrag avbestilles den nå via scriptet for bedre brukeropplevelse.
  - Trykk "ENTER" etter pop-up når du har lest over for å bekrefte isteden for å klikke.
- ⌛ **NISSY-fiks** 
  - Overvåker nå de interne NISSY-loggene for å detektere at brukeren blir logget ut. Kaster nå en feilmelding med informasjon slik at siden kan refreshes og script lastes inn på nytt.
  - HIGHLIGHT SØKT REKVISISJONSNUMMER. Markerer den spesifikke bestillingen på en tur med flere bestillinger.
  - Lukker nå plakater ved trykk utenfor.
  - Begrenser bredden på navn og adresse på ventende/pågående oppdrag hvis det ikke er plass til alt.
  - Fikser problem med at NISSY-plakater lukker seg med en gang musen beveger seg over og forbi en annen plakat, timer på 500ms innført før ny plakat åpnes.
- Lagt til brukerveiledning øverst til venstre i NISSY Planlegging
- Laget felles feilmelding-toast og forbedret tekst.

#### 🐛 Feilrettinger
- **Ressursinfo.js** - Problem med at pop-up vindu forsvant ut av skjermen på små skjermer fikset.

## 🚀 [2.0.0] - 07.01.2026

### 🎉 Knapper for alle script lagt til i Planleggingsbildet 🎉

#### Hva er nytt?
- Når en loader kjøres så har alle script nå fått sine egne knapper i planleggingsbildet. Snarvei står i parentes på de som har det. Manuelle script ligger nederst og må trykkes på.

## 🚀 [1.3.0] - 06.01.2026

### 🚕 Ressursinfo og Trøndertaxi-løyve forbedret!

#### Hva er nytt?
- **Ressursinfo.js**
  - Hvis transportør er Trøndertaxi vises en knapp øverst med "Løyveregister" som tar deg til Trøndertaxi sitt register og viser info om bilen.
  - Øverst til høyre ser du nå informasjon avtalenavn og områdekode (ved å holde musen over)
- **Trøndertaxi-løyve.js** - Sender deg nå direkte til løyveregisteret og åpner opp all info om valgt bil.

#### Feilrettinger
- Problem med at Tab-knapp ikke virket pga feil i koden til Bestillingsmodul.js er rettet.

## 🚀 [1.2.0] - 04.01.2026

### 🎉 Utvidelse med 2 nye script Bestillingsmodul.js og Avbestilling.js og 🚕 Ressursinfo forbedret!

#### Hva er nytt?
- **Ressursinfo.js** - Parser 2000 XML og henter ut navn, adresse, planlagt tid med korrekt æøå-formatering. Forbedret UI-visning.
- **Bestillingsmodul.js** - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen. Åpner bestillingsmodul i pop-up/iframe over Planlegging. Vedlagt alle script-pakkene.
- **Avbestilling.js** - Lar deg merke turer og trykke på snarvei Alt+K for å masse-avbestille. Nyttig hvis mye er tildelt på autodispatch eller du skal replanlegge en del turer som ligger en og en.

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

## 🚀 [1.0.0] - 01.01.2026

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

**❤️ Make NISSY great 🤓**
