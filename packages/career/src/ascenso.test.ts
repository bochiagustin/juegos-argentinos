import { describe, expect, it } from "vitest";
import { calendario, fixture, idReal, iniciarAscenso, normalizarAscenso, nuevaTemporada, proximoPartido, registrarAscenso, tablaOrdenada, YO_CLUB, type AscensoProgress } from "./ascenso.ts";
import { defaultCareer, normalizeCareer, registrarPartida } from "./career.ts";
import { CATEGORIAS, CLUBES, club, TAMANO } from "./clubes.ts";

/** Juega toda una temporada mía con `gano(partido)` y devuelve el progreso en la fase "fin". */
function temporada(p0: AscensoProgress, gano: (n: number) => boolean): AscensoProgress {
  let p = p0;
  for (let n = 0; ; n++) {
    const prox = proximoPartido(p);
    if (!prox) break;
    const r = registrarAscenso(p, prox.rival, gano(n));
    expect(r).not.toBeNull();
    p = r!.progreso;
    invariantes(p);
    expect(n).toBeLessThan(40);
  }
  expect(p.fase).toBe("fin");
  return p;
}

function invariantes(p: AscensoProgress) {
  const todos = CATEGORIAS.flatMap((c) => p.categorias[c]);
  expect(todos.length).toBe(116);
  expect(new Set(todos).size).toBe(116);
  expect(todos).not.toContain(p.miClub);
  for (const c of CATEGORIAS) expect(p.categorias[c].length).toBe(TAMANO[c]);
  expect(p.copa[0]!.length).toBe(32);
  expect(new Set(p.copa[0]).size).toBe(32);
  expect(p.copa[0]).toContain(YO_CLUB);
}

