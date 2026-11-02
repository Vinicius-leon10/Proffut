// Monta com o motor do jogo um save de antes da Copa do Brasil (sem ela, o último jogo do Brasil é a final da Série C) com
// a temporada de 2026 jogada até o último jogo das séries; depois dele só faltam jogos de fora do Brasil (a 2ª divisão
// da Argentina, 36 clubes em turno único, termina depois). Imprime o save (teste R79: o "Avançar" joga esses jogos e
// para; a virada espera o botão "Encerrar a temporada", que pergunta antes quem sai de graça).
//   npx tsx tests/saves/so-faltam-jogos-de-fora.ts > save.json
import { SERIES } from "../../src/engine/competicoes";
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import { competicoesDoUsuario } from "../../src/engine/torneios";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "avai", semente: 33 });
delete estado.tutorial;
estado.config.escalacaoAutomatica = true;
delete estado.copa;
estado.partidas = estado.partidas.filter((p) => p.serie !== "CB");
const doUsuario = () => {
  const usuario = competicoesDoUsuario(estado);
  return estado.partidas.filter((p) => !p.jogada && usuario.has(p.serie));
};
for (let i = 0; i < 400; i++) {
  if (!doUsuario().length && SERIES.every((s) => estado.series[s].fase === "encerrada")) break;
  if (avancar(estado).tipo !== "jogos-hoje") break;
  simularDia(estado);
}
const faltam = estado.partidas.filter((p) => !p.jogada);
if (estado.temporada !== 2026 || doUsuario().length || !faltam.some((p) => p.serie === "L-AR2")) {
  throw new Error(`Não sobraram só jogos de fora do Brasil (${estado.temporada}, ${estado.data}, ${faltam.length} jogos).`);
}
process.stdout.write(exportarTexto(estado));
