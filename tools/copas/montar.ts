// Quem joga cada copa em 2026, com os ids dos clubes do jogo: lê as páginas que o robô baixou (fase "america" do
// elencos.yml, branch dados-america) e grava data/copas-2026/participantes.json.
//
//   npx tsx tools/copas/montar.ts <pasta da branch dados-america>
//
// Copas com a lista de 2026 da Wikipédia: Libertadores e Sul-Americana (a tabela "Participantes", na ordem em que cada
// país classificou os seus, que diz a fase de entrada pela distribuição de vagas de 2026), Copa dos Campeões da Concacaf
// (as duas tabelas "Teams"), Leagues Cup (as tabelas das regiões), Copa do Nordeste, Copa Verde e Copa Sul-Sudeste (as
// tabelas dos classificados). A Recopa e a Supercopa de 2026 são as de verdade (Lanús x Flamengo, Flamengo x
// Corinthians). As outras copas (as nacionais, a Centro-Americana e a do Caribe) saem das tabelas do próprio jogo.
//
// Cada clube da página vira o clube do jogo com as mesmas palavras no nome, no mesmo país (no Brasil, no mesmo estado):
// o nome que aparece na página ("Estudiantes (LP)") e o nome curto da ligação ("Club Estudiantes de La Plata" →
// "Estudiantes de La Plata"). Os que não batem ou batem com mais de um vão para MANUAL; o relatório lista os que faltam.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { normalizar } from "../times/wiki";

interface Ficha { id: string; nome: string; estado: string; pais?: string; liga?: string }

const ler = (arquivo: string) => {
  const bruto = readFileSync(arquivo);
  return JSON.parse((arquivo.endsWith(".gz") ? gunzipSync(bruto) : bruto).toString("utf8"));
};

// ---- os clubes do jogo -------------------------------------------------------------------------

const RAIZ = join(import.meta.dirname, "..", "..");
const dados = (caminho: string) => ler(join(RAIZ, "data", caminho)).clubes as Ficha[];
const FICHAS: Ficha[] = [
  ...dados("brasil-2026/clubes.json"), ...dados("brasil-2026/serie-d-reserva.json"), ...dados("brasil-2026/clubes-estaduais.json"),
  ...dados("america-do-sul-2026/clubes.json"),
];
const paisDaFicha = (f: Ficha) => f.pais ?? "BR";

/** Código de 3 letras da FIFA (nas bandeiras das páginas) → o do jogo. */
const PAIS_FIFA: Record<string, string> = {
  ARG: "AR", BOL: "BO", BRA: "BR", CHI: "CL", COL: "CO", ECU: "EC", PAR: "PY", PER: "PE", URU: "UY", VEN: "VE",
  MEX: "MX", USA: "US", CAN: "CA", CRC: "CR", HON: "HN", GUA: "GT", SLV: "SV", PAN: "PA", NCA: "NI", BLZ: "BZ",
  JAM: "JM", TRI: "TT", HAI: "HT", DOM: "DO", CUB: "CU", PUR: "PR", SUR: "SR", GUY: "GY", CUW: "CW", ARU: "AW",
  SXM: "SX", BOE: "BQ", MTQ: "MQ", GLP: "GP", GYF: "GF", SMN: "MF", BRB: "BB", BAH: "BS", BER: "BM", CAY: "KY",
  LCA: "LC", GRN: "GD", VIN: "VC", SKN: "KN", ATG: "AG", DMA: "DM", MSR: "MS", AIA: "AI", VGB: "VG", VIR: "VI", TCA: "TC",
};

/** Palavras que não distinguem um clube. */
const GENERICAS = new Set(("club clube clubes associacao asociacion atletica atletico agremiacao sociedade sociedad esporte " +
  "esportiva sportiva sportivo sport sports futebol futbol football foot ball soccer fc f c ec sc ac cd ca csd sad saf ltda " +
  "corporacion corporacao deportivo deportiva deportes desportiva desportos social cultural recreativo recreativa de do da " +
  "del la el los y e the").split(" "));
