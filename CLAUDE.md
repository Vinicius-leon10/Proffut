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
Clubes brasileiros das Séries A, B, C e D de 2026 (regulamentos de 2026), os clubes que só jogam os 27 estaduais e a
primeira e a segunda divisão de 2026 dos outros 9 países da Conmebol (com acesso e queda), com os jogadores reais (`data/brasil-2026/jogadores.json` e
`data/america-do-sul-2026/jogadores.json`); a força de cada jogador é calculada por nós.

## Situação (out/2026)

Pronto e publicado: partida ao vivo, tática, elenco, mercado, finanças, estádio (ampliar/modernizar), diretoria,
virada de temporada sem fim, rebaixamento para a Série D com propostas de emprego, checagem automática no app,
elencos reais nos jogos novos, Copa do Brasil, "Pedir mais" nas propostas recebidas (que ficam em Mercado → Meus à venda,
embaixo de cada jogador, com Aceitar, Pedir mais e Recusar: `AcoesDaProposta` em `Mensagens.tsx`, R62; saíram do painel
do Clube: o botão Mercado da barra de baixo mostra quantas há, `propostasPendentes` em `mercado.ts`, e o Mercado abre
em Meus à venda, que lista também quem recebeu proposta sem estar à venda, R63), sons da partida, escudos dos
clubes (os que o usuário mandou), time titular do adversário antes do jogo (toque no escudo dele no painel ou no
placar), visual claro "opção 3", estatísticas da partida com aviso de pressão, campo 2D na partida, demissão e convites de clubes maiores
(reputação do técnico), contratos com renovação, empréstimos, batedor de pênalti e capitão, notas dos jogadores,
sala de troféus e recordes, tutorial rápido no jogo novo, força média no placar, tática e campinho da escalação antes do
jogo (arrastar para trocar, toque para pôr um reserva, barrinha de energia, escolha por posição e botão Reservas), testes de ponta a
ponta R01–R97 rodando a cada mudança, antes
de publicar e todo dia no site publicado. Bandeira pequena do país do jogador ao lado do nome (`BandeiraJogador` em `componentes.tsx`,
`bandeiraDaNacionalidade` em `formatos.ts`: código de 3 letras do jogo → emoji; no Elenco, ficha, Mercado e Convocação;
no campinho não, por falta de espaço; R97).

**Último pedido (out/2026), concluído:** da lista de mudanças o usuário escolheu "1, 2, 4, 5, 7, 8, 16, 19": demissão
(1) e convites (2), contratos (4), empréstimos (5), batedor/capitão (7), notas (8), sala de troféus (16) e tutorial
rápido (19), todos publicados.

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
cobrança. No intervalo, `noIntervalo` (AoVivo) segura o relógio até o toque no ▶: dois toques do relógio antes de a
tela parar passavam do intervalo (R57). No iPhone o som só sai depois de um toque (`liberarSom` em "Começar o jogo" e no ▶) e a chave do
silencioso cala o apito e a torcida. Liga/desliga: botão de som na partida e Configurações → Sons da partida
(`config.som`, opcional: falta = ligado). Os testes (R25, R27; `escutarSons` em `tests/ajuda.ts`) escutam os sons
trocando `OscillatorNode.start`, `AudioBufferSourceNode.start` e `speechSynthesis.speak` no navegador de teste, e
anotam o volume de cada som (maior valor marcado nos ganhos por onde ele passa) e os sons do mesmo instante.

**Estatísticas da partida (out/2026, `partida.ts` e `AoVivo.tsx`):** fixas na tela do jogo e travadas em cima, fora da
área que rola: só os lances rolam embaixo (R59; sem abas:
fica só a caixa Rodada, que abre os outros jogos numa folha sem parar o jogo, e a Notas no fim; R56), no modelo da
captura que o usuário mandou e reduzidas ao print dele (R58): os dois times, ataques, ataques perigosos e posse em anéis;
escanteios e cartões. Chutes (no gol e para fora ou bloqueados) e a pressão dos últimos 15 minutos saíram da tela, mas o
motor ainda os calcula (a pressão liga o aviso; os chutes têm teste no motor). Mandante à esquerda como no placar; meu time em verde
(`--esmeralda`), o adversário em azul (`--azul`). Contam os lances de verdade (cada `finalizacao` e pênalti vira chute,
cartões saem de `LadoVivo.amarelos`/`expulsos`) e, a cada minuto, `estatisticasDoMinuto` soma a posse e os ataques que não
viram lance, pelas mesmas forças do jogo (meio para a posse, ataque × defesa para o perigo) com sorteio próprio
(`estatisticas/<id>`): **placar e lances não mudam** (impressão digital de uma temporada igual antes e depois, e teste no
motor). Números em `ESTATISTICAS` (`constantes.ts`): ~100 ataques, ~50 perigosos, ~13 chutes (~4,5 no gol) e ~5
escanteios por time. Só a partida do usuário tem `PartidaViva.estatisticas` (as outras não aparecem; calcular em todas
deixava a temporada simulada 68% mais lenta). Aviso de pressão (`sobPressao`, `AVISO_PRESSAO`): liga com o adversário
com 14+ ataques perigosos nos últimos 15 minutos e o triplo dos meus, desliga abaixo de 10 ou do dobro (não pisca);
some no intervalo e no fim. Aparece em ~1 de 5 jogos entre times iguais e em ~4 de 5 contra time bem mais forte. R34, R35.

**Campo 2D da partida (nov/2026, `src/engine/campo.ts`, tela `CampoDaPartida.tsx`):** no estilo dos campos ao vivo dos
aplicativos que o usuário mandou (capturas): campo deitado com a bola e o caminho dela no minuto, a sombra do time com a
bola (do gol dele até a bola, no mínimo o meio-campo, com a ponta virada para o ataque) e o rótulo do lance ("Em posse",
"Bola segura", "Ataque", "Ataque perigoso", "Chute para fora", "Chute defendido", "GOL!", "Escanteio", "Falta", "Pênalti!",
"Cartão amarelo"...) com o escudo e o nome do time e, perto da bola, o nome do jogador. Fica no alto da tela da partida, de
ponta a ponta, no lugar do placar grande e dos escudos, com o relógio numa caixinha em cima (pedido e captura de exemplo
do usuário); o placar vira uma barra embaixo do campo, numa linha só (`.placar.ao-vivo`: escudos de 30 px, nome, gols e a
cor de cada time nas pontas; o escudo do adversário ainda abre o time titular). Sem a força média na partida, para o campo
ter mais espaço (R61): o campo tem 60 de largura por 105 e a competição e a rodada ficam num texto pequeno embaixo, no
campo. O rótulo do lance
fica no meio do lado do campo longe da bola, com o nome do jogador embaixo; a bola tem a cor do time com ela. Antes do
jogo o placar grande continua (R46). O motor: `PartidaViva.campo` (só na partida do usuário, só na
memória) guarda o `LanceDoCampo` do último minuto; no fim de `avancarMinuto`, `lanceDoMinuto` desenha o minuto a partir
do lance principal decidido pelo jogo (`FocoDoMinuto`: chance, escanteio, falta ou cobrança de pênalti), da narração do
minuto (gol > pênalti perdido > pênalti marcado > chute > cartão > fim do tempo > falta > escanteio) e, sem lance
narrado, dos ataques e da posse do minuto nas estatísticas (quem atacou mais e até onde: segura, posse, ataque, perigo).
x vai de 0 (gol do mandante, à esquerda) a 100; o mandante ataca para a direita o jogo todo. A bola sai de onde parou.
Sorteio próprio (`campo/<partida>`): **placar, lances e estatísticas não mudam** (teste no motor). A bola anda com
transição de 80% do minuto. A caixa Rodada foi para a linha do Substituir e da Tática, para sobrar espaço para os lances.
R60.

