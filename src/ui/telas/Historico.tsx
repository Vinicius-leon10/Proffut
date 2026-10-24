import { NOME_SERIE, SERIES } from "../../engine/competicoes";
import { Cartao, Escudo, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

export function Historico() {
  const estado = useJogo();
  const { fechar } = useLoja();
  const temporadas = [...estado.historico].reverse();
  return (
    <div className="tela-cheia">
      <Topo titulo="Histórico" sub={`${estado.tecnico.nome} · ${estado.historico.length} temporada(s) concluída(s)`} aoVoltar={fechar} />
      <div className="conteudo">
        {temporadas.length === 0 && <p className="vazio">Ainda não terminou nenhuma temporada. Os campeões aparecem aqui.</p>}
        {temporadas.map((r) => {
          const meu = estado.clubes[r.tecnico.clubeId];
          return (
            <Cartao key={r.temporada} titulo={`Temporada ${r.temporada}`}>
              <div className="coluna" style={{ gap: 8 }}>
                {SERIES.map((s) => {
                  const c = estado.clubes[r.campeoes[s]];
                  const art = r.artilheiros[s];
                  return (
                    <div key={s} className="linha">
                      <Escudo clube={c} tamanho={30} />
                      <div className="cresce">
                        <div className="pequeno negrito">{NOME_SERIE[s]}: {c.nome}</div>
                        {art && <div className="mini fraco corta">Artilheiro: {art.nome} ({art.gols} gols)</div>}
                      </div>
                    </div>
                  );
                })}
                <div className="linha" style={{ borderTop: "1px solid var(--borda)", paddingTop: 8 }}>
                  <Escudo clube={meu} tamanho={30} />
                  <div className="cresce">
                    <div className="pequeno">Você: {r.tecnico.posicao}º na {NOME_SERIE[r.tecnico.serie]} com o {meu.nome}</div>
                    <div className={`mini ${r.tecnico.cumpriu ? "verde" : "vermelho"}`}>{r.tecnico.cumpriu ? "Objetivo cumprido" : "Objetivo não cumprido"}: {r.tecnico.objetivo}</div>
                  </div>
                </div>
              </div>
            </Cartao>
          );
        })}
      </div>
    </div>
  );
}
