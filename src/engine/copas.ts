// Copas de clubes da América (nov/2026), pedido "traga tudo que tem da América": as continentais da Conmebol
// (Libertadores, Sul-Americana, Recopa) e da Concacaf (Copa dos Campeões, Leagues Cup, Copa Centro-Americana, Copa do
// Caribe), as do Brasil fora a Copa do Brasil (Supercopa, Copa do Nordeste, Copa Verde, Copa Sul-Sudeste) e as copas
// nacionais dos outros países (Copa Argentina, Copa Chile...). A Copa do Brasil continua em copa.ts.
//
// Cada copa é uma lista de fases (`DEFINICOES`), com os regulamentos de 2026: grupos (turno único ou turno e returno),
// grupos cruzados (os de um grupo jogam contra os do outro, como na Copa do Nordeste e na Leagues Cup) ou mata-mata (jogo
// único ou ida e volta, com pênaltis no empate; a volta na casa da melhor campanha; final em campo neutro nas da Conmebol).
// Os clubes passam de uma copa a outra como de verdade: os 4 eliminados na 3ª fase da Libertadores vão para os grupos da
// Sul-Americana e os terceiros dos grupos, para a repescagem dela.
//
// Quem joga: em 2026, as listas de verdade (data/copas-2026/participantes.json, montado por tools/copas/montar.ts) onde a
// Wikipédia tem; nas outras, os clubes da liga do país pela reputação. Da temporada seguinte em diante, pelas tabelas e
// pelos campeões do próprio jogo (`vagasDasCopas`, na virada).
//
// Datas: as semanas da temporada contam do primeiro sábado de abril (0) para trás (janeiro a março) e para a frente.
// Os dias foram escolhidos para não bater com as séries (sábado e as quartas das semanas 5, 10, 15, 20 e 25), a Copa do
// Brasil (quartas), as ligas de fora e a Série D (domingo) e as datas FIFA; se ainda assim um clube já tem jogo um dia
// antes ou depois, o jogo vai para outro dia da mesma semana (`escolherData`).
import participantesJson from "../../data/copas-2026/participantes.json";
import europaCopasJson from "../../data/europa-2026/copas.json";
import { comArtigo, concorda } from "./artigos";
import { inicioDaTemporada, somarDias, turnoEReturno, turnoUnico, type Confronto } from "./calendario";
import { chavesDaFase, classificacao, tabelaDaLiga, vencedorDaChave, type LinhaTabela } from "./competicoes";
import { lancar } from "./financas";
import { enviarMensagem } from "./mensagens";
import { hashTexto, rngPara, type Rng } from "./rng";
import { MAXIMO_UMA_RODADA_POR_SEMANA, PAISES, divisaoDaLiga, tabelaDoTorneio } from "./torneios";
import type { EstadoCopaClubes, EstadoJogo, IdCopa, Partida } from "./tipos";

/** Quem joga cada copa em 2026, das páginas de verdade (copa → fase → clubes). */
const PARTICIPANTES_2026 = participantesJson.copas as Record<string, Record<string, string[]>>;

export type Dia = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
const DESLOCAMENTO: Record<Dia, number> = { sab: 0, dom: 1, seg: 2, ter: 3, qua: 4, qui: 5, sex: 6 };
/** Outros dias da mesma semana para um jogo que bate com outro (na ordem de preferência). */
const OUTROS_DIAS: Record<Dia, Dia[]> = { ter: ["qua", "qui"], qua: ["ter", "qui"], qui: ["qua", "ter"], sab: ["dom", "sex"], dom: ["sab", "seg"], seg: ["ter"], sex: ["qui"] };

/** O dia `dia` da semana `semana` da temporada (0: a semana do primeiro sábado de abril; negativas: janeiro a março). */
export function diaDaSemana(ano: number, semana: number, dia: Dia): string {
  return somarDias(inicioDaTemporada(ano), semana * 7 + DESLOCAMENTO[dia]);
}

// ---- definições ------------------------------------------------------------------------------------------

/** Como os confrontos de uma fase do mata-mata são montados. */
type Pares =
  /** Melhores contra piores pelo ranking (sorteio dentro de cada metade). */
  | "potes"
  /** Sorteio, evitando clubes do mesmo país quando dá. */
  | "sorteio"
  /** O chaveamento da fase anterior: vencedor do confronto 1 x vencedor do 2, 3 x 4... */
  | "chave"
  /** Clubes do mesmo país entre si (1ª fase da Sul-Americana). */
  | "mesmo-pais"
  /** Os que vêm da fase anterior contra os que entram nesta, por sorteio (repescagem e oitavas da Sul-Americana). */
  | "vindos-x-entram"
  /** Primeiros contra segundos de outros grupos, por sorteio (oitavas da Libertadores). */
  | "primeiros-x-segundos"
  /** Cruzamento fixo dos grupos da fase anterior: [[grupo, posição], [grupo, posição]] por confronto (grupo 1 = A). */
  | { cruzamentos: [[number, number], [number, number]][] };

export interface FaseCopa {
  id: string;
  nome: string;
  tipo: "mata" | "grupos" | "cruzado";
  /** Mata-mata: a semana do jogo único ou as da ida e da volta. Grupos: a semana de cada rodada. */
  semanas: number[];
  dia: Dia;
  /** Final em campo neutro (sem mando nem bilheteria). */
  neutro?: boolean;
  /** Jogo único na casa do pior colocado no ranking (copas nacionais, como a Copa do Brasil); senão, na da melhor campanha. */
  casaDoPior?: boolean;
  /**
   * Grupos: quantos e quantos passam de cada um (`turnos`: 1 ou 2). Cruzado: os grupos se enfrentam aos pares (1 x 2,
   * 3 x 4), `rodadas` jogos por clube; `fixos`: os grupos são as listas de `entram` com estes nomes (Leagues Cup).
   */
  grupos?: { quantos: number; passam: number; turnos?: 1 | 2; rodadas?: number; fixos?: string[]; evitarMesmoEstado?: boolean };
  pares?: Pares;
  /** A fase só começa quando esta fase de outra copa acaba (os transferidos chegam de lá). */
  depois?: { copa: IdCopa; fase: string };
  /** O que a regra da tela diz a mais (quem vai para outra copa...). */
  nota?: string;
}

/** Resultado de uma fase: quem passou (grupos: os 1ºs, depois os 2ºs...; mata-mata: na ordem dos confrontos). */
interface ResultadoFase {
  passaram: string[];
  eliminados: string[];
  /** Grupos: a tabela final de cada um. */
  tabelas?: LinhaTabela[][];
}

/** Quem entra em cada fase de cada copa na temporada seguinte (montado na virada por `vagasDasCopas`). */
export type VagasDasCopas = Partial<Record<IdCopa, Record<string, string[]>>>;

export interface DefinicaoCopa {
  id: IdCopa;
  nome: string;
  /** Onde a copa aparece nas telas. */
  grupo: "brasil" | "conmebol" | "concacaf" | "uefa" | "nacional";
  /** País da copa nacional. */
  pais?: string;
  fases: FaseCopa[];
  /** Quem entra em cada fase nesta temporada; undefined ou vazio: a copa não se joga. */
  participantes(estado: EstadoJogo, vagas?: VagasDasCopas): Record<string, string[]> | undefined;
  /** Depois de cada fase: quem segue (padrão: quem passou) e quem vai para outra copa. */
  aoTerminar?(estado: EstadoJogo, copa: EstadoCopaClubes, fase: FaseCopa, r: ResultadoFase): string[] | void;
  /** Prêmio por fase (pago a quem entra nela) e do campeão e do vice, em R$ (a economia do jogo é menor que a de verdade). */
  premios?: Record<string, number>;
}

const MILHAO = 1_000_000;

// ---- ajudas para quem joga ---------------------------------------------------------------------------------

/** País do clube ("BR" para os brasileiros). */
const paisDoClube = (estado: EstadoJogo, id: string) => estado.clubes[id]?.pais ?? "BR";

/** Clubes de uma liga do jogo nesta temporada ("AR", "AR2", "MX"), pela tabela (com jogos) ou pela reputação. */
function ordemDaLiga(estado: EstadoJogo, liga: string, pelaTabela: boolean): string[] {
  const t = estado.torneios?.[`L-${liga}`];
  if (pelaTabela && t) return tabelaDoTorneio(estado, t).map((l) => l.clubeId);
  const ids = t ? t.clubes : Object.values(estado.clubes).filter((c) => c.serie === "exterior" && c.liga === liga).map((c) => c.id);
  return [...ids].sort((a, b) => estado.clubes[b].reputacao - estado.clubes[a].reputacao || a.localeCompare(b));
}

/** Série A pela tabela (com jogos) ou pela reputação. */
function ordemDaSerieA(estado: EstadoJogo, pelaTabela: boolean): string[] {
  if (pelaTabela && estado.series.A) return tabelaDaLiga(estado, "A").map((l) => l.clubeId);
  return Object.values(estado.clubes).filter((c) => c.serie === "A").sort((a, b) => b.reputacao - a.reputacao || a.id.localeCompare(b.id)).map((c) => c.id);
}

/** Sem repetir, na ordem. */
const unicos = (lista: (string | undefined)[]) => [...new Set(lista.filter((x): x is string => !!x))];

/** Os 2026 de verdade, só os clubes que existem no jogo. */
function de2026(estado: EstadoJogo, id: IdCopa): Record<string, string[]> | undefined {
  const lista = PARTICIPANTES_2026[id];
  if (!lista || estado.temporada !== 2026) return undefined;
  return Object.fromEntries(Object.entries(lista).map(([fase, ids]) => [fase, ids.filter((c) => estado.clubes[c])]));
}

// ---- as copas ------------------------------------------------------------------------------------------

