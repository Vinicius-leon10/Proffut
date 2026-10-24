import { useState } from "react";
import { ESTILOS } from "../../engine/constantes";
import { FORMACOES, NOMES_POSICAO, calcularSetores, corForca, disponivel, escalarAutomatico, forcaEfetiva, type Vaga } from "../../engine/forca";
import { elencoDe } from "../../engine/mercado";
import { redistribuir } from "../../engine/partida";
import type { Estilo, Formacao, Jogador, Tatica as TaticaTipo } from "../../engine/tipos";
import { Barra, Cartao, Folha, Opcoes, Pos } from "../componentes";
import { useJogo, useLoja } from "../store";
import { Situacao } from "./Elenco";

export function nomeCurto(nome: string): string {
  if (nome.length <= 12) return nome;
  const partes = nome.split(" ");
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : nome.slice(0, 11) + "…";
}

const FORMACOES_LISTA = Object.keys(FORMACOES) as Formacao[];

export function LinhasDoCampo() {
  return (
    <svg className="linhas" viewBox="0 0 100 122" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="0.6">
        <rect x="3" y="3" width="94" height="116" />
        <line x1="3" y1="61" x2="97" y2="61" />
        <circle cx="50" cy="61" r="11" />
        <rect x="24" y="3" width="52" height="18" />
        <rect x="24" y="101" width="52" height="18" />
        <rect x="38" y="3" width="24" height="7" />
        <rect x="38" y="112" width="24" height="7" />
      </g>
    </svg>
  );
}

