// R144: o jogo começa na pré-temporada do clube escolhido, com o mundo já simulado até lá (etapa 3 do plano das temporadas
// reais, docs/PLANO_TEMPORADAS_REAIS.md; pedido do usuário, nov/2026: "quando eu escolher o europeu, o jogo vai gerar lá com
// a pré-temporada e com a opção de pular para o início da temporada... já vai gerar uma simulação de todas as outras
// temporadas que começaram no início do ano até aquela data"; decidido: a pré-simulação roda na criação do jogo, com
// "Preparando o mundo…" e barra de progresso).
import { describe, expect, it } from "vitest";
import { avancar, dataDeInicioDoClube, emPreTemporada, jogosPendentesHoje, novoJogo, preSimularMundo } from "../jogo";
import { competicoesDoUsuario } from "../torneios";

describe("pré-temporada e pré-simulação do mundo (R144)", () => {
  it("o dia em que o jogo começa vem do país do clube: Brasil 3/jan, Europa 20/jul (depois da Copa do Mundo de 2026), Austrália 1º/set", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    expect(dataDeInicioDoClube(estado.clubes.flamengo)).toBe("2026-01-03");
    const ingles = Object.values(estado.clubes).find((c) => c.liga === "EN")!;
    expect(dataDeInicioDoClube(ingles)).toBe("2026-07-20");
    const australiano = Object.values(estado.clubes).find((c) => c.liga === "AU")!;
    expect(dataDeInicioDoClube(australiano)).toBe("2026-09-01");
  });

  it("clube europeu: o mundo é simulado até 20 de julho; o clube dele não gasta nem recebe nada; o Avançar pula a pré-temporada", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "real-madrid", semente: 7 });
    const meu = estado.clubes["real-madrid"];
    const caixa = meu.caixa;
    const extrato = meu.extrato.length;
    const confianca = estado.tecnico.confiancaDiretoria;
    const mensagens = estado.mensagens.length;
    expect(estado.data < "2026-01-10").toBe(true);
    const progresso: number[] = [];
    for (const p of preSimularMundo(estado, "2026-07-20")) progresso.push(p);
    // A barra anda sempre para a frente e chega ao fim.
    expect(progresso.length).toBeGreaterThan(5);
    for (let i = 1; i < progresso.length; i++) expect(progresso[i]).toBeGreaterThanOrEqual(progresso[i - 1]);
    expect(progresso.at(-1)).toBe(1);
    expect(estado.data).toBe("2026-07-20");
    expect(estado.tecnico.desde).toBe("2026-07-20");
    // O mundo andou: Série A, estaduais, Copa do Brasil e Libertadores têm jogos de janeiro a junho.
    for (const serie of ["A", "B", "C", "CB", "K-LIB"]) expect(estado.partidas.some((p) => p.serie === serie && p.jogada && p.data < "2026-07-01"), serie).toBe(true);
    expect(estado.partidas.some((p) => p.jogada && p.data >= "2026-07-20")).toBe(false);
    // A Copa do Mundo de 2026 (11 de junho a 19 de julho) já foi jogada: o painel do clube não vira a tela da Copa.
    expect(estado.partidas.filter((p) => p.serie.startsWith("S-COPA") && p.fase === "final").every((p) => p.jogada)).toBe(true);
    // O clube do usuário não pagou salários, não recebeu nem perdeu confiança, e não chegaram mensagens da pré-simulação.
    // (As copas da UEFA de 2026 ainda vão de janeiro a maio: se ele jogou, foi com a escalação automática e não conta.)
    expect(meu.caixa).toBe(caixa);
    expect(estado.tecnico.confiancaDiretoria).toBe(confianca);
    expect(meu.extrato.length).toBe(extrato);
    expect(estado.mensagens.length).toBe(mensagens);
    // A virada de 30 de junho dos clubes de agosto a maio já aconteceu (evoluíram em 1º de julho).
    expect(Object.values(estado.jogadores).some((j) => j.evoluiuEm === "2026-07-01")).toBe(true);
    // Pré-temporada: o jogo ainda não começou para ele, e o Avançar leva à abertura (sem parar nas rodadas do Brasil).
    expect(emPreTemporada(estado)).toBe(true);
    const r = avancar(estado);
    expect(r.tipo).toBe("jogos-hoje");
    // Parou num dia de jogo de uma competição dele (não nas rodadas da Série A, que ele não acompanha), depois de 1º de julho.
    expect(estado.data > "2026-07-01").toBe(true);
    expect(jogosPendentesHoje(estado).some((p) => competicoesDoUsuario(estado).has(p.serie))).toBe(true);
    expect(competicoesDoUsuario(estado).has("A")).toBe(false);
  }, 600_000);

  it("clube brasileiro: começa em 3 de janeiro, sem pré-simulação, na pré-temporada", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    expect(emPreTemporada(estado)).toBe(true);
    expect(Array.from(preSimularMundo(estado, dataDeInicioDoClube(estado.clubes.flamengo)))).toEqual([]);
    expect(estado.partidas.some((p) => p.jogada)).toBe(false);
  });
});
