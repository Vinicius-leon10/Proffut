import { describe, expect, it } from "vitest";
import { CLUBES_FEMININOS, comArtigo } from "./artigos";
import { depoisDoMeuJogo, expirarConvites, gerarConvites, reputacaoDoTecnico, responderConvite } from "./carreira";
import { anosMaximos, avisarContratos, contratosTerminando, pedidoDeRenovacao, renovarContrato } from "./contratos";
import { emprestar, interessadosNoEmprestimo, motivoParaNaoEmprestar, motivoParaNaoPegar, pegarEmprestado, taxaDeEmprestimo } from "./emprestimos";
import { folhaSalarial } from "./financas";
import { capitaoDoTime, forcaDoTime } from "./forca";
import { melhorEmCampo, notaMedia, notasDaPartida } from "./notas";
import { somarDias, turnoEReturno, turnoUnico } from "./calendario";
import { SERIES, classificacao, tabelaDaLiga, temporadaEncerrada } from "./competicoes";
import { MAX_SUBSTITUICOES, MINIMO_POSICAO } from "./constantes";
import { desfechoDoConfronto, situacaoNaCopa } from "./copa";
import { assumirClube, avancar, novoJogo, prepararJogos, propostasDeEmprego, provavelTime, simularDia, simularRestoDaTemporada } from "./jogo";
import { dispensar, elencoDe, fazerOferta, limiteDaProposta, livres, pedirMais, transferenciasDaIa } from "./mercado";
import { enviarMensagem } from "./mensagens";
import { avancarMinuto, cartoes, cobradores, notaCobrador, posseDeBola, simularAteOFim, sobPressao, substituir, type Estatisticas } from "./partida";
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

  it("save de antes de tirar a velocidade 4x abre em 2x", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "brusque", semente: 6 });
    (estado.config as { velocidade: number }).velocidade = 4;
    expect(importarTexto(exportarTexto(estado)).config.velocidade).toBe(2);
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

describe("pênalti na partida", () => {
  it("é marcado num minuto e cobrado no minuto seguinte, sempre antes do fim do tempo", () => {
    const minuto = (m: string) => m.split("+").reduce((a, b) => a + Number(b), 0);
    let marcados = 0;
    for (const semente of [41, 42, 43]) {
      const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
      avancar(estado);
      for (const pv of prepararJogos(estado)) {
        simularAteOFim(pv, estado.jogadores);
        const n = pv.narracao;
        const cobrancas = n.filter((e) => e.tipo === "gol-penalti" || e.tipo === "penalti-perdido").length;
        expect(n.filter((e) => e.tipo === "penalti").length, "cada pênalti marcado é cobrado").toBe(cobrancas);
        n.forEach((e, i) => {
          if (e.tipo !== "penalti") return;
          marcados++;
          const k = n.findIndex((x, j) => j > i && (x.tipo === "gol-penalti" || x.tipo === "penalti-perdido"));
          expect(n.slice(i + 1, k).some((x) => x.tipo === "intervalo" || x.tipo === "fim"), "o tempo não acaba antes da cobrança").toBe(false);
          expect(n[k].lado).toBe(e.lado);
          expect(minuto(n[k].min)).toBe(minuto(e.min) + 1);
        });
      }
    }
    expect(marcados).toBeGreaterThan(0);
  });
});

