// Monta os clubes e os elencos das 7 ligas da Europa (temporada 2025/26) a partir da branch dados-europa (base livre
// CC0 do transfermarkt-datasets) e liga os convocados das seleções da América que jogam nesses clubes.
//   npx tsx tools/europa/montar.ts <pasta da branch dados-europa>
// Grava data/europa-2026/clubes.json, data/europa-2026/jogadores.json e atualiza data/selecoes-2026/convocados.json (e os
// nomes dos convocados em data/europa-2026/jogadores-segundas.json: rodar depois de tools/europa/segundas.ts).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { FICHAS_EUROPA, LIGAS_EUROPA } from "./fichas";
import { FICHAS_OUTROS, LIGAS_OUTROS } from "./fichas-outros";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";

const pasta = process.argv[2];
if (!pasta) throw new Error("Uso: npx tsx tools/europa/montar.ts <pasta da branch dados-europa>");

/** CSV simples (com aspas), como o que o robô grava. */
function lerCsv(nome: string, dir = pasta): Record<string, string>[] {
  const texto = gunzipSync(readFileSync(`${dir}/${nome}.csv.gz`)).toString("utf-8");
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

/** Nacionalidade em inglês → código do jogo (os da América já existiam no jogo). */
const NACIONALIDADE: Record<string, string> = {
  Brazil: "BRA", Argentina: "ARG", Uruguay: "URU", Colombia: "COL", Paraguay: "PAR", Chile: "CHI", Ecuador: "EQU",
  Venezuela: "VEN", Peru: "PER", Bolivia: "BOL", Portugal: "POR", Spain: "ESP", Italy: "ITA", France: "FRA", Germany: "ALE",
  Netherlands: "HOL", Belgium: "BEL", "United States": "EUA", Mexico: "MEX", "Costa Rica": "CRC", Panama: "PAN",
  Honduras: "HON", Haiti: "HAI", Japan: "JAP", Angola: "ANG", Nigeria: "NGA", Ghana: "GAN", Cameroon: "CMR",
  "Cote d'Ivoire": "CIV", Senegal: "SEN", Morocco: "MAR", "Cape Verde": "CPV", Mozambique: "MOC", "Guinea-Bissau": "GNB",
  Canada: "CAN", Jamaica: "JAM", "Trinidad and Tobago": "TRI", "Dominican Republic": "DOM", Cuba: "CUB", "Puerto Rico": "PUR",
  Suriname: "SUR", Curacao: "CUW", Guadeloupe: "GLP", "French Guiana": "GUF",
  ...Object.fromEntries(Object.entries(NACIONALIDADES_MUNDO).flatMap(([cod, n]) => n.ingles.map((i) => [i, cod]))),
};
const DO_PAIS: Record<string, string> = {
  EN: "ING", ES: "ESP", IT: "ITA", DE: "ALE", FR: "FRA", PT: "POR", NL: "HOL",
  AT: "AUT", BE: "BEL", CH: "SUI", DK: "DIN", GR: "GRE", HR: "CRO", NO: "NOR", PL: "POL", RO: "ROU", RU: "RUS", XS: "ESC", SE: "SUE",
  RS: "SRB", TR: "TUR", CZ: "TCH", UA: "UCR",
};

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
 * Força pelo valor de mercado: € 1 mi → 66, € 5 mi → 76, € 20 mi → 84, € 50 mi → 90 (os melhores do Brasileirão no jogo), € 100 mi → 94.
 * Os mais novos valem mais pelo futuro e os mais velhos menos do que jogam: o valor é acertado pela idade.
 */
function forcaPeloValor(valor: number, anos: number): number {
  const ajuste = anos <= 20 ? -4 : anos <= 22 ? -2 : anos >= 33 ? 5 : anos >= 31 ? 3 : anos >= 29 ? 1 : 0;
  return Math.round(Math.max(52, Math.min(98, 66 + 14 * Math.log10(Math.max(valor, 50_000) / 1_000_000) + ajuste)));
}

/** Número de 0 a 1 que não muda de uma vez para outra (desempate e sorteios da montagem). */
function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

// Com a segunda pasta (fase "europa-outros" do robô), também a 1ª divisão de outros 16 países (fichas-outros.ts), gravada à
// parte em clubes-outros.json e jogadores-outros.json.
const pastaOutros = process.argv[3];
const clubesTm = [
  ...lerCsv("clubes").filter((c) => c.last_season === "2025" && LIGAS_EUROPA[c.domestic_competition_id]),
  ...(pastaOutros ? lerCsv("clubes", pastaOutros).filter((c) => c.last_season === "2025" && LIGAS_OUTROS[c.domestic_competition_id]) : []),
];
const jogadoresTm = [...lerCsv("jogadores"), ...(pastaOutros ? lerCsv("jogadores", pastaOutros) : [])].filter((j) => j.last_season >= "2025");
const dosOutros = new Set(Object.values(FICHAS_OUTROS).map((f) => f[0]));
const porClube = new Map<string, Record<string, string>[]>();
for (const j of jogadoresTm) porClube.set(j.current_club_id, [...(porClube.get(j.current_club_id) ?? []), j]);

type JogadorReal = { nome: string; posicao: Pos; lado: "D" | "E"; idade: number; forca: number; nacionalidade?: string };
const fichas: unknown[] = [];
const elencos: Record<string, JogadorReal[]> = {};
const semFicha: string[] = [];
const nacionalidadesSemCodigo = new Map<string, number>();
const porNascimento = new Map<string, { clube: string; nome: string }[]>(); // data de nascimento → quem
const noJogo = new Map<string, { clube: string; nome: string }[]>(); // nome normalizado → onde está

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

for (const c of clubesTm) {
  const f = FICHAS_EUROPA[c.club_id] ?? FICHAS_OUTROS[c.club_id];
  if (!f) { semFicha.push(`${c.club_id} ${c.name}`); continue; }
  const [id, nome, sigla, cidade, fundacao, cor1, cor2, torcida, reputacao] = f;
  const pais = LIGAS_EUROPA[c.domestic_competition_id] ?? LIGAS_OUTROS[c.domestic_competition_id];
  const todos = (porClube.get(c.club_id) ?? []).map((j) => {
    const { posicao: p, lado } = posicao(j.sub_position, j.position);
    const anos = idade(j.date_of_birth) ?? Math.round(19 + hash(`${j.player_id}/idade`) * 13);
    const valor = Number(j.market_value_in_eur) || 0;
    let nac = NACIONALIDADE[j.country_of_citizenship];
    if (!nac && j.country_of_citizenship) nacionalidadesSemCodigo.set(j.country_of_citizenship, (nacionalidadesSemCodigo.get(j.country_of_citizenship) ?? 0) + 1);
    nac ??= DO_PAIS[pais];
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
  const comValor = escolhidos.filter((x) => x.valor).map((x) => forcaPeloValor(x.valor, x.anos)).sort((a, b) => a - b);
  const mediana = comValor[Math.floor(comValor.length / 2)] ?? 70;
  const elenco: JogadorReal[] = escolhidos.map((x) => ({
    nome: x.j.name, posicao: x.p!, lado: x.lado, idade: Math.max(16, Math.min(42, x.anos)),
    forca: x.valor ? forcaPeloValor(x.valor, x.anos) : mediana - 4,
    ...(x.nac !== DO_PAIS[pais] ? { nacionalidade: x.nac } : {}),
  }));
  elenco.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
  elencos[id] = elenco;
  for (const x of escolhidos) if (x.j.date_of_birth) porNascimento.set(x.j.date_of_birth.slice(0, 10), [...(porNascimento.get(x.j.date_of_birth.slice(0, 10)) ?? []), { clube: id, nome: x.j.name }]);
  for (const j of elenco) noJogo.set(normalizar(j.nome), [...(noJogo.get(normalizar(j.nome)) ?? []), { clube: id, nome: j.nome }]);
  const forcas = elenco.map((j) => j.forca).sort((a, b) => b - a);
  const valorTotal = escolhidos.reduce((t, x) => t + x.valor, 0);
  // Caixa: perto de um décimo do valor do elenco (euro = real × 6 no jogo, como os salários brasileiros não são).
  const caixa = Math.round(Math.max(5_000_000, Math.min(400_000_000, valorTotal * 0.6)) / 1_000_000) * 1_000_000;
  fichas.push({
    id, nome, sigla, cidade, estado: pais, pais,
    cores: { primaria: cor1, secundaria: cor2 },
    estadio: { nome: c.stadium_name || `Estádio de ${cidade}`, capacidade: Math.max(4_000, Math.min(90_000, Number(c.stadium_seats) || 15_000)) },
    fundacao, rival: null, torcida, reputacao,
    forcaElenco: { min: forcas[forcas.length - 1] ?? 60, max: forcas[0] ?? 80 },
    caixaInicial: caixa,
  });
}

mkdirSync("data/europa-2026", { recursive: true });
writeFileSync("data/europa-2026/clubes.json", JSON.stringify({
  temporada: ANO,
  descricao: "Clubes das primeiras divisões da Inglaterra, Espanha, Itália, Alemanha, França, Portugal e Holanda (2025/26). Estádio do transfermarkt-datasets (CC0); nomes, cores e números do Proffut.",
  clubes: (fichas as { id: string }[]).filter((f) => !dosOutros.has(f.id)),
}, null, 1) + "\n");
if (pastaOutros) {
  writeFileSync("data/europa-2026/clubes-outros.json", JSON.stringify({
    temporada: ANO,
    descricao: "Clubes da primeira divisão (2025/26) de outros 16 países da Europa: Áustria, Bélgica, Suíça, Dinamarca, Grécia, Croácia, Noruega, Polônia, Romênia, Rússia, Escócia, Suécia, Sérvia, Turquia, Tchéquia e Ucrânia. Estádio do transfermarkt-datasets (CC0); nomes, cores e números do Proffut.",
    clubes: (fichas as { id: string }[]).filter((f) => dosOutros.has(f.id)),
  }, null, 1) + "\n");
}


// Convocados das seleções da América que jogam num desses clubes: passam a estar no clube do jogo.
const conv = JSON.parse(readFileSync("data/selecoes-2026/convocados.json", "utf-8"));
const NOME_TM = new Map<string, string>(clubesTm.map((c) => [normalizar(c.name), (FICHAS_EUROPA[c.club_id] ?? FICHAS_OUTROS[c.club_id])?.[0]]));
let ligados = 0;
/** Nascido no mesmo dia e com uma palavra do nome em comum ("Maximiliano Araújo" é o "Maxi Araújo"). */
function mesmoNascimento(nome: string, nascimento?: string) {
  const p = normalizar(nome).split(" ").filter((x) => x.length > 2);
  const xs = (porNascimento.get(nascimento ?? "") ?? []).filter((a) => normalizar(a.nome).split(" ").some((x) => p.includes(x)));
  return xs.length === 1 ? xs[0] : undefined;
}
/** No clube do convocado, quem tem o nome dentro do nome dele ou o contrário ("Gabriel" e "Gabriel Magalhães"). */
function porSobrenome(nome: string, clube: string) {
  const nc = normalizar(clube);
  const ficha = (fichas as { id: string; nome: string }[]).find((f) => nc.includes(normalizar(f.nome)) || normalizar(f.nome).includes(nc) || NOME_TM.get(nc) === f.id);
  if (!ficha) return undefined;
  const p = normalizar(nome).split(" ");
  const candidatos = elencos[ficha.id].filter((j) => {
    const q = normalizar(j.nome).split(" ");
    return p.every((x) => q.includes(x)) || q.every((x) => p.includes(x));
  });
  return candidatos.length === 1 ? { clube: ficha.id, nome: candidatos[0].nome } : undefined;
}
/**
 * O único com o nome nasceu em outro ano: é outro jogador (o Roberto Fernández da Bolívia não é o do Espanyol). Só o
 * ano: as fontes trocam o dia e o mês de alguns (Rio Cardines: 7 de janeiro numa, 1º de julho na outra).
 */
const nascimentoNoJogo = new Map<string, string>();
for (const [dia, lista] of porNascimento) for (const x of lista) nascimentoNoJogo.set(`${x.clube}|${x.nome}`, dia);
function outroNascimento(a: { clube: string; nome: string }, nascimento?: string) {
  const dele = nascimentoNoJogo.get(`${a.clube}|${a.nome}`);
  return !!nascimento && !!dele && dele.slice(0, 4) !== nascimento.slice(0, 4);
}
const naoAchados: string[] = [];
for (const [pais, s] of Object.entries(conv.selecoes as Record<string, { convocados: { nome: string; nascimento?: string; clube: string; clubeDoJogo?: string; noJogo?: string }[] }>)) {
  for (const c of s.convocados) {
    if (c.clubeDoJogo || !c.clube) continue;
    const achados = noJogo.get(normalizar(c.nome)) ?? [];
    const clubeCerto = achados.find((a) => {
      const ficha = (fichas as { id: string; nome: string }[]).find((f) => f.id === a.clube)!;
      const nc = normalizar(c.clube);
      return nc.includes(normalizar(ficha.nome)) || normalizar(ficha.nome).includes(nc) || NOME_TM.get(nc) === a.clube;
    }) ?? (achados.length === 1 && !outroNascimento(achados[0], c.nascimento) ? achados[0] : undefined) ?? porSobrenome(c.nome, c.clube) ?? mesmoNascimento(c.nome, c.nascimento);
    if (clubeCerto) {
      // O nome fica o da convocação, como se fala na América ("Vinícius Júnior", não "Vinicius Junior").
      const j = elencos[clubeCerto.clube].find((x) => x.nome === clubeCerto.nome);
      if (j && !elencos[clubeCerto.clube].some((x) => x !== j && x.nome === c.nome)) j.nome = c.nome;
      c.clubeDoJogo = clubeCerto.clube; c.noJogo = j?.nome ?? clubeCerto.nome; ligados++;
    }
    else if ([...NOME_TM.keys()].some((n) => n.includes(normalizar(c.clube)) || normalizar(c.clube).includes(n))) naoAchados.push(`${pais}: ${c.nome} (${c.clube})`);
  }
}
// Os que jogam na 2ª divisão (data/europa-2026/clubes-segundas.json, de tools/europa/segundas.ts, que roda antes): pelo
// clube e pelo nome (igual, ou um dentro do outro); o nome fica o da convocação.
const segundasClubes = JSON.parse(readFileSync("data/europa-2026/clubes-segundas.json", "utf-8")).clubes as { id: string; nome: string }[];
const segundasArquivo = JSON.parse(readFileSync("data/europa-2026/jogadores-segundas.json", "utf-8"));
const segundas = segundasArquivo.elencos as Record<string, JogadorReal[]>;
let naSegunda = 0;
for (const s of Object.values(conv.selecoes as Record<string, { convocados: { nome: string; clube: string; clubeDoJogo?: string; noJogo?: string }[] }>)) {
  for (const c of s.convocados) {
    if (c.clubeDoJogo || !c.clube) continue;
    const nc = normalizar(c.clube.replace(/\b(f\.?c\.?|a\.?f\.?c\.?|cf|sc|ac|calcio|1\.)\b/gi, " "));
    const ficha = segundasClubes.find((f) => nc && (nc.includes(normalizar(f.nome)) || normalizar(f.nome).includes(nc)));
    if (!ficha || !segundas[ficha.id]) continue;
    const p = normalizar(c.nome).split(" ");
    const candidatos = segundas[ficha.id].filter((j) => {
      const q = normalizar(j.nome).split(" ");
      return normalizar(j.nome) === normalizar(c.nome) || p.every((x) => q.includes(x)) || q.every((x) => p.includes(x));
    });
    if (candidatos.length !== 1) continue;
    const j = candidatos[0];
    if (!segundas[ficha.id].some((x) => x !== j && x.nome === c.nome)) j.nome = c.nome;
    c.clubeDoJogo = ficha.id; c.noJogo = j.nome; naSegunda++;
  }
}
console.log(`Convocados ligados a clubes da 2ª divisão: ${naSegunda}`);
writeFileSync("data/europa-2026/jogadores-segundas.json", JSON.stringify(segundasArquivo) + "\n");
writeFileSync("data/selecoes-2026/convocados.json", JSON.stringify(conv, null, 1) + "\n");
const separar = (outros: boolean) => Object.fromEntries(Object.entries(elencos).filter(([id]) => dosOutros.has(id) === outros));
writeFileSync("data/europa-2026/jogadores.json", JSON.stringify({
  fonte: "transfermarkt-datasets (CC0): elencos, posição, nascimento, nacionalidade e valor de mercado. Força calculada pelo Proffut.",
  elencos: separar(false),
}) + "\n");
if (pastaOutros) {
  writeFileSync("data/europa-2026/jogadores-outros.json", JSON.stringify({
    fonte: "transfermarkt-datasets (CC0): elencos, posição, nascimento, nacionalidade e valor de mercado. Força calculada pelo Proffut.",
    elencos: separar(true),
  }) + "\n");
}

const total = Object.values(elencos).reduce((t, e) => t + e.length, 0);
console.log(`Europa: ${fichas.length} clubes, ${total} jogadores`);
for (const liga of [...Object.values(LIGAS_EUROPA), ...(pastaOutros ? Object.values(LIGAS_OUTROS) : [])]) {
  const doPais = (fichas as { id: string; pais: string; forcaElenco: { max: number } }[]).filter((f) => f.pais === liga);
  const medias = doPais.map((f) => {
    const e = elencos[f.id].map((j) => j.forca).sort((a, b) => b - a).slice(0, 11);
    return [f.id, Math.round(e.reduce((a, b) => a + b, 0) / e.length)] as const;
  }).sort((a, b) => b[1] - a[1]);
  console.log(`${liga} (${doPais.length}): ${medias.map(([i, m]) => `${i} ${m}`).join(", ")}`);
}
if (semFicha.length) console.log("Sem ficha:", semFicha.join("; "));
if (nacionalidadesSemCodigo.size) console.log("Nacionalidades sem código:", [...nacionalidadesSemCodigo].map(([n, q]) => `${n} ${q}`).join(", "));
console.log(`Convocados ligados a clubes da Europa: ${ligados}`);
if (naoAchados.length) console.log("Convocados em clubes da Europa sem achar no elenco:", naoAchados.join("; "));

// As tabelas de 2025/26 de cada liga (para as copas da UEFA de 2026) saem de tools/europa/tabelas.ts.
