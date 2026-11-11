"""Baixa da Wikipédia em inglês a página de cada seleção de uma lista (a seção "Current squad" tem a última
convocação). Só as páginas: quem lê os convocados é tools/selecoes/montar.ts.

    python tools/selecoes/baixar.py tools/selecoes/sementes-europa.json <pasta de saída>

Roda no GitHub (workflow elencos.yml, fase "selecoes-europa"): a rede do ambiente de desenvolvimento não alcança a
Wikipédia. Grava selecoes.json.gz (a página achada de cada seleção) e paginas.json.gz (o texto delas).
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "times"))
from wikipedia import buscar, gravar, texto_da_pagina  # noqa: E402


def main():
    sementes = json.load(open(sys.argv[1], encoding="utf-8"))["sementes"]
    saida = sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    paginas, escolhidas = {}, []
    for s in sementes:
        achada = None
        for titulo in s["titulos"]:
            final, texto = texto_da_pagina("en", titulo)
            if texto and "Current squad" in texto:
                achada = (final, texto)
                break
        if not achada:
            for titulo in buscar("en", s["titulos"][0]):
                if "national" not in titulo.lower() or "women" in titulo.lower() or "under" in titulo.lower():
                    continue
                final, texto = texto_da_pagina("en", titulo)
                if texto and "Current squad" in texto:
                    achada = (final, texto)
                    break
        if achada:
            paginas[f"en:{achada[0]}"] = achada[1]
        escolhidas.append({"selecao": s["selecao"], "lang": "en", "pagina": achada[0] if achada else None})
        print(f"{s['selecao']}: {achada[0] if achada else 'NÃO ACHOU'}", flush=True)
    gravar(saida, "selecoes.json.gz", escolhidas)
    gravar(saida, "paginas.json.gz", paginas)
    print(f"{len(paginas)} páginas de {len(sementes)} seleções")


if __name__ == "__main__":
    main()
