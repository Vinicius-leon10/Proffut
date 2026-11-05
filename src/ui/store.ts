// Estado da interface. O motor altera o EstadoJogo no lugar; `atualizar()` avisa
// as telas (contador `versao`) e agenda o salvamento automático.
import { create } from "zustand";
import type { PartidaViva } from "../engine/partida";
import type { EstadoJogo, Partida } from "../engine/tipos";
import { checarEstado, repararEstado } from "../engine/checagem";
import type { Escudos } from "../save/escudos";
import { salvar, type Espaco } from "../save/salvamento";

export type Tela = "inicio" | "novo" | "jogo";
export type Aba = "clube" | "elenco" | "tatica" | "tabelas" | "mercado";
export type Sobreposta =
  | { tipo: "ao-vivo"; vivas: PartidaViva[] }
  | { tipo: "resultados"; partidas: Partida[] }
  | { tipo: "fim-temporada" }
  | { tipo: "financas" }
  | { tipo: "historico" }
  | { tipo: "trofeus" }
  | { tipo: "config" }
  | { tipo: "checagem" }
  | { tipo: "mensagens" };

interface Loja {
  estado: EstadoJogo | null;
  versao: number;
  tela: Tela;
  aba: Aba;
  sobreposta: Sobreposta | null;
  /** `sozinho`: aviso que não veio de um toque (sai da frente quando uma folha abre). */
  aviso: { texto: string; id: number; sozinho?: boolean } | null;
  /** Folhas (`Folha`) abertas agora: ficha do jogador, tutorial... */
  folhasAbertas: number;
  salvando: boolean;
  /** O espaço (1 a 3) que acompanha o jogo aberto: salvo junto com o automático a cada mudança (R84). */
  espaco: Espaco | null;
  /** Escudos importados pelo usuário (só neste aparelho); vazio = escudos desenhados. */
  escudos: Escudos;
  /** Abre o jogo; `espaco`: o espaço que o acompanha (nenhum: só o Continuar). */
  iniciar: (estado: EstadoJogo, espaco: Espaco | null) => void;
  /** Passa a salvar o jogo aberto também no espaço `espaco` (Configurações → Salvar). */
  ligarAoEspaco: (espaco: Espaco) => Promise<void>;
  /** Volta ao menu: antes, grava o que ainda não foi salvo (o menu mostra os espaços como estão). */
  sair: () => Promise<void>;
  irParaTela: (tela: Tela) => void;
  irParaAba: (aba: Aba) => void;
  abrir: (s: Sobreposta) => void;
  fechar: () => void;
  avisar: (texto: string) => void;
  /**
   * Aviso que não vem de um toque (o do service worker): com uma tela aberta por cima, uma folha (ficha, tutorial) ou
   * outro aviso na tela, espera, para não cobrir os botões do alto dela, como o Continuar dos resultados do dia, nem
   * tomar o lugar do aviso do placar (R44).
   */
  avisarDepois: (texto: string) => void;
  /** Chame depois de qualquer mudança no estado do jogo. */
  atualizar: () => void;
}

let temporizadorSave: ReturnType<typeof setTimeout> | undefined;
let gravacaoAoSair: Promise<void> = Promise.resolve();
/** A gravação feita ao voltar ao menu: o menu espera por ela antes de listar os espaços. */
export const esperarGravacaoAoSair = () => gravacaoAoSair;

// Também espera o aviso que já está na tela (o do placar, depois da partida: R23).
const ocupada = (loja: Loja) => !!loja.sobreposta || loja.folhasAbertas > 0 || !!loja.aviso;

export const useLoja = create<Loja>((set, getLoja, api) => ({
  estado: null,
  versao: 0,
  tela: "inicio",
  aba: "clube",
  sobreposta: null,
  aviso: null,
  folhasAbertas: 0,
  salvando: false,
  espaco: null,
  escudos: {},
  iniciar: (estado, espaco) => {
    // Checagem automática a cada jogo aberto: corrige sozinha o que é seguro corrigir.
    const problemas = checarEstado(estado);
    const corrigido = problemas.some((p) => p.reparavel) ? repararEstado(estado) : [];
    clearTimeout(temporizadorSave);
    set({ estado, espaco, tela: "jogo", aba: "clube", sobreposta: null, versao: getLoja().versao + 1 });
    void salvar("auto", estado, espaco ?? undefined);
    const restantes = corrigido.length ? checarEstado(estado) : problemas;
    if (restantes.some((p) => p.gravidade === "erro")) {
      getLoja().avisar("A checagem encontrou problemas no save. Veja em Configurações → Checagem do jogo.");
    } else if (corrigido.length) {
      getLoja().avisar(`Checagem automática: o save foi corrigido (${corrigido.length} ajuste(s)).`);
    }
  },
  ligarAoEspaco: async (espaco) => {
    const estado = getLoja().estado;
    if (!estado) return;
    set({ espaco });
    await salvar("auto", estado, espaco);
  },
  sair: () => {
    clearTimeout(temporizadorSave);
    const { estado, espaco } = getLoja();
    // O menu abre na hora; a lista dos espaços espera esta gravação (`gravacaoAoSair`).
    if (estado) gravacaoAoSair = salvar("auto", estado, espaco ?? undefined).catch(() => undefined);
    set({ estado: null, espaco: null, tela: "inicio", sobreposta: null });
    return gravacaoAoSair;
  },
  irParaTela: (tela) => set({ tela }),
  irParaAba: (aba) => set({ aba }),
  // Uma tela nova aberta por cima não herda o aviso da anterior (ele cobriria os botões do alto).
  abrir: (sobreposta) => set({ sobreposta, aviso: null }),
  fechar: () => {
    const eraPartida = getLoja().sobreposta?.tipo === "ao-vivo";
    set({ sobreposta: null });
    // Na partida o espaço não é gravado a cada minuto: grava ao fechar.
    if (eraPartida && getLoja().estado) getLoja().atualizar();
  },
  avisar: (texto) => set({ aviso: { texto, id: Date.now() } }),
  avisarDepois: (texto) => {
    const mostrar = () => set({ aviso: { texto, id: Date.now(), sozinho: true } });
    if (!ocupada(getLoja())) return mostrar();
    const parar = api.subscribe((loja) => {
      if (ocupada(loja)) return;
      parar();
      mostrar();
    });
  },
  atualizar: () => {
    set({ versao: getLoja().versao + 1 });
    clearTimeout(temporizadorSave);
    temporizadorSave = setTimeout(async () => {
      const { estado, espaco, sobreposta } = getLoja();
      if (!estado) return;
      set({ salvando: true });
      try {
        // Durante a partida ao vivo o jogo salva a cada minuto: o espaço fica para o fim do jogo (a próxima mudança
        // depois de fechar a partida grava os dois), para não gravar o save grande duas vezes a cada minuto.
        await salvar("auto", estado, espaco ?? undefined, sobreposta?.tipo !== "ao-vivo");
      } catch {
        getLoja().avisar("Não foi possível salvar no aparelho. Exporte o save em Configurações.");
      } finally {
        set({ salvando: false });
      }
    }, 400);
  },
}));

/** Lê o estado do jogo (já carregado) e se inscreve nas atualizações. */
export function useJogo(): EstadoJogo {
  const estado = useLoja((s) => s.estado);
  useLoja((s) => s.versao);
  if (!estado) throw new Error("Nenhum jogo carregado");
  return estado;
}
