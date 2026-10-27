// Monta com o motor do jogo um jogo do clube pedido com a temporada de 2026 inteira jogada, parado logo antes
// da virada, e imprime o save no formato de exportação (o teste R38 renova um contrato e vê quem sai de graça).
//   npx tsx tests/saves/fim-da-temporada.ts ponte-preta > save.json
import { novoJogo, simularRestoDaTemporada } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: process.argv[2], semente: 9 });
simularRestoDaTemporada(estado);
process.stdout.write(exportarTexto(estado));
