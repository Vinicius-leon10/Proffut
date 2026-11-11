// Episódio 5: "Os jogadores reais". Modelo da Versão D (mural 3D no gancho, objetos flutuando, legenda palavra por palavra)
// com as transições e os sons do padrão (padrao.tsx). Sem voz: o usuário põe a voz no CapCut com o texto de FALAS.
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { COR, FONTE, Fundo, SERIFADA, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";
import { Legenda } from "./variantes/comum";
import { Cartao3D, Flutua, Pilula } from "./variantes/VersaoFlutuante";
import { Plano } from "./variantes/VersaoMural";
import { Flashes, Sons, Troca, palavrasDasCenas, s } from "./padrao";

const TINTA = "#10221a";
const CENAS = [0, 4.4, 10.2, 13.4, 19.0, 25.4, 31.2, 34.6, 38.0];
export const DURACAO_EP05 = s(CENAS[CENAS.length - 1]);

/** A fala de cada cena (a mesma da narração que vai para o CapCut). */
export const FALAS = [
  "Eu queria os jogadores de verdade. E o site da CBF bloqueou o meu robô.",
  "Então a gente montou um robô que junta dados abertos: Cartola, súmulas dos jogos e outras bases públicas.",
  "A Série A veio certinha.",
  "Mas a CBF não deixa baixar as súmulas de 2026. E eu decidi não burlar isso.",
  "Então as Séries B e C ficaram com quem jogou em 2025, e a força de cada jogador é o jogo que calcula.",
  "Hoje já são vinte e seis mil jogadores, da América à Europa, cada um com a bandeira do seu país.",
  "Na próxima janela de transferências, eu atualizo tudo.",
  "Segue para ver o próximo episódio.",
];
const PALAVRAS = palavrasDasCenas(CENAS, FALAS);

const EFEITOS: [number, string, number][] = [
  [2.6, "boom", 0.7], [2.7, "vaia", 0.25],
  ...[0, 1, 2].map((i) => [4.4 + 2.0 + i * 0.9, "tecla", 0.6] as [number, string, number]),
  [10.2 + 0.9, "boom", 0.55], [10.2 + 1.0, "torcida", 0.25],
  [13.4 + 0.6, "boom", 0.6], [13.4 + 3.6, "apito", 0.3],
  [19.0 + 0.3, "riser", 0.3], [19.0 + 3.4, "boom", 0.5],
  [25.4 + 0.2, "riser", 0.35], [25.4 + 2.0, "boom", 0.7], [25.4 + 2.1, "torcida", 0.3],
  [31.2 + 0.3, "tique", 0.5],
  [34.6 + 0.4, "boom", 0.6], [34.6 + 1.6, "tecla", 0.6],
];

export function Episodio05() {
  useFontes();
  const partes = [Gancho, Robo, SerieA, Bloqueio, SeriesBC, Mundo, Janela, Final];
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

/** Área dos objetos: a parte de cima da tela (a legenda fica embaixo). */
const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 640 }}>{children}</AbsoluteFill>
);

// Gancho: o mural 3D voando pelo jogo e, no fim, o carimbo "bloqueado".
function Gancho() {
  const f = useCurrentFrame();
  const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.cubic) };
  const cx = interpolate(f, [0, 70, 130], [2040, 1300, 900], op);
  const cy = interpolate(f, [0, 70, 130], [1006, 700, 1500], op);
  const z = interpolate(f, [0, 130], [1.0, 1.2], op);
  const carimbo = useMola(s(2.5), 260);
  return (
    <AbsoluteFill style={{ perspective: 2600, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translateY(-260px)" }}>
        <Plano cx={cx} cy={cy} z={z} inclinacao={22 + Math.sin(f / 30) * 3} />
      </div>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 640 }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 96, color: COR.vermelho, border: `10px solid ${COR.vermelho}`, borderRadius: 28, padding: "18px 44px", background: "rgba(255,255,255,0.92)", transform: `rotate(-10deg) scale(${2 - carimbo})`, opacity: carimbo }}>
          🤖 BLOQUEADO
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// O robô junta dados abertos: Cartola, súmulas e bases públicas.
function Robo() {
  const f = useCurrentFrame();
  return (
    <Palco gap={40}>
      <div style={{ fontSize: 200, transform: `translateY(${Math.sin(f / 8) * 10}px)` }}>🤖</div>
      <Flutua fase={0}><Pilula desde={s(2.0)} tamanho={70}>🎩 Cartola</Pilula></Flutua>
      <Flutua fase={1.5}><Pilula desde={s(2.9)} fundo={COR.floresta} cor="white" tamanho={70} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>📄 Súmulas dos jogos</Pilula></Flutua>
      <Flutua fase={3}><Pilula desde={s(3.8)} fundo={COR.dourado} tamanho={70}>📊 Bases públicas</Pilula></Flutua>
    </Palco>
  );
}

