// Modo Copa do Mundo (nov/2026): pedido "quero criar um ambiente diferente no jogo quando acontecer uma Copa do Mundo...
// se eu tiver convocado vou participar da Copa jogando, mas se eu não tiver sido técnico de alguma seleção... vou assistir
// de uma maneira rápida esse evento... o jogo todo vai parar para esse evento". Proposta aprovada (artifact "Modo Copa do
// Mundo"): os clubes param (R115, calendario.ts), a Copa abre com uma tela própria, o técnico de uma seleção classificada
// joga a Copa inteira e quem não é assiste uma fase por toque (ou pula para o campeão), com a final ao vivo só assistindo;
// no fim, o campeão e os prêmios.
import { janelaDaCopa } from "./calendario";
import { jogosPendentesHoje, processarDias, proximaDataComJogo, simularDia } from "./jogo";
import { competicoesDoUsuario } from "./torneios";
import type { EstadoCompeticaoSelecoes, EstadoJogo, IdCompeticaoSelecoes, Jogador, Partida } from "./tipos";

/** As fases da Copa do Mundo, na ordem. */
export const FASES_DA_COPA = ["grupos", "dezesseis", "oitavas", "quartas", "semi", "final"] as const;
export type FaseDaCopa = (typeof FASES_DA_COPA)[number];

export const idDaCopaDoMundo = (ano: number) => `S-COPA-${ano}` as IdCompeticaoSelecoes;

/** A Copa do Mundo do ano em andamento (só nos anos de Copa, depois que ela foi montada). */
export function copaDoMundoDoAno(estado: EstadoJogo): EstadoCompeticaoSelecoes | undefined {
  const comp = estado.selecoes?.competicoes[idDaCopaDoMundo(estado.temporada)];
  return comp && comp.fase !== "aguardando" ? comp : undefined;
}

/**
 * O jogo está no Modo Copa: a Copa do ano foi montada, a data chegou à abertura e o usuário ainda não voltou à temporada
 * ("Continuar a temporada" na tela do campeão).
 */
export function emModoCopa(estado: EstadoJogo): boolean {
  const comp = copaDoMundoDoAno(estado);
  const janela = janelaDaCopa(estado.temporada);
  if (!comp || !janela || estado.data < janela.de) return false;
  // Quem passou da Copa sem entrar nela (simulando a temporada) não volta para ela depois.
  if (estado.data > janela.ate && !aberturaVista(estado)) return false;
  return estado.modoCopa?.fim !== estado.temporada;
}

/** O usuário já passou pela tela de abertura da Copa deste ano. */
export const aberturaVista = (estado: EstadoJogo) => estado.modoCopa?.abertura === estado.temporada;

/** Os jogos de uma fase da Copa. */
export function jogosDaFaseDaCopa(estado: EstadoJogo, fase: string): Partida[] {
  const id = idDaCopaDoMundo(estado.temporada);
  return estado.partidas.filter((p) => p.serie === id && p.fase === fase);
}

/** A fase já foi jogada inteira. */
export function faseDaCopaJogada(estado: EstadoJogo, fase: string): boolean {
  const jogos = jogosDaFaseDaCopa(estado, fase);
  return jogos.length > 0 && jogos.every((p) => p.jogada);
}

/** A última fase jogada inteira (ou nenhuma, antes do fim dos grupos). */
export function ultimaFaseJogada(estado: EstadoJogo): FaseDaCopa | undefined {
  return [...FASES_DA_COPA].reverse().find((f) => faseDaCopaJogada(estado, f));
}

/** A próxima fase a jogar (ou nenhuma, depois da final). */
export function proximaFaseDaCopa(estado: EstadoJogo): FaseDaCopa | undefined {
  return FASES_DA_COPA.find((f) => !faseDaCopaJogada(estado, f));
}

/** Vencedor de um jogo do mata-mata (pênaltis no empate). */
export function vencedorNaCopa(p: Partida): string {
  if (p.gm !== p.gv) return p.gm > p.gv ? p.mandante : p.visitante;
  return p.penaltis && p.penaltis[1] > p.penaltis[0] ? p.visitante : p.mandante;
}

