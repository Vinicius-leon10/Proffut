"""Baixa da Wikipédia e do Wikidata o que o jogo precisa para os times novos: a Série D de 2026, os 27
estaduais de 2026 e a primeira divisão de 2026 dos outros 9 países da Conmebol.

    python tools/times/wikipedia.py tools/times/sementes.json <pasta de saída>

Roda no GitHub (workflow elencos.yml, fase "times"): a rede do ambiente de desenvolvimento não alcança esses sites.
Só usa a biblioteca padrão do Python. Grava (tudo em gzip):

  sementes.json.gz  título escolhido de cada página de partida, com os candidatos da busca
  paginas.json.gz   texto (wikitext) das páginas de partida e das páginas dos clubes
  clubes.json.gz    dados do Wikidata de cada clube ligado às páginas de partida (país, cidade, estádio, cores...)
  jogadores.json.gz dados do Wikidata de quem aparece na seção do elenco de cada clube (nascimento, posição...)

Quem decide quais clubes jogam cada campeonato e quem está em cada elenco é tools/times/montar.ts, lendo esses
arquivos: aqui só se junta o material, sem adivinhar nada.
"""

import gzip
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

AGENTE = "Proffut/0.1 (jogo pessoal sem fins lucrativos; https://github.com/Vinicius-leon10/Proffut)"
SPARQL = "https://query.wikidata.org/sparql"


def pedir(url, dados=None, tentativas=6):
    """GET (ou POST com `dados`) com novas tentativas e espera crescente; devolve o JSON."""
    espera = 2
    for tentativa in range(tentativas):
        try:
            corpo = urllib.parse.urlencode(dados).encode() if dados is not None else None
            pedido = urllib.request.Request(url, data=corpo, headers={
                "User-Agent": AGENTE,
                "Accept": "application/json, application/sparql-results+json",
                **({"Content-Type": "application/x-www-form-urlencoded"} if corpo else {}),
            })
            with urllib.request.urlopen(pedido, timeout=120) as resposta:
                resultado = json.loads(resposta.read().decode("utf-8"))
            if isinstance(resultado, dict) and resultado.get("error", {}).get("code") == "maxlag":
                raise RuntimeError("maxlag")
            return resultado
        except (urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError, ConnectionError) as erro:
            if tentativa == tentativas - 1:
                print(f"  falhou de vez: {url[:120]} ({erro})", flush=True)
                return None
            time.sleep(espera)
            espera = min(espera * 2, 60)
    return None


def api(lang, **parametros):
    parametros = {"format": "json", "formatversion": "2", "maxlag": "5", **parametros}
    resultado = pedir(f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(parametros))
    time.sleep(0.2)
    return resultado


def sparql(consulta):
    resultado = pedir(SPARQL, {"query": consulta, "format": "json"})
    time.sleep(1)
    return (resultado or {}).get("results", {}).get("bindings", [])


def valor(linha, campo):
    v = linha.get(campo, {}).get("value")
    return v.rsplit("/", 1)[-1] if v and v.startswith("http://www.wikidata.org/entity/") else v


def blocos(lista, tamanho):
    for i in range(0, len(lista), tamanho):
        yield lista[i:i + tamanho]


# ---- páginas ----------------------------------------------------------------------------

def buscar(lang, consulta):
    r = api(lang, action="query", list="search", srsearch=consulta, srlimit="8", srnamespace="0")
    return [s["title"] for s in (r or {}).get("query", {}).get("search", [])]


def texto_da_pagina(lang, titulo):
    """Wikitext e título final (depois dos redirecionamentos)."""
    r = api(lang, action="parse", page=titulo, prop="wikitext", redirects="1")
    if not r or "parse" not in r:
        return None, None
    return r["parse"]["title"], r["parse"]["wikitext"]


# Seções que listam os participantes (as de quem subiu ou caiu ficam de fora: citam clubes de outras divisões).
PARTICIPANTES = re.compile(r"particip|equipes|clubes|times|teams|equipos|club information|informaci[óo]n|localiza|stadia|"
                           r"est[áa]dios|personnel|grupo|group|serie [ab]\b|zona", re.I)
FORA_DOS_PARTICIPANTES = re.compile(r"relevo|changes|altas|ascens|descens|rebaix|acesso|promo|relega|cambio|entrenador|"
                                    r"managerial|[áa]rbitr|transmiss|direitos|broadcast|estat[íi]stic|statistic|goleador|"
                                    r"artilh|scorer|p[úu]blico|attendance|premia|award|campe[õo]es|champions|final", re.I)


