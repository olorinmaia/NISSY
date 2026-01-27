// Samkjøringsforslag (UNDER UTVIKLING)
// Snarvei: Alt+X

(function() {
    'use strict';

    // Konstanter for tidsjusteringer
    const SHORT_DISTANCE_POSTNR_DIFF = 30;
    const SHORT_DISTANCE_TIME_BUFFER = 30; // minutter
    const LONG_DISTANCE_TIME_BUFFER = 120; // minutter (2 timer)
    
    // Sperre for å forhindre flere popups samtidig
    let isAnalyseRunning = false;

    // Funksjon for å parse postnummer fra adresse
    function parsePostnummer(address) {
        if (!address) return null;
        const match = address.match(/\b(\d{4})\b/);
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
        const rows = document.querySelectorAll('#ventendeoppdrag tbody tr[style*="background-color"]');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return;
            
            const patientName = cells[1].textContent.trim();
            const tripStartTime = cells[2].textContent.trim();
            const tripTreatmentTime = cells[3].textContent.trim();
            const fromAddress = cells[6].innerHTML.split('<br>')[0].trim();
            const toAddress = cells[6].innerHTML.split('<br>')[1]?.trim() || '';
            
            const reqId = row.id.replace('V-', '');
            
            const order = {
                id: reqId,
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
            const tripStartTime = cells[3].textContent.trim();
            const tripTreatmentTime = cells[4].textContent.trim();
            const patientName = cells[5].textContent.trim();
            const fromAddress = cells[8].textContent.trim();
            const toAddress = cells[9].textContent.trim();
            const status = cells[10].textContent.trim();
            
            const reqId = row.id.replace('P-', '');
            
            const order = {
                id: reqId,
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
                treatmentDateTime: parseDateTime(tripTreatmentTime)
            };
            
            oppdrag.push(normalizeReturnTrip(order));
        });
        
        return oppdrag;
    }

    // Funksjon for å sjekke om to bestillinger kan samkjøres
    function checkSamkjoring(ventende, pagaende) {
        // Sjekk om postnummer matcher eksakt
        if (ventende.postnrHent !== pagaende.postnrHent || 
            ventende.postnrLever !== pagaende.postnrLever) {
            // Sjekk returutnyttelse (motsatt rute)
            const returMatch = checkReturutnyttelse(ventende, pagaende);
            if (returMatch) return returMatch;
            
            // Sjekk på-vei-forbi (samme retning, ventende er på veien)
            return checkPaaVeiForbi(ventende, pagaende);
        }

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

        return null;
    }

    // Funksjon for å sjekke om ventende bestilling er på veien til pågående
    function checkPaaVeiForbi(ventende, pagaende) {
        // Må ha samme leveringssted
        if (ventende.postnrLever !== pagaende.postnrLever) {
            return null;
        }
        
        // Sjekk om begge reiser i samme retning (nord eller sør)
        const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
        const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
        
        if (pagaendeRetning !== ventendeRetning) {
            return null;
        }
        
        // Sjekk om ventende sin henteplass er mellom pågående sin henteplass og leveringssted
        let erPaaVeien = false;
        
        if (pagaendeRetning === 'nord') {
            // Reiser nordover: pågående.hent < ventende.hent < felles.lever
            erPaaVeien = pagaende.postnrHent < ventende.postnrHent && ventende.postnrHent < pagaende.postnrLever;
        } else {
            // Reiser sørover: pågående.hent > ventende.hent > felles.lever
            erPaaVeien = pagaende.postnrHent > ventende.postnrHent && ventende.postnrHent > pagaende.postnrLever;
        }
        
        if (!erPaaVeien) {
            return null;
        }
        
        // Sjekk tidsmessig kompatibilitet
        // Pågående må starte før eller samtidig med ventende
        // Ventende må kunne hentes før pågående leverer
        if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime) {
            const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
            const leverDiff = (pagaende.treatmentDateTime - ventende.startDateTime) / (1000 * 60);
            
            // Pågående må starte før ventende (eller maks 30 min etter)
            // Ventende må hentes før pågående leverer
            if (startDiff >= -30 && leverDiff >= 0) {
                return {
                    type: 'paa-vei-forbi',
                    timeDiff: Math.round(startDiff),
                    absTimeDiff: Math.abs(Math.round(startDiff)),
                    direction: pagaendeRetning,
                    score: 70 - Math.abs(startDiff) // Litt lavere score, men fortsatt bra
                };
            }
        }
        
        return null;
    }

    // Funksjon for å sjekke returutnyttelse (motsatt rute)
    function checkReturutnyttelse(ventende, pagaende) {
        // Sjekk om dette er en returutnyttelse:
        // Ventende skal FRA der pågående skal TIL, og TIL der pågående skal FRA
        if (ventende.postnrHent !== pagaende.postnrLever || 
            ventende.postnrLever !== pagaende.postnrHent) {
            return null;
        }

        // Ventende må være en retur for at dette skal gi mening
        if (!ventende.isReturnTrip) {
            return null;
        }

        // Beregn postnummer-differanse for å bestemme om dette er lang eller kort tur
        const postnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
        
        // Kun returutnyttelse på lengre turer
        if (postnrDiff < SHORT_DISTANCE_POSTNR_DIFF) {
            return null;
        }

        // Ressursen kan vente i opptil 2 timer etter levering
        const waitBuffer = LONG_DISTANCE_TIME_BUFFER;

        if (pagaende.treatmentDateTime && ventende.startDateTime) {
            // Tid fra ressurs leverer til ventende retur skal hentes
            const timeDiffMinutes = (ventende.startDateTime - pagaende.treatmentDateTime) / (1000 * 60);
            
            // Sjekk om ventetiden er innenfor buffer (både positiv og negativ)
            const absTimeDiff = Math.abs(timeDiffMinutes);
            
            if (absTimeDiff <= waitBuffer) {
                let waitDescription = '';
                
                if (timeDiffMinutes > 0) {
                    waitDescription = `venter ${Math.round(timeDiffMinutes)} min`;
                } else if (timeDiffMinutes < 0) {
                    waitDescription = `retur venter ${Math.round(absTimeDiff)} min`;
                } else {
                    waitDescription = 'ingen ventetid';
                }
                
                return {
                    type: 'returutnyttelse',
                    timeDiff: Math.round(timeDiffMinutes),
                    absTimeDiff: Math.round(absTimeDiff),
                    direction: 'retur',
                    waitDescription: waitDescription,
                    score: 80 - absTimeDiff // Litt lavere score enn samkjøring, men fortsatt godt
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
            const candidates = [];
            
            pagaendeList.forEach(pagaende => {
                const match = checkSamkjoring(ventende, pagaende);
                if (match) {
                    candidates.push({
                        ...pagaende,
                        matchType: match.type,
                        timeDiff: match.timeDiff,
                        score: match.score
                    });
                }
            });

            // Sorter kandidater etter score (beste først)
            candidates.sort((a, b) => b.score - a.score);

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

        let html = '<h2 style="margin-top: 0;">Samkjøringsforslag</h2>';

        if (results.length === 0) {
            html += '<p>Ingen samkjøringskandidater funnet.</p>';
        } else {
            results.forEach(result => {
                html += `
                    <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                        <h3 style="margin-top: 0; color: #0066cc;">Merkede bestilling:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px;"><strong>Pasient:</strong></td>
                                <td style="padding: 5px;">${result.ventende.patientName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px;"><strong>Henting:</strong></td>
                                <td style="padding: 5px;">${result.ventende.tripStartTime}${result.ventende.isReturnTrip ? ' <span style="color: #ff8800;">(Retur)</span>' : ''}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px;"><strong>Levering:</strong></td>
                                <td style="padding: 5px;">${result.ventende.tripTreatmentTime}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px;"><strong>Fra:</strong></td>
                                <td style="padding: 5px;">${result.ventende.fromAddress}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px;"><strong>Til:</strong></td>
                                <td style="padding: 5px;">${result.ventende.toAddress}</td>
                            </tr>
                        </table>
                        
                        <h4 style="margin-top: 15px; color: #006400;">Potensielle samkjøringer (${result.candidates.length}):</h4>
                `;

                result.candidates.forEach((candidate, index) => {
                    let directionText = '';
                    let directionColor = '#555';
                    let matchTypeLabel = '';
                    let borderColor = '#006400';
                    
                    if (candidate.matchType === 'returutnyttelse') {
                        matchTypeLabel = '<span style="background: #9b59b6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">RETURUTNYTTELSE</span> ';
                        directionText = ` (${candidate.waitDescription})`;
                        directionColor = '#9b59b6';
                        borderColor = '#9b59b6';
                    } else if (candidate.matchType === 'paa-vei-forbi') {
                        matchTypeLabel = '<span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">PÅ VEI FORBI</span> ';
                        directionText = '';
                        directionColor = '#e67e22';
                        borderColor = '#e67e22';
                    } else if (candidate.direction === 'fremover') {
                        directionText = ` (+${candidate.absTimeDiff} min)`;
                        directionColor = '#006400';
                    } else if (candidate.direction === 'bakover') {
                        directionText = ` (-${candidate.absTimeDiff} min)`;
                        directionColor = '#ff8800';
                    } else {
                        directionText = ' (samme tid)';
                        directionColor = '#0066cc';
                    }
                    
                    html += `
                        <div style="margin: 10px 0; padding: 10px; background: white; border-left: 4px solid ${borderColor}; border-radius: 3px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">
                                ${index + 1}. ${matchTypeLabel}${candidate.resource} - ${candidate.patientName}${candidate.isReturnTrip ? ' <span style="color: #ff8800;">(Retur)</span>' : ''}
                            </div>
                            <div style="font-size: 0.9em; color: #555;">
                                <div>Start: ${candidate.tripStartTime}${directionText ? ' <span style="color: ' + directionColor + '; font-weight: bold;">' + directionText + '</span>' : ''}</div>
                                <div>Oppmøte: ${candidate.tripTreatmentTime}</div>
                                <div>Fra: ${candidate.fromAddress}</div>
                                <div>Til: ${candidate.toAddress}</div>
                                <div>Status: ${candidate.status}</div>
                                <div style="color: ${borderColor}; font-weight: bold;">Match score: ${Math.round(candidate.score)}</div>
                            </div>
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

        // Lukk-funksjonalitet
        document.getElementById('close-samkjoring-popup').addEventListener('click', () => {
            popup.remove();
            overlay.remove();
            isAnalyseRunning = false; // Frigjør sperren
        });

        overlay.addEventListener('click', () => {
            popup.remove();
            overlay.remove();
            isAnalyseRunning = false; // Frigjør sperren
        });
    }

    // Hovedfunksjon
    function runSamkjoringAnalyse() {
        // Sjekk om analyse allerede kjører
        if (isAnalyseRunning) {
            console.log('Samkjøringsanalyse kjører allerede...');
            return;
        }
        
        const selectedVentende = getSelectedVentendeOppdrag();
        
        if (selectedVentende.length === 0) {
            alert('Vennligst merk minst én bestilling på ventende oppdrag først.');
            return;
        }

        // Sett sperre
        isAnalyseRunning = true;

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
