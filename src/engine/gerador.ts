import { MINIMO_POSICAO } from "./constantes";
import type { Rng } from "./rng";
import type { Caracteristica, Clube, Jogador, Lado, Posicao, SerieClube } from "./tipos";
import { NACIONALIDADES_ESTRANGEIRAS, gerarNome } from "./nomes";

/** Características possíveis por posição, com peso de sorteio. */
const CARACTERISTICAS_POSICAO: Record<Posicao, [Caracteristica, number][]> = {
  G: [["REF", 4], ["COL", 4], ["SAI", 3], ["PEN", 2]],
  L: [["VEL", 4], ["CRU", 4], ["MAR", 3], ["DES", 2], ["RES", 2], ["PAS", 1], ["DRI", 1]],
  Z: [["MAR", 4], ["DES", 4], ["CAB", 4], ["RES", 2], ["PAS", 1], ["VEL", 1]],
  M: [["PAS", 4], ["ARM", 3], ["DRI", 3], ["DES", 3], ["MAR", 2], ["RES", 2], ["FIN", 2], ["VEL", 1], ["CRU", 1]],
  A: [["FIN", 5], ["CAB", 3], ["VEL", 3], ["DRI", 3], ["ARM", 1], ["RES", 1]],
};

/**
 * Molde do elenco: posição, lado e papel. O papel define a faixa de força
 * dentro do intervalo do clube (titular perto do topo, jovem perto da base).
 */
type Papel = "titular" | "reserva" | "jovem";
const MOLDE: [Posicao, Lado | null, Papel][] = [
  ["G", null, "titular"], ["G", null, "reserva"], ["G", null, "jovem"],
  ["L", "D", "titular"], ["L", "E", "titular"], ["L", "D", "reserva"], ["L", "E", "jovem"],
  ["Z", null, "titular"], ["Z", null, "titular"], ["Z", null, "reserva"], ["Z", null, "reserva"], ["Z", null, "jovem"],
  ["M", null, "titular"], ["M", null, "titular"], ["M", null, "titular"], ["M", null, "titular"],
  ["M", null, "reserva"], ["M", null, "reserva"], ["M", null, "reserva"], ["M", null, "jovem"], ["M", null, "jovem"],
  ["A", null, "titular"], ["A", null, "titular"], ["A", null, "reserva"], ["A", null, "reserva"], ["A", null, "jovem"],
];

const FAIXA_PAPEL: Record<Papel, [number, number]> = {
  titular: [0.6, 1.0],
  reserva: [0.25, 0.65],
  jovem: [0.0, 0.35],
};

const IDADE_PAPEL: Record<Papel, [number, number]> = {
  titular: [22, 32],
  reserva: [20, 34],
  jovem: [17, 21],
};

const ESTRANGEIROS_POR_SERIE: Record<SerieClube, number> = { A: 0.12, B: 0.05, C: 0.02, D: 0.01 };

