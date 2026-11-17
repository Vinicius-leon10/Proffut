// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { MAX_SUBSTITUICOES } from "../constantes";
import { avancar, novoJogo, prepararJogos } from "../jogo";
import { avancarMinuto, simularAteOFim, substituir } from "../partida";


describe("partida", () => {
  it("termina, respeita o limite de substituições e registra o placar", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 3 });
    avancar(estado);
    const vivas = prepararJogos(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const lado = pv.lados[0].clubeId === "flamengo" ? 0 : 1;
    for (let i = 0; i < 10; i++) avancarMinuto(pv, estado.jogadores);
    for (let i = 0; i < MAX_SUBSTITUICOES; i++) {
      const sai = pv.lados[lado].emCampo[i + 1].jogadorId;
      expect(substituir(pv, lado, sai, pv.lados[lado].banco[0], estado.jogadores)).toBeNull();
    }
    const ultimo = pv.lados[lado].banco[0];
    if (ultimo != null) expect(substituir(pv, lado, pv.lados[lado].emCampo[1].jogadorId, ultimo, estado.jogadores)).toMatch(/substituições/);
    simularAteOFim(pv, estado.jogadores);
    expect(pv.terminada).toBe(true);
    expect(pv.minuto).toBeGreaterThanOrEqual(90);
  });
});
