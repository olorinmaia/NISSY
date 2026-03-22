# 📝 Endringslogg

Alle viktige endringer i NISSY-scriptene vil bli dokumentert i denne filen.

## Planlagt
- Kontinuerlig forbedring av eksisterende scripts, nye script legges til fortløpende når testet ferdig.
- Live ressurskart som viser merkede ressurser sin siste posisjon og hendelse samt annen nyttig info.

---
## 🚀 [3.9.4] - 22.03.2026

### NISSY-fiks: Forbedringer til visning og pop-up-håndtering

- ⌛ **NISSY-fiks**
  - Merknad og Avvik for ressurser lukkes ikke lenger ved klikk utenfor pop-upen
  - Fjerner nå kontor-spesifikke elementer fra planleggingssiden for Pasientreiser Nord-Trøndelag (løyveregister-knapp, transportør-filter og Locus-logo)
  - Justering av padding i knapperekken for å unngå uønsket scrolling i midtre container

## 🚀 [3.9.3] - 18.03.2026

### NISSY-bugfiks i Bestillingsmodul/Rek-knapper, forbedring til Adminmodul og tidspunktbasert sortering i Rutekalkulering

- 📝 **Bestillingsmodul** og 🔠 **Rek-knapper**
  - Fikset gammel NISSY-bug hvor Reisemåte sporadisk ble stående blank ved redigering av bestilling
- ⚙️ **Adminmodul**
  - Husker nå hvilke rader som var markert når en modal (pop-up) åpnes, og re-markerer dem automatisk etter oppdatering når modalen lukkes
- 🗺️ **Rutekalkulering**
  - Sorterer nå alle merkede bestillinger (ventende og pågående) kronologisk etter hentetid
  - Bestillinger som overlapper i tid – dvs. passasjerer som sitter i bilen samtidig – grupperes i samme segment: alle henteadresser vises først, deretter alle leveringsadresser
  - Returer (lik hentetid og leveringstid) håndteres med en 5-minutters margin for overlappgjenkjenning
- ✖️ **Avbestilling** 
  - Lagt til kontorsjekk for enkelte valideringsregler

## 🚀 [3.9.2] - 16.03.2026

### Ny tidspunkt-sjekk i Sjekk-bestilling og forbedring til Hentetid

- 🔍 **Sjekk-Bestilling**
  - Finner nå bestillinger som har svært kort reisetid (mellom 1-9 minutter)
- 🕐 **Hentetid** 
  - Gir nå påminner om å gi ekstra tid ved 4+ bestillinger som skal samkjøres
- 🔠 **Rek-knapper**
  - Forbedret lukke-knapp til å se og oppføre seg likt som i bestillingsmodul/adminmodul

## 🚀 [3.9.1] - 11.03.2026

### Lagt til kontor-spesifikke maler i Send-SMS

- 📱 **Send-SMS**
  - Lagt til kontor-spesifikke maler for Pasientreiser Møre og Romsdal.

## 🚀 [3.9.0] - 11.03.2026

### To nye script 📱 Send-SMS og 🖱️ Hurtigmeny lansert

- 📱 **Send-SMS (Alt+C)**
  - Send SMS til pasienter enkeltvis eller massevis basert på merkede bestillinger på ventende og pågående oppdrag.
  - "Send SMS til sjåfør" tilgjengelig ved å høyreklikke på løyve i ressurser, henter mobil fra 3003 automatisk.
  - Kontor-spesifikke maler med automatisk utfylling av pasientnavn, adresser og tidspunkt fra bestillingsdata.
  - Støtter tre mal-typer per kontor: bestilling (med info-variabler), fritekst og sjåfør-SMS.
  - Automatisk valg av mal basert på henteadresse, f.eks. Trondheim lufthavn Værnes.
  - Logger SMS-utsendelser i Handlingslogg.
  - Tilgjengelig kun for Pasientreiser Nord-Trøndelag i første omgang. Ta kontakt for å konfigurere kontorspesifikke maler for og tilgjengeliggjøre for ditt kontor.
- 🖱️ **Hurtigmeny**
  - Høyreklikk på rader i Ventende, Pågående og Ressurser åpner en meny med hurtig tilgang til de viktigste funksjonene.
  - Høyreklikk utenfor tabellene åpner en generell meny med tilgang til alle moduler og manuelle script.
  - Skjuler automatisk menyvalg for script som ikke er lastet inn i gjeldende pakke.
  - Skjuler "Hentetid" fra pågående-meny når merket ressurs ikke har status Tildelt.
  - Støtter Kopier / Klipp ut / Lim inn.
  - Meny-header viser navn på valgt bestilling/ressurs og antall merkede rader.

