// Stories do Instagram da "folha cara" (18/nov/2026, R138) e das camisas da Europa: 5 imagens paradas, 1080 × 1920,
// uma por quadro da composição "StoriesFolhaCara". Telas de verdade do jogo em public/stories/ (Playwright, vite preview).
import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";

export const ESCURO = "#10221a";

export function Celular({ tela, altura = 900, giro = -3, embaixo = false, largura = 540 }: { tela: string; altura?: number; giro?: number; embaixo?: boolean; largura?: number }) {
  return (
    <div style={{ width: largura, borderRadius: 62, background: "#0b0b0b", padding: 14, boxShadow: "0 50px 120px rgba(0,0,0,0.7), 0 0 0 3px #2a2a2a", transform: `rotate(${giro}deg)` }}>
      <div style={{ borderRadius: 50, overflow: "hidden", height: altura }}>
        <Img src={staticFile(`stories/${tela}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: embaixo ? "bottom" : "top", display: "block" }} />
      </div>
    </div>
  );
}

export function Selo({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 800, fontSize: 38, letterSpacing: 3, color: ESCURO, background: COR.dourado, borderRadius: 999, padding: "12px 34px" }}>{children}</span>;
}

export function Titulo({ children, tamanho = 80 }: { children: ReactNode; tamanho?: number }) {
  return <div style={{ fontWeight: 900, fontSize: tamanho, lineHeight: 1.06, color: "white", textAlign: "center", letterSpacing: -1 }}>{children}</div>;
}

export function Etiqueta({ children, cor = COR.dourado, texto = ESCURO, estilo }: { children: ReactNode; cor?: string; texto?: string; estilo?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", background: cor, color: texto, fontWeight: 900, borderRadius: 30, padding: "22px 34px", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", textAlign: "center", ...estilo }}>
      {children}
    </div>
  );
}

export function Cartao({ icone, titulo, texto }: { icone: string; titulo: string; texto: string }) {
  return (
    <div style={{ display: "flex", gap: 30, alignItems: "center", background: COR.cartao, border: "2px solid rgba(255,255,255,0.12)", borderRadius: 36, padding: "34px 40px", width: "100%" }}>
      <span style={{ fontSize: 86 }}>{icone}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontWeight: 900, fontSize: 50, color: "white" }}>{titulo}</span>
        <span style={{ fontWeight: 600, fontSize: 36, color: COR.fraco, lineHeight: 1.25 }}>{texto}</span>
      </div>
    </div>
  );
}

const sub = (t: string) => <div style={{ fontWeight: 700, fontSize: 42, color: COR.fraco, textAlign: "center", lineHeight: 1.25 }}>{t}</div>;

const STORIES_FOLHA: (() => ReactNode)[] = [
  // 1. Capa
  () => (
    <>
      <Selo>🆕 NOVIDADE NO PROFFUT</Selo>
      <Titulo tamanho={104}>Agora o dinheiro <span style={{ color: COR.dourado }}>aperta</span> 💸</Titulo>
      <div style={{ position: "relative", marginTop: 30 }}>
        <Celular tela="folha-painel.png" altura={860} giro={-3} />
        <div style={{ position: "absolute", left: -110, top: -40, width: 230, height: 230, borderRadius: 999, background: "#fbfbf7", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 70px rgba(0,0,0,0.6)", transform: "rotate(-8deg)" }}>
          <Img src={staticFile("stories/escudo-confianca.png")} style={{ width: 170, height: 170, objectFit: "contain" }} />
        </div>
        <Etiqueta estilo={{ right: -120, bottom: 120, transform: "rotate(5deg)", fontSize: 40 }}>
          <div style={{ fontSize: 30, letterSpacing: 2 }}>CAIXA DO CONFIANÇA</div>
          <div style={{ fontSize: 72 }}>R$ 2,60 mi</div>
        </Etiqueta>
      </div>
    </>
  ),
  // 2. Como era
  () => (
    <>
      <Selo>⏪ COMO ERA</Selo>
      <Titulo>Confiança na Série C… com elenco de Série A</Titulo>
      {sub("Dava para contratar vários livres bons e o caixa ainda crescia")}
      <div style={{ position: "relative", marginTop: 26 }}>
        <Celular tela="folha-livres.png" altura={800} giro={3} />
        <Etiqueta estilo={{ left: -130, bottom: 70, transform: "rotate(-6deg)" }}>
          <div style={{ fontSize: 34, letterSpacing: 2 }}>NO FIM DA TEMPORADA</div>
          <div style={{ fontSize: 96, lineHeight: 1 }}>R$ 18 mi</div>
          <div style={{ fontSize: 34 }}>sobrando no caixa 🤑</div>
        </Etiqueta>
      </div>
    </>
  ),
  // 3. Por quê
  () => (
    <>
      <Selo>🤔 POR QUE MUDAMOS</Selo>
      <Titulo tamanho={92}>Time pequeno não pode montar elenco de time grande</Titulo>
      <div style={{ display: "flex", flexDirection: "column", gap: 34, width: "100%", marginTop: 60 }}>
        <Cartao icone="💸" titulo="Cada contratação pesa" texto="Você precisa escolher bem quem traz" />
        <Cartao icone="🪜" titulo="Subir dá trabalho" texto="O caminho até a Série A fica mais longo" />
        <Cartao icone="🎮" titulo="Mais divertido" texto="Vencer com time pequeno vale muito mais" />
      </div>
    </>
  ),
  // 4. Como ficou
  () => (
    <>
      <Selo>✅ COMO FICOU</Selo>
      <Titulo tamanho={76}>A diretoria agora confere a conta</Titulo>
      <div style={{ display: "flex", gap: 18, width: "100%", justifyContent: "center" }}>
        {[["🤝", "Luvas", "6 salários", COR.dourado, ESCURO], ["🧾", "+30%", "de encargos", COR.esmeralda, "white"], ["🚫", "Limite", "75% da receita", COR.vermelho, "white"]].map(([i, t, d, c, x]) => (
          <div key={t} style={{ flex: 1, background: c, color: x, borderRadius: 30, padding: "20px 10px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 46, fontWeight: 900 }}>{i} {t}</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Celular tela="folha-barrado.png" altura={830} giro={-2} embaixo largura={600} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 34, color: COR.fraco, textAlign: "center", marginTop: 6 }}>Clube grande pode crescer até 10% acima da folha de quando você chegou</div>
    </>
  ),
  // 5. Bônus e enquete
  () => (
    <>
      <Selo>🎁 BÔNUS DE HOJE</Selo>
      <Titulo tamanho={70}>Camisas oficiais da Europa no campinho</Titulo>
      <div style={{ position: "relative", marginTop: 14 }}>
        <Celular tela="europa-campinho.png" altura={860} giro={3} largura={480} />
        <Etiqueta estilo={{ right: -170, top: 380, transform: "rotate(6deg)" }}>
          <div style={{ fontSize: 96, lineHeight: 1 }}>588</div>
          <div style={{ fontSize: 32 }}>camisas novas</div>
        </Etiqueta>
      </div>
      <div style={{ marginTop: 20, width: 820, minHeight: 190, border: "5px dashed rgba(255,255,255,0.35)", borderRadius: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontWeight: 900, fontSize: 46, color: "white" }}>Ficou difícil demais ou na medida?</span>
        <span style={{ fontWeight: 700, fontSize: 32, color: COR.fraco }}>(coloque a enquete aqui)</span>
      </div>
    </>
  ),
];

export const QUANTOS_STORIES_FOLHA = STORIES_FOLHA.length;

export function StoriesFolhaCara() {
  useFontes();
  const quadro = STORIES_FOLHA[useCurrentFrame()] ?? STORIES_FOLHA[0];
  return (
    <AbsoluteFill style={{ fontFamily: FONTE, alignItems: "center", padding: "130px 80px 0" }}>
      <Fundo />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Icone tamanho={64} desde={-30} />
          <span style={{ fontFamily: SERIFADA, fontSize: 58, color: "white" }}>Proffut</span>
        </div>
        {quadro()}
      </div>
    </AbsoluteFill>
  );
}
