// Virada de temporada: histórico, premiação, acesso/rebaixamento, evolução dos
// jogadores, aposentadorias, base e preparação do ano seguinte.
import { comArtigo, concorda } from "./artigos";
import { demitir, gerarConvites, mudarReputacao, passouDaCarencia } from "./carreira";
import { encerrarContratos, garantirContratos, liberar } from "./contratos";
import { encerrarEmprestimos } from "./emprestimos";
import { inicioDaTemporada, somarDias } from "./calendario";
import { NOME_SERIE, SERIES, criarTemporada, posicaoNaLiga, tabelaDaLiga } from "./competicoes";
import { criarCopa } from "./copa";
import { CARGO, CONVITES, ELENCO_MAXIMO, MINIMO_POSICAO, PRECO_REFERENCIA, REPUTACAO } from "./constantes";
import { definirObjetivo } from "./diretoria";
import { escalarAutomatico } from "./forca";
import { lancar, premiacao } from "./financas";
import { gerarElenco, gerarJovem, limitar, salarioBase } from "./gerador";
import { completarLivres, elencoDe, livres, reescalar, transferenciasDaIa } from "./mercado";
import { enviarMensagem } from "./mensagens";
import { rngPara, type Rng } from "./rng";
import type { EstadoJogo, Jogador, Posicao, RegistroTemporada, SerieId } from "./tipos";

function artilheiro(estado: EstadoJogo, serie: SerieId): RegistroTemporada["artilheiros"][SerieId] {
  const gols = new Map<number, number>();
  for (const p of estado.partidas) {
    if (p.serie !== serie) continue;
    for (const e of p.eventos) {
      if ((e.tipo === "gol" || e.tipo === "gol-penalti") && e.jogador != null) gols.set(e.jogador, (gols.get(e.jogador) ?? 0) + 1);
    }
  }
  let melhor: [number, number] | undefined;
  for (const par of gols) if (!melhor || par[1] > melhor[1]) melhor = par;
  if (!melhor) return null;
  const j = estado.jogadores[melhor[0]];
  return j ? { jogadorId: j.id, nome: j.nome, clubeId: j.clubeId ?? "", gols: melhor[1] } : null;
}

function evoluir(rng: Rng, j: Jogador) {
  const jogou = j.temporada.jogos;
  let delta: number;
  if (j.idade <= 21) delta = rng.int(1, 4) + (jogou >= 15 ? 2 : jogou >= 5 ? 1 : 0);
  else if (j.idade <= 25) delta = rng.int(0, 3) + (jogou >= 20 ? 1 : 0);
  else if (j.idade <= 29) delta = rng.int(-1, 1);
  else if (j.idade <= 31) delta = rng.int(-2, 0);
  else if (j.idade <= 33) delta = rng.int(-4, -1);
  else delta = rng.int(-6, -2);
  if (delta > 0) j.forca = Math.min(j.potencial, j.forca + delta);
  else j.forca = limitar(j.forca + delta, 1, 99);
  j.potencial = Math.max(j.potencial, j.forca);
  j.idade++;
}

function vaiSeAposentar(rng: Rng, j: Jogador): boolean {
  if (j.idade >= 39) return true;
  if (j.idade >= 35) return rng.chance(0.25 + (j.idade - 35) * 0.2);
  if (j.idade >= 33 && j.forca < 45) return rng.chance(0.3);
  return false;
}

function posicaoMaisCarente(elenco: Jogador[]): Posicao {
  const alvo: Record<Posicao, number> = { G: 3, L: 4, Z: 5, M: 8, A: 5 };
  return (Object.keys(alvo) as Posicao[]).sort(
    (a, b) => elenco.filter((j) => j.posicao === a).length / alvo[a] - elenco.filter((j) => j.posicao === b).length / alvo[b],
  )[0];
}

