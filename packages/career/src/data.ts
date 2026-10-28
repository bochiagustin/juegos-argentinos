import type { CasitaConfig } from "@juegos-argentinos/engine/casita";
import type { ChinchonConfig } from "@juegos-argentinos/engine/chinchon";
import type { TrucoConfig } from "@juegos-argentinos/engine/truco";
import type { CareerGame, GiraDef, LogroDef, Personaje, RegionDef, Slot } from "./types.ts";

export const REGIONES: RegionDef[] = [
  { id: "buenos-aires", nombre: "Buenos Aires", umbral: 0 },
  { id: "cuyo", nombre: "Cuyo", umbral: 300 },
  { id: "mesopotamia", nombre: "Mesopotamia", umbral: 900 },
  { id: "norte", nombre: "Norte", umbral: 1700 },
  { id: "patagonia", nombre: "Patagonia", umbral: 2700 },
  { id: "malvinas", nombre: "Malvinas", umbral: 3900 },
];

/** Los 18 personajes de la gira (los mismos en los tres juegos). Inventados: nada de gente real. */
export const PERSONAJES: Personaje[] = [
  { id: "buenos-aires-1", region: "buenos-aires", slot: "1", nombre: "Coco", avatar: "🚕", bajada: "Tachero de Constitución", frase: "Subí, que el reloj ya está corriendo.", estilo: "parejo" },
  { id: "buenos-aires-2", region: "buenos-aires", slot: "2", nombre: "Doña Elsa", avatar: "👵", bajada: "La del almacén de la esquina", frase: "Te anoto en la libreta, nene.", estilo: "conservador" },
  { id: "buenos-aires-jefe", region: "buenos-aires", slot: "jefe", nombre: "El Polaco", avatar: "🎩", bajada: "Tanguero de Boedo", frase: "Acá se juega con el corazón… y con el ancho.", estilo: "mentiroso" },
  { id: "cuyo-1", region: "cuyo", slot: "1", nombre: "Mario", avatar: "🍇", bajada: "Viñatero de Maipú", frase: "Esto se juega como se poda: sin apuro.", estilo: "parejo" },
  { id: "cuyo-2", region: "cuyo", slot: "2", nombre: "Rosita", avatar: "🧺", bajada: "Cosechera de la vendimia", frase: "Este año la cosecha viene buena.", estilo: "agresivo" },
  { id: "cuyo-jefe", region: "cuyo", slot: "jefe", nombre: "Don Aníbal", avatar: "🍷", bajada: "Bodeguero de toda la vida", frase: "Paciencia, que el buen vino se hace esperar.", estilo: "conservador" },
  { id: "mesopotamia-1", region: "mesopotamia", slot: "1", nombre: "Ñato", avatar: "🎣", bajada: "Pescador del Paraná", frase: "Picó, picó… ¡a ver qué sacamos!", estilo: "parejo" },
  { id: "mesopotamia-2", region: "mesopotamia", slot: "2", nombre: "Mirta", avatar: "🧉", bajada: "Yerbatera de Misiones", frase: "Cebá uno y arrancamos.", estilo: "conservador" },
  { id: "mesopotamia-jefe", region: "mesopotamia", slot: "jefe", nombre: "El Chamamecero", avatar: "🪗", bajada: "Acordeón en mano, de Corrientes", frase: "¡Sapucai! Vamos que se arma.", estilo: "agresivo" },
  { id: "norte-1", region: "norte", slot: "1", nombre: "Benjamín", avatar: "🥁", bajada: "Coplero de la Quebrada", frase: "Te canto una copla antes de ganarte.", estilo: "parejo" },
  { id: "norte-2", region: "norte", slot: "2", nombre: "Doña Aurora", avatar: "🧶", bajada: "Tejedora de Humahuaca", frase: "Hilo por hilo se arma la manta.", estilo: "conservador" },
  { id: "norte-jefe", region: "norte", slot: "jefe", nombre: "El Diablo del Carnaval", avatar: "😈", bajada: "Sale una vez al año… y hoy salió", frase: "¿Te animás a jugar con el diablo?", estilo: "mentiroso" },
  { id: "patagonia-1", region: "patagonia", slot: "1", nombre: "Gonzalo", avatar: "🏔️", bajada: "Guía de montaña en Bariloche", frase: "Despacito, que el cerro no se va.", estilo: "conservador" },
  { id: "patagonia-2", region: "patagonia", slot: "2", nombre: "Nahuel", avatar: "🐑", bajada: "Esquilador de Chubut", frase: "Cuando hace frío, se juega mejor.", estilo: "agresivo" },
  { id: "patagonia-jefe", region: "patagonia", slot: "jefe", nombre: "La Galesa del té", avatar: "☕", bajada: "Casa de té de Gaiman", frase: "Primero la torta galesa, después te gano.", estilo: "mentiroso" },
  { id: "malvinas-1", region: "malvinas", slot: "1", nombre: "Sosa", avatar: "⚓", bajada: "Marinero de la fragata", frase: "Mar picado, mano picada.", estilo: "agresivo" },
  { id: "malvinas-2", region: "malvinas", slot: "2", nombre: "Doña Inés", avatar: "🍲", bajada: "La cocinera del buque", frase: "Con la panza llena se piensa mejor.", estilo: "conservador" },
  { id: "malvinas-jefe", region: "malvinas", slot: "jefe", nombre: "El Capitán de la Fragata", avatar: "⛵", bajada: "El último desafío de la gira", frase: "Hasta acá llegaste. A ver si te da el cuero.", estilo: "mentiroso" },
];

