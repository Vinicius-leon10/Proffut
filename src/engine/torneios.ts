// Série D, estaduais e ligas dos outros países da Conmebol: quem joga, os jogos, as fases e os campeões.
//
// - Série D: grupos regionais de 6 em turno e returno (os 4 melhores passam) e mata-mata em ida e volta, com a volta
//   na casa da melhor campanha e pênaltis se empatar no agregado. Sobem para a Série C os dois finalistas (tantos
//   quantos a Série C rebaixa). Domingos, a partir da semana 0 (abril).
// - Estaduais: no começo do ano, aos domingos antes das séries, no máximo 11 datas (como em 2026). Até 6 clubes:
//   turno e returno e final; de 7 a 10: turno único, semifinal e final; 11 ou mais: dois grupos em turno único,
//   quartas, semifinal e final. Mata-mata em jogo único na casa da melhor campanha, com pênaltis se empatar.
// - Ligas de fora: pontos corridos, em turno e returno quando cabe nos domingos da temporada (até 18 clubes) e em
//   turno único nas maiores. O campeão é o primeiro.
import { comArtigo, concorda } from "./artigos";
import { inicioDaTemporada, somarDias, turnoEReturno, turnoUnico, type Confronto } from "./calendario";
import { chavesDaFase, classificacao, vencedorDaChave, type LinhaTabela } from "./competicoes";
import { hashTexto, rngPara } from "./rng";
import type { Clube, Competicao, EstadoJogo, EstadoTorneio, IdTorneio, Partida } from "./tipos";

export const NOME_ESTADUAL: Record<string, string> = {
  AC: "Acriano", AL: "Alagoano", AP: "Amapaense", AM: "Amazonense", BA: "Baiano", CE: "Cearense", DF: "Brasiliense",
  ES: "Capixaba", GO: "Goiano", MA: "Maranhense", MT: "Mato-Grossense", MS: "Sul-Mato-Grossense", MG: "Mineiro",
  PA: "Paraense", PB: "Paraibano", PR: "Paranaense", PE: "Pernambucano", PI: "Piauiense", RJ: "Carioca", RN: "Potiguar",
  RS: "Gaúcho", RO: "Rondoniense", RR: "Roraimense", SC: "Catarinense", SP: "Paulista", SE: "Sergipano", TO: "Tocantinense",
};

/** Os outros países da Conmebol: nome do país, do campeonato (em português) e a nacionalidade dos jogadores. */
export const PAISES: Record<string, { pais: string; liga: string; nacionalidade: string }> = {
  AR: { pais: "Argentina", liga: "Campeonato Argentino", nacionalidade: "ARG" },
  BO: { pais: "Bolívia", liga: "Campeonato Boliviano", nacionalidade: "BOL" },
  CL: { pais: "Chile", liga: "Campeonato Chileno", nacionalidade: "CHI" },
  CO: { pais: "Colômbia", liga: "Campeonato Colombiano", nacionalidade: "COL" },
  EC: { pais: "Equador", liga: "Campeonato Equatoriano", nacionalidade: "EQU" },
  PY: { pais: "Paraguai", liga: "Campeonato Paraguaio", nacionalidade: "PAR" },
  PE: { pais: "Peru", liga: "Campeonato Peruano", nacionalidade: "PER" },
  UY: { pais: "Uruguai", liga: "Campeonato Uruguaio", nacionalidade: "URU" },
  VE: { pais: "Venezuela", liga: "Campeonato Venezuelano", nacionalidade: "VEN" },
};

/** Semana do primeiro domingo dos estaduais (as séries começam na semana 0, o primeiro sábado de abril). */
export const SEMANA_ESTADUAIS = -12;
/** Datas dos estaduais (como em 2026). */
const DATAS_ESTADUAL = 11;
/** Tamanho dos grupos da Série D (16 grupos de 6 com 96 clubes, como em 2026). */
const GRUPO_SERIE_D = 6;
/** Quantos passam de cada grupo (Série D e estaduais grandes). */
const PASSAM_DO_GRUPO = 4;
/** Ordem dos estados de norte a sul: os grupos da Série D são regionais. */
const ORDEM_REGIONAL = ["AC", "AM", "RR", "RO", "AP", "PA", "TO", "MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA",
  "MT", "MS", "GO", "DF", "MG", "ES", "RJ", "SP", "PR", "SC", "RS"];