const palavras = (nome: string) => normalizar(nome.replace(/\(.*?\)/g, " ")).split(" ").filter((p) => p.length > 1 && !GENERICAS.has(p));

function semelhanca(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  return [...sa].filter((p) => sb.has(p)).length / Math.max(sa.size, sb.size);
}

/**
 * Clubes que não batem pelo nome ou batem com mais de um: "país:nome na página" → id do clube no jogo. O nome na página
 * é o texto da ligação ("Estudiantes (LP)") ou o modelo do Brasil ("Sampaio Corrêa-RJ").
 */
const MANUAL: Record<string, string> = {
  "EC:Liga de Quito": "ldu-quito", "BR:Atlético Mineiro": "atletico-mg", "BR:Vasco da Gama": "vasco", "BR:Ferroviário-CE": "ferroviario",
  "BR:Sousa-PB": "sousa", "BR:Atlético Goianiense": "atletico-go", "US:New York City FC": "nycfc",
};

const naoAchados: string[] = [];

/** O clube do jogo para um clube da página: `nomes` (o que aparece e o título da ligação) no país `pais` (e no estado `uf`). */
function clubeDoJogo(nomes: string[], pais: string, uf?: string, contexto = ""): string | undefined {
  for (const n of nomes) {
    const manual = MANUAL[`${pais}:${n}`];
    if (manual) return manual;
  }
  // Os canadenses da MLS (Toronto, Vancouver Whitecaps, CF Montréal) jogam a liga dos Estados Unidos no jogo.
  const paises = pais === "CA" ? ["CA", "US"] : [pais];
  const candidatos = FICHAS.filter((f) => paises.includes(paisDaFicha(f)) && (!uf || f.estado === uf));
  // Nome igual ao do jogo (sem acento e caixa) ganha.
  for (const n of nomes) {
    const iguais = candidatos.filter((f) => normalizar(f.nome) === normalizar(n) || f.id === normalizar(n).replace(/ /g, "-"));
    if (iguais.length === 1) return iguais[0].id;
  }
  const notas = candidatos.map((f) => ({ id: f.id, nota: Math.max(...nomes.map((n) => semelhanca(palavras(n), palavras(f.nome)))) }));
  notas.sort((a, b) => b.nota - a.nota);
  if (notas[0] && notas[0].nota >= 0.5 && notas[1]?.nota !== notas[0].nota) return notas[0].id;
  naoAchados.push(`${contexto} ${pais}${uf ? `/${uf}` : ""}: ${nomes.join(" | ")} (melhores: ${notas.slice(0, 3).map((x) => `${x.id} ${x.nota.toFixed(2)}`).join(", ")})`);
  return undefined;
}

// ---- leitura das páginas -----------------------------------------------------------------------

/** O trecho da seção `titulo` (até a próxima seção do mesmo nível ou acima). */
function secao(texto: string, titulo: string): string {
  const re = new RegExp(`^(=+)\\s*${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\1\\s*$`, "m");
  const m = re.exec(texto);
  if (!m) return "";
  const nivel = m[1].length;
  const resto = texto.slice(m.index + m[0].length);
  const fim = new RegExp(`^={1,${nivel}}[^=].*?={1,${nivel}}\\s*$`, "m").exec(resto);
  return fim ? resto.slice(0, fim.index) : resto;
}

/** Ligações de um trecho: [[Título|Texto]] → { titulo, texto }. */
function ligacoes(trecho: string): { titulo: string; texto: string }[] {
  return [...trecho.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)].map((m) => ({ titulo: m[1].trim(), texto: (m[2] ?? m[1]).trim() }));
}

/** Clube de um trecho do Brasil: {{Futebol X}} ou a ligação. */
function clubesBrasileiros(trecho: string): string[][] {
  const modelos = [...trecho.matchAll(/\{\{\s*Futebol ([^}|]+?)\s*(?:\|[^}]*)?\}\}/g)].map((m) => [m[1].trim()]);
  if (modelos.length) return modelos;
  return ligacoes(trecho).filter((l) => !/Federa|Campeonato|Estádio|Copa|Ranking/.test(l.titulo)).map((l) => [l.texto, l.titulo]);
}

