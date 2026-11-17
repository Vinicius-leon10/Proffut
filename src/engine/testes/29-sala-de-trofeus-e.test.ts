// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { assumirClube, avancar, novoJogo, simularDia, simularRestoDaTemporada } from "../jogo";
import { carreiraDoTecnico, descreverPublico, descreverRecorde, titulosDoClube } from "../trofeus";
import { exportarTexto, importarTexto } from "../../save/salvamento";


describe("sala de troféus e recordes", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 71 });
  estado.config.escalacaoAutomatica = true;
  simularRestoDaTemporada(estado);

  it("depois de cada jogo, os recordes de cada clube batem com os jogos disputados (os só do estadual e os de fora ficam de fora)", () => {
    expect(estado.recordes!.desde).toBe(2026);
    for (const [id, clube] of Object.entries(estado.clubes)) {
      const r = estado.recordes!.clubes[id];
      if (clube.serie === "estadual" || clube.serie === "exterior" || clube.serie === "selecao") {
        expect(r).toBeUndefined();
        continue;
      }
      const jogos = estado.partidas.filter((p) => p.jogada && (p.mandante === id || p.visitante === id));
      const saldos = jogos.map((p) => (p.mandante === id ? p.gm - p.gv : p.gv - p.gm));
      expect(r.maiorVitoria ? r.maiorVitoria.pro - r.maiorVitoria.contra : 0).toBe(Math.max(0, ...saldos));
      expect(r.piorDerrota ? r.piorDerrota.pro - r.piorDerrota.contra : 0).toBe(Math.min(0, ...saldos));
      expect(r.maiorPublico!.publico).toBe(Math.max(...jogos.filter((p) => p.mandante === id && !p.neutro).map((p) => p.publico!)));
      // Artilheiros: os gols pelo clube, contados nos lances guardados de cada jogo.
      const gols = new Map<number, number>();
      for (const p of jogos) {
        for (const e of p.eventos) {
          if ((e.tipo === "gol" || e.tipo === "gol-penalti") && e.lado === (p.mandante === id ? 0 : 1) && e.jogador != null) gols.set(e.jogador, (gols.get(e.jogador) ?? 0) + 1);
        }
      }
      expect(r.artilheiros.slice(0, 5).map((a) => a.gols)).toEqual([...gols.values()].sort((a, b) => b - a).slice(0, 5));
    }
  });

  it("na virada, títulos e acessos entram na sala do clube (campeão antes do acesso) e na carreira do técnico", () => {
    avancar(estado);
    const r = estado.historico[0];
    const nomes = (clubeId: string) => titulosDoClube(estado, clubeId).map((t) => `${t.titulo} ${t.temporada}`);
    expect(nomes(r.campeoes.B)).toContain("Campeão da Série B 2026");
    expect(nomes(r.campeoes.B).indexOf("Campeão da Série B 2026")).toBeLessThan(nomes(r.campeoes.B).indexOf("Acesso à Série A 2026"));
    for (const id of r.promovidos.C) expect(nomes(id)).toContain("Acesso à Série B 2026");
    expect(nomes(r.copa!.campeao)).toContain("Campeão da Copa do Brasil 2026");
    expect(nomes(r.copa!.vice)).toContain("Vice da Copa do Brasil 2026");
    const carreira = carreiraDoTecnico(estado);
    expect(carreira.temporadas).toBe(1);
    expect(carreira.clubes).toEqual(["ponte-preta"]);
    expect(carreira.titulos).toEqual(titulosDoClube(estado, "ponte-preta"));
    // Os recordes passam de uma temporada para a outra.
    expect(estado.recordes!.desde).toBe(2026);
    expect(Object.keys(estado.recordes!.clubes).length).toBeGreaterThanOrEqual(60);
  });

  it("save de antes da sala de troféus: os recordes começam pelos jogos já disputados na temporada em andamento", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 72 });
    for (let i = 0; i < 5; i++) {
      avancar(e);
      simularDia(e);
    }
    const aoVivo = structuredClone(e.recordes!);
    delete e.recordes;
    const aberto = importarTexto(exportarTexto(e));
    expect(aberto.recordes!.desde).toBe(2026);
    expect(Object.keys(aberto.recordes!.clubes).sort()).toEqual(Object.keys(aoVivo.clubes).sort());
    for (const [id, r] of Object.entries(aoVivo.clubes)) {
      const m = aberto.recordes!.clubes[id];
      expect([m.maiorVitoria, m.piorDerrota, m.maiorPublico]).toEqual([r.maiorVitoria, r.piorDerrota, r.maiorPublico]);
      expect(m.artilheiros.map((a) => a.gols)).toEqual(r.artilheiros.map((a) => a.gols));
    }
  });

  it("textos dos recordes com o artigo do clube, e os clubes da carreira na ordem", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 73 });
    const jogo = { temporada: 2026, data: "2026-05-02", adversario: "chapecoense", pro: 5, contra: 0, competicao: "B" as const, publico: 12_345 };
    expect(descreverRecorde(e, jogo)).toBe("5 x 0 contra a Chapecoense · Série B 2026");
    expect(descreverPublico(e, jogo)).toBe("12.345 pagantes contra a Chapecoense · Série B 2026");
    assumirClube(e, "remo");
    expect(carreiraDoTecnico(e).clubes).toEqual(["ponte-preta", "remo"]);
    assumirClube(e, "ponte-preta");
    expect(carreiraDoTecnico(e).clubes).toEqual(["ponte-preta", "remo"]);
  });
});
