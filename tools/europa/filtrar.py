"""Guarda da base livre (CC0) do projeto transfermarkt-datasets (https://github.com/dcaribou/transfermarkt-datasets)
os clubes e jogadores das 7 ligas da Europa do jogo e os jogos das copas europeias (para saber quem as joga).

    python tools/europa/filtrar.py <pasta com players, clubs, competitions e games .csv.gz> <pasta de saída>
"""

import collections
import csv
import gzip
import os
import sys

entrada, saida = sys.argv[1], sys.argv[2]
os.makedirs(saida, exist_ok=True)

# Primeiras divisões: Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Holanda.
LIGAS = {"GB1", "ES1", "IT1", "L1", "FR1", "PO1", "NL1"}
# Copas da UEFA: Liga dos Campeões, Liga Europa, Conference, Supercopa e as fases prévias.
COPAS = {"CL", "EL", "UCOL", "USC", "CLQ", "ELQ", "ECLQ"}


def ler(nome):
    with gzip.open(os.path.join(entrada, nome + ".csv.gz"), "rt", encoding="utf-8") as f:
        leitor = csv.DictReader(f)
        return leitor.fieldnames or [], list(leitor)


def gravar(nome, campos, linhas):
    with gzip.open(os.path.join(saida, nome + ".csv.gz"), "wt", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(linhas)


campos, comps = ler("competitions")
gravar("competicoes", campos, comps)
print("Competições:", ", ".join(sorted(c["competition_id"] for c in comps)))

campos, clubes = ler("clubs")
nossos = [c for c in clubes if c.get("domestic_competition_id") in LIGAS]
ids = {c["club_id"] for c in nossos}
print("Clubes por liga:", dict(collections.Counter(c["domestic_competition_id"] for c in nossos)))

campos_j, jogadores = ler("players")
deles = [j for j in jogadores if j.get("current_club_id") in ids]
print(f"Jogadores: {len(deles)}")

campos_g, jogos = ler("games")
copas = [g for g in jogos if g.get("competition_id") in COPAS and g.get("season", "") >= "2024"]
ligas = [g for g in jogos if g.get("competition_id") in LIGAS and g.get("season", "") >= "2025"]
print("Jogos das copas por temporada:", dict(collections.Counter((g["competition_id"], g["season"]) for g in copas)))
# Clubes das copas que não estão nas 7 ligas (para o jogo saber quem são).
fora = {g[k] for g in copas for k in ("home_club_id", "away_club_id")} - ids
gravar("clubes", campos, nossos + [c for c in clubes if c["club_id"] in fora])
gravar("jogadores", campos_j, deles)
gravar("jogos-copas", campos_g, copas)
gravar("jogos-ligas", campos_g, ligas)
print(f"Clubes de fora das 7 ligas nas copas: {len(fora)}")
