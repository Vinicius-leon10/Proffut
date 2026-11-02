// Orquestra o jogo: criar carreira, avançar o calendário, jogar os dias de jogo.
import clubesJson from "../../data/brasil-2026/clubes.json";
import reservaJson from "../../data/brasil-2026/serie-d-reserva.json";
import jogadoresJson from "../../data/brasil-2026/jogadores.json";
import estaduaisClubesJson from "../../data/brasil-2026/clubes-estaduais.json";
import estaduaisJson from "../../data/brasil-2026/estaduais.json";
import exteriorClubesJson from "../../data/america-do-sul-2026/clubes.json";
import exteriorJogadoresJson from "../../data/america-do-sul-2026/jogadores.json";
import { comArtigo } from "./artigos";
import { diasEntre, inicioDaTemporada, mesDe, somarDias } from "./calendario";
import {
  FASE_LIGA, agregado, avancarFases, chaveDaPartida, criarTemporada, decidePorPenaltis, ehSerie, temporadaEncerrada,
} from "./competicoes";
import { COTA_TV_ESTADUAL, COTA_TV_RODADA, DIAS_LESAO, RECUPERACAO_POR_DIA, TEMPORADA_INICIAL } from "./constantes";
import { depoisDoMeuJogo, expirarConvites } from "./carreira";
import { avisarContratos, garantirContratos } from "./contratos";
import { melhorEmCampo, notasDaPartida } from "./notas";
import { registrarRecordes } from "./trofeus";
import { atualizarConfianca, definirObjetivo } from "./diretoria";
import { escalarAutomatico, forcaDoTime } from "./forca";
import { lancar, precoDeReferencia, processarMes, publicoDoJogo } from "./financas";
import { elencoReal, gerarElenco, type JogadorReal } from "./gerador";
import { completarLivres, elencoDe, gerarPropostas, reescalar, transferenciasDaIa } from "./mercado";
import { enviarMensagem } from "./mensagens";
import {
  disputarPenaltis, eventosParaGuardar, iniciarPartida, montarLado, simularAteOFim, type LadoVivo, type PartidaViva,
} from "./partida";
import { criarRng, rngPara } from "./rng";
import { avancarCopa, criarCopa } from "./copa";
import { concluirObras } from "./estadio";
import { encerrarTemporada } from "./temporada";
import { PAISES, avancarTorneios, competicoesDoUsuario, criarTorneios, inicioDoAno } from "./torneios";
import type { Clube, Estilo, EstadoJogo, Formacao, Jogador, Partida, SerieClube, Tatica } from "./tipos";

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
  /** Clube de fora do Brasil: o código do país ("AR", "UY"...). */
  pais?: string;
  /** Liga que ele joga em 2026: o código do país (primeira divisão) ou com 2 no fim (segunda); falta: a primeira. */
  liga?: string;
}

export const FICHAS: FichaClube[] = clubesJson.clubes as FichaClube[];
/** Clubes da Série D. */
export const RESERVA: FichaClube[] = reservaJson.clubes as FichaClube[];
/** Clubes que jogam só o estadual. */
export const FICHAS_ESTADUAIS: FichaClube[] = estaduaisClubesJson.clubes as FichaClube[];
/** Clubes da primeira divisão dos outros países da Conmebol. */
export const FICHAS_EXTERIOR: FichaClube[] = exteriorClubesJson.clubes as FichaClube[];
/** Quem joga cada estadual (sigla do estado → ids dos clubes). */
export const PARTICIPANTES_ESTADUAIS = estaduaisJson.participantes as Record<string, string[]>;
/**
 * Elencos de verdade (tools/elencos/montar.ts e tools/times/montar.ts): Séries A a D, clubes dos estaduais e das
 * ligas de fora. Clube sem elenco aqui ganha um gerado.
 */
export const ELENCOS_REAIS = { ...(jogadoresJson.elencos as Record<string, JogadorReal[]>), ...(exteriorJogadoresJson.elencos as Record<string, JogadorReal[]>) };

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
    precoIngresso: precoDeReferencia(serie),
    moral: 60,
    tatica: taticaDaIa(ficha, rng),
    escalacao: { titulares: [], reservas: [] },
    extrato: [],
    resumoFinanceiro: {},
  };
}

/**
 * Clubes que ainda faltam no jogo (os da Série D, os só do estadual e os de fora), com os elencos: no jogo novo e
 * ao abrir um save de antes deles. Marca também quem joga cada estadual. Devolve quantos clubes entraram.
 */
