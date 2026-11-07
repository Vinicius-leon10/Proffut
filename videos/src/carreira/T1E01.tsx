// "Do zero ao topo", temporada do Santa Cruz (semente 2), episódio 1: "A proposta". Estilo de trailer de cinema: abertura
// fria no momento mais tenso, barras pretas, cores frias na tensão, efeitos sonoros (public/sfx, feitos com ffmpeg).
// Os números (26.722, 7 x 0, 90+1, dois expulsos) são da temporada simulada (videos/carreira/dados/temporada.json).
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, SERIFADA, useFontes, useMola } from "../estilo";
import { Legenda } from "../variantes/comum";
import { Pilula } from "../variantes/VersaoFlutuante";
import palavras from "./palavras-t1e01.json";

const s = (seg: number) => Math.round(seg * 30);
const PALAVRAS = palavras as { p: string; i: number; f: number }[];
export const DURACAO_T1E01 = s(42.6);
const TINTA = "#10221a";
const FRIO = "#0b1620";

/** Um efeito sonoro em `seg` segundos. */
const Som = ({ arquivo, em, volume = 0.6 }: { arquivo: string; em: number; volume?: number }) => (
  <Sequence from={s(em)} durationInFrames={s(4)}><Audio src={staticFile(`sfx/${arquivo}.wav`)} volume={volume} /></Sequence>
);

const SONS: [string, number, number?][] = [
  ...[0, 0.9, 1.8, 2.7, 3.6, 4.5].map((t) => ["coracao", t, 0.9] as [string, number, number]),
  ["tique", 2.04, 0.5], ["tique", 2.55, 0.5], ["tique", 3.05, 0.5],
  ["boom", 4.98, 0.9], ["whoosh", 5.8], ...[8.1, 8.2, 8.32, 8.41, 8.55, 8.66].map((t) => ["tecla", t, 0.5] as [string, number, number]), ["whoosh", 8.9],
  ["boom", 9.36, 0.9], ["torcida", 10.7, 0.35], ["drone", 13.2, 0.6],
  ["whoosh", 15.3], ...[15.8, 15.9, 16.05, 16.2, 16.3, 16.45, 16.6].map((t) => ["tecla", t, 0.4] as [string, number, number]),
  ["boom", 19.26, 0.8], ["boom", 21.77, 0.9], ["riser", 23.4, 0.7],
  ["boom", 26.46, 0.9], ["apito", 26.46, 0.45], ["boom", 27.76, 0.9], ["torcida", 28.57, 0.5],
  ["coracao", 30.0, 0.9], ["coracao", 30.9, 0.9], ["coracao", 31.8, 0.9], ["tique", 30.34, 0.5], ["tique", 30.75, 0.5], ["tique", 31.29, 0.5],
  ["whoosh", 33.7], ["boom", 36.42, 1], ["torcida", 36.5, 0.3], ["apito", 38.2, 0.3],
  ...[39.05, 39.15, 39.28, 39.4, 39.52, 39.66, 39.8, 39.92].map((t) => ["tecla", t, 0.45] as [string, number, number]),
];

const Centro = ({ children, gap = 40, estilo }: { children: ReactNode; gap?: number; estilo?: CSSProperties }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 420, ...estilo }}>{children}</AbsoluteFill>
);
const Numero = ({ children, cor = "white", tamanho = 260, estilo }: { children: ReactNode; cor?: string; tamanho?: number; estilo?: CSSProperties }) => (
  <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: tamanho, color: cor, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums", ...estilo }}>{children}</div>
);

/** Entrada de impacto: começa grande e desfocada e assenta. */
function Impacto({ desde, children }: { desde: number; children: ReactNode }) {
  const m = useMola(desde, 260);
  return <div style={{ opacity: m, transform: `scale(${1.6 - m * 0.6})`, filter: `blur(${(1 - m) * 14}px)` }}>{children}</div>;
}

// 0–6 s: abertura fria (26 mil, 90+1, "acabar com tudo").
function AberturaFria() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [0, s(1.2)], [0, 26722], { extrapolateRight: "clamp" }));
  const flash = interpolate(f, [s(4.98), s(5.05), s(5.6)], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: FRIO }}>
      <Centro gap={60}>
        <Numero cor="#cfe3ff">{n.toLocaleString("pt-BR")}</Numero>
        {f >= s(2.0) && <Impacto desde={s(2.0)}><Numero cor="#ff5a5f" tamanho={200}>90+1'</Numero></Impacto>}
      </Centro>
      <AbsoluteFill style={{ background: COR.vermelho, opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
}

// 6–9,1 s: "Mas essa história começa antes. Em janeiro."
function Janeiro() {
  const f = useCurrentFrame();
  const texto = "JANEIRO · 2026";
  const letras = Math.floor(interpolate(f, [s(2.0), s(2.7)], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ background: "#0d1a14" }}>
      <Centro>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 120, color: COR.dourado, letterSpacing: 6 }}>{texto.slice(0, letras)}<span style={{ opacity: f % 16 < 8 ? 1 : 0 }}>|</span></div>
      </Centro>
    </AbsoluteFill>
  );
}

