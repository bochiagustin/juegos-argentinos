import { personaje, type Hecho } from "@juegos-argentinos/career";
import { FondoMesa } from "../fondos/fondos.tsx";
import { BarraAcciones, EtiquetaJugada, laCarta, useUltimasJugadas } from "../ui/barra.tsx";
import { Cara, rivalEn } from "../carrera/Cara.tsx";
import type { Card } from "@juegos-argentinos/engine";
import {
  bestArrangement,
  chinchon,
  chooseChinchonAction,
  chinchonProfile,
  rulesOf,
  type ChinchonAction,
  type ChinchonConfig,
  type ChinchonEvent,
  type ChinchonRoundSummary,
  type ChinchonState,
  type Meld,
} from "@juegos-argentinos/engine/chinchon";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { gameInfo } from "../games.ts";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_SEAT } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import { momentosChinchon } from "../partidas/momentos.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useBotMatch } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { FileteEsquinas, IconButton } from "../ui/ui.tsx";

type CMatch = BotMatch<ChinchonConfig, ChinchonState>;

const COLORES_COMBO = ["#f59e0b", "#63b3ed", "#8bc34a", "#e57373"];

/** Cómo se ordena la mano: a mano (arrastrando) o sola, con cada carta nueva. */
type ModoOrden = "manual" | "juegos" | "menor" | "mayor" | "palo";
const MODOS_ORDEN: { id: Exclude<ModoOrden, "manual">; texto: string }[] = [
  { id: "juegos", texto: "Juegos" },
  { id: "menor", texto: "Menor a mayor" },
  { id: "mayor", texto: "Mayor a menor" },
  { id: "palo", texto: "Por palo" },
];
const CLAVE_ORDEN = "juegos-argentinos:chinchon-orden";
const PALOS = ["espada", "basto", "oro", "copa"];

function leerModoOrden(): ModoOrden {
  try {
    const v = localStorage.getItem(CLAVE_ORDEN);
    return v === "juegos" || v === "menor" || v === "mayor" || v === "palo" ? v : "manual";
  } catch {
    return "manual";
  }
}

/** La mano ordenada según el modo (los comodines, al final de lo suelto). */
function ordenarMano(hand: readonly Card[], modo: Exclude<ModoOrden, "manual">, melds: readonly Meld[]): Card[] {
  const valor = (c: Card) => (c.kind === "joker" ? 1000 : c.rank * 10 + PALOS.indexOf(c.suit));
  const porPalo = (c: Card) => (c.kind === "joker" ? 1000 : PALOS.indexOf(c.suit) * 100 + c.rank);
  if (modo === "palo") return [...hand].sort((a, b) => porPalo(a) - porPalo(b));
  if (modo === "menor") return [...hand].sort((a, b) => valor(a) - valor(b));
  if (modo === "mayor") return [...hand].sort((a, b) => (a.kind === "joker" ? 1 : b.kind === "joker" ? -1 : valor(b) - valor(a)));
  // Juegos: cada combinación junta, y después las sueltas de menor a mayor.
  const enJuego = new Set(melds.flatMap((m) => m.cards.map((c) => c.id)));
  const juegos = melds.flatMap((m) => m.cards.map((c) => hand.find((h) => h.id === c.id)!).filter(Boolean));
  const sueltas = hand.filter((c) => !enJuego.has(c.id)).sort((a, b) => valor(a) - valor(b));
  return [...juegos, ...sueltas];
}

export function ChinchonMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: CMatch | null; n: number }>(() => ({ m: loadBotMatch<ChinchonConfig, ChinchonState>("chinchon", (m) => Array.isArray(m.state?.hands)), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de chinchón en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "chinchon-setup" })}>
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

export function ChinchonMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

