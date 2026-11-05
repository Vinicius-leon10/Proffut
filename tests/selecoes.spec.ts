import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, jogarPartida, novoJogo, test } from "./ajuda";

// Seleções da América (pedido: "Faça 1 e 2", da lista "copas continentais e nacionais" e "seleções"; "traga tudo que tem
// da América ... E a seleção de todos esses países"; e a regra do usuário: "pra ser chamado para ser técnico de qualquer
// seleção tenho que ganhar a liga principal de um país").

/** Abre um save montado pelo motor (tests/saves/selecao.ts). */
async function abrirSave(page: Page, qual: "jogo" | "convite" | "data-fifa") {
  const save = execFileSync("npx", ["tsx", "tests/saves/selecao.ts", qual], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
}

async function abrirSelecoes(page: Page) {
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Seleções" }).click();
}

/** O nome curto do campinho (como em Tatica.tsx). */
const nomeCurto = (nome: string) => {
  if (nome.length <= 12) return nome;
  const partes = nome.split(" ");
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : nome.slice(0, 11) + "…";
};

test("R90 Tabelas → Seleções: o ranking das 51 seleções da América com as bandeiras (Argentina e Brasil na frente) e os amistosos da data FIFA de março", async ({ page }) => {
  await novoJogo(page);
  await abrirSelecoes(page);
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  await expect(seletor).toHaveValue("ranking");
  const linhas = page.locator("main .lista .item");
  await expect(linhas).toHaveCount(51);
  await expect(linhas.nth(0)).toContainText("Argentina");
  await expect(linhas.nth(1)).toContainText("Brasil");
  // A bandeira no lugar do escudo.
  await expect(linhas.nth(1).locator(".bandeira-escudo")).toHaveText("🇧🇷");
  await seletor.selectOption({ label: "Amistosos" });
  await expect(page.locator("main")).toContainText("qui, 26 mar 2026");
  await expect(page.locator("main")).toContainText("ter, 31 mar 2026");
  expect(await page.locator("main .jogo-rodada").count()).toBeGreaterThanOrEqual(40);
});

test("R91 Técnico de seleção: o cartão da seleção no Painel, a convocação (tirar um jogador e confirmar) e o jogo da seleção ao vivo, com os convocados", async ({ page }) => {
  test.setTimeout(120_000);
  await abrirSave(page, "jogo");
  // O jogo de hoje é o amistoso do Brasil; o cartão da seleção mostra o mesmo jogo.
  const hoje = page.locator(".cartao", { has: cartaoDoProximoJogo(page) });
  await expect(hoje).toContainText("Amistoso");
  await expect(hoje).toContainText("Brasil");
  const cartao = page.locator(".cartao", { has: page.getByRole("heading", { name: "Seleção: Brasil" }) });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText("no ranking da América");

  // Convocação: os 26 de verdade; tira o Pedro Morisco e confirma.
  await cartao.getByRole("button", { name: "Convocar", exact: true }).click();
  const tela = page.locator(".tela-cheia");
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Convocação");
  await expect(tela).toContainText("26 convocados");
  const morisco = tela.getByRole("button", { name: /Pedro Morisco/ });
  await expect(morisco).toHaveAttribute("aria-pressed", "true");
  await morisco.click();
  await expect(morisco).toHaveAttribute("aria-pressed", "false");
  await expect(tela).toContainText("25 convocados");
  await tela.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Convocação do Brasil confirmada: 25 jogadores.")).toBeVisible();

  // O jogo da seleção: o Brasil no placar e o Vinícius Júnior (do Real Madrid, fora dos clubes do jogo) no campinho.
  await botao(page, "Ir para o jogo").click();
  await expect(botao(page, "Começar o jogo")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".placar")).toContainText("Brasil");
  await expect(page.locator(".vaga .nome", { hasText: "Vinícius J." })).toBeVisible();
  await expect(page.locator(".vaga .nome", { hasText: "Pedro Morisco" })).toHaveCount(0);
  await botao(page, "Reservas").click();
  await expect(page.getByRole("dialog")).not.toContainText("Pedro Morisco");
  await page.getByRole("dialog").getByRole("button", { name: "Pronto" }).click();
  await botao(page, "Voltar").click();

  // Joga até o fim: o resultado entra nos amistosos.
  await jogarPartida(page);
  await abrirSelecoes(page);
  await page.getByRole("combobox", { name: "Seleções" }).selectOption({ label: "Amistosos" });
  const jogo = page.locator("main .jogo-rodada.meu").first();
  await expect(jogo).toContainText("Brasil");
  await expect(jogo.locator(".r")).toHaveText(/\d+ x \d+/);
});

test("R92 Convite de seleção depois de ganhar a liga principal: aceitar faz do técnico o da seleção, junto com o clube; o outro convite cai", async ({ page }) => {
  test.setTimeout(90_000);
  await abrirSave(page, "convite");
  const convites = page.locator(".cartao", { has: page.getByRole("heading", { name: "Convites para você" }) });
  await expect(convites.locator(".item")).toHaveCount(2);
  const titulo = (await convites.locator(".item").first().locator(".pequeno").first().textContent())!;
  const selecao = titulo.replace(/^Convite (do|da|dos|das|de) /, "");
  page.once("dialog", (d) => d.accept());
  await convites.locator(".item").first().getByRole("button", { name: "Aceitar" }).click();
  await expect(page.getByText(/Você é o técnico/)).toBeVisible();
  await expect(page.getByRole("heading", { name: `Seleção: ${selecao}` })).toBeVisible();
  // Continua no clube, e o outro convite foi recusado.
  await expect(page.locator(".topo")).toContainText("Flamengo");
  await expect(page.getByRole("heading", { name: "Convites para você" })).toHaveCount(0);
});

test("R93 Data FIFA: quem foi convocado aparece com a seleção no elenco (e os jogos por ela na ficha) e fica fora do time do clube até voltar", async ({ page }) => {
  test.setTimeout(90_000);
  await abrirSave(page, "data-fifa");
  await aba(page, "Elenco");
  const comSelo = page.locator("main .item", { has: page.locator(".chip", { hasText: /^Seleção [A-Z]{3}$/ }) });
  expect(await comSelo.count()).toBeGreaterThan(0);
  const nomes = (await comSelo.locator(".negrito").allTextContents()).map((t) => t.trim());
  await comSelo.first().click();
  await expect(page.getByRole("dialog")).toContainText(/Pela seleção: \d+ jogos?/);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  // No jogo do clube, nenhum deles está no campinho.
  await aba(page, "Clube");
  await botao(page, /Ir para o jogo|Avançar/).click();
  await expect(botao(page, "Começar o jogo")).toBeVisible({ timeout: 15_000 });
  const noCampo = (await page.locator(".vaga .nome").allTextContents()).map((t) => t.trim());
  expect(noCampo).toHaveLength(11);
  for (const n of nomes) expect(noCampo, n).not.toContain(nomeCurto(n));
});
