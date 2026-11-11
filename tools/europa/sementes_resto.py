"""Gera tools/europa/sementes-resto.json: as páginas de partida do robô (tools/times/wikipedia.py) para a parte 4 do projeto
"jogo completo" (nov/2026: "trazer tudo que está faltando, para deixar o jogo agora completo"):

  - a 2ª divisão dos 16 países da Europa que já têm a 1ª no jogo (Áustria, Bélgica, Suíça, Dinamarca, Grécia, Croácia,
    Noruega, Polônia, Romênia, Rússia, Escócia, Suécia, Sérvia, Turquia, Tchéquia e Ucrânia);
  - a 1ª divisão dos 31 países da Europa que ainda não têm liga no jogo (o Liechtenstein não tem liga: os clubes de lá
    jogam na Suíça);
  - a liga nacional da Nova Zelândia.

    python3 tools/europa/sementes_resto.py

Os títulos são o palpite do nome da página (em inglês); sem página com esse título, o robô busca (consultas) e fica com
o primeiro resultado que tem as palavras de "exige". Quem decide os participantes é o montador (tools/europa/resto.ts).
"""

import json

# Código do país no jogo (o mesmo da seleção) → (nome em português, itens do Wikidata aceitos como país do clube, nome em inglês).
PAISES = {
    "AT": ("Áustria", ["Q40"], "Austria"),
    "BE": ("Bélgica", ["Q31"], "Belgium"),
    "CH": ("Suíça", ["Q39", "Q347"], "Switzerland"),
    "DK": ("Dinamarca", ["Q35"], "Denmark"),
    "GR": ("Grécia", ["Q41"], "Greece"),
    "HR": ("Croácia", ["Q224"], "Croatia"),
    "NO": ("Noruega", ["Q20"], "Norway"),
    "PL": ("Polônia", ["Q36"], "Poland"),
    "RO": ("Romênia", ["Q218"], "Romania"),
    "RU": ("Rússia", ["Q159"], "Russia"),
    "XS": ("Escócia", ["Q22", "Q145"], "Scotland"),
    "SE": ("Suécia", ["Q34"], "Sweden"),
    "RS": ("Sérvia", ["Q403"], "Serbia"),
    "TR": ("Turquia", ["Q43"], "Turkey"),
    "CZ": ("Tchéquia", ["Q213"], "Czech Republic"),
    "UA": ("Ucrânia", ["Q212"], "Ukraine"),
    "AL": ("Albânia", ["Q222"], "Albania"),
    "AD": ("Andorra", ["Q228"], "Andorra"),
    "AM": ("Armênia", ["Q399"], "Armenia"),
    "AZ": ("Azerbaijão", ["Q227"], "Azerbaijan"),
    "BY": ("Belarus", ["Q184"], "Belarus"),
    "BA": ("Bósnia", ["Q225"], "Bosnia and Herzegovina"),
    "BG": ("Bulgária", ["Q219"], "Bulgaria"),
    "CY": ("Chipre", ["Q229"], "Cyprus"),
    "EE": ("Estônia", ["Q191"], "Estonia"),
    "FO": ("Ilhas Faroé", ["Q4628", "Q35"], "Faroe Islands"),
    "FI": ("Finlândia", ["Q33"], "Finland"),
    "GE": ("Geórgia", ["Q230"], "Georgia"),
    "GI": ("Gibraltar", ["Q1410", "Q145"], "Gibraltar"),
    "HU": ("Hungria", ["Q28"], "Hungary"),
    "IS": ("Islândia", ["Q189"], "Iceland"),
    "IE": ("Irlanda", ["Q27"], "Republic of Ireland"),
    "IL": ("Israel", ["Q801"], "Israel"),
    "KZ": ("Cazaquistão", ["Q232"], "Kazakhstan"),
    "XK": ("Kosovo", ["Q1246"], "Kosovo"),
    "LV": ("Letônia", ["Q211"], "Latvia"),
    "LT": ("Lituânia", ["Q37"], "Lithuania"),
    "LU": ("Luxemburgo", ["Q32"], "Luxembourg"),
    "MT": ("Malta", ["Q233"], "Malta"),
    "MD": ("Moldávia", ["Q217"], "Moldova"),
    "ME": ("Montenegro", ["Q236"], "Montenegro"),
    "MK": ("Macedônia do Norte", ["Q221"], "North Macedonia"),
    "XN": ("Irlanda do Norte", ["Q26", "Q145"], "Northern Ireland"),
    "SM": ("San Marino", ["Q238"], "San Marino"),
    "SK": ("Eslováquia", ["Q214"], "Slovakia"),
    "SI": ("Eslovênia", ["Q215"], "Slovenia"),
    "XW": ("País de Gales", ["Q25", "Q145"], "Wales"),
    "NZ": ("Nova Zelândia", ["Q664"], "New Zealand"),
}

