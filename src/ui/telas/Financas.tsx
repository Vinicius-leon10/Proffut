import { formatarData } from "../../engine/calendario";
import { PRECO_REFERENCIA } from "../../engine/constantes";
import { NOMES_LANCAMENTO, folhaSalarial, formatarDinheiro, publicoEsperado, serieDoClube } from "../../engine/financas";
import type { TipoLancamento } from "../../engine/tipos";
import {
  AMPLIACOES, CAPACIDADE_MAXIMA, CONFORTO_MAXIMO, SEMANAS_MODERNIZACAO, ampliarEstadio, custoAmpliacao, custoModernizacao,
  impactoAmpliacao, impactoModernizacao, jogosEmCasa, modernizarEstadio, semanasDeAmpliacao, type Impacto,
} from "../../engine/estadio";
import type { Clube } from "../../engine/tipos";
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

        <Estadio clube={clube} />

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

function TextoImpacto({ i }: { i: Impacto }) {
  if (i.rendaExtraTemporada <= 0) return <span className="muito-fraco">Não aumenta a renda hoje: o público esperado não muda.</span>;
  return (
    <span>
      Público por jogo {i.publicoAntes.toLocaleString("pt-BR")} → <b>{i.publicoDepois.toLocaleString("pt-BR")}</b>.
      Renda extra estimada: <b className="verde">{formatarDinheiro(i.rendaExtraTemporada)}</b> por temporada
      {i.manutencaoExtraMes > 0 ? ` (manutenção +${formatarDinheiro(i.manutencaoExtraMes)}/mês)` : ""}.
    </span>
  );
}

function Estadio({ clube }: { clube: Clube }) {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const { estadio } = clube;
  const conforto = estadio.conforto ?? 0;
  const lotado = publicoEsperado(clube) >= estadio.capacidade;

  const executar = (descricao: string, custo: number, acao: () => { ok: boolean; texto: string }) => {
    if (!confirm(`${descricao} por ${formatarDinheiro(custo)}?`)) return;
    const r = acao();
    avisar(r.texto);
    atualizar();
  };

  return (
    <Cartao titulo="Estádio">
      <div className="linha entre">
        <div>
          <div className="negrito">{estadio.nome}</div>
          <div className="pequeno fraco">{estadio.capacidade.toLocaleString("pt-BR")} lugares · conforto {"★".repeat(conforto)}{"☆".repeat(CONFORTO_MAXIMO - conforto)}</div>
        </div>
      </div>
      {estadio.obra ? (
        <p className="pequeno amarelo" style={{ marginTop: 10 }}>
          Obra em andamento: {estadio.obra.tipo === "ampliacao" ? `ampliação de ${estadio.obra.lugares?.toLocaleString("pt-BR")} lugares` : "modernização"}.
          Fica pronta em {formatarData(estadio.obra.terminaEm)}.
        </p>
      ) : (
        <div className="coluna" style={{ marginTop: 12, gap: 12 }}>
          <p className="mini muito-fraco">
            {lotado
              ? "Seu estádio lota com o ingresso atual: ampliar aumenta a renda."
              : "Seu estádio não lota com o ingresso atual: modernizar atrai mais torcedores; ampliar só ajuda se o público crescer."}
            {" "}Estimativa para {jogosEmCasa(clube)} jogos em casa por temporada, com o ingresso atual.
          </p>

          <div className="coluna" style={{ gap: 8 }}>
            <h3 className="pequeno fraco">Ampliar</h3>
            {AMPLIACOES.map((lugares) => {
              const custo = custoAmpliacao(clube, lugares);
              const cabe = estadio.capacidade + lugares <= CAPACIDADE_MAXIMA;
              return (
                <div key={lugares} className="cartao compacto">
                  <div className="linha entre">
                    <span className="negrito pequeno">+{lugares.toLocaleString("pt-BR")} lugares</span>
                    <span className="pequeno">{formatarDinheiro(custo)} · {semanasDeAmpliacao(lugares)} semanas</span>
                  </div>
                  <p className="mini fraco" style={{ margin: "6px 0 8px" }}>
                    {cabe ? <TextoImpacto i={impactoAmpliacao(clube, lugares)} /> : `O limite é ${CAPACIDADE_MAXIMA.toLocaleString("pt-BR")} lugares.`}
                  </p>
                  <button className="botao pequeno cheio" disabled={!cabe || clube.caixa < custo} onClick={() => executar(`Ampliar o estádio em ${lugares.toLocaleString("pt-BR")} lugares`, custo, () => ampliarEstadio(estado, lugares))}>
                    {clube.caixa < custo ? "Caixa insuficiente" : "Ampliar"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="coluna" style={{ gap: 8 }}>
            <h3 className="pequeno fraco">Modernizar</h3>
            {conforto >= CONFORTO_MAXIMO ? <p className="pequeno fraco">O estádio já está no nível máximo de conforto.</p> : (() => {
              const custo = custoModernizacao(clube);
              return (
                <div className="cartao compacto">
                  <div className="linha entre">
                    <span className="negrito pequeno">Conforto nível {conforto + 1} (+10% de público)</span>
                    <span className="pequeno">{formatarDinheiro(custo)} · {SEMANAS_MODERNIZACAO} semanas</span>
                  </div>
                  <p className="mini fraco" style={{ margin: "6px 0 8px" }}><TextoImpacto i={impactoModernizacao(clube)} /></p>
                  <button className="botao pequeno cheio" disabled={clube.caixa < custo} onClick={() => executar("Modernizar o estádio", custo, () => modernizarEstadio(estado))}>
                    {clube.caixa < custo ? "Caixa insuficiente" : "Modernizar"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Cartao>
  );
}
