// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { competicaoCruzaOAno } from "../copas";
import { datasDaTemporada } from "../calendario";
import { novoJogo, simularRestoDaTemporada } from "../jogo";


describe("R115 os clubes param durante a Copa do Mundo (Modo Copa, nov/2026)", () => {
  it("em 2026, nenhum jogo de clube de 11 de junho a 19 de julho (séries, Copa do Brasil, Série D, estaduais, ligas e copas); a Série A tem as 38 rodadas e acaba quando acabaria; ninguém joga duas vezes no mesmo dia", { timeout: 400_000 }, () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 84 });
    e.config.escalacaoAutomatica = true;
    e.tecnico.desde = "2026-12-31";
    simularRestoDaTemporada(e);
    expect(e.temporada).toBe(2026);
    const clubes = e.partidas.filter((p) => !p.serie.startsWith("S-"));
    expect(clubes.filter((p) => p.data >= "2026-06-11" && p.data <= "2026-07-19").map((p) => `${p.serie} ${p.fase} ${p.data}`)).toEqual([]);
    // As ligas de agosto a maio (R141) seguem no ano seguinte.
    expect(clubes.every((p) => p.jogada || competicaoCruzaOAno(p.serie))).toBe(true);
    const a = clubes.filter((p) => p.serie === "A");
    expect(a).toHaveLength(380);
    // A Série A acaba no máximo três semanas depois do normal (14 de novembro): as rodadas da janela vão para quartas sem
    // copa e, faltando lugar, para sábados depois da última rodada.
    expect(a.map((p) => p.data).sort().at(-1)! <= "2026-12-06").toBe(true);
    // A Copa do Brasil e as copas seguem (com final), e a Série D também.
    expect(e.copa!.campeao).toBeDefined();
    expect(e.torneios!.D!.campeao).toBeDefined();
    expect(e.copas!["K-SUL"]!.campeao).toBeDefined();
    // Ninguém joga duas vezes no mesmo dia.
    const dia = new Set<string>();
    for (const p of clubes) for (const c of [p.mandante, p.visitante]) {
      expect(dia.has(`${c}/${p.data}`), `${c} ${p.data}`).toBe(false);
      dia.add(`${c}/${p.data}`);
    }
  });

  it("num ano sem Copa (2027) o calendário é o de sempre: a Série A joga em junho e julho", () => {
    const datas = datasDaTemporada(2027).todas;
    expect(datas.filter((d) => d >= "2027-06-11" && d <= "2027-07-19").length).toBeGreaterThan(5);
    expect(datas).toHaveLength(40);
  });
});
