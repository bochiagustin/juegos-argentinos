import { clone, createRng, nextInt, shuffle, type GameDefinition } from "../core/index.ts";
import { MESA_CHANCHO, PALABRA, type ChanchoAction, type ChanchoConfig, type ChanchoEvent, type ChanchoState, type ChanchoView, type Seat } from "./types.ts";

/**
 * Chancho va. Cada uno tiene 4 cartas; en cada vuelta todos eligen una y la pasan a la derecha a la vez (la mesa marca el
 * momento). El que junta 4 iguales se toca la nariz y los demás tienen que tocársela rápido: el último (o los que no
 * llegaron) se lleva una letra de CHANCHO. Con las 7 letras quedás afuera; gana el último que queda.
 */

export const tieneCuatro = (mano: readonly number[]) => mano.length === 4 && mano.every((c) => c === mano[0]);

const vivosDe = (s: ChanchoState) => s.vivos.flatMap((v, i) => (v ? [i] : []));

/** El siguiente que sigue en juego a la derecha. */
function derecha(s: ChanchoState, seat: Seat): Seat {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const x = (seat + k) % n;
    if (s.vivos[x]) return x;
  }
  return seat;
}

function repartir(s: ChanchoState, events: ChanchoEvent[]) {
  const vivos = vivosDe(s);
  const mazo = vivos.flatMap((_, f) => [f, f, f, f]);
  const [mezclado, rng] = shuffle(mazo, s.rng);
  s.rng = rng;
  s.manos = s.players.map(() => []);
  vivos.forEach((seat, i) => (s.manos[seat] = mezclado.slice(i * 4, i * 4 + 4)));
  s.elegidas = s.players.map(() => null);
  s.vueltas = 0;
  s.nariz = [];
  s.perdieron = [];
  s.fase = "pasando";
  s.ronda++;
  events.push({ type: "reparto", ronda: s.ronda });
}

function terminarRonda(s: ChanchoState, perdedores: Seat[], events: ChanchoEvent[]) {
  for (const p of perdedores) s.letras[p] = Math.min(PALABRA.length, s.letras[p]! + 1);
  s.perdieron = perdedores;
  events.push({ type: "letra", seats: perdedores, letras: s.letras.slice() });
  for (const p of perdedores)
    if (s.letras[p] === PALABRA.length) {
      s.vivos[p] = false;
      events.push({ type: "afuera", seat: p });
    }
  const vivos = vivosDe(s);
  if (vivos.length <= 1) {
    s.ganador = vivos[0] ?? perdedores[0]!;
    s.fase = "fin";
    events.push({ type: "fin-partida", ganador: s.ganador });
  } else s.fase = "fin-ronda";
}

