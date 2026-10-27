# Proffut — Plano do jogo

> Jogo de técnico de futebol, inspirado no Brasfoot, que roda no **navegador do celular** e pode ser **instalado na tela inicial do iPhone** como se fosse um app.
> Documento vivo: atualize conforme as decisões forem tomadas.
> Pesquisa que embasa este plano: [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md).

---

## 0. Situação atual (out/2026)

**O MVP está pronto, jogável e publicado** em https://vinicius-leon10.github.io/Proffut/ (Fases 0, 1 e 2 do roteiro):
- Site instalável no iPhone, funciona offline, save no aparelho com exportar/importar.
- Séries A, B e C de 2026 com os regulamentos reais, partida ao vivo, tática, mercado, finanças, diretoria e virada de temporada.
- Estádio: ampliar a capacidade ou modernizar (conforto atrai mais público), com obra em semanas.
- Rebaixado para a Série D, o técnico recebe propostas de clubes da Série C.
- Motor calibrado com `npm run sim`: 2,2–2,4 gols por jogo, mandante vence 42–45%, empates 25–29%, correlação força × pontos 0,57–0,79, nenhum clube no vermelho.
- Checagem automática: no app (sozinha ao abrir um jogo e em Configurações) e no GitHub (testes de ponta a ponta R01… com tela de iPhone, inclusive sem internet, a cada alteração, antes de publicar e todo dia; lista em `tests/README.md`). 16 testes do motor.

**Pendências:**
- **Elencos reais de 2026:** a rede do ambiente de desenvolvimento bloqueia a Wikipédia (`pt.wikipedia.org`). Falta o usuário escolher: liberar esse endereço na rede do ambiente ou colar as listas. Os elencos entram como `data/brasil-2026/jogadores.json` (força e características dadas por nós), lidos em `novoJogo` no lugar dos gerados.
- Próximas fases: Copa do Brasil, contratos e renovação, demissão por maus resultados, editor.

---

## 1. Visão

Você é o técnico. Escolhe um clube, monta o elenco, define a tática, acompanha os jogos narrados minuto a minuto e tenta subir de divisão, ganhar títulos e ser chamado por clubes maiores. Temporada após temporada, por décadas.

**Frase-guia:** *"O Brasfoot que cabe no bolso: uma rodada em dois minutos, uma carreira de vinte anos."*

### Pilares

| Pilar | O que significa na prática |
|---|---|
| **Rápido** | Uma rodada em 1–3 min. Uma temporada inteira em menos de 1 hora. |
| **Simples de entender, difícil de dominar** | Poucos atributos e decisões claras, mas com consequências de longo prazo. |
| **Abre em qualquer celular** | É um site: basta um link. No iPhone, "Adicionar à Tela de Início" faz ele abrir em tela cheia, como app. |
| **Seu jogo fica no seu celular** | O save fica guardado no próprio aparelho, funciona sem internet depois de aberto, sem conta e sem servidor. |
| **Carreira longa** | Jogadores envelhecem e se aposentam, novos surgem, o técnico troca de clube. |
| **Feito para celular** | Tela em pé, uma mão, sessões curtas, salvamento automático. |

### O que pegar do Brasfoot e o que fazer diferente

| Do Brasfoot (manter) | Diferencial do Proffut |
|---|---|
| Partida em texto com placar e relógio | Interface moderna, com toque e gestos, pensada para tela em pé |
| Todos os jogos da rodada acontecendo ao mesmo tempo | Velocidade ajustável e botão "pular para o fim" |
| Poucos atributos por jogador (posição, força, características) | Explicações curtas na tela ("por que perdi?") para quem está começando |
| Divisões com acesso e rebaixamento, copas | Objetivos da diretoria claros e visíveis a cada temporada |
| Mercado, finanças e estádio simples | Salvamento automático a cada rodada e backup em arquivo |
| Propostas de emprego e demissão | Conquistas e histórico da carreira para compartilhar |
| Banco de dados editável pela comunidade | Editor dentro do próprio jogo, com importar/exportar pacotes |

---

## 2. Escopo do MVP (primeira versão jogável)

O MVP precisa provar uma coisa: **jogar uma temporada inteira é divertido.**

