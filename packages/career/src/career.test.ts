import { describe, expect, it } from "vitest";
import { comprar, defaultCareer, estadoGira, FOSFOROS_INICIALES, normalizeCareer, progresoDe, puestosDe, registrarPartida } from "./career.ts";
import { GIRA_TRUCO, GIRAS, LOGROS, PERSONAJES, REGIONES, TIENDA } from "./data.ts";
import { comoSeDesbloquea, FONDOS, fondoDesbloqueado, TIENDA_FONDOS } from "./fondos.ts";
import { SLOTS, YO, type CareerState, type Reporte } from "./types.ts";

const AHORA = 1_800_000_000_000;
const gano = (rivalId?: string, extra: Partial<Reporte> = {}): Reporte => ({ game: "truco", ganada: true, hechos: [], ahora: AHORA, ...(rivalId ? { rivalId } : {}), ...extra });
const pierdo = (rivalId?: string): Reporte => ({ game: "truco", ganada: false, hechos: [], ahora: AHORA, ...(rivalId ? { rivalId } : {}) });

function jugar(s: CareerState, reportes: Reporte[]) {
  let state = s;
  const premios = [];
  for (const r of reportes) {
    const res = registrarPartida(state, r);
    state = res.state;
    premios.push(res.premio);
  }
  return { state, premios };
}

/** Para subir una región entera de abajo para arriba: del "1" al "9" y el jefe. */
const escalera = (region: string) => SLOTS.map((slot) => `${region}-${slot}`);

describe("datos de la gira", () => {
  it("60 personajes, 10 por región, ids alineados con el arte y con historia y rasgos", () => {
    expect(PERSONAJES).toHaveLength(60);
    for (const r of REGIONES) expect(PERSONAJES.filter((p) => p.region === r.id).map((p) => p.slot)).toEqual([...SLOTS]);
    for (const p of PERSONAJES) {
      expect(p.id).toBe(`${p.region}-${p.slot}`);
      expect(p.historia.length).toBeGreaterThan(150);
      expect(p.aspecto.length).toBeGreaterThan(40);
      for (const v of Object.values(p.rasgos)) expect(v >= 0 && v <= 10).toBe(true);
    }
    expect(new Set(PERSONAJES.map((p) => p.nombre)).size).toBe(60);
  });

  it("cada gira tiene las 6 regiones y la dificultad sube", () => {
    for (const g of Object.values(GIRAS)) {
      expect(g.regiones.map((r) => r.region.id)).toEqual(REGIONES.map((r) => r.id));
      const jefes = g.regiones.map((r) => r.skills.jefe);
      expect([...jefes].sort((a, b) => a - b)).toEqual(jefes);
      expect(jefes[jefes.length - 1]).toBe(10);
      for (const r of g.regiones) {
        const niveles = SLOTS.map((s) => r.skills[s]);
        expect([...niveles].sort((a, b) => a - b)).toEqual(niveles);
      }
    }
  });
});

