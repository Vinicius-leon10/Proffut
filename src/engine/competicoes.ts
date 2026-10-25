// Séries A, B e C com os regulamentos de 2026: tabela, desempate e mudança de fase.
import { datasDaTemporada, turnoEReturno, turnoUnico, type Confronto } from "./calendario";
import { hashTexto, rngPara } from "./rng";
import type { Competicao, EstadoJogo, EstadoSerie, Partida, SerieId } from "./tipos";

export const SERIES: SerieId[] = ["A", "B", "C"];
export const NOME_SERIE: Record<SerieId, string> = { A: "Série A", B: "Série B", C: "Série C" };
export const NOME_COMPETICAO: Record<Competicao, string> = { ...NOME_SERIE, CB: "Copa do Brasil" };

/** Zonas da tabela da fase de liga, para colorir a classificação. */
export const ZONAS: Record<SerieId, { posicoes: number[]; tipo: "acesso" | "playoff" | "classifica" | "rebaixamento" | "titulo"; nome: string }[]> = {
  A: [
    { posicoes: [1], tipo: "titulo", nome: "Campeão" },
    { posicoes: [17, 18, 19, 20], tipo: "rebaixamento", nome: "Rebaixamento" },
  ],
  B: [
    { posicoes: [1, 2], tipo: "acesso", nome: "Acesso direto" },
    { posicoes: [3, 4, 5, 6], tipo: "playoff", nome: "Playoff de acesso" },
    { posicoes: [17, 18, 19, 20], tipo: "rebaixamento", nome: "Rebaixamento" },
  ],
  C: [
    { posicoes: [1, 2, 3, 4, 5, 6, 7, 8], tipo: "classifica", nome: "Quadrangulares" },
    { posicoes: [19, 20], tipo: "rebaixamento", nome: "Rebaixamento" },
  ],
};

export const FASE_LIGA: Record<SerieId, string> = { A: "liga", B: "liga", C: "primeira" };

// ---- criação da temporada ---------------------------------------------------------

function partidasDeRodadas(
  ano: number, serie: SerieId, fase: string, rodadas: Confronto[][], datas: string[], extra: Partial<Partida> = {}, rodadaInicial = 1,
): Partida[] {
  const lista: Partida[] = [];
  rodadas.forEach((jogos, r) => {
    jogos.forEach(([mandante, visitante], i) => {
      lista.push({
        id: `${ano}-${serie}-${fase}${extra.grupo ? `g${extra.grupo}` : ""}-${r + rodadaInicial}-${i}`,
        serie, fase, rodada: r + rodadaInicial, data: datas[r], mandante, visitante,
        jogada: false, gm: 0, gv: 0, eventos: [], ...extra,
      });
    });
  });
  return lista;
}

/** Monta as três séries e todos os jogos da fase de liga. */
export function criarTemporada(estado: EstadoJogo) {
  const ano = estado.temporada;
  const datas = datasDaTemporada(ano);
  estado.partidas = [];
  for (const serie of SERIES) {
    const clubes = Object.values(estado.clubes).filter((c) => c.serie === serie).map((c) => c.id).sort();
    const rng = rngPara(estado.semente, `tabela/${ano}/${serie}`);
    const rodadas = serie === "C" ? turnoUnico(clubes, rng) : turnoEReturno(clubes, rng);
    const datasSerie = serie === "C" ? datas.sabados : datas.todas;
    estado.partidas.push(...partidasDeRodadas(ano, serie, FASE_LIGA[serie], rodadas, datasSerie));
    estado.series[serie] = {
      id: serie, nome: NOME_SERIE[serie], clubes, fase: "liga", promovidos: [], rebaixados: [],
    };
  }
  estado.partidas.sort((a, b) => a.data.localeCompare(b.data) || a.serie.localeCompare(b.serie));
}

// ---- classificação ---------------------------------------------------------------