describe("artigo dos clubes", () => {
  it("Chapecoense, Ponte Preta e os outros clubes que se diz \"a\" ganham \"a\"; o resto, \"o\"", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 51 });
    // Nenhum id da lista escrito errado: todos são clubes do jogo.
    for (const id of CLUBES_FEMININOS) expect(e.clubes[id], id).toBeDefined();
    const ponte = e.clubes["ponte-preta"];
    expect(comArtigo("O", ponte)).toBe("A Ponte Preta");
    expect(comArtigo("do", ponte)).toBe("da Ponte Preta");
    expect(comArtigo("ao", ponte)).toBe("à Ponte Preta");
    expect(comArtigo("pelo", ponte)).toBe("pela Ponte Preta");
    expect(comArtigo("O", e.clubes.flamengo)).toBe("O Flamengo");
    expect(comArtigo("do", e.clubes.flamengo)).toBe("do Flamengo");
    expect(e.mensagens.some((m) => m.titulo === "Bem-vindo à Ponte Preta!")).toBe(true);
  });

  it("mercado: proposta da Chapecoense", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 52 });
    const j = elencoDe(e, "flamengo").filter((x) => x.posicao === "M").at(-1)!;
    enviarMensagem(e, { tipo: "proposta", titulo: `Proposta por ${j.nome}`, texto: "", proposta: { jogadorId: j.id, clubeId: "chapecoense", valor: 1_000_000, validaAte: "2026-12-31" } });
    expect(pedirMais(e, e.mensagens[0].id, 1_050_000).texto).toBe(`A Chapecoense aceitou pagar R$ 1.050.000. ${j.nome} foi vendido.`);
  });

  it("Copa: frases com \"a\" e fase no plural (nas oitavas de final)", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 53 });
    const jogo = (fase: string, extra: Partial<Partida> = {}): Partida => ({
      id: `teste-${fase}`, serie: "CB", fase, chave: 1, rodada: 1, data: "2026-09-02",
      mandante: "ponte-preta", visitante: "flamengo", jogada: true, gm: 0, gv: 1, eventos: [], ...extra,
    });
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta entra na 3ª fase.");
    e.partidas.push(jogo("oitavas", { jogada: false }));
    e.copa!.fase = "oitavas";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta está nas oitavas de final.");
    e.copa!.fase = "quartas";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta foi eliminada nas oitavas de final.");
    e.copa!.vice = "ponte-preta";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta foi vice-campeã.");
    e.copa!.campeao = "ponte-preta";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta é a campeã da Copa do Brasil!");

    const fase4 = jogo("fase4");
    e.partidas.push(fase4);
    expect(desfechoDoConfronto(e, fase4, "ponte-preta")).toBe("A Ponte Preta está fora da Copa do Brasil.");
    const final = jogo("final", { gm: 2, gv: 1, neutro: true });
    e.partidas.push(final);
    expect(desfechoDoConfronto(e, final, "ponte-preta")).toBe("A Ponte Preta é campeã da Copa do Brasil!");
    expect(desfechoDoConfronto(e, final, "flamengo")).toBe("O Flamengo fica com o vice.");
  });

  it("uma temporada inteira com a Ponte Preta: nenhuma mensagem diz \"o Ponte Preta\"", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 54 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    avancar(e);
    const textos = e.mensagens.flatMap((m) => [m.titulo, m.texto]).join("\n");
    expect(textos).toContain("Ponte Preta");
    expect(textos).not.toMatch(/\b(o|do|ao|pelo|no) Ponte Preta/i);
    expect(textos).not.toMatch(/Ponte Preta (foi|é) (o )?(eliminado|rebaixado|campeão|vice-campeão)/);
  });
});

describe("time do adversário antes do jogo", () => {
  it("o provável time titular é o mesmo que entra em campo, e olhar não muda o jogo", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 61 });
    avancar(estado);
    const antes = JSON.stringify(estado.clubes);
    const pv = prepararJogos(structuredClone(estado)).find((x) => x.lados.some((l) => l.clubeId === "ponte-preta"))!;
    const ele = pv.lados.find((l) => l.clubeId !== "ponte-preta")!;
    const provavel = provavelTime(estado, ele.clubeId);
    expect(JSON.stringify(estado.clubes)).toBe(antes);
    expect(provavel.emCampo).toHaveLength(11);
    expect(provavel.emCampo.map((a) => a.jogadorId)).toEqual(ele.emCampo.map((a) => a.jogadorId));
    expect(provavel.tatica.formacao).toBe(ele.tatica.formacao);
  });
});