export function limitar(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

/** Salário mensal de mercado para uma força (cresce exponencialmente). */
export function salarioBase(forca: number): number {
  const bruto = 4000 * Math.exp(0.11 * (forca - 40));
  return Math.max(1500, Math.round(bruto / 500) * 500);
}

function fatorIdadeValor(idade: number): number {
  if (idade <= 21) return 1.4;
  if (idade <= 25) return 1.3;
  if (idade <= 29) return 1.0;
  if (idade <= 32) return 0.6;
  return 0.3;
}

/** Valor de mercado (R$), derivado do salário de mercado, da idade e do potencial. */
export function valorMercado(j: Pick<Jogador, "forca" | "idade" | "potencial">): number {
  const potencial = j.idade <= 23 ? 1 + Math.max(0, j.potencial - j.forca) / 40 : 1;
  const bruto = salarioBase(j.forca) * 12 * 4 * fatorIdadeValor(j.idade) * potencial;
  const passo = bruto > 10_000_000 ? 500_000 : bruto > 1_000_000 ? 50_000 : 5_000;
  return Math.max(passo, Math.round(bruto / passo) * passo);
}

function sortearCaracteristicas(rng: Rng, posicao: Posicao, forca: number): Caracteristica[] {
  const quantidade = forca >= 72 ? 2 : forca >= 50 ? (rng.chance(0.6) ? 2 : 1) : rng.chance(0.6) ? 1 : 0;
  const opcoes = [...CARACTERISTICAS_POSICAO[posicao]];
  const escolhidas: Caracteristica[] = [];
  while (escolhidas.length < quantidade && opcoes.length) {
    const item = rng.escolherPeso(opcoes, ([, peso]) => peso);
    escolhidas.push(item[0]);
    opcoes.splice(opcoes.indexOf(item), 1);
  }
  return escolhidas;
}

function estatisticasZeradas() {
  return { jogos: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 };
}

export interface OpcoesJogador {
  id: number;
  posicao: Posicao;
  lado?: Lado;
  forca: number;
  idade: number;
  potencial?: number;
  nacionalidade?: string;
  clubeId: string | null;
}

export function criarJogador(rng: Rng, o: OpcoesJogador): Jogador {
  const nacionalidade = o.nacionalidade ?? "BRA";
  const forca = Math.round(limitar(o.forca, 1, 99));
  const margem = o.idade <= 20 ? rng.int(5, 25) : o.idade <= 23 ? rng.int(2, 15) : o.idade <= 27 ? rng.int(0, 5) : 0;
  return {
    id: o.id,
    nome: gerarNome(rng, nacionalidade),
    nacionalidade,
    posicao: o.posicao,
    lado: o.lado ?? (rng.chance(0.5) ? "D" : "E"),
    idade: o.idade,
    forca,
    potencial: Math.round(limitar(o.potencial ?? forca + margem, forca, 99)),
    caracteristicas: sortearCaracteristicas(rng, o.posicao, forca),
    energia: 100,
    clubeId: o.clubeId,
    salario: Math.round(salarioBase(forca) * (o.idade <= 20 ? 0.6 : 1)),
    lesaoDias: 0,
    suspensaoJogos: 0,
    amarelosAcumulados: 0,
    aVenda: false,
    temporada: estatisticasZeradas(),
    carreira: estatisticasZeradas(),
  };
}

/** Os titulares e um reserva por posição (16): elenco de quem só entra em campo na Copa do Brasil. */
const MOLDE_COPA = MOLDE.filter(([posicao, , papel], i) => papel === "titular" || (papel === "reserva" && MOLDE.findIndex(([p, , q]) => p === posicao && q === "reserva") === i));

/** Gera o elenco inteiro de um clube (26 jogadores) dentro da faixa de força dele. */
export function gerarElenco(rng: Rng, clube: Pick<Clube, "id" | "serie" | "forcaElenco">, proximoId: () => number, molde = MOLDE): Jogador[] {
  const { min, max } = clube.forcaElenco;
  const pEstrangeiro = ESTRANGEIROS_POR_SERIE[clube.serie];
  const nomes = new Set<string>();
  return molde.map(([posicao, lado, papel]) => {
    const [q0, q1] = FAIXA_PAPEL[papel];
    const [i0, i1] = IDADE_PAPEL[papel];
    const forca = min + (max - min) * rng.real(q0, q1);
    const idade = rng.int(i0, i1);
    const nacionalidade = papel !== "jovem" && rng.chance(pEstrangeiro) ? rng.escolher(NACIONALIDADES_ESTRANGEIRAS) : "BRA";
    let jogador = criarJogador(rng, { id: proximoId(), posicao, lado: lado ?? undefined, forca, idade, nacionalidade, clubeId: clube.id });
    for (let tentativa = 0; tentativa < 5 && nomes.has(jogador.nome); tentativa++) {
      jogador = { ...jogador, nome: gerarNome(rng, nacionalidade) };
    }
    nomes.add(jogador.nome);
    return jogador;
  });
}

/** Elenco enxuto (16 jogadores) para um clube da Série D que joga a Copa do Brasil. */
export function gerarElencoCopa(rng: Rng, clube: Pick<Clube, "id" | "serie" | "forcaElenco">, proximoId: () => number): Jogador[] {
  return gerarElenco(rng, clube, proximoId, MOLDE_COPA);
}

/** Jogador de verdade, como está em data/brasil-2026/jogadores.json (força calculada pelo Proffut). */
export interface JogadorReal {
  nome: string;
  posicao: Posicao;
  lado: Lado;
  idade: number;
  forca: number;
  nacionalidade?: string;
}

/**
 * Elenco real do clube. Posição com menos gente que o mínimo para jogar (um a mais que o mínimo do
 * mercado) ganha reservas gerados.
 */
export function elencoReal(rng: Rng, clube: Pick<Clube, "id" | "forcaElenco">, reais: JogadorReal[], proximoId: () => number): Jogador[] {
  const elenco = reais.map((r) => ({
    ...criarJogador(rng, { id: proximoId(), posicao: r.posicao, lado: r.lado, forca: r.forca, idade: r.idade, nacionalidade: r.nacionalidade, clubeId: clube.id }),
    nome: r.nome,
  }));
  const { min, max } = clube.forcaElenco;
  const [q0, q1] = FAIXA_PAPEL.reserva;
  const [i0, i1] = IDADE_PAPEL.reserva;
  for (const posicao of Object.keys(MINIMO_POSICAO) as Posicao[]) {
    while (elenco.filter((j) => j.posicao === posicao).length < MINIMO_POSICAO[posicao] + 1) {
      elenco.push(criarJogador(rng, { id: proximoId(), posicao, forca: min + (max - min) * rng.real(q0, q1), idade: rng.int(i0, i1), clubeId: clube.id }));
    }
  }
  return elenco;
}

/** Jovem da base: 16 a 18 anos, força baixa e potencial ligado ao porte do clube. */
export function gerarJovem(rng: Rng, clube: Pick<Clube, "id" | "forcaElenco">, posicao: Posicao, id: number): Jogador {
  const { min, max } = clube.forcaElenco;
  const forca = rng.int(Math.max(20, min - 14), Math.max(25, min + 2));
  const potencial = limitar(rng.int(min, max + 6), forca + 5, 95);
  return criarJogador(rng, { id, posicao, forca, idade: rng.int(16, 18), potencial, clubeId: clube.id });
}

/** Jogador sem clube, para o mercado de livres. */
export function gerarLivre(rng: Rng, id: number, forcaMin: number, forcaMax: number): Jogador {
  const posicao = rng.escolherPeso<Posicao>(["G", "L", "Z", "M", "A"], (p) => ({ G: 1, L: 2, Z: 2, M: 3, A: 2 })[p]);
  return criarJogador(rng, { id, posicao, forca: rng.int(forcaMin, forcaMax), idade: rng.int(19, 34), clubeId: null });
}
