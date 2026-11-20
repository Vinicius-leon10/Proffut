import { aba, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

const exato = (nome: string) => new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

test("R151 no Mercado, a força se filtra por faixas fechadas: Força, 40 a 49, 50 a 59, 60 a 69, 70 a 79, 80 a 89 e 90 a 99", async ({ page }) => {
  // Pedido do usuário (nov/2026): faixas "Força 40 a 49" ... "90 a 99", nada abaixo de 40.
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Buscar" }).click();
  const filtro = page.getByLabel("Faixa de força");
  expect((await filtro.locator("option").allTextContents()).map((t) => t.trim())).toEqual([
    "Força", "Força 40 a 49", "Força 50 a 59", "Força 60 a 69", "Força 70 a 79", "Força 80 a 89", "Força 90 a 99",
  ]);
  for (const [faixa, min, max] of [["Força 70 a 79", 70, 79], ["Força 80 a 89", 80, 89]] as const) {
    await filtro.selectOption({ label: faixa });
    const forcas = page.locator("main .lista .item .forca");
    await expect(forcas.first()).toBeVisible();
    const valores = (await forcas.allTextContents()).map(Number);
    expect(valores.length).toBeGreaterThan(0);
    for (const f of valores) {
      expect(f).toBeGreaterThanOrEqual(min);
      expect(f).toBeLessThanOrEqual(max);
    }
  }
});

test("R154 venda rápida (leilão): pôs à venda, a proposta do maior lance já aparece em Meus à venda, sem avançar nenhum dia", async ({ page }) => {
  // Pedido do usuário (nov/2026): "Botei jogador à venda, já vai aparecer a proposta instantânea... para eu não ficar
  // esperando rodadas... eu vi no Brasfoot que tem esse modo leilão".
  await novoJogo(page);
  await aba(page, "Elenco");
  const linha = page.locator("main .lista .item").filter({ has: page.locator(".posicao.M") }).nth(2);
  const nome = (await linha.locator(".negrito").first().textContent())!.trim();
  await linha.click();
  const ficha = page.getByRole("dialog");
  const colocar = ficha.getByRole("button", { name: "Colocar à venda" }).first();
  await esperarInteiroNaTela(page, colocar);
  await colocar.click();
  await expect(page.locator(".aviso")).toContainText(`${nome} foi colocado à venda. Leilão:`);
  await ficha.getByRole("button", { name: "Fechar" }).click();

  // Em Mercado → Meus à venda, o lance já está embaixo dele, com Aceitar.
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: /Meus à venda/ }).click();
  const venda = page.locator("main .a-venda").filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  await expect(venda.locator(".proposta-a-venda")).toContainText("Leilão");
  const aceitar = venda.getByRole("button", { name: "Aceitar" });
  await esperarInteiroNaTela(page, aceitar);
  await aceitar.click();
  await expect(page.locator(".aviso")).toContainText(`${nome} foi vendido`);
  await expect(page.locator("main .a-venda").filter({ has: page.locator(".negrito", { hasText: exato(nome) }) })).toHaveCount(0);
});
