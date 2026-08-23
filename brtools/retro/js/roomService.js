// Camada de serviço (regras de negócio)
const roomService = {
  // Carregamento inicial
  async loadRoom(roomId) {
    const room = await repository.getRoom(roomId);
    const columns = await repository.getColumns(roomId);
    return { room, columns };
  },

  // Sala
  async updateRoomName(roomId, newName) {
    if (!newName || newName.length > 50) {
      throw new Error('Nome deve ter entre 1 e 50 caracteres');
    }
    const updated = await repository.updateRoomName(roomId, newName);
    await repository.logAction(roomId, 'sala_nome_editado', { nome: newName });
    window.analytics.trackRoomAction('room_name_updated', roomId);
    return updated;
  },

  // Colunas
  async createColumn(roomId, name = 'A preencher') {
    const columns = await repository.getColumns(roomId);
    const newOrder = columns.length;
    const created = await repository.createColumn(roomId, name, newOrder);
    await repository.logAction(roomId, 'coluna_criada', { nome: name });
    window.analytics.trackCardAction('column_created', roomId, created.id);
    return created;
  },

  async updateColumnName(columnId, newName, roomId) {
    if (!newName || newName.length > 30) {
      throw new Error('Nome deve ter entre 1 e 30 caracteres');
    }
    const updated = await repository.updateColumn(columnId, { nome: newName });
    await repository.logAction(roomId, 'coluna_nome_editado', { coluna_id: columnId, nome: newName });
    return updated;
  },

  async updateColumnColor(columnId, color, roomId) {
    const updated = await repository.updateColumn(columnId, { cor: color });
    await repository.logAction(roomId, 'coluna_cor_editada', { coluna_id: columnId, cor: color });
    window.analytics.trackCardAction('column_color_updated', roomId, columnId);
    return updated;
  },

  async deleteColumn(columnId, roomId) {
    const deleted = await repository.deleteColumn(columnId);
    await repository.logAction(roomId, 'coluna_deletada', { coluna_id: columnId });
    window.analytics.trackCardAction('column_deleted', roomId, columnId);
    return deleted;
  },

  // Cards
  async createCard(columnId, text, roomId) {
    if (text.length > 500) {
      throw new Error('Máximo 500 caracteres');
    }
    const created = await repository.createCard(columnId, text);
    await repository.logAction(roomId, 'card_criado', { coluna_id: columnId, card_id: created.id });
    window.analytics.trackCardAction('card_created', roomId, columnId);
    return created;
  },

  async updateCardText(cardId, text, columnId, roomId) {
    if (text.length > 500) {
      throw new Error('Máximo 500 caracteres');
    }
    const updated = await repository.updateCard(cardId, { texto: text });
    await repository.logAction(roomId, 'card_texto_editado', { card_id: cardId, coluna_id: columnId });
    return updated;
  },

  async deleteCard(cardId, columnId, roomId) {
    await repository.deleteCard(cardId);
    await repository.logAction(roomId, 'card_deletado', { card_id: cardId, coluna_id: columnId });
    window.analytics.trackCardAction('card_deleted', roomId, columnId);
  },

  // Likes
  async toggleLike(cardId, hasLike, columnId, roomId, sessionId) {
    if (hasLike) {
      await repository.removeLike(cardId, sessionId);
      await repository.logAction(roomId, 'like_removido', { card_id: cardId, coluna_id: columnId });
    } else {
      await repository.addLike(cardId, sessionId);
      await repository.logAction(roomId, 'like_adicionado', { card_id: cardId, coluna_id: columnId });
    }
    window.analytics.trackCardAction('like_toggled', roomId, columnId);
  },

  // Emojis
  async addEmojiVote(cardId, emoji, columnId, roomId) {
    await repository.addEmoji(cardId, emoji);
    await repository.logAction(roomId, 'emoji_adicionado', { card_id: cardId, emoji: emoji });
    window.analytics.trackCardAction('emoji_added', roomId, columnId);
  },

  async removeEmojiVote(cardId, emoji, columnId, roomId) {
    await repository.removeEmoji(cardId, emoji);
    await repository.logAction(roomId, 'emoji_removido', { card_id: cardId, emoji: emoji });
    window.analytics.trackCardAction('emoji_removed', roomId, columnId);
  },

  async getEmojiString(cardId) {
    const counts = await repository.getEmojiCounts(cardId);
    const entries = Object.entries(counts).map(([emoji, count]) =>
      count > 1 ? `${emoji} (${count})` : emoji
    );
    return entries.join(' ');
  }
};
