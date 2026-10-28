import { describe, expect, it } from "vitest";
import { cardFromId, createDeck, type Card } from "../core/index.ts";
import { chinchonProfile, chooseChinchonAction, playChinchonBotGame } from "./bot.ts";
import { canCutWith, chinchon, rulesOf } from "./game.ts";
import { bestArrangement, bestWithLayoff, isChinchon, meldRules } from "./melds.ts";
import { DEFAULT_CHINCHON_CONFIG, type ChinchonAction, type ChinchonConfig, type ChinchonState } from "./types.ts";

const cs = (ids: string[]): Card[] => ids.map(cardFromId);
const R48 = meldRules(48, 1, 50);
const R40 = meldRules(40, 1, 50);
const P = ["a", "b", "c", "d", "e", "f"];

describe("combinaciones", () => {
  it("grupo y escalera, sin sueltas", () => {
    const a = bestArrangement(cs(["5-oro", "5-copa", "5-basto", "7-espada", "8-espada", "9-espada", "10-espada"]), R48);
    expect(a.looseSum).toBe(0);
    expect(a.melds.map((m) => m.kind).sort()).toEqual(["escalera", "grupo"]);
  });

  it("deja suelto lo que no combina y elige la combinación que menos suma", () => {
    const a = bestArrangement(cs(["1-oro", "2-oro", "3-oro", "3-copa", "3-basto", "12-espada", "2-copa"]), R48);
    // Mejor: escalera 1-2-3 de oro y sueltas 3c,3b,12e,2c = 20? o grupo de 3 (3o,3c,3b) y sueltas 1o,2o,12e,2c = 17
    expect(a.looseSum).toBe(17);
  });

  it("el comodín completa escaleras y grupos", () => {
    const a = bestArrangement(cs(["4-copa", "6-copa", "comodin-1", "9-oro", "9-espada", "1-basto", "2-basto"]), R48);
    // Conviene 9-9-comodín (sueltas 4+6+1+2 = 13) antes que 4-comodín-6 (sueltas 9+9+1+2 = 21).
    expect(a.melds).toHaveLength(1);
    expect(a.looseSum).toBe(13);
  });

  it("no permite dos comodines en la misma combinación (por defecto)", () => {
    const hand = cs(["4-copa", "comodin-1", "comodin-2", "9-oro", "10-oro", "11-oro", "1-basto"]);
    const una = bestArrangement(hand, R48);
    const dos = bestArrangement(hand, meldRules(48, 2, 50));
    // Con uno solo por combinación, un comodín va en la escalera 9-10-11 y el otro queda suelto (50) o arma 4-J… no alcanza.
    expect(dos.looseSum).toBeLessThan(una.looseSum);
    expect(dos.melds.some((m) => m.cards.filter((c) => c.kind === "joker").length === 2)).toBe(true);
  });

  it("con 40 cartas el 7 y el 10 son seguidos; con 48 no", () => {
    const hand = cs(["6-basto", "7-basto", "10-basto", "1-oro", "1-copa", "2-espada", "3-espada"]);
    expect(bestArrangement(hand, R40).melds.some((m) => m.kind === "escalera")).toBe(true);
    expect(bestArrangement(hand, R48).melds.some((m) => m.kind === "escalera")).toBe(false);
  });

  it("detecta el chinchón (sin comodín)", () => {
    expect(isChinchon(cs(["3-oro", "4-oro", "5-oro", "6-oro", "7-oro", "8-oro", "9-oro"]), R48)).toBe(true);
    expect(isChinchon(cs(["3-oro", "4-oro", "5-oro", "6-oro", "7-oro", "8-oro", "comodin-1"]), R48)).toBe(false);
    expect(isChinchon(cs(["4-oro", "5-oro", "6-oro", "7-oro", "10-oro", "11-oro", "12-oro"]), R40)).toBe(true);
    expect(isChinchon(cs(["4-oro", "5-oro", "6-oro", "7-oro", "10-oro", "11-oro", "12-oro"]), R48)).toBe(false);
  });

  it("ligar: agrega sueltas a las combinaciones del que cortó", () => {
    const cutter = bestArrangement(cs(["5-oro", "5-copa", "5-basto", "7-espada", "8-espada", "9-espada", "1-copa"]), R48).melds;
    const r = bestWithLayoff(cs(["5-espada", "10-espada", "6-espada", "11-espada", "12-copa", "2-basto", "3-oro"]), cutter, R48);
    // Liga el 5 de espada al grupo de 5, el 6 y el 10 (y el 11) a la escalera 7-8-9 de espada.
    expect(r.laid.map((c) => c.id).sort()).toEqual(["10-espada", "11-espada", "5-espada", "6-espada"]);
    expect(r.looseSum).toBe(12 + 2 + 3);
  });
});

