// Nomes para os jogadores gerados. Combinações aleatórias: qualquer semelhança
// com jogadores reais é coincidência.
import type { Rng } from "./rng";

const PRIMEIROS = [
  "Gabriel", "Lucas", "Matheus", "Pedro", "Guilherme", "Rafael", "Felipe", "Bruno", "Gustavo", "Vitor",
  "João", "Thiago", "Diego", "Rodrigo", "Leonardo", "Eduardo", "Caio", "Henrique", "Arthur", "Daniel",
  "Marcos", "André", "Fábio", "Renan", "Igor", "Wesley", "Willian", "Everton", "Allan", "Luan",
  "Kaio", "Breno", "Davi", "Samuel", "Murilo", "Vinícius", "Danilo", "Douglas", "Fernando", "Ricardo",
  "Júlio", "Leandro", "Maicon", "Patrick", "Reinaldo", "Sandro", "Tiago", "Yuri", "Wellington", "Jefferson",
  "Alex", "Anderson", "Carlos", "Cristian", "Emerson", "Fabrício", "Gilberto", "Hugo", "Ítalo", "Jonas",
  "Kauã", "Lorran", "Marlon", "Nathan", "Otávio", "Paulo", "Raul", "Sérgio", "Ruan", "Vagner",
  "Wallace", "Adriel", "Bernardo", "Cauã", "Dênis", "Elias", "Erick", "Francisco", "Heitor", "Ian",
  "Jean", "Kevin", "Luiz", "Márcio", "Nicolas", "Railan", "Renato", "Ronaldo", "Rômulo", "Talles",
  "Valdir", "Wendel", "Yago", "Zeca", "Alisson", "Cleiton", "Dyego", "Emanuel", "Gerson", "Hernani",
];

const SOBRENOMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Rodrigues", "Almeida",
  "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Gomes", "Martins", "Rocha", "Barbosa", "Melo", "Cardoso",
  "Teixeira", "Correia", "Moreira", "Batista", "Freitas", "Mendes", "Pinto", "Moura", "Cavalcanti", "Dias",
  "Castro", "Campos", "Monteiro", "Vieira", "Nunes", "Lopes", "Machado", "Ramos", "Farias", "Borges",
  "Matos", "Sales", "Bezerra", "Brandão", "Queiroz", "Tavares", "Xavier", "Duarte", "Siqueira", "Paiva",
  "Rezende", "Fonseca", "Macedo", "Pires", "Assis", "Leite", "Aguiar", "Peixoto", "Sampaio", "Bastos",
  "Coelho", "Damasceno", "Esteves", "Falcão", "Garcia", "Holanda", "Jardim", "Lacerda", "Maia", "Neves",
  "Prado", "Quintela", "Sena", "Torres", "Valente", "Vasconcelos", "Antunes", "Barros", "Cunha", "Dantas",
];

const COMPOSTOS = [
  "João Pedro", "Pedro Henrique", "Paulo Henrique", "Luiz Gustavo", "Carlos Eduardo", "João Victor",
  "Luiz Felipe", "Pedro Lucas", "João Lucas", "Marcos Vinícius", "José Carlos", "Luiz Otávio",
  "Gabriel Henrique", "Matheus Henrique", "Vitor Hugo", "Luiz Henrique", "João Paulo", "Ruan Pablo",
  "Kaio César", "Caio Henrique", "Pedro Augusto", "Juan Carlos", "Davi Lucas", "Arthur Gabriel",
];

const APELIDOS = [
  "Dudu", "Juninho", "Pedrinho", "Luizinho", "Bruninho", "Joãozinho", "Netinho", "Leozinho", "Tchê",
  "Biel", "Marquinhos", "Paulinho", "Toninho", "Serginho", "Gui", "Dedé", "Rafinha", "Fabinho",
  "Zé Vitor", "Zé Lucas", "Zé Gabriel", "Zé Ricardo", "Thiaguinho", "Vitinho", "Caíque", "Jajá",
];

/** O apelido de origem, bem comum no futebol brasileiro ("Rafael Baiano"). */
const ORIGENS = [
  "Baiano", "Paraíba", "Mineiro", "Gaúcho", "Paulista", "Carioca", "Potiguar", "Cearense", "Goiano",
  "Pernambucano", "Maranhão", "Capixaba", "Paraense", "Catarinense", "Alagoano", "Sergipano",
];

