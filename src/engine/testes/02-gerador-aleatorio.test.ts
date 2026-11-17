// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { rngPara } from "../rng";

describe("gerador aleatório", () => {
  it("mesma chave, mesma sequência", () => {
    const a = rngPara(42, "x");
    const b = rngPara(42, "x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rngPara(42, "y")()).not.toEqual(rngPara(42, "x")());
  });
});
