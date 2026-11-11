import type { Locator, Page } from "@playwright/test";
import { aba, abrirSite, botao, cartaoDoProximoJogo, esperarInteiroNaTela, expect, montarSave, novoJogo, test } from "./ajuda";

/** O nome exato, para achar a linha do jogador ("Pedro" está em "João Pedro"). */
const exato = (nome: string) => new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/** Nome e idade de cada jogador do elenco com o contrato terminando nesta temporada. */
async function contratosTerminando(page: Page) {
  const linhas = page.locator("main .lista .item", { has: page.locator(".chip", { hasText: "Fim de contrato" }) });
  const lista: { nome: string; idade: number; linha: Locator }[] = [];
  for (const linha of await linhas.all()) {
    const nome = (await linha.locator(".negrito").first().textContent())!.trim();
    const idade = Number((await linha.textContent())!.match(/(\d+) anos/)![1]);
    lista.push({ nome, idade, linha });
  }
  return lista;
}

test("R38 contratos: no último ano do contrato dá para renovar (o jogador pede um salário e escolho os anos); quem não renova sai de graça na virada", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a temporada de 2026 da Ponte Preta inteira jogada, logo antes da virada.
  const save = montarSave("fim-da-temporada", "ponte-preta");
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();

  // No elenco, quem está no último ano de contrato aparece marcado (aqui, só os que não vão se aposentar).
  await aba(page, "Elenco");
  const terminando = (await contratosTerminando(page)).filter((j) => j.idade <= 30);
  expect(terminando.length, "jogadores com o contrato terminando em 2026").toBeGreaterThanOrEqual(2);
  const [renova, sai] = terminando;

  // A ficha mostra até quando vai o contrato; renovar mostra o salário pedido e os anos.
  await renova.linha.click();
  const ficha = page.getByRole("dialog");
  await expect(ficha).toContainText("Contrato até 2026");
  await ficha.getByRole("button", { name: "Renovar contrato" }).click();
  const renovar = page.getByRole("dialog");
  await expect(renovar.getByRole("heading")).toContainText(`Renovar com ${renova.nome}`);
  await expect(renovar).toContainText(/pede R\$ [\d.,]+ (mil|mi)?\/mês|pede R\$ [\d.,]+/);
  await renovar.getByRole("button", { name: "2 anos" }).click();
  await renovar.getByRole("button", { name: /^Renovar até 2028/ }).click();
  await expect(page.locator(".aviso")).toContainText(`${renova.nome} renovou até 2028`);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  const marcados = (await contratosTerminando(page)).map((j) => j.nome);
  expect(marcados).not.toContain(renova.nome);
  expect(marcados).toContain(sai.nome);

  // Virada: antes de encerrar, o jogo pergunta citando quem vai sair de graça.
  await aba(page, "Clube");
  let pergunta = "";
  page.once("dialog", (d) => { pergunta = d.message(); void d.accept(); });
  await botao(page, "Encerrar a temporada 2026").click();
  await botao(page, "Começar 2027").click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  expect(pergunta).toContain(sai.nome);
  expect(pergunta).not.toContain(renova.nome);
  // Quem renovou fica; quem não renovou sai de graça, e a mensagem conta.
  await aba(page, "Elenco");
  const elenco = page.locator("main .lista");
  await expect(elenco).toContainText(renova.nome);
  await expect(elenco).not.toContainText(sai.nome);
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  const fim = page.locator(".tela-cheia .item", { hasText: "Fim de contrato" });
  await expect(fim).toContainText(sai.nome);
});