/** Fases do mata-mata pelo número de clubes que entram nela. */
const FASE_DO_MATA_MATA: Record<number, string> = { 64: "segunda", 32: "terceira", 16: "oitavas", 8: "quartas", 4: "semi", 2: "final" };
export const NOME_FASE_TORNEIO: Record<string, string> = {
  liga: "Pontos corridos", grupos: "Fase de grupos", segunda: "2ª fase", terceira: "3ª fase", oitavas: "Oitavas de final",
  quartas: "Quartas de final", semi: "Semifinal", final: "Final", encerrada: "Encerrado",
};

export function ehTorneio(c: Competicao): c is IdTorneio {
  return c === "D" || c.startsWith("E-") || c.startsWith("L-");
}

/** "Série D", "Campeonato Paulista", "Campeonato Argentino". */
export function nomeDoTorneio(id: IdTorneio): string {
  if (id === "D") return "Série D";
  if (id.startsWith("E-")) return `Campeonato ${NOME_ESTADUAL[id.slice(2)] ?? id.slice(2)}`;
  return PAISES[id.slice(2)]?.liga ?? `Liga ${id.slice(2)}`;
}

/** Domingo da semana `semana` da temporada (contando do primeiro sábado de abril). */
export function domingo(ano: number, semana: number): string {
  return somarDias(inicioDaTemporada(ano), semana * 7 + 1);
}

/** Dia em que a temporada começa: uma semana antes dos estaduais. */
export function inicioDoAno(ano: number): string {
  return somarDias(domingo(ano, SEMANA_ESTADUAIS), -8);
}

// ---- quem joga ----------------------------------------------------------------------------

/** Clubes que jogam cada torneio nesta temporada, pela série, pelo estadual e pela liga de cada clube. */
export function participantes(estado: EstadoJogo): Partial<Record<IdTorneio, string[]>> {
  const lista: Partial<Record<IdTorneio, string[]>> = {};
  const temElenco = new Set(Object.values(estado.jogadores).map((j) => j.clubeId));
  const juntar = (id: IdTorneio, c: Clube) => { (lista[id] ??= []).push(c.id); };
  for (const c of Object.values(estado.clubes)) {
    if (!temElenco.has(c.id)) continue;
    if (c.serie === "D") juntar("D", c);
    if (c.estadual) juntar(`E-${c.estadual}`, c);
    if (c.serie === "exterior" && c.liga) juntar(`L-${c.liga}`, c);
  }
  for (const id of Object.keys(lista) as IdTorneio[]) {
    lista[id]!.sort();
    // Torneio com menos de 4 clubes não se joga.
    if (lista[id]!.length < 4) delete lista[id];
  }
  return lista;
}

// ---- jogos ----------------------------------------------------------------------------------

function partidasDasRodadas(ano: number, id: IdTorneio, fase: string, rodadas: Confronto[][], datas: string[], grupo?: number): Partida[] {
  const lista: Partida[] = [];
  rodadas.forEach((jogos, r) => {
    jogos.forEach(([mandante, visitante], i) => {
      lista.push({
        id: `${ano}-${id}-${fase}${grupo ? `g${grupo}` : ""}-${r + 1}-${i}`,
        serie: id, fase, rodada: r + 1, data: datas[r], mandante, visitante, jogada: false, gm: 0, gv: 0, eventos: [],
        ...(grupo ? { grupo } : {}),
      });
    });
  });
  return lista;
}

/** Divide em grupos de tamanho quase igual, na ordem dada (para a Série D, de norte a sul). */
function dividir(ordem: string[], tamanho: number): string[][] {
  const quantos = Math.max(1, Math.round(ordem.length / tamanho));
  const grupos: string[][] = Array.from({ length: quantos }, () => []);
  const base = Math.floor(ordem.length / quantos);
  const sobra = ordem.length % quantos;
  let i = 0;
  grupos.forEach((g, k) => { const n = base + (k < sobra ? 1 : 0); g.push(...ordem.slice(i, i + n)); i += n; });
  return grupos;
}

/**
 * Monta os torneios da temporada (Série D, estaduais e ligas de fora) e todos os jogos da primeira fase.
 * `semEstaduais`: num save antigo que ganha os torneios com a temporada já em março, os estaduais ficam para a próxima.
 */
