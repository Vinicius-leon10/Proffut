import { aba, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

test("R156 Mercado: a faixa de força mostra todos os jogadores, em páginas, e dá para inverter a ordem (do 40 para cima ou do 49 para baixo)", async ({ page }) => {
  // Pedido do usuário (nov/2026): "escolho 40 a 49 e a lista é limitada, muitas vezes só aparece jogador 49... quero várias
  // páginas até o último jogador 40 do jogo... e um filtro para a ordem: do 40 e vou vendo 41, 42, 43, ou do 49 e vou descendo".
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Buscar" }).click();
  await page.getByLabel("Faixa de força").selectOption({ label: "Força 40 a 49" });
  const forcas = async () => (await page.locator("main .lista .item .forca").allTextContents()).map(Number);
  const paginas = page.locator("main .paginas");
  await expect(paginas.first()).toContainText(/Página 1 de \d+/);
  const total = Number((await paginas.first().textContent())!.match(/de (\d+)/)![1]);
  expect(total, "muitas páginas de jogadores de 40 a 49").toBeGreaterThan(3);
  const primeira = await forcas();
  expect(primeira[0]).toBe(49);

  // Indo até a última página, aparecem os de 40 (a lista não para nos primeiros).
  await page.getByLabel("Ir para a página").first().selectOption(String(total));
  await expect(paginas.first()).toContainText(`Página ${total} de ${total}`);
  const ultima = await forcas();
  expect(ultima.at(-1)).toBe(40);
  for (let i = 1; i < ultima.length; i++) expect(ultima[i]).toBeLessThanOrEqual(ultima[i - 1]);

  // Próxima e Anterior andam uma página.
  await page.getByLabel("Ir para a página").first().selectOption("1");
  const proxima = page.getByRole("button", { name: "Próxima página" }).first();
  await esperarInteiroNaTela(page, proxima);
  await proxima.click();
  await expect(paginas.first()).toContainText(`Página 2 de ${total}`);
  const segunda = await forcas();
  expect(segunda[0]).toBeLessThanOrEqual(primeira.at(-1)!);
  await page.getByRole("button", { name: "Página anterior" }).first().click();
  await expect(paginas.first()).toContainText(`Página 1 de ${total}`);

  // Ordem invertida: do mais fraco para o mais forte, começando no 40 (e volta para a página 1).
  await page.getByLabel("Ordem").selectOption({ label: "Do mais fraco" });
  await expect(paginas.first()).toContainText(`Página 1 de ${total}`);
  const crescente = await forcas();
  expect(crescente[0]).toBe(40);
  for (let i = 1; i < crescente.length; i++) expect(crescente[i]).toBeGreaterThanOrEqual(crescente[i - 1]);
});

test("R157 Elenco por setor: resumo no alto, filtros com a contagem numa linha, setores com a média e o mais fraco marcado, força no anel", async ({ page }) => {
  // Pedido do usuário (nov/2026): a opção A das prévias do Elenco ("Guarde o elenco A"; "esse elenco A que você vai colocar no jogo").
  await novoJogo(page);
  await aba(page, "Elenco");
  const resumo = page.locator("main .resumo-elenco");
  for (const t of ["força média", "idade média", "contrato no fim", "lesionados"]) await expect(resumo).toContainText(t);

  // Filtros curtos com a quantidade: "Todos", "G 3", "L 4"...
  const filtros = page.locator("main .filtro-posicao button");
  const rotulos = (await filtros.allTextContents()).map((t) => t.trim());
  expect(rotulos[0]).toBe("Todos");
  for (const r of rotulos.slice(1)) expect(r).toMatch(/^[GLZMA] \d+$/);
  const caixaDosFiltros = await page.locator("main .filtro-posicao").boundingBox();
  const primeiroFiltro = await filtros.first().boundingBox();
  expect(caixaDosFiltros!.height, "filtros numa linha só").toBeLessThan(primeiroFiltro!.height * 1.6);

  // Cinco setores, cada um com a média; só um marcado como o mais fraco, e é o de menor média.
  const setores = page.locator("main .grupo-elenco");
  await expect(setores).toHaveCount(5);
  const textos = await setores.allTextContents();
  const medias = textos.map((t) => Number(t.match(/média (\d+)/)![1]));
  const fracos = textos.map((t, i) => (t.includes("setor mais fraco") ? i : -1)).filter((i) => i >= 0);
  expect(fracos).toHaveLength(1);
  expect(medias[fracos[0]]).toBe(Math.min(...medias));

  // Força no anel (o mesmo número de antes).
  await expect(page.locator("main .lista .item .forca.anel").first()).toBeVisible();

  // Filtro de goleiros: só o setor dos goleiros, com a média certa.
  await filtros.filter({ hasText: /^G \d+$/ }).click();
  await expect(setores).toHaveCount(1);
  await expect(setores.first()).toContainText("Goleiros");
  const forcasG = (await page.locator("main .lista .item .forca").allTextContents()).map(Number);
  const mediaG = Math.round(forcasG.reduce((s, f) => s + f, 0) / forcasG.length);
  await expect(setores.first()).toContainText(`média ${mediaG}`);
  expect(rotulos.find((r) => r.startsWith("G "))).toBe(`G ${forcasG.length}`);
});
