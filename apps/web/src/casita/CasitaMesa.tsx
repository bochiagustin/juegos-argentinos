import { personaje, type Hecho } from "@juegos-argentinos/career";
import type { SuitedCard } from "@juegos-argentinos/engine";
import { casita, chooseCasitaAction, sonCompaneros, type CasitaAction, type CasitaConfig, type CasitaEvent, type CasitaState, type CasitaView } from "@juegos-argentinos/engine/casita";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { gameInfo } from "../games.ts";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_SEAT } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import { momentosCasita } from "../partidas/momentos.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useBotMatch } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { IconButton } from "../ui/ui.tsx";

type KMatch = BotMatch<CasitaConfig, CasitaState>;
type Robo = { ladron: number; victima: number; cartas: number };

export function CasitaMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: KMatch | null; n: number }>(() => ({ m: loadBotMatch<CasitaConfig, CasitaState>("casita-robada", (m) => Array.isArray(m.state?.casitas)), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de casita en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "casita-setup" })}>
            <span className="relative z-[1]">Armar una partida</span>
          </button>
          <button className="mt-3 block w-full text-sm underline" onClick={back}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  return <Mesa key={partida.n} initial={partida.m} onRevancha={(m) => setPartida((p) => ({ m, n: p.n + 1 }))} />;
}

