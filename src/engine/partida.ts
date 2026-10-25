// Simulação de uma partida, minuto a minuto. A mesma rotina serve para o jogo
// assistido ao vivo (a tela chama `avancarMinuto` no ritmo do relógio) e para os
// jogos simulados de uma vez (`simularAteOFim`).
import {
  CHANCE_EVENTO, CONVERSAO, CONVERSAO_PENALTI, ESTILOS, EXPOENTE_DISPUTA, MANDO, MAX_SUBSTITUICOES,
  PESO_LANCE, PRESSAO, PROB_AMARELO_FALTA, PROB_ASSISTENCIA, PROB_CABECEIO_ESCANTEIO, PROB_LESAO_JOGO,
  PROB_PENALTI_FALTA, PROB_VERMELHO_FALTA,
} from "./constantes";
import { FORMACOES, calcularSetores, disponivel, forcaEfetiva, type EmCampo, type Setores, type Vaga } from "./forca";
import type { Rng } from "./rng";
import type { Clube, Estilo, EventoPartida, Jogador, Partida, Tatica } from "./tipos";

export interface Atuacao {
  jogadorId: number;
  vaga: Vaga;
}

export interface LadoVivo {
  clubeId: string;
  tatica: Tatica;
  /** Estilo escolhido antes do jogo (a IA volta para ele quando o placar permite). */
  estiloBase: Estilo;
  emCampo: Atuacao[];
  banco: number[];
  substituicoes: number;
  energia: Record<number, number>;
  amarelos: Record<number, number>;
  expulsos: number[];
  lesionados: number[];
  jogaram: number[];
  gols: number;
  /** Moral do clube (0–100): vale de 0,95 a 1,05 em todos os setores. */
  moral: number;
  /** Controlado pelo usuário: a IA não mexe na tática nem faz trocas por cansaço. */
  controlado: boolean;
}

export interface PartidaViva {
  partidaId: string;
  lados: [LadoVivo, LadoVivo];
  tempo: 1 | 2;
  minuto: number;
  acrescimo: [number, number];
  intervalo: boolean;
  terminada: boolean;
  /** Narração completa (só na memória; o save guarda só gols, cartões e lesões). */
  narracao: EventoPartida[];
  /** Avisos para o usuário (ex.: lesão no time dele). */
  avisos: string[];
  /** Campo neutro: ninguém tem a vantagem de jogar em casa. */
  neutro?: boolean;
  /** Pênalti marcado esperando a cobrança, que sai no minuto seguinte (lado que vai cobrar). */
  penaltiPendente?: 0 | 1;
  rng: Rng;
}

type Jogadores = Record<number, Jogador>;

// ---- montagem -------------------------------------------------------------------

/** Garante uma escalação válida: troca quem está lesionado/suspenso pelo melhor substituto. */
export function escalacaoValida(clube: Clube, jogadores: Jogadores, elenco: Jogador[]): { emCampo: Atuacao[]; banco: number[] } {
  const vagas = FORMACOES[clube.tatica.formacao];
  const usados = new Set<number>();
  const emCampo: Atuacao[] = [];
  vagas.forEach((vaga, i) => {
    const id = clube.escalacao.titulares[i];
    const j = id != null ? jogadores[id] : undefined;
    if (j && j.clubeId === clube.id && disponivel(j) && !usados.has(j.id)) {
      emCampo.push({ jogadorId: j.id, vaga });
      usados.add(j.id);
    } else {
      emCampo.push({ jogadorId: -1, vaga });
    }
  });
  // Preenche as vagas vazias com o melhor disponível para cada uma.
  for (const atuacao of emCampo) {
    if (atuacao.jogadorId !== -1) continue;
    let melhor: Jogador | undefined;
    let nota = -1;
    for (const j of elenco) {
      if (usados.has(j.id) || !disponivel(j)) continue;
      const n = forcaEfetiva(j, atuacao.vaga, j.energia, clube.tatica.jogadas);
      if (n > nota) { nota = n; melhor = j; }
    }
    if (melhor) { atuacao.jogadorId = melhor.id; usados.add(melhor.id); }
  }
  const banco = clube.escalacao.reservas.filter((id) => {
    const j = jogadores[id];
    return j && j.clubeId === clube.id && disponivel(j) && !usados.has(id);
  });
  if (banco.length < 7) {
    const extras = elenco
      .filter((j) => disponivel(j) && !usados.has(j.id) && !banco.includes(j.id))
      .sort((a, b) => b.forca - a.forca);
    for (const j of extras) {
      if (banco.length >= 7) break;
      if (j.posicao === "G" && banco.some((id) => jogadores[id].posicao === "G")) continue;
      banco.push(j.id);
    }
  }
  return { emCampo: emCampo.filter((a) => a.jogadorId !== -1), banco: banco.slice(0, 7) };
}