/** Distribuição das vagas da Libertadores por país (2026): [fase de grupos, 2ª fase, 1ª fase]. */
const VAGAS_LIBERTADORES: Record<string, [number, number, number]> = {
  BR: [5, 2, 0], AR: [5, 1, 0], CL: [2, 2, 0], CO: [2, 2, 0], BO: [2, 1, 1], EC: [2, 1, 1], PY: [2, 1, 1], PE: [2, 1, 1], UY: [2, 1, 1], VE: [2, 1, 1],
};
const PAISES_CONMEBOL = Object.keys(VAGAS_LIBERTADORES);
/** Copa nacional de cada país cujo campeão ganha vaga na Libertadores (no lugar do último da tabela). */
const COPA_DO_PAIS: Record<string, IdCopa> = { AR: "K-AR", CL: "K-CL", EC: "K-EC", PY: "K-PY", UY: "K-UY", VE: "K-VE" };
/** Estados de cada copa regional do Brasil. */
const NORDESTE = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"];
const VERDE_NORTE = ["AC", "AP", "AM", "PA", "RO", "RR"];
const VERDE_CENTRO = ["DF", "ES", "GO", "MS", "MT", "TO"];
const SUL_SUDESTE = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
/** Clubes canadenses da MLS (jogam o Campeonato Canadense, não a U.S. Open Cup). */
const CANADENSES_DA_MLS = ["toronto", "vancouver-whitecaps", "cf-montreal"];

const libertadores: DefinicaoCopa = {
  id: "K-LIB", nome: "Libertadores", grupo: "conmebol",
  fases: [
    { id: "fase1", nome: "1ª fase", tipo: "mata", semanas: [-9, -8], dia: "qua", pares: "sorteio" },
    { id: "fase2", nome: "2ª fase", tipo: "mata", semanas: [-7, -6], dia: "qua", pares: "sorteio" },
    { id: "fase3", nome: "3ª fase", tipo: "mata", semanas: [-5, -4], dia: "qua", pares: "chave", nota: "Os 4 eliminados vão para a fase de grupos da Sul-Americana." },
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [0, 1, 2, 3, 7, 8], dia: "ter", grupos: { quantos: 8, passam: 2, turnos: 2 }, nota: "O 3º de cada grupo vai para a repescagem da Sul-Americana." },
    { id: "oitavas", nome: "Oitavas de final", tipo: "mata", semanas: [16, 17], dia: "ter", pares: "primeiros-x-segundos" },
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [23, 24], dia: "ter", pares: "chave" },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [30, 33], dia: "ter", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [35], dia: "sab", neutro: true, pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-LIB"] ?? de2026(estado, "K-LIB") ?? vagasDaConmebol(estado, false)["K-LIB"],
  aoTerminar(estado, _copa, fase, r) {
    const sul = estado.copas?.["K-SUL"];
    // Os eliminados da 3ª fase vão para os grupos da Sul-Americana; os terceiros dos grupos, para a repescagem dela.
    if (fase.id === "fase3" && sul) transferir(sul, "grupos", r.eliminados);
    if (fase.id === "grupos" && sul) transferir(sul, "repescagem", (r.tabelas ?? []).map((t) => t[2]?.clubeId).filter(Boolean) as string[]);
  },
  premios: { fase1: 1.6 * MILHAO, fase2: 2.2 * MILHAO, fase3: 3 * MILHAO, grupos: 8.3 * MILHAO, oitavas: 3.4 * MILHAO, quartas: 4.7 * MILHAO, semi: 6.3 * MILHAO, campeao: 66 * MILHAO, vice: 19 * MILHAO },
};

const sulAmericana: DefinicaoCopa = {
  id: "K-SUL", nome: "Sul-Americana", grupo: "conmebol",
  fases: [
    { id: "fase1", nome: "1ª fase", tipo: "mata", semanas: [-5], dia: "qui", pares: "mesmo-pais" },
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [0, 1, 2, 3, 7, 9], dia: "qui", grupos: { quantos: 8, passam: 2, turnos: 2 }, depois: { copa: "K-LIB", fase: "fase3" }, nota: "O 1º vai direto às oitavas; o 2º joga a repescagem contra um 3º da Libertadores. Entram também os 4 eliminados da 3ª fase da Libertadores." },
    { id: "repescagem", nome: "Repescagem", tipo: "mata", semanas: [11, 12], dia: "qui", pares: "vindos-x-entram", depois: { copa: "K-LIB", fase: "grupos" }, nota: "Os segundos dos grupos contra os terceiros dos grupos da Libertadores." },
    { id: "oitavas", nome: "Oitavas de final", tipo: "mata", semanas: [16, 17], dia: "qui", pares: "vindos-x-entram", nota: "Os primeiros dos grupos contra os vencedores da repescagem." },
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [23, 24], dia: "qui", pares: "chave" },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [30, 33], dia: "qui", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [35], dia: "qua", neutro: true, pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-SUL"] ?? de2026(estado, "K-SUL") ?? vagasDaConmebol(estado, false)["K-SUL"],
  aoTerminar(_estado, copa, fase, r) {
    // Os primeiros dos grupos vão direto às oitavas; os segundos jogam a repescagem com os terceiros da Libertadores.
    if (fase.id === "grupos") {
      const tabelas = r.tabelas ?? [];
      transferir(copa, "oitavas", tabelas.map((t) => t[0]?.clubeId).filter(Boolean) as string[]);
      return tabelas.map((t) => t[1]?.clubeId).filter(Boolean) as string[];
    }
  },
  premios: { fase1: 0.7 * MILHAO, grupos: 3 * MILHAO, repescagem: 1.6 * MILHAO, oitavas: 1.6 * MILHAO, quartas: 2 * MILHAO, semi: 2.2 * MILHAO, campeao: 18 * MILHAO, vice: 7 * MILHAO },
};

const recopa: DefinicaoCopa = {
  id: "K-REC", nome: "Recopa Sul-Americana", grupo: "conmebol",
  // O campeão da Libertadores (o primeiro da lista) decide em casa.
  fases: [{ id: "final", nome: "Final", tipo: "mata", semanas: [-7, -6], dia: "qui", pares: "chave" }],
  participantes: (estado, vagas) => vagas?.["K-REC"] ?? de2026(estado, "K-REC"),
  premios: { campeao: 7 * MILHAO, vice: 2.7 * MILHAO },
};

const supercopa: DefinicaoCopa = {
  id: "K-SUP", nome: "Supercopa do Brasil", grupo: "brasil",
  fases: [{ id: "final", nome: "Final", tipo: "mata", semanas: [-10], dia: "qua", neutro: true, pares: "chave" }],
  participantes: (estado, vagas) => vagas?.["K-SUP"] ?? de2026(estado, "K-SUP"),
  premios: { campeao: 5 * MILHAO, vice: 2.5 * MILHAO },
};

const nordeste: DefinicaoCopa = {
  id: "K-NE", nome: "Copa do Nordeste", grupo: "brasil",
  fases: [
    // 4 grupos de 5: os do grupo A jogam contra os do B, e os do C contra os do D, em turno único.
    { id: "grupos", nome: "Fase de grupos", tipo: "cruzado", semanas: [-12, -11, -10, -9, -8], dia: "qua", grupos: { quantos: 4, passam: 2, rodadas: 5, evitarMesmoEstado: true } },
    // 1º A x 2º C, 1º D x 2º B, 1º B x 2º D, 1º C x 2º A, em jogo único na casa do primeiro.
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [-5], dia: "qua", pares: { cruzamentos: [[[1, 1], [3, 2]], [[4, 1], [2, 2]], [[2, 1], [4, 2]], [[3, 1], [1, 2]]] } },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [-3, -2], dia: "qua", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [-1, 7], dia: "qua", pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-NE"] ?? de2026(estado, "K-NE") ?? { grupos: regionais(estado, NORDESTE, 20, []) },
  premios: { grupos: 0.6 * MILHAO, quartas: 0.3 * MILHAO, semi: 0.5 * MILHAO, campeao: 2 * MILHAO, vice: 0.8 * MILHAO },
};

const copaVerde: DefinicaoCopa = {
  id: "K-VER", nome: "Copa Verde", grupo: "brasil",
  fases: [
    // Copa Norte (grupos 1 e 2) e Copa Centro-Oeste (grupos 3 e 4): 4 grupos de 6 em turno único.
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [-12, -11, -10, -9, -8], dia: "qua", grupos: { quantos: 4, passam: 2, turnos: 1, fixos: ["norte-1", "norte-2", "centro-1", "centro-2"] } },
    // Semifinais de cada bloco em jogo único: 1º de um grupo x 2º do outro.
    { id: "semi-blocos", nome: "Semifinais da Copa Norte e da Copa Centro-Oeste", tipo: "mata", semanas: [-5], dia: "qua", pares: { cruzamentos: [[[1, 1], [2, 2]], [[2, 1], [1, 2]], [[3, 1], [4, 2]], [[4, 1], [3, 2]]] } },
    { id: "final-blocos", nome: "Finais da Copa Norte e da Copa Centro-Oeste", tipo: "mata", semanas: [-3, -2], dia: "qua", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [-1, 7], dia: "qua", pares: "chave" },
  ],
  participantes(estado, vagas) {
    const lista = vagas?.["K-VER"] ?? de2026(estado, "K-VER") ?? { norte: regionais(estado, VERDE_NORTE, 12, []), centro: regionais(estado, VERDE_CENTRO, 12, []) };
    // Dois grupos por bloco, equilibrados pela reputação.
    const metades = (ids: string[]) => {
      const ordem = [...(ids ?? [])].sort((a, b) => estado.clubes[b].reputacao - estado.clubes[a].reputacao || a.localeCompare(b));
      return [ordem.filter((_, i) => [0, 3].includes(i % 4)), ordem.filter((_, i) => [1, 2].includes(i % 4))];
    };
    const [n1, n2] = metades(lista.norte ?? []);
    const [c1, c2] = metades(lista.centro ?? []);
    return n1.length + c1.length >= 8 ? { "norte-1": n1, "norte-2": n2, "centro-1": c1, "centro-2": c2 } : undefined;
  },
  premios: { grupos: 0.3 * MILHAO, "semi-blocos": 0.2 * MILHAO, "final-blocos": 0.3 * MILHAO, campeao: 1.2 * MILHAO, vice: 0.5 * MILHAO },
};

