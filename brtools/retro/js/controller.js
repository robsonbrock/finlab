// Controlador principal - gerencia interações da UI
let currentRoomId = null;
let currentRoom = null;
let columns = {};
let subscriptions = [];
let pendingColumnDelete = null;
let pendingCardDelete = null;
let emojiPickerCardId = null;
let emojiPickerColumnId = null;
let draggedCard = null;
let draggedColumn = null;
let mergeTargetCard = null;
let pendingMerge = null;
let reorderTimeouts = {};
let sessionId = null;
let sortBy = 'data-criacao';
let voteCount = 0;
let pendingMaxLikesChange = null;
let pendingEmptyColumnDelete = null;

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal notifications
function showErrorModal(message) {
  const errorMsg = document.getElementById('errorModalMessage');
  if (errorMsg) errorMsg.textContent = message;
  document.getElementById('errorModal').classList.add('open');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('open');
}

function showSuccessModal(message) {
  const successMsg = document.getElementById('successModalMessage');
  if (successMsg) successMsg.textContent = message;
  document.getElementById('successModal').classList.add('open');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('open');
}

// Atualizar display do contador de votos
function updateVoteCounter() {
  const counter = document.getElementById('voteCounter');
  if (counter) counter.textContent = voteCount;
}

// Modal de limite de votos
function showVoteLimitModal(maxLikes) {
  const message = document.getElementById('voteLimitMessage');
  if (message) {
    message.textContent = `Limite de ${maxLikes} votos por coluna atingido!`;
  }
  document.getElementById('voteLimitModal').classList.add('open');
}

function closeVoteLimitModal() {
  document.getElementById('voteLimitModal').classList.remove('open');
}

// Modal de mudança de limite de votos
function showChangeLikesLimitModal1(newValue) {
  pendingMaxLikesChange = parseInt(newValue);
  document.getElementById('changeLikesLimitModal1').classList.add('open');
}

function closeChangeLikesLimitModals() {
  document.getElementById('changeLikesLimitModal1').classList.remove('open');
  document.getElementById('changeLikesLimitModal2').classList.remove('open');
  pendingMaxLikesChange = null;
}

function showChangeLikesLimitModal2() {
  document.getElementById('changeLikesLimitModal1').classList.remove('open');
  document.getElementById('changeLikesLimitModal2').classList.add('open');
}

async function confirmChangeLikesLimit() {
  if (!pendingMaxLikesChange) return;

  try {
    // Atualizar limite no banco
    await repository.updateRoom(currentRoomId, { max_likes_per_column: pendingMaxLikesChange });
    currentRoom.max_likes_per_column = pendingMaxLikesChange;

    // Deletar todos os likes da sala
    const allCardIds = Object.values(columns).flatMap(col => col.cards.map(c => c.id));
    const { error } = await window.supabaseClient
      .from('card_likes')
      .delete()
      .in('card_id', allCardIds);

    if (error) throw error;

    // Atualizar UI
    Object.values(columns).forEach(column => {
      column.cards.forEach(card => {
        const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
        if (cardElement) {
          const likeBtn = cardElement.querySelector('.card-like');
          if (likeBtn) {
            likeBtn.innerHTML = `🤍 <span class="like-count">0</span>`;
            likeBtn.classList.remove('active');
          }
        }
      });
    });

    // Resetar contador de votos
    voteCount = 0;
    localStorage.setItem(`votesCount_${currentRoomId}`, 0);
    updateVoteCounter();

    closeChangeLikesLimitModals();
    window.analytics.trackRoomAction('likes_limit_changed', currentRoomId);
    showToast(`Limite alterado para ${pendingMaxLikesChange} votos. Todos os votos foram zerados.`, 'success');
  } catch (error) {
    console.error('❌ Erro ao alterar limite de votos:', error);
    showErrorModal('Erro ao alterar limite de votos.');
    closeChangeLikesLimitModals();
  }
}

// Gerar/recuperar session ID
function getOrCreateSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', id);
  }
  return id;
}

const EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '✨', '🎉', '😍', '👏', '💡', '🚀', '🎯', '📈', '⭐', '💯', '🙌', '😎', '🤔', '😢', '👎', '🤮', '💪', '🏆', '🎭', '🌟'];

// Inicialização
async function init() {
  // Gerar/recuperar session ID
  sessionId = getOrCreateSessionId();

  const params = new URLSearchParams(window.location.search);
  currentRoomId = params.get('id')?.toUpperCase();

  if (!currentRoomId || currentRoomId.length !== 4) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('roomCode').textContent = currentRoomId;

  // Inicializar contador de votos para 0 (será incrementado conforme vota nesta sessão)
  voteCount = 0;
  localStorage.setItem(`votesCount_${currentRoomId}`, 0);
  updateVoteCounter();

  // Verificar se é facilitador (criador da sala)
  const isFacilitador = localStorage.getItem(`facilitador_${currentRoomId}`) === 'true';

  // Se não for facilitador, esconder comboboxes de controle
  if (!isFacilitador) {
    document.getElementById('sortSelect').style.display = 'none';
    document.getElementById('clearSelect')?.parentElement?.style.display = 'none';
    document.getElementById('maxLikesInput')?.parentElement?.style.display = 'none';
  }

  try {
    // Esperar Supabase estar pronto
    if (!window.supabaseClient) {
      await new Promise(resolve => window.addEventListener('supabase-ready', resolve, { once: true }));
    }

    // Carregar dados iniciais
    const { room, columns: loadedColumns } = await roomService.loadRoom(currentRoomId);
    currentRoom = room;
    document.getElementById('roomNameSpan').textContent = room.nome;

    // Definir limite de votos por coluna
    const maxLikes = room.max_likes_per_column || 5;
    document.getElementById('maxLikesInput').value = maxLikes;

    // Definir ordenação inicial
    if (room.sort_by) {
      sortBy = room.sort_by;
      document.getElementById('sortSelect').value = sortBy;
    }

    // Renderizar TODAS as colunas primeiro (paralelo)
    for (const column of loadedColumns) {
      columns[column.id] = { ...column, cards: [] };
      renderColumn(column); // Sem await
    }

    // Carregar cards de TODAS as colunas em paralelo
    await Promise.all(
      loadedColumns.map(column => loadColumnCards(column.id))
    );

    // Assinar atualizações em tempo real
    subscribeToChanges();

    // Event listeners
    document.querySelector('.header-back').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditRoom();
        closeDeleteColumnModal();
        closeDeleteCardModal();
        closeEmptyCardDeleteModal();
        closeEmptyColumnDeleteModal();
        closeEmojiPicker();
        closeVoteLimitModal();
        closeChangeLikesLimitModals();
        closeMergeCardsModal();
      }
    });

  } catch (error) {
    console.error('Erro ao inicializar:', error);
    showErrorModal('Erro ao carregar a sala. Redirecionando...');
    window.location.href = 'index.html';
  }
}

