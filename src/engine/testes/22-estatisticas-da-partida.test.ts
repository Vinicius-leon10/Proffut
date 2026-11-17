// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, prepararJogos } from "../jogo";
import { avancarMinuto, cartoes, posseDeBola, simularAteOFim, sobPressao, type Estatisticas } from "../partida";
import { criarRng } from "../rng";
import type { EstadoJogo } from "../tipos";


describe("estatísticas da partida", () => {
  const jogoDoFlamengo = (semente: number, mexer?: (estado: EstadoJogo) => void) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    mexer?.(estado);
    avancar(estado);
    const vivas = prepararJogos(estado);
    const pv = vivas.find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    return { estado, vivas, pv, lado: (pv.lados[0].clubeId === "flamengo" ? 0 : 1) as 0 | 1 };
  };
  const forcaDoFlamengo = (forca: number) => (estado: EstadoJogo) => {
    for (const j of Object.values(estado.jogadores)) if (j.clubeId === "flamengo") j.forca = forca;
  };
  const minuto = (m: string) => m.split("+").reduce((a, b) => a + Number(b), 0);

  it("só a partida do usuário tem estatísticas, e elas não mudam placar nem lances", () => {
    const com = jogoDoFlamengo(5);
    expect(com.vivas.filter((v) => v.estatisticas).map((v) => v.partidaId)).toEqual([com.pv.partidaId]);
    const sem = jogoDoFlamengo(5);
    sem.pv.estatisticas = undefined;
    simularAteOFim(com.pv, com.estado.jogadores);
    simularAteOFim(sem.pv, sem.estado.jogadores);
    expect(sem.pv.narracao).toEqual(com.pv.narracao);
    expect(sem.pv.lados.map((l) => l.gols)).toEqual(com.pv.lados.map((l) => l.gols));
  });

  it("batem com os lances e têm números de um jogo de verdade", () => {
    const total = { ataques: 0, perigosos: 0, chutes: 0, noGol: 0, escanteios: 0, times: 0 };
    for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { estado, pv } = jogoDoFlamengo(semente);
      simularAteOFim(pv, estado.jogadores);
      const e = pv.estatisticas!;
      const posse = posseDeBola(e);
      expect(posse[0] + posse[1]).toBe(100);
      // Uma linha de ataques perigosos por minuto jogado (os dois tempos, com os acréscimos).
      const intervalo = pv.narracao.find((x) => x.tipo === "intervalo")!;
      expect(e.perigososPorMinuto).toHaveLength(minuto(intervalo.min) + pv.minuto - 45);
      pv.lados.forEach((lado, i) => {
        const s = e.lados[i];
        const lances = pv.narracao.filter((x) => x.lado === i);
        const noAlvo = lances.filter((x) => x.tipo === "gol" || x.tipo === "gol-penalti" || x.tipo === "defesa").length;
        expect(s.chutesNoGol, "gols e defesas do goleiro são chutes no gol").toBeGreaterThanOrEqual(noAlvo);
        expect(s.chutesNoGol).toBeGreaterThanOrEqual(lado.gols);
        expect(s.ataquesPerigosos).toBeLessThanOrEqual(s.ataques);
        expect(cartoes(lado)).toEqual({
          amarelos: lances.filter((x) => x.tipo === "amarelo" || (x.tipo === "vermelho" && x.texto.startsWith("Segundo amarelo"))).length,
          vermelhos: lances.filter((x) => x.tipo === "vermelho").length,
        });
        total.ataques += s.ataques;
        total.perigosos += s.ataquesPerigosos;
        total.chutes += s.chutesNoGol + s.chutesFora;
        total.noGol += s.chutesNoGol;
        total.escanteios += s.escanteios;
        total.times++;
      });
    }
    // Por time e por jogo, como nos aplicativos de futebol.
    const porTime = (n: number) => n / total.times;
    expect(porTime(total.ataques)).toBeGreaterThan(70);
    expect(porTime(total.ataques)).toBeLessThan(130);
    expect(porTime(total.perigosos)).toBeGreaterThan(35);
    expect(porTime(total.perigosos)).toBeLessThan(70);
    expect(porTime(total.chutes)).toBeGreaterThan(8);
    expect(porTime(total.chutes)).toBeLessThan(18);
    expect(porTime(total.noGol)).toBeGreaterThan(2.5);
    expect(porTime(total.noGol)).toBeLessThan(7);
    expect(porTime(total.escanteios)).toBeGreaterThan(3);
    expect(porTime(total.escanteios)).toBeLessThan(8);
  });

  it("o aviso de pressão liga com 14 ataques perigosos do adversário e o triplo dos seus, e só desliga abaixo de 10 ou do dobro", () => {
    const com = (minutos: [number, number][]): Estatisticas => ({ lados: [] as unknown as Estatisticas["lados"], perigososPorMinuto: minutos, rng: criarRng(1) });
    const minutos = (n: number, valor: [number, number]) => Array.from({ length: n }, (): [number, number] => [...valor]);
    const pressao = minutos(15, [0, 1]); // o visitante com um ataque perigoso por minuto
    expect(sobPressao(com(pressao), 0)).toEqual({ deles: 15, nossos: 0 });
    expect(sobPressao(com(pressao), 1)).toBeNull();
    expect(sobPressao(com(pressao.slice(0, 13)), 0), "13 ainda não liga").toBeNull();
    expect(sobPressao(com([...minutos(5, [1, 0]), ...minutos(10, [0, 1.5])]), 0), "15 contra 5 liga (o triplo)").toEqual({ deles: 15, nossos: 5 });
    expect(sobPressao(com([...minutos(6, [1, 0]), ...minutos(9, [0, 1.5])]), 0), "13,5 contra 6 não liga").toBeNull();
    // Depois que liga, fica enquanto o adversário tiver 10 ou mais e o dobro dos seus.
    const calma = [...pressao, ...minutos(6, [0, 0])];
    expect(sobPressao(com(calma.slice(0, 20)), 0)).toEqual({ deles: 10, nossos: 0 });
    expect(sobPressao(com(calma), 0), "9 desliga").toBeNull();
    const reacao = [...pressao, ...minutos(4, [2, 1])]; // meu time reage
    expect(sobPressao(com(reacao.slice(0, 18)), 0), "15 contra 6: menos que o triplo, mas ainda mais que o dobro").toEqual({ deles: 15, nossos: 6 });
    expect(sobPressao(com(reacao), 0), "15 contra 8: menos que o dobro, desliga").toBeNull();
  });

  it("um time muito fraco vê o aviso de pressão quase o jogo todo, e ele não pisca; um time muito forte nunca vê", () => {
    for (const [forca, minimo, maximo] of [[5, 40, 200], [99, 0, 0]] as const) {
      const { estado, pv, lado } = jogoDoFlamengo(9, forcaDoFlamengo(forca));
      let comAviso = 0;
      let trocas = 0;
      let antes = false;
      while (!pv.terminada) {
        avancarMinuto(pv, estado.jogadores);
        const aviso = sobPressao(pv.estatisticas!, lado);
        if (aviso) {
          comAviso++;
          expect(aviso.deles).toBeGreaterThanOrEqual(10);
          expect(aviso.deles).toBeGreaterThanOrEqual(2 * aviso.nossos);
        }
        if (!!aviso !== antes) trocas++;
        antes = !!aviso;
      }
      expect(comAviso, `minutos com aviso (força ${forca})`).toBeGreaterThanOrEqual(minimo);
      expect(comAviso).toBeLessThanOrEqual(maximo);
      expect(trocas, "liga e desliga poucas vezes").toBeLessThanOrEqual(4);
    }
  });
});
