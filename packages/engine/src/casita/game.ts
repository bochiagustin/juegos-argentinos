import { clone, createDeck, createRng, deal, nextInt, shuffle, type ActionResult, type GameDefinition, type PlayerId, type SuitedCard } from "../core/index.ts";
import type { CasitaAction, CasitaConfig, CasitaEvent, CasitaResult, CasitaState, CasitaView, Jugada, Seat } from "./types.ts";

const seatOf = (s: CasitaState, id: PlayerId) => s.players.indexOf(id);

/** En parejas, el compañero no es rival (no se le roba). */
export function sonCompaneros(config: CasitaConfig, a: Seat, b: Seat): boolean {
  return config.parejas && config.players === 4 && a % 2 === b % 2;
}

/** Las jugadas posibles para una carta. */
export function jugadasPara(s: CasitaState, seat: Seat, card: SuitedCard): Jugada[] {
  const n = s.players.length;
  const mesa = s.mesa.some((c) => c.rank === card.rank);
  const robos: Jugada[] = [];
  for (let v = 0; v < n; v++) {
    if (v === seat || sonCompaneros(s.config, seat, v)) continue;
    const casita = s.casitas[v]!;
    const top = casita[casita.length - 1];
    if (top && top.rank === card.rank) robos.push({ tipo: "robar", de: v });
  }
  const mine = s.casitas[seat]!;
  const propia = s.config.agrandarPropia && mine.length > 0 && mine[mine.length - 1]!.rank === card.rank;
  let out: Jugada[] = [];
  if (mesa) out.push({ tipo: "mesa" });
  out.push(...robos);
  if (s.config.prioridad === "robar" && robos.length > 0) out = robos;
  if (s.config.prioridad === "mesa" && mesa) out = [{ tipo: "mesa" }];
  if (propia) out.push({ tipo: "propia" });
  if (out.length === 0) out.push({ tipo: "dejar" });
  return out;
}

function computeValidActions(s: CasitaState, seat: Seat): CasitaAction[] {
  if (seat < 0 || s.result !== null || s.turn !== seat) return [];
  return s.hands[seat]!.flatMap((card) => jugadasPara(s, seat, card).map((jugada) => ({ type: "tirar" as const, card: card.id, jugada })));
}

interface Ctx {
  s: CasitaState;
  ev: CasitaEvent[];
}

function repartir(s: CasitaState) {
  const n = s.players.length;
  const { hands, rest } = deal(s.mazo, { players: n, cardsEach: 3, firstPlayer: s.mano });
  s.hands = hands;
  s.mazo = rest;
  s.reparto++;
  s.turn = s.mano;
}

function resultado(s: CasitaState): CasitaResult {
  const cartas = s.casitas.map((c) => c.length);
  const n = s.players.length;
  const bandos = s.config.parejas && n === 4 ? [0, 1].map((t) => ({ seats: [t, t + 2], cartas: cartas[t]! + cartas[t + 2]! })) : cartas.map((c, i) => ({ seats: [i], cartas: c }));
  const max = Math.max(...bandos.map((b) => b.cartas));
  return { cartas, bandos, ganadores: bandos.filter((b) => b.cartas === max).flatMap((b) => b.seats) };
}

