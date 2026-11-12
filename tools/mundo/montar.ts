// Monta os clubes e os elencos da 1ª divisão dos países da África e da Ásia que o transfermarkt-datasets não cobre, a
// partir da branch dados-asia-africa (páginas da Wikipédia em inglês, CC BY-SA, e Wikidata, CC0). Projeto "jogo completo"
// (nov/2026), parte 2.
//   npx tsx tools/mundo/montar.ts <pasta da branch dados-asia-africa>
// Grava data/mundo-2026/clubes.json e data/mundo-2026/jogadores.json e liga em data/selecoes-2026/convocados.json os
// convocados que jogam nesses clubes (rodar depois de tools/asia/montar.ts).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { lerElenco, normalizar, type Pos } from "../times/wiki";
import { SELECOES_MUNDO } from "../../src/engine/selecoes-mundo";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";

const pasta = process.argv[2];
if (!pasta) throw new Error("Uso: npx tsx tools/mundo/montar.ts <pasta da branch dados-asia-africa>");
const lerGz = <T>(nome: string): T => JSON.parse(gunzipSync(readFileSync(join(pasta, nome))).toString("utf8"));

interface ClubeNaPagina { titulo: string; qid: string }
interface Semente { id: string; liga?: string; copa?: boolean; paginas: { titulo: string; participantes: { secao: string; clubes: ClubeNaPagina[] }[] }[] }
interface ClubeWd { qid: string; cidades: string[]; estadios: { nome: string; capacidade?: string }[]; cores: string[]; en?: string; enwiki?: string; fundacao?: string; links?: string; paises: string[] }
interface ElencoRobo { qid: string; titulo: string; qids?: Record<string, string> }
interface PessoaWd { qid: string; nascimento?: string; posicoes: string[]; esportiva?: string; paises: string[]; links?: string }

const sementes = lerGz<Semente[]>("sementes.json.gz");
const clubesWd = lerGz<Record<string, ClubeWd>>("clubes.json.gz");
const paginas = lerGz<Record<string, string>>("paginas.json.gz");
const elencosRobo = lerGz<Record<string, ElencoRobo>>("elencos.json.gz");
const pessoas = lerGz<Record<string, PessoaWd>>("jogadores.json.gz");

/**
 * As ligas: código do país (o mesmo da seleção), tamanho da liga em 2025/26 (para escolher a lista certa da página),
 * região, e a faixa de força do elenco (o melhor clube e o mais fraco) e de reputação. Ficaram de fora os países cuja página
 * não trouxe a lista dos clubes (Costa do Marfim, Senegal, Líbia, Omã, Sudão) ou trouxe outra temporada (Camarões, Mali,
 * RD Congo) e a Nova Zelândia (três ligas regionais; os dois clubes profissionais jogam a liga australiana).
 */
