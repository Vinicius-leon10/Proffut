// Leitura das linhas de jogadores das súmulas da CBF, no texto extraído pelo projeto
// BrazilianFootball/data. Exemplo de linha:
//   "12Fabian Volpi Fabian Harry Volpi T(g)P421193"
//   número · apelido · nome completo · T(itular)/R(eserva) · (g)oleiro · P(resente)/A(usente) · código CBF
// Apelidos e nomes longos chegam cortados com " ..." (a coluna da súmula é estreita).

export interface JogadorSumula {
  numero: number;
  apelido: string;
  nomeCompleto: string;
  titular: boolean;
  goleiro: boolean;
  cbf: string;
}

const LINHA = /^(\d{1,3})(.*?)\s*([TR])(\(g\))?([PA])\s*(\d{6})$/;
const CORTE = " ...";
/** Apelido mais comprido que cabe inteiro na coluna da súmula (em caracteres, aproximado). */
const APELIDO_MAXIMO = 13;

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function prefixoComum(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Separa "apelido + nome completo" (os dois vêm juntos, só com espaço entre eles). */
export function separarApelido(meio: string): { apelido: string; nomeCompleto: string } {
  let texto = meio.trim();
  const nomeCortado = texto.endsWith(CORTE.trim());
  if (nomeCortado) texto = texto.slice(0, -3).trim();

  // Apelido cortado: "Paulo Henr ... Paulo Henrique Gianezini".
  const corte = texto.indexOf(CORTE + " ");
  if (corte >= 0) {
    const nomeCompleto = texto.slice(corte + CORTE.length).trim();
    return { apelido: completarApelido(texto.slice(0, corte).trim(), nomeCompleto, nomeCortado), nomeCompleto };
  }

  const palavras = texto.split(" ").filter(Boolean);
  if (palavras.length < 2) return { apelido: texto, nomeCompleto: texto };
  let melhor = { k: 1, pontos: -Infinity };
  for (let k = 1; k <= Math.min(3, palavras.length - 1); k++) {
    const apelido = palavras.slice(0, k);
    const nome = palavras.slice(k).map(normalizar);
    if (apelido.join(" ").length > APELIDO_MAXIMO) break;
    const a0 = normalizar(apelido[0]);
    let pontos = k === 1 ? 0.5 : 0;
    // O nome completo costuma começar pelo mesmo nome do apelido ("Rayan Rayan Rodrigues").
    if (nome[0] === a0) pontos += 5;
    else if (prefixoComum(nome[0], a0) >= 3) pontos += 3;
    for (const p of apelido.slice(1)) pontos += nome.includes(normalizar(p)) ? 2 : -1;
    // Um nome completo que começa por um sobrenome repetido mais adiante é improvável.
    if (nome.slice(1).includes(nome[0])) pontos -= 3;
    if (pontos > melhor.pontos) melhor = { k, pontos };
  }
  return { apelido: palavras.slice(0, melhor.k).join(" "), nomeCompleto: palavras.slice(melhor.k).join(" ") };
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
/** Finais comuns de apelido, para completar um corte que o nome completo não explica ("Márcio Jun"). */
const FINAIS = ["Júnior", "Neto", "Filho", "Sobrinho", "Paulista", "Baiano", "Mineiro", "Carioca", "Gaúcho", "Paraíba", "Pará"];

/** Completa a última palavra de um apelido cortado usando o nome completo. */
function completarApelido(pedaco: string, nomeCompleto: string, nomeCortado: boolean): string {
  const palavras = pedaco.split(" ").filter(Boolean);
  if (palavras.length === 0) return nomeCompleto.split(" ")[0];
  const nome = nomeCompleto.split(" ");
  const ultima = normalizar(palavras[palavras.length - 1]);
  if (palavras.length > 1 && PARTICULAS.has(ultima)) {
    // "Renan dos ..." + "Renan dos Santos": a palavra cortada é a seguinte.
    const i = nome.findIndex((p, k) => k > 0 && normalizar(p) === ultima);
    if (i >= 0 && i + 1 < nome.length && !(nomeCortado && i + 1 === nome.length - 1)) return [...palavras, nome[i + 1]].join(" ");
    return palavras.slice(0, -1).join(" ");
  }
  // A última palavra de um nome completo cortado também está cortada: não serve para completar.
  const inteiras = nomeCortado ? nome.slice(0, -1) : nome;
  const completa = inteiras.find((p) => normalizar(p).startsWith(ultima) && normalizar(p) !== ultima)
    ?? FINAIS.find((f) => ultima.length >= 2 && normalizar(f).startsWith(ultima));
  if (completa) palavras[palavras.length - 1] = completa;
  else if (palavras.length > 1) palavras[palavras.length - 1] = `${palavras[palavras.length - 1].charAt(0).toUpperCase()}.`;
  return palavras.join(" ");
}

export function lerJogador(linha: string): JogadorSumula | null {
  const m = LINHA.exec(linha.trim());
  if (!m) return null;
  const { apelido, nomeCompleto } = separarApelido(m[2]);
  return {
    numero: Number(m[1]) % 100,
    apelido: formatarNome(apelido),
    nomeCompleto: formatarNome(nomeCompleto),
    titular: m[3] === "T",
    goleiro: !!m[4],
    cbf: m[6],
  };
}

/** Substituição: "41:00 1TRetrô/PE 16 - Marcos Andre ... 22 - Samuel ..." (primeiro número entra, segundo sai). */
export function lerSubstituicao(texto: string): { entra: number; sai: number } | null {
  const numeros = /(\d+)\s*-\s*\D+?(\d+)\s*-/.exec(texto.replace(/^\s*\d+:\d+\s*(\dT|INT)?/, ""));
  return numeros ? { entra: Number(numeros[1]), sai: Number(numeros[2]) } : null;
}

// ---- nomes ------------------------------------------------------------------------------

const MINUSCULAS = PARTICULAS;
/** Acentos que a CBF costuma omitir nos nomes mais comuns. */
const ACENTOS: Record<string, string> = {
  joao: "João", jose: "José", antonio: "Antônio", andre: "André", fabio: "Fábio", marcio: "Márcio",
  claudio: "Cláudio", sergio: "Sérgio", rogerio: "Rogério", mauricio: "Maurício", vinicius: "Vinícius",
  lucio: "Lúcio", tarcisio: "Tarcísio", patricio: "Patrício", rubens: "Rubens", eder: "Éder", emerson: "Emerson",
  everton: "Éverton", erick: "Erick", junior: "Júnior", jr: "Jr.", sebastiao: "Sebastião", romulo: "Rômulo",
  tulio: "Túlio", tiago: "Tiago", thiago: "Thiago", ivan: "Ivan", ze: "Zé", luis: "Luís", inacio: "Inácio",
  caua: "Cauã", kaua: "Kauã", luca: "Luca", estevao: "Estêvão", simoes: "Simões", magalhaes: "Magalhães",
  conceicao: "Conceição", goncalves: "Gonçalves", araujo: "Araújo", assuncao: "Assunção", mendonca: "Mendonça",
};

export function formatarNome(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((p, i) => {
      const chave = normalizar(p);
      if (i > 0 && MINUSCULAS.has(chave)) return chave;
      const semAcento = p === p.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      if (semAcento && ACENTOS[chave]) return ACENTOS[chave];
      const maiuscula = p === p.toUpperCase() && /\p{L}{3,}/u.test(p);
      if (maiuscula || p === p.toLowerCase()) return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      return p;
    })
    .join(" ");
}