**Entra no MVP**
- **Brasil 2026: Séries A, B e C**, com os 60 clubes reais e os regulamentos reais de 2026 (ver [data/brasil-2026](data/brasil-2026/LEIAME.md)).
  - A Série D não é jogada. Uma lista reserva com os clubes da Série D fornece quem sobe para a Série C.
- Escolher clube e começar carreira.
- Elenco com ~28 jogadores por clube (cerca de 1.700 no total). **Reais** desde out/2026: ver `data/brasil-2026/LEIAME.md` (seção "Jogadores").
- Escalação, formação e estilo de jogo.
- Partida ao vivo em texto, com substituições e mudança de tática durante o jogo.
- Classificação, calendário, resultados e artilharia.
- Mercado básico: comprar, vender, jogadores livres.
- Finanças básicas: bilheteria, salários, saldo.
- Fim de temporada: acesso/rebaixamento, envelhecimento, evolução, aposentadoria e novos jogadores.
- Salvar no celular (3 espaços + salvamento automático) e exportar/importar o save em arquivo.
- Instalável na tela inicial do iPhone e do Android.

**Fica para depois**
- Copa do Brasil, estaduais, Série D jogável, competições continentais, outros países.
- Empréstimos, contratos detalhados, categorias de base.
- Estádio (ampliação), patrocínios.
- Demissão e propostas de outros clubes.
- Editor de banco de dados.
- Versão nas lojas (Google Play / App Store).
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
- Competições de fora (no futuro: Série D, outros países): modelo rápido que só gera o placar.

**Na tela:** placar, relógio, narração curta, velocidade (1x/2x e "Fim" para pular; a 4x saiu em out/2026 a pedido do usuário), placares dos outros jogos da rodada mudando ao vivo e intervalo para ajustes.

> Regra técnica: a simulação usa gerador aleatório com **semente (seed)**. A mesma semente gera sempre o mesmo jogo, o que permite reproduzir bugs e escrever testes automáticos.

### 3.4 Temporada e competições

Regulamentos reais de 2026 ([competicoes.json](data/brasil-2026/competicoes.json)):

| Série | Formato | Sobem | Caem |
|---|---|---|---|
| A | 38 rodadas, pontos corridos | — | 4 |
| B | 38 rodadas + playoff (3º × 6º e 4º × 5º, ida e volta) | 2 direto + 2 do playoff | 4 |
| C | 19 rodadas (turno único) → 2 quadrangulares com os 8 melhores (ida e volta) → final | 2 de cada quadrangular | 2 (em 2026) |

- Calendário com datas reais (fins de semana e meio de semana).
- Critérios de desempate: pontos, vitórias, saldo, gols pró, confronto direto, cartões, sorteio.
- Para quem cai da Série C, sobem clubes da **lista reserva da Série D**, sorteados com peso pela força. Assim cada série fica sempre com 20 clubes.
- Depois do MVP: Copa do Brasil (mata-mata, ida e volta, pênaltis), estaduais, Série D jogável e competições continentais.
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

- **Clubes reais do Brasil 2026** (Séries A, B e C) em [data/brasil-2026](data/brasil-2026/LEIAME.md): nome, sigla, cidade, estádio, capacidade, cores, fundação, rival, torcida, reputação, faixa de força e caixa inicial.
- **Escudos:** os do jogo são os que o usuário mandou (out/2026, decisão dele: "Não, quero que use os escudos que mandei agora. O app é particular, uso individual. Use os escudos que mandei, é uma ordem"); sem imagem, a interface desenha um escudo simples com as cores e a sigla do clube.
- **Jogadores:** decisão pendente (seção 11). Não vamos tirar dos arquivos do Brasfoot (ver seção 4).
- Dados em **pacotes JSON** versionados (país → divisões → clubes → jogadores).
- **Editor no jogo** (pós-MVP) para renomear clubes e jogadores, mudar cores e atributos, com importar/exportar pacotes. Foi assim que a comunidade manteve o Brasfoot vivo.

---

## 4. Questões legais (ler antes de qualquer coisa)

