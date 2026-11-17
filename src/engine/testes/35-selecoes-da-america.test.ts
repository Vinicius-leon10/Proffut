// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { responderConvite } from "../carreira";
import { avancar, concluirJogos, novoJogo, prepararJogos, simularDia } from "../jogo";
import { checarEstado } from "../checagem";
import { PAISES, competicoesDoUsuario } from "../torneios";
import { transferenciasDaIa } from "../mercado";
import type { EstadoJogo, Partida } from "../tipos";
import { exportarTexto, importarTexto } from "../../save/salvamento";
import { candidatosDaSelecao, confederacao, confirmarConvocacao, paisDaSelecao, convitesDeSelecoes, nacionalidadeDoPais, rankingDasSelecoes, tabelasDeSelecoes } from "../selecoes";



describe("seleções da América (nov/2026)", () => {
  /** Joga até o começo da temporada `ano` (com as viradas). */
  function jogarAte(e: EstadoJogo, ano: number) {
    for (let i = 0; i < 6000 && e.temporada < ano; i++) {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      else if (r.tipo === "nada") break;
    }
  }

  it("jogo novo: as 51 seleções da América com a convocação de verdade; quem joga fora fica ligado à seleção (sem contrato nem mercado) e quem joga num clube do jogo continua nele, com a nacionalidade da seleção", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 41 });
    const selecoes = Object.values(e.clubes).filter((c) => c.serie === "selecao" && ["conmebol", "concacaf"].includes(confederacao(c.pais!)));
    expect(selecoes).toHaveLength(51);
    expect(e.clubes["sel-BR"].nome).toBe("Brasil");
    const br = e.selecoes!.convocados["sel-BR"].map((id) => e.jogadores[id]);
    // Quem joga fora dos clubes do jogo (o Darwin Núñez, do Al-Diriyah; o Douglas Santos era o exemplo até o Zenit entrar no
    // jogo, e o Bento até o Al-Nassr entrar) fica ligado à seleção, sem contrato.
    const darwin = e.selecoes!.convocados["sel-UY"].map((id) => e.jogadores[id]).find((j) => j.nome === "Darwin Núñez")!;
    expect(darwin.clubeId).toBe("sel-UY");
    expect(darwin.clubeFora?.nome).toBe("Al-Diriyah");
    expect(darwin.selecao!.jogos).toBeGreaterThanOrEqual(7);
    expect(darwin.contratoAte).toBeUndefined();
    // Desde a Ásia (nov/2026), o Bento joga no Al-Nassr do jogo, com os jogos pela seleção.
    const bento = br.find((j) => j.nome === "Bento")!;
    expect(bento.clubeId).toBe("al-nassr");
    expect(bento.selecao!.jogos).toBeGreaterThanOrEqual(7);
    // O convocado (há outro Douglas Santos, do Blumenau, que não é ele).
    const douglas = br.find((j) => j.nome === "Douglas Santos")!;
    expect(douglas.clubeId).toBe("zenit");
    // Desde a Europa (nov/2026), o Vinícius Júnior joga no Real Madrid do jogo, com os jogos pela seleção.
    const vini = br.find((j) => j.nome === "Vinícius Júnior")!;
    expect(vini.clubeId).toBe("real-madrid");
    expect(vini.clubeFora).toBeUndefined();
    expect(vini.selecao!.jogos).toBeGreaterThan(50);
    expect(vini.forca).toBeGreaterThanOrEqual(88);
    // Do clube do jogo: o Pedro Morisco continua no Coritiba.
    const morisco = br.find((j) => j.nome === "Pedro Morisco")!;
    expect(morisco.clubeId).toBe("coritiba");
    // Bolivianos do Santos viram bolivianos (os dados do clube não diziam).
    const terceros = Object.values(e.jogadores).find((j) => j.nome === "Miguel Terceros" && j.clubeId === "santos");
    if (terceros) expect(terceros.nacionalidade).toBe("BOL");
    for (const s of selecoes) {
      const convocados = e.selecoes!.convocados[s.id];
      expect(convocados.length, s.id).toBeGreaterThanOrEqual(16);
      expect(convocados.every((id) => e.jogadores[id]?.nacionalidade === nacionalidadeDoPais(s.pais!)), s.id).toBe(true);
    }
    // Ninguém em duas seleções.
    const todos = Object.values(e.selecoes!.convocados).flat();
    expect(new Set(todos).size).toBe(todos.length);
    // O mercado do computador não leva quem joga fora.
    transferenciasDaIa(e, "teste-selecoes");
    expect(e.jogadores[darwin.id].clubeId).toBe("sel-UY");
    expect(checarEstado(e).filter((p) => p.gravidade === "erro")).toEqual([]);
  });

  it("datas FIFA: na concentração os convocados ficam fora dos clubes (escalação e partida) e voltam depois; em junho de 2026 só os jogos da Copa do Mundo", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 42 });
    e.config.escalacaoAutomatica = true;
    const deFora = Object.values(e.jogadores).filter((j) => j.clubeId?.startsWith("sel-"));
    const antes = new Map(deFora.map((j) => [j.id, j.selecao?.jogos ?? 0]));
    let conferidos = 0;
    let concentrados = 0;
    for (let i = 0; i < 600 && e.data < "2026-09-10"; i++) {
      const r = avancar(e);
      if (r.tipo !== "jogos-hoje") break;
      const vivas = prepararJogos(e);
      if (e.selecoes!.concentradas.length) {
        concentrados = Math.max(concentrados, Object.values(e.jogadores).filter((j) => j.convocado).length);
        for (const pv of vivas) for (const lado of pv.lados) {
          if (lado.clubeId.startsWith("sel-")) continue;
          for (const id of [...lado.emCampo.map((a) => a.jogadorId), ...lado.banco]) {
            expect(e.jogadores[id].convocado, `${e.jogadores[id].nome} (${lado.clubeId}) em ${e.data}`).toBeUndefined();
            conferidos++;
          }
        }
      }
      concluirJogos(e, vivas);
    }
    expect(conferidos).toBeGreaterThan(100);
    expect(concentrados).toBeGreaterThan(900);
    // Depois da data FIFA de setembro, todos voltaram.
    for (let i = 0; i < 50 && e.data < "2026-09-12"; i++) {
      const r = avancar(e);
      if (r.tipo !== "jogos-hoje") break;
      simularDia(e);
    }
    expect(e.data >= "2026-09-12").toBe(true);
    expect(Object.values(e.jogadores).filter((j) => j.convocado)).toEqual([]);
    const jogos = e.partidas.filter((p) => p.serie.startsWith("S-"));
    // Em junho e julho de 2026 só a Copa do Mundo (nov/2026): sem data FIFA, amistosos nem outros torneios.
    expect(jogos.filter((p) => (p.data.startsWith("2026-06") || p.data.startsWith("2026-07")) && p.serie !== "S-COPA-2026")).toEqual([]);
    expect(jogos.filter((p) => p.jogada).length).toBeGreaterThanOrEqual(100);
    // Os jogos pela seleção contam na seleção, não na temporada do clube.
    for (const j of deFora) if (e.jogadores[j.id]) expect(e.jogadores[j.id].temporada.jogos, j.nome).toBe(0);
    expect(deFora.filter((j) => (e.jogadores[j.id]?.selecao?.jogos ?? 0) > antes.get(j.id)!).length).toBeGreaterThan(200);
  });

  it("de 2026 a 2030: na Europa, Liga das Nações, Eliminatórias e Eurocopa de 2028 e Eliminatórias da Copa de 2030; Copa Ouro (anos ímpares), Copa América (2028), Eliminatórias da Conmebol (18 rodadas, a tabela junta as temporadas, 6 vão à Copa e 1 à repescagem) e da Concacaf (3 fases)", { timeout: 400_000 }, () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "palmeiras", semente: 43 });
    e.config.escalacaoAutomatica = true;
    jogarAte(e, 2027);
    // R112: Copa Africana de Nações (anos ímpares) e Copa da Ásia (2027, 2031...) em junho e julho, cada uma com 24 seleções
    // do continente em 6 grupos de 4 (as sedes de verdade em 2027); a Copa da Oceania só em 2028.
    const can = e.selecoes!.competicoes["S-CAN-2027"]!;
    const asia = e.selecoes!.competicoes["S-ASIA-2027"]!;
    expect(e.selecoes!.competicoes["S-OCE-2027"]).toBeUndefined();
    expect(can.nome).toBe("Copa Africana de Nações");
    expect(asia.nome).toBe("Copa da Ásia");
    expect(can.sedes).toEqual(["sel-KE", "sel-UG", "sel-TZ"]);
    expect(asia.sedes).toEqual(["sel-SA"]);
    for (const [c, conf] of [[can, "caf"], [asia, "afc"]] as const) {
      expect(new Set(c.selecoes).size).toBe(24);
      for (const id of c.selecoes) expect(confederacao(paisDaSelecao(id)), id).toBe(conf);
      expect(c.grupos!.grupos).toHaveLength(6);
      expect(c.grupos!.grupos.every((g) => g.length === 4)).toBe(true);
      // As sedes ficam em grupos diferentes, uma no grupo A.
      expect(c.grupos!.grupos.filter((g) => g.some((id) => c.sedes!.includes(id)))).toHaveLength(c.sedes!.length);
      expect(c.grupos!.grupos[0]).toContain(c.sedes![0]);
      // Os 4 melhores do ranking do continente estão lá.
      const ranking = Object.keys(e.selecoes!.ranking).filter((id) => confederacao(paisDaSelecao(id)) === conf)
        .sort((a, b) => e.selecoes!.ranking[b] - e.selecoes!.ranking[a]);
      for (const id of ranking.slice(0, 4)) expect(c.selecoes, id).toContain(id);
    }
    for (let i = 0; i < 600 && e.data < "2027-07-31"; i++) {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      else if (r.tipo === "nada") break;
    }
    for (const c of [can, asia]) {
      expect(c.fase, c.nome).toBe("encerrada");
      expect(c.selecoes).toContain(c.campeao);
      expect(c.vice).not.toBe(c.campeao);
      const jogos = e.partidas.filter((p) => p.serie === c.id);
      expect(["grupos", "oitavas", "quartas", "semi", "final"].map((f) => jogos.filter((p) => p.fase === f).length)).toEqual([36, 8, 4, 2, 1]);
      expect(jogos.every((p) => p.jogada && p.data >= "2027-06-01" && p.data <= "2027-07-31")).toBe(true);
      // Fora das sedes, campo neutro.
      expect(jogos.filter((p) => !p.neutro).every((p) => c.sedes!.includes(p.mandante))).toBe(true);
    }
    jogarAte(e, 2029);
    const eli = e.selecoes!.competicoes["S-ELI-SUL-2030"]!;
    expect(eli.selecoes).toHaveLength(10);
    // Depois de 2027 e 2028: 12 rodadas jogadas, somadas nas duas temporadas.
    const tabela = tabelasDeSelecoes(e, "S-ELI-SUL-2030", "liga")[0];
    expect(tabela.map((l) => l.j)).toEqual(Array(10).fill(12));
    jogarAte(e, 2030);
    const [h27, h28, h29] = [2027, 2028, 2029].map((ano) => e.historico.find((h) => h.temporada === ano)!);
    // Europa. Liga das Nações de 2026: a fase de ligas no outono de 2026 e as finais em junho de 2027; sobe e desce entre as ligas.
    const ln = h27.selecoes!["S-LN-2026"]!;
    expect(ln.campeao).toMatch(/^sel-/);
    expect(confederacao(e.clubes[ln.campeao!].pais!)).toBe("uefa");
    expect(ln.vice).not.toBe(ln.campeao);
    const ligas = Object.values(e.selecoes!.ligaDasNacoes!);
    expect([1, 2, 3, 4].map((n) => ligas.filter((x) => x === n).length)).toEqual([16, 16, 16, 7]);
    // Eliminatórias da Eurocopa em 2027 (54 em 10 grupos, a sede de fora) e a repescagem em março de 2028; a Eurocopa de 2028 com 24.
    const eliEuro = h28.selecoes!["S-ELI-EURO-2028"]!;
    expect(eliEuro.classificados).toHaveLength(24);
    expect(new Set(eliEuro.classificados).size).toBe(24);
    const euro = h28.selecoes!["S-EURO-2028"]!;
    expect(euro.campeao).toMatch(/^sel-/);
    expect(eliEuro.classificados).toContain(euro.campeao);
    expect(eliEuro.classificados).toContain(euro.vice);
    expect(h29.selecoes!["S-LN-2028"]!.campeao).toMatch(/^sel-/);
    // Eliminatórias da Copa de 2030 na Europa: 12 grupos em 2029 (os 12 primeiros já classificados) e a repescagem em março de 2030.
    const uefa = e.selecoes!.competicoes["S-ELI-UEFA-2030"]!;
    expect(uefa.selecoes).toHaveLength(55);
    expect(uefa.grupos!.grupos).toHaveLength(12);
    expect(uefa.fase).toBe("rep-semi");
    const repescagem = [...e.partidas, ...e.selecoes!.agenda].filter((p) => p.serie === "S-ELI-UEFA-2030" && p.fase === "rep-semi");
    expect(repescagem).toHaveLength(8);
    expect(repescagem.every((p) => p.data.startsWith("2030-03"))).toBe(true);
    expect(h27.selecoes!["S-OURO-2027"]!.campeao).toMatch(/^sel-/);
    // R112: a Copa da Oceania de 2028 (8 seleções: 2 grupos, semifinal e final) e a Copa Africana de 2029.
    expect(h27.selecoes!["S-CAN-2027"]!.campeao).toMatch(/^sel-/);
    expect(h27.selecoes!["S-ASIA-2027"]!.campeao).toMatch(/^sel-/);
    const oce = h28.selecoes!["S-OCE-2028"]!;
    expect(confederacao(paisDaSelecao(oce.campeao!))).toBe("ofc");
    expect(oce.vice).not.toBe(oce.campeao);
    expect(h28.selecoes!["S-CAN-2028"]).toBeUndefined();
    expect(h28.selecoes!["S-ASIA-2028"]).toBeUndefined();
    expect(confederacao(paisDaSelecao(h29.selecoes!["S-CAN-2029"]!.campeao!))).toBe("caf");
    expect(h29.selecoes!["S-ASIA-2029"]).toBeUndefined();
    const america = h28.selecoes!["S-AME-2028"]!;
    expect(america.campeao).toMatch(/^sel-/);
    expect(america.vice).not.toBe(america.campeao);
    expect(h29.selecoes!["S-OURO-2029"]!.campeao).toMatch(/^sel-/);
    const sul = h29.selecoes!["S-ELI-SUL-2030"]!;
    expect(sul.classificados).toHaveLength(6);
    expect(sul.repescagem).toHaveLength(1);
    const ccf = h29.selecoes!["S-ELI-CCF-2030"]!;
    expect(ccf.classificados).toHaveLength(3);
    expect(ccf.repescagem).toHaveLength(2);
    for (const id of [...ccf.classificados!, ...ccf.repescagem!]) expect(e.clubes[id].pais && ["BR", "AR", "UY"].includes(e.clubes[id].pais!)).toBe(false);
    // As competições que acabaram saem; os jogos delas também.
    expect(e.selecoes!.competicoes["S-ELI-SUL-2030"]).toBeUndefined();
    expect(e.partidas.some((p) => p.serie.startsWith("S-ELI") && p.serie !== "S-ELI-UEFA-2030")).toBe(false);
    expect(e.selecoes!.agenda).toEqual([]);
    // Jogada a repescagem de março de 2030, a Europa tem os 16 da Copa.
    for (let i = 0; i < 400 && e.data < "2030-04-05"; i++) {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      else if (r.tipo === "nada") break;
    }
    expect(e.selecoes!.competicoes["S-ELI-UEFA-2030"]!.fase).toBe("encerrada");
    expect(new Set(e.selecoes!.competicoes["S-ELI-UEFA-2030"]!.classificados).size).toBe(16);
    // África, Ásia e Oceania em 2029: 9, 8 e 1 vão à Copa; a repescagem mundial em março de 2030 dá 2 vagas; a Copa de 2030
    // (sedes Espanha, Portugal e Marrocos) com as 48 e os grupos marcados para junho.
    expect(h29.selecoes!["S-ELI-CAF-2030"]!.classificados).toHaveLength(9);
    expect(h29.selecoes!["S-ELI-AFC-2030"]!.classificados).toHaveLength(8);
    expect(h29.selecoes!["S-ELI-OFC-2030"]!.classificados).toHaveLength(1);
    const int = e.selecoes!.competicoes["S-INT-2030"]!;
    expect(int.fase).toBe("encerrada");
    expect(int.classificados).toHaveLength(2);
    const copa30 = e.selecoes!.competicoes["S-COPA-2030"]!;
    expect(copa30.fase).toBe("grupos");
    expect(new Set(copa30.selecoes).size).toBe(48);
    for (const sede of ["sel-ES", "sel-PT", "sel-MA"]) expect(copa30.selecoes).toContain(sede);
    expect(e.partidas.filter((p) => p.serie === "S-COPA-2030")).toHaveLength(72);
    // O ranking mudou com os jogos.
    expect(rankingDasSelecoes(e).find((s) => s.id === "sel-BR")!.pontos).not.toBe(2050);
  });

  it("convite de seleção só para quem já ganhou a liga principal de um país; aceitar: técnico da seleção junto com o clube, a convocação dele vale e o jogo da seleção é dele", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 44 });
    expect(convitesDeSelecoes(e, 95)).toEqual([]);
    // Campeão da Série A em 2025 (de mentira, para o teste).
    e.historico.push({
      temporada: 2025, campeoes: { A: "flamengo", B: "coritiba", C: "londrina" }, artilheiros: { A: null, B: null, C: null },
      promovidos: { A: [], B: [], C: [] }, rebaixados: { A: [], B: [], C: [] },
      tecnico: { clubeId: "flamengo", serie: "A", posicao: 1, objetivo: "", cumpriu: true },
    });
    const convites = convitesDeSelecoes(e, 95);
    expect(convites).toHaveLength(2);
    const m = e.mensagens.find((x) => x.convite?.clubeId === convites[0])!;
    expect(responderConvite(e, m.id, true).ok).toBe(true);
    expect(e.tecnico.selecao).toBe(convites[0]);
    expect(e.tecnico.clubeId).toBe("flamengo");
    expect(e.mensagens.find((x) => x.convite?.clubeId === convites[1])!.convite!.resolvido).toBe("recusado");
    const minha = e.tecnico.selecao!;
    // A convocação do técnico: os 23 piores candidatos (para ver que vale a dele, não a do auxiliar).
    const piores = candidatosDaSelecao(e, minha).sort((a, b) => a.forca - b.forca).slice(0, 23).map((j) => j.id);
    confirmarConvocacao(e, piores);
    expect(competicoesDoUsuario(e).has("S-AMI")).toBe(true);
    let jogo: Partida | undefined;
    for (let i = 0; i < 200 && !jogo; i++) {
      const r = avancar(e);
      if (r.tipo !== "jogos-hoje") break;
      if (r.meuJogo && r.meuJogo.serie.startsWith("S-")) jogo = r.meuJogo;
      else simularDia(e);
    }
    expect(jogo).toBeDefined();
    expect(e.data).toBe("2026-03-26");
    expect(new Set(e.selecoes!.convocados[minha])).toEqual(new Set(piores));
    const vivas = prepararJogos(e);
    const pv = vivas.find((v) => v.partidaId === jogo!.id)!;
    const lado = pv.lados.find((l) => l.clubeId === minha)!;
    expect(lado.controlado).toBe(true);
    for (const a of lado.emCampo) expect(piores).toContain(a.jogadorId);
    concluirJogos(e, vivas);
    expect(e.partidas.find((p) => p.id === jogo!.id)!.jogada).toBe(true);
  });

  it("save de antes da Concacaf e das seleções (como o do iPhone): os convocados dos clubes que chegam ao abrir são os jogadores desses clubes, sem cópia de fora", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 46 });
    // Volta o save para antes da Concacaf (clubes, jogadores, torneios, copas e jogos dela) e das seleções.
    const daConcacaf = new Set(Object.values(e.clubes).filter((c) => c.serie === "exterior" && PAISES[c.pais!]?.regiao !== "sul").map((c) => c.id));
    for (const j of Object.values(e.jogadores)) if (j.clubeId && (daConcacaf.has(j.clubeId) || j.clubeId.startsWith("sel-"))) delete e.jogadores[j.id];
    for (const id of Object.keys(e.clubes)) if (daConcacaf.has(id) || id.startsWith("sel-")) delete e.clubes[id];
    for (const t of Object.values(e.torneios!)) if (t && t.clubes.some((id) => daConcacaf.has(id))) delete e.torneios![t.id];
    for (const c of Object.values(e.copas!)) if (c && c.clubes.some((id) => daConcacaf.has(id))) delete e.copas![c.id];
    e.partidas = e.partidas.filter((p) => !p.serie.startsWith("S-") && ![p.mandante, p.visitante].some((id) => daConcacaf.has(id)));
    delete e.selecoes;
    const aberto = importarTexto(exportarTexto(e));
    // Raúl Rangel (goleiro do Guadalajara, convocado pelo México): um só, no Guadalajara e convocado.
    const rangel = Object.values(aberto.jogadores).filter((j) => j.nome === "Raúl Rangel");
    expect(rangel).toHaveLength(1);
    expect(rangel[0].clubeId).toBe("guadalajara");
    expect(rangel[0].nacionalidade).toBe("MEX");
    expect(aberto.selecoes!.convocados["sel-MX"]).toContain(rangel[0].id);
  });

  it("save de antes das seleções: ao abrir, entram as seleções e os amistosos da próxima data FIFA, sem mexer nos clubes", () => {
    const antigo = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 45 });
    for (const j of Object.values(antigo.jogadores)) {
      if (j.clubeId?.startsWith("sel-")) delete antigo.jogadores[j.id];
      delete j.selecao;
    }
    for (const id of Object.keys(antigo.clubes)) if (id.startsWith("sel-")) delete antigo.clubes[id];
    antigo.partidas = antigo.partidas.filter((p) => !p.serie.startsWith("S-"));
    delete antigo.selecoes;
    const clubes = Object.keys(antigo.clubes).length;
    const aberto = importarTexto(exportarTexto(antigo));
    expect(Object.keys(aberto.clubes).length).toBe(clubes + 217);
    expect(aberto.partidas.filter((p) => p.serie === "S-AMI").length).toBeGreaterThanOrEqual(40);
    expect(aberto.partidas.filter((p) => p.serie === "S-AMI").every((p) => p.data > aberto.data)).toBe(true);
    // As Eliminatórias da próxima Copa já ficam marcadas (de setembro de 2027 a setembro de 2029, na agenda).
    expect(aberto.selecoes!.competicoes["S-ELI-SUL-2030"]).toBeDefined();
    expect(aberto.selecoes!.agenda.filter((p) => p.serie === "S-ELI-SUL-2030")).toHaveLength(90);
    expect(checarEstado(aberto).filter((p) => p.gravidade === "erro")).toEqual([]);
  });
});
