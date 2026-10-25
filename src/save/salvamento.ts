// Salva o jogo no próprio celular (IndexedDB) e exporta/importa em arquivo.
import { createStore, del, get, set } from "idb-keyval";
import type { EstadoJogo } from "../engine/tipos";

const banco = createStore("proffut", "saves");

export type Espaco = "auto" | "1" | "2" | "3";
export const ESPACOS: Espaco[] = ["auto", "1", "2", "3"];

export interface ResumoSave {
  espaco: Espaco;
  tecnico: string;
  clube: string;
  clubeId: string;
  temporada: number;
  data: string;
  salvoEm: string;
}

function resumir(espaco: Espaco, estado: EstadoJogo): ResumoSave {
  return {
    espaco,
    tecnico: estado.tecnico.nome,
    clube: estado.clubes[estado.tecnico.clubeId].nome,
    clubeId: estado.tecnico.clubeId,
    temporada: estado.temporada,
    data: estado.data,
    salvoEm: new Date().toISOString(),
  };
}

export async function salvar(espaco: Espaco, estado: EstadoJogo): Promise<void> {
  await set(`jogo:${espaco}`, estado, banco);
  await set(`resumo:${espaco}`, resumir(espaco, estado), banco);
}

export async function carregar(espaco: Espaco): Promise<EstadoJogo | undefined> {
  const estado = await get<EstadoJogo>(`jogo:${espaco}`, banco);
  return estado ? migrar(estado) : undefined;
}

export async function apagar(espaco: Espaco): Promise<void> {
  await del(`jogo:${espaco}`, banco);
  await del(`resumo:${espaco}`, banco);
}

export async function listarSaves(): Promise<ResumoSave[]> {
  const lista: ResumoSave[] = [];
  for (const espaco of ESPACOS) {
    const r = await get<ResumoSave>(`resumo:${espaco}`, banco);
    if (r) lista.push(r);
  }
  return lista;
}

/** Saves de versões antigas do jogo são atualizados aqui. */
function migrar(estado: EstadoJogo): EstadoJogo {
  if (estado.versao !== 1) throw new Error("Versão de save desconhecida.");
  // A velocidade 4x saiu do jogo (out/2026): quem estava nela passa para 2x.
  if (estado.config && estado.config.velocidade !== 1) estado.config.velocidade = 2;
  return estado;
}

/** Grava e lê um valor de teste no banco do aparelho. */
export async function testarSalvamento(): Promise<boolean> {
  const valor = `teste-${Date.now()}`;
  try {
    await set("checagem", valor, banco);
    const lido = await get<string>("checagem", banco);
    await del("checagem", banco);
    return lido === valor;
  } catch {
    return false;
  }
}

/** Pede ao navegador para não apagar os dados do jogo. */
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function armazenamentoPersistente(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

// ---- arquivo -----------------------------------------------------------------------

const MARCA = "proffut-save";

export function nomeDoArquivo(estado: EstadoJogo): string {
  return `proffut-${estado.tecnico.clubeId}-${estado.data}.json`;
}

export function exportarTexto(estado: EstadoJogo): string {
  return JSON.stringify({ formato: MARCA, versao: estado.versao, estado });
}

export function importarTexto(texto: string): EstadoJogo {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não é um save do Proffut.");
  }
  const d = dados as { formato?: string; estado?: EstadoJogo };
  if (d?.formato !== MARCA || !d.estado?.clubes || !d.estado.jogadores) throw new Error("O arquivo não é um save do Proffut.");
  return migrar(d.estado);
}

/** Exporta o save: no iPhone abre o menu de compartilhar (Salvar em Arquivos); no resto, baixa o arquivo. */
export async function exportarArquivo(estado: EstadoJogo): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const nome = nomeDoArquivo(estado);
  const conteudo = exportarTexto(estado);
  const arquivo = new File([conteudo], nome, { type: "application/json" });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: "Save do Proffut" });
      return "compartilhado";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
  return "baixado";
}
