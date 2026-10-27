// Sala de troféus: recordes de cada clube (maior goleada, pior derrota, maior público, artilheiros), somados jogo a
// jogo, e os títulos do clube e do técnico, tirados do histórico das temporadas.
import { comArtigo } from "./artigos";
import { NOME_COMPETICAO, NOME_SERIE, SERIES } from "./competicoes";
import type { EstadoJogo, JogoRecorde, Partida, RecordesClube, SerieId } from "./tipos";

const MAXIMO_ARTILHEIROS = 20;

/** Depois de cada jogo: os recordes dos dois clubes (os da Série D, que só jogam a Copa, ficam de fora). */
export function registrarRecordes(estado: EstadoJogo, p: Partida) {
  const recordes = (estado.recordes ??= { desde: estado.temporada, clubes: {} }).clubes;
  [p.mandante, p.visitante].forEach((clubeId, lado) => {
    if (estado.clubes[clubeId]?.serie === "D") return;
    const r = (recordes[clubeId] ??= { artilheiros: [] });
    const [pro, contra] = lado === 0 ? [p.gm, p.gv] : [p.gv, p.gm];
    const adversario = lado === 0 ? p.visitante : p.mandante;
    const jogo: JogoRecorde = { temporada: estado.temporada, data: p.data, adversario, pro, contra, competicao: p.serie, publico: p.publico };
    const maior = (a: JogoRecorde, b?: JogoRecorde) => !b || Math.abs(a.pro - a.contra) > Math.abs(b.pro - b.contra) || (a.pro - a.contra === b.pro - b.contra && Math.max(a.pro, a.contra) > Math.max(b.pro, b.contra));
    if (pro > contra && maior(jogo, r.maiorVitoria)) r.maiorVitoria = jogo;
    if (pro < contra && maior(jogo, r.piorDerrota)) r.piorDerrota = jogo;
    if (lado === 0 && !p.neutro && p.publico && p.publico > (r.maiorPublico?.publico ?? 0)) r.maiorPublico = jogo;
    let novo = false;
    for (const e of p.eventos) {
      if ((e.tipo !== "gol" && e.tipo !== "gol-penalti") || e.lado !== lado || e.jogador == null) continue;
      const nome = estado.jogadores[e.jogador]?.nome;
      if (!nome) continue;
      const atual = r.artilheiros.find((a) => a.id === e.jogador);
      if (atual) atual.gols++;
      else { r.artilheiros.push({ id: e.jogador, nome, gols: 1 }); novo = true; }
    }
    r.artilheiros.sort((a, b) => b.gols - a.gols);
    // Quem ainda é do clube fica na lista (continua somando); de quem saiu, só os primeiros.
    if (novo) r.artilheiros = r.artilheiros.filter((a, i) => i < MAXIMO_ARTILHEIROS || aindaNoClube(estado, a.id, clubeId));
  });
}

function aindaNoClube(estado: EstadoJogo, jogadorId: number, clubeId: string) {
  const j = estado.jogadores[jogadorId];
  return !!j && (j.clubeId === clubeId || j.emprestimo?.de === clubeId);
}

/** Save de antes da sala de troféus: os recordes da temporada em andamento, pelos jogos já disputados. */
export function montarRecordes(estado: EstadoJogo) {
  if (estado.recordes) return;
  estado.recordes = { desde: estado.temporada, clubes: {} };
  for (const p of estado.partidas.filter((x) => x.jogada).sort((a, b) => a.data.localeCompare(b.data))) registrarRecordes(estado, p);
}

export interface Titulo {
  temporada: number;
  titulo: string;
  clubeId: string;
}

/** Títulos e acessos de um clube em cada temporada do histórico (do mais recente ao mais antigo). */
export function titulosDoClube(estado: EstadoJogo, clubeId: string): Titulo[] {
  const lista: Titulo[] = [];
  for (const r of [...estado.historico].reverse()) {
    for (const s of SERIES) if (r.campeoes[s] === clubeId) lista.push({ temporada: r.temporada, titulo: `Campeão da ${NOME_SERIE[s]}`, clubeId });
    if (r.copa?.campeao === clubeId) lista.push({ temporada: r.temporada, titulo: "Campeão da Copa do Brasil", clubeId });
    if (r.copa?.vice === clubeId) lista.push({ temporada: r.temporada, titulo: "Vice da Copa do Brasil", clubeId });
    const subiu = (["B", "C"] as SerieId[]).find((s) => r.promovidos[s]?.includes(clubeId));
    if (subiu) lista.push({ temporada: r.temporada, titulo: `Acesso à ${NOME_SERIE[subiu === "B" ? "A" : "B"]}`, clubeId });
  }
  return lista;
}

/** A carreira do técnico: títulos do clube que ele treinava em cada fim de temporada, clubes por onde passou e objetivos. */
export function carreiraDoTecnico(estado: EstadoJogo) {
  const titulos = [...estado.historico].reverse().flatMap((r) => titulosDoClube({ ...estado, historico: [r] }, r.tecnico.clubeId));
  const t = estado.tecnico;
  const clubes = [...new Set([...(t.clubesAnteriores ?? []), ...estado.historico.map((r) => r.tecnico.clubeId), t.clubeId])];
  return {
    titulos,
    clubes,
    temporadas: estado.historico.length,
    objetivosCumpridos: estado.historico.filter((r) => r.tecnico.cumpriu).length,
  };
}

/** "5 x 0 contra o São Bernardo · Série B 2026" */
export function descreverRecorde(estado: EstadoJogo, j: JogoRecorde): string {
  return `${j.pro} x ${j.contra} ${contra(estado, j)}`;
}

/** "23.456 pagantes contra o Remo · Série B 2026" */
export function descreverPublico(estado: EstadoJogo, j: JogoRecorde): string {
  return `${(j.publico ?? 0).toLocaleString("pt-BR")} pagantes ${contra(estado, j)}`;
}

function contra(estado: EstadoJogo, j: JogoRecorde) {
  const clube = estado.clubes[j.adversario];
  return `contra ${clube ? comArtigo("o", clube) : j.adversario} · ${NOME_COMPETICAO[j.competicao]} ${j.temporada}`;
}

export type { RecordesClube };