export function montarLado(clube: Clube, jogadores: Jogadores, elenco: Jogador[], controlado: boolean): LadoVivo {
  const { emCampo, banco } = escalacaoValida(clube, jogadores, elenco);
  const energia: Record<number, number> = {};
  for (const a of emCampo) energia[a.jogadorId] = jogadores[a.jogadorId].energia;
  for (const id of banco) energia[id] = jogadores[id].energia;
  return {
    clubeId: clube.id,
    tatica: { ...clube.tatica },
    estiloBase: clube.tatica.estilo,
    emCampo,
    banco,
    substituicoes: 0,
    energia,
    amarelos: {},
    expulsos: [],
    lesionados: [],
    jogaram: emCampo.map((a) => a.jogadorId),
    gols: 0,
    moral: clube.moral,
    controlado,
  };
}

export function iniciarPartida(partida: Partida, mandante: LadoVivo, visitante: LadoVivo, rng: Rng): PartidaViva {
  return {
    partidaId: partida.id,
    lados: [mandante, visitante],
    tempo: 1,
    minuto: 0,
    acrescimo: [rng.int(0, 3), rng.int(2, 6)],
    intervalo: false,
    terminada: false,
    narracao: [],
    avisos: [],
    neutro: partida.neutro,
    rng,
  };
}

// ---- cálculo de forças ------------------------------------------------------------

function setoresDoLado(lado: LadoVivo, jogadores: Jogadores, mandante: boolean): Setores {
  const emCampo: EmCampo[] = lado.emCampo.map((a) => ({ jogador: jogadores[a.jogadorId], vaga: a.vaga, energia: lado.energia[a.jogadorId] }));
  const s = calcularSetores(emCampo, lado.tatica.jogadas);
  const estilo = ESTILOS[lado.tatica.estilo];
  const pressao = lado.tatica.marcacao === "pressao";
  const moral = 0.95 + 0.1 * (lado.moral / 100);
  s.defesa *= estilo.defesa * (pressao ? PRESSAO.defesa : 1) * (mandante ? MANDO.defesa : 1) * moral;
  s.meio *= estilo.meio * (pressao ? PRESSAO.meio : 1) * (mandante ? MANDO.meio : 1) * moral;
  s.ataque *= estilo.ataque * (mandante ? MANDO.ataque : 1) * moral;
  return s;
}

function disputa(a: number, b: number, expoente = EXPOENTE_DISPUTA): number {
  const pa = Math.pow(Math.max(1, a), expoente);
  const pb = Math.pow(Math.max(1, b), expoente);
  return pa / (pa + pb);
}

// ---- narração ---------------------------------------------------------------------

export function formatarMinuto(pv: Pick<PartidaViva, "tempo" | "minuto">): string {
  if (pv.tempo === 1 && pv.minuto > 45) return `45+${pv.minuto - 45}`;
  if (pv.tempo === 2 && pv.minuto > 90) return `90+${pv.minuto - 90}`;
  return String(pv.minuto);
}

function registrar(pv: PartidaViva, evento: Omit<EventoPartida, "min">) {
  pv.narracao.push({ min: formatarMinuto(pv), ...evento });
}

