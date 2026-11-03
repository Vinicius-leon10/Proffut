"""Gera tools/times/sementes-america.json: as páginas de partida do robô (tools/times/wikipedia.py) para o resto da
América (pedido de nov/2026: "traga tudo que tem da América... e a seleção de todos esses países"):

  - as ligas de cada país da Concacaf (América do Norte, Central e Caribe), até a 3ª divisão onde há;
  - a 3ª divisão dos países da Conmebol que têm uma (as 1ª e 2ª já estão no jogo);
  - a 2ª divisão dos 27 estaduais;
  - as copas continentais e regionais de clubes (Libertadores, Sul-Americana, Champions Cup, Copa do Nordeste...);
  - as seleções dos 10 países da Conmebol e das filiadas à Concacaf (o elenco atual da página de cada uma).

    python3 tools/times/sementes_america.py

Os títulos são o palpite do nome da página; sem página com esse título, o robô busca (consultas) e fica com o primeiro
resultado que tem as palavras de "exige". Quem decide os participantes é tools/times/montar.ts.
"""

import json

# Código do jogo → (nome em português, itens do Wikidata aceitos como país do clube, nome em inglês, nome em espanhol).
# Territórios: o clube às vezes está no Wikidata com o país "dono" (França, Reino Unido, Países Baixos, EUA).
FR, UK, NL, EUA = "Q142", "Q145", "Q55", "Q30"
CONCACAF = {
    # América do Norte
    "MX": ("México", ["Q96"], "Mexico", "México"),
    "US": ("Estados Unidos", [EUA, "Q16"], "United States", "Estados Unidos"),
    "CA": ("Canadá", ["Q16"], "Canada", "Canadá"),
    # América Central
    "CR": ("Costa Rica", ["Q800"], "Costa Rica", "Costa Rica"),
    "HN": ("Honduras", ["Q783"], "Honduras", "Honduras"),
    "GT": ("Guatemala", ["Q774"], "Guatemala", "Guatemala"),
    "SV": ("El Salvador", ["Q792"], "El Salvador", "El Salvador"),
    "PA": ("Panamá", ["Q804"], "Panama", "Panamá"),
    "NI": ("Nicarágua", ["Q811"], "Nicaragua", "Nicaragua"),
    "BZ": ("Belize", ["Q242"], "Belize", "Belice"),
    # Caribe
    "JM": ("Jamaica", ["Q766"], "Jamaica", "Jamaica"),
    "TT": ("Trinidad e Tobago", ["Q754"], "Trinidad and Tobago", "Trinidad y Tobago"),
    "HT": ("Haiti", ["Q790"], "Haiti", "Haití"),
    "DO": ("República Dominicana", ["Q786"], "Dominican Republic", "República Dominicana"),
    "CU": ("Cuba", ["Q241"], "Cuba", "Cuba"),
    "PR": ("Porto Rico", ["Q1183", EUA], "Puerto Rico", "Puerto Rico"),
    "SR": ("Suriname", ["Q730"], "Suriname", "Surinam"),
    "GY": ("Guiana", ["Q734"], "Guyana", "Guyana"),
    "CW": ("Curaçao", ["Q25279", NL], "Curaçao", "Curazao"),
    "AW": ("Aruba", ["Q21203", NL], "Aruba", "Aruba"),
    "SX": ("São Martinho (Países Baixos)", ["Q26273", NL], "Sint Maarten", "San Martín"),
    "BQ": ("Bonaire", ["Q25396", "Q27561", NL], "Bonaire", "Bonaire"),
    "MQ": ("Martinica", ["Q17054", FR], "Martinique", "Martinica"),
    "GP": ("Guadalupe", ["Q17012", FR], "Guadeloupe", "Guadalupe"),
    "GF": ("Guiana Francesa", ["Q3769", FR], "French Guiana", "Guayana Francesa"),
    "MF": ("São Martinho (França)", ["Q126125", FR], "Saint Martin", "San Martín (Francia)"),
    "BB": ("Barbados", ["Q244"], "Barbados", "Barbados"),
    "BS": ("Bahamas", ["Q778"], "Bahamas", "Bahamas"),
    "BM": ("Bermudas", ["Q23635", UK], "Bermuda", "Bermudas"),
    "KY": ("Ilhas Cayman", ["Q5785", UK], "Cayman Islands", "Islas Caimán"),
    "LC": ("Santa Lúcia", ["Q760"], "Saint Lucia", "Santa Lucía"),
    "GD": ("Granada", ["Q769"], "Grenada", "Granada"),
    "VC": ("São Vicente e Granadinas", ["Q757"], "Saint Vincent and the Grenadines", "San Vicente y las Granadinas"),
    "KN": ("São Cristóvão e Névis", ["Q763"], "Saint Kitts and Nevis", "San Cristóbal y Nieves"),
    "AG": ("Antígua e Barbuda", ["Q781"], "Antigua and Barbuda", "Antigua y Barbuda"),
    "DM": ("Dominica", ["Q784"], "Dominica", "Dominica"),
    "MS": ("Montserrat", ["Q13353", UK], "Montserrat", "Montserrat"),
    "AI": ("Anguila", ["Q25228", UK], "Anguilla", "Anguila"),
    "VG": ("Ilhas Virgens Britânicas", ["Q25305", UK], "British Virgin Islands", "Islas Vírgenes Británicas"),
    "VI": ("Ilhas Virgens Americanas", ["Q11703", EUA], "United States Virgin Islands", "Islas Vírgenes de los Estados Unidos"),
    "TC": ("Turks e Caicos", ["Q18221", UK], "Turks and Caicos Islands", "Islas Turcas y Caicos"),
}

