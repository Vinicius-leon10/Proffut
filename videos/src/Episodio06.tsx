// Episódio 6: "O visual novo e a hora que sumiu" (o topo do iPhone, R32). Modelo da Versão D com o padrão (padrao.tsx).
// Sem voz: o usuário põe a voz no CapCut com o texto de FALAS.
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { COR, FONTE, Fundo, SERIFADA, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";
import { Legenda } from "./variantes/comum";
import { Cartao3D, Flutua, Pilula } from "./variantes/VersaoFlutuante";
import { Plano } from "./variantes/VersaoMural";
import { Flashes, Sons, Troca, palavrasDasCenas, s } from "./padrao";

const TINTA = "#10221a";
const CENAS = [0, 4.2, 9.4, 15.0, 18.8, 24.2, 31.0, 35.0, 38.4];
export const DURACAO_EP06 = s(CENAS[CENAS.length - 1]);

export const FALAS = [
  "Mudei o visual inteiro do meu jogo. E a hora do meu iPhone sumiu.",
  "Fiz um visual novo, claro, com verde e dourado. Ficou lindo.",
  "Mas no iPhone, a hora e a bateria ficaram pretas em cima do verde,",
  "e apareceu uma névoa branca no topo.",
  "O motivo: o iPhone escolhe a cor da hora olhando a página inteira.",
  "A solução foi dizer ao iPhone que a página é escura, e pintar as telas claras por cima.",
  "Hoje o topo fica verde, com a hora branca, em todas as telas.",
  "Segue para ver o próximo episódio.",
];
const PALAVRAS = palavrasDasCenas(CENAS, FALAS);

const EFEITOS: [number, string, number][] = [
  [2.4, "boom", 0.7], [2.5, "vaia", 0.2],
  ...[0, 1, 2].map((i) => [4.2 + 1.6 + i * 0.6, "tecla", 0.6] as [number, string, number]),
  [4.2 + 3.8, "torcida", 0.25],
  [9.4 + 1.2, "boom", 0.55],
  [15.0 + 0.4, "drone", 0.35],
  [18.8 + 0.4, "tique", 0.45], [18.8 + 3.0, "boom", 0.5],
  [24.2 + 1.0, "tecla", 0.6], [24.2 + 3.4, "riser", 0.35], [24.2 + 5.6, "boom", 0.6],
  [31.0 + 0.6, "torcida", 0.3], [31.0 + 0.7, "apito", 0.3],
  [35.0 + 0.4, "boom", 0.6], [35.0 + 1.6, "tecla", 0.6],
];

export function Episodio06() {
  useFontes();
  const partes = [Gancho, VisualNovo, HoraPreta, Nevoa, Motivo, Solucao, Hoje, Final];
  return (
    <AbsoluteFill style={{ fontFamily: FONTE }}>
      <Fundo />
      {partes.map((Parte, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Troca duracao={ate - de}><Parte /></Troca>
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,21,14,0) 55%, rgba(6,21,14,0.85) 75%)" }} />
      <Legenda palavras={PALAVRAS} estilo={{ top: 1310 }} tamanho={100} />
      <Flashes cenas={CENAS} />
      <Sons cenas={CENAS} efeitos={EFEITOS} />
    </AbsoluteFill>
  );
}

const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 640 }}>{children}</AbsoluteFill>
);

/** O alto de um iPhone com o topo verde do jogo: a hora e a bateria (pretas ou brancas) e a névoa branca por cima. */
function TopoIphone({ corHora, nevoa = 0, largura = 900 }: { corHora: string; nevoa?: number; largura?: number }) {
  return (
    <div style={{ width: largura, borderRadius: "90px 90px 30px 30px", background: "#0b0b0b", padding: "18px 18px 0", boxShadow: "0 50px 120px rgba(0,0,0,0.7), 0 0 0 3px #2a2a2a" }}>
      <div style={{ position: "relative", height: 420, borderRadius: "74px 74px 0 0", overflow: "hidden", background: "#f3f3ec" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 280, background: COR.floresta }} />
        <Img src={staticFile("telas/08-painel.png")} style={{ position: "absolute", left: 0, right: 0, top: 70, width: "100%", opacity: 0.95 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, background: COR.floresta }} />
        <div style={{ position: "absolute", top: 18, left: "50%", width: 230, height: 62, marginLeft: -115, borderRadius: 31, background: "#000" }} />
        <div style={{ position: "absolute", left: 70, top: 24, fontFamily: FONTE, fontWeight: 800, fontSize: 48, color: corHora }}>21:27</div>
        <div style={{ position: "absolute", right: 64, top: 26, display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 34, color: corHora }}>●●●</span>
          <span style={{ width: 66, height: 32, borderRadius: 9, border: `4px solid ${corHora}`, display: "inline-block" }} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, background: `linear-gradient(180deg, rgba(255,255,255,${0.85 * nevoa}) 0%, rgba(255,255,255,0) 100%)` }} />
      </div>
    </div>
  );
}

