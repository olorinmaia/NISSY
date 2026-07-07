// Telefonnummer validering script
// Sjekker ventende og pågående oppdrag for gyldig/manglende telefonnummer

(function() {
    'use strict';

    // --- SPERRE MOT DUPLIKAT INSTALLASJON (scriptet er preloadet av loaderen) ---
    if (window.__sjekkTelefonInstalled) return;
    window.__sjekkTelefonInstalled = true;

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

    // Aksepterer: 8 siffer, +10 siffer, 8 siffer med mellomrom, +47 + 8 siffer med mellomrom
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
    // includeNameColumn: vis/skjul også Pnavn (brukes kun hvis den var skjult fra start)
    async function togglePhoneColumns(show, includeNameColumn = false) {
        const action = show ? 'showcol' : 'hidecol';
        const urls = [
            `/planlegging/ajax-dispatch?did=all&action=p${action}&cid=patientPhone`,
            `/planlegging/ajax-dispatch?did=all&action=v${action}&cid=patientPhone`
        ];
        if (includeNameColumn) {
            urls.push(
                `/planlegging/ajax-dispatch?did=all&action=p${action}&cid=patientName`,
                `/planlegging/ajax-dispatch?did=all&action=v${action}&cid=patientName`
            );
        }

        const promises = urls.map(url => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) resolve();
                };
                xhr.send();
            });
        });

        await Promise.all(promises);

        if (typeof openPopp === 'function') {
            const ventPromise = ventPåOpenPopp();
            openPopp('-1');
            await ventPromise;
        }
    }

    // Spinner-overlay mens kolonner vises og data hentes
    function visVenterOverlay(cancelRef) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
        });

        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '50px',
            height: '50px',
            border: '6px solid #ddd',
            borderTop: '6px solid #007ACC',
            borderRadius: '50%',
            animation: 'sjekkTelefonSpinner 0.8s linear infinite',
            marginBottom: '20px',
        });

        const styleTag = document.createElement('style');
        styleTag.textContent = `
            @keyframes sjekkTelefonSpinner {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styleTag);

        const tekst = document.createElement('div');
        tekst.textContent = 'Henter telefonnummer… Trykk ESC for å avbryte';
        Object.assign(tekst.style, {
            color: 'white',
            fontSize: '20px',
            fontWeight: '600',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        });

        overlay.appendChild(spinner);
        overlay.appendChild(tekst);
        document.body.appendChild(overlay);

        function escClose(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                styleTag.remove();
                document.removeEventListener('keydown', escClose);
                cancelRef.cancelled = true;
                window.__sjekkTelefonActive = false;
            }
        }
        document.addEventListener('keydown', escClose);

        return () => {
            overlay.remove();
            styleTag.remove();
            document.removeEventListener('keydown', escClose);
        };
    }

    function findColumnIndex(table, name) {
        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === name) return i;
        }
        return -1;
    }

    // Funksjon for å validere telefonnummer
    function isValidPhone(phone) {
        if (!phone || phone.trim() === '') return false;
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
        const phoneColIndex = findColumnIndex(parentTable, 'Ptlf');
        const nameColIndex = findColumnIndex(parentTable, 'Pnavn');

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
                        rowId: row.id,
                        reqId: row.id.replace(/^V-/, '')
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
        const phoneColIndex = findColumnIndex(parentTable, 'Ptlf');
        const nameColIndex = findColumnIndex(parentTable, 'Pnavn');

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
                    // Flere oppdrag i samme ressurs — hent reqId per indeks
                    const poppImgs = row.querySelectorAll('img[id^="popp_"]');
                    for (let i = 0; i < nameDivs.length; i++) {
                        const name = nameDivs[i].textContent.trim();
                        const phone = i < phoneDivs.length ? phoneDivs[i].textContent.trim() : '';

                        if (!isValidPhone(phone)) {
                            results.push({
                                name: name,
                                phone: phone === '' || phone === '&nbsp;' ? 'Mangler' : phone,
                                rowId: row.id,
                                reqId: poppImgs[i]?.id.replace('popp_', '') || null
                            });
                        }
                    }
                } else {
                    // Enkelt oppdrag
                    const name = nameCell.textContent.trim();
                    const phone = phoneCell.textContent.trim();
                    const poppImg = row.querySelector('img[id^="popp_"]');

                    if (!isValidPhone(phone)) {
                        results.push({
                            name: name,
                            phone: phone === '' || phone === '&nbsp;' ? 'Mangler' : phone,
                            rowId: row.id,
                            reqId: poppImg?.id.replace('popp_', '') || null
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
                uniqueNames[result.name] = { phone: result.phone, rowId: result.rowId, reqId: result.reqId };
            }
        });

        const uniqueResults = Object.keys(uniqueNames).map(name => ({
            name: name,
            phone: uniqueNames[name].phone,
            rowId: uniqueNames[name].rowId,
            reqId: uniqueNames[name].reqId,
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
            z-index: 9990;
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
            max-width: 800px;
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

            const tips = document.createElement('details');
            tips.style.cssText = 'margin: 10px 0 16px 0; font-size: 13px; color: #555;';
            const tipsSummary = document.createElement('summary');
            tipsSummary.textContent = 'ℹ️ Slik retter du manglende telefonnummer';
            tipsSummary.style.cssText = 'cursor: pointer; color: #007bff; font-weight: 500; user-select: none;';
            const tipsList = document.createElement('ol');
            tipsList.style.cssText = 'margin: 8px 0 0 0; padding-left: 20px; line-height: 1.7;';
            tipsList.innerHTML =
                '<li>Klikk <strong>Rediger person</strong> → legg til kontaktinfo og lagre</li>' +    
                '<li>Klikk <strong>Hent bestillinger</strong> eller <strong>Søk i planlegging</strong> → rediger bestillingen(e) og legg til kontaktinfo på riktig sted → lagre</li>' +
                '<li>Kjør Sjekk-telefon på nytt for å bekrefte at alle er rettet</li>';
            tips.appendChild(tipsSummary);
            tips.appendChild(tipsList);
            modal.appendChild(tips);

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
                textContainer.style.cssText = 'display: flex; align-items: baseline; flex: 1; min-width: 0; margin-right: 12px;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = result.name;
                nameSpan.title = result.name;
                nameSpan.style.cssText = 'font-weight: bold; color: #333; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: none;';

                const phoneSpan = document.createElement('span');
                phoneSpan.textContent = ' - ' + result.phone;
                phoneSpan.style.cssText = 'flex-shrink: 0; white-space: nowrap; ' + (result.phone === 'Mangler' ? 'color: #dc3545;' : 'color: #856404;');

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
                    min-width: 160px;
                    justify-content: center;
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
                  document.removeEventListener('keydown', escHandler);
                  overlay.remove();
                  window.__sjekkTelefonActive = false;

                  const searchTypeSelect = document.getElementById('searchType');
                  if (searchTypeSelect) {
                    searchTypeSelect.value = 'smart';
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

                // Hent bestillinger-knapp
                const hentButton = document.createElement('button');
                hentButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span data-check style="vertical-align: middle; display: inline-block; width: 0; min-width: 0; overflow: hidden;">✓</span><span style="vertical-align: middle;">Hent bestillinger</span>
                `;
                hentButton.style.cssText = `
                    background: linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    min-width: 160px;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(111, 66, 193, 0.2);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                `;
                hentButton.onmouseover = function() {
                    if (this._visited) {
                        this.style.background = 'linear-gradient(135deg, #374151 0%, #4b5563 100%)';
                        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    } else {
                        this.style.background = 'linear-gradient(135deg, #5a329e 0%, #7142cc 100%)';
                        this.style.boxShadow = '0 4px 8px rgba(111, 66, 193, 0.3)';
                    }
                    this.style.transform = 'translateY(-1px)';
                };
                hentButton.onmouseout = function() {
                    if (this._visited) {
                        this.style.background = 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    } else {
                        this.style.background = 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(111, 66, 193, 0.2)';
                    }
                    this.style.transform = 'translateY(0)';
                };
                hentButton.onclick = function() {
                    if (!this._visited) {
                        this._visited = true;
                        this.style.background = 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        const check = this.querySelector('[data-check]');
                        if (check) { check.style.width = 'auto'; check.style.marginRight = '4px'; }
                    }
                    const rid = result.reqId;
                    if (!rid) { alert('Kunne ikke finne rekvisisjons-ID for denne bestillingen.'); return; }
                    if (window.Bestillingsmodul?.openHentRekvisisjon) {
                        window.Bestillingsmodul.openHentRekvisisjon(rid);
                    } else {
                        alert('Bestillingsmodul er ikke lastet inn.');
                    }
                };

                // Rediger person-knapp
                const editButton = document.createElement('button');
                editButton.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span data-check style="vertical-align: middle; display: inline-block; width: 0; min-width: 0; overflow: hidden;">✓</span><span style="vertical-align: middle;">Rediger person</span>
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
                    min-width: 160px;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(4, 124, 161, 0.2);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                `;
                editButton.onmouseover = function() {
                    if (this._visited) {
                        this.style.background = 'linear-gradient(135deg, #374151 0%, #4b5563 100%)';
                        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                    } else {
                        this.style.background = 'linear-gradient(135deg, #035f7c 0%, #047CA1 100%)';
                        this.style.boxShadow = '0 4px 8px rgba(4, 124, 161, 0.3)';
                    }
                    this.style.transform = 'translateY(-1px)';
                };
                editButton.onmouseout = function() {
                    if (this._visited) {
                        this.style.background = 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    } else {
                        this.style.background = 'linear-gradient(135deg, #047CA1 0%, #0599c8 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(4, 124, 161, 0.2)';
                    }
                    this.style.transform = 'translateY(0)';
                };
                editButton.onclick = async function() {
                    if (!this._visited) {
                        this._visited = true;
                        this.style.background = 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)';
                        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        const check = this.querySelector('[data-check]');
                        if (check) { check.style.width = 'auto'; check.style.marginRight = '4px'; }
                    }
                    const rid = result.reqId;
                    if (!rid) { alert('Kunne ikke finne rekvisisjons-ID for denne bestillingen.'); return; }
                    const ssn = await fetchSSN(rid);
                    if (!ssn) { alert('Kunne ikke hente fødselsnummer for denne bestillingen.'); return; }
                    window.open(`/administrasjon/admin/editPatient?ssn=${ssn}`, '_blank');
                };

                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';
                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(hentButton);
                buttonContainer.appendChild(searchButton);

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

        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeButton.click();
                document.removeEventListener('keydown', escHandler);
            }
        };

        closeButton.onclick = function() {
            document.removeEventListener('keydown', escHandler);
            overlay.remove();
            window.__sjekkTelefonActive = false;
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

        document.addEventListener('keydown', escHandler);
    }

    // Hovedfunksjon
    async function runPhoneCheck() {
        console.log('Starter telefonnummer validering...');

        if (typeof cancelSearch === 'function') {
            cancelSearch();
        }

        // Sjekk om Pnavn er synlig før vi starter — skjules igjen etterpå bare hvis vi måtte vise den
        const nameWasHidden = ![...document.querySelectorAll('#ventendeoppdrag thead th, #pagaendeoppdrag thead th')]
            .some(th => th.textContent.trim() === 'Pnavn');

        const cancelRef = { cancelled: false };
        const fjernSpinner = visVenterOverlay(cancelRef);

        await togglePhoneColumns(true, nameWasHidden);

        if (cancelRef.cancelled) {
            await togglePhoneColumns(false, nameWasHidden);
            return;
        }

        const ventendeResults = checkVentendeOppdrag();
        const paagaaendeResults = checkPaagaaendeOppdrag();
        const allResults = [...ventendeResults, ...paagaaendeResults];

        console.log('Fant ' + allResults.length + ' bestillinger med ugyldige telefonnummer');

        // Skjul kolonner mens spinner fortsatt dekker bakgrunnen
        await togglePhoneColumns(false, nameWasHidden);
        fjernSpinner();

        showResults(allResults);
    }

    // --- HOVEDFUNKSJON (ALT+4) ---
    function triggerSjekkTelefon() {
        // --- SPERRE MOT DUPLIKAT KJØRING ---
        if (window.__sjekkTelefonActive) {
            console.warn("⚠️ Sjekk-telefon er allerede aktiv - ignorerer ny forespørsel");
            return;
        }
        window.__sjekkTelefonActive = true;
        runPhoneCheck();
    }

    // --- HOTKEY: ALT+4 ---
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === '4') {
            e.preventDefault();
            triggerSjekkTelefon();
        }
    });

    // Eksporter globalt slik at "Sjekk-Telefon"-knappen kan kalle scriptet momentant
    window.NissySjekkTelefon = triggerSjekkTelefon;

})();