export function juntarClubesNovos(estado: EstadoJogo, rng: ReturnType<typeof criarRng>): number {
  let novos = 0;
  const criar = (ficha: FichaClube, serie: SerieClube) => {
    if (estado.clubes[ficha.id]) return;
    const clube = criarClube(ficha, serie, rng);
    if (ficha.pais) { clube.pais = ficha.pais; clube.liga = ficha.liga ?? ficha.pais; }
    estado.clubes[ficha.id] = clube;
    novos++;
  };
  for (const ficha of RESERVA) criar(ficha, "D");
  for (const ficha of FICHAS_ESTADUAIS) criar(ficha, "estadual");
  for (const ficha of FICHAS_EXTERIOR) criar(ficha, "exterior");
  for (const [uf, ids] of Object.entries(PARTICIPANTES_ESTADUAIS)) {
    for (const id of ids) if (estado.clubes[id]) estado.clubes[id].estadual = uf;
  }
  // Elenco para quem não tem (os clubes novos e os da Série D que ainda não tinham, ou só tinham o da Copa).
  const comElenco = new Set(Object.values(estado.jogadores).map((j) => j.clubeId));
  for (const clube of Object.values(estado.clubes)) {
    if (clube.elencoDaCopa) {
      for (const j of elencoDe(estado, clube.id)) delete estado.jogadores[j.id];
      delete clube.elencoDaCopa;
      comElenco.delete(clube.id);
    }
    if (comElenco.has(clube.id)) continue;
    const proximoId = () => estado.proximoIdJogador++;
    const reais = ELENCOS_REAIS[clube.id];
    const nacionalidade = clube.pais ? PAISES[clube.pais]?.nacionalidade : undefined;
    for (const j of reais ? elencoReal(rng, clube, reais, proximoId, nacionalidade) : gerarElenco(rng, clube, proximoId, undefined, nacionalidade)) estado.jogadores[j.id] = j;
    clube.escalacao = escalarAutomatico(elencoDe(estado, clube.id), clube.tatica.formacao, clube.tatica.jogadas);
  }
  return novos;
}

/**
 * Save de antes dos times novos (nov/2026): entram os clubes da Série D, os só do estadual e os de fora, com os
 * elencos. Se a temporada ainda não começou, a Série D e as ligas de fora já valem para ela; os estaduais (de janeiro
 * a março) e, com a temporada em andamento, todos os torneios começam na próxima.
 */
export function juntarAoSaveAntigo(estado: EstadoJogo) {
  if (estado.torneios) return;
  juntarClubesNovos(estado, rngPara(estado.semente, "mundo/clubes-novos"));
  const comecou = estado.partidas.some((p) => p.jogada);
  if (!comecou && estado.data < somarDias(inicioDaTemporada(estado.temporada), 1)) criarTorneios(estado, { semEstaduais: true });
  else estado.torneios = {};
}

/**
 * Listas dos estaduais e das ligas de fora corrigidas (nov/2026: entravam os rebaixados do ano anterior citados nas
 * páginas, quem desistiu e quem perdeu a final da segunda divisão). No save que já tem os times novos, entram os que
 * faltavam (com elenco) e cada clube fica com o estadual e a liga das listas atuais: os campeonatos da próxima
 * temporada saem certos; os da temporada em andamento seguem como estão. Quem saiu das listas continua no jogo, com os
 * jogadores, sem estadual nem liga. A Série D do save não muda (ela já mudou com os acessos e as quedas), nem a divisão
 * dos clubes de fora nos países em que o save já tem a segunda divisão.
 */
