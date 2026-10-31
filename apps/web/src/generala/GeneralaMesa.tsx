import {
  CATEGORIAS,
  chooseGeneralaAction,
  generala,
  NOMBRE_CATEGORIA,
  puntaje,
  total,
  type Categoria,
  type GeneralaAction,
  type GeneralaConfig,
  type GeneralaEvent,
  type GeneralaState,
} from "@juegos-argentinos/engine/generala";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { Cara } from "../carrera/Cara.tsx";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { FondoMesa } from "../fondos/fondos.tsx";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_SEAT } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useBotMatch } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { BarraAcciones, EtiquetaJugada, useUltimasJugadas, type OpcionBarra } from "../ui/barra.tsx";
import { Modal } from "../ui/Modal.tsx";
import { IconButton } from "../ui/ui.tsx";
import { Cubilete, Dado } from "./Dado.tsx";
import { REGLAS_GENERALA } from "./reglas.ts";

type GMatch = BotMatch<GeneralaConfig, GeneralaState>;

const CORTO: Record<Categoria, string> = { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", escalera: "Esc.", full: "Full", poker: "Póker", generala: "Gen.", doble: "Doble" };

export function GeneralaMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: GMatch | null; n: number }>(() => ({ m: loadBotMatch<GeneralaConfig, GeneralaState>("generala", (x) => Array.isArray(x.state?.planillas)), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de generala en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "generala-setup" })}>
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

export function GeneralaMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