// Carregar cards de uma coluna
async function loadColumnCards(columnId) {
  try {
    const cards = await repository.getCards(columnId);
    columns[columnId].cards = cards;

    const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
    if (!container) return;

    // Carregar dados (likes, emojis) de TODOS os cards em paralelo
    const cardsWithData = await Promise.all(
      cards.map(async (card) => ({
        ...card,
        likes: await repository.getLikesCount(card.id),
        userLiked: await repository.getUserLiked(card.id, sessionId),
        emojiString: await roomService.getEmojiString(card.id),
      }))
    );

    // Renderizar todos os cards
    cardsWithData.forEach(cardData => {
      renderCardDirect(columnId, cardData, container);
    });
  } catch (error) {
    console.error('Erro ao carregar cards:', error);
  }
}

// Renderizar coluna
async function renderColumn(column, isNewColumn = false) {
  const container = document.getElementById('columns-container');

  const columnDiv = document.createElement('div');
  columnDiv.className = 'column';
  columnDiv.setAttribute('data-column-id', column.id);
  columnDiv.setAttribute('draggable', 'true');

  const nameClass = isNewColumn ? 'column-name editing' : 'column-name';

  columnDiv.innerHTML = `
    <div class="column-header">
      <div class="${nameClass}" onclick="editColumnName('${column.id}')">${escapeHtml(column.nome)}</div>
      <div class="column-actions">
        <input type="color" class="btn-color" value="${column.cor}" onchange="changeColumnColor('${column.id}', this.value)">
        <button class="btn-delete" onclick="openDeleteColumn('${column.id}')">🗑️</button>
      </div>
    </div>
    <div class="column-add-card">
      <button class="btn-add-card" onclick="addCard('${column.id}')">+ Adicionar Card</button>
    </div>
    <div class="column-cards"></div>
  `;

  // Aplicar cor ao fundo da coluna
  const rgbColor = hexToRgb(column.cor);
  if (rgbColor) {
    columnDiv.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`;
  }

  // Drag-and-drop para coluna
  columnDiv.addEventListener('dragstart', handleColumnDragStart);
  columnDiv.addEventListener('dragend', handleColumnDragEnd);
  columnDiv.addEventListener('dragover', handleColumnDragOver);
  columnDiv.addEventListener('drop', handleColumnDrop);

  // Drag-and-drop para cards (mesmo em coluna vazia)
  const columnCardsDiv = columnDiv.querySelector('.column-cards');
  if (columnCardsDiv) {
    columnCardsDiv.addEventListener('dragover', handleCardDragOver);
    columnCardsDiv.addEventListener('drop', handleCardDrop);
  }

  // Inserir antes do botão "+ Coluna"
  const addColumnBtn = container.querySelector('.add-column-btn');
  if (addColumnBtn) {
    container.insertBefore(columnDiv, addColumnBtn);
  } else {
    container.appendChild(columnDiv);
  }

  // Se é coluna nova, focar no nome e deixar editável
  if (isNewColumn) {
    setTimeout(() => {
      const nameDiv = columnDiv.querySelector('.column-name');
      if (nameDiv) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'column-name-input';
        input.value = column.nome;
        input.maxLength = 30;

        nameDiv.replaceWith(input);
        input.focus();
        input.select();

        input.addEventListener('blur', () => saveColumnName(column.id));
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') saveColumnName(column.id);
        });
      }
    }, 0);
  }
}

// Renderizar card com dados já carregados (sem requisições)
function renderCardDirect(columnId, cardData, container) {
  const column = columns[columnId];

  // Remover card duplicado se existir
  const existingCard = container.querySelector(`[data-card-id="${cardData.id}"]`);
  if (existingCard) {
    existingCard.remove();
  }

  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  cardDiv.setAttribute('data-card-id', cardData.id);
  cardDiv.setAttribute('draggable', 'true');
  cardDiv.setAttribute('data-col-color', column.cor);

  const rgbColor = hexToRgb(column.cor);
  cardDiv.style.borderColor = column.cor;
  if (rgbColor) {
    cardDiv.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
  }

  const isNewCard = cardData.texto === '';

  cardDiv.innerHTML = `
    <textarea class="card-text" data-card-id="${cardData.id}" maxlength="500" onblur="saveCardText(this)" oninput="autoResizeTextarea(this)">${escapeHtml(cardData.texto)}</textarea>
    <div class="card-bottom">
      <div class="card-emojis">
        <button class="btn-emoji" onclick="openEmojiPicker('${cardData.id}', '${columnId}')">😊</button>
        <span id="emojis-${cardData.id}">${cardData.emojiString}</span>
      </div>
      <button class="card-like" data-card-id="${cardData.id}" onclick="toggleLike(this)" title="${cardData.likes.length} likes">
        ${cardData.userLiked ? '❤️' : '🤍'}
        <span class="like-count">${cardData.likes.length}</span>
      </button>
      <button class="card-delete" onclick="openDeleteCard('${cardData.id}', '${columnId}')">🗑️</button>
    </div>
  `;

  if (cardData.userLiked) {
    cardDiv.querySelector('.card-like').classList.add('active');
  }

  cardDiv.addEventListener('dragstart', handleCardDragStart);
  cardDiv.addEventListener('dragend', handleCardDragEnd);
  cardDiv.addEventListener('dragover', handleCardDragOver);
  cardDiv.addEventListener('drop', handleCardDrop);

  container.addEventListener('dragover', handleCardDragOver);
  container.addEventListener('drop', handleCardDrop);

  container.appendChild(cardDiv);

  // Auto-resize inicial
  const textarea = cardDiv.querySelector('.card-text');
  if (textarea) {
    autoResizeTextarea(textarea);

    if (isNewCard) {
      setTimeout(() => {
        textarea.focus();
        textarea.select();
      }, 0);
    }
  }
}

// Renderizar card (usado pelo Realtime)
async function renderCard(columnId, card) {
  const column = columns[columnId];
  const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
  if (!container) return;

  // Remover card duplicado se existir
  const existingCard = container.querySelector(`[data-card-id="${card.id}"]`);
  if (existingCard) {
    existingCard.remove();
  }

  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  cardDiv.setAttribute('data-card-id', card.id);
  cardDiv.setAttribute('draggable', 'true');
  cardDiv.setAttribute('data-col-color', column.cor);

  // Aplicar cor com transparência
  const rgbColor = hexToRgb(column.cor);
  cardDiv.style.borderColor = column.cor;
  if (rgbColor) {
    cardDiv.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
  }

  const likes = await repository.getLikesCount(card.id);
  const userLiked = await repository.getUserLiked(card.id, sessionId);
  const emojiString = await roomService.getEmojiString(card.id);

  const isNewCard = card.texto === '';

  cardDiv.innerHTML = `
    <textarea class="card-text" data-card-id="${card.id}" maxlength="500" onblur="saveCardText(this)" oninput="autoResizeTextarea(this)">${escapeHtml(card.texto)}</textarea>
    <div class="card-bottom">
      <div class="card-emojis">
        <button class="btn-emoji" onclick="openEmojiPicker('${card.id}', '${columnId}')">😊</button>
        <span id="emojis-${card.id}">${emojiString}</span>
      </div>
      <button class="card-like" data-card-id="${card.id}" onclick="toggleLike(this)" title="${likes.length} likes">
        ${userLiked ? '❤️' : '🤍'}
        <span class="like-count">${likes.length}</span>
      </button>
      <button class="card-delete" onclick="openDeleteCard('${card.id}', '${columnId}')">🗑️</button>
    </div>
  `;

  // Aplicar estilos iniciais
  if (userLiked) {
    cardDiv.querySelector('.card-like').classList.add('active');
  }

  // Drag and drop
  cardDiv.addEventListener('dragstart', handleCardDragStart);
  cardDiv.addEventListener('dragend', handleCardDragEnd);
  cardDiv.addEventListener('dragover', handleCardDragOver);
  cardDiv.addEventListener('drop', handleCardDrop);

  // Permitir drop de cards neste container
  container.addEventListener('dragover', handleCardDragOver);
  container.addEventListener('drop', handleCardDrop);

  container.appendChild(cardDiv);

  // Auto-resize inicial
  const textarea = cardDiv.querySelector('.card-text');
  if (textarea) {
    autoResizeTextarea(textarea);
  }

  // Se é card novo, fazer focus no textarea
  if (isNewCard) {
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 0);
    showToast('Card criado', 'success');
  }
}

// Editar nome da sala
function editRoomName() {
  const modal = document.getElementById('editRoomModal');
  const input = document.getElementById('editRoomInput');
  input.value = currentRoom.nome;
  modal.classList.add('open');
  input.focus();
  input.select();
}

function closeEditRoom() {
  document.getElementById('editRoomModal').classList.remove('open');
}

async function saveRoomName() {
  const newName = document.getElementById('editRoomInput').value.trim();
  const oldName = currentRoom.nome;

  if (!newName) {
    // Reverter para nome anterior sem mostrar alert
    document.getElementById('editRoomInput').value = oldName;
    return;
  }

  if (newName === oldName) {
    closeEditRoom();
    return;
  }

  try {
    const updated = await roomService.updateRoomName(currentRoomId, newName);
    currentRoom = updated;
    document.getElementById('roomNameSpan').textContent = updated.nome;
    closeEditRoom();
  } catch (error) {
    console.error('Erro ao salvar nome:', error);
    // Reverter para nome anterior sem mostrar alert
    document.getElementById('editRoomInput').value = oldName;
  }
}

// Editar nome da coluna
function editColumnName(columnId) {
  const column = columns[columnId];
  const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
  const nameDiv = columnDiv.querySelector('.column-name');

  // Verificar se já está em modo de edição
  if (nameDiv.classList.contains('editing')) {
    return;
  }

  nameDiv.classList.add('editing');
  const oldName = column.nome;
  nameDiv.innerHTML = `<input type="text" class="column-name-input" value="${escapeHtml(oldName)}" maxlength="30">`;

  const input = nameDiv.querySelector('input');
  input.focus();
  input.select();

  // Handler para blur e escape
  const handleBlur = () => {
    input.removeEventListener('blur', handleBlur);
    input.removeEventListener('keydown', handleKeyDown);
    saveColumnNameInline(columnId, input, oldName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      input.blur();
    } else if (e.key === 'Escape') {
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleKeyDown);
      nameDiv.textContent = escapeHtml(oldName);
      nameDiv.classList.remove('editing');
    }
  };

  input.addEventListener('blur', handleBlur);
  input.addEventListener('keydown', handleKeyDown);

  // Prevenir propagação de cliques
  input.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

async function saveColumnNameInline(columnId, inputElement, oldName) {
  const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
  const nameDiv = columnDiv?.querySelector('.column-name');

  if (!nameDiv) {
    console.error('nameDiv não encontrado para coluna', columnId);
    return;
  }

  const newName = inputElement.value.trim();

  // Se o nome ficou vazio, perguntar se deseja excluir
  if (!newName) {
    openEmptyColumnDeleteModal(columnId, inputElement, oldName);
    return;
  }

  // Se o nome não mudou, só fechar a edição
  if (newName === oldName) {
    nameDiv.textContent = escapeHtml(oldName);
    nameDiv.classList.remove('editing');
    return;
  }

  try {
    const updated = await roomService.updateColumnName(columnId, newName, currentRoomId);

    columns[columnId].nome = updated.nome;
    nameDiv.textContent = escapeHtml(updated.nome);
    nameDiv.classList.remove('editing');
  } catch (error) {
    console.error('Erro ao salvar nome da coluna:', error);

    // Reverter para o nome anterior
    nameDiv.textContent = escapeHtml(oldName);
    nameDiv.classList.remove('editing');
  }
}

// Mudar cor da coluna
async function changeColumnColor(columnId, color) {
  try {
    const updated = await roomService.updateColumnColor(columnId, color, currentRoomId);
    columns[columnId].cor = color;

    const rgbColor = hexToRgb(color);

    // Aplicar cor ao fundo inteiro da coluna
    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnDiv && rgbColor) {
      columnDiv.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`;
    }

    // Atualizar bordas, background e like button de todos os cards
    const cards = document.querySelectorAll(`[data-column-id="${columnId}"] .card`);

    cards.forEach(card => {
      card.style.borderColor = color;
      if (rgbColor) {
        card.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
      }

      const likeBtn = card.querySelector('.card-like');
      likeBtn.style.borderColor = color;
      if (likeBtn.classList.contains('active')) {
        likeBtn.style.backgroundColor = color;
      }
    });
  } catch (error) {
    console.error('Erro ao mudar cor:', error);
    showErrorModal('Erro ao mudar a cor da coluna.');
  }
}

