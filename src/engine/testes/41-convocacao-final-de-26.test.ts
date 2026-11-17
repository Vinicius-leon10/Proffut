// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularDia } from "../jogo";

describe("convocação final de 26 para a Copa do Mundo (R131)", () => {
  // Pedido do usuário: "Então resolva o 1 e 2" (o 1: "Convocação final de 26 do Modo Copa: lista fechada antes da Copa,
  // com 3 goleiros, troca só por lesão").
  it("cada seleção vai à Copa com 26 (3 goleiros ou mais), a lista não muda durante a Copa e o técnico não mexe nela", { timeout: 300_000 }, async () => {
    const { listaDaCopaFechada } = await import("../selecoes");
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 83 });
    // Técnico do Brasil também: o Avançar para em cada jogo da seleção (o clube para durante a Copa).
    e.tecnico.selecao = "sel-BR";
    const passo = () => {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      return r.tipo;
    };
    const jogoDoBrasilHoje = () => e.partidas.some((p) => p.serie === "S-COPA-2026" && !p.jogada && p.data === e.data && (p.mandante === "sel-BR" || p.visitante === "sel-BR"));
    for (let i = 0; i < 3000 && !jogoDoBrasilHoje(); i++) {
      const r = avancar(e);
      if (r.tipo === "nada") break;
      if (r.tipo === "jogos-hoje" && !jogoDoBrasilHoje()) simularDia(e);
    }
    expect(e.data).toBe("2026-06-11");
    // No dia da estreia: a lista do Brasil está fechada, e as 48 têm a lista final de 26 (3 goleiros ou mais), anunciada no
    // dia da convocação, 10 dias antes da abertura.
    expect(listaDaCopaFechada(e, "sel-BR")).toBe(true);
    const copa = e.selecoes!.competicoes["S-COPA-2026"]!;
    expect(copa.listasFinais).toBe(true);
    const listas = new Map<string, number[]>();
    for (const id of copa.selecoes) {
      const lista = e.selecoes!.convocados[id];
      expect(lista.length, id).toBe(26);
      expect(lista.filter((x) => e.jogadores[x].posicao === "G").length, id).toBeGreaterThanOrEqual(3);
      listas.set(id, [...lista]);
    }
    expect(listas.has("sel-BR")).toBe(true);
    simularDia(e);
    // Depois da estreia a lista do Brasil não muda até o fim da Copa.
    const doBrasil = [...e.selecoes!.convocados["sel-BR"]];
    for (let i = 0; i < 3000 && e.data < "2026-07-20"; i++) {
      if (passo() === "nada") break;
      if (e.data <= "2026-07-19") expect(e.selecoes!.convocados["sel-BR"]).toEqual(doBrasil);
    }
    expect(copa.fase).toBe("encerrada");
  });
});
