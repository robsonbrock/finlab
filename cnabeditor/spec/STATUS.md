# CNAB Editor — Estado do projeto (registro de handoff)

Última atualização: 07/07/2026

## Onde paramos
Editor CNAB240 reconstruído conforme o manual FEBRABAN 10.11 (31/07/2023).
Fonte de verdade: `spec/cnab240-spec.json` (extraído do PDF completo em `spec/manual-full.txt`).
Arquivo do editor: `index.html` (arquivo único, ~695 KB, compila e fecha em `</html>`).

## O que está pronto e verificado
- CNAB 150 removido por completo.
- 90 segmentos / ~1776 campos no `S240`, com posição, tipo, tamanho e domínios.
- Identificação de segmento ciente do tipo de serviço do lote (posições 10-11 do header de lote).
- Validador: aceita zeros/branco como "não informado" (sem falso positivo do R). Zero falso positivo no exemplo.
- Gerador de exemplo multi-produto: 25 linhas, todas com 240 chars, cobrança + pagamento a fornecedor + tributos, zero campo inválido.
- Nomes de campo: reconstruídos a partir da descrição oficial do manual, sem lixo de extração. Varredura acusa zero nome quebrado/duplicado.
- Rodapé v0.10.0 com link para o manual oficial.
- Divisor 70/30 com persistência em localStorage.
- Alternador de tema (claro/escuro) restaurado (havia quebrado na reconstrução).
- Botão "Colar" restaurado (funções do modal haviam sumido). Todos os 16 handlers on* do HTML têm função definida.
- Ícone do botão de wrap trocado por SVG de "quebra de texto".
- Correções do QA aplicadas: P58/T58 = "Código da Carteira"; domínios G029 (Forma de Lançamento) e C044 (Y-04) preenchidos; H-202 lista impossível limpa; "Tipo de Operação" do header de Boleto Eletrônico corrigido de N para A.

## QA
- Relatórios: `spec/qa-report.md`, `qa-report-2.md`, `qa-report-3.md`, `qa-report-final.md`.
- Caminho principal (Cobrança de Títulos + Pagamentos) valida 100% limpo.

## O que ainda falta (não-bloqueadores, produtos secundários)
1. Segmento S (cobrança): as variantes de impressão existem no S240, mas a identificação (`resolveDetalhe`/`computeLineSeg`) sempre cai no S base (campos 1-17), então linha S não valida de 18 a 240. Ligar as variantes na identificação.
2. Segmentos que não fecham 1..240 (herdados de erro do próprio manual ou lacuna de extração): J-53 (falta campo final 188-240), Y-51, Extrato Gestão de Caixa (saldo inicial/final e trailer), Compror (stubs A/B/C/J vazios e I-11). Só impacta quem editar esses produtos.
3. Verificação campo a campo contra o manual dos produtos secundários (Extrato, Custódia, Vendor, Consignação, Compror, Boleto Eletrônico) ainda não foi 100% cruzada; o núcleo foi.
4. Cosméticos: alguns nomes mantêm abreviação do manual (ex.: "Valor a Déb./Créd."); R-231 usa 01/02/03 em campo numérico de 1 char (inconsistência do manual, sem falso positivo por normalização).

## Próximos passos sugeridos
- Ligar variantes do segmento S na identificação (item 1) — maior valor.
- Fechar os layoutGaps dos itens 2 conferindo posições no manual.
- Rodar QA de novo focado em Boleto Eletrônico / Extrato após os ajustes.
