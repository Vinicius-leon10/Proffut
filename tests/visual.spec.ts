import type { Locator } from "@playwright/test";
import { aba, expect, novoJogo, test } from "./ajuda";

// Design system "opção 3" (pacote que o usuário mandou, out/2026): fundo marfim, verde-floresta no topo,
// nas abas e nos controles selecionados, dourado na ação principal e na aba ativa, títulos serifados e o
// campinho verde. As cores vêm do estilo calculado pelo navegador.
type Rgb = [number, number, number];
const rgb = (css: string): Rgb => {
  const [r, g, b] = css.match(/\d+(\.\d+)?/g)!.map(Number);
  return [r, g, b];
};
const luz = ([r, g, b]: Rgb) => {
  const c = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const contraste = (a: Rgb, b: Rgb) => {
  const [claro, escuro] = [luz(a), luz(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
};
const estilo = (l: Locator, prop: string, pseudo?: string) =>
  l.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? null).getPropertyValue(p as string), [prop, pseudo] as const);
const cor = async (l: Locator, prop = "color", pseudo?: string) => rgb(await estilo(l, prop, pseudo));
const verdeFloresta = (c: Rgb) => c[1] > c[0] && c[1] >= c[2] && luz(c) < 0.06;
const dourado = (c: Rgb) => c[0] > 220 && c[1] > 170 && c[2] < 110;
const serifada = async (l: Locator) => (await estilo(l, "font-family")).includes("DM Serif Display");

test("R31 visual claro da opção 3: fundo marfim, topo e abas verde-floresta, dourado na ação principal, títulos serifados, campinho verde", async ({ page }) => {
  await novoJogo(page);
  const corpo = page.locator("body");
  const fundo = await cor(page.locator(".app"), "background-color");
  expect(luz(fundo), "fundo marfim (claro)").toBeGreaterThan(0.8);
  // A faixa da barra de status do iPhone fica verde-floresta (a hora e a bateria são brancas).
  expect(verdeFloresta(await cor(corpo, "background-color", "::before")), "faixa da barra de status").toBe(true);

  // Topo do clube: verde-floresta, nome serifado e claro.
  const topo = page.locator(".topo").first();
  const verdeTopo = await cor(topo, "background-color");
  expect(verdeFloresta(verdeTopo), "topo verde-floresta").toBe(true);
  const nome = topo.locator(".titulo");
  expect(await serifada(nome), "nome do clube em letra serifada").toBe(true);
  expect(contraste(await cor(nome), verdeTopo)).toBeGreaterThanOrEqual(7);

  // Abas de baixo: verde-floresta, a ativa em dourado, as outras legíveis.
  const abas = page.locator("nav.abas");
  const verdeAbas = await cor(abas, "background-color");
  expect(verdeFloresta(verdeAbas), "abas verde-floresta").toBe(true);
  expect(dourado(await cor(abas.locator(".aba.ativa"))), "aba ativa dourada").toBe(true);
  expect(contraste(await cor(abas.locator(".aba:not(.ativa)").first()), verdeAbas)).toBeGreaterThanOrEqual(4.5);

  // Ação principal dourada, com texto escuro.
  const principal = page.locator("main .botao.primario").first();
  const fundoPrincipal = await cor(principal, "background-color");
  expect(dourado(fundoPrincipal), "botão principal dourado").toBe(true);
  expect(contraste(await cor(principal), fundoPrincipal)).toBeGreaterThanOrEqual(7);

  // Cartões claros, rótulo de seção escuro e texto secundário legível.
  const cartao = page.locator("main .cartao").first();
  const fundoCartao = await cor(cartao, "background-color");
  expect(luz(fundoCartao), "cartão claro").toBeGreaterThan(0.85);
  expect(contraste(await cor(cartao.locator("h3").first()), fundoCartao)).toBeGreaterThanOrEqual(7);
  expect(contraste(await cor(cartao.locator(".fraco").first()), fundoCartao)).toBeGreaterThanOrEqual(4.5);

  // Tabelas: o segmento escolhido fica verde-floresta, com texto claro.
  await aba(page, "Tabelas");
  const escolhido = page.locator("main .segmentado button.ativo").first();
  const verdeSegmento = await cor(escolhido, "background-color");
  expect(verdeFloresta(verdeSegmento), "segmento escolhido verde-floresta").toBe(true);
  expect(contraste(await cor(escolhido), verdeSegmento)).toBeGreaterThanOrEqual(4.5);

  // Tática: título da página serifado e o campinho continua verde.
  await aba(page, "Tática");
  expect(await serifada(page.locator("main h2").first()), "título da página serifado").toBe(true);
  const campo = await cor(page.locator("main .campo"), "background-color");
  expect(campo[1] - campo[0] > 40 && campo[1] - campo[2] > 20, "campinho verde").toBe(true);
});

test("R32 topo no iPhone: a página se declara escura (hora e bateria brancas sobre o verde), com as telas em marfim por cima", async ({ page }) => {
  await novoJogo(page);
  // O iPhone escolhe a cor da hora e da bateria pela página: escura dá letras brancas, sem névoa clara no topo.
  const raiz = page.locator("html");
  expect(await estilo(raiz, "color-scheme"), "página escura para o iPhone").toBe("dark");
  expect(verdeFloresta(await cor(raiz, "background-color")), "fundo da página por trás das telas").toBe(true);
  expect(verdeFloresta(await cor(page.locator("body"), "background-color"))).toBe(true);
  // As telas continuam em marfim por cima, e os campos (busca e filtros do mercado) continuam claros.
  expect(luz(await cor(page.locator(".app"), "background-color")), "tela em marfim").toBeGreaterThan(0.8);
  await aba(page, "Mercado");
  expect(await estilo(page.locator("main select").first(), "color-scheme"), "filtro claro").toBe("light");
  expect(await estilo(page.locator("main input").first(), "color-scheme"), "busca clara").toBe("light");

  // Na partida: o placar verde-floresta vai até a barra de status, o resto da tela em marfim.
  await aba(page, "Clube");
  await page.getByRole("button", { name: /Avançar|Ir para o jogo/ }).first().click();
  await expect(page.getByRole("button", { name: "Começar o jogo" })).toBeVisible({ timeout: 15_000 });
  expect(verdeFloresta(await cor(page.locator(".placar"), "background-color")), "placar verde").toBe(true);
  expect(luz(await cor(page.locator(".tela-cheia"), "background-color")), "partida em marfim").toBeGreaterThan(0.8);
});
