import {
  chancho,
  chooseChanchoAction,
  demoraNariz,
  FIGURAS,
  MESA_CHANCHO,
  PALABRA,
  tieneCuatro,
  TIEMPOS_CHANCHO,
  type ChanchoAction,
  type ChanchoConfig,
  type ChanchoEvent,
  type ChanchoState,
  type ChanchoView,
} from "@juegos-argentinos/engine/chancho";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { Cara } from "../carrera/Cara.tsx";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { FondoMesa } from "../fondos/fondos.tsx";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_ID, HUMAN_SEAT, type Jugador } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useLotes } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { IconButton } from "../ui/ui.tsx";
import { REGLAS_CHANCHO } from "./reglas.ts";

type CMatch = BotMatch<ChanchoConfig, ChanchoState>;

const { pase: TIEMPO_PASE, nariz: TIEMPO_NARIZ, resumen: TIEMPO_RESUMEN } = TIEMPOS_CHANCHO;

export function ChanchoMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: CMatch | null; n: number }>(() => ({ m: loadBotMatch<ChanchoConfig, ChanchoState>("chancho", (x) => Array.isArray(x.state?.letras)), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de chancho va en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "chancho-setup" })}>
            <span className="relative z-[1]">Armar una partida</span>
          </button>
          <button className="mt-3 block w-full text-sm underline" onClick={back}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  return <MesaLocal key={partida.n} initial={partida.m} onRevancha={(m) => setPartida((p) => ({ m, n: p.n + 1 }))} />;
}

/** La mesa contra la máquina: acá corre el reloj (pasar, cerrar la nariz, repartir) y juegan los bots. */
function MesaLocal({ initial, onRevancha }: { initial: CMatch; onRevancha: (m: CMatch) => void }) {
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [match, setMatch] = useState(initial);
  const ref = useRef(match);
  ref.current = match;
  const [cierreAt, setCierreAt] = useState<number | null>(null);
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const efectos = useRef<(e: readonly ChanchoEvent[]) => void>(() => {});

  const aplicar = useCallback(
    (id: string, action: ChanchoAction) => {
      const m = ref.current;
      const r = chancho.applyAction(m.state, id, action);
      if (!r.ok) return false;
      const next = { ...m, state: r.state };
      ref.current = next;
      setMatch(next);
      efectos.current(r.events);
      if (r.state.fase === "fin" && !next.contada) {
        const contada = { ...next, contada: true };
        ref.current = contada;
        setMatch(contada);
        clearBotMatch("chancho");
        setFinal(
          cerrar({
            game: "chancho",
            ganada: r.state.ganador === HUMAN_SEAT,
            botSkill: Math.max(...m.skills.slice(1), 1),
            adaptativo: m.adaptativo,
            paliza: r.state.ganador === HUMAN_SEAT && r.state.letras[HUMAN_SEAT] === 0,
            hechos: [],
          }),
        );
      } else saveBotMatch(next as never);
      return true;
    },
    [cerrar],
  );

  // El reloj de la mesa y los bots: cada vez que cambia el momento (fase, vuelta o ronda), se programa lo que sigue.
  const s = match.state;
  const momento = `${s.fase}|${s.ronda}|${s.vueltas}`;
  useEffect(() => {
    const timers: number[] = [];
    const despues = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const st = ref.current.state;
    let rng = ref.current.rng;
    const bots = st.players.map((_, seat) => seat).filter((seat) => seat !== HUMAN_SEAT && st.vivos[seat]);
    if (st.fase === "pasando") {
      setCierreAt(Date.now() + TIEMPO_PASE);
      despues(TIEMPO_PASE, () => aplicar(MESA_CHANCHO, { type: "pasar" }));
      for (const seat of bots) {
        const id = st.players[seat]!;
        const skill = ref.current.skills[seat]!;
        if (tieneCuatro(st.manos[seat]!)) {
          const [d, r] = demoraNariz(skill, rng);
          rng = r;
          despues(d, () => aplicar(id, { type: "nariz" }));
          continue;
        }
        const [d, r] = demoraNariz(skill, rng);
        rng = r;
        despues(Math.min(TIEMPO_PASE - 300, 300 + d / 2), () => {
          const cur = ref.current.state;
          const valid = chancho.getValidActions(cur, id);
          if (!valid.length || cur.fase !== "pasando") return;
          const [a, nr] = chooseChanchoAction(chancho.getPlayerView(cur, id), valid, ref.current.rng, skill);
          ref.current = { ...ref.current, rng: nr };
          aplicar(id, a);
        });
      }
    } else if (st.fase === "nariz") {
      setCierreAt(Date.now() + TIEMPO_NARIZ);
      despues(TIEMPO_NARIZ, () => aplicar(MESA_CHANCHO, { type: "cerrar-nariz" }));
      for (const seat of bots) {
        if (st.nariz.includes(seat)) continue;
        const [d, r] = demoraNariz(ref.current.skills[seat]!, rng);
        rng = r;
        despues(d, () => aplicar(st.players[seat]!, { type: "nariz" }));
      }
    } else if (st.fase === "fin-ronda") {
      setCierreAt(Date.now() + TIEMPO_RESUMEN);
      despues(TIEMPO_RESUMEN, () => aplicar(MESA_CHANCHO, { type: "seguir" }));
    } else setCierreAt(null);
    ref.current = { ...ref.current, rng };
    return () => timers.forEach(clearTimeout);
  }, [momento, aplicar]);

  // Si ya eligieron todos, se pasa enseguida (no hace falta esperar el reloj).
  useEffect(() => {
    if (s.fase !== "pasando") return;
    if (!s.players.every((_, seat) => !s.vivos[seat] || s.elegidas[seat] !== null)) return;
    const t = window.setTimeout(() => aplicar(MESA_CHANCHO, { type: "pasar" }), 350);
    return () => clearTimeout(t);
  }, [s, aplicar]);

  const view = useMemo(() => chancho.getPlayerView(match.state, HUMAN_ID), [match.state]);
  const valid = useMemo(() => chancho.getValidActions(match.state, HUMAN_ID), [match.state]);

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "chancho").rating) : match.skills[1]!;
    const m = newBotMatch(chancho, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]! });
    saveBotMatch(m as never);
    playSfx("repartir");
    onRevancha(m);
  };

  return (
    <Mesa
      view={view}
      valid={valid}
      jugar={(a) => aplicar(HUMAN_ID, a)}
      jugadores={match.jugadores}
      yo={HUMAN_SEAT}
      cierreAt={cierreAt}
      efectos={efectos}
      fin={final ? (props) => <FinPartida key="fin" r={final} marcador={props.marcador} onRevancha={revancha} onSalir={props.salir} /> : null}
    />
  );
}

