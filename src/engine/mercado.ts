// Mercado de transferências: compra, venda, livres, propostas e as trocas entre clubes da IA.
import { ELENCO_MAXIMO, MINIMO_POSICAO } from "./constantes";
import { escalarAutomatico, forcaDoTime } from "./forca";
import { lancar } from "./financas";
import { gerarLivre, salarioBase, valorMercado } from "./gerador";
import { rngPara } from "./rng";
import type { EstadoJogo, Jogador, Mensagem, Posicao } from "./tipos";
import { enviarMensagem } from "./mensagens";
import { somarDias } from "./calendario";

export function elencoDe(estado: EstadoJogo, clubeId: string): Jogador[] {
  return Object.values(estado.jogadores).filter((j) => j.clubeId === clubeId);
}

export function livres(estado: EstadoJogo): Jogador[] {
  return Object.values(estado.jogadores).filter((j) => j.clubeId === null);
}

function ehTitular(estado: EstadoJogo, j: Jogador): boolean {
  if (!j.clubeId) return false;
  return estado.clubes[j.clubeId].escalacao.titulares.includes(j.id);
}

/** Quanto o clube pede pelo jogador. Livres não têm custo de transferência. */
export function precoPedido(estado: EstadoJogo, j: Jogador): number {
  if (!j.clubeId) return 0;
  const fator = j.aVenda ? 0.95 : ehTitular(estado, j) ? 1.35 : 1.1;
  return Math.round((valorMercado(j) * fator) / 10_000) * 10_000;
}

/** O clube pode abrir mão do jogador sem ficar abaixo do mínimo da posição? */
export function podeSair(estado: EstadoJogo, j: Jogador): boolean {
  if (!j.clubeId) return true;
  const elenco = elencoDe(estado, j.clubeId);
  if (elenco.length <= 18) return false;
  const naPosicao = elenco.filter((x) => x.posicao === j.posicao).length;
  return naPosicao - 1 >= MINIMO_POSICAO[j.posicao];
}

function tirarDaEscalacao(estado: EstadoJogo, j: Jogador) {
  if (!j.clubeId) return;
  const clube = estado.clubes[j.clubeId];
  clube.escalacao.titulares = clube.escalacao.titulares.map((id) => (id === j.id ? null : id));
  clube.escalacao.reservas = clube.escalacao.reservas.filter((id) => id !== j.id);
}

/** Reescala um clube da IA (o do usuário só é mexido se ele pediu escalação automática). */
export function reescalar(estado: EstadoJogo, clubeId: string) {
  const clube = estado.clubes[clubeId];
  if (clubeId === estado.tecnico.clubeId && !estado.config.escalacaoAutomatica) {
    // Só completa vagas vazias com o melhor disponível; o resto fica como o usuário deixou.
    if (clube.escalacao.titulares.every((id) => id !== null)) return;
  }
  clube.escalacao = escalarAutomatico(elencoDe(estado, clubeId), clube.tatica.formacao, clube.tatica.jogadas);
}

function transferir(estado: EstadoJogo, j: Jogador, destinoId: string, valor: number, data: string) {
  const origemId = j.clubeId;
  const destino = estado.clubes[destinoId];
  if (valor > 0) {
    lancar(destino, data, "transferencia", `Compra de ${j.nome}`, -valor);
    if (origemId) lancar(estado.clubes[origemId], data, "transferencia", `Venda de ${j.nome}`, valor);
  }
  tirarDaEscalacao(estado, j);
  j.clubeId = destinoId;
  j.aVenda = false;
  j.salario = Math.max(j.salario, Math.round(salarioBase(j.forca) * 1.1));
  if (origemId && origemId !== estado.tecnico.clubeId) reescalar(estado, origemId);
  if (destinoId !== estado.tecnico.clubeId) reescalar(estado, destinoId);
  else if (destino.escalacao.reservas.length < 7) destino.escalacao.reservas.push(j.id);
}

export type ResultadoNegocio = { ok: true; texto: string } | { ok: false; texto: string };

