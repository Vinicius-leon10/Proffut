# Dados: Brasil 2026

Clubes e regulamentos das Séries A, B e C do Campeonato Brasileiro de 2026.

| Arquivo | Conteúdo |
|---|---|
| `clubes.json` | Os 60 clubes das Séries A, B e C (20 cada) |
| `serie-d-reserva.json` | 96 clubes da Série D. Não são simulados: servem de reserva para quem sobe para a Série C |
| `competicoes.json` | Regulamento de cada série em 2026 |
| `jogadores.json` | Elencos reais dos 60 clubes (nome, posição, lado, idade, nacionalidade e a força calculada pelo Proffut). Ver "Jogadores" abaixo |

## O que foi conferido

**Quais clubes estão em cada série:** conferido com reportagens de 2026. As 60 participações batem exatamente.
- Série A: [90min](https://www.90min.com/pt-br/quando-comeca-campeonato-brasileiro-2026), [Bem Paraná](https://www.bemparana.com.br/esporte/campeonato-brasileiro-156-equipes-2026-times-series-a-b-c-e-d/)
- Série B: [TNH1](https://www.tnh1.com.br/noticia/nid/serie-b-2026-tem-seus-20-participantes-definidos/)
- Série C: [Itatiaia](https://www.itatiaia.com.br/esportes/futebol/futebol-nacional/brasileirao-serie-c/veja-todos-os-clubes-que-disputarao-a-serie-c-do-campeonato-brasileiro-em-2026/), [Band](https://www.band.com.br/esportes/brasileirao-serie-c-de-2026-tem-os-20-clubes-definidos-veja-a-lista-202511241122)

**Regulamentos:**
- Série A: 38 rodadas, caem 4.
- Série B: 38 rodadas. Os 2 primeiros sobem direto. Do 3º ao 6º há playoff em ida e volta (3º × 6º, 4º × 5º), com a volta na casa de quem fez melhor campanha. Caem 4 ([Bahia Notícias](https://www.bahianoticias.com.br/esportes/noticia/77999-playoffs-da-serie-b-2026-como-funciona-a-nova-disputa-pelo-acesso), [O Povo](https://www.opovo.com.br/esportes/futebol/brasileirao-serie-b/2026/03/19/serie-b-2026-entenda-novo-regulamento-e-media-para-acesso-e-descenso.html)). O critério de desempate do playoff não foi confirmado.
- Série C: primeira fase em turno único (19 rodadas). Os 8 melhores vão para dois quadrangulares (1º, 4º, 5º, 8º e 2º, 3º, 6º, 7º) em ida e volta. Sobem os 2 primeiros de cada grupo, e os líderes fazem a final. Em 2026 caem só 2 ([O Povo](https://www.opovo.com.br/agencia/jogada10/2026/04/03/serie-c-2026-tem-novidade-8220medalhoes-8221-e-clube-estreante-veja-mais.html), [Band](https://www.band.com.br/nacional/brasil/ponte-preta-e-guarani-entenda-os-regulamentos-das-series-b-e-c-de-2026)).

**Fichas dos clubes** (estádio, capacidade, cores, fundação, rival, torcida, reputação, faixa de força, caixa): vêm do remake [denisvick-dev/brasfoot](https://github.com/denisvick-dev/brasfoot) (licença MIT) e **não foram conferidas uma a uma**. Torcida, reputação, força e caixa são estimativas de jogo, não números reais. Correções feitas:
- Bragantino → "Red Bull Bragantino", estádio Nabi Abi Chedid.
- Estádio do Mirassol → José Maria de Campos Maia (Maião).
- Cor secundária do Avaí → branco.

Os scripts que geram os arquivos estão em `tools/dados/`.

## Escudos

Os escudos ficam em `public/escudos/` (um `<id>.png` por clube), recortados de uma prancha que o dono do projeto mandou
(out/2026), para seu uso pessoal. Os escudos são marcas registradas e pertencem aos clubes. Se faltar a imagem de um
clube, a interface desenha um escudo simples com as cores e a sigla dele.

## Jogadores

`jogadores.json` é montado por `tools/elencos/montar.ts` a partir dos dados que o robô `.github/workflows/elencos.yml`
baixa (branch `dados-elencos`). Para atualizar: rodar o workflow "Baixar dados dos elencos" no GitHub, baixar a branch
e rodar `npx tsx tools/elencos/montar.ts <pasta da branch>`. O relatório mostra de onde veio cada dado e quanto a
dedução das posições acerta.

| Dado | De onde vem |
|---|---|
| Quem está em cada clube da Série A | [Cartola FC](https://cartola.globo.com) (mercado da rodada em que o robô rodou) |
| Quem está em cada clube das Séries B e C | Súmulas da CBF de 2025 (último clube em que jogou), lidas pelo programa do [BrazilianFootball/data](https://github.com/BrazilianFootball/data) (MIT). O site da CBF não entrega as súmulas de 2026 ao robô do GitHub, então contratações de 2026 ficam de fora |
| Posição | Cartola na Série A; nas outras, súmula (goleiros), Transfermarkt ou Wikidata e, quando nenhum informa, deduzida das escalações de 2023 a 2025 (camisa, substituições, gols e formação: acerta cerca de 3 em 4, e 4 em 5 entre os titulares) |
| Idade e nacionalidade | [transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) (CC0) e [Wikidata](https://www.wikidata.org) (CC0); sem eles, a idade é estimada pelo número de registro na CBF (erro típico de pouco mais de 1 ano) |
| Força | **Calculada pelo Proffut**: a faixa do clube (`clubes.json`) e, dentro dela, quanto o jogador joga (titular, entradas, jogos no Cartola) e quanto vale (preço no Cartola, valor no Transfermarkt) |

**Nada vem do Brasfoot** (nem força, nem características, nem listas de jogadores) nem de notas de outros jogos.
As características (velocidade, finalização...) são sorteadas pelo jogo, como antes.

## Licença dos dados derivados

As fichas dos clubes derivam de `game/clubes.py` do projeto denisvick-dev/brasfoot:

```
MIT License

Copyright (c) 2026 denisvick-dev e colaboradores do Brasfoot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Os elencos usam as súmulas lidas pelo programa do projeto BrazilianFootball/data:

```
MIT License

Copyright (c) 2023 Igor Patrício Michels

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

transfermarkt-datasets e Wikidata são de domínio público (CC0). Os dados do Cartola são da Globo; usamos só nome,
posição, clube, jogos e preço do mercado, para um jogo pessoal e sem fins comerciais.
