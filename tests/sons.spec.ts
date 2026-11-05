import { execFileSync } from "node:child_process";
import { abrirSite, botao, cartaoDoProximoJogo, escutarSons, expect, test, voltar } from "./ajuda";

test("R25 sons da partida: apito no início, pênalti com o narrador e apito final; desligados, nada toca", async ({ page }) => {
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
  // O relógio para antes do apito: com a máquina lenta, a partida andava sozinha até o pênalti antes da contagem (o apito
  // dele contava como o do início). Os minutos andam com o runFor abaixo.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await botao(page, "Começar o jogo").click();
  expect(await apitos(), "apito do início").toBe(1);

  // Primeiro tempo até o intervalo, volta do intervalo e segundo tempo, com o relógio adiantado.
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await page.clock.runFor(90_000);
  await continuar.click();
  await page.clock.runFor(90_000);
  await expect(page.locator(".relogio")).toHaveText("Fim");

  // O narrador grita pênalti (áudio gravado; o áudio pode chegar um instante depois do lance).
  await expect.poll(async () => (await sons()).filter((s) => s.tipo === "narrador" && s.nome === "penalti").length, { message: "o narrador grita pênalti" }).toBeGreaterThan(0);
  const tudo = await sons();
  const penaltis = tudo.filter((s) => s.tipo === "narrador" && s.nome === "penalti").length;
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

test("R27 a torcida comemora alto o gol do meu time e vaia o gol do adversário", async ({ page }) => {
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
  expect(tudo.filter((s) => s.tipo === "voz"), "nada da voz robótica do aparelho").toEqual([]);
  // Festa: a torcida no volume cheio (mais alta que qualquer outro som), uma vez por gol do meu time.
  const festa = tudo.filter((s) => s.tipo === "ruido" && s.pico >= 1);
  expect(festa.length, "a torcida comemora cada gol do meu time").toBe(meus);
  // Vaia: vozes graves (tons de 80 a 400 Hz), uma vaia por gol do adversário, mais baixa que a festa.
  const vaia = tudo.filter((s) => s.tipo === "tom" && s.hz >= 80 && s.hz < 400);
  expect(new Set(vaia.map((s) => s.grupo)).size, "a torcida vaia cada gol do adversário").toBe(deles);
  expect(Math.max(...vaia.map((s) => (s.tipo === "tom" ? s.pico : 0))), "a vaia é mais baixa que a festa").toBeLessThan(1);
  expect(tudo.some((s) => s.tipo === "ruido" && s.pico >= 1 && vaia.some((v) => v.grupo === s.grupo)), "nada de festa no gol do adversário").toBe(false);
});

test("R88 o narrador (voz gravada em português do Brasil) abre o jogo, grita o gol de qualquer time, o pênalti e o cartão vermelho e fecha o jogo; a voz robótica do aparelho não fala mais", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a primeira partida do Flamengo tem gol, pênalti e cartão vermelho.
  const save = execFileSync("npx", ["tsx", "tests/saves/gol-penalti-vermelho.ts"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await page.clock.install();
  const sons = await escutarSons(page);
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await botao(page, /Avançar|Ir para o jogo/).click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await botao(page, "Começar o jogo").click();
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await page.clock.runFor(90_000);
  await continuar.click();
  await page.clock.runFor(90_000);
  await expect(page.locator(".relogio")).toHaveText("Fim");

  const gols = (await page.locator(".placar .gols").textContent())!.split("x").reduce((t, n) => t + Number(n.trim()), 0);
  const vermelhos = await page.locator(".lance.cartao-vermelho").count();
  expect(gols, "teve gol").toBeGreaterThan(0);
  expect(vermelhos, "teve cartão vermelho").toBeGreaterThan(0);
  const narrou = async (nome: string) => (await sons()).filter((s) => s.tipo === "narrador" && s.nome === nome).length;
  // Um grito por lance (o áudio pode chegar um instante depois do lance).
  await expect.poll(() => narrou("gol"), { message: "o narrador grita cada gol" }).toBe(gols);
  await expect.poll(() => narrou("vermelho"), { message: "o narrador grita cada cartão vermelho" }).toBe(vermelhos);
  await expect.poll(() => narrou("penalti"), { message: "o narrador grita o pênalti" }).toBeGreaterThan(0);
  // Abre e fecha o jogo, uma vez cada (a volta do intervalo não tem narração).
  await expect.poll(() => narrou("inicio"), { message: "o narrador abre o jogo" }).toBe(1);
  await expect.poll(() => narrou("fim"), { message: "o narrador fecha o jogo" }).toBe(1);
  expect((await sons()).filter((s) => s.tipo === "voz"), "nada da voz robótica do aparelho").toEqual([]);
});
