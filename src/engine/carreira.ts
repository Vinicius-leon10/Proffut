// Carreira do técnico: reputação, recado de cargo em risco, demissão por maus resultados, propostas de emprego
// depois da demissão e convites de clubes maiores (no meio da fase de liga e na virada da temporada).
import { comArtigo } from "./artigos";
import { diasEntre, formatarData, somarDias } from "./calendario";
import { FASE_LIGA, NOME_SERIE } from "./competicoes";
import { CARGO, CONVITES, REPUTACAO } from "./constantes";
import { definirObjetivo, situacaoDoObjetivo } from "./diretoria";
import { forcaDoTime } from "./forca";
import { limitar } from "./gerador";
import { elencoDe } from "./mercado";
import { enviarMensagem } from "./mensagens";
import { rngPara } from "./rng";
import type { EstadoJogo, Partida, SerieClube, SerieId } from "./tipos";

const ORDEM_SERIE: Record<SerieClube, number> = { A: 0, B: 1, C: 2, D: 3 };

/** Reputação do técnico; nos saves de antes dela, a do clube atual. */
export function reputacaoDoTecnico(estado: EstadoJogo): number {
  return estado.tecnico.reputacao ?? estado.clubes[estado.tecnico.clubeId].reputacao;
}

export function mudarReputacao(estado: EstadoJogo, delta: number) {
  estado.tecnico.reputacao = limitar(reputacaoDoTecnico(estado) + delta, REPUTACAO.minimo, REPUTACAO.maximo);
}

/**
 * Troca de clube: diretoria e torcida novas, objetivo novo; as propostas pelos jogadores do clube antigo e os
 * outros convites caem.
 */
export function assumirClube(estado: EstadoJogo, clubeId: string, { confianca = 55 } = {}) {
  const t = estado.tecnico;
  const anterior = estado.clubes[t.clubeId];
  for (const m of estado.mensagens) {
    if (m.proposta && !m.proposta.resolvida) m.proposta.resolvida = "retirada";
    if (m.convite && !m.convite.resolvido) m.convite.resolvido = "recusado";
  }
  for (const j of elencoDe(estado, anterior.id)) j.aVenda = false;
  t.clubeId = clubeId;
  t.confiancaDiretoria = confianca;
  t.confiancaTorcida = 50;
  t.desde = estado.data;
  delete t.demissao;
  delete t.avisoDeRisco;
  estado.objetivo = definirObjetivo(estado);
  const clube = estado.clubes[clubeId];
  enviarMensagem(estado, {
    tipo: "diretoria",
    titulo: `Bem-vindo ${comArtigo("ao", clube)}!`,
    texto: `Depois da passagem ${comArtigo("pelo", anterior)}, você assume ${comArtigo("o", clube)}. Objetivo: ${estado.objetivo.descricao}.`,
  });
}

/** Já passou o primeiro mês no clube (antes disso a diretoria não demite). */
export function passouDaCarencia(estado: EstadoJogo): boolean {
  const desde = estado.tecnico.desde;
  return !desde || diasEntre(desde, estado.data) >= CARGO.carenciaDias;
}

/** Depois de cada jogo do usuário: recado de cargo em risco, demissão e, no meio da fase de liga, convites. */
export function depoisDoMeuJogo(estado: EstadoJogo, p: Partida) {
  const t = estado.tecnico;
  if (t.demissao) return;
  t.desde ??= estado.data;
  const clube = estado.clubes[t.clubeId];
  if (t.confiancaDiretoria <= CARGO.demissao && passouDaCarencia(estado)) {
    demitir(estado, `A diretoria ${comArtigo("do", clube)} perdeu a paciência com os resultados e decidiu trocar de técnico.`);
    return;
  }
  if (t.confiancaDiretoria <= CARGO.aviso && (!t.avisoDeRisco || diasEntre(t.avisoDeRisco, estado.data) >= 30)) {
    t.avisoDeRisco = estado.data;
    enviarMensagem(estado, {
      tipo: "diretoria",
      titulo: "Cargo em risco",
      texto: `A diretoria ${comArtigo("do", clube)} está insatisfeita com os resultados. Se eles não melhorarem, você pode ser demitido.`,
    });
  }
  // No meio da fase de liga, quem está cumprindo o objetivo chama a atenção de clubes maiores.
  if (meioDaLiga(estado, p) && situacaoDoObjetivo(estado).situacao === "encaminhada") gerarConvites(estado, CONVITES.meioDaLiga);
}

