// Episódio 1 da série do TikTok: "A ideia". Voz: Liam (ElevenLabs), texto em public/voz-ep01.txt.
// Os tempos (em quadros, 30 por segundo) seguem as pausas da voz.
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import listaDeEscudos from "../public/escudos/lista.json";
import { COR, Cena, FONTE, Fundo, Palavras, SERIFADA, Selo, titulo, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";

/** Escudos que aparecem ao fundo na cena dos mil clubes. */
const ESCUDOS = listaDeEscudos as string[];

const s = (segundos: number) => Math.round(segundos * 30);

// Começo de cada cena (segundos) e o fim do vídeo.
const CENAS = [0, 4.4, 8.5, 13.4, 18.4, 22.2, 25.6, 31.2, 39.4];
export const DURACAO_EP01 = s(CENAS[CENAS.length - 1]);

export function Episodio01() {
  useFontes();
  const partes = [Abertura, Inspirado, TimePequeno, NoIphone, MilClubes, AoVivo, ComIA, Final];
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
      <Audio src={staticFile("voz-ep01.mp3")} />
    </AbsoluteFill>
  );
}

// 0–4,4 s: "Eu não sei programar e resolvi criar meu próprio jogo de técnico de futebol."
function Abertura() {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70, padding: 70 }}>
      <Icone desde={2} />
      <div style={{ ...titulo, fontSize: 84 }}>
        <Palavras texto="Eu não sei programar" desde={4} />
        <Palavras texto="e resolvi criar meu próprio" desde={s(1.7)} cor={COR.fraco} estilo={{ fontSize: 66, marginTop: 14 }} />
        <div style={{ marginTop: 22 }}>
          <Selo desde={s(2.9)} estilo={{ fontSize: 80 }}>jogo de técnico</Selo>
        </div>
        <Palavras texto="de futebol" desde={s(3.3)} estilo={{ marginTop: 14 }} />
      </div>
    </AbsoluteFill>
  );
}

