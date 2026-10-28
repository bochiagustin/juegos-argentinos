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

  it("descarta versiones desconocidas o futuras", () => {
    expect(migrate({ version: CURRENT_VERSION + 1, perfil: { apodo: "X" } })).toEqual(defaultSave());
    expect(migrate({ version: 0 })).toEqual(defaultSave());
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate([1, 2])).toEqual(defaultSave());
  });

  it("normaliza campos inválidos sin perder los válidos", () => {
    const s = migrate({
      version: 1,
      perfil: { apodo: "   El   Polaco   de   Boedo   ", avatar: "🦄", creado: true },
      ajustes: { sonido: "sí", vibracion: false, tema: "rosa", mazo: "poker" },
    });
    expect(s.perfil.apodo).toBe("El Polaco de Boe");
    expect(s.perfil.avatar).toBe("🧉");
    expect(s.ajustes).toEqual({ sonido: true, vibracion: false, tema: "pano", mazo: "criolla" });
  });

  it("no da por creado un perfil sin apodo", () => {
    expect(migrate({ version: 1, perfil: { apodo: "  ", creado: true } }).perfil.creado).toBe(false);
  });

  it("limpia el apodo", () => {
    expect(sanitizeApodo("  la   Negra ")).toBe("la Negra");
    expect(sanitizeApodo("x".repeat(40))).toHaveLength(16);
  });
});
