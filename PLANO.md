# Proffut — Plano do jogo

> Jogo de técnico de futebol para celular, inspirado no Brasfoot.
> Documento vivo: atualize conforme as decisões forem tomadas.
> Pesquisa que embasa este plano: [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md).

---

## 1. Visão

Você é o técnico. Escolhe um clube, monta o elenco, define a tática, acompanha os jogos narrados minuto a minuto e tenta subir de divisão, ganhar títulos e ser chamado por clubes maiores. Temporada após temporada, por décadas.

**Frase-guia:** *"O Brasfoot que cabe no bolso: uma rodada em dois minutos, uma carreira de vinte anos."*

### Pilares

| Pilar | O que significa na prática |
|---|---|
| **Rápido** | Uma rodada em 1–3 min. Uma temporada inteira em menos de 1 hora. |
| **Simples de entender, difícil de dominar** | Poucos atributos e decisões claras, mas com consequências de longo prazo. |
| **Leve e offline** | Roda em celular simples, sem internet, sem conta obrigatória. |
| **Carreira longa** | Jogadores envelhecem e se aposentam, novos surgem, o técnico troca de clube. |
| **Feito para celular** | Tela em pé, uma mão, sessões curtas, salvamento automático. |

### O que pegar do Brasfoot e o que fazer diferente

| Do Brasfoot (manter) | Diferencial do Proffut |
|---|---|
| Partida em texto com placar e relógio | Interface moderna, com toque e gestos, pensada para tela em pé |
| Todos os jogos da rodada acontecendo ao mesmo tempo | Velocidade ajustável e botão "pular para o fim" |
| Poucos atributos por jogador (posição, força, características) | Explicações curtas na tela ("por que perdi?") para quem está começando |
| Divisões com acesso e rebaixamento, copas | Objetivos da diretoria claros e visíveis a cada temporada |
| Mercado, finanças e estádio simples | Salvamento automático a cada rodada e (depois) backup na nuvem |
| Propostas de emprego e demissão | Conquistas e histórico da carreira para compartilhar |
| Banco de dados editável pela comunidade | Editor dentro do próprio app, com importar/exportar pacotes |

---

## 2. Escopo do MVP (primeira versão jogável)

O MVP precisa provar uma coisa: **jogar uma temporada inteira é divertido.**

**Entra no MVP**
- 1 país fictício (inspirado no Brasil) com **2 divisões de 20 clubes** (acesso/rebaixamento de 4).
- Escolher clube e começar carreira.
- Elenco com ~25 jogadores por clube (cerca de 1.000 jogadores no total), todos fictícios e gerados.
- Escalação, formação e estilo de jogo.
- Partida ao vivo em texto, com substituições e mudança de tática durante o jogo.
- Classificação, calendário, resultados e artilharia.
- Mercado básico: comprar, vender, jogadores livres.
- Finanças básicas: bilheteria, salários, saldo.
- Fim de temporada: envelhecimento, evolução, aposentadoria e novos jogadores.
- Salvar/carregar (3 espaços + salvamento automático).

**Fica para depois**
- Copa nacional, competições continentais, mais países.
- Empréstimos, contratos detalhados, categorias de base.
- Estádio (ampliação), patrocínios.
- Demissão e propostas de outros clubes.
- Editor de banco de dados.
- Multijogador.

---

## 3. Mecânicas (design)

### 3.1 Jogador

| Campo | Detalhe |
|---|---|
| Posição | `G`, `L`, `Z`, `M`, `A` (o modelo do Brasfoot) + lado D/E |
| Força | 0–100, a habilidade geral |
| Idade | 16–40 |
| Potencial | Oculto; define até onde a força pode crescer |
| Características | 2, de uma lista de 14. **Goleiro:** Colocação, Reflexo, Saída do gol, Defesa de pênalti. **Linha:** Armação, Cabeceio, Cruzamento, Desarme, Drible, Finalização, Marcação, Passe, Resistência, Velocidade |
| Craque | Marcação especial para os melhores do mundo do jogo |
| Estado | Energia, moral, lesão (dias), cartões acumulados, suspensão |
| Contrato | Salário, data de término, valor de mercado |