const TEXTO_PERDEU = [
  "{j} finaliza e a bola passa raspando a trave!",
  "{j} chuta forte, mas manda por cima do gol.",
  "{j} tenta de longe e assusta o goleiro.",
  "{j} perde uma chance incrível na cara do gol!",
  "Bola na trave! {j} quase marca.",
  "{j} chuta cruzado e a bola sai pela linha de fundo.",
];
const TEXTO_DEFESA = [
  "Que defesa de {g}! Tirou o chute de {j} no ângulo.",
  "{g} espalma o chute de {j} para escanteio.",
  "{g} sai bem e abafa a jogada de {j}.",
  "{j} bate colocado, mas {g} segura firme.",
];
const TEXTO_GOL = [
  "GOOOL! {j} balança a rede!",
  "GOL! {j} não perdoa e marca!",
  "É GOL! {j} bate na saída do goleiro!",
  "GOLAÇO de {j}! Que pintura!",
];

const TEXTO_ESCANTEIO = [
  "Escanteio. A zaga afasta de cabeça.",
  "Cobrança de escanteio fechada, o goleiro sai e segura.",
  "Escanteio curto, a jogada não dá em nada.",
];
const TEXTO_FALTA = [
  "Falta de {a} em {v}.",
  "{a} chega atrasado e derruba {v}. Falta.",
  "{v} sofre falta de {a} no meio-campo.",
];

function texto(rng: Rng, modelos: string[], dados: Record<string, string>): string {
  return rng.escolher(modelos).replace(/\{(\w)\}/g, (_, k: string) => dados[k] ?? "");
}

// ---- lances -------------------------------------------------------------------------

function escolherFinalizador(rng: Rng, lado: LadoVivo, jogadores: Jogadores, cabeceio: boolean): Jogador {
  return jogadores[
    rng.escolherPeso(lado.emCampo, (a) => {
      const j = jogadores[a.jogadorId];
      const peso = cabeceio
        ? { G: 0, L: 0.5, Z: 2.5, M: 1, A: 3 }[a.vaga.pos] * (j.caracteristicas.includes("CAB") ? 2.5 : 1)
        : { G: 0, L: 0.6, Z: 0.35, M: 2, A: 3.5 }[a.vaga.pos] * (j.caracteristicas.includes("FIN") ? 1.5 : 1);
      return peso * j.forca;
    }).jogadorId
  ];
}

function escolherAssistente(rng: Rng, lado: LadoVivo, jogadores: Jogadores, autorId: number, cabeceio: boolean): Jogador | undefined {
  const candidatos = lado.emCampo.filter((a) => a.jogadorId !== autorId && a.vaga.pos !== "G");
  if (!candidatos.length) return undefined;
  return jogadores[
    rng.escolherPeso(candidatos, (a) => {
      const j = jogadores[a.jogadorId];
      let peso = { G: 0, L: 1.2, Z: 0.3, M: 2.5, A: 1.5 }[a.vaga.pos];
      if (j.caracteristicas.includes("PAS") || j.caracteristicas.includes("ARM")) peso *= 1.8;
      if (cabeceio && j.caracteristicas.includes("CRU")) peso *= 2.5;
      return peso;
    }).jogadorId
  ];
}

function goleiroDe(lado: LadoVivo, jogadores: Jogadores): Jogador | undefined {
  const a = lado.emCampo.find((x) => x.vaga.pos === "G") ?? lado.emCampo[0];
  return a ? jogadores[a.jogadorId] : undefined;
}

function marcarGol(pv: PartidaViva, iLado: 0 | 1, autor: Jogador, assistente: Jogador | undefined, tipo: "gol" | "gol-penalti", textoGol: string) {
  const lado = pv.lados[iLado];
  lado.gols++;
  registrar(pv, {
    tipo,
    lado: iLado,
    jogador: autor.id,
    outro: assistente?.id,
    texto: assistente && tipo === "gol" ? `${textoGol} Passe de ${assistente.nome}.` : textoGol,
  });
}

