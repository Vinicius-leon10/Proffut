import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { formatarData } from "../../engine/calendario";
import { FASE_LIGA, SERIES, ZONAS, agregado, chavesDaFase, classificacao, tabelaDaLiga, type LinhaTabela } from "../../engine/competicoes";
import { FASES_COPA, NOME_FASE_COPA, agregadoDoConfronto, jogosDaCopa, situacaoNaCopa } from "../../engine/copa";
import type { Competicao, FaseCopa, Partida, SerieId } from "../../engine/tipos";
import { Escudo, Folha, Opcoes, Segmentado } from "../componentes";
import { useJogo, useLoja } from "../store";

const COR_ZONA = { titulo: "var(--amarelo)", acesso: "var(--verde)", playoff: "var(--azul)", classifica: "var(--azul)", rebaixamento: "var(--vermelho)" } as const;

function TabelaClassificacao({ linhas, serie, zonas = true }: { linhas: LinhaTabela[]; serie: SerieId; zonas?: boolean }) {
  const estado = useJogo();
  const meuId = estado.tecnico.clubeId;
  const zonaDe = (pos: number) => (zonas ? ZONAS[serie].find((z) => z.posicoes.includes(pos))?.tipo ?? "" : "");
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

function Jogos({ serie }: { serie: SerieId }) {
  const estado = useJogo();
  const fase = FASE_LIGA[serie];
  const jogos = estado.partidas.filter((p) => p.serie === serie && p.fase === fase);
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

export function Tabelas() {
  const estado = useJogo();
  const minha = estado.clubes[estado.tecnico.clubeId].serie as SerieId;
  const [serie, setSerie] = useState<SerieId | "CB">(minha);
  const [vista, setVista] = useState<"tabela" | "jogos" | "artilharia">("tabela");
  if (serie === "CB") {
    return (
      <>
        <Segmentado opcoes={[...SERIES.map((s) => ({ valor: s, rotulo: `Série ${s}` })), { valor: "CB" as const, rotulo: "Copa" }]} valor={serie} aoMudar={setSerie} />
        <CopaDoBrasil />
      </>
    );
  }
  const fase = estado.series[serie].fase;
  return (
    <>
      <Segmentado opcoes={[...SERIES.map((s) => ({ valor: s, rotulo: `Série ${s}` })), { valor: "CB" as const, rotulo: "Copa" }]} valor={serie} aoMudar={setSerie} />
      <Segmentado opcoes={[{ valor: "tabela", rotulo: "Classificação" }, { valor: "jogos", rotulo: "Jogos" }, { valor: "artilharia", rotulo: "Artilharia" }]} valor={vista} aoMudar={setVista} />
      {vista === "tabela" && (
        <>
          <MataMata serie={serie} />
          <div className="cartao compacto">
            {serie === "C" && <h3 className="pequeno fraco" style={{ marginBottom: 6 }}>Primeira fase</h3>}
            <TabelaClassificacao linhas={tabelaDaLiga(estado, serie)} serie={serie} />
          </div>
          <Legenda serie={serie} />
          {fase === "liga" && serie === "B" && <p className="mini muito-fraco">Do 3º ao 6º: playoff em ida e volta (3º x 6º e 4º x 5º) por duas vagas na Série A.</p>}
          {fase === "liga" && serie === "C" && <p className="mini muito-fraco">Os 8 primeiros vão para dois quadrangulares; os 2 melhores de cada um sobem. Os 2 últimos caem.</p>}
        </>
      )}
      {vista === "jogos" && <Jogos key={serie} serie={serie} />}
      {vista === "artilharia" && <Artilharia serie={serie} />}
    </>
  );
}
