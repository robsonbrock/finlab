# QA Report FINAL (Rodada 3) — Certificação do Editor CNAB240

**Arquivo auditado:** `cnabeditor/index.html` (arquivo único; `const S240` com 90 segmentos, `validateField`, `computeLineSeg`/`resolveDetalhe`, `loadSample240`).
**Fontes de verdade:** `spec/cnab240-spec.json`, `spec/manual-full.txt` (FEBRABAN 10.11).
**Método:** auditoria independente, cética, SOMENTE LEITURA. Extração do objeto `S240` como JSON e execução do **código real** do editor (`computeLineSeg`, `resolveDetalhe`, `validateField`, `loadSample240`) em harness Node (v22) com `loadContent` interceptado. Nenhum arquivo foi modificado.
**Data:** 2026-07-07

---

## VEREDITO: (b) ENTREGÁVEL COM 1 RESSALVA REAL (correção rápida recomendada antes de liberar Boleto Eletrônico)

O caminho principal (Cobrança de Títulos + Pagamentos Crédito/Tributos) valida sem nenhum falso positivo, e o defeito de nicho do H-202 da rodada anterior foi corrigido. Porém a varredura de robustez em TODOS os 90 segmentos (não só no exemplo) revelou **1 defeito novo, real e não-nicho**: um campo do header de lote de Boleto Eletrônico está com tipo errado (`N` em vez de `A`), o que gera **falso positivo garantido** em qualquer arquivo válido desse produto. Não é bloqueador para Cobrança/Pagamentos, mas deve ser corrigido antes de habilitar Boleto Eletrônico.

---

## CHECK 1 — Campos alfa com lista fechada onde menor código > largura: APROVADO (0 casos)

Varredura de todos os 90 segmentos / todos os campos `t !== 'N'` com `v` não vazio:
- **COUNT = 0.** Nenhum campo alfa com lista fechada cujo menor código exceda a largura.
- **H-202 CONFIRMADO CORRIGIDO:** `emprestimo_consignacao__segmento_H` pos 202-202 "Tipo Residual Garantido" agora tem `v = []` (lista vazia). O falso positivo garantido da rodada anterior não existe mais.

## CHECK 2 — validateField sobre as 25 linhas do exemplo (loadSample240): APROVADO (0 falso positivo)

Execução real: `loadSample240()` → 25 linhas capturadas → `computeLineSeg` + `validateField` campo a campo.
- 25/25 linhas com exatamente 240 caracteres.
- 25/25 linhas com segmento identificado.
- **Total de erros de campo = 0. FALSOS POSITIVOS = 0.**

## CHECK 3 — Varredura de robustez (todos os segmentos, valor de domínio VÁLIDO): 1 CAMPO / 1 SEGMENTO COM ERRO

Para cada um dos 90 segmentos foi gerada uma linha de 240 chars preenchendo cada campo com valor plausível (campos com lista `v` → primeiro código, ajustado à largura; Num sem lista → zeros; Alfa sem lista → brancos) e rodado `validateField` em todos os campos.

**Resultado: 1 campo em 1 segmento acusa erro com valor de domínio VÁLIDO.**

| Segmento | Pos | Nome | Tipo (S240) | Valor domínio | Erro |
|---|---|---|---|---|---|
| `cobranca_boleto_eletronico__header_lote` | 9-9 | Tipo de Operação (dom G028) | **N (errado)** | `C` (Lançamento a Crédito) | Falso positivo |

**Diagnóstico (defeito real):**
- O domínio G028 "Tipo de Operação" é **alfabético** — códigos `C/D/E/G/I/R/T`. O manual, na linha do header de lote de Boleto Eletrônico (`manual-full.txt` linha 3091), define explicitamente `Alfa 'C'`.
- Em **todos os outros 14 segmentos** que carregam esse mesmo campo (pagamentos_credito, pagamentos_titulos, pagamentos_tributos, cobranca_titulos, cobranca_alegacao, debito_conta, vendor, custodia_cheques, extrato_*, compror, etc.) o campo está correto como `t:"A"`. **Apenas** `cobranca_boleto_eletronico__header_lote` está com `t:"N"`.
- Como `validateField` rejeita qualquer não-dígito em campo `N` (`/^[\d ]*$/`), o valor válido `C` (e qualquer código G028) **nunca passa** → falso positivo garantido em todo header de lote de Boleto Eletrônico.
- **Alcance:** produto Boleto Eletrônico (Tipo de Serviço 03). NÃO é de nicho — é um produto de cobrança comum. Não aparece no exemplo, por isso passou no CHECK 2 mas foi pego pela varredura de robustez.

**Correção sugerida (1 char):** em `cobranca_boleto_eletronico__header_lote`, campo pos 9-9, trocar `"t":"N"` por `"t":"A"` (alinhando aos outros 14 segmentos e ao manual).

## CHECK 4 — NOMES: APROVADO

Varredura de todos os campos de todos os 90 segmentos:
- Nomes vazios: **0**. Nomes com 1-2 chars: **0**. Palavra duplicada consecutiva: **0**.
- Único nome com aparência de truncamento: `cobranca_titulos__segmento_Y_05` pos 224-240 = `"Uso Exclusivo FEBRABAN /"`. O rótulo do manual (G004) é "Uso Exclusivo FEBRABAN / CNAB"; o ` / ` ao final é **cosmético**, em campo de filler (brancos). Sem impacto no validador. Não bloqueia.

## CHECK 5 — HANDLERS: APROVADO

Extração de todos os atributos `on*` do HTML e cruzamento com funções definidas no script.
- Todos os identificadores chamados nos handlers estão definidos. O único "faltante" apontado pelo scanner é `click` em `document.getElementById('fi').click()` — é o **método DOM `.click()`**, não uma função ausente. FALSO POSITIVO.
- Todo `on*` do HTML tem função/definição válida.

---

## ITENS REMANESCENTES

| # | Severidade | Segmento | Pos | Problema | Correção |
|---|---|---|---|---|---|
| 1 | **Real / média** | `cobranca_boleto_eletronico__header_lote` | 9-9 | "Tipo de Operação" com `t:"N"` mas domínio G028 é alfabético (C/D/E/…). Falso positivo garantido em todo header de lote de Boleto Eletrônico. Os outros 14 segmentos têm o campo como `t:"A"`. | Trocar `t:"N"` → `t:"A"` |
| 2 | Cosmético | `cobranca_titulos__segmento_Y_05` | 224-240 | Nome "Uso Exclusivo FEBRABAN /" (deveria terminar "… / CNAB"); campo de filler. Sem impacto no validador. | Opcional |

**Conclusão:** o H-202 da rodada anterior está corrigido e o exemplo valida limpo (0 falso positivo). Entretanto a varredura por produto expôs o item 1, um defeito real de tipo×domínio que afeta o produto Boleto Eletrônico. Enquanto não corrigido, o editor é seguro para Cobrança de Títulos e Pagamentos, mas apresentará falso positivo em arquivos de Boleto Eletrônico. Recomenda-se aplicar a troca `N→A` (uma linha) para atingir 100% entregável.
