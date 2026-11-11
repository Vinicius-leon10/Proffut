// Monta os clubes da terceira divisão (2025/26) das 7 ligas da Europa do jogo (pedido, nov/2026: "todas as ligas, A e B, e
// das principais, se tiver a C também"): League One, Primera Federación, Serie C, 3. Liga, National, Liga 3 e Tweede
// Divisie. Entram como clubes leves (sem jogadores, como as 3ª divisões da América): jogam pela simulação rápida com a
// força da ficha e ganham elenco quando o técnico assume um deles.
//
//   npx tsx tools/europa/terceiras.ts <pasta da branch dados-europa-terceiras>
//
// A pasta vem da fase "europa-terceiras" do robô (tools/times/wikipedia.py com tools/europa/sementes-terceiras.json). Os
// participantes saem das seções da página de cada campeonato (os grupos e a tabela das equipes), sem os times B (reservas
// de clubes de cima, que não sobem) e sem quem já está no jogo (os que caíram ou subiram e só são citados). Nome, cidade,
// estádio, cores e fundação vêm do Wikidata; a reputação e a força, da divisão e de quão conhecido é o clube. Grava
// data/europa-2026/clubes-terceiras.json e imprime um relatório.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { normalizar } from "../times/wiki";

const pasta = process.argv[2];
if (!pasta) throw new Error("Uso: npx tsx tools/europa/terceiras.ts <dados-europa-terceiras>");
const ler = <T>(nome: string): T => {
  const arquivo = join(pasta, existsSync(join(pasta, nome)) ? nome : `${nome}.gz`);
  const bruto = readFileSync(arquivo);
  return JSON.parse((arquivo.endsWith(".gz") ? gunzipSync(bruto) : bruto).toString("utf8"));
};
interface ClubeNaPagina { titulo: string; qid: string }
interface Semente { liga: string; paginas: { titulo: string; participantes: { secao: string; clubes: ClubeNaPagina[] }[] }[] }
interface ClubeWd { qid: string; cidades: string[]; estadios: { nome: string; capacidade?: string }[]; cores: string[]; en?: string; pt?: string; enwiki?: string; fundacao?: string; links?: string }
const sementes = ler<Semente[]>("sementes.json");
const clubesWd = ler<Record<string, ClubeWd>>("clubes.json");

/** Quantos clubes cada divisão tem em 2025/26 (a lista da página passa disso quando cita quem subiu ou caiu). */
const TAMANHO: Record<string, number> = { EN3: 24, ES3: 40, IT3: 60, DE3: 20, FR3: 17, PT3: 20, NL3: 18 };
/** Força (média dos 11 melhores) do clube mais fraco ao mais forte da divisão: um pouco abaixo da 2ª. */
const FAIXA: Record<string, [number, number]> = { EN3: [64, 72], ES3: [58, 66], IT3: [58, 66], DE3: [60, 68], FR3: [57, 65], PT3: [49, 56], NL3: [47, 54] };
const REPUTACAO: Record<string, [number, number]> = { EN3: [52, 64], ES3: [44, 58], IT3: [44, 58], DE3: [48, 60], FR3: [44, 56], PT3: [38, 48], NL3: [34, 44] };

/** Times B, sub-23 e de reservas: não sobem, ficam de fora. */
const TIME_B = /\b(B|II|U-?2[13]|Castilla|Atl[eè]tic|Next ?Gen|Futuro|Fortuna|Jong|Reserves?|Promesas|Mirand[ée]s B)\b|\bB$|Under-2/i;
/** Seções que não são de participantes. */
const NAO_E_LISTA = /personnel|sponsor|kit|managerial|top scorers|statistics|results|season articles/i;

// Quem já está no jogo (1ª e 2ª divisões): pelo nome.
const noJogo = new Set<string>();
for (const arquivo of ["data/europa-2026/clubes.json", "data/europa-2026/clubes-segundas.json"]) {
  for (const c of JSON.parse(readFileSync(arquivo, "utf8")).clubes as { id: string; nome: string }[]) { noJogo.add(normalizar(c.nome)); noJogo.add(c.id); }
}
const idsUsados = new Set<string>();
for (const arquivo of ["data/brasil-2026/clubes.json", "data/brasil-2026/serie-d-reserva.json", "data/brasil-2026/clubes-estaduais.json", "data/america-do-sul-2026/clubes.json", "data/europa-2026/clubes.json", "data/europa-2026/clubes-segundas.json"]) {
  for (const c of JSON.parse(readFileSync(arquivo, "utf8")).clubes as { id: string }[]) idsUsados.add(c.id);
}

