// Configuration - Load from environment variables or window globals
const config = {
  supabase: {
    url: window.__SUPABASE_URL__ || localStorage.getItem('supabase_url'),
    anonKey: window.__SUPABASE_ANON_KEY__ || localStorage.getItem('supabase_key'),
  }
};

// Validate that required variables are set
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('Missing required Supabase configuration. Set window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__');
}