import { formatarData } from "../../engine/calendario";
import { PRECO_REFERENCIA } from "../../engine/constantes";
import { NOMES_LANCAMENTO, folhaSalarial, formatarDinheiro, publicoEsperado, serieDoClube } from "../../engine/financas";
import type { TipoLancamento } from "../../engine/tipos";
import { Cartao, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

export function Financas() {
  const estado = useJogo();
  const { fechar, atualizar } = useLoja();
  const clube = estado.clubes[estado.tecnico.clubeId];
  const resumo = Object.entries(clube.resumoFinanceiro) as [TipoLancamento, number][];
  const receitas = resumo.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const despesas = resumo.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const saldo = resumo.reduce((s, [, v]) => s + v, 0);
  const publico = publicoEsperado(clube);
  const referencia = PRECO_REFERENCIA[serieDoClube(clube)];

  return (
    <div className="tela-cheia">
      <Topo titulo="Finanças" sub={clube.nome} aoVoltar={fechar} />
      <div className="conteudo">
        <Cartao>
          <div className="linha entre">
            <div><div className="mini fraco">Caixa</div><div className={`negrito num ${clube.caixa < 0 ? "vermelho" : ""}`} style={{ fontSize: "1.5rem" }}>{formatarDinheiro(clube.caixa)}</div></div>
            <div style={{ textAlign: "right" }}><div className="mini fraco">Folha mensal</div><div className="negrito num">{formatarDinheiro(folhaSalarial(estado, clube.id))}</div></div>
          </div>
          {clube.caixa < 0 && <p className="pequeno vermelho" style={{ marginTop: 8 }}>Caixa negativo: venda jogadores ou reduza a folha. A diretoria está de olho.</p>}
        </Cartao>

        <Cartao titulo="Ingresso">
          <div className="linha entre">
            <span className="negrito num" style={{ fontSize: "1.3rem" }}>R$ {clube.precoIngresso}</span>
            <span className="pequeno fraco">referência da série: R$ {referencia}</span>
          </div>
          <input
            type="range" min={5} max={200} step={5} value={clube.precoIngresso}
            onChange={(e) => { clube.precoIngresso = Number(e.target.value); atualizar(); }}
            style={{ padding: 0, minHeight: 36, accentColor: "var(--amarelo)" }}
            aria-label="Preço do ingresso"
          />
          <p className="pequeno fraco">
            Público esperado: <b>{publico.toLocaleString("pt-BR")}</b> de {clube.estadio.capacidade.toLocaleString("pt-BR")} lugares
            ({clube.estadio.nome}). Renda por jogo: <b>{formatarDinheiro(publico * clube.precoIngresso)}</b>.
          </p>
          <p className="mini muito-fraco">Ingresso caro afasta torcedor; barato demais deixa dinheiro na mesa. Clássicos e boa fase enchem o estádio.</p>
        </Cartao>

        <Cartao titulo={`Temporada ${estado.temporada}`}>
          {resumo.length === 0 ? <p className="pequeno fraco">Ainda sem movimentação.</p> : (
            <div className="coluna" style={{ gap: 6 }}>
              {[...receitas, ...despesas].map(([tipo, v]) => (
                <div key={tipo} className="linha entre pequeno">
                  <span>{NOMES_LANCAMENTO[tipo]}</span>
                  <span className={`num ${v < 0 ? "vermelho" : "verde"}`}>{formatarDinheiro(v)}</span>
                </div>
              ))}
              <div className="linha entre pequeno negrito" style={{ borderTop: "1px solid var(--borda)", paddingTop: 6 }}>
                <span>Saldo da temporada</span>
                <span className={`num ${saldo < 0 ? "vermelho" : "verde"}`}>{formatarDinheiro(saldo)}</span>
              </div>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Extrato">
          <div className="lista">
            {clube.extrato.slice(0, 40).map((l, i) => (
              <div key={i} className="item" style={{ minHeight: 44 }}>
                <div className="cresce">
                  <div className="pequeno corta">{l.descricao}</div>
                  <div className="mini muito-fraco">{formatarData(l.data)}</div>
                </div>
                <span className={`num pequeno ${l.valor < 0 ? "vermelho" : "verde"}`}>{formatarDinheiro(l.valor)}</span>
              </div>
            ))}
            {clube.extrato.length === 0 && <p className="vazio">Sem lançamentos ainda.</p>}
          </div>
        </Cartao>
      </div>
    </div>
  );
}
