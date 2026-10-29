import type { GameId } from "@juegos-argentinos/engine";
import type { RelojTurno, RelojTutti } from "@juegos-argentinos/server/protocolo";
import type { ReactNode } from "react";
import type { Lote } from "../online/conexion.ts";
import type { Jugador } from "./jugadores.ts";

/**
 * Una partida online vista desde una mesa: el servidor tiene el estado, acá llega solo la vista de este jugador.
 * Las mesas reciben esto en vez de una partida local (mismo dibujo, otro origen de los datos).
 */
export interface Remoto {
  game: GameId;
  /** Mi asiento. */
  yo: number;
  jugadores: Jugador[];
  view: unknown;
  valid: unknown[];
  lotes: Lote[];
  turno: RelojTurno | null;
  tutti: RelojTutti | null;
  /** Cuándo llegó la última vista (para los relojes). */
  recibido: number;
  terminado: boolean;
  jugar(action: unknown): void;
  /** Pantalla de fin de partida online (revancha, volver a la sala). */
  fin(r: { gane: boolean; empate: boolean; marcador: string; momentos?: readonly string[] }): ReactNode;
}
