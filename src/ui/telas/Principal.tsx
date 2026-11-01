import { formatarData } from "../../engine/calendario";
import { formatarDinheiro } from "../../engine/financas";
import { naoLidas } from "../../engine/mensagens";
import { propostasPendentes } from "../../engine/mercado";
import { Escudo, Icone } from "../componentes";
import { useJogo, useLoja, type Aba } from "../store";
import { Demissao } from "./Demissao";
import { Elenco } from "./Elenco";
import { FimTemporada } from "./FimTemporada";
import { Mercado } from "./Mercado";
import { Painel } from "./Painel";
import { Tabelas } from "./Tabelas";
import { Tatica } from "./Tatica";
import { Tutorial } from "./Tutorial";

const ABAS: { aba: Aba; rotulo: string; icone: string }[] = [
  { aba: "clube", rotulo: "Clube", icone: "clube" },
  { aba: "elenco", rotulo: "Elenco", icone: "elenco" },
  { aba: "tatica", rotulo: "Tática", icone: "tatica" },
  { aba: "tabelas", rotulo: "Tabelas", icone: "tabelas" },
  { aba: "mercado", rotulo: "Mercado", icone: "mercado" },
];

export function Principal() {
  const estado = useJogo();
  const { aba, irParaAba, abrir } = useLoja();
  const clube = estado.clubes[estado.tecnico.clubeId];
  const novas = naoLidas(estado);
  // As propostas pelos meus jogadores ficam no Mercado, com o número na barra de baixo (R63).
  const propostas = propostasPendentes(estado).length;
  // Demitido, ou com o clube rebaixado para a Série D (fora do jogo): precisa escolher um novo clube.
  if (estado.tecnico.demissao) return <Demissao />;
  if (clube.serie === "D") return <FimTemporada />;

  return (
    <div className="app">
      <header className="topo">
        <Escudo clube={clube} tamanho={44} />
        <div className="cresce">
          <div className="titulo corta">{clube.nome}</div>
          <div className="sub corta">
            {formatarData(estado.data, true)} · <span className={clube.caixa < 0 ? "vermelho" : ""}>{formatarDinheiro(clube.caixa)}</span>
          </div>
        </div>
        <button className="icone-botao" onClick={() => abrir({ tipo: "mensagens" })} aria-label={`Mensagens${novas ? `, ${novas} novas` : ""}`} style={{ position: "relative" }}>
          <Icone nome="mensagens" />
          {novas > 0 && <span className="selo-numero" style={{ position: "absolute", top: 4, right: 4 }}>{novas > 9 ? "9+" : novas}</span>}
        </button>
        <button className="icone-botao" onClick={() => abrir({ tipo: "config" })} aria-label="Configurações"><Icone nome="config" /></button>
      </header>

      <main className="conteudo">
        {aba === "clube" && <Painel />}
        {aba === "elenco" && <Elenco />}
        {aba === "tatica" && <Tatica />}
        {aba === "tabelas" && <Tabelas />}
        {aba === "mercado" && <Mercado />}
      </main>

      <nav className="abas" aria-label="Seções">
        {ABAS.map((a) => {
          const aviso = a.aba === "mercado" ? propostas : 0;
          return (
            <button
              key={a.aba}
              className={`aba${aba === a.aba ? " ativa" : ""}`}
              onClick={() => irParaAba(a.aba)}
              aria-current={aba === a.aba}
              aria-label={aviso ? `${a.rotulo}, ${aviso} ${aviso === 1 ? "proposta" : "propostas"}` : undefined}
            >
              <Icone nome={a.icone} />
              {a.rotulo}
              {aviso > 0 && <span className="selo-numero">{aviso > 9 ? "9+" : aviso}</span>}
            </button>
          );
        })}
      </nav>
      {estado.tutorial && <Tutorial />}
    </div>
  );
}
