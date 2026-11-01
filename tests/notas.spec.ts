import { aba, botao, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

const numero = (texto: string) => Number(texto.trim().replace(",", "."));

test("R41 notas: no fim da partida, a caixa Notas mostra a nota de cada jogador que entrou em campo e o melhor em campo; a ficha mostra a nota média", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  // As notas saem no fim da partida (R45).
  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
  // A caixa Notas abre as notas por cima da tela do jogo (R56).
  await page.locator(".tela-cheia").getByRole("button", { name: "Notas", exact: true }).click();
  const folha = page.getByRole("dialog");

  // Os dois times, com a nota (3 a 10, uma casa) e os minutos de cada um.
  const linhas = folha.locator(".notas .item");
  await expect.poll(() => linhas.count()).toBeGreaterThanOrEqual(22);
  const jogadores: { nome: string; nota: number; minutos: number }[] = [];
  for (const linha of await linhas.all()) {
    const nota = (await linha.locator(".nota").textContent())!;
    expect(nota).toMatch(/^\d{1,2},\d$/);
    jogadores.push({
      nome: (await linha.locator(".nome").textContent())!.trim(),
      nota: numero(nota),
      minutos: Number((await linha.locator(".minutos").textContent())!.replace("'", "")),
    });
  }
  for (const j of jogadores) {
    expect(j.nota).toBeGreaterThanOrEqual(3);
    expect(j.nota).toBeLessThanOrEqual(10);
  }

  // O melhor em campo tem a maior nota entre quem jogou pelo menos 30 minutos.
  const melhor = folha.locator(".melhor-em-campo");
  await expect(melhor).toContainText("Melhor em campo");
  const notaDoMelhor = numero((await melhor.locator(".nota").textContent())!);
  const nomeDoMelhor = (await melhor.locator(".nome").textContent())!.trim();
  expect(jogadores.find((j) => j.nome === nomeDoMelhor)?.nota).toBe(notaDoMelhor);
  for (const j of jogadores.filter((x) => x.minutos >= 30)) expect(notaDoMelhor).toBeGreaterThanOrEqual(j.nota);

  // Depois do jogo, a ficha de quem jogou mostra a nota média da temporada (aqui, a nota desse jogo).
  const meus = folha.locator(".notas .time").first().locator(".item");
  const primeiro = { nome: (await meus.first().locator(".nome").textContent())!.trim(), nota: (await meus.first().locator(".nota").textContent())! };
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(folha).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await aba(page, "Elenco");
  const exato = new RegExp(`^${primeiro.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  await page.locator("main .lista .item").filter({ has: page.locator(".negrito", { hasText: exato }) }).first().click();
  const temporada = page.getByRole("dialog").getByRole("row", { name: /^Temporada/ });
  await expect(temporada.getByRole("cell").last()).toHaveText(primeiro.nota);
});

test("R45 as Notas só aparecem no fim da partida: durante o jogo e no intervalo a caixa delas não está lá", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  // Ao lado da Rodada, a caixa das notas (R56) só aparece no fim.
  const caixa = (nome: string) => page.locator(".tela-cheia").getByRole("button", { name: nome, exact: true });
  await expect(caixa("Rodada")).toBeVisible();
  await expect(caixa("Notas")).toHaveCount(0);

  // No intervalo também não. Minuto a minuto até lá, como no R35.
  const relogio = page.locator(".relogio");
  for (let i = 0; i < 60 && (await relogio.textContent()) !== "Intervalo"; i++) await page.clock.runFor(340);
  await expect(relogio).toHaveText("Intervalo");
  await expect(caixa("Notas")).toHaveCount(0);

  // No fim, a caixa aparece e abre as notas e o melhor em campo.
  await botao(page, "Fim ⏭").click();
  await expect(relogio).toHaveText("Fim");
  await caixa("Notas").click();
  const folha = page.getByRole("dialog");
  await expect(folha.locator(".melhor-em-campo")).toContainText("Melhor em campo");
  await expect.poll(() => folha.locator(".notas .item").count()).toBeGreaterThanOrEqual(22);
});
