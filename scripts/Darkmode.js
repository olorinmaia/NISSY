/**
 * Darkmode.js
 *
 * Aktiverer/deaktiverer NISSY dark mode.
 * CSS er innebygd direkte i scriptet.
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

    const CSS = `
/**
 *  dispatch-dark.css
 *  Tonet lys modus – mellomvei mellom lys og mørk
 *
 *  Fargepalett (blå-grå pastell):
 *    Bakgrunn (hvit)        : #E4EBF1  – lys blå-grå
 *    Bakgrunn (lys grå)     : #cdd7e4  – noe mørkere blå-grå
 *    Bakgrunn (paneler)     : #c5d4e3  – blå-grå panel
 *    Bakgrunn (topbar/bunn) : #b8cedd  – litt dypere blå-grå
 *    Header-blå             : #5a9ab5  – medium teal
 *    Accent-tekst           : #1a6080  – dyp teal
 *    Border                 : #8aa8c0  – blå-grå kant
 *    Tekst (standard)       : #1a2535  – nær-sort
 *    Tekst (dempet)         : #3a5068
 *
 *  Faste NISSY-farger som IKKE overrides:
 *    Merket rad : rgb(148, 169, 220) / #94a9dc  – lysblå, sort tekst
 *    Betinget   : rgb(255, 255, 204) / #ffffcc  – lys gul, sort tekst
 **/

div.box {
   height: 100%;
   border-top    : 1px solid #8aa8c0;
   border-left   : 1px solid #8aa8c0;
   border-right  : 1px solid #8aa8c0;
   border-bottom : 1px solid #8aa8c0;
   background-color: #E4EBF1;
   color: #1a2535;
}

div.boxt {
   border-top    : 1px solid #8aa8c0;
   border-left   : 1px solid #8aa8c0;
   border-right  : 1px solid #8aa8c0;
   border-bottom : 1px solid #8aa8c0;
   background-color: #cdd7e4;
   color: #1a2535;
}

div.ubox {
   border-left   : 1px solid #8aa8c0;
   border-right  : 1px solid #8aa8c0;
   border-bottom : 1px solid #8aa8c0;
}

.logBox {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   padding-top   : 4px;
   padding-left  : 4px;
   padding-bottom: 4px;
   background-color: #B0C4D8;
   color: #1a2535;
   border        : 1px solid #8aa8c0;
}

div.panel {
   width  : 200px;
   height : 80px;
   padding: 2px;
   border : 1px solid #8aa8c0;
}

div.title {
   font-family   : Arial, sans-serif;
   font-size     : 10px;
   background-color: #8aa8c0;
   color         : #ffffff;
   width         : 200px;
   margin        : 1px;
}

img.vspacing {
   width: 1px;
   height: 8px;
   border: 0px;
}

img.vspacing2 {
   width: 1px;
   height: 4px;
   border: 0px;
}

img.hspacing {
   width: 3px;
   height: 1px;
   border: 0;
}

img.hspacingtopframe {
   width: 20px;
   height: 1px;
   border: 0;
}

div.topframe {
   font-family   : Arial, sans-serif;
   font-weight   : bold;
   color         : #1a6080;
   height        : 30px;
   background-color: #b8cedd;
   border-radius : 5px 5px 5px 5px;
}

div.headerframeleft {
   font-family   : Arial, sans-serif;
   font-size     : 18px;
   font-weight   : bold;
   padding-top   : 4px;
   padding-bottom: 4px;
   text-align    : center;
   background-color: #5a9ab5;
   color         : #1B2736;
   border-top-right-radius: 7px;
   border-top-left-radius : 7px;
}

table.headerframeinfo {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   color         : #1a6080;
   text-align    : left;
}

div.eff_filter {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   color         : #1a6080;
   text-align    : left;
}

div.headerframecenter {
   font-family   : Arial, sans-serif;
   font-size     : 18px;
   font-weight   : bold;
   padding-top   : 4px;
   padding-bottom: 4px;
   text-align    : center;
   background-color: #5a9ab5;
   color         : #1B2736;
   border-top-right-radius: 7px;
   border-top-left-radius : 7px;
}

