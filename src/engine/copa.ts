// Copa do Brasil com o regulamento de 2026: 126 clubes; da 1ª à 4ª fase, jogo único na casa do pior
// colocado no ranking (empate vai para os pênaltis); da 5ª fase à semifinal, ida e volta (empate no
// agregado, pênaltis); final em jogo único, em campo neutro. A Série A entra na 5ª fase.
// Como as fases iniciais de verdade são em fevereiro e março, aqui elas caem nas quartas-feiras de abril.
import { comArtigo, concorda } from "./artigos";
import { inicioDaTemporada, somarDias } from "./calendario";
import { agregado, chavesDaFase, vencedorDaChave } from "./competicoes";
import { COTA_COPA, ESCALA_COPA, PREMIO_FINAL_COPA } from "./constantes";
import { lancar } from "./financas";
import { gerarElencoCopa } from "./gerador";
import { elencoDe } from "./mercado";
import { enviarMensagem } from "./mensagens";
import { rngPara } from "./rng";
import type { EstadoJogo, FaseCopa, Partida } from "./tipos";

export const NOME_COPA = "Copa do Brasil";
export const FASES_COPA: FaseCopa[] = ["fase1", "fase2", "fase3", "fase4", "fase5", "oitavas", "quartas", "semi", "final"];
export const NOME_FASE_COPA: Record<FaseCopa, string> = {
  fase1: "1ª fase", fase2: "2ª fase", fase3: "3ª fase", fase4: "4ª fase", fase5: "5ª fase",
  oitavas: "Oitavas de final", quartas: "Quartas de final", semi: "Semifinal", final: "Final",
};
/** A fase numa frase: "na 1ª fase", "nas oitavas de final", "da semifinal"... */
function comFase(preposicao: "na" | "da", fase: FaseCopa): string {
  const plural = fase === "oitavas" || fase === "quartas" ? "s" : "";
  return `${preposicao}${plural} ${fase.startsWith("fase") ? NOME_FASE_COPA[fase] : NOME_FASE_COPA[fase].toLowerCase()}`;
}
const IDA_E_VOLTA: FaseCopa[] = ["fase5", "oitavas", "quartas", "semi"];
/** Fases em que o sorteio separa os clubes em dois potes pelo ranking (melhor metade contra pior metade). */
const COM_POTES: FaseCopa[] = ["fase1", "fase2", "fase3", "fase4", "fase5"];
/** Semanas (a partir do primeiro sábado de abril) das quartas-feiras de cada fase: [jogo] ou [ida, volta]. */
const SEMANAS: Record<FaseCopa, number[]> = {
  fase1: [0], fase2: [1], fase3: [2], fase4: [3], fase5: [4, 6], oitavas: [13, 14], quartas: [18, 19], semi: [28, 29], final: [34],
};
/** Em 2026 entraram direto na 3ª fase os campeões da Copa Verde (Paysandu), da Série C (Ponte Preta)
 *  e da Série D de 2025 (Barra-SC), e o Confiança, no lugar do Bahia (Copa do Nordeste). */
const DIRETOS_3A_FASE_2026 = ["paysandu", "ponte-preta", "barra-sc", "confianca"];
const ORDEM_SERIE = { A: 0, B: 1, C: 2, D: 3 } as const;

/** Ranking da Copa: Série A, B, C e D, e dentro de cada uma a reputação do clube. */
export function rankingDaCopa(estado: EstadoJogo): string[] {
  return Object.values(estado.clubes)
    .sort((a, b) => ORDEM_SERIE[a.serie] - ORDEM_SERIE[b.serie] || b.reputacao - a.reputacao || a.id.localeCompare(b.id))
    .map((c) => c.id);
}

const quarta = (ano: number, semana: number) => somarDias(inicioDaTemporada(ano), semana * 7 + 4);

export function jogosDaCopa(estado: EstadoJogo, fase?: FaseCopa): Partida[] {
  return estado.partidas.filter((p) => p.serie === "CB" && (fase == null || p.fase === fase));
}

/** Em que fase o clube entra (ou undefined, se não joga a Copa). */
export function faseDeEntrada(estado: EstadoJogo, clubeId: string): FaseCopa | undefined {
  const entram = estado.copa?.entram ?? {};
  return FASES_COPA.find((f) => entram[f]?.includes(clubeId));
}

