import { club } from "./clubes.ts";

/** Piezas comunes de la liga y las copas del Ascenso: azar por hash, fixture, tablas y partidos simulados. */

export interface FilaTabla {
  pj: number;
  pg: number;
  pp: number;
  pts: number;
}

export interface Cruce {
  a: string;
  b: string;
  ganador?: string;
}

/** Tu lugar en las listas (el club que elegiste es `miClub`). */
export const YO_CLUB = "yo";
/** Para completar un grupo impar: el que le toca contra "libre" no juega esa fecha. */
export const LIBRE = "-";

export function azar(clave: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < clave.length; i++) {
    const ch = clave.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 2 ** 53;
}

export function mezclar<T>(xs: readonly T[], clave: string): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar(`${clave}:${i}`) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function nivelClub(id: string): number {
  return club(id)?.nivel ?? 5;
}

/** Partido entre dos clubes de la máquina: gana más seguido el de mejor nivel (3 niveles de diferencia ≈ 80%). */
export function simular(a: string, b: string, clave: string): string {
  const p = 1 / (1 + Math.exp(-0.45 * (nivelClub(a) - nivelClub(b))));
  return azar(clave) < p ? a : b;
}

/** Los partidos de una fecha (1 a n − 1) con el método del círculo (n par). */
export function fixture(orden: readonly string[], fecha: number): [string, string][] {
  const n = orden.length;
  const resto = orden.slice(1);
  const arr = [orden[0]!, ...resto.map((_, i) => resto[(i + fecha - 1) % (n - 1)]!)];
  return Array.from({ length: n / 2 }, (_, i) => (fecha % 2 ? [arr[i]!, arr[n - 1 - i]!] : [arr[n - 1 - i]!, arr[i]!]) as [string, string]);
}

export const filaVacia = (): FilaTabla => ({ pj: 0, pg: 0, pp: 0, pts: 0 });

export function sumar(tabla: Record<string, FilaTabla>, ganador: string, perdedor: string) {
  const g = (tabla[ganador] ??= filaVacia());
  const q = (tabla[perdedor] ??= filaVacia());
  g.pj++;
  g.pg++;
  g.pts += 3;
  q.pj++;
  q.pp++;
}

/** La tabla ordenada: puntos, partidos ganados y, a igualdad, un sorteo fijo. */
export function posiciones(tabla: Record<string, FilaTabla>, ids: readonly string[], sorteo: string): string[] {
  const f = (id: string) => tabla[id] ?? filaVacia();
  return ids.slice().sort((a, b) => f(b).pts - f(a).pts || f(b).pg - f(a).pg || azar(sorteo + a) - azar(sorteo + b));
}