function finalizacao(pv: PartidaViva, iAtk: 0 | 1, atk: Setores, def: Setores, jogadores: Jogadores, fator: number, cabeceio: boolean) {
  const { rng } = pv;
  const ataque = pv.lados[iAtk];
  const defesa = pv.lados[iAtk === 0 ? 1 : 0];
  if (!ataque.emCampo.length) return;
  const autor = escolherFinalizador(rng, ataque, jogadores, cabeceio);
  const goleiro = goleiroDe(defesa, jogadores);
  let p = CONVERSAO * fator * disputa(atk.ataque, def.defesa);
  if (autor.caracteristicas.includes(cabeceio ? "CAB" : "FIN")) p *= 1.12;
  if (goleiro?.caracteristicas.includes("REF")) p *= 0.94;
  if (goleiro?.caracteristicas.includes("COL")) p *= 0.96;
  if (cabeceio && goleiro?.caracteristicas.includes("SAI")) p *= 0.92;
  if (rng.chance(p)) {
    const assistente = rng.chance(PROB_ASSISTENCIA) ? escolherAssistente(rng, ataque, jogadores, autor.id, cabeceio) : undefined;
    const t = cabeceio ? `GOL DE CABEÇA! ${autor.nome} sobe mais que todo mundo!` : texto(rng, TEXTO_GOL, { j: autor.nome });
    marcarGol(pv, iAtk, autor, assistente, "gol", t);
  } else if (goleiro && rng.chance(0.45)) {
    registrar(pv, { tipo: "defesa", lado: iAtk, jogador: autor.id, texto: texto(rng, TEXTO_DEFESA, { g: goleiro.nome, j: autor.nome }) });
  } else {
    registrar(pv, { tipo: "chance", lado: iAtk, jogador: autor.id, texto: texto(rng, TEXTO_PERDEU, { j: autor.nome }) });
  }
}

function cobrarPenalti(pv: PartidaViva, iAtk: 0 | 1, jogadores: Jogadores) {
  const { rng } = pv;
  const ataque = pv.lados[iAtk];
  const defesa = pv.lados[iAtk === 0 ? 1 : 0];
  const cobrador = [...ataque.emCampo]
    .map((a) => jogadores[a.jogadorId])
    .sort((a, b) => notaCobrador(b) - notaCobrador(a))[0];
  if (!cobrador) return;
  const goleiro = goleiroDe(defesa, jogadores);
  let p = CONVERSAO_PENALTI;
  if (cobrador.caracteristicas.includes("FIN")) p += 0.05;
  if (goleiro?.caracteristicas.includes("PEN")) p -= 0.12;
  registrar(pv, { tipo: "chance", lado: iAtk, texto: `${cobrador.nome} ajeita a bola na marca do pênalti...` });
  if (rng.chance(p)) {
    marcarGol(pv, iAtk, cobrador, undefined, "gol-penalti", `GOL! ${cobrador.nome} cobra com categoria e converte o pênalti.`);
  } else {
    const t = goleiro && rng.chance(0.6) ? `${goleiro.nome} pega o pênalti de ${cobrador.nome}!` : `${cobrador.nome} cobra mal e manda para fora!`;
    registrar(pv, { tipo: "penalti-perdido", lado: iAtk, jogador: cobrador.id, texto: t });
  }
}

function notaCobrador(j: Jogador): number {
  return j.forca + (j.caracteristicas.includes("FIN") ? 15 : 0) + ({ G: -60, L: 0, Z: -5, M: 5, A: 10 }[j.posicao]);
}

function expulsar(pv: PartidaViva, iLado: 0 | 1, jogador: Jogador) {
  const lado = pv.lados[iLado];
  lado.emCampo = lado.emCampo.filter((a) => a.jogadorId !== jogador.id);
  lado.expulsos.push(jogador.id);
}

