import type { SuitedCard } from "../core/index.ts";
import { hasFlor, tanto } from "./cards.ts";
import type { Seat } from "./types.ts";

/**
 * Las señas clásicas del truco (2v2 y 3v3): un gesto rápido al compañero sobre lo que uno tiene. Contra la máquina, los
 * compañeros bots te las hacen al empezar cada mano (y vos se las hacés a ellos); los rivales a veces las "pescan".
 */
export const SENAS = ["cejas", "guino", "boca-derecha", "boca-izquierda", "labio", "trompita", "lengua", "cachetes", "cabeza", "ojos"] as const;
export type Sena = (typeof SENAS)[number];

export const SENA_INFO: Record<Sena, { gesto: string; emoji: string; significa: string }> = {
  cejas: { gesto: "Levanta las cejas", emoji: "🤨", significa: "Ancho de espada" },
  guino: { gesto: "Guiña un ojo", emoji: "😉", significa: "Ancho de basto" },
  "boca-derecha": { gesto: "Tuerce la boca a la derecha", emoji: "😏", significa: "Siete de espada" },
  "boca-izquierda": { gesto: "Tuerce la boca a la izquierda", emoji: "😼", significa: "Siete de oro" },
  labio: { gesto: "Se muerde el labio", emoji: "😬", significa: "Un tres" },
  trompita: { gesto: "Hace trompita", emoji: "😗", significa: "Un dos" },
  lengua: { gesto: "Muestra la punta de la lengua", emoji: "😛", significa: "Un as falso (de copa u oro)" },
  cachetes: { gesto: "Infla los cachetes", emoji: "🐡", significa: "Tengo flor" },
  cabeza: { gesto: "Ladea la cabeza", emoji: "🙃", significa: "30 o más de envido" },
  ojos: { gesto: "Cierra los ojos", emoji: "😑", significa: "No tengo nada" },
};

/** Lo que un compañero sabe (o cree saber) de la mano de otro por sus señas. */
export type Pista = { seat: Seat; opciones: string[] } | { seat: Seat; tanto30: true };

const CARTAS: Partial<Record<Sena, string[]>> = {
  cejas: ["1-espada"],
  guino: ["1-basto"],
  "boca-derecha": ["7-espada"],
  "boca-izquierda": ["7-oro"],
  labio: ["3-espada", "3-basto", "3-oro", "3-copa"],
  trompita: ["2-espada", "2-basto", "2-oro", "2-copa"],
  lengua: ["1-copa", "1-oro"],
};

/** Las señas que haría alguien honesto con esta mano (de la carta más fuerte a la más floja, hasta 3). */
export function senasDeMano(cartas: readonly SuitedCard[], conFlor: boolean): Sena[] {
  const out: Sena[] = [];
  for (const sena of ["cejas", "guino", "boca-derecha", "boca-izquierda", "labio", "trompita", "lengua"] as const) {
    const n = cartas.filter((c) => CARTAS[sena]!.includes(c.id)).length;
    for (let i = 0; i < n; i++) out.push(sena);
  }
  if (conFlor && cartas.length === 3 && hasFlor(cartas)) out.push("cachetes");
  else if (cartas.length === 3 && tanto(cartas) >= 30) out.push("cabeza");
  if (out.length === 0) out.push("ojos");
  return out.slice(0, 3);
}

/** Qué le dice una seña de `seat` a quien la ve. */
export function pistaDeSena(seat: Seat, sena: Sena): Pista | null {
  const opciones = CARTAS[sena];
  if (opciones) return { seat, opciones };
  if (sena === "cabeza") return { seat, tanto30: true };
  return null;
}
