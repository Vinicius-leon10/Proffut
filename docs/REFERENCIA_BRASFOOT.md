# Estudo de referência: Brasfoot e projetos abertos

> Pesquisa feita em 24/10/2026.
> Objetivo: entender como o Brasfoot funciona e como outros projetos resolveram os mesmos problemas, para decidir como fazer o Proffut.
> **Não vamos copiar código, textos, arte nem dados de nenhum deles.** Veja a seção 5.

---

## 1. O que foi analisado

| Projeto | O que é | Tecnologia | Licença | Utilidade |
|---|---|---|---|---|
| [denisvick-dev/brasfoot](https://github.com/denisvick-dev/brasfoot) | Remake com 4 séries, Copa do Brasil, regionais e Supercopa. Motor **calibrado com números** e bem documentado. Ativo (out/2026). | Python + Streamlit | MIT | ⭐⭐⭐ motor, economia, rotina |
| [HaterGit/brasfootweb](https://github.com/HaterGit/brasfootweb) | Remake web. O modelo de jogador é o mais parecido com o do Brasfoot (força + 2 características, zonas de campo, táticas em 3 eixos). Tem editor de competições. Ativo (set/2026). | PHP + JS + MySQL | sem licença | ⭐⭐⭐ jogador, tática, editor |
| [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | Jogo de técnico open source maduro, inspirado em Brasfoot, Bygfoot e Football Manager. Documentação técnica extensa. | Rust + React (Tauri) | GPLv3 | ⭐⭐⭐ arquitetura, mundo sustentável |
| [SBD1/grupo7-brasfoot](https://github.com/SBD1/grupo7-brasfoot) | Trabalho de faculdade (UnB, 2022) que modela o banco de dados do Brasfoot. | PostgreSQL | sem licença | ⭐⭐ confirma o modelo de dados |
| [gabrielnaoto/brasfoot](https://github.com/gabrielnaoto/brasfoot) | App Android de faculdade (UDESC, 2016) com 8 times. | Java/Android | sem licença | ⭐ simples demais |

**Não analisados:**
- `Mikaelbfaa/OpenFoot`: o repositório não está mais acessível.
- `matheustriskin/brasfoot-2.0`: distribui o executável original do Brasfoot. **Evitar.**
- Ports para Linux/Mac (`pedro-grajau/brasfoot-linux`, `codenicolai/brasfoot_mac`): só empacotam o jogo original.

---

## 2. Como o Brasfoot funciona

Dois projetos independentes (o remake web e o trabalho da UnB) chegaram ao **mesmo modelo de jogador**. Isso dá boa confiança de que é o modelo do Brasfoot.

### Jogador
- **Posição:** `G` (goleiro), `L` (lateral), `Z` (zagueiro), `M` (meio-campo), `A` (atacante).
- **Lado:** `D` ou `E`.
- **Força:** um único número de 0 a 100.
- **2 características**, escolhidas de uma lista de 14:

| Goleiro (4) | Linha (10) |
|---|---|
| Colocação, Reflexo, Saída do gol, Defesa de pênalti | Armação, Cabeceio, Cruzamento, Desarme, Drible, Finalização, Marcação, Passe, Resistência, Velocidade |

- Também tem: energia (0–100), idade, salário, fim do contrato e valor de mercado.

### Técnico
- **Confiança da diretoria** e **confiança da torcida** (0–100).

### Clube
- Estádio com capacidade. O **preço do ingresso** é definido pelo técnico.

### Competições e mercado
- Ligas e copas com campeão, vice e artilheiro.
- Mercado de compra, venda e **empréstimo**.

### Situação atual do Brasfoot
- A versão de PC ficou **gratuita** (registro liberado) em novembro de 2025. Não há atualização oficial desde 2023, e a comunidade mantém versões não oficiais. A edição para celular existe, mas com limitações ([TecMundo](https://www.tecmundo.com.br/voxel/502903-brasfoot-libera-registro-gratis-veja-como-baixar-e-jogar-atualmente.htm), [Tribuna de Minas](https://tribunademinas.com.br/colunas/maistendencias/?p=49965)).
- **Oportunidade:** existe público fiel, mas nenhum jogo nesse estilo que seja moderno, feito para celular e atualizado.

---

## 3. Lições de cada projeto

### 3.1 Motor de partida: três abordagens

| Abordagem | Onde | Prós | Contras |
|---|---|---|---|
| **Evento por minuto.** Cada minuto pode gerar um evento; uma chance vira gol com probabilidade `conversão × ataque / (ataque + defesa)` | denisvick | Narração natural; substituição e mudança de tática no meio do jogo funcionam de verdade | Várias constantes para calibrar |
| **Poisson.** Sorteia o número de gols a partir da força; os minutos são sorteados depois | brasfootweb | Simples; estatística realista | O "ao vivo" é encenação: o resultado já está decidido, então substituições não mudam nada |
| **Zonas + ações.** 5 zonas, 1–3 ações por minuto (passe, desarme, chute) | openfootmanager | Rico, gera estatísticas detalhadas; ~2 ms por partida | Mais complexo de fazer e calibrar |

**Para o Proffut: evento por minuto.** Substituir e mudar a tática durante o jogo é central na experiência do Brasfoot, e o modelo Poisson não permite isso. Depois do MVP dá para evoluir para zonas.

**A lição mais valiosa: calibrar com números.** No remake em Python, a conversão em gol era fixa em 15% e o campeonato virou loteria (a força do elenco quase não influenciava a pontuação). Quando a conversão passou a depender de ataque × defesa, mudou tudo. Medido em 5 temporadas de 20 clubes:

| Métrica | Antes | Depois | Meta deles |
|---|---|---|---|
| Gols por jogo | 0,85 | 2,52 | 2,2 – 2,7 |
| Empates | 49,3% | 25,3% | 22 – 30% |
| Vitórias do mandante | 26,1% | 44,2% | 42 – 50% |
| **Correlação força do elenco × pontos** | 0,19 | **0,71** | ≥ 0,55 |
| Artilheiro em 38 rodadas | 9 gols | 15 gols | — |
| Jogadores usados na temporada | — | 404 de 440 | — |

Constantes deles, como **ponto de partida** para a nossa calibragem:
- ~0,12 evento por minuto (cerca de 11 por jogo). Distribuição dos eventos: chance 58%, escanteio 20%, falta 14%, cartão 8%.
- Conversão máxima de 0,74 × ataque/(ataque+defesa). Em confronto equilibrado, isso dá ~37% por chance.
- Mandante: +11 no ataque, +5 na defesa.
- Tática: cada ponto de ofensividade acima do neutro soma 0,22 no ataque e tira 0,18 da defesa.
- Desgaste por jogo: 20–35 de energia. Recuperação por rodada: 12–26. Lesão: 3% por jogador por jogo.

### 3.2 Força efetiva (remake web)

O número que entra na simulação não é a força "crua" do jogador:

```
força efetiva = força × fator de posição × fator de energia × fator de características
```

- **Posição:** o campo é um mapa de zonas vizinhas.
  - Na própria zona: 1,00. Zona vizinha: 0,92. Duas zonas de distância: 0,85. Três: 0,75.
  - Goleiro na linha ou jogador de linha no gol: 0,65.
- **Energia:** curva, não linha reta.
  - 90+ → 1,00 · 70 → 0,94 · 50 → 0,78 · 30 → 0,50 · <10 → 0,10.
- **Características:** se combinam com a zona onde o jogador atua, dão bônus (1 característica → +3%, 2 → +7%). Exemplos: Finalização e Cabeceio para centroavante; Velocidade e Cruzamento para lateral.
- **Na tela:** a força aparece colorida (verde = rendimento cheio, amarelo, vermelho, preto = muito abaixo). É uma ótima ideia de interface: o jogador vê na hora quem está mal escalado ou cansado.

### 3.3 Tática

O remake web e o openfootmanager chegaram a tabelas parecidas:

| Estilo | Defesa | Meio | Ataque | Energia gasta |
|---|---|---|---|---|
| Equilibrado | 1,00 | 1,00 | 1,00 | normal |
| Ofensivo | 0,90 | 1,00 | 1,12 | alta |
| Defensivo | 1,15 | 0,98 | 0,85 | baixa |
| Contra-ataque | 1,10 | 0,90 | 0,95 | baixa |
| Ataque total | 0,80 | 1,00 | 1,25 | muito alta |
| Posse de bola | 1,00 | 1,15 | 0,90 | baixa |

Além do estilo, o remake web tem mais dois eixos: **marcação** (normal ou pressão) e **onde concentrar as jogadas** (pelo meio ou pelas pontas).

### 3.4 Rotina entre rodadas e IA

- A energia recupera a cada rodada. Um lesionado tem ~22% de chance de se recuperar por rodada. Três amarelos = um jogo de suspensão.
- **A IA escala considerando o cansaço:** `força × (0,6 + 0,4 × energia/100)`. Isso cria rodízio natural (404 de 440 jogadores foram usados numa temporada).
- No remake web, a IA troca o titular com energia abaixo de 70 por um reserva acima de 80.

### 3.5 Economia (denisvick)

Problemas que eles encontraram e como resolveram:
- O público passava da capacidade do estádio → limitar à capacidade.
- Pagar salário a cada 4 rodadas quebrava os clubes pequenos → pagar uma vez por "mês" (6 rodadas).
- Na última divisão, a bilheteria não paga a folha → **cota de TV fixa por rodada**, maior nas divisões de cima.
- Todo dinheiro passa por um **extrato** com tipo: bilheteria, TV, patrocínio, salários, transferência, premiação, estádio. Isso facilita a tela de finanças e encontrar bugs.

| Série | Cota de TV por rodada | Patrocínio por mês |
|---|---|---|
| A | R$ 450 mil | R$ 3 mi |
| B | R$ 260 mil | R$ 900 mil |
| C | R$ 190 mil | R$ 350 mil |
| D | R$ 120 mil | R$ 120 mil |

Ingresso entre R$ 40 e R$ 90.

### 3.6 Um mundo que não se esgota (openfootmanager)

- **Sem categoria de base, o mundo só perde jogadores.** As aposentadorias superam as revelações e, em poucas temporadas, os clubes ficam sem gente. Solução: todo clube recebe de 1 a 3 jovens por temporada.
- **Elenco mínimo:** pelo menos 15 jogadores, sendo 2 goleiros, 4 defensores, 4 meias e 2 atacantes. Uma venda que deixaria o clube abaixo disso é recusada.
- **O jogo não cria dinheiro nem jogadores do nada**, exceto pelos jovens da base.
- O remake em Python **não tem envelhecimento nem evolução**: depois de algumas temporadas, o mundo fica parado. É exatamente o que precisamos evitar.

### 3.7 Simulação em níveis (openfootmanager)

- **Competições do jogador:** motor completo, minuto a minuto, mesmo nos jogos que ele não está assistindo (a IA faz o papel dos técnicos).
- **Resto do mundo:** um modelo barato que só gera o placar.
- Assim o jogo continua rápido mesmo com muitos países.

### 3.8 Competições configuráveis (remake web)

Os participantes de uma competição são definidos por **regras**, não por uma lista fixa:
- todos do país, do estado ou da região;
- os N melhores por força ou por reputação;
- os N primeiros de uma divisão;
- o campeão de outra competição;
- clubes específicos.

Isso permite montar estaduais, copas e torneios continentais **como dados**, e é a base de um editor.

O remake em Python mostra os formatos reais que o motor precisa suportar: grupos, mata-mata em ida e volta, folga quando o número de clubes é ímpar, pênaltis.

### 3.9 Sorte reproduzível

- O remake em Python mostra na tela o "Sorteio #" (a semente) de cada rodada. Com o mesmo número, a rodada se repete exatamente igual.
- O openfootmanager deriva a semente de cada sorteio a partir do save, do assunto e da data. Por exemplo, "base do clube X em 01/07". Assim, recarregar o jogo repete os mesmos resultados, mas duas carreiras diferentes não ficam iguais.

### 3.10 Diretoria

Metas por série no remake em Python:

| Série | Meta |
|---|---|
| A | terminar entre os 6 primeiros |
| B | subir (top 4) |
| C | subir (top 4) |
| D | terminar entre os 8 primeiros do grupo |

A situação aparece rodada a rodada: "encaminhada", "em risco" ou "abaixo do esperado".

### 3.11 Filosofia (openfootmanager)

- **O mundo é feito de dados criados pelos jogadores** (pacotes + editor), não de uma base licenciada.
- **Profundidade opcional:** quem quer só jogar uma temporada rápida e quem quer controlar tudo devem se sentir em casa. Quando os dois estilos entram em conflito, a solução é uma opção nas configurações.
- **Acessibilidade é requisito, não acabamento.** Jogos de técnico são texto e tabelas, e jogadores cegos usam leitores de tela para jogar.

---

## 4. O que isso muda no Proffut

Aplicado no [PLANO.md](../PLANO.md):

1. **Jogador no modelo do Brasfoot:** G/L/Z/M/A + lado + força 0–100 + 2 das 14 características.
2. **Força efetiva** (posição × energia × características), mostrada com cor na tela.
3. **Tática em 3 eixos:** estilo (6 opções), marcação e onde concentrar as jogadas. Cada estilo tem seu gasto de energia.
4. **Motor de evento por minuto.** Ponto de partida: as constantes do remake em Python. Nova meta: **correlação força × pontos ≥ 0,55**.
5. **Simulação em níveis:** motor completo nas competições do jogador e placar rápido no resto.
6. **Economia:** cota de TV fixa por rodada, salário mensal, público limitado ao estádio, extrato com tipo.
7. **Mundo sustentável:** envelhecimento, evolução, aposentadoria, base de 1–3 jovens por clube por temporada e elenco mínimo.
8. **Competições como dados**, com regras de participação. Isso já prepara o editor.
9. **Confiança da diretoria e da torcida.**
10. **Mercado:** com o Brasfoot de PC gratuito, cobrar desde o início fica mais difícil. Confirma o modelo grátis + Pro.

---

## 5. Licenças e limites

- **Ideias e mecânicas de jogo não são protegidas por direito autoral.** Código, textos, arte, sons e bancos de dados são. Na dúvida, consultar um advogado.
- **denisvick-dev/brasfoot (MIT):** permite reutilizar com crédito. Como é Python e o Proffut será TypeScript, vamos usar só as ideias e as constantes como ponto de partida.
- **openfootmanager (GPLv3):** só ideias. Copiar código obrigaria o Proffut inteiro a ser GPL.
- **brasfootweb, grupo7-brasfoot e gabrielnaoto/brasfoot (sem licença):** sem licença, todos os direitos são reservados. Só ideias.
- **Brasfoot original:** nunca descompilar, nunca usar o executável, os dados, as imagens ou os textos.
