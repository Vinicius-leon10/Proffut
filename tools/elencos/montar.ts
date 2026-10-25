// Monta data/brasil-2026/jogadores.json com os elencos reais dos 60 clubes.
//
//   npx tsx tools/elencos/montar.ts <pasta com os dados do robô (branch dados-elencos)>
//
// Fontes (o robô .github/workflows/elencos.yml baixa todas):
//   - Cartola FC: elenco atual da Série A, com a posição de cada um.
//   - Súmulas da CBF (lidas pelo projeto BrazilianFootball/data, MIT): quem jogou em cada clube das Séries
//     B e C na temporada mais recente disponível, com escalações, substituições, camisas e goleiros.
//   - transfermarkt-datasets (CC0) e Wikidata (CC0): nascimento, posição, pé e nacionalidade.
// A força é nossa: a faixa do clube (clubes.json) e, dentro dela, quanto o jogador é usado e valorizado.
// Posição que nenhuma fonte informa é deduzida das escalações (inferirPosicoes); idade que nenhuma fonte
// informa é estimada pelo número de registro na CBF, que cresce com o tempo (estimarNascimento).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { FONTES_CLUBES } from "./fontes-clubes";
import { formatarNome, lerJogador, lerTroca, normalizar } from "./sumulas";

export type Pos = "G" | "L" | "Z" | "M" | "A";
type Lado = "D" | "E";
const LINHA: Pos[] = ["L", "Z", "M", "A"];

export interface JogadorReal {
  nome: string;
  posicao: Pos;
  lado: Lado;
  idade: number;
  forca: number;
  nacionalidade?: string;
}

interface FichaClube { id: string; nome: string; serie: string; forcaElenco: { min: number; max: number } }

const DATA_INICIO = "2026-03-28";
const TAMANHO_ELENCO = 28;
const MINIMO: Record<Pos, number> = { G: 3, L: 4, Z: 5, M: 7, A: 5 };
const MAXIMO_GOLEIROS = 4;

// ---- leitura ----------------------------------------------------------------------------

const lerGz = (arquivo: string) => gunzipSync(readFileSync(arquivo)).toString("utf8");

function lerCsv(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let campo = "", linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cabecalho, ...resto] = linhas;
  return resto.filter((l) => l.length === cabecalho.length).map((l) => Object.fromEntries(cabecalho.map((c, i) => [c, l[i]])));
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const maisFrequente = <T>(contagem: Map<T, number>): T | undefined => [...contagem].sort((a, b) => b[1] - a[1])[0]?.[0];

// ---- clubes nas fontes --------------------------------------------------------------------

/** Nome do clube em cada fonte → id do jogo. Clubes fora dos 60 ficam como "fora:<nome>". */
function mapaDeClubes() {
  const cbf = new Map<string, string>(), tm = new Map<string, string>(), wikidata = new Map<string, string>();
  const cartola = new Map<string, string>();
  for (const [id, f] of Object.entries(FONTES_CLUBES)) {
    for (const n of f.cbf) cbf.set(normalizar(n), id);
    if (f.tm) tm.set(normalizar(f.tm), id);
    for (const n of f.wikidata ?? []) wikidata.set(normalizar(n), id);
    if (f.cartola) cartola.set(f.cartola, id);
  }
  const achar = (mapa: Map<string, string>) => (nome: string) => mapa.get(normalizar(nome)) ?? `fora:${normalizar(nome)}`;
  return { cbf: achar(cbf), tm: achar(tm), wikidata: achar(wikidata), cartola };
}

// ---- nacionalidades ---------------------------------------------------------------------

/** País (como as fontes escrevem, em inglês ou português) → código usado no jogo. */
export const PAISES: Record<string, string> = {
  brazil: "BRA", brasil: "BRA", argentina: "ARG", uruguay: "URU", uruguai: "URU", colombia: "COL", paraguay: "PAR",
  paraguai: "PAR", chile: "CHI", ecuador: "EQU", equador: "EQU", venezuela: "VEN", peru: "PER", bolivia: "BOL",
  portugal: "POR", spain: "ESP", espanha: "ESP", italy: "ITA", italia: "ITA", france: "FRA", franca: "FRA",
  germany: "ALE", alemanha: "ALE", "united states": "EUA", "estados unidos": "EUA", mexico: "MEX", angola: "ANG",
  netherlands: "HOL", "paises baixos": "HOL", belgium: "BEL", belgica: "BEL", japan: "JAP", japao: "JAP",
  "costa rica": "CRC", panama: "PAN", honduras: "HON", haiti: "HAI", nigeria: "NGA", ghana: "GAN", gana: "GAN",
  cameroon: "CMR", camaroes: "CMR", "cote d ivoire": "CIV", "costa do marfim": "CIV", senegal: "SEN", morocco: "MAR",
  marrocos: "MAR", "cape verde": "CPV", "cabo verde": "CPV", mozambique: "MOC", mocambique: "MOC", "guinea bissau": "GNB",
};
const codigoPais = (pais?: string) => (pais ? PAISES[normalizar(pais.split(/[,;]/)[0])] : undefined);

// ---- posições das fontes ----------------------------------------------------------------

const POSICAO_CARTOLA: Record<number, Pos> = { 1: "G", 2: "L", 3: "Z", 4: "M", 5: "A" };

