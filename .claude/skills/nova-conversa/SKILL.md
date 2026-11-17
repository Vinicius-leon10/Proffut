---
name: nova-conversa
description: Passa o trabalho do Proffut para uma conversa nova antes que a memória da conversa encha. Use ao terminar uma tarefa grande (um lote de países, uma função nova, uma publicação), logo depois que a conversa foi resumida (aparece "This session is being continued..."), ou quando o usuário disser "nova conversa", "abra outra conversa", "prompt para nova conversa" ou "passe para outra conversa".
---

# Nova conversa

Não dá para medir a porcentagem da janela de contexto. Por isso a troca é pelos dois sinais abaixo.

## Quando oferecer

1. Ao terminar uma tarefa grande: um lote de países conferido e publicado, uma função nova, uma publicação na `main`.
2. Na primeira resposta depois que a conversa foi resumida.
3. Quando o usuário pedir.

Fora desses casos, não interrompa o trabalho para oferecer.

## Passos

1. **Anote onde parou** no CLAUDE.md, no trecho "Onde parou (data)": o que ficou pronto, o que foi publicado, a branch, o último commit conferido e o que espera decisão do usuário (com as opções). Commit e push na branch de trabalho.
2. **Monte o texto da conversa nova**, em português simples:
   - leia o CLAUDE.md da `main` (ou da branch, se ainda não foi publicado) e continue do "Onde parou" mais recente;
   - as regras: teste antes, `npm run verificar` 100%, `main` só com "Testes" verde, português simples, como testar no iPhone, recomendar o esforço antes de cada pedido;
   - a situação atual em itens numerados: o que fazer, o que esperar, o que não fazer sem ele decidir;
   - o que está guardado para depois (só se ele pedir).
3. **Ofereça em uma linha**: "Abro a conversa nova com esse texto? Esforço recomendado: X." Recomende Médio para trabalho no jogo e Baixo para conferir lotes.
4. **Com o "sim"**, abra com `create_session` (mesmo ambiente; `source_url` do repositório; `prompt` = o texto; título curto em português, por exemplo "Proffut – camisas da Europa"). Avise o nome da conversa e peça para ele continuar lá. Daqui em diante, esta conversa não mexe mais no projeto.
5. **Sem a ferramenta** (ou se ele preferir), entregue o texto para ele copiar e colar.