- **"Brasfoot" é marca e obra de outro desenvolvedor.** Usar só como referência de *gameplay*. Não copiar nome, telas, ícones, textos, sons nem banco de dados. Em especial, **não vamos extrair jogadores dos arquivos do Brasfoot**: a força e as características de cada jogador são trabalho dos autores (ou dos fãs que atualizam os arquivos).
- **Decisão tomada: nomes reais dos clubes.** Fatos como "o Flamengo está na Série A de 2026" são públicos. Escudos e marcas, não: por isso o jogo **não usava escudos oficiais**, até o usuário decidir usar os que mandou (out/2026, uso pessoal; avisado de que o site é público).
- **Nomes de jogadores reais** envolvem direito de imagem (Lei Pelé). O risco é baixo num projeto pessoal e gratuito e aumenta se o jogo tiver anúncios ou for vendido.
- **Antes de ganhar dinheiro com o jogo, consultar um advogado.**
- **LGPD:** enquanto o save ficar só no celular e não houver anúncios, analytics ou contas, não coletamos dados pessoais. Se isso mudar, é preciso publicar uma política de privacidade.

---

## 5. Tecnologia

### Decisão: **site (PWA) com React + TypeScript + Vite**

Um **PWA** (Progressive Web App) é um site que pode ser instalado na tela inicial, abre em tela cheia e funciona sem internet.

Por quê:
- **Basta um link** para jogar e para mostrar aos amigos. Não depende de loja nem de aprovação.
- No **iPhone:** Safari → Compartilhar → "Adicionar à Tela de Início". O jogo abre com ícone próprio, em tela cheia. No Android, o Chrome oferece "Instalar app".
- O jogo é 90% **telas, listas e tabelas**: exatamente o que a web faz bem.
- **Hospedagem grátis** (GitHub Pages, Cloudflare Pages, Netlify ou Vercel). Não precisa de servidor, porque tudo roda no celular.
- O motor em TypeScript também roda no **Node**, para testes e simulação em massa.
- **Lojas depois:** o mesmo código pode ser empacotado com **Capacitor** para Google Play e App Store.

### Salvar no celular

- O save fica no **IndexedDB**, o banco de dados do próprio navegador, guardado no aparelho.
- O jogo pede ao navegador para **não apagar os dados** (`navigator.storage.persist()`).
- **Atenção ao iPhone:** o Safari pode apagar dados de sites que ficam 7 dias sem uso. Um site **instalado na tela inicial** tem contador próprio, que zera a cada uso, então os dados ficam ([WebKit](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)). Por isso:
  - na primeira abertura no iPhone, o jogo mostra como instalar na tela inicial;
  - **Exportar/Importar save** (arquivo `.proffut`) em Configurações, como backup e para passar o jogo de um aparelho para outro.
- Apagar os dados do Safari ou desinstalar o ícone apaga o save. Isso precisa ficar claro na tela de Configurações.

### Arquitetura

```
proffut/
├── src/
│   ├── engine/      # regras do jogo em TypeScript puro (sem interface):
│   │                # simulação, calendário, competições, mercado, finanças, IA
│   ├── save/        # salvamento no IndexedDB, exportar/importar, migração de versões
│   └── ui/          # telas em React
├── data/
│   └── brasil-2026/ # clubes, regulamentos (e jogadores)
├── public/          # ícones, manifest (o que faz o site ser instalável)
└── tools/
    ├── sim/         # simula centenas de temporadas no Node e imprime
    │                # estatísticas para calibrar o equilíbrio
    └── dados/       # scripts que geram os arquivos de data/
```

**Princípios**
1. **O motor não conhece a interface.** A tela só chama funções como `avancarDia(estado)` e `simularPartida(jogo, seed)`.
2. **Determinístico:** RNG com semente salva no estado do jogo.
3. **Estado serializável:** o jogo inteiro cabe num objeto que vira o save.
4. **Testes desde o primeiro dia** no motor (Vitest).
5. **Simulação em massa** (`tools/sim`) para balancear com números, não com "achismo".
6. **Pesado fora da tela:** a simulação da rodada roda num *Web Worker*, para a interface não travar.

**Bibliotecas previstas:** React, Vite, `vite-plugin-pwa` (instalação e funcionamento offline), Zustand (estado da interface), Dexie (IndexedDB), React Router, Vitest (testes do motor), Playwright (testes da interface num navegador de celular simulado), ESLint + Prettier, GitHub Actions (testes e publicação automática do site).

### Modelo de dados (núcleo)

