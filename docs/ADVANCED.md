# NISSY Advanced - Brukerveiledning

## [📝 Endringslogg](CHANGELOG.md)

### Inkluderte scripts:
- ⌛ **NISSY-fiks** - Bugfixer, forbedringer, tastatursnarveier og kolonnejusteringer
- 🚕 **Ressursinfo** - (Alt+D) Viser detaljert ressursinformasjon - tlfnr. sjåfør, faktiske tider og koordinater, faktisk kjørerute.
- 🗺️ **Rutekalkulering** - (Alt+Q) Åpne rute i Google Maps
- 🪄 **Smart-tildeling** - (Alt+S / Alt+T) Planlegge bestillinger uten å måtte velge avtaler i NISSY. Kan også tildele til merket ressurs eller avtale.
- 🕐 **Hentetid** - (Alt+E) Rediger/beregn hentetid på merkede bestillinger på ventende oppdrag og turer med status tildelt på pågående oppdrag.
- 🔠 **Rek-knapper** - (Alt+R) Gir hurtigknapper på bestillinger i ventende/pågående oppdrag. Trykk ESC for å lukke manuelt.
- 📝 **Bestillingsmodul** - (Alt+N) Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen og åpner i pop-up over planleggingsvindu.
- ⚙️ **Adminmodul** - (Alt+A) Åpner admin-modulen i en ny pop-up iframe over planleggingsvinduet i person-fanen.
- 📋 **Handlingslogg** - (Alt+L) Logger handlinger som tildeling, avbestilling, fjerning, avplanlegging.
- 🔔 **Overvåk-Ventende** - Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. 
- ✖️ **Avbestilling.js** - (Alt+K) Lar deg masse-avbestille merkede turer og bestillinger. Ikke mulig og avbestille turer etter 3003 XML.
- 🚐 **Samkjøring** -  (Alt+X) Merk bestillinger på ventende oppdrag, velg aktuelle filter og trykk på knappen eller Alt+X. Algoritmen søker etter ressurser for samkjøring/returutnytting på valgte filter.
- 🚗 **Alenebil** - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- 🤖 **Auto-Bestill** - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- 🔍 **Sjekk-Bestilling** - Sjekker alle bestillinger på valgt filter for duplikater, problematisk kombinasjon av spesielle behov og datofeil, lar deg søke opp disse for å rette opp.
- 🚩 **Sjekk-Plakat** - (Kun Nord-Trøndelag) Finn alle røde plakater med fritekst på valgt filter, problematisk tekst vises først. Eksempel: 'alenebil','hentes','adresse','framsete','rullestol','rullator','lav bil','liten bil','forsete','direktebil','må ha med seg'.
- 📞 **Sjekk-Telefon** - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- 📊 **Statistikk** - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
- 🚖 **Trøndertaxi-løyve** - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes.

## ⌨️ Alle tastatursnarveier

### Søk og navigasjon

| Snarvei | Funksjon |
|---------|----------|
| `ALT+F` | Fokus søkefelt (marker eksisterende tekst) |
| `ENTER` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk og sett fokus tilbake til søkefelt |
| `F5` | Refresher alle bestillinger/turer og åpner alle turer |
| `CTRL+1` | Fokus til filter ventende oppdrag |
| `CTRL+2` | Fokus til filter ressurser |

### Oppdragshåndtering

| Snarvei | Funksjon |
|---------|----------|
| `ALT+W` | Vis i kart |
| `ALT+G` | Tildel oppdrag |
| `ALT+B` | Blank (fjern alle markeringer) |
| `ALT+P` | Merk alle ressurser i pågående oppdrag |
| `ALT+V` | Merk alle bestillinger i ventende oppdrag |

### Verktøy

| Snarvei | Funksjon |
|---------|----------|
| `ALT+S` | Smart tildeling (RB/ERS + passasjerregler) |
| `ALT+T` | Tilordningsstøtte 2.0 (individuell tildeling) |
| `ALT+E` | Endre hentetid |
| `ALT+R` | Rek-knapper (H, S, K, T, R) Trykk ESC for å lukke manuelt |
| `ALT+Q` | Åpne rutekalkulering i Google Maps |
| `ALT+D` | Vis ressursinfo popup |
| `ALT+M` | Møteplass |
| `ALT+N` | Bestillingsmodul |
| `ALT+H` | Hent Rekvisisjon |
| `ALT+A` | Adminmodul |
| `ALT+K` | Avbestilling av merkede turer/bestillinger |
| `ALT+X` | Søk etter samkjøringsforslag |
| `ALT+L` | Handlingslogg |

## 📥 Installasjon

### Opprett bokmerke

Kopier og lim inn som URL:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

Navn: `NISSY-Avansert`

## 📖 Detaljert brukerveiledning

### 🗺 Rutekalkulering (ALT+Q)

1. Merk én eller flere bestillinger (klikk på radene)
2. Trykk `ALT+Q`
3. Første gang: Godta Google Maps vilkår, lukk vinduet, trykk `ALT+Q` igjen
4. Google Maps åpnes med rute for alle merkede bestillinger

