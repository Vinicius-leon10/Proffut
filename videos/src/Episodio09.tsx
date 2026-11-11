// Episódio 9 dos bastidores: "Os jogadores de verdade". Voz: o usuário (gravação dele), texto em public/voz-ep09.txt.
// Modelo da versão D (objetos flutuando em 3D sobre o fundo verde-escuro, troca com desfoque), sem legenda; efeitos
// sonoros de public/sfx. Os tempos das cenas seguem as pausas da gravação (silencedetect do ffmpeg).
// Números do jogo (CLAUDE.md): ~26 mil jogadores; posição deduzida certa em ~3 de 4; idade pelo registro na CBF com erro
// típico de ~1,3 ano; força da Europa pelo valor: € 20 mi → 84, € 100 mi → 94.
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";
import { Cartao3D, Flutua, Pilula } from "./variantes/VersaoFlutuante";

const s = (segundos: number) => Math.round(segundos * 30);
const TINTA = "#10221a";
const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Começo de cada cena (segundos da gravação) e o fim do vídeo (o botão fica uns segundos depois da voz). */
const CENAS = [0, 7.2, 15.0, 24.3, 32.6, 40.85, 48.7, 55.5];
export const DURACAO_EP09 = s(CENAS[CENAS.length - 1]);
/** Tempo dentro da cena (a voz é contada desde o começo do vídeo). */
const em = (cena: number, segundos: number) => s(segundos - CENAS[cena]);

const Palco = ({ children, gap = 50 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap, padding: "0 60px" }}>{children}</AbsoluteFill>
);

function Contador({ ate, de = 0, inicio, fim, tamanho = 220, cor = COR.dourado }: { ate: number; de?: number; inicio: number; fim: number; tamanho?: number; cor?: string }) {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [inicio, fim], [de, ate], { ...op, easing: Easing.out(Easing.cubic) }));
  return <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: tamanho, color: cor, letterSpacing: -8, fontVariantNumeric: "tabular-nums", lineHeight: 1, textShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>{n.toLocaleString("pt-BR")}</div>;
}

/** Bonequinho de jogador (camisa com número). */
function Camisa({ numero, cor = COR.esmeralda, tamanho = 120 }: { numero: string | number; cor?: string; tamanho?: number }) {
  return (
    <div style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, background: cor, border: "5px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTE, fontWeight: 900, fontSize: tamanho * 0.42, color: "white", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
      {numero}
    </div>
  );
}

// 0–7,2 s: "Quantos jogadores tem o meu jogo? Mais de vinte e seis mil. E quase todos são de verdade."
function Gancho() {
  const f = useCurrentFrame();
  const n = 34;
  return (
    <Palco gap={70}>
      <div style={{ position: "relative", width: 960, height: 520 }}>
        {Array.from({ length: n }, (_, k) => {
          const linha = Math.floor(k / 7);
          const col = k % 7;
          const t = s(0.3) + k * 1.2;
          const m = interpolate(f, [t, t + 8], [0, 1], op);
          const cores = [COR.esmeralda, COR.dourado, "#2f6fdb", COR.vermelho, "#ffffff"];
          return (
            <div key={k} style={{ position: "absolute", left: col * 132 + (linha % 2) * 30 + 6, top: linha * 105 + Math.sin(f / 18 + k) * 6, opacity: m, transform: `scale(${m})` }}>
              <Camisa numero={((k * 7) % 30) + 1} cor={cores[k % cores.length] === "#ffffff" ? "#55645b" : cores[k % cores.length]} tamanho={96} />
            </div>
          );
        })}
      </div>
      <Contador ate={26000} inicio={s(3.6)} fim={s(5.0)} />
      {f >= s(5.25) && <Flutua><Pilula desde={s(5.3)} fundo={COR.esmeralda} cor="white" tamanho={62}>✓ quase todos de verdade</Pilula></Flutua>}
    </Palco>
  );
}

