import { nextFloat, pick, shuffle, type RngState, type SuitedCard } from "../core/index.ts";
import { florValue, hasFlor, tanto, trucoDeck, trucoRank } from "./cards.ts";
import { envidoQueridoPoints, nextEnvidoCalls, roundWinner, teamOf, truco } from "./game.ts";
import type { Seat, Team, Trick, TrucoAction, TrucoConfig, TrucoState, TrucoView } from "./types.ts";

/**
 * Bot de truco. Juega limpio: decide solo con su vista (sus cartas, lo jugado y lo cantado).
 * El nivel (1–10) regula cuánto se equivoca, cuánto miente y cuánto "piensa"
 * (en los niveles altos simula muchas veces las cartas que no ve: Monte Carlo con determinización).
 */

export interface BotProfile {
  skill: number;
  /** Probabilidad de hacer cualquier cosa (válida) en vez de lo que conviene. */
  errorRate: number;
  /** Probabilidad de mentir (cantar sin cartas). */
  bluff: number;
  /** 0–1: cuánto se anima a cantar y subir. */
  aggression: number;
  /** Tanto mínimo para cantar envido. */
  envidoMin: number;
  /** Simulaciones por decisión (0 = juega por reglas simples). */
  samples: number;
}

/** Personalidad del rival: cambia cuánto miente y cuánto se arriesga, no cuánto sabe. */
export type BotEstilo = "parejo" | "mentiroso" | "conservador" | "agresivo";

export function botProfile(skill: number, estilo: BotEstilo = "parejo"): BotProfile {
  const k = Math.min(10, Math.max(1, Math.round(skill)));
  const t = (k - 1) / 9;
  const p: BotProfile = {
    skill: k,
    errorRate: 0.32 * (1 - t) + 0.02,
    bluff: 0.03 + 0.12 * t,
    aggression: 0.25 + 0.45 * t,
    envidoMin: 28 - Math.round(2 * t),
    samples: k <= 2 ? 0 : 8 + k * 10,
  };
  if (estilo === "mentiroso") p.bluff = Math.min(0.4, p.bluff * 2.2);
  if (estilo === "conservador") {
    p.bluff *= 0.5;
    p.aggression = Math.max(0.1, p.aggression - 0.15);
    p.envidoMin += 1;
  }
  if (estilo === "agresivo") {
    p.aggression = Math.min(0.95, p.aggression + 0.2);
    p.envidoMin -= 1;
  }
  return p;
}

const rankOf = (c: SuitedCard) => trucoRank(c);
const lowest = (cards: readonly SuitedCard[]) => cards.reduce((a, b) => (rankOf(b) < rankOf(a) ? b : a));
const highest = (cards: readonly SuitedCard[]) => cards.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));

function bestInTrick(trick: Trick): { rank: number; team: Team | "parda" } | null {
  if (trick.plays.length === 0) return null;
  let rank = -1;
  for (const p of trick.plays) rank = Math.max(rank, rankOf(p.card));
  const teams = new Set(trick.plays.filter((p) => rankOf(p.card) === rank).map((p) => teamOf(p.seat)));
  return { rank, team: teams.size === 1 ? [...teams][0]! : "parda" };
}

/** Jugada "de manual" para una carta: matar con lo justo, no gastar si el compañero ya gana. */
function greedyCard(hand: readonly SuitedCard[], trick: Trick, seat: Seat): SuitedCard {
  const best = bestInTrick(trick);
  if (!best) return highest(hand);
  if (best.team === teamOf(seat)) return lowest(hand);
  const killers = hand.filter((c) => rankOf(c) > best.rank);
  if (killers.length > 0) return lowest(killers);
  const tie = hand.find((c) => rankOf(c) === best.rank);
  return tie ?? lowest(hand);
}

/** Juega lo que queda de la mano con la política "de manual" para todos. Devuelve el equipo ganador. */
function simulateRest(tricksIn: readonly Trick[], handsIn: readonly SuitedCard[][], turnIn: Seat, n: number, mano: Seat, first?: SuitedCard): Team {
  const tricks: Trick[] = tricksIn.map((t) => ({ ...t, plays: t.plays.slice() }));
  const hands = handsIn.map((h) => h.slice());
  let turn = turnIn;
  let forced = first;
  for (let guard = 0; guard < 40; guard++) {
    const trick = tricks[tricks.length - 1]!;
    const hand = hands[turn]!;
    const card = forced ?? greedyCard(hand, trick, turn);
    forced = undefined;
    hand.splice(hand.indexOf(card), 1);
    trick.plays.push({ seat: turn, card });
    if (trick.plays.length < n) {
      turn = (turn + 1) % n;
      continue;
    }
    const best = bestInTrick(trick)!;
    trick.result = best.team;
    if (best.team !== "parda") trick.winnerSeat = trick.plays.find((p) => rankOf(p.card) === best.rank)!.seat;
    const w = roundWinner(
      tricks.map((t) => t.result!),
      teamOf(mano),
    );
    if (w !== null) return w;
    const leader = trick.winnerSeat ?? trick.leader;
    tricks.push({ leader, plays: [] });
    turn = leader;
  }
  return teamOf(mano);
}

