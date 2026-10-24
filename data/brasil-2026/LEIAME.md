# Dados: Brasil 2026

Clubes e regulamentos das Séries A, B e C do Campeonato Brasileiro de 2026.

| Arquivo | Conteúdo |
|---|---|
| `clubes.json` | Os 60 clubes das Séries A, B e C (20 cada) |
| `serie-d-reserva.json` | 96 clubes da Série D. Não são simulados: servem de reserva para quem sobe para a Série C |
| `competicoes.json` | Regulamento de cada série em 2026 |
| `jogadores.json` | **Ainda não existe** (ver "Jogadores" abaixo) |

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

Não usamos escudos oficiais, que são marcas registradas. A interface desenha um escudo simples com as cores e a sigla do clube.

## Jogadores

Ainda não há elencos. **Não vamos tirar jogadores dos arquivos do Brasfoot.** A força e as características de cada jogador são trabalho dos autores do Brasfoot (ou dos fãs que fazem as atualizações) e estão protegidas. Além disso, os arquivos oficiais não são atualizados desde 2023. As opções estão na seção 11 do [PLANO.md](../../PLANO.md).

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
