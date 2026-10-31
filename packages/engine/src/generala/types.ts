import type { PlayerId, RngState } from "../core/index.ts";

export type Seat = number;

/** Las 11 casillas de la planilla. */
export const CATEGORIAS = ["1", "2", "3", "4", "5", "6", "escalera", "full", "poker", "generala", "doble"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  "1": "Al 1",
  "2": "Al 2",
  "3": "Al 3",
  "4": "Al 4",
  "5": "Al 5",
  "6": "Al 6",
  escalera: "Escalera",
  full: "Full",
  poker: "Póker",
  generala: "Generala",
  doble: "Doble generala",
};

export interface GeneralaConfig {
  /** 2 a 6. */
  players: 2 | 3 | 4 | 5 | 6;
}

export const DEFAULT_GENERALA_CONFIG: GeneralaConfig = { players: 2 };

/** null = casilla libre; 0 = tachada. */
export type Planilla = Record<Categoria, number | null>;

export type GeneralaAction =
  /** Tirar: en el primer tiro van los 5; después, los que no se guardan (`guardar[i]` = el dado i queda). */
  | { type: "tirar"; guardar: boolean[] }
  /** Anotar los dados en una casilla libre (si no suma nada, es tacharla). */
  | { type: "anotar"; categoria: Categoria };

export interface GeneralaState {
  config: GeneralaConfig;
  players: PlayerId[];
  rng: RngState;
  turno: Seat;
  /** Los 5 dados (1–6); antes del primer tiro del turno, los del turno anterior (o ceros al empezar). */
  dados: number[];
  /** Tiros hechos en este turno (0 a 3). */
  tiro: number;
  planillas: Planilla[];
  /** Asientos ganadores (empate = varios); null mientras se juega. */
  ganadores: Seat[] | null;
  /** El que ganó con generala servida, si fue así. */
  servida: Seat | null;
}

/** Todo es público en la generala (los dados se ven): la vista es el estado sin el azar. */
export type GeneralaView = Omit<GeneralaState, "rng"> & { seat: Seat };

export type GeneralaEvent =
  | { type: "tiro"; seat: Seat; dados: number[]; tiro: number; tirados: number[] }
  | { type: "anotar"; seat: Seat; categoria: Categoria; puntos: number; servida: boolean }
  | { type: "generala-servida"; seat: Seat }
  | { type: "fin-partida"; ganadores: Seat[]; totales: number[] };
