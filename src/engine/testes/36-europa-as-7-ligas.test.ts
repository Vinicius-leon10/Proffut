// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { DEFINICOES, VAGAS_UEFA, nomeDaCopa, vagasDasCopas } from "../copas";
import { acertarParticipantes, juntarQuemJogavaFora, avancar, novoJogo, simularDia, simularRestoDaTemporada } from "../jogo";
import { checarEstado } from "../checagem";
import { PAISES, inicioDoAno, tabelaDoTorneio } from "../torneios";
import { elencoDe } from "../mercado";
import type { IdTorneio } from "../tipos";
import europaJson from "../../../data/europa-2026/jogadores.json";
import europaClubesJson from "../../../data/europa-2026/clubes.json";
import segundasJson from "../../../data/europa-2026/jogadores-segundas.json";
import terceirasJson from "../../../data/europa-2026/clubes-terceiras.json";
import outrosJson from "../../../data/europa-2026/jogadores-outros.json";
import restoClubesJson from "../../../data/europa-2026/clubes-resto.json";
import restoJogadoresJson from "../../../data/europa-2026/jogadores-resto.json";
import europaCopasJson from "../../../data/europa-2026/copas.json";
import { TV_EUROPA_MES } from "../constantes";
import { processarMes } from "../financas";
import convocadosJson from "../../../data/selecoes-2026/convocados.json";
import { nacionalidadeDoPais } from "../selecoes";


