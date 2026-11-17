// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, prepararJogos, provavelTime } from "../jogo";

describe("time do adversário antes do jogo", () => {
  it("o provável time titular é o mesmo que entra em campo, e olhar não muda o jogo", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 61 });
    avancar(estado);
    const antes = JSON.stringify(estado.clubes);
    const pv = prepararJogos(structuredClone(estado)).find((x) => x.lados.some((l) => l.clubeId === "ponte-preta"))!;
    const ele = pv.lados.find((l) => l.clubeId !== "ponte-preta")!;
    const provavel = provavelTime(estado, ele.clubeId);
    expect(JSON.stringify(estado.clubes)).toBe(antes);
    expect(provavel.emCampo).toHaveLength(11);
    expect(provavel.emCampo.map((a) => a.jogadorId)).toEqual(ele.emCampo.map((a) => a.jogadorId));
    expect(provavel.tatica.formacao).toBe(ele.tatica.formacao);
  });
});