function Casita({ top, cartas, nombre, avatar, activo, grande, compa }: { top: SuitedCard | null; cartas: number; nombre: string; avatar: string; activo: boolean; grande?: boolean; compa?: boolean }) {
  const w = grande ? 70 : 54;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${activo ? "bg-naranja text-tinta" : "bg-black/45"}`}>
        <span aria-hidden>{avatar}</span>
        <span className="max-w-20 truncate">{nombre}</span>
        {compa && <span aria-label="compañero">🤝</span>}
      </span>
      <div className="relative" style={{ width: w + 8, height: w * 1.5 + 8 }}>
        {cartas > 1 && (
          <div className="absolute left-1.5 top-1.5 opacity-80">
            <SpanishCard card={null} width={w} />
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {top ? (
            <motion.div key={top.id + cartas} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute left-0 top-0 rounded-lg shadow-lg shadow-black/50">
              <SpanishCard card={top} width={w} />
            </motion.div>
          ) : (
            <div className="absolute left-0 top-0 grid place-items-center rounded-lg border-2 border-dashed border-crema/30 text-center text-[10px] text-crema/60" style={{ width: w, height: w * 1.5 }}>
              Sin casita
            </div>
          )}
        </AnimatePresence>
        <span className="absolute -bottom-1 -right-1 grid min-w-7 place-items-center rounded-full bg-tinta px-1.5 py-0.5 text-xs font-black text-crema ring-2 ring-naranja">{cartas}</span>
      </div>
    </div>
  );
}

export function CasitaMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

function Mesa({ initial, onRevancha, remoto }: { initial: KMatch | null; onRevancha?: (m: KMatch) => void; remoto?: Remoto }) {
  const yo = remoto?.yo ?? HUMAN_SEAT;
  // Robos de esta partida (online no hay estado completo: se cuentan por evento).
  const robos = useRef({ hechos: 0, sufridos: 0 });
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const [robo, setRobo] = useState<Robo | null>(null);
  const [eleccion, setEleccion] = useState<{ card: string; opciones: CasitaAction[] } | null>(null);
  const [reglas, setReglas] = useState(false);
  const nombre = (seat: number, m: KMatch) => (seat === yo ? "Vos" : m.jugadores[seat]!.nombre);

  const { match, view, valid, jugar, miTurno } = useBotMatch({
    def: casita,
    initial,
    remoto,
    actor: (s) => (s.result === null ? s.turn : null),
    choose: (v, va, rng, skill) => chooseCasitaAction(v, va, rng, skill),
    pausa: robo !== null,
    pensar: () => 850,
    onEvents: (events: readonly CasitaEvent[], next) => {
      const hechos: Hecho[] = [];
      for (const e of events) {
        if (e.type === "tirada") playSfx("carta");
        if (e.type === "reparto") window.setTimeout(() => playSfx("repartir"), 300);
        if (e.type === "robo") {
          setRobo({ ladron: e.seat, victima: e.victima, cartas: e.cartas });
          if (e.seat === yo) robos.current.hechos++;
          if (e.victima === yo) robos.current.sufridos++;
          if (e.victima === yo) {
            hechos.push({ tipo: "casita-me-robaron", cantidad: 1 });
            playSfx("error");
            vibrate([80, 40, 120]);
            decir("Te robaron la casita");
          } else {
            playSfx("turno");
            decir(e.seat === yo ? "Te robé la casita" : `${nombre(e.seat, next)} robó la casita`);
          }
          window.setTimeout(() => setRobo(null), 1800);
        }
      }
      return hechos;
    },
    onFin: (m) => {
      clearBotMatch("casita-robada");
      const r = m.state.result!;
      const mio = r.bandos.find((b) => b.seats.includes(yo))!;
      const gane = r.ganadores.includes(yo) && r.ganadores.length === mio.seats.length;
      const mejorRival = Math.max(...r.bandos.filter((b) => b !== mio).map((b) => b.cartas), 0);
      const hechos: Hecho[] = [
        { tipo: "casita-robos", cantidad: m.state.robos[yo] ?? 0 },
        { tipo: "casita-me-robaron", cantidad: m.hechos.filter((h) => h.tipo === "casita-me-robaron").length },
        { tipo: "casita-cartas", cantidad: r.cartas[yo] ?? 0 },
      ];
      setFinal(
        cerrar({
          game: "casita-robada",
          ganada: gane,
          botSkill: Math.max(...m.skills.slice(1)),
          adaptativo: m.adaptativo,
          ...(m.carrera ? { rivalId: m.carrera.rivalId } : {}),
          paliza: gane && mio.cartas >= 2 * Math.max(1, mejorRival),
          hechos,
        }),
      );
    },
  });

  const opcionesDe = (card: string) => valid.filter((a) => a.card === card);
  const tocar = (card: SuitedCard) => {
    if (!miTurno) return;
    const ops = opcionesDe(card.id);
    if (ops.length === 1) jugar(ops[0]!);
    else if (ops.length > 1) setEleccion({ card: card.id, opciones: ops });
  };

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "casita-robada").rating) : match.skills[1]!;
    const rival = match.carrera ? { id: match.carrera.rivalId, jugador: match.jugadores[1]!, skill: match.skills[1]! } : undefined;
    const m = newBotMatch(casita, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]!, ...(rival ? { rival } : {}) });
    saveBotMatch(m as never);
    playSfx("barajar");
    onRevancha?.(m);
  };

  const mio = view.players[yo]!;
  const otros = view.players.filter((p) => p.seat !== yo);
  const textoJugada = (a: CasitaAction) =>
    a.jugada.tipo === "mesa"
      ? "Levantar de la mesa"
      : a.jugada.tipo === "robar"
        ? `Robarle la casita a ${nombre(a.jugada.de, match)} (${view.players[a.jugada.de]!.casita})`
        : a.jugada.tipo === "propia"
          ? "Agrandar mi casita"
          : "Dejarla en la mesa";

  return (
    <motion.div className="pano flex h-dvh flex-col overflow-hidden" animate={robo?.victima === yo ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.5 }}>
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Casita Robada</p>
          <p className="text-xs font-bold text-crema/80">
            Quedan {view.mazoCount} en el mazo{match.carrera ? ` · ${personaje(match.carrera.rivalId).bajada}` : ""}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex flex-wrap justify-center gap-4 px-3 pt-3">
        {otros.map((p) => (
          <div key={p.seat} className="flex flex-col items-center">
            <Casita
              top={p.top}
              cartas={p.casita}
              nombre={match.jugadores[p.seat]!.nombre}
              avatar={match.jugadores[p.seat]!.avatar}
              activo={view.turn === p.seat && !view.result}
              compa={sonCompaneros(view.config, yo, p.seat)}
            />
            <div className="mt-1 flex -space-x-2">
              {Array.from({ length: p.cards }, (_, i) => (
                <SpanishCard key={i} card={null} width={16} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-3">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-crema/60">La mesa</p>
        <div className="flex max-w-full flex-wrap justify-center gap-2">
          <AnimatePresence>
            {view.mesa.map((c) => (
              <motion.div key={c.id} layout initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.6, opacity: 0, y: 60 }} className="rounded-lg shadow-lg shadow-black/40">
                <SpanishCard card={c} width={view.mesa.length > 8 ? 44 : 56} />
              </motion.div>
            ))}
          </AnimatePresence>
          {view.mesa.length === 0 && <p className="text-sm text-crema/60">La mesa está vacía</p>}
        </div>
        <AnimatePresence>
          {robo && (
            <motion.div
              key="robo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-none absolute inset-0 z-30 grid place-items-center ${robo.victima === yo ? "bg-red-700/45" : "bg-amber-400/25"}`}
            >
              <motion.div initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: 1, rotate: -3 }} className="text-center">
                <p className="titulo-criollo text-5xl">{robo.victima === yo ? "¡TE ROBARON LA CASITA!" : robo.ladron === yo ? "¡LE ROBASTE LA CASITA!" : "¡ROBO!"}</p>
                <p className="mt-2 text-lg font-black">
                  {nombre(robo.ladron, match)} se llevó {robo.cartas} carta{robo.cartas === 1 ? "" : "s"}
                  {robo.victima !== yo && robo.ladron !== yo ? ` de ${nombre(robo.victima, match)}` : ""}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="cuero cuero-oscuro z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="relative z-[1] flex items-end gap-3">
          <Casita top={mio.top} cartas={mio.casita} nombre="Tu casita" avatar={match.jugadores[yo]!.avatar} activo={miTurno} grande />
          <div className="flex-1">
            <p className="mb-2 min-h-5 text-center text-sm font-bold text-crema/90" aria-live="polite">
              {view.result ? "Partida terminada" : view.turn === yo ? "Te toca: tocá una carta." : `Juega ${nombre(view.turn, match)}…`}
            </p>
            <div className="flex justify-center gap-2">
              <AnimatePresence>
                {view.hand.map((c) => {
                  const ops = miTurno ? opcionesDe(c.id) : [];
                  const roba = ops.some((a) => a.jugada.tipo === "robar");
                  const levanta = ops.some((a) => a.jugada.tipo === "mesa" || a.jugada.tipo === "propia");
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: roba || levanta ? -8 : 0, opacity: 1 }}
                      exit={{ y: -80, opacity: 0 }}
                      disabled={!miTurno}
                      onClick={() => tocar(c)}
                      aria-label={`Tirar ${c.rank} de ${c.suit}${roba ? " (podés robar)" : levanta ? " (podés levantar)" : ""}`}
                      className="relative rounded-xl shadow-xl shadow-black/50"
                    >
                      <SpanishCard card={c} width={Math.min(84, Math.round(window.innerWidth * 0.2))} highlight={roba || levanta} />
                      {roba && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-bordo px-2 text-[10px] font-black uppercase">¡Roba!</span>}
                      {!roba && levanta && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-pano px-2 text-[10px] font-black uppercase">Levanta</span>}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {eleccion && (
          <Modal key="eleccion" onClose={() => setEleccion(null)}>
            <p className="mb-3 text-center text-lg font-black">¿Qué hacés con esta carta?</p>
            <div className="flex flex-col gap-2">
              {eleccion.opciones.map((a) => (
                <button
                  key={JSON.stringify(a.jugada)}
                  className={`min-h-12 rounded-xl px-4 font-black ${a.jugada.tipo === "robar" ? "bg-bordo text-crema" : "bg-pano text-crema"}`}
                  onClick={() => {
                    setEleccion(null);
                    jugar(a);
                  }}
                >
                  {textoJugada(a)}
                </button>
              ))}
            </div>
          </Modal>
        )}
        {final && view.result && (
          <FinPartida
            key="fin"
            r={final}
            momentos={momentosCasita({ hechos: view.players[yo]!.robos, sufridos: match.hechos.filter((h) => h.tipo === "casita-me-robaron").length }, view.result.cartas[yo] ?? 0)}
            marcador={view.result.bandos.map((b) => `${b.seats.map((s) => nombre(s, match)).join(" y ")} ${b.cartas}`).join(" · ")}
            titulo={view.result.ganadores.length > 1 && view.result.ganadores.includes(yo) && !final.ganada ? "¡Empate!" : undefined}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={match.carrera ? "Volver a la gira" : "Volver al menú"}
          />
        )}
        {remoto && view.result && remoto.fin({ ...resultadoOnline(view.result, yo, (s) => nombre(s, match)), momentos: momentosCasita(robos.current, view.result.cartas[yo] ?? 0) })}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)} grande>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              {gameInfo("casita-robada").reglas.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>
                En esta partida: {view.config.levantar === "todas" ? "se levantan todas las iguales" : "se levanta de a una"}
                {view.config.prioridad === "robar" ? ", robar es obligatorio" : view.config.prioridad === "mesa" ? ", levantar de la mesa va primero" : ", si podés levantar y robar elegís vos"}
                {view.config.agrandarPropia ? ", se puede agrandar la propia casita" : ""}, lo que queda en la mesa {view.config.sobrantes === "ultimo" ? "es del último que levantó" : "no es de nadie"}.
              </li>
            </ol>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function resultadoOnline(r: NonNullable<CasitaView["result"]>, yo: number, nombre: (s: number) => string) {
  const mio = r.bandos.find((b) => b.seats.includes(yo))!;
  const ganamos = r.ganadores.includes(yo);
  return {
    gane: ganamos && r.ganadores.length === mio.seats.length,
    empate: ganamos && r.ganadores.length > mio.seats.length,
    marcador: r.bandos.map((b) => `${b.seats.map(nombre).join(" y ")} ${b.cartas}`).join(" · "),
  };
}
