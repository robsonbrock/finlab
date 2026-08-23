// Camada de acesso aos dados (Supabase)
const repository = {
  // Salas
  async getRoom(roomId) {
    const { data, error } = await window.supabaseClient
      .from('salas')
      .select('*')
      .eq('id', roomId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateRoomName(roomId, newName) {
    const { data, error } = await window.supabaseClient
      .from('salas')
      .update({ nome: newName, atualizada_em: new Date().toISOString() })
      .eq('id', roomId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Colunas
  async getColumns(roomId) {
    const { data, error } = await window.supabaseClient
      .from('colunas')
      .select('*')
      .eq('sala_id', roomId)
      .eq('deletada', false)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createColumn(roomId, name, order = 0) {
    const { data, error } = await window.supabaseClient
      .from('colunas')
      .insert([{ sala_id: roomId, nome: name, ordem: order, cor: '#ffffff33' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateColumn(columnId, updates) {
    const { data, error } = await window.supabaseClient
      .from('colunas')
      .update(updates)
      .eq('id', columnId)
      .select();
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  async deleteColumn(columnId) {
    const { data, error } = await window.supabaseClient
      .from('colunas')
      .update({ deletada: true })
      .eq('id', columnId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Cards
  async getCards(columnId) {
    const { data, error } = await window.supabaseClient
      .from('cards')
      .select('*')
      .eq('coluna_id', columnId)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCard(columnId, text) {
    const { data: column } = await window.supabaseClient
      .from('colunas')
      .select('cards(ordem)')
      .eq('id', columnId)
      .single();

    const maxOrder = column?.cards?.length || 0;

    const { data, error } = await window.supabaseClient
      .from('cards')
      .insert([{ coluna_id: columnId, texto: text, ordem: maxOrder }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCard(cardId, updates) {
    // Se recebe apenas uma string, é o texto
    if (typeof updates === 'string') {
      updates = { texto: updates };
    }
    const { data, error } = await window.supabaseClient
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCard(cardId) {
    const { error } = await window.supabaseClient
      .from('cards')
      .delete()
      .eq('id', cardId);
    if (error) throw error;
  },

  async reorderCards(columnId, cardIds) {
    // Atualizar ordem de cada card
    const updates = cardIds.map((id, index) => ({
      id: id,
      ordem: index
    }));

    console.log('🔄 Reordering cards:', updates);

    for (const update of updates) {
      const { error } = await window.supabaseClient
        .from('cards')
        .update({ ordem: update.ordem })
        .eq('id', update.id);
      if (error) {
        console.error('❌ Error reordering card:', update.id, error);
        throw error;
      }
      console.log('✅ Updated card order:', update.id, 'ordem:', update.ordem);
    }
  },

  // Likes
  async addLike(cardId, sessionId) {
    const { data, error } = await window.supabaseClient
      .from('card_likes')
      .insert([{ card_id: cardId, session_id: sessionId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeLike(cardId, sessionId) {
    const { error } = await window.supabaseClient
      .from('card_likes')
      .delete()
      .eq('card_id', cardId)
      .eq('session_id', sessionId);
    if (error) throw error;
  },

  async getLikesCount(cardId) {
    const { data, error } = await window.supabaseClient
      .from('card_likes')
      .select('*')
      .eq('card_id', cardId);
    if (error) throw error;
    return data || [];
  },

  async getUserLiked(cardId, sessionId) {
    const likes = await this.getLikesCount(cardId);
    return likes.some(like => like.session_id === sessionId);
  },

  async getColumnLikesCount(columnId) {
    // Contar likes em todos os cards da coluna
    const { data: cards } = await window.supabaseClient
      .from('cards')
      .select('id')
      .eq('coluna_id', columnId);

    if (!cards || cards.length === 0) return 0;

    const cardIds = cards.map(c => c.id);
    const { count, error } = await window.supabaseClient
      .from('card_likes')
      .select('*', { count: 'exact', head: true })
      .in('card_id', cardIds);

    if (error) throw error;
    return count || 0;
  },

  // Emojis
  async addEmoji(cardId, emoji) {
    const { data, error } = await window.supabaseClient
      .from('card_emojis')
      .insert([{ card_id: cardId, emoji: emoji }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeEmoji(cardId, emoji) {
    const { error } = await window.supabaseClient
      .from('card_emojis')
      .delete()
      .eq('card_id', cardId)
      .eq('emoji', emoji);
    if (error) throw error;
  },

  async getEmojiCounts(cardId) {
    const { data, error } = await window.supabaseClient
      .from('card_emojis')
      .select('emoji')
      .eq('card_id', cardId);
    if (error) throw error;

    const counts = {};
    data?.forEach(row => {
      counts[row.emoji] = (counts[row.emoji] || 0) + 1;
    });
    return counts;
  },

  // Logs
  async logAction(roomId, type, detail) {
    const { error } = await window.supabaseClient
      .from('logs')
      .insert([{
        tipo: type,
        sala_id: roomId,
        detalhe: detail,
        criado_em: new Date().toISOString()
      }]);
    if (error) console.error('Log error:', error);
  },

  // Realtime subscriptions
  subscribeToRoom(roomId, callback) {
    const subscription = window.supabaseClient
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'salas' },
        (payload) => {
          console.log('📡 Raw room payload:', payload);
          if (payload.new?.id === roomId || payload.old?.id === roomId) {
            console.log('✅ Room callback called with:', payload);
            callback({ table: 'salas', ...payload });
          }
        }
      )
      .subscribe((status) => {
        console.log('Room subscription status:', status);
      });
    return subscription;
  },

  subscribeToColumns(roomId, callback) {
    const subscription = window.supabaseClient
      .channel(`columns:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colunas' },
        (payload) => {
          console.log('📡 Raw column payload:', payload);
          if (payload.new?.sala_id === roomId || payload.old?.sala_id === roomId) {
            console.log('✅ Column callback called with:', payload);
            callback({ table: 'colunas', ...payload });
          }
        }
      )
      .subscribe((status) => {
        console.log('Columns subscription status:', status);
      });
    return subscription;
  },

  subscribeToCards(columnId, callback) {
    const subscription = window.supabaseClient
      .channel(`cards:${columnId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          console.log('📡 Raw card payload:', payload);
          if (payload.new?.coluna_id === columnId || payload.old?.coluna_id === columnId) {
            console.log('✅ Card callback called with:', payload);
            callback({ table: 'cards', ...payload });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Cards subscription status for ${columnId}:`, status);
      });
    return subscription;
  },

  subscribeToLikes(cardId, callback) {
    const subscription = window.supabaseClient
      .channel(`likes:${cardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_likes' },
        (payload) => {
          if (payload.new?.card_id === cardId || payload.old?.card_id === cardId) {
            callback({ table: 'card_likes', ...payload });
          }
        }
      )
      .subscribe();
    return subscription;
  },

  subscribeToEmojis(cardId, callback) {
    const subscription = window.supabaseClient
      .channel(`emojis:${cardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_emojis' },
        (payload) => {
          if (payload.new?.card_id === cardId || payload.old?.card_id === cardId) {
            callback({ table: 'card_emojis', ...payload });
          }
        }
      )
      .subscribe();
    return subscription;
  },

  unsubscribe(subscription) {
    if (subscription) {
      window.supabaseClient.removeChannel(subscription);
    }
  }
};
