import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, jogarPartida, montarSave, novoJogo, test } from "./ajuda";

// Seleções da América (pedido: "Faça 1 e 2", da lista "copas continentais e nacionais" e "seleções"; "traga tudo que tem
// da América ... E a seleção de todos esses países"; e a regra do usuário: "pra ser chamado para ser técnico de qualquer
// seleção tenho que ganhar a liga principal de um país").

/** Abre um save montado pelo motor (tests/saves/selecao.ts). */
async function abrirSave(page: Page, qual: "jogo" | "convite" | "data-fifa" | "europa" | "copa" | "continentais" | "pausa") {
  const save = montarSave("selecao", qual);
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  // No dia da Copa do Mundo, a aba do clube abre com a tela de abertura da Copa (Modo Copa, R117).
  const entrar = page.getByRole("button", { name: "Entrar na Copa", exact: true });
  await expect(cartaoDoProximoJogo(page).or(entrar)).toBeVisible({ timeout: 20_000 });
  if (qual === "copa") await entrar.click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
}

async function abrirSelecoes(page: Page) {
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Seleções" }).click();
}

/** O nome curto do campinho (como em Tatica.tsx). */
const nomeCurto = (nome: string) => {
  if (nome.length <= 12) return nome;
  const partes = nome.split(" ");
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : nome.slice(0, 11) + "…";
};

test("R90 Tabelas → Seleções: o ranking das seleções com as bandeiras (as 51 da América no filtro América, Argentina e Brasil na frente) e os amistosos da data FIFA de março", async ({ page }) => {
  await novoJogo(page);
  await abrirSelecoes(page);
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  await expect(seletor).toHaveValue("ranking");
  const linhas = page.locator("main .lista .item");
  // Todas: as 51 da América, as 55 da Europa (R101) e as 111 da África, Ásia e Oceania (R104).
  await expect(linhas).toHaveCount(217);
  await page.locator("main").getByRole("button", { name: "América", exact: true }).click();
  await expect(linhas).toHaveCount(51);
  await expect(linhas.nth(0)).toContainText("Argentina");
  await expect(linhas.nth(1)).toContainText("Brasil");
  // A bandeira no lugar do escudo.
  await expect(linhas.nth(1).locator("img.escudo")).toHaveAttribute("src", /sel-BR\.png$/);
  await seletor.selectOption({ label: "Amistosos" });
  await expect(page.locator("main")).toContainText("qui, 26 mar 2026");
  await expect(page.locator("main")).toContainText("ter, 31 mar 2026");
  expect(await page.locator("main .jogo-rodada").count()).toBeGreaterThanOrEqual(40);
});

test("R91 Técnico de seleção: o cartão da seleção no Painel, a convocação (tirar um jogador e confirmar) e o jogo da seleção ao vivo, com os convocados", async ({ page }) => {
  test.setTimeout(120_000);
  await abrirSave(page, "jogo");
  // O jogo de hoje é o amistoso do Brasil; o cartão da seleção mostra o mesmo jogo.
  const hoje = page.locator(".cartao", { has: cartaoDoProximoJogo(page) });
  await expect(hoje).toContainText("Amistoso");
  await expect(hoje).toContainText("Brasil");
  const cartao = page.locator(".cartao", { has: page.getByRole("heading", { name: "Seleção: Brasil" }) });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText("no ranking");

  // Convocação: os 26 de verdade; tira o Pedro Morisco e confirma.
  await cartao.getByRole("button", { name: "Convocar", exact: true }).click();
  const tela = page.locator(".tela-cheia");
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Convocação");
  await expect(tela).toContainText("26 convocados");
  const morisco = tela.getByRole("button", { name: /Pedro Morisco/ });
  await expect(morisco).toHaveAttribute("aria-pressed", "true");
  await morisco.click();
  await expect(morisco).toHaveAttribute("aria-pressed", "false");
  await expect(tela).toContainText("25 convocados");
  await tela.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Convocação do Brasil confirmada: 25 jogadores.")).toBeVisible();

  // O jogo da seleção: o Brasil no placar e o Vinícius Júnior (do Real Madrid, fora dos clubes do jogo) no campinho.
  await botao(page, "Ir para o jogo").click();
  await expect(botao(page, "Começar o jogo")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".placar")).toContainText("Brasil");
  await expect(page.locator(".vaga .nome", { hasText: "Vinícius J." })).toBeVisible();
  await expect(page.locator(".vaga .nome", { hasText: "Pedro Morisco" })).toHaveCount(0);
  await botao(page, "Reservas").click();
  await expect(page.getByRole("dialog")).not.toContainText("Pedro Morisco");
  await page.getByRole("dialog").getByRole("button", { name: "Pronto" }).click();
  await botao(page, "Voltar").click();

  // Joga até o fim: o resultado entra nos amistosos.
  await jogarPartida(page);
  await abrirSelecoes(page);
  await page.getByRole("combobox", { name: "Seleções" }).selectOption({ label: "Amistosos" });
  // O Brasil tem dois amistosos na data FIFA (o mais recente, ainda por jogar, vem primeiro): o jogado tem o placar.
  const jogo = page.locator("main .jogo-rodada.meu").filter({ has: page.locator(".r", { hasText: /\d+ x \d+/ }) }).first();
  await expect(jogo).toContainText("Brasil");
});

