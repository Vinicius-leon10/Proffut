// Monta com o motor do jogo um jogo novo do clube pedido cuja primeira partida tem gol dele, e imprime
// o save no formato de exportação (o teste R26 importa esse arquivo para ouvir o narrador).
//   npx tsx tests/saves/gol-do-clube.ts chapecoense > save.json
import { avancar, novoJogo, prepararJogos } from "../../src/engine/jogo";
import { simularAteOFim } from "../../src/engine/partida";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
let achou = false;
for (let semente = 1; semente <= 500 && !achou; semente++) {
  const inicial = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente });
  // A partida ao vivo usa o mesmo sorteio que esta simulação: mesmo jogo, mesmos lances.
  const ensaio = structuredClone(inicial);
  avancar(ensaio);
  const meu = prepararJogos(ensaio).find((pv) => pv.lados.some((l) => l.clubeId === clube))!;
  const lado = meu.lados.findIndex((l) => l.clubeId === clube);
  simularAteOFim(meu, ensaio.jogadores);
  if (meu.narracao.some((e) => (e.tipo === "gol" || e.tipo === "gol-penalti") && e.lado === lado)) {
    // Sem process.exit: numa saída por pipe o texto só sai inteiro se o processo terminar sozinho.
    process.stdout.write(exportarTexto(inicial));
    achou = true;
  }
}
if (!achou) {
  console.error(`Nenhuma semente deu gol do ${clube} no primeiro jogo.`);
  process.exitCode = 1;
}
