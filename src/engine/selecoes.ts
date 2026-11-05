// Seleções da América (nov/2026, pedido "traga tudo que tem da América ... E a seleção de todos esses países"): as 10 da
// Conmebol e as 41 da Concacaf, com as convocações de verdade (data/selecoes-2026/convocados.json, montado por
// tools/selecoes/montar.ts a partir da última convocação de cada uma na Wikipédia).
//
// Cada seleção é um "clube" do jogo com a série "selecao" e o id "sel-" + o país ("sel-BR"): assim a partida, o placar, o
// escudo (a bandeira) e as tabelas funcionam como nos clubes. Quem joga nos clubes do jogo continua no clube e só vai à
// seleção nas datas FIFA; quem joga fora dos clubes do jogo (Europa, Ásia...) fica no jogo ligado à seleção (`clubeId`
// "sel-BR", com o clube de verdade em `Jogador.clubeFora`): não é vendido nem joga pelos clubes, envelhece e se aposenta, e
// jovens de fora tomam o lugar de quem para.
//
// Datas FIFA: março, junho (fora dos anos de Copa do Mundo), setembro, outubro e novembro, dois jogos cada (quinta e
// terça). Os convocados ficam fora dos clubes de 3 dias antes de cada jogo até o jogo (e nos dias entre dois jogos
// seguidos): os clubes jogam sem eles, como no Brasileirão. Em junho e julho, a Copa América (anos múltiplos de 4) ou a
// Copa Ouro (anos ímpares). Eliminatórias da Copa do Mundo: na Conmebol, os 10 em turno e returno (18 rodadas, de
// setembro de 3 anos antes da Copa a setembro do ano anterior; 6 vão à Copa e o 7º à repescagem); na Concacaf, três fases
// (os 4 piores no mata-mata, 30 em 6 grupos de 5, 12 em 3 grupos de 4; os primeiros vão à Copa e os 2 melhores segundos à
// repescagem). Nas datas sem jogo oficial, amistosos entre seleções de força parecida. A Copa do Mundo (com os outros
// continentes) ainda não está no jogo.
//
// Ranking: pontos do tipo Elo (começam perto dos de 2026 e mudam a cada jogo). Técnico: o convite de uma seleção só chega
// a quem já ganhou a liga principal de um país (regra do usuário); ele treina a seleção junto com o clube.
import convocadosJson from "../../data/selecoes-2026/convocados.json";
import { diasEntre, somarDias, turnoEReturno, turnoUnico, type Confronto } from "./calendario";
import { chavesDaFase, classificacao, vencedorDaChave, type LinhaTabela } from "./competicoes";
import { diaDaSemana, sortearGrupos, type Dia } from "./copas";
import { DIAS_LESAO, REPUTACAO } from "./constantes";
import { escalarAutomatico, forcaDoTime } from "./forca";
import { criarJogador, limitar } from "./gerador";
import { enviarMensagem } from "./mensagens";
import { melhorEmCampo, notasDaPartida } from "./notas";
import { disputarPenaltis, eventosParaGuardar, type PartidaViva } from "./partida";
import { hashTexto, rngPara, type Rng } from "./rng";
import { PAISES } from "./torneios";
import type {
  Clube, Competicao, EstadoCompeticaoSelecoes, EstadoJogo, EstadoSelecoes, IdCompeticaoSelecoes, Jogador, Partida, Posicao,
  RegistroTemporada, TipoCompeticaoSelecoes,
} from "./tipos";

// ---- as seleções -------------------------------------------------------------------------------------------

export const PREFIXO_SELECAO = "sel-";
export const idSelecao = (pais: string) => `${PREFIXO_SELECAO}${pais}`;
export const ehSelecao = (id: string | null | undefined): boolean => !!id?.startsWith(PREFIXO_SELECAO);
export const paisDaSelecao = (id: string) => id.slice(PREFIXO_SELECAO.length);

type Confederacao = "conmebol" | "concacaf";

interface DadosSelecao {
  /** Sigla da FIFA (a do placar). */
  sigla: string;
  cores: [string, string];
  estadio: [nome: string, capacidade: number, cidade: string];
  /** Pontos do ranking no começo (perto do Elo de 2026). */
  elo: number;
  /** Fora da FIFA (membros só da Concacaf: não jogam as Eliminatórias). */
  semFifa?: true;
}

/** As 51 seleções: sigla, cores do uniforme, estádio e os pontos do ranking no começo do jogo. */
export const DADOS_SELECOES: Record<string, DadosSelecao> = {
  BR: { sigla: "BRA", cores: ["#FFDF00", "#009C3B"], estadio: ["Maracanã", 78_838, "Rio de Janeiro"], elo: 2050 },
  AR: { sigla: "ARG", cores: ["#75AADB", "#FFFFFF"], estadio: ["Monumental", 85_018, "Buenos Aires"], elo: 2120 },
  BO: { sigla: "BOL", cores: ["#007A3D", "#FFFFFF"], estadio: ["Hernando Siles", 41_143, "La Paz"], elo: 1600 },
  CL: { sigla: "CHI", cores: ["#D52B1E", "#0039A6"], estadio: ["Estádio Nacional", 48_665, "Santiago"], elo: 1700 },
  CO: { sigla: "COL", cores: ["#FCD116", "#003893"], estadio: ["Metropolitano", 46_692, "Barranquilla"], elo: 1990 },
  EC: { sigla: "ECU", cores: ["#FFDD00", "#034EA2"], estadio: ["Rodrigo Paz Delgado", 41_575, "Quito"], elo: 1940 },
  PY: { sigla: "PAR", cores: ["#D52B1E", "#FFFFFF"], estadio: ["Defensores del Chaco", 42_354, "Assunção"], elo: 1850 },
  PE: { sigla: "PER", cores: ["#FFFFFF", "#D91023"], estadio: ["Estádio Nacional", 50_000, "Lima"], elo: 1720 },
  UY: { sigla: "URU", cores: ["#5CBFEB", "#000000"], estadio: ["Centenário", 60_235, "Montevidéu"], elo: 1930 },
  VE: { sigla: "VEN", cores: ["#7B1E2B", "#FFFFFF"], estadio: ["Monumental de Maturín", 51_796, "Maturín"], elo: 1730 },
  MX: { sigla: "MEX", cores: ["#006847", "#FFFFFF"], estadio: ["Azteca", 83_264, "Cidade do México"], elo: 1870 },
  US: { sigla: "USA", cores: ["#FFFFFF", "#0A3161"], estadio: ["SoFi Stadium", 70_240, "Los Angeles"], elo: 1810 },
  CA: { sigla: "CAN", cores: ["#D80621", "#FFFFFF"], estadio: ["BMO Field", 45_736, "Toronto"], elo: 1790 },
  CR: { sigla: "CRC", cores: ["#CE1126", "#002B7F"], estadio: ["Estádio Nacional", 35_175, "San José"], elo: 1660 },
  HN: { sigla: "HON", cores: ["#FFFFFF", "#0073CF"], estadio: ["Olímpico Metropolitano", 37_325, "San Pedro Sula"], elo: 1610 },
  GT: { sigla: "GUA", cores: ["#FFFFFF", "#4997D0"], estadio: ["Doroteo Guamuch Flores", 26_000, "Cidade da Guatemala"], elo: 1580 },
  SV: { sigla: "SLV", cores: ["#0047AB", "#FFFFFF"], estadio: ["Cuscatlán", 44_836, "San Salvador"], elo: 1500 },
  PA: { sigla: "PAN", cores: ["#DA121A", "#005293"], estadio: ["Rommel Fernández", 32_000, "Cidade do Panamá"], elo: 1740 },
  NI: { sigla: "NCA", cores: ["#0067C6", "#FFFFFF"], estadio: ["Estádio Nacional", 15_000, "Manágua"], elo: 1420 },
  BZ: { sigla: "BLZ", cores: ["#003F87", "#CE1126"], estadio: ["FFB Stadium", 2_500, "Belmopan"], elo: 1170 },
  JM: { sigla: "JAM", cores: ["#FED100", "#009B3A"], estadio: ["National Stadium", 35_000, "Kingston"], elo: 1650 },
  TT: { sigla: "TRI", cores: ["#CE1126", "#000000"], estadio: ["Hasely Crawford", 22_575, "Port of Spain"], elo: 1520 },
  HT: { sigla: "HAI", cores: ["#00209F", "#D21034"], estadio: ["Sylvio Cator", 10_500, "Porto Príncipe"], elo: 1560 },
  DO: { sigla: "DOM", cores: ["#002D62", "#CE1126"], estadio: ["Félix Sánchez", 27_000, "Santo Domingo"], elo: 1380 },
  CU: { sigla: "CUB", cores: ["#CF142B", "#002A8F"], estadio: ["Pedro Marrero", 28_000, "Havana"], elo: 1300 },
  PR: { sigla: "PUR", cores: ["#ED0000", "#0050F0"], estadio: ["Juan Ramón Loubriel", 22_000, "Bayamón"], elo: 1260 },
  SR: { sigla: "SUR", cores: ["#377E3F", "#FFFFFF"], estadio: ["Franklin Essed", 3_500, "Paramaribo"], elo: 1510 },
  GY: { sigla: "GUY", cores: ["#009E49", "#FCD116"], estadio: ["National Stadium", 15_000, "Georgetown"], elo: 1310 },
  CW: { sigla: "CUW", cores: ["#002B7F", "#F9E814"], estadio: ["Ergilio Hato", 15_000, "Willemstad"], elo: 1600 },
  AW: { sigla: "ARU", cores: ["#418FDE", "#FFD100"], estadio: ["Trinidad Stadium", 5_000, "Oranjestad"], elo: 1070 },
  SX: { sigla: "SXM", cores: ["#CE1126", "#002868"], estadio: ["Raoul Illidge", 3_000, "Philipsburg"], elo: 900, semFifa: true },
  BQ: { sigla: "BOE", cores: ["#FFD100", "#012A87"], estadio: ["Antonio Trenidat", 3_000, "Kralendijk"], elo: 920, semFifa: true },
  MQ: { sigla: "MTQ", cores: ["#D22630", "#009639"], estadio: ["Pierre-Aliker", 16_300, "Fort-de-France"], elo: 1420, semFifa: true },
  GP: { sigla: "GLP", cores: ["#E30613", "#FFD100"], estadio: ["René Serge Nabajoth", 7_500, "Les Abymes"], elo: 1380, semFifa: true },
  GF: { sigla: "GYF", cores: ["#00843D", "#FFD100"], estadio: ["Georges Chaumet", 2_000, "Caiena"], elo: 1330, semFifa: true },
  MF: { sigla: "SMN", cores: ["#0055A4", "#FFFFFF"], estadio: ["Alberic Richards", 3_000, "Marigot"], elo: 900, semFifa: true },
  BB: { sigla: "BRB", cores: ["#00267F", "#FFC726"], estadio: ["Estádio Nacional", 5_000, "Bridgetown"], elo: 1060 },
  BS: { sigla: "BAH", cores: ["#00ABC9", "#FAE042"], estadio: ["Thomas Robinson", 15_000, "Nassau"], elo: 850 },
  BM: { sigla: "BER", cores: ["#1E3A8A", "#C8102E"], estadio: ["Estádio Nacional", 8_500, "Hamilton"], elo: 1250 },
  KY: { sigla: "CAY", cores: ["#CF142B", "#002A8F"], estadio: ["Truman Bodden", 3_000, "George Town"], elo: 860 },
  LC: { sigla: "LCA", cores: ["#66CCFF", "#FCD116"], estadio: ["Estádio Nacional", 3_000, "Castries"], elo: 1130 },
  GD: { sigla: "GRN", cores: ["#CE1126", "#FCD116"], estadio: ["Kirani James", 9_000, "Saint George's"], elo: 1220 },
  VC: { sigla: "VIN", cores: ["#0072C6", "#FCD116"], estadio: ["Arnos Vale", 18_000, "Kingstown"], elo: 1170 },
  KN: { sigla: "SKN", cores: ["#009E49", "#CE1126"], estadio: ["Warner Park", 8_000, "Basseterre"], elo: 1230 },
  AG: { sigla: "ATG", cores: ["#CE1126", "#000000"], estadio: ["Sir Vivian Richards", 10_000, "Saint John's"], elo: 1160 },
  DM: { sigla: "DMA", cores: ["#006B3F", "#FCD116"], estadio: ["Windsor Park", 12_000, "Roseau"], elo: 1060 },
  MS: { sigla: "MSR", cores: ["#00843D", "#FFFFFF"], estadio: ["Blakes Estate", 1_000, "Brades"], elo: 1010 },
  AI: { sigla: "AIA", cores: ["#FF8200", "#00247D"], estadio: ["Ronald Webster Park", 4_000, "The Valley"], elo: 720 },
  VG: { sigla: "VGB", cores: ["#006B3F", "#FCD116"], estadio: ["A. O. Shirley", 2_000, "Road Town"], elo: 770 },
  VI: { sigla: "VIR", cores: ["#002868", "#FCD116"], estadio: ["Lionel Roberts Park", 9_000, "Charlotte Amalie"], elo: 800 },
  TC: { sigla: "TCA", cores: ["#00247D", "#FFFFFF"], estadio: ["TCIFA National Academy", 3_000, "Providenciales"], elo: 760 },
};

