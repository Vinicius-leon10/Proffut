// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { anosMaximos, avisarContratos, contratosTerminando, pedidoDeRenovacao, renovarContrato } from "../contratos";
import { avancar, novoJogo, simularRestoDaTemporada } from "../jogo";
import { dispensar, elencoDe, fazerOferta, livres } from "../mercado";
import { exportarTexto, importarTexto } from "../../save/salvamento";


describe("contratos", () => {
  it("no jogo novo, quem está num clube tem contrato até 2026–2029 (os mais velhos, menos); livres não têm", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 31 });
    // Os elencos da Série D montados só para a Copa saem na virada: não precisam de contrato. Quem joga fora dos clubes do
    // jogo (ligado à seleção) também não tem contrato no jogo.
    const comClube = Object.values(estado.jogadores).filter((j) => j.clubeId && estado.clubes[j.clubeId].serie !== "D" && !j.clubeFora);
    for (const j of Object.values(estado.jogadores)) if (j.clubeFora) expect(j.contratoAte, j.nome).toBeUndefined();
    const fins = new Set<number>();
    for (const j of comClube) {
      expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2026);
      expect(j.contratoAte! - 2026, j.nome).toBeLessThanOrEqual(anosMaximos(j.idade));
      fins.add(j.contratoAte!);
    }
    expect([...fins].sort()).toEqual([2026, 2027, 2028, 2029]);
    // Mais ou menos um quarto termina na primeira temporada.
    const naPrimeira = comClube.filter((j) => j.contratoAte === 2026).length / comClube.length;
    expect(naPrimeira).toBeGreaterThan(0.15);
    expect(naPrimeira).toBeLessThan(0.4);
    for (const j of livres(estado)) expect(j.contratoAte).toBeUndefined();
  });

  it("um save de antes dos contratos ganha contratos ao abrir, nenhum terminando na temporada em andamento", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 32 });
    for (const j of Object.values(estado.jogadores)) delete j.contratoAte;
    const aberto = importarTexto(exportarTexto(estado));
    for (const j of Object.values(aberto.jogadores)) {
      if (j.clubeId && !j.clubeFora) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
      else expect(j.contratoAte).toBeUndefined();
    }
  });

  it("renovar só no último ano: ele pede pelo menos o que ganha (até 29 anos), os anos dependem da idade e o salário muda", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 33 });
    const meus = elencoDe(estado, "ponte-preta");
    const longe = meus.find((j) => j.contratoAte! > 2026)!;
    expect(renovarContrato(estado, longe.id, 1).ok, "ainda não é o último ano").toBe(false);
    const jovem = meus.find((j) => j.contratoAte === 2026 && j.idade <= 29)!;
    const pedido = pedidoDeRenovacao(estado, jovem);
    expect(pedido).toBeGreaterThanOrEqual(jovem.salario);
    expect(pedidoDeRenovacao(estado, jovem), "o mesmo pedido na mesma temporada").toBe(pedido);
    expect(renovarContrato(estado, jovem.id, 4).ok, "no máximo 3 anos").toBe(false);
    expect(renovarContrato(estado, jovem.id, 3)).toMatchObject({ ok: true });
    expect(jovem).toMatchObject({ contratoAte: 2029, salario: pedido });
    expect(contratosTerminando(estado)).not.toContain(jovem);
    expect(anosMaximos(31)).toBe(2);
    expect(anosMaximos(34)).toBe(1);
    // De outro clube não se renova.
    const outro = elencoDe(estado, "flamengo").find((j) => j.contratoAte === 2026)!;
    expect(renovarContrato(estado, outro.id, 1).ok).toBe(false);
  });

  it("reforço ganha contrato novo e quem é dispensado fica sem contrato", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 34 });
    const livre = livres(estado).find((j) => j.idade <= 29)!;
    expect(fazerOferta(estado, livre.id, 0).ok).toBe(true);
    expect(livre.contratoAte).toBe(2026 + 3);
    expect(dispensar(estado, livre.id).ok).toBe(true);
    expect(livre.contratoAte).toBeUndefined();
  });

  it("em setembro chega a lista dos contratos terminando; na virada, quem não renovou sai de graça e não volta, e os outros clubes renovam", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 35 });
    estado.config.escalacaoAutomatica = true;
    avisarContratos(estado, "2026-09-01");
    const aviso = estado.mensagens.find((m) => m.titulo === "Contratos terminando")!;
    const terminando = contratosTerminando(estado).filter((j) => j.idade <= 32);
    expect(terminando.length).toBeGreaterThanOrEqual(2);
    for (const j of terminando) expect(aviso.texto).toContain(j.nome);
    simularRestoDaTemporada(estado);
    const [fica, sai] = terminando;
    renovarContrato(estado, fica.id, 2);
    const salarioDoContrato = fica.salario;
    const deOutros = Object.values(estado.jogadores).filter((j) => j.clubeId && j.clubeId !== "ponte-preta" && !estado.clubes[j.clubeId].elencoDaCopa && j.contratoAte === 2026);
    avancar(estado);
    expect(estado.temporada).toBe(2027);
    expect(fica.clubeId).toBe("ponte-preta");
    expect(fica.salario, "no clube do usuário vale o salário do contrato").toBe(salarioDoContrato);
    expect(estado.jogadores[sai.id]?.clubeId ?? null, "saiu de graça e não volta").not.toBe("ponte-preta");
    expect(estado.mensagens.find((m) => m.titulo === "Fim de contrato")!.texto).toContain(sai.nome);
    for (const j of deOutros) if (estado.jogadores[j.id]?.clubeId) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
    for (const j of elencoDe(estado, "ponte-preta")) expect(j.contratoAte, j.nome).toBeGreaterThanOrEqual(2027);
  });
});
