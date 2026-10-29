import type { CardId, PlayerId, RngState, SuitedCard } from "../core/index.ts";

export type Seat = number;
export type Team = 0 | 1;
/** Lo que vale la mano por el truco: 1 (sin cantar), 2 truco, 3 retruco, 4 vale cuatro. */
export type TrucoLevel = 1 | 2 | 3 | 4;
export type EnvidoCall = "envido" | "real-envido" | "falta-envido";
export type FlorStage = "flor" | "contraflor" | "contraflor-al-resto";

export interface TrucoConfig {
  /** 2 (1 contra 1), 4 (2 contra 2) o 6 (3 contra 3). Equipos alternados: asiento par = equipo 0. */
  players: 2 | 4 | 6;
  /** A cuántos puntos se juega. A 30 = "malas y buenas". */
  target: 15 | 30;
  /** Flor habilitada (regla opcional). */
  flor: boolean;
  /** Irse al mazo en primera baza sin envido cantado le da 1 punto más al rival. */
  mazoSumaEnvido: boolean;
  /** Falta envido: lo que le falta al que va ganando para cerrar la etapa (15 en malas) o para ganar el partido. */
  faltaEnvido: "por-etapa" | "partido";
}

export const DEFAULT_TRUCO_CONFIG: TrucoConfig = {
  players: 2,
  target: 30,
  flor: false,
  mazoSumaEnvido: true,
  faltaEnvido: "por-etapa",
};

export interface Play {
  seat: Seat;
  card: SuitedCard;
}

export interface Trick {
  /** Quién tira primero en esta baza. */
  leader: Seat;
  plays: Play[];
  /** Al completarse: equipo ganador o parda. */
  result?: Team | "parda";
  /** Asiento con la carta ganadora (si no fue parda). */
  winnerSeat?: Seat;
}

export interface TrucoPending {
  kind: "truco";
  /** Nivel que se está cantando: 2 truco, 3 retruco, 4 vale cuatro. */
  level: 2 | 3 | 4;
  caller: Seat;
  responder: Seat;
}

export interface EnvidoPending {
  kind: "envido";
  chain: EnvidoCall[];
  caller: Seat;
  responder: Seat;
  /** Si el envido se cantó contestando un truco ("el envido está primero"), después se vuelve a ese truco. */
  resumeTruco: TrucoPending | null;
}

export interface FlorPending {
  kind: "flor";
  stage: FlorStage;
  caller: Seat;
  responder: Seat;
  /** Quién cantó la flor original (para dar los puntos si el otro se achica). */
  florCaller: Seat;
  resumeTruco: TrucoPending | null;
}

export type Pending = TrucoPending | EnvidoPending | FlorPending;

/** Lo que dijo cada uno al cantar los tantos. `null` = "son buenas" (no lo muestra). */
export interface Declaration {
  seat: Seat;
  value: number | null;
}

export interface EnvidoSummary {
  chain: EnvidoCall[];
  querido: boolean;
  /** Equipo que se lleva los puntos. */
  team: Team;
  points: number;
  declarations: Declaration[];
}

export interface FlorSummary {
  stage: FlorStage | "achico";
  querido: boolean;
  team: Team;
  points: number;
  declarations: Declaration[];
}

export interface RoundSummary {
  number: number;
  mano: Seat;
  /** Puntos ganados en esta mano por cada equipo (truco + envido + flor). */
  points: [number, number];
  truco: { level: TrucoLevel; team: Team; points: number; how: "bazas" | "no-quiero" | "mazo" | "fin-partida" };
  envido: EnvidoSummary | null;
  flor: FlorSummary | null;
  mazo: Seat | null;
  tricks: Trick[];
  /** Cartas que se muestran al final por haber cantado tanto/flor. */
  reveal: { seat: Seat; cards: SuitedCard[] }[];
}

export interface Round {
  number: number;
  mano: Seat;
  hands: SuitedCard[][];
  dealt: SuitedCard[][];
  tricks: Trick[];
  /** A quién le toca tirar carta (si no hay nada pendiente). */
  turn: Seat;
  /** Lo que vale la mano por el truco ya aceptado. */
  trucoLevel: TrucoLevel;
  /** Equipo que puede subir el truco (el que aceptó el último). null = cualquiera (todavía no se cantó). */
  raiseRight: Team | null;
  pending: Pending | null;
  envido: EnvidoSummary | null;
  envidoDone: boolean;
  flor: FlorSummary | null;
  florDone: boolean;
  /** Puntos que lleva ganados cada equipo en esta mano. */
  points: [number, number];
}

export interface TrucoState {
  config: TrucoConfig;
  players: PlayerId[];
  rng: RngState;
  score: [number, number];
  round: Round;
  history: RoundSummary[];
  winner: Team | null;
}

export type TrucoAction =
  | { type: "jugar"; card: CardId }
  | { type: "truco" }
  | { type: "envido"; call: EnvidoCall }
  | { type: "flor" }
  | { type: "contraflor" }
  | { type: "contraflor-al-resto" }
  | { type: "con-flor-me-achico" }
  | { type: "quiero" }
  | { type: "no-quiero" }
  | { type: "mazo" };

export type Canto =
  | "truco"
  | "retruco"
  | "vale-cuatro"
  | EnvidoCall
  | FlorStage
  | "con-flor-me-achico"
  | "quiero"
  | "no-quiero"
  | "mazo";

export type TrucoEvent =
  | { type: "canto"; seat: Seat; canto: Canto }
  | { type: "jugada"; seat: Seat; card: SuitedCard }
  | { type: "baza"; index: number; result: Team | "parda"; winnerSeat: Seat | null }
  | { type: "tantos"; kind: "envido" | "flor"; declarations: Declaration[]; team: Team; points: number }
  | { type: "puntos"; team: Team; points: number; reason: "truco" | "envido" | "flor" | "mazo-envido" }
  | { type: "fin-ronda"; summary: RoundSummary }
  | { type: "nueva-ronda"; number: number; mano: Seat }
  | { type: "fin-partida"; winner: Team; score: [number, number] };

export interface TrucoPlayerInfo {
  id: PlayerId;
  seat: Seat;
  team: Team;
  cardsLeft: number;
}

/** Lo que ve un jugador: su mano, lo jugado en la mesa, cantos y puntos. Nunca las cartas de los demás. */
export interface TrucoView {
  config: TrucoConfig;
  seat: Seat;
  team: Team;
  players: TrucoPlayerInfo[];
  hand: SuitedCard[];
  /** Las 3 cartas que te tocaron (para calcular tu tanto aunque ya hayas tirado alguna). */
  dealt: SuitedCard[];
  roundNumber: number;
  mano: Seat;
  turn: Seat;
  /** Quién tiene que actuar ahora (tirar o contestar). null si terminó la partida. */
  actor: Seat | null;
  tricks: Trick[];
  trucoLevel: TrucoLevel;
  raiseRight: Team | null;
  pending: Pending | null;
  envido: EnvidoSummary | null;
  envidoDone: boolean;
  flor: FlorSummary | null;
  florDone: boolean;
  score: [number, number];
  lastRound: RoundSummary | null;
  /** Resúmenes públicos de todas las rondas jugadas (para retomar y para los momentos del final). */
  history: RoundSummary[];
  winner: Team | null;
}