**Carreira do técnico (out/2026, `src/engine/carreira.ts`):** `Tecnico.reputacao` (0–100; começa com a do clube; save
antigo usa a do clube atual), `desde` (carência: no primeiro mês não há demissão; save antigo marca no primeiro jogo),
`avisoDeRisco`, `demissao` ({ data, clubeId, propostas }). Depois de cada jogo do usuário (`depoisDoMeuJogo`): confiança da
diretoria ≤ 35 → mensagem "Cargo em risco" (uma por mês; o painel mostra o aviso); ≤ 20 depois da carência → demitido:
reputação −6 e três propostas de clubes A/B/C com reputação até a dele. Na virada: abaixo do objetivo e confiança ≤ 20
→ demitido. Quem cai para a D continua no clube (o técnico treina qualquer clube desde nov/2026, R81; antes, no R72, era
obrigado a escolher um clube da Série C). Enquanto `demissao` existe,
`Principal` mostra a tela `Demissao` no lugar do painel (continua depois de fechar o app). Convites (`Mensagem.convite`, tipo
"convite"): no meio da fase de liga (jogo nº metade) para quem está "encaminhado" (1 convite) e na virada para quem
cumpriu, subiu ou foi campeão (2); clubes da mesma série ou acima, com reputação > a do clube atual + 3 e ≤ a do técnico
+ 10; valem 10 dias; aceitar (`responderConvite`) chama `assumirClube` com confiança 65 e derruba os outros convites e as
propostas pelos jogadores do clube antigo. Números em `CARGO`, `REPUTACAO` e `CONVITES` (`constantes.ts`). Com o
computador no lugar do usuário, demitido em ~12% das temporadas (todas abaixo do objetivo), por volta do 25º jogo. R36, R37.

**Contratos (out/2026, `src/engine/contratos.ts`):** `Jogador.contratoAte` = última temporada do contrato (livres e os
elencos da Série D montados para a Copa não têm). Jogo novo: termina em 2026–2029 (`garantirContratos`, pelo id;
~25% na primeira temporada; os mais velhos, menos). Save antigo: `migrar` (salvamento.ts) dá contrato a partir da
temporada seguinte (ninguém sai na temporada em andamento). Reforço (`transferir`): `contratoNovo` = temporada +
`anosMaximos(idade)` (3; 2 dos 30 aos 32; 1 a partir dos 33). Dispensa e excedentes da IA: `liberar` (sem contrato).
Renovação só no último ano (`renovarContrato`; o jogador pede `pedidoDeRenovacao`: salário de mercado × titular ×
promessa × veterano, nunca menos do que ganha antes dos 30 anos), na ficha do jogador (Elenco), onde o cartão do
contrato tem também "Colocar à venda"; em Mercado → Meus à venda, a seção "Contrato terminando" lista quem está no último
ano e ainda não está à venda, com o mesmo botão (R64). Tocar no jogador em Meus à venda (na lista e em "Contrato
terminando") abre a ficha do Elenco (`FolhaJogador`), com "Tirar da venda" e "Renovar contrato" (R65; antes não
abria nada). Em 1º de setembro chega a
lista "Contratos terminando"; "Encerrar a temporada" pergunta antes citando quem sai. Na virada (`encerrarContratos`):
no clube do usuário, quem não renovou sai de graça e não volta pelo "mínimo da posição"; os clubes do computador
renovam todos por 1 a 3 temporadas (o mundo fica como antes). O salário dos jogadores do usuário não é mais
recalculado na virada (vale o do contrato); o dos outros clubes, sim. R38.

**Empréstimos (out/2026, `src/engine/emprestimos.ts`):** `Jogador.emprestimo` = { de: clube dono, ate: temporada da
volta }; o `clubeId` é o clube onde ele joga, que paga o salário (a folha já vem do `clubeId`). Só até o fim da
temporada. Emprestar (ficha do jogador no Elenco): jogador meu, fora do último ano de contrato e sem deixar a posição
abaixo do mínimo, para um dos três clubes mais fortes que o aceitam (força dele ≥ a do time − 8, ou − 14 até 21 anos;
vaga no elenco). Pegar emprestado (ficha no Mercado): reserva de outro clube (titular não sai), pagando 10% do valor ao
dono (`EMPRESTIMOS`). Emprestado não é comprado, vendido, dispensado, renovado nem levado pela IA; os meus emprestados
saem da lista do Mercado. Na virada (`encerrarEmprestimos`, antes dos contratos) todos voltam e chega "Fim dos
empréstimos". R39.

**Batedor de pênalti e capitão (out/2026):** `Clube.batedor` e `Clube.capitao` (opcionais; só o usuário escolhe, no
cartão da Tática). `LadoVivo.batedor` vem do clube; `cobradores` (partida.ts) põe o escolhido primeiro se estiver em
campo e depois ordena por `notaCobrador`: vale para o pênalti no jogo e para a disputa por pênaltis. Sem escolha a
ordem é a de antes (resultados iguais). O capitão é só da tela: `capitaoDoTime` (forca.ts) = o escolhido se for
titular, senão o titular mais experiente (jogos na carreira); braçadeira "C" (`.vaga .capitao`) no campinho de antes
do jogo e no time titular do adversário. Escolha de quem saiu do clube conta como automático. R40.

**Notas dos jogadores (out/2026, `src/engine/notas.ts`):** `notasDaPartida` dá a nota (3 a 10, uma casa) de quem entrou,
pelos lances narrados (gol, passe, chute no gol/fora, defesa e pênalti defendido do goleiro, cartões, pênalti perdido
ou cometido), gols sofridos e jogo sem sofrer gol (goleiro e defensores), o placar, a força perto da média da partida e
uma variação com sorteio próprio (`notas/<partida>/<jogador>`: placar e lances não mudam). Minutos pela narração
(trocas, vermelho, lesão; no máximo 90); quem jogou menos que o tempo até ali (máx. 60) fica perto da base. Melhor em
campo: maior nota com 30+ minutos. Na caixa Notas da partida (abre numa folha), que só aparece no fim do jogo (pedido do
usuário: "Notas deixe pra aparecer apenas no final da partida", R45); no fim de cada jogo (todos os jogos) a nota entra
em `EstatisticasJogador.notas`/`avaliados` (média na ficha, coluna Nota) e `Partida.melhor`. Números em `NOTAS`
(constantes.ts): média ~6,75, melhor em campo ~8,4, quem fez gol ~7,9, quem perdeu ~6,3. R41.

**Sala de troféus e recordes (out/2026, `src/engine/trofeus.ts`, tela `Trofeus.tsx`, botão no painel):** recordes de
cada clube das Séries A, B e C em `EstadoJogo.recordes` = { desde, clubes } (opcional): depois de cada jogo
(`registrarRecordes`, no fim de `aplicarResultado`) a maior vitória e a pior derrota (pelo saldo, depois pelos gols), o
maior público em casa (sem campo neutro) e os gols pelo clube em todas as competições (`artilheiros`: os 20 primeiros e
quem ainda é do clube ou está emprestado por ele; o nome fica depois que o jogador sai ou se aposenta). Clubes da Série
D não entram. Save antigo: `migrar` chama `montarRecordes` (só os jogos já disputados da temporada em andamento; a tela
diz "Contando os jogos desde"). Títulos (campeão das séries, Copa e vice, acesso) e a carreira do técnico saem do
`historico` (`titulosDoClube`, `carreiraDoTecnico`; o clube do técnico em cada fim de temporada) e de
`Tecnico.clubesAnteriores` (preenchido em `assumirClube`). Placar e lances não mudam; ~60 KB no save. R42.

