// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { forcaDoTime } from "../forca";
import { novoJogo } from "../jogo";
import { elencoDe } from "../mercado";
import { criarRng } from "../rng";



describe("menos zebras (R126)", () => {
  // Pedido do usuário: "os jogadores relatam partidas aleatórias demais (time muito mais forte perdendo ou empatando com
  // frequência; um time da Série A empatar com um da Série D tem de ser bem raro)".
  it("time bem mais forte (20 pontos de força a mais) vence quase sempre, na simulação completa e na rápida", { timeout: 120_000 }, async () => {
    const { montarLado, iniciarPartida, simularAteOFim } = await import("../partida");
    const { placarRapido } = await import("../rapida");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 5 });
    const forca = (id: string) => forcaDoTime(elencoDe(estado, id));
    // Vários pares de clubes das séries com 17 a 23 pontos de força de diferença (um par só dependia demais dos dois elencos).
    const clubes = Object.values(estado.clubes).filter((c) => ["A", "B", "C", "D"].includes(c.serie as string) && elencoDe(estado, c.id).length >= 18);
    const f = new Map(clubes.map((c) => [c.id, forca(c.id)]));
    const pares: [string, string][] = [];
    for (const a of clubes) {
      if (pares.length >= 8) break;
      const b = clubes.find((x) => f.get(a.id)! - f.get(x.id)! >= 17 && f.get(a.id)! - f.get(x.id)! <= 23 && !pares.some((p) => p.includes(x.id)));
      if (b && !pares.some((p) => p.includes(a.id))) pares.push([a.id, b.id]);
    }
    expect(pares.length).toBeGreaterThanOrEqual(6);
    let v = 0, e = 0, n = 0;
    for (const [k0, [forte, fraco]] of pares.entries()) {
      for (let k = 0; k < 50; k++) {
        const [m, vi] = k % 2 ? [forte, fraco] : [fraco, forte];
        const p = { id: `z${k0}-${k}`, mandante: m, visitante: vi, data: estado.data, serie: "A", rodada: 1, jogada: false, gm: 0, gv: 0 } as never;
        const pv = iniciarPartida(p, montarLado(estado.clubes[m], estado.jogadores, elencoDe(estado, m), false),
          montarLado(estado.clubes[vi], estado.jogadores, elencoDe(estado, vi), false), criarRng(7000 + k0 * 100 + k));
        simularAteOFim(pv, estado.jogadores);
        const [gf, gc] = m === forte ? [pv.lados[0].gols, pv.lados[1].gols] : [pv.lados[1].gols, pv.lados[0].gols];
        n++;
        if (gf > gc) v++; else if (gf === gc) e++;
      }
    }
    expect(v / n).toBeGreaterThan(0.85); // antes do ajuste: ~80%
    expect(e / n).toBeLessThan(0.12);
    // A simulação rápida (os jogos que o usuário só acompanha) segue a mesma régua.
    let vr = 0;
    for (let k = 0; k < 2000; k++) {
      const [gm, gv] = placarRapido(criarRng(9000 + k), 80, 60, k % 2 === 0);
      if (gm > gv) vr++;
    }
    expect(vr / 2000).toBeGreaterThan(0.82);
  });
});
