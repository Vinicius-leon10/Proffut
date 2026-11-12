// Troca os elencos de clubes brasileiros em data/brasil-2026/jogadores.json pela lista do Transfermarkt que o Claude
// do computador do usuário manda nos lotes de jogadores (pasta lotes/ da branch: jogadores-lote-NN.csv, com
// clube_id, nome, posicao, nascimento, nacionalidade, camisa, fonte; posição já no código do jogo: G, L, Z, M, A).
//
//   npx tsx tools/elencos/transfermarkt.ts <arquivo.csv> [<arquivo.csv>...]
//
// A força continua nossa. Quem já estava no clube (mesmo nome) fica com a força e o pé que tinha; quem veio de outro
// clube brasileiro do jogo traz a força de lá (dentro da faixa do clube novo, com folga); quem não está no jogo ganha
// uma força dentro da faixa do clube pela idade (o auge entre 24 e 31) e pelo número da camisa (1 a 11 costuma ser
// titular), sempre abaixo da metade de cima da faixa: quem chega sem histórico não vira titular de cara.
// O elenco fica com no máximo TAMANHO jogadores (o mínimo de cada posição garantido, no máximo 4 goleiros); a lista do
// Transfermarkt traz todos os inscritos da temporada, e os cortados são os de menor força.

import { readFileSync, writeFileSync } from "node:fs";
import { formatarNome, normalizar } from "./sumulas";
import type { JogadorReal, Pos } from "./montar";

const DATA_INICIO = "2026-03-28";
const TAMANHO = 30;
const MINIMO: Record<Pos, number> = { G: 3, L: 4, Z: 5, M: 7, A: 5 };
const MAXIMO_GOLEIROS = 4;
const ORDEM: Pos[] = ["G", "L", "Z", "M", "A"];

/** Nome do país no Transfermarkt (em português) → código do jogo. Brasil fica sem código, como no resto do arquivo. */
export const PAIS_TM: Record<string, string> = {
  Argentina: "ARG", Uruguai: "URU", "Colômbia": "COL", Paraguai: "PAR", Venezuela: "VEN", Portugal: "POR", Senegal: "SEN",
  "Perú": "PER", Peru: "PER", "Guiné Bissau": "GNB", "Guiné-Bissau": "GNB", Gana: "GAN", Equador: "EQU", "Cabo Verde": "CPV",
  Angola: "ANG", Chile: "CHI", "Bolívia": "BOL", Espanha: "ESP", "Itália": "ITA", "França": "FRA", Alemanha: "ALE",
  Holanda: "HOL", "Bélgica": "BEL", "Estados Unidos": "EUA", "México": "MEX", "Costa Rica": "CRC", "Panamá": "PAN",
  Honduras: "HON", Haiti: "HAI", "Japão": "JAP", "Nigéria": "NGA", "Camarões": "CMR", "Costa do Marfim": "CIV",
  Marrocos: "MAR", "Moçambique": "MOC",
};

interface Linha { clube_id: string; nome: string; posicao: string; nascimento: string; nacionalidade: string; camisa: string }

export function lerCsv(texto: string): Linha[] {
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).map((l) => {
    const campos: string[] = [];
    let campo = "", aspas = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (aspas) { if (c === '"' && l[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c; }
      else if (c === '"') aspas = true;
      else if (c === ",") { campos.push(campo); campo = ""; }
      else campo += c;
    }
    campos.push(campo);
    return campos;
  });
  const [cab, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cab.map((c, i) => [c, (l[i] ?? "").trim()])) as unknown as Linha);
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

function idadeEm(nascimento: string): number | undefined {
  const m = nascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const [a, me, d] = DATA_INICIO.split("-").map(Number);
  return a - Number(m[1]) - (me < Number(m[2]) || (me === Number(m[2]) && d < Number(m[3])) ? 1 : 0);
}

/** Peso da idade para a força de quem chega sem histórico: 0 aos 17, 1 dos 24 aos 31, caindo depois. */
function pesoIdade(idade: number): number {
  if (idade <= 17) return 0;
  if (idade < 24) return (idade - 17) / 7;
  if (idade <= 31) return 1;
  return Math.max(0.4, 1 - (idade - 31) * 0.12);
}