export function criarTorneios(estado: EstadoJogo, { semEstaduais = false } = {}) {
  const ano = estado.temporada;
  const torneios: Partial<Record<IdTorneio, EstadoTorneio>> = {};
  const lista = participantes(estado);
  const reputacao = (id: string) => estado.clubes[id].reputacao;
  for (const id of Object.keys(lista) as IdTorneio[]) {
    if (semEstaduais && id.startsWith("E-")) continue;
    const clubes = lista[id]!;
    const rng = rngPara(estado.semente, `torneio/${ano}/${id}`);
    const t: EstadoTorneio = { id, tipo: id === "D" ? "serie-d" : id.startsWith("E-") ? "estadual" : "liga", nome: nomeDoTorneio(id), clubes, fase: "liga" };
    if (t.tipo === "serie-d") {
      const regiao = (c: string) => ORDEM_REGIONAL.indexOf(estado.clubes[c].estado);
      const ordem = [...clubes].sort((a, b) => regiao(a) - regiao(b) || estado.clubes[a].estado.localeCompare(estado.clubes[b].estado) || reputacao(b) - reputacao(a) || a.localeCompare(b));
      t.grupos = dividir(ordem, GRUPO_SERIE_D);
      t.fase = "grupos";
      t.grupos.forEach((g, k) => {
        const rodadas = turnoEReturno(g, rngPara(estado.semente, `torneio/${ano}/${id}/grupo${k}`));
        estado.partidas.push(...partidasDasRodadas(ano, id, "grupos", rodadas, rodadas.map((_, r) => domingo(ano, r)), k + 1));
      });
    } else if (t.tipo === "estadual") {
      const datas = Array.from({ length: DATAS_ESTADUAL }, (_, r) => domingo(ano, SEMANA_ESTADUAIS + r));
      if (clubes.length >= 11) {
        // Dois grupos equilibrados pela reputação (1º e 4º num, 2º e 3º no outro...), turno único dentro do grupo.
        const ordem = [...clubes].sort((a, b) => reputacao(b) - reputacao(a) || a.localeCompare(b));
        t.grupos = [[], []];
        ordem.forEach((c, i) => t.grupos![[0, 1, 1, 0][i % 4]].push(c));
        t.fase = "grupos";
        t.grupos.forEach((g, k) => {
          estado.partidas.push(...partidasDasRodadas(ano, id, "grupos", turnoUnico(g, rngPara(estado.semente, `torneio/${ano}/${id}/grupo${k}`)), datas, k + 1));
        });
      } else {
        const rodadas = clubes.length <= 6 ? turnoEReturno(clubes, rng) : turnoUnico(clubes, rng);
        estado.partidas.push(...partidasDasRodadas(ano, id, "liga", rodadas, datas));
      }
    } else {
      const ida = turnoUnico(clubes, rng);
      const rodadas = 2 * ida.length <= 35 ? [...ida, ...ida.map((jogos) => jogos.map(([a, b]) => [b, a] as Confronto))] : ida;
      estado.partidas.push(...partidasDasRodadas(ano, id, "liga", rodadas, rodadas.map((_, r) => domingo(ano, r))));
    }
    torneios[id] = t;
  }
  estado.torneios = torneios;
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
}

// ---- classificação --------------------------------------------------------------------------

export function tabelaDoTorneio(estado: EstadoJogo, t: EstadoTorneio, grupo?: number): LinhaTabela[] {
  if (grupo != null && t.grupos) return classificacao(estado, t.id, "grupos", t.grupos[grupo - 1], grupo);
  return classificacao(estado, t.id, "liga", t.clubes);
}

/** Posição do clube na fase de classificação do torneio (no grupo dele, se há grupos); 0 se não joga. */
export function posicaoNoTorneio(estado: EstadoJogo, t: EstadoTorneio, clubeId: string): number {
  const g = t.grupos?.findIndex((x) => x.includes(clubeId)) ?? -1;
  const tabela = t.grupos ? (g >= 0 ? tabelaDoTorneio(estado, t, g + 1) : []) : tabelaDoTorneio(estado, t);
  return tabela.find((l) => l.clubeId === clubeId)?.pos ?? 0;
}

/** Quem passa da fase de classificação, da melhor campanha para a pior. */
function classificados(estado: EstadoJogo, t: EstadoTorneio, quantos: number): string[] {
  const sorteio = (id: string) => hashTexto(`${estado.temporada}/${t.id}/${id}`, estado.semente);
  if (!t.grupos) return tabelaDoTorneio(estado, t).slice(0, quantos).map((l) => l.clubeId);
  const linhas = t.grupos.flatMap((_, g) => tabelaDoTorneio(estado, t, g + 1).slice(0, PASSAM_DO_GRUPO));
  linhas.sort((a, b) => a.pos - b.pos || b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp || sorteio(a.clubeId) - sorteio(b.clubeId));
  return linhas.slice(0, quantos).map((l) => l.clubeId);
}