# Ligas da Concacaf: (país, divisão, títulos em inglês, títulos em espanhol, palavras que o título da busca precisa ter).
# Temporadas de agosto a maio: a de 2025–26 (o jogo começa em 2026).
LIGAS = [
    ("MX", 1, ["2025–26 Liga MX season"], ["Torneo Clausura 2026 (México)", "Liga MX 2025-26"], ["Liga MX"]),
    ("MX", 2, ["2025–26 Liga de Expansión MX season"], ["Torneo Clausura 2026 Liga de Expansión MX", "Liga de Expansión MX 2025-26"], ["Expansión"]),
    ("MX", 3, ["2025–26 Liga Premier de México season", "2025–26 Liga Premier season"], ["Liga Premier de México 2025-26"], ["Premier"]),
    ("US", 1, ["2026 Major League Soccer season"], ["Temporada 2026 de la Major League Soccer", "Major League Soccer 2026"], ["Major League Soccer"]),
    ("US", 2, ["2026 USL Championship season"], ["Temporada 2026 del USL Championship"], ["USL Championship"]),
    ("US", 3, ["2026 USL League One season"], ["Temporada 2026 de la USL League One"], ["League One"]),
    ("CA", 1, ["2026 Canadian Premier League season"], ["Temporada 2026 de la Canadian Premier League"], ["Canadian Premier"]),
    ("CR", 1, ["2025–26 Liga FPD season", "2025–26 Liga FPD", "2025–26 Costa Rican Primera División season"], ["Torneo de Clausura 2026 (Costa Rica)", "Campeonato de Primera División de Costa Rica 2025-26"], ["Costa Rica"]),
    ("CR", 2, ["2025–26 Liga de Ascenso (Costa Rica)"], ["Liga de Ascenso de Costa Rica 2025-26", "Clausura 2026 Liga de Ascenso Costa Rica", "Liga de Ascenso (Costa Rica)"], ["Ascenso"]),
    ("HN", 1, ["2025–26 Liga Nacional de Fútbol Profesional de Honduras", "2025–26 Honduran Liga Nacional"], ["Liga Nacional de Fútbol Profesional de Honduras 2025-26", "Torneo Clausura 2026 (Honduras)"], ["Honduras"]),
    ("HN", 2, ["2025–26 Liga de Ascenso de Honduras"], ["Liga de Ascenso de Honduras 2025-26"], ["Ascenso"]),
    ("GT", 1, ["2025–26 Liga Nacional de Guatemala"], ["Liga Nacional de Guatemala 2025-26", "Torneo Clausura 2026 (Guatemala)"], ["Guatemala"]),
    ("GT", 2, ["2025–26 Primera División de Guatemala"], ["Primera División de Guatemala 2025-26"], ["Primera División de Guatemala"]),
    ("SV", 1, ["2025–26 Primera División de El Salvador", "2025–26 Salvadoran Primera División"], ["Primera División de El Salvador 2025-26", "Torneo Clausura 2026 (El Salvador)"], ["Salvador"]),
    ("SV", 2, ["2025–26 Segunda División de El Salvador"], ["Segunda División de El Salvador 2025-26"], ["Salvador"]),
    ("PA", 1, ["2026 Liga Panameña de Fútbol", "2026 Liga Panameña de Fútbol season"], ["Liga Panameña de Fútbol 2026", "Torneo Apertura 2026 (Panamá)"], ["Paname"]),
    ("PA", 2, ["2026 Liga Prom"], ["Liga Prom 2026"], ["Liga Prom"]),
    ("NI", 1, ["2025–26 Liga Primera de Nicaragua"], ["Liga Primera de Nicaragua 2025-26", "Torneo Clausura 2026 (Nicaragua)"], ["Nicaragua"]),
    ("NI", 2, ["2025–26 Segunda División de Nicaragua"], ["Segunda División de Nicaragua 2025-26"], ["Segunda División"]),
    ("BZ", 1, ["2025–26 Premier League of Belize"], ["Liga Premier de Belice 2025-26"], ["Belize"]),
    ("JM", 1, ["2025–26 Jamaica Premier League"], ["Liga Premier de Jamaica 2025-26"], ["Jamaica"]),
    ("TT", 1, ["2025–26 TT Premier League", "2025–26 TT Premier League season"], ["TT Premier League 2025-26"], ["Premier"]),
    ("HT", 1, ["2025–26 Ligue Haïtienne", "2025–26 Championnat National (Haiti)"], ["Liga Haitiana 2025-26"], ["Ha"]),
    ("DO", 1, ["2026 Liga Dominicana de Fútbol"], ["Liga Dominicana de Fútbol 2026"], ["Dominicana"]),
    ("CU", 1, ["2026 Campeonato Nacional de Fútbol de Cuba", "2025 Campeonato Nacional de Fútbol de Cuba"], ["Campeonato Nacional de Fútbol de Cuba 2026", "Campeonato Nacional de Fútbol de Cuba 2025"], ["Cuba"]),
    ("PR", 1, ["2025–26 Liga Puerto Rico", "2026 Liga Puerto Rico season"], ["Liga Puerto Rico 2025-26"], ["Puerto Rico"]),
    ("SR", 1, ["2025–26 SVB Eerste Divisie", "2025–26 Suriname Major League"], ["Primera División de Surinam 2025-26"], ["S"]),
    ("GY", 1, ["2025–26 GFF Elite League", "2026 GFF Elite League"], ["GFF Elite League 2025-26"], ["Elite"]),
    ("CW", 1, ["2025–26 Curaçao Promé Divishon"], ["Promé Divishon 2025-26"], ["Prom"]),
    ("AW", 1, ["2025–26 Aruban Division di Honor"], ["División di Honor 2025-26"], ["Honor"]),
    ("SX", 1, ["2025–26 Sint Maarten Premier League"], [], ["Sint Maarten"]),
    ("BQ", 1, ["2025–26 Bonaire League"], [], ["Bonaire"]),
    ("MQ", 1, ["2025–26 Martinique Championnat National"], ["Campeonato Nacional de Martinica 2025-26"], ["Martinique"]),
    ("GP", 1, ["2025–26 Guadeloupe Division of Honour", "2025–26 Guadeloupe Division d'Honneur"], [], ["Guadeloupe"]),
    ("GF", 1, ["2025–26 French Guiana Régional 1"], [], ["Guiana"]),
    ("MF", 1, ["2025–26 Saint-Martin Senior League"], [], ["Martin"]),
    ("BB", 1, ["2026 Barbados Premier League", "2025 Barbados Premier League"], [], ["Barbados"]),
    ("BS", 1, ["2025–26 BFA Senior League"], [], ["BFA"]),
    ("BM", 1, ["2025–26 Bermudian Premier Division"], [], ["Bermud"]),
    ("KY", 1, ["2025–26 Cayman Islands Premier League"], [], ["Cayman"]),
    ("LC", 1, ["2026 SLFA First Division", "2025 SLFA First Division"], [], ["SLFA"]),
    ("GD", 1, ["2025–26 GFA Premier Division", "2026 GFA Premier Division"], [], ["GFA"]),
    ("VC", 1, ["2025–26 SVGFF Premier Division", "2026 SVGFF Premier Division"], [], ["SVGFF"]),
    ("KN", 1, ["2025–26 SKNFA Premier League", "2025–26 SKNFA Super League"], [], ["SKNFA"]),
    ("AG", 1, ["2025–26 Antigua and Barbuda Premier Division"], [], ["Antigua"]),
    ("DM", 1, ["2025–26 Dominica Premiere League", "2026 Dominica Premiere League"], [], ["Dominica"]),
    ("AI", 1, ["2025–26 AFA Senior Male League"], [], ["AFA"]),
    ("VG", 1, ["2025–26 BVIFA National Football League"], [], ["BVIFA"]),
    ("VI", 1, ["2025–26 U.S. Virgin Islands Premier League"], [], ["Virgin"]),
    ("TC", 1, ["2025–26 Provo Premier League", "2025–26 WIV Provo Premier League"], [], ["Provo"]),
]

