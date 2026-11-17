// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { checarEstado } from "../checagem";
import { exportarTexto, importarTexto } from "../../save/salvamento";
import { confederacao, forcaDaSelecao, nacionalidadeDoPais } from "../selecoes";


describe("seleções da Europa (nov/2026)", () => {
  it("jogo novo: as 55 seleções da UEFA (106 com as da América), cada uma com 23 convocados ou mais da nacionalidade dela; a Liga das Nações de 2026 marcada (4 ligas, 14 grupos, de setembro a novembro)", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 61 });
    const selecoes = Object.values(e.clubes).filter((c) => c.serie === "selecao");
    expect(selecoes).toHaveLength(217);
    const europa = selecoes.filter((c) => confederacao(c.pais!) === "uefa");
    expect(europa).toHaveLength(55);
    expect(e.clubes["sel-ES"].nome).toBe("Espanha");
    expect(e.clubes["sel-EN"].nome).toBe("Inglaterra");
    expect(e.clubes["sel-XS"].nome).toBe("Escócia");
    expect(e.clubes["sel-SM"].nome).toBe("San Marino");
    for (const s of europa) {
      const convocados = e.selecoes!.convocados[s.id].map((id) => e.jogadores[id]);
      expect(convocados.length, s.nome).toBeGreaterThanOrEqual(23);
      for (const j of convocados) expect(j.nacionalidade, `${j.nome} (${s.nome})`).toBe(nacionalidadeDoPais(s.pais!));
    }
    // A Espanha é das mais fortes e San Marino, das mais fracas.
    expect(forcaDaSelecao(e, "sel-ES")).toBeGreaterThan(84);
    expect(forcaDaSelecao(e, "sel-SM")).toBeLessThan(55);
    // Os convocados da Espanha jogam quase todos nos clubes do jogo.
    const espanha = e.selecoes!.convocados["sel-ES"].map((id) => e.jogadores[id]);
    expect(espanha.filter((j) => j.clubeId !== "sel-ES").length).toBeGreaterThanOrEqual(18);
    const ln = e.selecoes!.competicoes["S-LN-2026"]!;
    expect(ln.selecoes).toHaveLength(55);
    expect(ln.grupos!.ligas).toHaveLength(14);
    expect(ln.grupos!.ligas.map((g) => g.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3]);
    expect(Object.values(e.selecoes!.ligaDasNacoes!).filter((n) => n === 4)).toHaveLength(7);
    const jogos = e.partidas.filter((p) => p.serie === "S-LN-2026");
    expect(jogos).toHaveLength(13 * 12 + 6);
    expect(jogos.every((p) => p.data >= "2026-09-01" && p.data <= "2026-11-30")).toBe(true);
    // Na Liga A, as 16 primeiras do ranking da Europa.
    expect(ln.grupos!.ligas.slice(0, 4).flat()).toContain("sel-ES");
    expect(ln.grupos!.ligas.slice(0, 4).flat()).not.toContain("sel-SM");
    expect(checarEstado(e).filter((p) => p.gravidade === "erro")).toEqual([]);
  });

  it("save com as seleções da América e sem as da Europa: ao abrir, entram as 55 da Europa, a Liga das Nações do ano e os amistosos, sem mexer nas outras", () => {
    const antigo = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 62 });
    const daEuropa = new Set(Object.values(antigo.clubes).filter((c) => c.serie === "selecao" && confederacao(c.pais!) === "uefa").map((c) => c.id));
    expect(daEuropa.size).toBe(55);
    for (const j of Object.values(antigo.jogadores)) {
      if (j.clubeId && daEuropa.has(j.clubeId)) delete antigo.jogadores[j.id];
    }
    const sel = antigo.selecoes!;
    for (const id of daEuropa) {
      delete antigo.clubes[id]; delete sel.ranking[id]; delete sel.convocados[id]; delete sel.base[id];
    }
    sel.primeiraConvocacao = sel.primeiraConvocacao?.filter((id) => !daEuropa.has(id));
    delete sel.competicoes["S-LN-2026"];
    delete sel.ligaDasNacoes;
    antigo.partidas = antigo.partidas.filter((p) => !daEuropa.has(p.mandante) && !daEuropa.has(p.visitante));
    const rankingBr = sel.ranking["sel-BR"];
    const convocadosBr = [...sel.convocados["sel-BR"]];
    const clubes = Object.keys(antigo.clubes).length;
    const aberto = importarTexto(exportarTexto(antigo));
    expect(Object.keys(aberto.clubes).length).toBe(clubes + 55);
    expect(aberto.selecoes!.ranking["sel-BR"]).toBe(rankingBr);
    expect(aberto.selecoes!.convocados["sel-BR"]).toEqual(convocadosBr);
    expect(aberto.selecoes!.convocados["sel-FR"].length).toBeGreaterThanOrEqual(23);
    expect(aberto.selecoes!.competicoes["S-LN-2026"]!.selecoes).toHaveLength(55);
    expect(aberto.partidas.some((p) => p.serie === "S-AMI" && daEuropa.has(p.mandante) && p.data > aberto.data)).toBe(true);
    expect(checarEstado(aberto).filter((p) => p.gravidade === "erro")).toEqual([]);
  });
});