function falta(pv: PartidaViva, iAtk: 0 | 1, atk: Setores, def: Setores, jogadores: Jogadores) {
  const { rng } = pv;
  const iDef = iAtk === 0 ? 1 : 0;
  const defesa = pv.lados[iDef];
  if (!defesa.emCampo.length) return;
  const autor = jogadores[
    rng.escolherPeso(defesa.emCampo, (a) => ({ G: 0.1, L: 1.2, Z: 1.5, M: 1.3, A: 0.6 })[a.vaga.pos]).jogadorId
  ];
  const pressao = defesa.tatica.marcacao === "pressao" ? PRESSAO.faltas : 1;

  if (rng.chance(PROB_VERMELHO_FALTA * pressao)) {
    registrar(pv, { tipo: "vermelho", lado: iDef, jogador: autor.id, texto: `CARTÃO VERMELHO! ${autor.nome} entra duro e é expulso!` });
    expulsar(pv, iDef, autor);
  } else if (rng.chance(PROB_AMARELO_FALTA * pressao)) {
    defesa.amarelos[autor.id] = (defesa.amarelos[autor.id] ?? 0) + 1;
    if (defesa.amarelos[autor.id] >= 2) {
      registrar(pv, { tipo: "vermelho", lado: iDef, jogador: autor.id, texto: `Segundo amarelo para ${autor.nome}! Está expulso.` });
      expulsar(pv, iDef, autor);
    } else {
      registrar(pv, { tipo: "amarelo", lado: iDef, jogador: autor.id, texto: `Cartão amarelo para ${autor.nome}.` });
    }
  }

  const narrar = rng.chance(0.3);
  if (rng.chance(PROB_PENALTI_FALTA)) {
    // Marcado agora, cobrado no minuto seguinte (dá tempo de o narrador gritar e a torcida reagir).
    registrar(pv, { tipo: "penalti", lado: iAtk, jogador: autor.id, texto: `PÊNALTI! ${autor.nome} derruba o adversário dentro da área.` });
    pv.penaltiPendente = iAtk;
  } else {
    const comCartao = pv.narracao.some((e) => e.min === formatarMinuto(pv) && (e.tipo === "amarelo" || e.tipo === "vermelho"));
    if (narrar && !comCartao && pv.lados[iAtk].emCampo.length) {
      const vitima = jogadores[rng.escolher(pv.lados[iAtk].emCampo).jogadorId];
      registrar(pv, { tipo: "lance", lado: iDef, jogador: autor.id, texto: texto(rng, TEXTO_FALTA, { a: autor.nome, v: vitima.nome }) });
    }
    if (rng.chance(0.14)) {
      registrar(pv, { tipo: "chance", lado: iAtk, texto: "Falta perigosa na entrada da área..." });
      finalizacao(pv, iAtk, atk, def, jogadores, 0.45, false);
    }
  }
}

// ---- trocas e IA -------------------------------------------------------------------

export function substituir(pv: PartidaViva, iLado: 0 | 1, saiId: number, entraId: number, jogadores: Jogadores): string | null {
  const lado = pv.lados[iLado];
  if (pv.terminada) return "A partida já terminou.";
  if (lado.substituicoes >= MAX_SUBSTITUICOES) return "Todas as substituições já foram feitas.";
  const atuacao = lado.emCampo.find((a) => a.jogadorId === saiId);
  if (!atuacao) return "Esse jogador não está em campo.";
  if (!lado.banco.includes(entraId)) return "Esse jogador não está no banco.";
  atuacao.jogadorId = entraId;
  lado.banco = lado.banco.filter((id) => id !== entraId);
  lado.substituicoes++;
  if (!lado.jogaram.includes(entraId)) lado.jogaram.push(entraId);
  registrar(pv, {
    tipo: "substituicao",
    lado: iLado,
    jogador: entraId,
    outro: saiId,
    texto: `Substituição: entra ${jogadores[entraId].nome}, sai ${jogadores[saiId].nome}.`,
  });
  return null;
}

