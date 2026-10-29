import { personaje, type Hecho } from "@juegos-argentinos/career";
import { ALFABETO, esValidaAuto, MESA, planTutti, puedeBasta, tuttiFrutti, votosTutti, type TuttiAction, type TuttiConfig, type TuttiEvent, type TuttiRoundResult, type TuttiState } from "@juegos-argentinos/engine/tutti-frutti";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSfx, vibrate } from "../audio/sfx.ts";
import { decir } from "../audio/voz.ts";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { gameInfo } from "../games.ts";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { HUMAN_ID, HUMAN_SEAT } from "../partidas/jugadores.ts";
import { clearBotMatch, loadBotMatch, newBotMatch, saveBotMatch, type BotMatch } from "../partidas/match.ts";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { Modal } from "../ui/Modal.tsx";
import { IconButton } from "../ui/ui.tsx";

type TMatch = BotMatch<TuttiConfig, TuttiState>;
const RULETA_MS = 2200;

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

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

function Mesa({ initial, onRevancha }: { initial: TMatch; onRevancha: (m: TMatch) => void }) {
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  const [match, setMatch] = useState(initial);
  const ref = useRef(match);
  ref.current = match;
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  // Si se retoma en el resumen de una ronda, se vuelve a mostrar.
  const enResumen = initial.state.fase === "resultado";
  const [resumen, setResumen] = useState<TuttiRoundResult | null>(enResumen ? (initial.state.history.at(-1) ?? null) : null);
  const [vistos, setVistos] = useState(initial.state.history.length - (enResumen ? 1 : 0));
  const [reglas, setReglas] = useState(false);
  const [ruleta, setRuleta] = useState<string | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [bastaAt, setBastaAt] = useState<number | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [cartelBasta, setCartelBasta] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const s = match.state;
  const view = useMemo(() => tuttiFrutti.getPlayerView(s, HUMAN_ID), [s]);
  const nombre = useCallback((seat: number) => (seat === HUMAN_SEAT ? "Vos" : ref.current.jugadores[seat]!.nombre), []);
  const escribiendo = (s.fase === "escribiendo" || s.fase === "basta") && ruleta === null && inicio !== null;

  const apply = useCallback(
    (id: string, action: TuttiAction): boolean => {
      const m = ref.current;
      const res = tuttiFrutti.applyAction(m.state, id, action);
      if (!res.ok) return false;
      let next: TMatch = { ...m, state: res.state };
      const hechos: Hecho[] = [];
      for (const e of res.events as TuttiEvent[]) {
        if (e.type === "basta") {
          playSfx("basta");
          vibrate([60, 40, 60]);
          decir("¡Basta para mí, basta para todos!");
          setBastaAt(Date.now());
          setCartelBasta(e.seat === HUMAN_SEAT ? "¡BASTA!" : `¡BASTA! — ${nombre(e.seat)}`);
          window.setTimeout(() => setCartelBasta(null), 1400);
        }
        if (e.type === "cierre") {
          setBastaAt(null);
          setInicio(null);
          playSfx("turno");
        }
        if (e.type === "fin-ronda") {
          const r = e.result;
          if (r.estados[HUMAN_SEAT]!.every((x) => x === "valida")) hechos.push({ tipo: "tutti-pleno" });
          const solos = r.puntos[HUMAN_SEAT]!.filter((p) => p === 20).length;
          if (solos > 0) hechos.push({ tipo: "tutti-solo", cantidad: solos });
          window.setTimeout(() => setResumen(r), 500);
        }
      }
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
    [nombre],
  );

  // Ruleta al empezar cada ronda; después corre el reloj.
  const rondaAbierta = s.fase === "escribiendo" || s.fase === "basta" ? s.ronda : null;
  useEffect(() => {
    if (rondaAbierta === null) return;
    setInicio(null);
    playSfx("ruleta");
    let i = 0;
    const libres = ALFABETO.filter((l) => !ref.current.state.config.excluidas.includes(l));
    const giro = window.setInterval(() => setRuleta(libres[i++ % libres.length]!), 80);
    const para = window.setTimeout(() => {
      clearInterval(giro);
      setRuleta(ref.current.state.letra);
      playSfx("turno");
      decir(`Con la ${ref.current.state.letra}`);
    }, RULETA_MS - 700);
    const fin = window.setTimeout(() => {
      setRuleta(null);
      setInicio(Date.now());
      inputs.current.find((x) => x && !x.value)?.focus();
    }, RULETA_MS);
    return () => {
      clearInterval(giro);
      clearTimeout(para);
      clearTimeout(fin);
    };
  }, [rondaAbierta]);

  // Los bots escriben (y cantan basta si completan todo).
  useEffect(() => {
    if (inicio === null || rondaAbierta === null) return;
    const m = ref.current;
    let rng = m.rng;
    const timers: number[] = [];
    m.state.players.forEach((id, seat) => {
      if (seat === HUMAN_SEAT) return;
      const [plan, r] = planTutti(tuttiFrutti.getPlayerView(m.state, id), rng, m.skills[seat]!);
      rng = r;
      for (const paso of plan.pasos) {
        if (m.state.respuestas[seat]![paso.categoria]) continue;
        timers.push(
          window.setTimeout(() => {
            const st = ref.current.state;
            if (st.ronda !== rondaAbierta || (st.fase !== "escribiendo" && st.fase !== "basta")) return;
            apply(id, { type: "escribir", categoria: paso.categoria, texto: plan.respuestas[paso.categoria]! });
            if (puedeBasta(ref.current.state, seat)) apply(id, { type: "basta" });
          }, paso.ms),
        );
      }
    });
    ref.current = { ...ref.current, rng };
    setMatch(ref.current);
    return () => timers.forEach(clearTimeout);
  }, [inicio, rondaAbierta, apply]);

  // Reloj de la ronda y cuenta regresiva del basta.
  useEffect(() => {
    if (inicio === null) return;
    const t = window.setInterval(() => setAhora(Date.now()), 200);
    return () => clearInterval(t);
  }, [inicio]);
  const transcurrido = inicio === null ? 0 : (ahora - inicio) / 1000;
  const restante = s.config.tiempoMaximo - transcurrido;
  const cuenta = bastaAt === null ? null : Math.max(0, s.config.cuentaRegresiva - Math.floor((ahora - bastaAt) / 1000));
  useEffect(() => {
    if (inicio !== null && restante <= 0) apply(MESA, { type: "cerrar" });
  }, [inicio, restante, apply]);
  useEffect(() => {
    if (cuenta === null) return;
    if (cuenta <= 0) apply(MESA, { type: "cerrar" });
    else playSfx("tic");
  }, [cuenta, apply]);

  // Revisión: los bots votan; en el resultado, los bots ya están listos.
  useEffect(() => {
    if (s.fase !== "revision") return;
    const t = window.setTimeout(() => {
      let m = ref.current;
      let rng = m.rng;
      m.state.players.forEach((id, seat) => {
        if (seat === HUMAN_SEAT || ref.current.state.fase !== "revision") return;
        const [votos, r] = votosTutti(tuttiFrutti.getPlayerView(ref.current.state, id), tuttiFrutti.getValidActions(ref.current.state, id), rng, m.skills[seat]!);
        rng = r;
        for (const v of votos) apply(id, v);
      });
      m = ref.current;
      ref.current = { ...m, rng };
      setMatch(ref.current);
    }, 1200);
    return () => clearTimeout(t);
  }, [s.fase, s.ronda, apply]);
  useEffect(() => {
    if (s.fase !== "resultado") return;
    s.players.forEach((id, seat) => {
      if (seat !== HUMAN_SEAT && !ref.current.state.listos[seat]) apply(id, { type: "listo" });
    });
  }, [s.fase, s.ronda, s.players, apply]);

  const escribir = (c: number, texto: string) => apply(HUMAN_ID, { type: "escribir", categoria: c, texto });
  const basta = () => {
    if (!apply(HUMAN_ID, { type: "basta" })) return;
    if (inicio !== null) {
      const segundos = Math.round((Date.now() - inicio) / 1000);
      ref.current = { ...ref.current, hechos: [...ref.current.hechos, { tipo: "tutti-basta", segundos }] };
      setMatch(ref.current);
      saveBotMatch(ref.current as never);
    }
  };
  const puedo = escribiendo && puedeBasta(s, HUMAN_SEAT);

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "tutti-frutti").rating) : match.skills[1]!;
    const rival = match.carrera ? { id: match.carrera.rivalId, jugador: match.jugadores[1]!, skill: match.skills[1]! } : undefined;
    const m = newBotMatch(tuttiFrutti, { config: match.config, players: match.config.players, botSkill: skill, adaptativo: match.adaptativo, yo: match.jugadores[0]!, ...(rival ? { rival } : {}) });
    saveBotMatch(m as never);
    playSfx("barajar");
    onRevancha(m);
  };

  const verFin = final !== null && !resumen && vistos >= s.history.length;
  const totalRondas = s.config.fin.tipo === "rondas" ? s.config.fin.rondas : null;

  return (
    <div className="pano flex h-dvh flex-col overflow-hidden">
      <header className="cuero cuero-oscuro z-20 flex items-center gap-2 rounded-b-2xl px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label="Salir (la partida queda guardada)" onClick={back}>
          ←
        </IconButton>
        <div className="relative z-[1] flex-1 text-center">
          <p className="titulo-criollo text-2xl leading-none">Tutti-Frutti</p>
          <p className="text-xs font-bold text-crema/80">
            Ronda {s.ronda}
            {totalRondas ? ` de ${totalRondas}` : ` · a ${s.config.fin.tipo === "puntos" ? s.config.fin.puntos : ""} puntos`}
            {match.carrera ? ` · ${personaje(match.carrera.rivalId).bajada}` : ""}
          </p>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="flex items-center gap-3 px-3 pt-2">
        <motion.div key={s.letra} initial={{ rotate: -90, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} className="bronce grid size-16 shrink-0 place-items-center rounded-full font-criolla text-4xl text-tinta" aria-label={`Letra ${s.letra}`}>
          <span className="relative z-[1]">{ruleta ?? s.letra}</span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span>{cuenta !== null ? `¡BASTA! Cierra en ${cuenta}…` : escribiendo ? "Completá con la letra" : ruleta !== null ? "Sorteando…" : s.fase === "revision" ? "Revisión" : "Esperando…"}</span>
            <span className={restante < 15 && escribiendo ? "text-red-300" : ""}>{escribiendo ? mmss(restante) : ""}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
            <div className={`h-full rounded-full transition-[width] duration-200 ${cuenta !== null ? "bg-red-500" : "bg-naranja"}`} style={{ width: `${escribiendo ? Math.max(0, (100 * restante) / s.config.tiempoMaximo) : 0}%` }} />
          </div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto text-[11px] font-bold">
            {view.players.map((p) => (
              <span key={p.seat} className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 ${p.seat === HUMAN_SEAT ? "bg-pano" : "bg-black/35"}`}>
                <span aria-hidden>{match.jugadores[p.seat]!.avatar}</span>
                {p.seat === HUMAN_SEAT ? "Vos" : match.jugadores[p.seat]!.nombre} {p.llenas}/{s.config.categorias.length} · <span className="text-naranja">{view.score[p.seat]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
        <div className="flex flex-col gap-2">
          {s.config.categorias.map((cat, c) => {
            const texto = view.misRespuestas[c] ?? "";
            const ok = texto.trim() !== "" && esValidaAuto(texto, s.letra);
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
                  placeholder={escribiendo ? `${s.letra}…` : ""}
                  aria-label={`${cat} con ${s.letra}`}
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
        <button
          onClick={basta}
          disabled={!puedo || s.fase !== "escribiendo"}
          className="btn-criollo relative z-[1] min-h-14 w-full rounded-2xl font-criolla text-2xl disabled:opacity-50"
        >
          <span className="relative z-[1]">{ruleta !== null ? "Sorteando la letra…" : s.fase === "basta" ? `Cierra en ${cuenta ?? ""}…` : puedo ? "¡BASTA!" : `Completá todo con ${s.letra}`}</span>
        </button>
      </div>

      <AnimatePresence>
        {ruleta !== null && (
          <motion.div key="ruleta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center bg-black/70">
            <div className="text-center">
              <p className="mb-4 font-criolla text-2xl">Ronda {s.ronda}: ¿con qué letra?</p>
              <motion.div animate={{ rotate: ruleta === s.letra ? 0 : [0, 360] }} transition={{ repeat: ruleta === s.letra ? 0 : Infinity, duration: 0.6, ease: "linear" }} className="bronce mx-auto grid size-40 place-items-center rounded-full">
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
        {s.fase === "revision" && <Revision key="revision" match={match} onVotar={(a) => apply(HUMAN_ID, a)} onListo={() => apply(HUMAN_ID, { type: "listo" })} />}
        {resumen && (
          <Modal key="resumen" onClose={() => {}} grande>
            <Resumen r={resumen} match={match} />
            <button
              className="btn-criollo mt-4 min-h-14 w-full rounded-2xl font-criolla text-xl"
              onClick={() => {
                setResumen(null);
                setVistos((v) => Math.max(v + 1, ref.current.state.history.length));
                if (ref.current.state.fase === "resultado") apply(HUMAN_ID, { type: "listo" });
              }}
            >
              <span className="relative z-[1]">{s.fase === "fin" ? "Ver resultado" : "Siguiente ronda"}</span>
            </button>
          </Modal>
        )}
        {verFin && final && (
          <FinPartida
            key="fin"
            r={final}
            marcador={view.score.map((p, i) => `${i === HUMAN_SEAT ? "Vos" : match.jugadores[i]!.nombre} ${p}`).join(" · ")}
            {...(s.ganadores && s.ganadores.length > 1 && s.ganadores.includes(HUMAN_SEAT) ? { titulo: "¡Empate!" } : {})}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={match.carrera ? "Volver a la gira" : "Volver al menú"}
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
                En esta partida: {mmss(s.config.tiempoMaximo)} por ronda, {s.config.cuentaRegresiva} segundos después del ¡BASTA!
                {s.config.votacion ? ", y las dudosas se votan." : ". Las que la máquina no conoce valen igual (salen marcadas como dudosas)."}
              </li>
            </ol>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const COLOR_PUNTOS: Record<number, string> = { 0: "bg-black/40 text-crema/60", 5: "bg-amber-700", 10: "bg-pano", 20: "bg-naranja text-tinta" };

function Resumen({ r, match }: { r: TuttiRoundResult; match: TMatch }) {
  const nombres = match.jugadores.map((j, i) => (i === HUMAN_SEAT ? "Vos" : j.nombre));
  return (
    <>
      <h2 className="titulo-criollo text-center text-3xl">Ronda {r.ronda} · {r.letra}</h2>
      <p className="mb-2 text-center text-xs text-crema/75">{r.bastaPor !== null ? `Cantó ¡BASTA! ${nombres[r.bastaPor]}` : "Se terminó el tiempo"}</p>
      <div className="max-h-[52dvh] overflow-y-auto pr-1">
        {match.config.categorias.map((cat, c) => (
          <div key={cat} className="border-t border-crema/10 py-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-crema/70">{cat}</p>
            <div className="flex flex-col gap-0.5">
              {r.respuestas.map((rs, p) => (
                <div key={p} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 truncate text-xs text-crema/70">{nombres[p]}</span>
                  <span className={`min-w-0 flex-1 truncate font-bold ${r.estados[p]![c] === "valida" ? "" : "text-crema/45 line-through"}`}>
                    {rs[c]?.trim() || "—"}
                    {r.dudosas[p]![c] && r.estados[p]![c] === "valida" && <span className="ml-1 text-xs no-underline" title="La máquina no la conoce">🤔</span>}
                    {r.estados[p]![c] === "rechazada" && <span className="ml-1 text-xs">(rechazada)</span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 text-xs font-black ${COLOR_PUNTOS[r.puntos[p]![c]!] ?? ""}`}>+{r.puntos[p]![c]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 border-t-2 border-crema/30 pt-2 text-sm font-black">
        {r.total.map((t, p) => (
          <span key={p} className="rounded-full bg-black/35 px-3 py-1">
            {nombres[p]}: +{t} → <span className="text-naranja">{r.score[p]}</span>
          </span>
        ))}
      </div>
    </>
  );
}

function Revision({ match, onVotar, onListo }: { match: TMatch; onVotar: (a: TuttiAction) => void; onListo: () => void }) {
  const view = tuttiFrutti.getPlayerView(match.state, HUMAN_ID);
  const rev = view.revision;
  if (!rev) return null;
  const nombres = match.jugadores.map((j, i) => (i === HUMAN_SEAT ? "Vos" : j.nombre));
  const listo = view.players[HUMAN_SEAT]!.listo;
  return (
    <Modal onClose={() => {}} grande>
      <h2 className="titulo-criollo text-center text-3xl">Revisión · {view.letra}</h2>
      <p className="mb-2 text-center text-xs text-crema/75">Tocá las que te parecen truchas. Se rechazan por mayoría (el empate se acepta).</p>
      <div className="max-h-[52dvh] overflow-y-auto pr-1">
        {match.config.categorias.map((cat, c) => (
          <div key={cat} className="border-t border-crema/10 py-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-crema/70">{cat}</p>
            {rev.respuestas.map((rs, p) => {
              if (rev.estados[p]![c] !== "valida") return null;
              const votos = rev.rechazos[`${p}-${c}`] ?? [];
              const mio = votos.includes(HUMAN_SEAT);
              return (
                <div key={p} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 truncate text-xs text-crema/70">{nombres[p]}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {rs[c]} {rev.dudosas[p]![c] && <span title="La máquina no la conoce">🤔</span>}
                  </span>
                  {votos.length > 0 && <span className="text-xs text-red-300">👎{votos.length}</span>}
                  {p !== HUMAN_SEAT && (
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
