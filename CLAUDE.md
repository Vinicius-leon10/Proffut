# Proffut: guia para continuar o trabalho

Leia isto antes de mexer no projeto. Detalhes de design em [PLANO.md](PLANO.md); estudo do Brasfoot em [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md); como jogar e publicar em [README.md](README.md); lista dos testes em [tests/README.md](tests/README.md).

## Regras para toda mudança (pedido do usuário, out/2026: valem sempre)

1. **Teste antes da correção.** Todo bug corrigido ou comportamento ajustado ganha um teste com o próximo número
   (R15, R16…), escrito **primeiro** em `tests/`. Rode e confirme que ele **falha** sem a correção; depois corrija e
   confirme que **passa**. Acrescente a linha dele em `tests/README.md` (o que garante e de onde veio o pedido, com a
   frase do usuário).
2. **Antes de cada envio:** `npm run verificar` (testes do motor, verificação de tipos, build e testes de ponta a ponta)
   passando 100%. Nunca desligar, pular (`test.skip`, `test.only`, `retries`) ou apagar um teste para ficar verde.
3. **Sem versão de teste.** O usuário decidiu não ter versão de teste separada ("Não precisa criar uma versão de teste")
   e escolheu que cada mudança vá **direto para a oficial, só se todos os testes passarem**. Fluxo:
   trabalhar na branch `claude/plano-do-jogo` → push → esperar o workflow "Testes" ficar verde nela no GitHub →
   avançar a `main` (`git push origin claude/plano-do-jogo:main`). A `main` roda tudo de novo e só publica se passar.
   Nunca levar para a `main` algo com teste vermelho.
4. **Depois de cada mudança**, avise o usuário: o que mudou e como testar no celular (fechar e abrir o app no iPhone
   para pegar a versão nova).
5. **Ferramentas só para avaliar** (atalhos, telas de diagnóstico, "liberar tudo") nunca entram no jogo publicado.
   Como não há versão de teste, se o usuário pedir uma, avise e proponha montar a versão de teste antes.
6. **Converse em português, com palavras simples** (o usuário não é programador). Ele testa no iPhone e manda listas
   curtas de ajustes. Quando não der para ver o problema, corrija pelo mais provável e peça uma captura de tela.

## Endereços

- **Oficial:** https://vinicius-leon10.github.io/Proffut/ (branch `main` → workflow → branch `gh-pages`).
- **Teste:** não existe, por decisão do usuário. Se um dia ele pedir: branch `teste` publicando numa subpasta
  (`/teste/`) da `gh-pages`, build com `APP_ENV=teste`, selo "VERSÃO DE TESTE", commit no rodapé e dados com prefixo
  próprio no IndexedDB.

## O que é

Jogo de técnico de futebol para uso pessoal e recreativo do dono do repositório, inspirado no Brasfoot (referência, não cópia).
Site PWA instalado na tela inicial do iPhone, funciona sem internet, save no próprio aparelho.
Só clubes brasileiros: Séries A, B e C de 2026 (60 clubes reais, regulamentos de 2026) com os jogadores reais
(`data/brasil-2026/jogadores.json`); a força de cada jogador é calculada por nós.

## Situação (out/2026)

Pronto e publicado: partida ao vivo, tática, elenco, mercado, finanças, estádio (ampliar/modernizar), diretoria,
virada de temporada sem fim, rebaixamento para a Série D com propostas de emprego, checagem automática no app,
elencos reais nos jogos novos, Copa do Brasil, "Pedir mais" nas propostas recebidas, sons da partida, escudos dos
clubes (os que o usuário mandou), time titular do adversário antes do jogo (toque no escudo dele no painel ou no
placar), visual claro "opção 3", testes de ponta a ponta R01–R33 rodando a cada mudança, antes de publicar e todo dia
no site publicado.

