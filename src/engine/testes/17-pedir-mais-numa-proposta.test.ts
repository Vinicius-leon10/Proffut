// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { elencoDe, limiteDaProposta, pedirMais } from "../mercado";
import { enviarMensagem } from "../mensagens";

describe("pedir mais numa proposta recebida", () => {
  function preparar() {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 11 });
    const j = elencoDe(estado, "ponte-preta").filter((x) => x.posicao === "M").at(-1)!;
    enviarMensagem(estado, { tipo: "proposta", titulo: `Proposta por ${j.nome}`, texto: "", proposta: { jogadorId: j.id, clubeId: "flamengo", valor: 1_000_000, validaAte: "2026-12-31" } });
    return { estado, j, m: estado.mensagens[0] };
  }
  const passo = (v: number) => Math.floor(v / 10_000) * 10_000;

  it("até 5% a mais o clube sempre aceita e paga o valor pedido", () => {
    const { estado, j, m } = preparar();
    const caixa = estado.clubes["ponte-preta"].caixa;
    expect(pedirMais(estado, m.id, 1_050_000).ok).toBe(true);
    expect(j.clubeId).toBe("flamengo");
    expect(estado.clubes["ponte-preta"].caixa).toBe(caixa + 1_050_000);
    expect(m.proposta!.resolvida).toBe("aceita");
  });

  it("acima do limite o clube melhora a oferta uma vez; insistir acima do limite faz ele desistir", () => {
    const { estado, j, m } = preparar();
    const limite = limiteDaProposta(estado, m);
    expect(limite).toBeGreaterThanOrEqual(1_050_000);
    pedirMais(estado, m.id, passo(limite * 1.2));
    expect(m.proposta!.resolvida).toBeUndefined();
    expect(m.proposta!.valor).toBeGreaterThan(1_000_000);
    expect(m.proposta!.valor).toBeLessThanOrEqual(limite);
    expect(m.texto).toContain("subiu a oferta");
    pedirMais(estado, m.id, passo(limite) + 20_000);
    expect(m.proposta!.resolvida).toBe("retirada");
    expect(j.clubeId).toBe("ponte-preta");
  });

  it("na segunda vez, um pedido dentro do limite fecha a venda", () => {
    const { estado, j, m } = preparar();
    const limite = limiteDaProposta(estado, m);
    pedirMais(estado, m.id, passo(limite * 1.2));
    expect(pedirMais(estado, m.id, passo(limite)).ok).toBe(true);
    expect(j.clubeId).toBe("flamengo");
    expect(m.proposta!.valor).toBe(passo(limite));
  });

  it("pedir demais faz o clube desistir na hora, e pedir menos que a oferta não vale", () => {
    const { estado, j, m } = preparar();
    expect(pedirMais(estado, m.id, 900_000).ok).toBe(false);
    expect(m.proposta!.resolvida).toBeUndefined();
    pedirMais(estado, m.id, 5_000_000);
    expect(m.proposta!.resolvida).toBe("retirada");
    expect(j.clubeId).toBe("ponte-preta");
  });
});
