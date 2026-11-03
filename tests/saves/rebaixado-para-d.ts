// Monta com o motor do jogo a temporada de 2026 inteira do clube pedido (da Série C), que cai para a Série D, com a
// diretoria ainda confiando no técnico, parado logo antes da virada (teste R81: o técnico treina qualquer clube e continua
// no clube na Série D).
//   npx tsx tests/saves/rebaixado-para-d.ts brusque > save.json
import { novoJogo, simularRestoDaTemporada } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const clube = process.argv[2];
const estado = novoJogo({ nomeTecnico: "Teste", clubeId: clube, semente: 9 });
delete estado.tutorial;
estado.config.escalacaoAutomatica = true;
simularRestoDaTemporada(estado);
const C = estado.series.C;
if (!C.rebaixados.includes(clube)) C.rebaixados[0] = clube;
delete estado.tecnico.demissao;
estado.tecnico.confiancaDiretoria = 80;
process.stdout.write(exportarTexto(estado));
