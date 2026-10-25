// Números que regulam o jogo. Ajuste aqui e confira o efeito com `npm run sim`.
import type { Estilo, FaseCopa, Posicao, SerieId } from "./tipos";

export const TEMPORADA_INICIAL = 2026;

// ---- partida ---------------------------------------------------------------
/** Chance de acontecer algo relevante a cada minuto. */
export const CHANCE_EVENTO = 0.15;
/** Pesos dos tipos de lance quando algo acontece. */
export const PESO_LANCE = { chance: 50, escanteio: 18, falta: 32 };
/** Conversão máxima de uma chance em gol (multiplica a disputa ataque × defesa). */
export const CONVERSAO = 0.52;
/** Expoente que amplia a diferença de força nas disputas (1 = proporcional). */
export const EXPOENTE_DISPUTA = 2.5;
/** Vantagem do mandante, multiplicando a força de cada setor. */
export const MANDO = { ataque: 1.08, meio: 1.06, defesa: 1.05 };
export const PROB_CABECEIO_ESCANTEIO = 0.28;
export const PROB_PENALTI_FALTA = 0.06;
export const PROB_AMARELO_FALTA = 0.6;
export const PROB_VERMELHO_FALTA = 0.008;
export const CONVERSAO_PENALTI = 0.76;
export const PROB_ASSISTENCIA = 0.7;
/** Chance de um titular se lesionar ao longo de uma partida. */
export const PROB_LESAO_JOGO = 0.016;
export const MAX_SUBSTITUICOES = 5;

/** Multiplicadores de cada estilo nos setores e no gasto de energia por minuto. */
export const ESTILOS: Record<Estilo, { nome: string; defesa: number; meio: number; ataque: number; energia: number }> = {
  equilibrado: { nome: "Equilibrado", defesa: 1.0, meio: 1.0, ataque: 1.0, energia: 0.36 },
  ofensivo: { nome: "Ofensivo", defesa: 0.92, meio: 1.0, ataque: 1.1, energia: 0.41 },
  defensivo: { nome: "Defensivo", defesa: 1.12, meio: 0.98, ataque: 0.86, energia: 0.31 },
  "contra-ataque": { nome: "Contra-ataque", defesa: 1.08, meio: 0.9, ataque: 1.0, energia: 0.33 },
  "ataque-total": { nome: "Ataque total", defesa: 0.82, meio: 1.0, ataque: 1.22, energia: 0.46 },
  posse: { nome: "Posse de bola", defesa: 1.0, meio: 1.12, ataque: 0.92, energia: 0.31 },
};
export const PRESSAO = { meio: 1.05, defesa: 1.02, energia: 1.18, faltas: 1.35 };

// ---- energia e recuperação --------------------------------------------------
export const RECUPERACAO_POR_DIA = 9;
export const DIAS_LESAO = { min: 4, max: 35 };

// ---- elenco -----------------------------------------------------------------
export const ELENCO_MAXIMO = 32;
/** Mínimo por posição: abaixo disso o clube não vende nem dispensa. */
export const MINIMO_POSICAO: Record<Posicao, number> = { G: 2, L: 2, Z: 3, M: 4, A: 2 };

// ---- dinheiro -----------------------------------------------------------------
export const PRECO_REFERENCIA: Record<SerieId, number> = { A: 60, B: 35, C: 25 };
export const COTA_TV_RODADA: Record<SerieId, number> = { A: 350_000, B: 120_000, C: 70_000 };
export const PATROCINIO_MES: Record<SerieId, number> = { A: 1_200_000, B: 350_000, C: 150_000 };
export const MANUTENCAO_POR_LUGAR = 4;
/** Público potencial por ponto de torcida (antes do preço e da capacidade). */
export const PUBLICO_POR_TORCIDA = 550;
/** Premiação por posição final (1º leva o primeiro valor, o último leva o último). */
export const PREMIACAO: Record<SerieId, { primeiro: number; ultimo: number }> = {
  A: { primeiro: 30_000_000, ultimo: 3_000_000 },
  B: { primeiro: 5_000_000, ultimo: 500_000 },
  C: { primeiro: 1_500_000, ultimo: 150_000 },
};

/**
 * Copa do Brasil: cota por fase disputada, com os valores da CBF em 2026 multiplicados por
 * ESCALA_COPA (a economia do jogo é menor que a de verdade). Até a 4ª fase, [Série B, demais].
 */
export const ESCALA_COPA = 0.5;
export const COTA_COPA: Record<Exclude<FaseCopa, "final">, [serieB: number, demais: number]> = {
  fase1: [400_000, 400_000],
  fase2: [1_380_000, 830_000],
  fase3: [1_530_000, 950_000],
  fase4: [1_680_000, 1_070_000],
  fase5: [2_000_000, 2_000_000],
  oitavas: [3_000_000, 3_000_000],
  quartas: [4_000_000, 4_000_000],
  semi: [9_000_000, 9_000_000],
};
export const PREMIO_FINAL_COPA = { campeao: 78_000_000, vice: 34_000_000 };

// ---- calendário -------------------------------------------------------------
/** Semanas (contando a partir de 0) que têm rodada no meio de semana. */
export const SEMANAS_COM_MEIO_DE_SEMANA = [5, 10, 15, 20, 25];
export const SABADOS_POR_TEMPORADA = 35;