export function encerrarTemporada(estado: EstadoJogo) {
  const ano = estado.temporada;
  const data = estado.data;
  const rng = rngPara(estado.semente, `virada/${ano}`);
  const nome = (id: string) => estado.clubes[id]?.nome ?? id;
  const meuId = estado.tecnico.clubeId;
  const minhaSerie = estado.clubes[meuId].serie as SerieId;

  // ---- histórico ----
  const tabelas = Object.fromEntries(SERIES.map((s) => [s, tabelaDaLiga(estado, s)])) as Record<SerieId, ReturnType<typeof tabelaDaLiga>>;
  const minhaPosicao = posicaoNaLiga(estado, meuId);
  const cumpriu = minhaPosicao <= estado.objetivo.posicaoAlvo;
  estado.historico.push({
    temporada: ano,
    campeoes: { A: estado.series.A.campeao!, B: estado.series.B.campeao!, C: estado.series.C.campeao! },
    ...(estado.copa?.campeao && estado.copa.vice ? { copa: { campeao: estado.copa.campeao, vice: estado.copa.vice } } : {}),
    artilheiros: { A: artilheiro(estado, "A"), B: artilheiro(estado, "B"), C: artilheiro(estado, "C") },
    promovidos: { A: [], B: [...estado.series.B.promovidos], C: [...estado.series.C.promovidos] },
    rebaixados: { A: [...estado.series.A.rebaixados], B: [...estado.series.B.rebaixados], C: [...estado.series.C.rebaixados] },
    tecnico: { clubeId: meuId, serie: minhaSerie, posicao: minhaPosicao, objetivo: estado.objetivo.descricao, cumpriu },
  });

  // ---- premiação ----
  for (const s of SERIES) {
    for (const l of tabelas[s]) {
      lancar(estado.clubes[l.clubeId], data, "premiacao", `Premiação: ${l.pos}º na ${NOME_SERIE[s]}`, premiacao(s, l.pos));
    }
  }

  // ---- elencos montados só para a Copa: saem (a Copa seguinte monta os seus) ----
  for (const clube of Object.values(estado.clubes)) {
    if (!clube.elencoDaCopa) continue;
    for (const j of elencoDe(estado, clube.id)) delete estado.jogadores[j.id];
    delete clube.elencoDaCopa;
  }

  // ---- acesso e rebaixamento ----
  const { A, B, C } = estado.series;
  for (const id of A.rebaixados) estado.clubes[id].serie = "B";
  for (const id of B.promovidos) estado.clubes[id].serie = "A";
  for (const id of B.rebaixados) estado.clubes[id].serie = "C";
  for (const id of C.promovidos) estado.clubes[id].serie = "B";
  for (const id of C.rebaixados) estado.clubes[id].serie = "D";
  const candidatos = Object.values(estado.clubes).filter((c) => c.serie === "D" && !C.rebaixados.includes(c.id));
  const sobemDaD: string[] = [];
  for (let i = 0; i < C.rebaixados.length && candidatos.length; i++) {
    const escolhido = rng.escolherPeso(candidatos, (c) => c.reputacao);
    candidatos.splice(candidatos.indexOf(escolhido), 1);
    escolhido.serie = "C";
    sobemDaD.push(escolhido.id);
    if (!elencoDe(estado, escolhido.id).length) {
      for (const j of gerarElenco(rng, escolhido, () => estado.proximoIdJogador++)) estado.jogadores[j.id] = j;
    }
  }

  // ---- jogadores: evolução, idade, aposentadoria ----
  const aposentadosMeus: string[] = [];
  for (const j of Object.values(estado.jogadores)) {
    for (const k of Object.keys(j.carreira) as (keyof Jogador["carreira"])[]) j.carreira[k] += j.temporada[k];
    evoluir(rng, j);
    j.temporada = { jogos: 0, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 };
    j.energia = 100;
    j.suspensaoJogos = 0;
    j.amarelosAcumulados = 0;
    j.lesaoDias = Math.max(0, j.lesaoDias - 60);
    // No clube do usuário vale o salário do contrato (muda na renovação); nos outros, o de mercado.
    if (j.clubeId !== meuId) j.salario = Math.round(salarioBase(j.forca) * (j.idade <= 20 ? 0.6 : 1));
    if (vaiSeAposentar(rng, j)) {
      if (j.clubeId === meuId) aposentadosMeus.push(j.nome);
      delete estado.jogadores[j.id];
    }
  }

  // ---- empréstimos: todos voltam aos clubes donos (antes dos contratos) ----
  const emprestimos = encerrarEmprestimos(estado, ano);

  // ---- contratos: quem o usuário não renovou sai de graça; os clubes do computador renovam ----
  garantirContratos(estado, ano + 1);
  const sairamDeGraca = encerrarContratos(estado, ano);
  const naoVoltam = new Set(sairamDeGraca.map((j) => j.id));

  // ---- base, elenco mínimo e excesso ----
  const jovensMeus: string[] = [];
  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    const elenco = () => elencoDe(estado, clube.id);
    const quantos = elenco().length < 24 ? 3 : elenco().length < 28 ? 2 : 1;
    for (let i = 0; i < quantos; i++) {
      const jovem = gerarJovem(rng, clube, posicaoMaisCarente(elenco()), estado.proximoIdJogador++);
      estado.jogadores[jovem.id] = jovem;
      if (clube.id === meuId) jovensMeus.push(`${jovem.nome} (${jovem.posicao}, ${jovem.idade} anos)`);
    }
    // Garante o mínimo por posição com jogadores livres (ou da base, se não houver).
    for (const pos of Object.keys(MINIMO_POSICAO) as Posicao[]) {
      while (elenco().filter((j) => j.posicao === pos).length < MINIMO_POSICAO[pos]) {
        const livre = livres(estado).filter((j) => j.posicao === pos && !(clube.id === meuId && naoVoltam.has(j.id))).sort((a, b) => b.forca - a.forca)[0];
        const novo = livre ?? gerarJovem(rng, clube, pos, estado.proximoIdJogador++);
        novo.clubeId = clube.id;
        estado.jogadores[novo.id] = novo;
      }
    }
    // Clubes da IA dispensam os excedentes mais fracos e mais velhos.
    if (clube.id !== meuId) {
      const sobra = elenco().length - (ELENCO_MAXIMO - 3);
      if (sobra > 0) {
        const descartaveis = elenco()
          .filter((j) => elenco().filter((x) => x.posicao === j.posicao).length > MINIMO_POSICAO[j.posicao] + 1)
          .sort((a, b) => a.forca - a.idade / 2 - (b.forca - b.idade / 2));
        for (const j of descartaveis.slice(0, sobra)) liberar(j);
      }
    }
  }

  // Livres: os mais fracos deixam o futebol; completa a lista.
  const listaLivres = livres(estado).sort((a, b) => b.forca - a.forca);
  for (const j of listaLivres.slice(70)) delete estado.jogadores[j.id];
  completarLivres(estado, `${ano + 1}`);
  // Quem subiu da base ou chegou para completar um elenco ganha contrato (pelo menos até o fim do ano seguinte).
  garantirContratos(estado, ano + 2);

  // ---- clubes ----
  for (const clube of Object.values(estado.clubes)) {
    // Quem se aposentou ou saiu do clube deixa a escalação.
    const ficou = (id: number | null) => id != null && estado.jogadores[id]?.clubeId === clube.id;
    clube.escalacao.titulares = clube.escalacao.titulares.map((id) => (ficou(id) ? id : null));
    clube.escalacao.reservas = clube.escalacao.reservas.filter(ficou);
    clube.resumoFinanceiro = {};
    clube.moral = 60;
    if (clube.id !== meuId && clube.serie !== "D") clube.precoIngresso = PRECO_REFERENCIA[clube.serie];
  }

  // ---- diretoria ----
  const t = estado.tecnico;
  const subiu = (B.promovidos.includes(meuId) && minhaSerie === "B") || (C.promovidos.includes(meuId) && minhaSerie === "C");
  const caiu = [...A.rebaixados, ...B.rebaixados, ...C.rebaixados].includes(meuId);
  const campeao = [A.campeao, B.campeao, C.campeao].includes(meuId);
  t.confiancaDiretoria = limitar(t.confiancaDiretoria + (cumpriu ? 15 : -15) + (subiu ? 15 : 0) + (campeao ? 10 : 0) - (caiu ? 20 : 0), 10, 100);
  t.confiancaTorcida = limitar(t.confiancaTorcida + (subiu ? 15 : 0) + (campeao ? 20 : 0) - (caiu ? 20 : 0), 10, 100);
  mudarReputacao(estado,
    (cumpriu ? REPUTACAO.cumpriu : REPUTACAO.naoCumpriu) + (subiu ? REPUTACAO.acesso : 0) + (caiu ? REPUTACAO.rebaixamento : 0) +
    (campeao ? (minhaSerie === "A" ? REPUTACAO.tituloA : REPUTACAO.titulo) : 0) + (estado.copa?.campeao === meuId ? REPUTACAO.copa : 0));
  // Quem caiu para a Série D já troca de clube; os outros, abaixo do objetivo e sem a confiança da diretoria, saem.
  const caiuParaD = C.rebaixados.includes(meuId);
  const demitido = !t.demissao && !caiuParaD && !cumpriu && t.confiancaDiretoria <= CARGO.demissao && passouDaCarencia(estado);

  // ---- nova temporada ----
  estado.temporada = ano + 1;
  estado.data = somarDias(inicioDaTemporada(ano + 1), -7);
  criarTemporada(estado);
  criarCopa(estado);
  transferenciasDaIa(estado, `${ano + 1}-pre-1`);
  transferenciasDaIa(estado, `${ano + 1}-pre-2`);
  for (const clube of Object.values(estado.clubes)) {
    if (clube.serie === "D") continue;
    if (clube.id === meuId) {
      const meu = estado.clubes[meuId];
      const elenco = elencoDe(estado, meuId);
      // Mantém quem o usuário escalou (se ainda está no clube) e completa o resto.
      if (estado.config.escalacaoAutomatica) meu.escalacao = escalarAutomatico(elenco, meu.tatica.formacao, meu.tatica.jogadas);
      else reescalar(estado, meuId);
    } else {
      reescalar(estado, clube.id);
    }
  }
  estado.objetivo = definirObjetivo(estado);

  // ---- técnico: demissão ou convites de clubes maiores (para quem foi bem) ----
  const meuClube = estado.clubes[meuId];
  if (demitido) demitir(estado, `A diretoria ${comArtigo("do", meuClube)} não quis continuar com você depois de uma temporada abaixo do objetivo.`);
  else if (!t.demissao && !caiuParaD && (cumpriu || subiu || campeao)) gerarConvites(estado, CONVITES.virada);

  // ---- mensagens ----
  const resumo = [
    `${nome(A.campeao!)} foi ${concorda(estado.clubes[A.campeao!], "campeão", "campeã")} da Série A, ${nome(B.campeao!)} da Série B e ${nome(C.campeao!)} da Série C.`,
    `Seu time terminou a fase de classificação em ${minhaPosicao}º. Objetivo: ${cumpriu ? "cumprido" : "não cumprido"}.`,
    subiu ? `Acesso conquistado! Em ${ano + 1} ${comArtigo("o", meuClube)} joga a ${NOME_SERIE[meuClube.serie as SerieId]}.` : "",
    caiu ? `${comArtigo("O", meuClube)} foi ${concorda(meuClube, "rebaixado", "rebaixada")} e joga a ${NOME_SERIE[meuClube.serie as SerieId]} em ${ano + 1}.` : "",
    sobemDaD.length ? `Vindos da Série D: ${sobemDaD.map(nome).join(" e ")}.` : "",
  ].filter(Boolean).join(" ");
  enviarMensagem(estado, { tipo: "temporada", titulo: `Fim da temporada ${ano}`, texto: resumo });
  if (emprestimos.voltaram.length || emprestimos.devolvidos.length) {
    const partes = [
      emprestimos.voltaram.length ? `Voltaram ao seu clube: ${emprestimos.voltaram.map((j) => j.nome).join(", ")}.` : "",
      emprestimos.devolvidos.length ? `Voltaram aos clubes donos: ${emprestimos.devolvidos.map((j) => j.nome).join(", ")}.` : "",
    ];
    enviarMensagem(estado, { tipo: "mercado", titulo: "Fim dos empréstimos", texto: partes.filter(Boolean).join(" ") });
  }
  if (sairamDeGraca.length) {
    enviarMensagem(estado, { tipo: "mercado", titulo: "Fim de contrato", texto: `Saíram de graça, sem renovar: ${sairamDeGraca.map((j) => j.nome).join(", ")}.` });
  }
  if (aposentadosMeus.length) {
    enviarMensagem(estado, { tipo: "noticia", titulo: "Aposentadorias", texto: `Penduraram as chuteiras: ${aposentadosMeus.join(", ")}.` });
  }
  if (jovensMeus.length) {
    enviarMensagem(estado, { tipo: "noticia", titulo: "Novos jogadores da base", texto: `Subiram para o profissional: ${jovensMeus.join(", ")}.` });
  }
  if (!demitido) {
    enviarMensagem(estado, {
      tipo: "diretoria",
      titulo: `Objetivo para ${ano + 1}`,
      texto: `A diretoria espera: ${estado.objetivo.descricao}.`,
    });
  }
}
