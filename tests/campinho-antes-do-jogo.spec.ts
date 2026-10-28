import type { Page } from "@playwright/test";
import { agora, botao, cartaoDoProximoJogo, esperarNoSave, esperarSalvar, expect, irParaOMeuJogo, mexerNoSave, novoJogo, test } from "./ajuda";

// O campinho do meu time antes do jogo, no lugar da lista de titulares (R52): arrastar troca dois jogadores de
// posição (R48), um toque abre a escolha do jogador da vaga, e cada um tem a barrinha de energia (R49).
const vagas = (page: Page) => page.locator(".tela-cheia .campo .vaga");
/** O nome do jogador da vaga, pelo rótulo dela ("Lateral direito: Fulano"). */
const nomeNaVaga = async (page: Page, i: number) => (await vagas(page).nth(i).getAttribute("aria-label"))!.split(": ").slice(1).join(": ");
const centroDaCamisa = async (page: Page, i: number) => {
  const c = (await vagas(page).nth(i).locator(".camisa").boundingBox())!;
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
};
/** Se o jogador entrou em campo numa substituição, pela narração da partida ("Substituição: entra Fulano, sai..."). */
const entrouNoJogo = async (page: Page, nome: string) =>
  (await page.locator(".tela-cheia .lance", { hasText: `Substituição: entra ${nome},` }).count()) > 0;
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
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(para.x, para.y, { steps: 12 });
  await page.mouse.up();
  // Arrastar não abre a escolha da vaga; os dois trocaram de lugar.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await nomeNaVaga(page, 1)).toBe(meia);
  expect(await nomeNaVaga(page, 5)).toBe(lateral);

  // Fica salvo no clube: fechando e abrindo o app, o campinho do jogo continua trocado. Antes de fechar, a troca
  // tem de estar no save (esperar só um salvamento falhava 1 vez em 12: o de quando o jogo abriu a partida chegava no meio).
  const noSave = (i: number) => `estado.jogadores[estado.clubes[estado.tecnico.clubeId].escalacao.titulares[${i}]]?.nome`;
  await esperarNoSave(page, `${noSave(1)} === ${JSON.stringify(meia)} && ${noSave(5)} === ${JSON.stringify(lateral)}`);
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

  // E vale para a partida: no fim, as notas mostram que ele começou jogando (jogou sem entrar numa substituição) e o
  // que saiu não, a não ser chamado do banco numa substituição: a automática, de quem se machuca, pode chamá-lo.
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  const abaNotas = page.locator(".tela-cheia").getByRole("tab", { name: "Notas", exact: true });
  await expect(abaNotas).toBeVisible();
  const [entraEntrou, saiEntrou] = [await entrouNoJogo(page, entra), await entrouNoJogo(page, sai)];
  await abaNotas.click();
  const meus = await page.locator(".tela-cheia .notas .time").first().locator(".item .nome").allTextContents();
  expect(meus).toContain(entra);
  expect(entraEntrou, `${entra} entrou numa substituição`).toBe(false);
  if (!saiEntrou) expect(meus).not.toContain(sai);
});

const ORDEM = ["Goleiros", "Laterais", "Zagueiros", "Meio-campistas", "Atacantes"];
const SIGLA: Record<string, string> = { Goleiros: "G", Laterais: "L", Zagueiros: "Z", "Meio-campistas": "M", Atacantes: "A" };
/** Os nomes dos grupos de posição na folha, na ordem, e se cada jogador está no grupo da posição dele. */
const gruposDaFolha = async (page: Page) => {
  const folha = page.getByRole("dialog");
  const grupos = folha.locator(".grupo-posicao");
  const nomes: string[] = [];
  for (const grupo of await grupos.all()) {
    const nome = (await grupo.getByRole("heading").textContent())!.trim();
    nomes.push(nome);
    for (const pos of await grupo.locator(".item .posicao").allTextContents()) expect(pos, `jogador fora do grupo ${nome}`).toBe(SIGLA[nome]);
  }
  return nomes;
};