export function trocarElencos(
  elencos: Record<string, JogadorReal[]>,
  clubes: { id: string; forcaElenco: { min: number; max: number } }[],
  linhas: Linha[],
) {
  const faixa = new Map(clubes.map((c) => [c.id, c.forcaElenco]));
  // Quem já está no jogo, pelo nome: primeiro no próprio clube, depois em qualquer clube brasileiro.
  const noJogo = new Map<string, { clube: string; j: JogadorReal }[]>();
  for (const [clube, lista] of Object.entries(elencos)) for (const j of lista) {
    const k = normalizar(j.nome);
    noJogo.set(k, [...(noJogo.get(k) ?? []), { clube, j }]);
  }
  const antigos = new Map(Object.entries(elencos));
  const porClube = new Map<string, Linha[]>();
  for (const l of linhas) if (l.clube_id && l.nome) porClube.set(l.clube_id, [...(porClube.get(l.clube_id) ?? []), l]);
  const relatorio: string[] = [];
  const novos: Record<string, JogadorReal[]> = {};
  for (const [clube, lista] of porClube) {
    const f = faixa.get(clube);
    if (!f) throw new Error(`Clube desconhecido na lista: ${clube}`);
    const { min, max } = f;
    let mesmos = 0, deOutro = 0, semHistorico = 0;
    const candidatos = lista.filter((l) => ORDEM.includes(l.posicao as Pos)).map((l) => {
      const chave = normalizar(l.nome);
      const nasc = idadeEm(l.nascimento);
      const idadeBate = (j: JogadorReal) => nasc === undefined || Math.abs(j.idade - nasc) <= 1;
      // No próprio clube: o mesmo nome, ou um que começa o outro ("Pierre" e "Pierre Wagner"), na mesma posição.
      const comeca = (a: string, b: string) => a === b || b.startsWith(a + " ") || a.startsWith(b + " ");
      const doClube = (antigos.get(clube) ?? []).filter((j) => comeca(normalizar(j.nome), chave) && j.posicao === l.posicao && idadeBate(j));
      const aqui = doClube.length === 1 ? { clube, j: doClube[0] } : undefined;
      // De outro clube: só com o nome exato, único no jogo, na mesma posição e com a idade batendo.
      const achados = (noJogo.get(chave) ?? []).filter((a) => a.clube !== clube);
      const fora = !aqui && achados.length === 1 && achados[0].j.posicao === l.posicao && idadeBate(achados[0].j) ? achados[0] : undefined;
      const idade = nasc ?? aqui?.j.idade ?? fora?.j.idade ?? 24;
      let forca: number;
      let lado = (aqui ?? fora)?.j.lado;
      if (aqui) { forca = aqui.j.forca; mesmos++; }
      else if (fora) { forca = Math.max(min, Math.min(max + 3, fora.j.forca)); deOutro++; }
      else {
        const camisa = Number(l.camisa);
        const titular = camisa >= 1 && camisa <= 11 ? 1 : camisa > 0 && camisa <= 30 ? 0.6 : 0.3;
        const relevancia = 0.15 + 0.45 * (0.6 * pesoIdade(idade) + 0.4 * titular);
        forca = Math.round(min + (max - min) * relevancia + (hash(clube + chave) - 0.5) * 4);
        semHistorico++;
      }
      lado ??= hash(clube + chave + "l") < 0.5 ? "D" : "E";
      const pais = l.nacionalidade && l.nacionalidade !== "Brasil" ? PAIS_TM[l.nacionalidade] : undefined;
      if (l.nacionalidade && l.nacionalidade !== "Brasil" && !pais) throw new Error(`País sem código: ${l.nacionalidade}`);
      const jogador: JogadorReal = {
        nome: formatarNome(l.nome), posicao: l.posicao as Pos, lado, idade: Math.max(16, Math.min(42, idade)),
        forca: Math.max(1, Math.min(99, forca)), ...(pais ? { nacionalidade: pais } : {}),
      };
      return jogador;
    });
    // Corta para o tamanho, guardando o mínimo por posição e no máximo 4 goleiros.
    const ordenados = [...candidatos].sort((a, b) => b.forca - a.forca);
    const escolhidos: JogadorReal[] = [];
    for (const p of ORDEM) escolhidos.push(...ordenados.filter((j) => j.posicao === p).slice(0, MINIMO[p]));
    for (const j of ordenados) {
      if (escolhidos.length >= TAMANHO || escolhidos.includes(j)) continue;
      if (j.posicao === "G" && escolhidos.filter((x) => x.posicao === "G").length >= MAXIMO_GOLEIROS) continue;
      escolhidos.push(j);
    }
    // A força do time fica como era: a ordem de cima (força de antes, de outro clube ou estimada) recebe as forças
    // que o elenco antigo tinha, do melhor ao pior (goleiros entre si). Sem isso, a Série B ficava ~5 pontos mais fraca
    // nos 11 melhores, porque quem chega sem histórico fica de propósito no meio da faixa.
    const velhos = antigos.get(clube) ?? [];
    for (const goleiro of [true, false]) {
      const grupo = escolhidos.filter((j) => (j.posicao === "G") === goleiro).sort((a, b) => b.forca - a.forca);
      const antes = velhos.filter((j) => (j.posicao === "G") === goleiro).map((j) => j.forca).sort((a, b) => b - a);
      if (antes.length < 2) continue;
      grupo.forEach((j, i) => { j.forca = antes[Math.round((i * (antes.length - 1)) / Math.max(1, grupo.length - 1))]; });
    }
    escolhidos.sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca);
    novos[clube] = escolhidos;
    relatorio.push(`${clube}: ${escolhidos.length} de ${lista.length} (${ORDEM.map((p) => `${p} ${escolhidos.filter((j) => j.posicao === p).length}`).join(", ")}) · já no clube ${mesmos}, de outro clube ${deOutro}, sem histórico ${semHistorico}`);
  }
  return { elencos: { ...elencos, ...novos }, relatorio };
}

if (/elencos[\\/]transfermarkt\.ts$/.test(process.argv[1] ?? "")) {
  const arquivos = process.argv.slice(2);
  if (!arquivos.length) throw new Error("Uso: npx tsx tools/elencos/transfermarkt.ts <arquivo.csv> [...]");
  const caminho = "data/brasil-2026/jogadores.json";
  const atual = JSON.parse(readFileSync(caminho, "utf8")) as { fonte: string; baixadoEm: string; elencos: Record<string, JogadorReal[]> };
  const clubes = (JSON.parse(readFileSync("data/brasil-2026/clubes.json", "utf8")) as { clubes: { id: string; forcaElenco: { min: number; max: number } }[] }).clubes;
  const linhas = arquivos.flatMap((a) => lerCsv(readFileSync(a, "utf8")));
  const { elencos, relatorio } = trocarElencos(atual.elencos, clubes, linhas);
  const fonte = atual.fonte.includes("Transfermarkt (elencos de 2026")
    ? atual.fonte
    : atual.fonte.replace(/\. Força calculada/, "; Transfermarkt (elencos de 2026 da Série B). Força calculada");
  writeFileSync(caminho, JSON.stringify({ ...atual, fonte, elencos }, null, 0) + "\n");
  console.log(relatorio.join("\n"));
}
