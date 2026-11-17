// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { classificacao } from "../competicoes";
import type { EstadoJogo, Partida } from "../tipos";

function partida(mandante: string, visitante: string, gm: number, gv: number): Partida {
  return { id: `${mandante}${visitante}`, serie: "A", fase: "liga", rodada: 1, data: "2026-04-04", mandante, visitante, jogada: true, gm, gv, eventos: [] };
}

describe("classificação", () => {
  it("desempata por vitórias, saldo, gols pró e confronto direto", () => {
    const estado = { semente: 1, temporada: 2026, partidas: [
      partida("a", "b", 2, 0), // a vence b
      partida("b", "c", 1, 0),
      partida("c", "a", 1, 0),
      partida("d", "e", 0, 0),
      partida("e", "d", 0, 0),
    ] } as unknown as EstadoJogo;
    const t = classificacao(estado, "A", "liga", ["a", "b", "c", "d", "e"]);
    // a, b e c têm 3 pontos e 1 vitória; a tem saldo +1, b 0 (1-2), c 0 (1-1)... c tem mais gols pró que b? não: b 1, c 1.
    expect(t[0].clubeId).toBe("a");
    expect(t.map((l) => l.pts)).toEqual([3, 3, 3, 2, 2]);
    expect(t.map((l) => l.pos)).toEqual([1, 2, 3, 4, 5]);
  });
});
