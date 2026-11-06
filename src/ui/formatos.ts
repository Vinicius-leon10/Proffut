import { nomeDaCompeticao } from "../engine/competicoes";
import { NOME_FASE_COPA } from "../engine/copa";
import { definicaoDaCopa, ehCopaDeClubes, nomeDaFaseDaCopa } from "../engine/copas";
import { NOME_FASE_TORNEIO, PAISES, ehTorneio } from "../engine/torneios";
import { ehCompeticaoDeSelecoes, rotuloDeSelecoes } from "../engine/selecoes";
import type { FaseCopa, Partida } from "../engine/tipos";

/** Letra do grupo (1 → "A"). */
export const letraDoGrupo = (n: number) => String.fromCharCode(64 + n);

export function rotuloPartida(p: Partida): string {
  if (ehCompeticaoDeSelecoes(p.serie)) return rotuloDeSelecoes(undefined, p);
  const serie = nomeDaCompeticao(p.serie);
  if (ehCopaDeClubes(p.serie)) {
    const tipo = definicaoDaCopa(p.serie)?.fases.find((f) => f.id === p.fase)?.tipo;
    const fase = nomeDaFaseDaCopa(p.serie, p.fase);
    if (tipo === "grupos") return `${serie} · Grupo ${letraDoGrupo(p.grupo ?? 1)} · ${p.rodada}ª rodada`;
    if (tipo === "cruzado") return `${serie} · ${fase} · ${p.rodada}ª rodada`;
    return `${serie} · ${fase}${p.perna ? ` (${p.perna === 1 ? "ida" : "volta"})` : ""}`;
  }
  if (ehTorneio(p.serie)) {
    if (p.fase === "liga") return `${serie} · ${p.rodada}ª rodada`;
    if (p.fase === "grupos") return `${serie} · Grupo ${p.grupo} · ${p.rodada}ª rodada`;
    return `${serie} · ${NOME_FASE_TORNEIO[p.fase] ?? p.fase}${p.perna ? ` (${p.perna === 1 ? "ida" : "volta"})` : ""}`;
  }
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
  // Os países da América que faltavam (as nacionalidades dos clubes e das seleções da Concacaf).
  ...Object.fromEntries(Object.values(PAISES).map((p) => [p.nacionalidade, p.pais])),
};

/** Código de duas letras do país de cada nacionalidade (para a bandeira em emoji ao lado do nome do jogador). */
const PAIS_DA_NACIONALIDADE: Record<string, string> = {
  BRA: "BR", POR: "PT", ESP: "ES", ITA: "IT", FRA: "FR", ALE: "DE", HOL: "NL", BEL: "BE", JAP: "JP",
  ANG: "AO", NGA: "NG", GAN: "GH", CMR: "CM", CIV: "CI", SEN: "SN", MAR: "MA", CPV: "CV", MOC: "MZ", GNB: "GW",
  ...Object.fromEntries(Object.entries(PAISES).map(([codigo, p]) => [p.nacionalidade, codigo])),
};

/** Bandeira (emoji) e nome do país do jogador pela nacionalidade ("ARG" → 🇦🇷 Argentina); sem país conhecido, a branca. */
export function bandeiraDaNacionalidade(nacionalidade: string): { bandeira: string; pais: string } {
  const codigo = PAIS_DA_NACIONALIDADE[nacionalidade];
  const pais = NOMES_NACIONALIDADE[nacionalidade] ?? nacionalidade;
  if (!codigo) return { bandeira: "🏳️", pais };
  return { bandeira: String.fromCodePoint(...[...codigo].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)), pais };
}
