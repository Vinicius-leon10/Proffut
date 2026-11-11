// Vídeo "Modo Copa do Mundo" (nov/2026, Instagram e TikTok): as telas de exemplo da proposta aprovada (public/copa) com a voz
// do usuário (public/copa/fala.mp3). Padrão dos vídeos (padrao.tsx), sem legenda: a parte de baixo fica livre.
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { COR, FONTE, Fundo, SERIFADA, useFontes, useMola } from "./estilo";
import { Cartao3D, Flutua, Pilula } from "./variantes/VersaoFlutuante";
import { Flashes, Sons, Troca, s } from "./padrao";

const TINTA = "#10221a";
const NOITE = "#0e1a33";
// Cortes nas pausas da voz (silencedetect do ffmpeg).
const CENAS = [0, 6.1, 8.8, 11.1, 17.0, 24.2, 26.1, 32.0, 34.95, 38.85, 42.3, 45.4];
export const DURACAO_COPA = s(CENAS[CENAS.length - 1]);

const EFEITOS: [number, string, number][] = [
  [1.0, "riser", 0.35], [2.6, "boom", 0.7], [2.7, "torcida", 0.25],
  [6.1 + 0.5, "boom", 0.55], [6.1 + 0.6, "apito", 0.3],
  [8.8 + 0.5, "tique", 0.4],
  [11.1 + 1.6, "tecla", 0.6], [11.1 + 2.4, "tecla", 0.6], [11.1 + 3.2, "tecla", 0.6],
  [17.0 + 2.0, "tecla", 0.6], [17.0 + 3.3, "tecla", 0.6], [17.0 + 4.6, "tecla", 0.6],
  [24.2 + 0.4, "boom", 0.45],
  [26.1 + 2.0, "tecla", 0.6], [26.1 + 3.6, "tecla", 0.6], [26.1 + 4.3, "tecla", 0.6], [26.1 + 5.1, "tecla", 0.6],
  [32.0 + 0.3, "apito", 0.35], [32.0 + 0.6, "drone", 0.3],
  [34.95 + 0.4, "boom", 0.6], [34.95 + 0.5, "torcida", 0.35],
  [42.3 + 0.4, "boom", 0.5],
];