const LIGAS: Record<string, { tamanho: number; regiao: "africa" | "asia"; forca: [number, number]; reputacao: [number, number] }> = {
  EG: { tamanho: 21, regiao: "africa", forca: [72, 58], reputacao: [72, 50] },
  MA: { tamanho: 16, regiao: "africa", forca: [71, 58], reputacao: [70, 50] },
  DZ: { tamanho: 16, regiao: "africa", forca: [68, 56], reputacao: [64, 48] },
  TN: { tamanho: 16, regiao: "africa", forca: [69, 56], reputacao: [66, 48] },
  ZA: { tamanho: 16, regiao: "africa", forca: [70, 57], reputacao: [68, 48] },
  NG: { tamanho: 20, regiao: "africa", forca: [62, 52], reputacao: [56, 42] },
  GH: { tamanho: 18, regiao: "africa", forca: [62, 52], reputacao: [56, 42] },
  TZ: { tamanho: 16, regiao: "africa", forca: [65, 52], reputacao: [62, 42] },
  AO: { tamanho: 16, regiao: "africa", forca: [62, 52], reputacao: [56, 42] },
  ZM: { tamanho: 18, regiao: "africa", forca: [61, 51], reputacao: [54, 40] },
  KE: { tamanho: 18, regiao: "africa", forca: [60, 50], reputacao: [52, 40] },
  CN: { tamanho: 16, regiao: "asia", forca: [69, 58], reputacao: [64, 50] },
  IR: { tamanho: 16, regiao: "asia", forca: [68, 57], reputacao: [64, 48] },
  QA: { tamanho: 12, regiao: "asia", forca: [73, 60], reputacao: [66, 52] },
  AE: { tamanho: 14, regiao: "asia", forca: [72, 59], reputacao: [66, 50] },
  UZ: { tamanho: 16, regiao: "asia", forca: [64, 54], reputacao: [58, 44] },
  IN: { tamanho: 13, regiao: "asia", forca: [62, 54], reputacao: [56, 44] },
  TH: { tamanho: 16, regiao: "asia", forca: [65, 54], reputacao: [58, 44] },
  IQ: { tamanho: 20, regiao: "asia", forca: [64, 53], reputacao: [58, 42] },
  MY: { tamanho: 13, regiao: "asia", forca: [63, 52], reputacao: [56, 42] },
  ID: { tamanho: 18, regiao: "asia", forca: [63, 53], reputacao: [58, 42] },
  VN: { tamanho: 14, regiao: "asia", forca: [61, 52], reputacao: [54, 42] },
  JO: { tamanho: 10, regiao: "asia", forca: [61, 52], reputacao: [54, 42] },
  KW: { tamanho: 10, regiao: "asia", forca: [62, 53], reputacao: [54, 42] },
  BH: { tamanho: 10, regiao: "asia", forca: [60, 52], reputacao: [52, 42] },
};

const hash = (texto: string) => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Ids dos clubes que já estão no jogo (o id novo não pode repetir). */
const idsUsados = new Set<string>();
for (const arquivo of ["data/brasil-2026/clubes.json", "data/brasil-2026/serie-d-reserva.json", "data/brasil-2026/clubes-estaduais.json",
  "data/america-do-sul-2026/clubes.json", "data/europa-2026/clubes.json", "data/europa-2026/clubes-segundas.json",
  "data/europa-2026/clubes-terceiras.json", "data/europa-2026/clubes-outros.json", "data/asia-2026/clubes.json"]) {
  for (const c of JSON.parse(readFileSync(arquivo, "utf8")).clubes as { id: string }[]) idsUsados.add(c.id);
}
const slug = (t: string) => normalizar(t).replace(/ /g, "-");

/** "Al Ahly SC" → "Al Ahly"; "Kaizer Chiefs F.C." → "Kaizer Chiefs" (sem o "FC", o "SC" e o que vem entre parênteses). */
function nomeLimpo(titulo: string): string {
  let n = titulo.replace(/\s*\(.*?\)\s*/g, " ").trim();
  n = n.replace(/\s+(F\.?\s?C\.?|S\.?\s?C\.?|S\.?\s?C\.?\s?C\.?|C\.?\s?F\.?|A\.?\s?C\.?|Football Club|Sports Club|Sporting Club|Club|FK|SC|FC)$/i, "").trim();
  return n || titulo;
}

/** A sigla de 3 letras: a primeira palavra que não é "Al", "FC"... */
function sigla(nome: string, usadas: Set<string>): string {
  const palavras = normalizar(nome).split(" ").filter((p) => p.length > 1 && !["al", "el", "fc", "sc", "de", "club"].includes(p));
  const base = (palavras[0] ?? normalizar(nome).replace(/ /g, "")).toUpperCase();
  let s = base.slice(0, 3).padEnd(3, "X");
  for (let i = 3; usadas.has(s) && i < base.length; i++) s = base.slice(0, 2) + base[i];
  usadas.add(s);
  return s;
}

