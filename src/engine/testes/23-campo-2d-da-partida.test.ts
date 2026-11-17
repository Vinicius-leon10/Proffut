// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, prepararJogos } from "../jogo";
import { avancarMinuto, simularAteOFim } from "../partida";


describe("campo 2D da partida", () => {
  const jogoDoFlamengo = (semente: number, forca?: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    if (forca) for (const j of Object.values(estado.jogadores)) if (j.clubeId === "flamengo") j.forca = forca;
    avancar(estado);
    const vivas = prepararJogos(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    return { estado, vivas, pv, lado: (pv.lados[0].clubeId === "flamengo" ? 0 : 1) as 0 | 1 };
  };

  it("só a partida do usuário tem o campo, e ele não muda placar, lances nem estatísticas", () => {
    const com = jogoDoFlamengo(5);
    expect(com.vivas.filter((v) => v.campo).map((v) => v.partidaId)).toEqual([com.pv.partidaId]);
    const sem = jogoDoFlamengo(5);
    sem.pv.campo = undefined;
    simularAteOFim(com.pv, com.estado.jogadores);
    simularAteOFim(sem.pv, sem.estado.jogadores);
    expect(sem.pv.narracao).toEqual(com.pv.narracao);
    expect(sem.pv.lados.map((l) => l.gols)).toEqual(com.pv.lados.map((l) => l.gols));
    expect(sem.pv.estatisticas!.lados).toEqual(com.pv.estatisticas!.lados);
  });

  it("a cada minuto um lance novo: a bola sai de onde parou, fica no campo e segue a narração do minuto", () => {
    const vistos = new Set<string>();
    for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { estado, pv } = jogoDoFlamengo(semente);
      let anterior = pv.campo!.lance;
      expect(anterior).toMatchObject({ n: 0, acao: "inicio", caminho: [[50, 50]] });
      while (!pv.terminada) {
        const eventos = avancarMinuto(pv, estado.jogadores);
        const lance = pv.campo!.lance;
        vistos.add(lance.acao);
        expect(lance.n).toBe(anterior.n + 1);
        expect(lance.caminho[0], "a bola continua de onde parou").toEqual(anterior.caminho[anterior.caminho.length - 1]);
        for (const [x, y] of lance.caminho) for (const v of [x, y]) expect(v >= 0 && v <= 100, `ponto fora do campo: ${x}, ${y}`).toBe(true);
        // A sombra do time com a bola vai do gol dele até onde a bola está (no mínimo o meio-campo).
        const [bx] = lance.caminho[lance.caminho.length - 1];
        if (lance.lado === 0) expect(bx).toBeLessThanOrEqual(lance.frente);
        else expect(bx).toBeGreaterThanOrEqual(lance.frente);
        expect(lance.lado === 0 ? lance.frente >= 50 : lance.frente <= 50).toBe(true);
        const gol = eventos.find((e) => e.tipo === "gol" || e.tipo === "gol-penalti");
        const penalti = eventos.find((e) => e.tipo === "penalti");
        const finalizou = eventos.some((e) => e.tipo === "defesa" || e.tipo === "penalti-perdido" || (e.tipo === "chance" && e.jogador != null));
        const cartao = eventos.find((e) => e.tipo === "amarelo" || e.tipo === "vermelho");
        if (gol) {
          // Gol: a bola termina dentro do gol de quem sofreu, com o nome de quem fez.
          expect(lance).toMatchObject({ acao: "gol", lado: gol.lado, quem: gol.lado, jogadorId: gol.jogador });
          const [x, y] = lance.caminho[lance.caminho.length - 1];
          expect(x).toBe(gol.lado === 0 ? 100 : 0);
          expect(y >= 44 && y <= 56).toBe(true);
        } else if (penalti) {
          // Pênalti marcado: a bola na marca, do lado de quem vai cobrar.
          expect(lance).toMatchObject({ acao: "penalti", lado: penalti.lado });
          expect(lance.caminho[lance.caminho.length - 1]).toEqual([penalti.lado === 0 ? 89 : 11, 50]);
        } else if (cartao && !finalizou) {
          // Cartão: o rótulo é do time de quem levou; a bola fica com quem sofreu a falta.
          expect(lance).toMatchObject({ acao: cartao.tipo, quem: cartao.lado, lado: cartao.lado === 0 ? 1 : 0, jogadorId: cartao.jogador });
        } else if (!finalizou && eventos.some((e) => e.tipo === "fim")) {
          expect(lance.acao).toBe("fim");
        }
        anterior = lance;
      }
    }
    // Aparece de tudo um pouco num punhado de jogos.
    for (const acao of ["segura", "posse", "ataque", "perigo", "gol", "falta", "intervalo", "fim"]) expect(vistos, acao).toContain(acao);
  });

  it("o time mais forte fica mais com a bola no campo", () => {
    let comOFlamengo = 0;
    let total = 0;
    for (const semente of [1, 2, 3, 4, 5, 6]) {
      const { estado, pv, lado } = jogoDoFlamengo(semente, 95);
      while (!pv.terminada) {
        avancarMinuto(pv, estado.jogadores);
        if (pv.campo!.lance.lado === lado) comOFlamengo++;
        total++;
      }
    }
    expect(comOFlamengo / total).toBeGreaterThan(0.6);
  });

  it("mesma semente, mesmos lances no campo", () => {
    const lances = (semente: number) => {
      const { estado, pv } = jogoDoFlamengo(semente);
      const todos = [];
      while (!pv.terminada) {
        avancarMinuto(pv, estado.jogadores);
        todos.push(pv.campo!.lance);
      }
      return todos;
    };
    expect(lances(3)).toEqual(lances(3));
  });
});