## 🚀 [3.8.7] - 05.03.2026

### Liten forbedring til Alenebil-script og Rek-knapper
- 🚗 **Alenebil**
  - Forbedret pop-up og lagt til remarkering av bestilling(er) etter lagring av alenebil-behovet
- 🔠 **Rek-knapper**
  - Setter nå fokus i iframe ved bruk av K, H og S slik at hurtigtaster kan benyttes uten å klikke først

## 🚀 [3.8.6] - 03.03.2026

### NISSY-fiks begrenser tekstlengde på Avtalenavn/Ressursnavn og forbedringer til en rekke scripts
- ⌛ **NISSY-fiks**
  - Begrenser tekstlengden på avtalenavn/ressursnavn i avtale/ressurs-tabell hvis det ikke er plass til alt.
- 🚕 **Ressursinfo**
  - 3003-koordinater vises nå i vognløpshendelser isteden (Kun Cencom)
- 🕐 **Hentetid** 
  - Forbedret kronologisk rekkefølge av bestillinger i pop-up og re-markering av rader etter lagring
  - Viser en unik bestilling kun en gang på merket ressurs hvis bestillinger er "duplisert"
    - NISSY har en sporadisk visningsbug av "duplikate" bestillinger når de redigeres på tildelt ressurs
    - Kan fikses med å toggle alle bestillinger, avbestille/tildele turen på nytt eller "B"-e ut turen (Bare visningsfeil, vil rette seg selv automatisk til slutt)
- 📝 **Bestillingsmodul** og 🔠 **Rek-knapper**
  - Forbedret re-markering av rader etter lukking av iframe modal.
  - Forbedret nullstilling av rekmodul ved åpning/lukking av iframe modaler for å unngå NISSY-bug med datasmitte mellom bestillinger

## 🚀 [3.8.5] - 02.03.2026

### Ressursinfo viser posisjon når bil bekrefter oppdrag (3003) og bugfiks for rekmodulene
- 🚕 **Ressursinfo**
  - Lagt til "Vis i kart"-knapp ved Oppdrag bekreftet (3003) hvis koordinater er tilgjengelig. Kun Cencom som sender dette per nå
  - Posisjon og tidspunkt når oppdrag ble bekreftet vises også i bilens faktiske kjørerute
- 📝 **Bestillingsmodul** og 🔠 **Rek-knapper**
  - Fikset bug med "Tilbake"-knappen som ikke virker når det søkes på hente/leveringssted i 4-stegs/ensides
  - Bestillingsmodul: Hvis bestilling(er)/ressurs(er) var merket før redigering/møteplass så merkes de nå på nytt etter lukking av pop-up
- 🔍 **Sjekk-Bestilling**
  - Forbedret sjekk for: Retur-hentetid lik eller før oppmøtetid

## 🚀 [3.8.2] - 26.02.2026

### Forbedringer til flere script
- 📝 **Bestillingsmodul** + 🔠 **Rek-knapper** + ⚙️ **Adminmodul** 
  - Forbedret plassering av iframe modal / "pop-up".
  - Forbedret scrolling og fokus i rek-knapper og bestillingsmodul
- **"Vis i kart"-knapp har nå samme bakgrunnsfarge i de fleste script**
- 🚕 **Ressursinfo**
  - Skjuler automatisk 4010-1709 (bil ved node) når det er mange hendelser for å unngå scrolling

## 🚀 [3.8.1] - 25.02.2026

### Forbedringer til Ressursinfo og små justeringer på andre script
- 🚕 **Ressursinfo**
  - Forbedret visning i enkelthendelse og kjørerute og farger i header
  - Forbedret kartvisning uavhengig av skjermstørrelse/zoom
- 🗺️ **Rutekalkulering** 
  - Lagt til mappinger på diverse sykehus og adresser
- **Loadere**
  - Justert fargekontraster på knapper for bedre synlighet

## 🚀 [3.8.0] - 22.02.2026

### Ressursinfo bruker nå nytt og bedre kart med mer funksjonalitet
- 🚕 **Ressursinfo**
  - Kjørerute/Koordinat-visning bruker nå Leaflet/OpenStreetMap (open source) i stedet for Google Maps.
  - Fordeler:
    - Bedre personvern - all data behandles lokalt i nettleseren
    - Gratis og ubegrenset bruk
    - Fargekodede hendelse-ikoner med tidsstempel
    - Støtter også ruting med fallback til luftlinje (OSRM ruting)
    - Automatisk clustering av overlappende hendelser
  - Datasikkerhet:
    - Kun koordinater sendes til routing-tjeneste - ingen pasientnavn, løyvenummer eller adresser sendes eksternt.
