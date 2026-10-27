import { execFileSync } from "node:child_process";
import { abrirSite, agora, botao, cartaoDoProximoJogo, esperarSalvar, expect, irParaOMeuJogo, mexerNoSave, novoJogo, test } from "./ajuda";

const nomeNoTopo = (page: import("@playwright/test").Page) => page.locator(".topo .titulo").first();

test("R36 demissão: com a diretoria sem paciência, uma derrota demite o técnico; ele escolhe uma das propostas e assume o novo clube", async ({ page }) => {
  await novoJogo(page); // Ponte Preta
  // Diretoria quase sem paciência, técnico no clube há tempo e um time sem força para ganhar.
  await mexerNoSave(page, `
    estado.tecnico.confiancaDiretoria = 21;
    estado.tecnico.desde = "2025-01-01";
    for (const j of Object.values(estado.jogadores)) if (j.clubeId === estado.tecnico.clubeId) j.forca = 5;`);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  const desde = await agora(page);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // No lugar do painel, a demissão com as propostas de emprego.
  const titulo = page.locator(".tela-cheia .topo .titulo", { hasText: "Você foi demitido" });
  await expect(titulo).toBeVisible();
  await expect(page.locator(".tela-cheia")).toContainText("Ponte Preta");
  const propostas = page.locator(".tela-cheia").getByRole("button", { name: /^Assumir (o|a) / });
  await expect(propostas).toHaveCount(3);

  // Fechar e abrir o app: a demissão continua esperando a escolha.
  await esperarSalvar(page, desde);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(titulo).toBeVisible();
  const escolhido = (await propostas.first().getAttribute("aria-label"))!.replace(/^Assumir (o|a) /, "");
  await propostas.first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(nomeNoTopo(page)).toHaveText(escolhido);
  // A diretoria nova começa confiando, e as mensagens contam o que houve.
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  await expect(page.locator(".tela-cheia")).toContainText("Você foi demitido");
  await expect(page.locator(".tela-cheia")).toContainText(`Bem-vindo`);
});

test("R37 convite: quem vai bem até o meio da temporada recebe o convite de um clube maior e pode aceitar", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a Ponte Preta lidera a Série B, logo antes do jogo do meio da fase de liga.
  const save = execFileSync("npx", ["tsx", "tests/saves/meio-da-temporada.ts", "ponte-preta"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  const convites = page.locator("main .cartao", { has: page.getByRole("heading", { name: "Convites para você" }) });
  await expect(convites).toHaveCount(0);

  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // O convite aparece no painel, de um clube maior que a Ponte Preta.
  await expect(convites).toHaveCount(1);
  const convite = convites.locator(".item").first();
  await expect(convite).toContainText(/quer você como técnico/);
  const clube = (await convite.textContent())!.match(/(?:O|A) (.+?) quer você como técnico/)![1];
  expect(["Mirassol", "Chapecoense", "Coritiba", "Remo", "Vitória"]).toContain(clube);

  // Aceitar pergunta antes; aceito, o técnico assume o novo clube.
  page.once("dialog", (d) => void d.accept());
  await convite.getByRole("button", { name: "Aceitar" }).click();
  await expect(nomeNoTopo(page)).toHaveText(clube);
  await expect(convites).toHaveCount(0);
});
