/**
 * Darkmode.js
 *
 * Aktiverer/deaktiverer NISSY dark mode (dispatch-dark.css).
 * Kan kjøres manuelt fra konsoll eller via bookmarklet.
 *
 * Bruk:
 *   Kjør scriptet én gang for å aktivere.
 *   Kjør igjen for å deaktivere (toggle).
 *   Valget huskes i localStorage og gjenopprettes automatisk
 *   hvis scriptet er inkludert i loaderen.
 *
 * Fra konsoll:
 *   NissyDarkmode.enable()
 *   NissyDarkmode.disable()
 *   NissyDarkmode.toggle()
 */

(() => {
    const STYLE_ID    = 'nissy-darkmode-css';
    const STORAGE_KEY = 'nissy-darkmode-enabled';
    const CSS_URL     = 'https://raw.githubusercontent.com/olorinmaia/NISSY/dev/scripts/dispatch-dark.css';

    function isActive() {
        return !!document.getElementById(STYLE_ID);
    }

    function enable() {
        if (isActive()) return;

        const link = document.createElement('link');
        link.id   = STYLE_ID;
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = CSS_URL;
        document.head.appendChild(link);

        localStorage.setItem(STORAGE_KEY, '1');
        console.log('🌙 NISSY Darkmode aktivert');
    }

    function disable() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();

        localStorage.removeItem(STORAGE_KEY);
        console.log('☀️ NISSY Darkmode deaktivert');
    }

    function toggle() {
        if (isActive()) { disable(); } else { enable(); }
    }

    // Gjenopprett valg fra forrige sesjon
    if (localStorage.getItem(STORAGE_KEY) === '1') {
        enable();
    } else {
        // Første gang (manuell kjøring): aktiver
        toggle();
    }

    // Eksporter globalt
    window.NissyDarkmode = { enable, disable, toggle };
})();
