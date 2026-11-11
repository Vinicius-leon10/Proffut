// Monta os clubes e os elencos da primeira divisão do Japão, da Coreia do Sul, da Arábia Saudita e da Austrália a partir da
// pasta tm da branch dados-asia-africa (base livre CC0 do transfermarkt-datasets) e liga os convocados das seleções que
// jogam nesses clubes. Projeto "jogo completo" (nov/2026), parte 2.
//   npx tsx tools/asia/montar.ts <pasta da branch dados-asia-africa>
// Grava data/asia-2026/clubes.json e data/asia-2026/jogadores.json e atualiza data/selecoes-2026/convocados.json (rodar
// depois de tools/europa/montar.ts, que também liga convocados: um não desfaz o que o outro ligou).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { FICHAS_ASIA, LIGAS_ASIA } from "./fichas";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";

const pasta = process.argv[2];
if (!pasta) throw new Error("Uso: npx tsx tools/asia/montar.ts <pasta da branch dados-asia-africa>");

/** CSV com aspas, como o que o robô grava. */
function lerCsv(nome: string): Record<string, string>[] {
  const texto = gunzipSync(readFileSync(join(pasta, "tm", `${nome}.csv.gz`))).toString("utf-8");
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

type Pos = "G" | "L" | "Z" | "M" | "A";
const ORDEM: Pos[] = ["G", "L", "Z", "M", "A"];
const MINIMO: Record<Pos, number> = { G: 3, L: 4, Z: 4, M: 6, A: 4 };
const TAMANHO = 30;
const ANO = 2026;

/** Nacionalidade em inglês → código do jogo. */
const NACIONALIDADE: Record<string, string> = {
  Brazil: "BRA", Argentina: "ARG", Uruguay: "URU", Colombia: "COL", Paraguay: "PAR", Chile: "CHI", Ecuador: "EQU",
  Venezuela: "VEN", Peru: "PER", Bolivia: "BOL", "United States": "EUA", Mexico: "MEX", "Costa Rica": "CRC", Panama: "PAN",
  Honduras: "HON", Haiti: "HAI", Canada: "CAN", Jamaica: "JAM", "Trinidad and Tobago": "TRI", Curacao: "CUW", Suriname: "SUR",
  ...Object.fromEntries(Object.entries(NACIONALIDADES_MUNDO).flatMap(([cod, n]) => n.ingles.map((i) => [i, cod]))),
};
/** Nacionalidade de quem é do país da liga (não vai no arquivo). */
const DO_PAIS: Record<string, string> = { JP: "JAP", KR: "COR", SA: "SAU", AU: "AUS" };

function posicao(sub: string, geral: string): { posicao?: Pos; lado?: "D" | "E" } {
  if (sub === "Goalkeeper" || geral === "Goalkeeper") return { posicao: "G" };
  if (sub === "Left-Back") return { posicao: "L", lado: "E" };
  if (sub === "Right-Back") return { posicao: "L", lado: "D" };
  if (sub === "Centre-Back" || geral === "Defender") return { posicao: "Z" };
  if (sub.includes("Midfield") || geral === "Midfield") return { posicao: "M", lado: sub.startsWith("Left") ? "E" : sub.startsWith("Right") ? "D" : undefined };
  if (sub || geral === "Attack") return { posicao: "A", lado: sub.startsWith("Left") ? "E" : sub.startsWith("Right") ? "D" : undefined };
  return {};
}

function idade(nascimento: string): number | undefined {
  if (!nascimento) return undefined;
  const [a, m] = nascimento.slice(0, 10).split("-").map(Number);
  return ANO - a - (m > 1 ? 1 : 0);
}

/**
 * Força pelo valor de mercado, como na Europa (tools/europa/montar.ts): € 1 mi → 66, € 5 mi → 76, € 20 mi → 84, € 50 mi → 90.
 * Na Ásia o valor de mercado fica abaixo do que o jogador joga (liga longe das vitrines), e a força ganha um piso pela liga.
 */
const PISO: Record<string, number> = { JP: 60, KR: 58, SA: 58, AU: 55 };
function forcaPeloValor(valor: number, anos: number, pais: string): number {
  const ajuste = anos <= 20 ? -4 : anos <= 22 ? -2 : anos >= 33 ? 5 : anos >= 31 ? 3 : anos >= 29 ? 1 : 0;
  return Math.round(Math.max(PISO[pais] ?? 52, Math.min(98, 66 + 14 * Math.log10(Math.max(valor, 50_000) / 1_000_000) + ajuste)));
}

/** Número de 0 a 1 que não muda de uma vez para outra. */
function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const clubesTm = lerCsv("clubes").filter((c) => c.last_season === "2025" && LIGAS_ASIA[c.domestic_competition_id]);
const porClube = new Map<string, Record<string, string>[]>();
for (const j of lerCsv("jogadores").filter((x) => x.last_season >= "2025")) porClube.set(j.current_club_id, [...(porClube.get(j.current_club_id) ?? []), j]);

type JogadorReal = { nome: string; posicao: Pos; lado: "D" | "E"; idade: number; forca: number; nacionalidade?: string };
const fichas: { id: string; nome: string }[] = [];
const elencos: Record<string, JogadorReal[]> = {};
const nascimentos = new Map<string, string>(); // clube|nome → nascimento
const semFicha: string[] = [];

for (const c of clubesTm) {
  const f = FICHAS_ASIA[c.club_id];
  if (!f) { semFicha.push(`${c.club_id} ${c.name}`); continue; }
  const [id, nome, sigla, cidade, fundacao, cor1, cor2, torcida, reputacao] = f;
  const pais = LIGAS_ASIA[c.domestic_competition_id];
  const todos = (porClube.get(c.club_id) ?? []).map((j) => {
    const { posicao: p, lado } = posicao(j.sub_position, j.position);
    const anos = idade(j.date_of_birth) ?? Math.round(19 + hash(`${j.player_id}/idade`) * 13);
    const valor = Number(j.market_value_in_eur) || 0;
    const nac = NACIONALIDADE[j.country_of_citizenship] ?? DO_PAIS[pais];
    return { j, p, lado: lado ?? (j.foot === "left" ? "E" : j.foot === "right" ? "D" : hash(`${j.player_id}/lado`) < 0.5 ? "D" : "E") as "D" | "E", anos, valor, nac };
  }).filter((x) => x.p);
  // Os mais valiosos, guardando o mínimo de cada posição (no máximo 4 goleiros).
  const ordem = [...todos].sort((a, b) => b.valor - a.valor || a.j.player_id.localeCompare(b.j.player_id));
  const escolhidos: typeof ordem = [];
  for (const pos of ORDEM) escolhidos.push(...ordem.filter((x) => x.p === pos).slice(0, MINIMO[pos]));
  for (const x of ordem) {
    if (escolhidos.length >= TAMANHO) break;
    if (!escolhidos.includes(x) && !(x.p === "G" && escolhidos.filter((y) => y.p === "G").length >= 4)) escolhidos.push(x);
  }
  const comValor = escolhidos.filter((x) => x.valor).map((x) => forcaPeloValor(x.valor, x.anos, pais)).sort((a, b) => a - b);
  const mediana = comValor[Math.floor(comValor.length / 2)] ?? 64;
  const elenco: JogadorReal[] = escolhidos.map((x) => ({
    nome: x.j.name, posicao: x.p!, lado: x.lado, idade: Math.max(16, Math.min(42, x.anos)),
    forca: x.valor ? forcaPeloValor(x.valor, x.anos, pais) : mediana - 4,
    ...(x.nac !== DO_PAIS[pais] ? { nacionalidade: x.nac } : {}),
  }));
  elenco.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
  elencos[id] = elenco;
  for (const x of escolhidos) if (x.j.date_of_birth) nascimentos.set(`${id}|${x.j.name}`, x.j.date_of_birth.slice(0, 10));
  const forcas = elenco.map((j) => j.forca).sort((a, b) => b - a);
  const valorTotal = escolhidos.reduce((t, x) => t + x.valor, 0);
  const caixa = Math.round(Math.max(5_000_000, Math.min(400_000_000, valorTotal * 0.6)) / 1_000_000) * 1_000_000;
  fichas.push({
    id, nome, sigla, cidade, estado: pais, pais,
    cores: { primaria: cor1, secundaria: cor2 },
    estadio: { nome: c.stadium_name || `Estádio de ${cidade}`, capacidade: Math.max(4_000, Math.min(90_000, Number(c.stadium_seats) || 15_000)) },
    fundacao, rival: null, torcida, reputacao,
    forcaElenco: { min: forcas[forcas.length - 1] ?? 58, max: forcas[0] ?? 75 },
    caixaInicial: caixa,
  } as { id: string; nome: string });
}

// Convocados das seleções que jogam num desses clubes: passam a estar no clube do jogo (pelo clube e pelo nome; o nome fica
// o da convocação).
const conv = JSON.parse(readFileSync("data/selecoes-2026/convocados.json", "utf-8"));
const NOME_TM = new Map<string, string>(clubesTm.filter((c) => FICHAS_ASIA[c.club_id]).map((c) => [normalizar(c.name), FICHAS_ASIA[c.club_id][0]]));
/** O clube do jogo pelo nome do clube na convocação ("Kashima Antlers", "Al-Hilal"). */
function clubeDoJogo(nome: string): string | undefined {
  const n = normalizar(nome);
  for (const f of fichas) if (n === normalizar(f.nome) || n.includes(normalizar(f.nome)) || normalizar(f.nome).includes(n)) return f.id;
  for (const [tm, id] of NOME_TM) if (tm.includes(n) || n.includes(tm)) return id;
  return undefined;
}
let ligados = 0;
const naoAchados: string[] = [];
for (const [pais, s] of Object.entries(conv.selecoes as Record<string, { convocados: { nome: string; nascimento?: string; clube: string; clubeDoJogo?: string; noJogo?: string }[] }>)) {
  for (const c of s.convocados) {
    if (c.clubeDoJogo || !c.clube) continue;
    const clube = clubeDoJogo(c.clube);
    if (!clube) continue;
    const p = normalizar(c.nome).split(" ");
    const candidatos = elencos[clube].filter((j) => {
      const q = normalizar(j.nome).split(" ");
      return normalizar(j.nome) === normalizar(c.nome) || p.every((x) => q.includes(x)) || q.every((x) => p.includes(x))
        || (!!c.nascimento && nascimentos.get(`${clube}|${j.nome}`) === c.nascimento);
    });
    if (candidatos.length !== 1) { naoAchados.push(`${pais}: ${c.nome} (${c.clube})`); continue; }
    const j = candidatos[0];
    if (!elencos[clube].some((x) => x !== j && x.nome === c.nome)) j.nome = c.nome;
    c.clubeDoJogo = clube; c.noJogo = j.nome; ligados++;
  }
}

mkdirSync("data/asia-2026", { recursive: true });
writeFileSync("data/asia-2026/clubes.json", JSON.stringify({
  temporada: ANO,
  descricao: "Clubes da primeira divisão do Japão (J1 League 2025), da Coreia do Sul (K League 1 2025), da Arábia Saudita (Saudi Pro League 2025/26) e da Austrália (A-League Men 2025/26, com o Auckland FC e o Wellington Phoenix, da Nova Zelândia). Estádio do transfermarkt-datasets (CC0); nomes, cores e números do Proffut.",
  clubes: fichas,
}, null, 1) + "\n");
writeFileSync("data/asia-2026/jogadores.json", JSON.stringify({
  fonte: "transfermarkt-datasets (CC0): elencos, posição, nascimento, nacionalidade e valor de mercado. Força calculada pelo Proffut.",
  elencos,
}) + "\n");
writeFileSync("data/selecoes-2026/convocados.json", JSON.stringify(conv, null, 1) + "\n");

if (semFicha.length) console.log("Sem ficha:", semFicha.join("; "));
console.log(`Clubes: ${fichas.length}; jogadores: ${Object.values(elencos).reduce((t, e) => t + e.length, 0)}`);
console.log(`Convocados ligados a clubes da Ásia: ${ligados}`);
if (naoAchados.length) console.log("Convocados em clubes da Ásia sem achar no elenco:", naoAchados.join("; "));
for (const liga of Object.values(LIGAS_ASIA)) {
  const doPais = (fichas as unknown as { id: string; pais: string }[]).filter((f) => f.pais === liga);
  const medias = doPais.map((f) => {
    const top = elencos[f.id].map((j) => j.forca).sort((a, b) => b - a).slice(0, 11);
    return [f.id, Math.round(top.reduce((a, b) => a + b, 0) / Math.max(1, top.length))] as [string, number];
  }).sort((a, b) => b[1] - a[1]);
  console.log(`${liga} (${doPais.length}): ${medias.map(([i, m]) => `${i} ${m}`).join(", ")}`);
}
