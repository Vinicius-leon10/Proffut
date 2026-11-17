// Testes do motor (antes num arquivo só, src/engine/motor.test.ts; separados para rodarem em paralelo).
import { describe, expect, it } from "vitest";
import { novoJogo } from "../jogo";

describe("nacionalidade dos jogadores (R123)", () => {
  it("quem joga fora do país tem a nacionalidade dele, não a do clube", () => {
    // Pedido do usuário: "Cristiano Ronaldo estava com bandeira da Arábia Saudita".
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 41 });
    const nac = (clubeId: string, nome: string) =>
      Object.values(estado.jogadores).find((j) => j.clubeId === clubeId && j.nome === nome)?.nacionalidade ?? `${nome} não está no ${clubeId}`;
    expect(nac("al-nassr", "Cristiano Ronaldo")).toBe("POR");
    expect(nac("al-nassr", "Sadio Mané")).toBe("SEN");
    expect(nac("al-hilal", "Karim Benzema")).toBe("FRA");
    expect(nac("al-hilal", "Rúben Neves")).toBe("POR");
    expect(nac("los-angeles-fc", "Son Heung-min")).toBe("COR");
    // e quem é do país continua com a do país
    expect(nac("al-nassr", "Nawaf Al-Aqidi")).toBe("SAU");
  });

  it("o save já começado é corrigido ao abrir, e sai da seleção do país errado", async () => {
    const { acertarNacionalidades } = await import("../jogo");
    const estado = novoJogo({ nomeTecnico: "T", clubeId: "vasco", semente: 42 });
    const ronaldo = Object.values(estado.jogadores).find((j) => j.nome === "Cristiano Ronaldo")!;
    const aqidi = Object.values(estado.jogadores).find((j) => j.nome === "Nawaf Al-Aqidi")!;
    // como estava no save antigo: saudita e convocado pela Arábia Saudita
    ronaldo.nacionalidade = "SAU";
    ronaldo.selecao = { jogos: 3, gols: 2 };
    ronaldo.convocado = "sel-SA";
    const lista = (estado.selecoes!.convocados["sel-SA"] ??= []);
    lista.push(ronaldo.id);
    acertarNacionalidades(estado);
    expect(ronaldo.nacionalidade).toBe("POR");
    expect(estado.selecoes!.convocados["sel-SA"]).not.toContain(ronaldo.id);
    expect(ronaldo.convocado).toBeUndefined();
    expect(ronaldo.selecao).toBeUndefined();
    expect(aqidi.nacionalidade).toBe("SAU");
    // de novo não muda nada
    const antes = JSON.stringify(estado.jogadores);
    acertarNacionalidades(estado);
    expect(JSON.stringify(estado.jogadores)).toBe(antes);
  });
});