**Tips:**
- Fungerer både for ventende og pågående oppdrag
- Filtrerer automatisk ut stopp som er markert som "Framme"
- Optimaliserer rekkefølgen for logisk flyt


### 🚕 Ressursinfo (ALT+D)

1. Merk én ressurs
2. Trykk `ALT+D`
3. Popup viser:
   - Faktiske tider og koordinater for hver hendelse
   - Planlagte tider, navn og adresser for hver hendelse
   - Tidspunkt for mottak av 3003 XML
   - Link til NISSY admin for bestilling og tur
   - Telefonnummer til sjåfør (kopieres automatisk til utklippstavle)
   - Faktisk kjørerute til bilen (Må være flere enn 1 unike koordinater)
   - Link til løyveregister til Trøndertaxi hvis bilen tilhører de


### ⌛ NISSY-fiks

Scriptet fikser en rekke bugs, forbedrerer eksisterende funksjonalitet og justerer automatisk kolonnevisning:

- Fikser bug med at filter ikke oppdaterer seg når bestillinger er merket når du bytter filter.
- Åpner alle turer ved bytting av filter automatisk og ved søk.
- Ved søk etter rekvisisjonsnummer så markeres den spesifikke bestillingen på en tur med flere bestillinger og raden velges i NISSY.
- Setter snarveier til ofte brukte NISSY-funksjoner. F5 refresher/åpner alle turer. Se tabell lengre nede.
- Lukker alle typer plakater ved trykk utenfor.
- Begrenser bredden på navn og adresse på ventende/pågående oppdrag hvis det ikke er plass til alt.
- Fikser problem med at NISSY-plakater lukker seg med en gang musen beveger seg over og forbi en annen plakat, timer på 500ms innført før ny plakat åpnes.
- Fikser bug med at vis/skjul kolonner ventende/pågående og filtergruppe på ressurs/ventende får NISSY til å henge hvis bestillinger er merket når select-knappene benyttes.
- Forbedrer kontrollpanel-tabellen med å fjerne knapper som ikke er i bruk og legger til snarveier ved mouse-over og snarvei til Møteplass.
- Fanger opp "Vis i kart"-popupvindu og forbedrer størrelse og plassering (samme som Rutekalkulering)

**Skjuler:**
- Ledig kapasitet (pågående oppdrag)
- Transporttype (ventende oppdrag)

**Viser:**
- Oppmøtetidspunkt (pågående oppdrag)
- Ledsagere (pågående oppdrag)
- Spesielle krav (pågående oppdrag)
- Pasientnavn (pågående oppdrag)
  

### 🪄 Smart Tildeling (ALT+S)

Intelligent tildeling som automatisk:
- Detekterer RB/ERS i bestillinger
- Teller overlappende passasjerer, ledsager og enkelte spesielle behov
- Velger riktig avtale basert på regler (KREVER KONFIGURASJON, TA KONTAKT FOR HJELP)

**Slik bruker du:**

1. **Merk bestillinger** du vil tildele
2. Trykk `ALT+S`
3. Scriptet:
   - Teller antall samtidig reisende
   - Sjekker om RB/ERS er påkrevd
   - Velger riktig avtale automatisk
   - Viser resultat i toast-melding

**Tildeling til ressurs/avtale:**
- Merk også en ressurs eller avtale → tildeles direkte til ressursen/avtalen


### 📆 Tilordningsstøtte 2.0 (ALT+T)

Tildeler hver bestilling til sin egen avtale (individuelt). Ingen begrensning på antall bestillinger som kan merkes.

### 🕐 Hentetid (ALT+E)

Lar deg merke bestillinger på ventende og pågående oppdrag (kun status tildelt) for å redigere/beregne hentetider. Rekkefølge oppdateres fortløpende kronologisk basert på hentetid.
"Vis i kart" oppe til høyre i pop-up, viser merkede bestillinger i kartet. "Ruteberegning" åpner bestillingene i google maps.


### 🔠 Rek-knapper (ALT+R)

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

### 📝 Bestillingsmodul (ALT+N)

Trykk på Alt+N for å få første pop-up med valg om foretrukket bestillingsmodul. Deretter åpnes enten 4-stegs eller ensides i en iframe modal.
Dette lagres i sesjonen, nullstilles når nettleser lukkes helt. Merk en bestilling og trykk Alt+M for å åpne møteplassfunksjonen i samme modal.
- Fanger opp "R"-linker i planleggingsvinduet åpner opp hentetid for redigering, merker tidspunktet slik at man kan skrive og scroller ned til bunnen av ensides.
- Fanger opp trykk på Møteplass og "K"-knappen i planleggingsvinduet og åpner dette i iframe modal (popup) isteden for ny fane.

### ⚙️ Adminmodul (ALT+A)

Trykk på Alt+A for å åpne admin-modulen som setter fokus i person-fanen og telefonnummer. Tips her er å kopiere fra Zisson for å finne pasient så du slipper å spørre om personnummer.
Fanger opp "?"-linker i planleggingsvinduet og søker frem tur/bestilling velger øverste rad og scroller ned til resultatet automatisk

