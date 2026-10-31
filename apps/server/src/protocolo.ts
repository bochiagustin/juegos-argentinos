/**
 * Mensajes entre la app y el servidor de salas (JSON por WebSocket).
 * El servidor es el único que tiene el estado completo: valida toda acción con el motor y le manda
 * a cada conexión solo su vista (`getPlayerView`).
 */
import type { GameId } from "@juegos-argentinos/engine";

/** Los juegos con sala online (el que manda el cliente se valida contra esta lista). */
export const JUEGOS_ONLINE: readonly GameId[] = ["truco", "chinchon", "casita-robada", "escoba", "tutti-frutti", "generala"];

export interface JugadorSala {
  seat: number;
  apodo: string;
  avatar: string;
  bot: boolean;
  /** Nivel, si es un bot. */
  skill?: number;
  conectado: boolean;
  host: boolean;
  /** Ya pidió la revancha. */
  revancha: boolean;
}

export interface SalaInfo {
  codigo: string;
  estado: "lobby" | "jugando" | "fin";
  game: GameId;
  config: unknown;
  jugadores: JugadorSala[];
  /** Mi asiento (-1 si todavía no entré). */
  tuSeat: number;
  soyHost: boolean;
  /** Cantidades de jugadores válidas para el juego elegido. */
  cantidades: number[];
  segundosPorTurno: number;
}

/** Reloj del turno: a quién le toca y cuánto le queda (los ms son relativos al envío). */
export interface RelojTurno {
  seat: number;
  restanteMs: number;
}

/** Reloj del tutti-frutti: cuándo se puede empezar a escribir y cuándo cierra (relativos al envío). */
export interface RelojTutti {
  escribirEnMs: number;
  cierreEnMs: number | null;
}

export type ClienteMsg =
  | { t: "hola"; token: string; apodo: string; avatar: string }
  | { t: "juego"; game: GameId }
  | { t: "config"; config: unknown }
  | { t: "bot"; skill: number }
  | { t: "sacar"; seat: number }
  | { t: "mover"; seat: number; a: number }
  | { t: "turno"; segundos: number }
  | { t: "empezar" }
  | { t: "accion"; action: unknown }
  | { t: "chat"; texto: string; equipo?: boolean }
  | { t: "reaccion"; emoji: string }
  | { t: "sena"; sena: string }
  | { t: "revancha" }
  | { t: "a-la-sala" }
  | { t: "ping" };

export type ServidorMsg =
  | { t: "sala"; sala: SalaInfo }
  | { t: "juego"; game: GameId; view: unknown; valid: unknown[]; events: unknown[]; turno: RelojTurno | null; tutti: RelojTutti | null; terminado: boolean }
  | { t: "chat"; seat: number; texto: string; equipo: boolean }
  | { t: "reaccion"; seat: number; emoji: string }
  | { t: "sena"; seat: number; sena: string }
  | { t: "error"; mensaje: string }
  | { t: "pong" };

export const REACCIONES = ["👏", "😂", "😡", "😱", "🧉", "🔥", "🙏", "🤫"] as const;
export const SENAS = ["ancho-espada", "ancho-basto", "siete-espada", "siete-oro", "tres", "dos", "nada", "flor", "envido"] as const;
export type Sena = (typeof SENAS)[number];

/** Código de sala: 5 letras sin las que se confunden (I, O). */
export const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const esCodigo = (c: string) => new RegExp(`^[${LETRAS_CODIGO}]{5}$`).test(c);
