// Sons da partida ao vivo, feitos no próprio aparelho (nada é baixado nem copiado de outro jogo):
// o apito do árbitro, a torcida e a vaia são sintetizados com Web Audio, e o narrador do pênalti usa a
// voz em português do sistema (speechSynthesis). No iPhone o som só é liberado depois de um toque, por isso
// `liberarSom` é chamado no botão "Começar o jogo"; com a chave do silencioso ligada, o iPhone cala o
// apito e a torcida.
import type { EventoPartida } from "../engine/tipos";

/** Volume da festa no gol do meu time (o som mais alto da partida) e da vaia no gol do adversário. */
const FESTA = 1.5;
const VAIA = 0.75;

let contexto: AudioContext | undefined;
let ruido: AudioBuffer | undefined;

function audio(): AudioContext | undefined {
  try {
    const Construtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Construtor) return undefined;
    contexto ??= new Construtor();
    if (contexto.state !== "running") void contexto.resume().catch(() => undefined);
    return contexto;
  } catch {
    return undefined;
  }
}

/** Chame num toque do usuário: libera o som e a voz no iPhone. */
export function liberarSom() {
  audio();
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis?.speak(u);
  } catch {
    // Sem voz no aparelho: o resto dos sons continua.
  }
}

/** Para a narração (ao sair da partida). */
export function pararSons() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // nada a parar
  }
}

/** Uma apitada: tom agudo com o trinado da bolinha do apito. */
function apitada(ctx: AudioContext, inicio: number, duracao: number) {
  const tom = ctx.createOscillator();
  tom.type = "sine";
  tom.frequency.value = 3000;
  const trinado = ctx.createOscillator();
  trinado.frequency.value = 42;
  const profundidade = ctx.createGain();
  profundidade.gain.value = 220;
  trinado.connect(profundidade).connect(tom.frequency);
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0, inicio);
  volume.gain.linearRampToValueAtTime(0.22, inicio + 0.03);
  volume.gain.setValueAtTime(0.22, inicio + duracao - 0.06);
  volume.gain.linearRampToValueAtTime(0, inicio + duracao);
  tom.connect(volume).connect(ctx.destination);
  for (const o of [tom, trinado]) {
    o.start(inicio);
    o.stop(inicio + duracao + 0.02);
  }
}

/** Apitos do árbitro: [começo, duração] de cada apitada, em segundos. */
const APITOS = {
  inicio: [[0, 0.9]],
  penalti: [[0, 0.6]],
  intervalo: [[0, 0.35], [0.5, 0.75]],
  fim: [[0, 0.35], [0.55, 0.35], [1.1, 1.2]],
} as const;

export function apito(tipo: keyof typeof APITOS) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.05;
  for (const [comeco, duracao] of APITOS[tipo]) apitada(ctx, t + comeco, duracao);
}

/** Ruído "rosa" (mais grave que o chiado branco): a base do som da torcida. */
function bufferDeRuido(ctx: AudioContext): AudioBuffer {
  if (ruido && ruido.sampleRate === ctx.sampleRate) return ruido;
  ruido = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
  const dados = ruido.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < dados.length; i++) {
    const branco = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + branco * 0.099046;
    b1 = 0.963 * b1 + branco * 0.2965164;
    b2 = 0.57 * b2 + branco * 1.0526913;
    dados[i] = (b0 + b1 + b2 + branco * 0.1848) * 0.18;
  }
  return ruido;
}

/**
 * Torcida: "gol" é a festa do gol do meu time, que explode e vai baixando; "penalti" é o burburinho de
 * expectativa e "perdeu" é o "uhhh" de quando o pênalti não entra.
 */
export function torcida(tipo: "gol" | "penalti" | "perdeu") {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.03;
  const duracao = tipo === "gol" ? 5 : tipo === "penalti" ? 2.4 : 1.8;
  const fonte = ctx.createBufferSource();
  fonte.buffer = bufferDeRuido(ctx);
  const filtro = ctx.createBiquadFilter();
  filtro.type = "bandpass";
  filtro.Q.value = 0.7;
  const volume = ctx.createGain();
  const pico = tipo === "gol" ? FESTA : 0.45;
  volume.gain.setValueAtTime(0.0001, t);
  if (tipo === "gol") {
    filtro.frequency.setValueAtTime(700, t);
    filtro.frequency.linearRampToValueAtTime(1100, t + 0.5);
    volume.gain.exponentialRampToValueAtTime(pico, t + 0.35);
    volume.gain.setValueAtTime(pico, t + 2.5);
  } else if (tipo === "penalti") {
    filtro.frequency.setValueAtTime(500, t);
    filtro.frequency.linearRampToValueAtTime(800, t + duracao);
    volume.gain.exponentialRampToValueAtTime(pico, t + 1.2);
  } else {
    filtro.frequency.setValueAtTime(900, t);
    filtro.frequency.exponentialRampToValueAtTime(350, t + duracao);
    volume.gain.exponentialRampToValueAtTime(pico, t + 0.25);
  }
  volume.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  fonte.connect(filtro).connect(volume).connect(ctx.destination);
  fonte.start(t);
  fonte.stop(t + duracao);
}

