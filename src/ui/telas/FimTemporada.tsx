import { NOME_SERIE, SERIES } from "../../engine/competicoes";
import { forcaDoTime } from "../../engine/forca";
import { assumirClube, propostasDeEmprego } from "../../engine/jogo";
import { elencoDe } from "../../engine/mercado";
import type { SerieId } from "../../engine/tipos";
import { Cartao, Escudo, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

export function FimTemporada() {
  const estado = useJogo();
  const { fechar, atualizar, avisar } = useLoja();
  const r = estado.historico[estado.historico.length - 1];
  const meu = estado.clubes[estado.tecnico.clubeId];
  const precisaDeClube = meu.serie === "D";
  const propostas = precisaDeClube ? propostasDeEmprego(estado) : [];
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
            <p className="pequeno fraco" style={{ marginBottom: 8 }}>O {meu.nome} caiu para a Série D, que não é disputada no jogo. Estes clubes da Série C querem você:</p>
            <div className="lista">
              {propostas.map((id) => {
                const c = estado.clubes[id];
                return (
                  <button key={id} className="item" onClick={() => { assumirClube(estado, id); atualizar(); avisar(`Você assumiu o ${c.nome}!`); fechar(); }}>
                    <Escudo clube={c} tamanho={34} />
                    <div className="cresce">
                      <div className="negrito pequeno">{c.nome}</div>
                      <div className="mini fraco">{c.cidade}/{c.estado} · força {Math.round(forcaDoTime(elencoDe(estado, id)))}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Cartao>
        ) : (
          <button className="botao primario grande cheio" onClick={fechar}>Começar {estado.temporada}</button>
        )}
      </div>
    </div>
  );
}
