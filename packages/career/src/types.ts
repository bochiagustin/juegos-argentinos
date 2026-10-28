export const REGION_IDS = ["buenos-aires", "cuyo", "mesopotamia", "norte", "patagonia", "malvinas"] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type Slot = "1" | "2" | "jefe";
/** Estilo de juego del rival (ajusta el bot: cuánto miente, cuánto se arriesga). */
export type Estilo = "parejo" | "mentiroso" | "conservador" | "agresivo";
export type CareerGame = "truco" | "chinchon" | "casita-robada" | "escoba";
export const CAREER_GAMES: readonly CareerGame[] = ["truco", "chinchon", "casita-robada", "escoba"];

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
  estilo: Estilo;
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
}

export interface CareerState {
  version: 1;
  fosforos: number;
  giras: Partial<Record<CareerGame, GiraProgress>>;
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
  | { tipo: "escoba-cuatro-sietes" };

export interface Reporte {
  game: CareerGame | "tutti-frutti";
  ganada: boolean;
  /** Si fue una partida de la gira: contra quién. */
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
}
