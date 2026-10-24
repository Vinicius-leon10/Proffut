# Proffut: guia para continuar o trabalho

Leia isto antes de mexer no projeto. Detalhes de design em [PLANO.md](PLANO.md); estudo do Brasfoot em [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md); como jogar e publicar em [README.md](README.md).

## O que é

Jogo de técnico de futebol para uso pessoal e recreativo do dono do repositório, inspirado no Brasfoot (referência, não cópia).
Site PWA instalado na tela inicial do iPhone, funciona sem internet, save no próprio aparelho.
Só clubes brasileiros: Séries A, B e C de 2026 (60 clubes reais, regulamentos de 2026). Jogadores fictícios por enquanto.

No ar em **https://vinicius-leon10.github.io/Proffut/**.

## Como falar com o usuário

- Sempre em português, linguagem simples (o usuário não é programador). Ele testa no iPhone e manda listas curtas de ajustes.
- Ao terminar uma entrega: diga o que mudou, que o site atualiza sozinho e que basta fechar e abrir o app no iPhone.
- Quando não der para ver o problema (ex.: "ajustar a parte superior da tela"), corrija pelo mais provável e peça uma captura de tela.

## Situação (out/2026)

Pronto e publicado: partida ao vivo, tática, elenco, mercado, finanças, estádio (ampliar/modernizar), diretoria,
virada de temporada sem fim, rebaixamento para a Série D com propostas de emprego, checagem automática (no app e no GitHub).
Todos os workflows verdes no último commit; a checagem diária passou no site publicado.

**Esperando o usuário:**
1. **Elencos reais de 2026.** Ele escolhe entre: liberar `pt.wikipedia.org` na rede do ambiente, ou colar as listas.
   Plano: montar `data/brasil-2026/jogadores.json` (nome, posição, lado, idade, força e 2 características dados por nós)
   e, em `novoJogo` (`src/engine/jogo.ts`), usar esses elencos no lugar de `gerarElenco` para os clubes que tiverem lista
   (completar com gerados se faltar gente). Força e características são nossas, nunca copiadas do Brasfoot.
2. Em aberto no PLANO.md §11: nome final ("Proffut" é provisório?) e se a partida terá 2D no futuro.

**Próximas ideias** (PLANO.md §7, Fase 3): Copa do Brasil, contratos e renovação, demissão por maus resultados
(hoje só há troca de clube ao cair para a D), ajustes de equilíbrio pelo que o usuário sentir jogando.

## Regras fixas

- **Não extrair nada do Brasfoot** (arquivos, APK, listas de jogadores, imagens). O usuário pediu e foi recusado; ele aceitou.
- Sem escudos oficiais: o escudo é desenhado com as cores e a sigla do clube.
- As fichas dos clubes vêm do remake MIT denisvick-dev/brasfoot (aviso de licença em `data/brasil-2026/LEIAME.md`).
- Saves antigos precisam continuar abrindo: campo novo em `EstadoJogo` deve ser opcional ou ganhar correção em
  `repararEstado` (`src/engine/checagem.ts`). O usuário já tem um jogo em andamento no iPhone.

## Como trabalhar

```bash
npm install
npm test            # 16 testes do motor (vitest)
npm run build       # tsc + vite → dist/
npm run sim         # simula temporadas; use depois de mexer em constantes.ts
npm run checagem    # robô no navegador com tela de iPhone, inclusive offline (precisa do build)
npm run e2e         # captura telas jogando (tools/e2e/capturas/, fora do git)
```

Antes de publicar: `npm test`, `npm run build` e `npm run checagem` têm de passar.
Para conferir telas, rode `npx vite preview --port 4173` e tire capturas com Playwright em 390×664 (iPhone com a barra do Safari).

**Branches e publicação:** trabalhe na `claude/plano-do-jogo`, faça push e depois avance a `main`
(`git push origin claude/plano-do-jogo:main`). Push na `main` dispara `.github/workflows/pages.yml`:
testa, gera, roda o robô e publica `dist/` na branch `gh-pages` (o GitHub Pages serve essa branch).
Se o robô falhar, o site não é atualizado.

