// Monta os clubes e os elencos da parte 4 do projeto "jogo completo" (nov/2026) a partir da branch dados-europa-resto
// (páginas da Wikipédia em inglês, CC BY-SA, e Wikidata, CC0): a 2ª divisão dos 16 países da Europa que já têm a 1ª no
// jogo, a 1ª divisão dos 31 países da Europa que faltavam e a liga nacional da Nova Zelândia.
//   npx tsx tools/europa/resto.ts <pasta da branch dados-europa-resto>
// Grava data/europa-2026/clubes-resto.json e data/europa-2026/jogadores-resto.json e liga em
// data/selecoes-2026/convocados.json os convocados que jogam nesses clubes (rodar depois de tools/mundo/montar.ts).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { lerElenco, normalizar, type Pos } from "../times/wiki";
import { DADOS_SELECOES, nacionalidadeDoPais } from "../../src/engine/selecoes";
import { SELECOES_MUNDO } from "../../src/engine/selecoes-mundo";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";
import { PAISES } from "../../src/engine/torneios";

const pasta = process.argv[2];
if (!pasta) throw new Error("Uso: npx tsx tools/europa/resto.ts <pasta da branch dados-europa-resto>");
const lerGz = <T>(nome: string): T => JSON.parse(gunzipSync(readFileSync(join(pasta, nome))).toString("utf8"));

interface ClubeNaPagina { titulo: string; qid: string }
interface Semente { id: string; liga?: string; paginas: { titulo: string; participantes: { secao: string; clubes: ClubeNaPagina[] }[] }[] }
interface ClubeWd { qid: string; cidades: string[]; estadios: { nome: string; capacidade?: string }[]; cores: string[]; en?: string; enwiki?: string; fundacao?: string; links?: string; paises: string[] }
interface ElencoRobo { qid: string; titulo: string; qids?: Record<string, string> }
interface PessoaWd { qid: string; nascimento?: string; posicoes: string[]; esportiva?: string; paises: string[]; links?: string }

const sementes = lerGz<Semente[]>("sementes.json.gz");
const clubesWd = lerGz<Record<string, ClubeWd>>("clubes.json.gz");
const paginas = lerGz<Record<string, string>>("paginas.json.gz");
const elencosRobo = lerGz<Record<string, ElencoRobo>>("elencos.json.gz");
const pessoas = lerGz<Record<string, PessoaWd>>("jogadores.json.gz");
const ITENS: Record<string, string[]> = Object.fromEntries(Object.entries(
  (JSON.parse(readFileSync("tools/europa/sementes-resto.json", "utf8")) as { paises: Record<string, { itens: string[] }> }).paises,
).map(([p, x]) => [p, x.itens]));

/**
 * As ligas: código da liga no jogo ("AT2" é a 2ª da Áustria), tamanho em 2025/26 (para escolher a lista certa da página),
 * a faixa de força do elenco (o melhor clube e o mais fraco) e de reputação. A 2ª divisão fica abaixo do mais fraco da 1ª do
 * país (a média dos 11 melhores do último da 1ª, `npx tsx` em data/europa-2026/clubes-outros.json).
 */