export function acertarParticipantes(estado: EstadoJogo) {
  if (!estado.torneios) return;
  // Países em que o save já tem a segunda divisão (nov/2026): lá o acesso e a queda mudam a divisão dos clubes, e vale a
  // do save. Nos outros (save de antes dela), vale a das listas.
  const comSegunda = new Set(Object.values(estado.clubes).flatMap((c) => (c.liga?.endsWith("2") ? [c.liga.slice(0, 2)] : [])));
  juntarClubesNovos(estado, rngPara(estado.semente, "mundo/clubes-novos-2"));
  const ufDoClube = new Map(Object.entries(PARTICIPANTES_ESTADUAIS).flatMap(([uf, ids]) => ids.map((id) => [id, uf] as const)));
  const ligaDoClube = new Map(FICHAS_EXTERIOR.map((f) => [f.id, f.liga ?? f.pais]));
  for (const c of Object.values(estado.clubes)) {
    const uf = ufDoClube.get(c.id);
    if (uf) c.estadual = uf;
    else delete c.estadual;
    if (c.serie !== "exterior") continue;
    const liga = ligaDoClube.get(c.id);
    if (!liga) delete c.liga;
    else if (!c.liga || !comSegunda.has(liga.slice(0, 2)) || c.liga.slice(0, 2) !== liga.slice(0, 2)) c.liga = liga;
  }
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
  // O técnico começa com a reputação do clube que o contratou.
  estado.tecnico.reputacao = estado.clubes[opcoes.clubeId].reputacao;

  // Séries A, B e C primeiro (os sorteios dos 60 clubes são os de sempre), depois os outros clubes.
  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    const proximoId = () => estado.proximoIdJogador++;
    const reais = ELENCOS_REAIS[clube.id];
    for (const j of reais ? elencoReal(rng, clube, reais, proximoId) : gerarElenco(rng, clube, proximoId)) estado.jogadores[j.id] = j;
  }
  juntarClubesNovos(estado, rng);
  completarLivres(estado, "inicio");
  garantirContratos(estado, TEMPORADA_INICIAL);

  const meu = estado.clubes[opcoes.clubeId];
  meu.tatica = { formacao: "4-4-2", estilo: "equilibrado", marcacao: "normal", jogadas: "meio" };
  for (const clube of Object.values(estado.clubes)) {
    clube.escalacao = escalarAutomatico(elencoDe(estado, clube.id), clube.tatica.formacao, clube.tatica.jogadas);
  }

  criarTemporada(estado);
  // Com estaduais, a temporada começa em janeiro, uma semana antes deles.
  if (Object.keys(estado.torneios ?? {}).some((id) => id.startsWith("E-"))) estado.data = inicioDoAno(TEMPORADA_INICIAL);
  estado.tecnico.desde = estado.data;
  criarCopa(estado);
  estado.objetivo = definirObjetivo(estado);
  enviarMensagem(estado, {
    tipo: "diretoria",
    titulo: `Bem-vindo ${comArtigo("ao", meu)}!`,
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
    expirarConvites(estado, dia);
    avisarContratos(estado, dia);
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
  /** Os últimos jogos do ano eram de campeonatos que o usuário não acompanha: a temporada acabou, falta encerrar. */
  | { tipo: "fim-dos-jogos" }
  | { tipo: "nada" };

/**
 * Botão "Avançar": se há jogos hoje, eles precisam ser jogados; senão vai para
 * a próxima data com jogo; com a temporada encerrada, faz a virada.
 */
export function avancar(estado: EstadoJogo): ResultadoAvanco {
  let andou = false;
  // Dia só com jogos que o usuário não acompanha (Série D dos outros, outros estaduais, ligas de fora): passa direto.
  for (let seguranca = 0; seguranca < 1000; seguranca++) {
    const pendentes = jogosPendentesHoje(estado);
    if (pendentes.length) {
      const acompanha = competicoesDoUsuario(estado);
      if (pendentes.some((p) => acompanha.has(p.serie))) return { tipo: "jogos-hoje", meuJogo: meuJogoHoje(estado) };
      simularDia(estado);
      andou = true;
      continue;
    }
    if (temporadaEncerrada(estado)) {
      // A virada só no botão "Encerrar a temporada" (ele pergunta antes quem sai de graça): se os últimos jogos do ano
      // eram de fora (a 2ª divisão da Argentina termina depois da final da Série C), este Avançar para aqui (R79).
      if (andou) return { tipo: "fim-dos-jogos" };
      encerrarTemporada(estado);
      return { tipo: "nova-temporada" };
    }
    const proxima = proximaDataComJogo(estado);
    if (!proxima) return { tipo: "nada" };
    processarDias(estado, proxima);
  }
  return { tipo: "nada" };
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
    // Estatísticas e campo 2D só na partida do usuário, com sorteios próprios (não mudam o resultado).
    const minha = p.mandante === meu || p.visitante === meu;
    const proprio = (nome: string) => (minha ? rngPara(estado.semente, `${nome}/${p.id}`) : undefined);
    return iniciarPartida(p, lados[0], lados[1], rngPara(estado.semente, `partida/${p.id}`), proprio("estatisticas"), proprio("campo"));
  });
}

