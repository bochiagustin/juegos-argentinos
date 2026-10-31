import type { GameId } from "@juegos-argentinos/engine";
import { Cara } from "../carrera/Cara.tsx";
import { REACCIONES, SENAS, type ClienteMsg, type SalaInfo } from "@juegos-argentinos/server/protocolo";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { CasitaMesaOnline } from "../casita/CasitaMesa.tsx";
import { ChinchonMesaOnline } from "../chinchon/ChinchonMesa.tsx";
import { EscobaMesaOnline } from "../escoba/EscobaMesa.tsx";
import { GeneralaMesaOnline } from "../generala/GeneralaMesa.tsx";
import { GAMES, gameInfo } from "../games.ts";
import { useNav } from "../nav.tsx";
import { Momentos, useArmado } from "../partidas/FinPartida.tsx";
import type { Remoto } from "../partidas/remoto.ts";
import { AVATARES, sanitizeApodo } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { TrucoMesaOnline } from "../truco/TrucoMesa.tsx";
import { TuttiMesaOnline } from "../tutti/TuttiMesa.tsx";
import { Modal } from "../ui/Modal.tsx";
import { BigButton, Screen, Section, Segmented, Toggle } from "../ui/ui.tsx";
import { ConexionSala, type Burbuja, type SnapshotSala } from "./conexion.ts";

const VACIO: SnapshotSala = { conexion: "conectando", sala: null, juego: null, lotes: [], mensajes: [], error: null };
const sinStore = { subscribe: () => () => {}, getSnapshot: () => VACIO };

export const SENA_TEXTO: Record<(typeof SENAS)[number], string> = {
  "ancho-espada": "😉 Ancho de espada",
  "ancho-basto": "😏 Ancho de basto",
  "siete-espada": "👄 Siete de espada",
  "siete-oro": "😮 Siete de oro",
  tres: "😬 Un tres",
  dos: "🤨 Un dos",
  nada: "😑 No tengo nada",
  flor: "🌸 Tengo flor",
  envido: "🤌 Tengo envido",
};

/** Una sala online: lobby, partida, chat y fin con revancha. */
export function Sala({ codigo, game }: { codigo: string; game?: GameId | undefined }) {
  const { save } = useSave();
  // Si entra por un link de invitación sin haber elegido apodo, primero se presenta.
  if (!save.perfil.creado) return <Presentarse codigo={codigo} />;
  return <SalaConectada codigo={codigo} game={game} />;
}

