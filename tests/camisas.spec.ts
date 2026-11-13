import type { Locator } from "@playwright/test";
import { botao, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

// Campinho com as camisas oficiais (R133, modelo aprovado pelo usuário em nov/2026: docs/previas/campinho-camisas-modelo.html):
// a camisa do clube (public/camisas/<id>.png; sem a oficial, uma desenhada nas cores dele), o número por cima, a força
// num anel logo embaixo e o nome por último; o goleiro com uma camisa amarela desenhada.
const carregou = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);

async function conferirCampinho(campo: Locator, clubeId: string, { oficial }: { oficial: boolean }) {
  const lista = campo.locator(".vaga");
  await expect(lista).toHaveCount(11);
  const numeros: string[] = [];
  for (let i = 0; i < 11; i++) {
    const vaga = lista.nth(i);
    const rotulo = (await vaga.getAttribute("aria-label")) ?? (await vaga.getAttribute("data-pos")) ?? "";
    const goleiro = /^Goleiro/.test(rotulo) || (await vaga.getAttribute("data-pos")) === "G";
    const uniforme = vaga.locator(".uniforme");
    await expect(uniforme).toHaveCount(1);
    if (goleiro || !oficial) {
      // Goleiro e clube sem a camisa oficial: a camisa desenhada (o goleiro de amarelo).
      await expect(uniforme.locator("img")).toHaveCount(0);
      await expect(uniforme.locator("svg.camisa-desenhada")).toHaveCount(1);
      if (goleiro) await expect(uniforme.locator("svg.camisa-desenhada")).toHaveAttribute("data-cor", "#f2cf3c");
    } else {
      const img = uniforme.locator("img");
      await expect(img).toHaveAttribute("src", `camisas/${clubeId}.png`);
      expect(await carregou(img)).toBe(true);
    }
    // O número da camisa por cima, sem fundo; a força no anel embaixo; o nome por último.
    const numero = (await uniforme.locator(".numero").textContent())!.trim();
    expect(numero).toMatch(/^\d{1,2}$/);
    numeros.push(numero);
    expect((await vaga.locator(".camisa").textContent())!.trim()).toMatch(/^\d+$/);
    const [u, f, n] = [await uniforme.boundingBox(), await vaga.locator(".camisa").boundingBox(), await vaga.locator(".nome").boundingBox()];
    expect(u!.y).toBeLessThan(f!.y);
    expect(f!.y).toBeLessThan(n!.y);
    const fundo = await uniforme.locator(".numero").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(fundo).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  }
  // Cada um com o seu número (sem repetir no time).
  expect(new Set(numeros).size).toBe(11);
}

test("R133 antes do jogo, o campinho mostra a camisa oficial do clube com o número, a força embaixo e o nome", async ({ page }) => {
  await novoJogo(page); // Ponte Preta, que tem a camisa oficial
  await irParaOMeuJogo(page);
  const campo = page.locator(".tela-cheia .campo");
  await campo.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await conferirCampinho(campo, "ponte-preta", { oficial: true });

  // O time titular do adversário também aparece com as camisas.
  await page.getByRole("button", { name: /^Ver o time titular d[oa] / }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.locator(".campo .vaga")).toHaveCount(11);
  for (const numero of await folha.locator(".vaga .uniforme .numero").allTextContents()) expect(numero.trim()).toMatch(/^\d{1,2}$/);
  await expect(folha.locator(".vaga .uniforme")).toHaveCount(11);
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(botao(page, "Começar o jogo")).toBeVisible();
});

test("R133 clube sem a camisa oficial: a camisa desenhada nas cores dele, com o número", async ({ page }) => {
  await novoJogo(page, { clube: "Vila Nova" }); // a camisa oficial do Vila Nova não foi achada
  await irParaOMeuJogo(page);
  const campo = page.locator(".tela-cheia .campo");
  await conferirCampinho(campo, "vila-nova", { oficial: false });
  // A camisa desenhada de quem não é goleiro tem a cor do clube (vermelho).
  await expect(campo.locator(".vaga").nth(5).locator("svg.camisa-desenhada")).toHaveAttribute("data-cor", "#C62828");
});
