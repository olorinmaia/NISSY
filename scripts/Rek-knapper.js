(() => {
  // ============================================================
  // REK-KNAPPER SCRIPT
  // Legger til hurtigknapper (H, S, K, T, R) på merkede rader
  // ============================================================

  // Sjekk om scriptet allerede er lastet for å unngå duplikater
  if (window.__rekKnapperHotkeyInstalled) {
    console.log("✅ Rek-knapper-script er allerede aktiv");
    return;
  }
  window.__rekKnapperHotkeyInstalled = true;

  console.log("🚀 Starter Rek-knapper-script");

  // Blokker Alt alene (hindrer fokus til nettleserkrom / "..."-knapp)
  let _altPressedAlone = false;
  window.addEventListener("keydown", function (e) {
    if (e.key === "Alt") { _altPressedAlone = true; }
    else if (e.altKey)   { _altPressedAlone = false; }
  }, true);
  window.addEventListener("keyup", function (e) {
    if (e.key === "Alt" && _altPressedAlone) { e.preventDefault(); }
    _altPressedAlone = false;
  }, true);

  // ============================================================
  // INERT-HÅNDTERING: Blokkerer CTRL+F søk i bakgrunnen
  // ============================================================
  function enableModalMode() {
    // Sett inert på alle direkte barn av body som ikke er modal
    Array.from(document.body.children).forEach(child => {
      if (child.id !== 'iframeModal') {
        child.setAttribute('inert', '');
        child.setAttribute('data-rekknapper-inert', 'true');
      }
    });
  }
  
  function disableModalMode() {
    // Fjern inert fra alle elementer
    document.querySelectorAll('[data-rekknapper-inert]').forEach(el => {
      el.removeAttribute('inert');
      el.removeAttribute('data-rekknapper-inert');
    });
  }

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

  // ============================================================
  // ADVARSEL-TOAST: Vises nederst på skjermen (gul bakgrunn)
  // ============================================================
  let currentWarningToast = null;
  
  function showWarningToast(msg) {
    // Fjern eksisterende advarsel-toast
    if (currentWarningToast && currentWarningToast.parentNode) {
      currentWarningToast.parentNode.removeChild(currentWarningToast);
    }
    
    const toast = document.createElement("div");
    
    // Opprett varseltrekant-ikon
    const warningIcon = document.createElement("span");
    warningIcon.innerHTML = "⚠️";
    warningIcon.style.marginRight = "8px";
    warningIcon.style.fontSize = "16px";
    
    // Legg til ikon og tekst
    toast.appendChild(warningIcon);
    toast.appendChild(document.createTextNode(msg));
    
    // Styling
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "70px",
      left: "800px", // Sentrert i modal-området (1580px / 2 + 10px margin)
      transform: "translateX(-50%)",
      background: "#b09f2b", // Mørkegul bakgrunn for advarsel
      color: "#fff",
      padding: "12px 24px",
      borderRadius: "5px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      fontFamily: "Arial, sans-serif",
      fontWeight: "bold",
      zIndex: "1000002", // Høyere enn modal (1000000) og close-button (1000001)
      opacity: "0",
      transition: "opacity 0.3s ease",
      display: "flex",
      alignItems: "center"
    });
    
    document.body.appendChild(toast);
    currentWarningToast = toast;
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    
    // Fade out etter 6 sekunder
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (currentWarningToast === toast) {
          currentWarningToast = null;
        }
      }, 300);
    }, 6000);
  }

  // ============================================================
  // HJELPEFUNKSJON: Finn ressurs-status basert på ressurs-ID
  // ============================================================
  function getResourceStatus(resourceId) {
    const resourceRow = document.getElementById(`Rxxx${resourceId}`);
    if (!resourceRow) {
      console.warn(`Kunne ikke finne ressurs Rxxx${resourceId} i Ressurser-tabellen`);
      return null;
    }
    
    const statusCell = document.getElementById(`Rxxxstatusxxx${resourceId}`);
    if (!statusCell) {
      console.warn(`Kunne ikke finne status-celle for ressurs ${resourceId}`);
      return null;
    }
    
    return statusCell.textContent.trim();
  }

  // ============================================================
  // HJELPEFUNKSJON: Sjekk om bestilling er på pågående oppdrag
  // ============================================================
  function isOngoingAssignment(row) {
    // Sjekk om raden er innenfor pågående oppdrag-seksjonen
    let parent = row.parentElement;
    while (parent) {
      if (parent.id && parent.id.toLowerCase().includes("pagaende")) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  // ============================================================
  // HJELPEFUNKSJONER: REISEMÅTE-FIX
  // Henter reisemåte fra plakat og setter den automatisk hvis feltet er blankt
  // ============================================================
  async function fetchReisemåte(rid) {
    try {
      const url = `/planlegging/ajax-dispatch?update=false&action=showreq&rid=${rid}`;
      const response = await fetch(url, { credentials: 'same-origin' });
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('iso-8859-1');
      const text = decoder.decode(buffer);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const rows = xmlDoc.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        for (let i = 0; i < cells.length - 1; i++) {
          if (cells[i].textContent.trim() === 'Reisemåte:') {
            const value = cells[i + 1].textContent.trim();
            if (value) return value;
          }
        }
      }
      console.warn(`[REK] Reisemåte ikke funnet i plakat for rid=${rid}`);
      return null;
    } catch (e) {
      console.error(`[REK] Feil ved henting av reisemåte for rid=${rid}:`, e);
      return null;
    }
  }

  async function fixTransportType(doc, rid) {
    const select = doc.querySelector('select[name="trip.actualTransportTypeCode"]');
    if (!select) return;
    if (select.value !== '') return;

    console.log(`[REK] ⚠️ Reisemåte er blank for rid=${rid} – henter fra plakat...`);

    const reisemåte = await fetchReisemåte(rid);
    if (!reisemåte) {
      console.warn(`[REK] Kunne ikke hente reisemåte for rid=${rid} – feltet forblir blankt`);
      return;
    }

    const option = doc.querySelector(`select[name="trip.actualTransportTypeCode"] option[value="${reisemåte}"]`);
    if (!option) {
      console.warn(`[REK] Reisemåte "${reisemåte}" finnes ikke som valg i feltet for rid=${rid}`);
      return;
    }

    select.value = reisemåte;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[REK] ✅ Reisemåte automatisk satt til "${reisemåte}" for rid=${rid}`);
  }

  // ============================================================
  // HOTKEY REGISTRERING: ALT+R
  // ============================================================
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      initializeSnippet();
    }
  });

  // ============================================================
  // HOVEDFUNKSJON: Initialiserer snippet når ALT+R trykkes
  // ============================================================
  function initializeSnippet() {
    const TARGET_BG = "rgb(148, 169, 220)"; // Bakgrunnsfarge for merkede rader

    // Reset tidligere instanser
    if (window.snippetActive) {
      cleanupSnippet();
    }

    // Initialiser globale variabler
    window.lastEditedReqId = null;
    window.lastModalButton = null;
    window.popupObserver = null;
    window.escapeHandler = null;
    window.rowObserver = null;
    window.scrollHandlers = new Map();
    window.activePopups = new Set();
    window.markedRowIds = new Set();
    window.isVentendeOppdrag = false;
    window.snippetActive = true;
    window.tildelingButtonListeners = [];

    // ============================================================
    // CSS STYLING FOR KNAPPER
    // ============================================================
    const injectButtonStyles = () => {
      if (!document.getElementById("tagBtnStyle")) {
        const style = document.createElement("style");
        style.id = "tagBtnStyle";
        style.textContent = `
          .tag-btn {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            margin: 0 1px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            color: #444;
            font-weight: bold;
            border: 1px solid #ccc;
            background: #f8f8f8;
            border-radius: 6px;
            cursor: pointer;
            user-select: none;
            box-sizing: border-box;
            height: auto;
            line-height: normal;
            transition: background 0.2s, border-color 0.2s;
          }
          .tag-btn:hover {
            background: #eee;
            border-color: #bbb;
          }
          .tag-btn:active {
            background: #ddd;
          }
        `;
        document.head.appendChild(style);
      }
    };

    injectButtonStyles();

    // ============================================================
    // LYTTERE FOR DIVERSE KNAPPER OG SNARVEIER
    // Lukker Rek-knappene for å hindre at de ligger plassert feil
    // ============================================================
    const setupTildelingListeners = () => {
      // Lytt på tildelingsknapper i dialogen
      ["buttonAssignVoppsAssistConfirm", "buttonAssignVopps", "buttonSearch", "buttonCancelSearch", "buttonMeetingplace"].forEach((btnId) => {
        const btn = document.getElementById(btnId);
        if (btn) {
          const handler = () => setTimeout(() => cleanupSnippet(), 500);
          btn.addEventListener("click", handler);
          window.tildelingButtonListeners.push({ btn, handler });
        }
      });

      // Lytt på klikk på slett-ikoner (IMG med klassen 'dr')
      document.addEventListener("click", (e) => {
        if (!window.snippetActive) return;
        const target = e.target;
        if (target.tagName === "IMG" && target.classList.contains("dr")) {
          if (isDeleteButton(target)) {
            setTimeout(() => cleanupSnippet(), 500);
          }
        }
      }, true);

      // Lytt på klikk på rekvisisjonslenker og kjør cleanup
      document.addEventListener("click", (e) => {
        if (!window.snippetActive) return;
        
        const target = e.target;
        
        // Sjekk direkte klikk på lenke
        if (target.tagName === "A") {
          const href = target.getAttribute("href") || "";
          const targetAttr = target.getAttribute("target");
          
          if (targetAttr === "_blank" && 
              (href.includes("/rekvisisjon/requisition/") || 
               href.includes("redit?id=") ||
               target.id === "linkToRequisition")) {
            setTimeout(() => cleanupSnippet(), 300);
            return;
          }
        }
        
        // Sjekk klikk på bilde med onclick
        if (target.tagName === "IMG") {
          const onclick = target.getAttribute("onclick") || "";
          if (onclick.includes("window.open") && 
              onclick.includes("/rekvisisjon/requisition/patient?copyReqId=")) {
            setTimeout(() => cleanupSnippet(), 300);
            return;
          }
          
          // Sjekk om bildet er inne i en lenke (1 nivå opp)
          const parent = target.parentElement;
          if (parent && parent.tagName === "A") {
            const href = parent.getAttribute("href") || "";
            const targetAttr = parent.getAttribute("target");
            
            if (targetAttr === "_blank" && 
                (href.includes("/rekvisisjon/requisition/") || 
                 href.includes("redit?id=") ||
                 parent.id === "linkToRequisition")) {
              setTimeout(() => cleanupSnippet(), 300);
              return;
            }
          }
        }
      }, true);
    };

    // Sjekk om et bilde er en slett-knapp
    const isDeleteButton = (img) => {
      const onclick = img.getAttribute("onclick");
      return onclick && (onclick.includes("removeResurs") || onclick.includes("removePaagaaendeOppdrag") || onclick.includes("removeVentendeOppdrag"));
    };

    // Lukker rek-knapper når følgende funksjoner brukes
    // Smart-tildel (Alt+S), Tilordning (Alt+T), Avbestill (Alt+K), Hentetid (Alt+E), Bestillingsmodul (Alt+N), Hent rekvisisjon (Alt+H) og Møteplass (Alt+M)
    const CLEANUP_HOTKEYS = new Set(["s", "t", "k", "e", "n", "h", "m"]);
    
    document.addEventListener("keydown", (e) => {
      if (!window.snippetActive) return;
      if (!e.altKey) return;
    
      const key = e.key.toLowerCase();
      if (!CLEANUP_HOTKEYS.has(key)) return;

      cleanupSnippet();
    });

    // ============================================================
    // LYTTERE FOR FILTER-DROPDOWNS
    // Kjører cleanup når filter endres
    // ============================================================
    const setupFilterListeners = () => {
      document.addEventListener(
        "change",
        (e) => {
          if (!window.snippetActive) return;
    
          const target = e.target;
          if (
            target.tagName === "SELECT" &&
            target.classList.contains("filter")
          ) {
            setTimeout(() => cleanupSnippet(), 500);
          }
        },
        true // capture – samme mønster som resten
      );
    };
    setupFilterListeners();

    // ============================================================
    // RESET IFRAME
    // Brukes for å resette session før handlinger
    // ============================================================
    const resetIframe = () => new Promise((resolve) => {
      let iframe = document.getElementById("resetIframe");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "resetIframe";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }
      iframe.onload = () => { iframe.onload = null; resolve(); };
      iframe.src = "/rekvisisjon/requisition/exit";
    });

    // ============================================================
    // ÅPNE MODAL MED IFRAME
    // Brukes for å vise redigering, hendelseslogg, etc.
    // ============================================================
    const openModal = ({ url = null, requisitionNumber = null, isEditButton = false, isReturnButton = false } = {}) => {
      const modal = document.getElementById("iframeModal");
      const iframe = document.getElementById("iframeModalContent");
      
      if (!iframe) return;

      // Reset iframe
      iframe.onload = null;
      iframe.src = "about:blank";

      // Juster posisjonering basert på om vi er i ventende oppdrag
      if (modal) {
        modal.style.justifyContent = window.isVentendeOppdrag ? "flex-end" : "flex-start";
      }

      // Hjelpefunksjon: Scroll til og fokuser på hentetid-feltet
      const focusPickupTime = (doc, win) => {
        try {
          const pickupTimeField = doc.getElementById("pickupTime");
          if (!pickupTimeField) return;
          const iframeWin = win || doc.defaultView;
          // Vent to render-sykluser (rAF x2) slik at scrollHeight er ferdig
          // beregnet av nettleseren før vi måler og scroller.
          iframeWin.requestAnimationFrame(() => {
            iframeWin.requestAnimationFrame(() => {
              const scrollBottom = doc.documentElement.scrollHeight - iframeWin.innerHeight - 135;
              iframeWin.scrollTo({ top: scrollBottom, behavior: "instant" });
              pickupTimeField.focus({ preventScroll: true });
              // Tredje rAF: vent til nettleseren har prosessert focus-eventet
              // før select() kalles – hindrer sjeldne tilfeller der markering uteblir
              iframeWin.requestAnimationFrame(() => {
                pickupTimeField.select();
              });
            });
          });
        } catch (err) {}
      };

      // Tvinger Tilbake-knappen til alltid å bruke korrekt URL.
      // 4-stegs: table.top_navigation er synlig → addTrip-URL
      // Rekvirenttilhørighet: h2.wizard_middle med tekst "Rekvirent" → commissionerAndTreatmentCenter-URL
      // Ensides: ingen av over → altRequisition-URL
      const fixTilbakeLink = (doc) => {
        try {
          const isFourStep = !!doc.querySelector('table.top_navigation');
          const isCommissioner = isFourStep && Array.from(doc.querySelectorAll('h2.wizard_middle'))
            .some(h2 => h2.textContent.trim() === 'Rekvirent');
          const correctUrl = isCommissioner
            ? '/rekvisisjon/requisition/commissionerAndTreatmentCenter#anchorNameA'
            : isFourStep
              ? '/rekvisisjon/requisition/addTrip?idx=0#anchorNameA'
              : '/rekvisisjon/requisition/altRequisition?clear=false#anchorNameA';
          doc.querySelectorAll('a[href*="findTreatmentCenter"], a[href*="altRequisition"], a[href*="addTrip"], a[href*="commissionerAndTreatmentCenter"]').forEach(link => {
            if (link.querySelector('button[accesskey="T"]')) {
              link.href = correctUrl;
            }
          });
        } catch (e) {}
      };

      // Persistent load-lytter som fikser Tilbake-knappen ved hver
      // navigering inne i iframen (t.d. etter søk på behandlingssted).
      iframe.addEventListener("load", function onIframeLoad() {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (doc) fixTilbakeLink(doc);
        } catch (e) {}
      });

      // Scenario 1: Åpne direkte URL (hendelseslogg, manuell status, etc.)
      if (url) {
        iframe.src = url;
        if (modal) {
          modal.style.display = "flex";
          enableModalMode();
        }

        // Sett fokus på iframe etter lasting slik at snarveier virker uten klikk
        if (!isEditButton) {
          iframe.onload = function() {
            try { iframe.contentWindow.focus(); } catch (e) {}
          };
        }

        // Hvis det er rediger-knappen, klikk automatisk på "Rediger klar fra" og fokuser hentetid
        if (isEditButton) {
          const ridMatch = url ? url.match(/[?&]id=(\d+)/) : null;
          const rid = ridMatch ? ridMatch[1] : null;
          iframe.onload = function() {
            try {
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              const win = iframe.contentWindow;
              if (rid) fixTransportType(doc, rid);
              setTimeout(() => {
                const redigerBtn = doc.getElementById("redigerKlarFra");
                if (redigerBtn &&
                    win.getComputedStyle(redigerBtn).display !== "none" &&
                    win.getComputedStyle(redigerBtn).visibility !== "hidden") {
                  redigerBtn.click();
                  setTimeout(() => focusPickupTime(doc, win), 50);
                } else {
                  focusPickupTime(doc, win);
                }
              }, 100);
            } catch (err) {}
          };
        }
      }
      // Scenario 2: POST requisitionNumber (for T-knappen - lag retur)
      else if (requisitionNumber) {
        if (modal) {
          modal.style.display = "flex";
          enableModalMode();
        }
        
        let firstLoad = true;
        iframe.onload = function() {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          
          // Første load: POST requisitionNumber
          if (firstLoad) {
            firstLoad = false;
            try {
              doc.open();
              doc.write(`
                <form id="postForm" method="POST" action="/rekvisisjon/requisition/confirmGetRequisition">
                  <input type="hidden" name="transportCoordinator" value="true"/>
                  <input type="hidden" name="requisitionNumber" value="${requisitionNumber}"/>
                  <input type="hidden" name="query_by_requisition" value=""/>
                </form>
                <script>document.getElementById('postForm').submit();</script>
              `);
              doc.close();
            } catch (err) {}
          }
          // Andre load: Lag retur via makeReturn()
          else {
            if (window.lastEditedReqId) {
              try {
                iframe.contentWindow.eval(`javascript:makeReturn('${window.lastEditedReqId}','&ns=true');`);
                
                // makeReturn() trigger en ny sidelasting — vent på onload
                if (isReturnButton) {
                  iframe.onload = function() {
                    iframe.onload = null;
                    try {
                      const doc = iframe.contentDocument || iframe.contentWindow.document;
                      const win = iframe.contentWindow;
                      setTimeout(() => {
                        const redigerBtn = doc.getElementById("redigerKlarFra");
                        if (redigerBtn &&
                            win.getComputedStyle(redigerBtn).display !== "none" &&
                            win.getComputedStyle(redigerBtn).visibility !== "hidden") {
                          redigerBtn.click();
                          setTimeout(() => focusPickupTime(doc, win), 50);
                        } else {
                          focusPickupTime(doc, win);
                        }
                      //Ekstra tid for å sikre at makeReturn har fullført alle DOM-endringer før vi prøver å finne og klikke på rediger-knappen  
                      }, 200);
                    } catch (err) {}
                  };
                } else {
                  iframe.onload = null;
                }
              } catch (err) {}
            }
          }
        };
      }
    };

    // ============================================================
    // LUKK MODAL
    // ============================================================
    // Engangs XHR-interceptor som fyrer callback når openPopp(-1) sitt
    // AJAX-kall mot /planlegging/ajax-dispatch er ferdig.
    const onceAfterOpenPopp = (callback) => {
      const originalOpen = XMLHttpRequest.prototype.open;
      let restored = false;

      const restore = () => {
        if (!restored) {
          restored = true;
          XMLHttpRequest.prototype.open = originalOpen;
        }
      };

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' && url.includes('action=openres') && url.includes('rid=-1')) {
          restore();
          this.addEventListener('load', function() {
            callback();
          }, { once: true });
        }
        return originalOpen.call(this, method, url, ...rest);
      };

      // Sikkerhetsnett: restore etter 3s hvis openPopp aldri kalles
      setTimeout(restore, 3000);
    };

    const closeModal = () => {
      const modal = document.getElementById("iframeModal");
      const iframe = document.getElementById("iframeModalContent");

      if (modal) {
        modal.style.display = "none";
        disableModalMode();
      }
      if (iframe) {
        iframe.src = "about:blank";
        iframe.onload = null;
      }

      window.popupObserver?.disconnect();

      // Avslutt aktiv rekvisisjonssesjon (ikke nødvendig for H og S)
      if (window.lastModalButton !== "H" && window.lastModalButton !== "S") {
        resetIframe();
      }

      // Refresh data og gjenopprett popups når openPopp(-1) sitt XHR-kall er ferdig
      onceAfterOpenPopp(() => setTimeout(() => refreshAllPopups(), 50));
      if (typeof openPopp === "function") {
        openPopp("-1");
      }
    };

    // ============================================================
    // HJELPEFUNKSJONER
    // ============================================================
    
    // Sjekk om element er innenfor en bestemt parent-id
    const isInside = (el, parentId) => {
      if (!el) return false;
      for (let node = el; node; node = node.parentElement) {
        if (node.id === parentId) return true;
      }
      return false;
    };

    // Cleanup: Fjern alle popups og lyttere
    function cleanupSnippet() {
      if (!window.snippetActive) return;

      document.querySelectorAll('[id^="snippetPopup_"]').forEach((el) => el.remove());
      window.scrollHandlers?.forEach((handler) => window.removeEventListener("scroll", handler, true));
      window.scrollHandlers?.clear();
      window.activePopups?.clear();
      window.markedRowIds?.clear();
      window.snippetActive = false;
      window.rowObserver?.disconnect();
      
      if (window.escapeHandler) {
        window.removeEventListener("keydown", window.escapeHandler);
      }
      
      window.tildelingButtonListeners?.forEach(({ btn, handler }) => {
        btn.removeEventListener("click", handler);
      });
    };

    // ESC-tast for å lukke snippet
    window.escapeHandler = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        cleanupSnippet();
      }
    };
    window.addEventListener("keydown", window.escapeHandler);

    // Finn relevante bilder (voppimg_ eller popp_) i raden
    const getRelevantImages = (row) => {
      if (isInside(row, "ventendeoppdrag")) {
        return row.querySelectorAll('img[id^="voppimg_"]');
      } else if (isInside(row, "pagaendeoppdrag")) {
        return row.querySelectorAll('img[id^="popp_"]');
      }
      return [];
    };

    // Posisjon popup til venstre for et element
    const positionPopup = (popup, targetElement) => {
      if (popup && targetElement) {
        const rect = targetElement.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.top}px`;
        popup.style.left = `${window.scrollX + rect.left - popup.offsetWidth - 1}px`;
      }
    };

    // ============================================================
    // LAG POPUP MED KNAPPER
    // ============================================================
    const createPopupForRow = (row) => {
      // Ignorer ressurser
      if (isInside(row, "resurser")) return;

      const images = getRelevantImages(row);
      if (!images.length) return;

      // Hent requisition IDs fra bildene
      const reqIds = Array.from(images)
        .map((img) => img.id.replace(/^(voppimg_|popp_)/, ""))
        .filter(Boolean);

      if (!reqIds.length) return;

      const popupId = `snippetPopup_${reqIds[0]}`;
      
      // Unngå duplikater
      if (window.activePopups.has(popupId)) return;
      document.getElementById(popupId)?.remove();

      // Sjekk om vi er i ventende oppdrag
      const isVentende = window.isVentendeOppdrag = isInside(row, "ventendeoppdrag");

      // Lag popup container
      const popup = document.createElement("div");
      popup.id = popupId;
      Object.assign(popup.style, {
        position: "absolute",
        padding: "0",
        border: "1px solid #444",
        background: "#f9f9f9",
        fontFamily: "Arial",
        fontSize: "12px",
        borderRadius: "4px",
        zIndex: "9997",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      });

      // Finn kolonne for å posisjonere popup mot
      let targetCol = row.children[2] || row.children[row.children.length - 1];
      if (!targetCol) return;

      // Finn rad-bilder for høyde-matching
      const rowImages = targetCol.querySelectorAll("div.row-image");

      // Finn requisition numbers fra status-ikonene
      const lastCol = row.children[row.children.length - 1];
      if (!lastCol) return;
      const statusImages = lastCol.querySelectorAll("img[onclick*='searchStatus?nr=']");

      // ============================================================
      // LAG KNAPPER FOR HVER REQUISITION
      // ============================================================
      reqIds.forEach((reqId, index) => {
        let requisitionNumber = null;

        // Hent requisitionNumber fra onclick-attributt
        if (statusImages.length === 1) {
          const match = statusImages[0].getAttribute("onclick").match(/searchStatus\?nr=(\d+)/);
          if (match) requisitionNumber = match[1];
        } else if (statusImages.length > index) {
          const match = statusImages[index].getAttribute("onclick").match(/searchStatus\?nr=(\d+)/);
          if (match) requisitionNumber = match[1];
        }

        // Fallback: Hent fra title-attributt (for ventende oppdrag)
        if (isVentende && !requisitionNumber) {
          requisitionNumber = row.getAttribute("title");
        }

        // Lag container for knappene
        const btnContainer = document.createElement("div");
        Object.assign(btnContainer.style, {
          display: "flex",
          flexDirection: "row",
          gap: "0",
          margin: "0",
          padding: "0",
        });

        // ============================================================
        // KNAPPE-FABRIKK
        // ============================================================
        const createButton = (label) => {
          const btn = document.createElement("button");
          btn.textContent = label;
          btn.className = "tag-btn";

          // Skjul S-knappen i ventende oppdrag (gir ikke mening der)
          if (label === "S" && isVentende) {
            btn.style.display = "none";
          }

          // Match høyde med rad-bilder
          if (rowImages.length > index && rowImages[index]) {
            Object.assign(btn.style, {
              height: window.getComputedStyle(rowImages[index]).height,
              lineHeight: window.getComputedStyle(rowImages[index]).height,
            });
          } else {
            Object.assign(btn.style, {
              height: "15px",
              lineHeight: "15px",
              padding: "0 6px",
            });
          }

          // Tooltip
          btn.title = {
            S: "Manuell statusendring",
            H: "Hendelseslogg",
            K: "Kopier (Viser også bestilinger)",
            R: "Rediger",
            T: "Lag retur og link sammen",
          }[label] || "";

          // Klikk-handler
          btn.onclick = () => {
            window.isVentendeOppdrag = isVentende;
            window.lastEditedReqId = reqId;
            window.lastModalButton = label;

            // Sjekk for advarsel ved redigering av pågående oppdrag
            if (label === "R") {
              const resourceId = row.getAttribute("name"); // Bruk name-attributtet som er ressurs-ID
              const isPagaende = isOngoingAssignment(row);
              
              if (isPagaende && resourceId) {
                const resourceStatus = getResourceStatus(resourceId);
                if (resourceStatus && resourceStatus !== "Tildelt" && resourceStatus !== "Bekreftet") {
                  showWarningToast("OBS! Bestillingen kan endres, men endringen vil IKKE sendes til transportør!");
                }
              }
            }

            if (label === "T") {
              // T-knappen krever requisitionNumber
              if (!requisitionNumber) {
                alert("Kunne ikke finne requisitionNumber for T-knappen.");
                return;
              }
              resetIframe().then(() => openModal({ requisitionNumber, isReturnButton: true }));
            } else {
              // Andre knapper: Åpne direkte URL
              const urlMap = {
                S: `/administrasjon/admin/manualStatus?id=${reqId}`,
                H: `/administrasjon/admin/displayLog?id=${reqId}&type=requisition&db=1`,
                K: `/rekvisisjon/requisition/patient?copyReqId=${reqId}`,
                R: `/rekvisisjon/requisition/redit?id=${reqId}&noSerial=true`,
              };
              const openArgs = { url: urlMap[label], isEditButton: label === "R" };
              if (label === "H" || label === "S") {
                openModal(openArgs);
              } else {
                resetIframe().then(() => openModal(openArgs));
              }
            }
          };

          return btn;
        };

        // Lag alle knappene
        const btnH = createButton("H");
        const btnS = createButton("S");
        const btnK = createButton("K");
        const btnT = createButton("T");
        const btnR = createButton("R");

        // Legg til i containeren
        popup.appendChild(btnContainer);
        btnContainer.appendChild(btnH);
        if (btnS.style.display !== "none") btnContainer.appendChild(btnS);
        btnContainer.appendChild(btnK);
        btnContainer.appendChild(btnT);
        btnContainer.appendChild(btnR);
      });

      // Legg popup til DOM
      document.body.appendChild(popup);
      window.activePopups.add(popupId);

      // Posisjonér popup
      positionPopup(popup, targetCol);

      // Oppdater posisjon ved scroll
      const scrollHandler = () => positionPopup(popup, targetCol);
      window.scrollHandlers.set(popupId, scrollHandler);
      window.addEventListener("scroll", scrollHandler, true);
    };

    // ============================================================
    // REFRESH ALLE POPUPS
    // ============================================================
    const refreshAllPopups = () => {
      if (!window.snippetActive) return;

      // Fjern eksisterende popups
      document.querySelectorAll('[id^="snippetPopup_"]').forEach((el) => el.remove());
      window.activePopups.clear();
      window.scrollHandlers?.forEach((handler) => window.removeEventListener("scroll", handler, true));
      window.scrollHandlers?.clear();

      // Gjenopprett popups for merkede rader
      window.markedRowIds.forEach((rowId) => {
        const row = document.getElementById(rowId) || document.querySelector(`tr[name="${rowId}"]`);
        if (row) {
          // Re-merk raden (klikk selectRow)
          try {
            const td = row.querySelector('td[onclick*="selectRow"]');
            if (td) {
              const match = td.getAttribute("onclick").match(/selectRow\([^)]+\)/);
              if (match) eval(match[0]);
            }
          } catch (err) {}

          createPopupForRow(row);
        }
      });
    };

    // ============================================================
    // FINN OG PROSESSER MERKEDE RADER
    // ============================================================
    const processMarkedRows = () => {
      if (!window.snippetActive) return;

      let count = 0;
      document.querySelectorAll("tr").forEach((row) => {
        const bg = window.getComputedStyle(row).backgroundColor;
        
        // Sjekk om raden har riktig bakgrunnsfarge og er i riktig område
        if (bg === TARGET_BG && 
            (isInside(row, "ventendeoppdrag") || isInside(row, "pagaendeoppdrag")) &&
            !isInside(row, "resurser") &&
            (row.id || row.getAttribute("name"))) {
          
          window.markedRowIds.add(row.id || row.getAttribute("name"));
          createPopupForRow(row);
          count++;
        }
      });

      if (!count) {
        showErrorToast("🔠 Ingen bestillinger eller turer er valgt. Vennligst marker én eller flere og trykk på Rek-knapper eller Alt+R igjen.");
      }
    };

    processMarkedRows();
    setupTildelingListeners();

    // ============================================================
    // OPPRETT MODAL (hvis den ikke finnes)
    // ============================================================
    let modal = document.getElementById("iframeModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "iframeModal";
      Object.assign(modal.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "none",
        justifyContent: "flex-start",
        alignItems: "center",
        zIndex: "1000000",
      });

      const modalContainer = document.createElement("div");
      modalContainer.id = "iframeModalContainer";
      Object.assign(modalContainer.style, {
        position: "relative",
        width: "1580px",
        height: "100vh",
        marginRight: "0px",
        marginLeft: "0px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      });

      const closeButton = document.createElement("button");
      closeButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;stroke:#374151;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      Object.assign(closeButton.style, {
        position: "absolute",
        top: "16px",
        right: "16px",
        width: "36px",
        height: "36px",
        background: "rgba(255,255,255,0.95)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "0",
        userSelect: "none",
        zIndex: "1000001",
        transition: "all 0.2s ease",
      });
      closeButton.setAttribute("aria-label", "Lukk");
      closeButton.onmouseover = () => {
        closeButton.style.background = "#ffffff";
        closeButton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
      };
      closeButton.onmouseout = () => {
        closeButton.style.background = "rgba(255,255,255,0.95)";
        closeButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      };
      closeButton.onclick = closeModal;

      const iframe = document.createElement("iframe");
      iframe.id = "iframeModalContent";
      Object.assign(iframe.style, {
        flexGrow: "1",
        border: "none",
        height: "100%",
      });

      // Blokkér F5 og Alt alene i iframe
      iframe.addEventListener("load", () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const win = iframe.contentWindow;
          doc.addEventListener("keydown", (e) => {
            if (e.key === "F5") {
              e.preventDefault();
              e.stopPropagation();
            }
          }, true);
          // Blokker Alt alene inne i iframe
          let _iframeAltAlone = false;
          win.addEventListener('keydown', function(e) {
            if (e.key === 'Alt') { _iframeAltAlone = true; }
            else if (e.altKey)   { _iframeAltAlone = false; }
          }, true);
          win.addEventListener('keyup', function(e) {
            if (e.key === 'Alt' && _iframeAltAlone) { e.preventDefault(); }
            _iframeAltAlone = false;
          }, true);
        } catch (err) {}
      });

      modalContainer.appendChild(closeButton);
      modalContainer.appendChild(iframe);
      modal.appendChild(modalContainer);

      // Lukk modal ved klikk utenfor
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      document.body.appendChild(modal);
    }
  }

  console.log("✅ Rek-knapper-script lastet");
})();