# Proffut

Jogo onde você é o técnico de futebol. Inspirado no Brasfoot, roda no navegador do celular e pode ser instalado na tela inicial do iPhone.

**Séries A, B e C do Brasil em 2026**, com os 60 clubes reais, os regulamentos de 2026 e os jogadores de verdade: elenco atual na Série A (Cartola) e quem jogou em 2025 nas Séries B e C (súmulas da CBF). A força de cada jogador é calculada pelo jogo. Os elencos valem para jogos novos; um jogo já começado continua com os jogadores que tinha.

## Como jogar

1. Abra o site no Safari do iPhone: **https://vinicius-leon10.github.io/Proffut/**
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**. O jogo abre em tela cheia, como um app, e funciona sem internet.
3. Escolha seu nome, uma série e um clube.
4. No painel do clube, o botão **Avançar** leva ao próximo jogo. Antes, ajuste a escalação e a tática na aba **Tática**.

O save fica guardado **no próprio celular** e é feito sozinho a cada ação. Para ter um backup ou passar o jogo para outro aparelho, use **Configurações → Exportar save**.

## O que já dá para fazer

- Escolher qualquer clube das Séries A, B ou C.
- Elenco com força, idade, energia, 2 características (o modelo do Brasfoot), lesões e suspensões.
- Escalação no campinho, com a **força efetiva** colorida (posição, cansaço e características). Tocando no escudo do adversário (no painel ou no placar antes do jogo) aparece o time titular dele no mesmo campinho.
- Seis formações, seis estilos de jogo, marcação normal ou pressão, jogadas pelo meio ou pelas pontas.
- **Partida ao vivo** minuto a minuto, com narração, os outros jogos da rodada ao mesmo tempo, substituições e mudança de tática durante o jogo.
- **Estatísticas da partida** (aba Estatísticas): ataques, ataques perigosos, posse de bola, escanteios, cartões, chutes no gol e para fora, e a pressão dos últimos 15 minutos. Quando o adversário domina os últimos 15 minutos, a partida avisa ("está pressionando") e sugere mudar a tática ou fazer uma substituição.
- **Sons da partida:** apito do árbitro no início, no intervalo e no fim; no pênalti, apito, torcida e o narrador gritando "Pênalti!"; no gol do seu time, a festa da torcida (o som mais alto); no gol do adversário, a vaia. Liga e desliga no botão de som da partida ou em Configurações (com o iPhone no silencioso, o apito e a torcida não tocam).
- **Carreira do técnico:** com a diretoria sem confiança você recebe o recado de cargo em risco e pode ser demitido (no meio da temporada ou na virada, se ficar abaixo do objetivo), escolhendo entre três propostas de emprego. Quem vai bem recebe convites de clubes maiores no meio da fase de liga e no fim da temporada. A sua reputação como técnico sobe com bons resultados e títulos e decide quem te chama.
- Regulamentos de 2026: Série A com 38 rodadas, playoff de acesso na Série B, quadrangulares e final na Série C.
- **Copa do Brasil** com o regulamento de 2026: 126 clubes (os 60 das séries e 66 da Série D), jogo único até a 4ª fase na casa do time de pior ranking, ida e volta da 5ª fase à semifinal (a Série A entra na 5ª fase), pênaltis no empate, final em campo neutro e premiação por fase. Num jogo já começado antes dela, a Copa começa na temporada seguinte.
- Classificação com zonas, jogos rodada a rodada e artilharia.
- **Escudos dos clubes** (`public/escudos/`), também sem internet. Para trocar algum só no seu aparelho, importe um arquivo `.json` de escudos do Proffut em Configurações → Escudos.
- Mercado: comprar, vender (as propostas chegam nas mensagens, e dá para pedir mais), contratar livres, dispensar.
- Finanças: bilheteria (você define o ingresso), TV, patrocínio, salários e extrato.
- Estádio: ampliar a capacidade ou modernizar (mais conforto, mais público), com custo, tempo de obra e renda extra estimada.
- Objetivo da diretoria e confiança da diretoria e da torcida.
- Virada de temporada: acesso e rebaixamento, premiação, evolução e aposentadoria dos jogadores, jovens da base. A carreira não tem fim.

## Checagem automática

- **No aparelho (funciona sem internet):** toda vez que um jogo é aberto, o save é verificado e o que for seguro corrigir é corrigido sozinho. Em **Configurações → Checagem do jogo** dá para ver tudo: jogo guardado para abrir sem internet, salvamento, proteção do save, espaço, integridade do save e uma partida de teste.
- **No GitHub:** testes de ponta a ponta ([tests/](tests/README.md), numerados R01, R02…) jogam num navegador com tela de iPhone: criam um jogo, jogam partidas, conferem que as telas não ficam cobertas, exportam e importam o save e **jogam sem internet**. Eles rodam a cada alteração, antes de publicar (se um falhar, o site não é atualizado) e **todo dia** no site publicado (`.github/workflows/checagem-diaria.yml`). Se falhar, o GitHub avisa por e-mail. O relatório e as capturas ficam em Actions → execução → Artifacts.

## Publicação

Não há versão de teste separada (decisão de out/2026): cada alteração na `main` roda todos os testes e, só se todos passarem, publica na branch `gh-pages` (`.github/workflows/pages.yml`).
O GitHub Pages serve essa branch (Settings → Pages → Deploy from a branch → `gh-pages`, pasta `/ (root)`).

## Desenvolvimento

```bash
npm install
npm run dev        # site local em http://localhost:5173
npm test           # testes do motor
npm run sim        # simula temporadas e mostra as estatísticas de calibragem
npm run build      # verifica os tipos e gera o site em dist/
npm run test:e2e   # testes de ponta a ponta com tela de iPhone, inclusive sem internet (precisa do build)
npm run verificar  # motor, tipos, site e ponta a ponta: o que tem de passar antes de cada envio
npm run capturas   # tira capturas de cada tela (tools/e2e/capturas/)
```

| Pasta | Conteúdo |
|---|---|
| `src/engine/` | Regras do jogo em TypeScript puro (sem interface): partida, competições, mercado, finanças, temporada |
| `src/ui/` | Telas em React |
| `src/save/` | Salvamento no celular (IndexedDB) e exportar/importar |
| `data/brasil-2026/` | Clubes e regulamentos de 2026 |
| `tests/` | Testes de ponta a ponta (lista em [tests/README.md](tests/README.md)) |
| `tools/` | Simulação em massa, capturas de tela, geração de ícones e de dados |

## Documentos

- [CLAUDE.md](CLAUDE.md): situação atual, pendências e como continuar o trabalho numa nova conversa.
- [PLANO.md](PLANO.md): plano do jogo, decisões e próximos passos.
- [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md): estudo do Brasfoot e de projetos parecidos.
- [data/brasil-2026/LEIAME.md](data/brasil-2026/LEIAME.md): fontes e licença dos dados.

Projeto pessoal, sem fins comerciais. Não usa arquivos, imagens nem dados do Brasfoot. Os escudos e as marcas pertencem aos clubes.
