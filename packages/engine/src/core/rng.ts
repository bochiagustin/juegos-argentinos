/**
 * Generador pseudoaleatorio con semilla, 100% puro y serializable.
 *
 * Algoritmo: sfc32 (Small Fast Counter, PractRand-clean) sembrado con cyrb128
 * a partir de un string. El estado es una tupla de 4 uint32, así se puede
 * guardar dentro del estado del juego (JSON) y reproducir una partida entera
 * a partir de la semilla + la lista de acciones.
 *
 * Nunca muta: cada llamada devuelve el valor y el nuevo estado.
 */

export type RngState = readonly [number, number, number, number];

/** Hash de 128 bits de un string (cyrb128). */
function cyrb128(str: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(state: RngState): [number, RngState] {
  let [a, b, c, d] = state;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  return [t >>> 0, [a >>> 0, b >>> 0, c >>> 0, d >>> 0]];
}

/** Crea el estado inicial a partir de una semilla legible (ej. "sala-ABCD-ronda-3"). */
export function createRng(seed: string): RngState {
  let state = cyrb128(seed);
  // Descartamos las primeras salidas para mezclar bien semillas parecidas.
  for (let i = 0; i < 15; i++) state = sfc32(state)[1];
  return state;
}

/** Entero uniforme de 32 bits sin signo. */
export function nextUint32(state: RngState): [number, RngState] {
  return sfc32(state);
}

/** Float uniforme en [0, 1). */
export function nextFloat(state: RngState): [number, RngState] {
  const [n, next] = sfc32(state);
  return [n / 4294967296, next];
}

/**
 * Entero uniforme en [0, maxExclusive). Usa rechazo para evitar el sesgo de
 * módulo (importante: un mazo mezclado tiene que ser realmente equiprobable).
 */
export function nextInt(state: RngState, maxExclusive: number): [number, RngState] {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 4294967296) {
    throw new RangeError(`maxExclusive inválido: ${maxExclusive}`);
  }
  const limit = 4294967296 - (4294967296 % maxExclusive);
  let s = state;
  for (;;) {
    const [n, next] = sfc32(s);
    s = next;
    if (n < limit) return [n % maxExclusive, s];
  }
}

/** Elige un elemento al azar. */
export function pick<T>(state: RngState, items: readonly T[]): [T, RngState] {
  if (items.length === 0) throw new RangeError("No se puede elegir de una lista vacía");
  const [i, next] = nextInt(state, items.length);
  return [items[i] as T, next];
}

/** Genera una semilla nueva (para el servidor, al crear una ronda). */
export function randomSeed(): string {
  const bytes = new Uint8Array(16);
  // El motor no depende de tipos de DOM ni de Node; Web Crypto existe en ambos y en Workers.
  (globalThis as unknown as { crypto: { getRandomValues(a: Uint8Array): Uint8Array } }).crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
