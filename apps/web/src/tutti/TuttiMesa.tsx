import { bajadaRival, rasgosRival, type Hecho } from "@juegos-argentinos/career";
import { aplicarPropias, cargarLexico, reintentarReportes, reportarPalabra } from "./palabras.ts";
import { Cara } from "../carrera/Cara.tsx";
import {
  ALFABETO,
  esValidaAuto,
  MESA,
  planTutti,
  puedeBasta,
  tuttiFrutti,
  votosTutti,
  type TuttiAction,
  type TuttiConfig,
  type TuttiEvent,
  type TuttiRoundResult,
  type TuttiState,
  type TuttiView,
} from "@juegos-argentinos/engine/tutti-frutti";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { gameInfo } from "../games.ts";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_ID, HUMAN_SEAT, type Jugador } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import { momentosTutti } from "../partidas/momentos.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { useLotes } from "../partidas/useBotMatch.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { IconButton } from "../ui/ui.tsx";

type TMatch = BotMatch<TuttiConfig, TuttiState>;
const RULETA_MS = 2200;


/** La personalidad del rival de la gira (solo el asiento 1 en una partida de la carrera). */
function rasgosDe(m: { carrera?: { rivalId: string } }, seat: number) {
  return m.carrera && seat === 1 ? rasgosRival(m.carrera.rivalId) : undefined;
}

export function TuttiMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: TMatch | null; n: number }>(() => ({ m: loadBotMatch<TuttiConfig, TuttiState>("tutti-frutti", (x) => Array.isArray(x.state?.respuestas)), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida de tutti-frutti en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "tutti-setup" })}>
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

export function TuttiMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

