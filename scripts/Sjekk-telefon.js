// Telefonnummer validering script
// Sjekker ventende og pågående oppdrag for gyldig/manglende telefonnummer

(function() {
    'use strict';

    // Regulært uttrykk for gyldig telefonnummer
    // Aksepterer: 
    // - 12345678 (8 siffer)
    // - +4712345678 (+ og 10 siffer)
    // - 12 34 56 78 (8 siffer med mellomrom)
    // - +47 12345678 (+ og 10 siffer med mellomrom etter landkode)
    const VALID_PHONE_REGEX = /^(\d{8}|[+]\d{10}|\d{2}\s\d{2}\s\d{2}\s\d{2}|[+]\d{2}\s\d{8})$/;

    // Funksjon for å vente på at openPopp AJAX-kallet er ferdig
    function ventPåOpenPopp() {
        return new Promise(resolve => {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._isOpenPopp = url.includes("action=openres") && url.includes("rid=-1");
                return originalOpen.apply(this, [method, url, ...rest]);
            };

            XMLHttpRequest.prototype.send = function(...args) {
                if (this._isOpenPopp) {
                    this.addEventListener("load", () => {
                        // Gjenopprett originale metoder
                        XMLHttpRequest.prototype.open = originalOpen;
                        XMLHttpRequest.prototype.send = originalSend;
                        resolve(); // openPopp AJAX ferdig
                    });
                }
                return originalSend.apply(this, args);
            };
        });
    }

    // Funksjon for å vise/skjule kolonner
    async function togglePhoneColumns(show) {
        const action = show ? 'showcol' : 'hidecol';
        const urls = [
            `/planlegging/ajax-dispatch?did=all&action=p${action}&cid=patientPhone`,
            `/planlegging/ajax-dispatch?did=all&action=v${action}&cid=patientPhone`
        ];

        let completed = 0;

        const promises = urls.map(url => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        completed++;
                        resolve();
                    }
                };
                xhr.send();
            });
        });

        await Promise.all(promises);

        // Kjør openPopp for å oppdatere data etter kolonneendring
        if (typeof openPopp === 'function') {
            const ventPromise = ventPåOpenPopp();
            openPopp('-1');
            await ventPromise;
        }
    }

    // Funksjon for å finne kolonne-indeks for Ptlf
    function findPhoneColumnIndex(table) {
        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === 'Ptlf') {
                return i;
            }
        }
        return -1;
    }

    // Funksjon for å finne kolonne-indeks for Pnavn
    function findNameColumnIndex(table) {
        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === 'Pnavn') {
                return i;
            }
        }
        return -1;
    }

    // Funksjon for å validere telefonnummer
    function isValidPhone(phone) {
        if (!phone || phone.trim() === '' || phone === '&nbsp;') {
            return false;
        }
        return VALID_PHONE_REGEX.test(phone.trim());
    }

    // Funksjon for å sjekke ventende oppdrag
    function checkVentendeOppdrag() {
        const results = [];
        const table = document.querySelector('table tbody.scrollContent');
        
        if (!table) {
            console.warn('Fant ikke tabellen for ventende oppdrag');
            return results;
        }

        const parentTable = table.closest('table');
        const phoneColIndex = findPhoneColumnIndex(parentTable);
        const nameColIndex = findNameColumnIndex(parentTable);

        if (phoneColIndex === -1) {
            console.warn('Fant ikke Ptlf-kolonnen i ventende oppdrag');
            return results;
        }

        if (nameColIndex === -1) {
            console.warn('Fant ikke Pnavn-kolonnen i ventende oppdrag');
            return results;
        }

        const rows = table.querySelectorAll('tr[id^="V-"]');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > phoneColIndex && cells.length > nameColIndex) {
                const nameCell = cells[nameColIndex];
                const phoneCell = cells[phoneColIndex];
                
                const name = nameCell.textContent.trim();
                const phone = phoneCell.textContent.trim();

                if (!isValidPhone(phone)) {
                    results.push({
                        name: name,
                        phone: phone === '' || phone === '&nbsp;' ? 'Mangler' : phone,
                        rowId: row.id
                    });
                }
            }
        });

        return results;
    }

    // Funksjon for å sjekke pågående oppdrag
    function checkPaagaaendeOppdrag() {
        const results = [];
        const tables = document.querySelectorAll('table tbody');
        
        // Finn riktig tabell (den med pågående oppdrag)
        let targetTable = null;
        for (const table of tables) {
            if (table.querySelector('tr[id^="P-"]')) {
                targetTable = table;
                break;
            }
        }

        if (!targetTable) {
            console.warn('Fant ikke tabellen for pågående oppdrag');
            return results;
        }

        const parentTable = targetTable.closest('table');
        const phoneColIndex = findPhoneColumnIndex(parentTable);
        const nameColIndex = findNameColumnIndex(parentTable);

        if (phoneColIndex === -1) {
            console.warn('Fant ikke Ptlf-kolonnen i pågående oppdrag');
            return results;
        }

        if (nameColIndex === -1) {
            console.warn('Fant ikke Pnavn-kolonnen i pågående oppdrag');
            return results;
        }

        const rows = targetTable.querySelectorAll('tr[id^="P-"]');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > phoneColIndex && cells.length > nameColIndex) {
                const nameCell = cells[nameColIndex];
                const phoneCell = cells[phoneColIndex];
                
                // Pågående oppdrag kan ha flere rader (divs) per ressurs
                const nameDivs = nameCell.querySelectorAll('div');
                const phoneDivs = phoneCell.querySelectorAll('div');

                if (nameDivs.length > 0 && phoneDivs.length > 0) {
                    // Flere oppdrag i samme ressurs
                    for (let i = 0; i < nameDivs.length; i++) {
                        const name = nameDivs[i].textContent.trim();
                        const phone = i < phoneDivs.length ? phoneDivs[i].textContent.trim() : '';

                        if (!isValidPhone(phone)) {
                            results.push({
                                name: name,
                                phone: phone === '' || phone === '&nbsp;' ? 'Mangler' : phone,
                                rowId: row.id
                            });
                        }
                    }
                } else {
                    // Enkelt oppdrag
                    const name = nameCell.textContent.trim();
                    const phone = phoneCell.textContent.trim();

                    if (!isValidPhone(phone)) {
                        results.push({
                            name: name,
                            phone: phone === '' || phone === '&nbsp;' ? 'Mangler' : phone,
                            rowId: row.id
                        });
                    }
                }
            }
        });

        return results;
    }

    // Funksjon for å vise resultater i modal
    function showResults(results) {
        // Fjern eksisterende modal hvis den finnes
        const existingModal = document.getElementById('phoneCheckModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Fjern duplikater - behold kun unike navn
        const uniqueNames = {};
        results.forEach(result => {
            if (!uniqueNames[result.name]) {
                uniqueNames[result.name] = result.phone;
            }
        });

        const uniqueResults = Object.keys(uniqueNames).map(name => ({
            name: name,
            phone: uniqueNames[name]
        }));

        // Opprett modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'phoneCheckModal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Opprett modal innhold
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Header
        const header = document.createElement('h2');
        header.textContent = '📞 Sjekk telefonnummer';
        header.style.cssText = 'margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;';
        modal.appendChild(header);

        if (uniqueResults.length === 0) {
            const message = document.createElement('p');
            message.textContent = 'Alle bestillinger har gyldig telefonnummer! ✓';
            message.style.cssText = 'color: #28a745; font-weight: bold; padding: 20px; text-align: center;';
            modal.appendChild(message);
        } else {
            const intro = document.createElement('p');
            intro.textContent = 'Fant ' + uniqueResults.length + ' pasient(er) med ugyldig eller manglende telefonnummer:';
            intro.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;';
            modal.appendChild(intro);

            // Opprett liste
            const list = document.createElement('ul');
            list.style.cssText = 'list-style: none; padding: 0; margin: 20px 0;';

            uniqueResults.forEach(result => {
                const item = document.createElement('li');
                item.style.cssText = `
                    padding: 12px;
                    margin: 8px 0;
                    background: #f8f9fa;
                    border-left: 4px solid #007bff;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                const textContainer = document.createElement('div');
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = result.name;
                nameSpan.style.cssText = 'font-weight: bold; color: #333;';

                const phoneSpan = document.createElement('span');
                phoneSpan.textContent = ' - ' + result.phone;
                phoneSpan.style.cssText = result.phone === 'Mangler' ? 'color: #dc3545;' : 'color: #856404;';

                textContainer.appendChild(nameSpan);
                textContainer.appendChild(phoneSpan);

                // Søk-knapp med ikon
                const searchButton = document.createElement('button');
                searchButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <span style="vertical-align: middle;">Søk i planlegging</span>
                `;
                searchButton.style.cssText = `
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    margin-left: 10px;
                    box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                `;
                searchButton.onmouseover = function() { 
                    this.style.background = 'linear-gradient(135deg, #218838 0%, #1ea87a 100%)';
                    this.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
                    this.style.transform = 'translateY(-1px)';
                };
                searchButton.onmouseout = function() { 
                    this.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                    this.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.2)';
                    this.style.transform = 'translateY(0)';
                };
                searchButton.onclick = async function() {
                    // Lukk modal og fjern kolonner
                    overlay.remove();
                    await togglePhoneColumns(false);
                    
                    // Sett søkefrase og kjør søk
                    var searchInput = document.getElementById('searchPhrase');
                    if (searchInput) {
                        searchInput.value = result.name;
                        var searchBtn = document.getElementById('buttonSearch');
                        if (searchBtn) {
                            searchBtn.click();
                        }
                    }
                };

                item.appendChild(textContainer);
                item.appendChild(searchButton);
                list.appendChild(item);
            });

            modal.appendChild(list);
        }

        // Lukk-knapp
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Lukk';
        closeButton.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
        `;
        closeButton.onmouseover = function() { this.style.background = '#0056b3'; };
        closeButton.onmouseout = function() { this.style.background = '#007bff'; };
        closeButton.onclick = async function() {
            overlay.remove();
            // Skjul telefon-kolonnene når modal lukkes
            await togglePhoneColumns(false);
        };
        modal.appendChild(closeButton);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Lukk ved klikk på overlay
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                closeButton.click();
            }
        };

        // Lukk ved ESC-tast
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeButton.click();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Hovedfunksjon
    async function runPhoneCheck() {
        console.log('Starter telefonnummer validering...');

        // Avbryt eventuelt aktivt søk før vi begynner
        if (typeof cancelSearch === 'function') {
            cancelSearch();
        }

        // Vis telefon-kolonnene og vent på at openPopp er ferdig
        await togglePhoneColumns(true);

        // Samle resultater
        const ventendeResults = checkVentendeOppdrag();
        const paagaaendeResults = checkPaagaaendeOppdrag();
        const allResults = [...ventendeResults, ...paagaaendeResults];

        console.log('Fant ' + allResults.length + ' bestillinger med ugyldige telefonnummer');

        // Vis resultater
        showResults(allResults);
    }

    // Kjør sjekken
    runPhoneCheck();

})();
