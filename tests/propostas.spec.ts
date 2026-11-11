import type { Page } from "@playwright/test";
import { aba, cartaoDoProximoJogo, esperarInteiroNaTela, esperarSalvar, expect, novoJogo, test } from "./ajuda";

/** O nome exato, para achar a linha do jogador ("Pedro" está em "João Pedro"). */
const exato = (nome: string) => new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/** Coloca no save do aparelho uma proposta do Flamengo por um meia do usuário e abre o jogo de novo. */
async function receberProposta(page: Page, valor: number) {
  const nome = await page.evaluate(
    (valor) =>
      new Promise<string>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const saves = banco.transaction("saves", "readwrite").objectStore("saves");
          const leitura = saves.get("jogo:auto");
          leitura.onsuccess = () => {
            const estado = leitura.result;
            const meus = Object.values(estado.jogadores as Record<string, { id: number; nome: string; clubeId: string; posicao: string }>)
              .filter((j) => j.clubeId === estado.tecnico.clubeId && j.posicao === "M");
            const j = meus[meus.length - 1];
            estado.mensagens.unshift({
              id: estado.proximoIdMensagem++, data: estado.data, tipo: "proposta", lida: false,
              titulo: `Proposta por ${j.nome}`, texto: `O Flamengo oferece R$ ${valor.toLocaleString("pt-BR")} por ${j.nome}.`,
              proposta: { jogadorId: j.id, clubeId: "flamengo", valor, validaAte: "2026-12-31" },
            });
            const escrita = saves.put(estado, "jogo:auto");
            escrita.onsuccess = () => { banco.close(); ok(j.nome); };
            escrita.onerror = () => falha(escrita.error);
          };
        };
      }),
    valor,
  );
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  return nome;
}

test("R20 numa proposta por um jogador meu, dá para pedir mais e vender pelo valor pedido", async ({ page }) => {
  // O save de qualquer momento desde o começo do teste (com "os últimos 5 s", numa máquina lenta o save de 20 MB do jogo
  // novo já era mais velho que isso quando o jogo novo terminava, e a espera não acabava: falhou no GitHub, nov/2026).
  const inicio = Date.now();
  await novoJogo(page);
  await esperarSalvar(page, inicio);
  const nome = await receberProposta(page, 1_000_000);

  // A proposta fica em Mercado → Meus à venda, embaixo do jogador (saiu do painel do Clube, R63).
  await aba(page, "Mercado");
  const proposta = page.locator("main .a-venda").filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  await esperarInteiroNaTela(page, proposta.getByRole("button", { name: "Pedir mais" }));
  await proposta.getByRole("button", { name: "Pedir mais" }).click();

  const ficha = page.getByRole("dialog");
  await expect(ficha.getByRole("heading").first()).toHaveText(`Pedir mais por ${nome}`);
  await ficha.getByRole("button", { name: "+5%" }).click();
  const pedir = ficha.getByRole("button", { name: "Pedir R$ 1.050.000" });
  await esperarInteiroNaTela(page, pedir);
  await pedir.click();

  // Até 5% a mais o clube sempre aceita: a venda sai pelo valor pedido.
  await expect(page.locator(".aviso")).toContainText(`O Flamengo aceitou pagar R$ 1.050.000. ${nome} foi vendido.`);
  await expect(proposta).toHaveCount(0);
  await aba(page, "Elenco");
  await expect(page.locator(".lista .item .negrito").filter({ hasText: new RegExp(`^${nome}$`) })).toHaveCount(0);
});