function unseenCards(view: TrucoView): SuitedCard[] {
  const known = new Set<string>(view.dealt.map((c) => c.id));
  for (const t of view.tricks) for (const p of t.plays) known.add(p.card.id);
  return trucoDeck().filter((c) => !known.has(c.id));
}

/**
 * Probabilidad de que mi equipo gane la mano (por bazas), estimada simulando repartos posibles
 * de las cartas que no veo. Con `first` fija mi próxima carta.
 */
function winProbability(view: TrucoView, rng: RngState, samples: number, first?: SuitedCard): [number, RngState] {
  const n = view.config.players;
  const unseen = unseenCards(view);
  let wins = 0;
  let s = rng;
  for (let i = 0; i < samples; i++) {
    const [deck, next] = shuffle(unseen, s);
    s = next;
    let k = 0;
    const hands = view.players.map((p) => (p.seat === view.seat ? view.hand.slice() : deck.slice(k, (k += p.cardsLeft))));
    if (simulateRest(view.tricks, hands, view.turn, n, view.mano, first) === view.team) wins++;
  }
  return [samples > 0 ? wins / samples : heuristicStrength(view), s];
}

/** Estimación rápida sin simular: fuerza de las cartas que me quedan + bazas ganadas. */
function heuristicStrength(view: TrucoView): number {
  const won = view.tricks.filter((t) => t.result === view.team).length;
  const lost = view.tricks.filter((t) => t.result !== undefined && t.result !== "parda" && t.result !== view.team).length;
  const avg = view.hand.length ? view.hand.reduce((a, c) => a + rankOf(c), 0) / view.hand.length : 0;
  const top = view.hand.length ? rankOf(highest(view.hand)) : 0;
  return Math.min(0.95, Math.max(0.05, 0.15 + avg / 25 + top / 40 + won * 0.25 - lost * 0.25));
}

const has = (valid: readonly TrucoAction[], type: TrucoAction["type"]) => valid.find((a) => a.type === type);

function envidoAction(valid: readonly TrucoAction[], call: "envido" | "real-envido" | "falta-envido"): TrucoAction | undefined {
  return valid.find((a) => a.type === "envido" && a.call === call);
}