function setup(hands: string[][], opts: { pozo?: string[]; mazo?: string[]; scores?: number[]; config?: Partial<ChinchonConfig>; turn?: number } = {}): ChinchonState {
  const config: ChinchonConfig = { ...DEFAULT_CHINCHON_CONFIG, players: hands.length, ...opts.config };
  const s = chinchon.initialState(config, P.slice(0, hands.length), "test");
  s.hands = hands.map(cs);
  const used = new Set([...hands.flat(), ...(opts.pozo ?? []), ...(opts.mazo ?? [])]);
  s.pozo = cs(opts.pozo ?? ["12-oro"]);
  used.add("12-oro");
  s.mazo = opts.mazo ? cs(opts.mazo) : createDeck({ size: config.deckSize, jokers: config.jokers }).filter((c) => !used.has(c.id));
  s.turn = opts.turn ?? 0;
  s.mano = opts.turn ?? 0;
  s.phase = "robar";
  if (opts.scores) s.scores = opts.scores;
  return s;
}

function act(s: ChinchonState, seat: number, a: ChinchonAction) {
  const r = chinchon.applyAction(s, P[seat]!, a);
  if (!r.ok) throw new Error(`${seat}: ${r.error} ${JSON.stringify(a)}`);
  return r;
}

describe("la mano", () => {
  it("robar y tirar; no se puede tirar la que levantaste del pozo", () => {
    const s = setup(
      [
        ["1-oro", "2-oro", "3-oro", "5-copa", "6-copa", "9-basto", "10-espada"],
        ["1-copa", "2-copa", "3-copa", "5-oro", "6-oro", "9-espada", "10-basto"],
      ],
      { pozo: ["4-oro"] },
    );
    const r = act(s, 0, { type: "robar", de: "pozo" });
    const valid = chinchon.getValidActions(r.state, "a");
    expect(valid.some((a) => a.type === "descartar" && a.card === "4-oro")).toBe(false);
    const r2 = act(r.state, 0, { type: "descartar", card: "10-espada" });
    expect(r2.state.turn).toBe(1);
    expect(r2.state.pozo[r2.state.pozo.length - 1]!.id).toBe("10-espada");
  });

  it("cortar con 5 o menos sueltos; menos diez con todo ligado", () => {
    const s = setup(
      [
        ["1-oro", "2-oro", "3-oro", "5-copa", "5-oro", "5-basto", "12-espada"],
        ["7-copa", "8-copa", "12-copa", "11-oro", "6-oro", "9-espada", "10-basto"],
      ],
      { mazo: ["4-oro", "1-basto"] },
    );
    const r = act(s, 0, { type: "robar", de: "mazo" }); // agarra el 4 de oro
    expect(canCutWith(r.state.hands[0]!, "12-espada", r.state.config)).toBe(true);
    const { state, events } = act(r.state, 0, { type: "cortar", card: "12-espada" });
    const fin = events.find((e) => e.type === "fin-ronda") as { summary: { menosDiez: boolean; results: { seat: number; points: number }[] } };
    expect(fin.summary.menosDiez).toBe(true);
    expect(fin.summary.results.find((x) => x.seat === 0)!.points).toBe(-10);
    // El 1 no puede ligar nada: 7+8+12+11+6+9+10 = 63
    expect(fin.summary.results.find((x) => x.seat === 1)!.points).toBe(63);
    expect(state.scores).toEqual([-10, 63]);
    expect(state.round).toBe(2);
  });

  it("no deja cortar con más de 5 sueltos", () => {
    const s = setup(
      [
        ["1-oro", "2-oro", "3-oro", "5-copa", "5-oro", "7-basto", "12-espada"],
        ["7-copa", "8-copa", "12-copa", "11-oro", "6-oro", "9-espada", "10-basto"],
      ],
      { mazo: ["4-basto"] },
    );
    const r = act(s, 0, { type: "robar", de: "mazo" });
    expect(chinchon.getValidActions(r.state, "a").some((a) => a.type === "cortar")).toBe(false);
  });

  it("chinchón gana la partida en el acto", () => {
    const s = setup(
      [
        ["3-oro", "4-oro", "5-oro", "6-oro", "7-oro", "8-oro", "12-espada"],
        ["7-copa", "8-copa", "12-copa", "11-oro", "6-copa", "9-espada", "10-basto"],
      ],
      { mazo: ["9-oro"] },
    );
    const r = act(s, 0, { type: "robar", de: "mazo" });
    const { state } = act(r.state, 0, { type: "cortar", card: "12-espada" });
    expect(state.winner).toBe(0);
  });

  it("al llegar a 100 queda afuera; gana el último que queda", () => {
    const s = setup(
      [
        ["1-oro", "2-oro", "3-oro", "5-copa", "5-oro", "5-basto", "12-espada"],
        ["7-copa", "8-copa", "12-copa", "11-oro", "6-oro", "9-espada", "10-basto"],
      ],
      { mazo: ["4-oro"], scores: [50, 60] },
    );
    const r = act(s, 0, { type: "robar", de: "mazo" });
    const { state, events } = act(r.state, 0, { type: "cortar", card: "12-espada" });
    expect(state.out[1]).toBe(true);
    expect(state.winner).toBe(0);
    expect(events.some((e) => e.type === "eliminado")).toBe(true);
  });

  it("reenganche: vuelve una vez con el puntaje del que más tiene", () => {
    const hands = [
      ["1-oro", "2-oro", "3-oro", "5-copa", "5-oro", "5-basto", "12-espada"],
      ["7-copa", "8-copa", "12-copa", "11-oro", "6-oro", "9-espada", "10-basto"],
      ["1-copa", "2-copa", "3-copa", "4-copa", "1-espada", "2-espada", "3-basto"],
    ];
    const s = setup(hands, { mazo: ["4-oro"], scores: [50, 60, 70], config: { reenganche: true } });
    const r = act(s, 0, { type: "robar", de: "mazo" });
    const { state } = act(r.state, 0, { type: "cortar", card: "12-espada" });
    // El 1 pasa de 100 y se reengancha con el máximo de los que siguen (el 2: 70 + 6 = 76)
    expect(state.out[1]).toBe(false);
    expect(state.scores[1]).toBe(state.scores[2]);
    expect(state.reenganches[1]).toBe(1);
    expect(state.winner).toBeNull();
  });

  it("si se acaba el mazo, se mezcla el pozo menos la de arriba", () => {
    const s = setup(
      [
        ["1-oro", "2-oro", "3-oro", "5-copa", "6-copa", "9-basto", "10-espada"],
        ["1-copa", "2-copa", "3-copa", "5-oro", "6-oro", "9-espada", "10-basto"],
      ],
      { mazo: [], pozo: ["4-basto", "8-oro", "11-copa"] },
    );
    const { state, events } = act(s, 0, { type: "robar", de: "mazo" });
    expect(events.some((e) => e.type === "rebarajar")).toBe(true);
    expect(state.pozo.map((c) => c.id)).toEqual(["11-copa"]);
    expect(state.mazo.length + 1).toBe(2);
  });

  it("la vista no muestra las cartas de los demás ni el mazo", () => {
    const s = chinchon.initialState({ ...DEFAULT_CHINCHON_CONFIG, players: 4 }, P.slice(0, 4), "vista");
    const v = JSON.stringify(chinchon.getPlayerView(s, "a"));
    for (let i = 1; i < 4; i++) for (const c of s.hands[i]!) expect(v).not.toContain(`"${c.id}"`);
    for (const c of s.mazo) expect(v).not.toContain(`"${c.id}"`);
  });
});

