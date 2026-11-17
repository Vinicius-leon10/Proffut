---
name: escolher-modelo
description: Em todo pedido do usuário do Proffut, antes de executar, separa PERGUNTA de PEDIDO DE AÇÃO e diz em uma linha qual modelo (Haiku, Sonnet, Opus) e qual esforço (baixo, médio, alto) gastam menos crédito sem piorar o resultado. Pergunta: responde direto, sem esperar, e sugere o modelo mais barato. Ação: diz o modelo e o esforço e espera o usuário confirmar. Use SEMPRE, em qualquer pedido, no jogo, nos vídeos, nos escudos e camisas, nos dados, nos testes e na publicação.
---

# Escolher o modelo e o esforço

Objetivo do usuário: gastar o mínimo de crédito e de tokens, sem usar o Opus para tudo.
Base: o estudo do que já foi feito no Proffut e duas referências do GitHub
(`kamikaze4441/megamind-model-router`: tabela "tipo de pedido → modelo e esforço";
`thevrus/efficient-claude`: começar no mais barato e subir só com evidência, risco manda no nível).

## Passo 1: é pergunta ou ação?

**Pergunta** = ele quer saber, não quer que eu mude nada ("como funciona...", "o que falta...", "por que...",
"qual a diferença...", "onde fica..."). Responda na hora, sem esperar confirmação.
- Resposta que cabe no que já está na conversa ou no CLAUDE.md: **Haiku, esforço baixo**.
- Pergunta que exige ler o código ou os dados do projeto: **Sonnet, esforço baixo**.
- Pergunta difícil de decidir (comparar caminhos grandes, dar recomendação de projeto): **Opus, médio**.
- Pergunta custa pouco, mas não é de graça: diga isso se ele achar que é.
- Se o modelo atual é mais caro que o indicado, abra a resposta com uma linha:
  `⚙ Para perguntas assim, o Haiku baixo basta.` e responda.

**Ação** = ele quer que eu faça, mude, publique, gere ou pesquise algo. Vá ao passo 2.
Pedido misto (pergunta + ação): trate como ação.

## Passo 2: tabela do Proffut (ação)

Comece na linha mais barata que serve. Suba um degrau se o teste falhar duas vezes ou o pedido tocar em algo de risco.

| Tipo de pedido | Modelo · esforço |
|---|---|
| Anotar no CLAUDE.md, guardar uma lista, renomear, ajustar texto, mensagem ou legenda | **Haiku · baixo** |
| Conferir lote de escudos ou camisas na prancha, preparar imagens, atualizar CSV e retorno | **Sonnet · médio** |
| Ajuste pequeno de tela, texto, cor ou constante (com o teste R novo) | **Sonnet · alto** |
| Publicar (verificar, push, esperar o "Testes", avançar a `main`) | **Sonnet · médio** |
| Dados novos (montadores, robôs, países, clubes, elencos) | **Sonnet · alto**; Opus · médio se a fonte for confusa |
| Vídeo (Remotion, roteiro, legenda do post, música) | **Sonnet · médio** |
| Função nova no motor (mercado, convites, calibragem, copas, seleções) | **Opus · médio** |
| Bug de causa desconhecida; teste que falha só no GitHub; checagem diária | **Opus · médio**, depois **Opus · alto** |
| Parte financeira, equilíbrio, `npm run sim` (mexe em todo o jogo) | **Opus · alto** |
| Save, `migrar`, `repararEstado`, apagar ou trocar dados (o jogo do iPhone dele depende disso) | **Opus · alto**, nunca menos |
| Plano grande ou ideia nova (liga online, tela inicial, treino, patrocínio), sabatina `grill-me` | **Opus · alto** |
| Passar para conversa nova (`nova-conversa`) | **Sonnet · baixo** |
| Pesquisa em várias fontes (GitHub, documentação) | **Sonnet · médio**; Opus · médio se for comparar e decidir |

Regras de desempate:
- Vale o **maior** risco, não a média. Dinheiro do jogo, save do usuário, regra de teste e a `main` sobem o pedido para Opus · alto.
- Se o pedido diz o esforço ("rápido", "com calma"), o esforço dele manda; o risco continua com o piso acima.
- Na dúvida: **Sonnet · alto**.
- Esforço máximo só se ele pedir: custa muito mais e quase não melhora.
- Trocar o **esforço** não perde a conversa guardada; trocar o **modelo** faz reler a conversa inteira. Por isso
  sugira a troca de modelo no começo de uma tarefa, não no meio, ou numa conversa nova.

## Passo 3: como responder (ação)

Uma linha, em português simples, antes de começar:

`Recomendo <modelo> com esforço <nível>: <motivo curto>. Posso começar?`

Se já está no modelo e no esforço certos, diga só isso e espere o "ok" (regra do usuário: confirmar antes de cada pedido).
Se está acima do necessário, diga quanto ele economiza ("Sonnet em vez de Opus").
Se está abaixo, avise o risco ("o save é sensível: prefiro Opus alto").
Depois do "ok", faça o trabalho sem repetir a recomendação.

## Ajudantes (só se o usuário pedir)

Para trabalho de volume (varrer arquivos, rodar testes e resumir a saída), um ajudante **Haiku baixo** é suficiente.
Redigir de um roteiro claro: **Sonnet médio**. Planejar, revisar e decidir: eu mesmo. Nunca delegar risco (save, dinheiro, `main`).
