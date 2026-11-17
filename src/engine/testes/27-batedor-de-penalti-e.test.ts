// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { capitaoDoTime } from "../forca";
import { avancar, novoJogo, prepararJogos } from "../jogo";
import { avancarMinuto, cobradores, notaCobrador } from "../partida";
import type { EstadoJogo } from "../tipos";

describe("batedor de pênalti e capitão", () => {
  const jogoDoFlamengo = (semente: number, batedor?: (estado: EstadoJogo, titulares: number[]) => number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente });
    const titulares = estado.clubes.flamengo.escalacao.titulares.filter((id): id is number => id != null);
    if (batedor) estado.clubes.flamengo.batedor = batedor(estado, titulares);
    avancar(estado);
    const pv = prepararJogos(estado).find((v) => v.lados.some((l) => l.clubeId === "flamengo"))!;
    const lado = (pv.lados[0].clubeId === "flamengo" ? 0 : 1) as 0 | 1;
    return { estado, pv, lado, titulares };
  };
  const goleiro = (estado: EstadoJogo, titulares: number[]) => titulares.find((id) => estado.jogadores[id].posicao === "G")!;
  const cobrador = (pv: ReturnType<typeof jogoDoFlamengo>["pv"]) => pv.narracao.find((e) => e.texto.endsWith("ajeita a bola na marca do pênalti..."))!.texto;

  it("o batedor escolhido cobra o pênalti quando está em campo; fora de campo, cobra o melhor batedor", () => {
    const comGoleiro = jogoDoFlamengo(51, goleiro);
    const nomeDoGoleiro = comGoleiro.estado.jogadores[comGoleiro.estado.clubes.flamengo.batedor!].nome;
    comGoleiro.pv.penaltiPendente = comGoleiro.lado;
    avancarMinuto(comGoleiro.pv, comGoleiro.estado.jogadores);
    expect(cobrador(comGoleiro.pv).startsWith(nomeDoGoleiro)).toBe(true);

    // Escolhido um reserva (fora de campo): cobra quem tem a maior nota entre os que estão em campo.
    const comReserva = jogoDoFlamengo(51, (estado) => estado.clubes.flamengo.escalacao.reservas[0]);
    comReserva.pv.penaltiPendente = comReserva.lado;
    avancarMinuto(comReserva.pv, comReserva.estado.jogadores);
    const emCampo = comReserva.pv.lados[comReserva.lado].emCampo.map((a) => comReserva.estado.jogadores[a.jogadorId]);
    const melhor = [...emCampo].sort((a, b) => notaCobrador(b) - notaCobrador(a))[0];
    expect(cobrador(comReserva.pv).startsWith(melhor.nome)).toBe(true);
  });

  it("na disputa por pênaltis o batedor escolhido bate primeiro; sem escolha, a ordem é pela nota (e o jogo não muda)", () => {
    const { estado, pv, lado } = jogoDoFlamengo(52, goleiro);
    expect(cobradores(pv.lados[lado], estado.jogadores)[0].id).toBe(estado.clubes.flamengo.batedor);
    const outro = pv.lados[lado === 0 ? 1 : 0];
    const ordem = cobradores(outro, estado.jogadores).map(notaCobrador);
    expect(ordem).toEqual([...ordem].sort((a, b) => b - a));
  });

  it("o capitão é o escolhido se for titular; senão, o titular mais experiente", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 53 });
    const titulares = estado.clubes.flamengo.escalacao.titulares;
    const ids = titulares.filter((id): id is number => id != null);
    const experiencia = (id: number) => estado.jogadores[id].carreira.jogos + estado.jogadores[id].temporada.jogos;
    const automatico = capitaoDoTime(estado, "flamengo", titulares)!;
    for (const id of ids) expect(experiencia(automatico)).toBeGreaterThanOrEqual(experiencia(id));
    estado.clubes.flamengo.capitao = ids[3];
    expect(capitaoDoTime(estado, "flamengo", titulares)).toBe(ids[3]);
    estado.clubes.flamengo.capitao = estado.clubes.flamengo.escalacao.reservas[0];
    expect(capitaoDoTime(estado, "flamengo", titulares), "reserva não usa a braçadeira").toBe(automatico);
  });
});
