// Checagem do save: encontra inconsistências, corrige as que são seguras de
// corrigir e testa o motor com uma partida de verdade (numa cópia do jogo).
import { SERIES } from "./competicoes";
import { MINIMO_POSICAO } from "./constantes";
import { limitar } from "./gerador";
import { elencoDe, livres } from "./mercado";
import { iniciarPartida, montarLado, simularAteOFim } from "./partida";
import { rngPara } from "./rng";
import type { EstadoJogo, Partida, Posicao } from "./tipos";

export interface Problema {
  gravidade: "erro" | "aviso";
  texto: string;
  /** A correção automática resolve. */
  reparavel: boolean;
}

const POSICOES = Object.keys(MINIMO_POSICAO) as Posicao[];

function idsEscalacaoInvalidos(estado: EstadoJogo, clubeId: string): number {
  const c = estado.clubes[clubeId];
  const valido = (id: number | null) => id == null || estado.jogadores[id]?.clubeId === clubeId;
  return c.escalacao.titulares.filter((id) => !valido(id)).length + c.escalacao.reservas.filter((id) => !valido(id)).length;
}

export function checarEstado(estado: EstadoJogo): Problema[] {
  const problemas: Problema[] = [];
  const erro = (texto: string, reparavel = false) => problemas.push({ gravidade: "erro", texto, reparavel });
  const aviso = (texto: string, reparavel = false) => problemas.push({ gravidade: "aviso", texto, reparavel });

  if (estado.versao !== 1) erro(`Versão de save desconhecida (${estado.versao}).`);
  const meu = estado.clubes[estado.tecnico?.clubeId];
  if (!meu) erro("O clube do técnico não existe no save.");

  for (const s of SERIES) {
    const n = Object.values(estado.clubes).filter((c) => c.serie === s).length;
    if (n !== 20) erro(`A Série ${s} tem ${n} clubes (deveria ter 20).`);
  }

  let semClube = 0, foraDaFaixa = 0, ids = 0;
  for (const j of Object.values(estado.jogadores)) {
    if (j.clubeId && !estado.clubes[j.clubeId]) semClube++;
    if (!(j.forca >= 1 && j.forca <= 99) || !(j.energia >= 0 && j.energia <= 100) || !Number.isFinite(j.salario)) foraDaFaixa++;
    ids = Math.max(ids, j.id);
  }
  if (semClube) erro(`${semClube} jogador(es) ligados a um clube que não existe.`, true);
  if (foraDaFaixa) erro(`${foraDaFaixa} jogador(es) com força, energia ou salário inválidos.`, true);
  if (estado.proximoIdJogador <= ids) erro("Numeração dos jogadores fora de ordem.", true);

  let escalacoes = 0, curtos = 0;
  for (const c of Object.values(estado.clubes)) {
    if (!Number.isFinite(c.caixa)) erro(`O caixa do ${c.nome} está inválido.`, true);
    if (c.serie === "D") continue;
    if (idsEscalacaoInvalidos(estado, c.id)) escalacoes++;
    const elenco = elencoDe(estado, c.id);
    if (POSICOES.some((p) => elenco.filter((j) => j.posicao === p).length < MINIMO_POSICAO[p])) curtos++;
  }
  if (escalacoes) aviso(`${escalacoes} clube(s) com jogadores que já saíram na escalação.`, true);
  if (curtos) aviso(`${curtos} clube(s) abaixo do elenco mínimo em alguma posição.`, true);

  let partidasInvalidas = 0, atrasadas = 0;
  for (const p of estado.partidas) {
    if (!estado.clubes[p.mandante] || !estado.clubes[p.visitante]) partidasInvalidas++;
    else if (p.jogada && !(Number.isInteger(p.gm) && Number.isInteger(p.gv) && p.gm >= 0 && p.gv >= 0)) partidasInvalidas++;
    if (!p.jogada && p.data < estado.data) atrasadas++;
  }
  if (partidasInvalidas) erro(`${partidasInvalidas} partida(s) com clubes ou placar inválidos.`);
  if (atrasadas) aviso(`${atrasadas} partida(s) de datas passadas sem resultado.`);

  return problemas;
}