/** Os países das seleções, na ordem da lista (Conmebol primeiro). */
export const PAISES_SELECOES = Object.keys(DADOS_SELECOES);

export function confederacao(pais: string): Confederacao {
  return pais === "BR" || PAISES[pais]?.regiao === "sul" ? "conmebol" : "concacaf";
}

export function nomeDoPais(pais: string): string {
  return pais === "BR" ? "Brasil" : PAISES[pais]?.pais ?? pais;
}

/** Nacionalidade dos jogadores do país (o código de 3 letras do jogo: "BRA", "ARG", "EUA"...). */
export function nacionalidadeDoPais(pais: string): string {
  return pais === "BR" ? "BRA" : PAISES[pais]?.nacionalidade ?? pais;
}

/** Bandeira do país pelo código de duas letras (as letras viram os "indicadores regionais" do emoji: BR → 🇧🇷). */
export function bandeira(codigo: string): string {
  return String.fromCodePoint(...[...codigo.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Força média dos titulares de uma seleção com `elo` pontos (a referência para os jogadores de fora dos clubes do jogo). */
export function nivelPeloElo(elo: number): number {
  return limitar(40 + (elo - 800) * 0.037, 35, 92);
}

/** Reputação de uma seleção (30 a 99, como a do técnico): decide quem ela convida. */
export function reputacaoPeloElo(elo: number): number {
  return Math.round(limitar(30 + (elo - 700) * 0.048, 30, 99));
}

/** País do clube de verdade (código da FIFA das páginas) em português, para a ficha de quem joga fora dos clubes do jogo. */
const PAIS_DO_CLUBE: Record<string, string> = {
  AIA: "Anguila", ALB: "Albânia", ANG: "Angola", ARG: "Argentina", ARU: "Aruba", ATG: "Antígua e Barbuda", AUT: "Áustria",
  AZE: "Azerbaijão", BAH: "Bahamas", BEL: "Bélgica", BER: "Bermudas", BIH: "Bósnia", BLR: "Belarus", BLZ: "Belize",
  BOE: "Bonaire", BON: "Bonaire", BOL: "Bolívia", BRA: "Brasil", BRB: "Barbados", BRU: "Brunei", BUL: "Bulgária",
  BVI: "Ilhas Virgens Britânicas", CAN: "Canadá", CAY: "Ilhas Cayman", CHI: "Chile", CRC: "Costa Rica", CRO: "Croácia",
  CUB: "Cuba", CUR: "Curaçao", CYP: "Chipre", CZE: "Tchéquia", DEN: "Dinamarca", DMA: "Dominica", DOM: "República Dominicana",
  ENG: "Inglaterra", ESP: "Espanha", SPA: "Espanha", FIN: "Finlândia", FRA: "França", GER: "Alemanha", GIB: "Gibraltar",
  GLP: "Guadalupe", GRE: "Grécia", GRN: "Granada", GUA: "Guatemala", GUF: "Guiana Francesa", GUY: "Guiana", HON: "Honduras",
  HUN: "Hungria", IDN: "Indonésia", ISR: "Israel", ITA: "Itália", JAM: "Jamaica", KSA: "Arábia Saudita", LCA: "Santa Lúcia",
  LIT: "Lituânia", LUX: "Luxemburgo", LVA: "Letônia", MDA: "Moldávia", MEX: "México", MLT: "Malta", MTQ: "Martinica",
  NCA: "Nicarágua", NIC: "Nicarágua", NED: "Holanda", NIR: "Irlanda do Norte", NZL: "Nova Zelândia", PAN: "Panamá",
  PAR: "Paraguai", PER: "Peru", POL: "Polônia", POR: "Portugal", PUR: "Porto Rico", REU: "Reunião", ROM: "Romênia",
  ROU: "Romênia", RUS: "Rússia", SCO: "Escócia", SKN: "São Cristóvão e Névis", SLV: "El Salvador", SMA: "São Martinho",
  SMN: "São Martinho", SRB: "Sérvia", SUI: "Suíça", SWI: "Suíça", SUR: "Suriname", SVG: "São Vicente e Granadinas",
  SVK: "Eslováquia", SWE: "Suécia", SXM: "São Martinho", TCA: "Turks e Caicos", THA: "Tailândia", TRI: "Trinidad e Tobago",
  TTO: "Trinidad e Tobago", TUR: "Turquia", UAE: "Emirados Árabes", UKR: "Ucrânia", USA: "Estados Unidos", VEN: "Venezuela",
  VIR: "Ilhas Virgens Americanas", WAL: "País de Gales",
};

/** Clubes grandes da Europa: quem joga neles é dos melhores da seleção. */
const GRANDES = new Set([
  "real madrid", "barcelona", "atletico madrid", "manchester city", "manchester united", "liverpool", "arsenal", "chelsea",
  "tottenham hotspur", "newcastle united", "aston villa", "bayern munich", "borussia dortmund", "bayer leverkusen", "rb leipzig",
  "paris saint-germain", "inter milan", "ac milan", "milan", "juventus", "napoli", "atalanta", "roma", "benfica", "porto", "sporting cp",
]);
const CINCO_LIGAS = new Set(["ENG", "ESP", "SPA", "ITA", "GER", "FRA"]);
const LIGAS_MEDIAS = new Set(["POR", "NED", "BEL", "TUR", "KSA", "SCO", "RUS", "UKR", "GRE", "AUT", "SUI", "SWI", "DEN", "UAE", "CZE", "CRO", "SRB"]);

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Força de quem joga fora dos clubes do jogo: o nível da seleção, o porte do clube e da liga, os jogos pela seleção e a idade. */
function forcaDeFora(rng: Rng, nivel: number, clube: string, paisDoClube: string, jogos: number, idade: number): number {
  const porte = GRANDES.has(semAcento(clube)) ? 4 : CINCO_LIGAS.has(paisDoClube) ? 1 : LIGAS_MEDIAS.has(paisDoClube) ? -1 : -4;
  const experiencia = limitar(Math.log2(jogos + 1) - 3, -3, 3);
  const pelaIdade = idade < 20 ? -3 : idade < 23 ? -1 : idade <= 31 ? 0 : idade <= 34 ? -1 : -3;
  return Math.round(limitar(nivel + porte + experiencia + pelaIdade + rng.real(-2, 2), 30, 95));
}

interface Convocado {
  nome: string;
  posicao: Posicao;
  nascimento?: string;
  jogos: number;
  gols: number;
  clube: string;
  paisDoClube: string;
  clubeDoJogo?: string;
  noJogo?: string;
}
const CONVOCADOS_2026 = convocadosJson.selecoes as unknown as Record<string, { pagina: string; convocados: Convocado[] }>;

/** Clubes de fora dos convocados de cada seleção (para os jovens que tomam o lugar de quem se aposenta). */
function clubesDeFora(pais: string): { nome: string; pais: string }[] {
  return (CONVOCADOS_2026[pais]?.convocados ?? [])
    .filter((c) => !c.clubeDoJogo && c.clube)
    .map((c) => ({ nome: c.clube, pais: PAIS_DO_CLUBE[c.paisDoClube] ?? "" }));
}

function idadeEm(nascimento: string | undefined, data: string): number {
  if (!nascimento) return 26;
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ha, hm, hd] = data.split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

function criarClubeSelecao(pais: string): Clube {
  const d = DADOS_SELECOES[pais];
  const nivel = nivelPeloElo(d.elo);
  return {
    id: idSelecao(pais), nome: nomeDoPais(pais), sigla: d.sigla, cidade: d.estadio[2], estado: pais, serie: "selecao", pais,
    cores: { primaria: d.cores[0], secundaria: d.cores[1] }, estadio: { nome: d.estadio[0], capacidade: d.estadio[1] },
    fundacao: 0, rival: null, torcida: Math.round(limitar((d.elo - 700) / 15, 5, 100)), reputacao: reputacaoPeloElo(d.elo),
    forcaElenco: { min: Math.round(nivel - 12), max: Math.round(nivel + 4) }, caixa: 0, precoIngresso: 0, moral: 60,
    tatica: { formacao: nivel >= 75 ? "4-3-3" : "4-4-2", estilo: nivel >= 80 ? "ofensivo" : nivel >= 60 ? "equilibrado" : "defensivo", marcacao: "normal", jogadas: "meio" },
    escalacao: { titulares: [], reservas: [] }, extrato: [], resumoFinanceiro: {},
  };
}

/** Quantos de cada posição a seleção precisa ter à disposição (os da base de fora mais os dos clubes do jogo). */
const MINIMO_NA_SELECAO: Record<Posicao, number> = { G: 3, L: 3, Z: 4, M: 6, A: 4 };
/** Convocação: quantos de cada posição (23 no total). */
const CONVOCACAO: Record<Posicao, number> = { G: 3, L: 4, Z: 4, M: 7, A: 5 };
export const CONVOCADOS_POR_SELECAO = Object.values(CONVOCACAO).reduce((a, b) => a + b, 0);

/**
 * As 51 seleções no jogo (jogo novo e save de antes delas): os "clubes" das seleções, quem joga fora dos clubes do jogo
 * (a base de fora de cada uma), a nacionalidade e os jogos pela seleção de quem foi convocado e joga num clube do jogo, a
 * primeira convocação (a de verdade) e o ranking.
 */
export function criarSelecoes(estado: EstadoJogo) {
  if (estado.selecoes) return;
  const elencos = new Map<string, Jogador[]>();
  for (const j of Object.values(estado.jogadores)) if (j.clubeId) elencos.set(j.clubeId, [...(elencos.get(j.clubeId) ?? []), j]);
  const sel: EstadoSelecoes = { ranking: {}, convocados: {}, concentradas: [], competicoes: {}, agenda: [], base: {} };
  estado.selecoes = sel;
  for (const pais of PAISES_SELECOES) {
    const id = idSelecao(pais);
    const rng = rngPara(estado.semente, `selecao/${pais}`);
    estado.clubes[id] = criarClubeSelecao(pais);
    sel.ranking[id] = DADOS_SELECOES[pais].elo;
    const nivel = nivelPeloElo(DADOS_SELECOES[pais].elo);
    const nacionalidade = nacionalidadeDoPais(pais);
    const convocados: number[] = [];
    for (const c of CONVOCADOS_2026[pais]?.convocados ?? []) {
      const doJogo = c.clubeDoJogo ? estado.clubes[c.clubeDoJogo] : undefined;
      if (doJogo && c.noJogo) {
        const j = (elencos.get(doJogo.id) ?? []).find((x) => x.nome === c.noJogo);
        if (j) {
          j.nacionalidade = nacionalidade;
          j.selecao = { jogos: c.jogos, gols: c.gols };
          if (!convocados.includes(j.id)) convocados.push(j.id);
          continue;
        }
      }
      // Clube do jogo com elenco: deve estar lá com outro nome ("José Manuel López" é o "Flaco López"); fica de fora.
      if (doJogo && !doJogo.leve) continue;
      const idade = idadeEm(c.nascimento, estado.data);
      const j = criarJogador(rng, {
        id: estado.proximoIdJogador++, posicao: c.posicao, idade, nacionalidade, clubeId: id,
        forca: forcaDeFora(rng, nivel, c.clube, c.paisDoClube, c.jogos, idade),
      });
      j.nome = c.nome;
      j.clubeFora = { nome: c.clube || "Sem clube", pais: PAIS_DO_CLUBE[c.paisDoClube] ?? "" };
      j.selecao = { jogos: c.jogos, gols: c.gols };
      estado.jogadores[j.id] = j;
      convocados.push(j.id);
    }
    // A base de fora: quantos de cada posição a seleção tem fora dos clubes do jogo (se mantém com jovens na virada).
    const base: Partial<Record<Posicao, number>> = {};
    for (const id2 of convocados) {
      const j = estado.jogadores[id2];
      if (j.clubeId === id) base[j.posicao] = (base[j.posicao] ?? 0) + 1;
    }
    sel.base[id] = base;
    sel.convocados[id] = convocados;
  }
  completarBases(estado, "inicio");
  // Quem não tem a convocação de verdade (ou tem menos de 23) completa com os melhores; listas compridas demais (a página
  // do Uruguai traz 42) ficam com os 26 melhores.
  const porNacionalidade = agruparPorNacionalidade(estado);
  sel.primeiraConvocacao = PAISES_SELECOES.map(idSelecao);
  for (const pais of PAISES_SELECOES) {
    const id = idSelecao(pais);
    if (sel.convocados[id].length > CONVOCADOS_POR_SELECAO + 3) {
      sel.convocados[id] = sel.convocados[id].map((x) => estado.jogadores[x]).sort((a, b) => notaDeConvocacao(b) - notaDeConvocacao(a) || a.id - b.id)
        .slice(0, CONVOCADOS_POR_SELECAO + 3).map((j) => j.id);
    }
    if (sel.convocados[id].length < CONVOCADOS_POR_SELECAO) {
      const extra = convocarAutomatico(estado, id, porNacionalidade).filter((x) => !sel.convocados[id].includes(x));
      sel.convocados[id] = [...sel.convocados[id], ...extra].slice(0, Math.max(CONVOCADOS_POR_SELECAO, sel.convocados[id].length));
    }
    estado.clubes[id].escalacao = escalarAutomatico(elencoDaSelecao(estado, id), estado.clubes[id].tatica.formacao, estado.clubes[id].tatica.jogadas, true);
  }
}

/**
 * Mantém a base de fora de cada seleção: quem se aposentou dá lugar a um jovem de fora (o mesmo número por posição que
 * havia no começo) e nenhuma posição fica com menos que o mínimo à disposição (base de fora mais os dos clubes do jogo).
 */
export function completarBases(estado: EstadoJogo, chave: string) {
  const sel = estado.selecoes;
  if (!sel) return;
  const porNacionalidade = agruparPorNacionalidade(estado);
  for (const pais of PAISES_SELECOES) {
    const id = idSelecao(pais);
    const rng = rngPara(estado.semente, `base-selecao/${pais}/${chave}`);
    const nivel = nivelPeloElo(sel.ranking[id] ?? DADOS_SELECOES[pais].elo);
    const nacionalidade = nacionalidadeDoPais(pais);
    const disponiveis = porNacionalidade.get(nacionalidade) ?? [];
    const clubes = clubesDeFora(pais);
    const criar = (posicao: Posicao, jovem: boolean) => {
      const idade = jovem ? rng.int(18, 21) : rng.int(21, 31);
      const forca = jovem ? nivel - rng.int(4, 10) : nivel - rng.int(0, 8);
      const j = criarJogador(rng, {
        id: estado.proximoIdJogador++, posicao, idade, nacionalidade, clubeId: id, forca,
        potencial: jovem ? Math.round(nivel + rng.int(-2, 6)) : undefined,
      });
      j.clubeFora = clubes.length ? rng.escolher(clubes) : { nome: "Clube do exterior", pais: "" };
      j.selecao = { jogos: 0, gols: 0 };
      estado.jogadores[j.id] = j;
      disponiveis.push(j);
    };
    for (const posicao of Object.keys(MINIMO_NA_SELECAO) as Posicao[]) {
      const naBase = disponiveis.filter((j) => j.clubeId === id && j.posicao === posicao).length;
      for (let i = naBase; i < (sel.base[id]?.[posicao] ?? 0); i++) criar(posicao, true);
      // Só contam os dos clubes que chegariam perto do nível da seleção.
      const aproveitaveis = disponiveis.filter((j) => j.posicao === posicao && (j.clubeId === id || j.forca >= nivel - 15)).length;
      for (let i = aproveitaveis; i < MINIMO_NA_SELECAO[posicao]; i++) criar(posicao, false);
    }
    porNacionalidade.set(nacionalidade, disponiveis);
  }
}

/** Jogadores de cada nacionalidade que estão num clube (ou na base de fora de uma seleção). */
export function agruparPorNacionalidade(estado: EstadoJogo): Map<string, Jogador[]> {
  const mapa = new Map<string, Jogador[]>();
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId) continue;
    const lista = mapa.get(j.nacionalidade);
    if (lista) lista.push(j);
    else mapa.set(j.nacionalidade, [j]);
  }
  return mapa;
}

/** Quem pode ser convocado pela seleção: da nacionalidade dela, num clube ou na base de fora, com 17 anos ou mais. */
export function candidatosDaSelecao(estado: EstadoJogo, selId: string, porNacionalidade?: Map<string, Jogador[]>): Jogador[] {
  const nacionalidade = nacionalidadeDoPais(paisDaSelecao(selId));
  const lista = porNacionalidade?.get(nacionalidade) ?? Object.values(estado.jogadores).filter((j) => j.clubeId && j.nacionalidade === nacionalidade);
  return lista.filter((j) => j.idade >= 17 && estado.jogadores[j.id] === j);
}

/** Nota para a convocação: a força, com um pouco a mais para quem já tem muitos jogos pela seleção. */
export const notaDeConvocacao = (j: Jogador) => j.forca + Math.min(3, (j.selecao?.jogos ?? 0) / 20);

/** Convocação do computador: os melhores de cada posição (3 goleiros, 4 laterais, 4 zagueiros, 7 meias e 5 atacantes). */
export function convocarAutomatico(estado: EstadoJogo, selId: string, porNacionalidade?: Map<string, Jogador[]>): number[] {
  const aptos = candidatosDaSelecao(estado, selId, porNacionalidade).filter((j) => j.lesaoDias <= 3)
    .sort((a, b) => notaDeConvocacao(b) - notaDeConvocacao(a) || a.id - b.id);
  const escolhidos: Jogador[] = [];
  for (const posicao of Object.keys(CONVOCACAO) as Posicao[]) escolhidos.push(...aptos.filter((j) => j.posicao === posicao).slice(0, CONVOCACAO[posicao]));
  for (const j of aptos) {
    if (escolhidos.length >= CONVOCADOS_POR_SELECAO) break;
    if (!escolhidos.includes(j)) escolhidos.push(j);
  }
  return escolhidos.map((j) => j.id);
}

/** Os convocados da seleção (os que ainda estão no jogo). */
export function elencoDaSelecao(estado: EstadoJogo, selId: string): Jogador[] {
  return (estado.selecoes?.convocados[selId] ?? []).map((id) => estado.jogadores[id]).filter((j): j is Jogador => !!j);
}

// ---- competições ----------------------------------------------------------------------------------------------

export const ehCompeticaoDeSelecoes = (c: Competicao | string): c is IdCompeticaoSelecoes => c.startsWith("S-");
export const AMISTOSOS: IdCompeticaoSelecoes = "S-AMI";

/** Anos de Copa do Mundo (junho e julho sem data FIFA): 2026, 2030, 2034... */
export const anoDeCopa = (ano: number) => ano % 4 === 2;

type Janela = "mar" | "jun" | "set" | "out" | "nov";
const JANELAS: Record<Janela, [number, Dia][]> = {
  mar: [[-2, "qui"], [-1, "ter"]],
  jun: [[8, "qui"], [9, "ter"]],
  set: [[21, "qui"], [22, "ter"]],
  out: [[26, "qui"], [27, "ter"]],
  nov: [[31, "qui"], [32, "ter"]],
};
const ORDEM_JANELAS: Janela[] = ["mar", "jun", "set", "out", "nov"];
const NOME_JANELA: Record<Janela, string> = { mar: "março", jun: "junho", set: "setembro", out: "outubro", nov: "novembro" };

/** As duas datas (quinta e terça) da data FIFA `janela` do ano. */
export function datasDaJanela(ano: number, janela: Janela): [string, string] {
  const [a, b] = JANELAS[janela];
  return [diaDaSemana(ano, a[0], a[1]), diaDaSemana(ano, b[0], b[1])];
}

/** As datas FIFA do ano (junho fica de fora nos anos de Copa do Mundo). */
function janelasDoAno(ano: number): { janela: Janela; datas: [string, string] }[] {
  return ORDEM_JANELAS.filter((j) => !(j === "jun" && anoDeCopa(ano))).map((janela) => ({ janela, datas: datasDaJanela(ano, janela) }));
}

/** Datas da Copa América e da Copa Ouro (junho e julho): 3 rodadas de grupos, quartas, semifinal e final. */
const DATAS_TORNEIO: Record<string, [number, Dia]> = {
  r1: [10, "sab"], r2: [10, "qua"], r3: [11, "dom"], quartas: [11, "qui"], semi: [12, "ter"], final: [13, "sab"],
};

const NOMES: Record<TipoCompeticaoSelecoes, string> = {
  "eliminatorias-sul": "Eliminatórias", "eliminatorias-concacaf": "Eliminatórias da Concacaf", "copa-america": "Copa América",
  "copa-ouro": "Copa Ouro",
};

export const NOME_FASE_SELECOES: Record<string, string> = {
  liga: "Turno e returno", fase1: "1ª fase", fase2: "2ª fase", fase3: "3ª fase", grupos: "Fase de grupos", quartas: "Quartas de final",
  semi: "Semifinal", final: "Final", amistoso: "Amistoso",
};

/** "Eliminatórias", "Copa América", "Copa Ouro", "Amistoso". */
export function nomeDaCompeticaoDeSelecoes(estado: EstadoJogo | undefined, c: IdCompeticaoSelecoes): string {
  if (c === AMISTOSOS) return "Amistoso";
  const comp = estado?.selecoes?.competicoes[c];
  if (comp) return comp.nome;
  if (c.startsWith("S-ELI-SUL")) return NOMES["eliminatorias-sul"];
  if (c.startsWith("S-ELI-CCF")) return NOMES["eliminatorias-concacaf"];
  if (c.startsWith("S-AME")) return NOMES["copa-america"];
  if (c.startsWith("S-OURO")) return NOMES["copa-ouro"];
  return "Seleções";
}

/** Rótulo de uma partida de seleções: "Eliminatórias · 3ª rodada", "Copa América · Grupo B · 1ª rodada". */
export function rotuloDeSelecoes(estado: EstadoJogo | undefined, p: Partida): string {
  const nome = nomeDaCompeticaoDeSelecoes(estado, p.serie as IdCompeticaoSelecoes);
  if (p.serie === AMISTOSOS) return "Amistoso";
  if (p.fase === "liga") return `${nome} · ${p.rodada}ª rodada`;
  const fase = NOME_FASE_SELECOES[p.fase] ?? p.fase;
  if (p.grupo != null) return `${nome} · ${p.fase === "grupos" ? "" : `${fase} · `}Grupo ${String.fromCharCode(64 + p.grupo)} · ${p.rodada}ª rodada`;
  return `${nome} · ${fase}${p.perna ? ` (${p.perna === 1 ? "ida" : "volta"})` : ""}`;
}

/** Empate vai para os pênaltis: no mata-mata dos torneios (jogo único) e na volta da 1ª fase da Concacaf (agregado). */
export function selecoesDecidePorPenaltis(p: Partida): boolean {
  if (p.fase === "quartas" || p.fase === "semi" || p.fase === "final") return true;
  return p.fase === "fase1" && p.perna === 2;
}

const elo = (estado: EstadoJogo, id: string) => estado.selecoes?.ranking[id] ?? DADOS_SELECOES[paisDaSelecao(id)]?.elo ?? 1000;
const peloRanking = (estado: EstadoJogo, ids: string[]) =>
  [...ids].sort((a, b) => elo(estado, b) - elo(estado, a) || a.localeCompare(b));
const conmebol = () => PAISES_SELECOES.filter((p) => confederacao(p) === "conmebol").map(idSelecao);
const concacaf = (soFifa = false) =>
  PAISES_SELECOES.filter((p) => confederacao(p) === "concacaf" && (!soFifa || !DADOS_SELECOES[p].semFifa)).map(idSelecao);

/** Um jogo de seleções (na agenda, se for de outro ano). */
function jogo(id: string, serie: IdCompeticaoSelecoes, fase: string, rodada: number, data: string, mandante: string, visitante: string, extra: Partial<Partida> = {}): Partida {
  return { id, serie, fase, rodada, data, mandante, visitante, jogada: false, gm: 0, gv: 0, eventos: [], ...extra };
}

/** Põe os jogos no calendário: os do ano em andamento em `partidas`, os dos anos seguintes na agenda. */
function marcar(estado: EstadoJogo, jogos: Partida[]) {
  const fimDoAno = `${estado.temporada}-12-31`;
  for (const p of jogos) (p.data <= fimDoAno ? estado.partidas : estado.selecoes!.agenda).push(p);
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
}

/** Rodadas de todos contra todos nas datas dadas (uma data por rodada). */
function jogosDasRodadas(serie: IdCompeticaoSelecoes, fase: string, rodadas: Confronto[][], datas: string[], grupo?: number, neutro?: (m: string, v: string) => Partial<Partida>): Partida[] {
  const lista: Partida[] = [];
  rodadas.forEach((jogos, r) => jogos.forEach(([m, v], k) => {
    lista.push(jogo(`${serie}-${fase}${grupo != null ? `-g${grupo}` : ""}-r${r + 1}-${k + 1}`, serie, fase, r + 1, datas[r], m, v, {
      ...(grupo != null ? { grupo } : {}), ...(neutro?.(m, v) ?? {}),
    }));
  }));
  return lista;
}

/** A próxima Copa do Mundo depois do ano (2026 → 2030). */
export const proximaCopa = (ano: number) => ano + 1 + ((2 - ((ano + 1) % 4) + 4) % 4);

/**
 * Eliminatórias da Conmebol para a Copa de `copa`: os 10 em turno e returno, 2 rodadas por data FIFA, de setembro de copa-3
 * a setembro de copa-1 (9 datas). No save de antes das seleções (`desde`: a data de hoje), as datas que já passaram dão
 * lugar às seguintes (até março do ano da Copa); sem 9 datas pela frente, essas Eliminatórias ficam de fora.
 */
function criarEliminatoriasSul(estado: EstadoJogo, copa: number, desde = ""): boolean {
  const id: IdCompeticaoSelecoes = `S-ELI-SUL-${copa}`;
  const selecoes = conmebol();
  const janelas: [number, Janela][] = [
    [copa - 3, "set"], [copa - 3, "out"], [copa - 3, "nov"], [copa - 2, "set"], [copa - 2, "out"], [copa - 2, "nov"],
    [copa - 1, "mar"], [copa - 1, "jun"], [copa - 1, "set"], [copa - 1, "out"], [copa - 1, "nov"], [copa, "mar"],
  ];
  const livres = janelas.map(([ano, j]) => datasDaJanela(ano, j)).filter(([primeira]) => primeira > desde).slice(0, 9);
  if (livres.length < 9) return false;
  const datas = livres.flat();
  const rodadas = turnoEReturno(selecoes, rngPara(estado.semente, `eliminatorias/${id}`));
  estado.selecoes!.competicoes[id] = {
    id, tipo: "eliminatorias-sul", nome: NOMES["eliminatorias-sul"], ano: copa, fase: "liga", selecoes,
  };
  marcar(estado, jogosDasRodadas(id, "liga", rodadas, datas));
  return true;
}

/**
 * Eliminatórias da Concacaf para a Copa de `copa` (só os membros da FIFA): 1ª fase em março de copa-2 (os 4 piores do
 * ranking, ida e volta); os 3 melhores do ranking vão direto à 3ª fase.
 */
function criarEliminatoriasConcacaf(estado: EstadoJogo, copa: number) {
  const id: IdCompeticaoSelecoes = `S-ELI-CCF-${copa}`;
  const ranking = peloRanking(estado, concacaf(true));
  const piores = ranking.slice(-4);
  estado.selecoes!.competicoes[id] = {
    id, tipo: "eliminatorias-concacaf", nome: NOMES["eliminatorias-concacaf"], ano: copa, fase: "fase1", selecoes: ranking,
    entram: { fase1: piores, fase2: ranking.slice(3, -4), fase3: ranking.slice(0, 3) },
  };
  const [ida, volta] = datasDaJanela(copa - 2, "mar");
  // O melhor contra o pior e o 2º contra o 3º dos quatro; a volta na casa do melhor.
  const pares: [string, string][] = [[piores[0], piores[3]], [piores[1], piores[2]]];
  marcar(estado, pares.flatMap(([melhor, pior], i) => [
    jogo(`${id}-fase1-${i + 1}-ida`, id, "fase1", 1, ida, pior, melhor, { chave: i + 1, perna: 1 }),
    jogo(`${id}-fase1-${i + 1}-volta`, id, "fase1", 2, volta, melhor, pior, { chave: i + 1, perna: 2 }),
  ]));
}

/** Copa América (anos múltiplos de 4: as 10 da Conmebol e as 6 melhores da Concacaf) ou Copa Ouro (anos ímpares: as 16 melhores da Concacaf). */
function criarTorneio(estado: EstadoJogo, tipo: "copa-america" | "copa-ouro", ano: number) {
  const id: IdCompeticaoSelecoes = tipo === "copa-america" ? `S-AME-${ano}` : `S-OURO-${ano}`;
  const rng = rngPara(estado.semente, `torneio/${id}`);
  let sede: string;
  let selecoes: string[];
  if (tipo === "copa-america") {
    // A sede roda entre os da Conmebol (sem repetir a anterior).
    const anterior = Object.values(estado.selecoes!.competicoes).find((c) => c?.tipo === "copa-america" && c.ano < ano)?.sede;
    sede = rng.escolher(conmebol().filter((x) => x !== anterior));
    selecoes = [...conmebol(), ...peloRanking(estado, concacaf()).slice(0, 6)];
  } else {
    sede = idSelecao("US");
    const melhores = peloRanking(estado, concacaf()).filter((x) => x !== sede).slice(0, 15);
    selecoes = [sede, ...melhores];
  }
  // Potes pelo ranking, com a sede no grupo A.
  const ranking = [sede, ...peloRanking(estado, selecoes.filter((x) => x !== sede))];
  const grupos = sortearGrupos(rng, ranking, 4, (x) => x);
  const g = grupos.findIndex((x) => x.includes(sede));
  [grupos[0], grupos[g]] = [grupos[g], grupos[0]];
  estado.selecoes!.competicoes[id] = { id, tipo, nome: NOMES[tipo], ano, fase: "grupos", selecoes: ranking, grupos: { grupos }, sede };
  const datas = [DATAS_TORNEIO.r1, DATAS_TORNEIO.r2, DATAS_TORNEIO.r3].map(([s, d]) => diaDaSemana(ano, s, d));
  marcar(estado, grupos.flatMap((grupo, i) =>
    jogosDasRodadas(id, "grupos", turnoUnico(grupo, rng), datas, i + 1, (m, v) => mandoNoTorneio(sede, m, v))));
}

/** No torneio, só a sede joga em casa; os outros jogos são em campo neutro. */
function mandoNoTorneio(sede: string | undefined, m: string, v: string): Partial<Partida> {
  if (v === sede) return { mandante: sede, visitante: m };
  return m === sede ? {} : { neutro: true };
}

/**
 * Competições que começam no ano (na virada, no jogo novo e no save de antes das seleções): as Eliminatórias da Conmebol
 * (setembro, 3 anos antes da Copa), as da Concacaf (março, 2 anos antes), a Copa América (anos múltiplos de 4) e a Copa
 * Ouro (anos ímpares). Só as que ainda não começaram (`desde`: a data de hoje no save antigo).
 */
export function criarCompeticoesDoAno(estado: EstadoJogo, desde = "") {
  const ano = estado.temporada;
  const sel = estado.selecoes!;
  const nova = (id: string, primeiraData: string) => !sel.competicoes[id as IdCompeticaoSelecoes] && primeiraData > desde;
  // As Eliminatórias da Conmebol começam em setembro, 3 anos antes da Copa; no save antigo, as da próxima Copa, se ainda
  // houver 9 datas FIFA até ela.
  const copa = proximaCopa(ano);
  if (!sel.competicoes[`S-ELI-SUL-${copa}`]) {
    if (!desde && anoDeCopa(ano + 3)) criarEliminatoriasSul(estado, ano + 3);
    else if (desde) criarEliminatoriasSul(estado, copa, desde);
  }
  if (anoDeCopa(ano + 2) && nova(`S-ELI-CCF-${ano + 2}`, datasDaJanela(ano, "mar")[0])) criarEliminatoriasConcacaf(estado, ano + 2);
  const r1 = diaDaSemana(ano, DATAS_TORNEIO.r1[0], DATAS_TORNEIO.r1[1]);
  if (ano % 4 === 0 && nova(`S-AME-${ano}`, r1)) criarTorneio(estado, "copa-america", ano);
  if (ano % 2 === 1 && nova(`S-OURO-${ano}`, r1)) criarTorneio(estado, "copa-ouro", ano);
}

/**
 * Amistosos da próxima data FIFA: só quando todos os jogos de seleções antes dela já foram jogados (assim as fases que
 * dependem de resultados já estão marcadas). As seleções sem jogo oficial nas datas jogam entre si, contra uma de força
 * parecida (um adversário diferente em cada data).
 */
export function marcarAmistosos(estado: EstadoJogo) {
  const sel = estado.selecoes;
  if (!sel) return;
  const proxima = janelasDoAno(estado.temporada).find(({ datas }) => datas[0] > estado.data && datas[0] > (sel.amistososAte ?? ""));
  if (!proxima) return;
  const antes = estado.partidas.some((p) => ehCompeticaoDeSelecoes(p.serie) && !p.jogada && p.data < proxima.datas[0]);
  if (antes) return;
  sel.amistososAte = proxima.datas[1];
  const rng = rngPara(estado.semente, `amistosos/${proxima.datas[0]}`);
  const todas = PAISES_SELECOES.map(idSelecao);
  const jogos: Partida[] = [];
  proxima.datas.forEach((data, k) => {
    // Ocupadas: jogo oficial no dia ou a 2 dias dele (a Copa América começa logo depois da data de junho).
    const ocupadas = new Set(estado.partidas.filter((p) => ehCompeticaoDeSelecoes(p.serie) && Math.abs(diasEntre(p.data, data)) <= 2)
      .flatMap((p) => [p.mandante, p.visitante]));
    const livres = peloRanking(estado, todas.filter((x) => !ocupadas.has(x)));
    // Em blocos de 4 pela força; na segunda data os blocos andam 2 casas (outro adversário).
    const ordem = k === 1 ? [...livres.slice(2), ...livres.slice(0, 2)] : livres;
    const pares: [string, string][] = [];
    for (let i = 0; i < ordem.length; i += 4) {
      const bloco = rng.embaralhar(ordem.slice(i, i + 4));
      for (let a = 0; a + 1 < bloco.length; a += 2) pares.push(rng.chance(0.5) ? [bloco[a], bloco[a + 1]] : [bloco[a + 1], bloco[a]]);
    }
    pares.forEach(([m, v], i) => jogos.push(jogo(`${AMISTOSOS}-${data}-${i + 1}`, AMISTOSOS, "amistoso", k + 1, data, m, v)));
  });
  marcar(estado, jogos);
}

/** Jogos de uma fase (em `partidas` e na agenda). */
function jogosDaFase(estado: EstadoJogo, id: IdCompeticaoSelecoes, fase: string): Partida[] {
  return [...estado.partidas, ...(estado.selecoes?.agenda ?? [])].filter((p) => p.serie === id && p.fase === fase);
}

/** Tabelas de uma fase (uma por grupo; a liga das Eliminatórias tem uma só). */
export function tabelasDeSelecoes(estado: EstadoJogo, id: IdCompeticaoSelecoes, fase: string): LinhaTabela[][] {
  const comp = estado.selecoes?.competicoes[id];
  if (!comp) return [];
  if (fase === "liga") return [classificacao(estado, id, "liga", comp.selecoes)];
  const grupos = comp.grupos?.[fase];
  return grupos ? grupos.map((g, i) => classificacao(estado, id, fase, g, i + 1)) : [];
}

/** Vencedor de um jogo único do mata-mata (pênaltis no empate). */
function vencedorDoJogo(p: Partida): string {
  if (p.gm !== p.gv) return p.gm > p.gv ? p.mandante : p.visitante;
  return p.penaltis && p.penaltis[1] > p.penaltis[0] ? p.visitante : p.mandante;
}

/** Melhores de uma lista de linhas de tabela (pontos, saldo, gols pró, ranking). */
function melhoresLinhas(estado: EstadoJogo, linhas: LinhaTabela[], quantos: number): string[] {
  return [...linhas].sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || elo(estado, b.clubeId) - elo(estado, a.clubeId))
    .slice(0, quantos).map((l) => l.clubeId);
}

