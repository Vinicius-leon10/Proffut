"""Gera docs/TIMES_NOVOS.md: a lista dos times novos (nov/2026) que ainda não têm escudo, para o dono do jogo mandar os
escudos. Roda depois de tools/times/montar.ts:

    python3 tools/times/lista.py
"""

import collections
import json
import os

NOMES_UF = {"AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas", "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal",
            "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
            "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná", "PE": "Pernambuco", "PI": "Piauí",
            "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima",
            "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"}
PAISES = {"AR": "Argentina", "BO": "Bolívia", "CL": "Chile", "CO": "Colômbia", "EC": "Equador", "PY": "Paraguai", "PE": "Peru",
          "UY": "Uruguai", "VE": "Venezuela"}

escudos = {f[:-4] for f in os.listdir("public/escudos") if f.endswith(".png")}
estaduais = [c for c in json.load(open("data/brasil-2026/clubes-estaduais.json", encoding="utf-8"))["clubes"] if c["id"] not in escudos]
exterior = [c for c in json.load(open("data/america-do-sul-2026/clubes.json", encoding="utf-8"))["clubes"] if c["id"] not in escudos]


def tabela(clubes):
    linhas = ["| Clube | Cidade | Arquivo do escudo |", "|---|---|---|"]
    linhas += [f"| {c['nome']} | {c['cidade']} | `{c['id']}.png` |" for c in sorted(clubes, key=lambda c: c["nome"])]
    return linhas + [""]


linhas = ["# Times novos (nov/2026)", "",
          "Os times que entraram no jogo em nov/2026 e ainda não têm escudo: os clubes brasileiros que só jogam o estadual e a",
          "primeira divisão de 2026 dos outros 9 países da Conmebol. Os da Série D já têm (estavam na prancha de escudos).", "",
          "Para cada um: o nome no jogo, a cidade e o arquivo do escudo (`public/escudos/<arquivo>`). Enquanto não houver",
          "imagem, o jogo desenha um escudo com as cores e a sigla do clube. Lista gerada por `tools/times/lista.py`.", "",
          f"Total: {len(estaduais)} clubes brasileiros só do estadual e {len(exterior)} clubes de fora ({len(estaduais) + len(exterior)} escudos).", "",
          "## Brasil: clubes que só jogam o estadual", ""]
por_uf = collections.defaultdict(list)
for c in estaduais:
    por_uf[c["estado"]].append(c)
for uf in sorted(por_uf, key=lambda u: NOMES_UF[u]):
    linhas += [f"### {NOMES_UF[uf]} ({uf})", ""] + tabela(por_uf[uf])
linhas += ["## Outros países da Conmebol: primeira divisão de 2026", ""]
por_pais = collections.defaultdict(list)
for c in exterior:
    por_pais[c["pais"]].append(c)
for p in sorted(por_pais, key=lambda x: PAISES[x]):
    linhas += [f"### {PAISES[p]} ({len(por_pais[p])} clubes)", ""] + tabela(por_pais[p])
os.makedirs("docs", exist_ok=True)
with open("docs/TIMES_NOVOS.md", "w", encoding="utf-8") as f:
    f.write("\n".join(linhas))
print(f"docs/TIMES_NOVOS.md: {len(estaduais)} + {len(exterior)} clubes")
