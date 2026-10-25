import { execFileSync } from "node:child_process";
import { abrirSite, botao, cartaoDoProximoJogo, escutarSons, expect, test, voltar } from "./ajuda";

test("R25 sons da partida: apito no início, pênalti com narrador e apito final; desligados, nada toca", async ({ page }) => {
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
  expect(tudo.filter((s) => s.tipo === "ruido").length, "a torcida no pênalti").toBeGreaterThanOrEqual(penaltis);
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

test("R27 gol sem narrador: a torcida comemora alto o gol do meu time e vaia o gol do adversário", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: na primeira partida do Flamengo há gol dele e gol do adversário.
  const save = execFileSync("npx", ["tsx", "tests/saves/gols-pro-e-contra.ts", "flamengo"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await page.clock.install();
  const sons = await escutarSons(page);

  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await page.clock.runFor(90_000);
  await continuar.click();
  await page.clock.runFor(90_000);
  await expect(page.locator(".relogio")).toHaveText("Fim");

  // Placar final do ponto de vista do Flamengo.
  const [casa, fora] = (await page.locator(".placar .gols").textContent())!.split("x").map((n) => Number(n.trim()));
  const emCasa = (await page.locator(".placar .time").first().textContent())!.includes("Flamengo");
  const [meus, deles] = emCasa ? [casa, fora] : [fora, casa];
  expect(meus, "o Flamengo marcou").toBeGreaterThan(0);
  expect(deles, "o adversário marcou").toBeGreaterThan(0);

  const tudo = await sons();
  const falas = tudo.flatMap((s) => (s.tipo === "voz" ? [s.texto] : []));
  expect(falas.filter((t) => t.startsWith("Gol")), "o narrador não fala no gol").toEqual([]);
  // Festa: a torcida no volume cheio (mais alta que qualquer outro som), uma vez por gol do meu time.
  const festa = tudo.filter((s) => s.tipo === "ruido" && s.pico >= 1);
  expect(festa.length, "a torcida comemora cada gol do meu time").toBe(meus);
  // Vaia: vozes graves (tons de 80 a 400 Hz), uma vaia por gol do adversário, mais baixa que a festa.
  const vaia = tudo.filter((s) => s.tipo === "tom" && s.hz >= 80 && s.hz < 400);
  expect(new Set(vaia.map((s) => s.grupo)).size, "a torcida vaia cada gol do adversário").toBe(deles);
  expect(Math.max(...vaia.map((s) => (s.tipo === "tom" ? s.pico : 0))), "a vaia é mais baixa que a festa").toBeLessThan(1);
  expect(tudo.some((s) => s.tipo === "ruido" && s.pico >= 1 && vaia.some((v) => v.grupo === s.grupo)), "nada de festa no gol do adversário").toBe(false);
});
