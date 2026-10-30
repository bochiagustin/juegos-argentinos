import { personaje, type Hecho } from "@juegos-argentinos/career";
import { Cara, rivalEn } from "../carrera/Cara.tsx";
import type { SuitedCard } from "@juegos-argentinos/engine";
import { bandoDe, chooseEscobaAction, escoba, valorEscoba, type EscobaAction, type EscobaConfig, type EscobaEvent, type EscobaRoundSummary, type EscobaState } from "@juegos-argentinos/engine/escoba";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
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
import { momentosEscoba } from "../partidas/momentos.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useBotMatch } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { BarraAcciones, EtiquetaJugada, laCarta, useUltimasJugadas, type OpcionBarra } from "../ui/barra.tsx";
import { FileteEsquinas, IconButton } from "../ui/ui.tsx";
import { FondoMesa } from "../fondos/fondos.tsx";

type EMatch = BotMatch<EscobaConfig, EscobaState>;

/** La escoba de mano de la primera ronda pasa al crear la partida: se anota acá para el logro. */
function conEscobaDeManoInicial(m: EMatch): EMatch {
  const yaEsta = m.hechos.some((h) => h.tipo === "escoba-de-mano");
  if (m.state.ronda === 1 && m.state.history.length === 0 && (m.state.escobas[HUMAN_SEAT] ?? 0) > 0 && !yaEsta) {
    return { ...m, hechos: [...m.hechos, { tipo: "escoba-de-mano" }, { tipo: "escoba-escobas", cantidad: m.state.escobas[HUMAN_SEAT]! }] };
  }
  return m;
}

export function EscobaMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: EMatch | null; n: number }>(() => {
    const m = loadBotMatch<EscobaConfig, EscobaState>("escoba", (x) => Array.isArray(x.state?.pilas));
    return { m: m ? conEscobaDeManoInicial(m) : null, n: 0 };
  });
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de escoba en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "escoba-setup" })}>
            <span className="relative z-[1]">Armar una partida</span>
          </button>
          <button className="mt-3 block w-full text-sm underline" onClick={back}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  return <Mesa key={partida.n} initial={partida.m} onRevancha={(m) => setPartida((p) => ({ m: conEscobaDeManoInicial(m), n: p.n + 1 }))} />;
}

const sumaDe = (cs: readonly SuitedCard[]) => cs.reduce((a, c) => a + valorEscoba(c), 0);

export function EscobaMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