const HISPANICOS_PRIMEIROS = [
  "Juan", "Matías", "Nicolás", "Santiago", "Facundo", "Agustín", "Gonzalo", "Franco", "Lautaro", "Ignacio",
  "Diego", "Sebastián", "Andrés", "Felipe", "Emiliano", "Joaquín", "Rodrigo", "Tomás", "Bruno", "Cristian",
];
const HISPANICOS_SOBRENOMES = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "Gómez", "Díaz", "Pérez", "Romero", "Sosa",
  "Benítez", "Acosta", "Medina", "Herrera", "Suárez", "Castillo", "Rojas", "Vargas", "Aguirre", "Ortiz",
  "Cabrera", "Villalba", "Paredes", "Godoy", "Ojeda", "Bustos", "Arce", "Cáceres", "Molina", "Ríos",
];

export const NACIONALIDADES_ESTRANGEIRAS = ["ARG", "URU", "COL", "PAR", "CHI", "EQU", "VEN", "PER", "BOL"];

/** Países de língua inglesa e francesa da América (nov/2026): nomes do inglês e do francês, não do espanhol. */
const ANGLOS = new Set(["EUA", "CAN", "JAM", "TRI", "GUY", "BRB", "BAH", "BER", "CAY", "LCA", "GRN", "VIN", "SKN", "ATG", "DMA", "MSR", "AIA", "VGB", "VIR", "TCA", "BLZ", "SXM"]);
const FRANCOS = new Set(["HAI", "MTQ", "GLP", "GUF", "SMN"]);
const NEERLANDESES = new Set(["SUR", "CUW", "ARU", "BOE"]);
const INGLESES_PRIMEIROS = ["James", "John", "Michael", "David", "Chris", "Daniel", "Andre", "Kevin", "Jordan", "Tyler", "Brandon", "Justin",
  "Marcus", "Ryan", "Tevin", "Kemar", "Shamar", "Romario", "Damion", "Javon", "Leon", "Aaron", "Jamal", "Dwayne", "Kyle", "Liam"];
const INGLESES_SOBRENOMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Taylor", "Thomas", "Moore",
  "Jackson", "White", "Harris", "Clarke", "Campbell", "Reid", "Bailey", "Lewis", "Gordon", "Morgan", "Grant", "Francis", "Henry", "Walker"];
const FRANCESES_PRIMEIROS = ["Jean", "Pierre", "Louis", "Marc", "Kevin", "Wilner", "Frantz", "Duckens", "Mikaël", "Jérémy", "Yannick",
  "Steeven", "Ronaldo", "Johnny", "Carlens", "Derrick", "Fabrice", "Romain", "Thomas", "Loïc"];
const FRANCESES_SOBRENOMES = ["Joseph", "Pierre", "Jean-Baptiste", "Louis", "Charles", "François", "Saint-Fleur", "Lafontant", "Bernard",
  "Étienne", "Alcéna", "Désir", "Augustin", "Germain", "Lambert", "Moreau", "Dorval", "Belfort", "Vital", "Jacques"];
const NEERLANDESES_PRIMEIROS = ["Kenji", "Jurich", "Gervane", "Sheraldo", "Ryan", "Leandro", "Juninho", "Rangelo", "Tahith", "Kevin",
  "Jearl", "Roshon", "Shermar", "Vurnon", "Dion", "Gleofilo"];
const NEERLANDESES_SOBRENOMES = ["Martina", "Bacuna", "Kastaneer", "Janga", "Gorré", "Hooi", "Maria", "Roemeratoe", "Margaritha", "Felida",
  "Brenet", "Chong", "Tokaay", "Vlijter", "Leerdam", "Anita"];

export function gerarNome(rng: Rng, nacionalidade: string): string {
  const doPar = (primeiros: string[], sobrenomes: string[]) => `${rng.escolher(primeiros)} ${rng.escolher(sobrenomes)}`;
  if (ANGLOS.has(nacionalidade)) return doPar(INGLESES_PRIMEIROS, INGLESES_SOBRENOMES);
  if (FRANCOS.has(nacionalidade)) return doPar(FRANCESES_PRIMEIROS, FRANCESES_SOBRENOMES);
  if (NEERLANDESES.has(nacionalidade)) return doPar(NEERLANDESES_PRIMEIROS, NEERLANDESES_SOBRENOMES);
  if (nacionalidade !== "BRA") {
    const primeiro = rng.escolher(HISPANICOS_PRIMEIROS);
    const sobrenome = rng.escolher(HISPANICOS_SOBRENOMES);
    return rng.chance(0.35) ? sobrenome : `${primeiro} ${sobrenome}`;
  }
  const r = rng();
  if (r < 0.12) return rng.escolher(APELIDOS);
  if (r < 0.27) return rng.escolher(COMPOSTOS);
  if (r < 0.33) return `${rng.escolher(PRIMEIROS)} ${rng.escolher(ORIGENS)}`;
  return `${rng.escolher(PRIMEIROS)} ${rng.escolher(SOBRENOMES)}`;
}