const linhas = (tabela: string) => tabela.split(/\n\|-[^\n]*/).slice(1);
const celulas = (linha: string) => linha.split(/\n\||\|\|/).map((c) => c.trim()).filter((c) => c && !c.startsWith("!"));

function main() {
  const pasta = process.argv[2];
  if (!pasta) throw new Error("Uso: npx tsx tools/copas/montar.ts <pasta da branch dados-america>");
  const arquivo = (nome: string) => join(pasta, nome);
  const paginas: Record<string, string> = ler(arquivo(existsSync(arquivo("paginas.json")) ? "paginas.json" : "paginas.json.gz"));
  const pagina = (chave: string) => {
    const t = paginas[chave];
    if (!t) throw new Error(`Página que falta: ${chave}`);
    return t;
  };
  const saida: Record<string, Record<string, string[]>> = {};
  const juntar = (copa: string, fase: string, ids: (string | undefined)[]) => {
    const lista = ((saida[copa] ??= {})[fase] ??= []);
    for (const id of ids) if (id && !lista.includes(id)) lista.push(id);
  };

  // ---- Libertadores e Sul-Americana: a tabela dos participantes, país por país, na ordem em que classificaram ----
  // Distribuição de 2026 (quantos de cada país entram em cada fase), na ordem da tabela.
  const LIB: Record<string, [grupos: number, fase2: number, fase1: number]> = {
    BR: [6, 2, 0], AR: [6, 1, 0], CL: [2, 2, 0], CO: [2, 2, 0], BO: [2, 1, 1], EC: [2, 1, 1], PY: [2, 1, 1], PE: [2, 1, 1], UY: [2, 1, 1], VE: [2, 1, 1],
  };
  const conmebol = (chave: string, copa: string, fases: (pais: string, ids: string[]) => Record<string, string[]>) => {
    // Sem os transferidos da Libertadores (eles entram pela Libertadores, na Sul-Americana).
    const tabela = secao(pagina(chave), "Participantes").split(/=+\s*Equipos transferidos/)[0];
    for (const linha of linhas(tabela)) {
      const pais = PAIS_FIFA[/\{\{\s*Bandera\s*\|\s*([A-Z]{3})/i.exec(linha)?.[1]?.toUpperCase() ?? ""];
      if (!pais) continue;
      const c = celulas(linha);
      const equipes = c.find((x, i) => i > 0 && /\[\[/.test(x));
      if (!equipes) continue;
      const ids = ligacoes(equipes).map((l) => clubeDoJogo([l.texto, l.titulo], pais, undefined, copa)).filter((x): x is string => !!x);
      for (const [fase, lista] of Object.entries(fases(pais, ids))) juntar(copa, fase, lista);
    }
  };
  conmebol("es:Copa Libertadores 2026", "K-LIB", (pais, ids) => {
    const [g, f2] = LIB[pais] ?? [0, 0, 0];
    return { grupos: ids.slice(0, g), fase2: ids.slice(g, g + f2), fase1: ids.slice(g + f2) };
  });
  conmebol("es:Copa Sudamericana 2026", "K-SUL", (pais, ids) => (pais === "BR" || pais === "AR" ? { grupos: ids } : { fase1: ids }));

  // ---- Recopa e Supercopa de 2026: as de verdade (o primeiro manda o jogo de volta, na Recopa) ----
  juntar("K-REC", "final", ["flamengo", "lanus"]);
  juntar("K-SUP", "final", ["flamengo", "corinthians"]);

  // ---- Copa dos Campeões da Concacaf: as duas tabelas "Teams" ----
  const concacaf = secao(pagina("en:2026 CONCACAF Champions Cup"), "Teams");
  for (const tabela of concacaf.split(/\n\{\|/).slice(1)) {
    const fase = /round of 16/i.test(tabela.slice(0, 300)) ? "oitavas" : "fase1";
    for (const linha of linhas(tabela)) {
      const m = /\{\{\s*fbaicon\s*\|\s*([A-Z]{3})\s*\}\}\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/i.exec(linha);
      if (!m) continue;
      const pais = PAIS_FIFA[m[1].toUpperCase()];
      juntar("K-CONC", fase, [clubeDoJogo([m[3] ?? m[2], m[2]], pais, undefined, "K-CONC")]);
    }
  }

  // ---- Leagues Cup 2026: as duas regiões (os 18 da MLS e os 18 da Liga MX) ----
  const leagues = secao(pagina("en:2026 Leagues Cup"), "Teams");
  const vistos = new Set<string>();
  for (const linha of leagues.split("\n").filter((l) => /^\|\s*\d+\s*\|\|/.test(l))) {
    if (vistos.has(linha)) continue;
    vistos.add(linha);
    const l = ligacoes(linha)[0];
    const liga = /Liga MX/.test(linha) ? "MX" : "US";
    const pais = liga === "MX" ? "MX" : FICHAS.find((f) => f.pais === "CA" && semelhanca(palavras(f.nome), palavras(l.texto)) >= 1) ? "CA" : "US";
    juntar("K-LEAG", liga === "MX" ? "mx" : "mls", [clubeDoJogo([l.texto, l.titulo], pais, undefined, "K-LEAG")]);
  }

  // ---- Copa do Nordeste, Copa Verde e Copa Sul-Sudeste: as tabelas dos classificados ----
  const brasileira = (chave: string, titulo: string, copa: string, fase: (bloco: string) => string) => {
    const trecho = secao(pagina(chave), titulo);
    let uf = "";
    let bloco = "";
    for (const linha of linhas(trecho)) {
      bloco = /Centro-Oeste/.test(linha) ? "Centro-Oeste" : /Copa Norte/.test(linha) ? "Norte" : bloco;
      uf = /\{\{\s*BR-([A-Z]{2})b\s*\}\}/.exec(linha)?.[1] ?? /\{\{\s*ÍconeBandeira\s*\|\s*([^}|]+)/.exec(linha)?.[1] ?? uf;
      const sigla = UF_POR_NOME[uf] ?? uf;
      const c = celulas(linha);
      const time = c.find((x) => /\{\{\s*Futebol|\[\[/.test(x) && !/Federa/.test(x));
      if (!time) continue;
      const [nomes] = clubesBrasileiros(time);
      if (!nomes) continue;
      juntar(copa, fase(bloco), [clubeDoJogo(nomes, "BR", sigla, copa)]);
    }
  };
  brasileira("pt:Copa do Nordeste de Futebol de 2026", "Equipes classificadas", "K-NE", () => "grupos");
  brasileira("pt:Copa Verde de Futebol de 2026", "Participantes", "K-VER", (bloco) => (bloco === "Centro-Oeste" ? "centro" : "norte"));
  brasileira("pt:Copa Sul-Sudeste de Futebol de 2026", "Equipes classificadas", "K-SSE", () => "grupos");

  mkdirSync(join(RAIZ, "data", "copas-2026"), { recursive: true });
  writeFileSync(join(RAIZ, "data", "copas-2026", "participantes.json"), JSON.stringify({
    fonte: "Wikipédia (CC BY-SA), páginas de 2026 baixadas pelo robô (fase america do elencos.yml); montado por tools/copas/montar.ts",
    copas: saida,
  }, null, 1) + "\n");
  for (const [copa, fases] of Object.entries(saida)) {
    console.log(copa, Object.entries(fases).map(([f, l]) => `${f} ${l.length}`).join(", "));
  }
  if (naoAchados.length) console.log(`\nSem clube no jogo (${naoAchados.length}):\n${naoAchados.join("\n")}`);
}

/** Estado pelo nome da bandeira (Copa Verde: {{ÍconeBandeira|Acre}}). */
const UF_POR_NOME: Record<string, string> = {
  Acre: "AC", Alagoas: "AL", Amapá: "AP", Amazonas: "AM", Bahia: "BA", Ceará: "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  Goiás: "GO", Maranhão: "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", Pará: "PA", Paraíba: "PB",
  Paraná: "PR", Pernambuco: "PE", Piauí: "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS",
  Rondônia: "RO", Roraima: "RR", "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
};

main();
