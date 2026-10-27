// Monta com o motor do jogo um jogo do clube pedido, com o elenco bem forte (lidera a série), parado logo
// antes do jogo do meio da fase de liga, e imprime o save no formato de exportação (o teste R37 joga esse
// jogo e recebe o convite de um clube maior).
//   npx tsx tests/saves/meio-da-temporada.ts ponte-preta > save.json
import { FASE_LIGA } from "../../src/engine/competicoes";
import { avancar, novoJogo, proximoJogoDoClube, simularDia } from "../../src/engine/jogo";
import type { Partida, SerieId } from "../../src/engine/tipos";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
const estado = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente: 7 });
for (const j of Object.values(estado.jogadores)) if (j.clubeId === clube) j.forca = 90;
const serie = estado.clubes[clube].serie as SerieId;
const daLiga = (p: Partida) => p.serie === serie && p.fase === FASE_LIGA[serie] && (p.mandante === clube || p.visitante === clube);
const metade = Math.ceil(estado.partidas.filter(daLiga).length / 2);
let pronto = false;
for (let i = 0; i < 400 && !pronto; i++) {
  const proximo = proximoJogoDoClube(estado, clube);
  if (estado.partidas.filter((p) => daLiga(p) && p.jogada).length === metade - 1 && proximo && daLiga(proximo)) {
    pronto = true;
    break;
  }
  if (avancar(estado).tipo !== "jogos-hoje") break;
  simularDia(estado);
}
if (pronto) process.stdout.write(exportarTexto(estado));
else {
  console.error(`Não deu para chegar ao meio da fase de liga com ${clube}.`);
  process.exitCode = 1;
}
