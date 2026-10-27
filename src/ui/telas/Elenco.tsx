import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { anosMaximos, pedidoDeRenovacao, renovarContrato, ultimoAno } from "../../engine/contratos";
import { NOMES_CARACTERISTICA, NOMES_POSICAO, fatorEnergia } from "../../engine/forca";
import { formatarDinheiro } from "../../engine/financas";
import { valorMercado } from "../../engine/gerador";
import { dispensar, elencoDe, podeSair, precoPedido } from "../../engine/mercado";
import type { Jogador, Posicao } from "../../engine/tipos";
import { Barra, Escudo, Folha, Opcoes, Pos } from "../componentes";
import { NOMES_NACIONALIDADE } from "../formatos";
import { useJogo, useLoja } from "../store";

const ORDEM: Posicao[] = ["G", "L", "Z", "M", "A"];

export function Situacao({ j }: { j: Jogador }) {
  const estado = useJogo();
  const fimDeContrato = j.clubeId === estado.tecnico.clubeId && ultimoAno(estado, j);
  return (
    <>
      {fimDeContrato && <span className="chip amarelo" title="Contrato termina nesta temporada">Fim de contrato</span>}
      {j.lesaoDias > 0 && <span className="chip vermelho" title="Lesionado">Lesão {j.lesaoDias}d</span>}
      {j.suspensaoJogos > 0 && <span className="chip vermelho" title="Suspenso">Suspenso</span>}
      {j.amarelosAcumulados === 2 && j.suspensaoJogos === 0 && <span className="chip amarelo" title="Pendurado com 2 amarelos">2 CA</span>}
      {j.aVenda && <span className="chip amarelo">À venda</span>}
    </>
  );
}

export function LinhaJogador({ j, aoTocar, direita }: { j: Jogador; aoTocar?: () => void; direita?: React.ReactNode }) {
  return (
    <button className="item" onClick={aoTocar}>
      <Pos pos={j.posicao} />
      <div className="cresce">
        <div className="linha" style={{ gap: 6 }}>
          <span className="negrito corta pequeno">{j.nome}</span>
          <Situacao j={j} />
        </div>
        <div className="mini fraco corta">
          {j.idade} anos{j.posicao === "L" ? ` · ${j.lado === "D" ? "direita" : "esquerda"}` : ""}
          {j.caracteristicas.length ? ` · ${j.caracteristicas.map((c) => NOMES_CARACTERISTICA[c]).join(", ")}` : ""}
        </div>
        <div style={{ width: 70, marginTop: 4 }}><Barra valor={j.energia} /></div>
      </div>
      {direita}
      <div className="forca" style={{ fontSize: "1.1rem" }}>{j.forca}</div>
    </button>
  );
}

/** Renovação no último ano do contrato: o salário que ele pede e por quantas temporadas. */
function Renovacao({ j, aoVoltar }: { j: Jogador; aoVoltar: () => void }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const maximo = anosMaximos(j.idade);
  const [anos, setAnos] = useState(String(Math.min(2, maximo)));
  const pedido = pedidoDeRenovacao(estado, j);
  const renovar = () => {
    const r = renovarContrato(estado, j.id, Number(anos));
    avisar(r.texto);
    atualizar();
    if (r.ok) aoVoltar();
  };
  return (
    <>
      <p className="pequeno">{j.nome} pede <b>{formatarDinheiro(pedido)}/mês</b> para renovar. Hoje ganha {formatarDinheiro(j.salario)}/mês.</p>
      <div className="pequeno fraco">Por quanto tempo?</div>
      <Opcoes opcoes={Array.from({ length: maximo }, (_, i) => ({ valor: String(i + 1), rotulo: i ? `${i + 1} anos` : "1 ano" }))} valor={anos} aoMudar={setAnos} />
      {maximo < 3 && <p className="mini fraco">Com {j.idade} anos, ele aceita no máximo {maximo === 1 ? "1 ano" : `${maximo} anos`}.</p>}
      <button className="botao primario cheio" onClick={renovar}>Renovar até {estado.temporada + Number(anos)} por {formatarDinheiro(pedido)}/mês</button>
      <button className="botao cheio" onClick={aoVoltar}>Voltar</button>
    </>
  );
}

