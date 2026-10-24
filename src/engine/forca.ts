import type { Caracteristica, Formacao, Jogadas, Jogador, Lado, Posicao } from "./tipos";

export interface Vaga {
  pos: Posicao;
  lado?: Lado;
  /** Coordenadas no campinho: x de 0 (esquerda) a 100 (direita), y de 0 (ataque) a 100 (próprio gol). */
  x: number;
  y: number;
}

const G: Vaga = { pos: "G", x: 50, y: 92 };
const LINHA_DE_4: Vaga[] = [
  { pos: "L", lado: "D", x: 88, y: 72 },
  { pos: "Z", x: 62, y: 77 },
  { pos: "Z", x: 38, y: 77 },
  { pos: "L", lado: "E", x: 12, y: 72 },
];

export const FORMACOES: Record<Formacao, Vaga[]> = {
  "4-4-2": [
    G, ...LINHA_DE_4,
    { pos: "M", x: 82, y: 48 }, { pos: "M", x: 60, y: 54 }, { pos: "M", x: 40, y: 54 }, { pos: "M", x: 18, y: 48 },
    { pos: "A", x: 62, y: 20 }, { pos: "A", x: 38, y: 20 },
  ],
  "4-3-3": [
    G, ...LINHA_DE_4,
    { pos: "M", x: 72, y: 52 }, { pos: "M", x: 50, y: 57 }, { pos: "M", x: 28, y: 52 },
    { pos: "A", x: 82, y: 22 }, { pos: "A", x: 50, y: 16 }, { pos: "A", x: 18, y: 22 },
  ],
  "3-5-2": [
    G,
    { pos: "Z", x: 72, y: 77 }, { pos: "Z", x: 50, y: 79 }, { pos: "Z", x: 28, y: 77 },
    { pos: "M", x: 90, y: 46 }, { pos: "M", x: 68, y: 55 }, { pos: "M", x: 50, y: 60 }, { pos: "M", x: 32, y: 55 }, { pos: "M", x: 10, y: 46 },
    { pos: "A", x: 62, y: 20 }, { pos: "A", x: 38, y: 20 },
  ],
  "4-5-1": [
    G, ...LINHA_DE_4,
    { pos: "M", x: 86, y: 46 }, { pos: "M", x: 67, y: 54 }, { pos: "M", x: 50, y: 59 }, { pos: "M", x: 33, y: 54 }, { pos: "M", x: 14, y: 46 },
    { pos: "A", x: 50, y: 18 },
  ],
  "5-3-2": [
    G,
    { pos: "L", lado: "D", x: 90, y: 66 }, { pos: "Z", x: 70, y: 78 }, { pos: "Z", x: 50, y: 80 }, { pos: "Z", x: 30, y: 78 }, { pos: "L", lado: "E", x: 10, y: 66 },
    { pos: "M", x: 72, y: 50 }, { pos: "M", x: 50, y: 55 }, { pos: "M", x: 28, y: 50 },
    { pos: "A", x: 62, y: 20 }, { pos: "A", x: 38, y: 20 },
  ],
  "4-2-4": [
    G, ...LINHA_DE_4,
    { pos: "M", x: 64, y: 55 }, { pos: "M", x: 36, y: 55 },
    { pos: "A", x: 86, y: 26 }, { pos: "A", x: 62, y: 18 }, { pos: "A", x: 38, y: 18 }, { pos: "A", x: 14, y: 26 },
  ],
};

export const NOMES_POSICAO: Record<Posicao, string> = { G: "Goleiro", L: "Lateral", Z: "Zagueiro", M: "Meio-campo", A: "Atacante" };

export const NOMES_CARACTERISTICA: Record<Caracteristica, string> = {
  COL: "Colocação", REF: "Reflexo", SAI: "Saída do gol", PEN: "Defesa de pênalti",
  ARM: "Armação", CAB: "Cabeceio", CRU: "Cruzamento", DES: "Desarme", DRI: "Drible",
  FIN: "Finalização", MAR: "Marcação", PAS: "Passe", RES: "Resistência", VEL: "Velocidade",
};

