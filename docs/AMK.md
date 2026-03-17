# NISSY AMK - Veiledning

## [📝 Endringslogg](CHANGELOG.md)

## 🎯 For hvem?

NISSY AMK er perfekt for deg som:
- Vil ha grunnleggende tastatursnarveier, bugfixer og forbedringer til NISSY
- Trenger enklere måte å redigere bestillinger på, rutekalkulering, ressursinfo og andre individuelle scripts uten snarveier
- Overvåking av nye bestillinger på ventende oppdrag

## 📦 Hva får du?

### Inkluderte scripts:
- ⌛ **NISSY-fiks** - Bugfixer, forbedringer, tastatursnarveier og kolonnejusteringer
- 🚕 **Ressursinfo** - (Alt+D) Viser detaljert ressursinformasjon - tlfnr. sjåfør, faktiske tider og koordinater, faktisk kjørerute.
- 🗺️ **Rutekalkulering** - (Alt+Q) Åpne rute i Google Maps
- 📝 **Bestillingsmodul** - (Alt+N) Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen og åpner i pop-up over planleggingsvindu.
- ⚙️ **Adminmodul** - (Alt+A) Åpner admin-modulen i en ny pop-up iframe over planleggingsvinduet i person-fanen.
- 📋 **Handlingslogg** - (Alt+L) Logger handlinger som tildeling, avbestilling, fjerning, avplanlegging.
- 📱 **Send-SMS** - (Alt+C) Send SMS til pasienter enkeltvis eller massevis basert på merkede bestillinger på ventende og pågående oppdrag. Send SMS til sjåfør ved å høyreklikke på løyve, henter automatisk nummer fra 3003.
- 🖱️ **Hurtigmeny** - Høyreklikk på rader i Ventende, Pågående og Ressurser åpner en meny med hurtig tilgang til de viktigste funksjonene. Høyreklikk utenfor tabellene åpner en generell meny med tilgang til alle moduler og manuelle script.
- 🔔 **Overvåk-Ventende** - Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. 
- 🚗 **Alenebil** - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- 🤖 **Auto-Bestill** - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- 🔍 **Sjekk-Bestilling** - Sjekker alle bestillinger på valgt filter for duplikater, problematisk kombinasjon av spesielle behov og dato/tidsfeil, lar deg søke opp disse for å rette opp.
- 🚩 **Sjekk-Plakat** - (Kun Nord-Trøndelag) Finn alle røde plakater med fritekst på valgt filter, problematisk tekst vises først. Eksempel: 'alenebil','hentes','adresse','framsete','rullestol','rullator','lav bil','liten bil','forsete','direktebil','må ha med seg'.
- 📞 **Sjekk-Telefon** - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- 📊 **Statistikk** - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
- 🚖 **Trøndertaxi-løyve** - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes.

## 📥 Installasjon

### Steg 1: Opprett bokmerke

1. Høyreklikk på bokmerkelinjen i nettleseren din
2. Lag ett nytt bokmerke eller kopier og endre et eksisterende bokmerke.
3. Gi det et navn f.eks.: `NISSY AMK`

### Steg 2: Lim inn kode

