/**
 * Partida guardada local (perfil, ajustes y, más adelante, carrera y logros).
 *
 * Vive en localStorage bajo una sola clave, con número de versión y migraciones.
 * Toda lectura/escritura tolera fallos (modo privado, storage bloqueado o lleno):
 * si no se puede leer, se arranca con los valores por defecto.
 */

import { defaultCareer, normalizeCareer, type CareerState } from "@juegos-argentinos/career";
import type { GameId } from "@juegos-argentinos/engine";
import { isDeckId, type DeckId } from "../cards/decks.ts";
import { DEFAULT_RATING } from "../ia/nivel.ts";

export const SAVE_KEY = "juegos-argentinos:save";
export const CURRENT_VERSION = 3;

export type Tema = "pano" | "claro" | "auto";

export interface Perfil {
  apodo: string;
  avatar: string;
  /** false hasta que el jugador elige apodo por primera vez. */
  creado: boolean;
}

export interface Ajustes {
  sonido: boolean;
  vibracion: boolean;
  tema: Tema;
  /** Mazo con el que se ven las cartas. */
  mazo: DeckId;
  /** Accesibilidad: menos movimiento en pantalla. */
  menosAnimaciones: boolean;
  /** Accesibilidad: toda la letra un poco más grande. */
  textoGrande: boolean;
}

/** Cómo le va al jugador en cada juego contra la IA (de acá sale el nivel adaptativo). */
export interface StatsJuego {
  rating: number;
  jugadas: number;
  ganadas: number;
}

export interface Save {
  version: typeof CURRENT_VERSION;
  perfil: Perfil;
  ajustes: Ajustes;
  juegos: Partial<Record<GameId, StatsJuego>>;
  /** Gira Nacional, fósforos, logros y lo desbloqueado. */
  carrera: CareerState;
}

const GAME_IDS: readonly GameId[] = ["truco", "chinchon", "casita-robada", "escoba", "tutti-frutti"];

export function statsDe(save: Save, game: GameId): StatsJuego {
  return save.juegos[game] ?? { rating: DEFAULT_RATING, jugadas: 0, ganadas: 0 };
}

export const AVATARES = ["🧉", "🤠", "🐴", "🧔", "👵", "👴", "🧑‍🌾", "🐂", "🦙", "🐧", "⚽", "🎸", "🥩", "🌵", "🦜", "💃"] as const;
export const APODO_MAX = 16;

export function defaultSave(): Save {
  return {
    version: CURRENT_VERSION,
    perfil: { apodo: "", avatar: "🧉", creado: false },
    ajustes: { sonido: true, vibracion: true, tema: "pano", mazo: "criolla", menosAnimaciones: false, textoGrande: false },
    juegos: {},
    carrera: defaultCareer(),
  };
}

type UnknownRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is UnknownRecord => typeof v === "object" && v !== null && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

export function sanitizeApodo(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, APODO_MAX);
}

/** Migraciones: `MIGRATIONS[n]` transforma un guardado de la versión n a la n+1. */
const MIGRATIONS: Record<number, (s: UnknownRecord) => UnknownRecord> = {
  // v2: estadísticas y rating por juego (para la IA que se adapta).
  1: (s) => ({ ...s, version: 2, juegos: {} }),
  // v3: modo carrera (arranca vacío; los mazos que ya se usaban se respetan abajo en normalize).
  2: (s) => ({ ...s, version: 3, carrera: defaultCareer() }),
};

const num = (v: unknown, fallback: number, min = 0) => (typeof v === "number" && Number.isFinite(v) && v >= min ? v : fallback);

/** Convierte cualquier cosa leída del storage en un `Save` válido. Nunca lanza. */
export function migrate(raw: unknown): Save {
  if (!isRecord(raw) || typeof raw.version !== "number") return defaultSave();
  let s: UnknownRecord = raw;
  let version = raw.version;
  // Un guardado de una versión más nueva que la app (rollback): no lo pisamos con basura, arrancamos limpio.
  if (version > CURRENT_VERSION) return defaultSave();
  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return defaultSave();
    s = step(s);
    version++;
  }
  return normalize(s);
}

function normalize(s: UnknownRecord): Save {
  const d = defaultSave();
  const perfil = isRecord(s.perfil) ? s.perfil : {};
  const ajustes = isRecord(s.ajustes) ? s.ajustes : {};
  const apodo = typeof perfil.apodo === "string" ? sanitizeApodo(perfil.apodo) : d.perfil.apodo;
  const avatar = typeof perfil.avatar === "string" && (AVATARES as readonly string[]).includes(perfil.avatar) ? perfil.avatar : d.perfil.avatar;
  const tema = ajustes.tema === "pano" || ajustes.tema === "claro" || ajustes.tema === "auto" ? ajustes.tema : d.ajustes.tema;
  return {
    version: CURRENT_VERSION,
    perfil: { apodo, avatar, creado: bool(perfil.creado, false) && apodo.length > 0 },
    ajustes: {
      sonido: bool(ajustes.sonido, d.ajustes.sonido),
      vibracion: bool(ajustes.vibracion, d.ajustes.vibracion),
      tema,
      mazo: isDeckId(ajustes.mazo) ? ajustes.mazo : d.ajustes.mazo,
      menosAnimaciones: bool(ajustes.menosAnimaciones, d.ajustes.menosAnimaciones),
      textoGrande: bool(ajustes.textoGrande, d.ajustes.textoGrande),
    },
    juegos: normalizeJuegos(s.juegos),
    carrera: normalizeCareer(s.carrera),
  };
}

function normalizeJuegos(raw: unknown): Save["juegos"] {
  const out: Save["juegos"] = {};
  if (!isRecord(raw)) return out;
  for (const id of GAME_IDS) {
    const g = raw[id];
    if (!isRecord(g)) continue;
    const jugadas = Math.floor(num(g.jugadas, 0));
    out[id] = { rating: num(g.rating, DEFAULT_RATING, 100), jugadas, ganadas: Math.min(jugadas, Math.floor(num(g.ganadas, 0))) };
  }
  return out;
}

/** Subconjunto de `Storage` que usamos (facilita testear). */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadSave(store: KeyValueStore | undefined = defaultStore()): Save {
  try {
    const text = store?.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    return migrate(JSON.parse(text));
  } catch {
    return defaultSave();
  }
}

/** Devuelve false si no se pudo guardar (el juego sigue igual, solo no persiste). */
export function writeSave(save: Save, store: KeyValueStore | undefined = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store: KeyValueStore | undefined = defaultStore()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // Nada que hacer: si el storage no anda, tampoco hay nada guardado.
  }
}