- ⚙️ **Adminmodul** 
  - Husker nå siste besøkte URL når modul lukkes og gjenåpner denne ved neste gang modul åpnes

## 🚀 [3.7.0] - 19.02.2026

### Overvåk-Ventende forbedret og ny sjekk for Sjekk-bestilling
- 🔔 **Overvåk-Ventende** 
  - Parser nå bestillinger direkte fra NISSY sin XHR-respons (XML) på intern-refresh istedenfor DOM. DOM Benyttes kun som fallback hvis XHR-respons failer.
  - Overvåker både automatisk intern-refresh (hvert 30. - 60. sek) og manuell refresh (F5/Åpne Alle)
  - Sjekker også når fanen blir aktiv igjen (Page Visibility API)
  - Fungerer pålitelig selv når fanen er inaktiv
- 🔍 **Sjekk-Bestilling**
  - Finner nå returer som har tidligere hentetid enn reisen til behandling på samme behandlingssted

## 🚀 [3.6.1] - 17.02.2026

### Sjekk-bestilling finner nå feil på tidspunkt og lagt til mapping for Ålesund sjukehus i Rutekalkulering
- 🔍 **Sjekk-Bestilling**
  - Sjekker nå for feil på tidspunkt: Hvis hentetid er senere enn leveringstid (logisk umulig) så fanges dette opp og lar deg søke opp for å rette.
    - Prøver å filtrere bort reiser fra behandling, det er for mange tilfeller av tidspunktfeil pga API-bestillinger (har meldt feil til Pas HF)
  - Forbedret "Søk i planlegging"-funksjonalitet: Når kun 1 bestilling søkes det på rekvisisjonsnummer.
- 🚐 **Samkjøring**
  - Forbedret logikk på returer og lagt til ytterlig blokkeringslogikk for returer når de samkjøres.
- 🗺️ **Rutekalkulering** 
  - Lagt til mapping av adresser knyttet til Ålesund sjukehus for å sikre riktig rutekalkulering der adressene fra NISSY ikke får treff eller feil treff i Google maps.

## 🚀 [3.6.0] - 15.02.2026

### Nytt script Handlingslogg og forbedringer til flere script
- 📋 **Handlingslogg**
  - Logger handlinger som tildeling, avbestilling, fjerning, avplanlegging.
  - Om du skulle være uheldig og tildele eller avbestille noe feil, så finner du nå lett tilbake til bestilling/tur.
  - Installeres som en knapp over ventende oppdrag. Snarvei: Alt+L.
- ⌛ **NISSY-fiks**
  - Ved søk etter rekvisisjonsnummer velges nå raden på ventende eller pågående oppdrag.
- 🚐 **Samkjøring**
  - Ny modus: Når ingenting er merket så søkes det innad på ventende oppdrag for mulig samkjøring mellom bestillingene. 
  - Ny modus: Hvis 2+ ventende bestillinger er merket, anses de som at de skal samkjøres, og søker samlet etter ressurser på pågående oppdrag.
  - Kan velge hvilke man ønsker å samkjøre og merke disse for videre justering / tildeling.
- 🔔 **Overvåk-Ventende** 
  - Lagt til i basic- og advanced-loader. Installeres som en knapp over ventende oppdrag.
  - Forbedret slik at knappen får en grønn bakgrunnsfarge når overvåking er aktiv. Når deaktivert har knappen vanlig blå bakgrunnsfarge.

## 🚀 [3.5.1] - 10.02.2026

### Forbedringer til 🚩 Sjekk-Plakat 
- 🚩 **Sjekk-Plakat**
  - Kan nå fjerne all fritekst med ny knapp "Fjern fritekst", fungerer kun for ventende og pågående bestilling med status tildelt.

## 🚀 [3.5.0] - 09.02.2026

### Ny loader for AMK og nytt script 🔔 Overvåk-Ventende og forbedringer til en rekke scripts.

#### Hva er nytt?
- **Ny loader for AMK**
  - Ny tilpasset loader for AMK som inneholder nytt script for overvåking av ventende oppdrag og flere script som er nyttig for deres bruk.
- **Nytt script 🔔 Overvåk-Ventende** (Kun loader-AMK i første omgang)
  - Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. Teller også antall bestillinger på ventende oppdrag i parentes.
  - Kan startes og stoppes ved trykk på knapp som ligger over ventende oppdrag. Startes automatisk for loader-AMK.
  - Merker nye bestillinger automatisk ved bekrefting av toast-varsel.