test("R62 em Mercado, Meus à venda mostra quem tem proposta (clube, valor e prazo), primeiro na lista, e dá para aceitar, pedir mais ou recusar ali mesmo", async ({ page }) => {
  // O save de qualquer momento desde o começo do teste (com "os últimos 5 s", numa máquina lenta o save de 20 MB do jogo
  // novo já era mais velho que isso quando o jogo novo terminava, e a espera não acabava: falhou no GitHub, nov/2026).
  const inicio = Date.now();
  await novoJogo(page);
  await esperarSalvar(page, inicio);
  // Três meias à venda: um com proposta do Flamengo, outro com proposta do Palmeiras e o mais forte sem proposta.
  const [doFlamengo, doPalmeiras, semProposta] = await page.evaluate(
    () =>
      new Promise<string[]>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const saves = banco.transaction("saves", "readwrite").objectStore("saves");
          const leitura = saves.get("jogo:auto");
          leitura.onsuccess = () => {
            const estado = leitura.result;
            type J = { id: number; nome: string; clubeId: string; posicao: string; forca: number; aVenda?: boolean };
            const meias = Object.values(estado.jogadores as Record<string, J>)
              .filter((j) => j.clubeId === estado.tecnico.clubeId && j.posicao === "M")
              .sort((a, b) => a.forca - b.forca);
            const [a, b, c] = meias;
            for (const j of [a, b, c]) j.aVenda = true;
            c.forca = 99;
            const proposta = (j: J, clubeId: string, clube: string, valor: number) =>
              estado.mensagens.unshift({
                id: estado.proximoIdMensagem++, data: estado.data, tipo: "proposta", lida: false,
                titulo: `Proposta por ${j.nome}`, texto: `O ${clube} oferece R$ ${valor.toLocaleString("pt-BR")} por ${j.nome}.`,
                proposta: { jogadorId: j.id, clubeId, valor, validaAte: "2026-12-31" },
              });
            proposta(a, "flamengo", "Flamengo", 1_000_000);
            proposta(b, "palmeiras", "Palmeiras", 800_000);
            const escrita = saves.put(estado, "jogo:auto");
            escrita.onsuccess = () => { banco.close(); ok([a.nome, b.nome, c.nome]); };
            escrita.onerror = () => falha(escrita.error);
          };
        };
      }),
  );
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Meus à venda" }).click();

  const vendas = page.locator("main .a-venda");
  const nomeExato = (nome: string) => new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const linha = (nome: string) => vendas.filter({ has: page.locator(".negrito", { hasText: nomeExato(nome) }) });
  await expect(vendas).toHaveCount(3);
  // Quem tem proposta vem primeiro, mesmo sendo mais fraco.
  const nomes = (await vendas.locator(".item .negrito").allTextContents()).map((n) => n.trim());
  expect(nomes.slice(0, 2).sort()).toEqual([doFlamengo, doPalmeiras].sort());
  expect(nomes[2]).toBe(semProposta);
  // A proposta: o clube, o valor e até quando vale, com os botões.
  await expect(linha(doFlamengo)).toContainText("Proposta do Flamengo: R$ 1,00 mi");
  await expect(linha(doFlamengo)).toContainText("vale até");
  for (const acao of ["Aceitar", "Pedir mais", "Recusar"]) await expect(linha(doFlamengo).getByRole("button", { name: acao })).toBeVisible();
  await expect(linha(semProposta)).toContainText("Sem proposta por enquanto");
  await expect(linha(semProposta).getByRole("button", { name: "Aceitar" })).toHaveCount(0);

  // Pedir mais abre a mesma ficha das mensagens.
  await linha(doPalmeiras).getByRole("button", { name: "Pedir mais" }).click();
  await expect(page.getByRole("dialog").getByRole("heading").first()).toHaveText(`Pedir mais por ${doPalmeiras}`);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  // Recusando, a proposta sai e ele continua à venda.
  await linha(doPalmeiras).getByRole("button", { name: "Recusar" }).click();
  await expect(page.locator(".aviso")).toContainText("Proposta recusada.");
  await expect(linha(doPalmeiras)).toContainText("Sem proposta por enquanto");
  // Aceitando, ele é vendido e sai da lista.
  await linha(doFlamengo).getByRole("button", { name: "Aceitar" }).click();
  await expect(page.locator(".aviso")).toContainText(`${doFlamengo} foi vendido ao Flamengo`);
  await expect(linha(doFlamengo)).toHaveCount(0);
  await expect(vendas).toHaveCount(2);
});

