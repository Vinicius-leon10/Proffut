// R141: ligas do mundo no calendário real (etapa 2a do plano das temporadas reais, docs/PLANO_TEMPORADAS_REAIS.md; pedido
// do usuário, nov/2026: "Em relação a data da temporada, a Europa e a América são diferentes" e "fazer o plano das
// temporadas reais do mundo todo, etapa por etapa"). As ligas de agosto a maio atravessam o ano e viram em 1º de julho.
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularDia } from "../jogo";
import { datasDaJanela } from "../selecoes";
import { temporadaEncerrada } from "../competicoes";
import type { EstadoJogo, IdTorneio } from "../tipos";

const datasDe = (estado: EstadoJogo, id: string) => estado.partidas.filter((p) => p.serie === id).map((p) => p.data).sort();

/** Avança (jogando os jogos do usuário e virando a temporada quando ela acaba) até a data `ate`. */
function avancarAte(estado: EstadoJogo, ate: string) {
  for (let i = 0; i < 2000 && estado.data < ate; i++) {
    const r = avancar(estado);
    if (r.tipo === "jogos-hoje") simularDia(estado);
    else if (r.tipo === "nada") break;
  }
}

describe("ligas no calendário real (R141)", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });

  it("Europa de agosto a maio, 2026/27; Argentina, Japão e Austrália também pelo calendário do país", () => {
    const en = datasDe(estado, "L-EN");
    expect(en.length).toBe(380);
    expect(en[0] >= "2026-08-15").toBe(true);
    expect(en[en.length - 1] <= "2027-05-31").toBe(true);
    expect(estado.torneios?.["L-EN"]?.inicio).toBe(2026);
    const ar = datasDe(estado, "L-AR");
    expect(ar[0] >= "2026-01-24").toBe(true);
    expect(ar[ar.length - 1] <= "2026-12-18").toBe(true);
    const jp = datasDe(estado, "L-JP");
    expect(jp[0] >= "2026-08-01").toBe(true);
    // Austrália: de outubro a maio.
    const au = datasDe(estado, "L-AU");
    expect(au[0] >= "2026-10-01").toBe(true);
    expect(au[au.length - 1] <= "2027-06-30").toBe(true);
  });

  it("as ligas param nas datas FIFA e na pausa de inverno", () => {
    const [quinta, terca] = datasDaJanela(2026, "set");
    for (const id of ["L-EN", "L-ES", "L-AR", "L-DE"]) {
      expect(datasDe(estado, id).some((d) => d >= quinta && d <= terca), id).toBe(false);
    }
    expect(datasDe(estado, "L-DE").some((d) => d >= "2026-12-21" && d <= "2027-01-08")).toBe(false);
  });

  it("na virada de dezembro a liga inglesa segue; em 1º de julho ela vira: campeão no histórico, acesso e queda, 2027/28", () => {
    expect(estado.torneios!["L-EN2" as IdTorneio]!.inicio).toBe(2026);
    avancarAte(estado, "2027-01-01");
    expect(estado.temporada).toBe(2027);
    // Nenhum jogo ficou para trás na virada.
    expect(estado.partidas.some((p) => !p.jogada && p.data < estado.data)).toBe(false);
    const en = estado.torneios!["L-EN"]!;
    expect(en.inicio).toBe(2026);
    expect(en.fase).toBe("liga");
    expect(estado.partidas.filter((p) => p.serie === "L-EN" && p.jogada).length).toBeGreaterThan(100);
    expect(estado.partidas.filter((p) => p.serie === "L-EN" && !p.jogada).length).toBeGreaterThan(100);
    // A Série A de 2027 já existe.
    expect(estado.partidas.some((p) => p.serie === "A" && p.data.startsWith("2027"))).toBe(true);

    avancarAte(estado, "2027-06-01");
    const final2026 = estado.torneios!["L-EN"]!;
    expect(final2026.fase).toBe("encerrada");
    const campeao = final2026.campeao!;
    avancarAte(estado, "2027-07-02");
    expect(estado.historico.find((h) => h.temporada === 2026)?.torneios?.["L-EN"]?.campeao).toBe(campeao);
    expect(estado.ultimaTabela?.EN?.[0]).toBe(campeao);
    const nova = estado.torneios!["L-EN"]!;
    expect(nova.inicio).toBe(2027);
    expect(nova.fase).toBe("liga");
    expect(nova.clubes.length).toBe(20);
    // Os 3 últimos caíram para a 2ª divisão.
    for (const id of estado.ultimaTabela!.EN.slice(-3)) expect(estado.clubes[id].liga).toBe("EN2");
    expect(datasDe(estado, "L-EN")[0] >= "2027-08-15").toBe(true);
    expect(temporadaEncerrada(estado)).toBe(false);
  }, 600_000);
});
