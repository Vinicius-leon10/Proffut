// Story do Instagram: convite para testar o jogo (os 5 primeiros que mandarem direct). 1080 × 1920, um quadro.
import { AbsoluteFill } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";
import { Celular, Selo, Titulo } from "./StoriesFolhaCara";

export function StoryAcesso() {
  useFontes();
  return (
    <AbsoluteFill style={{ fontFamily: FONTE, alignItems: "center", padding: "130px 70px 0" }}>
      <Fundo />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Icone tamanho={64} desde={-30} />
          <span style={{ fontFamily: SERIFADA, fontSize: 58, color: "white" }}>Proffut</span>
        </div>
        <Selo>🎟️ ACESSO ANTECIPADO</Selo>
        <Titulo tamanho={92}>Quer jogar o <span style={{ color: COR.dourado }}>Proffut</span> antes de todo mundo?</Titulo>
        <div style={{ position: "relative", marginTop: 6 }}>
          <Celular tela="nov-painel.png" altura={620} giro={-3} largura={460} />
          <div style={{ position: "absolute", right: -170, top: 200, transform: "rotate(7deg)", background: COR.dourado, color: "#10221a", borderRadius: 36, padding: "20px 34px", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", fontWeight: 900 }}>
            <div style={{ fontSize: 120, lineHeight: 1 }}>5</div>
            <div style={{ fontSize: 34 }}>vagas</div>
          </div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 62, color: "white", textAlign: "center", lineHeight: 1.15 }}>
          Manda <span style={{ color: COR.dourado }}>"QUERO"</span> no direct 📩
        </div>
        <div style={{ fontWeight: 700, fontSize: 40, color: COR.fraco, textAlign: "center" }}>Só os 5 primeiros ganham acesso</div>
      </div>
    </AbsoluteFill>
  );
}
