(async () => {
  const BASE = 'https://raw.githubusercontent.com/olorinmaia/NISSY/main/scripts/';
  
  const scripts = [
    'NISSY-fiks.js',
    'Smart-tildeling.js',
    'Rek-knapper.js',
    'Rutekalkulator.js',
    'Avbestilling.js',
    'Ressursinfo.js'
  ];

  console.log('📦 Laster NISSY Expert (alle features)...');
  
  for (const script of scripts) {
    try {
      const response = await fetch(BASE + script);
      const code = await response.text();
      eval(code);
    } catch (err) {
      console.error(`❌ Feil ved lasting av ${script}:`, err);
    }
  }
  
  console.log('✅ NISSY Expert lastet!');
})();
