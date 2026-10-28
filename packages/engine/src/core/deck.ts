import { card, joker, RANKS_40, RANKS_48, SUITS, type Card } from "./cards.ts";
import { nextInt, type RngState } from "./rng.ts";

export interface DeckOptions {
  /** 40 cartas (sin 8 ni 9) o 48. */
  readonly size: 40 | 48;
  /** Cantidad de comodines a agregar (0, 1 o 2 en la práctica). */
  readonly jokers?: number;
}

/** Mazo ordenado: por palo (espada, basto, oro, copa) y por número; comodines al final. */
export function createDeck({ size, jokers = 0 }: DeckOptions): Card[] {
  const ranks = size === 40 ? RANKS_40 : RANKS_48;
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of ranks) deck.push(card(rank, suit));
  for (let i = 1; i <= jokers; i++) deck.push(joker(i));
  return deck;
}

/** Fisher–Yates con el RNG con semilla. No muta la entrada. */
export function shuffle<T>(items: readonly T[], rng: RngState): [T[], RngState] {
  const out = items.slice();
  let s = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, next] = nextInt(s, i + 1);
    s = next;
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return [out, s];
}

export interface DealResult<T> {
  /** hands[i] = cartas del jugador i (en el orden de reparto). */
  readonly hands: T[][];
  /** Lo que queda del mazo (el tope es el índice 0). */
  readonly rest: T[];
}

export interface DealOptions {
  readonly players: number;
  readonly cardsEach: number;
  /** Índice del primer jugador que recibe carta (normalmente el que es mano). */
  readonly firstPlayer?: number;
  /**
   * "una-a-una": de a una carta por vuelta (como se reparte en la mesa).
   * "de-a-tandas": todas las cartas de un jugador seguidas.
   */
  readonly style?: "una-a-una" | "de-a-tandas";
}

/** Reparte desde el tope del mazo (índice 0). No muta la entrada. */
export function deal<T>(deck: readonly T[], opts: DealOptions): DealResult<T> {
  const { players, cardsEach, firstPlayer = 0, style = "una-a-una" } = opts;
  if (players < 1 || cardsEach < 0) throw new RangeError("Parámetros de reparto inválidos");
  if (players * cardsEach > deck.length) {
    throw new RangeError(`No alcanzan las cartas: ${players}×${cardsEach} > ${deck.length}`);
  }
  const hands: T[][] = Array.from({ length: players }, () => []);
  let k = 0;
  if (style === "una-a-una") {
    for (let round = 0; round < cardsEach; round++) {
      for (let p = 0; p < players; p++) hands[(firstPlayer + p) % players]!.push(deck[k++] as T);
    }
  } else {
    for (let p = 0; p < players; p++) {
      for (let c = 0; c < cardsEach; c++) hands[(firstPlayer + p) % players]!.push(deck[k++] as T);
    }
  }
  return { hands, rest: deck.slice(k) };
}
