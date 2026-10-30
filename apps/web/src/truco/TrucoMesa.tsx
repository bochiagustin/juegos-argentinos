import type { SuitedCard } from "@juegos-argentinos/engine";
import { Cara, rivalEn } from "../carrera/Cara.tsx";
import { teamOf, type RoundSummary, type Seat, type Trick, type TrucoAction, type TrucoView } from "@juegos-argentinos/engine/truco";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { playSfx } from "../audio/sfx.ts";
import { SpanishCard } from "../cards/SpanishCard.tsx";
import { useCerrarPartida, type ResultadoCierre } from "../carrera/useCerrarPartida.ts";
import { skillForRating } from "../ia/nivel.ts";
import { useNav } from "../nav.tsx";
import { FinPartida } from "../partidas/FinPartida.tsx";
import { statsDe } from "../save/save.ts";
import { useSave } from "../save/SaveContext.tsx";
import { momentosTruco } from "../partidas/momentos.ts";
import type { Remoto } from "../partidas/remoto.ts";
import { Art } from "../art/Art.tsx";
import { FondoMesa } from "../fondos/fondos.tsx";
import { Banderita, CintaEsquina, Icono, MateDibujo, SolDeMayo, VolutaTexto, type IconoCanto } from "../ui/adornos.tsx";
import { Modal } from "../ui/Modal.tsx";
import { FileteEsquinas, IconButton } from "../ui/ui.tsx";
import { Fosforos } from "./Fosforos.tsx";
import { clearMatch, loadMatch, newMatch, saveMatch, type TrucoMatch } from "./partida.ts";
import { ReglasTruco } from "./ReglasTruco.tsx";
import { botonDe, describirPendiente, ENVIDO_NOMBRE, NIVEL_TRUCO } from "./textos.ts";
import { useTrucoMatch, type Globo } from "./useTrucoMatch.ts";

type Punto = { x: number; y: number };
interface SeatPos {
  avatar: Punto;
  zone: Punto;
}

/** Dónde se sienta cada uno en la pantalla, según cuántos juegan (índice = asiento relativo al jugador). */
const LAYOUT: Record<2 | 4 | 6, SeatPos[]> = {
  2: [
    { avatar: { x: 50, y: 96 }, zone: { x: 50, y: 70 } },
    { avatar: { x: 50, y: 15 }, zone: { x: 50, y: 41 } },
  ],
  4: [
    { avatar: { x: 50, y: 96 }, zone: { x: 50, y: 74 } },
    { avatar: { x: 86, y: 47 }, zone: { x: 66, y: 50 } },
    { avatar: { x: 50, y: 13 }, zone: { x: 50, y: 31 } },
    { avatar: { x: 14, y: 47 }, zone: { x: 34, y: 50 } },
  ],
  6: [
    { avatar: { x: 50, y: 96 }, zone: { x: 50, y: 78 } },
    { avatar: { x: 87, y: 66 }, zone: { x: 67, y: 62 } },
    { avatar: { x: 87, y: 28 }, zone: { x: 67, y: 38 } },
    { avatar: { x: 50, y: 12 }, zone: { x: 50, y: 25 } },
    { avatar: { x: 13, y: 28 }, zone: { x: 33, y: 38 } },
    { avatar: { x: 13, y: 66 }, zone: { x: 33, y: 62 } },
  ],
};

const ZONE_CARD: Record<2 | 4 | 6, number> = { 2: 64, 4: 50, 6: 40 };

const ORDEN: Record<TrucoAction["type"], number> = {
  quiero: 0,
  "no-quiero": 1,
  truco: 2,
  envido: 3,
  flor: 4,
  contraflor: 5,
  "contraflor-al-resto": 6,
  "con-flor-me-achico": 7,
  mazo: 9,
  jugar: 10,
};