**Tutorial rápido (out/2026, `src/ui/telas/Tutorial.tsx`):** seis passos numa folha (bem-vindo com o objetivo da
diretoria, Avançar, Tática, partida, Elenco e Mercado, save), com "Pular", "Próximo" e "Começar a jogar". Aparece com
`EstadoJogo.tutorial` (opcional), que só a tela de Novo jogo liga (o `novoJogo` do motor não: os saves montados pelos
testes e os jogos antigos não mostram); terminar ou pular apaga o campo. Configurações → "Ver o tutorial" liga de novo.
Nos testes, `novoJogo` (`ajuda.ts`) pula o tutorial com `pularTutorial`, que espera o save guardar o jogo sem ele (o
jogo salva 400 ms depois; um teste que recarregasse antes veria o tutorial de novo). R43.

**Antes do jogo: placar, tática e campinho da escalação (out/2026, capturas do usuário):** a força média de cada time
(`forcaMediaDoTime` em `Tatica.tsx`: a força de quem está em campo, sem posição nem cansaço) fica em cima do escudo, no
placar da partida antes do jogo (`MediaDoTime`; na partida saiu da barra do placar, R61) (R46). No conteúdo antes do jogo (`PreJogo` em `AoVivo.tsx`)
ficam só os botões "Mudar a tática" e "Reservas" (o cartão com o resumo dos times, a dica do escudo e a regra da Copa
saiu, R50), o campinho e, embaixo dele, só "Começar o jogo" e "Voltar ao clube" (sem texto: a explicação do número e
das cores e a linha "Hoje:" saíram, R55; o tutorial explica). "Mudar a tática" abre `PainelTatica antesDoJogo` ("Tática do seu time"):
muda a tática do clube com `mudarTaticaDoClube` (a mesma da aba Tática; trocando a formação, `redistribuir`) e monta de
novo o lado da partida com `montarLado` (R47). O campinho (`CampoDaEscalacao` em `Tatica.tsx`) mostra quem vai jogar (o
lado da partida, já sem lesionados e suspensos, vaga por vaga) no lugar da lista de titulares (R52): arrastar uma camisa
até outra troca os dois (pointer events nas vagas com `data-vaga` e `touch-action: none`; depois de 8 px vira arrasto, o
alvo sai de `elementsFromPoint`; o clique logo depois de soltar é ignorado) (R48); um toque abre `EscolherJogador` para pôr
outro na vaga, um reserva por exemplo, com a lista em grupos pela posição em campo (`ListaPorPosicao`: o grupo da posição
da vaga primeiro, depois goleiros, laterais, zagueiros, meias e atacantes) (R53); embaixo do nome, a barrinha de energia
(`Barra`, `.vaga .cansaco`) (R49). "Reservas" abre `FolhaDosReservas`: os 7 do banco do lado da partida, pela posição
em campo; um toque escolhe (também por posição, entre quem está fora do time e do banco) quem entra no lugar dele (R54). Toda mudança grava
`clube.escalacao` (titulares e reservas) e monta de novo o lado da partida (ainda no minuto 0). A aba
Tática ficou sem campinho e sem reservas (R51): "Escalar automático", Força do time, Batedor e capitão, Formação, Estilo,
Marcação e jogadas e "Escalar automaticamente antes de cada jogo".

**Copa do Brasil (out/2026, `src/engine/copa.ts`):** regulamento de 2026 com 126 clubes: 1ª fase com os 28 piores do
ranking, 2ª com mais 74, 3ª com mais 4 (em 2026 os de verdade: Paysandu, Ponte Preta, Barra-SC, Confiança; depois, os
4 que subiram da Série C), 5ª com a Série A. Ranking = série + reputação. Jogo único até a 4ª fase na casa do pior
colocado (empate: pênaltis, sem prorrogação); ida e volta da 5ª à semi (melhor ranking decide em casa; empate no
agregado: pênaltis); final em jogo único e campo neutro (`Partida.neutro`: sem mando nem bilheteria). Datas: quartas-
feiras das semanas 0–4, 6, 13–14, 18–19, 28–29 e 34 da temporada (fora das semanas 5, 10, 15, 20 e 25 das séries).
Os 66 clubes da Série D que entram jogam com o elenco deles (desde nov/2026 todo clube da D tem elenco; o elenco só da
Copa, `gerarElencoCopa`/`Clube.elencoDaCopa`, sobrou para saves antigos e sai ao abrir o jogo).
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

**Times novos (nov/2026, `src/engine/torneios.ts`, `tools/times/`):** pedido "Vamos adicionar os times da serie D, times do
estaduais e os times dos países da América do Sul ( só a serie A de cada pais ). Traga os jogadores reais"; ele escolheu
"Tudo jogando já". `Clube.serie` ganhou "estadual" (clube brasileiro só do estadual) e "exterior" (com `Clube.pais` e
`Clube.liga`, código do país: AR, BO, CL, CO, EC, PY, PE, UY, VE); `Clube.estadual` = sigla do estado cujo estadual o clube
joga. `EstadoJogo.torneios` (opcional) guarda os torneios da temporada (`EstadoTorneio`; ids "D", "E-SP", "L-AR"), criados
em `criarTemporada` por `criarTorneios`: **Série D** (os clubes da D com elenco, em grupos regionais de 6 de norte a sul,
turno e returno, 4 de cada grupo passam; mata-mata em ida e volta com a volta na casa da melhor campanha; sobem para a
C os dois finalistas, tantos quantos a C rebaixa; domingos a partir de abril), **estaduais** (no começo do ano, domingos das
semanas −12 a −2 antes das séries, no máximo 11 datas: até 6 clubes turno e returno e final; 7 a 10 turno único,
semifinal e final; 11 ou mais, dois grupos, quartas, semi e final; mata-mata em jogo único na casa da melhor campanha,
pênaltis no empate) e **ligas de fora** (pontos corridos aos domingos, turno e returno até 18 clubes, turno único acima;
o primeiro é o campeão; sem acesso nem rebaixamento). Com estaduais, a temporada começa em janeiro (`inicioDoAno`: uma
semana antes do primeiro domingo do estadual; o jogo novo começa em 3 de janeiro de 2026) e as séries seguem em abril
como antes. `avancar` passa direto (simulando) pelos dias só com jogos que o usuário não acompanha
(`competicoesDoUsuario`: A, B, C, Copa e os torneios do clube dele); Resultados do dia e a caixa Rodada mostram só esses.
Cota de TV do estadual para os clubes das séries (`COTA_TV_ESTADUAL`: os estaduais somam dois meses de salário); a D tem
patrocínio de 60% do da C; clubes só do estadual e de fora não têm contas mensais (fora o do usuário). Rebaixado para a D, o
técnico continua no clube (R81). A IA das
séries pode comprar jogadores de qualquer clube; só os clubes das séries compram, emprestam e contratam técnico. Recordes
contam os clubes de A a D. A virada mantém o elenco mínimo, a base e os excedentes de todos os clubes (os de fora com
jovens do próprio país); os excedentes saem um a um, e a posição de quem sai fica com pelo menos um a mais que o mínimo
(antes, a conta era feita uma vez só e um clube podia ficar sem goleiro, R75). Save antigo: `migrar` chama `juntarAoSaveAntigo` (jogo.ts): entram os clubes que faltam com os
elencos (os da D trocam o elenco só da Copa por um de verdade) e os torneios ficam para a temporada seguinte (se a temporada
nem começou, a D e as ligas de fora já valem). Telas: Tabelas em Séries (com Série D), Copa, Estaduais (escolhe o estado) e
Outros países (escolhe o país); Mercado → "Onde joga" (Séries A a D, "Só estadual" e cada país); painel com o cartão do
estadual em andamento; fim da temporada com campeões da D, dos estaduais e das ligas. Números: 418 clubes, ~11.600
jogadores, ~4.300 jogos por temporada (temporada simulada ~10 s aqui), save de 6 a 10 MB. **Dados**: o robô
`.github/workflows/elencos.yml` com a fase "times" baixa da Wikipédia as páginas de 2026 (Série D, estaduais, ligas; os
participantes vêm das seções de grupos ou de participantes, com as ligações já montadas: na Wikipédia em português os
clubes vêm de predefinições), as páginas dos clubes (ficha e elenco atual: "fs player" em inglês, "Jugador de fútbol" em
espanhol, com nascimento), o Wikidata (clubes, inclusive poliesportivos, e jogadores) e o transfermarkt-datasets (Argentina
e Colômbia) para a branch `dados-times`; `npx tsx tools/times/montar.ts <dados-times> <pasta com as súmulas, inclusive as da
Copa>` grava `clubes-estaduais.json`, `estaduais.json` e os elencos novos de `jogadores.json` (os 60 das séries não mudam) em
`data/brasil-2026/` e `clubes.json` e `jogadores.json` em `data/america-do-sul-2026/`. Os clubes brasileiros novos têm o
elenco das súmulas da CBF (Série D e Copa do Brasil de 2023 a 2025, pelo programa dos elencos das séries, sem quem já está
nas séries); sem súmulas, elenco gerado. Estaduais sem página (AC, AL, ES, MT, TO) usam os clubes do estado no jogo e nas
súmulas. **Listas corrigidas (nov/2026, pedido "Veja o que faltar"):** a seção de participantes das páginas pega também os
clubes citados no texto e nas subseções ("Promovidos e rebaixados": os rebaixados do ano anterior; "Desistências"; quem
perdeu a final da segunda divisão). `montar.ts` agora prefere a tabela das equipes (`SECAO_DE_TABELA`: informações,
estádios, localização) e, nas ligas, a lista de tabela ganha no empate e o clube sem país no Wikidata fica (Real Oruro,
Anzoátegui). Saíram 11 clubes de 7 estaduais (AP, BA, CE, DF, MS, RN, RR) e 5 de fora (IN San Juan, Jorge Wilstermann,
Deportes Quindío, Titanes, Yaracuyanos); entraram Real Oruro e Anzoátegui. O relatório do `montar.ts` também compara a
Série D do jogo com a página de 2026: a diferença era o Ivinhema (na D de 2026) no lugar do Pantanal (que ficou só no
estadual), trocado em `serie-d-reserva.json`. Saves com os times novos: `migrar` chama `acertarParticipantes` (jogo.ts):
entram os clubes que faltam e cada clube fica com o estadual e a liga das listas atuais (vale na próxima temporada; quem
saiu continua no jogo, sem campeonato; a Série D do save não muda). Cidades que as fontes não dão: `MANUAL_CIDADES`. R74.
`docs/TIMES_NOVOS.md` (gerado por `tools/times/lista.py`) lista os escudos que faltam (todos os clubes do jogo, de
qualquer série); os dos 276 times novos chegaram em nov/2026 (R73). R66–R69.

