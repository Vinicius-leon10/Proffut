// Contratos: cada jogador num clube tem uma última temporada de contrato. O usuário renova no último ano (o
// jogador pede um salário) ou perde o jogador de graça na virada; os clubes do computador renovam sozinhos.
import { anoDoCiclo, cicloDoClube, cruzaOAno, rotuloDaTemporada, type Ciclo } from "./ciclos";
import { CONTRATOS } from "./constantes";
import { salarioBase } from "./gerador";
import { enviarMensagem } from "./mensagens";
import { hashTexto, rngPara } from "./rng";
import type { EstadoJogo, Jogador } from "./tipos";

/** Quantas temporadas a mais um contrato novo (reforço ou renovação) pode ter, pela idade. */
export function anosMaximos(idade: number): number {
  return idade >= 33 ? 1 : idade >= 30 ? 2 : 3;
}

/** Ciclo do clube (sem clube, seleção ou clube que não existe mais: o ano civil). */
export function cicloDoClubeId(estado: EstadoJogo, clubeId: string | null | undefined): Ciclo {
  const clube = clubeId ? estado.clubes[clubeId] : undefined;
  return clube ? cicloDoClube(clube) : "ano";
}

/**
 * A temporada em que o clube está: o ano civil (2027) no ano civil, e o ano em que ela começou nos ciclos de agosto a maio
 * (2026 = 2026/27, até 30 de junho de 2027). É a que vale para contratos e empréstimos (R142).
 */
export function temporadaDoClube(estado: EstadoJogo, clubeId: string | null | undefined): number {
  const ciclo = cicloDoClubeId(estado, clubeId);
  return cruzaOAno(ciclo) ? anoDoCiclo(ciclo, estado.data) : estado.temporada;
}

/** Contrato para quem está num clube e ainda não tem (jogo novo, save antigo, reforço sem contrato). */
export function garantirContratos(estado: EstadoJogo, primeiraTemporada: number, ciclos?: Ciclo[]) {
  for (const j of Object.values(estado.jogadores)) {
    // Quem joga fora dos clubes do jogo (ligado à seleção, "sel-") não tem contrato no jogo.
    if (!j.clubeId || j.contratoAte != null || j.clubeId.startsWith("sel-")) continue;
    if (ciclos && !ciclos.includes(cicloDoClubeId(estado, j.clubeId))) continue;
    const anos = Math.min(CONTRATOS.anosIniciais, anosMaximos(j.idade) + 1);
    j.contratoAte = primeiraTemporada + (hashTexto(`contrato/${j.id}`, estado.semente) % anos);
  }
}

/** Contrato de quem chega a um clube (compra, livre contratado): o máximo para a idade. */
export function contratoNovo(estado: EstadoJogo, j: Jogador) {
  j.contratoAte = temporadaDoClube(estado, j.clubeId) + anosMaximos(j.idade);
}

/** Saiu do clube sem ir para outro: livre, sem contrato. */
export function liberar(j: Jogador) {
  j.clubeId = null;
  j.aVenda = false;
  delete j.contratoAte;
}

export function ultimoAno(estado: EstadoJogo, j: Jogador): boolean {
  return j.contratoAte != null && j.contratoAte <= temporadaDoClube(estado, j.clubeId);
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
  j.contratoAte = temporadaDoClube(estado, j.clubeId) + anos;
  const ate = rotuloDaTemporada(cicloDoClubeId(estado, j.clubeId), j.contratoAte);
  return { ok: true, texto: `${j.nome} renovou até ${ate}. Salário: R$ ${j.salario.toLocaleString("pt-BR")}/mês.` };
}

/** Dia do aviso "Contratos terminando" do clube do usuário: 1º de setembro no ano civil, 1º de março nos ciclos de agosto a maio. */
function diaDoAviso(estado: EstadoJogo): string {
  const ciclo = cicloDoClubeId(estado, estado.tecnico.clubeId);
  const ano = temporadaDoClube(estado, estado.tecnico.clubeId);
  return cruzaOAno(ciclo) ? `${ano + 1}-03-01` : `${ano}-${CONTRATOS.aviso}`;
}

/** Uma vez por temporada, a lista de quem tem o contrato terminando. */
export function avisarContratos(estado: EstadoJogo, dia: string) {
  if (dia !== diaDoAviso(estado)) return;
  const lista = contratosTerminando(estado);
  if (!lista.length) return;
  const ciclo = cicloDoClubeId(estado, estado.tecnico.clubeId);
  enviarMensagem(estado, {
    tipo: "mercado",
    titulo: "Contratos terminando",
    texto: `Terminam no fim de ${rotuloDaTemporada(ciclo, temporadaDoClube(estado, estado.tecnico.clubeId))}: ${lista.map((j) => `${j.nome} (${j.posicao}, ${j.idade} anos)`).join(", ")}. Renove no Elenco, tocando no jogador, ou eles saem de graça.`,
  });
}

/**
 * Virada da temporada `ano`: os contratos que terminam nela acabam. No clube do usuário, quem não renovou sai de
 * graça (devolve quem saiu); nos clubes do computador, todos renovam por 1 a 3 temporadas.
 */
export function encerrarContratos(estado: EstadoJogo, ano: number, ciclos?: Ciclo[]): Jogador[] {
  const meu = estado.tecnico.clubeId;
  const sairam: Jogador[] = [];
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId || j.contratoAte == null || j.contratoAte > ano) continue;
    if (ciclos && !ciclos.includes(cicloDoClubeId(estado, j.clubeId))) continue;
    if (j.clubeId === meu) {
      liberar(j);
      sairam.push(j);
    } else {
      j.contratoAte = ano + 1 + (hashTexto(`renova/${j.id}/${ano}`, estado.semente) % 3);
    }
  }
  return sairam;
}
