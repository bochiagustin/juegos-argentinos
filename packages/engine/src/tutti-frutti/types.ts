import type { RngState } from "../core/rng.ts";

export interface TuttiConfig {
  /** 2 a 10 jugadores. */
  players: number;
  /** Nombres de las categorías (las de fábrica más las propias). */
  categorias: string[];
  /** Letras que no salen en la ruleta. */
  excluidas: string[];
  /** Segundos de cuenta regresiva después del ¡BASTA! (los cuenta la mesa: el servidor o la app). */
  cuentaRegresiva: 3 | 4 | 5;
  /** Tiempo máximo por ronda, en segundos (también lo cuenta la mesa). */
  tiempoMaximo: number;
  fin: { tipo: "rondas"; rondas: number } | { tipo: "puntos"; puntos: number };
  /** Revisión con votación por mayoría para rechazar respuestas. Sin votación, valen las que pasan la validación automática. */
  votacion: boolean;
}

export type TuttiFase = "escribiendo" | "basta" | "revision" | "resultado" | "fin";

/** Cómo quedó una respuesta. */
export type EstadoRespuesta = "vacia" | "invalida" | "rechazada" | "valida";

export interface TuttiRoundResult {
  ronda: number;
  letra: string;
  /** Respuestas [jugador][categoría]. */
  respuestas: string[][];
  estados: EstadoRespuesta[][];
  /** Válida, pero la máquina no la conoce. */
  dudosas: boolean[][];
  puntos: number[][];
  /** Puntos de la ronda por jugador. */
  total: number[];
  /** Acumulado después de la ronda. */
  score: number[];
  bastaPor: number | null;
}

export interface TuttiState {
  config: TuttiConfig;
  players: string[];
  rng: RngState;
  ronda: number;
  letra: string;
  usadas: string[];
  fase: TuttiFase;
  /** [jugador][categoría]. Ocultas para los demás hasta el cierre. */
  respuestas: string[][];
  bastaPor: number | null;
  /** `${autor}-${categoria}` → asientos que votaron rechazarla. */
  rechazos: Record<string, number[]>;
  listos: boolean[];
  score: number[];
  history: TuttiRoundResult[];
  /** Asientos ganadores (más de uno si empatan al quedarse sin letras). */
  ganadores: number[] | null;
}

/** Asiento especial: "la mesa" (el servidor o la app) manda las acciones de tiempo. */
export const MESA = "mesa";

export type TuttiAction =
  | { type: "escribir"; categoria: number; texto: string }
  | { type: "basta" }
  | { type: "votar"; autor: number; categoria: number; rechazar: boolean }
  | { type: "listo" }
  /** De la mesa: se terminó el tiempo o la cuenta regresiva. */
  | { type: "cerrar" }
  /** De la mesa: pasar de la revisión o del resultado aunque falte alguien. */
  | { type: "seguir" };

export type TuttiEvent =
  | { type: "nueva-ronda"; ronda: number; letra: string }
  | { type: "basta"; seat: number }
  | { type: "cierre"; ronda: number }
  | { type: "fin-ronda"; result: TuttiRoundResult }
  | { type: "fin-partida"; ganadores: number[]; score: number[] };

export interface TuttiView {
  config: TuttiConfig;
  /** -1 si es la mesa. */
  seat: number;
  players: { seat: number; llenas: number; listo: boolean }[];
  ronda: number;
  letra: string;
  usadas: string[];
  fase: TuttiFase;
  misRespuestas: string[];
  bastaPor: number | null;
  /** En la revisión: todas las respuestas, cómo quedarían y los votos. */
  revision: { respuestas: string[][]; estados: EstadoRespuesta[][]; dudosas: boolean[][]; rechazos: Record<string, number[]> } | null;
  score: number[];
  history: TuttiRoundResult[];
  ganadores: number[] | null;
}
