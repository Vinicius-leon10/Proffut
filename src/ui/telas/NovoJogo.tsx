import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { FICHAS, FICHAS_ESTADUAIS, FICHAS_EXTERIOR, PARTICIPANTES_ESTADUAIS, RESERVA, forcaEstimada, novoJogo, type FichaClube } from "../../engine/jogo";
import { PAISES } from "../../engine/torneios";
import { formatarDinheiro } from "../../engine/financas";
import { espacoLivre, pedirArmazenamentoPersistente, podeTrocarOContinuar } from "../../save/salvamento";
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
  ...Object.fromEntries(Object.keys(PAISES).map((pais) => [pais, [
    { valor: "1", rotulo: "1ª divisão", clubes: FICHAS_EXTERIOR.filter((f) => f.pais === pais && !f.liga) },
    { valor: "2", rotulo: "2ª divisão", clubes: FICHAS_EXTERIOR.filter((f) => f.pais === pais && f.liga) },
  ].filter((d) => d.clubes.length)])),
};
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

  const comecar = async () => {
    if (!selecionado) return;
    // O jogo novo toma o lugar do Continuar: se aquele não está em nenhum espaço, pergunta antes (R85).
    if (!(await podeTrocarOContinuar())) return;
    // E vai sozinho para o primeiro espaço livre, que salva junto a cada rodada (R84).
    const espaco = (await espacoLivre()) ?? null;
    setCriando(true);
    // Deixa a tela mostrar "Preparando..." antes de gerar o mundo.
    setTimeout(() => {
      try {
        const estado = novoJogo({ nomeTecnico: nome || "Técnico", clubeId: selecionado.id });
        estado.tutorial = true;
        void pedirArmazenamentoPersistente();
        iniciar(estado, espaco);
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

        <div className="coluna" style={{ gap: 6 }}>
          <span className="pequeno fraco">País</span>
          <div role="group" aria-label="País" className="paises">
            {Object.keys(DIVISOES).map((p) => (
              <button key={p} className={`pais${p === pais ? " ativo" : ""}`} aria-pressed={p === pais} onClick={() => escolherPais(p)}>
                <span className="bandeira" aria-hidden>{bandeira(p)}</span>
                <span className="corta">{NOME_PAIS[p]}</span>
              </button>
            ))}
          </div>
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
