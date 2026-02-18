// =============================================================================
// VENTENDE OPPDRAG MONITOR 
// Overvåker nye bestillinger på ventende oppdrag og varsler med lyd, blinkende tittel, favicon-badge og desktop-notifikasjoner.
// =============================================================================

// ============================================================
// HJELPEFUNKSJON: VIS POP-UP
// ============================================================
function showMonitorPopup(isStarting) {
    const popup = document.createElement('div');
    
    if (isStarting) {
        // START-POPUP
        popup.innerHTML = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="margin: 0 0 15px 0; color: #333;">🔔 Overvåking av ventende oppdrag startet!</h2>
            
            <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
              Dette scriptet overvåker ventende oppdrag og varsler deg når nye bestillinger kommer inn.
            </div>

            <h3 style="margin: 15px 0 8px 0; color: #555;">Hvordan det fungerer:</h3>
            <div style="font-size: 13px; color: #666;">
              • Viser totalt antall bestillinger for ventende oppdrag i fanetittel<br>
              • Viser <strong style="color: #FF6600;">🟠 oransje bokmerkeikon</strong> med antall nye bestillinger<br>
              • Etter 60 sekunder uhåndtert: <strong style="color: #FF0000;">🔴 rød bokmerkeikon</strong><br>
              • Blinkende fanetittel i 30 sekunder<br>
              • Lyd-signal ved nye bestillinger<br>
              • Persistent varselbanner øverst på siden<br>
            </div>

            <h3 style="margin: 15px 0 8px 0; color: #555;">Slik bekrefter du varsler:</h3>
            <div style="font-size: 13px; color: #666;">
              • <strong>Klikk på grønn banner</strong> → Merker de nye bestillingene automatisk + nullstiller varsel, ELLER<br>
              • Planlegg en av de nye bestillingene → Nullstiller varsel automatisk
            </div>

            <div style="margin-top: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <strong>💡 Tips:</strong><br>
              • Bestillinger som var der ved oppstart gir ikke varsel<br>
              • Hvis de planlegges og kommer tilbake får du nytt varsel<br>
              • Klikk på toast-varsel merker automatisk de nye bestillingene<br>
              • Ved bytte av filter vil alle nye bestillinger gi varsel (fordi scriptet ikke kan vite om de er nylig opprettet eller ikke)
            </div>

            <div style="margin-top: 15px; padding: 12px; background: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 4px;">
              <strong>🛑 Stopp overvåking:</strong> Trykk på knappen 🔔 Overvåk-Ventende på nytt.
            </div>

            <button id="closeMonitorPopup" style="
              margin-top: 20px;
              padding: 10px 24px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              width: 100%;
            ">Lukk</button>
          </div>
        `;
    } else {
        // STOPP-POPUP
        popup.innerHTML = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
            <h2 style="margin: 0 0 15px 0; color: #333;">🛑 Overvåking stoppet</h2>
            
            <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
              Overvåking av ventende oppdrag er nå deaktivert.<br>
              Du vil ikke lenger få varsler om nye bestillinger.
            </div>

            <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
              <div style="font-size: 13px; color: #666;">
                For å starte på nytt, trykk på knappen 🔔 Overvåk-Ventende.
              </div>
            </div>

            <button id="closeMonitorPopup" style="
              margin-top: 10px;
              padding: 10px 24px;
              background: #6c757d;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
              width: 100%;
            ">Lukk</button>
          </div>
        `;
    }
    
    Object.assign(popup.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '25px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      zIndex: '999999',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    });

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '999998'
    });

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const closePopup = () => {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.removeEventListener('keydown', escHandler);
    };

    popup.querySelector('#closeMonitorPopup').onclick = closePopup;
    overlay.onclick = closePopup;

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================================
// SJEKK OM SCRIPTET ALLEREDE KJØRER
// ============================================================
if (window.ventendeMonitor) {
    // Scriptet kjører allerede - STOPP DET
    console.log('🛑 Stopper ventende oppdrag monitor...');
    
    // Sett stopp-flagg FØRST (før noe annet)
    window.ventendeMonitor.isStopped = true;
    
    if (window.ventendeMonitor.blinkInterval) {
        clearInterval(window.ventendeMonitor.blinkInterval);
    }
    if (window.ventendeMonitor.blinkTimeout) {
        clearTimeout(window.ventendeMonitor.blinkTimeout);
    }
    
    // Fjern visibility change listener
    if (window.ventendeMonitor.visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', window.ventendeMonitor.visibilityChangeHandler);
    }
    
    window.ventendeMonitor.newOrders.clear();
    document.title = window.ventendeMonitor.originalTitle;
    
    const link = document.querySelector("link[rel*='icon']");
    if (link) link.href = window.ventendeMonitor.originalFavicon;
    
    // Fjern toast-varsel hvis det finnes
    const alert = document.getElementById('new-order-alert');
    if (alert) alert.remove();
    
    delete window.ventendeMonitor;
    
    // Vis stopp-popup
    showMonitorPopup(false);
    
    console.log('✅ Overvåking stoppet');
    
    // Stopp scriptet her - ikke kjør resten
} else {
    // Scriptet kjører ikke - START DET

const CONFIG = {
    enableSound: true,              // Spill lyd ved nye bestillinger
    enableTitleBlink: true,         // Blink fanetittel
    enableFaviconBlink: true,       // Vis favicon-badge
    enableNotification: true,       // Desktop-notifikasjoner
    enableBadge: true,              // Vis antall i fanetittel
    soundVolume: 0.3,               // Lydstyrke (0-1)
    urgentThreshold: 60000          // Millisekunder før oransje → rød (60 sek = 1 min)
};

class VentendeOppdragMonitor {
    
    constructor() {
        this.originalTitle = document.title;
        this.blinkInterval = null;
        this.blinkTimeout = null;
        this.originalFavicon = this.getFaviconUrl();
        this.soundEnabled = CONFIG.enableSound;
        
        // Map for å tracke nye bestillinger: reqNr → timestamp
        this.newOrders = new Map();
        
        // Set for bestillinger ved oppstart (skal ikke gi varsel)
        this.initialOrderIds = new Set();
        
        // Set for nåværende bestillinger (oppdateres fra XHR)
        this.currentOrders = new Set();
        
        // Set for bestillinger som har blitt fjernet (men som var initielle)
        this.removedOrderIds = new Set();
        
        this.captureInitialOrders();
        
        // Flag for om brukeren har acknowledged varselet
        this.userAcknowledged = false;
        
        // Antall nye i siste varsel (for favicon)
        this.currentNewCount = 0;
        
        // Flag for om monitoren er stoppet
        this.isStopped = false;
        
        this.init();
    }
    
    init() {
        if (CONFIG.enableNotification && 'Notification' in window) {
            Notification.requestPermission();
        }
        
        // Event-drevet tilnærming: checkForChanges() kalles automatisk når NISSY refresher
        // Ingen periodisk polling nødvendig
        
        // Intercepter XMLHttpRequest for å lytte etter NISSY sin refresh
        this.setupRefreshMonitor();
        
        // Page Visibility API - Tving NISSY refresh når fanen blir aktiv
        // Lagrer handler som metode slik at vi kan fjerne den senere
        this.visibilityChangeHandler = () => {
            if (!document.hidden) {
                console.log('👁️ Fane aktivert - tvinger NISSY refresh...');
                // Tving NISSY til å refreshe alle bestillinger
                // Dette vil trigge vår XHR interceptor som automatisk parser og varsler
                if (typeof openPopp === 'function') {
                    openPopp('-1');
                } else {
                    console.warn('⚠️ openPopp funksjon ikke tilgjengelig');
                }
            }
        };
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    
    // -------------------------------------------------------------------------
    // Intercepter XHR for å oppdage når NISSY refresher
    // -------------------------------------------------------------------------
    setupRefreshMonitor() {
        const self = this;
        
        // Lagre original send hvis den ikke allerede er lagret
        if (!window.__originalXHRSend) {
            window.__originalXHRSend = XMLHttpRequest.prototype.send;
        }
        
        // Lagre original open hvis den ikke allerede er lagret
        if (!window.__originalXHROpen) {
            window.__originalXHROpen = XMLHttpRequest.prototype.open;
        }
        
        const originalOpen = window.__originalXHROpen;
        const originalSend = window.__originalXHRSend;
        
        console.log('🔧 Setter opp XHR interceptor...');
        
        // Override open for å fange URL
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._requestUrl = url;
            
            // Sjekk om dette er NISSY sin refresh
            // 1. Automatisk intern-refresh: ajax-dispatch?did=all (uten &)
            // 2. Manuell refresh (F5): ajax-dispatch?did=all&action=openres&rid=-1
            if (url.includes('ajax-dispatch?did=all')) {
                if (!url.includes('&') || url.includes('action=openres&rid=-1')) {
                    // Sjekk om monitoren fortsatt kjører før vi gjør noe
                    if (window.ventendeMonitor && !self.isStopped) {
                        this._isNissyRefresh = true;
                        const type = url.includes('action=openres') ? 'manuell' : 'automatisk';
                        console.log(`🎯 NISSY refresh-request detektert (${type}):`, url);
                    }
                }
            }
            
            return originalOpen.apply(this, [method, url, ...rest]);
        };
        
        // Override send for å lytte på respons
        XMLHttpRequest.prototype.send = function(...args) {
            if (this._isNissyRefresh) {
                // Sjekk om monitoren fortsatt kjører før vi logger
                if (window.ventendeMonitor && !self.isStopped) {
                    //console.log('📤 NISSY refresh-request sendt');
                }
                
                this.addEventListener("load", function() {
                    // Sjekk om monitoren er stoppet før vi logger eller prosesserer noe
                    if (!window.ventendeMonitor || self.isStopped) {
                        // Ingen logging - monitoren er stoppet
                        return;
                    }
                    
                    //console.log('📥 NISSY refresh-respons mottatt, status:', this.status);
                    
                    if (this.status === 200) {
                        try {
                            // Parse XML-responsen og oppdater currentOrders
                            const newOrders = self.parseOrdersFromXML(this.responseText);
                            self.currentOrders = newOrders;
                            
                            console.log(`🔄 NISSY refresh detektert (${newOrders.size} bestillinger)`);
                            
                            // Kjør umiddelbar sjekk for endringer
                            self.checkForChanges();
                        } catch (e) {
                            console.error('❌ Feil ved parsing av NISSY respons:', e);
                        }
                    }
                });
                
                this.addEventListener("error", function() {
                    // Sjekk om monitoren fortsatt kjører før vi logger
                    if (window.ventendeMonitor && !self.isStopped) {
                        console.error('❌ NISSY refresh feilet (nettverksfeil)');
                    }
                });
            }
            
            return originalSend.apply(this, args);
        };
    }
    
    // -------------------------------------------------------------------------
    // Hent initielle bestillinger (skal ikke gi varsel)
    // -------------------------------------------------------------------------
    captureInitialOrders() {
        const container = document.getElementById('ventendeoppdrag');
        if (!container) return;
        
        const rows = container.querySelectorAll('tbody.scrollContent tr[id^="V-"]');
        rows.forEach(row => {
            const reqNr = row.getAttribute('title');
            if (reqNr) {
                this.initialOrderIds.add(reqNr);
                this.currentOrders.add(reqNr);
            }
        });
        
        console.log(`📋 Registrert ${this.initialOrderIds.size} eksisterende bestillinger ved oppstart (gir ikke varsel)`);
    }
    
    // -------------------------------------------------------------------------
    // Parse bestillinger fra NISSY XHR XML-respons
    // -------------------------------------------------------------------------
    parseOrdersFromXML(xmlText) {
        const orderIds = new Set();
        
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Finn <response id="ventendeOppdrag">
            const responses = xmlDoc.getElementsByTagName('response');
            let ventendeResponse = null;
            
            for (let i = 0; i < responses.length; i++) {
                if (responses[i].getAttribute('id') === 'ventendeOppdrag') {
                    ventendeResponse = responses[i];
                    break;
                }
            }
            
            if (!ventendeResponse) return orderIds;
            
            // Hent HTML fra CDATA
            const htmlElement = ventendeResponse.getElementsByTagName('html')[0];
            if (!htmlElement) return orderIds;
            
            const htmlContent = htmlElement.textContent;
            
            // Parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Finn alle <tr id="V-..."> og hent title attributt
            const rows = tempDiv.querySelectorAll('tr[id^="V-"]');
            rows.forEach(row => {
                const reqNr = row.getAttribute('title');
                if (reqNr) {
                    orderIds.add(reqNr);
                }
            });
            
        } catch (e) {
            console.error('❌ Feil ved parsing av XML:', e);
        }
        
        return orderIds;
    }
    
    // -------------------------------------------------------------------------
    // Hent nåværende bestillinger fra DOM
    // -------------------------------------------------------------------------
    getCurrentOrders() {
        const container = document.getElementById('ventendeoppdrag');
        if (!container) return new Set();
        
        const currentIds = new Set();
        const rows = container.querySelectorAll('tbody.scrollContent tr[id^="V-"]');
        
        rows.forEach(row => {
            const reqNr = row.getAttribute('title');
            if (reqNr) {
                currentIds.add(reqNr);
            }
        });
        
        return currentIds;
    }
    
    // -------------------------------------------------------------------------
    // Sjekk for endringer
    // -------------------------------------------------------------------------
    checkForChanges() {
        // Bruk cached data fra XHR i stedet for å lese fra DOM
        let currentIds = this.currentOrders;
        
        // FALLBACK: Hvis currentOrders er tom (XHR har ikke fanget opp data ennå),
        // les fra DOM i stedet
        if (currentIds.size === 0) {
            currentIds = this.getCurrentOrders();
            if (currentIds.size > 0) {
                console.log('⚠️ Fallback: Leser fra DOM (XHR har ikke oppdatert ennå)');
                this.currentOrders = currentIds;
            }
        }
        
        const currentCount = currentIds.size;
        
        // FØRST: Track hvilke initielle bestillinger som er borte (så de kan gi varsel hvis de kommer tilbake)
        this.initialOrderIds.forEach(reqNr => {
            if (!currentIds.has(reqNr) && !this.removedOrderIds.has(reqNr)) {
                // Initial bestilling er nå borte
                this.removedOrderIds.add(reqNr);
                console.log(`📤 Initial bestilling fjernet: ${reqNr} (vil gi varsel hvis den kommer tilbake)`);
            }
        });
        
        // SÅ: Finn NYE bestillinger
        // En bestilling er "ny" hvis:
        // 1. Den er HELT ny (ikke i initialOrderIds), ELLER
        // 2. Den var initial, ble fjernet, og er nå tilbake (i removedOrderIds)
        const newlyAdded = [];
        currentIds.forEach(reqNr => {
            if (!this.newOrders.has(reqNr)) {
                // Ikke allerede tracket som ny
                
                if (!this.initialOrderIds.has(reqNr)) {
                    // HELT NY bestilling (aldri sett før)
                    this.newOrders.set(reqNr, Date.now());
                    newlyAdded.push(reqNr);
                    console.log(`✨ Ny bestilling detektert: ${reqNr}`);
                } else if (this.removedOrderIds.has(reqNr)) {
                    // TILBAKE fra pågående (var initial, ble fjernet, er nå tilbake)
                    this.newOrders.set(reqNr, Date.now());
                    this.removedOrderIds.delete(reqNr); // Ikke lenger "removed"
                    newlyAdded.push(reqNr);
                    console.log(`🔄 Bestilling tilbake på ventende: ${reqNr}`);
                }
                // Ellers: var initial og har vært her hele tiden → INGEN varsel
            }
        });
        
        // Fjern håndterte NYE bestillinger fra tracking
        const removed = [];
        this.newOrders.forEach((timestamp, reqNr) => {
            if (!currentIds.has(reqNr)) {
                removed.push(reqNr);
            }
        });
        
        // Hvis bruker har håndtert noen av de nye bestillingene
        if (removed.length > 0 && !this.userAcknowledged) {
            console.log(`✅ ${removed.length} ny(e) bestilling(er) håndtert - nullstiller varsel`);
            this.acknowledgeNewOrders();
        }
        
        removed.forEach(reqNr => {
            this.newOrders.delete(reqNr);
            console.log(`✅ Ny bestilling ${reqNr} håndtert og fjernet fra tracking`);
        });
        
        // Varsle om nye bestillinger
        if (newlyAdded.length > 0) {
            console.log(`🔔 ${newlyAdded.length} ny(e) bestilling(er) detektert:`, newlyAdded);
            
            // Hvis det allerede er et aktivt varsel, akkumuler antallet
            if (!this.userAcknowledged && this.currentNewCount > 0) {
                this.currentNewCount += newlyAdded.length;
                console.log(`⚠️ Varsel oppdatert: Nå totalt ${this.currentNewCount} uhåndterte nye bestillinger`);
            } else {
                this.currentNewCount = newlyAdded.length;
                this.userAcknowledged = false; // Reset ved nye bestillinger
            }
            
            // Send totalt antall uhåndterte nye bestillinger
            this.notifyNewOrders(this.currentNewCount, currentCount);
        }
        
        // Oppdater tittel med totalt antall bestillinger
        if (CONFIG.enableBadge) {
            if (currentCount >= 0) {
                document.title = `(${currentCount}) ${this.originalTitle}`;
            } else {
                document.title = this.originalTitle;
            }
        }
        
        // Oppdater favicon basert på nye bestillinger og urgency
        if (CONFIG.enableFaviconBlink) {
            if (this.currentNewCount > 0 && !this.userAcknowledged) {
                // Sjekk om noen bestillinger har blitt urgent
                const isUrgent = this.hasUrgentOrders();
                
                if (!this.blinkInterval) {
                    // Ikke i blink-modus, vis statisk badge
                    this.setFavicon(
                        isUrgent 
                            ? this.createAlertFavicon(this.currentNewCount) 
                            : this.createBadgeFavicon(this.currentNewCount)
                    );
                }
            } else {
                // Bruker has acknowledged ELLER ingen nye bestillinger
                this.setFavicon(this.originalFavicon);
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // Merk nye bestillinger på ventende oppdrag
    // -------------------------------------------------------------------------
    selectNewOrders() {
        const container = document.getElementById('ventendeoppdrag');
        if (!container) {
            console.warn('⚠️ Kunne ikke finne ventendeoppdrag-container');
            return 0;
        }
        
        let selectedCount = 0;
        
        // Gå gjennom alle nye bestillinger
        this.newOrders.forEach((timestamp, reqNr) => {
            // Finn <tr> med title=reqNr
            const row = container.querySelector(`tr[title="${reqNr}"]`);
            if (row) {
                const rowId = row.getAttribute('id'); // Format: V-18787423
                if (rowId && typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
                    // Kall selectRow for å merke raden
                    selectRow(rowId, g_voppLS);
                    selectedCount++;
                    console.log(`✓ Merket bestilling: ${reqNr} (${rowId})`);
                } else {
                    console.warn(`⚠️ Kunne ikke merke bestilling ${reqNr} - mangler ID eller selectRow-funksjon`);
                }
            } else {
                console.warn(`⚠️ Kunne ikke finne rad for bestilling ${reqNr}`);
            }
        });
        
        if (selectedCount > 0) {
            console.log(`✅ Merket ${selectedCount} nye bestilling(er)`);
        }
        
        return selectedCount;
    }
    
    // -------------------------------------------------------------------------
    // Bruker har acknowledged de nye bestillingene
    // -------------------------------------------------------------------------
    acknowledgeNewOrders(selectOrders = false) {
        // Merk bestillingene først hvis forespurt
        if (selectOrders) {
            this.selectNewOrders();
        }
        
        this.userAcknowledged = true;
        this.currentNewCount = 0;
        
        // Flytt acknowledged bestillinger til initialOrderIds så de ikke blir "nye" igjen
        this.newOrders.forEach((timestamp, reqNr) => {
            this.initialOrderIds.add(reqNr);
            console.log(`📌 Flyttet ${reqNr} til initial tracking (acknowledged)`);
        });
        
        // Clear alle nye bestillinger siden brukeren har acknowledged
        this.newOrders.clear();
        
        // Fjern popup
        const existingAlert = document.getElementById('new-order-alert');
        if (existingAlert) {
            existingAlert.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => existingAlert.remove(), 300);
        }
        
        // Fjern favicon
        this.setFavicon(this.originalFavicon);
        
        // Stopp blink
        this.stopBlinking();
        
        console.log('👍 Bruker har acknowledged nye bestillinger');
    }
    
    // -------------------------------------------------------------------------
    // Sjekk om noen bestillinger har passert urgent threshold
    // -------------------------------------------------------------------------
    hasUrgentOrders() {
        const now = Date.now();
        for (let [reqNr, timestamp] of this.newOrders) {
            if (now - timestamp >= CONFIG.urgentThreshold) {
                return true;
            }
        }
        return false;
    }
    
    // -------------------------------------------------------------------------
    // Varsle om nye bestillinger
    // -------------------------------------------------------------------------
    notifyNewOrders(newCount, totalCount) {
        // Blinkende tittel + favicon
        if (CONFIG.enableTitleBlink || CONFIG.enableFaviconBlink) {
            this.startBlinking(newCount);
        }
        
        // Lyd
        if (CONFIG.enableSound && this.soundEnabled) {
            this.playNotificationSound();
        }
        
        // Desktop-notifikasjon
        if (CONFIG.enableNotification) {
            this.showDesktopNotification(newCount, totalCount);
        }
        
        // Visuell banner (PERSISTENT - ingen auto-fade)
        this.showVisualAlert(newCount);
    }
    
    // -------------------------------------------------------------------------
    // Blinkende tittel (30 sekunder)
    // -------------------------------------------------------------------------
    startBlinking(newCount) {
        // Stopp eksisterende blinking først
        this.stopBlinking();
        
        // START MED ORANSJE FAVICON (nye bestillinger, ikke urgent ennå)
        if (CONFIG.enableFaviconBlink) {
            this.setFavicon(this.createBadgeFavicon(newCount));
        }
        
        // Start blinkende tittel (viser antallet nye)
        let isAlert = true;
        if (CONFIG.enableTitleBlink) {
            // Sett initial tittel til alert-tilstand
            document.title = `⚠️ ${newCount} NYE BESTILLINGER!`;
            
            // Start interval
            this.blinkInterval = setInterval(() => {
                if (isAlert) {
                    document.title = `⚠️ ${newCount} NYE BESTILLINGER!`;
                } else {
                    document.title = `(${this.currentOrders.size}) ${this.originalTitle}`;
                }
                isAlert = !isAlert;
            }, 1000);
        }
        
        // Clear eksisterende timeout hvis den finnes
        if (this.blinkTimeout) {
            clearTimeout(this.blinkTimeout);
        }
        
        // Stopp blink etter 30 sekunder
        this.blinkTimeout = setTimeout(() => {
            this.stopBlinking();
        }, 30000);
    }
    
    stopBlinking() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        if (this.blinkTimeout) {
            clearTimeout(this.blinkTimeout);
            this.blinkTimeout = null;
        }
    }
    
    // -------------------------------------------------------------------------
    // FAVICON-FUNKSJONER
    // -------------------------------------------------------------------------
    getFaviconUrl() {
        const link = document.querySelector("link[rel*='icon']");
        return link ? link.href : null;
    }
    
    setFavicon(url) {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;
    }
    
    createAlertFavicon(count) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // RØD sirkel (URGENT - har ligget lenge)
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, 2 * Math.PI);
        ctx.fill();
        
        // Hvit kant
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Hvitt tall
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 9 ? '9+' : count.toString(), 16, 17);
        
        return canvas.toDataURL();
    }
    
    createBadgeFavicon(count) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // ORANSJE sirkel (nye bestillinger, ikke urgent ennå)
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, 2 * Math.PI);
        ctx.fill();
        
        // Hvit kant
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Hvitt tall
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 9 ? '9+' : count.toString(), 16, 17);
        
        return canvas.toDataURL();
    }
    
    // -------------------------------------------------------------------------
    // Lyd-varsel
    // -------------------------------------------------------------------------
    playNotificationSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playBeep = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(CONFIG.soundVolume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        playBeep(800, now, 0.15);
        playBeep(1000, now + 0.2, 0.15);
    }
    
    // -------------------------------------------------------------------------
    // Desktop-notifikasjon
    // -------------------------------------------------------------------------
    showDesktopNotification(newCount, totalCount) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            const notification = new Notification('Nye ventende oppdrag', {
                body: `${newCount} ny(e) bestilling(er) mottatt. Totalt: ${totalCount}`,
                tag: 'ventende-oppdrag',
                requireInteraction: false,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 5000);
        }
    }
    
    // -------------------------------------------------------------------------
    // Visuell banner (PERSISTENT - fade kun ved klikk/håndtering)
    // -------------------------------------------------------------------------
    showVisualAlert(newCount) {
        // Fjern eksisterende alert - ny alert vises med oppdatert tall
        const existingAlert = document.getElementById('new-order-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.id = 'new-order-alert';
        alert.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(to right, #4CAF50, #45a049);
            color: white;
            padding: 12px 20px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideDown 0.3s ease-out;
            cursor: pointer;
        `;
        alert.innerHTML = `⚠️ ${newCount} ny(e) bestilling(er) mottatt! Klikk her for å bekrefte og merke.`;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Klikk på popup = acknowledge OG merk bestillinger
        alert.onclick = () => {
            this.acknowledgeNewOrders(true);  // true = merk bestillingene
        };
        
        document.body.insertBefore(alert, document.body.firstChild);
        
        // INGEN auto-fade! Kun ved klikk eller håndtering
    }
}

// Start monitor
window.ventendeMonitor = new VentendeOppdragMonitor();

window.stopMonitor = function() {
    if (window.ventendeMonitor) {
        // Sett stopp-flagg FØRST (før noe annet)
        window.ventendeMonitor.isStopped = true;
        
        if (window.ventendeMonitor.blinkInterval) {
            clearInterval(window.ventendeMonitor.blinkInterval);
        }
        if (window.ventendeMonitor.blinkTimeout) {
            clearTimeout(window.ventendeMonitor.blinkTimeout);
        }
        
        // Fjern visibility change listener
        if (window.ventendeMonitor.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', window.ventendeMonitor.visibilityChangeHandler);
        }
        
        window.ventendeMonitor.newOrders.clear();
        document.title = window.ventendeMonitor.originalTitle;
        const link = document.querySelector("link[rel*='icon']");
        if (link) link.href = window.ventendeMonitor.originalFavicon;
        
        // Fjern toast-varsel
        const alert = document.getElementById('new-order-alert');
        if (alert) alert.remove();
        
        console.log('❌ Overvåking stoppet');
        delete window.ventendeMonitor;
        
        // Vis stopp-popup
        showMonitorPopup(false);
    }
};

// Vis informasjons-popup ved start
setTimeout(() => {
    showMonitorPopup(true);
    
    // Tving NISSY refresh for å få riktig antall bestillinger fra starten
    // Dette sikrer at fanetittelen viser korrekt antall (som popup-en beskriver)
    setTimeout(() => {
        if (typeof openPopp === 'function') {
            console.log('🔄 Tvinger initial NISSY refresh for å oppdatere fanetittel...');
            openPopp('-1');
        }
    }, 1000); // Venter 1 sek slik at popup rekker å vises først
}, 500);

console.log(`✅ Overvåking av ventende oppdrag startet!

Event-drevet overvåking:
- Parser bestillinger direkte fra NISSY sin XHR-respons (XML)
- Overvåker både automatisk intern-refresh og manuell refresh (F5)
- Varsler umiddelbart når NISSY refresher (ingen polling)
- Sjekker også når fanen blir aktiv igjen (Page Visibility API)
- Fungerer pålitelig selv når fanen er inaktiv

Kjør stopMonitor() for å stoppe.`);

} // Slutt på else-blokk fra linje 184