div.headerframeright {
   font-family   : Arial, sans-serif;
   font-size     : 18px;
   font-weight   : bold;
   padding-top   : 4px;
   padding-bottom: 4px;
   text-align    : center;
   background-color: #5a9ab5;
   color         : #1B2736;
   border-top-right-radius: 7px;
   border-top-left-radius : 7px;
}

div.centerleftframe {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   height        : 100%;
   text-align    : left;
   background-color: #c5d4e3;
   color         : #1a2535;
}

div.centerrightframe {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   height        : 100%;
   text-align    : left;
   background-color: #c5d4e3;
   color         : #1a2535;
}

div.centercenterframe {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   text-align    : left;
   background-color: #c5d4e3;
   color         : #1a2535;
}

div.centercenterframe2 {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   text-align    : left;
   background-color: #c5d4e3;
   color         : #1a2535;
}

div.bottomframe {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   width         : 100%;
   text-align    : left;
   background-color: #b8cedd;
   color         : #1a2535;
}

div.refreshmeter {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   color         : #1a6080;
   height        : 75px;
   text-align    : right;
   padding-left  : 15px;
   padding-right : 15px;
}

td.topframe {
   font-family   : Arial, sans-serif;
   font-size     : 20px;
   font-weight   : bold;
   color         : #1a6080;
   text-align    : left;
}

td.topframe_small {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   color         : #1a6080;
   height        : 30px;
}

td.topframelogo {
   font-family   : Arial, sans-serif;
   font-size     : 30px;
   font-weight   : bold;
   color         : #1a6080;
   text-align    : right;
   padding-right : 15px;
}

td.status {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a6080;
   text-align    : left;
}

td.dropdown {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   color         : #1a2535;
}

table.rekvisisjonstekst {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   color         : #1a2535;
}

td.datatitle {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   text-align    : left;
   padding-top   : 3px;
   padding-bottom: 4px;
   border-bottom : 1px solid #8aa8c0;
   color         : #1a2535;
}

td.dt {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   text-align    : left;
   padding-top   : 3px;
   padding-bottom: 4px;
   border-bottom : 1px solid #8aa8c0;
   color         : #1a2535;
}

a.datatitle {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   color         : #1a6080;
}

a.dt {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   color         : #1a6080;
}

/* Generelle lenker – overstyrer nettleserens #0000EE / #551A8B */
a:not([class]) {
   color: #1a6080;
}

a:not([class]):visited {
   color: #4a4a88;
}

a:not([class]):hover {
   color: #2a80a0;
}

td.datatext {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : left;
   padding-top   : 1px;
   padding-bottom: 1px;
   color         : #1a2535;
}

td.d {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : left;
   vertical-align: top;
   padding-top   : 1px;
   padding-bottom: 1px;
   color         : #1a2535;
}

.row-image {
   min-height: 15px;
}

td.d_right {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : right;
   padding-top   : 1px;
   padding-bottom: 1px;
   color         : #1a2535;
}

td.d_left {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : left;
   padding-top   : 1px;
   padding-bottom: 1px;
   color         : #1a2535;
}

td.dataremove {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : center;
}

td.dr {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   text-align    : left;
   line-height   : 11.5px;
   color         : #1a2535;
}

img.dataremove {
   width : 13px;
   height: 13px;
}

img.dr {
   width : 12px;
   height: 12px;
}

tr.tableHeader {
   border-top    : 1px solid #8aa8c0;
   border-left   : 1px solid #8aa8c0;
   border-right  : 1px solid #8aa8c0;
   border-bottom : 1px solid #8aa8c0;
   background-color: #cdd7e4;
   color         : #1a2535;
   text-align    : left;
   vertical-align: top;
}

tr.tbh {
   border-top    : 1px solid #8aa8c0;
   border-left   : 1px solid #8aa8c0;
   border-right  : 1px solid #8aa8c0;
   border-bottom : 1px solid #8aa8c0;
   background-color: #cdd7e4;
   color         : #1a2535;
   text-align    : left;
   vertical-align: top;
   position      : sticky;
   top           : 0;
}

