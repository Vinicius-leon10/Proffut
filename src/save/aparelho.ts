// Checagem do aparelho: o jogo está guardado para abrir sem internet? O salvamento funciona?
import { armazenamentoPersistente, testarSalvamento } from "./salvamento";

export type Situacao = "ok" | "aviso" | "erro";

export interface ItemChecagem {
  titulo: string;
  situacao: Situacao;
  detalhe: string;
}

export function ehIphone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function abertoComoApp(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/** Quantos arquivos do jogo estão guardados no aparelho e se a página inicial está entre eles. */
export async function arquivosOffline(): Promise<{ arquivos: number; temPagina: boolean }> {
  if (!("caches" in window)) return { arquivos: 0, temPagina: false };
  let arquivos = 0;
  let temPagina = false;
  for (const nome of await caches.keys()) {
    const pedidos = await (await caches.open(nome)).keys();
    arquivos += pedidos.length;
    if (pedidos.some((r) => new URL(r.url).pathname.endsWith("index.html"))) temPagina = true;
  }
  return { arquivos, temPagina };
}

export async function prontoParaOffline(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return false;
  const { arquivos, temPagina } = await arquivosOffline();
  return temPagina && arquivos >= 5;
}

export async function checarAparelho(): Promise<ItemChecagem[]> {
  const itens: ItemChecagem[] = [];

  // Jogo guardado para abrir sem internet.
  if (!("serviceWorker" in navigator)) {
    itens.push({ titulo: "Jogar sem internet", situacao: "erro", detalhe: "Este navegador não consegue guardar o jogo no aparelho." });
  } else {
    const registro = await navigator.serviceWorker.getRegistration();
    const { arquivos, temPagina } = await arquivosOffline();
    if (!registro?.active) {
      itens.push({ titulo: "Jogar sem internet", situacao: "aviso", detalhe: "O jogo ainda está sendo guardado no aparelho. Deixe aberto com internet por alguns segundos." });
    } else if (!temPagina || arquivos < 5) {
      itens.push({ titulo: "Jogar sem internet", situacao: "aviso", detalhe: `Só ${arquivos} arquivo(s) guardados. Abra o jogo com internet mais uma vez.` });
    } else if (!navigator.serviceWorker.controller) {
      itens.push({ titulo: "Jogar sem internet", situacao: "aviso", detalhe: "Arquivos guardados. Feche e abra o jogo para ativar o modo sem internet." });
    } else {
      itens.push({ titulo: "Jogar sem internet", situacao: "ok", detalhe: `Pronto: ${arquivos} arquivos do jogo guardados no aparelho.` });
    }
  }

  // Salvamento.
  const salva = await testarSalvamento();
  itens.push(salva
    ? { titulo: "Salvamento", situacao: "ok", detalhe: "Gravar e ler o save no aparelho está funcionando." }
    : { titulo: "Salvamento", situacao: "erro", detalhe: "Não foi possível gravar no aparelho. Exporte o save em Configurações para não perder o jogo." });

  // Proteção contra limpeza automática.
  const persistente = await armazenamentoPersistente();
  if (ehIphone() && !abertoComoApp()) {
    itens.push({ titulo: "Proteção do save", situacao: "aviso", detalhe: "Você está no Safari comum: o iPhone pode apagar o save depois de 7 dias sem uso. Abra pelo ícone da tela inicial." });
  } else {
    itens.push(persistente
      ? { titulo: "Proteção do save", situacao: "ok", detalhe: "O navegador garantiu que não vai apagar os dados do jogo." }
      : { titulo: "Proteção do save", situacao: abertoComoApp() ? "ok" : "aviso", detalhe: abertoComoApp() ? "Aberto como app: o save fica guardado enquanto o ícone estiver na tela inicial." : "O navegador pode apagar os dados se faltar espaço. Faça backups em Configurações." });
  }

  // Espaço.
  try {
    const { usage = 0, quota = 0 } = (await navigator.storage?.estimate?.()) ?? {};
    if (quota) {
      const mb = (b: number) => (b / 1024 / 1024).toFixed(1).replace(".", ",");
      const sobra = quota - usage;
      itens.push({ titulo: "Espaço", situacao: sobra < 20 * 1024 * 1024 ? "aviso" : "ok", detalhe: `Usando ${mb(usage)} MB de ${mb(quota)} MB disponíveis.` });
    }
  } catch {
    // Sem informação de espaço neste navegador: não é um problema.
  }

  itens.push({ titulo: "Conexão", situacao: "ok", detalhe: navigator.onLine ? "Com internet agora." : "Sem internet agora: tudo funcionando pelo aparelho." });
  return itens;
}