// 9,1–15,5 s: o Santa Cruz (torcida gigante, longe da elite).
function OClube() {
  const f = useCurrentFrame();
  const escudo = useMola(s(0.25), 90);
  const frio = interpolate(f, [s(4.0), s(4.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ filter: `saturate(${1 - frio * 0.6}) brightness(${1 - frio * 0.2})` }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, rgba(229,72,77,${0.35 * escudo}) 0%, #120a0a 55%)` }} />
      <Centro gap={50}>
        <div style={{ transform: `scale(${0.6 + escudo * 0.4}) rotateY(${(1 - escudo) * 90}deg)`, opacity: escudo, filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.7))" }}>
          <Img src={staticFile("escudos/santa-cruz.png")} style={{ width: 420, height: 420, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Pilula desde={s(1.6)} tamanho={56}>🔥 Torcida gigante</Pilula>
          <Pilula desde={s(4.1)} fundo="rgba(255,255,255,0.12)" cor="white" tamanho={56}>Série C</Pilula>
        </div>
      </Centro>
    </AbsoluteFill>
  );
}

// 15,5–21,5 s: a proposta da diretoria (mensagem e contrato com o objetivo).
function Proposta() {
  const f = useCurrentFrame();
  const msg = useMola(s(0.2), 140);
  const texto = "Diretoria do Santa Cruz: temos uma proposta para você.";
  const letras = Math.floor(interpolate(f, [s(0.3), s(1.3)], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const contrato = useMola(s(2.4), 110);
  return (
    <AbsoluteFill style={{ background: "#0d1a14" }}>
      <Centro gap={50}>
        <div style={{ width: 900, background: "white", borderRadius: 40, padding: "30px 36px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", opacity: msg, transform: `translateY(${(1 - msg) * -200}px)`, fontFamily: FONTE, fontWeight: 600, fontSize: 44, color: TINTA }}>
          <div style={{ fontWeight: 800, fontSize: 34, color: "#55645b", marginBottom: 8 }}>📩 Nova mensagem</div>
          {texto.slice(0, letras)}
        </div>
        <div style={{ width: 860, background: "#f3efe2", borderRadius: 18, padding: "44px 50px", boxShadow: "0 40px 90px rgba(0,0,0,0.7)", opacity: contrato, transform: `rotate(${-3 + (1 - contrato) * -12}deg) translateY(${(1 - contrato) * 300}px)`, position: "relative" }}>
          <div style={{ fontFamily: SERIFADA, fontSize: 64, color: TINTA }}>Contrato de técnico</div>
          <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 38, color: "#55645b", marginTop: 14 }}>Santa Cruz Futebol Clube · 2026</div>
          <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 44, color: TINTA, marginTop: 30 }}>Objetivo:</div>
          {f >= s(3.76) && <Carimbo desde={s(3.76)} cor={COR.dourado} texto="TOP 4 DA SÉRIE C" />}
        </div>
      </Centro>
    </AbsoluteFill>
  );
}

function Carimbo({ desde, cor, texto, estilo }: { desde: number; cor: string; texto: string; estilo?: CSSProperties }) {
  const m = useMola(desde, 320);
  return (
    <div style={{ display: "inline-block", marginTop: 16, border: `8px solid ${cor}`, color: cor, fontFamily: FONTE, fontWeight: 900, fontSize: 66, padding: "8px 28px", borderRadius: 14, transform: `rotate(-6deg) scale(${2 - m})`, opacity: m, ...estilo }}>
      {texto}
    </div>
  );
}

// 21,5–22,8 s: "Eu aceitei." (carimbo de aceito sobre o contrato).
function Aceitei() {
  return (
    <AbsoluteFill style={{ background: "#0d1a14" }}>
      <Centro>
        <Carimbo desde={s(0.25)} cor={COR.esmeralda} texto="ACEITO ✓" estilo={{ fontSize: 130, border: `12px solid ${COR.esmeralda}` }} />
      </Centro>
    </AbsoluteFill>
  );
}

// 22,8–26,4 s: "O que eu não sabia... é que essa temporada ia ter de tudo." (escurece, o riser sobe).
function NaoSabia() {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, s(3.6)], [1, 1.25]);
  return (
    <AbsoluteFill style={{ background: "black", alignItems: "center", justifyContent: "center", paddingBottom: 420 }}>
      <div style={{ width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,199,44,0.18) 0%, rgba(0,0,0,0) 65%)", transform: `scale(${z})` }} />
    </AbsoluteFill>
  );
}