function Mesa({ initial, onRevancha, remoto }: { initial: CMatch | null; onRevancha?: (m: CMatch) => void; remoto?: Remoto }) {
  const yo = remoto?.yo ?? HUMAN_SEAT;
  const [pendiente, setPendiente] = useState(false);
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [resumen, setResumen] = useState<ChinchonRoundSummary | null>(null);
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const [cartel, setCartel] = useState<string | null>(null);
  const [reglas, setReglas] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [orden, setOrden] = useState<string[]>([]);
  const [modoOrden, setModoOrden] = useState<ModoOrden>(leerModoOrden);
  const [menuOrden, setMenuOrden] = useState(false);
  /** Cuando alguien corta: las manos de todos bajadas en la mesa, antes de los puntos. */
  const [bajada, setBajada] = useState<ChinchonRoundSummary | null>(null);
  /** Reparto animado de una mano nueva (carta por carta). */
  const [repartiendo, setRepartiendo] = useState(false);
  const repartida = useRef<number | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [jugadas, anotar, limpiarJugadas] = useUltimasJugadas();
  const pozoRef = useRef<HTMLButtonElement>(null);
  const corteRef = useRef<HTMLDivElement>(null);

  const nombre = (seat: number, m: CMatch) => (seat === yo ? "Vos" : m.jugadores[seat]!.nombre);

  const { match, view, valid, jugar, miTurno } = useBotMatch({
    def: chinchon,
    initial,
    remoto,
    actor: (s) => (s.winner === null ? s.turn : null),
    choose: (v, va, rng, skill, _seat, rasgos) => chooseChinchonAction(v, va, rng, skill, chinchonProfile(skill, rasgos)),
    pausa: resumen !== null || cartel !== null || bajada !== null || repartiendo,
    pensar: (s) => (s.phase === "robar" ? 650 : 900),
    onEvents: (events: readonly ChinchonEvent[], next) => {
      const hechos: Hecho[] = [];
      for (const e of events) {
        if (e.type === "robo" || e.type === "descarte") playSfx("carta");
        if (e.type === "robo" && e.seat !== yo) anotar(e.seat, e.de === "pozo" && e.card ? `Levantó ${laCarta(e.card)}` : "Robó del mazo");
        if (e.type === "descarte" && e.seat !== yo) anotar(e.seat, `Tiró ${laCarta(e.card)}`);
        if (e.type === "corte" && e.seat !== yo) anotar(e.seat, "¡Cortó!");
        if (e.type === "nueva-ronda") limpiarJugadas();
        if (e.type === "rebarajar") playSfx("barajar");
        if (e.type === "corte") {
          const quien = nombre(e.seat, next);
          const texto = e.chinchon ? "¡CHINCHÓN!" : e.menosDiez ? "¡Menos diez!" : `${quien} corta`;
          setCartel(texto);
          decir(e.chinchon ? "Chinchón" : e.menosDiez ? "Menos diez" : "Corto");
          window.setTimeout(() => setCartel(null), 1300);
          if (e.seat === yo && e.chinchon) hechos.push({ tipo: "chinchon" });
          if (e.seat === yo && e.menosDiez) hechos.push({ tipo: "menos-diez" });
        }
        if (e.type === "fin-ronda") {
          const mio = e.summary.results.find((r) => r.seat === yo);
          if (mio && e.summary.cutter !== yo && mio.laid.length > 0) hechos.push({ tipo: "ligadas", cantidad: mio.laid.length });
          setPendiente(true);
          // Primero se bajan los juegos de todos en la mesa; los puntos, cuando lo pidas (o solos al rato).
          window.setTimeout(() => setBajada(e.summary), 1300);
        }
      }
      return hechos;
    },
    onFin: (m) => {
      clearBotMatch("chinchon");
      const gane = m.state.winner === yo;
      const peor = Math.max(...m.state.history.map((h) => h.scores[yo] ?? 0), 0);
      setFinal(
        cerrar({
          game: "chinchon",
          ganada: gane,
          botSkill: Math.max(...m.skills.slice(1)),
          adaptativo: m.adaptativo,
          ...(m.carrera ? { rivalId: m.carrera.rivalId } : {}),
          remontada: gane && peor >= m.config.limite - 15,
          paliza: gane && (m.state.scores[yo] ?? 0) < m.config.limite / 2,
          hechos: m.hechos,
        }),
      );
    },
  });

  const verFin = !resumen && !pendiente;
  const rules = rulesOf(view.config);
  // Orden de la mano: el que eligió el jugador; las cartas nuevas van al final.
  const arreglo = useMemo(() => bestArrangement(view.hand, rules), [view.hand, rules]);
  const mano = useMemo(() => {
    if (modoOrden !== "manual") return ordenarMano(view.hand, modoOrden, arreglo.melds);
    const ids = new Set(view.hand.map((c) => c.id));
    const kept = orden.filter((id) => ids.has(id as Card["id"]));
    const nuevas = view.hand.filter((c) => !kept.includes(c.id)).map((c) => c.id);
    const all = [...kept, ...nuevas];
    return all.map((id) => view.hand.find((c) => c.id === id)!);
  }, [view.hand, orden, modoOrden, arreglo]);
  const comboDe = useMemo(() => {
    const m = new Map<string, number>();
    arreglo.melds.forEach((meld, i) => meld.cards.forEach((c) => m.set(c.id, i)));
    return m;
  }, [arreglo]);

  const cortes = valid.filter((a): a is Extract<ChinchonAction, { type: "cortar" }> => a.type === "cortar");
  const mejorCorte = useMemo(() => {
    let best: { card: string; sum: number } | null = null;
    for (const a of cortes) {
      const sum = bestArrangement(
        view.hand.filter((c) => c.id !== a.card),
        rules,
      ).looseSum;
      if (!best || sum < best.sum) best = { card: a.card, sum };
    }
    return best;
  }, [cortes, view.hand, rules]);

  const robar = (de: "mazo" | "pozo") => {
    if (!miTurno || view.phase !== "robar") return;
    if (!valid.some((a) => a.type === "robar" && a.de === de)) return;
    jugar({ type: "robar", de });
  };
  const tirar = () => sel && valid.some((a) => a.type === "descartar" && a.card === sel) && (jugar({ type: "descartar", card: sel as Card["id"] }), setSel(null));
  const cortar = (card: string) => valid.some((a) => a.type === "cortar" && a.card === card) && (jugar({ type: "cortar", card: card as Card["id"] }), setSel(null));

  const elegirOrden = (modo: ModoOrden) => {
    setModoOrden(modo);
    setMenuOrden(false);
    try {
      localStorage.setItem(CLAVE_ORDEN, modo);
    } catch {
      // Sin almacenamiento: el orden vale solo para esta partida.
    }
    playSfx("click");
  };
  /** Ordenar arrastrando deja la mano como la acomodaste (y, al soltar, deja de ordenarse sola). */
  const reordenado = useRef(false);
  const reordenar = (ids: string[]) => {
    setOrden(ids);
    reordenado.current = true;
  };

  /** Soltar una carta arrastrada: sobre el pozo la tira, sobre la zona de corte corta con ella. */
  const soltar = (card: string, x: number, y: number) => {
    setArrastrando(null);
    const dentro = (el: HTMLElement | null) => {
      const r = el?.getBoundingClientRect();
      return !!r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
    };
    const sobreAlgo = miTurno && view.phase === "descartar" && (dentro(corteRef.current) || dentro(pozoRef.current));
    if (!sobreAlgo && reordenado.current && modoOrden !== "manual") elegirOrden("manual");
    reordenado.current = false;
    if (!sobreAlgo) return;
    if (dentro(corteRef.current)) {
      if (cortes.some((a) => a.card === card)) cortar(card);
      else {
        setCartel("Con esa no podés cortar");
        playSfx("error");
        window.setTimeout(() => setCartel(null), 1100);
      }
    } else if (dentro(pozoRef.current)) {
      if (valid.some((a) => a.type === "descartar" && a.card === card)) {
        jugar({ type: "descartar", card: card as Card["id"] });
        setSel(null);
      } else {
        setCartel("Esa la levantaste del pozo");
        playSfx("error");
        window.setTimeout(() => setCartel(null), 1100);
      }
    }
  };

  // Mano nueva: se reparte carta por carta (después de cerrar los puntos de la anterior).
  const ocupado = bajada !== null || resumen !== null || pendiente;
  // Las cartas entran animadas desde el primer render de una mano nueva (el efecto de abajo arranca un instante después).
  const animarReparto = repartiendo || (!ocupado && view.winner === null && repartida.current !== view.round);
  useEffect(() => {
    if (ocupado || view.winner !== null || repartida.current === view.round) return;
    repartida.current = view.round;
    setRepartiendo(true);
    playSfx("barajar");
    const n = view.players.filter((p) => !p.out).length;
    const total = 7 * n;
    const timers = Array.from({ length: total }, (_, k) => window.setTimeout(() => playSfx("carta"), 350 + k * 90));
    timers.push(window.setTimeout(() => setRepartiendo(false), 450 + total * 90));
    return () => timers.forEach(clearTimeout);
  }, [view.round, ocupado, view.winner, view.players]);

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "chinchon").rating) : match.skills[1]!;
    const rival = match.carrera ? { id: match.carrera.rivalId, jugador: match.jugadores[1]!, skill: match.skills[1]! } : undefined;
    const m = newBotMatch(chinchon, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]!, ...(rival ? { rival } : {}) });
    saveBotMatch(m as never);
    playSfx("barajar");
    onRevancha?.(m);
  };

  const estado =
    view.winner !== null
      ? "Partida terminada"
      : miTurno
        ? view.phase === "robar"
          ? "Te toca: robá del mazo o levantá la del pozo."
          : mejorCorte
            ? `¡Podés cortar! Tirando la mejor te quedan ${mejorCorte.sum} sueltos.`
            : "Elegí una carta y tirala al pozo."
        : `Juega ${nombre(view.turn, match)}…`;

  const rivales = view.players.filter((p) => p.seat !== yo);

  return (
    <div className="boliche relative isolate flex h-dvh flex-col overflow-hidden">
      <FondoMesa />
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Chinchón</p>
          <p className="text-xs font-bold text-crema/80">
            Mano {view.round} · a {view.config.limite}
            {match.carrera ? ` · ${personaje(match.carrera.rivalId).bajada}` : ""}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex justify-center gap-3 px-3 pt-3">
        {rivales.map((p) => (
          <div key={p.seat} className={`flex flex-col items-center ${p.out ? "opacity-40" : ""}`}>
            <span className={`relative grid size-12 place-items-center rounded-full border-[3px] bg-black/40 text-2xl ${view.turn === p.seat && view.winner === null ? "border-naranja" : "border-[#d9a066]"}`}>
              <Cara avatar={match.jugadores[p.seat]!.avatar} rivalId={rivalEn(match, p.seat)} />
              {view.mano === p.seat && <span className="absolute -right-3 -top-1 rounded-full bg-naranja px-1 text-[9px] font-black uppercase text-tinta">Mano</span>}
            </span>
            <span className="mt-0.5 max-w-20 truncate text-xs font-bold">{match.jugadores[p.seat]!.nombre}</span>
            <span className="text-xs font-black text-naranja">{p.out ? "Afuera" : `${p.score} pts`}</span>
            <EtiquetaJugada texto={jugadas[p.seat]} />
            <div className="mt-0.5 flex -space-x-3">
              {Array.from({ length: ocupado ? 0 : Math.min(p.cards, 8) }, (_, i) => (
                <motion.div
                  key={`${view.round}-${i}`}
                  initial={animarReparto ? { y: 90, opacity: 0 } : false}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: animarReparto ? 0.35 + (i * view.players.length + ((p.seat - yo + view.players.length) % view.players.length)) * 0.09 : 0 }}
                >
                  <SpanishCard card={null} width={14} />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mx-2 my-2 flex min-h-0 flex-1 items-center justify-center gap-6">
        <div className="mesa-pano pointer-events-none absolute inset-0 rounded-[1.75rem]">
          <FileteEsquinas />
        </div>
        {bajada ? (
          <Bajada r={bajada} yo={yo} nombre={(s) => nombre(s, match)} onVer={() => setResumen(bajada)} />
        ) : (
        <>
        <button onClick={() => robar("mazo")} disabled={!miTurno || view.phase !== "robar"} className="relative rounded-xl disabled:cursor-default" aria-label={`Robar del mazo (${view.mazoCount} cartas)`}>
          {[2, 1, 0].map((k) => (
            <div key={k} className="absolute" style={{ top: -k * 2, left: -k * 2 }}>
              <SpanishCard card={null} width={72} />
            </div>
          ))}
          <SpanishCard card={null} width={72} highlight={miTurno && view.phase === "robar"} />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold">Mazo · {view.mazoCount}</span>
        </button>
        <button
          ref={pozoRef}
          onClick={() => robar("pozo")}
          disabled={!miTurno || view.phase !== "robar" || !view.pozoTop}
          className={`relative rounded-xl transition disabled:cursor-default ${arrastrando ? "outline-3 outline-offset-4 outline-naranja" : ""}`}
          aria-label="Levantar del pozo"
        >
          <AnimatePresence mode="popLayout">
            {view.pozoTop ? (
              <motion.div key={view.pozoTop.id} initial={{ y: -40, opacity: 0, rotate: -15 }} animate={{ y: 0, opacity: 1, rotate: 4 }} className="rounded-xl shadow-lg shadow-black/40">
                <SpanishCard card={view.pozoTop} width={72} highlight={miTurno && view.phase === "robar"} />
              </motion.div>
            ) : (
              <div className="h-[108px] w-[72px] rounded-xl border-2 border-dashed border-crema/30" />
            )}
          </AnimatePresence>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold">Pozo · {view.pozoCount}</span>
        </button>
        {miTurno && view.phase === "descartar" && mejorCorte && (
          <motion.div
            ref={corteRef}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: arrastrando ? 1.08 : 1, opacity: 1 }}
            className={`grid h-[108px] w-[72px] place-items-center rounded-xl border-2 border-dashed text-center text-xs font-black ${arrastrando ? "border-[#8bc34a] bg-[#2e7d32]/40" : "border-[#8bc34a]/70 bg-black/25"}`}
          >
            <span>
              <span className="block text-2xl">✂</span>
              Soltá acá para cortar
            </span>
          </motion.div>
        )}
        </>
        )}
        <AnimatePresence>
          {cartel && (
            <motion.div
              key="cartel"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-1/3 z-30 text-center"
            >
              <span className="titulo-criollo rounded-2xl bg-black/50 px-6 py-3 text-5xl">{cartel}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="madera z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="relative z-[1]">
          <div className="mb-1 flex items-center justify-between gap-2 px-1 text-xs font-bold">
            <span className="rounded-full bg-black/35 px-2 py-1">
              Vos: <span className="text-naranja">{view.players[yo]!.score} pts</span>
            </span>
            <span className={`rounded-full px-2 py-1 ${arreglo.looseSum <= view.config.corteMax ? "bg-pano" : "bg-black/35"}`}>Sueltas: {arreglo.looseSum}</span>
            <button className={`rounded-full px-3 py-1 ${modoOrden === "manual" ? "bg-black/35" : "bg-naranja text-tinta"}`} onClick={() => setMenuOrden((x) => !x)} aria-expanded={menuOrden}>
              ⇅ Ordenar{modoOrden !== "manual" ? `: ${MODOS_ORDEN.find((m) => m.id === modoOrden)!.texto}` : ""}
            </button>
          </div>
          <AnimatePresence>
            {menuOrden && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="hundido mb-2 flex flex-wrap justify-center gap-1.5 rounded-2xl p-1.5">
                  {MODOS_ORDEN.map((m) => (
                    <button key={m.id} onClick={() => elegirOrden(m.id)} className={`boton min-h-10 rounded-xl px-3 text-sm ${modoOrden === m.id ? "boton-oro" : "boton-cuero"}`}>
                      {m.texto}
                    </button>
                  ))}
                  <button onClick={() => elegirOrden("manual")} className={`boton min-h-10 rounded-xl px-3 text-sm ${modoOrden === "manual" ? "boton-oro" : "boton-fantasma"}`}>
                    A mano
                  </button>
                </div>
                <p className="mb-2 text-center text-[11px] text-crema/70">Elegido un orden, la mano se acomoda sola con cada carta que entra. Si arrastrás una carta, vuelve a ser a mano.</p>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="mb-2 min-h-5 text-center text-sm font-bold text-crema/90" aria-live="polite">
            {estado}
          </p>
          <Reorder.Group axis="x" values={mano.map((c) => c.id)} onReorder={reordenar} className="flex justify-center" as="div">
            {(ocupado ? [] : mano).map((c, i) => {
              const combo = comboDe.get(c.id);
              // Que entren todas (con 12 px de solapamiento entre cartas) en el ancho disponible.
              const n = Math.max(mano.length, 7);
              const width = Math.min(64, Math.floor((Math.min(window.innerWidth, 640) - 32 + 12 * (n - 1)) / n));
              return (
                <Reorder.Item
                  key={c.id}
                  value={c.id}
                  as="div"
                  className="relative -ml-3 first:ml-0"
                  style={{ zIndex: arrastrando === c.id ? 50 : i }}
                  // En tu turno de tirar, la carta se puede levantar y soltar sobre el pozo o la zona de corte.
                  drag={miTurno && view.phase === "descartar" ? true : "x"}
                  onDragStart={() => setArrastrando(c.id)}
                  onDragEnd={(e: PointerEvent) => soltar(c.id, e.clientX, e.clientY)}
                  onTap={() => {
                    if (!miTurno || view.phase !== "descartar") return;
                    setSel((x) => (x === c.id ? null : c.id));
                    playSfx("click");
                  }}
                >
                  <motion.div
                    key={view.round}
                    initial={animarReparto ? { y: -260, x: -40, opacity: 0, rotate: -12 } : false}
                    animate={{ y: sel === c.id ? -16 : 0, x: 0, opacity: 1, rotate: 0 }}
                    transition={animarReparto ? { delay: 0.35 + i * view.players.length * 0.09, type: "spring", stiffness: 260, damping: 24 } : {}}
                    className="rounded-lg shadow-lg shadow-black/40" style={combo !== undefined ? { boxShadow: `0 0 0 3px ${COLORES_COMBO[combo % COLORES_COMBO.length]}` } : {}}>
                    <SpanishCard card={c} width={width} highlight={sel === c.id} dimmed={c.id === view.tomadaDelPozo && view.phase === "descartar" && sel === c.id} />
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          <p className="mt-1 text-center text-[11px] text-crema/60">
            {miTurno && view.phase === "descartar" ? "Tocá una carta y tirala, o arrastrala al pozo" + (mejorCorte ? " o a la tijera." : ".") : "Arrastrá las cartas para ordenarlas. Los bordes de color marcan las combinaciones."}
          </p>
          <BarraAcciones
            opciones={[
              { key: "mazo", contenido: <>Mazo<span className="font-sans text-[10px] font-bold opacity-80">{view.mazoCount} cartas</span></>, onClick: miTurno && view.phase === "robar" && valid.some((a) => a.type === "robar" && a.de === "mazo") ? () => robar("mazo") : null },
              { key: "pozo", contenido: "Levantar del pozo", onClick: miTurno && view.phase === "robar" && valid.some((a) => a.type === "robar" && a.de === "pozo") ? () => robar("pozo") : null },
              { key: "tirar", contenido: "Tirar", onClick: miTurno && view.phase === "descartar" && !!sel && valid.some((a) => a.type === "descartar" && a.card === sel) ? tirar : null },
              {
                key: "cortar",
                contenido: sel && cortes.some((a) => a.card === sel) ? "✂ Cortar con esta" : "✂ Cortar",
                onClick: miTurno && view.phase === "descartar" && mejorCorte ? () => cortar(sel && cortes.some((a) => a.card === sel) ? sel : mejorCorte.card) : null,
                destacada: !!mejorCorte,
              },
            ]}
          />
        </div>
      </div>

      <AnimatePresence>
        {resumen && (
          <ResumenRonda
            key="resumen"
            r={resumen}
            match={match}
            yo={yo}
            onSeguir={() => {
              setResumen(null);
              setBajada(null);
              setPendiente(false);
            }}
            terminado={view.winner !== null}
          />
        )}
        {remoto && verFin && view.winner !== null && remoto.fin({ gane: view.winner === yo, empate: false, momentos: momentosChinchon(view.history, yo), marcador: view.players.map((p) => `${nombre(p.seat, match)} ${p.score}`).join(" · ") })}
        {verFin && final && (
          <FinPartida
            key="fin"
            r={final}
            momentos={momentosChinchon(view.history, yo)}
            marcador={view.players.map((p) => `${nombre(p.seat, match)} ${p.score}`).join(" · ")}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={match.carrera ? "Volver a la gira" : "Volver al menú"}
          />
        )}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)} grande>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              {gameInfo("chinchon").reglas.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>
                En esta partida: {view.config.deckSize} cartas{view.config.jokers ? `, comodines (suelto vale ${view.config.comodinSuelto})` : ", sin comodines"}, se corta con {view.config.corteMax} o menos
                {view.config.reenganche ? ", con reenganche" : ""}.
              </li>
              <li>Cuando alguien corta, tus sueltas se ligan solas a sus combinaciones si se puede.</li>
            </ol>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Las manos de todos bajadas en la mesa después de un corte: juegos, ligadas y sueltas. */
function Bajada({ r, yo, nombre, onVer }: { r: ChinchonRoundSummary; yo: number; nombre: (seat: number) => string; onVer: () => void }) {
  // Si no la cerrás, los puntos aparecen solos al rato.
  useEffect(() => {
    const t = window.setTimeout(onVer, 6000);
    return () => clearTimeout(t);
  }, [onVer]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex max-h-full w-full max-w-lg flex-col gap-2 overflow-y-auto px-3 py-2">
      <p className="titulo-criollo text-center text-2xl">{r.chinchon ? "¡Chinchón!" : r.menosDiez ? "¡Menos diez!" : r.cutter === yo ? "Cortaste" : `Cortó ${nombre(r.cutter)}`}</p>
      {r.results.map((x, k) => (
        <motion.div key={x.seat} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + k * 0.25 }} className="rounded-xl bg-black/35 px-2 py-1.5">
          <p className="mb-1 text-xs font-black">
            {x.seat === r.cutter ? "✂ " : ""}
            {nombre(x.seat)} <span className="font-bold text-crema/70">· {x.points > 0 ? `+${x.points}` : x.points}</span>
          </p>
          <MiniMano melds={x.melds} loose={x.loose} laid={x.laid} ancho={34} />
        </motion.div>
      ))}
      <button className="boton boton-oro mx-auto min-h-12 rounded-xl px-6" onClick={onVer}>
        Ver los puntos
      </button>
    </motion.div>
  );
}

function MiniMano({ melds, loose, laid, ancho = 26 }: { melds: Meld[]; loose: Card[]; laid: Card[]; ancho?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {melds.map((m, i) => (
        <div key={i} className="flex -space-x-2 rounded-md p-0.5" style={{ boxShadow: `0 0 0 2px ${COLORES_COMBO[i % COLORES_COMBO.length]}` }}>
          {m.cards.map((c) => (
            <SpanishCard key={c.id} card={c} width={ancho} />
          ))}
        </div>
      ))}
      {laid.length > 0 && (
        <div className="flex -space-x-2 rounded-md p-0.5 outline-2 outline-dashed outline-celeste" title="Ligadas">
          {laid.map((c) => (
            <SpanishCard key={c.id} card={c} width={ancho} />
          ))}
        </div>
      )}
      {loose.length > 0 && (
        <div className="flex -space-x-2 opacity-80">
          {loose.map((c) => (
            <SpanishCard key={c.id} card={c} width={ancho} dimmed />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumenRonda({ r, match, yo, onSeguir, terminado }: { r: ChinchonRoundSummary; match: CMatch; yo: number; onSeguir: () => void; terminado: boolean }) {
  const nombre = (seat: number) => (seat === yo ? "Vos" : match.jugadores[seat]!.nombre);
  return (
    <Modal onClose={onSeguir} grande>
      <h2 className="titulo-criollo mb-1 text-center text-3xl">{r.chinchon ? "¡Chinchón!" : r.menosDiez ? "¡Menos diez!" : r.cutter === yo ? "Cortaste" : `Cortó ${nombre(r.cutter)}`}</h2>
      <p className="mb-3 text-center text-sm text-crema/80">Mano {r.number}</p>
      <div className="flex flex-col gap-2">
        {r.results.map((x) => (
          <div key={x.seat} className="rounded-xl bg-black/30 p-2">
            <div className="mb-1 flex items-center justify-between text-sm font-black">
              <span>
                {x.seat === r.cutter ? "✂ " : ""}
                {nombre(x.seat)}
              </span>
              <span>
                <span className={x.points <= 0 ? "text-[#8bc34a]" : "text-naranja"}>{x.points > 0 ? `+${x.points}` : x.points}</span>
                <span className="ml-2 text-crema/70">→ {r.scores[x.seat]}</span>
              </span>
            </div>
            <MiniMano melds={x.melds} loose={x.loose} laid={x.laid} />
          </div>
        ))}
      </div>
      {r.eliminated.length > 0 && <p className="mt-2 text-center text-sm font-bold">Quedó afuera: {r.eliminated.map(nombre).join(", ")}</p>}
      {r.reenganchados.length > 0 && <p className="mt-1 text-center text-sm font-bold">Se reenganchó: {r.reenganchados.map(nombre).join(", ")}</p>}
      <button className="btn-criollo mt-4 min-h-14 w-full rounded-2xl font-criolla text-xl" onClick={onSeguir}>
        <span className="relative z-[1]">{terminado ? "Ver resultado" : "Siguiente mano"}</span>
      </button>
    </Modal>
  );
}
