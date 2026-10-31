import { clone, createRng, nextInt, type GameDefinition, type PlayerId } from "../core/index.ts";
import { CATEGORIAS, type Categoria, type GeneralaAction, type GeneralaConfig, type GeneralaEvent, type GeneralaState, type GeneralaView, type Planilla, type Seat } from "./types.ts";

/**
 * Generala (reglas clásicas de Buenos Aires). 5 dados, hasta 3 tiros por turno guardando los que quieras, y una
 * casilla por turno (11 turnos). Al 1…al 6 = suma de esos dados. Escalera (1-2-3-4-5, 2-3-4-5-6 o 3-4-5-6-1) 20,
 * Full (3 + 2) 30, Póker (4 iguales) 40: 5 más si salen de una ("servidos"). Generala (5 iguales) 50; la doble, 100,
 * solo con la generala ya anotada con 50. La generala servida gana la partida en el acto.
 */

const ESCALERAS = ["12345", "23456", "13456"];

export function contar(dados: readonly number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dados) c[d]!++;
  return c;
}

export const esGenerala = (dados: readonly number[]) => dados.length === 5 && dados.every((d) => d > 0 && d === dados[0]);

/** Lo que vale anotar estos dados en esa casilla (servida = en el primer tiro). 0 = tacharla. */
export function puntaje(dados: readonly number[], cat: Categoria, servida: boolean, planilla?: Planilla): number {
  if (dados.some((d) => d < 1)) return 0;
  const c = contar(dados);
  const n = Number(cat);
  if (n >= 1 && n <= 6) return c[n]! * n;
  const veces = c.slice(1).filter((x) => x > 0).sort((a, b) => b - a);
  const bonus = servida ? 5 : 0;
  switch (cat) {
    case "escalera":
      return ESCALERAS.includes([...dados].sort().join("")) ? 20 + bonus : 0;
    case "full":
      return veces[0] === 3 && veces[1] === 2 ? 30 + bonus : 0;
    case "poker":
      return veces[0]! >= 4 ? 40 + bonus : 0;
    case "generala":
      return veces[0] === 5 ? 50 : 0;
    case "doble":
      return veces[0] === 5 && planilla?.generala === 50 ? 100 : 0;
  }
  return 0;
}

export const planillaVacia = (): Planilla => Object.fromEntries(CATEGORIAS.map((c) => [c, null])) as Planilla;

export function total(p: Planilla): number {
  return CATEGORIAS.reduce((a, c) => a + (p[c] ?? 0), 0);
}

const libres = (p: Planilla) => CATEGORIAS.filter((c) => p[c] === null);

function seatOf(s: GeneralaState, id: PlayerId): Seat {
  return s.players.indexOf(id);
}

export const MASCARAS: boolean[][] = Array.from({ length: 32 }, (_, m) => Array.from({ length: 5 }, (_, i) => !!(m & (1 << i))));

export const generala: GameDefinition<GeneralaConfig, GeneralaState, GeneralaAction, GeneralaView, GeneralaEvent> = {
  id: "generala",

  initialState(config, players, seed) {
    if (players.length !== config.players) throw new Error("Cantidad de jugadores incorrecta");
    return {
      config,
      players: [...players],
      rng: createRng(seed),
      turno: 0,
      dados: [0, 0, 0, 0, 0],
      tiro: 0,
      planillas: players.map(planillaVacia),
      ganadores: null,
      servida: null,
    };
  },

  getValidActions(s, id) {
    const seat = seatOf(s, id);
    if (s.ganadores || seat !== s.turno) return [];
    const out: GeneralaAction[] = [];
    if (s.tiro === 0) out.push({ type: "tirar", guardar: [false, false, false, false, false] });
    else if (s.tiro < 3) for (const g of MASCARAS) if (g.some((x) => !x)) out.push({ type: "tirar", guardar: g });
    // Cualquier casilla libre (la doble sin la generala hecha vale 0: es tacharla).
    if (s.tiro > 0) for (const c of libres(s.planillas[seat]!)) out.push({ type: "anotar", categoria: c });
    return out;
  },

  applyAction(s0, id, action) {
    const seat = seatOf(s0, id);
    if (s0.ganadores) return { ok: false, error: "La partida terminó" };
    if (seat !== s0.turno) return { ok: false, error: "No es tu turno" };
    const s = clone(s0);
    const events: GeneralaEvent[] = [];
    if (action.type === "tirar") {
      if (s.tiro >= 3) return { ok: false, error: "Ya tiraste tres veces" };
      const guardar = s.tiro === 0 ? [false, false, false, false, false] : action.guardar;
      if (!Array.isArray(guardar) || guardar.length !== 5) return { ok: false, error: "Elegí qué dados guardar" };
      if (guardar.every(Boolean)) return { ok: false, error: "Tenés que tirar al menos un dado" };
      const tirados: number[] = [];
      for (let i = 0; i < 5; i++) {
        if (guardar[i]) continue;
        const [v, rng] = nextInt(s.rng, 6);
        s.rng = rng;
        s.dados[i] = v + 1;
        tirados.push(i);
      }
      s.tiro++;
      events.push({ type: "tiro", seat, dados: s.dados.slice(), tiro: s.tiro, tirados });
      if (s.tiro === 1 && esGenerala(s.dados)) {
        s.ganadores = [seat];
        s.servida = seat;
        events.push({ type: "generala-servida", seat });
        events.push({ type: "fin-partida", ganadores: [seat], totales: s.planillas.map(total) });
      }
      return { ok: true, state: s, events };
    }
    if (s.tiro === 0) return { ok: false, error: "Primero tirá los dados" };
    const p = s.planillas[seat]!;
    if (!(action.categoria in p) || p[action.categoria] !== null) return { ok: false, error: "Esa casilla ya está anotada" };
    const servida = s.tiro === 1;
    const puntos = puntaje(s.dados, action.categoria, servida, p);
    p[action.categoria] = puntos;
    events.push({ type: "anotar", seat, categoria: action.categoria, puntos, servida: servida && puntos > 0 && ["escalera", "full", "poker"].includes(action.categoria) });
    // Siguiente turno (o fin, cuando todos llenaron la planilla).
    s.tiro = 0;
    if (s.planillas.every((pl) => libres(pl).length === 0)) {
      const totales = s.planillas.map(total);
      const max = Math.max(...totales);
      s.ganadores = totales.flatMap((t, i) => (t === max ? [i] : []));
      events.push({ type: "fin-partida", ganadores: s.ganadores, totales });
    } else s.turno = (s.turno + 1) % s.players.length;
    return { ok: true, state: s, events };
  },

  getPlayerView(s, id) {
    const { rng: _rng, ...resto } = clone(s);
    return { ...resto, seat: seatOf(s, id) };
  },

  isGameOver(s) {
    return s.ganadores !== null;
  },
};