/** O usuário faz uma oferta por um jogador de outro clube (ou contrata um livre). */
export function fazerOferta(estado: EstadoJogo, jogadorId: number, oferta: number): ResultadoNegocio {
  const j = estado.jogadores[jogadorId];
  const meu = estado.clubes[estado.tecnico.clubeId];
  if (!j || j.clubeId === meu.id) return { ok: false, texto: "Jogador inválido." };
  if (elencoDe(estado, meu.id).length >= ELENCO_MAXIMO) return { ok: false, texto: `Seu elenco já tem ${ELENCO_MAXIMO} jogadores. Venda ou dispense alguém antes.` };
  if (!j.clubeId) {
    const salario = Math.round(salarioBase(j.forca) * 1.15);
    transferir(estado, j, meu.id, 0, estado.data);
    j.salario = salario;
    return { ok: true, texto: `${j.nome} assinou com o ${meu.nome}. Salário: R$ ${salario.toLocaleString("pt-BR")}/mês.` };
  }
  if (meu.caixa < oferta) return { ok: false, texto: "Você não tem dinheiro em caixa para essa oferta." };
  const vendedor = estado.clubes[j.clubeId];
  if (!podeSair(estado, j)) return { ok: false, texto: `O ${vendedor.nome} não aceita vender: ficaria sem opções na posição.` };
  const pedido = precoPedido(estado, j);
  const exigencia = pedido * rngPara(estado.semente, `oferta/${j.id}/${estado.data}`).real(0.93, 1.07);
  if (oferta < exigencia) {
    const contra = Math.round(exigencia / 10_000) * 10_000;
    return { ok: false, texto: `O ${vendedor.nome} recusou. Eles pedem cerca de R$ ${contra.toLocaleString("pt-BR")}.` };
  }
  transferir(estado, j, meu.id, oferta, estado.data);
  return { ok: true, texto: `Negócio fechado! ${j.nome} é o novo reforço do ${meu.nome}.` };
}

/** Dispensa: o jogador vira livre e o clube paga 3 salários de rescisão. */
export function dispensar(estado: EstadoJogo, jogadorId: number): ResultadoNegocio {
  const j = estado.jogadores[jogadorId];
  if (!j?.clubeId) return { ok: false, texto: "Jogador inválido." };
  if (!podeSair(estado, j)) return { ok: false, texto: "Não dá para dispensar: o elenco ficaria abaixo do mínimo na posição." };
  const clube = estado.clubes[j.clubeId];
  lancar(clube, estado.data, "rescisao", `Rescisão de ${j.nome}`, -j.salario * 3);
  tirarDaEscalacao(estado, j);
  j.clubeId = null;
  j.aVenda = false;
  return { ok: true, texto: `${j.nome} foi dispensado.` };
}

/** Clube da IA interessado em comprar: tem dinheiro e precisa da posição. */
function interessados(estado: EstadoJogo, j: Jogador, valor: number) {
  return Object.values(estado.clubes).filter((c) => {
    if (c.serie === "D" || c.id === j.clubeId || c.id === estado.tecnico.clubeId) return false;
    if (c.caixa < valor * 1.3) return false;
    const elenco = elencoDe(estado, c.id);
    if (elenco.length >= ELENCO_MAXIMO - 1) return false;
    const forca = forcaDoTime(elenco);
    return j.forca >= forca - 6 && j.forca <= forca + 12;
  });
}

