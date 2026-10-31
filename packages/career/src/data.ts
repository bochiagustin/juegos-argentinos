import type { CasitaConfig } from "@juegos-argentinos/engine/casita";
import type { ChinchonConfig } from "@juegos-argentinos/engine/chinchon";
import type { EscobaConfig } from "@juegos-argentinos/engine/escoba";
import type { TrucoConfig } from "@juegos-argentinos/engine/truco";
import type { TuttiConfig } from "@juegos-argentinos/engine/tutti-frutti";
import { PERSONAJES } from "./personajes.ts";
import { SLOTS, type CareerGame, type GiraDef, type LogroDef, type Personaje, type RegionDef, type Slot } from "./types.ts";

export { PERSONAJES };

export const REGIONES: RegionDef[] = [
  { id: "buenos-aires", nombre: "Buenos Aires", umbral: 0 },
  { id: "cuyo", nombre: "Cuyo", umbral: 500 },
  { id: "mesopotamia", nombre: "Mesopotamia", umbral: 1300 },
  { id: "norte", nombre: "Norte", umbral: 2400 },
  { id: "patagonia", nombre: "Patagonia", umbral: 3800 },
  { id: "malvinas", nombre: "Malvinas", umbral: 5500 },
];


export function personaje(id: string): Personaje {
  const p = PERSONAJES.find((x) => x.id === id);
  if (!p) throw new Error(`Personaje desconocido: ${id}`);
  return p;
}

/** Niveles del bot por región: del más flojo al "9" sube de a poco, y el jefe está un escalón arriba (hasta el 10 del Capitán). */
const NIVELES: { desde: number; hasta: number; jefe: number }[] = [
  { desde: 1, hasta: 3, jefe: 4 },
  { desde: 2, hasta: 4, jefe: 5 },
  { desde: 3, hasta: 5, jefe: 6 },
  { desde: 4, hasta: 6, jefe: 7 },
  { desde: 5, hasta: 8, jefe: 9 },
  { desde: 7, hasta: 9, jefe: 10 },
];
const SKILLS: Record<Slot, number>[] = NIVELES.map(
  (n) => Object.fromEntries(SLOTS.map((s, i) => [s, s === "jefe" ? n.jefe : Math.round(n.desde + ((n.hasta - n.desde) * i) / 8)])) as Record<Slot, number>,
);

function gira<C>(game: CareerGame, nombre: string, porRegion: { reglas: string; config: Partial<C> }[]): GiraDef<C> {
  return { game, nombre, regiones: REGIONES.map((region, i) => ({ region, ...porRegion[i]!, skills: SKILLS[i]! })) };
}

export const GIRA_TRUCO = gira<TrucoConfig>("truco", "Gira del Truco", [
  { reglas: "1 contra 1, a 15, sin flor", config: { players: 2, target: 15, flor: false } },
  { reglas: "1 contra 1, a 15, sin flor", config: { players: 2, target: 15, flor: false } },
  { reglas: "1 contra 1, a 30 (malas y buenas)", config: { players: 2, target: 30, flor: false } },
  { reglas: "1 contra 1, a 30, con flor", config: { players: 2, target: 30, flor: true } },
  { reglas: "1 contra 1, a 30, sin flor", config: { players: 2, target: 30, flor: false } },
  { reglas: "1 contra 1, a 30, con flor", config: { players: 2, target: 30, flor: true } },
]);

export const GIRA_CHINCHON = gira<ChinchonConfig>("chinchon", "Gira del Chinchón", [
  { reglas: "Mano a mano, a 100, con comodines", config: { players: 2, limite: 100 } },
  { reglas: "Mano a mano, a 100, sin comodines", config: { players: 2, limite: 100, jokers: 0 } },
  { reglas: "Mano a mano, a 100, cortando con 7", config: { players: 2, limite: 100, corteMax: 7 } },
  { reglas: "Mano a mano, a 100, mazo de 40", config: { players: 2, limite: 100, deckSize: 40 } },
  { reglas: "Mano a mano, a 100, con comodines", config: { players: 2, limite: 100 } },
  { reglas: "Mano a mano, a 100, comodín suelto vale 50", config: { players: 2, limite: 100 } },
]);

export const GIRA_CASITA = gira<CasitaConfig>("casita-robada", "Gira de la Casita Robada", [
  { reglas: "Mano a mano, se levanta de a una", config: { players: 2, levantar: "una" } },
  { reglas: "Mano a mano, se levantan todas las iguales", config: { players: 2, levantar: "todas" } },
  { reglas: "Mano a mano, robar es obligatorio", config: { players: 2, prioridad: "robar" } },
  { reglas: "Mano a mano, se puede agrandar la propia casita", config: { players: 2, agrandarPropia: true } },
  { reglas: "Mano a mano, lo de la mesa no es de nadie", config: { players: 2, sobrantes: "nadie" } },
  { reglas: "Mano a mano, robar es obligatorio", config: { players: 2, prioridad: "robar" } },
]);

