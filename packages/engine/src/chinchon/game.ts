import { clone, createDeck, createRng, deal, nextInt, shuffle, type ActionResult, type Card, type GameDefinition, type PlayerId } from "../core/index.ts";
import { bestArrangement, bestWithLayoff, isChinchon, meldRules, type MeldRules } from "./melds.ts";
import type { ChinchonAction, ChinchonConfig, ChinchonEvent, ChinchonRoundSummary, ChinchonState, ChinchonView, PlayerRoundResult, Seat } from "./types.ts";

export function rulesOf(config: ChinchonConfig): MeldRules {
  return meldRules(config.deckSize, config.unComodinPorCombinacion ? 1 : 2, config.comodinSuelto);
}

const seatOf = (s: ChinchonState, id: PlayerId) => s.players.indexOf(id);

function nextActive(s: ChinchonState, seat: Seat): Seat {
  const n = s.players.length;
  let x = (seat + 1) % n;
  while (s.out[x]) x = (x + 1) % n;
  return x;
}

/** Con 8 cartas en la mano: ¿cortar tirando esta carta deja lo suelto dentro del límite? */
export function canCutWith(hand: readonly Card[], cardId: string, config: ChinchonConfig): boolean {
  const rest = hand.filter((c) => c.id !== cardId);
  if (rest.length !== hand.length - 1) return false;
  return bestArrangement(rest, rulesOf(config)).looseSum <= config.corteMax;
}

function computeValidActions(s: ChinchonState, seat: Seat): ChinchonAction[] {
  if (seat < 0 || s.winner !== null || s.turn !== seat) return [];
  if (s.phase === "robar") {
    const out: ChinchonAction[] = [];
    if (s.mazo.length > 0 || s.pozo.length > 1) out.push({ type: "robar", de: "mazo" });
    if (s.pozo.length > 0) out.push({ type: "robar", de: "pozo" });
    return out;
  }
  const hand = s.hands[seat]!;
  const out: ChinchonAction[] = [];
  for (const c of hand) {
    if (c.id === s.tomadaDelPozo) continue;
    out.push({ type: "descartar", card: c.id });
  }
  for (const c of hand) if (canCutWith(hand, c.id, s.config)) out.push({ type: "cortar", card: c.id });
  return out;
}

interface Ctx {
  s: ChinchonState;
  ev: ChinchonEvent[];
}

function dealRound(s: ChinchonState, mano: Seat, number: number) {
  const n = s.players.length;
  const [deck, rng] = shuffle(createDeck({ size: s.config.deckSize, jokers: s.config.jokers }), s.rng);
  s.rng = rng;
  const active = Array.from({ length: n }, (_, i) => i).filter((i) => !s.out[i]);
  const order = active.slice(active.indexOf(mano)).concat(active.slice(0, active.indexOf(mano)));
  const { hands, rest } = deal(deck, { players: order.length, cardsEach: 7 });
  s.hands = Array.from({ length: n }, () => []);
  order.forEach((seat, i) => (s.hands[seat] = hands[i]!));
  s.pozo = [rest[0]!];
  s.mazo = rest.slice(1);
  s.mano = mano;
  s.turn = mano;
  s.phase = "robar";
  s.tomadaDelPozo = null;
  s.round = number;
}

function resolveCut(ctx: Ctx, seat: Seat, cutCard: Card) {
  const { s } = ctx;
  const rules = rulesOf(s.config);
  const n = s.players.length;
  const hand = s.hands[seat]!;
  const chinchon = isChinchon(hand, rules);
  const mine = bestArrangement(hand, rules);
  const menosDiez = mine.looseSum === 0;
  ctx.ev.push({ type: "corte", seat, menosDiez, chinchon });

  const results: PlayerRoundResult[] = [];
  for (let i = 0; i < n; i++) {
    if (s.out[i]) continue;
    if (i === seat) {
      results.push({ seat: i, hand: hand.slice(), melds: mine.melds, loose: mine.loose, laid: [], points: menosDiez ? -s.config.menosDiez : mine.looseSum });
    } else {
      const r = bestWithLayoff(s.hands[i]!, mine.melds, rules);
      results.push({ seat: i, hand: s.hands[i]!.slice(), melds: r.melds, loose: r.loose, laid: r.laid, points: r.looseSum });
    }
  }

  const eliminated: Seat[] = [];
  const reenganchados: Seat[] = [];
  if (!chinchon) {
    for (const r of results) s.scores[r.seat]! += r.points;
    for (const r of results) {
      if (s.scores[r.seat]! >= s.config.limite) {
        s.out[r.seat] = true;
        eliminated.push(r.seat);
      }
    }
    // Reenganche: el que quedó afuera vuelve una vez con el puntaje del que más tiene entre los que siguen.
    const alive = () => s.scores.map((_, i) => i).filter((i) => !s.out[i]);
    if (s.config.reenganche && alive().length >= 1) {
      const top = Math.max(...alive().map((i) => s.scores[i]!));
      for (const e of eliminated) {
        if (s.reenganches[e]! < 1) {
          s.reenganches[e]!++;
          s.out[e] = false;
          s.scores[e] = top;
          reenganchados.push(e);
        }
      }
    }
  }

  const summary: ChinchonRoundSummary = {
    number: s.round,
    cutter: seat,
    cutCard,
    menosDiez,
    chinchon,
    results,
    scores: s.scores.slice(),
    eliminated: eliminated.filter((e) => !reenganchados.includes(e)),
    reenganchados,
  };
  s.history.push(summary);
  ctx.ev.push({ type: "fin-ronda", summary });
  for (const e of summary.eliminated) ctx.ev.push({ type: "eliminado", seat: e });
  for (const r of reenganchados) ctx.ev.push({ type: "reenganche", seat: r, score: s.scores[r]! });

  const alive = s.scores.map((_, i) => i).filter((i) => !s.out[i]);
  if (chinchon) s.winner = seat;
  else if (alive.length === 1) s.winner = alive[0]!;
  else if (alive.length === 0) {
    // Quedaron todos afuera en la misma mano: gana el que menos tiene.
    s.winner = s.scores.reduce((best, v, i) => (v < s.scores[best]! ? i : best), 0);
  }
  if (s.winner !== null) {
    s.hands = s.hands.map(() => []);
    ctx.ev.push({ type: "fin-partida", winner: s.winner });
    return;
  }
  let mano = nextActive(s, s.mano);
  if (s.out[mano]) mano = alive[0]!;
  dealRound(s, mano, s.round + 1);
  ctx.ev.push({ type: "nueva-ronda", number: s.round, mano: s.mano });
}

