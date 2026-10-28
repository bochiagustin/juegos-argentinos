import { createRng, shuffle, type RngState } from "@juegos-argentinos/engine";

export interface Jugador {
  nombre: string;
  avatar: string;
}

export const HUMAN_SEAT = 0;
export const HUMAN_ID = "vos";

/** Rivales de la partida rápida (en la gira, los rivales son los personajes de cada región). */
export const RIVALES_RAPIDA: Jugador[] = [
  { nombre: "Coco", avatar: "🧔" },
  { nombre: "Doña Elsa", avatar: "👵" },
  { nombre: "Pocho", avatar: "🤠" },
  { nombre: "Ñato", avatar: "🎣" },
  { nombre: "Mirta", avatar: "👩‍🦳" },
  { nombre: "Benja", avatar: "🎸" },
  { nombre: "Rosita", avatar: "🍇" },
  { nombre: "Don Aníbal", avatar: "🍷" },
  { nombre: "El Polaco", avatar: "🎩" },
  { nombre: "Nahuel", avatar: "🐑" },
];

export function rivalesAlAzar(seed: string, cantidad: number): [Jugador[], RngState] {
  const [r, rng] = shuffle(RIVALES_RAPIDA, createRng(`${seed}-rivales`));
  return [r.slice(0, cantidad), rng];
}
