// NISSY Samkjøringsforslag Snippet
// Kjør i Console eller via loader
// Snarvei: Alt+X

(function() {
    'use strict';
    
    // Sjekk om scriptet allerede er lastet
    if (window.nissySamkjoringLoaded) {
        console.log('⚠️ NISSY Samkjøringsforslag er allerede aktivt.');
        return;
    }
    
    // Marker scriptet som lastet
    window.nissySamkjoringLoaded = true;

    // Konstanter for tidsjusteringer
    const SHORT_DISTANCE_POSTNR_DIFF = 30;
    const SHORT_DISTANCE_TIME_BUFFER = 30; // minutter
    const LONG_DISTANCE_TIME_BUFFER = 120; // minutter (2 timer)

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
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 15%;"><strong>Navn</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 12%;"><strong>Hentetid</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 12%;"><strong>Oppmøte</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 30.5%;"><strong>Fra</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd; width: 30.5%;"><strong>Til</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.ventende.patientName}${result.ventende.isReturnTrip ? ' (Retur)' : ''}">${result.ventende.patientName}${result.ventende.isReturnTrip ? ' <span style="color: #ff8800; font-size: 0.9em;">(Retur)</span>' : ''}</td>
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
                        } else if (bestMatch.matchType === 'paa-vei-forbi') {
                            resourceBadge = '<span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">PÅ VEI FORBI</span>';
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
                                <button 
                                    onclick="window.selectSamkjoringResource('${result.ventende.rowId}', '${resourceRowId}')"
                                    style="background: ${borderColor}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9em;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'"
                                >
                                    Velg ressurs
                                </button>
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
                            } else if (booking.matchType === 'paa-vei-forbi') {
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

        // Funksjon for å lukke popup
        const closePopup = () => {
            popup.remove();
            overlay.remove();
            window.samkjoringRunning = false;
            document.removeEventListener('keydown', escHandler);
        };

        // ESC-handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closePopup();
            }
        };
        document.addEventListener('keydown', escHandler);

        // Global funksjon for å velge ressurs
        window.selectSamkjoringResource = (ventendeId, resourceId) => {
            if (selectResourceAndBooking(ventendeId, resourceId)) {
                closePopup();
            } else {
                alert('Kunne ikke velge ressurs. Vennligst prøv igjen.');
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
            alert('Vennligst merk minst én bestilling på ventende oppdrag først.');
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