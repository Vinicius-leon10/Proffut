// R142: jogadores e contratos viram por ciclo (etapa 2b do plano das temporadas reais, docs/PLANO_TEMPORADAS_REAIS.md; pedido
// do usuário, nov/2026: "Faça tudo", sobre as etapas do plano; decidido: "Idade dos jogadores: todos em 1º de janeiro").
// Clubes do ciclo "ano" (Brasil, América do Sul...) viram em 31 de dezembro; os de agosto a maio (Europa...), em 30 de junho
// (a virada acontece em 1º de julho): evolução, aposentadoria, contratos, empréstimos e base. A idade sobe uma vez por ano
// para todos, na virada de dezembro.
import { describe, expect, it } from "vitest";
import { temporadaDoClube, ultimoAno } from "../contratos";
import { avancar, novoJogo, simularDia } from "../jogo";
import { elencoDe } from "../mercado";
import type { EstadoJogo } from "../tipos";

function avancarAte(estado: EstadoJogo, ate: string) {
  for (let i = 0; i < 3000 && estado.data < ate; i++) {
    const r = avancar(estado);
    if (r.tipo === "jogos-hoje") simularDia(estado);
    else if (r.tipo === "nada") break;
  }
}

describe("jogadores e contratos por ciclo (R142)", () => {
  it("a temporada de cada clube: ano civil no Brasil, 2026 = 2026/27 na Europa (até 30 de junho)", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    estado.data = "2027-03-10";
    estado.temporada = 2027;
    expect(temporadaDoClube(estado, "flamengo")).toBe(2027);
    const europeu = Object.values(estado.clubes).find((c) => c.liga === "EN")!;
    expect(temporadaDoClube(estado, europeu.id)).toBe(2026);
    estado.data = "2027-07-02";
    expect(temporadaDoClube(estado, europeu.id)).toBe(2027);
    expect(temporadaDoClube(estado, null)).toBe(2027);
  });

  it("contrato até 2026 na Europa só é o último ano até 30 de junho de 2027 (não em janeiro de 2027)", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    const europeu = Object.values(estado.clubes).find((c) => c.liga === "EN")!;
    const j = elencoDe(estado, europeu.id)[0];
    j.contratoAte = 2027;
    estado.data = "2027-02-01";
    estado.temporada = 2027;
    // Contrato até 2027 = até junho de 2028: ainda não é o último ano.
    expect(ultimoAno(estado, j)).toBe(false);
    j.contratoAte = 2026;
    expect(ultimoAno(estado, j)).toBe(true);
  });

  it("uma temporada: a idade sobe uma vez só (31/12), a Europa evolui em 1º de julho e o contrato dela acaba em junho", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    estado.config.escalacaoAutomatica = true;
    const europeu = Object.values(estado.clubes).find((c) => c.liga === "EN")!;
    const brasileiro = estado.clubes.palmeiras;
    const eu = elencoDe(estado, europeu.id).filter((j) => j.idade >= 20 && j.idade <= 30);
    const br = elencoDe(estado, brasileiro.id).filter((j) => j.idade >= 20 && j.idade <= 30);
    const idadeEu = new Map(eu.map((j) => [j.id, j.idade]));
    const idadeBr = new Map(br.map((j) => [j.id, j.idade]));
    // Contrato que acaba em junho de 2027 (2026 no ciclo agosto) e um que acaba em dezembro de 2026 (Brasil).
    const acabaEu = eu[0];
    acabaEu.contratoAte = 2026;
    const acabaBr = br[0];
    acabaBr.contratoAte = 2026;
    avancarAte(estado, "2027-01-02");
    expect(estado.temporada).toBe(2027);
    // Idade: +1 para todos na virada de dezembro (inclusive a Europa).
    for (const j of eu) if (estado.jogadores[j.id]) expect(estado.jogadores[j.id].idade, `eu ${j.id}`).toBe(idadeEu.get(j.id)! + 1);
    // Brasil: contrato acabou em dezembro (o clube do computador renovou).
    expect(estado.jogadores[acabaBr.id]?.contratoAte).toBeGreaterThan(2026);
    // Europa: o contrato de 2026 vale até junho de 2027: ainda não renovou nem saiu.
    expect(estado.jogadores[acabaEu.id]?.contratoAte).toBe(2026);
    const forcaEuAntes = new Map(eu.map((j) => [j.id, estado.jogadores[j.id]?.forca]));
    avancarAte(estado, "2027-07-02");
    // Em julho: renovou (clube do computador) e a evolução aconteceu; a idade não subiu de novo.
    expect(estado.jogadores[acabaEu.id]?.contratoAte).toBeGreaterThan(2026);
    for (const j of eu) {
      const atual = estado.jogadores[j.id];
      if (atual) expect(atual.idade, `idade julho ${j.id}`).toBe(idadeEu.get(j.id)! + 1);
    }
    expect(eu.some((j) => estado.jogadores[j.id] && estado.jogadores[j.id].forca !== forcaEuAntes.get(j.id))).toBe(true);
    // Brasil não evolui duas vezes: a idade continua a de janeiro.
    for (const j of br) if (estado.jogadores[j.id]) expect(estado.jogadores[j.id].idade, `br ${j.id}`).toBe(idadeBr.get(j.id)! + 1);
  }, 900_000);
});
