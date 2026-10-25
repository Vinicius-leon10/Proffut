import { execFileSync } from "node:child_process";
import { aba, abrirSite, botao, cartaoDoProximoJogo, escutarSons, expect, test, voltar } from "./ajuda";

test("R26 clube que se diz \"a\": Assumir a Chapecoense, Bem-vindo à Chapecoense, A Chapecoense na Copa e Gol da Chapecoense!", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a primeira partida da Chapecoense tem gol dela.
  const save = execFileSync("npx", ["tsx", "tests/saves/gol-do-clube.ts", "chapecoense"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await page.clock.install();
  const sons = await escutarSons(page);

  // Na escolha do clube, o botão já fala certo.
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await botao(page, /Chapecoense/).click();
  await expect(botao(page, /^Assumir /)).toHaveText("Assumir a Chapecoense");
  await voltar(page);

  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // Mensagem de boas-vindas e a frase da Copa.
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  await expect(page.locator(".tela-cheia").getByText("Bem-vindo à Chapecoense!")).toBeVisible();
  await voltar(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copa" }).click();
  await expect(page.getByText("A Chapecoense entra na 5ª fase.")).toBeVisible();
  await aba(page, "Clube");

  // O narrador no gol da Chapecoense.
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await page.clock.runFor(90_000);
  await continuar.click();
  await page.clock.runFor(90_000);
  await expect(page.locator(".relogio")).toHaveText("Fim");
  const falas = (await sons()).flatMap((s) => (s.tipo === "voz" ? [s.texto] : []));
  expect(falas).toContain("Gol da Chapecoense!");
  expect(falas).not.toContain("Gol do Chapecoense!");
});