/** Depois dos jogos do dia: fases que acabaram, campeões e classificados, e os amistosos da próxima data FIFA. */
export function avancarSelecoes(estado: EstadoJogo): string[] {
  const sel = estado.selecoes;
  if (!sel) return [];
  const noticias: string[] = [];
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  for (const comp of Object.values(sel.competicoes)) {
    if (!comp || comp.fase === "encerrada") continue;
    const jogos = jogosDaFase(estado, comp.id, comp.fase);
    if (!jogos.length || jogos.some((p) => !p.jogada)) continue;
    const rng = rngPara(estado.semente, `${comp.id}/${comp.fase}`);
    if (comp.tipo === "eliminatorias-sul") {
      const tabela = tabelasDeSelecoes(estado, comp.id, "liga")[0];
      comp.classificados = tabela.slice(0, 6).map((l) => l.clubeId);
      comp.repescagem = [tabela[6].clubeId];
      comp.fase = "encerrada";
      noticias.push(`Eliminatórias: ${comp.classificados.map(nome).join(", ")} vão à Copa do Mundo de ${comp.ano}; ${nome(comp.repescagem[0])} vai à repescagem.`);
      depoisDaCompeticao(estado, comp);
    } else if (comp.tipo === "eliminatorias-concacaf") {
      noticias.push(...avancarConcacaf(estado, comp, rng));
    } else {
      noticias.push(...avancarTorneio(estado, comp));
    }
  }
  marcarAmistosos(estado);
  return noticias;
}