test("R92 Convite de seleção depois de ganhar a liga principal: aceitar faz do técnico o da seleção, junto com o clube; o outro convite cai", async ({ page }) => {
  test.setTimeout(90_000);
  await abrirSave(page, "convite");
  const convites = page.locator(".cartao", { has: page.getByRole("heading", { name: "Convites para você" }) });
  await expect(convites.locator(".item")).toHaveCount(2);
  const titulo = (await convites.locator(".item").first().locator(".pequeno").first().textContent())!;
  const selecao = titulo.replace(/^Convite (do|da|dos|das|de) /, "");
  page.once("dialog", (d) => d.accept());
  await convites.locator(".item").first().getByRole("button", { name: "Aceitar" }).click();
  await expect(page.getByText(/Você é o técnico/)).toBeVisible();
  await expect(page.getByRole("heading", { name: `Seleção: ${selecao}` })).toBeVisible();
  // Continua no clube, e o outro convite foi recusado.
  await expect(page.locator(".topo")).toContainText("Flamengo");
  await expect(page.getByRole("heading", { name: "Convites para você" })).toHaveCount(0);
});

test("R93 Data FIFA: quem foi convocado aparece com a seleção no elenco (e os jogos por ela na ficha) e fica fora do time do clube até voltar", async ({ page }) => {
  test.setTimeout(90_000);
  await abrirSave(page, "data-fifa");
  await aba(page, "Elenco");
  const comSelo = page.locator("main .item", { has: page.locator(".chip", { hasText: /^Seleção [A-Z]{3}$/ }) });
  expect(await comSelo.count()).toBeGreaterThan(0);
  const nomes = (await comSelo.locator(".negrito").allTextContents()).map((t) => t.trim());
  await comSelo.first().click();
  await expect(page.getByRole("dialog")).toContainText(/Pela seleção: \d+ jogos?/);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  // No jogo do clube, nenhum deles está no campinho.
  await aba(page, "Clube");
  await botao(page, /Ir para o jogo|Avançar/).click();
  await expect(botao(page, "Começar o jogo")).toBeVisible({ timeout: 15_000 });
  const noCampo = (await page.locator(".vaga .nome").allTextContents()).map((t) => t.trim());
  expect(noCampo).toHaveLength(11);
  for (const n of nomes) expect(noCampo, n).not.toContain(nomeCurto(n));
});

// Seleções da Europa (pedido "Vamos começar a Europa" → "Tudo, nessa ordem": seleções, 2ª divisão, outros países; e o
// item "Terminar seleções para Copa do Mundo" da lista à mão, nov/2026).

/** A bandeira da Inglaterra (a da cruz de São Jorge, não a do Reino Unido). */