# 3ª divisão dos países da Conmebol (onde existe uma liga nacional de 3ª; nos outros é amadora e regional).
TERCEIRAS = [
    ("AR", "Q414", ["2026 Primera B Metropolitana"], ["Campeonato de Primera B 2026 (Argentina)", "Primera B Metropolitana 2026"], ["Primera B"]),
    ("AR", "Q414", ["2026 Torneo Federal A"], ["Torneo Federal A 2026"], ["Federal A"]),
    ("CL", "Q298", ["2026 Segunda División Profesional de Chile"], ["Segunda División Profesional de Chile 2026"], ["Segunda"]),
    ("PE", "Q419", ["2026 Liga 3 (Peru)"], ["Liga 3 2026 (Perú)", "Liga 3 de Perú 2026"], ["Liga 3"]),
    ("PY", "Q733", ["2026 Paraguayan Primera B"], ["Primera B 2026 (Paraguay)", "Primera División B de Paraguay 2026"], ["Primera B"]),
    ("UY", "Q77", ["2026 Uruguayan Primera División Amateur", "2026 Uruguayan Divisional C"], ["Campeonato Uruguayo de Primera División Amateur 2026", "Divisional C 2026"], ["Uruguay"]),
    ("VE", "Q717", ["2026 Liga FUTVE 3"], ["Tercera División de Venezuela 2026", "Liga FUTVE 3 2026"], ["Venezuela"]),
    ("BO", "Q750", [], ["Copa Simón Bolívar 2026 (Bolivia)"], ["Bolívar"]),
    ("EC", "Q736", ["2026 Ecuadorian Segunda Categoría"], ["Segunda Categoría de Ecuador 2026"], ["Segunda"]),
]

