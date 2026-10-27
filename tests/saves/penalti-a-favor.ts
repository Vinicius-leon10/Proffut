// Monta com o motor do jogo um jogo novo do clube pedido cuja primeira partida tem um pênalti a favor dele, cobrado
// pelo goleiro titular quando ele é o batedor escolhido, e imprime o save (sem batedor escolhido) no formato de
// exportação. O teste R40 escolhe o goleiro como batedor na Tática e vê quem cobra.
//   npx tsx tests/saves/penalti-a-favor.ts flamengo > save.json
import { FORMACOES } from "../../src/engine/forca";
import { avancar, novoJogo, prepararJogos } from "../../src/engine/jogo";
import { simularAteOFim } from "../../src/engine/partida";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
let achou = false;
for (let semente = 1; semente <= 500 && !achou; semente++) {
  const inicial = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente });
  // Ensaio com o goleiro titular como batedor: a partida ao vivo usa o mesmo sorteio que esta simulação.
  const ensaio = structuredClone(inicial);
  const goleiro = ensaio.clubes[clube].escalacao.titulares[FORMACOES[ensaio.clubes[clube].tatica.formacao].findIndex((v) => v.pos === "G")]!;
  ensaio.clubes[clube].batedor = goleiro;
  avancar(ensaio);
  const meu = prepararJogos(ensaio).find((pv) => pv.lados.some((l) => l.clubeId === clube))!;
  const lado = meu.lados.findIndex((l) => l.clubeId === clube);
  simularAteOFim(meu, ensaio.jogadores);
  const cobranca = meu.narracao.find((e) => e.lado === lado && e.texto.endsWith("ajeita a bola na marca do pênalti..."));
  if (cobranca?.texto.startsWith(ensaio.jogadores[goleiro].nome)) {
    process.stdout.write(exportarTexto(inicial));
    achou = true;
  }
}
if (!achou) {
  console.error(`Nenhuma semente deu pênalti a favor do ${clube} cobrado pelo goleiro no primeiro jogo.`);
  process.exitCode = 1;
}
