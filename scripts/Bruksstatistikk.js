(() => {
  // ============================================================
  // BRUKSSTATISTIKK SCRIPT
  // Viser NISSY bruksstatistikk fra CountAPI
  // Kjøres direkte (ingen hotkey)
  // ============================================================

  // ============================================================
  // LOGGER BRUK AV BRUKSSTATISTIKK-SCRIPTET
  // ============================================================
  try {
    fetch('https://api.countapi.xyz/hit/nissy-stats/bruksstatistikk-script', { 
      method: 'GET' 
    }).catch(() => {});
  } catch (e) {}

  console.log("📊 Starter Bruksstatistikk-script");

  // ============================================================
  // VIS STATISTIKK
  // ============================================================
  async function showStatistics() {
    // Loaders og scripts som trackes
    const items = [
      { key: 'loader-basic', name: '📦 Loader Basic', category: 'production' },
      { key: 'loader-advanced', name: '📦 Loader Advanced', category: 'production' },
      { key: 'loader-expert', name: '📦 Loader Expert', category: 'production' },
      { key: 'loader-basic-dev', name: '🔧 Loader Basic (DEV)', category: 'development' },
      { key: 'loader-advanced-dev', name: '🔧 Loader Advanced (DEV)', category: 'development' },
      { key: 'loader-expert-dev', name: '🔧 Loader Expert (DEV)', category: 'development' },
      { key: 'bruksstatistikk-script', name: '📊 Bruksstatistikk-script', category: 'utility' }
    ];

    // Opprett overlay
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '999998',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    // Opprett popup
    const popup = document.createElement('div');
    Object.assign(popup.style, {
      background: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      maxWidth: '700px',
      width: '90%',
      maxHeight: '85vh',
      overflow: 'auto',
      fontFamily: 'Arial, sans-serif'
    });

    popup.innerHTML = `
      <div style="position: sticky; top: -30px; background: white; padding-bottom: 15px; margin: -30px -30px 20px -30px; padding: 20px 30px; border-bottom: 2px solid #007bff; z-index: 1;">
        <h2 style="margin: 0; color: #333; display: flex; justify-content: space-between; align-items: center;">
          <span>📊 NISSY Bruksstatistikk</span>
          <button id="refreshStatsBtn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
          ">🔄 Oppdater</button>
        </h2>
      </div>
      <div id="statsContent" style="color: #666; text-align: center; padding: 40px 20px;">
        <div style="display: inline-block;">
          <div style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        </div>
        <p style="margin-top: 15px; font-size: 14px;">Laster statistikk...</p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button id="closeStatsBtn" style="
          flex: 1;
          padding: 10px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        ">Lukk</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // ============================================================
    // LUKK-FUNKSJON
    // ============================================================
    const closePopup = () => {
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.removeEventListener('keydown', escHandler);
    };

    popup.querySelector('#closeStatsBtn').onclick = closePopup;
    overlay.onclick = (e) => {
      if (e.target === overlay) closePopup();
    };

    const escHandler = (e) => {
      if (e.key === 'Escape') closePopup();
    };
    document.addEventListener('keydown', escHandler);

    // ============================================================
    // HENT OG VIS STATISTIKK
    // ============================================================
    async function loadStatsData() {
      const statsContent = popup.querySelector('#statsContent');
      
      statsContent.innerHTML = `
        <div style="display: inline-block;">
          <div style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        </div>
        <p style="margin-top: 15px; font-size: 14px;">Laster statistikk...</p>
      `;

      let html = '<div style="overflow-x: auto;">';
      html += '<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">';
      
      // Production loaders
      html += '<thead><tr style="background: #007bff; color: white;">';
      html += '<th colspan="2" style="padding: 12px; font-weight: 600; text-align: left;">Production Loaders</th>';
      html += '</tr></thead><tbody>';

      let productionTotal = 0;
      for (const item of items.filter(i => i.category === 'production')) {
        try {
          const response = await fetch(`https://api.countapi.xyz/get/nissy-stats/${item.key}`);
          const data = await response.json();
          const count = data.value || 0;
          productionTotal += count;

          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #495057; text-align: right; font-weight: 600;">${count.toLocaleString('no-NO')}</td>
            </tr>
          `;
        } catch (err) {
          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #dc3545; text-align: right; font-size: 12px;">Feil ved henting</td>
            </tr>
          `;
        }
      }

      // Development loaders
      html += '<thead><tr style="background: #ffc107; color: #333;">';
      html += '<th colspan="2" style="padding: 12px; font-weight: 600; text-align: left;">Development Loaders</th>';
      html += '</tr></thead><tbody>';

      let devTotal = 0;
      for (const item of items.filter(i => i.category === 'development')) {
        try {
          const response = await fetch(`https://api.countapi.xyz/get/nissy-stats/${item.key}`);
          const data = await response.json();
          const count = data.value || 0;
          devTotal += count;

          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #495057; text-align: right; font-weight: 600;">${count.toLocaleString('no-NO')}</td>
            </tr>
          `;
        } catch (err) {
          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #dc3545; text-align: right; font-size: 12px;">Feil ved henting</td>
            </tr>
          `;
        }
      }

      // Utility scripts
      html += '<thead><tr style="background: #17a2b8; color: white;">';
      html += '<th colspan="2" style="padding: 12px; font-weight: 600; text-align: left;">Utility Scripts</th>';
      html += '</tr></thead><tbody>';

      let utilityTotal = 0;
      for (const item of items.filter(i => i.category === 'utility')) {
        try {
          const response = await fetch(`https://api.countapi.xyz/get/nissy-stats/${item.key}`);
          const data = await response.json();
          const count = data.value || 0;
          utilityTotal += count;

          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #495057; text-align: right; font-weight: 600;">${count.toLocaleString('no-NO')}</td>
            </tr>
          `;
        } catch (err) {
          html += `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px; color: #495057;">${item.name}</td>
              <td style="padding: 10px; color: #dc3545; text-align: right; font-size: 12px;">Feil ved henting</td>
            </tr>
          `;
        }
      }

      // Grand total
      const grandTotal = productionTotal + devTotal + utilityTotal;
      html += '<tfoot>';
      html += `
        <tr style="background: #e7f3ff; border-top: 3px solid #007bff;">
          <td style="padding: 12px; color: #007bff; font-weight: bold; font-size: 15px;">TOTALT</td>
          <td style="padding: 12px; color: #007bff; text-align: right; font-weight: bold; font-size: 15px;">${grandTotal.toLocaleString('no-NO')}</td>
        </tr>
      `;
      html += '</tfoot></table></div>';

      // Info box
      html += `
        <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #007bff; border-radius: 4px; font-size: 13px; color: #004085; line-height: 1.6;">
          <strong>ℹ️ Om statistikken:</strong><br>
          • Tallene viser antall ganger hvert script/loader har blitt lastet<br>
          • Ingen persondata eller IP-adresser lagres<br>
          • Oppdateres i sanntid via CountAPI<br>
          • Sist oppdatert: ${new Date().toLocaleString('no-NO', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          })}
        </div>
      `;

      statsContent.innerHTML = html;
    }

    // Last inn data første gang
    await loadStatsData();

    // Refresh-knapp
    popup.querySelector('#refreshStatsBtn').onclick = async () => {
      const btn = popup.querySelector('#refreshStatsBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Oppdaterer...';
      btn.disabled = true;
      
      await loadStatsData();
      
      btn.innerHTML = originalText;
      btn.disabled = false;
    };
  }

  // ============================================================
  // KJØR STATISTIKK VED LASTING
  // ============================================================
  showStatistics();

  console.log("✅ Bruksstatistikk-script lastet og vist");
})();
