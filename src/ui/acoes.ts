// Ações de jogo disparadas pela interface.
import { temporadaEncerrada } from "../engine/competicoes";
import { contratosTerminando } from "../engine/contratos";
import { avancar, prepararJogos, simularDia, simularRestoDaTemporada } from "../engine/jogo";
import { useLoja } from "./store";

/** Botão "Avançar": vai ao próximo dia de jogo e abre a partida ao vivo ou os resultados. */
export function avancarJogo() {
  const { estado, atualizar, abrir, avisar } = useLoja.getState();
  if (!estado) return;
  // Na virada, quem não renovou sai de graça: pergunta antes, citando os nomes.
  const saem = temporadaEncerrada(estado) ? contratosTerminando(estado) : [];
  if (saem.length && !window.confirm(`Sem renovar, saem de graça na virada: ${saem.map((j) => j.nome).join(", ")}. Encerrar a temporada mesmo assim?`)) return;
  const r = avancar(estado);
  if (r.tipo === "nova-temporada") {
    atualizar();
    abrir({ tipo: "fim-temporada" });
    return;
  }
  if (r.tipo === "nada") {
    avisar("Não há jogos a disputar.");
    return;
  }
  if (r.meuJogo) {
    const vivas = prepararJogos(estado);
    atualizar();
    abrir({ tipo: "ao-vivo", vivas });
  } else {
    const vivas = simularDia(estado);
    atualizar();
    const ids = new Set(vivas.map((v) => v.partidaId));
    abrir({ tipo: "resultados", partidas: estado.partidas.filter((p) => ids.has(p.id)) });
  }
}

export function simularFimDaTemporada() {
  const { estado, atualizar, avisar } = useLoja.getState();
  if (!estado) return;
  simularRestoDaTemporada(estado);
  atualizar();
  avisar("Temporada simulada até o fim.");
}