function Mesa({ initial, onRevancha, remoto }: { initial: TMatch | null; onRevancha?: (m: TMatch) => void; remoto?: Remoto }) {
  const { back } = useNav();
  const { save, update } = useSave();
  // El diccionario grande ("Cosa") se baja una vez; las palabras reportadas valen en este dispositivo.
  useEffect(() => {
    void cargarLexico();
    reintentarReportes(save, update);
    // Solo al entrar a la mesa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => aplicarPropias(save.reportadas), [save.reportadas]);
  const cerrar = useCerrarPartida();
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  const yo = remoto?.yo ?? HUMAN_SEAT;

  // Partida local (contra bots). Online no se usa.
  const [match, setMatch] = useState<TMatch | null>(initial);
  const ref = useRef(match);
  ref.current = match;
  const view: TuttiView = useMemo(() => (remoto ? (remoto.view as TuttiView) : tuttiFrutti.getPlayerView(match!.state, HUMAN_ID)), [remoto, match]);
  const jugadores: Jugador[] = remoto ? remoto.jugadores : match!.jugadores;

  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  // Si se retoma en el resumen de una ronda, se vuelve a mostrar.
  const enResumen = view.fase === "resultado";
  const [resumen, setResumen] = useState<TuttiRoundResult | null>(enResumen ? (view.history.at(-1) ?? null) : null);
  const [pendiente, setPendiente] = useState(enResumen);
  const [reglas, setReglas] = useState(false);
  const [ruleta, setRuleta] = useState<string | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [bastaAt, setBastaAt] = useState<number | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [cartelBasta, setCartelBasta] = useState<string | null>(null);
  // Online: lo que voy escribiendo (no se espera al servidor para mostrarlo).
  const [borrador, setBorrador] = useState<string[]>(view.misRespuestas);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const nombre = useCallback((seat: number) => (seat === yo ? "Vos" : jugadores[seat]!.nombre), [yo, jugadores]);

  const escribiendo = (view.fase === "escribiendo" || view.fase === "basta") && ruleta === null && inicio !== null;

  /** Sonidos y carteles por evento (iguales en las dos modalidades). Devuelve hechos para logros. */
  const eventos = useCallback(
    (events: readonly TuttiEvent[]): Hecho[] => {
      const hechos: Hecho[] = [];
      for (const e of events) {
        if (e.type === "basta") {
          playSfx("basta");
          vibrate([60, 40, 60]);
          decir("¡Basta para mí, basta para todos!");
          setBastaAt(Date.now());
          setCartelBasta(e.seat === yo ? "¡BASTA!" : `¡BASTA! — ${nombre(e.seat)}`);
          window.setTimeout(() => setCartelBasta(null), 1400);
        }
        if (e.type === "cierre") {
          setBastaAt(null);
          setInicio(null);
          playSfx("turno");
        }
        if (e.type === "fin-ronda") {
          const r = e.result;
          if (r.estados[yo]!.every((x) => x === "valida")) hechos.push({ tipo: "tutti-pleno" });
          const solos = r.puntos[yo]!.filter((p) => p === 20).length;
          if (solos > 0) hechos.push({ tipo: "tutti-solo", cantidad: solos });
          setPendiente(true);
          window.setTimeout(() => setResumen(r), 500);
        }
      }
      return hechos;
    },
    [nombre, yo],
  );
  useLotes(remoto?.lotes ?? [], (ev) => eventos(ev as TuttiEvent[]));

  const apply = useCallback(
    (id: string, action: TuttiAction): boolean => {
      if (remoto) {
        if (id === HUMAN_ID) remoto.jugar(action);
        return true;
      }
      const m = ref.current!;
      const res = tuttiFrutti.applyAction(m.state, id, action);
      if (!res.ok) return false;
      let next: TMatch = { ...m, state: res.state };
      const hechos = eventos(res.events);
      if (hechos.length) next = { ...next, hechos: [...next.hechos, ...hechos] };
      if (tuttiFrutti.isGameOver(res.state) && !next.contada) {
        next = { ...next, contada: true };
        ref.current = next;
        setMatch(next);
        clearBotMatch("tutti-frutti");
        const fin = res.state;
        const gane = fin.ganadores!.length === 1 && fin.ganadores![0] === HUMAN_SEAT;
        const mejorRival = Math.max(...fin.score.slice(1));
        const peor = Math.min(0, ...fin.history.map((h) => h.score[0]! - Math.max(...h.score.slice(1))));
        setFinal(
          cerrarRef.current({
            game: "tutti-frutti",
            ganada: gane,
            botSkill: Math.max(...next.skills.slice(1)),
            adaptativo: next.adaptativo,
            ...(next.carrera ? { rivalId: next.carrera.rivalId } : {}),
            remontada: gane && peor <= -60,
            paliza: gane && fin.score[0]! >= 1.5 * mejorRival,
            hechos: next.hechos,
          }),
        );
        return true;
      }
      ref.current = next;
      setMatch(next);
      saveBotMatch(next as never);
      return true;
    },
    [remoto, eventos],
  );

  // Ruleta al empezar cada ronda; después corre el reloj (online: cuando dice el servidor).
  const rondaAbierta = view.fase === "escribiendo" || view.fase === "basta" ? view.ronda : null;
  const escribirEnMs = remoto?.tutti ? Math.max(0, remoto.recibido + remoto.tutti.escribirEnMs - Date.now()) : RULETA_MS;
  useEffect(() => {
    if (rondaAbierta === null) return;
    setBorrador(view.misRespuestas);
    const espera = escribirEnMs;
    if (espera < 300) {
      // Retomando a mitad de ronda: sin ruleta.
      setRuleta(null);
      setInicio(Date.now());
      return;
    }
    setInicio(null);
    playSfx("ruleta");
    let i = 0;
    const libres = ALFABETO.filter((l) => !view.config.excluidas.includes(l));
    const giro = window.setInterval(() => setRuleta(libres[i++ % libres.length]!), 80);
    const para = window.setTimeout(
      () => {
        clearInterval(giro);
        setRuleta(view.letra);
        playSfx("turno");
        decir(`Con la ${view.letra}`);
      },
      Math.max(0, espera - 700),
    );
    const fin = window.setTimeout(() => {
      setRuleta(null);
      setInicio(Date.now());
      inputs.current.find((x) => x && !x.value)?.focus();
    }, espera);
    return () => {
      clearInterval(giro);
      clearTimeout(para);
      clearTimeout(fin);
    };
    // Solo al cambiar de ronda.
  }, [rondaAbierta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Contra la máquina: los bots escriben (y cantan basta si completan todo).
  useEffect(() => {
    if (remoto || inicio === null || rondaAbierta === null) return;
    const m = ref.current!;
    let rng = m.rng;
    const timers: number[] = [];
    m.state.players.forEach((id, seat) => {
      if (seat === HUMAN_SEAT) return;
      const [plan, r] = planTutti(tuttiFrutti.getPlayerView(m.state, id), rng, m.skills[seat]!, rasgosDe(m, seat));
      rng = r;
      for (const paso of plan.pasos) {
        if (m.state.respuestas[seat]![paso.categoria]) continue;
        timers.push(
          window.setTimeout(() => {
            const st = ref.current!.state;
            if (st.ronda !== rondaAbierta || (st.fase !== "escribiendo" && st.fase !== "basta")) return;
            apply(id, { type: "escribir", categoria: paso.categoria, texto: plan.respuestas[paso.categoria]! });
            if (puedeBasta(ref.current!.state, seat)) apply(id, { type: "basta" });
          }, paso.ms),
        );
      }
    });
    ref.current = { ...ref.current!, rng };
    setMatch(ref.current);
    return () => timers.forEach(clearTimeout);
  }, [remoto, inicio, rondaAbierta, apply]);

  // Relojes: el de la ronda y la cuenta regresiva del basta.
  useEffect(() => {
    if (inicio === null) return;
    const t = window.setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(t);
  }, [inicio]);
  const cierreOnline = remoto?.tutti && remoto.tutti.cierreEnMs !== null ? remoto.recibido + remoto.tutti.cierreEnMs : null;
  const restante = remoto ? (cierreOnline === null ? 0 : (cierreOnline - ahora) / 1000) : inicio === null ? 0 : view.config.tiempoMaximo - (ahora - inicio) / 1000;
  const cuenta = remoto
    ? view.fase === "basta" && cierreOnline !== null
      ? Math.max(0, Math.ceil((cierreOnline - ahora) / 1000))
      : null
    : bastaAt === null
      ? null
      : Math.max(0, view.config.cuentaRegresiva - Math.floor((ahora - bastaAt) / 1000));
  useEffect(() => {
    if (!remoto && inicio !== null && restante <= 0) apply(MESA, { type: "cerrar" });
  }, [remoto, inicio, restante, apply]);
  useEffect(() => {
    if (cuenta === null) return;
    if (cuenta <= 0) {
      if (!remoto) apply(MESA, { type: "cerrar" });
    } else playSfx("tic");
  }, [cuenta, remoto, apply]);

  // Contra la máquina: en la revisión votan los bots; en el resultado ya están listos.
  useEffect(() => {
    if (remoto || view.fase !== "revision") return;
    const t = window.setTimeout(() => {
      let rng = ref.current!.rng;
      ref.current!.state.players.forEach((id, seat) => {
        if (seat === HUMAN_SEAT || ref.current!.state.fase !== "revision") return;
        const st = ref.current!.state;
        const [votos, r] = votosTutti(tuttiFrutti.getPlayerView(st, id), tuttiFrutti.getValidActions(st, id), rng, ref.current!.skills[seat]!, rasgosDe(ref.current!, seat));
        rng = r;
        for (const v of votos) apply(id, v);
      });
      ref.current = { ...ref.current!, rng };
      setMatch(ref.current);
    }, 1200);
    return () => clearTimeout(t);
  }, [remoto, view.fase, view.ronda, apply]);
  useEffect(() => {
    if (remoto || view.fase !== "resultado") return;
    ref.current!.state.players.forEach((id, seat) => {
      if (seat !== HUMAN_SEAT && !ref.current!.state.listos[seat]) apply(id, { type: "listo" });
    });
  }, [remoto, view.fase, view.ronda, apply]);

  const respuestas = remoto ? borrador : view.misRespuestas;
  const escribir = (c: number, texto: string) => {
    if (remoto) setBorrador((b) => b.map((x, i) => (i === c ? texto : x)));
    apply(HUMAN_ID, { type: "escribir", categoria: c, texto });
  };
  const puedo = escribiendo && view.fase === "escribiendo" && respuestas.length === view.config.categorias.length && respuestas.every((r) => esValidaAuto(r, view.letra));
  const basta = () => {
    if (!puedo || !apply(HUMAN_ID, { type: "basta" })) return;
    if (!remoto && inicio !== null) {
      const segundos = Math.round((Date.now() - inicio) / 1000);
      ref.current = { ...ref.current!, hechos: [...ref.current!.hechos, { tipo: "tutti-basta", segundos }] };
      setMatch(ref.current);
      saveBotMatch(ref.current as never);
    }
  };

  const revancha = () => {
    const m0 = ref.current!;
    const skill = m0.adaptativo ? skillForRating(statsDe(save, "tutti-frutti").rating) : m0.skills[1]!;
    const rival = m0.carrera ? { id: m0.carrera.rivalId, jugador: m0.jugadores[1]!, skill: m0.skills[1]! } : undefined;
    const m = newBotMatch(tuttiFrutti, { config: m0.config, players: m0.config.players, botSkill: skill, adaptativo: m0.adaptativo, yo: m0.jugadores[0]!, ...(rival ? { rival } : {}) });
    saveBotMatch(m as never);
    playSfx("barajar");
    onRevancha?.(m);
  };

  const verFin = !resumen && !pendiente;
  const totalRondas = view.config.fin.tipo === "rondas" ? view.config.fin.rondas : null;
  const carrera = match?.carrera;
  const marcador = view.score.map((p, i) => `${nombre(i)} ${p}`).join(" · ");
  const empate = !!view.ganadores && view.ganadores.length > 1 && view.ganadores.includes(yo);

  return (
    <div className="pano flex h-dvh flex-col overflow-hidden">
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Tutti-Frutti</p>
          <p className="text-xs font-bold text-crema/80">
            Ronda {view.ronda}
            {totalRondas ? ` de ${totalRondas}` : ` · a ${view.config.fin.tipo === "puntos" ? view.config.fin.puntos : ""} puntos`}
            {carrera ? ` · ${bajadaRival(carrera.rivalId)}` : ""}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex items-center gap-3 px-3 pt-2">
        <motion.div key={view.letra} initial={{ rotate: -90, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} className="bronce grid size-16 shrink-0 place-items-center rounded-full font-criolla text-4xl text-tinta" aria-label={`Letra ${ruleta === null ? view.letra : "sorteándose"}`}>
          <span className="relative z-[1]">{ruleta ?? view.letra}</span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span>{cuenta !== null ? `¡BASTA! Cierra en ${cuenta}…` : escribiendo ? "Completá con la letra" : ruleta !== null ? "Sorteando…" : view.fase === "revision" ? "Revisión" : "Esperando…"}</span>
            <span className={restante < 15 && escribiendo ? "text-red-300" : ""}>{escribiendo ? mmss(restante) : ""}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
            <div className={`h-full rounded-full transition-[width] duration-200 ${cuenta !== null ? "bg-red-500" : "bg-naranja"}`} style={{ width: `${escribiendo ? Math.max(0, (100 * restante) / view.config.tiempoMaximo) : 0}%` }} />
          </div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto text-[11px] font-bold">
            {view.players.map((p) => (
              <span key={p.seat} className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 ${p.seat === yo ? "bg-pano" : "bg-black/35"}`}>
                <span aria-hidden className="relative grid size-5 place-items-center overflow-hidden rounded-full">
                  <Cara avatar={jugadores[p.seat]!.avatar} rivalId={carrera && p.seat === 1 ? carrera.rivalId : undefined} />
                </span>
                {nombre(p.seat)} {p.seat === yo ? respuestas.filter((r) => r.trim()).length : p.llenas}/{view.config.categorias.length} · <span className="text-naranja">{view.score[p.seat]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
        <div className="flex flex-col gap-2">
          {view.config.categorias.map((cat, c) => {
            const texto = respuestas[c] ?? "";
            const ok = texto.trim() !== "" && esValidaAuto(texto, view.letra);
            const mal = texto.trim() !== "" && !ok;
            return (
              <label key={cat} className="cuero flex items-center gap-2 rounded-2xl px-3 py-1.5">
                <span className="relative z-[1] w-24 shrink-0 text-sm font-black leading-tight">{cat}</span>
                <input
                  ref={(el) => {
                    inputs.current[c] = el;
                  }}
                  value={texto}
                  disabled={!escribiendo}
                  onChange={(e) => escribir(c, e.target.value.slice(0, 40))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const sig = inputs.current.slice(c + 1).find((x) => x && !x.value) ?? inputs.current.find((x) => x && !x.value);
                      if (sig) sig.focus();
                      else if (puedo) basta();
                    }
                  }}
                  autoCapitalize="words"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder={escribiendo ? `${view.letra}…` : ""}
                  aria-label={`${cat} con ${escribiendo ? view.letra : "la letra"}`}
                  aria-invalid={mal}
                  className={`relative z-[1] min-h-11 min-w-0 flex-1 rounded-xl bg-crema px-3 text-base font-bold text-tinta placeholder:text-tinta/40 disabled:opacity-70 ${mal ? "ring-2 ring-red-500" : ok ? "ring-2 ring-emerald-500" : ""}`}
                />
                <span className="relative z-[1] w-5 text-center" aria-hidden>
                  {ok ? "✔" : mal ? "✗" : ""}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="cuero cuero-oscuro z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <button onClick={basta} disabled={!puedo} className="btn-criollo relative z-[1] min-h-14 w-full rounded-2xl font-criolla text-2xl disabled:opacity-50">
          <span className="relative z-[1]">{ruleta !== null ? "Sorteando la letra…" : view.fase === "basta" ? `Cierra en ${cuenta ?? ""}…` : puedo ? "¡BASTA!" : escribiendo ? `Completá todo con ${view.letra}` : "Esperando…"}</span>
        </button>
      </div>

      <AnimatePresence>
        {ruleta !== null && (
          <motion.div key="ruleta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center bg-black/70">
            <div className="text-center">
              <p className="mb-4 font-criolla text-2xl">Ronda {view.ronda}: ¿con qué letra?</p>
              <motion.div animate={{ rotate: ruleta === view.letra ? 0 : [0, 360] }} transition={{ repeat: ruleta === view.letra ? 0 : Infinity, duration: 0.6, ease: "linear" }} className="bronce mx-auto grid size-40 place-items-center rounded-full">
                <span className="relative z-[1] font-criolla text-8xl text-tinta">{ruleta}</span>
              </motion.div>
            </div>
          </motion.div>
        )}
        {cartelBasta && (
          <motion.div key="basta" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-1/3 z-40 text-center">
            <p className="titulo-criollo text-6xl drop-shadow-lg">{cartelBasta}</p>
          </motion.div>
        )}
        {view.fase === "revision" && <Revision key="revision" view={view} yo={yo} nombre={nombre} onVotar={(a) => apply(HUMAN_ID, a)} onListo={() => apply(HUMAN_ID, { type: "listo" })} />}
        {resumen && (
          <Modal key="resumen" onClose={() => {}} grande>
            <Resumen
              r={resumen}
              categorias={view.config.categorias}
              nombre={nombre}
              yo={yo}
              reportada={(categoria, palabra) => save.reportadas.some((x) => x.categoria === categoria && x.palabra.toLowerCase() === palabra.trim().toLowerCase())}
              onReportar={(categoria, palabra) => {
                playSfx("click");
                reportarPalabra(update, { categoria, palabra, letra: resumen.letra });
              }}
            />
            <button
              className="btn-criollo mt-4 min-h-14 w-full rounded-2xl font-criolla text-xl"
              onClick={() => {
                setResumen(null);
                setPendiente(false);
                if (view.fase === "resultado") apply(HUMAN_ID, { type: "listo" });
              }}
            >
              <span className="relative z-[1]">{view.fase === "fin" ? "Ver resultado" : "Siguiente ronda"}</span>
            </button>
          </Modal>
        )}
        {remoto && verFin && view.fase === "fin" && remoto.fin({ gane: view.ganadores?.length === 1 && view.ganadores[0] === yo, empate, marcador, momentos: momentosTutti(view.history, yo) })}
        {!remoto && verFin && final && (
          <FinPartida
            key="fin"
            r={final}
            marcador={marcador}
            momentos={momentosTutti(view.history, yo)}
            {...(empate ? { titulo: "¡Empate!" } : {})}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={carrera ? "Volver a la gira" : "Volver al menú"}
          />
        )}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)} grande>
            <h2 className="titulo-criollo mb-3 text-center text-3xl">Cómo se juega</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
              {gameInfo("tutti-frutti").reglas.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>
                En esta partida: {mmss(view.config.tiempoMaximo)} por ronda, {view.config.cuentaRegresiva} segundos después del ¡BASTA!
                {view.config.votacion ? ", y las dudosas se votan." : "."}
              </li>
              <li>
                Las respuestas se controlan con un diccionario argentino: con una falta de ortografía te la perdonamos; con dos, no vale. Los apellidos y las marcas que no conoce
                valen igual (salen como dudosas). Si te rechaza una que está bien, reportala: desde ese momento vale en este dispositivo y nos llega para corregirla.
              </li>
            </ol>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const COLOR_PUNTOS: Record<number, string> = { 0: "bg-black/40 text-crema/60", 5: "bg-amber-700", 10: "bg-pano", 20: "bg-naranja text-tinta" };

function Resumen({
  r,
  categorias,
  nombre,
  yo,
  reportada,
  onReportar,
}: {
  r: TuttiRoundResult;
  categorias: string[];
  nombre: (s: number) => string;
  yo: number;
  reportada: (categoria: string, palabra: string) => boolean;
  onReportar: (categoria: string, palabra: string) => void;
}) {
  return (
    <>
      <h2 className="titulo-criollo text-center text-3xl">
        Ronda {r.ronda} · {r.letra}
      </h2>
      <p className="mb-2 text-center text-xs text-crema/75">{r.bastaPor !== null ? `Cantó ¡BASTA! ${nombre(r.bastaPor)}` : "Se terminó el tiempo"}</p>
      <div className="max-h-[52dvh] overflow-y-auto pr-1">
        {categorias.map((cat, c) => (
          <div key={cat} className="border-t border-crema/10 py-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-crema/70">{cat}</p>
            <div className="flex flex-col gap-0.5">
              {r.respuestas.map((rs, p) => {
                const estado = r.estados[p]![c];
                const correccion = r.correcciones?.[p]?.[c] ?? null;
                const palabra = rs[c]?.trim() ?? "";
                // Se puede reportar una propia que la máquina no aceptó o no conoce (para que se corrija el diccionario).
                const reportable = p === yo && palabra !== "" && (estado === "desconocida" || (estado === "valida" && r.dudosas[p]![c]));
                return (
                  <div key={p} className="flex flex-col py-0.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 shrink-0 truncate text-xs text-crema/70">{nombre(p)}</span>
                      <span className={`min-w-0 flex-1 truncate font-bold ${estado === "valida" ? "" : "text-crema/45 line-through"}`}>
                        {palabra || "—"}
                        {r.dudosas[p]![c] && estado === "valida" && (
                          <span className="ml-1 text-xs no-underline" title="La máquina no la conoce">
                            🤔
                          </span>
                        )}
                        {estado === "rechazada" && <span className="ml-1 text-xs">(rechazada)</span>}
                      </span>
                      {reportable &&
                        (reportada(categorias[c]!, palabra) ? (
                          <span className="shrink-0 text-[11px] font-bold text-crema/70">Reportada ✓</span>
                        ) : (
                          <button onClick={() => onReportar(categorias[c]!, palabra)} className="boton boton-fantasma min-h-8 shrink-0 rounded-lg px-2 text-[11px]">
                            🚩 Reportar
                          </button>
                        ))}
                      <span className={`shrink-0 rounded-full px-2 text-xs font-black ${COLOR_PUNTOS[r.puntos[p]![c]!] ?? ""}`}>+{r.puntos[p]![c]}</span>
                    </div>
                    {estado === "desconocida" && <span className="pl-[4.5rem] text-[11px] text-red-300">No está en el diccionario{reportable ? ": si es válida, reportala" : ""}</span>}
                    {estado === "valida" && correccion && <span className="pl-[4.5rem] text-[11px] text-[#9be37a]">✏️ Con una falta, vale: se escribe “{correccion}”</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 border-t-2 border-crema/30 pt-2 text-sm font-black">
        {r.total.map((t, p) => (
          <span key={p} className="rounded-full bg-black/35 px-3 py-1">
            {nombre(p)}: +{t} → <span className="text-naranja">{r.score[p]}</span>
          </span>
        ))}
      </div>
    </>
  );
}

function Revision({ view, yo, nombre, onVotar, onListo }: { view: TuttiView; yo: number; nombre: (s: number) => string; onVotar: (a: TuttiAction) => void; onListo: () => void }) {
  const rev = view.revision;
  if (!rev) return null;
  const listo = view.players[yo]!.listo;
  return (
    <Modal onClose={() => {}} grande>
      <h2 className="titulo-criollo text-center text-3xl">Revisión · {view.letra}</h2>
      <p className="mb-2 text-center text-xs text-crema/75">Tocá las que te parecen truchas. Se rechazan por mayoría (el empate se acepta).</p>
      <div className="max-h-[52dvh] overflow-y-auto pr-1">
        {view.config.categorias.map((cat, c) => (
          <div key={cat} className="border-t border-crema/10 py-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-crema/70">{cat}</p>
            {rev.respuestas.map((rs, p) => {
              if (rev.estados[p]![c] !== "valida") return null;
              const votos = rev.rechazos[`${p}-${c}`] ?? [];
              const mio = votos.includes(yo);
              return (
                <div key={p} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 truncate text-xs text-crema/70">{nombre(p)}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {rs[c]} {rev.dudosas[p]![c] && <span title="La máquina no la conoce">🤔</span>}
                  </span>
                  {votos.length > 0 && <span className="text-xs text-red-300">👎{votos.length}</span>}
                  {p !== yo && (
                    <button
                      disabled={listo}
                      onClick={() => onVotar({ type: "votar", autor: p, categoria: c, rechazar: !mio })}
                      aria-pressed={mio}
                      className={`min-h-9 shrink-0 rounded-lg px-2 text-xs font-black ${mio ? "bg-red-600" : "bg-black/40"}`}
                    >
                      {mio ? "Rechazada" : "Rechazar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <button disabled={listo} className="btn-criollo mt-4 min-h-14 w-full rounded-2xl font-criolla text-xl disabled:opacity-60" onClick={onListo}>
        <span className="relative z-[1]">{listo ? "Esperando a los demás…" : "Listo"}</span>
      </button>
    </Modal>
  );
}
