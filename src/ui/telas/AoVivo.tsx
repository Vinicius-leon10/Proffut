import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_SUBSTITUICOES, ESTILOS } from "../../engine/constantes";
import { FORMACOES, corForca, forcaEfetiva } from "../../engine/forca";
import { desfechoDoConfronto } from "../../engine/copa";
import { concluirJogos } from "../../engine/jogo";
import { avancarMinuto, formatarMinuto, mudarTatica, simularAteOFim, substituir, type PartidaViva } from "../../engine/partida";
import type { Competicao, EstadoJogo, Estilo, EventoPartida, Formacao, Partida } from "../../engine/tipos";
import { NOME_COMPETICAO } from "../../engine/competicoes";
import { Barra, Escudo, Folha, Icone, Opcoes, Pos, Segmentado } from "../componentes";
import { rotuloPartida } from "../formatos";
import { apito, liberarSom, pararSons, tocarLances } from "../sons";
import { useJogo, useLoja } from "../store";

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
  const [aba, setAba] = useState<"lances" | "rodada">("lances");
  const [painel, setPainel] = useState<"trocas" | "tatica" | null>(null);
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
    if (som.current) tocarLances(novos, [estado.clubes[meu.lados[0].clubeId].nome, estado.clubes[meu.lados[1].clubeId].nome]);
    if (meu.avisos.length > avisosVistos.current) {
      avisar(meu.avisos[meu.avisos.length - 1]);
      avisosVistos.current = meu.avisos.length;
    }
    if (meu.intervalo) setPausado(true);
    setTick((t) => t + 1);
  }, [vivas, estado.jogadores, estado.clubes, meu, avisar]);

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

  return (
    <div className="tela-cheia">
      <div className="placar">
        <div className="mini fraco centro" style={{ marginBottom: 6 }}>{rotuloPartida(partida)}</div>
        <div className="times">
          <div className="time"><Escudo clube={clubeM} tamanho={48} /><span className="corta" style={{ maxWidth: "100%" }}>{clubeM.nome}</span></div>
          <div className="centro">
            <div className="gols">{lm.gols} <span className="muito-fraco">x</span> {lv.gols}</div>
            <div className="relogio">{relogio(meu)}</div>
          </div>
          <div className="time"><Escudo clube={clubeV} tamanho={48} /><span className="corta" style={{ maxWidth: "100%" }}>{clubeV.nome}</span></div>
        </div>
        <div style={{ marginTop: 10 }}><Barra valor={progresso} cor="var(--amarelo)" /></div>
      </div>

      {!iniciado ? (
        <PreJogo vivas={vivas} meu={meu} meuLado={meuLado} regra={regraDoMataMata(estado, partida)} aoComecar={comecar} aoAjustar={fechar} />
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
          {meu.intervalo && pausado && (
            <div className="cartao compacto" style={{ margin: "0 16px" }}>
              <p className="pequeno"><b>Intervalo.</b> Faça substituições ou mude a tática, e toque em ▶ para o segundo tempo.</p>
            </div>
          )}
          <div style={{ padding: "8px 16px 0" }}>
            <Segmentado opcoes={[{ valor: "lances", rotulo: "Lances" }, { valor: "rodada", rotulo: "Rodada" }]} valor={aba} aoMudar={setAba} />
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
            ) : (
              <OutrosJogos vivas={vivas} meuId={meuId} />
            )}
          </div>
        </>
      )}

      {painel === "trocas" && <PainelTrocas pv={meu} lado={meuLado} aoFechar={() => setPainel(null)} />}
      {painel === "tatica" && <PainelTatica pv={meu} lado={meuLado} aoFechar={() => setPainel(null)} />}
    </div>
  );
}

/** Antes de um jogo da Copa: como ele se decide (e o placar da ida, no jogo de volta). */
function regraDoMataMata(estado: EstadoJogo, p: Partida): string | undefined {
  if (p.serie !== "CB") return undefined;
  if (p.perna === 1) return "Jogo de ida. A vaga se decide na volta, no placar somado.";
  if (p.perna === 2) {
    const ida = estado.partidas.find((x) => x.serie === "CB" && x.fase === p.fase && x.chave === p.chave && x.perna === 1);
    const placar = ida?.jogada ? ` Na ida: ${estado.clubes[ida.mandante].nome} ${ida.gm} x ${ida.gv} ${estado.clubes[ida.visitante].nome}.` : "";
    return `Jogo de volta: vale o placar somado; empate no agregado vai para os pênaltis.${placar}`;
  }
  return p.neutro ? "Final em jogo único, em campo neutro. Se empatar, pênaltis." : "Jogo único: quem vencer passa de fase. Se empatar, pênaltis.";
}

