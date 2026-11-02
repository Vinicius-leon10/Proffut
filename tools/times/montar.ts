// Monta os times novos do jogo: os participantes dos 27 estaduais de 2026, os elencos da Série D e a primeira e a
// segunda divisão de 2026 dos outros 9 países da Conmebol, com a ficha de cada clube novo e os elencos de verdade.
//
//   npx tsx tools/times/montar.ts <pasta da branch dados-times> <pasta com as súmulas> [<pasta da branch dados-segundas>] [--so-participantes]
//
// A segunda pasta é a da branch dados-elencos (súmulas das Séries A a D) com as súmulas da Copa do Brasil de 2023 a
// 2025 em sumulas/CdB_<ano>_games.json.gz (o robô dos elencos já baixa as da Copa). A terceira (opcional) é a da
// branch dados-segundas, com as páginas das segundas divisões (fase "segundas" do robô); sem ela, só a primeira.
//
// Fontes (o robô .github/workflows/elencos.yml, fase "times", baixa as da Wikipédia, do Wikidata e do Transfermarkt):
//   - Wikipédia: quem joga cada campeonato (as seções dos grupos ou dos participantes), a ficha de cada clube novo
//     (nome curto, estádio, capacidade, fundação, cores) e o elenco atual dos clubes de fora;
//   - Wikidata: cidade, estádio e fama (em quantas Wikipédias o clube ou o jogador tem página); nascimento, posição e
//     pé de cada jogador;
//   - transfermarkt-datasets (CC0): posição, nascimento e valor dos jogadores da Argentina e da Colômbia;
//   - súmulas da CBF (BrazilianFootball/data, MIT): os elencos dos clubes brasileiros da Série D e dos estaduais,
//     montados pelo mesmo programa dos elencos das séries (tools/elencos/montar.ts), sem quem já está num elenco das
//     Séries A, B e C.
// A força é nossa: a faixa do clube e, dentro dela, quanto o jogador é usado (súmulas) ou valorizado e conhecido
// (Transfermarkt e Wikidata). Escreve data/brasil-2026/{clubes-estaduais,estaduais,jogadores}.json e
// data/america-do-sul-2026/{clubes,jogadores}.json, e imprime o relatório. Os 60 elencos das Séries A, B e C não mudam.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { montar as montarDasSumulas, type JogadorReal } from "../elencos/montar";
import { FONTES_CLUBES, type NomesNasFontes } from "../elencos/fontes-clubes";
import { formatarNome } from "../elencos/sumulas";
import { ano, cor, ficha, lerElenco, normalizar, numero, textoVisivel, type Pos } from "./wiki";

// ---- tipos do que o robô grava ----------------------------------------------------------------

interface ClubeNaPagina { titulo: string; qid: string }
interface PaginaDaSemente {
  titulo: string;
  secoes: string[];
  participantes: { secao: string; indice: string; ligacoes: string[]; clubes: ClubeNaPagina[] }[];
  clubes_no_texto: ClubeNaPagina[];
}
interface Semente { id: string; lang: string; pais: string; uf?: string; liga?: string; paginas: PaginaDaSemente[] }
interface ClubeWd {
  qid: string; pt?: string; es?: string; en?: string; curtos: string[]; cidades: string[]; estadios: { nome: string; capacidade?: string }[];
  cores: string[]; fundacao?: string; links?: string; ptwiki?: string; eswiki?: string; enwiki?: string; paises: string[];
}
interface ElencoRobo { qid: string; lang: string; titulo: string; secoes: string[]; qids?: Record<string, string> }
interface PessoaWd { qid: string; pt?: string; es?: string; en?: string; nascimento?: string; posicoes: string[]; paises: string[]; pe?: string; links?: string; esportiva?: string }

export interface FichaNova {
  id: string; nome: string; sigla: string; cidade: string; estado: string;
  cores: { primaria: string; secundaria: string }; estadio: { nome: string; capacidade: number };
  fundacao: number; rival: string | null; torcida: number; reputacao: number; forcaElenco: { min: number; max: number };
  caixaInicial: number; pais?: string;
  /** Segunda divisão do país ("AR2"); falta na primeira. */
  liga?: string;
}

const lerGz = (arquivo: string) => JSON.parse(gunzipSync(readFileSync(arquivo)).toString("utf8"));
const lerJson = (arquivo: string) => JSON.parse(readFileSync(arquivo, "utf8"));

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Percentil de cada valor na lista (0 o menor, 1 o maior). */
function percentis(valores: number[]): number[] {
  const ordenados = [...valores].sort((a, b) => a - b);
  return valores.map((v) => (ordenados.length <= 1 ? 1 : ordenados.lastIndexOf(v) / (ordenados.length - 1)));
}

// ---- países e estados ---------------------------------------------------------------------------

/** Item do Wikidata de cada país → código do jogo. */
const PAIS_DO_ITEM: Record<string, string> = {
  Q155: "BR", Q414: "AR", Q750: "BO", Q298: "CL", Q739: "CO", Q736: "EC", Q733: "PY", Q419: "PE", Q77: "UY", Q717: "VE",
};

/** Nacionalidade (código de 3 letras do Wikidata ou da FIFA, ou o nome do país) → código do jogo. */
const NACIONALIDADE: Record<string, string> = {
  bra: "BRA", brasil: "BRA", brazil: "BRA", arg: "ARG", argentina: "ARG", ury: "URU", uru: "URU", uruguay: "URU", uruguai: "URU",
  col: "COL", colombia: "COL", pry: "PAR", par: "PAR", paraguay: "PAR", paraguai: "PAR", chl: "CHI", chi: "CHI", chile: "CHI",
  ecu: "EQU", equ: "EQU", ecuador: "EQU", equador: "EQU", ven: "VEN", venezuela: "VEN", per: "PER", peru: "PER",
  bol: "BOL", bolivia: "BOL", prt: "POR", por: "POR", portugal: "POR", esp: "ESP", spain: "ESP", espana: "ESP", ita: "ITA",
  italia: "ITA", italy: "ITA", fra: "FRA", francia: "FRA", france: "FRA", deu: "ALE", ger: "ALE", alemania: "ALE",
  usa: "EUA", "estados unidos": "EUA", mex: "MEX", mexico: "MEX", crc: "CRC", cri: "CRC", "costa rica": "CRC", pan: "PAN",
  panama: "PAN", hon: "HON", hnd: "HON", honduras: "HON", hai: "HAI", hti: "HAI", haiti: "HAI", jpn: "JAP", japon: "JAP",
  ago: "ANG", ang: "ANG", angola: "ANG", nga: "NGA", nigeria: "NGA", gha: "GAN", ghana: "GAN", cmr: "CMR", camerun: "CMR",
  civ: "CIV", sen: "SEN", senegal: "SEN", mar: "MAR", marruecos: "MAR", cpv: "CPV", nld: "HOL", ned: "HOL", bel: "BEL",
};
const nacionalidade = (texto?: string) => (texto ? NACIONALIDADE[normalizar(texto)] : undefined);
const NACIONALIDADE_DO_PAIS: Record<string, string> = { AR: "ARG", BO: "BOL", CL: "CHI", CO: "COL", EC: "EQU", PY: "PAR", PE: "PER", UY: "URU", VE: "VEN" };

/**
 * Peso de cada país (faixa de força, reputação, torcida e caixa do clube mais famoso e do menos famoso). A Série A
 * do jogo vai até 70–90 de força; a Argentina fica logo abaixo, Bolívia e Venezuela perto da Série B.
 */
const PESO_PAIS: Record<string, { topo: [number, number]; base: [number, number]; reputacao: [number, number]; torcida: [number, number]; caixa: [number, number] }> = {
  AR: { topo: [66, 86], base: [50, 72], reputacao: [60, 92], torcida: [8, 90], caixa: [3_000_000, 40_000_000] },
  UY: { topo: [60, 80], base: [44, 66], reputacao: [52, 84], torcida: [3, 70], caixa: [1_000_000, 15_000_000] },
  CO: { topo: [62, 80], base: [46, 68], reputacao: [55, 84], torcida: [5, 70], caixa: [1_500_000, 18_000_000] },
  EC: { topo: [60, 78], base: [44, 64], reputacao: [52, 82], torcida: [4, 65], caixa: [1_000_000, 15_000_000] },
  PY: { topo: [60, 78], base: [44, 64], reputacao: [52, 82], torcida: [3, 65], caixa: [1_000_000, 14_000_000] },
  CL: { topo: [60, 78], base: [44, 64], reputacao: [52, 82], torcida: [3, 70], caixa: [1_000_000, 15_000_000] },
  PE: { topo: [56, 76], base: [42, 62], reputacao: [50, 80], torcida: [3, 65], caixa: [800_000, 12_000_000] },
  BO: { topo: [52, 72], base: [38, 58], reputacao: [46, 76], torcida: [2, 55], caixa: [600_000, 8_000_000] },
  VE: { topo: [52, 72], base: [38, 58], reputacao: [46, 74], torcida: [2, 45], caixa: [600_000, 6_000_000] },
};

