// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { SERIES, tabelaDaLiga, temporadaEncerrada } from "../competicoes";
import { MINIMO_POSICAO } from "../constantes";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { tabelaDoTorneio, vagasEntreDivisoes } from "../torneios";
import { elencoDe, livres } from "../mercado";
import type { Posicao } from "../tipos";


describe("temporada completa", () => {
  const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 7 });
  estado.config.escalacaoAutomatica = true;
  simularRestoDaTemporada(estado);
  // Antes da virada: quem deve cair e subir em cada país da América do Sul, pela tabela final de cada divisão.
  // Os 9 da Conmebol (na Concacaf, a MLS, o Canadá e o México não têm acesso e queda).
  const trocasEsperadas = ["AR", "BO", "CL", "CO", "EC", "PY", "PE", "UY", "VE"].map((pais) => {
    const primeira = estado.torneios?.[`L-${pais}`];
    const segunda = estado.torneios?.[`L-${pais}2`];
    const n = vagasEntreDivisoes(estado, pais);
    return {
      pais,
      n,
      tamanhos: [primeira?.clubes.length, segunda?.clubes.length],
      caem: primeira ? tabelaDoTorneio(estado, primeira).slice(primeira.clubes.length - n).map((l) => l.clubeId) : [],
      sobem: segunda ? tabelaDoTorneio(estado, segunda).slice(0, n).map((l) => l.clubeId) : [],
    };
  });

  it("todas as séries terminam com campeão, promovidos e rebaixados certos", () => {
    expect(temporadaEncerrada(estado)).toBe(true);
    expect(estado.partidas.every((p) => p.jogada)).toBe(true);
    for (const s of SERIES) expect(estado.series[s].campeao).toBeTruthy();
    expect(estado.series.A.rebaixados).toHaveLength(4);
    expect(estado.series.B.promovidos).toHaveLength(4);
    expect(estado.series.B.rebaixados).toHaveLength(4);
    expect(estado.series.C.promovidos).toHaveLength(4);
    expect(estado.series.C.rebaixados).toHaveLength(2);
    expect(estado.partidas.filter((p) => p.serie === "B" && p.fase === "playoff")).toHaveLength(4);
    expect(estado.partidas.filter((p) => p.serie === "C" && p.fase === "quadrangulares")).toHaveLength(24);
    expect(estado.partidas.filter((p) => p.serie === "C" && p.fase === "final")).toHaveLength(2);
    expect(tabelaDaLiga(estado, "A")[0].j).toBe(38);
  });

  it("as ligas de fora saem pela simulação rápida: só os gols, com autores do próprio time, e números parecidos com os da simulação completa", () => {
    const deFora = estado.partidas.filter((p) => p.serie.startsWith("L-"));
    expect(deFora.length).toBeGreaterThan(3000);
    expect(deFora.every((p) => p.jogada)).toBe(true);
    // Só gols: sem cartões, lesões nem trocas (não há lance a lance).
    expect(deFora.flatMap((p) => p.eventos).every((e) => e.tipo === "gol")).toBe(true);
    for (const p of deFora.slice(0, 300)) expect(p.eventos.length, p.id).toBe(p.gm + p.gv);
    const n = deFora.length;
    const gols = deFora.reduce((s, p) => s + p.gm + p.gv, 0) / n;
    const casa = deFora.filter((p) => p.gm > p.gv).length / n;
    const empate = deFora.filter((p) => p.gm === p.gv).length / n;
    expect(gols).toBeGreaterThan(2.0);
    expect(gols).toBeLessThan(2.6);
    expect(casa).toBeGreaterThan(0.38);
    expect(casa).toBeLessThan(0.48);
    expect(empate).toBeGreaterThan(0.24);
    expect(empate).toBeLessThan(0.34);
    // As séries do Brasil continuam com a simulação completa (cartões aparecem).
    expect(estado.partidas.filter((p) => p.serie === "A").flatMap((p) => p.eventos).some((e) => e.tipo === "amarelo")).toBe(true);
  });

  it("a virada mantém 20 clubes por série e elencos válidos", () => {
    const campeaoA = estado.series.A.campeao;
    const r = avancar(estado);
    expect(r.tipo).toBe("nova-temporada");
    expect(estado.temporada).toBe(2027);
    expect(estado.historico).toHaveLength(1);
    expect(estado.historico[0].campeoes.A).toBe(campeaoA);
    for (const s of SERIES) expect(Object.values(estado.clubes).filter((c) => c.serie === s)).toHaveLength(20);
    for (const j of Object.values(estado.jogadores)) if (j.clubeId) expect(estado.clubes[j.clubeId]).toBeTruthy();
    for (const c of Object.values(estado.clubes)) {
      // Série D e clubes leves (sem jogadores, das divisões de baixo) ficam de fora; as seleções jogam com os convocados
      // dos clubes (o elenco delas é só quem joga fora dos clubes do jogo).
      if (c.serie === "D" || c.leve || c.serie === "selecao") continue;
      const elenco = elencoDe(estado, c.id);
      for (const pos of Object.keys(MINIMO_POSICAO) as Posicao[]) {
        expect(elenco.filter((j) => j.posicao === pos).length).toBeGreaterThanOrEqual(MINIMO_POSICAO[pos]);
      }
    }
    // Só ficam jogados os das competições de seleções que atravessam o ano (a Liga das Nações de 2026 acaba em junho de 2027).
    expect(estado.partidas.every((p) => !p.jogada || p.serie.startsWith("S-"))).toBe(true);
    expect(livres(estado).length).toBeGreaterThan(0);
  });

  it("na virada, os últimos da 1ª divisão de cada país da América do Sul caem e os primeiros da 2ª sobem; as divisões ficam do mesmo tamanho", () => {
    // A virada é do teste de cima (rodando só este, ela acontece aqui).
    if (estado.temporada === 2026) avancar(estado);
    expect(estado.temporada).toBe(2027);
    for (const { pais, n, tamanhos, caem, sobem } of trocasEsperadas) {
      expect(n, pais).toBeGreaterThan(0);
      expect([caem.length, sobem.length], pais).toEqual([n, n]);
      for (const id of caem) expect(estado.clubes[id].liga, `${pais}: ${id} caiu`).toBe(`${pais}2`);
      for (const id of sobem) expect(estado.clubes[id].liga, `${pais}: ${id} subiu`).toBe(pais);
      const [primeira, segunda] = [estado.torneios?.[`L-${pais}`], estado.torneios?.[`L-${pais}2`]];
      expect([primeira?.clubes.length, segunda?.clubes.length], pais).toEqual(tamanhos);
      for (const id of sobem) expect(primeira?.clubes, pais).toContain(id);
      for (const id of caem) expect(segunda?.clubes, pais).toContain(id);
    }
  });

  it("é determinística: mesma semente, mesmos campeões", () => {
    const outro = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 7 });
    outro.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(outro);
    avancar(outro);
    expect(outro.historico[0].campeoes).toEqual(estado.historico[0].campeoes);
  });
});
