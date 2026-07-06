# Cobertura da Especificação CNAB240 (FEBRABAN)

Fonte: Manual FEBRABAN CNAB240, versão **10.11**, 31/07/2023.

> **AVISO DE COBERTURA (crítico):** O texto-fonte extraído do PDF está **TRUNCADO** no início da seção 3.2 (Cobrança). 
Somente foram extraídos os registros de **Arquivo** (Header 0 / Trailer 9) e os produtos de **Pagamentos** 
(crédito em conta / cheque / OP / DOC / TED / Pix; pagamento de títulos de cobrança e QRCode Pix; pagamento de tributos). 
**NÃO** estão no texto-fonte: segmentos de Cobrança (P, Q, R, S, T, U, V, Y e subvariantes), Extrato (E / F / I), 
Débito em Conta (D), Vendor (K / L / M), Custódia de Cheques (D), Empréstimo por Consignação (H) e Compror (I). 
As **tabelas de domínio** (seção 4.0 - Descrição dos Campos) também não constam no texto extraído.

## Segmentos cobertos

| id | Nome | Tipo Reg. | Cód. Segmento | Sub-tipo | Nº campos | Fecha 1..240? | Observação |
|---|---|---|---|---|---|---|---|
| header_arquivo | Header de Arquivo | 0 | - | - | 24 | Sim | - |
| trailer_arquivo | Trailer de Arquivo | 9 | - | - | 8 | Sim | - |
| header_lote_pagamentos | Header de Lote - Pagamentos | 1 | - | - | 28 | Sim | - |
| segmento_A | Segmento A | 3 | A | - | 30 | Sim | - |
| segmento_B | Segmento B | 3 | B | - | 13 | Sim | - |
| segmento_C | Segmento C | 3 | C | - | 19 | Sim | - |
| trailer_lote_pagamentos | Trailer de Lote - Pagamentos | 5 | - | - | 10 | Sim | - |
| header_lote_pagto_titulos | Header de Lote - Pagamento de Títulos | 1 | - | - | 27 | Sim | - |
| segmento_J | Segmento J | 3 | J | - | 21 | Sim | - |
| segmento_J52 | Segmento J-52 (Registro Opcional 52) | 3 | J | 52 | 18 | Sim | - |
| segmento_J52_pix | Segmento J-52 para o PIX (Registro Opcional 52) | 3 | J | 52-PIX | 16 | Sim | - |
| segmento_J53 | Segmento J-53 (Registro Opcional 53) | 3 | J | 53 | 16 | Sim | layoutGap |
| trailer_lote_pagto_titulos | Trailer de Lote - Pagamento de Títulos | 5 | - | - | 10 | Sim | - |
| header_lote_tributos | Header de Lote - Pagamento de Tributos | 1 | - | - | 28 | Sim | - |
| segmento_O | Segmento O | 3 | O | - | 16 | Sim | - |
| segmento_N | Segmento N (base) | 3 | N | - | 14 | Sim | - |
| segmento_N1 | N1 - GPS | 3 | N | GPS | 9 | Bloco 111-230 OK | bloco variável |
| segmento_N2 | N2 - DARF | 3 | N | DARF | 11 | Bloco 111-230 OK | bloco variável |
| segmento_N3 | N3 - DARF Simples | 3 | N | DARF_SIMPLES | 11 | Bloco 111-230 OK | bloco variável |
| segmento_N4 | N4 - GARE-SP | 3 | N | GARE_SP | 13 | Bloco 111-230 OK | bloco variável |
| segmento_N5 | N5 - IPVA | 3 | N | IPVA | 12 | Bloco 111-230 OK | bloco variável |
| segmento_N6 | N6 - DPVAT | 3 | N | DPVAT | 12 | Bloco 111-230 OK | bloco variável |
| segmento_N7 | N7 - Licenciamento | 3 | N | LICENCIAMENTO | 13 | Bloco 111-230 OK | bloco variável |
| segmento_N8 | N8 - DARJ | 3 | N | DARJ | 11 | Bloco 111-230 OK | bloco variável |
| segmento_W | Segmento W | 3 | W | - | 13 | Sim | layoutGap |
| segmento_W1 | W1 - Informação Complementar de Tributo (FGTS) | 3 | W | W1-FGTS | 8 | Bloco 177-228 OK | layoutGap, bloco variável |
| segmento_Z | Segmento Z | 3 | Z | - | 9 | Sim | layoutGap |
| trailer_lote_tributos | Trailer de Lote - Tributos | 5 | - | - | 8 | Sim | - |

**Total de segmentos:** 28  |  **Total de campos:** 428

## Como cada segmento é identificado

- **Posição 8** (`Tipo de Registro`): 0=Header Arquivo, 1=Header Lote, 3=Detalhe, 5=Trailer Lote, 9=Trailer Arquivo.
- **Posição 14** (`Código do Segmento`): letra do segmento (A, B, C, J, N, O, W, Z ...) nos registros de detalhe (tipo 3).
- **Posições 18-19** (`Código Registro Opcional`): distinguem sub-variantes do segmento J (52 = J-52; 53 = J-53).
- **Bloco variável**: em N (pos 111-230) e W (pos 177-228) o mesmo segmento assume layouts distintos conforme o tributo (N1..N8, W1).

## Domínios extraídos

