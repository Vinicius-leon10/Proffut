"""TESTE: procura no Wikimedia Commons imagens de camisa de uma lista de clubes e baixa as candidatas, para um humano
conferir numa prancha. Não escolhe nada sozinho e não entra no jogo.

    python tools/camisas/buscar.py tools/camisas/teste.json <pasta de saída>

Roda no GitHub (workflow elencos.yml, fase "camisas"): a rede do ambiente de desenvolvimento não alcança o Commons.
Grava <pasta>/<id>/NN.<ext> (miniatura de 600 px) e candidatas.json (título, página, autor e licença de cada imagem).
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "times"))
from wikipedia import AGENTE, pedir  # noqa: E402

COMMONS = "https://commons.wikimedia.org/w/api.php"
CONSULTAS = ["{nome} 2025-26 home kit", "{nome} home shirt 2025", "{nome} football shirt", "{nome} kit body 2025"]
NAO = re.compile(r"logo|crest|badge|stadium|map|flag|manager|player|squad|training|\bvs\b|v\.|match", re.I)


def buscar(consulta):
    params = {"action": "query", "format": "json", "formatversion": "2", "generator": "search", "gsrsearch": consulta,
              "gsrnamespace": "6", "gsrlimit": "8", "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime",
              "iiurlwidth": "600"}
    r = pedir(COMMONS + "?" + urllib.parse.urlencode(params))
    time.sleep(0.3)
    return (r or {}).get("query", {}).get("pages", [])


def baixar(url, destino):
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
            with urllib.request.urlopen(req, timeout=60) as r, open(destino, "wb") as f:
                f.write(r.read())
            return True
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(3)
    return False


def main():
    clubes = json.load(open(sys.argv[1], encoding="utf-8"))["clubes"]
    saida = sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    resultado = {}
    for c in clubes:
        vistas, lista = set(), []
        for modelo in CONSULTAS:
            for pg in buscar(modelo.format(nome=c["nome"])):
                titulo = pg.get("title", "")
                info = (pg.get("imageinfo") or [{}])[0]
                if titulo in vistas or not info or NAO.search(titulo):
                    continue
                if not info.get("mime", "").startswith("image/"):
                    continue
                vistas.add(titulo)
                meta = info.get("extmetadata", {})
                lista.append({"titulo": titulo, "pagina": info.get("descriptionurl"), "url": info.get("thumburl") or info.get("url"),
                              "largura": info.get("width"), "altura": info.get("height"),
                              "licenca": meta.get("LicenseShortName", {}).get("value"),
                              "autor": re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", ""))[:80]})
        pasta = os.path.join(saida, c["id"])
        os.makedirs(pasta, exist_ok=True)
        for n, item in enumerate(lista[:10], 1):
            ext = os.path.splitext(urllib.parse.urlparse(item["url"]).path)[1] or ".png"
            item["arquivo"] = f"{c['id']}/{n:02d}{ext}" if baixar(item["url"], os.path.join(pasta, f"{n:02d}{ext}")) else None
        resultado[c["id"]] = {"nome": c["nome"], "candidatas": lista[:10]}
        print(f"{c['id']}: {len(lista)} candidatas", flush=True)
    json.dump(resultado, open(os.path.join(saida, "candidatas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sum(len(v['candidatas']) for v in resultado.values())} imagens de {len(clubes)} clubes")


if __name__ == "__main__":
    main()
