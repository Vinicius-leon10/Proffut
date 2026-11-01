// Campo 2D da partida do usuário (R60): a cada minuto, um lance desenhado a partir do que o jogo decidiu (quem atacou,
// o que a narração contou, os ataques e a posse das estatísticas). Usa sorteios próprios (`campo/<partida>`): placar,
// lances e estatísticas não mudam.
import type { CampoAoVivo, FocoDoMinuto, LanceDoCampo, PartidaViva } from "./partida";
import type { EventoPartida, Posicao } from "./tipos";

/** O minuto em números, das estatísticas: ataques e ataques perigosos de cada lado e a posse do mandante (0 a 1). */
export interface MinutoEmNumeros {
  ataques: [number, number];
  perigosos: [number, number];
  posse: number;
}

type Ponto = [number, number];

/** O lance de antes da bola rolar: bola no meio, saída do mandante. */
export function lanceInicial(): LanceDoCampo {
  return { n: 0, lado: 0, quem: 0, acao: "inicio", caminho: [[50, 50]], frente: 50 };
}

/** Quem aparece com a bola em cada fase do jogo: o peso de cada posição. */
const QUEM_TEM_A_BOLA: Record<"segura" | "posse" | "ataque" | "perigo", Partial<Record<Posicao, number>>> = {
  segura: { G: 1, Z: 3, L: 2, M: 1 },
  posse: { Z: 1, L: 2, M: 4 },
  ataque: { L: 2, M: 3, A: 2 },
  perigo: { L: 1, M: 2, A: 4 },
};

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const arredondar = (v: number) => Math.round(v * 10) / 10;
/** Profundidade do ataque de um lado (0 = o próprio gol, 100 = o gol do adversário) para x no campo e de volta. */
const xDe = (lado: 0 | 1, d: number) => (lado === 0 ? d : 100 - d);
const dDe = (lado: 0 | 1, x: number) => (lado === 0 ? x : 100 - x);

