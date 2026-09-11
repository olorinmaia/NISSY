# Konfigurere SMS-maler for Send-SMS

Send-SMS-funksjonen støtter kontor-spesifikke maler som automatisk fyller inn pasientnavn, adresser og tidspunkt fra bestillingsdata.

## Globale standardmaler

Alle kontor får automatisk et sett med generelle standardmaler («Hentetidspunkt», «Endret hentetidspunkt», «Planlagt reise til behandling», «Ring oss tilbake», «Forsinkelse» m.fl.), signert «Hilsen Pasientreiser». Disse passer for de fleste kontor og krever ingen konfigurasjon.

Send-SMS-funksjonen (Alt+C) erstatter dermed NISSYs egen SMS-funksjon for alle kontor, ikke bare de med egne maler. 

Ønsker dere egne, kontorspesifikke maler (f.eks. med lokalt telefonnummer, flyplass-maler eller egen signatur) i stedet for standardmalene, må dette konfigureres – se under.

---

## Steg 1 – Finn kontorets navn

Kontorets navn hentes automatisk fra NISSY og brukes til å koble riktige maler til riktig kontor. Finn det øverst til venstre i NISSY Planlegging:

```
Pasientreisekontor for [Kontorets navn]
```

Eksempel: `Pasientreiser Nord-Trøndelag`

Det er dette navnet (uten «Pasientreisekontor for») som skal stå som kontor-nøkkel.

---

## Steg 2 – Tilpass malene

Tre mal-typer støttes per kontor:

| Type | Beskrivelse |
|---|---|
| `bestilling` | Brukes i enkelt/masse-modus når bestillinger er merket. Kan bruke info-variabler. |
| `fritekst` | Ingen bestilling merket – kun statisk tekst med manuelle plassholdere. |
| `sjaafor` | Sjåfør-SMS via høyreklikk på ressurs. Kan bruke info-variabler fra bestillingene på ressursens tur, samt turnummer. |

### Tilgjengelige variabler i `bestilling`-maler

| Variabel | Eksempel – samme dag | Eksempel – frem i tid |
|---|---|---|
| `info.pasientNavn` | `Johnsen, Alf` | `Johnsen, Alf` |
| `info.fornavn` | `Alf` | `Alf` |
| `info.reiseTid` | `18:36` | `06.03 08:00` |
| `info.oppTid` | `19:00` | `06.03 09:00` |
| `info.fraAdresse` | `Brubakken 15, 7608 Levanger` | `Brubakken 15, 7608 Levanger` |
| `info.tilAdresse` | `St. Olavs Hospital, 7006 Trondheim` | `St. Olavs Hospital, 7006 Trondheim` |

Bruk alltid `formaterTid(info.reiseTid)` og `formaterTid(info.oppTid)` i stedet for variablene direkte – da formateres tidspunktet riktig i begge tilfeller:
- Samme dag: `18:36` → `kl. 18:36`
- Frem i tid: `06.03 08:00` → `06.03 kl. 08:00`

I `fritekst`-maler er ingen variabler tilgjengelig – bruk plassholdere som `TT:MM` for tidspunkt og skriv inn manuelt ved sending.

`autoVelgHvis(info)` er valgfri per mal – returnerer `true` for å automatisk velge malen basert på f.eks. adresse.

### Tilgjengelige variabler i `sjaafor`-maler

Sjåfør-maler har de samme variablene som `bestilling`-maler, hentet fra bestillingene som ligger på ressursens tur i pågående oppdrag. Turen finnes automatisk ut fra ressursen, så ingenting trenger å være merket i pågående oppdrag. Høyreklikk på ressursen og velg «Send SMS til sjåfør», eller merk ressursen og trykk Alt+C, så fylles malen ut. I tillegg finnes:

| Variabel | Eksempel | Beskrivelse |
|---|---|---|
| `info.turNummer` | `72334460` | Turnummeret til ressursen (kun i sjåfør-maler) |
| `info.initialer` | `A.E.J.` | Pasientens initialer – fornavn og mellomnavn først, etternavn sist |
| `info.bestillinger` | – | Liste over alle bestillinger på turen. Hver har `fraAdresse`, `tilAdresse`, `reiseTid`, `oppTid`, `pasientNavn`, `fornavn` og `initialer` |

`info.fraAdresse`, `info.initialer` osv. på toppnivå peker på den første bestillingen. Skal alle bestillingene på turen med i meldingen, bruk `forHverBestilling(info, (b, i) => ..., skille)` – den lager én tekstbit per bestilling og slår dem sammen (`i` er løpenummeret fra 0, standard skille er linjeskift).

Eksempelet under er malen Nord-Trøndelag bruker for å sende hele turoppdraget til sjåføren på SMS ved taksameterproblemer. Den ligger også i de globale standardmalene:

```javascript
{
  navn: "Turoppdrag (ved taksameterproblemer)",
  // Lister alle bestillinger på turen (merk turen i pågående oppdrag)
  tekst: (info) =>
    `Hei. Dette er en melding som ikke kan besvares.\n\nBestillinger på turnummer ${info.turNummer}:\n\n` +
    forHverBestilling(info, (b, i) =>
      `${i + 1}) ${b.initialer}\nHenting ${formaterTid(b.reiseTid)}` +
      (b.oppTid ? `, oppmøte ${formaterTid(b.oppTid)}` : "") +
      `\nFra: ${b.fraAdresse}\nTil: ${b.tilAdresse}`
    , "\n\n") +
    `\n\nFor spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
},
```

Ligger turen ikke i pågående oppdrag når sjåfør-SMS åpnes (f.eks. fordi den er ferdig kjørt), fylles variablene med plassholdere (`XXXX`, `TT:MM`, `INITIALER`) som kan skrives over manuelt. Turnummeret hentes alltid fra ressursraden.

---

## Steg 3 – Eksempel (bruk som mal)

Nedenfor er et fullstendig eksempel fra Pasientreiser Nord-Trøndelag. Kopier blokken, erstatt kontorets navn og tilpass meldingstekster og telefonnummer. Fjern maler dere ikke trenger, og legg til nye ved behov.

```javascript
// ----------------------------------------------------------
// Pasientreiser Nord-Trøndelag
// ----------------------------------------------------------
'Pasientreiser Nord-Trøndelag': {

  bestilling: [
    {
      navn: "Hentetidspunkt",
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise er planlagt med henting ${formaterTid(info.reiseTid)} fra ${info.fraAdresse}.\nHentetid kan variere med +/- 15 minutter. Vær parfymefri.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Endret hentetidspunkt",
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDitt hentetidspunkt er endret til ${formaterTid(info.reiseTid)} fra ${info.fraAdresse}.\nHentetid kan variere med +/- 15 minutter. Vær parfymefri.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Planlagt reise til behandling",
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise til ${info.tilAdresse} med oppmøte ${formaterTid(info.oppTid)} er planlagt.\nHenting ca. ${formaterTid(info.reiseTid)} fra ${info.fraAdresse}.\nHentetid kan variere med +/- 15 minutter. Vær parfymefri.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Trondheim lufthavn - innenfor åpningstid",
      autoVelgHvis: (info) =>
        /trondheim lufthavn|værnes|TRD/i.test(info.fraAdresse),
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn med henting ${formaterTid(info.reiseTid)}.\nRing 05515 når du har landet og er reiseklar slik at vi kan tildele din bestilling til transportør.\n\nDu kan se og endre dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Trondheim lufthavn - utenfor åpningstid",
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn med henting ${formaterTid(info.reiseTid)} som er tildelt transportør.\nRing 07373 når du har landet og er reiseklar.\n\nDu kan se dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Ring oss tilbake",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Forsinkelse",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDin transport er dessverre forsinket. Vi beklager ulempene dette medfører.\n\nFor spørsmål ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
  ],

  fritekst: [
    {
      navn: "Hentetidspunkt",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDin reise er planlagt med henting kl. TT:MM.\nHentetid kan variere med +/- 15 minutter. Vær parfymefri.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Endret hentetidspunkt",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDitt hentetidspunkt er endret til kl. TT:MM.\nHentetid kan variere med +/- 15 minutter. Vær parfymefri.\n\nFor spørsmål rundt din reise ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Trondheim lufthavn - innenfor åpningstid",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn.\nRing 05515 når du har landet og er reiseklar slik at vi kan tildele din bestilling til transportør.\n\nDu kan se og endre dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Trondheim lufthavn - utenfor åpningstid",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi kan bekrefte at det er bestilt drosje fra Trondheim Lufthavn som er tildelt transportør.\nRing 07373 når du har landet og er reiseklar.\n\nDu kan se dine pasientreiser på Helsenorge.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Ring oss tilbake",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Forsinkelse",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDin transport er dessverre forsinket. Vi beklager ulempene dette medfører.\n\nFor spørsmål ring 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Tildelt bestilling i ventetiden",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDet er tildelt en bestilling på taksameter som ønskes utført i ventetiden.\n\nFor spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
  ],

  sjaafor: [
    {
      navn: "Tildelt bestilling i ventetiden",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nDet er tildelt en bestilling på taksameter som ønskes utført i ventetiden.\n\nFor spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Ring oss tilbake",
      tekst: () =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nVi har prøvd å kontakte deg.\nVennligst ring oss tilbake på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
    {
      navn: "Turoppdrag (ved taksameterproblemer)",
      // Lister alle bestillinger på turen
      tekst: (info) =>
        `Hei. Dette er en melding som ikke kan besvares.\n\nBestillinger på turnummer ${info.turNummer}:\n\n` +
        forHverBestilling(info, (b, i) =>
          `${i + 1}) ${b.initialer}\nHenting ${formaterTid(b.reiseTid)}` +
          (b.oppTid ? `, oppmøte ${formaterTid(b.oppTid)}` : "") +
          `\nFra: ${b.fraAdresse}\nTil: ${b.tilAdresse}`
        , "\n\n") +
        `\n\nFor spørsmål kontakt oss på 05515.\n\nMvh Pasientreiser Nord-Trøndelag.`,
    },
  ],

},
```

---

## Steg 4 – Send til Alf Einar

Send den tilpassede blokken (og kontorets navn) til **aej@hnt.no**, på Teams, eller [opprett en GitHub Issue](https://github.com/olorinmaia/NISSY/issues). Malene legges inn og aktiveres ved neste oppdatering av scriptet.

---

## Tips

- Legg til så mange maler per type som ønskelig – de vises i en nedtrekksliste i SMS-vinduet.
- De nasjonale malene som ligger fra før i NISSY forsvinner, de som evt. brukes av de må legges til i kontorspesifikke maler.
- `\n` lager linjeskift i meldingsteksten.
- `autoVelgHvis` kan brukes til å automatisk velge en mal basert på f.eks. adressen: `autoVelgHvis: (info) => /flyplass|lufthavn/i.test(info.fraAdresse)`
- Sjåfør-SMS (`sjaafor`) sendes via høyreklikk på ressurs i ressurskolonnen, eller med Alt+C når en ressurs er merket. Har ressursen bestillinger i pågående oppdrag, fylles malen ut med bestillingsdata og turnummer.

---

## Viktig – alt-eller-ingenting

Så snart et kontor får sin egen oppføring, brukes **ikke** lenger de globale standardmalene for dette kontoret – heller ikke for mal-typer kontoret ikke har fylt ut. Dere må derfor konfigurere **alle tre mal-typer** (`bestilling`, `fritekst` og `sjaafor`) selv, selv om noen av dem bare skal inneholde de samme malene som standardoppsettet. Mangler en type helt, blir nedtrekkslisten for den typen tom.
