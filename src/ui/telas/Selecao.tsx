// A seleção do técnico (nov/2026): o cartão no Painel (próximo jogo, a competição e a convocação) e a tela da convocação.
// O técnico só treina uma seleção depois de ganhar a liga principal de um país (regra do usuário) e fica também com o clube.
import { useMemo, useState } from "react";
import { formatarData } from "../../engine/calendario";
import { NOMES_POSICAO } from "../../engine/forca";
import {
  CONVOCADOS_NA_COPA, CONVOCADOS_POR_SELECAO, candidatosDaSelecao, comArtigoDaSelecao, confirmarConvocacao, convocarAutomatico,
  deixarSelecao, ehCompeticaoDeSelecoes, listaDaCopaFechada, notaDeConvocacao, proximoJogoNaCopa, rankingDasSelecoes, tabelasDeSelecoes,
} from "../../engine/selecoes";
import type { IdCompeticaoSelecoes, Jogador, Posicao } from "../../engine/tipos";
import { BandeiraJogador, Cartao, Escudo, Pos, Topo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";

/** O cartão da seleção no Painel: o próximo jogo, como ela está na competição e a convocação. */
export function CartaoDaSelecao() {
  const estado = useJogo();
  const { abrir, atualizar, avisar } = useLoja();
  const id = estado.tecnico.selecao;
  if (!id) return null;
  const selecao = estado.clubes[id];
  const sel = estado.selecoes;
  const proximo = estado.partidas.find((p) => !p.jogada && ehCompeticaoDeSelecoes(p.serie) && (p.mandante === id || p.visitante === id));
  const adversario = proximo ? estado.clubes[proximo.mandante === id ? proximo.visitante : proximo.mandante] : undefined;
  const ranking = rankingDasSelecoes(estado).find((s) => s.id === id);
  const concentrada = !!sel?.concentradas.includes(id);
  // Na competição oficial em andamento: a posição na tabela (Eliminatórias e grupos).
  const comp = Object.values(sel?.competicoes ?? {}).find((c) => c && c.fase !== "encerrada" && c.selecoes.includes(id));
  const tabela = comp ? tabelasDeSelecoes(estado, comp.id as IdCompeticaoSelecoes, comp.fase).find((t) => t.some((l) => l.clubeId === id)) : undefined;
  const linha = tabela?.find((l) => l.clubeId === id);
  const sair = () => {
    if (!window.confirm(`Deixar ${comArtigoDaSelecao("o", id, estado)}? Você continua no clube.`)) return;
    deixarSelecao(estado);
    atualizar();
    avisar(`Você deixou ${comArtigoDaSelecao("o", id, estado)}.`);
  };
  return (
    <Cartao titulo={`Seleção: ${selecao.nome}`} acao={<button className="botao pequeno" onClick={() => useLoja.getState().irParaAba("tabelas")}>Tabelas</button>}>
      <div className="coluna" style={{ gap: 8 }}>
        <div className="linha" style={{ gap: 10 }}>
          <Escudo clube={selecao} tamanho={40} />
          <div className="cresce">
            {proximo && adversario ? (
              <>
                <div className="pequeno negrito">{proximo.mandante === id ? `${selecao.nome} x ${adversario.nome}` : `${adversario.nome} x ${selecao.nome}`}</div>
                <div className="mini fraco">{rotuloPartida(proximo)} · {formatarData(proximo.data)}</div>
              </>
            ) : <div className="pequeno fraco">Sem jogos marcados por enquanto.</div>}
          </div>
        </div>
        {comp && linha && <p className="pequeno">{comp.nome}: {linha.pos}º {tabela && tabela.length < comp.selecoes.length ? "no grupo" : "lugar"} ({linha.pts} pts em {linha.j} jogos)</p>}
        {ranking && <p className="mini fraco">{ranking.pos}º no ranking ({ranking.pontos} pontos).</p>}
        <p className="mini fraco">
          {concentrada ? "A seleção está concentrada: os convocados estão fora dos clubes." : sel?.convocacaoFeita ? "Convocação feita para a próxima data." : "Se você não convocar, o auxiliar chama os melhores 3 dias antes do jogo."}
        </p>
        <div className="linha" style={{ gap: 8 }}>
          <button className="botao primario pequeno cresce" onClick={() => abrir({ tipo: "convocacao" })}>Convocar</button>
          <button className="botao pequeno" onClick={sair}>Deixar a seleção</button>
        </div>
      </div>
    </Cartao>
  );
}

const ORDEM: Posicao[] = ["G", "L", "Z", "M", "A"];
const PLURAL: Record<Posicao, string> = { G: "Goleiros", L: "Laterais", Z: "Zagueiros", M: "Meio-campistas", A: "Atacantes" };
/** Quantos candidatos de cada posição aparecem (os melhores; os convocados sempre aparecem). */
const POR_POSICAO_NA_LISTA = 25;

/** Onde o jogador joga: o clube do jogo ou o clube de fora (e o país). */
function ondeJoga(estado: ReturnType<typeof useJogo>, j: Jogador): string {
  if (j.clubeFora) return `${j.clubeFora.nome}${j.clubeFora.pais ? ` (${j.clubeFora.pais})` : ""}`;
  return j.clubeId ? estado.clubes[j.clubeId]?.nome ?? "" : "Sem clube";
}

/** A convocação: os convocados de cada posição e os melhores candidatos (toque para chamar ou tirar). */
export function Convocacao() {
  const estado = useJogo();
  const { fechar, atualizar, avisar } = useLoja();
  const id = estado.tecnico.selecao!;
  const selecao = estado.clubes[id];
  const [lista, setLista] = useState<number[]>(() => [...(estado.selecoes?.convocados[id] ?? [])].filter((x) => !!estado.jogadores[x]));
  const candidatos = useMemo(
    () => candidatosDaSelecao(estado, id).sort((a, b) => notaDeConvocacao(b) - notaDeConvocacao(a) || a.id - b.id),
    [estado, id],
  );
  const escolhidos = new Set(lista);
  // Copa do Mundo (R131, R132): lista final de 26 (3 goleiros); fechada quando a seleção já está concentrada para a Copa.
  const naCopa = proximoJogoNaCopa(estado, id);
  const fechada = listaDaCopaFechada(estado, id);
  const normal = naCopa ? CONVOCADOS_NA_COPA : CONVOCADOS_POR_SELECAO;
  const goleiros = lista.filter((x) => estado.jogadores[x]?.posicao === "G").length;
  // Quem já esteve na lista continua aparecendo depois de sair (senão sumiria entre os outros candidatos).
  const [vistos, setVistos] = useState<Set<number>>(() => new Set(lista));
  const alternar = (j: Jogador) => {
    setVistos((v) => new Set([...v, j.id]));
    setLista((l) => (l.includes(j.id) ? l.filter((x) => x !== j.id) : [...l, j.id]));
  };
  const confirmar = () => {
    if (naCopa && lista.length > CONVOCADOS_NA_COPA) {
      avisar(`A lista da Copa tem no máximo ${CONVOCADOS_NA_COPA}: tire ${lista.length - CONVOCADOS_NA_COPA}.`);
      return;
    }
    if (naCopa && goleiros < 3 && !window.confirm(`Só ${goleiros} ${goleiros === 1 ? "goleiro" : "goleiros"} para a Copa (o normal é 3). Confirmar assim mesmo?`)) return;
    if (lista.length < 16 && !window.confirm(`Só ${lista.length} convocados (o normal é ${normal}). Confirmar assim mesmo?`)) return;
    if (!confirmarConvocacao(estado, lista)) {
      avisar("A lista da Copa já está fechada: só sai quem se machucar.");
      return;
    }
    atualizar();
    avisar(`Convocação ${comArtigoDaSelecao("do", id, estado)} confirmada: ${lista.length} jogadores.`);
    fechar();
  };
  return (
    <div className="tela-cheia">
      <Topo titulo="Convocação" sub={selecao.nome} aoVoltar={fechar} />
      <div className="conteudo">
        {naCopa ? (
          <div className="cartao compacto">
            <h3 className="pequeno negrito">Lista final da Copa do Mundo</h3>
            <p className="pequeno">
              <b>{lista.length} convocados</b> ({goleiros} {goleiros === 1 ? "goleiro" : "goleiros"}; a lista final tem {CONVOCADOS_NA_COPA}, com 3 goleiros).{" "}
              {fechada
                ? "A seleção já está concentrada para a Copa: lista fechada. Até a estreia, só sai quem se machucar (o auxiliar chama outro da posição)."
                : "Toque num jogador para chamar ou tirar. Ela fecha 3 dias antes da estreia."}
            </p>
          </div>
        ) : (
          <p className="pequeno">
            <b>{lista.length}</b> convocados (o normal é {CONVOCADOS_POR_SELECAO}). Toque num jogador para chamar ou tirar. Quem joga num clube
            fica fora dele de 3 dias antes de cada jogo da seleção até o jogo.
          </p>
        )}
        <div className="linha" style={{ gap: 8 }}>
          <button className="botao cresce" disabled={fechada} onClick={() => setLista(convocarAutomatico(estado, id, undefined, naCopa))}>Convocar os melhores</button>
          <button className="botao primario cresce" disabled={fechada} onClick={confirmar}>Confirmar</button>
        </div>
        {ORDEM.map((pos) => {
          const daPosicao = candidatos.filter((j) => j.posicao === pos);
          const naLista = daPosicao.filter((j) => escolhidos.has(j.id));
          const tirados = daPosicao.filter((j) => !escolhidos.has(j.id) && vistos.has(j.id));
          const outros = [...tirados, ...daPosicao.filter((j) => !escolhidos.has(j.id) && !vistos.has(j.id)).slice(0, POR_POSICAO_NA_LISTA)];
          return (
            <div key={pos} className="grupo-posicao">
              <h3 className="pequeno fraco">{PLURAL[pos]} · {naLista.length} {naLista.length === 1 ? "convocado" : "convocados"}</h3>
              <div className="lista">
                {[...naLista, ...outros].map((j) => (
                  <button key={j.id} className={`item${escolhidos.has(j.id) ? " meu" : ""}`} onClick={() => alternar(j)} aria-pressed={escolhidos.has(j.id)} disabled={fechada}>
                    <Pos pos={j.posicao} />
                    <div className="cresce" style={{ minWidth: 0 }}>
                      <div className="linha" style={{ gap: 6 }}><BandeiraJogador nacionalidade={j.nacionalidade} /><span className="pequeno negrito corta">{j.nome}</span></div>
                      <div className="mini fraco corta">{ondeJoga(estado, j)} · {j.idade} anos{j.selecao?.jogos ? ` · ${j.selecao.jogos} ${j.selecao.jogos === 1 ? "jogo" : "jogos"} pela seleção` : ""}{j.lesaoDias > 0 ? ` · lesão ${j.lesaoDias}d` : ""}</div>
                    </div>
                    <span className="forca num" title={NOMES_POSICAO[j.posicao]}>{j.forca}</span>
                    <span className="chip" aria-hidden>{escolhidos.has(j.id) ? "✓" : "+"}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
