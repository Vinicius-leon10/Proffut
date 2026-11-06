// Peças visuais comuns dos vídeos do Proffut (cores do jogo: verde-floresta e dourado).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const COR = {
  fundo1: "#06150e", fundo2: "#123524", floresta: "#143826", dourado: "#f5c72c", esmeralda: "#34b777",
  vermelho: "#e5484d", texto: "#ffffff", fraco: "rgba(255,255,255,0.62)", cartao: "rgba(255,255,255,0.07)",
};
export const FONTE = "Inter, sans-serif";
export const SERIFADA = "'DM Serif Display', serif";

/** Carrega as fontes locais antes de desenhar o primeiro quadro. */
export function useFontes() {
  const [pronto] = useState(() => delayRender("fontes"));
  useEffect(() => {
    const fontes = [
      new FontFace("Inter", `url(${staticFile("fontes/inter-latin-600-normal.woff2")})`, { weight: "600" }),
      new FontFace("Inter", `url(${staticFile("fontes/inter-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Inter", `url(${staticFile("fontes/inter-latin-900-normal.woff2")})`, { weight: "900" }),
      new FontFace("DM Serif Display", `url(${staticFile("fontes/dm-serif-display-latin-400-normal.woff2")})`),
    ];
    Promise.all(fontes.map((f) => f.load())).then((carregadas) => {
      carregadas.forEach((f) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(f));
      continueRender(pronto);
    });
  }, [pronto]);
}

/** Fundo escuro com um brilho verde que anda devagar. */
export function Fundo() {
  const f = useCurrentFrame();
  const x = 50 + Math.sin(f / 90) * 18;
  const y = 38 + Math.cos(f / 110) * 12;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, ${COR.fundo2} 0%, ${COR.fundo1} 62%)`,
      }}
    />
  );
}

/** Entrada e saída da cena: desfoque, escala e opacidade (como no exemplo do usuário). */
export function Cena({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const entrada = interpolate(f, [0, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const saida = interpolate(f, [duracao - 8, duracao], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = Math.min(entrada, saida);
  return (
    <AbsoluteFill
      style={{
        opacity: v,
        filter: `blur(${(1 - v) * 22}px)`,
        transform: `scale(${1 + (1 - entrada) * 0.06 - (1 - saida) * 0.04})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Entrada com mola a partir de um quadro: devolve de 0 a 1. */
export function useMola(desde: number, rigidez = 140) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - desde, fps, config: { damping: 16, stiffness: rigidez, mass: 0.7 } });
}

/** Texto que entra palavra por palavra (sobe e aparece). */
export function Palavras({ texto, desde, estilo, cor = COR.texto, passo = 3 }: { texto: string; desde: number; estilo?: CSSProperties; cor?: string; passo?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.28em", ...estilo }}>
      {texto.split(" ").map((p, i) => {
        const m = spring({ frame: f - desde - i * passo, fps, config: { damping: 15, stiffness: 160, mass: 0.6 } });
        return (
          <span key={i} style={{ color: cor, opacity: m, transform: `translateY(${(1 - m) * 40}px)`, filter: `blur(${(1 - m) * 8}px)`, display: "inline-block" }}>
            {p}
          </span>
        );
      })}
    </div>
  );
}

/** Etiqueta dourada (como o "R$ 7,77" do exemplo). */
export function Selo({ children, desde, fundo = COR.dourado, cor = "#10221a", estilo }: { children: ReactNode; desde: number; fundo?: string; cor?: string; estilo?: CSSProperties }) {
  const m = useMola(desde, 180);
  return (
    <span
      style={{
        display: "inline-block", background: fundo, color: cor, borderRadius: 18, padding: "6px 22px",
        transform: `scale(${0.6 + m * 0.4})`, opacity: m, ...estilo,
      }}
    >
      {children}
    </span>
  );
}

export const titulo: CSSProperties = { fontFamily: FONTE, fontWeight: 800, fontSize: 78, lineHeight: 1.15, color: COR.texto, textAlign: "center", letterSpacing: -1 };