**Evolução:** cresce até ~27 anos (mais rápido se joga), estabiliza até ~31 e depois cai. Aposentadoria entre 33 e 40 anos.

**Mundo sustentável:** sem jovens novos, o mundo só perde jogadores. Então cada clube recebe de 1 a 3 jovens da base por temporada. Todo clube mantém um **elenco mínimo** (15 jogadores: 2 G, 4 defensores, 4 meias, 2 atacantes), e uma venda que deixaria o clube abaixo disso é recusada. Fora a base, o jogo nunca cria jogador nem dinheiro do nada.

**Força efetiva:** é o número que entra na simulação.

```
força efetiva = força × fator de posição × fator de energia × fator de características
```

- **Posição:** o campo é um mapa de zonas vizinhas. Fora da posição, o jogador rende menos (zona vizinha ~0,92; duas zonas ~0,85; goleiro na linha ~0,65).
- **Energia:** curva (90+ → 1,00; 50 → ~0,78; 30 → ~0,50).
- **Características** que combinam com a zona dão bônus (+3% para uma, +7% para duas).
- **Na tela:** a força aparece colorida (verde, amarelo, vermelho), para o jogador ver na hora quem está mal escalado ou cansado.

### 3.2 Tática

- **Formações:** 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 4-2-4.
- **Estilo** (multiplica defesa/meio/ataque e define o gasto de energia):

| Estilo | Defesa | Meio | Ataque | Energia |
|---|---|---|---|---|
| Equilibrado | 1,00 | 1,00 | 1,00 | normal |
| Ofensivo | 0,90 | 1,00 | 1,12 | alta |
| Defensivo | 1,15 | 0,98 | 0,85 | baixa |
| Contra-ataque | 1,10 | 0,90 | 0,95 | baixa |
| Ataque total | 0,80 | 1,00 | 1,25 | muito alta |
| Posse de bola | 1,00 | 1,15 | 0,90 | baixa |

- **Marcação:** Normal / Pressão (mais chance de roubar a bola, gasta mais energia, mais cartões).
- **Onde concentrar as jogadas:** pelo meio / pelas pontas (dá vantagem a quem tem Cruzamento, Velocidade ou Cabeceio).
- **Escalação:** 11 titulares + 7 reservas, até 5 substituições.

Os multiplicadores são o ponto de partida e serão calibrados no simulador.

### 3.3 Simulação da partida

Modelo de **evento por minuto**. Foi escolhido no lugar de "sortear o placar e encenar depois" porque substituir e mudar a tática durante o jogo precisa ter efeito real.

1. Calcular a força de cada time por setor com a **força efetiva** dos titulares: **Defesa** (G, Z, L), **Meio** (M, parte dos L) e **Ataque** (A, parte dos M). Aplicar estilo, moral e fator casa.
2. A cada minuto, um evento pode acontecer (~0,12 por minuto). O **meio** decide qual time tem a iniciativa.
3. Chance → gol com probabilidade `conversão × ataque / (ataque + defesa)`. O autor é sorteado com peso por posição e características (Finalização, Cabeceio), e o goleiro (Reflexo, Colocação) pesa contra.
4. Eventos paralelos: faltas, escanteios, cartões, pênaltis, lesões, queda de energia.
5. A IA faz substituições (prioriza quem está cansado) e muda o estilo conforme o placar.

