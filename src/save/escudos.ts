// Escudos que o usuário importa: um pacote .json com uma imagem por clube (pelo id). Ficam só neste
// aparelho, no IndexedDB. O jogo publicado não traz escudo nenhum (os escudos oficiais são dos
// clubes); sem pacote, o escudo é desenhado com as cores e a sigla do clube.
import { del, get, set } from "idb-keyval";
import { banco } from "./salvamento";

/** Id do clube → imagem (data URL). */
export type Escudos = Record<string, string>;

const CHAVE = "escudos";
const FORMATO = "proffut-escudos";
const SEM_ESCUDOS = "Esse arquivo não tem escudos do Proffut.";
const IMAGEM = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
/** Por imagem, em caracteres: um escudo pequeno tem uns 10 mil. */
const TAMANHO_MAXIMO = 300_000;

export async function lerEscudos(): Promise<Escudos> {
  return (await get<Escudos>(CHAVE, banco)) ?? {};
}

/** Confere o pacote e devolve só as imagens válidas. */
export function lerPacote(texto: string): Escudos {
  let pacote: { formato?: unknown; escudos?: unknown };
  try {
    pacote = JSON.parse(texto);
  } catch {
    throw new Error(SEM_ESCUDOS);
  }
  if (pacote?.formato !== FORMATO || typeof pacote.escudos !== "object" || !pacote.escudos) throw new Error(SEM_ESCUDOS);
  const escudos: Escudos = {};
  for (const [id, imagem] of Object.entries(pacote.escudos)) {
    if (/^[a-z0-9-]+$/.test(id) && typeof imagem === "string" && imagem.length <= TAMANHO_MAXIMO && IMAGEM.test(imagem)) escudos[id] = imagem;
  }
  if (!Object.keys(escudos).length) throw new Error(SEM_ESCUDOS);
  return escudos;
}

/** Junta os escudos do pacote aos que já estão no aparelho (o do pacote vale para o mesmo clube). */
export async function importarEscudos(texto: string): Promise<{ escudos: Escudos; importados: number }> {
  const novos = lerPacote(texto);
  const escudos = { ...(await lerEscudos()), ...novos };
  await set(CHAVE, escudos, banco);
  return { escudos, importados: Object.keys(novos).length };
}

export async function apagarEscudos(): Promise<void> {
  await del(CHAVE, banco);
}