test("R101 Seleções da Europa: o ranking com o filtro Europa (55 seleções, a Espanha na frente, a Inglaterra com a bandeira dela), a Liga das Nações de 2026 com as 4 ligas e os 14 grupos, e os amistosos de março entre as da Europa", async ({ page }) => {
  await novoJogo(page);
  await abrirSelecoes(page);
  const principal = page.locator("main");
  const linhas = principal.locator(".lista .item");
  // Todas: a Espanha na frente da Argentina.
  await expect(linhas).toHaveCount(217);
  await expect(linhas.nth(0)).toContainText("Espanha");
  await expect(linhas.nth(1)).toContainText("Argentina");
  await principal.getByRole("button", { name: "Europa", exact: true }).click();
  await expect(linhas).toHaveCount(55);
  await expect(linhas.nth(0)).toContainText("Espanha");
  await expect(linhas.nth(0).locator("img.escudo")).toHaveAttribute("src", /sel-ES\.png$/);
  await expect(linhas.nth(1)).toContainText("França");
  await expect(linhas.nth(2)).toContainText("Inglaterra");
  await expect(linhas.nth(2).locator("img.escudo")).toHaveAttribute("src", /sel-EN\.png$/);
  await expect(linhas.nth(54)).toContainText("San Marino");

  // Liga das Nações: a Liga A tem as mais fortes; 14 grupos no seletor, cada um com a tabela e os jogos.
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  await seletor.selectOption({ label: "Liga das Nações 2026" });
  await expect(principal).toContainText("4 ligas (A, B e C com 4 grupos de 4; D com 2 grupos)");
  const grupos = page.getByRole("combobox", { name: "Grupo" });
  await expect(grupos.locator("option")).toHaveCount(14);
  await expect(grupos.locator("option").first()).toHaveText("Liga A · Grupo 1");
  await expect(grupos.locator("option").last()).toHaveText("Liga D · Grupo 2");
  await expect(principal.locator("table tbody tr")).toHaveCount(4);
  // Uma rodada por vez: os 2 jogos da 1ª rodada do grupo, em setembro.
  await expect(principal).toContainText("1ª rodada");
  await expect(principal).toContainText("qui, 03 set");
  await expect(principal.locator(".jogo-rodada")).toHaveCount(2);
  await grupos.selectOption({ label: "Liga D · Grupo 2" });
  await expect(principal.locator("table tbody tr")).toHaveCount(3);

  // Amistosos de março: as da Europa jogam entre si.
  await seletor.selectOption({ label: "Amistosos" });
  const jogos = principal.locator(".jogo-rodada");
  expect(await jogos.count()).toBeGreaterThanOrEqual(90);
  const daEspanha = jogos.filter({ hasText: "Espanha" }).first();
  await expect(daEspanha).toBeVisible();
  for (const americana of ["Brasil", "Argentina", "México", "Estados Unidos", "Uruguai", "Colômbia"]) await expect(daEspanha).not.toContainText(americana);
});

test("R102 Técnico de uma seleção da Europa: o cartão da França no Painel, a convocação de verdade (Kylian Mbappé, do Real Madrid, com a bandeira) e o jogo da França ao vivo com ele no campinho", async ({ page }) => {
  test.setTimeout(120_000);
  await abrirSave(page, "europa");
  const hoje = page.locator(".cartao", { has: cartaoDoProximoJogo(page) });
  await expect(hoje).toContainText("Amistoso");
  await expect(hoje).toContainText("França");
  const cartao = page.locator(".cartao", { has: page.getByRole("heading", { name: "Seleção: França" }) });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText("no ranking");
  await cartao.getByRole("button", { name: "Convocar", exact: true }).click();
  const tela = page.locator(".tela-cheia");
  await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Convocação");
  const mbappe = tela.getByRole("button", { name: /Kylian Mbappé/ });
  await expect(mbappe).toHaveAttribute("aria-pressed", "true");
  await expect(mbappe.locator(".bandeira-jogador")).toHaveAttribute("data-pais", "FR");
  await expect(mbappe).toContainText("Real Madrid");
  await botao(page, "Voltar").click();
  await botao(page, "Ir para o jogo").click();
  await expect(botao(page, "Começar o jogo")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".placar")).toContainText("França");
  await expect(page.locator(".vaga .nome", { hasText: "Kylian M." })).toBeVisible();
});

// Copa do Mundo (pedido, nov/2026: "coloque todos os times que participam de Copa do Mundo, todas as seleções, já com
// jogadores, porque eu quero que deixe a parte de seleções de Copa do Mundo já funcionando").

test("R104 Copa do Mundo: no ranking, os filtros África (54, Marrocos na frente) e Ásia e Oceania (57); a Copa do Mundo de 2026 no seletor com as 42 classificadas, e as repescagens de março (a mundial com Nova Caledônia x Jamaica e Bolívia x Suriname)", async ({ page }) => {
  await novoJogo(page);
  await abrirSelecoes(page);
  const principal = page.locator("main");
  const linhas = principal.locator(".lista .item");
  await principal.getByRole("button", { name: "África", exact: true }).click();
  await expect(linhas).toHaveCount(54);
  await expect(linhas.nth(0)).toContainText("Marrocos");
  await expect(linhas.nth(0).locator("img.escudo")).toHaveAttribute("src", /sel-MA\.png$/);
  await principal.getByRole("button", { name: "Ásia e Oceania", exact: true }).click();
  await expect(linhas).toHaveCount(57);
  await expect(linhas.nth(0)).toContainText("Japão");
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  await seletor.selectOption({ label: "Copa do Mundo 2026" });
  await expect(principal).toContainText("Classificadas (42 de 48, com as sedes)");
  await expect(principal).toContainText("Estados Unidos");
  await expect(principal).toContainText("Japão");
  await seletor.selectOption({ label: "Repescagem mundial (Copa de 2026)" });
  await expect(principal).toContainText("Nova Caledônia");
  await expect(principal).toContainText("Jamaica");
  await expect(principal).toContainText("Suriname");
});

