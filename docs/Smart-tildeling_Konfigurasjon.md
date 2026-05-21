# Konfigurere Smart-tildeling

Smart-tildeling (Alt+S) tildeler merkede bestillinger til riktig avtaletype automatisk basert på to regler:

1. **RB/ERS-regel** – Én eller flere bestillinger krever rullestolbil eller ERS → velg RB-avtale for området
2. **Flerpassasjer-regel** – 4 eller flere samtidige passasjerer uten RB/ERS → velg mellomstor bil-avtale for området

Begge reglene er kart som mapper en standard avtale-ID til en annen. For eksempel kan du ha 3 bestillinger som skal tildeles, den som skal hentes sist har +RB og skal hentes i et annet avtaleområde enn første henting, med rett konfigurering så vil da første bestilling sin avtale via tilordningsstøtte peke mot mappet RB-avtale og da tildeles riktig RB-avtale automatisk.
For å få full utnytte av Smart-tildeling for ditt kontor må du sende inn disse mappingene.

---

## Steg 1 – Finn avtale-ID-er

Avtale-ID-ene finnes på to måter:

### Alternativ A – Via URL i NISSY Admin

Åpne en avtale i administrasjonsbildet og se på URL-en:

```
https://nissy6.pasientreiser.nhn.no/administrasjon/admin/editContractArea?id=8914&cid=1306&update=1
```

Her er `id=8914` avtale-ID-en.

### Alternativ B – Via kildekoden i NISSY Planlegging

Høyreklikk i avtalelisten → «Inspiser». Finn rader med mønsteret `id="T-XXXX" name="XXXX"`:

```html
<tr id="T-8914" name="8914" ...><td ...>Meråker-L - Meråker / 1-3 pas (Omr 1)</td></tr>
<tr id="T-9031" name="9031" ...><td ...>Meråker-S RB - Meråker / RB (Omr 1)</td></tr>
```

---

## Steg 2 – Forstå regelstrukturen

Begge regler er enkle nøkkel→verdi-kart:

```
standard_avtale_id: målavtale_id
```

**Eksempel fra Nord-Trøndelag:**

| Fra (standard) | Til (RB) | Beskrivelse |
|---|---|---|
| `8914` | `9031` | Meråker / 1-3 pas → Meråker / RB |
| … | … | … |

Scriptet slår opp hvilken avtale den merkede bestillingen tilhører, finner matchende ID i regelkartet, og tildeler til den avtalens kapasitet.

### Hva med mellomstor bil?

`multiple` brukes når 4 eller fler passasjerer er i bilen samtidig og ingen trenger RB/ERS. Har kontoret ikke egne "mellomstor bil"-avtaler kan dette kartet settes lik `rb_ers`-kartet, slik at turen alltid går til rullestolbil ved mange passasjerer.

### Kontor uten konfigurasjon

Kontor som ikke er lagt inn i `KONTOR_REGLER` kan fortsatt bruke Smart-tildeling – bestillingene tildeles da avtalen de allerede har, uten noen regelomkobling.

---

## Steg 3 – Eksempel (Nord-Trøndelag som mal)

Kontorets navn hentes automatisk fra NISSY og brukes som nøkkel. Navnet må matche eksakt det som vises øverst til venstre i NISSY Planlegging: `Pasientreisekontor for [Kontorets navn]`.

```javascript
const KONTOR_REGLER = {
  'Kontorets navn': {               // Eksakt navn fra NISSY, uten «Pasientreisekontor for»

    // Regler når RB/ERS finnes blant merkede bestillinger
    // Format: standard_avtale_id: rb_avtale_id
    rb_ers: {
      8914: 9031,  // Meråker / 1-3 pas  →  Meråker / RB
      8916: 9032,  // Område X / 1-3 pas →  Område X / RB
      // … én linje per avtalepar
    },

    // Regler når 4+ samtidige passasjerer UTEN RB/ERS
    // Format: standard_avtale_id: mellomstor_avtale_id
    // Ingen mellomstor bil? Bruk samme mapping som rb_ers.
    multiple: {
      8914: 8915,  // Meråker / 1-3 pas  →  Meråker / 4-6 pas
      8916: 8917,  // Område X / 1-3 pas →  Område X / 4-6 pas
      // …
    }
  },
};
```

Du trenger kun å liste avtaleparene som faktisk finnes i ditt kontor – alle andre bestillinger beholdes i sin opprinnelige avtale.

---

## Steg 4 – Spesialbehov og kapasitet (valgfritt)

Enkelte behov krever at en bestilling teller som mer enn én passasjer. Standard oppsett:

```javascript
const SPECIAL_NEEDS_CAPACITY = {
  "LB": 2  // Trenger hele baksetet – ingen kan sitte bak
};
```

Ta kontakt dersom ditt kontor bruker andre behov som bør gi samme effekt.

---

## Steg 5 – Send til Alf Einar

Send en liste over avtaleparene til **aej@hnt.no** eller på Teams, gjerne i tabellform:

| Standard avtale | Standard ID | RB-avtale | RB ID | Mellomstor avtale | Mellomstor ID |
|---|---|---|---|---|---|
| Meråker / 1-3 pas | 8914 | Meråker / RB | 9031 | Meråker / 4-6 pas | 8915 |
| … | … | … | … | … | … |

Konfigurasjonen legges inn og aktiveres ved neste oppdatering av scriptet.

---

## Tips

- **Alle bestillinger må ha en avtale** før Smart-tildeling kjøres – bestillinger uten avtale hoppes over og du får feilmelding.
- **Avtale-ID-ene er unike per NISSY-instans** – IDs fra ett kontor vil ikke stemme for et annet.
- **Passasjertelling** skjer på tvers av alle merkede bestillinger: To bestillinger med henting 10:00 og levering 11:00 teller som 2 samtidige passasjerer.
- **Ledsagere telles alltid** i tillegg til pasienten – 1 pasient med 2 ledsagere gir 3 i kapasitetsberegningen.
- **Returer** (lik hentetid og leveringstid) behandles separat og teller ikke som overlappende med andre turer så fremt det ikke er flere returer som skal hentes samtidig eller med 5 minutters mellomrom