function posicaoTm(sub: string, geral: string): { posicao?: Pos; lado?: Lado } {
  if (/Goalkeeper/.test(sub) || geral === "Goalkeeper") return { posicao: "G" };
  if (sub === "Left-Back") return { posicao: "L", lado: "E" };
  if (sub === "Right-Back") return { posicao: "L", lado: "D" };
  if (sub === "Centre-Back") return { posicao: "Z" };
  if (/Midfield/.test(sub)) return { posicao: "M", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  if (/Winger|Forward|Striker/.test(sub)) return { posicao: "A", lado: /Left/.test(sub) ? "E" : /Right/.test(sub) ? "D" : undefined };
  if (geral === "Defender") return { posicao: "Z" };
  if (geral === "Midfield") return { posicao: "M" };
  if (geral === "Attack") return { posicao: "A" };
  return {};
}

function posicaoWikidata(rotulo: string): Pos | undefined {
  const r = normalizar(rotulo);
  if (/goleiro|goalkeeper/.test(r)) return "G";
  if (/lateral|full back|wing back/.test(r)) return "L";
  if (/zagueiro|defesa central|centre back|center back|defender|defensor/.test(r)) return "Z";
  if (/meio|volante|midfield|wing half|meia/.test(r)) return "M";
  if (/atacante|ponta|ponteiro|centroavante|forward|striker|winger/.test(r)) return "A";
  return undefined;
}

// ---- pessoas nas fontes e busca pelo nome ---------------------------------------------------

/** Uma pessoa numa fonte (Transfermarkt, Wikidata ou Cartola), com o clube já no id do jogo. */
export interface Pessoa {
  nomes: string[];
  clube: string;
  nascimento?: string;
  posicao?: Pos;
  lado?: Lado;
  pe?: string;
  pais?: string;
  valor?: number;
  fonte: "Transfermarkt" | "Wikidata" | "Cartola";
  /** Atleta do Cartola que esta pessoa representa. */
  chave?: string;
}

function carregarPessoas(dados: string, clubes: ReturnType<typeof mapaDeClubes>): Pessoa[] {
  const pessoas: Pessoa[] = [];
  const tm = join(dados, "transfermarkt-jogadores.csv.gz");
  if (existsSync(tm)) {
    for (const r of lerCsv(lerGz(tm))) {
      const { posicao, lado } = posicaoTm(r.sub_position, r.position);
      pessoas.push({
        nomes: [r.name, `${r.first_name} ${r.last_name}`.trim()].filter(Boolean),
        clube: clubes.tm(r.current_club_name),
        nascimento: r.date_of_birth?.slice(0, 10) || undefined,
        posicao, lado, pe: r.foot,
        pais: r.country_of_citizenship,
        valor: Number(r.market_value_in_eur) || undefined,
        fonte: "Transfermarkt",
      });
    }
  }
  const wd = join(dados, "wikidata-jogadores.json.gz");
  if (existsSync(wd)) {
    const linhas = JSON.parse(lerGz(wd)).results.bindings as Record<string, { value: string }>[];
    for (const l of linhas) {
      pessoas.push({
        nomes: [l.jogadorLabel?.value, l.nomeCompleto?.value].filter((n): n is string => !!n && !/^Q\d+$/.test(n)),
        clube: clubes.wikidata(l.clubeLabel?.value ?? ""),
        nascimento: l.nascimento?.value.slice(0, 10),
        posicao: l.posicaoLabel ? posicaoWikidata(l.posicaoLabel.value) : undefined,
        pais: l.paisLabel?.value,
        fonte: "Wikidata",
      });
    }
  }
  return pessoas;
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "del", "di", "la", "van", "von"]);

/** Palavras que identificam um nome (sem "de", "da"...; "Jr." vale "Júnior"). */
export function palavras(nome: string): string[] {
  return normalizar(nome).split(" ").filter((p) => p.length >= 2 && !PARTICULAS.has(p)).map((p) => (p === "jr" ? "junior" : p));
}

export interface Procura { apelido: string; nomeCompleto: string; nomeCortado: boolean; clubes: Set<string> }

/**
 * Acha uma pessoa nas fontes pelo nome. Notas: nome completo igual 4; todas as palavras de um nome
 * contidas no outro 3 (ou 2, se forem só duas palavras); apelido igual 2 (ou 1, se for uma palavra só);
 * mesmo clube +2. Precisa de 3. Empate entre pessoas de nascimentos diferentes: não usa nenhuma.
 */
export class Buscador {
  private porPalavra = new Map<string, number[]>();
  private nomes: { texto: string; palavras: string[] }[][];

  constructor(private pessoas: Pessoa[]) {
    this.nomes = pessoas.map((p) => p.nomes.map((n) => ({ texto: normalizar(n), palavras: palavras(n) })));
    this.nomes.forEach((nomes, i) => {
      for (const w of new Set(nomes.flatMap((n) => n.palavras))) {
        const lista = this.porPalavra.get(w) ?? [];
        lista.push(i);
        this.porPalavra.set(w, lista);
      }
    });
  }

  achar(q: Procura): Pessoa[] {
    const completo = normalizar(q.nomeCompleto);
    const apelido = normalizar(q.apelido);
    const doNome = palavras(q.nomeCompleto);
    const inteiras = q.nomeCortado ? doNome.slice(0, -1) : doNome;
    const parcial = q.nomeCortado ? doNome.at(-1) : undefined;
    const contem = (w: string) => inteiras.includes(w) || (!!parcial && parcial.length >= 3 && w.startsWith(parcial));
    const indices = new Set<number>();
    for (const w of [...inteiras, ...palavras(q.apelido)]) for (const i of this.porPalavra.get(w) ?? []) indices.add(i);

    const notas: [Pessoa, number][] = [];
    for (const i of indices) {
      let nota = 0;
      for (const n of this.nomes[i]) {
        let x = 0;
        if (!q.nomeCortado && doNome.length >= 2 && n.texto === completo) x = 4;
        else if (q.nomeCortado && completo.length >= 14 && n.texto.startsWith(completo)) x = 3;
        else if (n.palavras.length >= 2 && n.palavras.every(contem)) x = n.palavras.length >= 3 ? 3 : 2;
        else if (!q.nomeCortado && doNome.length >= 2 && doNome.every((w) => n.palavras.includes(w))) x = doNome.length >= 3 ? 3 : 2;
        if (n.texto === apelido) x = Math.max(x, apelido.includes(" ") ? 2 : 1);
        nota = Math.max(nota, x);
      }
      if (nota === 0) continue;
      if (q.clubes.has(this.pessoas[i].clube)) nota += 2;
      if (nota >= 3) notas.push([this.pessoas[i], nota]);
    }
    if (notas.length === 0) return [];
    const melhor = Math.max(...notas.map(([, n]) => n));
    const empatados = notas.filter(([, n]) => n === melhor).map(([p]) => p);
    const nascimentos = new Set(empatados.map((p) => p.nascimento).filter(Boolean));
    const cartola = new Set(empatados.map((p) => p.chave).filter(Boolean));
    if (nascimentos.size > 1 || cartola.size > 1) return [];
    // A mesma pessoa em outra fonte (mesmo nascimento), achada com nota menor, também vale.
    const [nascimento] = nascimentos;
    const mesma = nascimento ? notas.filter(([p, n]) => n < melhor && p.nascimento === nascimento).map(([p]) => p) : [];
    const ordem = { Cartola: 0, Transfermarkt: 1, Wikidata: 2 };
    return [...empatados, ...mesma].sort((a, b) => ordem[a.fonte] - ordem[b.fonte]);
  }
}

// ---- súmulas -------------------------------------------------------------------------------

interface Escalado { cbf: string; numero: number; titular: boolean }
/** Um clube num jogo: quem foi relacionado (titulares e reservas) e as substituições. */
export interface JogoDoClube { clube: string; ano: number; data: string; escalados: Escalado[]; trocas: { entra: string; sai: string }[] }
interface Aparicao { clube: string; ano: number; data: string; titular: boolean; entrou: boolean; saiu: boolean; gols: number; numero: number }
export interface NaSumula { cbf: string; apelidos: Map<string, number>; nomeCompleto: string; nomeCortado: boolean; goleiro: boolean; aparicoes: Aparicao[] }

interface JogoBruto { Date?: string; Players?: [string, string][]; Changes?: string[]; Goals?: string[] }

const CORTE_NO_FIM = /\s*\.\.\.$/;