/** Propostas que chegam pelos jogadores do usuário (os colocados à venda e, às vezes, os destaques). */
export function gerarPropostas(estado: EstadoJogo, data: string) {
  const meuId = estado.tecnico.clubeId;
  const rng = rngPara(estado.semente, `propostas/${data}`);
  for (const j of elencoDe(estado, meuId)) {
    const pendente = estado.mensagens.some((m) => m.proposta?.jogadorId === j.id && !m.proposta.resolvida);
    if (pendente) continue;
    const chance = j.aVenda ? 0.22 : j.forca >= 70 && j.idade <= 27 ? 0.006 : 0;
    if (!rng.chance(chance)) continue;
    const valor = Math.round((valorMercado(j) * rng.real(j.aVenda ? 0.75 : 1.0, j.aVenda ? 1.15 : 1.4)) / 10_000) * 10_000;
    const candidatos = interessados(estado, j, valor);
    if (!candidatos.length) continue;
    const clube = rng.escolher(candidatos);
    enviarMensagem(estado, {
      tipo: "proposta",
      titulo: `Proposta por ${j.nome}`,
      texto: `O ${clube.nome} oferece R$ ${valor.toLocaleString("pt-BR")} por ${j.nome}.`,
      proposta: { jogadorId: j.id, clubeId: clube.id, valor, validaAte: somarDias(data, 5) },
    });
  }
  for (const m of estado.mensagens) {
    if (m.proposta && !m.proposta.resolvida && m.proposta.validaAte < data) m.proposta.resolvida = "expirada";
  }
}

export function responderProposta(estado: EstadoJogo, mensagemId: number, aceitar: boolean): ResultadoNegocio {
  const m = estado.mensagens.find((x) => x.id === mensagemId);
  const p = m?.proposta;
  if (!p || p.resolvida) return { ok: false, texto: "Essa proposta não está mais valendo." };
  const j = estado.jogadores[p.jogadorId];
  if (!aceitar) { p.resolvida = "recusada"; return { ok: true, texto: "Proposta recusada." }; }
  if (j.clubeId !== estado.tecnico.clubeId) { p.resolvida = "expirada"; return { ok: false, texto: "O jogador não está mais no seu clube." }; }
  if (!podeSair(estado, j)) return { ok: false, texto: "Não dá para vender: o elenco ficaria abaixo do mínimo na posição." };
  const comprador = estado.clubes[p.clubeId];
  if (comprador.caixa < p.valor) { p.resolvida = "expirada"; return { ok: false, texto: `O ${comprador.nome} não tem mais dinheiro para o negócio.` }; }
  transferir(estado, j, comprador.id, p.valor, estado.data);
  p.resolvida = "aceita";
  return { ok: true, texto: `${j.nome} foi vendido ao ${comprador.nome} por R$ ${p.valor.toLocaleString("pt-BR")}.` };
}

/**
 * Até quanto o comprador topa pagar: entre 5% e 40% acima da primeira oferta (sorteado por proposta)
 * e nunca mais do que tem em caixa. O usuário não vê esse número.
 */
export function limiteDaProposta(estado: EstadoJogo, m: Mensagem): number {
  const p = m.proposta!;
  const inicial = p.inicial ?? p.valor;
  const fator = rngPara(estado.semente, `limite-proposta/${m.id}`).real(1.05, 1.4);
  return Math.max(p.valor, Math.min(inicial * fator, estado.clubes[p.clubeId]?.caixa ?? 0));
}

const reais = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

/**
 * O usuário pede mais do que a proposta. Até o limite do comprador, a venda sai pelo valor pedido.
 * Um pouco acima (até 25%), na primeira vez, o comprador melhora a oferta até perto da metade do
 * caminho; acima disso, ou insistindo acima do limite, ele desiste.
 */