/** A seleção ainda está na Copa: nos grupos, ou com jogo na fase em andamento sem ter perdido. */
export function aindaNaCopa(estado: EstadoJogo, selId: string): boolean {
  const comp = copaDoMundoDoAno(estado);
  if (!comp || !comp.selecoes.includes(selId) || comp.fase === "encerrada") return false;
  if (comp.fase === "grupos") return true;
  const jogo = jogosDaFaseDaCopa(estado, comp.fase).find((p) => p.mandante === selId || p.visitante === selId);
  return !!jogo && (!jogo.jogada || vencedorNaCopa(jogo) === selId);
}

/** A seleção que o técnico dirige na Copa, enquanto ela está viva (senão ele assiste o resto, como espectador). */
export function minhaSelecaoNaCopa(estado: EstadoJogo): string | undefined {
  const sel = estado.tecnico.selecao;
  return sel && aindaNaCopa(estado, sel) ? sel : undefined;
}

/** A final (marcada quando as semifinais acabam). */
export const finalDaCopa = (estado: EstadoJogo): Partida | undefined => jogosDaFaseDaCopa(estado, "final")[0];

/**
 * Espectador: joga os dias da Copa (e o que mais houver no calendário) até a fase `ate` acabar; com `ate` "antes-da-final",
 * para no dia da final, antes do jogo (para ele escolher assistir ao vivo ou ver só o resultado).
 */
export function avancarNaCopa(estado: EstadoJogo, ate: FaseDaCopa | "antes-da-final") {
  const chegou = () => {
    if (ate !== "antes-da-final") return faseDaCopaJogada(estado, ate);
    const final = finalDaCopa(estado);
    return !!final && (final.jogada || final.data === estado.data);
  };
  for (let seguranca = 0; seguranca < 400 && !chegou(); seguranca++) {
    if (jogosPendentesHoje(estado).length) {
      simularDia(estado);
      continue;
    }
    const proxima = proximaDataComJogo(estado);
    if (!proxima) break;
    processarDias(estado, proxima);
  }
}

// ---- prêmios ---------------------------------------------------------------------------------------------

export interface PremiosDaCopa {
  campeao: string;
  vice: string;
  final: Partida;
  artilheiro?: { jogador: Jogador; gols: number };
  melhor?: Jogador;
  goleiro?: Jogador;
  zebra?: { selecao: string; fase: string };
}

const PESO_DA_FASE: Record<string, number> = { grupos: 0, dezesseis: 1, oitavas: 2, quartas: 3, semi: 4, final: 5 };

/**
 * Os prêmios da Copa que acabou. Artilheiro: quem fez mais gols (os autores vêm de cada jogo). Melhor jogador: entre os
 * das 4 seleções que chegaram à semifinal, gols, a campanha da seleção e a força dele. Melhor goleiro: o titular da
 * seleção que sofreu menos gols por jogo entre as 4. Zebra: a seleção que foi mais longe em relação ao ranking do começo.
 */