const sulSudeste: DefinicaoCopa = {
  id: "K-SSE", nome: "Copa Sul-Sudeste", grupo: "brasil",
  fases: [
    // 2 grupos de 6: cada clube joga contra os 6 do outro grupo.
    { id: "grupos", nome: "Fase de grupos", tipo: "cruzado", semanas: [-9, -8, -7, -6, -5, -4], dia: "qua", grupos: { quantos: 2, passam: 2, rodadas: 6 } },
    // Semifinais em ida e volta: 1º x 2º do mesmo grupo.
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [-3, -2], dia: "qua", pares: { cruzamentos: [[[1, 1], [1, 2]], [[2, 1], [2, 2]]] } },
    { id: "final", nome: "Final", tipo: "mata", semanas: [7, 8], dia: "qua", pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-SSE"] ?? de2026(estado, "K-SSE") ?? { grupos: sulSudesteDaReputacao(estado, []) },
  premios: { grupos: 0.4 * MILHAO, semi: 0.3 * MILHAO, campeao: 1.5 * MILHAO, vice: 0.6 * MILHAO },
};

const campeoesConcacaf: DefinicaoCopa = {
  id: "K-CONC", nome: "Copa dos Campeões da Concacaf", grupo: "concacaf",
  fases: [
    { id: "fase1", nome: "1ª fase", tipo: "mata", semanas: [-8, -7], dia: "ter", pares: "potes" },
    { id: "oitavas", nome: "Oitavas de final", tipo: "mata", semanas: [-4, -3], dia: "ter", pares: "potes" },
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [0, 1], dia: "ter", pares: "chave" },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [3, 4], dia: "ter", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [8], dia: "sab", pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-CONC"] ?? de2026(estado, "K-CONC"),
  premios: { fase1: 0.5 * MILHAO, oitavas: 0.8 * MILHAO, quartas: 1.2 * MILHAO, semi: 1.6 * MILHAO, campeao: 13 * MILHAO, vice: 4 * MILHAO },
};

const leaguesCup: DefinicaoCopa = {
  id: "K-LEAG", nome: "Leagues Cup", grupo: "concacaf",
  fases: [
    // Fase de liga: cada clube da MLS joga 3 vezes contra clubes da Liga MX; a tabela é separada por liga.
    { id: "liga", nome: "Fase de liga", tipo: "cruzado", semanas: [17, 18, 19], dia: "qua", grupos: { quantos: 2, passam: 4, rodadas: 3, fixos: ["mls", "mx"] }, nota: "Cada clube da MLS joga 3 vezes contra clubes da Liga MX; a tabela é separada por liga." },
    // 1º da MLS x 4º da Liga MX, 2º x 3º, 3º x 2º, 4º x 1º.
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [20], dia: "qua", pares: { cruzamentos: [[[1, 1], [2, 4]], [[1, 2], [2, 3]], [[2, 2], [1, 3]], [[2, 1], [1, 4]]] } },
    // Semifinal e final depois da data FIFA de setembro (semanas 21 e 22).
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [23], dia: "qua", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [24], dia: "sab", pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-LEAG"] ?? de2026(estado, "K-LEAG") ?? { mls: ordemDaLiga(estado, "US", false).slice(0, 18), mx: ordemDaLiga(estado, "MX", false).slice(0, 18) },
  premios: { liga: 0.3 * MILHAO, quartas: 0.4 * MILHAO, semi: 0.6 * MILHAO, campeao: 5.5 * MILHAO, vice: 2 * MILHAO },
};

/** Vagas da Copa Centro-Americana por país (20 clubes, como em 2025). */
const VAGAS_CENTRO_AMERICANA: Record<string, number> = { CR: 4, HN: 4, PA: 4, GT: 3, SV: 3, NI: 1, BZ: 1 };
const centroAmericana: DefinicaoCopa = {
  id: "K-CAM", nome: "Copa Centro-Americana", grupo: "concacaf",
  fases: [
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [17, 18, 19, 20, 21], dia: "ter", grupos: { quantos: 4, passam: 2, turnos: 1 } },
    { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [23, 24], dia: "ter", pares: "primeiros-x-segundos" },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [28, 29], dia: "ter", pares: "chave" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [30, 33], dia: "ter", pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-CAM"] ?? { grupos: porPais(estado, VAGAS_CENTRO_AMERICANA, false) },
  premios: { grupos: 0.2 * MILHAO, quartas: 0.15 * MILHAO, semi: 0.2 * MILHAO, campeao: 1.5 * MILHAO, vice: 0.6 * MILHAO },
};

/** Vagas da Copa do Caribe por país (10 clubes). */
const VAGAS_CARIBE: Record<string, number> = { JM: 2, DO: 2, TT: 1, HT: 1, SR: 1, CW: 1, PR: 1, GY: 1 };
const caribe: DefinicaoCopa = {
  id: "K-CAR", nome: "Copa do Caribe", grupo: "concacaf",
  fases: [
    { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [18, 19, 20, 21, 23], dia: "qua", grupos: { quantos: 2, passam: 2, turnos: 1 } },
    { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [26], dia: "qua", pares: "primeiros-x-segundos" },
    { id: "final", nome: "Final", tipo: "mata", semanas: [29], dia: "qua", neutro: true, pares: "chave" },
  ],
  participantes: (estado, vagas) => vagas?.["K-CAR"] ?? { grupos: porPais(estado, VAGAS_CARIBE, false) },
  premios: { grupos: 0.1 * MILHAO, semi: 0.1 * MILHAO, campeao: 0.8 * MILHAO, vice: 0.3 * MILHAO },
};

/** Semanas (quartas-feiras) das rodadas das copas nacionais, da final para trás: livres das copas continentais. */
const SEMANAS_NACIONAIS = [4, 6, 10, 14, 19, 28];
/** Semanas da U.S. Open Cup e do Campeonato Canadense (fora das da Concacaf e da Leagues Cup). */
const SEMANAS_EUA = [5, 6, 10, 13, 25];

/** Copa nacional de um país: mata-mata em jogo único (até 64 clubes, os das divisões do país no jogo). */
function copaNacional(
  id: IdCopa, nome: string, pais: string,
  opcoes: { maximo?: number; semanas?: number[]; neutra?: boolean; sem?: string[]; premios?: Record<string, number>; soQuemFolgaNaQuarta?: boolean } = {},
): DefinicaoCopa {
  const maximo = opcoes.maximo ?? 64;
  const semanas = opcoes.semanas ?? SEMANAS_NACIONAIS;
  const NOMES: Record<number, string> = { 2: "Final", 4: "Semifinal", 8: "Quartas de final", 16: "Oitavas de final", 32: "16 avos de final", 64: "32 avos de final" };
  const IDS: Record<number, string> = { 2: "final", 4: "semi", 8: "quartas", 16: "oitavas", 32: "dezesseis", 64: "trinta-e-dois" };
  const fases: FaseCopa[] = [];
  for (let n = maximo, i = Math.log2(maximo) - 1; n >= 2; n /= 2, i--) {
    fases.push({
      id: IDS[n], nome: NOMES[n], tipo: "mata", semanas: [semanas[semanas.length - 1 - i] ?? semanas[0]], dia: "qua",
      pares: n === maximo ? "potes" : "chave", casaDoPior: n !== 2 && !opcoes.neutra, neutro: n === 2 || opcoes.neutra,
    });
  }
  return {
    id, nome, grupo: "nacional", pais, fases,
    participantes(estado) {
      // Os clubes das divisões do país no jogo, da 1ª para baixo, pela reputação; o tamanho é a maior potência de 2 que cabe.
      // Na Europa, a divisão que joga também às quartas (mais de 30 clubes) fica de fora: a copa é às quartas.
      const ligas = [1, 2, 3].map((n) => (n === 1 ? pais : `${pais}${n}`))
        .filter((l) => !opcoes.soQuemFolgaNaQuarta || (estado.torneios?.[`L-${l}`]?.clubes.length ?? 0) <= MAXIMO_UMA_RODADA_POR_SEMANA);
      const ids = ligas.flatMap((l) => ordemDaLiga(estado, l, false)).filter((c) => !opcoes.sem?.includes(c));
      if (ids.length < 8) return undefined;
      const tamanho = Math.min(maximo, 2 ** Math.floor(Math.log2(ids.length)));
      // Copa menor que o máximo: começa numa fase mais adiante.
      return { [IDS[tamanho]]: ids.slice(0, tamanho) };
    },
    premios: opcoes.premios ?? { campeao: 1.5 * MILHAO, vice: 0.6 * MILHAO },
  };
}

// ---- copas nacionais e supercopas da Europa (nov/2026) ----------------------------------------------------
// As ligas da Europa vão de janeiro a setembro; as copas nacionais, às quartas-feiras das semanas sem as copas da UEFA
// (que jogam às terças e quintas das semanas -10 a 8) e fora das datas FIFA de março. Até 64 clubes das 3 divisões do
// país, final em campo neutro. A supercopa junta o campeão da liga e o da copa no começo do ano seguinte.

/** Semanas das rodadas das copas nacionais da Europa (a última é a da final). */
const SEMANAS_EUROPA = [-8, -4, 0, 7, 12, 16];
const PREMIOS_COPA_EUROPA = { campeao: 4 * MILHAO, vice: 1.5 * MILHAO };

const copaDaEuropa = (id: IdCopa, nome: string, pais: string) => copaNacional(id, nome, pais, { semanas: SEMANAS_EUROPA, premios: PREMIOS_COPA_EUROPA, soQuemFolgaNaQuarta: true });

/** Supercopa de um país da Europa: o campeão da liga contra o da copa (ou o vice da liga), em jogo único. */
function supercopaDaEuropa(id: IdCopa, nome: string, pais: string, neutro: boolean): DefinicaoCopa {
  return {
    id, nome, grupo: "nacional", pais,
    fases: [{ id: "final", nome: "Final", tipo: "mata", semanas: [-12], dia: "qua", neutro, pares: "chave" }],
    // Sem os campeões de 2025/26 da copa no jogo, a primeira supercopa é a de 2027.
    participantes: (_estado, vagas) => vagas?.[id],
    premios: { campeao: 1 * MILHAO, vice: 0.5 * MILHAO },
  };
}

/** Copa e supercopa de cada uma das 7 ligas da Europa. */
const COPAS_DA_EUROPA: { liga: string; copa: [IdCopa, string]; supercopa: [IdCopa, string, boolean] }[] = [
  { liga: "EN", copa: ["K-EN", "FA Cup"], supercopa: ["K-SEN", "Supercopa da Inglaterra", true] },
  { liga: "ES", copa: ["K-ES", "Copa do Rei"], supercopa: ["K-SES", "Supercopa da Espanha", true] },
  { liga: "IT", copa: ["K-IT", "Copa da Itália"], supercopa: ["K-SIT", "Supercopa da Itália", true] },
  { liga: "DE", copa: ["K-DE", "Copa da Alemanha"], supercopa: ["K-SDE", "Supercopa da Alemanha", false] },
  { liga: "FR", copa: ["K-FR", "Copa da França"], supercopa: ["K-SFR", "Supercopa da França", true] },
  { liga: "PT", copa: ["K-PT", "Taça de Portugal"], supercopa: ["K-SPT", "Supertaça de Portugal", true] },
  { liga: "NL", copa: ["K-NL", "Copa da Holanda"], supercopa: ["K-SNL", "Supercopa da Holanda", false] },
];

/** Supercopas da Europa na virada: o campeão da liga e o da copa (se é o mesmo, o vice da liga). */
function vagasDasSupercopasDaEuropa(estado: EstadoJogo): VagasDasCopas {
  const vagas: VagasDasCopas = {};
  for (const { liga, copa, supercopa } of COPAS_DA_EUROPA) {
    const tabela = ordemDaLiga(estado, liga, true);
    const daCopa = estado.copas?.[copa[0]]?.campeao;
    if (!tabela.length || !daCopa) continue;
    const outro = daCopa === tabela[0] ? tabela[1] : daCopa;
    if (outro) vagas[supercopa[0]] = { final: [tabela[0], outro] };
  }
  return vagas;
}

// ---- Europa (nov/2026): Champions League, Liga Europa, Conference League e Supercopa da UEFA ----------------
// Só com os clubes das 7 ligas do jogo, no formato clássico (grupos de 4 em turno e returno e mata-mata em ida e volta,
// final em campo neutro). As ligas da Europa vão de janeiro a setembro aos domingos; as copas, às terças e quintas de
// janeiro a maio, fora das datas FIFA de março.

/**
 * Vagas de cada liga da Europa nas copas da UEFA (posições na tabela, contando de 1; desde nov/2026 com os 16 países
 * novos, menos a Rússia, suspensa pela UEFA). Liga dos Campeões: 26 direto nos grupos e 6 que saem do playoff, ida e
 * volta entre os campeões de 12 países. O campeão da copa nacional (FA Cup, Copa do Rei...) fica com a vaga da Liga
 * Europa do país se ainda não tem vaga melhor.
 */
export const VAGAS_UEFA: Record<string, { ucl?: [number, number]; playoff?: [number, number]; uel?: [number, number]; uecl?: [number, number] }> = {
  EN: { ucl: [1, 4], uel: [5, 5], uecl: [6, 6] }, ES: { ucl: [1, 4], uel: [5, 5], uecl: [6, 6] },
  IT: { ucl: [1, 4], uel: [5, 5], uecl: [6, 6] }, DE: { ucl: [1, 4], uel: [5, 5], uecl: [6, 6] },
  FR: { ucl: [1, 3], uel: [4, 4], uecl: [5, 5] }, PT: { ucl: [1, 2], uel: [3, 3], uecl: [4, 4] },
  NL: { ucl: [1, 2], uel: [3, 3], uecl: [4, 4] },
  BE: { ucl: [1, 1], uel: [2, 2], uecl: [3, 3] }, TR: { ucl: [1, 1], uel: [2, 2], uecl: [3, 3] },
  AT: { ucl: [1, 1], uel: [2, 2], uecl: [3, 3] },
  CH: { playoff: [1, 1], uel: [2, 2] }, DK: { playoff: [1, 1], uel: [2, 2] }, GR: { playoff: [1, 1], uel: [2, 2] },
  HR: { playoff: [1, 1], uel: [2, 2] }, NO: { playoff: [1, 1], uel: [2, 2] }, PL: { playoff: [1, 1], uel: [2, 2] },
  RO: { playoff: [1, 1], uecl: [2, 2] }, XS: { playoff: [1, 1], uecl: [2, 2] }, SE: { playoff: [1, 1], uecl: [2, 2] },
  RS: { playoff: [1, 1], uecl: [2, 2] }, CZ: { playoff: [1, 1], uecl: [2, 2] }, UA: { playoff: [1, 1], uecl: [2, 2] },
};
/** Tabela de 2025/26 de cada liga da Europa do jogo (tools/europa/tabelas.ts): as vagas das copas da UEFA de 2026. */
const TABELAS_2025 = europaCopasJson.tabelas as Record<string, string[]>;
/** Copa nacional de cada liga da Europa (o campeão ganha a vaga da Liga Europa). */
const COPA_DA_LIGA_EUROPA: Record<string, IdCopa> = { EN: "K-EN", ES: "K-ES", IT: "K-IT", DE: "K-DE", FR: "K-FR", PT: "K-PT", NL: "K-NL" };

/**
 * Classificados das copas da UEFA: pelas tabelas das ligas do jogo (na virada), pela tabela de 2025/26 (temporada
 * 2026) ou pela reputação (save que ganhou a Europa no meio do caminho).
 */
function vagasDaUefa(estado: EstadoJogo, pelaTabela: boolean): VagasDasCopas {
  const ucl: string[] = [], playoff: string[] = [], uel: string[] = [], uecl: string[] = [];
  const de2025 = !pelaTabela && estado.temporada === 2026;
  for (const [liga, v] of Object.entries(VAGAS_UEFA)) {
    const tabela = de2025 && TABELAS_2025[liga] ? TABELAS_2025[liga].filter((c) => estado.clubes[c]) : ordemDaLiga(estado, liga, pelaTabela);
    if (!tabela.length) continue;
    // O campeão da copa nacional entra no lugar da última vaga da Liga Europa, se não tem vaga melhor.
    const copa = pelaTabela && COPA_DA_LIGA_EUROPA[liga] ? estado.copas?.[COPA_DA_LIGA_EUROPA[liga]]?.campeao : undefined;
    const t = v.uel && copa ? unicos([...tabela.slice(0, v.uel[1] - 1), copa, ...tabela]) : tabela;
    const fatia = (r?: [number, number]) => (r ? t.slice(r[0] - 1, r[1]) : []);
    ucl.push(...fatia(v.ucl));
    playoff.push(...fatia(v.playoff));
    uel.push(...fatia(v.uel));
    uecl.push(...fatia(v.uecl));
  }
  return { "K-UCL": { playoff, grupos: ucl }, "K-UEL": { grupos: uel }, "K-UECL": { grupos: uecl } };
}

/** Os classificados (só com as ligas da Europa no jogo: save de antes da Europa começa as copas quando elas existem). */
function daUefa(estado: EstadoJogo, id: IdCopa, vagas?: VagasDasCopas): Record<string, string[]> | undefined {
  if (vagas?.[id]) return vagas[id];
  if (!estado.torneios?.["L-EN"]) return undefined;
  return vagasDaUefa(estado, false)[id];
}

/** Copa da UEFA com 8 ou 4 grupos de 4 (turno e returno) e mata-mata em ida e volta até a final em campo neutro. */
function copaDaUefa(id: IdCopa, nome: string, grupos: 8 | 4, dia: Dia, premios: Record<string, number>): DefinicaoCopa {
  const mata: FaseCopa[] = grupos === 8
    ? [
      { id: "oitavas", nome: "Oitavas de final", tipo: "mata", semanas: [1, 2], dia, pares: "primeiros-x-segundos" },
      { id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [3, 4], dia, pares: "chave" },
    ]
    : [{ id: "quartas", nome: "Quartas de final", tipo: "mata", semanas: [3, 4], dia, pares: "primeiros-x-segundos" }];
  return {
    id, nome, grupo: "uefa",
    fases: [
      ...(id === "K-UCL"
        ? [{ id: "playoff", nome: "Playoff", tipo: "mata", semanas: [-12, -11], dia, pares: "potes", nota: "Os campeões de 12 países em ida e volta; os 6 vencedores vão à fase de grupos." } satisfies FaseCopa]
        : []),
      { id: "grupos", nome: "Fase de grupos", tipo: "grupos", semanas: [-10, -9, -7, -6, -5, -3], dia, grupos: { quantos: grupos, passam: 2, turnos: 2 } },
      ...mata,
      { id: "semi", nome: "Semifinal", tipo: "mata", semanas: [5, 6], dia, pares: "chave" },
      { id: "final", nome: "Final", tipo: "mata", semanas: [8], dia: id === "K-UCL" ? "sab" : dia, neutro: true, pares: "chave" },
    ],
    participantes: (estado, vagas) => daUefa(estado, id, vagas),
    premios,
  };
}

const championsLeague = copaDaUefa("K-UCL", "Liga dos Campeões", 8, "ter",
  { playoff: 3 * MILHAO, grupos: 30 * MILHAO, oitavas: 15 * MILHAO, quartas: 20 * MILHAO, semi: 25 * MILHAO, campeao: 120 * MILHAO, vice: 50 * MILHAO });
const ligaEuropa = copaDaUefa("K-UEL", "Liga Europa", 4, "qui",
  { grupos: 8 * MILHAO, quartas: 6 * MILHAO, semi: 8 * MILHAO, campeao: 30 * MILHAO, vice: 12 * MILHAO });
const conference = copaDaUefa("K-UECL", "Conference League", 4, "qui",
  { grupos: 4 * MILHAO, quartas: 3 * MILHAO, semi: 4 * MILHAO, campeao: 15 * MILHAO, vice: 6 * MILHAO });
const supercopaUefa: DefinicaoCopa = {
  id: "K-USC", nome: "Supercopa da UEFA", grupo: "uefa",
  // O campeão da Liga dos Campeões contra o da Liga Europa, em campo neutro, no começo do ano (sem lista em 2026: a base
  // não tem as finais de 2025/26).
  fases: [{ id: "final", nome: "Final", tipo: "mata", semanas: [-11], dia: "qua", neutro: true, pares: "chave" }],
  participantes: (_estado, vagas) => vagas?.["K-USC"],
  premios: { campeao: 8 * MILHAO, vice: 4 * MILHAO },
};

export const DEFINICOES: DefinicaoCopa[] = [
  supercopa, recopa, libertadores, sulAmericana, nordeste, copaVerde, sulSudeste,
  campeoesConcacaf, leaguesCup, centroAmericana, caribe,
  copaNacional("K-AR", "Copa Argentina", "AR", { neutra: true }),
  copaNacional("K-CL", "Copa Chile", "CL", { maximo: 32 }),
  copaNacional("K-CO", "Copa Colômbia", "CO", { maximo: 32 }),
  copaNacional("K-EC", "Copa Equador", "EC", { maximo: 32 }),
  copaNacional("K-PY", "Copa Paraguai", "PY", { maximo: 32 }),
  copaNacional("K-UY", "Copa AUF Uruguai", "UY", { maximo: 32 }),
  copaNacional("K-VE", "Copa Venezuela", "VE", { maximo: 16 }),
  copaNacional("K-US", "U.S. Open Cup", "US", { maximo: 32, semanas: SEMANAS_EUA, sem: CANADENSES_DA_MLS }),
  copaNacional("K-CA", "Campeonato Canadense", "CA", { maximo: 8, semanas: SEMANAS_EUA }),
  supercopaUefa, championsLeague, ligaEuropa, conference,
  ...COPAS_DA_EUROPA.flatMap(({ liga, copa, supercopa }) => [supercopaDaEuropa(supercopa[0], supercopa[1], liga, supercopa[2]), copaDaEuropa(copa[0], copa[1], liga)]),
];
const POR_ID = new Map<string, DefinicaoCopa>(DEFINICOES.map((d) => [d.id, d]));
export const definicaoDaCopa = (id: string) => POR_ID.get(id);

/** "Libertadores", "Copa do Nordeste"... */
export function nomeDaCopa(id: string): string {
  return POR_ID.get(id)?.nome ?? id;
}

/** "Fase de grupos", "Oitavas de final"... */
export function nomeDaFaseDaCopa(id: string, fase: string): string {
  return POR_ID.get(id)?.fases.find((f) => f.id === fase)?.nome ?? (fase === "encerrada" ? "Encerrada" : fase);
}

/** A regra da fase, para a tela. */
export function regraDaFaseDaCopa(id: string, faseId: string): string {
  const f = POR_ID.get(id)?.fases.find((x) => x.id === faseId);
  if (!f) return "";
  let regra: string;
  if (f.tipo === "grupos") {
    const g = f.grupos!;
    regra = `${g.quantos} grupos em ${g.turnos === 2 ? "turno e returno" : "turno único"}; ${g.passam === 1 ? "passa o primeiro" : `passam os ${g.passam} primeiros`} de cada.`;
  } else if (f.tipo === "cruzado") {
    const g = f.grupos!;
    regra = g.fixos ? "" : `Os clubes de um grupo jogam contra os do outro${g.quantos > 2 ? " (A x B e C x D)" : ""}, em turno único; passam os ${g.passam} primeiros de cada grupo.`;
  } else if (f.semanas.length === 2) {
    regra = "Ida e volta; a volta é na casa da melhor campanha; empate no agregado vai para os pênaltis.";
  } else {
    regra = `Jogo único ${f.neutro ? "em campo neutro" : f.casaDoPior ? "na casa do time de pior ranking" : "na casa da melhor campanha"}; empate vai para os pênaltis.`;
  }
  return [regra, f.nota].filter(Boolean).join(" ");
}

export function ehCopaDeClubes(c: string): c is IdCopa {
  return c.startsWith("K-");
}

// ---- vagas ---------------------------------------------------------------------------------------------

/** Clubes da Copa Centro-Americana ou do Caribe: os primeiros de cada país (pela tabela ou pela reputação). */
function porPais(estado: EstadoJogo, vagas: Record<string, number>, pelaTabela: boolean, sem: string[] = []): string[] {
  return Object.entries(vagas).flatMap(([pais, n]) => ordemDaLiga(estado, pais, pelaTabela).filter((c) => !sem.includes(c)).slice(0, n));
}

/** Copa regional do Brasil: campeão e vice de cada estadual (`estados`), depois os de mais reputação dos estados. */
function regionais(estado: EstadoJogo, estados: string[], total: number, sem: string[]): string[] {
  const lista: string[] = [];
  for (const uf of estados) {
    const t = estado.torneios?.[`E-${uf}`];
    for (const id of [t?.campeao, t?.vice]) if (id && !sem.includes(id) && !lista.includes(id)) lista.push(id);
  }
  const outros = Object.values(estado.clubes)
    .filter((c) => !c.pais && estados.includes(c.estado) && ["A", "B", "C", "D"].includes(c.serie) && !lista.includes(c.id) && !sem.includes(c.id))
    .sort((a, b) => b.reputacao - a.reputacao || a.id.localeCompare(b.id));
  return [...lista, ...outros.map((c) => c.id)].slice(0, total);
}

/** Copa Sul-Sudeste: os clubes das Séries B e C do Sul e do Sudeste de mais reputação (fora os das copas da Conmebol). */
function sulSudesteDaReputacao(estado: EstadoJogo, sem: string[]): string[] {
  return Object.values(estado.clubes)
    .filter((c) => !c.pais && SUL_SUDESTE.includes(c.estado) && (c.serie === "B" || c.serie === "C") && !sem.includes(c.id))
    .sort((a, b) => b.reputacao - a.reputacao || a.id.localeCompare(b.id)).slice(0, 12).map((c) => c.id);
}

/**
 * Libertadores e Sul-Americana pelas tabelas (`pelaTabela`, na virada) ou pela reputação: os campeões da Libertadores e
 * da Sul-Americana nos grupos; em cada país, o campeão da copa nacional (no Brasil, a Copa do Brasil) e os primeiros da
 * liga, na distribuição de 2026; os seguintes da tabela na Sul-Americana.
 */
function vagasDaConmebol(estado: EstadoJogo, pelaTabela: boolean): VagasDasCopas {
  const lib: Record<string, string[]> = { fase1: [], fase2: [], grupos: [] };
  const sul: Record<string, string[]> = { fase1: [], grupos: [] };
  const campeoes = pelaTabela ? unicos([estado.copas?.["K-LIB"]?.campeao, estado.copas?.["K-SUL"]?.campeao]) : [];
  lib.grupos.push(...campeoes);
  // Sem os campeões continentais do ano (save de antes das copas), as duas vagas nos grupos vão para o Brasil e a Argentina.
  const semCampeao = 2 - campeoes.length;
  for (const pais of PAISES_CONMEBOL) {
    const tabela = pais === "BR" ? ordemDaSerieA(estado, pelaTabela) : ordemDaLiga(estado, pais, pelaTabela);
    const copa = pelaTabela ? (pais === "BR" ? estado.copa?.campeao : estado.copas?.[COPA_DO_PAIS[pais]]?.campeao) : undefined;
    const [base, f2, f1] = VAGAS_LIBERTADORES[pais];
    const g = base + (pais === "BR" ? Math.min(1, semCampeao) : pais === "AR" ? Math.max(0, semCampeao - 1) : 0);
    const total = g + f2 + f1;
    // Brasil e Argentina: o campeão da copa entra antes da tabela; nos outros, no lugar da última vaga.
    const ordem = pais === "BR" || pais === "AR" ? unicos([copa, ...tabela]) : unicos([...tabela.slice(0, total - 1), copa, ...tabela]);
    const doPais = ordem.filter((c) => !campeoes.includes(c)).slice(0, total);
    lib.grupos.push(...doPais.slice(0, g));
    lib.fase2.push(...doPais.slice(g, g + f2));
    lib.fase1.push(...doPais.slice(g + f2));
    const naLib = new Set([...campeoes, ...doPais]);
    const proximos = tabela.filter((c) => !naLib.has(c)).slice(0, pais === "BR" || pais === "AR" ? 6 : 4);
    (pais === "BR" || pais === "AR" ? sul.grupos : sul.fase1).push(...proximos);
  }
  return { "K-LIB": lib, "K-SUL": sul };
}

/**
 * Quem joga cada copa na temporada seguinte, pelas tabelas e pelos campeões da temporada que acaba (chamada no começo
 * da virada, antes do acesso e da queda). As copas nacionais e a Leagues Cup saem das ligas da temporada nova.
 */
export function vagasDasCopas(estado: EstadoJogo): VagasDasCopas {
  const vagas = vagasDaConmebol(estado, true);
  const nasConmebol = [...Object.values(vagas["K-LIB"] ?? {}).flat(), ...Object.values(vagas["K-SUL"] ?? {}).flat()];
  const campeao = (id: IdCopa) => estado.copas?.[id]?.campeao;
  const vice = (id: IdCopa) => estado.copas?.[id]?.vice;
  // Recopa: o campeão da Libertadores (decide em casa) e o da Sul-Americana.
  const recopa = unicos([campeao("K-LIB"), campeao("K-SUL")]);
  if (recopa.length === 2) vagas["K-REC"] = { final: recopa };
  // Supercopa: o campeão da Série A e o da Copa do Brasil (se é o mesmo, o vice da Copa).
  const serieA = estado.series.A?.campeao;
  const copa = estado.copa?.campeao === serieA ? estado.copa?.vice : estado.copa?.campeao;
  if (serieA && copa) vagas["K-SUP"] = { final: [serieA, copa] };
  vagas["K-NE"] = { grupos: regionais(estado, NORDESTE, 20, nasConmebol) };
  vagas["K-VER"] = { norte: regionais(estado, VERDE_NORTE, 12, nasConmebol), centro: regionais(estado, VERDE_CENTRO, 12, nasConmebol) };
  vagas["K-SSE"] = { grupos: sulSudesteDaReputacao(estado, nasConmebol) };
  // Concacaf: os campeões das ligas e das copas da região direto nas oitavas; os outros na 1ª fase.
  const mls = ordemDaLiga(estado, "US", true);
  const mx = ordemDaLiga(estado, "MX", true);
  const canada = ordemDaLiga(estado, "CA", true);
  const oitavas = unicos([mls[0], mx[0], campeao("K-LEAG"), campeao("K-CAM"), campeao("K-CAR")]);
  const cam = estado.copas?.["K-CAM"];
  const semifinalistasCam = cam ? estado.partidas.filter((p) => p.serie === "K-CAM" && p.fase === "semi").flatMap((p) => [p.mandante, p.visitante]) : [];
  const fase1 = unicos([
    canada[0], canada[1], campeao("K-CA"), vice("K-CAR"), vice("K-CAM"), ...semifinalistasCam, vice("K-LEAG"),
    campeao("K-US"), ...mls.slice(1, 5), ...mx.slice(1, 6),
  ]).filter((c) => !oitavas.includes(c));
  // Completa as 22 vagas com os próximos da MLS e da Liga MX.
  for (const c of [...mls, ...mx]) if (fase1.length < 22 && !oitavas.includes(c) && !fase1.includes(c)) fase1.push(c);
  if (oitavas.length + fase1.length >= 8) vagas["K-CONC"] = { oitavas, fase1: fase1.slice(0, 22) };
  vagas["K-CAM"] = { grupos: porPais(estado, VAGAS_CENTRO_AMERICANA, true) };
  vagas["K-CAR"] = { grupos: porPais(estado, VAGAS_CARIBE, true) };
  // Europa: pelas tabelas das 7 ligas; a Supercopa da UEFA entre os campeões da Liga dos Campeões e da Liga Europa.
  if (estado.torneios?.["L-EN"]) Object.assign(vagas, vagasDaUefa(estado, true), vagasDasSupercopasDaEuropa(estado));
  const supercopa = unicos([campeao("K-UCL"), campeao("K-UEL")]);
  if (supercopa.length === 2) vagas["K-USC"] = { final: supercopa };
  return vagas;
}

/** Os transferidos de outra copa entram nesta fase (e passam a jogar a copa). */
function transferir(copa: EstadoCopaClubes, fase: string, ids: string[]) {
  const lista = (copa.entram[fase] ??= []);
  for (const id of ids) {
    if (!lista.includes(id)) lista.push(id);
    if (!copa.clubes.includes(id)) copa.clubes.push(id);
  }
}

// ---- criação --------------------------------------------------------------------------------------------

/** Ranking da copa: reputação (os campeões da Libertadores e da Sul-Americana na frente, nas copas da Conmebol). */
function rankingDosClubes(estado: EstadoJogo, ids: string[]): string[] {
  return [...ids].sort((a, b) => estado.clubes[b].reputacao - estado.clubes[a].reputacao || a.localeCompare(b));
}

/**
 * Monta as copas de clubes da temporada (depois da Copa do Brasil): quem joga e a primeira fase de cada uma.
 * `vagas`: quem classificou na temporada anterior (na virada); sem elas, as listas de 2026 e a reputação.
 */
export function criarCopasDeClubes(estado: EstadoJogo, vagas?: VagasDasCopas) {
  estado.copas = {};
  for (const def of DEFINICOES) {
    const lista = def.participantes(estado, vagas);
    if (!lista) continue;
    const entram: Record<string, string[]> = {};
    for (const [fase, ids] of Object.entries(lista)) entram[fase] = unicos(ids).filter((id) => estado.clubes[id]);
    const clubes = unicos(Object.values(entram).flat());
    if (clubes.length < 2) continue;
    const copa: EstadoCopaClubes = { id: def.id, nome: def.nome, fase: def.fases[0].id, clubes, entram, ranking: rankingDosClubes(estado, clubes) };
    estado.copas[def.id] = copa;
  }
  // As primeiras fases depois de todas as copas criadas (os transferidos de uma vão para a outra).
  for (const def of DEFINICOES) {
    const copa = estado.copas[def.id];
    if (copa) iniciarFase(estado, def, copa, primeiraFase(def, copa), []);
  }
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
}

/** A primeira fase com alguém entrando (a copa nacional menor começa mais adiante). */
function primeiraFase(def: DefinicaoCopa, copa: EstadoCopaClubes): FaseCopa {
  return def.fases.find((f) => (copa.entram[f.id]?.length ?? 0) > 0 || f.grupos?.fixos?.some((g) => copa.entram[g]?.length)) ?? def.fases[0];
}

// ---- datas --------------------------------------------------------------------------------------------

type Ocupacao = Map<string, Set<string>>;

function ocupacaoAtual(estado: EstadoJogo): Ocupacao {
  const mapa: Ocupacao = new Map();
  for (const p of estado.partidas) {
    for (const id of [p.mandante, p.visitante]) {
      let s = mapa.get(id);
      if (!s) mapa.set(id, (s = new Set()));
      s.add(p.data);
    }
  }
  return mapa;
}

/**
 * A data do jogo entre `a` e `b` na semana `semana`: o dia da fase, ou outro dia da semana se um deles já joga um dia
 * antes, no dia ou um dia depois (sem isso, ao menos não no mesmo dia). Nunca antes de amanhã.
 */
function escolherData(estado: EstadoJogo, ocupacao: Ocupacao, a: string, b: string, semana: number, dia: Dia, minimo: string): string {
  const candidatas = [dia, ...OUTROS_DIAS[dia]].map((d) => diaDaSemana(estado.temporada, semana, d)).map((d) => (d < minimo ? minimo : d));
  const livre = (id: string, d: string, folga: number) => {
    const s = ocupacao.get(id);
    if (!s) return true;
    for (let k = -folga; k <= folga; k++) if (s.has(somarDias(d, k))) return false;
    return true;
  };
  const escolhida = candidatas.find((d) => livre(a, d, 1) && livre(b, d, 1)) ?? candidatas.find((d) => livre(a, d, 0) && livre(b, d, 0)) ?? candidatas[0];
  for (const id of [a, b]) {
    let s = ocupacao.get(id);
    if (!s) ocupacao.set(id, (s = new Set()));
    s.add(escolhida);
  }
  return escolhida;
}

// ---- fases --------------------------------------------------------------------------------------------

/** Campanha do clube na copa até agora (pontos, saldo, gols), para o mando da volta e a ordem dos classificados. */
function campanha(estado: EstadoJogo, copaId: IdCopa, clubeId: string): [number, number, number] {
  let pts = 0, sg = 0, gp = 0;
  for (const p of estado.partidas) {
    if (p.serie !== copaId || !p.jogada || (p.mandante !== clubeId && p.visitante !== clubeId)) continue;
    const [pro, contra] = p.mandante === clubeId ? [p.gm, p.gv] : [p.gv, p.gm];
    pts += pro > contra ? 3 : pro === contra ? 1 : 0;
    sg += pro - contra;
    gp += pro;
  }
  return [pts, sg, gp];
}

/** O melhor dos dois (campanha, depois ranking): decide em casa a volta (ou o jogo único). */
function melhorDosDois(estado: EstadoJogo, copa: EstadoCopaClubes, a: string, b: string): [melhor: string, pior: string] {
  const [ca, cb] = [campanha(estado, copa.id, a), campanha(estado, copa.id, b)];
  const dif = cb[0] - ca[0] || cb[1] - ca[1] || cb[2] - ca[2] || estado.clubes[b].reputacao - estado.clubes[a].reputacao || a.localeCompare(b);
  return dif <= 0 ? [a, b] : [b, a];
}

/** Sorteia pares evitando clubes do mesmo país (`separar` dá o país ou o estado); tenta algumas vezes antes de aceitar. */
function sortearPares(rng: Rng, lista: string[], separar: (id: string) => string, contra?: string[]): [string, string][] {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const pares: [string, string][] = [];
    if (contra) {
      const b = rng.embaralhar([...contra]);
      lista.forEach((a, i) => pares.push([a, b[i]]));
    } else {
      const s = rng.embaralhar([...lista]);
      for (let i = 0; i + 1 < s.length; i += 2) pares.push([s[i], s[i + 1]]);
    }
    if (tentativa === 59 || pares.every(([a, b]) => separar(a) !== separar(b))) return pares;
  }
  return [];
}