type Liga = { tamanho: number; forca: [number, number]; reputacao: [number, number] };
const LIGAS: Record<string, Liga> = {
  // 2ª divisão dos 16 países
  AT2: { tamanho: 16, forca: [61, 53], reputacao: [54, 40] },
  BE2: { tamanho: 16, forca: [64, 55], reputacao: [54, 40] },
  CH2: { tamanho: 10, forca: [60, 54], reputacao: [54, 42] },
  DK2: { tamanho: 12, forca: [60, 53], reputacao: [52, 40] },
  GR2: { tamanho: 16, forca: [61, 52], reputacao: [54, 38] },
  HR2: { tamanho: 12, forca: [59, 52], reputacao: [50, 38] },
  NO2: { tamanho: 16, forca: [59, 52], reputacao: [54, 40] },
  PL2: { tamanho: 18, forca: [58, 51], reputacao: [54, 40] },
  RO2: { tamanho: 22, forca: [57, 49], reputacao: [50, 34] },
  RU2: { tamanho: 18, forca: [64, 55], reputacao: [54, 40] },
  XS2: { tamanho: 10, forca: [60, 53], reputacao: [54, 42] },
  SE2: { tamanho: 16, forca: [59, 52], reputacao: [50, 38] },
  RS2: { tamanho: 16, forca: [58, 50], reputacao: [48, 36] },
  TR2: { tamanho: 20, forca: [66, 56], reputacao: [58, 42] },
  CZ2: { tamanho: 16, forca: [57, 50], reputacao: [50, 38] },
  UA2: { tamanho: 16, forca: [57, 50], reputacao: [48, 36] },
  // 1ª divisão dos países que faltavam (pelo nível das ligas na Europa)
  HU: { tamanho: 12, forca: [72, 60], reputacao: [70, 50] },
  IL: { tamanho: 14, forca: [72, 59], reputacao: [70, 48] },
  CY: { tamanho: 14, forca: [71, 57], reputacao: [68, 46] },
  SK: { tamanho: 12, forca: [69, 57], reputacao: [66, 46] },
  SI: { tamanho: 10, forca: [68, 57], reputacao: [64, 46] },
  BG: { tamanho: 16, forca: [68, 56], reputacao: [66, 44] },
  KZ: { tamanho: 14, forca: [66, 55], reputacao: [60, 44] },
  AZ: { tamanho: 12, forca: [68, 55], reputacao: [62, 42] },
  BA: { tamanho: 12, forca: [65, 55], reputacao: [60, 42] },
  IE: { tamanho: 10, forca: [64, 55], reputacao: [60, 44] },
  FI: { tamanho: 12, forca: [63, 54], reputacao: [58, 42] },
  BY: { tamanho: 16, forca: [64, 53], reputacao: [58, 40] },
  GE: { tamanho: 10, forca: [63, 54], reputacao: [58, 42] },
  AM: { tamanho: 10, forca: [62, 53], reputacao: [56, 40] },
  AL: { tamanho: 10, forca: [62, 53], reputacao: [58, 42] },
  IS: { tamanho: 12, forca: [62, 53], reputacao: [56, 40] },
  LV: { tamanho: 10, forca: [62, 52], reputacao: [54, 38] },
  XN: { tamanho: 12, forca: [61, 52], reputacao: [56, 40] },
  MD: { tamanho: 8, forca: [61, 52], reputacao: [54, 40] },
  XK: { tamanho: 10, forca: [61, 52], reputacao: [54, 40] },
  ME: { tamanho: 10, forca: [60, 52], reputacao: [52, 38] },
  MK: { tamanho: 12, forca: [60, 52], reputacao: [52, 38] },
  LT: { tamanho: 10, forca: [60, 51], reputacao: [52, 38] },
  EE: { tamanho: 10, forca: [60, 50], reputacao: [52, 36] },
  XW: { tamanho: 12, forca: [58, 50], reputacao: [50, 36] },
  LU: { tamanho: 16, forca: [58, 49], reputacao: [48, 32] },
  MT: { tamanho: 12, forca: [58, 49], reputacao: [48, 34] },
  FO: { tamanho: 10, forca: [57, 49], reputacao: [46, 32] },
  AD: { tamanho: 8, forca: [52, 45], reputacao: [40, 28] },
  GI: { tamanho: 11, forca: [50, 44], reputacao: [38, 26] },
  SM: { tamanho: 16, forca: [48, 42], reputacao: [36, 24] },
  // Oceania
  NZ: { tamanho: 10, forca: [58, 50], reputacao: [50, 36] },
};

/** Times B e de reservas (não sobem: ficam de fora, como nas outras segundas divisões). */
const RESERVAS = /\b(B|II|U-?2[1-3]|U-?19|Futures|NXT|Jong|Reserves?|Juniors?|Akademie|Amateure)\b/i;

const hash = (texto: string) => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Ids e nomes (por país) dos clubes que já estão no jogo: o id novo não pode repetir e o clube não entra duas vezes. */
const idsUsados = new Set<string>();
const nomesNoPais = new Set<string>();
for (const arquivo of ["data/brasil-2026/clubes.json", "data/brasil-2026/serie-d-reserva.json", "data/brasil-2026/clubes-estaduais.json",
  "data/america-do-sul-2026/clubes.json", "data/europa-2026/clubes.json", "data/europa-2026/clubes-segundas.json",
  "data/europa-2026/clubes-terceiras.json", "data/europa-2026/clubes-outros.json", "data/asia-2026/clubes.json", "data/mundo-2026/clubes.json"]) {
  for (const c of JSON.parse(readFileSync(arquivo, "utf8")).clubes as { id: string; nome: string; pais?: string }[]) {
    idsUsados.add(c.id);
    if (c.pais) nomesNoPais.add(`${c.pais}|${normalizar(c.nome)}`);
  }
}
const slug = (t: string) => normalizar(t).replace(/ /g, "-");

