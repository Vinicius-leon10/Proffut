import { useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { NOME_SERIE, tabelaDaLiga, temporadaEncerrada } from "../../engine/competicoes";
import { situacaoDoObjetivo } from "../../engine/diretoria";
import { folhaSalarial, formatarDinheiro } from "../../engine/financas";
import { meuJogoHoje, provavelTime, proximaDataComJogo, proximoJogoDoClube } from "../../engine/jogo";
import type { SerieId } from "../../engine/tipos";
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
  const serie = clube.serie as SerieId;
  const hoje = meuJogoHoje(estado);
  const proximo = hoje ?? proximoJogoDoClube(estado);
  const encerrada = temporadaEncerrada(estado);
  const minhaSerieAcabou = estado.series[serie].fase === "encerrada";
  const tabela = tabelaDaLiga(estado, serie);
  const linha = tabela.find((l) => l.clubeId === meuId)!;
  const { situacao } = situacaoDoObjetivo(estado);
  const proximaData = proximaDataComJogo(estado);

  let rotuloBotao = "Avançar";
  if (encerrada) rotuloBotao = `Encerrar a temporada ${estado.temporada}`;
  else if (hoje) rotuloBotao = "Ir para o jogo";
  else if (proximo && proximo.data === proximaData) rotuloBotao = `Avançar para ${formatarData(proximo.data)}`;
  else if (proximaData) rotuloBotao = `Avançar (${formatarData(proximaData)})`;

  const adversario = proximo ? estado.clubes[proximo.mandante === meuId ? proximo.visitante : proximo.mandante] : undefined;
  const posAdversario = adversario && adversario.serie === serie ? tabela.find((l) => l.clubeId === adversario.id)?.pos : undefined;
  const propostas = estado.mensagens.filter((m) => m.proposta && !m.proposta.resolvida);
  const recentes = estado.mensagens.filter((m) => !(m.proposta && !m.proposta.resolvida)).slice(0, 3);

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
          <p className="fraco pequeno">{encerrada ? "A temporada terminou." : minhaSerieAcabou ? `A ${NOME_SERIE[serie]} terminou para você. As outras séries ainda estão em andamento.` : "Sem jogos marcados."}</p>
        )}
      </Cartao>

      {verAdversario && adversario && <FolhaDoTime lado={provavelTime(estado, adversario.id)} provavel aoFechar={() => setVerAdversario(false)} />}

      <button className="botao primario grande cheio" onClick={avancarJogo}>{rotuloBotao}</button>
      {minhaSerieAcabou && !encerrada && (
        <button className="botao cheio" onClick={simularFimDaTemporada}>Simular até o fim da temporada</button>
      )}

      {propostas.length > 0 && (
        <Cartao titulo="Propostas recebidas">
          <div className="lista">{propostas.map((m) => <MensagemItem key={m.id} m={m} />)}</div>
        </Cartao>
      )}

      <Cartao titulo={`${NOME_SERIE[serie]} ${estado.temporada}`}>
        <div className="linha entre">
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }} className="num">{linha.j ? `${linha.pos}º` : "–"}</div>
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
          </div>
          <div>
            <div className="linha entre mini fraco"><span>Confiança da torcida</span><span className="num">{Math.round(estado.tecnico.confiancaTorcida)}</span></div>
            <Barra valor={estado.tecnico.confiancaTorcida} />
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

      <button className="botao cheio" onClick={() => abrir({ tipo: "historico" })}>Histórico e campeões</button>
    </>
  );
}
