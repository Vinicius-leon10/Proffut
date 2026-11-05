// Salva o jogo no próprio celular (IndexedDB) e exporta/importa em arquivo.
import { createStore, del, get, set, setMany } from "idb-keyval";
import { acertarParticipantes, juntarAoSaveAntigo } from "../engine/jogo";
import { garantirContratos } from "../engine/contratos";
import { montarRecordes } from "../engine/trofeus";
import type { EstadoJogo } from "../engine/tipos";

export const banco = createStore("proffut", "saves");

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
  /** Identifica o jogo (a semente do jogo novo): o mesmo jogo em dois espaços tem a mesma. Saves antigos não têm. */
  semente?: number;
  /** Só no automático (o Continuar): o espaço que acompanha este jogo, salvo junto a cada mudança (R84). */
  ligado?: Espaco;
}

function resumir(espaco: Espaco, estado: EstadoJogo, ligado?: Espaco): ResumoSave {
  return {
    espaco,
    semente: estado.semente,
    ...(ligado && espaco === "auto" ? { ligado } : {}),
    tecnico: estado.tecnico.nome,
    clube: estado.clubes[estado.tecnico.clubeId].nome,
    clubeId: estado.tecnico.clubeId,
    temporada: estado.temporada,
    data: estado.data,
    salvoEm: new Date().toISOString(),
  };
}

/**
 * Salva o jogo. No automático, `ligado` é o espaço que acompanha o jogo: ele é gravado junto, na mesma gravação, para
 * que cada espaço fique sempre no ponto mais novo do seu jogo e dê para trocar de jogo sem perder nada (R84).
 */
export async function salvar(espaco: Espaco, estado: EstadoJogo, ligado?: Espaco, gravarOLigado = true): Promise<void> {
  // A hora do save é a do jogo guardado (agora, antes de gravar), não a do fim da gravação: com o save grande e o
  // aparelho lento para gravar, um salvamento começado antes de uma mudança parecia mais novo do que ela (R71).
  // O jogo e o resumo vão juntos, numa gravação só.
  const gravar: [string, unknown][] = [[`jogo:${espaco}`, estado], [`resumo:${espaco}`, resumir(espaco, estado, ligado)]];
  if (espaco === "auto" && ligado && gravarOLigado) gravar.push([`jogo:${ligado}`, estado], [`resumo:${ligado}`, resumir(ligado, estado)]);
  await setMany(gravar, banco);
}

/** O primeiro espaço vazio (1 a 3), para o jogo novo ir sozinho para ele; nenhum livre: undefined. */
export async function espacoLivre(): Promise<Espaco | undefined> {
  for (const espaco of ESPACOS) {
    if (espaco !== "auto" && !(await get<ResumoSave>(`resumo:${espaco}`, banco))) return espaco;
  }
  return undefined;
}

export async function resumoDe(espaco: Espaco): Promise<ResumoSave | undefined> {
  return get<ResumoSave>(`resumo:${espaco}`, banco);
}

/** Dois resumos do mesmo jogo no mesmo ponto (nos saves antigos, sem a identificação do jogo: clube, técnico e data). */
function mesmoPonto(a: ResumoSave, b: ResumoSave): boolean {
  if (a.semente != null && b.semente != null && a.semente !== b.semente) return false;
  return a.clubeId === b.clubeId && a.tecnico === b.tecnico && a.temporada === b.temporada && a.data === b.data;
}

/**
 * Liga o jogo do Continuar a um espaço, se ainda não estiver: ao espaço que é uma cópia dele (saves de antes dos
 * espaços que acompanham o jogo, R86) ou, senão, ao primeiro espaço livre (o jogo é copiado para lá). Devolve o espaço
 * ligado; nenhum (todos ocupados por outros jogos): undefined.
 */
export async function ligarOContinuar(): Promise<Espaco | undefined> {
  const auto = await resumoDe("auto");
  if (!auto) return undefined;
  if (auto.ligado) return auto.ligado;
  for (const espaco of ESPACOS) {
    const r = espaco === "auto" ? undefined : await resumoDe(espaco);
    if (r && mesmoPonto(auto, r)) {
      await set("resumo:auto", { ...auto, ligado: espaco }, banco);
      return espaco;
    }
  }
  const livre = await espacoLivre();
  const estado = livre && (await get<EstadoJogo>("jogo:auto", banco));
  if (!livre || !estado) return undefined;
  await setMany([[`jogo:${livre}`, estado], [`resumo:${livre}`, { ...resumir(livre, estado), salvoEm: auto.salvoEm }], ["resumo:auto", { ...auto, ligado: livre }]], banco);
  return livre;
}

/**
 * Antes de trocar o jogo do Continuar por outro (abrir um espaço, jogo novo, importar): ele fica num espaço
 * (`ligarOContinuar`); se todos estão ocupados por outros jogos, ele seria perdido: pergunta antes (R85). Devolve se
 * pode trocar.
 */
export async function podeTrocarOContinuar(): Promise<boolean> {
  const auto = await resumoDe("auto");
  if (!auto || (await ligarOContinuar())) return true;
  return confirm(`O jogo do Continuar (${auto.clube}, ${auto.temporada}) não está em nenhum espaço e vai ser perdido. Trocar mesmo assim?`);
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
  // Times novos (nov/2026): Série D, estaduais e ligas de fora entram no save (antes dos contratos, para os
  // jogadores novos também ganharem contrato).
  juntarAoSaveAntigo(estado);
  // Listas dos campeonatos corrigidas (nov/2026): entram os clubes que faltavam e a próxima temporada sai certa.
  acertarParticipantes(estado);
  // Contratos chegaram em out/2026: no save de antes, ninguém sai de graça na temporada em andamento.
  garantirContratos(estado, estado.temporada + 1);
  // Sala de troféus (out/2026): os recordes começam pelos jogos já disputados na temporada em andamento.
  montarRecordes(estado);
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