Ponto de partida das constantes: o remake em Python, que já foi calibrado (ver [estudo de referência](docs/REFERENCIA_BRASFOOT.md#31-motor-de-partida-três-abordagens)).

**Alvos de calibragem** (medidos pelo `tools/sim`):
- 2,2–2,7 gols por jogo.
- Mandante vence 42–50%, empates 22–30%.
- **Correlação entre força do elenco e pontos ≥ 0,55.** O mais forte vence com frequência, mas zebras acontecem. Abaixo disso, o campeonato vira loteria.
- Artilheiro com ~15–25 gols em 38 rodadas.
- Rodízio: a maior parte do elenco joga ao longo da temporada.

**Simulação em níveis:**
- Competições em que o jogador está: motor completo em todos os jogos, inclusive os que ele não assiste (a IA faz o papel dos técnicos).
- Ligas de outros países: modelo rápido que só gera o placar.

**Na tela:** placar, relógio, narração curta, velocidade (1x/2x/4x/pular), placares dos outros jogos da rodada mudando ao vivo e intervalo para ajustes.

> Regra técnica: a simulação usa gerador aleatório com **semente (seed)**. A mesma semente gera sempre o mesmo jogo, o que permite reproduzir bugs e escrever testes automáticos.

### 3.4 Temporada e competições

- Calendário com datas reais (fins de semana e meio de semana).
- Liga por pontos corridos, turno e returno.
- Critérios de desempate: pontos, vitórias, saldo, gols pró, confronto direto.
- Depois do MVP: Série C e D, copa nacional em mata-mata (ida e volta, pênaltis) e competições continentais com nomes fictícios.
- **Competições como dados:** formato (pontos corridos, grupos, mata-mata, folga com número ímpar de clubes) e **regras de participação** em arquivo. Exemplos de regra: "os 4 primeiros da Série A", "campeão da copa", "todos do estado X", "os 16 de maior reputação". Isso permite criar estaduais e torneios continentais sem mexer no código e prepara o editor.
- **Virada de temporada:** premiação, acesso/rebaixamento, envelhecimento, aposentadorias, novos jogadores, contratos que vencem e novo orçamento.

### 3.5 Mercado de transferências

- Busca com filtros (posição, força, idade, preço).
- Proposta = valor + salário. O clube vendedor aceita, recusa ou faz contraproposta, considerando o valor do jogador, a importância dele no elenco e a situação financeira.
- Receber propostas pelos seus jogadores.
- Jogadores livres (contrato encerrado).
- Janelas de transferência.
- Clubes da IA também negociam entre si para o mundo "girar".
- Depois do MVP: empréstimos, cláusulas, renovação de contrato.

### 3.6 Finanças

- **Receitas:** bilheteria (público × preço do ingresso; o público depende da fase do time e do tamanho da torcida e **nunca passa da capacidade do estádio**), **cota de TV fixa por rodada** (maior nas divisões de cima, para os pequenos não quebrarem), premiações, venda de jogadores e, depois, patrocínio.
- **Despesas:** salários (pagos **uma vez por mês**; pagar com mais frequência quebrou os clubes pequenos no remake estudado), manutenção do estádio e compras.
- Todo dinheiro passa por um **extrato com tipo** (bilheteria, TV, salários, transferência...). Isso alimenta a tela de finanças e ajuda a achar bugs.
- Saldo negativo traz restrições e pressão da diretoria.
- **Meta de calibragem:** numa temporada simulada, quase nenhum clube da IA termina no vermelho.
- Depois do MVP: ampliação do estádio (custo + obra de algumas semanas).

### 3.7 Carreira do técnico (pós-MVP)

- Objetivo da diretoria por temporada (não cair, ficar no meio da tabela, subir, ser campeão), calculado pela força do elenco em relação à liga. A situação aparece a cada rodada: "encaminhada", "em risco" ou "abaixo do esperado".
- **Confiança da diretoria** e **confiança da torcida** (0–100, como no Brasfoot). A da diretoria baixa demais → demissão. A da torcida afeta o público.
- Reputação do técnico → propostas de outros clubes.
- Histórico: clubes, títulos, recordes.
- Mais adiante: convite para seleção nacional.

### 3.8 Mundo e dados

- **Tudo fictício no lançamento:** clubes, cidades-sede e jogadores gerados por regras (nomes por nacionalidade, força coerente com a divisão), revisados para não coincidir com clubes reais.
- Dados em **pacotes JSON** versionados (país → divisões → clubes → jogadores).
- **Editor no app** (pós-MVP) para renomear clubes e jogadores, mudar cores e atributos, com importar/exportar pacotes. Foi assim que a comunidade manteve o Brasfoot vivo.

---

## 4. Questões legais (ler antes de qualquer coisa)

- **"Brasfoot" é marca e obra de outro desenvolvedor.** Usar só como referência de *gameplay*. Não copiar nome, telas, ícones, textos, sons nem banco de dados.
- **Nomes e escudos de clubes reais** são marcas registradas. **Nomes de jogadores reais** envolvem direito de imagem. O jogo deve sair com dados fictícios. O editor deixa cada jogador personalizar o próprio jogo.
- Antes de usar qualquer nome real, **consultar um advogado**.
- **LGPD e lojas:** se houver anúncios, analytics ou contas, é preciso ter política de privacidade publicada e preencher a seção de segurança de dados na Google Play e na App Store.

---

## 5. Tecnologia

### Recomendação: **React Native + Expo + TypeScript**

Por quê:
- O jogo é 90% **telas, listas e tabelas**, não gráficos pesados. Um framework de apps é mais produtivo aqui do que um motor de jogos.
- Um único código para **Android e iOS**.
- TypeScript é muito usado, tem muito material de apoio e é fácil de programar com ajuda de IA.
- O motor do jogo em TypeScript puro também roda no **navegador** (protótipo rápido) e no **Node** (testes e simulação em massa).
- O Expo facilita build, publicação e atualizações por OTA (EAS).

| Alternativa | Quando faria sentido |
|---|---|
| Flutter (Dart) | Igualmente boa para apps com muita interface. Escolha se preferir Dart. |
| Unity / Godot | Se a partida em 2D/3D for o centro do jogo. Mais pesados para telas de menu. |
| Kotlin nativo | Só Android. Não compensa. |

### Arquitetura

```
proffut/
├── packages/
│   ├── engine/     # regras do jogo em TypeScript puro (sem interface):
│   │               # simulação, calendário, competições, mercado, finanças, IA
│   └── data/       # gerador de mundo fictício + pacotes JSON
├── apps/
│   └── mobile/     # app Expo: telas, navegação, salvamento
└── tools/
    └── sim/        # linha de comando: simula centenas de temporadas
                    # e imprime estatísticas para calibrar o equilíbrio
```

**Princípios**
1. **O motor não conhece a interface.** O app só chama funções como `avancarDia(estado)` e `simularPartida(jogo, seed)`.
2. **Determinístico:** RNG com semente salva no estado do jogo.
3. **Estado serializável:** o jogo inteiro cabe num objeto que vira arquivo de save.
4. **Testes desde o primeiro dia** no motor (Vitest).
5. **Simulação em massa** (`tools/sim`) para balancear com números, não com "achismo".

**Bibliotecas previstas:** `expo-router` (navegação), `zustand` (estado da interface), `expo-sqlite` ou arquivo JSON compactado (saves), `@shopify/flash-list` (listas grandes), Vitest, ESLint + Prettier, GitHub Actions (CI). Depois: Sentry (erros), AdMob e compras no app.

### Modelo de dados (núcleo)

| Entidade | Principais campos |
|---|---|
| `Pais` | id, nome, divisões |
| `Competicao` | id, tipo (liga/copa), formato, regras de acesso/rebaixamento, premiação |
| `Clube` | id, nome, cores, cidade, torcida, estádio (capacidade), saldo, reputação |
| `Jogador` | id, nome, idade, nacionalidade, posição (G/L/Z/M/A), lado, força, potencial, 2 características, energia, moral, lesão, suspensão, contrato, clubeId |
| `Temporada` | ano, competições, calendário |
| `Partida` | id, data, competição, mandante, visitante, placar, eventos, seed |
| `EventoPartida` | minuto, tipo (gol, cartão, lesão, substituição...), jogadores |
| `Transferencia` | jogador, origem, destino, valor, data, tipo |
| `Tecnico` | nome, clube atual, reputação, confiança da diretoria, confiança da torcida, histórico |
| `Mensagem` | data, tipo (proposta, diretoria, notícia), conteúdo, ações |
| `EstadoDoJogo` | data atual, seed, técnico(s), mundo, temporada, configurações |

---

## 6. Telas

Navegação por abas inferiores: **Clube · Elenco · Competições · Mercado · Mais**, com um botão grande **"Avançar"** sempre visível.

1. **Início:** novo jogo, continuar, carregar, configurações.
2. **Novo jogo:** nome do técnico, país, divisão, clube.
3. **Painel do clube (hub):** próximo jogo, posição na tabela, saldo, objetivo da diretoria, caixa de mensagens.
4. **Elenco:** lista ordenável (posição, força, idade, energia, salário).
5. **Detalhe do jogador:** atributos, histórico, contrato, ações (vender, renovar, listar).
6. **Escalação e tática:** campinho com toque/arrastar, formação, estilo, marcação, reservas, força efetiva colorida.
7. **Partida ao vivo:** placar, relógio, narração, outros jogos, substituições, velocidade.
8. **Competições:** classificação, rodadas/resultados, artilharia.
9. **Mercado:** busca, filtros, propostas enviadas e recebidas.
10. **Finanças:** receitas, despesas, saldo, preço do ingresso.
11. **Mensagens:** propostas, diretoria, notícias.
12. **Histórico:** campeões, recordes, carreira do técnico.
13. **Configurações:** velocidade padrão da partida, som, idioma, saves.

---

## 7. Roteiro por fases

> Estimativas para **meio período (~10–15 h/semana) com ajuda de IA**. São só referência; o importante é a ordem.

### Fase 0 · Fundação (1–2 semanas)
- Confirmar nome, tecnologia e escopo do MVP (seção 11).
- Criar o monorepo, lint/format, testes e CI no GitHub.
- **Pronto quando:** `npm test` roda no CI e o app Expo vazio abre no celular.

### Fase 1 · Motor do jogo, sem celular (3–6 semanas)
- Modelo de dados + gerador de mundo fictício (2 divisões).
- Simulador de partida com seed.
- Calendário, liga, classificação, virada de temporada.
- `tools/sim`: simular 100 temporadas e mostrar médias de gols, % de vitória do mandante, campeões e evolução de força.
- **Pronto quando:** a linha de comando simula 10 temporadas seguidas sem erro e as estatísticas batem com os alvos da seção 3.3.

### Fase 2 · MVP jogável no celular (6–10 semanas)
- Telas 1 a 10 da seção 6, de forma simples.
- Partida ao vivo com os outros jogos da rodada.
- Mercado básico e finanças básicas.
- Salvar/carregar + salvamento automático.
- **Pronto quando:** dá para jogar 3 temporadas seguidas no celular sem travar e 5 pessoas testaram e deram retorno.

### Fase 3 · Profundidade (4–8 semanas)
- Copa nacional, Série C e D.
- Contratos, renovação, empréstimos, categorias de base.
- Objetivos da diretoria, demissão, propostas de emprego.
- Estádio e patrocínio.
- **Pronto quando:** uma carreira de 10 temporadas tem altos e baixos e troca de clube.

### Fase 4 · Conteúdo e comunidade (4–6 semanas)
- Mais países fictícios e competições continentais.
- Editor no app + importar/exportar pacotes.
- Histórico, recordes e conquistas.

### Fase 5 · Polimento e lançamento (4–6 semanas)
- Tutorial rápido (primeiros 5 minutos), ícone, identidade visual, sons.
- Desempenho em celular simples, acessibilidade (tamanho de fonte, contraste).
- Monetização (seção 8), política de privacidade, páginas da loja.
- **Teste fechado na Google Play** (ver seção 9) → lançamento Android.

### Fase 6 · Depois do lançamento
- iOS.
- Multijogador local (vários técnicos no mesmo celular, revezando, como no Brasfoot).
- Backup na nuvem, temporadas temáticas, partida em 2D simples (opcional).
- Ligas online entre amigos (avaliar custo de servidor antes).

**Total até o lançamento no Android:** cerca de 6 a 9 meses em meio período.

---

## 8. Monetização

Modelo parecido com o do Brasfoot (versão gratuita + versão registrada). O Brasfoot de PC ficou gratuito em novembro de 2025, então cobrar desde o início seria difícil.

- **Grátis com anúncios** (intersticial no máximo a cada N rodadas, nunca durante a partida).
- **Proffut Pro, compra única:** remove anúncios e libera extras (editor, mais espaços de save, estatísticas avançadas).
- **Nada de pagar para ganhar:** não vender dinheiro do clube, jogadores ou força.

**Custos fixos:** Google Play US$ 25 (uma vez), Apple Developer US$ 99/ano (só quando for para iOS). O plano gratuito do Expo EAS basta no início.

---

## 9. Lançamento

- **Android primeiro:** no Brasil, o Android tem ~75% dos celulares e o iOS ~25% ([Statcounter, ago/2026](https://gs.statcounter.com/os-market-share/mobile-tablet/brazil)).
- **Conta pessoal nova na Google Play** precisa rodar um **teste fechado com pelo menos 12 testadores, inscritos por 14 dias seguidos**, antes de liberar a produção ([Ajuda do Play Console](https://support.google.com/googleplay/android-developer/answer/14151465)). Começar a juntar testadores (amigos, grupos de futebol, comunidades de jogos de técnico) já na Fase 2.
- Página da loja: capturas da partida ao vivo e do painel, vídeo curto, palavras-chave ("técnico de futebol", "manager", "brasileirão" com cuidado de marca).

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Jogo desequilibrado (muitos gols, time grande sempre ganha, economia quebra) | `tools/sim` + alvos numéricos + testes automáticos |
| Escopo crescer demais e nunca lançar | MVP fechado; tudo o mais vai para a lista "depois" |
| Lento com muitos jogadores e ligas | Simular em detalhe só as ligas do usuário; nas outras, resultado rápido |
| Problemas legais com nomes reais | Dados fictícios + editor; consultar advogado |
| Jogador abandona cedo | Primeiros 5 minutos guiados, objetivos claros, rodadas curtas |
| Perda de save | Salvamento automático, saves versionados, migração entre versões |

**Concorrência:**
- **Brasfoot:** PC gratuito desde nov/2025, sem atualização oficial desde 2023, mantido pela comunidade. A edição para celular tem limitações. Existe público fiel e espaço para um jogo no estilo, moderno e atualizado.
- **Remakes e projetos abertos** estudados: ver [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md).
- **Ainda para estudar:** Elifoot, Football Manager Mobile, Top Eleven, Soccer Manager.

---

## 11. Decisões em aberto

1. **Nome:** "Proffut" é o nome final ou provisório?
2. **Tecnologia:** confirmar React Native + Expo + TypeScript.
3. **Divisão do trabalho:** quanto tempo por semana você tem? Você vai programar, ou a IA programa e você testa, revisa e decide?
4. **Partida:** só texto (como o Brasfoot) ou planejar um 2D simples para o futuro?
5. **Mundo inicial:** um país fictício inspirado no Brasil está bom para o MVP?
6. **Monetização:** grátis com anúncios + Pro, ou pago desde o início?

---

## 12. Próximos passos

1. Revisar e ajustar este plano (principalmente a seção 11).
2. Fase 0: criar a estrutura do repositório e o CI.
3. Fase 1, primeiro marco: **gerador de mundo + simulador de partida + linha de comando que simula uma temporada e imprime a tabela.**
