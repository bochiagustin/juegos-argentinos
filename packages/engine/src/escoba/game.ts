import { clone, createDeck, createRng, deal, nextInt, shuffle, type ActionResult, type GameDefinition, type PlayerId, type SuitedCard } from "../core/index.ts";
import type { BandoRonda, EscobaAction, EscobaConfig, EscobaEvent, EscobaRoundSummary, EscobaState, EscobaView, Seat } from "./types.ts";

/** Valor para sumar 15: del 1 al 7 su número; sota 8, caballo 9, rey 10. */
export function valorEscoba(c: SuitedCard): number {
  return c.rank <= 7 ? c.rank : c.rank - 2;
}

const seatOf = (s: EscobaState, id: PlayerId) => s.players.indexOf(id);

/** Bandos: cada jugador, o las dos parejas (asientos pares e impares). */
export function bandoDe(config: EscobaConfig, seat: Seat): number {
  return config.parejas && config.players === 4 ? seat % 2 : seat;
}

export function cantidadBandos(config: EscobaConfig): number {
  return config.parejas && config.players === 4 ? 2 : config.players;
}

/** Todos los grupos de cartas de la mesa que, con una carta de valor `v`, suman exactamente 15. */
export function combinaciones(mesa: readonly SuitedCard[], v: number): SuitedCard[][] {
  const out: SuitedCard[][] = [];
  const objetivo = 15 - v;
  const sorted = [...mesa].sort((a, b) => valorEscoba(a) - valorEscoba(b));
  const rec = (i: number, suma: number, elegido: SuitedCard[]) => {
    if (suma === objetivo && elegido.length > 0) {
      out.push(elegido.slice());
      return;
    }
    for (let k = i; k < sorted.length; k++) {
      const c = sorted[k]!;
      if (suma + valorEscoba(c) > objetivo) break;
      elegido.push(c);
      rec(k + 1, suma + valorEscoba(c), elegido);
      elegido.pop();
    }
  };
  rec(0, 0, []);
  return out;
}

function computeValidActions(s: EscobaState, seat: Seat): EscobaAction[] {
  if (seat < 0 || s.winner !== null || s.turn !== seat) return [];
  const out: EscobaAction[] = [];
  for (const card of s.hands[seat]!) {
    const combos = combinaciones(s.mesa, valorEscoba(card));
    for (const c of combos) out.push({ type: "tirar", card: card.id, levanta: c.map((x) => x.id).sort() });
    if (combos.length === 0 || !s.config.levantarObligatorio) out.push({ type: "tirar", card: card.id, levanta: [] });
  }
  return out;
}

interface Ctx {
  s: EscobaState;
  ev: EscobaEvent[];
}

/** ¿Se pueden partir estas cartas en grupos que sumen 15 cada uno? (para la escoba de mano con 30) */
function partibleEn15(cards: readonly SuitedCard[]): boolean {
  if (cards.length === 0) return true;
  const [first, ...rest] = cards;
  const v = valorEscoba(first!);
  for (const combo of combinaciones(rest, v)) {
    const ids = new Set(combo.map((c) => c.id));
    if (partibleEn15(rest.filter((c) => !ids.has(c.id)))) return true;
  }
  return false;
}

function nuevaRonda(ctx: Ctx, dealer: Seat, numero: number) {
  const { s } = ctx;
  const n = s.players.length;
  const [deck, rng] = shuffle(createDeck({ size: 40 }) as SuitedCard[], s.rng);
  s.rng = rng;
  s.mesa = deck.slice(0, 4);
  s.mazo = deck.slice(4);
  s.pilas = Array.from({ length: n }, () => []);
  s.escobas = Array(n).fill(0);
  s.dealer = dealer;
  s.ronda = numero;
  s.ultimoQueLevanto = null;
  // Escoba de mano: si la mesa suma 15 (o 30 en dos grupos de 15), se la lleva el que reparte.
  const suma = s.mesa.reduce((a, c) => a + valorEscoba(c), 0);
  if ((suma === 15 || suma === 30) && partibleEn15(s.mesa)) {
    const escobas = suma / 15;
    s.pilas[dealer]!.push(...s.mesa);
    s.escobas[dealer]! += escobas;
    s.ultimoQueLevanto = dealer;
    ctx.ev.push({ type: "escoba-de-mano", seat: dealer, escobas, cartas: s.mesa });
    s.mesa = [];
  }
  repartir(s);
}