export const GIRA_ESCOBA = gira<EscobaConfig>("escoba", "Gira de la Escoba", [
  { reglas: "Mano a mano, a 15", config: { players: 2, target: 15 } },
  { reglas: "Mano a mano, a 15, levantar es obligatorio", config: { players: 2, target: 15, levantarObligatorio: true } },
  { reglas: "Mano a mano, a 21", config: { players: 2, target: 21 } },
  { reglas: "Mano a mano, a 21, levantar es obligatorio", config: { players: 2, target: 21, levantarObligatorio: true } },
  { reglas: "Mano a mano, a 31", config: { players: 2, target: 31 } },
  { reglas: "Mano a mano, a 31, levantar es obligatorio", config: { players: 2, target: 31, levantarObligatorio: true } },
]);

export const GIRA_TUTTI = gira<TuttiConfig>("tutti-frutti", "Gira del Tutti-Frutti", [
  { reglas: "Mano a mano, 3 rondas, 3 minutos por ronda", config: { players: 2, fin: { tipo: "rondas", rondas: 3 }, tiempoMaximo: 180 } },
  { reglas: "Mano a mano, 4 rondas, 2 minutos y medio", config: { players: 2, fin: { tipo: "rondas", rondas: 4 }, tiempoMaximo: 150 } },
  { reglas: "Mano a mano, 5 rondas, 2 minutos y medio", config: { players: 2, fin: { tipo: "rondas", rondas: 5 }, tiempoMaximo: 150 } },
  { reglas: "Mano a mano, 5 rondas, 2 minutos, cuenta de 4", config: { players: 2, fin: { tipo: "rondas", rondas: 5 }, tiempoMaximo: 120, cuentaRegresiva: 4 } },
  { reglas: "Mano a mano, a 300 puntos, 2 minutos, cuenta de 3", config: { players: 2, fin: { tipo: "puntos", puntos: 300 }, tiempoMaximo: 120, cuentaRegresiva: 3 } },
  { reglas: "Mano a mano, a 400 puntos, 100 segundos, cuenta de 3", config: { players: 2, fin: { tipo: "puntos", puntos: 400 }, tiempoMaximo: 100, cuentaRegresiva: 3 } },
]);

export const GIRAS: Record<CareerGame, GiraDef<unknown>> = {
  truco: GIRA_TRUCO as GiraDef<unknown>,
  chinchon: GIRA_CHINCHON as GiraDef<unknown>,
  "casita-robada": GIRA_CASITA as GiraDef<unknown>,
  escoba: GIRA_ESCOBA as GiraDef<unknown>,
  "tutti-frutti": GIRA_TUTTI as GiraDef<unknown>,
};

/**
 * Puntos de gira por ganarle a un rival: al de arriba (le sacás el puesto) o al jefe vale mucho;
 * a uno de abajo, poquito (no cambia nada en el ranking).
 */
export function puntosPorVictoria(regionIndex: number, slot: Slot, arriba: boolean): number {
  if (!arriba) return 10 + 5 * regionIndex;
  return slot === "jefe" ? 200 + 100 * regionIndex : 40 + 20 * regionIndex;
}

