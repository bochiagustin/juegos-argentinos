import { servidorHttp } from "../online/conexion.ts";
import {
  aplicarRespaldo,
  armarRespaldo,
  leerRespaldo,
  type Respaldo,
  type ResumenRespaldo,
} from "./respaldo.ts";

/**
 * Guardado automático en la nube. Cada dispositivo tiene un código de recuperación (12 letras y números): después de cada
 * cambio del progreso se sube una copia al servidor bajo ese código, y en otro teléfono se recupera escribiéndolo.
 */

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CLAVE_CODIGO_NUBE = "juegos-argentinos:codigo-nube";
const CLAVE_ESTADO = "juegos-argentinos:nube";

export interface EstadoNube {
  activa: boolean;
  /** Última subida que salió bien (ms). */
  ultima: number | null;
  /** La última vez que se intentó y falló (sin internet, sin servidor). */
  fallo: boolean;
}

function leerEstado(): EstadoNube {
  try {
    const e = JSON.parse(
      localStorage.getItem(CLAVE_ESTADO) ?? "null",
    ) as Partial<EstadoNube> | null;
    return {
      activa: e?.activa !== false,
      ultima: typeof e?.ultima === "number" ? e.ultima : null,
      fallo: e?.fallo === true,
    };
  } catch {
    return { activa: true, ultima: null, fallo: false };
  }
}

function guardarEstado(e: EstadoNube) {
  try {
    localStorage.setItem(CLAVE_ESTADO, JSON.stringify(e));
  } catch {
    // sin storage
  }
  for (const fn of oyentes) fn();
}

const oyentes = new Set<() => void>();
/** Para `useSyncExternalStore`. */
export function suscribirNube(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
let foto = leerEstado();
oyentes.add(() => (foto = leerEstado()));
export const estadoNube = () => foto;

export function activarNube(activa: boolean) {
  guardarEstado({ ...leerEstado(), activa });
  if (activa) void subirAhora();
}

/** "MATE4823GRAN" → "MATE-4823-GRAN". */
export function formatearCodigo(c: string): string {
  return c.match(/.{1,4}/g)?.join("-") ?? c;
}

export function normalizarCodigo(raw: string): string | null {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 12 && [...c].every((ch) => ALFABETO.includes(ch))
    ? c
    : null;
}

/** Mi código de recuperación (se crea la primera vez). */
export function miCodigoNube(): string {
  try {
    const c = localStorage.getItem(CLAVE_CODIGO_NUBE);
    if (c && normalizarCodigo(c)) return c;
    const b = crypto.getRandomValues(new Uint8Array(12));
    const nuevo = Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
    localStorage.setItem(CLAVE_CODIGO_NUBE, nuevo);
    return nuevo;
  } catch {
    return "";
  }
}

let enCurso: Promise<boolean> | null = null;

/** Sube la copia ya. Devuelve si salió bien. */
export function subirAhora(keepalive = false): Promise<boolean> {
  const base = servidorHttp();
  const estado = leerEstado();
  if (!base || !estado.activa) return Promise.resolve(false);
  const codigo = miCodigoNube();
  if (!codigo) return Promise.resolve(false);
  enCurso ??= (async () => {
    try {
      const copia = JSON.stringify(armarRespaldo(localStorage, new Date()));
      const res = await fetch(`${base}/nube/${codigo}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: copia,
        keepalive: keepalive && copia.length < 60_000,
      });
      guardarEstado({
        ...leerEstado(),
        ...(res.ok ? { ultima: Date.now(), fallo: false } : { fallo: true }),
      });
      return res.ok;
    } catch {
      guardarEstado({ ...leerEstado(), fallo: true });
      return false;
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

let timer: number | undefined;
/** Hubo un cambio: se sube en unos segundos (si hay varios seguidos, una sola vez). */
export function programarSubida(ms = 4000) {
  if (!leerEstado().activa) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void subirAhora(), ms);
}

/** Al cerrar o mandar la app al fondo, se sube lo que falte. */
export function vigilarCierre() {
  const alIrse = () => {
    if (document.visibilityState === "hidden" && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
      void subirAhora(true);
    }
  };
  document.addEventListener("visibilitychange", alIrse);
  return () => document.removeEventListener("visibilitychange", alIrse);
}

/** Busca la copia guardada con ese código. */
export async function buscarEnNube(
  raw: string,
): Promise<
  | { ok: true; respaldo: Respaldo; resumen: ResumenRespaldo; codigo: string }
  | { ok: false; error: string }
> {
  const codigo = normalizarCodigo(raw);
  if (!codigo)
    return {
      ok: false,
      error:
        "El código tiene 12 letras y números (por ejemplo MATE-4823-GRAN).",
    };
  const base = servidorHttp();
  if (!base)
    return {
      ok: false,
      error: "No hay servidor configurado (Ajustes → Online).",
    };
  try {
    const res = await fetch(`${base}/nube/${codigo}`);
    if (res.status === 404)
      return {
        ok: false,
        error:
          "No hay nada guardado con ese código. Revisá que esté bien escrito.",
      };
    if (!res.ok)
      return {
        ok: false,
        error: "El servidor no respondió bien. Probá en un rato.",
      };
    const body = (await res.json()) as { copia?: string };
    const r = leerRespaldo(body.copia ?? "");
    return r.ok ? { ...r, codigo } : r;
  } catch {
    return {
      ok: false,
      error: "Sin conexión: para recuperar con el código hace falta internet.",
    };
  }
}

/** Carga la copia de la nube y adopta su código (desde ahora este teléfono guarda ahí). */
export function aplicarDeNube(respaldo: Respaldo, codigo: string) {
  aplicarRespaldo(localStorage, respaldo);
  try {
    localStorage.setItem(CLAVE_CODIGO_NUBE, codigo);
  } catch {
    // nada
  }
  guardarEstado({ activa: true, ultima: Date.now(), fallo: false });
}
