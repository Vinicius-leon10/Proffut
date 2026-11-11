// Série "O que o jogo tem", vídeo 1: o futebol brasileiro completo. Voz: o usuário (public/voz-oqt01.mp3, texto em
// voz-oqt01.txt). Modelo da versão D (objetos flutuando, troca com desfoque), sem legenda, com efeitos de public/sfx.
// Tempos das cenas pelas pausas da gravação (silencedetect do ffmpeg).
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";
import { Cartao3D, Flutua, Pilula } from "./variantes/VersaoFlutuante";

const s = (segundos: number) => Math.round(segundos * 30);
const TINTA = "#10221a";
const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const CENAS = [0, 4.55, 10.8, 14.65, 19.9, 24.3, 29.2, 32.4, 38.5, 46.0];
export const DURACAO_OQT01 = s(CENAS[CENAS.length - 1]);
const em = (cena: number, segundos: number) => s(segundos - CENAS[cena]);

const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, padding: "0 60px" }}>{children}</AbsoluteFill>
);

function Escudo({ id, desde, tamanho = 150, fase = 0 }: { id: string; desde: number; tamanho?: number; fase?: number }) {
  const f = useCurrentFrame();
  const m = interpolate(f, [desde, desde + 9], [0, 1], { ...op, easing: Easing.out(Easing.back(1.6)) });
  return <Img src={staticFile(`escudos/${id}.png`)} style={{ width: tamanho, height: tamanho, objectFit: "contain", opacity: Math.min(1, m), transform: `scale(${m}) translateY(${Math.sin(f / 20 + fase) * 7}px)`, filter: "drop-shadow(0 16px 18px rgba(0,0,0,0.45))" }} />;
}

function Contador({ ate, inicio, fim, tamanho = 230 }: { ate: number; inicio: number; fim: number; tamanho?: number }) {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [inicio, fim], [0, ate], { ...op, easing: Easing.out(Easing.cubic) }));
  return <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: tamanho, color: COR.dourado, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>{n}</div>;
}

// 0–4,55: "Quer saber o que tem no meu jogo de técnico? Todo o futebol brasileiro."
function Gancho() {
  const f = useCurrentFrame();
  const ids = ["flamengo", "palmeiras", "corinthians", "santa-cruz", "gremio", "bahia", "cruzeiro", "vasco", "remo", "sao-paulo"];
  return (
    <Palco gap={70}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Icone tamanho={130} desde={2} />
        <span style={{ fontFamily: SERIFADA, fontSize: 130, color: "white" }}>Proffut</span>
      </div>
      <Flutua><Pilula desde={s(0.5)} tamanho={76}>O que tem no jogo? 🤔</Pilula></Flutua>
      <div style={{ position: "relative", width: 900, height: 520 }}>
        {ids.map((id, k) => {
          const ang = (k / ids.length) * Math.PI * 2 + f / 60;
          return <div key={id} style={{ position: "absolute", left: 450 + Math.cos(ang) * 380 - 65, top: 260 + Math.sin(ang) * 200 - 65 }}><Escudo id={id} desde={s(3.0) + k * 2} tamanho={130} /></div>;
        })}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {f >= s(3.1) && <Pilula desde={s(3.1)} fundo={COR.dourado} tamanho={70}>🇧🇷 Todo o futebol brasileiro</Pilula>}
        </div>
      </div>
    </Palco>
  );
}