/** Palavras do tipo de clube que saem do nome ("Catania FC" → "Catania", "SSV Jahn Regensburg" → "Jahn Regensburg"). */
const TIPO = new Set(("fc f.c. afc a.f.c. sc s.c. cf c.f. cd c.d. ud u.d. sd s.d. as a.s. ss s.s. ssd s.s.d. us u.s. ac a.c. calcio spa s.p.a. " +
  "sv vfb vfl tsv spvgg ssv msv fsv e.v. 1. 1 club futbol fútbol futebol football usd u.s.d. asd a.s.d. srl s.r.l. " +
  "a.d. ad c.p. cp g.c. sad s.a.d. f.c.o. fco o.a.f. vv v.v. bvv ssc s.s.c. ca c.a. cs c.s. ce sport sports sportiva " +
  "deportiva deportivo dilettantistica unione associazione societa società city? 03 04 05").split(" ").filter((x) => !x.endsWith("?")));
/** Nomes que a limpeza não acerta sozinha (o nome com que o clube é conhecido). */
const MANUAL_NOMES: Record<string, string> = {
  "msv duisburg": "Duisburg", "tsv 1860 munich": "1860 Munique", "münchen": "1860 Munique", "dijon fco": "Dijon",
  "lusitânia f.c.": "Lusitânia dos Açores", "associação académica de coimbra – o.a.f.": "Académica", "atlético clube de portugal": "Atlético CP",
  "sport clube união paredes": "União de Paredes", "asser christelijke voetbalvereniging": "ACV", "koninklijke hfc": "Koninklijke HFC",
  "amsterdamsche fc": "AFC Amsterdam", "hsv hoek": "HSV Hoek", "svv scheveningen": "Scheveningen", "unione sportiva dilettantistica audace cerignola": "Audace Cerignola",
  "centre d'esports sabadell futbol club": "Sabadell", "club deportivo guadalajara": "Guadalajara", "cp cacereño": "Cacereño", "mérida ad": "Mérida",
  "real club deportivo de la coruña": "Deportivo", "football bourg-en-bresse péronnas 01": "Bourg-Péronnas", "lb châteauroux": "Châteauroux",
  "paris 13 atletico": "Paris 13 Atlético", "stade malherbe caen": "Caen", "u.c. albinoleffe": "AlbinoLeffe", "lr vicenza": "Vicenza",
  "d. union arzignanochiampo": "Arzignano", "s.e.f. torres": "Torres", "città di pontedera": "Pontedera", "vis pesaro dal 1898": "Vis Pesaro",
  "team altamura": "Altamura", "az picerno": "Picerno", "giugliano calcio 1928": "Giugliano", "ss casarano calcio": "Casarano",
  "casertana fc": "Casertana", "sociedad ponferradina": "Ponferradina", "gimnàstic de tarragona": "Gimnàstic", "europa": "CE Europa",
  "union arzignanochiampo": "Arzignano", "ulm fußball": "Ulm", "s.u. 1º dezembro": "1º de Dezembro", "s.u. 1º de dezembro": "1º de Dezembro",
  "treffers": "De Treffers", "arenas club de getxo": "Arenas de Getxo", "lusitânia": "Lusitânia de Lourosa", "d pineto": "Pineto", "asd pineto calcio": "Pineto", "real avilés": "Real Avilés", "excelsior maassluis": "Excelsior Maassluis",
};
function nomeCurto(nome: string): string {
  const base = nome.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  const manual = MANUAL_NOMES[base.toLowerCase()];
  if (manual) return manual;
  const palavras = base.split(" ").filter((p) => !TIPO.has(p.toLowerCase()) && !/^(18|19|20)\d\d$/.test(p));
  const limpo = palavras.join(" ").replace(/(\s(de|del|la|de la))+$/i, "").replace(/^[\s.–-]+|[\s.–-]+$/g, "").trim();
  return MANUAL_NOMES[limpo.toLowerCase()] ?? (limpo.length >= 3 ? limpo : base);
}
const slug = (t: string) => normalizar(t).replace(/ /g, "-");
const sigla = (nome: string) => normalizar(nome).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
const PALETA = ["#C62828", "#1565C0", "#2E7D32", "#212121", "#F9A825", "#6A1B9A", "#EF6C00", "#00838F", "#7B1E1E", "#0D1B4C"];
function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function cor(hex?: string): string | undefined {
  return hex && /^[0-9A-F]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : undefined;
}

