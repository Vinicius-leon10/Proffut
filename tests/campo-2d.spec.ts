import { execFileSync } from "node:child_process";
import { abrirSite, botao, cartaoDoProximoJogo, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

// O que o rótulo do campo diz em cada lance.
const ACOES = [
  "Saída de bola", "Bola segura", "Em posse", "Ataque", "Ataque perigoso", "Chute para fora", "Chute defendido", "GOL!",
  "Escanteio", "Falta", "Falta perigosa", "Pênalti!", "Pênalti perdido", "Cartão amarelo", "Cartão vermelho", "Intervalo",
  "Fim de jogo",
];

test("R60 na partida, o campo 2D fica em cima, no lugar do placar grande e dos escudos: a cada minuto a bola anda, o time com a bola tem a sombra e o lance aparece com o time; no gol, a bola entra e aparece quem fez", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a primeira partida do Flamengo tem pênalti e gol.
  const save = execFileSync("npx", ["tsx", "tests/saves/penalti-e-gol.ts"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await page.clock.install();
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await botao(page, /Avançar|Ir para o jogo/).click();

  // Antes do jogo, o placar grande continua (força média em cima dos escudos, R46), sem campo.
  const campo = page.locator(".tela-cheia .campo-2d");
  await expect(botao(page, "Começar o jogo")).toBeVisible();
  await expect(campo).toHaveCount(0);
  // O relógio do jogo só anda quando o teste manda, desde antes do apito: com a partida correndo em tempo real até a
  // contagem começar, uma máquina mais lenta chegava ao gol antes dela (nov/2026).
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await botao(page, "Começar o jogo").click();

  // Na partida, o campo fica no alto da tela, de ponta a ponta, com o relógio em cima dele (como no exemplo do
  // usuário); o placar vira uma barra embaixo do campo, com escudos pequenos, e os botões vêm depois.
  await expect(campo).toBeVisible();
  const caixa = (await campo.boundingBox())!;
  expect(caixa.y, "o campo começa no alto").toBeLessThanOrEqual(1);
  expect(caixa.width, "de ponta a ponta").toBeCloseTo(page.viewportSize()!.width, 0);
  await expect(campo.locator(".relogio")).toBeVisible();
  const gols = (await page.locator(".placar .gols").boundingBox())!;
  expect(gols.y, "o placar fica embaixo do campo").toBeGreaterThanOrEqual(caixa.y + caixa.height - 1);
  expect(gols.y + gols.height).toBeLessThanOrEqual((await page.getByRole("button", { name: "Pausar" }).boundingBox())!.y);
  await expect(page.locator(".placar .gols")).toHaveText(/^\d+ x \d+$/);
  for (const escudo of await page.locator(".placar .time .escudo").all()) expect((await escudo.boundingBox())!.height).toBeLessThanOrEqual(32);
  await expect(campo.locator(".bola")).toHaveCount(1);
  await expect(campo.locator(".sombra")).toHaveCount(1);
  // O escudo do adversário continua abrindo o time titular dele.
  await page.getByRole("button", { name: /^Ver o time titular d[oa] / }).click();
  await expect(page.getByRole("dialog").getByRole("heading")).toContainText("Time titular");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();

  // Minuto a minuto (o tempo só anda quando o teste manda) até o primeiro gol.
  const times = (await page.locator(".placar .time .nome").allTextContents()).map((t) => t.trim());
  expect(times).toHaveLength(2);
  const rotulo = campo.locator(".lance-do-campo");
  const relogio = page.locator(".relogio");
  let minutos = 0;
  for (let i = 0; i < 300 && (await campo.getAttribute("data-acao")) !== "gol"; i++) {
    if ((await relogio.textContent()) === "Intervalo") await page.getByRole("button", { name: "Continuar", exact: true }).click();
    const antes = await campo.getAttribute("data-lance");
    await page.clock.runFor(340);
    // Na espera do pênalti o minuto não anda.
    if ((await campo.getAttribute("data-lance")) === antes) continue;
    minutos++;
    // A cada minuto, o rótulo diz o que acontece e com que time.
    const texto = (await rotulo.textContent())!;
    expect(ACOES.some((a) => texto.includes(a)), `rótulo: ${texto}`).toBe(true);
    expect(times.some((t) => texto.includes(t)), `time no rótulo: ${texto}`).toBe(true);
  }
  expect(minutos, "minutos com lance no campo").toBeGreaterThan(0);

  // No gol, o rótulo grita, a bola termina dentro de um dos gols e aparece quem fez (o mesmo da narração do gol).
  await expect(campo).toHaveAttribute("data-acao", "gol");
  await expect(rotulo).toContainText("GOL!");
  const [x, y] = (await campo.getAttribute("data-bola"))!.split(",").map(Number);
  expect([0, 100]).toContain(x);
  expect(y >= 44 && y <= 56).toBe(true);
  const autor = (await campo.locator(".jogador-do-lance").textContent())!.trim();
  await expect(page.locator(".tela-cheia .lance.gol").first()).toContainText(autor);
});

test("R61 na partida, a barra do placar fica sem a força média e o campo 2D ganha o espaço: mais alto que antes; antes do jogo a força média continua", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  // Antes do jogo, a força média em cima dos escudos (R46).
  await expect(page.locator(".placar .forca-media")).toHaveCount(2);
  await botao(page, "Começar o jogo").click();

  // Na partida, a barra embaixo do campo só com escudo, nome e placar: sem a força média, numa linha só.
  const campo = page.locator(".tela-cheia .campo-2d");
  await expect(campo).toBeVisible();
  await expect(page.locator(".placar .forca-media")).toHaveCount(0);
  await expect(page.locator(".placar .time .nome")).toHaveCount(2);
  const barra = (await page.locator(".placar .times").boundingBox())!;
  expect(barra.height, "a barra do placar numa linha só").toBeLessThanOrEqual(50);
  // O campo usa o espaço: mais alto (antes, 55 por 105).
  const caixa = (await campo.boundingBox())!;
  expect(caixa.height / caixa.width, "proporção do campo").toBeGreaterThanOrEqual(0.56);
  // O nome da competição continua na tela, no campo.
  // A competição e a rodada, embaixo no campo (o primeiro jogo do ano é o do estadual).
  await expect(campo).toContainText(/(Série [ABCD]|Campeonato \S+) · (Grupo \d+ · )?\d+ª rodada/);
});
