import { comArtigo } from "../../engine/artigos";
import { NOME_SERIE, SERIES, nomeDaLigaDoClube } from "../../engine/competicoes";
import { DEFINICOES } from "../../engine/copas";
import { divisaoDaLiga, nomeDoTorneio } from "../../engine/torneios";
import type { IdTorneio, SerieId } from "../../engine/tipos";
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
  // Demitido: escolhe um clube nas propostas (o técnico treina qualquer clube: rebaixado, continua nele).
  const precisaDeClube = !!demissao;
  const propostas = demissao ? demissao.propostas : [];
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
            {r.torneios?.D && (
              <div className="linha">
                <Escudo clube={estado.clubes[r.torneios.D.campeao]} tamanho={40} />
                <div className="cresce">
                  <div className="mini fraco">Série D</div>
                  <div className="negrito">{nome(r.torneios.D.campeao)}</div>
                </div>
              </div>
            )}
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
            {/* Libertadores e Sul-Americana com o escudo; as outras copas, só os nomes dos campeões. */}
            {(["K-LIB", "K-SUL"] as const).map((id) => r.copas?.[id] && (
              <div key={id} className="linha">
                <Escudo clube={estado.clubes[r.copas[id]!.campeao]} tamanho={40} />
                <div className="cresce">
                  <div className="mini fraco">{id === "K-LIB" ? "Libertadores" : "Sul-Americana"}</div>
                  <div className="negrito">{nome(r.copas[id]!.campeao)}</div>
                  {r.copas[id]!.vice && <div className="mini fraco">Vice: {nome(r.copas[id]!.vice!)}</div>}
                </div>
              </div>
            ))}
            {r.copas && (
              <p className="pequeno">
                <span className="mini fraco">Outras copas: </span>
                {DEFINICOES.filter((d) => d.id !== "K-LIB" && d.id !== "K-SUL" && r.copas?.[d.id]).map((d) => `${d.nome}: ${nome(r.copas![d.id]!.campeao)}`).join("; ")}.
              </p>
            )}
            {/* Estaduais e ligas de fora (só a primeira divisão): só os nomes dos campeões. */}
            {(["E-", "L-"] as const).map((prefixo) => {
              const lista = (Object.entries(r.torneios ?? {}) as [IdTorneio, { campeao: string }][]).filter(([id]) => id.startsWith(prefixo) && (prefixo === "E-" || divisaoDaLiga(id.slice(2)).nivel === 1));
              if (!lista.length) return null;
              return (
                <p key={prefixo} className="pequeno">
                  <span className="mini fraco">{prefixo === "E-" ? "Estaduais" : "América do Sul"}: </span>
                  {lista.map(([id, t]) => `${nome(t.campeao)} (${prefixo === "E-" ? id.slice(2) : nomeDoTorneio(id).replace("Campeonato ", "")})`).join(", ")}
                </p>
              );
            })}
          </div>
        </Cartao>

        <Cartao titulo="Seu desempenho">
          <p>{r.tecnico.serie === "D" ? `${r.tecnico.posicao}º lugar no grupo da Série D.` : `${r.tecnico.posicao}º lugar: ${r.tecnico.competicao ?? NOME_SERIE[r.tecnico.serie as SerieId]}.`}</p>
          <p className={`pequeno ${r.tecnico.cumpriu ? "verde" : "vermelho"}`}>{r.tecnico.cumpriu ? "Objetivo cumprido" : "Objetivo não cumprido"}: {r.tecnico.objetivo}</p>
          {!precisaDeClube && <p className="pequeno fraco" style={{ marginTop: 6 }}>Em {estado.temporada}: {nomeDaLigaDoClube(estado, meu)}. Objetivo: {estado.objetivo.descricao}.</p>}
        </Cartao>

        <Cartao titulo="Sobe e desce">
          <div className="coluna pequeno" style={{ gap: 6 }}>
            <p><span className="verde">Sobem para a Série A:</span> {r.promovidos.B.map(nome).join(", ")}</p>
            <p><span className="verde">Sobem para a Série B:</span> {r.promovidos.C.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série B:</span> {r.rebaixados.A.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série C:</span> {r.rebaixados.B.map(nome).join(", ")}</p>
            <p><span className="vermelho">Caem para a Série D:</span> {r.rebaixados.C.map(nome).join(", ")}</p>
            {/* Da Série D sobem os finalistas: o campeão e o vice. */}
            {r.torneios?.D?.vice && (
              <p><span className="verde">Sobem para a Série C:</span> {[r.torneios.D.campeao, r.torneios.D.vice].map(nome).join(", ")}</p>
            )}
          </div>
        </Cartao>

        {precisaDeClube ? (
          <Cartao titulo="Propostas de emprego">
            <p className="pequeno fraco" style={{ marginBottom: 8 }}>
              {demissao && `A diretoria ${comArtigo("do", estado.clubes[demissao.clubeId])} não quis continuar com você depois de uma temporada abaixo do objetivo. Estes clubes querem você:`}
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
