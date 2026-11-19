# Plano: temporadas como no mundo real (19/nov/2026)

Pedido do usuário: "Em relação a data da temporada, a Europa e a América são diferentes" e "crie o plano das temporadas reais
do mundo". **Só plano: nada foi mudado no jogo.** Ele decide as perguntas do fim antes de começar.

## 0. Princípio (pedido do usuário, 19/nov/2026)

"Eu quero criar o jogo com experiência mais real, mas de forma jogável e divertida." Na dúvida entre realidade e diversão, vale
o que mantém o jogo **jogável**: sem tempo morto (o "Avançar" pula os dias sem jogo do técnico), sem tela nem regra que dê
trabalho à toa, sem a temporada simulada ficar mais lenta, e cada etapa publicada só quando já dá para jogar.

## 1. Como é hoje

- O jogo tem **uma temporada só para o mundo inteiro**: um ano (`estado.temporada`, usado em ~50 lugares) que vai de janeiro a
  dezembro, e **uma virada só**, no botão "Encerrar a temporada" (`encerrarTemporada`, temporada.ts): acesso e queda, idade,
  evolução, aposentadoria, contratos, empréstimos, base.
- Brasil: estaduais de janeiro a março, Séries A a D de abril a dezembro (`inicioDaTemporada`: 1º sábado de abril).
- América do Sul e Concacaf: ligas aos domingos, de janeiro/abril a novembro.
- **Europa, Ásia e África foram encaixadas nesse mesmo ano**: as ligas da Europa começam em janeiro (`SEMANA_ESTADUAIS`) e
  acabam em setembro; as copas da UEFA vão de janeiro a maio; os contratos acabam em dezembro. Na vida real a Europa joga de
  agosto a maio, atravessando a virada do ano.
- As janelas de transferência (R139) da Europa foram ajustadas a esse calendário do jogo (janeiro–março e junho–julho), que é o
  contrário do real (julho–agosto e janeiro).

## 2. Como é no mundo real (aproximado; conferir na hora de fazer)

| Grupo | Temporada | Países |
|---|---|---|
| **Ano civil** | janeiro/março a novembro/dezembro | Brasil, Argentina, Chile, Uruguai, Paraguai, Peru, Equador, Bolívia, Venezuela, Colômbia (2 torneios), EUA e Canadá (MLS, USL, CPL), Coreia do Sul, China, Noruega, Suécia, Finlândia, Islândia, Irlanda, países bálticos, Belarus, Cazaquistão, Zâmbia, Angola |
| **Dois torneios no ano** | Clausura (jan–mai) e Apertura (jul–dez) | México, Honduras, Guatemala, El Salvador, Panamá, Costa Rica, Nicarágua, Rep. Dominicana |
| **Agosto a maio** | começa em julho/agosto e acaba em maio/junho | toda a Europa central, oeste, sul e leste (Inglaterra, Espanha, Itália, Alemanha, França, Portugal, Holanda, Bélgica, Áustria, Suíça, Dinamarca, Escócia, Grécia, Croácia, Sérvia, Turquia, Polônia, Tchéquia, Romênia, Ucrânia, Rússia...), Arábia Saudita, Catar, Emirados, Irã, Iraque, Jordânia, Kuwait, Bahrein, Uzbequistão, Índia, Tailândia, Vietnã, Malásia, Indonésia, Egito, Marrocos, Argélia, Tunísia, África do Sul, Nigéria, Gana, Quênia, Tanzânia; Japão a partir de 2026/27 (confirmar) |
| **Outubro a maio** | | Austrália e Nova Zelândia (A-League) |

Janelas de transferência reais: **ano civil** janeiro–março e julho–agosto; **agosto a maio** julho–agosto (grande) e janeiro
(curta). Contratos acabam em **31 de dezembro** (ano civil) e **30 de junho** (agosto a maio).

## 3. A ideia

Trocar "uma temporada do mundo" por **dois ciclos**, cada um com a sua virada:

- **Ciclo "ano"** (Brasil, América, MLS, Coreia, China, nórdicos...): como hoje, vira em dezembro.
- **Ciclo "agosto"** (Europa, Oriente Médio, boa parte da África e da Ásia): começa em agosto, para em dezembro/janeiro
  (pausa de inverno de ~2 semanas), acaba em maio, **vira em junho** (acesso e queda, contratos de 30 de junho, empréstimos,
  evolução dos jogadores, base) e a janela grande abre em 1º de julho.
- O relógio do jogo continua um só e corrido. Cada liga, copa e clube sabe a que ciclo pertence (`Clube.ciclo`, tirado do país)
  e cada campeonato tem o seu rótulo de temporada ("2026" ou "2026/27").
- O técnico vive no ciclo do clube dele: o botão "Encerrar a temporada" aparece quando **o ciclo dele** acaba (dezembro para o
  brasileiro, junho para o europeu); o resto do mundo segue sendo simulado.

## 4. Etapas (cada uma sai publicada, com teste antes)

