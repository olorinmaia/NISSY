# NISSY V13.37 🚀

Her ligger en rekke javascript som fikser bugs, gir ny funksjonalitet og masse snarveier til et gammelt system der utviklingen har stagnert i påvente av erstattersystem.
Disse scriptene gjør arbeidsdagen langt mer effektiv, samt gir mer nyttig informasjon til planleggingen ved få tastetrykk. 
Anbefalt måte å bruke disse scriptene på er å installere ett av script-pakkene ved hjelp av bokmerke. De plasseres da som knapper i NISSY Planlegging-vinduet + snarveier.

## 📦 Innhold

### Script med snarveier

- ⌛ **NISSY-fiks**
  - Inneholder bugfikser, masse tastatursnarveier og forbedringer.
  - Automatisk kolonnejustering (skjuler/viser relevante kolonner).
  - Fikser bug med at filter ikke oppdaterer seg.
  - Åpner alle turer ved bytting av filter automatisk og ved søk.
  - Ved søk etter rekvisisjonsnummer så markeres den spesifikke bestillingen på en tur med flere bestillinger.
  - Setter snarveier til ofte brukte NISSY-funksjoner. F5 refresher/åpner alle turer. Se tabell lengre nede.
  - Lukker plakater ved trykk utenfor.
  - Begrenser tekstlengden på navn og adresse på ventende/pågående oppdrag dynamisk.
  - Fikser problem med at NISSY-plakater lukker seg med en gang musen beveger seg over og forbi en annen plakat, timer på 500ms innført før ny plakat åpnes.
- 🪄 **Smart-tildeling (Alt+S)**
  - Automatisk tildeling av bestillinger med RB/ERS-regler og passasjertelling uten behov for å velge avtale.
  - Mulighet for å definere regler for Storbil-avtaler når fler enn 3 pas. OBS! Tidspunkt må være nogenlunde korrekt for at den skal telle riktig.
- 📆 **Tilordningsstøtte 2.0 (Alt+T)**
  - Forbedret tilordningsstøtte, uendelig antall bestillinger kan merkes og tilordnes. Resultat vises i en diskret pop-up.
- 🕐 **Hentetid (Alt+E)** 
  - Lar deg merke bestillinger på ventende oppdrag og redigere hentetider. Rekkefølge oppdateres fortløpende kronologisk basert på hentetid.
- 🔠 **Rek-knapper (Alt+R - Trykk ESC for å lukke manuelt)**
  - Hurtigknapper for bestillinger på ventende/pågående oppdrag. Pop-up åpnes i iframe modal over planleggingsvindu.
  - [R] Rediger, [T] Lag retur, [H] Hendelseslogg, [S] Endre status, [K] Kopier bestilling.
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Merk at det ikke er noen begrensning på bestillingens status. Planlagte bestillinger som endres på status "Startet"-ressurs (etter 3003 XML og første 4010-1701 XML) vil ikke generere 2000-XML!
  - Dette er svært nyttig for å rette opp feil adresse, tidspunkt, egenandel etc. på planlagte bestillinger på pågående oppdrag.
  - WIP: [M] Møteplass
- 🗺️ **Rutekalkulering (Alt+Q)**
  - Åpner merkede bestillinger/turer for rutekalkulering i Google maps.
- 🚕 **Ressursinfo (Alt+D)**
  - Rask tilgang til ressursinformasjon som planlagte/faktiske tider, adresser, posisjoner, telefonnummer til sjåfør.
  - Hvis transportør er Trøndertaxi vises link til "Løyveregister" som tar deg til Trøndertaxi sitt register som viser info om bilens kapasitet m.m.
  - WIP: Når NISSY kan ta imot 5021 XML (bilens nåværende posisjon) kan dette vises i samme bilde.