export function premiosDaCopa(estado: EstadoJogo): PremiosDaCopa | undefined {
  const comp = copaDoMundoDoAno(estado);
  const final = finalDaCopa(estado);
  if (!comp || !final?.jogada) return undefined;
  const campeao = vencedorNaCopa(final);
  const vice = campeao === final.mandante ? final.visitante : final.mandante;
  const jogos = estado.partidas.filter((p) => p.serie === comp.id && p.jogada);
  // Até onde cada seleção foi (0: grupos ... 5: final; o campeão, 6).
  const alcance = new Map<string, number>();
  for (const p of jogos) for (const id of [p.mandante, p.visitante]) alcance.set(id, Math.max(alcance.get(id) ?? 0, PESO_DA_FASE[p.fase] ?? 0));
  alcance.set(campeao, 6);
  const gols = new Map<number, number>();
  for (const p of jogos) for (const e of p.eventos) if ((e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador != null) gols.set(e.jogador, (gols.get(e.jogador) ?? 0) + 1);
  const jogador = (id: number) => estado.jogadores[id];
  const artilheiroId = [...gols].filter(([id]) => jogador(id)).sort((a, b) => b[1] - a[1] || jogador(b[0]).forca - jogador(a[0]).forca)[0];
  const semifinalistas = [...alcance].filter(([, a]) => a >= 4).map(([id]) => id);
  const convocados = (sel: string) => (estado.selecoes?.convocados[sel] ?? []).map(jogador).filter((j): j is Jogador => !!j);
  const candidatos = semifinalistas.flatMap((sel) => convocados(sel).map((j) => ({ j, sel })));
  const nota = ({ j, sel }: { j: Jogador; sel: string }) => (gols.get(j.id) ?? 0) * 2 + (alcance.get(sel) ?? 0) + j.forca / 10;
  const melhor = candidatos.sort((a, b) => nota(b) - nota(a) || a.j.id - b.j.id)[0]?.j;
  const sofridos = (sel: string) => {
    const doTime = jogos.filter((p) => p.mandante === sel || p.visitante === sel);
    return doTime.reduce((t, p) => t + (p.mandante === sel ? p.gv : p.gm), 0) / Math.max(1, doTime.length);
  };
  const muralha = [...semifinalistas].sort((a, b) => sofridos(a) - sofridos(b) || (alcance.get(b) ?? 0) - (alcance.get(a) ?? 0))[0];
  const goleiro = muralha ? convocados(muralha).filter((j) => j.posicao === "G").sort((a, b) => b.forca - a.forca)[0] : undefined;
  // A zebra: quem foi mais longe do que o lugar dela no ranking do começo da Copa prometia.
  const esperado = (pos: number) => (pos < 2 ? 5 : pos < 4 ? 4 : pos < 8 ? 3 : pos < 16 ? 2 : pos < 32 ? 1 : 0);
  const surpresa = comp.selecoes.map((sel, pos) => ({ sel, ganho: (alcance.get(sel) ?? 0) - esperado(pos), pos }))
    .filter((x) => x.ganho > 0).sort((a, b) => b.ganho - a.ganho || b.pos - a.pos)[0];
  const FASE: Record<number, string> = { 1: "16 avos de final", 2: "oitavas de final", 3: "quartas de final", 4: "semifinal", 5: "final", 6: "título" };
  return {
    campeao, vice, final,
    ...(artilheiroId ? { artilheiro: { jogador: jogador(artilheiroId[0]), gols: artilheiroId[1] } } : {}),
    ...(melhor ? { melhor } : {}), ...(goleiro ? { goleiro } : {}),
    ...(surpresa ? { zebra: { selecao: surpresa.sel, fase: FASE[alcance.get(surpresa.sel) ?? 0] ?? "" } } : {}),
  };
}

/**
 * Botão Avançar antes da Copa: se o próximo dia com jogo que o usuário acompanha já é dentro da janela da Copa, passa os
 * dias (e os jogos de fora que houver) até a abertura e para lá, para a Copa abrir com a tela dela. Devolve true quando
 * parou na abertura; false quando o Avançar de sempre deve seguir (há um jogo dele antes, ou não é ano de Copa).
 */
export function pararNaAberturaDaCopa(estado: EstadoJogo): boolean {
  const janela = janelaDaCopa(estado.temporada);
  if (!janela || aberturaVista(estado) || estado.data >= janela.de) return false;
  if (!estado.selecoes?.competicoes[idDaCopaDoMundo(estado.temporada)]) return false;
  const acompanha = competicoesDoUsuario(estado);
  for (let seguranca = 0; seguranca < 400; seguranca++) {
    const pendentes = jogosPendentesHoje(estado);
    if (pendentes.length) {
      if (pendentes.some((p) => acompanha.has(p.serie))) return false;
      simularDia(estado);
      continue;
    }
    const proxima = proximaDataComJogo(estado);
    if (!proxima) return false;
    if (proxima >= janela.de) {
      processarDias(estado, janela.de);
      return true;
    }
    processarDias(estado, proxima);
  }
  return false;
}
