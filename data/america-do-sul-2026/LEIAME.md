# Dados: América do Sul 2026

A primeira divisão de 2026 dos outros 9 países da Conmebol: Argentina, Bolívia, Chile, Colômbia, Equador, Paraguai, Peru,
Uruguai e Venezuela.

| Arquivo | Conteúdo |
|---|---|
| `clubes.json` | Os clubes (ficha no formato de `data/brasil-2026/clubes.json`, com `pais`) |
| `jogadores.json` | Elencos reais (nome, posição, lado, idade, nacionalidade quando não é a do país e a força calculada pelo Proffut) |

Montados por `tools/times/montar.ts` a partir do que o robô `.github/workflows/elencos.yml` (fase "times") baixa para a
branch `dados-times`.

| Dado | De onde vem |
|---|---|
| Quem joga cada liga | [Wikipédia](https://www.wikipedia.org) (CC BY-SA): as páginas de 2026 em inglês e em espanhol (seções dos grupos e dos participantes); fica a lista com o número de clubes mais perto do que a liga tem em 2026 |
| Ficha do clube | Wikipédia (nome comum, cores do uniforme, estádio, capacidade, fundação) e [Wikidata](https://www.wikidata.org) (CC0) |
| Elenco | O elenco atual das páginas dos clubes na Wikipédia (em espanhol, com o nascimento; em inglês, com a posição e a nacionalidade), completado pelo Wikidata (nascimento, posição, pé) e, na Argentina e na Colômbia, pelo [transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) (CC0: posição exata, nascimento, pé e valor de mercado) |
| Força | **Calculada pelo Proffut**: a faixa do clube (pelo país e pela fama do clube: valor do elenco na Argentina e na Colômbia, número de Wikipédias com a página do clube nos outros, com os grandes de cada país no topo) e, dentro dela, quanto o jogador vale e é conhecido |

**Nada vem do Brasfoot** nem de notas de outros jogos. As características (velocidade, finalização...) são sorteadas pelo
jogo. Os escudos ainda não existem: o jogo desenha um com as cores e a sigla (lista dos que faltam em `docs/TIMES_NOVOS.md`).
