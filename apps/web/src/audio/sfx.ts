/**
 * Efectos de sonido sintetizados con Web Audio (sin archivos: pesa cero y anda offline).
 * El AudioContext se crea recién con el primer gesto del usuario (requisito de los navegadores).
 */

export type SfxName = "click" | "carta" | "repartir" | "barajar" | "turno" | "error";

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
