// Relatório em português: tests/resultado/resumo.md e, no GitHub, o resumo da execução.
import { mkdirSync, writeFileSync } from "node:fs";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

const ICONE: Record<TestResult["status"], string> = { passed: "✅", failed: "❌", timedOut: "❌", skipped: "⏭️", interrupted: "⚠️" };
const semCores = (texto: string) => texto.replace(/\u001b\[[0-9;]*m/g, "");

export default class Resumo implements Reporter {
  private linhas: { titulo: string; status: TestResult["status"]; detalhe: string; ms: number }[] = [];

  printsToStdio() {
    return false;
  }

  onTestEnd(teste: TestCase, resultado: TestResult) {
    const detalhe = semCores(resultado.error?.message ?? "").split("\n")[0].replace(/\|/g, "/");
    this.linhas.push({ titulo: teste.title, status: resultado.status, detalhe, ms: resultado.duration });
  }

  onEnd(resultado: FullResult) {
    const linhas = [...this.linhas].sort((a, b) => a.titulo.localeCompare(b.titulo));
    const texto = [
      "# Testes do Proffut",
      "",
      `- Site: ${process.env.BASE_URL ?? "site gerado em dist/"}`,
      `- Quando: ${new Date().toISOString()}`,
      `- Resultado: **${resultado.status === "passed" ? "todos passaram" : "FALHOU"}**`,
      "",
      "| | Teste | Detalhe | Tempo |",
      "|---|---|---|---|",
      ...linhas.map((l) => `| ${ICONE[l.status]} | ${l.titulo} | ${l.detalhe} | ${(l.ms / 1000).toFixed(1)} s |`),
      "",
    ].join("\n");
    mkdirSync("tests/resultado", { recursive: true });
    writeFileSync("tests/resultado/resumo.md", texto);
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, texto, { flag: "a" });
  }
}