/** Monta a Copa da temporada: participantes, elencos de quem é da Série D e o sorteio da 1ª fase. */
export function criarCopa(estado: EstadoJogo) {
  const ano = estado.temporada;
  const ranking = rankingDaCopa(estado);
  const serieA = ranking.filter((id) => estado.clubes[id].serie === "A");
  // Vagas diretas na 3ª fase: em 2026, as de verdade; depois, os 4 que subiram da Série C.
  const indicados = estado.historico.length ? estado.historico[estado.historico.length - 1].promovidos.C : DIRETOS_3A_FASE_2026;
  const diretos = indicados.filter((id) => estado.clubes[id] && estado.clubes[id].serie !== "A");
  for (const id of ranking) if (diretos.length < 4 && estado.clubes[id].serie === "B" && !diretos.includes(id)) diretos.push(id);
  const outros = ranking.filter((id) => !serieA.includes(id) && !diretos.includes(id));
  const fase2 = outros.slice(0, 74);
  const fase1 = outros.slice(74, 102);
  const participantes = new Set([...serieA, ...diretos, ...fase2, ...fase1]);
  estado.copa = { fase: "fase1", ranking: ranking.filter((id) => participantes.has(id)), entram: { fase1, fase2, fase3: diretos, fase5: serieA } };

  const rng = rngPara(estado.semente, `copa/${ano}/elencos`);
  for (const id of participantes) {
    const clube = estado.clubes[id];
    if (clube.serie !== "D" || elencoDe(estado, id).length) continue;
    for (const j of gerarElencoCopa(rng, clube, () => estado.proximoIdJogador++)) estado.jogadores[j.id] = j;
    clube.elencoDaCopa = true;
  }

  const meu = estado.tecnico.clubeId;
  const entrada = faseDeEntrada(estado, meu);
  if (entrada) {
    enviarMensagem(estado, {
      tipo: "noticia",
      titulo: `${NOME_COPA} ${ano}`,
      texto: `São 126 clubes. ${comArtigo("O", estado.clubes[meu])} entra ${comFase("na", entrada)}${entrada === "fase5" ? ", junto com toda a Série A" : ""}. Até a 4ª fase é jogo único na casa do time de pior ranking, com pênaltis se empatar; da 5ª fase à semifinal, ida e volta; a final é em jogo único, em campo neutro.`,
    });
  }
  sortear(estado, "fase1", fase1);
}