/** Rendimento de quem joga fora da posição: [vaga][posição natural do jogador]. */
const FATOR_POSICAO: Record<Posicao, Record<Posicao, number>> = {
  G: { G: 1, L: 0.35, Z: 0.4, M: 0.35, A: 0.3 },
  L: { G: 0.3, L: 1, Z: 0.9, M: 0.85, A: 0.75 },
  Z: { G: 0.3, L: 0.9, Z: 1, M: 0.82, A: 0.7 },
  M: { G: 0.3, L: 0.85, Z: 0.82, M: 1, A: 0.88 },
  A: { G: 0.3, L: 0.75, Z: 0.7, M: 0.88, A: 1 },
};

/** Características que rendem mais em cada função. */
export const COMPATIVEIS: Record<Posicao, Caracteristica[]> = {
  G: ["REF", "COL", "SAI"],
  L: ["VEL", "CRU", "MAR", "DES", "RES"],
  Z: ["MAR", "DES", "CAB", "RES"],
  M: ["PAS", "ARM", "DRI", "DES", "MAR", "RES"],
  A: ["FIN", "CAB", "VEL", "DRI"],
};

export function fatorPosicao(vaga: Vaga, jogador: Pick<Jogador, "posicao" | "lado">): number {
  let f = FATOR_POSICAO[vaga.pos][jogador.posicao];
  if (vaga.pos === "L" && jogador.posicao === "L" && vaga.lado && vaga.lado !== jogador.lado) f *= 0.95;
  return f;
}

const CURVA_ENERGIA: [number, number][] = [
  [0, 0.4], [20, 0.55], [40, 0.7], [60, 0.85], [80, 0.96], [90, 1], [100, 1],
];