export function chooseTrucoAction(view: TrucoView, valid: readonly TrucoAction[], rngIn: RngState, skill: number, estilo: BotEstilo = "parejo"): [TrucoAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  const prof = botProfile(skill, estilo);
  let rng = rngIn;
  const roll = () => {
    const [v, next] = nextFloat(rng);
    rng = next;
    return v;
  };

  // Errores de principiante: cualquier jugada válida (menos irse al mazo).
  if (roll() < prof.errorRate) {
    const options = valid.filter((a) => a.type !== "mazo");
    const [a, next] = pick(rng, options.length ? options : valid);
    return [a, next];
  }

  const flor = has(valid, "flor");
  if (flor) return [flor, rng];

  const myTanto = tanto(view.dealt);
  const manoTeam = teamOf(view.mano) === view.team;
  const p = view.pending;
  const prob = () => {
    const [v, next] = winProbability(view, rng, prof.samples);
    rng = next;
    return v;
  };

  // --- Contestar flor ---
  if (p?.kind === "flor") {
    const fv = hasFlor(view.dealt) ? florValue(view.dealt) : 0;
    if (p.stage === "flor") {
      if (fv >= 36 && roll() < prof.aggression) return [has(valid, "contraflor-al-resto")!, rng];
      if (fv >= 32) return [has(valid, "contraflor")!, rng];
      return [has(valid, "con-flor-me-achico")!, rng];
    }
    const need = p.stage === "contraflor" ? 32 : 34;
    if (p.stage === "contraflor" && fv >= 37 && has(valid, "contraflor-al-resto")) return [has(valid, "contraflor-al-resto")!, rng];
    return [fv >= need ? has(valid, "quiero")! : has(valid, "no-quiero")!, rng];
  }

  // --- Contestar envido ---
  if (p?.kind === "envido") {
    const atStake = envidoQueridoPoints(p.chain, view.score, view.config);
    let need = prof.envidoMin - 1 + (atStake >= 4 ? 2 : 0) + (p.chain.includes("falta-envido") ? 3 : 0) - (manoTeam ? 1 : 0);
    if (view.config.players > 2) need -= 1; // el compañero también tiene tanto
    const next = nextEnvidoCalls(p.chain);
    if (myTanto >= 31 && next.length && roll() < prof.aggression) {
      const call = myTanto >= 33 && next.includes("falta-envido") ? "falta-envido" : next.includes("real-envido") ? "real-envido" : next[0]!;
      const a = envidoAction(valid, call);
      if (a) return [a, rng];
    }
    return [myTanto >= need ? has(valid, "quiero")! : has(valid, "no-quiero")!, rng];
  }

  // --- Cantar envido (en mi turno o "el envido está primero" contestando el truco) ---
  if (envidoAction(valid, "envido")) {
    const threshold = prof.envidoMin - (manoTeam ? 1 : 0) - (view.config.players > 2 ? 1 : 0);
    if (myTanto >= threshold || roll() < prof.bluff * 0.6) {
      let call: "envido" | "real-envido" | "falta-envido" = "envido";
      if (myTanto >= 32 && roll() < prof.aggression) call = "real-envido";
      const behind = view.score[view.team] + 8 < view.score[view.team === 0 ? 1 : 0];
      if (myTanto >= 33 && behind) call = "falta-envido";
      return [envidoAction(valid, call)!, rng];
    }
  }

  // --- Contestar truco ---
  if (p?.kind === "truco") {
    const pr = prob();
    if (pr >= 0.8 && has(valid, "truco") && roll() < 0.5 + prof.aggression / 2) return [has(valid, "truco")!, rng];
    if (pr >= 0.5 - prof.aggression * 0.15) return [has(valid, "quiero")!, rng];
    if (has(valid, "truco") && roll() < prof.bluff * 0.5) return [has(valid, "truco")!, rng];
    return [has(valid, "no-quiero")!, rng];
  }

  // --- Mi turno: cantar truco o tirar ---
  const plays = valid.filter((a): a is Extract<TrucoAction, { type: "jugar" }> => a.type === "jugar");
  const trucoCall = has(valid, "truco");
  if (trucoCall) {
    const pr = prob();
    const threshold = 0.72 - prof.aggression * 0.12 + (view.trucoLevel - 1) * 0.06;
    const lateBluff = view.tricks.length >= 2 && roll() < prof.bluff;
    if (pr >= threshold || lateBluff) return [trucoCall, rng];
  }
  if (plays.length === 0) return [valid[0]!, rng];
  if (plays.length === 1) return [plays[0]!, rng];

  if (prof.samples === 0) {
    const trick = view.tricks[view.tricks.length - 1]!;
    const card = greedyCard(view.hand, trick, view.seat);
    return [plays.find((a) => a.card === card.id)!, rng];
  }
  let best = plays[0]!;
  let bestP = -1;
  const per = Math.max(6, Math.round(prof.samples / plays.length));
  for (const a of plays) {
    const card = view.hand.find((c) => c.id === a.card)!;
    const [pr, next] = winProbability(view, rng, per, card);
    rng = next;
    // A igual probabilidad, guardar las cartas altas.
    const score = pr - rankOf(card) / 1000;
    if (score > bestP) {
      bestP = score;
      best = a;
    }
  }
  return [best, rng];
}

/** Juega una partida entera entre bots (para tests y simulaciones). */
export function playBotGame(config: TrucoConfig, skills: readonly number[], seed: string, maxSteps = 5000): { state: TrucoState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = truco.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  while (state.winner === null && steps < maxSteps) {
    const seat = state.round.pending ? state.round.pending.responder : state.round.turn;
    const id = players[seat]!;
    const valid = truco.getValidActions(state, id);
    const [action, next] = chooseTrucoAction(truco.getPlayerView(state, id), valid, rng, skills[seat]!);
    rng = next;
    const r = truco.applyAction(state, id, action);
    if (!r.ok) throw new Error(`El bot hizo una jugada inválida: ${r.error}`);
    state = r.state;
    steps++;
  }
  return { state, steps };
}