export function ModoCopaVideo() {
  useFontes();
  const partes = [Gancho, MundoPara, ClubesSaem, TelaDaCopa, Tecnico, Assiste, Fases, Final, Campea, Volta, Pergunta];
  return (
    <AbsoluteFill style={{ fontFamily: FONTE }}>
      <Fundo />
      <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 15%, rgba(29,50,102,0.85) 0%, rgba(14,26,51,0.6) 55%, rgba(0,0,0,0) 100%)` }} />
      {partes.map((Parte, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Troca duracao={ate - de}><Parte /></Troca>
          </Sequence>
        );
      })}
      <Flashes cenas={CENAS} />
      {/* Efeitos bem mais baixos que a voz (pedido do usuário: "Os efeitos ficaram muito alto"). */}
      <Sons cenas={CENAS} efeitos={EFEITOS} escala={0.3} />
      <Audio src={staticFile("copa/fala.mp3")} volume={1} />
    </AbsoluteFill>
  );
}

const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, paddingBottom: 560 }}>{children}</AbsoluteFill>
);
const Tela = ({ n, desde = 4, girar = -10, largura = 560 }: { n: number; desde?: number; girar?: number; largura?: number }) => (
  <Cartao3D desde={desde} girar={girar} largura={largura}>
    <Img src={staticFile(`copa/exemplo-${n}.png`)} style={{ width: "100%", display: "block", borderRadius: 28 }} />
  </Cartao3D>
);
const Ouro = ({ children, tamanho = 96 }: { children: ReactNode; tamanho?: number }) => (
  <span style={{ fontFamily: SERIFADA, fontSize: tamanho, color: "#f5d77a", textAlign: "center", lineHeight: 1.05, textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>{children}</span>
);

function Gancho() {
  const selo = useMola(s(2.5), 240);
  const f = useCurrentFrame();
  return (
    <Palco gap={40}>
      <div style={{ fontSize: 230, transform: `translateY(${Math.sin(f / 14) * 12}px) rotate(${Math.sin(f / 20) * 4}deg)`, filter: "drop-shadow(0 0 60px rgba(245,199,44,0.6))" }}>🏆</div>
      <Ouro tamanho={110}>Começou a<br />Copa do Mundo</Ouro>
      <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 70, color: TINTA, background: COR.dourado, borderRadius: 26, padding: "16px 40px", transform: `rotate(-6deg) scale(${2 - selo})`, opacity: selo }}>
        E AGORA, TÉCNICO?
      </div>
    </Palco>
  );
}

function MundoPara() {
  const m = useMola(s(0.4), 220);
  return (
    <Palco gap={50}>
      <div style={{ fontSize: 260, transform: `scale(${m})` }}>⏸️</div>
      <Ouro tamanho={120}>O mundo para</Ouro>
      <Pilula desde={s(1.0)} fundo="rgba(255,255,255,0.12)" cor="white" tamanho={56}>No Proffut</Pilula>
    </Palco>
  );
}

function ClubesSaem() {
  return (
    <Palco gap={44}>
      <Flutua><Pilula desde={s(0.2)} fundo={COR.vermelho} cor="white" tamanho={68}>🏟️ Clubes parados</Pilula></Flutua>
      <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
        <Pilula desde={s(0.8)} tamanho={60}>11 jun</Pilula>
        <span style={{ fontSize: 80, color: "white" }}>→</span>
        <Pilula desde={s(1.2)} tamanho={60}>19 jul</Pilula>
      </div>
      <Flutua fase={1}><Pilula desde={s(1.6)} fundo={COR.dourado} tamanho={68}>🌎 Entra a Copa</Pilula></Flutua>
    </Palco>
  );
}

function TelaDaCopa() {
  return (
    <Palco gap={36}>
      <Flutua><Tela n={1} largura={600} girar={-8} /></Flutua>
      <div style={{ display: "flex", gap: 22 }}>
        <Pilula desde={s(1.6)} fundo={COR.dourado} tamanho={46}>🏆 Taça</Pilula>
        <Pilula desde={s(2.4)} tamanho={46}>📍 Sedes</Pilula>
        <Pilula desde={s(3.2)} fundo="rgba(255,255,255,0.12)" cor="white" tamanho={46}>48 seleções</Pilula>
      </div>
    </Palco>
  );
}

function Tecnico() {
  return (
    <Palco gap={36}>
      <div style={{ display: "flex", gap: 30 }}>
        <Flutua><Tela n={2} largura={440} girar={10} /></Flutua>
        <Flutua fase={1.5}><Tela n={3} desde={s(0.8)} largura={440} girar={-10} /></Flutua>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <Pilula desde={s(2.0)} fundo={COR.dourado} tamanho={44}>Convocação</Pilula>
        <Pilula desde={s(3.3)} tamanho={44}>Grupo</Pilula>
        <Pilula desde={s(4.6)} fundo={COR.esmeralda} cor="white" tamanho={44}>Ao vivo</Pilula>
      </div>
    </Palco>
  );
}

function Assiste() {
  const m = useMola(s(0.2), 220);
  return (
    <Palco gap={40}>
      <div style={{ fontSize: 240, transform: `scale(${m})` }}>👀</div>
      <Ouro tamanho={110}>Você assiste</Ouro>
    </Palco>
  );
}

function Fases() {
  const nomes = ["Grupos", "Oitavas", "Quartas", "Semifinal"];
  const tempos = [2.0, 3.6, 4.3, 5.1];
  return (
    <Palco gap={34}>
      <div style={{ display: "flex", gap: 30 }}>
        <Flutua><Tela n={5} largura={440} girar={10} /></Flutua>
        <Flutua fase={1.5}><Tela n={6} desde={s(0.8)} largura={440} girar={-10} /></Flutua>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {nomes.map((n, i) => <Pilula key={n} desde={s(tempos[i])} fundo={i === 3 ? COR.dourado : "white"} tamanho={40}>{n}</Pilula>)}
      </div>
    </Palco>
  );
}

function Final() {
  return (
    <Palco gap={36}>
      <Flutua><Tela n={4} largura={600} girar={-8} /></Flutua>
      <Pilula desde={s(1.0)} fundo={COR.esmeralda} cor="white" tamanho={56}>🔴 A final ao vivo</Pilula>
    </Palco>
  );
}

function Campea() {
  return (
    <Palco gap={36}>
      <Flutua><Tela n={7} largura={600} girar={8} /></Flutua>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", maxWidth: 1000 }}>
        <Pilula desde={s(0.6)} fundo={COR.dourado} tamanho={42}>Campeã</Pilula>
        <Pilula desde={s(1.5)} tamanho={42}>Artilheiro</Pilula>
        <Pilula desde={s(2.6)} tamanho={42}>Melhor jogador</Pilula>
        <Pilula desde={s(3.3)} fundo={COR.vermelho} cor="white" tamanho={42}>Zebra</Pilula>
      </div>
    </Palco>
  );
}

function Volta() {
  return (
    <Palco gap={44}>
      <Flutua><Cartao3D desde={4} girar={-8} largura={560}><Img src={staticFile("telas/08-painel.png")} style={{ width: "100%", display: "block", borderRadius: 28 }} /></Cartao3D></Flutua>
      <Pilula desde={s(1.0)} fundo={COR.dourado} tamanho={60}>▶️ A temporada volta</Pilula>
    </Palco>
  );
}

function Pergunta() {
  const f = useCurrentFrame();
  const bandeiras = ["🇧🇷", "🇦🇷", "🇫🇷", "🇪🇸", "🇩🇪", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"];
  return (
    <Palco gap={44}>
      <Ouro tamanho={110}>Quem leva<br />essa Copa?</Ouro>
      <div style={{ display: "flex", gap: 26 }}>
        {bandeiras.map((b, i) => <span key={b} style={{ fontSize: 110, transform: `translateY(${Math.sin(f / 8 + i) * 14}px)` }}>{b}</span>)}
      </div>
      <Pilula desde={s(1.2)} fundo={COR.dourado} tamanho={64}>Comenta aí 👇</Pilula>
      <span style={{ fontFamily: SERIFADA, fontSize: 80, color: "white", background: NOITE, padding: "6px 30px", borderRadius: 20 }}>Proffut</span>
    </Palco>
  );
}
