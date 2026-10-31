import type { PlayerId, RngState } from "../core/index.ts";

export type Seat = number;

/** Quien maneja el reloj (la app o el servidor): pasa las cartas, cierra la nariz y reparte de nuevo. */
export const MESA_CHANCHO = "mesa";

/** Las figuras del mazo (una por jugador en la ronda): 4 cartas de cada una. */
export const FIGURAS = [
  { emoji: "🐷", nombre: "Chancho" },
  { emoji: "🐮", nombre: "Vaca" },
  { emoji: "🐔", nombre: "Gallina" },
  { emoji: "🐴", nombre: "Caballo" },
  { emoji: "🐑", nombre: "Oveja" },
  { emoji: "🐶", nombre: "Perro" },
] as const;

export const PALABRA = "CHANCHO";

/** El reloj de la mesa (ms): para elegir la carta de cada vuelta, para tocarse la nariz y para ver el resumen. */
export const TIEMPOS_CHANCHO = { pase: 3000, nariz: 3500, resumen: 2800 } as const;

export interface ChanchoConfig {
  /** 3 a 6. */
  players: 3 | 4 | 5 | 6;
}

export const DEFAULT_CHANCHO_CONFIG: ChanchoConfig = { players: 4 };

export type ChanchoAction =
  /** Elegir qué carta pasar (índice en tu mano); se puede cambiar hasta que se pase. */
  | { type: "elegir"; carta: number }
  /** Tocarse la nariz: el primero, con 4 iguales; los demás, cuando alguien ya se la tocó. */
  | { type: "nariz" }
  /** La mesa: todos pasan su carta a la derecha a la vez (al que no eligió, le sale una al azar). */
  | { type: "pasar" }
  /** La mesa: se acabó el tiempo de la nariz; los que no se la tocaron se llevan una letra. */
  | { type: "cerrar-nariz" }
  /** La mesa: después del resumen, se reparte de nuevo. */
  | { type: "seguir" };

export type FaseChancho = "pasando" | "nariz" | "fin-ronda" | "fin";

export interface ChanchoState {
  config: ChanchoConfig;
  players: PlayerId[];
  rng: RngState;
  /** Siguen en juego (los que completaron CHANCHO quedan afuera). */
  vivos: boolean[];
  /** Letras de CHANCHO de cada uno (7 = afuera). */
  letras: number[];
  /** Cartas de cada uno (índices de FIGURAS); vacío si está afuera. */
  manos: number[][];
  fase: FaseChancho;
  /** La carta elegida para pasar en esta vuelta (índice en la mano). */
  elegidas: (number | null)[];
  /** Vueltas de pase en esta ronda. */
  vueltas: number;
  /** El orden en que se tocaron la nariz (el primero tenía 4 iguales). */
  nariz: Seat[];
  /** Quiénes se llevaron letra en la última ronda. */
  perdieron: Seat[];
  ronda: number;
  ganador: Seat | null;
}

export interface ChanchoView {
  config: ChanchoConfig;
  seat: Seat;
  mano: number[];
  vivos: boolean[];
  letras: number[];
  fase: FaseChancho;
  /** Quiénes ya eligieron carta (no cuál). */
  eligieron: boolean[];
  miEleccion: number | null;
  cartas: number[];
  vueltas: number;
  nariz: Seat[];
  perdieron: Seat[];
  ronda: number;
  ganador: Seat | null;
  /** Al terminar la ronda se muestran las manos (para ver quién tenía qué). */
  manosFinales: number[][] | null;
}

export type ChanchoEvent =
  | { type: "reparto"; ronda: number }
  | { type: "pase"; vuelta: number }
  | { type: "nariz"; seat: Seat; primero: boolean }
  | { type: "letra"; seats: Seat[]; letras: number[] }
  | { type: "afuera"; seat: Seat }
  | { type: "fin-partida"; ganador: Seat };
