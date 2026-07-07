# QA Report 3 — Certificação FINAL do Editor CNAB240

**Arquivo auditado:** `cnabeditor/index.html` (arquivo único, `const S240` com 90 chaves de segmento)
**Fontes de verdade:** `spec/cnab240-spec.json`, `spec/manual-full.txt` (FEBRABAN 10.11)
**Método:** auditoria independente, somente leitura. Extração do objeto `S240` como JSON + execução da lógica real (`computeLineSeg`, `validateField`, `validateAllFields`, `loadSample240`) em harness Node com DOM stubado. Cruzamento por amostra contra o manual.
**Data:** 2026-07-07

---

## VEREDITO: (b) ENTREGÁVEL COM RESSALVAS MENORES

O editor está seguro para o uso principal (Cobrança de Títulos e Pagamentos — Crédito/Tributos), que é onde o cliente vai operar. As checagens 1, 3, 4 e 5 passaram integralmente. Resta **um único defeito de domínio real**, restrito a um produto de nicho (Empréstimo/Consignação, segmento H), que não bloqueia a entrega mas deve ser corrigido.

---

## CHECK 1 — NOMES: APROVADO

Varredura de todos os 90 segmentos / todos os campos:
- **Nenhum** nome vazio, com 1–2 chars, minúsculo, truncado ou com hífen solto.
- Único flag automático de "palavra duplicada": `cobranca_titulos__segmento_P` [109-109] "Identificação de Título Aceito/Não Aceito" — **FALSO POSITIVO** (nome legítimo do manual, linha 2140/2130: "Identific. de Título Aceito/Não Aceito").

**Confirmação específica P/T pos 58-58:** ambos agora = **"Código da Carteira"** (manual linha 2127 "14.3P … Código da Carteira 58"). CORRIGIDO conforme relatório anterior.

**Cross-check (>=8 segmentos) contra o manual — nome/tipo/tamanho conferem:**
| Segmento | Pos | Nome | t | w | Manual |
|---|---|---|---|---|---|
| header_arquivo | 1-3 | Código do Banco na Compensação | N | 3 | OK |
| header_arquivo | 143 | Código Remessa / Retorno | N | 1 | OK |
| pag_credito seg A | 120-134 | Valor do Pagamento | N | 15 | OK |
| pag_credito seg B | 18 | Tipo de Inscrição do Favorecido | N | 1 | OK |
| cob_titulos seg P | 15 | Uso Exclusivo FEBRABAN/CNAB | A | 1 | linha 2119 OK |
| cob_titulos seg P | 58 | Código da Carteira | N | 1 | linha 2127 OK |
| cob_titulos seg P | 107 | Espécie do Título | A | — | linha 2139 OK |
| cob_titulos seg P | 109 | Identificação de Título Aceito/Não Aceito | A | 1 | linha 2140 OK |
| pag_tributos seg N | 15 | Tipo de Movimento | N | 1 | OK |
| cob_titulos seg T | 58 | Código da Carteira | N | 1 | OK |
| debito_conta seg A | 230 | Aviso ao Pagador | N | 1 | OK |
| cob_boleto seg G | 62 | Tipo de Inscrição do Beneficiário | N | 1 | OK |

Todos plausíveis e coerentes com posição/tipo/tamanho.

---

## CHECK 2 — DOMÍNIOS: APROVADO com 1 defeito

**Confirmações específicas (correções anteriores):**
- `pagamentos_credito__header_lote` [12-13] "Forma de Lançamento" — **34 valores** (01,02,…,81). PRESENTE.
- `cobranca_titulos__segmento_Y_04` [16-17] "Código de Movimento" — **58 valores** (02,03,…,94). PRESENTE.

**Campos cujo nome pede lista fechada com `v` indevidamente vazio:** ZERO.
Verificados e populados: Espécie do Título (33), Aceite (2), Forma de Cadastramento (3), Tipo de Documento (2), Tipo da Moeda (17), Código da Moeda (30), Tipo de Inscrição (5), Código de Movimento, Forma de Lançamento, etc. "Quantidade da Moeda" corretamente SEM lista (é quantidade numérica livre, não código).

**Listas `v` ligadas a campo incompatível:** nenhuma (as suspeitas do regex — "Tipo de Inscrição", "Complemento Tipo Serviço" — são campos de código legítimos).

