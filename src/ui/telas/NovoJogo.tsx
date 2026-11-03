import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { FICHAS, FICHAS_ESTADUAIS, FICHAS_EXTERIOR, PARTICIPANTES_ESTADUAIS, RESERVA, forcaEstimada, novoJogo, type FichaClube } from "../../engine/jogo";
import { NOME_REGIAO, PAISES, divisaoDaLiga, type Regiao } from "../../engine/torneios";
import { formatarDinheiro } from "../../engine/financas";
import { pedirArmazenamentoPersistente } from "../../save/salvamento";
import { Escudo, Segmentado, Topo } from "../componentes";
import { useLoja } from "../store";

/** Bandeira do país pelo código de duas letras (as letras viram os "indicadores regionais" do emoji: BR → 🇧🇷). */
export function bandeira(codigo: string): string {
  return String.fromCodePoint(...[...codigo.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Países em que o técnico pode começar e as divisões de cada um (o técnico treina qualquer clube, nov/2026). */
const NOS_ESTADUAIS = new Set(Object.values(PARTICIPANTES_ESTADUAIS).flat());
const DIVISOES: Record<string, { valor: string; rotulo: string; clubes: FichaClube[] }[]> = {
  BR: [
    ...(["A", "B", "C"] as const).map((s) => ({ valor: s, rotulo: `Série ${s}`, clubes: FICHAS.filter((f) => f.serie === s) })),
    { valor: "D", rotulo: "Série D", clubes: RESERVA },
    { valor: "estadual", rotulo: "Só estadual", clubes: FICHAS_ESTADUAIS.filter((f) => NOS_ESTADUAIS.has(f.id)) },
  ],
  // Os outros países, com as divisões que têm clubes no jogo (1ª, 2ª, 3ª...).
  ...Object.fromEntries(Object.keys(PAISES).map((pais) => {
    const doPais = FICHAS_EXTERIOR.filter((f) => f.pais === pais);
    const niveis = [...new Set(doPais.map((f) => divisaoDaLiga(f.liga ?? pais).nivel))].sort((a, b) => a - b);
    return [pais, niveis.map((n) => ({ valor: String(n), rotulo: `${n}ª divisão`, clubes: doPais.filter((f) => divisaoDaLiga(f.liga ?? pais).nivel === n) }))];
  }).filter(([, divisoes]) => divisoes.length)),
};
/** Os países por região (o Brasil na América do Sul, em primeiro). */
const POR_REGIAO = (Object.keys(NOME_REGIAO) as Regiao[]).map((regiao) => ({
  regiao,
  paises: Object.keys(DIVISOES).filter((p) => (p === "BR" ? "sul" : PAISES[p].regiao) === regiao),
})).filter((g) => g.paises.length);
const NOME_PAIS: Record<string, string> = { BR: "Brasil", ...Object.fromEntries(Object.entries(PAISES).map(([k, v]) => [k, v.pais])) };

export function NovoJogo() {
  const { iniciar, irParaTela, avisar } = useLoja();
  const [nome, setNome] = useState("");
  const [pais, setPais] = useState("BR");
  const [divisao, setDivisao] = useState("A");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const divisoes = DIVISOES[pais];
  const atual = divisoes.find((d) => d.valor === divisao) ?? divisoes[0];
  const clubes = useMemo(() => [...atual.clubes].sort((a, b) => forcaEstimada(b) - forcaEstimada(a)), [atual]);
  const selecionado = clubes.find((f) => f.id === escolhido);
  const escolherPais = (p: string) => {
    setPais(p);
    setDivisao(DIVISOES[p][0].valor);
    setEscolhido(null);
  };

  const comecar = () => {
    if (!selecionado) return;
    setCriando(true);
    // Deixa a tela mostrar "Preparando..." antes de gerar o mundo.
    setTimeout(() => {
      try {
        const estado = novoJogo({ nomeTecnico: nome || "Técnico", clubeId: selecionado.id });
        estado.tutorial = true;
        void pedirArmazenamentoPersistente();
        iniciar(estado);
      } catch (e) {
        avisar((e as Error).message);
        setCriando(false);
      }
    }, 30);
  };

  return (
    <div className="app">
      <Topo titulo="Novo jogo" sub="Escolha seu nome, o país e o clube" aoVoltar={() => irParaTela("inicio")} />
      <div className="conteudo">
        <label className="coluna" style={{ gap: 6 }}>
          <span className="pequeno fraco">Nome do técnico</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Vinícius" maxLength={30} autoComplete="off" />
        </label>

        <div role="group" aria-label="País" className="coluna" style={{ gap: 6 }}>
          {POR_REGIAO.map((g) => (
            <div key={g.regiao} className="coluna" style={{ gap: 6 }}>
              <span className="pequeno fraco">{NOME_REGIAO[g.regiao]}</span>
              <div className="paises">
                {g.paises.map((p) => (
                  <button key={p} className={`pais${p === pais ? " ativo" : ""}`} aria-pressed={p === pais} onClick={() => escolherPais(p)}>
                    <span className="bandeira" aria-hidden>{bandeira(p)}</span>
                    <span className="corta">{NOME_PAIS[p]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Segmentado opcoes={divisoes.map((d) => ({ valor: d.valor, rotulo: d.rotulo }))} valor={atual.valor} aoMudar={(d) => { setDivisao(d); setEscolhido(null); }} />

        <div className="lista">
          {clubes.map((f) => {
            const forca = forcaEstimada(f);
            return (
              <button key={f.id} className="item" onClick={() => setEscolhido(f.id)} style={escolhido === f.id ? { background: "var(--destaque)", borderRadius: 10 } : undefined}>
                <Escudo clube={f} tamanho={36} />
                <div className="cresce">
                  <div className="negrito corta">{f.nome}</div>
                  <div className="mini fraco">{f.cidade}{f.pais ? "" : `/${f.estado}`} · Caixa {formatarDinheiro(f.caixaInicial)}</div>
                </div>
                <div className="centro">
                  <div className="forca">{forca}</div>
                  <div className="mini muito-fraco">força</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "12px 16px calc(var(--base) + 12px)", borderTop: "1px solid var(--borda)", background: "var(--fundo-2)" }}>
        <button className="botao primario grande cheio" disabled={!selecionado || criando} onClick={comecar}>
          {criando ? "Preparando a temporada..." : selecionado ? `Assumir ${comArtigo("o", selecionado)}` : "Escolha um clube"}
        </button>
      </div>
    </div>
  );
}
