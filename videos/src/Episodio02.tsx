// Episódio 2: "O primeiro jogo que funcionou" (o equilíbrio da partida). Voz: Liam, texto em public/voz-ep02.txt.
// Números do equilíbrio: os da calibragem do jogo (CLAUDE.md: ~2,3 gols por jogo, mandante vence 42–45%, empates 25–29%).
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, Cena, FONTE, Fundo, Palavras, SERIFADA, Selo, titulo, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";

const s = (segundos: number) => Math.round(segundos * 30);

const CENAS = [0, 3.9, 10.4, 13.2, 21.9, 27.0, 30.4, 34.6, 38.0];
export const DURACAO_EP02 = s(CENAS[CENAS.length - 1]);

export function Episodio02() {
  useFontes();
  const partes = [Basquete, MinutoAMinuto, Equilibrio, Simulacao, Numeros, MaisForte, Zebra, Final];
  return (
    <AbsoluteFill style={{ fontFamily: FONTE }}>
      <Fundo />
      {partes.map((Parte, i) => {
        const de = s(CENAS[i]);
        const ate = s(CENAS[i + 1]);
        return (
          <Sequence key={i} from={de} durationInFrames={ate - de}>
            <Cena duracao={ate - de}>
              <Parte />
            </Cena>
          </Sequence>
        );
      })}
      <Audio src={staticFile("voz-ep02.mp3")} />
    </AbsoluteFill>
  );
}

/** Placar com os escudos dos dois times. */
function Placar({ casa, fora, gols, escala = 1 }: { casa: string; fora: string; gols: [string, string]; escala?: number }) {
  const escudo = (id: string) => <Img src={staticFile(`escudos/${id}.png`)} style={{ width: 150 * escala, height: 150 * escala, objectFit: "contain" }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36 * escala, background: COR.cartao, border: "2px solid rgba(255,255,255,0.1)", borderRadius: 40, padding: `${34 * escala}px ${46 * escala}px` }}>
      {escudo(casa)}
      <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 130 * escala, color: "white", fontVariantNumeric: "tabular-nums", letterSpacing: -4 }}>
        {gols[0]} <span style={{ color: COR.fraco, fontSize: 80 * escala }}>x</span> {gols[1]}
      </span>
      {escudo(fora)}
    </div>
  );
}

