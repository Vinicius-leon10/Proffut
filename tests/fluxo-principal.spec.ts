import { aba, abrirSite, agora, botao, esperarSalvar, expect, jogarPartida, mexerNoSave, novoJogo, test, voltar } from "./ajuda";

test("R01 abre o jogo no celular e mostra o menu inicial", async ({ page }) => {
  await abrirSite(page);
  await expect(botao(page, "Novo jogo")).toBeVisible();
  await expect(botao(page, "Importar save de arquivo")).toBeVisible();
});

test("R02 cria um jogo novo e chega ao painel do clube", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Ponte Preta" });
  await expect(page.locator(".topo")).toContainText("Ponte Preta");
  await expect(botao(page, /Avançar|Ir para o jogo/)).toBeVisible();
});

test("R03 joga uma partida ao vivo e o resultado entra na classificação", async ({ page }) => {
  await novoJogo(page);
  const placar = await jogarPartida(page);
  expect(placar).toMatch(/^\d+ x \d+$/);
  await aba(page, "Tabelas");
  const linha = page.locator("table.tabela tr", { hasText: "Ponte Preta" });
  await expect(linha.locator("td").nth(3), "jogos (J)").toHaveText("1");
  await expect(linha.locator("td").nth(2), "pontos (P)").toHaveText(/^[013]$/);
});

test("R04 muda a formação e ela continua depois de fechar e abrir o jogo", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tática");
  const formacao = page.getByRole("button", { name: "5-3-2", exact: true });
  const desde = await agora(page);
  await formacao.click();
  await expect(formacao).toHaveAttribute("aria-pressed", "true");
  await esperarSalvar(page, desde);

  await page.reload();
  await botao(page, /Continuar/).click();
  await aba(page, "Tática");
  await expect(page.getByRole("button", { name: "5-3-2", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("R24 a velocidade da partida só tem 1x e 2x, e um save que estava em 4x abre em 2x", async ({ page }) => {
  await novoJogo(page);
  await mexerNoSave(page, "estado.config.velocidade = 4;");

  await page.getByRole("button", { name: "Configurações" }).click();
  const opcoes = page.locator(".tela-cheia .cartao", { hasText: "Partida ao vivo" }).getByRole("button");
  await expect(opcoes).toHaveText(["1x", "2x"]);
  await expect(page.getByRole("button", { name: "2x", exact: true })).toHaveAttribute("aria-pressed", "true");
  await voltar(page);

  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  await expect(page.getByRole("tab", { name: /^\dx$/ })).toHaveText(["1x", "2x"]);
  await expect(page.getByRole("tab", { name: "2x" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "1x" }).click();
  await expect(page.getByRole("tab", { name: "1x" })).toHaveAttribute("aria-selected", "true");
});
