// Episódio 4: "100 testes antes de cada atualização". Sem voz: o usuário gera a voz no CapCut com o texto de cada cena
// (videos/public/voz-ep04.txt, com o segundo em que cada cena começa). Os números são os de verdade (100 testes de tela,
// a checagem diária às 6h17).
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, Cena, FONTE, Fundo, Palavras, SERIFADA, Selo, titulo, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";

const s = (segundos: number) => Math.round(segundos * 30);

const CENAS = [0, 4.5, 9, 17, 21.5, 26, 30.5, 34];
export const DURACAO_EP04 = s(CENAS[CENAS.length - 1]);

export function Episodio04() {
  useFontes();
  const partes = [Cem, Escudo, Robo, Bloqueado, Manha, Save, Final];
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
    </AbsoluteFill>
  );
}

const meio = { alignItems: "center", justifyContent: "center" } as const;

// "Meu jogo só vai para o ar se passar em cem testes."
function Cem() {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [s(0.6), s(2.6)], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 }));
  const ok = useMola(s(2.7), 200);
  return (
    <AbsoluteFill style={{ ...meio, gap: 40 }}>
      <div style={titulo}><Palavras texto="Meu jogo só vai pro ar" desde={s(0.1)} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 300, color: COR.dourado, letterSpacing: -10, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: 170, transform: `scale(${ok})` }}>✅</span>
      </div>
      <Selo desde={s(1.6)} fundo={COR.esmeralda} cor="white" estilo={{ fontSize: 84 }}>testes passando</Selo>
    </AbsoluteFill>
  );
}

// "Toda mudança, até trocar um escudo, passa por eles."
function Escudo() {
  const f = useCurrentFrame();
  const troca = interpolate(f, [s(1.6), s(2.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ ...meio, gap: 70 }}>
      <div style={titulo}>
        <Palavras texto="Toda mudança," desde={s(0.1)} />
        <Palavras texto="até trocar um escudo" desde={s(0.8)} cor={COR.fraco} estilo={{ marginTop: 10 }} />
      </div>
      <div style={{ position: "relative", width: 380, height: 380 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 60, background: "#e2e2e2", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTE, fontWeight: 900, fontSize: 110, color: "#6b6b6b", opacity: 1 - troca, transform: `rotateY(${troca * 90}deg)` }}>RMA</div>
        <Img src={staticFile("escudos/real-madrid.png")} style={{ position: "absolute", inset: 0, width: 380, height: 380, objectFit: "contain", opacity: troca, transform: `rotateY(${(1 - troca) * -90}deg)` }} />
      </div>
      <Palavras texto="passa pelos testes" desde={s(2.6)} estilo={{ ...titulo, fontSize: 66 }} />
    </AbsoluteFill>
  );
}

