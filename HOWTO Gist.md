Her er hvordan du lager en GitHub Gist:

## Steg-for-steg:

1. **Gå til** https://gist.github.com/
2. **Klikk "New gist"** (øverst til høyre)
3. **Fyll ut:**
   - Filename: `NISSY-fiks.js`
   - Innhold: Lim inn scriptet ditt
   - Velg: **"Create secret gist"** (dette gjør den privat - kun de med lenken kan se den)
4. **Klikk "Create secret gist"**

## Etter opprettelse:

1. **Klikk på "Raw"** knappen (øverst til høyre i gisten)
2. **Kopier URL-en** fra adressefeltet - den ser slik ut:
   ```
   https://gist.githubusercontent.com/olorinmaia/a1b2c3d4e5f6g7h8i9j0/raw/abc123def456/NISSY-fiks.js
   ```

3. **Bokmerket blir da:**
   ```javascript
   javascript:(async()=>{const s=await fetch('https://gist.githubusercontent.com/olorinmaia/a1b2c3d4e5f6g7h8i9j0/raw/abc123def456/NISSY-fiks.js');eval(await s.text());})();
   ```

**Tips:** Du kan også forkorte URL-en til:
```javascript
javascript:(async()=>{const s=await fetch('https://gist.githubusercontent.com/olorinmaia/a1b2c3d4e5f6g7h8i9j0/raw/NISSY-fiks.js');eval(await s.text());})();
```
(fjern hash-delen - GitHub serverer alltid siste versjon)

**Fordeler med Gist:**
✅ Kan være "secret" (semi-privat)  
✅ Versjonshistorikk  
✅ Enklere enn full repo for enkeltstående filer  
✅ Kan oppdateres uten å endre URL  
