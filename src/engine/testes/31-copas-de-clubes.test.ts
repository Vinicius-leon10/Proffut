// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { somarDias } from "../calendario";
import { classificacao, tabelaDaLiga, temporadaEncerrada } from "../competicoes";
import { DEFINICOES, competicaoCruzaOAno, situacaoNaCopaDeClubes } from "../copas";
import { avancar, novoJogo, simularDia, simularRestoDaTemporada } from "../jogo";
import type { Partida } from "../tipos";
import { exportarTexto, importarTexto } from "../../save/salvamento";


describe("copas de clubes (Libertadores, Sul-Americana, Recopa, Concacaf, regionais do Brasil e nacionais)", () => {
  const e = novoJogo({ nomeTecnico: "T", clubeId: "palmeiras", semente: 11 });
  e.config.escalacaoAutomatica = true;
  const inicio = structuredClone(Object.fromEntries(Object.entries(e.copas!).map(([id, c]) => [id, c!.entram])));
  simularRestoDaTemporada(e);
  const jogos = (id: string, fase?: string) => e.partidas.filter((p) => p.serie === id && (!fase || p.fase === fase));
  const clubesDe = (lista: Partida[]) => new Set(lista.flatMap((p) => [p.mandante, p.visitante]));

  it("2026: quem joga é o de verdade (Supercopa, Recopa, a 1ª fase e os grupos da Libertadores, a Concacaf)", () => {
    expect(inicio["K-SUP"].final).toEqual(["flamengo", "corinthians"]);
    expect([...inicio["K-REC"].final].sort()).toEqual(["flamengo", "lanus"]);
    expect([...inicio["K-LIB"].fase1].sort()).toEqual(["2-de-mayo", "alianza-lima", "deportivo-tachira", "juventud", "the-strongest", "universidad-catolica-ec"]);
    expect(inicio["K-LIB"].fase2).toHaveLength(13);
    expect(inicio["K-LIB"].grupos).toHaveLength(28);
    expect(inicio["K-LIB"].grupos).toEqual(expect.arrayContaining(["flamengo", "palmeiras", "corinthians", "cruzeiro", "mirassol", "fluminense", "boca-juniors", "lanus"]));
    expect(inicio["K-LIB"].fase2).toEqual(expect.arrayContaining(["botafogo", "bahia"]));
    expect(inicio["K-SUL"].grupos).toHaveLength(12);
    expect(inicio["K-SUL"].fase1).toHaveLength(32);
    expect(inicio["K-CONC"].oitavas).toHaveLength(5);
    expect(inicio["K-CONC"].fase1).toHaveLength(22);
    expect(inicio["K-NE"].grupos).toHaveLength(20);
  });

  it("todas as copas acabam com campeão e vice, sem jogo pendente", () => {
    expect(temporadaEncerrada(e)).toBe(true);
    // A Supercopa da UEFA, as 7 supercopas nacionais da Europa e o Mundial de Clubes só começam em 2027 (com os campeões do jogo).
    const so2027 = ["K-USC", "K-SEN", "K-SES", "K-SIT", "K-SDE", "K-SFR", "K-SPT", "K-SNL", "K-MUN"];
    expect(Object.keys(e.copas!).length).toBe(DEFINICOES.filter((d) => !so2027.includes(d.id)).length);
    // As copas da Europa, da Ásia e da África vão de agosto a maio (R145): em dezembro estão no meio, e a conferência delas, até
    // a final e com os pênaltis, está nos testes 36 e 37 e no R145 (que anda até 10 de junho de 2027).
    for (const c of Object.values(e.copas!).filter((x) => !competicaoCruzaOAno(x!.id))) {
      expect(c!.fase, c!.id).toBe("encerrada");
      expect(c!.campeao, c!.id).toBeTruthy();
      expect(c!.vice, c!.id).toBeTruthy();
      expect(jogos(c!.id).every((p) => p.jogada), c!.id).toBe(true);
    }
  });

  it("Libertadores: 47 clubes nas fases de 2026 (6, 16, 8, 32, 16, 8, 4, 2), grupos de 4 sem dois do mesmo país, final em campo neutro", () => {
    expect(e.copas!["K-LIB"]!.clubes).toHaveLength(47);
    const fases = ["fase1", "fase2", "fase3", "grupos", "oitavas", "quartas", "semi", "final"];
    expect(fases.map((f) => clubesDe(jogos("K-LIB", f)).size)).toEqual([6, 16, 8, 32, 16, 8, 4, 2]);
    for (const g of e.copas!["K-LIB"]!.grupos!.grupos) {
      expect(g).toHaveLength(4);
      expect(new Set(g.map((id) => e.clubes[id].pais ?? "BR")).size).toBe(4);
    }
    const [final] = jogos("K-LIB", "final");
    expect(final.neutro).toBe(true);
    expect([final.mandante, final.visitante].sort()).toEqual([e.copas!["K-LIB"]!.campeao, e.copas!["K-LIB"]!.vice].sort());
  });

  it("Sul-Americana: os 4 eliminados da 3ª fase da Libertadores vão para os grupos e os 8 terceiros dos grupos dela, para a repescagem", () => {
    const eliminadosNaFase3 = [...clubesDe(jogos("K-LIB", "fase3"))].filter((c) => !clubesDe(jogos("K-LIB", "grupos")).has(c));
    expect(eliminadosNaFase3).toHaveLength(4);
    const grupos = clubesDe(jogos("K-SUL", "grupos"));
    expect(grupos.size).toBe(32);
    for (const c of eliminadosNaFase3) expect(grupos.has(c)).toBe(true);
    const terceiros = e.copas!["K-LIB"]!.grupos!.grupos.map((g, k) => classificacao(e, "K-LIB", "grupos", g, k + 1)[2].clubeId);
    const repescagem = clubesDe(jogos("K-SUL", "repescagem"));
    expect(repescagem.size).toBe(16);
    for (const c of terceiros) expect(repescagem.has(c)).toBe(true);
    // Nas oitavas, os 8 primeiros dos grupos e os 8 vencedores da repescagem.
    const primeiros = e.copas!["K-SUL"]!.grupos!.grupos.map((g, k) => classificacao(e, "K-SUL", "grupos", g, k + 1)[0].clubeId);
    const oitavas = clubesDe(jogos("K-SUL", "oitavas"));
    expect(oitavas.size).toBe(16);
    for (const c of primeiros) expect(oitavas.has(c)).toBe(true);
  });

  it("nenhum clube joga duas vezes no mesmo dia nem em dias seguidos (séries, Copa do Brasil, torneios e copas)", () => {
    const porClube = new Map<string, string[]>();
    for (const p of e.partidas) for (const id of [p.mandante, p.visitante]) porClube.set(id, [...(porClube.get(id) ?? []), p.data]);
    const colados: string[] = [];
    for (const [id, datas] of porClube) {
      datas.sort();
      for (let i = 1; i < datas.length; i++) if (datas[i] <= somarDias(datas[i - 1], 1)) colados.push(`${id} ${datas[i - 1]} ${datas[i]}`);
    }
    expect(colados).toEqual([]);
  });

  it("empate no mata-mata vai para os pênaltis: no jogo único e no agregado da volta", () => {
    for (const def of DEFINICOES) {
      for (const f of def.fases.filter((x) => x.tipo === "mata")) {
        // (As copas de agosto a maio ainda têm jogos por jogar em dezembro: R145.)
        for (const p of jogos(def.id, f.id).filter((x) => x.jogada || !competicaoCruzaOAno(def.id))) {
          if (p.perna === 1) expect(p.penaltis, p.id).toBeUndefined();
          if (p.perna === undefined && p.gm === p.gv) expect(p.penaltis, p.id).toBeTruthy();
          if (p.perna === 2) {
            const ida = jogos(def.id, f.id).find((x) => x.chave === p.chave && x.perna === 1)!;
            const empate = p.gm + ida.gv === p.gv + ida.gm;
            expect(!!p.penaltis, p.id).toBe(empate);
          }
        }
      }
    }
  });

  it("na virada: as vagas saem das tabelas e dos campeões do ano (Recopa, Supercopa, Libertadores), e os títulos vão para o histórico", () => {
    const campeoes = Object.fromEntries(Object.entries(e.copas!).map(([id, c]) => [id, c!.campeao]));
    const tabelaA = tabelaDaLiga(e, "A").map((l) => l.clubeId);
    const copaDoBrasil = e.copa!.campeao!;
    avancar(e);
    expect(e.temporada).toBe(2027);
    expect(e.historico[0].copas!["K-LIB"]!.campeao).toBe(campeoes["K-LIB"]);
    expect(e.copas!["K-REC"]!.entram.final).toEqual([campeoes["K-LIB"], campeoes["K-SUL"]]);
    expect(e.copas!["K-SUP"]!.entram.final[0]).toBe(tabelaA[0]);
    const lib = e.copas!["K-LIB"]!;
    const naLib = [...lib.entram.fase1, ...lib.entram.fase2, ...lib.entram.grupos];
    expect(naLib).toHaveLength(47);
    expect(lib.entram.grupos).toEqual(expect.arrayContaining([campeoes["K-LIB"], campeoes["K-SUL"], copaDoBrasil]));
    // Do Brasil, sete (fora os campeões continentais): o campeão da Copa do Brasil e os primeiros da Série A.
    const brasileiros = naLib.filter((id) => !e.clubes[id].pais && id !== campeoes["K-LIB"] && id !== campeoes["K-SUL"]);
    expect(brasileiros).toHaveLength(7);
    // As vagas descem na tabela quando os campeões já estão no alto dela (nov/2026: com Flamengo 1º e campeão da
    // Libertadores, Corinthians 3º e campeão da Sul-Americana e Internacional 7º e campeão da Copa do Brasil, a última vaga
    // foi para o 9º): o campeão da Copa do Brasil e os 6 primeiros da Série A que não são campeões.
    const campeoesDoAno = new Set([campeoes["K-LIB"], campeoes["K-SUL"], copaDoBrasil]);
    const daCopa = copaDoBrasil === campeoes["K-LIB"] || copaDoBrasil === campeoes["K-SUL"] ? [] : [copaDoBrasil];
    expect([...brasileiros].sort()).toEqual([...daCopa, ...tabelaA.filter((id) => !campeoesDoAno.has(id)).slice(0, 7 - daCopa.length)].sort());
    // Da Sul-Americana, os 6 seguintes da Série A.
    expect(e.copas!["K-SUL"]!.entram.grupos.filter((id) => !e.clubes[id].pais)).toHaveLength(6);
    // Quem entra só nos grupos ainda não tem jogo marcado (a 1ª fase já tem).
    expect(situacaoNaCopaDeClubes(e, "K-LIB", lib.entram.grupos.at(-1)!)).toMatch(/entra na Libertadores na fase de grupos/);
  });

  it("save de antes das copas: abre sem elas e elas começam na temporada seguinte", () => {
    const antigo = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 12 });
    delete antigo.copas;
    antigo.partidas = antigo.partidas.filter((p) => !p.serie.startsWith("K-"));
    const aberto = importarTexto(exportarTexto(antigo));
    expect(aberto.copas).toBeUndefined();
    aberto.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(aberto);
    expect(aberto.partidas.some((p) => p.serie.startsWith("K-"))).toBe(false);
    avancar(aberto);
    expect(aberto.temporada).toBe(2027);
    expect(aberto.copas!["K-LIB"]!.clubes).toHaveLength(47);
    // As copas de agosto a maio (Europa, Ásia e África) começam na virada de 1º de julho de 2027 (R145).
    for (let i = 0; i < 4000 && aberto.data < "2027-07-02"; i++) {
      const r = avancar(aberto);
      if (r.tipo === "jogos-hoje") simularDia(aberto);
      else if (r.tipo === "nada") break;
    }
    // Sem copas em 2026, não há os campeões das copas nacionais da Europa: as 7 supercopas de lá ficam para 2028.
    expect(Object.keys(aberto.copas!).length).toBeGreaterThanOrEqual(DEFINICOES.length - 2 - 7 - 1);
    expect(aberto.copas!["K-UCL"]!.inicio).toBe(2027);
  }, 400_000);
});
