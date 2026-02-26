/**
 * Bestillingsmodul.js
 * 
 * Dette scriptet forenkler tilgang til bestillingsmodulene i Pasientreiser.
 * 
 * Funksjonalitet:
 * - Snarvei ALT+N for å åpne bestillingsmodul
 * - Snarvei ALT+H for å åpne Hent rekvisisjon
 * - Snarvei ALT+M for å åpne Møteplass
 * - Velg mellom 4-stegs eller Ensides bestillingsmodul
 * - Husker ditt valg i nettleserens session
 * - Blokkerer F5 for å unngå utilsiktet refresh
 * - Lukk modal med X-knapp eller klikk utenfor
 * - Intercepter redit-lenker og åpne dem i modal
 * - Intercepter Møteplass-knappen og åpne i modal
 * 
 * Bruk:
 * - Trykk ALT+N for å åpne bestillingsmodul
 * - Trykk ALT+H for Hent rekvisisjon
 * - Trykk ALT+M for Møteplass (krever valgte elementer)
 * - Første gang: Velg foretrukket modul (lagres i session)
 * - Neste gang: Åpner direkte til valgt modul
 * - For å nullstille valg: window.Bestillingsmodul.clearPreferred()
 *
 */

(function() {
    'use strict';

    // Sjekk om script allerede er installert
    if (window.__bestillingsmodulInstalled) {
        console.log('✅ Bestillingsmodul-script er allerede aktiv');
        return;
    }
    
    // Installer script
    window.__bestillingsmodulInstalled = true;
    console.log("🚀 Starter Bestillingsmodul-script");

    // Konfigurasjon
    const CONFIG = {
        resetUrl: '/rekvisisjon/requisition/exit',
        sessionKey: 'bestillingsmodul_preferred',
        hentRekUrl: '/rekvisisjon/requisition/confirmGetRequisition',
        meetingplaceUrl: '/rekvisisjon/meetingplace/',
        modules: {
            fourStep: {
                url: '/rekvisisjon/requisition/new?confirmed=1',
                label: '4-stegs bestillingsmodul'
            },
            onePage: {
                url: '/rekvisisjon/requisition/altRequisition',
                label: 'Ensides bestillingsmodul'
            }
        }
    };

    let activeOverlay = null;
    let activeModals = [];
    let activeKeyboardListener = null;
    
    /**
     * Aktiverer modal-modus (blokkerer CTRL+F søk i bakgrunnen)
     */
    function enableModalMode() {
        document.body.classList.add('bestillingsmodul-active');
        
        // Sett inert på alle direkte barn av body som ikke er overlay/modal
        // Dette blokkerer CTRL+F søk i bakgrunnen, men beholder synlighet
        Array.from(document.body.children).forEach(child => {
            if (!child.classList.contains('bestillingsmodul-overlay') && 
                !child.classList.contains('bestillingsmodul-modal')) {
                child.setAttribute('inert', '');
                child.setAttribute('data-bestillingsmodul-inert', 'true');
            }
        });
    }
    
    /**
     * Deaktiverer modal-modus
     */
    function disableModalMode() {
        document.body.classList.remove('bestillingsmodul-active');
        
        // Fjern inert fra alle elementer
        document.querySelectorAll('[data-bestillingsmodul-inert]').forEach(el => {
            el.removeAttribute('inert');
            el.removeAttribute('data-bestillingsmodul-inert');
        });
    }

    /**
     * Nullstiller bestillingsmodulen via XHR
     */
    function resetModule() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', CONFIG.resetUrl, true);
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`Reset failed with status: ${xhr.status}`));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Network error during reset'));
            };
            
            xhr.send();
        });
    }

    /**
     * Injiserer CSS-stiler for modalene
     */
    function injectStyles() {
        const styleId = 'bestillingsmodul-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .bestillingsmodul-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
            }

            .bestillingsmodul-modal {
                position: fixed;
                top: 0px;
                left: 50%;
                transform: translateX(-50%);
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                overflow: hidden;
            }

            .bestillingsmodul-selection-modal {
                width: 500px;
                max-width: 90%;
            }

            .bestillingsmodul-iframe-modal {
                width: 90vw;
                max-width: 1700px;
                height: calc(100vh - 0px);
                display: none;
            }

            .bestillingsmodul-iframe-modal.active {
                display: block;
            }

            .bestillingsmodul-iframe-modal.meetingplace-modal {
                width: 1500px;
                max-width: 90%;
                left: 20px;
                transform: none;
            }

            .bestillingsmodul-modal iframe {
                width: 100%;
                height: 100%;
                border: none;
                display: block;
            }

            .bestillingsmodul-close {
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
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }

            .bestillingsmodul-close:hover {
                background: #ffffff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .bestillingsmodul-close svg {
                width: 20px;
                height: 20px;
                stroke: #374151;
            }

            .bestillingsmodul-header {
                padding: 24px;
                border-bottom: 1px solid #e5e7eb;
            }

            .bestillingsmodul-title {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .bestillingsmodul-subtitle {
                margin: 6px 0 0 0;
                font-size: 14px;
                color: #6b7280;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .bestillingsmodul-content {
                padding: 20px 24px;
            }

            .bestillingsmodul-option {
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

            .bestillingsmodul-option:last-child {
                margin-bottom: 0;
            }

            .bestillingsmodul-option:hover {
                border-color: #3b82f6;
                background: #eff6ff;
            }

            .bestillingsmodul-option:focus {
                outline: none;
                border-color: #3b82f6;
                background: #eff6ff;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .bestillingsmodul-option.selected {
                border-color: #3b82f6;
                background: #dbeafe;
            }

            .bestillingsmodul-option-radio {
                width: 20px;
                height: 20px;
                border: 2px solid #d1d5db;
                border-radius: 50%;
                margin-right: 12px;
                position: relative;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }

            .bestillingsmodul-option.selected .bestillingsmodul-option-radio {
                border-color: #3b82f6;
            }

            .bestillingsmodul-option.selected .bestillingsmodul-option-radio::after {
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

            .bestillingsmodul-option-content {
                flex: 1;
            }

            .bestillingsmodul-option-label {
                font-size: 16px;
                font-weight: 500;
                color: #111827;
                margin: 0 0 4px 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .bestillingsmodul-option-shortcut {
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
    let f5Handler = null;
    let currentIframe = null;
    
    function handleF5(e) {
        const isF5 = (e.key === 'F5') || (e.keyCode === 116 && e.key !== 't');
        
        if (isF5) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Refresh iframe hvis det finnes en aktiv
            if (currentIframe) {
                try {
                    // Prøv å refreshe gjeldende side i iframe
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
     * Oppretter alle modaler (valgmodal og iframe-modaler)
     */
    function createModals() {
        // Opprett overlay
        const overlay = document.createElement('div');
        overlay.className = 'bestillingsmodul-overlay';
        activeOverlay = overlay;
        
        // Opprett valgmodal
        const selectionModal = document.createElement('div');
        selectionModal.className = 'bestillingsmodul-modal bestillingsmodul-selection-modal';
        selectionModal.innerHTML = `
            <button class="bestillingsmodul-close" aria-label="Lukk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="bestillingsmodul-header">
                <h2 class="bestillingsmodul-title">Velg bestillingsmodul</h2>
                <p class="bestillingsmodul-subtitle">Valget lagres i sesjonen. Lukk nettleser helt for å nullstille.</p>
            </div>
            <div class="bestillingsmodul-content">
                <div class="bestillingsmodul-option selected" data-module="onePage" tabindex="0">
                    <div class="bestillingsmodul-option-radio"></div>
                    <div class="bestillingsmodul-option-content">
                        <p class="bestillingsmodul-option-label">🐌 ${CONFIG.modules.onePage.label}</p>
                        <p class="bestillingsmodul-option-shortcut">Alt på én side. Scroll din vei til suksess</p>
                    </div>
                </div>
                <div class="bestillingsmodul-option" data-module="fourStep" tabindex="0">
                    <div class="bestillingsmodul-option-radio"></div>
                    <div class="bestillingsmodul-option-content">
                        <p class="bestillingsmodul-option-label">⚡ ${CONFIG.modules.fourStep.label}</p>
                        <p class="bestillingsmodul-option-shortcut">Raske snarveier for effektive tastaturbrukere</p>
                    </div>
                </div>
            </div>
        `;

        // Opprett iframe-modaler for hver modul
        const fourStepModal = document.createElement('div');
        fourStepModal.className = 'bestillingsmodul-modal bestillingsmodul-iframe-modal';
        fourStepModal.dataset.module = 'fourStep';
        fourStepModal.innerHTML = `
            <button class="bestillingsmodul-close" aria-label="Lukk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <iframe src="${CONFIG.modules.fourStep.url}"></iframe>
        `;

        const onePageModal = document.createElement('div');
        onePageModal.className = 'bestillingsmodul-modal bestillingsmodul-iframe-modal';
        onePageModal.dataset.module = 'onePage';
        onePageModal.innerHTML = `
            <button class="bestillingsmodul-close" aria-label="Lukk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <iframe src="${CONFIG.modules.onePage.url}"></iframe>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(selectionModal);
        document.body.appendChild(fourStepModal);
        document.body.appendChild(onePageModal);

        // Legg til F5-håndtering direkte på iframe-modaler og inne i iframe-innholdet
        [fourStepModal, onePageModal].forEach(modal => {
            const iframe = modal.querySelector('iframe');
            
            // Håndter F5 på modal-nivå
            modal.addEventListener('keydown', handleF5, true);
            
            // Prøv å håndtere F5 inne i iframe når det laster
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (iframeDoc && iframeWin) {
                        // Håndter F5 inne i iframe
                        const iframeF5Handler = (e) => {
                            const isF5 = (e.key === 'F5') || (e.keyCode === 116 && e.key !== 't');
                            if (isF5) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                // Refresh gjeldende side i iframe
                                iframeWin.location.reload();
                                return false;
                            }
                        };
                        
                        iframeDoc.addEventListener('keydown', iframeF5Handler, true);
                        iframeWin.addEventListener('keydown', iframeF5Handler, true);
                        
                    }
                } catch (e) {
                    // Kan ikke få tilgang til iframe-innhold (CORS)
                }
            });
        });

        activeModals = [selectionModal, fourStepModal, onePageModal];
        
        // Aktiver modal-modus
        enableModalMode();

        return { overlay, selectionModal, fourStepModal, onePageModal };
    }

    /**
     * Lukker alle modaler - robust versjon som fjerner alt
     */
    async function closeAll() {
        // Fjern keyboard listener hvis den eksisterer
        if (activeKeyboardListener) {
            document.removeEventListener('keydown', activeKeyboardListener);
            activeKeyboardListener = null;
        }
        
        // Fjern overlay fra variabel
        if (activeOverlay) {
            activeOverlay.remove();
            activeOverlay = null;
        }
        
        // Fjern alle modaler fra variabel
        activeModals.forEach(modal => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        });
        activeModals = [];
        
        // EKSTRA CLEANUP: Fjern alle bestillingsmodul-overlays og modaler fra DOM
        // Dette fanger opp eventuelle "spøkelsesmodaler" som ble opprettet raskt
        document.querySelectorAll('.bestillingsmodul-overlay').forEach(el => el.remove());
        document.querySelectorAll('.bestillingsmodul-modal').forEach(el => el.remove());
        
        // Deaktiver modal-modus
        disableModalMode();
        
        disableF5Handler();
        
        // Nullstill bestillingsmodul når modal lukkes
        try {
            await resetModule();
        } catch (error) {
            console.error('Error resetting module on close:', error);
        }
        
        // Oppdater bestillinger som er laget/endret
        try {
            if (typeof openPopp === 'function') {
                openPopp("-1");
            }
        } catch (error) {
            console.error('Error calling openPopp:', error);
        }
    }

    /**
     * Viser iframe-modal for valgt modul
     */
    function showIframeModal(moduleKey, modals) {
        const { selectionModal, fourStepModal, onePageModal } = modals;
        
        // Fjern valgmodal helt hvis den fortsatt eksisterer i DOM
        if (selectionModal && selectionModal.parentNode) {
            selectionModal.remove();
        }
        
        // Vis riktig iframe-modal og aktiver F5-håndtering
        if (moduleKey === 'fourStep') {
            fourStepModal.classList.add('active');
            const iframe = fourStepModal.querySelector('iframe');
            enableF5Handler(iframe);
            // Sett fokus på iframe når det er lastet
            iframe.addEventListener('load', function focusOnLoad() {
                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                    } catch (e) {
                        // Kan ikke fokusere (CORS)
                    }
                }, 100);
                iframe.removeEventListener('load', focusOnLoad);
            });
        } else {
            onePageModal.classList.add('active');
            const iframe = onePageModal.querySelector('iframe');
            enableF5Handler(iframe);
            // Sett fokus på iframe når det er lastet
            iframe.addEventListener('load', function focusOnLoad() {
                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                    } catch (e) {
                        // Kan ikke fokusere (CORS)
                    }
                }, 100);
                iframe.removeEventListener('load', focusOnLoad);
            });
        }
    }

    /**
     * Henter foretrukket modul fra session
     */
    function getPreferredModule() {
        return sessionStorage.getItem(CONFIG.sessionKey);
    }

    /**
     * Lagrer foretrukket modul til session
     */
    function savePreferredModule(moduleKey) {
        sessionStorage.setItem(CONFIG.sessionKey, moduleKey);
    }

    /**
     * Setter opp alle event handlers
     */
    function setupHandlers(modals) {
        const { overlay, selectionModal, fourStepModal, onePageModal } = modals;
        const options = selectionModal.querySelectorAll('.bestillingsmodul-option');
        let selectedIndex = 0;
        let keyboardListenerActive = true;

        // Funksjon for å velge og åpne modul
        function selectModule(moduleKey) {
            // Fjern keyboard listener hvis den fortsatt er aktiv
            if (keyboardListenerActive) {
                document.removeEventListener('keydown', selectionKeyHandler);
                keyboardListenerActive = false;
            }
            savePreferredModule(moduleKey);
            showIframeModal(moduleKey, modals);
        }

        // Valgmodal - Klikk-handlers
        options.forEach((option, index) => {
            option.addEventListener('click', () => {
                const moduleKey = option.dataset.module;
                selectModule(moduleKey);
            });

            option.addEventListener('mouseenter', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedIndex = index;
            });
        });

        // Valgmodal - Tastatur-handler
        const selectionKeyHandler = (e) => {
            // Tab eller pil ned - gå til neste valg
            if (e.key === 'Tab' || e.key === 'ArrowDown') {
                e.preventDefault();
                options[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex + 1) % options.length;
                options[selectedIndex].classList.add('selected');
                options[selectedIndex].focus();
            }
            
            // Pil opp - gå til forrige valg
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                options[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                options[selectedIndex].classList.add('selected');
                options[selectedIndex].focus();
            }
            
            // Enter - velg valgt modul
            if (e.key === 'Enter') {
                e.preventDefault();
                const selectedOption = options[selectedIndex];
                const moduleKey = selectedOption.dataset.module;
                selectModule(moduleKey);
            }
        };
        
        // Lagre referanse og legg til listener
        activeKeyboardListener = selectionKeyHandler;
        document.addEventListener('keydown', selectionKeyHandler);

        // Lukkeknapp-handlers for alle modaler
        [selectionModal, fourStepModal, onePageModal].forEach(modal => {
            const closeBtn = modal.querySelector('.bestillingsmodul-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll();
            });

            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Overlay-klikk for å lukke
        overlay.addEventListener('click', closeAll);

        // Fokuser på første valg
        options[0].focus();
    }

    /**
     * Initialiserer modulen
     */
    async function init() {
        try {
            // Lukk eventuelt åpne modaler først
            await closeAll();
            
            // Steg 1: Nullstill modul
            await resetModule();
            
            // Steg 2: Injiser stiler
            injectStyles();
            
            // Steg 3: Opprett modaler
            const modals = createModals();
            
            // Steg 4: Sjekk for foretrukket modul
            const preferred = getPreferredModule();
            if (preferred && CONFIG.modules[preferred]) {
                // Vis iframe-modal direkte (F5-håndtering aktiveres i showIframeModal)
                showIframeModal(preferred, modals);
            }
            
            // Steg 5: Sett opp handlers
            setupHandlers(modals);
            
        } catch (error) {
            console.error('Error initializing Bestillingsmodul:', error);
            alert('Kunne ikke initialisere bestillingsmodulen. Vennligst prøv igjen.');
        }
    }

    /**
     * Åpner en direkte URL i modal (brukes for Hent rekvisisjon)
     */
    async function openDirectUrl(url) {
        try {
            // Lukk eventuelt åpne modaler først
            await closeAll();
            
            // Steg 1: Nullstill modul
            await resetModule();
            
            // Steg 2: Injiser stiler
            injectStyles();
            
            // Steg 3: Opprett overlay
            const overlay = document.createElement('div');
            overlay.className = 'bestillingsmodul-overlay';
            activeOverlay = overlay;
            
            // Steg 4: Opprett iframe-modal
            const modal = document.createElement('div');
            modal.className = 'bestillingsmodul-modal bestillingsmodul-iframe-modal active';
            modal.innerHTML = `
                <button class="bestillingsmodul-close" aria-label="Lukk">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <iframe src="${url}"></iframe>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            activeModals = [modal];
            
            // Aktiver modal-modus
            enableModalMode();

            const iframe = modal.querySelector('iframe');
            
            // Håndter F5 på modal-nivå
            modal.addEventListener('keydown', handleF5, true);
            
            // Prøv å håndtere F5 inne i iframe når det laster
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (iframeDoc && iframeWin) {
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
                        
                    }
                } catch (e) {
                    // Kan ikke få tilgang til iframe-innhold (CORS)
                }
            });

            // Aktiver F5-håndtering
            enableF5Handler(iframe);

            // Setup close handlers
            const closeBtn = modal.querySelector('.bestillingsmodul-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll();
            });

            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            overlay.addEventListener('click', closeAll);
            
        } catch (error) {
            console.error('Error opening URL in modal:', error);
            alert('Kunne ikke åpne vinduet. Vennligst prøv igjen.');
        }
    }

    /**
     * Henter valgt bestilling (kun ventende oppdrag - V-)
     */
    function getSelectedRequisition() {
        // Finn alle rader som er selected (blå bakgrunn)
        const selectedRows = document.querySelectorAll('tr[style*="background-color: rgb(148, 169, 220)"]');
        
        // Finn første ventende oppdrag (V- prefiks)
        for (const row of selectedRows) {
            const id = row.id;
            if (id && id.startsWith('V-')) {
                // Hent rekvisisjonsnummer fra id (fjern V- prefiks)
                const reqId = id.substring(2); // "V-53221507" -> "53221507"
                return reqId;
            }
        }
        
        return null;
    }

    /**
     * Bygger URL for Møteplass med valgt bestilling
     */
    function buildMeetingplaceUrl(reqId) {
        // Format: /rekvisisjon/meetingplace/edit?rid=53221507&ns=true
        return `${CONFIG.meetingplaceUrl}edit?rid=${reqId}&ns=true`;
    }

    /**
     * Åpner Møteplass i modal
     */
    async function openMeetingplace() {
        try {
            // Hent valgt bestilling (kun ventende oppdrag)
            const reqId = getSelectedRequisition();
            
            if (!reqId) {
                alert('Du må velge én bestilling fra ventende oppdrag først.');
                return;
            }
            
            // Bygg URL med valgt bestilling
            const url = buildMeetingplaceUrl(reqId);
            
            // Lukk eventuelt åpne modaler først
            await closeAll();
            
            // Nullstill modul
            await resetModule();
            
            // Injiser stiler
            injectStyles();
            
            // Opprett overlay
            const overlay = document.createElement('div');
            overlay.className = 'bestillingsmodul-overlay';
            activeOverlay = overlay;
            
            // Opprett iframe-modal
            const modal = document.createElement('div');
            modal.className = 'bestillingsmodul-modal bestillingsmodul-iframe-modal meetingplace-modal active';
            modal.innerHTML = `
                <button class="bestillingsmodul-close" aria-label="Lukk">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <iframe src="${url}"></iframe>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            activeModals = [modal];
            
            // Aktiver modal-modus
            enableModalMode();

            const iframe = modal.querySelector('iframe');
            
            // Håndter F5 på modal-nivå
            modal.addEventListener('keydown', handleF5, true);
            
            // Prøv å håndtere F5 og window.close inne i iframe når det laster
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (iframeDoc && iframeWin) {
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
                        
                        
                        // Override window.close() i iframe for å lukke modal istedenfor
                        iframeWin.close = function() {
                            closeAll();
                        };
                    }
                } catch (e) {
                    // Kan ikke få tilgang til iframe-innhold (CORS)
                    console.warn('⚠️ Kunne ikke overstyre window.close() i Møteplass-iframe:', e);
                }
            });

            // Aktiver F5-håndtering
            enableF5Handler(iframe);

            // Setup close handlers
            const closeBtn = modal.querySelector('.bestillingsmodul-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll();
            });

            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            overlay.addEventListener('click', closeAll);
            
        } catch (error) {
            console.error('Error opening Møteplass in modal:', error);
            alert('Kunne ikke åpne Møteplass. Vennligst prøv igjen.');
        }
    }

    /**
     * Intercept clicks på Møteplass-knappen
     */
    function setupMeetingplaceIntercept() {
        const meetingplaceBtn = document.getElementById('buttonMeetingplace');
        if (!meetingplaceBtn) {
            // Prøv igjen om 500ms hvis knappen ikke finnes ennå
            setTimeout(setupMeetingplaceIntercept, 500);
            return;
        }

        // Fjern original onclick handler
        const originalOnClick = meetingplaceBtn.onclick;
        
        // Overstyr onclick
        meetingplaceBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Åpne møteplass i modal istedenfor popup
            openMeetingplace();
            
            return false;
        };
    }

    // Global tastatursnarvei: Alt+N, Alt+H, og Alt+M
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            init();
        }
        // Alt+H for Hent rekvisisjon
        else if (e.altKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            openDirectUrl(CONFIG.hentRekUrl);
        }
        // Alt+M for Møteplass
        else if (e.altKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            openMeetingplace();
        }
    });

    /**
     * Fang opp window.open kall for redigering og kopiering av bestillinger
     */
    const originalWindowOpen = window.open;
    window.open = function (url, target, features) {
      if (
        typeof url === 'string' &&
        (
          url.includes('/rekvisisjon/requisition/redit') ||
          url.includes('/rekvisisjon/requisition/patient?copyReqId')
        )
      ) {
        // Åpne i modal istedenfor ny fane
        openReditInModal(url);
    
        // Returner et dummy window-objekt for å unngå feil
        return { closed: false, close: () => {} };
      }
    
      // For alle andre URLs, bruk original window.open
      return originalWindowOpen.call(window, url, target, features);
    };

    /**
     * Intercept clicks on <a> tags with redit links
     */
    document.addEventListener('click', function(e) {
        // Finn nærmeste <a> element (i tilfelle vi klikker på img eller annet barn-element)
        const link = e.target.closest('a');
        
        if (link && link.href) {
            // Sjekk for redit-lenker
            if (link.href.includes('/rekvisisjon/requisition/redit')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Åpne i modal istedenfor ny fane
                openReditInModal(link.href);
            }
            // Sjekk for generell requisition-lenke (helselogo.gif)
            else if (link.href.includes('/rekvisisjon/requisition/') && 
                     !link.href.includes('redit')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Åpne via normal init (viser valgmodul eller foretrukket modul)
                init();
            }
        }
    }, true); // Bruk capture phase for å fange klikk tidlig

    /**
     * Hjelpefunksjon: Scroll til og fokuser på pickupTime-feltet
     */
    function focusPickupTime(doc, win) {
        try {
            const pickupTimeField = doc.getElementById('pickupTime');
            if (pickupTimeField) {
                const iframeWin = win || doc.defaultView;
                // Scroll til bunnen av siden minus en fast avstand fra bunn
                const scrollBottom = doc.documentElement.scrollHeight - iframeWin.innerHeight - 135;
                iframeWin.scrollTo({ top: scrollBottom, behavior: 'smooth' });
                setTimeout(() => {
                    pickupTimeField.focus();
                    pickupTimeField.select();
                }, 100);
            }
        } catch (err) {
            console.error('Error focusing pickupTime:', err);
        }
    }

    /**
     * Åpner en redit URL i bestillingsmodul-modal
     */
    async function openReditInModal(url) {
        try {
            // Steg 1: Nullstill modul
            await resetModule();
            
            // Steg 2: Injiser stiler
            injectStyles();
            
            // Steg 3: Opprett overlay
            const overlay = document.createElement('div');
            overlay.className = 'bestillingsmodul-overlay';
            activeOverlay = overlay;
            
            // Steg 4: Opprett iframe-modal
            const modal = document.createElement('div');
            modal.className = 'bestillingsmodul-modal bestillingsmodul-iframe-modal active';
            modal.innerHTML = `
                <button class="bestillingsmodul-close" aria-label="Lukk">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <iframe src="${url}"></iframe>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            activeModals = [modal];
            
            // Aktiver modal-modus
            enableModalMode();

            const iframe = modal.querySelector('iframe');
            
            // Håndter F5 på modal-nivå
            modal.addEventListener('keydown', handleF5, true);
            
            // Når iframe laster, prøv å klikke på Rediger-knappen og fokuser på pickupTime
            iframe.addEventListener('load', function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (iframeDoc && iframeWin) {
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
                        
                        
                        // Klikk på "Rediger klar fra" knappen hvis den finnes og er synlig
                        setTimeout(() => {
                            const redigerBtn = iframeDoc.getElementById('redigerKlarFra');
                            if (redigerBtn) {
                                const style = iframeWin.getComputedStyle(redigerBtn);
                                if (style.display !== 'none' && style.visibility !== 'hidden') {
                                    redigerBtn.click();
                                    setTimeout(() => focusPickupTime(iframeDoc, iframeWin), 50);
                                } else {
                                    // Knappen er skjult, bare fokuser på feltet
                                    focusPickupTime(iframeDoc, iframeWin);
                                }
                            } else {
                                // Knappen finnes ikke, bare fokuser på feltet
                                focusPickupTime(iframeDoc, iframeWin);
                            }
                        }, 100);
                    }
                } catch (e) {
                    // Kan ikke få tilgang til iframe-innhold (CORS)
                    console.error('CORS error accessing iframe:', e);
                }
            });

            // Aktiver F5-håndtering
            enableF5Handler(iframe);

            // Setup close handlers
            const closeBtn = modal.querySelector('.bestillingsmodul-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAll();
            });

            modal.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            overlay.addEventListener('click', closeAll);
            
        } catch (error) {
            console.error('Error opening redit in modal:', error);
            alert('Kunne ikke åpne redigeringsvinduet. Vennligst prøv igjen.');
        }
    }

    // Setup Møteplass-intercept når DOM er klar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMeetingplaceIntercept);
    } else {
        setTimeout(setupMeetingplaceIntercept, 500);
    }

    // Eksporter funksjoner globalt
    window.Bestillingsmodul = { 
        init,
        clearPreferred: () => sessionStorage.removeItem(CONFIG.sessionKey),
        openReditInModal,
        openDirectUrl,
        openMeetingplace
    };

    console.log("✅ Bestillingsmodul-script lastet");
})();