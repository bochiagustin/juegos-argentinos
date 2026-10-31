import { PREFIJO_ASCENSO, registrarPartida, type Hecho, type Premio, type Reporte } from "@juegos-argentinos/career";
import type { GameId } from "@juegos-argentinos/engine";
import { useCallback } from "react";
import { skillForRating, updateRating } from "../ia/nivel.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";

export interface Cierre {
  game: GameId;
  ganada: boolean;
  /** Nivel del bot más fuerte de la mesa (para el rating). */
  botSkill: number;
  adaptativo: boolean;
  rivalId?: string;
  remontada?: boolean;
  paliza?: boolean;
  hechos: Hecho[];
}

export interface ResultadoCierre {
  ganada: boolean;
  premio: Premio;
  nivelAntes: number;
  nivelDespues: number;
  adaptativo: boolean;
  enGira: boolean;
  /** Fue un partido del Ascenso (no hay revancha: se vuelve al torneo). */
  enAscenso: boolean;
}

/** Al terminar una partida: estadísticas del juego, rating adaptativo y carrera (gira, fósforos, logros). */
export function useCerrarPartida() {
  const { save, update } = useSave();
  return useCallback(
    (c: Cierre): ResultadoCierre => {
      const stats = statsDe(save, c.game);
      const rating = c.adaptativo ? updateRating(stats.rating, c.botSkill, c.ganada) : stats.rating;
      const reporte: Reporte = {
        // Los juegos sin gira (generala, chancho) igual cuentan para las estadísticas y los logros generales.
        game: c.game as Reporte["game"],
        ganada: c.ganada,
        hechos: c.hechos,
        ahora: Date.now(),
        ...(c.rivalId ? { rivalId: c.rivalId } : {}),
        ...(c.remontada ? { remontada: true } : {}),
        ...(c.paliza ? { paliza: true } : {}),
      };
      const { state: carrera, premio } = registrarPartida(save.carrera, reporte);
      update((s) => ({
        ...s,
        juegos: { ...s.juegos, [c.game]: { rating, jugadas: stats.jugadas + 1, ganadas: stats.ganadas + (c.ganada ? 1 : 0) } },
        carrera,
      }));
      return {
        ganada: c.ganada,
        premio,
        nivelAntes: c.botSkill,
        nivelDespues: c.adaptativo ? skillForRating(rating) : c.botSkill,
        adaptativo: c.adaptativo,
        enGira: !!c.rivalId && !c.rivalId.startsWith(PREFIJO_ASCENSO),
        enAscenso: !!c.rivalId?.startsWith(PREFIJO_ASCENSO),
      };
    },
    [save, update],
  );
}