function Mesa({ initial, onRevancha, remoto }: { initial: GMatch | null; onRevancha?: (m: GMatch) => void; remoto?: Remoto }) {
  const yo = remoto?.yo ?? HUMAN_SEAT;
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const [rodando, setRodando] = useState<number[] | null>(null);
  const [cartel, setCartel] = useState<string | null>(null);
  const [guardar, setGuardar] = useState([false, false, false, false, false]);
  const [tachar, setTachar] = useState<Categoria | null>(null);
  const [reglas, setReglas] = useState(false);
  const [jugadas, anotarJugada] = useUltimasJugadas();
  const nombre = (seat: number, m: GMatch) => (seat === yo ? "Vos" : m.jugadores[seat]!.nombre);

  const { match, view, valid, jugar, miTurno } = useBotMatch({
    def: generala,
    initial,
    remoto,
    actor: (s) => (s.ganadores === null ? s.turno : null),
    choose: (v, va, rng, skill) => chooseGeneralaAction(v, va, rng, skill),
    pausa: rodando !== null || cartel !== null,
    pensar: (s) => (s.tiro === 0 ? 700 : 1100),
    onEvents: (events: readonly GeneralaEvent[], next) => {
      for (const e of events) {
        if (e.type === "tiro") {
          playSfx("dados");
          setRodando(e.tirados);
          window.setTimeout(() => setRodando(null), 750);
        }
        if (e.type === "anotar") {
          const texto = e.puntos === 0 ? `Tachó ${NOMBRE_CATEGORIA[e.categoria].toLowerCase()}` : `${NOMBRE_CATEGORIA[e.categoria]}${e.servida ? " servida" : ""}: ${e.puntos}`;
          anotarJugada(e.seat, texto);
          if (e.puntos >= 50 && e.categoria !== "poker") {
            setCartel(e.categoria === "doble" ? "¡DOBLE GENERALA!" : "¡GENERALA!");
            decir(e.categoria === "doble" ? "Doble generala" : "Generala");
            playSfx("festejo");
            window.setTimeout(() => setCartel(null), 1600);
          }
          if (e.seat === yo) setGuardar([false, false, false, false, false]);
        }
        if (e.type === "generala-servida") {
          setCartel(`¡GENERALA SERVIDA${e.seat === yo ? "!" : ` DE ${nombre(e.seat, next).toUpperCase()}!`}`);
          decir("Generala servida");
          playSfx("festejo");
          vibrate([80, 60, 200]);
          window.setTimeout(() => setCartel(null), 2200);
        }
      }
    },
    onFin: (m) => {
      clearBotMatch("generala");
      const totales = m.state.planillas.map(total);
      const gane = !!m.state.ganadores?.includes(yo) && m.state.ganadores.length === 1;
      const otros = Math.max(...totales.filter((_, i) => i !== yo));
      setFinal(
        cerrar({
          game: "generala",
          ganada: gane,
          botSkill: Math.max(...m.skills.slice(1), 1),
          adaptativo: m.adaptativo,
          paliza: gane && totales[yo]! - otros >= 60,
          hechos: [],
        }),
      );
    },
  });

  // Al cambiar de turno, se sueltan los dados guardados.
  useEffect(() => {
    if (view.tiro === 0) setGuardar([false, false, false, false, false]);
  }, [view.tiro, view.turno]);

  const mia = view.planillas[yo]!;
  const puedoTirar = miTurno && valid.some((a) => a.type === "tirar") && !rodando;
  const puedoAnotar = miTurno && view.tiro > 0 && !rodando;
  const servida = view.tiro === 1;
  const totales = view.planillas.map(total);
  const enTurno = view.turno;

  const tocarDado = (i: number) => {
    if (!miTurno || view.tiro === 0 || view.tiro >= 3 || rodando) return;
    playSfx("click");
    setGuardar((g) => g.map((x, k) => (k === i ? !x : x)));
  };
  const tirar = () => {
    if (!puedoTirar) return;
    const g = view.tiro === 0 ? [false, false, false, false, false] : guardar;
    if (g.every(Boolean)) return;
    jugar({ type: "tirar", guardar: g });
  };
  const anotar = (cat: Categoria) => {
    if (!puedoAnotar || mia[cat] !== null) return;
    const pts = puntaje(view.dados, cat, servida, mia);
    if (pts === 0 && tachar !== cat) {
      setTachar(cat);
      return;
    }
    setTachar(null);
    playSfx("click");
    jugar({ type: "anotar", categoria: cat } as GeneralaAction);
  };

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "generala").rating) : match.skills[1]!;
    const m = newBotMatch(generala, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]! });
    saveBotMatch(m as never);
    playSfx("dados");
    onRevancha?.(m);
  };

  const opciones: OpcionBarra[] = miTurno
    ? [
        {
          key: "tirar",
          destacada: view.tiro === 0,
          onClick: puedoTirar && !(view.tiro > 0 && guardar.every(Boolean)) ? tirar : null,
          contenido: view.tiro === 0 ? "🎲 Tirar los dados" : view.tiro < 3 ? `🎲 Tirar de nuevo (${view.tiro + 1}/3)` : "Sin tiros: anotá",
        },
      ]
    : [];
  const estado =
    view.ganadores !== null
      ? "Partida terminada"
      : miTurno
        ? view.tiro === 0
          ? "Te toca: tirá los dados."
          : view.tiro < 3
            ? "Tocá los dados que guardás y tirá, o anotá en tu planilla."
            : "Anotá en una casilla de tu planilla."
        : `Tira ${nombre(enTurno, match)}…`;

  return (
    <div className="boliche relative isolate flex h-dvh flex-col overflow-hidden">
      <FondoMesa />
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Generala</p>
          <p className="text-xs font-bold text-crema/80">
            {enTurno === yo ? "Tu turno" : `Turno de ${nombre(enTurno, match)}`} · tiro {view.tiro}/3
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex justify-center gap-3 overflow-x-auto px-3 pt-2">
        {view.players.map((_, seat) => (
          <div key={seat} className="flex shrink-0 flex-col items-center">
            <span className={`relative grid size-11 place-items-center overflow-hidden rounded-full border-[3px] bg-black/40 text-2xl ${enTurno === seat && view.ganadores === null ? "border-naranja" : "border-[#d9a066]"}`}>
              <Cara avatar={match.jugadores[seat]!.avatar} />
            </span>
            <span className="max-w-16 truncate text-[11px] font-bold">{nombre(seat, match)}</span>
            <span className="text-xs font-black text-naranja">{totales[seat]}</span>
            {seat !== yo && <EtiquetaJugada texto={jugadas[seat]} />}
          </div>
        ))}
      </div>

      <div className="mesa-pano relative mx-2 my-2 flex shrink-0 flex-col items-center justify-center gap-2 rounded-[1.75rem] px-3 py-3">
        <div className="flex items-end justify-center gap-3">
          <Cubilete sacudiendo={rodando !== null} size={46} />
          <div className="flex gap-1.5">
            {view.dados.map((d, i) => (
              <button key={i} onClick={() => tocarDado(i)} aria-pressed={guardar[i]} aria-label={`Dado ${i + 1}: ${d || "sin tirar"}${guardar[i] ? ", guardado" : ""}`} disabled={!miTurno || view.tiro === 0 || view.tiro >= 3}>
                <Dado valor={d} size={50} guardado={miTurno && guardar[i]!} rodando={!!rodando?.includes(i)} retraso={i * 0.04} />
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-xs font-bold text-crema/85" aria-live="polite">
          {estado}
        </p>
      </div>

      <div className="mx-2 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-[#1c120a]/85 p-2 ring-1 ring-[#d9a066]/30">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-[11px] text-crema/70">
              <th className="w-[4.5rem] text-left">Casilla</th>
              {view.players.map((_, seat) => (
                <th key={seat} className={`truncate px-0.5 ${seat === enTurno ? "text-naranja" : ""}`}>
                  {seat === yo ? "Vos" : match.jugadores[seat]!.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS.map((cat) => (
              <tr key={cat} className="odd:bg-black/20">
                <td className="py-0.5 pl-1 text-xs font-bold">{cat.length === 1 ? `Al ${cat}` : CORTO[cat]}</td>
                {view.players.map((_, seat) => {
                  const v = view.planillas[seat]![cat];
                  if (seat === yo && v === null && puedoAnotar) {
                    const pts = puntaje(view.dados, cat, servida, mia);
                    return (
                      <td key={seat} className="p-0.5">
                        <button
                          onClick={() => anotar(cat)}
                          className={`min-h-9 w-full rounded-lg text-sm font-black ${tachar === cat ? "bg-[#b91c1c] text-white" : pts > 0 ? "bg-[#16a34a] text-white" : "bg-white/10 text-crema/60"}`}
                        >
                          {tachar === cat ? "¿Tachar?" : pts > 0 ? `+${pts}` : "✕"}
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={seat} className={`text-center font-black ${v === 0 ? "text-crema/40" : ""}`}>
                      {v === null ? "" : v === 0 ? "✕" : v}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-crema/30">
              <td className="py-1 pl-1 text-xs font-black uppercase">Total</td>
              {totales.map((t, seat) => (
                <td key={seat} className="text-center font-criolla text-lg text-naranja">
                  {t}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <BarraAcciones opciones={opciones} vacio={estado} />

      <AnimatePresence>
        {cartel && (
          <motion.div key="cartel" initial={{ scale: 0.3, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }} className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
            <p className="titulo-criollo rounded-3xl border-4 border-[#fde68a] bg-[#7f1d1d] px-6 py-3 text-center text-5xl shadow-2xl">{cartel}</p>
          </motion.div>
        )}
        {final && !cartel && (
          <FinPartida
            key="fin"
            r={final}
            titulo={view.servida !== null ? (view.servida === yo ? "¡Generala servida!" : "Generala servida…") : undefined}
            marcador={totales.map((t, s) => `${nombre(s, match)} ${t}`).join(" · ")}
            onRevancha={revancha}
            onSalir={back}
          />
        )}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)}>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="list-decimal space-y-2 pl-5">
              {REGLAS_GENERALA.map((r) => (
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