function Mesa({ initial, onRevancha, remoto }: { initial: EMatch | null; onRevancha?: (m: EMatch) => void; remoto?: Remoto }) {
  const yo = remoto?.yo ?? HUMAN_SEAT;
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const [resumen, setResumen] = useState<EscobaRoundSummary | null>(null);
  const [cartel, setCartel] = useState<{ texto: string; mio: boolean } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [jugadas, anotar, limpiarJugadas] = useUltimasJugadas();
  const [reglas, setReglas] = useState(false);
  // Hay un resumen de ronda por mostrar: el fin de partida espera a que se vea.
  const [pendiente, setPendiente] = useState(false);
  const nombre = (seat: number, m: EMatch) => (seat === yo ? "Vos" : m.jugadores[seat]!.nombre);

  const { match, view, valid, jugar, miTurno } = useBotMatch({
    def: escoba,
    initial,
    remoto,
    actor: (s) => (s.winner === null ? s.turn : null),
    choose: (v, va, rng, skill, _seat, rasgos) => chooseEscobaAction(v, va, rng, skill, rasgos),
    pausa: resumen !== null || cartel !== null,
    pensar: () => 900,
    onEvents: (events: readonly EscobaEvent[], next) => {
      const hechos: Hecho[] = [];
      for (const e of events) {
        if (e.type === "tirada") {
          playSfx("carta");
          if (e.seat !== yo) anotar(e.seat, e.escoba ? "¡Escoba!" : e.levanta.length ? `Levantó ${e.levanta.length + 1} con ${laCarta(e.card)}` : `Tiró ${laCarta(e.card)}`);
          if (e.escoba) {
            const mio = e.seat === yo;
            setCartel({ texto: mio ? "¡ESCOBA!" : `¡Escoba de ${nombre(e.seat, next)}!`, mio });
            playSfx(mio ? "turno" : "barajar");
            decir("Escoba");
            window.setTimeout(() => setCartel(null), 1500);
            if (mio) hechos.push({ tipo: "escoba-escobas", cantidad: 1 });
          }
        }
        if (e.type === "nueva-ronda") limpiarJugadas();
        if (e.type === "escoba-de-mano") {
          setCartel({ texto: `¡Escoba de mano${e.seat === yo ? "!" : ` de ${nombre(e.seat, next)}!`}`, mio: e.seat === yo });
          window.setTimeout(() => setCartel(null), 1600);
          if (e.seat === yo) hechos.push({ tipo: "escoba-de-mano" }, { tipo: "escoba-escobas", cantidad: e.escobas });
        }
        if (e.type === "reparto" || e.type === "nueva-ronda") window.setTimeout(() => playSfx("repartir"), 400);
        if (e.type === "fin-ronda") {
          const mio = e.summary.bandos[bandoDe(next.config, yo)];
          if (mio && mio.sietes === 4) hechos.push({ tipo: "escoba-cuatro-sietes" });
          setPendiente(true);
          window.setTimeout(() => setResumen(e.summary), 700);
        }
      }
      return hechos;
    },
    onFin: (m) => {
      clearBotMatch("escoba");
      const miBando = bandoDe(m.config, yo);
      const gane = m.state.winner === miBando;
      const rival = Math.max(...m.state.score.filter((_, i) => i !== miBando));
      const peor = Math.min(0, ...m.state.history.map((h) => h.score[miBando]! - Math.max(...h.score.filter((_, i) => i !== miBando))));
      const escobas = m.hechos.filter((h): h is Extract<Hecho, { tipo: "escoba-escobas" }> => h.tipo === "escoba-escobas").reduce((a, h) => a + h.cantidad, 0);
      setFinal(
        cerrar({
          game: "escoba",
          ganada: gane,
          botSkill: Math.max(...m.skills.slice(1)),
          adaptativo: m.adaptativo,
          ...(m.carrera ? { rivalId: m.carrera.rivalId } : {}),
          remontada: gane && peor <= -7,
          paliza: gane && rival < m.config.target / 2,
          hechos: [...m.hechos.filter((h) => h.tipo !== "escoba-escobas"), { tipo: "escoba-escobas", cantidad: escobas }],
        }),
      );
    },
  });

  const verFin = !resumen && !pendiente;
  const miBando = view.bando;
  const mias = valid.filter((a) => a.card === sel);
  const combos = mias.filter((a) => a.levanta.length > 0);
  const puedeDejar = mias.some((a) => a.levanta.length === 0);
  const cartaSel = view.hand.find((c) => c.id === sel) ?? null;

  const tocar = (c: SuitedCard) => {
    if (!miTurno) return;
    playSfx("click");
    setSel((x) => (x === c.id ? null : c.id));
  };
  const hacer = (a: EscobaAction) => {
    setSel(null);
    jugar(a);
  };

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "escoba").rating) : match.skills[1]!;
    const rival = match.carrera ? { id: match.carrera.rivalId, jugador: match.jugadores[1]!, skill: match.skills[1]! } : undefined;
    const m = newBotMatch(escoba, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]!, ...(rival ? { rival } : {}) });
    saveBotMatch(m as never);
    playSfx("barajar");
    onRevancha?.(m);
  };

  const bandoNombre = (b: number) => {
    const seats = view.players.filter((p) => bandoDe(view.config, p.seat) === b).map((p) => p.seat);
    return seats.map((s) => nombre(s, match)).join(" y ");
  };
  const otros = view.players.filter((p) => p.seat !== yo);
  const mio = view.players[yo]!;

  const estadoTexto =
    view.winner !== null ? "Partida terminada" : view.turn === yo ? "Te toca: elegí una carta." : `Juega ${nombre(view.turn, match)}…`;
  // Con una carta elegida, la barra muestra qué se puede levantar con ella (y dejarla o volver).
  const opcionesBarra: OpcionBarra[] =
    miTurno && cartaSel
      ? [
          ...combos.map((a): OpcionBarra => {
            const levanta = view.mesa.filter((c) => a.levanta.includes(c.id));
            const esEscoba = levanta.length === view.mesa.length;
            return {
              key: a.levanta.join(","),
              destacada: esEscoba,
              onClick: () => hacer(a),
              contenido: (
                <>
                  <span className="flex -space-x-2">
                    {levanta.map((c) => (
                      <SpanishCard key={c.id} card={c} width={18} />
                    ))}
                  </span>
                  {esEscoba ? "¡Escoba!" : "Levantar"}
                </>
              ),
            };
          }),
          ...(puedeDejar ? [{ key: "dejar", contenido: combos.length ? "Dejarla" : "Dejarla en la mesa", onClick: () => hacer({ type: "tirar", card: cartaSel.id, levanta: [] }) }] : []),
          { key: "volver", contenido: "Volver", onClick: () => setSel(null) },
        ]
      : [];

  return (
    <div className="boliche relative isolate flex h-dvh flex-col overflow-hidden">
      <FondoMesa />
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Escoba de 15</p>
          <p className="text-xs font-bold text-crema/80">
            Ronda {view.ronda} · a {view.config.target}
            {match.carrera ? ` · ${personaje(match.carrera.rivalId).bajada}` : ""}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex flex-wrap justify-center gap-1.5 px-3 pt-2 text-xs font-bold">
        {view.score.map((p, b) => (
          <span key={b} className={`rounded-full px-2.5 py-1 ${b === miBando ? "bg-pano" : "bg-black/35"}`}>
            {b === miBando && view.config.players === 2 ? "Vos" : bandoNombre(b)} · <span className="text-naranja">{p}</span>
          </span>
        ))}
      </div>

      <div className="flex justify-center gap-4 px-3 pt-2">
        {otros.map((p) => (
          <div key={p.seat} className="flex flex-col items-center">
            <span className={`relative grid size-12 place-items-center overflow-hidden rounded-full border-[3px] bg-black/40 text-2xl ${view.turn === p.seat && view.winner === null ? "border-naranja" : bandoDe(view.config, p.seat) === miBando ? "border-celeste" : "border-[#d9a066]"}`}>
              <Cara avatar={match.jugadores[p.seat]!.avatar} rivalId={rivalEn(match, p.seat)} />
            </span>
            <span className="mt-0.5 max-w-20 truncate text-xs font-bold">{match.jugadores[p.seat]!.nombre}</span>
            <EtiquetaJugada texto={jugadas[p.seat]} />
            <span className="text-[11px] font-bold text-crema/80">
              🂠 {p.pila}
              {p.escobas > 0 && <span className="ml-1 text-naranja">🧹{p.escobas}</span>}
            </span>
            <div className="flex -space-x-2">
              {Array.from({ length: p.cards }, (_, i) => (
                <SpanishCard key={i} card={null} width={14} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mx-2 my-2 flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div className="mesa-pano pointer-events-none absolute inset-0 rounded-[1.75rem]">
          <FileteEsquinas />
        </div>
        <p className="relative mb-2 text-xs font-black uppercase tracking-widest text-crema/70">
          La mesa suma {sumaDe(view.mesa)} · quedan {view.mazoCount} en el mazo
        </p>
        <div className="relative flex max-w-full flex-wrap justify-center gap-2">
          <AnimatePresence>
            {view.mesa.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ scale: 0.5, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ x: 220, rotate: 25, opacity: 0, transition: { duration: 0.45 } }}
                className="relative rounded-lg shadow-lg shadow-black/40"
              >
                <SpanishCard card={c} width={view.mesa.length > 8 ? 44 : 54} />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-tinta px-1.5 text-[10px] font-black">{valorEscoba(c)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {view.mesa.length === 0 && <p className="text-sm text-crema/60">La mesa está vacía</p>}
        </div>
        <AnimatePresence>
          {cartel && (
            <motion.div key="cartel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`pointer-events-none absolute inset-0 z-30 grid place-items-center ${cartel.mio ? "bg-amber-400/25" : "bg-black/30"}`}>
              <motion.div initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: -3 }} className="text-center">
                <motion.span initial={{ x: -120, rotate: -30 }} animate={{ x: 120, rotate: 20 }} transition={{ duration: 1, ease: "easeInOut" }} className="block text-6xl" aria-hidden>
                  🧹
                </motion.span>
                <p className="titulo-criollo text-5xl">{cartel.texto}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="madera z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="relative z-[1]">
          <div className="mb-3 flex items-center justify-between text-xs font-bold">
            <span className="rounded-full bg-black/35 px-2 py-1">Tu pila: {mio.pila}</span>
            {mio.escobas > 0 && <span className="rounded-full bg-naranja px-2 py-1 text-tinta">🧹 {mio.escobas} escoba{mio.escobas === 1 ? "" : "s"}</span>}
          </div>
          <div className="flex justify-center gap-2">
            <AnimatePresence>
              {view.hand.map((c) => {
                const ops = miTurno ? valid.filter((a) => a.card === c.id && a.levanta.length > 0) : [];
                const barre = ops.some((a) => a.levanta.length === view.mesa.length);
                return (
                  <motion.button
                    key={c.id}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: sel === c.id ? -14 : 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    disabled={!miTurno}
                    onClick={() => tocar(c)}
                    aria-label={`Elegir ${c.rank} de ${c.suit}${barre ? " (¡escoba!)" : ops.length ? " (levanta)" : ""}`}
                    className="relative rounded-xl shadow-xl shadow-black/50"
                  >
                    <SpanishCard card={c} width={Math.min(84, Math.round(window.innerWidth * 0.2))} highlight={sel === c.id || ops.length > 0} />
                    {barre ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-naranja px-2 text-[10px] font-black uppercase text-tinta">¡Escoba!</span>
                    ) : ops.length > 0 ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-pano px-2 text-[10px] font-black uppercase">Levanta</span>
                    ) : null}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
          <BarraAcciones opciones={opcionesBarra} vacio={estadoTexto} />
        </div>
      </div>

      <AnimatePresence>
        {resumen && (
          <Modal key="resumen" onClose={() => {}} grande>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Ronda {resumen.numero}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-crema/70">
                    <th className="py-1"></th>
                    {resumen.bandos.map((_, b) => (
                      <th key={b} className="py-1 text-center">
                        {b === miBando ? "Vos" : bandoNombre(b)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-semibold">
                  {(
                    [
                      ["🧹 Escobas", (x: (typeof resumen.bandos)[number]) => x.escobas, null],
                      ["Cartas", (x: (typeof resumen.bandos)[number]) => x.cartas, resumen.categorias.cartas],
                      ["Oros", (x: (typeof resumen.bandos)[number]) => x.oros, resumen.categorias.oros],
                      ["7 de oro", (x: (typeof resumen.bandos)[number]) => (x.sieteDeOro ? "✔" : "—"), resumen.categorias.sieteDeOro],
                      ["Sietes", (x: (typeof resumen.bandos)[number]) => x.sietes, resumen.categorias.sietes],
                    ] as const
                  ).map(([label, val, ganador]) => (
                    <tr key={label} className="border-t border-crema/10">
                      <td className="py-1.5">{label}</td>
                      {resumen.bandos.map((x, b) => (
                        <td key={b} className={`py-1.5 text-center ${ganador === b ? "font-black text-naranja" : ""}`}>
                          {val(x)}
                          {ganador === b ? " +1" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-crema/30 font-black">
                    <td className="py-1.5">Puntos</td>
                    {resumen.bandos.map((x, b) => (
                      <td key={b} className="py-1.5 text-center">
                        +{x.puntos} → {resumen.score[b]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {resumen.sobrantes.cartas > 0 && (
              <p className="mt-2 text-center text-xs text-crema/80">
                Lo que quedó en la mesa ({resumen.sobrantes.cartas}) fue para {resumen.sobrantes.bando === null ? "nadie" : resumen.sobrantes.bando === miBando ? "vos" : bandoNombre(resumen.sobrantes.bando)}.
              </p>
            )}
            <button
              className="btn-criollo mt-4 min-h-14 w-full rounded-2xl font-criolla text-xl"
              onClick={() => {
                setResumen(null);
                setPendiente(false);
              }}
            >
              <span className="relative z-[1]">{view.winner !== null ? "Ver resultado" : "Siguiente ronda"}</span>
            </button>
          </Modal>
        )}
        {remoto && verFin && view.winner !== null && remoto.fin({ gane: view.winner === miBando, empate: false, momentos: momentosEscoba(view.history, miBando), marcador: view.score.map((p, b) => `${b === miBando ? "Vos" : bandoNombre(b)} ${p}`).join(" · ") })}
        {verFin && final && (
          <FinPartida
            key="fin"
            r={final}
            momentos={momentosEscoba(view.history, miBando)}
            marcador={view.score.map((p, b) => `${b === miBando ? "Vos" : bandoNombre(b)} ${p}`).join(" · ")}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={match.carrera ? "Volver a la gira" : "Volver al menú"}
          />
        )}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)} grande>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              {gameInfo("escoba").reglas.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>Si al repartir la mesa suma 15 (o 30), el que reparte se la lleva: escoba de mano.</li>
              <li>Lo que queda en la mesa al final es del último que levantó (no cuenta como escoba).</li>
              <li>
                En esta partida: a {view.config.target}
                {view.config.levantarObligatorio ? ", levantar es obligatorio" : ", levantar es opcional"}.
              </li>
            </ol>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
