export type Posicao = "G" | "L" | "Z" | "M" | "A";
export type Lado = "D" | "E";
export type SerieId = "A" | "B" | "C";
export type SerieClube = SerieId | "D";
/** Competição de uma partida: uma das séries ou a Copa do Brasil ("CB"). */
export type Competicao = SerieId | "CB";
export type FaseCopa = "fase1" | "fase2" | "fase3" | "fase4" | "fase5" | "oitavas" | "quartas" | "semi" | "final";

/** As 14 características do modelo do Brasfoot (4 de goleiro, 10 de linha). */
export type Caracteristica =
  | "COL" // colocação
  | "REF" // reflexo
  | "SAI" // saída do gol
  | "PEN" // defesa de pênalti
  | "ARM" // armação
  | "CAB" // cabeceio
  | "CRU" // cruzamento
  | "DES" // desarme
  | "DRI" // drible
  | "FIN" // finalização
  | "MAR" // marcação
  | "PAS" // passe
  | "RES" // resistência
  | "VEL"; // velocidade

export type Estilo = "equilibrado" | "ofensivo" | "defensivo" | "contra-ataque" | "ataque-total" | "posse";
export type Marcacao = "normal" | "pressao";
export type Jogadas = "meio" | "pontas";
export type Formacao = "4-4-2" | "4-3-3" | "3-5-2" | "4-5-1" | "5-3-2" | "4-2-4";

export interface Tatica {
  formacao: Formacao;
  estilo: Estilo;
  marcacao: Marcacao;
  jogadas: Jogadas;
}

export interface EstatisticasJogador {
  jogos: number;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  /** Soma das notas e quantos jogos tiveram nota (a média é uma pela outra). Faltam nos saves antigos. */
  notas?: number;
  avaliados?: number;
}

export interface Jogador {
  id: number;
  nome: string;
  nacionalidade: string;
  posicao: Posicao;
  lado: Lado;
  idade: number;
  forca: number;
  /** Oculto na interface: até onde a força pode crescer. */
  potencial: number;
  caracteristicas: Caracteristica[];
  energia: number;
  clubeId: string | null;
  salario: number;
  lesaoDias: number;
  suspensaoJogos: number;
  /** Amarelos acumulados para suspensão (3 = um jogo de gancho). */
  amarelosAcumulados: number;
  aVenda: boolean;
  temporada: EstatisticasJogador;
  carreira: EstatisticasJogador;
  /**
   * Última temporada do contrato: no fim dela, quem joga no clube do usuário e não renovou sai de graça (os clubes
   * do computador renovam). Livres não têm. Falta nos saves antigos: ganham ao abrir o jogo (`migrar`).
   */
  contratoAte?: number;
  /** Emprestado: joga no `clubeId` até a virada da temporada `ate` e então volta ao clube `de` (dono do contrato). */
  emprestimo?: { de: string; ate: number };
}

export type TipoLancamento =
  | "bilheteria"
  | "tv"
  | "patrocinio"
  | "salarios"
  | "estadio"
  | "transferencia"
  | "premiacao"
  | "rescisao";

export interface Lancamento {
  data: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
}

export interface Escalacao {
  /** Um jogador por posição da formação (mesma ordem de `FORMACOES[formacao]`). */
  titulares: (number | null)[];
  reservas: number[];
}

export interface ObraEstadio {
  tipo: "ampliacao" | "modernizacao";
  /** Lugares a mais (ampliação). */
  lugares?: number;
  terminaEm: string;
}

export interface Estadio {
  nome: string;
  capacidade: number;
  /** Nível de conforto (0 a 3): cada nível atrai 10% a mais de público. */
  conforto?: number;
  obra?: ObraEstadio;
}

export interface Clube {
  id: string;
  nome: string;
  sigla: string;
  cidade: string;
  estado: string;
  serie: SerieClube;
  cores: { primaria: string; secundaria: string };
  estadio: Estadio;
  fundacao: number;
  rival: string | null;
  torcida: number;
  reputacao: number;
  forcaElenco: { min: number; max: number };
  caixa: number;
  precoIngresso: number;
  moral: number;
  tatica: Tatica;
  escalacao: Escalacao;
  extrato: Lancamento[];
  /** Soma por tipo de lançamento na temporada atual. */
  resumoFinanceiro: Partial<Record<TipoLancamento, number>>;
  /** Clube da Série D com elenco montado só para a Copa do Brasil (sai na virada da temporada). */
  elencoDaCopa?: boolean;
  /** Batedor de pênalti escolhido pelo usuário (fora de campo ou sem escolha: cobra o melhor batedor em campo). */
  batedor?: number;
  /** Capitão escolhido pelo usuário (fora dos titulares ou sem escolha: o titular mais experiente). Só aparece na tela. */
  capitao?: number;
}

export type TipoEvento =
  | "gol"
  | "gol-penalti"
  | "penalti"
  | "penalti-perdido"
  | "amarelo"
  | "vermelho"
  | "lesao"
  | "substituicao"
  | "defesa"
  | "chance"
  | "lance"
  | "intervalo"
  | "fim";

