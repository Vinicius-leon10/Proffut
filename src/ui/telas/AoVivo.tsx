import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { comArtigo } from "../../engine/artigos";
import { MAX_SUBSTITUICOES, ESTILOS } from "../../engine/constantes";
import { FORMACOES, corForca, forcaEfetiva } from "../../engine/forca";
import { desfechoDoConfronto } from "../../engine/copa";
import { concluirJogos } from "../../engine/jogo";
import { elencoDe } from "../../engine/mercado";
import {
  avancarMinuto, cartoes, formatarMinuto, montarLado, mudarTatica, posseDeBola, pressaoRecente, simularAteOFim, sobPressao, substituir,
  type EstatisticasLado, type LadoVivo, type PartidaViva,
} from "../../engine/partida";
import type { Clube, Competicao, Estilo, EventoPartida, Formacao, Partida } from "../../engine/tipos";
import { NOME_COMPETICAO } from "../../engine/competicoes";
import { formatarNota, melhorEmCampo, notasDaPartida, type NotaDoJogador } from "../../engine/notas";
import { Barra, Escudo, Folha, Icone, Opcoes, Pos, Segmentado } from "../componentes";
import { rotuloPartida } from "../formatos";
import { apito, liberarSom, pararSons, tocarLances } from "../sons";
import { useJogo, useLoja } from "../store";
import { CampoDaEscalacao, FolhaDoTime, forcaMediaDoTime, mudarTaticaDoClube } from "./Tatica";

const INTERVALO_MS: Record<1 | 2, number> = { 1: 700, 2: 340 };
/** Pausa depois de um pênalti marcado, antes da cobrança (o narrador grita e a torcida reage). */
const SUSPENSE_PENALTI_MS = 2500;

function classeLance(e: EventoPartida): string {
  if (e.tipo === "gol" || e.tipo === "gol-penalti") return "lance gol";
  if (e.tipo === "vermelho") return "lance cartao-vermelho";
  if (e.tipo === "intervalo" || e.tipo === "fim" || e.tipo === "lesao" || e.tipo === "penalti") return "lance destaque";
  return "lance";
}

function prefixo(e: EventoPartida): string {
  switch (e.tipo) {
    case "gol": case "gol-penalti": return "⚽ ";
    case "amarelo": return "🟨 ";
    case "vermelho": return "🟥 ";
    case "lesao": return "🩹 ";
    case "substituicao": return "🔁 ";
    case "penalti": return "❗ ";
    default: return "";
  }
}

function relogio(pv: PartidaViva): string {
  if (pv.terminada) return "Fim";
  if (pv.intervalo) return "Intervalo";
  if (pv.minuto === 0) return "0'";
  return `${formatarMinuto(pv)}'`;
}

