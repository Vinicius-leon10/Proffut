// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { CLUBES_FEMININOS, comArtigo } from "../artigos";
import { desfechoDoConfronto, situacaoNaCopa } from "../copa";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { elencoDe, pedirMais } from "../mercado";
import { enviarMensagem } from "../mensagens";
import type { Partida } from "../tipos";


describe("artigo dos clubes", () => {
  it("Chapecoense, Ponte Preta e os outros clubes que se diz \"a\" ganham \"a\"; o resto, \"o\"", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 51 });
    // Nenhum id da lista escrito errado: todos são clubes do jogo.
    for (const id of CLUBES_FEMININOS) expect(e.clubes[id], id).toBeDefined();
    const ponte = e.clubes["ponte-preta"];
    expect(comArtigo("O", ponte)).toBe("A Ponte Preta");
    expect(comArtigo("do", ponte)).toBe("da Ponte Preta");
    expect(comArtigo("ao", ponte)).toBe("à Ponte Preta");
    expect(comArtigo("pelo", ponte)).toBe("pela Ponte Preta");
    expect(comArtigo("O", e.clubes.flamengo)).toBe("O Flamengo");
    expect(comArtigo("do", e.clubes.flamengo)).toBe("do Flamengo");
    expect(e.mensagens.some((m) => m.titulo === "Bem-vindo à Ponte Preta!")).toBe(true);
  });

  it("mercado: proposta da Chapecoense", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 52 });
    const j = elencoDe(e, "flamengo").filter((x) => x.posicao === "M").at(-1)!;
    enviarMensagem(e, { tipo: "proposta", titulo: `Proposta por ${j.nome}`, texto: "", proposta: { jogadorId: j.id, clubeId: "chapecoense", valor: 1_000_000, validaAte: "2026-12-31" } });
    expect(pedirMais(e, e.mensagens[0].id, 1_050_000).texto).toBe(`A Chapecoense aceitou pagar R$ 1.050.000. ${j.nome} foi vendido.`);
  });

  it("Copa: frases com \"a\" e fase no plural (nas oitavas de final)", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 53 });
    const jogo = (fase: string, extra: Partial<Partida> = {}): Partida => ({
      id: `teste-${fase}`, serie: "CB", fase, chave: 1, rodada: 1, data: "2026-09-02",
      mandante: "ponte-preta", visitante: "flamengo", jogada: true, gm: 0, gv: 1, eventos: [], ...extra,
    });
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta entra na 3ª fase.");
    e.partidas.push(jogo("oitavas", { jogada: false }));
    e.copa!.fase = "oitavas";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta está nas oitavas de final.");
    e.copa!.fase = "quartas";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta foi eliminada nas oitavas de final.");
    e.copa!.vice = "ponte-preta";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta foi vice-campeã.");
    e.copa!.campeao = "ponte-preta";
    expect(situacaoNaCopa(e, "ponte-preta")).toBe("A Ponte Preta é a campeã da Copa do Brasil!");

    const fase4 = jogo("fase4");
    e.partidas.push(fase4);
    expect(desfechoDoConfronto(e, fase4, "ponte-preta")).toBe("A Ponte Preta está fora da Copa do Brasil.");
    const final = jogo("final", { gm: 2, gv: 1, neutro: true });
    e.partidas.push(final);
    expect(desfechoDoConfronto(e, final, "ponte-preta")).toBe("A Ponte Preta é campeã da Copa do Brasil!");
    expect(desfechoDoConfronto(e, final, "flamengo")).toBe("O Flamengo fica com o vice.");
  });

  it("uma temporada inteira com a Ponte Preta: nenhuma mensagem diz \"o Ponte Preta\"", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 54 });
    e.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(e);
    avancar(e);
    const textos = e.mensagens.flatMap((m) => [m.titulo, m.texto]).join("\n");
    expect(textos).toContain("Ponte Preta");
    expect(textos).not.toMatch(/\b(o|do|ao|pelo|no) Ponte Preta/i);
    expect(textos).not.toMatch(/Ponte Preta (foi|é) (o )?(eliminado|rebaixado|campeão|vice-campeão)/);
  });
});
