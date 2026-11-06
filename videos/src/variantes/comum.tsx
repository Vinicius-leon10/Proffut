// Peças comuns das 3 versões do episódio 1 (teste de estilo): a voz com o tempo de cada palavra e as cenas.
import type { CSSProperties } from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import palavras from "../palavras-ep01.json";

export const PALAVRAS = palavras as { p: string; i: number; f: number }[];
export const s = (segundos: number) => Math.round(segundos * 30);
/** Começo de cada frase-cena (segundos, das palavras da voz) e o fim. */
export const CENAS = [0, 4.6, 8.6, 13.8, 18.4, 22.0, 25.0, 30.0, 37.8];
export const DURACAO = s(CENAS[CENAS.length - 1]);
export const VOZ = "voz-ep01-v2.mp3";

const DESTAQUE = new Set(["programar", "jogo", "técnico", "brasfoot", "madrugada", "pequeno", "subir", "iphone", "2026", "mil", "clubes", "américa", "vivo", "minuto", "inteligência", "artificial", "português", "tudo", "certo", "errado", "acompanhar"]);
export const limpa = (p: string) => p.toLowerCase().replace(/[.,:?!]/g, "");
export const ehDestaque = (p: string) => DESTAQUE.has(limpa(p));

/** Grupos de até `max` palavras, quebrando nas pausas (vírgula, ponto, dois-pontos). */
export function grupos(max = 3) {
  const lista: { palavras: typeof PALAVRAS; i: number; f: number }[] = [];
  let atual: typeof PALAVRAS = [];
  for (const w of PALAVRAS) {
    atual.push(w);
    if (atual.length >= max || /[.,:?!]$/.test(w.p)) {
      lista.push({ palavras: atual, i: atual[0].i, f: atual[atual.length - 1].f });
      atual = [];
    }
  }
  if (atual.length) lista.push({ palavras: atual, i: atual[0].i, f: atual[atual.length - 1].f });
  return lista;
}

/** Legenda palavra por palavra: mostra o grupo da vez; a palavra falada agora cresce e muda de cor. */
export function Legenda({ max = 3, estilo, cor = "white", corAgora = "#f5c72c", corDestaque = "#34b777", maiusculas = true, tamanho = 96, contorno = true }: {
  max?: number; estilo?: CSSProperties; cor?: string; corAgora?: string; corDestaque?: string; maiusculas?: boolean; tamanho?: number; contorno?: boolean;
}) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const lista = grupos(max);
  const g = lista.find((x, k) => t >= x.i - 0.05 && t < (lista[k + 1]?.i ?? x.f + 0.6) - 0.05);
  if (!g) return null;
  const entrada = spring({ frame: f - s(g.i), fps, config: { damping: 14, stiffness: 220, mass: 0.5 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: tamanho * 0.3, rowGap: 0, ...estilo }}>
      {g.palavras.map((w, k) => {
        const agora = t >= w.i && t < w.f + 0.08;
        const dita = t >= w.i;
        const pop = spring({ frame: f - s(w.i), fps, config: { damping: 12, stiffness: 260, mass: 0.4 } });
        return (
          <span
            key={k}
            style={{
              fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: tamanho, lineHeight: 1.1, letterSpacing: -1,
              color: agora ? corAgora : ehDestaque(w.p) && dita ? corDestaque : cor,
              opacity: dita ? 1 : 0.55,
              transform: `scale(${(0.85 + entrada * 0.15) * (agora ? 1 + (1 - pop) * 0.25 + 0.06 : 1)}) translateY(${(1 - entrada) * 30}px)`,
              textShadow: contorno ? "0 6px 0 rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.6)" : undefined,
              WebkitTextStroke: contorno ? "3px rgba(0,0,0,0.85)" : undefined,
              paintOrder: "stroke fill",
              display: "inline-block",
            }}
          >
            {maiusculas ? w.p.toUpperCase() : w.p}
          </span>
        );
      })}
    </div>
  );
}

/** Índice da cena no tempo atual (0 a 7) e quanto já passou dela (0 a 1). */
export function useCenaAtual() {
  const f = useCurrentFrame();
  const t = f / 30;
  let i = 0;
  while (i < CENAS.length - 2 && t >= CENAS[i + 1]) i++;
  return { i, t, dentro: interpolate(t, [CENAS[i], CENAS[i + 1]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) };
}
