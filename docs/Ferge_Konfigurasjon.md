# Konfigurere fergeruter for Kartvisning

Kartvisning støtter automatisk fergeberegning langs kjøreruten. Når en rute passerer nær et fergeleie, beregner scriptet neste avgang basert på estimert ankomsttid, legger til overfartstid og viser ⚠️-advarsel dersom estimert leveringstid er etter avtalt oppmøtetid. For å aktivere fergeberegning for ditt kontor sender du inn konfigurasjon med rutetabellene.

---

## Steg 1 – Feltforklaring

### Ferge-objekt (toppnivå)

| Felt | Type | Beskrivelse |
|---|---|---|
| `id` | tekst | Unik ID for fergesambandet (ingen mellomrom, kun små bokstaver) |
| `crossing_min` | tall | Overfartstid i minutter (fra avgang til ankomst på andre side) |
| `leier` | liste | To leier (fergeleier) – én per side av sambandet |

### Leie-objekt (per fergeleie)

| Felt | Type | Beskrivelse |
|---|---|---|
| `navn` | tekst | Navn på fergeleiet – brukes kun til visning |
| `lat` / `lon` | desimaltall | Koordinater til fergeleiet – må være nøyaktige (brukes for å oppdage om ruten passerer nær leiet). |
| `retning` | tekst | Beskrivelse av retning, f.eks. `'Hofles → Lund'` – vises i kartets pop-up |
| `mainland` | `false` | Valgfritt. Sett til `false` dersom leiet befinner seg på en øy (ikke fastland). Utelat feltet for fastlandsleier. |
| `note` | tekst | Valgfritt. Fritekst som vises i kartvisningen for avganger som ikke lar seg representere nøyaktig i rutetabellen (se [Steg 3](#steg-3--avansert-note-feltet)). |
| `avganger` | objekt | Rutetabell per dagtype (se under) |

### Avganger

Avganger angis som klokkeslett i format `'HH:MM'` under tre nøkler:

| Nøkkel | Dagtype |
|---|---|
| `'man-fre'` | Mandag–fredag |
| `'lor'` | Lørdag |
| `'son'` | Søndag |

---

## Steg 2 – Eksempel (Hofles–Lund som mal)

Nedenfor er Nærøysund-sambandet som et fullstendig og rent eksempel. Kopier blokken, erstatt ID, koordinater, retninger og avganger med dine data. Legg til så mange fergesambandsobjekter i listen som nødvendig.

```javascript
const FERGER = [
  {
    id: 'nearoysund',          // Unik ID – velg selv, ingen mellomrom
    crossing_min: 25,          // Overfartstid i minutter

    leier: [
      {
        navn: 'Hofles',
        lat: 64.827474, lon: 11.612125,
        retning: 'Hofles → Lund',
        avganger: {
          'man-fre': ['05:50','07:10','08:30','09:50','11:10','13:00','14:00','15:20','16:40','18:00','20:00','21:30'],
          'lor':     ['07:15','08:30','09:50','11:10','14:00','15:20','16:40','20:00','21:30'],
          'son':     ['08:30','09:50','11:10','14:00','15:20','16:40','18:00','20:00','21:30']
        }
      },
      {
        navn: 'Lund',
        lat: 64.768195, lon: 11.623273,
        retning: 'Lund → Hofles',
        avganger: {
          'man-fre': ['06:20','07:40','09:00','10:20','11:40','13:30','14:30','15:50','17:10','18:30','20:30','22:00'],
          'lor':     ['07:40','09:00','10:20','11:40','14:30','15:50','17:10','20:30','22:00'],
          'son':     ['09:00','10:20','11:40','14:30','15:50','17:10','18:30','20:30','22:00']
        }
      }
    ]
  },

  // Legg til flere sambandsobjekter her...
];
```

Merk at `mainland`-feltet er utelatt her siden begge leier er på fastlandet. For øysamband legges `mainland: false` til på øyleiet (se feltforklaringen).

---

## Steg 3 – Avansert: `note`-feltet

Noen ferger har avganger som varierer etter skoledag, ukedag innad i man–fre-perioden, eller andre irregulære mønstre som ikke lar seg representere korrekt i en enkel rutetabell med tre dagtyper. I slike tilfeller legges avgangene inn med beste tilnærming i rutetabellen, og `note`-feltet brukes til å formidle avviket til brukeren.

`note` vises som en informasjonstekst i kartvisningens ferge-pop-up, slik at planleggeren kan ta hensyn til avvik manuelt.

### Eksempel – Gjerdinga–Eidshaug

Dette sambandet har avganger som kun kjøres bestemte ukedager eller kun på skoledager:

```javascript
{
  id: 'gjerdinga',
  crossing_min: 10,
  leier: [
    {
      navn: 'Gjerdinga',
      lat: 64.945012, lon: 11.449137,
      mainland: false,
      retning: 'Gjerdinga → Eidshaug',
      note: '12:15 (man+ons). Skoledager: 13:15 (ons). Kun man: 20:00. Ons+fre: 21:00',
      avganger: {
        'man-fre': ['06:55','07:40','08:30','12:15','13:15','14:15','15:10','16:00','17:30','20:00','21:00'],
        'lor': ['10:00','15:45'],
        'son': ['11:00','15:05','19:00']
      }
    },
    {
      navn: 'Eidshaug',
      lat: 64.932361, lon: 11.464512,
      retning: 'Eidshaug → Gjerdinga',
      note: '12:30 (man+ons). Skoledager: 13:30 (ons). Kun man: 20:10. Ons+fre: 21:10',
      avganger: {
        'man-fre': ['07:30','08:00','08:45','12:30','13:30','14:30','15:40','16:20','18:00','20:10','21:10'],
        'lor': ['10:10','16:00'],
        'son': ['11:15','15:20','19:10']
      }
    }
  ]
}
```

Her er avgangene `20:00` og `21:00` tatt med i `man-fre`-listen selv om de ikke gjelder alle ukedager – scriptet vil foreslå disse som mulige avganger, men `note` varsler planleggeren om begrensningene.

---

## Steg 4 – Send til Alf Einar

Send den ferdige `FERGER`-blokken til **aej@hnt.no**, på Teams, eller [opprett en GitHub Issue](https://github.com/olorinmaia/NISSY/issues). Fergeberegning aktiveres ved neste oppdatering av scriptet.

---

## Tips

- Koordinatene (`lat`/`lon`) må plasseres nøyaktig på fergeleiet – de brukes for å detektere om kjøreruten passerer nær nok til å utløse fergeberegning. Bruk Google Maps eller nettleserens kart for å finne presis posisjon.
- Er klokkeslettene de samme alle ukedager, kan du bruke identiske lister for `'man-fre'`, `'lor'` og `'son'`.
- Har fergen kun avganger på ukedager (ingen helg), bruk tomme lister: `'lor': [], 'son': []`.

---

## Skjermdump
<img width="1000" alt="image" src="https://github.com/user-attachments/assets/8d0f1163-6e79-4bee-8916-a6f21c4ac71e" />