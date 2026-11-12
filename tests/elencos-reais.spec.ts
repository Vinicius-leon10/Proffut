import { readFileSync } from "node:fs";
import { aba, expect, novoJogo, test } from "./ajuda";

interface JogadorReal { nome: string; posicao: string; idade: number; nacionalidade?: string }
const { elencos } = JSON.parse(readFileSync(new URL("../data/brasil-2026/jogadores.json", import.meta.url), "utf8")) as {
  elencos: Record<string, JogadorReal[]>;
};
const exato = (texto: string) => new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

test("R19 o jogo novo traz os jogadores reais do clube, com o país por extenso", async ({ page }) => {
  await novoJogo(page, { serie: "Série A", clube: "Flamengo" });
  await aba(page, "Elenco");
  const reais = elencos.flamengo;
  expect(reais.length, "o arquivo de elencos tem o Flamengo").toBeGreaterThan(20);
  const nomes = page.locator(".lista .item .negrito");
  for (const j of reais) await expect(nomes.filter({ hasText: exato(j.nome) }), `${j.nome} está no elenco`).toHaveCount(1);

  // Na ficha, a idade é a do arquivo e o país aparece por extenso, não como código ("ARG").
  const estrangeiros = reais.filter((j) => j.nacionalidade);
  expect(estrangeiros.length, "o Flamengo tem estrangeiros").toBeGreaterThan(0);
  for (const j of estrangeiros) {
    await page.locator(".lista .item").filter({ has: page.locator(".negrito", { hasText: exato(j.nome) }) }).click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByRole("heading").first()).toHaveText(j.nome);
    await expect(ficha).toContainText(`${j.idade} anos · `);
    await expect(ficha, `país de ${j.nome}`).not.toContainText(`anos · ${j.nacionalidade}`);
    await ficha.getByRole("button", { name: "Fechar" }).click();
  }
});

test("R97 a bandeira pequena do país do jogador ao lado do nome: no Elenco, na ficha e na lista do Mercado", async ({ page }) => {
  await novoJogo(page, { serie: "Série A", clube: "Flamengo" });
  await aba(page, "Elenco");
  const linhas = page.locator(".lista .item");
  expect(await linhas.count()).toBeGreaterThan(20);
  // Cada jogador do elenco tem a bandeira; o argentino com a da Argentina, o brasileiro com a do Brasil.
  expect(await page.locator(".lista .item .bandeira-jogador").count()).toBe(await linhas.count());
  const estrangeiro = elencos.flamengo.find((j) => j.nacionalidade === "ARG")!;
  const brasileiro = elencos.flamengo.find((j) => !j.nacionalidade)!;
  const linhaDe = (nome: string) => linhas.filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  await expect(linhaDe(estrangeiro.nome).locator(".bandeira-jogador")).toHaveText("🇦🇷");
  await expect(linhaDe(estrangeiro.nome).locator(".bandeira-jogador")).toHaveAttribute("title", "Argentina");
  await expect(linhaDe(brasileiro.nome).locator(".bandeira-jogador")).toHaveText("🇧🇷");
  // Na ficha, a bandeira ao lado do país.
  await linhaDe(estrangeiro.nome).click();
  const ficha = page.getByRole("dialog");
  await expect(ficha.locator(".bandeira-jogador")).toHaveText("🇦🇷");
  await expect(ficha).toContainText("🇦🇷 Argentina");
  await ficha.getByRole("button", { name: "Fechar" }).click();
  // No Mercado, cada jogador da lista também.
  await aba(page, "Mercado");
  const mercado = page.locator("main .lista .item");
  await expect(mercado.first()).toBeVisible();
  expect(await page.locator("main .lista .item .bandeira-jogador").count()).toBe(await mercado.count());
});

