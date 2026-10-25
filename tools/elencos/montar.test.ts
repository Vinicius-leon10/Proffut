import { describe, expect, it } from "vitest";
import { Buscador, estimarNascimento, inferirPosicoes, type JogoDoClube, type NaSumula, type Pessoa, type Pos } from "./montar";

const pessoa = (nomes: string[], clube: string, nascimento: string, extra: Partial<Pessoa> = {}): Pessoa => ({ nomes, clube, nascimento, fonte: "Transfermarkt", ...extra });

describe("busca do jogador nas outras fontes", () => {
  const buscador = new Buscador([
    pessoa(["Guillermo Varela"], "flamengo", "1993-03-24", { posicao: "L", lado: "D" }),
    pessoa(["Gabriel Silva"], "bahia", "2001-01-01"),
    pessoa(["Gabriel Silva"], "bahia", "1999-05-05"),
    pessoa(["Pedro"], "flamengo", "1997-06-20"),
    pessoa(["Pedro Guilherme Abreu dos Santos"], "fora:y", "1997-06-20", { fonte: "Wikidata" }),
  ]);

  it("acha pelo nome contido no nome completo quando o clube confere", () => {
    const [achado] = buscador.achar({ apelido: "Varela", nomeCompleto: "Guillermo Varela Olivera", nomeCortado: false, clubes: new Set(["flamengo"]) });
    expect(achado?.nascimento).toBe("1993-03-24");
    // Só duas palavras e clube diferente: pouco para ter certeza.
    expect(buscador.achar({ apelido: "Varela", nomeCompleto: "Guillermo Varela Olivera", nomeCortado: false, clubes: new Set(["vasco"]) })).toEqual([]);
  });

  it("não escolhe entre pessoas diferentes com o mesmo nome", () => {
    expect(buscador.achar({ apelido: "Gabriel Silva", nomeCompleto: "Gabriel Henrique Silva", nomeCortado: false, clubes: new Set(["bahia"]) })).toEqual([]);
  });

  it("junta a mesma pessoa vinda de duas fontes", () => {
    const achados = buscador.achar({ apelido: "Pedro", nomeCompleto: "Pedro Guilherme Abreu dos Santos", nomeCortado: false, clubes: new Set(["flamengo"]) });
    expect(achados.map((p) => p.fonte)).toEqual(["Transfermarkt", "Wikidata"]);
  });
});

describe("idade pelo número de registro na CBF", () => {
  it("número maior, jogador mais novo", () => {
    const conhecidos = Array.from({ length: 400 }, (_, i) => ({ cbf: String(100000 + i * 1000), nascimento: `${1985 + Math.floor(i / 20)}-06-15` }));
    const { estimar, erroTipico } = estimarNascimento(conhecidos);
    expect(estimar("101000")!).toBeLessThan(1987);
    expect(estimar("495000")!).toBeGreaterThan(2002);
    expect(erroTipico).toBeLessThan(1.5);
  });
});

describe("posição deduzida das escalações", () => {
  it("quem completa a formação ganha a posição que falta", () => {
    // Um clube em 12 jogos: goleiro, 2 zagueiros, 4 meias, 2 atacantes e 1 lateral conhecidos; "x" sempre titular.
    const conhecidas = new Map<string, Pos>([["g", "G"], ["z1", "Z"], ["z2", "Z"], ["m1", "M"], ["m2", "M"], ["m3", "M"], ["m4", "M"], ["a1", "A"], ["a2", "A"], ["l1", "L"]]);
    const titulares = ["g", "z1", "z2", "m1", "m2", "m3", "m4", "a1", "a2", "l1", "x"];
    const numeros: Record<string, number> = { g: 1, z1: 3, z2: 4, m1: 5, m2: 8, m3: 10, m4: 20, a1: 9, a2: 11, l1: 2, x: 16 };
    const jogos: JogoDoClube[] = Array.from({ length: 12 }, (_, i) => ({
      clube: "c", ano: 2025, data: `2025-05-${String(i + 1).padStart(2, "0")}`, trocas: [],
      escalados: titulares.map((cbf) => ({ cbf, numero: numeros[cbf], titular: true })),
    }));
    const jogadores = new Map<string, NaSumula>(titulares.map((cbf) => [cbf, {
      cbf, apelidos: new Map([[cbf, 12]]), nomeCompleto: cbf, nomeCortado: false, goleiro: cbf === "g",
      aparicoes: jogos.map((j) => ({ clube: "c", ano: 2025, data: j.data, titular: true, entrou: false, saiu: false, gols: 0, numero: numeros[cbf] })),
    }]));
    expect(inferirPosicoes(jogos, jogadores, conhecidas).posicoes.get("x")).toBe("L");
  });
});