test("R64 quem está no último ano de contrato dá para pôr à venda direto: na ficha, ao lado de Renovar, e em Mercado → Meus à venda, na lista Contrato terminando", async ({ page }) => {
  await novoJogo(page);
  // Num jogo novo, parte do elenco já está no último ano de contrato.
  await aba(page, "Elenco");
  const terminando = await contratosTerminando(page);
  expect(terminando.length, "jogadores no último ano de contrato").toBeGreaterThanOrEqual(2);
  const [primeiro, segundo] = terminando;

  // Na ficha, o cartão do contrato tem Renovar e Colocar à venda lado a lado.
  await primeiro.linha.click();
  const ficha = page.getByRole("dialog");
  const cartao = ficha.locator(".cartao", { hasText: "O contrato termina" });
  await expect(cartao.getByRole("button", { name: "Renovar contrato" })).toBeVisible();
  await cartao.getByRole("button", { name: "Colocar à venda" }).click();
  await expect(page.locator(".aviso")).toContainText(`${primeiro.nome} foi colocado à venda`);
  await expect(cartao.getByRole("button", { name: "Tirar da venda" })).toBeVisible();
  await ficha.getByRole("button", { name: "Fechar" }).click();

  // Em Mercado → Meus à venda, ele já está à venda; os outros do último ano ficam em "Contrato terminando", com o botão.
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: /Meus à venda/ }).click();
  const vendas = page.locator("main .a-venda");
  await expect(vendas.locator(".negrito", { hasText: exato(primeiro.nome) })).toHaveCount(1);
  const secao = page.locator("main .contrato-terminando");
  await expect(secao.getByRole("heading", { name: "Contrato terminando" })).toBeVisible();
  await expect(secao.locator(".item")).toHaveCount(terminando.length - 1);
  const linhaSegundo = secao.locator(".item").filter({ has: page.locator(".negrito", { hasText: exato(segundo.nome) }) });
  await linhaSegundo.getByRole("button", { name: "Colocar à venda" }).click();
  await expect(page.locator(".aviso")).toContainText(`${segundo.nome} foi colocado à venda`);
  // Ele sobe para a lista de venda e sai de "Contrato terminando".
  await expect(vendas.locator(".negrito", { hasText: exato(segundo.nome) })).toHaveCount(1);
  await expect(linhaSegundo).toHaveCount(0);
});

test("R65 em Mercado → Meus à venda, tocar no jogador abre a ficha dele (a do Elenco), com Tirar da venda e Renovar contrato; em Contrato terminando, tocar no nome também", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: /Meus à venda/ }).click();
  const vendas = page.locator("main .a-venda");
  const secao = page.locator("main .contrato-terminando");
  const naVenda = (nome: string) => vendas.filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  const naSecao = (nome: string) => secao.locator(".item").filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  const nomes = (await secao.locator(".item .negrito").allTextContents()).map((n) => n.trim());
  expect(nomes.length, "jogadores no último ano de contrato").toBeGreaterThanOrEqual(2);
  const [primeiro, segundo] = nomes;

  // Como na captura do usuário: posto à venda pelo botão, ele vai para a lista de venda; tocando nele, a ficha abre.
  await naSecao(primeiro).getByRole("button", { name: "Colocar à venda" }).click();
  await naVenda(primeiro).locator(".negrito").click();
  const ficha = page.getByRole("dialog");
  await expect(ficha.getByRole("heading").first()).toHaveText(primeiro);
  const cartao = ficha.locator(".cartao", { hasText: "O contrato termina" });
  await expect(cartao.getByRole("button", { name: "Renovar contrato" })).toBeVisible();
  const tirar = cartao.getByRole("button", { name: "Tirar da venda" });
  await esperarInteiroNaTela(page, tirar);
  await tirar.click();
  await expect(page.locator(".aviso")).toContainText(`${primeiro} saiu da lista de venda`);
  await ficha.getByRole("button", { name: "Fechar" }).click();
  // Fora da venda, ele sai da lista e volta para Contrato terminando.
  await expect(naVenda(primeiro)).toHaveCount(0);
  await expect(naSecao(primeiro)).toHaveCount(1);

  // Em Contrato terminando, tocar no nome também abre a ficha (o botão do lado continua pondo à venda direto).
  await naSecao(segundo).locator(".negrito").click();
  await expect(ficha.getByRole("heading").first()).toHaveText(segundo);
  await expect(ficha.locator(".cartao", { hasText: "O contrato termina" }).getByRole("button", { name: "Colocar à venda" })).toBeVisible();
  await ficha.getByRole("button", { name: "Fechar" }).click();
  await expect(naVenda(segundo)).toHaveCount(0);
});
