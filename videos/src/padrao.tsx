// Padrão dos vídeos (nov/2026): a Versão D do episódio 1 (mural 3D, objetos flutuando, legenda palavra por palavra) com
// as transições e os sons do episódio 4. Sem a voz daqui (o usuário põe a voz no CapCut), a legenda palavra por palavra
// sai do texto da fala de cada cena, no ritmo de quem fala (`palavrasDasCenas`).
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";

export const s = (segundos: number) => Math.round(segundos * 30);
export type Palavra = { p: string; i: number; f: number };

/**
 * Tempo de cada palavra a partir do texto de cada cena: começa logo depois do corte, no ritmo de ~2,6 palavras por
 * segundo (as palavras longas duram mais) e, se não couber, aperta para terminar antes da cena seguinte.
 */
export function palavrasDasCenas(cenas: number[], falas: string[]): Palavra[] {
  const lista: Palavra[] = [];
  falas.forEach((fala, k) => {
    const ps = fala.split(/\s+/).filter(Boolean);
    const peso = ps.map((p) => 0.22 + p.replace(/[^\p{L}\p{N}]/gu, "").length * 0.035 + (/[.,:?!…]$/.test(p) ? 0.18 : 0));
    const total = peso.reduce((a, b) => a + b, 0);
    const inicio = cenas[k] + 0.25;
    const espaco = cenas[k + 1] - 0.35 - inicio;
    const escala = Math.min(1, espaco / total);
    let t = inicio;
    ps.forEach((p, i) => {
      const d = peso[i] * escala;
      lista.push({ p, i: +t.toFixed(2), f: +(t + d * 0.85).toFixed(2) });
      t += d;
    });
  });
  return lista;
}

/** Troca de cena com impacto: entra com zoom e desfoque rápidos e sai empurrada para cima. */
export function Troca({ duracao, children }: { duracao: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const entra = interpolate(f, [0, 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  const sai = interpolate(f, [duracao - 6, duracao], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t });
  return (
    <AbsoluteFill style={{ opacity: Math.min(entra, 1 - sai), filter: `blur(${(1 - entra) * 18 + sai * 18}px)`, transform: `scale(${1.25 - entra * 0.25 + sai * 0.1}) translateY(${-sai * 160}px)` }}>
      {children}
    </AbsoluteFill>
  );
}

/** Um flash branco curto em cada corte. */
export function Flashes({ cenas }: { cenas: number[] }) {
  const f = useCurrentFrame();
  const perto = Math.min(...cenas.slice(1, -1).map((t) => Math.abs(f - s(t))));
  const v = interpolate(perto, [0, 4], [0.55, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "white", opacity: v, pointerEvents: "none" }} />;
}

/** Efeitos sonoros de public/sfx: [segundo, nome, volume]; mais o whoosh antes de cada corte. */
export function Sons({ cenas, efeitos, escala = 1 }: { cenas: number[]; efeitos: [number, string, number][]; escala?: number }) {
  const todos: [number, string, number][] = [...cenas.slice(1, -1).map((t) => [t - 0.2, "whoosh", 0.55] as [number, string, number]), ...efeitos];
  return (
    <>
      {todos.map(([t, nome, volume], i) => (
        <Sequence key={i} from={Math.max(0, s(t))} durationInFrames={s(4)}>
          <Audio src={staticFile(`sfx/${nome}.wav`)} volume={volume * escala} />
        </Sequence>
      ))}
    </>
  );
}
