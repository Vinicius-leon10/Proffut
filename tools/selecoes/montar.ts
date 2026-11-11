// Os convocados das 51 seleções da América (pedido: "traga tudo que tem da América ... E a seleção de todos esses
// países"): lê as páginas das seleções que o robô baixou (fase "america" do elencos.yml, branch dados-america; a seção
// "Current squad" da Wikipédia em inglês, com a última convocação) e grava data/selecoes-2026/convocados.json.
//
//   npx tsx tools/selecoes/montar.ts <pasta da branch dados-america> [<pasta da branch dados-selecoes-europa>]
//
// Com a segunda pasta (fase "selecoes-europa" do robô, tools/selecoes/baixar.py), entram as 55 seleções da UEFA. Os
// convocados que jogam nos clubes da Europa do jogo são ligados aos elencos por tools/europa/montar.ts (rodar depois).
//
// De cada convocado: nome, posição (GK, DF, MF, FW), nascimento, jogos e gols pela seleção e o clube. Quando o clube está
// no jogo, o convocado é procurado no elenco dele (pelo nome); achado, o jogo usa esse jogador (`noJogo`). Os outros
// (a maioria joga fora da América, na Europa e na Ásia) entram no jogo só como jogadores da seleção (`clube` e `paisDoClube`
// dizem onde jogam de verdade). A força de cada um é calculada pelo jogo (selecoes.ts), não vem da página.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { normalizar } from "../times/wiki";

interface Ficha { id: string; nome: string; estado: string; pais?: string }
interface JogadorReal { nome: string; posicao: string }

const ler = (arquivo: string) => {
  const bruto = readFileSync(arquivo);
  return JSON.parse((arquivo.endsWith(".gz") ? gunzipSync(bruto) : bruto).toString("utf8"));
};
const RAIZ = join(import.meta.dirname, "..", "..");
const dados = (caminho: string) => ler(join(RAIZ, "data", caminho));
const FICHAS: Ficha[] = [
  ...dados("brasil-2026/clubes.json").clubes, ...dados("brasil-2026/serie-d-reserva.json").clubes, ...dados("brasil-2026/clubes-estaduais.json").clubes,
  ...dados("america-do-sul-2026/clubes.json").clubes,
];
const ELENCOS: Record<string, JogadorReal[]> = { ...dados("brasil-2026/jogadores.json").elencos, ...dados("america-do-sul-2026/jogadores.json").elencos };

/** Código de 3 letras da FIFA (clubnat das páginas) → o do jogo, para os países que têm clubes no jogo. */
const PAIS_FIFA: Record<string, string> = {
  ARG: "AR", BOL: "BO", BRA: "BR", CHI: "CL", COL: "CO", ECU: "EC", PAR: "PY", PER: "PE", URU: "UY", VEN: "VE",
  MEX: "MX", USA: "US", CAN: "CA", CRC: "CR", HON: "HN", GUA: "GT", SLV: "SV", PAN: "PA", NCA: "NI", BLZ: "BZ",
  JAM: "JM", TRI: "TT", HAI: "HT", DOM: "DO", CUB: "CU", PUR: "PR", SUR: "SR", GUY: "GY", CUW: "CW", ARU: "AW",
  SXM: "SX", BOE: "BQ", MTQ: "MQ", GLP: "GP", GYF: "GF", SMN: "MF", BRB: "BB", BAH: "BS", BER: "BM", CAY: "KY",
  LCA: "LC", GRN: "GD", VIN: "VC", SKN: "KN", ATG: "AG", DMA: "DM", MSR: "MS", AIA: "AI", VGB: "VG", VIR: "VI", TCA: "TC",
};

const GENERICAS = new Set(("club clube associacao asociacion atletica atletico esporte sport sports futebol futbol football soccer fc f c " +
  "ec sc ac cd ca csd sad saf deportivo deportiva deportes de do da del la el los y e the cf").split(" "));
const palavras = (nome: string) => normalizar(nome.replace(/\(.*?\)/g, " ")).split(" ").filter((p) => p.length > 1 && !GENERICAS.has(p));
function semelhanca(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  return [...sa].filter((p) => sb.has(p)).length / Math.max(sa.size, sb.size);
}

/** Os que o nome não acha (ou acha errado: "New York City" bate com o New York Cosmos). */
const MANUAL: Record<string, string> = { "US:new york city fc": "nycfc", "US:new york city": "nycfc" };