// Adicionar coluna
async function addColumn() {
  try {
    await roomService.createColumn(currentRoomId);
    // NÃO renderizar aqui - deixar o Realtime cuidar para evitar duplicação
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
    showErrorModal('Erro ao adicionar coluna.');
  }
}

// Deletar coluna
function openDeleteColumn(columnId) {
  pendingColumnDelete = columnId;
  document.getElementById('deleteColumnModal1').classList.add('open');
}

function closeDeleteColumnModal() {
  document.getElementById('deleteColumnModal1').classList.remove('open');
  document.getElementById('deleteColumnModal2').classList.remove('open');
  pendingColumnDelete = null;
}

function confirmDeleteColumn() {
  document.getElementById('deleteColumnModal1').classList.remove('open');
  document.getElementById('deleteColumnModal2').classList.add('open');
}

async function finalDeleteColumn() {
  if (!pendingColumnDelete) return;

  try {
    const columnId = pendingColumnDelete;
    await roomService.deleteColumn(columnId, currentRoomId);
    delete columns[columnId];

    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnDiv) columnDiv.remove();

    closeDeleteColumnModal();
    showToast('Coluna excluída', 'success');
  } catch (error) {
    console.error('Erro ao deletar coluna:', error);
    showErrorModal('Erro ao deletar a coluna.');
    closeDeleteColumnModal();
  }
}

// Adicionar card
async function addCard(columnId) {
  try {
    await roomService.createCard(columnId, '', currentRoomId);
    // O Realtime vai renderizar o card com autofocus
  } catch (error) {
    console.error('Erro ao adicionar card:', error);
    showErrorModal('Erro: ' + error.message);
  }
}

// Auto-resize textarea conforme digita (mínimo 14px)
function autoResizeTextarea(textarea) {
  textarea.style.height = '14px';
  textarea.style.height = Math.max(14, textarea.scrollHeight) + 'px';
}

