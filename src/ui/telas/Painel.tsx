import { useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { ehSerie, nomeDaLigaDoClube, tabelaDoClube, temporadaEncerrada, torneioPrincipal } from "../../engine/competicoes";
import { reputacaoDoTecnico } from "../../engine/carreira";
import { CARGO } from "../../engine/constantes";
import { situacaoDoObjetivo } from "../../engine/diretoria";
import { folhaSalarial, formatarDinheiro } from "../../engine/financas";
import { copasDoClube, situacaoNaCopaDeClubes } from "../../engine/copas";
import { meuJogoHoje, provavelTime, proximaDataComJogo, proximoJogoDoClube } from "../../engine/jogo";
import { NOME_FASE_TORNEIO, posicaoNoTorneio, torneiosDoClube } from "../../engine/torneios";
import { avancarJogo, simularFimDaTemporada } from "../acoes";
import { Barra, Cartao, Escudo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";
import { MensagemItem } from "./Mensagens";
import { FolhaDoTime } from "./Tatica";

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

  const adversario = proximo ? estado.clubes[proximo.mandante === meuId ? proximo.visitante : proximo.mandante] : undefined;
  const posAdversario = adversario && adversario.serie === serie ? tabela.find((l) => l.clubeId === adversario.id)?.pos : undefined;
  const convites = estado.mensagens.filter((m) => m.convite && !m.convite.resolvido);
  const recentes = estado.mensagens.filter((m) => !(m.proposta && !m.proposta.resolvida) && !(m.convite && !m.convite.resolvido)).slice(0, 3);
  const emRisco = estado.tecnico.confiancaDiretoria <= CARGO.aviso;

  return (
    <>
      <Cartao titulo={hoje ? "Jogo de hoje" : "Próximo jogo"}>
        {proximo && adversario ? (
          <div className="coluna">
            <div className="pequeno fraco">{rotuloPartida(proximo)} · {formatarData(proximo.data)}</div>
            <div className="linha" style={{ justifyContent: "space-around", alignItems: "flex-start", padding: "6px 0" }}>
              {[proximo.mandante, proximo.visitante].map((id, i) => (
                <div key={id} className="coluna" style={{ alignItems: "center", gap: 4, width: "40%" }}>
                  {id === meuId ? <Escudo clube={estado.clubes[id]} tamanho={52} /> : (
                    <button className="escudo-botao" onClick={() => setVerAdversario(true)} aria-label={`Ver o provável time titular ${comArtigo("do", estado.clubes[id])}`}>
                      <Escudo clube={estado.clubes[id]} tamanho={52} />
                    </button>
                  )}
                  <span className="negrito pequeno centro">{estado.clubes[id].nome}</span>
                  {i === 0 && !proximo.neutro && <span className="mini muito-fraco">mandante</span>}
                </div>
              ))}
            </div>
            <div className="pequeno fraco centro">
              {proximo.neutro ? "Campo neutro" : proximo.mandante === meuId ? "Em casa" : "Fora de casa"}
              {posAdversario ? ` · adversário em ${posAdversario}º` : ""}
            </div>
          </div>
        ) : (
          <p className="fraco pequeno">{encerrada ? "A temporada terminou." : minhaSerieAcabou ? `${nomeDaLiga} terminou para você. Os outros campeonatos ainda estão em andamento.` : "Sem jogos marcados."}</p>
        )}
      </Cartao>

      {verAdversario && adversario && <FolhaDoTime lado={provavelTime(estado, adversario.id)} provavel aoFechar={() => setVerAdversario(false)} />}

      <button className="botao primario grande cheio" onClick={avancarJogo}>{rotuloBotao}</button>
      {minhaSerieAcabou && !encerrada && (
        <button className="botao cheio" onClick={simularFimDaTemporada}>Simular até o fim da temporada</button>
      )}

      {convites.length > 0 && (
        <Cartao titulo="Convites para você">
          <div className="lista">{convites.map((m) => <MensagemItem key={m.id} m={m} />)}</div>
        </Cartao>
      )}


      {estadual && (
        <Cartao titulo={`${estadual.nome} ${estado.temporada}`}>
          <div className="linha entre pequeno">
            <span>{estadual.fase === "liga" || estadual.fase === "grupos"
              ? `${posicaoNoTorneio(estado, estadual, meuId) || "–"}º ${estadual.grupos ? "no grupo" : "lugar"}`
              : estadual.semeados?.includes(meuId) && estado.partidas.some((p) => p.serie === estadual.id && !p.jogada && (p.mandante === meuId || p.visitante === meuId))
                ? `Na ${NOME_FASE_TORNEIO[estadual.fase].toLowerCase()}`
                : "Fora da disputa do título"}</span>
            <button className="botao pequeno" onClick={() => useLoja.getState().irParaAba("tabelas")}>Ver tabela</button>
          </div>
        </Cartao>
      )}

      {minhasCopas.length > 0 && (
        <Cartao titulo="Copas" acao={<button className="botao pequeno" onClick={() => useLoja.getState().irParaAba("tabelas")}>Ver tabelas</button>}>
          <div className="coluna" style={{ gap: 4 }}>
            {minhasCopas.map((c) => <p key={c.id} className="pequeno">{situacaoNaCopaDeClubes(estado, c.id, meuId)}</p>)}
          </div>
        </Cartao>
      )}

      <Cartao titulo={`${nomeDaLiga} ${estado.temporada}`}>
        <div className="linha entre">
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }} className="num">{linha.j ? `${linha.pos}º` : "–"}{principal?.grupos && linha.j ? <span className="mini fraco"> no grupo</span> : null}</div>
            <div className="mini fraco">{linha.pts} pts · {linha.j} jogos · {linha.v}V {linha.e}E {linha.d}D</div>
          </div>
          <div className="coluna" style={{ alignItems: "flex-end", gap: 6, maxWidth: "60%" }}>
            <span className={`chip ${SITUACAO[situacao].cor}`}>{SITUACAO[situacao].texto}</span>
            <span className="mini fraco" style={{ textAlign: "right" }}>{estado.objetivo.descricao}</span>
          </div>
        </div>
        <div className="coluna" style={{ marginTop: 12, gap: 8 }}>
          <div>
            <div className="linha entre mini fraco"><span>Confiança da diretoria</span><span className="num">{Math.round(estado.tecnico.confiancaDiretoria)}</span></div>
            <Barra valor={estado.tecnico.confiancaDiretoria} />
            {emRisco && <p className="mini vermelho" style={{ marginTop: 4 }}>Cargo em risco: se a confiança chegar a {CARGO.demissao}, você é demitido.</p>}
          </div>
          <div>
            <div className="linha entre mini fraco"><span>Confiança da torcida</span><span className="num">{Math.round(estado.tecnico.confiancaTorcida)}</span></div>
            <Barra valor={estado.tecnico.confiancaTorcida} />
          </div>
          <div className="linha entre mini fraco">
            <span>Sua reputação como técnico</span><span className="num negrito">{Math.round(reputacaoDoTecnico(estado))}</span>
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Clube" acao={<button className="botao pequeno" onClick={() => abrir({ tipo: "financas" })}>Finanças</button>}>
        <div className="linha entre pequeno" style={{ flexWrap: "wrap", rowGap: 8 }}>
          <div><div className="mini fraco">Caixa</div><div className={`negrito num ${clube.caixa < 0 ? "vermelho" : ""}`}>{formatarDinheiro(clube.caixa)}</div></div>
          <div><div className="mini fraco">Folha mensal</div><div className="negrito num">{formatarDinheiro(folhaSalarial(estado, meuId))}</div></div>
          <div><div className="mini fraco">Moral</div><div className="negrito num">{Math.round(clube.moral)}</div></div>
          <div><div className="mini fraco">Estádio</div><div className="negrito num">{clube.estadio.capacidade.toLocaleString("pt-BR")}</div></div>
        </div>
      </Cartao>

      <Cartao titulo="Últimas mensagens" acao={<button className="botao pequeno" onClick={() => abrir({ tipo: "mensagens" })}>Ver todas</button>}>
        {recentes.length ? <div className="lista">{recentes.map((m) => <MensagemItem key={m.id} m={m} />)}</div> : <p className="pequeno fraco">Nada novo.</p>}
      </Cartao>

      <button className="botao cheio" onClick={() => abrir({ tipo: "trofeus" })}>Sala de troféus e recordes</button>
      <button className="botao cheio" onClick={() => abrir({ tipo: "historico" })}>Histórico e campeões</button>
    </>
  );
}
