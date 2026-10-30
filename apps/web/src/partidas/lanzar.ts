import type { CareerGame } from "@juegos-argentinos/career";
import { casita, DEFAULT_CASITA_CONFIG, type CasitaConfig } from "@juegos-argentinos/engine/casita";
import { chinchon, DEFAULT_CHINCHON_CONFIG, type ChinchonConfig } from "@juegos-argentinos/engine/chinchon";
import { DEFAULT_ESCOBA_CONFIG, escoba, type EscobaConfig } from "@juegos-argentinos/engine/escoba";
import { DEFAULT_TRUCO_CONFIG, type TrucoConfig } from "@juegos-argentinos/engine/truco";
import { DEFAULT_TUTTI_CONFIG, tuttiFrutti, type TuttiConfig } from "@juegos-argentinos/engine/tutti-frutti";
import type { Route } from "../nav.tsx";
import { newMatch, saveMatch } from "../truco/partida.ts";
import type { Jugador } from "./jugadores.ts";
import { newBotMatch, saveBotMatch } from "./match.ts";

/**
 * Arma y guarda una partida 1 contra 1 de la carrera (Gira o Ascenso) contra un rival fijo, y devuelve la mesa a abrir.
 * `config` son las reglas de la región o categoría (se combinan con las de base del juego).
 */
export function lanzarPartida(game: CareerGame, config: unknown, yo: Jugador, rival: { id: string; jugador: Jugador; skill: number }): Route {
  const base = { botSkill: rival.skill, adaptativo: false, yo, rival, players: 2 };
  if (game === "truco") {
    saveMatch(newMatch({ ...DEFAULT_TRUCO_CONFIG, ...(config as Partial<TrucoConfig>) }, rival.skill, false, yo, rival));
    return { name: "truco-mesa" };
  }
  if (game === "chinchon") {
    const c: ChinchonConfig = { ...DEFAULT_CHINCHON_CONFIG, ...(config as Partial<ChinchonConfig>), players: 2 };
    saveBotMatch(newBotMatch(chinchon, { ...base, config: c }) as never);
    return { name: "chinchon-mesa" };
  }
  if (game === "escoba") {
    const c: EscobaConfig = { ...DEFAULT_ESCOBA_CONFIG, ...(config as Partial<EscobaConfig>), players: 2, parejas: false };
    saveBotMatch(newBotMatch(escoba, { ...base, config: c }) as never);
    return { name: "escoba-mesa" };
  }
  if (game === "tutti-frutti") {
    const c: TuttiConfig = { ...DEFAULT_TUTTI_CONFIG, ...(config as Partial<TuttiConfig>), players: 2 };
    saveBotMatch(newBotMatch(tuttiFrutti, { ...base, config: c }) as never);
    return { name: "tutti-mesa" };
  }
  const c: CasitaConfig = { ...DEFAULT_CASITA_CONFIG, ...(config as Partial<CasitaConfig>), players: 2, parejas: false };
  saveBotMatch(newBotMatch(casita, { ...base, config: c }) as never);
  return { name: "casita-mesa" };
}