### DEFEITO (único item remanescente)
- **Segmento:** `emprestimo_consignacao__segmento_H`
- **Posição:** 202-202 (t='A', largura 1) — "Tipo Residual Garantido" (domínio H031)
- **Problema:** os códigos da lista `v` são as palavras inteiras `Antecipado` / `Parcelado` / `Final`, extraídas da descrição do manual ("Antecipado – integralmente no ato…"). Como o campo tem apenas 1 caractere e a validação alfa exige match exato, **qualquer valor válido de 1 char nunca casará** → falso positivo garantido nesse campo.
- **Alcance:** produto Empréstimo/Consignação (códigos de serviço 08/09/11/12/13). Segmento acessível, mas de nicho; NÃO aparece no exemplo nem no fluxo típico de cobrança/pagamento.
- **Correção sugerida:** trocar os códigos por 1 char — `["A","Antecipado - integralmente no ato da operação"]`, `["P","Parcelado - nº igual à contraprestação"]`, `["F","Final - integralmente no vencimento"]`. (O manual só descreve os termos; o layout de 1 char implica códigos de 1 letra.)

### Observação NÃO-bloqueadora (cosmética, sem impacto no validador)
- `cobranca_titulos__segmento_R` [231-231] "Aviso para Débito Automático" (t='N', largura 1): a lista traz códigos `01/02/03`, mas o campo tem 1 char. **Inconsistência do próprio manual** (linha 2255 diz "231 231 1"; a definição do domínio C039 na linha 6115 lista '01'/'02'/'03'). Como o campo é numérico, `validateField` normaliza via `parseInt` ('1'==='01'), então **NÃO gera falso positivo**. Deixar como está é aceitável.

---

## CHECK 3 — VALIDADOR: APROVADO (ZERO falso positivo)

Execução real de `loadSample240()` → geração das 25 linhas → `computeLineSeg` + `validateAllFields` (mesma lógica do editor). Resultado:
- 25/25 linhas com exatamente 240 caracteres.
- 25/25 linhas com segmento identificado corretamente (header_arquivo, cob_titulos header/P/Q/R/trailer, pag_credito header/A/B/trailer, pag_tributos header/N/trailer, trailer_arquivo).
- **0 erros de campo** em todas as 25 linhas.

**FALSOS POSITIVOS: 0.**

---

## CHECK 4 — HANDLERS / UI: APROVADO

Extraídos todos os atributos `on*` do HTML e cruzados com funções definidas no script.
- **Todos os handlers têm definição.** Único "faltante" reportado pelo scanner é `getElementById`, que é `document.getElementById(...)` dentro de um handler inline — FALSO POSITIVO.
- Confirmados definidos: `toggleTheme`, `applyTheme`, `initTheme` (IIFE auto-executada), `openPasteModal`, `closePasteModal`, `loadFromPaste`, `onOverlayClick`, `toggleWrap`.
- Modal Nosso Número: `openNossoNumeroModal`, `closeNossoNumeroModal`, `copyNossoNumero`, `onNNInput`, `onNNOverlayClick` — todos definidos.
- Botão `id="btn-wrap"`: contém ícone **SVG** interno (linhas horizontais, viewBox 0 0 24 24). CONFIRMADO.

---

## CHECK 5 — ESTRUTURA (contiguidade 1..240): APROVADO

11 segmentos não fecham 1..240; **todos** são os erros conhecidos/aceitáveis do manual ou stubs de despacho:
- `pagamentos_titulos__segmento_J_53` (fecha em 187) — erro conhecido do manual.
- `cobranca_titulos__segmento_S` (fecha em 17) — é o layout-base/dispatcher; as variantes reais `..._S__impressao_1_ou_2` e `..._S__impressao_3` fecham em 240.
- `cobranca_boleto_eletronico__segmento_Y_51` — gaps conhecidos (Y-51).
- `extrato_gestao_caixa__saldo_inicial`, `__saldo_final`, `__trailer_lote` — erros conhecidos de extrato (saldos/trailer).
- `compror__segmento_A/B/C/J` — stubs sem campos (esperado).
- `compror__segmento_I_11` — overlap conhecido (I-11).

Nenhum bloqueador novo.

---

## RESUMO DE ITENS REMANESCENTES

| # | Severidade | Segmento | Pos | Problema | Correção |
|---|---|---|---|---|---|
| 1 | Menor (nicho) | emprestimo_consignacao__segmento_H | 202-202 | Códigos de domínio são palavras inteiras (Antecipado/Parcelado/Final) num campo de 1 char alfa → falso positivo | Usar códigos de 1 char (A/P/F) mantendo a descrição |
| 2 | Cosmético (sem impacto) | cobranca_titulos__segmento_R | 231-231 | Códigos 01/02/03 num campo de 1 char (inconsistência do manual); numérico normaliza, sem falso positivo | Opcional: usar 1/2/3 |

**Conclusão:** entregável ao cliente. O caminho principal (Cobrança + Pagamentos) valida sem falsos positivos, todos os nomes estão corretos, domínios-chave presentes, handlers e UI íntegros. Recomenda-se corrigir o item 1 antes de habilitar edição de Empréstimo/Consignação em produção.
