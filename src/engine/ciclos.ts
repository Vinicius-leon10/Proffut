// Calendário do mundo (plano das temporadas reais, etapa 1, nov/2026; docs/PLANO_TEMPORADAS_REAIS.md).
//
// Uma tabela só diz, para cada país, em que ciclo a temporada dele corre e as datas reais (pré-temporada, abertura, fim e
// virada). Nesta etapa o jogo ainda usa as datas de sempre (`semanaNoJogo`: todo o mundo dentro do ano civil); as datas
// reais passam a valer na etapa 2. Nada aqui muda o jogo: é a base que as próximas etapas leem.

import type { Clube, Competicao } from "./tipos";

/**
 * Ciclo da temporada de um país:
 * - "ano": ano civil (Brasil, América do Sul, EUA e Canadá, Coreia, China, nórdicos...), virada em 31/12;
 * - "torneios": dois torneios no ano (Clausura e Apertura: México, América Central, Rep. Dominicana), virada em 31/12;
 * - "agosto": de agosto a maio (Europa, Oriente Médio, boa parte da África e da Ásia), virada em 30/06;
 * - "outubro": de outubro a maio (Austrália e Nova Zelândia), virada em 30/06.
 */
export type Ciclo = "ano" | "torneios" | "agosto" | "outubro";

/** Datas reais de um país, no formato "MM-DD" (o ano sai do ciclo). */
export interface CalendarioDoPais {
  ciclo: Ciclo;
  /** Começo da pré-temporada: o dia em que o jogo começa para quem escolhe um clube desse país (etapa 3). */
  preTemporada: string;
  /** Primeira rodada da liga. */
  abertura: string;
  /** Última rodada da liga. */
  fim: string;
  /** Pausa de inverno (só alguns países da Europa). */
  pausa?: { de: string; ate: string };
  /**
   * Semana da temporada do jogo em que a liga começa HOJE (contando do primeiro sábado de abril, como `domingo`): a Europa
   * começa em janeiro, com os estaduais (−12); o resto em abril (0). Sai na etapa 2, quando valerem as datas reais.
   */
  semanaNoJogo: number;
}

/** Datas típicas de cada ciclo; cada país pode trocar a abertura e o fim. */
const PADRAO: Record<Ciclo, Omit<CalendarioDoPais, "ciclo" | "semanaNoJogo">> = {
  ano: { preTemporada: "01-03", abertura: "02-01", fim: "11-30" },
  torneios: { preTemporada: "01-03", abertura: "01-10", fim: "12-15" },
  agosto: { preTemporada: "07-01", abertura: "08-15", fim: "05-25" },
  outubro: { preTemporada: "09-01", abertura: "10-17", fim: "05-20" },
};

/** Dia em que cada ciclo vira (contratos, acesso e queda, evolução dos jogadores): "MM-DD". */
export const VIRADA_DO_CICLO: Record<Ciclo, string> = { ano: "12-31", torneios: "12-31", agosto: "06-30", outubro: "06-30" };

