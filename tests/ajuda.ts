// Passos que vários testes repetem. Os testes em si ficam nos arquivos *.spec.ts.
import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * O Safari do iPhone desenha o que está dentro de uma área com rolagem por baixo do que vem
 * depois dela, mesmo com z-index maior (WebKit, bug 261302). Em todos os testes a mesma ordem
 * de camadas é forçada no Chromium: cada área com rolagem vira uma camada própria e a barra de
 * abas fica por cima dela (testes R16 e R17).
 */
const CAMADAS_DO_SAFARI = ".conteudo { position: relative; z-index: 0; } .abas { position: relative; z-index: 1; }";

/** R14: todo teste também falha se o navegador mostrar um erro. */
export const test = base.extend<{ camadasDoSafari: void; semErrosNoNavegador: void }>({
  camadasDoSafari: [
    async ({ page }, use) => {
      await page.addInitScript((css) => {
        document.addEventListener("DOMContentLoaded", () => {
          const estilo = document.createElement("style");
          estilo.textContent = css;
          document.head.appendChild(estilo);
        });
      }, CAMADAS_DO_SAFARI);
      await use();
    },
    { auto: true },
  ],
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
/**
 * Título do cartão do próximo jogo no painel do clube. Procurar só o texto "Próximo jogo" pega
 * também avisos como "Fulano está suspenso para o próximo jogo".
 */
export const cartaoDoProximoJogo = (page: Page) => page.getByRole("heading", { name: /^(Próximo jogo|Jogo de hoje)$/ });
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
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
}

/**
 * O jogo novo começa com o tutorial (R43): pula e espera o save guardar o jogo sem ele. O jogo salva 400 ms depois
 * da mudança; um teste que recarregasse antes disso veria o tutorial de novo.
 */
export async function pularTutorial(page: Page) {
  const pular = page.getByRole("dialog").getByRole("button", { name: "Pular" });
  await pular.waitFor({ timeout: 20_000 });
  const desde = await agora(page);
  await pular.click();
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
                const saves = banco.transaction("saves", "readonly").objectStore("saves");
                const jogo = saves.get("jogo:auto");
                const resumo = saves.get("resumo:auto");
                resumo.onerror = jogo.onerror = () => falha(jogo.error ?? resumo.error);
                resumo.onsuccess = () => {
                  banco.close();
                  ok(!!jogo.result && !jogo.result.tutorial && !!resumo.result && Date.parse(resumo.result.salvoEm) > desde);
                };
              };
            }),
          desde,
        ),
      { timeout: 15_000, message: "o jogo não salvou sem o tutorial" },
    )
    .toBe(true);
}

/** O adversário no placar da partida: a coluna com o escudo que mostra o time titular dele. */
export const adversarioNoPlacar = (page: Page) =>
  page.locator(".placar .time").filter({ has: page.getByRole("button", { name: /^Ver o time titular d[oa] / }) });
export const nomeDoAdversario = async (page: Page) => (await adversarioNoPlacar(page).locator("span.corta").textContent())!.trim();

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
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 15_000 });
  return placar;
}

/** Avança até o dia do próximo jogo do meu time e para antes dele, no "Começar o jogo". */
export async function irParaOMeuJogo(page: Page) {
  const comecar = botao(page, "Começar o jogo");
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  for (let i = 0; i < 4 && !(await comecar.isVisible()); i++) {
    await botao(page, /Avançar|Ir para o jogo/).click();
    await expect(comecar.or(continuar)).toBeVisible({ timeout: 15_000 });
    if (await continuar.isVisible()) await continuar.click();
  }
  await expect(comecar).toBeVisible();
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
 * Muda o save automático direto no banco do aparelho, para montar uma situação (por exemplo, um
 * save de uma versão antiga), e abre o jogo de novo pelo "Continuar". `codigo` recebe `estado`.
 * Depois de uma ação que muda o jogo (avançar, abrir a partida), espere antes o salvamento dela
 * com `esperarSalvar`: ele chega 400 ms depois e desfaria a mudança (R49).
 */
export async function mexerNoSave(page: Page, codigo: string) {
  await esperarSalvar(page, (await agora(page)) - 60_000);
  await page.evaluate(
    (codigo) =>
      new Promise<void>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const saves = banco.transaction("saves", "readwrite").objectStore("saves");
          const leitura = saves.get("jogo:auto");
          leitura.onerror = () => falha(leitura.error);
          leitura.onsuccess = () => {
            const estado = leitura.result;
            new Function("estado", codigo)(estado);
            const escrita = saves.put(estado, "jogo:auto");
            escrita.onsuccess = () => { banco.close(); ok(); };
            escrita.onerror = () => falha(escrita.error);
          };
        };
      }),
    codigo,
  );
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
}