export function AoVivo({ vivas }: { vivas: PartidaViva[] }) {
  const estado = useJogo();
  const { fechar, atualizar, avisar } = useLoja();
  const meuId = estado.tecnico.clubeId;
  const meu = vivas.find((v) => v.lados.some((l) => l.clubeId === meuId))!;
  const meuLado: 0 | 1 = meu.lados[0].clubeId === meuId ? 0 : 1;
  const partida = estado.partidas.find((p) => p.id === meu.partidaId)!;

  const [iniciado, setIniciado] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [velocidade, setVelocidade] = useState<1 | 2>(estado.config.velocidade === 1 ? 1 : 2);
  const [aba, setAba] = useState<"lances" | "estatisticas" | "notas" | "rodada">("lances");
  const [painel, setPainel] = useState<"trocas" | "tatica" | "adversario" | null>(null);
  const [, setTick] = useState(0);
  const avisosVistos = useRef(0);
  const concluido = useRef(false);
  const somLigado = estado.config.som !== false;
  const som = useRef(somLigado);
  som.current = somLigado;
  const lancesOuvidos = useRef(0);
  const suspense = useRef(0);

  const todasTerminadas = vivas.every((v) => v.terminada);

  useEffect(() => () => pararSons(), []);

  const passo = useCallback(() => {
    if (Date.now() < suspense.current) return;
    for (const pv of vivas) if (!pv.terminada) avancarMinuto(pv, estado.jogadores);
    const novos = meu.narracao.slice(lancesOuvidos.current);
    lancesOuvidos.current = meu.narracao.length;
    if (novos.some((e) => e.tipo === "penalti")) suspense.current = Date.now() + SUSPENSE_PENALTI_MS;
    if (som.current) tocarLances(novos, meuLado);
    if (meu.avisos.length > avisosVistos.current) {
      avisar(meu.avisos[meu.avisos.length - 1]);
      avisosVistos.current = meu.avisos.length;
    }
    if (meu.intervalo) setPausado(true);
    setTick((t) => t + 1);
  }, [vivas, estado.jogadores, meu, meuLado, avisar]);

  useEffect(() => {
    if (!iniciado || pausado || painel || todasTerminadas) return;
    const t = setInterval(passo, INTERVALO_MS[velocidade]);
    return () => clearInterval(t);
  }, [iniciado, pausado, painel, todasTerminadas, velocidade, passo]);

  const comecar = () => {
    if (som.current) {
      liberarSom();
      apito("inicio");
    }
    setIniciado(true);
  };

  const pausarOuSeguir = () => {
    // Cada toque libera o som de novo (o iPhone pode travá-lo quando o app vai para o fundo).
    if (som.current) liberarSom();
    // Volta do intervalo: o árbitro apita o começo do segundo tempo.
    if (pausado && meu.intervalo && som.current) apito("inicio");
    setPausado(!pausado);
  };

  const alternarSom = () => {
    estado.config.som = !somLigado;
    if (somLigado) pararSons();
    else liberarSom();
    atualizar();
  };

  const irAoFim = () => {
    for (const pv of vivas) simularAteOFim(pv, estado.jogadores);
    // Os lances pulados não tocam; só o apito final.
    lancesOuvidos.current = meu.narracao.length;
    if (som.current) apito("fim");
    setIniciado(true);
    setTick((t) => t + 1);
  };

  const continuar = () => {
    if (concluido.current) return;
    concluido.current = true;
    estado.config.velocidade = velocidade;
    concluirJogos(estado, vivas);
    atualizar();
    const p = estado.partidas.find((x) => x.id === meu.partidaId)!;
    const pro = meuLado === 0 ? p.gm : p.gv;
    const contra = meuLado === 0 ? p.gv : p.gm;
    const placar = pro > contra ? `Vitória por ${pro} x ${contra}!` : pro === contra ? `Empate em ${pro} x ${contra}.` : `Derrota por ${contra} x ${pro}.`;
    avisar([placar, desfechoDoConfronto(estado, p, meuId)].filter(Boolean).join(" "));
    fechar();
  };

  const [lm, lv] = meu.lados;
  const clubeM = estado.clubes[lm.clubeId];
  const clubeV = estado.clubes[lv.clubeId];
  const progresso = meu.terminada ? 100 : Math.min(100, ((meu.tempo === 2 ? 45 : 0) + Math.min(45, meu.tempo === 2 ? meu.minuto - 45 : meu.minuto)) / 90 * 100);
  const lances = useMemo(() => [...meu.narracao].reverse(), [meu.narracao, meu.narracao.length]);
  const adversario = meuLado === 0 ? clubeV : clubeM;
  // O adversário dominando os últimos 15 minutos: avisa e convida a mexer no time (no intervalo já há o convite).
  const pressao = meu.estatisticas && !meu.terminada && !meu.intervalo ? sobPressao(meu.estatisticas, meuLado) : null;
  // O escudo do adversário abre o time titular dele no campinho.
  const escudoNoPlacar = (lado: 0 | 1, clube: Clube) =>
    lado === meuLado ? <Escudo clube={clube} tamanho={48} /> : (
      <button className="escudo-botao" onClick={() => setPainel("adversario")} aria-label={`Ver o time titular ${comArtigo("do", clube)}`}>
        <Escudo clube={clube} tamanho={48} />
      </button>
    );

  return (
    <div className="tela-cheia">
      <div className="placar">
        <div className="mini fraco centro" style={{ marginBottom: 6 }}>{rotuloPartida(partida)}</div>
        <div className="times">
          <div className="time"><MediaDoTime lado={lm} />{escudoNoPlacar(0, clubeM)}<span className="corta" style={{ maxWidth: "100%" }}>{clubeM.nome}</span></div>
          <div className="centro">
            <div className="gols">{lm.gols} <span className="muito-fraco">x</span> {lv.gols}</div>
            <div className="relogio">{relogio(meu)}</div>
          </div>
          <div className="time"><MediaDoTime lado={lv} />{escudoNoPlacar(1, clubeV)}<span className="corta" style={{ maxWidth: "100%" }}>{clubeV.nome}</span></div>
        </div>
        <div style={{ marginTop: 10 }}><Barra valor={progresso} cor="var(--dourado)" /></div>
      </div>

      {!iniciado ? (
        <PreJogo vivas={vivas} meu={meu} meuLado={meuLado} aoComecar={comecar} aoVoltar={fechar} />
      ) : (
        <>
          <div className="linha" style={{ padding: "10px 16px", gap: 8, borderBottom: "1px solid var(--borda)" }}>
            {!todasTerminadas && (
              <button className="icone-botao" style={{ background: "var(--cartao-2)", color: "var(--texto)" }} onClick={pausarOuSeguir} aria-label={pausado ? "Continuar" : "Pausar"}>
                <Icone nome={pausado ? "play" : "pausa"} />
              </button>
            )}
            <button className="icone-botao" style={{ background: "var(--cartao-2)", color: somLigado ? "var(--texto)" : "var(--texto-3)" }} onClick={alternarSom} aria-label={somLigado ? "Desligar o som" : "Ligar o som"}>
              <Icone nome={somLigado ? "som" : "mudo"} />
            </button>
            {!todasTerminadas && (
              <div className="cresce">
                <Segmentado opcoes={[{ valor: "1", rotulo: "1x" }, { valor: "2", rotulo: "2x" }]} valor={String(velocidade) as "1" | "2"} aoMudar={(v) => setVelocidade(Number(v) as 1 | 2)} />
              </div>
            )}
            {!todasTerminadas && <button className="botao pequeno" onClick={irAoFim}>Fim ⏭</button>}
            {todasTerminadas && <button className="botao primario cheio" onClick={continuar}>Continuar</button>}
          </div>
          {!meu.terminada && (
            <div className="linha" style={{ padding: "8px 16px", gap: 8 }}>
              <button className="botao pequeno cresce" onClick={() => setPainel("trocas")}>
                <Icone nome="troca" /> Substituir ({meu.lados[meuLado].substituicoes}/{MAX_SUBSTITUICOES})
              </button>
              <button className="botao pequeno cresce" onClick={() => setPainel("tatica")}>Tática</button>
            </div>
          )}
          {pressao && (
            <div className="cartao compacto aviso-pressao" role="status" style={{ margin: "0 16px" }}>
              <p className="pequeno">
                <b>{comArtigo("O", adversario)} está pressionando.</b> {pressao.deles} ataques perigosos contra {pressao.nossos} nos
                últimos 15 minutos. Mude a tática ou faça uma substituição.
              </p>
            </div>
          )}
          {meu.intervalo && pausado && (
            <div className="cartao compacto" style={{ margin: "0 16px" }}>
              <p className="pequeno"><b>Intervalo.</b> Faça substituições ou mude a tática, e toque em ▶ para o segundo tempo.</p>
            </div>
          )}
          <div style={{ padding: "8px 16px 0" }}>
            <Segmentado
              // As notas só no fim da partida (R45).
              opcoes={[
                { valor: "lances", rotulo: "Lances" }, { valor: "estatisticas", rotulo: "Estatísticas" },
                ...(meu.terminada ? [{ valor: "notas" as const, rotulo: "Notas" }] : []), { valor: "rodada", rotulo: "Rodada" },
              ]}
              valor={aba}
              aoMudar={setAba}
            />
          </div>
          <div className="conteudo" style={{ paddingTop: 8 }}>
            {aba === "lances" ? (
              lances.length ? lances.map((e, i) => (
                <div key={lances.length - i} className={classeLance(e)}>
                  <span className="min">{e.tipo === "intervalo" || e.tipo === "fim" ? "" : `${e.min}'`}</span>
                  {e.tipo !== "intervalo" && e.tipo !== "fim" && (
                    <span className="escudo-lance"><Escudo clube={e.lado === 0 ? clubeM : clubeV} tamanho={18} /></span>
                  )}
                  <span>{prefixo(e)}{e.texto}</span>
                </div>
              )) : <p className="vazio">A bola vai rolar...</p>
            ) : aba === "estatisticas" ? (
              <EstatisticasDaPartida pv={meu} meuLado={meuLado} />
            ) : aba === "notas" ? (
              <NotasDaPartida pv={meu} meuLado={meuLado} />
            ) : (
              <OutrosJogos vivas={vivas} meuId={meuId} />
            )}
          </div>
        </>
      )}

      {painel === "trocas" && <PainelTrocas pv={meu} lado={meuLado} aoFechar={() => setPainel(null)} />}
      {painel === "tatica" && <PainelTatica pv={meu} lado={meuLado} aoFechar={() => setPainel(null)} />}
      {painel === "adversario" && <FolhaDoTime lado={meu.lados[meuLado === 0 ? 1 : 0]} aoFechar={() => setPainel(null)} />}
    </div>
  );
}