export function ChanchoMesaOnline({ remoto }: { remoto: Remoto }) {
  const efectos = useRef<(e: readonly ChanchoEvent[]) => void>(() => {});
  useLotes(remoto.lotes, (ev) => efectos.current(ev as ChanchoEvent[]));
  const view = remoto.view as ChanchoView;
  const cierreAt = remoto.tutti && remoto.tutti.cierreEnMs !== null ? remoto.recibido + remoto.tutti.cierreEnMs : null;
  return (
    <Mesa
      view={view}
      valid={remoto.valid as ChanchoAction[]}
      jugar={(a) => remoto.jugar(a)}
      jugadores={remoto.jugadores}
      yo={remoto.yo}
      cierreAt={cierreAt}
      efectos={efectos}
      fin={view.fase === "fin" ? (props) => remoto.fin({ gane: view.ganador === remoto.yo, empate: false, marcador: props.marcador }) : null}
    />
  );
}

/** Una carta del chancho va: el animal grande sobre papel. */
function CartaAnimal({ figura, size = 72, elegida = false, oculta = false }: { figura: number; size?: number; elegida?: boolean; oculta?: boolean }) {
  const f = FIGURAS[figura]!;
  return (
    <span
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 shadow-lg shadow-black/40 ${oculta ? "border-[#7a4a06] bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d]" : elegida ? "border-naranja bg-[#fff7e6]" : "border-[#d9cfc0] bg-[#fdf6e3]"}`}
      style={{ width: size, height: size * 1.4 }}
    >
      {oculta ? (
        <span style={{ fontSize: size * 0.4 }}>🐽</span>
      ) : (
        <>
          <span style={{ fontSize: size * 0.55 }} aria-hidden>
            {f.emoji}
          </span>
          <span className="text-[10px] font-black uppercase text-tinta/70">{f.nombre}</span>
        </>
      )}
    </span>
  );
}

function Letras({ n, chico = false }: { n: number; chico?: boolean }) {
  return (
    <span className={`flex font-criolla ${chico ? "text-xs" : "text-lg"}`} aria-label={`${n} letras de ${PALABRA}`}>
      {PALABRA.split("").map((l, i) => (
        <span key={i} className={i < n ? "text-[#f87171]" : "text-crema/25"}>
          {l}
        </span>
      ))}
    </span>
  );
}

function Mesa({
  view,
  valid,
  jugar,
  jugadores,
  yo,
  cierreAt,
  efectos,
  fin,
}: {
  view: ChanchoView;
  valid: ChanchoAction[];
  jugar: (a: ChanchoAction) => void;
  jugadores: Jugador[];
  yo: number;
  cierreAt: number | null;
  efectos: React.MutableRefObject<(e: readonly ChanchoEvent[]) => void>;
  fin: ((p: { marcador: string; salir: () => void }) => React.ReactNode) | null;
}) {
  const { back } = useNav();
  const [reglas, setReglas] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [cartel, setCartel] = useState<string | null>(null);
  const nombre = (seat: number) => (seat === yo ? "Vos" : (jugadores[seat]?.nombre ?? ""));

  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  efectos.current = (events) => {
    for (const e of events) {
      if (e.type === "pase") playSfx("repartir");
      if (e.type === "reparto") playSfx("barajar");
      if (e.type === "nariz") {
        if (e.primero) {
          setCartel(e.seat === yo ? "¡CHANCHO! 👃" : `¡${nombre(e.seat).toUpperCase()} SE TOCÓ LA NARIZ! 👃`);
          decir("Chancho");
          playSfx("turno");
          vibrate([60, 40, 60]);
          window.setTimeout(() => setCartel(null), 1100);
        } else playSfx("click");
      }
      if (e.type === "letra") {
        if (e.seats.includes(yo)) {
          playSfx("error");
          vibrate(200);
        }
      }
    }
  };

  const restante = cierreAt === null ? 0 : Math.max(0, cierreAt - ahora);
  const total = view.fase === "pasando" ? TIEMPO_PASE : view.fase === "nariz" ? TIEMPO_NARIZ : TIEMPO_RESUMEN;
  const puedoNariz = valid.some((a) => a.type === "nariz");
  const meToque = view.nariz.includes(yo);
  const afuera = !view.vivos[yo];
  const otros = view.vivos.map((_, s) => s).filter((s) => s !== yo);
  const marcador = view.letras.map((l, s) => `${nombre(s)}: ${PALABRA.slice(0, l) || "—"}`).join(" · ");

  const elegir = (i: number) => {
    if (view.fase !== "pasando" || afuera) return;
    playSfx("click");
    jugar({ type: "elegir", carta: i });
  };
  const nariz = () => {
    if (!puedoNariz) {
      if (view.fase === "pasando" && !afuera) playSfx("error");
      return;
    }
    jugar({ type: "nariz" });
  };

  return (
    <div className="boliche relative isolate flex h-dvh flex-col overflow-hidden">
      <FondoMesa />
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label="Salir" onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Chancho va</p>
          <p className="text-xs font-bold text-crema/80">
            Ronda {view.ronda} · vuelta {view.vueltas + 1}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex flex-wrap justify-center gap-3 px-3 pt-3">
        {otros.map((seat) => (
          <div key={seat} className={`flex w-20 flex-col items-center ${view.vivos[seat] ? "" : "opacity-40"}`}>
            <span className="relative grid size-12 place-items-center overflow-hidden rounded-full border-[3px] border-[#d9a066] bg-black/40 text-2xl">
              <Cara avatar={jugadores[seat]?.avatar ?? "🙂"} />
              {view.nariz.includes(seat) && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 grid place-items-center bg-black/50 text-2xl">
                  👃
                </motion.span>
              )}
            </span>
            <span className="max-w-20 truncate text-xs font-bold">{nombre(seat)}</span>
            <Letras n={view.letras[seat]!} chico />
            <span className="text-[10px] font-bold text-crema/70">{!view.vivos[seat] ? "Afuera" : view.fase === "pasando" ? (view.eligieron[seat] ? "✓ eligió" : "eligiendo…") : ""}</span>
          </div>
        ))}
      </div>

      <div className="mesa-pano relative mx-2 my-3 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-[1.75rem] p-4 text-center">
        {view.fase === "pasando" && (
          <>
            <p className="font-criolla text-xl">{afuera ? "Quedaste afuera: mirá cómo sigue" : "Elegí la carta que pasás"}</p>
            <div className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-black/40">
              <motion.div className="h-full rounded-full bg-naranja" style={{ width: `${(restante / total) * 100}%` }} />
            </div>
            <p className="text-sm text-crema/80">Juntá 4 iguales y tocate la nariz 👃</p>
          </>
        )}
        {view.fase === "nariz" && (
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            <p className="titulo-criollo text-5xl">¡NARIZ!</p>
            <p className="mt-1 text-sm font-bold">{meToque ? "¡Bien! Ahora a ver quién queda último…" : "¡Tocate la nariz, rápido!"}</p>
          </motion.div>
        )}
        {(view.fase === "fin-ronda" || view.fase === "fin") && (
          <div className="flex flex-col items-center gap-2">
            <p className="font-criolla text-2xl">
              {view.perdieron.length === 0
                ? "Nadie se llevó letra"
                : view.perdieron.length === 1 && view.perdieron[0] === yo
                  ? "¡Te llevás una letra!"
                  : `${view.perdieron.map(nombre).join(", ")} se ${view.perdieron.length > 1 ? "llevan" : "lleva"} una letra`}
            </p>
            {view.manosFinales && (
              <div className="flex flex-wrap justify-center gap-2">
                {view.manosFinales.map((m, seat) =>
                  m.length ? (
                    <div key={seat} className="rounded-xl bg-black/30 px-2 py-1">
                      <p className="text-[11px] font-bold">{nombre(seat)}</p>
                      <p className="text-lg">{m.map((f) => FIGURAS[f]!.emoji).join("")}</p>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="madera relative z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="relative z-[1] mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">Vos</span>
          <Letras n={view.letras[yo]!} />
        </div>
        <div className="relative z-[1] flex items-end justify-center gap-2">
          <AnimatePresence mode="popLayout">
            {view.mano.map((f, i) => (
              <motion.button
                key={`${view.ronda}-${view.vueltas}-${i}`}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1, y: view.miEleccion === i ? -14 : 0 }}
                exit={{ x: 60, opacity: 0 }}
                onClick={() => elegir(i)}
                aria-label={`${FIGURAS[f]!.nombre}${view.miEleccion === i ? ", elegida para pasar" : ""}`}
                aria-pressed={view.miEleccion === i}
                disabled={view.fase !== "pasando" || afuera}
              >
                <CartaAnimal figura={f} size={64} elegida={view.miEleccion === i} />
              </motion.button>
            ))}
          </AnimatePresence>
          <motion.button
            onClick={nariz}
            animate={puedoNariz ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={puedoNariz ? { repeat: Infinity, duration: 0.6 } : {}}
            aria-label="Tocarse la nariz"
            className={`ml-1 grid size-20 shrink-0 place-items-center rounded-full border-4 text-5xl shadow-xl ${puedoNariz ? "border-[#fde68a] bg-[#dc2626]" : meToque ? "border-[#16a34a] bg-[#14532d]" : "border-[#7a4a06] bg-black/40 opacity-70"}`}
          >
            👃
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {cartel && (
          <motion.div key="cartel" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, rotate: -3, opacity: 1 }} exit={{ scale: 1.3, opacity: 0 }} className="pointer-events-none fixed inset-x-4 top-1/3 z-40 grid place-items-center">
            <p className="titulo-criollo rounded-3xl border-4 border-[#fde68a] bg-[#be185d] px-5 py-3 text-center text-3xl shadow-2xl">{cartel}</p>
          </motion.div>
        )}
        {fin && view.fase === "fin" && fin({ marcador, salir: back })}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)}>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="list-decimal space-y-2 pl-5">
              {REGLAS_CHANCHO.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <button className="boton boton-cuero mt-4 min-h-12 w-full rounded-xl" onClick={() => setReglas(false)}>
              Entendido
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