/** Sorteia os confrontos da fase, marca os jogos e paga a cota de participação. */
function sortear(estado: EstadoJogo, fase: FaseCopa, clubes: string[]) {
  const ano = estado.temporada;
  const copa = estado.copa!;
  const rng = rngPara(estado.semente, `copa/${ano}/${fase}`);
  const pos = (id: string) => copa.ranking.indexOf(id);
  const ordem = [...clubes].sort((a, b) => pos(a) - pos(b));
  const pares: [melhor: string, pior: string][] = [];
  if (COM_POTES.includes(fase)) {
    const metade = ordem.length / 2;
    const pote2 = rng.embaralhar(ordem.slice(metade));
    ordem.slice(0, metade).forEach((melhor, i) => pares.push([melhor, pote2[i]]));
  } else {
    const sorteados = rng.embaralhar(ordem);
    for (let i = 0; i + 1 < sorteados.length; i += 2) {
      const [a, b] = [sorteados[i], sorteados[i + 1]];
      pares.push(pos(a) < pos(b) ? [a, b] : [b, a]);
    }
  }
  const datas = SEMANAS[fase].map((s) => quarta(ano, s));
  const base = { serie: "CB" as const, fase, jogada: false, gm: 0, gv: 0, eventos: [] };
  pares.forEach(([melhor, pior], i) => {
    const chave = i + 1;
    if (fase === "final") {
      estado.partidas.push({ ...base, id: `${ano}-CB-final`, chave, rodada: 1, data: datas[0], mandante: melhor, visitante: pior, neutro: true });
    } else if (IDA_E_VOLTA.includes(fase)) {
      // O mais bem colocado no ranking decide em casa.
      estado.partidas.push({ ...base, id: `${ano}-CB-${fase}-${chave}-ida`, chave, rodada: 1, perna: 1, data: datas[0], mandante: pior, visitante: melhor });
      estado.partidas.push({ ...base, id: `${ano}-CB-${fase}-${chave}-volta`, chave, rodada: 2, perna: 2, data: datas[1], mandante: melhor, visitante: pior });
    } else {
      estado.partidas.push({ ...base, id: `${ano}-CB-${fase}-${chave}`, chave, rodada: 1, data: datas[0], mandante: pior, visitante: melhor });
    }
  });
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));

  if (fase !== "final") {
    const [serieB, demais] = COTA_COPA[fase];
    for (const id of clubes) {
      const clube = estado.clubes[id];
      lancar(clube, estado.data, "premiacao", `Copa do Brasil: cota ${comFase("da", fase)}`, (clube.serie === "B" ? serieB : demais) * ESCALA_COPA);
    }
  }

  const meu = estado.tecnico.clubeId;
  const meuPar = pares.find((p) => p.includes(meu));
  if (meuPar) {
    const adversario = estado.clubes[meuPar[0] === meu ? meuPar[1] : meuPar[0]];
    const jogos = jogosDaCopa(estado, fase).filter((p) => p.mandante === meu || p.visitante === meu);
    const quando = jogos.map((p) => `${p.mandante === meu ? "em casa" : p.neutro ? "em campo neutro" : "fora"} em ${p.data.slice(8, 10)}/${p.data.slice(5, 7)}`).join(" e ");
    enviarMensagem(estado, {
      tipo: "noticia",
      titulo: `${NOME_COPA}: ${NOME_FASE_COPA[fase]}`,
      texto: `Sorteio feito: ${estado.clubes[meu].nome} x ${adversario.nome}, ${quando}.${IDA_E_VOLTA.includes(fase) ? " Ida e volta; se empatar no agregado, pênaltis." : fase === "final" ? " Jogo único; se empatar, pênaltis." : " Jogo único; se empatar, pênaltis."}`,
    });
  }
}

/** Quem passou num confronto já decidido (jogo único ou ida e volta). */
export function vencedorDoConfronto(estado: EstadoJogo, fase: FaseCopa, chave: number): string | null {
  const jogos = jogosDaCopa(estado, fase).filter((p) => p.chave === chave);
  if (jogos.length === 1) {
    const [p] = jogos;
    if (!p.jogada) return null;
    if (p.gm !== p.gv) return p.gm > p.gv ? p.mandante : p.visitante;
    if (p.penaltis) return p.penaltis[0] > p.penaltis[1] ? p.mandante : p.visitante;
    return p.visitante;
  }
  const confronto = chavesDaFase(estado, "CB", fase).find((c) => c.chave === chave);
  return confronto ? vencedorDaChave(confronto) : null;
}

/** Placar agregado de um confronto de ida e volta, do ponto de vista de [mandante da volta, visitante da volta]. */
export function agregadoDoConfronto(estado: EstadoJogo, fase: FaseCopa, chave: number): [number, number] | null {
  const confronto = chavesDaFase(estado, "CB", fase).find((c) => c.chave === chave);
  return confronto?.ida && confronto.volta ? agregado(confronto) : null;
}

