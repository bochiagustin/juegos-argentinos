import { describe, expect, it } from "vitest";
import { createRng, nextFloat, nextInt, pick, randomSeed, type RngState } from "./rng.ts";

function sequence(seed: string, n: number, max: number): number[] {
  let s = createRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const [v, next] = nextInt(s, max);
    out.push(v);
    s = next;
  }
  return out;
}

describe("rng con semilla", () => {
  it("es determinístico: misma semilla, misma secuencia", () => {
    expect(sequence("sala-ABCD", 50, 1000)).toEqual(sequence("sala-ABCD", 50, 1000));
  });

  it("semillas parecidas dan secuencias distintas", () => {
    expect(sequence("ronda-1", 20, 1000)).not.toEqual(sequence("ronda-2", 20, 1000));
  });

  it("es puro: no muta el estado recibido", () => {
    const s = createRng("x");
    const copy = [...s];
    nextInt(s, 10);
    nextFloat(s);
    expect([...s]).toEqual(copy);
  });

  it("el estado es serializable a JSON y se puede retomar", () => {
    let s = createRng("persistir");
    for (let i = 0; i < 7; i++) s = nextInt(s, 40)[1];
    const restored = JSON.parse(JSON.stringify(s)) as RngState;
    expect(nextInt(restored, 1000)).toEqual(nextInt(s, 1000));
  });

  it("nextFloat está en [0, 1)", () => {
    let s = createRng("floats");
    for (let i = 0; i < 10_000; i++) {
      const [f, next] = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      s = next;
    }
  });

  it("nextInt es aproximadamente uniforme (chi-cuadrado)", () => {
    const buckets = 10;
    const n = 100_000;
    const counts = new Array<number>(buckets).fill(0);
    for (const v of sequence("uniforme", n, buckets)) counts[v]!++;
    const expected = n / buckets;
    const chi2 = counts.reduce((acc, c) => acc + (c - expected) ** 2 / expected, 0);
    // 9 grados de libertad, p=0.001 → 27.88
    expect(chi2).toBeLessThan(27.88);
  });

  it("valida el rango", () => {
    const s = createRng("x");
    expect(() => nextInt(s, 0)).toThrow();
    expect(() => nextInt(s, 1.5)).toThrow();
    expect(() => pick(s, [])).toThrow();
  });

  it("randomSeed genera semillas distintas", () => {
    expect(randomSeed()).not.toBe(randomSeed());
    expect(randomSeed()).toMatch(/^[0-9a-f]{32}$/);
  });
});
