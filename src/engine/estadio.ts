// Obras no estádio: ampliar a capacidade (para quem lota) ou modernizar (para atrair mais público).
import { somarDias, formatarData } from "./calendario";
import { MANUTENCAO_POR_LUGAR, PRECO_REFERENCIA, PUBLICO_POR_TORCIDA } from "./constantes";
import { lancar, publicoEsperado, serieDoClube } from "./financas";
import { enviarMensagem } from "./mensagens";
import type { Clube, EstadoJogo, SerieId } from "./tipos";

export const CAPACIDADE_MAXIMA = 80_000;
/** Obras menores custam menos: o preço por lugar cai nas séries de baixo. */
export const CUSTO_POR_LUGAR: Record<SerieId, number> = { A: 3_000, B: 1_500, C: 800 };
export const AMPLIACOES = [2_000, 5_000, 10_000];
export const CONFORTO_MAXIMO = 3;
export const BONUS_CONFORTO = 0.1;
export const SEMANAS_MODERNIZACAO = 8;

export function semanasDeAmpliacao(lugares: number): number {
  return lugares <= 2_000 ? 6 : lugares <= 5_000 ? 10 : 16;
}

export function custoAmpliacao(clube: Clube, lugares: number): number {
  return lugares * CUSTO_POR_LUGAR[serieDoClube(clube)];
}

/** Jogos em casa por temporada na fase de liga (para estimar a renda). */
export function jogosEmCasa(clube: Clube): number {
  return serieDoClube(clube) === "C" ? 10 : 19;
}

/**
 * Proporcional à bilheteria do clube: o primeiro nível se paga em ~4 temporadas,
 * os seguintes demoram mais (6 e 8).
 */
export function custoModernizacao(clube: Clube): number {
  const serie = serieDoClube(clube);
  const conforto = clube.estadio.conforto ?? 0;
  const publico = Math.min(clube.estadio.capacidade, clube.torcida * PUBLICO_POR_TORCIDA);
  const bilheteria = publico * PRECO_REFERENCIA[serie] * jogosEmCasa(clube);
  const custo = bilheteria * BONUS_CONFORTO * 4 * (1 + 0.5 * conforto);
  return Math.max(300_000, Math.round(custo / 50_000) * 50_000);
}

export interface Impacto {
  publicoAntes: number;
  publicoDepois: number;
  rendaExtraTemporada: number;
  manutencaoExtraMes: number;
}

function impacto(clube: Clube, mudanca: Partial<Clube["estadio"]>, lugaresExtras = 0): Impacto {
  const antes = publicoEsperado(clube);
  const depois = publicoEsperado({ ...clube, estadio: { ...clube.estadio, ...mudanca } });
  return {
    publicoAntes: antes,
    publicoDepois: depois,
    rendaExtraTemporada: (depois - antes) * clube.precoIngresso * jogosEmCasa(clube),
    manutencaoExtraMes: lugaresExtras * MANUTENCAO_POR_LUGAR,
  };
}

export function impactoAmpliacao(clube: Clube, lugares: number): Impacto {
  return impacto(clube, { capacidade: clube.estadio.capacidade + lugares }, lugares);
}

export function impactoModernizacao(clube: Clube): Impacto {
  return impacto(clube, { conforto: (clube.estadio.conforto ?? 0) + 1 });
}

export type ResultadoObra = { ok: boolean; texto: string };

export function ampliarEstadio(estado: EstadoJogo, lugares: number): ResultadoObra {
  const clube = estado.clubes[estado.tecnico.clubeId];
  const custo = custoAmpliacao(clube, lugares);
  if (clube.estadio.obra) return { ok: false, texto: "Já tem uma obra em andamento no estádio." };
  if (clube.estadio.capacidade + lugares > CAPACIDADE_MAXIMA) return { ok: false, texto: `O estádio não pode passar de ${CAPACIDADE_MAXIMA.toLocaleString("pt-BR")} lugares.` };
  if (clube.caixa < custo) return { ok: false, texto: "Não há dinheiro em caixa para essa obra." };
  lancar(clube, estado.data, "estadio", `Obra: ampliação de ${lugares.toLocaleString("pt-BR")} lugares`, -custo);
  clube.estadio.obra = { tipo: "ampliacao", lugares, terminaEm: somarDias(estado.data, semanasDeAmpliacao(lugares) * 7) };
  return { ok: true, texto: `Obra iniciada! Fica pronta em ${formatarData(clube.estadio.obra.terminaEm)}.` };
}

export function modernizarEstadio(estado: EstadoJogo): ResultadoObra {
  const clube = estado.clubes[estado.tecnico.clubeId];
  const custo = custoModernizacao(clube);
  if (clube.estadio.obra) return { ok: false, texto: "Já tem uma obra em andamento no estádio." };
  if ((clube.estadio.conforto ?? 0) >= CONFORTO_MAXIMO) return { ok: false, texto: "O estádio já está no nível máximo de conforto." };
  if (clube.caixa < custo) return { ok: false, texto: "Não há dinheiro em caixa para essa obra." };
  lancar(clube, estado.data, "estadio", "Obra: modernização do estádio", -custo);
  clube.estadio.obra = { tipo: "modernizacao", terminaEm: somarDias(estado.data, SEMANAS_MODERNIZACAO * 7) };
  return { ok: true, texto: `Modernização iniciada! Fica pronta em ${formatarData(clube.estadio.obra.terminaEm)}.` };
}

/** Entrega as obras que terminaram até a data. */
export function concluirObras(estado: EstadoJogo, data: string) {
  for (const clube of Object.values(estado.clubes)) {
    const obra = clube.estadio.obra;
    if (!obra || obra.terminaEm > data) continue;
    if (obra.tipo === "ampliacao") clube.estadio.capacidade = Math.min(CAPACIDADE_MAXIMA, clube.estadio.capacidade + (obra.lugares ?? 0));
    else clube.estadio.conforto = Math.min(CONFORTO_MAXIMO, (clube.estadio.conforto ?? 0) + 1);
    clube.estadio.obra = undefined;
    if (clube.id === estado.tecnico.clubeId) {
      enviarMensagem(estado, {
        tipo: "noticia",
        titulo: "Obra concluída!",
        texto: obra.tipo === "ampliacao"
          ? `O ${clube.estadio.nome} agora tem ${clube.estadio.capacidade.toLocaleString("pt-BR")} lugares.`
          : `O ${clube.estadio.nome} ficou mais confortável (nível ${clube.estadio.conforto} de ${CONFORTO_MAXIMO}). Mais torcedores vão aos jogos.`,
      });
    }
  }
}
