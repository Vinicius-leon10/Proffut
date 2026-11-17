import { botao, cartaoDoProximoJogo, expect, novoJogo, test } from "./ajuda";

// Tela inicial em blocos (pedido: "Mande exemplos de como podemos melhorar essa tela inicial, otimizar as informações, tem
// muita coisa, temos que rolar muito pra baixo"; ele escolheu a opção C: "Gostei letra C, guarde a informação, utilizaremos
// depois"; depois: "Tela inicial" e "Pode começar").
test("R135 tela inicial em blocos: jogo de hoje numa linha com o botão, quatro blocos (campeonato, confiança, caixa e copas), mensagens e os botões de troféus e histórico, tudo na tela do iPhone sem rolar", async ({ page }) => {
  // A tela do iPhone com o app instalado (a altura de 664 é a do Safari com as barras).
  await page.setViewportSize({ width: 390, height: 844 });
  await novoJogo(page);
  const principal = page.locator("main.conteudo");
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // O botão de avançar fica na linha do jogo (ao lado do adversário), não embaixo de um cartão grande.
  const avancar = botao(page, /Avançar|Ir para o jogo/);
  const linhaDoJogo = page.locator(".jogo-linha");
  await expect(linhaDoJogo).toBeVisible();
  await expect(linhaDoJogo.getByRole("button", { name: /Avançar|Ir para o jogo/ })).toBeVisible();

  // Os quatro blocos 2 × 2.
  const blocos = principal.locator(".blocos > .bloco");
  await expect(blocos).toHaveCount(4);
  const titulos = (await blocos.locator("h3").allTextContents()).map((t) => t.trim());
  expect(titulos[1]).toBe("Confiança");
  expect(titulos[2]).toBe("Caixa");
  expect(titulos[3]).toBe("Copas");
  await expect(blocos.nth(1)).toContainText("Diretoria");
  await expect(blocos.nth(1)).toContainText("Torcida");
  await expect(blocos.nth(1)).toContainText("Reputação");
  await expect(blocos.nth(2)).toContainText(/folha/i);
  // Dois blocos por linha.
  const caixas = await blocos.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(Math.abs(caixas[0].y - caixas[1].y), "campeonato e confiança na mesma linha").toBeLessThan(2);
  expect(Math.abs(caixas[2].y - caixas[3].y), "caixa e copas na mesma linha").toBeLessThan(2);
  expect(caixas[2].y, "a segunda linha fica abaixo da primeira").toBeGreaterThan(caixas[0].y + caixas[0].height - 1);

  // Mensagens numa linha só e os dois botões embaixo; os cartões antigos saíram.
  await expect(principal.getByRole("heading", { name: "Mensagens", exact: true })).toBeVisible();
  await expect(principal.getByRole("heading", { name: "Últimas mensagens" })).toHaveCount(0);
  await expect(principal.getByRole("heading", { name: "Clube", exact: true })).toHaveCount(0);

  // Tudo na tela, sem rolar: nenhum botão passou do fim da área do painel.
  for (const alvo of [avancar, botao(page, "Finanças"), botao(page, "Sala de troféus e recordes"), botao(page, "Histórico e campeões")]) {
    await expect(alvo).toBeInViewport({ ratio: 1 });
  }
  const sobra = await principal.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sobra, "o painel do clube não precisa rolar").toBeLessThanOrEqual(1);

  // Os botões continuam abrindo as telas de antes.
  await botao(page, "Sala de troféus e recordes").click();
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Sala de troféus");
});