// ---- mata-mata --------------------------------------------------------------------------------

const ultimaData = (estado: EstadoJogo, id: IdTorneio) =>
  estado.partidas.reduce((d, p) => (p.serie === id && p.data > d ? p.data : d), "");

/** Monta a fase do mata-mata: o melhor contra o pior que restam (1 x último, 2 x penúltimo...). */
function criarMataMata(estado: EstadoJogo, t: EstadoTorneio, clubes: string[]) {
  const ano = estado.temporada;
  const fase = FASE_DO_MATA_MATA[clubes.length] ?? `fase${clubes.length}`;
  const ordem = [...clubes].sort((a, b) => t.semeados!.indexOf(a) - t.semeados!.indexOf(b));
  const proximo = somarDias(ultimaData(estado, t.id), 7);
  const idaEVolta = t.tipo === "serie-d";
  const base = { serie: t.id, fase, jogada: false, gm: 0, gv: 0, eventos: [] };
  for (let i = 0; i < ordem.length / 2; i++) {
    const [melhor, pior] = [ordem[i], ordem[ordem.length - 1 - i]];
    const chave = i + 1;
    if (idaEVolta) {
      estado.partidas.push({ ...base, id: `${ano}-${t.id}-${fase}-${chave}-ida`, chave, rodada: 1, perna: 1, data: proximo, mandante: pior, visitante: melhor });
      estado.partidas.push({ ...base, id: `${ano}-${t.id}-${fase}-${chave}-volta`, chave, rodada: 2, perna: 2, data: somarDias(proximo, 7), mandante: melhor, visitante: pior });
    } else {
      estado.partidas.push({ ...base, id: `${ano}-${t.id}-${fase}-${chave}`, chave, rodada: 1, data: proximo, mandante: melhor, visitante: pior });
    }
  }
  t.fase = fase;
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
}

/** Quem passou num confronto do mata-mata (jogo único ou ida e volta); null se ainda não acabou. */
export function vencedorNoTorneio(estado: EstadoJogo, id: IdTorneio, fase: string, chave: number): string | null {
  const jogos = estado.partidas.filter((p) => p.serie === id && p.fase === fase && p.chave === chave);
  if (jogos.length === 1) {
    const [p] = jogos;
    if (!p.jogada) return null;
    if (p.gm !== p.gv) return p.gm > p.gv ? p.mandante : p.visitante;
    if (p.penaltis) return p.penaltis[0] > p.penaltis[1] ? p.mandante : p.visitante;
    return p.mandante;
  }
  const confronto = chavesDaFase(estado, id, fase).find((c) => c.chave === chave);
  return confronto ? vencedorDaChave(confronto) : null;
}

/** Mata-mata dos torneios: empate no jogo único ou no agregado da volta vai para os pênaltis. */
export function torneioDecidePorPenaltis(p: Partida): boolean {
  if (!ehTorneio(p.serie) || p.fase === "liga" || p.fase === "grupos") return false;
  return p.perna !== 1;
}

// ---- andamento ------------------------------------------------------------------------------

function faseCompleta(estado: EstadoJogo, id: IdTorneio, fase: string): boolean {
  const jogos = estado.partidas.filter((p) => p.serie === id && p.fase === fase);
  return jogos.length > 0 && jogos.every((p) => p.jogada);
}

/** Torneios que o clube do usuário joga nesta temporada. */
export function torneiosDoClube(estado: EstadoJogo, clubeId: string): EstadoTorneio[] {
  return Object.values(estado.torneios ?? {}).filter((t): t is EstadoTorneio => !!t && t.clubes.includes(clubeId));
}

/**
 * Depois de cada dia de jogos: fase encerrada vira a próxima (ou o título). Notícias só do que interessa ao usuário:
 * os torneios dele, quem sobe da Série D e os campeões estaduais (numa mensagem só, quando o último termina).
 */
