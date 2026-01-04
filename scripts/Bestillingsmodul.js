/**
 * Bestillingsmodul.js
 * 
 * Dette scriptet forenkler tilgang til bestillingsmodulene i Pasientreiser.
 * 
 * Funksjonalitet:
 * - Snarvei ALT+N for å åpne bestillingsmodul
 * - Velg mellom 4-stegs eller Ensides bestillingsmodul
 * - Husker ditt valg i nettleserens session
 * - Blokkerer F5 for å unngå utilsiktet refresh
 * - Lukk modal med X-knapp eller klikk utenfor
 * 
 * Bruk:
 * - Trykk ALT+N for å åpne
 * - Første gang: Velg foretrukket modul (lagres i session)
 * - Neste gang: Åpner direkte til valgt modul
 * - For å nullstille valg: window.Bestillingsmodul.clearPreferred()
 * 
 * @author Claude AI
 * @version 3.0
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

    /**
     * Nullstiller bestillingsmodulen via XHR
     */
    function resetModule() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', CONFIG.resetUrl, true);
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    //console.log('Bestillingsmodul reset successfully');
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
                top: 20px;
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
                width: 95vw;
                max-width: 1600px;
                height: calc(100vh - 40px);
                display: none;
            }

            .bestillingsmodul-iframe-modal.active {
                display: block;
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
                <div class="bestillingsmodul-option selected" data-module="fourStep" tabindex="0">
                    <div class="bestillingsmodul-option-radio"></div>
                    <div class="bestillingsmodul-option-content">
                        <p class="bestillingsmodul-option-label">⚡ ${CONFIG.modules.fourStep.label}</p>
                        <p class="bestillingsmodul-option-shortcut">Raske snarveier for effektive tastaturbrukere</p>
                    </div>
                </div>
                <div class="bestillingsmodul-option" data-module="onePage" tabindex="0">
                    <div class="bestillingsmodul-option-radio"></div>
                    <div class="bestillingsmodul-option-content">
                        <p class="bestillingsmodul-option-label">🐌 ${CONFIG.modules.onePage.label}</p>
                        <p class="bestillingsmodul-option-shortcut">Alt på én side. Scroll din vei til suksess</p>
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

        return { overlay, selectionModal, fourStepModal, onePageModal };
    }

    /**
     * Lukker alle modaler
     */
    async function closeAll() {
        if (activeOverlay) {
            activeOverlay.remove();
            activeOverlay = null;
        }
        activeModals.forEach(modal => modal.remove());
        activeModals = [];
        disableF5Handler();
        
        // Nullstill bestillingsmodul når modal lukkes
        try {
            await resetModule();
        } catch (error) {
            console.error('Error resetting module on close:', error);
        }
    }

    /**
     * Viser iframe-modal for valgt modul
     */
    function showIframeModal(moduleKey, modals) {
        const { selectionModal, fourStepModal, onePageModal } = modals;
        
        // Skjul valgmodal
        selectionModal.style.display = 'none';
        
        // Vis riktig iframe-modal og aktiver F5-håndtering
        if (moduleKey === 'fourStep') {
            fourStepModal.classList.add('active');
            const iframe = fourStepModal.querySelector('iframe');
            enableF5Handler(iframe);
        } else {
            onePageModal.classList.add('active');
            const iframe = onePageModal.querySelector('iframe');
            enableF5Handler(iframe);
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

        // Funksjon for å velge og åpne modul
        function selectModule(moduleKey) {
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

    // Global tastatursnarvei: Alt+N
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            init();
        }
    });

    // Eksporter init-funksjon globalt
    window.Bestillingsmodul = { 
        init,
        clearPreferred: () => sessionStorage.removeItem(CONFIG.sessionKey)
    };

    // Logg script-info
    console.log("⌨️  Bestillingsmodul snarveier:");
    console.log("   ALT+N → Åpne bestillingsmodul");
    console.log("✅ Bestillingsmodul-script lastet");
})();