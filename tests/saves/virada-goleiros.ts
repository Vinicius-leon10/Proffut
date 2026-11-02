// Monta com o motor do jogo a temporada de 2026 inteira e deixa o Progreso (Uruguai, do computador) com o elenco cheio
// (33) e os 4 goleiros como os mais fracos, parado logo antes da virada (teste R75: na virada, os clubes do computador
// dispensam os excedentes mais fracos, mas nenhuma posição pode ficar abaixo do mínimo).
//   npx tsx tests/saves/virada-goleiros.ts > save.json
import { novoJogo, simularRestoDaTemporada } from "../../src/engine/jogo";
import { elencoDe } from "../../src/engine/mercado";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 9 });
delete estado.tutorial;
estado.config.escalacaoAutomatica = true;
simularRestoDaTemporada(estado);
const clube = "progreso";
const elenco = elencoDe(estado, clube);
const goleiros = elenco.filter((j) => j.posicao === "G");
const linha = elenco.filter((j) => j.posicao !== "G");
// Quatro goleiros, os mais fracos do elenco (com contrato e longe de se aposentar).
while (goleiros.length < 4) {
  const novo = { ...structuredClone(goleiros[0]), id: estado.proximoIdJogador++ };
  estado.jogadores[novo.id] = novo;
  goleiros.push(novo);
}
for (const g of goleiros) Object.assign(g, { forca: 10, idade: 24, contratoAte: estado.temporada + 2 });
// Elenco cheio: 33 jogadores (os de linha que entram são cópias dos que já estão).
for (let i = 0; elencoDe(estado, clube).length < 33; i++) {
  const novo = { ...structuredClone(linha[i % linha.length]), id: estado.proximoIdJogador++ };
  estado.jogadores[novo.id] = novo;
}
process.stdout.write(exportarTexto(estado));