describe("estatísticas da partida", () => {
  const jogoDoFlamengo = (semente: number, mexer?: (estado: EstadoJogo) => void) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    mexer?.(estado);
    avancar(estado);
    const vivas = prepararJogos(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    return { estado, vivas, pv, lado: (pv.lados[0].clubeId === "flamengo" ? 0 : 1) as 0 | 1 };
  };
  const forcaDoFlamengo = (forca: number) => (estado: EstadoJogo) => {
    for (const j of Object.values(estado.jogadores)) if (j.clubeId === "flamengo") j.forca = forca;
  };
  const minuto = (m: string) => m.split("+").reduce((a, b) => a + Number(b), 0);

  it("só a partida do usuário tem estatísticas, e elas não mudam placar nem lances", () => {
    const com = jogoDoFlamengo(5);
    expect(com.vivas.filter((v) => v.estatisticas).map((v) => v.partidaId)).toEqual([com.pv.partidaId]);
    const sem = jogoDoFlamengo(5);
    sem.pv.estatisticas = undefined;
    simularAteOFim(com.pv, com.estado.jogadores);
    simularAteOFim(sem.pv, sem.estado.jogadores);
    expect(sem.pv.narracao).toEqual(com.pv.narracao);
    expect(sem.pv.lados.map((l) => l.gols)).toEqual(com.pv.lados.map((l) => l.gols));
  });

  it("batem com os lances e têm números de um jogo de verdade", () => {
    const total = { ataques: 0, perigosos: 0, chutes: 0, noGol: 0, escanteios: 0, times: 0 };
    for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { estado, pv } = jogoDoFlamengo(semente);
      simularAteOFim(pv, estado.jogadores);
      const e = pv.estatisticas!;
      const posse = posseDeBola(e);
      expect(posse[0] + posse[1]).toBe(100);
      // Uma linha de ataques perigosos por minuto jogado (os dois tempos, com os acréscimos).
      const intervalo = pv.narracao.find((x) => x.tipo === "intervalo")!;
      expect(e.perigososPorMinuto).toHaveLength(minuto(intervalo.min) + pv.minuto - 45);
      pv.lados.forEach((lado, i) => {
        const s = e.lados[i];
        const lances = pv.narracao.filter((x) => x.lado === i);
        const noAlvo = lances.filter((x) => x.tipo === "gol" || x.tipo === "gol-penalti" || x.tipo === "defesa").length;
        expect(s.chutesNoGol, "gols e defesas do goleiro são chutes no gol").toBeGreaterThanOrEqual(noAlvo);
        expect(s.chutesNoGol).toBeGreaterThanOrEqual(lado.gols);
        expect(s.ataquesPerigosos).toBeLessThanOrEqual(s.ataques);
        expect(cartoes(lado)).toEqual({
          amarelos: lances.filter((x) => x.tipo === "amarelo" || (x.tipo === "vermelho" && x.texto.startsWith("Segundo amarelo"))).length,
          vermelhos: lances.filter((x) => x.tipo === "vermelho").length,
        });
        total.ataques += s.ataques;
        total.perigosos += s.ataquesPerigosos;
        total.chutes += s.chutesNoGol + s.chutesFora;
        total.noGol += s.chutesNoGol;
        total.escanteios += s.escanteios;
        total.times++;
      });
    }
    // Por time e por jogo, como nos aplicativos de futebol.
    const porTime = (n: number) => n / total.times;
    expect(porTime(total.ataques)).toBeGreaterThan(70);
    expect(porTime(total.ataques)).toBeLessThan(130);
    expect(porTime(total.perigosos)).toBeGreaterThan(35);
    expect(porTime(total.perigosos)).toBeLessThan(70);
    expect(porTime(total.chutes)).toBeGreaterThan(8);
    expect(porTime(total.chutes)).toBeLessThan(18);
    expect(porTime(total.noGol)).toBeGreaterThan(2.5);
    expect(porTime(total.noGol)).toBeLessThan(7);
    expect(porTime(total.escanteios)).toBeGreaterThan(3);
    expect(porTime(total.escanteios)).toBeLessThan(8);
  });

  it("o aviso de pressão liga com 14 ataques perigosos do adversário e o triplo dos seus, e só desliga abaixo de 10 ou do dobro", () => {
    const com = (minutos: [number, number][]): Estatisticas => ({ lados: [] as unknown as Estatisticas["lados"], perigososPorMinuto: minutos, rng: criarRng(1) });
    const minutos = (n: number, valor: [number, number]) => Array.from({ length: n }, (): [number, number] => [...valor]);
    const pressao = minutos(15, [0, 1]); // o visitante com um ataque perigoso por minuto
    expect(sobPressao(com(pressao), 0)).toEqual({ deles: 15, nossos: 0 });
    expect(sobPressao(com(pressao), 1)).toBeNull();
    expect(sobPressao(com(pressao.slice(0, 13)), 0), "13 ainda não liga").toBeNull();
    expect(sobPressao(com([...minutos(5, [1, 0]), ...minutos(10, [0, 1.5])]), 0), "15 contra 5 liga (o triplo)").toEqual({ deles: 15, nossos: 5 });
    expect(sobPressao(com([...minutos(6, [1, 0]), ...minutos(9, [0, 1.5])]), 0), "13,5 contra 6 não liga").toBeNull();
    // Depois que liga, fica enquanto o adversário tiver 10 ou mais e o dobro dos seus.
    const calma = [...pressao, ...minutos(6, [0, 0])];
    expect(sobPressao(com(calma.slice(0, 20)), 0)).toEqual({ deles: 10, nossos: 0 });
    expect(sobPressao(com(calma), 0), "9 desliga").toBeNull();
    const reacao = [...pressao, ...minutos(4, [2, 1])]; // meu time reage
    expect(sobPressao(com(reacao.slice(0, 18)), 0), "15 contra 6: menos que o triplo, mas ainda mais que o dobro").toEqual({ deles: 15, nossos: 6 });
    expect(sobPressao(com(reacao), 0), "15 contra 8: menos que o dobro, desliga").toBeNull();
  });

  it("um time muito fraco vê o aviso de pressão quase o jogo todo, e ele não pisca; um time muito forte nunca vê", () => {
    for (const [forca, minimo, maximo] of [[5, 40, 200], [99, 0, 0]] as const) {
      const { estado, pv, lado } = jogoDoFlamengo(9, forcaDoFlamengo(forca));
      let comAviso = 0;
      let trocas = 0;
      let antes = false;
      while (!pv.terminada) {
        avancarMinuto(pv, estado.jogadores);
        const aviso = sobPressao(pv.estatisticas!, lado);
        if (aviso) {
          comAviso++;
          expect(aviso.deles).toBeGreaterThanOrEqual(10);
          expect(aviso.deles).toBeGreaterThanOrEqual(2 * aviso.nossos);
        }
        if (!!aviso !== antes) trocas++;
        antes = !!aviso;
      }
      expect(comAviso, `minutos com aviso (força ${forca})`).toBeGreaterThanOrEqual(minimo);
      expect(comAviso).toBeLessThanOrEqual(maximo);
      expect(trocas, "liga e desliga poucas vezes").toBeLessThanOrEqual(4);
    }
  });
});

