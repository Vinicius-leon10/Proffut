import { useEffect, useRef, useState } from "react";
import { formatarData } from "../../engine/calendario";
import { FICHAS } from "../../engine/jogo";
import { prontoParaOffline } from "../../save/aparelho";
import { apagarJogo, carregar, espacoLivre, importarTexto, ligarOContinuar, listarSaves, podeTrocarOContinuar, type ResumoSave } from "../../save/salvamento";
import { Cartao, Escudo } from "../componentes";
import { esperarGravacaoAoSair, useLoja } from "../store";

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
    // Antes de listar: o jogo do Continuar vai para um espaço, se ainda não estiver (saves antigos, R86).
    esperarGravacaoAoSair().then(ligarOContinuar).then(listarSaves).then(setSaves).catch(() => setSaves([]));
    prontoParaOffline().then(setOffline).catch(() => setOffline(false));
  }, []);

  const abrir = async (r: ResumoSave) => {
    try {
      // Abrir um espaço troca o jogo do Continuar: se aquele não está em nenhum espaço, pergunta antes (R85).
      if (r.espaco !== "auto" && r.espaco !== auto?.ligado && !(await podeTrocarOContinuar())) return;
      // O espaço ligado ao Continuar abre o Continuar: é o mesmo jogo, e o Continuar pode estar mais novo (na partida
      // ao vivo só ele é gravado a cada minuto; o app fechado no meio do jogo deixa o espaço no começo dela).
      const estado = await carregar(r.espaco === auto?.ligado ? "auto" : r.espaco);
      // O espaço aberto passa a acompanhar o jogo; o Continuar segue o espaço ligado a ele (R84).
      if (estado) iniciar(estado, r.espaco === "auto" ? r.ligado ?? null : r.espaco);
    } catch (e) {
      avisar((e as Error).message);
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const estado = importarTexto(await f.text());
      if (!(await podeTrocarOContinuar())) return;
      iniciar(estado, (await espacoLivre()) ?? null);
      avisar("Save importado!");
    } catch (e) {
      avisar((e as Error).message);
    }
  };

  const apagarSave = async (r: ResumoSave) => {
    const mesmo = r.espaco === "auto" ? r.ligado : r.espaco === auto?.ligado ? "auto" : undefined;
    const onde = r.espaco === "auto" ? "o jogo do Continuar" : `o Espaço ${r.espaco}`;
    const junto = mesmo ? (r.espaco === "auto" ? ` e o Espaço ${mesmo} (é o mesmo jogo)` : " e o Continuar (é o mesmo jogo)") : "";
    if (!window.confirm(`Apagar ${onde}${junto}: ${r.clube}, técnico ${r.tecnico}? Não dá para desfazer.`)) return;
    await apagarJogo(r.espaco);
    setSaves(await listarSaves());
    avisar("Jogo apagado.");
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
            <div className="mini muito-fraco">{auto.ligado ? `Espaço ${auto.ligado} · salva sozinho` : "Fora dos espaços"}</div>
          </div>
          <span className="botao primario pequeno">Jogar</span>
        </button>
      )}
      {auto && (
        <button className="botao pequeno" style={{ alignSelf: "flex-end" }} onClick={() => apagarSave(auto)} aria-label="Apagar o jogo do Continuar">
          Apagar o Continuar
        </button>
      )}

      <button className={`botao grande cheio ${auto ? "floresta" : "primario"}`} onClick={() => irParaTela("novo")}>
        Novo jogo
      </button>

      {espacos.length > 0 && (
        <Cartao titulo="Jogos salvos">
          <div className="lista">
            {espacos.map((r) => (
              <div key={r.espaco} className="item">
                <button className="linha cresce" onClick={() => abrir(r)} style={{ background: "none", border: 0, padding: 0, textAlign: "left", gap: 10, color: "inherit" }}>
                  {ficha(r.clubeId) && <Escudo clube={ficha(r.clubeId)!} tamanho={30} />}
                  <div className="cresce">
                    <div className="negrito pequeno">Espaço {r.espaco}: {r.clube}</div>
                    <div className="mini fraco">{r.tecnico} · {r.temporada} · {formatarData(r.data)}</div>
                  </div>
                </button>
                <button className="botao pequeno" onClick={() => apagarSave(r)} aria-label={`Apagar o Espaço ${r.espaco}`}>Apagar</button>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <button className="botao cheio" onClick={() => arquivo.current?.click()}>Importar save de arquivo</button>
      <input ref={arquivo} type="file" className="oculto" onChange={(e) => importar(e.target.files?.[0])} />

      <p className="mini muito-fraco centro" style={{ marginTop: "auto" }}>
        Clubes e jogadores reais (força calculada pelo jogo). Os escudos pertencem aos clubes. Projeto pessoal, sem fins comerciais.
      </p>
    </main>
  );
}
