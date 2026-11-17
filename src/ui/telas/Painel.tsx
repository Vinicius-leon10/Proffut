import { useState, type ReactNode } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { ehSerie, nomeDaLigaDoClube, tabelaDoClube, temporadaEncerrada, torneioPrincipal } from "../../engine/competicoes";
import { reputacaoDoTecnico } from "../../engine/carreira";
import { CARGO } from "../../engine/constantes";
import { situacaoDoObjetivo } from "../../engine/diretoria";
import { folhaSalarial, formatarDinheiro } from "../../engine/financas";
import { copasDoClube, situacaoNaCopaDeClubes } from "../../engine/copas";
import { meuJogoHoje, meuTimeNaPartida, provavelTime, proximaDataComJogo, proximoJogoDoClube } from "../../engine/jogo";
import { NOME_FASE_TORNEIO, posicaoNoTorneio, torneiosDoClube } from "../../engine/torneios";
import { avancarJogo, simularFimDaTemporada } from "../acoes";
import { Barra, Cartao, Escudo } from "../componentes";
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
  // Texto curto do botão da linha do jogo; o nome completo (para quem usa leitor de tela e para os testes) fica no aria-label.
  const textoBotao = encerrada ? "Encerrar ▶" : hoje ? "Jogar ▶" : "Avançar ▶";

  return (
    <>
      <section className="cartao jogo-linha">
        {proximo && adversario ? (
          <>
            <button className="escudo-botao" onClick={() => setVerAdversario(true)} aria-label={`Ver o provável time titular ${comArtigo("do", adversario)}`}>
              <Escudo clube={adversario} tamanho={52} />
            </button>
            <div className="jogo-texto">
              <h3>{hoje ? "Jogo de hoje" : "Próximo jogo"}</h3>
              <div className="jogo-adversario">{meuNoJogo !== meuId ? `${estado.clubes[meuNoJogo].nome} ` : ""}x {adversario.nome}{posAdversario ? <span className="fraco"> ({posAdversario}º)</span> : null}</div>
              <div className="mini fraco">{rotuloPartida(proximo)} · {formatarData(proximo.data)} · {proximo.neutro ? "campo neutro" : proximo.mandante === meuNoJogo ? "em casa" : "fora de casa"}</div>
            </div>
          </>
        ) : (
          <div className="jogo-texto">
            <h3>Próximo jogo</h3>
            <p className="fraco pequeno">{encerrada ? "A temporada terminou." : minhaSerieAcabou ? `${nomeDaLiga} terminou para você. Os outros campeonatos ainda estão em andamento.` : "Sem jogos marcados."}</p>
          </div>
        )}
        <button className="botao primario jogar" aria-label={rotuloBotao} onClick={avancarJogo}>{textoBotao}</button>
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

      <div className="blocos">
        <Bloco titulo={`${nomeDaLiga} ${estado.temporada}`}>
          <div className="posicao num">{linha.j ? `${linha.pos}º` : "–"}{principal?.grupos && linha.j ? <span className="mini fraco"> no grupo</span> : null}</div>
          <div><span className={`chip ${SITUACAO[situacao].cor}`}>{SITUACAO[situacao].texto}</span></div>
          <div className="mini fraco">{estado.objetivo.descricao}</div>
          <div className="mini fraco">{linha.pts} pts · {linha.j} jogos</div>
        </Bloco>

        <Bloco titulo="Confiança">
          <div>
            <div className="linha entre mini fraco"><span>Diretoria</span><span className="num">{Math.round(estado.tecnico.confiancaDiretoria)}</span></div>
            <Barra valor={estado.tecnico.confiancaDiretoria} />
          </div>
          <div>
            <div className="linha entre mini fraco"><span>Torcida</span><span className="num">{Math.round(estado.tecnico.confiancaTorcida)}</span></div>
            <Barra valor={estado.tecnico.confiancaTorcida} />
          </div>
          <div className="linha entre mini fraco"><span>Reputação</span><span className="num negrito">{Math.round(reputacaoDoTecnico(estado))}</span></div>
          {emRisco && <p className="mini vermelho">Cargo em risco: com {CARGO.demissao} de confiança você é demitido.</p>}
        </Bloco>

        <Bloco titulo="Caixa" acao={<button className="botao mini-botao" onClick={() => abrir({ tipo: "financas" })}>Finanças</button>}>
          <div className={`valor num ${clube.caixa < 0 ? "vermelho" : ""}`}>{formatarDinheiro(clube.caixa)}</div>
          <div className="mini fraco">folha {formatarDinheiro(folhaSalarial(estado, meuId))}</div>
        </Bloco>

        <Bloco titulo="Copas" acao={minhasCopas.length > 0 || estadual ? <button className="botao mini-botao" onClick={() => useLoja.getState().irParaAba("tabelas")}>Ver tabelas</button> : undefined}>
          {estadual && (
            <div className="coluna" style={{ gap: 2 }}>
              <h4 className="sub-titulo">{estadual.nome} {estado.temporada}</h4>
              <span className="pequeno">{textoDoEstadual}</span>
            </div>
          )}
          {minhasCopas.map((c) => <p key={c.id} className="pequeno">{situacaoNaCopaDeClubes(estado, c.id, meuId)}</p>)}
          {minhasCopas.length === 0 && !estadual && <p className="pequeno fraco">Nenhuma copa agora.</p>}
        </Bloco>
      </div>

      <section className="cartao mensagens-linha">
        <div className="cabeca">
          <h3>Mensagens</h3>
          <button className="botao pequeno" onClick={() => abrir({ tipo: "mensagens" })}>Ver todas</button>
        </div>
        <p className="pequeno">{recente ? `${recente.lida ? "✉️" : "📩"} ${recente.titulo}` : "Nada novo."}</p>
      </section>

      <div className="botoes-duplos">
        <button className="botao" aria-label="Sala de troféus e recordes" onClick={() => abrir({ tipo: "trofeus" })}>🏆 Troféus</button>
        <button className="botao" aria-label="Histórico e campeões" onClick={() => abrir({ tipo: "historico" })}>📜 Histórico</button>
      </div>
    </>
  );
}

/** Um dos blocos 2 × 2 do painel: título em letras pequenas, uma ação opcional no canto e o conteúdo. */
function Bloco({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="cartao bloco">
      <div className="cabeca"><h3>{titulo}</h3>{acao}</div>
      {children}
    </section>
  );
}
