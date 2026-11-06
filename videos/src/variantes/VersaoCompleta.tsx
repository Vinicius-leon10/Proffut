// Versão D do episódio 1, "o melhor de tudo": abre com o mural 3D (versão A) e a câmera voando entre os cartões; no meio,
// os objetos do jogo flutuando em 3D (versão C); a legenda grande palavra por palavra (versão B) do começo ao fim; fundo
// verde-escuro do jogo; no fim, o mural se afasta e entram o certo/errado e o botão.
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "../estilo";
import { Icone } from "../pecas";
import { CENAS, Legenda, VOZ, s } from "./comum";
import { Cartao3D, Flutua, Pilula } from "./VersaoFlutuante";
import { ALTURA, LARGURA, Plano } from "./VersaoMural";

const TINTA = "#10221a";

/** Interpola a câmera entre pontos-chave [quadro, cx, cy, z]. */
function camera(f: number, chaves: [number, number, number, number][]) {
  const qs = chaves.map((c) => c[0]);
  const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.cubic) };
  // Interpola trecho a trecho para cada trecho ter a sua própria suavização.
  let k = 0;
  while (k < chaves.length - 2 && f >= chaves[k + 1][0]) k++;
  const [a, b] = [chaves[k], chaves[k + 1]];
  const u = interpolate(f, [a[0], b[0]], [0, 1], op);
  void qs;
  return [1, 2, 3].map((n) => a[n] + (b[n] - a[n]) * u) as [number, number, number];
}

/** Área dos objetos: a parte de cima da tela (a legenda fica embaixo). */
const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 640 }}>{children}</AbsoluteFill>
);

