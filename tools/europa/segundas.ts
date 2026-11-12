// Monta os clubes e os elencos da segunda divisão (2025/26) das 7 ligas da Europa do jogo: Championship, Segunda
// División, Serie B, 2. Bundesliga, Ligue 2, Liga Portugal 2 e Eerste Divisie (pedido "Vamos começar a europa" → "Tudo,
// nessa ordem": seleções, 2ª divisão, outros países).
//
//   npx tsx tools/europa/segundas.ts <pasta da branch dados-europa-segundas> <pasta da branch dados-europa>
//
// A primeira pasta vem da fase "europa-segundas" do robô (tools/times/wikipedia.py com tools/europa/sementes-segundas.json):
// as páginas dos campeonatos e dos clubes na Wikipédia em inglês e os dados do Wikidata. A segunda é a base livre do
// transfermarkt-datasets (CC0): só o valor de mercado, a posição e o nascimento de quem já passou pelas primeiras
// divisões (a base não cobre as segundas). Os clubes são os de fichas-segundas.ts (nomes e números do Proffut); o
// relatório diz quem ficou sem página ou sem elenco. Grava data/europa-2026/clubes-segundas.json e
// jogadores-segundas.json. A força é do Proffut: a faixa do clube (pela reputação e pela liga) e, dentro dela, quem é
// mais conhecido e valioso fica mais forte.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";
import { PAISES } from "../../src/engine/torneios";
import { lerElenco, normalizar, type Pos } from "../times/wiki";
import { FICHAS_SEGUNDAS } from "./fichas-segundas";
import { nacionalidadeDaFonte } from "../comum/nacionalidades";

const [pasta, pastaTm] = process.argv.slice(2);
if (!pasta || !pastaTm) throw new Error("Uso: npx tsx tools/europa/segundas.ts <dados-europa-segundas> <dados-europa>");

const ler = <T>(nome: string): T => {
  const arquivo = join(pasta, existsSync(join(pasta, nome)) ? nome : `${nome}.gz`);
  const bruto = readFileSync(arquivo);
  return JSON.parse((arquivo.endsWith(".gz") ? gunzipSync(bruto) : bruto).toString("utf8"));
};

interface ClubeNaPagina { titulo: string; qid: string }
interface Semente { liga: string; paginas: { titulo: string; participantes: { secao: string; clubes: ClubeNaPagina[] }[]; clubes_no_texto: ClubeNaPagina[] }[] }
interface ClubeWd { qid: string; cidades: string[]; estadios: { nome: string; capacidade?: string }[]; en?: string; enwiki?: string; fundacao?: string }
interface PessoaWd { qid: string; posicoes: string[]; paises: string[]; nascimento?: string; links?: string }

const sementes = ler<Semente[]>("sementes.json");
const clubesWd = ler<Record<string, ClubeWd>>("clubes.json");
const paginas = ler<Record<string, string>>("paginas.json");
const elencosRobo = ler<Record<string, { qids?: Record<string, string> }>>("elencos.json");
const pessoasWd = ler<Record<string, PessoaWd>>("jogadores.json");

// ---- Transfermarkt: valor, posição e nascimento por nome ----------------------------------------------------

function lerCsv(arquivo: string): Record<string, string>[] {
  const texto = gunzipSync(readFileSync(arquivo)).toString("utf-8");
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo.replace(/\r$/, "")); linhas.push(linha); linha = []; campo = ""; }
    else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length === cab.length).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i]])));
}
const tmPorNome = new Map<string, Record<string, string>[]>();
for (const j of lerCsv(join(pastaTm, "jogadores.csv.gz"))) {
  if (j.last_season < "2022") continue;
  const n = normalizar(j.name);
  tmPorNome.set(n, [...(tmPorNome.get(n) ?? []), j]);
}
/** O jogador na base: o único com o nome (ou o do mesmo ano de nascimento, quando há mais de um). */
function noTm(nome: string, nascimento?: string): Record<string, string> | undefined {
  const lista = tmPorNome.get(normalizar(nome)) ?? [];
  const doAno = nascimento ? lista.filter((j) => j.date_of_birth?.slice(0, 4) === nascimento.slice(0, 4)) : lista;
  if (nascimento && lista.length && !doAno.length) return undefined;
  return doAno.length === 1 ? doAno[0] : undefined;
}

