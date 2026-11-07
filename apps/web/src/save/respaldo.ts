import { migrate, SAVE_KEY, type KeyValueStore, type Save } from "./save.ts";

/**
 * Copia de seguridad del progreso: todo lo que la app guarda en este dispositivo (perfil, ajustes, carrera, Ascenso,
 * logros, fósforos, estadísticas y las partidas a medias) en un archivo que el jugador guarda donde quiera (Drive,
 * WhatsApp, la carpeta de descargas) y puede volver a cargar en este u otro teléfono.
 * Quedan afuera el token secreto del online (es de este dispositivo) y la dirección del servidor.
 */

const PREFIJO = "juegos-argentinos:";
const FUERA = new Set([`${PREFIJO}online-token`, `${PREFIJO}servidor-salas`, `${PREFIJO}ultimo-respaldo`, `${PREFIJO}codigo-nube`, `${PREFIJO}nube`]);
export const CLAVE_ULTIMO_RESPALDO = `${PREFIJO}ultimo-respaldo`;

export interface Respaldo {
  app: "juegos-argentinos";
  formato: 1;
  /** Cuándo se hizo (ISO). */
  fecha: string;
  /** Clave de localStorage → valor, tal cual. */
  datos: Record<string, string>;
}

/** Lo que se muestra antes de cargar una copia, para saber qué se recupera. */
export interface ResumenRespaldo {
  fecha: string;
  apodo: string;
  fosforos: number;
  logros: number;
  partidas: number;
  ascensos: number;
}

/** Store que además deja recorrer las claves (localStorage, o un mapa en los tests). */
export type StoreRecorrible = KeyValueStore & { readonly length: number; key(i: number): string | null };

function claves(store: StoreRecorrible): string[] {
  const out: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(PREFIJO) && !FUERA.has(k)) out.push(k);
  }
  return out;
}

export function armarRespaldo(store: StoreRecorrible, ahora: Date): Respaldo {
  const datos: Record<string, string> = {};
  for (const k of claves(store)) {
    const v = store.getItem(k);
    if (v !== null) datos[k] = v;
  }
  return { app: "juegos-argentinos", formato: 1, fecha: ahora.toISOString(), datos };
}

function resumir(save: Save, fecha: string): ResumenRespaldo {
  const partidas = Object.values(save.juegos).reduce((a, j) => a + (j?.jugadas ?? 0), 0);
  return {
    fecha,
    apodo: save.perfil.apodo,
    fosforos: save.carrera.fosforos,
    logros: Object.keys(save.carrera.logros).length,
    partidas,
    ascensos: Object.keys(save.carrera.ascensos).length,
  };
}

/** Lee una copia (el texto del archivo). Nunca lanza: si no sirve, dice por qué. */
export function leerRespaldo(texto: string): { ok: true; respaldo: Respaldo; resumen: ResumenRespaldo } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch {
    return { ok: false, error: "Ese archivo no es una copia de Juegos Argentinos." };
  }
  const r = raw as Partial<Respaldo> | null;
  if (!r || typeof r !== "object" || r.app !== "juegos-argentinos" || r.formato !== 1 || !r.datos || typeof r.datos !== "object") {
    return { ok: false, error: "Ese archivo no es una copia de Juegos Argentinos." };
  }
  const datos: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.datos)) if (k.startsWith(PREFIJO) && !FUERA.has(k) && typeof v === "string") datos[k] = v;
  const principal = datos[SAVE_KEY];
  if (!principal) return { ok: false, error: "La copia no tiene tu progreso adentro." };
  let save: Save;
  try {
    save = migrate(JSON.parse(principal));
  } catch {
    return { ok: false, error: "La copia está dañada: no se pudo leer tu progreso." };
  }
  const fecha = typeof r.fecha === "string" ? r.fecha : "";
  return { ok: true, respaldo: { app: "juegos-argentinos", formato: 1, fecha, datos }, resumen: resumir(save, fecha) };
}

/** Reemplaza lo guardado en este dispositivo por la copia (lo de la app; el token del online se conserva). */
export function aplicarRespaldo(store: StoreRecorrible, respaldo: Respaldo): void {
  for (const k of claves(store)) store.removeItem(k);
  for (const [k, v] of Object.entries(respaldo.datos)) store.setItem(k, v);
}

export function resumenActual(save: Save): ResumenRespaldo {
  return resumir(save, new Date().toISOString());
}

/** Nombre del archivo: juegos-argentinos-2026-11-07.json */
export function nombreArchivo(fecha: Date): string {
  return `juegos-argentinos-${fecha.toISOString().slice(0, 10)}.json`;
}
