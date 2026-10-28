import type { CardId, PlayerId, RngState, SuitedCard } from "../core/index.ts";

export type Seat = number;

export interface CasitaConfig {
  /** 2 a 4. */
  players: 2 | 3 | 4;
  /** Solo con 4: parejas enfrentadas (asientos pares contra impares). */
  parejas: boolean;
  /** Si en la mesa hay varias del mismo número: levantar una o todas. */
  levantar: "una" | "todas";
  /** Si se puede levantar de la mesa y también robar una casita. */
  prioridad: "eleccion" | "robar" | "mesa";
  /** Tirar una carta igual a la de arriba de tu propia casita para agrandarla. */
  agrandarPropia: boolean;
  /** Lo que queda en la mesa al final: para el último que levantó, o de nadie. */
  sobrantes: "ultimo" | "nadie";
}

export const DEFAULT_CASITA_CONFIG: CasitaConfig = {
  players: 2,
  parejas: false,
  levantar: "una",
  prioridad: "eleccion",
  agrandarPropia: false,
  sobrantes: "ultimo",
};

export type Jugada = { tipo: "mesa" } | { tipo: "robar"; de: Seat } | { tipo: "propia" } | { tipo: "dejar" };

export interface CasitaAction {
  type: "tirar";
  card: CardId;
  jugada: Jugada;
}

export interface CasitaResult {
  /** Cartas en la casita de cada asiento. */
  cartas: number[];
  /** Puntaje por bando (cada asiento, o cada pareja si se juega en parejas). */
  bandos: { seats: Seat[]; cartas: number }[];
  /** Asientos ganadores (más de uno si hay empate). */
  ganadores: Seat[];
}

export interface CasitaState {
  config: CasitaConfig;
  players: PlayerId[];
  rng: RngState;
  hands: SuitedCard[][];
  mesa: SuitedCard[];
  /** Casita de cada uno; la carta de arriba es la última. */
  casitas: SuitedCard[][];
  mazo: SuitedCard[];
  mano: Seat;
  turn: Seat;
  reparto: number;
  ultimoQueLevanto: Seat | null;
  /** Cuántas veces robó cada uno (para estadísticas y logros). */
  robos: number[];
  result: CasitaResult | null;
}

export type CasitaEvent =
  | { type: "tirada"; seat: Seat; card: SuitedCard; jugada: Jugada; levantadas: SuitedCard[] }
  | { type: "robo"; seat: Seat; victima: Seat; cartas: number }
  | { type: "reparto"; numero: number }
  | { type: "sobrantes"; seat: Seat | null; cartas: number }
  | { type: "fin-partida"; result: CasitaResult };

export interface CasitaView {
  config: CasitaConfig;
  seat: Seat;
  players: { id: PlayerId; seat: Seat; cards: number; casita: number; top: SuitedCard | null; robos: number }[];
  hand: SuitedCard[];
  mesa: SuitedCard[];
  mazoCount: number;
  mano: Seat;
  turn: Seat;
  reparto: number;
  ultimoQueLevanto: Seat | null;
  result: CasitaResult | null;
}
