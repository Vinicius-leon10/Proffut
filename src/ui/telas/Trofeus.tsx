import { comArtigo } from "../../engine/artigos";
import { reputacaoDoTecnico } from "../../engine/carreira";
import { carreiraDoTecnico, descreverPublico, descreverRecorde, titulosDoClube, type Titulo } from "../../engine/trofeus";
import type { EstadoJogo } from "../../engine/tipos";
import { Cartao, Escudo, Icone, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

const ARTILHEIROS_NA_TELA = 10;

export function Trofeus() {
  const estado = useJogo();
  const { fechar } = useLoja();
  const meuId = estado.tecnico.clubeId;
  const clube = estado.clubes[meuId];
  const titulos = titulosDoClube(estado, meuId);
  const recordes = estado.recordes?.clubes[meuId];
  const desde = estado.recordes?.desde ?? estado.temporada;
  const artilheiros = (recordes?.artilheiros ?? []).slice(0, ARTILHEIROS_NA_TELA);
  const carreira = carreiraDoTecnico(estado);
  return (
    <div className="tela-cheia">
      <Topo titulo="Sala de troféus" sub={clube.nome} aoVoltar={fechar} />
      <div className="conteudo trofeus">
        <Cartao titulo="Títulos">
          {titulos.length ? <ListaDeTitulos estado={estado} titulos={titulos} /> : (
            <p className="pequeno fraco">Nenhum título ainda. Os títulos e acessos conquistados aparecem aqui no fim de cada temporada.</p>
          )}
        </Cartao>

        <Cartao titulo="Recordes">
          <div className="coluna" style={{ gap: 10 }}>
            <Recorde rotulo="Maior goleada" texto={recordes?.maiorVitoria ? descreverRecorde(estado, recordes.maiorVitoria) : "Nenhuma vitória ainda"} />
            <Recorde rotulo="Pior derrota" texto={recordes?.piorDerrota ? descreverRecorde(estado, recordes.piorDerrota) : "Nenhuma derrota ainda"} />
            <Recorde rotulo="Maior público" texto={recordes?.maiorPublico ? descreverPublico(estado, recordes.maiorPublico) : "Nenhum jogo em casa ainda"} />
            <p className="mini fraco">Contando os jogos desde {desde}.</p>
          </div>
        </Cartao>

        <Cartao titulo="Maiores artilheiros">
          {artilheiros.length ? (
            <div className="lista">
              {artilheiros.map((a, i) => (
                <div key={a.id} className="item">
                  <span className="colocacao num">{i + 1}º</span>
                  <div className="cresce" style={{ minWidth: 0 }}>
                    <div className="pequeno negrito corta">{a.nome}</div>
                    <div className="mini fraco corta">{ondeEsta(estado, a.id, meuId)}</div>
                  </div>
                  <span className="gols num">{a.gols}</span>
                </div>
              ))}
            </div>
          ) : <p className="pequeno fraco">Nenhum gol ainda.</p>}
          <p className="mini fraco" style={{ marginTop: 8 }}>Gols pelo clube desde {desde}, em todas as competições.</p>
        </Cartao>

        <Cartao titulo="Sua carreira">
          <div className="coluna" style={{ gap: 10 }}>
            <div className="linha entre pequeno" style={{ flexWrap: "wrap", rowGap: 8 }}>
              <div><div className="mini fraco">Temporadas</div><div className="negrito num">{carreira.temporadas}</div></div>
              <div><div className="mini fraco">Objetivos cumpridos</div><div className="negrito num">{carreira.objetivosCumpridos} de {carreira.temporadas}</div></div>
              <div><div className="mini fraco">Reputação</div><div className="negrito num">{Math.round(reputacaoDoTecnico(estado))}</div></div>
            </div>
            <div className="mini fraco">Clubes: {carreira.clubes.map((id) => estado.clubes[id]?.nome ?? id).join(", ")}</div>
            {carreira.titulos.length ? <ListaDeTitulos estado={estado} titulos={carreira.titulos} comClube /> : <p className="pequeno fraco">Nenhum título na carreira ainda.</p>}
          </div>
        </Cartao>
      </div>
    </div>
  );
}

function ListaDeTitulos({ estado, titulos, comClube }: { estado: EstadoJogo; titulos: Titulo[]; comClube?: boolean }) {
  return (
    <div className="coluna" style={{ gap: 8 }}>
      {titulos.map((t, i) => {
        const tipo = t.titulo.startsWith("Acesso") ? "acesso" : t.titulo.startsWith("Vice") ? "vice" : "campeao";
        return (
          <div key={i} className="linha titulo-conquistado">
            <span className={`taca ${tipo}`}><Icone nome={tipo === "acesso" ? "subir" : "tabelas"} /></span>
            <div className="cresce" style={{ minWidth: 0 }}>
              <div className="pequeno negrito">{t.titulo}</div>
              <div className="mini fraco">{comClube ? `${estado.clubes[t.clubeId]?.nome ?? t.clubeId} · ` : ""}{t.temporada}</div>
            </div>
            {comClube && estado.clubes[t.clubeId] && <Escudo clube={estado.clubes[t.clubeId]} tamanho={24} />}
          </div>
        );
      })}
    </div>
  );
}

function Recorde({ rotulo, texto }: { rotulo: string; texto: string }) {
  return (
    <div>
      <div className="mini fraco">{rotulo}</div>
      <div className="pequeno negrito">{texto}</div>
    </div>
  );
}

/** "no elenco", "hoje no Remo", "aposentado"... */
function ondeEsta(estado: EstadoJogo, jogadorId: number, meuId: string) {
  const j = estado.jogadores[jogadorId];
  if (!j) return "aposentado";
  const clube = j.clubeId ? estado.clubes[j.clubeId] : undefined;
  if (j.clubeId === meuId) return "no elenco";
  if (j.emprestimo?.de === meuId && clube) return `emprestado ${comArtigo("ao", clube)}`;
  return clube ? `hoje ${comArtigo("no", clube)}` : "sem clube";
}
