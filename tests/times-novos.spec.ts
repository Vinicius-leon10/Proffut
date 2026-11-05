import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, cartaoDoProximoJogo, dataNoTopo, esperarNoSave, expect, novoJogo, pularTutorial, test } from "./ajuda";

type Ficha = { nome: string; pais?: string; liga?: string };
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
  // Abre na 1ª divisão (a 2ª fica no botão ao lado, R77).
  await expect(argentinos).toHaveCount(exterior.clubes.filter((c) => c.pais === "AR" && !c.liga).length);
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

test("R80 jogo novo: o técnico escolhe o país pela bandeira, a divisão e o clube, de qualquer país ou série; com o Boca Juniors, o painel mostra o Campeonato Argentino", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  // Os países da América com clubes no jogo (o Brasil e os outros), por região, cada um com a bandeira; o Brasil vem
  // escolhido, com as séries e os estaduais.
  const comClubes = new Set(exterior.clubes.map((c) => c.pais)).size + 1;
  const paises = page.getByRole("group", { name: "País" }).getByRole("button");
  await expect(paises).toHaveCount(comClubes);
  for (const regiao of ["América do Sul", "América do Norte", "América Central", "Caribe"]) {
    await expect(page.getByRole("group", { name: "País" }).getByText(regiao, { exact: true })).toBeVisible();
  }
  for (const texto of await paises.allTextContents()) expect(texto, texto).toMatch(/^\p{Regional_Indicator}{2}/u);
  await expect(page.getByRole("button", { name: /Brasil/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Brasil/ }).click();
  expect(await page.getByRole("tab").allTextContents()).toEqual(["Série A", "Série B", "Série C", "Série D", "Só estadual"]);
  // Série D e só do estadual também valem.
  await page.getByRole("tab", { name: "Série D" }).click();
  await expect(page.locator(".lista .item").first()).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: /Argentina/ }).click();
  expect(await page.getByRole("tab").allTextContents()).toEqual(["1ª divisão", "2ª divisão", "3ª divisão"]);
  await page.getByRole("tab", { name: "1ª divisão" }).click();
  await botao(page, /Boca Juniors/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Boca Juniors");
  await expect(page.getByRole("heading", { name: "Campeonato Argentino 2026" })).toBeVisible();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
});

test("R81 o técnico treina qualquer clube: com o clube rebaixado para a Série D, ele continua no clube e começa 2027 na Série D (antes era obrigado a escolher um clube da Série C)", async ({ page }) => {
  test.setTimeout(120_000);
  const save = execFileSync("npx", ["tsx", "tests/saves/rebaixado-para-d.ts", "brusque"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  // Quem não renovou sai de graça: o jogo pergunta antes de encerrar.
  page.on("dialog", (d) => d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  await expect(page.getByRole("heading", { name: "Propostas de emprego" })).toHaveCount(0);
  await botao(page, "Começar 2027").click();
  await expect(page.locator(".topo .titulo")).toHaveText("Brusque");
  await esperarNoSave(page, "estado.clubes.brusque.serie === 'D' && estado.temporada === 2027 && estado.tecnico.clubeId === 'brusque'");
  // Fechando e abrindo o app, continua no Brusque, no painel.
  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator(".topo .titulo")).toHaveText("Brusque");
});

test("R74 as listas dos campeonatos estão certas: nos estaduais não entram os rebaixados do ano anterior nem quem desistiu; nas ligas de fora, só a primeira divisão de 2026 (Bolívia com o Real Oruro e sem o IN San Juan, Venezuela com o Anzoátegui e sem o Titanes); na Série D, o Ivinhema", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tabelas");
  const linhas = page.locator("main table.tabela td.clube");
  const nomes = () => page.locator("main table.tabela td.clube .corta").allTextContents();
  const estadual = page.getByRole("combobox", { name: "Estadual" });
  const estaduais: [string, number, string[]][] = [
    ["E-AP", 8, ["Macapá", "São Paulo-AP"]], ["E-BA", 10, ["Jacobina", "Colo Colo de Ilhéus"]], ["E-CE", 10, ["Barbalha", "Cariri"]],
    ["E-DF", 10, ["Planaltina", "Santa Maria"]], ["E-MS", 10, ["Novo"]], ["E-RN", 7, ["Potyguar Seridoense"]], ["E-RR", 8, ["Real"]],
  ];
  for (const [uf, total, fora] of estaduais) {
    await estadual.selectOption(uf);
    await expect(linhas, uf).toHaveCount(total);
    const lista = await nomes();
    for (const n of fora) expect(lista, `${uf} sem ${n}`).not.toContain(n);
  }

  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  const ligas: [string, number, string[], string[]][] = [
    ["Bolívia", 16, ["Real Oruro"], ["IN San Juan", "Jorge Wilstermann"]], ["Colômbia", 20, [], ["Deportes Quindío"]],
    ["Venezuela", 14, ["Anzoátegui"], ["Titanes", "Yaracuyanos"]],
  ];
  for (const [nome, total, dentro, fora] of ligas) {
    await pais.selectOption({ label: nome });
    await expect(linhas, nome).toHaveCount(total);
    const lista = await nomes();
    for (const n of dentro) expect(lista, `${nome} com ${n}`).toContain(n);
    for (const n of fora) expect(lista, `${nome} sem ${n}`).not.toContain(n);
  }

  // Série D: os 96, com o Ivinhema no lugar do Pantanal (que fica no estadual).
  await page.getByRole("tab", { name: "Séries" }).click();
  await page.getByRole("tab", { name: "Série D" }).click();
  const grupo = page.getByRole("combobox", { name: "Grupo" });
  const todos: string[] = [];
  for (const valor of await grupo.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))) {
    await grupo.selectOption(valor);
    todos.push(...(await nomes()));
  }
  expect(todos).toHaveLength(96);
  expect(todos).toContain("Ivinhema");
  expect(todos).not.toContain("Pantanal");
});

test("R94 jogo novo em três páginas: primeiro só o nome do técnico; depois só os países (bandeiras); depois as divisões e os clubes do país escolhido, com Voltar para trocar de país", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  // 1ª página: só o nome.
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await expect(page.getByRole("group", { name: "País" })).toHaveCount(0);
  await expect(page.locator(".lista .item")).toHaveCount(0);
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  // 2ª página: só os países, sem nome nem clubes.
  await expect(page.getByRole("group", { name: "País" })).toBeVisible();
  await expect(page.getByPlaceholder("Ex.: Vinícius")).toHaveCount(0);
  await expect(page.locator(".lista .item")).toHaveCount(0);
  await page.getByRole("button", { name: /Argentina/ }).click();
  // 3ª página: as divisões e os clubes da Argentina.
  await expect(page.locator(".topo .titulo")).toHaveText("Argentina");
  await expect(page.getByRole("group", { name: "País" })).toHaveCount(0);
  expect(await page.getByRole("tab").allTextContents()).toEqual(["1ª divisão", "2ª divisão", "3ª divisão"]);
  await expect(page.locator(".lista .item").first()).toBeVisible();
  // Voltar: os países de novo; com o Brasil, as séries.
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: /Brasil/ }).click();
  expect(await page.getByRole("tab").allTextContents()).toEqual(["Série A", "Série B", "Série C", "Série D", "Só estadual"]);
  await page.getByRole("tab", { name: "Série B" }).click();
  await botao(page, /Ponte Preta/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Ponte Preta");
});
