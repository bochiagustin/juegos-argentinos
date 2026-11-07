/**
 * Guardado en la nube: cada jugador tiene un código de recuperación (12 letras y números, sin los que se confunden) y en
 * el servidor se guarda la última copia de su progreso bajo ese código. Con el código se recupera en otro teléfono.
 * El código es el secreto: el que lo tiene puede leer y pisar esa copia (12 de 31 símbolos ≈ 8·10¹⁷ combinaciones).
 */

export const ALFABETO_NUBE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Tope de una copia (una partida avanzada pesa ~20 KB). */
export const MAX_NUBE = 600_000;

/** "pato-4821-chan" → "PATO4821CHAN", o null si no es un código válido. */
export function normalizarCodigoNube(raw: string): string | null {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== 12) return null;
  for (const ch of c) if (!ALFABETO_NUBE.includes(ch)) return null;
  return c;
}

/** La copia tiene que ser una copia de la app (no cualquier cosa) y no pasarse del tope. */
export function copiaValida(texto: string): boolean {
  if (texto.length > MAX_NUBE) return false;
  try {
    const r = JSON.parse(texto) as { app?: unknown; formato?: unknown; datos?: unknown };
    return r.app === "juegos-argentinos" && r.formato === 1 && !!r.datos && typeof r.datos === "object";
  } catch {
    return false;
  }
}

export const CORS_NUBE = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, OPTIONS",
  "access-control-allow-headers": "content-type",
};
