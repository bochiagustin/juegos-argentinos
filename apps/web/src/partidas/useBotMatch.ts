import { rasgosRival } from "@juegos-argentinos/career";
import type { GameDefinition, Rasgos, RngState } from "@juegos-argentinos/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import type { Lote } from "../online/conexion.ts";
import { HUMAN_ID, HUMAN_SEAT } from "./jugadores.ts";
import { saveBotMatch, type BotMatch } from "./match.ts";
import type { Remoto } from "./remoto.ts";

export interface BotMatchOptions<Config, State, Action, View, Event> {
  def: GameDefinition<Config, State, Action, View, Event>;
  /** Partida local (null si es online). */
  initial: BotMatch<Config, State> | null;
  /** Partida online: el estado está en el servidor. */
  remoto?: Remoto | undefined;
  /** Quién tiene que jugar (null si terminó). */
  actor: (s: State) => number | null;
  /** Jugada de un bot. `rasgos`: la personalidad del rival de la gira (mentiroso, pescador, agresivo), si es uno. */
  choose: (view: View, valid: Action[], rng: RngState, skill: number, seat: number, rasgos: Rasgos | undefined) => [Action, RngState];
  /** Efectos de UI por evento (sonidos, carteles). Devuelve hechos nuevos para logros, si hay. */
  onEvents?: (events: readonly Event[], next: BotMatch<Config, State>) => BotMatch<Config, State>["hechos"] | void;
  onFin: (m: BotMatch<Config, State>) => void;
  /** Mientras sea true, los bots no juegan (ej. hay un resumen en pantalla). */
  pausa?: boolean;
  /** Cuánto piensa un bot (ms). */
  pensar?: (s: State, seat: number) => number;
}

export interface MesaCtl<Config, State, Action, View> {
  match: BotMatch<Config, State>;
  view: View;
  valid: Action[];
  jugar: (a: Action) => void;
  miTurno: boolean;
  /** Mi asiento (0 contra la máquina). */
  yo: number;
}

/**
 * Controlador de una mesa: contra bots (el motor corre en el navegador) u online (el motor corre en el servidor).
 * Si una mesa es online lo es toda su vida, así que el orden de los hooks no cambia.
 */
export function useBotMatch<Config, State, Action, View, Event>(o: BotMatchOptions<Config, State, Action, View, Event>): MesaCtl<Config, State, Action, View> {
  return o.remoto ? useRemoteMatch(o, o.remoto) : useLocalMatch(o, o.initial!);
}

/** Procesa los lotes de eventos nuevos que manda el servidor (sin repetir los que ya estaban al montar). */
export function useLotes(lotes: readonly Lote[], fn: (events: readonly unknown[]) => void) {
  const visto = useRef(lotes.at(-1)?.n ?? 0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    for (const l of lotes) {
      if (l.n <= visto.current) continue;
      visto.current = l.n;
      fnRef.current(l.events);
    }
  }, [lotes]);
}

function useRemoteMatch<Config, State, Action, View, Event>(o: BotMatchOptions<Config, State, Action, View, Event>, r: Remoto): MesaCtl<Config, State, Action, View> {
  const view = r.view as View;
  const match = useMemo(
    (): BotMatch<Config, State> => ({
      version: 1,
      game: r.game,
      config: (view as { config: Config }).config,
      state: null as unknown as State,
      skills: [],
      adaptativo: false,
      rng: [0, 0, 0, 0],
      jugadores: r.jugadores,
      hechos: [],
      contada: r.terminado,
    }),
    [r.game, r.jugadores, r.terminado, view],
  );
  const matchRef = useRef(match);
  matchRef.current = match;
  const opts = useRef(o);
  opts.current = o;
  useLotes(r.lotes, (events) => opts.current.onEvents?.(events as Event[], matchRef.current));
  const valid = r.valid as Action[];
  const miTurno = valid.length > 0 && !o.pausa && !r.terminado;
  useEffect(() => {
    if (miTurno) vibrate(20);
  }, [miTurno]);
  return { match, view, valid, jugar: (a: Action) => r.jugar(a), miTurno, yo: r.yo };
}

/** Partida contra bots, con el motor corriendo en el navegador. */
function useLocalMatch<Config, State, Action, View, Event>(o: BotMatchOptions<Config, State, Action, View, Event>, initial: BotMatch<Config, State>): MesaCtl<Config, State, Action, View> {
  const [match, setMatch] = useState(initial);
  const ref = useRef(match);
  ref.current = match;
  const opts = useRef(o);
  opts.current = o;

  const view = useMemo(() => o.def.getPlayerView(match.state, HUMAN_ID), [o.def, match.state]);
  const valid = useMemo(() => o.def.getValidActions(match.state, HUMAN_ID), [o.def, match.state]);

  const apply = useCallback((seat: number, action: Action, rng?: RngState) => {
    const { def, onEvents, onFin } = opts.current;
    const m = ref.current;
    const res = def.applyAction(m.state, seatId(m as BotMatch<unknown, unknown>, seat), action);
    if (!res.ok) {
      playSfx("error");
      return;
    }
    let next: BotMatch<Config, State> = { ...m, state: res.state, rng: rng ?? m.rng };
    const nuevos = onEvents?.(res.events, next);
    if (nuevos && nuevos.length) next = { ...next, hechos: [...next.hechos, ...nuevos] };
    if (def.isGameOver(res.state) && !next.contada) {
      next = { ...next, contada: true };
      ref.current = next;
      setMatch(next);
      onFin(next);
      return;
    }
    ref.current = next;
    setMatch(next);
    saveBotMatch(next as BotMatch<unknown, unknown>);
  }, []);

  const jugar = useCallback((action: Action) => apply(HUMAN_SEAT, action), [apply]);

  const actor = o.actor(match.state);
  const pausa = !!o.pausa;
  useEffect(() => {
    if (actor === null || actor === HUMAN_SEAT || pausa) return;
    const m = match;
    const { def, choose, pensar } = opts.current;
    const id = seatId(m as BotMatch<unknown, unknown>, actor);
    const delay = pensar ? pensar(m.state, actor) : 800;
    const t = window.setTimeout(() => {
      const rasgos = m.carrera && actor === 1 ? rasgosRival(m.carrera.rivalId) : undefined;
      const [action, rng] = choose(def.getPlayerView(m.state, id), def.getValidActions(m.state, id), m.rng, m.skills[actor]!, actor, rasgos);
      apply(actor, action, rng);
    }, delay);
    return () => clearTimeout(t);
  }, [actor, pausa, match, apply]);

  const miTurno = actor === HUMAN_SEAT && !pausa;
  useEffect(() => {
    if (miTurno) vibrate(20);
  }, [miTurno]);

  return { match, view, valid, jugar, miTurno, yo: HUMAN_SEAT };
}

function seatId(m: BotMatch<unknown, unknown>, seat: number): string {
  return (m.state as { players: string[] }).players[seat]!;
}
