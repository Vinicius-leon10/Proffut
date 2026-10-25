import { describe, expect, it } from "vitest";
import { formatarNome, lerJogador, lerSubstituicao, separarApelido } from "./sumulas";

// Linhas reais das súmulas da CBF de 2025 (texto extraído pelo projeto BrazilianFootball/data).
describe("linhas de jogadores da súmula", () => {
  it("lê número, apelido, nome completo, titular, goleiro e código", () => {
    expect(lerJogador("12Fabian Volpi Fabian Harry Volpi T(g)P421193")).toEqual({
      numero: 12, apelido: "Fabian Volpi", nomeCompleto: "Fabian Harry Volpi", titular: true, goleiro: true, cbf: "421193",
    });
    expect(lerJogador("16Marquinhos Marcos Andre de Mene ... RP608577")).toMatchObject({
      numero: 16, apelido: "Marquinhos", nomeCompleto: "Marcos André de Mene", titular: false, goleiro: false,
    });
    expect(lerJogador("Relação de Jogadores")).toBeNull();
  });

  it("separa apelido e nome completo", () => {
    const casos: [string, string, string][] = [
      ["Rayan Rayan Rodrigues Ribeiro", "Rayan", "Rayan Rodrigues Ribeiro"],
      ["Claudinho Claudio de Souza", "Claudinho", "Claudio de Souza"],
      ["Fernandinho Luiz Fernando Pereir ...", "Fernandinho", "Luiz Fernando Pereir"],
      ["Junior Fialho Jânio Fialho de Aqui ...", "Junior Fialho", "Jânio Fialho de Aqui"],
      ["Leo Pereira Leonardo Pereira dos ...", "Leo Pereira", "Leonardo Pereira dos"],
      ["Rafael Silva Rafael Aparecido da Silva", "Rafael Silva", "Rafael Aparecido da Silva"],
      ["Grafite Lucas Jose Santos de ...", "Grafite", "Lucas Jose Santos de"],
      ["André Jr. André Cardoso da Sil ...", "André Jr.", "André Cardoso da Sil"],
    ];
    for (const [meio, apelido, nomeCompleto] of casos) expect(separarApelido(meio), meio).toEqual({ apelido, nomeCompleto });
  });

  it("completa apelido cortado pela coluna da súmula", () => {
    const apelido = (meio: string) => separarApelido(meio).apelido;
    expect(apelido("Paulo Henr ... Paulo Henrique Gianezini")).toBe("Paulo Henrique");
    expect(apelido("LAUTARO BE ... Lautaro José Belleggia")).toBe("LAUTARO Belleggia");
    expect(apelido("Renan dos  ... Renan dos Santos")).toBe("Renan dos Santos");
    expect(apelido("Márcio Jun ... Marcio de Vasconcelo ...")).toBe("Márcio Júnior");
    expect(apelido("Cristian O ... Cristian Gonzalo Oli ...")).toBe("Cristian O.");
    expect(apelido("Guilherme  ... Guilherme de Queiroz ...")).toBe("Guilherme");
  });

  it("arruma maiúsculas e acentos que a CBF omite", () => {
    expect(formatarNome("JOAO VITOR")).toBe("João Vitor");
    expect(formatarNome("LAUTARO Belleggia")).toBe("Lautaro Belleggia");
    expect(formatarNome("pedro")).toBe("Pedro");
    expect(formatarNome("Marcos Andre De Souza")).toBe("Marcos André de Souza");
    expect(formatarNome("André Jr.")).toBe("André Jr.");
  });

  it("lê quem entra e quem sai numa substituição", () => {
    expect(lerSubstituicao("41:00 1TRetrô/PE 16 - Marcos Andre de Menezes Diniz 22 - Samuel Salustiano de Jesus S...")).toEqual({ entra: 16, sai: 22 });
    expect(lerSubstituicao("12:00 2TTombense/MG 13 - Leonardo Pereira dos Santos 2 - Julio Henrique de Lacerda de...")).toEqual({ entra: 13, sai: 2 });
  });
});
