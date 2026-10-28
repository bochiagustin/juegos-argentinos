import { clone, createRng, deal, nextInt, shuffle, type ActionResult, type GameDefinition, type PlayerId } from "../core/index.ts";
import { florValue, hasFlor, tanto, trucoDeck, trucoRank } from "./cards.ts";
import type {
  Canto,
  Declaration,
  EnvidoCall,
  EnvidoPending,
  FlorPending,
  Pending,
  Round,
  RoundSummary,
  Seat,
  Team,
  Trick,
  TrucoAction,
  TrucoConfig,
  TrucoEvent,
  TrucoPending,
  TrucoState,
  TrucoView,
} from "./types.ts";

/** Equipos alternados en la mesa: los asientos pares son el equipo 0. */
export const teamOf = (seat: Seat): Team => (seat % 2) as Team;
export const otherTeam = (team: Team): Team => (team === 0 ? 1 : 0);

const nextSeat = (seat: Seat, n: number): Seat => (seat + 1) % n;

/** El rival que contesta un canto: el siguiente del otro equipo en el orden de juego. */
function responderFor(seat: Seat, n: number): Seat {
  let s = nextSeat(seat, n);
  while (teamOf(s) === teamOf(seat)) s = nextSeat(s, n);
  return s;
}

export function seatOf(state: TrucoState, playerId: PlayerId): Seat {
  return state.players.indexOf(playerId);
}

/** Quién tiene que actuar: el que contesta un canto pendiente o, si no hay, el que tira. */
export function actorSeat(state: TrucoState): Seat | null {
  if (state.winner !== null) return null;
  return state.round.pending ? state.round.pending.responder : state.round.turn;
}

const ENVIDO_VALUE: Record<Exclude<EnvidoCall, "falta-envido">, number> = { envido: 2, "real-envido": 3 };

/** Qué se puede cantar después de una cadena de envido. */
export function nextEnvidoCalls(chain: readonly EnvidoCall[]): EnvidoCall[] {
  const last = chain[chain.length - 1];
  if (last === undefined) return ["envido", "real-envido", "falta-envido"];
  if (last === "envido") {
    const envidos = chain.filter((c) => c === "envido").length;
    return envidos < 2 ? ["envido", "real-envido", "falta-envido"] : ["real-envido", "falta-envido"];
  }
  if (last === "real-envido") return ["falta-envido"];
  return [];
}

/** Lo que vale la falta envido (y la contraflor al resto) con el puntaje actual. */
export function faltaValue(score: readonly [number, number], config: TrucoConfig): number {
  const leader = Math.max(score[0], score[1]);
  let goal: number = config.target;
  if (config.faltaEnvido === "por-etapa" && config.target === 30 && leader < 15) goal = 15;
  return Math.max(1, goal - leader);
}

export function envidoQueridoPoints(chain: readonly EnvidoCall[], score: readonly [number, number], config: TrucoConfig): number {
  if (chain.includes("falta-envido")) return faltaValue(score, config);
  return chain.reduce((acc, c) => acc + ENVIDO_VALUE[c as Exclude<EnvidoCall, "falta-envido">], 0);
}

/** No querido: se cobra lo aceptado antes del último canto (mínimo 1). */
export function envidoNoQueridoPoints(chain: readonly EnvidoCall[]): number {
  if (chain.length <= 1) return 1;
  return chain.slice(0, -1).reduce((acc, c) => acc + ENVIDO_VALUE[c as Exclude<EnvidoCall, "falta-envido">], 0);
}

/**
 * Quién gana la mano según las bazas jugadas (o null si todavía no se sabe). Pardas:
 * - empata la 1ª → gana quien gane la 2ª; empatan 1ª y 2ª → define la 3ª; las tres empatadas → gana la mano;
 * - alguien ganó la 1ª y se empata la 2ª o la 3ª → gana el que ganó la 1ª.
 */
export function roundWinner(results: readonly (Team | "parda")[], manoTeam: Team): Team | null {
  const [a, b, c] = results;
  if (a === undefined || b === undefined) return null;
  if (a !== "parda" && (b === a || b === "parda")) return a;
  if (a === "parda" && b !== "parda") return b;
  if (c === undefined) return null;
  if (a === "parda") return c === "parda" ? manoTeam : c;
  return c === "parda" ? a : c;
}

function playedIn(trick: Trick | undefined, seat: Seat): boolean {
  return !!trick && trick.plays.some((p) => p.seat === seat);
}

