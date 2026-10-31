import { describe, expect, it } from "vitest";
import { chooseChanchoAction, playChanchoBotGame } from "./bot.ts";
import { chancho, tieneCuatro } from "./game.ts";
import { MESA_CHANCHO, PALABRA, type ChanchoAction, type ChanchoState } from "./types.ts";

const P = ["a", "b", "c", "d"];

function go(s: ChanchoState, id: string, a: ChanchoAction): ChanchoState {
  const r = chancho.applyAction(s, id, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function cartasEnJuego(s: ChanchoState): number[] {
  return s.manos.flat().sort();
}

describe("Chancho va", () => {
  it("reparte 4 de cada figura (una figura por jugador) y 4 cartas a cada uno", () => {
    const s = chancho.initialState({ players: 4 }, P, "reparto");
    expect(s.manos.every((m) => m.length === 4)).toBe(true);
    expect(cartasEnJuego(s)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
  });

  it("todos pasan a la vez a la derecha la carta que eligieron", () => {
    let s = chancho.initialState({ players: 4 }, P, "pase");
    const antes = s.manos.map((m) => m.slice());
    P.forEach((id) => (s = go(s, id, { type: "elegir", carta: 0 })));
    s = go(s, MESA_CHANCHO, { type: "pasar" });
    for (let seat = 0; seat < 4; seat++) {
      expect(s.manos[seat]!.length).toBe(4);
      expect(s.manos[seat]!.at(-1)).toBe(antes[(seat + 3) % 4]![0]);
    }
    expect(cartasEnJuego(s)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    // La vista de otro no muestra mis cartas, solo cuántas tiene cada uno.
    const v = chancho.getPlayerView(s, "b");
    expect(v.mano).toEqual(s.manos[1]);
    expect("manos" in v).toBe(false);
    expect(v.manosFinales).toBeNull();
  });

  it("solo se toca la nariz primero con 4 iguales; el último en tocarla se lleva una letra", () => {
    let s = chancho.initialState({ players: 4 }, P, "nariz");
    s = { ...s, manos: [[2, 2, 2, 2], [0, 1, 3, 0], [1, 3, 0, 1], [3, 0, 1, 3]] };
    expect(chancho.applyAction(s, "b", { type: "nariz" }).ok).toBe(false);
    expect(tieneCuatro(s.manos[0]!)).toBe(true);
    s = go(s, "a", { type: "nariz" });
    expect(s.fase).toBe("nariz");
    s = go(s, "c", { type: "nariz" });
    s = go(s, "b", { type: "nariz" });
    expect(s.fase).toBe("fin-ronda");
    expect(s.perdieron).toEqual([3]);
    expect(s.letras).toEqual([0, 0, 0, 1]);
    s = go(s, MESA_CHANCHO, { type: "seguir" });
    expect(s.fase).toBe("pasando");
    expect(s.ronda).toBe(2);
  });

  it("si se acaba el tiempo de la nariz, todos los que no llegaron se llevan letra", () => {
    let s = chancho.initialState({ players: 4 }, P, "tiempo");
    s = { ...s, manos: [[2, 2, 2, 2], [0, 1, 3, 0], [1, 3, 0, 1], [3, 0, 1, 3]] };
    s = go(s, "a", { type: "nariz" });
    s = go(s, MESA_CHANCHO, { type: "cerrar-nariz" });
    expect(s.perdieron).toEqual([1, 2, 3]);
  });

  it("con CHANCHO completo quedás afuera, y se reparte con una figura menos", () => {
    let s = chancho.initialState({ players: 3 }, ["a", "b", "c"], "afuera");
    s = { ...s, letras: [0, PALABRA.length - 1, 0], manos: [[1, 1, 1, 1], [0, 2, 0, 2], [2, 0, 2, 0]] };
    s = go(s, "a", { type: "nariz" });
    s = go(s, "c", { type: "nariz" });
    expect(s.vivos).toEqual([true, false, true]);
    s = go(s, MESA_CHANCHO, { type: "seguir" });
    expect(s.manos[1]).toEqual([]);
    expect(cartasEnJuego(s)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
  });

  it("el bot junta la figura que más tiene y se toca la nariz cuando la completa", () => {
    const s = { ...chancho.initialState({ players: 4 }, P, "bot"), manos: [[1, 1, 1, 3], [0, 1, 3, 0], [2, 3, 0, 1], [3, 0, 2, 2]] };
    const [a] = chooseChanchoAction(chancho.getPlayerView(s, "a"), chancho.getValidActions(s, "a"), s.rng, 10);
    expect(a).toEqual({ type: "elegir", carta: 3 });
    // Todos nivel 10: no se quedan pasándose las cartas en ronda para siempre.
    for (let g = 0; g < 10; g++) expect(playChanchoBotGame({ players: 4 }, [10, 10, 10, 10], `ronda-${g}`).state.fase).toBe("fin");
    const s2 = { ...s, manos: [[1, 1, 1, 1], ...s.manos.slice(1)] };
    expect(chooseChanchoAction(chancho.getPlayerView(s2, "a"), chancho.getValidActions(s2, "a"), s.rng, 1)[0]).toEqual({ type: "nariz" });
  });

  it("partidas enteras entre bots: siempre termina con un ganador y nunca se pierden cartas", () => {
    for (let g = 0; g < 60; g++) {
      const n = (3 + (g % 4)) as 3 | 4 | 5 | 6;
      const { state } = playChanchoBotGame({ players: n }, Array.from({ length: n }, (_, i) => ((g + i * 3) % 10) + 1), `sim-${g}`);
      expect(state.fase).toBe("fin");
      expect(state.ganador).not.toBeNull();
      expect(state.vivos.filter(Boolean).length).toBe(1);
      expect(state.letras.filter((l) => l === PALABRA.length).length).toBe(n - 1);
    }
  });

  it("los rápidos (nivel 10) pierden menos que los lentos (nivel 1)", () => {
    let gana = 0;
    for (let g = 0; g < 60; g++) {
      const { state } = playChanchoBotGame({ players: 3 }, [10, 1, 1], `rapido-${g}`);
      if (state.ganador === 0) gana++;
    }
    expect(gana / 60).toBeGreaterThan(0.5);
  });
});