/**
 * Vaia do gol do adversário: muita gente fazendo "uuu" grave. Cada voz é um tom grave com um leve
 * vibrato, passando pelos dois formantes da vogal "u" (~320 Hz forte, ~800 Hz fraco); um ruído grave
 * por baixo faz o ar do estádio, e no fim as vozes caem um pouco, como numa vaia de verdade.
 */
export function vaia() {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.03;
  const duracao = 3.2;
  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0.0001, t);
  volume.gain.exponentialRampToValueAtTime(VAIA, t + 0.5);
  volume.gain.setValueAtTime(VAIA, t + duracao - 1);
  volume.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  volume.connect(ctx.destination);
  const grave = ctx.createBiquadFilter();
  grave.type = "bandpass";
  grave.frequency.value = 320;
  grave.Q.value = 3;
  grave.connect(volume);
  const medio = ctx.createBiquadFilter();
  medio.type = "bandpass";
  medio.frequency.value = 800;
  medio.Q.value = 5;
  const medioMaisBaixo = ctx.createGain();
  medioMaisBaixo.gain.value = 0.35;
  medio.connect(medioMaisBaixo).connect(volume);

  const vozes = 16;
  for (let i = 0; i < vozes; i++) {
    const altura = 95 + Math.random() * 130;
    const voz = ctx.createOscillator();
    voz.type = "sawtooth";
    voz.frequency.value = altura;
    voz.frequency.setValueAtTime(altura, t + duracao * 0.55);
    voz.frequency.linearRampToValueAtTime(altura * 0.8, t + duracao);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 4 + Math.random() * 3;
    const profundidade = ctx.createGain();
    profundidade.gain.value = altura * 0.03;
    vibrato.connect(profundidade).connect(voz.frequency);
    const parte = ctx.createGain();
    parte.gain.value = 1 / vozes;
    voz.connect(parte);
    parte.connect(grave);
    parte.connect(medio);
    const entra = t + Math.random() * 0.35;
    for (const o of [voz, vibrato]) {
      o.start(entra);
      o.stop(t + duracao + 0.05);
    }
  }

  const ar = ctx.createBufferSource();
  ar.buffer = bufferDeRuido(ctx);
  const abafado = ctx.createBiquadFilter();
  abafado.type = "lowpass";
  abafado.frequency.value = 400;
  const arMaisBaixo = ctx.createGain();
  arMaisBaixo.gain.value = 0.5;
  ar.connect(abafado).connect(arMaisBaixo).connect(volume);
  ar.start(t);
  ar.stop(t + duracao);
}

/** O narrador, com a voz em português do aparelho, animado. */
export function narrar(texto: string) {
  try {
    const voz = window.speechSynthesis;
    if (!voz) return;
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    const brasileira = voz.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase() === "pt-br");
    if (brasileira) fala.voice = brasileira;
    fala.rate = 1.1;
    fala.pitch = 1.2;
    fala.volume = 1;
    voz.speak(fala);
  } catch {
    // Sem voz no aparelho: os outros sons continuam.
  }
}

/** Sons dos lances novos do jogo do usuário. `meuLado` é o lado do time do usuário (0 = mandante). */
export function tocarLances(lances: EventoPartida[], meuLado: 0 | 1) {
  for (const e of lances) {
    if (e.tipo === "penalti") {
      apito("penalti");
      torcida("penalti");
      narrar("Pênalti!");
    } else if (e.tipo === "gol" || e.tipo === "gol-penalti") {
      // Sem narrador no gol: festa da torcida no gol do meu time, vaia no do adversário.
      if (e.lado === meuLado) torcida("gol");
      else vaia();
    } else if (e.tipo === "penalti-perdido") {
      torcida("perdeu");
    } else if (e.tipo === "intervalo") {
      apito("intervalo");
    } else if (e.tipo === "fim") {
      apito("fim");
    }
  }
}