**Segunda divisão da América do Sul (nov/2026):** pedido "Conseguimos esta colocando as outras series dos paises da
america do sul ?"; ele escolheu "Com acesso e queda". 150 clubes: Argentina 36 (Primera Nacional, turno único), Bolívia 14
(Copa Simón Bolívar), Chile 16, Colômbia 16, Equador 11, Paraguai 16 (Intermedia), Peru 17, Uruguai 14 e Venezuela 10, sem
os times B (reservas de clubes da primeira, que não sobem: Monagas B, Zamora B, Sport Huancayo II) e sem quem a página só
cita (o Atlético Huila virou o Independiente Valle del Cauca; o Coopsol caiu para a 3ª). O Deportes Quindío e o
Yaracuyanos, que saíram da primeira no R74, voltam aqui com o mesmo id e escudo. **Motor:** `Clube.liga` = "AR" na primeira
e "AR2" na segunda (a ficha tem `liga` só na segunda); torneio `L-AR2` (`nomeDoTorneio`: "Campeonato Argentino – 2ª
divisão"), jogado como as ligas de fora. Na virada, `trocarDivisoes` (torneios.ts, logo depois do acesso da Série D): os
últimos da primeira descem e os primeiros da segunda sobem, pela tabela da temporada (sem playoffs nem médias),
`SOBEM_E_CAEM` por país (Uruguai 3, Venezuela 1, os outros 2; `vagasEntreDivisoes` limita pelo tamanho). Save antigo:
`acertarParticipantes` põe os clubes da segunda com `liga` "XX2" (vale na temporada seguinte) e, nos países em que o save já
tem a segunda (algum clube com "XX2"), a divisão do save manda: abrir o jogo não desfaz o acesso e a queda (R78). Base e
completar elenco usam a nacionalidade de `Clube.pais` (não de `liga`). **Telas:** Tabelas → Outros países: escolhe o país
e, com as duas divisões, "1ª divisão" ou "2ª divisão" (abre na 1ª); a zona de queda (vermelha) na 1ª e a de acesso
(verde) na 2ª, com a regra embaixo (R77). Mercado → "Onde joga" com o país pega as duas divisões (`Clube.pais`). Fim da
temporada: campeões só das primeiras divisões. **Fim do ano:** a 2ª da Argentina (35 rodadas) termina depois da final da
Série C num save sem a Copa; o `avancar` que joga os últimos jogos de fora devolve `fim-dos-jogos` e para (o painel mostra
"Encerrar a temporada", que pergunta quem sai de graça); antes ele fazia a virada direto (R79). **Desempenho:** o
`aplicarResultado` procurava o elenco dos dois times varrendo os ~16 mil jogadores a cada partida, e o mercado do
computador contava o elenco de cada vendedor do mesmo jeito (`podeSair`); agora os elencos do dia saem uma vez só
(`concluirJogos`) e o mercado conta uma vez por janela (`contarElencos`): mesmos resultados (impressão digital de duas
temporadas igual) e 30% mais rápido. Números: 568 clubes, ~16.000 jogadores, ~6.700 jogos por temporada (temporada
simulada ~11 s aqui; antes, sem a segunda, ~10 s), save de 9 a 14 MB. **Dados:** fase "segundas" do robô
(`elencos.yml`, sementes `liga2-XX-en`/`-es`) grava a branch `dados-segundas`; `npx tsx tools/times/montar.ts <dados-times>
<súmulas> <dados-segundas>` junta os dados (o que já veio da `dados-times` fica: a primeira divisão sai igual, byte a byte)
e monta as segundas (`TAMANHO_DA_SEGUNDA`, `PESO_SEGUNDA`: o melhor da segunda fica um pouco abaixo do mais fraco da
primeira; `MANUAL_NOMES_SEGUNDA`: Estudiantes de Buenos Aires, Flamengo de Sucre, Santos de Nasca...; cidades em
`MANUAL_CIDADES`). 130 dos 150 têm elenco da Wikipédia; os outros, gerado. **Escudos:** os 148 novos chegaram no pacote
`escudos-novos-148.zip` que a IA da Manus montou (FotMob, Football-Logos e outras; fonte de cada um no fim de
`docs/ESCUDOS_TIMES_NOVOS_FONTES.csv`), preparados com `tools/escudos/preparar.py --quantizar` (0,7 MB; já vinham sem
fundo).

**Técnico de qualquer clube e simulação rápida (nov/2026):** pedido "E vamos permitir que podemos ser técnico de qualquer
time... na hora de escolher o país, veja também a parte da bandeira". Jogo novo (`NovoJogo.tsx`, em três páginas desde nov/2026, R94: nome do
técnico → continente (R96: só a América por enquanto) → lista dos países em ordem, com busca → divisões e clubes do país): país pela bandeira (emoji pelos indicadores regionais,
`bandeira`), divisão (Brasil: A, B, C, D, "Só estadual"; fora: 1ª, 2ª e 3ª) e clube (R80). Nos testes,
`escolherPaisNoJogoNovo` (`ajuda.ts`) faz as duas primeiras páginas. O
técnico treina qualquer clube: rebaixado para a D continua nele (R81; o R72 saiu, `propostasDeEmprego` também). Clube fora
das séries: `torneioPrincipal`, `tabelaDoClube` e `nomeDaLigaDoClube` (competicoes.ts) dão o campeonato dele (Série D, liga
de fora, estadual); `objetivoNoTorneio` (diretoria.ts) pela força entre os clubes do campeonato; o clube do usuário tem
contas do mês mesmo fora das séries; acesso e queda de fora contam como subiu/caiu; o histórico guarda `competicao`. Convites
de clubes maiores continuam só das séries. **Simulação rápida** (`src/engine/rapida.ts`, `RAPIDA` em constantes.ts): os
jogos das ligas de fora que o usuário não acompanha (`simulacaoRapida` em torneios.ts) saem em `concluirJogos` pela força dos
11 melhores (Poisson), com os autores dos gols e sem cartões, lesões nem cansaço; números ajustados aos da simulação
completa (~2,25 gols, mandante ~43%, empates ~29%). Temporada simulada 11 s → 8 s, save no fim do ano 13,5 → 11,8 MB.
**América toda (em andamento, nov/2026):** pedido "traga tudo que tem da América... e a seleção de todos esses países".
Robô: fase "america" (`tools/times/sementes_america.py` gera `sementes-america.json`; branch `dados-america`): ligas da
Concacaf, 3ª divisões, 2ª dos estaduais, copas e convocações das 51 seleções. **Feito (etapa 2, esperando escudos):**
`montar.ts <dados-times> <súmulas> <dados-segundas> <dados-america>` monta a Concacaf (México 3 divisões, MLS com os 3
canadenses, USL Championship e League One, Canadá, os 7 da América Central com a 2ª de HN/GT/SV/PA, Caribe) e as 3ª da
Argentina (Primera B), Chile, Peru e Uruguai: 429 clubes novos (`LIGAS_AMERICA`, `PESO_PAIS`/`pesoDoNivel`), os antigos
iguais. **Clubes leves** (`Clube.leve`/`FichaNova.leve`, `ehLeve`): 3ª divisões, 2ª da América Central e Caribe (menos
Jamaica, Trinidad e Haiti) entram sem jogadores; jogam pela simulação rápida com a força da ficha; ganham elenco
(`garantirElenco`, jogo.ts) quando o técnico assume ou numa partida completa. Motor: `PAISES` com a Concacaf e a região
(`Regiao`, `NOME_REGIAO`), `divisaoDaLiga`/`ligaDoNivel` ("AR3"), `SOBEM_E_CAEM` por nível (MLS, Canadá e México fechados),
`trocarDivisoes` em todos os níveis; nomes ingleses, franceses e holandeses para os jogadores criados (nomes.ts). Telas: jogo
novo e Tabelas por região, divisões até a 3ª (R82, R83). Números: 998 clubes, ~21 mil jogadores, ~11 mil jogos por
temporada, temporada simulada ~9 s, save de 12,5 a 16 MB. **Falta:** 227 dos 429 escudos (202 chegaram nos pacotes parciais da Manus: 122 no `escudos-novos-429` e 80 no
`escudos-lote1-pronto`, preparados com `preparar.py --quantizar`; ficaram de fora 13, que continuam na lista: no primeiro,
foto, dois escudos numa imagem e um pedaço; no lote 1, Chapelton Maroons com o escudo do Humble Lions, Monterrey e Pumas
UNAM com faixa ou história, S.V. Sophia e SNL em miniatura, Vere United e Waterhouse com anúncio, Montego Bay United
branco sobre transparente, Atlético Pantoja e Atlético San Cristóbal com fundo de mapa ou foto; as fontes do lote 1
ainda vão ser consolidadas pela Manus) (`docs/TIMES_NOVOS.md`; até chegarem, o escudo é desenhado e o R73 aceita só os da
lista; nov/2026: mais 44 no `escudos_lote_01.zip`, preparados com `preparar.py --quantizar`, e o do Mineros de Zacatecas recusado, por ser o logotipo de uma copa; depois mais 53 do `escudos_completos_227.zip`, com o Mineros recusado de novo; depois mais 10 do `escudos_atualizados_lote_01.zip`, com o Mineros recusado pela terceira vez; o Huracán Buceo do `escudos_atualizados_lote_02.zip`; mais 12 do `escudos_lote_1_verificados.zip`; e mais 19 do `escudos_lote_2_parcial.zip`, com o Mineros de Zacatecas enfim certo e o Chimaltenango deixado de fora por dúvida (um pato sem nome do clube); e mais 10 do `escudos_lote_30_verificados.zip`, com o mesmo pato do Chimaltenango de fora de novo; e mais 54 do `escudos-faltantes-78.zip` (Google Imagens), com Alto Perú (bandeira), D Espartano (logotipo de uma corrida, sobre foto) e Juventud Santo Domingo (cortado) de fora; e mais 17 do `escudos-faltantes-24.zip`, com o Chimaltenango enfim certo (cisne com o nome) e Central-TT (embaçado) e Italiano (retângulo que parece bandeira) de fora; e mais 4 do `escudos-resto-4.zip` (Botopasi, Real Destroyer, Palestino, Ucayali): faltam 3, Central-TT, Italiano e Juventus do Peru) e a 2ª divisão dos estaduais (as páginas do robô eram quase todas a da 1ª; o usuário disse que não precisa por
enquanto). As copas e as seleções ficaram prontas (abaixo; pedido "Faça 1 e 2. O 3 e 4 são desnecessários por enquanto" e
"Faça tudo, depois trago o restante dos escudos"). Publicado sem os 227 escudos que faltam, a pedido do usuário ("Pode
deixar tudo no jogo, depois colocamos os escudos"): quando chegarem, `preparar.py --quantizar`, `tools/times/lista.py`
(a lista encolhe) e publicar.

**Copas de clubes da América (nov/2026, `src/engine/copas.ts`, R88–R89):** Libertadores, Sul-Americana, Recopa,
Supercopa do Brasil, Copa do Nordeste, Copa Verde, Copa Sul-Sudeste, as da Concacaf (Copa dos Campeões, Leagues Cup,
Centro-Americana, Caribe) e as copas nacionais (Argentina, Chile, Colômbia, Equador, Paraguai, Uruguai, Venezuela, U.S.
Open Cup, Canadá). Cada copa é uma lista de fases (`DEFINICOES`): grupos (turno único ou turno e returno), grupos
cruzados (Nordeste, Leagues Cup) ou mata-mata (jogo único ou ida e volta, pênaltis no empate, volta na casa da melhor
campanha, final em campo neutro nas da Conmebol). Os eliminados da 3ª fase da Libertadores vão aos grupos da
Sul-Americana e os 3º dos grupos à repescagem dela (`aoTerminar`, `depois`). Datas em semanas da temporada
(`diaDaSemana`); se o clube já joga no dia antes ou depois, `escolherData` passa para outro dia da semana. Quem joga em
2026: as listas de verdade (`data/copas-2026/participantes.json`, de `tools/copas/montar.ts`); depois, pelas tabelas e
campeões do jogo (`vagasDasCopas`, na virada). Prêmios por fase; títulos na sala de troféus, reputação do técnico
(`REPUTACAO.libertadores` etc.), fim de temporada e histórico. Tabelas → Copas com o seletor em grupos e o Painel com o
cartão "Copas". Jogos entre dois clubes de fora pela simulação rápida; os dos brasileiros, completos (bilheteria, cansaço,
recordes). Save antigo: as copas começam na temporada seguinte.

**Seleções da América (nov/2026, `src/engine/selecoes.ts`, tela `Selecao.tsx`, R90–R93):** as 51 seleções (10 da
Conmebol e 41 da Concacaf) são "clubes" com a série "selecao" e o id "sel-" + o país (assim partida, placar, tabelas e
escudo funcionam como nos clubes; o escudo é a bandeira em emoji). As convocações de verdade vêm de
`data/selecoes-2026/convocados.json` (`tools/selecoes/montar.ts <dados-america>`: a seção "Current squad" de cada página
da Wikipédia em inglês, 1.228 convocados). Quem joga num clube do jogo continua nele (ganha a nacionalidade da seleção e
os jogos por ela, `Jogador.selecao`); quem joga fora (Europa, Ásia...) fica ligado à seleção (`clubeId` "sel-BR",
`Jogador.clubeFora`), sem contrato, fora do mercado e dos clubes, com a força calculada pelo nível da seleção (Elo), o porte
do clube e da liga, os jogos pela seleção e a idade (`forcaDeFora`); envelhece, se aposenta e jovens de fora tomam o lugar
(`completarBases`, na virada). A primeira concentração de cada seleção usa a convocação de verdade (no máximo 26); depois o
computador chama os 23 melhores por posição (`convocarAutomatico`). Datas FIFA (quinta e terça): março (semanas −2/−1),
junho (8/9, fora dos anos de Copa do Mundo), setembro (21/22), outubro (26/27) e novembro (31/32). Concentração
(`atualizarConcentracoes`, a cada dia): de 3 dias antes de cada jogo até o jogo, e entre dois jogos com até 6 dias;
os convocados ficam com `Jogador.convocado` e `disponivel(j)` os tira dos clubes (o Brasileirão não para; o elenco mostra
o selo "Seleção URU"). Pela seleção só a lesão conta (`disponivel(j, true)`); os jogos e gols contam em `Jogador.selecao`, não
na temporada do clube. Competições (`EstadoJogo.selecoes.competicoes`; as Eliminatórias atravessam as temporadas: os jogos
dos anos seguintes ficam em `selecoes.agenda` e os jogados ficam em `partidas` na virada, `guardarJogosQueContinuam` e
`anoNovoDasSelecoes`): Eliminatórias da Conmebol (os 10 em turno e returno, 18 rodadas, de setembro de 3 anos antes da
Copa a setembro do ano anterior; 6 vão à Copa e o 7º à repescagem), da Concacaf (só membros da FIFA: 1ª fase com os 4
piores em ida e volta em março, 2ª com 30 em 6 grupos de 5 de junho a outubro, 3ª com 12 em 3 grupos de 4 no ano
seguinte; os 3 melhores do ranking entram na 3ª; os primeiros vão à Copa e os 2 melhores segundos à repescagem), Copa
América (anos múltiplos de 4: as 10 da Conmebol e as 6 melhores da Concacaf; sede sorteada na Conmebol) e Copa Ouro (anos
ímpares: as 16 melhores da Concacaf, sede nos Estados Unidos), em junho e julho (semanas 10 a 13: 4 grupos de 4,
quartas, semi e final em jogo único). Nas datas sem jogo oficial, amistosos entre seleções de força parecida
(`marcarAmistosos`, marcados só depois de jogada a data anterior). A Copa do Mundo (com os outros continentes) ainda não
está no jogo: as Eliminatórias dizem quem vai. Ranking do tipo Elo (`atualizarRanking`: amistoso 20, eliminatórias 40,
torneio 50, final 60). Jogos de seleções pela simulação rápida (com cansaço e um pouco de lesão), menos os da seleção do
técnico. **Técnico de seleção** (regra do usuário: "pra ser chamado para ser técnico de qualquer seleção tenho que ganhar a
liga principal de um país"): na virada, quem já ganhou a Série A ou a 1ª divisão de outro país (`jaGanhouLigaPrincipal`,
pelo histórico) e não treina seleção recebe 2 convites (`convitesDeSelecoes`, seleções até a reputação dele + 8);
aceitar (`assumirSelecao`) deixa ele com a seleção e o clube (`Tecnico.selecao`). No dia do jogo da seleção, o técnico
dirige a seleção ao vivo e o auxiliar dirige o clube (sem mexer na escalação guardada). Painel com o cartão da seleção
(próximo jogo, posição, ranking, "Convocar", "Deixar a seleção"); tela Convocação (os convocados e os 25 melhores de cada
posição; "Convocar os melhores"); sem convocar, o auxiliar convoca na concentração. Fora da Copa nas Eliminatórias (sendo
favorita) ou nos grupos do torneio (entre as 4 mais fortes): a federação o dispensa. Tabelas → Seleções: ranking,
competições e amistosos. Fim de temporada e histórico com os campeões e os classificados. Save antigo: as seleções
entram ao abrir (`juntarSelecoes`), com as competições que ainda não começaram e os amistosos da próxima data. Números:
~22.400 jogadores (885 de fora), temporada simulada ~7,5 s, save de 13 a 15 MB.

**Espaços que acompanham o jogo (nov/2026, `salvamento.ts`, `store.ts`):** pedido "Quero que esse save embaixo seja
automático, a cada rodada, posso alterna entre os saves sem me preocupar" (ele abriu um espaço antigo e perdeu o jogo
mais avançado do Continuar). O jogo aberto tem um espaço ligado (`Loja.espaco`, guardado em `resumo:auto.ligado`):
`salvar("auto", estado, ligado)` grava o automático e o espaço na mesma gravação; na partida ao vivo só o automático (o
espaço vai ao fechar a partida). Jogo novo e importado vão para o primeiro espaço livre (`espacoLivre`); Configurações →
Salvar liga o jogo ao espaço escolhido (pergunta se lá há outro jogo: `ResumoSave.semente` identifica o jogo).
Trocar o Continuar por outro jogo quando ele está fora dos espaços pergunta antes (`podeTrocarOContinuar`). Voltar ao
menu grava antes, e o menu espera (`esperarGravacaoAoSair`). Ao abrir o menu, `ligarOContinuar` liga o Continuar que
ainda não tem espaço (saves antigos) ao espaço que é cópia dele (`mesmoPonto`: clube, técnico e data) ou o copia para
um livre (R86). O espaço ligado ao Continuar abre o Continuar, que pode estar mais novo (R87). R84–R87. No menu, "Apagar" em cada espaço e "Apagar o Continuar" (`apagarJogo`: o Continuar e o espaço ligado a ele saem juntos, R95).

