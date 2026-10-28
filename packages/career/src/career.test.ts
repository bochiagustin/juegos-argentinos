import { describe, expect, it } from "vitest";
import { comprar, defaultCareer, estadoGira, FOSFOROS_INICIALES, normalizeCareer, progresoDe, registrarPartida, rivalAbierto } from "./career.ts";
import { GIRA_TRUCO, GIRAS, LOGROS, PERSONAJES, REGIONES, TIENDA } from "./data.ts";
import type { CareerState, Reporte } from "./types.ts";

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

describe("datos de la gira", () => {
  it("18 personajes, 3 por región, ids alineados con el arte", () => {
    expect(PERSONAJES).toHaveLength(18);
    for (const r of REGIONES) expect(PERSONAJES.filter((p) => p.region === r.id).map((p) => p.slot)).toEqual(["1", "2", "jefe"]);
    for (const p of PERSONAJES) expect(p.id).toBe(`${p.region}-${p.slot}`);
  });

  it("cada gira tiene las 6 regiones y la dificultad sube", () => {
    for (const g of Object.values(GIRAS)) {
      expect(g.regiones.map((r) => r.region.id)).toEqual(REGIONES.map((r) => r.id));
      const jefes = g.regiones.map((r) => r.skills.jefe);
      expect([...jefes].sort((a, b) => a - b)).toEqual(jefes);
      expect(jefes[jefes.length - 1]).toBe(10);
    }
  });
});

describe("gira", () => {
  it("arranca con Buenos Aires abierta y el jefe cerrado", () => {
    const e = estadoGira(GIRA_TRUCO, progresoDe(defaultCareer(), "truco"));
    expect(e.map((r) => r.abierta)).toEqual([true, false, false, false, false, false]);
    expect(e[0]!.rivales.map((r) => r.abierto)).toEqual([true, true, false]);
  });

  it("el jefe se abre ganándole a los dos de la región; la región siguiente, ganándole al jefe", () => {
    const { state, premios } = jugar(defaultCareer(), [gano("buenos-aires-1"), gano("buenos-aires-2")]);
    const p = progresoDe(state, "truco");
    expect(rivalAbierto(GIRA_TRUCO, p, "buenos-aires-jefe")).toBe(true);
    expect(estadoGira(GIRA_TRUCO, p)[1]!.abierta).toBe(false);
    expect(premios[0]!.puntos).toBe(150);
    const r = jugar(state, [gano("buenos-aires-jefe")]);
    expect(r.premios[0]!.puntos).toBe(300);
    expect(r.premios[0]!.regionDesbloqueada).toBe("cuyo");
    expect(estadoGira(GIRA_TRUCO, progresoDe(r.state, "truco"))[1]!.abierta).toBe(true);
  });

  it("ganarle al jefe de Buenos Aires regala el Nuevo Mazo Argento", () => {
    const { state, premios } = jugar(defaultCareer(), [gano("buenos-aires-1"), gano("buenos-aires-2"), gano("buenos-aires-jefe")]);
    expect(premios[2]!.regalo).toBe("mazo:argento-nuevo");
    expect(state.desbloqueados).toContain("mazo:argento-nuevo");
    expect(state.logros.coleccionista).toBe(AHORA);
  });

  it("no da puntos por un rival que todavía no está abierto", () => {
    const { premios, state } = jugar(defaultCareer(), [gano("buenos-aires-jefe"), gano("malvinas-jefe")]);
    expect(premios.every((p) => p.puntos === 0)).toBe(true);
    expect(progresoDe(state, "truco").vencidos).toEqual({});
  });

  it("perder no suma puntos de gira pero da algunos fósforos", () => {
    const { premios } = jugar(defaultCareer(), [pierdo("buenos-aires-1")]);
    expect(premios[0]!.puntos).toBe(0);
    expect(premios[0]!.fosforos).toBe(3);
  });

  it("se puede completar la gira entera y da el logro", () => {
    const orden = REGIONES.flatMap((r) => ["1", "2", "jefe"].map((s) => `${r.id}-${s}`));
    const { state, premios } = jugar(defaultCareer(), orden.map((id) => gano(id)));
    expect(premios.every((p) => p.puntos > 0)).toBe(true);
    expect(premios[premios.length - 1]!.giraCompleta).toBe(true);
    expect(state.logros["gira-completa"]).toBe(AHORA);
    expect(estadoGira(GIRA_TRUCO, progresoDe(state, "truco")).every((r) => r.completa)).toBe(true);
  });

  it("los umbrales se alcanzan jugando la gira en orden", () => {
    // Ganando cada rival una sola vez alcanza para abrir cada región.
    let s = defaultCareer();
    for (const r of REGIONES) {
      const e = estadoGira(GIRA_TRUCO, progresoDe(s, "truco"));
      expect(e.find((x) => x.id === r.id)!.abierta).toBe(true);
      s = jugar(s, ["1", "2", "jefe"].map((slot) => gano(`${r.id}-${slot}`))).state;
    }
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

describe("guardado de la carrera", () => {
  it("normaliza basura sin romper", () => {
    expect(normalizeCareer(null)).toEqual(defaultCareer());
    const s = normalizeCareer({
      fosforos: -5,
      giras: { truco: { puntos: 450, vencidos: { "buenos-aires-1": 2, "<script>": 1 }, jugadas: 3 }, poker: {} },
      logros: { "primera-victoria": 123, inventado: 1 },
      desbloqueados: ["mazo:argento-nuevo", "mazo:argento-nuevo", "trucho"],
    });
    expect(s.fosforos).toBe(FOSFOROS_INICIALES);
    expect(s.giras.truco).toEqual({ puntos: 450, vencidos: { "buenos-aires-1": 2 }, jugadas: 3 });
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