/** Grupos pelos potes do ranking, evitando dois do mesmo país (ou estado) no mesmo grupo quando dá. */
export function sortearGrupos(rng: Rng, ranking: string[], quantos: number, separar: (id: string) => string): string[][] {
  const potes: string[][] = [];
  for (let i = 0; i < ranking.length; i += quantos) potes.push(ranking.slice(i, i + quantos));
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const grupos: string[][] = Array.from({ length: quantos }, () => []);
    let ok = true;
    for (const pote of potes) {
      const ordem = rng.embaralhar([...pote]);
      const livres = grupos.map((_, g) => g);
      for (const id of ordem) {
        // O grupo livre sem ninguém do mesmo país; sem isso, qualquer livre (na última tentativa) ou tenta de novo.
        const semMesmo = livres.filter((g) => !grupos[g].some((x) => separar(x) === separar(id)));
        const opcoes = semMesmo.length ? semMesmo : livres;
        if (!semMesmo.length && tentativa < 79) ok = false;
        const g = opcoes[rng.int(0, opcoes.length - 1)];
        grupos[g].push(id);
        livres.splice(livres.indexOf(g), 1);
      }
      if (!ok) break;
    }
    if (ok || tentativa === 79) return grupos;
  }
  return [];
}

/** Rodadas de grupos cruzados: os do grupo `a` contra os do `b`, `rodadas` jogos por clube, com mando alternado. */
function rodadasCruzadas(a: string[], b: string[], rodadas: number): Confronto[][] {
  const n = Math.min(a.length, b.length);
  return Array.from({ length: Math.min(rodadas, Math.max(a.length, b.length)) }, (_, k) =>
    Array.from({ length: n }, (_, i): Confronto => {
      const x = a[i], y = b[(i + k) % b.length];
      return (i + k) % 2 === 0 ? [x, y] : [y, x];
    }));
}

