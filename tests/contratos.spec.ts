import { execFileSync } from "node:child_process";
import type { Locator, Page } from "@playwright/test";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, test } from "./ajuda";

/** Nome e idade de cada jogador do elenco com o contrato terminando nesta temporada. */
async function contratosTerminando(page: Page) {
  const linhas = page.locator("main .lista .item", { has: page.locator(".chip", { hasText: "Fim de contrato" }) });
  const lista: { nome: string; idade: number; linha: Locator }[] = [];
  for (const linha of await linhas.all()) {
    const nome = (await linha.locator(".negrito").first().textContent())!.trim();
    const idade = Number((await linha.textContent())!.match(/(\d+) anos/)![1]);
    lista.push({ nome, idade, linha });
  }
  return lista;
}

test("R38 contratos: no último ano do contrato dá para renovar (o jogador pede um salário e escolho os anos); quem não renova sai de graça na virada", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a temporada de 2026 da Ponte Preta inteira jogada, logo antes da virada.
  const save = execFileSync("npx", ["tsx", "tests/saves/fim-da-temporada.ts", "ponte-preta"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();

  // No elenco, quem está no último ano de contrato aparece marcado (aqui, só os que não vão se aposentar).
  await aba(page, "Elenco");
  const terminando = (await contratosTerminando(page)).filter((j) => j.idade <= 30);
  expect(terminando.length, "jogadores com o contrato terminando em 2026").toBeGreaterThanOrEqual(2);
  const [renova, sai] = terminando;

  // A ficha mostra até quando vai o contrato; renovar mostra o salário pedido e os anos.
  await renova.linha.click();
  const ficha = page.getByRole("dialog");
  await expect(ficha).toContainText("Contrato até 2026");
  await ficha.getByRole("button", { name: "Renovar contrato" }).click();
  const renovar = page.getByRole("dialog");
  await expect(renovar.getByRole("heading")).toContainText(`Renovar com ${renova.nome}`);
  await expect(renovar).toContainText(/pede R\$ [\d.,]+ (mil|mi)?\/mês|pede R\$ [\d.,]+/);
  await renovar.getByRole("button", { name: "2 anos" }).click();
  await renovar.getByRole("button", { name: /^Renovar até 2028/ }).click();
  await expect(page.locator(".aviso")).toContainText(`${renova.nome} renovou até 2028`);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  const marcados = (await contratosTerminando(page)).map((j) => j.nome);
  expect(marcados).not.toContain(renova.nome);
  expect(marcados).toContain(sai.nome);

  // Virada: antes de encerrar, o jogo pergunta citando quem vai sair de graça.
  await aba(page, "Clube");
  let pergunta = "";
  page.once("dialog", (d) => { pergunta = d.message(); void d.accept(); });
  await botao(page, "Encerrar a temporada 2026").click();
  await botao(page, "Começar 2027").click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  expect(pergunta).toContain(sai.nome);
  expect(pergunta).not.toContain(renova.nome);
  // Quem renovou fica; quem não renovou sai de graça, e a mensagem conta.
  await aba(page, "Elenco");
  const elenco = page.locator("main .lista");
  await expect(elenco).toContainText(renova.nome);
  await expect(elenco).not.toContainText(sai.nome);
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  const fim = page.locator(".tela-cheia .item", { hasText: "Fim de contrato" });
  await expect(fim).toContainText(sai.nome);
});
