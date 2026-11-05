// Monta com o motor do jogo um jogo do Flamengo parado no dia do primeiro jogo dele na fase de grupos da Libertadores
// (já sorteada, depois da 3ª fase), antes de jogar, e imprime o save no formato de exportação (testes R88 e R89).
//   npx tsx tests/saves/libertadores-grupos.ts > save.json
import { avancar, meuJogoHoje, novoJogo, simularDia } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "flamengo", semente: 7 });
delete estado.tutorial;
estado.config.escalacaoAutomatica = true;
let pronto = false;
for (let i = 0; i < 600; i++) {
  if (avancar(estado).tipo !== "jogos-hoje") break;
  const meu = meuJogoHoje(estado);
  if (meu?.serie === "K-LIB" && meu.fase === "grupos") { pronto = true; break; }
  simularDia(estado);
}
estado.config.escalacaoAutomatica = false;
if (pronto) process.stdout.write(exportarTexto(estado));
else {
  console.error("O Flamengo não chegou à fase de grupos da Libertadores.");
  process.exitCode = 1;
}
