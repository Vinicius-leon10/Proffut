import { useMemo, useState } from "react";
import { NOMES_CARACTERISTICA, NOMES_POSICAO } from "../../engine/forca";
import { formatarDinheiro } from "../../engine/financas";
import { salarioBase, valorMercado } from "../../engine/gerador";
import { elencoDe, fazerOferta, livres, podeSair, precoPedido } from "../../engine/mercado";
import type { Jogador, Posicao, SerieId } from "../../engine/tipos";
import { Escudo, Folha, Opcoes, Pos, Segmentado } from "../componentes";
import { useJogo, useLoja } from "../store";
import { LinhaJogador, Situacao } from "./Elenco";

type Vista = "buscar" | "livres" | "venda";

function FolhaOferta({ j, aoFechar }: { j: Jogador; aoFechar: () => void }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const meu = estado.clubes[estado.tecnico.clubeId];
  const pedido = precoPedido(estado, j);
  const [oferta, setOferta] = useState(pedido);
  const clube = j.clubeId ? estado.clubes[j.clubeId] : undefined;
  const vende = podeSair(estado, j);

  const enviar = () => {
    const r = fazerOferta(estado, j.id, oferta);
    avisar(r.texto);
    atualizar();
    if (r.ok) aoFechar();
  };

  return (
    <Folha titulo={j.nome} aoFechar={aoFechar}>
      <div className="linha" style={{ flexWrap: "wrap", gap: 6 }}>
        <Pos pos={j.posicao} />
        <span className="pequeno">{NOMES_POSICAO[j.posicao]} · {j.idade} anos · força <b>{j.forca}</b></span>
        <Situacao j={j} />
      </div>
      <div className="opcoes">{j.caracteristicas.map((c) => <span key={c} className="chip verde">{NOMES_CARACTERISTICA[c]}</span>)}</div>
      <div className="linha pequeno" style={{ gap: 6 }}>
        {clube ? <><Escudo clube={clube} tamanho={22} /><span>{clube.nome}</span></> : <span className="chip">Sem clube</span>}
        <span className="fraco">· valor {formatarDinheiro(valorMercado(j))} · salário {formatarDinheiro(j.salario)}/mês</span>
      </div>
      {clube ? (
        <>
          {!vende && <p className="chip vermelho" style={{ whiteSpace: "normal" }}>O {clube.nome} não vende: ficaria sem opções na posição.</p>}
          <label className="coluna" style={{ gap: 6 }}>
            <span className="pequeno fraco">Sua oferta: <b className="amarelo">{formatarDinheiro(oferta)}</b> (eles pedem cerca de {formatarDinheiro(pedido)})</span>
            <input type="number" inputMode="numeric" step={50_000} min={0} value={oferta} onChange={(e) => setOferta(Math.max(0, Number(e.target.value)))} />
          </label>
          <div className="opcoes">
            {[0.8, 0.9, 1, 1.1, 1.25].map((f) => (
              <button key={f} className="opcao" onClick={() => setOferta(Math.round((pedido * f) / 10_000) * 10_000)}>{f === 1 ? "Pedido" : `${Math.round(f * 100)}%`}</button>
            ))}
          </div>
          <p className="mini muito-fraco">Seu caixa: {formatarDinheiro(meu.caixa)}. O salário dele passa a ser {formatarDinheiro(Math.max(j.salario, Math.round(salarioBase(j.forca) * 1.1)))}/mês.</p>
          <button className="botao primario cheio" disabled={!vende || oferta > meu.caixa} onClick={enviar}>
            {oferta > meu.caixa ? "Caixa insuficiente" : `Oferecer ${formatarDinheiro(oferta)}`}
          </button>
        </>
      ) : (
        <>
          <p className="pequeno fraco">Jogador livre: não há custo de transferência. Ele pede {formatarDinheiro(Math.round(salarioBase(j.forca) * 1.15))}/mês.</p>
          <button className="botao primario cheio" onClick={enviar}>Contratar</button>
        </>
      )}
    </Folha>
  );
}

