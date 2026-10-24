import { useEffect } from "react";
import { formatarData } from "../../engine/calendario";
import { responderProposta } from "../../engine/mercado";
import type { Mensagem } from "../../engine/tipos";
import { Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

const ROTULO_TIPO: Record<Mensagem["tipo"], string> = {
  diretoria: "Diretoria",
  proposta: "Proposta",
  lesao: "Departamento médico",
  noticia: "Notícias",
  temporada: "Temporada",
  mercado: "Mercado",
};

export function MensagemItem({ m }: { m: Mensagem }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const responder = (aceitar: boolean) => {
    const r = responderProposta(estado, m.id, aceitar);
    avisar(r.texto);
    atualizar();
  };
  const pendente = m.proposta && !m.proposta.resolvida;
  return (
    <div className="item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
      <div className="linha entre" style={{ width: "100%" }}>
        <span className={`chip${m.tipo === "proposta" ? " amarelo" : m.tipo === "diretoria" ? " azul" : m.tipo === "lesao" ? " vermelho" : ""}`}>{ROTULO_TIPO[m.tipo]}</span>
        <span className="mini muito-fraco">{formatarData(m.data)}</span>
      </div>
      <div className={m.lida ? "pequeno" : "pequeno negrito"}>{m.titulo}</div>
      <p className="pequeno fraco">{m.texto}</p>
      {pendente && (
        <div className="linha" style={{ width: "100%" }}>
          <button className="botao verde pequeno cresce" onClick={() => responder(true)}>Aceitar</button>
          <button className="botao pequeno cresce" onClick={() => responder(false)}>Recusar</button>
        </div>
      )}
      {m.proposta?.resolvida && <span className="mini muito-fraco">Proposta {m.proposta.resolvida}.</span>}
    </div>
  );
}

export function Mensagens() {
  const estado = useJogo();
  const { fechar, atualizar } = useLoja();
  // Ao sair da caixa, tudo conta como lido.
  useEffect(() => () => {
    estado.mensagens.forEach((m) => { m.lida = true; });
    atualizar();
  }, [estado, atualizar]);
  return (
    <div className="tela-cheia">
      <Topo titulo="Mensagens" aoVoltar={fechar} />
      <div className="conteudo">
        {estado.mensagens.length === 0 ? <p className="vazio">Nenhuma mensagem.</p> : (
          <div className="lista">{estado.mensagens.map((m) => <MensagemItem key={m.id} m={m} />)}</div>
        )}
      </div>
    </div>
  );
}
