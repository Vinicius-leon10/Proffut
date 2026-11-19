// R146: o técnico de um clube de agosto a maio fecha a temporada em 1º de julho, e não em dezembro (etapa 5 do plano das
// temporadas reais, docs/PLANO_TEMPORADAS_REAIS.md: "o botão e a tela de fim de temporada, histórico 2026/27, objetivo, confiança
// e demissão por ciclo"). Quem treina um clube do ano civil continua fechando em dezembro, com o botão "Encerrar a temporada".
import { describe, expect, it } from "vitest";
import { avancar, novoJogo, simularDia, temporadaDoUsuarioEncerrada } from "../jogo";
import { temporadaEncerrada } from "../competicoes";
import type { EstadoJogo } from "../tipos";

/** Avança até `ate`; devolve os tipos de resultado do Avançar que não eram jogo (a virada e o fim da temporada do técnico). */
function avancarAte(estado: EstadoJogo, ate: string): string[] {
  const tipos: string[] = [];
  for (let i = 0; i < 4000 && estado.data < ate; i++) {
    const r = avancar(estado);
    if (r.tipo === "jogos-hoje") simularDia(estado);
    else if (r.tipo === "nada") break;
    else tipos.push(r.tipo);
  }
  return tipos;
}

describe("técnico por ciclo (R146)", () => {
  it("clube do Brasil: a temporada acaba em dezembro, com o botão; clube da Europa: não há botão em dezembro", () => {
    const br = novoJogo({ nomeTecnico: "T", clubeId: "flamengo", semente: 7 });
    br.config.escalacaoAutomatica = true;
    expect(temporadaDoUsuarioEncerrada(br)).toBe(false);
    for (let i = 0; i < 4000 && !temporadaEncerrada(br); i++) {
      const r = avancar(br);
      if (r.tipo === "jogos-hoje") simularDia(br);
    }
    expect(temporadaDoUsuarioEncerrada(br)).toBe(true);
    // O jogador de um clube de agosto a maio nunca vê o "Encerrar a temporada" em dezembro.
    const eu = novoJogo({ nomeTecnico: "T", clubeId: "real-madrid", semente: 7 });
    eu.config.escalacaoAutomatica = true;
    for (let i = 0; i < 4000 && !temporadaEncerrada(eu); i++) {
      const r = avancar(eu);
      if (r.tipo === "jogos-hoje") simularDia(eu);
    }
    expect(temporadaEncerrada(eu)).toBe(true);
    expect(temporadaDoUsuarioEncerrada(eu)).toBe(false);
  }, 600_000);

  it("Real Madrid: dezembro vira o mundo sem fechar a temporada dele; em 1º de julho de 2027 chega o fim da temporada 2026/27 e o objetivo de 2027/28", () => {
    const e = novoJogo({ nomeTecnico: "T", clubeId: "real-madrid", semente: 7 });
    e.config.escalacaoAutomatica = true;
    const diretoria = e.tecnico.confiancaDiretoria;
    const reputacao = e.tecnico.reputacao;
    const tipos = avancarAte(e, "2027-01-05");
    // A virada de dezembro aconteceu (o mundo do ano civil), sem a tela de fim da temporada para ele.
    expect(e.temporada).toBe(2027);
    expect(tipos).not.toContain("nova-temporada");
    expect(e.historico[0].tecnico.emAndamento).toBe(true);
    expect(e.mensagens.some((m) => m.titulo === "Objetivo para 2027")).toBe(false);
    expect(e.mensagens.some((m) => m.titulo === "Fim da temporada 2026")).toBe(true);
    expect(e.mensagens.find((m) => m.titulo === "Fim da temporada 2026")!.texto).not.toMatch(/Seu time terminou/);
    expect(e.tecnico.reputacao).toBe(reputacao);
    // Em julho de 2027 a temporada 2026/27 dele fecha: histórico, mensagens e o Avançar abre o fim da temporada.
    const depois = avancarAte(e, "2027-07-02");
    expect(depois).toContain("nova-temporada");
    const registro = e.historico.find((h) => h.temporada === 2026)!;
    expect(registro.tecnico.emAndamento).toBeUndefined();
    expect(registro.tecnico.posicao).toBeGreaterThan(0);
    expect(registro.tecnico.competicao).toMatch(/Espanhol/);
    expect(e.mensagens.find((m) => m.titulo === "Fim da temporada 2026/27")!.texto).toMatch(/Seu time terminou \d+º no Campeonato Espanhol/);
    expect(e.mensagens.some((m) => m.titulo === "Objetivo para 2027/28")).toBe(true);
    expect(e.tecnico.confiancaDiretoria).not.toBe(diretoria);
    expect(e.fimDeTemporadaPendente).toBeUndefined();
  }, 900_000);
});