function apply(ctx: Ctx, seat: Seat, a: CasitaAction) {
  const { s } = ctx;
  const n = s.players.length;
  const hand = s.hands[seat]!;
  const [card] = hand.splice(
    hand.findIndex((c) => c.id === a.card),
    1,
  );
  const mine = s.casitas[seat]!;
  let levantadas: SuitedCard[] = [];
  const j = a.jugada;
  if (j.tipo === "mesa") {
    if (s.config.levantar === "todas") {
      levantadas = s.mesa.filter((c) => c.rank === card!.rank);
      s.mesa = s.mesa.filter((c) => c.rank !== card!.rank);
    } else {
      const i = s.mesa.findIndex((c) => c.rank === card!.rank);
      levantadas = s.mesa.splice(i, 1);
    }
    mine.push(...levantadas, card!);
    s.ultimoQueLevanto = seat;
  } else if (j.tipo === "robar") {
    levantadas = s.casitas[j.de]!;
    s.casitas[j.de] = [];
    mine.push(...levantadas, card!);
    s.robos[seat]!++;
    s.ultimoQueLevanto = seat;
  } else if (j.tipo === "propia") {
    mine.push(card!);
    s.ultimoQueLevanto = seat;
  } else {
    s.mesa.push(card!);
  }
  ctx.ev.push({ type: "tirada", seat, card: card!, jugada: j, levantadas });
  if (j.tipo === "robar") ctx.ev.push({ type: "robo", seat, victima: j.de, cartas: levantadas.length });

  if (s.hands.every((h) => h.length === 0)) {
    if (s.mazo.length > 0) {
      repartir(s);
      ctx.ev.push({ type: "reparto", numero: s.reparto });
      return;
    }
    // Fin: lo que queda en la mesa.
    const quien = s.config.sobrantes === "ultimo" ? s.ultimoQueLevanto : null;
    if (quien !== null && s.mesa.length > 0) s.casitas[quien]!.unshift(...s.mesa);
    ctx.ev.push({ type: "sobrantes", seat: quien, cartas: s.mesa.length });
    s.mesa = [];
    s.result = resultado(s);
    ctx.ev.push({ type: "fin-partida", result: s.result });
    return;
  }
  s.turn = (seat + 1) % n;
}

export const casita: GameDefinition<CasitaConfig, CasitaState, CasitaAction, CasitaView, CasitaEvent> = {
  id: "casita-robada",

  initialState(config, players, seed) {
    if (players.length !== config.players) throw new Error("La cantidad de jugadores no coincide con la configuración");
    if (config.parejas && config.players !== 4) throw new Error("En parejas se juega de a 4");
    let rng = createRng(seed);
    const [deck, r1] = shuffle(createDeck({ size: 40 }) as SuitedCard[], rng);
    const [mano, r2] = nextInt(r1, players.length);
    rng = r2;
    const n = players.length;
    const s: CasitaState = {
      config: { ...config },
      players: [...players],
      rng,
      hands: Array.from({ length: n }, () => []),
      mesa: deck.slice(0, 4),
      casitas: Array.from({ length: n }, () => []),
      mazo: deck.slice(4),
      mano,
      turn: mano,
      reparto: 0,
      ultimoQueLevanto: null,
      robos: Array(n).fill(0),
      result: null,
    };
    repartir(s);
    return s;
  },

  getValidActions(state, playerId) {
    return computeValidActions(state, seatOf(state, playerId));
  },

  applyAction(state, playerId, action): ActionResult<CasitaState, CasitaEvent> {
    const seat = seatOf(state, playerId);
    if (seat < 0) return { ok: false, error: "No estás en esta mesa" };
    if (!computeValidActions(state, seat).some((v) => JSON.stringify(v) === JSON.stringify(action))) return { ok: false, error: "Esa jugada no vale ahora" };
    const ctx: Ctx = { s: clone(state), ev: [] };
    apply(ctx, seat, action);
    return { ok: true, state: ctx.s, events: ctx.ev };
  },

  getPlayerView(s, playerId): CasitaView {
    const seat = seatOf(s, playerId);
    return clone({
      config: s.config,
      seat,
      players: s.players.map((id, i) => ({
        id,
        seat: i,
        cards: s.hands[i]!.length,
        casita: s.casitas[i]!.length,
        top: s.casitas[i]![s.casitas[i]!.length - 1] ?? null,
        robos: s.robos[i]!,
      })),
      hand: seat >= 0 ? s.hands[seat]! : [],
      mesa: s.mesa,
      mazoCount: s.mazo.length,
      mano: s.mano,
      turn: s.turn,
      reparto: s.reparto,
      ultimoQueLevanto: s.ultimoQueLevanto,
      result: s.result,
    });
  },

  isGameOver(s) {
    return s.result !== null;
  },
};
