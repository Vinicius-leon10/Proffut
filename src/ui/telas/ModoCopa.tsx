// Modo Copa do Mundo (nov/2026, R116–R118): a tela que fica no lugar do Painel do clube enquanto a Copa acontece, com o
// visual da Copa (azul-noite e dourado, `.modo-copa` em estilo.css). Abertura; técnico de uma seleção viva: o painel da
// Copa (próximo jogo, grupo, caminho até a final); espectador: uma fase por toque, o chaveamento e a final ao vivo só
// assistindo; no fim, o campeão e os prêmios, e "Continuar a temporada" devolve o Painel do clube.
import { useEffect, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData, janelaDaCopa } from "../../engine/calendario";
import { prepararJogos, proximoJogoDoClube } from "../../engine/jogo";
import {
  FASES_DA_COPA, avancarNaCopa, copaDoMundoDoAno, faseDaCopaJogada, finalDaCopa, jogosDaFaseDaCopa, minhaSelecaoNaCopa,
  premiosDaCopa, proximaFaseDaCopa, ultimaFaseJogada, vencedorNaCopa, type FaseDaCopa,
} from "../../engine/modoCopa";
import { NOME_FASE_SELECOES, comArtigoDaSelecao, nomeDoPais, paisDaSelecao, tabelasDeSelecoes } from "../../engine/selecoes";
import type { EstadoCompeticaoSelecoes, Partida } from "../../engine/tipos";
import { avancarJogo } from "../acoes";
import { Bandeira, Cartao, Escudo } from "../componentes";
import { rotuloPartida } from "../formatos";
import { useJogo, useLoja } from "../store";
import { CompeticaoDeSelecoes } from "./Tabelas";

/** A taça (desenhada aqui: nada copiado). */
function Taca({ tamanho = 64 }: { tamanho?: number }) {
  return (
    <svg className="taca" width={tamanho} height={tamanho * 1.3} viewBox="0 0 64 84" aria-hidden="true">
      <path d="M20 6h24l-2 20c-1 9-5 15-10 18-5-3-9-9-10-18z" fill="#e9b949" />
      <path d="M26 44h12l-2 14h-8z" fill="#c99a2e" />
      <rect x="18" y="58" width="28" height="8" rx="2" fill="#e9b949" />
      <rect x="14" y="66" width="36" height="12" rx="3" fill="#1f6b3d" />
      <path d="M20 10c-8 0-10 8-6 14M44 10c8 0 10 8 6 14" fill="none" stroke="#e9b949" strokeWidth="3" />
    </svg>
  );
}

const NOME_FASE: Record<FaseDaCopa, string> = {
  grupos: "a fase de grupos", dezesseis: "os 16 avos de final", oitavas: "as oitavas de final", quartas: "as quartas de final", semi: "as semifinais", final: "a final",
};

/** A tela da Copa: abertura, o painel do técnico ou o do espectador, e o campeão no fim. */
export function ModoCopa() {
  const estado = useJogo();
  const comp = copaDoMundoDoAno(estado)!;
  // Cada fase nova (e o campeão) começa do alto da tela: o toque foi lá embaixo, no botão.
  const etapa = `${estado.modoCopa?.abertura}-${ultimaFaseJogada(estado)}-${!!finalDaCopa(estado)?.jogada}`;
  useEffect(() => {
    document.querySelector("main.conteudo")?.scrollTo(0, 0);
  }, [etapa]);
  if (estado.modoCopa?.abertura !== estado.temporada) return <AberturaDaCopa comp={comp} />;
  if (finalDaCopa(estado)?.jogada) return <CampeaoDaCopa comp={comp} />;
  const minha = minhaSelecaoNaCopa(estado);
  return minha ? <PainelDoTecnico comp={comp} selId={minha} /> : <Espectador comp={comp} />;
}