export function Mercado() {
  const estado = useJogo();
  const versao = useLoja((s) => s.versao);
  const meuId = estado.tecnico.clubeId;
  const meu = estado.clubes[meuId];
  const [vista, setVista] = useState<Vista>("buscar");
  const [posicao, setPosicao] = useState<Posicao | "todas">("todas");
  const [forcaMin, setForcaMin] = useState(0);
  const [idadeMax, setIdadeMax] = useState(40);
  const [serie, setSerie] = useState<SerieId | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Jogador | null>(null);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = vista === "livres" ? livres(estado) : vista === "venda" ? elencoDe(estado, meuId).filter((j) => j.aVenda) : Object.values(estado.jogadores).filter((j) => {
      if (!j.clubeId || j.clubeId === meuId) return false;
      const c = estado.clubes[j.clubeId];
      return c.serie !== "D" && (serie === "todas" || c.serie === serie);
    });
    return base
      .filter((j) => (posicao === "todas" || j.posicao === posicao) && j.forca >= forcaMin && j.idade <= idadeMax && (!termo || j.nome.toLowerCase().includes(termo)))
      .sort((a, b) => b.forca - a.forca)
      .slice(0, 60);
  }, [estado, versao, vista, posicao, forcaMin, idadeMax, serie, busca, meuId]);

  return (
    <>
      <div className="linha entre">
        <h2>Mercado</h2>
        <span className="pequeno fraco">Caixa <b className={meu.caixa < 0 ? "vermelho" : "verde"}>{formatarDinheiro(meu.caixa)}</b></span>
      </div>
      <Segmentado opcoes={[{ valor: "buscar", rotulo: "Buscar" }, { valor: "livres", rotulo: "Livres" }, { valor: "venda", rotulo: "Meus à venda" }]} valor={vista} aoMudar={setVista} />
      {vista !== "venda" && (
        <div className="coluna">
          <input placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Opcoes opcoes={[{ valor: "todas", rotulo: "Todas" }, ...(["G", "L", "Z", "M", "A"] as Posicao[]).map((p) => ({ valor: p, rotulo: p }))]} valor={posicao} aoMudar={setPosicao} />
          <div className="linha">
            <select value={forcaMin} onChange={(e) => setForcaMin(Number(e.target.value))} aria-label="Força mínima">
              {[0, 40, 50, 60, 65, 70, 75, 80, 85].map((f) => <option key={f} value={f}>{f ? `Força ${f}+` : "Força"}</option>)}
            </select>
            <select value={idadeMax} onChange={(e) => setIdadeMax(Number(e.target.value))} aria-label="Idade máxima">
              {[40, 33, 30, 27, 24, 21].map((i) => <option key={i} value={i}>{i === 40 ? "Idade" : `Até ${i} anos`}</option>)}
            </select>
            {vista === "buscar" && (
              <select value={serie} onChange={(e) => setSerie(e.target.value as SerieId | "todas")} aria-label="Série">
                <option value="todas">Série</option>
                <option value="A">Série A</option>
                <option value="B">Série B</option>
                <option value="C">Série C</option>
              </select>
            )}
          </div>
        </div>
      )}
      {vista === "venda" && <p className="mini muito-fraco">Coloque jogadores à venda pela tela do Elenco. As propostas chegam nas mensagens e no painel do clube.</p>}
      <div className="lista">
        {resultados.length === 0 && <p className="vazio">Nenhum jogador encontrado.</p>}
        {resultados.map((j) => {
          const c = j.clubeId ? estado.clubes[j.clubeId] : undefined;
          return (
            <LinhaJogador
              key={j.id}
              j={j}
              aoTocar={() => vista !== "venda" && setAberto(j)}
              direita={
                <div className="coluna" style={{ alignItems: "flex-end", gap: 2 }}>
                  {c && vista !== "venda" ? <Escudo clube={c} tamanho={20} /> : null}
                  <span className="mini fraco num">{vista === "livres" ? `${formatarDinheiro(Math.round(salarioBase(j.forca) * 1.15))}/mês` : formatarDinheiro(vista === "venda" ? valorMercado(j) : precoPedido(estado, j))}</span>
                </div>
              }
            />
          );
        })}
      </div>
      {aberto && <FolhaOferta j={aberto} aoFechar={() => setAberto(null)} />}
    </>
  );
}