/** Monta os jogos de uma fase e paga a cota de quem entra nela. `vindos`: quem passou da fase anterior. */
function iniciarFase(estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, fase: FaseCopa, vindos: string[]) {
  const ano = estado.temporada;
  const rng = rngPara(estado.semente, `copa-clubes/${ano}/${def.id}/${fase.id}`);
  const ocupacao = ocupacaoAtual(estado);
  const amanha = somarDias(estado.data, 1);
  const separar = (id: string) => (fase.grupos?.evitarMesmoEstado ? estado.clubes[id]?.estado : paisDoClube(estado, id)) ?? "";
  const entram = copa.entram[fase.id] ?? [];
  const clubes = unicos([...vindos, ...entram]);
  const base = { serie: def.id, fase: fase.id, jogada: false, gm: 0, gv: 0, eventos: [] };
  const novas: Partida[] = [];
  copa.fase = fase.id;

  if (fase.tipo === "grupos" || fase.tipo === "cruzado") {
    const g = fase.grupos!;
    const grupos = g.fixos
      ? g.fixos.map((nome) => rankingDosClubes(estado, copa.entram[nome] ?? []))
      : sortearGrupos(rng, rankingDosClubes(estado, clubes), g.quantos, separar);
    (copa.grupos ??= {})[fase.id] = grupos;
    const pagar = g.fixos ? grupos.flat() : clubes;
    pagarCota(estado, def, fase, pagar);
    const rodadasDoGrupo: { grupo: number; rodadas: Confronto[][] }[] = [];
    if (fase.tipo === "cruzado") {
      for (let k = 0; k + 1 < grupos.length; k += 2) rodadasDoGrupo.push({ grupo: k + 1, rodadas: rodadasCruzadas(grupos[k], grupos[k + 1], g.rodadas ?? grupos[k].length) });
    } else {
      grupos.forEach((grupo, k) => {
        const r = rngPara(estado.semente, `copa-clubes/${ano}/${def.id}/${fase.id}/grupo${k}`);
        rodadasDoGrupo.push({ grupo: k + 1, rodadas: g.turnos === 2 ? turnoEReturno(grupo, r) : turnoUnico(grupo, r) });
      });
    }
    for (const { grupo, rodadas } of rodadasDoGrupo) {
      rodadas.forEach((jogos, r) => {
        const semana = fase.semanas[Math.min(r, fase.semanas.length - 1)];
        jogos.forEach(([mandante, visitante], i) => {
          novas.push({
            ...base, id: `${ano}-${def.id}-${fase.id}-g${grupo}-${r + 1}-${i}`, rodada: r + 1, ...(fase.tipo === "grupos" ? { grupo } : {}),
            data: escolherData(estado, ocupacao, mandante, visitante, semana, fase.dia, amanha), mandante, visitante,
          });
        });
      });
    }
  } else {
    const pares = montarPares(estado, def, copa, fase, vindos, entram, rng, separar);
    // Quem ficou sem par (número ímpar) passa direto: o mais bem colocado.
    const comPar = new Set(pares.flat());
    const folga = clubes.filter((c) => !comPar.has(c));
    if (folga.length) (copa.entram[`${fase.id}-folga`] ??= []).push(...folga);
    pagarCota(estado, def, fase, [...comPar]);
    const idaEVolta = fase.semanas.length === 2;
    pares.forEach(([x, y], i) => {
      const chave = i + 1;
      const [melhor, pior] = melhorDosDois(estado, copa, x, y);
      if (idaEVolta) {
        const ida = escolherData(estado, ocupacao, pior, melhor, fase.semanas[0], fase.dia, amanha);
        const volta = escolherData(estado, ocupacao, melhor, pior, fase.semanas[1], fase.dia, somarDias(ida, 3));
        novas.push({ ...base, id: `${ano}-${def.id}-${fase.id}-${chave}-ida`, chave, rodada: 1, perna: 1, data: ida, mandante: pior, visitante: melhor });
        novas.push({ ...base, id: `${ano}-${def.id}-${fase.id}-${chave}-volta`, chave, rodada: 2, perna: 2, data: volta, mandante: melhor, visitante: pior });
      } else {
        const [mandante, visitante] = fase.casaDoPior && !fase.neutro ? [pior, melhor] : [melhor, pior];
        novas.push({
          ...base, id: `${ano}-${def.id}-${fase.id}-${chave}`, chave, rodada: 1, mandante, visitante,
          data: escolherData(estado, ocupacao, mandante, visitante, fase.semanas[0], fase.dia, amanha), ...(fase.neutro ? { neutro: true } : {}),
        });
      }
    });
  }
  estado.partidas.push(...novas);
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
  avisarFase(estado, def, copa, fase, novas);
  // Fase sem jogo (sobrou um clube): ele passa direto, para a copa não ficar parada.
  if (!novas.length) copa.classificados = clubes;
}

