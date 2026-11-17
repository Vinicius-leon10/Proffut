// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { MINIMO_POSICAO } from "../constantes";
import { novoJogo } from "../jogo";
import { PAISES } from "../torneios";
import { elencoDe } from "../mercado";
import type { Posicao } from "../tipos";
import jogadoresJson from "../../../data/brasil-2026/jogadores.json";
import exteriorJson from "../../../data/america-do-sul-2026/jogadores.json";
import convocadosJson from "../../../data/selecoes-2026/convocados.json";
import { nacionalidadeDoPais } from "../selecoes";

/** Quem foi convocado por uma seleção e joga num clube do jogo ganha a nacionalidade dela (os dados dos clubes nem sempre dizem). */
const NACIONALIDADE_DA_CONVOCACAO = new Map(Object.entries(convocadosJson.selecoes as Record<string, { convocados: { noJogo?: string; clubeDoJogo?: string }[] }>)
  .flatMap(([pais, s]) => s.convocados.filter((c) => c.noJogo && c.clubeDoJogo).map((c) => [`${c.clubeDoJogo}/${c.noJogo}`, nacionalidadeDoPais(pais)] as const)));


describe("elencos reais", () => {
  it("o jogo novo usa os jogadores de data/brasil-2026/jogadores.json, completando o mínimo por posição", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    const elencos = jogadoresJson.elencos as Record<string, { nome: string; posicao: string; lado: string; idade: number; forca: number; nacionalidade?: string }[]>;
    // Os 60 clubes das séries A a C e, desde nov/2026, os da Série D e dos estaduais que aparecem nas súmulas.
    const dasSeries = Object.values(estado.clubes).filter((c) => ["A", "B", "C"].includes(c.serie)).map((c) => c.id);
    for (const id of dasSeries) expect(elencos[id], id).toBeDefined();
    for (const id of Object.keys(elencos)) expect(["A", "B", "C", "D", "estadual"]).toContain(estado.clubes[id].serie);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais) {
        const j = elenco.find((x) => x.nome === r.nome && x.posicao === r.posicao);
        expect(j, `${r.nome} (${clubeId})`).toBeDefined();
        const nacionalidade = NACIONALIDADE_DA_CONVOCACAO.get(`${clubeId}/${r.nome}`) ?? r.nacionalidade ?? "BRA";
        expect([j!.idade, j!.forca, j!.lado, j!.nacionalidade]).toEqual([r.idade, r.forca, r.lado, nacionalidade]);
      }
      for (const pos of ["G", "L", "Z", "M", "A"] as Posicao[]) expect(elenco.filter((x) => x.posicao === pos).length).toBeGreaterThanOrEqual(MINIMO_POSICAO[pos] + 1);
    }
  });

  it("os clubes de fora usam os elencos de data/america-do-sul-2026/jogadores.json, com a nacionalidade do país quando os dados não dizem outra", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    const elencos = exteriorJson.elencos as Record<string, { nome: string; posicao: string; lado: string; idade: number; forca: number; nacionalidade?: string }[]>;
    expect(Object.keys(elencos).length).toBeGreaterThanOrEqual(150);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const clube = estado.clubes[clubeId];
      expect(clube.serie, clubeId).toBe("exterior");
      const doPais = PAISES[clube.pais!].nacionalidade;
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais) {
        const j = elenco.find((x) => x.nome === r.nome && x.posicao === r.posicao);
        expect(j, `${r.nome} (${clubeId})`).toBeDefined();
        const nacionalidade = NACIONALIDADE_DA_CONVOCACAO.get(`${clubeId}/${r.nome}`) ?? r.nacionalidade ?? doPais;
        expect([j!.idade, j!.forca, j!.nacionalidade]).toEqual([r.idade, r.forca, nacionalidade]);
      }
    }
  });
});
