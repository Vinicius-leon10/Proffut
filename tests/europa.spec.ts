import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, pularTutorial, test } from "./ajuda";

// Europa (pedido, nov/2026: "Vamos fazer primeiro as 7 ligas principais da Europa e apenas a primeira divisão dessas
// ligas. Mas já introduza os principais campeonatos da Europa").

type Ficha = { id: string; nome: string; pais: string };
const europa = (JSON.parse(readFileSync("data/europa-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;
const outros = (JSON.parse(readFileSync("data/europa-2026/clubes-outros.json", "utf8")) as { clubes: Ficha[] }).clubes;
const segundas = (JSON.parse(readFileSync("data/europa-2026/clubes-segundas.json", "utf8")) as { clubes: (Ficha & { liga: string })[] }).clubes;
const tabelas2025 = (JSON.parse(readFileSync("data/europa-2026/copas.json", "utf8")) as { tabelas: Record<string, string[]> }).tabelas;

test("R98 jogo novo na Europa: o continente Europa com os 7 países (cada um com a bandeira, a Inglaterra com a dela), a Inglaterra com os 20 clubes da 1ª divisão; assumindo o Arsenal, o painel mostra o Campeonato Inglês e a Liga dos Campeões", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  // Dois continentes: América e Europa.
  await expect(page.getByRole("button", { name: /América/ })).toBeVisible();
  await page.getByRole("button", { name: /Europa/ }).click();
  await expect(page.locator(".topo")).toContainText("Europa");
  const paises = page.getByRole("group", { name: "País" }).getByRole("button");
  const nomes = (await paises.allTextContents()).map((t) => t.replace(/^\p{Extended_Pictographic}[\u{E0020}-\u{E007F}]*|^\p{Regional_Indicator}{2}/u, "").trim());
  // As 7 ligas principais e, desde nov/2026 (R106), mais 16 países.
  expect(nomes).toEqual(["Alemanha", "Áustria", "Bélgica", "Croácia", "Dinamarca", "Escócia", "Espanha", "França", "Grécia", "Holanda",
    "Inglaterra", "Itália", "Noruega", "Polônia", "Portugal", "Romênia", "Rússia", "Sérvia", "Suécia", "Suíça", "Tchéquia", "Turquia", "Ucrânia"]);
  // A bandeira da Inglaterra (a da cruz de São Jorge, não a do Reino Unido) e a das outras pelos indicadores regionais.
  expect(await page.getByRole("button", { name: /Inglaterra/ }).locator(".bandeira").textContent()).toBe("\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}");
  expect(await page.getByRole("button", { name: /Espanha/ }).locator(".bandeira").textContent()).toBe("🇪🇸");
  await page.getByRole("button", { name: /Inglaterra/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Inglaterra");
  // Com a 2ª e a 3ª divisão (R103): as três, abrindo na 1ª.
  expect(await page.getByRole("tab").allTextContents()).toEqual(["1ª divisão", "2ª divisão", "3ª divisão"]);
  await expect(page.locator(".lista .item")).toHaveCount(europa.filter((c) => c.pais === "EN").length);
  await botao(page, /Arsenal/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Arsenal");
  await expect(page.getByRole("heading", { name: "Campeonato Inglês 2026" })).toBeVisible();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator("main")).toContainText("Liga dos Campeões");
});

test("R99 Tabelas na Europa: em Outros países, o grupo Europa com os 23 países (a Inglaterra com 20 clubes); em Copas, o grupo Europa com a Liga dos Campeões, a Liga Europa e a Conference (a Supercopa fora, sem jogo em 2026)", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Europa/ }).click();
  await page.getByRole("button", { name: /Espanha/ }).click();
  await botao(page, /Real Madrid/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  // O país do clube do técnico abre escolhido.
  await expect(pais).toHaveValue("ES");
  const grupos = await pais.locator("optgroup").evaluateAll((g) => g.map((x) => (x as HTMLOptGroupElement).label));
  expect(grupos.at(-1)).toBe("Europa");
  const daEuropa = await pais.locator('optgroup[label="Europa"] option').allTextContents();
  expect(daEuropa).toHaveLength(23);
  for (const p of ["Alemanha", "Espanha", "França", "Holanda", "Inglaterra", "Itália", "Portugal", "Turquia", "Escócia"]) expect(daEuropa).toContain(p);
  await pais.selectOption({ label: "Inglaterra" });
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(20);

  await page.getByRole("tab", { name: "Copas" }).click();
  const copa = page.getByRole("combobox", { name: "Copa" });
  const opcoesEuropa = (await copa.locator('optgroup[label="Europa"] option').allTextContents()).map((t) => t.replace(" (seu time)", ""));
  expect(opcoesEuropa).toEqual(["Liga dos Campeões", "Liga Europa", "Conference League"]);
});

// Copas nacionais da Europa e vagas dos 16 países novos nas copas da UEFA (projeto "jogo completo", pedido "trazer
// tudo que está faltando, para deixar o jogo agora completo", nov/2026).
test("R107 copas nacionais da Europa e os países novos nas copas da UEFA: com o Real Madrid, Copas abre na Copa do Rei (o primeiro jogo de copa dele), com os 64 clubes da Espanha; as 7 copas nacionais da Europa estão em Copas nacionais; a Liga dos Campeões começa no playoff com os campeões de 12 países novos", async ({ page }) => {
  const nomes = new Map([...europa, ...outros, ...segundas].map((c) => [c.id, c.nome]));
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Europa/ }).click();
  await page.getByRole("button", { name: /Espanha/ }).click();
  await botao(page, /Real Madrid/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copas" }).click();
  const copa = page.getByRole("combobox", { name: "Copa" });
  await expect(copa).toHaveValue("K-ES");
  const nacionais = (await copa.locator('optgroup[label="Copas nacionais"] option').allTextContents()).map((t) => t.replace(" (seu time)", ""));
  for (const c of ["FA Cup", "Copa do Rei", "Copa da Itália", "Copa da Alemanha", "Copa da França", "Taça de Portugal", "Copa da Holanda"]) expect(nacionais).toContain(c);
  // As supercopas só começam em 2027 (sem os campeões das copas de 2025/26 no jogo).
  expect(nacionais.filter((c) => c.startsWith("Super"))).toEqual([]);
  // A Copa do Rei começa nos 32 avos: 32 jogos, o Real Madrid num deles.
  await expect(page.locator("main")).toContainText("32 avos de final");
  await expect(page.locator("main .jogo-rodada")).toHaveCount(32);
  await expect(page.locator("main .jogo-rodada.meu")).toHaveCount(1);
  await copa.selectOption({ label: "Liga dos Campeões" });
  await expect(page.locator("main")).toContainText("Os campeões de 12 países em ida e volta");
  await expect(page.locator("main .jogo-rodada")).toHaveCount(12);
  for (const liga of ["CH", "DK", "GR", "HR", "NO", "PL", "RO", "XS", "SE", "RS", "CZ", "UA"]) {
    await expect(page.locator("main"), liga).toContainText(nomes.get(tabelas2025[liga][0])!);
  }
});

// 2ª divisão das 7 ligas (pedido "Vamos começar a europa" → "Tudo, nessa ordem" e "todas as ligas, A e B, e das
// principais, se tiver a C também", nov/2026).
test("R103 2ª e 3ª divisão da Europa: no jogo novo, a Inglaterra tem a 2ª divisão com os 24 clubes do Championship; assumindo o Leicester, o painel mostra o Campeonato Inglês – 2ª divisão; nas Tabelas, as duas divisões com a zona de queda na 1ª e a de acesso na 2ª", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Europa/ }).click();
  await page.getByRole("button", { name: /Inglaterra/ }).click();
  await page.getByRole("tab", { name: "2ª divisão" }).click();
  await expect(page.locator(".lista .item")).toHaveCount(segundas.filter((c) => c.liga === "EN2").length);
  await expect(page.locator(".lista .item")).toHaveCount(24);
  await botao(page, /Leicester City/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Leicester City");
  await expect(page.getByRole("heading", { name: "Campeonato Inglês – 2ª divisão 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  await expect(page.getByRole("combobox", { name: "País" })).toHaveValue("EN");
  // Abre na divisão do clube do técnico.
  await expect(page.getByRole("tab", { name: "2ª divisão", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(24);
  await expect(page.locator("main")).toContainText("sobem");
  await page.getByRole("tab", { name: "1ª divisão", exact: true }).click();
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(20);
  await expect(page.locator("main")).toContainText("caem");
  // A 3ª divisão (League One, 24 clubes): os 3 primeiros sobem.
  await page.getByRole("tab", { name: "3ª divisão", exact: true }).click();
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(24);
  await expect(page.locator("main")).toContainText("os 3 primeiros sobem para a 2ª divisão");
});

// Outros países da Europa (pedido, nov/2026: "todos os times que tem da Europa").
test("R106 Outros países da Europa: no jogo novo, a Escócia (com a bandeira dela) e a Turquia; assumindo o Galatasaray, o painel mostra o Campeonato Turco; nas Tabelas, a Turquia com 18 clubes", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Europa/ }).click();
  expect(await page.getByRole("button", { name: /Escócia/ }).locator(".bandeira").textContent()).toBe("\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}");
  await page.getByRole("button", { name: /Turquia/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Turquia");
  await expect(page.locator(".lista .item")).toHaveCount(outros.filter((c) => c.pais === "TR").length);
  await botao(page, /Galatasaray/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Galatasaray");
  await expect(page.getByRole("heading", { name: "Campeonato Turco 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  await expect(page.getByRole("combobox", { name: "País" })).toHaveValue("TR");
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(18);
});