/** Os confrontos de uma fase do mata-mata ([x, y]; quem manda sai da campanha). */
function montarPares(
  estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, fase: FaseCopa, vindos: string[], entram: string[], rng: Rng, separar: (id: string) => string,
): [string, string][] {
  // A primeira fase de uma copa que começa mais adiante (copa nacional menor) é por potes, não pelo chaveamento.
  const pares = fase.pares === "chave" && !vindos.length && entram.length > 2 ? "potes" : fase.pares ?? "potes";
  const todos = unicos([...vindos, ...entram]);
  if (typeof pares === "object") {
    // Cruzamento fixo dos grupos da fase anterior.
    const anterior = def.fases[def.fases.indexOf(fase) - 1];
    const tabelas = tabelasDosGrupos(estado, def, copa, anterior);
    const quem = ([g, pos]: [number, number]) => tabelas[g - 1]?.[pos - 1]?.clubeId;
    return pares.cruzamentos.map(([a, b]) => [quem(a), quem(b)]).filter((p): p is [string, string] => !!p[0] && !!p[1]);
  }
  if (pares === "chave") {
    const lista = todos;
    const r: [string, string][] = [];
    for (let i = 0; i + 1 < lista.length; i += 2) r.push([lista[i], lista[i + 1]]);
    return r;
  }
  if (pares === "mesmo-pais") {
    const porPais = new Map<string, string[]>();
    for (const id of todos) porPais.set(separar(id), [...(porPais.get(separar(id)) ?? []), id]);
    return [...porPais.values()].flatMap((lista) => sortearPares(rng, lista, () => ""));
  }
  if (pares === "vindos-x-entram") {
    const n = Math.min(vindos.length, entram.length);
    return sortearPares(rng, vindos.slice(0, n), separar, entram.slice(0, n));
  }
  if (pares === "primeiros-x-segundos") {
    // Grupos da fase anterior: os primeiros contra os segundos de outros grupos.
    const anterior = def.fases[def.fases.indexOf(fase) - 1];
    const tabelas = tabelasDosGrupos(estado, def, copa, anterior);
    const primeiros = tabelas.map((t) => t[0]?.clubeId).filter(Boolean) as string[];
    const segundos = tabelas.map((t) => t[1]?.clubeId).filter(Boolean) as string[];
    const grupoDe = (id: string) => String(tabelas.findIndex((t) => t.some((l) => l.clubeId === id)));
    return sortearPares(rng, primeiros, grupoDe, segundos);
  }
  if (pares === "sorteio") return sortearPares(rng, todos, separar);
  // Potes: a melhor metade do ranking contra a pior, por sorteio.
  const ordem = rankingDosClubes(estado, todos);
  const metade = Math.floor(ordem.length / 2);
  return sortearPares(rng, ordem.slice(0, metade), separar, ordem.slice(metade, metade * 2));
}