Kopier og lim inn denne koden som **URL**:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-amk.js');eval(await s.text());})();
```

### Steg 3: Bruk bokmerket

1. Åpne NISSY i nettleseren
2. Klikk på `NISSY AMK` bokmerket
3. Vent til popup vises med bekreftelse
4. Ferdig! Alle knapper og funksjoner er lagt til

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
| `ALT+Q` | Åpne rutekalkulering i Google Maps |
| `ALT+D` | Vis ressursinfo popup |
| `ALT+M` | Møteplass |
| `ALT+N` | Bestillingsmodul |
| `ALT+H` | Hent Rekvisisjon |
| `ALT+A` | Adminmodul |
| `ALT+L` | Handlingslogg |
| `ALT+C` | Send-SMS |

## 📖 Detaljert brukerveiledning

### 🔔 Overvåk-Ventende 
  - Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. 
  - Teller også antall bestillinger på ventende oppdrag og viser i parentes i fanen.
  - Kan startes og stoppes ved trykk på knapp som ligger over ventende oppdrag. Startes automatisk etter loader-popup lukkes.
  - Merker nye bestillinger automatisk ved bekrefting av toast-varsel.

### 🗺 Rutekalkulering (ALT+Q)

1. Merk én eller flere bestillinger (klikk på radene)
2. Trykk `ALT+Q`
3. Første gang: Godta Google Maps vilkår, lukk vinduet, trykk `ALT+Q` igjen
4. Google Maps åpnes med rute for alle merkede bestillinger

**Tips:**
- Bruker adressene som står i NISSY og søker i Google maps, hvis de ikke finnes kan de mappes manuelt, ta kontakt!
- Fungerer både for ventende og pågående oppdrag
- Filtrerer automatisk ut bestillinger som er markert som "Framme"


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
- Begrenser bredden på navn og adresse på ventende/pågående oppdrag og avtalenavn/ressursnavn i avtale/ressurs-tabell hvis det ikke er plass til alt.
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

### 📝 Bestillingsmodul (ALT+N)

Trykk på Alt+N for å få første pop-up med valg om foretrukket bestillingsmodul. Deretter åpnes enten 4-stegs eller ensides i en iframe modal.
Dette lagres i sesjonen, nullstilles når nettleser lukkes helt. Merk en bestilling og trykk Alt+M for å åpne møteplassfunksjonen i samme modal.
- Fanger opp "R"-linker i planleggingsvinduet åpner opp hentetid for redigering, merker tidspunktet slik at man kan skrive og scroller ned til bunnen av ensides.
- Fanger opp trykk på Møteplass og "K"-knappen i planleggingsvinduet og åpner dette i iframe modal (popup) isteden for ny fane.
- Fikser gammel NISSY-bug med "Tilbake"-knapp som ikke virker når det søkes etter behandlingssted i 4-steg/ensides.
- Fikser gammel NISSY-bug hvor Reisemåte sporadisk ble stående blank ved redigering av bestilling.

### ⚙️ Adminmodul (ALT+A)

Trykk på Alt+A for å åpne admin-modulen som setter fokus i person-fanen og telefonnummer. Tips her er å kopiere fra Zisson for å finne pasient så du slipper å spørre om personnummer.
Fanger opp "?"-linker i planleggingsvinduet og søker frem tur/bestilling velger øverste rad og scroller ned til resultatet automatisk

### 📋 **Handlingslogg (Alt+L)** 

Logger handlinger som tildeling, avbestilling av turer/bestillinger, fjerning av turer, avplanlegging.
Om du skulle være uheldig og tildele eller avbestille noe feil, så finner du nå lett tilbake til bestilling/tur.

### 📱 **Send-SMS (Alt+C)**
Send SMS til pasienter enkeltvis eller massevis basert på merkede bestillinger på ventende og pågående oppdrag.
"Send SMS til sjåfør" tilgjengelig ved å høyreklikke på løyve i ressurser, henter mobil fra 3003 automatisk.
- Kontor-spesifikke maler med automatisk utfylling av pasientnavn, adresser og tidspunkt fra bestillingsdata.
- Støtter tre mal-typer per kontor: bestilling (med info-variabler), fritekst og sjåfør-SMS.
- Automatisk valg av mal basert på henteadresse, f.eks. Trondheim lufthavn Værnes.
- Logger SMS-utsendelser i Handlingslogg.
- Tilgjengelig kun for Pasientreiser Nord-Trøndelag i første omgang. Ta kontakt for å konfigurere kontorspesifikke maler for og tilgjengeliggjøre for ditt kontor.

### 🖱️ **Hurtigmeny**
Høyreklikk på rader i Ventende, Pågående og Ressurser åpner en meny med hurtig tilgang til de viktigste funksjonene.
Høyreklikk utenfor tabellene åpner en generell meny med tilgang til alle moduler og manuelle script.
- Skjuler automatisk menyvalg for script som ikke er lastet inn i gjeldende pakke.
- Støtter Kopier / Klipp ut / Lim inn.
- Meny-header viser navn på valgt bestilling/ressurs og antall merkede rader.

## ❓ Feilsøking

### Bokmerket gjør ingenting

- Sjekk at du har limt inn hele koden (skal starte med `javascript:`)
- Prøv å oppdatere siden og klikk bokmerket igjen
- Åpne utviklerkonsollen (F12) og se etter feilmeldinger

### Snarveier virker ikke

- Bekreft at scriptet er lastet (åpne konsoll, skal se "✅ NISSY AMK lastet!")
- Prøv å laste siden på nytt
- Klikk bokmerket igjen

### Google Maps åpner ikke

- Sjekk at popup ikke er blokkert av nettleseren
- Godta Google Maps vilkår første gang, åpne Google Maps manuelt i nettleser
- Sjekk at du har merket bestillinger før du trykker ALT+Q

## 💡 Tips og triks

1. **Lagre bokmerket i bokmerkeslinjen** for rask tilgang
2. **F5 har ny funksjon**: Når du trykker på F5 refreshes alle bestillinger/turer og alle turer åpnes. Ikke hele siden.
3. **Benytt riktig URL til NISSY** Benytt: https://nissy6.pasientreiser.nhn.no/planlegging/ og https://nissy6.pasientreiser.nhn.no/rekvisisjon/ og https://nissy6.pasientreiser.nhn.no/administrasjon/ for å unngå å bli logget ut hele tiden.

## 📞 Support

Fant du en bug eller har forslag?
- Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)
- Se [README](../README.md) for mer utfyllende informasjon

---

**❤️ Make NISSY great 🤓**