/**
 * O elemento cabe inteiro na área visível do iPhone (não fica sob a barra do Safari)
 * e nada está por cima dele.
 */
export async function esperarInteiroNaTela(page: Page, alvo: Locator) {
  // Rola até o elemento ficar no meio da área com rolagem, quando dá. Parado na beirada, a rolagem em pixels
  // inteiros pode deixar uma fração de pixel de fora sem esconder nada (a altura do topo é fracionada).
  await alvo.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
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

export type Som =
  | { tipo: "tom"; hz: number; pico: number; grupo: number }
  | { tipo: "ruido"; pico: number; grupo: number }
  | { tipo: "voz"; texto: string; grupo: number };

/**
 * Anota cada som que o jogo toca: tons (apito, vaia), ruídos (torcida) e falas (narrador). `pico` é o
 * maior volume marcado nos ganhos por onde o som passa até a saída; `grupo` junta os sons que começaram
 * no mesmo instante (o mesmo lance).
 */
export async function escutarSons(page: Page) {
  await page.addInitScript(() => {
    type No = AudioNode & { __saidas?: AudioNode[] };
    type Param = AudioParam & { __pico?: number };
    const w = window as unknown as { __sons: unknown[] };
    w.__sons = [];
    let grupo = 0;
    let mesmoInstante = false;
    const grupoAtual = () => {
      if (!mesmoInstante) {
        grupo++;
        mesmoInstante = true;
        queueMicrotask(() => { mesmoInstante = false; });
      }
      return grupo;
    };
    // Por onde o som passa: cada ligação guarda o destino.
    const ligar = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => unknown;
    AudioNode.prototype.connect = function (this: No, ...a: unknown[]) {
      if (a[0] instanceof AudioNode) (this.__saidas ??= []).push(a[0]);
      return ligar.apply(this, a);
    } as typeof AudioNode.prototype.connect;
    // Volume: o maior valor marcado em cada parâmetro (o envelope de cada som).
    for (const metodo of ["setValueAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime"] as const) {
      const original = AudioParam.prototype[metodo];
      AudioParam.prototype[metodo] = function (this: Param, valor: number, tempo: number) {
        this.__pico = Math.max(this.__pico ?? 0, valor);
        return original.call(this, valor, tempo);
      };
    }
    const pico = (inicio: AudioNode) => {
      let maior = 0;
      const fila: No[] = [inicio];
      const vistos = new Set<AudioNode>();
      while (fila.length) {
        const no = fila.shift()!;
        if (vistos.has(no)) continue;
        vistos.add(no);
        fila.push(...(no.__saidas ?? []));
        if (no instanceof GainNode) maior = Math.max(maior, (no.gain as Param).__pico ?? 0);
      }
      return maior;
    };
    const tom = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      w.__sons.push({ tipo: "tom", hz: this.frequency.value, pico: pico(this), grupo: grupoAtual() });
      return tom.apply(this, a);
    };
    const ruido = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: [number?, number?, number?]) {
      w.__sons.push({ tipo: "ruido", pico: pico(this), grupo: grupoAtual() });
      return ruido.apply(this, a);
    };
    if (window.speechSynthesis) {
      const falar = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        if (u.text.trim()) w.__sons.push({ tipo: "voz", texto: u.text, grupo: grupoAtual() });
        try { falar(u); } catch { /* sem voz no navegador de teste */ }
      };
    }
  });
  return () => page.evaluate(() => (window as unknown as { __sons: Som[] }).__sons);
}
