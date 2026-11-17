// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { elencoDe } from "../mercado";


describe("checagem do save", () => {
  it("um jogo novo passa sem problemas e a partida de teste roda sem mexer no save", async () => {
    const { checarEstado, testarPartida } = await import("../checagem");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 21 });
    expect(checarEstado(estado)).toEqual([]);
    const antes = JSON.stringify(estado);
    expect(testarPartida(estado).ok).toBe(true);
    expect(JSON.stringify(estado)).toBe(antes);
  });

  it("encontra e corrige problemas", async () => {
    const { checarEstado, repararEstado } = await import("../checagem");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 22 });
    const [a, b] = elencoDe(estado, "bahia");
    a.clubeId = "clube-que-nao-existe";
    b.energia = Number.NaN;
    estado.clubes.bahia.escalacao.titulares[0] = 999_999;
    estado.proximoIdJogador = 1;
    const problemas = checarEstado(estado);
    expect(problemas.length).toBeGreaterThanOrEqual(4);
    expect(problemas.every((p) => p.reparavel)).toBe(true);
    expect(repararEstado(estado).length).toBeGreaterThan(0);
    expect(checarEstado(estado)).toEqual([]);
  });
});
