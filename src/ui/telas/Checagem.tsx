import { useCallback, useEffect, useState } from "react";
import { checarEstado, repararEstado, testarPartida, type Problema } from "../../engine/checagem";
import { checarAparelho, type ItemChecagem } from "../../save/aparelho";
import { Cartao, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

const ICONE = { ok: "✅", aviso: "⚠️", erro: "❌" } as const;

function Item({ i }: { i: ItemChecagem }) {
  return (
    <li className="item" data-situacao={i.situacao} style={{ alignItems: "flex-start" }}>
      <span aria-hidden="true">{ICONE[i.situacao]}</span>
      <div className="cresce">
        <div className="pequeno negrito">{i.titulo}</div>
        <div className="mini fraco">{i.detalhe}</div>
      </div>
    </li>
  );
}

function itensDoJogo(problemas: Problema[], partida: ReturnType<typeof testarPartida>): ItemChecagem[] {
  const itens: ItemChecagem[] = problemas.length
    ? problemas.map((p) => ({ titulo: "Save", situacao: p.gravidade, detalhe: `${p.texto}${p.reparavel ? " (dá para corrigir)" : ""}` }))
    : [{ titulo: "Save", situacao: "ok", detalhe: "Clubes, jogadores, escalações e partidas consistentes." }];
  itens.push({ titulo: "Motor do jogo", situacao: partida.ok ? "ok" : "erro", detalhe: partida.texto });
  return itens;
}

export function Checagem() {
  const estado = useJogo();
  const { fechar, atualizar, avisar } = useLoja();
  const [aparelho, setAparelho] = useState<ItemChecagem[] | null>(null);
  const [jogo, setJogo] = useState<ItemChecagem[] | null>(null);
  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [hora, setHora] = useState("");

  const verificar = useCallback(async () => {
    setAparelho(null);
    setJogo(null);
    const p = checarEstado(estado);
    setProblemas(p);
    setJogo(itensDoJogo(p, testarPartida(estado)));
    setAparelho(await checarAparelho());
    setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }, [estado]);

  useEffect(() => { void verificar(); }, [verificar]);

  const corrigir = () => {
    const feito = repararEstado(estado);
    atualizar();
    avisar(feito.length ? `Corrigido: ${feito.join(" ")}` : "Nada para corrigir.");
    void verificar();
  };

  const todos = [...(aparelho ?? []), ...(jogo ?? [])];
  const erros = todos.filter((i) => i.situacao === "erro").length;
  const avisos = todos.filter((i) => i.situacao === "aviso").length;
  const terminou = aparelho !== null && jogo !== null;
  const reparaveis = problemas.some((p) => p.reparavel);

  return (
    <div className="tela-cheia">
      <Topo titulo="Checagem do jogo" sub={terminou ? `Verificado às ${hora}` : "Verificando..."} aoVoltar={fechar} />
      <div className="conteudo">
        {terminou && (
          <div className="cartao" role="status" data-resumo={erros ? "erro" : avisos ? "aviso" : "ok"}>
            <div className="negrito">{erros ? `${erros} problema(s) encontrado(s)` : avisos ? `Tudo funcionando, com ${avisos} aviso(s)` : "Tudo certo!"}</div>
            <p className="pequeno fraco">Esta checagem roda no próprio aparelho e funciona sem internet. Ela também roda sozinha sempre que um jogo é aberto.</p>
          </div>
        )}
        <Cartao titulo="Aparelho">
          {aparelho ? <ul className="lista" style={{ margin: 0, padding: 0 }}>{aparelho.map((i) => <Item key={i.titulo} i={i} />)}</ul> : <p className="pequeno fraco">Verificando...</p>}
        </Cartao>
        <Cartao titulo="Jogo">
          {jogo ? <ul className="lista" style={{ margin: 0, padding: 0 }}>{jogo.map((i, n) => <Item key={n} i={i} />)}</ul> : <p className="pequeno fraco">Verificando...</p>}
        </Cartao>
        {reparaveis && <button className="botao primario cheio" onClick={corrigir}>Corrigir problemas</button>}
        <button className="botao cheio" onClick={() => void verificar()} disabled={!terminou}>Verificar de novo</button>
      </div>
    </div>
  );
}
