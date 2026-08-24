# Scrum Retrospective Tool - Especificação Técnica

## Visão Geral
Ferramenta colaborativa anônima para retrospectivas ágeis. Múltiplos usuários acessam salas via código 4-char. Salas possuem colunas customizáveis com cards de feedback, votos (likes) e reações (emojis). Sincronização real-time via Supabase Realtime. Dark/light theme. Sem autenticação - acesso público.

## Stack Técnico
- **Frontend**: HTML5 vanilla + CSS3 + JavaScript puro (sem build step)
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: Vercel (root directory: `brtools/`)
- **API**: Serverless functions (`brtools/api/config.js`)
- **Temas**: CSS variables (--bg, --text, --accent, etc.)

## Arquitetura

### Camadas Frontend
1. **Controller** (`js/controller.js`): Event handlers, UI logic
2. **Service** (`js/roomService.js`): Business rules, validation
3. **Repository** (`js/repository.js`): Supabase CRUD + Realtime subscriptions
4. **Config** (`shared/config.js`): Environment variables loader
5. **Analytics** (`shared/analytics.js`): Event tracking (stub for GA)

### Fluxo de Dados
```
User Action → Controller → Service → Repository → Supabase
                ↓
            Update UI (optimistic)
                ↓
        Realtime event fires
                ↓
        Sync all connected clients
```

## Deployment

### Vercel Setup
- Root Directory: `brtools/`
- Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- API functions: `brtools/api/config.js` (serves env vars to client)
- Config: `brtools/vercel.json`

### Local Development
- Setup: `brtools/retro/setup-env.js` (auto-loaded on localhost)
- No build step required

## Padrões de Desenvolvimento

### Confirmações
- **Modais** (não alert/confirm): `emptyCardDeleteModal`, `deleteCardModal`, 6x `clearModals`
- **Dupla confirmação**: Remoção de coluna requer 2 modais
- **Escape key**: Fecha todos os modais

### Sincronização
- **Realtime subscriptions**: Global listeners em room/columns/cards/likes/emojis
- **Soft delete**: Flag `deletada=true` (nunca delete fisicamente)
- **300ms delay**: Antes de refetch após likes - garante consistência
- **Merge detection**: Drag-over outro card mostra borda tracejada antes de merge

### Otimizações
- **Promise.all()**: Carrega likes/emojis de cards em paralelo
- **Optimistic UI**: Atualiza interface imediatamente, aguarda Realtime confirmar
- **Conditional rendering**: Novo card/coluna renderiza com edit-mode ativado

### Sessão
- SessionID gerado por cliente (localStorage)
- Rastreamento de likes por sessão (não globalmente)
- Vote limit per column: `max_likes_per_column` (default 5)

## Database Schema

| Tabela | Uso |
|--------|-----|
| `salas` | Rooms (id=4char, nome, timestamps) |
| `colunas` | Columns (nome, cor, ordem, deletada) |
| `cards` | Cards (texto, ordem, deletada, max 500 chars) |
| `card_likes` | Votes (card_id, session_id) |
| `card_emojis` | Emoji reactions (card_id, emoji) |
| `logs` | Audit trail (tipo, sala_id, detalhe JSON) |
| `params` | Config (chave, valor) - para expurgo (30d default) |

### RLS
Acesso anônimo: INSERT/SELECT/UPDATE públicos, filtragem por `sala_id`/`coluna_id`.

## Features Implementadas

### Room Management
- Create: Modal com nome + modelo (5 pré-defined ou custom cols)
- Access: 4-char code lookup
- Edit name: Inline edit (max 50 chars)
- Room-level vote limit editor
- Export to CSV: `sala-nome_YYYYMMDD.csv`

### Columns
- Create/delete: Add button + dupla confirmação para delete
- Rename: Inline edit (max 30 chars)
- Color picker: Updates all card borders + column background (0.2 alpha)
- Like counter: Shows session's votes in column
- Reorder: Drag-and-drop

### Cards
- Create/delete: Per-column
- Edit text: Blur-to-save (max 500 chars)
- Empty card confirmation: Modal (not alert)
- Soft delete: Flag `deletada=true`
- Auto-focus: New cards focus textarea immediately
- Like: Toggle per session, respects vote limit
- Drag-and-drop: Reorder within column OR merge to another
- Merge: Concatenate text + sum likes/emojis
- Emoji picker: Modal grid (25 emojis)

### Sorting
- Sort by: Data criação | Votos (store in room.sort_by)
- Applies to all cards per column

### Clear Operations
- Zerar votos: Clears likes for all cards
- Excluir cards: Soft-deletes all cards
- Excluir tudo: Clears columns AND cards
- 6 dupla-confirmação modals

### Theme
- Dark/light toggle: Via CSS variables
- Persisted in localStorage (`brtools_theme`)
- Applied to all pages

### Responsive
- Desktop: Columns flex 1 (equal width), side-by-side
- 768px: Stack vertically, columns 100% width
- 480px: Compact header, smaller buttons/fonts

## Estrutura de Pastas
```
brtools/
  ├── index.html                 # Home (Scrum Planning + Retro cards)
  ├── shared/
  │   ├── config.js             # Env var loader
  │   ├── supabaseClient.js      # Supabase init
  │   ├── analytics.js           # Event tracking stub
  │   ├── theme.js              # Dark/light toggle
  │   ├── config.local.html      # [gitignore] Local dev secrets
  │   └── setup-env.js          # [gitignore] Local env setup
  ├── retro/
  │   ├── index.html            # Create/access room page
  │   ├── sala.html             # Main retrospective page
  │   ├── setup-env.js          # [gitignore] Local env setup
  │   ├── api/
  │   │   └── config.js         # Serverless: returns env vars
  │   ├── vercel.json           # Vercel config (functions)
  │   ├── js/
  │   │   ├── controller.js     # Event handlers
  │   │   ├── roomService.js    # Business logic
  │   │   ├── repository.js     # Supabase queries + subscriptions
  │   │   └── retro-home.js     # Home page logic
  │   └── spec/
  │       └── spec.md           # [Original] User requirements
  ├── vercel.json               # Vercel root config (deprecated)
  └── [...]
```

## Segurança

### Environment Variables
- Dev: `setup-env.js` injeta em `window.__SUPABASE_URL/KEY__`
- Prod: Vercel env vars → API (`/api/config`) → client
- Never hardcode secrets
- `.env.local`, `setup-env.js` in `.gitignore`

### Row-Level Security
- All public (anon key): INSERT/SELECT/UPDATE by `sala_id`
- No user auth: Session-based tracking only

### Logs
- No console.log in production (removed)
- console.error minimal (no stack traces, no emojis)
- Audit trail in DB only

## Testing Checklist
- [ ] Create room (all 5 models + custom)
- [ ] Access existing room
- [ ] Sync across 2+ tabs (Realtime)
- [ ] Column: rename, color, delete (dupla confirm)
- [ ] Card: create, edit, like (vote limit), emoji, delete (empty confirm), merge
- [ ] Drag-and-drop: reorder cards, move to column, merge
- [ ] Sort by: data-criacao, votos
- [ ] Clear: likes, cards, all
- [ ] Export CSV
- [ ] Theme toggle (dark/light)
- [ ] Responsive: desktop, tablet, mobile
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
