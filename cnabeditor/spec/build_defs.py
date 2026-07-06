#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_defs.py — Gera o literal JS `const S240 = { ... }` a partir de
spec/cnab240-spec.json, para injetar no editor CNAB240 (index.html).

Regra de mapeamento de cada campo (contrato da UI):
  p = [posIni, posFim]
  t = 'N' se tipo=="Num", 'A' se "Alfa"; se null/vazio -> 'A'
  n = nome curto (1a parte do `nome` quebrado no 1o run de 2+ espacos, espacos colapsados)
  d = descricao || (restante do nome apos a quebra) || nome inteiro
  v = valores do dominio quando aplicavel; senao []
  req = obrigatorio===true
  dom = dominio || null

SubLayouts (N1..N8, W1, variantes de impressao do S) sao emitidos como
segmentos proprios: os campos-base FORA da faixa coberta pelo subLayout sao
mantidos e os campos do subLayout sao inseridos, produzindo cobertura 1..240.
A chave do subLayout = id_base + '__' + slug(label).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC_PATH = os.path.join(HERE, 'cnab240-spec.json')


def load_spec():
    with open(SPEC_PATH, encoding='utf-8') as fh:
        return json.load(fh)


def collapse_ws(s):
    return re.sub(r'\s+', ' ', (s or '').strip())


def split_name(nome):
    """Divide `nome` no primeiro run de 2+ espacos.
    Retorna (nome_curto_colapsado, resto_colapsado)."""
    nome = nome or ''
    m = re.search(r'\s{2,}', nome)
    if m:
        short = collapse_ws(nome[:m.start()])
        rest = collapse_ws(nome[m.end():])
    else:
        short = collapse_ws(nome)
        rest = ''
    return short, rest


def domain_values(domains, dom):
    """Retorna lista [[code, descricao], ...] ou [] conforme regra."""
    if not dom:
        return []
    d = domains.get(dom)
    if not d:
        return []
    valores = d.get('valores') or []
    if not valores:
        return []
    if d.get('tipo') == 'formato':
        return []
    if d.get('external') is True:
        return []
    out = []
    for x in valores:
        out.append([x.get('code'), x.get('descricao')])
    return out


def map_field(f, domains):
    tipo = f.get('tipo')
    t = 'N' if tipo == 'Num' else 'A'  # null/vazio/Alfa -> 'A'
    short, rest = split_name(f.get('nome', ''))
    desc = f.get('descricao')
    if desc:
        d = collapse_ws(desc)
    elif rest:
        d = rest
    else:
        d = collapse_ws(f.get('nome', ''))
    dom = f.get('dominio') or None
    v = domain_values(domains, dom)
    obj = {
        'p': [f.get('posIni'), f.get('posFim')],
        'n': short,
        't': t,
        'd': d,
        'v': v,
        'req': (f.get('obrigatorio') is True),
        'dom': dom,
    }
    return obj


def slug(label):
    s = (label or '').strip().lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def merge_sublayout(base_fields, sl_fields):
    """Mantem os campos-base fora da faixa do subLayout e insere os campos do
    subLayout, ordenados por posIni."""
    lo = min(f['posIni'] for f in sl_fields)
    hi = max(f['posFim'] for f in sl_fields)
    keep = [f for f in base_fields if f['posFim'] < lo or f['posIni'] > hi]
    merged = sorted(keep + list(sl_fields), key=lambda f: f['posIni'])
    return merged


def build_s240(spec):
    domains = spec['domains']
    out = {}  # ordered dict (py3.7+)
    for seg in spec['segments']:
        sid = seg['id']
        base_fields = seg.get('fields') or []
        base_entry = {
            'label': seg.get('nomeExibicao') or sid,
            'produto': seg.get('produto'),
            'tipoReg': seg.get('tipoRegistro'),
            'fields': [map_field(f, domains) for f in base_fields],
        }
        out[sid] = base_entry

        for sl in (seg.get('subLayouts') or []):
            sl_fields = sl.get('fields') or []
            if not sl_fields:
                continue
            label = sl.get('label') or sl.get('titulo') or 'sub'
            key = sid + '__' + slug(label)
            merged = merge_sublayout(base_fields, sl_fields) if base_fields else list(sl_fields)
            entry = {
                'label': (seg.get('nomeExibicao') or sid) + ' — ' + collapse_ws(sl.get('titulo') or label),
                'produto': seg.get('produto'),
                'tipoReg': seg.get('tipoRegistro'),
                'fields': [map_field(f, domains) for f in merged],
            }
            out[key] = entry
    return out


def js_literal(s240):
    """Emite `const S240 = {...};` como JS/JSON valido (JSON e subconjunto de JS)."""
    body = json.dumps(s240, ensure_ascii=False, indent=2)
    return 'const S240 = ' + body + ';\n'


def main():
    spec = load_spec()
    s240 = build_s240(spec)
    literal = js_literal(s240)
    # emite para stdout e tambem grava um arquivo auxiliar
    out_path = os.path.join(HERE, 's240.generated.js')
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write(literal)
    sys.stderr.write('Segmentos emitidos: %d -> %s\n' % (len(s240), out_path))
    sys.stdout.write(literal)


if __name__ == '__main__':
    main()
