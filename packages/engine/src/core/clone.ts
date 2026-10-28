/** Copia profunda de un estado JSON. Usa structuredClone si existe (Node, navegadores, Workers). */
const sc = (globalThis as unknown as { structuredClone?: <T>(v: T) => T }).structuredClone;

export function clone<T>(value: T): T {
  return sc ? sc(value) : (JSON.parse(JSON.stringify(value)) as T);
}