function inFirstTrickBeforePlaying(round: Round, seat: Seat): boolean {
  return round.tricks.length === 1 && !playedIn(round.tricks[0], seat);
}

function canCallEnvido(state: TrucoState, seat: Seat): boolean {
  const r = state.round;
  if (r.envidoDone || r.florDone || r.trucoLevel !== 1 || !inFirstTrickBeforePlaying(r, seat)) return false;
  // Con flor habilitada, el que tiene flor la canta (no puede ir al envido).
  if (state.config.flor && hasFlor(r.dealt[seat]!)) return false;
  const p = r.pending;
  if (!p) return r.turn === seat;
  // "El envido está primero": se puede contestar un truco (no un retruco) con envido.
  return p.kind === "truco" && p.responder === seat && p.level === 2;
}

function canSingFlor(state: TrucoState, seat: Seat): boolean {
  const r = state.round;
  if (!state.config.flor || r.florDone || !hasFlor(r.dealt[seat]!) || !inFirstTrickBeforePlaying(r, seat)) return false;
  const p = r.pending;
  if (!p) return r.turn === seat;
  if (p.responder !== seat) return false;
  return p.kind === "envido" || (p.kind === "truco" && p.level === 2 && r.trucoLevel === 1);
}

function canRaiseTruco(state: TrucoState, seat: Seat): boolean {
  const r = state.round;
  const p = r.pending;
  if (p) return p.kind === "truco" && p.responder === seat && p.level < 4;
  return r.turn === seat && r.trucoLevel < 4 && (r.raiseRight === null || r.raiseRight === teamOf(seat));
}