/** A força média de um time, em cima dele no placar (R46). */
function MediaDoTime({ lado }: { lado: LadoVivo }) {
  const estado = useJogo();
  return <span className="forca-media">força média <b>{forcaMediaDoTime(estado, lado)}</b></span>;
}

function PreJogo({ vivas, meu, meuLado, aoComecar, aoVoltar }: { vivas: PartidaViva[]; meu: PartidaViva; meuLado: 0 | 1; aoComecar: () => void; aoVoltar: () => void }) {
  const estado = useJogo();
  const { atualizar } = useLoja();
  const [tatica, setTatica] = useState(false);
  const eu = meu.lados[meuLado];
  const clube = estado.clubes[eu.clubeId];
  // O campinho mostra quem vai jogar (o lado da partida, já sem lesionados e suspensos), vaga por vaga.
  const titulares = FORMACOES[clube.tatica.formacao].map((v) => eu.emCampo.find((a) => a.vaga === v)?.jogadorId ?? null);
  // Mexer no campinho muda a escalação do clube e monta de novo o time desta partida (ainda no minuto 0).
  const mudarEscalacao = (novos: (number | null)[], reservas: number[]) => {
    clube.escalacao = { titulares: novos, reservas };
    meu.lados[meuLado] = montarLado(clube, estado.jogadores, elencoDe(estado, clube.id), true);
    atualizar();
  };
  return (
    <div className="conteudo">
      {/* Só a tática no alto (R50); a força média de cada time fica no placar (R46). */}
      <button className="botao cheio" onClick={() => setTatica(true)}>Mudar a tática</button>
      {tatica && <PainelTatica pv={meu} lado={meuLado} antesDoJogo aoFechar={() => setTatica(false)} />}
      <CampoDaEscalacao clube={clube} titulares={titulares} reservas={clube.escalacao.reservas} aoMudar={mudarEscalacao} />
      <p className="mini muito-fraco">Hoje: {vivas.length} jogos. Os outros placares aparecem na aba Rodada durante o jogo.</p>
      <button className="botao primario grande cheio" onClick={aoComecar}>Começar o jogo</button>
      <button className="botao cheio" onClick={aoVoltar}>Voltar ao clube</button>
    </div>
  );
}