def participantes_da_pagina(lang, titulo):
    """Seções da página e as ligações (inclusive as que vêm de predefinições) das que falam dos participantes."""
    r = api(lang, action="parse", page=titulo, prop="sections", redirects="1")
    secoes = (r or {}).get("parse", {}).get("sections", [])
    lista = []
    for sec in secoes:
        nome = re.sub(r"<[^>]+>", "", sec.get("line", ""))
        if not PARTICIPANTES.search(nome) or FORA_DOS_PARTICIPANTES.search(nome) or not str(sec.get("index", "")).isdigit():
            continue
        rl = api(lang, action="parse", page=titulo, section=sec["index"], prop="links", redirects="1")
        ligacoes_secao = [l["title"] for l in (rl or {}).get("parse", {}).get("links", []) if l.get("ns") == 0]
        lista.append({"secao": nome, "indice": sec["index"], "ligacoes": ligacoes_secao})
    return [s.get("line", "") for s in secoes], lista


ESPACOS = re.compile(r"[ _]+")
# Prefixos de outros espaços de nomes (arquivos, categorias, predefinições...) e de outras línguas.
NAO_ARTIGO = re.compile(r"^(:?[a-z]{2,3}|file|image|category|template|wikipedia|help|portal|special|ficheiro|arquivo|imagem|"
                        r"categoria|predefinição|predefinicao|ajuda|especial|archivo|imagen|plantilla|anexo|wp|wikt|commons|s|q|d|n|v|b)\s*:", re.I)


def normalizar_titulo(alvo):
    alvo = alvo.split("#", 1)[0].strip()
    alvo = ESPACOS.sub(" ", alvo).strip()
    if not alvo or NAO_ARTIGO.match(alvo):
        return None
    return alvo[0].upper() + alvo[1:]


LIGACAO = re.compile(r"\[\[([^\[\]|]+)(?:\|[^\[\]]*)?\]\]")


# {{sortname|Nome|Sobrenome}} e {{sortname|Nome|Sobrenome|Página}} ligam para "Nome Sobrenome" (ou para a página).
NOME_ORDENADO = re.compile(r"\{\{\s*sort ?name\s*\|([^{}|]*)\|([^{}|]*)(?:\|([^{}|=]*))?[^{}]*\}\}", re.I)


def ligacoes(wikitext):
    """Títulos ligados diretamente no texto (sem as predefinições de navegação, que vêm de fora)."""
    vistos, lista = set(), []
    alvos = [m.group(1) for m in LIGACAO.finditer(wikitext or "")]
    alvos += [(m.group(3) or f"{m.group(1).strip()} {m.group(2).strip()}") for m in NOME_ORDENADO.finditer(wikitext or "")]
    for alvo in alvos:
        t = normalizar_titulo(alvo)
        if t and t not in vistos:
            vistos.add(t)
            lista.append(t)
    return lista


TITULO_SECAO = re.compile(r"^(={2,5})\s*(.*?)\s*\1\s*$", re.M)
ELENCO = re.compile(r"squad|first[- ]team|players|plantel|plantilla|elenco|jogadores|jugadores", re.I)
FORA_DO_ELENCO = re.compile(r"loan|pr[ée]stamo|cedid|emprest|reserv|youth|juvenil|juniores|academ|base|former|notable|"
                            r"hist[óo]ric|retired|retirad|aposentad|[íi]dol|idol|record|women|femenin|feminin|staff|"
                            r"t[ée]cnic|coach|director|dirigent|presid|captain|capit|top scorer|goleador|artilh|"
                            r"transfer|fichaje|contrata|altas|bajas|sa[íi]das|chegadas|u-?\d\d|sub-?\d\d", re.I)


def secoes_do_elenco(wikitext):
    """Trechos das seções de elenco atual (sem emprestados, base, ex-jogadores...)."""
    texto = wikitext or ""
    titulos = list(TITULO_SECAO.finditer(texto))
    trechos = []
    for i, m in enumerate(titulos):
        nivel, nome = len(m.group(1)), re.sub(r"\[\[|\]\]|'''?|<[^>]+>", "", m.group(2))
        if not ELENCO.search(nome) or FORA_DO_ELENCO.search(nome):
            continue
        fim = len(texto)
        for seguinte in titulos[i + 1:]:
            fim = seguinte.start()
            break
        trechos.append({"secao": nome, "nivel": nivel, "texto": texto[m.end():fim]})
    return trechos


# ---- Wikidata ----------------------------------------------------------------------------

