// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { turnoEReturno, turnoUnico } from "../calendario";
import { criarRng } from "../rng";

const clubes = Array.from({ length: 20 }, (_, i) => `c${i}`);

describe("calendário", () => {
  it("turno e returno: 38 rodadas, todos se enfrentam duas vezes com mando invertido", () => {
    const rodadas = turnoEReturno(clubes, criarRng(1));
    expect(rodadas).toHaveLength(38);
    const jogos = rodadas.flat();
    expect(jogos).toHaveLength(380);
    for (const r of rodadas) expect(new Set(r.flat()).size).toBe(20);
    const pares = new Set(jogos.map(([a, b]) => `${a}>${b}`));
    expect(pares.size).toBe(380);
    for (const c of clubes) expect(jogos.filter(([m]) => m === c)).toHaveLength(19);
  });

  it("turno único: 19 rodadas, cada par uma vez, mando equilibrado", () => {
    const rodadas = turnoUnico(clubes, criarRng(2));
    expect(rodadas).toHaveLength(19);
    const jogos = rodadas.flat();
    const pares = new Set(jogos.map(([a, b]) => [a, b].sort().join("-")));
    expect(pares.size).toBe(190);
    for (const c of clubes) {
      const casa = jogos.filter(([m]) => m === c).length;
      expect(casa === 9 || casa === 10).toBe(true);
    }
  });
});