export function fatorEnergia(energia: number): number {
  const e = Math.max(0, Math.min(100, energia));
  for (let i = 1; i < CURVA_ENERGIA.length; i++) {
    const [x1, y1] = CURVA_ENERGIA[i];
    if (e <= x1) {
      const [x0, y0] = CURVA_ENERGIA[i - 1];
      return y0 + ((e - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 1;
}

export function fatorCaracteristicas(jogador: Pick<Jogador, "caracteristicas">, vaga: Vaga, jogadas: Jogadas): number {
  let f = 1;
  for (const c of jogador.caracteristicas) {
    if (COMPATIVEIS[vaga.pos].includes(c)) f += 0.03;
    if (jogadas === "pontas" && (vaga.pos === "L" || vaga.pos === "A") && (c === "CRU" || c === "VEL")) f += 0.02;
    if (jogadas === "meio" && vaga.pos === "M" && (c === "PAS" || c === "ARM" || c === "DRI")) f += 0.02;
  }
  return f;
}

/** Força que o jogador rende naquela vaga, com aquela energia. */
export function forcaEfetiva(jogador: Jogador, vaga: Vaga, energia: number, jogadas: Jogadas): number {
  return jogador.forca * fatorPosicao(vaga, jogador) * fatorEnergia(energia) * fatorCaracteristicas(jogador, vaga, jogadas);
}

/** Cor da força efetiva em relação à força do jogador (para a interface). */
export function corForca(efetiva: number, forca: number): "verde" | "amarelo" | "vermelho" {
  const r = efetiva / Math.max(1, forca);
  if (r >= 0.95) return "verde";
  if (r >= 0.82) return "amarelo";
  return "vermelho";
}

// ---- setores -----------------------------------------------------------------

export interface Setores {
  defesa: number;
  meio: number;
  ataque: number;
  goleiro: number;
}

const PESO_SETOR: Record<keyof Omit<Setores, "goleiro">, Record<Posicao, number>> = {
  defesa: { G: 2.0, Z: 1.0, L: 0.8, M: 0.35, A: 0.1 },
  meio: { G: 0, Z: 0.2, L: 0.5, M: 1.0, A: 0.35 },
  ataque: { G: 0, Z: 0.1, L: 0.35, M: 0.5, A: 1.0 },
};

function pesoAtaque(pos: Posicao, jogadas: Jogadas): number {
  if (jogadas === "pontas" && pos === "L") return 0.6;
  if (jogadas === "pontas" && pos === "M") return 0.4;
  if (jogadas === "meio" && pos === "L") return 0.25;
  if (jogadas === "meio" && pos === "M") return 0.6;
  return PESO_SETOR.ataque[pos];
}

/** Soma dos pesos de um 4-4-2 completo: é a referência "time normal" de cada setor. */
const REFERENCIA = (() => {
  const soma = { defesa: 0, meio: 0, ataque: 0 };
  for (const v of FORMACOES["4-4-2"]) {
    soma.defesa += PESO_SETOR.defesa[v.pos];
    soma.meio += PESO_SETOR.meio[v.pos];
    soma.ataque += PESO_SETOR.ataque[v.pos];
  }
  return soma;
})();

export interface EmCampo {
  jogador: Jogador;
  vaga: Vaga;
  energia: number;
}

/**
 * Força de cada setor. A soma é dividida pela de um 4-4-2 completo, então
 * formações e expulsões mudam o equilíbrio do time de verdade.
 */
export function calcularSetores(emCampo: EmCampo[], jogadas: Jogadas): Setores {
  let defesa = 0, meio = 0, ataque = 0, goleiro = 0;
  for (const { jogador, vaga, energia } of emCampo) {
    const ef = forcaEfetiva(jogador, vaga, energia, jogadas);
    defesa += PESO_SETOR.defesa[vaga.pos] * ef;
    meio += PESO_SETOR.meio[vaga.pos] * ef;
    ataque += pesoAtaque(vaga.pos, jogadas) * ef;
    if (vaga.pos === "G") goleiro = ef;
  }
  return {
    defesa: defesa / REFERENCIA.defesa,
    meio: meio / REFERENCIA.meio,
    ataque: ataque / REFERENCIA.ataque,
    goleiro,
  };
}

// ---- escalação automática ---------------------------------------------------------

export function disponivel(j: Jogador): boolean {
  return j.lesaoDias <= 0 && j.suspensaoJogos <= 0;
}

/**
 * Escolhe os 11 e os 7 reservas. Cada vaga fica com quem rende mais nela,
 * considerando o cansaço (é o que faz o rodízio acontecer).
 */
export function escalarAutomatico(
  elenco: Jogador[],
  formacao: Formacao,
  jogadas: Jogadas,
): { titulares: (number | null)[]; reservas: number[] } {
  const vagas = FORMACOES[formacao];
  const livres = elenco.filter(disponivel);
  const pares: { vaga: number; jogador: Jogador; nota: number }[] = [];
  vagas.forEach((vaga, i) => {
    for (const j of livres) pares.push({ vaga: i, jogador: j, nota: forcaEfetiva(j, vaga, j.energia, jogadas) });
  });
  pares.sort((a, b) => b.nota - a.nota);
  const titulares: (number | null)[] = vagas.map(() => null);
  const usados = new Set<number>();
  for (const p of pares) {
    if (titulares[p.vaga] !== null || usados.has(p.jogador.id)) continue;
    titulares[p.vaga] = p.jogador.id;
    usados.add(p.jogador.id);
  }
  const reservas = escolherReservas(livres.filter((j) => !usados.has(j.id)));
  return { titulares, reservas };
}

/** 7 reservas: um goleiro e os melhores de cada setor, depois os melhores no geral. */
export function escolherReservas(candidatos: Jogador[]): number[] {
  const restantes = [...candidatos].sort((a, b) => b.forca * fatorEnergia(b.energia) - a.forca * fatorEnergia(a.energia));
  const reservas: number[] = [];
  for (const pos of ["G", "Z", "L", "M", "A"] as Posicao[]) {
    const j = restantes.find((x) => x.posicao === pos && !reservas.includes(x.id));
    if (j) reservas.push(j.id);
  }
  for (const j of restantes) {
    if (reservas.length >= 7) break;
    if (!reservas.includes(j.id)) reservas.push(j.id);
  }
  return reservas.slice(0, 7);
}

/** Força média dos 11 melhores (para comparar clubes e definir objetivos). */
export function forcaDoTime(elenco: Jogador[]): number {
  const melhores = [...elenco].sort((a, b) => b.forca - a.forca);
  const g = melhores.find((j) => j.posicao === "G");
  const linha = melhores.filter((j) => j.posicao !== "G").slice(0, 10);
  const onze = g ? [g, ...linha] : melhores.slice(0, 11);
  return onze.reduce((s, j) => s + j.forca, 0) / Math.max(1, onze.length);
}
