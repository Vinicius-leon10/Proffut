// Escudos no aparelho, fora da fila do service worker (R76): o service worker guarda os arquivos do app um por vez, e
// os 434 escudos atrasavam a versão nova em quase um minuto no site publicado. Eles ficam num cache só deles (o mesmo
// em que o service worker guarda na hora o escudo que aparece na tela). Com o service worker pronto, o app manda a
// lista para ele (public/guardar-escudos.js), que baixa os que faltam fora da tela: a página não fica mais lenta.

export async function guardarEscudos(ids: string[] = __ESCUDOS__, nome = __CACHE_ESCUDOS__): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registro = await navigator.serviceWorker.ready;
  const urls = ids.map((id) => new URL(`escudos/${id}.png`, document.baseURI).href);
  registro.active?.postMessage({ tipo: "guardar-escudos", cache: nome, urls });
}
