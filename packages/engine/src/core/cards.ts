/**
 * Modelo de la baraja española.
 *
 * Una carta es un objeto plano y serializable (va a vivir en el storage del
 * Durable Object y viajar por WebSocket). Cada carta tiene un `id` estable y
 * único dentro de un mazo, que es lo que se usa en acciones y vistas.
 */

export const SUITS = ["espada", "basto", "oro", "copa"] as const;
export type Suit = (typeof SUITS)[number];

/** Rangos de la baraja de 48. La de 40 no tiene 8 ni 9. */
export const RANKS_48 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const RANKS_40 = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export type Rank = (typeof RANKS_48)[number];

export type SuitedCardId = `${Rank}-${Suit}`;
export type JokerId = `comodin-${number}`;
export type CardId = SuitedCardId | JokerId;

export interface SuitedCard {
  readonly kind: "suited";
  readonly id: SuitedCardId;
  readonly suit: Suit;
  readonly rank: Rank;
}

export interface JokerCard {
  readonly kind: "joker";
  readonly id: JokerId;
}

export type Card = SuitedCard | JokerCard;

export function card(rank: Rank, suit: Suit): SuitedCard {
  return { kind: "suited", id: `${rank}-${suit}`, suit, rank };
}

export function joker(n: number): JokerCard {
  return { kind: "joker", id: `comodin-${n}` };
}

export function isJoker(c: Card): c is JokerCard {
  return c.kind === "joker";
}

export function isSuit(value: string): value is Suit {
  return (SUITS as readonly string[]).includes(value);
}

export function isRank(value: number): value is Rank {
  return (RANKS_48 as readonly number[]).includes(value);
}

/** Reconstruye una carta a partir de su id. Lanza si el id es inválido. */
export function cardFromId(id: string): Card {
  const jokerMatch = /^comodin-(\d+)$/.exec(id);
  if (jokerMatch) return joker(Number(jokerMatch[1]));
  const m = /^(\d{1,2})-([a-z]+)$/.exec(id);
  if (m) {
    const rank = Number(m[1]);
    const suit = m[2] ?? "";
    if (isRank(rank) && isSuit(suit)) return card(rank, suit);
  }
  throw new Error(`Id de carta inválido: "${id}"`);
}

export const RANK_NAMES: Record<Rank, string> = {
  1: "As",
  2: "Dos",
  3: "Tres",
  4: "Cuatro",
  5: "Cinco",
  6: "Seis",
  7: "Siete",
  8: "Ocho",
  9: "Nueve",
  10: "Sota",
  11: "Caballo",
  12: "Rey",
};

export const SUIT_NAMES: Record<Suit, { singular: string; plural: string }> = {
  espada: { singular: "espada", plural: "espadas" },
  basto: { singular: "basto", plural: "bastos" },
  oro: { singular: "oro", plural: "oros" },
  copa: { singular: "copa", plural: "copas" },
};

/** Nombre legible en rioplatense: "1 de espada", "7 de oro", "comodín". */
export function cardName(c: Card): string {
  if (isJoker(c)) return "comodín";
  return `${c.rank} de ${SUIT_NAMES[c.suit].singular}`;
}

/** Nombres populares de cartas clave del truco. */
export function cardNickname(c: Card): string | undefined {
  if (isJoker(c)) return undefined;
  if (c.rank === 1 && c.suit === "espada") return "el ancho de espada";
  if (c.rank === 1 && c.suit === "basto") return "el ancho de basto";
  if (c.rank === 7 && c.suit === "espada") return "el siete de espada";
  if (c.rank === 7 && c.suit === "oro") return "el siete de oro";
  return undefined;
}
