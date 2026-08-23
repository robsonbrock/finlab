// Controlador principal - gerencia interações da UI
let currentRoomId = null;
let currentRoom = null;
let columns = {};
let subscriptions = [];
let pendingColumnDelete = null;
let pendingCardDelete = null;
let emojiPickerCardId = null;
let emojiPickerColumnId = null;

const EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '✨', '🎉', '😍', '👏', '💡', '🚀', '🎯', '📈', '⭐', '💯', '🙌', '😎', '🤔', '😢', '👎', '🤮', '💪', '🏆', '🎭', '🌟'];

// Inicialização
async function init() {
  const params = new URLSearchParams(window.location.search);
  currentRoomId = params.get('id')?.toUpperCase();

  if (!currentRoomId || currentRoomId.length !== 4) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('roomCode').textContent = currentRoomId;

  try {
    // Esperar Supabase estar pronto
    if (!window.supabaseClient) {
      await new Promise(resolve => window.addEventListener('supabase-ready', resolve, { once: true }));
    }

    // Carregar dados iniciais
    const { room, columns: loadedColumns } = await roomService.loadRoom(currentRoomId);
    currentRoom = room;
    document.getElementById('roomNameSpan').textContent = room.nome;

    // Renderizar colunas
    for (const column of loadedColumns) {
      columns[column.id] = { ...column, cards: [] };
      await renderColumn(column);
      await loadColumnCards(column.id);
    }

    // Assinar atualizações em tempo real
    subscribeToChanges();

    // Event listeners
    document.querySelector('.header-back').addEventListener('click', () => {
      window.location.href = 'index.html';
    });

  } catch (error) {
    console.error('Erro ao inicializar:', error);
    alert('Erro ao carregar a sala. Voltando...');
    window.location.href = 'index.html';
  }
}

