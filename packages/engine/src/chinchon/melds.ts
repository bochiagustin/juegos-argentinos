import { RANKS_40, RANKS_48, SUITS, type Card, type Rank, type Suit, type SuitedCard } from "../core/index.ts";

/**
 * Combinaciones del chinchón: grupos (3 o 4 del mismo número) y escaleras (3 o más seguidas del mismo palo).
 * El comodín reemplaza cualquier carta. Las manos son chicas (7–8 cartas), así que se busca la mejor
 * combinación posible de forma exacta (programación dinámica sobre subconjuntos).
 */

export interface MeldRules {
  /** Orden de los números para las escaleras (con 40 cartas, el 7 y el 10 son seguidos). */
  seq: readonly Rank[];
  /** Comodines permitidos por combinación (1 = "no puede haber dos comodines juntos"). */
  maxJokersPerMeld: 1 | 2;
  /** Lo que suma un comodín suelto. */
  jokerValue: number;
}

export function meldRules(deckSize: 40 | 48, maxJokersPerMeld: 1 | 2, jokerValue: number): MeldRules {
  return { seq: deckSize === 40 ? RANKS_40 : RANKS_48, maxJokersPerMeld, jokerValue };
}

export interface Meld {
  kind: "grupo" | "escalera";
  /** En una escalera van ordenadas, con los comodines en el lugar que ocupan. */
  cards: Card[];
  /** Grupo: el número. */
  rank?: Rank;
  /** Escalera: el palo y la posición (en `seq`) de la primera carta. */
  suit?: Suit;
  start?: number;
}

export interface Arrangement {
  melds: Meld[];
  loose: Card[];
  looseSum: number;
}

export function cardPoints(c: Card, rules: MeldRules): number {
  return c.kind === "joker" ? rules.jokerValue : c.rank;
}

interface Candidate {
  mask: number;
  meld: Meld;
}

function subsets<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, size - 1).map((s) => [first as T, ...s]), ...subsets(rest, size)];
}

/** Todas las combinaciones que se pueden armar con cartas de la mano (como máscaras de índices). */
export function candidateMelds(hand: readonly Card[], rules: MeldRules): Candidate[] {
  const out: Candidate[] = [];
  const jokers = hand.flatMap((c, i) => (c.kind === "joker" ? [i] : []));
  const maxJ = Math.min(rules.maxJokersPerMeld, jokers.length);

  // Grupos
  const byRank = new Map<Rank, number[]>();
  hand.forEach((c, i) => {
    if (c.kind === "suited") byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), i]);
  });
  for (const [rank, idxs] of byRank) {
    for (let s = 1; s <= Math.min(4, idxs.length); s++) {
      for (const nat of subsets(idxs, s)) {
        for (let j = 0; j <= maxJ; j++) {
          if (s + j < 3 || s + j > 4) continue;
          for (const js of subsets(jokers, j)) {
            const all = [...nat, ...js];
            out.push({ mask: all.reduce((m, i) => m | (1 << i), 0), meld: { kind: "grupo", rank, cards: all.map((i) => hand[i]!) } });
          }
        }
      }
    }
  }

  // Escaleras
  const len = rules.seq.length;
  for (const suit of SUITS) {
    const at = new Map<number, number>(); // posición en seq → índice en la mano
    hand.forEach((c, i) => {
      if (c.kind === "suited" && c.suit === suit) {
        const p = rules.seq.indexOf(c.rank);
        if (p >= 0) at.set(p, i);
      }
    });
    if (at.size === 0) continue;
    for (let start = 0; start <= len - 3; start++) {
      for (let L = 3; start + L <= len; L++) {
        const positions = Array.from({ length: L }, (_, k) => start + k);
        const missing = positions.filter((p) => !at.has(p));
        if (missing.length > maxJ || missing.length === L) continue;
        for (const js of subsets(jokers, missing.length)) {
          let ji = 0;
          const idxs = positions.map((p) => (at.has(p) ? at.get(p)! : js[ji++]!));
          out.push({ mask: idxs.reduce((m, i) => m | (1 << i), 0), meld: { kind: "escalera", suit, start, cards: idxs.map((i) => hand[i]!) } });
        }
      }
    }
  }
  return out;
}

/** La mejor forma de combinar la mano: la que deja menos puntos sueltos. */
export function bestArrangement(hand: readonly Card[], rules: MeldRules): Arrangement {
  const n = hand.length;
  const cands = candidateMelds(hand, rules);
  const memo = new Map<number, { cost: number; pick: Candidate | null }>();
  const solve = (mask: number): number => {
    if (mask === 0) return 0;
    const hit = memo.get(mask);
    if (hit) return hit.cost;
    let i = 0;
    while (!(mask & (1 << i))) i++;
    const bit = 1 << i;
    let best = cardPoints(hand[i]!, rules) + solve(mask & ~bit);
    let pick: Candidate | null = null;
    for (const c of cands) {
      if (c.mask & bit && (c.mask & mask) === c.mask) {
        const cost = solve(mask & ~c.mask);
        if (cost < best) {
          best = cost;
          pick = c;
        }
      }
    }
    memo.set(mask, { cost: best, pick });
    return best;
  };
  const full = (1 << n) - 1;
  const looseSum = solve(full);
  const melds: Meld[] = [];
  const loose: Card[] = [];
  let mask = full;
  while (mask) {
    const { pick } = memo.get(mask)!;
    if (pick) {
      melds.push(pick.meld);
      mask &= ~pick.mask;
    } else {
      let i = 0;
      while (!(mask & (1 << i))) i++;
      loose.push(hand[i]!);
      mask &= ~(1 << i);
    }
  }
  return { melds, loose, looseSum };
}