function Presentarse({ codigo }: { codigo: string }) {
  const { back } = useNav();
  const { update } = useSave();
  const [apodo, setApodo] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARES[0]);
  const ok = sanitizeApodo(apodo).length > 0;
  return (
    <Screen title={`Sala ${codigo}`} onBack={back}>
      <p className="mb-3 text-lg font-bold">¡Hola! Antes de sentarte a la mesa: ¿cómo te dicen?</p>
      <input value={apodo} onChange={(e) => setApodo(e.target.value.slice(0, 16))} aria-label="Apodo" placeholder="Tu apodo" className="mb-3 min-h-12 w-full rounded-xl bg-crema px-3 text-lg font-bold text-tinta placeholder:text-tinta/40" />
      <div className="mb-4 grid grid-cols-8 gap-1.5">
        {AVATARES.map((a) => (
          <button key={a} aria-pressed={a === avatar} onClick={() => setAvatar(a)} className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl text-2xl ${a === avatar ? "bg-naranja ring-2 ring-naranja" : "bg-black/30"}`}>
            <Cara avatar={a} className="absolute inset-0 size-full object-cover" />
          </button>
        ))}
      </div>
      <BigButton disabled={!ok} onClick={() => update((s) => ({ ...s, perfil: { apodo: sanitizeApodo(apodo), avatar, creado: true } }))}>
        Entrar a la sala
      </BigButton>
    </Screen>
  );
}

function SalaConectada({ codigo, game }: { codigo: string; game?: GameId | undefined }) {
  const { back } = useNav();
  const { save } = useSave();
  const [con, setCon] = useState<ConexionSala | null>(null);
  useEffect(() => {
    const c = new ConexionSala(codigo, { apodo: save.perfil.apodo || "Sin nombre", avatar: save.perfil.avatar }, (sala, enviar) => {
      // El que arma la sala desde la ficha de un juego ya lo deja elegido.
      if (game && sala.soyHost && sala.estado === "lobby" && sala.jugadores.length === 1) enviar({ t: "juego", game });
    });
    setCon(c);
    return () => c.cerrar();
    // La conexión vive lo que vive la pantalla.
  }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mientras estás en la sala, la URL la nombra: si recargás la página, volvés a entrar (y recuperás tu lugar).
  useEffect(() => {
    try {
      history.replaceState(history.state, "", `${location.pathname}?sala=${codigo}`);
    } catch {
      // Visores sin historial.
    }
    return () => {
      try {
        history.replaceState(history.state, "", location.pathname);
      } catch {
        // nada
      }
    };
  }, [codigo]);
  const store = con ?? sinStore;
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const enviar = (m: ClienteMsg) => con?.enviar(m);

  // Cada partida nueva (revancha) remonta la mesa desde cero.
  const [partidaN, setPartidaN] = useState(0);
  const estadoAnterior = useRef(snap.sala?.estado);
  useEffect(() => {
    if (snap.sala?.estado === "jugando" && estadoAnterior.current !== "jugando") setPartidaN((n) => n + 1);
    estadoAnterior.current = snap.sala?.estado;
  }, [snap.sala?.estado]);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!snap.error) return;
    setError(snap.error.texto);
    playSfx("error");
    const t = window.setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [snap.error]);

  const sala = snap.sala;
  const juego = snap.juego;
  const jugadores = useMemo(() => sala?.jugadores.map((j) => ({ nombre: j.apodo, avatar: j.avatar })) ?? [], [sala?.jugadores]);

  let cuerpo: ReactNode;
  if (snap.conexion === "sin-servidor") {
    cuerpo = (
      <Screen title={`Sala ${codigo}`} onBack={back}>
        <p className="cuero cuero-rojo rounded-2xl p-4 font-semibold">
          <span className="relative z-[1]">No hay servidor de salas configurado. Cargalo en Ajustes → Online.</span>
        </p>
      </Screen>
    );
  } else if (!sala || sala.tuSeat < 0) {
    cuerpo = (
      <Screen title={`Sala ${codigo}`} onBack={back}>
        <div className="grid place-items-center gap-3 py-16 text-center">
          <motion.span className="text-5xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} aria-hidden>
            🧉
          </motion.span>
          <p className="font-bold">{error ?? (snap.conexion === "reconectando" ? "Se cortó: reconectando…" : `Entrando a la sala ${codigo}…`)}</p>
        </div>
      </Screen>
    );
  } else if (sala.estado === "lobby" || !juego) {
    cuerpo = <Lobby sala={sala} enviar={enviar} />;
  } else {
    const remoto: Remoto = {
      game: juego.game,
      yo: sala.tuSeat,
      jugadores,
      view: juego.view,
      valid: juego.valid,
      lotes: snap.lotes,
      turno: juego.turno,
      tutti: juego.tutti,
      recibido: juego.recibido,
      terminado: juego.terminado,
      jugar: (action) => enviar({ t: "accion", action }),
      fin: (r) => <FinOnline key="fin-online" r={r} sala={sala} enviar={enviar} onSalir={back} />,
    };
    cuerpo = (
      <div key={partidaN}>
        <MesaOnline remoto={remoto} />
        <RelojTurno sala={sala} snap={snap} />
      </div>
    );
  }

  return (
    <>
      {cuerpo}
      {sala && sala.tuSeat >= 0 && <ChatSala sala={sala} mensajes={snap.mensajes} enviar={enviar} />}
      {snap.conexion === "reconectando" && sala && (
        <div className="fixed inset-x-0 top-0 z-50 bg-bordo py-1 text-center text-xs font-black" role="status">
          Se cortó la conexión. Reconectando…
        </div>
      )}
      <AnimatePresence>
        {error && sala && (
          <motion.div key="error" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-4 bottom-28 z-50 rounded-2xl bg-bordo px-4 py-3 text-center text-sm font-bold shadow-xl" role="alert">
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MesaOnline({ remoto }: { remoto: Remoto }) {
  switch (remoto.game) {
    case "truco":
      return <TrucoMesaOnline remoto={remoto} />;
    case "chinchon":
      return <ChinchonMesaOnline remoto={remoto} />;
    case "casita-robada":
      return <CasitaMesaOnline remoto={remoto} />;
    case "escoba":
      return <EscobaMesaOnline remoto={remoto} />;
    case "tutti-frutti":
      return <TuttiMesaOnline remoto={remoto} />;
    case "generala":
      return <GeneralaMesaOnline remoto={remoto} />;
    case "chancho":
      return null;
  }
}

/** Cuánto tiempo te queda para jugar (al vencer, juega la máquina por vos). */
function RelojTurno({ sala, snap }: { sala: SalaInfo; snap: SnapshotSala }) {
  const [ahora, setAhora] = useState(Date.now());
  const t = snap.juego?.turno;
  useEffect(() => {
    if (!t) return;
    const i = window.setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(i);
  }, [t]);
  if (!t || !snap.juego || t.seat !== sala.tuSeat) return null;
  const s = Math.max(0, Math.ceil((snap.juego.recibido + t.restanteMs - ahora) / 1000));
  return (
    <div className={`pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+4.7rem)] z-30 rounded-full px-3 py-1 text-xs font-black shadow-lg ${s <= 10 ? "bg-red-600" : "bg-black/60"}`} role="timer" aria-live="off">
      ⏱ {s} s{s <= 10 ? " · ¡jugá o juega la máquina por vos!" : ""}
    </div>
  );
}

function FinOnline({ r, sala, enviar, onSalir }: { r: { gane: boolean; empate: boolean; marcador: string; momentos?: readonly string[] }; sala: SalaInfo; enviar: (m: ClienteMsg) => void; onSalir: () => void }) {
  const yo = sala.jugadores[sala.tuSeat];
  const pedi = yo?.revancha ?? false;
  const armado = useArmado();
  useEffect(() => {
    playSfx(r.gane ? "ganar" : "error");
  }, [r.gane]);
  const humanos = sala.jugadores.filter((j) => !j.bot);
  return (
    <Modal onClose={() => {}}>
      <motion.h2 initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: -3 }} className="titulo-criollo mb-2 text-center text-5xl">
        {r.empate ? "¡Empate!" : r.gane ? "¡Ganaste!" : "Perdiste…"}
      </motion.h2>
      <p className="mb-3 text-center text-lg font-bold">{r.marcador}</p>
      <Momentos lista={r.momentos ?? []} />
      {sala.estado === "fin" && (
        <>
          <ul className="mb-3 flex flex-wrap justify-center gap-1.5 text-xs font-bold">
            {humanos.map((j) => (
              <li key={j.seat} className={`rounded-full px-2 py-1 ${j.revancha ? "bg-pano" : "bg-black/35"}`}>
                <span className="relative mr-1 inline-grid size-5 place-items-center overflow-hidden rounded-full align-middle">
                  <Cara avatar={j.avatar} />
                </span>
                {j.apodo} {j.revancha ? "✔" : j.conectado ? "⏳" : "(se fue)"}
              </li>
            ))}
          </ul>
          <button disabled={pedi || !armado} className="btn-criollo mb-2 min-h-14 w-full rounded-2xl font-criolla text-2xl disabled:opacity-60" onClick={() => enviar({ t: "revancha" })}>
            <span className="relative z-[1]">{pedi ? "Esperando a los demás…" : "¡Revancha!"}</span>
          </button>
          {sala.soyHost && (
            <button disabled={!armado} className="boton boton-cuero mb-2 min-h-12 w-full rounded-2xl" onClick={() => enviar({ t: "a-la-sala" })}>
              Cambiar de juego o de mesa
            </button>
          )}
        </>
      )}
      <button disabled={!armado} className="boton boton-fantasma min-h-12 w-full rounded-2xl" onClick={onSalir}>
        Salir de la sala
      </button>
    </Modal>
  );
}

// ───────────────────────────── lobby ─────────────────────────────

function Lobby({ sala, enviar }: { sala: SalaInfo; enviar: (m: ClienteMsg) => void }) {
  const { back } = useNav();
  const [nivelBot, setNivelBot] = useState(5);
  const [copiado, setCopiado] = useState(false);
  const info = gameInfo(sala.game);
  const n = sala.jugadores.length;
  const ok = sala.cantidades.includes(n);
  const link = `${location.origin}${location.pathname}?sala=${sala.codigo}`;
  const texto = `¡Vení a jugar al ${info.nombre} conmigo en Juegos Argentinos! Código de sala: ${sala.codigo} → ${link}`;
  const host = sala.jugadores.find((j) => j.host);
  const config = sala.config as Record<string, unknown>;
  const setConfig = (k: string, v: unknown) => enviar({ t: "config", config: { ...config, [k]: v } });
  const equipos = (sala.game === "truco" && n >= 4) || ((sala.game === "escoba" || sala.game === "casita-robada") && n === 4 && config.parejas === true);

  return (
    <Screen title={`Sala ${sala.codigo}`} onBack={back}>
      <div className="cuero cuero-mostaza mb-4 rounded-3xl p-4 text-center">
        <div className="relative z-[1]">
          <p className="text-xs font-black uppercase tracking-widest text-crema/80">Código de la sala</p>
          <p className="titulo-criollo my-1 text-5xl tracking-[0.25em]" aria-label={`Código ${sala.codigo.split("").join(" ")}`}>
            {sala.codigo}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className="boton boton-verde min-h-12 rounded-xl" onClick={() => playSfx("click")}>
              Invitar por WhatsApp
            </a>
            <button
              className="boton boton-cuero min-h-12 rounded-xl"
              onClick={async () => {
                try {
                  if (navigator.share) await navigator.share({ title: "Juegos Argentinos", text: texto, url: link });
                  else await navigator.clipboard.writeText(link);
                  setCopiado(true);
                  window.setTimeout(() => setCopiado(false), 2000);
                } catch {
                  // Compartir cancelado.
                }
              }}
            >
              {copiado ? "¡Listo!" : "Compartir link"}
            </button>
          </div>
        </div>
      </div>

      <Section title={`Jugadores (${n})`}>
        <ul className="flex flex-col gap-2">
          {sala.jugadores.map((j) => (
            <li key={`${j.seat}-${j.apodo}`} className="cuero flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2">
              <span className="relative z-[1] grid size-10 place-items-center overflow-hidden rounded-full bg-black/35 text-2xl" aria-hidden>
                <Cara avatar={j.avatar} />
              </span>
              <span className="relative z-[1] min-w-0 flex-1">
                <span className="block truncate font-black">
                  {j.apodo}
                  {j.seat === sala.tuSeat ? " (vos)" : ""}
                  {j.host ? " 👑" : ""}
                </span>
                <span className="block text-xs text-crema/75">
                  {j.bot ? `Máquina · nivel ${j.skill}` : j.conectado ? "Conectado" : "Desconectado"}
                  {equipos ? ` · Equipo ${j.seat % 2 === 0 ? "A" : "B"}` : ""}
                </span>
              </span>
              {sala.soyHost && (
                <span className="relative z-[1] flex gap-1">
                  <button aria-label={`Subir a ${j.apodo}`} disabled={j.seat === 0} onClick={() => enviar({ t: "mover", seat: j.seat, a: j.seat - 1 })} className="grid size-9 place-items-center rounded-lg bg-black/35 disabled:opacity-30">
                    ▲
                  </button>
                  <button aria-label={`Bajar a ${j.apodo}`} disabled={j.seat === n - 1} onClick={() => enviar({ t: "mover", seat: j.seat, a: j.seat + 1 })} className="grid size-9 place-items-center rounded-lg bg-black/35 disabled:opacity-30">
                    ▼
                  </button>
                  {j.seat !== sala.tuSeat && (
                    <button aria-label={`Sacar a ${j.apodo}`} onClick={() => enviar({ t: "sacar", seat: j.seat })} className="grid size-9 place-items-center rounded-lg bg-bordo">
                      ✕
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
        {equipos && <p className="px-1 text-xs text-crema/70">Los equipos se arman alternados en la mesa (1º, 3º y 5º contra 2º, 4º y 6º). Usá ▲▼ para acomodarlos.</p>}
        {sala.soyHost && n < 10 && (
          <div className="cuero flex items-center gap-3 rounded-2xl px-3 py-2">
            <label className="relative z-[1] flex-1 text-sm font-bold">
              Nivel {nivelBot}
              <input type="range" min={1} max={10} value={nivelBot} onChange={(e) => setNivelBot(Number(e.target.value))} className="w-full accent-naranja" aria-label="Nivel de la máquina a agregar" />
            </label>
            <button className="btn-criollo relative z-[1] min-h-12 rounded-xl px-4 font-black" onClick={() => enviar({ t: "bot", skill: nivelBot })}>
              <span className="relative z-[1]">+ Máquina</span>
            </button>
          </div>
        )}
      </Section>

      {sala.soyHost ? (
        <>
          <Section title="Juego">
            <div className="grid grid-cols-2 gap-2">
              {GAMES.map((g) => (
                <button key={g.id} onClick={() => enviar({ t: "juego", game: g.id })} aria-pressed={g.id === sala.game} className={`cuero min-h-12 rounded-xl px-2 font-black ${g.id === sala.game ? g.cuero : "opacity-70"}`}>
                  <span className="relative z-[1]">{g.nombre}</span>
                </button>
              ))}
            </div>
          </Section>
          <Section title="Reglas">
            <ConfigJuego game={sala.game} config={config} n={n} set={setConfig} />
            <Segmented
              label="Tiempo para jugar"
              value={String(sala.segundosPorTurno)}
              onChange={(v) => enviar({ t: "turno", segundos: Number(v) })}
              options={[
                { value: "20", label: "20 s" },
                { value: "30", label: "30 s" },
                { value: "45", label: "45 s" },
                { value: "90", label: "90 s" },
              ]}
            />
          </Section>
          <div className="mt-6">
            <BigButton disabled={!ok} onClick={() => enviar({ t: "empezar" })}>
              {ok ? "¡Empezar!" : `Hacen falta ${sala.cantidades.length > 4 ? `${sala.cantidades[0]} a ${sala.cantidades.at(-1)}` : sala.cantidades.join(", ")} jugadores`}
            </BigButton>
          </div>
        </>
      ) : (
        <div className="cuero mt-4 rounded-2xl p-4 text-center">
          <p className="relative z-[1] font-bold">
            Se juega al <span className="text-naranja">{info.nombre}</span>. Esperando que {host?.apodo ?? "el que armó la sala"} arranque…
          </p>
        </div>
      )}
    </Screen>
  );
}

function ConfigJuego({ game, config, n, set }: { game: GameId; config: Record<string, unknown>; n: number; set: (k: string, v: unknown) => void }) {
  switch (game) {
    case "truco":
      return (
        <>
          <Segmented label="Puntos" value={String(config.target)} onChange={(v) => set("target", Number(v))} options={[{ value: "15", label: "A 15" }, { value: "30", label: "A 30" }]} />
          <Toggle label="Con flor" checked={config.flor === true} onChange={(v) => set("flor", v)} />
        </>
      );
    case "chinchon":
      return (
        <>
          <Toggle label="Con comodines" checked={config.jokers === 2} onChange={(v) => set("jokers", v ? 2 : 0)} />
          <Segmented label="Se corta con" value={String(config.corteMax)} onChange={(v) => set("corteMax", Number(v))} options={[{ value: "5", label: "5 o menos" }, { value: "7", label: "7 o menos" }]} />
          <Toggle label="Reenganche" checked={config.reenganche === true} onChange={(v) => set("reenganche", v)} />
        </>
      );
    case "casita-robada":
      return (
        <>
          {n === 4 && <Toggle label="Por parejas" checked={config.parejas === true} onChange={(v) => set("parejas", v)} />}
          <Segmented label="Si hay varias iguales" value={String(config.levantar)} onChange={(v) => set("levantar", v)} options={[{ value: "una", label: "Levantás una" }, { value: "todas", label: "Todas" }]} />
        </>
      );
    case "escoba":
      return (
        <>
          {n === 4 && <Toggle label="Por parejas" checked={config.parejas === true} onChange={(v) => set("parejas", v)} />}
          <Segmented label="Puntos" value={String(config.target)} onChange={(v) => set("target", Number(v))} options={[{ value: "15", label: "A 15" }, { value: "21", label: "A 21" }, { value: "31", label: "A 31" }]} />
          <Toggle label="Levantar es obligatorio" checked={config.levantarObligatorio === true} onChange={(v) => set("levantarObligatorio", v)} />
        </>
      );
    case "generala":
    case "chancho":
      return null;
    case "tutti-frutti": {
      const fin = (config.fin ?? {}) as { tipo?: string; rondas?: number };
      return (
        <>
          <Segmented label="Rondas" value={String(fin.rondas ?? 5)} onChange={(v) => set("fin", { tipo: "rondas", rondas: Number(v) })} options={[{ value: "3", label: "3" }, { value: "5", label: "5" }, { value: "8", label: "8" }]} />
          <Segmented label="Tiempo por ronda" value={String(config.tiempoMaximo)} onChange={(v) => set("tiempoMaximo", Number(v))} options={[{ value: "90", label: "1:30" }, { value: "120", label: "2:00" }, { value: "150", label: "2:30" }, { value: "180", label: "3:00" }]} />
          <Toggle label="Votar las dudosas" detail="Se rechazan por mayoría" checked={config.votacion !== false} onChange={(v) => set("votacion", v)} />
        </>
      );
    }
  }
}

// ───────────────────────────── chat, reacciones y señas ─────────────────────────────

function ChatSala({ sala, mensajes, enviar }: { sala: SalaInfo; mensajes: Burbuja[]; enviar: (m: ClienteMsg) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [equipo, setEquipo] = useState(false);
  const [vistos, setVistos] = useState(mensajes.length ? mensajes.at(-1)!.id : 0);
  const [flotantes, setFlotantes] = useState<Burbuja[]>([]);
  const ultimo = useRef(mensajes.at(-1)?.id ?? 0);
  const nombre = (seat: number) => (seat === sala.tuSeat ? "Vos" : (sala.jugadores[seat]?.apodo ?? "Alguien"));
  const config = sala.config as { parejas?: boolean };
  const n = sala.jugadores.length;
  const hayEquipos = sala.estado !== "lobby" && ((sala.game === "truco" && n >= 4) || ((sala.game === "escoba" || sala.game === "casita-robada") && n === 4 && config.parejas === true));
  const senas = sala.estado === "jugando" && sala.game === "truco" && n >= 4;

  // Lo nuevo aparece flotando un ratito (reacciones, mensajes con el chat cerrado y señas).
  useEffect(() => {
    const nuevos = mensajes.filter((m) => m.id > ultimo.current);
    if (!nuevos.length) return;
    ultimo.current = nuevos.at(-1)!.id;
    const mostrar = nuevos.filter((m) => m.seat !== sala.tuSeat && (m.tipo !== "chat" || !abierto));
    if (!mostrar.length) return;
    if (mostrar.some((m) => m.tipo === "sena")) vibrate([20, 40, 20]);
    else playSfx("click");
    setFlotantes((f) => [...f, ...mostrar].slice(-4));
    const ids = new Set(mostrar.map((m) => m.id));
    window.setTimeout(() => setFlotantes((f) => f.filter((x) => !ids.has(x.id))), 3200);
  }, [mensajes, abierto, sala.tuSeat]);

  const sinLeer = mensajes.filter((m) => m.tipo === "chat" && m.id > vistos && m.seat !== sala.tuSeat).length;
  const mandar = () => {
    const t = texto.trim();
    if (!t) return;
    enviar({ t: "chat", texto: t, ...(hayEquipos && equipo ? { equipo: true } : {}) });
    setTexto("");
  };

  return (
    <>
      <button
        onClick={() => {
          setAbierto(true);
          setVistos(mensajes.at(-1)?.id ?? 0);
        }}
        aria-label={`Chat${sinLeer ? ` (${sinLeer} sin leer)` : ""}`}
        className="bronce fixed right-3 top-[calc(env(safe-area-inset-top)+4.4rem)] z-30 grid size-11 place-items-center rounded-full text-xl shadow-lg"
      >
        <span className="relative z-[1]">💬</span>
        {sinLeer > 0 && <span className="absolute -right-1 -top-1 z-[2] grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-black">{sinLeer}</span>}
      </button>

      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+7.5rem)] z-30 flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {flotantes.map((m) => (
            <motion.div key={m.id} initial={{ y: -20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm font-bold shadow-xl ${m.tipo === "sena" ? "bg-celeste text-tinta" : "bg-crema text-tinta"}`}>
              {m.tipo === "reaccion" ? (
                <span>
                  <span className="text-3xl">{m.texto}</span> {nombre(m.seat)}
                </span>
              ) : m.tipo === "sena" ? (
                `🤫 Seña de ${nombre(m.seat)}: ${SENA_TEXTO[m.texto as keyof typeof SENA_TEXTO] ?? m.texto}`
              ) : (
                `${m.equipo ? "🤝 " : ""}${nombre(m.seat)}: ${m.texto}`
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {abierto && (
          <Modal key="chat" onClose={() => setAbierto(false)} grande>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="titulo-criollo text-2xl">Charla</h2>
              <button className="min-h-10 rounded-xl bg-black/35 px-3 text-sm font-bold" onClick={() => setAbierto(false)}>
                Cerrar
              </button>
            </div>
            <div className="mb-2 flex flex-wrap justify-center gap-1.5">
              {REACCIONES.map((e) => (
                <button
                  key={e}
                  aria-label={`Reaccionar ${e}`}
                  onClick={() => {
                    enviar({ t: "reaccion", emoji: e });
                    setAbierto(false);
                  }}
                  className="grid size-11 place-items-center rounded-xl bg-black/30 text-2xl active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
            {senas && (
              <details className="mb-2 rounded-xl bg-celeste/15 p-2">
                <summary className="cursor-pointer text-sm font-black">🤫 Hacerle una seña a tu compañero</summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {SENAS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        enviar({ t: "sena", sena: s });
                        setAbierto(false);
                      }}
                      className="min-h-10 rounded-lg bg-black/30 px-2 text-left text-xs font-bold"
                    >
                      {SENA_TEXTO[s]}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <div className="mb-2 flex max-h-[38dvh] min-h-24 flex-col gap-1 overflow-y-auto rounded-xl bg-black/25 p-2 text-sm" aria-live="polite">
              {mensajes.filter((m) => m.tipo === "chat").length === 0 && <p className="text-center text-crema/60">Todavía nadie dijo nada.</p>}
              {mensajes
                .filter((m) => m.tipo !== "reaccion")
                .map((m) => (
                  <p key={m.id} className={m.seat === sala.tuSeat ? "text-right" : ""}>
                    <span className="text-xs font-black text-naranja">
                      {m.equipo ? "🤝 " : ""}
                      {nombre(m.seat)}:
                    </span>{" "}
                    {m.tipo === "sena" ? `🤫 ${SENA_TEXTO[m.texto as keyof typeof SENA_TEXTO] ?? m.texto}` : m.texto}
                  </p>
                ))}
            </div>
            {hayEquipos && <Toggle label="Solo a mi equipo" checked={equipo} onChange={setEquipo} />}
            <div className="mt-2 flex gap-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, 200))}
                onKeyDown={(e) => e.key === "Enter" && mandar()}
                placeholder="Escribí algo…"
                aria-label="Mensaje"
                className="min-h-12 min-w-0 flex-1 rounded-xl bg-crema px-3 text-tinta placeholder:text-tinta/40"
              />
              <button onClick={mandar} className="btn-criollo min-h-12 rounded-xl px-4 font-black">
                <span className="relative z-[1]">Mandar</span>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