**Narrador com voz gravada (nov/2026, retirado):** o usuário pediu a narração do gol, do pênalti e do cartão vermelho
(e depois do início e do fim do jogo) com voz melhor em português; foram feitos com a ElevenLabs (chave só no ambiente
de nuvem "Padrão", `ELEVENLABS_API_KEY`; plano grátis: só vozes padrão, e a chave não lista vozes), mas as vozes padrão
ficaram robóticas ou com sotaque de Portugal, e ele pediu "Tire esses audios novos por enquanto, não gostei como ficou.
Pare a geração de audios". O trabalho ficou no histórico (commits 46ddd8e, d96ddb4 e 466418d: `public/narrador/`,
`narrar` e `carregarNarrador` em `sons.ts`, R88 e o save `gol-penalti-vermelho.ts`) e foi desfeito antes de ir para a
`main`. Não gerar áudios sem ele pedir. Ele pode mandar áudios gravados (a voz dele ou de quem deixar usar; nada de
narração da TV ou do rádio): para voltar, refazer a partir desses commits com os arquivos dele no lugar dos gerados.

**Esperando o usuário:** em aberto no PLANO.md §11: nome final
("Proffut" é provisório?). O 2D da partida começou (R60) e
segue pelo que ele pedir. Se ele quiser os elencos de 2026 das Séries B e C, falta uma fonte livre que o GitHub alcance.

