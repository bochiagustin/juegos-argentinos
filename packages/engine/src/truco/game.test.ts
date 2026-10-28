import { describe, expect, it } from "vitest";
import { cardFromId, type SuitedCard } from "../core/index.ts";
import { florValue, hasFlor, tanto, trucoRank } from "./cards.ts";
import { envidoNoQueridoPoints, envidoQueridoPoints, faltaValue, roundWinner, truco } from "./game.ts";
import { DEFAULT_TRUCO_CONFIG, type TrucoAction, type TrucoConfig, type TrucoState } from "./types.ts";

const c = (id: string) => cardFromId(id) as SuitedCard;
const P = ["a", "b", "c", "d", "e", "f"];

/** Arma una mesa con manos fijas. hands[i] = cartas del asiento i. */
function setup(hands: string[][], opts: { mano?: number; score?: [number, number]; config?: Partial<TrucoConfig> } = {}): TrucoState {
  const config: TrucoConfig = { ...DEFAULT_TRUCO_CONFIG, players: hands.length as 2 | 4 | 6, ...opts.config };
  const s = truco.initialState(config, P.slice(0, hands.length), "test");
  const mano = opts.mano ?? 0;
  s.round.mano = mano;
  s.round.turn = mano;
  s.round.tricks = [{ leader: mano, plays: [] }];
  s.round.hands = hands.map((h) => h.map(c));
  s.round.dealt = hands.map((h) => h.map(c));
  if (opts.score) s.score = opts.score;
  return s;
}

function act(s: TrucoState, seat: number, action: TrucoAction) {
  const r = truco.applyAction(s, P[seat]!, action);
  if (!r.ok) throw new Error(`Asiento ${seat}: ${r.error} (${JSON.stringify(action)})`);
  return r;
}

