// Stories do Instagram (1080 × 1920, imagem parada): o visual dos vídeos com uma tela do jogo num iPhone. Cada story é
// um quadro da composição "Stories" (quadro 0, 1, 2...). Deixa espaço embaixo para as figurinhas (enquete, link).
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";

type Story = { selo: string; titulo: string; sub?: string; tela?: string; figurinha?: string };
export const STORIES: Story[] = [
  { selo: "🆕 NOVIDADE", titulo: "A Europa chegou ao jogo 🇪🇺", sub: "7 ligas · 132 clubes · jogadores reais", tela: "paises.png" },
  { selo: "🏆 CHAMPIONS", titulo: "Liga dos Campeões dentro do Proffut", sub: "Grupos, mata-mata e final", tela: "champions.png" },
  { selo: "🗳️ ENQUETE", titulo: "Qual time você assumiria primeiro?", tela: "inglaterra.png", figurinha: "Coloque aqui a enquete" },
  { selo: "🎬 EPISÓDIO 5", titulo: "Os jogadores reais", sub: "Bastidores do jogo, já no ar", figurinha: "Coloque aqui o link do Reels" },
];

export function Stories() {
  useFontes();
  const st = STORIES[useCurrentFrame()] ?? STORIES[0];
  const comTela = !!st.tela;
  return (
    <AbsoluteFill style={{ fontFamily: FONTE, alignItems: "center", padding: "150px 70px 0" }}>
      <Fundo />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 34, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Icone tamanho={70} desde={-30} />
          <span style={{ fontFamily: SERIFADA, fontSize: 64, color: "white" }}>Proffut</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 40, letterSpacing: 3, color: "#10221a", background: COR.dourado, borderRadius: 999, padding: "12px 34px" }}>{st.selo}</span>
        <div style={{ fontWeight: 900, fontSize: comTela ? 82 : 120, lineHeight: 1.08, color: "white", textAlign: "center", letterSpacing: -1 }}>{st.titulo}</div>
        {st.sub && <div style={{ fontWeight: 700, fontSize: 44, color: COR.fraco, textAlign: "center" }}>{st.sub}</div>}
        {comTela && (
          <div style={{ marginTop: 10, width: 560, borderRadius: 64, background: "#0b0b0b", padding: 14, boxShadow: "0 50px 120px rgba(0,0,0,0.7), 0 0 0 3px #2a2a2a", transform: "rotate(-3deg)" }}>
            <div style={{ borderRadius: 52, overflow: "hidden", height: 880 }}>
              <Img src={staticFile(`stories/${st.tela}`)} style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        )}
        {!comTela && <div style={{ fontSize: 300, marginTop: 40 }}>⚽</div>}
      </div>
    </AbsoluteFill>
  );
}
