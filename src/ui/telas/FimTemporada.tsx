import { comArtigo } from "../../engine/artigos";
import { NOME_SERIE, SERIES } from "../../engine/competicoes";
import { propostasDeEmprego } from "../../engine/jogo";
import type { SerieId } from "../../engine/tipos";
import { Cartao, Escudo, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";
import { PropostasDeEmprego } from "./Demissao";
import { MensagemItem } from "./Mensagens";

export function FimTemporada() {
  const estado = useJogo();
  const { fechar } = useLoja();
  const r = estado.historico[estado.historico.length - 1];
  const meu = estado.clubes[estado.tecnico.clubeId];
  const demissao = estado.tecnico.demissao;
  const precisaDeClube = meu.serie === "D" || !!demissao;
  const propostas = demissao ? demissao.propostas : precisaDeClube ? propostasDeEmprego(estado) : [];
  const convites = estado.mensagens.filter((m) => m.convite && !m.convite.resolvido);
  if (!r) return null;
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;

  return (
    <div className="tela-cheia">
      <Topo titulo={`Fim da temporada ${r.temporada}`} sub={`Começa a temporada ${estado.temporada}`} />
      <div className="conteudo">
        <Cartao titulo="Campeões">
          <div className="coluna" style={{ gap: 10 }}>
            {SERIES.map((s) => {
              const c = estado.clubes[r.campeoes[s]];
              return (
                <div key={s} className="linha">
                  <Escudo clube={c} tamanho={40} />
                  <div className="cresce">
                    <div className="mini fraco">{NOME_SERIE[s]}</div>
                    <div className="negrito">{c.nome}</div>
                    {r.artilheiros[s] && <div className="mini fraco">Artilheiro: {r.artilheiros[s]!.nome} ({r.artilheiros[s]!.gols})</div>}
                  </div>
                </div>
              );
            })}
            {r.copa && (
              <div className="linha">
                <Escudo clube={estado.clubes[r.copa.campeao]} tamanho={40} />
                <div className="cresce">
                  <div className="mini fraco">Copa do Brasil</div>
                  <div className="negrito">{nome(r.copa.campeao)}</div>
                  <div className="mini fraco">Vice: {nome(r.copa.vice)}</div>
                </div>
              </div>
            )}
          </div>
        </Cartao>

        <Cartao titulo="Seu desempenho">
          <p>{r.tecnico.posicao}º lugar na {NOME_SERIE[r.tecnico.serie]}.</p>
          <p className={`pequeno ${r.tecnico.cumpriu ? "verde" : "vermelho"}`}>{r.tecnico.cumpriu ? "Objetivo cumprido" : "Objetivo não cumprido"}: {r.tecnico.objetivo}</p>
          {!precisaDeClube && <p className="pequeno fraco" style={{ marginTop: 6 }}>Em {estado.temporada}: {NOME_SERIE[meu.serie as SerieId]}. Objetivo: {estado.objetivo.descricao}.</p>}
        </Cartao>

        <Cartao titulo="Sobe e desce">
          <div className="coluna pequeno" style={{ gap: 6 }}>
            <p><span className="verde">Sobem para a Série A:</span> {r.promovidos.B.map(nome).join(", ")}</p>
            <p><span className="verde">Sobem para a Série B:</span> {r.promovidos.C.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série B:</span> {r.rebaixados.A.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série C:</span> {r.rebaixados.B.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série D:</span> {r.rebaixados.C.map(nome).join(", ")}</p>
          </div>
        </Cartao>

        {precisaDeClube ? (
          <Cartao titulo="Propostas de emprego">
            <p className="pequeno fraco" style={{ marginBottom: 8 }}>
              {demissao
                ? `A diretoria ${comArtigo("do", estado.clubes[demissao.clubeId])} não quis continuar com você depois de uma temporada abaixo do objetivo. Estes clubes querem você:`
                : `${comArtigo("O", meu)} caiu para a Série D, que não é disputada no jogo. Estes clubes da Série C querem você:`}
            </p>
            <PropostasDeEmprego propostas={propostas} aoEscolher={fechar} />
          </Cartao>
        ) : (
          <>
            {convites.length > 0 && (
              <Cartao titulo="Convites para você">
                <p className="pequeno fraco" style={{ marginBottom: 8 }}>A boa temporada chamou a atenção de clubes maiores. Se preferir ficar, é só começar {estado.temporada}.</p>
                <div className="lista">{convites.map((m) => <MensagemItem key={m.id} m={m} />)}</div>
              </Cartao>
            )}
            <button className="botao primario grande cheio" onClick={fechar}>Começar {estado.temporada}</button>
          </>
        )}
      </div>
    </div>
  );
}
