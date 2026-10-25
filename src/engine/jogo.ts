// Orquestra o jogo: criar carreira, avançar o calendário, jogar os dias de jogo.
import clubesJson from "../../data/brasil-2026/clubes.json";
import reservaJson from "../../data/brasil-2026/serie-d-reserva.json";
import jogadoresJson from "../../data/brasil-2026/jogadores.json";
import { diasEntre, inicioDaTemporada, mesDe, somarDias } from "./calendario";
import {
  FASE_LIGA, agregado, avancarFases, chaveDaPartida, criarTemporada, decidePorPenaltis, temporadaEncerrada,
} from "./competicoes";
import { COTA_TV_RODADA, DIAS_LESAO, PRECO_REFERENCIA, RECUPERACAO_POR_DIA, TEMPORADA_INICIAL } from "./constantes";
import { atualizarConfianca, definirObjetivo } from "./diretoria";
import { escalarAutomatico, forcaDoTime } from "./forca";
import { lancar, processarMes, publicoDoJogo } from "./financas";
import { elencoReal, gerarElenco, type JogadorReal } from "./gerador";
import { completarLivres, elencoDe, gerarPropostas, reescalar, transferenciasDaIa } from "./mercado";
import { enviarMensagem } from "./mensagens";
import {
  disputarPenaltis, eventosParaGuardar, iniciarPartida, montarLado, simularAteOFim, type PartidaViva,
} from "./partida";
import { criarRng, rngPara } from "./rng";
import { avancarCopa, criarCopa } from "./copa";
import { concluirObras } from "./estadio";
import { encerrarTemporada } from "./temporada";
import type { Clube, Estilo, EstadoJogo, Formacao, Partida, SerieClube, Tatica } from "./tipos";

export interface FichaClube {
  id: string;
  nome: string;
  sigla: string;
  cidade: string;
  estado: string;
  serie?: string;
  cores: { primaria: string; secundaria: string };
  estadio: { nome: string; capacidade: number };
  fundacao: number;
  rival: string | null;
  torcida: number;
  reputacao: number;
  forcaElenco: { min: number; max: number };
  caixaInicial: number;
}

export const FICHAS: FichaClube[] = clubesJson.clubes as FichaClube[];
const RESERVA: FichaClube[] = reservaJson.clubes as FichaClube[];
/** Elencos de verdade dos 60 clubes (tools/elencos/montar.ts). Clube sem elenco aqui ganha um gerado. */
const ELENCOS_REAIS = jogadoresJson.elencos as Record<string, JogadorReal[]>;

/** Tática inicial dos clubes da IA: os fortes atacam mais, os fracos se fecham. */
function taticaDaIa(ficha: FichaClube, rng: ReturnType<typeof criarRng>): Tatica {
  const forca = (ficha.forcaElenco.min + ficha.forcaElenco.max) / 2;
  const formacao = rng.escolherPeso<Formacao>(["4-4-2", "4-3-3", "4-5-1", "3-5-2", "5-3-2"], (f) =>
    ({ "4-4-2": 4, "4-3-3": 3, "4-5-1": 2, "3-5-2": 1, "5-3-2": 1, "4-2-4": 0 })[f],
  );
  const estilos: Estilo[] = forca >= 72 ? ["ofensivo", "posse", "equilibrado"] : forca >= 55 ? ["equilibrado", "equilibrado", "ofensivo", "contra-ataque"] : ["equilibrado", "defensivo", "contra-ataque"];
  return { formacao, estilo: rng.escolher(estilos), marcacao: rng.chance(0.25) ? "pressao" : "normal", jogadas: rng.chance(0.5) ? "meio" : "pontas" };
}

function criarClube(ficha: FichaClube, serie: SerieClube, rng: ReturnType<typeof criarRng>): Clube {
  return {
    id: ficha.id, nome: ficha.nome, sigla: ficha.sigla, cidade: ficha.cidade, estado: ficha.estado, serie,
    cores: { ...ficha.cores }, estadio: { ...ficha.estadio }, fundacao: ficha.fundacao, rival: ficha.rival,
    torcida: ficha.torcida, reputacao: ficha.reputacao, forcaElenco: { ...ficha.forcaElenco },
    caixa: ficha.caixaInicial,
    precoIngresso: PRECO_REFERENCIA[serie === "D" ? "C" : serie],
    moral: 60,
    tatica: taticaDaIa(ficha, rng),
    escalacao: { titulares: [], reservas: [] },
    extrato: [],
    resumoFinanceiro: {},
  };
}

