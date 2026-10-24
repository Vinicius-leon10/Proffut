// Estado da interface. O motor altera o EstadoJogo no lugar; `atualizar()` avisa
// as telas (contador `versao`) e agenda o salvamento automático.
import { create } from "zustand";
import type { PartidaViva } from "../engine/partida";
import type { EstadoJogo, Partida } from "../engine/tipos";
import { salvar } from "../save/salvamento";

export type Tela = "inicio" | "novo" | "jogo";
export type Aba = "clube" | "elenco" | "tatica" | "tabelas" | "mercado";
export type Sobreposta =
  | { tipo: "ao-vivo"; vivas: PartidaViva[] }
  | { tipo: "resultados"; partidas: Partida[] }
  | { tipo: "fim-temporada" }
  | { tipo: "financas" }
  | { tipo: "historico" }
  | { tipo: "config" }
  | { tipo: "mensagens" };

interface Loja {
  estado: EstadoJogo | null;
  versao: number;
  tela: Tela;
  aba: Aba;
  sobreposta: Sobreposta | null;
  aviso: { texto: string; id: number } | null;
  salvando: boolean;
  iniciar: (estado: EstadoJogo) => void;
  sair: () => void;
  irParaTela: (tela: Tela) => void;
  irParaAba: (aba: Aba) => void;
  abrir: (s: Sobreposta) => void;
  fechar: () => void;
  avisar: (texto: string) => void;
  /** Chame depois de qualquer mudança no estado do jogo. */
  atualizar: () => void;
}

let temporizadorSave: ReturnType<typeof setTimeout> | undefined;

export const useLoja = create<Loja>((set, getLoja) => ({
  estado: null,
  versao: 0,
  tela: "inicio",
  aba: "clube",
  sobreposta: null,
  aviso: null,
  salvando: false,
  iniciar: (estado) => {
    set({ estado, tela: "jogo", aba: "clube", sobreposta: null, versao: getLoja().versao + 1 });
    void salvar("auto", estado);
  },
  sair: () => set({ estado: null, tela: "inicio", sobreposta: null }),
  irParaTela: (tela) => set({ tela }),
  irParaAba: (aba) => set({ aba }),
  abrir: (sobreposta) => set({ sobreposta }),
  fechar: () => set({ sobreposta: null }),
  avisar: (texto) => set({ aviso: { texto, id: Date.now() } }),
  atualizar: () => {
    set({ versao: getLoja().versao + 1 });
    clearTimeout(temporizadorSave);
    temporizadorSave = setTimeout(async () => {
      const estado = getLoja().estado;
      if (!estado) return;
      set({ salvando: true });
      try {
        await salvar("auto", estado);
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
