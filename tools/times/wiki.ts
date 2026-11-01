// Leitura do texto (wikitext) das páginas da Wikipédia que o robô baixa (tools/times/wikipedia.py): a ficha do
// clube (infobox) e o elenco atual (modelos "fs player" em inglês e "Jugador de fútbol" em espanhol).

export type Pos = "G" | "L" | "Z" | "M" | "A";

/** Tira acentos, maiúsculas e pontuação. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Texto visível de um trecho de wikitext: "[[Alvo|Rótulo]]" vira "Rótulo", modelos e marcas saem. */
export function textoVisivel(wikitext: string): string {
  let t = wikitext.replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<!--[\s\S]*?-->/g, "");
  // Modelos dentro de modelos: tira de dentro para fora.
  for (let i = 0; i < 5 && /\{\{[^{}]*\}\}/.test(t); i++) t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?|<[^>]+>/g, "");
  return t.replace(/\s+/g, " ").trim();
}

/** Alvo da primeira ligação do trecho ("[[Alvo|Rótulo]]" → "Alvo"). */
export function alvoDaLigacao(wikitext: string): string | undefined {
  const m = /\[\[:?(?:(?:es|en|pt):)?([^\]|#]+)/.exec(wikitext);
  return m ? m[1].replace(/_/g, " ").trim() : undefined;
}

/**
 * Os parâmetros de um modelo, a partir do "{{" dele: { nome, params } (os "|" dentro de outros modelos e de
 * ligações não separam parâmetros).
 */
export function lerModelo(texto: string, inicio: number): { nome: string; params: Record<string, string>; fim: number } {
  let nivel = 0, i = inicio, atual = "";
  const partes: string[] = [];
  for (; i < texto.length; i++) {
    const dois = texto.slice(i, i + 2);
    if (dois === "{{" || dois === "[[") { nivel++; atual += dois; i++; continue; }
    if (dois === "}}" || dois === "]]") {
      nivel--;
      if (nivel === 0) { partes.push(atual); i += 2; break; }
      atual += dois; i++; continue;
    }
    if (texto[i] === "|" && nivel === 1) { partes.push(atual); atual = ""; continue; }
    atual += texto[i];
  }
  const nome = (partes.shift() ?? "").replace(/^\{\{/, "").trim();
  const params: Record<string, string> = {};
  let posicional = 1;
  for (const p of partes) {
    const igual = p.indexOf("=");
    // "=" dentro de modelo ou ligação não separa nome e valor.
    const antes = igual >= 0 ? p.slice(0, igual) : "";
    if (igual >= 0 && !/[{[]/.test(antes)) params[normalizar(antes).replace(/ /g, "_")] = p.slice(igual + 1).trim();
    else params[String(posicional++)] = p.trim();
  }
  return { nome, params, fim: i };
}

/** Todos os modelos do texto com nome que bate com `padrao`. */
export function modelos(texto: string, padrao: RegExp): { nome: string; params: Record<string, string> }[] {
  const lista: { nome: string; params: Record<string, string> }[] = [];
  const re = /\{\{\s*([^|{}]+?)\s*(?=\||\}\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (!padrao.test(m[1])) continue;
    const modelo = lerModelo(texto, m.index);
    lista.push({ nome: modelo.nome, params: modelo.params });
    re.lastIndex = Math.max(re.lastIndex, modelo.fim);
  }
  return lista;
}

// ---- ficha do clube ---------------------------------------------------------------------------

/** A ficha (infobox) do clube, com os nomes dos campos normalizados ("nomeabrev", "body1", "capacidade"...). */
export function ficha(wikitext: string): Record<string, string> {
  const [m] = modelos(wikitext, /^(info\s*\/\s*clube|infobox football club|ficha de club|infobox club|info\/futebol)/i);
  return m?.params ?? {};
}

/** Cor "#rrggbb" de um campo da ficha ("FF0000", "#ff0000", "red"...). */
export function cor(valor?: string): string | undefined {
  if (!valor) return undefined;
  const hex = /#?([0-9a-f]{6})\b/i.exec(valor);
  if (hex) return `#${hex[1].toUpperCase()}`;
  const nomes: Record<string, string> = {
    white: "#FFFFFF", black: "#212121", red: "#D32F2F", blue: "#1565C0", green: "#2E7D32", yellow: "#FBC02D",
    navy: "#0D1B4C", orange: "#EF6C00", grey: "#9E9E9E", gray: "#9E9E9E", maroon: "#7B1E1E", purple: "#6A1B9A",
    branco: "#FFFFFF", preto: "#212121", vermelho: "#D32F2F", azul: "#1565C0", verde: "#2E7D32", amarelo: "#FBC02D",
    blanco: "#FFFFFF", negro: "#212121", rojo: "#D32F2F", celeste: "#64B5F6", amarillo: "#FBC02D", grana: "#7B1E1E",
  };
  return nomes[normalizar(valor).split(" ")[0]];
}

/** Número de um campo da ficha ("{{fmtn|22375}}", "45.000", "45,000"). */
export function numero(valor?: string): number | undefined {
  if (!valor) return undefined;
  const m = /(\d{1,3}(?:[.,\s]\d{3})+|\d+)/.exec(textoVisivel(valor.replace(/\{\{\s*(?:fmtn|formatnum|nts)\s*\|\s*([\d.,]+)[^}]*\}\}/gi, "$1")));
  return m ? Number(m[1].replace(/[.,\s]/g, "")) : undefined;
}

/** Ano de um campo da ficha ("{{dtlink|14|8|1920}}", "4 de agosto de 1905", "1905"). */
export function ano(valor?: string): number | undefined {
  const m = valor ? /\b(18[5-9]\d|19\d\d|20[0-2]\d)\b/.exec(valor) : null;
  return m ? Number(m[1]) : undefined;
}

// ---- elenco atual ---------------------------------------------------------------------------

const ELENCO = /squad|first[- ]team|players|plantel|plantilla|elenco|jogadores|jugadores/i;
const FORA_DO_ELENCO = /loan|pr[ée]stamo|cedid|emprest|reserv|youth|juvenil|juniores|academ|base|former|notable|hist[óo]ric|retired|retirad|aposentad|[íi]dol|idol|record|women|femenin|feminin|staff|t[ée]cnic|coach|director|dirigent|presid|captain|capit|top scorer|goleador|artilh|transfer|fichaje|contrata|altas|bajas|sa[íi]das|chegadas|u-?\d\d|sub-?\d\d|other players/i;

/** Trechos das seções do elenco atual (sem emprestados, base, ex-jogadores...). */
export function secoesDoElenco(wikitext: string): string[] {
  const titulos = [...wikitext.matchAll(/^(={2,5})\s*(.*?)\s*\1\s*$/gm)];
  const trechos: string[] = [];
  titulos.forEach((m, i) => {
    const nome = m[2].replace(/\[\[|\]\]|'''?|<[^>]+>/g, "");
    if (!ELENCO.test(nome) || FORA_DO_ELENCO.test(nome)) return;
    const fim = titulos[i + 1]?.index ?? wikitext.length;
    trechos.push(wikitext.slice(m.index! + m[0].length, fim));
  });
  return trechos;
}

export interface NoElenco {
  nome: string;
  /** Página do jogador na Wikipédia (sem ela, só o nome). */
  pagina?: string;
  posicao?: Pos;
  /** Lado indicado pela posição (lateral direito, ponta esquerda...). */
  lado?: "D" | "E";
  /** A página diz a posição exata (zagueiro, lateral) e não só "defensor". */
  exata?: boolean;
  nascimento?: string;
  /** Nacionalidade como a página escreve (código "ARG" ou nome "Argentina"). */
  nacionalidade?: string;
  numero?: number;
}

/** Posições das páginas em espanhol e em inglês. */
const POSICOES: Record<string, { posicao: Pos; lado?: "D" | "E" }> = {
  gk: { posicao: "G" }, arq: { posicao: "G" }, por: { posicao: "G" }, arquero: { posicao: "G" }, portero: { posicao: "G" },
  df: { posicao: "Z" }, def: { posicao: "Z" }, dfc: { posicao: "Z" }, dc: { posicao: "A" }, cb: { posicao: "Z" },
  ld: { posicao: "L", lado: "D" }, li: { posicao: "L", lado: "E" }, lat: { posicao: "L" }, rb: { posicao: "L", lado: "D" }, lb: { posicao: "L", lado: "E" },
  mf: { posicao: "M" }, med: { posicao: "M" }, mc: { posicao: "M" }, mcd: { posicao: "M" }, mco: { posicao: "M" }, vol: { posicao: "M" },
  md: { posicao: "M", lado: "D" }, mi: { posicao: "M", lado: "E" }, cm: { posicao: "M" }, dm: { posicao: "M" }, am: { posicao: "M" },
  fw: { posicao: "A" }, del: { posicao: "A" }, ed: { posicao: "A", lado: "D" }, ei: { posicao: "A", lado: "E" }, sd: { posicao: "A" },
  ext: { posicao: "A" }, cf: { posicao: "A" }, st: { posicao: "A" }, rw: { posicao: "A", lado: "D" }, lw: { posicao: "A", lado: "E" },
};

/** "{{edad|20|05|1997}}" ou "{{birth date and age|1997|5|20}}" → "1997-05-20". */
function nascimentoDoModelo(valor?: string): string | undefined {
  if (!valor) return undefined;
  const es = /\{\{\s*edad\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})\s*\|\s*(\d{4})/i.exec(valor);
  if (es) return `${es[3]}-${es[2].padStart(2, "0")}-${es[1].padStart(2, "0")}`;
  const en = /\{\{\s*birth date(?: and age)?\s*\|(?:\s*df\s*=\s*\w+\s*\|)?\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(valor);
  if (en) return `${en[1]}-${en[2].padStart(2, "0")}-${en[3].padStart(2, "0")}`;
  return undefined;
}

/** O elenco atual de uma página de clube (espanhol: "Jugador de fútbol"; inglês: "fs player"). */
export function lerElenco(wikitext: string): NoElenco[] {
  const lista: NoElenco[] = [];
  for (const trecho of secoesDoElenco(wikitext)) {
    for (const m of modelos(trecho, /^(fs player|football squad player|jugador de f[úu]tbol|jugador de f[úu]tbol con esquema|jugador)$/i)) {
      const p = m.params;
      const bruto = p.name ?? p.nombre ?? "";
      const nome = textoVisivel(bruto).replace(/\s*\(c\)\s*$/i, "").trim();
      if (!nome || nome.length < 3) continue;
      const codigo = normalizar(p.pos ?? p.posicion ?? "").replace(/ /g, "");
      const pos = POSICOES[codigo];
      lista.push({
        nome,
        pagina: /\[\[/.test(bruto) ? alvoDaLigacao(bruto) : undefined,
        posicao: pos?.posicao,
        lado: pos?.lado,
        exata: !!pos && !["df", "def"].includes(codigo),
        nascimento: nascimentoDoModelo(p.edad ?? p.age ?? p.birth),
        nacionalidade: textoVisivel(p.nat ?? p.nac ?? p.pais ?? "") || undefined,
        numero: Number(p.no ?? p.num ?? p.numero) || undefined,
      });
    }
  }
  return lista;
}
