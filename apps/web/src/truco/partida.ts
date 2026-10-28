import { createRng, randomSeed, shuffle, type RngState } from "@juegos-argentinos/engine";
import { truco, type TrucoConfig, type TrucoState } from "@juegos-argentinos/engine/truco";

/**
 * Una partida de truco contra la IA, tal como se guarda en el dispositivo.
 * El asiento 0 es siempre el jugador; los demás son bots (en 2v2 y 3v3, los pares son compañeros).
 */
export interface Jugador {
  nombre: string;
  avatar: string;
}

export interface TrucoMatch {
  version: 1;
  config: TrucoConfig;
  state: TrucoState;
  /** Nivel de cada asiento (el 0, el humano, no se usa). */
  skills: number[];
  /** Si el nivel salió del rating del jugador (se actualiza al terminar). */
  adaptativo: boolean;
  /** Azar de los bots (separado del azar del reparto). */
  rng: RngState;
  jugadores: Jugador[];
  /** Ya se contó en las estadísticas. */
  contada: boolean;
}

const RIVALES: Jugador[] = [
  { nombre: "Coco", avatar: "🧔" },
  { nombre: "Doña Elsa", avatar: "👵" },
  { nombre: "Pocho", avatar: "🤠" },
  { nombre: "Ñato", avatar: "🎣" },
  { nombre: "Mirta", avatar: "👩‍🦳" },
  { nombre: "Benja", avatar: "🎸" },
  { nombre: "Rosita", avatar: "🍇" },
  { nombre: "Don Aníbal", avatar: "🍷" },
  { nombre: "El Polaco", avatar: "🎩" },
  { nombre: "Nahuel", avatar: "🐑" },
];

export const HUMAN_SEAT = 0;
export const HUMAN_ID = "vos";

export function newMatch(config: TrucoConfig, botSkill: number, adaptativo: boolean, yo: Jugador): TrucoMatch {
  const seed = randomSeed();
  const players = Array.from({ length: config.players }, (_, i) => (i === HUMAN_SEAT ? HUMAN_ID : `bot-${i}`));
  const [rivales, rng] = shuffle(RIVALES, createRng(`${seed}-rivales`));
  // Los compañeros del jugador juegan un poco mejor que el promedio, para que no te hundan.
  const skills = players.map((_, i) => (i === HUMAN_SEAT ? 0 : i % 2 === 0 ? Math.min(10, botSkill + 1) : botSkill));
  return {
    version: 1,
    config,
    state: truco.initialState(config, players, seed),
    skills,
    adaptativo,
    rng,
    jugadores: players.map((_, i) => (i === HUMAN_SEAT ? yo : rivales[i - 1]!)),
    contada: false,
  };
}

const KEY = "juegos-argentinos:partida:truco";

export function saveMatch(m: TrucoMatch) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Sin storage: la partida sigue, solo no se puede retomar.
  }
}

export function loadMatch(): TrucoMatch | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as TrucoMatch;
    const ok =
      m?.version === 1 &&
      Array.isArray(m.state?.players) &&
      m.state.players.length === m.config?.players &&
      m.state.players[HUMAN_SEAT] === HUMAN_ID &&
      Array.isArray(m.skills) &&
      m.skills.length === m.config.players &&
      Array.isArray(m.jugadores) &&
      m.jugadores.length === m.config.players &&
      Array.isArray(m.rng) &&
      m.rng.length === 4;
    return ok ? m : null;
  } catch {
    return null;
  }
}

export function clearMatch() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada
  }
}