// Salvar texto do card
async function saveCardText(textarea) {
  const cardId = textarea.getAttribute('data-card-id');
  const columnId = textarea.closest('[data-column-id]').getAttribute('data-column-id');
  const newText = textarea.value.trim();

  if (!newText) {
    // Se está vazio, abrir modal para confirmar deleção
    openEmptyCardDeleteModal(textarea, cardId, columnId);
    return;
  }

  try {
    await roomService.updateCardText(cardId, newText, columnId, currentRoomId);
    const card = columns[columnId].cards.find(c => c.id === cardId);
    if (card) card.texto = newText;
  } catch (error) {
    console.error('Erro ao salvar card:', error);
    showErrorModal('Erro: ' + error.message);
  }
}

// Variável para card vazio que será deletado
let pendingEmptyCardDelete = null;

// Deletar card
function openDeleteCard(cardId, columnId) {
  pendingCardDelete = { cardId, columnId };
  document.getElementById('deleteCardModal').classList.add('open');
}

function closeDeleteCardModal() {
  document.getElementById('deleteCardModal').classList.remove('open');
  pendingCardDelete = null;
}

// Deletar card vazio
function openEmptyCardDeleteModal(textarea, cardId, columnId) {
  pendingEmptyCardDelete = { textarea, cardId, columnId };
  document.getElementById('emptyCardDeleteModal').classList.add('open');
}

function closeEmptyCardDeleteModal() {
  document.getElementById('emptyCardDeleteModal').classList.remove('open');
  if (pendingEmptyCardDelete?.textarea) {
    pendingEmptyCardDelete.textarea.focus();
  }
  pendingEmptyCardDelete = null;
}

// Deletar coluna vazia
function openEmptyColumnDeleteModal(columnId, inputElement, oldName) {
  pendingEmptyColumnDelete = { columnId, inputElement, oldName };
  document.getElementById('emptyColumnDeleteModal').classList.add('open');
}

function closeEmptyColumnDeleteModal() {
  document.getElementById('emptyColumnDeleteModal').classList.remove('open');
  if (pendingEmptyColumnDelete?.inputElement) {
    pendingEmptyColumnDelete.inputElement.focus();
  }
  pendingEmptyColumnDelete = null;
}

async function confirmEmptyCardDelete() {
  if (!pendingEmptyCardDelete) return;

  const { cardId, columnId } = pendingEmptyCardDelete;

  try {
    await roomService.deleteCard(cardId, columnId, currentRoomId);
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) cardElement.remove();
    closeEmptyCardDeleteModal();
    showToast('Card apagado', 'success');
  } catch (error) {
    console.error('Erro ao deletar card vazio:', error);
    showErrorModal('Erro ao deletar card.');
  }
}

async function confirmEmptyColumnDelete() {
  if (!pendingEmptyColumnDelete) return;

  const { columnId, inputElement, oldName } = pendingEmptyColumnDelete;

  try {
    await roomService.deleteColumn(columnId, currentRoomId);
    delete columns[columnId];

    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnDiv) columnDiv.remove();

    closeEmptyColumnDeleteModal();
    showToast('Coluna excluída', 'success');
  } catch (error) {
    console.error('Erro ao deletar coluna vazia:', error);
    showErrorModal('Erro ao deletar coluna.');
    closeEmptyColumnDeleteModal();
  }
}

async function confirmDeleteCard() {
  if (!pendingCardDelete) return;

  try {
    const { cardId, columnId } = pendingCardDelete;
    await roomService.deleteCard(cardId, columnId, currentRoomId);

    columns[columnId].cards = columns[columnId].cards.filter(c => c.id !== cardId);
    const cardDiv = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardDiv) cardDiv.remove();

    closeDeleteCardModal();
    showToast('Card apagado', 'success');
  } catch (error) {
    console.error('Erro ao deletar card:', error);
    alert('Erro ao deletar card.');
    closeDeleteCardModal();
  }
}

// Like
async function toggleLike(btn) {
  const cardId = btn.getAttribute('data-card-id');
  const columnId = btn.closest('[data-column-id]').getAttribute('data-column-id');
  const hasLike = btn.classList.contains('active');

  try {
    // Se está tentando ADICIONAR like, verificar limite
    if (!hasLike) {
      const maxLikes = currentRoom.max_likes_per_column || 5;
      const columnLikes = await repository.getLikesCountBySessionInColumn(columnId, sessionId);

      if (columnLikes >= maxLikes) {
        showVoteLimitModal(maxLikes);
        return;
      }
    }

    // Atualizar UI IMEDIATAMENTE (otimismo)
    if (hasLike) {
      btn.classList.remove('active');
    } else {
      btn.classList.add('active');
    }

    // Enviar para o servidor
    await roomService.toggleLike(cardId, hasLike, columnId, currentRoomId, sessionId);

    // Aguardar um pouco para garantir que o Realtime processe
    await new Promise(resolve => setTimeout(resolve, 200));

    // Atualizar contador com dados frescos do servidor
    const likes = await repository.getLikesCount(cardId);
    const likeIcon = btn.classList.contains('active') ? '❤️' : '🤍';
    btn.innerHTML = `${likeIcon} <span class="like-count">${likes.length}</span>`;
    btn.setAttribute('title', likes.length + ' likes');

    // Toast e contador de votos
    if (!hasLike) {
      voteCount++;
      localStorage.setItem(`votesCount_${currentRoomId}`, voteCount);
      updateVoteCounter();
      showToast(`Voto dado! (${voteCount})`, 'success');
    } else {
      voteCount = Math.max(0, voteCount - 1);
      localStorage.setItem(`votesCount_${currentRoomId}`, voteCount);
      updateVoteCounter();
    }

  } catch (error) {
    console.error('Erro ao dar like:', error);
    // Reverter UI em caso de erro
    if (hasLike) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
}


// Ordenação de cards
async function handleSortChange(value) {
  sortBy = value;

  // Atualizar no banco para sincronizar com outros participantes
  try {
    const result = await repository.updateRoom(currentRoomId, { sort_by: value });
  } catch (error) {
    console.error('Erro ao atualizar ordenação:', error);
  }

  reorderAllCards();
}

async function reorderAllCards() {
  for (const columnId in columns) {
    const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
    if (!container) continue;

    const cards = columns[columnId].cards;
    let sortedCards = [...cards];

    if (sortBy === 'votos') {
      // Ordenar por votos (DESC) - mais votos no topo
      const cardLikes = {};
      for (const card of cards) {
        const likes = await repository.getLikesCount(card.id);
        cardLikes[card.id] = likes.length;
      }
      sortedCards.sort((a, b) => cardLikes[b.id] - cardLikes[a.id]);
    } else {
      // Ordenar por data criação (ASC) - mais antigos no topo
      sortedCards.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    }

    // Reorganizar DOM
    sortedCards.forEach(card => {
      const cardDiv = container.querySelector(`[data-card-id="${card.id}"]`);
      if (cardDiv) {
        container.appendChild(cardDiv);
      }
    });
  }
}

// Emoji picker
function openEmojiPicker(cardId, columnId) {
  emojiPickerCardId = cardId;
  emojiPickerColumnId = columnId;

  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';

  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'btn-emoji';
    btn.textContent = emoji;
    btn.style.fontSize = '24px';
    btn.style.cursor = 'pointer';
    btn.style.border = 'none';
    btn.style.background = 'transparent';
    btn.style.padding = '8px';
    btn.onclick = (e) => {
      e.preventDefault();
      addEmojiVote(cardId, columnId, emoji);
      closeEmojiPicker();
    };
    grid.appendChild(btn);
  });

  document.getElementById('emojiPickerModal').classList.add('open');
}

