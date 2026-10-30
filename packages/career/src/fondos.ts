/**
 * Fondos de mesa (el ambiente detrás del paño): se desbloquean avanzando en la carrera o se compran con fósforos.
 * Lógica pura: dice qué fondos tiene el jugador mirando su carrera.
 */
import { estadoGira, progresoDe, tiene } from "./career.ts";
import { GIRAS, LOGROS, REGALO_BUENOS_AIRES } from "./data.ts";
import { CAREER_GAMES, type CareerState, type RegionId } from "./types.ts";

export type Desbloqueo =
  | { tipo: "inicio" }
  | { tipo: "jefe"; region: RegionId }
  | { tipo: "region"; region: RegionId }
  | { tipo: "gira-completa" }
  | { tipo: "todas-las-giras" }
  | { tipo: "victorias"; cantidad: number }
  | { tipo: "logros"; cantidad: number }
  | { tipo: "tienda"; precio: number };

export interface FondoDef {
  id: string;
  nombre: string;
  /** Si es de día (claro) o de noche: la mesa se ve igual, pero sirve para elegir. */
  luz: "dia" | "noche";
  desbloqueo: Desbloqueo;
}

export const FONDOS: FondoDef[] = [
  { id: "boliche", nombre: "Boliche de campo", luz: "noche", desbloqueo: { tipo: "inicio" } },
  { id: "patio", nombre: "Patio criollo con parra", luz: "dia", desbloqueo: { tipo: "inicio" } },
  { id: "bodegon", nombre: "Bodegón de San Telmo", luz: "noche", desbloqueo: { tipo: "jefe", region: "buenos-aires" } },
  { id: "bodega", nombre: "Bodega de Mendoza", luz: "noche", desbloqueo: { tipo: "region", region: "cuyo" } },
  { id: "litoral", nombre: "Rancho del litoral", luz: "dia", desbloqueo: { tipo: "region", region: "mesopotamia" } },
  { id: "pena", nombre: "Peña norteña", luz: "noche", desbloqueo: { tipo: "region", region: "norte" } },
  { id: "refugio", nombre: "Refugio patagónico", luz: "noche", desbloqueo: { tipo: "region", region: "patagonia" } },
  { id: "puerto", nombre: "Cantina del fin del mundo", luz: "noche", desbloqueo: { tipo: "region", region: "malvinas" } },
  { id: "fogon", nombre: "Fogón bajo las estrellas", luz: "noche", desbloqueo: { tipo: "gira-completa" } },
  { id: "vereda", nombre: "Vereda porteña", luz: "dia", desbloqueo: { tipo: "victorias", cantidad: 10 } },
  { id: "costa", nombre: "Parador en la costa", luz: "dia", desbloqueo: { tipo: "logros", cantidad: 10 } },
  { id: "cafe", nombre: "Café de barrio", luz: "noche", desbloqueo: { tipo: "tienda", precio: 300 } },
  { id: "quincho", nombre: "Quincho de verano", luz: "dia", desbloqueo: { tipo: "tienda", precio: 400 } },
  { id: "estancia", nombre: "Galería de estancia", luz: "dia", desbloqueo: { tipo: "tienda", precio: 500 } },
  { id: "cataratas", nombre: "Mirador de las Cataratas", luz: "dia", desbloqueo: { tipo: "todas-las-giras" } },
];

export const FONDO_INICIAL = "boliche";

/** Los fondos que se compran, como artículos de la tienda (`fondo:<id>`). */
export const TIENDA_FONDOS = FONDOS.flatMap((f) => (f.desbloqueo.tipo === "tienda" ? [{ id: `fondo:${f.id}`, nombre: `Fondo: ${f.nombre}`, precio: f.desbloqueo.precio }] : []));

const giraCompleta = (s: CareerState) => (g: (typeof CAREER_GAMES)[number]) => estadoGira(GIRAS[g], progresoDe(s, g)).every((r) => r.completa);

export function fondoDesbloqueado(s: CareerState, f: FondoDef): boolean {
  const d = f.desbloqueo;
  switch (d.tipo) {
    case "inicio":
      return true;
    case "jefe":
      return CAREER_GAMES.some((g) => (progresoDe(s, g).vencidos[`${d.region}-jefe`] ?? 0) > 0);
    case "region":
      return CAREER_GAMES.some((g) => estadoGira(GIRAS[g], progresoDe(s, g)).some((r) => r.id === d.region && r.abierta));
    case "gira-completa":
      return CAREER_GAMES.some(giraCompleta(s));
    case "todas-las-giras":
      return CAREER_GAMES.every(giraCompleta(s));
    case "victorias":
      return (s.contadores.ganadas ?? 0) >= d.cantidad;
    case "logros":
      return LOGROS.filter((l) => s.logros[l.id] !== undefined).length >= d.cantidad;
    case "tienda":
      return tiene(s, `fondo:${f.id}`);
  }
}

/** Cómo se consigue, en palabras (para el candado). */
export function comoSeDesbloquea(f: FondoDef): string {
  const d = f.desbloqueo;
  const region = (id: RegionId) => GIRAS.truco.regiones.find((r) => r.region.id === id)!.region.nombre;
  switch (d.tipo) {
    case "inicio":
      return "Disponible desde el principio";
    case "jefe":
      return `Ganale al jefe de ${region(d.region)} en cualquier gira`;
    case "region":
      return `Llegá a ${region(d.region)} en cualquier gira`;
    case "gira-completa":
      return "Completá una gira entera";
    case "todas-las-giras":
      return "Completá las cinco giras";
    case "victorias":
      return `Ganá ${d.cantidad} partidas`;
    case "logros":
      return `Conseguí ${d.cantidad} logros`;
    case "tienda":
      return `Se compra con ${d.precio} fósforos${`fondo:${f.id}` === REGALO_BUENOS_AIRES ? " (o ganale al jefe de Buenos Aires)" : ""}`;
  }
}