/** Muda a tática; se a formação mudar, redistribui quem está em campo pelas novas vagas. */
export function mudarTatica(pv: PartidaViva, iLado: 0 | 1, tatica: Tatica, jogadores: Jogadores) {
  const lado = pv.lados[iLado];
  const mudouFormacao = tatica.formacao !== lado.tatica.formacao;
  lado.tatica = { ...tatica };
  lado.estiloBase = tatica.estilo;
  if (mudouFormacao) {
    lado.emCampo = redistribuir(lado.emCampo.map((a) => a.jogadorId), tatica, lado.energia, jogadores);
  }
}

export function redistribuir(ids: number[], tatica: Tatica, energia: Record<number, number>, jogadores: Jogadores): Atuacao[] {
  const vagas = FORMACOES[tatica.formacao];
  const pares: { v: number; id: number; nota: number }[] = [];
  vagas.forEach((vaga, v) => {
    for (const id of ids) pares.push({ v, id, nota: forcaEfetiva(jogadores[id], vaga, energia[id] ?? 100, tatica.jogadas) });
  });
  pares.sort((a, b) => b.nota - a.nota);
  const vagaDe = new Map<number, number>();
  const ocupadas = new Set<number>();
  // Goleiro primeiro: quem é goleiro fica no gol.
  const goleiro = ids.find((id) => jogadores[id].posicao === "G");
  if (goleiro != null) { vagaDe.set(goleiro, 0); ocupadas.add(0); }
  for (const p of pares) {
    if (ocupadas.has(p.v) || vagaDe.has(p.id)) continue;
    vagaDe.set(p.id, p.v);
    ocupadas.add(p.v);
  }
  return ids.filter((id) => vagaDe.has(id)).map((id) => ({ jogadorId: id, vaga: vagas[vagaDe.get(id)!] }));
}

function melhorReserva(lado: LadoVivo, vaga: Vaga, jogadores: Jogadores): number | undefined {
  let melhor: number | undefined;
  let nota = -1;
  for (const id of lado.banco) {
    const n = forcaEfetiva(jogadores[id], vaga, lado.energia[id] ?? 100, lado.tatica.jogadas);
    if (n > nota) { nota = n; melhor = id; }
  }
  return melhor;
}

function trocasDaIa(pv: PartidaViva, iLado: 0 | 1, jogadores: Jogadores, maximo: number) {
  const lado = pv.lados[iLado];
  const cansados = lado.emCampo
    .filter((a) => a.vaga.pos !== "G" && lado.energia[a.jogadorId] < 62)
    .sort((a, b) => lado.energia[a.jogadorId] - lado.energia[b.jogadorId]);
  let feitas = 0;
  for (const a of cansados) {
    if (feitas >= maximo || lado.substituicoes >= MAX_SUBSTITUICOES) break;
    const entra = melhorReserva(lado, a.vaga, jogadores);
    if (entra == null) break;
    const atual = forcaEfetiva(jogadores[a.jogadorId], a.vaga, lado.energia[a.jogadorId], lado.tatica.jogadas);
    const novo = forcaEfetiva(jogadores[entra], a.vaga, lado.energia[entra] ?? 100, lado.tatica.jogadas);
    if (novo > atual * 1.04) {
      substituir(pv, iLado, a.jogadorId, entra, jogadores);
      feitas++;
    }
  }
}

function taticaDaIa(pv: PartidaViva, iLado: 0 | 1) {
  const lado = pv.lados[iLado];
  const saldo = lado.gols - pv.lados[iLado === 0 ? 1 : 0].gols;
  const minuto = pv.tempo === 2 ? pv.minuto : 0;
  let estilo: Estilo = lado.estiloBase;
  if (minuto >= 85 && saldo < 0) estilo = "ataque-total";
  else if (minuto >= 70 && saldo < 0) estilo = "ofensivo";
  else if (minuto >= 80 && saldo > 0) estilo = "defensivo";
  lado.tatica.estilo = estilo;
}