function closeEmojiPicker() {
  document.getElementById('emojiPickerModal').classList.remove('open');
  emojiPickerCardId = null;
  emojiPickerColumnId = null;
}

async function addEmojiVote(cardId, columnId, emoji) {
  try {
    await roomService.addEmojiVote(cardId, emoji, columnId, currentRoomId);
    const emojiString = await roomService.getEmojiString(cardId);
    document.getElementById(`emojis-${cardId}`).textContent = emojiString;
  } catch (error) {
    console.error('Erro ao adicionar emoji:', error);
  }
}

// ========== Drag and drop CARDS ==========
function handleCardDragStart(e) {
  e.stopPropagation();
  draggedCard = {
    id: this.getAttribute('data-card-id'),
    element: this,
    sourceColumnId: this.closest('[data-column-id]').getAttribute('data-column-id')
  };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCard.id);
  this.style.opacity = '0.5';
}

function handleCardDragEnd(e) {
  e.stopPropagation();
  if (draggedCard) {
    draggedCard.element.style.opacity = '1';
  }
  if (mergeTargetCard) {
    mergeTargetCard.classList.remove('merge-target');
    mergeTargetCard = null;
  }
  draggedCard = null;
}

function handleCardDragOver(e) {
  if (!draggedCard) return;
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Detectar se está DIRETAMENTE sobre um card (corpo do card)
  const card = e.target.closest('.card');

  // Se mudou o card target
  if (mergeTargetCard !== card) {
    // Remover highlight do card anterior
    if (mergeTargetCard) {
      mergeTargetCard.classList.remove('merge-target');
    }

    // Se está diretamente sobre outro card específico
    if (card && card !== draggedCard.element) {
      card.classList.add('merge-target');
      mergeTargetCard = card;
    } else {
      mergeTargetCard = null;
    }
  }

  // Se está em reorder mode (não sobre um card), fazer a reordenação visual
  if (!mergeTargetCard) {
    const columnCards = e.target.closest('.column-cards');
    if (columnCards) {
      const allCards = Array.from(columnCards.querySelectorAll('.card'));

      // Se coluna está vazia, apenas append o card arrastado
      if (allCards.length === 0) {
        if (draggedCard.element.parentNode !== columnCards) {
          columnCards.appendChild(draggedCard.element);
        }
        return;
      }

      // Se há cards, encontrar o card mais próximo para inserir antes/depois
      let closestCard = null;
      let minDistance = Infinity;

      allCards.forEach((card) => {
        if (card === draggedCard.element) return;

        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(e.clientY - cardCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestCard = card;
        }
      });

      if (closestCard && closestCard !== draggedCard.element) {
        const closestRect = closestCard.getBoundingClientRect();
        const closestCenter = closestRect.top + closestRect.height / 2;

        // Inserir antes ou depois baseado na posição do mouse
        if (e.clientY < closestCenter) {
          columnCards.insertBefore(draggedCard.element, closestCard);
        } else {
          columnCards.insertBefore(draggedCard.element, closestCard.nextSibling);
        }
      }
    }
  }
}

async function handleCardDrop(e) {
  if (!draggedCard) return;
  e.stopPropagation();
  e.preventDefault();

  const targetColumnDiv = e.target.closest('[data-column-id]');
  if (!targetColumnDiv) return;

  const targetColumnId = targetColumnDiv.getAttribute('data-column-id');
  const sourceColumnId = draggedCard.sourceColumnId;

  // Se soltou sobre outro card específico, mostrar confirmação
  if (mergeTargetCard) {
    const targetCardId = mergeTargetCard.getAttribute('data-card-id');
    if (targetCardId !== draggedCard.id) {
      showMergeCardsModal(draggedCard.id, targetCardId, sourceColumnId, targetColumnId);
    }
    mergeTargetCard.classList.remove('merge-target');
    mergeTargetCard = null;
    draggedCard = null;
    return;
  }


  // Caso contrário, reordenar normalmente
  try {
    // Se moveu para coluna diferente
    if (sourceColumnId !== targetColumnId) {
      await repository.updateCard(draggedCard.id, { coluna_id: targetColumnId });
      // Atualizar array local
      const cardIndex = columns[sourceColumnId].cards.findIndex(c => c.id === draggedCard.id);
      if (cardIndex > -1) {
        const card = columns[sourceColumnId].cards.splice(cardIndex, 1)[0];
        columns[targetColumnId].cards.push(card);
      }
    }

    // Reordenar cards
    const container = targetColumnDiv.querySelector('.column-cards');
    const cards = Array.from(container.querySelectorAll('.card'));
    const cardIds = cards.map(c => c.getAttribute('data-card-id'));

    await repository.reorderCards(targetColumnId, cardIds);

    // Atualizar array local com nova ordem
    columns[targetColumnId].cards.sort((a, b) => {
      return cardIds.indexOf(a.id) - cardIds.indexOf(b.id);
    });

    window.analytics.trackCardAction('card_reordered', currentRoomId, targetColumnId);
    showToast('Card reordenado', 'success');
  } catch (error) {
    console.error('Erro ao reordenar card:', error);
    // Reverter visual
    location.reload();
  }
}

// Modal de confirmação de merge
function showMergeCardsModal(draggedCardId, targetCardId, sourceColumnId, targetColumnId) {
  pendingMerge = { draggedCardId, targetCardId, sourceColumnId, targetColumnId };
  document.getElementById('mergeCardsModal').classList.add('open');
}

function closeMergeCardsModal() {
  document.getElementById('mergeCardsModal').classList.remove('open');
  pendingMerge = null;
}

async function confirmMergeCards() {
  if (!pendingMerge) return;

  const { draggedCardId, targetCardId, sourceColumnId, targetColumnId } = pendingMerge;
  closeMergeCardsModal();

  await mergeCards(draggedCardId, targetCardId, sourceColumnId, targetColumnId);
}

