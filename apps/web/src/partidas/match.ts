import type { Hecho } from "@juegos-argentinos/career";
import { randomSeed, type GameDefinition, type GameId, type RngState } from "@juegos-argentinos/engine";
import { HUMAN_ID, HUMAN_SEAT, rivalesAlAzar, type Jugador } from "./jugadores.ts";

/**
 * Partida contra bots guardada en el dispositivo (chinchón, casita; el truco tiene la suya con la misma forma).
 * El asiento 0 es siempre el jugador.
 */
export interface BotMatch<Config, State> {
  version: 1;
  game: GameId;
  config: Config;
  state: State;
  skills: number[];
  adaptativo: boolean;
  rng: RngState;
  jugadores: Jugador[];
  /** Si es una partida de la Gira Nacional: contra quién. */
  carrera?: { rivalId: string };
  /** Cosas que pasaron (para logros). */
  hechos: Hecho[];
  /** Ya se registró el resultado. */
  contada: boolean;
}

export interface NuevaPartida<Config> {
  config: Config;
  players: number;
  botSkill: number;
  adaptativo: boolean;
  yo: Jugador;
  /** Para la gira: el rival fijo (y su nivel). */
  rival?: { id: string; jugador: Jugador; skill: number };
}

export function newBotMatch<Config, State>(def: GameDefinition<Config, State, unknown, unknown, unknown>, p: NuevaPartida<Config>): BotMatch<Config, State> {
  const seed = randomSeed();
  const ids = Array.from({ length: p.players }, (_, i) => (i === HUMAN_SEAT ? HUMAN_ID : `bot-${i}`));
  const [rivales, rng] = rivalesAlAzar(seed, p.players - 1);
  const jugadores = ids.map((_, i) => (i === HUMAN_SEAT ? p.yo : p.rival && i === 1 ? p.rival.jugador : rivales[i - 1]!));
  const skills = ids.map((_, i) => (i === HUMAN_SEAT ? 0 : p.rival && i === 1 ? p.rival.skill : p.botSkill));
  return {
    version: 1,
    game: def.id,
    config: p.config,
    state: def.initialState(p.config, ids, seed),
    skills,
    adaptativo: p.adaptativo && !p.rival,
    rng,
    jugadores,
    ...(p.rival ? { carrera: { rivalId: p.rival.id } } : {}),
    hechos: [],
    contada: false,
  };
}

const key = (game: GameId) => `juegos-argentinos:partida:${game}`;

export function saveBotMatch(m: BotMatch<unknown, unknown>) {
  try {
    localStorage.setItem(key(m.game), JSON.stringify(m));
  } catch {
    // Sin storage: se juega igual, solo no se puede retomar.
  }
}

export function loadBotMatch<Config, State>(game: GameId, check: (m: BotMatch<Config, State>) => boolean): BotMatch<Config, State> | null {
  try {
    const raw = localStorage.getItem(key(game));
    if (!raw) return null;
    const m = JSON.parse(raw) as BotMatch<Config, State>;
    const ok = m?.version === 1 && m.game === game && Array.isArray(m.skills) && Array.isArray(m.jugadores) && Array.isArray(m.rng) && m.rng.length === 4 && Array.isArray(m.hechos) && check(m);
    return ok ? m : null;
  } catch {
    return null;
  }
}

export function clearBotMatch(game: GameId) {
  try {
    localStorage.removeItem(key(game));
  } catch {
    // nada
  }
}
