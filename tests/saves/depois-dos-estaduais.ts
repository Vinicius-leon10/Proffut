// Monta com o motor do jogo um jogo do clube pedido parado logo depois do estadual (no começo do ano), antes do
// primeiro jogo das séries (ou da Copa do Brasil), e imprime o save no formato de exportação. Os testes que precisam do calendário das
// séries (resultados de um dia sem jogo do usuário, a Copa do Brasil...) começam por ele em vez de jogar o estadual.
//   npx tsx tests/saves/depois-dos-estaduais.ts brusque > save.json
import { avancar, meuJogoHoje, novoJogo, simularDia } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
const estado = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente: 7 });
delete estado.tutorial;
let pronto = false;
for (let i = 0; i < 400; i++) {
  if (avancar(estado).tipo !== "jogos-hoje") break;
  // Para no dia do primeiro jogo do clube nas séries ou na Copa do Brasil, antes de jogar (as outras copas do começo do
  // ano, como a Copa do Nordeste e a Supercopa, são jogadas no caminho, como o estadual).
  const meu = meuJogoHoje(estado);
  if (meu && !meu.serie.startsWith("E-") && !meu.serie.startsWith("K-")) { pronto = true; break; }
  simularDia(estado);
}
if (pronto) process.stdout.write(exportarTexto(estado));
else {
  console.error(`Não deu para passar do estadual com ${clube}.`);
  process.exitCode = 1;
}