export function TrucoMesa() {
  const { back, replace } = useNav();
  const [partida, setPartida] = useState<{ m: TrucoMatch | null; n: number }>(() => ({ m: loadMatch(), n: 0 }));
  if (!partida.m) {
    return (
      <div className="pano grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="mb-4 text-lg font-bold">No hay ninguna partida en juego.</p>
          <button className="btn-criollo min-h-14 rounded-2xl px-6 font-criolla text-xl" onClick={() => replace({ name: "truco-setup" })}>
            Armar una partida
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

export function TrucoMesaOnline({ remoto }: { remoto: Remoto }) {
  return <Mesa initial={null} remoto={remoto} />;
}

function Mesa({ initial, onRevancha, remoto }: { initial: TrucoMatch | null; onRevancha?: (m: TrucoMatch) => void; remoto?: Remoto }) {
  const { back } = useNav();
  const { save } = useSave();
  const cerrar = useCerrarPartida();
  const [final, setFinal] = useState<ResultadoCierre | null>(null);
  const [reglas, setReglas] = useState(false);
  const [confirmarMazo, setConfirmarMazo] = useState(false);

  const onFin = (m: TrucoMatch) => {
    clearMatch();
    const gane = m.state.winner === 0;
    const rival = m.state.score[1];
    const tercio = Math.round(m.config.target / 3);
    setFinal(
      cerrar({
        game: "truco",
        ganada: gane,
        botSkill: Math.max(...m.skills.filter((_, i) => i % 2 === 1)),
        adaptativo: m.adaptativo,
        ...(m.carrera ? { rivalId: m.carrera.rivalId } : {}),
        remontada: gane && m.peorDiferencia <= -tercio,
        paliza: gane && rival < tercio,
        hechos: m.hechos,
      }),
    );
    playSfx(gane ? "turno" : "error");
  };

  const { match, view, valid, jugar, globos, resumen, pendiente, congelada, cerrarResumen, yo } = useTrucoMatch(initial, onFin, remoto);
  // Mientras se muestra cómo terminó la mano, la mesa es la de esa mano (no la nueva que ya se repartió).
  const tricks = congelada ?? view.tricks;
  const jugadasEn = (seat: Seat) => tricks.filter((t) => t.plays.some((x) => x.seat === seat)).length;
  const momentos = momentosTruco(view.history, view.team);
  // El fin de partida aparece recién después de ver el resumen de la última mano.
  const verFin = !resumen && !pendiente;
  const n = view.config.players;
  const layout = LAYOUT[n];
  // Cada uno se ve abajo: los asientos se dibujan relativos al mío.
  const rel = (seat: Seat) => (seat - yo + n) % n;
  const nombre = (seat: Seat) => (seat === yo ? "Vos" : match.jugadores[seat]!.nombre);
  const equipo = (team: 0 | 1) => (team === view.team ? (n === 2 ? "Vos" : "Nosotros") : n === 2 ? match.jugadores[1 - yo]!.nombre : "Ellos");

  const miTurno = view.actor === yo && !resumen && !congelada && !remoto?.terminado;
  const playable = new Set(miTurno ? valid.flatMap((a) => (a.type === "jugar" ? [a.card] : [])) : []);
  const botones = miTurno
    ? valid
        .filter((a) => a.type !== "jugar")
        .sort((a, b) => ORDEN[a.type] - ORDEN[b.type])
        .map((a) => ({ a, b: botonDe(a, view)! }))
    : [];

  // Si mientras confirmás el mazo se terminó la mano (o ya no se puede), la pregunta se cierra y no vuelve a aparecer.
  const puedeMazo = miTurno && valid.some((a) => a.type === "mazo");
  useEffect(() => {
    if (!puedeMazo) setConfirmarMazo(false);
  }, [puedeMazo]);

  const act = (a: TrucoAction) => {
    if (a.type === "mazo") {
      setConfirmarMazo(true);
      return;
    }
    playSfx("click");
    jugar(a);
  };

  const revancha = () => {
    const skill = match.adaptativo ? skillForRating(statsDe(save, "truco").rating) : match.skills[1]!;
    const rival = match.carrera ? { id: match.carrera.rivalId, jugador: match.jugadores[1]!, skill: match.skills[1]! } : undefined;
    const m = newMatch(match.config, skill, match.adaptativo, match.jugadores[0]!, rival);
    saveMatch(m);
    playSfx("barajar");
    onRevancha?.(m);
  };

  const equipos = [view.team, (1 - view.team) as 0 | 1] as const;
  return (
    <div className="boliche relative isolate flex h-dvh flex-col overflow-hidden">
      {/* El fondo elegido (boliche, patio, bodega…); si falta la imagen, queda la madera con luz cálida. */}
      <FondoMesa />
      {/* En pantallas anchas la mesa queda centrada y a los costados se ve el boliche: el cartel y el mate. */}
      <div className="pointer-events-none absolute right-[max(1.5rem,calc((100vw-42rem)/2-15rem))] top-1/3 hidden w-48 rotate-3 lg:block">
        <div className="relative">
          <Art id="mesa-cartel" className="w-full drop-shadow-[0_10px_14px_rgb(0_0_0/0.55)]" fallback={<CartelBoliche />} />
          {/* Sobre la tabla dibujada va el texto (la ilustración viene sin letras). */}
          <p className="titulo-criollo pointer-events-none absolute inset-x-[16%] top-[30%] bottom-[14%] grid place-items-center text-center text-[1.05rem] leading-tight [text-shadow:0_2px_0_rgb(40_20_5/0.9)]">
            Truco, amigos, asado y mate
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-24 left-[max(1.5rem,calc((100vw-42rem)/2-13rem))] hidden size-40 lg:block">
        <Art id="mesa-mate" className="size-full object-contain" fallback={<MateDibujo className="size-full" />} />
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">

      <header className="madera z-20 flex items-center gap-2 rounded-b-2xl px-2.5 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <IconButton label={remoto ? "Salir de la sala" : "Salir (la partida queda guardada)"} onClick={back}>
          ←
        </IconButton>
        {/* Marcador: cada equipo anota con fósforos; el Sol de Mayo en el medio. */}
        <div className="relative z-[1] flex min-w-0 flex-1 items-center">
          {equipos.map((team, i) => (
            <div key={team} className={`marcador relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 pb-1 pt-0.5 ${i === 0 ? "marcador-mio pr-4" : "pl-4"}`}>
              <span className={`absolute -top-3 h-7 w-6 ${i === 0 ? "-left-2" : "-right-2"}`} style={i === 1 ? { transform: "scaleX(-1)" } : undefined}>
                <Art id="ui-banderita" className="size-full object-contain drop-shadow" fallback={<Banderita className="size-full" />} />
              </span>
              <p className="flex max-w-full items-baseline gap-1.5 truncate text-[11px] font-black uppercase tracking-wider text-crema/90">
                <span className="truncate">{equipo(team)}</span>
                <span className="font-criolla text-lg leading-none text-naranja">{view.score[team]}</span>
              </p>
              <Fosforos puntos={view.score[team]} target={view.config.target} />
            </div>
          ))}
          <span className="absolute left-1/2 top-1/2 z-10 size-12 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_3px_rgb(0_0_0/0.6)]">
            <Art id="ui-sol" className="size-full object-contain" fallback={<SolDeMayo className="size-full" />} />
          </span>
        </div>
        <IconButton label="Cómo se juega" onClick={() => setReglas(true)}>
          ?
        </IconButton>
      </header>

      <div className="z-10 flex flex-nowrap items-center justify-center gap-1.5 overflow-hidden px-3 pt-2 text-[11px] font-bold">
        <span className="-my-2 size-9 shrink-0 lg:hidden" aria-hidden>
          <Art id="mesa-mate" className="size-full object-contain drop-shadow-[0_3px_3px_rgb(0_0_0/0.5)]" fallback={<MateDibujo className="size-full" />} />
        </span>
        <Chip>Mano {view.roundNumber} · a {view.config.target}</Chip>
        <Chip>{view.trucoLevel === 1 ? "Vale 1" : `${NIVEL_TRUCO[view.trucoLevel]} · ${view.trucoLevel}`}</Chip>
        {view.envido && <Chip>Envido {view.envido.team === view.team ? "nuestro" : "de ellos"} +{view.envido.points}</Chip>}
        {view.flor && <Chip>Flor {view.flor.team === view.team ? "nuestra" : "de ellos"} +{view.flor.points}</Chip>}
      </div>

      <LayoutGroup>
        <div className="relative min-h-0 flex-1">
          {/* La mesa de paño con marco de madera, filete dorado, cintas celeste y blanca y el mate. */}
          <div className="mesa-pano pointer-events-none absolute inset-x-2 bottom-1 top-[9%] rounded-[1.75rem]">
            <FileteEsquinas />
          </div>
          <CintaEsquina className="pointer-events-none absolute right-0.5 top-[9%] size-14" rotar={90} />
          <CintaEsquina className="pointer-events-none absolute bottom-0 left-0.5 size-14" rotar={270} />
          {view.players.map((p) =>
            p.seat === yo ? null : (
              <Avatar
                key={p.seat}
                pos={layout[rel(p.seat)]!.avatar}
                nombre={nombre(p.seat)}
                avatar={<Cara avatar={match.jugadores[p.seat]!.avatar} rivalId={rivalEn(match, p.seat)} />}
                cartas={congelada ? Math.max(0, 3 - jugadasEn(p.seat)) : p.cardsLeft}
                mano={view.mano === p.seat && !congelada}
                actua={view.actor === p.seat && !resumen && !congelada}
                companero={teamOf(p.seat) === view.team}
                compacto={n === 6}
                canto={view.pending && view.pending.caller === p.seat && !congelada ? describirPendiente(view.pending) : null}
              />
            ),
          )}
          {view.players.map((p) => (
            <Zona key={p.seat} seat={p.seat} yo={yo} pos={layout[rel(p.seat)]!} tricks={tricks} width={ZONE_CARD[n]} />
          ))}
          {view.mano === yo && !congelada && (
            <span className="absolute bottom-4 right-6 z-[1] rounded-full border border-[#7a4a06] bg-naranja px-2 py-0.5 text-[11px] font-black uppercase text-tinta shadow">Sos mano</span>
          )}
          <AnimatePresence>
            {globos.map((g) => (
              <Burbuja key={g.id} globo={g} pos={layout[rel(g.seat)]!.avatar} />
            ))}
          </AnimatePresence>
        </div>

        <div className="madera z-10 rounded-t-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <p className="relative z-[1] mb-2 flex min-h-5 items-center justify-center gap-2 text-center text-sm font-bold text-crema" aria-live="polite">
            <VolutaTexto className="h-4 w-8 shrink-0" />
            <span>{congelada ? "Fin de la mano" : estado(view, nombre, miTurno, yo)}</span>
            <VolutaTexto className="h-4 w-8 shrink-0" espejo />
          </p>
          <div className="relative z-[1] flex min-h-[8.5rem] items-end justify-center gap-2 pb-1">
            <AnimatePresence>
              {(congelada ? [] : view.hand).map((c, i) => (
                <CartaMano key={c.id} card={c} i={i} total={view.hand.length} jugable={playable.has(c.id)} onPlay={() => act({ type: "jugar", card: c.id })} />
              ))}
            </AnimatePresence>
          </div>
          <BarraCantos acciones={botones.map(({ a }) => a)} view={view} activa={miTurno} onAct={act} />
        </div>
      </LayoutGroup>
      </div>

      <AnimatePresence>
        {resumen && (
          <Resumen
            key="resumen"
            r={resumen}
            nombre={nombre}
            equipo={equipo}
            view={view}
            yo={yo}
            onSeguir={cerrarResumen}
            terminado={view.winner !== null}
          />
        )}
        {remoto && verFin && view.winner !== null && remoto.fin({ gane: view.winner === view.team, empate: false, momentos, marcador: `${equipo(view.team)} ${view.score[view.team]} · ${equipo((1 - view.team) as 0 | 1)} ${view.score[1 - view.team]}` })}
        {verFin && final && (
          <FinPartida
            key="fin"
            r={final}
            momentos={momentos}
            marcador={`${equipo(view.team)} ${view.score[view.team]} · ${equipo((1 - view.team) as 0 | 1)} ${view.score[1 - view.team]}`}
            onRevancha={revancha}
            onSalir={back}
            salirTexto={match.carrera ? "Volver a la gira" : "Volver al menú"}
          />
        )}
        {confirmarMazo && puedeMazo && (
          <Modal key="mazo" onClose={() => setConfirmarMazo(false)}>
            <p className="mb-4 text-center text-lg font-bold">¿Te vas al mazo? Los otros se llevan lo que vale la mano.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="boton boton-cuero min-h-12 rounded-xl" onClick={() => setConfirmarMazo(false)}>
                Sigo jugando
              </button>
              <button
                className="boton boton-rojo min-h-12 rounded-xl"
                onClick={() => {
                  setConfirmarMazo(false);
                  jugar({ type: "mazo" });
                }}
              >
                Me voy
              </button>
            </div>
          </Modal>
        )}
        {reglas && (
          <Modal key="reglas" onClose={() => setReglas(false)} grande>
            <ReglasTruco config={view.config} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Ícono de cada canto (sombrero para el truco, copa para el envido, corona para el real…). */
/** El ícono ilustrado del canto, o el de trazo si falta la imagen. */
function IconoCantoArte({ tipo, chico = false }: { tipo: IconoCanto; chico?: boolean }) {
  return (
    <Art
      id={`canto-${tipo}`}
      className={`${chico ? "size-6" : "-my-1 size-8"} shrink-0 object-contain drop-shadow-[0_1px_1px_rgb(0_0_0_/_0.5)]`}
      fallback={<Icono tipo={tipo} className="size-5 shrink-0" />}
    />
  );
}

function iconoDe(a: TrucoAction): IconoCanto {
  switch (a.type) {
    case "truco":
      return "sombrero";
    case "envido":
      return a.call === "real-envido" ? "corona" : a.call === "falta-envido" ? "rosa" : "copa";
    case "flor":
    case "contraflor":
    case "contraflor-al-resto":
      return "flor";
    case "quiero":
      return "si";
    case "mazo":
      return "mazo";
    default:
      return "no";
  }
}

/** Cartel de madera del boliche (hasta que llegue la ilustración). */
function CartelBoliche() {
  return (
    <div className="madera aspect-[4/3] rounded-lg shadow-2xl">
      <span className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-[#2a1608]" aria-hidden />
    </div>
  );
}

function estado(view: TrucoView, nombre: (s: Seat) => string, miTurno: boolean, yo: Seat): string {
  if (view.winner !== null) return "Partida terminada";
  const p = view.pending;
  if (p) {
    const quien = nombre(p.caller);
    const que = describirPendiente(p);
    if (p.responder === yo) return `${quien} cantó ${que}. ¿Qué hacés?`;
    return `${nombre(p.responder)} piensa qué contestar al ${que}…`;
  }
  if (miTurno || view.turn === yo) return "Te toca. Tocá una carta para tirarla.";
  return `Juega ${nombre(view.turn)}…`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 whitespace-nowrap rounded-full border border-[#c9a24a]/60 bg-black/55 px-3 py-1 text-crema shadow-[inset_0_1px_0_rgb(255_230_190/0.15)]">{children}</span>;
}

function Avatar(props: { pos: Punto; nombre: string; avatar: React.ReactNode; cartas: number; mano: boolean; actua: boolean; companero: boolean; compacto: boolean; canto: string | null }) {
  const { pos, nombre, avatar, cartas, mano, actua, companero, compacto, canto } = props;
  const size = compacto ? "size-11 text-2xl" : "size-14 text-3xl";
  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
      <div className="relative">
        {actua && (
          <motion.span
            className="absolute -inset-1.5 rounded-full border-4 border-naranja"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span className={`relative grid ${size} place-items-center overflow-hidden rounded-full border-[3px] bg-black/40 shadow-lg shadow-black/40 ${companero ? "border-celeste" : "border-[#d9a066]"}`}>
          {avatar}
        </span>
        {mano && <span className="absolute -right-3 -top-1 rounded-full bg-naranja px-1.5 text-[10px] font-black uppercase text-tinta">Mano</span>}
      </div>
      <span className="mt-1 flex items-center gap-1">
        <span className="max-w-24 truncate rounded-full bg-black/45 px-2 text-xs font-bold">
          {nombre}
          {companero ? " 🤝" : ""}
        </span>
        <AnimatePresence>
          {canto && (
            <motion.span
              key={canto}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="whitespace-nowrap rounded-full border border-[#7a4a06] bg-naranja px-2 text-xs font-black text-tinta shadow"
            >
              ¡{canto.charAt(0).toUpperCase() + canto.slice(1)}!
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div className="mt-0.5 flex -space-x-3">
        {Array.from({ length: cartas }, (_, i) => (
          <div key={i} style={{ rotate: `${(i - (cartas - 1) / 2) * 10}deg` }}>
            <SpanishCard card={null} width={compacto ? 16 : 20} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Zona({ seat, yo, pos, tricks, width }: { seat: Seat; yo: Seat; pos: SeatPos; tricks: Trick[]; width: number }) {
  const plays = tricks.flatMap((t, k) => {
    const p = t.plays.find((x) => x.seat === seat);
    if (!p) return [];
    const decided = t.result !== undefined;
    const gano = decided && t.winnerSeat === seat;
    const perdio = decided && t.result !== "parda" && t.winnerSeat !== seat;
    return [{ card: p.card, k, gano, perdio, parda: t.result === "parda" }];
  });
  const fromX = Math.sign(pos.avatar.x - pos.zone.x) * 50;
  const fromY = Math.sign(pos.avatar.y - pos.zone.y) * 60;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos.zone.x}%`, top: `${pos.zone.y}%` }}>
      <div className="relative flex" style={{ width: width * 2.1, height: width * 1.55 }}>
        <AnimatePresence>
          {plays.map(({ card, k, gano, perdio, parda }) => (
            <motion.div
              key={card.id}
              {...(seat === yo ? { layoutId: `carta-${card.id}` } : {})}
              initial={seat === yo ? false : { x: fromX, y: fromY, opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ x: 0, y: 0, opacity: 1, scale: gano ? 1.06 : 1, rotate: (k - 1) * 7 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="absolute top-0 rounded-lg shadow-lg shadow-black/50"
              style={{ left: k * width * 0.55, zIndex: k }}
            >
              <SpanishCard card={card} width={width} highlight={gano} dimmed={perdio} />
              {parda && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-1.5 text-[10px] font-black">PARDA</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CartaMano({ card, i, total, jugable, onPlay }: { card: SuitedCard; i: number; total: number; jugable: boolean; onPlay: () => void }) {
  const offset = i - (total - 1) / 2;
  return (
    <motion.button
      layoutId={`carta-${card.id}`}
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: jugable ? -6 : 6, opacity: 1, rotate: offset * 6 }}
      exit={{ opacity: 0 }}
      whileTap={jugable ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.05 }}
      disabled={!jugable}
      onClick={onPlay}
      aria-label={`Tirar ${card.rank} de ${card.suit}`}
      className="rounded-xl shadow-xl shadow-black/50 disabled:cursor-default"
    >
      <SpanishCard card={card} width={Math.min(108, Math.round(window.innerWidth * 0.27))} highlight={jugable} />
    </motion.button>
  );
}

type Grupo = "truco" | "envido" | "flor" | "mazo";
const GRUPO_DE: Partial<Record<TrucoAction["type"], Grupo>> = {
  truco: "truco",
  envido: "envido",
  flor: "flor",
  contraflor: "flor",
  "contraflor-al-resto": "flor",
  "con-flor-me-achico": "flor",
  mazo: "mazo",
};

/**
 * La botonera del truco, siempre del mismo tamaño para no achicar la mesa: cuatro lugares fijos (Truco, Envido, Flor, Mazo)
 * que se apagan cuando no se pueden usar. Envido y flor abren sus opciones en la misma barra; cuando te cantan,
 * "Quiero" y "No quiero" aparecen como dos pestañas arriba.
 */
function BarraCantos({ acciones, view, activa, onAct }: { acciones: TrucoAction[]; view: TrucoView; activa: boolean; onAct: (a: TrucoAction) => void }) {
  const [abierto, setAbierto] = useState<"envido" | "flor" | null>(null);
  const de = (g: Grupo) => (activa ? acciones.filter((a) => GRUPO_DE[a.type] === g) : []);
  const quiero = activa ? acciones.find((a) => a.type === "quiero") : undefined;
  const noQuiero = activa ? acciones.find((a) => a.type === "no-quiero") : undefined;
  // Si cambia lo que se puede hacer (contestaron, se jugó una carta), el submenú se cierra.
  const firma = acciones.map((a) => JSON.stringify(a)).join("|");
  useEffect(() => setAbierto(null), [firma]);

  const truco = de("truco")[0];
  const proximo = view.pending?.kind === "truco" ? view.pending.level + 1 : view.trucoLevel + 1;
  const textoTruco = proximo <= 2 ? "Truco" : proximo === 3 ? "Retruco" : "Vale 4";
  const tocar = (g: "envido" | "flor") => {
    const ops = de(g);
    // La flor sola se canta directo; el envido siempre muestra qué se canta (puede quedar solo "Falta envido").
    if (g === "flor" && ops.length === 1 && ops[0]!.type === "flor") onAct(ops[0]!);
    else if (ops.length > 0) setAbierto(g);
    playSfx("click");
  };
  const celda = (contenido: React.ReactNode, onClick: (() => void) | null, key: string, icono?: IconoCanto) => (
    <button
      key={key}
      disabled={!onClick}
      onClick={onClick ?? undefined}
      className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 font-criolla text-[15px] leading-tight text-crema transition active:bg-black/25 disabled:opacity-30"
    >
      {icono && <IconoCantoArte tipo={icono} chico />}
      <span className="text-center">{contenido}</span>
    </button>
  );

  return (
    <div className="relative z-[1] -mx-3 -mb-[calc(env(safe-area-inset-bottom)+0.75rem)] mt-1">
      {/* Contestar: pestañas arriba de la barra, sin tapar la mesa. */}
      <AnimatePresence>
        {(quiero || noQuiero) && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="absolute inset-x-0 bottom-full flex justify-center">
            {quiero && (
              <button onClick={() => onAct(quiero)} className="boton boton-oro min-h-12 min-w-32 rounded-b-none rounded-t-2xl px-5 text-lg">
                <IconoCantoArte tipo="si" />
                Quiero
              </button>
            )}
            {noQuiero && (
              <button onClick={() => onAct(noQuiero)} className="boton boton-cuero min-h-12 min-w-32 rounded-b-none rounded-t-2xl px-5 text-lg">
                <IconoCantoArte tipo="no" />
                No quiero
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-4 divide-x divide-[#e8c27a]/30 border-t-2 border-[#e8c27a]/40 bg-black/45 pb-[env(safe-area-inset-bottom)]">
        {abierto
          ? [
              ...de(abierto).map((a) => celda(botonDe(a, view)!.texto.replace("Quiero ", ""), () => onAct(a), JSON.stringify(a), iconoDe(a))),
              ...Array.from({ length: Math.max(0, 3 - de(abierto).length) }, (_, k) => <span key={`v${k}`} />),
              celda("Volver", () => setAbierto(null), "volver"),
            ]
          : [
              celda(textoTruco, truco ? () => onAct(truco) : null, "truco", "sombrero"),
              celda("Envido", de("envido").length ? () => tocar("envido") : null, "envido", "copa"),
              celda("Flor", de("flor").length ? () => tocar("flor") : null, "flor", "flor"),
              celda("Mazo", de("mazo")[0] ? () => onAct(de("mazo")[0]!) : null, "mazo", "mazo"),
            ]}
      </div>
    </div>
  );
}

function Burbuja({ globo, pos }: { globo: Globo; pos: Punto }) {
  // Al costado del avatar (no encima de las cartas de la mesa); el de uno mismo, un poco más arriba.
  const derecha = pos.x <= 60;
  const left = derecha ? Math.min(pos.x + 17, 88) : Math.max(pos.x - 17, 12);
  // Un poco arriba del centro del avatar, para no tapar el nombre ni lo que cantó.
  const top = pos.y > 90 ? 80 : Math.max(4, pos.y - 7);
  const color = globo.tono === "canto" ? "bg-crema text-tinta" : globo.tono === "tanto" ? "bg-celeste text-tinta" : "bg-[#d9cfc0] text-tinta/80";
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <div className={`relative whitespace-nowrap rounded-2xl border-2 border-tinta/60 px-3 py-1 font-criolla text-lg shadow-xl shadow-black/40 ${color}`}>
        {globo.texto}
      </div>
    </motion.div>
  );
}

function Resumen({ r, nombre, equipo, view, yo, onSeguir, terminado }: { r: RoundSummary; nombre: (s: Seat) => string; equipo: (t: 0 | 1) => string; view: TrucoView; yo: Seat; onSeguir: () => void; terminado: boolean }) {
  const ganamos = r.truco.team === view.team;
  const lineas: string[] = [];
  if (r.envido) {
    const e = r.envido;
    const canto = e.chain.map((c) => ENVIDO_NOMBRE[c]).join(", ");
    if (e.querido) {
      const decl = e.declarations.filter((d) => d.value !== null).map((d) => `${nombre(d.seat)} ${d.value}`);
      lineas.push(`${canto} querido: gana ${equipo(e.team)} (${decl.join(" · ")}) +${e.points}`);
    } else lineas.push(`${canto} no querido: ${equipo(e.team)} +${e.points}`);
  }
  if (r.flor) lineas.push(`Flor${r.flor.stage === "achico" ? " (se achicaron)" : ""}: ${equipo(r.flor.team)} +${r.flor.points}`);
  if (r.truco.how === "bazas") lineas.push(`${r.truco.level === 1 ? "Mano" : NIVEL_TRUCO[r.truco.level]} por bazas: ${equipo(r.truco.team)} +${r.truco.points}`);
  if (r.truco.how === "no-quiero") lineas.push(`${NIVEL_TRUCO[(r.truco.level + 1) as 2 | 3 | 4] ?? "Truco"} no querido: ${equipo(r.truco.team)} +${r.truco.points}`);
  if (r.truco.how === "mazo" && r.mazo !== null) lineas.push(`${nombre(r.mazo)} ${r.mazo === yo ? "te fuiste" : "se fue"} al mazo: ${equipo(r.truco.team)} +${r.truco.points}`);
  const titulo = r.truco.how === "fin-partida" ? "¡Se terminó!" : view.config.players === 2 ? (ganamos ? "¡Mano para vos!" : `Mano para ${equipo(r.truco.team)}`) : ganamos ? "¡Mano para nosotros!" : "Mano para ellos";
  return (
    <Modal onClose={onSeguir}>
      <h2 className="titulo-criollo mb-3 text-center text-3xl">{titulo}</h2>
      <ul className="mb-3 flex flex-col gap-1.5 text-sm font-semibold">
        {lineas.map((l) => (
          <li key={l} className="rounded-xl bg-black/30 px-3 py-2">
            {l}
          </li>
        ))}
      </ul>
      {r.reveal.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-black uppercase tracking-wider text-crema/70">Cartas de los tantos</p>
          <div className="flex flex-col gap-2">
            {r.reveal.map(({ seat, cards }) => (
              <div key={seat} className="flex items-center gap-2">
                <span className="w-20 truncate text-sm font-bold">{nombre(seat)}</span>
                {cards.map((c) => (
                  <SpanishCard key={c.id} card={c} width={36} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mb-4 text-center font-bold">
        {equipo(view.team)} {view.score[view.team]} · {equipo((1 - view.team) as 0 | 1)} {view.score[1 - view.team]}
      </p>
      <button className="btn-criollo min-h-14 w-full rounded-2xl font-criolla text-xl" onClick={onSeguir}>
        <span className="relative z-[1]">{terminado ? "Ver resultado" : "Siguiente mano"}</span>
      </button>
    </Modal>
  );
}
