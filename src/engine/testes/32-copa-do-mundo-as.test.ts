// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularDia } from "../jogo";
import { checarEstado } from "../checagem";
import { confederacao, paisDaSelecao, forcaDaSelecao, nacionalidadeDoPais } from "../selecoes";

describe("Copa do Mundo (nov/2026): as seleções da África, Ásia e Oceania e a Copa de 48", () => {
  it("jogo novo: 217 seleções (as 111 novas com 23 ou mais convocados da nacionalidade delas); a Copa de 2026 com as 42 classificadas de verdade e as repescagens de março (Europa: 8 semifinais; mundial: 2 semifinais em campo neutro)", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 81 });
    const selecoes = Object.values(e.clubes).filter((c) => c.serie === "selecao");
    expect(selecoes).toHaveLength(217);
    const novas = selecoes.filter((c) => ["caf", "afc", "ofc"].includes(confederacao(c.pais!)));
    expect(novas).toHaveLength(111);
    expect(e.clubes["sel-MA"].nome).toBe("Marrocos");
    expect(e.clubes["sel-JP"].nome).toBe("Japão");
    for (const s of novas) {
      const convocados = e.selecoes!.convocados[s.id].map((id) => e.jogadores[id]);
      expect(convocados.length, s.nome).toBeGreaterThanOrEqual(23);
      for (const j of convocados) expect(j.nacionalidade, `${j.nome} (${s.nome})`).toBe(nacionalidadeDoPais(s.pais!));
    }
    expect(forcaDaSelecao(e, "sel-JP")).toBeGreaterThan(forcaDaSelecao(e, "sel-AS") + 25);
    // O Japão chama o Takefusa Kubo, da Real Sociedad (clube do jogo): é o mesmo jogador, não uma cópia jogando fora.
    const kubo = Object.values(e.jogadores).filter((j) => j.nome === "Takefusa Kubo");
    expect(kubo).toHaveLength(1);
    expect(kubo[0].clubeId).toBe("real-sociedad-esp");
    expect(e.selecoes!.convocados["sel-JP"]).toContain(kubo[0].id);
    const copa = e.selecoes!.competicoes["S-COPA-2026"]!;
    expect(copa.fase).toBe("aguardando");
    expect(copa.selecoes).toHaveLength(42);
    expect(copa.selecoes).toContain("sel-BR");
    expect(copa.selecoes).not.toContain("sel-IT");
    const europa = e.partidas.filter((p) => p.serie === "S-ELI-UEFA-2026");
    expect(europa).toHaveLength(8);
    expect(europa.every((p) => p.data === "2026-03-26")).toBe(true);
    const mundial = e.partidas.filter((p) => p.serie === "S-INT-2026");
    expect(mundial.map((p) => `${p.mandante} x ${p.visitante}`).sort()).toEqual(["sel-BO x sel-SR", "sel-NC x sel-JM"]);
    expect(mundial.every((p) => p.neutro)).toBe(true);
    // Quem joga a repescagem não tem amistoso em março.
    const naRepescagem = new Set([...europa, ...mundial].flatMap((p) => [p.mandante, p.visitante]).concat(["sel-CD", "sel-IQ"]));
    expect(e.partidas.filter((p) => p.serie === "S-AMI" && p.data.startsWith("2026-03") && (naRepescagem.has(p.mandante) || naRepescagem.has(p.visitante)))).toEqual([]);
    expect(checarEstado(e).filter((p) => p.gravidade === "erro")).toEqual([]);
  });

  it("a Copa de 2026 se joga: em abril as 48 estão definidas (12 grupos de 4, as sedes nos grupos A, B e C, no máximo 2 da Europa por grupo); em julho há campeão, depois de 16 avos, oitavas, quartas, semifinal e final", { timeout: 300_000 }, () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 82 });
    const jogarAte = (data: string) => {
      for (let i = 0; i < 3000 && e.data < data; i++) {
        const r = avancar(e);
        if (r.tipo === "jogos-hoje") simularDia(e);
        else if (r.tipo === "nada") break;
      }
    };
    jogarAte("2026-04-05");
    const copa = e.selecoes!.competicoes["S-COPA-2026"]!;
    expect(copa.fase).toBe("grupos");
    expect(new Set(copa.selecoes).size).toBe(48);
    expect(copa.grupos!.grupos).toHaveLength(12);
    expect(copa.grupos!.grupos.every((g) => g.length === 4)).toBe(true);
    expect(copa.grupos!.grupos.slice(0, 3).map((g) => g[0])).toEqual(["sel-US", "sel-MX", "sel-CA"]);
    for (const g of copa.grupos!.grupos) {
      expect(g.filter((id) => confederacao(paisDaSelecao(id)) === "uefa").length).toBeLessThanOrEqual(2);
      for (const c of ["conmebol", "caf", "afc"]) expect(g.filter((id) => confederacao(paisDaSelecao(id)) === c).length, c).toBeLessThanOrEqual(1);
    }
    // As 4 da repescagem da Europa e as 2 da mundial entraram.
    expect(copa.selecoes.filter((id) => ["sel-IT", "sel-XN", "sel-XW", "sel-BA", "sel-UA", "sel-SE", "sel-PL", "sel-AL", "sel-TR", "sel-RO", "sel-SK", "sel-XK", "sel-DK", "sel-MK", "sel-CZ", "sel-IE"].includes(id))).toHaveLength(4);
    expect(copa.selecoes.filter((id) => ["sel-CD", "sel-IQ", "sel-NC", "sel-JM", "sel-BO", "sel-SR"].includes(id))).toHaveLength(2);
    jogarAte("2026-07-21");
    expect(copa.fase).toBe("encerrada");
    expect(copa.selecoes).toContain(copa.campeao);
    expect(copa.vice).not.toBe(copa.campeao);
    const jogos = e.partidas.filter((p) => p.serie === "S-COPA-2026");
    expect(jogos.filter((p) => p.fase === "grupos")).toHaveLength(72);
    expect(["dezesseis", "oitavas", "quartas", "semi", "final"].map((f) => jogos.filter((p) => p.fase === f).length)).toEqual([16, 8, 4, 2, 1]);
    expect(jogos.every((p) => p.jogada)).toBe(true);
    expect(jogos.filter((p) => p.data >= "2026-06-11" && p.data <= "2026-07-19")).toHaveLength(103);
  });
});
