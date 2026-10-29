import { FONDOS } from "@juegos-argentinos/career";
/**
 * Ilustraciones que provee el usuario (ver docs/arte.md). Cada una tiene un id estable;
 * si el archivo todavía no está en `public/arte/`, <Art> muestra un placeholder del mismo tamaño.
 */

export interface ArtSpec {
  path: string;
  width: number;
  height: number;
  transparente: boolean;
  descripcion: string;
  opcional?: boolean;
}

export const REGIONES = [
  { id: "buenos-aires", nombre: "Buenos Aires" },
  { id: "cuyo", nombre: "Cuyo" },
  { id: "mesopotamia", nombre: "Mesopotamia" },
  { id: "norte", nombre: "Norte" },
  { id: "patagonia", nombre: "Patagonia" },
  { id: "malvinas", nombre: "Malvinas" },
] as const;
export type RegionId = (typeof REGIONES)[number]["id"];

const base = {
  logo: { path: "arte/logo.png", width: 1024, height: 512, transparente: true, descripcion: "Logo “Juegos Argentinos”" },
  icono: { path: "arte/icono.png", width: 1024, height: 1024, transparente: false, descripcion: "Ícono de la app (con ~20% de margen)" },
  "portada-fondo-vertical": { path: "arte/portada/fondo-vertical.png", width: 1080, height: 1920, transparente: false, descripcion: "Pampa, sin personajes ni texto (celular)" },
  "portada-fondo-horizontal": { path: "arte/portada/fondo-horizontal.png", width: 1920, height: 1080, transparente: false, descripcion: "Pampa, sin personajes ni texto (compu)" },
  "portada-gaucho": { path: "arte/portada/gaucho.png", width: 900, height: 1200, transparente: true, descripcion: "Gaucho con mate y cartas, recortado" },
  "juego-truco": { path: "arte/juegos/truco.png", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Truco, sin texto" },
  "juego-chinchon": { path: "arte/juegos/chinchon.png", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Chinchón, sin texto" },
  "juego-casita-robada": { path: "arte/juegos/casita-robada.png", width: 800, height: 500, transparente: false, descripcion: "Tarjeta de la Casita Robada, sin texto" },
  "juego-escoba": { path: "arte/juegos/escoba.png", width: 800, height: 500, transparente: false, descripcion: "Tarjeta de la Escoba de 15, sin texto" },
  "juego-tutti-frutti": { path: "arte/juegos/tutti-frutti.png", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Tutti-Frutti, sin texto" },
  "mesa-mate": { path: "arte/mesa/mate.png", width: 600, height: 600, transparente: true, descripcion: "Mate con bombilla", opcional: true },
  "mesa-poncho": { path: "arte/mesa/poncho.png", width: 800, height: 600, transparente: true, descripcion: "Poncho o manta doblada", opcional: true },
  "mesa-cartel": { path: "arte/mesa/cartel.png", width: 600, height: 800, transparente: true, descripcion: "Cartel de madera sin texto", opcional: true },
  "mapa-base": { path: "arte/mapa/base.png", width: 1080, height: 2400, transparente: false, descripcion: "Mapa de Argentina con Malvinas, sin textos" },
} satisfies Record<string, ArtSpec>;

const rivales = Object.fromEntries(
  REGIONES.flatMap((r) =>
    (["1", "2", "jefe"] as const).map((slot) => [
      `rival-${r.id}-${slot}`,
      { path: `arte/rivales/${r.id}-${slot}.png`, width: 512, height: 512, transparente: true, descripcion: `Rival ${slot === "jefe" ? "jefe" : slot} de ${r.nombre}` },
    ]),
  ),
) as Record<`rival-${RegionId}-${"1" | "2" | "jefe"}`, ArtSpec>;

/** Fondos de mesa (desbloqueables): `arte/fondos/<id>-vertical.webp` y `-horizontal.webp`. */
const fondos = Object.fromEntries(
  FONDOS.flatMap((f) => [
    [`fondo-${f.id}-vertical`, { path: `arte/fondos/${f.id}-vertical.webp`, width: 1290, height: 2796, transparente: false, descripcion: `Fondo ${f.nombre} (celular)`, opcional: true }],
    [`fondo-${f.id}-horizontal`, { path: `arte/fondos/${f.id}-horizontal.webp`, width: 2560, height: 1440, transparente: false, descripcion: `Fondo ${f.nombre} (compu)`, opcional: true }],
  ]),
) as Record<`fondo-${string}-${"vertical" | "horizontal"}`, ArtSpec>;

export const ART = { ...base, ...rivales, ...fondos };
export type ArtId = keyof typeof ART;

export function artUrl(id: ArtId): string {
  return `${import.meta.env.BASE_URL}${ART[id].path}`;
}
