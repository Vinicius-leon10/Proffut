# Testes de ponta a ponta

O jogo inteiro roda num navegador com a tela de um iPhone (390 × 664, a área visível com as barras do Safari).
Eles passam antes de qualquer publicação: se um falhar, o site não é atualizado.

```bash
npm run build && npm run test:e2e                                        # testa o site gerado em dist/
BASE_URL=https://vinicius-leon10.github.io/Proffut/ npm run test:e2e     # testa o site publicado
npm run verificar                                                        # tudo: motor, tipos, site e estes testes
```

O resultado fica em `tests/resultado/`: `resumo.md`, o relatório completo em `relatorio/index.html` e, para cada teste que falhou, captura de tela e gravação (`arquivos/`).
No GitHub, o resumo aparece na própria execução e a pasta vai nos Artifacts.

## Regras

- Todo bug corrigido ou comportamento ajustado ganha um teste novo com o próximo número, escrito **antes** da correção:
  ele precisa falhar sem a correção e passar com ela.
- Nunca desligar, pular ou apagar um teste para ficar verde. Teste instável se conserta.
- O número do teste vai no começo do nome (`test("R15 ...")`) e cada teste ganha uma linha na tabela abaixo.
- Passos repetidos ficam em `ajuda.ts`.
- Todos os testes rodam com a tela de um iPhone e simulam duas coisas do Safari que o Chromium não faz:
  as camadas (o que está numa área com rolagem fica por baixo da barra de abas) e, nos testes do modo
  app, a altura de tela informada errada. Assim o teste vê o que o usuário vê no celular.

## Lista

