// Monta com o motor do jogo um jogo da Ponte Preta com a diretoria quase sem paciência (confiança 21, técnico no
// clube há tempo) e o elenco sem força (5), e imprime o save no formato de exportação. Com esta semente o primeiro
// jogo é uma derrota (Criciúma 5 x 0), e o teste R36 vê a demissão; com um jogo novo sorteado, ~2 em 100 empatavam
// fora de casa e a diretoria ainda não demitia.
//   npx tsx tests/saves/diretoria-sem-paciencia.ts > save.json
import { novoJogo } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 2 });
estado.tecnico.confiancaDiretoria = 21;
estado.tecnico.desde = "2025-01-01";
for (const j of Object.values(estado.jogadores)) if (j.clubeId === "ponte-preta") j.forca = 5;
process.stdout.write(exportarTexto(estado));
