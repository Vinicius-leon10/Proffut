import { execFileSync } from "node:child_process";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, test } from "./ajuda";

test("R39 empréstimos: empresto um jogador meu e pego um emprestado até o fim da temporada; na virada os dois voltam para os seus clubes", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a temporada de 2026 da Ponte Preta inteira jogada, logo antes da virada.
  const save = execFileSync("npx", ["tsx", "tests/saves/fim-da-temporada.ts", "ponte-preta"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();
  const ficha = page.getByRole("dialog");
  const lista = page.locator("main .lista");

  // Emprestar: o primeiro jogador do elenco (dos mais fracos para os mais fortes) que dá para emprestar.
  await aba(page, "Elenco");
  const linhas = lista.locator(".item", { hasNot: page.locator(".chip", { hasText: "Fim de contrato" }) });
  let emprestado = "";
  let destino = "";
  for (let i = (await linhas.count()) - 1; i >= 0 && !emprestado; i--) {
    await linhas.nth(i).click();
    await expect(ficha.getByRole("heading")).toBeVisible();
    const emprestar = ficha.getByRole("button", { name: "Emprestar até o fim da temporada" });
    if (await emprestar.count() && await emprestar.isEnabled()) {
      const nome = (await ficha.getByRole("heading").textContent())!.trim();
      await emprestar.click();
      // A lista de quem aceita (pode não ter ninguém: aí tenta o próximo jogador).
      await expect(ficha).toContainText("Quem recebe");
      const clube = ficha.getByRole("button", { name: /^Emprestar (ao|à) / }).first();
      if (await clube.count()) {
        destino = (await clube.getAttribute("aria-label"))!.replace(/^Emprestar (ao|à) /, "");
        await clube.click();
        await expect(page.locator(".aviso")).toContainText(`${nome} foi emprestado`);
        emprestado = nome;
        continue;
      }
    }
    await ficha.getByRole("button", { name: "Fechar" }).click();
  }
  expect(emprestado, "algum jogador do elenco pode ser emprestado").not.toBe("");
  await expect(ficha).toHaveCount(0);
  await expect(lista).not.toContainText(emprestado);
  const fora = page.locator("main .cartao", { has: page.getByRole("heading", { name: "Emprestados a outros clubes" }) });
  await expect(fora).toContainText(emprestado);
  await expect(fora).toContainText(destino);

  // Pegar emprestado: um goleiro reserva de outro clube (os titulares não saem), pagando a taxa.
  await aba(page, "Mercado");
  await page.locator("main").getByRole("button", { name: "G", exact: true }).click();
  const goleiros = page.locator("main .lista .item");
  let chegou = "";
  for (let i = 0; i < Math.min(20, await goleiros.count()) && !chegou; i++) {
    await goleiros.nth(i).click();
    await expect(ficha.getByRole("heading")).toBeVisible();
    const pedir = ficha.getByRole("button", { name: /^Pedir emprestado/ });
    if (await pedir.isVisible() && await pedir.isEnabled()) {
      const nome = (await ficha.getByRole("heading").textContent())!.trim();
      await expect(pedir).toContainText("taxa");
      await pedir.click();
      await expect(page.locator(".aviso")).toContainText(`${nome} chegou emprestado`);
      chegou = nome;
    } else {
      await ficha.getByRole("button", { name: "Fechar" }).click();
    }
  }
  expect(chegou, "algum goleiro reserva pode vir emprestado").not.toBe("");
  await aba(page, "Elenco");
  await expect(lista.locator(".item", { hasText: chegou })).toContainText("Emprestado");

  // Virada: os dois voltam para os seus clubes, e a mensagem conta.
  await aba(page, "Clube");
  page.once("dialog", (d) => void d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  await botao(page, "Começar 2027").click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await aba(page, "Elenco");
  await expect(lista).toContainText(emprestado);
  await expect(lista).not.toContainText(chegou);
  await expect(fora).toHaveCount(0);
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  const fim = page.locator(".tela-cheia .item", { hasText: "Fim dos empréstimos" });
  await expect(fim).toContainText(emprestado);
  await expect(fim).toContainText(chegou);
});