// ---- posição, nacionalidade, idade --------------------------------------------------------------------------

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
function posicaoTm(sub: string, geral: string): { posicao?: Pos; lado?: "D" | "E" } {
  if (sub === "Goalkeeper" || geral === "Goalkeeper") return { posicao: "G" };
  if (sub === "Left-Back") return { posicao: "L", lado: "E" };
  if (sub === "Right-Back") return { posicao: "L", lado: "D" };
  if (sub === "Centre-Back") return { posicao: "Z" };
  if (/Midfield/.test(sub)) return { posicao: "M", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  if (/Winger|Forward|Striker/.test(sub)) return { posicao: "A", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  return {};
}

/** Código da FIFA (o "nat" das páginas) → nacionalidade do jogo, para os que são diferentes. */
const FIFA: Record<string, string> = {
  ENG: "ING", SCO: "ESC", WAL: "GAL", GER: "ALE", NED: "HOL", DEN: "DIN", SWE: "SUE", CZE: "TCH", UKR: "UCR", ECU: "EQU",
  USA: "EUA", JPN: "JAP", KOR: "COR", GHA: "GAN", EGY: "EGI", MOZ: "MOC", KAZ: "CAZ", KSA: "SAU", EQG: "GEQ", CUR: "CUW",
  SUI: "SUI", GRE: "GRE", CRO: "CRO", POR: "POR", ESP: "ESP", ITA: "ITA", FRA: "FRA", BEL: "BEL", IRL: "IRL", NIR: "NIR",
};
const CODIGOS_DO_JOGO = new Set<string>([
  "BRA", "POR", "ESP", "ITA", "FRA", "ALE", "HOL", "BEL", "JAP", "ANG", "NGA", "GAN", "CMR", "CIV", "SEN", "MAR", "CPV", "MOC", "GNB",
  ...Object.values(PAISES).map((p) => p.nacionalidade), ...Object.keys(NACIONALIDADES_MUNDO),
]);
const POR_NOME_EM_INGLES = new Map<string, string>([
  ...Object.entries(NACIONALIDADES_MUNDO).flatMap(([cod, n]) => n.ingles.map((i) => [normalizar(i), cod] as [string, string])),
  ...([["brazil", "BRA"], ["portugal", "POR"], ["spain", "ESP"], ["italy", "ITA"], ["france", "FRA"], ["germany", "ALE"], ["netherlands", "HOL"],
    ["belgium", "BEL"], ["japan", "JAP"], ["angola", "ANG"], ["nigeria", "NGA"], ["ghana", "GAN"], ["cameroon", "CMR"], ["ivory coast", "CIV"],
    ["senegal", "SEN"], ["morocco", "MAR"], ["cape verde", "CPV"], ["mozambique", "MOC"], ["guinea bissau", "GNB"], ["argentina", "ARG"],
    ["uruguay", "URU"], ["colombia", "COL"], ["paraguay", "PAR"], ["chile", "CHI"], ["ecuador", "EQU"], ["venezuela", "VEN"], ["peru", "PER"],
    ["bolivia", "BOL"], ["united states", "EUA"], ["mexico", "MEX"], ["canada", "CAN"], ["jamaica", "JAM"], ["republic of ireland", "IRL"],
    ["turkey", "TUR"], ["south korea", "COR"], ["dr congo", "COD"], ["democratic republic of the congo", "COD"], ["bosnia and herzegovina", "BIH"],
    ["czech republic", "TCH"], ["czechia", "TCH"], ["suriname", "SUR"], ["curacao", "CUW"], ["gambia", "GAM"]] as [string, string][]),
]);
function nacionalidade(texto?: string): string | undefined {
  if (!texto) return undefined;
  const t = texto.trim();
  const codigo = FIFA[t.toUpperCase()] ?? (CODIGOS_DO_JOGO.has(t.toUpperCase()) && t.length === 3 ? t.toUpperCase() : undefined);
  return codigo && CODIGOS_DO_JOGO.has(codigo) ? codigo : POR_NOME_EM_INGLES.get(normalizar(t)) ?? nacionalidadeDaFonte(t);
}

const DATA_INICIO = "2026-01-03";
function idadeEm(nascimento: string): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ra, rm, rd] = DATA_INICIO.split("-").map(Number);
  return ra - a - (rm < m || (rm === m && rd < d) ? 1 : 0);
}
function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** Posição de cada valor entre 0 (o menor) e 1 (o maior). */
function percentis(valores: number[]): number[] {
  const ordem = valores.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const p = new Array<number>(valores.length).fill(0.5);
  ordem.forEach(([, i], k) => { p[i] = ordem.length > 1 ? k / (ordem.length - 1) : 0.5; });
  return p;
}