export const LOGROS: LogroDef[] = [
  { id: "primera-victoria", nombre: "Primera victoria", descripcion: "Ganá tu primera partida contra la máquina.", icono: "🏆", fosforos: 20 },
  { id: "diez-victorias", nombre: "Diez victorias", descripcion: "Ganá 10 partidas, en cualquier juego.", icono: "🔟", fosforos: 50 },
  { id: "cincuenta-victorias", nombre: "Cincuenta victorias", descripcion: "Ganá 50 partidas, en cualquier juego.", icono: "🥇", fosforos: 150 },
  { id: "remontada", nombre: "La remontada", descripcion: "Ganá una partida que venías perdiendo por mucho.", icono: "🔥", fosforos: 40 },
  { id: "paliza", nombre: "Paliza", descripcion: "Ganá una partida por amplia diferencia.", icono: "💪", fosforos: 30 },
  { id: "pasaporte", nombre: "Pasaporte", descripcion: "Desbloqueá Cuyo en cualquier gira.", icono: "🛂", fosforos: 30 },
  { id: "gira-completa", nombre: "Gira Nacional", descripcion: "Ganale al Capitán de la Fragata en cualquier gira.", icono: "🇦🇷", fosforos: 300 },
  { id: "campeon-nacional", nombre: "Campeón nacional", descripcion: "Completá todas las giras.", icono: "👑", fosforos: 1000 },
  { id: "coleccionista", nombre: "Coleccionista", descripcion: "Conseguí un fondo de mesa de la tienda.", icono: "🖼️", fosforos: 20 },
  { id: "treinta-y-tres", nombre: "Treinta y tres", descripcion: "Cantá 33 de envido.", icono: "🎯", fosforos: 30, juego: "truco" },
  { id: "vale-cuatro", nombre: "¡Vale cuatro!", descripcion: "Ganá una mano con el vale cuatro querido.", icono: "4️⃣", fosforos: 30, juego: "truco" },
  { id: "ancho-en-tercera", nombre: "El ancho en la tercera", descripcion: "Ganá la tercera baza con el ancho de espada.", icono: "🗡️", fosforos: 20, juego: "truco" },
  { id: "chinchon", nombre: "¡Chinchón!", descripcion: "Cortá con escalera de 7 del mismo palo.", icono: "🌟", fosforos: 100, juego: "chinchon" },
  { id: "menos-diez", nombre: "Menos diez", descripcion: "Cortá con todas las cartas ligadas.", icono: "➖", fosforos: 30, juego: "chinchon" },
  { id: "ligador", nombre: "Ligador", descripcion: "Ligá 3 o más cartas al corte de otro.", icono: "🔗", fosforos: 20, juego: "chinchon" },
  { id: "ladron", nombre: "Ladrón de casitas", descripcion: "Robá 3 casitas en una misma partida.", icono: "🦹", fosforos: 30, juego: "casita-robada" },
  { id: "intocable", nombre: "Intocable", descripcion: "Ganá sin que te roben la casita ni una vez.", icono: "🛡️", fosforos: 30, juego: "casita-robada" },
  { id: "barrendero", nombre: "Barrendero", descripcion: "Hacé 5 escobas en una misma partida.", icono: "🧹", fosforos: 30, juego: "escoba" },
  { id: "escoba-de-mano", nombre: "Escoba de mano", descripcion: "Que te toque la escoba al repartir.", icono: "🍀", fosforos: 20, juego: "escoba" },
  { id: "la-setenta", nombre: "Los cuatro sietes", descripcion: "Llevate los cuatro sietes en una ronda.", icono: "7️⃣", fosforos: 30, juego: "escoba" },
  { id: "tutti-pleno", nombre: "Pleno", descripcion: "Completá todas las categorías bien en una ronda.", icono: "📝", fosforos: 30, juego: "tutti-frutti" },
  { id: "tutti-rayo", nombre: "Rayo", descripcion: "Cantá ¡BASTA! en menos de 60 segundos.", icono: "⚡", fosforos: 40, juego: "tutti-frutti" },
  { id: "tutti-solo", nombre: "El único", descripcion: "Sé el único con respuesta en 3 categorías de una misma ronda.", icono: "🦄", fosforos: 30, juego: "tutti-frutti" },
  { id: "ascenso", nombre: "¡Ascenso!", descripcion: "Subí de categoría en el Ascenso.", icono: "⚽", fosforos: 50 },
  { id: "a-primera", nombre: "En Primera", descripcion: "Llegá a Primera División en el Ascenso.", icono: "🏟️", fosforos: 200 },
  { id: "campeon-primera", nombre: "Campeón de Primera", descripcion: "Salí campeón de Primera División.", icono: "👑", fosforos: 500 },
  { id: "copa-argentina", nombre: "Copa Argentina", descripcion: "Ganá la Copa Argentina en el Ascenso.", icono: "🏆", fosforos: 250 },
  { id: "sudamericana", nombre: "Campeón continental", descripcion: "Ganá la Copa Sudamericana en el Ascenso.", icono: "🌎", fosforos: 400 },
  { id: "libertadores", nombre: "Gloria eterna", descripcion: "Ganá la Copa Libertadores en el Ascenso.", icono: "🏆", fosforos: 800 },
  { id: "casa-grande", nombre: "Casa grande", descripcion: "Terminá con 25 cartas o más en tu casita.", icono: "🏠", fosforos: 40, juego: "casita-robada" },
];

/** Lo que se compra con fósforos. */
export const TIENDA: { id: string; nombre: string; precio: number }[] = [
  // Fondos de mesa que se compran (ver fondos.ts). Los mazos son todos gratis.
  { id: "fondo:cafe", nombre: "Fondo: Café de barrio", precio: 300 },
  { id: "fondo:quincho", nombre: "Fondo: Quincho de verano", precio: 400 },
  { id: "fondo:estancia", nombre: "Fondo: Galería de estancia", precio: 500 },
];

/** Regalo por completar Buenos Aires en cualquier gira (un fondo de la tienda). */
export const REGALO_BUENOS_AIRES = "fondo:estancia";