export const chancho: GameDefinition<ChanchoConfig, ChanchoState, ChanchoAction, ChanchoView, ChanchoEvent> = {
  id: "chancho",

  initialState(config, players, seed) {
    if (players.length !== config.players) throw new Error("Cantidad de jugadores incorrecta");
    const s: ChanchoState = {
      config,
      players: [...players],
      rng: createRng(seed),
      vivos: players.map(() => true),
      letras: players.map(() => 0),
      manos: [],
      fase: "pasando",
      elegidas: [],
      vueltas: 0,
      nariz: [],
      perdieron: [],
      ronda: 0,
      ganador: null,
    };
    repartir(s, []);
    return s;
  },

  getValidActions(s, id) {
    if (id === MESA_CHANCHO) {
      if (s.fase === "pasando") return [{ type: "pasar" }];
      if (s.fase === "nariz") return [{ type: "cerrar-nariz" }];
      if (s.fase === "fin-ronda") return [{ type: "seguir" }];
      return [];
    }
    const seat = s.players.indexOf(id);
    if (seat < 0 || !s.vivos[seat]) return [];
    const out: ChanchoAction[] = [];
    if (s.fase === "pasando") {
      for (let i = 0; i < s.manos[seat]!.length; i++) out.push({ type: "elegir", carta: i });
      if (tieneCuatro(s.manos[seat]!)) out.push({ type: "nariz" });
    }
    if (s.fase === "nariz" && !s.nariz.includes(seat)) out.push({ type: "nariz" });
    return out;
  },

  applyAction(s0, id, action) {
    if (s0.fase === "fin") return { ok: false, error: "La partida terminó" };
    const s = clone(s0);
    const events: ChanchoEvent[] = [];
    if (id === MESA_CHANCHO) {
      if (action.type === "pasar" && s.fase === "pasando") {
        const vivos = vivosDe(s);
        const sale = new Map<Seat, number>();
        for (const seat of vivos) {
          let i = s.elegidas[seat];
          if (i === null || i === undefined || i >= s.manos[seat]!.length) {
            const [r, rng] = nextInt(s.rng, s.manos[seat]!.length);
            s.rng = rng;
            i = r;
          }
          sale.set(seat, s.manos[seat]!.splice(i, 1)[0]!);
        }
        for (const seat of vivos) s.manos[derecha(s, seat)]!.push(sale.get(seat)!);
        s.elegidas = s.players.map(() => null);
        s.vueltas++;
        events.push({ type: "pase", vuelta: s.vueltas });
        return { ok: true, state: s, events };
      }
      if (action.type === "cerrar-nariz" && s.fase === "nariz") {
        terminarRonda(
          s,
          vivosDe(s).filter((x) => !s.nariz.includes(x)),
          events,
        );
        return { ok: true, state: s, events };
      }
      if (action.type === "seguir" && s.fase === "fin-ronda") {
        repartir(s, events);
        return { ok: true, state: s, events };
      }
      return { ok: false, error: "La mesa no puede hacer eso ahora" };
    }
    const seat = s.players.indexOf(id);
    if (seat < 0 || !s.vivos[seat]) return { ok: false, error: "No estás jugando" };
    if (action.type === "elegir") {
      if (s.fase !== "pasando") return { ok: false, error: "Ahora no se pasan cartas" };
      if (!Number.isInteger(action.carta) || action.carta < 0 || action.carta >= s.manos[seat]!.length) return { ok: false, error: "Esa carta no está" };
      s.elegidas[seat] = action.carta;
      return { ok: true, state: s, events };
    }
    if (action.type === "nariz") {
      if (s.fase === "pasando") {
        if (!tieneCuatro(s.manos[seat]!)) return { ok: false, error: "No tenés cuatro iguales" };
        s.fase = "nariz";
        s.nariz = [seat];
        events.push({ type: "nariz", seat, primero: true });
        // Mano a mano (quedan dos): el otro ya es el último.
        const faltan = vivosDe(s).filter((x) => !s.nariz.includes(x));
        if (faltan.length <= 1) terminarRonda(s, faltan, events);
        return { ok: true, state: s, events };
      }
      if (s.fase === "nariz") {
        if (s.nariz.includes(seat)) return { ok: false, error: "Ya te tocaste la nariz" };
        s.nariz.push(seat);
        events.push({ type: "nariz", seat, primero: false });
        const faltan = vivosDe(s).filter((x) => !s.nariz.includes(x));
        if (faltan.length <= 1) terminarRonda(s, faltan, events);
        return { ok: true, state: s, events };
      }
      return { ok: false, error: "Ahora no" };
    }
    return { ok: false, error: "Eso lo hace la mesa" };
  },

  getPlayerView(s, id) {
    const seat = s.players.indexOf(id);
    const mostrar = s.fase === "fin-ronda" || s.fase === "fin";
    return {
      config: s.config,
      seat,
      mano: seat >= 0 ? (s.manos[seat] ?? []).slice() : [],
      vivos: s.vivos.slice(),
      letras: s.letras.slice(),
      fase: s.fase,
      eligieron: s.elegidas.map((e) => e !== null),
      miEleccion: seat >= 0 ? (s.elegidas[seat] ?? null) : null,
      cartas: s.manos.map((m) => m.length),
      vueltas: s.vueltas,
      nariz: s.nariz.slice(),
      perdieron: s.perdieron.slice(),
      ronda: s.ronda,
      ganador: s.ganador,
      manosFinales: mostrar ? clone(s.manos) : null,
    };
  },

  isGameOver(s) {
    return s.fase === "fin";
  },
};
