// Temporada simulada do Santa Cruz para a série "Do zero ao topo", com o técnico agindo nas janelas (contrata reforços
// onde o time é mais fraco, dentro do caixa) e o registro de tudo o que vira história: gols e minuto, lesões, cartões
// vermelhos, público, humor da torcida e da diretoria, contratações e a campanha.
//   npx tsx videos/carreira/temporada.ts procurar 1 40     roda as sementes 1 a 40 e mostra as que sobem para a Série B
//   npx tsx videos/carreira/temporada.ts gravar 17          grava dados/temporada.json com a semente 17
//   npx tsx videos/carreira/temporada.ts antes-do-jogo 17 5 imprime o save do dia do 5º jogo (para gravar ao vivo)
import { writeFileSync } from "node:fs";
import { nomeDaCompeticao, tabelaDoClube } from "../../src/engine/competicoes";
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import { elencoDe, fazerOferta, precoPedido } from "../../src/engine/mercado";
import { ehTorneio, nomeDoTorneio, tabelaDoTorneio } from "../../src/engine/torneios";
import { exportarTexto } from "../../src/save/salvamento";
import type { EstadoJogo, IdTorneio, Jogador, Posicao } from "../../src/engine/tipos";

const CLUBE = "santa-cruz";
const VAGAS: Record<Posicao, number> = { G: 1, L: 2, Z: 2, M: 4, A: 2 };
const SERIES_VENDEM = new Set(["C", "D", "estadual"]);

type Contratacao = { data: string; nome: string; posicao: Posicao; idade: number; forca: number; de: string; valor: number };

/** Força média dos melhores de cada posição (os que seriam titulares). */
function forcaPorPosicao(estado: EstadoJogo): Record<Posicao, number> {
  const elenco = elencoDe(estado, CLUBE);
  const r = {} as Record<Posicao, number>;
  for (const pos of Object.keys(VAGAS) as Posicao[]) {
    const fs = elenco.filter((j) => j.posicao === pos).map((j) => j.forca).sort((a, b) => b - a).slice(0, VAGAS[pos]);
    r[pos] = fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : 0;
  }
  return r;
}

/** Janela: o técnico reforça as posições mais fracas com quem cabe no caixa (até `quantos` reforços). */
function reforcar(estado: EstadoJogo, quantos: number, feitas: Contratacao[]) {
  for (let n = 0; n < quantos; n++) {
    const forcas = forcaPorPosicao(estado);
    const caixa = estado.clubes[CLUBE].caixa;
    const ordem = (Object.keys(forcas) as Posicao[]).sort((a, b) => forcas[a] - forcas[b]);
    let feito = false;
    for (const pos of ordem) {
      const candidatos = Object.values(estado.jogadores).filter((j: Jogador) =>
        j.posicao === pos && j.clubeId && j.clubeId !== CLUBE && !j.emprestimo && !j.clubeFora && j.idade <= 31 &&
        SERIES_VENDEM.has(estado.clubes[j.clubeId]?.serie) && j.forca >= forcas[pos] + 4,
      ).map((j) => ({ j, preco: precoPedido(estado, j) })).filter((x) => x.preco <= caixa * 0.3)
        .sort((a, b) => (b.j.forca - a.j.forca) || (a.preco - b.preco));
      for (const { j, preco } of candidatos.slice(0, 5)) {
        const de = estado.clubes[j.clubeId!].nome;
        const r = fazerOferta(estado, j.id, Math.ceil(preco * 1.08 / 10_000) * 10_000);
        if (r.ok) {
          feitas.push({ data: estado.data, nome: j.nome, posicao: j.posicao, idade: j.idade, forca: j.forca, de, valor: Math.ceil(preco * 1.08 / 10_000) * 10_000 });
          feito = true;
          break;
        }
      }
      if (feito) break;
    }
    if (!feito) break;
  }
}

function nomeComp(serie: string): string {
  return ehTorneio(serie as never) ? nomeDoTorneio(serie as IdTorneio) : nomeDaCompeticao(serie as never);
}

function posicaoNoEstadual(estado: EstadoJogo) {
  const t = estado.torneios?.["E-PE" as IdTorneio];
  if (!t) return undefined;
  const tabelas = t.grupos ? t.grupos.map((_, g) => tabelaDoTorneio(estado, t, g + 1)) : [tabelaDoTorneio(estado, t)];
  for (const tab of tabelas) {
    const l = tab.find((x) => x.clubeId === CLUBE);
    if (l) return { pos: l.pos, pts: l.pts, total: tab.length };
  }
  return undefined;
}

/** Tabela do grupo do quadrangular da Série C (clube, pontos e jogos). */
function grupoDoQuadrangular(estado: EstadoJogo, grupo?: number) {
  const ps = estado.partidas.filter((x) => x.serie === "C" && x.fase === "quadrangulares" && x.grupo === grupo && x.jogada);
  const t: Record<string, { pts: number; j: number; sg: number }> = {};
  for (const x of ps) for (const [id, a, b] of [[x.mandante, x.gm, x.gv], [x.visitante, x.gv, x.gm]] as [string, number, number][]) {
    t[id] ??= { pts: 0, j: 0, sg: 0 };
    t[id].j++; t[id].sg += a - b; t[id].pts += a > b ? 3 : a === b ? 1 : 0;
  }
  return Object.entries(t).sort((a, b) => b[1].pts - a[1].pts || b[1].sg - a[1].sg).map(([id, v]) => ({ nome: estado.clubes[id].nome, ...v }));
}

