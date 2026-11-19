// R145: as copas da Europa, da Ásia e da África no calendário real (etapa 4 do plano das temporadas reais,
// docs/PLANO_TEMPORADAS_REAIS.md; pedido do usuário, nov/2026: "Em relação a data da temporada, a Europa e a América são
// diferentes"). A Liga dos Campeões, a Liga Europa, a Conference, as copas nacionais e as supercopas da Europa e a Liga dos
// Campeões da Ásia e da África vão de agosto a maio e viram em 1º de julho; as da América seguem o ano civil.
import { describe, expect, it } from "vitest";
import { competicaoCruzaOAno, copasEncerradas, vagasDasCopas } from "../copas";
import { avancar, novoJogo, simularDia } from "../jogo";
import type { EstadoJogo, IdCopa } from "../tipos";

const datas = (e: EstadoJogo, id: string) => e.partidas.filter((p) => p.serie === id).map((p) => p.data).sort();

function avancarAte(estado: EstadoJogo, ate: string) {
  for (let i = 0; i < 4000 && estado.data < ate; i++) {
    const r = avancar(estado);
    if (r.tipo === "jogos-hoje") simularDia(estado);
    else if (r.tipo === "nada") break;
  }
}

describe("copas de agosto a maio (R145)", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });

  it("2026/27: a Liga dos Campeões vai de setembro a maio; as copas nacionais da Europa também; a Libertadores segue o ano civil", () => {
    for (const id of ["K-UCL", "K-UEL", "K-UECL", "K-AFC", "K-CAF", "K-EN", "K-ES", "K-IT", "K-DE", "K-FR", "K-PT", "K-NL"] as IdCopa[]) {
      expect(estado.copas![id]?.inicio, id).toBe(2026);
      const d = datas(estado, id);
      // O primeiro jogo da fase em que a copa começa (a Liga dos Campeões, no playoff de meados de agosto) e o último, em maio.
      expect(d[0] >= "2026-08-10", `${id} começa ${d[0]}`).toBe(true);
      expect(d.at(-1)! <= "2027-06-05", `${id} termina ${d.at(-1)}`).toBe(true);
    }
    // A Liga dos Campeões começa no playoff de agosto; a Liga Europa, nos grupos de setembro a dezembro.
    const playoff = datas(estado, "K-UCL");
    expect(playoff[0] >= "2026-08-10" && playoff.at(-1)! <= "2026-09-01").toBe(true);
    const grupos = datas(estado, "K-UEL");
    expect(grupos[0] >= "2026-09-01" && grupos.at(-1)! <= "2026-12-31").toBe(true);
    // As copas da UEFA de janeiro a maio de 2026 saíram (a temporada 2025/26 ficou para trás).
    expect(estado.partidas.some((p) => ["K-UCL", "K-UEL", "K-UECL", "K-USC"].includes(p.serie) && p.data < "2026-08-01")).toBe(false);
    // A Libertadores de 2026 segue de fevereiro a novembro.
    expect(datas(estado, "K-LIB")[0] < "2026-05-01").toBe(true);
    expect(estado.copas!["K-LIB"]!.inicio).toBe(2026);
  });

  it("o fim de 2026 não derruba as copas da Europa; em 1º de julho de 2027 elas viram: campeão guardado, Supercopa da UEFA e a temporada 2027/28", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    e.config.escalacaoAutomatica = true;
    avancarAte(e, "2027-01-02");
    expect(e.temporada).toBe(2027);
    // A Liga dos Campeões 2026/27 continua (grupos jogados, mata-mata para fevereiro) e a Libertadores de 2027 já existe.
    expect(e.copas!["K-UCL"]!.inicio).toBe(2026);
    expect(e.copas!["K-UCL"]!.fase).not.toBe("encerrada");
    expect(e.partidas.filter((p) => p.serie === "K-UCL" && p.jogada).length).toBeGreaterThan(50);
    expect(e.copas!["K-LIB"]!.inicio).toBe(2027);
    expect(e.partidas.some((p) => !p.jogada && p.data < e.data)).toBe(false);
    expect(copasEncerradas(e)).toBe(false);

    avancarAte(e, "2027-06-10");
    // Todas as copas de agosto a maio acabam com campeão e vice, sem jogo pendente e com os pênaltis no empate.
    const deAgostoAMaio = (Object.keys(e.copas!) as IdCopa[]).filter((id) => competicaoCruzaOAno(id));
    expect(deAgostoAMaio.length).toBeGreaterThanOrEqual(12);
    for (const id of deAgostoAMaio) {
      const c = e.copas![id]!;
      expect(c.fase, id).toBe("encerrada");
      expect(c.campeao, id).toBeTruthy();
      expect(c.vice, id).toBeTruthy();
      expect(e.partidas.filter((p) => p.serie === id).every((p) => p.jogada), id).toBe(true);
      expect(e.partidas.find((p) => p.serie === id && p.fase === "final")?.neutro, id).toBe(true);
      for (const p of e.partidas.filter((x) => x.serie === id && x.perna === undefined && x.fase !== "grupos")) {
        if (p.gm === p.gv) expect(p.penaltis, p.id).toBeTruthy();
      }
    }
    expect(e.copas!["K-UCL"]!.fase).toBe("encerrada");
    expect(e.copas!["K-UCL"]!.campeao).toBeTruthy();
    const campeaoUcl = e.copas!["K-UCL"]!.campeao!;
    const campeaoUel = e.copas!["K-UEL"]!.campeao!;
    avancarAte(e, "2027-07-02");
    // Virou: nova edição (2027/28) com as vagas das tabelas finais, e o campeão da anterior guardado.
    expect(e.copas!["K-UCL"]!.inicio).toBe(2027);
    expect(e.copas!["K-UCL"]!.fase).not.toBe("encerrada");
    expect(e.ultimosCampeoes?.["K-UCL"]).toBe(campeaoUcl);
    expect(e.historico.find((h) => h.temporada === 2026)?.copas?.["K-UCL"]?.campeao).toBe(campeaoUcl);
    expect(e.copas!["K-USC"]?.entram.final).toEqual([campeaoUcl, campeaoUel]);
    // (A fase de grupos nova só é marcada depois do playoff de agosto: o primeiro jogo da edição 2027/28 é o do playoff.)
    expect(datas(e, "K-UCL")[0] >= "2027-08-10").toBe(true);
    // O Mundial de Clubes de janeiro conta o campeão da Liga dos Campeões que terminou em maio.
    expect(vagasDasCopas(e, "ano")["K-MUN"]?.semi).toContain(campeaoUcl);
  }, 900_000);
});
