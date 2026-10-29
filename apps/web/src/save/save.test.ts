import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, defaultSave, loadSave, migrate, SAVE_KEY, sanitizeApodo, writeSave, type KeyValueStore } from "./save.ts";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("guardado", () => {
  it("arranca con valores por defecto si no hay nada", () => {
    expect(loadSave(memoryStore())).toEqual(defaultSave());
  });

  it("guarda y vuelve a leer igual", () => {
    const store = memoryStore();
    const save = defaultSave();
    save.perfil = { apodo: "Tito", avatar: "🤠", creado: true };
    save.ajustes.tema = "claro";
    save.ajustes.mazo = "argento-campeon";
    expect(writeSave(save, store)).toBe(true);
    expect(loadSave(store)).toEqual(save);
  });

  it("tolera JSON roto, storage que tira error y storage ausente", () => {
    expect(loadSave(memoryStore({ [SAVE_KEY]: "{no es json" }))).toEqual(defaultSave());
    expect(loadSave(throwingStore)).toEqual(defaultSave());
    expect(writeSave(defaultSave(), throwingStore)).toBe(false);
    expect(loadSave(undefined)).toEqual(defaultSave());
  });

  it("migra un guardado v1 hasta la versión actual sin perder el perfil", () => {
    const v1 = { version: 1, perfil: { apodo: "Tito", avatar: "🤠", creado: true }, ajustes: { sonido: false, vibracion: true, tema: "claro", mazo: "argento-memes" } };
    const s = migrate(v1);
    expect(s.version).toBe(3);
    expect(s.carrera.fosforos).toBeGreaterThan(0);
    expect(s.perfil).toEqual(v1.perfil);
    expect(s.ajustes).toEqual({ ...v1.ajustes, fondo: "boliche", menosAnimaciones: false, textoGrande: false });
    expect(s.juegos).toEqual({});
  });

  it("normaliza las estadísticas por juego", () => {
    const s = migrate({ version: 3, juegos: { truco: { rating: 1100, jugadas: 5, ganadas: 9 }, poker: { rating: 1 }, chinchon: { rating: "x" } } });
    expect(s.juegos.truco).toEqual({ rating: 1100, jugadas: 5, ganadas: 5 });
    expect(s.juegos.chinchon?.rating).toBe(900);
    expect("poker" in s.juegos).toBe(false);
  });

  it("migra un guardado v2 conservando las estadísticas", () => {
    const s = migrate({ version: 2, perfil: { apodo: "Tito", avatar: "🤠", creado: true }, juegos: { truco: { rating: 1000, jugadas: 3, ganadas: 2 } } });
    expect(s.juegos.truco).toEqual({ rating: 1000, jugadas: 3, ganadas: 2 });
    expect(s.carrera.giras).toEqual({});
  });

  it("descarta versiones desconocidas o futuras", () => {
    expect(migrate({ version: CURRENT_VERSION + 1, perfil: { apodo: "X" } })).toEqual(defaultSave());
    expect(migrate({ version: 0 })).toEqual(defaultSave());
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate([1, 2])).toEqual(defaultSave());
  });

  it("normaliza campos inválidos sin perder los válidos", () => {
    const s = migrate({
      version: 3,
      perfil: { apodo: "   El   Polaco   de   Boedo   ", avatar: "🦄", creado: true },
      ajustes: { sonido: "sí", vibracion: false, tema: "rosa", mazo: "poker" },
    });
    expect(s.perfil.apodo).toBe("El Polaco de Boe");
    expect(s.perfil.avatar).toBe("🧉");
    expect(s.ajustes).toEqual({ sonido: true, vibracion: false, tema: "pano", mazo: "criolla", fondo: "boliche", menosAnimaciones: false, textoGrande: false });
  });

  it("no da por creado un perfil sin apodo", () => {
    expect(migrate({ version: 3, perfil: { apodo: "  ", creado: true } }).perfil.creado).toBe(false);
  });

  it("limpia el apodo", () => {
    expect(sanitizeApodo("  la   Negra ")).toBe("la Negra");
    expect(sanitizeApodo("x".repeat(40))).toHaveLength(16);
  });
});
