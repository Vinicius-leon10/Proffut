// Calendário do mundo (plano das temporadas reais, etapa 1, nov/2026; docs/PLANO_TEMPORADAS_REAIS.md).
//
// Uma tabela só diz, para cada país, em que ciclo a temporada dele corre e as datas reais (pré-temporada, abertura, fim e
// virada). As ligas de fora do Brasil são marcadas por ela (`datasDaLiga` em torneios.ts, etapa 2): as de agosto a maio
// atravessam o ano e viram em 30 de junho (`viradaDasLigas` em torneios.ts).

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
  /**
   * Pausa sem jogos da liga: a de inverno da Europa e, nos ciclos que cruzam o ano, a do fim de ano (do Natal até depois
   * do Ano Novo, para a virada de 31/12 não pular jogos); no México e na América Central, entre os dois torneios.
   */
  pausa?: { de: string; ate: string };
}

/** Datas típicas de cada ciclo; cada país pode trocar a abertura e o fim. */
const PADRAO: Record<Ciclo, Omit<CalendarioDoPais, "ciclo">> = {
  ano: { preTemporada: "01-03", abertura: "02-01", fim: "11-30" },
  torneios: { preTemporada: "01-03", abertura: "01-10", fim: "12-13", pausa: { de: "05-25", ate: "07-10" } },
  agosto: { preTemporada: "07-01", abertura: "08-15", fim: "05-25", pausa: { de: "12-21", ate: "01-08" } },
  outubro: { preTemporada: "09-01", abertura: "10-17", fim: "05-20", pausa: { de: "12-21", ate: "01-08" } },
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

/** Abertura e fim reais quando fogem do padrão do ciclo (aproximados, temporada 2026 ou 2026/27). */
const DATAS_PROPRIAS: Record<string, Partial<Omit<CalendarioDoPais, "ciclo">>> = {
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
      tabela[pais] = { ciclo, ...PADRAO[ciclo], ...DATAS_PROPRIAS[pais] };
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

/** Liga de fora ("L-EN", "L-AU2") cujo ciclo cruza o ano (de agosto ou outubro a maio). */
export function ligaCruzaOAno(id: Competicao | string): boolean {
  return id.startsWith("L-") && cruzaOAno(cicloDaCompeticao(id));
}

/**
 * Período da liga do país na temporada que começa em `ano`: da abertura ao fim e a pausa, em datas "AAAA-MM-DD" (nos
 * ciclos que cruzam o ano, o que vem antes de julho fica no ano seguinte).
 */
export function periodoDaLiga(pais: string, ano: number): { de: string; ate: string; pausa?: { de: string; ate: string } } {
  const cal = calendarioDoPais(pais);
  const cruza = cruzaOAno(cal.ciclo);
  const noAno = (md: string) => `${cruza && md < "07-01" ? ano + 1 : ano}-${md}`;
  return { de: noAno(cal.abertura), ate: noAno(cal.fim), ...(cal.pausa ? { pausa: { de: noAno(cal.pausa.de), ate: noAno(cal.pausa.ate) } } : {}) };
}
