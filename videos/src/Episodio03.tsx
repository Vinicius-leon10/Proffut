// Episódio 3: "O iPhone não colaborava" (versão curta, pelos créditos da ElevenLabs). Voz: Liam, texto em
// public/voz-ep03.txt; os tempos das cenas seguem as palavras (palavras-ep03.json). Os testes da tela são os de verdade
// (R08, R10, R11, R15, R32), que nasceram dos problemas no iPhone.
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { COR, Cena, FONTE, Fundo, Palavras, SERIFADA, Selo, titulo, useFontes, useMola } from "./estilo";
import { Icone } from "./pecas";

const s = (segundos: number) => Math.round(segundos * 30);

const CENAS = [0, 2.4, 5.5, 6.95, 9.0, 10.6, 14.3, 16.8, 20.0];
export const DURACAO_EP03 = s(CENAS[CENAS.length - 1]);

export function Episodio03() {
  useFontes();
  const partes = [Computador, Quebrado, BotaoEscondido, AvisoTampando, HoraSumindo, Teste, BugVirouTeste, Final];
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
      <Audio src={staticFile("voz-ep03.mp3")} />
    </AbsoluteFill>
  );
}

/** Um iPhone com uma tela do jogo; `children` vai por cima da tela (o problema desenhado). */
function Celular({ tela, largura = 560, children, tremor = 0 }: { tela: string; largura?: number; children?: React.ReactNode; tremor?: number }) {
  const f = useCurrentFrame();
  const altura = largura * (1992 / 1170);
  const dx = tremor ? Math.sin(f * 2.3) * tremor : 0;
  return (
    <div style={{ width: largura + 36, height: altura + 36, borderRadius: 86, background: "#0b0b0b", padding: 18, boxShadow: "0 50px 140px rgba(0,0,0,0.7), 0 0 0 3px #2a2a2a", transform: `translateX(${dx}px) rotate(${dx * 0.15}deg)` }}>
      <div style={{ position: "relative", width: largura, height: altura, borderRadius: 70, overflow: "hidden", background: "#f3f3ec" }}>
        <Img src={staticFile(`telas/${tela}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        <div style={{ position: "absolute", top: 14, left: "50%", width: 170, height: 46, marginLeft: -85, borderRadius: 23, background: "#000" }} />
        {children}
      </div>
    </div>
  );
}

/** Círculo vermelho marcando o problema. */
function Marca({ x, y, w, h, desde }: { x: number; y: number; w: number; h: number; desde: number }) {
  const m = useMola(desde, 180);
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 999, border: `8px solid ${COR.vermelho}`, transform: `scale(${0.6 + m * 0.4})`, opacity: m, boxShadow: "0 0 40px rgba(229,72,77,0.6)" }} />;
}

// 0–2,4 s: "No computador, o jogo funcionava."
function Computador() {
  const tela = useMola(s(0.1), 110);
  const ok = useMola(s(1.3), 200);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ position: "relative", opacity: tela, transform: `scale(${0.85 + tela * 0.15})` }}>
        <div style={{ fontSize: 330, lineHeight: 1 }}>💻</div>
        <div style={{ position: "absolute", right: -40, top: -20, width: 150, height: 150, borderRadius: 75, background: COR.esmeralda, color: "white", fontSize: 100, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ok})`, boxShadow: "0 16px 50px rgba(52,183,119,0.5)" }}>✓</div>
      </div>
      <div style={titulo}>
        <Palavras texto="No computador," desde={s(0.1)} />
        <Palavras texto="o jogo funcionava" desde={s(0.9)} cor={COR.fraco} estilo={{ marginTop: 10 }} />
      </div>
    </AbsoluteFill>
  );
}

// 2,4–5,5 s: "No meu iPhone, estava tudo quebrado."
function Quebrado() {
  const f = useCurrentFrame();
  const racha = interpolate(f, [s(1.9), s(2.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, paddingTop: 40 }}>
      <div style={titulo}>
        <Palavras texto="No meu iPhone…" desde={s(0.1)} />
      </div>
      <Celular tela="08-painel.png" largura={520} tremor={racha * 10}>
        <svg viewBox="0 0 100 170" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: racha }}>
          <path d="M62 0 L55 30 L68 52 L48 80 L60 110 L40 140 L52 170 M55 30 L30 44 M48 80 L80 92 M60 110 L88 126" stroke="#222" strokeWidth="1.2" fill="none" />
        </svg>
      </Celular>
      <div style={{ position: "absolute", bottom: 150 }}>
        <Selo desde={s(1.9)} fundo={COR.vermelho} cor="white" estilo={{ fontSize: 80 }}>tudo quebrado</Selo>
      </div>
    </AbsoluteFill>
  );
}

