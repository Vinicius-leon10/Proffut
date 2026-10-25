"""Baixa e lê as súmulas da CBF de um ano (Séries A, B e C) com o programa do projeto
BrazilianFootball/data (licença MIT): https://github.com/BrazilianFootball/data

Roda no GitHub Actions (a rede do ambiente de desenvolvimento não alcança o site da CBF):

    python tools/elencos/sumulas_cbf.py <pasta do BrazilianFootball/data> <ano> <pasta de saída>

Grava em <saída>/sumulas/ os jogos lidos (<Série>_<ano>_games.json.gz), no formato do projeto.
"""

import glob
import gzip
import multiprocessing
import os
import shutil
import sys

import requests
import urllib3

COMPETICOES = [("Serie_A", "142"), ("Serie_B", "242"), ("Serie_C", "342")]
# O robô se apresenta como o que é. Se o site recusar, não insiste.
IDENTIFICACAO = {"User-Agent": "Proffut/0.1 (jogo pessoal; https://github.com/Vinicius-leon10/Proffut)"}
urllib3.disable_warnings()


def baixar_pdf(url):
    """Download do projeto com tempo limite; resposta que não é PDF conta como jogo inexistente."""
    # verify=False como no projeto original (a cadeia de certificados do site da CBF já deu problema).
    resposta = requests.get(url, headers=IDENTIFICACAO, timeout=30, verify=False)
    if resposta.content[:4] == b"%PDF":
        return resposta.content
    if resposta.status_code != 404:
        print(f"{url}: HTTP {resposta.status_code}", file=sys.stderr, flush=True)
    return b"File or directory not found"


def site_entrega_sumulas(ano):
    """Pede a súmula do primeiro jogo da Série A e mostra no log o que o site respondeu."""
    url = f"https://conteudo.cbf.com.br/sumulas/{ano}/1421se.pdf"
    try:
        resposta = requests.get(url, headers=IDENTIFICACAO, timeout=30, verify=False)
    except requests.RequestException as erro:
        print(f"O site da CBF não respondeu ({url}): {erro}", flush=True)
        return False
    print(f"{url}: HTTP {resposta.status_code}, {resposta.headers.get('content-type')}, {len(resposta.content)} bytes", flush=True)
    if resposta.content[:4] != b"%PDF":
        print(f"Início da resposta: {resposta.content[:200]!r}", flush=True)
        return False
    return True


def main():
    repo, ano, saida = sys.argv[1], int(sys.argv[2]), os.path.abspath(sys.argv[3])
    destino = os.path.join(saida, "sumulas")
    os.makedirs(destino, exist_ok=True)

    if not site_entrega_sumulas(ano):
        print("Nenhuma súmula baixada: o site da CBF não entregou o PDF (motivo acima).")
        return

    sys.path.insert(0, os.path.join(repo, "scripts"))
    os.chdir(os.path.join(repo, "results"))
    import scrape as projeto
    from scrape import catch_squads, extract, make_directories, scrape

    projeto.get_pdf = baixar_pdf
    make_directories(COMPETICOES, ano, ano)
    for competicao in COMPETICOES:
        # Cada chamada baixa súmulas por até 60 s; repete enquanto aparecerem novas.
        antes = -1
        for _ in range(40):
            arquivos = glob.glob(f"./raw/{competicao[0]}/{ano}/CSVs/*.csv")
            if len(arquivos) == antes:
                break
            antes = len(arquivos)
            scrape([competicao], ano, ano, arquivos, max_time=60, cleaning=False)
        total = len(glob.glob(f"./raw/{competicao[0]}/{ano}/CSVs/*.csv"))
        print(f"{competicao[0]} {ano}: {total} súmulas baixadas")

    falhas = extract(COMPETICOES, ano, ano, cleaning=False)
    print(f"Súmulas que não deu para ler: {falhas}")
    catch_squads(COMPETICOES, ano, ano, cleaning=False)

    for arquivo in glob.glob(f"./processed/*_{ano}_games.json"):
        with open(arquivo, "rb") as origem, gzip.open(os.path.join(destino, os.path.basename(arquivo) + ".gz"), "wb") as copia:
            shutil.copyfileobj(origem, copia)
    if os.path.exists("./infos_errors_extract.csv"):
        shutil.copy("./infos_errors_extract.csv", os.path.join(destino, f"erros_{ano}.csv"))


if __name__ == "__main__":
    # O programa do projeto baixa cada lote num processo filho criado por fork.
    multiprocessing.set_start_method("fork", force=True)
    main()