function computeValidActions(state: TrucoState, seat: Seat): TrucoAction[] {
  if (seat < 0 || state.winner !== null || actorSeat(state) !== seat) return [];
  const r = state.round;
  const p = r.pending;
  const out: TrucoAction[] = [];
  const envidoCalls = (chain: readonly EnvidoCall[]) => {
    for (const call of nextEnvidoCalls(chain)) out.push({ type: "envido", call });
  };
  if (!p) {
    for (const c of r.hands[seat]!) out.push({ type: "jugar", card: c.id });
    if (canRaiseTruco(state, seat)) out.push({ type: "truco" });
    if (canCallEnvido(state, seat)) envidoCalls([]);
    if (canSingFlor(state, seat)) out.push({ type: "flor" });
    out.push({ type: "mazo" });
  } else if (p.kind === "truco") {
    out.push({ type: "quiero" }, { type: "no-quiero" });
    if (canRaiseTruco(state, seat)) out.push({ type: "truco" });
    if (canCallEnvido(state, seat)) envidoCalls([]);
    if (canSingFlor(state, seat)) out.push({ type: "flor" });
    out.push({ type: "mazo" });
  } else if (p.kind === "envido") {
    out.push({ type: "quiero" }, { type: "no-quiero" });
    envidoCalls(p.chain);
    if (canSingFlor(state, seat)) out.push({ type: "flor" });
  } else if (p.stage === "flor") {
    out.push({ type: "con-flor-me-achico" }, { type: "contraflor" }, { type: "contraflor-al-resto" });
  } else if (p.stage === "contraflor") {
    out.push({ type: "quiero" }, { type: "no-quiero" }, { type: "contraflor-al-resto" });
  } else {
    out.push({ type: "quiero" }, { type: "no-quiero" });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Mutaciones (siempre sobre una copia del estado)

interface Ctx {
  s: TrucoState;
  ev: TrucoEvent[];
}

function newRound(s: TrucoState, mano: Seat, number: number): Round {
  const n = s.config.players;
  const [deck, rng] = shuffle(trucoDeck(), s.rng);
  s.rng = rng;
  const { hands } = deal(deck, { players: n, cardsEach: 3, firstPlayer: mano });
  return {
    number,
    mano,
    hands,
    dealt: hands.map((h) => h.slice()),
    tricks: [{ leader: mano, plays: [] }],
    turn: mano,
    trucoLevel: 1,
    raiseRight: null,
    pending: null,
    envido: null,
    envidoDone: false,
    flor: null,
    florDone: false,
    points: [0, 0],
  };
}

function addPoints(ctx: Ctx, team: Team, points: number, reason: "truco" | "envido" | "flor" | "mazo-envido") {
  if (points <= 0) return;
  const { s } = ctx;
  s.score[team] += points;
  s.round.points[team] += points;
  ctx.ev.push({ type: "puntos", team, points, reason });
  if (s.winner === null && s.score[team] >= s.config.target) {
    s.winner = team;
    ctx.ev.push({ type: "fin-partida", winner: team, score: [s.score[0], s.score[1]] });
  }
}

function canto(ctx: Ctx, seat: Seat, c: Canto) {
  ctx.ev.push({ type: "canto", seat, canto: c });
}

/** Cantar los tantos en orden desde la mano: cada uno dice el suyo solo si supera al mejor; si no, "son buenas". */
function declare(round: Round, n: number, valueOf: (seat: Seat) => number | null): { declarations: Declaration[]; team: Team } {
  const declarations: Declaration[] = [];
  let best: { seat: Seat; value: number } | null = null;
  for (let i = 0; i < n; i++) {
    const seat = (round.mano + i) % n;
    const v = valueOf(seat);
    if (v === null) continue;
    if (!best || v > best.value) {
      declarations.push({ seat, value: v });
      best = { seat, value: v };
    } else if (teamOf(seat) !== teamOf(best.seat)) {
      declarations.push({ seat, value: null });
    }
  }
  if (!best) throw new Error("Nadie para declarar");
  return { declarations, team: teamOf(best.seat) };
}

function closeRound(ctx: Ctx, team: Team, trucoPoints: number, how: RoundSummary["truco"]["how"], mazo: Seat | null = null) {
  const { s } = ctx;
  const r = s.round;
  addPoints(ctx, team, trucoPoints, "truco");
  const revealSeats = new Set<Seat>();
  for (const d of [...(r.envido?.declarations ?? []), ...(r.flor?.declarations ?? [])]) if (d.value !== null) revealSeats.add(d.seat);
  const summary: RoundSummary = {
    number: r.number,
    mano: r.mano,
    points: [r.points[0], r.points[1]],
    truco: { level: r.trucoLevel, team, points: trucoPoints, how },
    envido: r.envido,
    flor: r.flor,
    mazo,
    tricks: r.tricks.filter((t) => t.plays.length > 0),
    reveal: [...revealSeats].sort((a, b) => a - b).map((seat) => ({ seat, cards: r.dealt[seat]! })),
  };
  s.history.push(summary);
  ctx.ev.push({ type: "fin-ronda", summary });
  if (s.winner === null) {
    const n = s.config.players;
    s.round = newRound(s, nextSeat(r.mano, n), r.number + 1);
    ctx.ev.push({ type: "nueva-ronda", number: s.round.number, mano: s.round.mano });
  }
}

/** Si alguien llegó a los puntos en el medio de la mano (por el envido o la flor), la partida se corta ahí. */
function checkEarlyWin(ctx: Ctx) {
  if (ctx.s.winner !== null) closeRound(ctx, ctx.s.winner, 0, "fin-partida");
}

function resolveEnvido(ctx: Ctx, p: EnvidoPending, querido: boolean) {
  const { s } = ctx;
  const r = s.round;
  r.envidoDone = true;
  r.pending = p.resumeTruco;
  if (querido) {
    const { declarations, team } = declare(r, s.config.players, (seat) => tanto(r.dealt[seat]!));
    const points = envidoQueridoPoints(p.chain, s.score, s.config);
    r.envido = { chain: p.chain, querido: true, team, points, declarations };
    ctx.ev.push({ type: "tantos", kind: "envido", declarations, team, points });
    addPoints(ctx, team, points, "envido");
  } else {
    const team = teamOf(p.caller);
    const points = envidoNoQueridoPoints(p.chain);
    r.envido = { chain: p.chain, querido: false, team, points, declarations: [] };
    addPoints(ctx, team, points, "envido");
  }
  checkEarlyWin(ctx);
}

function florSeats(r: Round, n: number, team?: Team): Seat[] {
  const out: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const seat = (r.mano + i) % n;
    if ((team === undefined || teamOf(seat) === team) && hasFlor(r.dealt[seat]!)) out.push(seat);
  }
  return out;
}

function singFlor(ctx: Ctx, seat: Seat) {
  const { s } = ctx;
  const r = s.round;
  const n = s.config.players;
  canto(ctx, seat, "flor");
  // La flor anula el envido; si se cantó contestando un truco, después se vuelve a ese truco.
  const p = r.pending;
  const resume: TrucoPending | null = p?.kind === "truco" ? p : p?.kind === "envido" ? p.resumeTruco : null;
  r.envidoDone = true;
  const team = teamOf(seat);
  const rivals = florSeats(r, n, otherTeam(team));
  if (rivals.length === 0) {
    const mine = florSeats(r, n, team);
    const points = 3 * mine.length;
    r.flor = { stage: "flor", querido: false, team, points, declarations: mine.map((x) => ({ seat: x, value: florValue(r.dealt[x]!) })) };
    r.florDone = true;
    r.pending = resume;
    addPoints(ctx, team, points, "flor");
    checkEarlyWin(ctx);
    return;
  }
  // El rival con flor más cercano en el orden de juego contesta.
  let responder = nextSeat(seat, n);
  while (!rivals.includes(responder)) responder = nextSeat(responder, n);
  r.pending = { kind: "flor", stage: "flor", caller: seat, responder, florCaller: seat, resumeTruco: resume };
}

function resolveFlor(ctx: Ctx, p: FlorPending, outcome: "achico" | "quiero" | "no-quiero") {
  const { s } = ctx;
  const r = s.round;
  r.florDone = true;
  r.pending = p.resumeTruco;
  if (outcome === "quiero") {
    const n = s.config.players;
    const { declarations, team } = declare(r, n, (seat) => (hasFlor(r.dealt[seat]!) ? florValue(r.dealt[seat]!) : null));
    const points = p.stage === "contraflor-al-resto" ? faltaValue(s.score, s.config) : 6;
    r.flor = { stage: p.stage, querido: true, team, points, declarations };
    ctx.ev.push({ type: "tantos", kind: "flor", declarations, team, points });
    addPoints(ctx, team, points, "flor");
  } else {
    // Achicarse o no querer la contraflor: el último que cantó cobra 4.
    const team = outcome === "achico" ? teamOf(p.florCaller) : teamOf(p.caller);
    r.flor = { stage: outcome === "achico" ? "achico" : p.stage, querido: false, team, points: 4, declarations: [] };
    addPoints(ctx, team, 4, "flor");
  }
  checkEarlyWin(ctx);
}

function trucoCanto(level: 2 | 3 | 4): Canto {
  return level === 2 ? "truco" : level === 3 ? "retruco" : "vale-cuatro";
}

function resolveTrick(ctx: Ctx, trick: Trick) {
  const { s } = ctx;
  const r = s.round;
  let bestRank = -1;
  for (const p of trick.plays) bestRank = Math.max(bestRank, trucoRank(p.card));
  const best = trick.plays.filter((p) => trucoRank(p.card) === bestRank);
  const teams = new Set(best.map((p) => teamOf(p.seat)));
  if (teams.size === 1) {
    trick.result = teamOf(best[0]!.seat);
    trick.winnerSeat = best[0]!.seat;
  } else {
    trick.result = "parda";
  }
  ctx.ev.push({ type: "baza", index: r.tricks.length - 1, result: trick.result, winnerSeat: trick.winnerSeat ?? null });
  const winner = roundWinner(
    r.tricks.map((t) => t.result!),
    teamOf(r.mano),
  );
  if (winner !== null) {
    closeRound(ctx, winner, r.trucoLevel, "bazas");
    return;
  }
  // Empieza la siguiente baza el que ganó; si fue parda, el que había empezado la empardada.
  const leader = trick.winnerSeat ?? trick.leader;
  r.tricks.push({ leader, plays: [] });
  r.turn = leader;
}

function apply(ctx: Ctx, seat: Seat, action: TrucoAction) {
  const { s } = ctx;
  const r = s.round;
  const n = s.config.players;
  const p: Pending | null = r.pending;

  switch (action.type) {
    case "jugar": {
      const hand = r.hands[seat]!;
      const idx = hand.findIndex((c) => c.id === action.card);
      const [card] = hand.splice(idx, 1);
      const trick = r.tricks[r.tricks.length - 1]!;
      trick.plays.push({ seat, card: card! });
      ctx.ev.push({ type: "jugada", seat, card: card! });
      if (trick.plays.length === n) resolveTrick(ctx, trick);
      else r.turn = nextSeat(seat, n);
      return;
    }
    case "truco": {
      if (p?.kind === "truco") {
        // Subir es aceptar lo anterior y redoblar.
        r.trucoLevel = p.level;
        const level = (p.level + 1) as 3 | 4;
        r.pending = { kind: "truco", level, caller: seat, responder: responderFor(seat, n) };
        canto(ctx, seat, trucoCanto(level));
      } else {
        const level = (r.trucoLevel + 1) as 2 | 3 | 4;
        r.pending = { kind: "truco", level, caller: seat, responder: responderFor(seat, n) };
        canto(ctx, seat, trucoCanto(level));
      }
      return;
    }
    case "envido": {
      canto(ctx, seat, action.call);
      if (p?.kind === "envido") {
        r.pending = { ...p, chain: [...p.chain, action.call], caller: seat, responder: responderFor(seat, n) };
      } else {
        r.pending = { kind: "envido", chain: [action.call], caller: seat, responder: responderFor(seat, n), resumeTruco: p?.kind === "truco" ? p : null };
      }
      return;
    }
    case "flor":
      singFlor(ctx, seat);
      return;
    case "con-flor-me-achico":
      canto(ctx, seat, "con-flor-me-achico");
      resolveFlor(ctx, p as FlorPending, "achico");
      return;
    case "contraflor":
    case "contraflor-al-resto": {
      const fp = p as FlorPending;
      canto(ctx, seat, action.type);
      r.pending = { ...fp, stage: action.type, caller: seat, responder: fp.caller };
      return;
    }
    case "quiero":
    case "no-quiero": {
      canto(ctx, seat, action.type);
      const querido = action.type === "quiero";
      if (p?.kind === "truco") {
        if (querido) {
          r.trucoLevel = p.level;
          r.raiseRight = teamOf(seat);
          r.pending = null;
        } else {
          closeRound(ctx, teamOf(p.caller), p.level - 1, "no-quiero");
        }
      } else if (p?.kind === "envido") {
        resolveEnvido(ctx, p, querido);
      } else if (p?.kind === "flor") {
        resolveFlor(ctx, p, querido ? "quiero" : "no-quiero");
      }
      return;
    }
    case "mazo": {
      canto(ctx, seat, "mazo");
      const rival = otherTeam(teamOf(seat));
      const points = p?.kind === "truco" ? p.level - 1 : r.trucoLevel;
      if (s.config.mazoSumaEnvido && r.tricks.length === 1 && !r.envidoDone && !r.florDone) addPoints(ctx, rival, 1, "mazo-envido");
      closeRound(ctx, rival, points, "mazo", seat);
      return;
    }
  }
}

function sameAction(a: TrucoAction, b: TrucoAction): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const truco: GameDefinition<TrucoConfig, TrucoState, TrucoAction, TrucoView, TrucoEvent> = {
  id: "truco",

  initialState(config, players, seed) {
    if (players.length !== config.players) throw new Error(`El truco de ${config.players} necesita ${config.players} jugadores`);
    if (new Set(players).size !== players.length) throw new Error("Jugadores repetidos");
    let rng = createRng(seed);
    const [mano, rng2] = nextInt(rng, config.players);
    rng = rng2;
    const s: TrucoState = { config: { ...config }, players: [...players], rng, score: [0, 0], round: undefined as unknown as Round, history: [], winner: null };
    s.round = newRound(s, mano, 1);
    return s;
  },

  getValidActions(state, playerId) {
    return computeValidActions(state, seatOf(state, playerId));
  },

  applyAction(state, playerId, action): ActionResult<TrucoState, TrucoEvent> {
    const seat = seatOf(state, playerId);
    if (seat < 0) return { ok: false, error: "No estás en esta mesa" };
    const valid = computeValidActions(state, seat);
    if (!valid.some((v) => sameAction(v, action))) return { ok: false, error: "Esa jugada no vale ahora" };
    const ctx: Ctx = { s: clone(state), ev: [] };
    apply(ctx, seat, action);
    return { ok: true, state: ctx.s, events: ctx.ev };
  },

  getPlayerView(state, playerId): TrucoView {
    const seat = seatOf(state, playerId);
    const r = state.round;
    const view: TrucoView = {
      config: state.config,
      seat,
      team: teamOf(Math.max(0, seat)),
      players: state.players.map((id, i) => ({ id, seat: i, team: teamOf(i), cardsLeft: r.hands[i]!.length })),
      hand: seat >= 0 ? r.hands[seat]! : [],
      dealt: seat >= 0 ? r.dealt[seat]! : [],
      roundNumber: r.number,
      mano: r.mano,
      turn: r.turn,
      actor: actorSeat(state),
      tricks: r.tricks,
      trucoLevel: r.trucoLevel,
      raiseRight: r.raiseRight,
      pending: r.pending,
      envido: r.envido,
      envidoDone: r.envidoDone,
      flor: r.flor,
      florDone: r.florDone,
      score: state.score,
      lastRound: state.history[state.history.length - 1] ?? null,
      winner: state.winner,
    };
    return clone(view);
  },

  isGameOver(state) {
    return state.winner !== null;
  },
};
