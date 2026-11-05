// Monta com o motor do jogo um jogo novo do Flamengo cuja primeira partida tem pênalti, gol e cartão vermelho, e imprime
// o save no formato de exportação (o teste R88 importa esse arquivo para ouvir o narrador).
//   npx tsx tests/saves/gol-penalti-vermelho.ts > save.json
import { avancar, novoJogo, prepararJogos } from "../../src/engine/jogo";
import { simularAteOFim } from "../../src/engine/partida";
import { exportarTexto } from "../../src/save/salvamento";

const CLUBE = "flamengo";
let achou = false;
for (let semente = 1; semente <= 3000 && !achou; semente++) {
  const inicial = novoJogo({ nomeTecnico: "Teste", clubeId: CLUBE, semente });
  // A partida ao vivo usa o mesmo sorteio que esta simulação: mesmo jogo, mesmos lances.
  const ensaio = structuredClone(inicial);
  avancar(ensaio);
  const meu = prepararJogos(ensaio).find((pv) => pv.lados.some((l) => l.clubeId === CLUBE))!;
  simularAteOFim(meu, ensaio.jogadores);
  const tipos = new Set(meu.narracao.map((e) => e.tipo));
  if (tipos.has("penalti") && tipos.has("vermelho") && (tipos.has("gol") || tipos.has("gol-penalti"))) {
    // Sem process.exit: numa saída por pipe o texto só sai inteiro se o processo terminar sozinho.
    process.stdout.write(exportarTexto(inicial));
    achou = true;
  }
}
if (!achou) {
  console.error("Nenhuma semente deu pênalti, gol e vermelho no primeiro jogo.");
  process.exitCode = 1;
}
