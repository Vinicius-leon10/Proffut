// Versão A do episódio 1: mural de cartões do jogo em 3D, com a câmera passeando de um cartão para o outro
// (estilo do exemplo "refined.motion"). Fundo claro; legenda pequena embaixo.
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, SERIFADA, useFontes } from "../estilo";
import { Icone } from "../pecas";
import { CENAS, Legenda, VOZ, s } from "./comum";

type Cartao = { x: number; y: number; w: number; h: number; escuro?: boolean; conteudo: ReactNode };

function Contador() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [s(18.7), s(20.4)], [60, 1008], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 220, color: COR.dourado, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("pt-BR")}</div>
      <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 70, color: "white" }}>clubes</div>
    </div>
  );
}

function SerieAB() {
  const f = useCurrentFrame();
  const a = interpolate(f, [s(11.7), s(12.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pilula = (t: string, fundo: string, cor: string) => (
    <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 80, background: fundo, color: cor, borderRadius: 30, padding: "16px 40px" }}>{t}</span>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
      {pilula("Série B", "#e3e6df", "#10221a")}
      <span style={{ fontSize: 110, color: COR.esmeralda, transform: `translateY(${(1 - a) * 40}px)`, opacity: 0.3 + a * 0.7 }}>⬆</span>
      {pilula("Série A", COR.dourado, "#10221a")}
    </div>
  );
}

function Conversa() {
  const f = useCurrentFrame();
  const resposta = f >= s(27.6);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, width: "100%", padding: "0 50px" }}>
      <div style={{ alignSelf: "flex-end", background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 700, fontSize: 46, padding: "26px 34px", borderRadius: "40px 40px 10px 40px", maxWidth: 760 }}>
        Coloca a bandeirinha do país ao lado do jogador
      </div>
      <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.12)", color: "white", fontFamily: FONTE, fontWeight: 700, fontSize: 46, padding: "26px 34px", borderRadius: "40px 40px 40px 10px", maxWidth: 800 }}>
        {resposta ? <>Pronto! 🇧🇷 🇦🇷 🇺🇾 <span style={{ color: COR.esmeralda }}>97 testes ✓</span></> : "· · ·"}
      </div>
    </div>
  );
}

const img = (src: string) => <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;

const CARTOES: Cartao[] = [
  { x: 100, y: 100, w: 620, h: 620, escuro: true, conteudo: <Icone tamanho={380} desde={-30} /> },
  { x: 780, y: 100, w: 700, h: 740, conteudo: img("telas/cartao-paises.png") },
  { x: 1540, y: 100, w: 1000, h: 158, conteudo: img("telas/linha-ponte.png") },
  { x: 1540, y: 300, w: 1000, h: 300, conteudo: <SerieAB /> },
  { x: 100, y: 780, w: 620, h: 520, conteudo: img("telas/cartao-elenco.png") },
  { x: 780, y: 900, w: 700, h: 520, escuro: true, conteudo: <Contador /> },
  { x: 1540, y: 660, w: 1000, h: 692, conteudo: <OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "100%", display: "block" }} /> },
  { x: 100, y: 1360, w: 1000, h: 560, escuro: true, conteudo: <Conversa /> },
  { x: 1160, y: 1420, w: 1000, h: 477, conteudo: img("telas/cartao-estatisticas.png") },
  { x: 100, y: 1980, w: 900, h: 860, conteudo: img("telas/cartao-tabela.png") },
  { x: 1060, y: 1960, w: 1000, h: 660, conteudo: img("telas/cartao-proximo.png") },
];
const LARGURA = 2640;
const ALTURA = 2900;

/** Para onde a câmera olha em cada cena: centro (x, y) no mural e aproximação. */
const ALVOS: [number, number, number][] = [
  [410, 410, 1.15], // ícone
  [1130, 470, 1.05], // países
  [2040, 330, 0.85], // time pequeno, Série B → A
  [410, 1040, 1.45], // elenco
  [1130, 1160, 1.1], // 1.008 clubes
  [2040, 1006, 0.9], // partida ao vivo
  [600, 1640, 0.9], // conversa com a IA
  [LARGURA / 2, ALTURA / 2, 0.36], // mural inteiro
];

export function VersaoMural() {
  useFontes();
  const f = useCurrentFrame();
  const t = f / 30;
  let i = 0;
  while (i < ALVOS.length - 1 && t >= CENAS[i + 1]) i++;
  const anterior = ALVOS[Math.max(0, i - 1)];
  const alvo = ALVOS[i];
  const k = i === 0 ? 1 : interpolate(f, [s(CENAS[i]) - 6, s(CENAS[i]) + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const [cx, cy, z] = anterior.map((v, n) => v + (alvo[n] - v) * k);
  const flutua = Math.sin(f / 40) * 2;
  const fim = interpolate(f, [s(CENAS[7]) + 30, s(CENAS[7]) + 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #f7f8f5 0%, #dfe3dc 75%)", perspective: 2600, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: LARGURA, height: ALTURA, transformOrigin: "0 0",
          transform: `translate(540px, 900px) rotateX(${24 + flutua}deg) rotateZ(-12deg) scale(${z}) translate(${-cx}px, ${-cy}px)`,
        }}
      >
        {CARTOES.map((c, n) => (
          <div
            key={n}
            style={{
              position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, borderRadius: 48, overflow: "hidden",
              background: c.escuro ? COR.floresta : "#fbfbf7", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 50px 90px rgba(16,34,26,0.22), 0 8px 18px rgba(16,34,26,0.12)",
            }}
          >
            {c.conteudo}
          </div>
        ))}
      </div>
      <Legenda estilo={{ top: 1560 }} tamanho={74} max={4} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fim, background: `rgba(6,21,14,${0.55 * fim})`, gap: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Icone tamanho={150} desde={s(CENAS[7]) + 30} />
          <span style={{ fontFamily: SERIFADA, fontSize: 150, color: "white" }}>Proffut</span>
        </div>
        <div style={{ background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 800, fontSize: 58, borderRadius: 999, padding: "30px 70px" }}>Segue para acompanhar</div>
      </AbsoluteFill>
      <Audio src={staticFile(VOZ)} />
    </AbsoluteFill>
  );
}
