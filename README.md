# NISSY V13.37 🚀

Her ligger en rekke javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system der utviklingen har stagnert i påvente av erstattersystem.
Disse scriptene gjør arbeidsdagen langt mer effektiv, samt gir mer nyttig informasjon til planleggingen ved få tastetrykk. 
Anbefalt måte å bruke disse scriptene på er å installere ett av script-pakkene ved hjelp av bokmerke. De plasseres da som knapper i NISSY Planlegging-vinduet + snarveier.

## 📦 Innhold

### Script med snarveier

- ⌛ **NISSY-fiks**
  - Inneholder bugfikser, masse tastatursnarveier og forbedringer.
  - Automatisk kolonnejustering (skjuler/viser relevante kolonner).
  - Fikser bug med at filter ikke oppdaterer seg når bestillinger er merket når du bytter filter.
  - Åpner alle turer ved bytting av filter automatisk og ved søk.
  - Ved søk etter rekvisisjonsnummer så markeres den spesifikke bestillingen på en tur med flere bestillinger og raden velges i NISSY.
  - Setter snarveier til ofte brukte NISSY-funksjoner. F5 refresher/åpner alle turer. Se tabell lengre nede.
  - Lukker alle typer plakater ved trykk utenfor.
  - Begrenser tekstlengden på navn og adresse på ventende/pågående oppdrag og avtalenavn/ressursnavn i avtale/ressurs-tabell hvis det ikke er plass til alt.
  - Fikser problem med at NISSY-plakater lukker seg med en gang musen beveger seg over og forbi en annen plakat, timer på 500ms innført før ny plakat åpnes.
  - Fikser bug med at vis/skjul kolonner ventende/pågående og filtergruppe på ressurs/ventende får NISSY til å henge hvis bestillinger er merket når select-knappene benyttes.
  - Forbedrer kontrollpanel-tabellen med å fjerne knapper som ikke er i bruk og legger til snarveier ved mouse-over og snarvei til Møteplass.
  - Fanger opp "Vis i kart"-popupvindu og forbedrer størrelse og plassering (samme som Rutekalkulering)
  - "Vis i kart"-knapp grås ikke lenger ut ved mer enn 5 merkede bestillinger – ingen begrensning på antall.
- 🪄 **Smart-tildel (Alt+S)**
  - **OBS! ALLE BESTILLINGER MÅ KUNNE FÅ TREFF PÅ TILORDNINGSSTØTTE! KREVER KONFIGURASJON AV AVTALEMAPPING, TA KONTAKT FOR HJELP**
  - Semi-automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling uten behov for å velge avtale.
  - Mulighet for å definere regler for Storbil-avtaler når fler enn 3 pas. OBS! Tidspunkt må være nogenlunde korrekt for at den skal telle riktig.
  - Støtter også direkte tildeling til valgt avtale eller ressurs.
- 📆 **Tilordning 2.0 (Alt+T)**
  - Forbedret tilordningsstøtte, uendelig antall bestillinger kan merkes og tilordnes. Resultat vises i en diskret pop-up.
- 🕐 **Hentetid (Alt+E)** 
  - Lar deg merke bestillinger og turer (status tildelt) og redigere/beregne hentetider. Rekkefølge oppdateres fortløpende kronologisk basert på hentetid.
  - Kan beregne hentetid mot en annen oppmøtetid, men ny oppmøtetid lagres ikke om du glemmer å endre tilbake.
  - "H"-knapp lar deg åpne hendelsesloggen for å se tidligere hentetid/oppmøtetid.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/5201ecf7-cb29-41f4-ac07-4b672ed02bf0" />
- 🔠 **Rek-knapper (Alt+R - Trykk ESC for å lukke manuelt)**
  - Hurtigknapper for bestillinger på ventende/pågående oppdrag. Pop-up åpnes i iframe modal over planleggingsvindu.
  - [R] Rediger, [T] Lag retur, [H] Hendelseslogg, [S] Endre status, [K] Kopier bestilling og [M] Møteplass.
    - <img width="500" alt="image" src="https://github.com/user-attachments/assets/edb3a925-b37e-42b8-a985-790ae780117f" />
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Merk at det ikke er noen begrensning på bestillingens status. Planlagte bestillinger som endres på status "Startet"-ressurs (etter 3003 XML og første 4010-1701 XML) vil ikke generere 2000-XML!
  - Dette er svært nyttig for å rette opp feil adresse, tidspunkt, egenandel etc. på planlagte bestillinger på pågående oppdrag.
  - Fikser NISSY-bug hvor Reisemåte sporadisk ble stående blank ved redigering av bestilling.
