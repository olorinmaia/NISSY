// Telefonnummer validering script
// Sjekker ventende og pågående oppdrag for gyldig/manglende telefonnummer

(function() {
    'use strict';

    // --- SPERRE MOT DUPLIKAT KJØRING ---
    if (window.__sjekkTelefonActive) {
        console.warn("⚠️ Sjekk-telefon er allerede aktiv - ignorerer ny forespørsel");
        return;
    }
    window.__sjekkTelefonActive = true;

    // Hent fødselsnummer fra plakat for gitt rekvisisjons-ID
    async function fetchSSN(rid) {
        try {
            const url = `/planlegging/ajax-dispatch?update=false&action=showreq&rid=${rid}`;
            const resp = await fetch(url, { credentials: 'same-origin' });
            const buf  = await resp.arrayBuffer();
            const text = new TextDecoder('iso-8859-1').decode(buf);
            const m = text.match(/F.dselsnummer:<\/td>\s*<td[^>]*class="reqv_value"[^>]*>(\d+)<\/td>/);
            return m?.[1] || null;
        } catch (e) {
            console.error('[SjekkTelefon] fetchSSN feil:', e);
            return null;
        }
    }

    // Finn rekvisisjons-ID fra rad-ID (V- og P-rader)
    function getRidFromRowId(rowId) {
        if (rowId.startsWith('V-')) return rowId.replace(/^V-/, '');
        if (rowId.startsWith('P-')) {
            const row = document.getElementById(rowId);
            const poppImg = row?.querySelector('img[id^="popp_"]');
            return poppImg?.id.replace('popp_', '') || null;
        }
        return null;
    }

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
                uniqueNames[result.name] = { phone: result.phone, rowId: result.rowId };
            }
        });

        const uniqueResults = Object.keys(uniqueNames).map(name => ({
            name: name,
            phone: uniqueNames[name].phone,
            rowId: uniqueNames[name].rowId,
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
                  // Frigjør sperre når modal lukkes via søk-knapp
                  window.__sjekkTelefonActive = false;
                  await togglePhoneColumns(false);
                  
                  // Sett søketype til "NAVN"
                  const searchTypeSelect = document.getElementById('searchType');
                  if (searchTypeSelect) {
                    searchTypeSelect.value = 'name';
                  }
                  
                  // Utfør søk
                  const searchInput = document.getElementById('searchPhrase');
                  if (searchInput) {
                    searchInput.value = result.name;
                    const searchBtn = document.getElementById('buttonSearch');
                    if (searchBtn) {
                      searchBtn.click();
                    }
                  }
                };

                // Rediger person-knapp
                const editButton = document.createElement('button');
                editButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span style="vertical-align: middle;">Rediger person</span>
                `;
                editButton.style.cssText = `
                    background: linear-gradient(135deg, #047CA1 0%, #0599c8 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(4, 124, 161, 0.2);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                `;
                editButton.onmouseover = function() {
                    this.style.background = 'linear-gradient(135deg, #035f7c 0%, #047CA1 100%)';
                    this.style.boxShadow = '0 4px 8px rgba(4, 124, 161, 0.3)';
                    this.style.transform = 'translateY(-1px)';
                };
                editButton.onmouseout = function() {
                    this.style.background = 'linear-gradient(135deg, #047CA1 0%, #0599c8 100%)';
                    this.style.boxShadow = '0 2px 4px rgba(4, 124, 161, 0.2)';
                    this.style.transform = 'translateY(0)';
                };
                editButton.onclick = async function() {
                    const rid = getRidFromRowId(result.rowId);
                    if (!rid) { alert('Kunne ikke finne rekvisisjons-ID for denne bestillingen.'); return; }
                    const ssn = await fetchSSN(rid);
                    if (!ssn) { alert('Kunne ikke hente fødselsnummer for denne bestillingen.'); return; }
                    window.open(`/administrasjon/admin/editPatient?ssn=${ssn}`, '_blank');
                };

                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';
                buttonContainer.appendChild(searchButton);
                buttonContainer.appendChild(editButton);

                item.appendChild(textContainer);
                item.appendChild(buttonContainer);
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
            // Frigjør sperre når modal lukkes
            window.__sjekkTelefonActive = false;
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