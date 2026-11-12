import type { Locator, Page } from "@playwright/test";
import { aba, abrirSite, botao, expect, novoJogo, test } from "./ajuda";

// R124: bandeiras e escudos das seleções em imagem. Pedido do usuário: "o jogo no pc não tem as bandeira" (o Windows não
// desenha a bandeira em emoji) e "O escudo e a bandeira dos países são diferentes. Então, a bandeira vai para o jogador ali
// para dizer nacionalidade. E os escudos eu quero que você use quando eu for técnico e for na Copa do Mundo" (nov/2026).

/** A bandeira é a imagem do jogo (uma folha com todas, `bandeiras.png`), sem emoji, e a imagem carrega. */
async function conferirBandeira(page: Page, alvo: Locator, pais: string) {
  await expect(alvo).toHaveAttribute("data-pais", pais);
  await expect(alvo).toHaveText("");
  const fundo = await alvo.evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(fundo).toContain("bandeiras.png");
  const url = fundo.match(/url\("?(.*?)"?\)/)![1];
  expect((await page.request.get(url)).status()).toBe(200);
}

test("R124 bandeiras em imagem (jogador e escolha do país) e o escudo de cada seleção", async ({ page }) => {
  // Escolha do país no jogo novo.
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /América/ }).click();
  await conferirBandeira(page, page.getByRole("button", { name: /Argentina/ }).locator(".bandeira"), "AR");
  await conferirBandeira(page, page.getByRole("button", { name: /Brasil/ }).locator(".bandeira"), "BR");

  // Ao lado do nome do jogador.
  await novoJogo(page, { serie: "Série A", clube: "Flamengo" });
  await aba(page, "Elenco");
  const bandeiras = page.locator(".lista .item .bandeira-jogador");
  expect(await bandeiras.count()).toBeGreaterThan(20);
  await conferirBandeira(page, page.locator('.lista .item .bandeira-jogador[data-pais="BR"]').first(), "BR");
  await conferirBandeira(page, page.locator('.lista .item .bandeira-jogador[data-pais="AR"]').first(), "AR");

  // O escudo da seleção (não a bandeira) no ranking das seleções.
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Seleções" }).click();
  const brasil = page.locator("main .lista .item", { hasText: "Brasil" }).first();
  const escudo = brasil.locator("img.escudo");
  await expect(escudo).toHaveAttribute("src", /escudos\/sel-BR\.png$/);
  await expect.poll(() => escudo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await expect(brasil.locator(".bandeira-escudo")).toHaveCount(0);
});
