# Plano: temporadas como no mundo real, no mundo todo (19/nov/2026)

Pedidos do usuário: "Em relação a data da temporada, a Europa e a América são diferentes"; "Eu quero criar o jogo com experiência
mais real, mas de forma jogável e divertida"; e, sobre o início: "eu quero que você monte já no mundo todo... quando eu escolher
o europeu, o jogo vai gerar lá com a pré-temporada e com a opção de pular para o início da temporada. Quando ele pular, ele já
vai gerar uma simulação de todas as outras temporadas que começaram no início do ano até aquela data... isso vai acontecer em
qualquer região do mundo, em qualquer time que eu escolher". **Só plano: nada foi mudado no jogo.**

## 0. Princípio

Realista, mas jogável e divertido. Na dúvida, vale o que mantém o jogo jogável: sem tempo morto (o "Avançar" pula os dias sem
jogo do técnico), sem a temporada simulada ficar mais lenta, e cada etapa publicada só quando já dá para jogar.

## 1. Como é hoje

- **Uma temporada só para o mundo** (`estado.temporada`, ~50 usos), de janeiro a dezembro, e **uma virada só**
  (`encerrarTemporada`): acesso e queda, idade, evolução, aposentadoria, contratos, empréstimos, base.
- O jogo novo sempre começa em **3 de janeiro de 2026**, qualquer que seja o clube.
- Brasil: estaduais de janeiro a março, Séries A a D de abril a dezembro. América: ligas de janeiro/abril a novembro.
- Europa, Ásia e África foram **encaixadas nesse ano**: ligas da Europa de janeiro a setembro, copas da UEFA de janeiro a maio,
  contratos acabando em dezembro. A janela de transferências (R139) da Europa foi ajustada a isso (e é o contrário do real).

## 2. A ideia

### 2.1 Um calendário do mundo, em tabela

Uma tabela única (`CALENDARIO_DO_MUNDO`, um registro por país e divisão) diz, para cada liga: **ciclo**, início da
pré-temporada, abertura, pausa de inverno, fim, virada (quando acaba o contrato e sobem/descem os clubes) e janelas de
transferência. Nada fica espalhado pelo código: gerar um campeonato novo é ler essa tabela.

| Ciclo | Pré-temporada → abertura → fim → virada | Países (aproximado; conferir) |
|---|---|---|
| **Ano civil** | jan (ou fev/mar) → nov/dez → 31/12 | Brasil, América do Sul, EUA e Canadá, Coreia, China, nórdicos, Irlanda, bálticos, Belarus, Cazaquistão, Zâmbia, Angola |
| **Dois torneios no ano** | Clausura jan–mai e Apertura jul–dez, virada em 31/12 | México, América Central, Rep. Dominicana |
| **Agosto a maio** | 1º jul → ~meados de ago → maio → 30/jun | Europa (resto), Oriente Médio, Índia, Sudeste Asiático, Egito, Marrocos, Argélia, Tunísia, África do Sul, Nigéria, Gana, Quênia, Tanzânia, Japão (a partir de 2026/27, confirmar) |
| **Outubro a maio** | ~1º set → ~meados de out → maio → 30/jun | Austrália e Nova Zelândia |

### 2.2 O jogo começa quando começa a pré-temporada do **seu** clube

Ao escolher o clube, a **data de início do jogo é a da pré-temporada dele** (da tabela do país):

| Clube escolhido | Começa em | Antes disso o jogo simula |
|---|---|---|
| Brasil e América do Sul (ano civil) | 3 de janeiro de 2026 | nada |
| MLS | ~fim de janeiro | só poucas semanas |
| Europa, Oriente Médio, África (agosto a maio) | ~1º de julho de 2026 | janeiro a junho do mundo do ano civil (estaduais, Séries A a D, Libertadores, MLS, México...) |
| Austrália e Nova Zelândia | ~1º de setembro de 2026 | janeiro a agosto do ano civil **e** o começo da 2026/27 da Europa |

- Nessa data o técnico está na **pré-temporada**: Mercado com a janela aberta, elenco, tática, e o botão **"Pular para o início
  da temporada"** (quando ele pula, o jogo leva ao dia da abertura; se quiser, joga amistosos antes: opcional, fica para depois).
- **Pré-simulação do mundo (pedido do usuário):** tudo que já devia ter começado até a data de início do clube é simulado
  **automaticamente**, com uma tela "Preparando o mundo… até julho de 2026", barra de progresso e, se ele fechar o app, retoma.
  Usa a simulação rápida que já existe (os jogos que o técnico não acompanha) e só roda uma vez, na criação do jogo. Quem
  começa em janeiro não espera nada.
- **Recomendação:** rodar a pré-simulação **na criação do jogo** e não no clique de "pular". O efeito para o usuário é o mesmo,
  mas a pré-temporada já tem um mundo vivo (Mercado com os times do Brasil como estão em julho, notícias, propostas).
- **A temporada anterior da Europa (2025/26):** considerada **encerrada pelos resultados reais** (as tabelas finais que já
  temos para as 1ªs divisões e os clubes das listas atuais); o jogo não simula a 2025/26 de novo. A composição das divisões
  (quem subiu e quem caiu em 2026) fica como nas listas atuais; a 2026/27 é a primeira temporada jogada.

### 2.3 Dois ciclos, duas viradas

- **Ciclo "ano":** como hoje, vira em 31 de dezembro.
- **Ciclo "agosto":** vira em 30 de junho: acesso e queda, contratos de 30/06, empréstimos, evolução dos jogadores, base. A
  janela grande abre em 1º de julho.
