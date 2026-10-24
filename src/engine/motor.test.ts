import { describe, expect, it } from "vitest";
import { turnoEReturno, turnoUnico } from "./calendario";
import { SERIES, classificacao, tabelaDaLiga, temporadaEncerrada } from "./competicoes";
import { MAX_SUBSTITUICOES, MINIMO_POSICAO } from "./constantes";
import { assumirClube, avancar, novoJogo, prepararJogos, propostasDeEmprego, simularDia, simularRestoDaTemporada } from "./jogo";
import { elencoDe, fazerOferta, livres } from "./mercado";
import { avancarMinuto, simularAteOFim, substituir } from "./partida";
import { criarRng, rngPara } from "./rng";
import type { EstadoJogo, Partida, Posicao } from "./tipos";
import { exportarTexto, importarTexto } from "../save/salvamento";

const clubes = Array.from({ length: 20 }, (_, i) => `c${i}`);

describe("calendário", () => {
  it("turno e returno: 38 rodadas, todos se enfrentam duas vezes com mando invertido", () => {
    const rodadas = turnoEReturno(clubes, criarRng(1));
    expect(rodadas).toHaveLength(38);
    const jogos = rodadas.flat();
    expect(jogos).toHaveLength(380);
    for (const r of rodadas) expect(new Set(r.flat()).size).toBe(20);
    const pares = new Set(jogos.map(([a, b]) => `${a}>${b}`));
    expect(pares.size).toBe(380);
    for (const c of clubes) expect(jogos.filter(([m]) => m === c)).toHaveLength(19);
  });

  it("turno único: 19 rodadas, cada par uma vez, mando equilibrado", () => {
    const rodadas = turnoUnico(clubes, criarRng(2));
    expect(rodadas).toHaveLength(19);
    const jogos = rodadas.flat();
    const pares = new Set(jogos.map(([a, b]) => [a, b].sort().join("-")));
    expect(pares.size).toBe(190);
    for (const c of clubes) {
      const casa = jogos.filter(([m]) => m === c).length;
      expect(casa === 9 || casa === 10).toBe(true);
    }
  });
});

describe("gerador aleatório", () => {
  it("mesma chave, mesma sequência", () => {
    const a = rngPara(42, "x");
    const b = rngPara(42, "x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rngPara(42, "y")()).not.toEqual(rngPara(42, "x")());
  });
});

function partida(mandante: string, visitante: string, gm: number, gv: number): Partida {
  return { id: `${mandante}${visitante}`, serie: "A", fase: "liga", rodada: 1, data: "2026-04-04", mandante, visitante, jogada: true, gm, gv, eventos: [] };
}

describe("classificação", () => {
  it("desempata por vitórias, saldo, gols pró e confronto direto", () => {
    const estado = { semente: 1, temporada: 2026, partidas: [
      partida("a", "b", 2, 0), // a vence b
      partida("b", "c", 1, 0),
      partida("c", "a", 1, 0),
      partida("d", "e", 0, 0),
      partida("e", "d", 0, 0),
    ] } as unknown as EstadoJogo;
    const t = classificacao(estado, "A", "liga", ["a", "b", "c", "d", "e"]);
    // a, b e c têm 3 pontos e 1 vitória; a tem saldo +1, b 0 (1-2), c 0 (1-1)... c tem mais gols pró que b? não: b 1, c 1.
    expect(t[0].clubeId).toBe("a");
    expect(t.map((l) => l.pts)).toEqual([3, 3, 3, 2, 2]);
    expect(t.map((l) => l.pos)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("temporada completa", () => {
  const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 7 });
  estado.config.escalacaoAutomatica = true;
  simularRestoDaTemporada(estado);

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
      if (c.serie === "D") continue;
      const elenco = elencoDe(estado, c.id);
      for (const pos of Object.keys(MINIMO_POSICAO) as Posicao[]) {
        expect(elenco.filter((j) => j.posicao === pos).length).toBeGreaterThanOrEqual(MINIMO_POSICAO[pos]);
      }
    }
    expect(estado.partidas.every((p) => !p.jogada)).toBe(true);
    expect(livres(estado).length).toBeGreaterThan(0);
  });

  it("é determinística: mesma semente, mesmos campeões", () => {
    const outro = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 7 });
    outro.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(outro);
    avancar(outro);
    expect(outro.historico[0].campeoes).toEqual(estado.historico[0].campeoes);
  });
});

describe("partida", () => {
  it("termina, respeita o limite de substituições e registra o placar", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 3 });
    avancar(estado);
    const vivas = prepararJogos(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const lado = pv.lados[0].clubeId === "flamengo" ? 0 : 1;
    for (let i = 0; i < 10; i++) avancarMinuto(pv, estado.jogadores);
    for (let i = 0; i < MAX_SUBSTITUICOES; i++) {
      const sai = pv.lados[lado].emCampo[i + 1].jogadorId;
      expect(substituir(pv, lado, sai, pv.lados[lado].banco[0], estado.jogadores)).toBeNull();
    }
    const ultimo = pv.lados[lado].banco[0];
    if (ultimo != null) expect(substituir(pv, lado, pv.lados[lado].emCampo[1].jogadorId, ultimo, estado.jogadores)).toMatch(/substituições/);
    simularAteOFim(pv, estado.jogadores);
    expect(pv.terminada).toBe(true);
    expect(pv.minuto).toBeGreaterThanOrEqual(90);
  });
});