type Peso = (typeof PESO_PAIS)[string];
/**
 * Peso da segunda divisão de cada país: o melhor clube dela fica um pouco abaixo do mais fraco da primeira (a da
 * Argentina perto das Séries B e C do jogo; as da Bolívia e da Venezuela perto da Série D).
 */
const PESO_SEGUNDA: Record<string, Peso> = Object.fromEntries(Object.entries(PESO_PAIS).map(([pais, p]) => [pais, {
  topo: [p.base[0] - 4, p.base[1] - 4],
  base: [p.base[0] - 14, p.base[1] - 12],
  reputacao: [p.reputacao[0] - 12, p.reputacao[0] + 2],
  torcida: [1, p.torcida[0] + 10],
  caixa: [Math.max(100_000, p.caixa[0] * 0.15), p.caixa[0]],
} satisfies Peso]));

// ---- nomes -------------------------------------------------------------------------------------

/** Palavras que não distinguem um clube de outro ("Esporte Clube", "Club Atlético"...). */
const GENERICAS = new Set(("esporte clube club futebol football foot ball sport sports sociedade esportiva associacao atletica atletico " +
  "desportiva desportos desportivo recreativo recreativa cultural social s a f saf fc ec sc ac ltda e de do da dos das del la el los las y " +
  "deportivo deportiva deportes asociacion corporacion sociedad anonima sad cd ca cs csyd fbc futbol agremiacao gremio beneficente " +
  "atletica sportiva sportivo clube").split(" "));

/** As palavras que distinguem um clube (sem as genéricas nem as siglas de 2 letras, como "GV" e "RJ"). */
export function palavrasDoClube(nome: string): string[] {
  return normalizar(nome.replace(/\(.*?\)/g, " ")).split(" ").filter((p) => p.length > 2 && !GENERICAS.has(p));
}

/** Quanto dois nomes batem: as palavras em comum sobre as do nome mais comprido. */
function semelhanca(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  const comuns = [...sa].filter((p) => sb.has(p)).length;
  return comuns / Math.max(sa.size, sb.size);
}

export function slug(texto: string): string {
  return normalizar(texto).replace(/ /g, "-");
}

/** Sigla de 3 letras: as iniciais das palavras que contam, ou as 3 primeiras letras. */
function sigla(nome: string): string {
  const palavras = palavrasDoClube(nome).filter((p) => !/^\d+$/.test(p));
  const iniciais = palavras.map((p) => p[0]).join("");
  return (palavras.length >= 3 ? iniciais.slice(0, 3) : (palavras[0] ?? normalizar(nome)).replace(/ /g, "").slice(0, 3)).toUpperCase();
}

/** Palavras do começo e do fim do nome oficial que caem no nome curto ("Club Atlético", "Futebol Clube"...). */
const ENFEITES = new Set(("club clube clubes associacao asociacion atletica atletico agremiacao sociedade sociedad esporte esportiva " +
  "sportiva sportivo sport sports futebol futbol football foot ball fc f c ec sc ac cd ca csd sad saf ltda corporacion corporacao " +
  "deportivo deportiva deportes desportiva desportos social cultural recreativo recreativa y e de do da del la el los").split(" "));

/** Nome curto a partir do nome oficial: tira os enfeites do começo e do fim ("Club Atlético Lanús" → "Lanús"). */
function nomeCurto(oficial: string): string {
  const palavras = oficial.replace(/\(.*?\)/g, " ").replace(/[.,]/g, " ").split(/\s+/).filter(Boolean);
  while (palavras.length > 1 && ENFEITES.has(normalizar(palavras[0]))) palavras.shift();
  while (palavras.length > 1 && ENFEITES.has(normalizar(palavras[palavras.length - 1]))) palavras.pop();
  return palavras.join(" ");
}

// ---- leitura ------------------------------------------------------------------------------------

const [dadosTimes, dadosSumulas, dadosSegundas] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!dadosTimes || !dadosSumulas) throw new Error("Uso: npx tsx tools/times/montar.ts <pasta dados-times> <pasta com as súmulas> [<pasta dados-segundas>]");
const sementes: Semente[] = lerGz(join(dadosTimes, "sementes.json.gz"));
const clubesWd: Record<string, ClubeWd> = lerGz(join(dadosTimes, "clubes.json.gz"));
const paginas: Record<string, string> = lerGz(join(dadosTimes, "paginas.json.gz"));
const elencosRobo: Record<string, ElencoRobo> = lerGz(join(dadosTimes, "elencos.json.gz"));
const pessoasWd: Record<string, PessoaWd> = lerGz(join(dadosTimes, "jogadores.json.gz"));
// Segundas divisões (nov/2026): os dados da branch dados-segundas entram só onde faltam (o que já veio da dados-times,
// baixado antes, fica como está: a primeira divisão e os estaduais não mudam).
if (dadosSegundas) {
  sementes.push(...(lerGz(join(dadosSegundas, "sementes.json.gz")) as Semente[]));
  const juntar = <T>(alvo: Record<string, T>, arquivo: string) => {
    for (const [k, v] of Object.entries(lerGz(join(dadosSegundas, arquivo)) as Record<string, T>)) if (!(k in alvo)) alvo[k] = v;
  };
  juntar(clubesWd, "clubes.json.gz");
  juntar(paginas, "paginas.json.gz");
  juntar(elencosRobo, "elencos.json.gz");
  juntar(pessoasWd, "jogadores.json.gz");
}
const relatorio: string[] = [];

/** Nomes das súmulas que as palavras não ligam ao clube (apelidos, patrocínio no nome, sigla). */
const CBF_MANUAL: Record<string, string[]> = {
  cianorte: ["Leao do Vale - Cianorte / PR", "Leão do Vale - Cianorte / PR"],
  "sao-joseense": ["Sãojoseense / PR"],
  "porto-velho": ["Gazin Porto Velho / RO", "Porto Velho / RO"],
  "operario-varzea-grandense": ["Ceov Operário / MT", "Operário Ceov / MT", "Operário Várzea-grandense / MT"],
  gas: ["Sampaio / RR"],
  "atletico-de-alagoinhas": ["Atlético / BA"],
  "atletico-ce": ["Atlético / CE"],
};

/** Os clubes das súmulas da CBF ("Água Santa / SP"), com quantos jogos cada um tem de 2023 a 2025. */
const NOMES_NAS_SUMULAS = new Map<string, number>();
/** O estádio dos jogos em casa de cada clube das súmulas ("Coaracy da Mata Fonseca / Arapiraca"), com quantos jogos. */
const ESTADIOS_NAS_SUMULAS = new Map<string, Map<string, number>>();
for (const comp of ["Serie_A", "Serie_B", "Serie_C", "Serie_D", "CdB"]) {
  for (const a of [2023, 2024, 2025]) {
    try {
      const jogos = lerGz(join(dadosSumulas, "sumulas", `${comp}_${a}_games.json.gz`)) as Record<string, { Home?: string; Away?: string; Stadium?: string } | null>;
      for (const j of Object.values(jogos)) {
        for (const n of [j?.Home, j?.Away]) if (n) NOMES_NAS_SUMULAS.set(n, (NOMES_NAS_SUMULAS.get(n) ?? 0) + 1);
        if (j?.Home && j.Stadium) {
          const lista = ESTADIOS_NAS_SUMULAS.get(j.Home) ?? new Map<string, number>();
          lista.set(j.Stadium, (lista.get(j.Stadium) ?? 0) + 1);
          ESTADIOS_NAS_SUMULAS.set(j.Home, lista);
        }
      }
    } catch { /* sem o arquivo */ }
  }
}

