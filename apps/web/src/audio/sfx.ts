/**
 * Efectos de sonido sintetizados con Web Audio (sin archivos: pesa cero y anda offline).
 * El AudioContext se crea recién con el primer gesto del usuario (requisito de los navegadores).
 */

export type SfxName = "click" | "carta" | "repartir" | "barajar" | "turno" | "error" | "tic" | "basta" | "ruleta" | "ganar" | "bolillero" | "festejo" | "hinchada" | "dados";

let enabled = true;
let vibrationEnabled = true;
let ctx: AudioContext | null = null;

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

export function setVibrationEnabled(value: boolean) {
  vibrationEnabled = value;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, gain = 0.15, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

/** Golpe de ruido filtrado: suena a carta que pega contra el paño. */
function snap(ac: AudioContext, start: number, { freq = 2400, duration = 0.07, gain = 0.5 } = {}) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Ruido fijo (no hace falta azar real para un efecto de sonido).
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}

export function playSfx(name: SfxName) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  switch (name) {
    case "click":
      tone(ac, 660, t, 0.06, 0.08, "triangle");
      break;
    case "carta":
      snap(ac, t, { freq: 1800, duration: 0.09, gain: 0.6 });
      break;
    case "repartir":
      for (let i = 0; i < 3; i++) snap(ac, t + i * 0.11, { freq: 2600, duration: 0.05, gain: 0.45 });
      break;
    case "barajar":
      for (let i = 0; i < 18; i++) snap(ac, t + i * 0.028 + (i % 3) * 0.004, { freq: 3200 + (i % 5) * 200, duration: 0.03, gain: 0.25 });
      break;
    case "turno":
      tone(ac, 784, t, 0.18, 0.12);
      tone(ac, 1047, t + 0.12, 0.25, 0.12);
      break;
    case "error":
      tone(ac, 220, t, 0.18, 0.1, "square");
      break;
    case "tic":
      tone(ac, 1200, t, 0.05, 0.1, "square");
      break;
    case "basta":
      tone(ac, 523, t, 0.15, 0.14, "sawtooth");
      tone(ac, 392, t + 0.14, 0.3, 0.14, "sawtooth");
      break;
    case "ruleta":
      for (let i = 0; i < 14; i++) tone(ac, 900 + (i % 2) * 150, t + i * 0.09 * (1 + i / 14), 0.03, 0.06, "triangle");
      break;
    case "ganar":
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.11, 0.3, 0.1));
      break;
    case "bolillero":
      // Bolillas que chocan adentro del bolillero.
      for (let i = 0; i < 24; i++) snap(ac, t + i * 0.055 + (i % 4) * 0.01, { freq: 1400 + (i % 6) * 260, duration: 0.04, gain: 0.3 });
      break;
    case "dados":
      // Los dados sacudiéndose en el cubilete y cayendo sobre la mesa.
      for (let i = 0; i < 10; i++) snap(ac, t + i * 0.045, { freq: 900 + (i % 3) * 300, duration: 0.04, gain: 0.35 });
      for (let i = 0; i < 5; i++) snap(ac, t + 0.55 + i * 0.07 + (i % 2) * 0.03, { freq: 2200 - i * 150, duration: 0.05, gain: 0.5 });
      break;
    case "hinchada":
      // La hinchada que canta y el bombo: para entrar a un clásico.
      for (let i = 0; i < 14; i++) snap(ac, t + i * 0.14, { freq: 420 + (i % 4) * 120, duration: 0.45, gain: 0.1 + (i % 3) * 0.03 });
      for (let i = 0; i < 8; i++) tone(ac, 65, t + i * 0.25, 0.18, i % 2 ? 0.2 : 0.32, "sine");
      break;
    case "festejo":
      // La hinchada (ruido que crece), el bombo y una fanfarria.
      for (let i = 0; i < 16; i++) snap(ac, t + i * 0.12, { freq: 500 + (i % 5) * 140, duration: 0.5, gain: 0.08 + i * 0.012 });
      for (let i = 0; i < 6; i++) tone(ac, 70, t + i * 0.32, 0.22, 0.32, "sine");
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(ac, f, t + 0.3 + i * 0.16, 0.34, 0.09));
      break;
  }
}

export function vibrate(pattern: number | number[]) {
  if (!vibrationEnabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Algunos navegadores (iOS) no tienen vibración: no pasa nada.
  }
}
