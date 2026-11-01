import type { AcaoDoCampo, PartidaViva } from "../../engine/partida";
import { Escudo } from "../componentes";
import { useJogo } from "../store";

/** O que o rótulo do campo diz em cada lance. */
const TEXTO_DA_ACAO: Record<AcaoDoCampo, string> = {
  inicio: "Saída de bola",
  segura: "Bola segura",
  posse: "Em posse",
  ataque: "Ataque",
  perigo: "Ataque perigoso",
  chute: "Chute para fora",
  defesa: "Chute defendido",
  gol: "GOL!",
  escanteio: "Escanteio",
  falta: "Falta",
  "falta-perigosa": "Falta perigosa",
  penalti: "Pênalti!",
  "penalti-perdido": "Pênalti perdido",
  amarelo: "Cartão amarelo",
  vermelho: "Cartão vermelho",
  intervalo: "Intervalo",
  fim: "Fim de jogo",
};

// O campo em metros: 105 de comprimento e 55 de largura (mais baixo que um de verdade, para caber no alto da tela do
// celular), com a grande área, a pequena área e o círculo central do tamanho de sempre.
const COMPRIMENTO = 105;
const LARGURA = 55;
const MEIO = LARGURA / 2;
/** Do lance (0 a 100 nos dois sentidos) para o desenho, dentro das linhas. */
const noDesenho = ([x, y]: [number, number]): [number, number] => [1 + (x / 100) * (COMPRIMENTO - 2), 1 + (y / 100) * (LARGURA - 2)];

/**
 * O campo 2D da partida (R60), no estilo dos aplicativos de futebol ao vivo: a bola com o caminho do minuto, a sombra
 * do time com a bola (do gol dele até onde chegou, com a ponta virada para o ataque) e o lance com o time e o jogador.
 */
export function CampoDaPartida({ pv, meuLado, duracao }: { pv: PartidaViva; meuLado: 0 | 1; duracao: number }) {
  const estado = useJogo();
  const lance = pv.campo?.lance;
  if (!lance) return null;
  const cor = (lado: 0 | 1) => (lado === meuLado ? "var(--esmeralda)" : "var(--azul)");
  const pontos = lance.caminho.map(noDesenho);
  const fim = lance.caminho[lance.caminho.length - 1];
  const [bx, by] = pontos[pontos.length - 1];
  const frente = noDesenho([lance.frente, 0])[0];
  const ponta = 5;
  const sombra =
    lance.lado === 0
      ? `1,1 ${frente - ponta},1 ${frente},${MEIO} ${frente - ponta},${LARGURA - 1} 1,${LARGURA - 1}`
      : `${COMPRIMENTO - 1},1 ${frente + ponta},1 ${frente},${MEIO} ${frente + ponta},${LARGURA - 1} ${COMPRIMENTO - 1},${LARGURA - 1}`;
  const clube = estado.clubes[pv.lados[lance.quem].clubeId];
  const jogador = lance.jogadorId != null ? estado.jogadores[lance.jogadorId] : undefined;
  const texto = TEXTO_DA_ACAO[lance.acao];
  return (
    <div className="campo-2d" data-lance={lance.n} data-acao={lance.acao} data-bola={fim.join(",")}>
      <svg viewBox={`0 0 ${COMPRIMENTO} ${LARGURA}`} role="img" aria-label={`${texto}: ${clube.nome}`}>
        <rect width={COMPRIMENTO} height={LARGURA} className="gramado" />
        {Array.from({ length: 5 }, (_, i) => <rect key={i} x={i * 21} width={10.5} height={LARGURA} className="faixa" />)}
        <polygon points={sombra} className="sombra" />
        <g className="linhas">
          <rect x={1} y={1} width={COMPRIMENTO - 2} height={LARGURA - 2} />
          <line x1={COMPRIMENTO / 2} y1={1} x2={COMPRIMENTO / 2} y2={LARGURA - 1} />
          <circle cx={COMPRIMENTO / 2} cy={MEIO} r={7} />
          <rect x={1} y={MEIO - 15} width={14} height={30} />
          <rect x={COMPRIMENTO - 15} y={MEIO - 15} width={14} height={30} />
          <rect x={1} y={MEIO - 6.5} width={5} height={13} />
          <rect x={COMPRIMENTO - 6} y={MEIO - 6.5} width={5} height={13} />
          <rect x={-0.5} y={MEIO - 3.5} width={1.5} height={7} />
          <rect x={COMPRIMENTO - 1} y={MEIO - 3.5} width={1.5} height={7} />
        </g>
        <g className="marcas">
          <circle cx={COMPRIMENTO / 2} cy={MEIO} r={0.5} />
          <circle cx={11} cy={MEIO} r={0.45} />
          <circle cx={COMPRIMENTO - 11} cy={MEIO} r={0.45} />
        </g>
        {pontos.length > 1 && <polyline points={pontos.map((p) => p.join(",")).join(" ")} className="caminho" />}
        {pontos.slice(0, -1).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.9} className="toque" style={{ fill: cor(lance.lado) }} />)}
        <g className="bola" style={{ transform: `translate(${bx}px, ${by}px)`, transitionDuration: `${duracao}ms` }}>
          <circle r={3.2} className="brilho" />
          <circle r={1.5} className="miolo" />
        </g>
      </svg>
      {/* O rótulo fica do outro lado do campo, longe da bola. */}
      <div className={`lance-do-campo ${fim[0] > 50 ? "esquerda" : "direita"}${lance.acao === "gol" ? " gol" : ""}`} style={{ borderColor: cor(lance.quem) }}>
        <b>{texto}</b>
        <span className="time-do-lance"><Escudo clube={clube} tamanho={16} /><span className="corta">{clube.nome}</span></span>
      </div>
      {jogador && (
        <span
          className={`jogador-do-lance${fim[1] < 30 ? " embaixo" : ""}`}
          style={{ left: `${Math.min(80, Math.max(20, (bx / COMPRIMENTO) * 100))}%`, top: `${(by / LARGURA) * 100}%` }}
        >
          {jogador.nome}
        </span>
      )}
    </div>
  );
}
