import json, sys, unicodedata, re
# Uso: python3 -I extrai_clubes.py <brasfoot>/game/clubes.py clubes_fonte.json
#      python3 -I gera_clubes.py clubes_fonte.json data/brasil-2026
src, destino = sys.argv[1], sys.argv[2]
todos = json.load(open(src, encoding="utf-8"))

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

# Correções conferidas manualmente (o resto vem da fonte e está marcado para revisão)
CORRECOES = {
    "Bragantino": {"nome": "Red Bull Bragantino", "estadio": "Nabi Abi Chedid"},
    "Mirassol": {"estadio": "José Maria de Campos Maia (Maião)"},
    "Avaí": {"cor2": "#FFFFFF"},
}
for c in todos:
    c.update(CORRECOES.get(c["nome"], {}))
    c["id"] = slug(c["nome"])

siglas = [c["sigla"] for c in todos]
dup = {s for s in siglas if siglas.count(s) > 1}
assert not dup, f"siglas repetidas: {dup}"
ids = [c["id"] for c in todos]
assert len(set(ids)) == len(ids), "ids repetidos"
por_sigla = {c["sigla"]: c["id"] for c in todos}
por_sigla["STC"] = por_sigla["STA"]  # a fonte usa STC e STA para o Santa Cruz

def ficha(c):
    return {
        "id": c["id"],
        "nome": c["nome"],
        "sigla": c["sigla"],
        "cidade": c["cidade"],
        "estado": c["estado"],
        "serie": c["divisao"],
        "cores": {"primaria": c["cor1"], "secundaria": c["cor2"]},
        "estadio": {"nome": c["estadio"], "capacidade": c["capacidade"]},
        "fundacao": c["fundacao"],
        "rival": por_sigla.get(c.get("rival")),
        "torcida": c["torcida"],
        "reputacao": c["reputacao"],
        "forcaElenco": {"min": c["f_min"], "max": c["f_max"]},
        "caixaInicial": c["financas"],
    }

principais = [ficha(c) for c in todos if c["divisao"] in "ABC"]
reserva = [ficha(c) for c in todos if c["divisao"] == "D"]
for c in reserva:
    del c["serie"]
assert [sum(1 for c in principais if c["serie"] == s) for s in "ABC"] == [20, 20, 20]

meta = {
    "temporada": 2026,
    "geradoDe": "denisvick-dev/brasfoot (MIT), game/clubes.py",
}
json.dump({**meta, "clubes": principais}, open(f"{destino}/clubes.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump({**meta, "descricao": "Clubes da Série D 2026. Não são simulados: servem de reserva para o acesso à Série C.", "clubes": reserva},
          open(f"{destino}/serie-d-reserva.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(principais), len(reserva))
print("rivais sem par no banco:", sorted({c.get("rival") for c in todos if c.get("rival") and c["rival"] not in por_sigla}))