// "Um robô abre o jogo como se fosse um iPhone, joga uma partida, salva, fecha, abre de novo e confere se nada sumiu."
function Robo() {
  const f = useCurrentFrame();
  const passos: [string, string][] = [
    ["📱", "Abre o jogo como um iPhone"], ["⚽", "Joga uma partida"], ["💾", "Salva"], ["🔄", "Fecha e abre de novo"], ["🔍", "Confere se nada sumiu"],
  ];
  return (
    <AbsoluteFill style={{ ...meio, gap: 46, padding: 60 }}>
      <div style={{ fontSize: 220, transform: `translateY(${Math.sin(f / 8) * 10}px)` }}>🤖</div>
      <div style={{ width: 960, display: "flex", flexDirection: "column", gap: 22 }}>
        {passos.map(([e, t], i) => {
          const de = s(0.6 + i * 1.4);
          const v = interpolate(f, [de, de + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const feito = f > de + s(0.9);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 26, padding: "24px 30px", borderRadius: 28, background: COR.cartao, border: `2px solid ${feito ? COR.esmeralda : "rgba(255,255,255,0.1)"}`, opacity: v, transform: `translateX(${(1 - v) * 80}px)` }}>
              <span style={{ fontSize: 60 }}>{e}</span>
              <span style={{ flex: 1, fontFamily: FONTE, fontWeight: 800, fontSize: 48, color: "white" }}>{t}</span>
              <span style={{ fontSize: 54, opacity: feito ? 1 : 0.2 }}>{feito ? "✅" : "⏳"}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// "Se um único teste falhar, a atualização não sai."
function Bloqueado() {
  const f = useCurrentFrame();
  const x = useMola(s(0.8), 220);
  const treme = f > s(0.8) && f < s(1.4) ? Math.sin(f * 3) * 14 : 0;
  return (
    <AbsoluteFill style={{ ...meio, gap: 60 }}>
      <div style={titulo}><Palavras texto="Se um único teste falhar…" desde={s(0.1)} /></div>
      <div style={{ position: "relative", transform: `translateX(${treme}px)` }}>
        <div style={{ fontSize: 260, opacity: 0.35 }}>🚀</div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 300, color: COR.vermelho, fontWeight: 900, transform: `scale(${x})` }}>✕</div>
      </div>
      <Selo desde={s(1.8)} fundo={COR.vermelho} cor="white" estilo={{ fontSize: 76 }}>a atualização não sai</Selo>
    </AbsoluteFill>
  );
}

// "E todo dia, de manhã, outro robô testa o jogo publicado."
function Manha() {
  const f = useCurrentFrame();
  const sol = interpolate(f, [0, s(1.2)], [120, 0], { extrapolateRight: "clamp" });
  const ok = useMola(s(2.4), 200);
  return (
    <AbsoluteFill style={{ ...meio, gap: 50 }}>
      <div style={{ fontSize: 230, transform: `translateY(${sol}px)` }}>🌅</div>
      <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 170, color: "white", fontVariantNumeric: "tabular-nums" }}>06:17</div>
      <div style={titulo}>
        <Palavras texto="Todo dia, um robô testa" desde={s(0.6)} />
        <Palavras texto="o jogo publicado" desde={s(1.6)} cor={COR.fraco} estilo={{ marginTop: 10 }} />
      </div>
      <span style={{ fontSize: 120, transform: `scale(${ok})` }}>✅</span>
    </AbsoluteFill>
  );
}

// "Foi assim que eu parei de perder o meu save."
function Save() {
  const cartao = useMola(s(0.6), 130);
  return (
    <AbsoluteFill style={{ ...meio, gap: 60 }}>
      <div style={titulo}>
        <Palavras texto="Foi assim que eu parei" desde={s(0.1)} />
        <Palavras texto="de perder o meu save" desde={s(1.0)} estilo={{ marginTop: 10 }} />
      </div>
      <div style={{ width: 880, borderRadius: 40, background: "#fbfbf7", padding: "40px 46px", display: "flex", alignItems: "center", gap: 34, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", opacity: cartao, transform: `scale(${0.8 + cartao * 0.2})` }}>
        <Img src={staticFile("escudos/ponte-preta.png")} style={{ width: 150, height: 150, objectFit: "contain" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SERIFADA, fontSize: 64, color: "#10221a" }}>Continuar</div>
          <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 36, color: "#55645b", marginTop: 6 }}>Temporada 2028</div>
        </div>
        <span style={{ fontSize: 80 }}>💾</span>
      </div>
    </AbsoluteFill>
  );
}

// "Segue para ver o próximo episódio."
function Final() {
  const f = useCurrentFrame();
  const proximo = useMola(s(0.4));
  const toque = f - s(1.6);
  const aperta = toque >= 0 && toque < 8 ? 0.92 : 1;
  return (
    <AbsoluteFill style={{ ...meio, gap: 60, padding: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Icone tamanho={130} desde={2} />
        <span style={{ fontFamily: SERIFADA, fontSize: 130, color: "white" }}>Proffut</span>
      </div>
      <div style={{ opacity: proximo, transform: `translateY(${(1 - proximo) * 60}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, color: COR.fraco }}>Próximo episódio</div>
        <div style={{ ...titulo, fontSize: 74, marginTop: 10 }}>⚽ Os jogadores reais</div>
      </div>
      <div style={{ background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 800, fontSize: 56, borderRadius: 999, padding: "30px 70px", transform: `scale(${aperta})`, boxShadow: "0 20px 60px rgba(245,199,44,0.35)", position: "relative" }}>
        Segue para acompanhar
        {toque >= 0 && toque < 20 && (
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 40 + toque * 14, height: 40 + toque * 14, borderRadius: "50%", border: "6px solid white", opacity: 1 - toque / 20, transform: "translate(-50%, -50%)" }} />
        )}
      </div>
    </AbsoluteFill>
  );
}
