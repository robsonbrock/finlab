// Configuration - Load from environment variables or window globals
const config = {
  supabase: {
    // Try multiple sources: window globals, localStorage, or window.env
    url:
      window.__SUPABASE_URL__ ||
      window.env?.supabase_url ||
      localStorage.getItem('supabase_url'),
    anonKey:
      window.__SUPABASE_ANON_KEY__ ||
      window.env?.supabase_anon_key ||
      localStorage.getItem('supabase_anon_key'),
  }
};

// Validate that required variables are set
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error(
    'Missing Supabase configuration.\n' +
    'Set one of:\n' +
    '  1. window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__\n' +
    '  2. localStorage: supabase_url and supabase_anon_key\n' +
    '  3. window.env.supabase_url and window.env.supabase_anon_key'
  );
}