// Mesclar dois cards
async function mergeCards(draggedCardId, targetCardId, sourceColumnId, targetColumnId) {
  try {

    // Encontrar os cards nos arrays
    const draggedCard = columns[sourceColumnId].cards.find(c => c.id === draggedCardId);
    const targetCard = columns[targetColumnId].cards.find(c => c.id === targetCardId);

    if (!draggedCard || !targetCard) {
      throw new Error('Cards não encontrados');
    }

    // 1. Concatenar textos
    const newText = targetCard.texto + '\n---\n' + draggedCard.texto;

    // 2. Atualizar texto do card alvo
    await repository.updateCard(targetCardId, { texto: newText });
    targetCard.texto = newText;

    // 3. Somar likes (transferir do draggedCard para targetCard)
    const draggedLikes = await repository.getLikesCount(draggedCardId);

    // Adicionar todos os likes do card arrastado ao card alvo
    for (const like of draggedLikes) {
      await repository.addLike(targetCardId, like.session_id);
    }

    // 4. Somar emojis (transferir do draggedCard para targetCard)
    const draggedEmojis = await repository.getEmojiCounts(draggedCardId);
    const targetEmojis = await repository.getEmojiCounts(targetCardId);

    for (const emoji in draggedEmojis) {
      const count = draggedEmojis[emoji];
      for (let i = 0; i < count; i++) {
        await repository.addEmoji(targetCardId, emoji);
      }
    }

    // 5. Soft-delete o card arrastado
    await repository.deleteCard(draggedCardId);

    // 6. Remover do array local
    const draggedIndex = columns[sourceColumnId].cards.findIndex(c => c.id === draggedCardId);
    if (draggedIndex > -1) {
      columns[sourceColumnId].cards.splice(draggedIndex, 1);
    }

    // 7. Remover visualmente da tela
    const draggedElement = document.querySelector(`[data-card-id="${draggedCardId}"]`);
    if (draggedElement) {
      draggedElement.remove();
    }

    // 8. Atualizar o card alvo na tela
    const targetElement = document.querySelector(`[data-card-id="${targetCardId}"]`);
    if (targetElement) {
      const textarea = targetElement.querySelector('.card-text');
      if (textarea) {
        textarea.value = newText;
        autoResizeTextarea(textarea);
      }

      // Atualizar emojis
      const newEmojiString = await roomService.getEmojiString(targetCardId);
      const emojiSpan = targetElement.querySelector(`#emojis-${targetCardId}`);
      if (emojiSpan) {
        emojiSpan.textContent = newEmojiString;
      }

      // Atualizar likes
      const newLikesCount = await repository.getLikesCount(targetCardId);
      const userCurrentlyLiked = await repository.getUserLiked(targetCardId, sessionId);
      const likeBtn = targetElement.querySelector('.card-like');
      if (likeBtn) {
        const likeIcon = userCurrentlyLiked ? '❤️' : '🤍';
        likeBtn.innerHTML = `${likeIcon} <span class="like-count">${newLikesCount.length}</span>`;
        likeBtn.setAttribute('title', newLikesCount.length + ' likes');
        // Atualizar classe active
        if (userCurrentlyLiked) {
          likeBtn.classList.add('active');
        } else {
          likeBtn.classList.remove('active');
        }
      }
    }

    window.analytics.trackCardAction('card_merged', currentRoomId, targetColumnId);
    showToast('Cards unificados', 'success');

  } catch (error) {
    console.error('❌ Erro ao mesclar cards:', error);
    showErrorModal('Erro ao mesclar cards: ' + error.message);
    location.reload();
  }
}

// ========== Drag and drop COLUNAS ==========
function handleColumnDragStart(e) {
  draggedColumn = {
    id: this.getAttribute('data-column-id'),
    element: this,
    originalIndex: null
  };

  // Guardar índice original
  const container = document.getElementById('columns-container');
  const allColumns = Array.from(container.querySelectorAll('.column'));
  draggedColumn.originalIndex = allColumns.indexOf(this);

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedColumn.id);
  this.style.opacity = '0.5';
}

function handleColumnDragEnd(e) {
  if (draggedColumn) {
    draggedColumn.element.style.opacity = '1';
  }
  draggedColumn = null;
}

function handleColumnDragOver(e) {
  if (!draggedColumn) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const targetColumn = e.target.closest('.column');
  if (!targetColumn || targetColumn === draggedColumn.element) return;

  const container = document.getElementById('columns-container');
  const allColumns = Array.from(container.querySelectorAll('.column'));
  const draggedIndex = allColumns.indexOf(draggedColumn.element);
  const targetIndex = allColumns.indexOf(targetColumn);

  // Só reordenar visualmente se conseguir encontrar índices válidos
  if (draggedIndex !== -1 && targetIndex !== -1) {
    if (draggedIndex < targetIndex) {
      targetColumn.parentNode.insertBefore(draggedColumn.element, targetColumn.nextSibling);
    } else {
      targetColumn.parentNode.insertBefore(draggedColumn.element, targetColumn);
    }
  }
}

async function handleColumnDrop(e) {
  if (!draggedColumn || !draggedColumn.id) return;
  e.preventDefault();

  const draggedColumnId = draggedColumn.id;

  try {
    const container = document.getElementById('columns-container');
    const columnList = Array.from(container.querySelectorAll('.column'));
    const columnIds = columnList.map(c => c.getAttribute('data-column-id'));


    // Atualizar ordem de cada coluna
    for (let i = 0; i < columnIds.length; i++) {
      const colId = columnIds[i];
      if (colId) {
        await repository.updateColumn(colId, { ordem: i });
      }
    }

    window.analytics.trackCardAction('column_reordered', currentRoomId, draggedColumnId);
    showToast('Coluna reordenada', 'success');
  } catch (error) {
    console.error('Erro ao reordenar coluna:', error);

    showErrorModal(`Erro ao reordenar coluna: ${error.message}`);
  }
}

// Copiar código da sala
// Exportar para CSV
async function exportToCSV() {
  try {
    const rows = [];

    // Cabeçalho
    rows.push(['Coluna', 'Card', 'Likes', 'Emojis']);

    // Dados de cada coluna e card
    for (const columnId in columns) {
      const column = columns[columnId];
      const cards = column.cards || [];

      if (cards.length === 0) {
        rows.push([column.nome, '', '', '']);
      } else {
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const likes = card.likes || 0;
          const emojisStr = card.emojiString || '';
          rows.push([
            i === 0 ? column.nome : '',
            card.texto || '',
            likes,
            emojisStr
          ]);
        }
      }
    }

    // Converter para CSV
    const csvContent = rows.map(row =>
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    // Gerar nome do arquivo: sala-nome_YYYYMMDD.csv
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const filename = `${currentRoom.nome.replace(/\s+/g, '-')}_${dateStr}.csv`;

    // Fazer download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    showErrorModal('Erro ao exportar arquivo CSV.');
  }
}

function copyRoomCode() {
  navigator.clipboard.writeText(currentRoomId);
  showSuccessModal('Código da sala copiado: ' + currentRoomId);
}

// ========== Votos por coluna ==========
function handleMaxLikesChange(value) {
  const newValue = parseInt(value);
  if (!newValue || newValue < 1 || newValue > 9) {
    document.getElementById('maxLikesInput').value = currentRoom.max_likes_per_column || 5;
    return;
  }

  // Se o valor é igual ao atual, não faz nada
  if (newValue === (currentRoom.max_likes_per_column || 5)) {
    return;
  }

  // Mostrar modal de confirmação
  showChangeLikesLimitModal1(newValue);
}

// ========== Limpar Resultados ==========
function handleClearChange(value) {
  if (value === 'clear-likes') {
    document.getElementById('clearLikesModal1').classList.add('open');
  } else if (value === 'clear-cards') {
    document.getElementById('clearCardsModal1').classList.add('open');
  } else if (value === 'clear-all') {
    document.getElementById('clearAllModal1').classList.add('open');
  }
}

function closeClearModals() {
  document.getElementById('clearLikesModal1').classList.remove('open');
  document.getElementById('clearLikesModal2').classList.remove('open');
  document.getElementById('clearCardsModal1').classList.remove('open');
  document.getElementById('clearCardsModal2').classList.remove('open');
  document.getElementById('clearAllModal1').classList.remove('open');
  document.getElementById('clearAllModal2').classList.remove('open');
}

function showClearLikesModal2() {
  document.getElementById('clearLikesModal1').classList.remove('open');
  document.getElementById('clearLikesModal2').classList.add('open');
}

