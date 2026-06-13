# NISSY - Prosjektkontekst for Claude

## Deployment / arbeidsflyt
1. Brukeren tester endringer via F12 DevTools-konsoll (snippet) - IKKE Tampermonkey.
   Siden må reloades (F5) før et oppdatert script kan injiseres på nytt,
   pga. `window.__xxxInstalled`-guards i scriptene.
2. Når en endring er ferdig testet, committer brukeren til GitHub selv
   (kjør ALDRI `git commit` automatisk) og verifiserer deretter via
   dev-loaderne (`scripts/loader-*-dev.js`), som laster rett fra GitHub.

## Versjonsnummer
`SCRIPT_VERSION` i `scripts/NISSY-fiks.js` (rundt linje 16) er prosjektets
versjonsnummer. Dette tallet og siste versjon i `docs/CHANGELOG.md` skal
alltid være like - når SCRIPT_VERSION bumpes, lag/oppdater
CHANGELOG-oppføringen til samme versjon.

## Personvern (absolutt krav)
Persondata skal ALDRI forlate nettleseren. Bruk NISSY sine egne
funksjoner/endepunkter der mulig; ellers localStorage/sessionStorage.
Ingen persondata til tredjeparts API-er (f.eks. ORS/OSRM får kun
koordinater, ikke navn/identifiserende info).

## Dokumentasjon ved bugfikser/nye funksjoner
Når en bruker-synlig bug fikses eller funksjon legges til, oppdater:
- `docs/CHANGELOG.md` - oppføring under riktig versjon (se "Versjonsnummer")
- `README.md` - tilhørende bullet under riktig script-seksjon
- `docs/ADVANCED.md`, `docs/BASIC.md`, `docs/AMK.md` - samme bullet i de
  guidene som inkluderer det aktuelle scriptet (sjekk "Inkluderte scripts"
  i hver fil for å se hvilke som er relevante)

Følg eksisterende formuleringsmønster, f.eks.:
"Fikser gammel NISSY-bug hvor ... ikke fylles inn automatisk når ... brukes"