test("R105 Técnico do Brasil na Copa do Mundo de 2026: no dia da estreia, o Painel mostra o jogo da Copa (grupo e rodada) e a Copa nas Tabelas com os 12 grupos", async ({ page }) => {
  test.setTimeout(180_000);
  await abrirSave(page, "copa");
  const hoje = page.locator(".cartao", { has: cartaoDoProximoJogo(page) });
  await expect(hoje).toContainText("Copa do Mundo");
  await expect(hoje).toContainText(/Grupo [A-L] · 1ª rodada/);
  await expect(hoje).toContainText("Brasil");
  await abrirSelecoes(page);
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  await expect(seletor).toHaveValue("S-COPA-2026");
  await expect(page.getByRole("combobox", { name: "Grupo" }).locator("option")).toHaveCount(12);
  await expect(page.locator("main table tbody tr")).toHaveCount(4);
  await expect(page.locator("main")).toContainText("48 seleções em 12 grupos de 4");
});

test("R112 Copa Africana de Nações e Copa da Ásia: em 2027, Tabelas → Seleções tem as duas, com 24 seleções em 6 grupos de 4, as sedes de verdade (Quênia, Uganda e Tanzânia na África; Arábia Saudita na Ásia) e a regra das oitavas", async ({ page }) => {
  test.setTimeout(180_000);
  await abrirSave(page, "continentais");
  await abrirSelecoes(page);
  const principal = page.locator("main");
  const seletor = page.getByRole("combobox", { name: "Seleções" });
  const grupos = page.getByRole("combobox", { name: "Grupo" });

  await seletor.selectOption({ label: "Copa Africana de Nações 2027" });
  await expect(principal).toContainText("24 seleções em 6 grupos de 4");
  await expect(principal).toContainText("os 2 primeiros e os 4 melhores terceiros vão às oitavas");
  await expect(principal).toContainText("Sedes: Quênia, Uganda e Tanzânia");
  await expect(grupos.locator("option")).toHaveCount(6);
  await expect(principal.locator("table tbody tr")).toHaveCount(4);
  // A sede abre o grupo A, em casa.
  await expect(principal.locator("table tbody tr").filter({ hasText: "Quênia" })).toHaveCount(1);
  // Só seleções da África.
  await expect(principal).not.toContainText("Japão");

  await seletor.selectOption({ label: "Copa da Ásia 2027" });
  await expect(principal).toContainText("24 seleções em 6 grupos de 4");
  await expect(principal).toContainText("Sede: Arábia Saudita");
  await expect(grupos.locator("option")).toHaveCount(6);
  await expect(principal.locator("table tbody tr").filter({ hasText: "Arábia Saudita" })).toHaveCount(1);
  // A Copa da Oceania é em 2028 (anos múltiplos de 4).
  await expect(seletor.locator("option", { hasText: "Copa da Oceania" })).toHaveCount(0);
});

test("R115 os clubes param durante a Copa do Mundo: em junho de 2026, logo antes da abertura (11 de junho), o próximo jogo do Flamengo no painel é depois da final (19 de julho)", async ({ page }) => {
  test.setTimeout(180_000);
  const save = montarSave("selecao", "pausa");
  const estado = JSON.parse(save).estado as { partidas: { mandante: string; visitante: string; data: string; jogada: boolean; serie: string }[] };
  // No save: nenhum jogo de clube marcado na janela da Copa, e o próximo do Flamengo vem depois dela.
  const naCopa = estado.partidas.filter((p) => !p.serie.startsWith("S-") && p.data >= "2026-06-11" && p.data <= "2026-07-19");
  expect(naCopa.map((p) => `${p.serie} ${p.data}`)).toEqual([]);
  const proximo = estado.partidas.filter((p) => !p.jogada && (p.mandante === "flamengo" || p.visitante === "flamengo")).sort((a, b) => a.data.localeCompare(b.data))[0];
  expect(proximo.data > "2026-07-19").toBe(true);
  // Na tela: o painel mostra a data desse jogo ("qua, 22 jul").
  await abrirSave(page, "pausa");
  const [, mes, dia] = proximo.data.split("-").map(Number);
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const texto = `${dias[new Date(Date.UTC(2026, mes - 1, dia)).getUTCDay()]}, ${String(dia).padStart(2, "0")} ${meses[mes - 1]}`;
  await expect(page.locator(".cartao", { has: cartaoDoProximoJogo(page) })).toContainText(texto);
});
