// Série "Do zero ao topo", episódio 1: o Santa Cruz no começo da temporada e a fase de grupos do Pernambucano.
// Os placares, a posição e os gols saem da carreira simulada (carreira/dados/temporada-2026.json); o clássico foi
// gravado ao vivo no jogo (public/carreira-classico.mp4). Estilo da versão D: fundo escuro, objetos flutuando e legenda.
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes, useMola } from "../estilo";
import { Legenda } from "../variantes/comum";
import { Cartao3D, Flutua, Pilula } from "../variantes/VersaoFlutuante";
import palavras from "./palavras-car01.json";
import temporada from "./temporada-2026.json";

const s = (seg: number) => Math.round(seg * 30);
const PALAVRAS = palavras as { p: string; i: number; f: number }[];
type Jogo = { jogo: number; adversario: string; nomeAdversario: string; emCasa: boolean; pro: number; contra: number; resultado: string; estadual?: { pos: number; pts: number } };
const JOGOS = (temporada as { jogos: Jogo[] }).jogos;
const TINTA = "#10221a";

const CENAS = [0, 6.0, 9.5, 16.0, 23.0, 26.2, 30.1, 36.8];
export const DURACAO_CAR01 = s(CENAS[CENAS.length - 1]);

const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 640 }}>{children}</AbsoluteFill>
);
const escudo = (id: string, tam: number) => <Img src={staticFile(`escudos/${id}.png`)} style={{ width: tam, height: tam, objectFit: "contain" }} />;

function Abertura() {
  const f = useCurrentFrame();
  return (
    <Palco gap={44}>
      <Pilula desde={2} fundo="rgba(255,255,255,0.1)" cor="white" tamanho={40} estilo={{ letterSpacing: 4 }}>DO ZERO AO TOPO · EP. 1</Pilula>
      <Flutua>
        <div style={{ transform: `rotateY(${Math.sin(f / 28) * 20}deg) scale(${useMola(4, 110)})`, filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))" }}>{escudo("santa-cruz", 380)}</div>
      </Flutua>
      <div style={{ display: "flex", gap: 24 }}>
        <Pilula desde={s(1.6)} fundo={COR.dourado} cor={TINTA} tamanho={64}>Série C</Pilula>
        <Pilula desde={s(2.5)} tamanho={64}>🔥 Torcida gigante</Pilula>
      </div>
    </Palco>
  );
}

function Objetivo() {
  return (
    <Palco gap={44}>
      <div style={{ fontSize: 200 }}>🎯</div>
      <Pilula desde={4} fundo="rgba(255,255,255,0.1)" cor="white" tamanho={50}>Objetivo da diretoria</Pilula>
      <Flutua><Pilula desde={s(1.6)} fundo={COR.dourado} cor={TINTA} tamanho={90}>Top 4 da Série C</Pilula></Flutua>
    </Palco>
  );
}

function Classico() {
  const f = useCurrentFrame();
  const video = useMola(s(1.0), 100);
  return (
    <Palco gap={44}>
      <div style={{ display: "flex", gap: 20 }}>
        <Pilula desde={2} fundo={COR.vermelho} cor="white" tamanho={52}>⚔️ Clássico</Pilula>
        <Pilula desde={s(3.2)} tamanho={52}>✈️ Fora de casa</Pilula>
      </div>
      <div style={{ opacity: video, transform: `scale(${0.85 + video * 0.15})` }}>
        <Cartao3D desde={s(1.0)} girar={-10} largura={1000}>
          <OffthreadVideo src={staticFile("carreira-classico.mp4")} startFrom={s(16.1)} muted style={{ width: "100%", display: "block" }} />
        </Cartao3D>
      </div>
      {f >= s(5.0) && <Pilula desde={s(5.0)} fundo={COR.esmeralda} cor="white" tamanho={70}>✓ Vitória: 2 x 1</Pilula>}
    </Palco>
  );
}

