import { describe, expect, it } from "vitest";
import { cardFromId, createDeck, type SuitedCard } from "../core/index.ts";
import { escobaProfile, playEscobaBotGame } from "./bot.ts";
import { combinaciones, contarRonda, escoba, valorEscoba } from "./game.ts";
import { DEFAULT_ESCOBA_CONFIG, type EscobaAction, type EscobaConfig, type EscobaState } from "./types.ts";

const c = (id: string) => cardFromId(id) as SuitedCard;
const cs = (ids: string[]) => ids.map(c);
const P = ["a", "b", "c", "d"];

function setup(o: { hands: string[][]; mesa?: string[]; mazo?: string[]; config?: Partial<EscobaConfig>; turn?: number; score?: number[] }): EscobaState {
  const config: EscobaConfig = { ...DEFAULT_ESCOBA_CONFIG, players: o.hands.length as 2 | 3 | 4, ...o.config };
  const s = escoba.initialState(config, P.slice(0, o.hands.length), "test");
  s.hands = o.hands.map(cs);
  s.mesa = cs(o.mesa ?? []);
  s.mazo = cs(o.mazo ?? []);
  s.pilas = o.hands.map(() => []);
  s.escobas = o.hands.map(() => 0);
  s.turn = o.turn ?? 0;
  s.dealer = (s.turn + o.hands.length - 1) % o.hands.length;
  s.ultimoQueLevanto = null;
  if (o.score) s.score = o.score;
  return s;
}

const tirar = (card: string, levanta: string[] = []): EscobaAction => ({ type: "tirar", card: card as SuitedCard["id"], levanta: levanta as SuitedCard["id"][] });

function act(s: EscobaState, seat: number, a: EscobaAction) {
  const r = escoba.applyAction(s, P[seat]!, a);
  if (!r.ok) throw new Error(`${seat}: ${r.error} ${JSON.stringify(a)}`);
  return r;
}

describe("valores y combinaciones", () => {
  it("las figuras valen 8, 9 y 10", () => {
    expect(valorEscoba(c("7-oro"))).toBe(7);
    expect(valorEscoba(c("10-oro"))).toBe(8);
    expect(valorEscoba(c("11-oro"))).toBe(9);
    expect(valorEscoba(c("12-oro"))).toBe(10);
  });

  it("encuentra todos los grupos que suman 15 con la carta tirada", () => {
    const mesa = cs(["5-oro", "3-copa", "2-basto", "10-espada", "1-oro"]);
    // Con un 7 (faltan 8): sota (8), 5+3, 5+2+1, ...
    const combos = combinaciones(mesa, 7).map((g) => g.map((x) => x.id).sort());
    expect(combos).toContainEqual(["10-espada"]);
    expect(combos).toContainEqual(["3-copa", "5-oro"]);
    expect(combos).toContainEqual(["1-oro", "2-basto", "5-oro"]);
    for (const g of combinaciones(mesa, 7)) expect(g.reduce((a, x) => a + valorEscoba(x), 0)).toBe(8);
    expect(combinaciones(cs(["1-oro"]), 2)).toEqual([]);
  });
});