describe("carreira do técnico", () => {
  /** Jogo novo depois do primeiro jogo do clube do usuário (devolve a partida jogada). */
  const depoisDoPrimeiroJogo = (clubeId: string, semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId, semente });
    for (let i = 0; i < 10 && !avancarAteMeuJogo(estado); i++) simularDia(estado);
    simularDia(estado);
    const p = estado.partidas.filter((x) => x.jogada && (x.mandante === clubeId || x.visitante === clubeId)).at(-1)!;
    return { estado, p };
  };
  const avancarAteMeuJogo = (estado: EstadoJogo) => {
    const r = avancar(estado);
    return r.tipo === "jogos-hoje" && !!r.meuJogo;
  };
  const mensagens = (estado: EstadoJogo, titulo: string) => estado.mensagens.filter((m) => m.titulo === titulo).length;
  // Lida por função: depois de um `delete`, o TypeScript acharia que a demissão continua vazia.
  const demissaoDe = (estado: EstadoJogo) => estado.tecnico.demissao;

  it("o técnico começa com a reputação do clube; num save antigo, sem ela, vale a do clube atual", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 21 });
    expect(estado.tecnico.reputacao).toBe(estado.clubes["ponte-preta"].reputacao);
    expect(estado.tecnico.desde).toBe(estado.data);
    delete estado.tecnico.reputacao;
    expect(reputacaoDoTecnico(estado)).toBe(estado.clubes["ponte-preta"].reputacao);
  });

  it("com a confiança da diretoria em 20 ou menos, um jogo demite, mas só depois do primeiro mês no clube", () => {
    const { estado, p } = depoisDoPrimeiroJogo("ponte-preta", 21);
    const reputacao = reputacaoDoTecnico(estado);
    estado.tecnico.confiancaDiretoria = 20;
    depoisDoMeuJogo(estado, p);
    expect(estado.tecnico.demissao, "no primeiro mês não demite").toBeUndefined();
    estado.tecnico.desde = somarDias(estado.data, -30);
    depoisDoMeuJogo(estado, p);
    const d = estado.tecnico.demissao!;
    expect(d.clubeId).toBe("ponte-preta");
    expect(estado.tecnico.clubeId, "até escolher, continua ligado ao clube antigo").toBe("ponte-preta");
    expect(reputacaoDoTecnico(estado)).toBe(reputacao - 6);
    // Três clubes das séries do jogo, nenhum acima da reputação dele.
    expect(new Set(d.propostas).size).toBe(3);
    for (const id of d.propostas) {
      expect(id).not.toBe("ponte-preta");
      expect(estado.clubes[id].serie).not.toBe("D");
      expect(estado.clubes[id].reputacao).toBeLessThanOrEqual(reputacaoDoTecnico(estado));
    }
    expect(mensagens(estado, "Você foi demitido")).toBe(1);
    // Assumir uma das propostas encerra a demissão, com diretoria e carência novas.
    assumirClube(estado, d.propostas[0]);
    expect(estado.tecnico).toMatchObject({ clubeId: d.propostas[0], confiancaDiretoria: 55, desde: estado.data });
    expect(estado.tecnico.demissao).toBeUndefined();
  });

  it("com a confiança em 35 ou menos chega o recado de cargo em risco, no máximo um por mês; num save antigo a carência começa no primeiro jogo", () => {
    const { estado, p } = depoisDoPrimeiroJogo("ponte-preta", 22);
    delete estado.tecnico.desde;
    estado.tecnico.confiancaDiretoria = 15;
    depoisDoMeuJogo(estado, p);
    expect(estado.tecnico.desde, "save antigo: a carência começa agora").toBe(estado.data);
    expect(estado.tecnico.demissao).toBeUndefined();
    expect(mensagens(estado, "Cargo em risco")).toBe(1);
    depoisDoMeuJogo(estado, p);
    expect(mensagens(estado, "Cargo em risco"), "não repete no mesmo mês").toBe(1);
    estado.tecnico.avisoDeRisco = somarDias(estado.data, -30);
    depoisDoMeuJogo(estado, p);
    expect(mensagens(estado, "Cargo em risco")).toBe(2);
  });

  it("convites só de clubes maiores, da mesma série ou acima; aceitar troca de clube e derruba os outros; recusado ou vencido, nada muda", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 23 });
    const atual = estado.clubes["ponte-preta"];
    const ids = gerarConvites(estado, 3);
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      const c = estado.clubes[id];
      expect(["A", "B"]).toContain(c.serie);
      expect(c.reputacao).toBeGreaterThan(atual.reputacao + 3);
      expect(c.reputacao).toBeLessThanOrEqual(reputacaoDoTecnico(estado) + 10);
    }
    const convites = estado.mensagens.filter((m) => m.convite);
    expect(convites).toHaveLength(3);
    // Um proposta pendente por um jogador do clube antigo cai junto.
    estado.mensagens.push({ id: 999, data: estado.data, tipo: "proposta", titulo: "", texto: "", lida: false, proposta: { jogadorId: 1, clubeId: ids[0], valor: 1, validaAte: "2099-01-01" } });
    expect(responderConvite(estado, convites[0].id, false).ok).toBe(true);
    expect(convites[0].convite!.resolvido).toBe("recusado");
    expect(estado.tecnico.clubeId).toBe("ponte-preta");
    expect(responderConvite(estado, convites[1].id, true).ok).toBe(true);
    expect(estado.tecnico).toMatchObject({ clubeId: convites[1].convite!.clubeId, confiancaDiretoria: 65 });
    expect(convites[1].convite!.resolvido).toBe("aceito");
    expect(convites[2].convite!.resolvido, "os outros convites caem").toBe("recusado");
    expect(estado.mensagens.find((m) => m.id === 999)!.proposta!.resolvida).toBe("retirada");
    expect(responderConvite(estado, convites[2].id, true).ok, "convite já resolvido não vale").toBe(false);
    // Um convite novo vence depois da data limite.
    gerarConvites(estado, 1);
    const novo = estado.mensagens.find((m) => m.convite && !m.convite.resolvido)!;
    expirarConvites(estado, novo.convite!.validaAte);
    expect(novo.convite!.resolvido).toBeUndefined();
    expirarConvites(estado, somarDias(novo.convite!.validaAte, 1));
    expect(novo.convite!.resolvido).toBe("expirado");
  });

  it("na virada: abaixo do objetivo e sem a confiança da diretoria, demitido; quem sobe ganha reputação e convites", () => {
    // Clube do meio da Série A que termina abaixo de um objetivo impossível, com a diretoria por um fio.
    const ruim = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 24 });
    simularRestoDaTemporada(ruim);
    delete ruim.tecnico.demissao;
    ruim.objetivo.posicaoAlvo = 0;
    ruim.tecnico.confiancaDiretoria = 30;
    const reputacao = reputacaoDoTecnico(ruim);
    avancar(ruim);
    expect(ruim.temporada).toBe(2027);
    expect(demissaoDe(ruim)?.propostas).toHaveLength(3);
    expect(reputacaoDoTecnico(ruim)).toBe(reputacao - 4 - 6);
    expect(mensagens(ruim, "Objetivo para 2027"), "sem objetivo novo para quem saiu").toBe(0);

    // Série B com um elenco muito forte: sobe, cumpre o objetivo e recebe convites da Série A.
    const bom = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 25 });
    for (const j of elencoDe(bom, "ponte-preta")) j.forca = 90;
    simularRestoDaTemporada(bom);
    expect(bom.series.B.promovidos).toContain("ponte-preta");
    const antes = reputacaoDoTecnico(bom);
    avancar(bom);
    expect(bom.tecnico.demissao).toBeUndefined();
    expect(reputacaoDoTecnico(bom)).toBeGreaterThanOrEqual(antes + 4 + 6);
    const convites = bom.mensagens.filter((m) => m.convite && !m.convite.resolvido);
    expect(convites).toHaveLength(2);
    for (const m of convites) expect(bom.clubes[m.convite!.clubeId].serie).toBe("A");
  });
});

