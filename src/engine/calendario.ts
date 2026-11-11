import { SABADOS_POR_TEMPORADA, SEMANAS_COM_MEIO_DE_SEMANA } from "./constantes";
import type { Rng } from "./rng";

// Datas no formato "AAAA-MM-DD", tratadas sempre em UTC para não sofrer com fuso.
function paraData(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraIso(d);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000);
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "sáb, 04 abr" */
export function formatarData(iso: string, comAno = false): string {
  const d = paraData(iso);
  const base = `${DIAS_SEMANA[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()]}`;
  return comAno ? `${base} ${d.getUTCFullYear()}` : base;
}

/** Primeiro sábado de abril do ano. */
export function inicioDaTemporada(ano: number): string {
  const d = new Date(Date.UTC(ano, 3, 1, 12));
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return paraIso(d);
}

// ---- a pausa da Copa do Mundo (Modo Copa, nov/2026, R115) -------------------------------------------------

/** Anos de Copa do Mundo (2026, 2030, 2034...). */
export const anoDeCopaDoMundo = (ano: number) => ano % 4 === 2;

/**
 * A janela da Copa do Mundo no ano: da abertura (quinta-feira da semana 9: 11 de junho em 2026) à final (domingo da
 * semana 15: 19 de julho). Pedido do usuário: "o jogo todo vai parar para esse evento de Copa do Mundo"; ele escolheu que
 * os campeonatos de clubes param, como na vida real. As datas batem com `DATAS_COPA` (selecoes.ts).
 */
export function janelaDaCopa(ano: number): { de: string; ate: string } | undefined {
  if (!anoDeCopaDoMundo(ano)) return undefined;
  const inicio = inicioDaTemporada(ano);
  return { de: somarDias(inicio, 9 * 7 + 5), ate: somarDias(inicio, 15 * 7 + 1) };
}

/** A data cai na janela da Copa do Mundo (só nos anos de Copa). */
export function naJanelaDaCopa(data: string): boolean {
  const j = janelaDaCopa(Number(data.slice(0, 4)));
  return !!j && data >= j.de && data <= j.ate;
}

/** A primeira data no mesmo dia da semana depois da Copa (ou a própria data, fora da janela): mata-mata de torneios. */
export function depoisDaCopa(data: string): string {
  let d = data;
  while (naJanelaDaCopa(d)) d = somarDias(d, 7);
  return d;
}

/** Semanas da janela da Copa para as copas de clubes (a semana da abertura inteira fica de fora). */
const SEMANAS_DA_COPA = { de: 9, ate: 15 };

/**
 * As semanas de uma copa de clubes (todas as fases, em ordem) num ano de Copa do Mundo: as que caem na janela passam para
 * a primeira semana depois dela, e as seguintes andam só o necessário para continuar em ordem. Fora dos anos de Copa, as
 * mesmas. Ex.: Sul-Americana [..., 7, 9, 11, 12, 16, 17, 23...] → [..., 7, 16, 17, 18, 19, 20, 23...].
 */
export function semanasForaDaCopa(ano: number, semanas: number[]): number[] {
  if (!anoDeCopaDoMundo(ano)) return semanas;
  const resultado: number[] = [];
  let anterior = -Infinity;
  const naJanela = (x: number) => x >= SEMANAS_DA_COPA.de && x <= SEMANAS_DA_COPA.ate;
  for (const s of semanas) {
    let c = Math.max(naJanela(s) ? SEMANAS_DA_COPA.ate + 1 : s, anterior + 1);
    if (naJanela(c)) c = SEMANAS_DA_COPA.ate + 1;
    // A semana que andou não cai numa das semanas com rodada das séries no meio da semana (senão quem joga a copa na
    // quinta joga também a série na quarta).
    if (c !== s) while (SEMANAS_COM_MEIO_DE_SEMANA.includes(c) || naJanela(c)) c++;
    resultado.push(c);
    anterior = c;
  }
  return resultado;
}

const DIAS = 86_400_000;
const distancia = (a: string, b: string) => Math.abs(paraData(a).getTime() - paraData(b).getTime()) / DIAS;

/**
 * Semanas com jogo de alguma copa de clubes num ano de Copa do Mundo (preenchido por copas.ts e pela Copa do Brasil): as
 * rodadas que saem da janela da Copa não vão para essas semanas, senão quem joga a copa na terça ou na quinta ficaria com
 * jogos em dias seguidos.
 */
export const SEMANAS_COM_COPAS = new Set<number>();

/** A semana da temporada de uma data (0: a do primeiro sábado de abril). */
export function semanaDaData(data: string): number {
  return Math.floor(diasEntre(inicioDaTemporada(Number(data.slice(0, 4))), data) / 7);
}

/**
 * As datas de um campeonato de rodadas (uma data por rodada, em ordem) num ano de Copa do Mundo: as rodadas que caíam na
 * janela vão para quartas-feiras depois da Copa (ou quintas e terças) em semanas sem copa de clubes, sem passar da última
 * data; faltando lugar, para depois da última rodada (no mesmo dia da semana, uma por semana): o campeonato acaba no
 * máximo umas semanas depois do normal, como na vida real. Cada data nova fica a pelo menos 2 dias das outras do campeonato
 * e das de `evitar` (a Copa do Brasil, para as séries). Fora dos anos de Copa, as mesmas.
 */
