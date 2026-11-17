// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";


describe("escalação depois da virada", () => {
  it("só tem jogadores que continuam no clube", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "gremio", semente: 13 });
    simularRestoDaTemporada(estado);
    avancar(estado);
    for (const c of Object.values(estado.clubes)) {
      // A escalação das seleções é dos convocados (jogadores dos clubes).
      if (c.serie === "selecao") continue;
      for (const id of [...c.escalacao.titulares, ...c.escalacao.reservas]) {
        if (id != null) expect(estado.jogadores[id]?.clubeId).toBe(c.id);
      }
    }
  });
});