/** Aplica una lista de [asiento, acción] y devuelve el estado final + todos los eventos. */
function run(s: TrucoState, steps: [number, TrucoAction | string][]) {
  let state = s;
  const events = [];
  for (const [seat, a] of steps) {
    const action: TrucoAction = typeof a === "string" ? { type: "jugar", card: a as SuitedCard["id"] } : a;
    const r = act(state, seat, action);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const Q: TrucoAction = { type: "quiero" };
const NQ: TrucoAction = { type: "no-quiero" };
const T: TrucoAction = { type: "truco" };
const E: TrucoAction = { type: "envido", call: "envido" };
const R: TrucoAction = { type: "envido", call: "real-envido" };
const F: TrucoAction = { type: "envido", call: "falta-envido" };
const MAZO: TrucoAction = { type: "mazo" };

describe("cartas del truco", () => {
  it("respeta la jerarquía", () => {
    const order = ["1-espada", "1-basto", "7-espada", "7-oro", "3-copa", "2-oro", "1-copa", "12-basto", "11-oro", "10-copa", "7-copa", "6-oro", "5-basto", "4-espada"];
    const ranks = order.map((id) => trucoRank(c(id)));
    expect([...ranks].sort((x, y) => y - x)).toEqual(ranks);
    expect(new Set(ranks).size).toBe(order.length);
  });

  it("empatan las del mismo escalón", () => {
    expect(trucoRank(c("1-copa"))).toBe(trucoRank(c("1-oro")));
    expect(trucoRank(c("7-copa"))).toBe(trucoRank(c("7-basto")));
    expect(trucoRank(c("3-espada"))).toBe(trucoRank(c("3-oro")));
  });

  it("calcula el tanto", () => {
    expect(tanto(["7-oro", "6-oro", "1-espada"].map(c))).toBe(33);
    expect(tanto(["12-copa", "11-copa", "5-basto"].map(c))).toBe(20);
    expect(tanto(["1-espada", "2-oro", "3-copa"].map(c))).toBe(3);
    expect(tanto(["10-espada", "11-oro", "12-copa"].map(c))).toBe(0);
    expect(tanto(["7-oro", "6-oro", "5-oro"].map(c))).toBe(33);
    expect(tanto(["4-basto", "12-basto", "7-copa"].map(c))).toBe(24);
  });

  it("detecta la flor", () => {
    expect(hasFlor(["7-oro", "6-oro", "5-oro"].map(c))).toBe(true);
    expect(florValue(["7-oro", "6-oro", "5-oro"].map(c))).toBe(38);
    expect(hasFlor(["7-oro", "6-oro", "5-copa"].map(c))).toBe(false);
  });
});

describe("pardas", () => {
  it("resuelve todas las combinaciones", () => {
    expect(roundWinner([0, 0], 1)).toBe(0);
    expect(roundWinner([0, 1], 1)).toBeNull();
    expect(roundWinner([0, 1, 1], 0)).toBe(1);
    expect(roundWinner(["parda", 1], 0)).toBe(1);
    expect(roundWinner([1, "parda"], 0)).toBe(1);
    expect(roundWinner([0, 1, "parda"], 1)).toBe(0);
    expect(roundWinner(["parda", "parda"], 0)).toBeNull();
    expect(roundWinner(["parda", "parda", 1], 0)).toBe(1);
    expect(roundWinner(["parda", "parda", "parda"], 1)).toBe(1);
  });

  it("en la mesa: primera parda, define la segunda", () => {
    const s = setup([
      ["3-oro", "4-oro", "5-oro"],
      ["3-copa", "1-espada", "6-copa"],
    ]);
    // Empardan con los 3; después de una parda empieza el que había empezado la empardada (asiento 0).
    const { state, events } = run(s, [
      [0, "3-oro"],
      [1, "3-copa"],
      [0, "4-oro"],
      [1, "1-espada"],
    ]);
    expect(events.filter((e) => e.type === "baza").map((e) => (e as { result: unknown }).result)).toEqual(["parda", 1]);
    expect(state.score).toEqual([0, 1]);
  });

  it("tres pardas: gana el equipo que es mano", () => {
    const s = setup(
      [
        ["3-oro", "2-oro", "4-oro"],
        ["3-copa", "2-copa", "4-copa"],
      ],
      { mano: 1 },
    );
    const { state } = run(s, [
      [1, "3-copa"],
      [0, "3-oro"],
      [1, "2-copa"],
      [0, "2-oro"],
      [1, "4-copa"],
      [0, "4-oro"],
    ]);
    expect(state.score).toEqual([0, 1]);
  });

  it("ganó la primera y se empata la segunda: gana el de la primera", () => {
    const s = setup([
      ["1-espada", "3-oro", "4-oro"],
      ["5-copa", "3-copa", "6-copa"],
    ]);
    const { state } = run(s, [
      [0, "1-espada"],
      [1, "5-copa"],
      [0, "3-oro"],
      [1, "3-copa"],
    ]);
    expect(state.score).toEqual([1, 0]);
  });

  it("en 2 contra 2 dos cartas iguales del mismo equipo no son parda", () => {
    const s = setup([
      ["3-oro", "4-oro", "5-oro"],
      ["4-copa", "4-basto", "5-copa"],
      ["3-espada", "6-oro", "6-espada"],
      ["5-basto", "6-basto", "7-copa"],
    ]);
    const { events, state } = run(s, [
      [0, "3-oro"],
      [1, "4-copa"],
      [2, "3-espada"],
      [3, "5-basto"],
    ]);
    const baza = events.find((e) => e.type === "baza") as { result: unknown; winnerSeat: number };
    expect(baza.result).toBe(0);
    expect(baza.winnerSeat).toBe(0);
    // Empieza la siguiente baza el que tiró primero la carta ganadora.
    expect(state.round.turn).toBe(0);
  });
});

describe("truco, retruco y vale cuatro", () => {
  const hands = [
    ["1-espada", "1-basto", "4-oro"],
    ["4-copa", "5-copa", "6-copa"],
  ];

  it("querido vale 2 y no querido 1", () => {
    const s = setup(hands);
    expect(run(s, [[0, T], [1, NQ]]).state.score).toEqual([1, 0]);
    const { state } = run(s, [[0, T], [1, Q], [0, "1-espada"], [1, "4-copa"], [0, "1-basto"], [1, "5-copa"]]);
    expect(state.score).toEqual([2, 0]);
  });

  it("solo sube el que quiso último", () => {
    const s = setup(hands);
    const { state } = run(s, [[0, T], [1, Q]]);
    expect(truco.getValidActions(state, "a").some((a) => a.type === "truco")).toBe(false);
    const s2 = run(state, [[0, "1-espada"]]).state;
    expect(truco.getValidActions(s2, "b").some((a) => a.type === "truco")).toBe(true);
  });

  it("retruco no querido paga 2 y vale cuatro no querido paga 3", () => {
    const s = setup(hands);
    expect(run(s, [[0, T], [1, T], [0, NQ]]).state.score).toEqual([0, 2]);
    expect(run(s, [[0, T], [1, T], [0, T], [1, NQ]]).state.score).toEqual([3, 0]);
  });

  it("vale cuatro querido paga 4 y no se puede subir más", () => {
    const s = setup(hands);
    const mid = run(s, [[0, T], [1, T], [0, T], [1, Q]]).state;
    expect(mid.round.trucoLevel).toBe(4);
    expect(truco.getValidActions(mid, "a").some((a) => a.type === "truco")).toBe(false);
    const { state } = run(mid, [[0, "1-espada"], [1, "4-copa"], [0, "1-basto"], [1, "5-copa"]]);
    expect(state.score).toEqual([4, 0]);
  });
});

describe("envido", () => {
  const hands = [
    ["7-oro", "6-oro", "4-copa"], // 33
    ["7-espada", "5-espada", "4-basto"], // 32
  ];

  it("querido: gana el mejor tanto y suma 2", () => {
    const { state, events } = run(setup(hands), [[0, E], [1, Q]]);
    expect(state.score).toEqual([2, 0]);
    const tantos = events.find((e) => e.type === "tantos") as { declarations: unknown };
    expect(tantos.declarations).toEqual([
      { seat: 0, value: 33 },
      { seat: 1, value: null },
    ]);
  });

  it("empate en el tanto: gana la mano", () => {
    const s = setup(
      [
        ["7-oro", "6-oro", "4-copa"],
        ["7-espada", "6-espada", "4-basto"],
      ],
      { mano: 1 },
    );
    expect(run(s, [[1, E], [0, Q]]).state.score).toEqual([0, 2]);
  });

  it("cadenas no queridas pagan lo aceptado antes", () => {
    expect(envidoNoQueridoPoints(["envido"])).toBe(1);
    expect(envidoNoQueridoPoints(["envido", "envido"])).toBe(2);
    expect(envidoNoQueridoPoints(["envido", "envido", "real-envido"])).toBe(4);
    expect(envidoNoQueridoPoints(["envido", "real-envido"])).toBe(2);
    expect(envidoNoQueridoPoints(["real-envido"])).toBe(1);
    expect(envidoNoQueridoPoints(["falta-envido"])).toBe(1);
    expect(envidoNoQueridoPoints(["envido", "envido", "real-envido", "falta-envido"])).toBe(7);
    expect(run(setup(hands), [[0, E], [1, E], [0, R], [1, NQ]]).state.score).toEqual([4, 0]);
  });

  it("cadenas queridas suman", () => {
    const cfg = DEFAULT_TRUCO_CONFIG;
    expect(envidoQueridoPoints(["envido", "real-envido"], [0, 0], cfg)).toBe(5);
    expect(envidoQueridoPoints(["envido", "envido", "real-envido"], [0, 0], cfg)).toBe(7);
    expect(run(setup(hands), [[0, E], [1, R], [0, Q]]).state.score).toEqual([5, 0]);
  });

  it("no se puede cantar envido-envido-envido ni envido después del real", () => {
    const s = run(setup(hands), [[0, E], [1, E]]).state;
    const calls = truco.getValidActions(s, "a").filter((a) => a.type === "envido").map((a) => (a as { call: string }).call);
    expect(calls).toEqual(["real-envido", "falta-envido"]);
    const s2 = run(setup(hands), [[0, R]]).state;
    expect(truco.getValidActions(s2, "b").filter((a) => a.type === "envido").map((a) => (a as { call: string }).call)).toEqual(["falta-envido"]);
  });

  it("falta envido: lo que le falta al que va ganando", () => {
    const cfg30 = { ...DEFAULT_TRUCO_CONFIG, target: 30 as const };
    expect(faltaValue([10, 3], cfg30)).toBe(5);
    expect(faltaValue([20, 3], cfg30)).toBe(10);
    expect(faltaValue([10, 3], { ...cfg30, faltaEnvido: "partido" })).toBe(20);
    expect(faltaValue([12, 3], { ...DEFAULT_TRUCO_CONFIG, target: 15 })).toBe(3);
    const { state } = run(setup(hands, { score: [20, 3] }), [[0, F], [1, Q]]);
    expect(state.score[0]).toBe(30);
    expect(state.winner).toBe(0);
  });

  it("solo en la primera baza y antes de tirar", () => {
    const s = run(setup(hands), [[0, "4-copa"]]).state;
    // El 0 ya tiró: no puede. El 1 todavía no: puede.
    expect(truco.getValidActions(s, "b").some((a) => a.type === "envido")).toBe(true);
    const s2 = run(s, [[1, "4-basto"]]).state;
    expect(s2.round.tricks.length).toBe(2);
    expect(truco.getValidActions(s2, P[s2.round.turn]!).some((a) => a.type === "envido")).toBe(false);
  });

  it("el envido está primero: contestan el truco con envido y después vuelve el truco", () => {
    const { state } = run(setup(hands), [[0, T], [1, E]]);
    expect(state.round.pending?.kind).toBe("envido");
    const after = run(state, [[0, Q]]).state;
    expect(after.score).toEqual([2, 0]);
    expect(after.round.pending).toMatchObject({ kind: "truco", level: 2, responder: 1 });
    // y no se puede volver a cantar envido
    expect(truco.getValidActions(after, "b").some((a) => a.type === "envido")).toBe(false);
  });

  it("después de querer el truco ya no hay envido", () => {
    const s = run(setup(hands), [[0, T], [1, Q]]).state;
    expect(truco.getValidActions(s, "a").some((a) => a.type === "envido")).toBe(false);
  });

  it("si el envido define la partida, se corta en el medio de la mano", () => {
    const { state, events } = run(setup(hands, { score: [28, 0] }), [[0, E], [1, Q]]);
    expect(state.winner).toBe(0);
    expect(truco.getValidActions(state, "a")).toEqual([]);
    expect(events.some((e) => e.type === "fin-partida")).toBe(true);
    expect(events.some((e) => e.type === "nueva-ronda")).toBe(false);
  });

  it("en 2 contra 2 cuenta el mejor tanto del equipo", () => {
    const s = setup([
      ["4-copa", "5-oro", "6-basto"], // 6
      ["7-espada", "5-espada", "4-basto"], // 32
      ["7-oro", "6-oro", "4-espada"], // 33
      ["1-copa", "2-copa", "10-oro"], // 23
    ]);
    const { state, events } = run(s, [[0, E], [1, Q]]);
    expect(state.score).toEqual([2, 0]);
    const tantos = events.find((e) => e.type === "tantos") as { declarations: unknown };
    expect(tantos.declarations).toEqual([
      { seat: 0, value: 6 },
      { seat: 1, value: 32 },
      { seat: 2, value: 33 },
      { seat: 3, value: null },
    ]);
  });
});

describe("irse al mazo", () => {
  const hands = [
    ["7-oro", "6-oro", "4-copa"],
    ["7-espada", "5-espada", "4-basto"],
  ];

  it("en primera sin envido: 1 del truco + 1 del envido no cantado", () => {
    expect(run(setup(hands), [[0, MAZO]]).state.score).toEqual([0, 2]);
    expect(run(setup(hands, { config: { mazoSumaEnvido: false } }), [[0, MAZO]]).state.score).toEqual([0, 1]);
  });

  it("con el envido ya jugado, solo lo del truco", () => {
    const { state } = run(setup(hands), [[0, E], [1, NQ], [0, T], [1, Q], [0, "4-copa"], [1, MAZO]]);
    // envido no querido: 1 para el 0; truco querido: 2 para el 0.
    expect(state.score).toEqual([3, 0]);
  });

  it("contestando un truco con el mazo es como no quererlo", () => {
    const s = run(setup(hands), [[0, "4-copa"], [1, "4-basto"]]).state;
    const turn = s.round.turn;
    const { state } = run(s, [[turn, T], [1 - turn, MAZO]]);
    expect(state.score[turn % 2]).toBe(1);
  });
});

describe("flor", () => {
  const cfg = { flor: true };

  it("sin flor del otro lado: 3 puntos y anula el envido", () => {
    const s = setup(
      [
        ["7-oro", "6-oro", "5-oro"],
        ["7-espada", "5-espada", "4-basto"],
      ],
      { config: cfg },
    );
    const valid = truco.getValidActions(s, "a");
    expect(valid.some((a) => a.type === "flor")).toBe(true);
    expect(valid.some((a) => a.type === "envido")).toBe(false);
    const { state } = run(s, [[0, { type: "flor" }]]);
    expect(state.score).toEqual([3, 0]);
    expect(truco.getValidActions(state, "a").some((a) => a.type === "envido")).toBe(false);
  });

  it("con flor me achico paga 4; contraflor querida paga 6 a la mejor", () => {
    const hands = [
      ["7-oro", "6-oro", "5-oro"], // 38
      ["7-espada", "5-espada", "4-espada"], // 36
    ];
    expect(run(setup(hands, { config: cfg }), [[0, { type: "flor" }], [1, { type: "con-flor-me-achico" }]]).state.score).toEqual([4, 0]);
    expect(run(setup(hands, { config: cfg }), [[0, { type: "flor" }], [1, { type: "contraflor" }], [0, Q]]).state.score).toEqual([6, 0]);
    expect(run(setup(hands, { config: cfg }), [[0, { type: "flor" }], [1, { type: "contraflor" }], [0, NQ]]).state.score).toEqual([0, 4]);
  });

  it("se puede contestar un envido con flor", () => {
    const s = setup(
      [
        ["7-copa", "6-oro", "5-basto"],
        ["7-espada", "5-espada", "4-espada"],
      ],
      { config: cfg },
    );
    const { state } = run(s, [[0, E], [1, { type: "flor" }]]);
    expect(state.score).toEqual([0, 3]);
    expect(state.round.envidoDone).toBe(true);
  });
});

describe("reglas generales", () => {
  it("rechaza jugadas inválidas y no muta el estado", () => {
    const s = setup([
      ["7-oro", "6-oro", "4-copa"],
      ["7-espada", "5-espada", "4-basto"],
    ]);
    const before = JSON.stringify(s);
    expect(truco.applyAction(s, "b", { type: "jugar", card: "7-espada" }).ok).toBe(false);
    expect(truco.applyAction(s, "a", { type: "jugar", card: "7-espada" }).ok).toBe(false);
    expect(truco.applyAction(s, "a", Q).ok).toBe(false);
    expect(truco.applyAction(s, "z", MAZO).ok).toBe(false);
    act(s, 0, { type: "jugar", card: "7-oro" });
    expect(JSON.stringify(s)).toBe(before);
  });

  it("la vista no muestra las cartas de los demás", () => {
    const s = truco.initialState({ ...DEFAULT_TRUCO_CONFIG, players: 4 }, P.slice(0, 4), "vista");
    for (let seat = 0; seat < 4; seat++) {
      const json = JSON.stringify(truco.getPlayerView(s, P[seat]!));
      for (let other = 0; other < 4; other++) {
        if (other === seat) continue;
        for (const card of s.round.hands[other]!) expect(json).not.toContain(`"${card.id}"`);
      }
      expect(json).not.toContain("rng");
    }
  });

  it("la mano rota y se reparte de nuevo", () => {
    const s = setup([
      ["7-oro", "6-oro", "4-copa"],
      ["7-espada", "5-espada", "4-basto"],
    ]);
    const { state, events } = run(s, [[0, MAZO]]);
    expect(state.round.mano).toBe(1);
    expect(state.round.number).toBe(2);
    expect(state.round.hands.every((h) => h.length === 3)).toBe(true);
    expect(events.some((e) => e.type === "nueva-ronda")).toBe(true);
  });

  it("misma semilla, mismas cartas", () => {
    const cfg = { ...DEFAULT_TRUCO_CONFIG, players: 4 as const };
    const a = truco.initialState(cfg, P.slice(0, 4), "semilla");
    const b = truco.initialState(cfg, P.slice(0, 4), "semilla");
    const d = truco.initialState(cfg, P.slice(0, 4), "otra");
    expect(a.round.hands).toEqual(b.round.hands);
    expect(a.round.hands).not.toEqual(d.round.hands);
  });
});
