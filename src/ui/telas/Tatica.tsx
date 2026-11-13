import { useMemo, useRef, useState, type PointerEvent } from "react";
import { comArtigo } from "../../engine/artigos";
import { ESTILOS } from "../../engine/constantes";
import { FORMACOES, NOMES_POSICAO, calcularSetores, capitaoDoTime, corForca, disponivel, escalarAutomatico, forcaEfetiva, type Vaga } from "../../engine/forca";
import { elencoDoTime } from "../../engine/jogo";
import { elencoDe } from "../../engine/mercado";
import { notaCobrador, redistribuir, type LadoVivo } from "../../engine/partida";
import type { Clube, EstadoJogo, Estilo, Formacao, Jogador, Posicao, Tatica as TaticaTipo } from "../../engine/tipos";
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

/** A braçadeira do capitão, sobre a camisa no campinho. */
const Bracadeira = () => <span className="capitao" aria-label="Capitão" title="Capitão">C</span>;

/** Os clubes (e seleções) com a camisa oficial em public/camisas (R133). */
const CAMISAS = new Set(__CAMISAS__);
const CAMISAS_QUE_FALHARAM = new Set<string>();
const COR_GOLEIRO = "#f2cf3c";

/** Camisa desenhada (goleiro, ou clube sem a camisa oficial): corpo e mangas na cor, gola e punhos na outra. */
function CamisaDesenhada({ cor, detalhe }: { cor: string; detalhe: string }) {
  return (
    <svg className="camisa-desenhada" data-cor={cor} viewBox="0 0 40 36" aria-hidden="true">
      <path d="M12 2l8 3 8-3 11 7-5 8-4-2v19H10V15l-4 2-5-8z" fill={cor} stroke="rgb(0 0 0 / 35%)" strokeWidth="1" strokeLinejoin="round" />
      <path d="M15 3.2l5 2.4 5-2.4" fill="none" stroke={detalhe} strokeWidth="2" strokeLinecap="round" />
      <path d="M2.2 10.8l3.6 5.4M37.8 10.8l-3.6 5.4" stroke={detalhe} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A camisa no campinho (R133): a oficial do clube, ou a desenhada nas cores dele; o goleiro de amarelo. O número vai por cima. */
function Uniforme({ clube, numero, goleiro }: { clube: Clube; numero: number; goleiro: boolean }) {
  const [, setFalhou] = useState(false);
  const oficial = !goleiro && CAMISAS.has(clube.id) && !CAMISAS_QUE_FALHARAM.has(clube.id);
  return (
    <span className="uniforme">
      {oficial ? (
        <img src={`camisas/${clube.id}.png`} alt="" draggable={false} onError={() => { CAMISAS_QUE_FALHARAM.add(clube.id); setFalhou(true); }} />
      ) : goleiro ? (
        <CamisaDesenhada cor={COR_GOLEIRO} detalhe="#10221a" />
      ) : (
        <CamisaDesenhada cor={clube.cores.primaria} detalhe={clube.cores.secundaria} />
      )}
      <span className="numero">{numero}</span>
    </span>
  );
}

// Os números de sempre de cada posição; quem sobra fica com os outros, do 13 em diante.
const NUMEROS_DA_POSICAO: Record<Posicao, number[]> = { G: [1, 12], L: [2, 6], Z: [3, 4], M: [5, 8, 10, 7], A: [9, 11] };

/**
 * O número da camisa de cada jogador do time (R133): os melhores de cada posição ficam com os números de sempre (o
 * goleiro com o 1, os zagueiros com o 3 e o 4, o centroavante com o 9...); os outros, do 13 em diante, sem repetir.
 * Só depende do elenco: o mesmo jogador tem o mesmo número em qualquer tela.
 */
export function numerosDoTime(jogadores: Jogador[]): Map<number, number> {
  const numeros = new Map<number, number>();
  const usados = new Set<number>();
  const ordem = [...new Map(jogadores.map((j) => [j.id, j])).values()].sort((a, b) => b.forca - a.forca || a.id - b.id);
  for (const pos of ["G", "Z", "L", "M", "A"] as Posicao[]) {
    const livres = [...NUMEROS_DA_POSICAO[pos]];
    for (const j of ordem.filter((j) => j.posicao === pos)) {
      const n = livres.shift();
      if (n == null) break;
      numeros.set(j.id, n);
      usados.add(n);
    }
  }
  let proximo = 13;
  for (const j of ordem) {
    if (numeros.has(j.id)) continue;
    while (usados.has(proximo)) proximo++;
    numeros.set(j.id, proximo);
    usados.add(proximo);
  }
  return numeros;
}

/** O time em campo só para ver (o titular do adversário antes do jogo): força na vaga, cor, nome e o capitão. */
export function CampoDoTime({ clube, atuacoes, jogadas, capitao }: { clube: Clube; atuacoes: { jogador: Jogador; vaga: Vaga; energia: number }[]; jogadas: TaticaTipo["jogadas"]; capitao?: number }) {
  const estado = useJogo();
  const numeros = useMemo(() => numerosDoTime([...elencoDoTime(estado, clube.id), ...atuacoes.map((a) => a.jogador)]), [estado, clube.id, atuacoes]);
  return (
    <div className="campo">
      <LinhasDoCampo />
      {atuacoes.map(({ jogador: j, vaga: v, energia }) => {
        const ef = Math.round(forcaEfetiva(j, v, energia, jogadas));
        return (
          <div key={j.id} className="vaga" data-pos={v.pos} style={{ left: `${v.x}%`, top: `${v.y}%` }}>
            <Uniforme clube={clube} numero={numeros.get(j.id) ?? 0} goleiro={v.pos === "G"} />
            <span className={`camisa ${corForca(ef, j.forca)}`}>{ef}</span>
            {j.id === capitao && <Bracadeira />}
            <span className="nome">{nomeCurto(j.nome)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Força média de quem está em campo (a força de cada um, sem posição nem cansaço). */
export function forcaMediaDoTime(estado: EstadoJogo, lado: LadoVivo): number {
  return Math.round(lado.emCampo.reduce((s, a) => s + estado.jogadores[a.jogadorId].forca, 0) / Math.max(1, lado.emCampo.length));
}

/** "4-4-2 · Equilibrado · força média 62" de um time na partida (antes do jogo, a força média fica no placar). */
export function ResumoDoTime({ lado, semMedia }: { lado: LadoVivo; semMedia?: boolean }) {
  const estado = useJogo();
  return (
    <span>
      {lado.tatica.formacao} · {ESTILOS[lado.tatica.estilo].nome}
      {!semMedia && <> · força média <b>{forcaMediaDoTime(estado, lado)}</b></>}
    </span>
  );
}

/** Muda a tática do clube; trocando a formação, os titulares vão para as vagas novas em que rendem mais. */
export function mudarTaticaDoClube(estado: EstadoJogo, clube: Clube, mudanca: Partial<TaticaTipo>) {
  const nova = { ...clube.tatica, ...mudanca };
  if (mudanca.formacao && mudanca.formacao !== clube.tatica.formacao) {
    const ids = clube.escalacao.titulares.filter((id): id is number => id != null);
    const energia = Object.fromEntries(ids.map((id) => [id, estado.jogadores[id].energia]));
    const atuacoes = redistribuir(ids, nova, energia, estado.jogadores);
    const novasVagas = FORMACOES[nova.formacao];
    const novo: (number | null)[] = novasVagas.map(() => null);
    for (const a of atuacoes) novo[novasVagas.indexOf(a.vaga)] = a.jogadorId;
    clube.escalacao.titulares = novo;
  }
  clube.tatica = nova;
}

/** A vaga do campinho que está debaixo do dedo (fora a que está sendo arrastada). */
function vagaNoPonto(x: number, y: number, fora: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const vaga = el.closest("[data-vaga]");
    const i = vaga ? Number(vaga.getAttribute("data-vaga")) : -1;
    if (i >= 0 && i !== fora) return i;
  }
  return null;
}

/** O time titular de um clube no campinho, numa folha: "Time titular do Londrina" (ou "Provável time titular..."). */
export function FolhaDoTime({ lado, provavel, aoFechar }: { lado: LadoVivo; provavel?: boolean; aoFechar: () => void }) {
  const estado = useJogo();
  const clube = estado.clubes[lado.clubeId];
  const atuacoes = lado.emCampo.map((a) => {
    const jogador = estado.jogadores[a.jogadorId];
    return { jogador, vaga: a.vaga, energia: lado.energia[a.jogadorId] ?? jogador.energia };
  });
  return (
    <Folha titulo={`${provavel ? "Provável time titular" : "Time titular"} ${comArtigo("do", clube)}`} aoFechar={aoFechar}>
      <p className="pequeno" style={{ marginBottom: 8 }}><ResumoDoTime lado={lado} /></p>
      <CampoDoTime clube={clube} atuacoes={atuacoes} jogadas={lado.tatica.jogadas} capitao={capitaoDoTime(estado, lado.clubeId, lado.emCampo.map((a) => a.jogadorId))} />
      <p className="mini muito-fraco" style={{ marginTop: 6 }}>
        {provavel ? "Os melhores disponíveis hoje; no dia do jogo pode mudar. " : ""}O número é a força que o jogador rende naquela vaga. Verde: rendimento cheio. Amarelo e vermelho: fora de posição ou cansado.
      </p>
    </Folha>
  );
}

/**
 * O time titular no campinho para mexer antes do jogo (R52): arrastar uma camisa até outra troca os dois de vaga (R48),
 * um toque abre a escolha do jogador da vaga (um reserva, por exemplo) e embaixo do nome vai a energia (R49).
 * `titulares` segue as vagas da formação do clube; `aoMudar` recebe a escalação nova.
 */
export function CampoDaEscalacao({ clube, titulares, reservas, aoMudar }: {
  clube: Clube;
  titulares: (number | null)[];
  reservas: number[];
  aoMudar: (titulares: (number | null)[], reservas: number[]) => void;
}) {
  const estado = useJogo();
  // Na seleção, os convocados (e só a lesão tira alguém do jogo).
  const elenco = elencoDoTime(estado, clube.id);
  const selecao = clube.serie === "selecao";
  const vagas = FORMACOES[clube.tatica.formacao];
  const [vagaAberta, setVagaAberta] = useState<number | null>(null);
  // Arrastar uma camisa até outra troca os dois de vaga; um toque sem arrastar abre a escolha da vaga.
  const [arrasto, setArrasto] = useState<{ de: number; dx: number; dy: number; alvo: number | null } | null>(null);
  const toque = useRef<{ vaga: number; x: number; y: number; ponteiro: number; arrastando: boolean } | null>(null);
  const semCliqueAte = useRef(0);
  const jog = (id: number | null | undefined): Jogador | undefined => (id != null ? estado.jogadores[id] : undefined);
  const capitao = capitaoDoTime(estado, clube.id, titulares);
  const numeros = useMemo(
    () => numerosDoTime([...elenco, ...titulares.flatMap((id) => (id != null ? [estado.jogadores[id]] : []))]),
    [elenco, titulares, estado],
  );

  const trocarVagas = (a: number, b: number) => {
    const novos = [...titulares];
    [novos[a], novos[b]] = [novos[b], novos[a]];
    aoMudar(novos, reservas);
  };
  const escolherParaVaga = (indice: number, jogadorId: number) => {
    const atual = titulares[indice];
    const outraVaga = titulares.indexOf(jogadorId);
    const naReserva = reservas.indexOf(jogadorId);
    const novos = [...titulares];
    novos[indice] = jogadorId;
    if (outraVaga >= 0) novos[outraVaga] = atual;
    let r = reservas;
    if (naReserva >= 0) {
      r = [...reservas];
      if (atual != null) r[naReserva] = atual; else r.splice(naReserva, 1);
    }
    setVagaAberta(null);
    aoMudar(novos, r);
  };

  const apertar = (vaga: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (titulares[vaga] == null) return;
    toque.current = { vaga, x: e.clientX, y: e.clientY, ponteiro: e.pointerId, arrastando: false };
  };
  const mover = (e: PointerEvent<HTMLButtonElement>) => {
    const t = toque.current;
    if (!t || t.ponteiro !== e.pointerId) return;
    const [dx, dy] = [e.clientX - t.x, e.clientY - t.y];
    if (!t.arrastando) {
      if (Math.hypot(dx, dy) < 8) return;
      t.arrastando = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setArrasto({ de: t.vaga, dx, dy, alvo: vagaNoPonto(e.clientX, e.clientY, t.vaga) });
  };
  const soltar = (e: PointerEvent<HTMLButtonElement>) => {
    const t = toque.current;
    toque.current = null;
    if (!t?.arrastando) return;
    // O clique que vem logo depois de soltar não abre a escolha da vaga.
    semCliqueAte.current = Date.now() + 400;
    const alvo = vagaNoPonto(e.clientX, e.clientY, t.vaga);
    setArrasto(null);
    if (alvo != null) trocarVagas(t.vaga, alvo);
  };
  const cancelar = () => {
    toque.current = null;
    setArrasto(null);
  };

  return (
    <>
      <div className="campo">
        <LinhasDoCampo />
        {vagas.map((v, i) => {
          const j = jog(titulares[i]);
          const ef = j ? Math.round(forcaEfetiva(j, v, j.energia, clube.tatica.jogadas)) : 0;
          const cor = j ? (disponivel(j, selecao) ? corForca(ef, j.forca) : "vermelho") : "vazia";
          const arrastada = arrasto?.de === i;
          const classes = ["vaga", "arrastavel", vagaAberta === i && "selecionada", arrastada && "arrastando", arrasto?.alvo === i && "alvo"].filter(Boolean).join(" ");
          return (
            <button
              key={i}
              data-vaga={i}
              data-pos={v.pos}
              className={classes}
              style={{ left: `${v.x}%`, top: `${v.y}%`, ...(arrastada ? { transform: `translate(calc(-50% + ${arrasto.dx}px), calc(-50% + ${arrasto.dy}px))` } : {}) }}
              onPointerDown={apertar(i)}
              onPointerMove={mover}
              onPointerUp={soltar}
              onPointerCancel={cancelar}
              onClick={() => { if (Date.now() > semCliqueAte.current) setVagaAberta(i); }}
              aria-label={`${NOMES_POSICAO[v.pos]}: ${j?.nome ?? "vazio"}`}
            >
              {j && <Uniforme clube={clube} numero={numeros.get(j.id) ?? 0} goleiro={v.pos === "G"} />}
              <span className={`camisa ${cor}`}>{j ? ef : v.pos}</span>
              {j && j.id === capitao && <Bracadeira />}
              <span className="nome">{j ? nomeCurto(j.nome) : "—"}</span>
              {j && <span className="cansaco" title={`Energia ${Math.round(j.energia)}%`}><Barra valor={j.energia} /></span>}
            </button>
          );
        })}
      </div>
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
          selecao={selecao}
        />
      )}
    </>
  );
}

/** A aba Tática: formação, estilo, marcação, força do time, batedor e capitão. A escalação se ajusta antes do jogo (R51). */
export function Tatica() {
  const estado = useJogo();
  const { atualizar, avisar } = useLoja();
  const clube = estado.clubes[estado.tecnico.clubeId];
  const elenco = elencoDe(estado, clube.id);
  const vagas = FORMACOES[clube.tatica.formacao];

  const jog = (id: number | null | undefined): Jogador | undefined => (id != null ? estado.jogadores[id] : undefined);
  const titulares = clube.escalacao.titulares;

  const mudarTatica = (mudanca: Partial<TaticaTipo>) => {
    mudarTaticaDoClube(estado, clube, mudanca);
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
  // Escolhas que não valem mais (o jogador saiu do clube) contam como automático.
  const doClube = (id?: number) => (id != null && estado.jogadores[id]?.clubeId === clube.id ? id : undefined);
  const porCobranca = [...elenco].sort((a, b) => notaCobrador(b) - notaCobrador(a));
  const porExperiencia = [...elenco].sort((a, b) => b.carreira.jogos + b.temporada.jogos - (a.carreira.jogos + a.temporada.jogos) || b.idade - a.idade);
  const escolher = (campo: "batedor" | "capitao", valor: string) => {
    if (valor) clube[campo] = Number(valor);
    else delete clube[campo];
    atualizar();
  };

  return (
    <>
      <div className="linha entre">
        <h2>Tática</h2>
        <button className="botao pequeno" onClick={automatica}>Escalar automático</button>
      </div>

      {problemas > 0 && (
        <p className="chip vermelho" style={{ whiteSpace: "normal" }}>
          {problemas} vaga(s) com jogador lesionado, suspenso ou vazia. Troque no campinho antes do jogo; se não trocar, o melhor
          disponível entra no lugar.
        </p>
      )}

      <Cartao titulo="Força do time">
        <div className="coluna" style={{ gap: 8 }}>
          {setores.map((x) => (
            <div key={x.nome}>
              <div className="linha entre pequeno"><span>{x.nome}</span><span className="num negrito">{Math.round(x.valor)}</span></div>
              <Barra valor={x.valor} cor="var(--esmeralda)" />
            </div>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Batedor de pênalti e capitão">
        <div className="coluna" style={{ gap: 10 }}>
          <label className="coluna" style={{ gap: 4 }}>
            <span className="pequeno fraco">Batedor de pênalti</span>
            <select aria-label="Batedor de pênalti" value={doClube(clube.batedor) ?? ""} onChange={(e) => escolher("batedor", e.target.value)}>
              <option value="">Automático (o melhor em campo)</option>
              {porCobranca.map((j) => <option key={j.id} value={j.id}>{j.nome} ({j.posicao}, força {j.forca}{j.caracteristicas.includes("FIN") ? ", finalização" : ""})</option>)}
            </select>
          </label>
          <label className="coluna" style={{ gap: 4 }}>
            <span className="pequeno fraco">Capitão</span>
            <select aria-label="Capitão" value={doClube(clube.capitao) ?? ""} onChange={(e) => escolher("capitao", e.target.value)}>
              <option value="">Automático (o titular mais experiente)</option>
              {porExperiencia.map((j) => <option key={j.id} value={j.id}>{j.nome} ({j.posicao}, {j.carreira.jogos + j.temporada.jogos} jogos)</option>)}
            </select>
          </label>
          <p className="mini muito-fraco">Se o batedor não estiver em campo, cobra o melhor batedor que estiver; na disputa por pênaltis ele bate primeiro. O capitão usa a braçadeira (C) no campinho; se não for titular, ela vai para o titular mais experiente.</p>
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

/** As posições de trás para a frente, e o nome de cada grupo na lista. */
const ORDEM_POSICOES: Posicao[] = ["G", "L", "Z", "M", "A"];
const GRUPO_POSICAO: Record<Posicao, string> = { G: "Goleiros", L: "Laterais", Z: "Zagueiros", M: "Meio-campistas", A: "Atacantes" };

/** Os jogadores separados pela posição em campo: a pedida primeiro, depois as outras de trás para a frente (R53). */
function porPosicao(jogadores: Jogador[], primeiro?: Posicao): { pos: Posicao; jogadores: Jogador[] }[] {
  const ordem = primeiro ? [primeiro, ...ORDEM_POSICOES.filter((p) => p !== primeiro)] : ORDEM_POSICOES;
  return ordem.map((pos) => ({ pos, jogadores: jogadores.filter((j) => j.posicao === pos) })).filter((g) => g.jogadores.length);
}

/** Um jogador numa lista de escolha: posição, nome, se é titular ou reserva, energia, força e o quanto rende ali. */
function LinhaDoJogador({ j, nota, onde, aoEscolher, selecao }: { j: Jogador; nota: number; onde: string; aoEscolher: () => void; selecao?: boolean }) {
  const ef = Math.round(nota);
  return (
    <button className="item" onClick={aoEscolher} disabled={!disponivel(j, selecao)}>
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
}

/** A lista de escolha em grupos de posição; em cada grupo, quem rende mais primeiro (quem não pode jogar, no fim). */
function ListaPorPosicao({ jogadores, primeiro, nota, onde, aoEscolher, selecao }: {
  jogadores: Jogador[];
  primeiro?: Posicao;
  nota: (j: Jogador) => number;
  onde: (j: Jogador) => string;
  aoEscolher: (id: number) => void;
  /** Lista da seleção: só a lesão impede de jogar. */
  selecao?: boolean;
}) {
  return (
    <div className="coluna" style={{ gap: 10 }}>
      {porPosicao(jogadores, primeiro).map((g) => (
        <div key={g.pos} className="grupo-posicao">
          <h3 className="pequeno fraco">{GRUPO_POSICAO[g.pos]}</h3>
          <div className="lista">
            {[...g.jogadores]
              .sort((a, b) => Number(disponivel(b, selecao)) - Number(disponivel(a, selecao)) || nota(b) - nota(a))
              .map((j) => <LinhaDoJogador key={j.id} j={j} nota={nota(j)} onde={onde(j)} aoEscolher={() => aoEscolher(j.id)} selecao={selecao} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EscolherJogador(props: {
  titulo: string;
  vaga?: Vaga;
  elenco: Jogador[];
  titulares: (number | null)[];
  reservas: number[];
  jogadas: TaticaTipo["jogadas"];
  aoEscolher: (id: number) => void;
  aoFechar: () => void;
  selecao?: boolean;
}) {
  const { vaga, elenco, titulares, reservas, jogadas } = props;
  const nota = (j: Jogador) => (vaga ? forcaEfetiva(j, vaga, j.energia, jogadas) : j.forca);
  const onde = (j: Jogador) => (titulares.includes(j.id) ? "titular" : reservas.includes(j.id) ? "reserva" : "");
  return (
    <Folha titulo={props.titulo} aoFechar={props.aoFechar}>
      <ListaPorPosicao jogadores={elenco} primeiro={vaga?.pos} nota={nota} onde={onde} aoEscolher={props.aoEscolher} selecao={props.selecao} />
    </Folha>
  );
}

/**
 * Os 7 do banco antes do jogo, pela posição em campo (R54): um toque troca o reserva por alguém de fora do time e do
 * banco. `aoMudar` recebe o banco novo.
 */
export function FolhaDosReservas({ clube, titulares, banco, aoMudar, aoFechar }: {
  clube: Clube;
  titulares: (number | null)[];
  banco: number[];
  aoMudar: (banco: number[]) => void;
  aoFechar: () => void;
}) {
  const estado = useJogo();
  const [trocando, setTrocando] = useState<number | null>(null);
  const reservas = banco.map((id) => estado.jogadores[id]).filter((j): j is Jogador => !!j);
  const ordenados = porPosicao(reservas).flatMap((g) => [...g.jogadores].sort((a, b) => b.forca - a.forca));
  const selecao = clube.serie === "selecao";
  const fora = elencoDoTime(estado, clube.id).filter((j) => !titulares.includes(j.id) && !banco.includes(j.id));
  const escolher = (id: number) => {
    aoMudar(banco.map((x) => (x === trocando ? id : x)));
    setTrocando(null);
  };
  if (trocando != null) {
    const sai = estado.jogadores[trocando];
    return (
      <Folha titulo={`No lugar de ${sai.nome}`} aoFechar={aoFechar}>
        <ListaPorPosicao jogadores={fora} primeiro={sai.posicao} nota={(j) => j.forca} onde={() => ""} aoEscolher={escolher} selecao={selecao} />
        {fora.length === 0 && <p className="pequeno fraco">Não há ninguém no elenco fora do time e do banco.</p>}
        <button className="botao cheio" onClick={() => setTrocando(null)}>Voltar</button>
      </Folha>
    );
  }
  return (
    <Folha titulo="Reservas" aoFechar={aoFechar}>
      <p className="pequeno fraco">Os {reservas.length} do banco, que podem entrar durante o jogo. Toque em um para trocar.</p>
      <div className="lista">
        {ordenados.map((j) => <LinhaDoJogador key={j.id} j={j} nota={j.forca} onde="" aoEscolher={() => setTrocando(j.id)} selecao={selecao} />)}
      </div>
      <button className="botao primario cheio" onClick={aoFechar}>Pronto</button>
    </Folha>
  );
}
