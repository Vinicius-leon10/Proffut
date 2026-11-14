---
name: grill-me
description: Sabatina do plano antes de uma mudança grande no Proffut. Perguntas em português simples, poucas por vez, cada uma com a resposta recomendada, até tudo estar decidido. Use quando o usuário disser "grill-me", "sabatina", "me faça perguntas sobre o plano" ou pedir para fechar o plano de uma ideia grande (treino da semana, patrocínio, vários técnicos, editor...). Não use para ajustes curtos, escudos, camisas ou correções.
---

Adaptada da skill "grilling" de Matt Pocock (github.com/mattpocock/skills, licença MIT em `LICENCA-MIT.txt`), para o
usuário do Proffut, que não é programador e responde pelo iPhone.

## Como fazer

Entreviste o usuário até os dois terem o mesmo entendimento da mudança. Pense nas decisões como uma árvore: cada decisão
abre as que dependem dela.

1. **Rodadas curtas.** Em cada rodada, pergunte só o que já dá para decidir agora (nada que dependa de uma resposta que
   ainda não veio), **no máximo 3 perguntas**. Depois espere as respostas antes da próxima rodada.
2. **Português simples, sem termos técnicos.** Fale do que ele vê e sente jogando ("onde aparece", "o que acontece quando
   perde", "quanto custa"), nunca de arquivos, funções ou dados.
3. **Sempre com a sua recomendação.** Cada pergunta traz a resposta que você recomenda, escrita de modo que "sim" aceite a
   recomendação. Quando der, use a ferramenta de perguntas com opções para tocar (a recomendada primeiro, com
   "(Recomendado)").
4. **Fatos são com você.** O que dá para descobrir olhando o código, o CLAUDE.md, o PLANO.md ou rodando o jogo, descubra
   sozinho. Ao usuário só vão as **decisões** (gosto, regra do jogo, prioridade).
5. **Formato de cada rodada** (quando não usar a ferramenta de opções):

```
❓ **P1. <título curto>**: <a pergunta, com as opções se houver>

➡️ Recomendo: <sua resposta>

---

❓ **P2. ...**
```

6. **Fim.** Acabou quando não sobra nenhuma decisão em aberto nem nada suposto em silêncio. Mostre um resumo curto do
   plano (o que muda, como vai aparecer no jogo, o que fica de fora) e **espere ele confirmar** antes de construir.
   Confirmado, anote o plano no PLANO.md e no CLAUDE.md (com as frases dele) e siga as regras de sempre do projeto (teste
   antes, `npm run verificar`, publicar só com os testes verdes).
