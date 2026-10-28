/**
 * Voz para los cantos ("¡Truco!", "¡Quiero!") con la síntesis de voz del navegador.
 * Usa una voz en castellano (ideal es-AR) si hay; si no hay ninguna, no suena y listo.
 */

let enabled = true;
let voice: SpeechSynthesisVoice | null | undefined;

export function setVozEnabled(value: boolean) {
  enabled = value;
  if (!value) cancelar();
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "es-AR") ??
    voices.find((v) => v.lang === "es-UY") ??
    voices.find((v) => v.lang.startsWith("es-419") || v.lang === "es-US") ??
    voices.find((v) => v.lang.startsWith("es")) ??
    null
  );
}

export function decir(texto: string, { pitch = 1, rate = 1.08 } = {}) {
  if (!enabled || typeof speechSynthesis === "undefined") return;
  try {
    if (voice === undefined || voice === null) voice = pickVoice();
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.voice = voice;
    u.lang = voice.lang;
    u.pitch = pitch;
    u.rate = rate;
    speechSynthesis.speak(u);
  } catch {
    // Sin voz: el globo de diálogo alcanza.
  }
}

export function cancelar() {
  try {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  } catch {
    // nada
  }
}

const UNIDADES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"];

/** Número en palabras (0–39), para cantar los tantos. */
export function enPalabras(n: number): string {
  if (n <= 20) return UNIDADES[n] ?? String(n);
  if (n < 30) return n === 22 ? "veintidós" : n === 23 ? "veintitrés" : n === 26 ? "veintiséis" : `veinti${UNIDADES[n - 20]}`;
  if (n === 30) return "treinta";
  if (n < 40) return `treinta y ${UNIDADES[n - 30]}`;
  return String(n);
}