describe("contratos", () => {
  it("no jogo novo, quem está num clube tem contrato até 2026–2029 (os mais velhos, menos); livres não têm", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 31 });
    // Os elencos da Série D montados só para a Copa saem na virada: não precisam de contrato.
    const comClube = Object.values(estado.jogadores).filter((j) => j.clubeId && estado.clubes[j.clubeId].serie !== "D");
    const fins = new Set<number>();
    for (const j of comClube) {
      expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2026);
      expect(j.contratoAte! - 2026, j.nome).toBeLessThanOrEqual(anosMaximos(j.idade));
      fins.add(j.contratoAte!);
    }
    expect([...fins].sort()).toEqual([2026, 2027, 2028, 2029]);
    // Mais ou menos um quarto termina na primeira temporada.
    const naPrimeira = comClube.filter((j) => j.contratoAte === 2026).length / comClube.length;
    expect(naPrimeira).toBeGreaterThan(0.15);
    expect(naPrimeira).toBeLessThan(0.4);
    for (const j of livres(estado)) expect(j.contratoAte).toBeUndefined();
  });

  it("um save de antes dos contratos ganha contratos ao abrir, nenhum terminando na temporada em andamento", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 32 });
    for (const j of Object.values(estado.jogadores)) delete j.contratoAte;
    const aberto = importarTexto(exportarTexto(estado));
    for (const j of Object.values(aberto.jogadores)) {
      if (j.clubeId) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
      else expect(j.contratoAte).toBeUndefined();
    }
  });

  it("renovar só no último ano: ele pede pelo menos o que ganha (até 29 anos), os anos dependem da idade e o salário muda", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 33 });
    const meus = elencoDe(estado, "ponte-preta");
    const longe = meus.find((j) => j.contratoAte! > 2026)!;
    expect(renovarContrato(estado, longe.id, 1).ok, "ainda não é o último ano").toBe(false);
    const jovem = meus.find((j) => j.contratoAte === 2026 && j.idade <= 29)!;
    const pedido = pedidoDeRenovacao(estado, jovem);
    expect(pedido).toBeGreaterThanOrEqual(jovem.salario);
    expect(pedidoDeRenovacao(estado, jovem), "o mesmo pedido na mesma temporada").toBe(pedido);
    expect(renovarContrato(estado, jovem.id, 4).ok, "no máximo 3 anos").toBe(false);
    expect(renovarContrato(estado, jovem.id, 3)).toMatchObject({ ok: true });
    expect(jovem).toMatchObject({ contratoAte: 2029, salario: pedido });
    expect(contratosTerminando(estado)).not.toContain(jovem);
    expect(anosMaximos(31)).toBe(2);
    expect(anosMaximos(34)).toBe(1);
    // De outro clube não se renova.
    const outro = elencoDe(estado, "flamengo").find((j) => j.contratoAte === 2026)!;
    expect(renovarContrato(estado, outro.id, 1).ok).toBe(false);
  });

  it("reforço ganha contrato novo e quem é dispensado fica sem contrato", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 34 });
    const livre = livres(estado).find((j) => j.idade <= 29)!;
    expect(fazerOferta(estado, livre.id, 0).ok).toBe(true);
    expect(livre.contratoAte).toBe(2026 + 3);
    expect(dispensar(estado, livre.id).ok).toBe(true);
    expect(livre.contratoAte).toBeUndefined();
  });

  it("em setembro chega a lista dos contratos terminando; na virada, quem não renovou sai de graça e não volta, e os outros clubes renovam", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 35 });
    estado.config.escalacaoAutomatica = true;
    avisarContratos(estado, "2026-09-01");
    const aviso = estado.mensagens.find((m) => m.titulo === "Contratos terminando")!;
    const terminando = contratosTerminando(estado).filter((j) => j.idade <= 32);
    expect(terminando.length).toBeGreaterThanOrEqual(2);
    for (const j of terminando) expect(aviso.texto).toContain(j.nome);
    simularRestoDaTemporada(estado);
    const [fica, sai] = terminando;
    renovarContrato(estado, fica.id, 2);
    const salarioDoContrato = fica.salario;
    const deOutros = Object.values(estado.jogadores).filter((j) => j.clubeId && j.clubeId !== "ponte-preta" && !estado.clubes[j.clubeId].elencoDaCopa && j.contratoAte === 2026);
    avancar(estado);
    expect(estado.temporada).toBe(2027);
    expect(fica.clubeId).toBe("ponte-preta");
    expect(fica.salario, "no clube do usuário vale o salário do contrato").toBe(salarioDoContrato);
    expect(estado.jogadores[sai.id]?.clubeId ?? null, "saiu de graça e não volta").not.toBe("ponte-preta");
    expect(estado.mensagens.find((m) => m.titulo === "Fim de contrato")!.texto).toContain(sai.nome);
    for (const j of deOutros) if (estado.jogadores[j.id]?.clubeId) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
    for (const j of elencoDe(estado, "ponte-preta")) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
  });
});

