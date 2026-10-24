"""Guarda só a parte brasileira da base livre (CC0) do projeto transfermarkt-datasets:
https://github.com/dcaribou/transfermarkt-datasets

    python tools/elencos/filtrar_transfermarkt.py players.csv.gz clubs.csv.gz <pasta de saída>

Fica com quem joga no Brasileirão ou é brasileiro (posição, pé, nascimento e valor de mercado).
"""

import csv
import gzip
import os
import sys

jogadores, clubes, saida = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(saida, exist_ok=True)

CAMPOS = [
    "player_id", "name", "first_name", "last_name", "date_of_birth", "position", "sub_position", "foot",
    "height_in_cm", "country_of_citizenship", "country_of_birth", "current_club_id", "current_club_name",
    "current_club_domestic_competition_id", "market_value_in_eur", "highest_market_value_in_eur", "last_season",
]

with gzip.open(jogadores, "rt", encoding="utf-8") as f:
    linhas = [
        {c: linha.get(c, "") for c in CAMPOS}
        for linha in csv.DictReader(f)
        if linha.get("current_club_domestic_competition_id") == "BRA1"
        or "Brazil" in (linha.get("country_of_citizenship") or "")
        or linha.get("country_of_birth") == "Brazil"
    ]
with gzip.open(os.path.join(saida, "transfermarkt-jogadores.csv.gz"), "wt", encoding="utf-8", newline="") as f:
    escritor = csv.DictWriter(f, fieldnames=CAMPOS)
    escritor.writeheader()
    escritor.writerows(linhas)

with gzip.open(clubes, "rt", encoding="utf-8") as f:
    leitor = csv.DictReader(f)
    campos = leitor.fieldnames or []
    brasileiros = [linha for linha in leitor if linha.get("domestic_competition_id") == "BRA1"]
with gzip.open(os.path.join(saida, "transfermarkt-clubes.csv.gz"), "wt", encoding="utf-8", newline="") as f:
    escritor = csv.DictWriter(f, fieldnames=campos)
    escritor.writeheader()
    escritor.writerows(brasileiros)

print(f"Transfermarkt: {len(linhas)} jogadores, {len(brasileiros)} clubes")