**Próximas ideias:** o resto da lista de mudanças (PLANO.md §13: 3, 6, 9–15, 17, 18, 20), quando o usuário escolher, e
ajustes de equilíbrio pelo que ele sentir jogando.

## Regras fixas do jogo

- **Tamanho e peso (pedido do usuário, nov/2026):** "Quero que não se preocupe com isso agora, vamos construir da maneira
  que ele seja completo, se futuramente ele ficar lento ou pesado iremos ajustar isso, mas tenho iphone 15 e com memória,
  então o momento não é pra se preocupar em limitar o jogo, lógico que podemos otimizar, mas de uma maneira que não afete
  a funcionalidade do jogo". Construir completo; otimizar só sem tirar nada do jogo.

- **Fonte dos escudos (nov/2026):** "Não usaremos mais a manus pra isso". Os escudos agora vêm do Claude no Chrome do
  computador do usuário, por busca rápida no Google Imagens (comando com a lista e o nome do arquivo de cada clube; sem
  entrar nos sites dos clubes); a conferência é feita aqui, na prancha. Não sugerir a Manus.
- **Escudos que chegam (pedido do usuário, nov/2026):** "Assim que receber os escudos e verificar se estão corretos já va
  colocando no jogo": a cada pacote, conferir na prancha, preparar (`preparar.py --quantizar`), atualizar a lista
  (`tools/times/lista.py`), verificar e publicar sem esperar outra ordem; os errados ficam de fora e ele é avisado.