describe("empréstimos", () => {
  /** Jogo da Ponte Preta com a temporada inteira jogada (só falta a virada). */
  const fimDaTemporada = (semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente });
    estado.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(estado);
    return estado;
  };

  it("emprestar: só jogador meu, fora do último ano de contrato, sem deixar a posição abaixo do mínimo, para um clube que o quer", () => {
    const estado = fimDaTemporada(41);
    const meus = elencoDe(estado, "ponte-preta");
    const ultimo = meus.find((j) => j.contratoAte === 2026)!;
    expect(motivoParaNaoEmprestar(estado, ultimo)).toMatch(/último ano/);
    expect(motivoParaNaoEmprestar(estado, elencoDe(estado, "flamengo")[0])).toMatch(/não é do seu clube/);
    const j = meus.filter((x) => x.contratoAte! > 2026 && !motivoParaNaoEmprestar(estado, x)).find((x) => interessadosNoEmprestimo(estado, x).length)!;
    const clubes = interessadosNoEmprestimo(estado, j);
    expect(clubes.length).toBeGreaterThan(0);
    for (const id of clubes) {
      expect(id).not.toBe("ponte-preta");
      expect(estado.clubes[id].serie).not.toBe("D");
      expect(j.forca).toBeGreaterThanOrEqual(forcaDoTime(elencoDe(estado, id)) - 8 - (j.idade <= 21 ? 6 : 0));
    }
    expect(emprestar(estado, j.id, "ponte-preta").ok, "só para quem quer").toBe(false);
    const folhaAntes = folhaSalarial(estado, clubes[0]);
    expect(emprestar(estado, j.id, clubes[0])).toMatchObject({ ok: true });
    expect(j).toMatchObject({ clubeId: clubes[0], emprestimo: { de: "ponte-preta", ate: 2026 } });
    expect(folhaSalarial(estado, clubes[0]), "quem recebe paga o salário").toBe(folhaAntes + j.salario);
    expect(estado.clubes["ponte-preta"].escalacao.titulares).not.toContain(j.id);
    // Emprestado, ninguém compra, nem o clube que o recebeu o vende.
    expect(fazerOferta(estado, j.id, 99_000_000).ok).toBe(false);
    transferenciasDaIa(estado, "teste-emprestimo");
    expect(j.clubeId).toBe(clubes[0]);
  });

  it("pegar emprestado: só reserva de outro clube, com caixa para a taxa, que vai para o dono; emprestado não se vende, dispensa nem renova", () => {
    const estado = fimDaTemporada(42);
    const meu = estado.clubes["ponte-preta"];
    const flamengo = estado.clubes.flamengo;
    const titular = elencoDe(estado, "flamengo").find((j) => flamengo.escalacao.titulares.includes(j.id))!;
    expect(motivoParaNaoPegar(estado, titular)).toMatch(/titular/);
    const reserva = elencoDe(estado, "flamengo").find((j) => !flamengo.escalacao.titulares.includes(j.id) && !motivoParaNaoPegar(estado, j))!;
    const taxa = taxaDeEmprestimo(reserva);
    expect(taxa).toBeGreaterThan(0);
    const [caixaMeu, caixaDono] = [meu.caixa, flamengo.caixa];
    expect(pegarEmprestado(estado, reserva.id)).toMatchObject({ ok: true });
    expect(reserva).toMatchObject({ clubeId: "ponte-preta", emprestimo: { de: "flamengo", ate: 2026 } });
    expect(meu.caixa).toBe(caixaMeu - taxa);
    expect(flamengo.caixa).toBe(caixaDono + taxa);
    expect(dispensar(estado, reserva.id).ok).toBe(false);
    reserva.contratoAte = 2026;
    expect(renovarContrato(estado, reserva.id, 1).ok).toBe(false);
    expect(contratosTerminando(estado)).not.toContain(reserva);
    // Sem caixa, não dá.
    const outro = elencoDe(estado, "palmeiras").find((j) => !estado.clubes.palmeiras.escalacao.titulares.includes(j.id) && taxaDeEmprestimo(j) > 0)!;
    meu.caixa = 0;
    expect(motivoParaNaoPegar(estado, outro)).toMatch(/caixa/);
  });

  it("na virada, os emprestados voltam aos clubes donos e a mensagem conta", () => {
    const estado = fimDaTemporada(43);
    const meus = elencoDe(estado, "ponte-preta");
    const vai = meus.filter((x) => !motivoParaNaoEmprestar(estado, x)).find((x) => interessadosNoEmprestimo(estado, x).length)!;
    emprestar(estado, vai.id, interessadosNoEmprestimo(estado, vai)[0]);
    const vem = elencoDe(estado, "flamengo").find((j) => !motivoParaNaoPegar(estado, j))!;
    pegarEmprestado(estado, vem.id);
    avancar(estado);
    expect(estado.temporada).toBe(2027);
    expect(vai.clubeId).toBe("ponte-preta");
    expect(vem.clubeId).toBe("flamengo");
    expect(vai.emprestimo).toBeUndefined();
    expect(vem.emprestimo).toBeUndefined();
    const m = estado.mensagens.find((x) => x.titulo === "Fim dos empréstimos")!;
    expect(m.texto).toContain(vai.nome);
    expect(m.texto).toContain(vem.nome);
  });
});

