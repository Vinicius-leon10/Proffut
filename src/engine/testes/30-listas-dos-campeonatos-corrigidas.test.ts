// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { acertarParticipantes, novoJogo } from "../jogo";
import { participantes } from "../torneios";
import { elencoDe } from "../mercado";
import type { EstadoJogo } from "../tipos";


describe("listas dos campeonatos corrigidas (nov/2026)", () => {
  it("save com as listas antigas: ao abrir, entram o Real Oruro e o Anzoátegui, e na próxima temporada os estaduais e as ligas de fora saem certos; quem saiu fica no jogo, sem campeonato", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 21 });
    // Volta o save para as listas antigas: o Jacobina no Baiano e o IN San Juan na liga da Bolívia, sem o Real Oruro e o
    // Anzoátegui (que ainda não existiam).
    const copiar = (de: string, id: string, nome: string, extra: Partial<EstadoJogo["clubes"][string]>) => {
      estado.clubes[id] = { ...structuredClone(estado.clubes[de]), id, nome, ...extra };
      for (const j of elencoDe(estado, de).slice(0, 18)) {
        const novo = { ...structuredClone(j), id: estado.proximoIdJogador++, clubeId: id };
        estado.jogadores[novo.id] = novo;
      }
    };
    copiar("galicia", "jacobina", "Jacobina", { estadual: "BA" });
    copiar("bolivar", "in-san-juan", "IN San Juan", { liga: "BO" });
    for (const id of ["real-oruro", "anzoategui"]) {
      for (const j of elencoDe(estado, id)) delete estado.jogadores[j.id];
      delete estado.clubes[id];
    }
    expect(participantes(estado)["E-BA"]).toContain("jacobina");
    expect(participantes(estado)["L-BO"]).toContain("in-san-juan");

    acertarParticipantes(estado);
    const p = participantes(estado);
    expect(p["E-BA"]).toHaveLength(10);
    expect(p["E-BA"]).not.toContain("jacobina");
    expect(p["L-BO"]).toHaveLength(16);
    expect(p["L-BO"]).toContain("real-oruro");
    expect(p["L-BO"]).not.toContain("in-san-juan");
    expect(p["L-VE"]).toHaveLength(14);
    expect(p["L-VE"]).toContain("anzoategui");
    expect(elencoDe(estado, "real-oruro").length).toBeGreaterThanOrEqual(18);
    expect(elencoDe(estado, "anzoategui").length).toBeGreaterThanOrEqual(18);
    // Quem saiu das listas continua no jogo, com os jogadores, sem estadual nem liga.
    expect(estado.clubes.jacobina.estadual).toBeUndefined();
    expect(estado.clubes["in-san-juan"].liga).toBeUndefined();
    expect(elencoDe(estado, "jacobina")).toHaveLength(18);
    // Sem nada a acertar, nada muda.
    const antes = JSON.stringify(estado);
    acertarParticipantes(estado);
    expect(JSON.stringify(estado)).toBe(antes);
  });
});
