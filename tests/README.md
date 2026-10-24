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
