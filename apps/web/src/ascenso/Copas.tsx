import {
  COPAS,
  copaInfo,
  letraGrupo,
  nombreRonda,
  nombreTitulo,
  tablaGrupo,
  YO_CLUB,
  type AscensoProgress,
  type Copa,
  type CopaId,
  type Cruce,
  type Partido,
  type TituloId,
} from "@juegos-argentinos/career";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { Modal } from "../ui/Modal.tsx";
import { Escudo, useNombreClub } from "./Escudo.tsx";
import { LogoTorneo, type TorneoId } from "./LogoTorneo.tsx";

/** Las copas de la temporada: elegís una y ves sus grupos y sus cruces. */
export function CopasPanel({ p }: { p: AscensoProgress }) {
  const ids = COPAS.map((c) => c.id).filter((id) => p.copas[id]);
  const juego = (id: CopaId) => {
    const c = p.copas[id]!;
    return c.grupos
      ? c.grupos.some((g) => g.includes(YO_CLUB))
      : c.rondas[0]!.some((x) => x.a === YO_CLUB || x.b === YO_CLUB);
  };
  const [sel, setSel] = useState<CopaId>(ids.find(juego) ?? "copa-argentina");
  const c = p.copas[sel];
  return (
    <div className="flex flex-col gap-3">
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {ids.map((id) => {
          const info = copaInfo(id);
          return (
            <button
              key={id}
              onClick={() => {
                playSfx("click");
                setSel(id);
              }}
              aria-pressed={sel === id}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-black ${sel === id ? "border-naranja bg-naranja text-tinta" : "border-crema/15 bg-black/25"}`}
            >
              <LogoTorneo id={id} className="size-7 rounded-full" />
              {info.corto}
              {juego(id) && (
                <span
                  className={`size-2 rounded-full ${sel === id ? "bg-tinta" : "bg-[#4caf50]"}`}
                  aria-label="La jugás"
                />
              )}
            </button>
          );
        })}
      </div>
      {c && <CopaDetalle c={c} />}
    </div>
  );
}

function CopaDetalle({ c }: { c: Copa }) {
  const info = copaInfo(c.id);
  const nombres = c.rondas.map((r) => nombreRonda(r.length * 2));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <LogoTorneo id={c.id} className="size-16" />
        <span className="font-criolla text-xl leading-tight">
          {info.nombre}
        </span>
      </div>
      {c.campeon && (
        <Campeon id={c.campeon} texto={`Campeón de la ${info.nombre}`} />
      )}
      {c.rondas.length > 0 && (
        <Cuadro
          rondas={c.rondas}
          nombres={nombres}
          soloMiRuta={c.rondas[0]!.length > 4}
        />
      )}
      {c.grupos && <Grupos c={c} />}
    </div>
  );
}

function Grupos({ c }: { c: Copa }) {
  const nombre = useNombreClub();
  const mio = c.grupos!.findIndex((g) => g.includes(YO_CLUB));
  const [todos, setTodos] = useState(mio === -1);
  const zonas = c.grupos!.length === 2;
  const lista = c.grupos!.map((_, g) => g).filter((g) => todos || g === mio);
  return (
    <div className="flex flex-col gap-2">
      {lista.map((g) => (
        <div key={g} className="rounded-2xl bg-black/25 p-2">
          <p className="mb-1 px-1 text-xs font-black uppercase tracking-wider text-naranja">
            {zonas ? "Zona" : "Grupo"} {letraGrupo(g)}
          </p>
          <table className="w-full table-fixed text-sm">
            <tbody>
              {tablaGrupo(c, g).map(({ id, fila }, i) => (
                <tr
                  key={id}
                  className={`border-l-4 ${i < c.pasan ? "border-l-[#4caf50]" : "border-l-transparent"} ${id === YO_CLUB ? "bg-[#2e7d32]/35 font-black" : ""}`}
                >
                  <td className="w-6 py-0.5 text-center font-criolla">
                    {i + 1}
                  </td>
                  <td className="py-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Escudo id={id} className="size-6" />
                      <span className="truncate">{nombre(id)}</span>
                    </span>
                  </td>
                  <td className="w-12 text-center text-xs text-crema/70">
                    {fila.pg}-{fila.pp}
                  </td>
                  <td className="w-9 text-center font-black">{fila.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {mio !== -1 && (
        <button
          className="boton boton-fantasma min-h-11 rounded-xl text-sm"
          onClick={() => setTodos((x) => !x)}
        >
          {todos
            ? "Ver solo mi grupo"
            : `Ver ${zonas ? "las dos zonas" : "todos los grupos"}`}
        </button>
      )}
    </div>
  );
}

export function Campeon({ id, texto }: { id: string; texto: string }) {
  const nombre = useNombreClub();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-naranja/20 px-3 py-2">
      <Escudo id={id} className="size-10" />
      <span>
        <span className="block text-xs font-black uppercase text-naranja">
          🏆 {texto}
        </span>
        <span className="font-black">{nombre(id)}</span>
      </span>
    </div>
  );
}

/**
 * Cruces por ronda, de la última a la primera. Con `soloMiRuta`, las rondas viejas muestran solo mis partidos
 * (en las copas grandes hay muchos cruces).
 */
export function Cuadro({
  rondas,
  nombres,
  bye,
  soloMiRuta = false,
}: {
  rondas: Cruce[][];
  nombres: readonly string[];
  bye?: string | undefined;
  soloMiRuta?: boolean;
}) {
  const nombre = useNombreClub();
  const ultima = rondas.length - 1;
  const [todas, setTodas] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {bye && rondas.length <= 1 && (
        <p className="rounded-xl bg-black/30 px-3 py-2 text-sm">
          ⏭️ {nombre(bye)} (2º) pasa directo a semis.
        </p>
      )}
      {rondas
        .map((cruces, r) => ({ cruces, r }))
        .reverse()
        .map(({ cruces, r }) => {
          const lista =
            soloMiRuta && r !== ultima && !todas
              ? cruces.filter((c) => c.a === YO_CLUB || c.b === YO_CLUB)
              : cruces;
          if (!lista.length) return null;
          return (
            <div key={r}>
              <p className="mb-1 px-1 text-xs font-black uppercase tracking-wider text-naranja">
                {nombres[r]}
              </p>
              <ul className="flex flex-col gap-1">
                {lista.map((c) => (
                  <li
                    key={c.a}
                    className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${c.a === YO_CLUB || c.b === YO_CLUB ? "bg-[#2e7d32]/35" : "bg-black/25"}`}
                  >
                    <Lado
                      id={c.a}
                      nombre={nombre(c.a)}
                      gano={c.ganador === c.a}
                      perdio={!!c.ganador && c.ganador !== c.a}
                    />
                    <span className="text-xs text-crema/60">vs</span>
                    <Lado
                      id={c.b}
                      nombre={nombre(c.b)}
                      gano={c.ganador === c.b}
                      perdio={!!c.ganador && c.ganador !== c.b}
                      derecha
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      {soloMiRuta && rondas.length > 1 && (
        <button
          className="boton boton-fantasma min-h-11 rounded-xl text-sm"
          onClick={() => setTodas((x) => !x)}
        >
          {todas ? "Ver solo mis partidos" : "Ver todos los cruces"}
        </button>
      )}
    </div>
  );
}

function Lado({
  id,
  nombre,
  gano,
  perdio,
  derecha = false,
}: {
  id: string;
  nombre: string;
  gano: boolean;
  perdio: boolean;
  derecha?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 ${derecha ? "flex-row-reverse text-right" : ""} ${perdio ? "opacity-45" : ""} ${gano ? "font-black" : ""}`}
    >
      <Escudo id={id} className="size-7" />
      <span className="truncate">{nombre}</span>
    </span>
  );
}

// --- Vitrina ---

function colorTitulo(id: TituloId): string {
  if (id.startsWith("liga-"))
    return id === "liga-primera" ? "#e11d48" : "#4caf50";
  if (id.startsWith("reducido-")) return "#f59e0b";
  return copaInfo(id as CopaId).color;
}

/** Un trofeo dibujado: copa dorada con la cinta del color del torneo. */
export function Trofeo({
  id,
  className = "size-14",
}: {
  id: TituloId;
  className?: string;
}) {
  const color = colorTitulo(id);
  const grande = id === "libertadores" || id === "liga-primera";
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <defs>
        <linearGradient id={`oro-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="0.45" stopColor="#fde68a" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M14 8h36v10c0 13-7 22-18 24C21 40 14 31 14 18z"
        fill={`url(#oro-${id})`}
        stroke="#713f12"
        strokeWidth="2"
      />
      <path
        d="M14 12H6c0 10 4 15 10 16M50 12h8c0 10-4 15-10 16"
        fill="none"
        stroke="#b45309"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {grande && (
        <circle
          cx="32"
          cy="20"
          r="5"
          fill="#fef3c7"
          stroke="#713f12"
          strokeWidth="1.5"
        />
      )}
      <rect
        x="28"
        y="42"
        width="8"
        height="10"
        fill={`url(#oro-${id})`}
        stroke="#713f12"
        strokeWidth="2"
      />
      <rect
        x="18"
        y="52"
        width="28"
        height="12"
        rx="2"
        fill="#3b2a1a"
        stroke="#713f12"
        strokeWidth="2"
      />
      <rect x="18" y="56" width="28" height="4" fill={color} />
    </svg>
  );
}

export function Vitrina({ p }: { p: AscensoProgress }) {
  const nombre = useNombreClub();
  const porTipo = useMemo(() => {
    const m = new Map<TituloId, number[]>();
    for (const t of p.titulos)
      m.set(t.id, [...(m.get(t.id) ?? []), t.temporada]);
    return [...m.entries()];
  }, [p.titulos]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-black/30 px-3 py-2">
        <Escudo id={YO_CLUB} className="size-12" />
        <span>
          <span className="block font-black">{nombre(YO_CLUB)}</span>
          <span className="text-sm text-crema/80">
            {p.titulos.length === 0
              ? "La vitrina está vacía… ¡a llenarla!"
              : `${p.titulos.length} ${p.titulos.length === 1 ? "título" : "títulos"}`}
          </span>
        </span>
      </div>
      {porTipo.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {porTipo.map(([id, temporadas]) => (
            <li
              key={id}
              className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-[#3b2a1a] to-black/40 px-2 py-3 text-center shadow-inner"
            >
              <span className="relative">
                <Trofeo id={id} />
                {!id.startsWith("reducido-") && (
                  <LogoTorneo
                    id={id as TorneoId}
                    className="absolute -bottom-1 -left-3 size-7 rounded-full"
                  />
                )}
                {temporadas.length > 1 && (
                  <span className="absolute -right-2 -top-1 grid size-6 place-items-center rounded-full bg-naranja text-xs font-black text-tinta">
                    ×{temporadas.length}
                  </span>
                )}
              </span>
              <span className="text-xs font-black leading-tight">
                {nombreTitulo(id)}
              </span>
              <span className="text-[11px] text-crema/70">
                Temp. {temporadas.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Bolillero ---

/** El sorteo: el bolillero gira, salen bolillas con escudos y queda tu rival (o tu grupo). */
export function Bolillero({
  partido,
  grupo,
  onListo,
}: {
  partido: Partido;
  grupo: string[] | null;
  onListo: () => void;
}) {
  const nombre = useNombreClub();
  const info = partido.copa ? copaInfo(partido.copa) : null;
  const revelar = grupo ? grupo.filter((x) => x !== YO_CLUB) : [partido.rival];
  const [salidas, setSalidas] = useState(0);
  useEffect(() => {
    playSfx("bolillero");
    const ts = revelar.map((_, i) =>
      window.setTimeout(
        () => {
          setSalidas(i + 1);
          playSfx("carta");
          vibrate(25);
        },
        1300 + i * 900,
      ),
    );
    return () => ts.forEach(clearTimeout);
  }, [revelar.length]);
  const listo = salidas >= revelar.length;
  return (
    <Modal onClose={() => listo && onListo()}>
      <div className="flex flex-col items-center gap-3 text-center">
        {partido.copa && <LogoTorneo id={partido.copa} className="size-16" />}
        <p className="text-xs font-black uppercase tracking-wider text-naranja">
          {info ? info.nombre : "🔥 Reducido"} · Sorteo
        </p>
        <motion.div
          animate={listo ? { rotate: 0 } : { rotate: 360 }}
          transition={
            listo
              ? { duration: 0.3 }
              : { repeat: Infinity, duration: 0.8, ease: "linear" }
          }
          className="relative grid size-28 place-items-center rounded-full border-4 border-[#d9a066] bg-gradient-to-br from-[#5b3a1e] to-[#2b1a0e] shadow-xl"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="absolute size-5 rounded-full bg-crema shadow"
              style={{ transform: `rotate(${i * 60}deg) translateY(-34px)` }}
            />
          ))}
          <span className="text-3xl">{listo ? "🎱" : ""}</span>
        </motion.div>
        <p className="font-criolla text-xl">
          {grupo ? "Tu grupo" : "Tu rival"}
        </p>
        <div
          className={`grid w-full gap-2 ${grupo ? "grid-cols-3" : "grid-cols-1"}`}
        >
          {revelar.map((id, i) => (
            <AnimatePresence key={id}>
              {i < salidas ? (
                <motion.div
                  initial={{ scale: 0, y: -40, rotate: -30 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-black/30 p-2"
                >
                  <Escudo id={id} className={grupo ? "size-14" : "size-24"} />
                  <span className="line-clamp-2 text-xs font-black leading-tight">
                    {nombre(id)}
                  </span>
                </motion.div>
              ) : (
                <div className="grid min-h-24 place-items-center rounded-2xl border-2 border-dashed border-crema/20 text-3xl text-crema/30">
                  ?
                </div>
              )}
            </AnimatePresence>
          ))}
        </div>
        <p className="text-sm text-crema/80">{partido.titulo}</p>
        <button
          disabled={!listo}
          className="btn-criollo min-h-14 w-full rounded-2xl font-criolla text-2xl"
          onClick={onListo}
        >
          <span className="relative z-[1]">
            {listo ? "¡Vamos!" : "Sorteando…"}
          </span>
        </button>
      </div>
    </Modal>
  );
}

// --- Festejo ---

const PAPELITOS = [
  "#7cc4ef",
  "#ffffff",
  "#f59e0b",
  "#e11d48",
  "#22c55e",
  "#fde68a",
];

/** Festejo de campeón: trofeo, papelitos y la hinchada. Encima de la pantalla final. */
export function Festejo({
  titulos,
  clasico,
  onCerrar,
}: {
  titulos: { id: TituloId; nombre: string }[];
  /** Si se ganó un clásico (sin título), se festeja igual. */
  clasico?: string | undefined;
  onCerrar: () => void;
}) {
  useEffect(() => {
    playSfx("festejo");
    vibrate([80, 60, 80, 60, 200]);
  }, []);
  const papelitos = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (i * 37) % 100,
        d: (i % 7) * 0.25,
        c: PAPELITOS[i % PAPELITOS.length]!,
        r: (i * 53) % 360,
        dur: 2.4 + (i % 5) * 0.5,
      })),
    [],
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/80 px-6"
      role="dialog"
      aria-label="¡Campeón!"
      onClick={onCerrar}
    >
      {papelitos.map((x, i) => (
        <motion.span
          key={i}
          initial={{ y: -40, rotate: x.r }}
          animate={{ y: "110vh", rotate: x.r + 540 }}
          transition={{
            delay: x.d,
            duration: x.dur,
            repeat: Infinity,
            ease: "linear",
          }}
          className="pointer-events-none absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${x.x}%`, background: x.c }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.3, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 10 }}
        className="relative flex flex-col items-center gap-2 text-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          {titulos[0] ? (
            <Trofeo
              id={titulos[0].id}
              className="size-40 drop-shadow-[0_0_30px_rgba(253,230,138,0.7)]"
            />
          ) : (
            <span
              className="block text-9xl drop-shadow-[0_0_30px_rgba(248,113,113,0.8)]"
              aria-hidden
            >
              🔥
            </span>
          )}
        </motion.div>
        {titulos[0] && !titulos[0].id.startsWith("reducido-") && (
          <LogoTorneo id={titulos[0].id as TorneoId} className="size-20" />
        )}
        <h2 className="titulo-criollo text-6xl">
          {titulos.length ? "¡Campeón!" : "¡Ganamos el clásico!"}
        </h2>
        {titulos.map((t) => (
          <p key={t.id} className="font-criolla text-2xl text-naranja">
            {t.nombre}
          </p>
        ))}
        {clasico && (
          <p className="font-criolla text-2xl text-[#fde68a]">🔥 {clasico}</p>
        )}
        <p className="mt-4 text-sm text-crema/70">Tocá para seguir</p>
      </motion.div>
    </motion.div>
  );
}
