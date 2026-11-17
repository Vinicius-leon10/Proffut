// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { DEFINICOES, nomeDaCopa, vagasDasCopas } from "../copas";
import { acertarParticipantes, novoJogo, simularRestoDaTemporada } from "../jogo";
import { checarEstado } from "../checagem";
import { PAISES } from "../torneios";
import { elencoDe } from "../mercado";
import type { IdTorneio } from "../tipos";
import asiaClubesJson from "../../../data/asia-2026/clubes.json";
import asiaJogadoresJson from "../../../data/asia-2026/jogadores.json";
import mundoClubesJson from "../../../data/mundo-2026/clubes.json";
import mundoJogadoresJson from "../../../data/mundo-2026/jogadores.json";
import convocadosJson from "../../../data/selecoes-2026/convocados.json";


describe("Ásia (projeto jogo completo, parte 2, nov/2026): a 1ª divisão do Japão, da Coreia do Sul, da Arábia Saudita e da Austrália", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 21 });

  it("as 4 ligas com os 62 clubes e os elencos de verdade", () => {
    const tamanhos: Record<string, number> = { JP: 20, KR: 12, SA: 18, AU: 12 };
    for (const [liga, n] of Object.entries(tamanhos)) {
      expect(PAISES[liga]?.regiao, liga).toBe("asia");
      expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBe(n);
    }
    expect((asiaClubesJson.clubes as { id: string }[]).length).toBe(62);
    const elencos = asiaJogadoresJson.elencos as Record<string, { nome: string }[]>;
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      expect(elenco.length, clubeId).toBeGreaterThanOrEqual(18);
      for (const r of reais.slice(0, 3)) expect(elenco.some((j) => j.nome === r.nome), `${r.nome} (${clubeId})`).toBe(true);
    }
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    expect(media("al-hilal")).toBeGreaterThan(media("al-hazem") + 8);
    // A Ásia joga a liga sem acesso nem queda e fica fora das copas da UEFA.
    for (const id of ["K-UCL", "K-UEL", "K-UECL"] as const) expect(estado.copas?.[id]?.clubes.some((c) => estado.clubes[c].pais === "JP")).toBe(false);
  });

  it("os convocados que jogam nesses clubes estão só no clube (sem cópia jogando fora)", () => {
    const asiaticos = new Set((asiaClubesJson.clubes as { id: string }[]).map((c) => c.id));
    let vistos = 0;
    for (const s of Object.values(convocadosJson.selecoes as Record<string, { convocados: { clubeDoJogo?: string; noJogo?: string }[] }>)) {
      for (const c of s.convocados) {
        if (!c.clubeDoJogo || !asiaticos.has(c.clubeDoJogo)) continue;
        vistos++;
        const iguais = Object.values(estado.jogadores).filter((j) => j.nome === c.noJogo && (j.clubeId === c.clubeDoJogo || j.clubeFora));
        expect(iguais.map((j) => j.clubeId), c.noJogo).toEqual([c.clubeDoJogo]);
      }
    }
    expect(vistos).toBeGreaterThanOrEqual(50);
  });

  it("Liga dos Campeões da Ásia: 16 clubes (Arábia Saudita 5, Japão 4, Coreia do Sul 4, Austrália 3) em 4 grupos; vai até a final em campo neutro; o campeão vai ao Mundial de Clubes com os da Liga dos Campeões, da Libertadores e da Concacaf", () => {
    const afc = estado.copas?.["K-AFC"];
    expect(afc?.clubes).toHaveLength(16);
    const porPais = (pais: string) => afc!.clubes.filter((c) => estado.clubes[c].pais === pais).length;
    expect([porPais("SA"), porPais("JP"), porPais("KR"), porPais("AU")]).toEqual([5, 4, 4, 3]);
    expect(afc?.grupos?.grupos).toHaveLength(4);
    expect(nomeDaCopa("K-AFC")).toBe("Liga dos Campeões da Ásia");
    expect(DEFINICOES.find((d) => d.id === "K-AFC")?.grupo).toBe("afc");
    // O Mundial de Clubes só começa em 2027 (com os campeões de 2026).
    expect(estado.copas?.["K-MUN"]).toBeUndefined();
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 23 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    expect(e.copas?.["K-AFC"]?.campeao).toBeTruthy();
    expect(e.partidas.filter((p) => p.serie === "K-AFC" && !p.jogada)).toHaveLength(0);
    expect(e.partidas.find((p) => p.serie === "K-AFC" && p.fase === "final")?.neutro).toBe(true);
    const vagas = vagasDasCopas(e);
    // Desde a Liga dos Campeões da África: o campeão da Ásia joga o playoff (com o da África); os outros, a semifinal.
    const campeoes = ["K-UCL", "K-LIB", "K-CONC"].map((id) => e.copas![id as `K-${string}`]!.campeao!);
    expect(vagas["K-MUN"]?.semi?.sort()).toEqual([...new Set(campeoes)].sort());
    expect(vagas["K-MUN"]?.playoff).toContain(e.copas!["K-AFC"]!.campeao);
    expect(vagas["K-AFC"]?.grupos).toHaveLength(16);
  });

  it("África e o resto da Ásia: 25 ligas com os clubes das páginas, elencos de verdade onde a página tem e convocados no clube", () => {
    const ligas = mundoClubesJson.ligas as Record<string, string>;
    expect(Object.keys(ligas)).toHaveLength(25);
    for (const [liga, regiao] of Object.entries(ligas)) {
      expect(PAISES[liga]?.regiao, liga).toBe(regiao);
      expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBeGreaterThanOrEqual(10);
    }
    expect(estado.torneios?.["L-EG" as IdTorneio]?.clubes).toContain("al-ahly");
    const elencos = mundoJogadoresJson.elencos as Record<string, { nome: string }[]>;
    expect(Object.keys(elencos).length).toBeGreaterThanOrEqual(250);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      expect(elenco.length, clubeId).toBeGreaterThanOrEqual(18);
      for (const r of reais.slice(0, 2)) expect(elenco.some((j) => j.nome === r.nome), `${r.nome} (${clubeId})`).toBe(true);
    }
    // Clube sem elenco na página ganha um criado, com o mínimo de cada posição.
    const semElenco = (mundoClubesJson.clubes as { id: string }[]).find((c) => !elencos[c.id])!;
    expect(elencoDe(estado, semElenco.id).length).toBeGreaterThanOrEqual(18);
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    expect(media("al-ahly")).toBeGreaterThan(media("kahrbaa-ismailia") + 6);
    // Convocados que jogam nesses clubes: só no clube.
    const doMundo = new Set((mundoClubesJson.clubes as { id: string }[]).map((c) => c.id));
    let vistos = 0;
    for (const [pais, s] of Object.entries(convocadosJson.selecoes as Record<string, { convocados: { clubeDoJogo?: string; noJogo?: string }[] }>)) {
      for (const c of s.convocados) {
        if (!c.clubeDoJogo || !doMundo.has(c.clubeDoJogo)) continue;
        vistos++;
        // Sem cópia "jogando fora" pela mesma seleção (há homônimos em seleções diferentes, como o Khaled Ibrahim).
        const iguais = Object.values(estado.jogadores).filter((j) => j.nome === c.noJogo && (j.clubeId === c.clubeDoJogo || j.clubeId === `sel-${pais}`));
        expect(iguais.map((j) => j.clubeId), c.noJogo).toEqual([c.clubeDoJogo]);
      }
    }
    expect(vistos).toBeGreaterThanOrEqual(200);
  });

  it("Liga dos Campeões da África: 16 clubes (Egito 3, Marrocos 3, África do Sul 2, Tunísia 2, Argélia 2, Nigéria, Gana, Tanzânia e Angola 1) em 4 grupos; vai até a final em campo neutro; o campeão vai ao Mundial de Clubes", () => {
    const caf = estado.copas?.["K-CAF"];
    expect(caf?.clubes).toHaveLength(16);
    const porPais = (pais: string) => caf!.clubes.filter((c) => estado.clubes[c].pais === pais).length;
    expect(["EG", "MA", "ZA", "TN", "DZ", "NG", "GH", "TZ", "AO"].map(porPais)).toEqual([3, 3, 2, 2, 2, 1, 1, 1, 1]);
    expect(caf?.grupos?.grupos).toHaveLength(4);
    expect(nomeDaCopa("K-CAF")).toBe("Liga dos Campeões da África");
    expect(DEFINICOES.find((d) => d.id === "K-CAF")?.grupo).toBe("caf");
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 24 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    expect(e.copas?.["K-CAF"]?.campeao).toBeTruthy();
    expect(e.partidas.filter((p) => p.serie === "K-CAF" && !p.jogada)).toHaveLength(0);
    expect(e.partidas.find((p) => p.serie === "K-CAF" && p.fase === "final")?.neutro).toBe(true);
    const vagas = vagasDasCopas(e);
    expect(vagas["K-MUN"]?.playoff).toContain(e.copas!["K-CAF"]!.campeao);
    expect(vagas["K-CAF"]?.grupos).toHaveLength(16);
  });

  it("save de antes da Ásia: abrir o jogo cria os clubes, que jogam a liga na temporada seguinte", () => {
    const antigo = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 22 });
    for (const id of Object.keys(antigo.clubes)) if (["JP", "KR", "SA", "AU"].includes(antigo.clubes[id].pais ?? "")) delete antigo.clubes[id];
    for (const j of Object.values(antigo.jogadores)) if (j.clubeId && !antigo.clubes[j.clubeId]) delete antigo.jogadores[j.id];
    for (const t of ["L-JP", "L-KR", "L-SA", "L-AU"] as IdTorneio[]) delete antigo.torneios![t];
    antigo.partidas = antigo.partidas.filter((p) => antigo.clubes[p.mandante] && antigo.clubes[p.visitante]);
    acertarParticipantes(antigo);
    expect(antigo.clubes["urawa-reds"]?.liga).toBe("JP");
    expect(elencoDe(antigo, "urawa-reds").length).toBeGreaterThanOrEqual(18);
    expect(checarEstado(antigo).filter((p) => p.gravidade === "erro")).toEqual([]);
  });
});