const fichas: unknown[] = [];
const relatorio: string[] = [];
for (const s of sementes) {
  const liga = s.liga;
  const pais = liga.slice(0, 2);
  const lista = new Map<string, ClubeNaPagina>();
  for (const p of s.paginas) {
    for (const parte of p.participantes) {
      if (NAO_E_LISTA.test(parte.secao) && p.participantes.some((x) => !NAO_E_LISTA.test(x.secao))) continue;
      for (const c of parte.clubes) if (!lista.has(c.qid)) lista.set(c.qid, c);
    }
  }
  const fora: string[] = [];
  const escolhidos = [...lista.values()].filter((c) => {
    const wd = clubesWd[c.qid];
    const nome = wd?.en ?? c.titulo;
    if (TIME_B.test(nome) || TIME_B.test(c.titulo)) { fora.push(`${c.titulo} (time B)`); return false; }
    const curto = nomeCurto(nome);
    if (noJogo.has(normalizar(curto)) || noJogo.has(normalizar(nome)) || noJogo.has(slug(curto))) { fora.push(`${c.titulo} (já no jogo)`); return false; }
    return true;
  });
  // Mais que o tamanho da divisão: ficam os mais citados (os de verdade da temporada aparecem em mais lugares).
  const links = (c: ClubeNaPagina) => Number(clubesWd[c.qid]?.links ?? 0);
  const n = TAMANHO[liga];
  if (escolhidos.length > n) {
    const sobra = [...escolhidos].sort((a, b) => links(a) - links(b)).slice(0, escolhidos.length - n);
    for (const c of sobra) { escolhidos.splice(escolhidos.indexOf(c), 1); fora.push(`${c.titulo} (sobrou)`); }
  }
  if (escolhidos.length < n) relatorio.push(`${liga}: só ${escolhidos.length} de ${n}`);
  // Fama dentro da divisão (0 a 1) pelo número de páginas do clube no Wikidata.
  const ordem = [...escolhidos].sort((a, b) => links(a) - links(b));
  const [rmin, rmax] = REPUTACAO[liga];
  const [fmin, fmax] = FAIXA[liga];
  for (const c of escolhidos) {
    const wd = clubesWd[c.qid];
    const nome = nomeCurto(wd?.pt && !/[A-Z]{2,}/.test(wd.pt.replace(/\b[A-Z]{1,4}\b/g, "")) ? wd.en ?? c.titulo : wd?.en ?? c.titulo);
    let id = slug(nome);
    if (idsUsados.has(id)) id = `${id}-${pais.toLowerCase()}`;
    if (idsUsados.has(id)) id = `${id}-3`;
    idsUsados.add(id);
    const f = ordem.length > 1 ? ordem.indexOf(c) / (ordem.length - 1) : 0.5;
    const reputacao = Math.round(rmin + (rmax - rmin) * f);
    const media = fmin + (fmax - fmin) * f;
    const estadio = (wd?.estadios ?? []).map((e) => ({ nome: e.nome, capacidade: Number(e.capacidade) || 0 })).sort((a, b) => b.capacidade - a.capacidade)[0];
    const cores = (wd?.cores ?? []).map(cor).filter((x): x is string => !!x);
    const primaria = cores[0] ?? PALETA[hash(id) % PALETA.length];
    const secundaria = cores.find((x) => x !== primaria) ?? (primaria === "#FFFFFF" ? "#212121" : "#FFFFFF");
    const cidade = wd?.cidades?.[0] ?? nome;
    fichas.push({
      id, nome, sigla: sigla(nome), cidade, estado: pais, pais,
      cores: { primaria, secundaria },
      estadio: { nome: estadio?.nome || `Estádio de ${cidade}`, capacidade: Math.max(2_000, Math.min(40_000, estadio?.capacidade || 5_000)) },
      fundacao: Number(wd?.fundacao?.slice(0, 4)) || 1920, rival: null, torcida: Math.round(3 + 12 * f), reputacao,
      forcaElenco: { min: Math.round(media - 14), max: Math.round(media + 4) },
      caixaInicial: Math.round((0.5 + 2.5 * f) * (pais === "EN" ? 4 : 1)) * 1_000_000,
      liga, leve: true,
    });
  }
  console.log(`${liga}: ${escolhidos.length} clubes${fora.length ? `; fora: ${fora.join(", ")}` : ""}`);
}
writeFileSync("data/europa-2026/clubes-terceiras.json", JSON.stringify({
  temporada: 2026,
  descricao: "Clubes da terceira divisão (2025/26) da Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Holanda, sem os times B. Clubes leves (sem jogadores até o técnico assumir). Wikipédia em inglês (CC BY-SA) e Wikidata (CC0); números do Proffut.",
  clubes: fichas,
}, null, 1) + "\n");
console.log(`Terceiras divisões: ${fichas.length} clubes`);
if (relatorio.length) console.log(relatorio.join("\n"));
