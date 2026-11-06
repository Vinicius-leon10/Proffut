// Carreira simulada para a série "Do zero ao topo" (TikTok): o Santa Cruz na Série C, com o jogo decidindo tudo
// (escalação automática, mercado do computador). Mesma semente, mesma carreira.
//   npx tsx videos/carreira/simular.ts                 grava videos/carreira/dados/temporada-2026.json (um registro por jogo)
//   npx tsx videos/carreira/simular.ts antes-do-jogo 5  imprime o save (para importar no jogo) no dia do 5º jogo, antes dele
import { writeFileSync } from "node:fs";
import { tabelaDoClube } from "../../src/engine/competicoes";
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import { ehTorneio, nomeDoTorneio, tabelaDoTorneio } from "../../src/engine/torneios";
import { nomeDaCompeticao } from "../../src/engine/competicoes";
import { exportarTexto } from "../../src/save/salvamento";
import type { EstadoJogo, IdTorneio, Partida } from "../../src/engine/tipos";

export const CLUBE = "santa-cruz";
export const SEMENTE = 2026;

const [modo, numero] = [process.argv[2], Number(process.argv[3])];
const estado: EstadoJogo = novoJogo({ nomeTecnico: "Vinicius", clubeId: CLUBE, semente: SEMENTE });
delete estado.tutorial;
estado.config.escalacaoAutomatica = true;

function nomeComp(p: Partida): string {
  if (ehTorneio(p.serie)) return nomeDoTorneio(p.serie);
  return nomeDaCompeticao(p.serie as never);
}

function posicaoNoTorneio(id: string): { pos: number; pts: number; total: number } | undefined {
  const t = estado.torneios?.[id as IdTorneio];
  if (!t) return undefined;
  const grupos = t.grupos ? t.grupos.length : 0;
  const tabelas = grupos ? Array.from({ length: grupos }, (_, g) => tabelaDoTorneio(estado, t, g + 1)) : [tabelaDoTorneio(estado, t)];
  for (const tab of tabelas) {
    const l = tab.find((x) => x.clubeId === CLUBE);
    if (l) return { pos: l.pos, pts: l.pts, total: tab.length };
  }
  return undefined;
}

const registros: unknown[] = [];
let jogo = 0;
for (let dia = 0; dia < 800; dia++) {
  const r = avancar(estado);
  if (r.tipo !== "jogos-hoje") break;
  const meu = r.meuJogo;
  if (meu) {
    jogo++;
    if (modo === "antes-do-jogo" && jogo === numero) {
      process.stdout.write(exportarTexto(estado));
      process.exit(0);
    }
  }
  simularDia(estado);
  if (!meu) continue;
  const p = estado.partidas.find((x) => x.id === meu.id)!;
  const emCasa = p.mandante === CLUBE;
  const adv = emCasa ? p.visitante : p.mandante;
  const [pro, contra] = emCasa ? [p.gm, p.gv] : [p.gv, p.gm];
  const lado = emCasa ? 0 : 1;
  const gols = p.eventos.filter((e) => (e.tipo === "gol" || e.tipo === "gol-penalti") && e.lado === lado && e.jogador).map((e) => ({ min: e.min, nome: estado.jogadores[e.jogador!]?.nome }));
  const serieC = tabelaDoClube(estado, CLUBE).find((l) => l.clubeId === CLUBE);
  const c = estado.clubes[CLUBE];
  registros.push({
    jogo, data: p.data, competicao: nomeComp(p), serie: p.serie, fase: p.fase, rodada: p.rodada, emCasa, adversario: adv, nomeAdversario: estado.clubes[adv]?.nome,
    pro, contra, penaltis: p.penaltis, resultado: pro > contra ? "V" : pro < contra ? "D" : "E", gols, publico: p.publico,
    serieC: serieC ? { pos: serieC.pos, pts: serieC.pts, j: serieC.j } : undefined,
    estadual: posicaoNoTorneio("E-PE"), caixa: c.caixa, confianca: estado.tecnico.confiancaDiretoria, torcida: estado.tecnico.confiancaTorcida,
    melhor: p.melhor ? estado.jogadores[p.melhor]?.nome : undefined, demitido: !!estado.tecnico.demissao,
  });
  if (estado.tecnico.demissao) break;
}
if (!modo) {
  writeFileSync(new URL("./dados/temporada-2026.json", import.meta.url), JSON.stringify({ clube: CLUBE, semente: SEMENTE, objetivo: (estado as unknown as { objetivo?: unknown }).objetivo, serieC: { promovidos: estado.series.C.promovidos, campeao: estado.series.C.campeao, fase: estado.series.C.fase }, jogos: registros }, null, 1));
  console.log(`${registros.length} jogos registrados.`);
}