function apply(ctx: Ctx, seat: Seat, a: ChinchonAction) {
  const { s } = ctx;
  if (a.type === "robar") {
    if (a.de === "mazo") {
      if (s.mazo.length === 0) {
        // Se acabó el mazo: se mezcla el pozo (menos la de arriba) y se sigue.
        const top = s.pozo.pop()!;
        const [mixed, rng] = shuffle(s.pozo, s.rng);
        s.rng = rng;
        s.mazo = mixed;
        s.pozo = [top];
        ctx.ev.push({ type: "rebarajar", cards: mixed.length });
      }
      const c = s.mazo.shift()!;
      s.hands[seat]!.push(c);
      s.tomadaDelPozo = null;
      ctx.ev.push({ type: "robo", seat, de: "mazo", card: null });
    } else {
      const c = s.pozo.pop()!;
      s.hands[seat]!.push(c);
      s.tomadaDelPozo = c.id;
      ctx.ev.push({ type: "robo", seat, de: "pozo", card: c });
    }
    s.phase = "descartar";
    return;
  }
  const hand = s.hands[seat]!;
  const idx = hand.findIndex((c) => c.id === a.card);
  const [card] = hand.splice(idx, 1);
  if (a.type === "descartar") {
    s.pozo.push(card!);
    ctx.ev.push({ type: "descarte", seat, card: card! });
    s.turn = nextActive(s, seat);
    s.phase = "robar";
    s.tomadaDelPozo = null;
    return;
  }
  resolveCut(ctx, seat, card!);
}

export const chinchon: GameDefinition<ChinchonConfig, ChinchonState, ChinchonAction, ChinchonView, ChinchonEvent> = {
  id: "chinchon",

  initialState(config, players, seed) {
    if (players.length < 2 || players.length > 6) throw new Error("El chinchón se juega de 2 a 6");
    if (players.length !== config.players) throw new Error("La cantidad de jugadores no coincide con la configuración");
    let rng = createRng(seed);
    const [mano, r2] = nextInt(rng, players.length);
    rng = r2;
    const n = players.length;
    const s: ChinchonState = {
      config: { ...config },
      players: [...players],
      rng,
      scores: Array(n).fill(0),
      out: Array(n).fill(false),
      reenganches: Array(n).fill(0),
      hands: [],
      mazo: [],
      pozo: [],
      mano,
      turn: mano,
      phase: "robar",
      tomadaDelPozo: null,
      round: 1,
      history: [],
      winner: null,
    };
    dealRound(s, mano, 1);
    return s;
  },

  getValidActions(state, playerId) {
    return computeValidActions(state, seatOf(state, playerId));
  },

  applyAction(state, playerId, action): ActionResult<ChinchonState, ChinchonEvent> {
    const seat = seatOf(state, playerId);
    if (seat < 0) return { ok: false, error: "No estás en esta mesa" };
    if (!computeValidActions(state, seat).some((v) => JSON.stringify(v) === JSON.stringify(action))) return { ok: false, error: "Esa jugada no vale ahora" };
    const ctx: Ctx = { s: clone(state), ev: [] };
    apply(ctx, seat, action);
    return { ok: true, state: ctx.s, events: ctx.ev };
  },

  getPlayerView(s, playerId): ChinchonView {
    const seat = seatOf(s, playerId);
    return clone({
      config: s.config,
      seat,
      players: s.players.map((id, i) => ({ id, seat: i, cards: s.hands[i]!.length, score: s.scores[i]!, out: s.out[i]! })),
      hand: seat >= 0 ? s.hands[seat]! : [],
      pozoTop: s.pozo[s.pozo.length - 1] ?? null,
      pozoCount: s.pozo.length,
      mazoCount: s.mazo.length,
      mano: s.mano,
      turn: s.turn,
      phase: s.phase,
      tomadaDelPozo: s.tomadaDelPozo,
      round: s.round,
      lastRound: s.history[s.history.length - 1] ?? null,
      winner: s.winner,
    });
  },

  isGameOver(s) {
    return s.winner !== null;
  },
};