/** Chinchón: escalera de 7 del mismo palo, sin comodines. */
export function isChinchon(hand: readonly Card[], rules: MeldRules): boolean {
  if (hand.length !== 7 || hand.some((c) => c.kind === "joker")) return false;
  const suited = hand as SuitedCard[];
  const suit = suited[0]!.suit;
  if (!suited.every((c) => c.suit === suit)) return false;
  const pos = suited.map((c) => rules.seq.indexOf(c.rank)).sort((a, b) => a - b);
  return pos.every((p, i) => i === 0 || p === pos[i - 1]! + 1);
}

// ---------------------------------------------------------------------------------------------
// Ligar: agregar cartas sueltas a las combinaciones del que cortó.

interface OpenMeld {
  kind: "grupo" | "escalera";
  rank?: Rank;
  suit?: Suit;
  lo: number;
  hi: number;
  size: number;
  jokers: number;
  cards: Card[];
}

function open(m: Meld): OpenMeld {
  const jokers = m.cards.filter((c) => c.kind === "joker").length;
  if (m.kind === "grupo") return { kind: "grupo", rank: m.rank!, lo: 0, hi: 0, size: m.cards.length, jokers, cards: m.cards.slice() };
  return { kind: "escalera", suit: m.suit!, lo: m.start!, hi: m.start! + m.cards.length - 1, size: m.cards.length, jokers, cards: m.cards.slice() };
}

function tryAttach(c: Card, m: OpenMeld, rules: MeldRules): boolean {
  const len = rules.seq.length;
  if (c.kind === "joker") {
    if (m.jokers >= rules.maxJokersPerMeld) return false;
    if (m.kind === "grupo") {
      if (m.size >= 4) return false;
      m.size++;
      m.jokers++;
      m.cards.push(c);
      return true;
    }
    if (m.hi + 1 < len) {
      m.hi++;
      m.cards.push(c);
    } else if (m.lo > 0) {
      m.lo--;
      m.cards.unshift(c);
    } else return false;
    m.size++;
    m.jokers++;
    return true;
  }
  if (m.kind === "grupo") {
    if (c.rank !== m.rank || m.size >= 4) return false;
    if (m.cards.some((x) => x.kind === "suited" && x.suit === c.suit)) return false;
    m.size++;
    m.cards.push(c);
    return true;
  }
  if (c.suit !== m.suit) return false;
  const p = rules.seq.indexOf(c.rank);
  if (p === m.hi + 1) {
    m.hi++;
    m.cards.push(c);
  } else if (p === m.lo - 1) {
    m.lo--;
    m.cards.unshift(c);
  } else return false;
  m.size++;
  return true;
}

/** ¿Se pueden ligar todas estas cartas a esas combinaciones? Devuelve las combinaciones resultantes o null. */
function layAll(cards: readonly Card[], melds: readonly Meld[], rules: MeldRules): OpenMeld[] | null {
  const ms = melds.map(open);
  // Primero las cartas comunes, al final los comodines (así no tapan una punta que necesitaba una carta).
  let rest = [...cards].sort((a, b) => (a.kind === "joker" ? 1 : 0) - (b.kind === "joker" ? 1 : 0));
  while (rest.length) {
    let progressed = false;
    for (let i = 0; i < rest.length && !progressed; i++) {
      for (const m of ms) {
        if (tryAttach(rest[i]!, m, rules)) {
          rest = [...rest.slice(0, i), ...rest.slice(i + 1)];
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) return null;
  }
  return ms;
}

export interface LaidArrangement extends Arrangement {
  /** Cartas que ligó a las combinaciones del que cortó. */
  laid: Card[];
}

/** Lo mejor que puede hacer alguien que no cortó: armar sus combinaciones y ligar sueltas a las del que cortó. */
export function bestWithLayoff(hand: readonly Card[], cutterMelds: readonly Meld[], rules: MeldRules): LaidArrangement {
  const n = hand.length;
  let best: LaidArrangement = { ...bestArrangement(hand, rules), laid: [] };
  if (cutterMelds.length === 0) return best;
  for (let mask = 1; mask < 1 << n; mask++) {
    const laid = hand.filter((_, i) => mask & (1 << i));
    const rest = hand.filter((_, i) => !(mask & (1 << i)));
    // Poda: si ni siquiera ligando todo bajaría, no vale la pena.
    if (layAll(laid, cutterMelds, rules) === null) continue;
    const arr = bestArrangement(rest, rules);
    if (arr.looseSum < best.looseSum || (arr.looseSum === best.looseSum && laid.length < best.laid.length)) best = { ...arr, laid };
  }
  return best;
}
