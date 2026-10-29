/**
 * Personalidad de un rival, de 0 a 10 en cada rasgo (5 = como cualquiera). Cambia cómo juega, no cuánto sabe:
 * - mentiroso: canta y apuesta sin tener con qué.
 * - pescador: se calla con cartas buenas para que el otro se tire y después lo castiga.
 * - agresivo: canta todo, sube siempre y no se guarda nada.
 */
export interface Rasgos {
  mentiroso: number;
  pescador: number;
  agresivo: number;
}

/** De -1 a 1: cuánto se aparta un rasgo de lo normal (5). */
export function desvio(valor: number): number {
  return (Math.min(10, Math.max(0, valor)) - 5) / 5;
}
