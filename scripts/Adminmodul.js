/**
 * Adminmodul.js
 * 
 * Dette scriptet gir rask tilgang til administrasjonsmodulen i NISSY.
 * 
 * Funksjonalitet:
 * - Snarvei ALT+A for å åpne adminmodul
 * - Åpner direkte til søkeside for tur/bestilling/person
 * - Blokkerer F5 for å unngå utilsiktet refresh
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
        resetUrl: '/rekvisisjon/requisition/exit',
        moduleUrl: '/administrasjon/admin/findPatient'
    };

    let activeOverlay = null;
    let activeModal = null;
    let f5Handler = null;
    let currentIframe = null;

    /**
     * Nullstiller modul via XHR
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
                z-index: 9998;
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
                z-index: 9999;
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
                z-index: 10000;
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
    async function closeAll() {
        if (activeOverlay && activeOverlay.parentNode) {
            activeOverlay.remove();
            activeOverlay = null;
        }
        
        if (activeModal && activeModal.parentNode) {
            activeModal.remove();
            activeModal = null;
        }
        
        disableF5Handler();
        
        // Nullstill modul når modal lukkes
        try {
            await resetModule();
        } catch (error) {
            console.error('Error resetting module on close:', error);
        }
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
    async function init() {
        // Hvis modal allerede er åpen, ikke gjør noe
        if (activeModal) {
            console.log('ℹ️ Adminmodul er allerede åpen');
            return;
        }

        try {
            // Steg 1: Nullstill modul
            await resetModule();
            
            // Steg 2: Injiser stiler
            injectStyles();
            
            // Steg 3: Opprett modal
            const { overlay, modal } = createModal();
            
            // Steg 4: Sett opp handlers
            setupHandlers(modal, overlay);
            
            console.log('✅ Adminmodul åpnet');
            
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
            console.log('🔍 Fanger opp admin searchStatus link:', url);
            
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
    async function openInModal(url) {
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
            await resetModule();
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

            const iframe = modal.querySelector('iframe');
            modal.addEventListener('keydown', handleF5, true);
            
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
            
            console.log('✅ Adminmodul åpnet med URL:', url);
            
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
