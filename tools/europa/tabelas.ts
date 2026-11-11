// Tabela final de 2025/26 de cada liga da Europa do jogo (as 7 ligas e os outros 16 países), pelos jogos do
// transfermarkt-datasets (CC0). As copas da UEFA de 2026 saem daí, com as vagas de VAGAS_UEFA (src/engine/copas.ts).
//   npx tsx tools/europa/tabelas.ts <pasta da branch dados-europa> <pasta da branch dados-europa-outros>
// Grava data/europa-2026/copas.json.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { FICHAS_EUROPA, LIGAS_EUROPA } from "./fichas";
import { FICHAS_OUTROS, LIGAS_OUTROS } from "./fichas-outros";

const [pasta, pastaOutros] = process.argv.slice(2);
if (!pasta || !pastaOutros) throw new Error("Uso: npx tsx tools/europa/tabelas.ts <dados-europa> <dados-europa-outros>");

/** CSV com aspas, como o que o robô grava. */
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

const doTm = new Map([...Object.entries(FICHAS_EUROPA), ...Object.entries(FICHAS_OUTROS)].map(([tm, f]) => [tm, f[0]]));
const ligas: Record<string, string> = { ...LIGAS_EUROPA, ...LIGAS_OUTROS };
const jogos = [...lerCsv(`${pasta}/jogos-ligas.csv.gz`), ...lerCsv(`${pastaOutros}/jogos-ligas.csv.gz`)].filter((g) => g.season === "2025");
const tabelas: Record<string, string[]> = {};
for (const [comp, liga] of Object.entries(ligas)) {
  const t = new Map<string, { pts: number; sg: number; gp: number }>();
  for (const g of jogos.filter((x) => x.competition_id === comp && x.home_club_goals !== "")) {
    const [a, b] = [Number(g.home_club_goals), Number(g.away_club_goals)];
    for (const [id, pro, contra] of [[g.home_club_id, a, b], [g.away_club_id, b, a]] as [string, number, number][]) {
      const l = t.get(id) ?? { pts: 0, sg: 0, gp: 0 };
      l.pts += pro > contra ? 3 : pro === contra ? 1 : 0; l.sg += pro - contra; l.gp += pro;
      t.set(id, l);
    }
  }
  tabelas[liga] = [...t].sort((x, y) => y[1].pts - x[1].pts || y[1].sg - x[1].sg || y[1].gp - x[1].gp).map(([tm]) => doTm.get(tm)!).filter(Boolean);
}
writeFileSync("data/europa-2026/copas.json", JSON.stringify({
  fonte: "Tabela de 2025/26 de cada liga da Europa do jogo (jogos do transfermarkt-datasets, CC0; na Noruega e na Suécia, o ano de 2025 até a data da base). As vagas nas copas da UEFA de 2026 saem daí, com VAGAS_UEFA (src/engine/copas.ts).",
  tabelas,
}, null, 1) + "\n");
for (const [liga, t] of Object.entries(tabelas)) console.log(`${liga} (${t.length}): ${t.slice(0, 5).join(", ")}`);
