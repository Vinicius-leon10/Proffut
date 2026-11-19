// R143: México e América Central jogam dois torneios por ano, Clausura (janeiro a maio) e Apertura (julho a dezembro), cada
// um com o seu campeão (etapa 2c do plano das temporadas reais, docs/PLANO_TEMPORADAS_REAIS.md; tabela de ciclos aprovada
// pelo usuário: "dois torneios no México e na América Central"). Simplificação: sem liguilha (o líder do torneio é o campeão).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { tabelaDoTurno } from "../torneios";
import type { EstadoJogo, IdTorneio } from "../tipos";

describe("dois torneios por ano (R143)", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
  const datas = (e: EstadoJogo, id: string, de: number, ate: number) =>
    e.partidas.filter((p) => p.serie === id && p.rodada >= de && p.rodada <= ate).map((p) => p.data).sort();

  it("Liga MX e as da América Central: Clausura de janeiro a maio, Apertura de julho a dezembro, turno único cada", () => {
    for (const liga of ["MX", "CR", "HN", "GT", "PA"]) {
      const t = estado.torneios![`L-${liga}` as IdTorneio]!;
      const meio = t.rodadasPorTurno!;
      expect(meio, liga).toBeGreaterThan(5);
      const jogos = estado.partidas.filter((p) => p.serie === t.id);
      expect(jogos.length, liga).toBe(t.clubes.length * (t.clubes.length - 1));
      const clausura = datas(estado, t.id, 1, meio);
      const apertura = datas(estado, t.id, meio + 1, 2 * meio);
      expect(clausura[0] >= "2026-01-10" && clausura.at(-1)! <= "2026-05-31", `${liga} clausura ${clausura[0]} ${clausura.at(-1)}`).toBe(true);
      expect(apertura[0] >= "2026-07-10" && apertura.at(-1)! <= "2026-12-31", `${liga} apertura ${apertura[0]} ${apertura.at(-1)}`).toBe(true);
      // Cada par se enfrenta uma vez em cada torneio.
      const pares = new Set(jogos.filter((p) => p.rodada <= meio).map((p) => [p.mandante, p.visitante].sort().join("/")));
      expect(pares.size, liga).toBe((t.clubes.length * (t.clubes.length - 1)) / 2);
    }
    // As ligas do ano civil (Argentina) e as de agosto a maio (Inglaterra) não têm dois torneios.
    expect(estado.torneios!["L-AR"]!.rodadasPorTurno).toBeUndefined();
    expect(estado.torneios!["L-EN"]!.rodadasPorTurno).toBeUndefined();
  });

  it("no fim do ano cada torneio tem o seu campeão (o líder do turno), no torneio e no histórico", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    const t = e.torneios!["L-MX" as IdTorneio]!;
    expect(t.turnos?.map((x) => x.nome)).toEqual(["Clausura", "Apertura"]);
    expect(t.turnos![0].campeao).toBe(tabelaDoTurno(e, t, 1)[0].clubeId);
    expect(t.turnos![1].campeao).toBe(tabelaDoTurno(e, t, 2)[0].clubeId);
    expect(t.fase).toBe("encerrada");
    // Na virada o histórico guarda os dois campeões.
    let r = avancar(e);
    while (r.tipo === "fim-dos-jogos") r = avancar(e);
    expect(r.tipo).toBe("nova-temporada");
    const registro = e.historico.find((h) => h.temporada === 2026)!.torneios!["L-MX" as IdTorneio]!;
    expect(registro.turnos?.map((x) => x.campeao)).toEqual(t.turnos!.map((x) => x.campeao));
    // A temporada nova tem dois torneios de novo, com as datas de 2027.
    expect(e.torneios!["L-MX" as IdTorneio]!.turnos).toBeUndefined();
    expect(e.torneios!["L-MX" as IdTorneio]!.rodadasPorTurno).toBeGreaterThan(5);
  }, 600_000);
});
