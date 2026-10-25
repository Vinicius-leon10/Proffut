import { describe, expect, it } from "vitest";
import { turnoEReturno, turnoUnico } from "./calendario";
import { SERIES, classificacao, tabelaDaLiga, temporadaEncerrada } from "./competicoes";
import { MAX_SUBSTITUICOES, MINIMO_POSICAO } from "./constantes";
import { assumirClube, avancar, novoJogo, prepararJogos, propostasDeEmprego, simularDia, simularRestoDaTemporada } from "./jogo";
import { elencoDe, fazerOferta, limiteDaProposta, livres, pedirMais } from "./mercado";
import { enviarMensagem } from "./mensagens";
import { avancarMinuto, simularAteOFim, substituir } from "./partida";
import { criarRng, rngPara } from "./rng";
import type { EstadoJogo, Partida, Posicao } from "./tipos";
import { exportarTexto, importarTexto } from "../save/salvamento";
import jogadoresJson from "../../data/brasil-2026/jogadores.json";

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

describe("elencos reais", () => {
  it("o jogo novo usa os jogadores de data/brasil-2026/jogadores.json, completando o mínimo por posição", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    const elencos = jogadoresJson.elencos as Record<string, { nome: string; posicao: string; lado: string; idade: number; forca: number; nacionalidade?: string }[]>;
    expect(Object.keys(elencos)).toHaveLength(60);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais) {
        const j = elenco.find((x) => x.nome === r.nome && x.posicao === r.posicao);
        expect(j, `${r.nome} (${clubeId})`).toBeDefined();
        expect([j!.idade, j!.forca, j!.lado, j!.nacionalidade]).toEqual([r.idade, r.forca, r.lado, r.nacionalidade ?? "BRA"]);
      }
      for (const pos of ["G", "L", "Z", "M", "A"] as Posicao[]) expect(elenco.filter((x) => x.posicao === pos).length).toBeGreaterThanOrEqual(MINIMO_POSICAO[pos] + 1);
    }
  });
});

describe("pedir mais numa proposta recebida", () => {
  function preparar() {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 11 });
    const j = elencoDe(estado, "ponte-preta").filter((x) => x.posicao === "M").at(-1)!;
    enviarMensagem(estado, { tipo: "proposta", titulo: `Proposta por ${j.nome}`, texto: "", proposta: { jogadorId: j.id, clubeId: "flamengo", valor: 1_000_000, validaAte: "2026-12-31" } });
    return { estado, j, m: estado.mensagens[0] };
  }
  const passo = (v: number) => Math.floor(v / 10_000) * 10_000;

  it("até 5% a mais o clube sempre aceita e paga o valor pedido", () => {
    const { estado, j, m } = preparar();
    const caixa = estado.clubes["ponte-preta"].caixa;
    expect(pedirMais(estado, m.id, 1_050_000).ok).toBe(true);
    expect(j.clubeId).toBe("flamengo");
    expect(estado.clubes["ponte-preta"].caixa).toBe(caixa + 1_050_000);
    expect(m.proposta!.resolvida).toBe("aceita");
  });

  it("acima do limite o clube melhora a oferta uma vez; insistir acima do limite faz ele desistir", () => {
    const { estado, j, m } = preparar();
    const limite = limiteDaProposta(estado, m);
    expect(limite).toBeGreaterThanOrEqual(1_050_000);
    pedirMais(estado, m.id, passo(limite * 1.2));
    expect(m.proposta!.resolvida).toBeUndefined();
    expect(m.proposta!.valor).toBeGreaterThan(1_000_000);
    expect(m.proposta!.valor).toBeLessThanOrEqual(limite);
    expect(m.texto).toContain("subiu a oferta");
    pedirMais(estado, m.id, passo(limite) + 20_000);
    expect(m.proposta!.resolvida).toBe("retirada");
    expect(j.clubeId).toBe("ponte-preta");
  });

  it("na segunda vez, um pedido dentro do limite fecha a venda", () => {
    const { estado, j, m } = preparar();
    const limite = limiteDaProposta(estado, m);
    pedirMais(estado, m.id, passo(limite * 1.2));
    expect(pedirMais(estado, m.id, passo(limite)).ok).toBe(true);
    expect(j.clubeId).toBe("flamengo");
    expect(m.proposta!.valor).toBe(passo(limite));
  });

  it("pedir demais faz o clube desistir na hora, e pedir menos que a oferta não vale", () => {
    const { estado, j, m } = preparar();
    expect(pedirMais(estado, m.id, 900_000).ok).toBe(false);
    expect(m.proposta!.resolvida).toBeUndefined();
    pedirMais(estado, m.id, 5_000_000);
    expect(m.proposta!.resolvida).toBe("retirada");
    expect(j.clubeId).toBe("ponte-preta");
  });
});

