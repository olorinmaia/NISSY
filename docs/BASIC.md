# NISSY Basic - Veiledning

![NISSY Basic](https://img.shields.io/badge/NISSY-Basic-blue)

## 🎯 For hvem?

NISSY Basic er perfekt for deg som:
- Vil ha grunnleggende tastatursnarveier
- Trenger rutekalkulering og ressursinfo
- Ikke trenger avansert tildelingsfunksjonalitet

## 📦 Hva får du?

### Inkluderte scripts:
- ✅ **NISSY-fiks.js** - Grunnleggende tastatursnarveier og kolonnejusteringer
- ✅ **Ressursinfo.js** - (Alt+D) Vis detaljert ressursinformasjon
- ✅ **Rutekalkulering.js** - (Alt+Q) Åpne rute i Google Maps
- ✅ **Bestillingsmodul.js** - (Alt+N) Lar deg velge foretrukken modul mellom 4-stegs og ensides og husker valget for sesjonen.

## 📥 Installasjon

### Steg 1: Opprett bokmerke

1. Høyreklikk på bokmerkeslinjen i nettleseren din
2. Velg "Legg til bokmerke" / "Add bookmark"
3. Gi det et navn: `NISSY Basic`

### Steg 2: Lim inn kode

Kopier og lim inn denne koden som **URL**:
```javascript
javascript:(async()=>{const s=await fetch('https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/loader-basic.js');eval(await s.text());})();
```

### Steg 3: Bruk bokmerket

1. Åpne NISSY i nettleseren
2. Klikk på `NISSY Basic` bokmerket
3. Vent til popup vises med bekreftelse
4. Ferdig! Alle snarveier er nå aktive

## ⌨️ Alle tastatursnarveier

### Søk og navigasjon

| Snarvei | Funksjon |
|---------|----------|
| `ALT+F` | Fokus søkefelt (marker eksisterende tekst) |
| `ENTER` (i søkefelt) | Utfør søk |
| `ESC` | Nullstill søk og sett fokus tilbake til søkefelt |
| `F5` | Refresh all data (openPopp) |
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
| `ALT+N` | Bestillingsmodul |

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


### ⌛ NISSY-fiks

Scriptet fikser en rekke bugs, forbedrerer eksisterende funksjonalitet og justerer automatisk kolonnevisning:

**Skjuler:**
- Ledig kapasitet (pågående oppdrag)
- Transporttype (ventende oppdrag)

**Viser:**
- Oppmøtetidspunkt (pågående oppdrag)
- Ledsagere (pågående oppdrag)
- Spesielle krav (pågående oppdrag)
- Pasientnavn (pågående oppdrag)

### 📃 Bestillingsmodul (ALT+N)

Trykk på Alt+N for å få første pop-up med valg om foretrukket bestillingsmodul. Deretter åpnes enten 4-stegs eller ensides i en iframe modal.
Dette lagres i sesjonen, nullstilles når nettleser lukkes helt.

## 🆙 Oppgradering

Klar for mer funksjonalitet?

### NISSY Advanced
Legger til:
- Smart tildeling (ALT+S)
- Tilordningsstøtte 2.0 (ALT+T)
- Rek-knapper (ALT+R)
- Avbestilling (ALT+K)

[Se ADVANCED.md](ADVANCED.md)

## ❓ Feilsøking

### Bokmerket gjør ingenting

- Sjekk at du har limt inn hele koden (skal starte med `javascript:`)
- Prøv å oppdatere siden og klikk bokmerket igjen
- Åpne utviklerkonsollen (F12) og se etter feilmeldinger

### Snarveier virker ikke

- Bekreft at scriptet er lastet (åpne konsoll, skal se "✅ NISSY Basic lastet!")
- Prøv å laste siden på nytt
- Klikk bokmerket igjen

### Google Maps åpner ikke

- Sjekk at popup ikke er blokkert av nettleseren
- Godta Google Maps vilkår første gang
- Sjekk at du har merket bestillinger før du trykker ALT+Q

## 💡 Tips og triks

1. **Lagre bokmerket i bokmerkeslinjen** for rask tilgang
2. **Bruk F5** i stedet for Ctrl+R for å refreshe (Ctrl+R er blokkert)
3. **Kombiner snarveier**: `ALT+V` → `ALT+T` (merk alle ventende → tilordningsstøtte 2.0)
4. **ESC er din venn**: Nullstiller søk og setter fokus tilbake

## 📞 Support

Fant du en bug eller har forslag?
- Åpne et issue på [GitHub](https://github.com/olorinmaia/NISSY/issues)
- Se [README](../README.md) for mer informasjon
- Se [CHANGELOG](CHANGELOG.md) for endringslogg

---

**❤️ Make NISSY great 🤓**
