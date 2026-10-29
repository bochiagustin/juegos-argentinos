import type { CardId, PlayerId, RngState, SuitedCard } from "../core/index.ts";

export type Seat = number;

export interface EscobaConfig {
  /** 2 a 4. */
  players: 2 | 3 | 4;
  /** Solo con 4: parejas enfrentadas (asientos pares contra impares). */
  parejas: boolean;
  /** Puntos para ganar la partida. */
  target: 15 | 21 | 31;
  /** Si podés sumar 15, ¿estás obligado a levantar? */
  levantarObligatorio: boolean;
}

export const DEFAULT_ESCOBA_CONFIG: EscobaConfig = { players: 2, parejas: false, target: 15, levantarObligatorio: false };

export interface EscobaAction {
  type: "tirar";
  card: CardId;
  /** Cartas de la mesa que levanta (vacío = la deja en la mesa). */
  levanta: CardId[];
}

/** Cómo le fue a cada bando en la ronda (por categoría) y cuántos puntos sumó. */
export interface BandoRonda {
  seats: Seat[];
  escobas: number;
  cartas: number;
  oros: number;
  sieteDeOro: boolean;
  sietes: number;
  puntos: number;
}

export interface EscobaRoundSummary {
  numero: number;
  bandos: BandoRonda[];
  /** Quién cobró cada categoría (null = empate, nadie). */
  categorias: { cartas: number | null; oros: number | null; sieteDeOro: number | null; sietes: number | null };
  /** Índice del bando que se llevó lo que quedó en la mesa (null = nadie). */
  sobrantes: { bando: number | null; cartas: number };
  score: number[];
}

export interface EscobaState {
  config: EscobaConfig;
  players: PlayerId[];
  rng: RngState;
  /** Puntos por bando. */
  score: number[];
  hands: SuitedCard[][];
  mesa: SuitedCard[];
  /** Cartas levantadas por cada jugador en la ronda. */
  pilas: SuitedCard[][];
  /** Escobas de cada jugador en la ronda. */
  escobas: number[];
  mazo: SuitedCard[];
  /** El que reparte (el siguiente es el primero en jugar). */
  dealer: Seat;
  turn: Seat;
  ronda: number;
  ultimoQueLevanto: Seat | null;
  history: EscobaRoundSummary[];
  winner: number | null;
}

export type EscobaEvent =
  | { type: "escoba-de-mano"; seat: Seat; escobas: number; cartas: SuitedCard[] }
  | { type: "tirada"; seat: Seat; card: SuitedCard; levanta: SuitedCard[]; escoba: boolean }
  | { type: "reparto" }
  | { type: "fin-ronda"; summary: EscobaRoundSummary }
  | { type: "nueva-ronda"; numero: number; dealer: Seat }
  | { type: "fin-partida"; winner: number; score: number[] };

export interface EscobaView {
  config: EscobaConfig;
  seat: Seat;
  /** Índice de mi bando en `score`. */
  bando: number;
  players: { id: PlayerId; seat: Seat; cards: number; pila: number; escobas: number }[];
  hand: SuitedCard[];
  mesa: SuitedCard[];
  mazoCount: number;
  dealer: Seat;
  turn: Seat;
  ronda: number;
  score: number[];
  lastRound: EscobaRoundSummary | null;
  /** Resúmenes públicos de todas las rondas jugadas (para retomar y para los momentos del final). */
  history: EscobaRoundSummary[];
  winner: number | null;
}