describe("mercado e save", () => {
  it("compra respeita o caixa e o save vai e volta do arquivo", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 5 });
    const caro = Object.values(estado.jogadores).filter((j) => j.clubeId === "flamengo").sort((a, b) => b.forca - a.forca)[0];
    const r = fazerOferta(estado, caro.id, estado.clubes.brusque.caixa + 1);
    expect(r.ok).toBe(false);
    avancar(estado);
    simularDia(estado);
    const volta = importarTexto(exportarTexto(estado));
    expect(volta.data).toBe(estado.data);
    expect(Object.keys(volta.jogadores)).toHaveLength(Object.keys(estado.jogadores).length);
    expect(() => importarTexto("{}")).toThrow();
  });
});

describe("mando de campo", () => {
  it("ninguém joga mais de 2 vezes seguidas em casa ou fora no turno", () => {
    const rodadas = turnoUnico(clubes, criarRng(9));
    for (const c of clubes) {
      const seq = rodadas.map((r) => (r.some(([m]) => m === c) ? "C" : "F")).join("");
      expect(seq).not.toMatch(/CCC|FFF/);
    }
  });
});

describe("rebaixado para a Série D", () => {
  it("o técnico recebe propostas da Série C e assume outro clube", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "itabaiana", semente: 11 });
    estado.config.escalacaoAutomatica = true;
    for (const j of elencoDe(estado, "itabaiana")) j.forca = 5;
    simularRestoDaTemporada(estado);
    expect(estado.series.C.rebaixados).toContain("itabaiana");
    avancar(estado);
    expect(estado.clubes.itabaiana.serie).toBe("D");
    const propostas = propostasDeEmprego(estado);
    expect(propostas).toHaveLength(4);
    for (const id of propostas) expect(estado.clubes[id].serie).toBe("C");
    assumirClube(estado, propostas[0]);
    expect(estado.tecnico.clubeId).toBe(propostas[0]);
  });
});

describe("escalação depois da virada", () => {
  it("só tem jogadores que continuam no clube", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "gremio", semente: 13 });
    simularRestoDaTemporada(estado);
    avancar(estado);
    for (const c of Object.values(estado.clubes)) {
      for (const id of [...c.escalacao.titulares, ...c.escalacao.reservas]) {
        if (id != null) expect(estado.jogadores[id]?.clubeId).toBe(c.id);
      }
    }
  });
});

describe("checagem do save", () => {
  it("um jogo novo passa sem problemas e a partida de teste roda sem mexer no save", async () => {
    const { checarEstado, testarPartida } = await import("./checagem");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 21 });
    expect(checarEstado(estado)).toEqual([]);
    const antes = JSON.stringify(estado);
    expect(testarPartida(estado).ok).toBe(true);
    expect(JSON.stringify(estado)).toBe(antes);
  });

  it("encontra e corrige problemas", async () => {
    const { checarEstado, repararEstado } = await import("./checagem");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 22 });
    const [a, b] = elencoDe(estado, "bahia");
    a.clubeId = "clube-que-nao-existe";
    b.energia = Number.NaN;
    estado.clubes.bahia.escalacao.titulares[0] = 999_999;
    estado.proximoIdJogador = 1;
    const problemas = checarEstado(estado);
    expect(problemas.length).toBeGreaterThanOrEqual(4);
    expect(problemas.every((p) => p.reparavel)).toBe(true);
    expect(repararEstado(estado).length).toBeGreaterThan(0);
    expect(checarEstado(estado)).toEqual([]);
  });
});

describe("estádio", () => {
  it("ampliação e modernização: custo, obra e entrega", async () => {
    const { ampliarEstadio, modernizarEstadio, concluirObras, custoAmpliacao, impactoModernizacao } = await import("./estadio");
    const { somarDias } = await import("./calendario");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 31 });
    const clube = estado.clubes.vasco;
    clube.caixa = 100_000_000;
    const capacidade = clube.estadio.capacidade;
    expect(ampliarEstadio(estado, 100_000).ok).toBe(false); // passa do limite
    const r = ampliarEstadio(estado, 2_000);
    expect(r.ok).toBe(true);
    expect(clube.caixa).toBe(100_000_000 - custoAmpliacao(clube, 2_000));
    expect(modernizarEstadio(estado).ok).toBe(false); // já tem obra
    concluirObras(estado, somarDias(estado.data, 7));
    expect(clube.estadio.capacidade).toBe(capacidade); // ainda em obra
    concluirObras(estado, clube.estadio.obra!.terminaEm);
    expect(clube.estadio.capacidade).toBe(capacidade + 2_000);
    expect(clube.estadio.obra).toBeUndefined();
    expect(impactoModernizacao(clube).publicoDepois).toBeGreaterThanOrEqual(impactoModernizacao(clube).publicoAntes);
    expect(modernizarEstadio(estado).ok).toBe(true);
    concluirObras(estado, clube.estadio.obra!.terminaEm);
    expect(clube.estadio.conforto).toBe(1);
  });

  it("sem dinheiro não começa a obra", async () => {
    const { ampliarEstadio } = await import("./estadio");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 32 });
    estado.clubes.brusque.caixa = 1_000;
    expect(ampliarEstadio(estado, 2_000).ok).toBe(false);
    expect(estado.clubes.brusque.estadio.obra).toBeUndefined();
  });
});
