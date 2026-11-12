import type { Page } from "@playwright/test";
import { botao, expect, irParaOMeuJogo, mexerNoSave, nomeDoAdversario, novoJogo, test, MINUTO_2X } from "./ajuda";

// As da tela do jogo: as do print do usuário (R58). Os chutes saíram da tela; o motor ainda confere (motor.test.ts).
const ESTATISTICAS = ["Ataques", "Ataques perigosos", "Posse de bola", "Escanteios", "Cartões amarelos", "Cartões vermelhos"];

/** Os dois números de uma estatística na tela, na ordem do placar (mandante, visitante). */
async function numeros(page: Page, nome: string): Promise<[number, number]> {
  const textos = await page.locator(".tela-cheia").getByRole("group", { name: nome, exact: true }).locator(".numero").allTextContents();
  expect(textos, `os dois números de "${nome}"`).toHaveLength(2);
  const [m, v] = textos.map((t) => Number(t.replace("%", "")));
  return [m, v];
}
const soma = ([a, b]: [number, number]) => a + b;

test("R34 estatísticas da partida: ataques, ataques perigosos, posse de bola, escanteios e cartões, que andam com o jogo e batem com os lances", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  // As estatísticas ficam na tela do jogo, sem aba (R56).
  for (const nome of ESTATISTICAS) await expect(page.locator(".tela-cheia").getByRole("group", { name: nome, exact: true })).toHaveCount(1);

  // Os números andam com o jogo.
  const ataquesAntes = soma(await numeros(page, "Ataques"));
  await page.clock.runFor(5_000);
  expect(soma(await numeros(page, "Ataques")), "os ataques aumentam com o jogo").toBeGreaterThan(ataquesAntes + 5);

  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
  const ataques = await numeros(page, "Ataques");
  const perigosos = await numeros(page, "Ataques perigosos");
  const posse = await numeros(page, "Posse de bola");
  expect(soma(posse), "a posse de bola soma 100%").toBe(100);
  for (const i of [0, 1]) {
    expect(posse[i]).toBeGreaterThanOrEqual(10);
    expect(perigosos[i], "ataque perigoso também é ataque").toBeLessThanOrEqual(ataques[i]);
  }
  // Números de um jogo de verdade (os dois times somados).
  expect(soma(ataques)).toBeGreaterThan(80);
  expect(soma(ataques)).toBeLessThan(400);

  // Cartões: os mesmos dos lances de cada time (o segundo amarelo conta como amarelo e vermelho).
  const amarelos = await numeros(page, "Cartões amarelos");
  const vermelhos = await numeros(page, "Cartões vermelhos");
  // O escudo diz de quem é o lance: a imagem (pelo endereço) ou, no time novo ainda sem imagem, o desenhado (pelo id do
  // recorte, que é o do clube). Desde nov/2026 o primeiro jogo é o do estadual, e o mandante pode ser um time novo.
  const escudoDoMandante = await page.locator(".placar .time").first().locator(".escudo").first()
    .evaluate((el) => (el.tagName.toLowerCase() === "img" ? el.getAttribute("src") : el.querySelector("clipPath")?.id) ?? "");
  expect(escudoDoMandante).not.toBe("");
  const deCadaTime = async (texto: RegExp): Promise<[number, number]> => {
    const doMandante = await page.locator(".tela-cheia .lance").filter({ hasText: texto })
      .evaluateAll((els, alvo) => els.map((el) => {
        const e = el.querySelector(".escudo-lance .escudo");
        return !!e && (e.tagName.toLowerCase() === "img" ? e.getAttribute("src") : e.querySelector("clipPath")?.id) === alvo;
      }), escudoDoMandante);
    return [doMandante.filter((x) => x).length, doMandante.filter((x) => !x).length];
  };
  const [primeiro, segundo] = [await deCadaTime(/🟨/), await deCadaTime(/Segundo amarelo/)];
  expect(amarelos).toEqual([primeiro[0] + segundo[0], primeiro[1] + segundo[1]]);
  expect(vermelhos).toEqual(await deCadaTime(/🟥/));
});

test("R35 aviso de pressão: quando o adversário domina os últimos 15 minutos, a partida avisa e sugere mexer na tática ou substituir", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  // Meu time bem fraco: o adversário vai pressionar.
  await mexerNoSave(page, "for (const j of Object.values(estado.jogadores)) if (j.clubeId === estado.tecnico.clubeId) j.forca = 5;");
  await irParaOMeuJogo(page);
  const nomeDele = await nomeDoAdversario(page);
  await botao(page, "Começar o jogo").click();

  // Minuto a minuto até o aviso aparecer, ainda no primeiro tempo.
  const aviso = page.locator(".tela-cheia").getByRole("status").filter({ hasText: "pressionando" });
  for (let i = 0; i < 40 && !(await aviso.isVisible()); i++) await page.clock.runFor(MINUTO_2X);
  await expect(aviso).toBeVisible();
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(aviso).toContainText(nomeDele);
  await expect(aviso).toContainText("Mude a tática ou faça uma substituição");
  const [deles, nossos] = (await aviso.textContent())!.match(/(\d+) ataques? perigosos? contra (\d+)/)!.slice(1).map(Number);
  expect(deles, "o adversário tem pelo menos o dobro de ataques perigosos").toBeGreaterThanOrEqual(2 * nossos);

  // Os números do aviso cabem nos ataques perigosos do jogo todo, nas estatísticas da mesma tela (a barra da pressão
  // dos últimos 15 minutos saiu da tela, R58).
  const perigosos = await numeros(page, "Ataques perigosos");
  const meuLado = (await page.locator(".placar .time").first().textContent())!.includes(nomeDele) ? 1 : 0;
  expect(nossos).toBeLessThanOrEqual(perigosos[meuLado]);
  expect(deles).toBeLessThanOrEqual(perigosos[1 - meuLado]);

  // No intervalo o aviso sai: o cartão do intervalo já convida a mudar o time. Minuto a minuto até lá: adiantado
  // de uma vez, o relógio de teste dispara um minuto atrás do outro e passa do intervalo antes de a tela parar.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const relogio = page.locator(".relogio");
  for (let i = 0; i < 60 && (await relogio.textContent()) !== "Intervalo"; i++) await page.clock.runFor(MINUTO_2X);
  await expect(relogio).toHaveText("Intervalo");
  await expect(page.getByText("Faça substituições ou mude a tática")).toBeVisible();
  await expect(aviso).toHaveCount(0);
});