**Visual "opção 3" (out/2026, `src/ui/estilo.css`):** design system que o usuário mandou (pacote
`proffut-design-system-opcao-3.zip`, "Aplique"): editorial claro. Tokens no `:root`: `--fundo` marfim `#f3f3ec`,
`--cartao` `#fbfbf7`, `--floresta` `#143826` (topo, abas, segmento escolhido, aviso), `--dourado` `#f5c72c` (botão
principal, aba ativa, filtro escolhido), `--esmeralda` `#34b777` (barras), texto `#10221a`/`#55645b`/`#627067`.
`--verde`, `--amarelo`, `--vermelho` e `--azul` são cores de TEXTO sobre o claro (contraste ≥ 4,5:1); para fundo e
barra use `--esmeralda`/`--dourado`. Títulos de página e de folha (`h1`, `h2`, `.topo .titulo`) em DM Serif Display
(`@fontsource/dm-serif-display`, só o latino, guardada pelo service worker); o resto na letra do sistema. O campinho
continua verde com as cores claras nos números (fixas no CSS). **Topo no iPhone:** o iPhone escolhe a cor da hora e
da bateria pela página, não pela meta `black-translucent`: com a página clara ele punha letras pretas e uma névoa
branca por cima do topo verde (captura do usuário, "Ajuste esse topo"). Por isso a página se declara escura
(`color-scheme: dark` no `:root`, `html`/`body` verde-floresta) e as telas pintam o marfim por cima (`.app`,
`.tela-cheia`, `.inicio`); campos (`input`, `select`) com `color-scheme: light`; o topo é verde-floresta e
`body::before` pinta uma faixa verde atrás da hora em toda tela (o início não tem topo). R32. No app do iPhone o
topo e o placar descem mais 16 px (`--folga: min(var(--topo), 16px)`; o aviso desce junto): colados na barra, ficavam
"sobrepostos no topo" (R33). No navegador `--topo` é 0 e nada muda. As referências do pacote ficam fora do git.

**Sons da partida (out/2026, `src/ui/sons.ts`):** apito, torcida e vaia sintetizados com Web Audio, narrador com a
voz pt-BR do aparelho (`speechSynthesis`); nada baixado nem copiado. Apito no início e na volta do intervalo, 2 no
intervalo, 3 no fim; no pênalti: apito, burburinho e "Pênalti!"; no gol, sem narrador (o usuário achou a voz
robótica feia): gol do meu time = festa da torcida (`FESTA`, o som mais alto: ~−14 dB contra ~−16 dB do apito), gol do
adversário = `vaia()` (16 vozes graves com vibrato nos formantes do "u", ~−18 dB); pênalti perdido: "uhhh". O pênalti é marcado num minuto (evento `penalti`) e cobrado no minuto
seguinte (`PartidaViva.penaltiPendente`; o tempo não acaba antes da cobrança) e a partida espera 2,5 s antes da
cobrança. No iPhone o som só sai depois de um toque (`liberarSom` em "Começar o jogo" e no ▶) e a chave do
silencioso cala o apito e a torcida. Liga/desliga: botão de som na partida e Configurações → Sons da partida
(`config.som`, opcional: falta = ligado). Os testes (R25, R27; `escutarSons` em `tests/ajuda.ts`) escutam os sons
trocando `OscillatorNode.start`, `AudioBufferSourceNode.start` e `speechSynthesis.speak` no navegador de teste, e
anotam o volume de cada som (maior valor marcado nos ganhos por onde ele passa) e os sons do mesmo instante.

**Copa do Brasil (out/2026, `src/engine/copa.ts`):** regulamento de 2026 com 126 clubes: 1ª fase com os 28 piores do
ranking, 2ª com mais 74, 3ª com mais 4 (em 2026 os de verdade: Paysandu, Ponte Preta, Barra-SC, Confiança; depois, os
4 que subiram da Série C), 5ª com a Série A. Ranking = série + reputação. Jogo único até a 4ª fase na casa do pior
colocado (empate: pênaltis, sem prorrogação); ida e volta da 5ª à semi (melhor ranking decide em casa; empate no
agregado: pênaltis); final em jogo único e campo neutro (`Partida.neutro`: sem mando nem bilheteria). Datas: quartas-
feiras das semanas 0–4, 6, 13–14, 18–19, 28–29 e 34 da temporada (fora das semanas 5, 10, 15, 20 e 25 das séries).
Os 66 clubes da Série D que entram ganham elenco de 16 (`gerarElencoCopa`, `Clube.elencoDaCopa`), apagado na virada.
Premiação = valores da CBF de 2026 × `ESCALA_COPA` (0,5), paga no sorteio de cada fase; campeão e vice na final.
`Partida.serie` agora é `Competicao` ("A" | "B" | "C" | "CB"). Save antigo sem `estado.copa`: a Copa começa na
temporada seguinte (`temporadaEncerrada` ignora a Copa que não existe).