// ---- a faixa de força de cada liga ------------------------------------------------------------------------

/**
 * Força média dos 11 melhores, do clube de menor ao de maior reputação da liga. O melhor da segunda fica perto dos
 * mais fracos da primeira (Inglaterra 82, Espanha, Itália e Alemanha 74, França 75, Portugal 65, Holanda 64).
 */
const ALVO: Record<string, [number, number]> = {
  EN2: [71, 79], ES2: [66, 73], IT2: [66, 73], DE2: [67, 74], FR2: [65, 73], PT2: [57, 63], NL2: [56, 62],
};
/** Caixa no começo: a reputação elevada à quarta vezes isto (a Inglaterra tem muito mais dinheiro). */
const CAIXA: Record<string, number> = { EN2: 150e6, ES2: 60e6, IT2: 60e6, DE2: 70e6, FR2: 50e6, PT2: 25e6, NL2: 25e6 };

type JogadorReal = { nome: string; posicao: Pos; lado: "D" | "E"; idade: number; forca: number; nacionalidade?: string };
const MINIMO: Record<Pos, number> = { G: 3, L: 4, Z: 4, M: 6, A: 4 };
const TAMANHO = 30;
const ORDEM: Pos[] = ["G", "L", "Z", "M", "A"];

function elencoDoClube(id: string, qid: string, titulo: string, pais: string, min: number, max: number): JogadorReal[] {
  interface J { nome: string; posicao?: Pos; lado?: "D" | "E"; exata?: boolean; nascimento?: string; nacionalidade?: string; fama: number; valor?: number; chave: string }
  const qids = elencosRobo[`${qid}|en`]?.qids ?? {};
  const porNome = new Map<string, J>();
  for (const j of lerElenco(paginas[`en:${titulo}`] ?? "")) {
    const nome = normalizar(j.nome);
    if (porNome.has(nome)) continue;
    const pessoa = j.pagina ? pessoasWd[qids[j.pagina] ?? ""] : undefined;
    const doWd = pessoa ? posicaoWd(pessoa.posicoes ?? []) : {};
    const x: J = { nome: j.nome, fama: Number(pessoa?.links ?? 0) + (j.pagina ? 1 : 0), chave: pessoa?.qid ?? `${id}/${nome}` };
    if ((doWd.posicao === "L" || doWd.posicao === "Z") && j.posicao !== "G") { x.posicao = doWd.posicao; x.exata = true; }
    else if (j.exata && (j.posicao === "L" || j.posicao === "Z")) { x.posicao = j.posicao; x.exata = true; }
    x.posicao ??= j.posicao ?? doWd.posicao;
    x.lado = j.lado ?? doWd.lado;
    x.nascimento = j.nascimento ?? pessoa?.nascimento?.slice(0, 10);
    x.nacionalidade = nacionalidade(j.nacionalidade);
    const tm = noTm(j.nome, x.nascimento);
    if (tm) {
      const { posicao, lado } = posicaoTm(tm.sub_position, tm.position);
      if (posicao && x.posicao !== "G" && posicao !== "G") { x.posicao = posicao; x.exata = true; }
      x.lado ??= lado ?? (tm.foot === "left" ? "E" : tm.foot === "right" ? "D" : undefined);
      x.nascimento ??= tm.date_of_birth?.slice(0, 10) || undefined;
      x.nacionalidade ??= nacionalidade(tm.country_of_citizenship);
      x.valor = Number(tm.market_value_in_eur) || undefined;
    }
    porNome.set(nome, x);
  }
  const jogadores = [...porNome.values()].filter((j) => j.posicao);
  // Defensores sem posição exata: os laterais completam 4 (ou 40% dos defensores); os outros ficam zagueiros.
  const defensores = jogadores.filter((j) => j.posicao === "L" || j.posicao === "Z");
  const alvoL = Math.max(Math.min(4, defensores.length - 3), Math.round(defensores.length * 0.4));
  for (const j of defensores.filter((x) => x.posicao === "Z" && !x.exata).sort((a, b) => hash(a.chave) - hash(b.chave))) {
    if (jogadores.filter((x) => x.posicao === "L").length >= alvoL) break;
    j.posicao = "L";
  }
  const relevancia = (j: J) => (j.valor ? Math.log10(j.valor) : 0) * 3 + Math.min(j.fama, 30) * 0.5;
  const ordem = [...jogadores].sort((a, b) => relevancia(b) - relevancia(a) || a.chave.localeCompare(b.chave));
  const escolhidos: J[] = [];
  for (const pos of ORDEM) escolhidos.push(...ordem.filter((j) => j.posicao === pos).slice(0, MINIMO[pos]));
  for (const j of ordem) if (escolhidos.length < TAMANHO && !escolhidos.includes(j) && !(j.posicao === "G" && escolhidos.filter((x) => x.posicao === "G").length >= 4)) escolhidos.push(j);
  const saida: JogadorReal[] = [];
  for (const grupo of [escolhidos.filter((j) => j.posicao === "G"), escolhidos.filter((j) => j.posicao !== "G")]) {
    const p = percentis(grupo.map(relevancia));
    grupo.forEach((j, i) => {
      const idade = limitar(j.nascimento ? idadeEm(j.nascimento) : Math.round(19 + hash(`${j.chave}/idade`) * 13), 16, 42);
      // Os muito novos ainda não chegaram ao topo da faixa.
      const pelaIdade = idade <= 19 ? -3 : idade <= 21 ? -1 : 0;
      const forca = Math.round(limitar(min + (max - min) * p[i] ** 0.9 + (hash(j.chave) - 0.5) * 4 + pelaIdade, 40, max));
      const nac = j.nacionalidade && j.nacionalidade !== PAISES[pais].nacionalidade ? j.nacionalidade : undefined;
      saida.push({ nome: j.nome, posicao: j.posicao!, lado: j.lado ?? (hash(`${j.chave}/lado`) < 0.5 ? "D" : "E"), idade, forca, ...(nac ? { nacionalidade: nac } : {}) });
    });
  }
  return saida.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
}