| Nº | Arquivo | O que garante | De onde veio o pedido |
|---|---|---|---|
| R01 | `fluxo-principal.spec.ts` | O site abre no celular e mostra o menu inicial (novo jogo, importar save). | "O jogo vai rodar na internet primeiro, um site" · "Coloque o jogo on-line" |
| R02 | `fluxo-principal.spec.ts` | Dá para criar um jogo novo (nome, série, clube) e chegar ao painel do clube. | "Quero começar apenas com times brasileiros, da Série A, B, C" |
| R03 | `fluxo-principal.spec.ts` | Uma partida ao vivo vai até o fim e o resultado entra na classificação. | Plano do jogo, usando o Brasfoot como referência |
| R04 | `fluxo-principal.spec.ts` | A formação escolhida na Tática continua depois de fechar e abrir o jogo. | Plano do jogo · "que salve na memória do celular" |
| R05 | `save-e-offline.spec.ts` | O progresso fica salvo no aparelho: recarregar volta no mesmo dia, com o jogo disputado. | "que salve na memória do celular" |
| R06 | `save-e-offline.spec.ts` | Exportar o save gera um arquivo `.json`, e importar volta exatamente para aquele ponto. | "que salve na memória do celular" (cópia de segurança e troca de aparelho) |
| R07 | `save-e-offline.spec.ts` | Depois da primeira visita, o jogo abre, joga, salva e recarrega sem internet. | "Crie uma checagem automática do jogo. E que funcione offline" |
| R08 | `telas-iphone.spec.ts` | No Mercado, a ficha do jogador aparece inteira na tela e o botão de oferta pode ser tocado. | "No mercado quando clica no jogador a caixa está sendo coberta embaixo" |
| R09 | `telas-iphone.spec.ts` | No Elenco, "Colocar à venda" e "Dispensar" aparecem inteiros, e o jogador vai para "Meus à venda". | "Quando clico para colocar a venda também está sobreposta a caixa" |
| R10 | `telas-iphone.spec.ts` | Antes do jogo, "Começar o jogo" e "Voltar e ajustar a escalação" aparecem inteiros, e o jogo começa. | "Quando avanço pra iniciar o jogo, as caixas embaixo estão cobertas" |
| R11 | `telas-iphone.spec.ts` | Os avisos aparecem no alto da tela e não cobrem os botões de baixo. | Mesma conversa das caixas cobertas (os avisos cobriam os botões de baixo) |
| R12 | `financas-e-checagem.spec.ts` | Em Finanças dá para ampliar ou modernizar o estádio; ampliar cobra do caixa e começa a obra. | "Finanças colocar opção para melhorar o estádio para aumentar a renda" |
| R13 | `financas-e-checagem.spec.ts` | A checagem dentro do jogo (Configurações → Checagem do jogo) não encontra erros. | "Crie uma checagem automática do jogo" |
| R14 | `ajuda.ts` (vale para todos) | Nenhum teste termina com erro no navegador. | "Crie uma checagem automática do jogo" |
| R15 | `telas-iphone.spec.ts` | Os avisos aparecem logo abaixo do topo e não cobrem o título nem os botões de cima (Voltar, Mensagens, Configurações). | "Ajustar parte superior da tela" (os avisos cobriam o topo inteiro por 3,5 s; achado ao montar os testes) |
| R16 | `iphone-safari.spec.ts` | No iPhone, as fichas de compra (Mercado) e de venda (Elenco) aparecem inteiras e por cima da barra de abas, com o último botão livre. | "Ainda não está ajustado a parte de venda e compra" (captura: "Oferecer" e "Dispensar" sob a barra de abas) |
| R17 | `iphone-safari.spec.ts` | Todas as outras folhas (vaga da Tática, jogo da rodada, substituição ao vivo) também ficam inteiras e por cima de tudo. | "Confira o jogo todo esse ajuste" |
| R18 | `iphone-safari.spec.ts` | Aberto como app no iPhone, o jogo ocupa a tela inteira (menu, painel, folhas e telas cheias), sem faixa vazia embaixo. | "Faça o jogo ocupar toda a tela" |
| R19 | `elencos-reais.spec.ts` | Um jogo novo traz os jogadores reais do clube (todos os de `data/brasil-2026/jogadores.json`), com a idade do arquivo e o país por extenso na ficha. | "No github não tem nenhum arquivo com essa lista do brasil?" · "Pode começar pelo git" (elencos reais em vez de fictícios) |
| R20 | `propostas.spec.ts` | Numa proposta por um jogador meu dá para "Pedir mais": escolho quanto a mais, o botão aparece inteiro e, até 5% a mais, o clube aceita e a venda sai pelo valor pedido. | "Permitir quando oferecerem propostas em algum jogador do meu time aumentar o valor" |
| R21 | `telas-iphone.spec.ts` | Nos resultados do dia (dia sem jogo do meu time) o Continuar fica no alto da tela, visível sem rolar e acima da lista de jogos. | "Botão continuar ficar em cima" |
| R22 | `copa-do-brasil.spec.ts` | A Copa do Brasil aparece em Tabelas (fases, regra de cada uma, em que fase meu time entra), os resultados dela aparecem nos resultados do dia e meu time da Série B estreia na 2ª fase ao vivo; empate vai para os pênaltis e o aviso diz quem passou. | "Adicione Copa do Brasil" |
| R23 | `telas-iphone.spec.ts` | Logo depois de um jogo, o aviso do placar não fica por cima do Continuar dos resultados do dia (uma tela nova aberta por cima não herda o aviso da anterior). | "Botão continuar ficar em cima" (achado ao conferir a Copa: o aviso cobria o botão no alto) |
| R24 | `fluxo-principal.spec.ts` | Na partida ao vivo e nas Configurações a velocidade só tem 1x e 2x, e um save que estava em 4x abre em 2x. | "Deixe a velocidade apenas 1x e 2x" |
| R25 | `sons.spec.ts` | Na partida ao vivo tocam o apito do início, o apito, a torcida e o narrador ("Pênalti!") no pênalti, os apitos do intervalo e o apito final (3 apitadas); com os sons desligados em Configurações, nada toca (o som do gol é o R27). Usa um jogo montado pelo motor (`tests/saves/penalti-e-gol.ts`) cuja primeira partida tem pênalti e gol, e o relógio adiantado. | "Agora eu quero adicionar o barulho do apito do início do jogo, o barulho e os narradores quando tiver um pênalti. Pênalti! E o barulho do gol e o barulho do final do jogo" |
| R26 | `nomes-dos-clubes.spec.ts` | Clube que se diz "a" (Chapecoense, Ponte Preta, Ferroviária, Inter de Limeira, Portuguesa, Tuna Luso...) aparece com "a" nos textos: "Assumir a Chapecoense", "Bem-vindo à Chapecoense!" e "A Chapecoense entra na 5ª fase." (conferia também o narrador gritando "Gol da Chapecoense!", que saiu a pedido do usuário: R27). | "E o barulho do gol" (achado ao revisar o narrador: ele gritava "Gol do Chapecoense!", e as mensagens diziam "o Ponte Preta" e "nas Oitavas" como "na Oitavas") |
| R27 | `sons.spec.ts` | No gol o narrador não fala mais; gol do meu time: a festa da torcida no volume mais alto da partida, uma vez por gol; gol do adversário: a vaia (vozes graves), uma por gol, mais baixa que a festa e sem festa junto. Usa um jogo montado pelo motor (`tests/saves/gols-pro-e-contra.ts`) cuja primeira partida tem gol do Flamengo e do adversário; o volume vem do maior valor marcado nos ganhos por onde cada som passa (`escutarSons` em `ajuda.ts`). | "O barulho do som do gol ficou feio por conta de ser feito pela voz robótica. Retire só o barulho do som da mulher falando o nome do time [...] quando for gol do meu time, o barulho é mais alto. Quando for gol do time adversário, vai ser um barulho como se fosse de torcida vaiando [...] Mantenha os apitos dos juízes" |
| R28 | `escudos.spec.ts` | Configurações → Escudos: um pacote de escudos importado (aqui, imagens de teste) aparece no lugar do escudo desenhado dos clubes que ele traz; os outros continuam desenhados; continua depois de fechar e abrir o app; "Voltar aos escudos desenhados" apaga; um arquivo que não é de escudos só dá um aviso. | "Adicione os escudos dos times e permita que antes da partida eu possa clicar no escudo adversário e ver o time titular nesse formato de ele em campo" (os escudos da imagem são os oficiais: ficam só no aparelho, nunca no site nem no repositório) |
| R29 | `time-adversario.spec.ts` | No painel, o escudo do adversário do próximo jogo abre o provável time titular dele no campinho; antes do jogo (e durante), o escudo dele no placar abre o time titular, com formação, estilo e força média iguais aos do resumo, os 11 com a força na vaga e o nome, e a folha inteira na tela. | "Adicione os escudos dos times e permita que antes da partida eu possa clicar no escudo adversário e ver o time titular nesse formato de ele em campo" |
