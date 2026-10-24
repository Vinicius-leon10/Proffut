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

export function gerarNome(rng: Rng, nacionalidade: string): string {
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
