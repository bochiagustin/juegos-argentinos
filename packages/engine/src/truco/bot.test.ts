import { describe, expect, it } from "vitest";
import { cardFromId, createRng, type Rasgos, type SuitedCard } from "../core/index.ts";
import { chooseTrucoAction, manoAsegurada } from "./bot.ts";
import { truco } from "./game.ts";
import { DEFAULT_TRUCO_CONFIG, type TrucoAction, type TrucoState } from "./types.ts";

const c = (id: string) => cardFromId(id) as SuitedCard;
const P = ["a", "b"];

function setup(hands: string[][], score: [number, number] = [0, 0]): TrucoState {
  const s = truco.initialState({ ...DEFAULT_TRUCO_CONFIG, players: 2 }, P, "test");
  s.round.mano = 0;
  s.round.turn = 0;
  s.round.tricks = [{ leader: 0, plays: [] }];
  s.round.hands = hands.map((h) => h.map(c));
  s.round.dealt = hands.map((h) => h.map(c));
  s.score = score;
  return s;
}

function run(s: TrucoState, steps: [number, TrucoAction | string][]): TrucoState {
  let state = s;
  for (const [seat, a] of steps) {
    const action: TrucoAction = typeof a === "string" ? { type: "jugar", card: a as SuitedCard["id"] } : a;
    const r = truco.applyAction(state, P[seat]!, action);
    if (!r.ok) throw new Error(`Asiento ${seat}: ${r.error}`);
    state = r.state;
  }
  return state;
}

const T: TrucoAction = { type: "truco" };
const RASGOS: (Rasgos | undefined)[] = [undefined, { mentiroso: 10, pescador: 10, agresivo: 0 }, { mentiroso: 0, pescador: 0, agresivo: 10 }, { mentiroso: 10, pescador: 0, agresivo: 0 }];

/** Respuestas del asiento 1 en todos los niveles, con varios rasgos y semillas. */
function respuestas(state: TrucoState): TrucoAction["type"][] {
  const out: TrucoAction["type"][] = [];
  const view = truco.getPlayerView(state, "b");
  const valid = truco.getValidActions(state, "b");
  for (let skill = 1; skill <= 10; skill++)
    for (const rasgos of RASGOS)
      for (let i = 0; i < 15; i++) out.push(chooseTrucoAction(view, valid, createRng(`r-${skill}-${i}`), skill, rasgos)[0].type);
  return out;
}

describe("bot del truco: contesta con lógica", () => {
  it("con una baza ganada y el ancho de espada, nunca dice 'no quiero' al retruco", () => {
    // 1ª baza: 4 de copa contra 5 de oro (gana el bot). El bot canta truco y le retrucan.
    const s = run(setup([["4-copa", "3-oro", "2-copa"], ["5-oro", "1-espada", "6-copa"]]), [[0, "4-copa"], [1, "5-oro"], [1, T], [0, T]]);
    expect(manoAsegurada(truco.getPlayerView(s, "b"))).toBe(true);
    const r = respuestas(s);
    expect(r).not.toContain("no-quiero");
    expect(r.filter((t) => t === "truco").length).toBeGreaterThan(r.length / 2); // casi siempre sube a vale cuatro
  });

  it("con el ancho de espada y el de basto, quiere (o sube) el truco de entrada", () => {
    const s = run(setup([["4-copa", "3-oro", "2-copa"], ["1-basto", "1-espada", "6-copa"]]), [[0, T]]);
    const r = respuestas(s);
    expect(r).not.toContain("no-quiero");
  });

  it("con el ancho y dos cartas bajas, al retruco casi siempre quiere (no querer regala 2)", () => {
    const s = run(setup([["4-copa", "3-oro", "2-copa"], ["4-oro", "1-espada", "5-copa"]]), [[0, T], [1, { type: "quiero" }], [0, "4-copa"], [1, T]]);
    // El bot (asiento 1) cantó retruco; ahora el mano le sube y pregunta otra vez con vale cuatro.
    const s2 = run(s, [[0, T]]);
    const r = respuestas(s2);
    expect(r.filter((t) => t === "no-quiero").length).toBeLessThan(r.length * 0.1);
  });

  it("si no querer le da la partida al rival, quiere", () => {
    const s = run(setup([["4-copa", "3-oro", "2-copa"], ["4-oro", "5-espada", "6-copa"]], [29, 10]), [[0, T]]);
    expect(respuestas(s)).not.toContain("no-quiero");
  });

  it("con la mano perdida no quiere (salvo farol)", () => {
    // Perdió la 1ª y le queda un 4 contra un truco en la 2ª.
    const s = run(setup([["1-espada", "1-basto", "7-espada"], ["4-oro", "5-copa", "6-copa"]]), [[0, "1-espada"], [1, "4-oro"], [0, T]]);
    const r = respuestas(s);
    expect(r.filter((t) => t === "quiero").length).toBeLessThan(r.length * 0.1);
  });

  it("manoAsegurada no se engaña: el ancho solo, de entrada, no alcanza", () => {
    const s = setup([["4-copa", "3-oro", "2-copa"], ["4-oro", "1-espada", "5-copa"]]);
    expect(manoAsegurada(truco.getPlayerView(s, "b"))).toBe(false);
  });
});