export function FolhaJogador({ jogadorId, aoFechar }: { jogadorId: number; aoFechar: () => void }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const [renovando, setRenovando] = useState(false);
  const j = estado.jogadores[jogadorId];
  if (!j) return null;
  const meu = j.clubeId === estado.tecnico.clubeId;
  const clube = j.clubeId ? estado.clubes[j.clubeId] : undefined;
  const t = j.temporada;
  if (meu && renovando) {
    return (
      <Folha titulo={`Renovar com ${j.nome}`} aoFechar={aoFechar}>
        <Renovacao j={j} aoVoltar={() => setRenovando(false)} />
      </Folha>
    );
  }
  return (
    <Folha titulo={j.nome} aoFechar={aoFechar}>
      <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
        <Pos pos={j.posicao} />
        <span className="pequeno">{NOMES_POSICAO[j.posicao]}{j.posicao === "L" ? ` (${j.lado === "D" ? "direita" : "esquerda"})` : ""}</span>
        <span className="pequeno fraco">· {j.idade} anos · {NOMES_NACIONALIDADE[j.nacionalidade] ?? j.nacionalidade}</span>
        <Situacao j={j} />
      </div>
      <div className="linha" style={{ gap: 6 }}>
        {clube ? <><Escudo clube={clube} tamanho={22} /><span className="pequeno">{clube.nome}</span></> : <span className="chip">Sem clube</span>}
        {clube && j.contratoAte != null && <span className="pequeno fraco">· Contrato até {j.contratoAte}</span>}
      </div>
      {meu && ultimoAno(estado, j) && (
        <div className="cartao compacto">
          <p className="pequeno">O contrato termina no fim de {estado.temporada}. Sem renovar, ele sai de graça na virada.</p>
          <button className="botao primario cheio" style={{ marginTop: 8 }} onClick={() => setRenovando(true)}>Renovar contrato</button>
        </div>
      )}
      <div className="cartao compacto">
        <div className="linha entre">
          <div className="centro"><div className="forca" style={{ fontSize: "1.8rem" }}>{j.forca}</div><div className="mini fraco">força</div></div>
          <div className="centro"><div className="negrito num">{Math.round(j.energia)}%</div><div className="mini fraco">energia</div></div>
          <div className="centro"><div className="negrito num">{formatarDinheiro(j.salario)}</div><div className="mini fraco">salário/mês</div></div>
          <div className="centro"><div className="negrito num">{formatarDinheiro(valorMercado(j))}</div><div className="mini fraco">valor</div></div>
        </div>
        <div style={{ marginTop: 10 }}><Barra valor={j.energia} /></div>
        <p className="mini muito-fraco" style={{ marginTop: 6 }}>Com essa energia ele rende {Math.round(fatorEnergia(j.energia) * 100)}% da força.</p>
      </div>
      <div className="opcoes">
        {j.caracteristicas.length ? j.caracteristicas.map((c) => <span key={c} className="chip verde">{NOMES_CARACTERISTICA[c]}</span>) : <span className="pequeno fraco">Sem características especiais.</span>}
      </div>
      <table className="tabela">
        <thead><tr><th></th><th>Jogos</th><th>Gols</th><th>Assist.</th><th>CA</th><th>CV</th></tr></thead>
        <tbody>
          <tr><td className="clube pequeno">Temporada</td><td>{t.jogos}</td><td>{t.gols}</td><td>{t.assistencias}</td><td>{t.amarelos}</td><td>{t.vermelhos}</td></tr>
          <tr><td className="clube pequeno">Carreira</td><td>{j.carreira.jogos + t.jogos}</td><td>{j.carreira.gols + t.gols}</td><td>{j.carreira.assistencias + t.assistencias}</td><td>{j.carreira.amarelos + t.amarelos}</td><td>{j.carreira.vermelhos + t.vermelhos}</td></tr>
        </tbody>
      </table>
      {meu && (
        <div className="coluna">
          <button className="botao cheio" onClick={() => { j.aVenda = !j.aVenda; atualizar(); avisar(j.aVenda ? `${j.nome} foi colocado à venda. Propostas chegam nas mensagens.` : `${j.nome} saiu da lista de venda.`); }}>
            {j.aVenda ? "Tirar da lista de venda" : "Colocar à venda"}
          </button>
          <button
            className="botao perigo cheio"
            disabled={!podeSair(estado, j)}
            onClick={() => {
              if (!confirm(`Dispensar ${j.nome}? O clube paga 3 salários de rescisão (${formatarDinheiro(j.salario * 3)}).`)) return;
              const r = dispensar(estado, j.id);
              avisar(r.texto);
              atualizar();
              if (r.ok) aoFechar();
            }}
          >
            Dispensar
          </button>
        </div>
      )}
      {!meu && clube && <p className="pequeno fraco">Preço pedido {comArtigo("pelo", clube)}: <b>{formatarDinheiro(precoPedido(estado, j))}</b></p>}
    </Folha>
  );
}

export function Elenco() {
  const estado = useJogo();
  const [filtro, setFiltro] = useState<Posicao | "todos">("todos");
  const [aberto, setAberto] = useState<number | null>(null);
  const versao = useLoja((s) => s.versao);
  const elenco = useMemo(
    () => elencoDe(estado, estado.tecnico.clubeId).sort((a, b) => ORDEM.indexOf(a.posicao) - ORDEM.indexOf(b.posicao) || b.forca - a.forca),
    [estado, versao],
  );
  const lista = filtro === "todos" ? elenco : elenco.filter((j) => j.posicao === filtro);
  const media = Math.round(elenco.reduce((s, j) => s + j.forca, 0) / Math.max(1, elenco.length));
  const indisponiveis = elenco.filter((j) => j.lesaoDias > 0 || j.suspensaoJogos > 0).length;
  const terminando = elenco.filter((j) => ultimoAno(estado, j)).length;

  return (
    <>
      <div className="linha entre">
        <h2>Elenco</h2>
        <span className="pequeno fraco">{elenco.length} jogadores · média {media}{indisponiveis ? ` · ${indisponiveis} fora` : ""}</span>
      </div>
      <Opcoes
        opcoes={[{ valor: "todos", rotulo: "Todos" }, ...ORDEM.map((p) => ({ valor: p, rotulo: NOMES_POSICAO[p] + "s" }))]}
        valor={filtro}
        aoMudar={setFiltro}
      />
      {terminando > 0 && (
        <p className="mini fraco">
          {terminando === 1 ? "1 jogador está" : `${terminando} jogadores estão`} no último ano de contrato: toque no jogador para renovar, ou ele sai de graça no fim da temporada.
        </p>
      )}
      <div className="lista">
        {lista.map((j) => <LinhaJogador key={j.id} j={j} aoTocar={() => setAberto(j.id)} />)}
      </div>
      {aberto !== null && <FolhaJogador jogadorId={aberto} aoFechar={() => setAberto(null)} />}
    </>
  );
}
