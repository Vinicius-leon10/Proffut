import { useState } from "react";
import { formatarData } from "../../engine/calendario";
import { nomeDaCompeticao } from "../../engine/competicoes";
import { competicoesDoUsuario } from "../../engine/torneios";
import type { Competicao, Partida } from "../../engine/tipos";
import { Topo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";
import { FolhaPartida, LinhaResultado } from "./Tabelas";

export function Resultados({ partidas }: { partidas: Partida[] }) {
  const estado = useJogo();
  const { fechar } = useLoja();
  const [aberta, setAberta] = useState<Partida | null>(null);
  // Só os campeonatos que o usuário acompanha (os jogos dos outros estaduais e das ligas de fora ficam nas Tabelas),
  // com o do jogo dele primeiro.
  const acompanha = competicoesDoUsuario(estado);
  const atuais = partidas.map((p) => estado.partidas.find((x) => x.id === p.id) ?? p).filter((p) => acompanha.has(p.serie));
  const meuId = estado.tecnico.clubeId;
  const minha = atuais.find((p) => p.mandante === meuId || p.visitante === meuId)?.serie;
  const ordem = [...new Set(atuais.map((p) => p.serie))].sort((a, b) => (a === minha ? -1 : b === minha ? 1 : a.localeCompare(b)));
  return (
    <div className="tela-cheia">
      <Topo titulo="Resultados do dia" sub={atuais[0] ? formatarData(atuais[0].data, true) : ""} aoVoltar={fechar} />
      <div className="linha" style={{ padding: "10px 16px", borderBottom: "1px solid var(--borda)" }}>
        <button className="botao primario cheio" onClick={fechar}>Continuar</button>
      </div>
      <div className="conteudo">
        {ordem.map((s: Competicao) => {
          const daSerie = atuais.filter((p) => p.serie === s);
          if (!daSerie.length) return null;
          return (
            <div key={s}>
              <h3 className="pequeno fraco" style={{ marginBottom: 4 }}>{nomeDaCompeticao(s)} · {rotuloPartida(daSerie[0]).split(" · ").slice(1).join(" · ")}</h3>
              {daSerie.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
            </div>
          );
        })}
      </div>
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}