div.reqDocView {
   background-color: #C5D4E3;
   color           : #1a2535;
   border          : 1px solid #8aa8c0;
   padding         : 1px 5px 1px 5px;
}

td.reqvlayout {
   border : 1px solid #8aa8c0;
   padding: 1px;
}

td.reqvheader {
   font-family   : Arial, sans-serif;
   font-size     : 20px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 5px 5px;
}

td.reqvtitle {
   font-family   : Arial, sans-serif;
   font-size     : 16px;
   font-weight   : bold;
   color         : #1B2736;
   padding       : 1px 5px 5px 5px;
   vertical-align: top;
   background-color: #5a9ab5;
}

td.reqv_field {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 3px 3px 3px;
   vertical-align: middle;
}

td.reqv_value {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   color         : #1a2535;
   padding       : 1px 3px 3px 3px;
   vertical-align: middle;
}

td.reqv_field_topseparated {
   border-top-style: dotted;
   border-top-width: 1px;
   border-top-color: #8aa8c0;
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 5px 5px;
   vertical-align: middle;
}

td.reqv_field_bottomseparated {
   border-bottom-style: dotted;
   border-bottom-width: 1px;
   border-bottom-color: #8aa8c0;
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 5px 5px;
   vertical-align: middle;
}

td.travel {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 1px 1px;
}

div.transCostView {
   background-color: #C5D4E3;
   color           : #1a2535;
   border          : 1px solid #8aa8c0;
   padding         : 1px 4px 1px 5px;
}

td.transcostheader {
   font-family   : Arial, sans-serif;
   font-size     : 20px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 5px 4px 5px 4px;
}

td.transcostheader2 {
   font-family   : Arial, sans-serif;
   font-size     : 16px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 4px 5px 4px;
}

td.transcostlabel {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 4px 10px 20px;
}

td.transcostlink {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 10px 20px;
}

td.transcostcont {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   font-weight   : bold;
   color         : #1a2535;
   padding       : 1px 5px 10px 20px;
}

td.transcostfooter {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   color         : #3a5068;
   padding       : 1px 5px 1px 4px;
}

.assignbutton {
   width: 115px;
}

.bigbutton:not(.nissy-script-btn) {
   font-family   : Arial, sans-serif;
   font-size     : 14px;
   padding-top   : 1px;
   padding-bottom: 1px;
   padding-left  : 4px;
   padding-right : 4px;
   width         : 140px;
}

span.warning {
   color: #cc0000;
}

tr.even {
   background-color: #b8cfe0;
}

select.filter {
   width: 320px;
}

th.dt {
   font-family   : Arial, sans-serif;
   font-size     : 12px;
   font-weight   : bold;
   text-align    : left;
   padding-top   : 3px;
   padding-bottom: 4px;
   border-bottom : 1px solid #8aa8c0;
   color         : #1a2535;
}

div.odd {
   background-color: #c8d8e0;
   width: 100%;
}

div.even {
   width: 100%;
}

td.vspace {
   height: 8px;
}

td.vspace2 {
   height: 4px;
}

.fixedHeader {
   position: sticky;
   top: 0;
}

* {
   scrollbar-width: thin;
   scrollbar-color: #8aa8c0 #c5d4e3;
}

.resizer {
   width           : 2px;
   height          : 100%;
   cursor          : col-resize;
   background-color: #8aa8c0;
   z-index         : 0;
   flex-shrink     : 0;
}

/* Standard NISSY-knapper */
input[type="button"]:not(.nissy-script-btn),
input[type="submit"]:not(.nissy-script-btn),
input[type="reset"]:not(.nissy-script-btn) {
   background-color: #8aa8c0;
   color: #1a2535;
   border: 1px solid #6a8aa0;
}

input[type="button"]:not(.nissy-script-btn):hover:not(:disabled),
input[type="submit"]:not(.nissy-script-btn):hover:not(:disabled) {
   background-color: #7898b0;
}

input[type="button"]:not(.nissy-script-btn):disabled,
input[type="submit"]:not(.nissy-script-btn):disabled {
   background-color: #c5d4e3;
   color: #7a9ab0;
   border-color: #a0b8cc;
}

