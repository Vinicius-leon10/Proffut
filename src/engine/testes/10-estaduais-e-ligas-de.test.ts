// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, juntarAoSaveAntigo, novoJogo, simularRestoDaTemporada } from "../jogo";
import { checarEstado } from "../checagem";
import { divisaoDaLiga, inicioDoAno, tabelaDoTorneio } from "../torneios";
import { elencoDe } from "../mercado";
import type { EstadoTorneio } from "../tipos";


describe("estaduais e ligas de fora", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "palmeiras", semente: 21 });
  estado.config.escalacaoAutomatica = true;
  const torneios = Object.values(estado.torneios!).filter((t): t is EstadoTorneio => !!t);
  const estaduais = torneios.filter((t) => t.tipo === "estadual");
  const ligas = torneios.filter((t) => t.tipo === "liga");
  const domingo = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay() === 0;
  const inicioDasSeries = () => estado.partidas.filter((p) => p.serie === "A").map((p) => p.data).sort()[0];

  it("o jogo novo começa em janeiro, uma semana antes dos 27 estaduais, que são aos domingos e acabam antes das séries", () => {
    expect(estaduais).toHaveLength(27);
    expect(estado.data).toBe(inicioDoAno(2026));
    expect(estado.data.startsWith("2026-01")).toBe(true);
    expect(estado.clubes.palmeiras.estadual).toBe("SP");
    for (const t of estaduais) {
      expect(t.clubes.length, t.id).toBeGreaterThanOrEqual(4);
      for (const id of t.clubes) expect(estado.clubes[id].estadual, id).toBe(t.id.slice(2));
      for (const p of estado.partidas.filter((x) => x.serie === t.id)) {
        expect(domingo(p.data)).toBe(true);
        expect(p.data < inicioDasSeries()).toBe(true);
      }
    }
  });

  it("as ligas de fora (as divisões dos 9 países da Conmebol e as da Concacaf) têm os clubes de lá, com elenco (os leves, sem), e não jogam as competições do Brasil", () => {
    const paises = ["AR", "BO", "CL", "CO", "EC", "PE", "PY", "UY", "VE"];
    const ids = ligas.map((t) => t.id);
    for (const p of paises) for (const id of [`L-${p}`, `L-${p}2`]) expect(ids, id).toContain(id);
    // A Concacaf: México, MLS e Canadá, os 7 da América Central e o Caribe.
    for (const id of ["L-MX", "L-MX2", "L-US", "L-US2", "L-CA", "L-CR", "L-HN", "L-GT", "L-SV", "L-PA", "L-NI", "L-JM"]) expect(ids, id).toContain(id);
    for (const t of ligas) {
      expect(t.clubes.length, t.id).toBeGreaterThanOrEqual(4);
      for (const id of t.clubes) {
        const c = estado.clubes[id];
        expect(c.serie).toBe("exterior");
        expect(c.pais).toBe(divisaoDaLiga(t.id.slice(2)).pais);
        expect(c.liga).toBe(t.id.slice(2));
        if (c.leve) expect(elencoDe(estado, id), id).toHaveLength(0);
        else expect(elencoDe(estado, id).length, id).toBeGreaterThanOrEqual(16);
        expect(estado.copa!.ranking).not.toContain(id);
      }
    }
    // As 1ª e 2ª divisões da Conmebol têm elenco (nenhum clube leve).
    for (const t of ligas.filter((x) => paises.includes(divisaoDaLiga(x.id.slice(2)).pais) && divisaoDaLiga(x.id.slice(2)).nivel <= 2)) {
      for (const id of t.clubes) expect(estado.clubes[id].leve, id).toBeFalsy();
    }
  });

  it("estaduais com até 11 datas e campeão; ligas com o campeão em primeiro; tudo no histórico", () => {
    simularRestoDaTemporada(estado);
    for (const t of estaduais) {
      expect(t.fase).toBe("encerrada");
      expect(t.clubes).toContain(t.campeao);
      const datas = new Set(estado.partidas.filter((p) => p.serie === t.id).map((p) => p.data));
      expect(datas.size, t.id).toBeLessThanOrEqual(11);
      expect([...datas].every((d) => d < inicioDasSeries())).toBe(true);
    }
    for (const t of ligas) {
      expect(t.fase).toBe("encerrada");
      expect(t.campeao).toBe(tabelaDoTorneio(estado, t)[0].clubeId);
    }
    avancar(estado);
    expect(Object.keys(estado.historico[0].torneios!)).toHaveLength(torneios.length);
    // A temporada seguinte também começa em janeiro, com os estaduais.
    expect(estado.data).toBe(inicioDoAno(2027));
    expect(Object.keys(estado.torneios!).filter((id) => id.startsWith("E-"))).toHaveLength(27);
  });

  it("save de antes dos times novos: ganha os clubes e os elencos ao abrir; os torneios começam na temporada seguinte", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "palmeiras", semente: 22 });
    const novos = Object.values(e.clubes).filter((c) => c.serie === "estadual" || c.serie === "exterior").map((c) => c.id);
    // Volta o save para como era antes: sem esses clubes, sem os elencos da Série D e sem torneios, com a temporada andando.
    for (const j of Object.values(e.jogadores)) {
      if (j.clubeId && (novos.includes(j.clubeId) || e.clubes[j.clubeId].serie === "D")) delete e.jogadores[j.id];
    }
    for (const id of novos) delete e.clubes[id];
    for (const c of Object.values(e.clubes)) delete c.estadual;
    e.partidas = e.partidas.filter((p) => !(p.serie === "D" || p.serie.startsWith("E-") || p.serie.startsWith("L-")));
    delete e.torneios;
    e.partidas[0].jogada = true;
    juntarAoSaveAntigo(e);
    for (const id of novos) expect(e.clubes[id], id).toBeTruthy();
    for (const c of Object.values(e.clubes)) if (!c.leve && c.serie !== "selecao") expect(elencoDe(e, c.id).length, c.id).toBeGreaterThanOrEqual(16);
    expect(e.clubes.palmeiras.estadual).toBe("SP");
    expect(e.torneios).toEqual({});
    expect(checarEstado(e).filter((p) => p.gravidade === "erro")).toEqual([]);
  });
});