describe("batedor de pênalti e capitão", () => {
  const jogoDoFlamengo = (semente: number, batedor?: (estado: EstadoJogo, titulares: number[]) => number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    const titulares = estado.clubes.flamengo.escalacao.titulares.filter((id): id is number => id != null);
    if (batedor) estado.clubes.flamengo.batedor = batedor(estado, titulares);
    avancar(estado);
    const pv = prepararJogos(estado).find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const lado = (pv.lados[0].clubeId === "flamengo" ? 0 : 1) as 0 | 1;
    return { estado, pv, lado, titulares };
  };
  const goleiro = (estado: EstadoJogo, titulares: number[]) => titulares.find((id) => estado.jogadores[id].posicao === "G")!;
  const cobrador = (pv: ReturnType<typeof jogoDoFlamengo>["pv"]) => pv.narracao.find((e) => e.texto.endsWith("ajeita a bola na marca do pênalti..."))!.texto;

  it("o batedor escolhido cobra o pênalti quando está em campo; fora de campo, cobra o melhor batedor", () => {
    const comGoleiro = jogoDoFlamengo(51, goleiro);
    const nomeDoGoleiro = comGoleiro.estado.jogadores[comGoleiro.estado.clubes.flamengo.batedor!].nome;
    comGoleiro.pv.penaltiPendente = comGoleiro.lado;
    avancarMinuto(comGoleiro.pv, comGoleiro.estado.jogadores);
    expect(cobrador(comGoleiro.pv).startsWith(nomeDoGoleiro)).toBe(true);

    // Escolhido um reserva (fora de campo): cobra quem tem a maior nota entre os que estão em campo.
    const comReserva = jogoDoFlamengo(51, (estado) => estado.clubes.flamengo.escalacao.reservas[0]);
    comReserva.pv.penaltiPendente = comReserva.lado;
    avancarMinuto(comReserva.pv, comReserva.estado.jogadores);
    const emCampo = comReserva.pv.lados[comReserva.lado].emCampo.map((a) => comReserva.estado.jogadores[a.jogadorId]);
    const melhor = [...emCampo].sort((a, b) => notaCobrador(b) - notaCobrador(a))[0];
    expect(cobrador(comReserva.pv).startsWith(melhor.nome)).toBe(true);
  });

  it("na disputa por pênaltis o batedor escolhido bate primeiro; sem escolha, a ordem é pela nota (e o jogo não muda)", () => {
    const { estado, pv, lado } = jogoDoFlamengo(52, goleiro);
    expect(cobradores(pv.lados[lado], estado.jogadores)[0].id).toBe(estado.clubes.flamengo.batedor);
    const outro = pv.lados[lado === 0 ? 1 : 0];
    const ordem = cobradores(outro, estado.jogadores).map(notaCobrador);
    expect(ordem).toEqual([...ordem].sort((a, b) => b - a));
  });

  it("o capitão é o escolhido se for titular; senão, o titular mais experiente", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 53 });
    const titulares = estado.clubes.flamengo.escalacao.titulares;
    const ids = titulares.filter((id): id is number => id != null);
    const experiencia = (id: number) => estado.jogadores[id].carreira.jogos + estado.jogadores[id].temporada.jogos;
    const automatico = capitaoDoTime(estado, "flamengo", titulares)!;
    for (const id of ids) expect(experiencia(automatico)).toBeGreaterThanOrEqual(experiencia(id));
    estado.clubes.flamengo.capitao = ids[3];
    expect(capitaoDoTime(estado, "flamengo", titulares)).toBe(ids[3]);
    estado.clubes.flamengo.capitao = estado.clubes.flamengo.escalacao.reservas[0];
    expect(capitaoDoTime(estado, "flamengo", titulares), "reserva não usa a braçadeira").toBe(automatico);
  });
});

