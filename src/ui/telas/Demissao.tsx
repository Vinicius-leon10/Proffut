import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { NOME_SERIE } from "../../engine/competicoes";
import { forcaDoTime } from "../../engine/forca";
import { assumirClube } from "../../engine/jogo";
import { elencoDe } from "../../engine/mercado";
import type { SerieId } from "../../engine/tipos";
import { Cartao, Escudo, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

/** Clubes que querem o técnico: tocar num deles assume o clube. */
export function PropostasDeEmprego({ propostas, aoEscolher }: { propostas: string[]; aoEscolher?: () => void }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  return (
    <div className="lista">
      {propostas.map((id) => {
        const c = estado.clubes[id];
        const escolher = () => {
          assumirClube(estado, id);
          atualizar();
          avisar(`Você assumiu ${comArtigo("o", c)}!`);
          aoEscolher?.();
        };
        return (
          <button key={id} className="item" onClick={escolher} aria-label={`Assumir ${comArtigo("o", c)}`}>
            <Escudo clube={c} tamanho={34} />
            <div className="cresce">
              <div className="negrito pequeno">{c.nome}</div>
              <div className="mini fraco">
                {c.serie !== "D" && `${NOME_SERIE[c.serie as SerieId]} · `}{c.cidade}/{c.estado} · força {Math.round(forcaDoTime(elencoDe(estado, id)))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Demitido no meio da temporada: no lugar do painel até escolher um novo clube (continua depois de fechar o app). */
export function Demissao() {
  const estado = useJogo();
  const d = estado.tecnico.demissao!;
  const anterior = estado.clubes[d.clubeId];
  return (
    <div className="tela-cheia">
      <Topo titulo="Você foi demitido" sub={formatarData(d.data, true)} />
      <div className="conteudo">
        <Cartao>
          <div className="linha">
            <Escudo clube={anterior} tamanho={44} />
            <p className="pequeno cresce">
              A diretoria {comArtigo("do", anterior)} perdeu a confiança no seu trabalho e decidiu trocar de técnico. Escolha o seu novo clube.
            </p>
          </div>
        </Cartao>
        <Cartao titulo="Propostas de emprego">
          <PropostasDeEmprego propostas={d.propostas} />
        </Cartao>
      </div>
    </div>
  );
}
