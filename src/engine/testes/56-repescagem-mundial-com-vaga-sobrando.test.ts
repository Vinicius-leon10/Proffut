// R155: a repescagem mundial com vaga sobrando. Achado da medição (nov/2026, "o jogo pode travar no 5º ano"): na Copa de
// 2030 o Marrocos é sede (já está na Copa), mas jogou as Eliminatórias da África e foi o melhor segundo; a vaga da África na
// repescagem sobrou, vieram 5 seleções em vez de 6 e a semifinal foi marcada contra "ninguém": em março de 2030 a convocação
// automática quebrava (`paisDaSelecao` com id indefinido) e o jogo parava.
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";
import { confederacao, criarRepescagemMundial, paisDaSelecao } from "../selecoes";

describe("repescagem mundial com vaga sobrando (R155)", () => {
  it("a vaga que sobra fica no mesmo continente (a melhor seleção dele fora da Copa) e todo jogo tem os dois lados", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 41 });
    e.data = "2029-12-01";
    // Como em 2030: Paraguai (Conmebol), Honduras e Haiti (Concacaf), Emirados (Ásia) e Nova Caledônia (Oceania); a da África sobrou.
    const vieram = ["sel-PY", "sel-HN", "sel-HT", "sel-AE", "sel-NC"];
    criarRepescagemMundial(e, 2030, vieram);
    const comp = e.selecoes!.competicoes["S-INT-2030"]!;
    expect(comp.selecoes).toHaveLength(6);
    for (const id of vieram) expect(comp.selecoes).toContain(id);
    const novo = comp.selecoes.find((id) => !vieram.includes(id))!;
    expect(confederacao(paisDaSelecao(novo))).toBe("caf");
    // Jogos de outro ano ficam na agenda das seleções.
    const jogos = [...e.partidas, ...(e.selecoes!.agenda ?? [])].filter((p) => p.serie === "S-INT-2030");
    expect(jogos).toHaveLength(2);
    for (const p of jogos) {
      expect(typeof p.mandante).toBe("string");
      expect(typeof p.visitante).toBe("string");
    }
  }, 60_000);

  it("com duas vagas sobrando (só 4 vieram), completa as duas, cada uma no seu continente", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 42 });
    e.data = "2029-12-01";
    const vieram = ["sel-PY", "sel-HN", "sel-HT", "sel-AE"];
    criarRepescagemMundial(e, 2030, vieram);
    const comp = e.selecoes!.competicoes["S-INT-2030"]!;
    expect(comp.selecoes).toHaveLength(6);
    const novos = comp.selecoes.filter((id) => !vieram.includes(id)).map((id) => confederacao(paisDaSelecao(id))).sort();
    expect(novos).toEqual(["caf", "ofc"]);
    const jogos = [...e.partidas, ...(e.selecoes!.agenda ?? [])].filter((x) => x.serie === "S-INT-2030");
    expect(jogos).toHaveLength(2);
    for (const p of jogos) expect(p.visitante && p.mandante).toBeTruthy();
  }, 60_000);
});