// 0–4,6 s: o gancho com o mural voando até o ícone.
function Gancho() {
  const f = useCurrentFrame();
  const [cx, cy, z] = camera(f, [[0, 2040, 1006, 1.0], [40, 1130, 470, 1.05], [85, 410, 410, 1.2], [140, 410, 410, 1.28]]);
  return (
    <AbsoluteFill style={{ perspective: 2600, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translateY(-260px)" }}>
        <Plano cx={cx} cy={cy} z={z} inclinacao={22 + Math.sin(f / 30) * 3} />
      </div>
    </AbsoluteFill>
  );
}

function Brasfoot() {
  const f = useCurrentFrame();
  const min = Math.floor(interpolate(f, [s(2.0), s(3.6)], [167, 242], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const hora = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return (
    <Palco gap={60}>
      <Flutua fase={1}><Pilula desde={s(0.6)} tamanho={130}>Brasfoot</Pilula></Flutua>
      <Flutua fase={2}><Pilula desde={s(2.0)} fundo={COR.floresta} cor="white" tamanho={110} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>🌙 {hora}</Pilula></Flutua>
    </Palco>
  );
}

function TimePequeno() {
  return (
    <Palco gap={60}>
      <Flutua><Cartao3D desde={s(1.4)} girar={-10}><Img src={staticFile("telas/linha-ponte.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <Pilula desde={s(3.1)} fundo={COR.dourado} tamanho={90}>⬆ Série A</Pilula>
        <Pilula desde={s(3.0)} tamanho={70} estilo={{ opacity: 0.85 }}>Série B</Pilula>
      </div>
    </Palco>
  );
}

function Iphone() {
  const f = useCurrentFrame();
  const bandeiras = ["🇧🇷", "🇦🇷", "🇺🇾", "🇨🇴", "🇲🇽", "🇵🇾"];
  return (
    <Palco>
      <div style={{ position: "relative" }}>
        <Flutua amplitude={10}>
          <div style={{ perspective: 2200 }}>
            <div style={{ width: 500, borderRadius: 64, border: "13px solid #050505", overflow: "hidden", boxShadow: "0 70px 120px rgba(0,0,0,0.6)", transform: `rotateY(${-16 + Math.sin(f / 35) * 5}deg) rotateX(6deg)` }}>
              <Img src={staticFile("telas/09-elenco.png")} style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </Flutua>
        {bandeiras.map((b, k) => {
          const ang = (k / bandeiras.length) * Math.PI * 2 + f / 45;
          const m = Math.min(1, Math.max(0, (f - s(1.0) - k * 4) / 12));
          return <div key={b} style={{ position: "absolute", left: 250 + Math.cos(ang) * 400 - 55, top: 430 + Math.sin(ang) * 470 - 55, fontSize: 110, opacity: m, transform: `scale(${m})`, filter: "drop-shadow(0 16px 20px rgba(0,0,0,0.45))" }}>{b}</div>;
        })}
      </div>
    </Palco>
  );
}

function MilClubes() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [s(0.4), s(2.0)], [60, 1008], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
  const ids = ["flamengo", "palmeiras", "corinthians", "gremio", "santos", "botafogo", "vasco", "cruzeiro", "bahia", "internacional", "fluminense", "sao-paulo"];
  return (
    <Palco>
      <div style={{ position: "relative", width: 1000, height: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {ids.map((id, k) => {
          const ang = (k / ids.length) * Math.PI * 2 - f / 60;
          const m = Math.min(1, Math.max(0, (f - k * 2) / 12));
          return <Img key={id} src={staticFile(`escudos/${id}.png`)} style={{ position: "absolute", left: 500 + Math.cos(ang) * 420 - 70, top: 500 + Math.sin(ang) * 420 - 70, width: 140, height: 140, objectFit: "contain", opacity: m, filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.45))" }} />;
        })}
        <Pilula desde={4} fundo={COR.dourado} cor={TINTA} tamanho={180} estilo={{ fontVariantNumeric: "tabular-nums", letterSpacing: -6 }}>{n.toLocaleString("pt-BR")}</Pilula>
      </div>
    </Palco>
  );
}

function AoVivo() {
  return (
    <Palco gap={56}>
      <Pilula desde={4} fundo={COR.esmeralda} cor="white" tamanho={84}>● Ao vivo</Pilula>
      <Flutua><Cartao3D desde={6} girar={12} largura={980}><OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
    </Palco>
  );
}

function ComIA() {
  const f = useCurrentFrame();
  const texto = "Coloca a bandeirinha do país ao lado do jogador";
  const letras = Math.floor(interpolate(f, [s(0.6), s(2.4)], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const enviado = f >= s(2.7);
  return (
    <Palco gap={60}>
      <Flutua amplitude={8}>
        <div style={{ width: 960, minHeight: 160, borderRadius: 60, background: "white", boxShadow: "0 14px 0 rgba(0,0,0,0.25), 0 40px 80px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 24, padding: "30px 40px" }}>
          <span style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, color: enviado ? "#9aa59f" : TINTA, flex: 1 }}>
            {enviado ? "Pergunte qualquer coisa" : texto.slice(0, letras)}{!enviado && f % 20 < 10 ? "|" : ""}
          </span>
          <span style={{ width: 92, height: 92, borderRadius: 46, background: COR.floresta, color: "white", fontSize: 50, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${f >= s(2.5) && f < s(2.7) ? 0.85 : 1})` }}>↑</span>
        </div>
      </Flutua>
      {enviado && <Pilula desde={s(2.8)} fundo={COR.esmeralda} cor="white" tamanho={64}>✓ Pronto · 97 testes passando</Pilula>}
    </Palco>
  );
}

function Final() {
  const f = useCurrentFrame();
  const [cx, cy, z] = camera(f, [[0, 600, 1640, 0.9], [36, LARGURA / 2, ALTURA / 2, 0.36], [240, LARGURA / 2, ALTURA / 2, 0.33]]);
  const escurece = interpolate(f, [s(1.6), s(2.4)], [0, 0.78], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toque = f - s(6.0);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ perspective: 2600, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: "translateY(-120px)" }}>
          <Plano cx={cx} cy={cy} z={z} inclinacao={22} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(6,21,14,${escurece})` }} />
      <Palco gap={40}>
        <Flutua fase={0}><Pilula desde={s(2.1)} tamanho={76}>✅ o que deu certo</Pilula></Flutua>
        <Flutua fase={1.5}><Pilula desde={s(3.1)} tamanho={76}>❌ o que deu muito errado</Pilula></Flutua>
        <div style={{ height: 30 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: interpolate(f, [s(5.2), s(5.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Icone tamanho={120} desde={s(5.2)} />
          <span style={{ fontFamily: SERIFADA, fontSize: 120, color: "white" }}>Proffut</span>
        </div>
        <Flutua fase={3}>
          <Pilula desde={s(5.4)} fundo={COR.dourado} tamanho={68} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
            Segue para acompanhar
            {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
          </Pilula>
        </Flutua>
      </Palco>
    </AbsoluteFill>
  );
}

/** Saída de cada cena: desfoque rápido. */
function Troca({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sai = interpolate(f, [duracao - 7, duracao], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = Math.min(entra, sai);
  return <AbsoluteFill style={{ opacity: v, filter: `blur(${(1 - v) * 20}px)`, transform: `scale(${1 + (1 - entra) * 0.05})` }}>{children}</AbsoluteFill>;
}

const PARTES = [Gancho, Brasfoot, TimePequeno, Iphone, MilClubes, AoVivo, ComIA, Final];

export function VersaoCompleta() {
  useFontes();
  return (
    <AbsoluteFill style={{ fontFamily: FONTE }}>
      <Fundo />
      {PARTES.map((Parte, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Troca duracao={ate - de}><Parte /></Troca>
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,21,14,0) 55%, rgba(6,21,14,0.85) 75%)" }} />
      <Legenda estilo={{ top: 1310 }} tamanho={104} />
      <Audio src={staticFile(VOZ)} />
    </AbsoluteFill>
  );
}