// 26,4–33,9 s: os relâmpagos da temporada (expulsões, goleada, estádio lotado, 90+1, silêncio).
function Relampagos() {
  const f = useCurrentFrame();
  const t = (seg: number) => s(seg - 26.4);
  const fase = f < t(27.76) ? 0 : f < t(28.57) ? 1 : f < t(30.0) ? 2 : f < t(32.45) ? 3 : 4;
  const tremor = (desde: number) => (f - desde < 6 && f >= desde ? Math.sin(f * 3) * 14 : 0);
  return (
    <AbsoluteFill style={{ background: fase === 4 ? "black" : FRIO }}>
      {fase === 0 && (
        <Centro gap={40} estilo={{ transform: `translateX(${tremor(0)}px)` }}>
          <div style={{ display: "flex", gap: 40 }}>
            {[0, 1].map((k) => (
              <Impacto key={k} desde={k * 8}>
                <div style={{ width: 200, height: 290, borderRadius: 22, background: COR.vermelho, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", transform: `rotate(${k ? 10 : -8}deg)` }} />
              </Impacto>
            ))}
          </div>
          <Numero cor="white" tamanho={90}>2 EXPULSOS</Numero>
        </Centro>
      )}
      {fase === 1 && <Centro estilo={{ transform: `translateX(${tremor(t(27.76))}px)` }}><Impacto desde={t(27.76)}><Numero cor={COR.dourado} tamanho={320}>7 x 0</Numero></Impacto></Centro>}
      {fase === 2 && (
        <Centro gap={20}>
          <Impacto desde={t(28.57)}><Numero cor="white" tamanho={230}>26.722</Numero></Impacto>
          <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 70, color: "#cfe3ff" }}>pessoas no estádio</div>
        </Centro>
      )}
      {fase === 3 && <Centro><Impacto desde={t(30.0)}><Numero cor="#ff5a5f" tamanho={300}>90+1'</Numero></Impacto></Centro>}
    </AbsoluteFill>
  );
}

// 33,9–42,6 s: a placa do título, o convite para seguir e o capítulo 1.
function Titulo() {
  const f = useCurrentFrame();
  const t = (seg: number) => s(seg - 33.9);
  const titulo = useMola(t(36.4), 160);
  const capitulo = "CAPÍTULO 1 · O COMEÇO";
  const letras = Math.floor(interpolate(f, [t(39.05), t(40.0)], [0, capitulo.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const toque = f - t(38.25);
  const raio = interpolate(f, [t(36.4), t(37.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, rgba(245,199,44,${0.25 * raio}) 0%, #06150e 60%)` }}>
      <Centro gap={44}>
        <Img src={staticFile("escudos/santa-cruz.png")} style={{ width: 260, height: 260, objectFit: "contain", opacity: useMola(t(34.0), 120) }} />
        <div style={{ textAlign: "center", opacity: titulo, transform: `scale(${1.4 - titulo * 0.4})`, filter: `blur(${(1 - titulo) * 12}px)` }}>
          <div style={{ fontFamily: SERIFADA, fontSize: 150, color: "white", lineHeight: 1 }}>Do zero</div>
          <div style={{ fontFamily: SERIFADA, fontSize: 150, color: COR.dourado, lineHeight: 1 }}>ao topo</div>
        </div>
        {f >= t(38.2) && (
          <Pilula desde={t(38.2)} fundo={COR.dourado} cor={TINTA} tamanho={56} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
            Segue para acompanhar
            {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
          </Pilula>
        )}
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 58, color: "#cfe3ff", letterSpacing: 4, minHeight: 70 }}>{capitulo.slice(0, letras)}</div>
      </Centro>
    </AbsoluteFill>
  );
}

const CENAS: [number, number, () => JSX.Element][] = [
  [0, 6.0, AberturaFria], [6.0, 9.1, Janeiro], [9.1, 15.5, OClube], [15.5, 21.5, Proposta], [21.5, 22.8, Aceitei],
  [22.8, 26.4, NaoSabia], [26.4, 33.9, Relampagos], [33.9, 42.6, Titulo],
];

function Corte({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const v = Math.min(interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [duracao - 4, duracao], [1, 0], { extrapolateLeft: "clamp" }));
  return <AbsoluteFill style={{ opacity: v, filter: `blur(${(1 - v) * 16}px)` }}>{children}</AbsoluteFill>;
}

export function T1E01() {
  useFontes();
  return (
    <AbsoluteFill style={{ background: "black", fontFamily: FONTE }}>
      {CENAS.map(([de, ate, Cena], i) => (
        <Sequence key={i} from={s(de)} durationInFrames={s(ate) - s(de)}>
          <Corte duracao={s(ate) - s(de)}><Cena /></Corte>
        </Sequence>
      ))}
      {/* Vinheta e barras de cinema. */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)" }} />
      <Legenda palavras={PALAVRAS} estilo={{ top: 1390 }} tamanho={84} max={4} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, background: "black" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, background: "black" }} />
      <Audio src={staticFile("voz-t1e01.mp3")} />
      {SONS.map(([arquivo, em, volume], k) => <Som key={k} arquivo={arquivo} em={em} volume={volume} />)}
    </AbsoluteFill>
  );
}
