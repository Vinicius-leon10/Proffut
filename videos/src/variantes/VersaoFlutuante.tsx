// Versão C do episódio 1: objetos do jogo flutuando em 3D sobre o fundo marfim do jogo (estilo do exemplo "mcvisuals"),
// com títulos curtos em DM Serif e pílulas grossas com sombra.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COR, FONTE, SERIFADA, useFontes } from "../estilo";
import { Icone } from "../pecas";
import { CENAS, VOZ, s } from "./comum";

const TINTA = "#10221a";
const MARFIM = "#f3f3ec";

function useMola(desde: number, rigidez = 140) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - desde, fps, config: { damping: 15, stiffness: rigidez, mass: 0.7 } });
}

/** Flutua devagar para cima e para baixo. */
function Flutua({ children, fase = 0, amplitude = 14, estilo }: { children: ReactNode; fase?: number; amplitude?: number; estilo?: CSSProperties }) {
  const f = useCurrentFrame();
  return <div style={{ transform: `translateY(${Math.sin(f / 22 + fase) * amplitude}px)`, ...estilo }}>{children}</div>;
}

/** Pílula grossa, com espessura embaixo e sombra (como os botões "Solve" e "Create" do exemplo). */
function Pilula({ children, desde, fundo = "white", cor = TINTA, tamanho = 64, estilo }: { children: ReactNode; desde: number; fundo?: string; cor?: string; tamanho?: number; estilo?: CSSProperties }) {
  const m = useMola(desde, 170);
  return (
    <div
      style={{
        fontFamily: FONTE, fontWeight: 800, fontSize: tamanho, color: cor, background: fundo, borderRadius: 999, padding: `${tamanho * 0.35}px ${tamanho * 0.8}px`,
        boxShadow: "0 14px 0 rgba(16,34,26,0.10), 0 40px 70px rgba(16,34,26,0.18), inset 0 2px 0 rgba(255,255,255,0.8)",
        opacity: m, transform: `translateY(${(1 - m) * 120}px) scale(${0.7 + m * 0.3})`, filter: `blur(${(1 - m) * 10}px)`, whiteSpace: "nowrap", ...estilo,
      }}
    >
      {children}
    </div>
  );
}

function Titulo({ texto, desde, estilo }: { texto: string; desde: number; estilo?: CSSProperties }) {
  const m = useMola(desde, 120);
  return (
    <div style={{ fontFamily: SERIFADA, fontSize: 96, lineHeight: 1.08, color: TINTA, textAlign: "center", opacity: m, transform: `translateY(${(1 - m) * 40}px)`, filter: `blur(${(1 - m) * 8}px)`, padding: "0 70px", ...estilo }}>
      {texto}
    </div>
  );
}