// 7,2–15 s: "Na Série A, o elenco atual de cada clube. Nas Séries B e C, quem entrou em campo nas súmulas oficiais..."
function Fontes() {
  const f = useCurrentFrame();
  const serieA = ["flamengo", "palmeiras", "corinthians", "sao-paulo", "gremio", "internacional", "cruzeiro", "botafogo"];
  const serieBC = ["sport", "ceara", "goias", "vila-nova", "avai", "ponte-preta", "remo", "operario-pr"];
  const mudou = f >= em(1, 10.0);
  const lista = mudou ? serieBC : serieA;
  return (
    <Palco gap={60}>
      <Flutua><Pilula desde={mudou ? em(1, 10.0) : 4} fundo={mudou ? "white" : COR.dourado} tamanho={84} key={mudou ? "bc" : "a"}>{mudou ? "Séries B e C" : "Série A"}</Pilula></Flutua>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 34, width: 820 }}>
        {lista.map((id, k) => {
          const t = (mudou ? em(1, 10.1) : 6) + k * 2;
          const m = interpolate(f, [t, t + 8], [0, 1], op);
          return <Img key={id} src={staticFile(`escudos/${id}.png`)} style={{ width: 170, height: 170, objectFit: "contain", opacity: m, transform: `scale(${0.5 + m * 0.5}) translateY(${Math.sin(f / 20 + k) * 8}px)`, filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.45))" }} />;
        })}
      </div>
      {!mudou ? (
        <Flutua fase={1}><Cartao3D desde={em(1, 8.4)} girar={-10} largura={760}><Img src={staticFile("telas/cartao-elenco.png")} style={{ width: "100%", display: "block" }} /></Cartao3D></Flutua>
      ) : (
        <Flutua fase={1}><Sumula desde={em(1, 11.7)} /></Flutua>
      )}
    </Palco>
  );
}

