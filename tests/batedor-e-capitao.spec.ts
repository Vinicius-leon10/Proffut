import { execFileSync } from "node:child_process";
import { aba, abrirSite, agora, botao, cartaoDoProximoJogo, esperarSalvar, expect, irParaOMeuJogo, test } from "./ajuda";

test("R40 batedor de pênalti e capitão: escolhidos na Tática, o capitão ganha a braçadeira no campinho antes do jogo e o batedor escolhido cobra o pênalti", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: na primeira partida do Flamengo há um pênalti a favor dele.
  const save = execFileSync("npx", ["tsx", "tests/saves/penalti-a-favor.ts", "flamengo"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // No campinho antes do jogo, sem escolha, o jogo põe a braçadeira em alguém.
  await irParaOMeuJogo(page);
  const vagas = page.locator(".tela-cheia .campo .vaga");
  await expect(page.locator(".tela-cheia .campo .capitao")).toHaveCount(1);
  const nomeDaVaga = async (i: number) => (await vagas.nth(i).getAttribute("aria-label"))!.replace(/^[^:]+: /, "");
  const goleiro = await nomeDaVaga(0);
  const lateral = await nomeDaVaga(1);
  await botao(page, "Voltar ao clube").click();

  // Na Tática, os dois começam no automático. O goleiro como batedor (o jogo nunca o escolheria) e o lateral da
  // vaga 2 como capitão.
  await aba(page, "Tática");
  const batedor = page.getByRole("combobox", { name: "Batedor de pênalti" });
  const capitao = page.getByRole("combobox", { name: "Capitão" });
  await expect(batedor.locator("option:checked")).toHaveText(/^Automático/);
  await expect(capitao.locator("option:checked")).toHaveText(/^Automático/);
  const desde = await agora(page);
  await batedor.selectOption((await batedor.locator("option", { hasText: goleiro }).getAttribute("value"))!);
  await capitao.selectOption((await capitao.locator("option", { hasText: lateral }).getAttribute("value"))!);

  // Fechar e abrir o app: as escolhas continuam.
  await esperarSalvar(page, desde);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await aba(page, "Tática");
  await expect(batedor.locator("option:checked")).toContainText(goleiro);
  await expect(capitao.locator("option:checked")).toContainText(lateral);

  // Antes do jogo, a braçadeira está com o lateral; na partida, o pênalti a favor é cobrado pelo goleiro.
  await aba(page, "Clube");
  await irParaOMeuJogo(page);
  await expect(vagas.nth(1).locator(".capitao")).toBeVisible();
  await expect(page.locator(".tela-cheia .campo .capitao")).toHaveCount(1);
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".tela-cheia .lance", { hasText: "ajeita a bola na marca do pênalti" }).first()).toContainText(goleiro);
});