function repartir(s: EscobaState) {
  const n = s.players.length;
  const first = (s.dealer + 1) % n;
  const { hands, rest } = deal(s.mazo, { players: n, cardsEach: 3, firstPlayer: first });
  s.hands = hands;
  s.mazo = rest;
  s.turn = first;
}

/** Cuenta la ronda: escobas, cartas, oros, 7 de oro y sietes. */
export function contarRonda(s: EscobaState): { bandos: BandoRonda[]; categorias: EscobaRoundSummary["categorias"] } {
  const nb = cantidadBandos(s.config);
  const bandos: BandoRonda[] = Array.from({ length: nb }, () => ({ seats: [], escobas: 0, cartas: 0, oros: 0, sieteDeOro: false, sietes: 0, puntos: 0 }));
  s.players.forEach((_, seat) => {
    const b = bandos[bandoDe(s.config, seat)]!;
    b.seats.push(seat);
    b.escobas += s.escobas[seat]!;
    for (const c of s.pilas[seat]!) {
      b.cartas++;
      if (c.suit === "oro") b.oros++;
      if (c.rank === 7) b.sietes++;
      if (c.rank === 7 && c.suit === "oro") b.sieteDeOro = true;
    }
  });
  const unico = (val: (b: BandoRonda) => number): number | null => {
    const max = Math.max(...bandos.map(val));
    const top = bandos.flatMap((b, i) => (val(b) === max ? [i] : []));
    return top.length === 1 && max > 0 ? top[0]! : null;
  };
  const categorias = {
    cartas: unico((b) => b.cartas),
    oros: unico((b) => b.oros),
    sieteDeOro: bandos.findIndex((b) => b.sieteDeOro) >= 0 ? bandos.findIndex((b) => b.sieteDeOro) : null,
    sietes: unico((b) => b.sietes),
  };
  for (const b of bandos) b.puntos = b.escobas;
  for (const k of ["cartas", "oros", "sieteDeOro", "sietes"] as const) {
    const i = categorias[k];
    if (i !== null) bandos[i]!.puntos++;
  }
  return { bandos, categorias };
}

function cerrarRonda(ctx: Ctx) {
  const { s } = ctx;
  const quien = s.ultimoQueLevanto;
  const sobrantes = s.mesa.length;
  if (quien !== null) s.pilas[quien]!.push(...s.mesa);
  s.mesa = [];
  const { bandos, categorias } = contarRonda(s);
  bandos.forEach((b, i) => (s.score[i]! += b.puntos));
  const summary: EscobaRoundSummary = {
    numero: s.ronda,
    bandos,
    categorias,
    sobrantes: { bando: quien === null ? null : bandoDe(s.config, quien), cartas: sobrantes },
    score: s.score.slice(),
  };
  s.history.push(summary);
  ctx.ev.push({ type: "fin-ronda", summary });
  // Gana el que llega a la meta; si dos llegan, el que más tiene; si empatan arriba, se juega otra ronda.
  const max = Math.max(...s.score);
  const top = s.score.flatMap((v, i) => (v === max ? [i] : []));
  if (max >= s.config.target && top.length === 1) {
    s.winner = top[0]!;
    s.hands = s.hands.map(() => []);
    ctx.ev.push({ type: "fin-partida", winner: s.winner, score: s.score.slice() });
    return;
  }
  const dealer = (s.dealer + 1) % s.players.length;
  nuevaRonda(ctx, dealer, s.ronda + 1);
  ctx.ev.push({ type: "nueva-ronda", numero: s.ronda, dealer });
}

