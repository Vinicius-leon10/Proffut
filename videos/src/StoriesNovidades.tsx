// Stories do Instagram das novidades de 20/nov/2026 (R151–R154): leilão, filtro de força em faixas, força máxima 99 e
// convites só depois do primeiro ano. 5 imagens paradas, 1080 × 1920, uma por quadro da composição "StoriesNovidades".
// Telas de verdade do jogo (Corinthians) em public/stories/nov-*.png.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";
import { Cartao, Celular, ESCURO, Etiqueta, Selo, Titulo } from "./StoriesFolhaCara";

const sub = (t: ReactNode) => <div style={{ fontWeight: 700, fontSize: 40, color: COR.fraco, textAlign: "center", lineHeight: 1.25 }}>{t}</div>;

function LugarDaFigurinha({ titulo, nota, altura = 220 }: { titulo: ReactNode; nota: string; altura?: number }) {
  return (
    <div style={{ width: 860, minHeight: altura, border: "5px dashed rgba(255,255,255,0.35)", borderRadius: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "18px 30px" }}>
      <span style={{ fontWeight: 900, fontSize: 48, color: "white", textAlign: "center", lineHeight: 1.15 }}>{titulo}</span>
      <span style={{ fontWeight: 700, fontSize: 30, color: COR.fraco }}>{nota}</span>
    </div>
  );
}

const STORIES: (() => ReactNode)[] = [
  // 1. Venda rápida (leilão)
  () => (
    <>
      <Selo>🔨 VENDA RÁPIDA</Selo>
      <Titulo tamanho={80}>Colocou à venda? <span style={{ color: COR.dourado }}>Leilão na hora</span></Titulo>
      {sub("Antes: esperar rodadas. Agora: até 4 clubes dão lance na hora")}
      <div style={{ position: "relative", width: "100%", height: 980, marginTop: 10 }}>
        <div style={{ position: "absolute", left: 0, top: 30 }}><Celular tela="nov-leilao-ficha.png" altura={820} largura={430} giro={-5} /></div>
        <div style={{ position: "absolute", right: 0, top: 120 }}><Celular tela="nov-leilao-venda.png" altura={820} largura={430} giro={4} /></div>
        <Etiqueta estilo={{ left: 210, bottom: 0, transform: "rotate(-3deg)", fontSize: 40 }}>
          Aceitar · Pedir mais · Recusar
        </Etiqueta>
      </div>
    </>
  ),
  // 2. Filtro de força
  () => (
    <>
      <Selo>🔎 MERCADO</Selo>
      <Titulo tamanho={84}>Filtro de força em faixas</Titulo>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", width: "100%" }}>
        {["40 a 49", "50 a 59", "60 a 69", "70 a 79", "80 a 89", "90 a 99"].map((f) => (
          <span key={f} style={{ fontWeight: 900, fontSize: 40, padding: "12px 26px", borderRadius: 999, background: f === "80 a 89" ? COR.dourado : COR.cartao, color: f === "80 a 89" ? ESCURO : "white", border: "2px solid rgba(255,255,255,0.15)" }}>{f}</span>
        ))}
      </div>
      <div style={{ marginTop: 16 }}><Celular tela="nov-filtro.png" altura={880} giro={-3} largura={540} /></div>
    </>
  ),
  // 3. Força máxima 99
  () => (
    <>
      <Selo>⭐ FORÇA MÁXIMA 99</Selo>
      <Titulo tamanho={76}>Quanto tempo leva para um jovem virar craque?</Titulo>
      <div style={{ position: "relative", width: "100%", height: 760 }}>
        <div style={{ position: "absolute", left: 0, top: 20 }}><Celular tela="nov-jovem.png" altura={600} largura={440} giro={-5} /></div>
        <div style={{ position: "absolute", right: 0, top: 110 }}><Celular tela="nov-craque.png" altura={600} largura={440} giro={4} /></div>
        <Etiqueta estilo={{ left: 30, bottom: 0, transform: "rotate(-5deg)" }}><div style={{ fontSize: 34 }}>19 anos</div><div style={{ fontSize: 60 }}>força 89</div></Etiqueta>
        <Etiqueta cor={COR.esmeralda} texto="white" estilo={{ right: 20, bottom: 0, transform: "rotate(4deg)" }}><div style={{ fontSize: 34 }}>o teto</div><div style={{ fontSize: 60 }}>99</div></Etiqueta>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
        <Cartao icone="📈" titulo="Jogou muito, evolui" texto="Jovem que joga bastante chega a uns 90" />
        <Cartao icone="🏆" titulo="99 é para poucos" texto="Várias temporadas excelentes seguidas, sem lesão longa" />
      </div>
    </>
  ),
  // 4. Convites só depois do primeiro ano
  () => (
    <>
      <Selo>📩 CARREIRA</Selo>
      <Titulo tamanho={88}>Convite de clube grande? <span style={{ color: COR.dourado }}>Só no 2º ano</span></Titulo>
      {sub("Na primeira temporada ninguém te chama. Primeiro mostre serviço no seu clube.")}
      <div style={{ position: "relative", marginTop: 10 }}>
        <Celular tela="nov-painel.png" altura={760} giro={-3} largura={520} />
        <Etiqueta estilo={{ right: -150, top: 300, transform: "rotate(6deg)" }}><div style={{ fontSize: 34 }}>1ª temporada</div><div style={{ fontSize: 56 }}>foco no clube 💪</div></Etiqueta>
      </div>
    </>
  ),
  // 5. Enquete e caixinha
  () => (
    <>
      <Selo>🗳️ SUA VEZ</Selo>
      <Titulo tamanho={86}>Você vende no leilão ou espera a proposta melhor?</Titulo>
      <LugarDaFigurinha titulo="Vendo na hora 🔨  ·  Espero ⏳" nota="(coloque a enquete aqui)" altura={260} />
      <div style={{ fontSize: 110, margin: "20px 0" }}>⚽</div>
      <LugarDaFigurinha titulo="Que novidade você quer no próximo?" nota="(coloque a caixinha de perguntas aqui)" altura={280} />
    </>
  ),
];

export const QUANTOS_STORIES_NOVIDADES = STORIES.length;

export function StoriesNovidades() {
  useFontes();
  const quadro = STORIES[useCurrentFrame()] ?? STORIES[0];
  return (
    <AbsoluteFill style={{ fontFamily: FONTE, alignItems: "center", padding: "130px 70px 0" }}>
      <Fundo />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Icone tamanho={64} desde={-30} />
          <span style={{ fontFamily: SERIFADA, fontSize: 58, color: "white" }}>Proffut</span>
        </div>
        {quadro()}
      </div>
    </AbsoluteFill>
  );
}
