"""Guarda da base livre (CC0) do projeto transfermarkt-datasets os clubes e jogadores das ligas da América do Sul
que ela cobre (https://github.com/dcaribou/transfermarkt-datasets).

    python tools/times/filtrar_transfermarkt.py players.csv.gz clubs.csv.gz <pasta de saída>

Imprime as ligas que a base tem, para saber quais países ela cobre.
"""

import collections
import csv
import gzip
import os
import sys

jogadores, clubes, saida = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(saida, exist_ok=True)

# Códigos das primeiras divisões da Conmebol no Transfermarkt (os que a base não tiver ficam de fora sozinhos).
LIGAS = {"ARG1", "AR1N", "COL1", "COLP", "CLPD", "CL1", "URU1", "UR1", "PR1A", "PAR1", "TDeA", "PER1", "EL1S", "ECU1",
         "BO1A", "BOL1", "VZ1L", "VEN1"}

with gzip.open(clubes, "rt", encoding="utf-8") as f:
    leitor = csv.DictReader(f)
    campos_clube = leitor.fieldnames or []
    todos_clubes = list(leitor)
contagem = collections.Counter(c.get("domestic_competition_id", "") for c in todos_clubes)
print("Ligas na base:", ", ".join(f"{k or '?'} {n}" for k, n in sorted(contagem.items())))
nossos = [c for c in todos_clubes if c.get("domestic_competition_id") in LIGAS]
ids = {c["club_id"] for c in nossos}

with gzip.open(jogadores, "rt", encoding="utf-8") as f:
    leitor = csv.DictReader(f)
    campos_jogador = leitor.fieldnames or []
    linhas = [l for l in leitor if l.get("current_club_id") in ids or l.get("current_club_domestic_competition_id") in LIGAS]

with gzip.open(os.path.join(saida, "transfermarkt-america-clubes.csv.gz"), "wt", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=campos_clube)
    w.writeheader()
    w.writerows(nossos)
with gzip.open(os.path.join(saida, "transfermarkt-america-jogadores.csv.gz"), "wt", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=campos_jogador)
    w.writeheader()
    w.writerows(linhas)
print(f"Transfermarkt (América do Sul): {len(nossos)} clubes, {len(linhas)} jogadores")
