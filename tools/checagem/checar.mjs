// Checagem automática: joga o Proffut num navegador com tela de iPhone, inclusive sem internet.
//
//   npm run build && npm run checagem                          → testa o site gerado em dist/
//   npm run checagem -- https://usuario.github.io/Proffut/     → testa o site publicado
//
// Gera tools/checagem/resultado/relatorio.md e capturas de tela. Sai com código 1 se algo falhar.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium, devices } = createRequire(import.meta.url)("playwright");

const pasta = new URL("./resultado/", import.meta.url).pathname;
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

// ---- servidor local (quando não recebe um endereço) -----------------------------------

let servidor;
async function subirServidorLocal() {
  const url = "http://localhost:4173/";
  servidor = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return url;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("O servidor local não subiu (rode npm run build antes).");
}

const url = process.argv[2] ?? (await subirServidorLocal());

// ---- passos ---------------------------------------------------------------------------------

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ ...devices["iPhone 13"], locale: "pt-BR", reducedMotion: "reduce", acceptDownloads: true });
const pagina = await contexto.newPage();
const errosDoNavegador = [];
pagina.on("pageerror", (e) => errosDoNavegador.push(String(e)));
pagina.on("console", (m) => {
  // Sem internet o navegador avisa que não alcançou a rede: isso é esperado.
  if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errosDoNavegador.push(m.text());
});

const resultados = [];
let falhou = false;
let n = 0;

