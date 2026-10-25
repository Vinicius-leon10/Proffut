import type { Page } from "@playwright/test";
import { agora, aba, esperarInteiroNaTela, esperarSalvar, expect, novoJogo, test } from "./ajuda";

/** Coloca no save do aparelho uma proposta do Flamengo por um meia do usuário e abre o jogo de novo. */
async function receberProposta(page: Page, valor: number) {
  const nome = await page.evaluate(
    (valor) =>
      new Promise<string>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const saves = banco.transaction("saves", "readwrite").objectStore("saves");
          const leitura = saves.get("jogo:auto");
          leitura.onsuccess = () => {
            const estado = leitura.result;
            const meus = Object.values(estado.jogadores as Record<string, { id: number; nome: string; clubeId: string; posicao: string }>)
              .filter((j) => j.clubeId === estado.tecnico.clubeId && j.posicao === "M");
            const j = meus[meus.length - 1];
            estado.mensagens.unshift({
              id: estado.proximoIdMensagem++, data: estado.data, tipo: "proposta", lida: false,
              titulo: `Proposta por ${j.nome}`, texto: `O Flamengo oferece R$ ${valor.toLocaleString("pt-BR")} por ${j.nome}.`,
              proposta: { jogadorId: j.id, clubeId: "flamengo", valor, validaAte: "2026-12-31" },
            });
            const escrita = saves.put(estado, "jogo:auto");
            escrita.onsuccess = () => { banco.close(); ok(j.nome); };
            escrita.onerror = () => falha(escrita.error);
          };
        };
      }),
    valor,
  );
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(page.getByRole("heading", { name: "Propostas recebidas" })).toBeVisible();
  return nome;
}

test("R20 numa proposta por um jogador meu, dá para pedir mais e vender pelo valor pedido", async ({ page }) => {
  await novoJogo(page);
  await esperarSalvar(page, (await agora(page)) - 5_000);
  const nome = await receberProposta(page, 1_000_000);

  const proposta = page.locator(".item").filter({ hasText: `Proposta por ${nome}` });
  await esperarInteiroNaTela(page, proposta.getByRole("button", { name: "Pedir mais" }));
  await proposta.getByRole("button", { name: "Pedir mais" }).click();

  const ficha = page.getByRole("dialog");
  await expect(ficha.getByRole("heading").first()).toHaveText(`Pedir mais por ${nome}`);
  await ficha.getByRole("button", { name: "+5%" }).click();
  const pedir = ficha.getByRole("button", { name: "Pedir R$ 1.050.000" });
  await esperarInteiroNaTela(page, pedir);
  await pedir.click();

  // Até 5% a mais o clube sempre aceita: a venda sai pelo valor pedido.
  await expect(page.locator(".aviso")).toContainText(`O Flamengo aceitou pagar R$ 1.050.000. ${nome} foi vendido.`);
  await expect(page.getByRole("heading", { name: "Propostas recebidas" })).toHaveCount(0);
  await aba(page, "Elenco");
  await expect(page.locator(".lista .item .negrito").filter({ hasText: new RegExp(`^${nome}$`) })).toHaveCount(0);
});
