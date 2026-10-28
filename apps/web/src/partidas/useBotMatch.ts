import type { GameDefinition, RngState } from "@juegos-argentinos/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { HUMAN_ID, HUMAN_SEAT } from "./jugadores.ts";
import { saveBotMatch, type BotMatch } from "./match.ts";

export interface BotMatchOptions<Config, State, Action, View, Event> {
  def: GameDefinition<Config, State, Action, View, Event>;
  initial: BotMatch<Config, State>;
  /** Quién tiene que jugar (null si terminó). */
  actor: (s: State) => number | null;
  choose: (view: View, valid: Action[], rng: RngState, skill: number, seat: number) => [Action, RngState];
  /** Efectos de UI por evento (sonidos, carteles). Devuelve hechos nuevos para logros, si hay. */
  onEvents?: (events: readonly Event[], next: BotMatch<Config, State>) => BotMatch<Config, State>["hechos"] | void;
  onFin: (m: BotMatch<Config, State>) => void;
  /** Mientras sea true, los bots no juegan (ej. hay un resumen en pantalla). */
  pausa?: boolean;
  /** Cuánto piensa un bot (ms). */
  pensar?: (s: State, seat: number) => number;
}

/** Controlador genérico de una partida contra bots, con el motor corriendo en el navegador. */
export function useBotMatch<Config, State, Action, View, Event>(o: BotMatchOptions<Config, State, Action, View, Event>) {
  const [match, setMatch] = useState(o.initial);
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
      const [action, rng] = choose(def.getPlayerView(m.state, id), def.getValidActions(m.state, id), m.rng, m.skills[actor]!, actor);
      apply(actor, action, rng);
    }, delay);
    return () => clearTimeout(t);
  }, [actor, pausa, match, apply]);

  const miTurno = actor === HUMAN_SEAT && !pausa;
  useEffect(() => {
    if (miTurno) vibrate(20);
  }, [miTurno]);

  return { match, view, valid, jugar, miTurno };
}

function seatId(m: BotMatch<unknown, unknown>, seat: number): string {
  return (m.state as { players: string[] }).players[seat]!;
}
