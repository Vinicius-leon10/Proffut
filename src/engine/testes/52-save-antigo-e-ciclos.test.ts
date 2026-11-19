// R148: save de antes das temporadas reais (etapa 6 do plano, docs/PLANO_TEMPORADAS_REAIS.md): continua abrindo, e as ligas e
// copas de agosto a maio ganham o ano em que começaram (`inicio`) e a tabela da última liga que acabou (`ultimaTabela`).
import { describe, expect, it } from "vitest";
import { exportarTexto, importarTexto } from "../../save/salvamento";
import { checarEstado } from "../checagem";
import { novoJogo } from "../jogo";
import type { IdCopa, IdTorneio } from "../tipos";

describe("save antigo e ciclos (R148)", () => {
  it("abre um save sem `inicio` nas ligas e copas: ganham o ano da temporada; a liga encerrada guarda a tabela final", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    for (const t of Object.values(e.torneios!)) delete t!.inicio;
    for (const c of Object.values(e.copas!)) delete c!.inicio;
    // Uma liga de agosto a maio que já acabou (saves da época em que a Europa ia de janeiro a setembro).
    const en = e.torneios!["L-EN" as IdTorneio]!;
    for (const p of e.partidas.filter((x) => x.serie === "L-EN")) { p.jogada = true; p.gm = 1; p.gv = 0; }
    en.fase = "encerrada";
    en.campeao = en.clubes[0];
    const aberto = importarTexto(exportarTexto(e));
    expect(aberto.torneios!["L-EN" as IdTorneio]!.inicio).toBe(2026);
    expect(aberto.torneios!["L-ES" as IdTorneio]!.inicio).toBe(2026);
    expect(aberto.copas!["K-UCL" as IdCopa]!.inicio).toBe(2026);
    expect(aberto.copas!["K-LIB" as IdCopa]!.inicio).toBe(2026);
    expect(aberto.ultimaTabela?.EN).toHaveLength(20);
    // Ligas do ano civil não ganham `inicio` (só as de agosto a maio).
    expect(aberto.torneios!["L-AR" as IdTorneio]!.inicio).toBeUndefined();
    expect(checarEstado(aberto).filter((p) => p.gravidade === "erro")).toEqual([]);
  }, 120_000);
});