/** Dois textos do mesmo nome, um talvez cortado: um começa como o outro. */
function compativel(a: string, b: string): boolean {
  const x = normalizar(a.replace(CORTE_NO_FIM, "")), y = normalizar(b.replace(CORTE_NO_FIM, ""));
  const n = Math.min(x.length, y.length);
  return n >= 5 && x.slice(0, n) === y.slice(0, n);
}

/** Fica com a versão mais completa do nome: inteira antes de cortada; entre iguais, a mais longa. */
function melhorarNome(reg: NaSumula, nome: string, cortado: boolean) {
  if (!nome) return;
  if (!reg.nomeCompleto || (reg.nomeCortado && !cortado) || (reg.nomeCortado === cortado && nome.length > reg.nomeCompleto.length)) {
    reg.nomeCompleto = nome;
    reg.nomeCortado = cortado;
  }
}

export function lerSumulas(arquivos: { ano: number; caminho: string }[], idDoClube: (nome: string) => string) {
  const jogadores = new Map<string, NaSumula>();
  const jogos: JogoDoClube[] = [];
  for (const { ano, caminho } of arquivos) {
    const brutos = JSON.parse(lerGz(caminho)) as Record<string, JogoBruto | null>;
    for (const jogo of Object.values(brutos)) {
      if (!jogo?.Players?.length || !jogo.Date) continue;
      const [d, m, a] = jogo.Date.split("/");
      const data = `${a}-${m}-${d}`;
      const lados = new Map<string, JogoDoClube>();
      for (const [texto, nomeClube] of jogo.Players) {
        const j = lerJogador(texto);
        if (!j) continue;
        const clube = idDoClube(nomeClube);
        let lado = lados.get(clube);
        if (!lado) { lado = { clube, ano, data, escalados: [], trocas: [] }; lados.set(clube, lado); }
        lado.escalados.push({ cbf: j.cbf, numero: j.numero, titular: j.titular });
        let reg = jogadores.get(j.cbf);
        if (!reg) { reg = { cbf: j.cbf, apelidos: new Map(), nomeCompleto: "", nomeCortado: true, goleiro: false, aparicoes: [] }; jogadores.set(j.cbf, reg); }
        reg.apelidos.set(j.apelido, (reg.apelidos.get(j.apelido) ?? 0) + 1);
        melhorarNome(reg, j.nomeCompleto, /\.\.\.\s*[TR](\(g\))?[PA]\s*\d{6}$/.test(texto));
        reg.goleiro ||= j.goleiro;
        reg.aparicoes.push({ clube, ano, data, titular: j.titular, entrou: false, saiu: false, gols: 0, numero: j.numero });
      }
      // Substituição: é do lado em que os dois números existem e os nomes batem. Ela traz o nome inteiro.
      for (const texto of jogo.Changes ?? []) {
        const t = lerTroca(texto);
        if (!t) continue;
        let achada: { lado: JogoDoClube; entra: NaSumula; sai: NaSumula; nota: number } | undefined;
        for (const lado of lados.values()) {
          const entra = jogadores.get(lado.escalados.find((e) => e.numero === t.entra)?.cbf ?? "");
          const sai = jogadores.get(lado.escalados.find((e) => e.numero === t.sai)?.cbf ?? "");
          if (!entra || !sai) continue;
          const nota = Number(compativel(entra.nomeCompleto, t.nomeEntra)) + Number(compativel(sai.nomeCompleto, t.nomeSai));
          if (nota > (achada?.nota ?? 0)) achada = { lado, entra, sai, nota };
        }
        if (!achada) continue;
        const { lado, entra, sai } = achada;
        lado.trocas.push({ entra: entra.cbf, sai: sai.cbf });
        const entrou = entra.aparicoes.findLast((x) => x.data === data && x.clube === lado.clube);
        if (entrou) entrou.entrou = true;
        const saiu = sai.aparicoes.findLast((x) => x.data === data && x.clube === lado.clube);
        if (saiu) saiu.saiu = true;
        for (const [reg, nome] of [[entra, t.nomeEntra], [sai, t.nomeSai]] as const) {
          if (compativel(reg.nomeCompleto, nome)) melhorarNome(reg, formatarNome(nome.replace(CORTE_NO_FIM, "")), CORTE_NO_FIM.test(nome));
        }
      }
      // Gols (fora pênalti e gol contra): "03:00 1T32NRJose Rodrigo Andrade Ramos Goiás/GO".
      for (const texto of jogo.Goals ?? []) {
        const g = /^\s*\+?\d+(?::\d+)?\s*(?:\dT|INT)?\s*(\d+)(NR|FT)(.+)$/.exec(texto);
        if (!g) continue;
        for (const lado of lados.values()) {
          const autor = jogadores.get(lado.escalados.find((e) => e.numero === Number(g[1]))?.cbf ?? "");
          if (!autor || !compativel(autor.nomeCompleto, g[3])) continue;
          const aparicao = autor.aparicoes.findLast((x) => x.data === data && x.clube === lado.clube);
          if (aparicao) aparicao.gols++;
          break;
        }
      }
      jogos.push(...lados.values());
    }
  }
  return { jogadores, jogos };
}

// ---- posição deduzida das escalações ---------------------------------------------------------
//
// Cada pista vira uma probabilidade aprendida com os jogadores de posição conhecida (classificador
// "ingênuo" de Bayes), e as escalações de cada jogo ajustam o conjunto:
//  - número da camisa (2 lateral direito, 3 e 4 zagueiros, 9 centroavante... e os números altos também);
//  - quanto sai substituído (zagueiro quase nunca, atacante muito), quanto entra e quantos gols faz;
//  - substituições: quem entra costuma ocupar a posição de quem sai;
//  - formação: os 10 titulares de linha de cada jogo formam algo como 4-4-2, 4-3-3 ou 3-5-2.
// Jogos em que os titulares usam exatamente os números de 1 a 11 não contam para a camisa: neles o
// número é só a ordem da lista.

/** Lado de quem usa as camisas que indicam lado (2 e 7 direita, 6 e 11 esquerda). */
const LADO_NUMERO: Record<number, Lado> = { 2: "D", 7: "D", 6: "E", 11: "E" };

/** Formações que os 10 titulares de linha costumam formar (laterais, zagueiros, meias, atacantes). */
const FORMATOS: [number, number, number, number][] = [[2, 2, 4, 2], [2, 2, 3, 3], [2, 2, 5, 1], [2, 3, 3, 2], [2, 3, 2, 3], [2, 3, 4, 1]];

/** Peso de cada pista (multiplica o logaritmo da probabilidade). */
export interface PesosPosicao { camisa: number; saidas: number; entradas: number; gols: number; troca: number; formacao: number }
export const PESOS: PesosPosicao = { camisa: 1, saidas: 1, entradas: 1, gols: 1, troca: 0.5, formacao: 0.5 };

