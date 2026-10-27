import type { Page } from "@playwright/test";
import { aba, agora, cartaoDoProximoJogo, esperarSalvar, expect, mexerNoSave, novoJogo, test } from "./ajuda";

const vagas = (page: Page) => page.locator("main .campo .vaga");
/** O nome do jogador da vaga, pelo rótulo dela ("Lateral direito: Fulano"). */
const nomeNaVaga = async (page: Page, i: number) => (await vagas(page).nth(i).getAttribute("aria-label"))!.split(": ").slice(1).join(": ");
const centroDaCamisa = async (page: Page, i: number) => {
  const c = (await vagas(page).nth(i).locator(".camisa").boundingBox())!;
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
};

test("R48 na Tática, arrastar um jogador até outro troca os dois de posição no campinho (e fica salvo)", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tática");
  await page.locator("main .campo").scrollIntoViewIfNeeded();
  await expect(vagas(page)).toHaveCount(11);
  // Um lateral (vaga 1) e um atacante (vaga 9) do 4-4-2.
  const [lateral, atacante] = [await nomeNaVaga(page, 1), await nomeNaVaga(page, 9)];
  const [de, para] = [await centroDaCamisa(page, 1), await centroDaCamisa(page, 9)];
  const desde = await agora(page);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(para.x, para.y, { steps: 12 });
  await page.mouse.up();
  // Arrastar não abre a escolha da vaga; os dois trocaram de lugar.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await nomeNaVaga(page, 1)).toBe(atacante);
  expect(await nomeNaVaga(page, 9)).toBe(lateral);

  // Fica salvo: fechando e abrindo o app, continua trocado.
  await esperarSalvar(page, desde);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await aba(page, "Tática");
  expect(await nomeNaVaga(page, 1)).toBe(atacante);
  expect(await nomeNaVaga(page, 9)).toBe(lateral);

  // Um toque, sem arrastar, continua abrindo a escolha da vaga.
  await vagas(page).nth(5).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("R49 na Tática, cada jogador no campinho tem a barrinha de cansaço (a energia dele)", async ({ page }) => {
  await novoJogo(page);
  // Um titular cansado: o atacante da vaga 9 com 45% de energia.
  await mexerNoSave(page, "const c = estado.clubes[estado.tecnico.clubeId]; estado.jogadores[c.escalacao.titulares[9]].energia = 45;");
  await aba(page, "Tática");
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