export function Tatica() {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const clube = estado.clubes[estado.tecnico.clubeId];
  const elenco = elencoDe(estado, clube.id);
  const vagas = FORMACOES[clube.tatica.formacao];
  const [vagaAberta, setVagaAberta] = useState<number | null>(null);
  const [reservaAberta, setReservaAberta] = useState<number | null>(null);

  const jog = (id: number | null | undefined): Jogador | undefined => (id != null ? estado.jogadores[id] : undefined);
  const titulares = clube.escalacao.titulares;
  const reservas = clube.escalacao.reservas;

  const mudarTatica = (mudanca: Partial<TaticaTipo>) => {
    const nova = { ...clube.tatica, ...mudanca };
    if (mudanca.formacao && mudanca.formacao !== clube.tatica.formacao) {
      const ids = titulares.filter((id): id is number => id != null);
      const energia = Object.fromEntries(ids.map((id) => [id, estado.jogadores[id].energia]));
      const atuacoes = redistribuir(ids, nova, energia, estado.jogadores);
      const novasVagas = FORMACOES[nova.formacao];
      const novo: (number | null)[] = novasVagas.map(() => null);
      for (const a of atuacoes) novo[novasVagas.indexOf(a.vaga)] = a.jogadorId;
      clube.escalacao.titulares = novo;
    }
    clube.tatica = nova;
    atualizar();
  };

  const escolherParaVaga = (indice: number, jogadorId: number) => {
    const atual = titulares[indice];
    const outraVaga = titulares.indexOf(jogadorId);
    const naReserva = reservas.indexOf(jogadorId);
    const novos = [...titulares];
    novos[indice] = jogadorId;
    if (outraVaga >= 0) novos[outraVaga] = atual;
    clube.escalacao.titulares = novos;
    if (naReserva >= 0) {
      const r = [...reservas];
      if (atual != null) r[naReserva] = atual; else r.splice(naReserva, 1);
      clube.escalacao.reservas = r;
    }
    setVagaAberta(null);
    atualizar();
  };

  const escolherParaReserva = (indice: number, jogadorId: number) => {
    const r = [...reservas];
    const outra = r.indexOf(jogadorId);
    if (outra >= 0) [r[indice], r[outra]] = [r[outra], r[indice]];
    else r[indice] = jogadorId;
    clube.escalacao.reservas = r;
    setReservaAberta(null);
    atualizar();
  };

  const automatica = () => {
    clube.escalacao = escalarAutomatico(elenco, clube.tatica.formacao, clube.tatica.jogadas);
    atualizar();
    avisar("Escalação montada com os melhores disponíveis.");
  };

  // Força dos setores com a escalação atual (sem mando de campo).
  const emCampo = titulares
    .map((id, i) => ({ jogador: jog(id)!, vaga: vagas[i], energia: jog(id)?.energia ?? 0 }))
    .filter((x) => x.jogador);
  const s = calcularSetores(emCampo, clube.tatica.jogadas);
  const estilo = ESTILOS[clube.tatica.estilo];
  const setores = [
    { nome: "Defesa", valor: s.defesa * estilo.defesa },
    { nome: "Meio", valor: s.meio * estilo.meio },
    { nome: "Ataque", valor: s.ataque * estilo.ataque },
  ];
  const problemas = titulares.filter((id) => !jog(id) || !disponivel(jog(id)!)).length;

  return (
    <>
      <div className="linha entre">
        <h2>Tática</h2>
        <button className="botao pequeno" onClick={automatica}>Escalar automático</button>
      </div>

      {problemas > 0 && (
        <p className="chip vermelho" style={{ whiteSpace: "normal" }}>
          {problemas} vaga(s) com jogador lesionado, suspenso ou vazia. Se não trocar, o melhor disponível entra no lugar.
        </p>
      )}

      <div className="campo">
        <LinhasDoCampo />
        {vagas.map((v, i) => {
          const j = jog(titulares[i]);
          const ef = j ? Math.round(forcaEfetiva(j, v, j.energia, clube.tatica.jogadas)) : 0;
          const cor = j ? (disponivel(j) ? corForca(ef, j.forca) : "vermelho") : "vazia";
          return (
            <button key={i} className={`vaga${vagaAberta === i ? " selecionada" : ""}`} style={{ left: `${v.x}%`, top: `${v.y}%` }} onClick={() => setVagaAberta(i)} aria-label={`${NOMES_POSICAO[v.pos]}: ${j?.nome ?? "vazio"}`}>
              <span className={`camisa ${cor}`}>{j ? ef : v.pos}</span>
              <span className="nome">{j ? nomeCurto(j.nome) : "—"}</span>
            </button>
          );
        })}
      </div>
      <p className="mini muito-fraco">O número é a força que o jogador rende naquela vaga, com o cansaço atual. Verde: rendimento cheio. Amarelo e vermelho: fora de posição ou cansado.</p>

      <Cartao titulo="Força do time">
        <div className="coluna" style={{ gap: 8 }}>
          {setores.map((x) => (
            <div key={x.nome}>
              <div className="linha entre pequeno"><span>{x.nome}</span><span className="num negrito">{Math.round(x.valor)}</span></div>
              <Barra valor={x.valor} cor="var(--azul)" />
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Reservas">
        <div className="lista">
          {Array.from({ length: 7 }, (_, i) => {
            const j = jog(reservas[i]);
            return (
              <button key={i} className="item" onClick={() => setReservaAberta(i)}>
                {j ? <Pos pos={j.posicao} /> : <span className="posicao" style={{ background: "var(--cartao-2)" }}>–</span>}
                <span className="cresce corta pequeno negrito">{j?.nome ?? "Vazio"}</span>
                {j && <Situacao j={j} />}
                {j && <span className="forca">{j.forca}</span>}
              </button>
            );
          })}
        </div>
      </Cartao>

      <Cartao titulo="Formação">
        <Opcoes opcoes={FORMACOES_LISTA.map((f) => ({ valor: f, rotulo: f }))} valor={clube.tatica.formacao} aoMudar={(f) => mudarTatica({ formacao: f })} />
      </Cartao>
      <Cartao titulo="Estilo de jogo">
        <Opcoes
          opcoes={(Object.keys(ESTILOS) as Estilo[]).map((e) => ({ valor: e, rotulo: ESTILOS[e].nome }))}
          valor={clube.tatica.estilo}
          aoMudar={(e) => mudarTatica({ estilo: e })}
        />
        <p className="mini muito-fraco" style={{ marginTop: 8 }}>{DESCRICAO_ESTILO[clube.tatica.estilo]}</p>
      </Cartao>
      <Cartao titulo="Marcação e jogadas">
        <div className="coluna">
          <Opcoes opcoes={[{ valor: "normal", rotulo: "Marcação normal" }, { valor: "pressao", rotulo: "Pressão" }]} valor={clube.tatica.marcacao} aoMudar={(m) => mudarTatica({ marcacao: m })} />
          <Opcoes opcoes={[{ valor: "meio", rotulo: "Jogadas pelo meio" }, { valor: "pontas", rotulo: "Jogadas pelas pontas" }]} valor={clube.tatica.jogadas} aoMudar={(m) => mudarTatica({ jogadas: m })} />
          <p className="mini muito-fraco">Pressão rouba mais bolas, mas cansa e dá mais cartões. Pelas pontas valoriza laterais e atacantes com cruzamento e velocidade; pelo meio valoriza meias com passe, armação e drible.</p>
        </div>
      </Cartao>
      <label className="cartao linha entre">
        <span className="pequeno">Escalar automaticamente antes de cada jogo</span>
        <input type="checkbox" style={{ width: 24, minHeight: 24 }} checked={estado.config.escalacaoAutomatica} onChange={(e) => { estado.config.escalacaoAutomatica = e.target.checked; atualizar(); }} />
      </label>

      {vagaAberta !== null && (
        <EscolherJogador
          titulo={`${NOMES_POSICAO[vagas[vagaAberta].pos]}${vagas[vagaAberta].lado ? ` (${vagas[vagaAberta].lado === "D" ? "direita" : "esquerda"})` : ""}`}
          vaga={vagas[vagaAberta]}
          elenco={elenco}
          titulares={titulares}
          reservas={reservas}
          jogadas={clube.tatica.jogadas}
          aoEscolher={(id) => escolherParaVaga(vagaAberta, id)}
          aoFechar={() => setVagaAberta(null)}
        />
      )}
      {reservaAberta !== null && (
        <EscolherJogador
          titulo="Reserva"
          elenco={elenco.filter((j) => !titulares.includes(j.id))}
          titulares={titulares}
          reservas={reservas}
          jogadas={clube.tatica.jogadas}
          aoEscolher={(id) => escolherParaReserva(reservaAberta, id)}
          aoFechar={() => setReservaAberta(null)}
        />
      )}
    </>
  );
}

const DESCRICAO_ESTILO: Record<Estilo, string> = {
  equilibrado: "Sem riscos: defesa, meio e ataque com o mesmo peso.",
  ofensivo: "Mais força no ataque, defesa um pouco exposta. Cansa mais.",
  defensivo: "Fecha a defesa e abre mão do ataque. Cansa menos.",
  "contra-ataque": "Defende com muita gente e sai rápido: rende mais contra times que têm a bola.",
  "ataque-total": "Tudo pelo gol, deixando a defesa aberta. Cansa muito.",
  posse: "Domina o meio-campo e troca passes. Ataque menos agudo.",
};

function EscolherJogador(props: {
  titulo: string;
  vaga?: Vaga;
  elenco: Jogador[];
  titulares: (number | null)[];
  reservas: number[];
  jogadas: TaticaTipo["jogadas"];
  aoEscolher: (id: number) => void;
  aoFechar: () => void;
}) {
  const { vaga, elenco, titulares, reservas, jogadas } = props;
  const nota = (j: Jogador) => (vaga ? forcaEfetiva(j, vaga, j.energia, jogadas) : j.forca);
  const lista = [...elenco].sort((a, b) => Number(disponivel(b)) - Number(disponivel(a)) || nota(b) - nota(a));
  return (
    <Folha titulo={props.titulo} aoFechar={props.aoFechar}>
      <div className="lista">
        {lista.map((j) => {
          const ef = Math.round(nota(j));
          const onde = titulares.includes(j.id) ? "titular" : reservas.includes(j.id) ? "reserva" : "";
          return (
            <button key={j.id} className="item" onClick={() => props.aoEscolher(j.id)} disabled={!disponivel(j)}>
              <Pos pos={j.posicao} />
              <div className="cresce">
                <div className="linha" style={{ gap: 6 }}>
                  <span className="negrito pequeno corta">{j.nome}</span>
                  <Situacao j={j} />
                </div>
                <div className="mini fraco">{onde && <span className="amarelo">{onde} · </span>}energia {Math.round(j.energia)}% · força {j.forca}</div>
              </div>
              <span className={`forca ${corForca(ef, j.forca)}`} style={{ fontSize: "1.1rem" }}>{ef}</span>
            </button>
          );
        })}
      </div>
    </Folha>
  );
}