/**
 * Estatísticas da partida, como nos aplicativos de futebol: cada número do lado do seu time (mandante à
 * esquerda, como no placar), o meu time em verde e o adversário em azul.
 */
function EstatisticasDaPartida({ pv, meuLado }: { pv: PartidaViva; meuLado: 0 | 1 }) {
  const estado = useJogo();
  const e = pv.estatisticas;
  if (!e) return <p className="vazio">Esta partida não tem estatísticas.</p>;
  const [m, v] = e.lados;
  const par = (f: (l: EstatisticasLado) => number): [number, number] => [f(m), f(v)];
  const [cm, cv] = [cartoes(pv.lados[0]), cartoes(pv.lados[1])];
  const cores = meuLado === 0 ? ["var(--esmeralda)", "var(--azul)"] : ["var(--azul)", "var(--esmeralda)"];
  return (
    <div className="cartao estatisticas" style={{ "--cor-m": cores[0], "--cor-v": cores[1] } as CSSProperties}>
      <div className="estat-times">
        {pv.lados.map((l) => (
          <span key={l.clubeId}>
            <Escudo clube={estado.clubes[l.clubeId]} tamanho={20} />
            <span className="corta">{estado.clubes[l.clubeId].nome}</span>
          </span>
        ))}
      </div>
      <div className="roscas">
        <Rosca nome="Ataques" valores={par((l) => l.ataques)} />
        <Rosca nome="Ataques perigosos" valores={par((l) => l.ataquesPerigosos)} />
        <Rosca nome="Posse de bola" valores={posseDeBola(e)} sufixo="%" />
      </div>
      <div className="contagens">
        <Contagem nome="Escanteios" valores={par((l) => l.escanteios)}>
          <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
            <path d="M2.5 1.5v15" stroke="var(--texto-2)" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M3.3 1.8 12.5 4.9 3.3 8Z" fill="var(--vermelho)" />
          </svg>
        </Contagem>
        <Contagem nome="Cartões amarelos" valores={[cm.amarelos, cv.amarelos]}><span className="cartao-juiz amarelo" /></Contagem>
        <Contagem nome="Cartões vermelhos" valores={[cm.vermelhos, cv.vermelhos]}><span className="cartao-juiz vermelho" /></Contagem>
      </div>
      <Comparacao nome="Chutes no gol" valores={par((l) => l.chutesNoGol)} />
      <Comparacao nome="Chutes para fora ou bloqueados" valores={par((l) => l.chutesFora)} />
      <Comparacao nome="Pressão nos últimos 15 minutos" valores={pressaoRecente(e)}
        nota="Ataques perigosos de cada time nos últimos 15 minutos: quem está mandando no jogo agora." />
    </div>
  );
}