- 🗺️ **Rutekalkulering (Alt+Q)**
  - Åpner merkede bestillinger/ressurser for rutekalkulering i Google maps.
  - Mapping-system som konverterer adresser/adressenavn i NISSY som Google sitt smart-søk ikke gjenkjenner til gjenkjennelig adresse.
- 🚕 **Ressursinfo (Alt+D)**
  - Rask tilgang til ressursinformasjon som planlagte/faktiske tider, adresser, posisjoner, telefonnummer til sjåfør.
  - Hvis transportør er Trøndertaxi vises link til "Løyveregister" som tar deg til Trøndertaxi sitt register som viser info om bilens kapasitet m.m.
  - Faktisk kjørerute plottes med rutekalkulering i Leaflet / OpenStreetMap med ikoner/farger for hver enkelt hendelse.
  - Viser 5021 XML (bilens nåværende posisjon) i vognløpshendelser og bilens faktiske kjørerute.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/eb88afa0-37d7-44da-8b2f-7769da4384ca" />
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/6a8525b0-8a46-4b7b-a0e9-e8afe2906249" />
- 📡 **Live ressurskart (Alt+Z)**
  - Åpner et interaktivt kart (Leaflet/OpenStreetMap) som viser siste kjente posisjon og hendelse for alle merkede ressurser
  - Henter data fra SUTI-meldinger som allerede er lastet i NISSY
  - Støtter alle kjente meldingstyper fra ITF/Cencom/Norgestaxi:
    - **5021** – Auto-posisjon (periodiske GPS-posisjoner fra bilen underveis)
    - **4010** – Bekreftelse på hentet/levert/bomtur/bil ved node
    - **3003** – Oppdrag bekreftet av sjåfør (med sjåførmobil)
    - **2000** – Planlagte turer og avtaleinformasjon
  - Viser alltid den **nyeste hendelsen** per ressurs
  - Viser planlagte stopp til valgt ressurs og beregnet kjørerute, kan toggles med knapper i header
  - Pop-up per markør inneholder: løyvenummer, avtalenavn, turnummer (med lenke til Admin), hendelsestype med ikon, tidspunkt, adresse, sjåførmobil (klikk for å kopiere), og planlagte turer
  - Automatisk oppdatering i konfigurerbart intervall (1–30 min, standard 5 min) – holdes levende så lenge vinduet er åpent
  - Manuell oppdateringsknapp tilgjengelig
  - Clustering av markører ved utzoomet visning, spiderfying ved klikk
  - All databehandling skjer lokalt i nettleseren – ingen persondata, løyvenummer eller koordinater sendes til eksterne tjenester
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/3bd5ef2e-6fa5-418a-b4f7-808999c62939" />

- 📝 **Bestillingsmodul (Alt+N)**
  - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen.
    - <img width="500" alt="image" src="https://github.com/user-attachments/assets/be203274-df7b-4799-8caa-76d3af2bbd3c" />

  - Åpner valgt bestillingsmodul i pop-up liggende over planleggingsvinduet.
  - Fikser NISSY-bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Fikser NISSY-bug med "Tilbake"-knapp som ikke virker når det søkes etter behandlingssted i 4-steg/ensides.
  - Fikser NISSY-bug hvor Reisemåte sporadisk ble stående blank ved redigering av bestilling.
  - Åpner "R"-linker i planleggingsvinduet i pop-up isteden for ny fane.
  - Åpner møteplass-funksjon i pop-up isteden for ny fane.
- ⚙️ **Adminmodul (Alt+A)**
  - Åpner admin-modulen i en ny pop-up iframe over planleggingsvinduet i person-fanen.
  - Åpner admin-linker i planleggingsvinduet i pop-up isteden for ny fane, søker opp tur/bestilling automatisk og scroller ned til innholdet automatisk.
