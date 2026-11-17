// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { depoisDoMeuJogo, expirarConvites, gerarConvites, reputacaoDoTecnico, responderConvite } from "../carreira";
import { somarDias } from "../calendario";
import { assumirClube, avancar, novoJogo, simularDia, simularRestoDaTemporada } from "../jogo";
import { elencoDe } from "../mercado";
import type { EstadoJogo } from "../tipos";



describe("carreira do técnico", () => {
  /** Jogo novo depois do primeiro jogo do clube do usuário (devolve a partida jogada). */
  const depoisDoPrimeiroJogo = (clubeId: string, semente: number) => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId, semente });
    for (let i = 0; i < 10 && !avancarAteMeuJogo(estado); i++) simularDia(estado);
    simularDia(estado);
    const p = estado.partidas.filter((x) => x.jogada && (x.mandante === clubeId || x.visitante === clubeId)).at(-1)!;
    return { estado, p };
  };
  const avancarAteMeuJogo = (estado: EstadoJogo) => {
    const r = avancar(estado);
    return r.tipo === "jogos-hoje" && !!r.meuJogo;
  };
  const mensagens = (estado: EstadoJogo, titulo: string) => estado.mensagens.filter((m) => m.titulo === titulo).length;
  // Lida por função: depois de um `delete`, o TypeScript acharia que a demissão continua vazia.
  const demissaoDe = (estado: EstadoJogo) => estado.tecnico.demissao;

  it("o técnico começa com a reputação do clube; num save antigo, sem ela, vale a do clube atual", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 21 });
    expect(estado.tecnico.reputacao).toBe(estado.clubes["ponte-preta"].reputacao);
    expect(estado.tecnico.desde).toBe(estado.data);
    delete estado.tecnico.reputacao;
    expect(reputacaoDoTecnico(estado)).toBe(estado.clubes["ponte-preta"].reputacao);
  });

  it("com a confiança da diretoria em 20 ou menos, um jogo demite, mas só depois do primeiro mês no clube", () => {
    const { estado, p } = depoisDoPrimeiroJogo("ponte-preta", 21);
    const reputacao = reputacaoDoTecnico(estado);
    estado.tecnico.confiancaDiretoria = 20;
    depoisDoMeuJogo(estado, p);
    expect(estado.tecnico.demissao, "no primeiro mês não demite").toBeUndefined();
    estado.tecnico.desde = somarDias(estado.data, -30);
    depoisDoMeuJogo(estado, p);
    const d = estado.tecnico.demissao!;
    expect(d.clubeId).toBe("ponte-preta");
    expect(estado.tecnico.clubeId, "até escolher, continua ligado ao clube antigo").toBe("ponte-preta");
    expect(reputacaoDoTecnico(estado)).toBe(reputacao - 6);
    // Três clubes das séries do jogo, nenhum acima da reputação dele.
    expect(new Set(d.propostas).size).toBe(3);
    for (const id of d.propostas) {
      expect(id).not.toBe("ponte-preta");
      expect(estado.clubes[id].serie).not.toBe("D");
      expect(estado.clubes[id].reputacao).toBeLessThanOrEqual(reputacaoDoTecnico(estado));
    }
    expect(mensagens(estado, "Você foi demitido")).toBe(1);
    // Assumir uma das propostas encerra a demissão, com diretoria e carência novas.
    assumirClube(estado, d.propostas[0]);
    expect(estado.tecnico).toMatchObject({ clubeId: d.propostas[0], confiancaDiretoria: 55, desde: estado.data });
    expect(estado.tecnico.demissao).toBeUndefined();
  });

  it("com a confiança em 35 ou menos chega o recado de cargo em risco, no máximo um por mês; num save antigo a carência começa no primeiro jogo", () => {
    const { estado, p } = depoisDoPrimeiroJogo("ponte-preta", 22);
    delete estado.tecnico.desde;
    estado.tecnico.confiancaDiretoria = 15;
    depoisDoMeuJogo(estado, p);
    expect(estado.tecnico.desde, "save antigo: a carência começa agora").toBe(estado.data);
    expect(estado.tecnico.demissao).toBeUndefined();
    expect(mensagens(estado, "Cargo em risco")).toBe(1);
    depoisDoMeuJogo(estado, p);
    expect(mensagens(estado, "Cargo em risco"), "não repete no mesmo mês").toBe(1);
    estado.tecnico.avisoDeRisco = somarDias(estado.data, -30);
    depoisDoMeuJogo(estado, p);
    expect(mensagens(estado, "Cargo em risco")).toBe(2);
  });

  it("convites só de clubes maiores, da mesma série ou acima; aceitar troca de clube e derruba os outros; recusado ou vencido, nada muda", () => {
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 23 });
    const atual = estado.clubes["ponte-preta"];
    const ids = gerarConvites(estado, 3);
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      const c = estado.clubes[id];
      expect(["A", "B"]).toContain(c.serie);
      expect(c.reputacao).toBeGreaterThan(atual.reputacao + 3);
      expect(c.reputacao).toBeLessThanOrEqual(reputacaoDoTecnico(estado) + 10);
    }
    const convites = estado.mensagens.filter((m) => m.convite);
    expect(convites).toHaveLength(3);
    // Um proposta pendente por um jogador do clube antigo cai junto.
    estado.mensagens.push({ id: 999, data: estado.data, tipo: "proposta", titulo: "", texto: "", lida: false, proposta: { jogadorId: 1, clubeId: ids[0], valor: 1, validaAte: "2099-01-01" } });
    expect(responderConvite(estado, convites[0].id, false).ok).toBe(true);
    expect(convites[0].convite!.resolvido).toBe("recusado");
    expect(estado.tecnico.clubeId).toBe("ponte-preta");
    expect(responderConvite(estado, convites[1].id, true).ok).toBe(true);
    expect(estado.tecnico).toMatchObject({ clubeId: convites[1].convite!.clubeId, confiancaDiretoria: 65 });
    expect(convites[1].convite!.resolvido).toBe("aceito");
    expect(convites[2].convite!.resolvido, "os outros convites caem").toBe("recusado");
    expect(estado.mensagens.find((m) => m.id === 999)!.proposta!.resolvida).toBe("retirada");
    expect(responderConvite(estado, convites[2].id, true).ok, "convite já resolvido não vale").toBe(false);
    // Um convite novo vence depois da data limite.
    gerarConvites(estado, 1);
    const novo = estado.mensagens.find((m) => m.convite && !m.convite.resolvido)!;
    expirarConvites(estado, novo.convite!.validaAte);
    expect(novo.convite!.resolvido).toBeUndefined();
    expirarConvites(estado, somarDias(novo.convite!.validaAte, 1));
    expect(novo.convite!.resolvido).toBe("expirado");
  });

  // Duas temporadas inteiras, com os estaduais, a Série D e as ligas de fora: mais tempo.
  it("na virada: abaixo do objetivo e sem a confiança da diretoria, demitido; quem sobe ganha reputação e convites", { timeout: 90_000 }, () => {
    // Clube do meio da Série A que termina abaixo de um objetivo impossível, com a diretoria por um fio.
    const ruim = novoJogo({ nomeTecnico: "T", clubeId: "bahia", semente: 24 });
    simularRestoDaTemporada(ruim);
    delete ruim.tecnico.demissao;
    ruim.objetivo.posicaoAlvo = 0;
    ruim.tecnico.confiancaDiretoria = 30;
    const reputacao = reputacaoDoTecnico(ruim);
    avancar(ruim);
    expect(ruim.temporada).toBe(2027);
    expect(demissaoDe(ruim)?.propostas).toHaveLength(3);
    expect(reputacaoDoTecnico(ruim)).toBe(reputacao - 4 - 6);
    expect(mensagens(ruim, "Objetivo para 2027"), "sem objetivo novo para quem saiu").toBe(0);

    // Série B com um elenco muito forte: sobe, cumpre o objetivo e recebe convites da Série A.
    const bom = novoJogo({ nomeTecnico: "T", clubeId: "ponte-preta", semente: 25 });
    for (const j of elencoDe(bom, "ponte-preta")) j.forca = 90;
    simularRestoDaTemporada(bom);
    expect(bom.series.B.promovidos).toContain("ponte-preta");
    const antes = reputacaoDoTecnico(bom);
    avancar(bom);
    expect(bom.tecnico.demissao).toBeUndefined();
    expect(reputacaoDoTecnico(bom)).toBeGreaterThanOrEqual(antes + 4 + 6);
    const convites = bom.mensagens.filter((m) => m.convite && !m.convite.resolvido);
    expect(convites).toHaveLength(2);
    for (const m of convites) expect(bom.clubes[m.convite!.clubeId].serie).toBe("A");
  });
});
