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

export interface DatasTemporada {
  /** Todas as datas com rodada (sábados + quartas), em ordem. */
  todas: string[];
  sabados: string[];
}

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
  return { todas, sabados };
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
