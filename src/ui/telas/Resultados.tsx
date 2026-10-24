import { useState } from "react";
import { formatarData } from "../../engine/calendario";
import { NOME_SERIE, SERIES } from "../../engine/competicoes";
import type { Partida } from "../../engine/tipos";
import { Topo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";
import { FolhaPartida, LinhaResultado } from "./Tabelas";

export function Resultados({ partidas }: { partidas: Partida[] }) {
  const estado = useJogo();
  const { fechar } = useLoja();
  const [aberta, setAberta] = useState<Partida | null>(null);
  const atuais = partidas.map((p) => estado.partidas.find((x) => x.id === p.id) ?? p);
  return (
    <div className="tela-cheia">
      <Topo titulo="Resultados do dia" sub={atuais[0] ? formatarData(atuais[0].data, true) : ""} aoVoltar={fechar} />
      <div className="conteudo">
        {SERIES.map((s) => {
          const daSerie = atuais.filter((p) => p.serie === s);
          if (!daSerie.length) return null;
          return (
            <div key={s}>
              <h3 className="pequeno fraco" style={{ marginBottom: 4 }}>{NOME_SERIE[s]} · {rotuloPartida(daSerie[0]).split(" · ").slice(1).join(" · ")}</h3>
              {daSerie.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
            </div>
          );
        })}
        <button className="botao primario cheio" onClick={fechar}>Continuar</button>
      </div>
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}