const fichasAC = lerJson("data/brasil-2026/clubes.json").clubes as (FichaNova & { serie: string })[];
const fichasD = lerJson("data/brasil-2026/serie-d-reserva.json").clubes as FichaNova[];
const fichasDoJogo = [...fichasAC, ...fichasD];
const idsUsados = new Set(fichasDoJogo.map((f) => f.id));
const nomesUsados = new Set(fichasDoJogo.map((f) => normalizar(f.nome)));

// ---- páginas dos clubes -------------------------------------------------------------------------

function paginaDoClube(lang: "pt" | "es" | "en", wd?: ClubeWd): string | undefined {
  const titulo = wd?.[`${lang}wiki`];
  return titulo ? paginas[`${lang}:${titulo}`] : undefined;
}

// ---- quem joga cada campeonato ------------------------------------------------------------------

/** Seções dos grupos ("Grupo A", "Group B", "Serie A", "Zona Norte"...): juntas, têm exatamente quem joga. */
const SECAO_DE_GRUPO = /^(grupo|group|serie|zona|zone|chave)\s+\S{1,3}$/i;
/** Seção com a lista dos participantes. */
const SECAO_DE_PARTICIPANTES = /participantes|teams|equipos|club information|clubes|equipes/i;
/**
 * Seção de tabela ou mapa com as equipes (informações, estádios, localização). Traz só quem joga: a seção dos
 * participantes pega também os clubes citados no texto e nas subseções, como os rebaixados do ano anterior em
 * "Promovidos e rebaixados", as desistências ou quem perdeu a final da segunda divisão (nov/2026).
 */
const SECAO_DE_TABELA = /informa[çc][õo]es das equipes|est[áa]dios|localiza[çc][ãa]o|localizaci[óo]n|stadia and locations|club information|informaci[óo]n|sedes/i;

/**
 * Clubes de um campeonato, da primeira página (na ordem do robô: a de 2026, depois a de 2025...) que tem 4 ou mais:
 * os das seções dos grupos, se há; senão os da seção de participantes com mais clubes; senão os de todas as seções.
 * Cada clube vem com o título da ligação (mais confiável que o rótulo do Wikidata).
 */
function clubesDaSemente(s: Semente): { clubes: ClubeNaPagina[]; pagina: string } {
  const unicos = (lista: ClubeNaPagina[]) => [...new Map(lista.map((c) => [c.qid, c])).values()];
  for (const p of s.paginas) {
    const grupos = unicos(p.participantes.filter((l) => SECAO_DE_GRUPO.test(l.secao.trim())).flatMap((l) => l.clubes));
    const listas = p.participantes.filter((l) => SECAO_DE_PARTICIPANTES.test(l.secao)).sort((a, b) => b.clubes.length - a.clubes.length);
    const lista = unicos(listas[0]?.clubes ?? []);
    const tabelas = p.participantes.filter((l) => SECAO_DE_TABELA.test(l.secao)).sort((a, b) => b.clubes.length - a.clubes.length);
    const tabela = unicos(tabelas[0]?.clubes ?? []);
    // Os grupos valem se trazem quase todos os da lista (às vezes o robô não reconhece algum clube num grupo).
    if (grupos.length >= 4 && grupos.length >= lista.length - 1) return { clubes: grupos, pagina: `${p.titulo} (grupos)` };
    // A tabela das equipes vale se traz quase todos os da lista: o que sobra na lista são os citados no texto.
    if (tabela.length >= 4 && tabela.length >= lista.length - 2) return { clubes: tabela, pagina: `${p.titulo} (${tabelas[0].secao})` };
    if (lista.length >= 4) return { clubes: lista, pagina: `${p.titulo} (${listas[0].secao})` };
    const todas = unicos(p.participantes.flatMap((l) => l.clubes));
    if (todas.length >= 4) return { clubes: todas, pagina: p.titulo };
  }
  return { clubes: [], pagina: "" };
}

// ---- clubes que já estão no jogo -----------------------------------------------------------------

const NOMES_WD_AC = new Map<string, string>();
/** Os nomes do Wikidata dos clubes das Séries A a C, como estão escritos (para comparar as palavras). */
const NOMES_ORIGINAIS_AC: [string, string][] = [];
for (const [id, f] of Object.entries(FONTES_CLUBES)) {
  for (const n of f.wikidata ?? []) { NOMES_WD_AC.set(normalizar(n), id); NOMES_ORIGINAIS_AC.push([n, id]); }
}
const fichaDoJogo = (id: string) => fichasDoJogo.find((f) => f.id === id)!;

/** Os nomes de um clube da Wikipédia: o título da ligação, o da página, o rótulo do Wikidata e o nome curto da ficha. */
function nomesDoClube(c: ClubeNaPagina, wd?: ClubeWd): string[] {
  const texto = paginaDoClube("pt", wd);
  const abrev = texto ? textoVisivel(ficha(texto).nomeabrev ?? "") : "";
  return [c.titulo, wd?.ptwiki, wd?.pt, abrev].filter((n): n is string => !!n);
}

/**
 * O clube do jogo que é este clube da Wikipédia, se há. Séries A a C: pelo nome do Wikidata (os de FONTES_CLUBES), do
 * mesmo estado. Série D: pelas palavras do nome no mesmo estado: iguais valem; parecidas (metade ou mais), só se a
 * cidade também é a mesma. Mais de um clube possível: nenhum.
 */
function clubeDoJogo(c: ClubeNaPagina, wd: ClubeWd | undefined, uf: string | undefined): string | undefined {
  const nomes = nomesDoClube(c, wd);
  for (const n of nomes.map((x) => normalizar(x))) {
    const id = NOMES_WD_AC.get(n);
    if (id && (!uf || fichaDoJogo(id).estado === uf)) return id;
  }
  if (!uf) return undefined;
  // Séries A a C: as mesmas palavras de um dos nomes do Wikidata (sem o que vai entre parênteses), no mesmo estado e
  // na mesma cidade (o Internacional de Santa Maria não é o de Porto Alegre).
  const cidadeWd = normalizar(wd?.cidades[0] ?? "");
  const dasSeries = new Set<string>();
  for (const [nome, id] of NOMES_ORIGINAIS_AC) {
    const f = fichaDoJogo(id);
    if (f.estado !== uf || (cidadeWd && normalizar(f.cidade) !== cidadeWd)) continue;
    const doJogo = palavrasDoClube(nome);
    if (nomes.some((n) => semelhanca(palavrasDoClube(n), doJogo) >= 1)) dasSeries.add(id);
  }
  if (dasSeries.size === 1) return [...dasSeries][0];
  const cidade = normalizar(wd?.cidades[0] ?? "");
  const notas: { id: string; nota: number }[] = [];
  for (const f of fichasD) {
    if (f.estado !== uf) continue;
    const doJogo = palavrasDoClube(f.nome.replace(/-[A-Z]{2}$/, ""));
    const igual = Math.max(...nomes.map((n) => semelhanca(palavrasDoClube(n), doJogo)));
    const mesmaCidade = !!cidade && normalizar(f.cidade) === cidade;
    const nota = igual >= 1 ? 1 + (mesmaCidade ? 0.3 : 0) : igual >= 0.5 && mesmaCidade ? igual + 0.3 : 0;
    if (nota >= 0.8) notas.push({ id: f.id, nota });
  }
  notas.sort((a, b) => b.nota - a.nota);
  return notas[0] && notas[1]?.nota !== notas[0].nota ? notas[0].id : undefined;
}

// ---- fichas dos clubes novos ----------------------------------------------------------------------

/** Cor que contrasta com a primária (para a secundária, quando a página não diz). */
function contraste(primaria: string): string {
  const v = parseInt(primaria.slice(1), 16);
  const luz = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return luz > 0.6 ? "#212121" : "#FFFFFF";
}

const PALETA = ["#C62828", "#1565C0", "#2E7D32", "#212121", "#F9A825", "#6A1B9A", "#EF6C00", "#00838F", "#7B1E1E", "#0D1B4C"];

