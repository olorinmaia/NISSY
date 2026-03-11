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
    console.log("🚀 Starter Samkjøring-script");

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

    // Info toast (blå bakgrunn)
    function showInfoToast(msg) {
        const toast = document.createElement("div");
        toast.textContent = msg;
        
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#5bc0de", // Blå bakgrunn for info
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
        
        setTimeout(() => {
            toast.style.opacity = "1";
        }, 10);
        
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Success toast (grønn bakgrunn)
    function showSuccessToast(msg) {
        const toast = document.createElement("div");
        toast.textContent = msg;
        
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#5cb85c", // Grønn bakgrunn for success
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
        
        setTimeout(() => {
            toast.style.opacity = "1";
        }, 10);
        
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }


    // ============================================================
    // KONSTANTER
    // ============================================================
    
    // Tidsrelaterte konstanter
    const SHORT_DISTANCE_POSTNR_DIFF = 33;          // Grense mellom kort og lang tur (postnr diff)

    // ============================================================
    // LONG_DISTANCE_OVERRIDE: Reiser som er geografisk lange
    // selv om postnr-differansen er < SHORT_DISTANCE_POSTNR_DIFF.
    // Rekkefølge spiller ingen rolle. Støtter eksakt eller rekkevidde på begge sider.
    // ============================================================
    const LONG_DISTANCE_OVERRIDE = [
        { hentMin: 7770, hentMax: 7797, leverMin: 7800, leverMax: 7805 },
        { hentMin: 7633, hentMax: 7634, leverMin: 7600, leverMax: 7630 },
        // Legg til flere her:
    ];

    // Sjekk om en reise er lang: overstyring løper først, ellers normal postnr-diff
    function isLongTrip(postnrHent, postnrLever) {
        if (postnrHent == null || postnrLever == null) return false;
        // Sjekk overstyringer (bidireksjonelt: hent↔lever i begge retninger)
        const overridden = LONG_DISTANCE_OVERRIDE.some(rule => {
            const side1 = (postnrHent  >= rule.hentMin  && postnrHent  <= rule.hentMax &&
                           postnrLever >= rule.leverMin && postnrLever <= rule.leverMax);
            const side2 = (postnrLever >= rule.hentMin  && postnrLever <= rule.hentMax &&
                           postnrHent  >= rule.leverMin && postnrHent  <= rule.leverMax);
            return side1 || side2;
        });
        if (overridden) return true;
        // Normal klassifisering
        return Math.abs(postnrHent - postnrLever) >= SHORT_DISTANCE_POSTNR_DIFF;
    }
    const SHORT_DISTANCE_TIME_BUFFER = 30;          // Tidsbuffer for korte turer (minutter)
    const LONG_DISTANCE_TIME_BUFFER = 120;          // Tidsbuffer for lange turer (minutter - 2 timer)
    
    // Postnummer-toleranser
    const POSTNR_TOLERANCE_DELIVERY = 12;           // ±11 postnr for leveringssted
    const POSTNR_TOLERANCE_PICKUP = 12;             // ±11 postnr for hentested
    
    // Tidsmessige krav
    const MAX_START_DIFF_SHORT = 30;                // Maks startdiff for korte turer (minutter)
    const MIN_OVERLAP_MINUTES = 0;                  // Minimum overlapp for tidsvinduer (minutter)

    // ============================================================
    // BLOKKERINGS-LISTE: Hente-par som ALDRI skal samkjøres
    // ============================================================
    // Rekkefølge på hent1/hent2 spiller ingen rolle.
    // lever: eksakt match på leveringssted
    // leverMin/leverMax: rekkevidde på leveringssted (brukes i stedet av lever)
    const BLOCKED_PAIRS = [
        { hent1: 7760, hent2: 7740, leverMin: 7800, leverMax: 7804 },
        { hent1: 7760, hent2Min: 7710, hent2Max: 7732, leverMin: 7800, leverMax: 7804 },
        { hent1: 7760, hent2Min: 7770, hent2Max: 7797, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7870, hent1Max: 7873, hent2Min: 7900, hent2Max: 7995, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7870, hent1Max: 7995, hent2: 7856, leverMin: 7800, leverMax: 7804 },
        { hent1: 7890, hent2: 7900, leverMin: 7800, leverMax: 7804 },
        { hent1: 7890, hent2Min: 7882, hent2Max: 7884, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7500, hent1Max: 7739, hent2Min: 7740, hent2Max: 7748, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7500, hent1Max: 7739, hent2Min: 7760, hent2Max: 7777, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7790, hent1Max: 7797, hent2Min: 7740, hent2Max: 7748, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7790, hent1Max: 7797, hent2Min: 7760, hent2Max: 7777, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7881, hent1Max: 7885, hent2Min: 7900, hent2Max: 7995, leverMin: 7800, leverMax: 7804 },
        { hent1: 7670, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7710, hent1Max: 7732, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7650, hent1Max: 7660, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7500, hent1Max: 7533, hent2Min: 7120, hent2Max: 7126, leverMin: 7600, leverMax: 7606 },
        { hent1: 7690, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1: 7760, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1: 7790, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        { hent1: 7690, hent2Min: 7710, hent2Max: 7732, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7800, hent1Max: 7994, hent2Min: 7630, hent2Max: 7633, leverMin: 7600, leverMax: 7606 },
        //{ hent1: 7633, hent2Min: 7600, hent2Max: 7606, leverMin: 7713, leverMax: 7716 },
        // Legg til flere her:
    ];

    // ============================================================
    // BLOKKERING FOR RETURUTNYTTELSE: Speilet format
    // ============================================================
    // Ved returutnyttelse er matchinga speilet: ventende.hent ≈ ressurs.lever og omvendt.
    // Regler defineres dermed i den speilte rekkefølgen — ingen flipping.
    // Støtter eksakt eller rekkevidde på hver side, same as BLOCKED_PAIRS.
    //   ressursHent / ressursLever: der ressursen henter/leverer
    //   ventendeHent / ventendeLever: der ventende henter/leverer
    const BLOCKED_RETURN_PAIRS = [
        { ressursHent: { min: 7630, max: 7633 }, ressursLever: { min: 7600, max: 7606 }, ventendeHent: { min: 7600, max: 7606 }, ventendeLever: { min: 7650, max: 8999 } },
        { ressursHent: { min: 7650, max: 8999 }, ressursLever: { min: 7600, max: 7606 }, ventendeHent: { min: 7600, max: 7606 }, ventendeLever: { min: 7630, max: 7633 } },
        { ressursHent: { min: 7856, max: 7856 }, ressursLever: { min: 7800, max: 7804 }, ventendeHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7856, max: 7995 } },
        { ressursHent: { min: 7760, max: 7760 }, ressursLever: { min: 7800, max: 7804 }, ventendeHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7740, max: 7740 } },
        { ressursHent: { min: 7760, max: 7760 }, ressursLever: { min: 7800, max: 7804 }, ventendeHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7180, max: 7190 } },
        { ressursHent: { min: 7900, max: 7995 }, ressursLever: { min: 7800, max: 7804 }, ventendeHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7880, max: 7884 } },
        { ressursHent: { min: 7880, max: 7884 }, ressursLever: { min: 7800, max: 7804 }, ventendeHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7900, max: 7995 } },
        // Blokkering for samkjøring av returer (Scenario 2):
        //   hent: felles hentested, lever1/lever2: de to destinasjonene som IKKE skal samkjøres
        { ventendeHent: { min: 7800, max: 7804 }, ressursHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7880, max: 7884 }, ressursLever: { min: 7900, max: 7995 } },
        { ventendeHent: { min: 7800, max: 7804 }, ressursHent: { min: 7800, max: 7804 }, ventendeLever: { min: 7880, max: 7884 }, ressursLever: { min: 8900, max: 8999 } },
        { ventendeHent: { min: 7600, max: 7606 }, ressursHent: { min: 7600, max: 7606 }, ventendeLever: { min: 7619, max: 7634 }, ressursLever: { min: 7650, max: 8999 } },
        // Legg til flere her:
    ];

    // Sjekk én side mot regel: eksakt (tall) eller rekkevidde ({ min, max })
    function matchesReturnSide(spec, postnr) {
        if (typeof spec === 'number') return postnr === spec;
        if (typeof spec === 'object' && spec !== null) return postnr >= spec.min && postnr <= spec.max;
        return false;
    }

    function isBlockedReturnCombination(ventende, pagaende) {
        return BLOCKED_RETURN_PAIRS.some(rule =>
            // Retning 1: ventende = ventende-side, pagaende = ressurs-side
            (matchesReturnSide(rule.ressursHent,    pagaende.postnrHent)  &&
             matchesReturnSide(rule.ressursLever,   pagaende.postnrLever) &&
             matchesReturnSide(rule.ventendeHent,   ventende.postnrHent)  &&
             matchesReturnSide(rule.ventendeLever,  ventende.postnrLever))
            ||
            // Retning 2: byttet (symmetrisk — rekkefølge spiller ingen rolle)
            (matchesReturnSide(rule.ressursHent,    ventende.postnrHent)  &&
             matchesReturnSide(rule.ressursLever,   ventende.postnrLever) &&
             matchesReturnSide(rule.ventendeHent,   pagaende.postnrHent)  &&
             matchesReturnSide(rule.ventendeLever,  pagaende.postnrLever))
        );
    }

    // Sjekk om én postnr er innenfor en regel-side:
    //   eksakt:    { lever: 7803 }          → postnr === 7803
    //   rekkevidde: { leverMin: 7600, leverMax: 7606 } → 7600 <= postnr <= 7606
    function matchesSide(exact, min, max, postnr) {
        if (exact !== undefined) return postnr === exact;
        if (min !== undefined && max !== undefined) return postnr >= min && postnr <= max;
        return false;
    }

    // Felles lever-sjekk: støtter eksakt `lever` eller rekkevidde `leverMin`/`leverMax`
    function matchesLever(rule, postnrLever1, postnrLever2) {
        return matchesSide(rule.lever, rule.leverMin, rule.leverMax, postnrLever1) &&
               matchesSide(rule.lever, rule.leverMin, rule.leverMax, postnrLever2);
    }

    // Sjekk én hent-side mot regel: eksakt via `hentX`, rekkevidde via `hentXMin`/`hentXMax`
    function matchesHentSide(exact, min, max, postnr) {
        return matchesSide(exact, min, max, postnr);
    }

    function isBlockedCombination(ventende, pagaende) {
        if (!ventende.postnrHent || !ventende.postnrLever || !pagaende.postnrHent || !pagaende.postnrLever) return false;
        
        return BLOCKED_PAIRS.some(rule => {
            if (!matchesLever(rule, ventende.postnrLever, pagaende.postnrLever)) return false;
            
            // Retning 1: ventende = side1, pagaende = side2
            const retning1 = matchesHentSide(rule.hent1, rule.hent1Min, rule.hent1Max, ventende.postnrHent) &&
                             matchesHentSide(rule.hent2, rule.hent2Min, rule.hent2Max, pagaende.postnrHent);
            // Retning 2: ventende = side2, pagaende = side1
            const retning2 = matchesHentSide(rule.hent2, rule.hent2Min, rule.hent2Max, ventende.postnrHent) &&
                             matchesHentSide(rule.hent1, rule.hent1Min, rule.hent1Max, pagaende.postnrHent);
            
            return retning1 || retning2;
        });
    }

    // ============================================================
    // WHITELIST: Hente-par som skal samkjøres til samme leveringssted
    // ============================================================
    // Rekkefølge på hent1/hent2 spiller ingen rolle.
    // lever: eksakt match på leveringssted
    // leverMin/leverMax: rekkevidde på leveringssted (brukes i stedet av lever)
    const WHITELISTED_PAIRS = [
        { hent1Min: 7860, hent1Max: 7870, hent2: 7760, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7500, hent1Max: 7533, hent2Min: 7630, hent2Max: 7632, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7500, hent1Max: 7533, hent2: 7620, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7500, hent1Max: 7533, hent2: 7623, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7633, hent1Max: 7633, hent2: 7620, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7650, hent1Max: 7691, hent2Min: 7120, hent2Max: 7126, leverMin: 7600, leverMax: 7606 },
        { hent1Min: 7717, hent1Max: 7717, hent2Min: 7717, hent2Max: 7717, leverMin: 7713, leverMax: 7725 },
        { hent1Min: 7500, hent1Max: 7995, hent2Min: 7500, hent2Max: 7995, leverMin: 7003, leverMax: 7099 },
        { hent1Min: 7770, hent1Max: 7797, hent2Min: 7820, hent2Max: 7823, leverMin: 7800, leverMax: 7804 },
        { hent1Min: 7500, hent1Max: 7751, hent2Min: 7820, hent2Max: 7823, leverMin: 7800, leverMax: 7804 },
        // Legg til flere her:
        // { hent1: 7600, hent2: 7500, leverMin: 7700, leverMax: 7710 },
    ];

    function isWhitelistedCombination(ventende, pagaende) {
        if (!ventende.postnrHent || !ventende.postnrLever || !pagaende.postnrHent || !pagaende.postnrLever) return false;
        
        return WHITELISTED_PAIRS.some(rule => {
            if (!matchesLever(rule, ventende.postnrLever, pagaende.postnrLever)) return false;
            
            const retning1 = matchesHentSide(rule.hent1, rule.hent1Min, rule.hent1Max, ventende.postnrHent) &&
                             matchesHentSide(rule.hent2, rule.hent2Min, rule.hent2Max, pagaende.postnrHent);
            const retning2 = matchesHentSide(rule.hent2, rule.hent2Min, rule.hent2Max, ventende.postnrHent) &&
                             matchesHentSide(rule.hent1, rule.hent1Min, rule.hent1Max, pagaende.postnrHent);
            
            return retning1 || retning2;
        });
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

    // ============================================================
    // Fjern problematiske husnummer-suffikser (H0123, U0123 etc)
    // ============================================================
    /**
     * Fjerner problematiske husnummer-suffikser (H0123, U0123 etc)
     * @param {string} address - Original adresse
     * @returns {string} - Adresse uten suffikser
     */
    function cleanAddressSuffixes(address) {
        if (!address) return address;
        // Fjern space etterfulgt av H eller U og 4 siffer
        // Eksempel: "Ole Vigs gate 39 H0101, 7500 STJØRDAL" → "Ole Vigs gate 39, 7500 STJØRDAL"
        return address.replace(/\s+[HU]\d{4}(?=,)/g, '');
    }

    // ============================================================
    // POSTSTED-GRUPPER FOR SCENARIO 1F
    // ============================================================
    // Poster i samme gruppe har lov til å samkjøre med hverandre i Scenario 1F.
    // Poster som ikke er i noen gruppe kan kun matche med seg selv eksakt.
    const POSTSTED_GRUPPER = [
        ['Rørvik', 'Kolvereid'],
        ['Namsskogan', 'Trones', 'Harran'],
        ['Nordli', 'Sørli'],
        ['Meråker', 'Hegra', 'Stjørdal'],
        ['Levanger', 'Skogn', 'Åsen', 'Ekne', 'Ronglan'],
        ['Steinkjer', 'Sparbu', 'Malm', 'Follafoss', 'Beitstad'],
        ['Verdal', 'Vuku'],
        ['Inderøy', 'Mosvik'],
        // Legg til flere grupper her:
    ];

    // Parse poststed fra adresse: "Straaten 2, 7900 Rørvik" → "rørvik"
    function parsePoststed(address) {
        if (!address) return null;
        const parts = address.split(',');
        const lastPart = parts[parts.length - 1].trim();
        const match = lastPart.match(/\b\d{4}\s+(.+)/);
        return match ? match[1].trim().toLowerCase() : null;
    }

    // Sjekk om to poststeder har lov til å samkjøre i Scenario 1F:
    //   - Eksakt match → alltid OK
    //   - Begge i samme gruppe → OK
    //   - Ellers (ikke i noen gruppe, eller forskjellige grupper) → nei
    function canSamkjorePoststed(poststed1, poststed2) {
        if (!poststed1 || !poststed2) return false;
        if (poststed1 === poststed2) return true;
        const g1 = POSTSTED_GRUPPER.findIndex(g => g.some(p => p.toLowerCase() === poststed1));
        const g2 = POSTSTED_GRUPPER.findIndex(g => g.some(p => p.toLowerCase() === poststed2));
        if (g1 === -1 || g2 === -1) return false;
        return g1 === g2;
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

    // ============================================================
    // HJELPEFUNKSJON: Finn kolonne-indeks basert på header-link
    // ============================================================
    function findColumnIndex(tableSelector, headerLink) {
        const headers = document.querySelectorAll(`${tableSelector} thead th`);
        for (let i = 0; i < headers.length; i++) {
            const link = headers[i].querySelector(`a[href*="${headerLink}"]`);
            if (link) {
                return i;
            }
        }
        return -1;
    }

    // Finn kolonne-indeks basert på header-tekst (for kolonner uten link)
    function findColumnIndexByText(tableSelector, headerText) {
        const headers = document.querySelectorAll(`${tableSelector} thead th`);
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === headerText) {
                return i;
            }
        }
        return -1;
    }

    // Funksjon for å hente merkede bestillinger fra ventende oppdrag
    function getSelectedVentendeOppdrag() {
        const selected = [];

        // Finn kolonne-indekser dynamisk fra header
        const reiseTidIndex  = findColumnIndex('#ventendeoppdrag', 'tripStartDate');
        const oppTidIndex    = findColumnIndex('#ventendeoppdrag', 'tripTreatmentDate');
        const adresseIndex   = findColumnIndex('#ventendeoppdrag', 'tripFromAddress'); // Fra+Til i samme kolonne
        const nameIndex      = findColumnIndex('#ventendeoppdrag', 'patientName');     // valgfri
        const behovIndex     = findColumnIndexByText('#ventendeoppdrag', 'Behov');     // valgfri
        const ledsagerIndex  = findColumnIndexByText('#ventendeoppdrag', 'L');         // valgfri

        // Valider kritiske kolonner
        const missingVentende = [];
        if (reiseTidIndex === -1) missingVentende.push("'Reisetid'");
        if (oppTidIndex   === -1) missingVentende.push("'Oppmøtetid'");
        if (adresseIndex  === -1) missingVentende.push("'Fra / Til'");

        if (missingVentende.length > 0) {
            showErrorToast(`❌ Mangler kolonne(r) på ventende oppdrag: ${missingVentende.join(', ')}. Vennligst legg til i tabellen.`);
            return null; // signal: kolonne-feil, ikke "ingen valgt"
        }

        // Merkede rader har inline style med background-color: rgb(148, 169, 220)
        const rows = document.querySelectorAll('#ventendeoppdrag tbody tr');
        
        rows.forEach(row => {
            // Sjekk om raden har riktig bakgrunnsfarge (merket)
            const bgColor = row.style.backgroundColor;
            if (bgColor !== 'rgb(148, 169, 220)') return;
            
            const cells = row.querySelectorAll('td');

            const patientName       = nameIndex !== -1 ? (cells[nameIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
            const tripStartTime     = cells[reiseTidIndex]?.textContent.trim();
            const tripTreatmentTime = cells[oppTidIndex]?.textContent.trim();
            const behov             = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
            const ledsager          = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
            // Fra og Til ligger i samme celle, splittet på <br>
            const adresseCell       = cells[adresseIndex]?.innerHTML || '';
            const fromAddress       = adresseCell.split('<br>')[0].trim();
            const toAddress         = (adresseCell.split('<br>')[1] || '').trim();
            
            const reqId = row.getAttribute('name') || row.id.replace('V-', '');
            const rowId = row.id.replace('V-', '');
            
            const order = {
                id: reqId,
                rowId: rowId,
                patientName,
                tripStartTime,
                tripTreatmentTime,
                behov,
                ledsager,
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

    // ============================================================
    // HJELPEFUNKSJON: Hent ALLE ventende oppdrag (ikke bare merkede)
    // Brukes for auto-gruppering
    // ============================================================
    function getVentendeOppdrag() {
        const ventende = [];

        // Finn kolonne-indekser dynamisk fra header
        const reiseTidIndex  = findColumnIndex('#ventendeoppdrag', 'tripStartDate');
        const oppTidIndex    = findColumnIndex('#ventendeoppdrag', 'tripTreatmentDate');
        const adresseIndex   = findColumnIndex('#ventendeoppdrag', 'tripFromAddress');
        const nameIndex      = findColumnIndex('#ventendeoppdrag', 'patientName');
        const behovIndex     = findColumnIndexByText('#ventendeoppdrag', 'Behov');
        const ledsagerIndex  = findColumnIndexByText('#ventendeoppdrag', 'L');

        // Valider kritiske kolonner
        const missingVentende = [];
        if (reiseTidIndex === -1) missingVentende.push("'Reisetid'");
        if (oppTidIndex   === -1) missingVentende.push("'Oppmøtetid'");
        if (adresseIndex  === -1) missingVentende.push("'Fra / Til'");

        if (missingVentende.length > 0) {
            showErrorToast(`❌ Mangler kolonne(r) på ventende oppdrag: ${missingVentende.join(', ')}`);
            return null;
        }

        // Hent ALLE rader (ikke sjekk bakgrunnsfarge)
        const rows = document.querySelectorAll('#ventendeoppdrag tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');

            const patientName       = nameIndex !== -1 ? (cells[nameIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
            const tripStartTime     = cells[reiseTidIndex]?.textContent.trim();
            const tripTreatmentTime = cells[oppTidIndex]?.textContent.trim();
            const behov             = behovIndex !== -1 ? (cells[behovIndex]?.textContent.trim() || '') : '';
            const ledsager          = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
            
            // Fra og Til ligger i samme celle, splittet på <br>
            const adresseCell       = cells[adresseIndex]?.innerHTML || '';
            const fromAddress       = adresseCell.split('<br>')[0].trim();
            const toAddress         = (adresseCell.split('<br>')[1] || '').trim();
            
            const reqId = row.getAttribute('name') || row.id.replace('V-', '');
            const rowId = row.id.replace('V-', '');
            
            const order = {
                id: reqId,
                rowId: rowId,
                patientName,
                tripStartTime,
                tripTreatmentTime,
                behov,
                ledsager,
                fromAddress,
                toAddress,
                postnrHent: parsePostnummer(fromAddress),
                postnrLever: parsePostnummer(toAddress),
                startDateTime: parseDateTime(tripStartTime),
                treatmentDateTime: parseDateTime(tripTreatmentTime)
            };
            
            ventende.push(normalizeReturnTrip(order));
        });
        
        return ventende;
    }


    // Funksjon for å hente alle pågående oppdrag
    function getPaagaendeOppdrag() {
        const oppdrag = [];

        // Finn kolonne-indekser dynamisk fra header
        const startTimeIndex = findColumnIndex('#pagaendeoppdrag', 'tripStartTime');
        const oppTidIndex    = findColumnIndex('#pagaendeoppdrag', 'tripTreatmentDate');
        const nameIndex      = findColumnIndex('#pagaendeoppdrag', 'patientName');      // valgfri
        const fromIndex      = findColumnIndex('#pagaendeoppdrag', 'tripFromAddress');
        const toIndex        = findColumnIndex('#pagaendeoppdrag', 'tripToAddress');
        const statusIndex    = findColumnIndex('#pagaendeoppdrag', 'resourceStatus');   // valgfri
        const behovIndex     = findColumnIndexByText('#pagaendeoppdrag', 'Behov');      // valgfri
        const ledsagerIndex  = findColumnIndexByText('#pagaendeoppdrag', 'L');          // valgfri

        // Valider kritiske kolonner
        const missingPagaende = [];
        if (startTimeIndex === -1) missingPagaende.push("'Start' (hentetid)");
        if (oppTidIndex    === -1) missingPagaende.push("'Oppmøtetid'");
        if (fromIndex      === -1) missingPagaende.push("'Fra'");
        if (toIndex        === -1) missingPagaende.push("'Til'");

        if (missingPagaende.length > 0) {
            showErrorToast(`❌ Mangler kolonne(r) på pågående oppdrag: ${missingPagaende.join(', ')}. Vennligst legg til i tabellen.`);
            return null; // signal: kolonne-feil
        }

        const rows = document.querySelectorAll('#pagaendeoppdrag tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            const resource = cells[1]?.textContent.trim();
            const rowId = row.id.replace('P-', '');
            
            // Sjekk om ressursen har flere bestillinger (row-image divs)
            const rowImageDivs = cells[startTimeIndex]?.querySelectorAll('div.row-image');
            
            if (rowImageDivs && rowImageDivs.length > 0) {
                // Ressurs med flere bestillinger
                rowImageDivs.forEach((div, index) => {
                    const tripStartTime     = cells[startTimeIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const tripTreatmentTime = cells[oppTidIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const patientName       = nameIndex !== -1
                        ? (cells[nameIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '(Ukjent)')
                        : '(Ukjent)';
                    const fromAddress       = cells[fromIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const toAddress         = cells[toIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                    const status            = statusIndex !== -1
                        ? (cells[statusIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '(Ukjent)')
                        : '(Ukjent)';
                    const behov             = behovIndex !== -1
                        ? (cells[behovIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '')
                        : '';
                    const ledsager          = ledsagerIndex !== -1
                        ? (cells[ledsagerIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '')
                        : '';
                    
                    const reqId = rowId + '-' + index;
                    
                    const order = {
                        id: reqId,
                        rowId: rowId,
                        resource,
                        patientName,
                        tripStartTime,
                        tripTreatmentTime,
                        behov,
                        ledsager,
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
                const tripStartTime     = cells[startTimeIndex]?.textContent.trim();
                const tripTreatmentTime = cells[oppTidIndex]?.textContent.trim();
                const patientName       = nameIndex   !== -1 ? (cells[nameIndex]?.textContent.trim()   || '(Ukjent)') : '(Ukjent)';
                const fromAddress       = cells[fromIndex]?.textContent.trim();
                const toAddress         = cells[toIndex]?.textContent.trim();
                const status            = statusIndex !== -1 ? (cells[statusIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
                const behov             = behovIndex  !== -1 ? (cells[behovIndex]?.textContent.trim()  || '') : '';
                const ledsager          = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
                
                const order = {
                    id: rowId,
                    rowId: rowId,
                    resource,
                    patientName,
                    tripStartTime,
                    tripTreatmentTime,
                    behov,
                    ledsager,
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

    // Funksjon for å hente merket ressurs (hvis noen)
    // Merkede ressurser har inline style med background-color: rgb(148, 169, 220)
    function getSelectedResourceOppdrag() {
        const rows = document.querySelectorAll('#pagaendeoppdrag tbody tr');
        
        for (const row of rows) {
            const bgColor = row.style.backgroundColor;
            if (bgColor === 'rgb(148, 169, 220)') {
                // Fant merket ressurs — parse alle dens bookinger
                const rowId = row.id.replace('P-', '');
                const cells = row.querySelectorAll('td');
                const resource = cells[1]?.textContent.trim();
                
                // Samme parsing som getPaagaendeOppdrag
                const startTimeIndex = findColumnIndex('#pagaendeoppdrag', 'tripStartTime');
                const oppTidIndex    = findColumnIndex('#pagaendeoppdrag', 'tripTreatmentDate');
                const nameIndex      = findColumnIndex('#pagaendeoppdrag', 'patientName');
                const fromIndex      = findColumnIndex('#pagaendeoppdrag', 'tripFromAddress');
                const toIndex        = findColumnIndex('#pagaendeoppdrag', 'tripToAddress');
                const statusIndex    = findColumnIndex('#pagaendeoppdrag', 'resourceStatus');
                const behovIndex     = findColumnIndexByText('#pagaendeoppdrag', 'Behov');
                const ledsagerIndex  = findColumnIndexByText('#pagaendeoppdrag', 'L');
                
                const bookings = [];
                const rowImageDivs = cells[startTimeIndex]?.querySelectorAll('div.row-image');
                
                if (rowImageDivs && rowImageDivs.length > 0) {
                    // Multi-booking
                    rowImageDivs.forEach((div, index) => {
                        const tripStartTime     = cells[startTimeIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                        const tripTreatmentTime = cells[oppTidIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                        const patientName       = nameIndex !== -1
                            ? (cells[nameIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '(Ukjent)')
                            : '(Ukjent)';
                        const fromAddress       = cells[fromIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                        const toAddress         = cells[toIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim();
                        const status            = statusIndex !== -1
                            ? (cells[statusIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '(Ukjent)')
                            : '(Ukjent)';
                        const behov             = behovIndex !== -1
                            ? (cells[behovIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '')
                            : '';
                        const ledsager          = ledsagerIndex !== -1
                            ? (cells[ledsagerIndex]?.querySelectorAll('div.row-image')[index]?.textContent.trim() || '')
                            : '';
                        
                        const reqId = rowId + '-' + index;
                        
                        const order = {
                            id: reqId,
                            rowId: rowId,
                            resource,
                            patientName,
                            tripStartTime,
                            tripTreatmentTime,
                            behov,
                            ledsager,
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
                        
                        bookings.push(normalizeReturnTrip(order));
                    });
                } else {
                    // Single booking
                    const tripStartTime     = cells[startTimeIndex]?.textContent.trim();
                    const tripTreatmentTime = cells[oppTidIndex]?.textContent.trim();
                    const patientName       = nameIndex   !== -1 ? (cells[nameIndex]?.textContent.trim()   || '(Ukjent)') : '(Ukjent)';
                    const fromAddress       = cells[fromIndex]?.textContent.trim();
                    const toAddress         = cells[toIndex]?.textContent.trim();
                    const status            = statusIndex !== -1 ? (cells[statusIndex]?.textContent.trim() || '(Ukjent)') : '(Ukjent)';
                    const behov             = behovIndex  !== -1 ? (cells[behovIndex]?.textContent.trim()  || '') : '';
                    const ledsager          = ledsagerIndex !== -1 ? (cells[ledsagerIndex]?.textContent.trim() || '') : '';
                    
                    const order = {
                        id: rowId,
                        rowId: rowId,
                        resource,
                        patientName,
                        tripStartTime,
                        tripTreatmentTime,
                        behov,
                        ledsager,
                        fromAddress,
                        toAddress,
                        status,
                        postnrHent: parsePostnummer(fromAddress),
                        postnrLever: parsePostnummer(toAddress),
                        startDateTime: parseDateTime(tripStartTime),
                        treatmentDateTime: parseDateTime(tripTreatmentTime),
                        multiBooking: false
                    };
                    
                    bookings.push(normalizeReturnTrip(order));
                }
                
                return {
                    resource,
                    rowId,
                    bookings
                };
            }
        }
        
        return null; // Ingen merket ressurs
    }

    // ============================================================
    // NY FUNKSJON: Identifiser separate tidssegmenter
    // Bestillinger som overlapper tidsmessig grupperes i samme segment
    // ============================================================
    // ============================================================
    // NY FUNKSJON: Identifiser separate tidssegmenter
    // Bestillinger som overlapper tidsmessig grupperes i samme segment
    // OPPDATERT: Sub-grupper basert på destinasjon hvis postnr varierer mye
    // ============================================================
    function identifyTimeSegments(resourceBookings) {
        // Filtrer kun bestillinger til behandling (ikke returer)
        const toTreatment = resourceBookings.filter(b => !b.isReturnTrip);
        
        console.log(`\n📋 identifyTimeSegments kalles med ${resourceBookings.length} totale bookinger, ${toTreatment.length} til behandling`);
        toTreatment.forEach((b, i) => {
            console.log(`  Booking ${i+1}: ${b.tripStartTime} → ${b.tripTreatmentTime} (→${b.postnrLever}) | startDateTime: ${b.startDateTime}, treatmentDateTime: ${b.treatmentDateTime}`);
        });
        
        if (toTreatment.length === 0) {
            return [];
        }
        
        // Sorter bestillinger etter startDateTime
        const sortedBookings = [...toTreatment].sort((a, b) => a.startDateTime - b.startDateTime);
        
        console.log(`\n📊 Etter sortering på startDateTime:`);
        sortedBookings.forEach((b, i) => {
            console.log(`  ${i+1}. ${b.tripStartTime} → ${b.postnrLever} (${b.startDateTime.toISOString()})`);
        });
        
        const segments = [];
        let currentSegment = [sortedBookings[0]];
        
        // Beregn leveringsvindu for første bestilling
        let currentTimeBuffer = isLongTrip(sortedBookings[0].postnrHent, sortedBookings[0].postnrLever)
            ? LONG_DISTANCE_TIME_BUFFER 
            : SHORT_DISTANCE_TIME_BUFFER;
        let currentEarliest = new Date(sortedBookings[0].treatmentDateTime.getTime() - (currentTimeBuffer * 60 * 1000));
        let currentLatest = sortedBookings[0].treatmentDateTime;
        
        // Hold styr på faktisk sluttid for segmentet (siste treatmentDateTime)
        let currentSegmentEnd = sortedBookings[0].treatmentDateTime;
        
        console.log(`\n🔨 Starter segment 1 med booking: ${sortedBookings[0].tripStartTime} → ${sortedBookings[0].postnrLever}`);
        console.log(`   Initial vindu: ${currentEarliest.toTimeString().substr(0,5)} - ${currentLatest.toTimeString().substr(0,5)}`);
        console.log(`   Segment sluttid (treatmentDateTime): ${currentSegmentEnd.toTimeString().substr(0,5)}`);
        
        // Gå gjennom resten av bestillingene
        for (let i = 1; i < sortedBookings.length; i++) {
            const booking = sortedBookings[i];
            const timeBuffer = isLongTrip(booking.postnrHent, booking.postnrLever)
                ? LONG_DISTANCE_TIME_BUFFER 
                : SHORT_DISTANCE_TIME_BUFFER;
            
            const bookingEarliest = new Date(booking.treatmentDateTime.getTime() - (timeBuffer * 60 * 1000));
            const bookingLatest = booking.treatmentDateTime;
            
            console.log(`\n   Sjekker booking ${i+1}: ${booking.tripStartTime} → ${booking.postnrLever}`);
            console.log(`   Booking vindu: ${bookingEarliest.toTimeString().substr(0,5)} - ${bookingLatest.toTimeString().substr(0,5)}`);
            console.log(`   Current segment vindu: ${currentEarliest.toTimeString().substr(0,5)} - ${currentLatest.toTimeString().substr(0,5)}`);
            
            // Sjekk gap i faktisk tidsforbruk
            const gapMinutes = (booking.startDateTime - currentSegmentEnd) / (1000 * 60);
            console.log(`   Gap fra forrige booking slutt (${currentSegmentEnd.toTimeString().substr(0,5)}) til denne start (${booking.startDateTime.toTimeString().substr(0,5)}): ${Math.round(gapMinutes)} min`);
            
            const MIN_GAP_FOR_NEW_SEGMENT = 15;
            
            if (gapMinutes < 0) {
                console.log(`   → Bookingene overlapper i tid (booking starter før forrige slutter) - samme segment`);
            }
            
            if (gapMinutes > MIN_GAP_FOR_NEW_SEGMENT) {
                // Gap funnet - start nytt segment
                segments.push({
                    bookings: currentSegment,
                    earliestDelivery: currentEarliest,
                    latestDelivery: currentLatest
                });
                
                console.log(`   → GAP FUNNET (${Math.round(gapMinutes)} min) - STARTER NYTT SEGMENT`);
                console.log(`📊 Segment ${segments.length}: ${currentSegment.length} bestilling(er), vindu: ${currentEarliest.toTimeString().substr(0,5)} - ${currentLatest.toTimeString().substr(0,5)}`);
                
                currentSegment = [booking];
                currentEarliest = bookingEarliest;
                currentLatest = bookingLatest;
                currentSegmentEnd = booking.treatmentDateTime;
            } else {
                // Legg til i current segment
                currentSegment.push(booking);
                console.log(`   → Legg til i eksisterende segment (nå ${currentSegment.length} bookinger)`);
                
                // Oppdater tidsvinduer
                if (bookingEarliest > currentEarliest) {
                    console.log(`   → Oppdaterer earliest fra ${currentEarliest.toTimeString().substr(0,5)} til ${bookingEarliest.toTimeString().substr(0,5)}`);
                    currentEarliest = bookingEarliest;
                }
                if (bookingLatest < currentLatest) {
                    console.log(`   → Oppdaterer latest fra ${currentLatest.toTimeString().substr(0,5)} til ${bookingLatest.toTimeString().substr(0,5)}`);
                    currentLatest = bookingLatest;
                }
                if (booking.treatmentDateTime > currentSegmentEnd) {
                    currentSegmentEnd = booking.treatmentDateTime;
                }
            }
        }
        
        // Legg til siste segment
        segments.push({
            bookings: currentSegment,
            earliestDelivery: currentEarliest,
            latestDelivery: currentLatest
        });
        
        console.log(`📊 Segment ${segments.length}: ${currentSegment.length} bestilling(er), vindu: ${currentEarliest.toTimeString().substr(0,5)} - ${currentLatest.toTimeString().substr(0,5)}`);
        
        if (segments.length > 1) {
            console.log(`✓ Totalt ${segments.length} separate tidssegmenter identifisert`);
        }
        
        // NYE STEG: Split segmenter basert på destinasjon hvis nødvendig
        const finalSegments = [];
        segments.forEach((segment, segIdx) => {
            if (segment.bookings.length <= 1) {
                finalSegments.push(segment);
                return;
            }
            
            // Sjekk destinasjonsspredning
            const destinations = segment.bookings.map(b => b.postnrLever);
            const minDest = Math.min(...destinations);
            const maxDest = Math.max(...destinations);
            const destSpread = maxDest - minDest;
            
            const DEST_SPLIT_THRESHOLD = 50;
            
            if (destSpread > DEST_SPLIT_THRESHOLD) {
                console.log(`\n🔀 Segment ${segIdx + 1} har stor spredning i destinasjoner (${minDest}-${maxDest}, spread: ${destSpread})`);
                console.log(`   → Splitter i sub-segmenter basert på destinasjon...`);
                
                // Grupper bookinger med lignende destinasjoner (±25 postnr)
                const destGroups = [];
                segment.bookings.forEach(booking => {
                    let foundGroup = false;
                    for (const group of destGroups) {
                        const groupAvgDest = group.bookings.reduce((sum, b) => sum + b.postnrLever, 0) / group.bookings.length;
                        if (Math.abs(booking.postnrLever - groupAvgDest) <= 25) {
                            group.bookings.push(booking);
                            foundGroup = true;
                            break;
                        }
                    }
                    
                    if (!foundGroup) {
                        destGroups.push({ bookings: [booking] });
                    }
                });
                
                console.log(`   → Funnet ${destGroups.length} destinasjonsgrupper`);
                
                // Beregn leveringsvindu for hver gruppe
                destGroups.forEach((group, groupIdx) => {
                    let groupEarliest = null;
                    let groupLatest = null;
                    
                    group.bookings.forEach(b => {
                        const buffer = isLongTrip(b.postnrHent, b.postnrLever)
                            ? LONG_DISTANCE_TIME_BUFFER 
                            : SHORT_DISTANCE_TIME_BUFFER;
                        const earliest = new Date(b.treatmentDateTime.getTime() - (buffer * 60 * 1000));
                        const latest = b.treatmentDateTime;
                        
                        if (!groupEarliest || earliest > groupEarliest) {
                            groupEarliest = earliest;
                        }
                        if (!groupLatest || latest < groupLatest) {
                            groupLatest = latest;
                        }
                    });
                    
                    const avgDest = Math.round(group.bookings.reduce((sum, b) => sum + b.postnrLever, 0) / group.bookings.length);
                    console.log(`     Sub-segment ${groupIdx + 1}: ${group.bookings.length} booking(er) til ~${avgDest}, vindu: ${groupEarliest.toTimeString().substr(0,5)} - ${groupLatest.toTimeString().substr(0,5)}`);
                    
                    finalSegments.push({
                        bookings: group.bookings,
                        earliestDelivery: groupEarliest,
                        latestDelivery: groupLatest,
                        destinationArea: avgDest
                    });
                });
            } else {
                finalSegments.push(segment);
            }
        });
        
        if (finalSegments.length > segments.length) {
            console.log(`✓ Totalt ${finalSegments.length} segmenter etter destinasjonssplitting (fra ${segments.length} tidssegmenter)`);
        }
        
        // Filtrer bort ugyldige segmenter
        const validSegments = finalSegments.filter(seg => seg.earliestDelivery <= seg.latestDelivery);
        
        if (validSegments.length < finalSegments.length) {
            console.log(`⚠️ ${finalSegments.length - validSegments.length} ugyldige segment(er) filtrert bort (earliest > latest)`);
        }
        
        return validSegments;
    }

    // ============================================================
    // OPPDATERT: Beregn leveringsvindu per segment
    // Returnerer array av segmenter i stedet for ett enkelt vindu
    // ============================================================
    function calculateActualDeliveryWindow(resourceBookings) {
        const segments = identifyTimeSegments(resourceBookings);
        
        if (segments.length === 0) {
            return null;
        }
        
        // Hvis bare ett segment, returner som før (for bakoverkompatibilitet)
        if (segments.length === 1) {
            return {
                earliestDelivery: segments[0].earliestDelivery,
                latestDelivery: segments[0].latestDelivery,
                bookingsCount: segments[0].bookings.length,
                segments: segments  // Legg til segmentinfo også
            };
        }
        
        // Flere segmenter - returner alle
        return {
            segments: segments,
            multipleSegments: true
        };
    }

    // ============================================================
    // NY FUNKSJON: Sjekk om ventende passer i minst ett segment
    // ============================================================
    function checkVentendeAgainstSegments(ventende, actualWindow) {
        // Beregn ventende sitt leveringsvindu
        const ventendeTimeBuffer = isLongTrip(ventende.postnrHent, ventende.postnrLever)
            ? LONG_DISTANCE_TIME_BUFFER 
            : SHORT_DISTANCE_TIME_BUFFER;
        
        // For returer: kan ikke hentes før startDateTime
        const ventendeEarliest = ventende.isReturnTrip
            ? ventende.startDateTime
            : new Date(ventende.treatmentDateTime.getTime() - (ventendeTimeBuffer * 60 * 1000));
        const ventendeLatest = ventende.treatmentDateTime;
        
        // Hvis bare ett segment (bakoverkompatibilitet)
        if (!actualWindow.multipleSegments) {
            const isPunktVindu = actualWindow.earliestDelivery.getTime() === actualWindow.latestDelivery.getTime();
            
            const overlaps = ventendeEarliest <= actualWindow.latestDelivery && 
                            actualWindow.earliestDelivery <= ventendeLatest;
            
            if (overlaps) {
                if (isPunktVindu) {
                    console.log(`  ✓ Ventende passer i punkt-vinduet (${actualWindow.earliestDelivery.toTimeString().substr(0,5)}) - ressurs MÅ levere nøyaktig på dette tidspunktet`);
                } else {
                    // Beregn faktisk overlapp i minutter for logging
                    const overlapStart = ventendeEarliest > actualWindow.earliestDelivery 
                        ? ventendeEarliest 
                        : actualWindow.earliestDelivery;
                    const overlapEnd = ventendeLatest < actualWindow.latestDelivery 
                        ? ventendeLatest 
                        : actualWindow.latestDelivery;
                    const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);
                    
                    console.log(`  ✓ Ventende passer i leveringsvinduet (${Math.round(overlapMinutes)} min overlapp): ${actualWindow.earliestDelivery.toTimeString().substr(0,5)} - ${actualWindow.latestDelivery.toTimeString().substr(0,5)}`);
                }
                
                return {
                    matches: true,
                    matchedSegment: {
                        earliestDelivery: actualWindow.earliestDelivery,
                        latestDelivery: actualWindow.latestDelivery,
                        bookingsCount: actualWindow.bookingsCount,
                        segmentNumber: 1
                    }
                };
            }
            return { matches: false };
        }
        
        // Flere segmenter - sjekk mot hvert segment
        console.log(`  🔍 Sjekker ventende (${ventendeEarliest.toTimeString().substr(0,5)} - ${ventendeLatest.toTimeString().substr(0,5)}, →${ventende.postnrLever}) mot ${actualWindow.segments.length} segmenter:`);
        
        for (let i = 0; i < actualWindow.segments.length; i++) {
            const segment = actualWindow.segments[i];
            const isPunktVindu = segment.earliestDelivery.getTime() === segment.latestDelivery.getTime();
            
            // Sjekk destinasjon hvis segmentet har destinationArea definert
            if (segment.destinationArea !== undefined) {
                const destDiff = Math.abs(ventende.postnrLever - segment.destinationArea);
                if (destDiff > 25) {
                    console.log(`    Segment ${i+1} (→~${segment.destinationArea}): ${segment.earliestDelivery.toTimeString().substr(0,5)} - ${segment.latestDelivery.toTimeString().substr(0,5)} → ✗ feil destinasjon (ventende →${ventende.postnrLever}, diff: ${destDiff})`);
                    continue; // Skip dette segmentet - feil destinasjon
                }
            }
            
            const overlaps = ventendeEarliest <= segment.latestDelivery && 
                            segment.earliestDelivery <= ventendeLatest;
            
            if (overlaps) {
                if (isPunktVindu) {
                    const destInfo = segment.destinationArea ? ` →~${segment.destinationArea}` : '';
                    console.log(`    Segment ${i+1}${destInfo}: ${segment.earliestDelivery.toTimeString().substr(0,5)} (punkt-vindu) → ✓ MATCH (ressurs MÅ levere nøyaktig på dette tidspunktet)`);
                } else {
                    // Beregn faktisk overlapp i minutter for logging
                    const overlapStart = ventendeEarliest > segment.earliestDelivery 
                        ? ventendeEarliest 
                        : segment.earliestDelivery;
                    const overlapEnd = ventendeLatest < segment.latestDelivery 
                        ? ventendeLatest 
                        : segment.latestDelivery;
                    const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60);
                    
                    const destInfo = segment.destinationArea ? ` →~${segment.destinationArea}` : '';
                    console.log(`    Segment ${i+1}${destInfo}: ${segment.earliestDelivery.toTimeString().substr(0,5)} - ${segment.latestDelivery.toTimeString().substr(0,5)} → ✓ MATCH (${Math.round(overlapMinutes)} min overlapp)`);
                }
                
                return {
                    matches: true,
                    matchedSegment: {
                        earliestDelivery: segment.earliestDelivery,
                        latestDelivery: segment.latestDelivery,
                        bookingsCount: segment.bookings.length,
                        segmentNumber: i + 1,
                        totalSegments: actualWindow.segments.length
                    }
                };
            } else {
                if (isPunktVindu) {
                    const destInfo = segment.destinationArea ? ` →~${segment.destinationArea}` : '';
                    console.log(`    Segment ${i+1}${destInfo}: ${segment.earliestDelivery.toTimeString().substr(0,5)} (punkt-vindu) → ✗ ingen overlapp`);
                } else {
                    const destInfo = segment.destinationArea ? ` →~${segment.destinationArea}` : '';
                    console.log(`    Segment ${i+1}${destInfo}: ${segment.earliestDelivery.toTimeString().substr(0,5)} - ${segment.latestDelivery.toTimeString().substr(0,5)} → ✗ ingen overlapp`);
                }
            }
        }
        
        console.log(`  ✗ Ventende passer ikke i noen av segmentene`);
        return { matches: false };
    }

    // Funksjon for å sjekke om to bestillinger kan samkjøres
    function checkSamkjoring(ventende, pagaende) {
        // ============================================================
        // BLOKKERINGS-SJEKK
        // ============================================================
        if (isBlockedCombination(ventende, pagaende)) {
            const debug = true;
            if (debug) {
                console.log('=== checkSamkjoring ===');
                console.log('Ventende:', ventende.postnrHent, '→', ventende.postnrLever, ventende.tripStartTime);
                console.log('Ressurs:', pagaende.postnrHent, '→', pagaende.postnrLever, pagaende.tripStartTime);
                console.log('🚫 BLOKKERT: Denne kombinasjonen er på blokkeringslisten');
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
        
        // ============================================================
        // WHITELIST-SJEKK: Overstyrer normal match-logikk
        // ============================================================
        const whitelisted = isWhitelistedCombination(ventende, pagaende);
        if (whitelisted) {
            if (debug) console.log('→ ⭐ WHITELISTED kombinasjon funnet — sjekker leveringsvindu');
            
            // For whitelisted kombinasjoner: kun sjekk at leveringsvinduer overlapper
            if (ventende.treatmentDateTime && pagaende.treatmentDateTime) {
                const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
                const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
                
                const ventendeBuffer = isLongTrip(ventende.postnrHent, ventende.postnrLever) ? LONG_DISTANCE_TIME_BUFFER : SHORT_DISTANCE_TIME_BUFFER;
                const pagaendeBuffer = isLongTrip(pagaende.postnrHent, pagaende.postnrLever) ? LONG_DISTANCE_TIME_BUFFER : SHORT_DISTANCE_TIME_BUFFER;
                
                const ventendeTidligst = ventende.isReturnTrip
                    ? ventende.startDateTime
                    : new Date(ventende.treatmentDateTime.getTime() - (ventendeBuffer * 60 * 1000));
                const ventendeSenest = ventende.isReturnTrip
                    ? new Date(ventende.startDateTime.getTime() + (ventendeBuffer * 60 * 1000))
                    : ventende.treatmentDateTime;
                
                const pagaendeTidligst = pagaende.isReturnTrip
                    ? pagaende.startDateTime
                    : new Date(pagaende.treatmentDateTime.getTime() - (pagaendeBuffer * 60 * 1000));
                const pagaendeSenest = pagaende.isReturnTrip
                    ? new Date(pagaende.startDateTime.getTime() + (pagaendeBuffer * 60 * 1000))
                    : pagaende.treatmentDateTime;
                
                if (debug) {
                    console.log('  Ventende leveringsvindu:', ventendeTidligst.toTimeString().substr(0,5), '-', ventendeSenest.toTimeString().substr(0,5));
                    console.log('  Ressurs leveringsvindu:', pagaendeTidligst.toTimeString().substr(0,5), '-', pagaendeSenest.toTimeString().substr(0,5));
                }
                
                const overlapper = ventendeTidligst <= pagaendeSenest && pagaendeTidligst <= ventendeSenest;
                
                if (overlapper) {
                    const overlapStart = ventendeTidligst > pagaendeTidligst ? ventendeTidligst : pagaendeTidligst;
                    const overlapEnd = ventendeSenest < pagaendeSenest ? ventendeSenest : pagaendeSenest;
                    const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                    const tidDiffFraOptimal = Math.abs((pagaende.treatmentDateTime - ventende.treatmentDateTime) / (1000 * 60));
                    
                    if (debug) console.log('  Overlapp:', overlapMinutter, 'min →  ✓ MATCH (whitelist)');
                    
                    return {
                        type: 'samkjøring',
                        timeDiff: Math.round((ventende.startDateTime - pagaende.startDateTime) / (1000 * 60)),
                        absTimeDiff: Math.round(tidDiffFraOptimal),
                        direction: 'whitelist',
                        score: 70 - (tidDiffFraOptimal / 4)
                    };
                }
                
                if (debug) console.log('  Ingen overlapp i leveringsvinduer — ingen match');
            }
            // Hvis ingen overlapp, la normal logikk løpe videre (kan fremdeles matche via andre scenarioer)
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

        // Bestemme tidsbuffer basert på tur-lengde
        const timeBuffer = isLongTrip(ventende.postnrHent, ventende.postnrLever)
            ? LONG_DISTANCE_TIME_BUFFER 
            : SHORT_DISTANCE_TIME_BUFFER;

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

                // Gi bonus for eksakt leveringssted eller hentested match
                let scoreBonus = 0;
                if (ventende.postnrLever === pagaende.postnrLever) {
                    scoreBonus += 10; // +10 poeng for samme leveringssted
                    if (debug) console.log('  Bonus +10 for eksakt leveringssted match');
                }
                if (ventende.postnrHent === pagaende.postnrHent) {
                    scoreBonus += 10; // +10 poeng for samme hentested
                    if (debug) console.log('  Bonus +10 for eksakt hentested match');
                }
                
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
                    score: 100 - absTimeDiff + scoreBonus // Høyere score for mindre tidsdifferanse
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
        
        if (leverPostnrDiff <= POSTNR_TOLERANCE_DELIVERY && hentePostnrDiff <= POSTNR_TOLERANCE_PICKUP) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1A: Nært hente- og leveringssted');
            
            // Spesialtilfelle: Hvis en av turene er lokal (hente = lever), hopp over initial retningssjekk
            const ventendeIsLocal = ventende.postnrHent === ventende.postnrLever;
            const pagaendeIsLocal = pagaende.postnrHent === pagaende.postnrLever;
            
            let passDirectionCheck = ventendeIsLocal || pagaendeIsLocal;
            
            if (!passDirectionCheck) {
                // Sjekk om begge reiser i samme retning
                const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                
                if (debug) {
                    console.log('  Ventende retning:', ventendeRetning);
                    console.log('  Ressurs retning:', pagaendeRetning);
                }
                
                if (pagaendeRetning === ventendeRetning) {
                    passDirectionCheck = true;
                } else {
                    if (debug) console.log('  Forskjellig retning - prøver neste scenario');
                }
            } else {
                if (debug) console.log('  En eller begge er lokale - hopper over retningssjekk');
            }
            
            if (passDirectionCheck) {
                // Sjekk tidsmessig kompatibilitet
                if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime && ventende.treatmentDateTime) {
                    const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                    const leverDiff = (pagaende.treatmentDateTime - ventende.startDateTime) / (1000 * 60);
                    
                    const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
                    const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
                    const bothLong = isLongTrip(ventende.postnrHent, ventende.postnrLever) && isLongTrip(pagaende.postnrHent, pagaende.postnrLever);
                    
                    if (debug) console.log('  Startdiff:', startDiff, 'min, LeverDiff:', leverDiff, 'min, BothLong:', bothLong);
                    
                    if (bothLong) {
                        // === LANGE TURER: Startdiff er ikke relevant — leveringsvinduer avgjør ===
                        const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                        const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                        
                        if (pagaendeRetning !== ventendeRetning) {
                            if (debug) console.log('  Lang tur - forskjellig retning');
                            return null;
                        }
                        
                        // Beregn leveringsvinduer: oppmøtetid ± LONG_DISTANCE_TIME_BUFFER
                        // For returer: kan ikke hentes før startDateTime, kan vente opp til buffer etter start
                        const ventendeTidligst = ventende.isReturnTrip
                            ? ventende.startDateTime
                            : new Date(ventende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const ventendeSenest = ventende.isReturnTrip
                            ? new Date(ventende.startDateTime.getTime() + (LONG_DISTANCE_TIME_BUFFER * 60 * 1000))
                            : ventende.treatmentDateTime;
                        
                        const pagaendeTidligst = pagaende.isReturnTrip
                            ? pagaende.startDateTime
                            : new Date(pagaende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const pagaendeSenest = pagaende.isReturnTrip
                            ? new Date(pagaende.startDateTime.getTime() + (LONG_DISTANCE_TIME_BUFFER * 60 * 1000))
                            : pagaende.treatmentDateTime;
                        
                        if (debug) {
                            console.log('  Ventende leveringsvindu:', ventendeTidligst.toTimeString().substr(0,5), '-', ventendeSenest.toTimeString().substr(0,5));
                            console.log('  Ressurs leveringsvindu:', pagaendeTidligst.toTimeString().substr(0,5), '-', pagaendeSenest.toTimeString().substr(0,5));
                        }
                        
                        const overlapper = ventendeTidligst <= pagaendeSenest && pagaendeTidligst <= ventendeSenest;
                        
                        if (overlapper) {
                            const overlapStart = ventendeTidligst > pagaendeTidligst ? ventendeTidligst : pagaendeTidligst;
                            const overlapEnd = ventendeSenest < pagaendeSenest ? ventendeSenest : pagaendeSenest;
                            const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                            
                            if (debug) console.log('  Overlapp:', overlapMinutter, 'min');
                            
                            if (overlapMinutter >= MIN_OVERLAP_MINUTES) {
                                const tidDiffFraOptimal = Math.abs((pagaende.treatmentDateTime - ventende.treatmentDateTime) / (1000 * 60));
                                
                                let scoreBonus = 0;
                                if (ventende.postnrLever === pagaende.postnrLever) {
                                    scoreBonus = 10;
                                    if (debug) console.log('  Bonus +10 for eksakt leveringssted match');
                                }
                                
                                if (debug) console.log('✓ MATCH i SCENARIO 1A (lang tur)');
                                
                                return {
                                    type: 'samkjøring',
                                    timeDiff: Math.round(startDiff),
                                    absTimeDiff: Math.round(tidDiffFraOptimal),
                                    direction: pagaendeRetning,
                                    score: 65 - (tidDiffFraOptimal / 4) + scoreBonus
                                };
                            }
                        }
                        
                        if (debug) console.log('  Ingen overlapp i leveringsvinduer');
                    } else {
                        // === KORTE TURER: Bruk startdiff-logikk ===
                        if (debug) console.log('  Kort tur - sjekker startdiff');
                        
                        if (startDiff >= -MAX_START_DIFF_SHORT && leverDiff >= 0) {
                            if (debug) console.log('✓ MATCH i SCENARIO 1A (kort tur)');
                            
                            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                            
                            let scoreBonus = 0;
                            if (ventende.postnrLever === pagaende.postnrLever) {
                                scoreBonus = 10;
                                if (debug) console.log('  Bonus +10 for eksakt leveringssted match');
                            }
                            
                            return {
                                type: 'samkjøring',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.abs(Math.round(startDiff)),
                                direction: pagaendeRetning,
                                score: 95 - Math.abs(startDiff) + scoreBonus
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
        if (leverPostnrDiff <= POSTNR_TOLERANCE_DELIVERY && hentePostnrDiff > POSTNR_TOLERANCE_PICKUP) {
            const debug = true; // Sett til true for logging
            if (debug) console.log('→ SCENARIO 1B: Kun nært leveringssted');
            
            const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
            const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
            
            if (debug) {
                console.log('  Ventende postnr-diff:', ventendePostnrDiff);
                console.log('  Ressurs postnr-diff:', pagaendePostnrDiff);
            }
            
            // Begge må være lange turer
            if (isLongTrip(ventende.postnrHent, ventende.postnrLever) && isLongTrip(pagaende.postnrHent, pagaende.postnrLever)) {
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
                        // For returer: kan ikke hentes før startDateTime, kan vente opp til buffer etter start
                        const ventendeTidligst = ventende.isReturnTrip
                            ? ventende.startDateTime
                            : new Date(ventende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const ventendeSenest = ventende.isReturnTrip
                            ? new Date(ventende.startDateTime.getTime() + (LONG_DISTANCE_TIME_BUFFER * 60 * 1000))
                            : ventende.treatmentDateTime;
                        
                        const pagaendeTidligst = pagaende.isReturnTrip
                            ? pagaende.startDateTime
                            : new Date(pagaende.treatmentDateTime.getTime() - (LONG_DISTANCE_TIME_BUFFER * 60 * 1000));
                        const pagaendeSenest = pagaende.isReturnTrip
                            ? new Date(pagaende.startDateTime.getTime() + (LONG_DISTANCE_TIME_BUFFER * 60 * 1000))
                            : pagaende.treatmentDateTime;
                        
                        // Sjekk om tidsvinduer overlapper
                        const overlapper = ventendeTidligst <= pagaendeSenest && pagaendeTidligst <= ventendeSenest;
                        
                        if (debug) console.log('  Tidsvinduer overlapper?', overlapper);
                        
                        if (overlapper) {
                            const overlapStart = ventendeTidligst > pagaendeTidligst ? ventendeTidligst : pagaendeTidligst;
                            const overlapEnd = ventendeSenest < pagaendeSenest ? ventendeSenest : pagaendeSenest;
                            const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                            
                            if (debug) console.log('  Overlapp minutter:', overlapMinutter);
                            
                            // Krev at vinduer overlapper (0 min er OK)
                            if (overlapMinutter >= MIN_OVERLAP_MINUTES) {
                                const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                                const tidDiffFraOptimal = Math.abs((pagaende.treatmentDateTime - ventende.treatmentDateTime) / (1000 * 60));
                                
                                if (debug) console.log('✓ MATCH i SCENARIO 1B');
                                
                                // Gi bonus for eksakt leveringssted match
                                let scoreBonus = 0;
                                if (ventende.postnrLever === pagaende.postnrLever) {
                                    scoreBonus = 10;
                                    if (debug) console.log('  Bonus +10 for eksakt leveringssted match');
                                }
                                
                                return {
                                    type: 'samkjøring',
                                    timeDiff: Math.round(startDiff),
                                    absTimeDiff: Math.round(tidDiffFraOptimal),
                                    direction: startDiff > 0 ? 'fremover' : (startDiff < 0 ? 'bakover' : 'identisk'),
                                    score: 100 - tidDiffFraOptimal + scoreBonus
                                };
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
        if (leverPostnrDiff <= POSTNR_TOLERANCE_DELIVERY && hentePostnrDiff <= POSTNR_TOLERANCE_PICKUP) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1C: Nært hente- og leveringssted (korte turer)');
            
            const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
            const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
            
            if (debug) {
                console.log('  Ventende postnr-diff:', ventendePostnrDiff);
                console.log('  Ressurs postnr-diff:', pagaendePostnrDiff);
            }
            
            // Sjekk om begge er korte turer
            if (!isLongTrip(ventende.postnrHent, ventende.postnrLever) && !isLongTrip(pagaende.postnrHent, pagaende.postnrLever)) {
                // Spesialtilfelle: Hvis en av turene er lokal (hente = lever), hopp over retningssjekk
                const ventendeIsLocal = ventende.postnrHent === ventende.postnrLever;
                const pagaendeIsLocal = pagaende.postnrHent === pagaende.postnrLever;
                
                let sameDirection = true; // Default til sann for lokale turer
                
                if (!ventendeIsLocal && !pagaendeIsLocal) {
                    // Begge har retning - sjekk om samme
                    const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
                    const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
                    sameDirection = (pagaendeRetning === ventendeRetning);
                    
                    if (debug) {
                        console.log('  Ventende retning:', ventendeRetning);
                        console.log('  Ressurs retning:', pagaendeRetning);
                        console.log('  Samme retning?', sameDirection);
                    }
                } else {
                    if (debug) console.log('  En eller begge er lokale - hopper over retningssjekk');
                }
                
                if (sameDirection) {
                    // For korte turer: Bruk 30 min tidsvindu
                    if (pagaende.startDateTime && ventende.startDateTime) {
                        const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                        
                        if (debug) console.log('  Startdiff:', startDiff, 'min');
                        
                        // Tillat ±30 min forskjell
                        if (Math.abs(startDiff) <= SHORT_DISTANCE_TIME_BUFFER) {
                            if (debug) console.log('✓ MATCH i SCENARIO 1C');
                            
                            // Gi bonus for eksakt leveringssted match
                            let scoreBonus = 0;
                            if (ventende.postnrLever === pagaende.postnrLever) {
                                scoreBonus = 10; // +10 poeng for samme leveringssted
                                if (debug) console.log('  Bonus +10 for eksakt leveringssted match');
                            }
                            
                            return {
                                type: 'samkjøring',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.abs(Math.round(startDiff)),
                                direction: startDiff > 0 ? 'fremover' : (startDiff < 0 ? 'bakover' : 'identisk'),
                                score: 100 - Math.abs(startDiff) + scoreBonus
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
        // SCENARIO 1E: Lokale turer - både hente- og leveringssted veldig nært (±10 postnr)
        // Eksempel: Ventende 7725→7725, Ressurs 7715→7725
        // ============================================================
        if (leverPostnrDiff <= POSTNR_TOLERANCE_DELIVERY) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1E: Sjekker lokale turer (hente og lever nært)');
            
            // Sjekk om også hentested er nært (±10)
            if (hentePostnrDiff <= POSTNR_TOLERANCE_PICKUP) {
                if (debug) {
                    console.log('  Hentested diff:', hentePostnrDiff);
                    console.log('  Leveringssted diff:', leverPostnrDiff);
                }
                
                // Begge må være korte turer
                const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
                const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
                
                if (!isLongTrip(ventende.postnrHent, ventende.postnrLever) && !isLongTrip(pagaende.postnrHent, pagaende.postnrLever)) {
                    if (debug) console.log('  Begge korte turer - sjekker tidsvindu');
                    
                    // Sjekk tidsmessig - maks 30 min forskjell på start
                    if (pagaende.startDateTime && ventende.startDateTime) {
                        const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                        
                        if (debug) console.log('  Startdiff:', startDiff, 'min');
                        
                        if (Math.abs(startDiff) <= SHORT_DISTANCE_TIME_BUFFER) {
                            if (debug) console.log('✓ MATCH i SCENARIO 1E (lokale turer)');
                            
                            return {
                                type: 'samkjøring',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.abs(Math.round(startDiff)),
                                direction: startDiff > 0 ? 'fremover' : (startDiff < 0 ? 'bakover' : 'identisk'),
                                score: 90 - Math.abs(startDiff) // Høy score for lokale turer
                            };
                        } else {
                            if (debug) console.log('  Tidsdiff for stor');
                        }
                    }
                } else {
                    if (debug) console.log('  Ikke begge korte turer');
                }
            }
        }
        
        // Begge er lange turer, reiser i samme retning, og tidsperiodene overlapper
        // ============================================================
        // Beregn postnr-differanser for å sjekke om begge er lange turer
        const ventendePostnrDiff_1F = Math.abs(ventende.postnrHent - ventende.postnrLever);
        const pagaendePostnrDiff_1F = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
        
        // Begge må være lange turer, og ingen av dem kan være returer
        if (isLongTrip(ventende.postnrHent, ventende.postnrLever) && 
            isLongTrip(pagaende.postnrHent, pagaende.postnrLever) &&
            !ventende.isReturnTrip && 
            !pagaende.isReturnTrip) {
            const debug = true;
            if (debug) console.log('→ SCENARIO 1F: Lange turer i samme retning med overlappende tidsrom');
            
            // Sjekk retninger
            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
            const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
            
            if (debug) {
                console.log('  Ventende retning:', ventendeRetning);
                console.log('  Ressurs retning:', pagaendeRetning);
            }
            
            // Må reise i samme retning
            if (pagaendeRetning === ventendeRetning) {
                if (debug) console.log('  Samme retning ✓');

                // Sjekk poststed på henteadresse
                const ventendePoststed = parsePoststed(ventende.fromAddress);
                const pagaendePoststed = parsePoststed(pagaende.fromAddress);
                if (debug) console.log('  Poststed hent — ventende:', ventendePoststed, '| ressurs:', pagaendePoststed);

                if (!canSamkjorePoststed(ventendePoststed, pagaendePoststed)) {
                    if (debug) console.log('  Poststed matcher ikke — ikke i samme gruppe');
                } else {
                if (debug) console.log('  Poststed OK ✓');
                
                // Sjekk om tidsperiodene overlapper
                // Overlapp hvis: ventende starter før ressurs leverer OG ressurs starter før ventende leverer
                if (pagaende.startDateTime && ventende.startDateTime && pagaende.treatmentDateTime && ventende.treatmentDateTime) {
                    const ventendeStart = ventende.startDateTime;
                    const ventendeEnd = ventende.treatmentDateTime;
                    const pagaendeStart = pagaende.startDateTime;
                    const pagaendeEnd = pagaende.treatmentDateTime;
                    
                    const overlapper = ventendeStart < pagaendeEnd && pagaendeStart < ventendeEnd;
                    
                    if (debug) {
                        console.log('  Ventende:', ventendeStart.toTimeString().substr(0,5), '→', ventendeEnd.toTimeString().substr(0,5));
                        console.log('  Ressurs:', pagaendeStart.toTimeString().substr(0,5), '→', pagaendeEnd.toTimeString().substr(0,5));
                        console.log('  Tidsrom overlapper?', overlapper);
                    }
                    
                    if (overlapper) {
                        // Beregn overlapp-vindu
                        const overlapStart = ventendeStart > pagaendeStart ? ventendeStart : pagaendeStart;
                        const overlapEnd = ventendeEnd < pagaendeEnd ? ventendeEnd : pagaendeEnd;
                        const overlapMinutter = (overlapEnd - overlapStart) / (1000 * 60);
                        
                        if (debug) console.log('  Overlapp:', overlapMinutter, 'min');
                        
                        // Krav: den som reiser lengre (største postnr-diff) må levere LATER
                        // enn den som reiser kortere. Maks 3 timer (180 min) forskjell.
                        const leveringsDiff = (pagaendeEnd - ventendeEnd) / (1000 * 60); // positiv = ressurs leverer later
                        const absLeveringsDiff = Math.abs(leveringsDiff);
                        
                        // Hvem reiser lengre?
                        const ventendeReiserLengre = ventendePostnrDiff_1F > pagaendePostnrDiff_1F;
                        const pagaendeReiserLengre = pagaendePostnrDiff_1F > ventendePostnrDiff_1F;
                        
                        // Den som reiser lengre må levere later (eller like tid ved like distanse)
                        let leveringsrekkefølgeOK = true;
                        if (ventendeReiserLengre && leveringsDiff > 0) {
                            // Ventende reiser lengre men ressurs leverer later → feil
                            leveringsrekkefølgeOK = false;
                        } else if (pagaendeReiserLengre && leveringsDiff < 0) {
                            // Ressurs reiser lengre men ventende leverer later → feil
                            leveringsrekkefølgeOK = false;
                        }
                        
                        if (debug) {
                            console.log('  Ventende distanse:', ventendePostnrDiff_1F, '| Ressurs distanse:', pagaendePostnrDiff_1F);
                            console.log('  LeveringsDiff:', leveringsDiff, 'min (positiv = ressurs later)');
                            console.log('  Leveringsrekkefølge OK?', leveringsrekkefølgeOK);
                        }
                        
                        if (leveringsrekkefølgeOK && absLeveringsDiff <= 180) {
                            if (debug) console.log('✓ MATCH i SCENARIO 1F');
                            
                            const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                            
                            return {
                                type: 'samkjøring',
                                scenario: '1F',
                                timeDiff: Math.round(startDiff),
                                absTimeDiff: Math.round(absLeveringsDiff),
                                direction: pagaendeRetning,
                                score: 70 - (absLeveringsDiff / 4)
                            };
                        } else {
                            if (debug) console.log('  Leveringsrekkefølge feil eller for stor differanse (>' + 180 + ' min)');
                        }
                    } else {
                        if (debug) console.log('  Tidsrom overlapper ikke');
                    }
                } else {
                    if (debug) console.log('  Mangler tidsinformasjon');
                }
                } // end poststed check
            } else {
                if (debug) console.log('  Forskjellig retning');
            }
        }

        
        // ============================================================
        // SCENARIO 1D: Hentested på veien - samme leveringssted
        // Ventende sitt hentested ligger mellom ressurs sitt hentested og felles leveringssted
        // Eksempel: Ressurs 7620→7603, Ventende 7608→7603 (7608 er mellom 7620 og 7603)
        // ============================================================
        if (leverPostnrDiff <= POSTNR_TOLERANCE_DELIVERY) {
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
                        const isShortTrip = !isLongTrip(ventende.postnrHent, ventende.postnrLever);
                        const timeBuffer = isShortTrip ? SHORT_DISTANCE_TIME_BUFFER : LONG_DISTANCE_TIME_BUFFER;
                        
                        if (isShortTrip) {
                            // Kort tur: Maks 30 min tidlig levering
                            // For returer: kan ikke hentes før startDateTime
                            const ventendeTidligstLevering = ventende.isReturnTrip
                                ? ventende.startDateTime
                                : new Date(ventende.treatmentDateTime.getTime() - (timeBuffer * 60 * 1000));
                            const leveringOK = pagaende.treatmentDateTime >= ventendeTidligstLevering && pagaende.treatmentDateTime <= ventende.treatmentDateTime;
                            
                            if (debug) {
                                console.log('  Kort tur - ventende kan leveres:', ventendeTidligstLevering.toTimeString().substr(0,5), '-', ventende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Ressurs leverer:', pagaende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Levering OK?', leveringOK);
                            }
                            
                            if (leveringOK && startDiff >= -timeBuffer) {
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
                            // Lang tur: Maks 120 min tidlig levering
                            // For returer: kan ikke hentes før startDateTime
                            const ventendeTidligstLevering = ventende.isReturnTrip
                                ? ventende.startDateTime
                                : new Date(ventende.treatmentDateTime.getTime() - (timeBuffer * 60 * 1000));
                            const leveringOK = pagaende.treatmentDateTime >= ventendeTidligstLevering && pagaende.treatmentDateTime <= ventende.treatmentDateTime;
                            
                            if (debug) {
                                console.log('  Lang tur - ventende kan leveres:', ventendeTidligstLevering.toTimeString().substr(0,5), '-', ventende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Ressurs leverer:', pagaende.treatmentDateTime.toTimeString().substr(0,5));
                                console.log('  Levering OK?', leveringOK);
                            }
                            
                            if (leveringOK && startDiff >= -timeBuffer) {
                                if (debug) console.log('✓ MATCH i SCENARIO 1D (lang tur)');
                                
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
        // SCENARIO 2: Retur-tur - nært hentested (begge returer, innen ±POSTNR_TOLERANCE_PICKUP)
        // ============================================================
        if (Math.abs(ventende.postnrHent - pagaende.postnrHent) <= POSTNR_TOLERANCE_PICKUP && ventende.isReturnTrip && pagaende.isReturnTrip) {
            const debug = true;
            
            // Sjekk blokkeringsliste for retur-samkjøring
            if (isBlockedReturnCombination(ventende, pagaende)) {
                if (debug) console.log('  ✗ Blokkert retur-kombinasjon (Scenario 2)');
                return null;
            }
            const pagaendeRetning = pagaende.postnrLever > pagaende.postnrHent ? 'nord' : 'sør';
            const ventendeRetning = ventende.postnrLever > ventende.postnrHent ? 'nord' : 'sør';
            
            if (pagaendeRetning !== ventendeRetning) {
                return null;
            }
            
            const bothLong = isLongTrip(pagaende.postnrHent, pagaende.postnrLever) &&
                             isLongTrip(ventende.postnrHent, ventende.postnrLever);
            const timeBuffer = bothLong ? LONG_DISTANCE_TIME_BUFFER : SHORT_DISTANCE_TIME_BUFFER;
            
            if (pagaende.startDateTime && ventende.startDateTime) {
                const startDiff = (ventende.startDateTime - pagaende.startDateTime) / (1000 * 60);
                
                if (bothLong) {
                    // Lange returer: ressurs kan vente opp til buffer etter sin start på ventende
                    // Ventende kan starte fra ressursens startDateTime og opp til buffer etter
                    // dvs. startDiff (ventende - ressurs) skal være mellom 0 og +buffer
                    // Tillat litt slack bakover (10 min) for å dekke avrundinger
                    const minDiff = -timeBuffer; // (Tidligere 10) Ventende kan maks 10 min før ressurs
                    const maxDiff = timeBuffer; // Ventende kan maks buffer min etter ressurs
                    
                    if (startDiff >= minDiff && startDiff <= maxDiff) {
                        if (debug) console.log('✓ MATCH i SCENARIO 2 (lang tur), startdiff:', startDiff, 'min');
                        return {
                            type: 'samkjøring',
                            timeDiff: Math.round(startDiff),
                            absTimeDiff: Math.abs(Math.round(startDiff)),
                            direction: pagaendeRetning,
                            score: 70 - Math.abs(startDiff) / 4
                        };
                    } else {
                        if (debug) console.log('  Startdiff', startDiff, 'min utenfor vindu [' + minDiff + ', ' + maxDiff + '] - ingen match');
                    }
                } else {
                    // Korte returer: på-veien-sjekk + 30 min buffer
                    let erPaaVeien = false;
                    
                    if (pagaendeRetning === 'nord') {
                        erPaaVeien = pagaende.postnrHent < ventende.postnrLever && ventende.postnrLever < pagaende.postnrLever;
                    } else {
                        erPaaVeien = pagaende.postnrHent > ventende.postnrLever && ventende.postnrLever > pagaende.postnrLever;
                    }
                    
                    if (!erPaaVeien) {
                        if (debug) console.log('  Hentested ikke på veien');
                        return null;
                    }
                    
                    if (Math.abs(startDiff) <= timeBuffer) {
                        if (debug) console.log('✓ MATCH i SCENARIO 2 (kort tur), startdiff:', startDiff, 'min');
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
        }
        
        return null;
    }

    // Funksjon for å sjekke returutnyttelse (motsatt rute)
    function checkReturutnyttelse(ventende, pagaende) {
        // Ventende må være en retur for at dette skal gi mening
        if (!ventende.isReturnTrip) {
            return null;
        }

        // Blokkering spesifisert for returutnyttelse
        if (isBlockedReturnCombination(ventende, pagaende)) {
            return null;
        }
        
        const pagaendePostnrDiff = Math.abs(pagaende.postnrHent - pagaende.postnrLever);
        const ventendePostnrDiff = Math.abs(ventende.postnrHent - ventende.postnrLever);
        
        // Sjekk om begge er lange turer ELLER korte turer
        const bothLong = isLongTrip(pagaende.postnrHent, pagaende.postnrLever) && 
                        isLongTrip(ventende.postnrHent, ventende.postnrLever);
        const bothShort = !isLongTrip(pagaende.postnrHent, pagaende.postnrLever) && 
                         !isLongTrip(ventende.postnrHent, ventende.postnrLever);
        
        if (!bothLong && !bothShort) {
            // En lang og en kort - ikke returutnyttelse
            return null;
        }
        
        // Sjekk returutnyttelse:
        // 1. Ventende hentes nær der ressurs leverer (±10 postnr)
        // 2. De reiser i MOTSATT retning (ressurs gikk sør, retur går nord eller vice versa)
        const henteMatcherLever = Math.abs(ventende.postnrHent - pagaende.postnrLever)  <= POSTNR_TOLERANCE_DELIVERY;
        
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

        // Bestem tidsvindu basert på om det er lang eller kort tur
        const waitBuffer = bothLong ? LONG_DISTANCE_TIME_BUFFER : SHORT_DISTANCE_TIME_BUFFER;

        if (pagaende.treatmentDateTime && ventende.startDateTime) {
            // Tid fra ressurs leverer til ventende retur skal hentes
            const timeDiffMinutes = (ventende.startDateTime - pagaende.treatmentDateTime) / (1000 * 60);
            
            // Sjekk om ventetiden er innenfor buffer
            // For korte turer: maks 30 min
            // For lange turer: maks 120 min
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
                
                // Bonus for eksakt postnr-match (speilet: hent↔lever)
                let scoreBonus = 0;
                if (ventende.postnrHent === pagaende.postnrLever) scoreBonus += 10;
                if (ventende.postnrLever === pagaende.postnrHent) scoreBonus += 10;

                return {
                    type: 'returutnyttelse',
                    timeDiff: Math.round(timeDiffMinutes),
                    absTimeDiff: Math.abs(Math.round(timeDiffMinutes)),
                    direction: 'retur',
                    waitDescription: waitDescription,
                    score: 80 - Math.abs(timeDiffMinutes) + scoreBonus
                };
            }
        }

        return null;
    }

    // Funksjon for å finne kandidater
    function findCandidates(ventendeList) {
        const pagaendeList = getPaagaendeOppdrag();
        const results = [];

        // null = kolonne-validering feilt (toast er allerede vist)
        if (pagaendeList === null) return null;

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
                        scenario: match.scenario,
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
            // For ressurser med flere bestillinger: valider mot faktisk leveringsvindu
            const candidates = Array.from(resourceMatches.values())
                .filter(r => {
                    console.log(`\n🔎 Validerer ressurs: ${r.resource}`);
                    console.log(`   Totalt bookinger: ${r.bookings.length}, hasMatch: ${r.hasMatch}`);
                    
                    if (!r.hasMatch) {
                        console.log(`   ✗ Ingen match - filtreres bort`);
                        return false;
                    }
                    
                    // Hvis ressursen har flere bestillinger til behandling, sjekk faktisk vindu
                    const toTreatmentBookings = r.bookings.filter(b => !b.isReturnTrip);
                    console.log(`   Bestillinger til behandling (ikke returer): ${toTreatmentBookings.length}`);
                    
                    if (toTreatmentBookings.length > 1) {
                        console.log(`   → Ressurs har flere bestillinger, kjører segment-validering...`);
                        
                        // Hvis match er på en retur (ressurs er retur), returutnyttelse (ventende er retur),
                        // eller overlappende tidsrom (scenario 1F), er matchen uavhengig av andre bestillinger.
                        const hasMatchOnReturn = r.bookings.some(b => b.hasMatch && b.isReturnTrip);
                        const hasMatchReturutnyttelse = r.bookings.some(b => b.hasMatch && b.matchType === 'returutnyttelse');
                        const hasMatchOverlappingTime = r.bookings.some(b => b.hasMatch && b.scenario === '1F');
                        
                        console.log(`   Match-typer: retur=${hasMatchOnReturn}, returutnyttelse=${hasMatchReturutnyttelse}, overlappende(1F)=${hasMatchOverlappingTime}`);
                        
                        if (hasMatchOnReturn || hasMatchReturutnyttelse || hasMatchOverlappingTime) {
                            console.log(`   ✓ Spesiell match-type - godkjennes uten segment-validering`);
                            return true;
                        }
                        
                        const actualWindow = calculateActualDeliveryWindow(r.bookings);
                        
                        if (!actualWindow) {
                            console.log(`   ✗ Kunne ikke beregne gyldig leveringsvindu - filtreres bort`);
                            return false;
                        }
                        
                        // Sjekk om ventende passer i minst ett segment
                        const segmentCheck = checkVentendeAgainstSegments(ventende, actualWindow);
                        
                        if (!segmentCheck.matches) {
                            console.log(`   ✗ Ventende passer ikke i noen segmenter - filtreres bort`);
                            return false;
                        }
                        
                        console.log(`   ✓ Ventende passer i segment ${segmentCheck.matchedSegment.segmentNumber} - godkjennes!`);
                        
                        // Oppdater alle matches med info om hvilket segment de matcher
                        r.bookings.forEach(booking => {
                            if (booking.hasMatch) {
                                booking.actualWindowInfo = {
                                    earliest: segmentCheck.matchedSegment.earliestDelivery,
                                    latest: segmentCheck.matchedSegment.latestDelivery,
                                    bookingsCount: segmentCheck.matchedSegment.bookingsCount,
                                    segmentNumber: segmentCheck.matchedSegment.segmentNumber,
                                    totalSegments: segmentCheck.matchedSegment.totalSegments || 1
                                };
                            }
                        });
                    } else {
                        console.log(`   → Bare én bestilling til behandling - godkjennes direkte`);
                    }
                    
                    return true;
                })
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

    // Funksjon for å finne kandidater for en merket ressurs (replanlegging)
    // Behandler ressursens bookinger som "ventende", søker blant ANDRE ressurser
    function findCandidatesForResource(selectedResource) {
        const pagaendeList = getPaagaendeOppdrag();
        
        if (pagaendeList === null) return null;
        
        // Filtrer bort den merkede ressursen selv
        const otherResources = pagaendeList.filter(p => p.rowId !== selectedResource.rowId);
        
        if (otherResources.length === 0) {
            showErrorToast('🚐 Ingen andre ressurser funnet å sammenligne med.');
            return null;
        }
        
        // Bygg én Map per target-ressurs som samler alle matches
        const resourceMatches = new Map();
        
        // For hver booking på den merkede ressursen
        selectedResource.bookings.forEach(ventende => {
            // Søk blant alle andre ressurser
            otherResources.forEach(pagaende => {
                const match = checkSamkjoring(ventende, pagaende);
                
                if (match) {
                    const key = pagaende.resource;
                    
                    // Initialiser ressurs hvis den ikke finnes
                    if (!resourceMatches.has(key)) {
                        resourceMatches.set(key, {
                            resource: pagaende.resource,
                            rowId: pagaende.rowId,
                            bookings: [],
                            matches: [],  // Liste over alle source-bookinger som matcher
                            bestScore: 0
                        });
                    }
                    
                    const resourceData = resourceMatches.get(key);
                    resourceData.bestScore = Math.max(resourceData.bestScore, match.score);
                    
                    // Legg til den matchende source-bookingen (fra selected resource)
                    resourceData.matches.push({
                        sourceBooking: ventende,
                        matchType: match.type,
                        scenario: match.scenario,
                        score: match.score,
                        timeDiff: match.timeDiff,
                        absTimeDiff: match.absTimeDiff,
                        direction: match.direction,
                        waitDescription: match.waitDescription
                    });
                    
                    // Legg til target-ressursens booking hvis ikke allerede der
                    const alreadyHasBooking = resourceData.bookings.some(b => b.id === pagaende.id);
                    if (!alreadyHasBooking) {
                        resourceData.bookings.push({
                            ...pagaende,
                            matchType: match.type,
                            scenario: match.scenario,
                            timeDiff: match.timeDiff,
                            absTimeDiff: match.absTimeDiff,
                            direction: match.direction,
                            waitDescription: match.waitDescription,
                            score: match.score,
                            hasMatch: true
                        });
                    }
                }
            });
        });
        
        // ============================================================
        // VALIDERING: Sjekk om hver match faktisk passer i target-ressursens leveringsvindu
        // Dette håndterer multi-drop scenarios og destinasjonssplitting
        // ============================================================
        
        // Først: Hent pagaendeList for å få ALLE bookinger per ressurs
        const allPagaende = getPaagaendeOppdrag();
        
        resourceMatches.forEach((resourceData, key) => {
            // Hent ALLE bookinger for target-ressursen (ikke bare de som matchet)
            const allTargetBookings = allPagaende ? allPagaende.filter(p => p.rowId === resourceData.rowId) : [];
            
            if (allTargetBookings.length === 0) {
                console.log(`\n⚠️ Kunne ikke finne bookinger for ressurs ${resourceData.resource}`);
                resourceMatches.delete(key);
                return;
            }
            
            // Sjekk om alle matches er returutnyttelse - da hopper vi over validering
            const allMatchesAreReturutnyttelse = resourceData.matches.every(m => m.matchType === 'returutnyttelse');
            
            if (allMatchesAreReturutnyttelse) {
                console.log(`\n✓ Alle matches er returutnyttelse - hopper over segment-validering`);
                // Ingen validering nødvendig for returutnyttelse
                return;
            }
            
            const toTreatmentBookings = allTargetBookings.filter(b => !b.isReturnTrip);
            
            if (toTreatmentBookings.length > 1) {
                console.log(`\n🔎 Validerer target-ressurs: ${resourceData.resource} (${toTreatmentBookings.length} bookinger til behandling)`);
                
                // Beregn leveringsvindu basert på ALLE bookingene
                const actualWindow = calculateActualDeliveryWindow(allTargetBookings);
                
                if (!actualWindow) {
                    console.log(`  ✗ Kunne ikke beregne gyldig leveringsvindu - filtreres bort`);
                    resourceMatches.delete(key);
                    return;
                }
                
                // Valider hver source-booking mot target-ressursens segmenter
                const validatedMatches = [];
                
                resourceData.matches.forEach(matchInfo => {
                    const sourceBooking = matchInfo.sourceBooking;
                    
                    console.log(`\n  Validerer source-booking: ${sourceBooking.navn} (${sourceBooking.tripStartTime} → ${sourceBooking.tripTreatmentTime}, →${sourceBooking.postnrLever})`);
                    
                    const segmentCheck = checkVentendeAgainstSegments(sourceBooking, actualWindow);
                    
                    if (segmentCheck.matches) {
                        console.log(`    ✓ Passer i segment ${segmentCheck.matchedSegment.segmentNumber}`);
                        validatedMatches.push({
                            ...matchInfo,
                            segmentInfo: {
                                segmentNumber: segmentCheck.matchedSegment.segmentNumber,
                                totalSegments: segmentCheck.matchedSegment.totalSegments || 1,
                                earliestDelivery: segmentCheck.matchedSegment.earliestDelivery,
                                latestDelivery: segmentCheck.matchedSegment.latestDelivery
                            }
                        });
                    } else {
                        console.log(`    ✗ Passer ikke i noen segmenter - filtreres bort`);
                    }
                });
                
                // Hvis ingen matches validerte, fjern hele target-ressursen
                if (validatedMatches.length === 0) {
                    console.log(`  ✗ Ingen validerte matches - ressurs filtreres bort`);
                    resourceMatches.delete(key);
                } else {
                    const originalCount = resourceData.matches.length;
                    // Oppdater med kun validerte matches
                    resourceData.matches = validatedMatches;
                    console.log(`  ✓ ${validatedMatches.length} av ${originalCount} matches validert`);
                }
            }
        });
        
        // Konverter til array og sorter etter beste score
        const candidates = Array.from(resourceMatches.values())
            .sort((a, b) => b.bestScore - a.bestScore);
        
        // Returner som én entry med alle kandidater
        // selectedResource inneholder alle source-bookingene
        return {
            selectedResource,  // Original ressurs med alle dens bookinger
            candidates         // Liste over target-ressurser med deres matches
        };
    }


    // Funksjon for å vise resultat popup
    function showResultsPopup(results, isResourceMode = false) {
        // isResourceMode can be: false (ventende), true (ressurs), or 'multi-ventende'
        const isMultiVentende = isResourceMode === 'multi-ventende';
        const isActualResourceMode = isResourceMode === true;
        // Fjern eksisterende popup hvis den finnes
        const existingPopup = document.getElementById('samkjoring-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Opprett popup
        const popup = document.createElement('div');
        popup.id = 'samkjoring-popup';
        
        let html = '<h2 style="margin-top: 0;">🚐 Samkjøringsforslag</h2>';

        // RESSURSMODUS eller MULTI-VENTENDE: Helt annen struktur
        if (isActualResourceMode || isMultiVentende) {
            if (!results || !results.candidates || results.candidates.length === 0) {
                popup.style.cssText = `
                    position: fixed;
                    background: white;
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                `;
                html += '<p>Ingen samkjøringskandidater funnet.</p>';
            } else {
                popup.style.cssText = `
                    position: fixed;
                    background: white;
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    width: fit-content;
                    min-width: 800px;
                    max-width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                `;
                
                // Show source header and ALL bookings
                const headerText = isMultiVentende ? 'Merkede bestillinger:' : 'Merket ressurs:';
                const resourceName = isMultiVentende ? '' : `<p style="margin: 5px 0 10px 0; font-weight: bold; color: #333;">🚐 ${results.selectedResource.resource}</p>`;
                
                html += `
                    <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                        <h3 style="margin-top: 0; color: #0066cc;">${headerText}</h3>
                        ${resourceName}
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background: white;">
                            <tbody>
                                <tr style="background: #f0f8ff;">
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Navn</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hentetid</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Oppmøte</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Behov</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;" title="Antall ledsagere"><strong>L</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Fra</strong></td>
                                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Til</strong></td>
                                </tr>
                `;
                
                // Loop through ALL bookings on the selected resource
                results.selectedResource.bookings.forEach((booking, idx) => {
                    const rowBg = idx % 2 === 0 ? '#fff' : '#f9f9f9';
                    html += `
                                <tr style="background: ${rowBg};">
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.9em;">${booking.patientName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${booking.tripStartTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${booking.tripTreatmentTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${booking.behov || ''}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${booking.ledsager || '-'}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.8em;">${cleanAddressSuffixes(booking.fromAddress)}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.8em;">${cleanAddressSuffixes(booking.toAddress)}</td>
                                </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                        
                        <h4 style="margin-top: 15px; color: #006400;">Potensielle samkjøringer (${results.candidates.length} ressurs${results.candidates.length !== 1 ? 'er' : ''}):</h4>
                `;
                
                // Get pagaendeList once outside the loop
                const pagaendeList = getPaagaendeOppdrag();
                
                // Show each candidate resource
                results.candidates.forEach((candidate, candIdx) => {
                    // Determine badge based on match types
                    const hasReturutnyttelse = candidate.matches && candidate.matches.some(m => m.matchType === 'returutnyttelse');
                    const borderColor = hasReturutnyttelse ? '#9b59b6' : '#28a745';
                    const badgeText = hasReturutnyttelse ? 'RETURUTNYTTELSE' : 'SAMKJØRING';
                    
                    html += `
                        <div style="margin: 15px 0; padding: 12px; background: white; border-left: 4px solid ${borderColor}; border-radius: 3px;">
                            <div style="font-weight: bold; margin-bottom: 10px; font-size: 1.05em; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    ${candIdx + 1}. ${candidate.resource}
                                    <span style="background: ${borderColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">${badgeText}</span>
                                    <span style="color: ${borderColor}; font-size: 0.95em; margin-left: 10px;">Score: ${Math.round(candidate.bestScore)}</span>
                                </div>
                                <div>
                                    <button 
                                        onclick="window.showSamkjoringInMapResource('${results.selectedResource.rowId}', '${candidate.rowId}')"
                                        style="background: #2980b9; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9em; margin-right: 8px; height: 36px;"
                                        onmouseover="this.style.opacity='0.8'"
                                        onmouseout="this.style.opacity='1'"
                                    >
                                        🗺️ Vis i kart
                                    </button>
                                    <button 
                                        onclick="window.selectSamkjoringResourcePair('${results.selectedResource.rowId}', '${candidate.rowId}')"
                                        style="background: ${borderColor}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.9em; height: 36px;"
                                        onmouseover="this.style.opacity='0.8'"
                                        onmouseout="this.style.opacity='1'"
                                    >
                                        🚐 Velg ressurs
                                    </button>
                                </div>
                            </div>
                            
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top: 10px;">
                                <thead>
                                    <tr style="background: #f9f9f9; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Match</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Navn</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Hentetid</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Oppmøte</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Behov</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;" title="Antall ledsagere">L</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Fra</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Til</th>
                                        <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    // Get all bookings for this target resource
                    const allResourceBookings = [];
                    if (pagaendeList) {
                        // For multi-booking resources, there are multiple entries with same rowId
                        // We need to collect ALL of them
                        const allEntriesForResource = pagaendeList.filter(p => p.rowId === candidate.rowId);
                        
                        allEntriesForResource.forEach(entry => {
                            const hasMatch = candidate.bookings && candidate.bookings.some(b => b.id === entry.id);
                            allResourceBookings.push({
                                ...entry,
                                hasMatch
                            });
                        });
                    }
                    
                    // Build table rows
                    allResourceBookings.forEach((booking, bookingIndex) => {
                        const rowBg = bookingIndex % 2 === 0 ? '#fff' : '#f9f9f9';
                        const matchIcon = booking.hasMatch 
                            ? '<span style="color: green; font-weight: bold;">✓</span>'
                            : '<span style="color: #ccc;">-</span>';
                        
                        html += `
                            <tr style="background: ${rowBg}; ${booking.hasMatch ? 'font-weight: 500;' : 'color: #666;'}">
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: left;">${matchIcon}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.9em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${booking.patientName}">${booking.patientName}</td>
                                <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripStartTime}</td>
                                <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripTreatmentTime}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.85em;">${booking.behov || ''}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${booking.ledsager || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(booking.fromAddress)}">${cleanAddressSuffixes(booking.fromAddress)}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(booking.toAddress)}">${cleanAddressSuffixes(booking.toAddress)}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; white-space: nowrap;" title="${booking.status}">${booking.status}</td>
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
            }
        } 
        // VENTENDE MODE: Original structure
        else {
            if (results.length === 0) {
                popup.style.cssText = `
                    position: fixed;
                    background: white;
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                `;
                html += '<p>Ingen samkjøringskandidater funnet.</p>';
            } else {
                popup.style.cssText = `
                    position: fixed;
                    background: white;
                    border: 2px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    width: fit-content;
                    min-width: 800px;
                    max-width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                `;
                
                results.forEach(result => {
                    html += `
                        <div style="margin-bottom: 25px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                            <h3 style="margin-top: 0; color: #0066cc;">Merket bestilling:</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background: white;">
                                <tbody>
                                    <tr style="background: #f0f8ff;">
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Navn</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hentetid</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Oppmøte</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Behov</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;" title="Antall ledsagere"><strong>L</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Fra</strong></td>
                                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Til</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.9em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.ventende.patientName}">${result.ventende.patientName}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${result.ventende.tripStartTime}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${result.ventende.tripTreatmentTime}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${result.ventende.behov || ''}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${result.ventende.ledsager || '-'}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(result.ventende.fromAddress)}">${cleanAddressSuffixes(result.ventende.fromAddress)}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(result.ventende.toAddress)}">${cleanAddressSuffixes(result.ventende.toAddress)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <h4 style="margin-top: 15px; color: #006400;">Potensielle samkjøringer (${result.candidates.length} ressurs${result.candidates.length !== 1 ? 'er' : ''}):</h4>
                    `;

                    result.candidates.forEach((resourceCandidate, resIndex) => {
                        const matchedBookings = resourceCandidate.bookings.filter(b => b.hasMatch);
                        const bestMatch = matchedBookings.length > 0 ? matchedBookings[0] : null;
                        
                        let resourceBadge = '';
                        let borderColor = '#006400';
                        
                        if (bestMatch) {
                            if (bestMatch.matchType === 'returutnyttelse') {
                                resourceBadge = '<span style="background: #9b59b6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">RETURUTNYTTELSE</span>';
                                borderColor = '#9b59b6';
                            } else {
                                resourceBadge = '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 10px;">SAMKJØRING</span>';
                                borderColor = '#28a745';
                            }
                        }
                        
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
                                            <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Behov</th>
                                            <th style="padding: 6px; text-align: left; border: 1px solid #ddd;" title="Antall ledsagere">L</th>
                                            <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Fra</th>
                                            <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Til</th>
                                            <th style="padding: 6px; text-align: left; border: 1px solid #ddd;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                        `;
                        
                        resourceCandidate.bookings.forEach((booking, bookingIndex) => {
                            const rowBg = bookingIndex % 2 === 0 ? '#fff' : '#f9f9f9';
                            let matchIcon = '';
                            
                            if (booking.hasMatch) {
                                matchIcon = '<span style="color: green; font-weight: bold;">✓</span>';
                            } else {
                                matchIcon = '<span style="color: #ccc;">-</span>';
                            }
                            
                            html += `
                                <tr style="background: ${rowBg}; ${booking.hasMatch ? 'font-weight: 500;' : 'color: #666;'}">
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: left;">${matchIcon}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.9em; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${booking.patientName}">${booking.patientName}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripStartTime}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd;">${booking.tripTreatmentTime}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.85em;">${booking.behov || ''}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${booking.ledsager || '-'}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(booking.fromAddress)}">${cleanAddressSuffixes(booking.fromAddress)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanAddressSuffixes(booking.toAddress)}">${cleanAddressSuffixes(booking.toAddress)}</td>
                                    <td style="padding: 6px; border: 1px solid #ddd; font-size: 0.8em; white-space: nowrap;" title="${booking.status}">${booking.status}</td>
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
        }

        html += '<button id="close-samkjoring-popup" style="margin-top: 15px; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer;">Lukk</button>';

        popup.innerHTML = html;
        document.body.appendChild(popup);

        // Sentrér popup over col2
        const col2 = document.getElementById("col2");
        if (col2) {
            const rect = col2.getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            const centerY = rect.top + (rect.height / 2);
            popup.style.left = `${centerX}px`;
            popup.style.top = `${centerY}px`;
            popup.style.transform = "translate(-50%, -50%)";
        } else {
            popup.style.left = "50%";
            popup.style.top = "50%";
            popup.style.transform = "translate(-50%, -50%)";
        }

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

        // Sett fokus på første knapp
        setTimeout(() => {
            const firstButton = popup.querySelector('button[onclick^="window.select"]');
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

        // TAB-trap
        const tabTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            
            const focusableElements = Array.from(popup.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.tabIndex !== -1);
            
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };
        document.addEventListener('keydown', tabTrapHandler);

        // Global functions for button clicks
        window.selectSamkjoringResource = (ventendeId, resourceId) => {
            if (selectResourceAndBooking(ventendeId, resourceId)) {
                closePopup();
            } else {
                showErrorToast('🚐 Kunne ikke velge ressurs. Vennligst prøv igjen.');
            }
        };

        window.selectSamkjoringResourcePair = (sourceResourceId, targetResourceId) => {
            try {
                // Special case: multi-ventende mode - save selected ventende BEFORE clearing
                let selectedVentendeIds = [];
                if (sourceResourceId === 'ventende-multi') {
                    const ventendeRows = document.querySelectorAll('#ventendeoppdrag tbody tr');
                    ventendeRows.forEach(row => {
                        const bgColor = row.style.backgroundColor;
                        if (bgColor === 'rgb(148, 169, 220)') {
                            selectedVentendeIds.push(row.id.replace('V-', ''));
                        }
                    });
                }
                
                // Clear all selections
                if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
                    ListSelectionGroup.clearAllSelections();
                }
                
                // Multi-ventende: select all saved ventende + target resource
                if (sourceResourceId === 'ventende-multi') {
                    // Re-select ventende bookings
                    selectedVentendeIds.forEach(rowId => {
                        if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
                            selectRow('V-' + rowId, g_voppLS);
                        }
                    });
                    
                    // Also select target resource
                    const targetRow = document.getElementById('P-' + targetResourceId);
                    if (targetRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + targetResourceId, g_poppLS);
                    }
                } else {
                    // Normal resource pair selection
                    const sourceRow = document.getElementById('P-' + sourceResourceId);
                    const targetRow = document.getElementById('P-' + targetResourceId);
                    
                    if (sourceRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + sourceResourceId, g_poppLS);
                    }
                    if (targetRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + targetResourceId, g_poppLS);
                    }
                }
                
                closePopup();
            } catch (error) {
                console.error('Feil ved merking:', error);
                showErrorToast('🚐 Kunne ikke velge ressurser. Vennligst prøv igjen.');
            }
        };

        window.showSamkjoringInMap = (ventendeId, resourceId) => {
            if (selectResourceAndBooking(ventendeId, resourceId)) {
                setTimeout(() => {
                    document.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'w',
                        code: 'KeyW',
                        altKey: true,
                        bubbles: true,
                        cancelable: true
                    }));
                }, 100);
            } else {
                showErrorToast('🚐 Kunne ikke åpne kart. Vennligst prøv igjen.');
            }
        };

        window.showSamkjoringInMapResource = (sourceResourceId, targetResourceId) => {
            try {
                // Special case: multi-ventende mode - save selected ventende BEFORE clearing
                let selectedVentendeIds = [];
                if (sourceResourceId === 'ventende-multi') {
                    const ventendeRows = document.querySelectorAll('#ventendeoppdrag tbody tr');
                    ventendeRows.forEach(row => {
                        const bgColor = row.style.backgroundColor;
                        if (bgColor === 'rgb(148, 169, 220)') {
                            selectedVentendeIds.push(row.id.replace('V-', ''));
                        }
                    });
                }
                
                // Clear all selections
                if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
                    ListSelectionGroup.clearAllSelections();
                }
                
                // Multi-ventende: select all saved ventende + target resource
                if (sourceResourceId === 'ventende-multi') {
                    // Re-select ventende bookings
                    selectedVentendeIds.forEach(rowId => {
                        if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
                            selectRow('V-' + rowId, g_voppLS);
                        }
                    });
                    
                    // Also select target resource
                    const targetRow = document.getElementById('P-' + targetResourceId);
                    if (targetRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + targetResourceId, g_poppLS);
                    }
                } else {
                    // Normal resource pair
                    const sourceRow = document.getElementById('P-' + sourceResourceId);
                    const targetRow = document.getElementById('P-' + targetResourceId);
                    
                    if (sourceRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + sourceResourceId, g_poppLS);
                    }
                    if (targetRow && typeof selectRow === 'function' && typeof g_poppLS !== 'undefined') {
                        selectRow('P-' + targetResourceId, g_poppLS);
                    }
                }
                
                setTimeout(() => {
                    document.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'w',
                        code: 'KeyW',
                        altKey: true,
                        bubbles: true,
                        cancelable: true
                    }));
                }, 100);
            } catch (error) {
                console.error('Feil ved kart:', error);
                showErrorToast('🚐 Kunne ikke åpne kart. Vennligst prøv igjen.');
            }
        };

        // Lukk-funksjonalitet
        document.getElementById('close-samkjoring-popup').addEventListener('click', closePopup);
        overlay.addEventListener('click', closePopup);
    }

    // Hovedfunksjon

    // ============================================================
    // AUTO-GRUPPERING: Automatisk samkjøring mellom ventende bestillinger
    // ============================================================
    
    // Global variabel for å huske hvor vi er i listen
    let currentAutoGroupIndex = 0;
    
    // Finn samkjøringer for en spesifikk ventende booking
    function findVentendeGrouping(bookingIndex = 0) {
        const ventendeList = getVentendeOppdrag();
        
        if (!ventendeList || ventendeList.length === 0) {
            showErrorToast('📋 Ingen ventende oppdrag funnet');
            return null;
        }
        
        if (bookingIndex >= ventendeList.length) {
            showErrorToast('📋 Ingen flere ventende oppdrag');
            return null;
        }
        
        currentAutoGroupIndex = bookingIndex;
        const anchorBooking = ventendeList[bookingIndex];
        
        console.log(`\n🔍 Auto-gruppering - Søker med: ${anchorBooking.patientName} (${anchorBooking.tripStartTime} → ${anchorBooking.tripTreatmentTime})`);
        
        const matches = [];
        
        // Søk mot alle andre ventende bookinger
        // Behandle hver som "en ressurs med én booking"
        ventendeList.forEach((otherBooking, idx) => {
            // Skip anchor booking selv
            if (idx === bookingIndex) return;
            
            // checkSamkjoring forventer (ventende, pagaende)
            // Vi bruker anchorBooking som "ventende" og otherBooking som "pagaende"
            const match = checkSamkjoring(anchorBooking, otherBooking);
            
            if (match) {
                console.log(`  ✓ Match: ${otherBooking.patientName} (Score: ${match.score})`);
                matches.push({
                    booking: otherBooking,
                    matchType: match.type,
                    scenario: match.scenario,
                    score: match.score,
                    timeDiff: match.timeDiff,
                    absTimeDiff: match.absTimeDiff,
                    direction: match.direction,
                    waitDescription: match.waitDescription,
                    selected: true  // Alle huket av fra start
                });
            }
        });
        
        // Sorter etter score (høyest først)
        matches.sort((a, b) => b.score - a.score);
        
        console.log(`\n📊 Fant ${matches.length} potensielle samkjøringer`);
        
        return {
            anchorBooking,
            matches,
            bookingIndex,
            totalBookings: ventendeList.length
        };
    }
    
    // Vis auto-gruppering popup
    function showAutoGroupingPopup(result) {
        if (!result || result.matches.length === 0) {
            showInfoToast(`🔍 Ingen samkjøringer funnet for ${result ? result.anchorBooking.patientName : 'denne bookingen'} (${result ? result.bookingIndex + 1 : '?'}/${result ? result.totalBookings : '?'})`);
            
            // Prøv neste booking automatisk - fortsett til siste
            if (result && result.bookingIndex < result.totalBookings - 1) {
                setTimeout(() => {
                    const nextResult = findVentendeGrouping(result.bookingIndex + 1);
                    if (nextResult) {
                        // Kall showAutoGroupingPopup uansett om den har matches eller ikke
                        // Dette gjør at vi fortsetter helt til siste booking
                        showAutoGroupingPopup(nextResult);
                    }
                }, 1000);
            } else if (result && result.bookingIndex === result.totalBookings - 1) {
                // Vi har nådd siste booking og fant ingen matches i hele listen
                showInfoToast('📋 Ingen samkjøringsmuligheter funnet i noen av bestillingene');
            }
            return;
        }
        
        // Fjern eksisterende popup og overlay
        const existingPopup = document.getElementById('auto-grouping-popup');
        if (existingPopup) existingPopup.remove();
        const existingOverlay = document.getElementById('auto-grouping-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        // Lag overlay (klikk utenfor for å lukke)
        const overlay = document.createElement('div');
        overlay.id = 'auto-grouping-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;
        
        const popup = document.createElement('div');
        popup.id = 'auto-grouping-popup';
        popup.style.cssText = `
            position: fixed;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            width: fit-content;
            min-width: 900px;
            max-width: 95%;
            max-height: 85vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;
        
        let html = '<h2 style="margin-top: 0;">🔍 Automatisk samkjøring (Ventende → Ventende)</h2>';
        
        // Anchor booking
        html += `
            <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 3px;">
                <h3 style="margin-top: 0; color: #1976d2;">Hovedbestilling (${result.bookingIndex + 1}/${result.totalBookings}):</h3>
                <table style="width: 100%; border-collapse: collapse; background: white;">
                    <tr>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Navn</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Hentetid</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Oppmøte</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Behov</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">L</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Fra</th>
                        <th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">Til</th>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${result.anchorBooking.patientName}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${result.anchorBooking.tripStartTime}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${result.anchorBooking.tripTreatmentTime}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${result.anchorBooking.behov || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${result.anchorBooking.ledsager || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${cleanAddressSuffixes(result.anchorBooking.fromAddress)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${cleanAddressSuffixes(result.anchorBooking.toAddress)}</td>
                    </tr>
                </table>
            </div>
        `;
        
        // Matches
        html += `
            <h3 style="color: #2e7d32;">Potensielle samkjøringer (${result.matches.length}):</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 8px; border: 1px solid #ddd; width: 40px;">
                            <input type="checkbox" id="select-all-auto" checked 
                                onchange="document.querySelectorAll('.auto-group-checkbox').forEach(cb => cb.checked = this.checked)"
                                style="cursor: pointer; width: 18px; height: 18px;">
                        </th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Navn</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Hentetid</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Oppmøte</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Behov</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">L</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Fra</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Til</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Score</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        result.matches.forEach((match, idx) => {
            const b = match.booking;
            const rowBg = idx % 2 === 0 ? '#fff' : '#f9f9f9';
            
            html += `
                <tr style="background: ${rowBg}; cursor: pointer;" 
                    onmouseover="this.style.background='#e3f2fd'" 
                    onmouseout="this.style.background='${rowBg}'"
                    onclick="const cb = this.querySelector('.auto-group-checkbox'); cb.checked = !cb.checked; event.stopPropagation();">
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;" onclick="event.stopPropagation();">
                        <input type="checkbox" class="auto-group-checkbox" data-index="${idx}" checked 
                            style="cursor: pointer; width: 18px; height: 18px;">
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${b.patientName}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${b.tripStartTime}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${b.tripTreatmentTime}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${b.behov || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${b.ledsager || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${cleanAddressSuffixes(b.fromAddress)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${cleanAddressSuffixes(b.toAddress)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 0.85em;">${match.matchType}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #2e7d32;">${Math.round(match.score)}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: space-between;">
                <div style="display: flex; gap: 10px;">
                    <button id="auto-group-select-btn" onclick="window.selectAutoGroup()" 
                        style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✓ Velg bestillinger
                    </button>
                    <button id="auto-group-map-btn" onclick="window.showAutoGroupInMap()" 
                        style="background: #2980b9; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        🗺️ Vis i kart
                    </button>
                    <button id="auto-group-next-btn" onclick="window.nextAutoGrouping()" 
                        style="background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;"
                        ${result.bookingIndex >= result.totalBookings - 1 ? 'disabled' : ''}>
                        ⏭️ Neste bestilling
                    </button>
                    <button id="auto-group-close-btn" onclick="window.closeAutoGroupPopup()" 
                        style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Lukk
                    </button>
                </div>
            </div>
        `;
        
        popup.innerHTML = html;
        
        // Legg til overlay først
        document.body.appendChild(overlay);
        
        // Deretter popup
        document.body.appendChild(popup);
        
        // Sentrer popup
        const rect = popup.getBoundingClientRect();
        popup.style.left = `${Math.max(10, (window.innerWidth - rect.width) / 2)}px`;
        popup.style.top = `${Math.max(10, (window.innerHeight - rect.height) / 2)}px`;
        
        // Funksjon for å lukke popup
        const closePopup = () => {
            popup.remove();
            overlay.remove();
            document.removeEventListener('keydown', keyboardListener);
        };
        
        // Keyboard handler (ESC og TAB trap)
        const keyboardListener = (e) => {
            // ESC lukker popup
            if (e.key === 'Escape') {
                closePopup();
                return;
            }
            
            // TAB trap - samme logikk som andre popups
            if (e.key === 'Tab') {
                const focusableElements = Array.from(popup.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )).filter(el => !el.disabled && el.tabIndex !== -1);
                
                if (focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        document.addEventListener('keydown', keyboardListener);
        
        // Klikk på overlay lukker popup
        overlay.addEventListener('click', closePopup);
        
        // Sett focus på "Velg bestillinger" knappen
        setTimeout(() => {
            const selectBtn = document.getElementById('auto-group-select-btn');
            if (selectBtn) selectBtn.focus();
        }, 100);
        
        // Lagre result og closePopup for senere bruk
        window.currentAutoGroupResult = result;
        window.closeAutoGroupPopup = closePopup;
    }
    
    // Global funksjoner for knappene
    window.nextAutoGrouping = function() {
        // Lukk eksisterende popup først (fjerner også event listeners)
        if (window.closeAutoGroupPopup) {
            window.closeAutoGroupPopup();
        }
        
        const nextResult = findVentendeGrouping(currentAutoGroupIndex + 1);
        if (nextResult) {
            showAutoGroupingPopup(nextResult);
        }
    };
    
    window.selectAutoGroup = function() {
        const result = window.currentAutoGroupResult;
        if (!result) return;
        
        // Clear existing selections
        if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
            ListSelectionGroup.clearAllSelections();
        }
        
        // Samle anchor + alle hukede av bookinger
        const selectedBookings = [result.anchorBooking];
        
        document.querySelectorAll('.auto-group-checkbox:checked').forEach(cb => {
            const idx = parseInt(cb.dataset.index);
            selectedBookings.push(result.matches[idx].booking);
        });
        
        // Bruk selectRow for å merke alle i tabellen (riktig merking)
        if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
            selectedBookings.forEach(booking => {
                const rowId = 'V-' + booking.rowId;
                selectRow(rowId, g_voppLS);
            });
        } else {
            // Fallback: Sett grønn bakgrunn direkte
            selectedBookings.forEach(booking => {
                const row = document.querySelector(`#ventendeoppdrag tbody tr[id="V-${booking.rowId}"]`);
                if (row) {
                    row.style.backgroundColor = 'rgb(200, 230, 201)';
                    row.classList.add('selected-for-grouping');
                }
            });
        }
        
        // Bruk closePopup for å fjerne både popup, overlay og event listeners
        if (window.closeAutoGroupPopup) {
            window.closeAutoGroupPopup();
        }
        showSuccessToast(`✓ ${selectedBookings.length} bestillinger merket`);
    };
    
    // Vis hukede bookinger i kart
    window.showAutoGroupInMap = function() {
        const result = window.currentAutoGroupResult;
        if (!result) return;
        
        // Clear existing selections
        if (typeof ListSelectionGroup !== 'undefined' && ListSelectionGroup.clearAllSelections) {
            ListSelectionGroup.clearAllSelections();
        }
        
        // Samle anchor + alle hukede av bookinger
        const selectedBookings = [result.anchorBooking];
        
        document.querySelectorAll('.auto-group-checkbox:checked').forEach(cb => {
            const idx = parseInt(cb.dataset.index);
            selectedBookings.push(result.matches[idx].booking);
        });
        
        // Bruk selectRow for å merke alle
        if (typeof selectRow === 'function' && typeof g_voppLS !== 'undefined') {
            selectedBookings.forEach(booking => {
                const rowId = 'V-' + booking.rowId;
                selectRow(rowId, g_voppLS);
            });
            
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
        } else {
            showErrorToast('🗺️ Kunne ikke åpne kart. selectRow funksjon ikke tilgjengelig.');
        }
    };

    // Hovedfunksjon
    function runSamkjoringAnalyse() {
        // Sjekk global sperre
        if (window.samkjoringRunning) {
            console.log('Samkjøringsanalyse kjører allerede...');
            return;
        }
        
        // Sjekk først om en ressurs er merket
        const selectedResource = getSelectedResourceOppdrag();
        
        // Hvis ressurs er merket, sjekk om ventende også er merket (uten å validere kolonner)
        if (selectedResource !== null) {
            // Quick check: er noen ventende rows merket? (uten kolonne-validering)
            const ventendeRows = document.querySelectorAll('#ventendeoppdrag tbody tr');
            let hasSelectedVentende = false;
            for (const row of ventendeRows) {
                const bgColor = row.style.backgroundColor;
                if (bgColor === 'rgb(148, 169, 220)') {
                    hasSelectedVentende = true;
                    break;
                }
            }
            
            if (hasSelectedVentende) {
                showErrorToast('❌ Du må velge ENTEN bestillinger fra ventende oppdrag ELLER en ressurs fra pågående oppdrag — ikke begge samtidig.');
                return;
            }
            
            // OK, kun ressurs er merket
            if (selectedResource.bookings.length === 0) {
                showErrorToast('🚐 Den merkede ressursen har ingen bestillinger.');
                return;
            }
            
            // Sett sperre
            window.samkjoringRunning = true;
            
            const results = findCandidatesForResource(selectedResource);
            
            if (results === null) {
                window.samkjoringRunning = false;
                return;
            }
            
            showResultsPopup(results, true); // true = ressurs-modus
            return;
        }
        
        // MODUS 2: Ventende-modus - sjekk ventende kolonner
        const selectedVentende = getSelectedVentendeOppdrag();

        // null = kolonne-validering feilt (toast er allerede vist)
        if (selectedVentende === null) return;
        
        if (selectedVentende.length === 0) {
            // MODUS 3: Auto-gruppering - Ingen bestillinger merket
            console.log('\n🔍 Auto-gruppering aktivert (ingen merkede bestillinger)');
            
            const result = findVentendeGrouping(0); // Start med første booking
            
            if (result) {
                showAutoGroupingPopup(result);
            }
            return;
        }
        
        // MODUS 4: Multi-ventende som "ressurs" - 2+ bestillinger merket
        if (selectedVentende.length >= 2) {
            console.log(`\n🚐 Multi-ventende modus (${selectedVentende.length} bestillinger merket)`);
            
            // Behandle merkede ventende som en "ressurs"
            const syntheticResource = {
                resource: `Ventende oppdrag (${selectedVentende.length} best.)`,
                rowId: 'ventende-multi',
                bookings: selectedVentende
            };
            
            // Sett sperre
            window.samkjoringRunning = true;
            
            const results = findCandidatesForResource(syntheticResource);
            
            if (results === null) {
                window.samkjoringRunning = false;
                return;
            }
            
            showResultsPopup(results, 'multi-ventende'); // Spesiell modus
            return;
        }

        // Normal ventende-modus (1 bestilling merket)
        // Sett sperre
        window.samkjoringRunning = true;

        const results = findCandidates(selectedVentende);

        // null = kolonne-validering feilt (toast er allerede vist)
        if (results === null) {
            window.samkjoringRunning = false;
            return;
        }

        showResultsPopup(results, false); // false = ventende-modus
    }

    // Legg til keyboard shortcut (Alt+X)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            runSamkjoringAnalyse();
        }
    });

    console.log('✅ Samkjøring lastet');
})();