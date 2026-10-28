/**
 * Nivel adaptativo de la IA: un rating tipo Elo por juego.
 * Ganarle a la máquina sube tu rating (y la máquina se pone más brava); perder lo baja.
 */

export const DEFAULT_RATING = 900;
const BASE = 800;
const STEP = 55;
const K = 40;

/** Rating equivalente de un bot de ese nivel. */
export function botRating(skill: number): number {
  return BASE + (skill - 1) * STEP;
}

/** Nivel de bot que le da partido parejo a un jugador con ese rating. */
export function skillForRating(rating: number): number {
  return Math.min(10, Math.max(1, Math.round(1 + (rating - BASE) / STEP)));
}

export function updateRating(rating: number, botSkill: number, won: boolean): number {
  const expected = 1 / (1 + 10 ** ((botRating(botSkill) - rating) / 400));
  return Math.round(rating + K * ((won ? 1 : 0) - expected));
}

const NOMBRES: [number, string][] = [
  [2, "Principiante"],
  [4, "De boliche"],
  [6, "Baqueano"],
  [8, "Tahúr"],
  [10, "Leyenda"],
];

export function nivelNombre(skill: number): string {
  return NOMBRES.find(([max]) => skill <= max)?.[1] ?? "Leyenda";
}
