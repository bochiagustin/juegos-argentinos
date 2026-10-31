import { describe, expect, it } from "vitest";
import { chooseGeneralaAction, playGeneralaBotGame } from "./bot.ts";
import { esGenerala, generala, planillaVacia, puntaje, total } from "./game.ts";
import { CATEGORIAS, type GeneralaState } from "./types.ts";

const P = ["a", "b"];

describe("Generala: puntaje", () => {
  it("al 1… al 6 suman esos dados", () => {
    expect(puntaje([3, 3, 3, 5, 1], "3", false)).toBe(9);
    expect(puntaje([3, 3, 3, 5, 1], "6", false)).toBe(0);
  });
  it("escalera 1-5, 2-6 y 3-4-5-6-1 (20, servida 25)", () => {
    expect(puntaje([5, 4, 3, 2, 1], "escalera", false)).toBe(20);
    expect(puntaje([2, 3, 4, 5, 6], "escalera", true)).toBe(25);
    expect(puntaje([3, 4, 5, 6, 1], "escalera", false)).toBe(20);
    expect(puntaje([1, 2, 3, 4, 6], "escalera", false)).toBe(0);
  });
  it("full 30/35, póker 40/45 (con 5 iguales también es póker), generala 50", () => {
    expect(puntaje([2, 2, 5, 5, 5], "full", false)).toBe(30);
    expect(puntaje([2, 2, 5, 5, 5], "full", true)).toBe(35);
    expect(puntaje([4, 4, 4, 4, 4], "full", false)).toBe(0);
    expect(puntaje([4, 4, 4, 4, 1], "poker", true)).toBe(45);
    expect(puntaje([4, 4, 4, 4, 4], "poker", false)).toBe(40);
    expect(puntaje([4, 4, 4, 4, 4], "generala", false)).toBe(50);
  });
  it("la doble vale 100 solo con la generala anotada con 50", () => {
    const p = planillaVacia();
    expect(puntaje([6, 6, 6, 6, 6], "doble", false, p)).toBe(0);
    p.generala = 50;
    expect(puntaje([6, 6, 6, 6, 6], "doble", false, p)).toBe(100);
    p.generala = 0;
    expect(puntaje([6, 6, 6, 6, 6], "doble", false, p)).toBe(0);
  });
});

describe("Generala: partida", () => {
  it("tres tiros como mucho, guardando dados; después hay que anotar", () => {
    let s = generala.initialState({ players: 2 }, P, "tiros");
    const go = (a: Parameters<typeof generala.applyAction>[2]) => {
      const r = generala.applyAction(s, P[s.turno]!, a);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    };
    expect(generala.applyAction(s, "a", { type: "anotar", categoria: "1" }).ok).toBe(false);
    go({ type: "tirar", guardar: [false, false, false, false, false] });
    const guardados = s.dados.slice(0, 2);
    go({ type: "tirar", guardar: [true, true, false, false, false] });
    expect(s.dados.slice(0, 2)).toEqual(guardados);
    go({ type: "tirar", guardar: [true, true, true, false, false] });
    expect(generala.getValidActions(s, "a").some((a) => a.type === "tirar")).toBe(false);
    go({ type: "anotar", categoria: "escalera" });
    expect(s.turno).toBe(1);
    expect(s.tiro).toBe(0);
  });

  it("la generala servida gana en el acto", () => {
    // Buscar una semilla en la que el primer tiro sea generala.
    for (let i = 0; i < 20000; i++) {
      const s = generala.initialState({ players: 2 }, P, `servida-${i}`);
      const r = generala.applyAction(s, "a", { type: "tirar", guardar: [false, false, false, false, false] });
      if (!r.ok) throw new Error(r.error);
      if (esGenerala(r.state.dados)) {
        expect(r.state.ganadores).toEqual([0]);
        expect(r.state.servida).toBe(0);
        expect(r.events.some((e) => e.type === "generala-servida")).toBe(true);
        return;
      }
    }
    throw new Error("No salió ninguna generala servida");
  });

  it("partidas entre bots: 11 casillas por jugador, puntajes válidos, siempre hay jugada", () => {
    for (let g = 0; g < 40; g++) {
      const n = (2 + (g % 5)) as 2 | 3 | 4 | 5 | 6;
      const { state } = playGeneralaBotGame({ players: n }, Array.from({ length: n }, (_, i) => ((g + i * 3) % 10) + 1), `sim-${g}`);
      expect(state.ganadores).not.toBeNull();
      if (state.servida === null) {
        for (const p of state.planillas) for (const c of CATEGORIAS) expect(p[c]).not.toBeNull();
        const totales = state.planillas.map(total);
        for (const w of state.ganadores!) expect(totales[w]).toBe(Math.max(...totales));
      }
    }
  }, 60000);

  it("el bot anota la generala cuando la tiene", () => {
    const s: GeneralaState = { ...generala.initialState({ players: 2 }, P, "g"), dados: [5, 5, 5, 5, 5], tiro: 2 };
    const [a] = chooseGeneralaAction(generala.getPlayerView(s, "a"), generala.getValidActions(s, "a"), s.rng, 10);
    expect(a).toEqual({ type: "anotar", categoria: "generala" });
  });

  it("el nivel 10 le gana al nivel 1 la mayoría de las veces", () => {
    let gana = 0;
    const N = 120;
    for (let g = 0; g < N; g++) {
      const fuerte = g % 2;
      const { state } = playGeneralaBotGame({ players: 2 }, fuerte === 0 ? [10, 1] : [1, 10], `fuerza-${g}`);
      if (state.ganadores!.length === 1 && state.ganadores![0] === fuerte) gana++;
    }
    expect(gana / N).toBeGreaterThan(0.6);
  }, 60000);
});
