import type { GameId } from "@juegos-argentinos/engine";
import type { ArtId } from "./art/manifest.ts";

export type ModoId = "ia" | "carrera" | "amigos";
export type ModoEstado = "disponible" | "proximamente";

export interface GameInfo {
  id: GameId;
  nombre: string;
  bajada: string;
  jugadores: string;
  /** Degradé de la tarjeta (desde, hasta). */
  colores: readonly [string, string];
  /** Clase de cuero teñido de la tarjeta (ver index.css). */
  cuero: "cuero-verde" | "cuero-rojo" | "cuero-azul" | "cuero-violeta" | "cuero-mostaza";
  arte: ArtId;
  /** Cartas de muestra para la tarjeta mientras no esté la ilustración (vacío = juego sin cartas). */
  muestra: readonly string[];
  modos: Record<ModoId, ModoEstado>;
  reglas: readonly string[];
}

export const MODOS: Record<ModoId, { nombre: string; bajada: string; icono: string }> = {
  ia: { nombre: "Contra la IA", bajada: "Partida rápida, sin internet. La máquina se pone brava a medida que ganás.", icono: "🤖" },
  carrera: { nombre: "Gira Nacional", bajada: "Recorré el país de Buenos Aires a Malvinas desbloqueando rivales y logros.", icono: "🗺️" },
  amigos: { nombre: "Con amigos", bajada: "Armá una sala y pasales el código por WhatsApp.", icono: "👥" },
};

const PRONTO: Record<ModoId, ModoEstado> = { ia: "proximamente", carrera: "proximamente", amigos: "proximamente" };

export const GAMES: readonly GameInfo[] = [
  {
    id: "truco",
    nombre: "Truco",
    bajada: "El clásico de siempre",
    jugadores: "2, 4 o 6 jugadores",
    colores: ["#2e8b57", "#0d3b2a"],
    cuero: "cuero-verde",
    arte: "juego-truco",
    muestra: ["1-espada", "1-basto", "7-espada"],
    modos: { ia: "disponible", carrera: "disponible", amigos: "proximamente" },
    reglas: [
      "Mazo de 40 cartas, 3 para cada uno. Gana la mano quien gana 2 de las 3 bazas.",
      "Las más fuertes: ancho de espada, ancho de basto, 7 de espada, 7 de oro, los 3 y los 2.",
      "Truco, retruco y vale cuatro suben lo que vale la mano. Si no querés, el otro cobra lo anterior.",
      "En la primera baza se puede cantar envido: dos cartas del mismo palo suman 20 más sus valores.",
      "Se juega a 15 o a 30 puntos (malas y buenas).",
    ],
  },
  {
    id: "chinchon",
    nombre: "Chinchón",
    bajada: "Formá tu mano ideal",
    jugadores: "2 a 6 jugadores",
    colores: ["#b5502c", "#5b1f12"],
    cuero: "cuero-rojo",
    arte: "juego-chinchon",
    muestra: ["4-copa", "5-copa", "6-copa", "7-copa"],
    modos: { ia: "disponible", carrera: "disponible", amigos: "proximamente" },
    reglas: [
      "7 cartas cada uno. En tu turno robás (del mazo o del pozo) y tirás una.",
      "Armá escaleras del mismo palo (3 o más seguidas) o grupos de 3 o 4 del mismo número.",
      "Cortás cuando lo que te queda suelto suma 5 o menos. Si cortás con todo ligado, ¡menos diez!",
      "Cada mano sumás lo que te quedó suelto. Llegás a 100 y quedás afuera.",
      "Escalera de 7 del mismo palo sin comodín: ¡Chinchón! Ganás la partida en el acto.",
    ],
  },
  {
    id: "casita-robada",
    nombre: "Casita Robada",
    bajada: "Robale la casita al de al lado",
    jugadores: "2 a 4 jugadores",
    colores: ["#2f6db5", "#13325e"],
    cuero: "cuero-azul",
    arte: "juego-casita-robada",
    muestra: ["5-oro", "5-copa", "5-basto"],
    modos: { ia: "disponible", carrera: "disponible", amigos: "proximamente" },
    reglas: [
      "3 cartas cada uno y 4 boca arriba en la mesa.",
      "Si tirás una carta del mismo número que una de la mesa, te la llevás a tu casita.",
      "Si coincide con la de arriba de la casita de otro… ¡le robás toda la casita!",
      "Si no coincide con nada, tu carta queda en la mesa.",
      "Gana quien junta más cartas en su casita.",
    ],
  },
  {
    id: "escoba",
    nombre: "Escoba de 15",
    bajada: "Sumá 15 y barré la mesa",
    jugadores: "2 a 4 jugadores",
    colores: ["#8e44ad", "#3b1650"],
    cuero: "cuero-violeta",
    arte: "juego-escoba",
    muestra: ["7-oro", "5-espada", "3-copa"],
    modos: { ia: "disponible", carrera: "disponible", amigos: "proximamente" },
    reglas: [
      "Mazo de 40. Las cartas valen su número; la sota 8, el caballo 9 y el rey 10.",
      "3 cartas cada uno y 4 boca arriba en la mesa.",
      "Tirás una carta: si con cartas de la mesa sumás justo 15, te las llevás todas juntas.",
      "Si dejás la mesa vacía, ¡escoba! Es un punto.",
      "Al final se cuentan puntos por escobas, más cartas, más oros, el 7 de oro y más sietes. Se juega a 15.",
    ],
  },
  {
    id: "tutti-frutti",
    nombre: "Tutti-Frutti",
    bajada: "¡Basta para mí, basta para todos!",
    jugadores: "2 a 10 jugadores",
    colores: ["#f59e0b", "#a4470b"],
    cuero: "cuero-mostaza",
    arte: "juego-tutti-frutti",
    muestra: [],
    modos: PRONTO,
    reglas: [
      "Sale una letra y todos completan las categorías: nombre, país, animal, fruta, color…",
      "El primero que termina grita ¡BASTA! y los demás tienen unos segundos para cerrar.",
      "10 puntos por respuesta única, 5 si alguien puso lo mismo, 20 si sos el único en la categoría.",
      "Las respuestas dudosas se votan entre todos.",
    ],
  },
];

export function gameInfo(id: GameId): GameInfo {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Juego desconocido: ${id}`);
  return g;
}