/** O clube do jogo, pelo nome que aparece e pelo título da ligação, no país do clube. */
function clubeDoJogo(nomes: string[], pais: string): string | undefined {
  for (const n of nomes) {
    const manual = MANUAL[`${pais === "CA" ? "US" : pais}:${normalizar(n)}`] ?? MANUAL[`${pais}:${normalizar(n)}`];
    if (manual) return manual;
  }
  // Os canadenses da MLS jogam a liga dos Estados Unidos no jogo.
  const paises = pais === "CA" ? ["CA", "US"] : [pais];
  const candidatos = FICHAS.filter((f) => paises.includes(f.pais ?? "BR"));
  for (const n of nomes) {
    const iguais = candidatos.filter((f) => normalizar(f.nome) === normalizar(n));
    if (iguais.length === 1) return iguais[0].id;
  }
  const notas = candidatos.map((f) => ({ id: f.id, nota: Math.max(...nomes.map((n) => semelhanca(palavras(n), palavras(f.nome)))) })).sort((a, b) => b.nota - a.nota);
  return notas[0] && notas[0].nota >= 0.5 && notas[1]?.nota !== notas[0].nota ? notas[0].id : undefined;
}

/** O convocado no elenco do clube do jogo: mesmo nome, ou o sobrenome e a inicial ("Pedro Morisco" e "P. Morisco"). */
function noElenco(clube: string, nome: string): string | undefined {
  const elenco = ELENCOS[clube] ?? [];
  const alvo = normalizar(nome);
  const igual = elenco.find((j) => normalizar(j.nome) === alvo);
  if (igual) return igual.nome;
  const partes = alvo.split(" ");
  const ultimo = partes.at(-1)!;
  const parecidos = elenco.filter((j) => {
    const p = normalizar(j.nome).split(" ");
    return p.at(-1) === ultimo && (p.length === 1 || p[0][0] === partes[0][0]);
  });
  return parecidos.length === 1 ? parecidos[0].nome : undefined;
}

// ---- leitura do modelo {{nat fs g player|...}} ----------------------------------------------------

/** Os parâmetros de um modelo da Wikipédia, separando pelas barras de fora de [[...]] e {{...}}. */
function parametros(corpo: string): Record<string, string> {
  const partes: string[] = [];
  let nivel = 0, atual = "";
  for (let i = 0; i < corpo.length; i++) {
    const dois = corpo.slice(i, i + 2);
    if (dois === "[[" || dois === "{{") { nivel++; atual += dois; i++; continue; }
    if (dois === "]]" || dois === "}}") { nivel--; atual += dois; i++; continue; }
    if (corpo[i] === "|" && nivel === 0) { partes.push(atual); atual = ""; continue; }
    atual += corpo[i];
  }
  partes.push(atual);
  const r: Record<string, string> = {};
  for (const p of partes.slice(1)) {
    const k = p.indexOf("=");
    if (k > 0) r[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim();
  }
  return r;
}

/** Os modelos de jogador de um trecho (o corpo de cada {{nat fs g player ...}}, com os modelos de dentro). */
function modelosDeJogador(trecho: string): string[] {
  const lista: string[] = [];
  const re = /\{\{\s*nat fs (?:g )?player/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trecho))) {
    let nivel = 0, i = m.index;
    for (; i < trecho.length; i++) {
      if (trecho.startsWith("{{", i)) { nivel++; i++; } else if (trecho.startsWith("}}", i)) { nivel--; i++; if (nivel === 0) break; }
    }
    lista.push(trecho.slice(m.index + 2, i - 1));
  }
  return lista;
}

const ligacao = (texto: string) => {
  const m = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/.exec(texto);
  return m ? { titulo: m[1].trim(), texto: (m[2] ?? m[1]).trim() } : { titulo: texto.trim(), texto: texto.replace(/\{\{[^}]*\}\}|<[^>]+>/g, "").trim() };
};

/** O nome escrito com modelo: {{sortname|Matt|Freese}} (Estados Unidos) e {{ill|Juan Manuel Rengifo|es}} (Colômbia). */
function nomeSemModelo(valor: string): string {
  return valor
    .replace(/<sup[^>]*>.*?<\/sup>|<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>/gi, "")
    .replace(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)[^}]*\}\}/gi, (_, nome: string, sobrenome: string) => `${nome.trim()} ${sobrenome.trim()}`)
    .replace(/\{\{\s*ill\s*\|([^|}]*)[^}]*\}\}/gi, (_, nome: string) => nome.trim());
}