### ✖️ Avbestilling (ALT+K)

Lar deg merke bestillinger/turer og trykke på snarvei Alt+K for å masse-avbestille. Nyttig hvis mye er tildelt på autodispatch eller du skal replanlegge en del turer som ligger en og en. Eller du skal avbestille en tur/retur bestilling.
- Fanger opp klikk på "X"-knappene i ventende/pågående oppdrag og ressurser og lager en pop-up med mer informasjon om hva du er i ferd med å gjøre
- Hindrer bruker fra å gjøre ting som ikke er i henhold til SUTI-standard, som feks å avbestille bestillinger etter avstigning eller avbestille tur etter 3003.

**Tips:**
- Trykk ENTER for å avbestille med en gang. Trykk utenfor boksen for å lukke den.
- Naviger i ansvarlig for avbestilling med piltaster

**Sikkerhetsjekk:**
- Filtrerer bort turer med statuser som "Startet", "Fremme", "Ikke møtt" osv.
- Filtrerer bort status "Akseptert" hvis ressursnavn ikke slutter på minst 5 siffer etter siste "-" for å unngå avbestilling av tur etter 3003 men før 4010-1701.
- Advarsel før du avbestiller og en liste over hvilke ressurser som vil bli avbestilt.

### 🚐 Samkjøring (ALT+X)

Merk bestillinger på ventende oppdrag eller en ressurs på pågående oppdrag, velg aktuelle filter og trykk på knappen eller Alt+X. Algoritmen søker etter ressurser for samkjøring/returutnytting på valgte filter.
  - Baseres utelukket på tidspunkt for hent/oppmøte og postnummer for fra/til-adresse, så det er begrensninger for hva som er mulig, men mange gode forslag vil komme opp.
  - Kan merke en ressurs og søke etter andre ressurser på samme filter for replanlegging. F.eks. for å se om ressursen kan slåes sammen med andre ressurser.
  - Kan ikke merke bestilling på ventende og ressurs på pågående samtidig. Det er to forskjellige moduser.
  - Når ingenting er merket så søkes det innad på ventende oppdrag for mulig samkjøring mellom bestillingene. 
   - Kan velge hvilke man ønsker å samkjøre og merke disse for videre justering / tildeling.

### 📋 **Handlingslogg (Alt+L)** 

Logger handlinger som tildeling, avbestilling av turer/bestillinger, fjerning av turer, avplanlegging.
Om du skulle være uheldig og tildele eller avbestille noe feil, så finner du nå lett tilbake til bestilling/tur.

### 🔔 **Overvåk-Ventende**
Start og stopp scriptet ved å trykke på knappen over ventende oppdrag.
- Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. 
- Teller x antall bestillinger på ventende oppdrag og viser dette som (x) i fanetittel.
- Merker nye bestillinger automatisk ved bekrefting av toast-varsel.

## ❓ Feilsøking

### Bokmerket gjør ingenting

- Sjekk at du har limt inn hele koden (skal starte med `javascript:`)
- Prøv å oppdatere siden og klikk bokmerket igjen
- Åpne utviklerkonsollen (F12) og se etter feilmeldinger

### Snarveier virker ikke

- Bekreft at scriptet er lastet (åpne konsoll, skal se "✅ NISSY Advanced lastet!")
- Prøv å laste siden på nytt / restart nettleser
- Klikk bokmerket igjen

### Google Maps åpner ikke

- Sjekk at popup ikke er blokkert av nettleseren
- Godta Google Maps vilkår første gang, åpne Google Maps manuelt i nettleser.
  
### Smart-tildeling velger feil avtale

- Sjekk at RB/ERS-reglene stemmer med ditt oppsett
- Verifiser antall samtidig reisende i toast-meldingen
- Kontakt @olorinmaia hvis regler må oppdateres

### Tilordningsstøtte 2.0 feiler

- Sjekk at alle bestillinger har avtale
- Se resultat-popup for detaljer
- Bestillinger uten avtale hoppes over

## 💪 Pro-tips

1. **Kombiner snarveier**: `ALT+V` → `ALT+T` (merk alle → tilordningsstøtte 2.0 (ingen begrensning på antall bestillinger))
2. **Hentetid/Rek-knapper + Smart tildeling**: Rediger først, tildel etterpå
3. **ESC lukker alt**: Rek-knapper, modaler, popups
4. **F5 har ny funksjon**: Når du trykker på F5 refreshes alle bestillinger/turer og alle turer åpnes. Ikke hele siden.
5. **Benytt riktig URL til NISSY** Benytt https://nissy6.pasientreiser.nhn.no/planlegging/ og https://nissy6.pasientreiser.nhn.no/rekvisisjon/ og https://nissy6.pasientreiser.nhn.no/administrasjon/ for å unngå å bli logget ut hele tiden.

## 📞 Support

Fant du en bug eller har forslag?
- Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)
- Se [README](../README.md) for mer utfyllende informasjon

---

**❤️ Make NISSY great 🤓**