describe("gira con ranking", () => {
  it("arranca con Buenos Aires abierta, último en el ranking y el jefe primero", () => {
    const e = estadoGira(GIRA_TRUCO, progresoDe(defaultCareer(), "truco"));
    expect(e.map((r) => r.abierta)).toEqual([true, false, false, false, false, false]);
    const ba = e[0]!;
    expect(ba.miPuesto).toBe(11);
    expect(ba.rivales[0]!.personaje.slot).toBe("jefe");
    // Solo se puede desafiar al que está justo arriba (el "1").
    expect(ba.rivales.filter((r) => r.abierto).map((r) => r.personaje.id)).toEqual(["buenos-aires-1"]);
  });

  it("ganarle al de arriba te da su puesto; a uno de abajo, pocos puntos y nada más", () => {
    const { state, premios } = jugar(defaultCareer(), [gano("buenos-aires-1"), gano("buenos-aires-2")]);
    expect(premios[0]!.puesto).toEqual({ region: "buenos-aires", antes: 11, despues: 10 });
    expect(premios[0]!.puntos).toBe(40);
    const ba = estadoGira(GIRA_TRUCO, progresoDe(state, "truco"))[0]!;
    expect(ba.miPuesto).toBe(9);
    expect(ba.rivales.filter((r) => r.abierto).map((r) => r.personaje.id).sort()).toEqual(["buenos-aires-1", "buenos-aires-2", "buenos-aires-3"]);
    const abajo = jugar(state, [gano("buenos-aires-1")]);
    expect(abajo.premios[0]!.puntos).toBe(10);
    expect(abajo.premios[0]!.puesto).toBeNull();
  });

  it("si perdés con uno de abajo, te pasa", () => {
    const { state } = jugar(defaultCareer(), [gano("buenos-aires-1"), gano("buenos-aires-2")]);
    const r = jugar(state, [pierdo("buenos-aires-1")]);
    expect(r.premios[0]!.puesto).toEqual({ region: "buenos-aires", antes: 9, despues: 10 });
    expect(estadoGira(GIRA_TRUCO, progresoDe(r.state, "truco"))[0]!.rivales.find((x) => x.personaje.id === "buenos-aires-1")!.puesto).toBe(9);
    // Perder con el de arriba no cambia nada.
    expect(jugar(state, [pierdo("buenos-aires-3")]).premios[0]!.puesto).toBeNull();
  });

  it("no se puede saltear: el jefe recién se desafía estando segundo", () => {
    const { premios, state } = jugar(defaultCareer(), [gano("buenos-aires-jefe"), gano("buenos-aires-5"), gano("malvinas-jefe")]);
    expect(premios.every((p) => p.puntos === 0)).toBe(true);
    expect(progresoDe(state, "truco").vencidos).toEqual({});
  });

  it("llegar a primero de la región le gana al jefe y abre la siguiente", () => {
    const { state, premios } = jugar(defaultCareer(), escalera("buenos-aires").map((id) => gano(id)));
    const ultimo = premios[premios.length - 1]!;
    expect(ultimo.puntos).toBe(200);
    expect(ultimo.regionDesbloqueada).toBe("cuyo");
    expect(ultimo.regalo).toBe("mazo:argento-nuevo");
    const e = estadoGira(GIRA_TRUCO, progresoDe(state, "truco"));
    expect(e[0]!.miPuesto).toBe(1);
    expect(e[0]!.completa).toBe(true);
    expect(e[1]!.abierta).toBe(true);
    expect(state.logros.coleccionista).toBe(AHORA);
  });

  it("perder el primer puesto no cierra lo que ya abriste", () => {
    const { state } = jugar(defaultCareer(), escalera("buenos-aires").map((id) => gano(id)));
    const r = jugar(state, [pierdo("buenos-aires-jefe")]);
    const e = estadoGira(GIRA_TRUCO, progresoDe(r.state, "truco"));
    expect(e[0]!.miPuesto).toBe(2);
    expect(e[0]!.completa).toBe(true);
    expect(e[1]!.abierta).toBe(true);
  });

  it("perder no suma puntos de gira pero da algunos fósforos", () => {
    const { premios } = jugar(defaultCareer(), [pierdo("buenos-aires-1")]);
    expect(premios[0]!.puntos).toBe(0);
    expect(premios[0]!.fosforos).toBe(3);
  });

  it("se puede completar la gira entera subiendo cada región, y los umbrales alcanzan", () => {
    let s = defaultCareer();
    for (const r of REGIONES) {
      expect(estadoGira(GIRA_TRUCO, progresoDe(s, "truco")).find((x) => x.id === r.id)!.abierta).toBe(true);
      s = jugar(s, escalera(r.id).map((id) => gano(id))).state;
    }
    expect(s.logros["gira-completa"]).toBe(AHORA);
    expect(estadoGira(GIRA_TRUCO, progresoDe(s, "truco")).every((r) => r.completa && r.miPuesto === 1)).toBe(true);
  });

  it("las partidas de antes del ranking te dejan arriba del mejor que venciste", () => {
    const viejo = normalizeCareer({ giras: { truco: { puntos: 600, vencidos: { "buenos-aires-1": 1, "buenos-aires-2": 1, "buenos-aires-jefe": 1 }, jugadas: 3 } } });
    const p = progresoDe(viejo, "truco");
    expect(puestosDe(p, "buenos-aires")[0]).toBe(YO);
    expect(estadoGira(GIRA_TRUCO, p)[1]!.abierta).toBe(true);
    const medio = normalizeCareer({ giras: { truco: { puntos: 300, vencidos: { "buenos-aires-1": 1, "buenos-aires-2": 1 }, jugadas: 2 } } });
    expect(estadoGira(GIRA_TRUCO, progresoDe(medio, "truco"))[0]!.miPuesto).toBe(9);
  });
});