/** Cartão inclinado em 3D com sombra. */
function Cartao3D({ children, desde, girar = -14, largura = 920, estilo }: { children: ReactNode; desde: number; girar?: number; largura?: number; estilo?: CSSProperties }) {
  const f = useCurrentFrame();
  const m = useMola(desde, 90);
  return (
    <div style={{ perspective: 2000 }}>
      <div
        style={{
          width: largura, borderRadius: 44, overflow: "hidden", background: "white",
          boxShadow: "0 60px 120px rgba(16,34,26,0.25), 0 10px 24px rgba(16,34,26,0.12)",
          transform: `rotateY(${girar + Math.sin(f / 40) * 4}deg) rotateX(${8 + (1 - m) * 30}deg) translateY(${(1 - m) * 300}px) scale(${0.8 + m * 0.2})`, opacity: m, ...estilo,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const Centro = ({ children, gap = 60 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap }}>{children}</AbsoluteFill>
);

// Cada cena começa no quadro 0 da sua Sequence; os tempos abaixo são relativos ao começo dela.
function C1() {
  const f = useCurrentFrame();
  return (
    <Centro gap={90}>
      <Flutua>
        <div style={{ transform: `rotateY(${Math.sin(f / 30) * 18}deg)`, filter: "drop-shadow(0 50px 60px rgba(16,34,26,0.35))" }}>
          <Icone tamanho={360} desde={0} />
        </div>
      </Flutua>
      <Titulo texto="Eu não sei programar" desde={4} />
      <Pilula desde={s(2.5)} fundo={COR.dourado}>⚽ Criei meu jogo de técnico</Pilula>
    </Centro>
  );
}

function C2() {
  const f = useCurrentFrame();
  const min = Math.floor(interpolate(f, [s(2.0), s(3.6)], [167, 242], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const hora = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return (
    <Centro gap={44}>
      <Titulo texto="Inspirado no" desde={2} />
      <Flutua fase={1}><Pilula desde={s(0.8)} tamanho={110}>Brasfoot</Pilula></Flutua>
      <Flutua fase={2}><Pilula desde={s(2.0)} fundo={TINTA} cor="white" tamanho={90}>🌙 {hora}</Pilula></Flutua>
      <Titulo texto="que eu jogava de madrugada" desde={s(2.2)} estilo={{ fontSize: 64, color: "#55645b" }} />
    </Centro>
  );
}

function C3() {
  return (
    <Centro gap={70}>
      <Titulo texto="Um time pequeno…" desde={s(1.4)} />
      <Flutua><Cartao3D desde={s(1.6)} girar={-10}><Img src={staticFile("telas/linha-ponte.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <Pilula desde={s(3.1)} fundo={COR.dourado} tamanho={84}>⬆ Série A</Pilula>
        <Pilula desde={s(3.0)} tamanho={70} estilo={{ opacity: 0.85 }}>Série B</Pilula>
      </div>
    </Centro>
  );
}

function C4() {
  const f = useCurrentFrame();
  const bandeiras = ["🇧🇷", "🇦🇷", "🇺🇾", "🇨🇴", "🇲🇽", "🇵🇾"];
  return (
    <Centro gap={50}>
      <Titulo texto="No meu iPhone" desde={2} />
      <div style={{ position: "relative" }}>
        <Flutua amplitude={10}>
          <div style={{ perspective: 2200 }}>
            <div style={{ width: 560, borderRadius: 70, border: "14px solid #111", overflow: "hidden", boxShadow: "0 70px 120px rgba(16,34,26,0.35)", transform: `rotateY(${-16 + Math.sin(f / 35) * 5}deg) rotateX(6deg)` }}>
              <Img src={staticFile("telas/09-elenco.png")} style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </Flutua>
        {bandeiras.map((b, k) => {
          const ang = (k / bandeiras.length) * Math.PI * 2 + f / 45;
          const m = Math.min(1, Math.max(0, (f - s(1.4) - k * 4) / 12));
          return <div key={b} style={{ position: "absolute", left: 280 + Math.cos(ang) * 400 - 55, top: 480 + Math.sin(ang) * 520 - 55, fontSize: 110, opacity: m, transform: `scale(${m})`, filter: "drop-shadow(0 16px 20px rgba(0,0,0,0.25))" }}>{b}</div>;
        })}
      </div>
      <Titulo texto="com os jogadores de 2026" desde={s(1.6)} estilo={{ fontSize: 64, color: "#55645b" }} />
    </Centro>
  );
}

function C5() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [s(0.4), s(2.0)], [60, 1008], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - (1 - x) ** 3 }));
  const ids = ["flamengo", "palmeiras", "corinthians", "gremio", "santos", "botafogo", "vasco", "cruzeiro", "bahia", "internacional"];
  return (
    <Centro gap={60}>
      <div style={{ position: "relative", width: 900, height: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {ids.map((id, k) => {
          const ang = (k / ids.length) * Math.PI * 2 - f / 60;
          const m = Math.min(1, Math.max(0, (f - k * 3) / 12));
          return <Img key={id} src={staticFile(`escudos/${id}.png`)} style={{ position: "absolute", left: 450 + Math.cos(ang) * 380 - 70, top: 450 + Math.sin(ang) * 380 - 70, width: 140, height: 140, objectFit: "contain", opacity: m, filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.25))" }} />;
        })}
        <Pilula desde={4} fundo={TINTA} cor={COR.dourado} tamanho={170} estilo={{ fontVariantNumeric: "tabular-nums", letterSpacing: -6 }}>{n.toLocaleString("pt-BR")}</Pilula>
      </div>
      <Titulo texto="clubes da América inteira" desde={s(1.6)} />
    </Centro>
  );
}

function C6() {
  return (
    <Centro gap={60}>
      <Pilula desde={4} fundo={COR.esmeralda} cor="white" tamanho={80}>● Ao vivo</Pilula>
      <Flutua><Cartao3D desde={6} girar={12} largura={980}><OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <Titulo texto="minuto a minuto" desde={s(1.7)} />
    </Centro>
  );
}

function C7() {
  const f = useCurrentFrame();
  const texto = "Coloca a bandeirinha do país ao lado do jogador";
  const letras = Math.floor(interpolate(f, [s(0.6), s(2.4)], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const enviado = f >= s(2.7);
  const caixa = useMola(2, 120);
  return (
    <Centro gap={60}>
      <Titulo texto="Feito com uma IA" desde={2} />
      <div style={{ width: 940, minHeight: 150, borderRadius: 60, background: "white", boxShadow: "0 14px 0 rgba(16,34,26,0.08), 0 40px 80px rgba(16,34,26,0.18)", display: "flex", alignItems: "center", gap: 24, padding: "30px 40px", opacity: caixa, transform: `scale(${0.85 + caixa * 0.15})` }}>
        <span style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 44, color: enviado ? "#9aa59f" : TINTA, flex: 1 }}>
          {enviado ? "Pergunte qualquer coisa" : texto.slice(0, letras)}{!enviado && f % 20 < 10 ? "|" : ""}
        </span>
        <span style={{ width: 90, height: 90, borderRadius: 45, background: TINTA, color: "white", fontSize: 50, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${f >= s(2.5) && f < s(2.7) ? 0.85 : 1})` }}>↑</span>
      </div>
      {enviado && <Pilula desde={s(2.8)} fundo={COR.esmeralda} cor="white" tamanho={64}>✓ Pronto · 97 testes passando</Pilula>}
      <Titulo texto="pedindo tudo em português" desde={s(3.0)} estilo={{ fontSize: 64, color: "#55645b" }} />
    </Centro>
  );
}

function C8() {
  const f = useCurrentFrame();
  const toque = f - s(6.0);
  return (
    <Centro gap={44}>
      <Titulo texto="Vou mostrar tudo:" desde={4} />
      <Flutua fase={0}><Pilula desde={s(2.1)} tamanho={76}>✅ o que deu certo</Pilula></Flutua>
      <Flutua fase={1.5}><Pilula desde={s(3.1)} tamanho={76}>❌ o que deu muito errado</Pilula></Flutua>
      <div style={{ height: 40 }} />
      <Flutua fase={3}>
        <Pilula desde={s(5.3)} fundo={COR.dourado} tamanho={70} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
          Segue para acompanhar
        </Pilula>
      </Flutua>
      <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, Math.max(0, (f - s(5.6)) / 10)) }}>
        <Icone tamanho={90} desde={s(5.6)} />
        <span style={{ fontFamily: SERIFADA, fontSize: 90, color: TINTA }}>Proffut</span>
      </div>
    </Centro>
  );
}

const PARTES = [C1, C2, C3, C4, C5, C6, C7, C8];

export function VersaoFlutuante() {
  useFontes();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, #ffffff 0%, ${MARFIM} 55%, #e6e7dc 100%)` }}>
      {PARTES.map((Parte, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Saida duracao={ate - de}><Parte /></Saida>
          </Sequence>
        );
      })}
      <Audio src={staticFile(VOZ)} />
    </AbsoluteFill>
  );
}

/** Saída de cada cena: some com desfoque e sobe um pouco. */
function Saida({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const v = interpolate(f, [duracao - 8, duracao], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: v, filter: `blur(${(1 - v) * 18}px)`, transform: `translateY(${(1 - v) * -60}px)` }}>{children}</AbsoluteFill>;
}