/** Faixas das taxas por jogador (quem tem poucos jogos fica sem faixa: a taxa diria pouco). */
const FAIXAS_SAIDA = [0.1, 0.25, 0.45, 0.65];
const FAIXAS_ENTRADA = [0.1, 0.25, 0.45];
const FAIXAS_GOL = [0.001, 0.06, 0.15, 0.3];
const faixa = (valor: number, limites: number[]) => limites.filter((l) => valor >= l).length;

/** O que as súmulas dizem de cada jogador, em faixas, para a dedução da posição. */
interface Pistas { camisa?: number; saida?: number; entrada?: number; gol?: number; lado?: Lado }

function juntarPistas(jogos: JogoDoClube[], jogadores: Map<string, NaSumula>): Map<string, Pistas> {
  const camisas = new Map<string, Map<number, number>>();
  for (const jogo of jogos) {
    const numeros = jogo.escalados.filter((e) => e.titular).map((e) => e.numero).sort((a, b) => a - b);
    if (numeros.length === 11 && numeros.every((n, i) => n === i + 1)) continue;
    for (const e of jogo.escalados) {
      const m = camisas.get(e.cbf) ?? new Map<number, number>();
      m.set(e.numero, (m.get(e.numero) ?? 0) + 1);
      camisas.set(e.cbf, m);
    }
  }
  const pistas = new Map<string, Pistas>();
  for (const reg of jogadores.values()) {
    let titular = 0, saiu = 0, jogos = 0, entrou = 0, gols = 0;
    for (const a of reg.aparicoes) {
      titular += Number(a.titular);
      saiu += Number(a.titular && a.saiu);
      entrou += Number(a.entrou);
      jogos += Number(a.titular || a.entrou);
      gols += a.gols;
    }
    const camisa = camisas.has(reg.cbf) ? maisFrequente(camisas.get(reg.cbf)!) : undefined;
    pistas.set(reg.cbf, {
      camisa,
      lado: camisa !== undefined ? LADO_NUMERO[camisa] : undefined,
      saida: titular >= 4 ? faixa(saiu / titular, FAIXAS_SAIDA) : undefined,
      entrada: jogos >= 4 ? faixa(entrou / jogos, FAIXAS_ENTRADA) : undefined,
      gol: jogos >= 5 ? faixa(gols / jogos, FAIXAS_GOL) : undefined,
    });
  }
  return pistas;
}

const zeros = (): Record<Pos, number> => ({ G: 0, L: 0, Z: 0, M: 0, A: 0 });

/**
 * Probabilidades aprendidas com os jogadores de posição conhecida, já em logaritmo. Para cada pista,
 * log P(valor | posição); a camisa é suavizada em direção à distribuição geral (camisa rara não puxa).
 */
function aprender(pistas: Map<string, Pistas>, jogos: JogoDoClube[], treino: Map<string, Pos>) {
  const n = zeros();
  const contagens = { camisa: new Map<number, Record<Pos, number>>(), saida: new Map<number, Record<Pos, number>>(), entrada: new Map<number, Record<Pos, number>>(), gol: new Map<number, Record<Pos, number>>() };
  for (const [c, p] of treino) {
    if (p === "G") continue;
    n[p]++;
    const x = pistas.get(c);
    if (!x) continue;
    for (const k of ["camisa", "saida", "entrada", "gol"] as const) {
      const v = x[k];
      if (v === undefined) continue;
      const r = contagens[k].get(v) ?? zeros();
      r[p]++;
      contagens[k].set(v, r);
    }
  }
  const total = LINHA.reduce((s, p) => s + n[p], 0);
  const priori = zeros();
  for (const p of LINHA) priori[p] = Math.log((n[p] + 1) / (total + 4));
  // log P(valor | p) − log P(valor): positivo puxa para p.
  const tabela = (mapa: Map<number, Record<Pos, number>>, suavizar: number) => {
    const comValor = zeros();
    for (const r of mapa.values()) for (const p of LINHA) comValor[p] += r[p];
    const todos = LINHA.reduce((s, p) => s + comValor[p], 0);
    const saida = new Map<number, Record<Pos, number>>();
    for (const [v, r] of mapa) {
      const soma = LINHA.reduce((s, p) => s + r[p], 0);
      const log = zeros();
      for (const p of LINHA) {
        const geral = comValor[p] / Math.max(1, todos);
        log[p] = Math.log((r[p] + suavizar * geral) / (soma + suavizar) / Math.max(geral, 1e-6));
      }
      saida.set(v, log);
    }
    return saida;
  };
  const pares: Record<Pos, Record<Pos, number>> = { G: zeros(), L: zeros(), Z: zeros(), M: zeros(), A: zeros() };
  for (const jogo of jogos) {
    for (const t of jogo.trocas) {
      const e = treino.get(t.entra), s = treino.get(t.sai);
      if (e && s && e !== "G" && s !== "G") pares[s][e]++;
    }
  }
  // log P(quem entra é e | quem sai é s) − log P(e): positivo quando a troca é comum.
  const troca: Record<Pos, Record<Pos, number>> = { G: zeros(), L: zeros(), Z: zeros(), M: zeros(), A: zeros() };
  for (const s of LINHA) {
    const soma = LINHA.reduce((x, e) => x + pares[s][e] + 1, 0);
    for (const e of LINHA) troca[s][e] = Math.log((pares[s][e] + 1) / soma) - priori[e];
  }
  return { priori, camisa: tabela(contagens.camisa, 3), saida: tabela(contagens.saida, 2), entrada: tabela(contagens.entrada, 2), gol: tabela(contagens.gol, 2), troca };
}

/**
 * Deduz a posição de quem não está em `ancoras`, com probabilidades aprendidas em `treino`.
 * Começa pela posição mais provável de cada um sozinho e troca a de um jogador por vez enquanto o
 * conjunto (trocas e formações) melhora, sempre na mesma ordem: mesmo resultado a cada execução.
 */
