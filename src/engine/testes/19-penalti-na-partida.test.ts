// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, prepararJogos } from "../jogo";
import { simularAteOFim } from "../partida";


describe("pênalti na partida", () => {
  it("é marcado num minuto e cobrado no minuto seguinte, sempre antes do fim do tempo", () => {
    const minuto = (m: string) => m.split("+").reduce((a, b) => a + Number(b), 0);
    let marcados = 0;
    for (const semente of [41, 42, 43]) {
      const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
      avancar(estado);
      for (const pv of prepararJogos(estado)) {
        simularAteOFim(pv, estado.jogadores);
        const n = pv.narracao;
        const cobrancas = n.filter((e) => e.tipo === "gol-penalti" || e.tipo === "penalti-perdido").length;
        expect(n.filter((e) => e.tipo === "penalti").length, "cada pênalti marcado é cobrado").toBe(cobrancas);
        n.forEach((e, i) => {
          if (e.tipo !== "penalti") return;
          marcados++;
          const k = n.findIndex((x, j) => j > i && (x.tipo === "gol-penalti" || x.tipo === "penalti-perdido"));
          expect(n.slice(i + 1, k).some((x) => x.tipo === "intervalo" || x.tipo === "fim"), "o tempo não acaba antes da cobrança").toBe(false);
          expect(n[k].lado).toBe(e.lado);
          expect(minuto(n[k].min)).toBe(minuto(e.min) + 1);
        });
      }
    }
    expect(marcados).toBeGreaterThan(0);
  });
});
