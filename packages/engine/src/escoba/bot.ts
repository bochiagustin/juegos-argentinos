import { createDeck, nextFloat, pick, type RngState, type SuitedCard } from "../core/index.ts";
import { bandoDe, escoba, valorEscoba } from "./game.ts";
import type { EscobaAction, EscobaConfig, EscobaState, EscobaView } from "./types.ts";

/**
 * Bot de escoba. Valora lo que levanta (cartas, oros, sietes, el 7 de oro y la escoba) y,
 * con nivel alto, el riesgo de dejarle la escoba servida al de al lado según las cartas que no vio.
 */

export function escobaProfile(skill: number) {
  const t = (Math.min(10, Math.max(1, Math.round(skill))) - 1) / 9;
  return { errorRate: 0.35 * (1 - t) + 0.02, riesgo: 0.2 + 1.3 * t, gula: 0.4 + 0.6 * t };
}

const ALL = createDeck({ size: 40 }) as SuitedCard[];

function valorDeCartas(cs: readonly SuitedCard[]): number {
  let v = 0;
  for (const c of cs) {
    v += 1;
    if (c.suit === "oro") v += 0.6;
    if (c.rank === 7) v += 1;
    if (c.rank === 7 && c.suit === "oro") v += 4;
  }
  return v;
}

export function chooseEscobaAction(view: EscobaView, valid: readonly EscobaAction[], rngIn: RngState, skill: number): [EscobaAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  const prof = escobaProfile(skill);
  let rng = rngIn;
  const [roll, r1] = nextFloat(rng);
  rng = r1;
  if (roll < prof.errorRate) return pick(rng, valid);

  // Cartas que no veo (las tienen otros o están en el mazo): para estimar si me dejan escoba.
  const vistas = new Set<string>([...view.hand, ...view.mesa].map((c) => c.id));
  const noVistas = ALL.filter((c) => !vistas.has(c.id));
  const porValor = new Array<number>(11).fill(0);
  for (const c of noVistas) porValor[valorEscoba(c)]!++;
  const rivalesConCartas = view.players.filter((p) => p.seat !== view.seat && bandoDe(view.config, p.seat) !== view.bando).reduce((a, p) => a + p.cards, 0);
  /** Probabilidad aproximada de que un rival tenga la carta justa para barrer una mesa que suma `s`. */
  const riesgoEscoba = (s: number) => {
    const falta = 15 - s;
    if (falta < 1 || falta > 10) return 0;
    return Math.min(1, (porValor[falta]! * rivalesConCartas) / Math.max(1, noVistas.length));
  };

  let best = valid[0]!;
  let bestScore = -Infinity;
  for (const a of valid) {
    const card = view.hand.find((c) => c.id === a.card)!;
    const ids = new Set<string>(a.levanta);
    const resto = view.mesa.filter((c) => !ids.has(c.id));
    let score: number;
    if (a.levanta.length > 0) {
      const levantadas = [card, ...view.mesa.filter((c) => ids.has(c.id))];
      const escobaHecha = resto.length === 0;
      score = prof.gula * valorDeCartas(levantadas) + (escobaHecha ? 10 : 0);
      const suma = resto.reduce((acc, c) => acc + valorEscoba(c), 0);
      score -= prof.riesgo * riesgoEscoba(suma) * 8;
    } else {
      // Dejarla en la mesa: lo que regalo y el riesgo de escoba que dejo.
      const suma = resto.reduce((acc, c) => acc + valorEscoba(c), 0) + valorEscoba(card);
      score = -prof.gula * valorDeCartas([card]) * 0.5 - prof.riesgo * riesgoEscoba(suma) * 8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return [best, rng];
}

export function playEscobaBotGame(config: EscobaConfig, skills: readonly number[], seed: string): { state: EscobaState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = escoba.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  while (state.winner === null && steps < 5000) {
    const id = players[state.turn]!;
    const [action, next] = chooseEscobaAction(escoba.getPlayerView(state, id), escoba.getValidActions(state, id), rng, skills[state.turn]!);
    rng = next;
    const r = escoba.applyAction(state, id, action);
    if (!r.ok) throw new Error(`El bot hizo una jugada inválida: ${r.error}`);
    state = r.state;
    steps++;
  }
  return { state, steps };
}
