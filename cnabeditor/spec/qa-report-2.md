# QA Final — Editor CNAB240 (auditoria independente e cética)

**Data:** 2026-07-07
**Escopo:** `index.html` (editor single-file), `spec/cnab240-spec.json`, `spec/manual-full.txt`
**Método:** somente leitura. S240 extraído do `index.html` (JSON após `const S240 = `) e validado programaticamente com Node. `validateField`, `computeLineSeg`, `resolveDetalhe`, `loadSample240` e demais dependências foram extraídas do próprio `index.html` e executadas headless.

## Números gerais

- **90 segmentos** definidos, **1776 campos** no total.
- **415 campos** têm lista fechada de valores (`v`) preenchida; **1356** têm apenas o código de domínio (`dom`) sem lista — comportamento esperado (a maioria dos códigos de domínio, ex. G001 "Código do Banco", C012 "Data", G070 "Valor", não são enumeráveis).
- Amostra de manual cross-check: 15 segmentos de produtos distintos (header/trailer arquivo, header/trailer lote, A, B, J, P, Q, R, T, U, N, O, Y-50).

---

## AUDITORIA 1 — NOMES DOS CAMPOS

### Varredura automática (1776 campos, todos os 90 segmentos)
Checagens: vazio, <=2 chars, início minúsculo, hífen final (truncado), fragmentos (`Cont`, `Caracte-`, `Cobran-`, `. para`), palavra de conteúdo duplicada, nomes sem sentido.

**Resultado: 0 problemas.** Nenhum nome vazio, truncado, minúsculo, com hífen solto ou palavra duplicada. Os únicos nomes curtos (<=6 chars) são legítimos: `CEP`, `Nome`, `Cidade`, `Bairro`, `DDD`, `Estado`, `Mora`.

### Cross-check contra o manual (amostra de 15 segmentos, campo a campo — nome/tipo/tamanho)

14 dos 15 segmentos: **OK** (nome, tipo N/A e tamanho posFim-posIni+1 conferem com o manual). Uma divergência real, replicada em 2 segmentos:

| Segmento | Posição | Editor (nome exibido) | Manual (14.3P / 14.3T, código C006) | Gravidade |
|---|---|---|---|---|
| `cobranca_titulos__segmento_P` | 58-58 | **"Dígito Verificador da Agência"** | **"Código da Carteira"** (Num, tam 1) | Menor |
| `cobranca_titulos__segmento_T` | 58-58 | **"Dígito Verificador da Agência"** | **"Código da Carteira"** (Num, tam 1) | Menor |

Observação que atenua a gravidade: **apenas o nome de exibição (`n`) está errado.** A descrição (`d = "Código da Carteira"`), o código de domínio (`dom = "C006"`) e a lista de valores (`v = [Cobrança Simples, Vinculada, Caucionada, Descontada, Vendor, Cessão]`) estão **corretos**. Ou seja: o campo valida e mostra o domínio certo; só o rótulo ao lado está trocado. Tipo (N) e tamanho (1) conferem.

---

## AUDITORIA 2 — VALORES ACEITÁVEIS (domínios)

### Coerência domínio x nome/descrição (415 campos com lista `v`)
Checagem heurística de listas ligadas ao campo errado (Tipo de Inscrição sem CPF/CNPJ; Moeda sem Real/URV; Espécie sem duplicata/nota; valor/data/nome com lista indevida).

**Resultado: 0 domínios claramente ligados ao campo errado.** As listas conferem com o nome/descrição. O caso `Y_50 [60] "Valor Cobrado"` (lista Valor Cobrado / Valor Registro / Rateio pelo Menor Valor) é um campo de 1 dígito código de cálculo de rateio — o rótulo é paráfrase da opção 1, mas posição/tipo/tamanho e a semântica da lista estão corretos. Não é erro.

### Campos que deveriam ter lista fechada mas estão vazios
A população de domínios é **sistemática e consistente**: praticamente todos os "Forma de Lançamento", "Código de Movimento", "Espécie do Título" em todos os produtos têm lista. Encontrados **2 furos** onde o campo irmão tem lista e este não:

| Segmento | Posição | Campo | O que falta | Referência |
|---|---|---|---|---|
| `pagamentos_credito__header_lote` | 12-13 | Forma de Lançamento | lista G029 (01 Crédito CC, 02 Cheque, 03 DOC/TED, 05 Poupança, ...) — todos os outros headers (títulos, tributos, extrato, débito, vendor, compror) já a têm | G029 |
| `cobranca_titulos__segmento_Y_04` | 16-17 | Código de Movimento | lista de movimento (o irmão Y-05 tem C044 preenchido) | C044/afim |

