// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { criarRng } from "../rng";

describe("evolução dos jovens (R127)", () => {
  it("um jovem de 18 anos e força 70 que joga sempre não vira craque mundial em 5 temporadas", async () => {
    // Pedido do usuário: "um jogador comprou só jovens e em 5 anos eles estavam entre os melhores do mundo".
    const { evoluir } = await import("../temporada");
    const finais: number[] = [];
    for (let k = 0; k < 400; k++) {
      const rng = criarRng(1000 + k);
      const j = { forca: 70, potencial: 95, idade: 18, temporada: { jogos: 30 } } as unknown as Parameters<typeof evoluir>[1];
      for (let t = 0; t < 5; t++) evoluir(rng, j);
      finais.push(j.forca);
    }
    const media = finais.reduce((s, f) => s + f, 0) / finais.length;
    expect(media).toBeGreaterThan(76); // ainda evolui bem
    expect(media).toBeLessThan(83);
    expect(finais.filter((f) => f >= 88).length / finais.length).toBeLessThan(0.05);
  });

  it("quem joga pouco evolui menos, e o veterano cai", async () => {
    const { evoluir } = await import("../temporada");
    const media = (idade: number, jogos: number) => {
      let soma = 0;
      for (let k = 0; k < 400; k++) {
        const j = { forca: 70, potencial: 90, idade, temporada: { jogos } } as unknown as Parameters<typeof evoluir>[1];
        evoluir(criarRng(k), j);
        soma += j.forca - 70;
      }
      return soma / 400;
    };
    expect(media(19, 30)).toBeGreaterThan(media(19, 0));
    expect(media(34, 30)).toBeLessThan(0);
  });
});
