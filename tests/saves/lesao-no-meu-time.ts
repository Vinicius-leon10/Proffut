// Monta com o motor do jogo um jogo novo do clube pedido cuja primeira partida tem um jogador do clube machucado no
// primeiro tempo (com substituições sobrando), e imprime o save no formato de exportação. O teste R129 vê a partida
// parar e escolhe outro reserva no lugar do que o auxiliar pôs.
//   npx tsx tests/saves/lesao-no-meu-time.ts flamengo > save.json
import { avancar, novoJogo, prepararJogos } from "../../src/engine/jogo";
import { avancarMinuto } from "../../src/engine/partida";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
let achou = false;
for (let semente = 1; semente <= 2000 && !achou; semente++) {
  const inicial = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente });
  const ensaio = structuredClone(inicial);
  avancar(ensaio);
  const meu = prepararJogos(ensaio).find((pv) => pv.lados.some((l) => l.clubeId === clube && l.controlado));
  if (!meu) continue;
  for (let i = 0; i < 40 && !meu.terminada; i++) {
    avancarMinuto(meu, ensaio.jogadores);
    if (meu.lesaoNoMeuTime && meu.lados[meu.lesaoNoMeuTime.lado].banco.length >= 2) {
      process.stdout.write(exportarTexto(inicial));
      achou = true;
      break;
    }
  }
}
if (!achou) {
  console.error(`Nenhuma semente deu lesão no ${clube} no primeiro tempo do primeiro jogo.`);
  process.exitCode = 1;
}
