import { FONDOS, SLOTS } from "@juegos-argentinos/career";
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
  "logo-marco": { path: "arte/logo-marco.webp", width: 1200, height: 561, transparente: true, descripcion: "Marco del logo, sin texto (el texto va en código)" },
  icono: { path: "arte/icono.png", width: 1024, height: 1024, transparente: false, descripcion: "Ícono de la app (con ~20% de margen)" },
  "portada-fondo-vertical": { path: "arte/portada/fondo-vertical.webp", width: 941, height: 1672, transparente: false, descripcion: "Pampa, sin personajes ni texto (celular)" },
  "portada-fondo-horizontal": { path: "arte/portada/fondo-horizontal.webp", width: 1672, height: 941, transparente: false, descripcion: "Pampa, sin personajes ni texto (compu)" },
  "portada-gaucho": { path: "arte/portada/gaucho.webp", width: 899, height: 1200, transparente: true, descripcion: "Gaucho con mate y cartas, recortado" },
  "juego-truco": { path: "arte/juegos/truco.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Truco, sin texto" },
  "juego-chinchon": { path: "arte/juegos/chinchon.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Chinchón, sin texto" },
  "juego-casita-robada": { path: "arte/juegos/casita-robada.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta de la Casita Robada, sin texto" },
  "juego-generala": { path: "arte/juegos/generala.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta de la Generala, sin texto" },
  "juego-escoba": { path: "arte/juegos/escoba.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta de la Escoba de 15, sin texto" },
  "juego-tutti-frutti": { path: "arte/juegos/tutti-frutti.webp", width: 800, height: 500, transparente: false, descripcion: "Tarjeta del Tutti-Frutti, sin texto" },
  "mesa-mate": { path: "arte/mesa/mate.webp", width: 600, height: 600, transparente: true, descripcion: "Mate con bombilla", opcional: true },
  "mesa-poncho": { path: "arte/mesa/poncho.webp", width: 800, height: 600, transparente: true, descripcion: "Poncho o manta doblada", opcional: true },
  "mesa-cartel": { path: "arte/mesa/cartel.webp", width: 800, height: 597, transparente: true, descripcion: "Cartel de madera sin texto", opcional: true },
  "fin-victoria": { path: "arte/fin/victoria.webp", width: 640, height: 640, transparente: false, descripcion: "Gauchos festejando (ganaste)", opcional: true },
  "fin-derrota": { path: "arte/fin/derrota.webp", width: 640, height: 640, transparente: false, descripcion: "Gaucho resignado (perdiste)", opcional: true },
  "ui-sol": { path: "arte/ui/sol-de-mayo.webp", width: 256, height: 256, transparente: true, descripcion: "Sol de Mayo del marcador", opcional: true },
  "ui-banderita": { path: "arte/ui/banderita.webp", width: 154, height: 192, transparente: true, descripcion: "Banderita del marcador", opcional: true },
  "ui-filete": { path: "arte/ui/filete-esquina.webp", width: 192, height: 192, transparente: true, descripcion: "Filete para las esquinas (arriba a la izquierda)", opcional: true },
  "ui-fosforos": { path: "arte/ui/caja-fosforos.webp", width: 192, height: 155, transparente: true, descripcion: "Caja de fósforos (la moneda del juego)", opcional: true },
  "mapa-base": { path: "arte/mapa/base.webp", width: 841, height: 1870, transparente: false, descripcion: "Mapa de Argentina con Malvinas, sin textos" },
} satisfies Record<string, ArtSpec>;

const rivales = Object.fromEntries(
  REGIONES.flatMap((r) =>
    SLOTS.map((slot) => [
      `rival-${r.id}-${slot}`,
      { path: `arte/rivales/${r.id}-${slot}.webp`, width: 512, height: 512, transparente: false, descripcion: `Rival ${slot === "jefe" ? "jefe" : slot} de ${r.nombre}`, opcional: true },
    ]),
  ),
) as Record<`rival-${RegionId}-${(typeof SLOTS)[number]}`, ArtSpec>;

/** Íconos de los botones de canto y de la barra de pestañas (192×192, transparentes). */
const ICONOS_CANTO = ["sombrero", "copa", "corona", "rosa", "flor", "mazo", "si", "no"] as const;
const ICONOS_TAB = ["inicio", "jugar", "logros", "mazos", "ajustes"] as const;
const iconos = Object.fromEntries([
  ...ICONOS_CANTO.map((t) => [`canto-${t}`, { path: `arte/iconos/canto-${t}.webp`, width: 192, height: 192, transparente: true, descripcion: `Ícono de canto: ${t}`, opcional: true }]),
  ...ICONOS_TAB.map((t) => [`tab-${t}`, { path: `arte/iconos/tab-${t}.webp`, width: 192, height: 192, transparente: true, descripcion: `Ícono de la pestaña ${t}`, opcional: true }]),
]) as Record<`canto-${(typeof ICONOS_CANTO)[number]}` | `tab-${(typeof ICONOS_TAB)[number]}`, ArtSpec>;

/** Fondos de mesa (desbloqueables): `arte/fondos/<id>-vertical.webp` y `-horizontal.webp`. */
const fondos = Object.fromEntries(
  FONDOS.flatMap((f) => [
    [`fondo-${f.id}-vertical`, { path: `arte/fondos/${f.id}-vertical.webp`, width: 1290, height: 2796, transparente: false, descripcion: `Fondo ${f.nombre} (celular)`, opcional: true }],
    [`fondo-${f.id}-horizontal`, { path: `arte/fondos/${f.id}-horizontal.webp`, width: 2560, height: 1440, transparente: false, descripcion: `Fondo ${f.nombre} (compu)`, opcional: true }],
  ]),
) as Record<`fondo-${string}-${"vertical" | "horizontal"}`, ArtSpec>;

/** Avatares ilustrados del jugador (`@n` en el perfil). */
const avatares = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [`avatar-${i + 1}`, { path: `arte/avatares/${i + 1}.webp`, width: 384, height: 384, transparente: true, descripcion: `Avatar ${i + 1}`, opcional: true }]),
) as Record<`avatar-${number}`, ArtSpec>;

export const ART = { ...base, ...rivales, ...iconos, ...fondos, ...avatares };
export type ArtId = keyof typeof ART;

export function artUrl(id: ArtId): string {
  return `${import.meta.env.BASE_URL}${ART[id].path}`;
}