**Workflows:** `ci.yml` (todo push e PR), `pages.yml` (main → gh-pages), `checagem-diaria.yml` (6h17 de Brasília, no site
publicado; pode ser disparado à mão). Relatório e capturas ficam nos Artifacts de cada execução.
Use as ferramentas MCP do GitHub para ver execuções e logs (não há `gh` neste ambiente).

**Limites do ambiente:** a rede bloqueia `pt.wikipedia.org` e `*.github.io` (não dá para abrir o site publicado daqui;
confirme pelo GitHub Actions). Playwright 1.63 já vem instalado com o Chromium (`/opt/pw-browsers`).

## Mapa do código

| Onde | O quê |
|---|---|
| `src/engine/` | Regras em TypeScript puro, sem interface. Tudo aleatório usa `rngPara(semente, chave)` (`rng.ts`): mesma semente, mesmo resultado |
| `tipos.ts` | Modelo de dados (`EstadoJogo`, `Clube`, `Jogador`, `Partida`...) |
| `constantes.ts` | Todos os números de equilíbrio. Mexeu? Rode `npm run sim` |
| `gerador.ts`, `nomes.ts` | Jogadores fictícios, salário (`salarioBase`), valor de mercado |
| `forca.ts` | Força efetiva: força × posição × energia × características |
| `partida.ts` | Simulação minuto a minuto; disputa = a^k/(a^k+b^k), k = `EXPOENTE_DISPUTA` |
| `calendario.ts`, `competicoes.ts` | Tabelas, turno/returno com mando equilibrado, playoff da B, quadrangulares e final da C |
| `financas.ts`, `estadio.ts` | Bilheteria, TV, patrocínio, salários; obras de ampliação e modernização |
| `mercado.ts`, `mensagens.ts`, `diretoria.ts` | Compra e venda, propostas, caixa de mensagens, objetivo e confiança |
| `temporada.ts` | Virada: acesso/rebaixamento, idade, evolução, aposentadoria, base, Série D (`serie-d-reserva.json`) |
| `jogo.ts` | Orquestra: `novoJogo`, `avancar`, `prepararJogos`/`concluirJogos`, propostas de emprego, obras do dia |
| `checagem.ts` | `checarEstado`, `repararEstado`, `testarPartida` (roda sozinha ao abrir um jogo) |
| `motor.test.ts` | Testes do motor |
| `src/save/` | `salvamento.ts`: IndexedDB, slots auto/1/2/3, exportar/importar `.json`. `aparelho.ts`: checagem do aparelho (offline, espaço, proteção) |
| `src/ui/` | React + Zustand. `store.ts` (estado e telas sobrepostas), `acoes.ts`, `componentes.tsx`, `estilo.css`, `telas/*.tsx` |
| `data/brasil-2026/` | `clubes.json` (60), `serie-d-reserva.json` (96), `competicoes.json`, `LEIAME.md` (fontes) |
| `tools/` | `sim/` (calibragem), `checagem/checar.mjs` (robô, 11 passos), `e2e/`, `icones/`, `dados/` (scripts Python dos clubes) |

## Calibragem atual (`npm run sim`)

~2,3 gols por jogo, mandante vence 42–45%, empates 25–29%, correlação força × pontos 0,57–0,79, nenhum clube no vermelho.
Obras do estádio se pagam em 3 a 4 temporadas.

## Armadilhas já resolvidas (não desfazer)

- **iPhone:** telas usam `100dvh` (não `100vh`); `html, body` com `overflow: hidden` e a rolagem fica em `.conteudo`;
  folhas com `max-height: 88dvh`; respiro no fim de `.tela-cheia .conteudo`; avisos (toast) no topo; `flex-shrink: 0` nos filhos de `.conteudo`.
- Seletor de arquivo do iOS: o `<input type="file">` de importar não tem `accept` (com ele o iPhone esconde o `.json`).
- Robô: botões com `exact: true` ("Voltar"), títulos por `getByRole("heading")`, buscas dentro de `.tela-cheia`.
- GitHub Actions: usar `actions/*@v7` e Node 22 (Node 20 foi removido do Actions).
- Ao rodar comandos, não use `pkill` genérico (já derrubou o próprio terminal).
