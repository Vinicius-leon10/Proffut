# Proffut

Jogo onde você é o técnico de futebol. Inspirado no Brasfoot, roda no navegador do celular e pode ser instalado na tela inicial do iPhone.

**Séries A, B e C do Brasil em 2026**, com os 60 clubes reais e os regulamentos de 2026. Os jogadores, por enquanto, são fictícios.

## Como jogar

1. Abra o site no Safari do iPhone: **https://vinicius-leon10.github.io/Proffut/** (depois de publicado, ver abaixo).
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**. O jogo abre em tela cheia, como um app, e funciona sem internet.
3. Escolha seu nome, uma série e um clube.
4. No painel do clube, o botão **Avançar** leva ao próximo jogo. Antes, ajuste a escalação e a tática na aba **Tática**.

O save fica guardado **no próprio celular** e é feito sozinho a cada ação. Para ter um backup ou passar o jogo para outro aparelho, use **Configurações → Exportar save**.

## O que já dá para fazer

- Escolher qualquer clube das Séries A, B ou C.
- Elenco com força, idade, energia, 2 características (o modelo do Brasfoot), lesões e suspensões.
- Escalação no campinho, com a **força efetiva** colorida (posição, cansaço e características).
- Seis formações, seis estilos de jogo, marcação normal ou pressão, jogadas pelo meio ou pelas pontas.
- **Partida ao vivo** minuto a minuto, com narração, os outros jogos da rodada ao mesmo tempo, substituições e mudança de tática durante o jogo.
- Regulamentos de 2026: Série A com 38 rodadas, playoff de acesso na Série B, quadrangulares e final na Série C.
- Classificação com zonas, jogos rodada a rodada e artilharia.
- Mercado: comprar, vender (as propostas chegam nas mensagens), contratar livres, dispensar.
- Finanças: bilheteria (você define o ingresso), TV, patrocínio, salários e extrato.
- Objetivo da diretoria e confiança da diretoria e da torcida.
- Virada de temporada: acesso e rebaixamento, premiação, evolução e aposentadoria dos jogadores, jovens da base. A carreira não tem fim.

## Publicação

Cada alteração na `main` testa o jogo, gera o site e publica na branch `gh-pages` (`.github/workflows/pages.yml`).
O GitHub Pages serve essa branch (Settings → Pages → Deploy from a branch → `gh-pages`, pasta `/ (root)`).

## Desenvolvimento

```bash
npm install
npm run dev        # site local em http://localhost:5173
npm test           # testes do motor
npm run sim        # simula temporadas e mostra as estatísticas de calibragem
npm run build      # gera o site em dist/
npx vite preview --port 4173 & npm run e2e   # joga no navegador com tela de iPhone e tira capturas
```

| Pasta | Conteúdo |
|---|---|
| `src/engine/` | Regras do jogo em TypeScript puro (sem interface): partida, competições, mercado, finanças, temporada |
| `src/ui/` | Telas em React |
| `src/save/` | Salvamento no celular (IndexedDB) e exportar/importar |
| `data/brasil-2026/` | Clubes e regulamentos de 2026 |
| `tools/` | Simulação em massa, testes no navegador, geração de ícones e de dados |

## Documentos

- [PLANO.md](PLANO.md): plano do jogo, decisões e próximos passos.
- [docs/REFERENCIA_BRASFOOT.md](docs/REFERENCIA_BRASFOOT.md): estudo do Brasfoot e de projetos parecidos.
- [data/brasil-2026/LEIAME.md](data/brasil-2026/LEIAME.md): fontes e licença dos dados.

Projeto pessoal, sem fins comerciais. Não usa arquivos, imagens nem dados do Brasfoot, nem escudos oficiais dos clubes.