**Elencos reais (out/2026):** o robô `.github/workflows/elencos.yml` (rodar à mão no GitHub) baixa Cartola, súmulas
da CBF de 2023–2025 (programa do BrazilianFootball/data, MIT), transfermarkt-datasets e Wikidata para a branch
`dados-elencos`; `npx tsx tools/elencos/montar.ts <pasta da branch>` grava `data/brasil-2026/jogadores.json` e
imprime um relatório (fontes, acerto das posições deduzidas, erro da idade estimada). Série A: elenco atual do
Cartola. Séries B e C: quem jogou em 2025 (o site da CBF não entrega as súmulas de 2026 ao GitHub; decidimos não
contornar o bloqueio nem disfarçar o robô de navegador). Posição sem fonte é deduzida das escalações (~3 em 4 certas,
4 em 5 entre titulares); idade sem fonte vem do número de registro na CBF (erro típico ~1,3 ano). Força: faixa do
clube + uso + valor, nunca de outro jogo. `novoJogo` usa `elencoReal` (`gerador.ts`) e completa posições com gerados.
Jogos já começados continuam com os jogadores que tinham (não há migração de save).

**Esperando o usuário:** em aberto no PLANO.md §11: nome final ("Proffut" é provisório?) e se a partida terá 2D no
futuro. Se ele quiser os elencos de 2026 das Séries B e C, falta uma fonte livre que o GitHub alcance.

**Próximas ideias** (PLANO.md §7, Fase 3): contratos e renovação, demissão por maus resultados (hoje só há troca de
clube ao cair para a D), ajustes de equilíbrio pelo que o usuário sentir jogando.

## Regras fixas do jogo

- **Não extrair nada do Brasfoot** (arquivos, APK, listas de jogadores, imagens). O usuário pediu e foi recusado; ele aceitou.
- **Escudos: os que o usuário mandou** (out/2026). Antes a regra era não usar escudos oficiais; ele mandou uma prancha
  com os oficiais e decidiu: "Não, quero que use os escudos que mandei agora. O app é particular, uso individual. Use os escudos que mandei, é uma ordem". Foi avisado de que o site e o
  repositório são públicos e os escudos são marcas dos clubes (se vier reclamação, o GitHub pode pedir para tirar; aí
  volta o escudo desenhado). Os 156 ficam em `public/escudos/<id>.png` (`tools/escudos/recortar.py` recorta a prancha;
  a prancha não vai para o git). `Escudo` usa: o importado no aparelho (Configurações → Escudos, `src/save/escudos.ts`)
  > o do jogo > o desenhado com as cores e a sigla (só se a imagem não carregar). Clube novo sem imagem: desenhado.
- As fichas dos clubes vêm do remake MIT denisvick-dev/brasfoot (aviso de licença em `data/brasil-2026/LEIAME.md`).
- Saves antigos precisam continuar abrindo: campo novo em `EstadoJogo` deve ser opcional ou ganhar correção em
  `repararEstado` (`src/engine/checagem.ts`). O usuário já tem um jogo em andamento no iPhone.

## Como trabalhar

```bash
npm install
npm run verificar   # tudo o que tem de passar antes de cada envio (os quatro abaixo, na ordem)
npm test            # testes do motor (vitest, src/engine/motor.test.ts)
npm run build       # verificação de tipos (tsc) + site em dist/
npm run test:e2e    # testes de ponta a ponta com tela de iPhone (Playwright, pasta tests/; precisa do build)
npm run sim         # simula temporadas; use depois de mexer em constantes.ts
npm run capturas    # captura cada tela jogando (tools/e2e/capturas/, fora do git; precisa do vite preview na 4173)
```

Testar o site publicado: `BASE_URL=https://vinicius-leon10.github.io/Proffut/ npm run test:e2e` (daqui não dá: a rede
bloqueia `*.github.io`; o workflow "Checagem diária do site" faz isso todo dia e pode ser disparado à mão).
Resultado dos testes em `tests/resultado/` (fora do git): `resumo.md`, relatório HTML e, quando falha, captura e gravação.

