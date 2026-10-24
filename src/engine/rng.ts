// Gerador de números aleatórios com semente.
// Cada sorteio do jogo usa um gerador próprio, derivado da semente do save e de
// uma chave ("partida/A-12-3", "mercado/2026-05-02"...). Assim recarregar o jogo
// repete os mesmos resultados, e duas carreiras diferentes não ficam iguais.

export interface Rng {
  /** Número em [0, 1). */
  (): number;
  int(min: number, max: number): number;
  real(min: number, max: number): number;
  chance(p: number): boolean;
  escolher<T>(lista: readonly T[]): T;
  escolherPeso<T>(lista: readonly T[], peso: (item: T) => number): T;
  embaralhar<T>(lista: T[]): T[];
  normal(media: number, desvio: number): number;
}

/** Hash de texto para 32 bits (cyrb53 reduzido). */
export function hashTexto(texto: string, semente = 0): number {
  let h1 = 0xdeadbeef ^ semente;
  let h2 = 0x41c6ce57 ^ semente;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

export function criarRng(semente: number): Rng {
  let a = semente >>> 0;
  const proximo = (() => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;

  proximo.int = (min, max) => min + Math.floor(proximo() * (max - min + 1));
  proximo.real = (min, max) => min + proximo() * (max - min);
  proximo.chance = (p) => proximo() < p;
  proximo.escolher = (lista) => lista[Math.floor(proximo() * lista.length)];
  proximo.escolherPeso = (lista, peso) => {
    let total = 0;
    for (const item of lista) total += Math.max(0, peso(item));
    if (total <= 0) return proximo.escolher(lista);
    let r = proximo() * total;
    for (const item of lista) {
      r -= Math.max(0, peso(item));
      if (r < 0) return item;
    }
    return lista[lista.length - 1];
  };
  proximo.embaralhar = (lista) => {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(proximo() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  };
  proximo.normal = (media, desvio) => {
    const u = 1 - proximo();
    const v = proximo();
    return media + desvio * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return proximo;
}

/** Gerador derivado da semente do save + uma chave que descreve o sorteio. */
export function rngPara(semente: number, chave: string): Rng {
  return criarRng(hashTexto(chave, semente));
}