/** A lista dos clubes da liga: entre as seções da página, a que tem o tamanho mais perto do da liga (só clubes do país). */
function clubesDaLiga(s: Semente, pais: string, tamanho: number): ClubeNaPagina[] {
  const qPais = { EG: "Q79", MA: "Q1028", DZ: "Q262", TN: "Q948", ZA: "Q258", NG: "Q1033", GH: "Q117", TZ: "Q924", AO: "Q916", ZM: "Q953",
    KE: "Q114", CN: "Q148", IR: "Q794", QA: "Q846", AE: "Q878", UZ: "Q265", IN: "Q668", TH: "Q869", IQ: "Q796", MY: "Q833", ID: "Q252",
    VN: "Q881", JO: "Q810", KW: "Q817", BH: "Q398" }[pais];
  let melhor: ClubeNaPagina[] = [];
  for (const p of s.paginas) {
    for (const l of p.participantes) {
      const lista = [...new Map(l.clubes.filter((c) => clubesWd[c.qid] && (!clubesWd[c.qid].paises.length || clubesWd[c.qid].paises.includes(qPais!))).map((c) => [c.qid, c])).values()];
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

/** FIFA ("EGY", "KOR") → código do jogo ("EGI", "COR"). */
const DA_FIFA = new Map<string, string>(Object.values(SELECOES_MUNDO).map((s) => [s[2], s[1]]));
function nacionalidade(codigo?: string): string | undefined {
  if (!codigo) return undefined;
  const c = codigo.toUpperCase().trim();
  return DA_FIFA.get(c) ?? (NACIONALIDADES_MUNDO[c] ? c : undefined);
}
const DO_PAIS: Record<string, string> = Object.fromEntries(Object.entries(SELECOES_MUNDO).map(([iso, s]) => [iso, s[1]]));

/** Nome trocado na fonte (id de antes → nome certo). "Alshariqa": o Al-Nasr de Dubai (1945, estádio Al-Maktoum; R121). */
const NOME_CERTO: Record<string, string> = { alshariqa: "Al-Nasr" };

type JogadorReal = { nome: string; posicao: Pos; lado: "D" | "E"; idade: number; forca: number; nacionalidade?: string };
const MINIMO: Record<Pos, number> = { G: 3, L: 3, Z: 4, M: 6, A: 4 };
const ORDEM: Pos[] = ["G", "L", "Z", "M", "A"];

const fichas: Record<string, unknown>[] = [];
const elencos: Record<string, JogadorReal[]> = {};
const relatorio: string[] = [];
const siglas = new Set<string>();

for (const [pais, liga] of Object.entries(LIGAS)) {
  const s = sementes.find((x) => x.id === `mundo-${pais}-en`);
  if (!s) { relatorio.push(`${pais}: sem página`); continue; }
  const lista = clubesDaLiga(s, pais, liga.tamanho);
  // Do mais conhecido ao menos conhecido (ligações no Wikidata): o primeiro fica com a força e a reputação do topo.
  const ordem = [...lista].sort((a, b) => Number(clubesWd[b.qid].links ?? 0) - Number(clubesWd[a.qid].links ?? 0) || a.qid.localeCompare(b.qid));
  let comElenco = 0;
  ordem.forEach((c, i) => {
    const wd = clubesWd[c.qid];
    const certo = NOME_CERTO[slug(nomeLimpo(wd.en ?? c.titulo))];
    const nome = certo ?? nomeLimpo(wd.en ?? c.titulo);
    // Com o nome corrigido, o id continua o de antes: os saves já guardam o clube por ele.
    let id = certo ? slug(nomeLimpo(wd.en ?? c.titulo)) : slug(nome);
    if (idsUsados.has(id)) id = `${id}-${pais.toLowerCase()}`;
    if (idsUsados.has(id)) return;
    idsUsados.add(id);
    const t = ordem.length <= 1 ? 0 : i / (ordem.length - 1);
    const reputacao = Math.round(liga.reputacao[0] + (liga.reputacao[1] - liga.reputacao[0]) * t);
    const topo = Math.round(liga.forca[0] + (liga.forca[1] - liga.forca[0]) * t ** 0.8);
    const forcaElenco = { min: topo - 12, max: topo + 4 };
    const est = wd.estadios[0];
    fichas.push({
      id, nome, sigla: sigla(nome, siglas), cidade: wd.cidades[0] ?? nome, estado: pais, pais,
      cores: { primaria: `#${wd.cores[0] ?? "FFFFFF"}`, secundaria: `#${wd.cores[1] ?? (wd.cores[0] === "000000" ? "FFFFFF" : "000000")}` },
      estadio: { nome: est?.nome ?? `Estádio de ${wd.cidades[0] ?? nome}`, capacidade: limitar(Number(est?.capacidade) || 10_000, 3_000, 90_000) },
      fundacao: Number(wd.fundacao?.slice(0, 4)) || 1950, rival: null,
      torcida: limitar(Math.round(reputacao / 3 - 8 + hash(`${id}/torcida`) * 6), 2, 40), reputacao, forcaElenco,
      caixaInicial: Math.round((2 + reputacao / 10) ** 2 / 4) * 1_000_000,
    });
    // O elenco: a página do clube em inglês (com o Wikidata para posição, nascimento e nacionalidade).
    const pagina = wd.enwiki ? paginas[`en:${wd.enwiki}`] : undefined;
    const qids = elencosRobo[`${c.qid}|en`]?.qids ?? {};
    const jogadores = lerElenco(pagina ?? "").map((j) => {
      const p = j.pagina ? pessoas[qids[j.pagina] ?? ""] : undefined;
      const posicao = j.posicao ?? posicaoWd(p?.posicoes ?? []);
      const nascimento = j.nascimento ?? p?.nascimento?.slice(0, 10);
      const nac = nacionalidade(j.nacionalidade) ?? nacionalidade(p?.esportiva) ?? DO_PAIS[pais];
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
        forca: Math.round(limitar(forcaElenco.min + (forcaElenco.max - forcaElenco.min) * p ** 0.9 + (hash(j.chave) - 0.5) * 4, 40, forcaElenco.max)),
        ...(j.nac !== DO_PAIS[pais] ? { nacionalidade: j.nac } : {}),
      };
    });
    elenco.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
    // Posição sem o mínimo: o jogo completa com jogadores criados.
    void MINIMO;
    elencos[id] = elenco;
  });
  relatorio.push(`${pais}: ${ordem.length} clubes (esperados ${liga.tamanho}), ${comElenco} com elenco da página`);
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

mkdirSync("data/mundo-2026", { recursive: true });
writeFileSync("data/mundo-2026/clubes.json", JSON.stringify({
  temporada: 2026,
  descricao: "Clubes da 1ª divisão de 2025/26 (ou 2026) de países da África e da Ásia, das páginas da Wikipédia em inglês (CC BY-SA) e do Wikidata (CC0). Nomes, siglas e números do Proffut.",
  ligas: Object.fromEntries(Object.entries(LIGAS).map(([p, l]) => [p, l.regiao])),
  clubes: fichas,
}, null, 1) + "\n");
writeFileSync("data/mundo-2026/jogadores.json", JSON.stringify({
  fonte: "Wikipédia em inglês (CC BY-SA): elenco atual de cada clube; Wikidata (CC0): posição, nascimento e nacionalidade. Força calculada pelo Proffut.",
  elencos,
}) + "\n");
writeFileSync("data/selecoes-2026/convocados.json", JSON.stringify(conv, null, 1) + "\n");
console.log(relatorio.join("\n"));
console.log(`Clubes: ${fichas.length}; com elenco: ${Object.keys(elencos).length}; jogadores: ${Object.values(elencos).reduce((t, e) => t + e.length, 0)}; convocados ligados: ${ligados}`);
