/**
 * Adminmodul.js
 * 
 * Dette scriptet gir rask tilgang til administrasjonsmodulen i NISSY.
 * 
 * Funksjonalitet:
 * - Snarvei ALT+A for å åpne adminmodul
 * - Åpner direkte til søkeside for tur/bestilling, søker og scroller ned
 * - F5 refresher kun iframe modal, ikke bakgrunnen
 * - Lukk modal med X-knapp eller klikk utenfor
 * - window.Adminmodul.clearPreferred() i konsoll for å nullstille åpningspreferanse
 */

(function() {
    'use strict';

    // Sjekk om script allerede er installert
    if (window.__adminmodulInstalled) {
        console.log('✅ Adminmodul-script er allerede aktiv');
        return;
    }
    
    // Installer script
    window.__adminmodulInstalled = true;
    console.log("🚀 Starter Adminmodul-script");

    // Blokker Alt alene (hindrer fokus til nettleserkrom / "..."-knapp)
    let _altPressedAlone = false;
    window.addEventListener("keydown", function (e) {
        if (e.key === "Alt") { _altPressedAlone = true; }
        else if (e.altKey)   { _altPressedAlone = false; }
    }, true);
    window.addEventListener("keyup", function (e) {
        if (e.key === "Alt" && _altPressedAlone) { e.preventDefault(); }
        _altPressedAlone = false;
    }, true);

    // Konfigurasjon
    const CONFIG = {
        moduleUrl: '/administrasjon/admin/findPatient',
        sessionKey: 'adminmodul_last_url',
        openModeKey: 'adminmodul_open_mode'
    };

    let activeOverlay = null;
    let activeModal = null;
    let f5Handler = null;
    let currentIframe = null;

    /**
     * Aktiverer modal-modus (blokkerer CTRL+F søk i bakgrunnen)
     */
    function enableModalMode() {
        // Sett inert på alle direkte barn av body som ikke er overlay/modal
        Array.from(document.body.children).forEach(child => {
            if (!child.classList.contains('adminmodul-overlay') && 
                !child.classList.contains('adminmodul-modal')) {
                child.setAttribute('inert', '');
                child.setAttribute('data-adminmodul-inert', 'true');
            }
        });
    }
    
    /**
     * Deaktiverer modal-modus
     */
    function disableModalMode() {
        // Fjern inert fra alle elementer
        document.querySelectorAll('[data-adminmodul-inert]').forEach(el => {
            el.removeAttribute('inert');
            el.removeAttribute('data-adminmodul-inert');
        });
    }

    /**
     * Injiserer CSS-stiler for modal
     */
    function injectStyles() {
        const styleId = 'adminmodul-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .adminmodul-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000000;
            }

            .adminmodul-modal {
                position: fixed;
                top: 0px;
                left: 50%;
                transform: translateX(-50%);
                width: 90vw;
                height: calc(100vh - 0px);
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 1000001;
                overflow: hidden;
            }

            .adminmodul-modal iframe {
                width: 100%;
                height: 100%;
                border: none;
                display: block;
            }

            .adminmodul-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 36px;
                height: 36px;
                border: none;
                background: rgba(255, 255, 255, 0.95);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: all 0.2s ease;
                z-index: 1000002;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            .adminmodul-close:hover {
                background: #ffffff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .adminmodul-close svg {
                width: 20px;
                height: 20px;
                stroke: #374151;
            }

            .adminmodul-selection-modal {
                width: 500px;
                max-width: 90%;
                height: auto;
            }

            .adminmodul-header {
                padding: 24px;
                border-bottom: 1px solid #e5e7eb;
            }

            .adminmodul-title {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .adminmodul-subtitle {
                margin: 6px 0 0 0;
                font-size: 14px;
                color: #6b7280;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .adminmodul-content {
                padding: 20px 24px;
            }

            .adminmodul-option {
                display: flex;
                align-items: center;
                padding: 16px;
                margin-bottom: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: #ffffff;
            }

            .adminmodul-option:last-child {
                margin-bottom: 0;
            }

            .adminmodul-option:hover {
                border-color: #3b82f6;
                background: #eff6ff;
            }

            .adminmodul-option.selected {
                border-color: #3b82f6;
                background: #dbeafe;
            }

            .adminmodul-option-radio {
                width: 20px;
                height: 20px;
                border: 2px solid #d1d5db;
                border-radius: 50%;
                margin-right: 12px;
                position: relative;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }

            .adminmodul-option.selected .adminmodul-option-radio {
                border-color: #3b82f6;
            }

            .adminmodul-option.selected .adminmodul-option-radio::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 10px;
                height: 10px;
                background: #3b82f6;
                border-radius: 50%;
            }

            .adminmodul-option-content {
                flex: 1;
            }

            .adminmodul-option-label {
                font-size: 16px;
                font-weight: 500;
                color: #111827;
                margin: 0 0 4px 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .adminmodul-option-shortcut {
                font-size: 13px;
                color: #6b7280;
                font-family: 'Courier New', monospace;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Håndterer F5 - refresher iframe i stedet for hele siden
     */
    function handleF5(e) {
        const isF5 = (e.key === 'F5') || (e.keyCode === 116 && e.key !== 't');
        
        if (isF5) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Refresh iframe hvis det finnes en aktiv
            if (currentIframe) {
                try {
                    currentIframe.contentWindow.location.reload();
                } catch (e) {
                    // Fallback: refresh iframe src
                    currentIframe.src = currentIframe.src;
                }
            }
            
            return false;
        }
    }

    function enableF5Handler(iframe) {
        currentIframe = iframe;
        
        if (f5Handler) return;
        
        f5Handler = handleF5;
        window.addEventListener('keydown', f5Handler, true);
        document.addEventListener('keydown', f5Handler, true);
    }

    function disableF5Handler() {
        currentIframe = null;
        
        if (!f5Handler) return;
        
        window.removeEventListener('keydown', f5Handler, true);
        document.removeEventListener('keydown', f5Handler, true);
        f5Handler = null;
    }

    /**
     * Oppretter modal med iframe
     */
    function createModal() {
        // Opprett overlay
        const overlay = document.createElement('div');
        overlay.className = 'adminmodul-overlay';
        activeOverlay = overlay;
        
        // Opprett modal
        const modal = document.createElement('div');
        modal.className = 'adminmodul-modal';
        modal.innerHTML = `
            <button class="adminmodul-close" aria-label="Lukk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <iframe src="${sessionStorage.getItem(CONFIG.sessionKey) || CONFIG.moduleUrl}"></iframe>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        activeModal = modal;
        
        // Aktiver modal-modus
        enableModalMode();

        // Håndter F5 på modal-nivå
        const iframe = modal.querySelector('iframe');
        modal.addEventListener('keydown', handleF5, true);
        
        // Prøv å håndtere F5 inne i iframe når det laster
        iframe.addEventListener('load', function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeWin = iframe.contentWindow;
                
                if (iframeDoc && iframeWin) {
                    // Lagre gjeldende URL slik at vi kan gjenoppta der vi slapp
                    try {
                        sessionStorage.setItem(CONFIG.sessionKey, iframeWin.location.href);
                    } catch (e) { /* ignorer */ }

                    // Håndter F5 inne i iframe
                    const iframeF5Handler = (e) => {
                        const isF5 = (e.key === 'F5') || (e.keyCode === 116 && e.key !== 't');
                        if (isF5) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            iframeWin.location.reload();
                            return false;
                        }
                    };
                    
                    iframeDoc.addEventListener('keydown', iframeF5Handler, true);
                    iframeWin.addEventListener('keydown', iframeF5Handler, true);

                    // Blokker Alt alene inne i iframe
                    let _iframeAltAlone = false;
                    iframeWin.addEventListener('keydown', function(e) {
                        if (e.key === 'Alt') { _iframeAltAlone = true; }
                        else if (e.altKey)   { _iframeAltAlone = false; }
                    }, true);
                    iframeWin.addEventListener('keyup', function(e) {
                        if (e.key === 'Alt' && _iframeAltAlone) { e.preventDefault(); }
                        _iframeAltAlone = false;
                    }, true);

                    // Fokuser på Phone-feltet
                    setTimeout(() => {
                        const phoneInput = iframeDoc.getElementById('Phone');
                        if (phoneInput) {
                            phoneInput.focus();
                        }
                    }, 150);
                }
            } catch (e) {
                // Kan ikke få tilgang til iframe-innhold (CORS)
            }
            
            // Sett fokus på iframe
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                } catch (e) {
                    // Kan ikke fokusere (CORS)
                }
            }, 100);
        });

        // Aktiver F5-håndtering
        enableF5Handler(iframe);

        return { overlay, modal, iframe };
    }

    /**
     * Lagrer IDs til merkede rader før modal åpnes.
     */
    function saveSelectedRows() {
        window._adminmodulSavedRows = new Set();
        document.querySelectorAll('tr[id^="V-"], tr[id^="Rxxx"]').forEach(row => {
            const bg = window.getComputedStyle(row).backgroundColor;
            if (bg === 'rgb(148, 169, 220)') {
                window._adminmodulSavedRows.add(row.id);
            }
        });
    }

    /**
     * Setter opp en engangs XHR-interceptor som fyrer callback når
     * openPopp(-1) sitt AJAX-kall mot /planlegging/ajax-dispatch er ferdig.
     */
    function onceAfterOpenPopp(callback) {
        const originalOpen = XMLHttpRequest.prototype.open;
        let restored = false;

        const restore = () => {
            if (!restored) {
                restored = true;
                XMLHttpRequest.prototype.open = originalOpen;
            }
        };

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && url.includes('action=openres') && url.includes('rid=-1')) {
                restore();
                this.addEventListener('load', function() {
                    callback();
                }, { once: true });
            }
            return originalOpen.call(this, method, url, ...rest);
        };

        // Sikkerhetsnett: restore etter 3s hvis openPopp aldri kalles
        setTimeout(restore, 3000);
    }

    /**
     * Gjenoppretter merking etter openPopp har re-rendret tabellene.
     */
    function restoreSelectedRows() {
        const saved = window._adminmodulSavedRows;
        if (!saved || saved.size === 0) return;
        window._adminmodulSavedRows = new Set();

        onceAfterOpenPopp(() => setTimeout(() => {
            saved.forEach(rowId => {
                const row = document.getElementById(rowId);
                if (!row) return;
                try {
                    const td = row.querySelector('td[onclick*="selectRow"]');
                    if (td) {
                        const match = td.getAttribute('onclick').match(/selectRow\([^)]+\)/);
                        if (match) eval(match[0]);
                    }
                } catch (err) {}
            });
        }, 50));
    }

    /**
     * Lukker modal
     */
    function closeAll() {
        if (activeOverlay && activeOverlay.parentNode) {
            activeOverlay.remove();
            activeOverlay = null;
        }

        if (activeModal && activeModal.parentNode) {
            activeModal.remove();
            activeModal = null;
        }

        // Deaktiver modal-modus
        disableModalMode();

        disableF5Handler();

        restoreSelectedRows();
        try { if (typeof openPopp === 'function') openPopp('-1'); } catch (e) {}
    }

    /**
     * Setter opp event handlers
     */
    function setupHandlers(modal, overlay) {
        // Lukkeknapp
        const closeBtn = modal.querySelector('.adminmodul-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAll();
        });

        // Forhindre lukking ved klikk på modal
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Overlay-klikk for å lukke
        overlay.addEventListener('click', closeAll);
    }

    function getOpenMode() {
        return sessionStorage.getItem(CONFIG.openModeKey);
    }

    function saveOpenMode(mode) {
        sessionStorage.setItem(CONFIG.openModeKey, mode);
    }

    /**
     * Viser valg-modal for åpningsmåte (kun første gang, uten lagret preferanse)
     */
    function showAdminOpenModeModal() {
        const overlay = document.createElement('div');
        overlay.className = 'adminmodul-overlay';
        activeOverlay = overlay;

        const modal = document.createElement('div');
        modal.className = 'adminmodul-modal adminmodul-selection-modal';
        const savedMode = getOpenMode() || 'popup';
        const popupSel = savedMode === 'popup' ? ' selected' : '';
        const newtabSel = savedMode === 'newtab' ? ' selected' : '';
        modal.innerHTML = `
            <button class="adminmodul-close" aria-label="Lukk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="adminmodul-header">
                <h2 class="adminmodul-title">Åpne Adminmodul</h2>
                <p class="adminmodul-subtitle">Valget lagres i sesjonen. Lukk nettleser helt for å nullstille.</p>
            </div>
            <div class="adminmodul-content">
                <div class="adminmodul-option${popupSel}" data-mode="popup" tabindex="0">
                    <div class="adminmodul-option-radio"></div>
                    <div class="adminmodul-option-content">
                        <p class="adminmodul-option-label">Pop-up modal</p>
                        <p class="adminmodul-option-shortcut">Åpnes i et overlay-vindu</p>
                    </div>
                </div>
                <div class="adminmodul-option${newtabSel}" data-mode="newtab" tabindex="0">
                    <div class="adminmodul-option-radio"></div>
                    <div class="adminmodul-option-content">
                        <p class="adminmodul-option-label">Ny fane</p>
                        <p class="adminmodul-option-shortcut">Åpnes i en ny nettleserfane</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        activeModal = modal;
        enableModalMode();

        const options = modal.querySelectorAll('.adminmodul-option');
        let selectedIndex = Array.from(options).findIndex(o => o.classList.contains('selected'));
        if (selectedIndex < 0) selectedIndex = 0;

        const dismiss = () => {
            overlay.remove();
            modal.remove();
            activeOverlay = null;
            activeModal = null;
            disableModalMode();
            document.removeEventListener('keydown', keyHandler);
        };

        const chooseMode = (chosenMode) => {
            saveOpenMode(chosenMode);
            dismiss();
            if (chosenMode === 'newtab') {
                window.open(CONFIG.moduleUrl, '_blank');
            } else {
                const { overlay: newOverlay, modal: newModal } = createModal();
                setupHandlers(newModal, newOverlay);
            }
        };

        options.forEach((option, index) => {
            option.addEventListener('click', () => chooseMode(option.dataset.mode));
            option.addEventListener('mouseenter', () => {
                options.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selectedIndex = index;
            });
        });

        const closeBtn = modal.querySelector('.adminmodul-close');
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
        overlay.addEventListener('click', dismiss);
        modal.addEventListener('click', (e) => e.stopPropagation());

        const keyHandler = (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
                options[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex + 1) % options.length;
                options[selectedIndex].classList.add('selected');
                options[selectedIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                options[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                options[selectedIndex].classList.add('selected');
                options[selectedIndex].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                chooseMode(options[selectedIndex].dataset.mode);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                dismiss();
            }
        };
        document.addEventListener('keydown', keyHandler);
        options[selectedIndex].focus();
    }

    /**
     * Initialiserer modulen
     */
    function init() {
        // Hvis modal allerede er åpen, ikke gjør noe
        if (activeModal) {
            console.log('ℹ️ Adminmodul er allerede åpen');
            return;
        }

        try {
            // Lagre merkede rader før modal åpnes
            saveSelectedRows();

            // Injiser stiler
            injectStyles();

            // Sjekk åpningsmåte-preferanse
            const mode = getOpenMode();

            if (!mode) {
                showAdminOpenModeModal();
                return;
            }

            if (mode === 'newtab') {
                window.open(CONFIG.moduleUrl, '_blank');
                return;
            }

            // popup (eksisterende oppførsel)
            const { overlay, modal } = createModal();
            setupHandlers(modal, overlay);

        } catch (error) {
            console.error('Error initializing Adminmodul:', error);
            alert('Kunne ikke åpne adminmodulen. Vennligst prøv igjen.');
        }
    }

    // Global tastatursnarvei: Alt+A
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            init();
        }
    });

    /**
     * Intercept window.open calls for admin searchStatus links
     */
    const originalWindowOpen = window.open;
    window.open = function(url, target, features) {
        // Sjekk om det er en admin-URL som skal åpnes i modal
        if (url && typeof url === 'string' && (
            url.includes('/administrasjon/admin/searchStatus') ||
            url.includes('/administrasjon/admin/editPatient')
        )) {
            
            // Åpne i modal istedenfor ny fane
            openInModal(url);
            
            // Returner et dummy window-objekt for å unngå feil
            return { closed: false, close: () => {} };
        }
        
        // For alle andre URLs, bruk original window.open
        return originalWindowOpen.call(window, url, target, features);
    };

    /**
     * Åpner en spesifikk URL i adminmodul-modal
     */
    function openInModal(url) {
        // Hvis modal allerede er åpen, oppdater iframe src
        if (activeModal) {
            const iframe = activeModal.querySelector('iframe');
            if (iframe) {
                iframe.src = url;
                console.log('✅ Oppdatert eksisterende modal med ny URL');
                return;
            }
        }

        // Ellers åpne ny modal med den spesifikke URL-en
        try {
            // Lagre merkede rader før modal åpnes
            saveSelectedRows();

            injectStyles();
            
            // Opprett overlay
            const overlay = document.createElement('div');
            overlay.className = 'adminmodul-overlay';
            activeOverlay = overlay;
            
            // Opprett modal med spesifikk URL
            const modal = document.createElement('div');
            modal.className = 'adminmodul-modal';
            modal.innerHTML = `
                <button class="adminmodul-close" aria-label="Lukk">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <iframe src="${url}"></iframe>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            activeModal = modal;
            
            // Aktiver modal-modus
            enableModalMode();

            const iframe = modal.querySelector('iframe');
            modal.addEventListener('keydown', handleF5, true);
            
            // Flag for å forhindre gjentatt auto-søk
            let autoSearchPerformed = false;
            let waitingForSearchResults = false;
            
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (iframeDoc && iframeWin) {
                        const iframeF5Handler = (e) => {
                            const isF5 = (e.key === 'F5') || (e.keyCode === 116 && e.key !== 't');
                            if (isF5) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                iframeWin.location.reload();
                                return false;
                            }
                        };
                        
                        iframeDoc.addEventListener('keydown', iframeF5Handler, true);
                        iframeWin.addEventListener('keydown', iframeF5Handler, true);

                        // Blokker Alt alene inne i iframe
                        let _iframeAltAlone = false;
                        iframeWin.addEventListener('keydown', function(e) {
                            if (e.key === 'Alt') { _iframeAltAlone = true; }
                            else if (e.altKey)   { _iframeAltAlone = false; }
                        }, true);
                        iframeWin.addEventListener('keyup', function(e) {
                            if (e.key === 'Alt' && _iframeAltAlone) { e.preventDefault(); }
                            _iframeAltAlone = false;
                        }, true);

                        // Hvis vi venter på søkeresultater, klikk på første rad og scroll
                        if (waitingForSearchResults) {
                            waitingForSearchResults = false;
                            setTimeout(() => {
                                try {
                                    // Finn søkeresultattabellen
                                    const searchResultTable = iframeDoc.getElementById('searchResultTable');
                                    
                                    if (searchResultTable) {
                                        // Finn første klikkbare rad i tbody (med onclick attributt)
                                        const firstRow = searchResultTable.querySelector('tbody tr[onclick]');
                                        
                                        if (firstRow) {
                                            // Klikk på første rad
                                            firstRow.click();
                                        } else {
                                            console.log('⚠️ Fant ikke noen klikkbare rader i søkeresultatet');
                                        }
                                        
                                        // Scroll slik at toppen av fieldset/tabellen vises
                                        setTimeout(() => {
                                            // Prøv først å finne fieldset som inneholder tabellen
                                            let scrollTarget = searchResultTable.closest('fieldset');
                                            
                                            // Hvis ikke fieldset finnes, bruk tabellen direkte
                                            if (!scrollTarget) {
                                                scrollTarget = searchResultTable;
                                            }
                                            
                                            const targetTop = scrollTarget.getBoundingClientRect().top + iframeWin.scrollY;
                                            iframeWin.scrollTo({
                                                top: targetTop - 20, // 20px margin fra toppen
                                                behavior: 'instant'
                                            });
                                        }, 200);
                                    } else {
                                        console.log('⚠️ Fant ikke searchResultTable');
                                    }
                                } catch (scrollErr) {
                                    console.error('Scroll/click error:', scrollErr);
                                }
                            }, 300);
                        }
                        // Automatisk søk basert på URL-parameter - kun første gang
                        else if (!autoSearchPerformed) {
                            autoSearchPerformed = true;
                            
                            setTimeout(() => {
                                if (url.includes('searchStatus?nr=')) {
                                    // Klikk på reqSearch knappen for bestillingsnummer
                                    const reqSearchBtn = iframeDoc.getElementById('reqSearch');
                                    if (reqSearchBtn) {
                                        waitingForSearchResults = true;
                                        reqSearchBtn.click();
                                    }
                                } else if (url.includes('searchStatus?id=')) {
                                    // Klikk på tripSearch knappen for tur-ID
                                    const tripSearchBtn = iframeDoc.getElementById('tripSearch');
                                    if (tripSearchBtn) {
                                        waitingForSearchResults = true;
                                        tripSearchBtn.click();
                                    }
                                }
                            }, 150);
                        }
                    }
                } catch (e) {
                    // Kan ikke få tilgang til iframe-innhold (CORS)
                }
                
                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                    } catch (e) {
                        // Kan ikke fokusere (CORS)
                    }
                }, 100);
            });

            enableF5Handler(iframe);
            setupHandlers(modal, overlay);
            
        } catch (error) {
            console.error('Error opening modal with URL:', error);
        }
    }

    // Eksporter funksjoner globalt
    window.Adminmodul = {
        init,
        close: closeAll,
        openInModal,
        clearPreferred: () => sessionStorage.removeItem(CONFIG.openModeKey)
    };

    console.log("✅ Adminmodul-script lastet");
})();
