import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { FASE_LIGA, SERIES, ZONAS, agregado, chavesDaFase, classificacao, tabelaDaLiga, type LinhaTabela } from "../../engine/competicoes";
import { FASES_COPA, NOME_FASE_COPA, agregadoDoConfronto, faseDeEntrada, jogosDaCopa, situacaoNaCopa } from "../../engine/copa";
import { DEFINICOES, definicaoDaCopa, regraDaFaseDaCopa, situacaoNaCopaDeClubes, tabelasDaCopa, type DefinicaoCopa } from "../../engine/copas";
import { NOME_ESTADUAL, NOME_FASE_TORNEIO, NOME_REGIAO, PAISES, divisaoDaLiga, tabelaDoTorneio, vagasEntreDivisoes, type Regiao } from "../../engine/torneios";
import { AMISTOSOS, NOME_FASE_SELECOES, confederacao, nomeDoGrupoDeSelecoes, nomeDoPais, paisDaSelecao, rankingDasSelecoes, tabelasDeSelecoes } from "../../engine/selecoes";
import type { Competicao, EstadoCompeticaoSelecoes, EstadoTorneio, FaseCopa, IdCopa, Partida, SerieId } from "../../engine/tipos";
import { letraDoGrupo } from "../formatos";
import { Escudo, Folha, Opcoes, Segmentado } from "../componentes";
import { useJogo, useLoja } from "../store";

const COR_ZONA = { titulo: "var(--dourado)", acesso: "var(--esmeralda)", playoff: "var(--azul)", classifica: "var(--azul)", rebaixamento: "var(--vermelho)" } as const;