// A Série A veio certinha: o elenco de verdade.
function SerieA() {
  return (
    <Palco gap={44}>
      <Flutua><Cartao3D desde={s(0.2)} girar={-10} largura={860}><Img src={staticFile("telas/cartao-elenco.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <Pilula desde={s(0.9)} fundo={COR.esmeralda} cor="white" tamanho={84}>✓ Série A certinha</Pilula>
    </Palco>
  );
}

// A CBF não deixa baixar as súmulas de 2026; não burlar.
function Bloqueio() {
  const f = useCurrentFrame();
  const cadeado = useMola(s(0.5), 220);
  const treme = f > s(0.6) && f < s(1.2) ? Math.sin(f * 3) * 12 : 0;
  return (
    <Palco gap={50}>
      <div style={{ fontSize: 240, transform: `scale(${cadeado}) translateX(${treme}px)` }}>🔒</div>
      <Flutua><Pilula desde={s(0.8)} fundo={COR.vermelho} cor="white" tamanho={72}>Súmulas de 2026</Pilula></Flutua>
      <Flutua fase={2}><Pilula desde={s(3.6)} tamanho={72}>🙅 Sem burlar</Pilula></Flutua>
    </Palco>
  );
}

// Séries B e C com quem jogou em 2025; a força é o jogo que calcula.
function SeriesBC() {
  const f = useCurrentFrame();
  const forca = Math.round(interpolate(f, [s(3.0), s(4.4)], [0, 78], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 }));
  return (
    <Palco gap={44}>
      <div style={{ display: "flex", gap: 24 }}>
        <Pilula desde={s(0.4)} tamanho={76}>Série B</Pilula>
        <Pilula desde={s(0.7)} tamanho={76}>Série C</Pilula>
      </div>
      <Flutua><Pilula desde={s(1.4)} fundo={COR.floresta} cor="white" tamanho={68} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>📅 Quem jogou em 2025</Pilula></Flutua>
      <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: f > s(2.8) ? 1 : 0 }}>
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 60, color: COR.fraco }}>Força</span>
        <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 170, color: COR.dourado, fontVariantNumeric: "tabular-nums" }}>{forca}</span>
      </div>
    </Palco>
  );
}

// 26 mil jogadores, da América à Europa, com a bandeira de cada país.
function Mundo() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [s(0.4), s(2.0)], [0, 26000], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 }));
  const bandeiras = ["🇧🇷", "🇦🇷", "🇺🇾", "🇨🇴", "🇲🇽", "🇺🇸", "🇪🇸", "🇮🇹", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🇫🇷", "🇩🇪", "🇵🇹"];
  return (
    <Palco gap={36}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 210, color: COR.dourado, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("pt-BR")}</div>
        <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 66, color: "white" }}>jogadores</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, width: 900 }}>
        {bandeiras.map((b, i) => (
          <Flutua key={i} fase={i} amplitude={10}>
            <span style={{ fontSize: 92, display: "inline-block", transform: `scale(${interpolate(f, [s(2.3) + i * 2, s(2.3) + i * 2 + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>{b}</span>
          </Flutua>
        ))}
      </div>
    </Palco>
  );
}

// Na próxima janela de transferências, eu atualizo tudo.
function Janela() {
  const f = useCurrentFrame();
  return (
    <Palco gap={50}>
      <div style={{ fontSize: 220, transform: `rotate(${f * 4}deg)` }}>🔄</div>
      <Flutua><Pilula desde={s(0.6)} fundo={COR.dourado} tamanho={70}>Janela de transferências</Pilula></Flutua>
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
      <Pilula desde={s(0.4)} fundo="rgba(255,255,255,0.1)" cor="white" tamanho={54}>Próximo: 🎨 o visual novo</Pilula>
      <Pilula desde={s(1.2)} fundo={COR.dourado} cor={TINTA} tamanho={62} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
        Segue para acompanhar
        {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
      </Pilula>
    </Palco>
  );
}