Nenhuma tabela de valores de domínio (código->descrição) está presente no texto-fonte fornecido — a seção 4.0 do manual foi cortada. 
Todos os 115 códigos de domínio referenciados nos layouts foram registrados como `external: true` (sem valores inventados).

**Códigos referenciados:** B002, B003, C004, G001, G002, G003, G004, G005, G006, G007, G008, G009, G010, G011, G012, G013, G014, G015, G016, G017, G018, G019, G020, G021, G022, G025, G028, G029, G030, G031, G032, G033, G034, G035, G036, G037, G038, G039, G040, G041, G042, G043, G044, G047, G048, G049, G050, G051, G052, G053, G054, G055, G056, G057, G058, G059, G060, G061, G063, G064, G065, G066, G067, G100, G101, G102, L001, L002, L003, N001, N002, N003, N004, N005, N006, N007, N008, N009, N010, N011, N012, N013, N014, N015, N016, N017, N018, N019, N020, N021, N022, N023, N024, N025, N026, N027, N028, N029, P001, P002, P003, P004, P005, P006, P007, P009, P010, P011, P012, P013, P014, P015, P016, Z001, Z002

- `G001` (Código do Banco na Compensação): lista de bancos, `external: true` (não consta no manual, como esperado).

## Campos incertos / a verificar

### segmento_A — Segmento A
- **30.3A**: No PDF este campo aparece numerado como '29.3A' (duplicado com o campo Aviso). Renumerado para 30.3A. Posições 231-240 são certas.

### segmento_J53 — Segmento J-53 (Registro Opcional 53)
- **layoutGap**: A fonte apresenta numeração de campos corrompida no final do J-53: salta de 15.4.J53 para 18.4.J53 e há um fragmento '32/55' intercalado no campo CNAB (pos 132-187). Os campos 09-14 (Pagador Final / Agregador) estão íntegros. Há sobreposição/ambiguidade no bloco CNAB final: aparecem DUAS linhas CNAB, uma 132-187 (55) e outra 188-240 (53). Reconciliei como dois campos CNAB contíguos cobrindo 132-240; verificar contra PDF original.
- **15.4.J53**: Numeração/tamanho corrompidos na fonte (fragmento '32/55'); tamanho 55 inferido de 132-187.
- **16.4.J53**: No PDF numerado '18.4.J53'; renumerado. Sobrepõe-se conceitualmente ao campo anterior - verificar layout real.

### header_lote_tributos — Header de Lote - Pagamento de Tributos
- **28.1**: No PDF este campo aparece numerado como '27.1' (duplicado). Renumerado para 28.1.

### segmento_N8 — N8 - DARJ
- **05.3.N8**: No PDF numerado '03.3.N8' (duplicado). Renumerado.
- **06.3.N8**: No PDF numerado '04.3.N8'. Renumerado.
- **07.3.N8**: No PDF numerado '05.3.N8'. Renumerado.
- **08.3.N8**: No PDF numerado '06.3.N8'. Renumerado.
- **09.3.N8**: No PDF numerado '07.3.N8'. Renumerado.
- **10.3.N8**: No PDF numerado '08.3.N8'. Renumerado.
- **11.3.N8**: No PDF numerado '09.3.N8'. Renumerado. Bloco N8 fecha em 230 (sem campo Ocorrências pois é bloco variável do N).

### segmento_W — Segmento W
- **layoutGap**: O campo 10.3W aparece dividido em DUAS linhas na fonte: '10.3W Informação Complementar 3 / Identificador de Tributo 177 178 2' e uma linha sem número 'Informação Complementar Tributo 179 228 48'. Interpretei como dois campos (177-178 e 179-228). O bloco 179-228 é detalhado no sub-layout W1. Verificar numeração no PDF.
- **10.3W.b**: Campo sem número próprio na fonte (continuação do 10.3W).

### segmento_W1 — W1 - Informação Complementar de Tributo (FGTS)
- **layoutGap**: Todos os campos do W1 estão numerados como '10.3W' na fonte. Renumerados sequencialmente (a-g). O bloco cobre 177-228 (52 posições); verificar contra PDF.
- **W1.a**: Renumerado (fonte: '10.3W').
- **W1.b**: Renumerado (fonte: '10.3W').
- **W1.c**: Renumerado (fonte: '10.3W').
- **W1.d**: Renumerado (fonte: '10.3W').
- **W1.e**: Renumerado (fonte: '10.3W').
- **W1.f**: Renumerado (fonte: '10.3W').
- **W1.g**: Renumerado (fonte: '10.3W').
- **W1.h**: Renumerado (fonte: '10.3W'; grafado 'G0004').

### segmento_Z — Segmento Z
- **layoutGap**: A fonte pula o campo 07.3Z: numera 06.3Z (15-78) e depois 08.3Z (79-103). Não há buraco de posições (contíguo), apenas a numeração salta de 06 para 08. Mantida a numeração original da fonte.
- **08.3Z**: Numeração salta de 06.3Z para 08.3Z na fonte (07.3Z ausente); posições contíguas.

## Notas de conversão de tamanho

Nos campos monéticos/quantidade (Num com decimais), o manual informa na coluna *tamanho* o número de **dígitos** e, em coluna separada, os **decimais**. 
No spec, `tamanho` = largura em bytes (posFim-posIni+1); quando há decimais implícitos, os atributos `digitos` e `decimais` são preenchidos. 
Ex.: Valor do Pagamento em Segmento A ocupa 15 bytes = 13 dígitos + 2 decimais.