/** Cores do clube: a camisa e o calção da ficha da página, as cores do Wikidata ou uma da paleta. */
function coresDoClube(chave: string, campos: Record<string, string>[], wd?: ClubeWd): { primaria: string; secundaria: string } {
  for (const f of campos) {
    const primaria = cor(f.body1 ?? f.corpo1 ?? f.cuerpo1 ?? f.camisa1);
    if (!primaria) continue;
    const segunda = cor(f.shorts1 ?? f.calcoes1 ?? f.calcao1 ?? f.pantalon1 ?? f.body2 ?? f.corpo2);
    return { primaria, secundaria: segunda && segunda !== primaria ? segunda : contraste(primaria) };
  }
  const doWd = (wd?.cores ?? []).map((c) => `#${c.toUpperCase()}`);
  if (doWd.length) {
    // Branco por último: é quase sempre o detalhe.
    const ordem = [...doWd].sort((a, b) => Number(a === "#FFFFFF") - Number(b === "#FFFFFF"));
    return { primaria: ordem[0], secundaria: ordem[1] && ordem[1] !== ordem[0] ? ordem[1] : contraste(ordem[0]) };
  }
  const primaria = PALETA[Math.floor(hash(chave) * PALETA.length)];
  return { primaria, secundaria: contraste(primaria) };
}

/** Um id e um nome que ainda não existem no jogo ("america-se", "América-SE"; "nacional-uy", "Nacional"...). */
function idENome(nome: string, sufixo: string, nomeComSufixo: boolean): { id: string; nome: string } {
  let id = slug(nome);
  if (idsUsados.has(id)) id = `${id}-${sufixo.toLowerCase()}`;
  for (let i = 2; idsUsados.has(id); i++) id = `${slug(nome)}-${sufixo.toLowerCase()}-${i}`;
  idsUsados.add(id);
  let final = nome;
  if (nomeComSufixo && nomesUsados.has(normalizar(nome))) final = `${nome}-${sufixo}`;
  nomesUsados.add(normalizar(final));
  return { id, nome: final };
}

const anoDo = (texto?: string) => (texto ? Number(texto.slice(0, 4)) || undefined : undefined);

/** Ficha de um clube brasileiro só do estadual. `fama` (0 a 1) é a posição dele entre esses clubes. */
function fichaBrasileira(c: ClubeNaPagina, wd: ClubeWd | undefined, uf: string, fama: number): FichaNova {
  const texto = paginaDoClube("pt", wd) ?? "";
  const f = ficha(texto);
  const abrev = textoVisivel(f.nomeabrev ?? "").replace(/\(.*?\)/g, "").trim();
  const bruto = abrev && abrev.length <= 22 ? abrev : nomeCurto(c.titulo.replace(/\(.*?\)/g, "").trim());
  // Sem "FC", "EC", "SC" no fim ("Cariri FC" → "Cariri").
  const nomeBase = bruto.replace(/\s+(F\.?\s?C\.?|E\.?\s?C\.?|S\.?\s?C\.?|A\.?\s?C\.?)$/, "").trim() || bruto;
  const { id, nome } = idENome(nomeBase, uf, true);
  const estadioTexto = textoVisivel(f.estadio ?? "");
  const cidade = wd?.cidades[0] ?? (textoVisivel(f.local ?? "").split(",")[0] || uf);
  return {
    id, nome, sigla: sigla(nomeBase), cidade, estado: uf,
    cores: coresDoClube(id, [f], wd),
    estadio: {
      nome: estadioTexto && estadioTexto.length < 50 ? estadioTexto : wd?.estadios[0]?.nome ?? `Estádio de ${cidade}`,
      capacidade: limitar(numero(f.capacidade) ?? (Number(wd?.estadios[0]?.capacidade) || 5_000), 1_000, 60_000),
    },
    fundacao: ano(f.fundadoem) ?? anoDo(wd?.fundacao) ?? 1950,
    rival: null,
    torcida: Math.round(1 + fama * 5),
    reputacao: Math.round(28 + fama * 12),
    forcaElenco: { min: Math.round(22 + fama * 6), max: Math.round(40 + fama * 6) },
    caixaInicial: Math.round((200_000 + fama * 400_000) / 10_000) * 10_000,
  };
}

/** Ficha de um clube de fora. `fama` (0 a 1) é a posição dele entre os clubes do país. `reservar`: guarda o id e o nome. */
function fichaDeFora(c: ClubeNaPagina, wd: ClubeWd | undefined, pais: string, fama: number, reservar = true, segunda = false): FichaNova {
  const en = ficha(paginaDoClube("en", wd) ?? "");
  const es = ficha(paginaDoClube("es", wd) ?? "");
  const comum = textoVisivel(en.clubname ?? "");
  const curto = textoVisivel(en.short_name ?? "");
  // Na segunda divisão, o título da ligação vem antes do rótulo do Wikidata, que às vezes ainda tem o nome antigo
  // ("Vargas Torres" para o Santo Domingo).
  const doTitulo = nomeCurto(c.titulo);
  const oficial = segunda && !ENFEITES.has(normalizar(doTitulo)) ? doTitulo : nomeCurto(wd?.es ?? c.titulo);
  const escolhido = comum && comum.length <= 24 && !/^(club|asociaci)/i.test(comum) ? comum : curto && curto.length > 3 ? curto : oficial;
  // Sem "FC", "SC", "F.C." no fim e sem "FBC" no começo ("Envigado FC" → "Envigado").
  const limpo = escolhido.replace(/\s+(F\.?\s?C\.?|S\.?\s?C\.?|Association)$/i, "").replace(/^FBC\s+/i, "").trim();
  const nomeBase = (segunda ? MANUAL_NOMES_SEGUNDA[limpo] : undefined) ?? MANUAL_NOMES[limpo] ?? limpo;
  const { id, nome } = reservar ? idENome(nomeBase, pais, false) : { id: slug(nomeBase), nome: nomeBase };
  const p = (segunda ? PESO_SEGUNDA : PESO_PAIS)[pais];
  const t = fama ** 1.5;
  const entre = ([a, b]: [number, number]) => a + (b - a) * t;
  const cidade = MANUAL_CIDADES[id] ?? wd?.cidades[0] ?? textoVisivel(en.ground ?? "").split(",")[1]?.trim() ?? PAISES_NOME[pais];
  const estadio = wd?.estadios[0];
  return {
    id, nome, sigla: sigla(nomeBase), cidade, estado: pais, pais,
    cores: coresDoClube(id, [en, es], wd),
    estadio: {
      nome: estadio?.nome ?? (textoVisivel(en.ground ?? "") || `Estádio de ${cidade}`),
      capacidade: limitar(Number(estadio?.capacidade) || numero(en.capacity) || 15_000, 2_000, 85_000),
    },
    fundacao: anoDo(wd?.fundacao) ?? ano(en.founded) ?? 1950,
    rival: null,
    torcida: Math.round(entre(p.torcida)),
    reputacao: Math.round(entre(p.reputacao)),
    forcaElenco: { min: Math.round(p.base[0] + (p.topo[0] - p.base[0]) * t), max: Math.round(p.base[1] + (p.topo[1] - p.base[1]) * t) },
    caixaInicial: Math.round(entre(p.caixa) / 100_000) * 100_000,
    ...(segunda ? { liga: `${pais}2` } : {}),
  };
}

const PAISES_NOME: Record<string, string> = { AR: "Argentina", BO: "Bolívia", CL: "Chile", CO: "Colômbia", EC: "Equador", PY: "Paraguai", PE: "Peru", UY: "Uruguai", VE: "Venezuela" };

/** Nomes que as fontes escrevem de um jeito que não é o de todo mundo (pelo nome que sairia). */
const MANUAL_NOMES: Record<string, string> = {
  "FC Barcelona": "Barcelona SC", Barcelona: "Barcelona SC", "Estudiantes (LP)": "Estudiantes", "AA Estudiantes": "Estudiantes de Río Cuarto",
  "Gimnasia y Esgrima": "Gimnasia de Mendoza", "Gimnasia y Esgrima La Plata": "Gimnasia", "GV San José": "San José", "The Strongest": "The Strongest",
  "Deportivo Riestra": "Riestra", "CDT Real Oruro": "Real Oruro",
};

/**
 * Nomes da segunda divisão: o nome curto de todo mundo, no lugar do nome oficial comprido ou de uma abreviação; e um
 * nome diferente para quem tem o nome de um clube conhecido do jogo (o Estudiantes de Buenos Aires e o de La Plata, o
 * Flamengo de Sucre, o Santos de Nasca).
 */
