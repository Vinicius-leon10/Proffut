// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { SERIES } from "../competicoes";
import { avancar, jogosPendentesHoje, novoJogo, simularDia, simularRestoDaTemporada } from "../jogo";
import { competicoesDoUsuario } from "../torneios";
import { elencoDe } from "../mercado";


describe("Série D jogada", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 5 });
  estado.config.escalacaoAutomatica = true;
  const D = estado.torneios!.D!;
  const domingo = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay() === 0;

  it("tem os clubes da Série D em grupos regionais de 6, em turno e returno, aos domingos a partir de abril", () => {
    expect(D.clubes.length).toBeGreaterThanOrEqual(90);
    expect(D.grupos!.every((g) => g.length >= 5 && g.length <= 7)).toBe(true);
    for (const id of D.clubes) expect(elencoDe(estado, id).length, id).toBeGreaterThanOrEqual(16);
    const jogos = estado.partidas.filter((p) => p.serie === "D");
    expect(jogos).toHaveLength(D.grupos!.reduce((n, g) => n + g.length * (g.length - 1), 0));
    for (const p of jogos) {
      expect(domingo(p.data)).toBe(true);
      expect(p.data >= `${estado.temporada}-04-01`).toBe(true);
    }
  });

  it("passam 4 de cada grupo, o mata-mata é em ida e volta (a volta na casa da melhor campanha) e sobem os 2 finalistas, que jogam a Série C no ano seguinte", () => {
    simularRestoDaTemporada(estado);
    expect(D.fase).toBe("encerrada");
    const daFase = (fase: string) => estado.partidas.filter((p) => p.serie === "D" && p.fase === fase);
    const passaram = 2 ** Math.floor(Math.log2(D.grupos!.length * 4));
    expect(D.semeados).toHaveLength(passaram);
    for (let n = passaram, fase = 0; n >= 2; n /= 2, fase++) {
      const jogos = estado.partidas.filter((p) => p.serie === "D" && p.fase !== "grupos" && p.rodada <= 2).filter((p) => ["segunda", "terceira", "oitavas", "quartas", "semi", "final"].slice(-Math.log2(passaram))[fase] === p.fase);
      expect(jogos).toHaveLength(n);
      for (const p of jogos.filter((x) => x.perna === 2)) {
        expect(D.semeados!.indexOf(p.mandante)).toBeLessThan(D.semeados!.indexOf(p.visitante));
        expect(domingo(p.data)).toBe(true);
      }
    }
    expect(daFase("final")).toHaveLength(2);
    expect([...D.promovidos!].sort()).toEqual([D.campeao, D.vice].sort());
    const rebaixadosC = [...estado.series.C.rebaixados];
    avancar(estado);
    for (const id of D.promovidos!) expect(estado.clubes[id].serie).toBe("C");
    for (const id of rebaixadosC) expect(estado.clubes[id].serie).toBe("D");
    for (const s of SERIES) expect(Object.values(estado.clubes).filter((c) => c.serie === s)).toHaveLength(20);
    expect(estado.historico[0].torneios?.D?.campeao).toBe(D.campeao);
    // Na temporada nova, a Série D tem os rebaixados da C e não tem quem subiu.
    expect(estado.torneios!.D!.clubes).toEqual(expect.arrayContaining(rebaixadosC));
    for (const id of D.promovidos!) expect(estado.torneios!.D!.clubes).not.toContain(id);
  });

  it("Avançar passa direto pelos dias só com jogos que o usuário não acompanha, mas eles são jogados", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 8 });
    e.config.escalacaoAutomatica = true;
    const acompanha = competicoesDoUsuario(e);
    for (let i = 0; i < 25; i++) {
      const r = avancar(e);
      expect(r.tipo).toBe("jogos-hoje");
      expect(jogosPendentesHoje(e).some((p) => acompanha.has(p.serie))).toBe(true);
      simularDia(e);
    }
    const passados = e.partidas.filter((p) => p.serie === "D" && p.data <= e.data);
    expect(passados.length).toBeGreaterThan(0);
    expect(passados.every((p) => p.jogada)).toBe(true);
  });
});