function meioDaLiga(estado: EstadoJogo, p: Partida): boolean {
  if (p.serie === "CB" || p.fase !== FASE_LIGA[p.serie]) return false;
  const meu = estado.tecnico.clubeId;
  const daLiga = estado.partidas.filter((x) => x.serie === p.serie && x.fase === p.fase && (x.mandante === meu || x.visitante === meu));
  return daLiga.filter((x) => x.jogada).length === Math.ceil(daLiga.length / 2);
}

/** Demissão: a reputação cai e o técnico escolhe um dos três clubes que o querem. */
export function demitir(estado: EstadoJogo, motivo: string) {
  const t = estado.tecnico;
  mudarReputacao(estado, REPUTACAO.demissao);
  t.demissao = { data: estado.data, clubeId: t.clubeId, propostas: propostasAposDemissao(estado) };
  enviarMensagem(estado, { tipo: "diretoria", titulo: "Você foi demitido", texto: `${motivo} Três clubes querem você: escolha o seu novo time.` });
}

/** Clubes das Séries A, B e C (fora o que demitiu) com reputação até a do técnico: três dos oito mais perto dela. */
function propostasAposDemissao(estado: EstadoJogo): string[] {
  const reputacao = reputacaoDoTecnico(estado);
  const clubes = Object.values(estado.clubes).filter((c) => c.serie !== "D" && c.id !== estado.tecnico.clubeId);
  const ate = clubes.filter((c) => c.reputacao <= reputacao).sort((a, b) => b.reputacao - a.reputacao);
  const lista = (ate.length >= 3 ? ate : [...clubes].sort((a, b) => a.reputacao - b.reputacao)).slice(0, 8);
  return rngPara(estado.semente, `demissao/${estado.data}`).embaralhar(lista.map((c) => c.id)).slice(0, 3);
}

/**
 * Convites de clubes maiores: da mesma série ou de uma acima, com reputação maior que a do clube atual (com folga)
 * e até a do técnico mais o alcance. Ficam na caixa de mensagens até a data limite.
 */
export function gerarConvites(estado: EstadoJogo, quantos: number): string[] {
  const atual = estado.clubes[estado.tecnico.clubeId];
  const teto = Math.max(reputacaoDoTecnico(estado), atual.reputacao) + CONVITES.alcance;
  const pendentes = new Set(estado.mensagens.flatMap((m) => (m.convite && !m.convite.resolvido ? [m.convite.clubeId] : [])));
  const candidatos = Object.values(estado.clubes).filter((c) =>
    c.serie !== "D" && c.id !== atual.id && !pendentes.has(c.id) && ORDEM_SERIE[c.serie] <= ORDEM_SERIE[atual.serie] &&
    c.reputacao > atual.reputacao + CONVITES.folga && c.reputacao <= teto);
  const escolhidos = rngPara(estado.semente, `convites/${estado.data}`).embaralhar(candidatos).slice(0, quantos);
  const validaAte = somarDias(estado.data, CONVITES.validadeDias);
  for (const c of escolhidos) {
    enviarMensagem(estado, {
      tipo: "convite",
      titulo: `Convite ${comArtigo("do", c)}`,
      texto: `${comArtigo("O", c)} quer você como técnico. Joga a ${NOME_SERIE[c.serie as SerieId]}, com elenco de força ${Math.round(forcaDoTime(elencoDe(estado, c.id)))}. Responda até ${formatarData(validaAte)}.`,
      convite: { clubeId: c.id, validaAte },
    });
  }
  return escolhidos.map((c) => c.id);
}

export function responderConvite(estado: EstadoJogo, mensagemId: number, aceitar: boolean): { ok: boolean; texto: string } {
  const c = estado.mensagens.find((m) => m.id === mensagemId)?.convite;
  if (!c || c.resolvido || estado.tecnico.demissao) return { ok: false, texto: "Esse convite não está mais valendo." };
  const clube = estado.clubes[c.clubeId];
  if (!aceitar) {
    c.resolvido = "recusado";
    return { ok: true, texto: `Convite ${comArtigo("do", clube)} recusado.` };
  }
  c.resolvido = "aceito";
  assumirClube(estado, clube.id, { confianca: 65 });
  return { ok: true, texto: `Você assumiu ${comArtigo("o", clube)}!` };
}

export function expirarConvites(estado: EstadoJogo, data: string) {
  for (const m of estado.mensagens) if (m.convite && !m.convite.resolvido && m.convite.validaAte < data) m.convite.resolvido = "expirado";
}
