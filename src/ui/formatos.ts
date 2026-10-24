import { NOME_SERIE } from "../engine/competicoes";
import type { Partida } from "../engine/tipos";

export function rotuloPartida(p: Partida): string {
  const serie = NOME_SERIE[p.serie];
  switch (p.fase) {
    case "liga":
    case "primeira":
      return `${serie} · ${p.rodada}ª rodada`;
    case "playoff":
      return `${serie} · Playoff de acesso (${p.perna === 1 ? "ida" : "volta"})`;
    case "quadrangulares":
      return `${serie} · Quadrangular ${p.grupo} · ${p.rodada}ª rodada`;
    case "final":
      return `${serie} · Final (${p.perna === 1 ? "ida" : "volta"})`;
    default:
      return serie;
  }
}

export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

export const NOMES_NACIONALIDADE: Record<string, string> = {
  BRA: "Brasil", ARG: "Argentina", URU: "Uruguai", COL: "Colômbia", PAR: "Paraguai",
  CHI: "Chile", EQU: "Equador", VEN: "Venezuela", PER: "Peru", BOL: "Bolívia",
};
