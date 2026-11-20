import { aba, abrirFiltros, esperarInteiroNaTela, expect, fecharFiltros, novoJogo, test } from "./ajuda";

test("R156 Mercado: a faixa de força mostra todos os jogadores, em páginas, e dá para inverter a ordem (do 40 para cima ou do 49 para baixo)", async ({ page }) => {
  // Pedido do usuário (nov/2026): "escolho 40 a 49 e a lista é limitada, muitas vezes só aparece jogador 49... quero várias
  // páginas até o último jogador 40 do jogo... e um filtro para a ordem: do 40 e vou vendo 41, 42, 43, ou do 49 e vou descendo".
  // Desde o R158 a faixa e a ordem ficam na folha dos filtros e as páginas numa linha curta ("1–50 de 13.155 ‹ 1 / 264 ›").
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Buscar" }).click();
  await abrirFiltros(page);
  await page.getByRole("dialog").getByRole("group", { name: "Força" }).getByRole("button", { name: "40 a 49" }).click();
  await fecharFiltros(page);
  const forcas = async () => (await page.locator("main .lista .item .forca").allTextContents()).map(Number);
  const paginas = page.locator("main .paginas");
  const irPara = page.getByLabel("Ir para a página").first();
  await expect(paginas.first()).toContainText(/^1–50 de [\d.]+/);
  const total = await irPara.locator("option").count();
  expect(total, "muitas páginas de jogadores de 40 a 49").toBeGreaterThan(3);
  await expect(irPara.locator("option").first()).toHaveText(`1 / ${total}`);
  const primeira = await forcas();
  expect(primeira).toHaveLength(50);
  expect(primeira[0]).toBe(49);

  // Indo até a última página, aparecem os de 40 (a lista não para nos primeiros).
  await irPara.selectOption(String(total));
  await expect(irPara).toHaveValue(String(total));
  const ultima = await forcas();
  expect(ultima.at(-1)).toBe(40);
  for (let i = 1; i < ultima.length; i++) expect(ultima[i]).toBeLessThanOrEqual(ultima[i - 1]);

  // Próxima e Anterior andam uma página.
  await irPara.selectOption("1");
  const proxima = page.getByRole("button", { name: "Próxima página" }).first();
  await esperarInteiroNaTela(page, proxima);
  await proxima.click();
  await expect(irPara).toHaveValue("2");
  await expect(paginas.first()).toContainText(/^51–100 de/);
  const segunda = await forcas();
  expect(segunda[0]).toBeLessThanOrEqual(primeira.at(-1)!);
  await page.getByRole("button", { name: "Página anterior" }).first().click();
  await expect(irPara).toHaveValue("1");

  // Ordem invertida: do mais fraco para o mais forte, começando no 40 (e volta para a página 1).
  await proxima.click();
  await abrirFiltros(page);
  await page.getByRole("dialog").getByRole("group", { name: "Ordem" }).getByRole("button", { name: "Do mais fraco" }).click();
  await fecharFiltros(page);
  await expect(irPara).toHaveValue("1");
  const crescente = await forcas();
  expect(crescente[0]).toBe(40);
  for (let i = 1; i < crescente.length; i++) expect(crescente[i]).toBeGreaterThanOrEqual(crescente[i - 1]);
});

test("R158 Mercado com botão de filtro: Força, Onde joga (mundo inteiro, Brasil ou país), Idade e Ordem numa folha; o botão mostra quantos estão ligados e cada filtro ligado vira uma etiqueta com ✕", async ({ page }) => {
  // Pedido do usuário (nov/2026): "Muita informação, muita bagunça... bote o símbolozinho do filtro, que a pessoa clica e aí ele faz o
  // filtro"; escolheu a opção A das prévias ("Gostei do A").
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Buscar" }).click();
  const main = page.locator("main");
  // Na tela: a busca, o botão de filtro e as posições; nenhum seletor de força, idade, ordem ou onde joga.
  await expect(main.getByPlaceholder("Buscar por nome")).toBeVisible();
  await expect(main.locator("select:not([aria-label='Ir para a página'])")).toHaveCount(0);
  const botao = page.getByRole("button", { name: /^Filtros/ });
  await expect(botao).toHaveAccessibleName("Filtros");
  await expect(main.locator(".filtros-ligados")).toHaveCount(0);

  // A folha: Força, Onde joga (com Mundo inteiro e Brasil), Idade e Ordem; o botão de baixo diz quantos vão aparecer.
  await abrirFiltros(page);
  const folha = page.getByRole("dialog");
  for (const g of ["Força", "Idade", "Ordem"]) await expect(folha.getByRole("group", { name: g })).toBeVisible();
  const onde = folha.getByLabel("Onde joga");
  await expect(onde.locator("option").first()).toHaveText("Mundo inteiro");
  await expect(onde.locator("option", { hasText: "Brasil (Séries A a D)" })).toHaveCount(1);
  await folha.getByRole("group", { name: "Força" }).getByRole("button", { name: "60 a 69" }).click();
  await folha.getByRole("group", { name: "Idade" }).getByRole("button", { name: "Até 24" }).click();
  const ver = folha.getByRole("button", { name: /^Ver .*jogador/ });
  const quantos = Number((await ver.textContent())!.replace(/\D/g, ""));
  await fecharFiltros(page);
  await expect(botao).toHaveAccessibleName("Filtros (2 ligados)");
  await expect(main.locator(".paginas").first()).toContainText(`de ${quantos.toLocaleString("pt-BR")}`);
  for (const f of (await main.locator(".lista .item .forca").allTextContents()).map(Number)) {
    expect(f).toBeGreaterThanOrEqual(60);
    expect(f).toBeLessThanOrEqual(69);
  }

  // Etiquetas dos filtros ligados, com ✕ para tirar.
  const ligados = main.locator(".filtros-ligados button");
  expect((await ligados.allTextContents()).map((t) => t.trim())).toEqual(["Força 60 a 69 ✕", "Até 24 anos ✕"]);
  await ligados.filter({ hasText: "Até 24 anos" }).click();
  await expect(ligados).toHaveCount(1);
  await expect(botao).toHaveAccessibleName("Filtros (1 ligado)");

  // Brasil: só quem joga num clube do Brasil; Limpar volta tudo.
  await abrirFiltros(page);
  await folha.getByLabel("Onde joga").selectOption({ label: "Brasil (Séries A a D)" });
  await folha.getByRole("button", { name: "Limpar" }).click();
  await fecharFiltros(page);
  await expect(main.locator(".filtros-ligados")).toHaveCount(0);
  await expect(botao).toHaveAccessibleName("Filtros");
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
