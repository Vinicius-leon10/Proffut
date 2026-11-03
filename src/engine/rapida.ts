// Simulação rápida (nov/2026): os jogos dos campeonatos que o usuário só acompanha (as ligas de fora do Brasil) saem de
// uma vez, pela força dos dois times, sem lance a lance: só o placar e quem fez os gols. Com a América toda no jogo, a
// simulação completa de todos os jogos deixava a temporada lenta demais no iPhone. Os números (gols por jogo, vitórias do
// mandante, empates e o peso da força) foram ajustados para bater com os da simulação completa nas mesmas ligas
// (`RAPIDA` em constantes.ts).
import { RAPIDA } from "./constantes";
import { forcaDoTime } from "./forca";
import { rngPara, type Rng } from "./rng";
import type { Clube, EstadoJogo, Jogador, Partida, Posicao } from "./tipos";

/** Gols de um time com média `media` (Poisson). */
function gols(rng: Rng, media: number): number {
  let k = 0;
  let p = Math.exp(-media);
  let soma = p;
  const u = rng.real(0, 1);
  while (u > soma && k < 12) {
    k++;
    p *= media / k;
    soma += p;
  }
  return k;
}

/** Placar pela força dos dois times (a média dos 11 melhores); em campo neutro, sem a vantagem de jogar em casa. */
export function placarRapido(rng: Rng, forcaMandante: number, forcaVisitante: number, neutro = false): [number, number] {
  const d = forcaMandante - forcaVisitante;
  const mando = neutro ? 0 : RAPIDA.mando;
  return [gols(rng, RAPIDA.gols * Math.exp(RAPIDA.inclinacao * d + mando)), gols(rng, RAPIDA.gols * Math.exp(-RAPIDA.inclinacao * d - mando))];
}

/** Força do time para a simulação rápida: a dos 11 melhores do elenco; clube sem elenco, pela faixa da ficha dele. */
export function forcaRapida(clube: Clube, elenco: Jogador[]): number {
  if (elenco.length >= 11) return forcaDoTime(elenco);
  const { min, max } = clube.forcaElenco ?? { min: 40, max: 60 };
  return min + (max - min) * 0.7;
}

const PESO_GOL: Record<Posicao, number> = { G: 0, Z: 0.6, L: 0.8, M: 2.5, A: 5 };
const PESO_PASSE: Record<Posicao, number> = { G: 0.05, Z: 0.4, L: 1.5, M: 3, A: 2 };

/** Os 11 que entram: o goleiro mais forte e os 10 mais fortes da linha, fora os lesionados e os suspensos. */
function onze(elenco: Jogador[]): Jogador[] {
  const aptos = elenco.filter((j) => j.lesaoDias <= 0 && j.suspensaoJogos <= 0);
  const lista = (aptos.length >= 11 ? aptos : elenco).slice().sort((a, b) => b.forca - a.forca);
  const g = lista.find((j) => j.posicao === "G");
  const linha = lista.filter((j) => j !== g).slice(0, g ? 10 : 11);
  return g ? [g, ...linha] : linha;
}

/**
 * Joga uma partida do jeito rápido e registra: placar, gols (autor e, às vezes, quem deu o passe, com o minuto),
 * jogos e gols de cada jogador, e a moral dos clubes. Sem cartões, lesões nem cansaço. `elencos`: os jogadores de cada
 * clube no dia (montados uma vez em `concluirJogos`).
 */
export function jogarRapido(estado: EstadoJogo, p: Partida, elencos: Map<string, Jogador[]>, decidePorPenaltis: boolean) {
  const rng = rngPara(estado.semente, `rapida/${p.id}`);
  const mandante = estado.clubes[p.mandante];
  const visitante = estado.clubes[p.visitante];
  const elencoM = elencos.get(p.mandante) ?? [];
  const elencoV = elencos.get(p.visitante) ?? [];
  const [fm, fv] = [forcaRapida(mandante, elencoM), forcaRapida(visitante, elencoV)];
  const [gm, gv] = placarRapido(rng, fm, fv, !!p.neutro);
  const times = [onze(elencoM), onze(elencoV)];
  for (const time of times) {
    for (const j of time) j.temporada.jogos++;
    // Quem não jogou cumpre a suspensão, como na simulação completa.
  }
  for (const [i, elenco] of [elencoM, elencoV].entries()) {
    for (const j of elenco) if (j.suspensaoJogos > 0 && !times[i].includes(j)) j.suspensaoJogos--;
  }
  const eventos: { minuto: number; lado: 0 | 1; jogador?: number; outro?: number }[] = [];
  ([gm, gv] as const).forEach((n, lado) => {
    const time = times[lado];
    for (let k = 0; k < n; k++) {
      const minuto = rng.int(1, 90);
      const autor = time.length ? rng.escolherPeso(time, (j) => PESO_GOL[j.posicao] * j.forca + 0.01) : undefined;
      const outros = time.filter((j) => j !== autor);
      const passe = autor && outros.length && rng.chance(0.65) ? rng.escolherPeso(outros, (j) => PESO_PASSE[j.posicao] * j.forca + 0.01) : undefined;
      if (autor) autor.temporada.gols++;
      if (passe) passe.temporada.assistencias++;
      eventos.push({ minuto, lado: lado as 0 | 1, ...(autor ? { jogador: autor.id } : {}), ...(passe ? { outro: passe.id } : {}) });
    }
  });
  eventos.sort((a, b) => a.minuto - b.minuto);
  p.gm = gm;
  p.gv = gv;
  p.eventos = eventos.map((e) => ({ min: String(e.minuto), tipo: "gol" as const, lado: e.lado, ...(e.jogador != null ? { jogador: e.jogador } : {}), ...(e.outro != null ? { outro: e.outro } : {}), texto: "" }));
  if (gm === gv && decidePorPenaltis) {
    // Pênaltis: 5 cobranças de cada lado, um pouco a favor do time mais forte; empate segue nas alternadas.
    const chance = (f: number, g: number) => 0.75 + 0.004 * (f - g);
    let [a, b] = [0, 0];
    for (let k = 0; k < 5; k++) { if (rng.chance(chance(fm, fv))) a++; if (rng.chance(chance(fv, fm))) b++; }
    while (a === b) { if (rng.chance(chance(fm, fv))) a++; if (rng.chance(chance(fv, fm))) b++; }
    p.penaltis = [a, b];
  }
  p.jogada = true;
  const ajustar = (c: Clube, d: number) => { c.moral = Math.max(20, Math.min(100, c.moral + d)); };
  if (gm > gv) { ajustar(mandante, 6); ajustar(visitante, -6); }
  else if (gm < gv) { ajustar(mandante, -6); ajustar(visitante, 6); }
  else { ajustar(mandante, -1); ajustar(visitante, 1); }
}