def qids_dos_titulos(lang, titulos):
    """Título → item do Wikidata (seguindo redirecionamentos)."""
    mapa = {}
    for bloco in blocos(sorted(set(titulos)), 50):
        r = api(lang, action="query", prop="pageprops", ppprop="wikibase_item", redirects="1", titles="|".join(bloco))
        q = (r or {}).get("query", {})
        final = {t: t for t in bloco}
        for n in q.get("normalized", []):
            final[n["from"]] = n["to"]
        destino = {red["from"]: red["to"] for red in q.get("redirects", [])}
        item = {p["title"]: p.get("pageprops", {}).get("wikibase_item") for p in q.get("pages", [])}
        for t in bloco:
            alvo = final.get(t, t)
            alvo = destino.get(alvo, alvo)
            if item.get(alvo):
                mapa[t] = item[alvo]
    return mapa


def valores(qids):
    return " ".join(f"wd:{q}" for q in qids)


def clubes_de_futebol(qids):
    """Quais itens são clubes de futebol (também os poliesportivos, como o Boca Juniors), com o país de cada um.
    Seleções nacionais ficam de fora."""
    achados = {}
    for bloco in blocos(sorted(set(qids)), 300):
        for l in sparql(f"""
            SELECT ?item ?pais WHERE {{
              VALUES ?item {{ {valores(bloco)} }}
              VALUES ?tipo {{ wd:Q476028 wd:Q847017 wd:Q12973014 wd:Q103229495 }}
              ?item wdt:P31/wdt:P279* ?tipo .
              FILTER NOT EXISTS {{ ?item wdt:P31/wdt:P279* wd:Q6979593 }}
              OPTIONAL {{ ?item wdt:P17 ?pais }}
            }}"""):
            achados.setdefault(valor(l, "item"), set()).add(valor(l, "pais"))
    return {q: sorted(p for p in paises if p) for q, paises in achados.items()}


def detalhes_dos_clubes(qids):
    dados = {}
    for bloco in blocos(sorted(set(qids)), 150):
        for l in sparql(f"""
            SELECT ?item ?pt ?es ?en ?curto ?fundacao ?cidadeLabel ?estadioLabel ?capacidade ?cor ?ptwiki ?eswiki ?enwiki ?links WHERE {{
              VALUES ?item {{ {valores(bloco)} }}
              OPTIONAL {{ ?item rdfs:label ?pt FILTER(LANG(?pt) = "pt") }}
              OPTIONAL {{ ?item rdfs:label ?es FILTER(LANG(?es) = "es") }}
              OPTIONAL {{ ?item rdfs:label ?en FILTER(LANG(?en) = "en") }}
              OPTIONAL {{ ?item wdt:P1813 ?curto }}
              OPTIONAL {{ ?item wdt:P571 ?fundacao }}
              OPTIONAL {{ ?item wdt:P131|wdt:P159 ?cidade }}
              OPTIONAL {{ ?item wdt:P115 ?estadio . OPTIONAL {{ ?estadio wdt:P1083 ?capacidade }} }}
              OPTIONAL {{ ?item wdt:P6364 ?corItem . ?corItem wdt:P465 ?cor }}
              OPTIONAL {{ ?ptwiki schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> }}
              OPTIONAL {{ ?eswiki schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> }}
              OPTIONAL {{ ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }}
              OPTIONAL {{ ?item wikibase:sitelinks ?links }}
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "pt,es,en". }}
            }}"""):
            q = valor(l, "item")
            d = dados.setdefault(q, {"qid": q, "curtos": [], "cidades": [], "estadios": [], "cores": []})
            for campo in ("pt", "es", "en", "fundacao", "links"):
                if valor(l, campo) and campo not in d:
                    d[campo] = valor(l, campo)
            for campo, lista in (("curto", "curtos"), ("cidadeLabel", "cidades"), ("cor", "cores")):
                v = valor(l, campo)
                if v and v not in d[lista]:
                    d[lista].append(v)
            if valor(l, "estadioLabel"):
                e = {"nome": valor(l, "estadioLabel"), "capacidade": valor(l, "capacidade")}
                if e not in d["estadios"]:
                    d["estadios"].append(e)
            for wiki in ("ptwiki", "eswiki", "enwiki"):
                v = l.get(wiki, {}).get("value")
                if v and wiki not in d:
                    d[wiki] = urllib.parse.unquote(v.rsplit("/wiki/", 1)[-1]).replace("_", " ")
    return dados


