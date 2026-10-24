// Objetivo da temporada e confiança da diretoria e da torcida.
import { forcaDoTime } from "./forca";
import { posicaoNaLiga } from "./competicoes";
import { limitar } from "./gerador";
import type { EstadoJogo, Objetivo, Partida, SerieId } from "./tipos";

/** Metas por série, da mais ambiciosa (clube mais forte) para a mais modesta. */
const METAS: Record<SerieId, { ate: number; objetivo: Objetivo }[]> = {
  A: [
    { ate: 2, objetivo: { descricao: "Brigar pelo título (terminar entre os 3)", posicaoAlvo: 3 } },
    { ate: 6, objetivo: { descricao: "Vaga na Libertadores (terminar entre os 6)", posicaoAlvo: 6 } },
    { ate: 12, objetivo: { descricao: "Terminar na primeira metade (até 10º)", posicaoAlvo: 10 } },
    { ate: 20, objetivo: { descricao: "Não cair (terminar até 16º)", posicaoAlvo: 16 } },
  ],
  B: [
    { ate: 3, objetivo: { descricao: "Subir direto (terminar entre os 2)", posicaoAlvo: 2 } },
    { ate: 8, objetivo: { descricao: "Ir ao playoff de acesso (terminar entre os 6)", posicaoAlvo: 6 } },
    { ate: 14, objetivo: { descricao: "Fazer campanha segura (até 12º)", posicaoAlvo: 12 } },
    { ate: 20, objetivo: { descricao: "Não cair (terminar até 16º)", posicaoAlvo: 16 } },
  ],
  C: [
    { ate: 5, objetivo: { descricao: "Classificar para os quadrangulares em boa posição (até 4º)", posicaoAlvo: 4 } },
    { ate: 10, objetivo: { descricao: "Classificar para os quadrangulares (até 8º)", posicaoAlvo: 8 } },
    { ate: 20, objetivo: { descricao: "Não cair (terminar até 18º)", posicaoAlvo: 18 } },
  ],
};

export function definirObjetivo(estado: EstadoJogo): Objetivo {
  const meu = estado.clubes[estado.tecnico.clubeId];
  const serie = meu.serie === "D" ? "C" : meu.serie;
  const forcas = Object.values(estado.clubes)
    .filter((c) => c.serie === serie)
    .map((c) => ({ id: c.id, forca: forcaDoTime(Object.values(estado.jogadores).filter((j) => j.clubeId === c.id)) }))
    .sort((a, b) => b.forca - a.forca);
  const ranking = forcas.findIndex((f) => f.id === meu.id) + 1;
  return METAS[serie].find((m) => ranking <= m.ate)!.objetivo;
}

export type SituacaoObjetivo = "encaminhada" | "em-risco" | "abaixo";

export function situacaoDoObjetivo(estado: EstadoJogo): { situacao: SituacaoObjetivo; posicao: number } {
  const posicao = posicaoNaLiga(estado, estado.tecnico.clubeId);
  const alvo = estado.objetivo.posicaoAlvo;
  const situacao: SituacaoObjetivo = posicao <= alvo ? "encaminhada" : posicao <= alvo + 3 ? "em-risco" : "abaixo";
  return { situacao, posicao };
}

/** Depois de cada jogo do usuário: resultado mexe com diretoria e torcida. */
export function atualizarConfianca(estado: EstadoJogo, p: Partida) {
  const meu = estado.tecnico.clubeId;
  const emCasa = p.mandante === meu;
  const pro = emCasa ? p.gm : p.gv;
  const contra = emCasa ? p.gv : p.gm;
  const saldo = pro - contra;
  const t = estado.tecnico;
  const rival = estado.clubes[meu].rival === (emCasa ? p.visitante : p.mandante);
  let d = saldo > 0 ? 3 : saldo === 0 ? (emCasa ? -1 : 1) : -3;
  let torcida = saldo > 0 ? 4 : saldo === 0 ? 0 : -4;
  if (saldo >= 3) torcida += 2;
  if (saldo <= -3) { d -= 2; torcida -= 3; }
  if (rival) torcida *= 2;
  const { situacao } = situacaoDoObjetivo(estado);
  if (situacao === "encaminhada") d += 1;
  if (situacao === "abaixo") d -= 1;
  t.confiancaDiretoria = limitar(t.confiancaDiretoria + d, 0, 100);
  t.confiancaTorcida = limitar(t.confiancaTorcida + torcida, 0, 100);
}
