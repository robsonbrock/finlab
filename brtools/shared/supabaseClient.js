// Cliente Supabase - carregado via CDN
const SUPABASE_URL = 'https://fnqbkefxzcmhrinibhhk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucWJrZWZ4emNtaHJpbmliaGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NjU1NDYsImV4cCI6MjEwMzA0MTU0Nn0.9DgSM79uf34QBTnZ7eshGOuSbijvS4BNpUpqLQg5aZ0';

// Carregar biblioteca Supabase
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.40.0';
script.onload = function() {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client initialized');

  // Disparar evento customizado para indicar que Supabase está pronto
  window.dispatchEvent(new CustomEvent('supabase-ready'));
};
script.onerror = function() {
  console.error('Failed to load Supabase library');
};
document.head.appendChild(script);