/** Classe da bolinha da nota: ótima, boa, regular ou ruim. */
function faixaDaNota(nota: number): string {
  return nota >= 7.5 ? "otima" : nota >= 7 ? "boa" : nota >= 6 ? "regular" : "ruim";
}

/** Notas dos jogadores no fim da partida: o melhor em campo e a nota de cada um que entrou, por time. */
function NotasDaPartida({ pv, meuLado }: { pv: PartidaViva; meuLado: 0 | 1 }) {
  const estado = useJogo();
  const notas = notasDaPartida(pv, estado.jogadores, estado.semente);
  const melhor = melhorEmCampo(notas);
  const linha = (n: NotaDoJogador) => {
    const j = estado.jogadores[n.jogadorId];
    return (
      <div key={n.jogadorId} className="item">
        <Pos pos={j.posicao} />
        <span className="nome cresce corta pequeno negrito">{j.nome}</span>
        {n.jogadorId === melhor?.jogadorId && <span className="estrela" aria-label="Melhor em campo">★</span>}
        <span className="minutos mini fraco">{n.minutos}'</span>
        <span className={`nota ${faixaDaNota(n.nota)}`}>{formatarNota(n.nota)}</span>
      </div>
    );
  };
  return (
    <div className="notas coluna" style={{ gap: 12 }}>
      {melhor && (
        <div className="cartao compacto melhor-em-campo">
          <div className="mini fraco">Melhor em campo</div>
          <div className="linha">
            <Escudo clube={estado.clubes[pv.lados[melhor.lado].clubeId]} tamanho={28} />
            <span className="nome cresce negrito">{estado.jogadores[melhor.jogadorId].nome}</span>
            <span className={`nota ${faixaDaNota(melhor.nota)}`}>{formatarNota(melhor.nota)}</span>
          </div>
        </div>
      )}
      {[meuLado, meuLado === 0 ? 1 : 0].map((i) => (
        <div key={i} className="time">
          <h3 className="pequeno fraco linha" style={{ gap: 6, margin: "4px 0" }}>
            <Escudo clube={estado.clubes[pv.lados[i].clubeId]} tamanho={18} />{estado.clubes[pv.lados[i].clubeId].nome}
          </h3>
          <div className="lista">{notas.filter((n) => n.lado === i).map(linha)}</div>
        </div>
      ))}
      <p className="mini muito-fraco">A nota sai dos lances de cada um (gols, passes, chutes, defesas, cartões), do resultado e de como ele está jogando. Quem joga pouco fica perto de 6.</p>
    </div>
  );
}