// Países de cada ciclo (códigos de `PAISES` em torneios.ts; "BR" é o Brasil). Tabela aprovada pelo usuário (nov/2026):
// "ano civil; dois torneios no México e na América Central; agosto a maio para Europa, Oriente Médio, boa parte da África e
// da Ásia; outubro a maio para Austrália e Nova Zelândia". Simplificação: o Caribe (fora a Rep. Dominicana) fica no ano civil.
const CICLO_ANO = [
  "BR", "AR", "BO", "CL", "CO", "EC", "PY", "PE", "UY", "VE", "US", "CA",
  "JM", "TT", "HT", "CU", "PR", "SR", "GY", "CW", "AW", "SX", "BQ", "MQ", "GP", "GF", "MF", "BB", "BS", "BM", "KY", "LC", "GD",
  "VC", "KN", "AG", "DM", "MS", "AI", "VG", "VI", "TC",
  "KR", "CN", "UZ", "NO", "SE", "FI", "IS", "FO", "IE", "EE", "LV", "LT", "BY", "KZ", "ZM", "AO",
];
const CICLO_TORNEIOS = ["MX", "CR", "HN", "GT", "SV", "PA", "NI", "BZ", "DO"];
const CICLO_OUTUBRO = ["AU", "NZ"];
const CICLO_AGOSTO = [
  "EN", "ES", "IT", "DE", "FR", "PT", "NL", "AT", "BE", "CH", "DK", "GR", "HR", "PL", "RO", "RU", "XS", "RS", "TR", "CZ", "UA",
  "AL", "AD", "AM", "AZ", "BA", "BG", "CY", "GE", "GI", "HU", "IL", "XK", "LU", "MT", "MD", "ME", "MK", "XN", "SM", "SK", "SI", "XW",
  "JP", "SA", "QA", "AE", "IQ", "JO", "KW", "BH", "IR", "IN", "TH", "MY", "ID", "VN",
  "EG", "MA", "DZ", "TN", "ZA", "NG", "GH", "TZ", "KE",
];

/** Países com liga que começa em janeiro no jogo de hoje (a Europa; ver `semanaNoJogo`). */
const EUROPA = new Set([
  "EN", "ES", "IT", "DE", "FR", "PT", "NL", "AT", "BE", "CH", "DK", "GR", "HR", "NO", "PL", "RO", "RU", "XS", "SE", "RS", "TR",
  "CZ", "UA", "AL", "AD", "AM", "AZ", "BY", "BA", "BG", "CY", "EE", "FO", "FI", "GE", "GI", "HU", "IS", "IE", "IL", "KZ", "XK",
  "LV", "LT", "LU", "MT", "MD", "ME", "MK", "XN", "SM", "SK", "SI", "XW",
]);

/** Abertura e fim reais quando fogem do padrão do ciclo (aproximados, temporada 2026 ou 2026/27). */
const DATAS_PROPRIAS: Record<string, Partial<Omit<CalendarioDoPais, "ciclo" | "semanaNoJogo">>> = {
  BR: { abertura: "01-11", fim: "12-06" }, // estaduais em janeiro; Série A até dezembro
  AR: { abertura: "01-24", fim: "12-13" },
  US: { preTemporada: "01-20", abertura: "02-21", fim: "11-07" },
  CA: { preTemporada: "02-20", abertura: "04-04", fim: "10-31" },
  NO: { preTemporada: "01-10", abertura: "03-29", fim: "11-29" },
  SE: { preTemporada: "01-10", abertura: "03-29", fim: "11-08" },
  FI: { preTemporada: "01-10", abertura: "04-04", fim: "10-31" },
  IS: { preTemporada: "01-10", abertura: "04-05", fim: "10-24" },
  IE: { preTemporada: "01-03", abertura: "02-13", fim: "10-30" },
  KR: { abertura: "02-28", fim: "11-29" },
  CN: { abertura: "03-01", fim: "11-07" },
  JP: { abertura: "08-08", fim: "05-30" },
  EN: { abertura: "08-22", fim: "05-23" },
  DE: { abertura: "08-28", fim: "05-15", pausa: { de: "12-21", ate: "01-08" } },
  AT: { abertura: "08-01", fim: "05-24", pausa: { de: "12-14", ate: "02-06" } },
  CH: { abertura: "07-25", fim: "05-24", pausa: { de: "12-21", ate: "01-24" } },
  RU: { abertura: "07-18", fim: "05-23", pausa: { de: "12-10", ate: "02-27" } },
  UA: { abertura: "08-01", fim: "05-30", pausa: { de: "12-14", ate: "02-27" } },
  PL: { abertura: "07-18", fim: "05-23", pausa: { de: "12-21", ate: "01-30" } },
  DK: { abertura: "07-18", fim: "05-25", pausa: { de: "12-07", ate: "02-13" } },
  XS: { abertura: "08-01", fim: "05-17" },
  SA: { abertura: "08-27", fim: "05-28" },
};

