import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { FASE_LIGA, SERIES, ZONAS, agregado, chavesDaFase, classificacao, tabelaDaLiga, type LinhaTabela } from "../../engine/competicoes";
import { FASES_COPA, NOME_FASE_COPA, agregadoDoConfronto, jogosDaCopa, situacaoNaCopa } from "../../engine/copa";
import { NOME_ESTADUAL, NOME_FASE_TORNEIO, PAISES, tabelaDoTorneio, vagasEntreDivisoes } from "../../engine/torneios";
import type { Competicao, EstadoTorneio, FaseCopa, Partida, SerieId } from "../../engine/tipos";
import { Escudo, Folha, Opcoes, Segmentado } from "../componentes";
import { useJogo, useLoja } from "../store";

const COR_ZONA = { titulo: "var(--dourado)", acesso: "var(--esmeralda)", playoff: "var(--azul)", classifica: "var(--azul)", rebaixamento: "var(--vermelho)" } as const;

/** A cor da posição na tabela: a zona da série (ou a função `zona`, nos torneios). */
function TabelaClassificacao({ linhas, serie, zonas = true, zona }: { linhas: LinhaTabela[]; serie?: SerieId; zonas?: boolean; zona?: (pos: number) => string }) {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const zonaDe = (pos: number) => (zona ? zona(pos) : zonas && serie ? ZONAS[serie].find((z) => z.posicoes.includes(pos))?.tipo ?? "" : "");
  return (
    <table className="tabela">
      <thead>
        <tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
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
  const meuId = estado.tecnico.clubeId;
  const m = estado.clubes[p.mandante];
  const v = estado.clubes[p.visitante];
  return (
    <button className={`jogo-rodada${p.mandante === meuId || p.visitante === meuId ? " meu" : ""}`} onClick={aoTocar} style={{ width: "100%" }}>
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
  // Ligas de fora com as duas divisões: os últimos da primeira caem e os primeiros da segunda sobem.
  const pais = t.tipo === "liga" ? t.id.slice(2, 4) : "";
  const segundaDivisao = t.tipo === "liga" && t.id.endsWith("2");
  const trocam = t.tipo === "liga" ? vagasEntreDivisoes(estado, pais) : 0;
  const zona = (pos: number) => {
    if (t.tipo !== "liga") return pos <= passam ? "classifica" : "";
    if (segundaDivisao) return pos <= trocam ? "acesso" : "";
    return pos === 1 ? "titulo" : pos > t.clubes.length - trocam ? "rebaixamento" : "";
  };
  const regra = t.tipo === "serie-d"
    ? "Grupos de 6 em turno e returno; passam 4 de cada. Mata-mata em ida e volta; os dois finalistas sobem para a Série C."
    : t.tipo === "estadual"
      ? t.grupos
        ? "Dois grupos em turno único; passam 4 de cada. Quartas, semifinal e final em jogo único; empate vai para os pênaltis."
        : t.clubes.length <= 6
          ? "Turno e returno; os 2 primeiros fazem a final, em jogo único; empate vai para os pênaltis."
          : "Turno único; os 4 primeiros fazem a semifinal e a final, em jogo único; empate vai para os pênaltis."
      : segundaDivisao
        ? `Pontos corridos: ${trocam === 1 ? "o primeiro sobe" : `os ${trocam} primeiros sobem`} para a 1ª divisão.`
        : `Pontos corridos: o primeiro é o campeão.${trocam ? ` ${trocam === 1 ? "O último cai" : `Os ${trocam} últimos caem`} para a 2ª divisão.` : ""}`;
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

type Grupo = "series" | "copa" | "estaduais" | "fora";

export function Tabelas() {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const meu = estado.clubes[meuId];
  const minha = meu.serie === "D" ? "D" : (meu.serie as SerieId);
  const torneios = Object.values(estado.torneios ?? {}).filter((t): t is EstadoTorneio => !!t);
  const estaduais = torneios.filter((t) => t.tipo === "estadual").sort((a, b) => a.nome.localeCompare(b.nome));
  const ligas = torneios.filter((t) => t.tipo === "liga").sort((a, b) => a.nome.localeCompare(b.nome));
  const meuEstadual = estaduais.find((t) => t.clubes.includes(meuId));
  // No começo do ano, com o estadual do usuário em andamento, as Tabelas abrem nele.
  const [grupo, setGrupo] = useState<Grupo>(meuEstadual && meuEstadual.fase !== "encerrada" ? "estaduais" : "series");
  const [serie, setSerie] = useState<SerieId | "D">(minha);
  const [uf, setUf] = useState<string>(meuEstadual?.id ?? estaduais[0]?.id ?? "");
  const paises = [...new Set(ligas.map((x) => x.id.slice(2, 4)))].sort((a, b) => (PAISES[a]?.pais ?? a).localeCompare(PAISES[b]?.pais ?? b));
  const [pais, setPais] = useState<string>(paises[0] ?? "");
  const [divisao, setDivisao] = useState<"1" | "2">("1");
  const [vista, setVista] = useState<"tabela" | "jogos" | "artilharia">("tabela");
  const grupos: { valor: Grupo; rotulo: string }[] = [
    { valor: "series", rotulo: "Séries" }, { valor: "copa", rotulo: "Copa" },
    ...(estaduais.length ? [{ valor: "estaduais" as const, rotulo: "Estaduais" }] : []),
    ...(ligas.length ? [{ valor: "fora" as const, rotulo: "Outros países" }] : []),
  ];
  const seletor = <Segmentado opcoes={grupos} valor={grupo} aoMudar={setGrupo} />;
  if (grupo === "copa") return <>{seletor}<CopaDoBrasil /></>;
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
    // Um país de cada vez; com as duas divisões jogando, escolhe a divisão (abre na primeira).
    const codigo = paises.includes(pais) ? pais : paises[0];
    const primeira = ligas.find((x) => x.id === `L-${codigo}`);
    const segunda = ligas.find((x) => x.id === `L-${codigo}2`);
    const t = (divisao === "2" && segunda) || primeira || segunda!;
    return (
      <>
        {seletor}
        <select value={codigo} onChange={(e) => setPais(e.target.value)} aria-label="País">
          {paises.map((p) => <option key={p} value={p}>{PAISES[p]?.pais ?? p}</option>)}
        </select>
        {primeira && segunda && (
          <Segmentado opcoes={[{ valor: "1" as const, rotulo: "1ª divisão" }, { valor: "2" as const, rotulo: "2ª divisão" }]} valor={divisao} aoMudar={setDivisao} />
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