/** "Ferencvárosi TC" → "Ferencvárosi"; "Shamrock Rovers F.C." → "Shamrock Rovers" (sem o "FC" e o que vem entre parênteses). */
function nomeLimpo(titulo: string): string {
  let n = titulo.replace(/\s*\(.*?\)\s*/g, " ").trim();
  n = n.replace(/^(F\.?\s?C\.?|FK|NK|HNK|GNK|SK|KF|FC|AFC|PFC|CS|ACS|SC|KS)\s+/i, (m) => (n.split(" ").length > 2 ? "" : m)).trim();
  n = n.replace(/\s+(F\.?\s?C\.?|S\.?\s?C\.?|C\.?\s?F\.?|A\.?\s?F\.?\s?C\.?|Football Club|FK|SK|TC|SE|FC|AC|SC|IF|BK)$/i, "").trim();
  return n || titulo;
}

/** A sigla de 3 letras: a primeira palavra que não é "FC", "FK"... */
function sigla(nome: string, usadas: Set<string>): string {
  const palavras = normalizar(nome).split(" ").filter((p) => p.length > 1 && !["fc", "fk", "nk", "sk", "kf", "sc", "de", "club", "afc", "cs"].includes(p));
  const base = (palavras[0] ?? normalizar(nome).replace(/ /g, "")).toUpperCase();
  let s = base.slice(0, 3).padEnd(3, "X");
  for (let i = 3; usadas.has(s) && i < base.length; i++) s = base.slice(0, 2) + base[i];
  usadas.add(s);
  return s;
}

/** A lista dos clubes da liga: entre as seções da página, a que tem o tamanho mais perto do da liga (só clubes do país). */
function clubesDaLiga(s: Semente, pais: string, tamanho: number): ClubeNaPagina[] {
  const itens = ITENS[pais] ?? [];
  let melhor: ClubeNaPagina[] = [];
  for (const p of s.paginas) {
    for (const l of p.participantes) {
      const lista = [...new Map(l.clubes.filter((c) => clubesWd[c.qid] && (!clubesWd[c.qid].paises.length || clubesWd[c.qid].paises.some((x) => itens.includes(x))))
        .map((c) => [c.qid, c])).values()];
      if (lista.length < 6) continue;
      const d = Math.abs(lista.length - tamanho), dm = Math.abs(melhor.length - tamanho);
      // Mais perto do tamanho; no empate, a que tem a mais (a seção "Teams" traz todos; a de uniformes às vezes não).
      if (!melhor.length || d < dm || (d === dm && lista.length > melhor.length)) melhor = lista;
    }
    if (melhor.length) break;
  }
  return melhor.slice(0, tamanho);
}

/** Posição pelo Wikidata. */
function posicaoWd(rotulos: string[]): Pos | undefined {
  for (const r of rotulos.map(normalizar)) {
    if (/goalkeeper/.test(r)) return "G";
    if (/full back|wing back|left back|right back/.test(r)) return "L";
    if (/defender|centre back|center back/.test(r)) return "Z";
    if (/midfield/.test(r)) return "M";
    if (/forward|striker|winger|attacker/.test(r)) return "A";
  }
  return undefined;
}

/** Código da FIFA ("HUN", "SWE") → nacionalidade do jogo ("HUN", "SUE"): as seleções da Europa, da América e do mundo. */
const DA_FIFA = new Map<string, string>([
  ...Object.entries(DADOS_SELECOES).map(([pais, d]) => [d.sigla, nacionalidadeDoPais(pais)] as [string, string]),
  ...Object.values(SELECOES_MUNDO).map((s) => [s[2], s[1]] as [string, string]),
  ["ENG", "ING"], ["SCO", "ESC"], ["WAL", "GAL"], ["NIR", "NIR"],
]);
const CODIGOS_DO_JOGO = new Set<string>([...Object.values(PAISES).map((p) => p.nacionalidade), ...Object.keys(NACIONALIDADES_MUNDO), ...DA_FIFA.values()]);
function nacionalidade(codigo?: string): string | undefined {
  if (!codigo) return undefined;
  const c = codigo.toUpperCase().trim();
  return DA_FIFA.get(c) ?? (CODIGOS_DO_JOGO.has(c) ? c : undefined);
}

