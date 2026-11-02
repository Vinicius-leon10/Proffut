// Roda dentro do service worker (o vite.config.ts põe este arquivo no importScripts do sw.js gerado).
// Os escudos ficam fora da fila do service worker, que guarda os arquivos do app um por vez (R76): o app manda a lista
// ("guardar-escudos") e aqui eles são baixados, vários ao mesmo tempo, para o cache dos escudos, fora da tela (a página
// não trava). Os caches de escudos de versões antigas saem.
self.addEventListener("message", (evento) => {
  const pedido = evento.data;
  if (!pedido || pedido.tipo !== "guardar-escudos") return;
  evento.waitUntil(guardarEscudos(pedido.cache, pedido.urls));
});

async function guardarEscudos(nome, urls) {
  try {
    for (const antigo of await caches.keys()) if (antigo.startsWith("escudos-") && antigo !== nome) await caches.delete(antigo);
    const cache = await caches.open(nome);
    const faltam = [];
    for (const url of urls) if (!(await cache.match(url))) faltam.push(url);
    let proximo = 0;
    const baixar = async () => {
      while (proximo < faltam.length) {
        const url = faltam[proximo++];
        // Sem internet (ou sem o arquivo), fica para a próxima vez que o app abrir; até lá, o escudo desenhado.
        await cache.add(url).catch(() => undefined);
      }
    };
    await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(baixar));
  } catch (_) {
    // Aparelho sem espaço: os escudos vêm da internet quando aparecem.
  }
}
