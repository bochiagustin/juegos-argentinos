import type { Hecho } from "@juegos-argentinos/career";
import { randomSeed, type RngState } from "@juegos-argentinos/engine";
import { truco, type TrucoConfig, type TrucoState } from "@juegos-argentinos/engine/truco";
import { HUMAN_ID, HUMAN_SEAT, rivalesAlAzar, type Jugador } from "../partidas/jugadores.ts";

export { HUMAN_ID, HUMAN_SEAT, type Jugador };

/**
 * Una partida de truco contra la IA, tal como se guarda en el dispositivo.
 * El asiento 0 es siempre el jugador; los demás son bots (en 2v2 y 3v3, los pares son compañeros).
 */
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
  /** Partida de la Gira Nacional: contra quién. */
  carrera?: { rivalId: string };
  /** Cosas que pasaron (para logros). */
  hechos: Hecho[];
  /** La peor diferencia de puntos que tuvo el jugador (para "la remontada"). */
  peorDiferencia: number;
  /** Ya se contó en las estadísticas. */
  contada: boolean;
}

export function newMatch(config: TrucoConfig, botSkill: number, adaptativo: boolean, yo: Jugador, rival?: { id: string; jugador: Jugador; skill: number }): TrucoMatch {
  const seed = randomSeed();
  const players = Array.from({ length: config.players }, (_, i) => (i === HUMAN_SEAT ? HUMAN_ID : `bot-${i}`));
  const [rivales, rng] = rivalesAlAzar(seed, config.players - 1);
  // Los compañeros del jugador juegan un poco mejor que el promedio, para que no te hundan.
  const skills = players.map((_, i) => (i === HUMAN_SEAT ? 0 : rival && i === 1 ? rival.skill : i % 2 === 0 ? Math.min(10, botSkill + 1) : botSkill));
  return {
    version: 1,
    config,
    state: truco.initialState(config, players, seed),
    skills,
    adaptativo: adaptativo && !rival,
    rng,
    jugadores: players.map((_, i) => (i === HUMAN_SEAT ? yo : rival && i === 1 ? rival.jugador : rivales[i - 1]!)),
    ...(rival ? { carrera: { rivalId: rival.id } } : {}),
    hechos: [],
    peorDiferencia: 0,
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
    // Partidas guardadas antes de la carrera: completar los campos nuevos.
    return ok ? { ...m, hechos: Array.isArray(m.hechos) ? m.hechos : [], peorDiferencia: typeof m.peorDiferencia === "number" ? m.peorDiferencia : 0 } : null;
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
