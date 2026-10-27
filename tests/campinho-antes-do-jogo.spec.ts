import type { Page } from "@playwright/test";
import { agora, botao, cartaoDoProximoJogo, esperarSalvar, expect, irParaOMeuJogo, mexerNoSave, novoJogo, test } from "./ajuda";

// O campinho do meu time antes do jogo, no lugar da lista de titulares (R52): arrastar troca dois jogadores de
// posição (R48), um toque abre a escolha do jogador da vaga, e cada um tem a barrinha de energia (R49).
const vagas = (page: Page) => page.locator(".tela-cheia .campo .vaga");
/** O nome do jogador da vaga, pelo rótulo dela ("Lateral direito: Fulano"). */
const nomeNaVaga = async (page: Page, i: number) => (await vagas(page).nth(i).getAttribute("aria-label"))!.split(": ").slice(1).join(": ");
const centroDaCamisa = async (page: Page, i: number) => {
  const c = (await vagas(page).nth(i).locator(".camisa").boundingBox())!;
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
};
/** Volta ao clube e vai de novo para o jogo de hoje (o campinho é montado de novo a partir do clube). */
const voltarAoJogo = async (page: Page) => {
  await botao(page, "Voltar ao clube").click();
  await irParaOMeuJogo(page);
};

test("R48 antes do jogo, arrastar um jogador até outro no campinho troca os dois de posição (e fica salvo)", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await expect(vagas(page)).toHaveCount(11);
  await page.locator(".tela-cheia .campo").evaluate((el) => el.scrollIntoView({ block: "center" }));
  // Um lateral (vaga 1) e um meia (vaga 5) do 4-4-2.
  const [lateral, meia] = [await nomeNaVaga(page, 1), await nomeNaVaga(page, 5)];
  const [de, para] = [await centroDaCamisa(page, 1), await centroDaCamisa(page, 5)];
  const desde = await agora(page);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(para.x, para.y, { steps: 12 });
  await page.mouse.up();
  // Arrastar não abre a escolha da vaga; os dois trocaram de lugar.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await nomeNaVaga(page, 1)).toBe(meia);
  expect(await nomeNaVaga(page, 5)).toBe(lateral);

  // Fica salvo no clube: fechando e abrindo o app, o campinho do jogo continua trocado.
  await esperarSalvar(page, desde);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await irParaOMeuJogo(page);
  expect(await nomeNaVaga(page, 1)).toBe(meia);
  expect(await nomeNaVaga(page, 5)).toBe(lateral);
});

test("R49 antes do jogo, cada jogador no campinho tem a barrinha de cansaço (a energia dele)", async ({ page }) => {
  await novoJogo(page);
  const desde = await agora(page);
  await irParaOMeuJogo(page);
  // No dia do jogo, um titular cansado: o atacante da vaga 9 com 45% de energia. Antes, o salvamento de quando o
  // jogo abriu a partida (400 ms depois): sem esperar, ele chegava depois da mudança e a desfazia.
  await botao(page, "Voltar ao clube").click();
  await esperarSalvar(page, desde);
  await mexerNoSave(page, "const c = estado.clubes[estado.tecnico.clubeId]; estado.jogadores[c.escalacao.titulares[9]].energia = 45;");
  await irParaOMeuJogo(page);
  const barras = vagas(page).locator(".barra");
  await expect(barras).toHaveCount(11);
  await expect(vagas(page).nth(9).locator(".barra")).toHaveAttribute("aria-valuenow", "45");
  for (const i of [0, 1, 5]) await expect(vagas(page).nth(i).locator(".barra")).toHaveAttribute("aria-valuenow", "100");
  // A parte cheia da barra é a energia: menos da metade para o cansado.
  const cheia = async (i: number) => {
    const barra = vagas(page).nth(i).locator(".barra");
    const [total, parte] = [(await barra.boundingBox())!.width, (await barra.locator("div").boundingBox())!.width];
    return parte / total;
  };
  expect(await cheia(9)).toBeCloseTo(0.45, 1);
  expect(await cheia(1)).toBeCloseTo(1, 1);
});

test("R52 antes do jogo, o campinho fica no lugar da lista de titulares: um toque no jogador abre a escolha e o reserva escolhido entra no time", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await expect(vagas(page)).toHaveCount(11);
  await expect(page.locator(".tela-cheia .conteudo .lista")).toHaveCount(0);

  // Um toque no atacante da vaga 9 abre a escolha; o primeiro reserva da lista entra no lugar dele.
  const sai = await nomeNaVaga(page, 9);
  await vagas(page).nth(9).click();
  const folha = page.getByRole("dialog");
  const reserva = folha.locator("button.item").filter({ hasText: "reserva ·" }).first();
  const entra = (await reserva.locator(".negrito").first().textContent())!.trim();
  await reserva.click();
  await expect(folha).toHaveCount(0);
  expect(await nomeNaVaga(page, 9)).toBe(entra);

  // É a escalação do clube: voltando e indo de novo para o jogo, ele continua lá.
  await voltarAoJogo(page);
  expect(await nomeNaVaga(page, 9)).toBe(entra);

  // E vale para a partida: no fim, as notas mostram quem jogou.
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await page.locator(".tela-cheia").getByRole("tab", { name: "Notas", exact: true }).click();
  const meus = page.locator(".tela-cheia .notas .time").first();
  await expect(meus).toContainText(entra);
  await expect(meus).not.toContainText(sai);
});