- **Não extrair nada do Brasfoot** (arquivos, APK, listas de jogadores, imagens). O usuário pediu e foi recusado; ele aceitou.
- **Escudos: os que o usuário mandou** (out/2026). Antes a regra era não usar escudos oficiais; ele mandou uma prancha
  com os oficiais e decidiu: "Não, quero que use os escudos que mandei agora. O app é particular, uso individual. Use os escudos que mandei, é uma ordem". Foi avisado de que o site e o
  repositório são públicos e os escudos são marcas dos clubes (se vier reclamação, o GitHub pode pedir para tirar; aí
  volta o escudo desenhado). Os 156 ficam em `public/escudos/<id>.png` (`tools/escudos/recortar.py` recorta a prancha;
  a prancha não vai para o git). Em nov/2026 os 20 da Série A foram trocados por imagens maiores (`escudos_serie_a_2026.zip`, do
  Google Imagens; 128 px em vez dos ~79 do recorte; fonte no mesmo CSV): Santos sem a coroa, Vitória sem a estrela e Mirassol
  e Palmeiras com a estrela da versão oficial. Em nov/2026 ele mandou os 276 dos times novos (`escudos-novos-276.zip`: um PNG por
  clube com o nome da lista, a prancha e o manifesto com a fonte de cada um, guardado em
  `docs/ESCUDOS_TIMES_NOVOS_FONTES.csv`; o zip e a prancha ficam fora do git): `tools/escudos/preparar.py` converte para
  sRGB, deixa transparente o fundo liso claro, corta a margem e reduz para 128 px e 256 cores (18 MB → 1,25 MB, iguais na
  tela); Galo Maringá, Maranguape e São Raimundo-PA ficam com o fundo branco (`MANTER_FUNDO`: o branco de dentro encosta
  na borda). Com a correção das listas dos campeonatos (R74) entraram o Real Oruro e o Anzoátegui, e ele mandou os dois
  escudos (`escudos-faltantes-2.zip`, FootyLogos, fonte no mesmo CSV); depois, os 148 da segunda divisão da América do Sul
(`escudos-novos-148.zip`, montado pela IA da Manus). Todo clube do jogo tem escudo (582 arquivos: os 14
  clubes que saíram das listas continuam nos saves antigos; R73 confere os arquivos e as tabelas, também sem internet). `Escudo` usa: o importado no aparelho (Configurações → Escudos, `src/save/escudos.ts`)
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
| `constantes.ts` | Todos os números de equilíbrio. Mexeu? Rode `npm run sim` (`ESTATISTICAS` e `AVISO_PRESSAO` só mudam o que a tela mostra) |
| `artigos.ts` | Artigo do clube nos textos: `comArtigo("do", clube)` dá "do Flamengo" ou "da Chapecoense"; `concorda` para campeão/campeã. A lista `CLUBES_FEMININOS` vai pelo id |
| `gerador.ts`, `nomes.ts` | `elencoReal` (elencos de `jogadores.json`), jogadores gerados (base, livres, quem completa elenco), salário (`salarioBase`), valor de mercado |
| `forca.ts` | Força efetiva: força × posição × energia × características |
| `partida.ts` | Simulação minuto a minuto; disputa = a^k/(a^k+b^k), k = `EXPOENTE_DISPUTA`. Estatísticas da partida do usuário (`estatisticasDoMinuto`, `posseDeBola`, `cartoes`, `pressaoRecente`, `sobPressao`) |
| `calendario.ts`, `competicoes.ts` | Tabelas, turno/returno com mando equilibrado, playoff da B, quadrangulares e final da C |
| `copa.ts` | Copa do Brasil: participantes, sorteio por potes, jogos, quem passa, premiação, textos do confronto |
| `copas.ts` | Copas de clubes da América (Libertadores, Sul-Americana, Recopa, Supercopa, Nordeste, Verde, Sul-Sudeste, Concacaf, copas nacionais): fases, grupos, mata-mata, datas, transferências entre copas, prêmios, quem joga no ano seguinte (`vagasDasCopas`) |
| `selecoes.ts` | Seleções: dados das 51, base de fora, convocação, concentração nas datas FIFA, Eliminatórias, Copa América, Copa Ouro, amistosos, ranking Elo, convites e técnico de seleção |
| `torneios.ts` | Série D, estaduais e ligas de fora (primeira e segunda divisão): participantes, jogos, grupos, mata-mata, campeões, acesso e queda entre as divisões de fora (`trocarDivisoes`), `competicoesDoUsuario`, `inicioDoAno` |
| `financas.ts`, `estadio.ts` | Bilheteria, TV, patrocínio, salários; obras de ampliação e modernização |
| `mercado.ts`, `mensagens.ts`, `diretoria.ts` | Compra e venda, propostas (e "Pedir mais": `pedirMais`, `limiteDaProposta`), caixa de mensagens, objetivo e confiança |
| `carreira.ts` | Reputação do técnico, cargo em risco, demissão e propostas de emprego, convites de clubes maiores, `assumirClube` |
| `contratos.ts` | Fim de contrato, renovação (pedido do jogador), contrato de reforço, aviso de setembro e o que acaba na virada |
| `emprestimos.ts` | Emprestar até o fim da temporada (quem aceita), pegar emprestado (taxa), volta na virada |
| `notas.ts` | Nota de cada jogador na partida (ao vivo e no fim), melhor em campo, nota média |
| `campo.ts` | Campo 2D da partida do usuário: o lance de cada minuto (bola, caminho, sombra, rótulo), com sorteio próprio |
| `trofeus.ts` | Sala de troféus: recordes de cada clube (jogo a jogo), títulos do clube e carreira do técnico (do histórico) |
| `temporada.ts` | Virada: acesso/rebaixamento, idade, evolução, aposentadoria, base, Série D (`serie-d-reserva.json`) |
| `jogo.ts` | Orquestra: `novoJogo`, `avancar`, `prepararJogos`/`concluirJogos`, `provavelTime` (escalação do computador sem mudar o jogo), propostas de emprego, obras do dia |
| `checagem.ts` | `checarEstado`, `repararEstado`, `testarPartida` (roda sozinha ao abrir um jogo) |
| `motor.test.ts` | Testes do motor |
| `src/save/` | `salvamento.ts`: IndexedDB (`proffut`/`saves`, chaves `jogo:auto`, `resumo:auto`...), exportar/importar `.json`. `aparelho.ts`: checagem do aparelho. `escudos.ts`: escudos importados pelo usuário, que trocam os do jogo só no aparelho (chave `escudos`, id do clube → imagem) |
| `src/ui/` | React + Zustand. `store.ts` (estado, telas sobrepostas, salvamento 400 ms após cada mudança), `acoes.ts`, `componentes.tsx`, `estilo.css` (visual "opção 3": tokens no `:root`), `sons.ts` (apito, torcida, narrador), `telas/*.tsx` |
| `tests/` | Testes de ponta a ponta R01…: `*.spec.ts`, passos comuns em `ajuda.ts`, relatório em português em `resumo.ts`, lista em `README.md` |
| `public/escudos/` | Os 1008 escudos dos clubes (`<id>.png`): 156 recortados da prancha que o usuário mandou e 628 dos pacotes dos times novos (`tools/escudos/preparar.py`); ficam fora da fila do service worker, num cache só deles (`guardarEscudos`), para jogar sem internet |
| `data/brasil-2026/` | `clubes.json` (60), `serie-d-reserva.json` (96), `competicoes.json`, `jogadores.json` (elencos reais, gerado por `tools/elencos`), `LEIAME.md` (fontes e licenças) |
| `tools/` | `times/` (times novos: `wikipedia.py` é o robô da Wikipédia e do Wikidata, `montar.ts` monta clubes e elencos, `wiki.ts` lê fichas e elencos das páginas), `sim/` (calibragem), `e2e/` (capturas de tela), `icones/`, `dados/` (scripts Python dos clubes), `elencos/` (robô dos elencos: `montar.ts` monta `jogadores.json`, `sumulas.ts` lê as súmulas, `fontes-clubes.ts` diz como cada fonte chama os clubes, scripts Python do workflow), `escudos/` (`recortar.py`: prancha de escudos → `public/escudos/<id>.png`, ou um pacote `.json` para importar), `copas/` (`montar.ts`: quem joga cada copa em 2026), `selecoes/` (`montar.ts`: as convocações das 51 seleções) |