describe("Ascenso", () => {
  it("arranca en la C (28 equipos: 27 fechas + 5 de copa) con el club que elegiste", () => {
    const p = iniciarAscenso("t", "lugano");
    invariantes(p);
    expect(p.categorias.c).toContain(YO_CLUB);
    expect(idReal(p, YO_CLUB)).toBe("lugano");
    expect(CLUBES.length).toBe(116);
    expect(calendario(28).length).toBe(32);
    expect(calendario(30).filter((f) => f.tipo === "copa").length).toBe(5);
    expect(proximoPartido(p)!.titulo).toBe("Fecha 1");
  });

  it("si elegís un club de Primera, baja a la C y cada categoría sube a su mejor", () => {
    const p = iniciarAscenso("river", "river-plate");
    invariantes(p);
    // Subió el mejor de la Nacional, de la B y de la C (cada uno de nivel máximo en su categoría).
    const subio = (cat: "primera" | "nacional" | "b", de: string) => p.categorias[cat].filter((id) => club(id)!.categoria === de);
    expect(subio("primera", "nacional").length).toBe(1);
    expect(subio("nacional", "b").length).toBe(1);
    expect(subio("b", "c").length).toBe(1);
    expect(club(subio("primera", "nacional")[0]!)!.nivel).toBe(8);
  });

  it("el fixture es todos contra todos, una vez", () => {
    const p = iniciarAscenso("fixture", "lugano");
    const vistos = new Set<string>();
    for (let f = 1; f <= 27; f++) {
      const fecha = fixture(p.orden, f);
      expect(new Set(fecha.flat()).size).toBe(28);
      for (const [a, b] of fecha) vistos.add([a, b].sort().join("|"));
    }
    expect(vistos.size).toBe((28 * 27) / 2);
  });

  it("una revancha (o cualquier rival que no toca) no cuenta", () => {
    const p = iniciarAscenso("rev", "lugano");
    const otro = p.categorias.c.find((id) => id !== YO_CLUB && id !== proximoPartido(p)!.rival)!;
    expect(registrarAscenso(p, otro, true)).toBeNull();
  });

  it("ganando todo: 1º en cada categoría, sube hasta Primera y sale campeón (y gana la Copa)", () => {
    let p = iniciarAscenso("todo", "lugano");
    for (const esperada of ["b", "nacional", "primera"] as const) {
      p = temporada(p, () => true);
      expect(p.resumen!.puesto).toBe(1);
      expect(p.resumen!.resultado).toBe("ascenso");
      expect(p.resumen!.copa).toBe(5);
      expect(p.resumen!.nueva).toBe(esperada);
      p = nuevaTemporada(p);
      invariantes(p);
    }
    p = temporada(p, () => true);
    expect(p.resumen!.resultado).toBe("campeon");
    expect(p.historial.length).toBe(4);
  });

  it("perdiendo todo en la C no hay descenso; en la B se desciende", () => {
    let p = temporada(iniciarAscenso("nada", "lugano"), () => false);
    expect(p.resumen!.resultado).toBe("queda");
    expect(p.resumen!.nueva).toBe("c");
    expect(p.resumen!.copa).toBe(0);
    p = temporada(nuevaTemporada(temporada(nuevaTemporada(p), () => true)), () => false);
    expect(p.resumen!.categoria).toBe("b");
    expect(p.resumen!.resultado).toBe("descenso");
    expect(p.resumen!.nueva).toBe("c");
  });

  it("del 2º al 8º se juega el Reducido, y ganándolo se asciende", () => {
    // Pierde las primeras 6 fechas y gana el resto: queda en zona de Reducido.
    for (let s = 0; s < 30; s++) {
      const p0 = iniciarAscenso(`red-${s}`, "lugano");
      let p = p0;
      let liga = 0;
      for (;;) {
        const prox = proximoPartido(p);
        if (!prox) break;
        const gano = prox.etapa === "liga" ? liga++ >= 5 : true;
        p = registrarAscenso(p, prox.rival, gano)!.progreso;
        if (p.fase === "reducido" || p.fase === "fin") break;
      }
      const puesto = tablaOrdenada(p).find((x) => x.id === YO_CLUB)!.puesto;
      if (puesto === 1) continue;
      expect(puesto).toBeLessThanOrEqual(8);
      expect(p.fase).toBe("reducido");
      const fin = temporada(p, () => true);
      expect(fin.resumen!.resultado).toBe("ascenso-reducido");
      expect(fin.resumen!.nueva).toBe("b");
      return;
    }
    throw new Error("Nunca quedó del 2º al 8º");
  });

  it("muchas temporadas al azar: siempre cierra y nunca se pierden clubes", () => {
    let p = iniciarAscenso("azar", "lugano");
    let k = 0;
    for (let t = 0; t < 12; t++) {
      p = nuevaTemporada(temporada(p, () => (k = (k * 1103515245 + 12345) % 2 ** 31) % 3 !== 0));
      invariantes(p);
    }
    expect(p.temporada).toBe(13);
  });

  it("los clubes de categorías más altas son mejores, y cada categoría tiene su cantidad real", () => {
    for (const c of CATEGORIAS) expect(CLUBES.filter((x) => x.categoria === c).length).toBe(TAMANO[c]);
    const prom = (c: string) => {
      const xs = CLUBES.filter((x) => x.categoria === c);
      return xs.reduce((a, x) => a + x.nivel, 0) / xs.length;
    };
    expect(prom("c")).toBeLessThan(prom("b"));
    expect(prom("b")).toBeLessThan(prom("nacional"));
    expect(prom("nacional")).toBeLessThan(prom("primera"));
  });

  it("se guarda y se lee; con datos rotos arranca de nuevo", () => {
    const p = temporada(iniciarAscenso("guardar", "lugano"), () => true);
    expect(normalizarAscenso(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(normalizarAscenso({ ...p, categorias: { ...p.categorias, c: [] } })).toBeNull();
    const c = normalizeCareer({ ...defaultCareer(), ascensos: { truco: p, chinchon: { roto: true } } });
    expect(c.ascensos.truco).toEqual(p);
    expect(c.ascensos.chinchon).toBeUndefined();
  });

  it("en la carrera: el partido del Ascenso suma fósforos, líneas y logros", () => {
    let s = { ...defaultCareer(), ascensos: { truco: iniciarAscenso("carrera", "lugano") } };
    for (;;) {
      const prox = proximoPartido(s.ascensos.truco!);
      if (!prox) break;
      const r = registrarPartida(s, { game: "truco", ganada: true, rivalId: `ascenso:${prox.rival}`, hechos: [], ahora: 1 });
      expect(r.premio.ascenso!.lineas.length).toBeGreaterThan(0);
      s = r.state as typeof s;
    }
    expect(s.logros.ascenso).toBeDefined();
    expect(s.logros["copa-argentina"]).toBeDefined();
    // La revancha contra el último rival ya no cuenta para el torneo.
    const r = registrarPartida(s, { game: "truco", ganada: true, rivalId: "ascenso:river-plate", hechos: [], ahora: 2 });
    expect(r.premio.ascenso).toBeNull();
  });
});
