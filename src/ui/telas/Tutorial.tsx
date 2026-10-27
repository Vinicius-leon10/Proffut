import { useState, type ReactNode } from "react";
import { comArtigo } from "../../engine/artigos";
import { MAX_SUBSTITUICOES } from "../../engine/constantes";
import { Folha, Icone } from "../componentes";
import { useJogo, useLoja } from "../store";

/** Tutorial rápido do jogo novo: some ao terminar ou pular, e volta por Configurações → Ver o tutorial. */
export function Tutorial() {
  const estado = useJogo();
  const { atualizar } = useLoja();
  const [passo, setPasso] = useState(0);
  const clube = estado.clubes[estado.tecnico.clubeId];
  const passos: { titulo: string; icone: string; texto: ReactNode }[] = [
    {
      titulo: `Bem-vindo ${comArtigo("ao", clube)}!`,
      icone: "clube",
      texto: (
        <>
          Você é o técnico. A diretoria espera: <b>{estado.objetivo.descricao}</b>. Bons resultados aumentam a confiança da
          diretoria e da torcida; se a da diretoria cair muito, você pode ser demitido.
        </>
      ),
    },
    {
      titulo: "Avance até o jogo",
      icone: "play",
      texto: <>No painel, o botão <b>Avançar</b> leva ao próximo jogo. Tocando no escudo do adversário, você vê o time titular dele.</>,
    },
    {
      titulo: "Monte o time",
      icone: "tatica",
      texto: (
        <>
          Na aba <b>Tática</b> você escolhe a formação, o estilo de jogo e quem joga: toque num jogador do campinho para trocar.
          O número de cada um é a força que ele rende naquela vaga: verde é rendimento cheio; amarelo e vermelho, fora de
          posição ou cansado.
        </>
      ),
    },
    {
      titulo: "Durante o jogo",
      icone: "troca",
      texto: (
        <>
          Na partida dá para fazer até {MAX_SUBSTITUICOES} substituições e mudar a tática. A aba <b>Estatísticas</b> mostra
          se o adversário está pressionando; no fim do jogo, a aba <b>Notas</b> mostra quem jogou bem.
        </>
      ),
    },
    {
      titulo: "Elenco e mercado",
      icone: "mercado",
      texto: (
        <>
          No <b>Elenco</b> você renova contratos e empresta quem não joga. No <b>Mercado</b> você compra, vende e contrata
          jogadores livres. De olho no caixa e na folha de salários, no botão <b>Finanças</b> do painel.
        </>
      ),
    },
    {
      titulo: "Tudo fica salvo",
      icone: "config",
      texto: (
        <>
          O jogo salva sozinho no celular. Para guardar uma cópia, use <b>Configurações → Exportar save</b>. Este tutorial
          também fica em Configurações. Boa sorte!
        </>
      ),
    },
  ];
  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;
  const fechar = () => {
    delete estado.tutorial;
    atualizar();
  };
  return (
    <Folha titulo={atual.titulo} aoFechar={fechar}>
      <div className="tutorial">
        <span className="tutorial-icone"><Icone nome={atual.icone} /></span>
        <p>{atual.texto}</p>
        <div className="tutorial-pontos">
          {passos.map((p, i) => <span key={p.titulo} className={i === passo ? "ativo" : ""} />)}
          <span className="mini fraco">{passo + 1} de {passos.length}</span>
        </div>
        <div className="linha">
          {!ultimo && <button className="botao cresce" onClick={fechar}>Pular</button>}
          <button className="botao primario cresce" onClick={() => (ultimo ? fechar() : setPasso(passo + 1))}>
            {ultimo ? "Começar a jogar" : "Próximo"}
          </button>
        </div>
      </div>
    </Folha>
  );
}