**Workflows:** `ci.yml` "Testes" (todo push e PR), `pages.yml` (main: testa e publica na `gh-pages`),
`checagem-diaria.yml` (6h17 de Brasília, no site publicado). Use as ferramentas MCP do GitHub para ver execuções e
logs (não há `gh` neste ambiente).

**Limites do ambiente:** a rede bloqueia `pt.wikipedia.org`, `en.wikipedia.org`, Wikidata, Cartola e `*.github.io`;
o GitHub (git, raw) funciona. Playwright 1.63 já vem com o Chromium (`/opt/pw-browsers`): `playwright` e
`@playwright/test` ficam fixos em 1.63.0 para bater com ele.

## Mapa do código

| Onde | O quê |
|---|---|
| `src/engine/` | Regras em TypeScript puro, sem interface. Tudo aleatório usa `rngPara(semente, chave)` (`rng.ts`): mesma semente, mesmo resultado |
| `tipos.ts` | Modelo de dados (`EstadoJogo`, `Clube`, `Jogador`, `Partida`...) |
| `constantes.ts` | Todos os números de equilíbrio. Mexeu? Rode `npm run sim` |
| `artigos.ts` | Artigo do clube nos textos: `comArtigo("do", clube)` dá "do Flamengo" ou "da Chapecoense"; `concorda` para campeão/campeã. A lista `CLUBES_FEMININOS` vai pelo id |
| `gerador.ts`, `nomes.ts` | `elencoReal` (elencos de `jogadores.json`), jogadores gerados (base, livres, quem completa elenco), salário (`salarioBase`), valor de mercado |
| `forca.ts` | Força efetiva: força × posição × energia × características |
| `partida.ts` | Simulação minuto a minuto; disputa = a^k/(a^k+b^k), k = `EXPOENTE_DISPUTA` |
| `calendario.ts`, `competicoes.ts` | Tabelas, turno/returno com mando equilibrado, playoff da B, quadrangulares e final da C |
| `copa.ts` | Copa do Brasil: participantes, sorteio por potes, jogos, quem passa, premiação, textos do confronto |
| `financas.ts`, `estadio.ts` | Bilheteria, TV, patrocínio, salários; obras de ampliação e modernização |
| `mercado.ts`, `mensagens.ts`, `diretoria.ts` | Compra e venda, propostas (e "Pedir mais": `pedirMais`, `limiteDaProposta`), caixa de mensagens, objetivo e confiança |
| `temporada.ts` | Virada: acesso/rebaixamento, idade, evolução, aposentadoria, base, Série D (`serie-d-reserva.json`) |
| `jogo.ts` | Orquestra: `novoJogo`, `avancar`, `prepararJogos`/`concluirJogos`, `provavelTime` (escalação do computador sem mudar o jogo), propostas de emprego, obras do dia |
| `checagem.ts` | `checarEstado`, `repararEstado`, `testarPartida` (roda sozinha ao abrir um jogo) |
| `motor.test.ts` | Testes do motor |
| `src/save/` | `salvamento.ts`: IndexedDB (`proffut`/`saves`, chaves `jogo:auto`, `resumo:auto`...), exportar/importar `.json`. `aparelho.ts`: checagem do aparelho. `escudos.ts`: escudos importados pelo usuário, que trocam os do jogo só no aparelho (chave `escudos`, id do clube → imagem) |
| `src/ui/` | React + Zustand. `store.ts` (estado, telas sobrepostas, salvamento 400 ms após cada mudança), `acoes.ts`, `componentes.tsx`, `estilo.css` (visual "opção 3": tokens no `:root`), `sons.ts` (apito, torcida, narrador), `telas/*.tsx` |
| `tests/` | Testes de ponta a ponta R01…: `*.spec.ts`, passos comuns em `ajuda.ts`, relatório em português em `resumo.ts`, lista em `README.md` |
| `public/escudos/` | Os 156 escudos dos clubes (`<id>.png`), recortados da prancha que o usuário mandou; o service worker guarda para jogar sem internet |
| `data/brasil-2026/` | `clubes.json` (60), `serie-d-reserva.json` (96), `competicoes.json`, `jogadores.json` (elencos reais, gerado por `tools/elencos`), `LEIAME.md` (fontes e licenças) |
| `tools/` | `sim/` (calibragem), `e2e/` (capturas de tela), `icones/`, `dados/` (scripts Python dos clubes), `elencos/` (robô dos elencos: `montar.ts` monta `jogadores.json`, `sumulas.ts` lê as súmulas, `fontes-clubes.ts` diz como cada fonte chama os clubes, scripts Python do workflow), `escudos/` (`recortar.py`: prancha de escudos → `public/escudos/<id>.png`, ou um pacote `.json` para importar) |