// 4,55–10,8: "Série A, Série B, Série C e Série Dê. Todas funcionando, com acesso e rebaixamento."
function Series() {
  const f = useCurrentFrame();
  const series: [string, string[], number][] = [
    ["Série A", ["flamengo", "palmeiras", "atletico-mg"], 4.8],
    ["Série B", ["ceara", "america-mg", "avai"], 5.4],
    ["Série C", ["santa-cruz", "botafogo-pb", "caxias"], 6.0],
    ["Série D", ["retro", "treze", "maringa"], 6.6],
  ];
  return (
    <Palco gap={40}>
      {series.map(([nome, ids, t], k) => {
        const m = interpolate(f, [em(1, t), em(1, t) + 8], [0, 1], op);
        const ok = f >= em(1, 7.8) + k * 3;
        return (
          <div key={nome} style={{ display: "flex", alignItems: "center", gap: 26, opacity: m, transform: `translateX(${(1 - m) * 120}px)` }}>
            <div style={{ width: 300, fontFamily: FONTE, fontWeight: 900, fontSize: 64, color: TINTA, background: k === 0 ? COR.dourado : "white", borderRadius: 999, padding: "16px 0", textAlign: "center", boxShadow: "0 14px 0 rgba(0,0,0,0.2)" }}>{nome}</div>
            {ids.map((id, j) => <Escudo key={id} id={id} desde={em(1, t) + 3 + j * 2} tamanho={115} fase={j + k} />)}
            <span style={{ width: 70, height: 70, borderRadius: 35, background: COR.esmeralda, color: "white", fontSize: 44, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ok ? 1 : 0})` }}>✓</span>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 30, marginTop: 30 }}>
        {f >= em(1, 9.7) && <Pilula desde={em(1, 9.7)} fundo={COR.esmeralda} cor="white" tamanho={58}>⬆ acesso</Pilula>}
        {f >= em(1, 10.0) && <Pilula desde={em(1, 10.0)} fundo={COR.vermelho} cor="white" tamanho={58}>⬇ rebaixamento</Pilula>}
      </div>
    </Palco>
  );
}

// 10,8–14,65: "Os vinte e sete estaduais. Começou o ano? Começa o estadual."
function Estaduais() {
  const f = useCurrentFrame();
  const ufs = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
  const janeiro = f >= em(2, 12.5);
  return (
    <Palco gap={50}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <Contador ate={27} inicio={4} fim={s(1.1)} />
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 80, color: "white" }}>estaduais</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, width: 900 }}>
        {ufs.map((uf, k) => {
          const m = interpolate(f, [4 + k * 1.1, 12 + k * 1.1], [0, 1], op);
          return <span key={uf} style={{ width: 110, padding: "14px 0", textAlign: "center", borderRadius: 20, background: COR.floresta, border: "3px solid rgba(255,255,255,0.15)", color: "white", fontFamily: FONTE, fontWeight: 800, fontSize: 42, opacity: m, transform: `scale(${m})` }}>{uf}</span>;
        })}
      </div>
      <div style={{ height: 130, display: "flex", alignItems: "center" }}>
        {janeiro && (
          <Flutua>
            <Pilula desde={em(2, 12.5)} tamanho={64}>📅 Janeiro: {f >= em(2, 13.6) ? "começa o estadual!" : "…"}</Pilula>
          </Flutua>
        )}
      </div>
    </Palco>
  );
}

// 14,65–19,9: "A Copa do Brasil, com cento e vinte e seis clubes. Do primeiro jogo até a final."
function CopaDoBrasil() {
  const f = useCurrentFrame();
  const niveis = [16, 8, 4, 2, 1];
  const desenha = interpolate(f, [em(3, 17.7), em(3, 19.5)], [0, niveis.length], op);
  return (
    <Palco gap={50}>
      <Flutua><Pilula desde={4} fundo={COR.dourado} tamanho={80}>🏆 Copa do Brasil</Pilula></Flutua>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <Contador ate={126} inicio={em(3, 15.6)} fim={em(3, 17.2)} tamanho={200} />
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 70, color: "white" }}>clubes</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, height: 520 }}>
        {niveis.map((n, k) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", height: "100%", opacity: interpolate(desenha, [k, k + 0.6], [0, 1], op) }}>
            {Array.from({ length: n }, (_, j) => (
              <div key={j} style={{ width: k === niveis.length - 1 ? 120 : 130, height: k === niveis.length - 1 ? 120 : Math.max(18, 26), borderRadius: k === niveis.length - 1 ? 60 : 8, background: k === niveis.length - 1 ? COR.dourado : "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70 }}>{k === niveis.length - 1 ? "🏆" : ""}</div>
            ))}
          </div>
        ))}
      </div>
    </Palco>
  );
}

// 19,9–24,3: "Copa do Nordeste, Copa Verde, Copa Sul-Sudeste e Supercopa."
function Regionais() {
  const copas: [string, string, number][] = [["🌵", "Copa do Nordeste", 20.2], ["🌳", "Copa Verde", 21.1], ["🧉", "Copa Sul-Sudeste", 22.0], ["⭐", "Supercopa", 23.3]];
  return (
    <Palco gap={40}>
      {copas.map(([icone, nome, t], k) => (
        <Flutua key={nome} fase={k}>
          <Pilula desde={em(4, t)} fundo={k === 3 ? COR.dourado : "white"} tamanho={72}>{icone} {nome}</Pilula>
        </Flutua>
      ))}
    </Palco>
  );
}

// 24,3–29,2: "Terminou bem no Brasileirão? Você ganha vaga na Libertadores ou na Sul-Americana."
function Vagas() {
  const f = useCurrentFrame();
  const ids = ["flamengo", "palmeiras", "cruzeiro", "botafogo", "fluminense", "bahia", "internacional", "sao-paulo", "corinthians", "gremio"];
  const lib = f >= em(5, 26.4);
  const sul = f >= em(5, 28.0);
  return (
    <Palco gap={40}>
      <Flutua><Pilula desde={4} tamanho={70}>Terminou bem? 🏁</Pilula></Flutua>
      <Cartao3D desde={6} girar={-8} largura={860}>
        <div style={{ padding: "20px 30px", display: "flex", flexDirection: "column", gap: 6 }}>
          {ids.map((id, k) => {
            const cor = lib && k < 6 ? "rgba(52,183,119,0.25)" : sul && k >= 6 ? "rgba(47,111,219,0.2)" : "transparent";
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 22, padding: "8px 16px", borderRadius: 14, background: cor, fontFamily: FONTE, fontWeight: 800, fontSize: 38, color: TINTA }}>
                <span style={{ width: 50, color: "#627067" }}>{k + 1}º</span>
                <Img src={staticFile(`escudos/${id}.png`)} style={{ width: 56, height: 56, objectFit: "contain" }} />
                <span style={{ flex: 1 }}>{id === "sao-paulo" ? "São Paulo" : id === "gremio" ? "Grêmio" : id.charAt(0).toUpperCase() + id.slice(1)}</span>
                <span style={{ color: "#627067", fontVariantNumeric: "tabular-nums" }}>{74 - k * 4}</span>
              </div>
            );
          })}
        </div>
      </Cartao3D>
      <div style={{ display: "flex", gap: 24, height: 110 }}>
        {lib && <Pilula desde={em(5, 26.4)} fundo={COR.esmeralda} cor="white" tamanho={52}>Libertadores</Pilula>}
        {sul && <Pilula desde={em(5, 28.0)} fundo="#2f6fdb" cor="white" tamanho={52}>Sul-Americana</Pilula>}
      </div>
    </Palco>
  );
}

// 29,2–32,4: "E todos os times com os jogadores de verdade."
function Elencos() {
  return (
    <Palco gap={50}>
      <Flutua><Cartao3D desde={4} girar={10} largura={880}><Img src={staticFile("telas/cartao-elenco.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      <Pilula desde={s(1.0)} fundo={COR.esmeralda} cor="white" tamanho={66}>✓ jogadores de verdade</Pilula>
    </Palco>
  );
}

// 32,4–38,5: "Você pode treinar qualquer clube. Do gigante da Série A ao time do interior que só joga o estadual."
function QualquerClube() {
  const f = useCurrentFrame();
  return (
    <Palco gap={60}>
      <Flutua><Pilula desde={4} fundo={COR.dourado} tamanho={76}>Treine qualquer clube</Pilula></Flutua>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 70, height: 520 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, opacity: f >= em(7, 34.6) ? 1 : 0 }}>
          <Escudo id="flamengo" desde={em(7, 34.6)} tamanho={300} />
          <Pilula desde={em(7, 34.8)} tamanho={46}>gigante da Série A</Pilula>
        </div>
        <span style={{ fontSize: 90, color: "white", alignSelf: "center", opacity: f >= em(7, 36.0) ? 1 : 0 }}>↔</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, opacity: f >= em(7, 36.1) ? 1 : 0 }}>
          <Escudo id="jacobina" desde={em(7, 36.1)} tamanho={190} />
          <Pilula desde={em(7, 36.4)} fundo={COR.floresta} cor="white" tamanho={46} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>só o estadual</Pilula>
        </div>
      </div>
    </Palco>
  );
}

// 38,5–fim: "Qual time você levaria do zero até a Libertadores? Comenta aqui." e o botão.
function Final() {
  const f = useCurrentFrame();
  const toque = f - em(8, 44.2);
  return (
    <Palco gap={50}>
      <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 92, lineHeight: 1.1, color: "white", textAlign: "center", letterSpacing: -2, opacity: interpolate(f, [2, 10], [0, 1], op) }}>
        Qual time você levaria<br />do <span style={{ color: COR.dourado }}>zero</span> até a <span style={{ color: COR.esmeralda }}>Libertadores</span>?
      </div>
      {f >= em(8, 41.9) && <Flutua><Pilula desde={em(8, 41.9)} tamanho={70}>💬 Comenta aqui</Pilula></Flutua>}
      <div style={{ height: 20 }} />
      {f >= em(8, 43.0) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Icone tamanho={110} desde={em(8, 43.0)} />
            <span style={{ fontFamily: SERIFADA, fontSize: 110, color: "white" }}>Proffut</span>
          </div>
          <Flutua fase={3}>
            <Pilula desde={em(8, 43.3)} fundo={COR.dourado} tamanho={64} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
              Segue para acompanhar
              {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
            </Pilula>
          </Flutua>
        </>
      )}
    </Palco>
  );
}

function Troca({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 8], [0, 1], op);
  const sai = interpolate(f, [duracao - 7, duracao], [1, 0], op);
  const v = Math.min(entra, sai);
  return <AbsoluteFill style={{ opacity: v, filter: `blur(${(1 - v) * 20}px)`, transform: `scale(${1 + (1 - entra) * 0.05})` }}>{children}</AbsoluteFill>;
}

const Som = ({ arquivo, em: quando, volume = 0.5 }: { arquivo: string; em: number; volume?: number }) => (
  <Sequence from={s(quando)} durationInFrames={s(4)}><Audio src={staticFile(`sfx/${arquivo}.wav`)} volume={volume} /></Sequence>
);

const t = (lista: number[], arquivo: string, volume: number) => lista.map((x) => [arquivo, x, volume] as [string, number, number]);
const SONS: [string, number, number][] = [
  ["apito", 0.1, 0.3], ["boom", 3.1, 0.45],
  ["whoosh", 4.5, 0.35], ...t([4.8, 5.4, 6.0, 6.6], "tique", 0.35), ["torcida", 7.8, 0.15],
  ["whoosh", 10.75, 0.35], ...t([11.0, 11.3, 11.6, 11.9], "tique", 0.25), ["boom", 13.6, 0.35],
  ["whoosh", 14.6, 0.35], ["riser", 16.5, 0.25], ["boom", 19.3, 0.45],
  ["whoosh", 19.85, 0.35], ...t([20.2, 21.1, 22.0], "tique", 0.35), ["boom", 23.3, 0.4],
  ["whoosh", 24.25, 0.35], ["torcida", 26.4, 0.18],
  ["whoosh", 29.15, 0.35],
  ["whoosh", 32.35, 0.35], ["boom", 34.6, 0.4], ["tique", 36.1, 0.35],
  ["whoosh", 38.45, 0.35], ["tique", 44.2, 0.4],
];

export function OqueTem01() {
  useFontes();
  const partes = [Gancho, Series, Estaduais, CopaDoBrasil, Regionais, Vagas, Elencos, QualquerClube, Final];
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
      <Audio src={staticFile("voz-oqt01.mp3")} />
      {SONS.map(([arquivo, quando, volume], k) => <Som key={k} arquivo={arquivo} em={quando} volume={volume} />)}
    </AbsoluteFill>
  );
}
