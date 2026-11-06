// Peças repetidas nos episódios: o ícone do app.
import { COR, SERIFADA, useMola } from "./estilo";

/** Ícone do app (o "P." do jogo). */
export function Icone({ tamanho = 220, desde = 0 }: { tamanho?: number; desde?: number }) {
  const m = useMola(desde, 120);
  return (
    <div
      style={{
        width: tamanho, height: tamanho, borderRadius: tamanho * 0.24, background: COR.floresta,
        border: "3px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${m}) rotate(${(1 - m) * -12}deg)`,
      }}
    >
      <span style={{ fontFamily: SERIFADA, color: "white", fontSize: tamanho * 0.62, lineHeight: 1 }}>
        P<span style={{ color: COR.dourado }}>.</span>
      </span>
    </div>
  );
}