const POSICAO: Record<string, string> = { GK: "G", DF: "Z", MF: "M", FW: "A" };

function main() {
  const pastas = process.argv.slice(2);
  if (!pastas.length) throw new Error("Uso: npx tsx tools/selecoes/montar.ts <pasta da branch dados-america> [<pasta da branch dados-selecoes-europa>]");
  const paginas: Record<string, string> = {};
  const sementes: { selecao: string; lang: string; pagina?: string }[] = [];
  for (const pasta of pastas) {
    const arquivo = (nome: string) => join(pasta, existsSync(join(pasta, nome)) ? nome : `${nome}.gz`);
    Object.assign(paginas, ler(arquivo("paginas.json")));
    sementes.push(...ler(arquivo("selecoes.json")));
  }
  const saida: Record<string, { pagina: string; convocados: Record<string, unknown>[] }> = {};
  let noJogo = 0, total = 0;
  for (const s of sementes) {
    const texto = paginas[`${s.lang}:${s.pagina}`] ?? "";
    // A convocação atual: da seção "Current squad" até "Recent call-ups" (ou a próxima seção do mesmo nível).
    const i = texto.search(/=+\s*Current squad\s*=+/);
    if (i < 0) { console.log(`${s.selecao}: sem "Current squad"`); continue; }
    const resto = texto.slice(i);
    const fim = resto.slice(20).search(/\n==[^=]|=+\s*Recent call/);
    const trecho = fim > 0 ? resto.slice(0, fim + 20) : resto;
    const convocados: Record<string, unknown>[] = [];
    let defensores = 0;
    for (const corpo of modelosDeJogador(trecho)) {
      const p = parametros(corpo);
      const nome = ligacao(nomeSemModelo(p.name ?? "")).texto.replace(/\s*\(.*?\)\s*/g, " ").trim();
      if (!nome) continue;
      const nascimento = /\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/.exec(p.age ?? "");
      const clube = ligacao(p.club ?? "");
      const paisDoClube = (p.clubnat ?? "").trim().toUpperCase();
      // Defensores: zagueiros e laterais alternados (a página não diz qual é qual; no jogo, o elenco do clube diz).
      let posicao = POSICAO[(p.pos ?? "").trim().toUpperCase()] ?? "M";
      if (posicao === "Z") posicao = defensores++ % 2 === 0 ? "Z" : "L";
      const pais = PAIS_FIFA[paisDoClube];
      const doJogo = pais ? clubeDoJogo([clube.texto, clube.titulo], pais) : undefined;
      const naLista = doJogo ? noElenco(doJogo, nome) : undefined;
      convocados.push({
        nome, posicao,
        ...(nascimento ? { nascimento: `${nascimento[1]}-${nascimento[2].padStart(2, "0")}-${nascimento[3].padStart(2, "0")}` } : {}),
        jogos: Number(p.caps) || 0, gols: Number(p.goals) || 0, clube: clube.texto, paisDoClube,
        ...(doJogo ? { clubeDoJogo: doJogo } : {}),
        ...(naLista ? { noJogo: naLista } : {}),
      });
      total++;
      if (naLista) noJogo++;
    }
    saida[s.selecao] = { pagina: s.pagina ?? "", convocados };
  }
  mkdirSync(join(RAIZ, "data", "selecoes-2026"), { recursive: true });
  writeFileSync(join(RAIZ, "data", "selecoes-2026", "convocados.json"), JSON.stringify({
    fonte: "Wikipédia em inglês (CC BY-SA), seção Current squad das páginas das seleções, baixadas pelo robô (fases america e selecoes-europa do elencos.yml); montado por tools/selecoes/montar.ts",
    selecoes: saida,
  }, null, 1) + "\n");
  console.log(`${Object.keys(saida).length} seleções, ${total} convocados, ${noJogo} achados num elenco do jogo.`);
  for (const [sel, { convocados }] of Object.entries(saida)) {
    const noClube = convocados.filter((c) => c.clubeDoJogo).length;
    const achados = convocados.filter((c) => c.noJogo).length;
    console.log(`${sel}: ${convocados.length} convocados; ${noClube} em clubes do jogo, ${achados} achados no elenco`);
  }
}

main();
