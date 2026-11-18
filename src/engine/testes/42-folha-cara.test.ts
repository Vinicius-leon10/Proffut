// R138: time pequeno não pode montar um elenco caro de graça (pedido do usuário, nov/2026: "eu consegui contratar muito
// jogador a nível acima no livre, subi para a Série B e meu caixa tá muito alto"; ele escolheu encargos, luvas e o limite
// da diretoria).
import { describe, expect, it } from "vitest";
import { ENCARGOS_FOLHA, LUVAS_MESES } from "../constantes";
import { folhaSalarial, limiteDaFolha, processarMes } from "../financas";
import { novoJogo } from "../jogo";
import { fazerOferta, livres } from "../mercado";

describe("folha cara (R138)", () => {
  it("encargos: o clube do usuário paga a folha com os encargos; os clubes do computador, não", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    const outro = estado.clubes["ponte-preta"];
    const folha = folhaSalarial(estado, meu.id);
    processarMes(estado, estado.data);
    const encargos = meu.extrato.find((l) => l.descricao.startsWith("Encargos"));
    expect(encargos?.valor).toBe(-Math.round(folha * ENCARGOS_FOLHA));
    expect(outro.extrato.some((l) => l.descricao.startsWith("Encargos"))).toBe(false);
  });

  it("luvas: o livre cobra meses de salário para assinar, e sem caixa para elas não assina", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    const melhor = livres(estado).sort((a, b) => b.forca - a.forca)[0];
    const antes = meu.caixa;
    const r = fazerOferta(estado, melhor.id, 0);
    expect(r.ok).toBe(true);
    expect(r.texto).toMatch(/luvas/i);
    expect(meu.caixa).toBe(antes - melhor.salario * LUVAS_MESES);

    const outro = livres(estado).sort((a, b) => b.forca - a.forca)[0];
    meu.caixa = 1000;
    const sem = fazerOferta(estado, outro.id, 0);
    expect(sem.ok).toBe(false);
    expect(outro.clubeId).toBeNull();
  });

  it("limite da diretoria: um time da Série C traz um ou dois livres bons e depois a diretoria não aprova mais", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    meu.caixa = 50_000_000; // dinheiro de sobra: quem barra é a diretoria, não o caixa
    const limite = limiteDaFolha(estado, meu);
    expect(folhaSalarial(estado, meu.id) * (1 + ENCARGOS_FOLHA)).toBeLessThan(limite);
    let assinados = 0;
    let barrado = "";
    for (let i = 0; i < 10 && !barrado; i++) {
      const melhor = livres(estado).sort((a, b) => b.forca - a.forca)[0];
      const r = fazerOferta(estado, melhor.id, 0);
      if (r.ok) assinados++;
      else barrado = r.texto;
    }
    expect(assinados).toBeGreaterThanOrEqual(1);
    expect(assinados).toBeLessThanOrEqual(3);
    expect(barrado).toMatch(/diretoria não aprova/);
    expect(folhaSalarial(estado, meu.id) * (1 + ENCARGOS_FOLHA)).toBeLessThanOrEqual(limite);
  });

  it("clube grande (folha acima da receita do mês) ainda contrata: a diretoria aprova até 10% acima da folha de quando o técnico chegou", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    const meu = estado.clubes.flamengo;
    const folha = folhaSalarial(estado, meu.id) * (1 + ENCARGOS_FOLHA);
    expect(limiteDaFolha(estado, meu)).toBeGreaterThanOrEqual(Math.round(folha * 1.1) - 1);
    const livre = livres(estado).sort((a, b) => b.forca - a.forca)[0];
    expect(fazerOferta(estado, livre.id, 0).ok).toBe(true);
  });

  it("limite da diretoria vale também para comprar de outro clube", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "confianca", semente: 7 });
    const meu = estado.clubes.confianca;
    meu.caixa = 500_000_000;
    // Um craque da Série A: o salário dele sozinho passa do que a diretoria do Confiança aprova.
    const craque = Object.values(estado.jogadores).filter((j) => j.clubeId === "flamengo").sort((a, b) => b.salario - a.salario)[0];
    const r = fazerOferta(estado, craque.id, 400_000_000);
    expect(r.ok).toBe(false);
    expect(r.texto).toMatch(/diretoria não aprova/);
    expect(craque.clubeId).toBe("flamengo");
  });
});