test("R119 a Série B com os elencos de 2026 do Transfermarkt: o jogo novo no Fortaleza traz quem está lá em 2026", async ({ page }) => {
  // A lista do Transfermarkt (lotes de jogadores do Claude do computador do usuário) fica no projeto.
  const csv = readFileSync(new URL("../data/brasil-2026/transfermarkt/serie-b-2026.csv", import.meta.url), "utf8").trim().split("\n").slice(1);
  const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const lista = new Map<string, Set<string>>();
  for (const l of csv) {
    const [clube, nome] = l.split(",");
    lista.set(clube, (lista.get(clube) ?? new Set()).add(semAcento(nome)));
  }
  expect(lista.size, "os 20 clubes da Série B").toBe(20);
  for (const [clube, nomes] of lista) {
    const elenco = elencos[clube] ?? [];
    expect(elenco.length, `elenco do ${clube}`).toBeGreaterThanOrEqual(25);
    expect(elenco.length, `elenco do ${clube}`).toBeLessThanOrEqual(30);
    const deFora = elenco.filter((j) => !nomes.has(semAcento(j.nome).replace(/ i+$/, ""))).map((j) => j.nome);
    expect(deFora, `jogadores do ${clube} que não estão na lista de 2026`).toEqual([]);
  }

  await novoJogo(page, { serie: "Série B", clube: "Fortaleza" });
  await aba(page, "Elenco");
  const nomes = page.locator(".lista .item .negrito");
  await expect(nomes.filter({ hasText: exato("Paulo Baya") }), "Paulo Baya, do Fortaleza em 2026").toHaveCount(1);
  await expect(nomes.filter({ hasText: exato("Deyverson") }), "Deyverson não está no Fortaleza de 2026").toHaveCount(0);
});

test("R120 as Séries C e D com os elencos de 2026 do Transfermarkt (só quem está no clube hoje): o jogo novo no Madureira traz o elenco de verdade", async ({ page }) => {
  const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  for (const [arquivo, clubes] of [["serie-c-2026.csv", 20], ["serie-d-2026.csv", 24]] as const) {
    const csv = readFileSync(new URL(`../data/brasil-2026/transfermarkt/${arquivo}`, import.meta.url), "utf8").trim().split("\n").slice(1);
    const lista = new Map<string, Set<string>>();
    for (const l of csv) {
      const [clube, nome] = l.split(",");
      lista.set(clube, (lista.get(clube) ?? new Set()).add(semAcento(nome)));
    }
    expect(lista.size, `clubes em ${arquivo}`).toBe(clubes);
    for (const [clube, nomes] of lista) {
      const elenco = elencos[clube] ?? [];
      expect(elenco.length, `elenco do ${clube}`).toBeGreaterThanOrEqual(Math.min(18, nomes.size));
      expect(elenco.length, `elenco do ${clube}`).toBeLessThanOrEqual(30);
      const deFora = elenco.filter((j) => !nomes.has(semAcento(j.nome).replace(/ i+$/, ""))).map((j) => j.nome);
      expect(deFora, `jogadores do ${clube} que não estão na lista de 2026`).toEqual([]);
    }
  }

  await novoJogo(page, { serie: "Série D", clube: "Madureira" });
  await aba(page, "Elenco");
  await expect(page.locator(".lista .item .negrito").filter({ hasText: exato("Rodrigo Lindoso") }), "Rodrigo Lindoso, do Madureira em 2026").toHaveCount(1);
});

test("R121 o clube de Dubai fundado em 1945 (estádio Al-Maktoum) é o Al-Nasr, não \"Alshariqa\" (nome trocado na fonte)", async ({ page }) => {
  const mundo = JSON.parse(readFileSync(new URL("../data/mundo-2026/clubes.json", import.meta.url), "utf8")) as { id: string; nome: string; cidade: string }[] | { clubes: { id: string; nome: string; cidade: string }[] };
  const clubes = Array.isArray(mundo) ? mundo : mundo.clubes;
  const clube = clubes.find((c) => c.id === "alshariqa");
  expect(clube?.nome).toBe("Al-Nasr");
  expect(clubes.some((c) => /shariqa/i.test(c.nome)), "nenhum clube chamado Alshariqa").toBe(false);
  await page.goto("about:blank");
});
