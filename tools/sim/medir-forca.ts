// Script SÓ DE MEDIDA (não muda o jogo): simula várias temporadas e mostra como a força dos jogadores evolui.
// Mede: quantos jogadores com força >= 85, >= 90, >= 95 e = 99 por temporada; o maior valor; quantos têm potencial > força;
// e a trajetória dos jovens (até 21 anos, força 75 a 82 no começo), separando quem joga muito (30+ jogos por temporada,
// em média) de quem joga pouco. Uso: npm run medir-forca -- [temporadas=10] [semente=1]
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import type { EstadoJogo } from "../../src/engine/tipos";

const temporadas = Number(process.argv[2] ?? 10);
const semente = Number(process.argv[3] ?? 1);
const JOGA_MUITO = 30;

const estado: EstadoJogo = novoJogo({ nomeTecnico: "Medida", clubeId: "flamengo", semente: 1000 + semente });
estado.config.escalacaoAutomatica = true;

interface Jovem {
  id: number; posicao: string; idade0: number; forca0: number;
  /** Jogos de cada temporada que o jogador completou (vistos na hora em que a força evolui). */
  jogos: number[];
  /** Maior força vista até cada fim de temporada do usuário (índice 0 = ano 1). */
  maximo: number[];
  /** Força no fim de cada temporada do usuário; null se o jogador sumiu (aposentado). */
  forca: (number | null)[];
  primeiro90?: number; primeiro99?: number;
}
const jovens = new Map<number, Jovem>();
for (const j of Object.values(estado.jogadores)) {
  if (j.idade <= 21 && j.forca >= 75 && j.forca <= 82) {
    jovens.set(j.id, { id: j.id, posicao: j.posicao, idade0: j.idade, forca0: j.forca, jogos: [], maximo: [], forca: [] });
  }
}

// Foto diária de cada jogador (jogos da temporada e data da última evolução): a evolução zera as estatísticas,
// então os jogos da temporada que acabou são os da foto anterior.
const foto = new Map<number, { jogos: number; evoluiuEm?: string }>();
for (const j of Object.values(estado.jogadores)) foto.set(j.id, { jogos: j.temporada.jogos, evoluiuEm: j.evoluiuEm });

function tirarFoto() {
  for (const j of Object.values(estado.jogadores)) {
    const f = foto.get(j.id);
    if (!f) { foto.set(j.id, { jogos: j.temporada.jogos, evoluiuEm: j.evoluiuEm }); continue; }
    if (j.evoluiuEm !== f.evoluiuEm) {
      const jv = jovens.get(j.id);
      if (jv) jv.jogos.push(f.jogos);
      f.evoluiuEm = j.evoluiuEm;
    }
    f.jogos = j.temporada.jogos;
  }
}

interface Linha { ano: number; total: number; ge85: number; ge90: number; ge95: number; eq99: number; maior: number; potMaior: number; idadeMaior: number }
const linhas: Linha[] = [];

function contar(ano: number) {
  const todos = Object.values(estado.jogadores);
  let ge85 = 0, ge90 = 0, ge95 = 0, eq99 = 0, maior = 0, potMaior = 0, idadeMaior = 0;
  for (const j of todos) {
    if (j.forca >= 85) ge85++;
    if (j.forca >= 90) ge90++;
    if (j.forca >= 95) ge95++;
    if (j.forca === 99) eq99++;
    if (j.potencial > j.forca) potMaior++;
    if (j.forca > maior) { maior = j.forca; idadeMaior = j.idade; }
  }
  linhas.push({ ano, total: todos.length, ge85, ge90, ge95, eq99, maior, potMaior, idadeMaior });
  for (const jv of jovens.values()) {
    const j = estado.jogadores[jv.id];
    const f = j ? j.forca : null;
    jv.forca.push(f);
    jv.maximo.push(Math.max(jv.maximo[ano - 2] ?? jv.forca0, f ?? 0));
    if (f !== null && f >= 90 && jv.primeiro90 === undefined) jv.primeiro90 = ano;
    if (f !== null && f >= 99 && jv.primeiro99 === undefined) jv.primeiro99 = ano;
  }
}

const inicio = Date.now();
contar(0); // retrato do começo, antes de qualquer virada
console.log(`Mundo no começo: ${Object.keys(estado.jogadores).length} jogadores, ${jovens.size} jovens no grupo (até 21 anos, força 75 a 82).`);
let feitas = 0;
let erroDoMotor = "";
try {
  for (let t = 1; t <= temporadas; t++) {
    let seguranca = 0;
    while (seguranca++ < 400) {
      const r = avancar(estado);
      tirarFoto();
      if (r.tipo === "nova-temporada" || r.tipo === "nada") break;
      if (r.tipo === "jogos-hoje") { simularDia(estado); tirarFoto(); }
    }
    contar(t);
    feitas = t;
    const l = linhas[t];
    console.log(`  temporada ${t} pronta (${((Date.now() - inicio) / 1000).toFixed(0)} s): >=90 ${l.ge90}, >=95 ${l.ge95}, 99 ${l.eq99}, maior ${l.maior}`);
  }
} catch (e) {
  // Um erro do motor no meio da simulação não joga fora o que já foi medido.
  erroDoMotor = e instanceof Error ? `${e.message}\n${(e.stack ?? "").split("\n").slice(1, 4).join("\n")}` : String(e);
  console.log(`\n!! O motor deu erro depois de ${feitas} temporada(s) completa(s) e a medição parou aí:\n${erroDoMotor}`);
}

