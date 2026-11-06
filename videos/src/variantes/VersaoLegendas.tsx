// Versão B do episódio 1: legenda grande palavra por palavra (estilo do exemplo "descomplica_ia"), com as telas do jogo
// ao fundo, aproximando devagar.
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, SERIFADA, useFontes } from "../estilo";
import { Icone } from "../pecas";
import { CENAS, Legenda, VOZ, s } from "./comum";

/** Uma tela do jogo ocupando o fundo, com aproximação lenta (efeito Ken Burns). */
function TelaDeFundo({ src, foco = "50% 30%", de = 1.05, ate = 1.18 }: { src: string; foco?: string; de?: number; ate?: number }) {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 150], [de, ate], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: foco, transform: `scale(${z})`, transformOrigin: foco }} />
    </AbsoluteFill>
  );
}

function Escudos() {
  const f = useCurrentFrame();
  const ids = ["flamengo", "palmeiras", "corinthians", "sao-paulo", "fluminense", "atletico-mg", "internacional", "gremio", "santos", "botafogo", "vasco", "cruzeiro", "athletico-pr", "bahia", "coritiba", "red-bull-bragantino", "chapecoense", "mirassol", "remo", "vitoria"];
  return (
    <AbsoluteFill style={{ background: COR.fundo1, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: 40, padding: 50 }}>
      {[...ids, ...ids].slice(0, 30).map((id, i) => {
        const a = interpolate(f, [i * 1.5, i * 1.5 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <Img key={i} src={staticFile(`escudos/${id}.png`)} style={{ width: 170, height: 170, objectFit: "contain", opacity: a, transform: `scale(${0.6 + a * 0.4})` }} />;
      })}
    </AbsoluteFill>
  );
}

function Partida() {
  return (
    <AbsoluteFill style={{ background: COR.fundo1, justifyContent: "center", alignItems: "center" }}>
      <OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "140%", transform: "translateY(-180px)" }} />
    </AbsoluteFill>
  );
}

function Fim() {
  return (
    <AbsoluteFill style={{ background: COR.fundo1, alignItems: "center", justifyContent: "flex-start", paddingTop: 300, gap: 40 }}>
      <Icone tamanho={260} desde={0} />
      <div style={{ fontFamily: SERIFADA, fontSize: 150, color: "white" }}>Proffut</div>
    </AbsoluteFill>
  );
}

const FUNDOS = [
  () => <TelaDeFundo src="telas/01-inicio.png" foco="50% 20%" />,
  () => <TelaDeFundo src="telas/04-paises.png" foco="50% 60%" />,
  () => <TelaDeFundo src="telas/06-clube.png" foco="50% 50%" de={1.1} ate={1.35} />,
  () => <TelaDeFundo src="telas/09-elenco.png" foco="50% 55%" />,
  () => <Escudos />,
  () => <Partida />,
  () => <TelaDeFundo src="telas/08-painel.png" foco="50% 30%" />,
  () => <Fim />,
];

export function VersaoLegendas() {
  useFontes();
  return (
    <AbsoluteFill style={{ background: "black" }}>
      {FUNDOS.map((Fundo, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Fundo />
          </Sequence>
        );
      })}
      {/* Escurece o fundo embaixo da legenda. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)" }} />
      <Legenda estilo={{ top: 1180 }} tamanho={104} />
      <Audio src={staticFile(VOZ)} />
    </AbsoluteFill>
  );
}
