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
    // LYTTERE FOR TILDELINGSKNAPPER
    // Oppdaterer knappene når tildeling skjer
    // ============================================================
    const setupTildelingListeners = () => {
      // Lytt på tildelingsknapper i dialogen
      ["buttonAssignVoppsAssistConfirm", "buttonAssignVopps"].forEach((btnId) => {
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
    };

    // Sjekk om et bilde er en slett-knapp
    const isDeleteButton = (img) => {
      const onclick = img.getAttribute("onclick");
      return onclick && (onclick.includes("removeResurs") || onclick.includes("removePaagaaendeOppdrag"));
    };

    // ============================================================
    // RESET IFRAME
    // Brukes for å resette session før handlinger
    // ============================================================
    const resetIframe = () => {
      let iframe = document.getElementById("resetIframe");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "resetIframe";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }
      iframe.src = "/rekvisisjon/requisition/exit";
    };

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
      const focusPickupTime = (doc) => {
        try {
          const pickupTimeField = doc.getElementById("pickupTime");
          if (pickupTimeField) {
            pickupTimeField.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => {
              pickupTimeField.focus();
              pickupTimeField.select();
            }, 100);
          }
        } catch (err) {}
      };

      // Scenario 1: Åpne direkte URL (hendelseslogg, manuell status, etc.)
      if (url) {
        iframe.src = url;
        if (modal) modal.style.display = "flex";

        // Hvis det er rediger-knappen, klikk automatisk på "Rediger klar fra" og fokuser hentetid
        if (isEditButton) {
          iframe.onload = function() {
            try {
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              setTimeout(() => {
                const redigerBtn = doc.getElementById("redigerKlarFra");
                if (redigerBtn && 
                    window.getComputedStyle(redigerBtn).display !== "none" && 
                    window.getComputedStyle(redigerBtn).visibility !== "hidden") {
                  redigerBtn.click();
                  setTimeout(() => focusPickupTime(doc), 0);
                } else {
                  focusPickupTime(doc);
                }
              }, 0);
            } catch (err) {}
          };
        }
      }
      // Scenario 2: POST requisitionNumber (for T-knappen - lag retur)
      else if (requisitionNumber) {
        if (modal) modal.style.display = "flex";
        
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
                
                // Hvis det er retur-knappen, klikk "Rediger klar fra" og fokuser hentetid
                if (isReturnButton) {
                  setTimeout(() => {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const redigerBtn = doc.getElementById("redigerKlarFra");
                    if (redigerBtn && 
                        window.getComputedStyle(redigerBtn).display !== "none" && 
                        window.getComputedStyle(redigerBtn).visibility !== "hidden") {
                      redigerBtn.click();
                      setTimeout(() => focusPickupTime(doc), 300);
                    } else {
                      focusPickupTime(doc);
                    }
                  }, 500);
                }
              } catch (err) {}
            }
            iframe.onload = null;
          }
        };
      }
    };

    // ============================================================
    // LUKK MODAL
    // ============================================================
    const closeModal = () => {
      const modal = document.getElementById("iframeModal");
      const iframe = document.getElementById("iframeModalContent");

      if (modal) modal.style.display = "none";
      if (iframe) {
        iframe.src = "about:blank";
        iframe.onload = null;
      }

      // Refresh data
      if (typeof openPopp === "function") {
        openPopp("-1");
      }

      window.popupObserver?.disconnect();
      setTimeout(() => refreshAllPopups(), 300);
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
        zIndex: "999999",
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

      // Reset iframe før handlinger
      resetIframe();

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

            if (label === "T") {
              // T-knappen krever requisitionNumber
              if (!requisitionNumber) {
                alert("Kunne ikke finne requisitionNumber for T-knappen.");
                return;
              }
              openModal({ requisitionNumber, isReturnButton: true });
            } else {
              // Andre knapper: Åpne direkte URL
              openModal({
                url: {
                  S: `/administrasjon/admin/manualStatus?id=${reqId}`,
                  H: `/administrasjon/admin/displayLog?id=${reqId}&type=requisition&db=1`,
                  K: `/rekvisisjon/requisition/patient?copyReqId=${reqId}`,
                  R: `/rekvisisjon/requisition/redit?id=${reqId}&noSerial=true`,
                }[label],
                isEditButton: label === "R",
              });
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
        alert("Ingen markerte rader funnet med riktig bakgrunnsfarge.");
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
        height: "95vh",
        marginLeft: "10px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      });

      const closeButton = document.createElement("button");
      closeButton.innerHTML = "&times;";
      Object.assign(closeButton.style, {
        position: "absolute",
        top: "8px",
        right: "12px",
        fontSize: "28px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#444",
        fontWeight: "bold",
        lineHeight: "1",
        padding: "0",
        userSelect: "none",
        zIndex: "1000001",
      });
      closeButton.title = "Lukk";
      closeButton.onclick = closeModal;

      const iframe = document.createElement("iframe");
      iframe.id = "iframeModalContent";
      Object.assign(iframe.style, {
        flexGrow: "1",
        border: "none",
        height: "100%",
      });

      // Blokkér F5 i iframe
      iframe.addEventListener("load", () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.addEventListener("keydown", (e) => {
            if (e.key === "F5") {
              e.preventDefault();
              e.stopPropagation();
            }
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