describe("simulación", () => {
  const configs: ChinchonConfig[] = [
    { ...DEFAULT_CHINCHON_CONFIG, players: 2 },
    { ...DEFAULT_CHINCHON_CONFIG, players: 3, deckSize: 40, jokers: 0 },
    { ...DEFAULT_CHINCHON_CONFIG, players: 4, reenganche: true, corteMax: 7 },
    { ...DEFAULT_CHINCHON_CONFIG, players: 6, unComodinPorCombinacion: false, comodinSuelto: 25 },
  ];

  it(
    "partidas entre bots terminan y no se pierden cartas",
    () => {
      for (let g = 0; g < 80; g++) {
        const config = configs[g % configs.length]!;
        const skills = Array.from({ length: config.players }, (_, i) => ((g + i * 4) % 10) + 1);
        const { state } = playChinchonBotGame(config, skills, `sim-${g}`);
        expect(state.winner).not.toBeNull();
        const total = config.deckSize + config.jokers;
        expect(state.history.length).toBeGreaterThan(0);
        for (const h of state.history) expect(h.results.reduce((a, r) => a + r.hand.length, 0) + 1).toBeLessThanOrEqual(total);
      }
    },
    120_000,
  );

  it(
    "en cada paso se conservan las cartas",
    () => {
      const config = { ...DEFAULT_CHINCHON_CONFIG, players: 3 };
      const players = P.slice(0, 3);
      let s = chinchon.initialState(config, players, "conserva");

      let rng = s.rng;
      for (let step = 0; step < 3000 && s.winner === null; step++) {
        const all = [...s.hands.flat(), ...s.mazo, ...s.pozo].map((c) => c.id);
        expect(new Set(all).size).toBe(all.length);
        expect(all.length).toBe(50);
        const id = players[s.turn]!;
        const [a, next] = chooseChinchonAction(chinchon.getPlayerView(s, id), chinchon.getValidActions(s, id), rng, 5);
        rng = next;
        const r = chinchon.applyAction(s, id, a);
        expect(r.ok).toBe(true);
        if (r.ok) s = r.state;
      }
    },
    120_000,
  );

  it(
    "el nivel 10 le gana al nivel 1 la mayoría de las veces",
    () => {
      let wins = 0;
      const games = 60;
      for (let g = 0; g < games; g++) {
        const strong = g % 2;
        const { state } = playChinchonBotGame({ ...DEFAULT_CHINCHON_CONFIG, players: 2 }, strong === 0 ? [10, 1] : [1, 10], `fuerza-${g}`);
        if (state.winner === strong) wins++;
      }
      expect(wins / games).toBeGreaterThan(0.7);
    },
    120_000,
  );

  it("el perfil escala con el nivel", () => {
    expect(chinchonProfile(1).errorRate).toBeGreaterThan(chinchonProfile(10).errorRate);
    expect(rulesOf(DEFAULT_CHINCHON_CONFIG).maxJokersPerMeld).toBe(1);
  });
});
