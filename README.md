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
  - Ved søk etter rekvisisjonsnummer så markeres den spesifikke bestillingen på en tur med flere bestillinger.
  - Setter snarveier til ofte brukte NISSY-funksjoner. F5 refresher/åpner alle turer. Se tabell lengre nede.
  - Lukker alle typer plakater ved trykk utenfor.
  - Begrenser tekstlengden på navn og adresse på ventende/pågående oppdrag dynamisk.
  - Fikser problem med at NISSY-plakater lukker seg med en gang musen beveger seg over og forbi en annen plakat, timer på 500ms innført før ny plakat åpnes.
  - Fikser bug med at vis/skjul kolonner ventende/pågående og filtergruppe på ressurs/ventende får NISSY til å henge hvis bestillinger er merket når select-knappene benyttes.
  - Forbedrer kontrollpanel-tabellen med å fjerne knapper som ikke er i bruk og legger til snarveier ved mouse-over og snarvei til Møteplass.
  - Fanger opp "Vis i kart"-popupvindu og forbedrer størrelse og plassering (samme som Rutekalkulering)
- 🪄 **Smart-tildeling (Alt+S)**
  - Semi-automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling uten behov for å velge avtale.
  - Mulighet for å definere regler for Storbil-avtaler når fler enn 3 pas. OBS! Tidspunkt må være nogenlunde korrekt for at den skal telle riktig.
  - Støtter også direkte tildeling til valgt avtale eller ressurs.
- 📆 **Tilordningsstøtte 2.0 (Alt+T)**
  - Forbedret tilordningsstøtte, uendelig antall bestillinger kan merkes og tilordnes. Resultat vises i en diskret pop-up.
- 🕐 **Hentetid (Alt+E)** 
  - Lar deg merke bestillinger og turer (status tildelt) og redigere/beregne hentetider. Rekkefølge oppdateres fortløpende kronologisk basert på hentetid.
  - Kan beregne hentetid mot en annen oppmøtetid, men ny oppmøtetid lagres ikke om du glemmer å endre tilbake.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/9c97ce59-4c4e-4dcb-819f-4cc0395d578f" />
- 🔠 **Rek-knapper (Alt+R - Trykk ESC for å lukke manuelt)**
  - Hurtigknapper for bestillinger på ventende/pågående oppdrag. Pop-up åpnes i iframe modal over planleggingsvindu.
  - [R] Rediger, [T] Lag retur, [H] Hendelseslogg, [S] Endre status, [K] Kopier bestilling.
    - <img width="500" alt="image" src="https://github.com/user-attachments/assets/38dc474e-7fba-4314-9886-fd94debfdca8" />
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Merk at det ikke er noen begrensning på bestillingens status. Planlagte bestillinger som endres på status "Startet"-ressurs (etter 3003 XML og første 4010-1701 XML) vil ikke generere 2000-XML!
  - Dette er svært nyttig for å rette opp feil adresse, tidspunkt, egenandel etc. på planlagte bestillinger på pågående oppdrag.
- 🗺️ **Rutekalkulering (Alt+Q)**
  - Åpner merkede bestillinger/turer for rutekalkulering i Google maps.
- 🚕 **Ressursinfo (Alt+D)**
  - Rask tilgang til ressursinformasjon som planlagte/faktiske tider, adresser, posisjoner, telefonnummer til sjåfør.
  - Hvis transportør er Trøndertaxi vises link til "Løyveregister" som tar deg til Trøndertaxi sitt register som viser info om bilens kapasitet m.m.
  - WIP: Når NISSY kan ta imot 5021 XML (bilens nåværende posisjon) kan dette vises i samme bilde.
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/8011143e-8647-4530-9783-31bb27960fbe" />
- 📝 **Bestillingsmodul (Alt+N)**
  - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen.
    - <img width="500" alt="image" src="https://github.com/user-attachments/assets/be203274-df7b-4799-8caa-76d3af2bbd3c" />

  - Åpner valgt bestillingsmodul i pop-up liggende over planleggingsvinduet.
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
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
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/3ebda51d-813d-49e8-9592-3888c40e0719" />