/** Súmula de papel com as linhas sendo preenchidas e os anos. */
function Sumula({ desde }: { desde: number }) {
  const f = useCurrentFrame();
  const m = interpolate(f, [desde, desde + 10], [0, 1], op);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, opacity: m, transform: `translateY(${(1 - m) * 120}px) rotate(-3deg)` }}>
      <div style={{ width: 420, borderRadius: 18, background: "#fbfbf7", padding: "28px 30px", boxShadow: "0 40px 90px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: SERIFADA, fontSize: 52, color: TINTA }}>Súmula</div>
        {Array.from({ length: 6 }, (_, k) => {
          const w = interpolate(f, [desde + 8 + k * 5, desde + 16 + k * 5], [0, 1], op);
          return <div key={k} style={{ height: 16, borderRadius: 8, background: "#c9d1cb", width: `${(60 + ((k * 23) % 35)) * w}%` }} />;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {["2023", "2024", "2025"].map((a, k) => <Pilula key={a} desde={desde + 20 + k * 6} fundo={COR.floresta} cor="white" tamanho={60} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>{a}</Pilula>)}
      </div>
    </div>
  );
}

// 15–24,3 s: "Mas muita súmula não diz a posição... o jogo descobre sozinho... Acerta três em cada quatro."
function Posicao() {
  const f = useCurrentFrame();
  const descobre = interpolate(f, [em(2, 18.1), em(2, 21.5)], [0, 1], op);
  const posicoes = [["GOL", 50, 88], ["ZAG", 35, 70], ["ZAG", 65, 70], ["LAT", 14, 60], ["LAT", 86, 60], ["MEI", 35, 45], ["MEI", 65, 45], ["MEI", 50, 33], ["ATA", 25, 15], ["ATA", 75, 15], ["ATA", 50, 10]] as const;
  const fim = f >= em(2, 22.5);
  return (
    <Palco gap={60}>
      {!fim ? (
        <>
          <Flutua><Pilula desde={4} tamanho={80}>Posição? 🤔</Pilula></Flutua>
          <div style={{ position: "relative", width: 720, height: 960, borderRadius: 30, background: "linear-gradient(#2e8b57, #23744a)", border: "6px solid rgba(255,255,255,0.7)", boxShadow: "0 50px 110px rgba(0,0,0,0.55)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 5, background: "rgba(255,255,255,0.6)" }} />
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: 100, border: "5px solid rgba(255,255,255,0.6)" }} />
            {posicoes.map(([p, x, y], k) => {
              const t = k / posicoes.length;
              const ok = descobre > t;
              return (
                <div key={k} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${ok ? 1 : 0.9})`, width: 120, height: 120, borderRadius: 60, background: ok ? COR.dourado : "rgba(0,0,0,0.35)", border: "4px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTE, fontWeight: 900, fontSize: ok ? 38 : 60, color: ok ? TINTA : "white" }}>
                  {ok ? p : "?"}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 40 }}>
            {[0, 1, 2, 3].map((k) => {
              const m = interpolate(f, [em(2, 22.6) + k * 4, em(2, 22.6) + k * 4 + 8], [0, 1], op);
              return <div key={k} style={{ opacity: m, transform: `scale(${m})` }}><Camisa numero={k < 3 ? "✓" : "✗"} cor={k < 3 ? COR.esmeralda : COR.vermelho} tamanho={180} /></div>;
            })}
          </div>
          <Pilula desde={em(2, 22.9)} fundo={COR.dourado} tamanho={110}>3 em cada 4</Pilula>
        </>
      )}
    </Palco>
  );
}

// 24,3–32,6 s: "E a idade? Às vezes nem isso tinha. Então ela é calculada pelo número de registro... Erra... pouco mais de um ano."
function Idade() {
  const f = useCurrentFrame();
  const numero = "BID 512.348";
  const letras = Math.floor(interpolate(f, [em(3, 27.6), em(3, 29.4)], [0, numero.length], op));
  const idade = f >= em(3, 29.6);
  return (
    <Palco gap={60}>
      <Flutua><Pilula desde={4} tamanho={90}>🎂 Idade?</Pilula></Flutua>
      <Flutua fase={1}>
        <div style={{ width: 860, borderRadius: 40, background: "#fbfbf7", padding: "44px 50px", boxShadow: "0 50px 110px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", gap: 26, transform: "rotate(-2deg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <Camisa numero={9} tamanho={130} />
            <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 54, color: TINTA }}>Atacante</div>
          </div>
          <Linha rotulo="Nascimento" valor={f < em(3, 25.5) ? "" : "não informado"} cor={COR.vermelho} />
          <Linha rotulo="Registro" valor={numero.slice(0, letras) + (letras < numero.length && f > em(3, 27.4) && f % 16 < 8 ? "|" : "")} cor={TINTA} />
          <Linha rotulo="Idade" valor={idade ? "≈ 24 anos" : ""} cor="#1b7a4b" />
        </div>
      </Flutua>
      {f >= em(3, 30.3) && <Flutua fase={2}><Pilula desde={em(3, 30.4)} fundo={COR.floresta} cor="white" tamanho={70} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>erro médio: ± 1,3 ano</Pilula></Flutua>}
    </Palco>
  );
}

function Linha({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #e1e5df", paddingTop: 22, fontFamily: FONTE, fontSize: 46 }}>
      <span style={{ color: "#627067", fontWeight: 600 }}>{rotulo}</span>
      <span style={{ color: cor, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{valor}</span>
    </div>
  );
}

// 32,6–40,85 s: "E a força de cada jogador? Ninguém me deu pronta. Eu calculo pelo nível do clube, por quanto ele joga e pelo valor..."
function Forca() {
  const f = useCurrentFrame();
  const itens: [string, string, number, number][] = [
    ["🏟️", "Nível do clube", 36.3, 0.82],
    ["⏱️", "Quanto ele joga", 38.1, 0.64],
    ["💰", "Valor de mercado", 39.3, 0.74],
  ];
  return (
    <Palco gap={56}>
      <Flutua><Pilula desde={4} tamanho={90}>💪 Força?</Pilula></Flutua>
      {f < em(4, 36.2) && f >= em(4, 34.9) && <Pilula desde={em(4, 34.9)} fundo={COR.vermelho} cor="white" tamanho={64}>ninguém me deu pronta</Pilula>}
      <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 34 }}>
        {itens.map(([icone, nome, t, valor]) => {
          const m = interpolate(f, [em(4, t), em(4, t) + 8], [0, 1], op);
          const barra = interpolate(f, [em(4, t) + 4, em(4, t) + 22], [0, valor], { ...op, easing: Easing.out(Easing.cubic) });
          return (
            <div key={nome} style={{ opacity: m, transform: `translateX(${(1 - m) * 80}px)` }}>
              <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 50, color: "white", marginBottom: 14 }}>{icone} {nome}</div>
              <div style={{ height: 34, borderRadius: 17, background: "rgba(255,255,255,0.12)" }}>
                <div style={{ height: "100%", width: `${barra * 100}%`, borderRadius: 17, background: COR.esmeralda, boxShadow: "0 0 30px rgba(52,183,119,0.5)" }} />
              </div>
            </div>
          );
        })}
      </div>
      {f >= em(4, 40.0) && <Contador ate={78} de={50} inicio={em(4, 40.0)} fim={em(4, 40.7)} tamanho={170} />}
    </Palco>
  );
}

// 40,85–48,7 s: "Na Europa, o valor de mercado manda. Vinte milhões? Força oitenta e quatro. Cem milhões? Noventa e quatro."
function Europa() {
  const f = useCurrentFrame();
  const clubes = ["real-madrid", "barcelona-esp", "manchester-city", "bayern-de-munique", "liverpool-ing", "paris-saint-germain", "juventus-ita"];
  return (
    <Palco gap={60}>
      <div style={{ position: "relative", width: 900, height: 440 }}>
        {clubes.map((id, k) => {
          const ang = (k / clubes.length) * Math.PI * 2 + f / 50;
          const m = interpolate(f, [k * 2, k * 2 + 10], [0, 1], op);
          return <Img key={id} src={staticFile(`escudos/${id}.png`)} style={{ position: "absolute", left: 450 + Math.cos(ang) * 360 - 70, top: 220 + Math.sin(ang) * 160 - 70, width: 140, height: 140, objectFit: "contain", opacity: m, filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.45))" }} />;
        })}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pilula desde={4} fundo={COR.dourado} tamanho={88}>🇪🇺 Europa</Pilula>
        </div>
      </div>
      <Valor desde={em(5, 43.5)} dinheiro="€ 20 mi" forca={84} ateForca={em(5, 44.7)} />
      <Valor desde={em(5, 46.6)} dinheiro="€ 100 mi" forca={94} ateForca={em(5, 47.6)} />
    </Palco>
  );
}

function Valor({ desde, dinheiro, forca, ateForca }: { desde: number; dinheiro: string; forca: number; ateForca: number }) {
  const f = useCurrentFrame();
  if (f < desde) return <div style={{ height: 150 }} />;
  return (
    <Flutua>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <Pilula desde={desde} tamanho={76}>{dinheiro}</Pilula>
        <span style={{ fontSize: 80, color: "white", opacity: interpolate(f, [desde + 6, desde + 12], [0, 1], op) }}>→</span>
        {f >= ateForca && <Pilula desde={ateForca} fundo={COR.esmeralda} cor="white" tamanho={76}>💪 {forca}</Pilula>}
      </div>
    </Flutua>
  );
}

// 48,7 s–fim: "Vinte e seis mil jogadores. E cada um com uma história de verdade." e o botão.
function Final() {
  const f = useCurrentFrame();
  const escurece = interpolate(f, [em(6, 52.5), em(6, 53.0)], [0, 1], op);
  const toque = f - em(6, 54.2);
  return (
    <Palco gap={50}>
      <div style={{ opacity: 1 - escurece * 0.35, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <Contador ate={26000} de={25000} inicio={em(6, 49.0)} fim={em(6, 50.2)} />
        <Pilula desde={em(6, 49.6)} fundo={COR.floresta} cor="white" tamanho={70} estilo={{ border: "3px solid rgba(255,255,255,0.15)" }}>jogadores</Pilula>
        <Flutua fase={1}><Pilula desde={em(6, 50.7)} tamanho={58}>📖 cada um com uma história</Pilula></Flutua>
      </div>
      <div style={{ height: 30 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: escurece }}>
        <Icone tamanho={120} desde={em(6, 52.6)} />
        <span style={{ fontFamily: SERIFADA, fontSize: 120, color: "white" }}>Proffut</span>
      </div>
      {f >= em(6, 53.0) && (
        <Flutua fase={3}>
          <Pilula desde={em(6, 53.0)} fundo={COR.dourado} tamanho={68} estilo={{ position: "relative", transform: toque >= 0 && toque < 8 ? "scale(0.92)" : undefined }}>
            Segue para acompanhar
            {toque >= 0 && toque < 20 && <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />}
          </Pilula>
        </Flutua>
      )}
    </Palco>
  );
}

/** Troca de cena com desfoque rápido (como na versão D). */
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

/** Efeitos: whoosh nas trocas, tique nos contadores, tecla no registro, boom nos números grandes. */
const SONS: [string, number, number][] = [
  ["whoosh", 0.05, 0.35], ["riser", 1.0, 0.25], ["boom", 3.6, 0.55],
  ...[3.7, 3.9, 4.1, 4.3, 4.6].map((t) => ["tique", t, 0.3] as [string, number, number]),
  ["whoosh", 7.1, 0.35], ["whoosh", 9.95, 0.3],
  ["whoosh", 14.9, 0.35], ["apito", 22.55, 0.3],
  ["whoosh", 24.2, 0.35],
  ...[27.6, 27.8, 28.0, 28.2, 28.4, 28.6, 28.8, 29.0, 29.2].map((t) => ["tecla", t, 0.45] as [string, number, number]),
  ["whoosh", 32.5, 0.35], ["tique", 36.4, 0.3], ["tique", 38.2, 0.3], ["tique", 39.4, 0.3], ["boom", 40.1, 0.4],
  ["whoosh", 40.75, 0.35], ["boom", 44.7, 0.4], ["boom", 47.6, 0.5],
  ["whoosh", 48.6, 0.35], ["torcida", 50.6, 0.18], ["tique", 54.2, 0.4],
];

export function Episodio09() {
  useFontes();
  const partes = [Gancho, Fontes, Posicao, Idade, Forca, Europa, Final];
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
      <Audio src={staticFile("voz-ep09.mp3")} />
      {SONS.map(([arquivo, quando, volume], k) => <Som key={k} arquivo={arquivo} em={quando} volume={volume} />)}
    </AbsoluteFill>
  );
}
