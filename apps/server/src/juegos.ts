/**
 * Los juegos que se pueden jugar online: motor, cantidades de jugadores, cómo sanear la configuración que manda el host
 * (nunca se confía en el cliente), quién juega y cómo juega un bot en ese asiento.
 */
import type { GameDefinition, GameId, RngState } from "@juegos-argentinos/engine";
import { casita, chooseCasitaAction, DEFAULT_CASITA_CONFIG, type CasitaConfig, type CasitaState } from "@juegos-argentinos/engine/casita";
import { chinchon, chooseChinchonAction, DEFAULT_CHINCHON_CONFIG, type ChinchonConfig, type ChinchonState } from "@juegos-argentinos/engine/chinchon";
import { chooseEscobaAction, DEFAULT_ESCOBA_CONFIG, escoba, type EscobaConfig, type EscobaState } from "@juegos-argentinos/engine/escoba";
import { actorSeat, chooseTrucoAction, DEFAULT_TRUCO_CONFIG, truco, type TrucoConfig } from "@juegos-argentinos/engine/truco";
import { chancho, DEFAULT_CHANCHO_CONFIG, type ChanchoConfig } from "@juegos-argentinos/engine/chancho";
import { chooseGeneralaAction, DEFAULT_GENERALA_CONFIG, generala, type GeneralaConfig, type GeneralaState } from "@juegos-argentinos/engine/generala";
import { ALFABETO, CATEGORIAS_DE_FABRICA, DEFAULT_TUTTI_CONFIG, tuttiFrutti, type TuttiConfig } from "@juegos-argentinos/engine/tutti-frutti";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface JuegoOnline {
  def: GameDefinition<any, any, any, any, any>;
  cantidades: number[];
  defaultConfig: unknown;
  /** Config segura para `n` jugadores a partir de lo que mandó el host (lo raro se ignora). */
  sanear(raw: unknown, n: number): unknown;
  /** Asiento que tiene que jugar (juegos por turnos); null si nadie. El tutti-frutti no tiene turnos. */
  actor: ((s: any) => number | null) | null;
  choose: ((view: any, valid: any[], rng: RngState, skill: number) => [any, RngState]) | null;
  /** Eventos después de los cuales se espera un rato (para ver el resumen) antes de que sigan los bots y el reloj. */
  pausas: Record<string, number>;
  /** Equipo de un asiento (para el chat de equipo y las señas). */
  equipo(config: any, seat: number): number;
}

const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {});
function uno<T>(v: unknown, opciones: readonly T[], def: T): T {
  return opciones.includes(v as T) ? (v as T) : def;
}
const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
const rango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const individual = (_c: unknown, seat: number) => seat;
const parejas = (c: { parejas: boolean; players: number }, seat: number) => (c.parejas && c.players === 4 ? seat % 2 : seat);

/** Todos los juegos tienen sala online. */
export type JuegoConSala = GameId;

