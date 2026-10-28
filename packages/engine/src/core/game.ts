/**
 * Contrato común de todos los juegos. Cada juego es una máquina de estados
 * pura: sin red, sin UI, sin Math.random ni Date.now (el azar entra por el
 * RNG con semilla guardado en el estado; el tiempo, por acciones del servidor).
 *
 * El servidor guarda `State` completo y solo manda `View` a cada jugador.
 */

export type PlayerId = string;

/**
 * Resultado de aplicar una acción. `events` describe lo que pasó (cantos, bazas, puntos):
 * la UI lo usa para animar y sonar, y la carrera para dar logros. Son públicos: no revelan cartas ocultas.
 */
export type ActionResult<State, Event = never> =
  | { readonly ok: true; readonly state: State; readonly events: readonly Event[] }
  | { readonly ok: false; readonly error: string };

export interface GameDefinition<Config, State, Action, View, Event = never> {
  readonly id: GameId;
  /** Crea el estado inicial. La semilla define todo el azar de la partida. */
  initialState(config: Config, players: readonly PlayerId[], seed: string): State;
  /** Acciones válidas para un jugador en este momento (vacío si no le toca). */
  getValidActions(state: State, playerId: PlayerId): Action[];
  /** Aplica una acción. Devuelve error si la acción no es válida. */
  applyAction(state: State, playerId: PlayerId, action: Action): ActionResult<State, Event>;
  /** Lo que puede ver ese jugador: nunca incluye cartas ocultas de otros ni el mazo. */
  getPlayerView(state: State, playerId: PlayerId): View;
  /** true cuando la partida terminó. */
  isGameOver(state: State): boolean;
}

export type GameId = "truco" | "chinchon" | "casita-robada" | "escoba" | "tutti-frutti";