// 5,5–6,95 s: "Botão escondido,"
function BotaoEscondido() {
  const f = useCurrentFrame();
  const sobe = interpolate(f, [0, s(0.5)], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <Selo desde={2} fundo="rgba(255,255,255,0.1)" cor="white" estilo={{ fontSize: 66 }}>🙈 Botão escondido</Selo>
      <Celular tela="11-prejogo.png" largura={500}>
        {/* A barra de abas sobe por cima do botão de baixo, como no Safari. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 170 * sobe, background: "rgba(245,245,247,0.97)", borderTop: "1px solid #ccc", display: "flex", alignItems: "center", justifyContent: "space-around", fontSize: 40 }}>
          {sobe > 0.6 && ["◀︎", "▶︎", "⬆︎", "📖", "⧉"].map((x) => <span key={x} style={{ color: "#0a84ff" }}>{x}</span>)}
        </div>
        <Marca x={30} y={680} w={440} h={150} desde={s(0.6)} />
      </Celular>
    </AbsoluteFill>
  );
}

// 6,95–9 s: "aviso tampando o Continuar,"
function AvisoTampando() {
  const aviso = useMola(s(0.3), 160);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <Selo desde={2} fundo="rgba(255,255,255,0.1)" cor="white" estilo={{ fontSize: 66 }}>📢 Aviso tampando</Selo>
      <Celular tela="08-painel.png" largura={500}>
        <div style={{ position: "absolute", left: 24, right: 24, top: 125, height: 90, borderRadius: 18, background: COR.dourado, color: "#10221a", fontFamily: FONTE, fontWeight: 800, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
          Continuar
        </div>
        <div style={{ position: "absolute", left: 24, right: 24, top: 120, padding: "26px 24px", borderRadius: 22, background: "#143826", color: "white", fontFamily: FONTE, fontWeight: 800, fontSize: 30, textAlign: "center", boxShadow: "0 16px 40px rgba(0,0,0,0.45)", transform: `translateY(${(1 - aviso) * -120}px)`, opacity: aviso }}>
          Jogo guardado no aparelho
        </div>
        <Marca x={10} y={100} w={480} h={140} desde={s(0.9)} />
      </Celular>
    </AbsoluteFill>
  );
}

// 9–10,6 s: "a hora sumindo."
function HoraSumindo() {
  const f = useCurrentFrame();
  const some = interpolate(f, [s(0.2), s(1.0)], [1, 0.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <Selo desde={2} fundo="rgba(255,255,255,0.1)" cor="white" estilo={{ fontSize: 66 }}>🕐 A hora sumindo</Selo>
      <Celular tela="08-painel.png" largura={500}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 90, background: `rgba(255,255,255,${(1 - some) * 0.85})` }} />
        <div style={{ position: "absolute", left: 50, top: 18, fontFamily: FONTE, fontWeight: 800, fontSize: 34, color: "#000", opacity: some }}>21:27</div>
        <div style={{ position: "absolute", right: 46, top: 20, fontSize: 28, color: "#000", opacity: some }}>📶 🔋</div>
        <Marca x={20} y={0} w={180} h={84} desde={s(0.7)} />
      </Celular>
    </AbsoluteFill>
  );
}

// 10,6–14,3 s: "Para cada problema, criamos um teste que imita um iPhone."
function Teste() {
  const f = useCurrentFrame();
  const testes: [string, string][] = [
    ["R08", "a ficha do jogador aparece inteira"],
    ["R10", "os botões de baixo aparecem inteiros"],
    ["R11", "os avisos não cobrem os botões"],
    ["R15", "os avisos não cobrem o topo"],
    ["R32", "a hora fica branca sobre o verde"],
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48, padding: 60 }}>
      <div style={titulo}>
        <Palavras texto="Para cada problema," desde={s(0.1)} />
        <div style={{ marginTop: 12 }}>
          <Selo desde={s(1.2)} fundo={COR.esmeralda} cor="white" estilo={{ fontSize: 76 }}>um teste</Selo>
        </div>
        <Palavras texto="que imita um iPhone" desde={s(2.3)} cor={COR.fraco} estilo={{ marginTop: 12, fontSize: 62 }} />
      </div>
      <div style={{ width: 960, borderRadius: 32, background: "rgba(0,0,0,0.45)", border: "2px solid rgba(255,255,255,0.1)", padding: "34px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
        {testes.map(([id, nome], i) => {
          const t = s(1.4) + i * 9;
          const aparece = interpolate(f, [t, t + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const passou = f >= t + 10;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 22, opacity: aparece, transform: `translateX(${(1 - aparece) * 60}px)`, fontFamily: FONTE, fontSize: 38 }}>
              <span style={{ width: 52, height: 52, borderRadius: 26, background: passou ? COR.esmeralda : "rgba(255,255,255,0.15)", color: "white", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{passou ? "✓" : "…"}</span>
              <span style={{ color: COR.dourado, fontWeight: 900 }}>{id}</span>
              <span style={{ color: "white", fontWeight: 600 }}>{nome}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// 14,3–16,8 s: "Cada bug virou um teste."
function BugVirouTeste() {
  const f = useCurrentFrame();
  const troca = interpolate(f, [s(0.5), s(1.0)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ position: "relative", width: 340, height: 340 }}>
        <div style={{ position: "absolute", inset: 0, fontSize: 300, lineHeight: 1, textAlign: "center", opacity: 1 - troca, transform: `scale(${1 - troca * 0.5}) rotate(${troca * 90}deg)` }}>🐛</div>
        <div style={{ position: "absolute", inset: 0, fontSize: 300, lineHeight: 1, textAlign: "center", opacity: troca, transform: `scale(${0.5 + troca * 0.5})` }}>✅</div>
      </div>
      <div style={{ ...titulo, fontSize: 100 }}>
        <Palavras texto="Cada bug virou" desde={s(0.1)} />
        <div style={{ marginTop: 16 }}>
          <Selo desde={s(1.2)} estilo={{ fontSize: 110 }}>um teste</Selo>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 16,8–20 s: o próximo episódio e o botão de seguir (sem voz).
function Final() {
  const f = useCurrentFrame();
  const proximo = useMola(s(0.4));
  const toque = f - s(1.8);
  const aperta = toque >= 0 && toque < 8 ? 0.92 : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, padding: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Icone tamanho={130} desde={2} />
        <span style={{ fontFamily: SERIFADA, fontSize: 130, color: "white" }}>Proffut</span>
      </div>
      <div style={{ opacity: proximo, transform: `translateY(${(1 - proximo) * 60}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONTE, fontWeight: 600, fontSize: 46, color: COR.fraco }}>Próximo episódio</div>
        <div style={{ ...titulo, fontSize: 74, marginTop: 10 }}>✅ 97 testes antes de cada atualização</div>
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
