// ============================================================
// Samkjøringsforslag-script 
// Ser etter potensielle samkjøringskandidater for merkede bestillinger
// Snarvei: Alt+X
// ============================================================

(function() {
    'use strict';
    
    // Sjekk om scriptet allerede er lastet
    if (window.nissySamkjoringLoaded) {
        console.log('⚠️ NISSY Samkjøringsforslag er allerede aktivt.');
        return;
    }
    
    // Marker scriptet som lastet
    window.nissySamkjoringLoaded = true;

    // ============================================================
    // FEILMELDING-TOAST: Vises nederst på skjermen (rød bakgrunn)
    // ============================================================
    let currentErrorToast = null;
    
    function showErrorToast(msg) {
        // Fjern eksisterende feilmelding-toast
        if (currentErrorToast && currentErrorToast.parentNode) {
            currentErrorToast.parentNode.removeChild(currentErrorToast);
        }
        
        const toast = document.createElement("div");
        toast.textContent = msg;
        
        // Styling
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#d9534f", // Rød bakgrunn for feil
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            fontFamily: "Arial, sans-serif",
            zIndex: "999999",
            opacity: "0",
            transition: "opacity 0.3s ease"
        });
        
        document.body.appendChild(toast);
        currentErrorToast = toast;
        
        // Fade in
        setTimeout(() => {
            toast.style.opacity = "1";
        }, 10);
        
        // Fade out etter 4 sekunder
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                if (currentErrorToast === toast) {
                    currentErrorToast = null;
                }
            }, 300);
        }, 4000);
    }

    // Konstanter for tidsjusteringer
    const SHORT_DISTANCE_POSTNR_DIFF = 30;
    const SHORT_DISTANCE_TIME_BUFFER = 30; // minutter
    const LONG_DISTANCE_TIME_BUFFER = 120; // minutter (2 timer)

    // ============================================================
    // BLOKKERINGS-LISTE: Postnummer-kombinasjoner som ALDRI skal matches
    // ============================================================
    // Format: [postnr1, postnr2] - rekkefølge spiller ingen rolle
    const BLOCKED_POSTNR_COMBINATIONS = [
        [7760, 7740],  // Eksempel: 7760 og 7740 skal aldri samkjøres
        // Legg til flere her:
        // [7800, 7850],
        // [7600, 7650],
    ];

    // Funksjon for å sjekke om en postnummer-kombinasjon er blokkert
    function isBlockedCombination(postnr1, postnr2) {
        if (!postnr1 || !postnr2) return false;
        
        return BLOCKED_POSTNR_COMBINATIONS.some(([a, b]) => 
            (postnr1 === a && postnr2 === b) || (postnr1 === b && postnr2 === a)
        );
    }

    // Funksjon for å velge ressurs og merke bestilling
    function selectResourceAndBooking(ventendeId, resourceId) {
        try {
            // Clear alle selections først
            if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
                ListSelectionGroup.clearAllSelections();
            }
            
            // Merk ventende bestilling
            const ventendeRow = document.getElementById('V-' + ventendeId);
            if (ventendeRow && typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
                selectRow('V-' + ventendeId, g_voppLS);
            }
            
            // Merk pågående ressurs
            const resourceRow = document.getElementById('P-' + resourceId);
            if (resourceRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                selectRow('P-' + resourceId, g_poppLS);
            }
            
            return true;
        } catch (error) {
            console.error('Feil ved merking:', error);
            return false;
        }
    }
    function parsePostnummer(address) {
        if (!address) return null;
        
        // Postnummer er alltid etter siste komma
        const parts = address.split(',');
        const lastPart = parts[parts.length - 1].trim();
        
        // Finn 4-sifret postnummer i siste del
        const match = lastPart.match(/\b(\d{4})\b/);
        return match ? parseInt(match[1]) : null;
    }

    // Funksjon for å parse dato og tid
    function parseDateTime(dateTimeStr) {
        if (!dateTimeStr) return null;
        
        const cleaned = dateTimeStr.trim();
        
        // Format med dato: "30.01 16:06"
        const dateTimeMatch = cleaned.match(/(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
        if (dateTimeMatch) {
            const [, day, month, hour, minute] = dateTimeMatch;
            const year = new Date().getFullYear();
            return new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        }
        
        // Format kun tid (dagens dato): "23:06"
        const timeOnlyMatch = cleaned.match(/^(\d{2}):(\d{2})$/);
        if (timeOnlyMatch) {
            const [, hour, minute] = timeOnlyMatch;
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));
        }
        
        return null;
    }

    // Funksjon for å normalisere returtider
    // Hvis levertid er før hentetid = dårlig data, behandle som retur (samme tid)
    function normalizeReturnTrip(order) {
        if (!order.startDateTime || !order.treatmentDateTime) return order;
        
        // Hvis levertid er før hentetid, sett begge til hentetid (retur)
        if (order.treatmentDateTime < order.startDateTime) {
            return {
                ...order,
                treatmentDateTime: order.startDateTime,
                isReturnTrip: true
            };
        }
        
        // Hvis hentetid og levertid er identiske, marker som retur
        if (order.startDateTime.getTime() === order.treatmentDateTime.getTime()) {
            return {
                ...order,
                isReturnTrip: true
            };
        }
        
        return order;
    }

    // Funksjon for å hente merkede bestillinger fra ventende oppdrag
    function getSelectedVentendeOppdrag() {
        const selected = [];
        // Merkede rader har inline style med background-color: rgb(148, 169, 220)
        const rows = document.querySelectorAll('#ventendeoppdrag tbody tr');
        
        rows.forEach(row => {
            // Sjekk om raden har riktig bakgrunnsfarge (merket)
            const bgColor = row.style.backgroundColor;
            if (bgColor !== 'rgb(148, 169, 220)') return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return;
            
            const patientName = cells[1].textContent.trim();
            const tripStartTime = cells[2].textContent.trim();
            const tripTreatmentTime = cells[3].textContent.trim();
            const fromAddress = cells[6].innerHTML.split('<br>')[0].trim();
            const toAddress = cells[6].innerHTML.split('<br>')[1]?.trim() || '';
            
            const reqId = row.getAttribute('name') || row.id.replace('V-', '');
            const rowId = row.id.replace('V-', '');
            
            const order = {
                id: reqId,
                rowId: rowId,
                patientName,
                tripStartTime,
                tripTreatmentTime,
                fromAddress,
                toAddress,
                postnrHent: parsePostnummer(fromAddress),
                postnrLever: parsePostnummer(toAddress),
                startDateTime: parseDateTime(tripStartTime),
                treatmentDateTime: parseDateTime(tripTreatmentTime)
            };
            
            selected.push(normalizeReturnTrip(order));
        });
        
        return selected;
    }

    // Funksjon for å hente alle pågående oppdrag
    function getPaagaendeOppdrag() {
        const oppdrag = [];
        const rows = document.querySelectorAll('#pagaendeoppdrag tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 11) return;
            
            const resource = cells[1].textContent.trim();
            const rowId = row.id.replace('P-', '');
            
            // Sjekk om ressursen har flere bestillinger (row-image divs)
            const rowImageDivs = cells[3].querySelectorAll('div.row-image');
            
            if (rowImageDivs.length > 0) {
                // Ressurs med flere bestillinger
                rowImageDivs.forEach((div, index) => {
                    const tripStartTime = cells[3].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const tripTreatmentTime = cells[4].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const patientName = cells[5].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const fromAddress = cells[8].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const toAddress = cells[9].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const status = cells[10].querySelectorAll('div.row-image')[index]?.textContent.trim();
                    
                    const reqId = rowId + '-' + index;
                    
                    const order = {
                        id: reqId,
                        rowId: rowId,
                        resource,
                        patientName,
                        tripStartTime,
                        tripTreatmentTime,
                        fromAddress,
                        toAddress,
                        status,
                        postnrHent: parsePostnummer(fromAddress),
                        postnrLever: parsePostnummer(toAddress),
                        startDateTime: parseDateTime(tripStartTime),
                        treatmentDateTime: parseDateTime(tripTreatmentTime),
                        multiBooking: true,
                        bookingIndex: index + 1,
                        totalBookings: rowImageDivs.length
                    };
                    
                    oppdrag.push(normalizeReturnTrip(order));
                });
            } else {
                // Ressurs med én bestilling
                const tripStartTime = cells[3].textContent.trim();
                const tripTreatmentTime = cells[4].textContent.trim();
                const patientName = cells[5].textContent.trim();
                const fromAddress = cells[8].textContent.trim();
                const toAddress = cells[9].textContent.trim();
                const status = cells[10].textContent.trim();
                
                const order = {
                    id: rowId,
                    rowId: rowId,
                    resource,
                    patientName,
                    tripStartTime,
                    tripTreatmentTime,
                    fromAddress,
                    toAddress,
                    status,
                    postnrHent: parsePostnummer(fromAddress),
                    postnrLever: parsePostnummer(toAddress),
                    startDateTime: parseDateTime(tripStartTime),
                    treatmentDateTime: parseDateTime(tripTreatmentTime),
                    multiBooking: false
                };
                
                oppdrag.push(normalizeReturnTrip(order));
            }
        });
        
        return oppdrag;
    }

    // Funksjon for å sjekke om to bestillinger kan samkjøres
    function checkSamkjoring(ventende, pagaende) {
        // ============================================================
        // BLOKKERINGS-SJEKK: Sjekk om postnummer-kombinasjoner er blokkert
        // ============================================================
        // Sjekk alle fire kombinasjoner (hent-hent, hent-lever, lever-hent, lever-lever)
        if (isBlockedCombination(ventende.postnrHent, pagaende.postnrHent) ||
            isBlockedCombination(ventende.postnrHent, pagaende.postnrLever) ||
            isBlockedCombination(ventende.postnrLever, pagaende.postnrHent) ||
            isBlockedCombination(ventende.postnrLever, pagaende.postnrLever)) {
            const debug = true;
            if (debug) {
                console.log('=== checkSamkjoring ===');
                console.log('Ventende:', ventende.postnrHent, '→', ventende.postnrLever, ventende.tripStartTime);
                console.log('Ressurs:', pagaende.postnrHent, '→', pagaende.postnrLever, pagaende.tripStartTime);
                console.log('🚫 BLOKKERT: Denne postnummer-kombinasjonen er på blokkeringslisten');
            }
            return null;
        }
        
        // DEBUG logging
        const debug = true; // Sett til true for å aktivere logging
        if (debug) {
            console.log('\n=== checkSamkjoring ===');
            console.log('Ventende:', ventende.postnrHent, '→', ventende.postnrLever, ventende.tripStartTime);
            console.log('Ressurs:', pagaende.postnrHent, '→', pagaende.postnrLever, pagaende.tripStartTime);
        }
        
        // Sjekk om postnummer matcher eksakt
        if (ventende.postnrHent !== pagaende.postnrHent || 
            ventende.postnrLever !== pagaende.postnrLever) {
            if (debug) console.log('→ Postnr matcher ikke eksakt, sjekker alternativer...');
            
            // Sjekk returutnyttelse (motsatt rute)
            const returMatch = checkReturutnyttelse(ventende, pagaende);
            if (returMatch) {
                if (debug) console.log('✓ Match funnet: RETURUTNYTTELSE');
                return returMatch;
            }
            
            // Sjekk på-vei-forbi (samme retning, ventende er på veien)
            const paaVeiMatch = checkPaaVeiForbi(ventende, pagaende);
            if (paaVeiMatch) {
                if (debug) console.log('✓ Match funnet: PAA-VEI-FORBI');
            } else {
                if (debug) console.log('✗ Ingen match');
            }
            return paaVeiMatch;
        }

        if (debug) console.log('→ Postnr matcher eksakt, sjekker direkte samkjøring...');

        // Beregn postnummer-differanse for å bestemme tidsbuffer
        const postnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
        const timeBuffer = postnrDiff < SHORT_DISTANCE_POSTNR_DIFF 
            ? SHORT_DISTANCE_TIME_BUFFER 
            : LONG_DISTANCE_TIME_BUFFER;

        // For returer: sammenlign hentetid med hentetid (behandlingstid er samme som hentetid)
        const ventendeCompareTime = ventende.isReturnTrip ? ventende.startDateTime : ventende.startDateTime;
        const pagaendeCompareTime = pagaende.isReturnTrip ? pagaende.startDateTime : pagaende.startDateTime;

        if (pagaendeCompareTime && ventendeCompareTime) {
            const timeDiffMinutes = (pagaendeCompareTime - ventendeCompareTime) / (1000 * 60);
            
            // Sjekk begge retninger:
            // 1. Pågående starter ETTER ventende (pågående kan forskyves fremover)
            // 2. Pågående starter FØR ventende (pågående kan forskyves bakover)
            const absTimeDiff = Math.abs(timeDiffMinutes);
            
            if (absTimeDiff <= timeBuffer) {
                if (debug) console.log('✓ Match funnet: DIREKTE SAMKJØRING, tidsdiff:', absTimeDiff, 'min');
                
                let matchType = 'samkjøring';
                let direction = '';
                
                if (timeDiffMinutes > 0) {
                    direction = 'fremover'; // Pågående starter senere, kan forskyves fremover
                } else if (timeDiffMinutes < 0) {
                    direction = 'bakover'; // Pågående starter tidligere, kan forskyves bakover
                } else {
                    direction = 'identisk'; // Samme starttid
                }
                
                return {
                    type: matchType,
                    timeDiff: Math.round(timeDiffMinutes),
                    absTimeDiff: Math.round(absTimeDiff),
                    direction: direction,
                    score: 100 - absTimeDiff // Høyere score for mindre tidsdifferanse
                };
            }
        }

        if (debug) console.log('✗ Ingen match');
        return null;
    }

    // Funksjon for å sjekke om ventende bestilling er på veien til pågående
    function checkPaaVeiForbi(ventende, pagaende) {
        // ============================================================
        // SCENARIO 1A: Nært hente OG leveringssted (±10 postnr begge steder)
        // ============================================================
        const leverPostnrDiff = Math.abs(ventende.postnrLever - pagaende.postnrLever);
        const hentePostnrDiff = Math.abs(ventende.postnrHent - pagaende.postnrHent);
        
        if (leverPostnrDiff <= 10 && hentePostnrDiff <= 10) {
            // Sjekk om begge reiser i samme retning (nord eller sør)
            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
            const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
            
            if (pagaendeRetning !== ventendeRetning) {
                return null;
            }
            
            // Sjekk tidsmessig kompatibilitet
            if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime) {
                const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                const leverDiff = (pagaende.treatmentDateTime - ventende.startDateTime) / (1000 * 60);
                
                // Pågående må starte før ventende (eller maks 30 min etter)
                // Ventende må hentes før pågående leverer
                if (startDiff >= -30 && leverDiff >= 0) {
                    return {
                        type: 'samkjøring',
                        timeDiff: Math.round(startDiff),
                        absTimeDiff: Math.abs(Math.round(startDiff)),
                        direction: pagaendeRetning,
                        score: 70 - Math.abs(startDiff)
                    };
                }
                
                // For lange turer - sjekk tidsvindu-overlapp
                const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
                const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
                
                if (ventendePostnrDiff >= SHORT_DISTANCE_POSTNR_DIFF && pagaendePostnrDiff >= SHORT_DISTANCE_POSTNR_DIFF) {
                    // Begge er lange turer: Sjekk retning også her
                    const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                    const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                    
                    // Må reise i samme retning
                    if (pagaendeRetning !== ventendeRetning) {
                        return null;
                    }
                    
                    // Beregn tidsvinduer
                    const ventendeTidligst = new Date(ventende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                    const ventendeSenest = ventende.treatmentDateTime;
                    
                    const pagaendeTidligst = new Date(pagaende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                    const pagaendeSenest = pagaende.treatmentDateTime;
                    
                    // Sjekk om tidsvinduer overlapper
                    const overlapper = ventendeTidligst <= pagaendeSenest && pagaendeTidligst <= ventendeSenest;
                    
                    if (overlapper && pagaende.startDateTime <= ventende.startDateTime) {
                        const overlapStart = ventendeTidligst > pagaendeTidligst ? ventendeTidligst : pagaendeTidligst;
                        const overlapEnd = ventendeSenest < pagaendeSenest ? ventendeSenest : pagaendeSenest;
                        const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                        
                        if (overlapMinutter >= 30) {
                            const tidDiffFraOptimal = Math.abs((pagaende.treatmentDateTime - ventende.treatmentDateTime) / (1000 * 60));
                            
                            return {
                                type: 'samkjøring',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.round(tidDiffFraOptimal),
                                direction: pagaendeRetning,
                                score: 65 - (tidDiffFraOptimal / 4)
                            };
                        }
                    }
                }
            }
        }
        
        // ============================================================
        // SCENARIO 1B: Kun nært leveringssted (±10 postnr) - lange turer samme retning
        // Forskjellige hentesteder, men begge lange turer til nær samme sted
        // ============================================================
        if (leverPostnrDiff <= 10 && hentePostnrDiff > 10) {
            const debug = true; // Sett til true for logging
            if (debug) console.log('→ SCENARIO 1B: Kun nært leveringssted');
            
            const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
            const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
            
            if (debug) {
                console.log('  Ventende postnr-diff:', ventendePostnrDiff);
                console.log('  Ressurs postnr-diff:', pagaendePostnrDiff);
            }
            
            // Begge må være lange turer
            if (ventendePostnrDiff >= SHORT_DISTANCE_POSTNR_DIFF && pagaendePostnrDiff >= SHORT_DISTANCE_POSTNR_DIFF) {
                // Sjekk om begge reiser i samme retning (nord eller sør)
                const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                
                if (debug) {
                    console.log('  Ventende retning:', ventendeRetning);
                    console.log('  Ressurs retning:', pagaendeRetning);
                    console.log('  Samme retning?', pagaendeRetning === ventendeRetning);
                }
                
                if (pagaendeRetning === ventendeRetning) {
                    // Beregn tidsvinduer
                    if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime && ventende.treatmentDateTime) {
                        const ventendeTidligst = new Date(ventende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const ventendeSenest = ventende.treatmentDateTime;
                        
                        const pagaendeTidligst = new Date(pagaende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const pagaendeSenest = pagaende.treatmentDateTime;
                        
                        // Sjekk om tidsvinduer overlapper
                        const overlapper = ventendeTidligst <= pagaendeSenest && pagaendeTidligst <= ventendeSenest;
                        
                        if (debug) console.log('  Tidsvinduer overlapper?', overlapper);
                        
                        if (overlapper) {
                            const overlapStart = ventendeTidligst > pagaendeTidligst ? ventendeTidligst : pagaendeTidligst;
                            const overlapEnd = ventendeSenest < pagaendeSenest ? ventendeSenest : pagaendeSenest;
                            const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                            
                            if (debug) console.log('  Overlapp minutter:', overlapMinutter);
                            
                            // Krev minst 30 min overlapp
                            if (overlapMinutter >= 30) {
                                const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                                const tidDiffFraOptimal = Math.abs((pagaende.treatmentDateTime - ventende.treatmentDateTime) / (1000 * 60));
                                
                                if (debug) console.log('✓ MATCH i SCENARIO 1B');
                                
                                return {
                                    type: 'samkjøring',
                                    timeDiff: Math.round(startDiff),
                                    absTimeDiff: Math.round(tidDiffFraOptimal),
                                    direction: startDiff > 0 ? 'fremover' : (startDiff < 0 ? 'bakover' : 'identisk'),
                                    score: 100 - tidDiffFraOptimal // Høyere score siden de skal til samme sted
                                };
                            } else {
                                if (debug) console.log('  Overlapp for liten (<30 min)');
                            }
                        }
                    }
                } else {
                    if (debug) console.log('  Forskjellig retning - ingen match');
                }
            } else {
                if (debug) console.log('  Ikke begge lange turer - ingen match i 1B');
            }
        }
        
        // ============================================================
        // SCENARIO 1C: Nært hente- og leveringssted (±10 postnr begge) - korte turer
        // For korte turer der både hentested og leveringssted er nært hverandre
        // ============================================================
        if (leverPostnrDiff <= 10 && hentePostnrDiff <= 10) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1C: Nært hente- og leveringssted (korte turer)');
            
            const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
            const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
            
            if (debug) {
                console.log('  Ventende postnr-diff:', ventendePostnrDiff);
                console.log('  Ressurs postnr-diff:', pagaendePostnrDiff);
            }
            
            // Sjekk om begge er korte turer
            if (ventendePostnrDiff < SHORT_DISTANCE_POSTNR_DIFF && pagaendePostnrDiff < SHORT_DISTANCE_POSTNR_DIFF) {
                // Sjekk om begge reiser i samme retning
                const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                
                if (debug) {
                    console.log('  Ventende retning:', ventendeRetning);
                    console.log('  Ressurs retning:', pagaendeRetning);
                    console.log('  Samme retning?', pagaendeRetning === ventendeRetning);
                }
                
                if (pagaendeRetning === ventendeRetning) {
                    // For korte turer: Bruk 30 min tidsvindu
                    if (pagaende.startDateTime && ventende.startDateTime) {
                        const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                        
                        if (debug) console.log('  Startdiff:', startDiff, 'min');
                        
                        // Tillat ±30 min forskjell
                        if (Math.abs(startDiff) <= SHORT_DISTANCE_TIME_BUFFER) {
                            if (debug) console.log('✓ MATCH i SCENARIO 1C');
                            
                            return {
                                type: 'samkjøring',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.abs(Math.round(startDiff)),
                                direction: startDiff > 0 ? 'fremover' : (startDiff < 0 ? 'bakover' : 'identisk'),
                                score: 100 - Math.abs(startDiff)
                            };
                        } else {
                            if (debug) console.log('  Tidsdiff for stor (>' + SHORT_DISTANCE_TIME_BUFFER + ' min)');
                        }
                    }
                } else {
                    if (debug) console.log('  Forskjellig retning - ingen match');
                }
            } else {
                if (debug) console.log('  Ikke begge korte turer - prøver scenario 1A (lang tur logikk)');
            }
        }
        
        // ============================================================
        // SCENARIO 1D: Hentested på veien - samme leveringssted
        // Ventende sitt hentested ligger mellom ressurs sitt hentested og felles leveringssted
        // Eksempel: Ressurs 7620→7603, Ventende 7608→7603 (7608 er mellom 7620 og 7603)
        // ============================================================
        if (leverPostnrDiff <= 10) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1D: Sjekker om hentested er på veien');
            
            // Sjekk retninger
            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
            const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
            
            if (debug) {
                console.log('  Ressurs retning:', pagaendeRetning);
                console.log('  Ventende retning:', ventendeRetning);
            }
            
            // Må reise i samme retning
            if (pagaendeRetning === ventendeRetning) {
                // Sjekk om ventende sitt hentested er mellom ressurs sitt hentested og leveringssted
                let erPaaVeien = false;
                
                if (pagaendeRetning === 'sør') {
                    // Reiser sørover: ressurs.hent > ventende.hent > felles.lever
                    erPaaVeien = pagaende.postnrHent > ventende.postnrHent && ventende.postnrHent > pagaende.postnrLever;
                    if (debug) console.log('  Sørover: ' + pagaende.postnrHent + ' > ' + ventende.postnrHent + ' > ' + pagaende.postnrLever + ' ?', erPaaVeien);
                } else {
                    // Reiser nordover: ressurs.hent < ventende.hent < felles.lever
                    erPaaVeien = pagaende.postnrHent < ventende.postnrHent && ventende.postnrHent < pagaende.postnrLever;
                    if (debug) console.log('  Nordover: ' + pagaende.postnrHent + ' < ' + ventende.postnrHent + ' < ' + pagaende.postnrLever + ' ?', erPaaVeien);
                }
                
                if (erPaaVeien) {
                    if (debug) console.log('  ✓ Hentested er på veien!');
                    
                    // Sjekk tidsmessig - ressurs må starte før eller samtidig med ventende
                    if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime && ventende.treatmentDateTime) {
                        const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                        const oppmoteDiff = (ventende.treatmentDateTime - pagaende.treatmentDateTime) / (1000 * 60);
                        
                        if (debug) {
                            console.log('  Ventende:', ventende.tripStartTime, '/', ventende.tripTreatmentTime);
                            console.log('  Ressurs:', pagaende.tripStartTime, '/', pagaende.tripTreatmentTime);
                            console.log('  Startdiff:', startDiff, 'min');
                            console.log('  Oppmøtediff:', oppmoteDiff, 'min');
                        }
                        
                        // Sjekk om dette er kort eller lang tur
                        const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
                        const isShortTrip = ventendePostnrDiff < SHORT_DISTANCE_POSTNR_DIFF;
                        
                        if (isShortTrip) {
                            // Kort tur: Maks 30 min tidlig levering
                            // Ventende kan leveres tidligst 30 min før oppmøtetid
                            const ventendeTidligstLevering = new Date(ventende.treatmentDateTime.getTime() - (SHORT_DISTANCE_TIME_BUFFER * 60 * 1000));
                            const leveringOK = pagaende.treatmentDateTime >= ventendeTidligstLevering && pagaende.treatmentDateTime <= ventende.treatmentDateTime;
                            
                            if (debug) {
                                console.log('  Kort tur - ventende kan leveres:', ventendeTidligstLevering.toTimeString().substr(0,5), '-', ventende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Ressurs leverer:', pagaende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Levering OK?', leveringOK);
                            }
                            
                            if (leveringOK && startDiff >= -30) {
                                if (debug) console.log('✓ MATCH i SCENARIO 1D (kort tur)');
                                
                                return {
                                    type: 'samkjøring',
                                    timeDiff: Math.round(startDiff),
                                    absTimeDiff: Math.abs(Math.round(startDiff)),
                                    direction: pagaendeRetning,
                                    score: 75 - Math.abs(startDiff)
                                };
                            } else {
                                if (debug) console.log('  Levering utenfor vindu eller ressurs starter for sent');
                            }
                        } else {
                            // Lang tur: Ressurs må starte før ventende (eller maks 30 min etter)
                            if (startDiff >= -30) {
                                if (debug) console.log('✓ MATCH i SCENARIO 1D (lang tur)');
                                
                                return {
                                    type: 'samkjøring',
                                    timeDiff: Math.round(startDiff),
                                    absTimeDiff: Math.abs(Math.round(startDiff)),
                                    direction: pagaendeRetning,
                                    score: 75 - Math.abs(startDiff)
                                };
                            } else {
                                if (debug) console.log('  Ressurs starter for sent');
                            }
                        }
                    }
                } else {
                    if (debug) console.log('  Hentested ikke på veien');
                }
            } else {
                if (debug) console.log('  Forskjellig retning');
            }
        }
        
        // ============================================================
        // SCENARIO 2: Retur-tur - samme hentested (begge returer)
        // ============================================================
        if (ventende.postnrHent === pagaende.postnrHent && ventende.isReturnTrip && pagaende.isReturnTrip) {
            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
            const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
            
            if (pagaendeRetning !== ventendeRetning) {
                return null;
            }
            
            let erPaaVeien = false;
            
            if (pagaendeRetning === 'nord') {
                erPaaVeien = pagaende.postnrHent < ventende.postnrLever && ventende.postnrLever < pagaende.postnrLever;
            } else {
                erPaaVeien = pagaende.postnrHent > ventende.postnrLever && ventende.postnrLever > pagaende.postnrLever;
            }
            
            if (!erPaaVeien) {
                return null;
            }
            
            if (pagaende.startDateTime && ventende.startDateTime) {
                const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                
                if (Math.abs(startDiff) <= 30) {
                    return {
                        type: 'samkjøring',
                        timeDiff: Math.round(startDiff),
                        absTimeDiff: Math.abs(Math.round(startDiff)),
                        direction: pagaendeRetning,
                        score: 70 - Math.abs(startDiff)
                    };
                }
            }
        }
        
        return null;
    }

    // Funksjon for å sjekke returutnyttelse (motsatt rute)
    function checkReturutnyttelse(ventende, pagaende) {
        // Ventende må være en retur for at dette skal gi mening
        if (!ventende.isReturnTrip) {
            return null;
        }
        
        // Begge må være lange turer
        const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
        const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
        
        if (pagaendePostnrDiff < SHORT_DISTANCE_POSTNR_DIFF || ventendePostnrDiff < SHORT_DISTANCE_POSTNR_DIFF) {
            return null;
        }
        
        // Sjekk returutnyttelse:
        // 1. Ventende hentes nær der ressurs leverer (±10 postnr)
        // 2. De reiser i MOTSATT retning (ressurs gikk sør, retur går nord eller vice versa)
        const henteMatcherLever = Math.abs(ventende.postnrHent - pagaende.postnrLever) <= 10;
        
        if (!henteMatcherLever) {
            return null;
        }
        
        // Sjekk retninger
        const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
        const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
        
        // De MÅ reise i MOTSATT retning for returutnyttelse
        if (pagaendeRetning === ventendeRetning) {
            return null;
        }

        // Retur kan vente i opptil 2 timer etter at ressurs leverer
        const waitBuffer = LONG_DISTANCE_TIME_BUFFER;

        if (pagaende.treatmentDateTime && ventende.startDateTime) {
            // Tid fra ressurs leverer til ventende retur skal hentes
            const timeDiffMinutes = (ventende.startDateTime - pagaende.treatmentDateTime) / (1000 * 60);
            
            // Sjekk om ventetiden er innenfor buffer (maks 2 timer i begge retninger)
            // - Positiv: Ressurs leverer FØR retur hentes (ressurs venter)
            // - Negativ: Ressurs leverer ETTER retur skulle hentes (retur venter)
            if (Math.abs(timeDiffMinutes) <= waitBuffer) {
                let waitDescription = '';
                
                if (timeDiffMinutes > 0) {
                    waitDescription = `ressurs venter ${Math.round(timeDiffMinutes)} min`;
                } else if (timeDiffMinutes < 0) {
                    const absoluteWait = Math.abs(timeDiffMinutes);
                    waitDescription = `retur venter ${Math.round(absoluteWait)} min`;
                } else {
                    waitDescription = 'ingen ventetid';
                }
                
                return {
                    type: 'returutnyttelse',
                    timeDiff: Math.round(timeDiffMinutes),
                    absTimeDiff: Math.abs(Math.round(timeDiffMinutes)),
                    direction: 'retur',
                    waitDescription: waitDescription,
                    score: 80 - Math.abs(timeDiffMinutes)
                };
            }
        }

        return null;
    }

    // Funksjon for å finne kandidater
    function findCandidates(ventendeList) {
        const pagaendeList = getPaagaendeOppdrag();
        const results = [];

        ventendeList.forEach(ventende => {
            const resourceMatches = new Map(); // Grupperer per ressurs
            
            pagaendeList.forEach(pagaende => {
                const match = checkSamkjoring(ventende, pagaende);
                
                // Initialiser ressurs hvis den ikke finnes
                if (!resourceMatches.has(pagaende.resource)) {
                    resourceMatches.set(pagaende.resource, {
                        resource: pagaende.resource,
                        bookings: [],
                        hasMatch: false,
                        bestScore: 0
                    });
                }
                
                const resourceData = resourceMatches.get(pagaende.resource);
                
                if (match) {
                    resourceData.hasMatch = true;
                    resourceData.bestScore = Math.max(resourceData.bestScore, match.score);
                    
                    resourceData.bookings.push({
                        ...pagaende,
                        matchType: match.type,
                        timeDiff: match.timeDiff,
                        absTimeDiff: match.absTimeDiff,
                        direction: match.direction,
                        waitDescription: match.waitDescription,
                        score: match.score,
                        hasMatch: true
                    });
                } else {
                    // Legg til bestilling uten match også, for å vise full ressurs
                    resourceData.bookings.push({
                        ...pagaende,
                        hasMatch: false
                    });
                }
            });

            // Filtrer kun ressurser som har minst én match
            const candidates = Array.from(resourceMatches.values())
                .filter(r => r.hasMatch)
                .sort((a, b) => b.bestScore - a.bestScore); // Sorter etter beste score

            if (candidates.length > 0) {
                results.push({
                    ventende,
                    candidates
                });
            }
        });

        return results;
    }

    // Funksjon for å vise resultat popup
    function showResultsPopup(results) {
        // Fjern eksisterende popup hvis den finnes
        const existingPopup = document.getElementById('samkjoring-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Opprett popup
        const popup = document.createElement('div');
        popup.id = 'samkjoring-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            max-width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;

        let html = '<h2 style="margin-top: 0;">🚐 Samkjøringsforslag</h2>';

        if (results.length === 0) {
            html += '<p>Ingen samkjøringskandidater funnet.</p>';
        } else {
            results.forEach(result => {
                html += `
                    <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                        <h3 style="margin-top: 0; color: #0066cc;">Merket bestilling:</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background: white;">
                            <tbody>
                                <tr style="background: #f0f8ff;">
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 21%;"><strong>Navn</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 12%;"><strong>Hentetid</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 12%;"><strong>Oppmøte</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 27.5%;"><strong>Fra</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 27.5%;"><strong>Til</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.ventende.patientName}${result.ventende.isReturnTrip ? ' (Retur)' : ''}">${result.ventende.patientName}${result.ventende.isReturnTrip ? ' <span style="color: #ff8800; font-size: 0.9em;">(R)</span>' : ''}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${result.ventende.tripStartTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${result.ventende.tripTreatmentTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.9em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.ventende.fromAddress}">${result.ventende.fromAddress}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.9em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.ventende.toAddress}">${result.ventende.toAddress}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <h4 style="margin-top: 15px; color: #006400;">Potensielle samkjøringer (${result.candidates.length} ressurs${result.candidates.length !== 1 ? 'er' : ''}):</h4>
                `;

                result.candidates.forEach((resourceCandidate, resIndex) => {
                    // Finn beste match for denne ressursen
                    const matchedBookings = resourceCandidate.bookings.filter(b => b.hasMatch);
                    const bestMatch = matchedBookings.length > 0 ? matchedBookings[0] : null;
                    
                    let resourceBadge = '';
                    let borderColor = '#006400';
                    
                    if (bestMatch) {
                        if (bestMatch.matchType === 'returutnyttelse') {
                            resourceBadge = '<span style="background: #9b59b6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">RETURUTNYTTELSE</span>';
                            borderColor = '#9b59b6';
                        } else if (bestMatch.matchType === 'samkjøring') {
                            resourceBadge = '<span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">SAMKJØRING</span>';
                            borderColor = '#e67e22';
                        } else {
                            resourceBadge = '<span style="background: #006400; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">SAMKJØRING</span>';
                        }
                    }
                    
                    // Hent rowId fra første booking (alle har samme ressurs)
                    const resourceRowId = resourceCandidate.bookings[0].rowId;
                    
                    html += `
                        <div style="margin: 15px 0; padding: 12px; background: white; border-left: 4px solid ${borderColor}; border-radius: 3px;">
                            <div style="font-weight: bold; margin-bottom: 10px; font-size: 1.05em; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    ${resIndex + 1}. ${resourceCandidate.resource}${resourceBadge}
                                    <span style="color: ${borderColor}; font-size: 0.95em; margin-left: 10px;">Score: ${Math.round(resourceCandidate.bestScore)}</span>
                                </div>
                                <div>
                                    <button 
                                        onclick="window.showSamkjoringInMap('${result.ventende.rowId}', '${resourceRowId}')"
                                        style="background: #2980b9; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9em; margin-right: 8px; height: 36px;"
                                        onmouseover="this.style.opacity='0.8'"
                                        onmouseout="this.style.opacity='1'"
                                        tabindex="-1"
                                    >
                                        🗺️ Vis i kart
                                    </button>
                                    <button 
                                        onclick="window.selectSamkjoringResource('${result.ventende.rowId}', '${resourceRowId}')"
                                        style="background: ${borderColor}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9em; height: 36px;"
                                        onmouseover="this.style.opacity='0.8'"
                                        onmouseout="this.style.opacity='1'"
                                    >
                                        🚐 Velg ressurs
                                    </button>
                                </div>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                                <thead>
                                    <tr style="background: #f9f9f9; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Match</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Navn</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Hentetid</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Oppmøte</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Fra</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Til</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    resourceCandidate.bookings.forEach((booking, bookingIndex) => {
                        const rowBg = bookingIndex % 2 === 0 ? '#fff' : '#f9f9f9';
                        let matchIcon = '';
                        let timeInfo = '';
                        
                        if (booking.hasMatch) {
                            matchIcon = '<span style="color: green; font-weight: bold;">✓</span>';
                            
                            if (booking.matchType === 'returutnyttelse') {
                                timeInfo = ` <span style="color: #9b59b6;">(${booking.waitDescription})</span>`;
                            } else if (booking.matchType === 'samkjøring') {
                                timeInfo = '';
                            } else if (booking.direction === 'fremover') {
                                timeInfo = ` <span style="color: #006400;">(+${booking.absTimeDiff} min)</span>`;
                            } else if (booking.direction === 'bakover') {
                                timeInfo = ` <span style="color: #ff8800;">(-${booking.absTimeDiff} min)</span>`;
                            } else if (booking.direction === 'identisk') {
                                timeInfo = ` <span style="color: #0066cc;">(samme tid)</span>`;
                            }
                        } else {
                            matchIcon = '<span style="color: #ccc;">-</span>';
                        }
                        
                        html += `
                            <tr style="background: ${rowBg}; ${booking.hasMatch ? 'font-weight: 500;' : 'color: #666;'}">
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${matchIcon}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${booking.patientName}${booking.isReturnTrip ? ' (Retur)' : ''}">${booking.patientName}${booking.isReturnTrip ? ' <span style="color: #ff8800;">(Retur)</span>' : ''}</td>
                                <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripStartTime}${timeInfo}</td>
                                <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripTreatmentTime}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.85em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${booking.fromAddress}">${booking.fromAddress}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.85em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${booking.toAddress}">${booking.toAddress}</td>
                            </tr>
                        `;
                    });
                    
                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                });

                html += '</div>';
            });
        }

        html += '<button id="close-samkjoring-popup" style="margin-top: 15px; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer;">Lukk</button>';

        popup.innerHTML = html;
        document.body.appendChild(popup);

        // Legg til overlay
        const overlay = document.createElement('div');
        overlay.id = 'samkjoring-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;
        document.body.appendChild(overlay);

        // Sett fokus på første "Velg ressurs"-knapp
        setTimeout(() => {
            const firstButton = popup.querySelector('button[onclick^="window.selectSamkjoringResource"]');
            if (firstButton) {
                firstButton.focus();
            }
        }, 100);

        // Funksjon for å lukke popup
        const closePopup = () => {
            popup.remove();
            overlay.remove();
            window.samkjoringRunning = false;
            document.removeEventListener('keydown', escHandler);
            document.removeEventListener('keydown', tabTrapHandler);
        };

        // ESC-handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closePopup();
            }
        };
        document.addEventListener('keydown', escHandler);

        // TAB-trap: Hold TAB-navigasjon innenfor popup
        const tabTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            
            // Finn alle fokuserbare elementer i popup (unntatt de med tabindex="-1")
            const focusableElements = Array.from(popup.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.tabIndex !== -1);
            
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            // Hvis Shift+Tab på første element, gå til siste
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            // Hvis Tab på siste element, gå til første
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };
        document.addEventListener('keydown', tabTrapHandler);

        // Global funksjon for å velge ressurs
        window.selectSamkjoringResource = (ventendeId, resourceId) => {
            if (selectResourceAndBooking(ventendeId, resourceId)) {
                closePopup();
            } else {
                showErrorToast('🚐 Kunne ikke velge ressurs. Vennligst prøv igjen.');
            }
        };

        // Global funksjon for å vise i kart
        window.showSamkjoringInMap = (ventendeId, resourceId) => {
            if (selectResourceAndBooking(ventendeId, resourceId)) {
                // Trigger Alt+W for å åpne kart
                setTimeout(() => {
                    document.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'w',
                        code: 'KeyW',
                        altKey: true,
                        bubbles: true,
                        cancelable: true
                    }));
                }, 100);
                // Popup forblir åpen slik at bruker kan velge flere ressurser
            } else {
                showErrorToast('🚐 Kunne ikke åpne kart. Vennligst prøv igjen.');
            }
        };

        // Lukk-funksjonalitet
        document.getElementById('close-samkjoring-popup').addEventListener('click', closePopup);
        overlay.addEventListener('click', closePopup);
    }

    // Hovedfunksjon
    function runSamkjoringAnalyse() {
        // Sjekk global sperre
        if (window.samkjoringRunning) {
            console.log('Samkjøringsanalyse kjører allerede...');
            return;
        }
        
        const selectedVentende = getSelectedVentendeOppdrag();
        
        if (selectedVentende.length === 0) {
            showErrorToast('🚐 Ingen bestillinger er valgt. Vennligst marker én eller flere bestillinger på ventende oppdrag og trykk på Samkjøring-knappen eller Alt+X igjen.');
            return;
        }

        // Sett sperre
        window.samkjoringRunning = true;

        const results = findCandidates(selectedVentende);
        showResultsPopup(results);
    }

    // Legg til keyboard shortcut (Alt+X)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            runSamkjoringAnalyse();
        }
    });

    console.log('✓ NISSY Samkjøringsforslag lastet. Trykk Alt+X for å analysere merkede bestillinger.');
})();