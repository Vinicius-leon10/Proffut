import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, cartaoDoProximoJogo, dataNoTopo, esperarNoSave, expect, novoJogo, test } from "./ajuda";

type Ficha = { nome: string; pais?: string };
const ler = (arquivo: string) => JSON.parse(readFileSync(arquivo, "utf8")) as { clubes: Ficha[] };
const exterior = ler("data/america-do-sul-2026/clubes.json");
const estaduais = ler("data/brasil-2026/clubes-estaduais.json");
const serieD = ler("data/brasil-2026/serie-d-reserva.json");
const nomes = (clubes: Ficha[], pais?: string) => clubes.filter((c) => !pais || c.pais === pais).map((c) => c.nome);

test("R66 Tabelas: Séries (com a Série D em grupos), Copa, Estaduais (escolhendo o estado) e Outros países (escolhendo o país)", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tabelas");
  // No começo do ano, com o estadual em andamento, as Tabelas abrem nele: o da Ponte Preta é o Paulista.
  await expect(page.getByRole("tab", { name: "Estaduais" })).toHaveAttribute("aria-selected", "true");
  const estadual = page.getByRole("combobox", { name: "Estadual" });
  await expect(estadual).toHaveValue("E-SP");
  await expect(page.locator("main table.tabela").first()).toContainText("Ponte Preta");
  await estadual.selectOption("E-RJ");
  await expect(page.locator("main table.tabela").first()).toContainText(/Flamengo|Vasco|Fluminense|Botafogo/);

  await page.getByRole("tab", { name: "Outros países" }).click();
  await page.getByRole("combobox", { name: "País" }).selectOption({ label: "Argentina" });
  const argentinos = page.locator("main table.tabela tbody tr");
  await expect(argentinos).toHaveCount(nomes(exterior.clubes, "AR").length);
  await expect(page.locator("main table.tabela")).toContainText("Boca Juniors");

  await page.getByRole("tab", { name: "Séries" }).click();
  await page.getByRole("tab", { name: "Série D" }).click();
  await expect(page.getByRole("combobox", { name: "Grupo" })).toBeVisible();
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(6);
});

test("R67 Mercado: a busca acha jogadores da Série D, dos clubes só do estadual e de cada país da América do Sul", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Mercado");
  const onde = page.getByRole("combobox", { name: "Série" });
  const ficha = page.getByRole("dialog");
  for (const [opcao, clubes] of [["Argentina", nomes(exterior.clubes, "AR")], ["Uruguai", nomes(exterior.clubes, "UY")], ["Série D", nomes(serieD.clubes)], ["Só estadual", nomes(estaduais.clubes)]] as const) {
    await onde.selectOption({ label: opcao });
    await page.locator("main .lista .item").first().click();
    // A ficha do jogador diz o clube dele: é um dos clubes daquele lugar.
    const texto = (await ficha.locator(".linha.pequeno").first().textContent()) ?? "";
    expect(clubes.some((n) => texto.includes(n)), `${opcao}: ${texto}`).toBe(true);
    await ficha.getByRole("button", { name: "Fechar" }).click();
  }
});

test("R68 o jogo novo começa em janeiro com o estadual: o primeiro jogo é do Campeonato Paulista e os domingos dos outros campeonatos passam sem parar", async ({ page }) => {
  await novoJogo(page);
  expect(await dataNoTopo(page)).toMatch(/jan 2026$/);
  await expect(page.locator("main")).toContainText("Campeonato Paulista · Grupo");
  await expect(page.getByRole("heading", { name: "Campeonato Paulista 2026" })).toBeVisible();
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  // O próximo dia que para é o do próximo jogo do Paulista: os outros estaduais do mesmo domingo, não.
  await botao(page, /Avançar|Ir para o jogo/).click();
  await expect(botao(page, "Começar o jogo")).toBeVisible();
  await expect(page.locator(".tela-cheia .placar")).toContainText("Campeonato Paulista");
});

test("R69 save de antes dos times novos: ao abrir, os clubes da Série D, dos estaduais e de fora chegam com jogadores; os campeonatos novos começam na próxima temporada", async ({ page }) => {
  const save = execFileSync("npx", ["tsx", "tests/saves/save-antigo.ts"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
  await aba(page, "Mercado");
  await page.getByRole("combobox", { name: "Série" }).selectOption({ label: "Argentina" });
  await expect(page.locator("main .lista .item").first()).toBeVisible();
  // Nesta temporada, ainda sem estaduais nem ligas de fora nas Tabelas.
  await aba(page, "Tabelas");
  await expect(page.getByRole("tab", { name: "Estaduais" })).toHaveCount(0);
});

test("R72 o técnico só treina clubes das Séries A, B e C: o jogo novo só tem essas séries e, com o clube rebaixado para a Série D, é preciso escolher um clube da Série C (a D é jogada sem ele)", async ({ page }) => {
  test.setTimeout(120_000);
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  expect(await page.getByRole("tab").allTextContents()).toEqual(["Série A", "Série B", "Série C"]);

  const save = execFileSync("npx", ["tsx", "tests/saves/rebaixado-para-d.ts", "brusque"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  // Quem não renovou sai de graça: o jogo pergunta antes de encerrar.
  page.on("dialog", (d) => d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  // O fim da temporada pede para escolher um dos clubes da Série C: sem "Começar 2027" no Brusque, que vai para a D.
  const titulo = page.getByRole("heading", { name: "Propostas de emprego" });
  const propostas = page.getByRole("button", { name: /^Assumir (o|a) / });
  await expect(titulo).toBeVisible({ timeout: 20_000 });
  await expect(botao(page, "Começar 2027")).toHaveCount(0);
  await expect(propostas).toHaveCount(4);
  for (const texto of await propostas.allTextContents()) expect(texto).toContain("Série C");
  // Fechando e abrindo o app antes de escolher, a escolha continua lá.
  await esperarNoSave(page, "estado.clubes.brusque.serie === 'D' && estado.temporada === 2027");
  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(titulo).toBeVisible({ timeout: 20_000 });
  const novo = ((await propostas.first().locator(".negrito").textContent()) ?? "").trim();
  await propostas.first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator(".topo .titulo")).toHaveText(novo);
  await expect(page.getByRole("heading", { name: "Série C 2027" })).toBeVisible();
});