type JogadorReal = { nome: string; posicao: Pos; lado: "D" | "E"; idade: number; forca: number; nacionalidade?: string };
const ORDEM: Pos[] = ["G", "L", "Z", "M", "A"];

const fichas: Record<string, unknown>[] = [];
const elencos: Record<string, JogadorReal[]> = {};
const relatorio: string[] = [];
const siglas = new Set<string>();

for (const [liga, cfg] of Object.entries(LIGAS)) {
  const pais = liga.replace(/\d+$/, "");
  const segunda = liga !== pais;
  const s = sementes.find((x) => x.id === `resto-${liga}-en`);
  if (!s) { relatorio.push(`${liga}: sem página`); continue; }
  const lista = clubesDaLiga(s, pais, cfg.tamanho + (segunda ? 4 : 0))
    .filter((c) => !RESERVAS.test(clubesWd[c.qid].en ?? c.titulo) && !RESERVAS.test(c.titulo))
    .filter((c) => !nomesNoPais.has(`${pais}|${normalizar(nomeLimpo(clubesWd[c.qid].en ?? c.titulo))}`))
    .slice(0, cfg.tamanho);
  // Do mais conhecido ao menos conhecido (ligações no Wikidata): o primeiro fica com a força e a reputação do topo.
  const ordem = [...lista].sort((a, b) => Number(clubesWd[b.qid].links ?? 0) - Number(clubesWd[a.qid].links ?? 0) || a.qid.localeCompare(b.qid));
  let comElenco = 0, entraram = 0;
  ordem.forEach((c, i) => {
    const wd = clubesWd[c.qid];
    const nome = nomeLimpo(wd.en ?? c.titulo);
    let id = slug(nome);
    if (idsUsados.has(id)) id = `${id}-${pais.toLowerCase()}`;
    if (idsUsados.has(id)) return;
    idsUsados.add(id);
    nomesNoPais.add(`${pais}|${normalizar(nome)}`);
    entraram++;
    const t = ordem.length <= 1 ? 0 : i / (ordem.length - 1);
    const reputacao = Math.round(cfg.reputacao[0] + (cfg.reputacao[1] - cfg.reputacao[0]) * t);
    const topo = Math.round(cfg.forca[0] + (cfg.forca[1] - cfg.forca[0]) * t ** 0.8);
    const forcaElenco = { min: topo - 12, max: topo + 4 };
    const est = wd.estadios[0];
    fichas.push({
      id, nome, sigla: sigla(nome, siglas), cidade: wd.cidades[0] ?? nome, estado: pais, pais, ...(segunda ? { liga } : {}),
      cores: { primaria: `#${wd.cores[0] ?? "FFFFFF"}`, secundaria: `#${wd.cores[1] ?? (wd.cores[0] === "000000" ? "FFFFFF" : "000000")}` },
      estadio: { nome: est?.nome ?? `Estádio de ${wd.cidades[0] ?? nome}`, capacidade: limitar(Number(est?.capacidade) || 5_000, 1_000, 70_000) },
      fundacao: Number(wd.fundacao?.slice(0, 4)) || 1950, rival: null,
      torcida: limitar(Math.round(reputacao / 3 - 8 + hash(`${id}/torcida`) * 6), 1, 30), reputacao, forcaElenco,
      caixaInicial: Math.round((2 + reputacao / 10) ** 2 / 4) * 1_000_000,
    });
    // O elenco: a página do clube em inglês (com o Wikidata para posição, nascimento e nacionalidade).
    const pagina = wd.enwiki ? paginas[`en:${wd.enwiki}`] : undefined;
    const qids = elencosRobo[`${c.qid}|en`]?.qids ?? {};
    const jogadores = lerElenco(pagina ?? "").map((j) => {
      const p = j.pagina ? pessoas[qids[j.pagina] ?? ""] : undefined;
      const posicao = j.posicao ?? posicaoWd(p?.posicoes ?? []);
      const nascimento = j.nascimento ?? p?.nascimento?.slice(0, 10);
      const nac = nacionalidade(j.nacionalidade) ?? nacionalidade(p?.esportiva) ?? nacionalidadeDoPais(pais);
      const fama = Number(p?.links ?? 0) + (j.pagina ? 2 : 0);
      return { nome: j.nome, posicao, lado: j.lado, nascimento, nac, fama, chave: p?.qid ?? `${id}/${normalizar(j.nome)}` };
    }).filter((j): j is typeof j & { posicao: Pos } => !!j.posicao);
    const unicos = [...new Map(jogadores.map((j) => [normalizar(j.nome), j])).values()];
    if (unicos.length < 11) return;
    comElenco++;
    const porFama = [...unicos].sort((a, b) => b.fama - a.fama || a.chave.localeCompare(b.chave)).slice(0, 30);
    const elenco: JogadorReal[] = porFama.map((j, k) => {
      const p = porFama.length <= 1 ? 1 : 1 - k / (porFama.length - 1);
      const idade = j.nascimento ? 2026 - Number(j.nascimento.slice(0, 4)) : Math.round(19 + hash(`${j.chave}/idade`) * 13);
      return {
        nome: j.nome, posicao: j.posicao, lado: j.lado ?? (hash(`${j.chave}/lado`) < 0.5 ? "D" : "E"), idade: limitar(idade, 16, 42),
        forca: Math.round(limitar(forcaElenco.min + (forcaElenco.max - forcaElenco.min) * p ** 0.9 + (hash(j.chave) - 0.5) * 4, 38, forcaElenco.max)),
        ...(j.nac !== nacionalidadeDoPais(pais) ? { nacionalidade: j.nac } : {}),
      };
    });
    // Posição sem o mínimo: o jogo completa com jogadores criados.
    elenco.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
    elencos[id] = elenco;
  });
  relatorio.push(`${liga}: ${entraram} clubes (esperados ${cfg.tamanho}), ${comElenco} com elenco da página${s.paginas[0] ? ` (${s.paginas[0].titulo})` : ""}`);
}