const MANUAL_NOMES_SEGUNDA: Record<string, string> = {
  "10 de Noviembre Wilstermann Cooperativas": "Wilstermann Cooperativas", "Racing (C)": "Racing de Córdoba", "Mitre (SdE)": "Mitre",
  "Gimnasia y Esgrima de Jujuy": "Gimnasia de Jujuy", Estudiantes: "Estudiantes de Buenos Aires", Flamengo: "Flamengo de Sucre",
  Santos: "Santos de Nasca", "Independiente F.B.C.": "Independiente de Campo Grande", "Dr Benjamín Aceval": "Benjamín Aceval",
  Pirata: "Molinos El Pirata", "FC San Marcos": "San Marcos de Huari", "Universidad de San Martín de Porres": "Universidad San Martín",
  "Universidad César Vallejo": "César Vallejo", Patriotas: "Patriotas Boyacá", "Atlético": "Atlético FC",
};

/** Cidade dos clubes que as fontes não dizem (sem ela, ficava o nome do país). */
const MANUAL_CIDADES: Record<string, string> = {
  "real-oruro": "Oruro", "san-jose": "Oruro", anzoategui: "Puerto La Cruz", "alianza-valledupar": "Valledupar", "inter-bogota": "Bogotá",
  leones: "Ibarra", libertad: "Loja", "juan-pablo-ii-college": "Chongoyape", "deportivo-moquegua": "Moquegua", cajamarca: "Cajamarca",
  // Segunda divisão (a ficha do clube na Wikipédia diz o estádio; a cidade dele vem daqui).
  "central-norte": "Salta", "itagui-leones": "Itagüí", "deportivo-fatic": "El Alto", "garcia-agreda": "Tarija", "universitario-de-pando": "Cobija",
  "universitario-del-beni": "Trinidad", "empresa-minera-huanuni": "Huanuni", "independiente-unificada": "Potosí", "atletico-rojiblanco": "Guayaquil",
  "cuenca-juniors": "Cuenca", "independiente-juniors": "Quito", "santo-domingo": "Santo Domingo", "12-de-junio": "Villa Hayes",
  "benjamin-aceval": "Benjamín Aceval", "fernando-de-la-mora": "Fernando de la Mora", "general-caballero-jlm": "Juan León Mallorquín",
  "sportivo-carapegua": "Carapeguá", encarnacion: "Encarnación", paraguari: "Paraguarí", comerciantes: "Iquitos", "academia-cantolao": "Callao",
  ada: "Jaén", "bentin-tacna-heroica": "Tacna", "estudiantil-cni": "Iquitos", "san-marcos-de-huari": "Huari", "real-frontera": "San Antonio del Táchira",
  urena: "Ureña",
};

// ---- participantes: estaduais e ligas -------------------------------------------------------------

const porSemente = new Map(sementes.map((s) => [s.id, s]));
const ufs = sementes.filter((s) => s.uf).map((s) => s.uf!);
const qidDoJogo = new Map<string, string>();
/** Clubes novos que só existem nas súmulas (estaduais sem página na Wikipédia). */
const novosDasSumulas: FichaNova[] = [];

/** Ficha de um clube que só aparece nas súmulas: o nome delas e o resto padrão de clube pequeno. */
/** Acentos que as súmulas às vezes perdem. */
const ACENTOS: Record<string, string> = { sao: "São", venecia: "Venécia", joao: "João", uniao: "União" };

