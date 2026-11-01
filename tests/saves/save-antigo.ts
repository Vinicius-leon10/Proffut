// Monta com o motor do jogo um save "de antes dos times novos" (out/2026): sem os clubes só do estadual e os de
// fora, sem os elencos da Série D e sem torneios, com a temporada já andando, e imprime no formato de exportação.
// O teste R69 abre esse save e confere que os times novos chegam.
//   npx tsx tests/saves/save-antigo.ts > save.json
import { avancar, novoJogo, simularDia } from "../../src/engine/jogo";
import { exportarTexto } from "../../src/save/salvamento";

const estado = novoJogo({ nomeTecnico: "Teste", clubeId: "ponte-preta", semente: 13 });
delete estado.tutorial;
// Joga o primeiro dia de jogos, como num save que já estava andando.
avancar(estado);
simularDia(estado);
const novos = new Set(Object.values(estado.clubes).filter((c) => c.serie === "estadual" || c.serie === "exterior").map((c) => c.id));
for (const j of Object.values(estado.jogadores)) {
  if (j.clubeId && (novos.has(j.clubeId) || estado.clubes[j.clubeId].serie === "D")) delete estado.jogadores[j.id];
}
for (const id of novos) delete estado.clubes[id];
for (const c of Object.values(estado.clubes)) { delete c.estadual; c.escalacao = c.serie === "D" ? { titulares: [], reservas: [] } : c.escalacao; }
estado.partidas = estado.partidas.filter((p) => !(p.serie === "D" || p.serie.startsWith("E-") || p.serie.startsWith("L-")));
delete estado.torneios;
// O save antigo estava em abril, na temporada das séries.
estado.data = "2026-04-04";
process.stdout.write(exportarTexto(estado));
