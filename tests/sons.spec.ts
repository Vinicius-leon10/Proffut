import { execFileSync } from "node:child_process";
import { abrirSite, botao, cartaoDoProximoJogo, escutarSons, expect, test, voltar } from "./ajuda";

test("R25 sons da partida: apito no início, pênalti com narrador, gol e apito final; desligados, nada toca", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a primeira partida do Flamengo tem pênalti e gol.
  const save = execFileSync("npx", ["tsx", "tests/saves/penalti-e-gol.ts"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await page.clock.install();
  const sons = await escutarSons(page);
  const apitos = async () => (await sons()).filter((s) => s.tipo === "tom" && s.hz >= 2000).length;

  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  expect(await apitos(), "apito do início").toBe(1);

  // Primeiro tempo até o intervalo, volta do intervalo e segundo tempo, com o relógio adiantado.
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await page.clock.runFor(90_000);
  await continuar.click();
  await page.clock.runFor(90_000);
  await expect(page.locator(".relogio")).toHaveText("Fim");

  const tudo = await sons();
  const falas = tudo.flatMap((s) => (s.tipo === "voz" ? [s.texto] : []));
  const penaltis = falas.filter((t) => t === "Pênalti!").length;
  expect(penaltis, "o narrador grita pênalti").toBeGreaterThan(0);
  expect(falas.some((t) => t.startsWith("Gol")), "o narrador grita gol").toBe(true);
  expect(tudo.filter((s) => s.tipo === "ruido").length, "a torcida no pênalti e no gol").toBeGreaterThanOrEqual(penaltis + 1);
  // Apitos: início (1), cada pênalti (1), intervalo (2), volta do intervalo (1) e fim de jogo (3).
  expect(await apitos()).toBe(1 + penaltis + 2 + 1 + 3);
  await continuar.click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // Desligados em Configurações: a próxima partida não toca nada.
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.getByRole("button", { name: "Desligados", exact: true }).click();
  await voltar(page);
  const antes = (await sons()).length;
  const resultados = page.locator(".tela-cheia .topo .titulo", { hasText: "Resultados do dia" });
  const comecar = botao(page, "Começar o jogo");
  for (let i = 0; i < 4 && !(await comecar.isVisible()); i++) {
    await botao(page, /Avançar|Ir para o jogo/).click();
    await expect(comecar.or(resultados)).toBeVisible();
    if (await resultados.isVisible()) await continuar.click();
  }
  await comecar.click();
  await expect(page.getByRole("button", { name: "Ligar o som" })).toBeVisible();
  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
  expect((await sons()).length, "nenhum som com os sons desligados").toBe(antes);
});
