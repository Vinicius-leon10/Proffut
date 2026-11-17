// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { acertarParticipantes, novoJogo } from "../jogo";
import { checarEstado } from "../checagem";
import { participantes } from "../torneios";
import { elencoDe } from "../mercado";
import type { IdTorneio } from "../tipos";


describe("segunda divisão da América do Sul (nov/2026)", () => {
  it("save de antes da 2ª divisão: ao abrir, entram os clubes dela (liga com 2 no fim), com elenco, e a 1ª divisão não muda; depois do acesso e da queda, abrir de novo mantém a divisão de cada clube", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 23 });
    const conmebol = ["AR", "BO", "CL", "CO", "EC", "PY", "PE", "UY", "VE"];
    const daSegunda = Object.values(estado.clubes).filter((c) => c.liga?.endsWith("2") && conmebol.includes(c.pais!)).map((c) => c.id);
    expect(daSegunda.length).toBeGreaterThanOrEqual(9 * 8);
    // Volta o save para antes da segunda divisão: sem os clubes, os torneios e os jogos dela.
    for (const id of daSegunda) {
      for (const j of elencoDe(estado, id)) delete estado.jogadores[j.id];
      delete estado.clubes[id];
    }
    const segunda = (id: string) => /^L-[A-Z]{2}2$/.test(id) && conmebol.includes(id.slice(2, 4));
    for (const id of Object.keys(estado.torneios!)) if (segunda(id)) delete estado.torneios![id as IdTorneio];
    estado.partidas = estado.partidas.filter((x) => !segunda(x.serie));
    const antes = participantes(estado);
    for (const pais of conmebol) expect(antes[`L-${pais}2`], pais).toBeUndefined();

    acertarParticipantes(estado);
    const p = participantes(estado);
    for (const pais of conmebol) {
      expect(p[`L-${pais}`], pais).toEqual(antes[`L-${pais}`]);
      expect(p[`L-${pais}2`]?.length ?? 0, pais).toBeGreaterThanOrEqual(8);
    }
    for (const id of daSegunda) {
      expect(estado.clubes[id]?.liga, id).toMatch(/^[A-Z]{2}2$/);
      expect(elencoDe(estado, id).length, id).toBeGreaterThanOrEqual(18);
    }
    expect(checarEstado(estado).filter((x) => x.gravidade === "erro")).toEqual([]);
    // Depois do acesso e da queda, vale a divisão do save: abrir o jogo de novo não desfaz.
    const [cai, sobe] = [p["L-UY"]![0], p["L-UY2"]![0]];
    estado.clubes[cai].liga = "UY2";
    estado.clubes[sobe].liga = "UY";
    acertarParticipantes(estado);
    expect([estado.clubes[cai].liga, estado.clubes[sobe].liga]).toEqual(["UY2", "UY"]);
  });
});