export function novoJogo(opcoes: { nomeTecnico: string; clubeId: string; semente?: number }): EstadoJogo {
  const semente = opcoes.semente ?? Math.floor(Math.random() * 2 ** 31);
  const rng = rngPara(semente, "mundo");
  const estado: EstadoJogo = {
    versao: 1,
    semente,
    temporada: TEMPORADA_INICIAL,
    data: somarDias(inicioDaTemporada(TEMPORADA_INICIAL), -7),
    tecnico: { nome: opcoes.nomeTecnico.trim() || "Técnico", clubeId: opcoes.clubeId, confiancaDiretoria: 60, confiancaTorcida: 60 },
    objetivo: { descricao: "", posicaoAlvo: 20 },
    clubes: {},
    jogadores: {},
    proximoIdJogador: 1,
    series: {} as EstadoJogo["series"],
    partidas: [],
    mensagens: [],
    proximoIdMensagem: 1,
    historico: [],
    config: { velocidade: 2, escalacaoAutomatica: false },
  };
  for (const ficha of FICHAS) estado.clubes[ficha.id] = criarClube(ficha, ficha.serie as SerieClube, rng);
  for (const ficha of RESERVA) estado.clubes[ficha.id] = criarClube(ficha, "D", rng);
  if (!estado.clubes[opcoes.clubeId] || estado.clubes[opcoes.clubeId].serie === "D") throw new Error("Clube inválido");

  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    const proximoId = () => estado.proximoIdJogador++;
    const reais = ELENCOS_REAIS[clube.id];
    for (const j of reais ? elencoReal(rng, clube, reais, proximoId) : gerarElenco(rng, clube, proximoId)) estado.jogadores[j.id] = j;
  }
  completarLivres(estado, "inicio");

  const meu = estado.clubes[opcoes.clubeId];
  meu.tatica = { formacao: "4-4-2", estilo: "equilibrado", marcacao: "normal", jogadas: "meio" };
  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    clube.escalacao = escalarAutomatico(elencoDe(estado, clube.id), clube.tatica.formacao, clube.tatica.jogadas);
  }

  criarTemporada(estado);
  criarCopa(estado);
  estado.objetivo = definirObjetivo(estado);
  enviarMensagem(estado, {
    tipo: "diretoria",
    titulo: `Bem-vindo ao ${meu.nome}!`,
    texto: `A diretoria confia no seu trabalho. Objetivo para ${TEMPORADA_INICIAL}: ${estado.objetivo.descricao}. Caixa disponível: R$ ${meu.caixa.toLocaleString("pt-BR")}.`,
  });
  return estado;
}

/** Força estimada de um clube antes de gerar os jogadores (para a tela de escolha). */
export function forcaEstimada(ficha: FichaClube): number {
  return Math.round(ficha.forcaElenco.min + (ficha.forcaElenco.max - ficha.forcaElenco.min) * 0.8);
}

// ---- calendário --------------------------------------------------------------------

export function partidasDoDia(estado: EstadoJogo, data = estado.data): Partida[] {
  return estado.partidas.filter((p) => p.data === data);
}

export function jogosPendentesHoje(estado: EstadoJogo): Partida[] {
  return partidasDoDia(estado).filter((p) => !p.jogada);
}

export function meuJogoHoje(estado: EstadoJogo): Partida | undefined {
  const meu = estado.tecnico.clubeId;
  return jogosPendentesHoje(estado).find((p) => p.mandante === meu || p.visitante === meu);
}

export function proximoJogoDoClube(estado: EstadoJogo, clubeId = estado.tecnico.clubeId): Partida | undefined {
  return estado.partidas.find((p) => !p.jogada && (p.mandante === clubeId || p.visitante === clubeId));
}

export function proximaDataComJogo(estado: EstadoJogo): string | undefined {
  return estado.partidas.find((p) => !p.jogada && p.data > estado.data)?.data;
}

/** Passa os dias até `ate`: recuperação, lesões, virada de mês, propostas e janela de julho. */
function processarDias(estado: EstadoJogo, ate: string) {
  const dias = diasEntre(estado.data, ate);
  const meu = estado.tecnico.clubeId;
  for (let i = 1; i <= dias; i++) {
    const dia = somarDias(estado.data, 1);
    const mudouMes = mesDe(dia) !== mesDe(estado.data);
    estado.data = dia;
    for (const j of Object.values(estado.jogadores)) {
      j.energia = Math.min(100, j.energia + RECUPERACAO_POR_DIA);
      if (j.lesaoDias > 0) {
        j.lesaoDias--;
        if (j.lesaoDias === 0 && j.clubeId === meu) {
          enviarMensagem(estado, { tipo: "lesao", titulo: `${j.nome} recuperado`, texto: `${j.nome} está liberado pelo departamento médico.` });
        }
      }
    }
    if (mudouMes) processarMes(estado, dia);
    concluirObras(estado, dia);
    gerarPropostas(estado, dia);
    if (dia.endsWith("-07-01") || dia.endsWith("-07-15")) {
      const noticias = transferenciasDaIa(estado, dia);
      if (noticias.length) {
        enviarMensagem(estado, { tipo: "mercado", titulo: "Janela de transferências", texto: noticias.slice(0, 8).join(" ") });
      }
    }
  }
}

