// Monta com o motor do jogo um jogo do clube pedido com a temporada de 2026 inteira jogada, parado logo antes
// da virada, e imprime o save no formato de exportação (os testes R38 e R39 mexem em contratos e empréstimos; com
// "forte", o elenco joga com força 90 e o clube termina campeão, para o R42 ver os troféus).
//   npx tsx tests/saves/fim-da-temporada.ts ponte-preta [forte] > save.json
import { novoJogo, simularRestoDaTemporada } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const [clube, forte] = process.argv.slice(2);
const estado = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente: 9 });
if (forte) for (const j of Object.values(estado.jogadores)) if (j.clubeId === clube) j.forca = 90;
simularRestoDaTemporada(estado);
process.stdout.write(exportarTexto(estado));
