// Notas dos jogadores na partida (0 a 10) e o melhor em campo, a partir dos lances narrados. Usam sorteio próprio:
// placar e lances não mudam. Servem ao vivo (aba Notas) e no fim do jogo (média da temporada na ficha).
import { NOTAS } from "./constantes";
import type { LadoVivo, PartidaViva } from "./partida";
import { rngPara } from "./rng";
import type { EventoPartida, Jogador } from "./tipos";

export interface NotaDoJogador {
  jogadorId: number;
  lado: 0 | 1;
  nota: number;
  minutos: number;
}

/** "45+2" → 47; os minutos do segundo tempo seguem de 46 em diante. */
function minutoDe(e: Pick<EventoPartida, "min">): number {
  return e.min.split("+").reduce((a, b) => a + Number(b), 0);
}

/** Minutos que cada um jogou: titulares desde o começo, quem entrou desde a troca; saída por troca, vermelho ou lesão. */
function minutosJogados(pv: PartidaViva, lado: LadoVivo, i: 0 | 1, agora: number): Map<number, number> {
  const entrada = new Map<number, number>();
  const saida = new Map<number, number>();
  for (const e of pv.narracao) {
    if (e.lado !== i) continue;
    if (e.tipo === "substituicao" && e.jogador != null) {
      entrada.set(e.jogador, minutoDe(e));
      if (e.outro != null) saida.set(e.outro, minutoDe(e));
    }
    if ((e.tipo === "vermelho" || e.tipo === "lesao") && e.jogador != null && !saida.has(e.jogador)) saida.set(e.jogador, minutoDe(e));
  }
  const minutos = new Map<number, number>();
  for (const id of lado.jogaram) {
    const de = entrada.get(id) ?? 0;
    // Como nos aplicativos: o jogo inteiro conta 90 minutos (os acréscimos não entram).
    minutos.set(id, Math.min(90, Math.max(1, (saida.get(id) ?? agora) - de)));
  }
  return minutos;
}

/** As notas de todos que entraram em campo até agora (ou no jogo inteiro, se ele já terminou), da maior para a menor. */
export function notasDaPartida(pv: PartidaViva, jogadores: Record<number, Jogador>, semente: number): NotaDoJogador[] {
  const agora = Math.max(1, pv.minuto);
  // Quem jogou menos que os outros até agora fica mais perto da base (no jogo inteiro, menos de 60 minutos).
  const referencia = Math.min(NOTAS.minutosCheios, agora);
  const todos = pv.lados.flatMap((l) => l.jogaram).map((id) => jogadores[id]).filter(Boolean);
  const media = todos.reduce((s, j) => s + j.forca, 0) / Math.max(1, todos.length);
  const notas: NotaDoJogador[] = [];
  pv.lados.forEach((lado, indice) => {
    const i = indice as 0 | 1;
    const outro = pv.lados[i === 0 ? 1 : 0];
    const saldo = lado.gols - outro.gols;
    const minutos = minutosJogados(pv, lado, i, agora);
    const sofreu = outro.gols;
    for (const id of lado.jogaram) {
      const j = jogadores[id];
      if (!j) continue;
      const rng = rngPara(semente, `notas/${pv.partidaId}/${id}`);
      let nota = NOTAS.base + (saldo > 0 ? NOTAS.vitoria : saldo < 0 ? NOTAS.derrota : 0);
      for (const e of pv.narracao) {
        if (e.jogador === id && e.lado === i) {
          if (e.tipo === "gol") nota += NOTAS.gol;
          else if (e.tipo === "gol-penalti") nota += NOTAS.golDePenalti;
          else if (e.tipo === "defesa") nota += NOTAS.chuteNoGol;
          else if (e.tipo === "chance") nota += NOTAS.chuteFora;
          else if (e.tipo === "amarelo") nota += NOTAS.amarelo;
          else if (e.tipo === "vermelho") nota += NOTAS.vermelho;
          else if (e.tipo === "penalti-perdido") nota += NOTAS.penaltiPerdido;
        }
        if (e.outro === id && e.lado === i && e.tipo === "gol") nota += NOTAS.passe;
        // Pênalti: marcado para o outro lado, com o autor da falta deste lado.
        if (e.tipo === "penalti" && e.lado !== i && e.jogador === id) nota += NOTAS.penaltiCometido;
        // Goleiro: as defesas contra os chutes do outro lado, e o pênalti defendido.
        if (j.posicao === "G" && e.lado !== i) {
          if (e.tipo === "defesa") nota += NOTAS.defesa;
          if (e.tipo === "penalti-perdido" && e.texto.includes("pega o pênalti")) nota += NOTAS.penaltiDefendido;
        }
      }
      const jogou = minutos.get(id) ?? 1;
      if (j.posicao === "G") nota += sofreu ? sofreu * NOTAS.golSofridoGoleiro : jogou >= 60 && pv.terminada ? NOTAS.semSofrerGoleiro : 0;
      if (j.posicao === "Z" || j.posicao === "L") nota += sofreu ? sofreu * NOTAS.golSofridoDefensor : jogou >= 60 && pv.terminada ? NOTAS.semSofrerDefensor : 0;
      nota += (j.forca - media) / NOTAS.forca + rng.normal(0, NOTAS.variacao);
      nota = NOTAS.base + (nota - NOTAS.base) * Math.min(1, jogou / referencia);
      notas.push({ jogadorId: id, lado: i, nota: Math.round(Math.max(3, Math.min(10, nota)) * 10) / 10, minutos: jogou });
    }
  });
  return notas.sort((a, b) => b.nota - a.nota);
}

/** O melhor em campo: a maior nota entre quem jogou pelo menos 30 minutos. */
export function melhorEmCampo(notas: NotaDoJogador[]): NotaDoJogador | undefined {
  return notas.find((n) => n.minutos >= NOTAS.minutosMelhor);
}

/** "6,8" */
export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace(".", ",");
}

/** Nota média de uma temporada (ou da carreira), se ele teve jogos com nota. */
export function notaMedia(e: { notas?: number; avaliados?: number }): number | undefined {
  return e.avaliados ? Math.round((e.notas! / e.avaliados) * 10) / 10 : undefined;
}