- ✖️ **Avbestilling (Alt+K)**
  - Lar deg masse-avbestille merkede turer og bestillinger. Ikke mulig og avbestille turer etter 3003 XML.
  - Ny og forbedret pop-up og logikk for ressurser ved trykk på "avbestill/avplanlegg"-kryss på ventende, ressurs og pågående oppdrag.
  - Hindrer bruker fra å gjøre ting som ikke er i henhold til beste-praksis / SUTI-standard, som feks å avbestille bestillinger etter avstigning eller avbestille tur etter 3003.
  - <img width="250" alt="image" src="https://github.com/user-attachments/assets/24464cf1-e838-446c-8e4a-69607869bea8" /><img width="250" alt="image" src="https://github.com/user-attachments/assets/aa169114-34a7-42e4-b2ef-5c5b1776f751" /><img width="250" alt="image" src="https://github.com/user-attachments/assets/08d00111-24cd-4206-8f27-3d825554a02f" />

- 🚐 **Samkjøring (Alt+X)**
  - Velg aktuelle filter. Merk bestilling(er) på ventende eller en ressurs på pågående oppdrag og trykk på Samkjøring-knappen eller Alt+X. Algoritmen søker etter ressurser for samkjøring/returutnytting på valgte filter.
  - Baseres utelukket på tidspunkt for hent/oppmøte og postnummer for fra/til-adresse, så det er begrensninger for hva som er mulig, men mange gode forslag vil komme opp.
  - Kan merke en ressurs og søke etter andre ressurser på samme filter for replanlegging. F.eks. for å se om ressursen kan slåes sammen med andre ressurser.
  - Kan ikke merke bestilling på ventende og ressurs på pågående samtidig. Det er to forskjellige moduser.
  - Når ingenting er merket så søkes det innad på ventende oppdrag for mulig samkjøring mellom bestillingene. 
   - Kan velge hvilke man ønsker å samkjøre og merke disse for videre justering / tildeling.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/3ebda51d-813d-49e8-9592-3888c40e0719" />

- 📋 **Handlingslogg (Alt+L)** 
  - Logger handlinger som tildeling, avbestilling av turer/bestillinger, fjerning av turer, avplanlegging.
  - Om du skulle være uheldig og tildele eller avbestille noe feil, så finner du nå lett tilbake til bestilling/tur.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/060daa07-6149-48ac-9cb5-d373b25eeaf9" />

- 📱 **Send-SMS (Alt+C)**
  - Send SMS til pasienter enkeltvis eller massevis basert på merkede bestillinger på ventende og pågående oppdrag.
  - "Send SMS til sjåfør" tilgjengelig ved å høyreklikke på løyve i ressurser, henter mobil fra 3003 automatisk.
  - Kontor-spesifikke maler med automatisk utfylling av pasientnavn, adresser og tidspunkt fra bestillingsdata.
  - Støtter tre mal-typer per kontor: bestilling (med info-variabler), fritekst og sjåfør-SMS.
  - Automatisk valg av mal basert på henteadresse, f.eks. Trondheim lufthavn Værnes.
  - Logger SMS-utsendelser i Handlingslogg.
  - Tilgjengelig kun for Pasientreiser Nord-Trøndelag i første omgang. Ta kontakt for å konfigurere kontorspesifikke maler for og tilgjengeliggjøre for ditt kontor.
  - <img width="300" alt="image" src="https://github.com/user-attachments/assets/0f0780f4-e2cd-4c6a-a66e-e82704673130" /><img width="300" alt="image" src="https://github.com/user-attachments/assets/e48215bb-a6b6-4f08-8697-152a7c61a32a" /><img width="300" alt="image" src="https://github.com/user-attachments/assets/4400471f-a0da-4ed5-848c-2b0d9376f560" />