## Calibragem atual (`npm run sim`)

~2,3 gols por jogo, mandante vence 42–45%, empates 25–29%, correlação força × pontos 0,57–0,79, nenhum clube no vermelho
(conferido de novo com os elencos reais e com a Copa; a Série C fica no limite: mandante ~40–41%, empates ~29–31%).
Copa do Brasil no `npm run sim`: campeão quase sempre da Série A, ~30% de zebras por confronto, ~20% dos jogos nos
pênaltis, campeão leva ~47 mi somando as fases. Save cresce para ~2 MB (elencos da Série D na Copa).
Obras do estádio se pagam em 3 a 4 temporadas.

## Armadilhas já resolvidas (não desfazer)

- **iPhone:** telas usam `100dvh` (não `100vh`); `html, body` com `overflow: hidden` e a rolagem fica em `.conteudo`;
  folhas com `max-height: 88dvh`; respiro no fim de `.tela-cheia .conteudo`; `flex-shrink: 0` nos filhos de `.conteudo`.
  Avisos (toast) logo abaixo do topo, nunca por cima dele. Os testes R08–R11 e R15 protegem isso.
- **Folhas (`Folha` em `componentes.tsx`) vão direto no `<body>` (portal).** Dentro de uma área com rolagem o
  Safari do iPhone as desenha por baixo da barra de abas (WebKit 261302), mesmo com z-index maior. O Chromium
  não faz isso; por isso `tests/ajuda.ts` força essas camadas em todos os testes (R16, R17).
- **Altura da tela:** use sempre `var(--altura)`, nunca `100vh`/`100dvh` direto. No modo app do iPhone o
  Safari informa a altura sem a barra de status; `src/ui/telaInteira.ts` mede a tela e põe `--altura-app` (R18).
- Não usar `-webkit-overflow-scrolling` (inútil desde o iOS 13 e piora as camadas).
- Seletor de arquivo do iOS: o `<input type="file">` de importar não tem `accept` (com ele o iPhone esconde o `.json`).
- Testes: botões com `exact: true` ("Voltar", "Continuar"), títulos por `getByRole("heading")`, buscas dentro de
  `.tela-cheia` ou do `dialog`; para esperar o salvamento use `esperarSalvar` (não `waitForTimeout`).
- GitHub Actions: usar `actions/*@v7` e Node 22 (Node 20 foi removido do Actions).
- Ao rodar comandos, não use `pkill` genérico (já derrubou o próprio terminal). Nem `pgrep -f "<texto>"` seguido
  de `kill`: o próprio terminal tem o texto na linha de comando. Guarde o PID ao abrir o processo (`$!`).
- `esperarInteiroNaTela` rola o elemento até o meio da área com rolagem: com o topo de altura fracionada, parar na
  beirada deixava 0,4 px de fora (rolagem em pixels inteiros) sem esconder nada.
- Visual claro: nunca usar `--dourado`/`--esmeralda` como cor de texto sobre fundo claro (some); o R31 confere as
  cores principais e o contraste. Não declarar a página clara (`color-scheme: light` no `:root` ou fundo claro no
  `html`/`body`): no iPhone a hora fica preta e uma névoa branca cobre o topo (R32); tela nova pinta o próprio fundo.
- Texto com nome de clube: nunca "o ${clube.nome}" fixo; use `comArtigo` e `concorda` (`artigos.ts`): Chapecoense,
  Ponte Preta, Ferroviária, Inter de Limeira, Portuguesa, Tuna Luso, Aparecidense e Juazeirense são "a" (R26).
  Nome de estádio vai sem artigo ("Arena Condá agora tem...").
