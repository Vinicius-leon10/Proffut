// Passos que vários testes repetem. Os testes em si ficam nos arquivos *.spec.ts.
import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** R14: todo teste também falha se o navegador mostrar um erro. */
export const test = base.extend<{ semErrosNoNavegador: void }>({
  semErrosNoNavegador: [
    async ({ page }, use) => {
      const erros: string[] = [];
      page.on("pageerror", (e) => erros.push(String(e)));
      page.on("console", (m) => {
        // Sem internet o navegador avisa que não alcançou a rede: isso é esperado.
        if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) erros.push(m.text());
      });
      await use();
      expect(erros, "erros no navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const botao = (page: Page, nome: string | RegExp) => page.getByRole("button", { name: nome }).first();
export const voltar = (page: Page) => page.getByRole("button", { name: "Voltar", exact: true }).click();
export const aba = (page: Page, nome: string) => page.locator("nav").getByRole("button", { name: nome }).click();

export async function abrirSite(page: Page) {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Proffut" })).toBeVisible({ timeout: 20_000 });
}

export async function novoJogo(page: Page, { serie = "Série B", clube = "Ponte Preta" } = {}) {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("tab", { name: serie }).click();
  await botao(page, new RegExp(clube)).click();
  await botao(page, /Assumir o/).click();
  await expect(page.getByText("Próximo jogo")).toBeVisible({ timeout: 20_000 });
}

/** Data mostrada no topo do painel, ex.: "sáb, 04 abr 2026". */
export async function dataNoTopo(page: Page) {
  return (await page.locator(".topo .sub").first().textContent())?.split("·")[0].trim();
}

/** Vai para o próximo jogo e o joga até o fim. Devolve o placar ("1 x 0"). */
export async function jogarPartida(page: Page) {
  await botao(page, /Avançar|Ir para o jogo/).click();
  const comecar = botao(page, "Começar o jogo");
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await expect(comecar.or(continuar)).toBeVisible({ timeout: 15_000 });
  let placar = "";
  if (await comecar.isVisible()) {
    await comecar.click();
    await botao(page, "Fim ⏭").click();
    placar = ((await page.locator(".placar .gols").textContent()) ?? "").replace(/\s+/g, " ").trim();
  }
  await continuar.click();
  await expect(page.getByText(/Próximo jogo|Jogo de hoje/).first()).toBeVisible({ timeout: 15_000 });
  return placar;
}

/** Relógio da página, para usar com `esperarSalvar`. */
export const agora = (page: Page) => page.evaluate(() => Date.now());

/**
 * Espera o salvamento automático depois de `desde`: um save mais novo que isso e nenhum
 * outro nos 600 ms seguintes (o jogo salva 400 ms depois da última mudança).
 */
export async function esperarSalvar(page: Page, desde: number) {
  await expect
    .poll(
      () =>
        page.evaluate(
          (desde) =>
            new Promise<boolean>((ok, falha) => {
              const pedido = indexedDB.open("proffut");
              pedido.onerror = () => falha(pedido.error);
              pedido.onsuccess = () => {
                const banco = pedido.result;
                const leitura = banco.transaction("saves", "readonly").objectStore("saves").get("resumo:auto");
                leitura.onerror = () => falha(leitura.error);
                leitura.onsuccess = () => {
                  banco.close();
                  const salvoEm = leitura.result ? Date.parse(leitura.result.salvoEm) : 0;
                  ok(salvoEm > desde && Date.now() - salvoEm > 600);
                };
              };
            }),
          desde,
        ),
      { timeout: 15_000, message: "o jogo não salvou no aparelho" },
    )
    .toBe(true);
}

/**
 * O elemento cabe inteiro na área visível do iPhone (não fica sob a barra do Safari)
 * e nada está por cima dele.
 */
export async function esperarInteiroNaTela(page: Page, alvo: Locator) {
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  const tela = page.viewportSize();
  expect(caixa, "o elemento não está na tela").not.toBeNull();
  expect(caixa!.y, "o elemento começa acima da tela").toBeGreaterThanOrEqual(0);
  expect(caixa!.y + caixa!.height, "o elemento termina abaixo da área visível").toBeLessThanOrEqual(tela!.height);
  const livre = await alvo.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const topo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!topo && (topo === el || el.contains(topo));
  });
  expect(livre, "algo está cobrindo o elemento").toBe(true);
}
