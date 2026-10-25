import { useEffect, useRef, useState } from "react";
import { formatarData } from "../../engine/calendario";
import { FICHAS } from "../../engine/jogo";
import { prontoParaOffline } from "../../save/aparelho";
import { carregar, importarTexto, listarSaves, type ResumoSave } from "../../save/salvamento";
import { Cartao, Escudo } from "../componentes";
import { useLoja } from "../store";

function ehIphone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function instalado(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function Inicio() {
  const { iniciar, irParaTela, avisar } = useLoja();
  const [saves, setSaves] = useState<ResumoSave[] | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const [offline, setOffline] = useState(false);

  useEffect(() => {
    listarSaves().then(setSaves).catch(() => setSaves([]));
    prontoParaOffline().then(setOffline).catch(() => setOffline(false));
  }, []);

  const abrir = async (r: ResumoSave) => {
    try {
      const estado = await carregar(r.espaco);
      if (estado) iniciar(estado);
    } catch (e) {
      avisar((e as Error).message);
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      iniciar(importarTexto(await f.text()));
      avisar("Save importado!");
    } catch (e) {
      avisar((e as Error).message);
    }
  };

  const auto = saves?.find((s) => s.espaco === "auto");
  const espacos = saves?.filter((s) => s.espaco !== "auto") ?? [];
  const ficha = (id: string) => FICHAS.find((f) => f.id === id);

  return (
    <main className="inicio">
      <div className="marca">
        <img src="./icone-192.png" alt="" />
        <h1>Proffut</h1>
        <p className="fraco">Seja o técnico. Séries A, B e C do Brasil.</p>
        {offline && <span className="chip verde" data-offline="pronto">✓ Disponível sem internet</span>}
      </div>

      {ehIphone() && !instalado() && (
        <Cartao titulo="Instale no iPhone">
          <p className="pequeno">
            Toque em <b>Compartilhar</b> (o quadrado com a seta) e depois em <b>Adicionar à Tela de Início</b>.
            Assim o jogo abre em tela cheia e o seu save fica guardado com segurança no aparelho.
          </p>
        </Cartao>
      )}

      {auto && (
        <button className="cartao linha" onClick={() => abrir(auto)} style={{ textAlign: "left" }}>
          {ficha(auto.clubeId) && <Escudo clube={ficha(auto.clubeId)!} tamanho={44} />}
          <div className="cresce">
            <div className="negrito">Continuar</div>
            <div className="pequeno fraco corta">{auto.clube} · {auto.tecnico}</div>
            <div className="mini muito-fraco">Temporada {auto.temporada} · {formatarData(auto.data)}</div>
          </div>
          <span className="botao primario pequeno">Jogar</span>
        </button>
      )}

      <button className="botao grande cheio primario" onClick={() => irParaTela("novo")} style={auto ? { background: "var(--cartao-2)", color: "var(--texto)", border: "1px solid var(--borda)" } : undefined}>
        Novo jogo
      </button>

      {espacos.length > 0 && (
        <Cartao titulo="Jogos salvos">
          <div className="lista">
            {espacos.map((r) => (
              <button key={r.espaco} className="item" onClick={() => abrir(r)}>
                {ficha(r.clubeId) && <Escudo clube={ficha(r.clubeId)!} tamanho={30} />}
                <div className="cresce">
                  <div className="negrito pequeno">Espaço {r.espaco}: {r.clube}</div>
                  <div className="mini fraco">{r.tecnico} · {r.temporada} · {formatarData(r.data)}</div>
                </div>
              </button>
            ))}
          </div>
        </Cartao>
      )}

      <button className="botao cheio" onClick={() => arquivo.current?.click()}>Importar save de arquivo</button>
      <input ref={arquivo} type="file" className="oculto" onChange={(e) => importar(e.target.files?.[0])} />

      <p className="mini muito-fraco centro" style={{ marginTop: "auto" }}>
        Clubes e jogadores reais (força calculada pelo jogo). Escudos genéricos com as cores de cada clube. Projeto pessoal, sem fins comerciais.
      </p>
    </main>
  );
}