# (liga no jogo, títulos em inglês, palavras que o título da busca precisa ter). Temporadas de agosto a maio: a de
# 2025–26; de ano: a de 2026 (ou a de 2025, se a de 2026 ainda não tem a lista dos clubes).
LIGAS = [
    # 2ª divisão dos 16 países
    ("AT2", ["2025–26 2. Liga (Austria)", "2025–26 Austrian Football Second League"], ["2. Liga"]),
    ("BE2", ["2025–26 Challenger Pro League"], ["Challenger Pro League"]),
    ("CH2", ["2025–26 Swiss Challenge League"], ["Challenge League"]),
    ("DK2", ["2025–26 Danish 1st Division"], ["1st Division"]),
    ("GR2", ["2025–26 Super League Greece 2"], ["Super League"]),
    ("HR2", ["2025–26 Prva NL", "2025–26 First Football League (Croatia)"], ["Prva"]),
    ("NO2", ["2026 Norwegian First Division", "2025 Norwegian First Division"], ["Norwegian First Division"]),
    ("PL2", ["2025–26 I liga"], ["I liga"]),
    ("RO2", ["2025–26 Liga II"], ["Liga II"]),
    ("RU2", ["2025–26 Russian First League"], ["Russian First League"]),
    ("XS2", ["2025–26 Scottish Championship"], ["Scottish Championship"]),
    ("SE2", ["2026 Superettan", "2025 Superettan"], ["Superettan"]),
    ("RS2", ["2025–26 Serbian First League"], ["Serbian First League"]),
    ("TR2", ["2025–26 TFF 1. Lig"], ["1. Lig"]),
    ("CZ2", ["2025–26 Czech National Football League"], ["National Football League"]),
    ("UA2", ["2025–26 Ukrainian First League"], ["Ukrainian First League"]),
    # 1ª divisão dos países que faltam
    ("AL", ["2025–26 Kategoria Superiore"], ["Kategoria Superiore"]),
    ("AD", ["2025–26 Primera Divisió"], ["Primera Divisi"]),
    ("AM", ["2025–26 Armenian Premier League"], ["Armenian Premier League"]),
    ("AZ", ["2025–26 Azerbaijan Premier League"], ["Azerbaijan Premier League"]),
    ("BY", ["2026 Belarusian Premier League", "2025 Belarusian Premier League"], ["Belarusian Premier League"]),
    ("BA", ["2025–26 Premier League of Bosnia and Herzegovina"], ["Bosnia"]),
    ("BG", ["2025–26 First Professional Football League (Bulgaria)", "2025–26 Bulgarian First League"], ["Bulgaria"]),
    ("CY", ["2025–26 Cypriot First Division"], ["Cypriot First Division"]),
    ("EE", ["2026 Meistriliiga", "2025 Meistriliiga"], ["Meistriliiga"]),
    ("FO", ["2026 Faroe Islands Premier League", "2025 Faroe Islands Premier League"], ["Faroe Islands Premier League"]),
    ("FI", ["2026 Veikkausliiga", "2025 Veikkausliiga"], ["Veikkausliiga"]),
    ("GE", ["2026 Erovnuli Liga", "2025 Erovnuli Liga"], ["Erovnuli Liga"]),
    ("GI", ["2025–26 Gibraltar Football League"], ["Gibraltar Football League"]),
    ("HU", ["2025–26 Nemzeti Bajnokság I"], ["Nemzeti Bajnokság I"]),
    ("IS", ["2026 Besta deild karla", "2025 Besta deild karla"], ["Besta deild"]),
    ("IE", ["2026 League of Ireland Premier Division", "2025 League of Ireland Premier Division"], ["League of Ireland"]),
    ("IL", ["2025–26 Israeli Premier League"], ["Israeli Premier League"]),
    ("KZ", ["2026 Kazakhstan Premier League", "2025 Kazakhstan Premier League"], ["Kazakhstan Premier League"]),
    ("XK", ["2025–26 Football Superleague of Kosovo"], ["Kosovo"]),
    ("LV", ["2026 Latvian Higher League", "2025 Latvian Higher League"], ["Latvian Higher League"]),
    ("LT", ["2026 A Lyga", "2025 A Lyga"], ["A Lyga"]),
    ("LU", ["2025–26 Luxembourg National Division"], ["Luxembourg National Division"]),
    ("MT", ["2025–26 Maltese Premier League"], ["Maltese Premier League"]),
    ("MD", ["2025–26 Moldovan Super Liga"], ["Moldovan"]),
    ("ME", ["2025–26 Montenegrin First League"], ["Montenegrin First League"]),
    ("MK", ["2025–26 Macedonian First Football League"], ["Macedonian First"]),
    ("XN", ["2025–26 NIFL Premiership"], ["NIFL Premiership"]),
    ("SM", ["2025–26 Campionato Sammarinese di Calcio"], ["Sammarinese"]),
    ("SK", ["2025–26 Slovak First Football League"], ["Slovak First Football League"]),
    ("SI", ["2025–26 Slovenian PrvaLiga"], ["PrvaLiga"]),
    ("XW", ["2025–26 Cymru Premier"], ["Cymru Premier"]),
    # Oceania
    ("NZ", ["2026 New Zealand National League", "2025 New Zealand National League"], ["New Zealand National League"]),
]


def main():
    sementes = []
    for liga, titulos, exige in LIGAS:
        pais = liga.rstrip("0123456789")
        nome, itens, nome_en = PAISES[pais]
        sementes.append({
            "id": f"resto-{liga}-en", "liga": liga, "lang": "en", "pais": itens[0], "paises": itens,
            "titulos": titulos, "consultas": [titulos[0].replace("–", "-"), f"{nome_en} football league 2025-26"],
            "exige": exige,
        })
    with open("tools/europa/sementes-resto.json", "w", encoding="utf-8") as f:
        json.dump({"descricao": "Páginas de partida do robô para a 2ª divisão dos 16 países da Europa, a 1ª dos países da Europa que faltam e a da Nova Zelândia (gerado por tools/europa/sementes_resto.py).",
                   "paises": {k: {"nome": v[0], "itens": v[1]} for k, v in PAISES.items()}, "sementes": sementes},
                  f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{len(sementes)} sementes")


if __name__ == "__main__":
    main()
