// R139: janelas de transferência e limite de estrangeiros como no mundo real (pedido do usuário, 19/nov/2026: "Faça a
// pesquisa das janelas de transferência e a quantidade de estrangeiros por time" e "Faça"; pesquisa em
// docs/PESQUISA_JANELAS_E_ESTRANGEIROS.md).
import { describe, expect, it } from "vitest";
import { pegarEmprestado } from "../emprestimos";
import { novoJogo } from "../jogo";
import { elencoDe, fazerOferta, livres, transferenciasDaIa } from "../mercado";
import { estrangeirosNoElenco, janelaAberta, limiteDeEstrangeiros } from "../regras";

const reservaDeOutro = (estado: ReturnType<typeof novoJogo>, clubeId: string) =>
  elencoDe(estado, clubeId).filter((j) => !estado.clubes[clubeId].escalacao.titulares.includes(j.id)).sort((a, b) => a.salario - b.salario)[0];

describe("janelas e estrangeiros (R139)", () => {
  it("janela: no Brasil abre de janeiro a março e de julho ao começo de setembro", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const c = estado.clubes.confianca;
    expect(janelaAberta("2026-01-03", c)).toBe(true);
    expect(janelaAberta("2026-03-31", c)).toBe(true);
    expect(janelaAberta("2026-05-10", c)).toBe(false);
    expect(janelaAberta("2026-07-20", c)).toBe(true);
    expect(janelaAberta("2026-10-01", c)).toBe(false);
  });

  it("janela fechada: não compra nem pega emprestado, mas o livre assina", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    meu.caixa = 50_000_000;
    estado.data = "2026-05-10";
    const alvo = reservaDeOutro(estado, "brusque");
    const r = fazerOferta(estado, alvo.id, 50_000_000);
    expect(r.ok).toBe(false);
    expect(r.texto).toMatch(/janela de transferências está fechada/);
    expect(alvo.clubeId).toBe("brusque");
    const e = pegarEmprestado(estado, reservaDeOutro(estado, "caxias").id);
    expect(e.ok).toBe(false);
    expect(e.texto).toMatch(/janela/);
    const livre = livres(estado).sort((a, b) => a.salario - b.salario)[0];
    expect(fazerOferta(estado, livre.id, 0).ok).toBe(true);
  });

  it("estrangeiros: no Brasil, até 9 no elenco; o 10º não assina", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    meu.caixa = 500_000_000;
    expect(limiteDeEstrangeiros(meu)).toBe(9);
    // Deixa o elenco com 9 estrangeiros (troca a nacionalidade dos reservas mais baratos).
    const elenco = elencoDe(estado, meu.id).sort((a, b) => a.salario - b.salario);
    for (const j of elenco) if (estrangeirosNoElenco(estado, meu) < 9 && j.nacionalidade === "BRA") j.nacionalidade = "ARG";
    expect(estrangeirosNoElenco(estado, meu)).toBe(9);
    const livre = livres(estado).sort((a, b) => a.salario - b.salario)[0];
    livre.nacionalidade = "URU";
    const r = fazerOferta(estado, livre.id, 0);
    expect(r.ok).toBe(false);
    expect(r.texto).toMatch(/9 estrangeiros/);
    livre.nacionalidade = "BRA";
    expect(fazerOferta(estado, livre.id, 0).ok).toBe(true);
  });

  it("Espanha conta só quem é de fora da União Europeia (até 3)", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const sevilla = estado.clubes.sevilla;
    expect(limiteDeEstrangeiros(sevilla)).toBe(3);
    const um = elencoDe(estado, "sevilla")[0];
    const antes = estrangeirosNoElenco(estado, sevilla);
    const nac = um.nacionalidade;
    um.nacionalidade = "FRA";
    const comFrances = estrangeirosNoElenco(estado, sevilla);
    um.nacionalidade = "BRA";
    const comBrasileiro = estrangeirosNoElenco(estado, sevilla);
    um.nacionalidade = nac;
    expect(comBrasileiro - comFrances).toBe(1);
    expect(antes).toBeGreaterThanOrEqual(0);
  });

  it("o computador também respeita o limite de estrangeiros", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    estado.data = "2026-07-01";
    const series = Object.values(estado.clubes).filter((c) => ["A", "B", "C", "D"].includes(c.serie));
    const antes = new Map(series.map((c) => [c.id, estrangeirosNoElenco(estado, c)]));
    // Um clube da A já no limite: o computador não pode trazer mais um estrangeiro para ele.
    for (const c of series) {
      const limite = limiteDeEstrangeiros(c)!;
      for (const j of elencoDe(estado, c.id)) if (estrangeirosNoElenco(estado, c) < limite && j.nacionalidade === "BRA") j.nacionalidade = "ARG";
      antes.set(c.id, estrangeirosNoElenco(estado, c));
    }
    for (let i = 0; i < 6; i++) transferenciasDaIa(estado, `teste-${i}`);
    for (const c of series) expect(estrangeirosNoElenco(estado, c), c.id).toBeLessThanOrEqual(Math.max(antes.get(c.id)!, limiteDeEstrangeiros(c)!));
  });
});
