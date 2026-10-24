# Lê as fichas de clubes do remake denisvick-dev/brasfoot (MIT) sem executar o código dele.
# Uso: python3 -I extrai_clubes.py <brasfoot>/game/clubes.py clubes_fonte.json
import ast, json, sys
src = open(sys.argv[1], encoding="utf-8").read()
tree = ast.parse(src)
campos = ["nome","sigla","cidade","estado","emoji","cor1","cor2","f_min","f_max","financas","torcida","reputacao","divisao","estadio","capacidade","fundacao","rival"]
out = []
for node in ast.walk(tree):
    if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "Clube":
        d = {}
        for i, a in enumerate(node.args):
            d[campos[i]] = ast.literal_eval(a)
        for kw in node.keywords:
            d[kw.arg] = ast.literal_eval(kw.value)
        out.append(d)
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out))