describe("la mano", () => {
  it("levantar suma 15 y si la mesa queda vacía es escoba", () => {
    const s = setup({ hands: [["7-oro", "1-copa", "2-copa"], ["4-oro", "6-copa", "3-basto"]], mesa: ["10-espada"] });
    const { state, events } = act(s, 0, tirar("7-oro", ["10-espada"]));
    expect(state.pilas[0]!.map((x) => x.id).sort()).toEqual(["10-espada", "7-oro"]);
    expect(state.escobas[0]).toBe(1);
    expect(events.some((e) => e.type === "tirada" && e.escoba)).toBe(true);
  });

  it("no deja levantar algo que no suma 15", () => {
    const s = setup({ hands: [["7-oro", "1-copa", "2-copa"], ["4-oro", "6-copa", "3-basto"]], mesa: ["5-espada", "4-copa"] });
    expect(escoba.applyAction(s, "a", tirar("7-oro", ["5-espada"])).ok).toBe(false);
  });

  it("levantar es opcional por defecto y obligatorio si se configura", () => {
    const base = { hands: [["7-oro", "1-copa", "2-copa"], ["4-oro", "6-copa", "3-basto"]], mesa: ["10-espada"] };
    expect(escoba.getValidActions(setup(base), "a")).toContainEqual(tirar("7-oro"));
    const obligatorio = escoba.getValidActions(setup({ ...base, config: { levantarObligatorio: true } }), "a");
    expect(obligatorio).not.toContainEqual(tirar("7-oro"));
    expect(obligatorio).toContainEqual(tirar("1-copa"));
  });

  it("escoba de mano: si la mesa del reparto suma 15 se la lleva el que reparte", () => {
    // Buscamos una semilla cuya mesa inicial sume 15 y verificamos la regla.
    for (let i = 0; i < 500; i++) {
      const s = escoba.initialState(DEFAULT_ESCOBA_CONFIG, ["a", "b"], `mano-${i}`);
      if (s.escobas.some((e) => e > 0)) {
        expect(s.mesa).toEqual([]);
        expect(s.pilas[s.dealer]!.reduce((a, x) => a + valorEscoba(x), 0) % 15).toBe(0);
        expect(s.escobas[s.dealer]).toBeGreaterThan(0);
        return;
      }
    }
    throw new Error("No apareció ninguna escoba de mano en 500 repartos");
  });

  it("al final, lo de la mesa es del último que levantó (sin escoba)", () => {
    const s = setup({ hands: [["7-oro"], ["4-oro"]], mesa: ["10-espada", "2-copa"] });
    let r = act(s, 0, tirar("7-oro", ["10-espada"]));
    r = act(r.state, 1, tirar("4-oro"));
    const fin = r.events.find((e) => e.type === "fin-ronda") as { summary: { bandos: { cartas: number; escobas: number }[]; sobrantes: { bando: number; cartas: number } } };
    expect(fin.summary.sobrantes).toEqual({ bando: 0, cartas: 2 });
    expect(fin.summary.bandos[0]!.cartas).toBe(4);
    expect(fin.summary.bandos[0]!.escobas).toBe(0);
  });

  it("vuelve a repartir de a 3 cuando todos se quedan sin cartas", () => {
    const s = setup({ hands: [["7-oro"], ["4-oro"]], mesa: ["12-copa"], mazo: ["1-oro", "2-oro", "3-oro", "1-copa", "2-copa", "3-copa"] });
    let r = act(s, 0, tirar("7-oro"));
    r = act(r.state, 1, tirar("4-oro"));
    expect(r.events.some((e) => e.type === "reparto")).toBe(true);
    expect(r.state.hands.map((h) => h.length)).toEqual([3, 3]);
  });
});

describe("puntos de la ronda", () => {
  function conPilas(pilas: string[][], escobas: number[], config: Partial<EscobaConfig> = {}): EscobaState {
    const s = setup({ hands: pilas.map(() => []), config });
    s.pilas = pilas.map(cs);
    s.escobas = escobas;
    return s;
  }

  it("escobas, cartas, oros, 7 de oro y sietes", () => {
    const s = conPilas(
      [
        ["7-oro", "7-copa", "1-oro", "2-oro", "3-basto"],
        ["7-espada", "4-copa", "5-copa"],
      ],
      [2, 1],
    );
    const { bandos, categorias } = contarRonda(s);
    expect(categorias).toEqual({ cartas: 0, oros: 0, sieteDeOro: 0, sietes: 0 });
    expect(bandos[0]!.puntos).toBe(2 + 4);
    expect(bandos[1]!.puntos).toBe(1);
  });

  it("en empate de una categoría nadie la cobra", () => {
    const s = conPilas(
      [
        ["7-oro", "1-copa"],
        ["7-espada", "2-copa"],
      ],
      [0, 0],
    );
    const { categorias } = contarRonda(s);
    expect(categorias.cartas).toBeNull();
    expect(categorias.sietes).toBeNull();
    expect(categorias.sieteDeOro).toBe(0);
  });

  it("en parejas se suma lo de los dos compañeros", () => {
    const s = conPilas([["1-oro"], ["2-copa"], ["3-oro"], []], [1, 0, 1, 0], { players: 4, parejas: true });
    const { bandos } = contarRonda(s);
    expect(bandos).toHaveLength(2);
    expect(bandos[0]!.cartas).toBe(2);
    expect(bandos[0]!.escobas).toBe(2);
    expect(bandos[0]!.oros).toBe(2);
  });

  it("gana el que llega a la meta; si empatan arriba, se juega otra ronda", () => {
    const s = setup({ hands: [["7-oro"], ["4-oro"]], mesa: ["10-espada"], score: [14, 14] });
    let r = act(s, 0, tirar("7-oro", ["10-espada"]));
    r = act(r.state, 1, tirar("4-oro"));
    // El 0: escoba + 7 de oro + sietes + (cartas 2 vs 1 con el sobrante del 4 para el último que levantó → 3) → gana.
    expect(r.state.winner).toBe(0);
    const empate = setup({ hands: [["1-copa"], ["2-copa"]], mesa: [], score: [15, 15] });
    let r2 = act(empate, 0, tirar("1-copa"));
    r2 = act(r2.state, 1, tirar("2-copa"));
    expect(r2.state.winner).toBeNull();
    expect(r2.events.some((e) => e.type === "nueva-ronda")).toBe(true);
  });
});

