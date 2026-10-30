import { describe, expect, it } from "vitest";
import { acumular, claveReporte, ordenar, sanearReportes } from "./reportes.ts";

describe("reportes de palabras", () => {
  it("sanea lo que llega: textos cortos, sin basura, hasta 50", () => {
    expect(sanearReportes("hola")).toEqual([]);
    expect(sanearReportes([{ categoria: " Animal ", palabra: "  yaguarundí  ", letra: "y" }, { palabra: "x" }, null, 3])).toEqual([{ categoria: "Animal", palabra: "yaguarundí", letra: "Y" }]);
    expect(sanearReportes(Array.from({ length: 80 }, () => ({ categoria: "Cosa", palabra: "birome", letra: "B" })))).toHaveLength(50);
    expect(sanearReportes([{ categoria: "Cosa", palabra: "a".repeat(200), letra: "A" }])[0]!.palabra).toHaveLength(40);
  });

  it("acumula por categoría y palabra (sin importar mayúsculas) y ordena por las más reportadas", () => {
    const r = { categoria: "Animal", palabra: "Yaguarundí", letra: "Y" };
    expect(claveReporte(r)).toBe(claveReporte({ ...r, palabra: "yaguarundí" }));
    const a = acumular(acumular(undefined, r, 1), { ...r, letra: "Y" }, 5);
    expect(a).toEqual({ categoria: "Animal", palabra: "Yaguarundí", letras: ["Y"], veces: 2, primera: 1, ultima: 5 });
    const b = acumular(undefined, { categoria: "Cosa", palabra: "Birome", letra: "B" }, 9);
    expect(ordenar([b, a]).map((x) => x.palabra)).toEqual(["Yaguarundí", "Birome"]);
  });
});