NOME_ESTADUAL = {
    "AC": "Acreano", "AL": "Alagoano", "AP": "Amapaense", "AM": "Amazonense", "BA": "Baiano", "CE": "Cearense",
    "DF": "Brasiliense", "ES": "Capixaba", "GO": "Goiano", "MA": "Maranhense", "MT": "Mato-Grossense",
    "MS": "Sul-Mato-Grossense", "MG": "Mineiro", "PA": "Paraense", "PB": "Paraibano", "PR": "Paranaense",
    "PE": "Pernambucano", "PI": "Piauiense", "RJ": "Carioca", "RN": "Potiguar", "RS": "Gaúcho", "RO": "Rondoniense",
    "RR": "Roraimense", "SC": "Catarinense", "SP": "Paulista", "SE": "Sergipano", "TO": "Tocantinense",
}

# Copas de clubes: continentais, regionais e nacionais (os participantes de 2026; as seguintes saem das regras do jogo).
COPAS = [
    ("copa-libertadores", "es", None, ["Copa Libertadores 2026"], ["Libertadores"]),
    ("copa-sulamericana", "es", None, ["Copa Sudamericana 2026"], ["Sudamericana"]),
    ("copa-recopa", "es", None, ["Recopa Sudamericana 2026"], ["Recopa"]),
    ("copa-concacaf", "en", None, ["2026 CONCACAF Champions Cup"], ["Champions Cup"]),
    ("copa-centroamericana", "en", None, ["2025 CONCACAF Central American Cup"], ["Central American"]),
    ("copa-caribe", "en", None, ["2025 CONCACAF Caribbean Cup"], ["Caribbean"]),
    ("copa-leagues", "en", None, ["2026 Leagues Cup", "2025 Leagues Cup"], ["Leagues Cup"]),
    ("copa-nordeste", "pt", "Q155", ["Copa do Nordeste de Futebol de 2026"], ["Nordeste"]),
    ("copa-verde", "pt", "Q155", ["Copa Verde de 2026"], ["Copa Verde"]),
    ("copa-sulsudeste", "pt", "Q155", ["Copa Sul-Sudeste de 2026"], ["Sul-Sudeste"]),
    ("copa-supercopa", "pt", "Q155", ["Supercopa do Brasil de 2026"], ["Supercopa"]),
    ("copa-AR", "es", "Q414", ["Copa Argentina 2026"], ["Copa Argentina"]),
    ("copa-CL", "es", "Q298", ["Copa Chile 2026"], ["Copa Chile"]),
    ("copa-CO", "es", "Q739", ["Copa Colombia 2026"], ["Copa Colombia"]),
    ("copa-EC", "es", "Q736", ["Copa Ecuador 2026"], ["Copa Ecuador"]),
    ("copa-PY", "es", "Q733", ["Copa Paraguay 2026"], ["Copa Paraguay"]),
    ("copa-UY", "es", "Q77", ["Copa AUF Uruguay 2026"], ["Copa AUF"]),
    ("copa-VE", "es", "Q717", ["Copa Venezuela 2026"], ["Copa Venezuela"]),
    ("copa-US", "en", EUA, ["2026 U.S. Open Cup"], ["Open Cup"]),
    ("copa-CA", "en", "Q16", ["2026 Canadian Championship"], ["Canadian Championship"]),
]