export interface LinhaTabela {
  clubeId: string;
  pos: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  sg: number;
  pts: number;
  ultimos: ("V" | "E" | "D")[];
}

function linhaVazia(clubeId: string): LinhaTabela {
  return { clubeId, pos: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0, ultimos: [] };
}

function somar(linhas: Map<string, LinhaTabela>, p: Partida) {
  const m = linhas.get(p.mandante);
  const v = linhas.get(p.visitante);
  if (!m || !v) return;
  m.j++; v.j++;
  m.gp += p.gm; m.gc += p.gv; v.gp += p.gv; v.gc += p.gm;
  if (p.gm > p.gv) { m.v++; m.pts += 3; v.d++; m.ultimos.push("V"); v.ultimos.push("D"); }
  else if (p.gm < p.gv) { v.v++; v.pts += 3; m.d++; m.ultimos.push("D"); v.ultimos.push("V"); }
  else { m.e++; v.e++; m.pts++; v.pts++; m.ultimos.push("E"); v.ultimos.push("E"); }
  m.sg = m.gp - m.gc; v.sg = v.gp - v.gc;
}

/**
 * Classificação de uma fase (ou de um grupo). Desempate: pontos, vitórias,
 * saldo, gols pró, confronto direto entre os empatados e sorteio.
 */
export function classificacao(estado: EstadoJogo, serie: SerieId, fase: string, clubes: string[], grupo?: number): LinhaTabela[] {
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase && p.jogada && (grupo == null || p.grupo === grupo));
  const linhas = new Map(clubes.map((c) => [c, linhaVazia(c)]));
  for (const p of jogos) somar(linhas, p);
  const lista = [...linhas.values()];
  const sorteio = (id: string) => hashTexto(`${estado.temporada}/${serie}/${id}`, estado.semente);
  const criterio = (a: LinhaTabela, b: LinhaTabela) => b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp;
  lista.sort(criterio);
  // Confronto direto entre os que seguem empatados.
  const ordenada: LinhaTabela[] = [];
  for (let i = 0; i < lista.length;) {
    let k = i + 1;
    while (k < lista.length && criterio(lista[i], lista[k]) === 0) k++;
    const empatados = lista.slice(i, k);
    if (empatados.length > 1) {
      const ids = new Set(empatados.map((l) => l.clubeId));
      const mini = new Map(empatados.map((l) => [l.clubeId, linhaVazia(l.clubeId)]));
      for (const p of jogos) if (ids.has(p.mandante) && ids.has(p.visitante)) somar(mini, p);
      empatados.sort((a, b) => {
        const ma = mini.get(a.clubeId)!, mb = mini.get(b.clubeId)!;
        return mb.pts - ma.pts || mb.sg - ma.sg || sorteio(a.clubeId) - sorteio(b.clubeId);
      });
    }
    ordenada.push(...empatados);
    i = k;
  }
  ordenada.forEach((l, i) => { l.pos = i + 1; l.ultimos = l.ultimos.slice(-5); });
  return ordenada;
}

export function tabelaDaLiga(estado: EstadoJogo, serie: SerieId): LinhaTabela[] {
  return classificacao(estado, serie, FASE_LIGA[serie], estado.series[serie].clubes);
}

export function posicaoNaLiga(estado: EstadoJogo, clubeId: string): number {
  const serie = estado.clubes[clubeId].serie;
  if (serie === "D") return 0;
  return tabelaDaLiga(estado, serie).find((l) => l.clubeId === clubeId)?.pos ?? 0;
}

// ---- mata-mata ----------------------------------------------------------------------

export interface Chave {
  chave: number;
  ida?: Partida;
  volta?: Partida;
  /** Quem tem a vantagem (melhor campanha) e manda o jogo de volta. */
  melhor: string;
  pior: string;
}

