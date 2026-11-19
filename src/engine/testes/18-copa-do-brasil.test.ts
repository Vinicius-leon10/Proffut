// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { ligaCruzaOAno } from "../ciclos";
import { temporadaEncerrada } from "../competicoes";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { elencoDe } from "../mercado";
import type { EstadoJogo } from "../tipos";


describe("Copa do Brasil", () => {
  const FASES = ["fase1", "fase2", "fase3", "fase4", "fase5", "oitavas", "quartas", "semi", "final"];
  const daCopa = (e: EstadoJogo, fase?: string) => e.partidas.filter((p) => p.serie === "CB" && (fase == null || p.fase === fase));
  const novo = (semente: number) => novoJogo({ nomeTecnico: "T", clubeId: "avai", semente });

  it("o jogo novo monta a Copa de 2026: 126 clubes, 1ª fase só com os 28 piores do ranking e a Série A na 5ª fase", () => {
    const e = novo(31);
    const copa = e.copa!;
    expect(copa.fase).toBe("fase1");
    expect(new Set(copa.ranking).size).toBe(126);
    expect(copa.entram.fase1).toHaveLength(28);
    expect(copa.entram.fase2).toHaveLength(74);
    expect([...copa.entram.fase3!].sort()).toEqual(["barra-sc", "confianca", "paysandu", "ponte-preta"]);
    expect([...copa.entram.fase5!].sort()).toEqual(Object.values(e.clubes).filter((c) => c.serie === "A").map((c) => c.id).sort());
    for (const id of copa.entram.fase1!) {
      expect(e.clubes[id].serie).toBe("D");
      expect(elencoDe(e, id).length).toBeGreaterThanOrEqual(16);
    }
    const jogos = daCopa(e, "fase1");
    expect(jogos).toHaveLength(14);
    for (const p of jogos) {
      expect(p.data).toBe("2026-04-08");
      // Jogo único: o pior colocado no ranking tem o mando.
      expect(copa.ranking.indexOf(p.mandante)).toBeGreaterThan(copa.ranking.indexOf(p.visitante));
    }
    expect(e.clubes[copa.entram.fase1![0]].extrato.some((l) => l.descricao.includes("Copa do Brasil"))).toBe(true);
  });

  describe("uma temporada inteira", () => {
    const e = novo(32);
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);

    it("joga todas as fases com o número certo de jogos e termina com campeão e vice", () => {
      expect(temporadaEncerrada(e)).toBe(true);
      expect(FASES.map((f) => daCopa(e, f).length)).toEqual([14, 44, 24, 12, 32, 16, 8, 4, 1]);
      expect(daCopa(e).every((p) => p.jogada)).toBe(true);
      expect(e.copa!.fase).toBe("encerrada");
      expect(e.copa!.campeao).toBeTruthy();
      expect(e.copa!.vice).toBeTruthy();
      const [final] = daCopa(e, "final");
      expect(final.neutro).toBe(true);
      expect([final.mandante, final.visitante].sort()).toEqual([e.copa!.campeao, e.copa!.vice].sort());
      // A final é o último jogo do futebol brasileiro no ano (as finais da Libertadores e da Sul-Americana vêm depois).
      // (As ligas de agosto a maio, R141, seguem no ano seguinte.)
      expect(final.data >= e.partidas.filter((p) => p.serie !== "CB" && !p.serie.startsWith("K-") && !ligaCruzaOAno(p.serie)).map((p) => p.data).sort().at(-1)!).toBe(true);
    });

    it("empate em jogo único ou no agregado vai para os pênaltis", () => {
      for (const p of daCopa(e).filter((x) => x.perna === undefined && x.gm === x.gv)) expect(p.penaltis).toBeTruthy();
      for (const f of ["fase5", "oitavas", "quartas", "semi"]) {
        const jogos = daCopa(e, f);
        for (const volta of jogos.filter((p) => p.perna === 2)) {
          const ida = jogos.find((p) => p.perna === 1 && p.chave === volta.chave)!;
          const golsDoMandanteDaVolta = volta.gm + ida.gv;
          const golsDoVisitanteDaVolta = volta.gv + ida.gm;
          if (golsDoMandanteDaVolta === golsDoVisitanteDaVolta) expect(volta.penaltis).toBeTruthy();
          else expect(volta.penaltis).toBeUndefined();
        }
      }
    });

    it("quem passa de fase é quem venceu, a Série A entra na 5ª fase e ninguém joga duas vezes no mesmo dia", () => {
      const fase5 = new Set(daCopa(e, "fase5").flatMap((p) => [p.mandante, p.visitante]));
      expect(fase5.size).toBe(32);
      for (const id of e.copa!.entram.fase5!) expect(fase5.has(id)).toBe(true);
      const datas = new Map<string, string>();
      for (const p of e.partidas) {
        for (const id of [p.mandante, p.visitante]) {
          expect(datas.get(`${id}|${p.data}`), `${id} em ${p.data}`).toBeUndefined();
          datas.set(`${id}|${p.data}`, p.id);
        }
      }
    });

    it("o campeão recebe a premiação da final", () => {
      const campeao = e.clubes[e.copa!.campeao!];
      expect(campeao.extrato.some((l) => l.descricao === "Copa do Brasil: campeão")).toBe(true);
    });

    it("na virada, o campeão vai para o histórico e a Copa seguinte começa com os 4 que subiram da Série C na 3ª fase", () => {
      const campeao = e.copa!.campeao;
      const subiramDaC = [...e.series.C.promovidos].sort();
      expect(avancar(e).tipo).toBe("nova-temporada");
      expect(e.historico[0].copa?.campeao).toBe(campeao);
      expect(e.copa!.fase).toBe("fase1");
      expect([...e.copa!.entram.fase3!].sort()).toEqual(subiramDaC);
      expect(daCopa(e, "fase1")).toHaveLength(14);
      expect(daCopa(e).every((p) => !p.jogada && p.id.startsWith("2027-"))).toBe(true);
      // Elencos montados só para a Copa não se acumulam de um ano para o outro.
      for (const c of Object.values(e.clubes)) if (c.elencoDaCopa) expect(elencoDe(e, c.id).length).toBe(16);
    });
  });

  it("um save antigo, sem a Copa, termina a temporada e ganha a Copa no ano seguinte", () => {
    const e = novo(33);
    e.config.escalacaoAutomatica = true;
    delete e.copa;
    e.partidas = e.partidas.filter((p) => p.serie !== "CB");
    simularRestoDaTemporada(e);
    expect(temporadaEncerrada(e)).toBe(true);
    let r = avancar(e);
    while (r.tipo === "fim-dos-jogos") r = avancar(e);
    expect(r.tipo).toBe("nova-temporada");
    const copaDe = (x: EstadoJogo) => x.copa;
    expect(copaDe(e)?.fase).toBe("fase1");
  });
});
