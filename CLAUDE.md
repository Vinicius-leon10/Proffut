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
Só clubes brasileiros: Séries A, B e C de 2026 (60 clubes reais, regulamentos de 2026). Jogadores fictícios por enquanto.

## Situação (out/2026)

Pronto e publicado: partida ao vivo, tática, elenco, mercado, finanças, estádio (ampliar/modernizar), diretoria,
virada de temporada sem fim, rebaixamento para a Série D com propostas de emprego, checagem automática no app,
testes de ponta a ponta R01–R15 rodando a cada mudança, antes de publicar e todo dia no site publicado.

**Esperando o usuário:**
1. **Elencos reais de 2026.** Pesquisado: não há no GitHub um arquivo livre com A, B e C (futmanager e
   leilao-de-times têm A e B, mas sem licença e com notas de terceiros; Cartola só tem a A, sem idade).
   Proposta feita ao usuário, ainda sem resposta: um workflow do GitHub (lá a internet é liberada; aqui a rede bloqueia
   a Wikipédia) baixa da Wikipédia o elenco dos 60 clubes (nome, posição, nacionalidade, nascimento) e grava
   `data/brasil-2026/jogadores.json`; a força é nossa (faixa do clube, idade, seleção, popularidade da página).
   Em `novoJogo` (`src/engine/jogo.ts`) usar esses elencos no lugar de `gerarElenco` e completar com gerados se faltar
   gente. Crédito CC BY-SA no `LEIAME.md`. Força e características nunca copiadas do Brasfoot nem de outro jogo.
2. Em aberto no PLANO.md §11: nome final ("Proffut" é provisório?) e se a partida terá 2D no futuro.

**Próximas ideias** (PLANO.md §7, Fase 3): Copa do Brasil, contratos e renovação, demissão por maus resultados
(hoje só há troca de clube ao cair para a D), ajustes de equilíbrio pelo que o usuário sentir jogando.

## Regras fixas do jogo

- **Não extrair nada do Brasfoot** (arquivos, APK, listas de jogadores, imagens). O usuário pediu e foi recusado; ele aceitou.
- Sem escudos oficiais: o escudo é desenhado com as cores e a sigla do clube.
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
npm run capturas    # captura cada tela jogando (tools/e2e/capturas/, fora do git)
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
| `src/save/` | `salvamento.ts`: IndexedDB (`proffut`/`saves`, chaves `jogo:auto`, `resumo:auto`...), exportar/importar `.json`. `aparelho.ts`: checagem do aparelho |
| `src/ui/` | React + Zustand. `store.ts` (estado, telas sobrepostas, salvamento 400 ms após cada mudança), `acoes.ts`, `componentes.tsx`, `estilo.css`, `telas/*.tsx` |
| `tests/` | Testes de ponta a ponta R01…: `*.spec.ts`, passos comuns em `ajuda.ts`, relatório em português em `resumo.ts`, lista em `README.md` |
| `data/brasil-2026/` | `clubes.json` (60), `serie-d-reserva.json` (96), `competicoes.json`, `LEIAME.md` (fontes) |
| `tools/` | `sim/` (calibragem), `e2e/` (capturas de tela), `icones/`, `dados/` (scripts Python dos clubes) |

## Calibragem atual (`npm run sim`)

~2,3 gols por jogo, mandante vence 42–45%, empates 25–29%, correlação força × pontos 0,57–0,79, nenhum clube no vermelho.
Obras do estádio se pagam em 3 a 4 temporadas.

## Armadilhas já resolvidas (não desfazer)

- **iPhone:** telas usam `100dvh` (não `100vh`); `html, body` com `overflow: hidden` e a rolagem fica em `.conteudo`;
  folhas com `max-height: 88dvh`; respiro no fim de `.tela-cheia .conteudo`; `flex-shrink: 0` nos filhos de `.conteudo`.
  Avisos (toast) logo abaixo do topo, nunca por cima dele. Os testes R08–R11 e R15 protegem isso.
- Seletor de arquivo do iOS: o `<input type="file">` de importar não tem `accept` (com ele o iPhone esconde o `.json`).
- Testes: botões com `exact: true` ("Voltar", "Continuar"), títulos por `getByRole("heading")`, buscas dentro de
  `.tela-cheia` ou do `dialog`; para esperar o salvamento use `esperarSalvar` (não `waitForTimeout`).
- GitHub Actions: usar `actions/*@v7` e Node 22 (Node 20 foi removido do Actions).
- Ao rodar comandos, não use `pkill` genérico (já derrubou o próprio terminal).