/** Anel dividido entre os dois times, com o número de cada um do seu lado. */
function Rosca({ nome, valores: [a, b], sufixo = "" }: { nome: string; valores: [number, number]; sufixo?: string }) {
  const raio = 21;
  const volta = 2 * Math.PI * raio;
  const total = a + b;
  return (
    <div className="rosca" role="group" aria-label={nome}>
      <div className="mini fraco rotulo">{nome}</div>
      <div className="linha">
        <span className="numero">{a}{sufixo && <small>{sufixo}</small>}</span>
        <svg width="46" height="46" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r={raio} fill="none" strokeWidth="7" stroke={total ? "var(--cor-m)" : "var(--cartao-2)"} />
          {b > 0 && (
            <circle cx="26" cy="26" r={raio} fill="none" strokeWidth="7" stroke="var(--cor-v)"
              strokeDasharray={`${(b / total) * volta} ${volta}`} transform="rotate(-90 26 26)" />
          )}
        </svg>
        <span className="numero">{b}{sufixo && <small>{sufixo}</small>}</span>
      </div>
    </div>
  );
}

function Contagem({ nome, valores: [a, b], children }: { nome: string; valores: [number, number]; children: ReactNode }) {
  return (
    <div className="contagem" role="group" aria-label={nome} title={nome}>
      <span className="numero">{a}</span>
      {children}
      <span className="numero">{b}</span>
    </div>
  );
}

/** Barra dividida na proporção dos dois times. */
function Comparacao({ nome, valores: [a, b], nota }: { nome: string; valores: [number, number]; nota?: string }) {
  const total = a + b;
  return (
    <div className="comparacao" role="group" aria-label={nome}>
      <div className="linha entre">
        <span className="numero">{a}</span>
        <span className="pequeno fraco centro">{nome}</span>
        <span className="numero">{b}</span>
      </div>
      <div className="dividida">
        {a > 0 && <div style={{ flexGrow: a, background: "var(--cor-m)" }} />}
        {b > 0 && <div style={{ flexGrow: b, background: "var(--cor-v)" }} />}
        {total === 0 && <div style={{ flexGrow: 1, background: "var(--cartao-2)" }} />}
      </div>
      {nota && <p className="mini muito-fraco" style={{ marginTop: 4 }}>{nota}</p>}
    </div>
  );
}