- **Installeres som knapper og får dedikerte snarveier under Ressurser i NISSY Planlegging:**
  - <img width="500" alt="image" src="https://github.com/user-attachments/assets/3629686a-96c3-4444-b1ce-aaf7681055e9" />

### Individuelle script
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
  - Sjekker alle bestillinger på valgt filter for duplikater eller om de har forskjellig dato på "klar fra" og "oppmøte", lar deg søke opp disse for å rette opp.
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
- **Installeres som knapper nederst i footer i NISSY planlegging via script-pakke:**
  - <img width="800" alt="image" src="https://github.com/user-attachments/assets/bb22d6d9-125b-4fe8-a85b-f797e5385366" />

## 📊 Oversikt alle features i script-pakker
Scriptene i tabell under har masse automatikk og dedikerte snarveier. De er plassert i script-pakker og trenger kun aktiveres en gang. 
Hvis du hard-refresher siden eller lukker nettleser må du aktivere script-pakken på nytt.
Under er en oversikt over de features som følger med i hver pakke.

| Features | AMK | Basic | Advanced |
|---------|-------|-------|----------|
| ⌛ NISSY-fiks | ✅ | ✅ | ✅ |
| 🔔 Overvåk-Ventende | ✅ | ❌ | ❌ |
| 🚗 Alenebil | ✅ | ✅ | ✅ |
| 🤖 Auto-Bestill | ✅ | ✅ | ✅ |
| 🔍 Sjekk-Bestilling | ✅ | ✅ | ✅ |
| 🚩 Sjekk-Plakat (Kun Nord-Trøndelag) | ✅ | ✅ | ✅ |
| 📞 Sjekk-Telefon | ✅ | ✅ | ✅ |
| 📊 Statistikk | ✅ | ✅ | ✅ |
| 🚖 Trøndertaxi-løyve | ✅ | ✅ | ✅ |
| 🗺️ Rutekalkulering (ALT+Q) | ✅ | ✅ | ✅ |
| 🚕 Ressursinfo (ALT+D) | ✅ | ✅ | ✅ |
| 📝 Bestillingsmodul (ALT+N) | ✅ | ✅ | ✅ |
| ⚙️ Adminmodul (ALT+A) | ✅ | ✅ | ✅ |
| ✖️ Avbestill (ALT+K) | ❌ | ✅ | ✅ |
| 🕐 Hentetid (ALT+E) | ❌ | ✅ | ✅ |
| 🔠 Rek-knapper (ALT+R) | ❌ | ✅ | ✅ |
| 🪄 Smart-tildeling (ALT+S) | ❌ | ❌ | ✅ |
| 📆 Tilordningstøtte 2.0 (ALT+T) | ❌ | ❌ | ✅ |
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
| `ALT+R` | Rek-knapper |
| `ALT+N` | Bestillingsmodul |
| `ALT+A` | Adminmodul |
| `ALT+M` | Møteplass |
| `ALT+K` | Avbestilling av turer/bestillinger |
| `ALT+E` | Hentetid |
| `ALT+X` | Samkjøring |

## 🔧 Funksjonalitet

### Smart-Tildeling (ALT+S)
- **Automatisk RB/ERS-deteksjon**: Tildeler til riktig avtale når RB eller ERS er påkrevd selv om første reisende ikke har RB/ERS-behov
- **Passasjertelling**: Teller overlappende passasjerer og velger riktig avtale ved >3 reisende
- **Ressurs-tildeling**: Støtter direkte tildeling til valgt ressurs
- **Avtale-tildeling**: Støtter direkte tildeling til valgt avtale
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
- Hensyntar enkelte spesielle behov som LB (tar 1 ekstra kapasitet)

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