describe("notas dos jogadores", () => {
  const partidasDoDia = (semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    avancar(estado);
    const vivas = prepararJogos(estado);
    for (const pv of vivas) simularAteOFim(pv, estado.jogadores);
    return { estado, vivas };
  };

  it("todo mundo que entrou tem nota de 3 a 10 com uma casa; o melhor em campo tem a maior nota com 30 minutos ou mais", () => {
    const { estado, vivas } = partidasDoDia(61);
    for (const pv of vivas) {
      const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
      const jogaram = pv.lados.flatMap((l) => l.jogaram);
      expect(notas.map((n) => n.jogadorId).sort()).toEqual([...jogaram].sort());
      for (const n of notas) {
        expect(n.nota).toBeGreaterThanOrEqual(3);
        expect(n.nota).toBeLessThanOrEqual(10);
        expect(Math.round(n.nota * 10)).toBeCloseTo(n.nota * 10, 6);
        expect(n.minutos).toBeGreaterThanOrEqual(1);
        expect(n.minutos).toBeLessThanOrEqual(90);
      }
      const melhor = melhorEmCampo(notas)!;
      for (const n of notas.filter((x) => x.minutos >= 30)) expect(melhor.nota).toBeGreaterThanOrEqual(n.nota);
      // Mesma partida, mesmas notas (sorteio próprio, sem mudar o jogo).
      expect(notasDaPartida(pv, estado.jogadores, estado.semente)).toEqual(notas);
    }
  });

  it("quem faz gol tem, em média, nota maior; quem perde, menor; a média geral fica perto de 6,7", () => {
    const todas: number[] = [], comGol: number[] = [], derrotados: number[] = [];
    for (const semente of [62, 63]) {
      const { estado, vivas } = partidasDoDia(semente);
      for (const pv of vivas) {
        for (const n of notasDaPartida(pv, estado.jogadores, estado.semente)) {
          if (n.minutos < 60) continue;
          todas.push(n.nota);
          if (pv.narracao.some((e) => (e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador === n.jogadorId)) comGol.push(n.nota);
          if (pv.lados[n.lado].gols < pv.lados[n.lado === 0 ? 1 : 0].gols) derrotados.push(n.nota);
        }
      }
    }
    const media = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    expect(media(todas)).toBeGreaterThan(6.4);
    expect(media(todas)).toBeLessThan(7.1);
    expect(media(comGol)).toBeGreaterThan(media(todas) + 0.6);
    expect(media(derrotados)).toBeLessThan(media(todas) - 0.2);
  });

  it("depois do dia, a nota de cada um entra na média da temporada e o melhor em campo fica na partida", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 64 });
    avancar(estado);
    const vivas = simularDia(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
    for (const n of notas) {
      const t = estado.jogadores[n.jogadorId].temporada;
      expect(t.avaliados).toBe(1);
      expect(notaMedia(t)).toBe(n.nota);
    }
    expect(estado.partidas.find((p) => p.id === pv.partidaId)!.melhor).toBe(melhorEmCampo(notas)!.jogadorId);
  });
});