function avancarConcacaf(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes, rng: Rng): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const copa = comp.ano;
  const entram = comp.entram ?? {};
  if (comp.fase === "fase1") {
    const vencedores = chavesDaFase(estado, comp.id, "fase1").map((c) => vencedorDaChave(c)).filter((x): x is string => !!x);
    const fase2 = peloRanking(estado, [...(entram.fase2 ?? []), ...vencedores]);
    const grupos = sortearGrupos(rng, fase2, 6, (x) => x);
    comp.grupos = { ...comp.grupos, fase2: grupos };
    comp.fase = "fase2";
    const datas = [...datasDaJanela(copa - 2, "jun"), ...datasDaJanela(copa - 2, "set"), datasDaJanela(copa - 2, "out")[0]];
    marcar(estado, grupos.flatMap((g, i) => jogosDasRodadas(comp.id, "fase2", turnoUnico(g, rng), datas, i + 1)));
    return [`Eliminatórias da Concacaf: ${vencedores.map(nome).join(" e ")} passam à 2ª fase.`];
  }
  if (comp.fase === "fase2") {
    const tabelas = tabelasDeSelecoes(estado, comp.id, "fase2");
    const primeiros = tabelas.map((t) => t[0].clubeId);
    const segundos = melhoresLinhas(estado, tabelas.map((t) => t[1]), 3);
    const fase3 = peloRanking(estado, [...(entram.fase3 ?? []), ...primeiros, ...segundos]);
    const grupos = sortearGrupos(rng, fase3, 3, (x) => x);
    comp.grupos = { ...comp.grupos, fase3: grupos };
    comp.fase = "fase3";
    const datas = [...datasDaJanela(copa - 1, "set"), ...datasDaJanela(copa - 1, "out"), ...datasDaJanela(copa - 1, "nov")];
    marcar(estado, grupos.flatMap((g, i) => jogosDasRodadas(comp.id, "fase3", turnoEReturno(g, rng), datas, i + 1)));
    return [`Eliminatórias da Concacaf: ${[...primeiros, ...segundos].map(nome).join(", ")} passam à 3ª fase.`];
  }
  const tabelas = tabelasDeSelecoes(estado, comp.id, "fase3");
  comp.classificados = tabelas.map((t) => t[0].clubeId);
  comp.repescagem = melhoresLinhas(estado, tabelas.map((t) => t[1]), 2);
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  return [`Eliminatórias da Concacaf: ${comp.classificados.map(nome).join(", ")} vão à Copa do Mundo de ${copa}; ${comp.repescagem.map(nome).join(" e ")} vão à repescagem.`];
}