test("R63 as propostas saem do painel do Clube: o Mercado, na barra de baixo, mostra quantas há e abre Meus à venda com elas, até a de quem não estava à venda", async ({ page }) => {
  // O save de qualquer momento desde o começo do teste (com "os últimos 5 s", numa máquina lenta o save de 20 MB do jogo
  // novo já era mais velho que isso quando o jogo novo terminava, e a espera não acabava: falhou no GitHub, nov/2026).
  const inicio = Date.now();
  await novoJogo(page);
  await esperarSalvar(page, inicio);
  // Duas propostas: por um meia à venda e por um zagueiro que não estava à venda.
  const [aVenda, foraDaVenda] = await page.evaluate(
    () =>
      new Promise<string[]>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const saves = banco.transaction("saves", "readwrite").objectStore("saves");
          const leitura = saves.get("jogo:auto");
          leitura.onsuccess = () => {
            const estado = leitura.result;
            type J = { id: number; nome: string; clubeId: string; posicao: string; forca: number; aVenda?: boolean };
            const meus = (pos: string) => Object.values(estado.jogadores as Record<string, J>)
              .filter((j) => j.clubeId === estado.tecnico.clubeId && j.posicao === pos)
              .sort((a, b) => a.forca - b.forca);
            const [meia] = meus("M");
            const [zagueiro] = meus("Z");
            meia.aVenda = true;
            for (const [j, clubeId, clube] of [[meia, "flamengo", "Flamengo"], [zagueiro, "palmeiras", "Palmeiras"]] as const) {
              estado.mensagens.unshift({
                id: estado.proximoIdMensagem++, data: estado.data, tipo: "proposta", lida: false,
                titulo: `Proposta por ${j.nome}`, texto: `O ${clube} oferece R$ 900.000 por ${j.nome}.`,
                proposta: { jogadorId: j.id, clubeId, valor: 900_000, validaAte: "2026-12-31" },
              });
            }
            const escrita = saves.put(estado, "jogo:auto");
            escrita.onsuccess = () => { banco.close(); ok([meia.nome, zagueiro.nome]); };
            escrita.onerror = () => falha(escrita.error);
          };
        };
      }),
  );
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // No painel do Clube, nada de propostas.
  await expect(page.getByRole("heading", { name: "Propostas recebidas" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(`Proposta por ${aVenda}`);
  // Na barra de baixo, o Mercado avisa quantas propostas há.
  const mercado = page.locator("nav").getByRole("button", { name: /^Mercado/ });
  await expect(mercado).toHaveAccessibleName("Mercado, 2 propostas");
  await expect(mercado.locator(".selo-numero")).toHaveText("2");

  // Tocando, o Mercado abre em Meus à venda, com as duas propostas.
  await mercado.click();
  await expect(page.getByRole("tab", { name: /Meus à venda/ })).toHaveAttribute("aria-selected", "true");
  const vendas = page.locator("main .a-venda");
  const linha = (nome: string) => vendas.filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  await expect(vendas).toHaveCount(2);
  await expect(linha(foraDaVenda)).toContainText("Ele não estava à venda");
  await expect(linha(aVenda)).not.toContainText("não estava à venda");

  // Respondendo, o aviso diminui e some; quem não estava à venda sai da lista.
  await linha(aVenda).getByRole("button", { name: "Recusar" }).click();
  await expect(mercado).toHaveAccessibleName("Mercado, 1 proposta");
  await linha(foraDaVenda).getByRole("button", { name: "Recusar" }).click();
  await expect(mercado).toHaveAccessibleName("Mercado");
  await expect(mercado.locator(".selo-numero")).toHaveCount(0);
  await expect(vendas).toHaveCount(1);
  await expect(linha(aVenda)).toContainText("Sem proposta por enquanto");
});
