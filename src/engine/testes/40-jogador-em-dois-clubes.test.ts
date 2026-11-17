// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { PAISES } from "../torneios";


describe("jogador em dois clubes (R130)", () => {
  it("ninguém aparece em dois clubes nas listas (mesmo nome de duas palavras ou mais e mesma idade)", async () => {
    // Pedido do usuário: "Então resolva o 1 e 2" (o 2: "o Riyad Mahrez aparece em dois clubes ao mesmo tempo").
    const { readFileSync, readdirSync } = await import("node:fs");
    const vistos = new Map<string, string>();
    const idades = new Map<string, { idade: number; clube: string }[]>();
    const repetidos: string[] = [];
    // Mesma nacionalidade também (a da lista ou a do país do clube): o "Lucas González" do Paraguai e o da Argentina são dois.
    // Duas listas atuais do Transfermarkt com o mesmo nome são duas pessoas (o "Luiz Felipe" do Decisão e o de outro clube).
    const daSerie = new Set<string>([
      ...JSON.parse(readFileSync("data/brasil-2026/clubes.json", "utf8")).clubes.map((c: { id: string }) => c.id),
      ...JSON.parse(readFileSync("data/brasil-2026/serie-d-reserva.json", "utf8")).clubes.map((c: { id: string }) => c.id),
    ]);
    const atual = (arq: string, clube: string) =>
      ["europa-2026/jogadores.json", "europa-2026/jogadores-outros.json", "asia-2026/jogadores.json"].includes(arq) || (arq === "brasil-2026/jogadores.json" && daSerie.has(clube));
    const atuais = new Set<string>();
    const paisDoClube = new Map<string, string>();
    for (const pasta of readdirSync("data").filter((x) => !x.includes("."))) for (const arq of readdirSync(`data/${pasta}`).filter((a) => /^clubes.*\.json$/.test(a))) {
      for (const c of JSON.parse(readFileSync(`data/${pasta}/${arq}`, "utf8")).clubes ?? []) if (c.pais) paisDoClube.set(c.id, c.pais);
    }
    for (const pasta of readdirSync("data").filter((x) => !x.includes("."))) {
      for (const arq of readdirSync(`data/${pasta}`).filter((a) => /^jogadores.*\.json$/.test(a))) {
        const elencos = JSON.parse(readFileSync(`data/${pasta}/${arq}`, "utf8")).elencos as Record<string, { nome: string; idade: number; nacionalidade?: string }[]>;
        for (const [clube, js] of Object.entries(elencos)) {
          for (const j of js) {
            if (!j.nome.includes(" ")) continue;
            // A idade pode vir de fontes diferentes (estimada numa, exata noutra): até 1 ano de diferença é a mesma pessoa.
            const pais = paisDoClube.get(clube);
            const nac = j.nacionalidade ?? (pais ? PAISES[pais]?.nacionalidade ?? pais : "BRA");
            const chave = `${j.nome}|${nac}`;
            const outros = idades.get(chave) ?? [];
            if (atual(`${pasta}/${arq}`, clube)) atuais.add(clube);
            for (const o of outros) {
              if (o.clube === clube || Math.abs(o.idade - j.idade) > 1 || (atuais.has(o.clube) && atuais.has(clube))) continue;
              repetidos.push(`${j.nome} (${o.clube} e ${clube})`);
            }
            idades.set(chave, [...outros, { idade: j.idade, clube }]);
            vistos.set(j.nome, clube);
          }
        }
      }
    }
    expect(repetidos.slice(0, 10)).toEqual([]);
    expect(vistos.get("Riyad Mahrez")).toBe("al-ahli");
  });

  it("no save começado, a cópia que sobrou sai ao abrir (fora do clube do usuário)", async () => {
    const { tirarRepetidos } = await import("../jogo");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 43 });
    // Num jogo novo não sai ninguém (nem quem o jogo criou com o nome de um jogador de verdade).
    const total = Object.keys(estado.jogadores).length;
    tirarRepetidos(estado);
    expect(Object.keys(estado.jogadores).length).toBe(total);
    const mahrez = Object.values(estado.jogadores).find((j) => j.nome === "Riyad Mahrez")!;
    // Como no save antigo: uma segunda cópia no Al-Shamal, que a lista não tem mais.
    const copia = { ...structuredClone(mahrez), id: estado.proximoIdJogador++, clubeId: "al-shamal", idade: mahrez.idade + 1 };
    estado.jogadores[copia.id] = copia;
    // E um jogador do clube do usuário com o mesmo nome de um de outro clube fica.
    const meu = Object.values(estado.jogadores).find((j) => j.clubeId === "vasco")!;
    const xara = { ...structuredClone(meu), id: estado.proximoIdJogador++, clubeId: "al-shamal" };
    estado.jogadores[xara.id] = xara;
    tirarRepetidos(estado);
    expect(estado.jogadores[copia.id]).toBeUndefined();
    expect(estado.jogadores[mahrez.id].clubeId).toBe("al-ahli");
    expect(estado.jogadores[meu.id]).toBeDefined();
    const antes = Object.keys(estado.jogadores).length;
    tirarRepetidos(estado);
    expect(Object.keys(estado.jogadores).length).toBe(antes);
  });
});
