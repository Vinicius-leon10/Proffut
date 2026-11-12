// Tira das listas de jogadores (data/*/jogadores*.json) quem aparece em mais de um clube (R130, nov/2026: "o Riyad Mahrez
// aparece em dois clubes ao mesmo tempo"). A mesma pessoa: nome igual com duas palavras ou mais e idade com até 1 ano de
// diferença (as fontes estimam a idade de jeitos diferentes) e a mesma nacionalidade (a da lista ou, sem ela, a do país do
// clube: "Lucas González" do Paraguai e o da Argentina são dois). Quem fica:
//   1. o clube da convocação de verdade (data/selecoes-2026/convocados.json, `clubeDoJogo`: a página da seleção diz o
//      clube atual);
//   2. a lista mais confiável: Transfermarkt (Europa 7 ligas e outros 16 países, Ásia, e no Brasil os clubes das Séries
//      A a D) ganha da Wikipédia (América, 2ª da Europa, resto da Europa, África e Ásia, clubes só do estadual);
//   3. no empate, o clube onde ele tem a força maior.
// Nomes de uma palavra só ("Bento", "Ewerton") ficam: podem ser pessoas diferentes.
// Uso: npx tsx tools/elencos/repetidos.ts   (grava os arquivos e imprime quantos saíram de cada um)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

type J = { nome: string; idade: number; forca: number; posicao: string; nacionalidade?: string };
const raiz = "data";
const arquivos = readdirSync(raiz).filter((x) => !x.includes(".")).flatMap((p) => readdirSync(`${raiz}/${p}`).filter((a) => /^jogadores.*\.json$/.test(a)).map((a) => `${raiz}/${p}/${a}`));
const textos = new Map(arquivos.map((a) => [a, readFileSync(a, "utf8")]));
const dados = new Map(arquivos.map((a) => [a, JSON.parse(textos.get(a)!) as { elencos: Record<string, J[]> }]));

const daSerie = new Set<string>([
  ...JSON.parse(readFileSync(`${raiz}/brasil-2026/clubes.json`, "utf8")).clubes.map((c: { id: string }) => c.id),
  ...JSON.parse(readFileSync(`${raiz}/brasil-2026/serie-d-reserva.json`, "utf8")).clubes.map((c: { id: string }) => c.id),
]);
const TRANSFERMARKT = new Set([`${raiz}/europa-2026/jogadores.json`, `${raiz}/europa-2026/jogadores-outros.json`, `${raiz}/asia-2026/jogadores.json`]);
const confianca = (arq: string, clube: string) =>
  TRANSFERMARKT.has(arq) || (arq.endsWith("brasil-2026/jogadores.json") && daSerie.has(clube)) ? 2 : 1;

const convocados = new Set<string>();
for (const s of Object.values(JSON.parse(readFileSync(`${raiz}/selecoes-2026/convocados.json`, "utf8")).selecoes) as { convocados: { clubeDoJogo?: string; noJogo?: string; nome: string }[] }[]) {
  for (const c of s.convocados) if (c.clubeDoJogo) convocados.add(`${c.clubeDoJogo}|${c.noJogo ?? c.nome}`);
}

// País de cada clube (para a nacionalidade de quem não tem a dele na lista): o do Brasil é "BRA".
import { PAISES } from "../../src/engine/torneios";
const paisDoClube = new Map<string, string>();
for (const p of readdirSync(raiz).filter((x) => !x.includes("."))) for (const a of readdirSync(`${raiz}/${p}`).filter((x) => /^clubes.*\.json$/.test(x))) {
  for (const c of JSON.parse(readFileSync(`${raiz}/${p}/${a}`, "utf8")).clubes ?? []) if (c.pais) paisDoClube.set(c.id, c.pais);
}
const nacionalidade = (clube: string, j: J) => j.nacionalidade ?? (paisDoClube.has(clube) ? PAISES[paisDoClube.get(clube)!]?.nacionalidade ?? paisDoClube.get(clube)! : "BRA");

type Lugar = { arq: string; clube: string; j: J };
const porNome = new Map<string, Lugar[]>();
for (const [arq, d] of dados) for (const [clube, js] of Object.entries(d.elencos)) for (const j of js) {
  if (!j.nome.includes(" ")) continue;
  const chave = `${j.nome}|${nacionalidade(clube, j)}`;
  porNome.set(chave, [...(porNome.get(chave) ?? []), { arq, clube, j }]);
}

const sai = new Set<J>();
const exemplos: string[] = [];
for (const [chave, lugares] of porNome) {
  const nome = chave.split("|")[0];
  if (new Set(lugares.map((l) => l.clube)).size < 2) continue;
  // Grupos da mesma pessoa: idades a até 1 ano uma da outra (em ordem de idade).
  const ordem = [...lugares].sort((a, b) => a.j.idade - b.j.idade);
  const grupos: Lugar[][] = [];
  for (const l of ordem) {
    const g = grupos[grupos.length - 1];
    if (g && l.j.idade - g[g.length - 1].j.idade <= 1) g.push(l);
    else grupos.push([l]);
  }
  for (const g of grupos) {
    if (new Set(g.map((l) => l.clube)).size < 2) continue;
    const nota = (l: Lugar) => (convocados.has(`${l.clube}|${nome}`) ? 100 : 0) + confianca(l.arq, l.clube) * 10 + l.j.forca / 100;
    const fica = [...g].sort((a, b) => nota(b) - nota(a))[0];
    for (const l of g) if (l.clube !== fica.clube) sai.add(l.j);
    if (exemplos.length < 15) exemplos.push(`${nome}: fica em ${fica.clube}, sai de ${g.filter((l) => l.clube !== fica.clube).map((l) => l.clube).join(", ")}`);
  }
}

for (const [arq, d] of dados) {
  let n = 0;
  for (const [clube, js] of Object.entries(d.elencos)) {
    const resto = js.filter((j) => !sai.has(j));
    n += js.length - resto.length;
    d.elencos[clube] = resto;
  }
  if (!n) continue;
  const texto = textos.get(arq)!;
  const compacto = !texto.trim().includes("\n");
  writeFileSync(arq, (compacto ? JSON.stringify(d) : JSON.stringify(d, null, 1)) + (texto.endsWith("\n") ? "\n" : ""));
  console.log(`${arq}: saíram ${n}`);
}
// A lista das cópias tiradas (clube|nome), para o save começado tirar as mesmas (tirarRepetidos em jogo.ts).
const arqRemovidos = `${raiz}/repetidos-removidos.json`;
const removidos = new Set<string>(JSON.parse(readFileSync(arqRemovidos, "utf8")).removidos);
for (const [chave, lugares] of porNome) for (const l of lugares) if (sai.has(l.j)) removidos.add(`${l.clube}|${chave.split("|")[0]}`);
writeFileSync(arqRemovidos, JSON.stringify({ descricao: JSON.parse(readFileSync(arqRemovidos, "utf8")).descricao, removidos: [...removidos].sort() }, null, 0) + "\n");
console.log(`Total: ${sai.size}`);
console.log(exemplos.join("\n"));
