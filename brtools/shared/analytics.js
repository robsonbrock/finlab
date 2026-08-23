// Objeto único de analytics que permeia todas as páginas
// Placeholder para futura integração com Google Analytics
window.analytics = {
  // Configurar Google Analytics (será preenchido em breve)
  init: function(gaId) {
    // console.log('Analytics initialized with:', gaId);
  },

  // Rastrear evento
  event: function(category, action, label, value) {
    // console.log('Analytics event:', { category, action, label, value });
    // TODO: Conectar ao Google Analytics
  },

  // Rastrear visualização de página
  pageview: function(pageName) {
    // console.log('Analytics pageview:', pageName);
    // TODO: Conectar ao Google Analytics
  },

  // Rastrear ação de sala
  trackRoomAction: function(action, roomId) {
    this.event('room', action, roomId);
  },

  // Rastrear ação de card
  trackCardAction: function(action, roomId, columnId) {
    this.event('card', action, `${roomId}/${columnId}`);
  }
};

// Rastrear visualização de página ao carregar
window.addEventListener('load', function() {
  const pageName = window.location.pathname.split('/').pop() || 'index';
  window.analytics.pageview(pageName);
});
