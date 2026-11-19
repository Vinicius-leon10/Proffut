// R140: calendário do mundo, etapa 1 do plano das temporadas reais (docs/PLANO_TEMPORADAS_REAIS.md; pedido do usuário,
// nov/2026: "Em relação a data da temporada, a Europa e a América são diferentes" e a tabela de ciclos aprovada: "ano civil;
// dois torneios no México e na América Central; agosto a maio para Europa, Oriente Médio, boa parte da África e da Ásia;
// outubro a maio para Austrália e Nova Zelândia"). Nesta etapa o jogo não muda: as ligas saem da tabela com as datas de hoje.
import { describe, expect, it } from "vitest";
import {
  CALENDARIO_DO_MUNDO, anoDoCiclo, cicloDaCompeticao, cicloDoClube, cicloDoPais, inicioDaPreTemporada, rotuloDaTemporada,
  viradaDoCiclo,
} from "../ciclos";
import { novoJogo } from "../jogo";
import { PAISES } from "../torneios";

describe("calendário do mundo (R140)", () => {
  it("todo país do jogo tem ciclo na tabela", () => {
    for (const pais of ["BR", ...Object.keys(PAISES)]) expect(CALENDARIO_DO_MUNDO[pais], pais).toBeDefined();
  });

  it("os ciclos são os aprovados", () => {
    for (const p of ["BR", "AR", "US", "CA", "KR", "CN", "NO", "SE", "IE"]) expect(cicloDoPais(p), p).toBe("ano");
    for (const p of ["MX", "CR", "HN", "DO"]) expect(cicloDoPais(p), p).toBe("torneios");
    for (const p of ["EN", "ES", "IT", "DE", "FR", "PT", "TR", "SA", "QA", "EG", "MA", "ZA", "JP", "IN"]) expect(cicloDoPais(p), p).toBe("agosto");
    for (const p of ["AU", "NZ"]) expect(cicloDoPais(p), p).toBe("outubro");
  });

  it("rótulo, ano do ciclo, virada e pré-temporada", () => {
    expect(rotuloDaTemporada("ano", 2026)).toBe("2026");
    expect(rotuloDaTemporada("torneios", 2026)).toBe("2026");
    expect(rotuloDaTemporada("agosto", 2026)).toBe("2026/27");
    expect(rotuloDaTemporada("outubro", 2099)).toBe("2099/00");
    expect(anoDoCiclo("agosto", "2027-03-10")).toBe(2026);
    expect(anoDoCiclo("agosto", "2026-06-30")).toBe(2025);
    expect(anoDoCiclo("agosto", "2026-07-01")).toBe(2026);
    expect(anoDoCiclo("ano", "2027-03-10")).toBe(2027);
    expect(viradaDoCiclo("ano", 2026)).toBe("2026-12-31");
    expect(viradaDoCiclo("agosto", 2026)).toBe("2027-06-30");
    expect(inicioDaPreTemporada("BR", 2026)).toBe("2026-01-03");
    expect(inicioDaPreTemporada("EN", 2026)).toBe("2026-07-01");
    expect(inicioDaPreTemporada("AU", 2026)).toBe("2026-09-01");
  });

  it("ciclo de clubes e competições", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    expect(cicloDoClube(estado.clubes.flamengo)).toBe("ano");
    const ingles = Object.values(estado.clubes).find((c) => c.liga === "EN")!;
    expect(cicloDoClube(ingles)).toBe("agosto");
    const mexicano = Object.values(estado.clubes).find((c) => c.liga === "MX")!;
    expect(cicloDoClube(mexicano)).toBe("torneios");
    expect(cicloDaCompeticao("A")).toBe("ano");
    expect(cicloDaCompeticao("L-EN2")).toBe("agosto");
    expect(cicloDaCompeticao("L-AU")).toBe("outubro");
  });
});