- 🖱️ **Hurtigmeny**
  - Høyreklikk på rader i Ventende, Pågående og Ressurser åpner en meny med hurtig tilgang til de viktigste funksjonene.
  - Høyreklikk utenfor tabellene åpner en generell meny med tilgang til alle moduler og manuelle script.
  - Skjuler automatisk menyvalg for script som ikke er lastet inn i gjeldende pakke.
  - Skjuler "Hentetid" fra pågående-meny når merket ressurs ikke har status Tildelt.
  - Støtter Kopier / Klipp ut / Lim inn.
  - Meny-header viser navn på valgt bestilling/ressurs og antall merkede rader.
  - <img width="200" alt="image" src="https://github.com/user-attachments/assets/3f6d6dd2-69d7-4f53-aadf-8dfc52591d92" /><img width="200" alt="image" src="https://github.com/user-attachments/assets/b2bfe108-22ea-4bce-98f9-72b3e1b9b8c7" /><img width="200" alt="image" src="https://github.com/user-attachments/assets/c1d70557-4dcb-4e35-b0a5-22da016fc649" /><img width="200" alt="image" src="https://github.com/user-attachments/assets/00835359-f1f7-46eb-b67a-3b60364f7787" />

- **Installeres som knapper og får dedikerte snarveier under Ressurser i NISSY Planlegging:**
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/3629686a-96c3-4444-b1ce-aaf7681055e9" />

### Individuelle script
- 🌙 **Darkmode** - Mørkere fargetema, men prøver å holde seg "tro" til NISSY-stilen.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/0f1a20bd-a732-459e-bdfd-53411187c4e0" />
 
- 🔔 **Overvåk-Ventende**
  - Overvåker ventende oppdrag for nye bestillinger og gir varsler med lyd, blinkende fane, toast-varsel i topp av planleggingsvindu og favicon i fanen. 
  - Teller x antall bestillinger på ventende oppdrag og viser dette som (x) i fanetittel.
  - Merker nye bestillinger automatisk ved bekrefting av toast-varsel.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/767bffcc-416d-469e-9965-e1ba4020037f" />
- 🚗 **Alenebil**
  - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- 🤖 **Auto-Bestill**
  - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/bba0705e-e731-4d40-a6dc-9a0eb7f2a169" />
- 🔍 **Sjekk-Bestilling**
  - Sjekker alle bestillinger på valgt filter og lar deg søke opp disse for å rette opp for: 
    - Duplikater, flere enn 2 bestillinger, flere bestillinger med samme fra- eller til-adresse
    - Om de har forskjellig dato på hentetid og leveringstid
    - Om hentetid er senere enn leveringstid (kun til behandling)
    - Om returer som har tidligere eller lik hentetid enn oppmøtetid på reisen til behandling for samme behandlingssted
    - Om reisetid er veldig kort, mellom 1-9 minutter, på reiser til behandling
    - Finner bestillinger med problematisk kombinasjon av spesielle behov. (RB+ERS, LB+LF, flere kombinasjoner kan legges til ved behov)
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/aded167b-e24b-49c1-9018-0415f8a2e7d4" />
- 🚩 **Sjekk-Plakat**
  - Finn alle røde plakater med fritekst på valgt filter, problematisk tekst vises først.
  - Eksempel på problematisk tekst: 'alenebil','hentes','adresse','framsete','rullestol','rullator','lav bil','liten bil','forsete','direktebil','må ha med seg'.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/0db4fff8-5d93-432f-84b4-9c6a0de47b1c" />
- 📞 **Sjekk-Telefon**
  - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/545d6093-74d8-4766-8b9d-5e7047fbf5ee" />
- 📊 **Statistikk**
  - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/0e1684da-dc52-49c4-9b3d-9f08c126c100" />
- 🚕 **Trøndertaxi-løyve**
  - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes.
- **Installeres som knapper over ventende oppdrag og nederst i footer i NISSY planlegging via script-pakke:**
  - <img width="937" height="47" alt="image" src="https://github.com/user-attachments/assets/12ce822f-7325-47d2-95bc-dc3a6abfb252" />
  - <img width="1037" height="47" alt="image" src="https://github.com/user-attachments/assets/2e8496f2-b91f-4bce-8540-2b3d2a62142f" />


## 📊 Oversikt alle features i script-pakker
Scriptene i tabell under har masse automatikk og dedikerte snarveier. De er plassert i script-pakker og trenger kun aktiveres en gang. 
Hvis du hard-refresher siden eller lukker nettleser må du aktivere script-pakken på nytt.
Under er en oversikt over de features som følger med i hver pakke.