| Entidade | Principais campos |
|---|---|
| `Pais` | id, nome, divisões |
| `Competicao` | id, tipo (liga/copa), fases, regras de acesso/rebaixamento, desempate, premiação |
| `Clube` | id, nome, sigla, cores, cidade, estado, estádio (nome, capacidade), torcida, reputação, saldo |
| `Jogador` | id, nome, idade, nacionalidade, posição (G/L/Z/M/A), lado, força, potencial, 2 características, energia, moral, lesão, suspensão, contrato, clubeId |
| `Temporada` | ano, competições, calendário |
| `Partida` | id, data, competição, fase, mandante, visitante, placar, eventos, seed |
| `EventoPartida` | minuto, tipo (gol, cartão, lesão, substituição...), jogadores |
| `Transferencia` | jogador, origem, destino, valor, data, tipo |
| `Tecnico` | nome, clube atual, reputação, confiança da diretoria, confiança da torcida, histórico |
| `Mensagem` | data, tipo (proposta, diretoria, notícia), conteúdo, ações |
| `EstadoDoJogo` | versão do save, data atual, seed, técnico(s), mundo, temporada, configurações |

---

## 6. Telas

Navegação por abas inferiores: **Clube · Elenco · Competições · Mercado · Mais**, com um botão grande **"Avançar"** sempre visível. O layout respeita o "notch" e a barra inferior do iPhone.

1. **Início:** novo jogo, continuar, carregar, configurações. No iPhone, se o jogo não estiver instalado, mostra como adicionar à tela inicial.
2. **Novo jogo:** nome do técnico, série, clube.
3. **Painel do clube (hub):** próximo jogo, posição na tabela, saldo, objetivo da diretoria, caixa de mensagens.
4. **Elenco:** lista ordenável (posição, força, idade, energia, salário).
5. **Detalhe do jogador:** atributos, histórico, contrato, ações (vender, renovar, listar).
6. **Escalação e tática:** campinho com toque/arrastar, formação, estilo, marcação, reservas, força efetiva colorida.
7. **Partida ao vivo:** placar, relógio, narração, outros jogos, substituições, velocidade.
8. **Competições:** classificação de cada série (com fases e playoffs), rodadas/resultados, artilharia.
9. **Mercado:** busca, filtros, propostas enviadas e recebidas.
10. **Finanças:** receitas, despesas, saldo, preço do ingresso.
11. **Mensagens:** propostas, diretoria, notícias.
12. **Histórico:** campeões, recordes, carreira do técnico.
13. **Configurações:** velocidade padrão da partida, som, saves, **exportar/importar save**.

---

## 7. Roteiro por fases

> Estimativas para **meio período (~10–15 h/semana) com ajuda de IA**. São só referência; o importante é a ordem.

### Fase 0 · Fundação (1 semana)
- Projeto React + TypeScript + Vite, configurado como PWA (ícone, manifest, offline).
- Lint/format, testes e CI no GitHub.
- Publicação automática do site a cada alteração.
- **Pronto quando:** o site vazio abre pelo link, instala na tela inicial do iPhone e abre em tela cheia, inclusive sem internet.

### Fase 1 · Motor do jogo (3–6 semanas)
- Carregar clubes e regulamentos de `data/brasil-2026` + elencos (seção 11).
- Simulador de partida com seed.
- Calendário, as três séries com seus formatos (playoff da B, quadrangulares da C), acesso/rebaixamento, virada de temporada.
- `tools/sim`: simular 100 temporadas e mostrar médias de gols, % de vitória do mandante, correlação força × pontos, campeões e evolução de força.
- **Pronto quando:** a linha de comando simula 10 temporadas seguidas sem erro e as estatísticas batem com os alvos da seção 3.3.

### Fase 2 · MVP jogável no celular (6–10 semanas)
- Telas 1 a 10 da seção 6, de forma simples.
- Partida ao vivo com os outros jogos da rodada.
- Mercado básico e finanças básicas.
- Salvar no celular + salvamento automático + exportar/importar.
- **Pronto quando:** dá para jogar 3 temporadas seguidas no iPhone (instalado na tela inicial) sem travar nem perder o save, e 5 pessoas testaram e deram retorno.

