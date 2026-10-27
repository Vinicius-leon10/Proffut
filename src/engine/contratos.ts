// Contratos: cada jogador num clube tem uma última temporada de contrato. O usuário renova no último ano (o
// jogador pede um salário) ou perde o jogador de graça na virada; os clubes do computador renovam sozinhos.
import { CONTRATOS } from "./constantes";
import { salarioBase } from "./gerador";
import { enviarMensagem } from "./mensagens";
import { hashTexto, rngPara } from "./rng";
import type { EstadoJogo, Jogador } from "./tipos";

/** Quantas temporadas a mais um contrato novo (reforço ou renovação) pode ter, pela idade. */
export function anosMaximos(idade: number): number {
  return idade >= 33 ? 1 : idade >= 30 ? 2 : 3;
}

/** Contrato para quem está num clube e ainda não tem (jogo novo, save antigo, reforço sem contrato). */
export function garantirContratos(estado: EstadoJogo, primeiraTemporada: number) {
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId || j.contratoAte != null) continue;
    const anos = Math.min(CONTRATOS.anosIniciais, anosMaximos(j.idade) + 1);
    j.contratoAte = primeiraTemporada + (hashTexto(`contrato/${j.id}`, estado.semente) % anos);
  }
}

/** Contrato de quem chega a um clube (compra, livre contratado): o máximo para a idade. */
export function contratoNovo(estado: EstadoJogo, j: Jogador) {
  j.contratoAte = estado.temporada + anosMaximos(j.idade);
}

/** Saiu do clube sem ir para outro: livre, sem contrato. */
export function liberar(j: Jogador) {
  j.clubeId = null;
  j.aVenda = false;
  delete j.contratoAte;
}

export function ultimoAno(estado: EstadoJogo, j: Jogador): boolean {
  return j.contratoAte != null && j.contratoAte <= estado.temporada;
}

/** Jogadores do usuário (fora os que vieram emprestados) com o contrato terminando nesta temporada. */
export function contratosTerminando(estado: EstadoJogo): Jogador[] {
  const meu = estado.tecnico.clubeId;
  return Object.values(estado.jogadores).filter((j) => j.clubeId === meu && !j.emprestimo && ultimoAno(estado, j));
}

/** O salário que o jogador pede para renovar nesta temporada. */
export function pedidoDeRenovacao(estado: EstadoJogo, j: Jogador): number {
  const rng = rngPara(estado.semente, `renovacao/${j.id}/${estado.temporada}`);
  const titular = !!j.clubeId && estado.clubes[j.clubeId].escalacao.titulares.includes(j.id);
  let pedido = salarioBase(j.forca) * rng.real(0.95, 1.15);
  if (titular) pedido *= CONTRATOS.titular;
  if (j.idade <= 23 && j.potencial >= j.forca + 5) pedido *= CONTRATOS.promessa;
  if (j.idade >= 33) pedido *= CONTRATOS.veterano;
  const piso = j.salario * (j.idade < CONTRATOS.semCorteAte ? 1 : CONTRATOS.corteVeterano);
  return Math.round(Math.max(pedido, piso) / 500) * 500;
}

export function renovarContrato(estado: EstadoJogo, jogadorId: number, anos: number): { ok: boolean; texto: string } {
  const j = estado.jogadores[jogadorId];
  if (!j || j.clubeId !== estado.tecnico.clubeId || j.emprestimo) return { ok: false, texto: "Esse jogador não é do seu clube." };
  if (!ultimoAno(estado, j)) return { ok: false, texto: `O contrato de ${j.nome} ainda não está no último ano.` };
  if (anos < 1 || anos > anosMaximos(j.idade)) return { ok: false, texto: `${j.nome} aceita no máximo ${anosMaximos(j.idade)} ano(s).` };
  j.salario = pedidoDeRenovacao(estado, j);
  j.contratoAte = estado.temporada + anos;
  return { ok: true, texto: `${j.nome} renovou até ${j.contratoAte}. Salário: R$ ${j.salario.toLocaleString("pt-BR")}/mês.` };
}

/** Uma vez por temporada, a lista de quem tem o contrato terminando. */
export function avisarContratos(estado: EstadoJogo, dia: string) {
  if (dia !== `${estado.temporada}-${CONTRATOS.aviso}`) return;
  const lista = contratosTerminando(estado);
  if (!lista.length) return;
  enviarMensagem(estado, {
    tipo: "mercado",
    titulo: "Contratos terminando",
    texto: `Terminam no fim de ${estado.temporada}: ${lista.map((j) => `${j.nome} (${j.posicao}, ${j.idade} anos)`).join(", ")}. Renove no Elenco, tocando no jogador, ou eles saem de graça.`,
  });
}

/**
 * Virada da temporada `ano`: os contratos que terminam nela acabam. No clube do usuário, quem não renovou sai de
 * graça (devolve quem saiu); nos clubes do computador, todos renovam por 1 a 3 temporadas.
 */
export function encerrarContratos(estado: EstadoJogo, ano: number): Jogador[] {
  const meu = estado.tecnico.clubeId;
  const sairam: Jogador[] = [];
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId || j.contratoAte == null || j.contratoAte > ano) continue;
    if (j.clubeId === meu) {
      liberar(j);
      sairam.push(j);
    } else {
      j.contratoAte = ano + 1 + (hashTexto(`renova/${j.id}/${ano}`, estado.semente) % 3);
    }
  }
  return sairam;
}