/** Depois de cada dia de jogos: fase da Copa encerrada vira o sorteio da próxima (ou o título). */
export function avancarCopa(estado: EstadoJogo): string[] {
  const copa = estado.copa;
  if (!copa || copa.fase === "encerrada") return [];
  const fase = copa.fase;
  const jogos = jogosDaCopa(estado, fase);
  if (!jogos.length || jogos.some((p) => !p.jogada)) return [];
  const nome = (id: string) => estado.clubes[id].nome;
  const meu = estado.tecnico.clubeId;
  const chaves = [...new Set(jogos.map((p) => p.chave!))].sort((a, b) => a - b);
  const vencedores = chaves.map((c) => vencedorDoConfronto(estado, fase, c)!);
  const eliminado = jogos.some((p) => p.mandante === meu || p.visitante === meu) && !vencedores.includes(meu);

  if (fase === "final") {
    const [final] = jogos;
    copa.campeao = vencedores[0];
    copa.vice = final.mandante === copa.campeao ? final.visitante : final.mandante;
    copa.fase = "encerrada";
    lancar(estado.clubes[copa.campeao], estado.data, "premiacao", "Copa do Brasil: campeão", PREMIO_FINAL_COPA.campeao * ESCALA_COPA);
    lancar(estado.clubes[copa.vice], estado.data, "premiacao", "Copa do Brasil: vice", PREMIO_FINAL_COPA.vice * ESCALA_COPA);
    const campeao = estado.clubes[copa.campeao];
    return [`${campeao.nome} é ${concorda(campeao, "campeão", "campeã")} da ${NOME_COPA} ${estado.temporada}! Vice: ${nome(copa.vice)}.`];
  }

  const noticias: string[] = [];
  const meuClube = estado.clubes[meu];
  if (eliminado) noticias.push(`${comArtigo("O", meuClube)} foi ${concorda(meuClube, "eliminado", "eliminada")} da ${NOME_COPA} ${comFase("na", fase)}.`);
  const proxima = FASES_COPA[FASES_COPA.indexOf(fase) + 1];
  sortear(estado, proxima, [...vencedores, ...(copa.entram[proxima] ?? [])]);
  copa.fase = proxima;
  if (proxima === "final") noticias.push(`Final da ${NOME_COPA}: ${vencedores.map(nome).join(" x ")}.`);
  return noticias;
}

/** Situação do clube na Copa, em uma frase (para a aba da Copa). */
export function situacaoNaCopa(estado: EstadoJogo, clubeId: string): string {
  const copa = estado.copa;
  const clube = estado.clubes[clubeId] ?? { id: clubeId, nome: clubeId };
  const nome = comArtigo("O", clube);
  if (!copa) return `A ${NOME_COPA} começa na próxima temporada.`;
  if (copa.campeao === clubeId) return `${nome} é ${concorda(clube, "o campeão", "a campeã")} da ${NOME_COPA}!`;
  const entrada = faseDeEntrada(estado, clubeId);
  if (!entrada) return `${nome} não disputa a ${NOME_COPA} nesta temporada.`;
  const jogou = jogosDaCopa(estado).filter((p) => p.mandante === clubeId || p.visitante === clubeId);
  if (!jogou.length) return `${nome} entra ${comFase("na", entrada)}.`;
  const ultima = jogou[jogou.length - 1].fase as FaseCopa;
  if (copa.vice === clubeId) return `${nome} foi ${concorda(clube, "vice-campeão", "vice-campeã")}.`;
  const vivo = copa.fase !== "encerrada" && (ultima === copa.fase || jogou.some((p) => p.fase === copa.fase));
  return vivo ? `${nome} está ${comFase("na", copa.fase as FaseCopa)}.` : `${nome} foi ${concorda(clube, "eliminado", "eliminada")} ${comFase("na", ultima)}.`;
}

/**
 * Depois de um jogo da Copa que fecha um confronto: quem passou, com o agregado e os pênaltis
 * quando houve. Vazio se o confronto não acabou (jogo de ida) ou se não é da Copa.
 */
export function desfechoDoConfronto(estado: EstadoJogo, p: Partida, clubeId: string): string {
  if (p.serie !== "CB" || p.perna === 1 || !p.jogada) return "";
  const fase = p.fase as FaseCopa;
  const vencedor = vencedorDoConfronto(estado, fase, p.chave!);
  if (!vencedor) return "";
  const clube = estado.clubes[clubeId];
  const nome = comArtigo("O", clube);
  const partes: string[] = [];
  if (p.perna === 2) {
    const ag = agregadoDoConfronto(estado, fase, p.chave!);
    if (ag) {
      const [m, v] = p.mandante === clubeId ? ag : [ag[1], ag[0]];
      partes.push(`Agregado: ${m} x ${v}.`);
    }
  }
  if (p.penaltis) {
    const [m, v] = p.mandante === clubeId ? p.penaltis : [p.penaltis[1], p.penaltis[0]];
    partes.push(`Nos pênaltis, ${m > v ? "vitória" : "derrota"} por ${m} x ${v}.`);
  }
  if (fase === "final") partes.push(vencedor === clubeId ? `${nome} é ${concorda(clube, "campeão", "campeã")} da ${NOME_COPA}!` : `${nome} fica com o vice.`);
  else partes.push(vencedor === clubeId ? `${nome} passou de fase.` : `${nome} está fora da ${NOME_COPA}.`);
  return partes.join(" ");
}
