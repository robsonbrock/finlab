// Controle da página inicial do Retro

const MODELS = {
  model1: ['Começar', 'Continuar', 'Parar'],
  model2: ['Bom', 'A melhorar'],
  model3: ['Bom', 'Nem tão bom assim', 'Novas ideias'],
  model4: ['Sinal', 'Ruído'],
  model5: ['Âncoras', 'Motor'],
};

let currentRoomName = '';
let selectedModel = '';

// Voltar para a página inicial
document.getElementById('header-back').addEventListener('click', () => {
  window.location.href = '../index.html';
});

// Abrir modal de criação - nome
function openCreateModal() {
  document.getElementById('createModal1').classList.add('open');
  document.getElementById('roomName').focus();
}

// Fechar modal de criação
function closeCreateModal() {
  document.getElementById('createModal1').classList.remove('open');
  document.getElementById('createModal2').classList.remove('open');
  document.getElementById('roomName').value = '';
  document.getElementById('nameError').textContent = '';
  document.getElementById('columnCount').value = '';
  document.getElementById('columnError').textContent = '';
  document.getElementById('modelSelect').value = '';
  document.getElementById('customColumnsDiv').style.display = 'none';
  currentRoomName = '';
  selectedModel = '';
}

// Continuar para modal de modelo
function continueCreateRoom() {
  const name = document.getElementById('roomName').value.trim();
  const nameError = document.getElementById('nameError');

  if (!name) {
    nameError.textContent = 'O nome é obrigatório';
    return;
  }

  if (name.length > 50) {
    nameError.textContent = 'Máximo 50 caracteres';
    return;
  }

  currentRoomName = name;
  nameError.textContent = '';
  document.getElementById('createModal1').classList.remove('open');
  document.getElementById('createModal2').classList.add('open');
  document.getElementById('modelSelect').focus();
}

// Voltar para modal de nome
function backToNameModal() {
  document.getElementById('createModal2').classList.remove('open');
  document.getElementById('createModal1').classList.add('open');
}

// Mudar modelo selecionado
function onModelSelect() {
  const modelSelect = document.getElementById('modelSelect');
  selectedModel = modelSelect.value;
  const customDiv = document.getElementById('customColumnsDiv');

  if (selectedModel === 'custom') {
    customDiv.style.display = 'block';
    document.getElementById('columnCount').focus();
  } else {
    customDiv.style.display = 'none';
  }
}

// Gerar código de sala único (4 caracteres alfanuméricos)
async function generateUniqueRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';

  // Tentar gerar um ID único (máximo 10 tentativas)
  for (let attempt = 0; attempt < 10; attempt++) {
    id = '';
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Verificar se o ID já existe
    const { data: existing } = await window.supabaseClient
      .from('salas')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return id;
    }
  }

  throw new Error('Não foi possível gerar um ID único. Tente novamente.');
}

// Criar sala
async function createRoom() {
  if (!selectedModel) {
    document.getElementById('columnError').textContent = 'Selecione um modelo';
    return;
  }

  let columnNames = [];
  if (selectedModel === 'custom') {
    const count = parseInt(document.getElementById('columnCount').value);
    if (!count || count < 1 || count > 10) {
      document.getElementById('columnError').textContent = 'Informe entre 1 e 10 colunas';
      return;
    }
    columnNames = Array(count).fill('A preencher');
  } else {
    columnNames = MODELS[selectedModel];
  }

  // Mostrar loading
  const createBtn = document.getElementById('createBtn');
  const originalText = createBtn.textContent;
  createBtn.disabled = true;
  createBtn.textContent = 'Criando...';

  try {
    // Gerar ID único
    const roomId = await generateUniqueRoomId();

    // Criar sala
    const { error: roomError } = await window.supabaseClient
      .from('salas')
      .insert([{
        id: roomId,
        nome: currentRoomName,
        criada_em: new Date().toISOString(),
        atualizada_em: new Date().toISOString()
      }]);

    if (roomError) throw roomError;

    // Criar colunas
    const columns = columnNames.map((name, index) => ({
      sala_id: roomId,
      nome: name,
      cor: '#ffffff33',
      ordem: index
    }));

    const { error: colError } = await window.supabaseClient
      .from('colunas')
      .insert(columns);

    if (colError) throw colError;

    // Log de criação
    window.analytics.trackRoomAction('room_created', roomId);

    await window.supabaseClient
      .from('logs')
      .insert([{
        tipo: 'sala_criada',
        sala_id: roomId,
        detalhe: { nome: currentRoomName, colunas: columnNames.length }
      }]);

    // Redirecionar para a sala
    window.location.href = `sala.html?id=${roomId}`;
  } catch (error) {
    console.error('Erro ao criar sala:', error);
    document.getElementById('columnError').textContent = 'Erro ao criar sala. Tente novamente.';
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = originalText;
  }
}

// Acessar sala existente
async function accessRoom() {
  const code = document.getElementById('accessCode').value.trim().toUpperCase();
  const error = document.getElementById('accessError');

  error.textContent = '';

  if (!code) {
    error.textContent = 'Informe o código da sala';
    return;
  }

  if (code.length !== 4) {
    error.textContent = 'Código deve ter 4 caracteres';
    return;
  }

  try {
    // Verificar se sala existe
    const { data: room, error: roomError } = await window.supabaseClient
      .from('salas')
      .select('id')
      .eq('id', code)
      .single();

    if (roomError || !room) {
      error.textContent = 'Sala não encontrada';
      return;
    }

    // Log de acesso
    window.analytics.trackRoomAction('room_accessed', code);

    await window.supabaseClient
      .from('logs')
      .insert([{
        tipo: 'sala_acessada',
        sala_id: code,
        detalhe: null
      }]);

    // Redirecionar para a sala
    window.location.href = `sala.html?id=${code}`;
  } catch (error) {
    console.error('Erro ao acessar sala:', error);
    error.textContent = 'Erro ao acessar sala. Tente novamente.';
  }
}

// Detectar Enter nos campos de input
document.getElementById('roomName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') continueCreateRoom();
});

document.getElementById('accessCode').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') accessRoom();
});

document.getElementById('columnCount').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') createRoom();
});

// Esperar Supabase estar pronto
window.addEventListener('supabase-ready', () => {
  console.log('Retro home page ready');
});