function AberturaDaCopa({ comp }: { comp: EstadoCompeticaoSelecoes }) {
  const estado = useJogo();
  const { atualizar } = useLoja();
  const janela = janelaDaCopa(estado.temporada)!;
  const clube = estado.clubes[estado.tecnico.clubeId];
  const volta = proximoJogoDoClube(estado);
  const sedes = comp.sedes ?? [comp.sede!];
  const minha = minhaSelecaoNaCopa(estado);
  const total = estado.partidas.filter((p) => p.serie === comp.id).length + (comp.fase === "grupos" ? 31 : 0);
  const entrar = () => {
    estado.modoCopa = { ...estado.modoCopa, abertura: estado.temporada };
    atualizar();
  };
  return (
    <div className="copa-abertura">
      <Taca />
      <div>
        <h1 className="copa-titulo">Copa do Mundo {comp.ano}</h1>
        <p className="mini copa-fraco">{sedes.map((id) => <span key={id}><Bandeira pais={paisDaSelecao(id)} altura={12} /> {nomeDoPais(paisDaSelecao(id))} · </span>)}{comp.selecoes.length} seleções</p>
      </div>
      <div className="copa-contagem">
        <div><b>{formatarData(janela.de).slice(5)}</b><span className="mini">abertura</span></div>
        <div><b>{total}</b><span className="mini">jogos</span></div>
        <div><b>{formatarData(janela.ate).slice(5)}</b><span className="mini">final</span></div>
      </div>
      <p className="copa-aviso">
        {comArtigo("O", clube)} para durante a Copa{volta ? ` e volta a jogar em ${formatarData(volta.data)}` : ""}.
        {minha ? ` Você dirige ${comArtigoDaSelecao("o", minha, estado)} na Copa.` : " Você vai acompanhar a Copa fase por fase."}
      </p>
      <button className="botao primario grande cheio" onClick={entrar}>Entrar na Copa</button>
    </div>
  );
}

/** "Brasil 2 x 1 França" ou "Brasil x França" (antes do jogo). */
function Jogo({ p }: { p: Partida }) {
  const estado = useJogo();
  const [m, v] = [estado.clubes[p.mandante], estado.clubes[p.visitante]];
  return (
    <div className="copa-jogo">
      <span className="corta"><Escudo clube={m} tamanho={20} /> {m.nome}</span>
      <b className="copa-placar">{p.jogada ? `${p.gm} × ${p.gv}${p.penaltis ? ` (${p.penaltis[0]}–${p.penaltis[1]})` : ""}` : "×"}</b>
      <span className="corta direita">{v.nome} <Escudo clube={v} tamanho={20} /></span>
    </div>
  );
}