/** A cor da posição na tabela: a zona da série (ou a função `zona`, nos torneios). */
function TabelaClassificacao({ linhas, serie, zonas = true, zona, meu, rotulo = "Clube" }: {
  linhas: LinhaTabela[]; serie?: SerieId; zonas?: boolean; zona?: (pos: number) => string;
  /** O time em destaque (o clube do usuário; nas seleções, a seleção dele). */
  meu?: string;
  rotulo?: string;
}) {
  const estado = useJogo();
  const meuId = meu ?? estado.tecnico.clubeId;
  const zonaDe = (pos: number) => (zona ? zona(pos) : zonas && serie ? ZONAS[serie].find((z) => z.posicoes.includes(pos))?.tipo ?? "" : "");
  return (
    <table className="tabela">
      <thead>
        <tr><th>#</th><th>{rotulo}</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
      </thead>
      <tbody>
        {linhas.map((l) => {
          const c = estado.clubes[l.clubeId];
          return (
            <tr key={l.clubeId} className={l.clubeId === meuId ? "meu" : ""}>
              <td className={`pos ${zonaDe(l.pos)}`}>{l.pos}</td>
              <td className="clube">
                <span className="linha" style={{ gap: 6 }}>
                  <Escudo clube={c} tamanho={20} />
                  <span className="corta" style={{ maxWidth: 120 }}>{c.nome}</span>
                </span>
              </td>
              <td className="pts">{l.pts}</td><td>{l.j}</td><td>{l.v}</td><td>{l.e}</td><td>{l.d}</td><td>{l.sg > 0 ? `+${l.sg}` : l.sg}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Legenda({ serie }: { serie: SerieId }) {
  return (
    <div className="legenda">
      {ZONAS[serie].map((z) => <span key={z.nome} style={{ ["--c" as string]: COR_ZONA[z.tipo] }}>{z.nome}</span>)}
    </div>
  );
}

export function LinhaResultado({ p, aoTocar }: { p: Partida; aoTocar?: () => void }) {
  const estado = useJogo();
  const meus = [estado.tecnico.clubeId, estado.tecnico.selecao];
  const m = estado.clubes[p.mandante];
  const v = estado.clubes[p.visitante];
  return (
    <button className={`jogo-rodada${meus.includes(p.mandante) || meus.includes(p.visitante) ? " meu" : ""}`} onClick={aoTocar} style={{ width: "100%" }}>
      <div className="m"><span className="corta">{m.nome}</span><Escudo clube={m} tamanho={22} /></div>
      <div className="r">
        {p.jogada ? `${p.gm} x ${p.gv}` : "x"}
        {p.penaltis && <div className="mini muito-fraco">pên. {p.penaltis[0]}–{p.penaltis[1]}</div>}
      </div>
      <div className="v"><Escudo clube={v} tamanho={22} /><span className="corta">{v.nome}</span></div>
    </button>
  );
}

export function FolhaPartida({ p, aoFechar }: { p: Partida; aoFechar: () => void }) {
  const estado = useJogo();
  const nome = (id?: number) => (id != null ? estado.jogadores[id]?.nome ?? "—" : "—");
  const clubes = [estado.clubes[p.mandante], estado.clubes[p.visitante]];
  const icone: Record<string, string> = { gol: "⚽", "gol-penalti": "⚽ (pên.)", amarelo: "🟨", vermelho: "🟥", lesao: "🩹" };
  return (
    <Folha titulo={`${clubes[0].nome} ${p.jogada ? p.gm : ""} x ${p.jogada ? p.gv : ""} ${clubes[1].nome}`} aoFechar={aoFechar}>
      <p className="pequeno fraco">{formatarData(p.data, true)}{p.publico ? ` · ${p.publico.toLocaleString("pt-BR")} pagantes` : ""}</p>
      {p.penaltis && <p className="pequeno">Pênaltis: {p.penaltis[0]} x {p.penaltis[1]}</p>}
      {p.eventos.length === 0 ? <p className="vazio">{p.jogada ? "Sem gols nem cartões." : "Jogo ainda não disputado."}</p> : (
        <div className="lista">
          {p.eventos.map((e, i) => (
            <div key={i} className="lance">
              <span className="min">{e.min}'</span>
              <span>{icone[e.tipo]} {nome(e.jogador)} <span className="fraco">({clubes[e.lado].sigla})</span>{(e.tipo === "gol") && e.outro != null ? <span className="fraco"> · passe de {nome(e.outro)}</span> : null}</span>
            </div>
          ))}
        </div>
      )}
    </Folha>
  );
}

function Jogos({ serie, fase, grupo }: { serie: Competicao; fase: string; grupo?: number }) {
  const estado = useJogo();
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase && (grupo == null || p.grupo === grupo));
  const total = Math.max(...jogos.map((p) => p.rodada));
  const atual = jogos.find((p) => !p.jogada)?.rodada ?? total;
  const [rodada, setRodada] = useState(atual);
  const [aberta, setAberta] = useState<Partida | null>(null);
  const daRodada = jogos.filter((p) => p.rodada === rodada);
  return (
    <>
      <div className="linha entre">
        <button className="botao pequeno" disabled={rodada <= 1} onClick={() => setRodada(rodada - 1)}>◀</button>
        <div className="centro">
          <div className="negrito">{rodada}ª rodada</div>
          <div className="mini fraco">{daRodada[0] && formatarData(daRodada[0].data)}</div>
        </div>
        <button className="botao pequeno" disabled={rodada >= total} onClick={() => setRodada(rodada + 1)}>▶</button>
      </div>
      <div>{daRodada.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}</div>
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}

function MataMata({ serie }: { serie: SerieId }) {
  const estado = useJogo();
  const [aberta, setAberta] = useState<Partida | null>(null);
  const s = estado.series[serie];
  const blocos: React.ReactNode[] = [];
  if (serie === "B" && (s.fase === "playoff" || s.fase === "encerrada") && chavesDaFase(estado, "B", "playoff").length) {
    blocos.push(
      <div key="playoff" className="cartao compacto">
        <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Playoff de acesso (ida e volta)</h3>
        {chavesDaFase(estado, "B", "playoff").map((c) => {
          const [a, b] = agregado(c);
          return (
            <div key={c.chave} style={{ marginBottom: 8 }}>
              {c.ida && <LinhaResultado p={c.ida} aoTocar={() => setAberta(c.ida!)} />}
              {c.volta && <LinhaResultado p={c.volta} aoTocar={() => setAberta(c.volta!)} />}
              <p className="mini fraco centro">Agregado: {estado.clubes[c.melhor].sigla} {a} x {b} {estado.clubes[c.pior].sigla} (empate favorece {comArtigo("o", estado.clubes[c.melhor])})</p>
            </div>
          );
        })}
      </div>,
    );
  }
  if (serie === "C" && s.grupos) {
    s.grupos.forEach((g, i) => {
      blocos.push(
        <div key={`g${i}`} className="cartao compacto">
          <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Quadrangular {i + 1} (sobem os 2 primeiros)</h3>
          <TabelaClassificacao linhas={classificacao(estado, "C", "quadrangulares", g, i + 1)} serie="C" zonas={false} />
        </div>,
      );
    });
    const [final] = chavesDaFase(estado, "C", "final");
    if (final) {
      blocos.push(
        <div key="final" className="cartao compacto">
          <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Final</h3>
          {final.ida && <LinhaResultado p={final.ida} aoTocar={() => setAberta(final.ida!)} />}
          {final.volta && <LinhaResultado p={final.volta} aoTocar={() => setAberta(final.volta!)} />}
        </div>,
      );
    }
  }
  if (s.campeao) blocos.unshift(<p key="campeao" className="chip amarelo">Campeão: {estado.clubes[s.campeao].nome}</p>);
  return (
    <>
      {blocos}
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}

function Artilharia({ serie }: { serie: Competicao }) {
  const estado = useJogo();
  const versao = useLoja((s) => s.versao);
  const lista = useMemo(() => {
    const gols = new Map<number, number>();
    for (const p of estado.partidas) {
      if (p.serie !== serie) continue;
      for (const e of p.eventos) if ((e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador != null) gols.set(e.jogador, (gols.get(e.jogador) ?? 0) + 1);
    }
    return [...gols].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [estado, serie, versao]);
  if (!lista.length) return <p className="vazio">Ninguém marcou ainda.</p>;
  return (
    <div className="lista">
      {lista.map(([id, g], i) => {
        const j = estado.jogadores[id];
        const c = j?.clubeId ? estado.clubes[j.clubeId] : undefined;
        return (
          <div key={id} className="item" style={{ minHeight: 44 }}>
            <span className="num fraco" style={{ width: 22 }}>{i + 1}</span>
            {c && <Escudo clube={c} tamanho={22} />}
            <span className="cresce pequeno corta">{j?.nome ?? "(aposentado)"}</span>
            <span className="negrito num">{g}</span>
          </div>
        );
      })}
    </div>
  );
}

const ROTULO_FASE_COPA: Record<FaseCopa, string> = { ...NOME_FASE_COPA, oitavas: "Oitavas", quartas: "Quartas", semi: "Semifinal" };
const REGRA_FASE_COPA: Record<FaseCopa, string> = {
  fase1: "Jogo único na casa do time de pior ranking; empate vai para os pênaltis.",
  fase2: "Jogo único na casa do time de pior ranking; empate vai para os pênaltis.",
  fase3: "Jogo único na casa do time de pior ranking; empate vai para os pênaltis. Entram os 4 que subiram da Série C (em 2026, os campeões de outras competições).",
  fase4: "Jogo único na casa do time de pior ranking; empate vai para os pênaltis.",
  fase5: "Entram os 20 da Série A. Ida e volta; quem tem melhor ranking decide em casa; empate no agregado vai para os pênaltis.",
  oitavas: "Ida e volta; empate no agregado vai para os pênaltis.",
  quartas: "Ida e volta; empate no agregado vai para os pênaltis.",
  semi: "Ida e volta; empate no agregado vai para os pênaltis.",
  final: "Jogo único em campo neutro; empate vai para os pênaltis.",
};

/** Copa do Brasil: escolhe a fase e vê os confrontos (jogo único ou ida e volta com o agregado). */
function CopaDoBrasil() {
  const estado = useJogo();
  const copa = estado.copa;
  const atual: FaseCopa = !copa ? "fase1" : copa.fase === "encerrada" ? "final" : copa.fase;
  const [fase, setFase] = useState<FaseCopa>(atual);
  const [vista, setVista] = useState<"jogos" | "artilharia">("jogos");
  const [aberta, setAberta] = useState<Partida | null>(null);
  const meuId = estado.tecnico.clubeId;
  const fases = FASES_COPA.filter((f) => jogosDaCopa(estado, f).length);
  const jogos = jogosDaCopa(estado, fase);
  const chaves = [...new Set(jogos.map((p) => p.chave ?? 0))];
  return (
    <>
      {copa?.campeao && <p className="chip amarelo">Campeão: {estado.clubes[copa.campeao].nome}</p>}
      <p className="pequeno">{situacaoNaCopa(estado, meuId)}</p>
      {copa && (
        <>
          <Segmentado opcoes={[{ valor: "jogos", rotulo: "Jogos" }, { valor: "artilharia", rotulo: "Artilharia" }]} valor={vista} aoMudar={setVista} />
          {vista === "artilharia" ? <Artilharia serie="CB" /> : (
            <>
              <Opcoes opcoes={fases.map((f) => ({ valor: f, rotulo: ROTULO_FASE_COPA[f] }))} valor={fase} aoMudar={setFase} />
              <p className="mini muito-fraco">{REGRA_FASE_COPA[fase]}</p>
              <div>
                {chaves.map((c) => {
                  const doConfronto = jogos.filter((p) => (p.chave ?? 0) === c);
                  const ag = doConfronto.length > 1 ? agregadoDoConfronto(estado, fase, c) : null;
                  const volta = doConfronto.find((p) => p.perna === 2);
                  return (
                    <div key={c} style={doConfronto.length > 1 ? { marginBottom: 8 } : undefined}>
                      {doConfronto.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
                      {ag && volta?.jogada && (
                        <p className="mini fraco centro">Agregado: {estado.clubes[volta.mandante].sigla} {ag[0]} x {ag[1]} {estado.clubes[volta.visitante].sigla}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}


/** Onde cada copa aparece no seletor. */
const GRUPOS_DAS_COPAS: { grupo: DefinicaoCopa["grupo"]; rotulo: string }[] = [
  { grupo: "brasil", rotulo: "Brasil" }, { grupo: "conmebol", rotulo: "América do Sul" }, { grupo: "concacaf", rotulo: "Concacaf" },
  { grupo: "uefa", rotulo: "Europa" }, { grupo: "afc", rotulo: "Ásia" }, { grupo: "caf", rotulo: "África" },
  { grupo: "mundial", rotulo: "Mundial" },
  { grupo: "nacional", rotulo: "Copas nacionais" },
];

/** Confrontos de uma fase do mata-mata (jogo único ou ida e volta, com o agregado). */
function Confrontos({ serie, fase }: { serie: Competicao; fase: string }) {
  const estado = useJogo();
  const [aberta, setAberta] = useState<Partida | null>(null);
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase);
  const chaves = [...new Set(jogos.map((p) => p.chave ?? 0))];
  return (
    <div>
      {chaves.map((c) => {
        const doConfronto = jogos.filter((p) => (p.chave ?? 0) === c);
        const volta = doConfronto.find((p) => p.perna === 2);
        const chave = volta ? chavesDaFase(estado, serie, fase).find((x) => x.chave === c) : undefined;
        const ag = chave?.ida && chave.volta ? agregado(chave) : null;
        return (
          <div key={c} style={doConfronto.length > 1 ? { marginBottom: 8 } : undefined}>
            {doConfronto.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
            {ag && volta?.jogada && chave && (
              <p className="mini fraco centro">Agregado: {estado.clubes[chave.melhor].sigla} {ag[0]} x {ag[1]} {estado.clubes[chave.pior].sigla}</p>
            )}
          </div>
        );
      })}
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}

/** Jogos de uma fase de grupos, rodada a rodada (só os do grupo, se `clubes` vem). */
function JogosDaFase({ serie, fase, clubes }: { serie: Competicao; fase: string; clubes?: string[] }) {
  const estado = useJogo();
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase && (!clubes || clubes.includes(p.mandante) || clubes.includes(p.visitante)));
  const total = Math.max(1, ...jogos.map((p) => p.rodada));
  const atual = jogos.find((p) => !p.jogada)?.rodada ?? total;
  const [rodada, setRodada] = useState(atual);
  const [aberta, setAberta] = useState<Partida | null>(null);
  const daRodada = jogos.filter((p) => p.rodada === rodada);
  return (
    <>
      <div className="linha entre">
        <button className="botao pequeno" disabled={rodada <= 1} onClick={() => setRodada(rodada - 1)} aria-label="Rodada anterior">◀</button>
        <div className="centro">
          <div className="negrito">{rodada}ª rodada</div>
          <div className="mini fraco">{daRodada[0] && formatarData(daRodada[0].data)}</div>
        </div>
        <button className="botao pequeno" disabled={rodada >= total} onClick={() => setRodada(rodada + 1)} aria-label="Próxima rodada">▶</button>
      </div>
      <div>{daRodada.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}</div>
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}

/** Uma copa de clubes (Libertadores, Copa do Nordeste...): as fases, os grupos com a tabela e os confrontos. */
function CopaDeClubes({ id }: { id: IdCopa }) {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const def = definicaoDaCopa(id)!;
  const copa = estado.copas![id]!;
  const fases = def.fases.filter((f) => estado.partidas.some((p) => p.serie === id && p.fase === f.id));
  const atual = fases.find((f) => f.id === copa.fase)?.id ?? fases.at(-1)?.id ?? def.fases[0].id;
  const [faseId, setFase] = useState(atual);
  const [vista, setVista] = useState<"jogos" | "artilharia">("jogos");
  const fase = def.fases.find((f) => f.id === faseId) ?? def.fases[0];
  const tabelas = fase.tipo === "mata" ? [] : tabelasDaCopa(estado, id, fase.id);
  const meuGrupo = Math.max(0, tabelas.findIndex((t) => t.some((l) => l.clubeId === meuId)));
  const [grupo, setGrupo] = useState(meuGrupo);
  const passam = fase.grupos?.passam ?? 0;
  // A cor dos que passam; nos grupos da Libertadores, o 3º vai para a Sul-Americana; nos da Sul-Americana, o 2º para a repescagem.
  const zona = (pos: number) => (pos === 1 && id === "K-SUL" && fase.id === "grupos" ? "titulo" : pos <= passam ? "classifica" : pos === 3 && id === "K-LIB" && fase.id === "grupos" ? "playoff" : "");
  const nomesDosGrupos = fase.grupos?.fixos?.length === 2 && id === "K-LEAG" ? ["MLS", "Liga MX"] : tabelas.map((_, i) => `Grupo ${letraDoGrupo(i + 1)}`);
  const muitos = tabelas.length > 2;
  const visiveis = muitos ? [grupo] : tabelas.map((_, i) => i);
  return (
    <>
      {copa.campeao && <p className="chip amarelo">Campeão: {estado.clubes[copa.campeao].nome}</p>}
      {copa.clubes.includes(meuId) && <p className="pequeno">{situacaoNaCopaDeClubes(estado, id, meuId)}</p>}
      <Segmentado opcoes={[{ valor: "jogos", rotulo: "Jogos" }, { valor: "artilharia", rotulo: "Artilharia" }]} valor={vista} aoMudar={setVista} />
      {vista === "artilharia" ? <Artilharia serie={id} /> : (
        <>
          {fases.length > 0 && <Opcoes opcoes={fases.map((f) => ({ valor: f.id, rotulo: f.nome }))} valor={fase.id} aoMudar={(f) => { setFase(f); setGrupo(0); }} />}
          {!fases.length && <p className="vazio">Os jogos ainda não foram sorteados.</p>}
          <p className="mini muito-fraco">{regraDaFaseDaCopa(id, fase.id)}</p>
          {fase.tipo === "mata" ? <Confrontos serie={id} fase={fase.id} /> : (
            <>
              {muitos && (
                <select value={grupo} onChange={(e) => setGrupo(Number(e.target.value))} aria-label="Grupo">
                  {tabelas.map((t, i) => <option key={i} value={i}>{nomesDosGrupos[i]}{t.some((l) => l.clubeId === meuId) ? " (seu time)" : ""}</option>)}
                </select>
              )}
              {visiveis.map((g) => (
                <div key={g} className="cartao compacto">
                  <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>{nomesDosGrupos[g]}</h3>
                  <TabelaClassificacao linhas={tabelas[g]} zona={zona} />
                </div>
              ))}
              <JogosDaFase key={`${fase.id}-${grupo}`} serie={id} fase={fase.id} clubes={muitos ? tabelas[grupo]?.map((l) => l.clubeId) : undefined} />
            </>
          )}
        </>
      )}
    </>
  );
}

/** Copas: a Copa do Brasil e as outras (Libertadores, Sul-Americana, as da Concacaf, as regionais e as nacionais). */
function Copas() {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const existentes = DEFINICOES.filter((d) => estado.copas?.[d.id]);
  const joga = (id: string) => (id === "CB" ? !!faseDeEntrada(estado, meuId) : !!estado.copas?.[id as IdCopa]?.clubes.includes(meuId));
  const emAndamento = (id: string) => (id === "CB" ? estado.copa?.fase !== "encerrada" : estado.copas?.[id as IdCopa]?.fase !== "encerrada");
  // Abre na Copa do Brasil, se o clube do usuário a joga; senão, na copa do próximo jogo dele (ou na primeira em andamento).
  const proximo = estado.partidas.find((p) => !p.jogada && (p.mandante === meuId || p.visitante === meuId) && p.serie.startsWith("K-"));
  const inicial = joga("CB") ? "CB" : proximo?.serie ?? existentes.map((d) => d.id).find((id) => joga(id) && emAndamento(id)) ?? "CB";
  const [qual, setQual] = useState<string>(inicial);
  const temCopa = !!estado.copa;
  return (
    <>
      {existentes.length > 0 && (
        <select value={qual} onChange={(e) => setQual(e.target.value)} aria-label="Copa">
          {GRUPOS_DAS_COPAS.map(({ grupo, rotulo }) => {
            const doGrupo = existentes.filter((d) => d.grupo === grupo);
            const opcoes = [...(grupo === "brasil" && temCopa ? [{ id: "CB", nome: "Copa do Brasil" }] : []), ...doGrupo.map((d) => ({ id: d.id, nome: d.nome }))];
            return opcoes.length ? (
              <optgroup key={grupo} label={rotulo}>
                {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}{joga(o.id) ? " (seu time)" : ""}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
      )}
      {qual === "CB" || !estado.copas?.[qual as IdCopa] ? <CopaDoBrasil /> : <CopaDeClubes key={qual} id={qual as IdCopa} />}
    </>
  );
}

/** Fases do mata-mata dos torneios, na ordem. */
const ORDEM_MATA_MATA = ["segunda", "terceira", "oitavas", "quartas", "semi", "final"];

/** Série D, estadual ou liga de fora: classificação (grupos ou pontos corridos e mata-mata), jogos e artilharia. */
function Torneio({ t }: { t: EstadoTorneio }) {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const [vista, setVista] = useState<"tabela" | "jogos" | "artilharia">("tabela");
  const meuGrupo = t.grupos ? Math.max(0, t.grupos.findIndex((g) => g.includes(meuId))) + 1 : undefined;
  const [grupo, setGrupo] = useState<number>(meuGrupo ?? 1);
  const fases = ORDEM_MATA_MATA.filter((f) => estado.partidas.some((p) => p.serie === t.id && p.fase === f));
  const [fase, setFase] = useState<string>(fases[fases.length - 1] ?? "");
  const [aberta, setAberta] = useState<Partida | null>(null);
  const primeira = t.grupos ? "grupos" : "liga";
  const passam = t.tipo === "liga" ? 0 : t.grupos ? 4 : t.clubes.length <= 6 ? 2 : 4;
  // Ligas de fora com divisões: os primeiros sobem para a de cima e os últimos caem para a de baixo.
  const { pais, nivel } = t.tipo === "liga" ? divisaoDaLiga(t.id.slice(2)) : { pais: "", nivel: 0 };
  const sobem = nivel > 1 ? vagasEntreDivisoes(estado, pais, nivel - 1) : 0;
  const caem = t.tipo === "liga" ? vagasEntreDivisoes(estado, pais, nivel) : 0;
  const zona = (pos: number) => {
    if (t.tipo !== "liga") return pos <= passam ? "classifica" : "";
    if (nivel === 1 && pos === 1) return "titulo";
    if (pos <= sobem) return "acesso";
    return pos > t.clubes.length - caem ? "rebaixamento" : "";
  };
  const regraDaLiga = [
    nivel === 1 ? "Pontos corridos: o primeiro é o campeão." : `Pontos corridos: ${sobem === 1 ? "o primeiro sobe" : sobem ? `os ${sobem} primeiros sobem` : "ninguém sobe"} para a ${nivel - 1}ª divisão.`,
    caem ? `${caem === 1 ? "O último cai" : `Os ${caem} últimos caem`} para a ${nivel + 1}ª divisão.` : "",
  ].filter(Boolean).join(" ");
  const regra = t.tipo === "serie-d"
    ? "Grupos de 6 em turno e returno; passam 4 de cada. Mata-mata em ida e volta; os dois finalistas sobem para a Série C."
    : t.tipo === "estadual"
      ? t.grupos
        ? "Dois grupos em turno único; passam 4 de cada. Quartas, semifinal e final em jogo único; empate vai para os pênaltis."
        : t.clubes.length <= 6
          ? "Turno e returno; os 2 primeiros fazem a final, em jogo único; empate vai para os pênaltis."
          : "Turno único; os 4 primeiros fazem a semifinal e a final, em jogo único; empate vai para os pênaltis."
      : regraDaLiga;
  // Muitos grupos (Série D): um de cada vez; poucos (estaduais): todos.
  const grupos = t.grupos ? (t.grupos.length > 2 ? [grupo] : t.grupos.map((_, i) => i + 1)) : [];
  const jogosDaFase = estado.partidas.filter((p) => p.serie === t.id && p.fase === fase);
  const chaves = [...new Set(jogosDaFase.map((p) => p.chave ?? 0))];
  return (
    <>
      <Segmentado opcoes={[{ valor: "tabela", rotulo: "Classificação" }, { valor: "jogos", rotulo: "Jogos" }, { valor: "artilharia", rotulo: "Artilharia" }]} valor={vista} aoMudar={setVista} />
      {t.grupos && t.grupos.length > 2 && vista !== "artilharia" && (
        <select value={grupo} onChange={(e) => setGrupo(Number(e.target.value))} aria-label="Grupo">
          {t.grupos.map((g, i) => <option key={i} value={i + 1}>Grupo {i + 1}{g.includes(meuId) ? " (seu time)" : ""}</option>)}
        </select>
      )}
      {vista === "tabela" && (
        <>
          {t.campeao && <p className="chip amarelo">Campeão: {estado.clubes[t.campeao].nome}</p>}
          {fases.length > 0 && (
            <div className="cartao compacto">
              <Opcoes opcoes={fases.map((f) => ({ valor: f, rotulo: NOME_FASE_TORNEIO[f] }))} valor={fase} aoMudar={setFase} />
              <div style={{ marginTop: 8 }}>
                {chaves.map((c) => {
                  const doConfronto = jogosDaFase.filter((p) => (p.chave ?? 0) === c);
                  const volta = doConfronto.find((p) => p.perna === 2);
                  const chave = volta ? chavesDaFase(estado, t.id, fase).find((x) => x.chave === c) : undefined;
                  const ag = chave?.ida && chave.volta ? agregado(chave) : null;
                  return (
                    <div key={c} style={doConfronto.length > 1 ? { marginBottom: 8 } : undefined}>
                      {doConfronto.map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
                      {ag && volta?.jogada && chave && (
                        <p className="mini fraco centro">Agregado: {estado.clubes[chave.melhor].sigla} {ag[0]} x {ag[1]} {estado.clubes[chave.pior].sigla}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {t.grupos ? grupos.map((g) => (
            <div key={g} className="cartao compacto">
              <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Grupo {g}</h3>
              <TabelaClassificacao linhas={tabelaDoTorneio(estado, t, g)} zona={zona} />
            </div>
          )) : (
            <div className="cartao compacto">
              <TabelaClassificacao linhas={tabelaDoTorneio(estado, t)} zona={zona} />
            </div>
          )}
          <p className="mini muito-fraco">{regra}</p>
        </>
      )}
      {vista === "jogos" && <Jogos key={`${t.id}-${grupo}`} serie={t.id} fase={primeira} grupo={t.grupos && t.grupos.length > 2 ? grupo : undefined} />}
      {vista === "artilharia" && <Artilharia serie={t.id} />}
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}

/** O nome no seletor: "Eliminatórias da Copa de 2030", "Copa América 2028". */
function nomeDaCompeticaoNoSeletor(c: EstadoCompeticaoSelecoes): string {
  if (c.tipo === "eliminatorias-sul") return `Eliminatórias da Copa de ${c.ano}`;
  if (c.tipo === "eliminatorias-concacaf") return `Eliminatórias da Concacaf (Copa de ${c.ano})`;
  if (c.tipo === "eliminatorias-uefa") return `Eliminatórias da Europa (Copa de ${c.ano})`;
  if (c.tipo === "eliminatorias-euro") return `Eliminatórias da Eurocopa de ${c.ano}`;
  if (c.tipo === "eliminatorias-caf") return `Eliminatórias da África (Copa de ${c.ano})`;
  if (c.tipo === "eliminatorias-afc") return `Eliminatórias da Ásia (Copa de ${c.ano})`;
  if (c.tipo === "eliminatorias-ofc") return `Eliminatórias da Oceania (Copa de ${c.ano})`;
  if (c.tipo === "repescagem-mundial") return `Repescagem mundial (Copa de ${c.ano})`;
  return `${c.nome} ${c.ano}`;
}

/** As fases de cada tipo de competição de seleções, na ordem. */
const FASES_SELECOES: Record<EstadoCompeticaoSelecoes["tipo"], string[]> = {
  "eliminatorias-sul": ["liga"], "eliminatorias-concacaf": ["fase1", "fase2", "fase3"],
  "copa-america": ["grupos", "quartas", "semi", "final"], "copa-ouro": ["grupos", "quartas", "semi", "final"],
  "liga-das-nacoes": ["ligas", "semi", "final"], "eliminatorias-euro": ["grupos", "rep-semi", "rep-final"],
  "eliminatorias-uefa": ["grupos", "rep-semi", "rep-final"], eurocopa: ["grupos", "oitavas", "quartas", "semi", "final"],
  "eliminatorias-caf": ["grupos"], "eliminatorias-afc": ["grupos"], "eliminatorias-ofc": ["grupos"], "repescagem-mundial": ["rep-semi", "rep-final"],
  "copa-do-mundo": ["grupos", "dezesseis", "oitavas", "quartas", "semi", "final"],
  "copa-africana": ["grupos", "oitavas", "quartas", "semi", "final"], "copa-da-asia": ["grupos", "oitavas", "quartas", "semi", "final"],
  "copa-da-oceania": ["grupos", "semi", "final"],
};

/** "Sede: Arábia Saudita" ou "Sedes: Quênia, Uganda e Tanzânia". */
function textoDasSedes(c: EstadoCompeticaoSelecoes): string {
  const nomes = (c.sedes ?? (c.sede ? [c.sede] : [])).map((id) => nomeDoPais(paisDaSelecao(id)));
  if (!nomes.length) return "";
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
  return `${nomes.length === 1 ? "Sede" : "Sedes"}: ${lista} (os outros jogos em campo neutro).`;
}

/** A regra de cada fase, embaixo dos jogos. */
function regraDaFaseDeSelecoes(c: EstadoCompeticaoSelecoes, fase: string): string {
  if (fase === "liga") return "Turno e returno, 18 rodadas nas datas FIFA. Os 6 primeiros vão à Copa do Mundo; o 7º, à repescagem.";
  if (fase === "fase1") return "Os 4 piores do ranking em ida e volta; os 2 vencedores vão à 2ª fase.";
  if (fase === "fase2") return "6 grupos de 5 em turno único; os primeiros e os 3 melhores segundos vão à 3ª fase (com os 3 melhores do ranking).";
  if (fase === "fase3") return "3 grupos de 4 em turno e returno; os primeiros vão à Copa do Mundo e os 2 melhores segundos, à repescagem.";
  if (fase === "ligas") return "4 ligas (A, B e C com 4 grupos de 4; D com 2 grupos), turno e returno. Os primeiros dos grupos da Liga A decidem o título em junho do ano seguinte; os primeiros das outras sobem de liga e os últimos descem.";
  if (c.tipo === "eliminatorias-euro" && fase === "grupos") return `10 grupos de 5 ou 6, turno e returno. Os 2 primeiros vão à Eurocopa; os terceiros e os 2 melhores quartos, à repescagem de março (3 vagas).${c.sede ? ` A sede, ${nomeDoPais(paisDaSelecao(c.sede))}, já está classificada.` : ""}`;
  if (c.tipo === "eliminatorias-uefa" && fase === "grupos") return "12 grupos de 4 ou 5, turno e returno. Os primeiros vão à Copa do Mundo; os segundos e os 4 melhores terceiros, à repescagem de março (4 vagas).";
  if (c.tipo === "eurocopa" && fase === "grupos") return `6 grupos de 4 em turno único; os 2 primeiros e os 4 melhores terceiros vão às oitavas. ${c.sede ? `Sede: ${nomeDoPais(paisDaSelecao(c.sede))} (os outros jogos em campo neutro).` : ""}`;
  if (c.tipo === "eliminatorias-caf" || c.tipo === "eliminatorias-afc") return `${c.tipo === "eliminatorias-caf" ? 9 : 8} grupos, turno e returno. Os primeiros vão à Copa do Mundo; o melhor segundo, à repescagem mundial.`;
  if (c.tipo === "eliminatorias-ofc") return "2 grupos, turno e returno. O melhor primeiro vai à Copa do Mundo; o outro primeiro, à repescagem mundial.";
  if (c.tipo === "repescagem-mundial") return "6 seleções em campo neutro: as 2 melhores do ranking esperam na final; as outras 4 jogam a semifinal. Os 2 vencedores das finais vão à Copa do Mundo. Jogo único, empate vai para os pênaltis.";
  if (c.tipo === "copa-do-mundo" && fase === "grupos") return `48 seleções em 12 grupos de 4, turno único; os 2 primeiros e os 8 melhores terceiros vão aos 16 avos de final. Sedes: ${(c.sedes ?? [c.sede!]).map((id) => nomeDoPais(paisDaSelecao(id))).join(", ")} (os outros jogos em campo neutro).`;
  if ((c.tipo === "copa-africana" || c.tipo === "copa-da-asia") && fase === "grupos") return `24 seleções em 6 grupos de 4 em turno único; os 2 primeiros e os 4 melhores terceiros vão às oitavas. ${textoDasSedes(c)}`;
  if (c.tipo === "copa-da-oceania" && fase === "grupos") return `8 seleções em 2 grupos de 4 em turno único; os 2 primeiros vão à semifinal. ${textoDasSedes(c)}`;
  if (fase === "rep-semi" || fase === "rep-final") return "Jogo único na casa de quem foi melhor nos grupos; empate vai para os pênaltis. Quem vence a final da repescagem fica com a vaga.";
  if (fase === "grupos") return `4 grupos de 4 em turno único; os 2 primeiros vão às quartas. ${c.sede ? `Sede: ${nomeDoPais(paisDaSelecao(c.sede))} (os outros jogos em campo neutro).` : ""}`;
  return "Jogo único; empate vai para os pênaltis.";
}

/** Uma competição de seleções: as fases, os grupos com a tabela e os confrontos. */
function CompeticaoDeSelecoes({ c }: { c: EstadoCompeticaoSelecoes }) {
  const estado = useJogo();
  const minha = estado.tecnico.selecao;
  const fases = FASES_SELECOES[c.tipo].filter((f) => estado.partidas.some((p) => p.serie === c.id && p.fase === f));
  const [fase, setFase] = useState(fases.includes(c.fase) ? c.fase : fases.at(-1) ?? FASES_SELECOES[c.tipo][0]);
  const tabelas = fase === "liga" || fase.startsWith("fase2") || fase === "fase3" || fase === "grupos" || fase === "ligas" ? tabelasDeSelecoes(estado, c.id, fase) : [];
  const meuGrupo = Math.max(0, tabelas.findIndex((t) => t.some((l) => l.clubeId === minha)));
  const [grupo, setGrupo] = useState(meuGrupo);
  const zona = (pos: number) => {
    if (fase === "liga") return pos <= 6 ? "classifica" : pos === 7 ? "playoff" : "";
    if (fase === "ligas") return pos === 1 ? "classifica" : "";
    if (c.tipo === "eliminatorias-euro") return pos <= 2 ? "classifica" : pos === 3 ? "playoff" : "";
    if (c.tipo === "eliminatorias-uefa") return pos === 1 ? "classifica" : pos === 2 ? "playoff" : "";
    if (c.tipo === "eurocopa" || c.tipo === "copa-do-mundo" || c.tipo === "copa-africana" || c.tipo === "copa-da-asia") return pos <= 2 ? "classifica" : pos === 3 ? "playoff" : "";
    if (c.tipo === "eliminatorias-caf" || c.tipo === "eliminatorias-afc" || c.tipo === "eliminatorias-ofc") return pos === 1 ? "classifica" : pos === 2 ? "playoff" : "";
    if (fase === "grupos") return pos <= 2 ? "classifica" : "";
    return pos === 1 ? "classifica" : pos === 2 ? "playoff" : "";
  };
  const muitos = tabelas.length > 2;
  const visiveis = muitos ? [grupo] : tabelas.map((_, i) => i);
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  return (
    <>
      {c.campeao && <p className="chip amarelo">Campeão: {nome(c.campeao)}</p>}
      {c.fase === "aguardando" && (
        <p className="pequeno">Classificadas ({c.selecoes.length} de 48, com as sedes): {c.selecoes.map(nome).join(", ")}. Os grupos são sorteados quando as repescagens de março acabam.</p>
      )}
      {c.classificados && <p className="pequeno">Vão à {c.tipo === "eliminatorias-euro" ? "Eurocopa" : "Copa do Mundo"} de {c.ano}: {c.classificados.map(nome).join(", ")}.{c.repescagem?.length ? ` Repescagem: ${c.repescagem.map(nome).join(" e ")}.` : ""}</p>}
      {fases.length > 1 && <Opcoes opcoes={fases.map((f) => ({ valor: f, rotulo: NOME_FASE_SELECOES[f] ?? f }))} valor={fase} aoMudar={(f) => { setFase(f); setGrupo(0); }} />}
      {!fases.length && <p className="vazio">Os jogos ainda não foram marcados.</p>}
      <p className="mini muito-fraco">{regraDaFaseDeSelecoes(c, fase)}</p>
      {!tabelas.length ? <Confrontos serie={c.id} fase={fase} /> : (
        <>
          {muitos && (
            <select value={grupo} onChange={(e) => setGrupo(Number(e.target.value))} aria-label="Grupo">
              {tabelas.map((t, i) => <option key={i} value={i}>{nomeDoGrupoDeSelecoes(c.id, i + 1)}{t.some((l) => l.clubeId === minha) ? " (sua seleção)" : ""}</option>)}
            </select>
          )}
          {visiveis.map((g) => (
            <div key={g} className="cartao compacto">
              {tabelas.length > 1 && <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>{nomeDoGrupoDeSelecoes(c.id, g + 1)}</h3>}
              <TabelaClassificacao linhas={tabelas[g]} zona={zona} meu={minha} rotulo="Seleção" />
            </div>
          ))}
          <JogosDaFase key={`${fase}-${grupo}`} serie={c.id} fase={fase} clubes={muitos || tabelas.length > 1 ? tabelas[grupo]?.map((l) => l.clubeId) : undefined} />
        </>
      )}
    </>
  );
}

/** O ranking das seleções (pontos do tipo Elo, que mudam a cada jogo): todas, só as da América ou só as da Europa. */
function RankingDasSelecoes() {
  const estado = useJogo();
  const minha = estado.tecnico.selecao;
  const [onde, setOnde] = useState<"mundo" | "america" | "europa" | "africa" | "asia">("mundo");
  const continente = (id: string) => {
    const c = confederacao(paisDaSelecao(id));
    return c === "uefa" ? "europa" : c === "caf" ? "africa" : c === "afc" || c === "ofc" ? "asia" : "america";
  };
  const lista = rankingDasSelecoes(estado).filter((s) => onde === "mundo" || continente(s.id) === onde);
  return (
    <>
      <Opcoes opcoes={[{ valor: "mundo", rotulo: "Todas" }, { valor: "america", rotulo: "América" }, { valor: "europa", rotulo: "Europa" },
        { valor: "africa", rotulo: "África" }, { valor: "asia", rotulo: "Ásia e Oceania" }]} valor={onde} aoMudar={setOnde} />
      <p className="mini muito-fraco">Os pontos mudam a cada jogo: vencer um time mais forte vale mais, e os jogos oficiais valem mais que os amistosos.</p>
      <div className="lista">
        {lista.map((s, i) => {
          const c = estado.clubes[s.id];
          return (
            <div key={s.id} className={`item${s.id === minha ? " meu" : ""}`}>
              <span className="colocacao num">{i + 1}º</span>
              <Escudo clube={c} tamanho={24} />
              <span className="cresce pequeno negrito corta">{c.nome}</span>
              <span className="num pequeno">{s.pontos}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Os amistosos do ano, data FIFA por data FIFA (a mais recente primeiro). */
function AmistososDoAno() {
  const estado = useJogo();
  const [aberta, setAberta] = useState<Partida | null>(null);
  const jogos = estado.partidas.filter((p) => p.serie === AMISTOSOS);
  const datas = [...new Set(jogos.map((p) => p.data))].sort().reverse();
  if (!datas.length) return <p className="vazio">Nenhum amistoso marcado ainda.</p>;
  return (
    <>
      {datas.map((d) => (
        <div key={d} className="cartao compacto">
          <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>{formatarData(d, true)}</h3>
          {jogos.filter((p) => p.data === d).map((p) => <LinhaResultado key={p.id} p={p} aoTocar={() => setAberta(p)} />)}
        </div>
      ))}
      {aberta && <FolhaPartida p={aberta} aoFechar={() => setAberta(null)} />}
    </>
  );
}

/** Seleções: o ranking, as competições (Eliminatórias, Copa América, Copa Ouro, Liga das Nações, Eurocopa, Copa Africana, Copa da Ásia, Copa da Oceania, Copa do Mundo) e os amistosos. */
function Selecoes() {
  const estado = useJogo();
  const minha = estado.tecnico.selecao;
  const comps = Object.values(estado.selecoes?.competicoes ?? {}).filter((c): c is EstadoCompeticaoSelecoes => !!c)
    .sort((a, b) => a.ano - b.ano || (b.tipo === "copa-do-mundo" ? 1 : 0) - (a.tipo === "copa-do-mundo" ? 1 : 0) || a.id.localeCompare(b.id));
  // Abre na competição do próximo jogo da seleção do técnico; senão, no ranking.
  const proximo = minha ? estado.partidas.find((p) => !p.jogada && p.serie.startsWith("S-") && (p.mandante === minha || p.visitante === minha)) : undefined;
  const [qual, setQual] = useState<string>(proximo?.serie ?? "ranking");
  const comp = comps.find((c) => c.id === qual);
  return (
    <>
      <select value={comp || qual === AMISTOSOS ? qual : "ranking"} onChange={(e) => setQual(e.target.value)} aria-label="Seleções">
        <option value="ranking">Ranking</option>
        {comps.map((c) => <option key={c.id} value={c.id}>{nomeDaCompeticaoNoSeletor(c)}{minha && c.selecoes.includes(minha) ? " (sua seleção)" : ""}</option>)}
        <option value={AMISTOSOS}>Amistosos</option>
      </select>
      {comp ? <CompeticaoDeSelecoes key={comp.id} c={comp} /> : qual === AMISTOSOS ? <AmistososDoAno /> : <RankingDasSelecoes />}
    </>
  );
}

type Grupo = "series" | "copa" | "estaduais" | "fora" | "selecoes";

export function Tabelas() {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const meu = estado.clubes[meuId];
  const minha: SerieId | "D" = meu.serie === "D" ? "D" : meu.serie === "A" || meu.serie === "B" || meu.serie === "C" ? meu.serie : "A";
  const torneios = Object.values(estado.torneios ?? {}).filter((t): t is EstadoTorneio => !!t);
  const estaduais = torneios.filter((t) => t.tipo === "estadual").sort((a, b) => a.nome.localeCompare(b.nome));
  const ligas = torneios.filter((t) => t.tipo === "liga").sort((a, b) => a.nome.localeCompare(b.nome));
  const meuEstadual = estaduais.find((t) => t.clubes.includes(meuId));
  // No começo do ano, com o estadual do usuário em andamento, as Tabelas abrem nele.
  // Clube de fora abre nos outros países (no dele); clube só do estadual, nos estaduais.
  const [grupo, setGrupo] = useState<Grupo>(
    (meuEstadual && meuEstadual.fase !== "encerrada") || meu.serie === "estadual" ? "estaduais" : meu.serie === "exterior" ? "fora" : "series");
  const [serie, setSerie] = useState<SerieId | "D">(minha);
  const [uf, setUf] = useState<string>(meuEstadual?.id ?? estaduais[0]?.id ?? "");
  const paises = [...new Set(ligas.map((x) => divisaoDaLiga(x.id.slice(2)).pais))].sort((a, b) => (PAISES[a]?.pais ?? a).localeCompare(PAISES[b]?.pais ?? b));
  // Abre no país do clube do usuário; senão, no primeiro da América do Sul (a Argentina), não no primeiro do alfabeto.
  const [pais, setPais] = useState<string>(meu.pais && paises.includes(meu.pais) ? meu.pais : paises.find((p) => PAISES[p]?.regiao === "sul") ?? paises[0] ?? "");
  const [divisao, setDivisao] = useState<string>(meu.liga ? String(divisaoDaLiga(meu.liga).nivel) : "1");
  const [vista, setVista] = useState<"tabela" | "jogos" | "artilharia">("tabela");
  const grupos: { valor: Grupo; rotulo: string }[] = [
    { valor: "series", rotulo: "Séries" }, { valor: "copa", rotulo: estado.copas ? "Copas" : "Copa" },
    ...(estaduais.length ? [{ valor: "estaduais" as const, rotulo: "Estaduais" }] : []),
    ...(ligas.length ? [{ valor: "fora" as const, rotulo: "Outros países" }] : []),
    ...(estado.selecoes ? [{ valor: "selecoes" as const, rotulo: "Seleções" }] : []),
  ];
  const seletor = <Segmentado opcoes={grupos} valor={grupo} aoMudar={setGrupo} />;
  if (grupo === "copa") return <>{seletor}<Copas /></>;
  if (grupo === "selecoes") return <>{seletor}<Selecoes /></>;
  if (grupo === "estaduais") {
    const t = estaduais.find((x) => x.id === uf) ?? estaduais[0];
    return (
      <>
        {seletor}
        <select value={t.id} onChange={(e) => setUf(e.target.value)} aria-label="Estadual">
          {estaduais.map((x) => <option key={x.id} value={x.id}>{NOME_ESTADUAL[x.id.slice(2)] ?? x.id.slice(2)} ({x.id.slice(2)})</option>)}
        </select>
        <Torneio key={t.id} t={t} />
      </>
    );
  }
  if (grupo === "fora") {
    // Um país de cada vez (por região); com mais de uma divisão jogando, escolhe a divisão (abre na primeira).
    const codigo = paises.includes(pais) ? pais : paises[0];
    const doPais = ligas.filter((x) => divisaoDaLiga(x.id.slice(2)).pais === codigo)
      .sort((a, b) => divisaoDaLiga(a.id.slice(2)).nivel - divisaoDaLiga(b.id.slice(2)).nivel);
    const t = doPais.find((x) => String(divisaoDaLiga(x.id.slice(2)).nivel) === divisao) ?? doPais[0];
    return (
      <>
        {seletor}
        <select value={codigo} onChange={(e) => setPais(e.target.value)} aria-label="País">
          {(Object.keys(NOME_REGIAO) as Regiao[]).map((r) => {
            const daRegiao = paises.filter((p) => PAISES[p]?.regiao === r);
            return daRegiao.length ? (
              <optgroup key={r} label={NOME_REGIAO[r]}>
                {daRegiao.map((p) => <option key={p} value={p}>{PAISES[p]?.pais ?? p}</option>)}
              </optgroup>
            ) : null;
          })}
        </select>
        {doPais.length > 1 && (
          <Segmentado
            opcoes={doPais.map((x) => { const n = divisaoDaLiga(x.id.slice(2)).nivel; return { valor: String(n), rotulo: `${n}ª divisão` }; })}
            valor={String(divisaoDaLiga(t.id.slice(2)).nivel)}
            aoMudar={setDivisao}
          />
        )}
        <Torneio key={t.id} t={t} />
      </>
    );
  }
  const opcoesSerie = [...SERIES.map((s) => ({ valor: s as SerieId | "D", rotulo: `Série ${s}` })), ...(estado.torneios?.D ? [{ valor: "D" as const, rotulo: "Série D" }] : [])];
  if (serie === "D" && estado.torneios?.D) {
    return <>{seletor}<Segmentado opcoes={opcoesSerie} valor={serie} aoMudar={setSerie} /><Torneio key="D" t={estado.torneios.D} /></>;
  }
  const s = serie === "D" ? "A" : serie;
  const fase = estado.series[s].fase;
  return (
    <>
      {seletor}
      <Segmentado opcoes={opcoesSerie} valor={s} aoMudar={setSerie} />
      <Segmentado opcoes={[{ valor: "tabela", rotulo: "Classificação" }, { valor: "jogos", rotulo: "Jogos" }, { valor: "artilharia", rotulo: "Artilharia" }]} valor={vista} aoMudar={setVista} />
      {vista === "tabela" && (
        <>
          <MataMata serie={s} />
          <div className="cartao compacto">
            {s === "C" && <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Primeira fase</h3>}
            <TabelaClassificacao linhas={tabelaDaLiga(estado, s)} serie={s} />
          </div>
          <Legenda serie={s} />
          {fase === "liga" && s === "B" && <p className="mini muito-fraco">Do 3º ao 6º: playoff em ida e volta (3º x 6º e 4º x 5º) por duas vagas na Série A.</p>}
          {fase === "liga" && s === "C" && <p className="mini muito-fraco">Os 8 primeiros vão para dois quadrangulares; os 2 melhores de cada um sobem. Os 2 últimos caem.</p>}
        </>
      )}
      {vista === "jogos" && <Jogos key={s} serie={s} fase={FASE_LIGA[s]} />}
      {vista === "artilharia" && <Artilharia serie={s} />}
    </>
  );
}
