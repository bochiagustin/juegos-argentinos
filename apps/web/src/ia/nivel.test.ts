import { describe, expect, it } from "vitest";
import { botRating, DEFAULT_RATING, nivelNombre, skillForRating, updateRating } from "./nivel.ts";

describe("nivel adaptativo", () => {
  it("arranca en un nivel bajo", () => {
    expect(skillForRating(DEFAULT_RATING)).toBe(3);
  });

  it("nivel y rating son consistentes y acotados", () => {
    for (let s = 1; s <= 10; s++) expect(skillForRating(botRating(s))).toBe(s);
    expect(skillForRating(0)).toBe(1);
    expect(skillForRating(5000)).toBe(10);
  });

  it("ganar sube y perder baja; ganarle a uno más fuerte sube más", () => {
    expect(updateRating(900, 3, true)).toBeGreaterThan(900);
    expect(updateRating(900, 3, false)).toBeLessThan(900);
    expect(updateRating(900, 8, true) - 900).toBeGreaterThan(updateRating(900, 2, true) - 900);
  });

  it("ganando seguido, la máquina se pone más brava", () => {
    let r = DEFAULT_RATING;
    const start = skillForRating(r);
    for (let i = 0; i < 12; i++) r = updateRating(r, skillForRating(r), true);
    expect(skillForRating(r)).toBeGreaterThan(start + 2);
  });

  it("tiene nombres criollos", () => {
    expect(nivelNombre(1)).toBe("Principiante");
    expect(nivelNombre(5)).toBe("Baqueano");
    expect(nivelNombre(10)).toBe("Leyenda");
  });
});
