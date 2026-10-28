import { createDeck, type Rank, type SuitedCard } from "../core/index.ts";

/** Mazo de truco: 40 cartas, sin 8, 9 ni comodines. */
export function trucoDeck(): SuitedCard[] {
  return createDeck({ size: 40 }) as SuitedCard[];
}

/**
 * Jerarquía del truco: 14 es la más alta (ancho de espada), 1 la más baja (los 4).
 * Cartas con el mismo valor empatan (parda).
 */
export function trucoRank(c: SuitedCard): number {
  const { rank, suit } = c;
  if (rank === 1 && suit === "espada") return 14;
  if (rank === 1 && suit === "basto") return 13;
  if (rank === 7 && suit === "espada") return 12;
  if (rank === 7 && suit === "oro") return 11;
  const byRank: Partial<Record<Rank, number>> = { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
  const v = byRank[rank];
  if (v === undefined) throw new Error(`Carta que no va en el truco: ${c.id}`);
  return v;
}

/** Valor de una carta para el envido: las figuras valen 0. */
export function envidoValue(c: SuitedCard): number {
  return c.rank >= 10 ? 0 : c.rank;
}

/**
 * Tanto de envido de una mano (2 o 3 cartas). Dos del mismo palo: 20 + sus valores
 * (con tres del mismo palo se toman las dos más altas). Si no: la carta más alta. Máximo 33.
 */
export function tanto(cards: readonly SuitedCard[]): number {
  let best = 0;
  for (const c of cards) best = Math.max(best, envidoValue(c));
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i]!;
      const b = cards[j]!;
      if (a.suit === b.suit) best = Math.max(best, 20 + envidoValue(a) + envidoValue(b));
    }
  }
  return best;
}

/** Flor: las tres cartas del mismo palo. */
export function hasFlor(cards: readonly SuitedCard[]): boolean {
  return cards.length === 3 && cards.every((c) => c.suit === cards[0]!.suit);
}

/** Valor de la flor: 20 + los valores de las tres cartas. */
export function florValue(cards: readonly SuitedCard[]): number {
  return 20 + cards.reduce((acc, c) => acc + envidoValue(c), 0);
}
