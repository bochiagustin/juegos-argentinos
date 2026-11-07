import { describe, expect, it } from "vitest";
import { aplicarRespaldo, armarRespaldo, leerRespaldo, type StoreRecorrible } from "./respaldo.ts";
import { defaultSave, SAVE_KEY } from "./save.ts";

function store(inicial: Record<string, string> = {}): StoreRecorrible & { datos: Map<string, string> } {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    get length() {
      return datos.size;
    },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

const conProgreso = () => {
  const s = defaultSave();
  s.perfil.apodo = "Agus";
  s.carrera.fosforos = 777;
  s.juegos.truco = { rating: 1200, jugadas: 12, ganadas: 7 };
  return s;
};

describe("copia de seguridad", () => {
  it("guarda el progreso y las partidas a medias, pero no el token del online", () => {
    const a = store({
      [SAVE_KEY]: JSON.stringify(conProgreso()),
      "juegos-argentinos:partida:truco": "{\"x\":1}",
      "juegos-argentinos:online-token": "secreto",
      "otra-app": "nada",
    });
    const r = armarRespaldo(a, new Date("2026-11-07T12:00:00Z"));
    expect(Object.keys(r.datos).sort()).toEqual([SAVE_KEY, "juegos-argentinos:partida:truco"].sort());
    expect(r.fecha).toBe("2026-11-07T12:00:00.000Z");
  });

  it("se carga en otro teléfono tal cual (y ese conserva su propio token)", () => {
    const viejo = store({ [SAVE_KEY]: JSON.stringify(conProgreso()), "juegos-argentinos:partida:escoba": "{}" });
    const texto = JSON.stringify(armarRespaldo(viejo, new Date()));
    const leido = leerRespaldo(texto);
    expect(leido.ok).toBe(true);
    if (!leido.ok) return;
    expect(leido.resumen).toMatchObject({ apodo: "Agus", fosforos: 777, partidas: 12 });
    const nuevo = store({ [SAVE_KEY]: JSON.stringify(defaultSave()), "juegos-argentinos:online-token": "mio", "juegos-argentinos:partida:truco": "{}" });
    aplicarRespaldo(nuevo, leido.respaldo);
    expect(JSON.parse(nuevo.datos.get(SAVE_KEY)!).carrera.fosforos).toBe(777);
    expect(nuevo.datos.get("juegos-argentinos:online-token")).toBe("mio");
    expect(nuevo.datos.has("juegos-argentinos:partida:truco")).toBe(false);
    expect(nuevo.datos.has("juegos-argentinos:partida:escoba")).toBe(true);
  });

  it("rechaza archivos que no son copias, sin romperse", () => {
    expect(leerRespaldo("hola").ok).toBe(false);
    expect(leerRespaldo(JSON.stringify({ app: "otra" })).ok).toBe(false);
    expect(leerRespaldo(JSON.stringify({ app: "juegos-argentinos", formato: 1, datos: {} })).ok).toBe(false);
    expect(leerRespaldo(JSON.stringify({ app: "juegos-argentinos", formato: 1, datos: { [SAVE_KEY]: "{roto" } })).ok).toBe(false);
  });
});