export function personaje(id: string): Personaje {
  const p = PERSONAJES.find((x) => x.id === id);
  if (!p) throw new Error(`Personaje desconocido: ${id}`);
  return p;
}

/** Niveles del bot por región: sube de a poco hasta el 10 del Capitán. */
const SKILLS: Record<Slot, number>[] = [
  { "1": 2, "2": 3, jefe: 4 },
  { "1": 3, "2": 4, jefe: 5 },
  { "1": 4, "2": 5, jefe: 6 },
  { "1": 5, "2": 6, jefe: 7 },
  { "1": 6, "2": 7, jefe: 8 },
  { "1": 8, "2": 9, jefe: 10 },
];

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

export const GIRAS: Record<CareerGame, GiraDef<unknown>> = {
  truco: GIRA_TRUCO as GiraDef<unknown>,
  chinchon: GIRA_CHINCHON as GiraDef<unknown>,
  "casita-robada": GIRA_CASITA as GiraDef<unknown>,
};

/** Puntos de gira por ganarle a un rival (el jefe vale el doble). */
export function puntosPorVictoria(regionIndex: number, slot: Slot): number {
  const base = 150 + 100 * regionIndex;
  return slot === "jefe" ? base * 2 : base;
}

export const LOGROS: LogroDef[] = [
  { id: "primera-victoria", nombre: "Primera victoria", descripcion: "Ganá tu primera partida contra la máquina.", icono: "🏆", fosforos: 20 },
  { id: "diez-victorias", nombre: "Diez victorias", descripcion: "Ganá 10 partidas, en cualquier juego.", icono: "🔟", fosforos: 50 },
  { id: "cincuenta-victorias", nombre: "Cincuenta victorias", descripcion: "Ganá 50 partidas, en cualquier juego.", icono: "🥇", fosforos: 150 },
  { id: "remontada", nombre: "La remontada", descripcion: "Ganá una partida que venías perdiendo por mucho.", icono: "🔥", fosforos: 40 },
  { id: "paliza", nombre: "Paliza", descripcion: "Ganá una partida por amplia diferencia.", icono: "💪", fosforos: 30 },
  { id: "pasaporte", nombre: "Pasaporte", descripcion: "Desbloqueá Cuyo en cualquier gira.", icono: "🛂", fosforos: 30 },
  { id: "gira-completa", nombre: "Gira Nacional", descripcion: "Ganale al Capitán de la Fragata en cualquier gira.", icono: "🇦🇷", fosforos: 300 },
  { id: "campeon-nacional", nombre: "Campeón nacional", descripcion: "Completá las tres giras.", icono: "👑", fosforos: 1000 },
  { id: "coleccionista", nombre: "Coleccionista", descripcion: "Conseguí un Mazo Argento.", icono: "🃏", fosforos: 20 },
  { id: "treinta-y-tres", nombre: "Treinta y tres", descripcion: "Cantá 33 de envido.", icono: "🎯", fosforos: 30, juego: "truco" },
  { id: "vale-cuatro", nombre: "¡Vale cuatro!", descripcion: "Ganá una mano con el vale cuatro querido.", icono: "4️⃣", fosforos: 30, juego: "truco" },
  { id: "ancho-en-tercera", nombre: "El ancho en la tercera", descripcion: "Ganá la tercera baza con el ancho de espada.", icono: "🗡️", fosforos: 20, juego: "truco" },
  { id: "chinchon", nombre: "¡Chinchón!", descripcion: "Cortá con escalera de 7 del mismo palo.", icono: "🌟", fosforos: 100, juego: "chinchon" },
  { id: "menos-diez", nombre: "Menos diez", descripcion: "Cortá con todas las cartas ligadas.", icono: "➖", fosforos: 30, juego: "chinchon" },
  { id: "ligador", nombre: "Ligador", descripcion: "Ligá 3 o más cartas al corte de otro.", icono: "🔗", fosforos: 20, juego: "chinchon" },
  { id: "ladron", nombre: "Ladrón de casitas", descripcion: "Robá 3 casitas en una misma partida.", icono: "🦹", fosforos: 30, juego: "casita-robada" },
  { id: "intocable", nombre: "Intocable", descripcion: "Ganá sin que te roben la casita ni una vez.", icono: "🛡️", fosforos: 30, juego: "casita-robada" },
  { id: "casa-grande", nombre: "Casa grande", descripcion: "Terminá con 25 cartas o más en tu casita.", icono: "🏠", fosforos: 40, juego: "casita-robada" },
];

/** Lo que se compra con fósforos. */
export const TIENDA: { id: string; nombre: string; precio: number }[] = [
  { id: "mazo:argento-nuevo", nombre: "Nuevo Mazo Argento", precio: 250 },
  { id: "mazo:argento-memes", nombre: "Mazo Argento Memes", precio: 400 },
  { id: "mazo:argento-campeon", nombre: "Mazo Argento Campeón del Mundo", precio: 600 },
];

/** Regalo por completar Buenos Aires en cualquier gira. */
export const REGALO_BUENOS_AIRES = "mazo:argento-nuevo";
