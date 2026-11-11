"""Gera tools/times/sementes-mundo.json: as páginas de partida do robô (tools/times/wikipedia.py) para os clubes da Ásia,
da África e da Oceania (projeto "jogo completo", nov/2026: "trazer tudo que está faltando, para deixar o jogo agora
completo"):

  - a 1ª divisão dos principais países da África e da Ásia e a da Nova Zelândia (Japão, Coreia do Sul, Arábia Saudita e
    Austrália vêm também do transfermarkt-datasets, fase "asia-africa" do robô);
  - as copas continentais: Liga dos Campeões da Ásia (Elite e Two), da África, Copa das Confederações da CAF, Liga dos
    Campeões da Oceania e o Mundial de Clubes.

    python3 tools/times/sementes_mundo.py

Os títulos são o palpite do nome da página (em inglês); sem página com esse título, o robô busca (consultas) e fica com
o primeiro resultado que tem as palavras de "exige". Quem decide os participantes é o montador.
"""

import json

# Código do país no jogo (o mesmo da seleção, selecoes-mundo.ts) → (nome em português, item do Wikidata, nome em inglês).
PAISES = {
    # África
    "EG": ("Egito", "Q79", "Egypt"),
    "MA": ("Marrocos", "Q1028", "Morocco"),
    "DZ": ("Argélia", "Q262", "Algeria"),
    "TN": ("Tunísia", "Q948", "Tunisia"),
    "ZA": ("África do Sul", "Q258", "South Africa"),
    "NG": ("Nigéria", "Q1033", "Nigeria"),
    "GH": ("Gana", "Q117", "Ghana"),
    "CI": ("Costa do Marfim", "Q1008", "Ivory Coast"),
    "SN": ("Senegal", "Q1041", "Senegal"),
    "CM": ("Camarões", "Q1009", "Cameroon"),
    "CD": ("RD Congo", "Q974", "DR Congo"),
    "TZ": ("Tanzânia", "Q924", "Tanzania"),
    "AO": ("Angola", "Q916", "Angola"),
    "ZM": ("Zâmbia", "Q953", "Zambia"),
    "ML": ("Mali", "Q912", "Mali"),
    "LY": ("Líbia", "Q1016", "Libya"),
    "KE": ("Quênia", "Q114", "Kenya"),
    "SD": ("Sudão", "Q1049", "Sudan"),
    # Ásia
    "JP": ("Japão", "Q17", "Japan"),
    "KR": ("Coreia do Sul", "Q884", "South Korea"),
    "SA": ("Arábia Saudita", "Q851", "Saudi Arabia"),
    "AU": ("Austrália", "Q408", "Australia"),
    "CN": ("China", "Q148", "China"),
    "IR": ("Irã", "Q794", "Iran"),
    "QA": ("Catar", "Q846", "Qatar"),
    "AE": ("Emirados Árabes", "Q878", "United Arab Emirates"),
    "UZ": ("Uzbequistão", "Q265", "Uzbekistan"),
    "IN": ("Índia", "Q668", "India"),
    "TH": ("Tailândia", "Q869", "Thailand"),
    "IQ": ("Iraque", "Q796", "Iraq"),
    "MY": ("Malásia", "Q833", "Malaysia"),
    "ID": ("Indonésia", "Q252", "Indonesia"),
    "VN": ("Vietnã", "Q881", "Vietnam"),
    "JO": ("Jordânia", "Q810", "Jordan"),
    "KW": ("Kuwait", "Q817", "Kuwait"),
    "BH": ("Bahrein", "Q398", "Bahrain"),
    "OM": ("Omã", "Q842", "Oman"),
    # Oceania
    "NZ": ("Nova Zelândia", "Q664", "New Zealand"),
}

