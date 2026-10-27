import { aba, botao, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

const numero = (texto: string) => Number(texto.trim().replace(",", "."));

test("R41 notas: na partida, a aba Notas mostra a nota de cada jogador que entrou em campo e o melhor em campo; a ficha mostra a nota média", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await page.locator(".tela-cheia").getByRole("tab", { name: "Notas" }).click();

  // Ao vivo: os dois times, com a nota (0 a 10, uma casa) e os minutos de cada um.
  const linhas = page.locator(".tela-cheia .notas .item");
  await expect.poll(() => linhas.count()).toBeGreaterThanOrEqual(22);
  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
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
  const melhor = page.locator(".tela-cheia .melhor-em-campo");
  await expect(melhor).toContainText("Melhor em campo");
  const notaDoMelhor = numero((await melhor.locator(".nota").textContent())!);
  const nomeDoMelhor = (await melhor.locator(".nome").textContent())!.trim();
  expect(jogadores.find((j) => j.nome === nomeDoMelhor)?.nota).toBe(notaDoMelhor);
  for (const j of jogadores.filter((x) => x.minutos >= 30)) expect(notaDoMelhor).toBeGreaterThanOrEqual(j.nota);

  // Depois do jogo, a ficha de quem jogou mostra a nota média da temporada (aqui, a nota desse jogo).
  const meus = page.locator(".tela-cheia .notas .time").first().locator(".item");
  const primeiro = { nome: (await meus.first().locator(".nome").textContent())!.trim(), nota: (await meus.first().locator(".nota").textContent())! };
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await aba(page, "Elenco");
  const exato = new RegExp(`^${primeiro.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  await page.locator("main .lista .item").filter({ has: page.locator(".negrito", { hasText: exato }) }).first().click();
  const temporada = page.getByRole("dialog").getByRole("row", { name: /^Temporada/ });
  await expect(temporada.getByRole("cell").last()).toHaveText(primeiro.nota);
});