## Calibragem atual (`npm run sim`)

~2,3 gols por jogo, mandante vence 42–45%, empates 25–29%, correlação força × pontos 0,57–0,79, nenhum clube no vermelho
(conferido de novo com os elencos reais, com a Copa e, em nov/2026, com os estaduais, a Série D e as ligas de fora; a Série
C fica no limite: mandante ~40–43%, empates ~28–31%). 3 temporadas × 2 sementes levam ~80 s.
Copa do Brasil no `npm run sim`: campeão quase sempre da Série A, ~30% de zebras por confronto, ~20% dos jogos nos
pênaltis, campeão leva ~47 mi somando as fases. Save com ~2,5 MB (elencos da Série D na Copa).
Obras do estádio se pagam em 3 a 4 temporadas.

## Armadilhas já resolvidas (não desfazer)

- **iPhone:** telas usam `100dvh` (não `100vh`); `html, body` com `overflow: hidden` e a rolagem fica em `.conteudo`;
  folhas com `max-height: 88dvh`; respiro no fim de `.tela-cheia .conteudo`; `flex-shrink: 0` nos filhos de `.conteudo`.
  Avisos (toast) logo abaixo do topo, nunca por cima dele. Os testes R08–R11 e R15 protegem isso. Aviso que não vem de
  um toque (o "Jogo guardado no aparelho" do service worker) usa `avisarDepois` (`store.ts`): espera a tela aberta por
  cima, as folhas abertas (`folhasAbertas`, contadas pela `Folha`; o tutorial é uma) e o aviso que já está na tela
  (o do placar) acabarem, e sai da frente quando uma folha abre; senão cobre o Continuar dos resultados do dia e o
  Fechar das fichas, ou toma o lugar do aviso do placar (R44).
- **Folhas (`Folha` em `componentes.tsx`) vão direto no `<body>` (portal).** Dentro de uma área com rolagem o
  Safari do iPhone as desenha por baixo da barra de abas (WebKit 261302), mesmo com z-index maior. O Chromium
  não faz isso; por isso `tests/ajuda.ts` força essas camadas em todos os testes (R16, R17).
- **Altura da tela:** use sempre `var(--altura)`, nunca `100vh`/`100dvh` direto. No modo app do iPhone o
  Safari informa a altura sem a barra de status; `src/ui/telaInteira.ts` mede a tela e põe `--altura-app` (R18).
- Não usar `-webkit-overflow-scrolling` (inútil desde o iOS 13 e piora as camadas).
- Seletor de arquivo do iOS: o `<input type="file">` de importar não tem `accept` (com ele o iPhone esconde o `.json`).
- Testes: botões com `exact: true` ("Voltar", "Continuar"), títulos por `getByRole("heading")`, buscas dentro de
  `.tela-cheia` ou do `dialog`; para esperar o salvamento use `esperarSalvar` (não `waitForTimeout`). Para conferir
  uma mudança depois de recarregar, `esperarNoSave` (espera a mudança no save): `esperarSalvar` com um salvamento de
  antes no meio (o de abrir a partida) recarregava sem ela (R48 falhava 1 vez em 12). Compare nomes exatos
  (`allTextContents`), não pedaço de texto ("Pedro" está em "João Pedro"). Teste que joga a partida: a substituição
  automática de quem se machuca chama qualquer reserva, até o do meu time; antes de dizer que alguém não jogou, veja na
  narração se ele entrou ("Substituição: entra Fulano,", `entrouNoJogo` no R52).
- O save (`salvar` em `salvamento.ts`) marca no resumo a hora do jogo guardado (antes de gravar) e grava o jogo e o
  resumo juntos (`setMany`). Com a hora do fim da gravação, o save grande dos times novos (6 a 10 MB) fazia o
  salvamento de quando o jogo abre parecer mais novo do que a partida: o `esperarSalvar` do R07 aceitava esse e
  recarregava antes da hora (falhou no GitHub, nov/2026). R71 simula o aparelho lento para gravar (`gravacaoLenta`).
- **Escudos fora da fila do service worker** (nov/2026): o Workbox guarda os arquivos do app um por vez; com os 434
  escudos na fila, a versão nova levava quase um minuto para ficar pronta no site publicado (a checagem diária falhou no
  R44, que espera o service worker). Agora `globIgnores` tira `escudos/` da fila (fica só o app, 16 arquivos), o escudo
  que aparece na tela é guardado na hora (`runtimeCaching` CacheFirst no cache `escudos-<hash do conteúdo>`, nome
  calculado no `vite.config.ts`) e, com o service worker pronto, `guardarEscudos` (`src/ui/guardarEscudos.ts`, em
  `main.tsx`) manda a lista para ele: `public/guardar-escudos.js` (no `importScripts` do sw.js) baixa os que faltam, 8 ao
  mesmo tempo, fora da tela, e apaga caches de escudos antigos. Escudo novo não precisa de mais nada. R76. Testes com
  `page.clock`: pausar o relógio antes do apito (`pauseAt` antes de "Começar o jogo"); deixar a partida correr em tempo
  real até a contagem fazia o R60 chegar ao gol antes dela quando a máquina ficava mais lenta (e o R25 contar o apito de um
  pênalti logo no começo como o do início, nov/2026).
- GitHub Actions: usar `actions/*@v7` e Node 22 (Node 20 foi removido do Actions).
- **Virada só no botão:** o `avancar` faz a virada apenas quando é chamado com a temporada já encerrada (o botão
  "Encerrar a temporada", que pergunta antes quem sai de graça). Se ele mesmo joga os últimos jogos do ano (todos de fora
  do Brasil), devolve `fim-dos-jogos` e para (R79). Laço que simula temporadas: trate `fim-dos-jogos` como "acabou o ano".
- **Nada de `elencoDe` dentro de laço grande:** ele varre os ~16 mil jogadores. Para muitos clubes ou muitas perguntas,
  monte os elencos (ou as contagens) uma vez, como `concluirJogos` e `transferenciasDaIa` fazem.
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