export type ResultadoAvanco =
  | { tipo: "jogos-hoje"; meuJogo?: Partida }
  | { tipo: "nova-temporada" }
  | { tipo: "nada" };

/**
 * Botão "Avançar": se há jogos hoje, eles precisam ser jogados; senão vai para
 * a próxima data com jogo; com a temporada encerrada, faz a virada.
 */
export function avancar(estado: EstadoJogo): ResultadoAvanco {
  if (jogosPendentesHoje(estado).length) return { tipo: "jogos-hoje", meuJogo: meuJogoHoje(estado) };
  if (temporadaEncerrada(estado)) {
    encerrarTemporada(estado);
    return { tipo: "nova-temporada" };
  }
  const proxima = proximaDataComJogo(estado);
  if (!proxima) return { tipo: "nada" };
  processarDias(estado, proxima);
  return { tipo: "jogos-hoje", meuJogo: meuJogoHoje(estado) };
}

// ---- dia de jogo -----------------------------------------------------------------------

/** Monta todas as partidas do dia (a do usuário com o lado dele "controlado"). */
export function prepararJogos(estado: EstadoJogo): PartidaViva[] {
  const meu = estado.tecnico.clubeId;
  const elencos = new Map<string, ReturnType<typeof elencoDe>>();
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId) continue;
    const lista = elencos.get(j.clubeId) ?? [];
    lista.push(j);
    elencos.set(j.clubeId, lista);
  }
  return jogosPendentesHoje(estado).map((p) => {
    for (const id of [p.mandante, p.visitante]) {
      const clube = estado.clubes[id];
      if (id !== meu || estado.config.escalacaoAutomatica) {
        clube.escalacao = escalarAutomatico(elencos.get(id) ?? [], clube.tatica.formacao, clube.tatica.jogadas);
      }
    }
    const lados = [p.mandante, p.visitante].map((id) =>
      montarLado(estado.clubes[id], estado.jogadores, elencos.get(id) ?? [], id === meu),
    );
    return iniciarPartida(p, lados[0], lados[1], rngPara(estado.semente, `partida/${p.id}`));
  });
}