export function avancarTorneios(estado: EstadoJogo): string[] {
  const noticias: string[] = [];
  const meu = estado.tecnico.clubeId;
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  let acabouUmEstadual = false;
  for (const t of Object.values(estado.torneios ?? {})) {
    if (!t || t.fase === "encerrada" || !faseCompleta(estado, t.id, t.fase)) continue;
    const doUsuario = t.clubes.includes(meu);
    if (t.fase === "liga" || t.fase === "grupos") {
      if (t.tipo === "liga") {
        const tabela = tabelaDoTorneio(estado, t);
        t.campeao = tabela[0].clubeId;
        t.vice = tabela[1]?.clubeId;
        t.fase = "encerrada";
        continue;
      }
      // Estadual pequeno: final entre os dois primeiros; médio: semifinal com 4; grande e Série D: 4 de cada grupo.
      const quantos = t.grupos ? 2 ** Math.floor(Math.log2(t.grupos.length * PASSAM_DO_GRUPO)) : t.clubes.length <= 6 ? 2 : 4;
      t.semeados = classificados(estado, t, quantos);
      criarMataMata(estado, t, t.semeados);
      const fase: string = t.fase;
      if (doUsuario) {
        noticias.push(t.semeados.includes(meu)
          ? `${t.nome}: ${comArtigo("o", estado.clubes[meu])} passou para ${fase === "final" ? "a final" : `${fase === "quartas" || fase === "oitavas" ? "as" : "a"} ${NOME_FASE_TORNEIO[fase].toLowerCase()}`}.`
          : `${t.nome}: ${comArtigo("o", estado.clubes[meu])} ficou fora do mata-mata.`);
      }
      continue;
    }
    // Mata-mata: quem passou de cada confronto.
    const chaves = [...new Set(estado.partidas.filter((p) => p.serie === t.id && p.fase === t.fase).map((p) => p.chave!))].sort((a, b) => a - b);
    const vencedores = chaves.map((c) => vencedorNoTorneio(estado, t.id, t.fase, c)!).filter(Boolean);
    const estavaNaFase = estado.partidas.some((p) => p.serie === t.id && p.fase === t.fase && (p.mandante === meu || p.visitante === meu));
    if (t.fase === "final") {
      const final = estado.partidas.find((p) => p.serie === t.id && p.fase === "final")!;
      t.campeao = vencedores[0];
      t.vice = final.mandante === t.campeao ? final.visitante : final.mandante;
      t.fase = "encerrada";
      if (t.tipo === "estadual") acabouUmEstadual = true;
      const campeao = estado.clubes[t.campeao];
      if (doUsuario || t.id === "D") noticias.push(`${campeao.nome} é ${concorda(campeao, "campeão", "campeã")} ${t.id === "D" ? "da" : "do"} ${t.nome} ${estado.temporada}!`);
      continue;
    }
    if (t.tipo === "serie-d" && t.fase === "semi") {
      t.promovidos = vencedores;
      noticias.push(`Sobem para a Série C: ${vencedores.map(nome).join(" e ")}.`);
    }
    if (estavaNaFase && !vencedores.includes(meu)) {
      const clube = estado.clubes[meu];
      noticias.push(`${comArtigo("O", clube)} foi ${concorda(clube, "eliminado", "eliminada")} ${t.id === "D" ? "da" : "do"} ${t.nome} ${["quartas", "oitavas"].includes(t.fase) ? "nas" : "na"} ${NOME_FASE_TORNEIO[t.fase]?.toLowerCase() ?? t.fase}.`);
    }
    criarMataMata(estado, t, vencedores);
  }
  // Quando o último estadual acaba, uma mensagem com todos os campeões.
  const estaduais = Object.values(estado.torneios ?? {}).filter((t): t is EstadoTorneio => t?.tipo === "estadual");
  if (acabouUmEstadual && estaduais.every((t) => t.fase === "encerrada")) {
    noticias.push(`Campeões estaduais de ${estado.temporada}: ${estaduais.map((t) => `${nome(t.campeao!)} (${t.id.slice(2)})`).join(", ")}.`);
  }
  return noticias;
}

export function torneiosEncerrados(estado: EstadoJogo): boolean {
  return Object.values(estado.torneios ?? {}).every((t) => !t || t.fase === "encerrada");
}

/** Competições que o usuário acompanha: os dias só com jogos de outras passam sem parar (Série D dos outros, os outros estaduais e as ligas de fora). */
export function competicoesDoUsuario(estado: EstadoJogo): Set<Competicao> {
  const meu = estado.tecnico.clubeId;
  const lista = new Set<Competicao>(["A", "B", "C", "CB"]);
  for (const t of torneiosDoClube(estado, meu)) lista.add(t.id);
  return lista;
}