/** O lance do minuto que acabou de ser jogado. `eventos` é a narração do minuto; `numeros`, as estatísticas dele. */
export function lanceDoMinuto(pv: PartidaViva, foco: FocoDoMinuto | undefined, eventos: EventoPartida[], numeros?: MinutoEmNumeros): LanceDoCampo {
  const { rng, lance: anterior } = pv.campo as CampoAoVivo;
  const inicio = anterior.caminho[anterior.caminho.length - 1];
  const achar = (...tipos: EventoPartida["tipo"][]) => eventos.find((e) => tipos.includes(e.tipo));
  const ponto = (lado: 0 | 1, d: number, y: number): Ponto => [arredondar(limitar(xDe(lado, d), 0, 100)), arredondar(limitar(y, 0, 100))];
  /** Do ponto onde a bola está até a profundidade `alvo` do ataque do lado, em `toques` passes. */
  const conduzir = (lado: 0 | 1, alvo: number, toques: number, yFinal?: number): Ponto[] => {
    const caminho: Ponto[] = [inicio];
    const d0 = dDe(lado, inicio[0]);
    let y = inicio[1];
    for (let i = 1; i <= toques; i++) {
      const d = d0 + ((alvo - d0) * i) / toques + (i < toques ? rng.real(-6, 6) : 0);
      y = i === toques && yFinal !== undefined ? yFinal : limitar(y + rng.real(-28, 28), 8, 92);
      caminho.push(ponto(lado, limitar(d, 2, 98), y));
    }
    return caminho;
  };
  const noGol = (lado: 0 | 1) => ponto(lado, 100, rng.real(45, 55));
  const escanteio = (lado: 0 | 1): Ponto[] => [...conduzir(lado, 88, 1), ponto(lado, 100, rng.chance(0.5) ? 0 : 100)];
  /** Onde sai a falta: perto de onde a bola está, para o lado de quem sofreu. */
  const ondeFoiAFalta = (lado: 0 | 1) => limitar(dDe(lado, inicio[0]) + rng.real(-5, 15), 25, 80);
  const comBola = (lado: 0 | 1, fase: keyof typeof QUEM_TEM_A_BOLA) => {
    const emCampo = pv.lados[lado].emCampo;
    if (!emCampo.length) return undefined;
    return rng.escolherPeso(emCampo, (a) => QUEM_TEM_A_BOLA[fase][a.vaga.pos] ?? 0.2).jogadorId;
  };
  const montar = (lado: 0 | 1, acao: LanceDoCampo["acao"], caminho: Ponto[], extra: { quem?: 0 | 1; jogadorId?: number } = {}): LanceDoCampo => {
    const limpo = caminho.filter((p, i) => i === 0 || p[0] !== caminho[i - 1][0] || p[1] !== caminho[i - 1][1]);
    // A sombra do time com a bola vai do gol dele até onde a bola está (no mínimo o meio-campo).
    const frente = arredondar(xDe(lado, Math.max(50, dDe(lado, limpo[limpo.length - 1][0]))));
    return { n: anterior.n + 1, lado, quem: extra.quem ?? lado, acao, caminho: limpo, frente, jogadorId: extra.jogadorId };
  };

  // Os lances narrados, do mais importante para o menos.
  const gol = achar("gol", "gol-penalti");
  if (gol) {
    const l = gol.lado;
    const caminho =
      gol.tipo === "gol-penalti" ? [inicio, ponto(l, 89, 50), noGol(l)]
      : foco?.tipo === "escanteio" ? [...escanteio(l), ponto(l, 94, rng.real(42, 58)), noGol(l)]
      : [...conduzir(l, 87, 2, rng.real(32, 68)), noGol(l)];
    return montar(l, "gol", caminho, { jogadorId: gol.jogador });
  }
  const perdido = achar("penalti-perdido");
  if (perdido) return montar(perdido.lado, "penalti-perdido", [inicio, ponto(perdido.lado, 89, 50), ponto(perdido.lado, 99, rng.real(42, 58))], { jogadorId: perdido.jogador });
  const penalti = achar("penalti");
  if (penalti) return montar(penalti.lado, "penalti", [...conduzir(penalti.lado, 84, 1), ponto(penalti.lado, 89, 50)]);
  const defesa = achar("defesa");
  const chute = eventos.find((e) => e.tipo === "chance" && e.jogador != null);
  const finalizacao = defesa ?? chute;
  if (finalizacao) {
    const l = finalizacao.lado;
    const antes = foco?.tipo === "escanteio" ? [...escanteio(l), ponto(l, 94, rng.real(40, 60))] : conduzir(l, 86, 2, rng.real(28, 72));
    const fim = defesa ? ponto(l, 98, rng.real(44, 56)) : ponto(l, 100, rng.chance(0.5) ? rng.real(26, 40) : rng.real(60, 74));
    return montar(l, defesa ? "defesa" : "chute", [...antes, fim], { jogadorId: finalizacao.jogador });
  }
  const cartao = achar("vermelho") ?? achar("amarelo");
  if (cartao) {
    // A bola fica com quem sofreu a falta; o rótulo é de quem levou o cartão.
    const l = cartao.lado === 0 ? 1 : 0;
    return montar(l, cartao.tipo as "amarelo" | "vermelho", conduzir(l, ondeFoiAFalta(l), 1), { quem: cartao.lado, jogadorId: cartao.jogador });
  }
  // O fim do tempo vale mais que uma falta ou um escanteio no mesmo minuto.
  const pausa = achar("intervalo", "fim");
  if (pausa) return montar(anterior.lado, pausa.tipo as "intervalo" | "fim", [inicio, [50, 50]]);
  if (foco?.tipo === "falta") {
    const perigosa = eventos.some((e) => e.tipo === "chance" && e.jogador == null);
    return montar(foco.lado, perigosa ? "falta-perigosa" : "falta", perigosa ? conduzir(foco.lado, 76, 1, rng.real(30, 70)) : conduzir(foco.lado, ondeFoiAFalta(foco.lado), 1));
  }
  if (foco?.tipo === "escanteio") return montar(foco.lado, "escanteio", escanteio(foco.lado));

  // Sem lance narrado: quem atacou mais no minuto (ou teve mais a bola) e até onde chegou.
  const [a0, a1] = numeros?.ataques ?? [0, 0];
  const posse = numeros?.posse || 0.5;
  let lado: 0 | 1;
  let fase: keyof typeof QUEM_TEM_A_BOLA;
  if (a0 + a1 > 0) {
    lado = a0 > a1 ? 0 : a1 > a0 ? 1 : posse >= 0.5 ? 0 : 1;
    fase = numeros!.perigosos[lado] > 0 ? "perigo" : "ataque";
  } else {
    lado = posse >= 0.5 ? 0 : 1;
    fase = dDe(lado, inicio[0]) < 40 ? "segura" : "posse";
  }
  const alvo = { segura: rng.real(15, 38), posse: rng.real(38, 58), ataque: rng.real(58, 76), perigo: rng.real(78, 90) }[fase];
  return montar(lado, fase, conduzir(lado, alvo, rng.int(1, 2)), { jogadorId: comBola(lado, fase) });
}
