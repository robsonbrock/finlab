// Cliente Supabase - carregado via CDN
// Wait for config to be ready, then initialize Supabase
function initSupabase() {
  const SUPABASE_URL = config.supabase.url;
  const SUPABASE_KEY = config.supabase.anonKey;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Cannot initialize Supabase: missing configuration');
    return;
  }

  // Carregar biblioteca Supabase
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.40.0';
  script.onload = function() {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // console.log('Supabase client initialized');

    // Disparar evento customizado para indicar que Supabase está pronto
    window.dispatchEvent(new CustomEvent('supabase-ready'));
  };
  script.onerror = function() {
    console.error('Failed to load DB library');
  };
  document.head.appendChild(script);
}

// Wait for config to be ready
if (config.ready) {
  initSupabase();
} else {
  window.addEventListener('config-ready', initSupabase, { once: true });
}