| Features | AMK | Basic | Advanced |
|---------|-------|-------|----------|
| ⌛ NISSY-fiks | ✅ | ✅ | ✅ |
| 🔔 Overvåk-Ventende | ✅ | ✅ | ✅ |
| 🚗 Alenebil | ✅ | ✅ | ✅ |
| 🤖 Auto-Bestill | ✅ | ✅ | ✅ |
| 🔍 Sjekk-Bestilling | ✅ | ✅ | ✅ |
| 🚩 Sjekk-Plakat (Kun Nord-Trøndelag) | ✅ | ✅ | ✅ |
| 📞 Sjekk-Telefon | ✅ | ✅ | ✅ |
| 📊 Statistikk | ✅ | ✅ | ✅ |
| 🚖 Trøndertaxi-løyve | ✅ | ✅ | ✅ |
| 🖱️ Hurtigmeny | ✅ | ✅ | ✅ |
| 🌙 Darkmode | ✅ | ✅ | ✅ |
| 🗺️ Rutekalkulering (ALT+Q) | ✅ | ✅ | ✅ |
| 🚕 Ressursinfo (ALT+D) | ✅ | ✅ | ✅ |
| 📡 Live ressurskart (ALT+Z) | ✅ | ✅ | ✅ |
| 📝 Bestillingsmodul (ALT+N) | ✅ | ✅ | ✅ |
| ⚙️ Adminmodul (ALT+A) | ✅ | ✅ | ✅ |
| 📋 Handlingslogg (ALT+L) | ✅ | ✅ | ✅ |
| 📱 Send-SMS (ALT+C) | ✅ | ✅ | ✅ |
| ✖️ Avbestill (ALT+K) | ❌ | ✅ | ✅ |
| 🕐 Hentetid (ALT+E) | ❌ | ✅ | ✅ |
| 🔠 Rek-knapper (ALT+R) | ❌ | ✅ | ✅ |
| 🪄 Smart-tildel (ALT+S) | ❌ | ❌ | ✅ |
| 📆 Tilordning 2.0 (ALT+T) | ❌ | ❌ | ✅ |
| 🚐 Samkjøring (ALT+X) | ❌ | ❌ | ✅ |

## 🚀 Installasjon

### Script-pakker 
Velg mellom **AMK**, **Basic** eller **Advanced**

1. Opprett et nytt bokmerke i nettleseren din
2. Lim inn følgende kode som URL:

**AMK**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-amk.js');eval(await s.text());})();
```

**Basic**
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-basic.js');eval(await s.text());})();
```

**Advanced** (OBS! Trenger konfigurasjon for å virke som tiltenkt. Ta kontakt.)
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-advanced.js');eval(await s.text());})();
```

3. Gi bokmerket et navn (f.eks. "NISSY-Basic")
4. Klikk på bokmerket når du er inne i NISSY. Dette aktiverer all automatikk, knapper og snarveier og viser en pop-up med liste over snarveier og link til dokumentasjon.

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
| `ALT+Z` | Live ressurskart |
| `ALT+R` | Rek-knapper |
| `ALT+N` | Bestillingsmodul |
| `ALT+A` | Adminmodul |
| `ALT+M` | Møteplass |
| `ALT+K` | Avbestilling av turer/bestillinger |
| `ALT+E` | Hentetid |
| `ALT+X` | Samkjøring |
| `ALT+L` | Handlingslogg |
| `ALT+C` | Send-SMS |

## 🐛 Kjente feil / ofte stilte spørsmål

- F5 er ikke sperret, F5 bruker isteden "Åpne alle"-funksjonen til å oppdatere alle bestillinger/turer og åpne lukkede turer.
- Hvis F5 trykkes fort etter hverandre inne i en pop-up kan hele siden lastes inn på nytt, script må da aktiveres igjen.

## 🤝 Bidrag

Dette er et public repository for deling av javascript til brukere av NISSY Planlegging. Forbedringsforslag mottas gjerne via issues.

## 📝 Lisens

Privat - Kun for intern bruk i NISSY-systemet.

## 🔄 Changelog

Se [CHANGELOG.md](docs/CHANGELOG.md) for versjonhistorikk.

---

**❤️ Make NISSY great 🤓**