- O relógio do jogo é um só e corrido. O técnico vive no ciclo do clube dele: o botão **"Encerrar a temporada"** aparece quando
  **o ciclo dele** acaba (dezembro para o brasileiro, junho para o europeu); o resto do mundo segue simulado.
- Idade dos jogadores: **uma vez por ano, em 1º de janeiro, para todos**; força (evolução) na virada do ciclo do clube.

## 3. Etapas (cada uma sai publicada, com teste antes; R140 em diante)

| # | Etapa | O que o usuário vê | Risco |
|---|---|---|---|
| 1 | **Base:** `CALENDARIO_DO_MUNDO`, `ciclo` por clube e torneio, rótulo da temporada por campeonato ("2026", "2026/27"), `estado.temporada` vira "ano do ciclo ano"; tudo gerado pela tabela, mas com as mesmas datas de hoje | nada | baixo (a impressão digital de uma temporada tem de continuar igual) |
| 2 | **Campeonatos do mundo todo no calendário real:** ligas da Europa, Oriente Médio, África, Ásia e Oceania de agosto/outubro a maio (pausa de inverno, datas FIFA respeitadas), México e América Central em dois torneios; **virada por ciclo** (`encerrarCiclo`) | o mundo joga como no real | **alto** (duas viradas: idade, evolução, contratos, empréstimos, aposentadoria, base, histórico) |
| 3 | **Início pelo clube escolhido:** data de início do jogo pela tabela, pré-temporada, "Pular para o início da temporada", **pré-simulação do mundo com barra de progresso**, mundo "ainda não começou" para quem espera | escolher qualquer clube do mundo e começar na hora certa | **alto** (desempenho e estado do mundo no meio do ano) |
| 4 | **Copas e seleções no calendário real:** UEFA (fase de liga setembro a janeiro, mata-mata fevereiro a maio, finais no fim de maio), supercopas em agosto, copas nacionais por ciclo, Ligas dos Campeões da Ásia e da África, Mundial de Clubes; vagas por tabelas de ciclos diferentes; Eurocopa e Copa do Mundo em junho/julho já fora da temporada europeia | Liga dos Campeões do jeito certo | médio |
| 5 | **Técnico por ciclo:** botão e tela de fim de temporada, histórico "2026/27", sala de troféus, objetivo, confiança e demissão por ciclo; convite de clube de outro ciclo (Brasil para Europa: o técnico chega na pré-temporada dele) | jogar com time de qualquer região direito | médio |
| 6 | **Saves antigos e acabamento:** `migrar` leva o jogo atual para os ciclos (a Europa muda na próxima temporada), janelas reais (Europa julho–agosto e janeiro), `npm run sim`, desempenho, equilíbrio | tudo junto | médio |

Estimativa: **8 a 10 conversas** (as etapas 2 e 3 podem ocupar duas cada). As etapas 1 a 3 já dão o essencial: clubes de
qualquer região começando na hora certa.

## 4. Onde mexer

`competicoes.ts` (`criarTemporada`, `temporadaEncerrada`), `torneios.ts` (`criarTorneios`, `inicioDoAno`, ligas de fora),
`calendario.ts` (`inicioDaTemporada`, datas por ciclo), `temporada.ts` (`encerrarTemporada` vira `encerrarCiclo(ciclo)`),
`jogo.ts` (`novoJogo` com data de início por clube, pré-simulação, `avancar`, mercado do computador), `copas.ts` (UEFA, AFC,
CAF, `SEMANAS_EUROPA`, `vagasDasCopas`), `selecoes.ts`, `modoCopa.ts` (a pausa da Copa só vale para quem ainda joga em
junho), `contratos.ts` (`contratoAte` por ciclo: 31/12 ou 30/06; aviso de "Contratos terminando"), `emprestimos.ts`,
`diretoria.ts`, `carreira.ts`, `trofeus.ts`, `regras.ts` (janelas), `salvamento.ts` (`migrar`), telas Novo jogo (aviso da
pré-simulação e data de início), Principal (botão "Pular para o início da temporada"), Tabelas, Histórico e fim da temporada.
Campo novo no `EstadoJogo` sempre opcional e com correção em `migrar`/`repararEstado`.

## 5. Riscos e cuidados

- **Pré-simulação:** de janeiro a setembro do mundo todo pela simulação rápida; hoje uma temporada inteira leva ~9 s aqui, então
  a pré-simulação de meio ano fica em alguns segundos, mas no iPhone tem de andar em pedaços (uma semana por vez), com a barra
  de progresso e sem travar a tela; o resultado não pode mudar conforme o aparelho (mesma semente, mesmo mundo).
- Duas viradas por ano: idade, evolução e aposentadoria não podem acontecer duas vezes; jogador que muda de ciclo (Brasil para
  Europa) precisa de contrato convertido.
- `npm run sim` e a checagem do estado passam a simular dois ciclos; a temporada simulada não pode ficar mais lenta.
- Jogo já salvo: nada se perde; a Europa só muda de calendário na temporada seguinte.
- Vagas das copas continentais vêm de campeões de ciclos diferentes (Libertadores acaba em novembro, Liga dos Campeões em maio):
  Mundial de Clubes e supercopas usam "o campeão mais recente".

## 6. Perguntas que ainda faltam

1. A **pré-simulação na criação do jogo** (recomendado) em vez de no clique de "pular": pode?
2. **Amistosos de pré-temporada** (jogar 2 ou 3 jogos antes da abertura): entram junto na etapa 3 ou ficam para depois?
   Recomendo depois: o "pular" já resolve.
3. A **tabela de ciclos por país** da seção 2.1 está certa? (Japão em agosto a maio; MLS no ano civil; México e América Central
   em dois torneios.)