| # | Etapa | O que o usuário vê | Risco |
|---|---|---|---|
| 1 | **Base dos ciclos**: `ciclo` por clube e torneio, rótulo da temporada por campeonato, `estado.temporada` vira "ano do ciclo ano"; nada muda na tela | nada | baixo (a impressão digital de uma temporada tem de continuar igual) |
| 2 | **Europa de agosto a maio** (ligas das 7 principais, 16 médios e 31 menores; pausa de inverno; respeitar datas FIFA) com **virada própria em junho** | a Europa joga de agosto a maio, os campeões saem em maio | **alto** (virada em dois momentos: idade, evolução, contratos, empréstimos, aposentadoria, base, histórico) |
| 3 | **Copas europeias no calendário real**: UEFA (fase de liga setembro a janeiro, mata-mata fevereiro a maio, finais no fim de maio), supercopa em agosto, copas nacionais agosto a maio, vagas pela tabela final de maio | Liga dos Campeões do jeito certo | médio |
| 4 | **Ásia, África e Oceania** nos ciclos certos (Arábia, Catar... agosto a maio; Austrália outubro a maio) com as Ligas dos Campeões da Ásia e da África e o Mundial de Clubes (junho/julho) | mais países com a temporada real | médio |
| 5 | **Técnico em ciclo de agosto**: botão e tela de fim de temporada, histórico "2026/27", sala de troféus, objetivo, confiança e demissão por ciclo; convite de um clube de outro ciclo (Brasil para Europa) | jogar com um time europeu direito | médio |
| 6 | **Saves antigos e acabamento**: `migrar` leva o jogo atual para os ciclos (a Europa muda na próxima temporada), `npm run sim`, desempenho, janelas de transferência reais (Europa julho–agosto e janeiro) | tudo funcionando junto | médio |

Estimativa: **6 a 8 conversas** de trabalho (a etapa 2 sozinha pode ocupar duas). Em cada etapa: teste novo escrito antes
(R140 em diante), `npm run verificar` verde, publicação e aviso de como testar no iPhone.

## 5. O que muda por baixo (lista de onde mexer)

- `competicoes.ts` (`criarTemporada`, `temporadaEncerrada`), `torneios.ts` (`criarTorneios`, `inicioDoAno`, ligas de fora),
  `calendario.ts` (`inicioDaTemporada`, datas por ciclo), `temporada.ts` (`encerrarTemporada` vira `encerrarCiclo(ciclo)`),
  `jogo.ts` (`avancar`, `novoJogo`, mercado do computador em julho e janeiro), `copas.ts` (UEFA, AFC, CAF, `SEMANAS_EUROPA`,
  `vagasDasCopas`), `selecoes.ts` (datas FIFA já são fixas; a Eurocopa e a Copa do Mundo em junho/julho deixam de colidir com a
  Europa), `modoCopa.ts` (a pausa da Copa só vale para quem ainda joga em junho), `contratos.ts` (`contratoAte` por ciclo:
  31/dez ou 30/jun; aviso de "Contratos terminando" em setembro ou em abril), `emprestimos.ts`, `diretoria.ts`, `carreira.ts`,
  `trofeus.ts`, `regras.ts` (janelas reais), telas Principal, Tabelas, Histórico e fim da temporada.
- Idade dos jogadores: **uma vez por ano** (1º de janeiro, para todos); força (evolução) na virada do ciclo do clube.
- Campo novo no `EstadoJogo` sempre opcional e com correção em `migrar`/`repararEstado` (regra do projeto).

## 6. Riscos e cuidados

- Duas viradas por ano: idade, evolução e aposentadoria não podem acontecer duas vezes; jogador que muda de ciclo (Brasil para
  Europa) precisa de contrato convertido.
- A "Checagem do estado" e `npm run sim` precisam passar a simular dois ciclos; a temporada simulada hoje leva ~9 s e não pode
  dobrar.
- Quem está com um jogo salvo: nada se perde, mas a Europa só muda de calendário na temporada seguinte.
- Vagas das copas continentais dependem de campeões de ciclos diferentes (a Libertadores acaba em novembro, a Liga dos
  Campeões em maio): o Mundial de Clubes e as Supercopas usam "o campeão mais recente".

## 7. Perguntas para o usuário decidir

1. **Começo de 2026 na Europa.** O jogo novo começa em 3 de janeiro de 2026. Na vida real a Europa já está no meio da 2025/26.
   Recomendo: a primeira temporada jogada da Europa é a **2026/27, começando em agosto de 2026**; até lá o técnico europeu usa
   o Mercado (janela de janeiro) e o jogo avança rápido até o 1º jogo. Alternativa: começar a data do jogo dos europeus em
   1º de julho de 2026.
2. **A divisão dos países nos grupos** da tabela da seção 2 está certa? (Em especial: Japão em agosto a maio, MLS ainda no ano
   civil, México e América Central em dois torneios.)
3. **Quanto da Ásia e da África entra agora?** Recomendo fazer a Europa (etapas 1 a 3) primeiro, publicar, e só depois Ásia,
   África e Oceania (etapa 4).
4. **Envelhecer em 1º de janeiro para todos**: pode?
