import type { Card, CardId, PlayerId, RngState } from "../core/index.ts";
import type { Meld } from "./melds.ts";

export type Seat = number;

export interface ChinchonConfig {
  /** 2 a 6. */
  players: number;
  deckSize: 40 | 48;
  jokers: 0 | 2;
  /** Se puede cortar si lo suelto suma esto o menos. */
  corteMax: 5 | 7;
  /** Lo que suma un comodín suelto. */
  comodinSuelto: 50 | 25;
  /** true = no puede haber dos comodines en la misma combinación. */
  unComodinPorCombinacion: boolean;
  /** Puntos para quedar eliminado. */
  limite: number;
  /** Cortar con todo ligado resta esto. */
  menosDiez: number;
  /** El eliminado puede volver (una vez) con el puntaje del que más tiene. */
  reenganche: boolean;
}

export const DEFAULT_CHINCHON_CONFIG: ChinchonConfig = {
  players: 2,
  deckSize: 48,
  jokers: 2,
  corteMax: 5,
  comodinSuelto: 50,
  unComodinPorCombinacion: true,
  limite: 100,
  menosDiez: 10,
  reenganche: false,
};

export interface PlayerRoundResult {
  seat: Seat;
  hand: Card[];
  melds: Meld[];
  loose: Card[];
  laid: Card[];
  points: number;
}

export interface ChinchonRoundSummary {
  number: number;
  cutter: Seat;
  /** La carta con la que cortó (boca abajo). */
  cutCard: Card;
  menosDiez: boolean;
  chinchon: boolean;
  results: PlayerRoundResult[];
  scores: number[];
  eliminated: Seat[];
  reenganchados: Seat[];
}

export interface ChinchonState {
  config: ChinchonConfig;
  players: PlayerId[];
  rng: RngState;
  scores: number[];
  out: boolean[];
  reenganches: number[];
  hands: Card[][];
  mazo: Card[];
  /** El tope del pozo es el último. */
  pozo: Card[];
  mano: Seat;
  turn: Seat;
  phase: "robar" | "descartar";
  /** Carta que se acaba de levantar del pozo (no se puede volver a tirar en el mismo turno). */
  tomadaDelPozo: CardId | null;
  round: number;
  history: ChinchonRoundSummary[];
  winner: Seat | null;
}

export type ChinchonAction =
  | { type: "robar"; de: "mazo" | "pozo" }
  | { type: "descartar"; card: CardId }
  | { type: "cortar"; card: CardId };

export type ChinchonEvent =
  | { type: "robo"; seat: Seat; de: "mazo" | "pozo"; card: Card | null }
  | { type: "descarte"; seat: Seat; card: Card }
  | { type: "rebarajar"; cards: number }
  | { type: "corte"; seat: Seat; menosDiez: boolean; chinchon: boolean }
  | { type: "fin-ronda"; summary: ChinchonRoundSummary }
  | { type: "eliminado"; seat: Seat }
  | { type: "reenganche"; seat: Seat; score: number }
  | { type: "nueva-ronda"; number: number; mano: Seat }
  | { type: "fin-partida"; winner: Seat };

export interface ChinchonView {
  config: ChinchonConfig;
  seat: Seat;
  players: { id: PlayerId; seat: Seat; cards: number; score: number; out: boolean }[];
  hand: Card[];
  pozoTop: Card | null;
  pozoCount: number;
  mazoCount: number;
  mano: Seat;
  turn: Seat;
  phase: "robar" | "descartar";
  tomadaDelPozo: CardId | null;
  round: number;
  lastRound: ChinchonRoundSummary | null;
  /** Resúmenes públicos de todas las rondas jugadas (para retomar y para los momentos del final). */
  history: ChinchonRoundSummary[];
  winner: Seat | null;
}