# Seleções (página em inglês, seção do elenco atual). Conmebol: os 10 países; Concacaf: as filiadas.
CONMEBOL = {"BR": "Brazil", "AR": "Argentina", "BO": "Bolivia", "CL": "Chile", "CO": "Colombia", "EC": "Ecuador",
            "PY": "Paraguay", "PE": "Peru", "UY": "Uruguay", "VE": "Venezuela"}
PAGINA_SELECAO = {
    "US": ["United States men's national soccer team"], "CA": ["Canada men's national soccer team"],
    "MX": ["Mexico national football team"], "CR": ["Costa Rica national football team"],
}


def liga(pais, divisao, en, es, exige):
    nome, itens, nome_en, nome_es = CONCACAF[pais]
    codigo = pais if divisao == 1 else f"{pais}{divisao}"
    sementes = []
    for lang, titulos in (("en", en), ("es", es)):
        if not titulos:
            continue
        sementes.append({
            "id": f"america-{codigo}-{lang}", "liga": codigo, "lang": lang, "pais": itens[0], "paises": itens,
            "titulos": titulos, "consultas": [titulos[0].replace("–", "-"), f"{nome_en if lang == 'en' else nome_es} {'league' if lang == 'en' else 'liga'} 2026"],
            "exige": exige,
        })
    return sementes


def main():
    sementes = []
    for pais, divisao, en, es, exige in LIGAS:
        sementes += liga(pais, divisao, en, es, exige)
    for pais, item, en, es, exige in TERCEIRAS:
        for lang, titulos in (("en", en), ("es", es)):
            if titulos:
                n = sum(1 for s in sementes if s.get("liga", "").startswith(f"{pais}3") and s["lang"] == lang)
                codigo = f"{pais}3" + ("" if n == 0 else chr(ord("a") + n))
                sementes.append({"id": f"america-{codigo}-{lang}", "liga": codigo, "lang": lang, "pais": item,
                                 "titulos": titulos, "consultas": [titulos[0]], "exige": exige})
    for uf, nome in NOME_ESTADUAL.items():
        base = f"Campeonato {nome} de Futebol de 2026"
        sementes.append({
            "id": f"estadual2-{uf}", "uf": uf, "divisao": 2, "lang": "pt", "pais": "Q155",
            "titulos": [f"{base} – Série A2", f"{base} – Segunda Divisão", f"{base} - Série A2", f"{base} - Segunda Divisão",
                        f"{base} – Série B", f"{base} – Módulo II", f"{base} – Série Prata"],
            "consultas": [f"Campeonato {nome} 2026 Segunda Divisão", f"Campeonato {nome} 2026 Série A2", f"Campeonato {nome} 2026 Série B"],
            "exige": ["2026", nome.split("-")[0]],
        })
    for id_, lang, pais, titulos, exige in COPAS:
        sementes.append({"id": id_, "copa": True, "lang": lang, **({"pais": pais} if pais else {}),
                         "titulos": titulos, "consultas": [titulos[0]], "exige": exige})
    for codigo, nome_en in CONMEBOL.items():
        sementes.append({"id": f"selecao-{codigo}", "selecao": codigo, "lang": "en",
                         "titulos": [f"{nome_en} national football team"], "consultas": [f"{nome_en} national football team"],
                         "exige": ["national"]})
    for codigo, (nome, itens, nome_en, _) in CONCACAF.items():
        titulos = PAGINA_SELECAO.get(codigo, [f"{nome_en} national football team", f"{nome_en} men's national football team"])
        sementes.append({"id": f"selecao-{codigo}", "selecao": codigo, "lang": "en", "titulos": titulos,
                         "consultas": [f"{nome_en} national football team"], "exige": ["national"]})
    with open("tools/times/sementes-america.json", "w", encoding="utf-8") as f:
        json.dump({"descricao": "Páginas de partida do robô para o resto da América (gerado por tools/times/sementes_america.py).",
                   "paises": {k: {"nome": v[0], "itens": v[1]} for k, v in CONCACAF.items()}, "sementes": sementes},
                  f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(sementes)} sementes")


if __name__ == "__main__":
    main()
