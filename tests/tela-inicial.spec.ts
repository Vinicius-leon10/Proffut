import { botao, cartaoDoProximoJogo, expect, novoJogo, test } from "./ajuda";

// Tela inicial em blocos (pedido: "Mande exemplos de como podemos melhorar essa tela inicial, otimizar as informações, tem
// muita coisa, temos que rolar muito pra baixo"; ele escolheu a opção C: "Gostei letra C, guarde a informação, utilizaremos
// depois"; depois: "Tela inicial" e "Pode começar").
test("R135 tela inicial (opção D desde o R137): o jogo com os dois escudos e o botão largo, a faixa com campeonato, caixa e confiança, a lista com as competições e a mensagem e os botões de troféus e histórico, tudo na tela do iPhone sem rolar", async ({ page }) => {
  // A tela do iPhone com o app instalado (a altura de 664 é a do Safari com as barras).
  await page.setViewportSize({ width: 390, height: 844 });
  await novoJogo(page);
  const principal = page.locator("main.conteudo");
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // O botão de avançar fica dentro do cartão do jogo.
  const avancar = botao(page, /Avançar|Ir para o jogo/);
  await expect(principal.locator(".placar-do-dia").getByRole("button", { name: /Avançar|Ir para o jogo/ })).toBeVisible();

  // A faixa com três colunas: o campeonato, o Caixa e a Confiança, lado a lado.
  const colunas = principal.locator(".faixa-status > *");
  await expect(colunas).toHaveCount(3);
  const titulos = (await colunas.locator("h3").allTextContents()).map((t) => t.trim());
  expect(titulos[1]).toBe("Caixa");
  expect(titulos[2]).toBe("Confiança");
  await expect(colunas.nth(1)).toContainText(/folha/);
  await expect(colunas.nth(2)).toContainText(/torcida \d+/);
  await expect(colunas.nth(2)).toContainText(/reputação \d+/);
  const caixas = await colunas.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(Math.abs(caixas[0].y - caixas[1].y), "colunas na mesma linha").toBeLessThan(2);
  expect(Math.abs(caixas[1].y - caixas[2].y), "colunas na mesma linha").toBeLessThan(2);

  // Os cartões antigos saíram.
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

test("R136 tela inicial compacta: as competições em linhas curtas e tudo cabe na área do iPhone (pedido: \"A tela ficou desproporcional, me mande um exemplo de como vc vai corrigir\"; \"Faça\")", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // O Bahia na Série A joga o estadual e entra na Libertadores.
  await novoJogo(page, { serie: "Série A", clube: "Bahia" });
  const principal = page.locator("main.conteudo");
  const lista = principal.locator(".lista-do-painel");

  // Copas: o nome e a situação em poucas palavras, não a frase inteira ("O Bahia está na fase de grupos da Copa do Nordeste.").
  const libertadores = lista.locator(".linha-do-painel", { hasText: "Libertadores" });
  await expect(libertadores).toContainText("Entra na 2ª fase");
  await expect(lista).not.toContainText(/O Bahia (está|entra|não joga)/);
  for (const n of (await lista.locator(".linha-do-painel").allTextContents()).map((t) => t.length)) expect(n, "cada linha em poucas palavras").toBeLessThan(60);

  // O Caixa mostra a moral e abre Finanças.
  await expect(principal.locator(".faixa-status")).toContainText(/moral \d+/);

  // Antes do primeiro jogo, um traço no lugar da posição (sem número inventado).
  await expect(principal.locator(".faixa-status > *").first().locator(".numero")).toHaveText("—");

  // Do primeiro cartão ao último botão: cabe na área livre do iPhone com o app instalado (cerca de 620 pt), com folga.
  const altura = await principal.locator("> *").evaluateAll((els) => {
    const r = els.map((e) => e.getBoundingClientRect());
    return r[r.length - 1].bottom - r[0].top;
  });
  expect(altura, "altura do painel").toBeLessThan(600);

  await botao(page, "Finanças").click();
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Finanças");
});

test("R137 tela inicial opção D (pedido: \"Aplique a D em um cenário real pra ver como ficaria\"; \"Aplique\"): o jogo frente a frente com os dois escudos e os nomes, o escudo do adversário abre o time dele, e as linhas das competições e da mensagem levam às Tabelas e às Mensagens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await novoJogo(page, { serie: "Série A", clube: "Bahia" });
  const principal = page.locator("main.conteudo");
  const placar = principal.locator(".placar-do-dia");

  // Os dois times, cada um com o escudo e o nome, o Bahia e o adversário; embaixo, a competição e onde é o jogo.
  await expect(placar.locator(".frente-a-frente .time")).toHaveCount(2);
  await expect(placar.locator(".frente-a-frente .time").first()).toContainText("Bahia");
  await expect(placar.locator(".frente-a-frente .escudo")).toHaveCount(2);
  await expect(placar).toContainText(/(em casa|fora de casa|campo neutro)/);
  // O botão largo, do tamanho do cartão.
  const [cartao, avancar] = await Promise.all([placar.boundingBox(), placar.getByRole("button", { name: /Avançar|Ir para o jogo/ }).boundingBox()]);
  expect(avancar!.width, "botão largo").toBeGreaterThan(cartao!.width * 0.8);

  // O escudo do adversário mostra o provável time titular.
  await page.getByRole("button", { name: /^Ver o provável time titular d[oa] / }).click();
  await expect(page.getByRole("dialog").locator(".campo .vaga")).toHaveCount(11);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();

  // A linha da mensagem abre as Mensagens; a da Libertadores, as Tabelas.
  await principal.locator(".linha-do-painel").last().click();
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Mensagens");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await principal.locator(".linha-do-painel", { hasText: "Libertadores" }).click();
  await expect(page.getByRole("tab", { name: "Copas" })).toBeVisible();
});
