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
  // Uma lista só (R149): o jogo do Continuar aparece uma vez, em primeiro. Ligado a um espaço, é a linha desse espaço;
  // fora dos espaços, a linha do próprio Continuar.
  const ligado = auto?.ligado && espacos.some((r) => r.espaco === auto.ligado) ? auto.ligado : undefined;
  const linhas = [
    ...(auto && !ligado ? [{ r: auto, continuar: true }] : []),
    ...espacos.filter((r) => r.espaco === ligado).map((r) => ({ r, continuar: true })),
    ...espacos.filter((r) => r.espaco !== ligado).map((r) => ({ r, continuar: false })),
  ];

  return (
    <main className="inicio">
      <div className="marca">
        <img src="./icone-192.png" alt="" />
        <h1>Proffut</h1>
        <p className="fraco">Seja o técnico.</p>
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

      <button className="botao grande cheio primario" onClick={() => irParaTela("novo")}>
        Novo jogo
      </button>

      {linhas.length > 0 && (
        <div className="coluna" style={{ gap: 6 }}>
          <div className="rotulo-secao">Seus jogos</div>
          <div className="cartao lista jogos-salvos">
            {linhas.map(({ r, continuar }) => (
              <div key={r.espaco} className="item" data-espaco={r.espaco} data-continuar={continuar ? "" : undefined}>
                <button className="linha cresce abrir-jogo" onClick={() => abrir(r)}>
                  {ficha(r.clubeId) && <Escudo clube={ficha(r.clubeId)!} tamanho={34} />}
                  <div className="cresce">
                    <div className="negrito"><span>{r.clube}</span>{continuar && <span className="selo-continuar">Continuar</span>}</div>
                    <div className="mini fraco">{r.tecnico} · {r.temporada} · {formatarData(r.data)}</div>
                    <div className="mini muito-fraco">
                      {r.espaco === "auto" ? "Fora dos espaços" : continuar ? `Espaço ${r.espaco} · salva sozinho` : `Espaço ${r.espaco}`}
                    </div>
                  </div>
                  <span className={`botao pequeno${continuar ? " primario" : ""}`}>{continuar ? "Jogar" : "Abrir"}</span>
                </button>
                <button className="lixeira" onClick={() => apagarSave(r)}
                  aria-label={`Apagar ${r.clube} (${r.espaco === "auto" ? "Continuar" : `Espaço ${r.espaco}`})`}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="botao cheio" onClick={() => arquivo.current?.click()}>Importar save de arquivo</button>
      <input ref={arquivo} type="file" className="oculto" onChange={(e) => importar(e.target.files?.[0])} />

      <a className="link-instagram" href="https://www.instagram.com/proffut.jogo" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
        <span>Siga <b>@proffut.jogo</b></span>
        <span className="botao pequeno">Abrir</span>
      </a>

      <p className="mini muito-fraco centro">
        Clubes e jogadores reais (força calculada pelo jogo). Os escudos pertencem aos clubes. Projeto pessoal, sem fins comerciais.
      </p>
    </main>
  );
}