/** Tabelas finais (ou de agora) dos grupos de uma fase de grupos. */
function tabelasDosGrupos(estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, fase: FaseCopa): LinhaTabela[][] {
  const grupos = copa.grupos?.[fase.id] ?? [];
  if (fase.tipo === "cruzado") return grupos.map((g) => tabelaCruzada(estado, def.id, fase.id, g));
  return grupos.map((g, k) => classificacao(estado, def.id, fase.id, g, k + 1));
}

/** Tabela de um grupo cruzado: os jogos de cada clube do grupo contra os do outro (mesmos desempates de sempre). */
function tabelaCruzada(estado: EstadoJogo, copaId: IdCopa, fase: string, clubes: string[]): LinhaTabela[] {
  const linhas = new Map(clubes.map((c) => [c, { clubeId: c, pos: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0, ultimos: [] as ("V" | "E" | "D")[] }]));
  for (const p of estado.partidas) {
    if (p.serie !== copaId || p.fase !== fase || !p.jogada) continue;
    for (const [id, pro, contra] of [[p.mandante, p.gm, p.gv], [p.visitante, p.gv, p.gm]] as const) {
      const l = linhas.get(id);
      if (!l) continue;
      l.j++; l.gp += pro; l.gc += contra; l.sg = l.gp - l.gc;
      if (pro > contra) { l.v++; l.pts += 3; l.ultimos.push("V"); } else if (pro === contra) { l.e++; l.pts++; l.ultimos.push("E"); } else { l.d++; l.ultimos.push("D"); }
    }
  }
  const sorteio = (id: string) => hashTexto(`${estado.temporada}/${copaId}/${id}`, estado.semente);
  const lista = [...linhas.values()].sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp || sorteio(a.clubeId) - sorteio(b.clubeId));
  lista.forEach((l, i) => { l.pos = i + 1; l.ultimos = l.ultimos.slice(-5); });
  return lista;
}

/** Tabelas dos grupos da copa nesta fase (para as telas): os grupos com a tabela de cada um. */
export function tabelasDaCopa(estado: EstadoJogo, copaId: IdCopa, faseId: string): LinhaTabela[][] {
  const def = POR_ID.get(copaId);
  const copa = estado.copas?.[copaId];
  const fase = def?.fases.find((f) => f.id === faseId);
  if (!def || !copa || !fase || fase.tipo === "mata") return [];
  return tabelasDosGrupos(estado, def, copa, fase);
}

function pagarCota(estado: EstadoJogo, def: DefinicaoCopa, fase: FaseCopa, clubes: string[]) {
  const valor = def.premios?.[fase.id];
  if (!valor) return;
  for (const id of clubes) {
    const clube = estado.clubes[id];
    if (clube) lancar(clube, estado.data, "premiacao", `${def.nome}: cota da ${fase.nome.toLowerCase()}`, valor);
  }
}

/** Vencedor de um confronto do mata-mata (jogo único ou ida e volta); null se ainda não acabou. */
function vencedorDoConfronto(estado: EstadoJogo, copaId: IdCopa, fase: string, chave: number, jogos: Partida[]): string | null {
  if (jogos.length === 1) {
    const [p] = jogos;
    if (!p.jogada) return null;
    if (p.gm !== p.gv) return p.gm > p.gv ? p.mandante : p.visitante;
    if (p.penaltis) return p.penaltis[0] > p.penaltis[1] ? p.mandante : p.visitante;
    return p.mandante;
  }
  const c = chavesDaFase(estado, copaId, fase).find((x) => x.chave === chave);
  return c ? vencedorDaChave(c) : null;
}

/** Mata-mata das copas de clubes: empate no jogo único ou no agregado da volta vai para os pênaltis. */
export function copaDecidePorPenaltis(p: Partida): boolean {
  const fase = POR_ID.get(p.serie)?.fases.find((f) => f.id === p.fase);
  return fase?.tipo === "mata" && p.perna !== 1;
}