describe("vista y simulación", () => {
  it("la vista no muestra las cartas de los demás ni el mazo", () => {
    const s = escoba.initialState({ ...DEFAULT_ESCOBA_CONFIG, players: 3 }, P.slice(0, 3), "vista");
    const v = JSON.stringify(escoba.getPlayerView(s, "a"));
    for (const x of [...s.hands[1]!, ...s.hands[2]!, ...s.mazo]) expect(v).not.toContain(`"${x.id}"`);
  });

  it(
    "partidas entre bots: terminan y cada ronda reparte las 40 cartas",
    () => {
      const configs: EscobaConfig[] = [
        { ...DEFAULT_ESCOBA_CONFIG },
        { ...DEFAULT_ESCOBA_CONFIG, players: 3, levantarObligatorio: true },
        { ...DEFAULT_ESCOBA_CONFIG, players: 4, parejas: true, target: 21 },
        { ...DEFAULT_ESCOBA_CONFIG, players: 4, target: 31 },
      ];
      for (let g = 0; g < 200; g++) {
        const config = configs[g % configs.length]!;
        const skills = Array.from({ length: config.players }, (_, i) => ((g + i * 3) % 10) + 1);
        const { state } = playEscobaBotGame(config, skills, `sim-${g}`);
        expect(state.winner).not.toBeNull();
        for (const h of state.history) expect(h.bandos.reduce((a, b) => a + b.cartas, 0)).toBe(40);
        expect(state.score[state.winner!]).toBeGreaterThanOrEqual(config.target);
      }
    },
    120_000,
  );

  it(
    "en cada paso se conservan las 40 cartas",
    () => {
      let s = escoba.initialState({ ...DEFAULT_ESCOBA_CONFIG, players: 3 }, P.slice(0, 3), "conserva");
      for (let step = 0; step < 2000 && s.winner === null; step++) {
        const all = [...s.hands.flat(), ...s.mesa, ...s.mazo, ...s.pilas.flat()].map((x) => x.id);
        expect(new Set(all).size).toBe(40);
        expect(all.length).toBe(40);
        const id = s.players[s.turn]!;
        const a = escoba.getValidActions(s, id)[step % escoba.getValidActions(s, id).length]!;
        const r = escoba.applyAction(s, id, a);
        expect(r.ok).toBe(true);
        if (r.ok) s = r.state;
      }
      expect(createDeck({ size: 40 })).toHaveLength(40);
    },
    60_000,
  );

  it(
    "el nivel 10 le gana al nivel 1 la mayoría de las veces",
    () => {
      let wins = 0;
      const games = 200;
      for (let g = 0; g < games; g++) {
        const strong = g % 2;
        const { state } = playEscobaBotGame({ ...DEFAULT_ESCOBA_CONFIG }, strong === 0 ? [10, 1] : [1, 10], `f-${g}`);
        if (state.winner === strong) wins++;
      }
      expect(wins / games).toBeGreaterThan(0.65);
    },
    120_000,
  );

  it("el perfil escala con el nivel", () => {
    expect(escobaProfile(1).errorRate).toBeGreaterThan(escobaProfile(10).errorRate);
  });
});
