// Cliente Supabase - carregado via CDN
// Load configuration from environment variables
const SUPABASE_URL = config.supabase.url;
const SUPABASE_KEY = config.supabase.anonKey;

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