// ---- relógio ---------------------------------------------------------------------

function gastarEnergia(lado: LadoVivo, jogadores: Jogadores) {
  const base = ESTILOS[lado.tatica.estilo].energia * (lado.tatica.marcacao === "pressao" ? PRESSAO.energia : 1);
  for (const a of lado.emCampo) {
    const j = jogadores[a.jogadorId];
    let gasto = base;
    if (j.caracteristicas.includes("RES")) gasto *= 0.8;
    if (j.idade >= 31) gasto *= 1.1;
    if (a.vaga.pos === "G") gasto *= 0.3;
    lado.energia[a.jogadorId] = Math.max(0, lado.energia[a.jogadorId] - gasto);
  }
}

function verificarLesoes(pv: PartidaViva, iLado: 0 | 1, jogadores: Jogadores) {
  const lado = pv.lados[iLado];
  for (const a of [...lado.emCampo]) {
    const cansaco = lado.energia[a.jogadorId] < 40 ? 1.6 : 1;
    if (!pv.rng.chance((PROB_LESAO_JOGO / 92) * cansaco)) continue;
    const j = jogadores[a.jogadorId];
    lado.lesionados.push(j.id);
    registrar(pv, { tipo: "lesao", lado: iLado, jogador: j.id, texto: `${j.nome} sente uma lesão e não tem condições de continuar.` });
    const entra = lado.substituicoes < MAX_SUBSTITUICOES ? melhorReserva(lado, a.vaga, jogadores) : undefined;
    if (entra != null) {
      substituir(pv, iLado, j.id, entra, jogadores);
      if (lado.controlado) pv.avisos.push(`${j.nome} se lesionou. Entrou ${jogadores[entra].nome} no lugar dele.`);
    } else {
      lado.emCampo = lado.emCampo.filter((x) => x.jogadorId !== j.id);
      if (lado.controlado) pv.avisos.push(`${j.nome} se lesionou e o time ficou com um a menos (sem substituições).`);
    }
  }
}

/** Joga um minuto. Retorna os eventos que aconteceram nesse minuto. */
export function avancarMinuto(pv: PartidaViva, jogadores: Jogadores): EventoPartida[] {
  if (pv.terminada) return [];
  const antes = pv.narracao.length;

  if (pv.intervalo) {
    pv.intervalo = false;
    pv.tempo = 2;
    pv.minuto = 45;
    for (const i of [0, 1] as const) {
      if (!pv.lados[i].controlado) trocasDaIa(pv, i, jogadores, 2);
    }
  }

  pv.minuto++;
  const [mandante, visitante] = pv.lados;
  gastarEnergia(mandante, jogadores);
  gastarEnergia(visitante, jogadores);
  verificarLesoes(pv, 0, jogadores);
  verificarLesoes(pv, 1, jogadores);

  if ((pv.minuto === 60 || pv.minuto === 70 || pv.minuto === 80) && pv.tempo === 2) {
    for (const i of [0, 1] as const) {
      if (!pv.lados[i].controlado) trocasDaIa(pv, i, jogadores, pv.minuto === 80 ? 1 : 2);
    }
  }
  if (pv.tempo === 2 && pv.minuto >= 70) {
    for (const i of [0, 1] as const) if (!pv.lados[i].controlado) taticaDaIa(pv, i);
  }

  if (pv.penaltiPendente !== undefined) {
    const lado = pv.penaltiPendente;
    pv.penaltiPendente = undefined;
    cobrarPenalti(pv, lado, jogadores);
  } else if (pv.rng.chance(CHANCE_EVENTO)) {
    const sM = setoresDoLado(mandante, jogadores, !pv.neutro);
    const sV = setoresDoLado(visitante, jogadores, false);
    const casaAtaca = pv.rng.chance(disputa(sM.meio, sV.meio, 2));
    const iAtk: 0 | 1 = casaAtaca ? 0 : 1;
    const atk = casaAtaca ? sM : sV;
    const def = casaAtaca ? sV : sM;
    const tipo = pv.rng.escolherPeso(Object.keys(PESO_LANCE) as (keyof typeof PESO_LANCE)[], (k) => PESO_LANCE[k]);
    if (tipo === "chance") {
      // Contra-ataque: quem defende mais e tem pouco a bola finaliza melhor.
      const contra = pv.lados[iAtk].tatica.estilo === "contra-ataque" && atk.meio < def.meio ? 1.12 : 1;
      finalizacao(pv, iAtk, atk, def, jogadores, contra, false);
    } else if (tipo === "escanteio") {
      if (pv.rng.chance(PROB_CABECEIO_ESCANTEIO)) finalizacao(pv, iAtk, atk, def, jogadores, 0.55, true);
      else if (pv.rng.chance(0.4)) registrar(pv, { tipo: "lance", lado: iAtk, texto: pv.rng.escolher(TEXTO_ESCANTEIO) });
    } else {
      falta(pv, iAtk, atk, def, jogadores);
    }
  }

  const fimDoTempo = pv.tempo === 1 ? 45 + pv.acrescimo[0] : 90 + pv.acrescimo[1];
  // Com pênalti marcado, o árbitro espera a cobrança para encerrar o tempo.
  if (pv.minuto >= fimDoTempo && pv.penaltiPendente === undefined) {
    if (pv.tempo === 1) {
      pv.intervalo = true;
      registrar(pv, { tipo: "intervalo", lado: 0, texto: `Fim do primeiro tempo: ${mandante.gols} x ${visitante.gols}.` });
    } else {
      pv.terminada = true;
      registrar(pv, { tipo: "fim", lado: 0, texto: `Fim de jogo: ${mandante.gols} x ${visitante.gols}.` });
    }
  }
  return pv.narracao.slice(antes);
}

