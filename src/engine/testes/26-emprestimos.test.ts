// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { contratosTerminando, renovarContrato } from "../contratos";
import { emprestar, interessadosNoEmprestimo, motivoParaNaoEmprestar, motivoParaNaoPegar, pegarEmprestado, taxaDeEmprestimo } from "../emprestimos";
import { folhaSalarial } from "../financas";
import { forcaDoTime } from "../forca";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { dispensar, elencoDe, fazerOferta, transferenciasDaIa } from "../mercado";


describe("empréstimos", () => {
  /** Jogo da Ponte Preta com a temporada inteira jogada (só falta a virada). */
  const fimDaTemporada = (semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente });
    estado.config.escalacaoAutomatica = true;
    simularRestoDaTemporada(estado);
    return estado;
  };

  it("emprestar: só jogador meu, fora do último ano de contrato, sem deixar a posição abaixo do mínimo, para um clube que o quer", () => {
    const estado = fimDaTemporada(41);
    const meus = elencoDe(estado, "ponte-preta");
    const ultimo = meus.find((j) => j.contratoAte === 2026)!;
    expect(motivoParaNaoEmprestar(estado, ultimo)).toMatch(/último ano/);
    expect(motivoParaNaoEmprestar(estado, elencoDe(estado, "flamengo")[0])).toMatch(/não é do seu clube/);
    const j = meus.filter((x) => x.contratoAte! > 2026 && !motivoParaNaoEmprestar(estado, x)).find((x) => interessadosNoEmprestimo(estado, x).length)!;
    const clubes = interessadosNoEmprestimo(estado, j);
    expect(clubes.length).toBeGreaterThan(0);
    for (const id of clubes) {
      expect(id).not.toBe("ponte-preta");
      expect(estado.clubes[id].serie).not.toBe("D");
      expect(j.forca).toBeGreaterThanOrEqual(forcaDoTime(elencoDe(estado, id)) - 8 - (j.idade <= 21 ? 6 : 0));
    }
    expect(emprestar(estado, j.id, "ponte-preta").ok, "só para quem quer").toBe(false);
    const folhaAntes = folhaSalarial(estado, clubes[0]);
    expect(emprestar(estado, j.id, clubes[0])).toMatchObject({ ok: true });
    expect(j).toMatchObject({ clubeId: clubes[0], emprestimo: { de: "ponte-preta", ate: 2026 } });
    expect(folhaSalarial(estado, clubes[0]), "quem recebe paga o salário").toBe(folhaAntes + j.salario);
    expect(estado.clubes["ponte-preta"].escalacao.titulares).not.toContain(j.id);
    // Emprestado, ninguém compra, nem o clube que o recebeu o vende.
    expect(fazerOferta(estado, j.id, 99_000_000).ok).toBe(false);
    transferenciasDaIa(estado, "teste-emprestimo");
    expect(j.clubeId).toBe(clubes[0]);
  });

  it("pegar emprestado: só reserva de outro clube, com caixa para a taxa, que vai para o dono; emprestado não se vende, dispensa nem renova", () => {
    const estado = fimDaTemporada(42);
    const meu = estado.clubes["ponte-preta"];
    const flamengo = estado.clubes.flamengo;
    const titular = elencoDe(estado, "flamengo").find((j) => flamengo.escalacao.titulares.includes(j.id))!;
    expect(motivoParaNaoPegar(estado, titular)).toMatch(/titular/);
    const reserva = elencoDe(estado, "flamengo").find((j) => !flamengo.escalacao.titulares.includes(j.id) && !motivoParaNaoPegar(estado, j))!;
    const taxa = taxaDeEmprestimo(reserva);
    expect(taxa).toBeGreaterThan(0);
    const [caixaMeu, caixaDono] = [meu.caixa, flamengo.caixa];
    expect(pegarEmprestado(estado, reserva.id)).toMatchObject({ ok: true });
    expect(reserva).toMatchObject({ clubeId: "ponte-preta", emprestimo: { de: "flamengo", ate: 2026 } });
    expect(meu.caixa).toBe(caixaMeu - taxa);
    expect(flamengo.caixa).toBe(caixaDono + taxa);
    expect(dispensar(estado, reserva.id).ok).toBe(false);
    reserva.contratoAte = 2026;
    expect(renovarContrato(estado, reserva.id, 1).ok).toBe(false);
    expect(contratosTerminando(estado)).not.toContain(reserva);
    // Sem caixa, não dá.
    const outro = elencoDe(estado, "palmeiras").find((j) => !estado.clubes.palmeiras.escalacao.titulares.includes(j.id) && taxaDeEmprestimo(j) > 0)!;
    meu.caixa = 0;
    expect(motivoParaNaoPegar(estado, outro)).toMatch(/caixa/);
  });

  it("na virada, os emprestados voltam aos clubes donos e a mensagem conta", () => {
    const estado = fimDaTemporada(43);
    const meus = elencoDe(estado, "ponte-preta");
    const vai = meus.filter((x) => !motivoParaNaoEmprestar(estado, x)).find((x) => interessadosNoEmprestimo(estado, x).length)!;
    emprestar(estado, vai.id, interessadosNoEmprestimo(estado, vai)[0]);
    const vem = elencoDe(estado, "flamengo").find((j) => !motivoParaNaoPegar(estado, j))!;
    pegarEmprestado(estado, vem.id);
    avancar(estado);
    expect(estado.temporada).toBe(2027);
    expect(vai.clubeId).toBe("ponte-preta");
    expect(vem.clubeId).toBe("flamengo");
    expect(vai.emprestimo).toBeUndefined();
    expect(vem.emprestimo).toBeUndefined();
    const m = estado.mensagens.find((x) => x.titulo === "Fim dos empréstimos")!;
    expect(m.texto).toContain(vai.nome);
    expect(m.texto).toContain(vem.nome);
  });
});