- **🔍 Sjekk-Bestilling / 🚩 Sjekk-Plakat / 🚐 Samkjøring / 🕐 Hentetid / ✖️ Avbestilling** 
  - Filtrer bort H0101 / U0101 osv fra adressene som vises i pop-uper da det tar unødvendig plass og er irrelevant.
- 🪄 **Smart-tildel** 
  - Kan nå velge en avtale og trykke på Smart-tildel-knapp eller Alt+S for å tildele til den.

## 🚀 [3.4.1] - 06.02.2026

### Sjekk-Bestilling forbedret

#### Hva er nytt?
- 🔍 **Sjekk-Bestilling**
  - Finner nå bestillinger med problematisk kombinasjon av spesielle behov. (RB+ERS, LB+LF, flere kombinasjoner kan legges til ved behov)
  - Forbedret sjekk av duplikate bestillinger, slik at 2 bestillinger med lik fra- ELLER til-adresse slår ut. Tidligere måtte begge være like.
  - Lagt til kolonnevalidering, slik at scriptet alltid vil virke, hvis nødvendige kolonner mangler kastes feilmelding.

## 🚀 [3.4.0] - 05.02.2026

### Nytt script: 🚩 Sjekk-Plakat (Kun synlig for Nord-Trøndelag i første omgang) og Samkjøring kan nå replanlegge ressurs

#### Hva er nytt?
- 🚩 **Sjekk-Plakat**
  - Finn alle røde plakater med fritekst på valgt filter, problematisk tekst vises først
  - Problematisk tekst: 'alenebil','hentes','adresse','framsete','rullestol','rullator','lav bil','liten bil','forsete','direktebil','må ha med seg'
- 🚐 **Samkjøring**
  - Kan nå merke en ressurs og søke etter andre ressurser på samme filter for replanlegging. F.eks. for å se om ressursen kan slåes sammen med andre ressurser.
  - Kan ikke merke bestilling på ventende og ressurs på pågående samtidig. Det er to forskjellige moduser.

## 🚀 [3.3.1] - 03.02.2026

### Forbedringer til Samkjøring

#### Hva er nytt?
- 🚐 **Samkjøring**
  - Får nå treff på samkjøringsforslag på overlappende reiser f.eks. fra Rørvik til Namsos/Levanger/Trondheim innenfor visse tidsgrenser.
  - Fikset slik at Verran/Flatanger/Statland -> Namsos og Frosta -> Levanger blir klassifisert som en lang reise. Overstyrer enkelte serier med postnummer som har kort avstand, men som i realiteten er lange reiser.

## 🚀 [3.3.0] - 01.02.2026

### Nytt script: 🚐 Samkjøring

#### Hva er nytt?
- 🚐 **Samkjøring (Alt+X)** (Kun tilgjengelig på ADVANCED-pakke i første omgang)
  - Merk bestilling(er) på ventende oppdrag, velg aktuelle filter og trykk på Samkjøringsknappen eller Alt+X. Algoritmen søker etter ressurser for samkjøring/returutnytting på valgte filter.
  - Baseres utelukket på tidspunkt for hent/oppmøte og postnummer på fra/til-adresse, så det er begrensninger for hva som er mulig, men mange gode forslag vil komme opp.
- 🕐 **Hentetid** 
  - Forbedre sjekk av påkrevde kolonner ala hva som ble gjort i Samkjøring-scriptet

## 🚀 [3.2.1] - 27.01.2026

### ⌛ NISSY-fiks fanger opp "Vis i kart"-popupvindu og forbedrer størrelse og plassering (samme som Rutekalkulering)

## 🚀 [3.2.0] - 26.01.2026

### Ny funksjonalitet og forbedringer til Avbestilling + forbedringer til flere andre script!

#### Hva er nytt?
- ✖️ **Avbestilling** 
  - Forbedret utgråingslogikk ved avbestilling av turer/bestillinger, bruker NISSY sin egen funksjon riktig.
  - Ny funksjon: Avplanlegging og Fjern fra planlegging.
    - Fanger opp klikk på kryss i pågående oppdrag og i ressurser i ny forbedret pop-up.
  - Sperrer av muligheten for å avbestille ved kryss etter 3003 XML.
  - Gir advarsler til bruker ved avplanlegging av samkjørte bestillinger.
  - Forbedret lukking av pop-up og oppdatering av bestilling/turer.
