"""Baixa da Wikipédia em inglês as páginas das copas da UEFA de uma temporada (Liga dos Campeões, Liga Europa e
Conference League) com as tabelas de vagas por país ("Association team allocation" / "Distribution"), as fases prévias
e o calendário. Só as páginas: quem lê as vagas é o montador (a fazer, tools/uefa/montar.ts).

    python tools/uefa/baixar.py <pasta de saída> [temporada, ex.: 2026-27]

Roda no GitHub (workflow elencos.yml, fase "uefa"): a rede do ambiente de desenvolvimento não alcança a Wikipédia.
Grava paginas.json.gz (título final -> wikitext) e achadas.json.gz (o que foi pedido e o que foi achado).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "times"))
from wikipedia import buscar, gravar, texto_da_pagina  # noqa: E402

# {t} = temporada com travessão ("2026–27"). Cada item: título pedido e uma palavra que a página certa tem.
PAGINAS = [
    ("{t} UEFA Champions League", "Association team allocation"),
    ("{t} UEFA Europa League", "Association team allocation"),
    ("{t} UEFA Conference League", "Association team allocation"),
    ("{t} UEFA Champions League qualifying phase and play-off round", "qualifying"),
    ("{t} UEFA Europa League qualifying phase and play-off round", "qualifying"),
    ("{t} UEFA Conference League qualifying phase and play-off round", "qualifying"),
    ("{t} UEFA Champions League league phase", "league phase"),
    ("{t} UEFA Champions League knockout phase", "knockout"),
    ("UEFA coefficient", "Access list"),
    ("UEFA Champions League", "qualification"),
]


def main():
    saida = sys.argv[1]
    temporada = sys.argv[2] if len(sys.argv) > 2 else "2026-27"
    t = temporada.replace("-", "–")
    os.makedirs(saida, exist_ok=True)
    paginas, achadas = {}, []
    for modelo, palavra in PAGINAS:
        pedido = modelo.format(t=t)
        final, texto = texto_da_pagina("en", pedido)
        if not texto:
            for titulo in buscar("en", pedido)[:3]:
                final, texto = texto_da_pagina("en", titulo)
                if texto and t in (final or ""):
                    break
                final, texto = None, None
        if texto:
            paginas[f"en:{final}"] = texto
        achadas.append({"pedido": pedido, "pagina": final, "tamanho": len(texto or ""),
                        "tem_a_palavra": bool(texto and palavra.lower() in texto.lower())})
        print(f"{pedido}: {final or 'NÃO ACHOU'} ({len(texto or '')} caracteres)", flush=True)
    gravar(saida, "paginas.json.gz", paginas)
    gravar(saida, "achadas.json.gz", achadas)
    print(f"{len(paginas)} páginas de {len(PAGINAS)} pedidas")


if __name__ == "__main__":
    main()