// Convocados que jogam nesses clubes (pelo nome do clube e do jogador).
const conv = JSON.parse(readFileSync("data/selecoes-2026/convocados.json", "utf-8"));
const porNome = new Map((fichas as { id: string; nome: string }[]).map((f) => [normalizar(f.nome), f.id]));
let ligados = 0;
for (const s of Object.values(conv.selecoes as Record<string, { convocados: { nome: string; clube: string; clubeDoJogo?: string; noJogo?: string }[] }>)) {
  for (const c of s.convocados) {
    if (c.clubeDoJogo || !c.clube) continue;
    const clube = porNome.get(normalizar(nomeLimpo(c.clube)));
    if (!clube || !elencos[clube]) continue;
    const p = normalizar(c.nome).split(" ");
    const candidatos = elencos[clube].filter((j) => {
      const q = normalizar(j.nome).split(" ");
      return p.every((x) => q.includes(x)) || q.every((x) => p.includes(x));
    });
    if (candidatos.length !== 1) continue;
    if (!elencos[clube].some((x) => x !== candidatos[0] && x.nome === c.nome)) candidatos[0].nome = c.nome;
    c.clubeDoJogo = clube; c.noJogo = candidatos[0].nome; ligados++;
  }
}

mkdirSync("data/europa-2026", { recursive: true });
writeFileSync("data/europa-2026/clubes-resto.json", JSON.stringify({
  temporada: 2026,
  descricao: "Clubes da 2ª divisão de 2025/26 de 16 países da Europa, da 1ª divisão dos outros 31 países da Europa e da liga da Nova Zelândia, das páginas da Wikipédia em inglês (CC BY-SA) e do Wikidata (CC0). Nomes, siglas e números do Proffut.",
  clubes: fichas,
}, null, 1) + "\n");
writeFileSync("data/europa-2026/jogadores-resto.json", JSON.stringify({
  fonte: "Wikipédia em inglês (CC BY-SA): elenco atual de cada clube; Wikidata (CC0): posição, nascimento e nacionalidade. Força calculada pelo Proffut.",
  elencos,
}) + "\n");
writeFileSync("data/selecoes-2026/convocados.json", JSON.stringify(conv, null, 1) + "\n");
console.log(relatorio.join("\n"));
console.log(`Clubes: ${fichas.length}; com elenco: ${Object.keys(elencos).length}; jogadores: ${Object.values(elencos).reduce((t, e) => t + e.length, 0)}; convocados ligados: ${ligados}`);
