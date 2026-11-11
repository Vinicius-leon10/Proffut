import { abrirSite, botao, esperarNoSave, expect, montarSave, test } from "./ajuda";

test("R75 na virada, os clubes do computador dispensam os excedentes sem deixar posição nenhuma abaixo do mínimo (o Progreso, com o elenco cheio e os goleiros como os mais fracos, ficava com 1 goleiro)", async ({ page }) => {
  test.setTimeout(120_000);
  const save = montarSave("virada-goleiros");
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  // Quem não renovou sai de graça: o jogo pergunta antes de encerrar.
  page.on("dialog", (d) => d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  await expect(botao(page, "Começar 2027")).toBeVisible({ timeout: 30_000 });
  await esperarNoSave(page, "estado.temporada === 2027");
  // No save: todo clube que joga (fora a Série D e as seleções) com o mínimo de cada posição.
  const abaixo = await page.evaluate(
    () =>
      new Promise<string[]>((ok, falha) => {
        const pedido = indexedDB.open("proffut");
        pedido.onerror = () => falha(pedido.error);
        pedido.onsuccess = () => {
          const banco = pedido.result;
          const leitura = banco.transaction("saves", "readonly").objectStore("saves").get("jogo:auto");
          leitura.onerror = () => falha(leitura.error);
          leitura.onsuccess = () => {
            banco.close();
            const estado = leitura.result;
            const minimo: Record<string, number> = { G: 2, L: 2, Z: 3, M: 4, A: 2 };
            const contagem = new Map<string, Record<string, number>>();
            for (const j of Object.values(estado.jogadores) as { clubeId?: string; posicao: string }[]) {
              if (!j.clubeId) continue;
              const c = contagem.get(j.clubeId) ?? {};
              c[j.posicao] = (c[j.posicao] ?? 0) + 1;
              contagem.set(j.clubeId, c);
            }
            const lista: string[] = [];
            for (const [id, c] of contagem) {
              // As seleções jogam com os convocados dos clubes: o "elenco" delas é só quem joga fora dos clubes do jogo.
              if (estado.clubes[id]?.serie === "D" || estado.clubes[id]?.serie === "selecao") continue;
              for (const [pos, min] of Object.entries(minimo)) if ((c[pos] ?? 0) < min) lista.push(`${id} ${pos} ${c[pos] ?? 0}`);
            }
            ok(lista);
          };
        };
      }),
  );
  expect(abaixo, "clubes abaixo do mínimo da posição").toEqual([]);
});
