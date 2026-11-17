// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { turnoUnico } from "../calendario";
import { criarRng } from "../rng";

const clubes = Array.from({ length: 20 }, (_, i) => `c${i}`);

describe("mando de campo", () => {
  it("ninguém joga mais de 2 vezes seguidas em casa ou fora no turno", () => {
    const rodadas = turnoUnico(clubes, criarRng(9));
    for (const c of clubes) {
      const seq = rodadas.map((r) => (r.some(([m]) => m === c) ? "C" : "F")).join("");
      expect(seq).not.toMatch(/CCC|FFF/);
    }
  });
});