/** A fase da copa terminou (todos os jogos jogados, já com os classificados de lado ou a copa encerrada)? */
function faseTerminada(estado: EstadoJogo, copaId: IdCopa, faseId: string): boolean {
  const copa = estado.copas?.[copaId];
  const def = POR_ID.get(copaId);
  if (!copa || !def) return true;
  if (copa.fase === "encerrada") return true;
  const atual = def.fases.findIndex((f) => f.id === copa.fase);
  const alvo = def.fases.findIndex((f) => f.id === faseId);
  return atual > alvo || (atual === alvo && copa.classificados != null);
}

/** Resultado da fase em andamento, se todos os jogos dela já foram jogados. */
function resultadoDaFase(estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, fase: FaseCopa): ResultadoFase | undefined {
  const jogos = estado.partidas.filter((p) => p.serie === def.id && p.fase === fase.id);
  if (!jogos.length || jogos.some((p) => !p.jogada)) return undefined;
  if (fase.tipo === "mata") {
    const chaves = [...new Set(jogos.map((p) => p.chave!))].sort((a, b) => a - b);
    const passaram: string[] = [];
    const eliminados: string[] = [];
    for (const c of chaves) {
      const doConfronto = jogos.filter((p) => p.chave === c);
      const v = vencedorDoConfronto(estado, def.id, fase.id, c, doConfronto)!;
      passaram.push(v);
      for (const id of [doConfronto[0].mandante, doConfronto[0].visitante]) if (id !== v) eliminados.push(id);
    }
    passaram.push(...(copa.entram[`${fase.id}-folga`] ?? []));
    return { passaram, eliminados };
  }
  const tabelas = tabelasDosGrupos(estado, def, copa, fase);
  const passam = fase.grupos!.passam;
  const passaram: string[] = [];
  for (let pos = 0; pos < passam; pos++) for (const t of tabelas) if (t[pos]) passaram.push(t[pos].clubeId);
  const eliminados = tabelas.flatMap((t) => t.slice(passam).map((l) => l.clubeId));
  return { passaram, eliminados, tabelas };
}

/**
 * Depois de cada dia de jogos: fase encerrada passa os classificados para a próxima (que espera os transferidos de
 * outra copa, se precisa) ou dá o título. Devolve as notícias para o usuário.
 */
export function avancarCopasDeClubes(estado: EstadoJogo): string[] {
  const noticias: string[] = [];
  if (!estado.copas) return noticias;
  const meu = estado.tecnico.clubeId;
  // Duas passadas: uma fase que acaba hoje pode liberar a fase que esperava por ela em outra copa.
  for (let passada = 0; passada < 2; passada++) {
    for (const def of DEFINICOES) {
      const copa = estado.copas[def.id];
      if (!copa || copa.fase === "encerrada") continue;
      const i = def.fases.findIndex((f) => f.id === copa.fase);
      const fase = def.fases[i];
      if (copa.classificados == null) {
        const r = resultadoDaFase(estado, def, copa, fase);
        if (!r) continue;
        const seguem = def.aoTerminar?.(estado, copa, fase, r) ?? r.passaram;
        if (i === def.fases.length - 1) {
          encerrar(estado, def, copa, noticias);
          continue;
        }
        copa.classificados = seguem;
        const clube = estado.clubes[meu];
        if (clube && r.eliminados.includes(meu)) {
          noticias.push(`${comArtigo("O", clube)} foi ${concorda(clube, "eliminado", "eliminada")} da ${def.nome} ${fase.tipo === "mata" ? `${["oitavas", "quartas"].some((x) => fase.id.startsWith(x)) ? "nas" : "na"} ${fase.nome.toLowerCase()}` : "na fase de grupos"}.`);
        }
      }
      const proxima = def.fases[i + 1];
      if (!proxima) {
        // Última fase sem jogo (sobrou um clube só): ele é o campeão.
        copa.campeao = copa.classificados?.[0];
        copa.fase = "encerrada";
        delete copa.classificados;
        continue;
      }
      if (proxima.depois && !faseTerminada(estado, proxima.depois.copa, proxima.depois.fase)) continue;
      const vindos = copa.classificados ?? [];
      delete copa.classificados;
      iniciarFase(estado, def, copa, proxima, vindos);
    }
  }
  return noticias;
}

function encerrar(estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, noticias: string[]) {
  const final = estado.partidas.find((p) => p.serie === def.id && p.fase === "final" && (p.perna ?? 2) === 2)
    ?? estado.partidas.filter((p) => p.serie === def.id).at(-1)!;
  const jogos = estado.partidas.filter((p) => p.serie === def.id && p.fase === final.fase && p.chave === final.chave);
  copa.campeao = vencedorDoConfronto(estado, def.id, final.fase, final.chave ?? 1, jogos) ?? final.mandante;
  copa.vice = final.mandante === copa.campeao ? final.visitante : final.mandante;
  copa.fase = "encerrada";
  const campeao = estado.clubes[copa.campeao];
  if (def.premios?.campeao) lancar(campeao, estado.data, "premiacao", `${def.nome}: campeão`, def.premios.campeao);
  if (def.premios?.vice && estado.clubes[copa.vice]) lancar(estado.clubes[copa.vice], estado.data, "premiacao", `${def.nome}: vice`, def.premios.vice);
  const meu = estado.tecnico.clubeId;
  // Notícia dos títulos que interessam: os do clube do usuário, as continentais e as do Brasil.
  if (copa.clubes.includes(meu) || def.grupo === "conmebol" || def.grupo === "brasil") {
    noticias.push(`${campeao.nome} é ${concorda(campeao, "campeão", "campeã")} da ${def.nome} ${estado.temporada}!`);
  }
}

/** Mensagem para o usuário quando o clube dele entra numa fase: o grupo ou o adversário e as datas. */
function avisarFase(estado: EstadoJogo, def: DefinicaoCopa, copa: EstadoCopaClubes, fase: FaseCopa, novas: Partida[]) {
  const meu = estado.tecnico.clubeId;
  const meus = novas.filter((p) => p.mandante === meu || p.visitante === meu);
  if (!meus.length) return;
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const quando = (p: Partida) => `${p.data.slice(8, 10)}/${p.data.slice(5, 7)}`;
  let texto: string;
  if (fase.tipo === "mata") {
    const adversario = meus[0].mandante === meu ? meus[0].visitante : meus[0].mandante;
    const onde = (p: Partida) => (p.neutro ? "em campo neutro" : p.mandante === meu ? "em casa" : "fora");
    texto = `${nome(meu)} x ${nome(adversario)}: ${meus.map((p) => `${onde(p)} em ${quando(p)}`).join(" e ")}.${meus.length === 2 ? " Ida e volta; se empatar no agregado, pênaltis." : " Jogo único; se empatar, pênaltis."}`;
  } else {
    const grupo = copa.grupos?.[fase.id]?.find((g) => g.includes(meu)) ?? [];
    const rivais = fase.tipo === "cruzado" ? [...new Set(meus.map((p) => (p.mandante === meu ? p.visitante : p.mandante)))] : grupo.filter((c) => c !== meu);
    texto = `${fase.tipo === "cruzado" ? "Adversários" : "No grupo"}: ${rivais.map(nome).join(", ")}. Primeiro jogo em ${quando(meus[0])}.`;
  }
  enviarMensagem(estado, { tipo: "noticia", titulo: `${def.nome}: ${fase.nome}`, texto });
}

/** Copas de clubes que o clube joga nesta temporada. */
export function copasDoClube(estado: EstadoJogo, clubeId: string): EstadoCopaClubes[] {
  return Object.values(estado.copas ?? {}).filter((c): c is EstadoCopaClubes => !!c && c.clubes.includes(clubeId));
}

export function copasEncerradas(estado: EstadoJogo): boolean {
  return Object.values(estado.copas ?? {}).every((c) => !c || c.fase === "encerrada");
}

/** Situação do clube na copa, numa frase (para as telas). */
export function situacaoNaCopaDeClubes(estado: EstadoJogo, copaId: IdCopa, clubeId: string): string {
  const copa = estado.copas?.[copaId];
  const clube = estado.clubes[clubeId];
  const def = POR_ID.get(copaId);
  if (!copa || !clube || !def) return "";
  const nome = comArtigo("O", clube);
  const naFase = (f: FaseCopa) => `${["oitavas", "quartas"].some((x) => f.id.startsWith(x)) ? "nas" : "na"} ${f.nome.toLowerCase()}`;
  if (copa.campeao === clubeId) return `${nome} é ${concorda(clube, "o campeão", "a campeã")} da ${def.nome}!`;
  if (copa.vice === clubeId) return `${nome} foi ${concorda(clube, "vice-campeão", "vice-campeã")} da ${def.nome}.`;
  if (!copa.clubes.includes(clubeId)) return `${nome} não joga a ${def.nome} nesta temporada.`;
  const jogos = estado.partidas.filter((p) => p.serie === copaId && (p.mandante === clubeId || p.visitante === clubeId));
  const ultima = jogos.at(-1);
  if (!ultima) {
    const entrada = def.fases.find((f) => copa.entram[f.id]?.includes(clubeId) || f.grupos?.fixos?.some((g) => copa.entram[g]?.includes(clubeId)));
    return `${nome} entra na ${def.nome} ${entrada ? naFase(entrada) : "mais adiante"}.`;
  }
  const fase = def.fases.find((f) => f.id === ultima.fase)!;
  // Eliminado: perdeu na última fase que jogou (os que vão para a fase seguinte por outro caminho, como o 1º dos grupos
  // da Sul-Americana, não estão entre os eliminados).
  const r = resultadoDaFase(estado, def, copa, fase);
  if (r?.eliminados.includes(clubeId)) return `${nome} foi ${concorda(clube, "eliminado", "eliminada")} da ${def.nome} ${naFase(fase)}.`;
  const proximo = jogos.find((p) => !p.jogada);
  const faseDoProximo = proximo ? def.fases.find((f) => f.id === proximo.fase)! : undefined;
  return faseDoProximo ? `${nome} está ${naFase(faseDoProximo)} da ${def.nome}.` : `${nome} passou de fase na ${def.nome} e espera o sorteio da próxima.`;
}

export { PAISES, divisaoDaLiga };