export function chavesDaFase(estado: EstadoJogo, serie: Competicao, fase: string): Chave[] {
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase);
  const chaves = new Map<number, Chave>();
  for (const p of jogos) {
    const n = p.chave ?? 0;
    const c = chaves.get(n) ?? { chave: n, melhor: "", pior: "" };
    if (p.perna === 1) { c.ida = p; c.pior = p.mandante; c.melhor = p.visitante; } else c.volta = p;
    chaves.set(n, c);
  }
  return [...chaves.values()].sort((a, b) => a.chave - b.chave);
}

/** Placar agregado do ponto de vista de [melhor, pior]. */
export function agregado(c: Chave): [number, number] {
  let melhor = 0, pior = 0;
  for (const p of [c.ida, c.volta]) {
    if (!p?.jogada) continue;
    if (p.mandante === c.melhor) { melhor += p.gm; pior += p.gv; } else { melhor += p.gv; pior += p.gm; }
  }
  return [melhor, pior];
}

/** Vencedor de uma chave já encerrada. Empate: pênaltis (se houve) ou melhor campanha. */
export function vencedorDaChave(c: Chave): string | null {
  if (!c.ida?.jogada || !c.volta?.jogada) return null;
  const [m, p] = agregado(c);
  if (m !== p) return m > p ? c.melhor : c.pior;
  if (c.volta.penaltis) {
    const [pm, pv] = c.volta.penaltis; // do ponto de vista do mandante da volta (o melhor)
    return pm > pv ? c.volta.mandante : c.volta.visitante;
  }
  return c.melhor;
}

function criarChaves(ano: number, serie: SerieId, fase: string, pares: [melhor: string, pior: string][], datas: [string, string]): Partida[] {
  const lista: Partida[] = [];
  pares.forEach(([melhor, pior], i) => {
    const base = { serie, fase, jogada: false, gm: 0, gv: 0, eventos: [], chave: i + 1 };
    lista.push({ ...base, id: `${ano}-${serie}-${fase}-${i + 1}-ida`, rodada: 1, perna: 1, data: datas[0], mandante: pior, visitante: melhor });
    lista.push({ ...base, id: `${ano}-${serie}-${fase}-${i + 1}-volta`, rodada: 2, perna: 2, data: datas[1], mandante: melhor, visitante: pior });
  });
  return lista;
}

// ---- mudança de fase ------------------------------------------------------------------

function faseCompleta(estado: EstadoJogo, serie: SerieId, fase: string): boolean {
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase);
  return jogos.length > 0 && jogos.every((p) => p.jogada);
}

/**
 * Depois de cada dia de jogos: se uma fase terminou, monta a próxima e
 * registra campeões, promovidos e rebaixados. Retorna as notícias geradas.
 */
