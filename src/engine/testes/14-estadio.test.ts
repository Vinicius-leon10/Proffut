// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";

describe("estádio", () => {
  it("ampliação e modernização: custo, obra e entrega", async () => {
    const { ampliarEstadio, modernizarEstadio, concluirObras, custoAmpliacao, impactoModernizacao } = await import("../estadio");
    const { somarDias } = await import("../calendario");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 31 });
    const clube = estado.clubes.vasco;
    clube.caixa = 100_000_000;
    const capacidade = clube.estadio.capacidade;
    expect(ampliarEstadio(estado, 100_000).ok).toBe(false); // passa do limite
    const r = ampliarEstadio(estado, 2_000);
    expect(r.ok).toBe(true);
    expect(clube.caixa).toBe(100_000_000 - custoAmpliacao(clube, 2_000));
    expect(modernizarEstadio(estado).ok).toBe(false); // já tem obra
    concluirObras(estado, somarDias(estado.data, 7));
    expect(clube.estadio.capacidade).toBe(capacidade); // ainda em obra
    concluirObras(estado, clube.estadio.obra!.terminaEm);
    expect(clube.estadio.capacidade).toBe(capacidade + 2_000);
    expect(clube.estadio.obra).toBeUndefined();
    expect(impactoModernizacao(clube).publicoDepois).toBeGreaterThanOrEqual(impactoModernizacao(clube).publicoAntes);
    expect(modernizarEstadio(estado).ok).toBe(true);
    concluirObras(estado, clube.estadio.obra!.terminaEm);
    expect(clube.estadio.conforto).toBe(1);
  });

  it("sem dinheiro não começa a obra", async () => {
    const { ampliarEstadio } = await import("../estadio");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 32 });
    estado.clubes.brusque.caixa = 1_000;
    expect(ampliarEstadio(estado, 2_000).ok).toBe(false);
    expect(estado.clubes.brusque.estadio.obra).toBeUndefined();
  });

  it("nível da imagem do estádio pela capacidade (R122)", async () => {
    const { nivelDoEstadio, CAPACIDADE_MAXIMA } = await import("../estadio");
    const casos: [number, number][] = [[0, 1], [3_000, 1], [3_001, 2], [8_000, 2], [8_001, 3], [15_000, 3], [25_000, 4],
      [25_001, 5], [40_000, 5], [55_000, 6], [70_000, 7], [70_001, 8], [CAPACIDADE_MAXIMA, 8], [200_000, 8]];
    for (const [capacidade, nivel] of casos) expect(nivelDoEstadio(capacidade).nivel, String(capacidade)).toBe(nivel);
    expect(nivelDoEstadio(2_500).proximo).toBe(3_001);
    expect(nivelDoEstadio(75_000)).toEqual({ nivel: 8, nome: "Estádio de Copa", proximo: null });
    // todo clube do jogo cai num dos 8 níveis
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 33 });
    for (const c of Object.values(estado.clubes)) {
      const n = nivelDoEstadio(c.estadio.capacidade).nivel;
      expect(n >= 1 && n <= 8, c.id).toBe(true);
    }
  });
});
