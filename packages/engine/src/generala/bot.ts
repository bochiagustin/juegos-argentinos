import { nextFloat, pick, type RngState } from "../core/index.ts";
import { generala, puntaje } from "./game.ts";
import { CATEGORIAS, type Categoria, type GeneralaAction, type GeneralaConfig, type GeneralaState, type GeneralaView, type Planilla } from "./types.ts";

/**
 * Bot de generala. Calcula, para cada forma de guardar dados, el valor esperado de lo que puede anotar con los tiros que le
 * quedan (enumerando todas las tiradas posibles, con memoria por combinación de dados). El valor de anotar es el
 * puntaje menos lo que "se espera" de esa casilla (el par): así no gasta la generala en un 3 ni tacha el póker de entrada.
 * El nivel regula cuánto se equivoca (guarda mal o anota apurado).
 */

/** Lo que vale "en promedio" cada casilla: anotar arriba del par es bueno; tacharla, perderlo. */
const PAR: Record<Categoria, number> = { "1": 2, "2": 5, "3": 8, "4": 11, "5": 14, "6": 17, escalera: 14, full: 18, poker: 15, generala: 12, doble: 6 };

function valorAnotar(dados: readonly number[], cat: Categoria, servida: boolean, planilla: Planilla): number {
  const pts = puntaje(dados, cat, servida, planilla);
  // Generala hecha: casi siempre hay que anotarla.
  const extra = cat === "generala" && pts === 50 ? 20 : cat === "doble" && pts === 100 ? 40 : 0;
  return pts - PAR[cat] + extra;
}

function mejorAnotacion(dados: readonly number[], servida: boolean, planilla: Planilla): { cat: Categoria; valor: number } {
  let mejor: { cat: Categoria; valor: number } | null = null;
  for (const cat of CATEGORIAS) {
    if (planilla[cat] !== null) continue;
    const v = valorAnotar(dados, cat, servida, planilla);
    if (!mejor || v > mejor.valor) mejor = { cat, valor: v };
  }
  return mejor ?? { cat: "1", valor: 0 };
}

/** Un multiconjunto de dados como conteos [_, #1, #2 … #6] y su clave numérica. */
type Conteo = number[];
const clave = (c: Conteo) => c[1]! + 6 * (c[2]! + 6 * (c[3]! + 6 * (c[4]! + 6 * (c[5]! + 6 * c[6]!))));
const aConteo = (dados: readonly number[]): Conteo => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dados) c[d]!++;
  return c;
};
const aDados = (c: Conteo) => c.flatMap((n, v) => Array<number>(n).fill(v));

/** Todas las tiradas de n dados (como conteos) con su probabilidad. */
const TIRADAS: { c: Conteo; p: number }[][] = [];
for (let n = 0; n <= 5; n++) {
  const m = new Map<number, { c: Conteo; n: number }>();
  const total = 6 ** n;
  for (let i = 0; i < total; i++) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    let x = i;
    for (let k = 0; k < n; k++) {
      c[(x % 6) + 1]!++;
      x = Math.floor(x / 6);
    }
    const k = clave(c);
    const e = m.get(k);
    if (e) e.n++;
    else m.set(k, { c, n: 1 });
  }
  TIRADAS[n] = [...m.values()].map((e) => ({ c: e.c, p: e.n / total }));
}

/** Los sub-multiconjuntos que se pueden guardar (sin guardar todos). */
function subconjuntos(c: Conteo): Conteo[] {
  const out: Conteo[] = [];
  const rec = (v: number, actual: number[]) => {
    if (v > 6) {
      if (actual.slice(1).reduce((a, b) => a + b, 0) < 5) out.push(actual.slice());
      return;
    }
    for (let k = 0; k <= c[v]!; k++) {
      actual[v] = k;
      rec(v + 1, actual);
    }
    actual[v] = 0;
  };
  rec(1, [0, 0, 0, 0, 0, 0, 0]);
  return out;
}