// 0–3,9 s: "Como fazer um jogo de futebol não ter placar de basquete?"
function Basquete() {
  const f = useCurrentFrame();
  const placar = useMola(s(0.5));
  const a = Math.round(interpolate(f, [s(0.5), s(2.4)], [0, 98], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const b = Math.round(interpolate(f, [s(0.5), s(2.4)], [0, 87], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const risco = interpolate(f, [s(2.7), s(3.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 80, padding: 60 }}>
      <div style={{ fontSize: 190, transform: `rotate(${f * 4}deg)` }}>🏀</div>
      <div style={{ position: "relative", opacity: placar, transform: `scale(${0.8 + placar * 0.2})` }}>
        <Placar casa="flamengo" fora="palmeiras" gols={[String(a), String(b)]} />
        <div style={{ position: "absolute", left: -20, right: -20, top: "50%", height: 14, borderRadius: 7, background: COR.vermelho, transform: `scaleX(${risco}) rotate(-8deg)`, transformOrigin: "left" }} />
      </div>
      <div style={titulo}>
        <Palavras texto="Como fazer um jogo de futebol" desde={s(0.2)} />
        <Palavras texto="não ter placar de" desde={s(1.2)} estilo={{ marginTop: 8 }} />
        <div style={{ marginTop: 14 }}>
          <Selo desde={s(2.2)} estilo={{ fontSize: 80 }}>basquete?</Selo>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 3,9–10,4 s: "A partida do meu jogo acontece minuto a minuto: tem chute, defesa, gol, cartão e pênalti."
function MinutoAMinuto() {
  const cartao = useMola(s(0.2), 110);
  const lances: [string, string, number][] = [
    ["⚽", "Chute", 3.0], ["🧤", "Defesa", 3.5], ["🥅", "Gol", 4.0], ["🟨", "Cartão", 4.5], ["⚪", "Pênalti", 5.1],
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 }}>
      <div style={titulo}>
        <Palavras texto="A partida acontece" desde={s(0.2)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(1.2)} fundo={COR.esmeralda} cor="white" estilo={{ fontSize: 78 }}>minuto a minuto</Selo>
        </div>
      </div>
      <div style={{ width: 1000, borderRadius: 34, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.65)", opacity: cartao, transform: `scale(${0.85 + cartao * 0.15})` }}>
        <OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "100%", display: "block" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, width: 980 }}>
        {lances.map(([emoji, nome, t]) => (
          <Selo key={nome} desde={s(t)} fundo="rgba(255,255,255,0.1)" cor="white" estilo={{ fontFamily: FONTE, fontWeight: 800, fontSize: 50, padding: "14px 30px", borderRadius: 999 }}>
            {emoji} {nome}
          </Selo>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 10,4–13,2 s: "Mas acertar o equilíbrio deu trabalho."
function Equilibrio() {
  const f = useCurrentFrame();
  const inclina = Math.sin(f / 7) * 14 * interpolate(f, [0, s(2.4)], [1, 0.2], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ fontSize: 300, transform: `rotate(${inclina}deg)` }}>⚖️</div>
      <div style={titulo}>
        <Palavras texto="Mas acertar o" desde={s(0.2)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(0.8)} estilo={{ fontSize: 84 }}>equilíbrio</Selo>
        </div>
        <Palavras texto="deu trabalho" desde={s(1.4)} cor={COR.fraco} estilo={{ marginTop: 12 }} />
      </div>
    </AbsoluteFill>
  );
}

// 13,2–21,9 s: "A gente simulou temporadas inteiras, milhares de jogos, e foi ajustando os números até ficar parecido com o futebol de verdade."
function Simulacao() {
  const f = useCurrentFrame();
  // Uma fita de resultados correndo (ilustração: placares sorteados, como uma simulação).
  const placares = Array.from({ length: 60 }, (_, i) => {
    const x = Math.sin(i * 12.9898) * 43758.5453;
    const r = x - Math.floor(x);
    const y = Math.sin(i * 78.233) * 12543.123;
    const q = y - Math.floor(y);
    return `${Math.floor(r * r * 5)} x ${Math.floor(q * q * 4)}`;
  });
  const deslize = (f * 9) % (placares.length * 70);
  const ajuste = interpolate(f, [s(4.4), s(7.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const controles: [string, number, number][] = [["Gols", 0.92, 0.48], ["Mando de campo", 0.2, 0.62], ["Força", 0.35, 0.7]];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50 }}>
      <AbsoluteFill style={{ opacity: 0.16, alignItems: "center", overflow: "hidden" }}>
        <div style={{ transform: `translateY(${-deslize}px)` }}>
          {[...placares, ...placares].map((p, i) => (
            <div key={i} style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 60, color: "white", height: 70, textAlign: "center" }}>{p}</div>
          ))}
        </div>
      </AbsoluteFill>
      <div style={titulo}>
        <Palavras texto="Simulamos temporadas inteiras" desde={s(0.2)} />
        <div style={{ marginTop: 14 }}>
          <Selo desde={s(2.6)} estilo={{ fontSize: 84 }}>milhares de jogos</Selo>
        </div>
      </div>
      <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 34, marginTop: 20, opacity: interpolate(f, [s(4.2), s(4.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {controles.map(([nome, de, para]) => {
          const v = de + (para - de) * ajuste;
          return (
            <div key={nome}>
              <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 42, color: COR.fraco, marginBottom: 12 }}>{nome}</div>
              <div style={{ height: 22, borderRadius: 11, background: "rgba(255,255,255,0.12)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${v * 100}%`, borderRadius: 11, background: COR.esmeralda }} />
                <div style={{ position: "absolute", left: `calc(${v * 100}% - 26px)`, top: -15, width: 52, height: 52, borderRadius: 26, background: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }} />
              </div>
            </div>
          );
        })}
      </div>
      <Palavras texto="até parecer futebol de verdade" desde={s(5.6)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 60, fontWeight: 600 }} />
    </AbsoluteFill>
  );
}

// 21,9–27 s: "Hoje dá uns dois gols por jogo, e o mandante vence mais vezes."
function Numeros() {
  const f = useCurrentFrame();
  const gols = interpolate(f, [s(0.3), s(1.6)], [0, 2.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  const barras: [string, number, string][] = [["Mandante vence", 43, COR.esmeralda], ["Empate", 27, "rgba(255,255,255,0.45)"], ["Visitante vence", 30, COR.dourado]];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70, padding: 70 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 260, color: COR.dourado, letterSpacing: -8, lineHeight: 1 }}>
          {gols.toFixed(1).replace(".", ",")}
        </div>
        <div style={{ ...titulo, fontSize: 72 }}>gols por jogo</div>
      </div>
      <div style={{ width: 920, display: "flex", flexDirection: "column", gap: 34 }}>
        {barras.map(([nome, pct, cor], i) => {
          const v = interpolate(f, [s(2.3) + i * 6, s(3.3) + i * 6], [0, pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
          return (
            <div key={nome}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTE, fontWeight: 800, fontSize: 44, color: "white", marginBottom: 10 }}>
                <span>{nome}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}%</span>
              </div>
              <div style={{ height: 30, borderRadius: 15, background: "rgba(255,255,255,0.1)" }}>
                <div style={{ height: "100%", width: `${(v / 50) * 100}%`, borderRadius: 15, background: cor }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// 27–30,4 s: "O time mais forte ganha mais. Mas nem sempre."
function MaisForte() {
  const f = useCurrentFrame();
  const nemSempre = useMola(s(2.4), 200);
  const cartao = (nome: string, forca: number, cor: string, desde: number) => {
    const m = useMolaNoCartao(desde);
    return (
      <div style={{ width: 380, padding: "40px 20px", borderRadius: 36, background: COR.cartao, border: `3px solid ${cor}`, textAlign: "center", opacity: m, transform: `translateY(${(1 - m) * 80}px)` }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 150, color: cor, lineHeight: 1 }}>{forca}</div>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 40, color: COR.fraco, marginTop: 10 }}>{nome}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <Palavras texto="O time mais forte ganha mais" desde={s(0.2)} estilo={titulo} />
      <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
        {cartao("força do time", 78, COR.esmeralda, s(0.4))}
        <span style={{ ...titulo, fontSize: 70, color: COR.fraco }}>x</span>
        {cartao("força do time", 61, "rgba(255,255,255,0.4)", s(0.6))}
      </div>
      <div style={{ ...titulo, fontSize: 110, color: COR.dourado, opacity: nemSempre, transform: `scale(${0.6 + nemSempre * 0.4}) rotate(${(1 - nemSempre) * -10}deg)`, minHeight: 140 }}>
        {f >= s(2.4) ? "Mas nem sempre." : ""}
      </div>
    </AbsoluteFill>
  );
}

function useMolaNoCartao(desde: number) {
  return useMola(desde, 150);
}

// 30,4–34,6 s: "Dá para perder em casa para um time pequeno, do jeito que tem que ser."
function Zebra() {
  const placar = useMola(s(0.2), 120);
  const selo = useMola(s(1.4), 220);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <Palavras texto="Dá para perder em casa" desde={s(0.2)} estilo={titulo} />
      <div style={{ position: "relative", opacity: placar, transform: `scale(${0.85 + placar * 0.15})` }}>
        <Placar casa="flamengo" fora="mirassol" gols={["0", "1"]} />
        <div
          style={{
            position: "absolute", right: -30, top: -70, background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 900,
            fontSize: 58, padding: "12px 30px", borderRadius: 20, transform: `rotate(12deg) scale(${selo})`, boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
          }}
        >
          🦓 ZEBRA
        </div>
      </div>
      <Palavras texto="do jeito que tem que ser" desde={s(2.6)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 64, fontWeight: 600 }} />
    </AbsoluteFill>
  );
}

// 34,6–38 s: "Segue para ver o próximo episódio."
function Final() {
  const f = useCurrentFrame();
  const proximo = useMola(s(0.6));
  const toque = f - s(2.0);
  const aperta = toque >= 0 && toque < 8 ? 0.92 : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, padding: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Icone tamanho={130} desde={2} />
        <span style={{ fontFamily: SERIFADA, fontSize: 130, color: "white" }}>Proffut</span>
      </div>
      <div style={{ opacity: proximo, transform: `translateY(${(1 - proximo) * 60}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, color: COR.fraco }}>Próximo episódio</div>
        <div style={{ ...titulo, fontSize: 74, marginTop: 10 }}>📱 O iPhone não colaborava</div>
      </div>
      <div
        style={{
          background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 800, fontSize: 56, borderRadius: 999,
          padding: "30px 70px", transform: `scale(${aperta})`, boxShadow: "0 20px 60px rgba(245,199,44,0.35)", position: "relative",
        }}
      >
        Segue para acompanhar
        {toque >= 0 && toque < 20 && (
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />
        )}
      </div>
    </AbsoluteFill>
  );
}
