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
import { emojiDaBandeira } from "./nacionalidades";
import { SELECOES_MUNDO, type ConfederacaoMundo } from "./selecoes-mundo";
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

export type Confederacao = "conmebol" | "concacaf" | "uefa" | ConfederacaoMundo;

interface DadosSelecao {
  /** As da Europa, África, Ásia e Oceania dizem a confederação; as da América, pela região do país. */
  conf?: "uefa" | ConfederacaoMundo;
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

/**
 * As 55 seleções da UEFA (nov/2026, pedido "Vamos começar a Europa" → "Tudo, nessa ordem": seleções, 2ª divisão, outros
 * países). Os 7 países com liga no jogo usam o código da liga (EN, ES, IT, DE, FR, PT, NL); os outros, o código de duas
 * letras do país (Escócia, País de Gales e Irlanda do Norte: XS, XW e XN, que não são de nenhum país).
 */
const DADOS_EUROPA: Record<string, DadosSelecao> = {
  ES: { sigla: "ESP", cores: ["#C60B1E", "#FFC400"], estadio: ["Santiago Bernabéu", 83_186, "Madri"], elo: 2150 },
  FR: { sigla: "FRA", cores: ["#002395", "#FFFFFF"], estadio: ["Stade de France", 80_698, "Saint-Denis"], elo: 2080 },
  EN: { sigla: "ENG", cores: ["#FFFFFF", "#00247D"], estadio: ["Wembley", 90_000, "Londres"], elo: 2040 },
  PT: { sigla: "POR", cores: ["#C8102E", "#006600"], estadio: ["Estádio da Luz", 64_642, "Lisboa"], elo: 2020 },
  DE: { sigla: "GER", cores: ["#FFFFFF", "#000000"], estadio: ["Allianz Arena", 75_000, "Munique"], elo: 1990 },
  NL: { sigla: "NED", cores: ["#F36C21", "#FFFFFF"], estadio: ["Johan Cruijff Arena", 55_865, "Amsterdã"], elo: 1990 },
  IT: { sigla: "ITA", cores: ["#0066B2", "#FFFFFF"], estadio: ["Olímpico", 70_634, "Roma"], elo: 1930 },
  HR: { sigla: "CRO", cores: ["#FF0000", "#FFFFFF"], estadio: ["Maksimir", 24_851, "Zagreb"], elo: 1930 },
  NO: { sigla: "NOR", cores: ["#BA0C2F", "#00205B"], estadio: ["Ullevaal", 27_182, "Oslo"], elo: 1920 },
  BE: { sigla: "BEL", cores: ["#E30613", "#000000"], estadio: ["Rei Balduíno", 50_093, "Bruxelas"], elo: 1900 },
  CH: { sigla: "SUI", cores: ["#D52B1E", "#FFFFFF"], estadio: ["Wankdorf", 31_783, "Berna"], elo: 1900 },
  DK: { sigla: "DEN", cores: ["#C60C30", "#FFFFFF"], estadio: ["Parken", 38_065, "Copenhague"], elo: 1890 },
  TR: { sigla: "TUR", cores: ["#E30A17", "#FFFFFF"], estadio: ["Olímpico Atatürk", 74_753, "Istambul"], elo: 1880 },
  AT: { sigla: "AUT", cores: ["#ED2939", "#FFFFFF"], estadio: ["Ernst Happel", 50_865, "Viena"], elo: 1850 },
  UA: { sigla: "UKR", cores: ["#FFD500", "#005BBB"], estadio: ["Olímpico de Kiev", 70_050, "Kiev"], elo: 1800 },
  RU: { sigla: "RUS", cores: ["#D52B1E", "#FFFFFF"], estadio: ["Lujniki", 78_011, "Moscou"], elo: 1780 },
  XS: { sigla: "SCO", cores: ["#0A1F44", "#FFFFFF"], estadio: ["Hampden Park", 51_866, "Glasgow"], elo: 1790 },
  RS: { sigla: "SRB", cores: ["#C6363C", "#0C4076"], estadio: ["Rajko Mitić", 51_755, "Belgrado"], elo: 1790 },
  GR: { sigla: "GRE", cores: ["#0D5EAF", "#FFFFFF"], estadio: ["Olímpico de Atenas", 69_618, "Atenas"], elo: 1790 },
  HU: { sigla: "HUN", cores: ["#CE2939", "#FFFFFF"], estadio: ["Puskás Aréna", 67_215, "Budapeste"], elo: 1760 },
  PL: { sigla: "POL", cores: ["#FFFFFF", "#DC143C"], estadio: ["Nacional de Varsóvia", 58_580, "Varsóvia"], elo: 1760 },
  CZ: { sigla: "CZE", cores: ["#D7141A", "#11457E"], estadio: ["Fortuna Arena", 19_370, "Praga"], elo: 1760 },
  SE: { sigla: "SWE", cores: ["#FECC02", "#006AA7"], estadio: ["Strawberry Arena", 50_653, "Solna"], elo: 1740 },
  XW: { sigla: "WAL", cores: ["#C8102E", "#00B140"], estadio: ["Cardiff City Stadium", 33_280, "Cardiff"], elo: 1740 },
  SK: { sigla: "SVK", cores: ["#0B4EA2", "#FFFFFF"], estadio: ["Tehelné pole", 22_500, "Bratislava"], elo: 1730 },
  SI: { sigla: "SVN", cores: ["#FFFFFF", "#005DA4"], estadio: ["Stožice", 16_038, "Liubliana"], elo: 1720 },
  IE: { sigla: "IRL", cores: ["#169B62", "#FFFFFF"], estadio: ["Aviva Stadium", 51_700, "Dublin"], elo: 1720 },
  RO: { sigla: "ROU", cores: ["#FCD116", "#002B7F"], estadio: ["Arena Nacional", 55_634, "Bucareste"], elo: 1720 },
  AL: { sigla: "ALB", cores: ["#E41E20", "#000000"], estadio: ["Arena Kombëtare", 22_500, "Tirana"], elo: 1700 },
  GE: { sigla: "GEO", cores: ["#FFFFFF", "#E8112D"], estadio: ["Boris Paichadze", 54_202, "Tbilisi"], elo: 1690 },
  XK: { sigla: "KOS", cores: ["#244AA5", "#D0A650"], estadio: ["Fadil Vokrri", 13_980, "Pristina"], elo: 1680 },
  IL: { sigla: "ISR", cores: ["#0038B8", "#FFFFFF"], estadio: ["Sammy Ofer", 30_780, "Haifa"], elo: 1650 },
  BA: { sigla: "BIH", cores: ["#002395", "#FECB00"], estadio: ["Bilino Polje", 13_862, "Zenica"], elo: 1650 },
  MK: { sigla: "MKD", cores: ["#D20000", "#FFE600"], estadio: ["Toše Proeski", 33_011, "Escópia"], elo: 1640 },
  IS: { sigla: "ISL", cores: ["#02529C", "#FFFFFF"], estadio: ["Laugardalsvöllur", 9_800, "Reykjavik"], elo: 1620 },
  XN: { sigla: "NIR", cores: ["#00703C", "#FFFFFF"], estadio: ["Windsor Park", 18_434, "Belfast"], elo: 1620 },
  FI: { sigla: "FIN", cores: ["#FFFFFF", "#003580"], estadio: ["Olímpico de Helsinque", 36_251, "Helsinque"], elo: 1600 },
  ME: { sigla: "MNE", cores: ["#C40308", "#D4AF37"], estadio: ["Estádio de Podgorica", 11_080, "Podgorica"], elo: 1560 },
  BY: { sigla: "BLR", cores: ["#CF101A", "#007C30"], estadio: ["Dinamo", 22_246, "Minsk"], elo: 1540 },
  BG: { sigla: "BUL", cores: ["#FFFFFF", "#00966E"], estadio: ["Vasil Levski", 43_230, "Sófia"], elo: 1520 },
  KZ: { sigla: "KAZ", cores: ["#00AFCA", "#FEC50C"], estadio: ["Astana Arena", 30_244, "Astana"], elo: 1500 },
  AM: { sigla: "ARM", cores: ["#D90012", "#0033A0"], estadio: ["Vazgen Sargsyan", 14_403, "Erevan"], elo: 1490 },
  LU: { sigla: "LUX", cores: ["#ED2939", "#00A1DE"], estadio: ["Stade de Luxembourg", 9_386, "Luxemburgo"], elo: 1480 },
  AZ: { sigla: "AZE", cores: ["#0092BC", "#E4002B"], estadio: ["Olímpico de Baku", 68_700, "Baku"], elo: 1420 },
  FO: { sigla: "FRO", cores: ["#FFFFFF", "#005EB8"], estadio: ["Tórsvøllur", 6_500, "Tórshavn"], elo: 1420 },
  CY: { sigla: "CYP", cores: ["#004B9B", "#FFFFFF"], estadio: ["AEK Arena", 7_400, "Larnaca"], elo: 1410 },
  EE: { sigla: "EST", cores: ["#0072CE", "#000000"], estadio: ["Lilleküla", 14_336, "Tallinn"], elo: 1400 },
  LV: { sigla: "LVA", cores: ["#9E3039", "#FFFFFF"], estadio: ["Daugava", 10_461, "Riga"], elo: 1390 },
  LT: { sigla: "LTU", cores: ["#FDB913", "#006A44"], estadio: ["Darius e Girėnas", 15_026, "Kaunas"], elo: 1380 },
  MD: { sigla: "MDA", cores: ["#0046AE", "#FFD200"], estadio: ["Zimbru", 10_400, "Chisinau"], elo: 1340 },
  MT: { sigla: "MLT", cores: ["#CF142B", "#FFFFFF"], estadio: ["Ta' Qali", 16_997, "Ta' Qali"], elo: 1300 },
  AD: { sigla: "AND", cores: ["#D0103A", "#FEDF00"], estadio: ["Nacional de Andorra", 3_306, "Andorra-a-Velha"], elo: 1200 },
  GI: { sigla: "GIB", cores: ["#DA000C", "#FFFFFF"], estadio: ["Europa Point", 2_000, "Gibraltar"], elo: 1050 },
  LI: { sigla: "LIE", cores: ["#002B7F", "#CE1126"], estadio: ["Rheinpark", 7_584, "Vaduz"], elo: 1020 },
  SM: { sigla: "SMR", cores: ["#5EB6E4", "#FFFFFF"], estadio: ["Olímpico de San Marino", 6_664, "Serravalle"], elo: 880 },
};
for (const d of Object.values(DADOS_EUROPA)) d.conf = "uefa";
Object.assign(DADOS_SELECOES, DADOS_EUROPA);
// África, Ásia e Oceania (selecoes-mundo.ts): o estádio nacional na capital, maior nas mais fortes.
for (const [pais, [, , sigla, cor1, cor2, capital, elo, conf]] of Object.entries(SELECOES_MUNDO)) {
  const capacidade = Math.round(limitar(10_000 + (elo - 800) * 45, 8_000, 70_000) / 1_000) * 1_000;
  DADOS_SELECOES[pais] = { sigla, cores: [cor1, cor2], estadio: ["Estádio Nacional", capacidade, capital], elo, conf };
}

/** Países da Europa que só têm a seleção no jogo (sem liga): nome e nacionalidade dos jogadores (código do jogo). */
const PAISES_SO_COM_SELECAO: Record<string, { pais: string; nacionalidade: string }> = {
  HR: { pais: "Croácia", nacionalidade: "CRO" }, NO: { pais: "Noruega", nacionalidade: "NOR" }, BE: { pais: "Bélgica", nacionalidade: "BEL" },
  CH: { pais: "Suíça", nacionalidade: "SUI" }, DK: { pais: "Dinamarca", nacionalidade: "DIN" }, TR: { pais: "Turquia", nacionalidade: "TUR" },
  AT: { pais: "Áustria", nacionalidade: "AUT" }, UA: { pais: "Ucrânia", nacionalidade: "UCR" }, RU: { pais: "Rússia", nacionalidade: "RUS" },
  XS: { pais: "Escócia", nacionalidade: "ESC" }, RS: { pais: "Sérvia", nacionalidade: "SRB" }, GR: { pais: "Grécia", nacionalidade: "GRE" },
  HU: { pais: "Hungria", nacionalidade: "HUN" }, PL: { pais: "Polônia", nacionalidade: "POL" }, CZ: { pais: "Tchéquia", nacionalidade: "TCH" },
  SE: { pais: "Suécia", nacionalidade: "SUE" }, XW: { pais: "País de Gales", nacionalidade: "GAL" }, SK: { pais: "Eslováquia", nacionalidade: "SVK" },
  SI: { pais: "Eslovênia", nacionalidade: "SVN" }, IE: { pais: "Irlanda", nacionalidade: "IRL" }, RO: { pais: "Romênia", nacionalidade: "ROU" },
  AL: { pais: "Albânia", nacionalidade: "ALB" }, GE: { pais: "Geórgia", nacionalidade: "GEO" }, XK: { pais: "Kosovo", nacionalidade: "KOS" },
  IL: { pais: "Israel", nacionalidade: "ISR" }, BA: { pais: "Bósnia", nacionalidade: "BIH" }, MK: { pais: "Macedônia do Norte", nacionalidade: "MKD" },
  IS: { pais: "Islândia", nacionalidade: "ISL" }, XN: { pais: "Irlanda do Norte", nacionalidade: "NIR" }, FI: { pais: "Finlândia", nacionalidade: "FIN" },
  ME: { pais: "Montenegro", nacionalidade: "MNE" }, BY: { pais: "Belarus", nacionalidade: "BLR" }, BG: { pais: "Bulgária", nacionalidade: "BUL" },
  KZ: { pais: "Cazaquistão", nacionalidade: "CAZ" }, AM: { pais: "Armênia", nacionalidade: "ARM" }, LU: { pais: "Luxemburgo", nacionalidade: "LUX" },
  AZ: { pais: "Azerbaijão", nacionalidade: "AZE" }, FO: { pais: "Ilhas Faroé", nacionalidade: "FRO" }, CY: { pais: "Chipre", nacionalidade: "CYP" },
  EE: { pais: "Estônia", nacionalidade: "EST" }, LV: { pais: "Letônia", nacionalidade: "LVA" }, LT: { pais: "Lituânia", nacionalidade: "LTU" },
  MD: { pais: "Moldávia", nacionalidade: "MDA" }, MT: { pais: "Malta", nacionalidade: "MLT" }, AD: { pais: "Andorra", nacionalidade: "AND" },
  GI: { pais: "Gibraltar", nacionalidade: "GIB" }, LI: { pais: "Liechtenstein", nacionalidade: "LIE" }, SM: { pais: "San Marino", nacionalidade: "SMR" },
};

/** Os países das seleções, na ordem da lista (Conmebol primeiro, depois a Concacaf e a Europa). */
export const PAISES_SELECOES = Object.keys(DADOS_SELECOES);

export function confederacao(pais: string): Confederacao {
  const conf = DADOS_SELECOES[pais]?.conf;
  if (conf) return conf;
  return pais === "BR" || PAISES[pais]?.regiao === "sul" ? "conmebol" : "concacaf";
}

/** A seleção é da Europa? (pelo id: "sel-FR"). */
export const ehDaEuropa = (selId: string) => confederacao(paisDaSelecao(selId)) === "uefa";

export function nomeDoPais(pais: string): string {
  return pais === "BR" ? "Brasil" : PAISES[pais]?.pais ?? PAISES_SO_COM_SELECAO[pais]?.pais ?? SELECOES_MUNDO[pais]?.[0] ?? pais;
}

/** Nacionalidade dos jogadores do país (o código de 3 letras do jogo: "BRA", "ARG", "EUA"...). */
export function nacionalidadeDoPais(pais: string): string {
  return pais === "BR" ? "BRA" : PAISES[pais]?.nacionalidade ?? PAISES_SO_COM_SELECAO[pais]?.nacionalidade ?? SELECOES_MUNDO[pais]?.[1] ?? pais;
}

/** Bandeira do país pelo código de duas letras (as letras viram os "indicadores regionais" do emoji: BR → 🇧🇷). */
export function bandeira(codigo: string): string {
  // Inglaterra, Escócia e País de Gales têm bandeira própria; a Irlanda do Norte usa a do Reino Unido.
  const propria = { EN: "ENG", XS: "SCT", XW: "WLS", XN: "GB" }[codigo.toUpperCase()];
  if (propria) return emojiDaBandeira(propria);
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
  AND: "Andorra", ARM: "Armênia", AUS: "Austrália", CHN: "China", EGY: "Egito", EST: "Estônia", FRO: "Ilhas Faroé", GEO: "Geórgia",
  IRL: "Irlanda", IRN: "Irã", ISL: "Islândia", JPN: "Japão", KAZ: "Cazaquistão", KOR: "Coreia do Sul", KOS: "Kosovo", LIE: "Liechtenstein",
  LTU: "Lituânia", MAR: "Marrocos", MKD: "Macedônia do Norte", MNE: "Montenegro", NOR: "Noruega", QAT: "Catar", SMR: "San Marino",
  SVN: "Eslovênia", RSA: "África do Sul", UZB: "Uzbequistão", IND: "Índia", MAS: "Malásia", SIN: "Singapura", VIE: "Vietnã",
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
export function criarSelecoes(estado: EstadoJogo): string[] {
  // As que faltam: todas no jogo novo e no save de antes das seleções; só as da Europa no save de antes delas.
  const novos = PAISES_SELECOES.filter((p) => !estado.clubes[idSelecao(p)] || !estado.selecoes?.convocados[idSelecao(p)]);
  if (!novos.length) return [];
  const elencos = new Map<string, Jogador[]>();
  for (const j of Object.values(estado.jogadores)) {
    if (!j.clubeId) continue;
    const lista = elencos.get(j.clubeId);
    if (lista) lista.push(j);
    else elencos.set(j.clubeId, [j]);
  }
  const sel: EstadoSelecoes = estado.selecoes ??= { ranking: {}, convocados: {}, concentradas: [], competicoes: {}, agenda: [], base: {} };
  for (const pais of novos) {
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
  completarBases(estado, "inicio", novos, new Set(novos.filter((p) => sel.convocados[idSelecao(p)].length < CONVOCADOS_POR_SELECAO)));
  // Quem não tem a convocação de verdade (ou tem menos de 23) completa com os melhores; listas compridas demais (a página
  // do Uruguai traz 42) ficam com os 26 melhores.
  const porNacionalidade = agruparPorNacionalidade(estado);
  sel.primeiraConvocacao = [...(sel.primeiraConvocacao ?? []), ...novos.map(idSelecao)];
  for (const pais of novos) {
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
  return novos.map(idSelecao);
}

/**
 * Mantém a base de fora de cada seleção: quem se aposentou dá lugar a um jovem de fora (o mesmo número por posição que
 * havia no começo) e nenhuma posição fica com menos que o mínimo à disposição (base de fora mais os dos clubes do jogo).
 */
export function completarBases(estado: EstadoJogo, chave: string, paises: string[] = PAISES_SELECOES, curtas = new Set<string>()) {
  const sel = estado.selecoes;
  if (!sel) return;
  const porNacionalidade = agruparPorNacionalidade(estado);
  for (const pais of paises) {
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
    // Sem a convocação de verdade (ou com menos de 23), a seleção precisa de gente para uma convocação inteira.
    const minimo = curtas.has(pais) || (CONVOCADOS_2026[pais]?.convocados.length ?? 0) < CONVOCADOS_POR_SELECAO ? CONVOCACAO : MINIMO_NA_SELECAO;
    for (const posicao of Object.keys(MINIMO_NA_SELECAO) as Posicao[]) {
      const naBase = disponiveis.filter((j) => j.clubeId === id && j.posicao === posicao).length;
      for (let i = naBase; i < (sel.base[id]?.[posicao] ?? 0); i++) criar(posicao, true);
      // Só contam os dos clubes que chegariam perto do nível da seleção.
      const aproveitaveis = disponiveis.filter((j) => j.posicao === posicao && (j.clubeId === id || j.forca >= nivel - 15)).length;
      for (let i = aproveitaveis; i < minimo[posicao]; i++) criar(posicao, false);
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
  "copa-ouro": "Copa Ouro", "liga-das-nacoes": "Liga das Nações", "eliminatorias-euro": "Eliminatórias da Eurocopa", eurocopa: "Eurocopa",
  "eliminatorias-uefa": "Eliminatórias da Europa", "eliminatorias-caf": "Eliminatórias da África", "eliminatorias-afc": "Eliminatórias da Ásia",
  "eliminatorias-ofc": "Eliminatórias da Oceania", "repescagem-mundial": "Repescagem mundial", "copa-do-mundo": "Copa do Mundo",
};

/** Datas da Copa do Mundo (de meados de junho a meados de julho; 48 seleções, como em 2026). */
const DATAS_COPA: Record<string, [number, Dia]> = {
  r1: [9, "qui"], r2: [10, "qua"], r3: [11, "ter"], dezesseis: [12, "seg"], oitavas: [13, "sab"], quartas: [13, "qui"], semi: [14, "ter"], final: [15, "dom"],
};

/** Datas da Eurocopa (junho e julho, 24 seleções): 3 rodadas de grupos, oitavas, quartas, semifinal e final. */
const DATAS_EURO: Record<string, [number, Dia]> = {
  r1: [10, "sab"], r2: [10, "qua"], r3: [11, "dom"], oitavas: [11, "qui"], quartas: [12, "seg"], semi: [12, "qui"], final: [13, "dom"],
};
/** Finais da Liga das Nações (junho do ano seguinte ao da fase de ligas, depois da data FIFA). */
const DATAS_LIGA_DAS_NACOES: Record<string, [number, Dia]> = { semi: [10, "qua"], final: [11, "dom"] };

export const NOME_FASE_SELECOES: Record<string, string> = {
  liga: "Turno e returno", fase1: "1ª fase", fase2: "2ª fase", fase3: "3ª fase", grupos: "Fase de grupos", quartas: "Quartas de final",
  semi: "Semifinal", final: "Final", amistoso: "Amistoso", ligas: "Fase de ligas", oitavas: "Oitavas de final",
  "rep-semi": "Repescagem (semifinal)", "rep-final": "Repescagem (final)", dezesseis: "16 avos de final", aguardando: "Classificadas",
};

/** O nome do grupo: "Grupo B"; na Liga das Nações, a liga e o grupo dela ("Liga A · Grupo 2"). */
export function nomeDoGrupoDeSelecoes(serie: string, grupo: number): string {
  if (!serie.startsWith("S-LN")) return `Grupo ${String.fromCharCode(64 + grupo)}`;
  const liga = Math.min(3, Math.floor((grupo - 1) / 4));
  return `Liga ${"ABCD"[liga]} · Grupo ${grupo - liga * 4}`;
}

/** "Eliminatórias", "Copa América", "Copa Ouro", "Amistoso". */
export function nomeDaCompeticaoDeSelecoes(estado: EstadoJogo | undefined, c: IdCompeticaoSelecoes): string {
  if (c === AMISTOSOS) return "Amistoso";
  const comp = estado?.selecoes?.competicoes[c];
  if (comp) return comp.nome;
  if (c.startsWith("S-COPA")) return NOMES["copa-do-mundo"];
  if (c.startsWith("S-INT")) return NOMES["repescagem-mundial"];
  if (c.startsWith("S-ELI-CAF")) return NOMES["eliminatorias-caf"];
  if (c.startsWith("S-ELI-AFC")) return NOMES["eliminatorias-afc"];
  if (c.startsWith("S-ELI-OFC")) return NOMES["eliminatorias-ofc"];
  if (c.startsWith("S-ELI-EURO")) return NOMES["eliminatorias-euro"];
  if (c.startsWith("S-ELI-UEFA")) return NOMES["eliminatorias-uefa"];
  if (c.startsWith("S-EURO")) return NOMES.eurocopa;
  if (c.startsWith("S-LN")) return NOMES["liga-das-nacoes"];
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
  if (p.grupo != null) return `${nome} · ${p.fase === "grupos" || p.fase === "ligas" ? "" : `${fase} · `}${nomeDoGrupoDeSelecoes(p.serie, p.grupo)} · ${p.rodada}ª rodada`;
  return `${nome} · ${fase}${p.perna ? ` (${p.perna === 1 ? "ida" : "volta"})` : ""}`;
}

/** Empate vai para os pênaltis: no mata-mata dos torneios (jogo único) e na volta da 1ª fase da Concacaf (agregado). */
export function selecoesDecidePorPenaltis(p: Partida): boolean {
  if (["dezesseis", "oitavas", "quartas", "semi", "final", "rep-semi", "rep-final"].includes(p.fase)) return true;
  return p.fase === "fase1" && p.perna === 2;
}

const elo = (estado: EstadoJogo, id: string) => estado.selecoes?.ranking[id] ?? DADOS_SELECOES[paisDaSelecao(id)]?.elo ?? 1000;
const peloRanking = (estado: EstadoJogo, ids: string[]) =>
  [...ids].sort((a, b) => elo(estado, b) - elo(estado, a) || a.localeCompare(b));
const conmebol = () => PAISES_SELECOES.filter((p) => confederacao(p) === "conmebol").map(idSelecao);
const uefa = () => PAISES_SELECOES.filter((p) => confederacao(p) === "uefa").map(idSelecao);
const daConfederacao = (c: Confederacao) => PAISES_SELECOES.filter((p) => confederacao(p) === c).map(idSelecao);
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

// ---- Europa: Liga das Nações, Eliminatórias da Eurocopa, Eurocopa e Eliminatórias da Copa do Mundo ----------------

/** As datas FIFA do ano que ainda não passaram (as 10 de março a novembro; junho fica de fora nos anos de Copa). */
const datasLivres = (ano: number, desde: string, janelas: Janela[] = ORDEM_JANELAS) =>
  janelas.filter((j) => !(j === "jun" && anoDeCopa(ano))).flatMap((j) => datasDaJanela(ano, j)).filter((d) => d > desde);

/**
 * Marca os jogos de grupos nas últimas datas: turno e returno quando as datas dão (10 rodadas com 5 ou 6 seleções, 6 com 3
 * ou 4); com menos datas pela frente (save de antes da Europa aberto no meio do ano), turno único. Sem datas nem para isso,
 * devolve falso e nada é marcado.
 */
function marcarGrupos(estado: EstadoJogo, id: IdCompeticaoSelecoes, fase: string, grupos: string[][], datas: string[]): boolean {
  const jogos: Partida[] = [];
  for (const [i, g] of grupos.entries()) {
    const rng = rngPara(estado.semente, `${id}/${fase}/grupo${i + 1}`);
    const ida = turnoUnico(g, rng);
    const rodadas = datas.length >= 2 * ida.length ? [...ida, ...ida.map((r) => r.map(([a, b]) => [b, a] as Confronto))] : ida;
    if (datas.length < rodadas.length) return false;
    jogos.push(...jogosDasRodadas(id, fase, rodadas, datas.slice(-rodadas.length), i + 1));
  }
  marcar(estado, jogos);
  return true;
}

/**
 * Liga das Nações (anos pares, de setembro a novembro): as 55 da Europa em 4 ligas (A, B e C com 16 em 4 grupos de 4; a D
 * com 7 em 2 grupos), turno e returno. Na primeira edição as ligas saem do ranking; depois, sobe e desce. Os 4 primeiros
 * da Liga A decidem o título em junho do ano seguinte (semifinal e final, em campo neutro).
 */
function criarLigaDasNacoes(estado: EstadoJogo, ano: number, desde = ""): boolean {
  const id: IdCompeticaoSelecoes = `S-LN-${ano}`;
  const sel = estado.selecoes!;
  const todas = peloRanking(estado, uefa());
  if (!sel.ligaDasNacoes || todas.some((x) => !sel.ligaDasNacoes![x])) {
    sel.ligaDasNacoes = Object.fromEntries(todas.map((x, i) => [x, i < 16 ? 1 : i < 32 ? 2 : i < 48 ? 3 : 4]));
  }
  const grupos: string[][] = [];
  for (const liga of [1, 2, 3, 4]) {
    const membros = todas.filter((x) => sel.ligaDasNacoes![x] === liga);
    const doNivel = sortearGrupos(rngPara(estado.semente, `${id}/liga${liga}`), membros, liga === 4 ? 2 : 4, (x) => x);
    grupos.push(...doNivel.sort((a, b) => b.length - a.length));
  }
  if (!marcarGrupos(estado, id, "ligas", grupos, datasLivres(ano, desde, ["set", "out", "nov"]))) return false;
  sel.competicoes[id] = { id, tipo: "liga-das-nacoes", nome: NOMES["liga-das-nacoes"], ano, fase: "ligas", selecoes: todas, grupos: { ligas: grupos } };
  return true;
}

/** Fim da fase de ligas: sobe e desce entre as ligas e as semifinais entre os primeiros dos grupos da Liga A. */
function fimDasLigas(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const ligas = estado.selecoes!.ligaDasNacoes ?? {};
  const t = tabelasDeSelecoes(estado, comp.id, "ligas");
  const primeiros = (de: number, ate: number) => t.slice(de, ate).map((g) => g[0]);
  const ultimos = (de: number, ate: number) => t.slice(de, ate).map((g) => g[g.length - 1]);
  const piores = (linhas: LinhaTabela[], quantos: number) => melhoresLinhas(estado, linhas, linhas.length).slice(-quantos);
  // A ↔ B e B ↔ C: 4 e 4; C ↔ D: os 2 primeiros da D sobem e os 2 piores últimos da C descem.
  const sobem = [...primeiros(4, 8), ...primeiros(8, 12), ...primeiros(12, 14)].map((l) => l.clubeId);
  const caem = [...ultimos(0, 4).map((l) => l.clubeId), ...ultimos(4, 8).map((l) => l.clubeId), ...piores(ultimos(8, 12), 2)];
  for (const id of sobem) ligas[id] = Math.max(1, (ligas[id] ?? 4) - 1);
  for (const id of caem) ligas[id] = Math.min(4, (ligas[id] ?? 1) + 1);
  // Semifinais: o melhor primeiro contra o pior, o 2º contra o 3º.
  const finalistas = melhoresLinhas(estado, primeiros(0, 4), 4);
  comp.fase = "semi";
  const data = diaDaSemana(comp.ano + 1, DATAS_LIGA_DAS_NACOES.semi[0], DATAS_LIGA_DAS_NACOES.semi[1]);
  marcar(estado, ([[finalistas[0], finalistas[3]], [finalistas[1], finalistas[2]]] as [string, string][])
    .map(([a, b], i) => jogo(`${comp.id}-semi-${i + 1}`, comp.id, "semi", 1, data, a, b, { chave: i + 1, neutro: true })));
  return [`Liga das Nações: ${finalistas.map(nome).join(", ")} decidem o título em junho de ${comp.ano + 1}.`];
}

/** Sede da Eurocopa: uma das 8 melhores do ranking da Europa. */
const sedeDaEuro = (estado: EstadoJogo, ano: number) => rngPara(estado.semente, `sede-euro/${ano}`).escolher(peloRanking(estado, uefa()).slice(0, 8));

/**
 * Eliminatórias da Eurocopa de `euro` (no ano anterior, de março a novembro): as 54 sem a sede em 10 grupos de 5 ou 6,
 * turno e returno. Os 2 primeiros de cada grupo vão à Eurocopa com a sede (21); as outras 3 vagas saem da repescagem de
 * março do ano da Eurocopa (os 10 terceiros e os 2 melhores quartos).
 */
function criarEliminatoriasDaEuro(estado: EstadoJogo, euro: number, desde = ""): boolean {
  const id: IdCompeticaoSelecoes = `S-ELI-EURO-${euro}`;
  const sede = sedeDaEuro(estado, euro);
  const selecoes = peloRanking(estado, uefa().filter((x) => x !== sede));
  const grupos = sortearGrupos(rngPara(estado.semente, `eliminatorias/${id}`), selecoes, 10, (x) => x);
  if (!marcarGrupos(estado, id, "grupos", grupos, datasLivres(euro - 1, desde))) return false;
  estado.selecoes!.competicoes[id] = { id, tipo: "eliminatorias-euro", nome: NOMES["eliminatorias-euro"], ano: euro, fase: "grupos", selecoes, grupos: { grupos }, sede };
  return true;
}

/**
 * Eliminatórias da Europa para a Copa de `copa` (no ano anterior): as 55 em 12 grupos de 4 ou 5, turno e returno (os
 * grupos de 5 de março a novembro, os de 4 de setembro a novembro). Os 12 primeiros vão à Copa; as outras 4 vagas saem da
 * repescagem de março do ano da Copa (os 12 segundos e os 4 melhores terceiros).
 */
function criarEliminatoriasDaEuropa(estado: EstadoJogo, copa: number, desde = ""): boolean {
  const id: IdCompeticaoSelecoes = `S-ELI-UEFA-${copa}`;
  const selecoes = peloRanking(estado, uefa());
  const grupos = sortearGrupos(rngPara(estado.semente, `eliminatorias/${id}`), selecoes, 12, (x) => x);
  if (!marcarGrupos(estado, id, "grupos", grupos, datasLivres(copa - 1, desde))) return false;
  estado.selecoes!.competicoes[id] = { id, tipo: "eliminatorias-uefa", nome: NOMES["eliminatorias-uefa"], ano: copa, fase: "grupos", selecoes, grupos: { grupos } };
  return true;
}

/** Fases das Eliminatórias da Europa (da Eurocopa e da Copa): grupos, semifinal e final da repescagem. */
function avancarEliminatoriasDaEuropa(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const daEuro = comp.tipo === "eliminatorias-euro";
  const destino = daEuro ? `à Eurocopa de ${comp.ano}` : `à Copa do Mundo de ${comp.ano}`;
  const [quinta, terca] = datasDaJanela(comp.ano, "mar");
  if (comp.fase === "grupos") {
    const t = tabelasDeSelecoes(estado, comp.id, "grupos");
    const linha = (pos: number) => t.map((g) => g[pos]).filter(Boolean);
    let repescagem: string[];
    if (daEuro) {
      comp.classificados = [...(comp.sede ? [comp.sede] : []), ...linha(0).map((l) => l.clubeId), ...linha(1).map((l) => l.clubeId)];
      repescagem = [...melhoresLinhas(estado, linha(2), 10), ...melhoresLinhas(estado, linha(3), 2)];
    } else {
      comp.classificados = linha(0).map((l) => l.clubeId);
      repescagem = [...melhoresLinhas(estado, linha(1), 12), ...melhoresLinhas(estado, linha(2), 4)];
    }
    comp.repescagem = repescagem;
    // Caminhos de 4: o 1º contra o último e os dois do meio entre si; a casa é de quem foi melhor nos grupos.
    const n = repescagem.length, caminhos = n / 4;
    const pares: [string, string][] = [];
    for (let i = 0; i < caminhos; i++) pares.push([repescagem[i], repescagem[n - 1 - i]], [repescagem[2 * caminhos - 1 - i], repescagem[2 * caminhos + i]]);
    comp.fase = "rep-semi";
    marcar(estado, pares.map(([a, b], i) => jogo(`${comp.id}-rep-semi-${i + 1}`, comp.id, "rep-semi", 1, quinta, a, b, { chave: i + 1 })));
    return [`${comp.nome}: ${comp.classificados.map(nome).join(", ")} vão ${destino}. As outras ${caminhos} vagas saem da repescagem de março.`];
  }
  const vencedores = (fase: string) => jogosDaFase(estado, comp.id, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map(vencedorDoJogo);
  if (comp.fase === "rep-semi") {
    const v = vencedores("rep-semi");
    comp.fase = "rep-final";
    const jogos: Partida[] = [];
    for (let i = 0; i + 1 < v.length; i += 2) jogos.push(jogo(`${comp.id}-rep-final-${i / 2 + 1}`, comp.id, "rep-final", 1, terca, v[i], v[i + 1], { chave: i / 2 + 1 }));
    marcar(estado, jogos);
    return [`${comp.nome}: finais da repescagem ${jogos.map((p) => `${nome(p.mandante)} x ${nome(p.visitante)}`).join(", ")}.`];
  }
  const ultimos = vencedores("rep-final");
  comp.classificados = [...(comp.classificados ?? []), ...ultimos];
  comp.repescagem = [];
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  if (daEuro) criarEurocopa(estado, comp.ano, comp.classificados, comp.sede);
  return [`${comp.nome}: ${ultimos.map(nome).join(", ")} ficam com as últimas vagas e vão ${destino}.`];
}

/** Eurocopa (anos múltiplos de 4, junho e julho): 24 seleções em 6 grupos de 4; passam os 2 primeiros e os 4 melhores terceiros. */
function criarEurocopa(estado: EstadoJogo, ano: number, classificados: string[], sede = sedeDaEuro(estado, ano)) {
  const id: IdCompeticaoSelecoes = `S-EURO-${ano}`;
  const rng = rngPara(estado.semente, `torneio/${id}`);
  const ranking = [sede, ...peloRanking(estado, classificados.filter((x) => x !== sede))];
  const grupos = sortearGrupos(rng, ranking, 6, (x) => x);
  const g = grupos.findIndex((x) => x.includes(sede));
  [grupos[0], grupos[g]] = [grupos[g], grupos[0]];
  estado.selecoes!.competicoes[id] = { id, tipo: "eurocopa", nome: NOMES.eurocopa, ano, fase: "grupos", selecoes: ranking, grupos: { grupos }, sede };
  const datas = [DATAS_EURO.r1, DATAS_EURO.r2, DATAS_EURO.r3].map(([s, d]) => diaDaSemana(ano, s, d));
  marcar(estado, grupos.flatMap((grupo, i) =>
    jogosDasRodadas(id, "grupos", turnoUnico(grupo, rng), datas, i + 1, (m, v) => mandoNoTorneio(sede, m, v))));
}

// ---- Copa do Mundo: Eliminatórias da África, Ásia e Oceania, repescagem mundial e a Copa (48 seleções) -------------

/** Sedes de cada Copa: as de verdade até 2034; depois, uma das mais fortes de outro continente que o da Copa anterior. */
const SEDES_DA_COPA: Record<number, string[]> = { 2026: ["US", "MX", "CA"], 2030: ["ES", "PT", "MA"], 2034: ["SA"] };
function sedesDaCopa(estado: EstadoJogo, ano: number): string[] {
  const fixas = SEDES_DA_COPA[ano];
  if (fixas) return fixas.map(idSelecao);
  const anterior = sedesDaCopa(estado, ano - 4)[0];
  const candidatas = rankingDasSelecoes(estado).slice(0, 24).map((s) => s.id).filter((id) => confederacao(paisDaSelecao(id)) !== confederacao(paisDaSelecao(anterior)));
  return [rngPara(estado.semente, `sede-copa/${ano}`).escolher(candidatas)];
}

/** Grupos e vagas das Eliminatórias de cada continente (as da América e da Europa ficam nas funções delas). */
const ELIMINATORIAS_MUNDO: Record<"caf" | "afc" | "ofc", { id: string; tipo: TipoCompeticaoSelecoes; grupos: number }> = {
  caf: { id: "CAF", tipo: "eliminatorias-caf", grupos: 9 },
  afc: { id: "AFC", tipo: "eliminatorias-afc", grupos: 8 },
  ofc: { id: "OFC", tipo: "eliminatorias-ofc", grupos: 2 },
};

/**
 * Eliminatórias da África (9 grupos de 6), da Ásia (8 grupos de 5 ou 6) e da Oceania (2 grupos) para a Copa de `copa`, no
 * ano anterior, turno e returno nas datas FIFA. Na África e na Ásia os primeiros vão à Copa e o melhor segundo à
 * repescagem mundial; na Oceania o melhor primeiro vai à Copa e o outro primeiro à repescagem.
 */
function criarEliminatoriasDoMundo(estado: EstadoJogo, conf: "caf" | "afc" | "ofc", copa: number, desde = ""): boolean {
  const def = ELIMINATORIAS_MUNDO[conf];
  const id: IdCompeticaoSelecoes = `S-ELI-${def.id}-${copa}`;
  const selecoes = peloRanking(estado, daConfederacao(conf));
  const grupos = sortearGrupos(rngPara(estado.semente, `eliminatorias/${id}`), selecoes, def.grupos, (x) => x);
  if (!marcarGrupos(estado, id, "grupos", grupos, datasLivres(copa - 1, desde))) return false;
  estado.selecoes!.competicoes[id] = { id, tipo: def.tipo, nome: NOMES[def.tipo], ano: copa, fase: "grupos", selecoes, grupos: { grupos } };
  return true;
}

function avancarEliminatoriasDoMundo(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const t = tabelasDeSelecoes(estado, comp.id, "grupos");
  const primeiros = t.map((g) => g[0]);
  if (comp.tipo === "eliminatorias-ofc") {
    const [melhor, outro] = melhoresLinhas(estado, primeiros, 2);
    comp.classificados = [melhor];
    comp.repescagem = outro ? [outro] : [];
  } else {
    comp.classificados = primeiros.map((l) => l.clubeId);
    comp.repescagem = melhoresLinhas(estado, t.map((g) => g[1]).filter(Boolean), 1);
  }
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  return [`${comp.nome}: ${comp.classificados.map(nome).join(", ")} vão à Copa do Mundo de ${comp.ano}; ${comp.repescagem.map(nome).join(" e ")} vai à repescagem mundial.`];
}

/** As Eliminatórias que mandam seleções à repescagem mundial (uma vaga cada; a Concacaf, duas). */
const ANTES_DA_REPESCAGEM: TipoCompeticaoSelecoes[] = ["eliminatorias-sul", "eliminatorias-concacaf", "eliminatorias-caf", "eliminatorias-afc", "eliminatorias-ofc"];

/**
 * A Copa do Mundo de `ano` começa a ser montada no ano anterior (fase "aguardando"): as sedes já estão nela e cada
 * Eliminatória que acaba põe os classificados (`selecoes`) e quem vai à repescagem mundial (`entram.repescagem`).
 */
function criarCopaDoMundo(estado: EstadoJogo, ano: number): EstadoCompeticaoSelecoes {
  const id: IdCompeticaoSelecoes = `S-COPA-${ano}`;
  const sedes = sedesDaCopa(estado, ano);
  const comp: EstadoCompeticaoSelecoes = {
    id, tipo: "copa-do-mundo", nome: NOMES["copa-do-mundo"], ano, fase: "aguardando", selecoes: [...sedes], sede: sedes[0], sedes,
    entram: { repescagem: [], fechadas: [] },
  };
  estado.selecoes!.competicoes[id] = comp;
  // Eliminatórias que já acabaram (save que ganha a Copa no meio do caminho).
  for (const c of Object.values(estado.selecoes!.competicoes)) if (c && c.ano === ano && c.fase === "encerrada") registrarNaCopa(estado, c);
  return comp;
}

/** Eliminatória que acabou: os classificados entram na Copa e quem vai à repescagem mundial fica guardado. */
function registrarNaCopa(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes) {
  if (!comp.tipo.startsWith("eliminatorias") && comp.tipo !== "repescagem-mundial") return;
  if (comp.tipo === "eliminatorias-euro") return;
  const copa = estado.selecoes?.competicoes[`S-COPA-${comp.ano}` as IdCompeticaoSelecoes];
  if (!copa || copa.fase !== "aguardando") return;
  const entram = (copa.entram ??= {});
  const fechadas = (entram.fechadas ??= []);
  if (fechadas.includes(comp.tipo)) return;
  fechadas.push(comp.tipo);
  for (const id of comp.classificados ?? []) if (!copa.selecoes.includes(id)) copa.selecoes.push(id);
  if (ANTES_DA_REPESCAGEM.includes(comp.tipo)) {
    entram.repescagem = [...new Set([...(entram.repescagem ?? []), ...(comp.repescagem ?? [])])].filter((id) => !copa.selecoes.includes(id));
    if (ANTES_DA_REPESCAGEM.every((t) => fechadas.includes(t))) criarRepescagemMundial(estado, comp.ano, entram.repescagem);
  }
}

/**
 * Repescagem mundial (março do ano da Copa, campo neutro): as 6 que vieram das Eliminatórias; as 2 melhores do ranking
 * esperam na final e as outras 4 jogam a semifinal (3ª x 6ª, 4ª x 5ª). Os 2 vencedores vão à Copa. Com a data de março
 * já passada (save antigo), vão as 2 melhores do ranking.
 */
function criarRepescagemMundial(estado: EstadoJogo, ano: number, times: string[], semifinais?: [string, string][], esperam?: string[]) {
  const id: IdCompeticaoSelecoes = `S-INT-${ano}`;
  const sel = estado.selecoes!;
  if (sel.competicoes[id]) return;
  const ordem = peloRanking(estado, times);
  const [quinta] = datasDaJanela(ano, "mar");
  const comp: EstadoCompeticaoSelecoes = {
    id, tipo: "repescagem-mundial", nome: NOMES["repescagem-mundial"], ano, fase: "rep-semi", selecoes: ordem, repescagem: [...ordem],
    entram: { final: esperam ?? ordem.slice(0, 2) },
  };
  sel.competicoes[id] = comp;
  if (quinta <= estado.data || ordem.length < 4) {
    comp.classificados = ordem.slice(0, 2);
    comp.repescagem = [];
    comp.fase = "encerrada";
    registrarNaCopa(estado, comp);
    return;
  }
  const pares = semifinais ?? [[ordem[3], ordem[4]], [ordem[2], ordem[5]]];
  marcar(estado, pares.map(([a, b], i) => jogo(`${id}-rep-semi-${i + 1}`, id, "rep-semi", 1, quinta, a, b, { chave: i + 1, neutro: true })));
}

function avancarRepescagemMundial(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const vencedores = (fase: string) => jogosDaFase(estado, comp.id, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map(vencedorDoJogo);
  if (comp.fase === "rep-semi") {
    const v = vencedores("rep-semi");
    const esperam = comp.entram?.final ?? [];
    const terca = datasDaJanela(comp.ano, "mar")[1];
    comp.fase = "rep-final";
    const jogos = esperam.map((a, i) => jogo(`${comp.id}-rep-final-${i + 1}`, comp.id, "rep-final", 1, terca, a, v[i], { chave: i + 1, neutro: true }));
    marcar(estado, jogos);
    return [`Repescagem mundial: as finais são ${jogos.map((p) => `${nome(p.mandante)} x ${nome(p.visitante)}`).join(" e ")}.`];
  }
  comp.classificados = vencedores("rep-final");
  comp.repescagem = [];
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  return [`Repescagem mundial: ${comp.classificados.map(nome).join(" e ")} vão à Copa do Mundo de ${comp.ano}.`];
}

/** A Copa de 2026 no jogo novo (e no save que chega antes dela): as 42 que já estavam classificadas de verdade e as repescagens de março. */
const COPA_2026 = {
  classificadas: ["US", "MX", "CA", "JP", "IR", "UZ", "KR", "JO", "AU", "QA", "SA", "MA", "TN", "EG", "DZ", "GH", "CV", "ZA", "SN", "CI",
    "AR", "BR", "EC", "UY", "CO", "PY", "NZ", "PA", "HT", "CW", "EN", "FR", "HR", "PT", "NO", "DE", "NL", "ES", "BE", "AT", "CH", "XS"],
  /** Repescagem da Europa: 4 caminhos (semifinal e final). */
  europa: [["IT", "XN"], ["XW", "BA"], ["UA", "SE"], ["PL", "AL"], ["TR", "RO"], ["SK", "XK"], ["DK", "MK"], ["CZ", "IE"]],
  /** Repescagem mundial: RD Congo e Iraque esperam na final. */
  mundial: { semifinais: [["NC", "JM"], ["BO", "SR"]], esperam: ["CD", "IQ"] },
};

function criarCopaDe2026(estado: EstadoJogo, desde: string) {
  const sel = estado.selecoes!;
  const copa = criarCopaDoMundo(estado, 2026);
  copa.selecoes = COPA_2026.classificadas.map(idSelecao);
  copa.entram = { repescagem: [], fechadas: [...ANTES_DA_REPESCAGEM] };
  const [quinta] = datasDaJanela(2026, "mar");
  // Repescagem da Europa (4 vagas): os caminhos de verdade.
  const idEuropa: IdCompeticaoSelecoes = "S-ELI-UEFA-2026";
  if (!sel.competicoes[idEuropa]) {
    const pares = COPA_2026.europa.map(([a, b]) => [idSelecao(a), idSelecao(b)] as [string, string]);
    const comp: EstadoCompeticaoSelecoes = {
      id: idEuropa, tipo: "eliminatorias-uefa", nome: NOMES["eliminatorias-uefa"], ano: 2026, fase: "rep-semi", selecoes: peloRanking(estado, uefa()),
      classificados: ["EN", "FR", "HR", "PT", "NO", "DE", "NL", "ES", "BE", "AT", "CH", "XS"].map(idSelecao), repescagem: pares.flat(),
    };
    sel.competicoes[idEuropa] = comp;
    if (quinta > desde) marcar(estado, pares.map(([a, b], i) => jogo(`${idEuropa}-rep-semi-${i + 1}`, idEuropa, "rep-semi", 1, quinta, a, b, { chave: i + 1 })));
    else {
      // Março já passou: vão os 4 melhores do ranking entre os da repescagem.
      comp.classificados = [...(comp.classificados ?? []), ...peloRanking(estado, comp.repescagem ?? []).slice(0, 4)];
      comp.repescagem = [];
      comp.fase = "encerrada";
      registrarNaCopa(estado, comp);
    }
  }
  const m = COPA_2026.mundial;
  criarRepescagemMundial(estado, 2026, [...m.semifinais.flat(), ...m.esperam].map(idSelecao),
    m.semifinais.map(([a, b]) => [idSelecao(a), idSelecao(b)] as [string, string]), m.esperam.map(idSelecao));
}

/** Os grupos da Copa: potes de 12 pelo ranking (as sedes no primeiro, nos grupos A, B, C...), no máximo 2 da Europa e 1 de cada outro continente por grupo. */
function sortearGruposDaCopa(estado: EstadoJogo, rng: Rng, sedes: string[], times: string[]): string[][] {
  const ordem = [...sedes, ...peloRanking(estado, times.filter((x) => !sedes.includes(x)))];
  const potes = [0, 1, 2, 3].map((k) => ordem.slice(k * 12, k * 12 + 12));
  const conf = (id: string) => confederacao(paisDaSelecao(id));
  const cabe = (g: string[], id: string) => g.filter((x) => conf(x) === conf(id)).length < (conf(id) === "uefa" ? 2 : 1);
  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const grupos: string[][] = Array.from({ length: 12 }, () => []);
    let ok = true;
    potes.forEach((pote, k) => {
      if (!ok) return;
      const sorteados = k === 0 ? [...pote.slice(0, sedes.length), ...rng.embaralhar(pote.slice(sedes.length))] : rng.embaralhar([...pote]);
      for (const id of sorteados) {
        const livres = grupos.map((_, i) => i).filter((i) => grupos[i].length === k);
        const bons = livres.filter((i) => cabe(grupos[i], id));
        const opcoes = k === 0 ? livres.slice(0, 1) : bons.length ? bons : tentativa === 299 ? livres : [];
        if (!opcoes.length) { ok = false; return; }
        grupos[k === 0 ? opcoes[0] : rng.escolher(opcoes)].push(id);
      }
    });
    if (ok) return grupos;
  }
  return Array.from({ length: 12 }, (_, i) => potes.map((p) => p[i]).filter(Boolean));
}

/** No jogo de Copa, as sedes jogam em casa; os outros jogos são em campo neutro. */
function mandoNaCopa(sedes: string[], m: string, v: string): Partial<Partida> {
  if (sedes.includes(m)) return {};
  if (sedes.includes(v)) return { mandante: v, visitante: m };
  return { neutro: true };
}

/** Fecha a lista da Copa (48: as que se classificaram e, faltando, as melhores do continente das sedes) e marca os grupos. */
function montarCopa(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes) {
  const sedes = comp.sedes ?? [comp.sede!];
  const lista = [...new Set(comp.selecoes)];
  const continentes = [...new Set(sedes.map((id) => confederacao(paisDaSelecao(id))))];
  const reserva = peloRanking(estado, PAISES_SELECOES.map(idSelecao).filter((id) => !lista.includes(id) && !DADOS_SELECOES[paisDaSelecao(id)].semFifa));
  for (let k = 0; lista.length < 48 && k < 400; k++) {
    const conf = continentes[k % continentes.length];
    const proxima = reserva.find((id) => !lista.includes(id) && confederacao(paisDaSelecao(id)) === conf) ?? reserva.find((id) => !lista.includes(id));
    if (proxima) lista.push(proxima);
  }
  const participantes = [...sedes, ...peloRanking(estado, lista.filter((x) => !sedes.includes(x)))].slice(0, 48);
  const rng = rngPara(estado.semente, `torneio/${comp.id}`);
  const grupos = sortearGruposDaCopa(estado, rng, sedes, participantes);
  comp.selecoes = participantes;
  comp.grupos = { grupos };
  comp.fase = "grupos";
  const datas = [DATAS_COPA.r1, DATAS_COPA.r2, DATAS_COPA.r3].map(([s, d]) => diaDaSemana(comp.ano, s, d));
  marcar(estado, grupos.flatMap((grupo, i) => jogosDasRodadas(comp.id, "grupos", turnoUnico(grupo, rng), datas, i + 1, (m, v) => mandoNaCopa(sedes, m, v))));
}

/** Ordem das chaves do mata-mata para `n` (1 x n, e os 2 melhores só se encontram na final). */
function ordemDasChaves(n: number): number[] {
  let ordem = [1, 2];
  while (ordem.length < n) ordem = ordem.flatMap((s) => [s, 2 * ordem.length + 1 - s]);
  return ordem;
}

function avancarCopaDoMundo(estado: EstadoJogo, comp: EstadoCompeticaoSelecoes): string[] {
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const sedes = comp.sedes ?? [comp.sede!];
  const data = (fase: string) => diaDaSemana(comp.ano, DATAS_COPA[fase][0], DATAS_COPA[fase][1]);
  const mata = (fase: string, pares: [string, string][]) => {
    comp.fase = fase;
    marcar(estado, pares.map(([a, b], i) => jogo(`${comp.id}-${fase}-${i + 1}`, comp.id, fase, 1, data(fase), a, b, { chave: i + 1, ...mandoNaCopa(sedes, a, b) })));
  };
  const vencedores = (fase: string) => jogosDaFase(estado, comp.id, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map(vencedorDoJogo);
  const emPares = (v: string[]) => Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]] as [string, string]);
  const seguinte: Record<string, string> = { dezesseis: "oitavas", oitavas: "quartas", quartas: "semi", semi: "final" };
  if (comp.fase === "grupos") {
    // Os 12 primeiros, os 12 segundos e os 8 melhores terceiros, pela campanha: o 1º pega o 32º, e assim por diante.
    const t = tabelasDeSelecoes(estado, comp.id, "grupos");
    const s = [0, 1, 2].flatMap((pos) => melhoresLinhas(estado, t.map((g) => g[pos]), pos === 2 ? 8 : 12));
    const grupoDe = (id: string) => t.findIndex((g) => g.some((l) => l.clubeId === id));
    const ordem = ordemDasChaves(32);
    const pares: [string, string][] = [];
    for (let i = 0; i < 32; i += 2) pares.push([s[ordem[i] - 1], s[ordem[i + 1] - 1]]);
    // Dois do mesmo grupo não se enfrentam já: troca o adversário com o do jogo seguinte.
    for (let i = 0; i < pares.length; i++) {
      if (grupoDe(pares[i][0]) !== grupoDe(pares[i][1])) continue;
      for (let j = 0; j < pares.length; j++) {
        if (j === i) continue;
        if (grupoDe(pares[i][0]) !== grupoDe(pares[j][1]) && grupoDe(pares[j][0]) !== grupoDe(pares[i][1])) {
          [pares[i][1], pares[j][1]] = [pares[j][1], pares[i][1]];
          break;
        }
      }
    }
    mata("dezesseis", pares);
    return [`Copa do Mundo: estão nos 16 avos de final ${s.map(nome).join(", ")}.`];
  }
  if (seguinte[comp.fase]) {
    const v = vencedores(comp.fase);
    const proxima = seguinte[comp.fase];
    mata(proxima, emPares(v));
    return proxima === "final" ? [`Copa do Mundo: a final é ${nome(v[0])} x ${nome(v[1])}.`] : [`Copa do Mundo: seguem ${v.map(nome).join(", ")}.`];
  }
  const [final] = jogosDaFase(estado, comp.id, "final");
  comp.campeao = vencedorDoJogo(final);
  comp.vice = comp.campeao === final.mandante ? final.visitante : final.mandante;
  comp.fase = "encerrada";
  depoisDaCompeticao(estado, comp);
  return [`${nome(comp.campeao)} é campeão da Copa do Mundo de ${comp.ano}!`];
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
  // Europa: Liga das Nações (anos pares, de setembro a novembro), Eliminatórias da Eurocopa (um ano antes dela) e da
  // Copa do Mundo (um ano antes dela). No save de antes da Europa, as que ainda têm datas pela frente.
  if (ano % 2 === 0 && !sel.competicoes[`S-LN-${ano}`]) criarLigaDasNacoes(estado, ano, desde);
  if (ano % 4 === 3 && !sel.competicoes[`S-ELI-EURO-${ano + 1}`]) criarEliminatoriasDaEuro(estado, ano + 1, desde);
  if (anoDeCopa(ano + 1) && !sel.competicoes[`S-ELI-UEFA-${ano + 1}`]) criarEliminatoriasDaEuropa(estado, ano + 1, desde);
  // Copa do Mundo: a do ano seguinte começa a ser montada (as Eliminatórias da África, Ásia e Oceania são no ano anterior a
  // ela); a de 2026, no jogo novo, já tem as 42 classificadas de verdade e as repescagens de março.
  if (ano === 2026 && !sel.competicoes["S-COPA-2026"] && diaDaSemana(2026, DATAS_COPA.r1[0], DATAS_COPA.r1[1]) > desde) criarCopaDe2026(estado, desde);
  if (anoDeCopa(ano + 1)) {
    if (!sel.competicoes[`S-COPA-${ano + 1}`]) criarCopaDoMundo(estado, ano + 1);
    for (const conf of ["caf", "afc", "ofc"] as const) {
      if (!sel.competicoes[`S-ELI-${ELIMINATORIAS_MUNDO[conf].id}-${ano + 1}`]) criarEliminatoriasDoMundo(estado, conf, ano + 1, desde);
    }
  }
  // Eurocopa sem as Eliminatórias (save de antes da Europa aberto no ano dela): a sede e as 23 melhores do ranking.
  if (ano % 4 === 0 && nova(`S-EURO-${ano}`, r1) && !sel.competicoes[`S-ELI-EURO-${ano}`]) {
    const sede = sedeDaEuro(estado, ano);
    criarEurocopa(estado, ano, [sede, ...peloRanking(estado, uefa().filter((x) => x !== sede)).slice(0, 23)], sede);
  }
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
  marcar(estado, gruposDeAmistosos(PAISES_SELECOES.map(idSelecao)).flatMap(([ids, sufixo]) => amistososDaJanela(estado, proxima.datas, ids, sufixo)));
}

/**
 * As seleções em grupos que fazem amistosos entre si (com o sufixo do sorteio e dos ids de cada grupo): América, Europa,
 * África e Ásia com a Oceania.
 */
function gruposDeAmistosos(ids: string[], extra = ""): [string[], string][] {
  const conf = (id: string) => confederacao(paisDaSelecao(id));
  return ([
    [ids.filter((id) => conf(id) === "conmebol" || conf(id) === "concacaf"), ""],
    [ids.filter((id) => conf(id) === "uefa"), "-eu"],
    [ids.filter((id) => conf(id) === "caf"), "-af"],
    [ids.filter((id) => conf(id) === "afc" || conf(id) === "ofc"), "-as"],
  ] as [string[], string][]).filter(([lista]) => lista.length > 1).map(([lista, sufixo]) => [lista, `${sufixo}${extra}`]);
}

/**
 * Amistosos das duas datas de uma data FIFA entre as seleções de `todas` (as da América entre si e as da Europa entre si)
 * que estão livres. `sufixo` separa o sorteio e os ids dos jogos de cada continente.
 */
function amistososDaJanela(estado: EstadoJogo, datas: [string, string], todas: string[], sufixo: string): Partida[] {
  const rng = rngPara(estado.semente, `amistosos${sufixo}/${datas[0]}`);
  const jogos: Partida[] = [];
  // Quem joga a repescagem nessa data FIFA (semifinal na quinta, final na terça) fica sem amistoso nas duas datas.
  const naRepescagem = new Set(Object.values(estado.selecoes?.competicoes ?? {})
    .filter((c) => c && (c.fase === "rep-semi" || c.fase === "rep-final"))
    .flatMap((c) => [...(c!.repescagem ?? []), ...(c!.entram?.final ?? [])]));
  datas.forEach((data, k) => {
    // Ocupadas: jogo oficial no dia ou a 2 dias dele (a Copa América começa logo depois da data de junho).
    const ocupadas = new Set(estado.partidas.filter((p) => ehCompeticaoDeSelecoes(p.serie) && Math.abs(diasEntre(p.data, data)) <= 2)
      .flatMap((p) => [p.mandante, p.visitante]));
    const livres = peloRanking(estado, todas.filter((x) => !ocupadas.has(x) && !naRepescagem.has(x)));
    // Em blocos de 4 pela força; na segunda data os blocos andam 2 casas (outro adversário).
    const ordem = k === 1 ? [...livres.slice(2), ...livres.slice(0, 2)] : livres;
    const pares: [string, string][] = [];
    for (let i = 0; i < ordem.length; i += 4) {
      const bloco = rng.embaralhar(ordem.slice(i, i + 4));
      for (let a = 0; a + 1 < bloco.length; a += 2) pares.push(rng.chance(0.5) ? [bloco[a], bloco[a + 1]] : [bloco[a + 1], bloco[a]]);
    }
    pares.forEach(([m, v], i) => jogos.push(jogo(`${AMISTOSOS}-${data}${sufixo}-${i + 1}`, AMISTOSOS, "amistoso", k + 1, data, m, v)));
  });
  return jogos;
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
    if (comp.fase === "aguardando") {
      // A Copa fecha a lista quando a repescagem mundial e a da Europa acabam (ou, sem elas, 10 dias antes de começar).
      const acabou = (id: string) => sel.competicoes[id as IdCompeticaoSelecoes]?.fase === "encerrada";
      const inicio = diaDaSemana(comp.ano, DATAS_COPA.r1[0], DATAS_COPA.r1[1]);
      if ((acabou(`S-INT-${comp.ano}`) && acabou(`S-ELI-UEFA-${comp.ano}`)) || diasEntre(estado.data, inicio) <= 10) {
        montarCopa(estado, comp);
        noticias.push(`Copa do Mundo de ${comp.ano}: as 48 seleções estão definidas e os grupos foram sorteados.`);
      }
      continue;
    }
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
    } else if (comp.tipo === "eliminatorias-euro" || comp.tipo === "eliminatorias-uefa") {
      noticias.push(...avancarEliminatoriasDaEuropa(estado, comp));
    } else if (comp.tipo === "liga-das-nacoes" && comp.fase === "ligas") {
      noticias.push(...fimDasLigas(estado, comp));
    } else if (comp.tipo === "eliminatorias-caf" || comp.tipo === "eliminatorias-afc" || comp.tipo === "eliminatorias-ofc") {
      noticias.push(...avancarEliminatoriasDoMundo(estado, comp));
    } else if (comp.tipo === "repescagem-mundial") {
      noticias.push(...avancarRepescagemMundial(estado, comp));
    } else if (comp.tipo === "copa-do-mundo") {
      noticias.push(...avancarCopaDoMundo(estado, comp));
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
  // A Eurocopa tem oitavas; as finais da Liga das Nações são em junho do ano seguinte ao da fase de ligas.
  const daLiga = comp.tipo === "liga-das-nacoes";
  const calendario = daLiga ? DATAS_LIGA_DAS_NACOES : comp.tipo === "eurocopa" ? DATAS_EURO : DATAS_TORNEIO;
  const datas = (fase: string) => diaDaSemana(comp.ano + (daLiga ? 1 : 0), calendario[fase][0], calendario[fase][1]);
  const mata = (fase: string, pares: [string, string][]) => {
    comp.fase = fase;
    marcar(estado, pares.map(([a, b], i) => jogo(`${comp.id}-${fase}-${i + 1}`, comp.id, fase, 1, datas(fase), a, b, { chave: i + 1, ...mandoNoTorneio(comp.sede, a, b) })));
  };
  const emPares = (v: string[]) => Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]] as [string, string]);
  const vencedores = (fase: string) => jogosDaFase(estado, comp.id, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map(vencedorDoJogo);
  if (comp.fase === "grupos" && comp.tipo === "eurocopa") {
    // Os 6 primeiros, os 6 segundos e os 4 melhores terceiros, em ordem de campanha: 1º x 16º, 8º x 9º...
    const t = tabelasDeSelecoes(estado, comp.id, "grupos");
    const s = [0, 1, 2].flatMap((pos) => melhoresLinhas(estado, t.map((g) => g[pos]), pos === 2 ? 4 : 6));
    mata("oitavas", [[s[0], s[15]], [s[7], s[8]], [s[3], s[12]], [s[4], s[11]], [s[1], s[14]], [s[6], s[9]], [s[2], s[13]], [s[5], s[10]]]);
    return [`${comp.nome}: nas oitavas, ${s.map(nome).join(", ")}.`];
  }
  if (comp.fase === "oitavas") {
    const v = vencedores("oitavas");
    mata("quartas", emPares(v));
    return [`${comp.nome}: nas quartas, ${v.map(nome).join(", ")}.`];
  }
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
  if (p.serie.startsWith("S-ELI") || p.serie.startsWith("S-INT") || (p.serie.startsWith("S-LN") && p.fase === "ligas")) return 40;
  if (p.serie.startsWith("S-COPA")) return p.fase === "final" ? 70 : 60;
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
  ES: "a", FR: "a", EN: "a", PT: "", DE: "a", NL: "a", IT: "a", HR: "a", NO: "a", BE: "a", CH: "a", DK: "a", TR: "a", AT: "a",
  UA: "a", RU: "a", XS: "a", RS: "a", GR: "a", HU: "a", PL: "a", CZ: "a", SE: "a", XW: "o", SK: "a", SI: "a", IE: "a", RO: "a",
  AL: "a", GE: "a", XK: "o", IL: "", BA: "a", MK: "a", IS: "a", XN: "a", FI: "a", ME: "", BY: "", BG: "a", KZ: "o", AM: "a",
  LU: "", AZ: "o", FO: "as", CY: "", EE: "a", LV: "a", LT: "a", MD: "a", MT: "", AD: "", GI: "", LI: "", SM: "",
  ...Object.fromEntries(Object.entries(SELECOES_MUNDO).map(([pais, linha]) => [pais, linha[8]])),
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
      texto: `A federação ${comArtigoDaSelecao("do", id, estado)} quer você como técnico da seleção, junto com o clube. ${rankingDasSelecoes(estado).find((s) => s.id === id)!.pos}º no ranking. Responda até ${validaAte.split("-").reverse().join("/")}.`,
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
  registrarNaCopa(estado, comp);
  const minha = estado.tecnico.selecao;
  if (!minha || !comp.selecoes.includes(minha)) return;
  const t = estado.tecnico;
  const subir = (d: number) => { t.reputacao = limitar((t.reputacao ?? 60) + d, REPUTACAO.minimo, REPUTACAO.maximo); };
  const favoritas = peloRanking(estado, comp.selecoes);
  if (comp.tipo.startsWith("eliminatorias")) {
    if (comp.classificados?.includes(minha)) { subir(4); return; }
    const vagas = { "eliminatorias-sul": 6, "eliminatorias-concacaf": 3, "eliminatorias-euro": 16, "eliminatorias-uefa": 10, "eliminatorias-caf": 7, "eliminatorias-afc": 6, "eliminatorias-ofc": 1 }[comp.tipo as string] ?? 3;
    if (!comp.repescagem?.includes(minha) && favoritas.indexOf(minha) < vagas) {
      subir(-6);
      const torneio = comp.tipo === "eliminatorias-euro" ? "da Eurocopa" : "da Copa do Mundo";
      deixarSelecao(estado, `${comArtigoDaSelecao("O", minha, estado)} ficou fora ${torneio} e a federação decidiu trocar de técnico.`);
    }
    return;
  }
  if (comp.tipo === "repescagem-mundial") { if (comp.classificados?.includes(minha)) subir(3); return; }
  if (comp.campeao === minha) { subir(comp.tipo === "copa-do-mundo" ? 12 : comp.tipo === "liga-das-nacoes" ? 4 : 6); return; }
  if (comp.tipo === "liga-das-nacoes") return;
  const primeiraDoMataMata = comp.tipo === "copa-do-mundo" ? "dezesseis" : comp.tipo === "eurocopa" ? "oitavas" : "quartas";
  const passou = jogosDaFase(estado, comp.id, primeiraDoMataMata).some((p) => p.mandante === minha || p.visitante === minha);
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
    const nomeDaComp = nomeDaCompeticaoDeSelecoes(undefined, id);
    // Na Europa são muitas (24 na Eurocopa, 16 na Copa): só a conta; a lista fica nas Tabelas até a virada.
    const classificados = x.classificados ?? [];
    const quem = classificados.length > 8 ? `${classificados.length} seleções classificadas` : classificados.map(nome).join(", ");
    return [`${nomeDaComp} ${id.startsWith("S-ELI-EURO") ? "de" : "da Copa de"} ${ano}: ${quem}${repescagem}`];
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
  const tinha = !!estado.selecoes;
  const novas = criarSelecoes(estado);
  if (!novas.length) return;
  const sel = estado.selecoes!;
  if (!tinha) sel.amistososAte = estado.data;
  criarCompeticoesDoAno(estado, estado.data);
  // Save com as seleções da América e sem as da Europa: se os amistosos da próxima data FIFA já estavam marcados, as
  // novas ganham os delas nessa data.
  if (tinha) {
    // Amistoso marcado antes que bate com um jogo oficial novo (as repescagens de março de 2026) sai.
    const oficiais = estado.partidas.filter((p) => ehCompeticaoDeSelecoes(p.serie) && p.serie !== AMISTOSOS && !p.jogada);
    estado.partidas = estado.partidas.filter((p) => p.serie !== AMISTOSOS || p.jogada ||
      !oficiais.some((o) => Math.abs(diasEntre(o.data, p.data)) <= 2 && [o.mandante, o.visitante].some((x) => x === p.mandante || x === p.visitante)));
    for (const { datas } of janelasDoAno(estado.temporada)) {
      if (datas[0] > estado.data && datas[1] <= (sel.amistososAte ?? "")) {
        const novos = gruposDeAmistosos(novas, `-n${estado.temporada}`).flatMap(([ids, sufixo]) => amistososDaJanela(estado, datas, ids, sufixo));
        marcar(estado, novos.filter((p) => !estado.partidas.some((x) => x.id === p.id)));
      }
    }
  }
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
