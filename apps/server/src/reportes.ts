/**
 * Palabras del tutti-frutti que los jugadores reportan como válidas (el diccionario las rechazó o no las conocía).
 * Se juntan para corregir el diccionario. Sin datos personales: categoría, palabra y letra.
 * La lógica no sabe dónde se guarda: en Cloudflare es un Durable Object; en desarrollo, memoria.
 */

export interface Reporte {
  categoria: string;
  palabra: string;
  letra: string;
}

export interface Acumulado {
  categoria: string;
  palabra: string;
  letras: string[];
  veces: number;
  primera: number;
  ultima: number;
}

export const MAX_POR_ENVIO = 50;
export const MAX_GUARDADOS = 5000;

const limpio = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Lo que manda la app, saneado: hasta 50 reportes con textos cortos. */
export function sanearReportes(body: unknown): Reporte[] {
  if (!Array.isArray(body)) return [];
  const out: Reporte[] = [];
  for (const x of body.slice(0, MAX_POR_ENVIO)) {
    if (typeof x !== "object" || x === null) continue;
    const r = x as Record<string, unknown>;
    const categoria = limpio(r.categoria, 40);
    const palabra = limpio(r.palabra, 40);
    const letra = limpio(r.letra, 2).toUpperCase();
    if (categoria && palabra && letra) out.push({ categoria, palabra, letra });
  }
  return out;
}

export const claveReporte = (r: { categoria: string; palabra: string }) => `${r.categoria.toLowerCase()}|${r.palabra.toLowerCase()}`;

/** Suma un reporte a lo acumulado (o lo crea). */
export function acumular(previo: Acumulado | undefined, r: Reporte, ahora: number): Acumulado {
  if (!previo) return { categoria: r.categoria, palabra: r.palabra, letras: [r.letra], veces: 1, primera: ahora, ultima: ahora };
  return { ...previo, letras: previo.letras.includes(r.letra) ? previo.letras : [...previo.letras, r.letra], veces: previo.veces + 1, ultima: ahora };
}

/** Para leerlos: las más reportadas primero. */
export function ordenar(lista: Acumulado[]): Acumulado[] {
  return [...lista].sort((a, b) => b.veces - a.veces || b.ultima - a.ultima);
}

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};
