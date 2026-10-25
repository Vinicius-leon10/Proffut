import { NOME_COMPETICAO } from "../engine/competicoes";
import { NOME_FASE_COPA } from "../engine/copa";
import type { FaseCopa, Partida } from "../engine/tipos";

export function rotuloPartida(p: Partida): string {
  const serie = NOME_COMPETICAO[p.serie];
  if (p.serie === "CB") {
    const fase = NOME_FASE_COPA[p.fase as FaseCopa] ?? p.fase;
    return `${serie} · ${fase}${p.perna ? ` (${p.perna === 1 ? "ida" : "volta"})` : ""}`;
  }
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
  POR: "Portugal", ESP: "Espanha", ITA: "Itália", FRA: "França", ALE: "Alemanha", HOL: "Holanda", BEL: "Bélgica",
  EUA: "Estados Unidos", MEX: "México", CRC: "Costa Rica", PAN: "Panamá", HON: "Honduras", HAI: "Haiti", JAP: "Japão",
  ANG: "Angola", NGA: "Nigéria", GAN: "Gana", CMR: "Camarões", CIV: "Costa do Marfim", SEN: "Senegal", MAR: "Marrocos",
  CPV: "Cabo Verde", MOC: "Moçambique", GNB: "Guiné-Bissau",
};
