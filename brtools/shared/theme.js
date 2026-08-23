// Sistema de temas dark/light
(function() {
  const STORAGE_KEY = 'brtools_theme';
  const html = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getCurrentTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return getSystemTheme();
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcon();
  }

  function updateToggleIcon() {
    const theme = html.getAttribute('data-theme');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    }
  }

  function toggleTheme() {
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Inicializar
  setTheme(getCurrentTheme());

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Expor globalmente
  window.theme = {
    getCurrent: () => html.getAttribute('data-theme'),
    set: setTheme,
    toggle: toggleTheme
  };
})();
