# Setup Guia

## Variáveis de Ambiente

### Desenvolvimento Local

1. Crie um arquivo `.env.local` na raiz do projeto:
```bash
supabase_url=https://your-project.supabase.co
supabase_anon_key=your-anon-key-here
```

2. **NUNCA** faça commit deste arquivo (já está no `.gitignore`)

### Vercel Deployment

1. Acesse o Dashboard do Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as variáveis **COM PREFIXO** `NEXT_PUBLIC_` (Vercel usa isso para injetar em cliente):

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
```

4. Ou, se usar lowercase:
```
supabase_url = https://your-project.supabase.co
supabase_anon_key = your-anon-key-here
```

⚠️ **Importante**: Vercel só aceita:
- lowercase letters
- digits (0-9)
- dashes (-)
- underscores (_)

❌ Não use: UPPERCASE, VITE_, pontos, outros caracteres

## Como Funciona

1. `config.js` lê as variáveis de `window.__SUPABASE_URL__` ou `localStorage`
2. `supabaseClient.js` usa essas variáveis para conectar ao Supabase
3. No Vercel, você injeta via Settings → Environment Variables

## Segurança

✅ Chaves nunca são commitadas no Git  
✅ `.env` está no `.gitignore`  
✅ Apenas variáveis públicas do Supabase são usadas (anon key)  
✅ RLS (Row Level Security) controla acesso aos dados  