### Fase 3 · Profundidade (4–8 semanas)
- ✅ Copa do Brasil (out/2026: regulamento de 2026, `src/engine/copa.ts`).
- ✅ Contratos e renovação (out/2026, `src/engine/contratos.ts`); ✅ empréstimos (`src/engine/emprestimos.ts`); falta categorias de base.
- ✅ Objetivos da diretoria, demissão, propostas de emprego e convites de clubes maiores, com reputação do técnico (out/2026, `src/engine/carreira.ts`).
- ✅ Sala de troféus e recordes (out/2026, `src/engine/trofeus.ts`).
- Estádio e patrocínio.
- **Pronto quando:** uma carreira de 10 temporadas tem altos e baixos e troca de clube.

### Fase 4 · Conteúdo e comunidade (4–6 semanas)
- Série D jogável, estaduais, competições continentais.
- Editor no jogo + importar/exportar pacotes.
- Histórico, recordes e conquistas.

### Fase 5 · Polimento e divulgação do site (3–4 semanas)
- ✅ Tutorial rápido (out/2026: seis passos no começo do jogo novo, `src/ui/telas/Tutorial.tsx`), ícone, ✅ identidade visual (out/2026: visual claro "opção 3", o design system que o usuário mandou), ✅ sons.
- Desempenho em celular simples, acessibilidade (tamanho de fonte, contraste, leitor de tela).
- Domínio próprio (opcional) e divulgação em comunidades de jogos de técnico.

### Fase 6 · Depois
- **Lojas:** empacotar com Capacitor → Google Play e App Store (seção 9).
- Multijogador local (vários técnicos no mesmo celular, revezando, como no Brasfoot).
- Backup na nuvem (opcional, com conta), partida em 2D simples (opcional).

**Total até o site completo (Fase 5):** cerca de 5 a 8 meses em meio período. A Fase 2 já entrega algo jogável em ~3 meses.

---

## 8. Monetização

- **Site no começo: grátis e sem anúncios.** O foco é ter jogadores e retorno.
- O Brasfoot de PC ficou gratuito em novembro de 2025, então cobrar desde o início seria difícil.
- **Mais adiante (de preferência só depois de falar com um advogado, por causa dos nomes reais):**
  - **Proffut Pro, compra única** (no site via Pix/cartão, ou nas lojas): extras como editor, mais espaços de save, estatísticas avançadas.
  - Anúncios discretos (no máximo a cada N rodadas, nunca durante a partida), só na versão grátis.
- **Nada de pagar para ganhar:** não vender dinheiro do clube, jogadores ou força.

**Custos:** hospedagem do site grátis; domínio próprio ~R$ 40/ano (opcional). Lojas, só na Fase 6: Google Play US$ 25 (uma vez), Apple Developer US$ 99/ano.

---

## 9. Lançamento