function fichaDaSumula(nomeSumula: string, uf: string, nomeCompleto: string): FichaNova {
  const comAcento = formatarNome(nomeSumula).split(" ").map((p) => ACENTOS[normalizar(p)] && normalizar(p) === p.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") && !/[^\x00-\x7F]/.test(p) ? ACENTOS[normalizar(p)] : p).join(" ");
  const { id, nome } = idENome(comAcento, uf, true);
  const primaria = PALETA[Math.floor(hash(id) * PALETA.length)];
  // Cidade e estádio: os dos jogos em casa nas súmulas ("Estádio / Cidade").
  const [estadio, cidade] = ([...(ESTADIOS_NAS_SUMULAS.get(nomeCompleto) ?? new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "").split(" / ").map((x) => formatarNome(x.trim()));
  return {
    id, nome, sigla: sigla(nome), cidade: cidade || CAPITAIS[uf] || uf, estado: uf,
    cores: { primaria, secundaria: contraste(primaria) },
    estadio: { nome: estadio || `Estádio de ${cidade || CAPITAIS[uf] || uf}`, capacidade: 5_000 },
    fundacao: 1950, rival: null, torcida: 1, reputacao: 30, forcaElenco: { min: 22, max: 40 }, caixaInicial: 200_000,
  };
}

const CAPITAIS: Record<string, string> = {
  AC: "Rio Branco", AL: "Maceió", AP: "Macapá", AM: "Manaus", BA: "Salvador", CE: "Fortaleza", DF: "Brasília", ES: "Vitória",
  GO: "Goiânia", MA: "São Luís", MT: "Cuiabá", MS: "Campo Grande", MG: "Belo Horizonte", PA: "Belém", PB: "João Pessoa",
  PR: "Curitiba", PE: "Recife", PI: "Teresina", RJ: "Rio de Janeiro", RN: "Natal", RS: "Porto Alegre", RO: "Porto Velho",
  RR: "Boa Vista", SC: "Florianópolis", SP: "São Paulo", SE: "Aracaju", TO: "Palmas",
};
const novosBrasileiros: { c: ClubeNaPagina; wd?: ClubeWd; uf: string }[] = [];
const estaduais: Record<string, string[]> = {};

for (const uf of ufs) {
  const s = porSemente.get(`est-${uf}`)!;
  const { clubes, pagina } = clubesDaSemente(s);
  const ids: string[] = [];
  for (const c of clubes) {
    const wd = clubesWd[c.qid];
    const id = clubeDoJogo(c, wd, uf);
    if (id) { if (!ids.includes(id)) ids.push(id); qidDoJogo.set(c.qid, id); continue; }
    novosBrasileiros.push({ c, wd, uf });
    ids.push(`novo:${c.qid}`);
  }
  // Sem página com os participantes: os clubes do estado nas Séries A a D e os que aparecem nas súmulas da CBF.
  if (ids.length < 4) {
    for (const f of fichasDoJogo.filter((x) => x.estado === uf).sort((a, b) => b.reputacao - a.reputacao)) if (!ids.includes(f.id)) ids.push(f.id);
    const doEstado = [...NOMES_NAS_SUMULAS].filter(([n]) => n.endsWith(` / ${uf}`)).sort((a, b) => b[1] - a[1]);
    const conhecidos = new Set(Object.values(FONTES_CLUBES).flatMap((f) => f.cbf).map(normalizar));
    const manuais = new Set(Object.values(CBF_MANUAL).flat().map(normalizar));
    for (const [n] of doEstado) {
      if (ids.length >= 10) break;
      const nome = nomeCurto(n.split(" / ")[0].replace(/\s*-\s*$/, "").trim());
      const palavras = palavrasDoClube(nome);
      if (conhecidos.has(normalizar(n)) || manuais.has(normalizar(n)) || !palavras.length) continue;
      // Já é um clube do jogo (ou um novo deste estado)? Um nome dentro do outro ("Mutum" e "Nova Mutum") é o mesmo.
      const dentro = (a: string[], b: string[]) => a.length > 0 && b.length > 0 && (a.every((x) => b.includes(x)) || b.every((x) => a.includes(x)));
      const jaTem = [...fichasDoJogo.filter((x) => x.estado === uf), ...novosDasSumulas.filter((x) => x.estado === uf)]
        .some((x) => dentro(palavras, palavrasDoClube(x.nome.replace(/-[A-Z]{2}$/, ""))));
      if (jaTem) continue;
      const f = fichaDaSumula(nome, uf, n);
      novosDasSumulas.push(f);
      ids.push(f.id);
    }
  }
  estaduais[uf] = ids;
  relatorio.push(`Estadual ${uf}: ${ids.length} clubes (${pagina || "sem página: clubes do estado no jogo e nas súmulas"}).`);
}

// Série D de 2026: a página × a lista do jogo (serie-d-reserva.json). Só relatório, para conferir à mão.
{
  const p = porSemente.get("serie-d")?.paginas[0];
  if (p) {
    const daPagina = [...new Map(p.participantes.filter((l) => SECAO_DE_GRUPO.test(l.secao.trim())).flatMap((l) => l.clubes).map((c) => [c.qid, c])).values()];
    const naD = new Set<string>();
    const semPar: string[] = [];
    const nasSeries: string[] = [];
    for (const c of daPagina) {
      const ids = new Set(ufs.map((uf) => clubeDoJogo(c, clubesWd[c.qid], uf)).filter((x): x is string => !!x));
      const id = ids.size === 1 ? [...ids][0] : undefined;
      if (!id) semPar.push(c.titulo);
      else if (fichasD.some((f) => f.id === id)) naD.add(id);
      else nasSeries.push(`${c.titulo} (${id})`);
    }
    const fora = fichasD.filter((f) => !naD.has(f.id)).map((f) => `${f.nome}/${f.estado}`);
    relatorio.push(`Série D 2026: ${daPagina.length} na página, ${naD.size} na D do jogo. Da página, sem par no jogo: ${semPar.join("; ") || "nenhum"}. ` +
      `Da página, nas Séries A a C do jogo: ${nasSeries.join("; ") || "nenhum"}. Da D do jogo, fora da página: ${fora.join(", ") || "nenhum"}.`);
  }
}

if (process.argv.includes("--so-participantes")) {
  for (const uf of ufs) {
    console.log(`${uf}: ${estaduais[uf].map((id) => (id.startsWith("novo:") ? `+${clubesWd[id.slice(5)]?.pt ?? id}` : id)).join(", ")}`);
  }
}

// Clubes novos do Brasil: a ficha (a fama é a ordem pelo número de Wikipédias com a página do clube).
const famaBr = percentis(novosBrasileiros.map(({ wd }) => Number(wd?.links ?? 0)));
const fichasEstaduais: FichaNova[] = [];
novosBrasileiros.forEach(({ c, wd, uf }, i) => {
  const f = fichaBrasileira(c, wd, uf, famaBr[i]);
  fichasEstaduais.push(f);
  estaduais[uf] = estaduais[uf].map((id) => (id === `novo:${c.qid}` ? f.id : id));
});
fichasEstaduais.push(...novosDasSumulas);

// Ligas de fora: os clubes que aparecem nas duas páginas (inglês e espanhol); com só uma, os dela.
const LIGAS = ["AR", "BO", "CL", "CO", "EC", "PY", "PE", "UY", "VE"];
/** Quantos clubes cada liga tem em 2026 (para escolher entre as listas das páginas: grupos, participantes...). */
const TAMANHO_DA_LIGA: Record<string, number> = { AR: 30, BO: 16, CL: 16, CO: 20, EC: 16, PY: 12, PE: 18, UY: 16, VE: 14 };
/** Clubes que aparecem duas vezes com nomes diferentes (o mesmo clube, com o nome antigo). */
const NOME_ANTIGO = /la equidad/i;
/** Os grandes de cada país ficam no topo da fama, qualquer que seja o número de páginas ou o valor do elenco. */
const GRANDES = new Set(["Boca Juniors", "River Plate", "Peñarol", "Nacional", "Colo-Colo", "Universidad de Chile", "Universidad Católica",
  "Atlético Nacional", "Millonarios", "América de Cali", "Junior", "LDU Quito", "Barcelona SC", "Emelec", "Independiente del Valle",
  "Olimpia", "Cerro Porteño", "Libertad", "Universitario", "Alianza Lima", "Sporting Cristal", "Bolívar", "The Strongest", "Caracas",
  "Deportivo Táchira"]);
const fichasExterior: FichaNova[] = [];
const ligas: Record<string, { c: ClubeNaPagina; wd?: ClubeWd }[]> = {};
/**
 * Os clubes de uma liga de fora pelas páginas de 2026 em inglês e em espanhol (sementes `<prefixo>-<país>-<língua>`):
 * a lista com o tamanho mais perto de `alvo`. `fora`: quem não pode entrar (na segunda divisão, os da primeira).
 */
function listaDaLiga(pais: string, prefixo: string, alvo: number, fora: (c: ClubeNaPagina) => boolean = () => false) {
  const qidDoPais = Object.keys(PAIS_DO_ITEM).find((q) => PAIS_DO_ITEM[q] === pais)!;
  // Clube de outro país sai; sem país no Wikidata (Real Oruro, Anzoátegui...) fica: está na página da liga.
  const doPais = (lista: ClubeNaPagina[]) => lista.filter((c) => {
    const paises = clubesWd[c.qid]?.paises ?? [];
    return (!paises.length || paises.includes(qidDoPais)) && !NOME_ANTIGO.test(`${clubesWd[c.qid]?.es} ${clubesWd[c.qid]?.en} ${c.titulo}`) && !fora(c);
  });
  // As listas possíveis: de cada página, a dos grupos, as dos participantes e as das tabelas; e a dos clubes que estão
  // nas duas páginas. As das tabelas (marcadas) ganham no empate: a dos participantes pega também os citados no texto.
  const candidatas: ClubeNaPagina[][] = [];
  const deTabela = new Set<ClubeNaPagina[]>();
  const porLingua: ClubeNaPagina[][] = [];
  for (const lang of ["en", "es"]) {
    const s = porSemente.get(`${prefixo}-${pais}-${lang}`);
    if (!s) continue;
    for (const p of s.paginas.slice(0, 1)) {
      const unicos = (l: ClubeNaPagina[]) => [...new Map(l.map((c) => [c.qid, c])).values()];
      const grupos = doPais(unicos(p.participantes.filter((l) => SECAO_DE_GRUPO.test(l.secao.trim())).flatMap((l) => l.clubes)));
      const listas = p.participantes.filter((l) => SECAO_DE_PARTICIPANTES.test(l.secao)).map((l) => doPais(unicos(l.clubes)));
      const tabelas = p.participantes.filter((l) => SECAO_DE_TABELA.test(l.secao)).map((l) => doPais(unicos(l.clubes)));
      for (const t of tabelas) deTabela.add(t);
      candidatas.push(grupos, ...listas, ...tabelas);
      porLingua.push(doPais(clubesDaSemente(s).clubes));
    }
  }
  const [en = [], es = []] = porLingua;
  const emEs = new Set(es.map((c) => c.qid));
  candidatas.push(en.filter((c) => emEs.has(c.qid)));
  const lista = candidatas.filter((l) => l.length >= 8)
    .sort((a, b) => Math.abs(a.length - alvo) - Math.abs(b.length - alvo) || Number(deTabela.has(b)) - Number(deTabela.has(a)) || b.length - a.length)[0] ?? [];
  return { lista, tamanhos: candidatas.map((l) => l.length) };
}
for (const pais of LIGAS) {
  const alvo = TAMANHO_DA_LIGA[pais];
  const { lista, tamanhos } = listaDaLiga(pais, "liga", alvo);
  ligas[pais] = lista.map((c) => ({ c, wd: clubesWd[c.qid] }));
  relatorio.push(`Liga ${pais}: ${lista.length} clubes (esperados ${alvo}; listas das páginas: ${tamanhos.join(", ")}).`);
}

/**
 * Quantos clubes cada segunda divisão tem em 2026, sem os da primeira e sem os times B (reservas de clubes da primeira,
 * que não sobem: na Venezuela, o Monagas B e o Zamora B; no Peru, o Sport Huancayo II; o Puerto Cabello da página é o
 * da primeira).
 */
const TAMANHO_DA_SEGUNDA: Record<string, number> = { AR: 36, BO: 14, CL: 16, CO: 16, EC: 11, PY: 16, PE: 17, UY: 14, VE: 10 };
const TIME_B = /["“”]B["“”]|\sB$/;
if (dadosSegundas) {
  // Quem está na primeira divisão de algum país não entra na segunda (as páginas citam os rebaixados e os promovidos).
  const naPrimeira = new Set(LIGAS.flatMap((p) => ligas[p].map(({ c }) => c.qid)));
  for (const pais of LIGAS) {
    const alvo = TAMANHO_DA_SEGUNDA[pais];
    const { lista, tamanhos } = listaDaLiga(pais, "liga2", alvo, (c) => naPrimeira.has(c.qid) || TIME_B.test(c.titulo));
    ligas[`${pais}2`] = lista.map((c) => ({ c, wd: clubesWd[c.qid] }));
    relatorio.push(`Segunda divisão ${pais}: ${lista.length} clubes (esperados ${alvo}; listas das páginas: ${tamanhos.join(", ")}).`);
  }
}

// ---- elencos dos clubes de fora -------------------------------------------------------------------

interface JogadorDeFora {
  nome: string; posicao?: Pos; lado?: "D" | "E"; nascimento?: string; nacionalidade?: string; fama: number; valor?: number; chave: string;
}

/** Posição pelo Wikidata (só as que dizem mais que "defensor"). */
function posicaoWd(rotulos: string[]): { posicao?: Pos; lado?: "D" | "E" } {
  for (const r of rotulos.map(normalizar)) {
    if (/goalkeeper/.test(r)) return { posicao: "G" };
    if (/left back|left wing back/.test(r)) return { posicao: "L", lado: "E" };
    if (/right back|right wing back/.test(r)) return { posicao: "L", lado: "D" };
    if (/full back|wing back/.test(r)) return { posicao: "L" };
    if (/centre back|center back|central defender|stopper|sweeper/.test(r)) return { posicao: "Z" };
    if (/left winger/.test(r)) return { posicao: "A", lado: "E" };
    if (/right winger/.test(r)) return { posicao: "A", lado: "D" };
    if (/winger|forward|striker|attacker/.test(r)) return { posicao: "A" };
    if (/midfield|wing half|playmaker/.test(r)) return { posicao: "M" };
  }
  return {};
}

// Transfermarkt (Argentina e Colômbia): por nome normalizado.
const tmPorNome = new Map<string, Record<string, string>>();
{
  const texto = gunzipSync(readFileSync(join(dadosTimes, "transfermarkt-america-jogadores.csv.gz"))).toString("utf8");
  const [cab, ...linhas] = texto.split("\n").filter(Boolean).map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')));
  for (const l of linhas) {
    const r = Object.fromEntries(cab.map((c, i) => [c, l[i] ?? ""]));
    for (const n of [r.name, `${r.first_name} ${r.last_name}`]) if (n?.trim()) tmPorNome.set(normalizar(n), r);
  }
}

function posicaoTm(sub: string, geral: string): { posicao?: Pos; lado?: "D" | "E" } {
  if (/Goalkeeper/.test(sub) || geral === "Goalkeeper") return { posicao: "G" };
  if (sub === "Left-Back") return { posicao: "L", lado: "E" };
  if (sub === "Right-Back") return { posicao: "L", lado: "D" };
  if (sub === "Centre-Back") return { posicao: "Z" };
  if (/Midfield/.test(sub)) return { posicao: "M", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  if (/Winger|Forward|Striker/.test(sub)) return { posicao: "A", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  return {};
}

const DATA_INICIO = "2026-03-28";
function idadeEm(nascimento: string): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ra, rm, rd] = DATA_INICIO.split("-").map(Number);
  return ra - a - (rm < m || (rm === m && rd < d) ? 1 : 0);
}

const MINIMO: Record<Pos, number> = { G: 3, L: 4, Z: 5, M: 7, A: 5 };
const TAMANHO = 30;

/** O elenco de um clube de fora: as páginas em espanhol e em inglês, com o Wikidata e o Transfermarkt. */
function elencoDeFora(f: FichaNova, wd: ClubeWd): JogadorReal[] {
  type J = JogadorDeFora & { exata?: boolean };
  const porNome = new Map<string, J>(), porPessoa = new Map<string, J>();
  for (const lang of ["es", "en"] as const) {
    const qids = elencosRobo[`${wd.qid}|${lang}`]?.qids ?? {};
    for (const j of lerElenco(paginaDoClube(lang, wd) ?? "")) {
      const nome = normalizar(j.nome);
      const pessoa = j.pagina ? pessoasWd[qids[j.pagina] ?? ""] : undefined;
      let x = porNome.get(nome) ?? (pessoa ? porPessoa.get(pessoa.qid) : undefined);
      if (!x) {
        x = { nome: j.nome, fama: 0, chave: pessoa?.qid ?? `${f.id}/${nome}` };
        porNome.set(nome, x);
      }
      if (pessoa) porPessoa.set(pessoa.qid, x);
      // A posição exata (lateral, zagueiro, ponta) vale mais que a geral ("defensor" vira zagueiro por enquanto).
      const doWd = pessoa ? posicaoWd(pessoa.posicoes) : {};
      if (!x.exata && (doWd.posicao === "L" || doWd.posicao === "Z") && j.posicao !== "G") { x.posicao = doWd.posicao; x.exata = true; }
      if (!x.exata && j.exata && (j.posicao === "L" || j.posicao === "Z")) { x.posicao = j.posicao; x.exata = true; }
      x.posicao ??= j.posicao ?? doWd.posicao;
      x.lado ??= j.lado ?? doWd.lado;
      x.nascimento ??= j.nascimento ?? pessoa?.nascimento?.slice(0, 10);
      x.nacionalidade ??= nacionalidade(j.nacionalidade) ?? nacionalidade(pessoa?.paises[0]);
      x.fama = Math.max(x.fama, Number(pessoa?.links ?? 0) + (j.pagina ? 1 : 0));
    }
  }
  const lista = [...new Set(porNome.values())];
  // Transfermarkt: posição exata, nascimento, pé e valor (Argentina e Colômbia).
  for (const j of lista) {
    const tm = tmPorNome.get(normalizar(j.nome));
    if (!tm) continue;
    const { posicao, lado } = posicaoTm(tm.sub_position, tm.position);
    if (posicao) { j.posicao = posicao; j.exata = true; }
    j.lado ??= lado ?? (tm.foot === "left" ? "E" : tm.foot === "right" ? "D" : undefined);
    j.nascimento ??= tm.date_of_birth?.slice(0, 10) || undefined;
    j.valor = Number(tm.market_value_in_eur) || undefined;
  }
  const jogadores = lista.filter((j) => j.posicao);
  // Defensores sem posição exata: os laterais completam 4 (ou 40% dos defensores); os outros ficam zagueiros.
  const defensores = jogadores.filter((j) => j.posicao === "L" || j.posicao === "Z");
  const alvoL = Math.max(Math.min(4, defensores.length - 3), Math.round(defensores.length * 0.4));
  for (const j of defensores.filter((x) => x.posicao === "Z" && !x.exata).sort((a, b) => hash(a.chave) - hash(b.chave))) {
    if (jogadores.filter((x) => x.posicao === "L").length >= alvoL) break;
    j.posicao = "L";
  }
  // Os mais conhecidos e valorizados primeiro, guardando o mínimo por posição.
  const relevancia = (j: JogadorDeFora) => (j.valor ? Math.log10(j.valor) : 0) * 3 + j.fama;
  const ordem = [...jogadores].sort((a, b) => relevancia(b) - relevancia(a) || a.chave.localeCompare(b.chave));
  const escolhidos: typeof ordem = [];
  for (const pos of ["G", "L", "Z", "M", "A"] as Pos[]) escolhidos.push(...ordem.filter((j) => j.posicao === pos).slice(0, MINIMO[pos]));
  for (const j of ordem) if (escolhidos.length < TAMANHO && !escolhidos.includes(j) && !(j.posicao === "G" && escolhidos.filter((x) => x.posicao === "G").length >= 4)) escolhidos.push(j);
  // Força: na faixa do clube, pela relevância dentro do clube (goleiros entre si).
  const { min, max } = f.forcaElenco;
  const saida: JogadorReal[] = [];
  for (const grupo of [escolhidos.filter((j) => j.posicao === "G"), escolhidos.filter((j) => j.posicao !== "G")]) {
    const p = percentis(grupo.map(relevancia));
    grupo.forEach((j, i) => {
      const forca = Math.round(limitar(min + (max - min) * p[i] ** 0.9 + (hash(j.chave) - 0.5) * 4, 1, max));
      const idade = j.nascimento ? idadeEm(j.nascimento) : Math.round(19 + hash(`${j.chave}/idade`) * 13);
      const nac = j.nacionalidade && j.nacionalidade !== NACIONALIDADE_DO_PAIS[f.pais!] ? j.nacionalidade : undefined;
      saida.push({
        nome: j.nome, posicao: j.posicao!, lado: j.lado ?? (hash(`${j.chave}/lado`) < 0.5 ? "D" : "E"),
        idade: limitar(idade, 16, 42), forca, ...(nac ? { nacionalidade: nac } : {}),
      });
    });
  }
  const ordemPos: Pos[] = ["G", "L", "Z", "M", "A"];
  return saida.sort((a, b) => ordemPos.indexOf(a.posicao) - ordemPos.indexOf(b.posicao) || b.forca - a.forca);
}

const elencosExterior: Record<string, JogadorReal[]> = {};
/** Valor do elenco no Transfermarkt (soma dos 20 mais valiosos), para os países que a base cobre. */
function valorDoElenco(wd: ClubeWd): number {
  const valores: number[] = [];
  for (const lang of ["es", "en"] as const) {
    for (const j of lerElenco(paginaDoClube(lang, wd) ?? "")) {
      const v = Number(tmPorNome.get(normalizar(j.nome))?.market_value_in_eur);
      if (v) valores.push(v);
    }
  }
  return [...new Set(valores)].sort((a, b) => b - a).slice(0, 20).reduce((a, b) => a + b, 0);
}
// Primeiro as primeiras divisões (os ids delas não mudam), depois as segundas.
for (const liga of [...LIGAS, ...LIGAS.map((p) => `${p}2`)]) {
  const lista = ligas[liga];
  if (!lista) continue;
  const pais = liga.slice(0, 2);
  const segunda = liga.endsWith("2");
  // A fama é a ordem pelo valor do elenco (Argentina e Colômbia) e pelo número de Wikipédias com a página do clube.
  const valores = lista.map(({ wd }) => (wd ? valorDoElenco(wd) : 0));
  const pWiki = percentis(lista.map(({ wd }) => Number(wd?.links ?? 0)));
  const pValor = percentis(valores);
  const temValor = valores.filter(Boolean).length >= lista.length / 2;
  const base = percentis(lista.map((_, i) => (temValor ? 0.7 * pValor[i] + 0.3 * pWiki[i] : pWiki[i])));
  // Os grandes (Peñarol, Colo-Colo, Olimpia...) ficam acima de todos os outros do país.
  const nomes = lista.map(({ c, wd }) => fichaDeFora(c, wd, pais, 0, false).nome);
  const fama = base.map((f, i) => (GRANDES.has(nomes[i]) && !segunda ? 0.9 + 0.1 * f : 0.88 * f));
  lista.forEach(({ c, wd }, i) => {
    const f = fichaDeFora(c, wd, pais, fama[i], true, segunda);
    fichasExterior.push(f);
    if (wd) {
      const elenco = elencoDeFora(f, wd);
      if (elenco.length >= 16) elencosExterior[f.id] = elenco;
    }
  });
}
for (const segunda of [false, true]) {
  const fichas = fichasExterior.filter((f) => !!f.liga === segunda);
  const comElenco = fichas.filter((f) => elencosExterior[f.id]);
  relatorio.push(`Clubes de fora (${segunda ? "segunda" : "primeira"} divisão): ${fichas.length}; com elenco da Wikipédia: ${comElenco.length} (${comElenco.flatMap((f) => elencosExterior[f.id]).length} jogadores).`);
}

// ---- elencos dos clubes brasileiros (Série D e só do estadual), pelas súmulas -----------------------

/**
 * Os nomes que as súmulas usam para cada clube ("Água Santa / SP"): no mesmo estado, o clube do jogo com mais
 * palavras em comum (pelo menos 2 em 3), se só um chega lá; mais os de CBF_MANUAL.
 */
function nomesNasSumulas(): Map<string, string[]> {
  const todos = new Set(NOMES_NAS_SUMULAS.keys());
  const conhecidos = new Set(Object.values(FONTES_CLUBES).flatMap((f) => f.cbf).map(normalizar));
  const manuais = new Set(Object.values(CBF_MANUAL).flat().map(normalizar));
  const mapa = new Map<string, string[]>(Object.entries(CBF_MANUAL).map(([id, nomes]) => [id, [...nomes]]));
  const clubes = [...fichasD, ...fichasEstaduais];
  for (const n of todos) {
    if (conhecidos.has(normalizar(n)) || manuais.has(normalizar(n))) continue;
    const [nome, uf] = n.split(" / ").map((x) => x.trim());
    const notas = clubes
      .filter((f) => f.estado === uf)
      .map((f) => ({ id: f.id, nota: semelhanca(palavrasDoClube(nome), palavrasDoClube(f.nome.replace(/-[A-Z]{2}$/, ""))) }))
      .sort((a, b) => b.nota - a.nota);
    if (!notas[0] || notas[0].nota < 0.66 || notas[1]?.nota === notas[0].nota) continue;
    mapa.set(notas[0].id, [...(mapa.get(notas[0].id) ?? []), n]);
  }
  return mapa;
}

const cbf = nomesNasSumulas();
const fontes: Record<string, NomesNasFontes> = {};
for (const [id, nomes] of cbf) fontes[id] = { cbf: nomes };
relatorio.push(`Clubes brasileiros com nome nas súmulas: ${cbf.size} de ${fichasD.length + fichasEstaduais.length}.`);

// Quem já está nos 60 elencos das séries fica de fora (os elencos das séries não mudam).
const dasSeries = montarDasSumulas(dadosSumulas, fichasAC as never);
const excluir = new Set(dasSeries.detalhes.map((d) => d.cbf as string | undefined).filter((c): c is string => !!c));
const brasileiros = [...fichasD, ...fichasEstaduais].filter((f) => cbf.has(f.id)).map((f) => ({ ...f, serie: "D" }));
const montados = montarDasSumulas(dadosSumulas, brasileiros as never, { competicoes: ["Serie_A", "Serie_B", "Serie_C", "Serie_D", "CdB"], excluir, fontes });
const elencosBrasil: Record<string, JogadorReal[]> = {};
for (const [id, elenco] of Object.entries(montados.elencos)) if (elenco.length >= 14) elencosBrasil[id] = elenco as JogadorReal[];
relatorio.push(`Clubes brasileiros com elenco das súmulas: ${Object.keys(elencosBrasil).length} (${Object.values(elencosBrasil).flat().length} jogadores); os outros ganham elenco gerado no jogo.`);

// ---- gravar ---------------------------------------------------------------------------------------

const atuais = lerJson("data/brasil-2026/jogadores.json");
const escrever = (arquivo: string, dados: unknown) => writeFileSync(arquivo, JSON.stringify(dados, null, 0) + "\n");
if (!process.argv.includes("--so-participantes")) {
  escrever("data/brasil-2026/jogadores.json", {
    ...atuais,
    fonte: "Cartola (Série A), súmulas da CBF (Séries B, C e D, Copa do Brasil), transfermarkt-datasets e Wikidata. Força calculada pelo Proffut.",
    elencos: { ...Object.fromEntries(Object.entries(atuais.elencos).filter(([id]) => fichasAC.some((f) => f.id === id))), ...elencosBrasil },
  });
  writeFileSync("data/brasil-2026/clubes-estaduais.json", JSON.stringify({
    temporada: 2026, descricao: "Clubes brasileiros que jogam só o estadual (fora das Séries A a D). Montado por tools/times/montar.ts.", clubes: fichasEstaduais,
  }, null, 1) + "\n");
  writeFileSync("data/brasil-2026/estaduais.json", JSON.stringify({
    temporada: 2026, descricao: "Quem joga a primeira divisão de cada estadual de 2026 (sigla do estado → ids dos clubes). Montado por tools/times/montar.ts.", participantes: estaduais,
  }, null, 1) + "\n");
  writeFileSync("data/america-do-sul-2026/clubes.json", JSON.stringify({
    temporada: 2026, descricao: "Clubes da primeira e da segunda divisão (liga com 2 no fim) de 2026 dos outros 9 países da Conmebol. Montado por tools/times/montar.ts.", clubes: fichasExterior,
  }, null, 1) + "\n");
  escrever("data/america-do-sul-2026/jogadores.json", { fonte: "Wikipédia (elencos atuais), Wikidata e transfermarkt-datasets. Força calculada pelo Proffut.", elencos: elencosExterior });
}
console.log(relatorio.join("\n"));
void qidDoJogo;
