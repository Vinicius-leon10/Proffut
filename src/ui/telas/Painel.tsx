import { useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { ehSerie, nomeDaLigaDoClube, tabelaDoClube, temporadaEncerrada, torneioPrincipal } from "../../engine/competicoes";
import { reputacaoDoTecnico } from "../../engine/carreira";
import { CARGO } from "../../engine/constantes";
import { situacaoDoObjetivo } from "../../engine/diretoria";
import { folhaSalarial, formatarDinheiro } from "../../engine/financas";
import { copasDoClube, situacaoCurtaNaCopa } from "../../engine/copas";
import { meuJogoHoje, meuTimeNaPartida, provavelTime, proximaDataComJogo, proximoJogoDoClube } from "../../engine/jogo";
import { NOME_FASE_TORNEIO, posicaoNoTorneio, torneiosDoClube } from "../../engine/torneios";
import { avancarJogo, simularFimDaTemporada } from "../acoes";
import { Cartao, Escudo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";
import { MensagemItem } from "./Mensagens";
import { FolhaDoTime } from "./Tatica";
import { CartaoDaSelecao } from "./Selecao";

const SITUACAO = {
  encaminhada: { texto: "Encaminhado", cor: "verde" },
  "em-risco": { texto: "Em risco", cor: "amarelo" },
  abaixo: { texto: "Abaixo do esperado", cor: "vermelho" },
} as const;

export function Painel() {
  const estado = useJogo();
  const { abrir } = useLoja();
  const [verAdversario, setVerAdversario] = useState(false);
  const meuId = estado.tecnico.clubeId;
  const clube = estado.clubes[meuId];
  const serie = clube.serie;
  const hoje = meuJogoHoje(estado);
  const proximo = hoje ?? proximoJogoDoClube(estado);
  const encerrada = temporadaEncerrada(estado);
  // Fora das Séries A, B e C (Série D, liga de fora, estadual): o campeonato acaba para o usuário quando ele não tem mais
  // jogos nele (nos de mata-mata, depois da fase de grupos).
  const principal = ehSerie(serie) ? undefined : torneioPrincipal(estado, clube);
  const minhaSerieAcabou = ehSerie(serie)
    ? estado.series[serie].fase === "encerrada"
    : !!principal && (principal.tipo === "liga" || (principal.fase !== "grupos" && principal.fase !== "liga")) &&
      !estado.partidas.some((p) => p.serie === principal.id && !p.jogada && (p.mandante === meuId || p.visitante === meuId));
  const nomeDaLiga = nomeDaLigaDoClube(estado, clube);
  const tabela = tabelaDoClube(estado, meuId);
  const linha = tabela.find((l) => l.clubeId === meuId) ?? { pos: 0, pts: 0, j: 0, v: 0, e: 0, d: 0 };
  // Estadual em andamento (no começo do ano): a posição dele num cartão à parte.
  const estadual = torneiosDoClube(estado, meuId).find((t) => t.tipo === "estadual" && t.fase !== "encerrada" && t.id !== principal?.id);
  const { situacao } = situacaoDoObjetivo(estado);
  // Copas de clubes do usuário (Libertadores, Copa do Nordeste...): em andamento ou ganhas.
  const minhasCopas = copasDoClube(estado, meuId).filter((c) => c.fase !== "encerrada" || c.campeao === meuId);
  const proximaData = proximaDataComJogo(estado);

  let rotuloBotao = "Avançar";
  if (encerrada) rotuloBotao = `Encerrar a temporada ${estado.temporada}`;
  else if (hoje) rotuloBotao = "Ir para o jogo";
  else if (proximo && proximo.data === proximaData) rotuloBotao = `Avançar para ${formatarData(proximo.data)}`;
  else if (proximaData) rotuloBotao = `Avançar (${formatarData(proximaData)})`;

  // O time do usuário no jogo (o clube ou, no dia do jogo dela, a seleção).
  const meuNoJogo = (proximo && meuTimeNaPartida(estado, proximo)) || meuId;
  const adversario = proximo ? estado.clubes[proximo.mandante === meuNoJogo ? proximo.visitante : proximo.mandante] : undefined;
  const posAdversario = adversario && adversario.serie === serie ? tabela.find((l) => l.clubeId === adversario.id)?.pos : undefined;
  const convites = estado.mensagens.filter((m) => m.convite && !m.convite.resolvido);
  const recentes = estado.mensagens.filter((m) => !(m.proposta && !m.proposta.resolvida) && !(m.convite && !m.convite.resolvido)).slice(0, 3);
  const emRisco = estado.tecnico.confiancaDiretoria <= CARGO.aviso;

  const recente = recentes[0];
  const textoDoEstadual = estadual
    ? estadual.fase === "liga" || estadual.fase === "grupos"
      ? `${posicaoNoTorneio(estado, estadual, meuId) || "–"}º ${estadual.grupos ? "no grupo" : "lugar"}`
      : estadual.semeados?.includes(meuId) && estado.partidas.some((p) => p.serie === estadual.id && !p.jogada && (p.mandante === meuId || p.visitante === meuId))
        ? `Na ${NOME_FASE_TORNEIO[estadual.fase].toLowerCase()}`
        : "Fora da disputa do título"
    : "";

  // Meta curta: "Terminar na primeira metade (até 10º)" vira "meta: até 10º".
  const meta = estado.objetivo.descricao.match(/\(([^)]+)\)/)?.[1];
  const naoLidas = estado.mensagens.filter((m) => !m.lida).length;
  const irParaTabelas = () => useLoja.getState().irParaAba("tabelas");
  const ondeJoga = proximo ? (proximo.neutro ? "campo neutro" : proximo.mandante === meuNoJogo ? "em casa" : "fora de casa") : "";

  return (
    <>
      <section className="cartao placar-do-dia">
        <div className="linha entre">
          <h3>{hoje ? "Jogo de hoje" : "Próximo jogo"}</h3>
          {proximo && <span className="mini fraco">{formatarData(proximo.data)}</span>}
        </div>
        {proximo && adversario ? (
          <>
            <div className="frente-a-frente">
              <div className="time"><Escudo clube={estado.clubes[meuNoJogo]} tamanho={56} /><b>{estado.clubes[meuNoJogo].nome}</b></div>
              <div className="versus">x</div>
              <div className="time">
                <button className="escudo-botao" onClick={() => setVerAdversario(true)} aria-label={`Ver o provável time titular ${comArtigo("do", adversario)}`}>
                  <Escudo clube={adversario} tamanho={56} />
                </button>
                <b>{adversario.nome}{posAdversario ? <span className="fraco"> ({posAdversario}º)</span> : null}</b>
              </div>
            </div>
            <div className="mini fraco centro">{rotuloPartida(proximo)} · {ondeJoga}</div>
          </>
        ) : (
          <p className="fraco pequeno">{encerrada ? "A temporada terminou." : minhaSerieAcabou ? `${nomeDaLiga} terminou para você. Os outros campeonatos ainda estão em andamento.` : "Sem jogos marcados."}</p>
        )}
        <button className="botao primario grande cheio" aria-label={rotuloBotao} onClick={avancarJogo}>{encerrada ? `Encerrar ${estado.temporada} ▶` : hoje ? "Jogar ▶" : "Avançar ▶"}</button>
      </section>

      {verAdversario && adversario && <FolhaDoTime lado={provavelTime(estado, adversario.id)} provavel aoFechar={() => setVerAdversario(false)} />}

      {minhaSerieAcabou && !encerrada && (
        <button className="botao cheio" onClick={simularFimDaTemporada}>Simular até o fim da temporada</button>
      )}

      <CartaoDaSelecao />

      {convites.length > 0 && (
        <Cartao titulo="Convites para você">
          <div className="lista">{convites.map((m) => <MensagemItem key={m.id} m={m} />)}</div>
        </Cartao>
      )}

      <section className="cartao faixa-status">
        <div>
          <h3>{nomeDaLiga} {estado.temporada}</h3>
          <span className="numero num">{linha.j ? `${linha.pos}º` : "—"}</span>
          <span className={`chip ${SITUACAO[situacao].cor}`}>{situacao === "abaixo" ? "Abaixo da meta" : SITUACAO[situacao].texto}</span>
          {meta && <span className="mini fraco">meta: {meta}</span>}
        </div>
        <button className="coluna-botao" aria-label="Finanças" onClick={() => abrir({ tipo: "financas" })}>
          <h3>Caixa</h3>
          <span className={`numero num ${clube.caixa < 0 ? "vermelho" : ""}`}>{formatarDinheiro(clube.caixa).replace("R$ ", "")}</span>
          <span className="mini fraco">folha {formatarDinheiro(folhaSalarial(estado, meuId)).replace("R$ ", "")}</span>
          <span className="mini fraco">moral {Math.round(clube.moral)}</span>
        </button>
        <div>
          <h3>Confiança</h3>
          <span className="numero num">{Math.round(estado.tecnico.confiancaDiretoria)}</span>
          <span className="mini fraco">torcida {Math.round(estado.tecnico.confiancaTorcida)}</span>
          <span className="mini fraco">reputação {Math.round(reputacaoDoTecnico(estado))}</span>
          {emRisco && <span className="chip vermelho">Cargo em risco</span>}
        </div>
      </section>

      <section className="cartao lista-do-painel">
        {estadual && (
          <div className="linha-do-painel" onClick={irParaTabelas}>
            <h4>{estadual.nome} {estado.temporada}</h4><span><b>{textoDoEstadual}</b><span className="seta">›</span></span>
          </div>
        )}
        {minhasCopas.map((c) => {
          const { copa, situacao: sit } = situacaoCurtaNaCopa(estado, c.id, meuId);
          return (
            <button key={c.id} className="linha-do-painel" onClick={irParaTabelas}>
              <span>{copa}</span><span><b>{sit}</b><span className="seta">›</span></span>
            </button>
          );
        })}
        <button className="linha-do-painel" onClick={() => abrir({ tipo: "mensagens" })}>
          <span className="cortar">{recente ? `${recente.lida ? "✉️" : "📩"} ${recente.titulo}` : "Mensagens"}</span>
          <span className="mini fraco">{naoLidas ? `${naoLidas > 9 ? "9+" : naoLidas} ${naoLidas === 1 ? "nova" : "novas"}` : "ver todas"}<span className="seta">›</span></span>
        </button>
      </section>

      <div className="botoes-duplos">
        <button className="botao" aria-label="Sala de troféus e recordes" onClick={() => abrir({ tipo: "trofeus" })}>🏆 Troféus</button>
        <button className="botao" aria-label="Histórico e campeões" onClick={() => abrir({ tipo: "historico" })}>📜 Histórico</button>
      </div>
    </>
  );
}