function PreJogo({ vivas, meu, meuLado, regra, aoComecar, aoAjustar }: { vivas: PartidaViva[]; meu: PartidaViva; meuLado: 0 | 1; regra?: string; aoComecar: () => void; aoAjustar: () => void }) {
  const estado = useJogo();
  const eu = meu.lados[meuLado];
  const ele = meu.lados[meuLado === 0 ? 1 : 0];
  const adversario = estado.clubes[ele.clubeId];
  const media = (ids: number[]) => Math.round(ids.reduce((s, id) => s + estado.jogadores[id].forca, 0) / Math.max(1, ids.length));
  return (
    <div className="conteudo">
      <div className="cartao compacto">
        <div className="linha entre pequeno">
          <span className="fraco">Seu time</span>
          <span>{eu.tatica.formacao} · {ESTILOS[eu.tatica.estilo].nome} · força média <b>{media(eu.emCampo.map((a) => a.jogadorId))}</b></span>
        </div>
        <div className="linha entre pequeno" style={{ marginTop: 6 }}>
          <span className="fraco">{adversario.nome}</span>
          <span>{ele.tatica.formacao} · {ESTILOS[ele.tatica.estilo].nome} · força média <b>{media(ele.emCampo.map((a) => a.jogadorId))}</b></span>
        </div>
        {regra && <p className="mini fraco" style={{ marginTop: 6 }}>{regra}</p>}
      </div>
      <div className="lista">
        {eu.emCampo.map((a) => {
          const j = estado.jogadores[a.jogadorId];
          const ef = Math.round(forcaEfetiva(j, a.vaga, j.energia, eu.tatica.jogadas));
          return (
            <div key={a.jogadorId} className="item" style={{ minHeight: 40, padding: "6px 2px" }}>
              <Pos pos={a.vaga.pos} />
              <span className="cresce pequeno corta">{j.nome}</span>
              <span className="mini fraco">{Math.round(j.energia)}%</span>
              <span className={`forca ${corForca(ef, j.forca)}`}>{ef}</span>
            </div>
          );
        })}
      </div>
      <p className="mini muito-fraco">Hoje: {vivas.length} jogos. Os outros placares aparecem na aba Rodada durante o jogo.</p>
      <button className="botao primario grande cheio" onClick={aoComecar}>Começar o jogo</button>
      <button className="botao cheio" onClick={aoAjustar}>Voltar e ajustar a escalação</button>
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

function PainelTatica({ pv, lado, aoFechar }: { pv: PartidaViva; lado: 0 | 1; aoFechar: () => void }) {
  const estado = useJogo();
  const [, setTick] = useState(0);
  const l = pv.lados[lado];
  const mudar = (m: Partial<typeof l.tatica>) => {
    mudarTatica(pv, lado, { ...l.tatica, ...m }, estado.jogadores);
    setTick((t) => t + 1);
  };
  return (
    <Folha titulo="Tática durante o jogo" aoFechar={aoFechar}>
      <h3 className="pequeno fraco">Formação</h3>
      <Opcoes opcoes={(Object.keys(FORMACOES) as Formacao[]).map((f) => ({ valor: f, rotulo: f }))} valor={l.tatica.formacao} aoMudar={(f) => mudar({ formacao: f })} />
      <h3 className="pequeno fraco">Estilo</h3>
      <Opcoes opcoes={(Object.keys(ESTILOS) as Estilo[]).map((e) => ({ valor: e, rotulo: ESTILOS[e].nome }))} valor={l.tatica.estilo} aoMudar={(e) => mudar({ estilo: e })} />
      <h3 className="pequeno fraco">Marcação e jogadas</h3>
      <Opcoes opcoes={[{ valor: "normal", rotulo: "Normal" }, { valor: "pressao", rotulo: "Pressão" }]} valor={l.tatica.marcacao} aoMudar={(m) => mudar({ marcacao: m })} />
      <Opcoes opcoes={[{ valor: "meio", rotulo: "Pelo meio" }, { valor: "pontas", rotulo: "Pelas pontas" }]} valor={l.tatica.jogadas} aoMudar={(m) => mudar({ jogadas: m })} />
      <button className="botao primario cheio" onClick={aoFechar}>Voltar ao jogo</button>
    </Folha>
  );
}
