// R154: venda rápida (leilão). Pedido do usuário (nov/2026): "quando eu botar um jogador à venda, essa venda vai ser rápida,
// então vai ser como se fosse um leilão. Botei jogador à venda, já vai aparecer a proposta instantânea ali daquele jogador
// para algum time, para eu não ficar esperando rodadas... eu vi no Brasfoot que tem esse modo leilão".
import { describe, expect, it } from "vitest";
import { valorMercado } from "../gerador";
import { novoJogo } from "../jogo";
import { elencoDe, leiloar, propostasPendentes, responderProposta, tirarDaVenda } from "../mercado";

describe("venda rápida: leilão (R154)", () => {
  it("pôr à venda faz o leilão na hora: o maior lance vira uma proposta que já está valendo, sem esperar nenhum dia", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 31 });
    const dia = e.data;
    const j = elencoDe(e, "ponte-preta").filter((x) => x.posicao === "M").sort((a, b) => b.forca - a.forca)[2];
    expect(propostasPendentes(e).some((m) => m.proposta!.jogadorId === j.id)).toBe(false);
    const r = leiloar(e, j.id);
    expect(r.ok).toBe(true);
    expect(r.texto).toContain(`${j.nome} foi colocado à venda`);
    expect(e.data).toBe(dia);
    expect(j.aVenda).toBe(true);
    const propostas = propostasPendentes(e).filter((m) => m.proposta!.jogadorId === j.id);
    expect(propostas).toHaveLength(1);
    const p = propostas[0].proposta!;
    expect(p.clubeId).not.toBe("ponte-preta");
    expect(p.valor).toBeGreaterThanOrEqual(valorMercado(j) * 0.75);
    expect(p.valor).toBeLessThanOrEqual(valorMercado(j) * 1.2);
    expect(e.clubes[p.clubeId].caixa).toBeGreaterThanOrEqual(p.valor);
    expect(propostas[0].texto).toMatch(/[Ll]eilão/);
    // Pôr à venda de novo não faz outro leilão enquanto a proposta vale.
    leiloar(e, j.id);
    expect(propostasPendentes(e).filter((m) => m.proposta!.jogadorId === j.id)).toHaveLength(1);
    // Aceitar vende na hora.
    const caixa = e.clubes["ponte-preta"].caixa;
    expect(responderProposta(e, propostas[0].id, true).ok).toBe(true);
    expect(j.clubeId).toBe(p.clubeId);
    expect(e.clubes["ponte-preta"].caixa).toBe(caixa + p.valor);
  }, 60_000);

  it("recusou e pôs à venda de novo no mesmo dia: o leilão dá o mesmo lance (não dá para sortear até sair um melhor)", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 32 });
    const j = elencoDe(e, "ponte-preta").filter((x) => x.posicao === "A").sort((a, b) => b.forca - a.forca)[1];
    leiloar(e, j.id);
    const primeira = propostasPendentes(e).find((m) => m.proposta!.jogadorId === j.id)!;
    const { clubeId, valor } = primeira.proposta!;
    responderProposta(e, primeira.id, false);
    j.aVenda = false;
    leiloar(e, j.id);
    const segunda = propostasPendentes(e).find((m) => m.proposta!.jogadorId === j.id)!;
    expect(segunda.proposta).toMatchObject({ clubeId, valor });
  }, 60_000);

  it("emprestado ou de outro clube não vai a leilão", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 33 });
    const deFora = elencoDe(e, "flamengo")[0];
    expect(leiloar(e, deFora.id).ok).toBe(false);
    const meu = elencoDe(e, "ponte-preta")[5];
    meu.emprestimo = { de: "flamengo", ate: e.temporada };
    expect(leiloar(e, meu.id).ok).toBe(false);
    expect(propostasPendentes(e)).toHaveLength(0);
  }, 60_000);

  it("tirar da venda cancela o lance do leilão (o jogador sai de Meus à venda); a proposta que chegou sem leilão fica", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 34 });
    const [a, b] = elencoDe(e, "ponte-preta").filter((x) => x.posicao === "M").sort((x, y) => y.forca - x.forca);
    leiloar(e, a.id);
    const lance = propostasPendentes(e).find((m) => m.proposta!.jogadorId === a.id)!;
    expect(lance.proposta!.leilao).toBe(true);
    tirarDaVenda(e, a.id);
    expect(a.aVenda).toBe(false);
    expect(lance.proposta!.resolvida).toBe("retirada");
    expect(propostasPendentes(e).some((m) => m.proposta!.jogadorId === a.id)).toBe(false);
    // Proposta de sempre (sem leilão), por quem nem estava à venda: tirar da venda não mexe nela.
    e.mensagens.unshift({ id: 9999, data: e.data, tipo: "proposta", lida: false, titulo: "Proposta", texto: "",
      proposta: { jogadorId: b.id, clubeId: "flamengo", valor: 1_000_000, validaAte: "2026-12-31" } });
    tirarDaVenda(e, b.id);
    expect(e.mensagens[0].proposta!.resolvida).toBeUndefined();
  }, 60_000);
});