function aplicarResultado(estado: EstadoJogo, pv: PartidaViva) {
  const p = estado.partidas.find((x) => x.id === pv.partidaId)!;
  const rng = rngPara(estado.semente, `pos-jogo/${p.id}`);
  const [lm, lv] = pv.lados;
  const mandante = estado.clubes[p.mandante];
  const visitante = estado.clubes[p.visitante];
  p.gm = lm.gols;
  p.gv = lv.gols;
  p.jogada = true;
  p.eventos = eventosParaGuardar(pv);
  if (decidePorPenaltis(p)) {
    let empate = p.gm === p.gv;
    if (p.perna === 2) {
      const chave = chaveDaPartida(estado, p);
      const [a, b] = chave ? agregado(chave) : [0, 1];
      empate = a === b;
    }
    if (empate) p.penaltis = disputarPenaltis(rngPara(estado.semente, `penaltis/${p.id}`), pv, estado.jogadores);
  }

  // Dinheiro: bilheteria do mandante (campo neutro não tem) e cota de TV da rodada para os dois (fase de liga).
  if (p.neutro) p.publico = Math.round(rng.real(55_000, 70_000));
  else {
    p.publico = publicoDoJogo(rng, mandante, visitante);
    lancar(mandante, p.data, "bilheteria", `Bilheteria x ${visitante.nome} (${p.publico.toLocaleString("pt-BR")} pagantes)`, p.publico * mandante.precoIngresso);
  }
  if (p.serie !== "CB" && p.fase === FASE_LIGA[p.serie]) {
    for (const c of [mandante, visitante]) lancar(c, p.data, "tv", "Cota de TV da rodada", COTA_TV_RODADA[p.serie]);
  }

  // Jogadores: jogos, gols, cartões, suspensões, lesões e energia.
  for (const lado of pv.lados) {
    for (const j of elencoDe(estado, lado.clubeId)) {
      if (j.suspensaoJogos > 0 && !lado.jogaram.includes(j.id)) j.suspensaoJogos--;
    }
    for (const id of lado.jogaram) {
      const j = estado.jogadores[id];
      j.temporada.jogos++;
      j.energia = Math.round(lado.energia[id] ?? j.energia);
    }
    for (const [idTexto, n] of Object.entries(lado.amarelos)) {
      const j = estado.jogadores[Number(idTexto)];
      j.temporada.amarelos += n;
      if (n === 1) {
        j.amarelosAcumulados++;
        if (j.amarelosAcumulados >= 3) { j.suspensaoJogos = 1; j.amarelosAcumulados = 0; }
      }
    }
    for (const id of lado.expulsos) {
      const j = estado.jogadores[id];
      j.temporada.vermelhos++;
      j.suspensaoJogos = 1;
    }
    for (const id of lado.lesionados) {
      estado.jogadores[id].lesaoDias = rng.int(DIAS_LESAO.min, DIAS_LESAO.max);
    }
  }
  for (const e of p.eventos) {
    if ((e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador != null && estado.jogadores[e.jogador]) {
      estado.jogadores[e.jogador].temporada.gols++;
      if (e.outro != null && estado.jogadores[e.outro]) estado.jogadores[e.outro].temporada.assistencias++;
    }
  }

  // Moral.
  const ajustar = (c: Clube, d: number) => { c.moral = Math.max(20, Math.min(100, c.moral + d)); };
  if (p.gm > p.gv) { ajustar(mandante, 6); ajustar(visitante, -6); }
  else if (p.gm < p.gv) { ajustar(mandante, -6); ajustar(visitante, 6); }
  else { ajustar(mandante, -1); ajustar(visitante, 1); }

  // Usuário: confiança e avisos.
  const meu = estado.tecnico.clubeId;
  if (p.mandante === meu || p.visitante === meu) {
    atualizarConfianca(estado, p);
    const lado = p.mandante === meu ? lm : lv;
    const avisos: string[] = [];
    for (const id of lado.lesionados) avisos.push(`${estado.jogadores[id].nome} está lesionado (${estado.jogadores[id].lesaoDias} dias).`);
    for (const j of elencoDe(estado, meu)) {
      if (j.suspensaoJogos > 0 && (lado.expulsos.includes(j.id) || lado.amarelos[j.id])) avisos.push(`${j.nome} está suspenso para o próximo jogo.`);
    }
    if (avisos.length) enviarMensagem(estado, { tipo: "lesao", titulo: "Departamento médico e disciplina", texto: avisos.join(" ") });
  }
}

/** Termina (se preciso) e registra todas as partidas do dia, depois avança as fases. */
export function concluirJogos(estado: EstadoJogo, vivas: PartidaViva[]): string[] {
  for (const pv of vivas) {
    if (!pv.terminada) simularAteOFim(pv, estado.jogadores);
    aplicarResultado(estado, pv);
  }
  const noticias = [...avancarFases(estado), ...avancarCopa(estado)];
  for (const n of noticias) enviarMensagem(estado, { tipo: "noticia", titulo: "Notícias", texto: n });
  return noticias;
}

/** Joga o dia inteiro sem assistir (inclusive o jogo do usuário). */
export function simularDia(estado: EstadoJogo): PartidaViva[] {
  const vivas = prepararJogos(estado);
  concluirJogos(estado, vivas);
  return vivas;
}

/** Simula tudo até o fim da temporada (útil quando a série do usuário já acabou). */
export function simularRestoDaTemporada(estado: EstadoJogo) {
  let seguranca = 0;
  while (!temporadaEncerrada(estado) && seguranca++ < 200) {
    const r = avancar(estado);
    if (r.tipo === "jogos-hoje") simularDia(estado);
    else if (r.tipo === "nada") break;
  }
}

/** Clubes da Série C que fazem proposta quando o clube do usuário cai para a Série D. */
export function propostasDeEmprego(estado: EstadoJogo): string[] {
  const rng = rngPara(estado.semente, `emprego/${estado.temporada}`);
  const candidatos = rankingDeForca(estado, "C").slice(8).map((r) => r.clubeId);
  return rng.embaralhar(candidatos).slice(0, 4);
}

export function assumirClube(estado: EstadoJogo, clubeId: string) {
  const anterior = estado.clubes[estado.tecnico.clubeId].nome;
  estado.tecnico.clubeId = clubeId;
  estado.tecnico.confiancaDiretoria = 55;
  estado.tecnico.confiancaTorcida = 50;
  estado.objetivo = definirObjetivo(estado);
  const clube = estado.clubes[clubeId];
  enviarMensagem(estado, {
    tipo: "diretoria",
    titulo: `Bem-vindo ao ${clube.nome}!`,
    texto: `Depois da passagem pelo ${anterior}, você assume o ${clube.nome}. Objetivo: ${estado.objetivo.descricao}.`,
  });
}

/** Força dos clubes de uma série, do mais forte ao mais fraco. */
export function rankingDeForca(estado: EstadoJogo, serie: SerieClube): { clubeId: string; forca: number }[] {
  return Object.values(estado.clubes)
    .filter((c) => c.serie === serie)
    .map((c) => ({ clubeId: c.id, forca: forcaDoTime(elencoDe(estado, c.id)) }))
    .sort((a, b) => b.forca - a.forca);
}

export { reescalar };
