import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, pularTutorial, test } from "./ajuda";

// Europa (pedido, nov/2026: "Vamos fazer primeiro as 7 ligas principais da Europa e apenas a primeira divisão dessas
// ligas. Mas já introduza os principais campeonatos da Europa").

type Ficha = { id: string; nome: string; pais: string };
const europa = (JSON.parse(readFileSync("data/europa-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;
const copas = (JSON.parse(readFileSync("data/europa-2026/copas.json", "utf8")) as { copas: Record<string, { grupos: string[] }> }).copas;

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
  expect(nomes).toEqual(["Alemanha", "Espanha", "França", "Holanda", "Inglaterra", "Itália", "Portugal"]);
  // A bandeira da Inglaterra (a da cruz de São Jorge, não a do Reino Unido) e a das outras pelos indicadores regionais.
  expect(await page.getByRole("button", { name: /Inglaterra/ }).locator(".bandeira").textContent()).toBe("\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}");
  expect(await page.getByRole("button", { name: /Espanha/ }).locator(".bandeira").textContent()).toBe("🇪🇸");
  await page.getByRole("button", { name: /Inglaterra/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Inglaterra");
  expect(await page.getByRole("tab").allTextContents()).toEqual(["1ª divisão"]);
  await expect(page.locator(".lista .item")).toHaveCount(europa.filter((c) => c.pais === "EN").length);
  await botao(page, /Arsenal/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Arsenal");
  await expect(page.getByRole("heading", { name: "Campeonato Inglês 2026" })).toBeVisible();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator("main")).toContainText("Liga dos Campeões");
});

test("R99 Tabelas na Europa: em Outros países, o grupo Europa com os 7 países (a Inglaterra com 20 clubes); em Copas, o grupo Europa com a Supercopa fora (sem jogo em 2026), a Liga dos Campeões com 8 grupos dos classificados de 2025/26, a Liga Europa e a Conference com 4 grupos", async ({ page }) => {
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
  expect(daEuropa).toEqual(["Alemanha", "Espanha", "França", "Holanda", "Inglaterra", "Itália", "Portugal"]);
  await pais.selectOption({ label: "Inglaterra" });
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(20);

  await page.getByRole("tab", { name: "Copas" }).click();
  const copa = page.getByRole("combobox", { name: "Copa" });
  // Quem joga a Liga dos Campeões abre nela.
  await expect(copa).toHaveValue("K-UCL");
  const opcoesEuropa = (await copa.locator('optgroup[label="Europa"] option').allTextContents()).map((t) => t.replace(" (seu time)", ""));
  expect(opcoesEuropa).toEqual(["Liga dos Campeões", "Liga Europa", "Conference League"]);
  // Um grupo por vez, pelo seletor (abre no grupo do Real Madrid); os 8 juntos têm os 32 classificados de 2025/26.
  const grupo = page.getByRole("combobox", { name: "Grupo" });
  await expect(grupo.locator("option")).toHaveCount(8);
  const nomeDe = (id: string) => europa.find((c) => c.id === id)!.nome;
  const naCopa: string[] = [];
  for (let g = 0; g < 8; g++) {
    await grupo.selectOption({ index: g });
    const linhas = page.locator("main table.tabela tbody td.clube .corta");
    await expect(linhas).toHaveCount(4);
    naCopa.push(...(await linhas.allTextContents()).map((t) => t.trim()));
  }
  expect(naCopa.sort()).toEqual(copas["K-UCL"].grupos.map(nomeDe).sort());
  for (const nome of ["Liga Europa", "Conference League"]) {
    await copa.selectOption({ label: nome });
    await expect(grupo.locator("option")).toHaveCount(4);
  }
});