function showClearCardsModal2() {
  document.getElementById('clearCardsModal1').classList.remove('open');
  document.getElementById('clearCardsModal2').classList.add('open');
}

function showClearAllModal2() {
  document.getElementById('clearAllModal1').classList.remove('open');
  document.getElementById('clearAllModal2').classList.add('open');
}

async function confirmClearLikes() {
  try {

    // Deletar todos os likes da sala
    const { error } = await window.supabaseClient
      .from('card_likes')
      .delete()
      .in('card_id',
        Object.values(columns).flatMap(col => col.cards.map(c => c.id))
      );

    if (error) throw error;

    // Atualizar UI
    Object.values(columns).forEach(column => {
      column.cards.forEach(card => {
        const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
        if (cardElement) {
          const likeBtn = cardElement.querySelector('.card-like');
          if (likeBtn) {
            likeBtn.innerHTML = `🤍 <span class="like-count">0</span>`;
            likeBtn.classList.remove('active');
          }
        }
      });
    });

    // Resetar contador de votos
    voteCount = 0;
    localStorage.setItem(`votesCount_${currentRoomId}`, 0);
    updateVoteCounter();

    closeClearModals();
    window.analytics.trackRoomAction('likes_cleared', currentRoomId);
    showToast('Todos os votos foram zerados', 'success');
  } catch (error) {
    console.error('❌ Erro ao zerar votos:', error);
    showErrorModal('Erro ao zerar votos.');
    closeClearModals();
  }
}

async function confirmClearCards() {
  try {

    const allCardIds = Object.values(columns).flatMap(col => col.cards.map(c => c.id));

    // Soft-delete todos os cards
    const { error } = await window.supabaseClient
      .from('cards')
      .update({ deletada: true })
      .in('id', allCardIds);

    if (error) throw error;

    // Limpar UI
    Object.keys(columns).forEach(columnId => {
      const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
      if (container) {
        container.innerHTML = '';
        columns[columnId].cards = [];
      }
    });

    closeClearModals();
    window.analytics.trackRoomAction('cards_cleared', currentRoomId);
  } catch (error) {
    console.error('❌ Erro ao excluir cards:', error);
    showErrorModal('Erro ao excluir cards.');
    closeClearModals();
  }
}

async function confirmClearAll() {
  try {

    const columnIds = Object.keys(columns);

    // Soft-delete todas as colunas
    const { error } = await window.supabaseClient
      .from('colunas')
      .update({ deletada: true })
      .in('id', columnIds);

    if (error) throw error;

    // Remover colunas visualmente
    columnIds.forEach(columnId => {
      const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
      if (columnDiv) columnDiv.remove();
    });

    columns = {};

    closeClearModals();
    window.analytics.trackRoomAction('all_cleared', currentRoomId);
  } catch (error) {
    console.error('❌ Erro ao excluir colunas:', error);
    showErrorModal('Erro ao excluir colunas.');
    closeClearModals();
  }
}