export function inferirPosicoes(jogos: JogoDoClube[], jogadores: Map<string, NaSumula>, ancoras: Map<string, Pos>, treino = ancoras, pesos: PesosPosicao = PESOS) {
  const pistas = juntarPistas(jogos, jogadores);
  const modelo = aprender(pistas, jogos, treino);

  // Parte de cada jogador sozinho: priori, camisa, saídas, entradas e gols.
  const sozinho = new Map<string, Record<Pos, number>>();
  for (const [c, x] of pistas) {
    if (ancoras.has(c)) continue;
    const ll = zeros();
    for (const p of LINHA) {
      ll[p] = modelo.priori[p]
        + pesos.camisa * (x.camisa !== undefined ? modelo.camisa.get(x.camisa)?.[p] ?? 0 : 0)
        + pesos.saidas * (x.saida !== undefined ? modelo.saida.get(x.saida)?.[p] ?? 0 : 0)
        + pesos.entradas * (x.entrada !== undefined ? modelo.entrada.get(x.entrada)?.[p] ?? 0 : 0)
        + pesos.gols * (x.gol !== undefined ? modelo.gol.get(x.gol)?.[p] ?? 0 : 0);
    }
    sozinho.set(c, ll);
  }

  // Jogos com 11 titulares, contando quantos de cada posição de linha estão em campo.
  const indice = new Map<string, number>();
  const desconhecidos = [...sozinho.keys()];
  const todos = [...new Set([...desconhecidos, ...ancoras.keys()])];
  todos.forEach((c, i) => indice.set(c, i));
  const posicao = new Int8Array(todos.length).fill(-1);
  const POS_INDICE: Record<Pos, number> = { L: 0, Z: 1, M: 2, A: 3, G: 4 };
  for (const [c, p] of ancoras) posicao[indice.get(c)!] = POS_INDICE[p];
  for (const c of desconhecidos) {
    const ll = sozinho.get(c)!;
    posicao[indice.get(c)!] = POS_INDICE[LINHA.reduce((a, b) => (ll[b] > ll[a] ? b : a))];
  }
  const escalacoes: number[][] = [];
  const jogosDe = new Map<number, number[]>();
  const parceiros = new Map<number, { outro: number; entrou: boolean }[]>();
  const ligar = (c: number, outro: number, entrou: boolean) => {
    const lista = parceiros.get(c) ?? [];
    lista.push({ outro, entrou });
    parceiros.set(c, lista);
  };
  for (const jogo of jogos) {
    const titulares = jogo.escalados.filter((e) => e.titular && indice.has(e.cbf)).map((e) => indice.get(e.cbf)!);
    if (titulares.length === 11) {
      const g = escalacoes.length;
      escalacoes.push(titulares);
      for (const c of titulares) jogosDe.set(c, [...(jogosDe.get(c) ?? []), g]);
    }
    for (const t of jogo.trocas) {
      const e = indice.get(t.entra), s = indice.get(t.sai);
      if (e === undefined || s === undefined) continue;
      ligar(e, s, true);
      ligar(s, e, false);
    }
  }
  const contagem = new Int8Array(escalacoes.length * 5);
  escalacoes.forEach((titulares, g) => { for (const c of titulares) contagem[g * 5 + posicao[c]]++; });
  const desvioDoJogo = (g: number) => {
    const b = g * 5;
    let menor = Infinity;
    for (const f of FORMATOS) {
      menor = Math.min(menor, Math.abs(contagem[b] - f[0]) + Math.abs(contagem[b + 1] - f[1]) + Math.abs(contagem[b + 2] - f[2]) + Math.abs(contagem[b + 3] - f[3]));
    }
    return menor / 2;
  };

  const custo = (c: number, ll: Record<Pos, number>, p: number) => {
    let total = -ll[LINHA[p]];
    for (const { outro, entrou } of parceiros.get(c) ?? []) {
      const q = posicao[outro];
      if (q < 0 || q > 3) continue;
      total -= pesos.troca * (entrou ? modelo.troca[LINHA[q]][LINHA[p]] : modelo.troca[LINHA[p]][LINHA[q]]);
    }
    const antes = posicao[c];
    for (const g of jogosDe.get(c) ?? []) {
      contagem[g * 5 + antes]--;
      contagem[g * 5 + p]++;
      total += pesos.formacao * desvioDoJogo(g);
      contagem[g * 5 + p]--;
      contagem[g * 5 + antes]++;
    }
    return total;
  };
  const ordem = desconhecidos.map((c) => indice.get(c)!).sort((a, b) => (jogosDe.get(b)?.length ?? 0) - (jogosDe.get(a)?.length ?? 0) || todos[a].localeCompare(todos[b]));
  for (let volta = 0; volta < 30; volta++) {
    let mudou = 0;
    for (const c of ordem) {
      const ll = sozinho.get(todos[c])!;
      const atual = posicao[c];
      let melhor = atual, menor = custo(c, ll, atual);
      for (let p = 0; p < 4; p++) {
        const x = custo(c, ll, p);
        if (x < menor - 1e-9) { menor = x; melhor = p; }
      }
      if (melhor !== atual) {
        for (const g of jogosDe.get(c) ?? []) { contagem[g * 5 + atual]--; contagem[g * 5 + melhor]++; }
        posicao[c] = melhor;
        mudou++;
      }
    }
    if (mudou === 0) break;
  }

  // Custo final de cada posição (com os outros parados): diz quanto pior seria cada alternativa.
  const custos = new Map<string, Record<Pos, number>>();
  for (const c of ordem) {
    const r = zeros();
    LINHA.forEach((p, i) => { r[p] = custo(c, sozinho.get(todos[c])!, i); });
    r.G = Infinity;
    custos.set(todos[c], r);
  }
  return { posicoes: new Map(desconhecidos.map((c) => [c, LINHA[posicao[indice.get(c)!]]])), custos };
}

/** Lado indicado pela camisa mais usada (2 e 7 direita, 6 e 11 esquerda), de todos os jogadores das súmulas. */
export function ladosPelaCamisa(jogos: JogoDoClube[], jogadores: Map<string, NaSumula>): Map<string, Lado> {
  const lados = new Map<string, Lado>();
  for (const [c, x] of juntarPistas(jogos, jogadores)) if (x.lado) lados.set(c, x.lado);
  return lados;
}

/**
 * Confere a dedução com quem tem posição conhecida, em 5 rodadas: em cada uma, um quinto deles fica
 * escondido para ser deduzido; as probabilidades são aprendidas com o resto, e só 1 em cada 5 do resto
 * entra como posição conhecida nas escalações (proporção parecida com a das Séries B e C).
 */
export function conferirPosicoes(jogos: JogoDoClube[], jogadores: Map<string, NaSumula>, conhecidas: Map<string, Pos>, pesos: PesosPosicao = PESOS) {
  let certas = 0, total = 0, certasTitulares = 0, totalTitulares = 0;
  const confusao = new Map<string, number>();
  // Conta só quem jogou na temporada mais recente (são esses que vão para os elencos).
  const ultimoAno = Math.max(...jogos.map((j) => j.ano));
  const titularidades = new Map<string, number>();
  for (const reg of jogadores.values()) {
    if (reg.aparicoes.some((a) => a.ano === ultimoAno)) titularidades.set(reg.cbf, reg.aparicoes.filter((a) => a.titular && a.ano === ultimoAno).length);
  }
  for (let rodada = 0; rodada < 5; rodada++) {
    const grupo = (c: string) => Math.floor(hash(`grupo:${c}`) * 5);
    const treino = new Map([...conhecidas].filter(([c, p]) => p === "G" || grupo(c) !== rodada));
    const ancoras = new Map([...treino].filter(([c, p]) => p === "G" || hash(`ancora:${c}`) < 0.2));
    const deduzidas = inferirPosicoes(jogos, jogadores, ancoras, treino, pesos).posicoes;
    for (const [c, p] of conhecidas) {
      if (p === "G" || grupo(c) !== rodada || !titularidades.has(c)) continue;
      const d = deduzidas.get(c);
      if (!d) continue;
      total++;
      if (d === p) certas++;
      if ((titularidades.get(c) ?? 0) >= 10) { totalTitulares++; if (d === p) certasTitulares++; }
      confusao.set(`${p}→${d}`, (confusao.get(`${p}→${d}`) ?? 0) + 1);
    }
  }
  return { certas, total, certasTitulares, totalTitulares, confusao };
}

