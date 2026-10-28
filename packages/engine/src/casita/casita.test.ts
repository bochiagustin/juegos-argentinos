import { describe, expect, it } from "vitest";
import { cardFromId, createDeck, type SuitedCard } from "../core/index.ts";
import { casitaProfile, playCasitaBotGame } from "./bot.ts";
import { casita, jugadasPara } from "./game.ts";
import { DEFAULT_CASITA_CONFIG, type CasitaAction, type CasitaConfig, type CasitaState } from "./types.ts";

const cs = (ids: string[]) => ids.map((id) => cardFromId(id) as SuitedCard);
const P = ["a", "b", "c", "d"];

function setup(opts: { hands: string[][]; mesa?: string[]; casitas?: string[][]; mazo?: string[] | "resto"; config?: Partial<CasitaConfig>; turn?: number }): CasitaState {
  const config: CasitaConfig = { ...DEFAULT_CASITA_CONFIG, players: opts.hands.length as 2 | 3 | 4, ...opts.config };
  const s = casita.initialState(config, P.slice(0, opts.hands.length), "test");
  s.hands = opts.hands.map(cs);
  s.mesa = cs(opts.mesa ?? []);
  s.casitas = (opts.casitas ?? opts.hands.map(() => [])).map(cs);
  const used = new Set([...opts.hands.flat(), ...(opts.mesa ?? []), ...(opts.casitas ?? []).flat()]);
  s.mazo = opts.mazo === "resto" ? (createDeck({ size: 40 }) as SuitedCard[]).filter((c) => !used.has(c.id)) : cs(opts.mazo ?? []);
  s.turn = opts.turn ?? 0;
  s.mano = opts.turn ?? 0;
  return s;
}

function act(s: CasitaState, seat: number, a: CasitaAction) {
  const r = casita.applyAction(s, P[seat]!, a);
  if (!r.ok) throw new Error(`${seat}: ${r.error} ${JSON.stringify(a)}`);
  return r;
}