function avancarTorneio(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const datas = (fase: string) => diaDaSemana(comp.ano, DATAS_TORNEIO[fase][0], DATAS_TORNEIO[fase][1]);
  const mata = (fase: string, pares: [string, string][]) => {
    comp.fase = fase;
    marcar(estado, pares.map(([a, b], i) => jogo(`${comp.id}-${fase}-${i + 1}`, comp.id, fase, 1, datas(fase), a, b, { chave: i + 1, ...mandoNoTorneio(comp.sede, a, b) })));
  };
  const vencedores = (fase: string) => jogosDaFase(estado, comp.id, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map(vencedorDoJogo);
  if (comp.fase === "grupos") {
    const t = tabelasDeSelecoes(estado, comp.id, "grupos");
    // 1º A x 2º B, 1º B x 2º A, 1º C x 2º D, 1º D x 2º C.
    mata("quartas", [[t[0][0].clubeId, t[1][1].clubeId], [t[2][0].clubeId, t[3][1].clubeId], [t[1][0].clubeId, t[0][1].clubeId], [t[3][0].clubeId, t[2][1].clubeId]]);
    return [`${comp.nome}: nas quartas, ${t.flatMap((g) => [g[0].clubeId, g[1].clubeId]).map(nome).join(", ")}.`];
  }
  if (comp.fase === "quartas") {
    const v = vencedores("quartas");
    mata("semi", [[v[0], v[1]], [v[2], v[3]]]);
    return [`${comp.nome}: semifinais ${nome(v[0])} x ${nome(v[1])} e ${nome(v[2])} x ${nome(v[3])}.`];
  }
  if (comp.fase === "semi") {
    const v = vencedores("semi");
    mata("final", [[v[0], v[1]]]);
    return [`${comp.nome}: a final é ${nome(v[0])} x ${nome(v[1])}.`];
  }
  const [final] = jogosDaFase(estado, comp.id, "final");
  comp.campeao = vencedorDoJogo(final);
  comp.vice = comp.campeao === final.mandante ? final.visitante : final.mandante;
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  return [`${nome(comp.campeao)} é campeão da ${comp.nome} ${comp.ano}!`];
}

/** Competições de seleções acabaram (os jogos do ano são todos antes do fim da temporada dos clubes). */
export function selecoesEncerradas(estado: EstadoJogo): boolean {
  return !estado.partidas.some((p) => ehCompeticaoDeSelecoes(p.serie) && !p.jogada);
}

/** Competições em que a seleção está (as em andamento e as que acabaram no ano), mais os amistosos. */
export function competicoesDaSelecao(estado: EstadoJogo, selId: string): IdCompeticaoSelecoes[] {
  const lista = Object.values(estado.selecoes?.competicoes ?? {}).filter((c) => c?.selecoes.includes(selId)).map((c) => c!.id);
  return [...lista, AMISTOSOS];
}

// ---- concentração e convocação ----------------------------------------------------------------------------

/**
 * Atualiza quem está com a seleção (a cada dia): a seleção se concentra 3 dias antes de cada jogo e fica junta entre dois
 * jogos com até 6 dias entre eles. Quando a concentração começa, o computador convoca (a seleção do técnico usa a
 * convocação dele, se ele fez). Os convocados ficam marcados (`Jogador.convocado`) e os clubes jogam sem eles.
 */
export function atualizarConcentracoes(estado: EstadoJogo) {
  const sel = estado.selecoes;
  if (!sel) return;
  const hoje = estado.data;
  const proximo = new Map<string, string>();
  const anterior = new Map<string, string>();
  for (const p of estado.partidas) {
    if (!ehCompeticaoDeSelecoes(p.serie)) continue;
    for (const id of [p.mandante, p.visitante]) {
      if (!p.jogada && p.data >= hoje) { if (!proximo.has(id) || p.data < proximo.get(id)!) proximo.set(id, p.data); }
      else if (p.data <= hoje && (!anterior.has(id) || p.data > anterior.get(id)!)) anterior.set(id, p.data);
    }
  }
  const agora = new Set<string>();
  for (const [id, data] of proximo) {
    const antes = anterior.get(id);
    if (diasEntre(hoje, data) <= 3 || (antes && diasEntre(antes, data) <= 6)) agora.add(id);
  }
  const eram = new Set(sel.concentradas);
  // Saem da concentração: os convocados voltam aos clubes.
  for (const id of eram) {
    if (agora.has(id)) continue;
    for (const j of elencoDaSelecao(estado, id)) if (j.convocado === id) delete j.convocado;
  }
  const meuClube = estado.tecnico.clubeId;
  const minhaSelecao = estado.tecnico.selecao;
  const chamadosDoMeuClube: string[] = [];
  let porNacionalidade: Map<string, Jogador[]> | undefined;
  for (const id of agora) {
    if (eram.has(id)) continue;
    if (id === minhaSelecao && sel.convocacaoFeita) sel.convocacaoFeita = false;
    // A primeira concentração usa a convocação de verdade.
    else if (sel.primeiraConvocacao?.includes(id)) sel.primeiraConvocacao = sel.primeiraConvocacao.filter((x) => x !== id);
    else {
      porNacionalidade ??= agruparPorNacionalidade(estado);
      sel.convocados[id] = convocarAutomatico(estado, id, porNacionalidade);
      if (id === minhaSelecao) {
        enviarMensagem(estado, {
          tipo: "noticia", titulo: "Convocação da seleção",
          texto: `Seu auxiliar convocou ${comArtigoDaSelecao("o", id, estado)}: os ${sel.convocados[id].length} melhores à disposição.`,
        });
      }
    }
    for (const j of elencoDaSelecao(estado, id)) {
      j.convocado = id;
      if (j.clubeId === meuClube) chamadosDoMeuClube.push(`${j.nome} (${estado.clubes[id].nome})`);
    }
    // A seleção do computador escala os melhores entre os convocados.
    if (id !== minhaSelecao || estado.config.escalacaoAutomatica) {
      const c = estado.clubes[id];
      c.escalacao = escalarAutomatico(elencoDaSelecao(estado, id), c.tatica.formacao, c.tatica.jogadas, true);
    }
  }
  sel.concentradas = [...agora];
  if (chamadosDoMeuClube.length) {
    enviarMensagem(estado, {
      tipo: "noticia", titulo: "Convocados para as seleções",
      texto: `Estão com as seleções e não jogam pelo clube até voltarem: ${chamadosDoMeuClube.join(", ")}.`,
    });
  }
  avisarConvocacao(estado, proximo);
}

/** Recado para o técnico de seleção escolher os convocados (uma vez antes de cada concentração). */
function avisarConvocacao(estado: EstadoJogo, proximo: Map<string, string>) {
  const sel = estado.selecoes!;
  const minha = estado.tecnico.selecao;
  if (!minha || sel.concentradas.includes(minha)) return;
  const data = proximo.get(minha);
  if (!data || diasEntre(estado.data, data) > 10 || sel.avisoConvocacao === data || sel.convocacaoFeita) return;
  sel.avisoConvocacao = data;
  enviarMensagem(estado, {
    tipo: "diretoria", titulo: "Convocação da seleção",
    texto: `${comArtigoDaSelecao("O", minha, estado)} joga em ${data.split("-").reverse().slice(0, 2).join("/")}. Escolha os convocados no Painel (Seleção → Convocar) até 3 dias antes; senão o auxiliar convoca os melhores.`,
  });
}

/** O técnico confirma os convocados da próxima concentração da seleção dele. */
export function confirmarConvocacao(estado: EstadoJogo, ids: number[]) {
  const sel = estado.selecoes;
  const minha = estado.tecnico.selecao;
  if (!sel || !minha) return;
  sel.convocados[minha] = [...new Set(ids)].filter((id) => !!estado.jogadores[id]);
  if (sel.primeiraConvocacao) sel.primeiraConvocacao = sel.primeiraConvocacao.filter((x) => x !== minha);
  // Já concentrada: a lista nova vale na hora; senão, vale quando a concentração começar.
  if (sel.concentradas.includes(minha)) {
    for (const j of Object.values(estado.jogadores)) if (j.convocado === minha && !sel.convocados[minha].includes(j.id)) delete j.convocado;
    for (const j of elencoDaSelecao(estado, minha)) j.convocado = minha;
  } else sel.convocacaoFeita = true;
  const c = estado.clubes[minha];
  const ficou = new Set(sel.convocados[minha]);
  c.escalacao.titulares = c.escalacao.titulares.map((id) => (id != null && ficou.has(id) ? id : null));
  c.escalacao.reservas = c.escalacao.reservas.filter((id) => ficou.has(id));
  if (c.escalacao.titulares.every((id) => id == null)) c.escalacao = escalarAutomatico(elencoDaSelecao(estado, minha), c.tatica.formacao, c.tatica.jogadas, true);
}

// ---- resultado dos jogos -----------------------------------------------------------------------------------

/** Peso do jogo no ranking: amistoso 20, eliminatórias 40, torneio 50, final 60. */
function pesoNoRanking(p: Partida): number {
  if (p.serie === AMISTOSOS) return 20;
  if (p.serie.startsWith("S-ELI")) return 40;
  return p.fase === "final" ? 60 : 50;
}

/** Ranking depois do jogo (Elo): ganha mais quem vence um mais forte, e por mais gols. Pênaltis contam como empate. */
export function atualizarRanking(estado: EstadoJogo, p: Partida) {
  const r = estado.selecoes?.ranking;
  if (!r) return;
  const [a, b] = [elo(estado, p.mandante), elo(estado, p.visitante)];
  const esperado = 1 / (10 ** (-(a - b + (p.neutro ? 0 : 100)) / 400) + 1);
  const resultado = p.gm > p.gv ? 1 : p.gm < p.gv ? 0 : 0.5;
  const dif = Math.abs(p.gm - p.gv);
  const multiplicador = dif <= 1 ? 1 : dif === 2 ? 1.5 : (11 + dif) / 8;
  const delta = Math.round(pesoNoRanking(p) * multiplicador * (resultado - esperado));
  r[p.mandante] = a + delta;
  r[p.visitante] = b - delta;
  const ma = estado.clubes[p.mandante], mb = estado.clubes[p.visitante];
  if (ma) ma.reputacao = reputacaoPeloElo(r[p.mandante]);
  if (mb) mb.reputacao = reputacaoPeloElo(r[p.visitante]);
}

/** Ranking das seleções, do maior para o menor. */
export function rankingDasSelecoes(estado: EstadoJogo): { id: string; pontos: number; pos: number }[] {
  return peloRanking(estado, PAISES_SELECOES.map(idSelecao)).map((id, i) => ({ id, pontos: Math.round(elo(estado, id)), pos: i + 1 }));
}

/** Público de um jogo de seleções: o estádio da casa quase cheio (campo neutro: um estádio grande). */
function publicoDoJogoDeSelecoes(rng: Rng, estado: EstadoJogo, p: Partida): number {
  const capacidade = p.neutro ? 60_000 : estado.clubes[p.mandante]?.estadio.capacidade ?? 20_000;
  const lotacao = p.serie === AMISTOSOS ? rng.real(0.45, 0.85) : rng.real(0.75, 1);
  return Math.round(capacidade * lotacao);
}

/** Cansaço e risco de lesão de quem jogou um jogo de seleção da simulação rápida. */
function desgaste(rng: Rng, jogadores: Jogador[]) {
  for (const j of jogadores) {
    j.energia = Math.max(30, j.energia - rng.int(15, 25));
    if (rng.chance(0.012)) j.lesaoDias = Math.max(j.lesaoDias, rng.int(DIAS_LESAO.min, 20));
  }
}

/** Registra um jogo de seleções da simulação completa (o da seleção do técnico): placar, jogos e gols pela seleção, cansaço, lesões, ranking. */
export function aplicarJogoDeSelecoes(estado: EstadoJogo, pv: PartidaViva, p: Partida, empatado: () => boolean) {
  const rng = rngPara(estado.semente, `pos-jogo/${p.id}`);
  const [lm, lv] = pv.lados;
  p.gm = lm.gols;
  p.gv = lv.gols;
  p.jogada = true;
  p.eventos = eventosParaGuardar(pv);
  if (selecoesDecidePorPenaltis(p) && empatado()) p.penaltis = disputarPenaltis(rngPara(estado.semente, `penaltis/${p.id}`), pv, estado.jogadores);
  p.publico = publicoDoJogoDeSelecoes(rng, estado, p);
  for (const lado of pv.lados) {
    for (const id of lado.jogaram) {
      const j = estado.jogadores[id];
      if (!j) continue;
      j.selecao = { jogos: (j.selecao?.jogos ?? 0) + 1, gols: j.selecao?.gols ?? 0 };
      j.energia = Math.round(lado.energia[id] ?? j.energia);
    }
    for (const id of lado.lesionados) if (estado.jogadores[id]) estado.jogadores[id].lesaoDias = rng.int(DIAS_LESAO.min, DIAS_LESAO.max);
  }
  for (const e of p.eventos) {
    const j = e.jogador != null ? estado.jogadores[e.jogador] : undefined;
    if ((e.tipo === "gol" || e.tipo === "gol-penalti") && j?.selecao) j.selecao.gols++;
  }
  p.melhor = melhorEmCampo(notasDaPartida(pv, estado.jogadores, estado.semente))?.jogadorId;
  depoisDoJogo(estado, p, rng);
  const minha = estado.tecnico.selecao;
  if (minha && (p.mandante === minha || p.visitante === minha)) {
    const lado = p.mandante === minha ? lm : lv;
    const lesoes = lado.lesionados.map((id) => estado.jogadores[id]).filter(Boolean).map((j) => `${j.nome} (${j.lesaoDias} dias)`);
    if (lesoes.length) enviarMensagem(estado, { tipo: "lesao", titulo: "Lesão na seleção", texto: `Machucaram na seleção: ${lesoes.join(", ")}.` });
  }
}

/** Depois de um jogo de seleções (completo ou rápido): moral e ranking. */
function depoisDoJogo(estado: EstadoJogo, p: Partida, _rng: Rng) {
  const ajustar = (id: string, d: number) => { const c = estado.clubes[id]; if (c) c.moral = Math.max(20, Math.min(100, c.moral + d)); };
  if (p.gm > p.gv) { ajustar(p.mandante, 6); ajustar(p.visitante, -6); }
  else if (p.gm < p.gv) { ajustar(p.mandante, -6); ajustar(p.visitante, 6); }
  atualizarRanking(estado, p);
}

/** Depois de um jogo de seleções da simulação rápida (rapida.ts): cansaço, lesões, moral e ranking. */
export function depoisDoJogoRapido(estado: EstadoJogo, p: Partida, jogaram: Jogador[]) {
  const rng = rngPara(estado.semente, `pos-jogo/${p.id}`);
  desgaste(rng, jogaram);
  p.publico = publicoDoJogoDeSelecoes(rng, estado, p);
  depoisDoJogo(estado, p, rng);
}

// ---- técnico de seleção ------------------------------------------------------------------------------------

/** "o Brasil", "a Argentina", "os Estados Unidos", "Cuba" (com a preposição certa). */
const ARTIGO_DO_PAIS: Record<string, "o" | "a" | "os" | "as" | ""> = {
  BR: "o", AR: "a", BO: "a", CL: "o", CO: "a", EC: "o", PY: "o", PE: "o", UY: "o", VE: "a", MX: "o", US: "os", CA: "o",
  CR: "a", HN: "", GT: "a", SV: "", PA: "o", NI: "a", BZ: "", JM: "a", TT: "", HT: "o", DO: "a", CU: "", PR: "", SR: "o",
  GY: "a", CW: "", AW: "", SX: "", BQ: "", MQ: "a", GP: "", GF: "a", MF: "", BB: "", BS: "as", BM: "as", KY: "as", LC: "",
  GD: "", VC: "", KN: "", AG: "", DM: "a", MS: "", AI: "", VG: "as", VI: "as", TC: "",
};
const FORMAS_DO_PAIS: Record<"o" | "O" | "do" | "ao", Record<"o" | "a" | "os" | "as" | "", string>> = {
  o: { o: "o ", a: "a ", os: "os ", as: "as ", "": "" },
  O: { o: "O ", a: "A ", os: "Os ", as: "As ", "": "" },
  do: { o: "do ", a: "da ", os: "dos ", as: "das ", "": "de " },
  ao: { o: "ao ", a: "à ", os: "aos ", as: "às ", "": "a " },
};

/** A seleção com o artigo: "o Brasil", "da Argentina", "de Cuba". */
export function comArtigoDaSelecao(forma: "o" | "O" | "do" | "ao", selId: string, estado?: EstadoJogo): string {
  const pais = paisDaSelecao(selId);
  return `${FORMAS_DO_PAIS[forma][ARTIGO_DO_PAIS[pais] ?? "o"]}${estado?.clubes[selId]?.nome ?? nomeDoPais(pais)}`;
}

/** O técnico já ganhou a liga principal de um país (a Série A ou a 1ª divisão de outro): só assim as seleções o chamam. */
export function jaGanhouLigaPrincipal(estado: EstadoJogo): boolean {
  return estado.historico.some((r) => r.campeoes.A === r.tecnico.clubeId ||
    Object.entries(r.torneios ?? {}).some(([id, t]) => /^L-[A-Z]{2}$/.test(id) && t?.campeao === r.tecnico.clubeId));
}

/**
 * Convites de seleções (na virada, para quem já ganhou a liga principal de um país e não treina uma seleção): duas das
 * quatro mais fortes que cabem na reputação do técnico (a dele + 8). Valem 30 dias.
 */
export function convitesDeSelecoes(estado: EstadoJogo, reputacao: number): string[] {
  if (!estado.selecoes || estado.tecnico.selecao || !jaGanhouLigaPrincipal(estado)) return [];
  const pendentes = new Set(estado.mensagens.flatMap((m) => (m.convite && !m.convite.resolvido ? [m.convite.clubeId] : [])));
  const cabem = rankingDasSelecoes(estado).filter((s) => !pendentes.has(s.id) && reputacaoPeloElo(s.pontos) <= reputacao + 8).slice(0, 4);
  const escolhidas = rngPara(estado.semente, `convites-selecoes/${estado.data}`).embaralhar(cabem.map((s) => s.id)).slice(0, 2);
  const validaAte = somarDias(estado.data, 30);
  for (const id of escolhidas) {
    enviarMensagem(estado, {
      tipo: "convite", titulo: `Convite ${comArtigoDaSelecao("do", id, estado)}`,
      texto: `A federação ${comArtigoDaSelecao("do", id, estado)} quer você como técnico da seleção, junto com o clube. ${rankingDasSelecoes(estado).find((s) => s.id === id)!.pos}º no ranking da América. Responda até ${validaAte.split("-").reverse().join("/")}.`,
      convite: { clubeId: id, validaAte },
    });
  }
  return escolhidas;
}

/** O técnico assume a seleção (fica também com o clube). */
export function assumirSelecao(estado: EstadoJogo, selId: string) {
  const t = estado.tecnico;
  for (const m of estado.mensagens) if (m.convite && !m.convite.resolvido && ehSelecao(m.convite.clubeId)) m.convite.resolvido = "recusado";
  t.selecao = selId;
  t.selecaoDesde = estado.data;
  const sel = estado.selecoes;
  if (sel) sel.convocacaoFeita = false;
  const proxima = Object.values(sel?.competicoes ?? {}).find((c) => c && c.fase !== "encerrada" && c.selecoes.includes(selId));
  enviarMensagem(estado, {
    tipo: "diretoria", titulo: `Técnico ${comArtigoDaSelecao("do", selId, estado)}`,
    texto: `Você assumiu ${comArtigoDaSelecao("o", selId, estado)} e continua no clube. ${proxima ? `Próxima competição: ${proxima.nome}.` : "Nas datas FIFA, a seleção faz amistosos."} Antes de cada data FIFA, escolha os convocados no Painel.`,
  });
}

/** O técnico deixa a seleção (pedido dele ou demissão). */
export function deixarSelecao(estado: EstadoJogo, motivo?: string) {
  const t = estado.tecnico;
  const id = t.selecao;
  if (!id) return;
  (t.selecoesAnteriores ??= []).push(id);
  delete t.selecao;
  delete t.selecaoDesde;
  if (estado.selecoes) delete estado.selecoes.convocacaoFeita;
  const c = estado.clubes[id];
  c.escalacao = escalarAutomatico(elencoDaSelecao(estado, id), c.tatica.formacao, c.tatica.jogadas, true);
  if (motivo) enviarMensagem(estado, { tipo: "diretoria", titulo: "Fora da seleção", texto: motivo });
}

/**
 * Fim de uma competição oficial: a reputação do técnico da seleção sobe com o título ou a vaga na Copa; a federação o
 * dispensa quando uma das favoritas fica de fora (Eliminatórias) ou cai nos grupos (torneio).
 */
function depoisDaCompeticao(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes) {
  const minha = estado.tecnico.selecao;
  if (!minha || !comp.selecoes.includes(minha)) return;
  const t = estado.tecnico;
  const subir = (d: number) => { t.reputacao = limitar((t.reputacao ?? 60) + d, REPUTACAO.minimo, REPUTACAO.maximo); };
  const favoritas = peloRanking(estado, comp.selecoes);
  if (comp.tipo === "eliminatorias-sul" || comp.tipo === "eliminatorias-concacaf") {
    if (comp.classificados?.includes(minha)) { subir(4); return; }
    const vagas = comp.tipo === "eliminatorias-sul" ? 6 : 3;
    if (!comp.repescagem?.includes(minha) && favoritas.indexOf(minha) < vagas) {
      subir(-6);
      deixarSelecao(estado, `${comArtigoDaSelecao("O", minha, estado)} ficou fora da Copa do Mundo e a federação decidiu trocar de técnico.`);
    }
    return;
  }
  if (comp.campeao === minha) { subir(6); return; }
  const passou = jogosDaFase(estado, comp.id, "quartas").some((p) => p.mandante === minha || p.visitante === minha);
  if (!passou && favoritas.indexOf(minha) < 4) {
    subir(-6);
    deixarSelecao(estado, `${comArtigoDaSelecao("O", minha, estado)} caiu na fase de grupos da ${comp.nome} e a federação decidiu trocar de técnico.`);
  }
}

// ---- virada da temporada -----------------------------------------------------------------------------------

/** As competições de seleções de uma temporada do histórico, em texto: "Copa América 2028: Brasil (vice: México)". */
export function selecoesDaTemporadaEmTexto(estado: EstadoJogo, r: RegistroTemporada): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  return (Object.entries(r.selecoes ?? {}) as [IdCompeticaoSelecoes, NonNullable<RegistroTemporada["selecoes"]>[IdCompeticaoSelecoes]][]).flatMap(([id, x]) => {
    if (!x) return [];
    const ano = id.split("-").at(-1);
    if (x.campeao) return [`${nomeDaCompeticaoDeSelecoes(undefined, id)} ${ano}: ${nome(x.campeao)}${x.vice ? ` (vice: ${nome(x.vice)})` : ""}`];
    const repescagem = x.repescagem?.length ? `; repescagem: ${x.repescagem.map(nome).join(" e ")}` : "";
    return [`${nomeDaCompeticaoDeSelecoes(undefined, id)} da Copa de ${ano}: ${(x.classificados ?? []).map(nome).join(", ")}${repescagem}`];
  });
}

