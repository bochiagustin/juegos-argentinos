export const REGION_IDS = ["buenos-aires", "cuyo", "mesopotamia", "norte", "patagonia", "malvinas"] as const;
export type RegionId = (typeof REGION_IDS)[number];
import type { Rasgos } from "@juegos-argentinos/engine";
import type { AscensoProgress } from "./ascenso.ts";

/** Lugar del personaje en su región: del "1" (el más flojo) al "9", y el jefe. */
export const SLOTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "jefe"] as const;
export type Slot = (typeof SLOTS)[number];
/** El jugador en el ranking de una región. */
export const YO = "yo";
export type CareerGame = "truco" | "chinchon" | "casita-robada" | "escoba" | "tutti-frutti";
export const CAREER_GAMES: readonly CareerGame[] = ["truco", "chinchon", "casita-robada", "escoba", "tutti-frutti"];

export interface Personaje {
  /** `${region}-${slot}` (coincide con el arte en arte/rivales/). */
  id: string;
  region: RegionId;
  slot: Slot;
  nombre: string;
  avatar: string;
  /** Quién es, en una línea. */
  bajada: string;
  /** Lo que dice cuando lo desafiás. */
  frase: string;
  /** Su vida, en un párrafo (se lee en su ficha). */
  historia: string;
  /** Mentiroso, pescador y agresivo, de 0 a 10: cambian cómo juega el bot. */
  rasgos: Rasgos;
  /** Cómo se ve (para el prompt del retrato; no se muestra). */
  aspecto: string;
}

export interface RegionDef {
  id: RegionId;
  nombre: string;
  /** Puntos de gira necesarios para entrar (además de ganarle al jefe anterior). */
  umbral: number;
}

export interface RegionEnGira<Config> {
  region: RegionDef;
  /** Cómo se juega en esta región, en palabras. */
  reglas: string;
  /** Reglas de la partida (se combinan con las de base del juego). */
  config: Partial<Config>;
  /** Nivel del bot para cada personaje de la región. */
  skills: Record<Slot, number>;
}

export interface GiraDef<Config = unknown> {
  game: CareerGame;
  nombre: string;
  regiones: RegionEnGira<Config>[];
}

export interface GiraProgress {
  puntos: number;
  /** Victorias contra cada rival (por id de personaje). */
  vencidos: Record<string, number>;
  jugadas: number;
  /** Ranking de cada región, del primero al último (ids de personaje y `YO`). Si falta, se arma de cero. */
  puestos: Partial<Record<RegionId, string[]>>;
}

export interface CareerState {
  version: 1;
  fosforos: number;
  giras: Partial<Record<CareerGame, GiraProgress>>;
  /** El Ascenso de cada juego (si ya arrancó). */
  ascensos: Partial<Record<CareerGame, AscensoProgress>>;
  /** Logro → cuándo se consiguió (ms). */
  logros: Record<string, number>;
  /** Contadores para logros y estadísticas. */
  contadores: Record<string, number>;
  /** Cosas compradas o ganadas (ej. "mazo:argento-nuevo"). */
  desbloqueados: string[];
}

/** Cosas puntuales que pasaron en una partida y sirven para logros. */
export type Hecho =
  | { tipo: "truco-tanto"; valor: number }
  | { tipo: "truco-vale-cuatro-ganado" }
  | { tipo: "truco-ancho-en-tercera" }
  | { tipo: "chinchon" }
  | { tipo: "menos-diez" }
  | { tipo: "ligadas"; cantidad: number }
  | { tipo: "casita-robos"; cantidad: number }
  | { tipo: "casita-me-robaron"; cantidad: number }
  | { tipo: "casita-cartas"; cantidad: number }
  | { tipo: "escoba-escobas"; cantidad: number }
  | { tipo: "escoba-de-mano" }
  | { tipo: "escoba-cuatro-sietes" }
  /** Ronda con todas las categorías válidas. */
  | { tipo: "tutti-pleno" }
  /** Cantó ¡BASTA! a los tantos segundos. */
  | { tipo: "tutti-basta"; segundos: number }
  /** Categorías en las que fue el único con respuesta válida, en una ronda. */
  | { tipo: "tutti-solo"; cantidad: number };

export interface Reporte {
  game: CareerGame;
  ganada: boolean;
  /** Si fue una partida de la gira: contra quién (`ascenso:<club>` si fue del Ascenso). */
  rivalId?: string;
  /** Ganó yendo muy abajo. */
  remontada?: boolean;
  /** Ganó por mucha diferencia. */
  paliza?: boolean;
  hechos: Hecho[];
  /** Momento (ms) para fechar los logros. */
  ahora: number;
}

export interface LogroDef {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  fosforos: number;
  juego?: CareerGame;
}

export interface Premio {
  puntos: number;
  fosforos: number;
  logros: LogroDef[];
  regionDesbloqueada: RegionId | null;
  giraCompleta: boolean;
  regalo: string | null;
  /** Cómo cambió mi puesto en el ranking de la región (si cambió). */
  puesto: { region: RegionId; antes: number; despues: number } | null;
  /** Si fue un partido del Ascenso: qué pasó en el torneo. */
  ascenso: { lineas: string[] } | null;
}
