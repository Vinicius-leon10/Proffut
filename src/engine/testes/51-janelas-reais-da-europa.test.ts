// R147: janelas de transferência reais da Europa e dos outros campeonatos de agosto a maio (etapa 6 do plano das temporadas
// reais, docs/PLANO_TEMPORADAS_REAIS.md: "janelas reais (Europa julho–agosto e janeiro)"). Antes (R139) ficavam ajustadas ao
// calendário de janeiro a dezembro; agora seguem o ciclo do país.
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { fimDaJanela, janelaAberta, proximaAbertura } from "../regras";
import type { Clube } from "../tipos";

describe("janelas reais da Europa (R147)", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
  const de = (liga: string): Clube => Object.values(estado.clubes).find((c) => c.liga === liga)!;

  it("Inglaterra, Espanha e os outros de agosto a maio: de 1º de julho a 31 de agosto e todo janeiro", () => {
    for (const liga of ["EN", "ES", "IT", "DE", "FR", "JP", "SA", "EG"]) {
      const c = de(liga);
      expect(janelaAberta("2026-07-20", c), `${liga} julho`).toBe(true);
      expect(janelaAberta("2026-08-31", c), `${liga} fim de agosto`).toBe(true);
      expect(janelaAberta("2026-09-15", c), `${liga} setembro`).toBe(false);
      expect(janelaAberta("2027-01-15", c), `${liga} janeiro`).toBe(true);
      expect(janelaAberta("2027-03-10", c), `${liga} março`).toBe(false);
      expect(janelaAberta("2027-06-20", c), `${liga} junho`).toBe(false);
    }
    expect(proximaAbertura("2026-09-15", de("EN"))).toBe("2027-01-01");
    expect(fimDaJanela("2026-07-20", de("EN"))).toBe("2026-08-31");
  });

  it("Austrália e Nova Zelândia (de outubro a maio): julho a setembro e janeiro; o Brasil e a Noruega (ano civil) não mudam", () => {
    const au = de("AU");
    expect(janelaAberta("2026-09-10", au)).toBe(true);
    expect(janelaAberta("2026-11-10", au)).toBe(false);
    expect(janelaAberta("2027-01-20", au)).toBe(true);
    const flamengo = estado.clubes.flamengo;
    expect(janelaAberta("2026-02-10", flamengo)).toBe(true);
    expect(janelaAberta("2026-05-10", flamengo)).toBe(false);
    expect(janelaAberta("2026-07-20", flamengo)).toBe(true);
    const no = de("NO");
    expect(janelaAberta("2026-02-10", no)).toBe(true);
    expect(janelaAberta("2026-05-10", no)).toBe(false);
    expect(janelaAberta("2026-07-20", no)).toBe(true);
  });
});
