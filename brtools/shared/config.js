// Configuration - Load from environment variables or window globals
let config = {
  supabase: {
    url: null,
    anonKey: null,
  },
  ready: false
};

// Initialize config (sync sources, async API fallback)
async function initConfig() {
  // Try sync sources first
  config.supabase.url =
    window.__SUPABASE_URL__ ||
    window.env?.supabase_url ||
    localStorage.getItem('supabase_url');

  config.supabase.anonKey =
    window.__SUPABASE_ANON_KEY__ ||
    window.env?.supabase_anon_key ||
    localStorage.getItem('supabase_anon_key');

  // If not found, try API endpoint (Vercel serverless function)
  if (!config.supabase.url || !config.supabase.anonKey) {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        config.supabase.url = config.supabase.url || data.supabase_url;
        config.supabase.anonKey = config.supabase.anonKey || data.supabase_anon_key;
      }
    } catch (error) {
      console.warn('Could not fetch config from API:', error);
    }
  }

  // Validate
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error(
      'Missing Supabase configuration.\n' +
      'Set one of:\n' +
      '  1. window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__\n' +
      '  2. localStorage: supabase_url and supabase_anon_key\n' +
      '  3. Vercel env vars: SUPABASE_URL and SUPABASE_ANON_KEY\n' +
      '  4. window.env.supabase_url and window.env.supabase_anon_key'
    );
  }

  config.ready = true;
  window.dispatchEvent(new CustomEvent('config-ready', { detail: config }));
  return config;
}

// Initialize immediately
initConfig();