// Simula temporadas inteiras sem interface e imprime as estatísticas usadas para
// calibrar o motor. Uso: npm run sim -- [temporadas=3] [sementes=2]
import { SERIES, tabelaDaLiga, FASE_LIGA } from "../../src/engine/competicoes";
import { forcaDoTime } from "../../src/engine/forca";
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import { elencoDe } from "../../src/engine/mercado";
import type { EstadoJogo, SerieId } from "../../src/engine/tipos";

const temporadas = Number(process.argv[2] ?? 3);
const sementes = Number(process.argv[3] ?? 2);

interface Acumulado {
  jogos: number; gols: number; casa: number; empate: number; fora: number;
  amarelos: number; vermelhos: number; lesoes: number; penaltis: number;
  correlacoes: number[]; artilheiros: number[]; caixas: number[]; usados: number[];
  forcaCampeao: number[]; posicaoMaisForte: number[];
}

const acc = Object.fromEntries(
  SERIES.map((s) => [s, { jogos: 0, gols: 0, casa: 0, empate: 0, fora: 0, amarelos: 0, vermelhos: 0, lesoes: 0, penaltis: 0, correlacoes: [], artilheiros: [], caixas: [], usados: [], forcaCampeao: [], posicaoMaisForte: [] }]),
) as unknown as Record<SerieId, Acumulado>;

function correlacao(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}

const AMOSTRA_FINANCAS = ["flamengo", "remo", "ponte-preta", "sao-bernardo", "brusque", "santa-cruz"];
let financasImpressas = false;

function imprimirFinancas(estado: EstadoJogo) {
  console.log(`Finanças da temporada ${estado.temporada} (amostra):`);
  for (const id of AMOSTRA_FINANCAS) {
    const c = estado.clubes[id];
    const r = c.resumoFinanceiro;
    const partes = Object.entries(r).map(([k, v]) => `${k} ${mi(v ?? 0)}`).join(", ");
    console.log(`  ${c.nome} (${c.serie}): caixa ${mi(c.caixa)} | ${partes}`);
  }
}

function coletar(estado: EstadoJogo, forcaInicial: Map<string, number>) {
  if (!financasImpressas) { imprimirFinancas(estado); financasImpressas = true; }
  for (const s of SERIES) {
    const a = acc[s];
    const liga = estado.partidas.filter((p) => p.serie === s && p.fase === FASE_LIGA[s]);
    for (const p of liga) {
      a.jogos++;
      a.gols += p.gm + p.gv;
      if (p.gm > p.gv) a.casa++; else if (p.gm === p.gv) a.empate++; else a.fora++;
      for (const e of p.eventos) {
        if (e.tipo === "amarelo") a.amarelos++;
        if (e.tipo === "vermelho") a.vermelhos++;
        if (e.tipo === "lesao") a.lesoes++;
        if (e.tipo === "gol-penalti") a.penaltis++;
      }
    }
    const tabela = tabelaDaLiga(estado, s);
    a.correlacoes.push(correlacao(tabela.map((l) => forcaInicial.get(l.clubeId)!), tabela.map((l) => l.pts)));
    a.forcaCampeao.push(forcaInicial.get(tabela[0].clubeId)!);
    const maisForte = [...tabela].sort((x, y) => forcaInicial.get(y.clubeId)! - forcaInicial.get(x.clubeId)!)[0];
    a.posicaoMaisForte.push(maisForte.pos);
    const gols = new Map<number, number>();
    for (const p of liga) for (const e of p.eventos) if (e.tipo === "gol" || e.tipo === "gol-penalti") gols.set(e.jogador!, (gols.get(e.jogador!) ?? 0) + 1);
    a.artilheiros.push(Math.max(0, ...gols.values()));
    for (const c of Object.values(estado.clubes)) {
      if (c.serie !== s) continue;
      a.caixas.push(c.caixa);
      const elenco = elencoDe(estado, c.id);
      a.usados.push(elenco.filter((j) => j.temporada.jogos > 0).length / elenco.length);
    }
  }
}

const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)] ?? 0; };
const mi = (v: number) => `${(v / 1_000_000).toFixed(1)} mi`;

const inicio = Date.now();
for (let s = 1; s <= sementes; s++) {
  const estado = novoJogo({ nomeTecnico: "Sim", clubeId: "flamengo", semente: 1000 + s });
  estado.config.escalacaoAutomatica = true;
  for (let t = 0; t < temporadas; t++) {
    const forcaInicial = new Map(Object.values(estado.clubes).map((c) => [c.id, forcaDoTime(elencoDe(estado, c.id))]));
    let seguranca = 0;
    while (seguranca++ < 300) {
      const r = avancar(estado);
      if (r.tipo === "nova-temporada" || r.tipo === "nada") break;
      if (r.tipo === "jogos-hoje") {
        // Coleta antes da virada (que acontece no próximo avancar depois do último jogo).
        simularDia(estado);
        if (SERIES.every((x) => estado.series[x].fase === "encerrada")) { coletar(estado, forcaInicial); }
      }
    }
    for (const x of SERIES) {
      const n = Object.values(estado.clubes).filter((c) => c.serie === x).length;
      if (n !== 20) console.error(`ERRO: Série ${x} com ${n} clubes na temporada ${estado.temporada}`);
    }
  }
  console.log(`semente ${s}: ${Object.keys(estado.jogadores).length} jogadores no mundo, save ~${(JSON.stringify(estado).length / 1024).toFixed(0)} KB`);
}

console.log(`\n${temporadas} temporadas × ${sementes} sementes em ${((Date.now() - inicio) / 1000).toFixed(1)} s\n`);
for (const s of SERIES) {
  const a = acc[s];
  console.log(`Série ${s} (${a.jogos} jogos da fase de liga)`);
  console.log(`  gols/jogo ${(a.gols / a.jogos).toFixed(2)}   mandante ${(100 * a.casa / a.jogos).toFixed(1)}%   empate ${(100 * a.empate / a.jogos).toFixed(1)}%   visitante ${(100 * a.fora / a.jogos).toFixed(1)}%`);
  console.log(`  correlação força×pontos ${media(a.correlacoes).toFixed(2)}   artilheiro ${media(a.artilheiros).toFixed(1)} gols   posição do mais forte ${media(a.posicaoMaisForte).toFixed(1)}`);
  console.log(`  amarelos/jogo ${(a.amarelos / a.jogos).toFixed(2)}   vermelhos/jogo ${(a.vermelhos / a.jogos).toFixed(3)}   lesões/jogo ${(a.lesoes / a.jogos).toFixed(2)}   pênaltis convertidos/jogo ${(a.penaltis / a.jogos).toFixed(2)}`);
  console.log(`  elenco usado ${(100 * media(a.usados)).toFixed(0)}%   caixa no fim: mín ${mi(Math.min(...a.caixas))}  mediana ${mi(mediana(a.caixas))}  máx ${mi(Math.max(...a.caixas))}  negativos ${a.caixas.filter((c) => c < 0).length}/${a.caixas.length}`);
}
