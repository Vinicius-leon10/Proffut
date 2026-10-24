"""Consulta no Wikidata (CC0) os jogadores ligados hoje a clubes brasileiros: nome, nome completo,
nascimento, posição e país.

    python tools/elencos/wikidata.py <pasta de saída>
"""

import gzip
import json
import os
import sys
import urllib.parse
import urllib.request

saida = sys.argv[1]
os.makedirs(saida, exist_ok=True)

CONSULTA = """
SELECT ?jogador ?jogadorLabel ?nomeCompleto ?nascimento ?posicao ?posicaoLabel ?clube ?clubeLabel ?inicio ?paisLabel WHERE {
  ?clube wdt:P31 wd:Q476028 ; wdt:P17 wd:Q155 .
  ?jogador p:P54 ?vinculo .
  ?vinculo ps:P54 ?clube .
  FILTER NOT EXISTS { ?vinculo pq:P582 [] }
  OPTIONAL { ?vinculo pq:P580 ?inicio }
  ?jogador wdt:P569 ?nascimento .
  FILTER (?nascimento >= "1984-01-01T00:00:00Z"^^xsd:dateTime)
  OPTIONAL { ?jogador wdt:P1477 ?nomeCompleto }
  OPTIONAL { ?jogador wdt:P413 ?posicao }
  OPTIONAL { ?jogador wdt:P1532 ?pais }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}
"""

url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": CONSULTA, "format": "json"})
pedido = urllib.request.Request(
    url,
    headers={
        "User-Agent": "Proffut/0.1 (jogo pessoal; https://github.com/Vinicius-leon10/Proffut)",
        "Accept": "application/sparql-results+json",
    },
)
with urllib.request.urlopen(pedido, timeout=180) as resposta:
    dados = resposta.read()

with gzip.open(os.path.join(saida, "wikidata-jogadores.json.gz"), "wb") as f:
    f.write(dados)
print(f"Wikidata: {len(json.loads(dados)['results']['bindings'])} linhas")
