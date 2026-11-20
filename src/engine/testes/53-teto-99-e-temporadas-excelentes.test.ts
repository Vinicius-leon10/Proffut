// R152: força máxima 99 e chegar perto dela muito difícil. Pedido do usuário (nov/2026): "quero que a força máxima de
// qualquer jogador seja 99 e que chegar perto dela seja muito difícil: um jogador novo (da base, ou um de 80 aos 19 anos)
// chega a uns 90, mas só chega a 99 com várias temporadas excelentes seguidas (jogar muito, nota alta, gols, sem lesão
// longa; goleiro conta defesas e jogos sem sofrer gol)"; e depois da medição: "não deixe tão difícil os jogadores
// evoluírem, os jovens... Vou deixar mediano isso, não totalmente difícil, mas também não muito fácil".
import { describe, expect, it } from "vitest";
import { exportarTexto, importarTexto } from "../../save/salvamento";
import { avancar, novoJogo, simularDia } from "../jogo";
import { criarRng } from "../rng";
import { evoluir, nivelDaTemporada } from "../temporada";
import type { EstatisticasJogador, Jogador, Posicao } from "../tipos";

type Temporada = Partial<EstatisticasJogador>;
const jogador = (forca: number, potencial: number, idade: number, posicao: Posicao = "M") =>
  ({ forca, potencial, idade, posicao, temporada: { jogos: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 } }) as unknown as Jogador;
const comTemporada = (j: Jogador, t: Temporada) => { j.temporada = { jogos: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0, ...t }; };

// Temporadas de exemplo de um meia: comum (joga muito, sem destaque), boa e excelente.
const COMUM: Temporada = { jogos: 36, gols: 2, assistencias: 3, notas: 36 * 6.8, avaliados: 36 };
const BOA: Temporada = { jogos: 36, gols: 6, assistencias: 5, notas: 36 * 7.1, avaliados: 36 };
const EXCELENTE: Temporada = { jogos: 40, gols: 10, assistencias: 9, notas: 40 * 7.6, avaliados: 40 };
const POUCO: Temporada = { jogos: 10, gols: 0, assistencias: 1, notas: 10 * 6.6, avaliados: 10 };

/** Simula `anos` temporadas iguais (a idade sobe junto) para 400 jogadores e devolve as forças finais. */
function simular(forca: number, potencial: number, idade: number, anos: number, t: Temporada, posicao: Posicao = "M"): number[] {
  const finais: number[] = [];
  for (let k = 0; k < 400; k++) {
    const rng = criarRng(5000 + k);
    const j = jogador(forca, potencial, idade, posicao);
    for (let a = 0; a < anos; a++) { comTemporada(j, t); evoluir(rng, j); }
    finais.push(j.forca);
  }
  return finais;
}
const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const fracao = (v: number[], f: (x: number) => boolean) => v.filter(f).length / v.length;