// Subscribe to realtime changes
function subscribeToChanges() {
  try {
    // Subscrever a mudanças na sala
    const roomSub = repository.subscribeToRoom(currentRoomId, handleRoomChange);
    subscriptions.push(roomSub);

    // Subscrever a mudanças nas colunas
    const columnsSub = repository.subscribeToColumns(currentRoomId, handleColumnsChange);
    subscriptions.push(columnsSub);

    // Subscrever a mudanças de likes GLOBAIS (UMA ÚNICA VEZ por sala)
    const globalLikesSub = window.supabaseClient
      .channel(`likes:global:${currentRoomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_likes' },
        handleLikesChange
      )
      .subscribe();
    subscriptions.push(globalLikesSub);

    // Subscrever a mudanças em cards de cada coluna
    Object.keys(columns).forEach(columnId => {
      const cardsSub = repository.subscribeToCards(columnId, handleCardsChange);
      subscriptions.push(cardsSub);

      // Subscrever a mudanças de emojis de cada card da coluna
      columns[columnId].cards.forEach(card => {
        const emojisSub = repository.subscribeToEmojis(card.id, handleEmojisChange);
        subscriptions.push(emojisSub);
      });
    });
  } catch (error) {
    console.error('Erro ao subscrever:', error);
  }
}

function handleRoomChange(payload) {
  if (payload.eventType === 'UPDATE') {
    const newRoom = payload.new;

    // Atualizar nome da sala
    if (newRoom.nome !== currentRoom.nome) {
      document.getElementById('roomNameSpan').textContent = newRoom.nome;
    }

    // Atualizar ordenação se mudou
    if (newRoom.sort_by && newRoom.sort_by !== sortBy) {
      sortBy = newRoom.sort_by;
      document.getElementById('sortSelect').value = sortBy;
      reorderAllCards();
    }

    currentRoom = newRoom;
  }
}

async function handleLikesChange(payload) {
  // Aguardar para garantir que o banco atualizou
  await new Promise(resolve => setTimeout(resolve, 300));

  const cardId = payload.new?.card_id || payload.old?.card_id;

  // Se conseguiu extrair cardId, atualiza apenas esse card
  if (cardId) {
    const btn = document.querySelector(`[data-card-id="${cardId}"].card-like`);
    if (btn) {
      const likes = await repository.getLikesCount(cardId);
      const userLiked = likes.some(like => like.session_id === sessionId);
      const count = likes?.length || 0;

      btn.setAttribute('title', count + ' likes');
      const likeIcon = userLiked ? '❤️' : '🤍';
      btn.innerHTML = `${likeIcon} <span class="like-count">${count}</span>`;

      if (userLiked) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  } else {
    // Se não conseguiu extrair cardId (comum em DELETE), atualiza TODOS os cards
    const allBtns = document.querySelectorAll('.card-like');
    for (const btn of allBtns) {
      const cid = btn.getAttribute('data-card-id');
      const likes = await repository.getLikesCount(cid);
      const userLiked = likes.some(like => like.session_id === sessionId);
      const count = likes?.length || 0;

      btn.setAttribute('title', count + ' likes');
      const likeIcon = userLiked ? '❤️' : '🤍';
      btn.innerHTML = `${likeIcon} <span class="like-count">${count}</span>`;

      if (userLiked) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
}

function handleEmojisChange(payload) {
  // Qualquer mudança em emojis, atualizar display
  const cardId = payload.new?.card_id || payload.old?.card_id;
  if (!cardId) return;

  roomService.getEmojiString(cardId).then(emojiString => {
    const span = document.getElementById(`emojis-${cardId}`);
    if (span) span.textContent = emojiString;
  });
}

function handleColumnsChange(payload) {
  const { eventType, new: newData, old: oldData } = payload;


  if (eventType === 'UPDATE' && newData?.deletada === true && oldData?.deletada !== true) {
    // Remover coluna (soft delete) - VERIFICAR PRIMEIRO
    const columnId = newData?.id || oldData?.id;

    // Remover visualmente
    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnDiv) {
      columnDiv.style.opacity = '0.5';
      setTimeout(() => {
        if (columnDiv.parentNode) {
          columnDiv.remove();
        }
      }, 300);
    } else {
    }

    // Remover do estado local
    if (columns[columnId]) {
      delete columns[columnId];
    }
  } else if (eventType === 'UPDATE') {
    // Atualizar coluna existente
    const columnId = newData.id;
    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);

    if (columnDiv) {
      // Atualizar nome
      const nameSpan = columnDiv.querySelector('.column-name');
      if (nameSpan && newData.nome !== oldData.nome) {
        nameSpan.textContent = escapeHtml(newData.nome);
      }

      // Atualizar cor
      if (newData.cor !== oldData.cor) {
        const colorPicker = columnDiv.querySelector('.btn-color');
        if (colorPicker) colorPicker.value = newData.cor;

        // Atualizar cor dos cards na coluna
        columnDiv.querySelectorAll('.card').forEach(cardEl => {
          cardEl.style.borderColor = newData.cor;
          const rgbColor = hexToRgb(newData.cor);
          if (rgbColor) {
            cardEl.style.backgroundColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
          }
          cardEl.setAttribute('data-col-color', newData.cor);

          const likeBtn = cardEl.querySelector('.card-like');
          if (likeBtn) {
            likeBtn.style.borderColor = newData.cor;
            if (likeBtn.classList.contains('active')) {
              likeBtn.style.backgroundColor = newData.cor;
            }
          }
        });
      }

      // Atualizar ordem se mudou
      if (newData.ordem !== oldData.ordem) {
        reorderColumnsInDOM();
      }

      // Atualizar no estado local
      if (columns[columnId]) {
        columns[columnId] = { ...columns[columnId], ...newData };
      }
    }
  } else if (eventType === 'DELETE') {
    // Remover coluna (hard delete)
    const columnId = newData?.id || oldData?.id;
    const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
    if (columnDiv) columnDiv.remove();
    if (columns[columnId]) delete columns[columnId];
  } else if (eventType === 'INSERT') {
    // Adicionar nova coluna (apenas se ainda não foi renderizada)
    if (!columns[newData.id]) {
      columns[newData.id] = { ...newData, cards: [] };
      // Se nome é "A preencher", deixar em modo edit (coluna recém-criada)
      const isNewColumn = newData.nome === 'A preencher';
      renderColumn(newData, isNewColumn).then(() => {
        loadColumnCards(newData.id);
        // Subscrever a mudanças de cards nessa coluna
        const cardsSub = repository.subscribeToCards(newData.id, handleCardsChange);
        subscriptions.push(cardsSub);
      });
      if (isNewColumn) showToast('Coluna criada', 'success');
    }
  }
}

function handleCardsChange(payload) {
  const { eventType, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    // Novo card adicionado
    const columnId = newData.coluna_id;
    if (columns[columnId]) {
      // Inserir na posição correta baseado na ordem
      const insertIndex = columns[columnId].cards.findIndex(c => c.ordem > newData.ordem);
      if (insertIndex === -1) {
        columns[columnId].cards.push(newData);
      } else {
        columns[columnId].cards.splice(insertIndex, 0, newData);
      }
      renderCard(columnId, newData);
    }
  } else if (eventType === 'UPDATE') {
    // Card atualizado
    const cardId = newData.id;

    // Verificar se foi deletado (soft delete)
    if (newData.deletada && !oldData.deletada) {
      // Remover card do DOM
      const cardDiv = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardDiv) {
        cardDiv.style.opacity = '0.5';
        setTimeout(() => cardDiv.remove(), 300);
      }

      // Remover do array
      const columnId = oldData.coluna_id;
      if (columns[columnId]) {
        columns[columnId].cards = columns[columnId].cards.filter(c => c.id !== cardId);
      }
      return; // Parar aqui, não processar outras atualizações
    }

    // Verificar se moveu de coluna
    if (newData.coluna_id !== oldData.coluna_id) {
      // Remover da coluna antiga
      if (columns[oldData.coluna_id]) {
        const cardIndex = columns[oldData.coluna_id].cards.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
          columns[oldData.coluna_id].cards.splice(cardIndex, 1);
        }
      }

      // Remover card do DOM de TODAS as colunas
      document.querySelectorAll(`[data-card-id="${cardId}"]`).forEach(el => el.remove());

      // Adicionar na nova coluna
      if (columns[newData.coluna_id]) {
        columns[newData.coluna_id].cards.push(newData);
        renderCard(newData.coluna_id, newData);
      }
    } else {
      // Atualizar card na mesma coluna
      const cardDiv = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardDiv) {
        if (newData.texto !== oldData.texto) {
          const textarea = cardDiv.querySelector('.card-text');
          if (textarea) textarea.value = newData.texto;
        }
      }

      if (newData.ordem !== oldData.ordem) {
        // Atualizar card no array com a nova ordem
        const columnId = newData.coluna_id;

        if (columns[columnId]) {
          const cardIndex = columns[columnId].cards.findIndex(c => c.id === cardId);
          if (cardIndex > -1) {
            columns[columnId].cards[cardIndex].ordem = newData.ordem;
          }

          // Usar debounce para reordenar - evita múltiplos reprocessamentos
          scheduleColumnReorder(columnId);
        }
      }
    }
  } else if (eventType === 'DELETE') {
    // Remover card (hard delete - raramente acontece)
    const cardId = newData?.id || oldData?.id;
    const columnId = newData?.coluna_id || oldData?.coluna_id;
    const cardDiv = document.querySelector(`[data-card-id="${cardId}"]`);

    if (cardDiv) {
      cardDiv.style.opacity = '0.5';
      setTimeout(() => cardDiv.remove(), 300);
    }

    if (columns[columnId]) {
      columns[columnId].cards = columns[columnId].cards.filter(c => c.id !== cardId);
    }
  }
}

// Debounce para reordenação de cards
function scheduleColumnReorder(columnId) {
  // Limpar timer anterior se existir
  if (reorderTimeouts[columnId]) {
    clearTimeout(reorderTimeouts[columnId]);
  }

  // Agendar novo reprocessamento após 50ms
  reorderTimeouts[columnId] = setTimeout(() => {
    performColumnReorder(columnId);
    delete reorderTimeouts[columnId];
  }, 50);
}

function performColumnReorder(columnId) {
  if (!columns[columnId]) return;

  // Reordenar o array
  columns[columnId].cards.sort((a, b) => a.ordem - b.ordem);

  // Reordenar no DOM - remover e re-renderizar todos os cards
  const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
  if (container) {
    // Remover TODOS os cards do container
    container.querySelectorAll('.card').forEach(el => el.remove());

    // Re-renderizar cards na ordem correta
    for (const card of columns[columnId].cards) {
      renderCard(columnId, card);
    }
  }
}

function reorderColumnsInDOM() {
  const container = document.getElementById('columns-container');
  const columnEls = Array.from(container.querySelectorAll('.column'));

  const sortedColumns = columnEls.sort((a, b) => {
    const colIdA = a.getAttribute('data-column-id');
    const colIdB = b.getAttribute('data-column-id');
    return (columns[colIdA]?.ordem || 0) - (columns[colIdB]?.ordem || 0);
  });

  sortedColumns.forEach(col => {
    const addColumnBtn = container.querySelector('.add-column-btn');
    if (addColumnBtn) {
      container.insertBefore(col, addColumnBtn);
    } else {
      container.appendChild(col);
    }
  });
}

// Utils
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Handle 8-character hex (with alpha)
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

// Iniciar quando Supabase estiver pronto
window.addEventListener('supabase-ready', init);
