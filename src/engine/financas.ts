import { COTA_TV_RODADA, MANUTENCAO_POR_LUGAR, PATROCINIO_MES, PRECO_REFERENCIA, PREMIACAO, PUBLICO_POR_TORCIDA } from "./constantes";
import type { Rng } from "./rng";
import type { Clube, EstadoJogo, SerieId, TipoLancamento } from "./tipos";

const LIMITE_EXTRATO = 80;

export const NOMES_LANCAMENTO: Record<TipoLancamento, string> = {
  bilheteria: "Bilheteria",
  tv: "Cota de TV",
  patrocinio: "Patrocínio",
  salarios: "Salários",
  estadio: "Manutenção do estádio",
  transferencia: "Transferências",
  premiacao: "Premiação",
  rescisao: "Rescisões",
};

/** Todo dinheiro que entra ou sai passa por aqui (e fica no extrato). */
export function lancar(clube: Clube, data: string, tipo: TipoLancamento, descricao: string, valor: number) {
  valor = Math.round(valor);
  clube.caixa += valor;
  clube.extrato.unshift({ data, tipo, descricao, valor });
  if (clube.extrato.length > LIMITE_EXTRATO) clube.extrato.length = LIMITE_EXTRATO;
  clube.resumoFinanceiro[tipo] = (clube.resumoFinanceiro[tipo] ?? 0) + valor;
}

export function serieDoClube(clube: Clube): SerieId {
  return clube.serie === "D" ? "C" : clube.serie;
}

/** Público esperado (sem sorteio), usado também na tela de finanças. */
export function publicoEsperado(clube: Clube, preco = clube.precoIngresso, classico = false): number {
  const serie = serieDoClube(clube);
  const conforto = 1 + 0.1 * (clube.estadio.conforto ?? 0);
  const demanda = clube.torcida * PUBLICO_POR_TORCIDA * conforto * (0.75 + 0.5 * (clube.moral / 100)) * Math.pow(PRECO_REFERENCIA[serie] / Math.max(5, preco), 1.2) * (classico ? 1.3 : 1);
  return Math.round(Math.min(clube.estadio.capacidade, Math.max(300, demanda)));
}

export function publicoDoJogo(rng: Rng, mandante: Clube, visitante: Clube): number {
  const classico = mandante.rival === visitante.id || visitante.rival === mandante.id;
  const base = publicoEsperado(mandante, mandante.precoIngresso, classico) * rng.real(0.85, 1.15);
  return Math.round(Math.min(mandante.estadio.capacidade, Math.max(200, base)));
}

export function folhaSalarial(estado: EstadoJogo, clubeId: string): number {
  let total = 0;
  for (const j of Object.values(estado.jogadores)) if (j.clubeId === clubeId) total += j.salario;
  return total;
}

/** Virada do mês: salários, patrocínio e manutenção do estádio. */
export function processarMes(estado: EstadoJogo, data: string) {
  const folhas = new Map<string, number>();
  for (const j of Object.values(estado.jogadores)) {
    if (j.clubeId) folhas.set(j.clubeId, (folhas.get(j.clubeId) ?? 0) + j.salario);
  }
  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    const serie = clube.serie;
    lancar(clube, data, "patrocinio", "Patrocínio do mês", PATROCINIO_MES[serie] * (0.6 + 0.8 * (clube.reputacao / 100)));
    lancar(clube, data, "salarios", "Folha salarial", -(folhas.get(clube.id) ?? 0));
    lancar(clube, data, "estadio", "Manutenção do estádio", -clube.estadio.capacidade * MANUTENCAO_POR_LUGAR);
  }
}

export function cotaDeTv(serie: SerieId): number {
  return COTA_TV_RODADA[serie];
}

/** Premiação pela posição final na fase de liga. */
export function premiacao(serie: SerieId, posicao: number, total = 20): number {
  const { primeiro, ultimo } = PREMIACAO[serie];
  const t = (posicao - 1) / Math.max(1, total - 1);
  return Math.round((primeiro + (ultimo - primeiro) * Math.sqrt(t)) / 10_000) * 10_000;
}

export function formatarDinheiro(valor: number): string {
  const sinal = valor < 0 ? "-" : "";
  const v = Math.abs(valor);
  if (v >= 1_000_000) return `${sinal}R$ ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2).replace(".", ",")} mi`;
  if (v >= 1_000) return `${sinal}R$ ${Math.round(v / 1_000)} mil`;
  return `${sinal}R$ ${Math.round(v)}`;
}