def detalhes_dos_jogadores(qids):
    dados = {}
    for bloco in blocos(sorted(set(qids)), 200):
        for l in sparql(f"""
            SELECT ?item ?pt ?es ?en ?nascimento ?posicaoLabel ?cidadania ?esportiva ?pe ?links ?clube ?inicio WHERE {{
              VALUES ?item {{ {valores(bloco)} }}
              ?item wdt:P31 wd:Q5 .
              OPTIONAL {{ ?item rdfs:label ?pt FILTER(LANG(?pt) = "pt") }}
              OPTIONAL {{ ?item rdfs:label ?es FILTER(LANG(?es) = "es") }}
              OPTIONAL {{ ?item rdfs:label ?en FILTER(LANG(?en) = "en") }}
              OPTIONAL {{ ?item wdt:P569 ?nascimento }}
              OPTIONAL {{ ?item wdt:P413 ?posicao }}
              OPTIONAL {{ ?item wdt:P27/wdt:P298 ?cidadania }}
              OPTIONAL {{ ?item wdt:P1532/wdt:P298 ?esportiva }}
              OPTIONAL {{ ?item wdt:P552 ?peItem . ?peItem rdfs:label ?pe FILTER(LANG(?pe) = "en") }}
              OPTIONAL {{ ?item wikibase:sitelinks ?links }}
              OPTIONAL {{ ?item p:P54 ?vinculo . ?vinculo ps:P54 ?clube . FILTER NOT EXISTS {{ ?vinculo pq:P582 [] }}
                         OPTIONAL {{ ?vinculo pq:P580 ?inicio }} }}
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
            }}"""):
            q = valor(l, "item")
            d = dados.setdefault(q, {"qid": q, "posicoes": [], "paises": [], "clubes": {}})
            for campo in ("pt", "es", "en", "nascimento", "pe", "links", "esportiva"):
                if valor(l, campo) and campo not in d:
                    d[campo] = valor(l, campo)
            for campo, lista in (("posicaoLabel", "posicoes"), ("cidadania", "paises")):
                v = valor(l, campo)
                if v and v not in d[lista]:
                    d[lista].append(v)
            if valor(l, "clube"):
                d["clubes"][valor(l, "clube")] = valor(l, "inicio")
    return dados


# ---- tudo junto ---------------------------------------------------------------------------

def gravar(pasta, nome, dados):
    with gzip.open(os.path.join(pasta, nome), "wt", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False)


