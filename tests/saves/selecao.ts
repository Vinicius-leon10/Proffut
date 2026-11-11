// Monta com o motor do jogo saves para os testes das seleções (R91 a R93) e imprime no formato de exportação:
//   npx tsx tests/saves/selecao.ts jogo      técnico do Flamengo e do Brasil, parado no dia do primeiro amistoso do Brasil
//   npx tsx tests/saves/selecao.ts convite   técnico do Flamengo campeão da Série A (de mentira), com os convites de seleções
//   npx tsx tests/saves/selecao.ts copa      técnico do Flamengo e do Brasil, parado no dia da estreia do Brasil na Copa de 2026 (R105)
//   npx tsx tests/saves/selecao.ts europa    técnico do Flamengo e da França, parado no dia do primeiro amistoso da França (R102)
//   npx tsx tests/saves/selecao.ts data-fifa Palmeiras parado num dia de jogo dele na data FIFA de setembro, com convocados fora
//   npx tsx tests/saves/selecao.ts continentais  Flamengo com 2026 jogado, no começo de 2027 (Copa Africana e Copa da Ásia, R112)
import { assumirSelecao, convitesDeSelecoes } from "../../src/engine/selecoes";
import { avancar, meuJogoHoje, novoJogo, simularDia, simularRestoDaTemporada } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";
import type { EstadoJogo } from "../../src/engine/tipos";

const qual = process.argv[2];
const clube = qual === "data-fifa" ? "palmeiras" : "flamengo";
const estado = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente: 7 });
delete estado.tutorial;

/** Campeão da Série A em 2025 com o clube (de mentira, para as seleções chamarem o técnico). */
function campeaoDaSerieA(e: EstadoJogo) {
  e.historico.push({
    temporada: 2025, campeoes: { A: clube, B: "coritiba", C: "londrina" }, artilheiros: { A: null, B: null, C: null },
    promovidos: { A: [], B: [], C: [] }, rebaixados: { A: [], B: [], C: [] },
    tecnico: { clubeId: clube, serie: "A", posicao: 1, objetivo: "Ser campeão", cumpriu: true },
  });
}

let pronto = false;
if (qual === "convite") {
  campeaoDaSerieA(estado);
  pronto = convitesDeSelecoes(estado, 95).length > 0;
} else if (qual === "jogo" || qual === "europa" || qual === "copa") {
  campeaoDaSerieA(estado);
  assumirSelecao(estado, qual === "europa" ? "sel-FR" : "sel-BR");
  estado.config.escalacaoAutomatica = true;
  const alvo = qual === "copa" ? "S-COPA-2026" : "S-AMI";
  for (let i = 0; i < 1500; i++) {
    if (avancar(estado).tipo !== "jogos-hoje") break;
    if (meuJogoHoje(estado)?.serie === alvo) { pronto = true; break; }
    simularDia(estado);
  }
  estado.config.escalacaoAutomatica = false;
} else if (qual === "continentais") {
  // A temporada de 2026 inteira e a virada: o técnico fica no clube (carência o ano todo e a diretoria confiante).
  estado.tecnico.desde = "2026-12-31";
  simularRestoDaTemporada(estado);
  estado.tecnico.confiancaDiretoria = Math.max(estado.tecnico.confiancaDiretoria, 60);
  avancar(estado);
  pronto = estado.temporada === 2027 && estado.tecnico.clubeId === clube;
} else if (qual === "data-fifa") {
  estado.config.escalacaoAutomatica = true;
  for (let i = 0; i < 600; i++) {
    if (avancar(estado).tipo !== "jogos-hoje") break;
    const fora = Object.values(estado.jogadores).some((j) => j.clubeId === clube && j.convocado);
    if (fora && meuJogoHoje(estado)) { pronto = true; break; }
    simularDia(estado);
  }
  estado.config.escalacaoAutomatica = false;
}
if (pronto) process.stdout.write(exportarTexto(estado));
else {
  console.error(`Não deu para montar o save "${qual}".`);
  process.exitCode = 1;
}