# 1ª divisão de cada país: (país, títulos em inglês, palavras que o título da busca precisa ter). Temporadas de agosto a
# maio: a de 2025–26; de ano: a de 2026 (ou a de 2025, se a de 2026 ainda não tem página).
LIGAS = [
    ("EG", ["2025–26 Egyptian Premier League"], ["Egyptian"]),
    ("MA", ["2025–26 Botola Pro", "2025–26 Botola"], ["Botola"]),
    ("DZ", ["2025–26 Algerian Ligue Professionnelle 1"], ["Algerian"]),
    ("TN", ["2025–26 Tunisian Ligue Professionnelle 1"], ["Tunisian"]),
    ("ZA", ["2025–26 South African Premiership", "2025–26 South African Premier Division"], ["South African"]),
    ("NG", ["2025–26 Nigeria Premier Football League", "2025–26 Nigeria Professional Football League"], ["Nigeria"]),
    ("GH", ["2025–26 Ghana Premier League"], ["Ghana"]),
    ("CI", ["2025–26 Ligue 1 (Ivory Coast)", "2025–26 Ivorian Ligue 1"], ["Ligue 1"]),
    ("SN", ["2025–26 Senegal Premier League", "2025–26 Senegalese Ligue 1"], ["Senegal"]),
    ("CM", ["2025–26 Elite One"], ["Elite One"]),
    ("CD", ["2025–26 Linafoot", "2025–26 Linafoot Ligue 1"], ["Linafoot"]),
    ("TZ", ["2025–26 Tanzanian Premier League"], ["Tanzania"]),
    ("AO", ["2025–26 Girabola"], ["Girabola"]),
    ("ZM", ["2025–26 Zambia Super League"], ["Zambia"]),
    ("ML", ["2025–26 Malian Première Division"], ["Malian"]),
    ("LY", ["2025–26 Libyan Premier League"], ["Libyan"]),
    ("KE", ["2025–26 Kenyan Premier League"], ["Kenyan"]),
    ("SD", ["2025–26 Sudan Premier League"], ["Sudan"]),
    ("JP", ["2026 J1 League", "2026 J1 100 Year Vision League"], ["J1"]),
    ("KR", ["2026 K League 1"], ["K League"]),
    ("SA", ["2025–26 Saudi Pro League"], ["Saudi"]),
    ("AU", ["2025–26 A-League Men"], ["A-League"]),
    ("CN", ["2026 Chinese Super League"], ["Chinese Super League"]),
    ("IR", ["2025–26 Persian Gulf Pro League"], ["Persian Gulf"]),
    ("QA", ["2025–26 Qatar Stars League"], ["Qatar"]),
    ("AE", ["2025–26 UAE Pro League"], ["UAE"]),
    ("UZ", ["2026 Uzbekistan Super League"], ["Uzbekistan"]),
    ("IN", ["2025–26 Indian Super League"], ["Indian Super League"]),
    ("TH", ["2025–26 Thai League 1"], ["Thai League"]),
    ("IQ", ["2025–26 Iraq Stars League"], ["Iraq"]),
    ("MY", ["2025–26 Malaysia Super League"], ["Malaysia"]),
    ("ID", ["2025–26 Super League (Indonesia)", "2025–26 Liga 1 (Indonesia)"], ["Indonesia"]),
    ("VN", ["2025–26 V.League 1"], ["V.League"]),
    ("JO", ["2025–26 Jordanian Pro League"], ["Jordan"]),
    ("KW", ["2025–26 Kuwaiti Premier League"], ["Kuwait"]),
    ("BH", ["2025–26 Bahraini Premier League"], ["Bahrain"]),
    ("OM", ["2025–26 Oman Professional League"], ["Oman"]),
    ("NZ", ["2026 New Zealand National League", "2025 New Zealand National League"], ["National League"]),
]

# Copas de clubes (os participantes de 2025–26 ou 2026; as seguintes saem das regras do jogo).
COPAS = [
    ("copa-afc-elite", ["2025–26 AFC Champions League Elite"], ["Champions League Elite"]),
    ("copa-afc-two", ["2025–26 AFC Champions League Two"], ["Champions League Two"]),
    ("copa-caf", ["2025–26 CAF Champions League"], ["CAF Champions League"]),
    ("copa-caf-confed", ["2025–26 CAF Confederation Cup"], ["Confederation Cup"]),
    ("copa-ofc", ["2026 OFC Professional League", "2026 OFC Champions League"], ["OFC"]),
    ("copa-mundial", ["2025 FIFA Club World Cup"], ["Club World Cup"]),
]


def main():
    sementes = []
    for pais, titulos, exige in LIGAS:
        nome, item, nome_en = PAISES[pais]
        sementes.append({
            "id": f"mundo-{pais}-en", "liga": pais, "lang": "en", "pais": item, "paises": [item],
            "titulos": titulos, "consultas": [titulos[0].replace("–", "-"), f"{nome_en} football league 2026"],
            "exige": exige,
        })
    for id_, titulos, exige in COPAS:
        sementes.append({"id": id_, "copa": True, "lang": "en", "titulos": titulos, "consultas": [titulos[0].replace("–", "-")], "exige": exige})
    with open("tools/times/sementes-mundo.json", "w", encoding="utf-8") as f:
        json.dump({"descricao": "Páginas de partida do robô para os clubes da África, da Ásia e da Oceania (gerado por tools/times/sementes_mundo.py).",
                   "paises": {k: {"nome": v[0], "itens": [v[1]]} for k, v in PAISES.items()}, "sementes": sementes},
                  f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(sementes)} sementes")


if __name__ == "__main__":
    main()