describe("teto de 99 e temporadas excelentes (R152)", () => {
  it("o nível da temporada: excelente pede muitos jogos, nota alta e gols; lesão longa ou poucos jogos tiram", () => {
    const j = jogador(92, 99, 25);
    const nivel = (t: Temporada, pos: Posicao = "M") => { j.posicao = pos; comTemporada(j, t); return nivelDaTemporada(j); };
    expect(nivel(COMUM)).toBe(0);
    expect(nivel(BOA)).toBe(1);
    expect(nivel(EXCELENTE)).toBe(2);
    expect(nivel(POUCO)).toBe(0);
    expect(nivel({ ...EXCELENTE, lesaoMaisLonga: 30 })).toBe(0);
    // Atacante: os gols contam mais que a nota.
    expect(nivel({ jogos: 38, gols: 22, assistencias: 4 }, "A")).toBe(2);
    expect(nivel({ jogos: 38, gols: 4, assistencias: 2 }, "A")).toBe(0);
    // Goleiro (decisão do usuário): as defesas e os jogos sem sofrer gol.
    expect(nivel({ jogos: 38, semSofrer: 17, defesas: 120, notas: 38 * 7.2, avaliados: 38 }, "G")).toBe(2);
    expect(nivel({ jogos: 38, semSofrer: 6, defesas: 60, notas: 38 * 6.7, avaliados: 38 }, "G")).toBe(0);
    // Sem nota (jogos pela simulação rápida), vale o que existe: jogos, gols e jogos sem sofrer gol.
    expect(nivel({ jogos: 38, semSofrer: 17 }, "Z")).toBe(2);
  });

  it("ninguém passa de 99, nem com as melhores temporadas", () => {
    for (const f of simular(97, 99, 24, 12, EXCELENTE)) expect(f).toBeLessThanOrEqual(99);
    const j = jogador(99, 99, 25);
    for (let a = 0; a < 5; a++) { comTemporada(j, EXCELENTE); evoluir(criarRng(a), j, false); }
    expect(j.forca).toBe(99);
  });

  it("um jovem de 80 aos 19 anos que joga muito chega a uns 90 (meio-termo: possível, não fácil); quem joga pouco, bem menos", () => {
    const cinco = simular(80, 95, 19, 5, COMUM);
    const sete = simular(80, 95, 19, 7, COMUM);
    expect(media(cinco)).toBeGreaterThan(85);
    expect(media(cinco)).toBeLessThan(90);
    expect(fracao(sete, (f) => f >= 90)).toBeGreaterThan(0.3); // hoje (antes da mudança) quase nenhum chegava
    expect(fracao(cinco, (f) => f >= 92)).toBeLessThan(0.05); // e não passa direto de 90 sem temporadas boas
    const pouco = simular(80, 95, 19, 5, POUCO);
    expect(media(pouco)).toBeLessThan(media(cinco) - 2);
  });

  it("de 90 em diante cada ponto pede temporada boa; 95 a 99 só com várias excelentes seguidas", () => {
    // Temporadas comuns: um jogador de 90 aos 24 anos não sobe.
    expect(media(simular(90, 99, 24, 4, COMUM))).toBeLessThanOrEqual(90.3);
    // Boas temporadas levam de 90 a 92, 93; não a 99.
    const boas = simular(90, 99, 23, 5, BOA);
    expect(media(boas)).toBeGreaterThan(91);
    expect(fracao(boas, (f) => f >= 95)).toBeLessThan(0.05);
    // Uma temporada excelente de um 95 não leva a 99; várias seguidas, sim (alguns).
    expect(Math.max(...simular(95, 99, 24, 1, EXCELENTE))).toBeLessThanOrEqual(96);
    const varias = simular(95, 99, 23, 6, EXCELENTE);
    expect(fracao(varias, (f) => f === 99)).toBeGreaterThan(0.1);
    expect(fracao(simular(95, 99, 23, 6, BOA), (f) => f >= 98)).toBe(0);
  });

  it("os melhores de hoje ficam como estão: o jogo novo não mexe na força de ninguém e ninguém começa acima de 99", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 11 });
    const todos = Object.values(e.jogadores);
    expect(Math.max(...todos.map((j) => j.forca))).toBeLessThanOrEqual(99);
    expect(Math.max(...todos.map((j) => j.potencial))).toBeLessThanOrEqual(99);
    // Save antigo com alguém acima de 99 (força ou potencial): desce para 99 ao abrir.
    const [a, b] = todos.sort((x, y) => y.forca - x.forca);
    a.forca = 103; a.potencial = 105; b.potencial = 101;
    const aberto = importarTexto(exportarTexto(e));
    expect(aberto.jogadores[a.id].forca).toBe(99);
    expect(aberto.jogadores[a.id].potencial).toBe(99);
    expect(aberto.jogadores[b.id].potencial).toBe(99);
  }, 120_000);

  it("a temporada de cada jogador conta os jogos sem sofrer gol, as defesas do goleiro e a lesão mais longa", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 12 });
    e.config.escalacaoAutomatica = true;
    for (let k = 0; k < 40; k++) {
      const r = avancar(e);
      if (r.tipo === "jogos-hoje") simularDia(e);
      if (r.tipo === "nova-temporada" || r.tipo === "fim-dos-jogos") break;
    }
    const todos = Object.values(e.jogadores);
    const goleiros = todos.filter((j) => j.posicao === "G" && j.temporada.jogos > 0);
    expect(goleiros.some((j) => (j.temporada.semSofrer ?? 0) > 0)).toBe(true);
    expect(goleiros.some((j) => (j.temporada.defesas ?? 0) > 0)).toBe(true);
    expect(todos.some((j) => (j.posicao === "Z" || j.posicao === "L") && (j.temporada.semSofrer ?? 0) > 0)).toBe(true);
    // Atacante e meia não ganham jogo sem sofrer gol.
    expect(todos.some((j) => (j.posicao === "A" || j.posicao === "M") && (j.temporada.semSofrer ?? 0) > 0)).toBe(false);
    for (const j of todos) if (j.lesaoDias > 0 && j.temporada.jogos > 0) expect(j.temporada.lesaoMaisLonga ?? 0).toBeGreaterThan(0);
    expect(todos.some((j) => (j.temporada.lesaoMaisLonga ?? 0) > 0)).toBe(true);
    for (const j of goleiros) expect(j.temporada.semSofrer ?? 0).toBeLessThanOrEqual(j.temporada.jogos);
  }, 180_000);
});