// Carregar cards de uma coluna
async function loadColumnCards(columnId) {
  try {
    const cards = await repository.getCards(columnId);
    columns[columnId].cards = cards;

    // Renderizar cada card
    const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
    if (container) {
      for (const card of cards) {
        await renderCard(columnId, card);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar cards:', error);
  }
}

// Renderizar coluna
async function renderColumn(column) {
  const container = document.getElementById('columns-container');

  const columnDiv = document.createElement('div');
  columnDiv.className = 'column';
  columnDiv.setAttribute('data-column-id', column.id);
  columnDiv.innerHTML = `
    <div class="column-header">
      <div class="column-name" onclick="editColumnName('${column.id}')">${escapeHtml(column.nome)}</div>
      <div class="column-actions">
        <input type="color" class="btn-color" value="${column.cor}" onchange="changeColumnColor('${column.id}', this.value)">
        <button class="btn-delete" onclick="openDeleteColumn('${column.id}')">🗑️</button>
      </div>
    </div>
    <div class="column-stats">👍 <span class="like-count">0</span></div>
    <div class="column-cards"></div>
    <div class="column-add-card">
      <button class="btn-add-card" onclick="addCard('${column.id}')">+ Adicionar Card</button>
    </div>
  `;

  container.insertBefore(columnDiv, container.lastElementChild);
  updateColumnLikeCount(column.id);
}

// Renderizar card
async function renderCard(columnId, card) {
  const column = columns[columnId];
  const container = document.querySelector(`[data-column-id="${columnId}"] .column-cards`);
  if (!container) return;

  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  cardDiv.setAttribute('data-card-id', card.id);
  cardDiv.setAttribute('draggable', 'true');
  cardDiv.style.borderColor = column.cor;

  const likeCount = await repository.getLikesCount(card.id);
  const emojiString = await roomService.getEmojiString(card.id);

  cardDiv.innerHTML = `
    <textarea class="card-text" data-card-id="${card.id}" maxlength="200" onblur="saveCardText(this)">${escapeHtml(card.texto)}</textarea>
    <div class="card-bottom">
      <div class="card-emojis">
        <button class="btn-emoji" onclick="openEmojiPicker('${card.id}', '${columnId}')">😊</button>
        <span id="emojis-${card.id}">${emojiString}</span>
      </div>
      <button class="card-like" data-card-id="${card.id}" onclick="toggleLike(this)">👍</button>
      <button class="card-delete" onclick="openDeleteCard('${card.id}', '${columnId}')">🗑️</button>
    </div>
  `;

  // Aplicar estilos iniciais
  if (likeCount > 0) {
    cardDiv.querySelector('.card-like').classList.add('active');
  }
  cardDiv.querySelector('.card-like').style.borderColor = column.cor;
  if (likeCount > 0) {
    cardDiv.querySelector('.card-like').style.backgroundColor = column.cor;
  }

  // Drag and drop
  cardDiv.addEventListener('dragstart', handleDragStart);
  cardDiv.addEventListener('dragend', handleDragEnd);
  cardDiv.addEventListener('dragover', handleDragOver);
  cardDiv.addEventListener('drop', handleDrop);

  container.appendChild(cardDiv);
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
  if (!newName) {
    alert('Nome não pode ser vazio');
    return;
  }

  try {
    const updated = await roomService.updateRoomName(currentRoomId, newName);
    currentRoom = updated;
    document.getElementById('roomNameSpan').textContent = updated.nome;
    closeEditRoom();
  } catch (error) {
    console.error('Erro ao salvar nome:', error);
    alert('Erro ao salvar. Tente novamente.');
  }
}

// Editar nome da coluna
function editColumnName(columnId) {
  const column = columns[columnId];
  const columnDiv = document.querySelector(`[data-column-id="${columnId}"]`);
  const nameDiv = columnDiv.querySelector('.column-name');

  nameDiv.classList.add('editing');
  nameDiv.innerHTML = `<input type="text" class="column-name-input" value="${escapeHtml(column.nome)}" maxlength="30" onblur="saveColumnName('${columnId}', this)" onkeypress="if(event.key==='Enter') saveColumnName('${columnId}', this)">`;

  const input = nameDiv.querySelector('input');
  input.focus();
  input.select();
}

async function saveColumnName(columnId, input) {
  const newName = input.value.trim();
  const nameDiv = input.parentElement;

  if (!newName) {
    const column = columns[columnId];
    nameDiv.textContent = escapeHtml(column.nome);
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
    alert('Erro: ' + error.message);
    const column = columns[columnId];
    nameDiv.textContent = escapeHtml(column.nome);
    nameDiv.classList.remove('editing');
  }
}

// Mudar cor da coluna
async function changeColumnColor(columnId, color) {
  try {
    const updated = await roomService.updateColumnColor(columnId, color, currentRoomId);
    columns[columnId].cor = color;

    // Atualizar bordas de todos os cards
    const cards = document.querySelectorAll(`[data-column-id="${columnId}"] .card`);
    cards.forEach(card => {
      card.style.borderColor = color;
      const likeBtn = card.querySelector('.card-like');
      likeBtn.style.borderColor = color;
      if (likeBtn.classList.contains('active')) {
        likeBtn.style.backgroundColor = color;
      }
    });
  } catch (error) {
    console.error('Erro ao mudar cor:', error);
    alert('Erro ao mudar cor.');
  }
}

// Adicionar coluna
async function addColumn() {
  try {
    const column = await roomService.createColumn(currentRoomId);
    columns[column.id] = { ...column, cards: [] };
    await renderColumn(column);
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
    alert('Erro ao adicionar coluna.');
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
  } catch (error) {
    console.error('Erro ao deletar coluna:', error);
    alert('Erro ao deletar coluna.');
    closeDeleteColumnModal();
  }
}

// Adicionar card
async function addCard(columnId) {
  const text = prompt('Texto do card (máx 200 caracteres):');
  if (!text) return;

  try {
    const card = await roomService.createCard(columnId, text, currentRoomId);
    if (!columns[columnId].cards) columns[columnId].cards = [];
    columns[columnId].cards.push(card);
    await renderCard(columnId, card);
  } catch (error) {
    console.error('Erro ao adicionar card:', error);
    alert('Erro: ' + error.message);
  }
}

// Salvar texto do card
async function saveCardText(textarea) {
  const cardId = textarea.getAttribute('data-card-id');
  const columnId = textarea.closest('[data-column-id]').getAttribute('data-column-id');
  const newText = textarea.value.trim();

  if (!newText) {
    const card = columns[columnId].cards.find(c => c.id === cardId);
    textarea.value = card.texto;
    return;
  }

  try {
    await roomService.updateCardText(cardId, newText, columnId, currentRoomId);
    const card = columns[columnId].cards.find(c => c.id === cardId);
    if (card) card.texto = newText;
  } catch (error) {
    console.error('Erro ao salvar card:', error);
    alert('Erro: ' + error.message);
  }
}

// Deletar card
function openDeleteCard(cardId, columnId) {
  pendingCardDelete = { cardId, columnId };
  document.getElementById('deleteCardModal').classList.add('open');
}

function closeDeleteCardModal() {
  document.getElementById('deleteCardModal').classList.remove('open');
  pendingCardDelete = null;
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
    await roomService.toggleLike(cardId, hasLike, columnId, currentRoomId);

    if (hasLike) {
      btn.classList.remove('active');
      btn.style.backgroundColor = '';
    } else {
      btn.classList.add('active');
      btn.style.backgroundColor = columns[columnId].cor;
    }

    await updateColumnLikeCount(columnId);
  } catch (error) {
    console.error('Erro ao dar like:', error);
  }
}

// Atualizar contador de likes da coluna
async function updateColumnLikeCount(columnId) {
  try {
    const count = await repository.getColumnLikesCount(columnId);
    const span = document.querySelector(`[data-column-id="${columnId}"] .like-count`);
    if (span) span.textContent = count;
  } catch (error) {
    console.error('Erro ao atualizar contador:', error);
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

// Drag and drop
function handleDragStart(e) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  this.style.opacity = '0.5';
}

function handleDragEnd(e) {
  this.style.opacity = '1';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
  e.preventDefault();
  // Simplificado: reordenação básica
}

// Copiar código da sala
function copyRoomCode() {
  navigator.clipboard.writeText(currentRoomId);
  alert('Código copiado: ' + currentRoomId);
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

    // Subscrever a mudanças em cards e likes de cada coluna
    Object.keys(columns).forEach(columnId => {
      const cardsSub = repository.subscribeToCards(columnId, handleCardsChange);
      subscriptions.push(cardsSub);
    });
  } catch (error) {
    console.error('Erro ao subscrever:', error);
  }
}

function handleRoomChange(payload) {
  if (payload.eventType === 'UPDATE') {
    currentRoom = payload.new;
    document.getElementById('roomNameSpan').textContent = payload.new.nome;
  }
}

function handleColumnsChange(payload) {
  console.log('Column change:', payload);
  // Lidar com mudanças de coluna (nome, cor, deleção)
}

function handleCardsChange(payload) {
  console.log('Cards change:', payload);
  // Lidar com mudanças de cards
}

// Utils
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Iniciar quando Supabase estiver pronto
window.addEventListener('supabase-ready', init);