/**
 * O time que um clube do computador deve pôr em campo no próximo jogo: a mesma escolha que
 * `prepararJogos` faz no dia (os melhores disponíveis na formação dele), sem mudar nada no jogo.
 */
export function provavelTime(estado: EstadoJogo, clubeId: string): LadoVivo {
  const clube = estado.clubes[clubeId];
  const elenco = elencoDe(estado, clubeId);
  const escalacao = escalarAutomatico(elenco, clube.tatica.formacao, clube.tatica.jogadas);
  return montarLado({ ...clube, escalacao }, estado.jogadores, elenco, false);
}

/** `elencos`: os jogadores de cada clube, montados uma vez para o dia (procurar no jogo todo a cada partida pesava). */
function aplicarResultado(estado: EstadoJogo, pv: PartidaViva, elencos: Map<string, Jogador[]>) {
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
  if (ehSerie(p.serie) && p.fase === FASE_LIGA[p.serie]) {
    for (const c of [mandante, visitante]) lancar(c, p.data, "tv", "Cota de TV da rodada", COTA_TV_RODADA[p.serie]);
  }
  // Estadual: cota de TV para os clubes das Séries A, B e C.
  if (p.serie.startsWith("E-")) {
    for (const c of [mandante, visitante]) if (ehSerie(c.serie)) lancar(c, p.data, "tv", "Cota de TV do estadual", COTA_TV_ESTADUAL[c.serie]);
  }

  // Jogadores: jogos, gols, cartões, suspensões, lesões e energia.
  for (const lado of pv.lados) {
    for (const j of elencos.get(lado.clubeId) ?? []) {
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
  // Notas: entram na média da temporada de cada um, e o melhor em campo fica na partida.
  const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
  for (const n of notas) {
    const t = estado.jogadores[n.jogadorId].temporada;
    t.notas = Math.round(((t.notas ?? 0) + n.nota) * 10) / 10;
    t.avaliados = (t.avaliados ?? 0) + 1;
  }
  p.melhor = melhorEmCampo(notas)?.jogadorId;
  registrarRecordes(estado, p);

  // Moral.
  const ajustar = (c: Clube, d: number) => { c.moral = Math.max(20, Math.min(100, c.moral + d)); };
  if (p.gm > p.gv) { ajustar(mandante, 6); ajustar(visitante, -6); }
  else if (p.gm < p.gv) { ajustar(mandante, -6); ajustar(visitante, 6); }
  else { ajustar(mandante, -1); ajustar(visitante, 1); }

  // Usuário: confiança e avisos.
  const meu = estado.tecnico.clubeId;
  if (p.mandante === meu || p.visitante === meu) {
    atualizarConfianca(estado, p);
    depoisDoMeuJogo(estado, p);
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
  // Os elencos do dia, uma vez só (registrar uma partida não troca ninguém de clube).
  const elencos = new Map<string, Jogador[]>();
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId) continue;
    const lista = elencos.get(j.clubeId);
    if (lista) lista.push(j);
    else elencos.set(j.clubeId, [j]);
  }
  for (const pv of vivas) {
    if (!pv.terminada) simularAteOFim(pv, estado.jogadores);
    aplicarResultado(estado, pv, elencos);
  }
  const noticias = [...avancarFases(estado), ...avancarCopa(estado), ...avancarTorneios(estado)];
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

/**
 * O técnico só treina clubes das Séries A, B e C: quando o clube dele cai para a Série D, quatro clubes da Série C (fora
 * os oito mais fortes) fazem proposta, e ele escolhe um no fim da temporada.
 */
export function propostasDeEmprego(estado: EstadoJogo): string[] {
  const rng = rngPara(estado.semente, `emprego/${estado.temporada}`);
  const candidatos = rankingDeForca(estado, "C").slice(8).map((r) => r.clubeId);
  return rng.embaralhar(candidatos).slice(0, 4);
}

/** Força dos clubes de uma série, do mais forte ao mais fraco. */
export function rankingDeForca(estado: EstadoJogo, serie: SerieClube): { clubeId: string; forca: number }[] {
  return Object.values(estado.clubes)
    .filter((c) => c.serie === serie)
    .map((c) => ({ clubeId: c.id, forca: forcaDoTime(elencoDe(estado, c.id)) }))
    .sort((a, b) => b.forca - a.forca);
}

export { reescalar };
export { assumirClube } from "./carreira";
