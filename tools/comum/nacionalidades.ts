// Nacionalidade do jogo (código de 3 letras: "BRA", "POR", "COR"...) a partir do que as fontes trazem: o código da FIFA
// ("KOR", "GER"), o ISO de 3 letras do Wikidata ("DEU", "PRT"), o de 2 letras ("PT") ou o nome do país em inglês,
// espanhol ou português ("Portugal", "Korea, South", "Costa de Marfil"). Os montadores usam isto quando a lista própria
// deles não conhece o país: antes, o jogador ficava com a nacionalidade do país do clube (o Cristiano Ronaldo, do
// Al-Nassr, saía saudita; o Son, do Los Angeles FC, americano). R123, nov/2026.
// paises-iso.json: ISO 3166 (códigos e nomes em inglês, espanhol e português), gravado uma vez a partir do pacote
// i18n-iso-countries (MIT).
import { readFileSync } from "node:fs";
import { NACIONALIDADES_MUNDO } from "../../src/engine/nacionalidades";
import { DADOS_SELECOES, nacionalidadeDoPais } from "../../src/engine/selecoes";
import { SELECOES_MUNDO } from "../../src/engine/selecoes-mundo";

const ISO: Record<string, { iso3: string; nomes: string[] }> = JSON.parse(
  readFileSync(new URL("./paises-iso.json", import.meta.url), "utf8"),
);

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Nomes que as fontes usam e o ISO não tem (Transfermarkt e Wikipédia). */
const APELIDOS: Record<string, string> = {
  "korea, south": "KR", "korea, north": "KP", "southern sudan": "SS", "dr congo": "CD", "congo dr": "CD", "bosnia-herzegovina": "BA",
  "turkiye": "TR", "chinese taipei": "TW", "st. kitts & nevis": "KN", "st. lucia": "LC", "st. vincent & grenadines": "VC",
  "curacao": "CW", "the gambia": "GM", "cape verde": "CV", "kosovo": "XK", "palestine": "PS", "neukaledonien": "NC",
  "macedonia": "MK", "north macedonia": "MK", "czech republic": "CZ", "russia": "RU", "iran": "IR", "syria": "SY",
  "laos": "LA", "vietnam": "VN", "tanzania": "TZ", "moldova": "MD", "venezuela": "VE", "bolivia": "BO", "brunei": "BN",
  "eswatini": "SZ", "swaziland": "SZ", "east timor": "TL", "timor-leste": "TL", "hongkong": "HK", "hong kong": "HK",
  "st. martin": "MF", "sint maarten": "SX", "bonaire": "BQ", "us virgin islands": "VI", "british virgin islands": "VG",
  "xks": "XK", "eng": "EN", "sco": "XS", "wal": "XW", "nir": "XN", "england": "EN", "scotland": "XS", "wales": "XW", "northern ireland": "XN",
};

/** País (a chave das seleções: "PT", "KR", "EN"...) → nacionalidade do jogo. */
const DO_PAIS = new Map<string, string>();
const MAPA = new Map<string, string>();
const por = (chave: string | undefined, nac: string) => { if (chave && !MAPA.has(normalizar(chave))) MAPA.set(normalizar(chave), nac); };

for (const p of Object.keys(DADOS_SELECOES)) DO_PAIS.set(p, nacionalidadeDoPais(p));
for (const [p, linha] of Object.entries(SELECOES_MUNDO)) DO_PAIS.set(p, linha[1]);
for (const [cod, n] of Object.entries(NACIONALIDADES_MUNDO)) if (n.iso2.length === 2 && n.iso2 !== "GB" && !DO_PAIS.has(n.iso2)) DO_PAIS.set(n.iso2, cod);

// Os códigos do próprio jogo e as siglas da FIFA primeiro; depois o ISO e os nomes.
for (const nac of DO_PAIS.values()) por(nac, nac);
for (const cod of Object.keys(NACIONALIDADES_MUNDO)) por(cod, cod);
for (const [p, d] of Object.entries(DADOS_SELECOES)) por(d.sigla, DO_PAIS.get(p)!);
for (const [p, linha] of Object.entries(SELECOES_MUNDO)) { por(linha[2], DO_PAIS.get(p)!); por(linha[9], DO_PAIS.get(p)!); }
for (const [cod, n] of Object.entries(NACIONALIDADES_MUNDO)) for (const i of n.ingles) por(i, cod);
for (const [p, nac] of DO_PAIS) {
  const iso = ISO[p];
  if (!iso) continue;
  por(iso.iso3, nac);
  for (const nome of iso.nomes) por(nome, nac);
}
for (const [apelido, p] of Object.entries(APELIDOS)) if (DO_PAIS.has(p)) por(apelido, DO_PAIS.get(p)!);
// O Reino Unido não diz qual das quatro: fica sem (vale a do país do clube).
for (const ambiguo of ["gbr", "gb", "uk", "united kingdom", "great britain", "reino unido"]) MAPA.delete(ambiguo);

/** Nacionalidade do jogo para o texto da fonte, ou undefined se não der para saber. */
export function nacionalidadeDaFonte(texto?: string | null): string | undefined {
  return texto ? MAPA.get(normalizar(texto)) : undefined;
}
