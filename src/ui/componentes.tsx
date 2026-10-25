import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { hashTexto } from "../engine/rng";
import type { Clube, Posicao } from "../engine/tipos";
import { useLoja } from "./store";

// ---- escudo ------------------------------------------------------------------------

function luminancia(hex: string): number {
  const v = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Escudo do clube: o importado neste aparelho, se houver; senão o do jogo (`public/escudos/<id>.png`, da
 * prancha que o usuário mandou); se a imagem não carregar, um escudo desenhado com as cores e a sigla.
 */
export function Escudo({ clube, tamanho = 32 }: { clube: Pick<Clube, "id" | "sigla" | "cores">; tamanho?: number }) {
  const importado = useLoja((s) => s.escudos[clube.id]);
  const [falharam, setFalharam] = useState<string[]>([]);
  const imagem = [importado, `escudos/${clube.id}.png`].find((src): src is string => !!src && !falharam.includes(src));
  if (imagem) {
    return (
      <img className="escudo" src={imagem} width={tamanho} height={tamanho} alt="" style={{ flexShrink: 0, objectFit: "contain" }}
        onError={() => setFalharam((f) => [...f, imagem])} />
    );
  }
  const { primaria, secundaria } = clube.cores;
  const modelo = hashTexto(clube.id) % 4;
  const corTexto = luminancia(primaria) > 0.45 ? "#111" : "#fff";
  const contorno = "M10 6 H90 V46 C90 74 68 88 50 96 C32 88 10 74 10 46 Z";
  const idClip = `e-${clube.id}`;
  return (
    <svg className="escudo" width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <clipPath id={idClip}><path d={contorno} /></clipPath>
      </defs>
      <g clipPath={`url(#${idClip})`}>
        <rect width="100" height="100" fill={primaria} />
        {modelo === 0 && <rect y="58" width="100" height="14" fill={secundaria} />}
        {modelo === 1 && [20, 50, 80].map((x) => <rect key={x} x={x - 6} width="12" height="100" fill={secundaria} opacity="0.9" />)}
        {modelo === 2 && <path d="M0 30 L30 0 L48 0 L0 48 Z M100 70 L70 100 L52 100 L100 52 Z" fill={secundaria} />}
        {modelo === 3 && <rect x="50" width="50" height="100" fill={secundaria} />}
        {(modelo === 1 || modelo === 3) && <rect y="34" width="100" height="30" fill={primaria} />}
      </g>
      <path d={contorno} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="4" />
      <text
        x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        fontSize={clube.sigla.length > 3 ? 22 : 27} fontWeight="800"
        fill={corTexto}
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {clube.sigla}
      </text>
    </svg>
  );
}

// ---- ícones ---------------------------------------------------------------------------

const CAMINHOS: Record<string, ReactNode> = {
  clube: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" />,
  elenco: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.8.3 5 2.6 5 5.8" /></>,
  tatica: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M3.5 12h17" /><circle cx="12" cy="12" r="3" /></>,
  tabelas: <><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 13v4M8 20h8" /></>,
  mercado: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  mensagens: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  voltar: <path d="M15 18l-6-6 6-6" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  dinheiro: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /></>,
  historico: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  play: <path d="M8 5l11 7-11 7V5z" fill="currentColor" />,
  pausa: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></>,
  troca: <path d="M7 4v13l-3-3M17 20V7l3 3" />,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  som: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></>,
  mudo: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></>,
};

export function Icone({ nome }: { nome: keyof typeof CAMINHOS | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[nome]}
    </svg>
  );
}

// ---- blocos ----------------------------------------------------------------------------

export function Cartao({ titulo, acao, children, compacto }: { titulo?: string; acao?: ReactNode; children: ReactNode; compacto?: boolean }) {
  return (
    <section className={`cartao${compacto ? " compacto" : ""}`}>
      {(titulo || acao) && (
        <div className="cabeca">
          {titulo && <h3>{titulo}</h3>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Folha que sobe de baixo. Fica direto no <body>: dentro de uma área com rolagem, o Safari do
 * iPhone a desenharia por baixo da barra de abas (teste R16).
 */
export function Folha({ titulo, aoFechar, children }: { titulo?: ReactNode; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);
  return createPortal(
    <div className="veu" onClick={aoFechar} role="presentation">
      <div className="folha" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="alca" />
        {titulo && (
          <div className="cabeca-folha">
            <h2 className="cresce">{titulo}</h2>
            <button className="icone-botao" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Segmentado<T extends string>({ opcoes, valor, aoMudar }: { opcoes: { valor: T; rotulo: ReactNode }[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div className="segmentado" role="tablist">
      {opcoes.map((o) => (
        <button key={o.valor} role="tab" aria-selected={o.valor === valor} className={o.valor === valor ? "ativo" : ""} onClick={() => aoMudar(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Opcoes<T extends string>({ opcoes, valor, aoMudar }: { opcoes: { valor: T; rotulo: ReactNode }[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div className="opcoes">
      {opcoes.map((o) => (
        <button key={o.valor} className={`opcao${o.valor === valor ? " ativa" : ""}`} aria-pressed={o.valor === valor} onClick={() => aoMudar(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Barra({ valor, cor }: { valor: number; cor?: string }) {
  const v = Math.max(0, Math.min(100, valor));
  const c = cor ?? (v >= 70 ? "var(--esmeralda)" : v >= 45 ? "var(--dourado)" : "var(--vermelho)");
  return <div className="barra" role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${v}%`, background: c }} /></div>;
}

export function Pos({ pos }: { pos: Posicao }) {
  return <span className={`posicao ${pos}`}>{pos}</span>;
}

export function Topo({ titulo, sub, aoVoltar, direita }: { titulo: ReactNode; sub?: ReactNode; aoVoltar?: () => void; direita?: ReactNode }) {
  return (
    <header className="topo">
      {aoVoltar && <button className="icone-botao" onClick={aoVoltar} aria-label="Voltar"><Icone nome="voltar" /></button>}
      <div className="cresce">
        <div className="titulo corta">{titulo}</div>
        {sub && <div className="sub corta">{sub}</div>}
      </div>
      {direita}
    </header>
  );
}

export function Aviso() {
  const aviso = useLoja((s) => s.aviso);
  const limpar = () => useLoja.setState({ aviso: null });
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(limpar, 3500);
    return () => clearTimeout(t);
  }, [aviso]);
  if (!aviso) return null;
  return <div className="aviso" role="status" onClick={limpar} key={aviso.id}>{aviso.texto}</div>;
}