function OutrosJogos({ vivas, meuId }: { vivas: PartidaViva[]; meuId: string }) {
  const estado = useJogo();
  const partidas = new Map(estado.partidas.map((p) => [p.id, p]));
  const porSerie = new Map<Competicao, PartidaViva[]>();
  for (const pv of vivas) {
    const s = partidas.get(pv.partidaId)!.serie;
    porSerie.set(s, [...(porSerie.get(s) ?? []), pv]);
  }
  // Primeiro a competição do jogo do usuário.
  const minha = vivas.map((pv) => partidas.get(pv.partidaId)!).find((p) => p.mandante === meuId || p.visitante === meuId)?.serie;
  const ordem = [...porSerie.keys()].sort((a, b) => (a === minha ? -1 : b === minha ? 1 : a.localeCompare(b)));
  return (
    <>
      {ordem.map((s) => (
        <div key={s} className="coluna" style={{ gap: 0 }}>
          <h3 className="pequeno fraco" style={{ margin: "8px 0 4px" }}>{NOME_COMPETICAO[s]}</h3>
          {porSerie.get(s)!.map((pv) => <LinhaAoVivo key={pv.partidaId} pv={pv} meuId={meuId} p={partidas.get(pv.partidaId)!} />)}
        </div>
      ))}
    </>
  );
}

function LinhaAoVivo({ pv, meuId, p }: { pv: PartidaViva; meuId: string; p: Partida }) {
  const estado = useJogo();
  const [m, v] = pv.lados;
  const ultimoGol = [...pv.narracao].reverse().find((e) => e.tipo === "gol" || e.tipo === "gol-penalti");
  const golAgora = ultimoGol && !pv.terminada && pv.narracao.length - pv.narracao.indexOf(ultimoGol) <= 3;
  const ehMeu = m.clubeId === meuId || v.clubeId === meuId;
  return (
    <div className={`jogo-rodada${ehMeu ? " meu" : ""}`}>
      <div className="m"><span className="corta">{estado.clubes[m.clubeId].nome}</span><Escudo clube={estado.clubes[m.clubeId]} tamanho={22} /></div>
      <div className={`r${golAgora ? " gol-agora" : ""}`}>
        {m.gols} x {v.gols}
        <div className="mini muito-fraco" style={{ fontWeight: 600 }}>{relogio(pv)}{p.fase !== "liga" && p.fase !== "primeira" ? " · mata-mata" : ""}</div>
      </div>
      <div className="v"><Escudo clube={estado.clubes[v.clubeId]} tamanho={22} /><span className="corta">{estado.clubes[v.clubeId].nome}</span></div>
    </div>
  );
}

