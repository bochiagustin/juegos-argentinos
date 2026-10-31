import { describe, expect, it } from "vitest";
import { agenda, anioTemporada, armarCalendario, hoy, fixture, idReal, sorteoPendiente, marcarSorteoVisto, iniciarAscenso, normalizarAscenso, nuevaTemporada, proximoPartido, registrarAscenso, tablaOrdenada, YO_CLUB, type AscensoProgress } from "./ascenso.ts";
import { defaultCareer, normalizeCareer, registrarPartida } from "./career.ts";
import { CATEGORIAS, CLUBES, club, EXTERIOR, TAMANO } from "./clubes.ts";
import { pasosCopa } from "./copas.ts";

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
    expect(n).toBeLessThan(120);
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
  const ca = p.copas["copa-argentina"]!.rondas[0]!.flatMap((x) => [x.a, x.b]);
  expect(new Set(ca).size).toBe(32);
  expect(ca).toContain(YO_CLUB);
  for (const id of ["libertadores", "sudamericana"] as const) {
    const g = p.copas[id]!.grupos!;
    expect(g.length).toBe(8);
    expect(new Set(g.flat()).size).toBe(32);
    expect(g.flat().filter((x) => EXTERIOR.some((e) => e.id === x)).length).toBe(26);
  }
  expect(p.copas["copa-liga"]!.grupos!.flat().length).toBe(30);
  // Todo lo que queda en el calendario tiene su paso en la copa.
  for (const s of p.calendario.slice(p.paso)) if (s.t === "copa") expect(p.copas[s.id]).toBeDefined();
}

describe("Ascenso", () => {
  it("arranca en la C (28 equipos: 27 fechas) con el club que elegiste y todas las copas", () => {
    const p = iniciarAscenso("t", "lugano");
    invariantes(p);
    expect(p.categorias.c).toContain(YO_CLUB);
    expect(idReal(p, YO_CLUB)).toBe("lugano");
    expect(CLUBES.length).toBe(116);
    // 27 fechas + Supercopa + Recopa + Copa Argentina (5) + Copa de la Liga (15 de zona + 3 cruces) + 2 × (6 de grupos + 4 cruces).
    expect(p.calendario.filter((s) => s.t === "liga").length).toBe(27);
    expect(p.calendario.length).toBe(27 + 2 + 5 + 18 + 20);
    expect(pasosCopa(p.copas["copa-liga"]!)).toBe(18);
    expect(pasosCopa(p.copas.libertadores!)).toBe(10);
    // La Supercopa y la Recopa (sin mí) ya se jugaron: arranca por la fecha 1.
    expect(p.copas.supercopa!.campeon).not.toBeNull();
    expect(proximoPartido(p)!.titulo).toBe("Fecha 1");
    // El calendario termina con la liga.
    expect(armarCalendario(21, p.copas).at(-1)).toEqual({ t: "liga", fecha: 21 });
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

  it("ganando todo: sube hasta Primera, sale campeón y gana todas las copas que juega", () => {
    let p = iniciarAscenso("todo", "lugano");
    p = temporada(p, () => true);
    expect(p.resumen!.resultado).toBe("ascenso");
    expect(p.resumen!.titulos).toEqual(["copa-argentina", "liga-c"]);
    // Campeón de la Copa Argentina → Libertadores y Supercopa.
    expect(p.resumen!.clasificado).toEqual(["libertadores"]);
    expect(p.siguiente.supercopa).toContain(YO_CLUB);
    for (const esperada of ["nacional", "primera"] as const) {
      p = nuevaTemporada(p);
      invariantes(p);
      expect(proximoPartido(p)!.copa).toBe("supercopa");
      p = temporada(p, () => true);
      expect(p.resumen!.puesto).toBe(1);
      expect(p.resumen!.nueva).toBe(esperada);
      expect(p.resumen!.titulos).toEqual(expect.arrayContaining(["supercopa", "copa-argentina", "libertadores"]));
    }
    p = temporada(nuevaTemporada(p), () => true);
    expect(p.resumen!.resultado).toBe("campeon");
    expect(p.resumen!.titulos).toEqual(expect.arrayContaining(["copa-liga", "libertadores", "liga-primera", "recopa"]));
    expect(p.historial.length).toBe(4);
    expect(p.titulos.filter((t) => t.id === "libertadores").length).toBe(3);
  });

  it("las finales y la Libertadores son un nivel más difíciles", () => {
    let p = iniciarAscenso("dificil", "lugano");
    for (;;) {
      const prox = proximoPartido(p)!;
      const base = club(prox.rival)?.nivel ?? 5;
      expect(prox.nivel).toBe(Math.min(10, base + (prox.final || prox.copa === "libertadores" ? 1 : 0)));
      if (prox.final) break;
      p = registrarAscenso(p, prox.rival, true)!.progreso;
    }
  });

  it("el bolillero: cada sorteo se muestra una vez", () => {
    let p = iniciarAscenso("sorteo", "lugano");
    while (proximoPartido(p)!.etapa === "liga") p = registrarAscenso(p, proximoPartido(p)!.rival, true)!.progreso;
    const s = sorteoPendiente(p)!;
    expect(s.partido.copa).toBe("copa-argentina");
    p = marcarSorteoVisto(p, s.clave);
    expect(sorteoPendiente(p)).toBeNull();
  });

  it("perdiendo todo en la C no hay descenso; en la B se desciende", () => {
    let p = temporada(iniciarAscenso("nada", "lugano"), () => false);
    expect(p.resumen!.resultado).toBe("queda");
    expect(p.resumen!.nueva).toBe("c");
    expect(p.resumen!.copas).toEqual([{ id: "copa-argentina", alcance: "16avos de final" }]);
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
    expect(s.contadores["titulo:liga-c"]).toBe(1);
    // La revancha contra el último rival ya no cuenta para el torneo.
    const r = registrarPartida(s, { game: "truco", ganada: true, rivalId: "ascenso:river-plate", hechos: [], ahora: 2 });
    expect(r.premio.ascenso).toBeNull();
  });

  it("calendario: de enero a diciembre, liga los domingos, nunca dos partidos el mismo día, con los resultados", () => {
    let p = iniciarAscenso("calendario", "lugano");
    for (let t = 0; t < 3; t++) {
      const anio = String(anioTemporada(p));
      let ag = agenda(p);
      expect(ag.filter((d) => d.proximo).length).toBe(1);
      expect(hoy(p)).toBe(ag.find((d) => d.proximo)!.fecha);
      for (let n = 0; n < 200 && proximoPartido(p); n++) {
        p = registrarAscenso(p, proximoPartido(p)!.rival, n % 4 !== 0)!.progreso;
        ag = agenda(p);
        const dias = ag.map((d) => d.fecha);
        expect(new Set(dias).size).toBe(dias.length);
        expect(dias.every((d) => d.startsWith(anio))).toBe(true);
        expect(dias.slice().sort()).toEqual(dias);
        for (const d of ag.filter((x) => x.etapa === "liga")) expect(new Date(d.fecha + "T12:00:00Z").getUTCDay()).toBe(0);
      }
      // Al final, todos los partidos que jugué tienen resultado y no queda ninguno "próximo".
      expect(ag.every((d) => d.gane !== undefined)).toBe(true);
      expect(ag.filter((d) => d.etapa === "liga").length).toBe(TAMANO[p.resumen!.categoria] - 1);
      expect(hoy(p)).toBe(`${anio}-12-31`);
      p = nuevaTemporada(p);
    }
  });
});