function Gancho() {
  const f = useCurrentFrame();
  const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.cubic) };
  const cx = interpolate(f, [0, 60, 125], [1900, 1200, 600], op);
  const cy = interpolate(f, [0, 60, 125], [1100, 600, 500], op);
  const z = interpolate(f, [0, 125], [1.0, 1.25], op);
  const selo = useMola(s(2.3), 240);
  return (
    <AbsoluteFill style={{ perspective: 2600, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translateY(-260px)" }}>
        <Plano cx={cx} cy={cy} z={z} inclinacao={22 + Math.sin(f / 30) * 3} />
      </div>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 640 }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 92, color: "white", background: COR.vermelho, borderRadius: 28, padding: "18px 44px", transform: `rotate(-8deg) scale(${2 - selo})`, opacity: selo, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          🕐 A HORA SUMIU?
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function VisualNovo() {
  const cor = (c: string, nome: string, desde: number, claro = false) => {
    const m = useMola(desde, 200);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: m, transform: `scale(${m})` }}>
        <span style={{ width: 130, height: 130, borderRadius: 65, background: c, border: claro ? "4px solid rgba(255,255,255,0.3)" : "none", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }} />
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 36, color: "white" }}>{nome}</span>
      </div>
    );
  };
  return (
    <Palco gap={50}>
      <Flutua><Cartao3D desde={s(0.2)} girar={-10} largura={640}><Img src={staticFile("telas/08-painel.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <div style={{ display: "flex", gap: 50 }}>
        {cor("#f3f3ec", "Marfim", s(1.6), true)}
        {cor(COR.floresta, "Verde", s(2.2), true)}
        {cor(COR.dourado, "Dourado", s(2.8))}
      </div>
    </Palco>
  );
}

function HoraPreta() {
  const f = useCurrentFrame();
  const escurece = interpolate(f, [s(1.0), s(1.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = Math.round(255 * (1 - escurece));
  return (
    <Palco gap={50}>
      <TopoIphone corHora={`rgb(${v},${v},${v})`} />
      <Flutua><Pilula desde={s(1.4)} fundo={COR.vermelho} cor="white" tamanho={66}>⚫ Hora preta no verde</Pilula></Flutua>
    </Palco>
  );
}

function Nevoa() {
  const f = useCurrentFrame();
  const n = interpolate(f, [s(0.3), s(1.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Palco gap={50}>
      <TopoIphone corHora="#000" nevoa={n} />
      <Flutua><Pilula desde={s(1.2)} tamanho={66}>🌫️ Névoa branca no topo</Pilula></Flutua>
    </Palco>
  );
}

function Motivo() {
  const f = useCurrentFrame();
  const x = interpolate(f, [s(0.5), s(4.0)], [-260, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  return (
    <Palco gap={40}>
      <div style={{ position: "relative" }}>
        <Cartao3D desde={s(0.1)} girar={0} largura={560}><Img src={staticFile("telas/08-painel.png")} style={{ width: "100%", display: "block" }} /></Cartao3D>
        <div style={{ position: "absolute", left: "50%", top: "40%", fontSize: 220, transform: `translate(calc(-50% + ${x}px), -50%)`, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.6))" }}>🔍</div>
      </div>
      <Pilula desde={s(2.6)} fundo={COR.dourado} tamanho={58}>O iPhone olha a página inteira</Pilula>
    </Palco>
  );
}

function Solucao() {
  const f = useCurrentFrame();
  const liga = f > s(1.0);
  const branco = interpolate(f, [s(4.0), s(4.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = Math.round(255 * branco);
  return (
    <Palco gap={44}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, background: COR.cartao, border: "2px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "22px 40px" }}>
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 50, color: "white" }}>Página escura</span>
        <span style={{ width: 130, height: 72, borderRadius: 36, background: liga ? COR.esmeralda : "rgba(255,255,255,0.25)", position: "relative", transition: "none" }}>
          <span style={{ position: "absolute", top: 6, left: liga ? 64 : 6, width: 60, height: 60, borderRadius: 30, background: "white" }} />
        </span>
      </div>
      <TopoIphone corHora={`rgb(${v},${v},${v})`} largura={820} />
      <Flutua><Pilula desde={s(3.0)} tamanho={56}>🎨 Telas claras pintadas por cima</Pilula></Flutua>
    </Palco>
  );
}

function Hoje() {
  const ok = useMola(s(1.0), 220);
  return (
    <Palco gap={50}>
      <TopoIphone corHora="#fff" />
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Pilula desde={s(0.6)} fundo={COR.esmeralda} cor="white" tamanho={66}>Hora branca no verde</Pilula>
        <span style={{ fontSize: 110, transform: `scale(${ok})` }}>✅</span>
      </div>
    </Palco>
  );
}

function Final() {
  const f = useCurrentFrame();
  const toque = f - s(1.6);
  const brilho = 0.5 + Math.sin(f / 6) * 0.5;
  return (
    <Palco gap={46}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, filter: `drop-shadow(0 0 ${20 + brilho * 30}px rgba(245,199,44,0.4))` }}>
        <Icone tamanho={120} desde={2} />
        <span style={{ fontFamily: SERIFADA, fontSize: 120, color: "white" }}>Proffut</span>
      </div>
      <Pilula desde={s(0.4)} fundo="rgba(255,255,255,0.1)" cor="white" tamanho={54}>Próximo: 🎙️ o narrador robô</Pilula>
      <Pilula desde={s(1.2)} fundo={COR.dourado} cor={TINTA} tamanho={62} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
        Segue para acompanhar
        {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
      </Pilula>
    </Palco>
  );
}
