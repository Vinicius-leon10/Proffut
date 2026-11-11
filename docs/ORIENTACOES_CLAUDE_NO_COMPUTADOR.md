# Orientações para o Claude no computador do Vinicius

Você vai trabalhar sozinho no computador do Vinicius enquanto ele trabalha. O trabalho é juntar **escudos** e
**jogadores reais** que faltam no Proffut, o jogo de técnico de futebol dele (site: https://vinicius-leon10.github.io/Proffut/,
código: https://github.com/vinicius-leon10/proffut). Você **não mexe no código**: junta os arquivos, confere e manda na
conversa do Claude Code do projeto, que confere de novo e coloca no jogo.

## Regras

- Busque no **Google Imagens** e em páginas públicas (Wikipédia, Transfermarkt, sites das ligas e dos clubes, Soccerway,
  FotMob). Não use nada do jogo Brasfoot (arquivos, listas, imagens).
- Não crie contas, não pague nada, não aceite termos em nome do Vinicius, não digite senhas.
- Trabalhe em lotes pequenos (50 escudos ou 10 clubes de jogadores por vez) e mande cada lote assim que ficar pronto.
  Se a sessão cair, o que já foi mandado não se perde.
- Na dúvida sobre um escudo ou um jogador, **deixe de fora** e anote no relatório do lote. Um faltando é melhor que um
  errado.
- Pasta de trabalho: `Downloads/proffut/` (crie se não existir), com uma subpasta por lote.

## Parte 1: escudos (1.613 clubes)

**A lista:** https://github.com/vinicius-leon10/proffut/blob/claude/ecstatic-thompson-nw204h/docs/TIMES_NOVOS.md
(nome do clube no jogo, cidade e o nome do arquivo de cada um, por país).

**Ordem:** 1) Ásia e África; 2) a 1ª divisão dos países novos da Europa (Hungria, Israel, Chipre, Eslováquia, Bulgária...);
3) a 2ª divisão da Europa; 4) o resto (3ª divisões).

**Como fazer cada um:**
1. Pesquise no Google Imagens "<nome do clube> <cidade> escudo" ou "<nome> logo png".
2. Confira que é o escudo **do clube certo** (mesma cidade e país; cuidado com clubes de mesmo nome em outros países) e
   **atual**.
3. Prefira PNG com fundo transparente, de pelo menos 128 px. Nada de: foto de estádio ou camisa, faixa ou anúncio com texto,
   dois escudos na mesma imagem, escudo cortado, miniatura borrada, bandeira do país no lugar do escudo.
4. Salve com **exatamente o nome da coluna "arquivo"** da lista (ex.: `ferencvaros.png`), tudo minúsculo.

**Entrega de cada lote:**
- `escudos-lote-NN.zip` com os PNGs.
- `escudos-lote-NN.csv` com as colunas `arquivo,clube,fonte` (o endereço da página de onde veio a imagem).
- `escudos-lote-NN-prancha.png`: uma imagem com todos os escudos do lote lado a lado e o nome do arquivo embaixo de cada um
  (para a conferência rápida).
- No relatório, os que ficaram de fora e por quê.

## Parte 2: jogadores reais

**A lista dos clubes sem jogadores reais (697):**
https://github.com/vinicius-leon10/proffut/blob/claude/ecstatic-thompson-nw204h/docs/JOGADORES_QUE_FALTAM.md

**Ordem:**
1. **Séries B e C do Brasil de 2026:** o jogo tem quem jogou por esses clubes em 2025. Traga o **elenco atual de 2026** dos
   20 clubes da Série B e dos 20 da Série C (Transfermarkt → clube → "Plantel", temporada 2026).
2. Os clubes brasileiros da lista (estaduais e Série D).
3. Os de fora do Brasil que não são "(leve)".
4. Os "(leve)" (3ª divisões), por último.

**Formato (um CSV por lote, `jogadores-lote-NN.csv`, separado por vírgula, UTF-8):**

```
clube_id,nome,posicao,nascimento,nacionalidade,camisa,fonte
flamengo,Pedro,A,1997-06-20,Brasil,9,https://www.transfermarkt.com.br/...
```

- `clube_id`: o id da lista (a última coluna).
- `nome`: como o jogador é conhecido (o nome da camisa ou o apelido: "Pedro", "Gerson").
- `posicao`: uma letra: **G** goleiro, **L** lateral (direito ou esquerdo), **Z** zagueiro, **M** meio-campo (volante e meia),
  **A** atacante (ponta e centroavante).
- `nascimento`: AAAA-MM-DD (se só tiver o ano, AAAA-01-01).
- `nacionalidade`: o país por extenso, em português ("Brasil", "Argentina", "Hungria").
- `fonte`: a página de onde veio o elenco (uma por clube basta, repetida em cada linha).
- Pelo menos 18 jogadores por clube, com 2 goleiros ou mais. Só o elenco principal (sem base, sub-20 e emprestados para
  fora).

## Como mandar

Mande cada lote **na conversa do Claude Code do Proffut** (a mesma em que o Vinicius pediu esta tarefa), anexando os
arquivos, com uma mensagem curta: "Lote NN de escudos (ou jogadores): X arquivos; ficaram de fora: ...". Não espere
resposta para começar o próximo lote. Se não conseguir anexar na conversa, deixe tudo em `Downloads/proffut/` e avise.

## Ao terminar (ou quando o Vinicius voltar)

Um relatório final em `Downloads/proffut/RELATORIO.md`: quantos escudos e quantos clubes de jogadores foram mandados, os
lotes, e a lista do que ficou de fora com o motivo.
