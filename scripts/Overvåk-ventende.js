// Konfigurasjon
const CONFIG = {
    checkInterval: 10000, // Sjekk hvert 10. sekund
    enableSound: true,
    enableTitleBlink: true,
    enableNotification: true,
    enableBadge: true,
    soundVolume: 0.3 // 30% volum for diskret varsel
};

class VentendeOppdragMonitor {
    constructor() {
        this.previousCount = this.getCurrentCount();
        this.originalTitle = document.title;
        this.blinkInterval = null;
        this.soundEnabled = CONFIG.enableSound;
        
        this.init();
    }
    
    init() {
        // Be om tillatelse for notifikasjoner
        if (CONFIG.enableNotification && 'Notification' in window) {
            Notification.requestPermission();
        }
        
        // Start overvåking
        setInterval(() => this.checkForNewOrders(), CONFIG.checkInterval);
        
        console.log('Ventende oppdrag monitor startet');
    }
    
    getCurrentCount() {
        const container = document.getElementById('ventendeoppdrag');
        if (!container) return 0;
        
        // Sjekk om listen er tom
        const emptyMessage = container.querySelector('td.d center');
        if (emptyMessage && emptyMessage.textContent.includes('listen er tom')) {
            return 0;
        }
        
        // Tell antall rader (ekskluder header)
        const rows = container.querySelectorAll('tbody.scrollContent tr');
        return rows.length;
    }
    
    checkForNewOrders() {
        const currentCount = this.getCurrentCount();
        
        if (currentCount > this.previousCount) {
            const newOrders = currentCount - this.previousCount;
            this.notifyNewOrders(newOrders, currentCount);
        }
        
        // Oppdater badge selv om det ikke er nye
        if (currentCount > 0 && CONFIG.enableBadge) {
            this.updateTitleBadge(currentCount);
        } else if (currentCount === 0) {
            this.resetTitle();
        }
        
        this.previousCount = currentCount;
    }
    
    notifyNewOrders(newCount, totalCount) {
        console.log(`${newCount} ny(e) bestilling(er)! Totalt: ${totalCount}`);
        
        // 1. Blinkende fane
        if (CONFIG.enableTitleBlink) {
            this.startTitleBlink(totalCount);
        }
        
        // 2. Spill lyd
        if (CONFIG.enableSound && this.soundEnabled) {
            this.playNotificationSound();
        }
        
        // 3. Windows-notifikasjon
        if (CONFIG.enableNotification) {
            this.showDesktopNotification(newCount, totalCount);
        }
        
        // 4. Visuell indikator på siden
        this.showVisualAlert(newCount);
    }
    
    startTitleBlink(count) {
        // Stopp eksisterende blink
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
        }
        
        let isAlert = true;
        this.blinkInterval = setInterval(() => {
            if (isAlert) {
                document.title = `⚠️ (${count}) NYE BESTILLINGER!`;
            } else {
                document.title = `(${count}) ${this.originalTitle}`;
            }
            isAlert = !isAlert;
        }, 1000); // Blink hvert sekund
        
        // Stopp blink etter 30 sekunder
        setTimeout(() => {
            this.stopTitleBlink();
            this.updateTitleBadge(count);
        }, 30000);
    }
    
    stopTitleBlink() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
    }
    
    updateTitleBadge(count) {
        this.stopTitleBlink();
        document.title = `(${count}) ${this.originalTitle}`;
    }
    
    resetTitle() {
        this.stopTitleBlink();
        document.title = this.originalTitle;
    }
    
    playNotificationSound() {
        // Lag en diskret varsellyd (to korte toner)
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
        playBeep(800, now, 0.15);      // Første tone
        playBeep(1000, now + 0.2, 0.15); // Andre tone (litt høyere)
    }
    
    showDesktopNotification(newCount, totalCount) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            const notification = new Notification('Nye ventende oppdrag', {
                body: `${newCount} ny(e) bestilling(er) mottatt. Totalt: ${totalCount}`,
                icon: '/images/poster.gif', // Bruk et ikon fra systemet
                badge: '/images/poster.gif',
                tag: 'ventende-oppdrag', // Erstatter gamle notifikasjoner
                requireInteraction: false,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // Lukk automatisk etter 5 sekunder
            setTimeout(() => notification.close(), 5000);
        }
    }
    
    showVisualAlert(newCount) {
        // Fjern eksisterende alert hvis den finnes
        const existingAlert = document.getElementById('new-order-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Lag en diskret banner øverst på siden
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
        alert.innerHTML = `
            ⚠️ ${newCount} ny(e) bestilling(er) mottatt! Klikk for å lukke.
        `;
        
        // Legg til animasjon
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
        
        alert.onclick = () => {
            alert.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        };
        
        document.body.insertBefore(alert, document.body.firstChild);
        
        // Fjern automatisk etter 10 sekunder
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => alert.remove(), 300);
            }
        }, 10000);
    }
}

// Start monitoren når siden er lastet
let monitor;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        monitor = new VentendeOppdragMonitor();
    });
} else {
    monitor = new VentendeOppdragMonitor();
}

// Legg til kontroller for å skru av/på varsler
window.toggleOrderSound = function() {
    if (monitor) {
        monitor.soundEnabled = !monitor.soundEnabled;
        console.log('Lyd-varsling: ' + (monitor.soundEnabled ? 'PÅ' : 'AV'));
        return monitor.soundEnabled;
    }
};