function Sequencia() {
  // Jogos 2 a 5 do Pernambucano, entrando junto com a fala.
  const tempos = [0.8, 2.3, 3.6, 5.0];
  return (
    <Palco gap={26}>
      {JOGOS.slice(1, 5).map((j, k) => {
        const cor = j.resultado === "V" ? COR.esmeralda : j.resultado === "E" ? "#8a958f" : COR.vermelho;
        return (
          <Linha key={j.jogo} desde={s(tempos[k])}>
            <span style={{ width: 70, height: 70, borderRadius: 18, background: cor, color: "white", fontWeight: 900, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{j.resultado}</span>
            {escudo("santa-cruz", 80)}
            <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 64, color: TINTA, fontVariantNumeric: "tabular-nums" }}>{j.pro} x {j.contra}</span>
            {escudo(j.adversario, 80)}
            <span style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 40, color: "#55645b", flex: 1 }}>{j.nomeAdversario.replace(" da Ingazeira", "")}</span>
          </Linha>
        );
      })}
    </Palco>
  );
}

function Linha({ desde, children }: { desde: number; children: ReactNode }) {
  const m = useMola(desde, 170);
  return (
    <div style={{ width: 940, display: "flex", alignItems: "center", gap: 26, background: "white", borderRadius: 40, padding: "20px 30px", boxShadow: "0 12px 0 rgba(0,0,0,0.25), 0 30px 60px rgba(0,0,0,0.4)", opacity: m, transform: `translateX(${(1 - m) * 300}px)` }}>
      {children}
    </div>
  );
}

function Lider() {
  const pts = JOGOS[4].estadual?.pts ?? 13;
  return (
    <Palco gap={44}>
      <Flutua><Pilula desde={4} fundo={COR.dourado} cor={TINTA} tamanho={150}>1º lugar</Pilula></Flutua>
      <div style={{ display: "flex", gap: 24 }}>
        <Pilula desde={s(1.2)} tamanho={60}>{pts} pontos</Pilula>
        <Pilula desde={s(1.8)} fundo={COR.esmeralda} cor="white" tamanho={60}>Invicto</Pilula>
      </div>
    </Palco>
  );
}

function Artilheiros() {
  const cartao = (nome: string, desde: number) => (
    <Flutua fase={desde / 10}>
      <Pilula desde={desde} tamanho={64} estilo={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span>{nome}</span><span style={{ fontSize: 54 }}>⚽⚽⚽</span>
      </Pilula>
    </Flutua>
  );
  return (
    <Palco gap={40}>
      <div style={{ fontFamily: SERIFADA, fontSize: 90, color: "white" }}>Artilheiros</div>
      {cartao("Gabriel Gabriel", s(0.2))}
      {cartao("Eurico", s(1.2))}
    </Palco>
  );
}

function Gancho() {
  const f = useCurrentFrame();
  const toque = f - s(4.6);
  const brilho = 0.5 + Math.sin(f / 6) * 0.5;
  return (
    <Palco gap={50}>
      <div style={{ fontSize: 260, filter: `drop-shadow(0 0 ${30 + brilho * 40}px rgba(245,199,44,0.6))` }}>🏆</div>
      <Pilula desde={s(0.4)} fundo={COR.vermelho} cor="white" tamanho={70}>Mata-mata</Pilula>
      <Pilula desde={s(3.8)} fundo={COR.dourado} cor={TINTA} tamanho={62} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
        Segue para ver o próximo
        {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
      </Pilula>
    </Palco>
  );
}

function Troca({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sai = interpolate(f, [duracao - 7, duracao], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const v = Math.min(entra, sai);
  return <AbsoluteFill style={{ opacity: v, filter: `blur(${(1 - v) * 20}px)`, transform: `scale(${1 + (1 - entra) * 0.05})` }}>{children}</AbsoluteFill>;
}

const PARTES = [Abertura, Objetivo, Classico, Sequencia, Lider, Artilheiros, Gancho];

export function CarreiraEp01() {
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
      <Legenda palavras={PALAVRAS} estilo={{ top: 1310 }} tamanho={104} />
      <Audio src={staticFile("voz-car01.mp3")} />
    </AbsoluteFill>
  );
}