export function rodadasForaDaCopa(datas: string[], evitar: string[] = []): string[] {
  if (!datas.length) return datas;
  const janela = janelaDaCopa(Number(datas[0].slice(0, 4)));
  if (!janela) return datas;
  const fora = datas.filter((d) => d < janela.de || d > janela.ate);
  const faltam = datas.length - fora.length;
  if (!faltam) return datas;
  const ordenadas = [...datas].sort();
  const ultima = ordenadas.at(-1)!;
  const ocupadas = [...fora, ...evitar];
  const escolhidas: string[] = [];
  const livre = (d: string) => !naJanelaDaCopa(d) && [...ocupadas, ...escolhidas].every((o) => distancia(o, d) >= 2);
  // Depois da Copa e até a última rodada, nas semanas sem copa de clubes: quarta, quinta ou terça.
  for (let segunda = somarDias(janela.ate, 1); segunda <= ultima && escolhidas.length < faltam; segunda = somarDias(segunda, 7)) {
    if (SEMANAS_COM_COPAS.has(semanaDaData(segunda))) continue;
    const opcao = [2, 3, 1].map((k) => somarDias(segunda, k)).find((d) => d <= ultima && livre(d));
    if (opcao) escolhidas.push(opcao);
  }
  // Faltando lugar, depois da última rodada (e da Copa), no mesmo dia da semana dela, uma por semana.
  let d = somarDias(ultima, 7);
  while (d <= janela.ate) d = somarDias(d, 7);
  for (; escolhidas.length < faltam; d = somarDias(d, 7)) if (livre(d)) escolhidas.push(d);
  return [...fora, ...escolhidas].sort();
}

export interface DatasTemporada {
  /** Todas as datas com rodada (sábados + quartas), em ordem. */
  todas: string[];
  sabados: string[];
}

/**
 * Semanas (a partir do primeiro sábado de abril) das quartas-feiras de cada fase da Copa do Brasil: [jogo] ou [ida,
 * volta]. Ficam aqui (e não em copa.ts) porque as séries precisam delas para não marcar rodadas nas mesmas quartas.
 */
export const SEMANAS_COPA_DO_BRASIL: Record<string, number[]> = {
  fase1: [0], fase2: [1], fase3: [2], fase4: [3], fase5: [4, 6], oitavas: [13, 14], quartas: [18, 19], semi: [28, 29], final: [34],
};

/** As semanas da Copa do Brasil no ano (num ano de Copa do Mundo, sem as da janela: `semanasForaDaCopa`). */
export function semanasDaCopaDoBrasil(ano: number): Record<string, number[]> {
  const fases = Object.keys(SEMANAS_COPA_DO_BRASIL);
  const todas = semanasForaDaCopa(ano, fases.flatMap((f) => SEMANAS_COPA_DO_BRASIL[f]));
  const resultado: Record<string, number[]> = {};
  let i = 0;
  for (const f of fases) resultado[f] = SEMANAS_COPA_DO_BRASIL[f].map(() => todas[i++]);
  // Num ano de Copa as séries acabam mais tarde (19 de dezembro em 2026): a final continua o último jogo do ano no Brasil.
  if (anoDeCopaDoMundo(ano)) resultado.final = [SABADOS_POR_TEMPORADA + 2];
  return resultado;
}
// As semanas da Copa do Brasil num ano de Copa do Mundo (as mesmas em todos) entram nas semanas com copas.
for (const semana of Object.values(semanasDaCopaDoBrasil(2026)).flat()) SEMANAS_COM_COPAS.add(semana);

/**
 * As datas das séries: os sábados e as quartas das semanas com meio de semana. Num ano de Copa do Mundo, os sábados da
 * janela saem (a Série C, só aos sábados, acaba umas semanas depois) e as rodadas da Série A e da B que caíam lá vão
 * para quartas depois da Copa, longe das da Copa do Brasil: elas acabam no mesmo sábado de sempre.
 */
export function datasDaTemporada(ano: number): DatasTemporada {
  const inicio = inicioDaTemporada(ano);
  const sabados: string[] = [];
  const todas: string[] = [];
  for (let semana = 0; semana < SABADOS_POR_TEMPORADA; semana++) {
    const sabado = somarDias(inicio, semana * 7);
    sabados.push(sabado);
    todas.push(sabado);
    if (SEMANAS_COM_MEIO_DE_SEMANA.includes(semana)) todas.push(somarDias(sabado, 4));
  }
  if (!anoDeCopaDoMundo(ano)) return { todas, sabados };
  const quartasDaCopa = Object.values(semanasDaCopaDoBrasil(ano)).flat().map((s) => somarDias(inicio, s * 7 + 4));
  return { todas: rodadasForaDaCopa(todas, quartasDaCopa), sabados: sabados.filter((d) => !naJanelaDaCopa(d)) };
}

export type Confronto = [mandante: string, visitante: string];

/** Todos contra todos, turno único (método do círculo), com mando alternado. */
export function turnoUnico(clubes: string[], rng: Rng): Confronto[][] {
  const times = rng.embaralhar([...clubes]);
  if (times.length % 2 === 1) times.push("");
  const n = times.length;
  const rodadas: Confronto[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const jogos: Confronto[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = times[i];
      const b = times[n - 1 - i];
      if (!a || !b) continue;
      // O time fixo alterna casa/fora a cada rodada; nos outros pares o mando depende da posição.
      // Resultado: 9 ou 10 jogos em casa por clube e no máximo 2 seguidos no mesmo mando.
      const inverter = i === 0 ? r % 2 === 1 : i % 2 === 1;
      jogos.push(inverter ? [b, a] : [a, b]);
    }
    rodadas.push(jogos);
    // Gira todos menos o primeiro.
    times.splice(1, 0, times.pop()!);
  }
  return rodadas;
}

/** Turno e returno: o returno repete o turno com o mando invertido. */
export function turnoEReturno(clubes: string[], rng: Rng): Confronto[][] {
  const turno = turnoUnico(clubes, rng);
  const returno = turno.map((jogos) => jogos.map(([a, b]) => [b, a] as Confronto));
  return [...turno, ...returno];
}