1. **Site** (Fase 2 em diante): link compartilhável, com testes entre amigos. No Brasil, ~75% dos celulares são Android e ~25% iPhone ([Statcounter, ago/2026](https://gs.statcounter.com/os-market-share/mobile-tablet/brazil)), e o site atende os dois.
2. **Lojas** (Fase 6), se fizer sentido:
   - **Google Play:** conta pessoal nova precisa de **teste fechado com pelo menos 12 testadores, inscritos por 14 dias seguidos**, antes de liberar a produção ([Ajuda do Play Console](https://support.google.com/googleplay/android-developer/answer/14151465)). Os testadores do site podem ser os mesmos.
   - **App Store:** a Apple pode recusar apps que são "só um site embrulhado". Um jogo completo e offline costuma passar, mas é um risco a considerar.

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Jogo desequilibrado (muitos gols, time grande sempre ganha, economia quebra) | `tools/sim` + alvos numéricos + testes automáticos |
| Escopo crescer demais e nunca lançar | MVP fechado; tudo o mais vai para a lista "depois" |
| **Perder o save no iPhone** | Instalar na tela inicial, `storage.persist()`, exportar/importar save, aviso claro em Configurações |
| Save antigo não abrir depois de uma atualização | Versão no save + migração automática + testes com saves antigos |
| Lento em celular simples | Simulação num Web Worker; detalhe completo só nas séries do jogador |
| Problemas legais com nomes reais | Escudos só por decisão do usuário, uso pessoal e sem fins comerciais (se vier reclamação, volta o desenhado); nada extraído do Brasfoot; advogado antes de monetizar |
| Jogador abandona cedo | Primeiros 5 minutos guiados, objetivos claros, rodadas curtas |

**Concorrência:**
- **Brasfoot:** PC gratuito desde nov/2025, sem atualização oficial desde 2023, mantido pela comunidade. A edição para celular tem limitações. Existe público fiel e espaço para um jogo no estilo, moderno e atualizado.
- **Remakes e projetos abertos** estudados: ver [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md).
- **Ainda para estudar:** Elifoot, Football Manager Mobile, Top Eleven, Soccer Manager.

---

## 11. Decisões

**Tomadas**
- ✅ Site primeiro (PWA), instalável na tela inicial do iPhone, save guardado no celular.
- ✅ Começar só com o Brasil 2026: Séries A, B e C, com os nomes reais dos clubes e os regulamentos de 2026.
- ✅ Nada extraído dos arquivos do Brasfoot. Escudos: os que o usuário mandou (decisão dele, out/2026).
- ✅ Uso pessoal e recreativo, sem fins comerciais (por enquanto).
- ✅ A IA programa; você testa no iPhone e decide.
- ✅ Elencos reais de fontes públicas (out/2026): Série A pelo Cartola, Séries B e C pelas súmulas da CBF de 2025 (o site da CBF bloqueia o robô do GitHub para 2026). Força calculada pelo Proffut.

**Em aberto**
1. **Nome:** "Proffut" é o nome final ou provisório?
2. **Partida:** só texto (como o Brasfoot) ou planejar um 2D simples para o futuro?

---

## 12. Próximos passos

1. ✅ Publicar o site e jogar no iPhone.
2. Montar os elencos reais de 2026 (liberar `pt.wikipedia.org` na rede do ambiente ou colar as listas).
3. Ajustar o equilíbrio e as telas com base no que você sentir jogando.
4. Fase 3: ✅ Copa do Brasil; ✅ demissão e convites; ✅ contratos e renovação; ✅ empréstimos; ✅ sala de troféus.
5. O resto da lista de mudanças (§13), quando o usuário escolher.

---

## 13. Lista de mudanças (out/2026)

A lista que o usuário recebeu ("Lista das mudanças que podemos fazer"); ele escolheu "1, 2, 4, 5, 7, 8, 16, 19", todas
prontas. Tamanho: pequena (rápida), média ou grande (várias etapas).

**Carreira do técnico**
1. ✅ Demissão: campanha ruim faz a diretoria te demitir, e você recebe propostas de clubes menores. (média)
2. ✅ Convites de clubes maiores quando você vai bem, no meio ou no fim da temporada. (média)
3. Seleção brasileira: convite para treinar a seleção, com Copa América e Copa do Mundo. (grande)

**Elenco**
4. ✅ Contratos com data para acabar: renovar, o jogador pede aumento e, se não renovar, sai de graça. (média)
5. ✅ Empréstimos: emprestar quem não joga e pegar jogador emprestado. (média)
6. Treino da semana: escolher um foco (físico, ataque ou defesa) que ajuda os jogadores a evoluir. (média)
7. ✅ Escolher o batedor de pênalti e o capitão. (pequena)

**Partida**
8. ✅ Nota de cada jogador no fim do jogo (0 a 10) e o melhor em campo. (pequena)
9. Mais estatísticas: faltas, impedimentos e defesas do goleiro. (pequena)
10. Gráfico da pressão minuto a minuto, como nos aplicativos de futebol. (pequena)
11. Partida em 2D simples, com bolinhas se mexendo no campo. (grande)

**Competições**
12. Estaduais no começo do ano (Paulistão, Carioca, Mineiro...). (grande)
13. Série D jogável (hoje, cair para a D tira você do clube). (grande)
14. Libertadores e Sul-Americana (precisa incluir clubes de outros países). (grande)

**Clube e dinheiro**
15. Negociar patrocínio: escolher entre propostas, com mais dinheiro garantido ou mais prêmio por resultado. (média)
16. ✅ Sala de troféus e recordes: títulos, maior goleada, maior público, maiores artilheiros do clube. (pequena)

**Outros**
17. Vários técnicos no mesmo celular, revezando a vez, como no Brasfoot. (grande)
18. Editor dentro do jogo para mudar nomes, força e cores de clubes e jogadores. (média)
19. ✅ Tutorial rápido para quem começa um jogo novo. (pequena)
20. Ajustes de equilíbrio pelo que o usuário sentir jogando: gols, lesões, preços, dificuldade. (pequena, quando ele quiser)