/** Campeões e classificados das competições de seleções que acabaram no ano (para o histórico). */
export function resumoDasSelecoes(estado: EstadoJogo): NonNullable<RegistroTemporada["selecoes"]> {
  const r: NonNullable<RegistroTemporada["selecoes"]> = {};
  for (const c of Object.values(estado.selecoes?.competicoes ?? {})) {
    if (!c || c.fase !== "encerrada") continue;
    r[c.id] = {
      ...(c.campeao ? { campeao: c.campeao } : {}), ...(c.vice ? { vice: c.vice } : {}),
      ...(c.classificados ? { classificados: [...c.classificados] } : {}), ...(c.repescagem ? { repescagem: [...c.repescagem] } : {}),
    };
  }
  return r;
}

/**
 * Na virada (antes de montar a temporada nova): saem as competições que acabaram e os jogos delas e os amistosos; ficam os
 * jogos das que continuam (a tabela das Eliminatórias junta os anos). Devolve os jogos que continuam, para voltarem às
 * partidas depois de `criarTemporada`.
 */
export function guardarJogosQueContinuam(estado: EstadoJogo): Partida[] {
  const sel = estado.selecoes;
  if (!sel) return [];
  for (const [id, c] of Object.entries(sel.competicoes)) if (!c || c.fase === "encerrada") delete sel.competicoes[id as IdCompeticaoSelecoes];
  return estado.partidas.filter((p) => ehCompeticaoDeSelecoes(p.serie) && p.serie !== AMISTOSOS && !!sel.competicoes[p.serie]);
}