function PainelDoTecnico({ comp, selId }: { comp: EstadoCompeticaoSelecoes; selId: string }) {
  const estado = useJogo();
  const { abrir } = useLoja();
  const [verTudo, setVerTudo] = useState(false);
  const selecao = estado.clubes[selId];
  const proximo = estado.partidas.find((p) => p.serie === comp.id && !p.jogada && (p.mandante === selId || p.visitante === selId));
  const grupo = tabelasDeSelecoes(estado, comp.id, "grupos").find((t) => t.some((l) => l.clubeId === selId));
  const hoje = proximo?.data === estado.data;
  return (
    <>
      <Cartao titulo={hoje ? "Jogo de hoje" : "Próximo jogo"}>
        {proximo ? (
          <div className="coluna" style={{ gap: 8 }}>
            <div className="pequeno copa-fraco">{rotuloPartida(proximo)} · {formatarData(proximo.data)}</div>
            <Jogo p={proximo} />
          </div>
        ) : <p className="pequeno copa-fraco">{selecao.nome} espera o adversário da próxima fase.</p>}
      </Cartao>
      <button className="botao primario grande cheio" onClick={avancarJogo}>{hoje ? "Ir para o jogo" : "Avançar"}</button>
      {grupo && (
        <Cartao titulo="O grupo">
          <table className="tabela">
            <thead><tr><th>Seleção</th><th>J</th><th>SG</th><th>Pts</th></tr></thead>
            <tbody>
              {grupo.map((l) => (
                <tr key={l.clubeId} className={l.clubeId === selId ? "meu" : ""}>
                  <td className="corta">{estado.clubes[l.clubeId].nome}</td><td>{l.j}</td><td>{l.sg}</td><td>{l.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mini copa-fraco">Os 2 primeiros e os 8 melhores terceiros vão aos 16 avos de final.</p>
        </Cartao>
      )}
      <div className="linha" style={{ gap: 8 }}>
        <button className="botao cresce" onClick={() => abrir({ tipo: "convocacao" })}>Convocação</button>
        <button className="botao cresce" onClick={() => setVerTudo((x) => !x)}>{verTudo ? "Esconder a Copa" : "Grupos e chaveamento"}</button>
      </div>
      {verTudo && <CompeticaoDeSelecoes c={comp} />}
    </>
  );
}

/** O chaveamento das quartas à final (como no exemplo aprovado), com o vencedor de cada jogo em destaque. */
function Chaveamento() {
  const estado = useJogo();
  const coluna = (fase: string) => jogosDaFaseDaCopa(estado, fase).sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0));
  const sigla = (id: string) => <><Escudo clube={estado.clubes[id]} tamanho={16} /> {estado.clubes[id].sigla}</>;
  const linha = (p: Partida, lado: "mandante" | "visitante") => {
    const id = p[lado];
    const gols = lado === "mandante" ? p.gm : p.gv;
    const pen = p.penaltis ? ` (${lado === "mandante" ? p.penaltis[0] : p.penaltis[1]})` : "";
    return <div className={p.jogada && vencedorNaCopa(p) === id ? "ganhou" : ""}><span>{sigla(id)}</span><span>{p.jogada ? `${gols}${pen}` : ""}</span></div>;
  };
  const fases = ["quartas", "semi", "final"].filter((f) => coluna(f).length);
  if (!fases.length) return null;
  return (
    <Cartao titulo="Chaveamento">
      <div className="copa-chave" aria-label="Chaveamento">
        {fases.map((f) => (
          <div key={f} className={`copa-coluna ${f}`}>
            <span className="mini copa-fraco centro">{NOME_FASE_SELECOES[f]}</span>
            {coluna(f).map((p) => <div key={p.id} className={`copa-confronto${f === "final" ? " final" : ""}`}>{linha(p, "mandante")}{linha(p, "visitante")}</div>)}
          </div>
        ))}
      </div>
    </Cartao>
  );
}

function Espectador({ comp }: { comp: EstadoCompeticaoSelecoes }) {
  const estado = useJogo();
  const { atualizar, abrir } = useLoja();
  const vista = ultimaFaseJogada(estado);
  const proxima = proximaFaseDaCopa(estado);
  const verProxima = (ate: FaseDaCopa) => {
    avancarNaCopa(estado, ate);
    atualizar();
  };
  const assistirFinal = () => {
    avancarNaCopa(estado, "antes-da-final");
    const final = finalDaCopa(estado)!;
    estado.modoCopa = { ...estado.modoCopa, assistir: final.id };
    const vivas = prepararJogos(estado);
    atualizar();
    abrir({ tipo: "ao-vivo", vivas });
  };
  const jogosVistos = vista ? jogosDaFaseDaCopa(estado, vista) : [];
  // Destaque da fase: a maior zebra (o mais fraco no ranking do começo que ganhou do mais forte).
  const pos = (id: string) => comp.selecoes.indexOf(id);
  const zebra = jogosVistos.filter((p) => p.gm !== p.gv || p.penaltis).map((p) => ({ p, v: vencedorNaCopa(p) }))
    .map(({ p, v }) => ({ p, ganho: pos(v) - pos(v === p.mandante ? p.visitante : p.mandante) })).filter((x) => x.ganho > 8)
    .sort((a, b) => b.ganho - a.ganho)[0];
  return (
    <>
      <Cartao titulo={vista ? `Copa do Mundo ${comp.ano}: ${NOME_FASE_SELECOES[vista]}` : `Copa do Mundo ${comp.ano}`}>
        {!vista && <p className="pequeno">A Copa começa hoje. Cada toque mostra uma fase inteira, até o campeão.</p>}
        {zebra && (
          <div className="coluna" style={{ gap: 4 }}>
            <span className="copa-selo">Zebra da fase</span>
            <Jogo p={zebra.p} />
          </div>
        )}
        {vista && vista !== "grupos" && <div className="coluna" style={{ gap: 2 }}>{jogosVistos.sort((a, b) => (a.chave ?? 0) - (b.chave ?? 0)).map((p) => <Jogo key={p.id} p={p} />)}</div>}
      </Cartao>
      {proxima === "final" ? (
        <>
          <button className="botao primario grande cheio" onClick={assistirFinal}>Assistir à final ao vivo</button>
          <button className="botao cheio" onClick={() => verProxima("final")}>Ver o resultado da final</button>
        </>
      ) : proxima ? (
        <>
          <button className="botao primario grande cheio" onClick={() => verProxima(proxima)}>Ver {NOME_FASE[proxima]}</button>
          <button className="botao cheio" onClick={() => verProxima("final")}>Pular para o campeão</button>
        </>
      ) : null}
      <Chaveamento />
      <CompeticaoDeSelecoes key={vista ?? "inicio"} c={comp} />
    </>
  );
}

function CampeaoDaCopa({ comp }: { comp: EstadoCompeticaoSelecoes }) {
  const estado = useJogo();
  const { atualizar } = useLoja();
  const premios = premiosDaCopa(estado)!;
  const nome = (id: string) => estado.clubes[id].nome;
  const campeao = estado.clubes[premios.campeao];
  const f = premios.final;
  const continuar = () => {
    estado.modoCopa = { ...estado.modoCopa, fim: estado.temporada };
    delete estado.modoCopa.assistir;
    atualizar();
  };
  const minha = estado.tecnico.selecao && comp.selecoes.includes(estado.tecnico.selecao) ? estado.tecnico.selecao : undefined;
  const ondeParou = (sel: string) => {
    if (sel === premios.campeao) return "campeão";
    const fase = [...FASES_DA_COPA].reverse().find((x) => faseDaCopaJogada(estado, x) && jogosDaFaseDaCopa(estado, x).some((p) => p.mandante === sel || p.visitante === sel));
    return fase === "final" ? "vice" : fase ? `parou ${fase === "grupos" ? "na fase de grupos" : `nas ${NOME_FASE_SELECOES[fase].toLowerCase()}`.replace("nas semifinal", "na semifinal")}` : "";
  };
  return (
    <>
      <div className="copa-campeao">
        <Taca tamanho={72} />
        <span className="mini copa-fraco">Campeã da Copa do Mundo {comp.ano}</span>
        <h1 className="copa-titulo"><Escudo clube={campeao} tamanho={40} /> {campeao.nome}</h1>
        <span className="mini copa-fraco">Final em {formatarData(f.data)} · {nome(f.mandante)} {f.gm} × {f.gv} {nome(f.visitante)}{f.penaltis ? ` (pênaltis ${f.penaltis[0]} a ${f.penaltis[1]})` : ""}</span>
      </div>
      <Cartao titulo="Prêmios">
        <dl className="copa-premios">
          {premios.artilheiro && <><dt>Artilheiro</dt><dd>{premios.artilheiro.jogador.nome} · {premios.artilheiro.gols} {premios.artilheiro.gols === 1 ? "gol" : "gols"}</dd></>}
          {premios.melhor && <><dt>Melhor jogador</dt><dd>{premios.melhor.nome}</dd></>}
          {premios.goleiro && <><dt>Melhor goleiro</dt><dd>{premios.goleiro.nome}</dd></>}
          {premios.zebra && <><dt>Zebra da Copa</dt><dd>{nome(premios.zebra.selecao)} ({premios.zebra.fase})</dd></>}
          {minha && <><dt>{nome(minha)}</dt><dd>{ondeParou(minha)}</dd></>}
        </dl>
      </Cartao>
      <button className="botao primario grande cheio" onClick={continuar}>Continuar a temporada</button>
      <Chaveamento />
    </>
  );
}
