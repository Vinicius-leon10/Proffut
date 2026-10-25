import { useMemo, useState } from "react";
import { comArtigo } from "../../engine/artigos";
import { FICHAS, forcaEstimada, novoJogo } from "../../engine/jogo";
import { formatarDinheiro } from "../../engine/financas";
import type { SerieId } from "../../engine/tipos";
import { pedirArmazenamentoPersistente } from "../../save/salvamento";
import { Escudo, Segmentado, Topo } from "../componentes";
import { useLoja } from "../store";

export function NovoJogo() {
  const { iniciar, irParaTela, avisar } = useLoja();
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState<SerieId>("A");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const clubes = useMemo(
    () => FICHAS.filter((f) => f.serie === serie).sort((a, b) => forcaEstimada(b) - forcaEstimada(a)),
    [serie],
  );
  const selecionado = FICHAS.find((f) => f.id === escolhido);

  const comecar = () => {
    if (!selecionado) return;
    setCriando(true);
    // Deixa a tela mostrar "Preparando..." antes de gerar o mundo.
    setTimeout(() => {
      try {
        const estado = novoJogo({ nomeTecnico: nome || "Técnico", clubeId: selecionado.id });
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
      <Topo titulo="Novo jogo" sub="Escolha seu nome e seu clube" aoVoltar={() => irParaTela("inicio")} />
      <div className="conteudo">
        <label className="coluna" style={{ gap: 6 }}>
          <span className="pequeno fraco">Nome do técnico</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Vinícius" maxLength={30} autoComplete="off" />
        </label>

        <Segmentado
          opcoes={[{ valor: "A", rotulo: "Série A" }, { valor: "B", rotulo: "Série B" }, { valor: "C", rotulo: "Série C" }]}
          valor={serie}
          aoMudar={(s) => setSerie(s)}
        />

        <div className="lista">
          {clubes.map((f) => {
            const forca = forcaEstimada(f);
            return (
              <button key={f.id} className="item" onClick={() => setEscolhido(f.id)} style={escolhido === f.id ? { background: "var(--destaque)", borderRadius: 10 } : undefined}>
                <Escudo clube={f} tamanho={36} />
                <div className="cresce">
                  <div className="negrito corta">{f.nome}</div>
                  <div className="mini fraco">{f.cidade}/{f.estado} · Caixa {formatarDinheiro(f.caixaInicial)}</div>
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