Também: `pagamentos_credito__segmento_A [220-224] "Codigo finalidade da TED"` (`dom=P011`, req=true) e `[225-226] "Complemento de finalidade pagamento"` estão com `v` vazio. Se P011 for enumerável no manual, é candidato a preencher. Baixa prioridade (campo alfanumérico, aceita livre).

### Campo de valor/data/nome com lista indevida
**0 casos.** Nenhum campo de valor, data, nome ou endereço tem lista fechada indevida.

### `validateField` sobre o exemplo (25 linhas)
Executado o pipeline real: `loadSample240()` gera 25 linhas (todas com **exatamente 240 caracteres**), `computeLineSeg()` resolve o segmento de cada linha, `validateField()` roda em cada campo.

- Resolução de segmentos correta: header arquivo -> 2 lotes cobrança (P/Q/R) -> lote pagamento fornecedor (A/B) -> lote tributos (N) -> trailer arquivo.
- **FALSOS POSITIVOS: 0.** Nenhum campo do exemplo é marcado como inválido.

---

## AUDITORIA 3 — ESTRUTURA E TEMA

### Contiguidade 1..240
Segmentos que não fecham 1..240 contíguo (todos classificados como **limitação conhecida**, não bloqueador):

- `pagamentos_titulos__segmento_J_53` — fecha em 187 (J-53, quirk do manual).
- `cobranca_titulos__segmento_S` — fecha em 17 (é layout-base; as variantes reais são `segmento_S__impressao_1_ou_2` e `__impressao_3`).
- `cobranca_boleto_eletronico__segmento_Y_51` — overlaps em 35-48->50-57 e 111-125->125-133 (Y-51, quirk conhecido).
- `extrato_gestao_caixa__saldo_inicial`, `__saldo_final`, `__trailer_lote` — gaps/overlaps (extrato de saldos, quirk conhecido).
- `compror__segmento_I_11` — overlap 180-201->200-240 (stub compror).
- `compror__segmento_A / _B / _C / _J` — **sem campos** (stubs; a label vem cortada "Remessa /"; delegam aos layouts equivalentes de pagamentos). Limitação conhecida.

Todos os demais 240-fecham corretamente. Nenhum bloqueador estrutural novo.

### Tema
- `applyTheme(t)` — grava `document.documentElement.dataset.theme=t`, troca o ícone do botão (lua/sol) e persiste em `localStorage('cnab-theme')`. **OK.**
- `toggleTheme()` — lê o tema atual (default `dark`) e alterna dark<->light. **OK.**
- `initTheme()` — IIFE auto-executada no load; restaura o tema salvo (default `dark`). **OK.**
- Botão `id="btn-theme"` com `onclick="toggleTheme()"` presente (linha 222). **OK.**
- CSS `[data-theme="light"]` presente, redefine todas as variáveis (--bg, --panel, --text, --accent, scrollbar, .line.mod, etc.). **OK.**

**Veredito do tema: deve funcionar corretamente** (toggle, persistência e restauração no reload).

---

## VEREDITO

### (b) ENTREGÁVEL COM RESSALVAS MENORES

O editor está funcionalmente sólido: nomes de campos íntegros (0 problemas em 1776 campos), domínios coerentes, `validateField` com zero falsos positivos no exemplo de 25 linhas, tema funcional, e estrutura correta salvo os quirks conhecidos do próprio manual. Nenhum bloqueador.

### Lista priorizada de correções

**P1 — Nome de campo trocado (afeta o cliente visualmente, correção trivial)**
1. `cobranca_titulos__segmento_P`, pos **58**: renomear `n` de `"Dígito Verificador da Agência"` -> **`"Código da Carteira"`**. (`d`, `dom=C006` e `v` já estão corretos.)
2. `cobranca_titulos__segmento_T`, pos **58**: idem — `n` -> **`"Código da Carteira"`**.

**P2 — Domínio faltando onde o campo irmão já tem (consistência)**
3. `pagamentos_credito__header_lote`, pos **12-13** "Forma de Lançamento": preencher `v` com a lista G029 (copiar de `pagamentos_titulos__header_lote`).
4. `cobranca_titulos__segmento_Y_04`, pos **16-17** "Código de Movimento": preencher `v` com a lista de movimento (referência no irmão `segmento_Y_05`).

**P3 — Opcional / baixo impacto**
5. `pagamentos_credito__segmento_A`, pos **220-224** "Codigo finalidade da TED" (`dom=P011`, req=true): avaliar preencher `v` se P011 for enumerável no manual. Campo alfanumérico, aceita entrada livre hoje — não bloqueia.

**Não corrigir (limitações conhecidas do manual, aceitáveis):** J-53 (fecha 187), Y-51 (overlaps), extrato saldos/trailer, compror stubs (A/B/C/J sem campos, I-11). Documentar como limitação, não bloqueador.
