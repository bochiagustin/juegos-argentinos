import { describe, expect, it } from "vitest";
import { CLUBES, EXTERIOR } from "./clubes.ts";
import { alcanceEnCopa, copaEliminacion, copaGrupos, jugarPasoCopa, partidosDelPaso, pasoActual, pasosCopa, rivalEnCopa, tablaGrupo } from "./copas.ts";
import { nivelClub, YO_CLUB } from "./torneo.ts";

const primera = CLUBES.filter((c) => c.categoria === "primera").map((c) => c.id);
/** 31 de Primera y la Nacional + yo = 32. */
const treintaYDos = [...primera, ...CLUBES.filter((c) => c.categoria === "nacional").map((c) => c.id)].slice(0, 31).concat(YO_CLUB);

function jugarTodo(c0: ReturnType<typeof copaGrupos>, gano = true) {
  let c = c0;
  for (let i = 0; i < 40 && pasoActual(c); i++) {
    const rival = rivalEnCopa(c);
    c = jugarPasoCopa(c, "t", rival ? (gano ? YO_CLUB : rival) : undefined);
  }
  return c;
}

describe("Copas", () => {
  it("sorteo por bombos: los 8 mejores quedan uno por grupo", () => {
    const equipos = treintaYDos;
    const c = copaGrupos("libertadores", equipos, 8, 2, 2, "bombos");
    const top = equipos.slice().sort((a, b) => nivelClub(b) - nivelClub(a))[0]!;
    expect(c.grupos!.every((g) => g.length === 4)).toBe(true);
    expect(c.grupos!.filter((g) => g.includes(top)).length).toBe(1);
    expect(pasosCopa(c)).toBe(6 + 4);
  });

  it("en las internacionales no caen dos argentinos en el mismo grupo", () => {
    const ext = EXTERIOR.filter((c) => c.copa === "libertadores").map((c) => c.id);
    for (let k = 0; k < 20; k++) {
      const c = copaGrupos("libertadores", [...primera.slice(0, 5), YO_CLUB, ...ext], 8, 2, 2, `pais-${k}`);
      for (const g of c.grupos!) expect(g.filter((x) => !EXTERIOR.some((e) => e.id === x)).length).toBeLessThanOrEqual(1);
    }
  });

  it("grupos a dos ruedas: cada uno juega 6 y pasan 2 de cada grupo a octavos (1º contra 2º de otro grupo)", () => {
    let c = copaGrupos("libertadores", treintaYDos, 8, 2, 2, "grupos");
    for (let f = 0; f < 6; f++) c = jugarPasoCopa(c, "t", rivalEnCopa(c) ? YO_CLUB : undefined);
    for (let g = 0; g < 8; g++) for (const { fila } of tablaGrupo(c, g)) expect(fila.pj).toBe(6);
    expect(c.rondas[0]!.length).toBe(8);
    const primeros = c.grupos!.map((_, g) => tablaGrupo(c, g)[0]!.id);
    for (const x of c.rondas[0]!) expect(primeros.includes(x.a) && primeros.includes(x.b)).toBe(false);
    expect(alcanceEnCopa(c)).toBe("Octavos de final");
  });

  it("Copa de la Liga: 2 zonas de 15 (una fecha libre cada uno: 15 fechas, 14 partidos) y cuartos 1A-4B…", () => {
    let c = copaGrupos("copa-liga", primera, 2, 1, 4, "liga");
    expect(c.grupos!.map((g) => g.length)).toEqual([15, 15]);
    expect(partidosDelPaso(c).length).toBe(14);
    expect(pasosCopa(c)).toBe(15 + 3);
    for (let f = 0; f < 15; f++) c = jugarPasoCopa(c, "t");
    for (let g = 0; g < 2; g++) for (const { fila } of tablaGrupo(c, g)) expect(fila.pj).toBe(14);
    const [A, B] = [0, 1].map((g) => tablaGrupo(c, g).map((x) => x.id)) as [string[], string[]];
    expect(c.rondas[0]).toEqual([
      { a: A[0], b: B[3] },
      { a: B[1], b: A[2] },
      { a: B[0], b: A[3] },
      { a: A[1], b: B[2] },
    ]);
    c = jugarTodo(c);
    expect(c.campeon).not.toBeNull();
  });

  it("eliminación directa: ganando todo, campeón; perdiendo, afuera en la primera", () => {
    const equipos = treintaYDos;
    expect(jugarTodo(copaEliminacion("copa-argentina", equipos) as never).campeon).toBe(YO_CLUB);
    const c = jugarTodo(copaEliminacion("copa-argentina", equipos) as never, false);
    expect(alcanceEnCopa(c)).toBe("16avos de final");
    expect(c.campeon).not.toBe(YO_CLUB);
  });
});
