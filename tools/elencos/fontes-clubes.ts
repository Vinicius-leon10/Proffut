// Como cada fonte chama os 60 clubes do jogo (o id é o de data/brasil-2026/clubes.json).
//   cbf: nome nas súmulas ("Clube / UF")  ·  cartola: sigla no Cartola  ·  tm: nome no transfermarkt-datasets
//   wikidata: rótulo do clube no Wikidata

export interface NomesNasFontes {
  cbf: string[];
  cartola?: string;
  tm?: string;
  wikidata?: string[];
}

export const FONTES_CLUBES: Record<string, NomesNasFontes> = {
  // Série A
  flamengo: { cbf: ["Flamengo / RJ"], cartola: "FLA", tm: "Clube de Regatas do Flamengo", wikidata: ["Clube de Regatas do Flamengo"] },
  palmeiras: { cbf: ["Palmeiras / SP"], cartola: "PAL", tm: "Sociedade Esportiva Palmeiras", wikidata: ["Sociedade Esportiva Palmeiras"] },
  corinthians: { cbf: ["Corinthians / SP"], cartola: "COR", tm: "Sport Club Corinthians Paulista", wikidata: ["Sport Club Corinthians Paulista"] },
  "sao-paulo": { cbf: ["São Paulo / SP"], cartola: "SAO", tm: "São Paulo Futebol Clube", wikidata: ["São Paulo Futebol Clube"] },
  fluminense: { cbf: ["Fluminense / RJ"], cartola: "FLU", tm: "Fluminense Football Club", wikidata: ["Fluminense Football Club"] },
  "atletico-mg": { cbf: ["Atlético Mineiro / MG"], cartola: "CAM", tm: "Clube Atlético Mineiro", wikidata: ["Clube Atlético Mineiro"] },
  internacional: { cbf: ["Internacional / RS"], cartola: "INT", tm: "Sport Club Internacional", wikidata: ["Sport Club Internacional"] },
  gremio: { cbf: ["Grêmio / RS"], cartola: "GRE", tm: "Grêmio Foot-Ball Porto Alegrense", wikidata: ["Grêmio Foot-Ball Porto Alegrense"] },
  santos: { cbf: ["Santos / SP"], cartola: "SAN", tm: "Santos Futebol Clube", wikidata: ["Santos Futebol Clube"] },
  botafogo: { cbf: ["Botafogo / RJ"], cartola: "BOT", tm: "S. A. F. Botafogo", wikidata: ["Clube Botafogo de Futebol e Regatas"] },
  vasco: { cbf: ["Vasco da Gama / RJ"], cartola: "VAS", tm: "Club de Regatas Vasco da Gama", wikidata: ["Club de Regatas Vasco da Gama"] },
  cruzeiro: { cbf: ["Cruzeiro / MG"], cartola: "CRU", tm: "Cruzeiro Esporte Clube", wikidata: ["Cruzeiro Esporte Clube"] },
  "athletico-pr": { cbf: ["Athletico Paranaense / PR"], cartola: "CAP", tm: "Clube Atlético Paranaense", wikidata: ["Club Athletico Paranaense"] },
  bahia: { cbf: ["Bahia / BA"], cartola: "BAH", tm: "Esporte Clube Bahia", wikidata: ["Esporte Clube Bahia"] },
  coritiba: { cbf: ["Coritiba / PR"], cartola: "CFC", tm: "Coritiba Foot Ball Club", wikidata: ["Coritiba Foot Ball Club"] },
  "red-bull-bragantino": { cbf: ["Red Bull Bragantino / SP"], cartola: "RBB", tm: "Red Bull Bragantino", wikidata: ["Red Bull Bragantino"] },
  chapecoense: { cbf: ["Chapecoense / SC"], cartola: "CHA", tm: "Associação Chapecoense de Futebol", wikidata: ["Associação Chapecoense de Futebol"] },
  mirassol: { cbf: ["Mirassol / SP"], cartola: "MIR", tm: "Mirasol Futebol Clube", wikidata: ["Mirassol Futebol Clube"] },
  remo: { cbf: ["Remo / PA"], cartola: "REM", tm: "Clube do Remo", wikidata: ["Clube do Remo"] },
  vitoria: { cbf: ["Vitória / BA"], cartola: "VIT", tm: "Esporte Clube Vitória", wikidata: ["Esporte Clube Vitória"] },
  // Série B
  "america-mg": { cbf: ["América / MG"], wikidata: ["América Futebol Clube (Minas Gerais)"] },
  "athletic-club": { cbf: ["Athletic / MG"], wikidata: ["Athletic Club"] },
  "atletico-go": { cbf: ["Atlético Goianiense / GO"], wikidata: ["Atlético Clube Goianiense"] },
  avai: { cbf: ["Avaí / SC"], wikidata: ["Avaí Futebol Clube"] },
  "botafogo-sp": { cbf: ["Botafogo / SP"], wikidata: ["Botafogo Futebol Clube"] },
  ceara: { cbf: ["Ceará / CE"], tm: "Ceará Sporting Club", wikidata: ["Ceará Sporting Club"] },
  crb: { cbf: ["CRB / AL"], wikidata: ["Clube de Regatas Brasil"] },
  criciuma: { cbf: ["Criciúma / SC"], wikidata: ["Criciúma Esporte Clube"] },
  cuiaba: { cbf: ["Cuiabá / MT"], wikidata: ["Cuiabá Esporte Clube"] },
  fortaleza: { cbf: ["Fortaleza / CE"], tm: "Fortaleza Esporte Clube", wikidata: ["Fortaleza Esporte Clube"] },
  goias: { cbf: ["Goiás / GO"], wikidata: ["Goiás Esporte Clube"] },
  juventude: { cbf: ["Juventude / RS"], tm: "Esporte Clube Juventude", wikidata: ["Esporte Clube Juventude"] },
  londrina: { cbf: ["Londrina / PR"], wikidata: ["Londrina Esporte Clube"] },
  novorizontino: { cbf: ["Gremio Novorizontino - / SP", "Novorizontino / SP"], wikidata: ["Grêmio Novorizontino", "Grêmio Esportivo Novorizontino"] },
  nautico: { cbf: ["Náutico / PE"], wikidata: ["Clube Náutico Capibaribe"] },
  "operario-pr": { cbf: ["Operário / PR"], wikidata: ["Operário Ferroviário Esporte Clube"] },
  "ponte-preta": { cbf: ["Ponte Preta / SP"], wikidata: ["Associação Atlética Ponte Preta"] },
  sport: { cbf: ["Sport / PE"], tm: "Sport Club do Recife", wikidata: ["Sport Club do Recife"] },
  "sao-bernardo": { cbf: ["Sao Bernardo / SP", "São Bernardo / SP"], wikidata: ["São Bernardo Futebol Clube"] },
  "vila-nova": { cbf: ["Vila Nova / GO"], wikidata: ["Vila Nova Futebol Clube"] },
  // Série C
  "amazonas-fc": { cbf: ["Amazonas / AM"], wikidata: ["Amazonas Futebol Clube"] },
  anapolis: { cbf: ["Anápolis / GO"], wikidata: ["Anápolis Futebol Clube"] },
  "barra-sc": { cbf: ["Barra / SC"], wikidata: ["Barra Futebol Clube"] },
  "botafogo-pb": { cbf: ["Botafogo Pb / PB", "Botafogo / PB"], wikidata: ["Botafogo Futebol Clube (Paraíba)"] },
  brusque: { cbf: ["Brusque / SC"], wikidata: ["Brusque Futebol Clube"] },
  caxias: { cbf: ["Caxias / RS"], wikidata: ["Sociedade Esportiva e Recreativa Caxias do Sul"] },
  confianca: { cbf: ["Confiança / SE"], wikidata: ["Associação Desportiva Confiança"] },
  ferroviaria: { cbf: ["Ferroviária / SP"], wikidata: ["Associação Ferroviária de Esportes"] },
  figueirense: { cbf: ["Figueirense / SC"], wikidata: ["Figueirense Futebol Clube"] },
  floresta: { cbf: ["Floresta / CE"], wikidata: ["Floresta Esporte Clube"] },
  guarani: { cbf: ["Guarani / SP"], wikidata: ["Guarani Futebol Clube"] },
  "inter-de-limeira": { cbf: ["Inter de Limeira / SP"], wikidata: ["Associação Atlética Internacional (Limeira)"] },
  itabaiana: { cbf: ["Itabaiana / SE"], wikidata: ["Associação Olímpica de Itabaiana"] },
  ituano: { cbf: ["Ituano / SP"], wikidata: ["Ituano Futebol Clube"] },
  maranhao: { cbf: ["Maranhão / MA"], wikidata: ["Maranhão Atlético Clube"] },
  maringa: { cbf: ["Maringa / PR", "Maringá / PR"], wikidata: ["Maringá Futebol Clube"] },
  paysandu: { cbf: ["Paysandu / PA"], wikidata: ["Paysandu Sport Club"] },
  "santa-cruz": { cbf: ["Santa Cruz / PE"], wikidata: ["Santa Cruz Futebol Clube"] },
  "volta-redonda": { cbf: ["Volta Redonda / RJ"], wikidata: ["Volta Redonda Futebol Clube"] },
  "ypiranga-rs": { cbf: ["Ypiranga / RS"], wikidata: ["Ypiranga Futebol Clube"] },
};
