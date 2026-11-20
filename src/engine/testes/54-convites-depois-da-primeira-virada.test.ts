// R153: convites de clubes só depois da primeira virada. Pedido do usuário (nov/2026): no primeiro ano nenhum clube chama o
// técnico ("recebeu, no meio da primeira temporada na Série C, um convite de um clube da Série B").
import { describe, expect, it } from "vitest";
import { FASE_LIGA } from "../competicoes";
import { avancar, novoJogo, simularDia } from "../jogo";
import { elencoDe } from "../mercado";
import type { EstadoJogo } from "../tipos";

/** Santa Cruz (Série C) com um elenco fortíssimo, para estar "encaminhado" no meio da fase de liga. */
function jogoForte(): EstadoJogo {
  const e = novoJogo({ nomeTecnico: "T", clubeId: "santa-cruz", semente: 21 });
  e.config.escalacaoAutomatica = true;
  for (const j of elencoDe(e, "santa-cruz")) { j.forca = 92; j.potencial = 92; }
  return e;
}

/** Joga até passar da metade da fase de liga da Série C do clube do usuário. */
function jogarAtePassarDoMeio(e: EstadoJogo) {
  const meus = () => e.partidas.filter((p) => p.serie === "C" && p.fase === FASE_LIGA.C && (p.mandante === "santa-cruz" || p.visitante === "santa-cruz"));
  for (let k = 0; k < 400; k++) {
    const lista = meus();
    if (lista.length && lista.filter((p) => p.jogada).length > Math.ceil(lista.length / 2) + 1) return;
    const r = avancar(e);
    if (r.tipo === "jogos-hoje") simularDia(e);
    if (r.tipo === "nova-temporada" || r.tipo === "fim-dos-jogos" || r.tipo === "nada") break;
  }
  throw new Error("não chegou ao meio da fase de liga");
}

const convitesDoMeio = (e: EstadoJogo) => e.mensagens.filter((m) => m.convite);

describe("convites só depois da primeira virada (R153)", () => {
  it("na primeira temporada do técnico no clube, nenhum convite no meio da fase de liga, mesmo encaminhado", () => {
    const e = jogoForte();
    jogarAtePassarDoMeio(e);
    expect(convitesDoMeio(e)).toEqual([]);
  }, 240_000);

  it("depois da primeira virada no clube (técnico chegou no ano anterior), o convite do meio da temporada volta", () => {
    const e = jogoForte();
    e.tecnico.desde = "2025-01-03";
    jogarAtePassarDoMeio(e);
    expect(convitesDoMeio(e).length).toBeGreaterThan(0);
  }, 240_000);
});