class Evaluador {
  private valores = new Map<number, number>();
  private esperados = new Map<number, number>();
  private planilla: Planilla;
  constructor(planilla: Planilla) {
    this.planilla = planilla;
  }

  /** Lo mejor de quedarme con estos dados y `quedan` tiros (anotar ya o seguir tirando). */
  valor(c: Conteo, quedan: number): number {
    const k = clave(c) * 4 + quedan;
    const hit = this.valores.get(k);
    if (hit !== undefined) return hit;
    let mejor = mejorAnotacion(aDados(c), false, this.planilla).valor;
    if (quedan > 0) for (const g of subconjuntos(c)) mejor = Math.max(mejor, this.esperado(g, quedan));
    this.valores.set(k, mejor);
    return mejor;
  }

  /** Valor esperado de guardar `g` y tirar el resto, con `quedan` tiros. */
  esperado(g: Conteo, quedan: number): number {
    const k = clave(g) * 4 + quedan;
    const hit = this.esperados.get(k);
    if (hit !== undefined) return hit;
    const n = 5 - g.slice(1).reduce((a, b) => a + b, 0);
    let e = 0;
    for (const t of TIRADAS[n]!) e += t.p * this.valor(g.map((x, i) => x + t.c[i]!), quedan - 1);
    this.esperados.set(k, e);
    return e;
  }
}

/** Qué dados guardar para dejar el multiconjunto `g` (los primeros que coinciden). */
function mascaraPara(dados: readonly number[], g: Conteo): boolean[] {
  const quedan = g.slice();
  return dados.map((d) => (quedan[d]! > 0 ? (quedan[d]!--, true) : false));
}

export function chooseGeneralaAction(view: GeneralaView, valid: readonly GeneralaAction[], rngIn: RngState, skill: number): [GeneralaAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  const k = Math.min(10, Math.max(1, Math.round(skill)));
  const error = 0.3 * (1 - (k - 1) / 9) + 0.02;
  let rng = rngIn;
  const roll = () => {
    const [v, next] = nextFloat(rng);
    rng = next;
    return v;
  };
  if (view.tiro === 0) return [valid.find((a) => a.type === "tirar")!, rng];
  const planilla = view.planillas[view.seat]!;
  const servida = view.tiro === 1;
  const ahora = mejorAnotacion(view.dados, servida, planilla);
  const anotar = (cat: Categoria): [GeneralaAction, RngState] => [{ type: "anotar", categoria: cat }, rng];
  if (view.tiro >= 3) return anotar(ahora.cat);
  const ev = new Evaluador(planilla);
  let mejorG: boolean[] | null = null;
  let mejorE = -Infinity;
  for (const g of subconjuntos(aConteo(view.dados))) {
    const e = ev.esperado(g, 3 - view.tiro);
    if (e > mejorE) {
      mejorE = e;
      mejorG = mascaraPara(view.dados, g);
    }
  }
  // Errores de principiante: guardar cualquier cosa o anotar apurado.
  if (roll() < error) {
    if (roll() < 0.5) return anotar(ahora.cat);
    const [g, next] = pick(rng, subconjuntos(aConteo(view.dados)));
    rng = next;
    return [{ type: "tirar", guardar: mascaraPara(view.dados, g) }, rng];
  }
  if (ahora.valor >= mejorE || !mejorG) return anotar(ahora.cat);
  return [{ type: "tirar", guardar: mejorG }, rng];
}

/** Partida entera entre bots (tests y simulaciones). */
export function playGeneralaBotGame(config: GeneralaConfig, skills: readonly number[], seed: string): { state: GeneralaState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = generala.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  while (state.ganadores === null && steps < 5000) {
    const id = players[state.turno]!;
    const [a, next] = chooseGeneralaAction(generala.getPlayerView(state, id), generala.getValidActions(state, id), rng, skills[state.turno]!);
    rng = next;
    const r = generala.applyAction(state, id, a);
    if (!r.ok) throw new Error(`Jugada inválida: ${r.error}`);
    state = r.state;
    steps++;
  }
  return { state, steps };
}