// 4,4–8,5 s: "Inspirado no Brasfoot, que eu jogava a madrugada toda."
function Inspirado() {
  const f = useCurrentFrame();
  // Um relógio de madrugada correndo (02:47 → 04:12).
  const minutos = Math.floor(interpolate(f, [s(1.6), s(4)], [167, 252], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const hora = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
  const relogio = useMola(s(1.6));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70, gap: 60 }}>
      <div style={titulo}>
        <Palavras texto="Inspirado no" desde={s(0.4)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(0.9)} estilo={{ fontSize: 84 }}>Brasfoot</Selo>
        </div>
      </div>
      <div style={{ opacity: relogio, transform: `translateY(${(1 - relogio) * 60}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 200, color: "white", letterSpacing: -6, fontVariantNumeric: "tabular-nums" }}>
          🌙 {hora}
        </div>
        <Palavras texto="que eu jogava a madrugada toda" desde={s(2.1)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 60, fontWeight: 600 }} />
      </div>
    </AbsoluteFill>
  );
}

// 8,5–13,4 s: "A ideia era a mesma: pegar um time pequeno e tentar subir de divisão."
function TimePequeno() {
  const cartao = useMola(s(1.8));
  const sobe = useMola(s(3.4), 120);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60, gap: 70 }}>
      <Palavras texto="A ideia era a mesma:" desde={s(0.3)} estilo={titulo} />
      <div
        style={{
          width: 960, borderRadius: 34, overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          opacity: cartao, transform: `translateY(${(1 - cartao) * 120}px) scale(${0.9 + cartao * 0.1})`,
        }}
      >
        <Img src={staticFile("telas/linha-ponte.png")} style={{ width: "100%", display: "block" }} />
      </div>
      <Palavras texto="pegar um time pequeno" desde={s(1.9)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 62, fontWeight: 600 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: sobe, transform: `scale(${0.8 + sobe * 0.2})` }}>
        <span style={{ ...titulo, fontSize: 64, background: COR.cartao, borderRadius: 18, padding: "8px 26px" }}>Série B</span>
        <span style={{ fontSize: 90, color: COR.esmeralda, transform: `translateY(${(1 - sobe) * 30}px)` }}>⬆</span>
        <span style={{ ...titulo, fontSize: 64, background: COR.dourado, color: "#10221a", borderRadius: 18, padding: "8px 26px" }}>Série A</span>
      </div>
    </AbsoluteFill>
  );
}

// 13,4–18,4 s: "Só que no meu iPhone, com os times e os jogadores de 2026."
function NoIphone() {
  const celular = useMola(s(0.3), 90);
  const bandeiras = ["🇧🇷", "🇦🇷", "🇺🇾", "🇨🇴", "🇵🇾", "🇲🇽"];
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
      <Palavras texto="Só que no meu iPhone" desde={s(0.2)} estilo={titulo} />
      <div
        style={{
          marginTop: 60, width: 640, borderRadius: 80, border: "14px solid #0b0b0b", background: "#0b0b0b",
          overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.7)", transform: `translateY(${(1 - celular) * 900}px)`,
        }}
      >
        <Img src={staticFile("telas/09-elenco.png")} style={{ width: "100%", display: "block" }} />
      </div>
      {bandeiras.map((b, i) => {
        const m = useMolaLocal(s(1.7) + i * 4);
        const lado = i % 2 === 0 ? -1 : 1;
        return (
          <div
            key={b}
            style={{
              position: "absolute", top: 520 + Math.floor(i / 2) * 260, left: lado < 0 ? 70 : undefined, right: lado > 0 ? 70 : undefined,
              fontSize: 110, opacity: m, transform: `scale(${m}) rotate(${lado * (1 - m) * 30}deg)`, filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.5))",
            }}
          >
            {b}
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 90, width: "100%" }}>
        <Palavras texto="com os times e os jogadores de 2026" desde={s(1.7)} estilo={{ ...titulo, fontSize: 56, fontWeight: 600 }} cor={COR.fraco} />
      </div>
    </AbsoluteFill>
  );
}

/** useMola dentro de um map (mesma conta, chamada sempre na mesma ordem). */
function useMolaLocal(desde: number) {
  return useMola(desde, 170);
}

// 18,4–22,2 s: "Hoje já são mais de mil clubes, da América inteira."
function MilClubes() {
  const f = useCurrentFrame();
  const lista: string[] = ESCUDOS;
  const numero = Math.round(interpolate(f, [s(0.5), s(2.2)], [60, 1008], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 }));
  const colunas = 7;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: 34, padding: 30, opacity: 0.42, transform: `translateY(${-f * 0.8}px)` }}>
        {lista.slice(0, colunas * 14).map((id, i) => {
          const aparece = interpolate(f, [i * 0.45, i * 0.45 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <Img key={id} src={staticFile(`escudos/${id}.png`)} style={{ width: 112, height: 112, objectFit: "contain", opacity: aparece, transform: `scale(${0.5 + aparece * 0.5})` }} />;
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(6,21,14,0.92) 0%, rgba(6,21,14,0.55) 45%, rgba(6,21,14,0) 75%)" }} />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 280, color: COR.dourado, letterSpacing: -10, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {numero.toLocaleString("pt-BR")}
        </div>
        <div style={{ ...titulo, fontSize: 90 }}>clubes</div>
        <Palavras texto="da América inteira" desde={s(2.6)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 62, fontWeight: 600, marginTop: 20 }} />
      </div>
    </AbsoluteFill>
  );
}

// 22,2–25,6 s: "E a partida é ao vivo, minuto a minuto."
function AoVivo() {
  const cartao = useMola(s(0.2), 110);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={titulo}>
        <Palavras texto="E a partida é" desde={s(0.2)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(0.9)} fundo={COR.esmeralda} cor="white" estilo={{ fontSize: 80 }}>● ao vivo</Selo>
        </div>
      </div>
      <div
        style={{
          width: 1000, borderRadius: 34, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.65)",
          opacity: cartao, transform: `scale(${0.85 + cartao * 0.15})`,
        }}
      >
        <OffthreadVideo src={staticFile("partida-campo.mp4")} muted style={{ width: "100%", display: "block" }} />
      </div>
      <Palavras texto="minuto a minuto" desde={s(2.0)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 64, fontWeight: 600 }} />
    </AbsoluteFill>
  );
}

// 25,6–31,2 s: "Tudo feito com uma inteligência artificial, pedindo cada coisa em português."
function ComIA() {
  const f = useCurrentFrame();
  const pedido = useMola(s(1.0));
  const digitando = f >= s(2.0) && f < s(3.1);
  const resposta = useMola(s(3.1));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60, gap: 50 }}>
      <div style={titulo}>
        <Palavras texto="Tudo feito com uma" desde={s(0.2)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(0.7)} estilo={{ fontSize: 80 }}>inteligência artificial</Selo>
        </div>
      </div>
      <div style={{ width: 940, display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            alignSelf: "flex-end", maxWidth: 760, background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 600,
            fontSize: 44, lineHeight: 1.3, padding: "26px 34px", borderRadius: "40px 40px 10px 40px",
            opacity: pedido, transform: `translateX(${(1 - pedido) * 200}px)`,
          }}
        >
          Coloca a bandeirinha do país ao lado do nome do jogador
        </div>
        {digitando && (
          <div style={{ alignSelf: "flex-start", background: COR.cartao, borderRadius: 40, padding: "26px 40px", fontSize: 60, color: "white", letterSpacing: 8 }}>
            {".".repeat(1 + (Math.floor(f / 6) % 3))}
          </div>
        )}
        {f >= s(3.1) && (
          <div
            style={{
              alignSelf: "flex-start", maxWidth: 800, background: "rgba(255,255,255,0.1)", color: "white", fontFamily: FONTE, fontWeight: 600,
              fontSize: 44, lineHeight: 1.3, padding: "26px 34px", borderRadius: "40px 40px 40px 10px", border: "2px solid rgba(255,255,255,0.12)",
              opacity: resposta, transform: `translateX(${(1 - resposta) * -200}px)`,
            }}
          >
            Pronto! 🇧🇷 🇦🇷 🇺🇾 no Elenco e no Mercado. <span style={{ color: COR.esmeralda }}>97 testes passando ✓</span>
          </div>
        )}
      </div>
      <Palavras texto="pedindo cada coisa em português" desde={s(3.3)} cor={COR.fraco} estilo={{ ...titulo, fontSize: 58, fontWeight: 600 }} />
    </AbsoluteFill>
  );
}

// 31,2–39,4 s: "Nessa série eu vou mostrar tudo: o que deu certo e o que deu muito errado. Segue para acompanhar."
function Final() {
  const f = useCurrentFrame();
  const certo = useMola(s(2.6));
  const errado = useMola(s(3.8));
  const marca = useMola(s(5.5), 110);
  const toque = f - s(6.6);
  const aperta = toque >= 0 && toque < 8 ? 0.92 : 1;
  const linha = (m: number, simbolo: string, cor: string, texto: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: m, transform: `translateX(${(1 - m) * -120}px)` }}>
      <span style={{ width: 96, height: 96, borderRadius: 48, background: cor, color: "white", fontSize: 58, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{simbolo}</span>
      <span style={{ ...titulo, fontSize: 66, textAlign: "left" }}>{texto}</span>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 70, gap: 70 }}>
      <Palavras texto="Nessa série eu vou mostrar tudo:" desde={s(0.5)} estilo={titulo} />
      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {linha(certo, "✓", COR.esmeralda, "o que deu certo")}
        {linha(errado, "✕", COR.vermelho, "o que deu muito errado")}
      </div>
      <div style={{ opacity: marca, transform: `translateY(${(1 - marca) * 80}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 40, marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Icone tamanho={130} desde={s(5.5)} />
          <span style={{ fontFamily: SERIFADA, fontSize: 130, color: "white" }}>Proffut</span>
        </div>
        <div
          style={{
            background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 800, fontSize: 56, borderRadius: 999,
            padding: "30px 70px", transform: `scale(${aperta})`, boxShadow: "0 20px 60px rgba(245,199,44,0.35)", position: "relative",
          }}
        >
          Segue para acompanhar
          {toque >= 0 && toque < 20 && (
            <span
              style={{
                position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%",
                border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}