test("R56 na partida, as estatísticas ficam fixas na tela do jogo, no lugar da aba Lances e com os lances embaixo; das abas só fica a Rodada (e as Notas no fim)", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  const tela = page.locator(".tela-cheia");
  const conteudo = tela.locator(".conteudo");

  // Sem as abas: as estatísticas já estão na tela do jogo, sem tocar em nada (em cima da área dos lances, R59).
  for (const nome of ["Lances", "Estatísticas", "Rodada", "Notas"]) await expect(tela.getByRole("tab", { name: nome, exact: true })).toHaveCount(0);
  for (const nome of ESTATISTICAS) await expect(tela.getByRole("group", { name: nome, exact: true })).toHaveCount(1);
  await expect(tela.getByRole("group", { name: "Ataques", exact: true })).toBeInViewport();

  // Os lances continuam, embaixo das estatísticas.
  const lance = conteudo.locator(".lance").first();
  for (let i = 0; i < 60 && !(await lance.count()); i++) await page.clock.runFor(MINUTO_2X);
  await expect(lance).toBeVisible();
  const estatisticas = (await tela.locator(".estatisticas").boundingBox())!;
  expect((await lance.boundingBox())!.y, "os lances ficam embaixo das estatísticas").toBeGreaterThanOrEqual(estatisticas.y + estatisticas.height - 1);

  // A caixa Rodada abre os jogos da rodada (o meu também), e o jogo segue enquanto ela está aberta.
  const relogio = page.locator(".relogio");
  const antes = (await relogio.textContent())!;
  await tela.getByRole("button", { name: "Rodada", exact: true }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Rodada", exact: true })).toBeVisible();
  await expect(folha.locator(".jogo-rodada.meu")).toHaveCount(1);
  expect(await folha.locator(".jogo-rodada").count()).toBeGreaterThan(1);
  await page.clock.runFor(2_000);
  await expect(relogio).not.toHaveText(antes);
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(folha).toHaveCount(0);

  // As Notas só no fim (R45), numa caixa ao lado da Rodada; as estatísticas continuam na tela.
  await expect(tela.getByRole("button", { name: "Notas", exact: true })).toHaveCount(0);
  await botao(page, "Fim ⏭").click();
  await expect(relogio).toHaveText("Fim");
  await expect(tela.getByRole("button", { name: "Notas", exact: true })).toBeVisible();
  await expect(tela.getByRole("button", { name: "Rodada", exact: true })).toBeVisible();
  await expect(tela.getByRole("group", { name: "Ataques", exact: true })).toBeVisible();
});

test("R58 as estatísticas na tela do jogo ficam só com o que estava no print: os times, os anéis de ataques, ataques perigosos e posse de bola, e os escanteios e cartões", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  const painel = page.locator(".tela-cheia .estatisticas");
  await expect(painel).toBeVisible();
  // Os dois times em cima, cada um com a sua cor.
  await expect(painel.locator(".estat-times > span")).toHaveCount(2);
  // Só os anéis e a linha de escanteios e cartões, nessa ordem.
  const grupos = await painel.getByRole("group").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(grupos).toEqual(["Ataques", "Ataques perigosos", "Posse de bola", "Escanteios", "Cartões amarelos", "Cartões vermelhos"]);
  // Sem os chutes, a pressão e o texto explicativo.
  await expect(painel).not.toContainText("Chutes");
  await expect(painel).not.toContainText("Pressão");
  await expect(painel.locator("p")).toHaveCount(0);
});

test("R59 as estatísticas ficam travadas em cima da tela do jogo: rolando os lances, elas não se mexem", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  // No fim, com todos os lances do jogo, a lista é maior que a tela e rola.
  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
  const painel = page.locator(".tela-cheia .estatisticas");
  const rolagem = page.locator(".tela-cheia .conteudo");
  const primeiro = rolagem.locator(".lance").first();
  await expect(painel).toBeInViewport({ ratio: 1 });
  const [painelAntes, lanceAntes] = [(await painel.boundingBox())!.y, (await primeiro.boundingBox())!.y];

  await rolagem.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  expect(await rolagem.evaluate((el) => el.scrollTop), "a lista dos lances rolou").toBeGreaterThan(50);
  expect((await primeiro.boundingBox())!.y, "os lances andaram").toBeLessThan(lanceAntes - 50);
  expect((await painel.boundingBox())!.y, "as estatísticas não se mexeram").toBeCloseTo(painelAntes, 0);
  await expect(painel).toBeInViewport({ ratio: 1 });
});
