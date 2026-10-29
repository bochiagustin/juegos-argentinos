import { personaje, type Hecho } from "@juegos-argentinos/career";
import { actorSeat, chooseTrucoAction, teamOf, truco, type BotEstilo, type RoundSummary, type Seat, type TrucoAction, type TrucoEvent, type TrucoView } from "@juegos-argentinos/engine/truco";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir, enPalabras } from "../audio/voz.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useLotes } from "../partidas/useBotMatch.ts";
import { HUMAN_ID, HUMAN_SEAT, saveMatch, type TrucoMatch } from "./partida.ts";
import { CANTO_TEXTO } from "./textos.ts";

export interface Globo {
  id: number;
  seat: Seat;
  texto: string;
  tono: "canto" | "tanto" | "buenas";
}

let globoId = 0;

/** Globos, voz y resumen de cada mano: lo mismo contra la máquina que online. */
function useEfectos(yo: Seat) {
  const [globos, setGlobos] = useState<Globo[]>([]);
  const [resumen, setResumen] = useState<RoundSummary | null>(null);
  // Terminó una mano y su resumen todavía no se cerró (el fin de partida espera).
  const [pendiente, setPendiente] = useState(false);
  const timers = useRef<number[]>([]);

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
            decir(CANTO_TEXTO[e.canto].replace(/[¡!]/g, ""), { pitch: e.seat === yo ? 1.05 : 0.9 + (e.seat % 3) * 0.08 });
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
            setPendiente(true);
            later(delay + 650, () => setResumen(e.summary));
            break;
          case "nueva-ronda":
            later(delay + 700, () => playSfx("repartir"));
            break;
          case "fin-partida":
          case "baza":
          case "puntos":
            break;
        }
      }
    },
    [globo, later, yo],
  );

  const cerrarResumen = useCallback(() => {
    setResumen(null);
    setPendiente(false);
  }, []);

  return { globos, resumen, pendiente, handleEvents, cerrarResumen };
}

export interface TrucoCtl {
  match: Pick<TrucoMatch, "jugadores" | "config" | "carrera" | "adaptativo" | "skills"> & { state: TrucoMatch["state"] | null };
  view: TrucoView;
  valid: TrucoAction[];
  jugar: (a: TrucoAction) => void;
  globos: Globo[];
  resumen: RoundSummary | null;
  pendiente: boolean;
  cerrarResumen: () => void;
  yo: Seat;
}

/**
 * Controla una mesa de truco: contra la IA (el motor tiene el estado completo en el navegador y los bots juegan
 * con su propia vista, sin trampa) u online (el estado está en el servidor y acá llega la vista).
 */
export function useTrucoMatch(initial: TrucoMatch | null, onFin: (m: TrucoMatch) => void, remoto?: Remoto): TrucoCtl {
  return remoto ? useTrucoRemoto(remoto) : useTrucoLocal(initial!, onFin);
}

function useTrucoRemoto(r: Remoto): TrucoCtl {
  const ef = useEfectos(r.yo);
  useLotes(r.lotes, (events) => ef.handleEvents(events as TrucoEvent[]));
  const view = r.view as TrucoView;
  const valid = r.valid as TrucoAction[];
  const miTurno = view.actor === r.yo && !ef.resumen && !r.terminado;
  useEffect(() => {
    if (!miTurno) return;
    vibrate(25);
    if (view.pending) playSfx("turno");
  }, [miTurno, view.pending]);
  const match = useMemo(() => ({ jugadores: r.jugadores, config: view.config, adaptativo: false, skills: [], state: null }), [r.jugadores, view.config]);
  return { match, view, valid, jugar: (a) => r.jugar(a), ...ef, yo: r.yo };
}

function useTrucoLocal(initial: TrucoMatch, onFin: (m: TrucoMatch) => void): TrucoCtl {
  const [match, setMatch] = useState(initial);
  const ef = useEfectos(HUMAN_SEAT);
  const { handleEvents } = ef;
  // onFin en una ref: así `apply` no cambia en cada render (y no reinicia el "pensar" de los bots).
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;
  const matchRef = useRef(match);
  matchRef.current = match;

  const view = useMemo(() => truco.getPlayerView(match.state, HUMAN_ID), [match.state]);
  const valid = useMemo(() => truco.getValidActions(match.state, HUMAN_ID), [match.state]);

  const apply = useCallback(
    (seat: Seat, action: TrucoAction, rng = matchRef.current.rng) => {
      const m = matchRef.current;
      const res = truco.applyAction(m.state, m.state.players[seat]!, action);
      if (!res.ok) {
        playSfx("error");
        return;
      }
      const hechos = hechosDe(res.events);
      const dif = res.state.score[0] - res.state.score[1];
      const next: TrucoMatch = { ...m, state: res.state, rng, hechos: hechos.length ? [...m.hechos, ...hechos] : m.hechos, peorDiferencia: Math.min(m.peorDiferencia, dif) };
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
  const pausado = ef.resumen !== null;
  useEffect(() => {
    if (actor === null || actor === HUMAN_SEAT || pausado) return;
    const m = match;
    const id = m.state.players[actor]!;
    const delay = (m.state.round.pending ? 1100 : 750) + ((m.state.round.number * 37 + actor * 113) % 400);
    const t = window.setTimeout(() => {
      const estilo: BotEstilo = m.carrera && actor === 1 ? personaje(m.carrera.rivalId).estilo : "parejo";
      const [action, rng] = chooseTrucoAction(truco.getPlayerView(m.state, id), truco.getValidActions(m.state, id), m.rng, m.skills[actor]!, estilo);
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

  return { match, view, valid, jugar, ...ef, yo: HUMAN_SEAT };
}

/** Lo que pasó en estos eventos que cuenta para logros (siempre desde el punto de vista del jugador). */
function hechosDe(events: readonly TrucoEvent[]): Hecho[] {
  const out: Hecho[] = [];
  for (const e of events) {
    if (e.type === "tantos" && e.kind === "envido") {
      for (const d of e.declarations) if (d.seat === HUMAN_SEAT && d.value !== null) out.push({ tipo: "truco-tanto", valor: d.value });
    }
    if (e.type === "fin-ronda") {
      const r = e.summary;
      if (r.truco.level === 4 && r.truco.how === "bazas" && r.truco.team === teamOf(HUMAN_SEAT)) out.push({ tipo: "truco-vale-cuatro-ganado" });
      const tercera = r.tricks[2];
      const mia = tercera?.plays.find((p) => p.seat === HUMAN_SEAT);
      if (tercera?.winnerSeat === HUMAN_SEAT && mia?.card.id === "1-espada") out.push({ tipo: "truco-ancho-en-tercera" });
    }
  }
  return out;
}