async function passo(nome, executar) {
  if (falhou) {
    resultados.push({ nome, situacao: "pulado", detalhe: "não executado (um passo anterior falhou)" });
    return;
  }
  const inicio = Date.now();
  n++;
  try {
    const detalhe = (await executar()) ?? "";
    resultados.push({ nome, situacao: "ok", detalhe, ms: Date.now() - inicio });
    await pagina.screenshot({ path: `${pasta}${String(n).padStart(2, "0")}-ok.png` }).catch(() => {});
    console.log(`✅ ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  } catch (e) {
    falhou = true;
    const detalhe = String(e?.message ?? e).split("\n")[0];
    resultados.push({ nome, situacao: "falhou", detalhe, ms: Date.now() - inicio });
    await pagina.screenshot({ path: `${pasta}${String(n).padStart(2, "0")}-falhou.png` }).catch(() => {});
    console.log(`❌ ${nome} — ${detalhe}`);
  }
}

const botao = (nome) => pagina.getByRole("button", { name: nome }).first();
const dataNoTopo = async () => (await pagina.locator(".topo .sub").first().textContent())?.split("·")[0].trim();

/** Joga o próximo dia de jogo pulando direto para o fim. */
async function jogarProximoDia() {
  await botao(/Avançar|Ir para o jogo/).click();
  const comecar = botao("Começar o jogo");
  const continuar = botao("Continuar");
  await comecar.or(continuar).waitFor({ timeout: 15_000 });
  if (await comecar.isVisible()) {
    await comecar.click();
    await botao("Fim ⏭").click();
    await botao("Continuar").click();
  } else {
    await continuar.click();
  }
  await pagina.getByText(/Próximo jogo|Jogo de hoje/).first().waitFor({ timeout: 15_000 });
}

let arquivoSave;
let dataExportada;

await passo("Abre o site", async () => {
  await pagina.goto(url);
  await pagina.getByRole("heading", { name: "Proffut" }).waitFor({ timeout: 20_000 });
  return url;
});

await passo("Guarda o jogo no aparelho para jogar sem internet", async () => {
  await pagina.evaluate(() => navigator.serviceWorker.ready);
  // Na primeira visita a página ainda não é controlada pelo service worker: recarrega.
  if (!(await pagina.evaluate(() => !!navigator.serviceWorker.controller))) await pagina.reload();
  await pagina.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
  const arquivos = await pagina.evaluate(async () => {
    let total = 0;
    for (const nome of await caches.keys()) total += (await (await caches.open(nome)).keys()).length;
    return total;
  });
  if (arquivos < 5) throw new Error(`só ${arquivos} arquivos guardados`);
  return `${arquivos} arquivos guardados`;
});

await passo("Cria um jogo novo", async () => {
  await botao("Novo jogo").click();
  await pagina.getByPlaceholder("Ex.: Vinícius").fill("Robô");
  await pagina.getByRole("tab", { name: "Série B" }).click();
  await botao(/Ponte Preta/).click();
  await botao(/Assumir o/).click();
  await pagina.getByText("Próximo jogo").waitFor({ timeout: 20_000 });
  return "Ponte Preta, Série B";
});

await passo("Joga uma partida ao vivo", async () => {
  await botao(/Avançar|Ir para o jogo/).click();
  await botao("Começar o jogo").click();
  await pagina.getByRole("tab", { name: "4x" }).click();
  await pagina.waitForFunction(() => /\d+'/.test(document.querySelector(".placar .relogio")?.textContent ?? ""), null, { timeout: 15_000 });
  await botao("Fim ⏭").click();
  const placar = (await pagina.locator(".placar .gols").textContent())?.replace(/\s+/g, " ").trim();
  await botao("Continuar").click();
  await pagina.getByText(/1 jogos/).waitFor({ timeout: 10_000 });
  return `placar ${placar}`;
});

await passo("Checagem dentro do jogo não encontra erros", async () => {
  await pagina.getByRole("button", { name: "Configurações" }).click();
  await botao("Verificar o jogo").click();
  const resumo = pagina.locator("[data-resumo]");
  await resumo.waitFor({ timeout: 20_000 });
  const situacao = await resumo.getAttribute("data-resumo");
  const erros = await pagina.locator('[data-situacao="erro"]').allTextContents();
  if (situacao === "erro") throw new Error(erros.join(" | "));
  const avisos = await pagina.locator('[data-situacao="aviso"]').count();
  await pagina.screenshot({ path: `${pasta}checagem-no-app.png`, fullPage: true });
  await pagina.getByRole("button", { name: "Voltar", exact: true }).click();
  return avisos ? `${avisos} aviso(s)` : "tudo certo";
});

await passo("Finanças e obras do estádio", async () => {
  await botao("Finanças").click();
  const tela = pagina.locator(".tela-cheia");
  await tela.getByText("Estádio", { exact: true }).waitFor({ timeout: 10_000 });
  await tela.getByRole("heading", { name: "Ampliar" }).waitFor();
  await tela.getByRole("heading", { name: "Modernizar" }).waitFor();
  await pagina.getByRole("button", { name: "Voltar", exact: true }).click();
});

await passo("Exporta o save em arquivo", async () => {
  await pagina.getByRole("button", { name: "Configurações" }).click();
  const download = pagina.waitForEvent("download", { timeout: 15_000 });
  download.catch(() => {}); // o erro aparece no await abaixo
  await botao("Exportar save").click();
  const arquivo = await download;
  arquivoSave = `${pasta}save-exportado.json`;
  await arquivo.saveAs(arquivoSave);
  await pagina.getByRole("button", { name: "Voltar", exact: true }).click();
  dataExportada = await dataNoTopo();
  return arquivo.suggestedFilename();
});

await passo("Abre e joga sem internet", async () => {
  await pagina.waitForTimeout(800); // deixa o salvamento automático terminar
  await contexto.setOffline(true);
  await pagina.reload();
  await pagina.getByRole("heading", { name: "Proffut" }).waitFor({ timeout: 20_000 });
  await botao(/Continuar/).click();
  const antes = await dataNoTopo();
  await jogarProximoDia();
  const depois = await dataNoTopo();
  if (antes === depois) throw new Error(`a data não andou (${antes})`);
  return `${antes} → ${depois}`;
});

await passo("Recarrega sem internet e o progresso continua salvo", async () => {
  const data = await dataNoTopo();
  await pagina.waitForTimeout(800);
  await pagina.reload();
  await botao(/Continuar/).click();
  await pagina.getByText(/Próximo jogo|Jogo de hoje/).first().waitFor({ timeout: 15_000 });
  const depois = await dataNoTopo();
  if (depois !== data) throw new Error(`esperava ${data}, abriu em ${depois}`);
  return depois;
});

await passo("Importa o save exportado (sem internet)", async () => {
  await pagina.getByRole("button", { name: "Configurações" }).click();
  await botao("Voltar ao menu inicial").click();
  await pagina.locator('input[type="file"]').setInputFiles(arquivoSave);
  await pagina.getByText(/Próximo jogo|Jogo de hoje/).first().waitFor({ timeout: 15_000 });
  const data = await dataNoTopo();
  if (data !== dataExportada) throw new Error(`esperava ${dataExportada}, abriu em ${data}`);
  return data;
});

await contexto.setOffline(false).catch(() => {});

await passo("Navegador sem erros", async () => {
  if (errosDoNavegador.length) throw new Error(errosDoNavegador.slice(0, 3).join(" | "));
});

await navegador.close();
servidor?.kill();

// ---- relatório ------------------------------------------------------------------------------

const icone = { ok: "✅", falhou: "❌", pulado: "⏭️" };
const linhas = [
  "# Checagem automática do Proffut",
  "",
  `- Site: ${url}`,
  `- Quando: ${new Date().toISOString()}`,
  `- Resultado: **${falhou ? "FALHOU" : "tudo certo"}**`,
  "",
  "| | Passo | Detalhe | Tempo |",
  "|---|---|---|---|",
  ...resultados.map((r) => `| ${icone[r.situacao]} | ${r.nome} | ${r.detalhe.replace(/\|/g, "/")} | ${r.ms != null ? `${(r.ms / 1000).toFixed(1)} s` : ""} |`),
  "",
];
writeFileSync(`${pasta}relatorio.md`, linhas.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, linhas.join("\n"), { flag: "a" });
console.log(falhou ? "\nCHECAGEM FALHOU" : "\nCHECAGEM OK");
process.exit(falhou ? 1 : 0);