describe("Europa (nov/2026): as 7 ligas principais, só a primeira divisão", () => {
  const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });

  it("os 132 clubes jogam a liga do país, com o elenco de data/europa-2026/jogadores.json", () => {
    const tamanhos: Record<string, number> = { EN: 20, ES: 20, IT: 20, DE: 18, FR: 18, PT: 18, NL: 18 };
    for (const [liga, n] of Object.entries(tamanhos)) {
      expect(PAISES[liga].regiao, liga).toBe("europa");
      expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBe(n);
    }
    const elencos = europaJson.elencos as Record<string, { nome: string; posicao: string; forca: number }[]>;
    expect(Object.keys(elencos)).toHaveLength(132);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      expect(estado.clubes[clubeId].serie, clubeId).toBe("exterior");
      for (const r of reais) expect(elenco.some((j) => j.nome === r.nome && j.posicao === r.posicao), `${r.nome} (${clubeId})`).toBe(true);
    }
    // Os grandes são mais fortes que os pequenos.
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    expect(media("real-madrid")).toBeGreaterThan(media("oviedo") + 8);
    expect(media("bayern-de-munique")).toBeGreaterThan(media("heidenheim") + 8);
  });

  it("2ª divisão das 7 ligas (nov/2026): os 132 clubes com o elenco de verdade, mais fracos que os da 1ª; sobem e caem na virada (3 na Inglaterra, Espanha e Itália; 2 nos outros)", { timeout: 300_000 }, () => {
    const tamanhos: Record<string, number> = { EN2: 24, ES2: 21, IT2: 20, DE2: 18, FR2: 18, PT2: 15, NL2: 16 };
    for (const [liga, n] of Object.entries(tamanhos)) expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBe(n);
    const elencos = segundasJson.elencos as Record<string, { nome: string; posicao: string }[]>;
    expect(Object.keys(elencos)).toHaveLength(132);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais.slice(0, 5)) expect(elenco.some((j) => j.nome === r.nome), `${r.nome} (${clubeId})`).toBe(true);
    }
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    const t = (liga: string) => estado.torneios![`L-${liga}` as IdTorneio]!.clubes;
    for (const pais of ["EN", "ES", "IT", "DE", "FR", "PT", "NL"]) {
      const primeira = t(pais).map(media).sort((a, b) => a - b);
      const segunda = t(`${pais}2`).map(media).sort((a, b) => b - a);
      // O melhor da segunda é mais fraco que a média da primeira.
      expect(segunda[0], pais).toBeLessThan(primeira.reduce((a, b) => a + b) / primeira.length);
    }
    // Uma temporada: na virada, os 3 últimos da Premier League descem e os 3 primeiros do Championship sobem.
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 71 });
    for (let i = 0; i < 4000 && e.temporada === 2026; i++) {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      else if (r.tipo === "nada") break;
    }
    expect(e.temporada).toBe(2027);
    const h = e.historico.at(-1)!;
    expect(h.torneios?.["L-EN2" as IdTorneio]?.campeao).toBeDefined();
    const ingleses = Object.values(e.clubes).filter((c) => c.pais === "EN");
    // R113: a 2ª divisão turca (parte 4): os 3 primeiros sobem e os 3 últimos da 1ª descem.
    const turcosQueSubiram = Object.values(e.clubes).filter((c) => c.pais === "TR" && c.liga === "TR" && (restoClubesJson.clubes as { id: string }[]).some((f) => f.id === c.id));
    expect(turcosQueSubiram).toHaveLength(3);
    expect(Object.values(e.clubes).filter((c) => c.pais === "TR" && c.liga === "TR")).toHaveLength(18);
    expect(ingleses.filter((c) => c.liga === "EN")).toHaveLength(20);
    expect(ingleses.filter((c) => c.liga === "EN2")).toHaveLength(24);
    const subiram = ingleses.filter((c) => c.liga === "EN" && !(europaClubesJson.clubes as { id: string }[]).some((f) => f.id === c.id));
    expect(subiram).toHaveLength(3);
    const alemaes = Object.values(e.clubes).filter((c) => c.pais === "DE" && c.liga === "DE");
    expect(alemaes.filter((c) => !(europaClubesJson.clubes as { id: string }[]).some((f) => f.id === c.id))).toHaveLength(2);
    // 3ª divisão (clubes leves): os 3 primeiros da League One sobem para o Championship.
    const terceiros = new Set((terceirasJson.clubes as { id: string }[]).map((c) => c.id));
    expect(ingleses.filter((c) => c.liga === "EN2" && terceiros.has(c.id))).toHaveLength(3);
    expect(ingleses.filter((c) => c.liga === "EN3")).toHaveLength(24);
  });

  it("outros 16 países da Europa (nov/2026): a 1ª divisão com os 236 clubes e os elencos de verdade (a Escócia é XS, como a seleção)", () => {
    const tamanhos: Record<string, number> = { AT: 12, BE: 16, CH: 12, DK: 12, GR: 14, HR: 10, NO: 16, PL: 18, RO: 16, RU: 16, XS: 12, SE: 16, RS: 16, TR: 18, CZ: 16, UA: 16 };
    for (const [liga, n] of Object.entries(tamanhos)) {
      expect(PAISES[liga]?.regiao, liga).toBe("europa");
      expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBe(n);
    }
    const elencos = outrosJson.elencos as Record<string, { nome: string }[]>;
    expect(Object.keys(elencos)).toHaveLength(236);
    for (const [clubeId, reais] of Object.entries(elencos)) {
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais.slice(0, 3)) expect(elenco.some((j) => j.nome === r.nome), `${r.nome} (${clubeId})`).toBe(true);
    }
    expect(estado.clubes.celtic.pais).toBe("XS");
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    expect(media("galatasaray")).toBeGreaterThan(media("karagumruk") + 8);
  });

  it("R113–R114 o resto da Europa e a Nova Zelândia (parte 4 do jogo completo): a 2ª divisão dos 16 países, a 1ª dos 31 que faltavam e a liga neozelandesa, com os elencos de verdade; a 2ª mais fraca que a 1ª", () => {
    type F = { id: string; pais: string; liga?: string };
    const fichas = restoClubesJson.clubes as F[];
    const porLiga = new Map<string, string[]>();
    for (const f of fichas) porLiga.set(f.liga ?? f.pais, [...(porLiga.get(f.liga ?? f.pais) ?? []), f.id]);
    const segundas = ["AT", "BE", "CH", "DK", "GR", "HR", "NO", "PL", "RO", "RU", "XS", "SE", "RS", "TR", "CZ", "UA"].map((p) => `${p}2`);
    const primeiras = ["AL", "AD", "AM", "AZ", "BY", "BA", "BG", "CY", "EE", "FO", "FI", "GE", "GI", "HU", "IS", "IE", "IL", "KZ", "XK", "LV", "LT",
      "LU", "MT", "MD", "ME", "MK", "XN", "SM", "SK", "SI", "XW", "NZ"];
    for (const liga of [...segundas, ...primeiras]) {
      const ids = porLiga.get(liga) ?? [];
      expect(ids.length, liga).toBeGreaterThanOrEqual(6);
      expect([...(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes ?? [])].sort(), liga).toEqual([...ids].sort());
    }
    expect(PAISES.HU.regiao).toBe("europa");
    expect(PAISES.NZ.regiao).toBe("oceania");
    for (const [clubeId, reais] of Object.entries(restoJogadoresJson.elencos as Record<string, { nome: string }[]>)) {
      const elenco = elencoDe(estado, clubeId);
      for (const r of reais.slice(0, 3)) expect(elenco.some((j) => j.nome === r.nome), `${r.nome} (${clubeId})`).toBe(true);
    }
    // O melhor da 2ª é mais fraco que a média da 1ª, em cada país.
    const media = (id: string) => elencoDe(estado, id).map((j) => j.forca).sort((a, b) => b - a).slice(0, 11).reduce((a, b) => a + b) / 11;
    const t = (liga: string) => estado.torneios![`L-${liga}` as IdTorneio]!.clubes;
    for (const liga of segundas) {
      const primeira = t(liga.slice(0, 2)).map(media);
      const segunda = t(liga).map(media).sort((a, b) => b - a);
      expect(segunda[0], liga).toBeLessThan(primeira.reduce((a, b) => a + b) / primeira.length);
    }
    expect(checarEstado(estado).filter((p) => p.gravidade === "erro")).toEqual([]);
  });

  it("3ª divisão das 7 ligas (nov/2026): clubes leves (sem jogadores até o técnico assumir), todos os jogos dentro do ano; a Serie C, com 57 clubes, joga duas rodadas por semana", () => {
    const tamanhos: Record<string, number> = { EN3: 24, DE3: 20, FR3: 17, PT3: 20, NL3: 18 };
    for (const [liga, n] of Object.entries(tamanhos)) expect(estado.torneios?.[`L-${liga}` as IdTorneio]?.clubes.length, liga).toBe(n);
    const it3 = estado.torneios!["L-IT3" as IdTorneio]!;
    expect(it3.clubes.length).toBeGreaterThanOrEqual(55);
    for (const id of it3.clubes) {
      expect(estado.clubes[id].leve, id).toBe(true);
      expect(elencoDe(estado, id)).toHaveLength(0);
    }
    const jogos = estado.partidas.filter((p) => p.serie === "L-IT3" || p.serie === "L-ES3");
    expect(jogos.length).toBeGreaterThan(1500);
    expect(jogos.every((p) => p.data <= "2026-12-20")).toBe(true);
    // Ninguém joga duas vezes no mesmo dia.
    const dia = new Set<string>();
    for (const p of jogos) for (const c of [p.mandante, p.visitante]) {
      expect(dia.has(`${c}/${p.data}`), `${c} ${p.data}`).toBe(false);
      dia.add(`${c}/${p.data}`);
    }
  });

  it("as ligas da Europa são em turno e returno (38 rodadas com 20 clubes) e começam em janeiro", () => {
    const jogos = estado.partidas.filter((p) => p.serie === "L-EN");
    expect(jogos).toHaveLength(380);
    expect(Math.max(...jogos.map((p) => p.rodada))).toBe(38);
    expect(jogos.map((p) => p.data).sort()[0] < "2026-02-01").toBe(true);
    // Cada clube recebe cada adversário uma vez.
    const mandos = new Set(jogos.map((p) => `${p.mandante}/${p.visitante}`));
    expect(mandos.size).toBe(380);
  });

  it("o clube da Europa do usuário recebe os direitos de TV do mês, pela liga e pela reputação", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "real-madrid", semente: 3 });
    const c = e.clubes["real-madrid"];
    const antes = c.resumoFinanceiro.tv ?? 0;
    processarMes(e, "2026-02-01");
    expect((c.resumoFinanceiro.tv ?? 0) - antes).toBe(Math.round(TV_EUROPA_MES.ES * (c.reputacao / 100) ** 3));
  });

  it("num save com as seleções, quem jogava fora e está no elenco do clube novo da Europa vira uma pessoa só", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 9 });
    // Como num save de antes da Europa: o Arsenal não existe e um jogador dele está ligado à seleção, jogando fora.
    const doArsenal = elencoDe(e, "arsenal");
    const unico = (nome: string) => Object.values(e.jogadores).filter((x) => x.nome === nome).length === 1;
    const brasileiro = doArsenal.find((j) => j.nacionalidade === "BRA" && unico(j.nome))!;
    expect(brasileiro).toBeDefined();
    for (const j of doArsenal) if (j !== brasileiro) delete e.jogadores[j.id];
    brasileiro.clubeId = "sel-BR";
    brasileiro.clubeFora = { nome: "Arsenal", pais: "Inglaterra" };
    delete e.clubes.arsenal;
    acertarParticipantes(e);
    const iguais = Object.values(e.jogadores).filter((j) => j.nome === brasileiro.nome && j.nacionalidade === "BRA");
    expect(iguais).toHaveLength(1);
    expect(iguais[0].id).toBe(brasileiro.id);
    expect(iguais[0].clubeId).toBe("arsenal");
    expect(iguais[0].clubeFora).toBeUndefined();
    expect(elencoDe(e, "arsenal").length).toBe((europaJson.elencos as Record<string, unknown[]>).arsenal.length);
    juntarQuemJogavaFora(e, "arsenal");
    expect(Object.values(e.jogadores).filter((j) => j.nome === brasileiro.nome)).toHaveLength(1);
  });

  it("as copas da UEFA de 2026 saem da tabela de 2025/26 das 23 ligas: 26 direto nos grupos da Liga dos Campeões, 12 campeões no playoff, 16 na Liga Europa e 16 na Conference; a Rússia fica de fora", () => {
    const tabelas = europaCopasJson.tabelas as Record<string, string[]>;
    const ucl = estado.copas?.["K-UCL"];
    expect(ucl?.entram.grupos).toHaveLength(26);
    expect(ucl?.entram.playoff).toHaveLength(12);
    expect(ucl?.fase).toBe("playoff");
    expect(estado.copas?.["K-UEL"]?.clubes).toHaveLength(16);
    expect(estado.copas?.["K-UECL"]?.clubes).toHaveLength(16);
    // Os campeões de 2025/26 das 7 ligas e da Bélgica, da Turquia e da Áustria vão direto aos grupos.
    for (const liga of ["EN", "ES", "IT", "DE", "FR", "PT", "NL", "BE", "TR", "AT"]) expect(ucl?.entram.grupos, liga).toContain(tabelas[liga][0]);
    // Os campeões dos outros 12 jogam o playoff; os vices de vários deles, a Liga Europa ou a Conference.
    for (const liga of ["CH", "DK", "GR", "HR", "NO", "PL", "RO", "XS", "SE", "RS", "CZ", "UA"]) expect(ucl?.entram.playoff, liga).toContain(tabelas[liga][0]);
    expect(estado.copas?.["K-UEL"]?.clubes).toContain(tabelas.TR[1]);
    expect(estado.copas?.["K-UECL"]?.clubes).toContain(tabelas.UA[1]);
    const todos = [...ucl!.clubes, ...estado.copas!["K-UEL"]!.clubes, ...estado.copas!["K-UECL"]!.clubes];
    expect(new Set(todos).size).toBe(70);
    expect(todos.filter((c) => estado.clubes[c].pais === "RU")).toEqual([]);
    // O playoff: 6 confrontos de ida e volta entre os campeões, antes dos grupos.
    const playoff = estado.partidas.filter((p) => p.serie === "K-UCL" && p.fase === "playoff");
    expect(playoff).toHaveLength(12);
    expect(playoff.every((p) => p.data >= inicioDoAno(2026))).toBe(true);
    // Sem a lista de 2026, a Supercopa da UEFA não se joga.
    expect(estado.copas?.["K-USC"]).toBeUndefined();
  });

  it("as copas da UEFA vão até a final (a Liga dos Campeões com o playoff); na virada, as vagas saem das tabelas do jogo e a Supercopa da UEFA junta os campeões", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 11 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    for (const id of ["K-UCL", "K-UEL", "K-UECL"] as const) {
      const c = e.copas?.[id];
      expect(c?.campeao, id).toBeTruthy();
      expect(e.partidas.filter((p) => p.serie === id && !p.jogada), id).toHaveLength(0);
      expect(e.partidas.find((p) => p.serie === id && p.fase === "final")?.neutro, id).toBe(true);
    }
    expect(e.partidas.filter((p) => p.serie === "K-UCL")).toHaveLength(12 + 96 + 16 + 8 + 4 + 1);
    expect(e.copas!["K-UCL"]!.grupos!.grupos.flat()).toHaveLength(32);
    const vagas = vagasDasCopas(e);
    expect(vagas["K-UCL"]?.grupos).toHaveLength(26);
    expect(vagas["K-UCL"]?.playoff).toHaveLength(12);
    const tabelaEN = tabelaDoTorneio(e, e.torneios!["L-EN" as IdTorneio]!).map((l) => l.clubeId);
    expect(vagas["K-UCL"]?.grupos.slice(0, VAGAS_UEFA.EN.ucl![1])).toEqual(tabelaEN.slice(0, VAGAS_UEFA.EN.ucl![1]));
    expect(vagas["K-USC"]?.final).toEqual([e.copas!["K-UCL"]!.campeao, e.copas!["K-UEL"]!.campeao]);
    // A copa nacional: o campeão da FA Cup sem vaga na Liga dos Campeões fica com a da Liga Europa.
    const faCup = e.copas!["K-EN"]!.campeao!;
    if (!tabelaEN.slice(0, 4).includes(faCup)) expect(vagas["K-UEL"]?.grupos).toContain(faCup);
    // Supercopa da Inglaterra: o campeão inglês contra o da FA Cup (ou o vice, se for o mesmo).
    expect(vagas["K-SEN"]?.final).toEqual([tabelaEN[0], faCup === tabelaEN[0] ? tabelaEN[1] : faCup]);
  });

  it("copas nacionais da Europa (nov/2026): FA Cup, Copa do Rei, Copa da Itália, Copa da Alemanha, Copa da França, Taça de Portugal e Copa da Holanda com os clubes das divisões do país (sem a que joga também às quartas), mata-mata até a final em campo neutro; as supercopas começam em 2027", () => {
    const tamanhos: Record<string, number> = { "K-EN": 64, "K-ES": 32, "K-IT": 32, "K-DE": 32, "K-FR": 32, "K-PT": 32, "K-NL": 32 };
    const paises: Record<string, string> = { "K-EN": "EN", "K-ES": "ES", "K-IT": "IT", "K-DE": "DE", "K-FR": "FR", "K-PT": "PT", "K-NL": "NL" };
    for (const [id, n] of Object.entries(tamanhos)) {
      const c = estado.copas?.[id as `K-${string}`];
      expect(c?.clubes, id).toHaveLength(n);
      expect(c?.clubes.every((x) => estado.clubes[x].pais === paises[id]), id).toBe(true);
      // A 3ª da Espanha (32 clubes) e a da Itália (57) jogam também às quartas: ficam fora da copa, que é às quartas.
      expect(c?.clubes.some((x) => (estado.torneios![`L-${estado.clubes[x].liga}` as IdTorneio]?.clubes.length ?? 0) > 30), id).toBe(false);
      // Os clubes da 1ª divisão estão todos.
      for (const x of estado.torneios![`L-${paises[id]}` as IdTorneio]!.clubes) expect(c?.clubes, `${id} ${x}`).toContain(x);
      expect(DEFINICOES.find((d) => d.id === id)?.grupo).toBe("nacional");
    }
    expect(nomeDaCopa("K-EN")).toBe("FA Cup");
    expect(nomeDaCopa("K-DE")).toBe("Copa da Alemanha");
    for (const id of ["K-SEN", "K-SES", "K-SIT", "K-SDE", "K-SFR", "K-SPT", "K-SNL"] as const) expect(estado.copas?.[id], id).toBeUndefined();
    // Os jogos às quartas, sem bater com as copas da UEFA (terças e quintas) nem com a liga (domingo) do mesmo clube.
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 5 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    for (const id of Object.keys(tamanhos)) {
      const c = e.copas?.[id as `K-${string}`];
      expect(c?.campeao, id).toBeTruthy();
      expect(e.partidas.filter((p) => p.serie === id && !p.jogada), id).toHaveLength(0);
      expect(e.partidas.find((p) => p.serie === id && p.fase === "final")?.neutro, id).toBe(true);
    }
    const porClube = new Map<string, string[]>();
    for (const p of e.partidas) for (const c of [p.mandante, p.visitante]) if (e.clubes[c]?.pais === "EN") porClube.set(c, [...(porClube.get(c) ?? []), p.data]);
    for (const [c, datas] of porClube) expect(new Set(datas).size, c).toBe(datas.length);
  });

  it("no jogo novo, os convocados (da América e da Europa) que jogam nos clubes da Europa estão só no clube (sem cópia jogando fora)", () => {
    const europeus = new Set((europaClubesJson.clubes as { id: string }[]).map((c) => c.id));
    let vistos = 0;
    for (const [pais, s] of Object.entries(convocadosJson.selecoes as Record<string, { convocados: { clubeDoJogo?: string; noJogo?: string }[] }>)) {
      for (const c of s.convocados) {
        if (!c.clubeDoJogo || !europeus.has(c.clubeDoJogo)) continue;
        vistos++;
        const com = Object.values(estado.jogadores).filter((j) => j.nome === c.noJogo);
        expect(com.some((j) => j.clubeId === c.clubeDoJogo), c.noJogo).toBe(true);
        // Um xará de outra seleção pode jogar fora (o Roberto Fernández da Bolívia não é o da Espanha, do Espanyol).
        expect(com.filter((j) => j.clubeFora && j.nacionalidade === nacionalidadeDoPais(pais)), c.noJogo).toHaveLength(0);
      }
    }
    expect(vistos).toBeGreaterThan(100);
  });
});
