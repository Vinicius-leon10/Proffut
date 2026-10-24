import type { EstadoJogo, Mensagem } from "./tipos";

const LIMITE = 60;

export function enviarMensagem(estado: EstadoJogo, m: Omit<Mensagem, "id" | "data" | "lida">) {
  estado.mensagens.unshift({ ...m, id: estado.proximoIdMensagem++, data: estado.data, lida: false });
  // Mantém as propostas pendentes mesmo quando a caixa enche.
  while (estado.mensagens.length > LIMITE) {
    const i = estado.mensagens.findLastIndex((x) => !x.proposta || x.proposta.resolvida);
    if (i < 0) break;
    estado.mensagens.splice(i, 1);
  }
}

export function naoLidas(estado: EstadoJogo): number {
  return estado.mensagens.filter((m) => !m.lida).length;
}