/** Corrige o que é seguro corrigir. Retorna o que foi feito. */
export function repararEstado(estado: EstadoJogo): string[] {
  const feito: string[] = [];
  let n = 0;
  for (const j of Object.values(estado.jogadores)) {
    if (j.clubeId && !estado.clubes[j.clubeId]) { j.clubeId = null; n++; }
    const forca = limitar(Number.isFinite(j.forca) ? Math.round(j.forca) : 50, 1, 99);
    const energia = limitar(Number.isFinite(j.energia) ? j.energia : 100, 0, 100);
    const salario = Number.isFinite(j.salario) ? j.salario : 5_000;
    if (forca !== j.forca || energia !== j.energia || salario !== j.salario) { j.forca = forca; j.energia = energia; j.salario = salario; n++; }
    j.potencial = Math.max(j.potencial ?? j.forca, j.forca);
  }
  if (n) feito.push(`${n} jogador(es) corrigidos.`);

  const maiorId = Math.max(0, ...Object.values(estado.jogadores).map((j) => j.id));
  if (estado.proximoIdJogador <= maiorId) { estado.proximoIdJogador = maiorId + 1; feito.push("Numeração dos jogadores corrigida."); }

  let escalacoes = 0, caixas = 0, reforcos = 0;
  for (const c of Object.values(estado.clubes)) {
    if (!Number.isFinite(c.caixa)) { c.caixa = 0; caixas++; }
    if (c.serie === "D") continue;
    if (idsEscalacaoInvalidos(estado, c.id)) {
      const valido = (id: number | null) => id != null && estado.jogadores[id]?.clubeId === c.id;
      c.escalacao.titulares = c.escalacao.titulares.map((id) => (valido(id) ? id : null));
      c.escalacao.reservas = c.escalacao.reservas.filter(valido);
      escalacoes++;
    }
    for (const pos of POSICOES) {
      while (elencoDe(estado, c.id).filter((j) => j.posicao === pos).length < MINIMO_POSICAO[pos]) {
        const livre = livres(estado).filter((j) => j.posicao === pos).sort((a, b) => b.forca - a.forca)[0];
        if (!livre) break;
        livre.clubeId = c.id;
        reforcos++;
      }
    }
  }
  if (caixas) feito.push(`${caixas} caixa(s) corrigidos.`);
  if (escalacoes) feito.push(`${escalacoes} escalação(ões) limpas (o melhor disponível entra nas vagas vazias).`);
  if (reforcos) feito.push(`${reforcos} jogador(es) livres contratados para completar elencos.`);
  return feito;
}

export interface ResultadoTestePartida {
  ok: boolean;
  texto: string;
}

/** Simula uma partida numa cópia do jogo, sem mexer no save. */
export function testarPartida(estado: EstadoJogo): ResultadoTestePartida {
  try {
    const copia: EstadoJogo = structuredClone(estado);
    const meu = copia.tecnico.clubeId;
    const serie = copia.clubes[meu]?.serie;
    const adversario = Object.values(copia.clubes).find((c) => c.id !== meu && c.serie === serie && serie !== "D")
      ?? Object.values(copia.clubes).find((c) => c.id !== meu && c.serie !== "D");
    if (!adversario) return { ok: false, texto: "Não há adversário para o teste." };
    const p: Partida = {
      id: "checagem", serie: "A", fase: "amistoso", rodada: 1, data: copia.data,
      mandante: meu, visitante: adversario.id, jogada: false, gm: 0, gv: 0, eventos: [],
    };
    const lados = [meu, adversario.id].map((id) => montarLado(copia.clubes[id], copia.jogadores, elencoDe(copia, id), false));
    if (lados.some((l) => l.emCampo.length < 7)) return { ok: false, texto: "Um dos times não tem jogadores suficientes." };
    const pv = iniciarPartida(p, lados[0], lados[1], rngPara(copia.semente, `checagem/${copia.data}`));
    simularAteOFim(pv, copia.jogadores);
    const [m, v] = pv.lados;
    if (!pv.terminada || pv.minuto < 90 || m.gols < 0 || v.gols < 0) return { ok: false, texto: "A partida de teste não terminou direito." };
    return { ok: true, texto: `Partida de teste: ${copia.clubes[meu].sigla} ${m.gols} x ${v.gols} ${adversario.sigla}.` };
  } catch (e) {
    return { ok: false, texto: `Erro no motor: ${(e as Error).message}` };
  }
}