/* Select-felter, textarea og søkeinput (utelater selects med inline style) */
select:not([style]),
select.filter,
textarea:not([style]),
#searchType,
#searchPhrase {
   background-color: #b0c4d8;
   color: #1a2535;
   border: 1px solid #8aa8c0;
}

/* Hovedkolonner */
#col1, #col2, #col3 {
   background-color: #c5d4e3;
}

/* Filterbeskrivelse-panel – bgcolor="#D6D3A7" overstyres */
#showfilter td[bgcolor="#D6D3A7"] {
   background-color: #5a9ab5;
   color: #1a2535;
}

/* Header og ytre wrapper */
header,
table.bg-color,
table.bg-color > tbody > tr > td {
   background-color: #b8cedd !important;
}

/* Bevar inline tekstfarge fra NISSY på alle rader med kjente bakgrunner (LIFO, IA, dialyse, ren tekstfarge) */
tr[style*="color"] td {
   color: inherit !important;
}

/* Utgråede rader (NISSY disableSelection setter inline style) */
tr[style*="rgb(231, 231, 231)"] {
   background-color: #a8bece !important;
   color: #6a8898 !important;
}

tr[style*="rgb(231, 231, 231)"] td {
   color: #6a8898 !important;
}

/* NISSY header-knapper (injisert via loader) */
.nissy-header-btn {
   background: linear-gradient(135deg, #3a7a9c 0%, #5090b0 100%) !important;
   color: #0D131B !important;
}

.nissy-header-btn:hover {
   background: linear-gradient(135deg, #2d6080 0%, #3f7a98 100%) !important;
}

.nissy-header-btn.monitor-active {
   background: linear-gradient(135deg, #3a8c40 0%, #4a9e50 100%) !important;
}

.nissy-header-btn.monitor-active:hover {
   background: linear-gradient(135deg, #2e7034 0%, #3a8040 100%) !important;
}

.nissy-header-btn:disabled {
   background: #7a9ab0 !important;
   color: #4a6a80 !important;
   cursor: not-allowed;
   transition: none;
}

.nissy-header-btn:disabled:hover {
   background: #7a9ab0 !important;
   transform: none;
   box-shadow: none;
}

/* NISSY script-panel-knapper (injisert via loader) */
.nissy-script-btn,
.nissy-manual-btn {
   background: linear-gradient(135deg, #428BB3 0%, #649DB9 100%) !important;
   color: #0D131B !important;
}

.nissy-script-btn:hover,
.nissy-manual-btn:hover {
   background: linear-gradient(135deg, #357197 0%, #488BAD 100%) !important;
}

.nissy-script-btn:disabled,
.nissy-manual-btn:disabled {
   background: #7a9ab0 !important;
   color: #4a6a80 !important;
   cursor: not-allowed;
   transition: none;
}

.nissy-script-btn:disabled:hover,
.nissy-manual-btn:disabled:hover {
   background: #7a9ab0 !important;
   transform: none;
   box-shadow: none;
}

/* Smart-tildeling-toaster – overstyrer inline-farger fra Smart-tildeling.js */
.smart-tildeling-toast-info {
   background: #a0c4e0 !important;
   color: #1a2535 !important;
   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
}
`;

    function isActive() {
        return !!document.getElementById(STYLE_ID);
    }

    function enable() {
        if (isActive()) return;

        const style = document.createElement('style');
        style.id          = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);

        localStorage.setItem(STORAGE_KEY, '1');
        console.log('🌙 NISSY Darkmode aktivert');
    }

    function disable() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();

        localStorage.setItem(STORAGE_KEY, '0');
        console.log('☀️ NISSY Darkmode deaktivert');
    }

    function toggle() {
        if (isActive()) { disable(); } else { enable(); }
    }

    // Gjenopprett valg fra forrige sesjon
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '1') {
        enable();
    } else if (stored === null && window.__nissyDarkmodeDefaultOn) {
        enable();
    }
    // stored === '0': eksplisitt deaktivert – gjør ingenting
    // stored === null uten __nissyDarkmodeDefaultOn: ikke aktivert

    // Eksporter globalt
    window.NissyDarkmode = { enable, disable, toggle };
})();