export const JUEGOS: Record<JuegoConSala, JuegoOnline> = {
  chancho: {
    def: chancho,
    cantidades: [3, 4, 5, 6],
    defaultConfig: DEFAULT_CHANCHO_CONFIG,
    sanear(_raw, n): ChanchoConfig {
      return { players: n as ChanchoConfig["players"] };
    },
    // Sin turnos: la sala hace de mesa (pasa las cartas, cierra la nariz, reparte) y juega por los bots.
    actor: null,
    choose: null,
    pausas: {},
    equipo: individual,
  },
  generala: {
    def: generala,
    cantidades: [2, 3, 4, 5, 6],
    defaultConfig: DEFAULT_GENERALA_CONFIG,
    sanear(_raw, n): GeneralaConfig {
      return { players: n as GeneralaConfig["players"] };
    },
    actor: (s: GeneralaState) => (s.ganadores === null ? s.turno : null),
    choose: (v, va, rng, skill) => chooseGeneralaAction(v, va, rng, skill),
    pausas: { "generala-servida": 2500 },
    equipo: individual,
  },
  truco: {
    def: truco,
    cantidades: [2, 4, 6],
    defaultConfig: DEFAULT_TRUCO_CONFIG,
    sanear(raw, n): TrucoConfig {
      const r = obj(raw);
      const d = DEFAULT_TRUCO_CONFIG;
      return {
        players: n as 2 | 4 | 6,
        target: uno(r.target, [15, 30] as const, d.target),
        flor: bool(r.flor, d.flor),
        mazoSumaEnvido: bool(r.mazoSumaEnvido, d.mazoSumaEnvido),
        faltaEnvido: uno(r.faltaEnvido, ["por-etapa", "partido"] as const, d.faltaEnvido),
      };
    },
    actor: actorSeat,
    choose: (v, va, rng, skill) => chooseTrucoAction(v, va, rng, skill),
    pausas: { "fin-ronda": 4500 },
    equipo: (_c, seat) => seat % 2,
  },
  chinchon: {
    def: chinchon,
    cantidades: rango(2, 6),
    defaultConfig: DEFAULT_CHINCHON_CONFIG,
    sanear(raw, n): ChinchonConfig {
      const r = obj(raw);
      const d = DEFAULT_CHINCHON_CONFIG;
      return {
        ...d,
        players: n,
        deckSize: uno(r.deckSize, [40, 48] as const, d.deckSize),
        jokers: uno(r.jokers, [0, 2] as const, d.jokers),
        corteMax: uno(r.corteMax, [5, 7] as const, d.corteMax),
        comodinSuelto: uno(r.comodinSuelto, [50, 25] as const, d.comodinSuelto),
        unComodinPorCombinacion: bool(r.unComodinPorCombinacion, d.unComodinPorCombinacion),
        reenganche: bool(r.reenganche, d.reenganche),
      };
    },
    actor: (s: ChinchonState) => (s.winner === null ? s.turn : null),
    choose: (v, va, rng, skill) => chooseChinchonAction(v, va, rng, skill),
    pausas: { "fin-ronda": 5000 },
    equipo: individual,
  },
  "casita-robada": {
    def: casita,
    cantidades: [2, 3, 4],
    defaultConfig: DEFAULT_CASITA_CONFIG,
    sanear(raw, n): CasitaConfig {
      const r = obj(raw);
      const d = DEFAULT_CASITA_CONFIG;
      return {
        players: n as 2 | 3 | 4,
        parejas: n === 4 && bool(r.parejas, d.parejas),
        levantar: uno(r.levantar, ["una", "todas"] as const, d.levantar),
        prioridad: uno(r.prioridad, ["eleccion", "robar", "mesa"] as const, d.prioridad),
        agrandarPropia: bool(r.agrandarPropia, d.agrandarPropia),
        sobrantes: uno(r.sobrantes, ["ultimo", "nadie"] as const, d.sobrantes),
      };
    },
    actor: (s: CasitaState) => (s.result === null ? s.turn : null),
    choose: (v, va, rng, skill) => chooseCasitaAction(v, va, rng, skill),
    pausas: { robo: 1800 },
    equipo: parejas,
  },
  escoba: {
    def: escoba,
    cantidades: [2, 3, 4],
    defaultConfig: DEFAULT_ESCOBA_CONFIG,
    sanear(raw, n): EscobaConfig {
      const r = obj(raw);
      const d = DEFAULT_ESCOBA_CONFIG;
      return {
        players: n as 2 | 3 | 4,
        parejas: n === 4 && bool(r.parejas, d.parejas),
        target: uno(r.target, [15, 21, 31] as const, d.target),
        levantarObligatorio: bool(r.levantarObligatorio, d.levantarObligatorio),
      };
    },
    actor: (s: EscobaState) => (s.winner === null ? s.turn : null),
    choose: (v, va, rng, skill) => chooseEscobaAction(v, va, rng, skill),
    pausas: { "fin-ronda": 5000, "escoba-de-mano": 1600 },
    equipo: parejas,
  },
  "tutti-frutti": {
    def: tuttiFrutti,
    cantidades: rango(2, 10),
    defaultConfig: { ...DEFAULT_TUTTI_CONFIG, votacion: true },
    sanear(raw, n): TuttiConfig {
      const r = obj(raw);
      const d = DEFAULT_TUTTI_CONFIG;
      const cats = Array.isArray(r.categorias) ? [...new Set(r.categorias.filter((c): c is string => typeof c === "string").map((c) => c.trim().slice(0, 24)).filter(Boolean))].slice(0, 15) : [];
      const exc = Array.isArray(r.excluidas) ? [...new Set(r.excluidas.filter((l): l is string => typeof l === "string" && ALFABETO.includes(l)))] : d.excluidas;
      const fin = obj(r.fin);
      return {
        players: n,
        categorias: cats.length >= 3 ? cats : CATEGORIAS_DE_FABRICA,
        excluidas: ALFABETO.length - exc.length >= 3 ? exc : d.excluidas,
        cuentaRegresiva: uno(r.cuentaRegresiva, [3, 4, 5] as const, d.cuentaRegresiva),
        tiempoMaximo: uno(r.tiempoMaximo, [60, 90, 120, 150, 180], d.tiempoMaximo),
        fin: fin.tipo === "puntos" ? { tipo: "puntos", puntos: uno(fin.puntos, [100, 200, 300, 500], 300) } : { tipo: "rondas", rondas: uno(fin.rondas, rango(1, 15), 5) },
        votacion: bool(r.votacion, true),
      };
    },
    actor: null,
    choose: null,
    pausas: {},
    equipo: individual,
  },
};