/**
 * Ano novo das seleções (depois de `criarTemporada`): os jogos que continuam voltam, os da agenda do ano entram, começam as
 * competições do ano, a base de fora se renova, os amistosos de março são marcados e a convocação dos que saíram do jogo
 * (aposentados) é limpa.
 */
export function anoNovoDasSelecoes(estado: EstadoJogo, continuam: Partida[]) {
  const sel = estado.selecoes;
  if (!sel) return;
  const fimDoAno = `${estado.temporada}-12-31`;
  const doAno = sel.agenda.filter((p) => p.data <= fimDoAno);
  sel.agenda = sel.agenda.filter((p) => p.data > fimDoAno);
  estado.partidas.push(...continuam, ...doAno);
  estado.partidas.sort((x, y) => x.data.localeCompare(y.data) || x.serie.localeCompare(y.serie));
  for (const [id, lista] of Object.entries(sel.convocados)) sel.convocados[id] = lista.filter((j) => !!estado.jogadores[j]);
  for (const j of Object.values(estado.jogadores)) delete j.convocado;
  sel.concentradas = [];
  delete sel.amistososAte;
  completarBases(estado, `${estado.temporada}`);
  criarCompeticoesDoAno(estado);
  marcarAmistosos(estado);
}

/** Save de antes das seleções: entram as seleções, as competições que ainda não começaram e os amistosos da próxima data. */
export function juntarSelecoes(estado: EstadoJogo) {
  if (estado.selecoes) return;
  criarSelecoes(estado);
  estado.selecoes!.amistososAte = estado.data;
  criarCompeticoesDoAno(estado, estado.data);
  marcarAmistosos(estado);
  atualizarConcentracoes(estado);
}

/** Jogo novo: as seleções, as competições do ano e os amistosos de março. */
export function selecoesDoJogoNovo(estado: EstadoJogo) {
  criarSelecoes(estado);
  criarCompeticoesDoAno(estado);
  marcarAmistosos(estado);
}

/** Dá um valor de 0 a 1 a partir de um texto (para sorteios que não podem mudar o resto). */
export const sorteioDeTexto = (texto: string, semente: number) => (hashTexto(texto, semente) % 10_000) / 10_000;

/** Força dos titulares da seleção (a média dos 11 melhores convocados). */
export const forcaDaSelecao = (estado: EstadoJogo, selId: string) => forcaDoTime(elencoDaSelecao(estado, selId));

export const NOME_DA_JANELA = NOME_JANELA;
