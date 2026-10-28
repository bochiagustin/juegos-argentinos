import { actorSeat, chooseTrucoAction, truco, type RoundSummary, type Seat, type TrucoAction, type TrucoEvent } from "@juegos-argentinos/engine/truco";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir, enPalabras } from "../audio/voz.ts";
import { HUMAN_ID, HUMAN_SEAT, saveMatch, type TrucoMatch } from "./partida.ts";
import { CANTO_TEXTO } from "./textos.ts";

export interface Globo {
  id: number;
  seat: Seat;
  texto: string;
  tono: "canto" | "tanto" | "buenas";
}

let globoId = 0;

/**
 * Controla una partida contra la IA en el navegador: el motor tiene el estado completo,
 * la UI solo ve la vista del jugador, y los bots juegan con su propia vista (sin trampa).
 */
export function useTrucoMatch(initial: TrucoMatch, onFin: (m: TrucoMatch) => void) {
  const [match, setMatch] = useState(initial);
  const [globos, setGlobos] = useState<Globo[]>([]);
  const [resumen, setResumen] = useState<RoundSummary | null>(null);
  const timers = useRef<number[]>([]);
  // onFin en una ref: así `apply` no cambia en cada render (y no reinicia el "pensar" de los bots).
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;
  const matchRef = useRef(match);
  matchRef.current = match;

  const view = useMemo(() => truco.getPlayerView(match.state, HUMAN_ID), [match.state]);
  const valid = useMemo(() => truco.getValidActions(match.state, HUMAN_ID), [match.state]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const globo = useCallback(
    (seat: Seat, texto: string, tono: Globo["tono"], delay = 0) => {
      later(delay, () => {
        const id = ++globoId;
        setGlobos((g) => [...g.filter((x) => x.seat !== seat), { id, seat, texto, tono }]);
        later(tono === "canto" ? 1900 : 2600, () => setGlobos((g) => g.filter((x) => x.id !== id)));
      });
    },
    [later],
  );

  const handleEvents = useCallback(
    (events: readonly TrucoEvent[]) => {
      let delay = 0;
      for (const e of events) {
        switch (e.type) {
          case "canto":
            globo(e.seat, CANTO_TEXTO[e.canto], "canto");
            decir(CANTO_TEXTO[e.canto].replace(/[¡!]/g, ""), { pitch: e.seat === HUMAN_SEAT ? 1.05 : 0.9 + (e.seat % 3) * 0.08 });
            break;
          case "jugada":
            playSfx("carta");
            break;
          case "tantos":
            for (const d of e.declarations) {
              const texto = d.value === null ? "Son buenas" : `${d.value}`;
              globo(d.seat, texto, d.value === null ? "buenas" : "tanto", (delay += 900));
              later(delay, () => decir(d.value === null ? "Son buenas" : enPalabras(d.value)));
            }
            break;
          case "fin-ronda":
            later(delay + 650, () => setResumen(e.summary));
            break;
          case "nueva-ronda":
            later(delay + 700, () => playSfx("repartir"));
            break;
          case "fin-partida":
            break;
          case "baza":
          case "puntos":
            break;
        }
      }
    },
    [globo, later],
  );

  const apply = useCallback(
    (seat: Seat, action: TrucoAction, rng = matchRef.current.rng) => {
      const m = matchRef.current;
      const res = truco.applyAction(m.state, m.state.players[seat]!, action);
      if (!res.ok) {
        playSfx("error");
        return;
      }
      const next: TrucoMatch = { ...m, state: res.state, rng };
      matchRef.current = next;
      setMatch(next);
      handleEvents(res.events);
      if (res.state.winner !== null && !next.contada) {
        const counted = { ...next, contada: true };
        matchRef.current = counted;
        setMatch(counted);
        onFinRef.current(counted);
      } else {
        saveMatch(next);
      }
    },
    [handleEvents],
  );

  const jugar = useCallback((action: TrucoAction) => apply(HUMAN_SEAT, action), [apply]);

  // Turno de los bots: piensan un ratito (más si tienen que contestar un canto).
  const actor = actorSeat(match.state);
  const pausado = resumen !== null;
  useEffect(() => {
    if (actor === null || actor === HUMAN_SEAT || pausado) return;
    const m = match;
    const id = m.state.players[actor]!;
    const delay = (m.state.round.pending ? 1100 : 750) + ((m.state.round.number * 37 + actor * 113) % 400);
    const t = window.setTimeout(() => {
      const [action, rng] = chooseTrucoAction(truco.getPlayerView(m.state, id), truco.getValidActions(m.state, id), m.rng, m.skills[actor]!);
      apply(actor, action, rng);
    }, delay);
    return () => clearTimeout(t);
  }, [actor, pausado, match, apply]);

  // Avisar cuando te toca (vibración y sonido), una vez por turno.
  const miTurno = actor === HUMAN_SEAT && !pausado;
  useEffect(() => {
    if (!miTurno) return;
    vibrate(25);
    if (match.state.round.pending) playSfx("turno");
  }, [miTurno, match.state.round.pending]);

  return { match, view, valid, jugar, globos, resumen, cerrarResumen: () => setResumen(null) };
}