const pad = (v: string | number, n: number) => String(v).padStart(n);
console.log(`\n== O mundo todo, ao fim de cada temporada (ano 0 = começo) ==`);
console.log(`${pad("ano", 4)} ${pad("jogad.", 7)} ${pad(">=85", 6)} ${pad(">=90", 6)} ${pad(">=95", 6)} ${pad("=99", 5)} ${pad("maior", 6)} ${pad("pot>forca", 10)}`);
for (const l of linhas) console.log(`${pad(l.ano, 4)} ${pad(l.total, 7)} ${pad(l.ge85, 6)} ${pad(l.ge90, 6)} ${pad(l.ge95, 6)} ${pad(l.eq99, 5)} ${pad(l.maior, 6)} ${pad(l.potMaior, 10)}`);

// A primeira evolução de cada jogador (a da primeira virada do mundo) vem com as estatísticas incompletas (a foto
// diária perde os jogos simulados no mesmo passo da virada): fica de fora da conta de "joga muito" e "joga pouco".
const jogosValidos = (jv: Jovem) => jv.jogos.slice(1);
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); return o.length ? o[Math.floor(o.length / 2)] : 0; };
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(0)}%` : "-");

console.log(`\n== Jovens (até 21 anos, força 75 a 82 no começo) ==`);
console.log(`"Joga muito" = média de ${JOGA_MUITO}+ jogos por temporada nos anos olhados; "joga pouco" = menos que isso.`);
for (const anos of [3, 5, 10]) {
  if (anos > feitas) continue;
  const grupos: [string, Jovem[]][] = [["joga muito", []], ["joga pouco", []]];
  let sumiram = 0;
  for (const jv of jovens.values()) {
    const js = jogosValidos(jv).slice(0, anos);
    if (js.length === 0) { sumiram++; continue; }
    (media(js) >= JOGA_MUITO ? grupos[0][1] : grupos[1][1]).push(jv);
  }
  console.log(`\nEm ${anos} anos (${sumiram} jovens sem nenhuma temporada completa, fora da conta):`);
  console.log(`${"grupo".padEnd(11)} ${pad("jovens", 7)} ${pad("força 0", 8)} ${pad("força fim", 10)} ${pad("mediana", 8)} ${pad("passou 90", 10)} ${pad("passou 95", 10)} ${pad("chegou 99", 10)} ${pad("anos até 90", 12)}`);
  for (const [nome, g] of grupos) {
    const fim = g.map((jv) => jv.forca[anos - 1] ?? jv.forca.filter((x) => x !== null).pop() ?? jv.forca0);
    const max = g.map((jv) => jv.maximo[anos - 1] ?? jv.forca0);
    const a90 = g.filter((jv) => jv.primeiro90 !== undefined && jv.primeiro90 <= anos).map((jv) => jv.primeiro90!);
    console.log(
      `${nome.padEnd(11)} ${pad(g.length, 7)} ${pad(media(g.map((jv) => jv.forca0)).toFixed(1), 8)} ${pad(media(fim).toFixed(1), 10)} ${pad(mediana(fim), 8)} ` +
      `${pad(`${max.filter((x) => x >= 90).length} (${pct(max.filter((x) => x >= 90).length, g.length)})`, 10)} ` +
      `${pad(`${max.filter((x) => x >= 95).length} (${pct(max.filter((x) => x >= 95).length, g.length)})`, 10)} ` +
      `${pad(`${max.filter((x) => x >= 99).length} (${pct(max.filter((x) => x >= 99).length, g.length)})`, 10)} ` +
      `${pad(a90.length ? mediana(a90) : "-", 12)}`,
    );
  }
}

// Os melhores jovens: onde foi parar o top 10 depois de todas as temporadas.
const finais = [...jovens.values()].map((jv) => ({ jv, f: jv.forca[feitas - 1] ?? 0 })).sort((a, b) => b.f - a.f).slice(0, 8);
console.log(`\nOs 8 jovens que mais subiram em ${feitas} anos (força no começo → no fim; jogos por temporada):`);
for (const { jv, f } of finais) console.log(`  ${jv.posicao} ${jv.idade0} anos: ${jv.forca0} → ${f}   jogos: ${jv.jogos.join(", ")}`);
console.log(`\nTempo total: ${((Date.now() - inicio) / 1000).toFixed(0)} s. Semente ${semente}.`);
