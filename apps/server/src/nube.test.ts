import { describe, expect, it } from "vitest";
import { copiaValida, MAX_NUBE, normalizarCodigoNube } from "./nube.ts";

describe("guardado en la nube", () => {
  it("normaliza el código (minúsculas, guiones, espacios) y rechaza los que no son", () => {
    expect(normalizarCodigoNube("mate-4823-gran")).toBe("MATE4823GRAN");
    expect(normalizarCodigoNube(" MATE 4823 GRAN ")).toBe("MATE4823GRAN");
    expect(normalizarCodigoNube("MATE-4823")).toBeNull();
    expect(normalizarCodigoNube("MATE-4820-GRAN")).toBeNull(); // el 0 no está (se confunde con la O)
    expect(normalizarCodigoNube("../../etc/passwd")).toBeNull();
  });

  it("solo guarda copias de la app y con tope de tamaño", () => {
    const copia = (datos: Record<string, string>) => JSON.stringify({ app: "juegos-argentinos", formato: 1, fecha: "", datos });
    expect(copiaValida(copia({ "juegos-argentinos:save": "{}" }))).toBe(true);
    expect(copiaValida("hola")).toBe(false);
    expect(copiaValida(JSON.stringify({ app: "otra", formato: 1, datos: {} }))).toBe(false);
    expect(copiaValida(copia({ x: "a".repeat(MAX_NUBE) }))).toBe(false);
  });
});