export function simularAteOFim(pv: PartidaViva, jogadores: Jogadores) {
  let seguranca = 0;
  while (!pv.terminada && seguranca++ < 200) avancarMinuto(pv, jogadores);
}

// ---- pênaltis ----------------------------------------------------------------------

/** Disputa por pênaltis entre os jogadores que terminaram em campo. */
export function disputarPenaltis(rng: Rng, pv: PartidaViva, jogadores: Jogadores): [number, number] {
  const cobradores = pv.lados.map((l) =>
    l.emCampo.map((a) => jogadores[a.jogadorId]).sort((a, b) => notaCobrador(b) - notaCobrador(a)),
  );
  const goleiros = pv.lados.map((l) => goleiroDe(l, jogadores));
  const placar: [number, number] = [0, 0];
  const cobrar = (i: 0 | 1, n: number) => {
    const lista = cobradores[i];
    if (!lista.length) return;
    const c = lista[n % lista.length];
    const g = goleiros[i === 0 ? 1 : 0];
    let p = CONVERSAO_PENALTI + (c.caracteristicas.includes("FIN") ? 0.05 : 0) - (g?.caracteristicas.includes("PEN") ? 0.12 : 0);
    p += (c.forca - 60) / 400;
    if (rng.chance(p)) placar[i]++;
  };
  for (let n = 0; n < 5; n++) {
    cobrar(0, n);
    cobrar(1, n);
  }
  let n = 5;
  while (placar[0] === placar[1] && n < 40) {
    cobrar(0, n);
    cobrar(1, n);
    n++;
  }
  if (placar[0] === placar[1]) placar[rng.chance(0.5) ? 0 : 1]++;
  return placar;
}

/** Eventos que vão para o save (o resto da narração é descartado). */
export function eventosParaGuardar(pv: PartidaViva): EventoPartida[] {
  return pv.narracao
    .filter((e) => e.tipo === "gol" || e.tipo === "gol-penalti" || e.tipo === "amarelo" || e.tipo === "vermelho" || e.tipo === "lesao")
    .map(({ min, tipo, lado, jogador, outro }) => ({ min, tipo, lado, jogador, outro, texto: "" }));
}
