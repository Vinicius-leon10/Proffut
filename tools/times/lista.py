"""Gera docs/TIMES_NOVOS.md: a lista dos times do jogo que ainda não têm escudo (de qualquer série ou país), para o dono
do jogo mandar os escudos. Roda depois de tools/times/montar.ts:

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
# Concacaf (nov/2026): os nomes de tools/times/sementes-america.json.
PAISES.update({k: v["nome"] for k, v in json.load(open("tools/times/sementes-america.json", encoding="utf-8"))["paises"].items()})

escudos = {f[:-4] for f in os.listdir("public/escudos") if f.endswith(".png")}
estaduais = [c for arquivo in ["clubes.json", "serie-d-reserva.json", "clubes-estaduais.json"]
             for c in json.load(open(f"data/brasil-2026/{arquivo}", encoding="utf-8"))["clubes"] if c["id"] not in escudos]
exterior = [c for c in json.load(open("data/america-do-sul-2026/clubes.json", encoding="utf-8"))["clubes"] if c["id"] not in escudos]


def tabela(clubes):
    linhas = ["| Clube | Cidade | Arquivo do escudo |", "|---|---|---|"]
    linhas += [f"| {c['nome']} | {c['cidade']} | `{c['id']}.png` |" for c in sorted(clubes, key=lambda c: c["nome"])]
    return linhas + [""]


linhas = ["# Escudos que faltam", "",
          "Os times do jogo que ainda não têm escudo. Para cada um: o nome no jogo, a cidade e o arquivo do escudo",
          "(`public/escudos/<arquivo>`: PNG, de preferência com fundo transparente). Enquanto não houver imagem, o jogo desenha",
          "um escudo com as cores e a sigla do clube. Lista gerada por `tools/times/lista.py`.", "",
          "Histórico: os escudos dos 276 times novos chegaram em nov/2026 e, com a correção das listas dos campeonatos, os",
          "do Real Oruro e do Anzoátegui (a fonte de cada um está em `ESCUDOS_TIMES_NOVOS_FONTES.csv`). Depois entrou a",
          "segunda divisão dos 9 países (o Deportes Quindío e o Yaracuyanos, que já tinham escudo, voltaram nela) e os escudos",
          "dela chegaram (pacote escudos-novos-148.zip). Depois entraram a Concacaf (México, EUA, Canadá, América Central e",
          "Caribe) e as 3ª divisões; 202 dos 429 escudos chegaram (pacotes parciais escudos-novos-429 e escudos-lote1-pronto, nov/2026; 10 do lote 1\n"
          "vieram errados e continuam aqui: escudo de outro clube, faixa ou anúncio com texto, miniatura, branco sobre transparente ou com foto de fundo). Quando a lista de um campeonato muda, os clubes que entram aparecem aqui.", "",
          (f"Total: {len(estaduais) + len(exterior)} escudos ({len(estaduais)} de clubes brasileiros e {len(exterior)} de fora)."
           if estaduais or exterior else "Todos os clubes do jogo têm escudo."), ""]
if estaduais:
    linhas += ["## Brasil", ""]
por_uf = collections.defaultdict(list)
for c in estaduais:
    por_uf[c["estado"]].append(c)
for uf in sorted(por_uf, key=lambda u: NOMES_UF[u]):
    linhas += [f"### {NOMES_UF[uf]} ({uf})", ""] + tabela(por_uf[uf])
def nivel(c):
    liga = c.get("liga") or c["pais"]
    return int(liga[2:] or 1)


for n in sorted({nivel(c) for c in exterior}):
    lista = [c for c in exterior if nivel(c) == n]
    linhas += [f"## Outros países da América: {n}ª divisão de 2026", ""]
    por_pais = collections.defaultdict(list)
    for c in lista:
        por_pais[c["pais"]].append(c)
    for p in sorted(por_pais, key=lambda x: PAISES[x]):
        n = len(por_pais[p])
        linhas += [f"### {PAISES[p]} ({n} {'clube' if n == 1 else 'clubes'})", ""] + tabela(por_pais[p])
os.makedirs("docs", exist_ok=True)
with open("docs/TIMES_NOVOS.md", "w", encoding="utf-8") as f:
    f.write("\n".join(linhas))
print(f"docs/TIMES_NOVOS.md: {len(estaduais)} + {len(exterior)} clubes")