test("R53 antes do jogo, a escolha do jogador da vaga vem organizada pela posição em campo: a da vaga primeiro, depois as outras", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  // Um meia (vaga 5 do 4-4-2): primeiro os meio-campistas, depois goleiros, laterais, zagueiros e atacantes.
  await vagas(page).nth(5).click();
  const nomes = await gruposDaFolha(page);
  expect(nomes[0]).toBe("Meio-campistas");
  expect(nomes.slice(1)).toEqual(ORDEM.filter((n) => n !== "Meio-campistas" && nomes.includes(n)));
});

test("R54 antes do jogo, o botão Reservas mostra os 7 do banco pela posição em campo, e dá para trocar quem fica no banco", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await page.locator(".tela-cheia .conteudo").getByRole("button", { name: "Reservas", exact: true }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();
  const banco = folha.locator(".lista button.item");
  await expect(banco).toHaveCount(7);
  // Organizados pela posição em campo: goleiro, laterais, zagueiros, meio-campistas, atacantes.
  const ordem = "GLZMA";
  const posicoes = (await banco.locator(".posicao").allTextContents()).map((p) => ordem.indexOf(p));
  expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));

  // Troca o primeiro do banco por alguém que não está no banco nem no time; a escolha também vem por posição.
  const sai = (await banco.first().locator(".negrito").first().textContent())!.trim();
  await banco.first().click();
  expect((await gruposDaFolha(page)).length).toBeGreaterThan(1);
  // Só quem está fora do time e do banco: nem ele mesmo nem os outros reservas (escolher um deles não mudaria nada).
  const candidatos = folha.locator(".grupo-posicao button.item");
  await expect(candidatos.filter({ hasText: "reserva ·" })).toHaveCount(0);
  await expect(candidatos.filter({ hasText: "titular ·" })).toHaveCount(0);
  expect(await candidatos.locator(".negrito").allTextContents()).not.toContain(sai);
  const candidato = candidatos.first();
  const entra = (await candidato.locator(".negrito").first().textContent())!.trim();
  await candidato.click();
  await expect(folha.getByRole("heading", { name: "Reservas", exact: true })).toBeVisible();
  await expect(banco).toHaveCount(7);
  const noBanco = await banco.locator(".negrito").allTextContents();
  expect(noBanco).toContain(entra);
  expect(noBanco).not.toContain(sai);
  await folha.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(folha).toHaveCount(0);

  // Vale para a partida: na substituição, ele está entre os que podem entrar (a não ser que alguém tenha se machucado
  // logo no começo e a substituição automática já o tenha posto em campo), e quem saiu do banco não.
  await botao(page, "Começar o jogo").click();
  await page.getByRole("button", { name: "Pausar" }).click();
  const jaEntrou = await entrouNoJogo(page, entra);
  await botao(page, /Substituir/).click();
  await page.getByRole("dialog").locator("button.item").first().click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: /^Quem entra no lugar de / })).toBeVisible();
  const podemEntrar = await page.getByRole("dialog").locator(".lista button.item .negrito").allTextContents();
  if (!jaEntrou) expect(podemEntrar).toContain(entra);
  expect(podemEntrar).not.toContain(sai);
});

test("R55 antes do jogo, embaixo do campinho ficam só Começar o jogo e Voltar ao clube, sem texto", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  const conteudo = page.locator(".tela-cheia .conteudo");
  await expect(conteudo.locator(".campo")).toBeVisible();
  await expect(conteudo.locator("p")).toHaveCount(0);
  await expect(conteudo).not.toContainText("O número é a força");
  await expect(conteudo).not.toContainText("Hoje:");
  const depois = conteudo.locator(".campo ~ *");
  await expect(depois).toHaveCount(2);
  await expect(depois.nth(0)).toHaveText("Começar o jogo");
  await expect(depois.nth(1)).toHaveText("Voltar ao clube");
});