- 📝 **Bestillingsmodul (Alt+N)**
  - Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen.
    - <img width="400" alt="image" src="https://github.com/user-attachments/assets/be203274-df7b-4799-8caa-76d3af2bbd3c" />

  - Åpner valgt bestillingsmodul i pop-up liggende over planleggingsvinduet.
  - Fikser bug med datasmitte mellom bestillinger da data alltid er nullstilt.
  - Åpner "R"-linker i planleggingsvinduet i pop-up isteden for ny fane.
- ⚙️ **Adminmodul (Alt+A)**
  - Åpner admin-modulen i en ny pop-up iframe over planleggingsvinduet i person-fanen.
  - Åpner admin-linker i planleggingsvinduet i pop-up isteden for ny fane.
- ✖️ **Avbestilling (Alt+K)**
  - Lar deg masse-avbestille merkede turer og bestillinger. Ikke mulig og avbestille turer etter 3003 XML.

- **Installeres som knapper og får dedikerte snarveier under Ressurser i NISSY Planlegging:**
  - <img width="400" alt="image" src="https://github.com/user-attachments/assets/63c48b59-f9cc-46cf-b448-c4634793027a" />

### Individuelle script
- 🚗 **Alenebil**
  - Setter behovet "Alenebil" på en eller flere merkede bestillinger. Nyttig når behovet er deaktivert
- 🤖 **Auto-Bestill**
  - Pop-up vindu som gir mulighet til å bestille opp alle turer på valgt filter med 0,25 sekunders mellomrom.
- 🔍 **Sjekk-Duplikat**
  - Sjekker alle bestillinger på valgt filter for duplikater, lar deg søke opp disse for å rette opp.
- 📞 **Sjekk-Telefon**
  - Sjekker alle bestillinger på valgt filter for manglende telefonnummer, lar deg søke opp disse for å rette opp.
- 📊 **Statistikk**
  - Beregner antall bestillinger på ventende/pågående oppdrag og beregner "samkjøringsgrad" basert på valgte filter i pop-up vindu.
- 🚕 **Trøndertaxi-løyve**
  - Kopierer løyvenummer til merket ressurs i NISSY Planlegging eller fra "Footer" i CTRL og åpner Trøndertaxi sitt løyveregister med informasjon om valgt ressurs om den finnes.
- **Installeres som knapper nederst i footer i NISSY planlegging via script-pakke:**
  - <img width="800" alt="image" src="https://github.com/user-attachments/assets/a886f2b2-3c03-4880-a73f-6759c8aef3df" />

## 📊 Oversikt alle features i script-pakker
Scriptene i tabell under har masse automatikk og dedikerte snarveier. De er plassert i script-pakker og trenger kun aktiveres en gang. 
Hvis du hard-refresher siden eller lukker nettleser må du aktivere script-pakken på nytt.
Under er en oversikt over de features som følger med i hver pakke.

| Features | Basic | Advanced |
|---------|-------|----------|
| ⌛ NISSY-fiks | ✅ | ✅ |
| 🚗 Alenebil | ✅ | ✅ |
| 🤖 Auto-Bestill | ✅ | ✅ |
| 🔍 Sjekk-Duplikat | ✅ | ✅ |
| 📞 Sjekk-Telefon | ✅ | ✅ |
| 📊 Statistikk | ✅ | ✅ |
| 🚖 Trøndertaxi-løyve | ✅ | ✅ |
| 🗺️ Rutekalkulering (ALT+Q) | ✅ | ✅ |
| 🚕 Ressursinfo (ALT+D) | ✅ | ✅ |
| 📝 Bestillingsmodul (ALT+N) | ✅ | ✅ |
| ⚙️ Adminmodul (ALT+A) | ✅ | ✅ |
| ✖️ Avbestill (ALT+K) | ❌ | ✅ |
| 🪄 Smart-tildeling (ALT+S) | ❌ | ✅ |
| 📆 Tilordningstøtte 2.0 (ALT+T) | ❌ | ✅ |
| 🔠 Rek-knapper (ALT+R) | ❌ | ✅ |

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
| `ALT+K` | Avbestilling av turer/bestillinger |

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