export function avancarFases(estado: EstadoJogo): string[] {
  const noticias: string[] = [];
  const ano = estado.temporada;
  const datas = datasDaTemporada(ano);
  const nome = (id: string) => estado.clubes[id].nome;

  // Série A
  const a = estado.series.A;
  if (a.fase === "liga" && faseCompleta(estado, "A", "liga")) {
    const t = tabelaDaLiga(estado, "A");
    a.campeao = t[0].clubeId;
    a.rebaixados = t.slice(16).map((l) => l.clubeId);
    a.fase = "encerrada";
    noticias.push(`${nome(a.campeao)} é campeão da Série A ${ano}!`);
  }

  // Série B
  const b = estado.series.B;
  if (b.fase === "liga" && faseCompleta(estado, "B", "liga")) {
    const t = tabelaDaLiga(estado, "B");
    b.campeao = t[0].clubeId;
    b.promovidos = [t[0].clubeId, t[1].clubeId];
    b.rebaixados = t.slice(16).map((l) => l.clubeId);
    const pares: [string, string][] = [[t[2].clubeId, t[5].clubeId], [t[3].clubeId, t[4].clubeId]];
    estado.partidas.push(...criarChaves(ano, "B", "playoff", pares, [datas.todas[38], datas.todas[39]]));
    b.fase = "playoff";
    noticias.push(`${nome(t[0].clubeId)} e ${nome(t[1].clubeId)} sobem para a Série A! Playoff: ${nome(pares[0][1])} x ${nome(pares[0][0])} e ${nome(pares[1][1])} x ${nome(pares[1][0])}.`);
  } else if (b.fase === "playoff" && faseCompleta(estado, "B", "playoff")) {
    for (const c of chavesDaFase(estado, "B", "playoff")) {
      const v = vencedorDaChave(c);
      if (v) { b.promovidos.push(v); noticias.push(`${nome(v)} vence o playoff e sobe para a Série A!`); }
    }
    b.fase = "encerrada";
  }

  // Série C
  const c = estado.series.C;
  if (c.fase === "liga" && faseCompleta(estado, "C", "primeira")) {
    const t = tabelaDaLiga(estado, "C");
    const ids = t.map((l) => l.clubeId);
    c.grupos = [[ids[0], ids[3], ids[4], ids[7]], [ids[1], ids[2], ids[5], ids[6]]];
    c.rebaixados = ids.slice(18);
    c.grupos.forEach((grupo, g) => {
      const rodadas = turnoEReturno(grupo, rngPara(estado.semente, `quadrangular/${ano}/${g}`));
      estado.partidas.push(...partidasDeRodadas(ano, "C", "quadrangulares", rodadas, datas.sabados.slice(19, 25), { grupo: g + 1 }));
    });
    c.fase = "quadrangulares";
    noticias.push(`Série C: definidos os quadrangulares. ${c.rebaixados.map(nome).join(" e ")} caem para a Série D.`);
  } else if (c.fase === "quadrangulares" && faseCompleta(estado, "C", "quadrangulares")) {
    const ordemPrimeira = tabelaDaLiga(estado, "C").map((l) => l.clubeId);
    const lideres: string[] = [];
    c.promovidos = [];
    c.grupos!.forEach((grupo, g) => {
      const t = classificacao(estado, "C", "quadrangulares", grupo, g + 1);
      c.promovidos.push(t[0].clubeId, t[1].clubeId);
      lideres.push(t[0].clubeId);
    });
    lideres.sort((x, y) => ordemPrimeira.indexOf(x) - ordemPrimeira.indexOf(y));
    estado.partidas.push(...criarChaves(ano, "C", "final", [[lideres[0], lideres[1]]], [datas.sabados[25], datas.sabados[26]]));
    c.fase = "final";
    noticias.push(`Sobem para a Série B: ${c.promovidos.map(nome).join(", ")}. Final da Série C: ${nome(lideres[0])} x ${nome(lideres[1])}.`);
  } else if (c.fase === "final" && faseCompleta(estado, "C", "final")) {
    const [chave] = chavesDaFase(estado, "C", "final");
    c.campeao = vencedorDaChave(chave) ?? chave.melhor;
    c.fase = "encerrada";
    noticias.push(`${nome(c.campeao)} é campeão da Série C ${ano}!`);
  }

  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
  return noticias;
}

export function temporadaEncerrada(estado: EstadoJogo): boolean {
  return SERIES.every((s) => estado.series[s].fase === "encerrada") && (!estado.copa || estado.copa.fase === "encerrada");
}

/**
 * Empate nesta partida (no placar, se é jogo único, ou no agregado, se é a volta) vai para os pênaltis?
 * Final da Série C e todos os mata-matas da Copa do Brasil.
 */
export function decidePorPenaltis(p: Partida): boolean {
  if (p.serie === "CB") return p.perna !== 1;
  return p.perna === 2 && p.serie === "C" && p.fase === "final";
}

export function chaveDaPartida(estado: EstadoJogo, p: Partida): Chave | undefined {
  if (!p.chave) return undefined;
  return chavesDaFase(estado, p.serie, p.fase).find((c) => c.chave === p.chave);
}

export type { EstadoSerie };
