// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { nomeDaLigaDoClube, posicaoNaLiga, tabelaDoClube } from "../competicoes";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { competicoesDoUsuario } from "../torneios";


describe("rebaixado para a Série D", () => {
  it("o técnico treina qualquer clube: rebaixado para a D, continua no clube, com objetivo do grupo; sem a confiança da diretoria, é demitido como em qualquer série", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "itabaiana", semente: 11 });
    estado.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(estado);
    const C = estado.series.C;
    if (!C.rebaixados.includes("itabaiana")) C.rebaixados[0] = "itabaiana";
    delete estado.tecnico.demissao;
    const demitido = structuredClone(estado);
    estado.tecnico.confiancaDiretoria = 80;
    avancar(estado);
    expect(estado.clubes.itabaiana.serie).toBe("D");
    expect(estado.tecnico.clubeId).toBe("itabaiana");
    expect(estado.tecnico.demissao).toBeUndefined();
    expect(estado.objetivo.descricao).toMatch(/grupo/);
    expect(estado.torneios?.D?.clubes).toContain("itabaiana");
    // Com a diretoria sem paciência e o objetivo não cumprido, a demissão vale também para quem cai para a D.
    demitido.tecnico.confiancaDiretoria = 10;
    demitido.historico = [];
    const cumpriu = posicaoNaLiga(demitido, "itabaiana") <= demitido.objetivo.posicaoAlvo;
    avancar(demitido);
    if (!cumpriu) expect(demitido.tecnico.demissao).toBeTruthy();
  });

  it("clube de fora do Brasil: objetivo pela força entre os clubes da liga e tabela do painel na liga dele", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "boca-juniors", semente: 12 });
    expect(estado.objetivo.posicaoAlvo).toBeLessThanOrEqual(3);
    expect(tabelaDoClube(estado, "boca-juniors").length).toBe(estado.torneios!["L-AR"]!.clubes.length);
    expect(nomeDaLigaDoClube(estado, estado.clubes["boca-juniors"])).toBe("Campeonato Argentino");
    expect(competicoesDoUsuario(estado).has("L-AR")).toBe(true);
    // Os jogos dele têm a simulação completa (é a liga dele).
    simularRestoDaTemporada(estado);
    const meus = estado.partidas.filter((p) => p.serie === "L-AR" && (p.mandante === "boca-juniors" || p.visitante === "boca-juniors"));
    expect(meus.flatMap((p) => p.eventos).some((e) => e.tipo === "amarelo")).toBe(true);
    expect(posicaoNaLiga(estado, "boca-juniors")).toBeGreaterThan(0);
  });
});
