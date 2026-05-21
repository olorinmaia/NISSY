# Konfigurere SMS-maler for Send-SMS

Send-SMS-funksjonen støtter kontor-spesifikke maler som automatisk fyller inn pasientnavn, adresser og tidspunkt fra bestillingsdata. For å få aktivert maler for ditt kontor må du sende inn ønsket konfigurasjon.

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
| `sjaafor` | Sjåfør-SMS via høyreklikk på ressurs – kun statisk tekst. |

### Tilgjengelige variabler i `bestilling`-maler

| Variabel | Eksempel |
|---|---|
| `info.pasientNavn` | `Johnsen, Alf` |
| `info.fornavn` | `Alf` |
| `info.reiseTid` | `18:36` |
| `info.oppTid` | `19:00` |
| `info.fraAdresse` | `Brubakken 15, 7608 Levanger` |
| `info.tilAdresse` | `St. Olavs Hospital, 7006 Trondheim` |

I `fritekst`- og `sjaafor`-maler er ingen variabler tilgjengelig – bruk plassholdere som `TT:MM` for tidspunkt og skriv inn manuelt ved sending.

`autoVelgHvis(info)` er valgfri per mal – returnerer `true` for å automatisk velge malen basert på f.eks. adresse.

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
  ],

},
```

---

## Steg 4 – Send til Alf Einar

Send den tilpassede blokken (og kontorets navn) til **aej@hnt.no** eller på Teams. Malene legges inn og aktiveres ved neste oppdatering av scriptet.

---

## Tips

- Legg til så mange maler per type som ønskelig – de vises i en nedtrekksliste i SMS-vinduet.
- `\n` lager linjeskift i meldingsteksten.
- `autoVelgHvis` kan brukes til å automatisk velge en mal basert på f.eks. adressen: `autoVelgHvis: (info) => /flyplass|lufthavn/i.test(info.fraAdresse)`
- Sjåfør-SMS (`sjaafor`) sendes via høyreklikk på ressurs i ressurskolonnen.
