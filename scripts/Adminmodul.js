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
 *
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

    // Konfigurasjon
    const CONFIG = {
        moduleUrl: '/administrasjon/admin/findPatient'
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
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 90vw;
                height: calc(100vh - 40px);
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
            <iframe src="${CONFIG.moduleUrl}"></iframe>
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
            // Steg 1: Injiser stiler
            injectStyles();
            
            // Steg 2: Opprett modal
            const { overlay, modal } = createModal();
            
            // Steg 3: Sett opp handlers
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
        // Sjekk om det er en admin searchStatus URL
        if (url && typeof url === 'string' && url.includes('/administrasjon/admin/searchStatus')) {
            
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
                                                behavior: 'smooth'
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
        openInModal
    };

    console.log("✅ Adminmodul-script lastet");
})();