// ---- idade --------------------------------------------------------------------------------

function idadeEm(nascimento: string): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ra, rm, rd] = DATA_INICIO.split("-").map(Number);
  return ra - a - (rm < m || (rm === m && rd < d) ? 1 : 0);
}

const anoDecimal = (data: string) => {
  const [a, m, d] = data.split("-").map(Number);
  return a + (m - 1) / 12 + (d - 1) / 365;
};

/**
 * O número de registro na CBF é dado em ordem, quase sempre ainda na base: quanto maior, mais novo o
 * jogador (estrangeiros e quem se registra adulto ganham números altos, e as faixas mostram isso).
 * Com os nascimentos conhecidos, monta faixas de números e a mediana do nascimento em cada uma.
 * O erro típico é medido fora da amostra: ajusta com metade e confere com a outra metade.
 */
export function estimarNascimento(conhecidos: { cbf: string; nascimento: string }[]) {
  const pontos = conhecidos.map((c) => ({ chave: c.cbf, n: Number(c.cbf), ano: anoDecimal(c.nascimento) }));
  const ajustar = (amostra: typeof pontos) => {
    const ordenados = [...amostra].sort((a, b) => a.n - b.n);
    const tamanho = Math.max(15, Math.round(ordenados.length / 40));
    const faixas: { ate: number; ano: number }[] = [];
    for (let i = 0; i < ordenados.length; i += tamanho) {
      const grupo = ordenados.slice(i, i + tamanho);
      const anos = grupo.map((p) => p.ano).sort((a, b) => a - b);
      if (grupo.length < tamanho / 2 && faixas.length) faixas[faixas.length - 1].ate = grupo[grupo.length - 1].n;
      else faixas.push({ ate: grupo[grupo.length - 1].n, ano: anos[Math.floor(anos.length / 2)] });
    }
    return (cbf: string): number | undefined => {
      if (!faixas.length) return undefined;
      const n = Number(cbf);
      return (faixas.find((f) => n <= f.ate) ?? faixas[faixas.length - 1]).ano;
    };
  };
  const metade = (p: (typeof pontos)[number]) => hash(`metade:${p.chave}`) < 0.5;
  const erros: number[] = [];
  for (const lado of [true, false]) {
    const estimar = ajustar(pontos.filter((p) => metade(p) === lado));
    for (const p of pontos.filter((x) => metade(x) !== lado)) {
      const e = estimar(p.chave);
      if (e !== undefined) erros.push(Math.abs(e - p.ano));
    }
  }
  erros.sort((a, b) => a - b);
  return { estimar: ajustar(pontos), erroTipico: erros[Math.floor(erros.length / 2)] ?? NaN };
}

// ---- montagem ------------------------------------------------------------------------------

/** Jogador de um clube antes de ganhar idade e força. */
interface Candidato {
  chave: string;
  nome: string;
  nomeCompleto: string;
  nomeCortado: boolean;
  cbf?: string;
  posicao?: Pos;
  fontePosicao?: string;
  lado?: Lado;
  nascimento?: string;
  fonteIdade?: string;
  nacionalidade?: string;
  /** Uso no clube: jogos como titular e entradas (súmulas) ou jogos e status (Cartola). */
  uso: number;
  /** Preço no Cartola ou valor de mercado no Transfermarkt, quando há. */
  valor?: number;
}

function percentis(valores: number[]): number[] {
  const ordenados = [...valores].sort((a, b) => a - b);
  return valores.map((v) => (ordenados.length <= 1 ? 1 : ordenados.lastIndexOf(v) / (ordenados.length - 1)));
}

/** Completa o candidato com o que as fontes sabem dele (a primeira fonte que informa vale). */
function completar(c: Candidato, achados: Pessoa[]) {
  const ordem = { Cartola: 0, Transfermarkt: 1, Wikidata: 2 };
  for (const p of [...achados].sort((a, b) => ordem[a.fonte] - ordem[b.fonte])) {
    if (p.fonte !== "Cartola" && p.nascimento && !c.nascimento) { c.nascimento = p.nascimento; c.fonteIdade = p.fonte; }
    c.nacionalidade ??= codigoPais(p.pais);
    if (p.valor && p.fonte === "Transfermarkt") c.valor ??= p.valor;
    if (!c.posicao && p.posicao) { c.posicao = p.posicao; c.fontePosicao = p.fonte; }
    if (c.posicao === "L" && !c.lado && p.lado) c.lado = p.lado;
    if (!c.lado && p.pe) c.lado = p.pe === "left" ? "E" : p.pe === "right" ? "D" : undefined;
  }
}

