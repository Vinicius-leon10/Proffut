// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularDia } from "../jogo";
import { fazerOferta } from "../mercado";
import { exportarTexto, importarTexto } from "../../save/salvamento";

describe("mercado e save", () => {
  it("compra respeita o caixa e o save vai e volta do arquivo", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 5 });
    const caro = Object.values(estado.jogadores).filter((j) => j.clubeId === "flamengo").sort((a, b) => b.forca - a.forca)[0];
    const r = fazerOferta(estado, caro.id, estado.clubes.brusque.caixa + 1);
    expect(r.ok).toBe(false);
    avancar(estado);
    simularDia(estado);
    const volta = importarTexto(exportarTexto(estado));
    expect(volta.data).toBe(estado.data);
    expect(Object.keys(volta.jogadores)).toHaveLength(Object.keys(estado.jogadores).length);
    expect(() => importarTexto("{}")).toThrow();
  });

  it("save de antes de tirar a velocidade 4x abre em 2x", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 6 });
    (estado.config as { velocidade: number }).velocidade = 4;
    expect(importarTexto(exportarTexto(estado)).config.velocidade).toBe(2);
  });
});