export function simularTemporada(semente: number, pararNoJogo?: number) {
  const estado = novoJogo({ nomeTecnico: "Vinicius", clubeId: CLUBE, semente });
  delete estado.tutorial;
  estado.config.escalacaoAutomatica = true;
  const contratacoes: Contratacao[] = [];
  reforcar(estado, 3, contratacoes);
  let janelaJulho = false;
  const jogos: Record<string, unknown>[] = [];
  let n = 0;
  for (let dia = 0; dia < 800; dia++) {
    if (!janelaJulho && estado.data >= `${estado.temporada}-07-01`) {
      janelaJulho = true;
      reforcar(estado, 2, contratacoes);
    }
    const r = avancar(estado);
    if (r.tipo !== "jogos-hoje") break;
    const meu = r.meuJogo;
    if (meu) {
      n++;
      if (pararNoJogo === n) return { estado };
    }
    const torcidaAntes = estado.tecnico.confiancaTorcida;
    simularDia(estado);
    if (!meu) continue;
    const p = estado.partidas.find((x) => x.id === meu.id)!;
    const emCasa = p.mandante === CLUBE;
    const lado = emCasa ? 0 : 1;
    const [pro, contra] = emCasa ? [p.gm, p.gv] : [p.gv, p.gm];
    const nome = (id?: number) => (id ? estado.jogadores[id]?.nome : undefined);
    const eventos = p.eventos.filter((e) => ["gol", "gol-penalti", "vermelho", "lesao"].includes(e.tipo))
      .map((e) => ({ min: e.min, tipo: e.tipo, nosso: e.lado === lado, jogador: nome(e.jogador) }));
    const minuto = (m: string) => Number(m.split("+")[0]) + (m.includes("+") ? Number(m.split("+")[1]) / 10 : 0);
    const golsNossos = eventos.filter((e) => e.nosso && e.tipo.startsWith("gol"));
    const ultimo = [...eventos].filter((e) => e.tipo.startsWith("gol")).sort((a, b) => minuto(a.min) - minuto(b.min)).at(-1);
    const decidiuNoFim = !!ultimo && ultimo.nosso && minuto(ultimo.min) >= 85 && pro - contra === 1;
    const levouNoFim = !!ultimo && !ultimo.nosso && minuto(ultimo.min) >= 85 && pro <= contra && contra - pro <= 1;
    const c = tabelaDoClube(estado, CLUBE).find((l) => l.clubeId === CLUBE);
    jogos.push({
      jogo: n, data: p.data, competicao: nomeComp(p.serie), serie: p.serie, fase: p.fase, rodada: p.rodada, grupo: p.grupo, emCasa,
      adversario: emCasa ? p.visitante : p.mandante, nomeAdversario: estado.clubes[emCasa ? p.visitante : p.mandante]?.nome,
      pro, contra, penaltis: p.penaltis, resultado: pro > contra ? "V" : pro < contra ? "D" : "E", publico: p.publico,
      gols: golsNossos.map((g) => ({ min: g.min, nome: g.jogador })), eventos, decidiuNoFim, levouNoFim,
      serieC: c && { pos: c.pos, pts: c.pts, j: c.j }, estadual: posicaoNoEstadual(estado),
      caixa: estado.clubes[CLUBE].caixa, diretoria: estado.tecnico.confiancaDiretoria, torcidaAntes, torcida: estado.tecnico.confiancaTorcida,
      melhor: nome(p.melhor), demitido: !!estado.tecnico.demissao,
      quadrangular: p.fase === "quadrangulares" ? grupoDoQuadrangular(estado, p.grupo) : undefined,
    });
    if (estado.tecnico.demissao) break;
  }
  const C = estado.series.C;
  return {
    estado,
    resumo: {
      semente, subiu: C.promovidos.includes(CLUBE), campeaoC: C.campeao === CLUBE, campeaoPE: estado.torneios?.["E-PE" as IdTorneio]?.campeao === CLUBE,
      objetivo: (estado as unknown as { objetivo?: unknown }).objetivo, contratacoes, jogos,
    },
  };
}

const [modo, a, b] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
if (modo === "procurar") {
  for (let sem = a; sem <= b; sem++) {
    const { resumo } = simularTemporada(sem);
    if (!resumo) continue;
    const js = resumo.jogos as { resultado: string; emCasa: boolean; decidiuNoFim: boolean; levouNoFim: boolean; eventos: { tipo: string; nosso: boolean }[]; serieC?: { pos: number } }[];
    const derrotasCasa = js.filter((j) => j.emCasa && j.resultado === "D").length;
    const noFim = js.filter((j) => j.decidiuNoFim).length;
    const levou = js.filter((j) => j.levouNoFim).length;
    const lesoes = js.reduce((t, j) => t + j.eventos.filter((e) => e.tipo === "lesao" && e.nosso).length, 0);
    const pior = Math.max(...js.map((j) => j.serieC?.pos ?? 0));
    console.log(`semente ${sem}: ${resumo.subiu ? "SOBE" : "fica"}${resumo.campeaoC ? " CAMPEÃO C" : ""}${resumo.campeaoPE ? " campeão PE" : ""} | jogos ${js.length} | vitórias no fim ${noFim} | levou no fim ${levou} | derrotas em casa ${derrotasCasa} | lesões ${lesoes} | pior posição na C ${pior} | reforços ${resumo.contratacoes.length}`);
  }
} else if (modo === "gravar") {
  const { resumo } = simularTemporada(a);
  writeFileSync(new URL("./dados/temporada.json", import.meta.url), JSON.stringify(resumo, null, 1));
  console.log(`semente ${a}: ${resumo!.jogos.length} jogos, subiu: ${resumo!.subiu}`);
} else if (modo === "antes-do-jogo") {
  const { estado } = simularTemporada(a, b);
  process.stdout.write(exportarTexto(estado));
}
