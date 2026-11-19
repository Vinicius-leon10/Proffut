// Stories do Instagram da janela de transferências e do limite de estrangeiros (19/nov/2026, R139): 5 imagens paradas,
// 1080 × 1920, uma por quadro da composição "StoriesJanela". Telas de verdade do jogo (Corinthians) em public/stories/.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COR, FONTE, Fundo, SERIFADA, useFontes } from "./estilo";
import { Icone } from "./pecas";
import { Cartao, Celular, ESCURO, Etiqueta, Selo, Titulo } from "./StoriesFolhaCara";

const sub = (t: ReactNode) => <div style={{ fontWeight: 700, fontSize: 42, color: COR.fraco, textAlign: "center", lineHeight: 1.25 }}>{t}</div>;

/** Lugar tracejado para a figurinha do Instagram (enquete, quiz, caixinha). */
function LugarDaFigurinha({ titulo, nota, altura = 190 }: { titulo: ReactNode; nota: string; altura?: number }) {
  return (
    <div style={{ width: 860, minHeight: altura, border: "5px dashed rgba(255,255,255,0.35)", borderRadius: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "18px 30px" }}>
      <span style={{ fontWeight: 900, fontSize: 46, color: "white", textAlign: "center", lineHeight: 1.15 }}>{titulo}</span>
      <span style={{ fontWeight: 700, fontSize: 30, color: COR.fraco }}>{nota}</span>
    </div>
  );
}

function Regra({ bandeira, pais, texto }: { bandeira: string; pais: string; texto: string }) {
  return (
    <div style={{ flex: 1, background: COR.cartao, border: "2px solid rgba(255,255,255,0.14)", borderRadius: 28, padding: "16px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 50 }}>{bandeira}</div>
      <div style={{ fontWeight: 900, fontSize: 32, color: "white" }}>{pais}</div>
      <div style={{ fontWeight: 700, fontSize: 26, color: COR.fraco, lineHeight: 1.2 }}>{texto}</div>
    </div>
  );
}

const STORIES_JANELA: (() => ReactNode)[] = [
  // 1. Gancho
  () => (
    <>
      <Selo>🆕 NOVIDADE NO PROFFUT</Selo>
      <Titulo tamanho={84}>Agora não dá mais para contratar <span style={{ color: COR.dourado }}>quando quiser</span> 🔒</Titulo>
      <div style={{ position: "relative", marginTop: 6 }}>
        <Celular tela="janela-fechada-ficha.png" altura={820} giro={-3} largura={520} />
        <Etiqueta cor={COR.vermelho} texto="white" estilo={{ right: -150, top: 90, transform: "rotate(6deg)", fontSize: 44 }}>
          🔒 Janela fechada
          <div style={{ fontSize: 30, fontWeight: 700 }}>abre em 1º de julho</div>
        </Etiqueta>
      </div>
      <LugarDaFigurinha titulo="Você contrataria no meio do campeonato?" nota="(coloque a enquete aqui)" altura={170} />
    </>
  ),
  // 2. Como era
  () => (
    <>
      <Selo>⏪ COMO ERA</Selo>
      <Titulo tamanho={82}>Mercado aberto o ano todo</Titulo>
      {sub("E dava para trazer quantos estrangeiros quisesse")}
      <div style={{ position: "relative", marginTop: 20 }}>
        <Celular tela="janela-argentinos.png" altura={760} giro={3} embaixo />
        <Etiqueta estilo={{ left: -140, bottom: 90, transform: "rotate(-6deg)" }}>
          <div style={{ fontSize: 34, letterSpacing: 2 }}>NO MEIO DO ANO</div>
          <div style={{ fontSize: 64, lineHeight: 1.05 }}>time forte demais,<br />rápido demais 🚀</div>
        </Etiqueta>
      </div>
    </>
  ),
  // 3. Por que mudou
  () => (
    <>
      <Selo>🤔 POR QUE MUDOU</Selo>
      <Titulo tamanho={88}>Mais real, sem perder a graça</Titulo>
      {sub("No futebol de verdade é assim:")}
      <div style={{ display: "flex", flexDirection: "column", gap: 34, width: "100%", marginTop: 40 }}>
        <Cartao icone="🗓️" titulo="Duas janelas por ano" texto="Cada país abre o mercado em duas épocas" />
        <Cartao icone="🌎" titulo="Limite de estrangeiros" texto="Cada país diz quantos de fora cabem no elenco" />
        <Cartao icone="🧠" titulo="Planejar vale ouro" texto="Quem monta bem o elenco na janela sai na frente" />
      </div>
    </>
  ),
  // 4. Como ficou
  () => (
    <>
      <Selo>✅ COMO FICOU</Selo>
      <Titulo tamanho={74}>No Brasil: duas janelas e até 9 estrangeiros</Titulo>
      <div style={{ display: "flex", gap: 18, width: "100%" }}>
        {[["🗓️", "Jan a mar", "1ª janela"], ["🗓️", "Jul a 2/set", "2ª janela"], ["🌎", "Até 9", "estrangeiros"]].map(([i, t, d]) => (
          <div key={t} style={{ flex: 1, background: COR.dourado, color: ESCURO, borderRadius: 28, padding: "16px 8px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 40 }}>{i}</div>
            <div style={{ fontSize: 40, fontWeight: 900, whiteSpace: "nowrap" }}>{t}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{d}</div>
          </div>
        ))}
      </div>
      <Celular tela="janela-aberta.png" altura={560} giro={-2} largura={560} />
      <div style={{ fontWeight: 800, fontSize: 36, color: "white", marginTop: 6 }}>Cada país tem a sua regra:</div>
      <div style={{ display: "flex", gap: 16, width: "100%" }}>
        <Regra bandeira="🇪🇸" pais="Espanha" texto="3 de fora da Europa" />
        <Regra bandeira="🇨🇴" pais="Colômbia" texto="4 estrangeiros" />
        <Regra bandeira="🇸🇦" pais="Arábia" texto="10 estrangeiros" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 36, color: COR.esmeralda }}>✍️ Jogador livre assina a qualquer hora</div>
    </>
  ),
  // 5. Fechamento: quiz e caixinha
  () => (
    <>
      <Selo>🧠 QUIZ</Selo>
      <Titulo tamanho={80}>Quantos estrangeiros um clube brasileiro pode ter no Proffut?</Titulo>
      <LugarDaFigurinha titulo={<span style={{ fontSize: 110, letterSpacing: 6 }}>6 · 9 · 12</span>} nota="(coloque o quiz aqui · resposta certa: 9)" altura={260} />
      <div style={{ fontSize: 120, marginTop: 30, marginBottom: 20 }}>⚽</div>
      <LugarDaFigurinha titulo="Que regra do futebol real você quer no jogo?" nota="(coloque a caixinha de perguntas aqui)" altura={300} />
    </>
  ),
];

export const QUANTOS_STORIES_JANELA = STORIES_JANELA.length;

export function StoriesJanela() {
  useFontes();
  const quadro = STORIES_JANELA[useCurrentFrame()] ?? STORIES_JANELA[0];
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
