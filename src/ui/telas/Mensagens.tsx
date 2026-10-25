import { useEffect, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { formatarDinheiro } from "../../engine/financas";
import { valorMercado } from "../../engine/gerador";
import { pedirMais, responderProposta } from "../../engine/mercado";
import type { Mensagem } from "../../engine/tipos";
import { Folha, Opcoes, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

const ROTULO_TIPO: Record<Mensagem["tipo"], string> = {
  diretoria: "Diretoria",
  proposta: "Proposta",
  lesao: "Departamento médico",
  noticia: "Notícias",
  temporada: "Temporada",
  mercado: "Mercado",
};

const AUMENTOS = ["5", "10", "20", "30", "50"] as const;

/** Pedir mais numa proposta: escolhe quanto a mais e manda para o clube comprador. */
function FolhaPedirMais({ m, aoFechar }: { m: Mensagem; aoFechar: () => void }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const [aumento, setAumento] = useState<(typeof AUMENTOS)[number]>("10");
  const p = m.proposta!;
  const j = estado.jogadores[p.jogadorId];
  const comprador = estado.clubes[p.clubeId];
  const pedido = Math.round((p.valor * (1 + Number(aumento) / 100)) / 10_000) * 10_000;
  const pedir = () => {
    const r = pedirMais(estado, m.id, pedido);
    avisar(r.texto);
    atualizar();
    aoFechar();
  };
  return (
    <Folha titulo={`Pedir mais por ${j?.nome ?? "jogador"}`} aoFechar={aoFechar}>
      <p className="pequeno">
        {comprador ? comArtigo("O", comprador) : "O clube"} oferece <b>{formatarDinheiro(p.valor)}</b>.{j ? ` Valor de mercado: ${formatarDinheiro(valorMercado(j))}.` : ""}
      </p>
      <div className="pequeno fraco">Quanto a mais você pede?</div>
      <Opcoes opcoes={AUMENTOS.map((a) => ({ valor: a, rotulo: `+${a}%` }))} valor={aumento} aoMudar={setAumento} />
      <div className="centro">
        <div className="mini fraco">Você pede</div>
        <div className="negrito num" style={{ fontSize: "1.6rem" }}>{formatarDinheiro(pedido)}</div>
      </div>
      <p className="mini fraco">Até 5% a mais o clube sempre aceita. Acima disso ele pode melhorar a oferta uma vez ou desistir.</p>
      <button className="botao primario cheio" onClick={pedir}>Pedir R$ {pedido.toLocaleString("pt-BR")}</button>
    </Folha>
  );
}

export function MensagemItem({ m }: { m: Mensagem }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const [pedindo, setPedindo] = useState(false);
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
          <button className="botao pequeno cresce" onClick={() => setPedindo(true)}>Pedir mais</button>
          <button className="botao pequeno cresce" onClick={() => responder(false)}>Recusar</button>
        </div>
      )}
      {pendente && pedindo && <FolhaPedirMais m={m} aoFechar={() => setPedindo(false)} />}
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