function apply(ctx: Ctx, seat: Seat, a: EscobaAction) {
  const { s } = ctx;
  const hand = s.hands[seat]!;
  const [card] = hand.splice(
    hand.findIndex((c) => c.id === a.card),
    1,
  );
  const ids = new Set<string>(a.levanta);
  const levanta = s.mesa.filter((c) => ids.has(c.id));
  let escoba = false;
  if (levanta.length > 0) {
    s.mesa = s.mesa.filter((c) => !ids.has(c.id));
    s.pilas[seat]!.push(card!, ...levanta);
    s.ultimoQueLevanto = seat;
    if (s.mesa.length === 0) {
      escoba = true;
      s.escobas[seat]!++;
    }
  } else {
    s.mesa.push(card!);
  }
  ctx.ev.push({ type: "tirada", seat, card: card!, levanta, escoba });

  if (s.hands.every((h) => h.length === 0)) {
    if (s.mazo.length > 0) {
      repartir(s);
      ctx.ev.push({ type: "reparto" });
    } else {
      cerrarRonda(ctx);
    }
    return;
  }
  s.turn = (seat + 1) % s.players.length;
}

export const escoba: GameDefinition<EscobaConfig, EscobaState, EscobaAction, EscobaView, EscobaEvent> = {
  id: "escoba",

  initialState(config, players, seed) {
    if (players.length !== config.players) throw new Error("La cantidad de jugadores no coincide con la configuración");
    if (config.parejas && config.players !== 4) throw new Error("En parejas se juega de a 4");
    const [dealer, rng] = nextInt(createRng(seed), players.length);
    const s: EscobaState = {
      config: { ...config },
      players: [...players],
      rng,
      score: Array(cantidadBandos(config)).fill(0),
      hands: [],
      mesa: [],
      pilas: [],
      escobas: [],
      mazo: [],
      dealer,
      turn: 0,
      ronda: 1,
      ultimoQueLevanto: null,
      history: [],
      winner: null,
    };
    // La escoba de mano de la primera ronda no genera eventos (no hay a quién mostrárselos todavía), pero sí cuenta.
    nuevaRonda({ s, ev: [] }, dealer, 1);
    return s;
  },

  getValidActions(state, playerId) {
    return computeValidActions(state, seatOf(state, playerId));
  },

  applyAction(state, playerId, action): ActionResult<EscobaState, EscobaEvent> {
    const seat = seatOf(state, playerId);
    if (seat < 0) return { ok: false, error: "No estás en esta mesa" };
    const norm: EscobaAction = { ...action, levanta: [...action.levanta].sort() };
    if (!computeValidActions(state, seat).some((v) => JSON.stringify(v) === JSON.stringify(norm))) return { ok: false, error: "Esa jugada no vale ahora" };
    const ctx: Ctx = { s: clone(state), ev: [] };
    apply(ctx, seat, norm);
    return { ok: true, state: ctx.s, events: ctx.ev };
  },

  getPlayerView(s, playerId): EscobaView {
    const seat = seatOf(s, playerId);
    return clone({
      config: s.config,
      seat,
      bando: seat >= 0 ? bandoDe(s.config, seat) : 0,
      players: s.players.map((id, i) => ({ id, seat: i, cards: s.hands[i]!.length, pila: s.pilas[i]!.length, escobas: s.escobas[i]! })),
      hand: seat >= 0 ? s.hands[seat]! : [],
      mesa: s.mesa,
      mazoCount: s.mazo.length,
      dealer: s.dealer,
      turn: s.turn,
      ronda: s.ronda,
      score: s.score,
      lastRound: s.history[s.history.length - 1] ?? null,
      history: s.history,
      winner: s.winner,
    });
  },

  isGameOver(s) {
    return s.winner !== null;
  },
};