describe("Copa do Brasil", () => {
  const FASES = ["fase1", "fase2", "fase3", "fase4", "fase5", "oitavas", "quartas", "semi", "final"];
  const daCopa = (e: EstadoJogo, fase?: string) => e.partidas.filter((p) => p.serie === "CB" && (fase == null || p.fase === fase));
  const novo = (semente: number) => novoJogo({ nomeTecnico: "T", clubeId: "avai", semente });

  it("o jogo novo monta a Copa de 2026: 126 clubes, 1ª fase só com os 28 piores do ranking e a Série A na 5ª fase", () => {
    const e = novo(31);
    const copa = e.copa!;
    expect(copa.fase).toBe("fase1");
    expect(new Set(copa.ranking).size).toBe(126);
    expect(copa.entram.fase1).toHaveLength(28);
    expect(copa.entram.fase2).toHaveLength(74);
    expect([...copa.entram.fase3!].sort()).toEqual(["barra-sc", "confianca", "paysandu", "ponte-preta"]);
    expect([...copa.entram.fase5!].sort()).toEqual(Object.values(e.clubes).filter((c) => c.serie === "A").map((c) => c.id).sort());
    for (const id of copa.entram.fase1!) {
      expect(e.clubes[id].serie).toBe("D");
      expect(elencoDe(e, id).length).toBeGreaterThanOrEqual(16);
    }
    const jogos = daCopa(e, "fase1");
    expect(jogos).toHaveLength(14);
    for (const p of jogos) {
      expect(p.data).toBe("2026-04-08");
      // Jogo único: o pior colocado no ranking tem o mando.
      expect(copa.ranking.indexOf(p.mandante)).toBeGreaterThan(copa.ranking.indexOf(p.visitante));
    }
    expect(e.clubes[copa.entram.fase1![0]].extrato.some((l) => l.descricao.includes("Copa do Brasil"))).toBe(true);
  });

  describe("uma temporada inteira", () => {
    const e = novo(32);
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);

    it("joga todas as fases com o número certo de jogos e termina com campeão e vice", () => {
      expect(temporadaEncerrada(e)).toBe(true);
      expect(FASES.map((f) => daCopa(e, f).length)).toEqual([14, 44, 24, 12, 32, 16, 8, 4, 1]);
      expect(daCopa(e).every((p) => p.jogada)).toBe(true);
      expect(e.copa!.fase).toBe("encerrada");
      expect(e.copa!.campeao).toBeTruthy();
      expect(e.copa!.vice).toBeTruthy();
      const [final] = daCopa(e, "final");
      expect(final.neutro).toBe(true);
      expect([final.mandante, final.visitante].sort()).toEqual([e.copa!.campeao, e.copa!.vice].sort());
      expect(final.data >= e.partidas.filter((p) => p.serie !== "CB").map((p) => p.data).sort().at(-1)!).toBe(true);
    });

    it("empate em jogo único ou no agregado vai para os pênaltis", () => {
      for (const p of daCopa(e).filter((x) => x.perna === undefined && x.gm === x.gv)) expect(p.penaltis).toBeTruthy();
      for (const f of ["fase5", "oitavas", "quartas", "semi"]) {
        const jogos = daCopa(e, f);
        for (const volta of jogos.filter((p) => p.perna === 2)) {
          const ida = jogos.find((p) => p.perna === 1 && p.chave === volta.chave)!;
          const golsDoMandanteDaVolta = volta.gm + ida.gv;
          const golsDoVisitanteDaVolta = volta.gv + ida.gm;
          if (golsDoMandanteDaVolta === golsDoVisitanteDaVolta) expect(volta.penaltis).toBeTruthy();
          else expect(volta.penaltis).toBeUndefined();
        }
      }
    });

    it("quem passa de fase é quem venceu, a Série A entra na 5ª fase e ninguém joga duas vezes no mesmo dia", () => {
      const fase5 = new Set(daCopa(e, "fase5").flatMap((p) => [p.mandante, p.visitante]));
      expect(fase5.size).toBe(32);
      for (const id of e.copa!.entram.fase5!) expect(fase5.has(id)).toBe(true);
      const datas = new Map<string, string>();
      for (const p of e.partidas) {
        for (const id of [p.mandante, p.visitante]) {
          expect(datas.get(`${id}|${p.data}`), `${id} em ${p.data}`).toBeUndefined();
          datas.set(`${id}|${p.data}`, p.id);
        }
      }
    });

    it("o campeão recebe a premiação da final", () => {
      const campeao = e.clubes[e.copa!.campeao!];
      expect(campeao.extrato.some((l) => l.descricao === "Copa do Brasil: campeão")).toBe(true);
    });

    it("na virada, o campeão vai para o histórico e a Copa seguinte começa com os 4 que subiram da Série C na 3ª fase", () => {
      const campeao = e.copa!.campeao;
      const subiramDaC = [...e.series.C.promovidos].sort();
      expect(avancar(e).tipo).toBe("nova-temporada");
      expect(e.historico[0].copa?.campeao).toBe(campeao);
      expect(e.copa!.fase).toBe("fase1");
      expect([...e.copa!.entram.fase3!].sort()).toEqual(subiramDaC);
      expect(daCopa(e, "fase1")).toHaveLength(14);
      expect(daCopa(e).every((p) => !p.jogada && p.id.startsWith("2027-"))).toBe(true);
      // Elencos montados só para a Copa não se acumulam de um ano para o outro.
      for (const c of Object.values(e.clubes)) if (c.elencoDaCopa) expect(elencoDe(e, c.id).length).toBe(16);
    });
  });

  it("um save antigo, sem a Copa, termina a temporada e ganha a Copa no ano seguinte", () => {
    const e = novo(33);
    e.config.escalacaoAutomatica = true;
    delete e.copa;
    e.partidas = e.partidas.filter((p) => p.serie !== "CB");
    simularRestoDaTemporada(e);
    expect(temporadaEncerrada(e)).toBe(true);
    expect(avancar(e).tipo).toBe("nova-temporada");
    const copaDe = (x: EstadoJogo) => x.copa;
    expect(copaDe(e)?.fase).toBe("fase1");
  });
});