describe("logros y fósforos", () => {
  it("primera victoria, diez victorias", () => {
    const { state, premios } = jugar(defaultCareer(), Array.from({ length: 10 }, () => gano()));
    expect(premios[0]!.logros.map((l) => l.id)).toContain("primera-victoria");
    expect(premios[9]!.logros.map((l) => l.id)).toContain("diez-victorias");
    expect(state.contadores.ganadas).toBe(10);
  });

  it("logros por hechos de la partida, una sola vez", () => {
    const r = gano(undefined, { hechos: [{ tipo: "truco-tanto", valor: 33 }] });
    const { state, premios } = jugar(defaultCareer(), [r, r]);
    expect(premios[0]!.logros.map((l) => l.id)).toEqual(["primera-victoria", "treinta-y-tres"]);
    expect(premios[1]!.logros).toEqual([]);
    expect(state.fosforos).toBe(FOSFOROS_INICIALES + 15 + 20 + 30 + 15);
  });

  it("logros de la escoba", () => {
    const r = registrarPartida(defaultCareer(), { game: "escoba", ganada: false, ahora: AHORA, hechos: [{ tipo: "escoba-escobas", cantidad: 5 }, { tipo: "escoba-de-mano" }, { tipo: "escoba-cuatro-sietes" }] });
    expect(r.premio.logros.map((l) => l.id).sort()).toEqual(["barrendero", "escoba-de-mano", "la-setenta"]);
  });

  it("hay una gira de escoba y una de tutti-frutti con sus 6 regiones", () => {
    expect(GIRAS.escoba.regiones).toHaveLength(6);
    expect(GIRAS["tutti-frutti"].regiones).toHaveLength(6);
  });

  it("logros del tutti-frutti", () => {
    const r = registrarPartida(defaultCareer(), { game: "tutti-frutti", ganada: false, ahora: AHORA, hechos: [{ tipo: "tutti-pleno" }, { tipo: "tutti-basta", segundos: 52 }, { tipo: "tutti-solo", cantidad: 3 }] });
    expect(r.premio.logros.map((l) => l.id).sort()).toEqual(["tutti-pleno", "tutti-rayo", "tutti-solo"]);
    const lento = registrarPartida(defaultCareer(), { game: "tutti-frutti", ganada: false, ahora: AHORA, hechos: [{ tipo: "tutti-basta", segundos: 75 }, { tipo: "tutti-solo", cantidad: 2 }] });
    expect(lento.premio.logros).toEqual([]);
  });

  it("intocable: solo si ganaste la casita sin que te roben", () => {
    const base = { game: "casita-robada" as const, ahora: AHORA };
    expect(registrarPartida(defaultCareer(), { ...base, ganada: true, hechos: [{ tipo: "casita-me-robaron", cantidad: 0 }] }).premio.logros.map((l) => l.id)).toContain("intocable");
    expect(registrarPartida(defaultCareer(), { ...base, ganada: true, hechos: [{ tipo: "casita-me-robaron", cantidad: 1 }] }).premio.logros.map((l) => l.id)).not.toContain("intocable");
  });

  it("todos los logros tienen una condición alcanzable", () => {
    expect(new Set(LOGROS.map((l) => l.id)).size).toBe(LOGROS.length);
  });

  it("tienda: comprar con fósforos", () => {
    const s = { ...defaultCareer(), fosforos: 300 };
    const r = comprar(s, "mazo:argento-nuevo");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.fosforos).toBe(50);
    expect(comprar(r.state, "mazo:argento-nuevo")).toEqual({ ok: false, error: "Ya lo tenés" });
    expect(comprar(r.state, "mazo:argento-memes").ok).toBe(false);
    expect(comprar(s, "mazo:poker").ok).toBe(false);
    expect(TIENDA.every((t) => t.precio > 0)).toBe(true);
  });
});

describe("fondos de mesa", () => {
  it("al principio: boliche y patio; el resto, avanzando o comprando", () => {
    const s = defaultCareer();
    const abiertos = FONDOS.filter((f) => fondoDesbloqueado(s, f)).map((f) => f.id);
    expect(abiertos).toEqual(["boliche", "patio"]);
    const { state } = jugar(s, escalera("buenos-aires").map((id) => gano(id)));
    const ahora = FONDOS.filter((f) => fondoDesbloqueado(state, f)).map((f) => f.id);
    expect(ahora).toContain("bodegon");
    expect(ahora).toContain("bodega");
    const r = comprar({ ...state, fosforos: 1000 }, "fondo:quincho");
    expect(r.ok && fondoDesbloqueado(r.state, FONDOS.find((f) => f.id === "quincho")!)).toBe(true);
  });

  it("los fondos de la tienda coinciden con TIENDA", () => {
    for (const t of TIENDA_FONDOS) expect(TIENDA).toContainEqual(t);
    for (const f of FONDOS) expect(comoSeDesbloquea(f).length).toBeGreaterThan(5);
  });
});

describe("guardado de la carrera", () => {
  it("normaliza basura sin romper", () => {
    expect(normalizeCareer(null)).toEqual(defaultCareer());
    const s = normalizeCareer({
      fosforos: -5,
      giras: { truco: { puntos: 450, vencidos: { "buenos-aires-1": 2, "<script>": 1 }, jugadas: 3, puestos: { "buenos-aires": ["yo", "yo"], cuyo: "x" } }, poker: {} },
      logros: { "primera-victoria": 123, inventado: 1 },
      desbloqueados: ["mazo:argento-nuevo", "mazo:argento-nuevo", "trucho"],
    });
    expect(s.fosforos).toBe(FOSFOROS_INICIALES);
    expect(s.giras.truco).toEqual({ puntos: 450, vencidos: { "buenos-aires-1": 2 }, jugadas: 3, puestos: {} });
    expect(Object.keys(s.giras)).toEqual(["truco"]);
    expect(s.logros).toEqual({ "primera-victoria": 123 });
    expect(s.desbloqueados).toEqual(["mazo:argento-nuevo"]);
  });

  it("registrar no muta la carrera recibida", () => {
    const s = defaultCareer();
    const before = JSON.stringify(s);
    registrarPartida(s, gano("buenos-aires-1"));
    expect(JSON.stringify(s)).toBe(before);
  });
});
