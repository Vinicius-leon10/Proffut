// Empréstimos até o fim da temporada: o usuário empresta um jogador dele (quem recebe paga o salário e ele ganha
// jogos) ou pega emprestado o reserva de outro clube (paga uma taxa e o salário). Na virada, todos voltam.
import { comArtigo } from "./artigos";
import { ELENCO_MAXIMO, EMPRESTIMOS } from "./constantes";
import { forcaDoTime } from "./forca";
import { lancar } from "./financas";
import { valorMercado } from "./gerador";
import { elencoDe, podeSair, reescalar, tirarDaEscalacao, type ResultadoNegocio } from "./mercado";
import type { EstadoJogo, Jogador } from "./tipos";

/** Pode ir emprestado? Devolve o motivo quando não pode. */
export function motivoParaNaoEmprestar(estado: EstadoJogo, j: Jogador): string | null {
  if (j.clubeId !== estado.tecnico.clubeId) return "Esse jogador não é do seu clube.";
  if (j.emprestimo) return `${j.nome} já está emprestado.`;
  if (j.contratoAte != null && j.contratoAte <= estado.temporada) return "Contrato no último ano: renove antes de emprestar.";
  if (!podeSair(estado, j)) return "O elenco ficaria abaixo do mínimo na posição.";
  return null;
}

/** Clubes que aceitam o jogador emprestado (até três, dos mais fortes para os mais fracos). */
export function interessadosNoEmprestimo(estado: EstadoJogo, j: Jogador): string[] {
  const margem = EMPRESTIMOS.margemForca + (j.idade <= 21 ? EMPRESTIMOS.margemJovem : 0);
  return Object.values(estado.clubes)
    .filter((c) => c.serie !== "D" && c.id !== j.clubeId)
    .map((c) => ({ c, elenco: elencoDe(estado, c.id) }))
    .filter(({ elenco }) => elenco.length < ELENCO_MAXIMO - 1)
    .map(({ c, elenco }) => ({ id: c.id, forca: forcaDoTime(elenco) }))
    .filter(({ forca }) => j.forca >= forca - margem)
    .sort((a, b) => b.forca - a.forca)
    .slice(0, 3)
    .map(({ id }) => id);
}

/** Leva o jogador para o clube que o recebe emprestado, até o fim da temporada. */
function mudarDeClube(estado: EstadoJogo, j: Jogador, destinoId: string) {
  const origemId = j.clubeId!;
  tirarDaEscalacao(estado, j);
  j.emprestimo = { de: origemId, ate: estado.temporada };
  j.clubeId = destinoId;
  j.aVenda = false;
  if (origemId !== estado.tecnico.clubeId) reescalar(estado, origemId);
  if (destinoId !== estado.tecnico.clubeId) reescalar(estado, destinoId);
  else if (estado.clubes[destinoId].escalacao.reservas.length < 7) estado.clubes[destinoId].escalacao.reservas.push(j.id);
}

/** O usuário empresta um jogador dele a um dos clubes interessados. */
export function emprestar(estado: EstadoJogo, jogadorId: number, clubeId: string): ResultadoNegocio {
  const j = estado.jogadores[jogadorId];
  if (!j) return { ok: false, texto: "Jogador inválido." };
  const motivo = motivoParaNaoEmprestar(estado, j);
  if (motivo) return { ok: false, texto: motivo };
  if (!interessadosNoEmprestimo(estado, j).includes(clubeId)) return { ok: false, texto: "Esse clube não quer o jogador agora." };
  const destino = estado.clubes[clubeId];
  mudarDeClube(estado, j, clubeId);
  return { ok: true, texto: `${j.nome} foi emprestado ${comArtigo("ao", destino)} até o fim de ${estado.temporada}. Lá ele joga e o salário é pago por eles.` };
}

export function taxaDeEmprestimo(j: Jogador): number {
  return Math.round((valorMercado(j) * EMPRESTIMOS.taxa) / 10_000) * 10_000;
}

/** O dono empresta ao usuário? Devolve o motivo quando não. */
export function motivoParaNaoPegar(estado: EstadoJogo, j: Jogador): string | null {
  const meu = estado.clubes[estado.tecnico.clubeId];
  if (!j.clubeId || j.clubeId === meu.id) return "Só dá para pegar emprestado jogador de outro clube.";
  const dono = estado.clubes[j.clubeId];
  if (j.emprestimo) return `${j.nome} já está emprestado ${comArtigo("ao", dono)}.`;
  if (dono.escalacao.titulares.includes(j.id)) return `É titular: ${comArtigo("o", dono)} não empresta.`;
  if (!podeSair(estado, j)) return `${comArtigo("O", dono)} ficaria sem opções na posição.`;
  if (elencoDe(estado, meu.id).length >= ELENCO_MAXIMO) return `Seu elenco já tem ${ELENCO_MAXIMO} jogadores.`;
  if (meu.caixa < taxaDeEmprestimo(j)) return "Você não tem caixa para a taxa do empréstimo.";
  return null;
}

/** O usuário pega emprestado um reserva de outro clube, pagando a taxa ao dono. */
export function pegarEmprestado(estado: EstadoJogo, jogadorId: number): ResultadoNegocio {
  const j = estado.jogadores[jogadorId];
  if (!j) return { ok: false, texto: "Jogador inválido." };
  const motivo = motivoParaNaoPegar(estado, j);
  if (motivo) return { ok: false, texto: motivo };
  const meu = estado.clubes[estado.tecnico.clubeId];
  const dono = estado.clubes[j.clubeId!];
  const taxa = taxaDeEmprestimo(j);
  if (taxa > 0) {
    lancar(meu, estado.data, "transferencia", `Empréstimo de ${j.nome}`, -taxa);
    lancar(dono, estado.data, "transferencia", `Empréstimo de ${j.nome}`, taxa);
  }
  mudarDeClube(estado, j, meu.id);
  return { ok: true, texto: `${j.nome} chegou emprestado ${comArtigo("pelo", dono)} até o fim de ${estado.temporada}.` };
}

/** Virada da temporada `ano`: os emprestados voltam aos clubes donos. Devolve os que eram do usuário ou estavam com ele. */
export function encerrarEmprestimos(estado: EstadoJogo, ano: number): { voltaram: Jogador[]; devolvidos: Jogador[] } {
  const meu = estado.tecnico.clubeId;
  const voltaram: Jogador[] = [];
  const devolvidos: Jogador[] = [];
  for (const j of Object.values(estado.jogadores)) {
    if (!j.emprestimo || j.emprestimo.ate > ano) continue;
    if (j.emprestimo.de === meu) voltaram.push(j);
    else if (j.clubeId === meu) devolvidos.push(j);
    j.clubeId = j.emprestimo.de;
    delete j.emprestimo;
  }
  return { voltaram, devolvidos };
}
