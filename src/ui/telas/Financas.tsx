import { useState } from "react";
import { formatarData } from "../../engine/calendario";
import { PRECO_REFERENCIA } from "../../engine/constantes";
import { NOMES_LANCAMENTO, folhaSalarial, formatarDinheiro, publicoEsperado, serieDoClube } from "../../engine/financas";
import type { TipoLancamento } from "../../engine/tipos";
import {
  AMPLIACOES, CAPACIDADE_MAXIMA, CONFORTO_MAXIMO, SEMANAS_MODERNIZACAO, ampliarEstadio, custoAmpliacao, custoModernizacao,
  impactoAmpliacao, impactoModernizacao, jogosEmCasa, modernizarEstadio, nivelDoEstadio, NIVEIS_ESTADIO, semanasDeAmpliacao, type Impacto,
} from "../../engine/estadio";
import type { Clube } from "../../engine/tipos";
import { Barra, Cartao, Folha, Topo } from "../componentes";
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
        <Estadio clube={clube} />

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

/** Ilustração do estádio: 8 níveis pela capacidade (`public/estadios/estadio-N.webp`) e o selo da modernização. */
function ImagemDoEstadio({ capacidade, conforto }: { capacidade: number; conforto: number }) {
  const { nivel, nome, proximo } = nivelDoEstadio(capacidade);
  return (
    <figure className="estadio-imagem">
      <img src={`estadios/estadio-${nivel}.webp`} alt={nome} width={640} height={560} />
      {conforto > 0 && (
        <span className="selo-modernizacao" aria-label={`Modernizado: conforto ${conforto} de ${CONFORTO_MAXIMO}`}>
          Modernizado <span className="estrelas">{"★".repeat(conforto)}{"☆".repeat(CONFORTO_MAXIMO - conforto)}</span>
        </span>
      )}
      <figcaption>
        <span className="negrito">{nome}</span> · Nível {nivel} de {NIVEIS_ESTADIO.length}
        {proximo !== null && <span className="proximo mini fraco">Próximo nível com {proximo.toLocaleString("pt-BR")} lugares</span>}
      </figcaption>
    </figure>
  );
}

/**
 * O Estádio no alto de Finanças (R125): imagem, lugares, conforto e o público esperado; ampliar e modernizar ficam no
 * cartão que abre no "Melhorar" (prévia aprovada pelo usuário, nov/2026).
 */
function Estadio({ clube }: { clube: Clube }) {
  const [aberto, setAberto] = useState(false);
  const { estadio } = clube;
  const conforto = estadio.conforto ?? 0;
  const publico = Math.min(publicoEsperado(clube), estadio.capacidade);
  const ocupacao = Math.round((publico / estadio.capacidade) * 100);

  return (
    <Cartao titulo="Estádio">
      <div className="negrito">{estadio.nome}</div>
      <div className="pequeno fraco">{estadio.capacidade.toLocaleString("pt-BR")} lugares · conforto {"★".repeat(conforto)}{"☆".repeat(CONFORTO_MAXIMO - conforto)}</div>
      <ImagemDoEstadio capacidade={estadio.capacidade} conforto={conforto} />
      <p className="pequeno fraco" style={{ marginTop: 8 }}>
        Público esperado: <b className="texto">{publico.toLocaleString("pt-BR")}</b> por jogo ({ocupacao}% cheio)
      </p>
      <Barra valor={ocupacao} cor="var(--esmeralda)" />
      {estadio.obra && <ObraEmAndamento clube={clube} />}
      <div className="estadio-acao">
        <span className="negrito">Ampliar ou modernizar</span>
        <button className="botao pequeno primario" onClick={() => setAberto(true)}>Melhorar ›</button>
      </div>
      {aberto && <MelhorarEstadio clube={clube} aoFechar={() => setAberto(false)} />}
    </Cartao>
  );
}

function ObraEmAndamento({ clube }: { clube: Clube }) {
  const obra = clube.estadio.obra!;
  return (
    <p className="pequeno amarelo" style={{ marginTop: 10 }}>
      Obra em andamento: {obra.tipo === "ampliacao" ? `ampliação de ${obra.lugares?.toLocaleString("pt-BR")} lugares` : "modernização"}.
      Fica pronta em {formatarData(obra.terminaEm)}.
    </p>
  );
}

/** O cartão de baixo para cima com as obras: ampliar (mais torcida) e modernizar (mais conforto). */
function MelhorarEstadio({ clube, aoFechar }: { clube: Clube; aoFechar: () => void }) {
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
    <Folha titulo="Melhorar o estádio" aoFechar={aoFechar}>
      <p className="pequeno fraco">{estadio.nome} · Caixa: <b className="texto">{formatarDinheiro(clube.caixa)}</b> · uma obra por vez</p>
      {estadio.obra ? <ObraEmAndamento clube={clube} /> : (
        <div className="coluna" style={{ marginTop: 8, gap: 14 }}>
          <p className="mini muito-fraco">
            {lotado
              ? "Seu estádio lota com o ingresso atual: ampliar aumenta a renda."
              : "Seu estádio não lota com o ingresso atual: modernizar atrai mais torcedores; ampliar só ajuda se o público crescer."}
            {" "}Estimativa para {jogosEmCasa(clube)} jogos em casa por temporada, com o ingresso atual.
          </p>

          <div className="coluna" style={{ gap: 8 }}>
            <h3 className="titulo-secao">Ampliar (mais torcida)</h3>
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
                  <button className="botao pequeno cheio primario" disabled={!cabe || clube.caixa < custo} onClick={() => executar(`Ampliar o estádio em ${lugares.toLocaleString("pt-BR")} lugares`, custo, () => ampliarEstadio(estado, lugares))}>
                    {clube.caixa < custo ? "Caixa insuficiente" : "Ampliar"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="coluna" style={{ gap: 8 }}>
            <h3 className="titulo-secao">Modernizar (mais conforto)</h3>
            {conforto >= CONFORTO_MAXIMO ? <p className="pequeno fraco">O estádio já está no nível máximo de conforto.</p> : (() => {
              const custo = custoModernizacao(clube);
              return (
                <div className="cartao compacto">
                  <div className="linha entre">
                    <span className="negrito pequeno">Conforto nível {conforto + 1} (+10% de público)</span>
                    <span className="pequeno">{formatarDinheiro(custo)} · {SEMANAS_MODERNIZACAO} semanas</span>
                  </div>
                  <p className="mini fraco" style={{ margin: "6px 0 8px" }}><TextoImpacto i={impactoModernizacao(clube)} /></p>
                  <button className="botao pequeno cheio primario" disabled={clube.caixa < custo} onClick={() => executar("Modernizar o estádio", custo, () => modernizarEstadio(estado))}>
                    {clube.caixa < custo ? "Caixa insuficiente" : "Modernizar"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </Folha>
  );
}
