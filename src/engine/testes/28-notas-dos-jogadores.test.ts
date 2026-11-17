// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { melhorEmCampo, notaMedia, notasDaPartida } from "../notas";
import { avancar, novoJogo, prepararJogos, simularDia } from "../jogo";
import { simularAteOFim } from "../partida";


describe("notas dos jogadores", () => {
  const partidasDoDia = (semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    avancar(estado);
    const vivas = prepararJogos(estado);
    for (const pv of vivas) simularAteOFim(pv, estado.jogadores);
    return { estado, vivas };
  };

  it("todo mundo que entrou tem nota de 3 a 10 com uma casa; o melhor em campo tem a maior nota com 30 minutos ou mais", () => {
    const { estado, vivas } = partidasDoDia(61);
    for (const pv of vivas) {
      const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
      const jogaram = pv.lados.flatMap((l) => l.jogaram);
      expect(notas.map((n) => n.jogadorId).sort()).toEqual([...jogaram].sort());
      for (const n of notas) {
        expect(n.nota).toBeGreaterThanOrEqual(3);
        expect(n.nota).toBeLessThanOrEqual(10);
        expect(Math.round(n.nota * 10)).toBeCloseTo(n.nota * 10, 6);
        expect(n.minutos).toBeGreaterThanOrEqual(1);
        expect(n.minutos).toBeLessThanOrEqual(90);
      }
      const melhor = melhorEmCampo(notas)!;
      for (const n of notas.filter((x) => x.minutos >= 30)) expect(melhor.nota).toBeGreaterThanOrEqual(n.nota);
      // Mesma partida, mesmas notas (sorteio próprio, sem mudar o jogo).
      expect(notasDaPartida(pv, estado.jogadores, estado.semente)).toEqual(notas);
    }
  });

  it("quem faz gol tem, em média, nota maior; quem perde, menor; a média geral fica perto de 6,7", () => {
    const todas: number[] = [], comGol: number[] = [], derrotados: number[] = [];
    for (const semente of [62, 63]) {
      const { estado, vivas } = partidasDoDia(semente);
      for (const pv of vivas) {
        for (const n of notasDaPartida(pv, estado.jogadores, estado.semente)) {
          if (n.minutos < 60) continue;
          todas.push(n.nota);
          if (pv.narracao.some((e) => (e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador === n.jogadorId)) comGol.push(n.nota);
          if (pv.lados[n.lado].gols < pv.lados[n.lado === 0 ? 1 : 0].gols) derrotados.push(n.nota);
        }
      }
    }
    const media = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    expect(media(todas)).toBeGreaterThan(6.4);
    expect(media(todas)).toBeLessThan(7.1);
    expect(media(comGol)).toBeGreaterThan(media(todas) + 0.6);
    expect(media(derrotados)).toBeLessThan(media(todas) - 0.2);
  });

  it("depois do dia, a nota de cada um entra na média da temporada e o melhor em campo fica na partida", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 64 });
    avancar(estado);
    const vivas = simularDia(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
    for (const n of notas) {
      const t = estado.jogadores[n.jogadorId].temporada;
      expect(t.avaliados).toBe(1);
      expect(notaMedia(t)).toBe(n.nota);
    }
    expect(estado.partidas.find((p) => p.id === pv.partidaId)!.melhor).toBe(melhorEmCampo(notas)!.jogadorId);
  });
});