function montar(): Record<string, CalendarioDoPais> {
  const tabela: Record<string, CalendarioDoPais> = {};
  const juntar = (ciclo: Ciclo, paises: string[]) => {
    for (const pais of paises) {
      tabela[pais] = { ciclo, ...PADRAO[ciclo], ...DATAS_PROPRIAS[pais], semanaNoJogo: EUROPA.has(pais) ? -12 : 0 };
    }
  };
  juntar("ano", CICLO_ANO);
  juntar("torneios", CICLO_TORNEIOS);
  juntar("agosto", CICLO_AGOSTO);
  juntar("outubro", CICLO_OUTUBRO);
  return tabela;
}

/** Calendário de cada país do jogo ("BR" é o Brasil; os outros, os códigos de `PAISES`). */
export const CALENDARIO_DO_MUNDO: Record<string, CalendarioDoPais> = montar();

/** Calendário do país (país sem registro: o do Brasil, ano civil). */
export function calendarioDoPais(pais: string | undefined): CalendarioDoPais {
  return CALENDARIO_DO_MUNDO[pais ?? "BR"] ?? CALENDARIO_DO_MUNDO.BR;
}

export function cicloDoPais(pais: string | undefined): Ciclo {
  return calendarioDoPais(pais).ciclo;
}

/** Ciclo do clube: os brasileiros (Séries A a D e estaduais) e as seleções vivem no ano civil; os de fora, no do país. */
export function cicloDoClube(clube: Pick<Clube, "serie" | "pais">): Ciclo {
  return clube.serie === "exterior" ? cicloDoPais(clube.pais) : "ano";
}

/** Ciclo de uma competição: as ligas de fora ("L-EN", "L-AR2") pelo país; o resto (séries, Copa do Brasil, estaduais) no ano civil. */
export function cicloDaCompeticao(id: Competicao | string): Ciclo {
  return id.startsWith("L-") ? cicloDoPais(id.slice(2, 4)) : "ano";
}

/** O ciclo cruza o ano (começa num ano e acaba no outro)? */
export function cruzaOAno(ciclo: Ciclo): boolean {
  return ciclo === "agosto" || ciclo === "outubro";
}

/** Rótulo da temporada que começa em `ano`: "2026" no ano civil, "2026/27" nos ciclos que cruzam o ano. */
export function rotuloDaTemporada(ciclo: Ciclo, ano: number): string {
  return cruzaOAno(ciclo) ? `${ano}/${String((ano + 1) % 100).padStart(2, "0")}` : String(ano);
}

/** Ano em que começou a temporada do ciclo que está correndo na data "AAAA-MM-DD" (2027-03-10 no ciclo agosto: 2026). */
export function anoDoCiclo(ciclo: Ciclo, data: string): number {
  const ano = Number(data.slice(0, 4));
  if (!cruzaOAno(ciclo)) return ano;
  return data.slice(5) > VIRADA_DO_CICLO[ciclo] ? ano : ano - 1;
}

/** Dia da virada da temporada do ciclo que começou em `ano` ("AAAA-MM-DD"). */
export function viradaDoCiclo(ciclo: Ciclo, ano: number): string {
  return `${cruzaOAno(ciclo) ? ano + 1 : ano}-${VIRADA_DO_CICLO[ciclo]}`;
}

/** Dia em que começa a pré-temporada do país na temporada que começa em `ano` ("AAAA-MM-DD"). */
export function inicioDaPreTemporada(pais: string | undefined, ano: number): string {
  return `${ano}-${calendarioDoPais(pais).preTemporada}`;
}

/** Semana da temporada do jogo em que a liga do país começa hoje (ver `semanaNoJogo`). */
export function semanaDaLigaNoJogo(pais: string): number {
  return calendarioDoPais(pais).semanaNoJogo;
}