def main():
    sementes = json.load(open(sys.argv[1], encoding="utf-8"))["sementes"]
    saida = sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    paginas, escolhas = {}, []

    # 1. Páginas de partida: todas as de 'titulos' que existem (sem nenhuma, a busca); de cada uma, as ligações das
    #    seções dos participantes (e as do texto, de reserva).
    for s in sementes:
        achadas = []
        titulos = list(s.get("titulos", []))
        for titulo in titulos:
            final, texto = texto_da_pagina(s["lang"], titulo)
            if texto and final not in [a["titulo"] for a in achadas]:
                paginas[f"{s['lang']}:{final}"] = texto
                secoes, listas = participantes_da_pagina(s["lang"], final)
                achadas.append({"titulo": final, "secoes": secoes, "participantes": listas, "ligacoes": ligacoes(texto)})
        candidatos = []
        # Sem página com participantes (estaduais sem a página de 2026): a busca, com as edições de 2026 e de 2025.
        poucos = sum(len(l["ligacoes"]) for a in achadas for l in a["participantes"]) < 8
        if poucos and s.get("buscas"):
            for consulta in s["buscas"]:
                for t in buscar(s["lang"], consulta):
                    if t in candidatos or not any(a in t for a in ("2026", "2025")):
                        continue
                    candidatos.append(t)
            for titulo in [t for t in candidatos if all(e.lower() in t.lower() for e in s.get("exige_busca", []))][:3]:
                final, texto = texto_da_pagina(s["lang"], titulo)
                if texto and final not in [a["titulo"] for a in achadas]:
                    paginas[f"{s['lang']}:{final}"] = texto
                    secoes, listas = participantes_da_pagina(s["lang"], final)
                    achadas.append({"titulo": final, "secoes": secoes, "participantes": listas, "ligacoes": ligacoes(texto)})
        if not achadas:
            for consulta in s.get("consultas", []):
                candidatos += [t for t in buscar(s["lang"], consulta) if t not in candidatos]
            exige = [e.lower() for e in s.get("exige", [])]
            escolhido = next((t for t in candidatos if all(e in t.lower() for e in exige)), None)
            final, texto = texto_da_pagina(s["lang"], escolhido) if escolhido else (None, None)
            if texto:
                paginas[f"{s['lang']}:{final}"] = texto
                secoes, listas = participantes_da_pagina(s["lang"], final)
                achadas.append({"titulo": final, "secoes": secoes, "participantes": listas, "ligacoes": ligacoes(texto)})
        escolhas.append({**s, "candidatos": candidatos, "paginas": achadas})
        print(f"{s['id']}: {', '.join(a['titulo'] for a in achadas) or 'NÃO ACHOU'} "
              f"({sum(len(l['ligacoes']) for a in achadas for l in a['participantes'])} ligações nos participantes)", flush=True)
    gravar(saida, "sementes.json.gz", escolhas)

    # 2. Clubes do país do campeonato entre as ligações (das seções dos participantes e do texto).
    titulos_por_lang = {}
    for e in escolhas:
        for a in e["paginas"]:
            titulos_por_lang.setdefault(e["lang"], set()).update(a["ligacoes"])
            for l in a["participantes"]:
                titulos_por_lang[e["lang"]].update(l["ligacoes"])
    qid_de = {lang: qids_dos_titulos(lang, list(titulos)) for lang, titulos in titulos_por_lang.items()}
    todos = {q for mapa in qid_de.values() for q in mapa.values()}
    clubes = clubes_de_futebol(todos)
    print(f"Ligações: {sum(len(t) for t in titulos_por_lang.values())}; itens: {len(todos)}; clubes: {len(clubes)}", flush=True)
    for e in escolhas:
        mapa = qid_de.get(e["lang"], {})
        do_pais = lambda t: mapa.get(t) in clubes and (not clubes[mapa[t]] or e["pais"] in clubes[mapa[t]])
        for a in e["paginas"]:
            a["clubes_no_texto"] = [{"titulo": t, "qid": mapa[t]} for t in a["ligacoes"] if do_pais(t)]
            for l in a["participantes"]:
                l["clubes"] = [{"titulo": t, "qid": mapa[t]} for t in l["ligacoes"] if do_pais(t)]
            del a["ligacoes"]
    gravar(saida, "sementes.json.gz", escolhas)
    dos_campeonatos = {c["qid"] for e in escolhas for a in e["paginas"]
                       for c in a["clubes_no_texto"] + [c for l in a["participantes"] for c in l["clubes"]]}
    detalhes = detalhes_dos_clubes(dos_campeonatos)
    for q, d in detalhes.items():
        d["paises"] = clubes.get(q, [])
    gravar(saida, "clubes.json.gz", detalhes)
    print(f"Clubes dos campeonatos: {len(dos_campeonatos)} (com detalhes: {len(detalhes)})", flush=True)

    # 3. Página de cada clube: em português os brasileiros; em espanhol e inglês os de fora.
    elencos = {}
    for q, d in sorted(detalhes.items()):
        brasileiro = "Q155" in d.get("paises", [])
        for wiki, lang in (("ptwiki", "pt"),) if brasileiro else (("eswiki", "es"), ("enwiki", "en")):
            if not d.get(wiki):
                continue
            titulo, texto = texto_da_pagina(lang, d[wiki])
            if not texto:
                continue
            paginas[f"{lang}:{titulo}"] = texto
            trechos = secoes_do_elenco(texto)
            elencos[f"{q}|{lang}"] = {"qid": q, "lang": lang, "titulo": titulo, "secoes": [t["secao"] for t in trechos],
                                     "ligacoes": [t for tr in trechos for t in ligacoes(tr["texto"])]}
    gravar(saida, "paginas.json.gz", paginas)
    print(f"Páginas: {len(paginas)}; clubes com seção de elenco: {sum(1 for e in elencos.values() if e['secoes'])}", flush=True)

    # 4. Quem aparece nas seções de elenco: dados do Wikidata (só pessoas).
    por_lang = {}
    for e in elencos.values():
        por_lang.setdefault(e["lang"], set()).update(e["ligacoes"])
    pessoas = {}
    for lang, titulos in por_lang.items():
        mapa = qids_dos_titulos(lang, list(titulos))
        for e in elencos.values():
            if e["lang"] == lang:
                e["qids"] = {t: mapa[t] for t in e["ligacoes"] if t in mapa}
        pessoas.update({q: None for q in mapa.values()})
    jogadores = detalhes_dos_jogadores(list(pessoas))
    gravar(saida, "elencos.json.gz", elencos)
    gravar(saida, "jogadores.json.gz", jogadores)
    print(f"Ligações nas seções de elenco: {sum(len(t) for t in por_lang.values())}; pessoas no Wikidata: {len(jogadores)}", flush=True)


if __name__ == "__main__":
    main()