export interface EventoPartida {
  /** Minuto já formatado para exibir ("45+2"). */
  min: string;
  tipo: TipoEvento;
  /** 0 = mandante, 1 = visitante. */
  lado: 0 | 1;
  jogador?: number;
  outro?: number;
  texto: string;
}

export interface Partida {
  id: string;
  serie: Competicao;
  fase: string;
  grupo?: number;
  /** Mata-mata: número do confronto e se é o jogo de ida (1) ou de volta (2). */
  chave?: number;
  perna?: 1 | 2;
  rodada: number;
  data: string;
  mandante: string;
  visitante: string;
  jogada: boolean;
  gm: number;
  gv: number;
  penaltis?: [number, number];
  /** Final da Copa do Brasil: campo neutro, sem vantagem de mando nem bilheteria. */
  neutro?: boolean;
  publico?: number;
  /** Gols, cartões e lesões (o resto da narração não é guardado). */
  eventos: EventoPartida[];
  /** O melhor em campo (maior nota entre quem jogou pelo menos 30 minutos). */
  melhor?: number;
}

export type FaseSerie = "liga" | "playoff" | "quadrangulares" | "final" | "encerrada";

export interface EstadoSerie {
  id: SerieId;
  nome: string;
  clubes: string[];
  fase: FaseSerie;
  /** Quadrangulares da Série C. */
  grupos?: string[][];
  campeao?: string;
  promovidos: string[];
  rebaixados: string[];
}

export type TipoMensagem = "diretoria" | "proposta" | "lesao" | "noticia" | "temporada" | "mercado" | "convite";

export interface Mensagem {
  id: number;
  data: string;
  tipo: TipoMensagem;
  titulo: string;
  texto: string;
  lida: boolean;
  /** Proposta de compra recebida por um jogador do usuário. */
  proposta?: {
    jogadorId: number;
    clubeId: string;
    valor: number;
    validaAte: string;
    resolvida?: "aceita" | "recusada" | "expirada" | "retirada";
    /** Primeira oferta (guardada quando o usuário pede mais) e quantas vezes ele já pediu. */
    inicial?: number;
    pedidos?: number;
  };
  /** Convite de outro clube para o técnico. */
  convite?: {
    clubeId: string;
    validaAte: string;
    resolvido?: "aceito" | "recusado" | "expirado";
  };
}

export interface Objetivo {
  descricao: string;
  /** Posição máxima aceitável na fase de liga. */
  posicaoAlvo: number;
}

/** Copa do Brasil da temporada (falta nos saves de antes da Copa: ela começa na temporada seguinte). */
export interface EstadoCopa {
  fase: FaseCopa | "encerrada";
  /** Os 126 clubes, do mais bem colocado no ranking ao pior: define potes e mando. */
  ranking: string[];
  /** Quem entra em cada fase (os outros vêm da fase anterior). */
  entram: Partial<Record<FaseCopa, string[]>>;
  campeao?: string;
  vice?: string;
}

export interface RegistroTemporada {
  temporada: number;
  campeoes: Record<SerieId, string>;
  copa?: { campeao: string; vice: string };
  artilheiros: Record<SerieId, { jogadorId: number; nome: string; clubeId: string; gols: number } | null>;
  promovidos: Record<SerieId, string[]>;
  rebaixados: Record<SerieId, string[]>;
  tecnico: { clubeId: string; serie: SerieId; posicao: number; objetivo: string; cumpriu: boolean };
}

export interface Tecnico {
  nome: string;
  clubeId: string;
  confiancaDiretoria: number;
  confiancaTorcida: number;
  /** Prestígio (0–100): decide quem faz convite e proposta. Falta nos saves antigos: vale a do clube atual. */
  reputacao?: number;
  /** Quando assumiu o clube atual (no primeiro mês não há demissão). Falta nos saves antigos: marcada no primeiro jogo. */
  desde?: string;
  /** Último recado de cargo em risco (no máximo um por mês). */
  avisoDeRisco?: string;
  /** Demitido: escolhe um destes clubes antes de seguir (o `clubeId` ainda é o do clube que o demitiu). */
  demissao?: { data: string; clubeId: string; propostas: string[] };
}

export interface Configuracoes {
  velocidade: 1 | 2;
  escalacaoAutomatica: boolean;
  /** Sons da partida (apito, torcida e narrador). Falta nos saves antigos: ligados. */
  som?: boolean;
}

export interface EstadoJogo {
  versao: 1;
  semente: number;
  temporada: number;
  data: string;
  tecnico: Tecnico;
  objetivo: Objetivo;
  clubes: Record<string, Clube>;
  jogadores: Record<number, Jogador>;
  proximoIdJogador: number;
  series: Record<SerieId, EstadoSerie>;
  copa?: EstadoCopa;
  partidas: Partida[];
  mensagens: Mensagem[];
  proximoIdMensagem: number;
  historico: RegistroTemporada[];
  config: Configuracoes;
}