export function montar(dados: string, clubes: FichaClube[]) {
  const relatorio: string[] = [];
  const ids = mapaDeClubes();
  const pessoas = carregarPessoas(dados, ids);
  const serieDe = new Map(clubes.map((c) => [c.id, c.serie]));

  // Série A: o Cartola tem o elenco atual.
  const cartolaArq = join(dados, "cartola-mercado.json.gz");
  const cartola = existsSync(cartolaArq) ? JSON.parse(lerGz(cartolaArq)) : null;
  const porClube = new Map<string, Candidato[]>();
  const pessoasCartola: Pessoa[] = [];
  const atletas = new Map<string, Candidato>();
  for (const a of cartola?.atletas ?? []) {
    const posicao = POSICAO_CARTOLA[a.posicao_id];
    const id = ids.cartola.get(cartola.clubes[a.clube_id]?.abreviacao);
    if (!posicao || !id) continue;
    const c: Candidato = {
      chave: `cartola:${a.atleta_id}`, nome: a.apelido, nomeCompleto: a.nome, nomeCortado: false,
      posicao, fontePosicao: "Cartola", uso: a.jogos_num + (a.status_id === 7 ? 3 : 0), valor: a.preco_num,
    };
    atletas.set(c.chave, c);
    porClube.set(id, [...(porClube.get(id) ?? []), c]);
    pessoasCartola.push({ nomes: [a.apelido, a.nome], clube: id, posicao, fonte: "Cartola", chave: c.chave });
  }
  const buscador = new Buscador(pessoas);
  const buscadorComCartola = new Buscador([...pessoas, ...pessoasCartola]);

  // Súmulas de 2025 (e de 2026, se o robô um dia conseguir baixar).
  const arquivos = ["A", "B", "C", "D"].flatMap((s) => [2023, 2024, 2025, 2026].map((ano) => ({ ano, caminho: join(dados, "sumulas", `Serie_${s}_${ano}_games.json.gz`) })))
    .filter((a) => existsSync(a.caminho));
  const { jogadores, jogos } = lerSumulas(arquivos, ids.cbf);
  const apelidoDe = (reg: NaSumula) => maisFrequente(reg.apelidos) ?? reg.nomeCompleto;

  // Quem é quem: cada nome das súmulas nas fontes (inclusive no Cartola, para saber quem subiu para a Série A).
  const achadosDe = new Map<string, Pessoa[]>();
  const conhecidas = new Map<string, Pos>();
  const cbfDoAtleta = new Map<string, string>();
  for (const reg of jogadores.values()) {
    const achados = buscadorComCartola.achar({
      apelido: apelidoDe(reg), nomeCompleto: reg.nomeCompleto, nomeCortado: reg.nomeCortado, clubes: new Set(reg.aparicoes.map((a) => a.clube)),
    });
    achadosDe.set(reg.cbf, achados);
    const chave = achados.find((p) => p.chave)?.chave;
    if (chave) cbfDoAtleta.set(chave, reg.cbf);
    const posicao = achados.map((p) => p.posicao).find((p) => p && p !== "G");
    if (reg.goleiro) conhecidas.set(reg.cbf, "G");
    else if (posicao) conhecidas.set(reg.cbf, posicao);
  }
  const conferencia = conferirPosicoes(jogos, jogadores, conhecidas);
  const { posicoes: deduzidas, custos } = inferirPosicoes(jogos, jogadores, conhecidas);
  const ladoDaCamisa = ladosPelaCamisa(jogos, jogadores);

  // Séries B e C: quem jogou por último pelo clube na temporada mais recente das súmulas.
  const jogosPorClubeAno = new Map<string, number>();
  for (const j of jogos) jogosPorClubeAno.set(`${j.clube}|${j.ano}`, (jogosPorClubeAno.get(`${j.clube}|${j.ano}`) ?? 0) + 1);
  for (const clube of clubes) {
    if (porClube.has(clube.id)) continue;
    const ano = (jogosPorClubeAno.get(`${clube.id}|2026`) ?? 0) >= 5 ? 2026 : 2025;
    const lista: Candidato[] = [];
    for (const reg of jogadores.values()) {
      const ultima = reg.aparicoes.reduce((a, b) => (b.data > a.data ? b : a));
      if (ultima.clube !== clube.id || ultima.ano !== ano) continue;
      // Quem está no Cartola foi para um clube da Série A.
      if (achadosDe.get(reg.cbf)!.some((p) => p.chave)) continue;
      const doClube = reg.aparicoes.filter((a) => a.clube === clube.id && a.ano === ano);
      const c: Candidato = {
        chave: `cbf:${reg.cbf}`, cbf: reg.cbf, nome: apelidoDe(reg), nomeCompleto: reg.nomeCompleto, nomeCortado: reg.nomeCortado,
        uso: doClube.filter((a) => a.titular).length + 0.4 * doClube.filter((a) => a.entrou).length,
      };
      if (reg.goleiro) { c.posicao = "G"; c.fontePosicao = "súmula"; }
      completar(c, achadosDe.get(reg.cbf)!.filter((p) => !p.chave));
      const deduzida = deduzidas.get(reg.cbf);
      if (!c.posicao && deduzida) { c.posicao = deduzida; c.fontePosicao = "escalações"; }
      if (c.posicao === "L") c.lado ??= ladoDaCamisa.get(reg.cbf);
      lista.push(c);
    }
    porClube.set(clube.id, lista);
    relatorio.push(`${clube.id}: súmulas de ${ano}`);
  }

  // Série A: nascimento, valor e lado nas outras fontes; o registro na CBF vem da súmula de 2025.
  for (const [id, lista] of porClube) {
    if (lista.some((c) => c.cbf)) continue;
    for (const c of lista) {
      completar(c, buscador.achar({ apelido: c.nome, nomeCompleto: c.nomeCompleto, nomeCortado: false, clubes: new Set([id]) }));
      c.cbf = cbfDoAtleta.get(c.chave);
      if (c.cbf && !c.nascimento) completar(c, achadosDe.get(c.cbf)!.filter((p) => !p.chave));
      if (c.posicao === "L" && c.cbf) c.lado ??= ladoDaCamisa.get(c.cbf);
    }
  }

  // Idade de quem nenhuma fonte informa: pelo número de registro na CBF, aprendido com todos os
  // jogadores das súmulas de nascimento conhecido.
  const nascimentosSumula = new Map<string, string>();
  for (const [cbf, achados] of achadosDe) {
    const nascimento = achados.find((p) => p.nascimento)?.nascimento;
    if (nascimento) nascimentosSumula.set(cbf, nascimento);
  }
  const registro = estimarNascimento([...nascimentosSumula].map(([cbf, nascimento]) => ({ cbf, nascimento })));

  // Elenco final de cada clube, com força e idade.
  const saida: Record<string, JogadorReal[]> = {};
  const fontesPosicao = new Map<string, number>();
  const fontesIdade = new Map<string, number>();
  let mudancas = 0;
  const detalhes: Record<string, unknown>[] = [];
  for (const clube of clubes) {
    const lista = (porClube.get(clube.id) ?? []).filter((c) => c.nome);
    const quantos = (p: Pos) => lista.filter((x) => x.posicao === p).length;
    // Quem ficou sem posição completa as posições com menos gente.
    for (const c of lista.filter((x) => !x.posicao).sort((a, b) => b.uso - a.uso)) {
      c.posicao = LINHA.slice().sort((a, b) => quantos(a) / MINIMO[a] - quantos(b) / MINIMO[b])[0];
      c.fontePosicao = "completar";
    }
    // Posição abaixo do mínimo recebe, de uma posição que sobra, o jogador de posição deduzida que
    // menos destoa nela (pelo custo da dedução).
    for (const falta of LINHA) {
      while (quantos(falta) < MINIMO[falta]) {
        const opcoes = lista.filter((x) => x.fontePosicao === "escalações" && x.posicao !== falta && quantos(x.posicao!) > MINIMO[x.posicao!] && x.cbf && custos.has(x.cbf));
        const piora = (x: Candidato) => custos.get(x.cbf!)![falta] - custos.get(x.cbf!)![x.posicao!];
        const melhor = opcoes.sort((a, b) => piora(a) - piora(b) || b.uso - a.uso)[0];
        if (!melhor) break;
        melhor.posicao = falta;
        mudancas++;
      }
    }
    // Corta para o tamanho do elenco, guardando o mínimo por posição e no máximo 4 goleiros.
    const ordenada = [...lista].sort((a, b) => b.uso - a.uso || (b.valor ?? 0) - (a.valor ?? 0) || a.chave.localeCompare(b.chave));
    const escolhidos: Candidato[] = [];
    for (const pos of ["G", ...LINHA] as Pos[]) escolhidos.push(...ordenada.filter((c) => c.posicao === pos).slice(0, MINIMO[pos]));
    for (const c of ordenada) {
      if (escolhidos.length >= TAMANHO_ELENCO || escolhidos.includes(c)) continue;
      if (c.posicao === "G" && escolhidos.filter((x) => x.posicao === "G").length >= MAXIMO_GOLEIROS) continue;
      escolhidos.push(c);
    }

    // Força: uso e valor dentro do clube, na faixa do clube. Goleiros comparados entre si.
    const { min, max } = clube.forcaElenco;
    const elenco: { jogador: JogadorReal; c: Candidato }[] = [];
    for (const grupo of [escolhidos.filter((c) => c.posicao === "G"), escolhidos.filter((c) => c.posicao !== "G")]) {
      const pUso = percentis(grupo.map((c) => c.uso));
      const pValor = percentis(grupo.map((c) => c.valor ?? -1));
      const temValor = grupo.filter((c) => c.valor).length >= grupo.length * 0.4;
      grupo.forEach((c, i) => {
        const relevancia = temValor ? 0.55 * pUso[i] + 0.45 * pValor[i] : pUso[i];
        const forca = Math.round(Math.min(max, min + (max - min) * relevancia ** 0.9 + (hash(c.chave) - 0.5) * 3));
        let idade: number;
        let fonteIdade = c.fonteIdade ?? "";
        const estimado = c.cbf ? registro.estimar(c.cbf) : undefined;
        if (c.nascimento) idade = idadeEm(c.nascimento);
        else if (estimado !== undefined) { idade = Math.round(anoDecimal(DATA_INICIO) - estimado + (hash(c.chave + "i") - 0.5) * 2); fonteIdade = "registro na CBF"; }
        else { idade = Math.round(relevancia > 0.4 ? 24 + hash(c.chave + "i") * 7 : 19 + hash(c.chave + "i") * 6); fonteIdade = "sorteio"; }
        const lado = c.lado ?? (hash(c.chave + "l") < 0.5 ? "D" : "E");
        const nacionalidade = c.nacionalidade && c.nacionalidade !== "BRA" ? c.nacionalidade : undefined;
        detalhes.push({ clube: clube.id, nome: c.nome, nomeCompleto: c.nomeCompleto, cbf: c.cbf, posicao: c.posicao, fontePosicao: c.fontePosicao, idade, fonteIdade, nascimento: c.nascimento, uso: c.uso, forca });
        elenco.push({
          c,
          jogador: { nome: formatarNome(c.nome), posicao: c.posicao!, lado, idade: Math.max(16, Math.min(42, idade)), forca: Math.max(1, forca), ...(nacionalidade ? { nacionalidade } : {}) },
        });
        const serie = serieDe.get(clube.id);
        fontesPosicao.set(`${serie}|${c.fontePosicao}`, (fontesPosicao.get(`${serie}|${c.fontePosicao}`) ?? 0) + 1);
        fontesIdade.set(`${serie}|${fonteIdade}`, (fontesIdade.get(`${serie}|${fonteIdade}`) ?? 0) + 1);
      });
    }
    // Nomes repetidos no mesmo clube ganham o último sobrenome ("Gabriel" → "Gabriel Lima").
    const repetidos = new Map<string, number>();
    for (const { jogador } of elenco) repetidos.set(jogador.nome, (repetidos.get(jogador.nome) ?? 0) + 1);
    for (const { jogador, c } of elenco) {
      if ((repetidos.get(jogador.nome) ?? 0) < 2) continue;
      const partes = c.nomeCompleto.split(" ").filter((p) => p.length > 2 && !PARTICULAS.has(normalizar(p)));
      const sobrenome = (c.nomeCortado ? partes.slice(0, -1) : partes).filter((p) => !normalizar(jogador.nome).split(" ").includes(normalizar(p))).pop();
      if (sobrenome) jogador.nome = `${jogador.nome} ${formatarNome(sobrenome)}`;
    }
    const ordem: Pos[] = ["G", ...LINHA];
    const jogadoresClube = elenco.map((e) => e.jogador).sort((a, b) => ordem.indexOf(a.posicao) - ordem.indexOf(b.posicao) || b.forca - a.forca);
    saida[clube.id] = jogadoresClube;
    const nomes = new Map<string, number>();
    for (const j of jogadoresClube) nomes.set(j.nome, (nomes.get(j.nome) ?? 0) + 1);
    const iguais = [...nomes].filter(([, n]) => n > 1).map(([n]) => n);
    relatorio.push(`${clube.id}: ${jogadoresClube.length} jogadores (${ordem.map((p) => `${p} ${jogadoresClube.filter((j) => j.posicao === p).length}`).join(", ")})${iguais.length ? ` · nomes repetidos: ${iguais.join(", ")}` : ""}`);
  }

  const resumo = (mapa: Map<string, number>, serie: string) =>
    [...mapa].filter(([k]) => k.startsWith(`${serie}|`)).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.slice(2) || "?"} ${n}`).join(", ");
  relatorio.unshift(
    `Jogadores: ${Object.values(saida).flat().length}.`,
    ...["A", "B", "C"].map((s) => `Série ${s} · posição: ${resumo(fontesPosicao, s)} · idade: ${resumo(fontesIdade, s)}`),
    `Posições deduzidas das escalações, conferidas com ${conferencia.total} jogadores de posição conhecida: ${Math.round((100 * conferencia.certas) / Math.max(1, conferencia.total))}% de acerto (${Math.round((100 * conferencia.certasTitulares) / Math.max(1, conferencia.totalTitulares))}% entre os ${conferencia.totalTitulares} com 10 jogos ou mais como titular na última temporada).`,
    `Jogadores trocados de posição para completar o mínimo de cada posição: ${mudancas}.`,
    `Idade pelo registro na CBF: erro típico de ${registro.erroTipico.toFixed(1)} ano(s) (${nascimentosSumula.size} nascimentos conhecidos).`,
  );
  return { elencos: saida, relatorio, conferencia, jogos, conhecidas, jogadores, nascimentosSumula, detalhes };
}

// ---- linha de comando ----------------------------------------------------------------------

if (process.argv[1]?.endsWith("montar.ts")) {
  const dados = process.argv[2];
  if (!dados) throw new Error("Uso: npx tsx tools/elencos/montar.ts <pasta com os dados do robô>");
  const clubes = (JSON.parse(readFileSync("data/brasil-2026/clubes.json", "utf8")) as { clubes: FichaClube[] }).clubes;
  const { elencos, relatorio, detalhes } = montar(dados, clubes);
  // Terceiro argumento opcional: arquivo com a origem de cada dado, para conferir.
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(detalhes, null, 1));
  const baixadoEm = readFileSync(join(dados, "LEIAME.md"), "utf8").match(/Baixados em ([^ ]+)/)?.[1] ?? "";
  writeFileSync(
    "data/brasil-2026/jogadores.json",
    JSON.stringify({ fonte: "Cartola (Série A), súmulas da CBF (Séries B e C), transfermarkt-datasets e Wikidata. Força calculada pelo Proffut.", baixadoEm, elencos }, null, 0) + "\n",
  );
  console.log(relatorio.join("\n"));
}