- 🕐 **Hentetid** 
  - Smart-select av tidspunkt, TT eller MM ved dobbelklikk, tab/enkeltklikk velger hele TT:MM.
- ⚙️ **Adminmodul** 
  - Forbedret auto-søk for tur/bestilling: Velger nå øverste rad og scroller ned til resultatet automatisk
- 📝 **Bestillingsmodul** + 🔠 **Rek-knapper** + ⚙️ **Adminmodul** 
  - Ved søk med CTRL+F så søkes det kun i inneholdet i pop-up/modal, ikke i bakgrunnen. Tips: Lukk CTRL+F med ESC for bedre opplevelse etter søk.
- 🔠 **Rek-knapper**
  - Forbedre lukking av rek-knapper ytterligere ved klikk på diverse elementer som kan forandre rekkefølgen av bestillinger/turer

## 🚀 [3.1.0] - 23.01.2026

### Forbedring til Smart-tildel

#### Hva er nytt?
- 🪄 **Smart-tildel** 
  - Forbedret tildeling med Alt+S slik at merket ressurs de-selekteres ved tildeling.

## 🚀 [3.0.0] - 20.01.2026

### 🎉 Hentetid, Rek-knapper og Avbestilling-script lagt til Basic-pakken

#### Hva er nytt?
- **Loader-Basic**
  - Ytterlig tre script lagt til Basic-pakken.
- 🚕 **Trøndertaxi-løyve**
  - Åpner vindu selv om ingen løyve blir funnet, slik at man kan søke i registeret.

## 🚀 [2.9.0] - 19.01.2026

### 🎉 NISSY-fiks forbedrer kontrollpanel-tabellen

#### Hva er nytt?
- ⌛ **NISSY-fiks** 
  - Forbedrer kontrollpanel-tabellen med å fjerne knapper som ikke er i bruk og legger til snarveier ved mouse-over.
- 📝 **Bestillingsmodul** 
  - Møteplass-knappen har fått snarvei Alt+M og åpnes i pop-up over planleggingsvinduet.

## 🚀 [2.8.0] - 17.01.2026

### 🎉 Hentetid beregner nå hentetid med egendefinert oppmøtetid og forbedringer til Smart-tildel, Rek-knapper og Sjekk-Bestilling

#### Hva er nytt?
- 🕐 **Hentetid** 
  - Lar deg nå også beregne hentetid basert på oppmøtetid eller redigert oppmøtetid.
- 🪄 **Smart-tildel** 
  - Innført håndtering av spesielle behov, i første omgang så teller LB som 2 i kapasitet.
  - Returer med dårlig datakvalitet, hent 09:00 lever 08:00 (tilbake i tid) telles nå riktig.
  - Innført 5 min margin for returer, hvis returer med like tidspunkt på hent/lever er 11:05, 11:10, 11:15 så telles de nå som 3 isteden for 1.
- 🔍 **Sjekk-Bestilling** (Tidligere Sjekk-Duplikat)
  - Sjekker nå for bestillinger med ulik dato på hentetid og leveringstid og lar deg søke opp disse for å rette opp.
- 🔠 **Rek-knapper**
  - Gir en advarsel hvis "R"-rediger brukes på en bestilling på en ressurs som ikke har status "Tildelt" eller "Bekreftet" om at bestilling blir lagret, men ikke sendt til transportør.

## 🚀 [2.7.0] - 16.01.2026

### 🎉 Hentetid fungerer nå for både ventende og pågående oppdrag

#### Hva er nytt?
- 🕐 **Hentetid** 
  - (Alt+E) Lar deg nå også redigere hentetid på bestillinger tilhørende turer med status **tildelt** på pågående oppdrag.
  - Lagt til "Vis i kart" oppe til høyre i pop-up, viser merkede bestillinger i kartet.
- ⌛ **NISSY-fiks** 
  - Fikser bug med at vis/skjul kolonner ventende/pågående og filtergruppe på ressurs/ventende får NISSY til å henge hvis bestillinger er merket når select-knappene benyttes.

## 🚀 [2.6.1] - 14.01.2026

### Skjuling av ubrukte elementer og "K"-knapp på pågående oppdrag åpnes i Bestillingsmodul

#### Hva er nytt?
- Fjerner filter i header og checkbox for dynamiske plakater i footer som ikke har noen funksjon lengre. 
- Bestillingsmodul fanger opp trykk på "K"-knapp (kopier bestilling ved ikke møtt) på pågående oppdrag.
- Rek-knapper lukkes nå automatisk ved bruk av Smart-tildel, tilordning 2.0, avbestill, hentetid og filterbytte, søk og nullstill.

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