describe("casita robada", () => {
  it("reparte 3 a cada uno y 4 a la mesa", () => {
    const s = casita.initialState({ ...DEFAULT_CASITA_CONFIG, players: 3 }, P.slice(0, 3), "x");
    expect(s.hands.map((h) => h.length)).toEqual([3, 3, 3]);
    expect(s.mesa).toHaveLength(4);
    expect(s.mazo).toHaveLength(40 - 4 - 9);
  });

  it("levantar de la mesa: la tuya queda arriba de la casita", () => {
    const s = setup({ hands: [["5-oro", "1-copa", "2-copa"], ["7-oro", "6-copa", "3-basto"]], mesa: ["5-espada", "12-oro"], mazo: "resto" });
    const { state } = act(s, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "mesa" } });
    expect(state.casitas[0]!.map((c) => c.id)).toEqual(["5-espada", "5-oro"]);
    expect(state.mesa.map((c) => c.id)).toEqual(["12-oro"]);
    expect(state.turn).toBe(1);
  });

  it("robar la casita entera del rival", () => {
    const s = setup({
      hands: [["5-oro", "1-copa", "2-copa"], ["7-oro", "6-copa", "3-basto"]],
      mesa: ["12-oro"],
      casitas: [[], ["4-copa", "4-oro", "9-espada"].slice(0, 2).concat(["5-basto"])],
      mazo: "resto",
    });
    const { state, events } = act(s, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "robar", de: 1 } });
    expect(state.casitas[1]).toEqual([]);
    expect(state.casitas[0]!.map((c) => c.id)).toEqual(["4-copa", "4-oro", "5-basto", "5-oro"]);
    expect(events.some((e) => e.type === "robo")).toBe(true);
    expect(state.robos[0]).toBe(1);
  });

  it("si puede levantar y robar, elige (o manda la prioridad configurada)", () => {
    const base = { hands: [["5-oro", "1-copa", "2-copa"], ["7-oro", "6-copa", "3-basto"]], mesa: ["5-espada"], casitas: [[], ["5-basto"]], mazo: "resto" as const };
    const s = setup(base);
    expect(jugadasPara(s, 0, cardFromId("5-oro") as SuitedCard)).toEqual([{ tipo: "mesa" }, { tipo: "robar", de: 1 }]);
    expect(jugadasPara(setup({ ...base, config: { prioridad: "robar" } }), 0, cardFromId("5-oro") as SuitedCard)).toEqual([{ tipo: "robar", de: 1 }]);
    expect(jugadasPara(setup({ ...base, config: { prioridad: "mesa" } }), 0, cardFromId("5-oro") as SuitedCard)).toEqual([{ tipo: "mesa" }]);
  });

  it("sin coincidencia la carta queda en la mesa", () => {
    const s = setup({ hands: [["5-oro", "1-copa", "2-copa"], ["7-oro", "6-copa", "3-basto"]], mesa: ["12-oro"], mazo: "resto" });
    expect(casita.getValidActions(s, "a").filter((a) => a.card === "5-oro")).toEqual([{ type: "tirar", card: "5-oro", jugada: { tipo: "dejar" } }]);
    const { state } = act(s, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "dejar" } });
    expect(state.mesa.map((c) => c.id)).toEqual(["12-oro", "5-oro"]);
  });

  it("levantar todas las del mismo número (opcional)", () => {
    const s = setup({ hands: [["5-oro", "1-copa", "2-copa"], ["7-oro", "6-copa", "3-basto"]], mesa: ["5-espada", "5-copa", "12-oro"], mazo: "resto", config: { levantar: "todas" } });
    const { state } = act(s, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "mesa" } });
    expect(state.casitas[0]).toHaveLength(3);
  });

  it("en parejas no se le roba al compañero y se suma de a dos", () => {
    const s = setup({
      hands: [["5-oro"], ["7-oro"], ["6-oro"], ["3-oro"]],
      casitas: [[], ["4-copa"], ["5-basto"], []],
      mesa: [],
      config: { players: 4, parejas: true },
    });
    expect(jugadasPara(s, 0, cardFromId("5-oro") as SuitedCard)).toEqual([{ tipo: "dejar" }]);
  });

  it("vuelve a repartir y al final lo de la mesa es del último que levantó", () => {
    const s = setup({ hands: [["5-oro"], ["7-oro"]], mesa: ["5-espada", "12-oro"], mazo: [] });
    let r = act(s, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "mesa" } });
    r = act(r.state, 1, { type: "tirar", card: "7-oro", jugada: { tipo: "dejar" } });
    expect(r.state.result).not.toBeNull();
    // El 0 levantó último: se lleva el 12 y el 7 de la mesa.
    expect(r.state.result!.cartas).toEqual([4, 0]);
    expect(r.state.result!.ganadores).toEqual([0]);
    const nadie = setup({ hands: [["5-oro"], ["7-oro"]], mesa: ["5-espada", "12-oro"], mazo: [], config: { sobrantes: "nadie" } });
    let r2 = act(nadie, 0, { type: "tirar", card: "5-oro", jugada: { tipo: "mesa" } });
    r2 = act(r2.state, 1, { type: "tirar", card: "7-oro", jugada: { tipo: "dejar" } });
    expect(r2.state.result!.cartas).toEqual([2, 0]);
  });

  it("la vista solo muestra la carta de arriba de cada casita", () => {
    const s = setup({ hands: [["5-oro"], ["7-oro"]], casitas: [["1-copa", "2-copa"], ["3-oro", "4-basto"]], mesa: [], mazo: [] });
    const v = casita.getPlayerView(s, "a");
    expect(v.players[1]!.top?.id).toBe("4-basto");
    const json = JSON.stringify(v);
    expect(json).not.toContain('"3-oro"');
    expect(json).not.toContain('"7-oro"');
  });

  it(
    "simulación: se conservan las 40 cartas y siempre termina",
    () => {
      const configs: CasitaConfig[] = [
        { ...DEFAULT_CASITA_CONFIG, players: 2 },
        { ...DEFAULT_CASITA_CONFIG, players: 3, levantar: "todas", agrandarPropia: true },
        { ...DEFAULT_CASITA_CONFIG, players: 4, parejas: true, prioridad: "robar" },
        { ...DEFAULT_CASITA_CONFIG, players: 4, sobrantes: "nadie", prioridad: "mesa" },
      ];
      for (let g = 0; g < 400; g++) {
        const config = configs[g % configs.length]!;
        const skills = Array.from({ length: config.players }, (_, i) => ((g + i * 3) % 10) + 1);
        const { state } = playCasitaBotGame(config, skills, `sim-${g}`);
        expect(state.result).not.toBeNull();
        const total = state.result!.cartas.reduce((a, b) => a + b, 0);
        if (config.sobrantes === "ultimo") expect(total).toBe(40);
        else expect(total).toBeLessThanOrEqual(40);
      }
    },
    120_000,
  );

  it(
    "el nivel 10 le gana al nivel 1 más veces de las que pierde (es un juego de mucha suerte)",
    () => {
      let wins = 0;
      let losses = 0;
      const games = 400;
      for (let g = 0; g < games; g++) {
        const strong = g % 2;
        const { state } = playCasitaBotGame({ ...DEFAULT_CASITA_CONFIG, players: 2 }, strong === 0 ? [10, 1] : [1, 10], `f-${g}`);
        if (state.result!.ganadores.length !== 1) continue;
        if (state.result!.ganadores[0] === strong) wins++;
        else losses++;
      }
      expect(wins).toBeGreaterThan(losses);
      expect(wins / games).toBeGreaterThan(0.5);
    },
    120_000,
  );

  it("el perfil escala con el nivel", () => {
    expect(casitaProfile(1).errorRate).toBeGreaterThan(casitaProfile(10).errorRate);
  });
});