function PainelTrocas({ pv, lado, aoFechar }: { pv: PartidaViva; lado: 0 | 1; aoFechar: () => void }) {
  const estado = useJogo();
  const { avisar } = useLoja();
  const [sai, setSai] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const l = pv.lados[lado];
  const restantes = MAX_SUBSTITUICOES - l.substituicoes;
  const vagaDe = (id: number) => l.emCampo.find((a) => a.jogadorId === id)?.vaga;

  const trocar = (entra: number) => {
    if (sai == null) return;
    const erro = substituir(pv, lado, sai, entra, estado.jogadores);
    if (erro) avisar(erro);
    else avisar(`Entra ${estado.jogadores[entra].nome}, sai ${estado.jogadores[sai].nome}.`);
    setSai(null);
    setTick((t) => t + 1);
  };

  return (
    <Folha titulo={sai == null ? `Quem sai? (${restantes} trocas restantes)` : `Quem entra no lugar de ${estado.jogadores[sai].nome}?`} aoFechar={aoFechar}>
      {sai == null ? (
        <div className="lista">
          {l.emCampo.map((a) => {
            const j = estado.jogadores[a.jogadorId];
            const ef = Math.round(forcaEfetiva(j, a.vaga, l.energia[j.id], l.tatica.jogadas));
            return (
              <button key={j.id} className="item" onClick={() => setSai(j.id)} disabled={restantes <= 0}>
                <Pos pos={a.vaga.pos} />
                <div className="cresce">
                  <div className="pequeno negrito corta">{j.nome}{l.amarelos[j.id] ? " 🟨" : ""}</div>
                  <div style={{ width: 90, marginTop: 4 }}><Barra valor={l.energia[j.id]} /></div>
                </div>
                <span className={`forca ${corForca(ef, j.forca)}`}>{ef}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="lista">
          {l.banco.length === 0 && <p className="vazio">Ninguém no banco.</p>}
          {l.banco.map((id) => {
            const j = estado.jogadores[id];
            const vaga = vagaDe(sai)!;
            const ef = Math.round(forcaEfetiva(j, vaga, l.energia[id] ?? j.energia, l.tatica.jogadas));
            return (
              <button key={id} className="item" onClick={() => trocar(id)}>
                <Pos pos={j.posicao} />
                <div className="cresce">
                  <div className="pequeno negrito corta">{j.nome}</div>
                  <div className="mini fraco">força {j.forca} · energia {Math.round(l.energia[id] ?? j.energia)}%</div>
                </div>
                <span className={`forca ${corForca(ef, j.forca)}`}>{ef}</span>
              </button>
            );
          })}
          <button className="botao cheio" onClick={() => setSai(null)}>Voltar</button>
        </div>
      )}
    </Folha>
  );
}

/** Tática na partida. Antes do jogo é a tática do clube, como na aba Tática, e vale já para este jogo. */
function PainelTatica({ pv, lado, antesDoJogo, aoFechar }: { pv: PartidaViva; lado: 0 | 1; antesDoJogo?: boolean; aoFechar: () => void }) {
  const estado = useJogo();
  const { atualizar } = useLoja();
  const [, setTick] = useState(0);
  const l = pv.lados[lado];
  const mudar = (m: Partial<typeof l.tatica>) => {
    if (antesDoJogo) {
      const clube = estado.clubes[l.clubeId];
      mudarTaticaDoClube(estado, clube, m);
      pv.lados[lado] = montarLado(clube, estado.jogadores, elencoDe(estado, clube.id), true);
      atualizar();
    } else mudarTatica(pv, lado, { ...l.tatica, ...m }, estado.jogadores);
    setTick((t) => t + 1);
  };
  return (
    <Folha titulo={antesDoJogo ? "Tática do seu time" : "Tática durante o jogo"} aoFechar={aoFechar}>
      <h3 className="pequeno fraco">Formação</h3>
      <Opcoes opcoes={(Object.keys(FORMACOES) as Formacao[]).map((f) => ({ valor: f, rotulo: f }))} valor={l.tatica.formacao} aoMudar={(f) => mudar({ formacao: f })} />
      <h3 className="pequeno fraco">Estilo</h3>
      <Opcoes opcoes={(Object.keys(ESTILOS) as Estilo[]).map((e) => ({ valor: e, rotulo: ESTILOS[e].nome }))} valor={l.tatica.estilo} aoMudar={(e) => mudar({ estilo: e })} />
      <h3 className="pequeno fraco">Marcação e jogadas</h3>
      <Opcoes opcoes={[{ valor: "normal", rotulo: "Normal" }, { valor: "pressao", rotulo: "Pressão" }]} valor={l.tatica.marcacao} aoMudar={(m) => mudar({ marcacao: m })} />
      <Opcoes opcoes={[{ valor: "meio", rotulo: "Pelo meio" }, { valor: "pontas", rotulo: "Pelas pontas" }]} valor={l.tatica.jogadas} aoMudar={(m) => mudar({ jogadas: m })} />
      <button className="botao primario cheio" onClick={aoFechar}>{antesDoJogo ? "Pronto" : "Voltar ao jogo"}</button>
    </Folha>
  );
}