export function pedirMais(estado: EstadoJogo, mensagemId: number, pedido: number): ResultadoNegocio {
  const m = estado.mensagens.find((x) => x.id === mensagemId);
  const p = m?.proposta;
  if (!m || !p || p.resolvida) return { ok: false, texto: "Essa proposta não está mais valendo." };
  const j = estado.jogadores[p.jogadorId];
  if (j?.clubeId !== estado.tecnico.clubeId) { p.resolvida = "expirada"; return { ok: false, texto: "O jogador não está mais no seu clube." }; }
  if (pedido <= p.valor) return { ok: false, texto: "Peça mais do que a oferta." };
  if (!podeSair(estado, j)) return { ok: false, texto: "Não dá para vender: o elenco ficaria abaixo do mínimo na posição." };
  const comprador = estado.clubes[p.clubeId];
  const limite = limiteDaProposta(estado, m);
  p.inicial ??= p.valor;
  p.pedidos = (p.pedidos ?? 0) + 1;
  if (pedido <= limite) {
    transferir(estado, j, comprador.id, pedido, estado.data);
    p.valor = pedido;
    p.resolvida = "aceita";
    m.texto = `O ${comprador.nome} pagou ${reais(pedido)} por ${j.nome}, o valor que você pediu.`;
    return { ok: true, texto: `O ${comprador.nome} aceitou pagar ${reais(pedido)}. ${j.nome} foi vendido.` };
  }
  if (p.pedidos === 1 && pedido <= limite * 1.25) {
    const nova = Math.floor((p.valor + (limite - p.valor) / 2) / 10_000) * 10_000;
    if (nova <= p.valor) return { ok: true, texto: `O ${comprador.nome} não paga mais que ${reais(p.valor)}.` };
    p.valor = nova;
    m.texto = `O ${comprador.nome} subiu a oferta para ${reais(nova)} por ${j.nome}.`;
    return { ok: true, texto: `O ${comprador.nome} não paga ${reais(pedido)}, mas subiu a oferta para ${reais(nova)}.` };
  }
  p.resolvida = "retirada";
  m.texto = `O ${comprador.nome} achou caro demais e desistiu de ${j.nome}.`;
  return { ok: true, texto: `O ${comprador.nome} achou caro demais e desistiu da proposta.` };
}

/** Janela de transferências: cada clube da IA tenta reforçar a posição mais fraca. */
export function transferenciasDaIa(estado: EstadoJogo, chave: string): string[] {
  const rng = rngPara(estado.semente, `janela/${chave}`);
  const data = estado.data;
  const noticias: string[] = [];
  const clubes = rng.embaralhar(Object.values(estado.clubes).filter((c) => c.serie !== "D" && c.id !== estado.tecnico.clubeId));
  for (const clube of clubes) {
    if (!rng.chance(0.3)) continue;
    const elenco = elencoDe(estado, clube.id);
    if (elenco.length >= ELENCO_MAXIMO - 1) continue;
    const forca = forcaDoTime(elenco);
    // Posição em que o melhor jogador está mais abaixo da força do time.
    const posicoes: Posicao[] = ["G", "L", "Z", "M", "A"];
    const carencia = posicoes
      .map((pos) => {
        const naPos = elenco.filter((j) => j.posicao === pos).sort((a, b) => b.forca - a.forca);
        const titulares = pos === "M" ? 4 : pos === "G" ? 1 : 2;
        const ultimoTitular = naPos[titulares - 1]?.forca ?? 0;
        return { pos, falta: forca - ultimoTitular };
      })
      .sort((a, b) => b.falta - a.falta)[0];
    if (carencia.falta < 3) continue;
    const orcamento = clube.caixa * 0.35;
    const alvos = Object.values(estado.jogadores).filter((j) => {
      if (j.posicao !== carencia.pos || j.clubeId === clube.id || j.clubeId === estado.tecnico.clubeId) return false;
      if (j.forca < forca - 3 || j.forca > forca + 8 || j.idade > 32) return false;
      if (j.clubeId && estado.clubes[j.clubeId].serie === "D") return false;
      return precoPedido(estado, j) <= orcamento && podeSair(estado, j);
    });
    if (!alvos.length) continue;
    const alvo = rng.escolherPeso(alvos, (j) => j.forca - forca + 6);
    const valor = precoPedido(estado, alvo);
    const origem = alvo.clubeId ? estado.clubes[alvo.clubeId].nome : null;
    transferir(estado, alvo, clube.id, valor, data);
    if (valor > 0 && origem) noticias.push(`${alvo.nome} troca o ${origem} pelo ${clube.nome} (R$ ${(valor / 1_000_000).toFixed(1).replace(".", ",")} mi).`);
  }
  return noticias;
}

/** Mantém uma lista de jogadores livres no mercado. */
export function completarLivres(estado: EstadoJogo, chave: string, quantidade = 45) {
  const rng = rngPara(estado.semente, `livres/${chave}`);
  const atuais = livres(estado);
  for (let i = atuais.length; i < quantidade; i++) {
    const id = estado.proximoIdJogador++;
    estado.jogadores[id] = gerarLivre(rng, id, 30, 66);
  }
}
