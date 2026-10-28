import { describe, expect, it } from "vitest";
import { createDeck, deal, shuffle } from "./deck.ts";
import { createRng } from "./rng.ts";

describe("mezclar", () => {
  const deck = createDeck({ size: 40 });

  it("devuelve una permutación del mazo sin mutarlo", () => {
    const before = deck.map((c) => c.id);
    const [shuffled] = shuffle(deck, createRng("a"));
    expect(deck.map((c) => c.id)).toEqual(before);
    expect(shuffled.map((c) => c.id).sort()).toEqual([...before].sort());
    expect(shuffled.map((c) => c.id)).not.toEqual(before);
  });

  it("es reproducible con la misma semilla", () => {
    const [a] = shuffle(deck, createRng("partida-42"));
    const [b] = shuffle(deck, createRng("partida-42"));
    const [c] = shuffle(deck, createRng("partida-43"));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("encadena el estado del rng (dos mezclas seguidas son distintas)", () => {
    const [first, rng2] = shuffle(deck, createRng("x"));
    const [second] = shuffle(deck, rng2);
    expect(first).not.toEqual(second);
  });

  it("todas las posiciones son equiprobables (chi-cuadrado sobre la primera carta)", () => {
    const small = [0, 1, 2, 3, 4, 5];
    const counts = new Map<number, number>();
    let rng = createRng("uniformidad");
    const n = 60_000;
    for (let i = 0; i < n; i++) {
      const [s, next] = shuffle(small, rng);
      rng = next;
      counts.set(s[0]!, (counts.get(s[0]!) ?? 0) + 1);
    }
    const expected = n / small.length;
    const chi2 = [...counts.values()].reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    // 5 grados de libertad, p=0.001 → 20.52
    expect(chi2).toBeLessThan(20.52);
  });

  it("las 6 permutaciones de 3 elementos salen con frecuencia pareja", () => {
    const counts = new Map<string, number>();
    let rng = createRng("perms");
    const n = 60_000;
    for (let i = 0; i < n; i++) {
      const [s, next] = shuffle(["a", "b", "c"], rng);
      rng = next;
      counts.set(s.join(""), (counts.get(s.join("")) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    const expected = n / 6;
    const chi2 = [...counts.values()].reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(20.52);
  });
});

describe("repartir", () => {
  const deck = createDeck({ size: 40 });

  it("reparte de a una carta por vuelta empezando por firstPlayer", () => {
    const { hands, rest } = deal(deck, { players: 4, cardsEach: 3, firstPlayer: 1 });
    expect(hands.map((h) => h.length)).toEqual([3, 3, 3, 3]);
    expect(rest).toHaveLength(28);
    // La primera carta del mazo la recibe el jugador 1, la segunda el 2...
    expect(hands[1]![0]).toEqual(deck[0]);
    expect(hands[2]![0]).toEqual(deck[1]);
    expect(hands[0]![0]).toEqual(deck[3]);
    expect(hands[1]![1]).toEqual(deck[4]);
  });

  it("reparte de a tandas", () => {
    const { hands } = deal(deck, { players: 2, cardsEach: 7, style: "de-a-tandas" });
    expect(hands[0]).toEqual(deck.slice(0, 7));
    expect(hands[1]).toEqual(deck.slice(7, 14));
  });

  it("nunca duplica ni pierde cartas", () => {
    const [shuffled] = shuffle(deck, createRng("reparto"));
    const { hands, rest } = deal(shuffled, { players: 6, cardsEach: 3 });
    const all = [...hands.flat(), ...rest].map((c) => c.id).sort();
    expect(all).toEqual(deck.map((c) => c.id).sort());
  });

  it("falla si no alcanzan las cartas", () => {
    expect(() => deal(deck, { players: 6, cardsEach: 7 })).toThrow(/No alcanzan/);
  });
});