// ---- os clubes -------------------------------------------------------------------------------------------

const fichas: unknown[] = [];
const elencos: Record<string, JogadorReal[]> = {};
const relatorio: string[] = [];
for (const [liga, lista] of Object.entries(FICHAS_SEGUNDAS)) {
  const pais = liga.slice(0, 2);
  const semente = sementes.find((s) => s.liga === liga);
  const naPagina = new Map<string, ClubeNaPagina>();
  for (const p of semente?.paginas ?? []) {
    for (const c of [...p.participantes.flatMap((x) => x.clubes), ...p.clubes_no_texto]) if (!naPagina.has(c.qid)) naPagina.set(c.qid, c);
  }
  const reputacoes = lista.map((f) => f[8]);
  const [repMin, repMax] = [Math.min(...reputacoes), Math.max(...reputacoes)];
  const usados = new Set<string>();
  const medias: string[] = [];
  for (const [id, nome, sigla, cidade, fundacao, cor1, cor2, torcida, reputacao, ...wiki] of lista) {
    const nomes = new Set([...wiki, nome].map(normalizar));
    const achado = [...naPagina.values()].find((c) => !usados.has(c.qid) &&
      [c.titulo, clubesWd[c.qid]?.en, clubesWd[c.qid]?.enwiki].some((t) => t && nomes.has(normalizar(t))));
    if (achado) usados.add(achado.qid);
    else relatorio.push(`${liga}: ${nome} não está na página do campeonato`);
    const wd = achado ? clubesWd[achado.qid] : undefined;
    const titulo = wd?.enwiki ?? achado?.titulo ?? wiki[0];
    const [alvoMin, alvoMax] = ALVO[liga];
    const alvo = alvoMin + (alvoMax - alvoMin) * (repMax > repMin ? (reputacao - repMin) / (repMax - repMin) : 0.5);
    const faixa = { min: Math.round(alvo - 13), max: Math.round(alvo + 4) };
    const elenco = achado ? elencoDoClube(id, achado.qid, titulo, pais, faixa.min, faixa.max) : [];
    if (elenco.length >= 16) elencos[id] = elenco;
    else relatorio.push(`${liga}: ${nome} sem elenco na página (${elenco.length} jogadores): o jogo gera o elenco`);
    const estadio = (wd?.estadios ?? []).map((e) => ({ nome: e.nome, capacidade: Number(e.capacidade) || 0 })).sort((a, b) => b.capacidade - a.capacidade)[0];
    const top11 = elenco.map((j) => j.forca).sort((a, b) => b - a).slice(0, 11);
    medias.push(`${id} ${top11.length ? Math.round(top11.reduce((a, b) => a + b, 0) / top11.length) : "-"}`);
    fichas.push({
      id, nome, sigla, cidade, estado: pais, pais,
      cores: { primaria: cor1, secundaria: cor2 },
      estadio: { nome: estadio?.nome || `Estádio de ${cidade}`, capacidade: limitar(estadio?.capacidade || 10_000, 3_000, 60_000) },
      fundacao, rival: null, torcida, reputacao,
      forcaElenco: elenco.length ? { min: Math.min(...elenco.map((j) => j.forca)), max: Math.max(...elenco.map((j) => j.forca)) } : faixa,
      caixaInicial: Math.max(1_000_000, Math.round(((reputacao / 100) ** 4 * CAIXA[liga]) / 1_000_000) * 1_000_000),
      liga,
    });
  }
  console.log(`${liga} (${lista.length}): ${medias.join(", ")}`);
  const sobraram = [...naPagina.values()].filter((c) => !usados.has(c.qid)).map((c) => c.titulo);
  if (sobraram.length) relatorio.push(`${liga}: na página e sem ficha: ${sobraram.join(", ")}`);
}

writeFileSync("data/europa-2026/clubes-segundas.json", JSON.stringify({
  temporada: 2026,
  descricao: "Clubes da segunda divisão (2025/26) da Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Holanda, sem os times B. Estádio do Wikidata (CC0); nomes, cores e números do Proffut.",
  clubes: fichas,
}, null, 1) + "\n");
writeFileSync("data/europa-2026/jogadores-segundas.json", JSON.stringify({
  fonte: "Wikipédia em inglês (CC BY-SA): elenco atual da página de cada clube; Wikidata (CC0): posição e nascimento; transfermarkt-datasets (CC0): valor de mercado de quem a base cobre. Força calculada pelo Proffut.",
  elencos,
}) + "\n");
console.log(`Segundas divisões: ${fichas.length} clubes, ${Object.keys(elencos).length} com elenco da Wikipédia, ${Object.values(elencos).reduce((t, e) => t + e.length, 0)} jogadores`);
if (relatorio.length) console.log(relatorio.join("\n"));
