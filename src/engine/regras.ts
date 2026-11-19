// Janelas de transferência e limite de estrangeiros por país (R139; pesquisa em docs/PESQUISA_JANELAS_E_ESTRANGEIROS.md).
// Livres assinam a qualquer hora; compra e empréstimo só com a janela aberta do clube que recebe.
import { formatarData } from "./calendario";
import type { Clube, EstadoJogo } from "./tipos";
import { PAISES } from "./torneios";

/** Uma janela: do dia "MM-DD" ao dia "MM-DD" (pode virar o ano, como dezembro a janeiro). */
type Janela = [inicio: string, fim: string];

// O calendário do jogo começa em janeiro em todo lugar; na Europa e no resto do mundo a temporada do jogo vai de janeiro a
// setembro, então a janela grande fica na pré-temporada (janeiro a março) e a curta no meio da temporada (junho e julho).
const JANELAS_PADRAO: Janela[] = [["01-01", "03-31"], ["07-01", "09-02"]];
const JANELAS: Record<string, Janela[]> = {
  BR: JANELAS_PADRAO,
  sul: JANELAS_PADRAO,
  MX: [["06-01", "08-31"], ["12-01", "01-31"]],
  central: [["06-01", "08-31"], ["12-01", "01-31"]],
  caribe: [["06-01", "08-31"], ["12-01", "01-31"]],
  US: [["02-01", "04-30"], ["07-01", "08-31"]],
  CA: [["02-01", "04-30"], ["07-01", "08-31"]],
  europa: [["01-01", "03-25"], ["06-15", "07-15"]],
  asia: JANELAS_PADRAO,
  africa: [["01-01", "03-25"], ["06-15", "07-15"]],
  oceania: [["01-01", "03-25"], ["06-15", "07-15"]],
};

/** Quantos estrangeiros cada país deixa um clube ter no elenco (os de fora da União Europeia, onde a regra é essa). */
const LIMITE_ESTRANGEIROS: Record<string, number> = {
  BR: 9, AR: 6, BO: 5, CL: 6, CO: 4, EC: 5, PY: 6, PE: 6, UY: 6, VE: 6,
  MX: 9, US: 8, CA: 8,
  ES: 3, FR: 4, TR: 14, RU: 8,
  SA: 10, QA: 5, AE: 6, JP: 5, KR: 6, CN: 5, AU: 5,
  EG: 5, MA: 5, ZA: 5,
};
/** Países em que só os de fora da União Europeia contam. */
const SO_FORA_DA_UE = new Set(["ES", "FR"]);
const UE = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
let nacionalidadesDaUe: Set<string> | undefined;
function daUe(nacionalidade: string): boolean {
  nacionalidadesDaUe ??= new Set(UE.map((p) => PAISES[p]?.nacionalidade).filter((n): n is string => !!n));
  return nacionalidadesDaUe.has(nacionalidade);
}

/** O país do clube (os do Brasil não têm `pais`). */
export function paisDoClube(clube: Clube): string {
  return clube.pais ?? (clube.liga ? clube.liga.slice(0, 2) : "BR");
}

function janelasDoClube(clube: Clube): Janela[] {
  const pais = paisDoClube(clube);
  return JANELAS[pais] ?? JANELAS[PAISES[pais]?.regiao ?? "sul"] ?? JANELAS_PADRAO;
}

/** A janela de transferências do clube está aberta nesta data ("AAAA-MM-DD")? */
export function janelaAberta(data: string, clube: Clube): boolean {
  const dia = data.slice(5);
  return janelasDoClube(clube).some(([ini, fim]) => (ini <= fim ? dia >= ini && dia <= fim : dia >= ini || dia <= fim));
}

/** A próxima data em que a janela abre. */
export function proximaAbertura(data: string, clube: Clube): string {
  const ano = Number(data.slice(0, 4));
  const datas = janelasDoClube(clube).flatMap(([ini]) => [`${ano}-${ini}`, `${ano + 1}-${ini}`]).filter((d) => d > data).sort();
  return datas[0];
}

/** O último dia da janela aberta. */
export function fimDaJanela(data: string, clube: Clube): string | undefined {
  const dia = data.slice(5);
  const ano = Number(data.slice(0, 4));
  for (const [ini, fim] of janelasDoClube(clube)) {
    if (ini <= fim && dia >= ini && dia <= fim) return `${ano}-${fim}`;
    if (ini > fim && (dia >= ini || dia <= fim)) return dia >= ini ? `${ano + 1}-${fim}` : `${ano}-${fim}`;
  }
  return undefined;
}

export function motivoDaJanela(estado: EstadoJogo, clube: Clube): string | null {
  if (janelaAberta(estado.data, clube)) return null;
  return `A janela de transferências está fechada: abre em ${formatarData(proximaAbertura(estado.data, clube))}. Fora dela, só jogador livre.`;
}

/** O limite de estrangeiros do país do clube (sem limite: undefined). Seleções não têm. */
export function limiteDeEstrangeiros(clube: Clube): number | undefined {
  if (clube.serie === "selecao") return undefined;
  return LIMITE_ESTRANGEIROS[paisDoClube(clube)];
}

/** O jogador conta como estrangeiro no clube? */
export function contaComoEstrangeiro(clube: Clube, nacionalidade: string): boolean {
  const pais = paisDoClube(clube);
  const doPais = pais === "BR" ? "BRA" : PAISES[pais]?.nacionalidade;
  if (nacionalidade === doPais) return false;
  if (SO_FORA_DA_UE.has(pais) && daUe(nacionalidade)) return false;
  return true;
}

export function estrangeirosNoElenco(estado: EstadoJogo, clube: Clube): number {
  let n = 0;
  for (const j of Object.values(estado.jogadores)) if (j.clubeId === clube.id && contaComoEstrangeiro(clube, j.nacionalidade)) n++;
  return n;
}

/** O clube pode receber mais este jogador? Devolve o motivo da recusa, ou null. `contagem`: estrangeiros já contados. */
export function motivoDosEstrangeiros(estado: EstadoJogo, clube: Clube, nacionalidade: string, contagem?: number): string | null {
  const limite = limiteDeEstrangeiros(clube);
  if (limite === undefined || !contaComoEstrangeiro(clube, nacionalidade)) return null;
  const n = contagem ?? estrangeirosNoElenco(estado, clube);
  if (n < limite) return null;
  const fora = SO_FORA_DA_UE.has(paisDoClube(clube)) ? " de fora da União Europeia" : "";
  return `Limite de estrangeiros: o elenco já tem ${n} estrangeiros${fora} e a regra do país permite ${limite}. Venda ou dispense um antes.`;
}
