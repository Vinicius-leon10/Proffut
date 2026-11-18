import { ENCARGOS_FOLHA, JOGOS_EM_CASA_POR_MES, LIMITE_FOLHA_RECEITA, RODADAS_POR_MES, TV_EUROPA_MES, TV_PISO_SEGUNDA, COTA_TV_RODADA, MANUTENCAO_POR_LUGAR, PATROCINIO_MES, PATROCINIO_SERIE_D, PRECO_REFERENCIA, PREMIACAO, PUBLICO_POR_TORCIDA } from "./constantes";
import type { Rng } from "./rng";
import type { Clube, EstadoJogo, SerieClube, SerieId, TipoLancamento } from "./tipos";

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

/** A série que vale para público e preços: a Série D, os clubes só do estadual e os de fora contam como a Série C. */
export function serieDoClube(clube: Clube): SerieId {
  return clube.serie === "A" || clube.serie === "B" ? clube.serie : "C";
}

/** Preço de referência do ingresso: o das séries; na Série D, no estadual e fora do Brasil, mais barato. */
export function precoDeReferencia(serie: SerieClube): number {
  if (serie === "A" || serie === "B" || serie === "C") return PRECO_REFERENCIA[serie];
  return serie === "exterior" ? 25 : serie === "D" ? 20 : 15;
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
    // Clubes só do estadual e os de fora não têm contas no jogo (não compram nem vendem por conta própria), fora o do
    // usuário, que pode treinar qualquer clube.
    const fora = clube.serie === "estadual" || clube.serie === "exterior";
    if ((fora && clube.id !== estado.tecnico.clubeId) || clube.serie === "selecao") continue;
    lancar(clube, data, "patrocinio", "Patrocínio do mês", patrocinioDoMes(clube));
    // Na Europa, os direitos de TV pagam a maior parte da folha (lá não há cota por rodada como nas séries).
    const tv = tvDoMes(clube);
    if (tv) lancar(clube, data, "tv", "Direitos de TV do mês", tv);
    const folha = folhas.get(clube.id) ?? 0;
    lancar(clube, data, "salarios", "Folha salarial", -folha);
    // Encargos só no clube do usuário (R138): os do computador ficam como antes.
    if (clube.id === estado.tecnico.clubeId && folha > 0) lancar(clube, data, "salarios", "Encargos sobre a folha", -folha * ENCARGOS_FOLHA);
    lancar(clube, data, "estadio", "Manutenção do estádio", -clube.estadio.capacidade * MANUTENCAO_POR_LUGAR);
  }
}

/** Patrocínio do mês. Série D, só do estadual e de fora: patrocínio menor que o da Série C. */
export function patrocinioDoMes(clube: Clube): number {
  const fora = clube.serie === "estadual" || clube.serie === "exterior";
  const base = clube.serie === "D" || fora ? PATROCINIO_MES.C * PATROCINIO_SERIE_D : PATROCINIO_MES[clube.serie as SerieId];
  return base * (0.6 + 0.8 * (clube.reputacao / 100));
}

/** Direitos de TV do mês (só os clubes de fora com liga na tabela; as séries recebem por rodada). */
function tvDoMes(clube: Clube): number {
  const tvEuropa = clube.serie === "exterior" && clube.liga ? TV_EUROPA_MES[clube.liga] : undefined;
  if (!tvEuropa) return 0;
  const piso = clube.liga && clube.liga.length > 2 ? TV_PISO_SEGUNDA : 0;
  return tvEuropa * Math.max(piso, (clube.reputacao / 100) ** 3);
}

/**
 * Quanto o clube arrecada num mês comum (estimativa, sem copas nem prêmios): patrocínio, TV (as séries pela cota de
 * cada rodada) e a bilheteria dos jogos em casa com o público esperado.
 */
export function receitaDoMes(clube: Clube): number {
  const serie = clube.serie;
  const tvRodadas = serie === "A" || serie === "B" || serie === "C" ? COTA_TV_RODADA[serie] * RODADAS_POR_MES : 0;
  const bilheteria = publicoEsperado(clube) * clube.precoIngresso * JOGOS_EM_CASA_POR_MES;
  return patrocinioDoMes(clube) + tvDoMes(clube) + tvRodadas + bilheteria;
}

/** A maior folha com os encargos que a diretoria aprova (R138). */
export function limiteDaFolha(_estado: EstadoJogo, clube: Clube): number {
  return Math.round(receitaDoMes(clube) * LIMITE_FOLHA_RECEITA);
}

/**
 * A diretoria aprova contratar alguém com este salário? Devolve o motivo da recusa, ou null. Só barra quando a folha
 * cresce e passa do limite (quem já está acima pode trocar um jogador por outro mais barato).
 */
export function motivoDaDiretoria(estado: EstadoJogo, clube: Clube, salarioNovo: number): string | null {
  const limite = limiteDaFolha(estado, clube);
  const depois = (folhaSalarial(estado, clube.id) + salarioNovo) * (1 + ENCARGOS_FOLHA);
  if (salarioNovo <= 0 || depois <= limite) return null;
  return `A diretoria não aprova: com os encargos, a folha iria a ${formatarDinheiro(depois)}/mês, e ela aprova até ${formatarDinheiro(limite)}/mês (${Math.round(LIMITE_FOLHA_RECEITA * 100)}% do que o clube arrecada num mês). Venda ou dispense alguém antes.`;
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
