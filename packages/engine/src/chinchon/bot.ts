import { nextFloat, pick, type Card, type RngState } from "../core/index.ts";
import { chinchon, rulesOf } from "./game.ts";
import { bestArrangement, cardPoints, type MeldRules } from "./melds.ts";
import type { ChinchonAction, ChinchonConfig, ChinchonState, ChinchonView } from "./types.ts";

/**
 * Bot de chinchón. Mira solo su mano, el pozo y cuántas cartas tienen los demás.
 * Nivel bajo: se equivoca seguido y tira "a ojo". Nivel alto: evalúa exacto qué le deja cada descarte,
 * cuida las cartas con futuro (pares, casi-escaleras) y no regala lo que levantó el de al lado.
 */

export interface ChinchonBotProfile {
  errorRate: number;
  /** Peso del "futuro" de una carta suelta al decidir qué tirar. */
  potential: number;
  /** Mejora mínima (en puntos sueltos) para levantar del pozo. */
  pozoThreshold: number;
  /** Probabilidad de ver que puede cortar. */
  seesCut: number;
}

export function chinchonProfile(skill: number): ChinchonBotProfile {
  const t = (Math.min(10, Math.max(1, Math.round(skill))) - 1) / 9;
  // Medido en simulación: un peso de "futuro" moderado (~1) rinde más que ninguno o demasiado.
  return { errorRate: 0.3 * (1 - t) + 0.02, potential: 0.2 + 0.8 * t, pozoThreshold: 3 - 2 * t, seesCut: 0.75 + 0.25 * t };
}

/** Cuánto "futuro" tiene una carta en esta mano: compañeras del mismo número o del mismo palo cerca. */
function potentialOf(c: Card, hand: readonly Card[], rules: MeldRules): number {
  if (c.kind === "joker") return 10;
  let p = 0;
  const pos = rules.seq.indexOf(c.rank);
  for (const o of hand) {
    if (o === c || o.kind === "joker") continue;
    if (o.rank === c.rank) p += 1.2;
    if (o.suit === c.suit) {
      const d = Math.abs(rules.seq.indexOf(o.rank) - pos);
      if (d === 1) p += 1.1;
      else if (d === 2) p += 0.6;
    }
  }
  return p;
}

/** Qué tan buena queda la mano: puntos sueltos menos el futuro de las sueltas (más bajo = mejor). */
function handScore(hand: readonly Card[], rules: MeldRules, potentialWeight: number): number {
  const arr = bestArrangement(hand, rules);
  let pot = 0;
  for (const c of arr.loose) pot += potentialOf(c, arr.loose, rules) * Math.min(6, cardPoints(c, rules)) * 0.25;
  return arr.looseSum - pot * potentialWeight;
}

function bestDiscard(hand: readonly Card[], banned: string | null, rules: MeldRules, prof: ChinchonBotProfile): { card: Card; score: number } {
  let best: { card: Card; score: number } | null = null;
  for (const c of hand) {
    if (c.id === banned || c.kind === "joker") continue;
    const rest = hand.filter((x) => x !== c);
    const score = handScore(rest, rules, prof.potential) - cardPoints(c, rules) * 0.01;
    if (!best || score < best.score) best = { card: c, score };
  }
  return best ?? { card: hand.find((c) => c.id !== banned)!, score: Infinity };
}

export function chooseChinchonAction(view: ChinchonView, valid: readonly ChinchonAction[], rngIn: RngState, skill: number, profile?: ChinchonBotProfile): [ChinchonAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  const prof = profile ?? chinchonProfile(skill);
  const rules = rulesOf(view.config as ChinchonConfig);
  let rng = rngIn;
  const roll = () => {
    const [v, next] = nextFloat(rng);
    rng = next;
    return v;
  };

  if (view.phase === "robar") {
    const fromPozo = valid.find((a) => a.type === "robar" && a.de === "pozo");
    const fromMazo = valid.find((a) => a.type === "robar" && a.de === "mazo");
    if (!fromMazo) return [fromPozo!, rng];
    if (!fromPozo || !view.pozoTop) return [fromMazo, rng];
    if (roll() < prof.errorRate) return [roll() < 0.5 ? fromPozo : fromMazo, rng];
    if (view.pozoTop.kind === "joker") return [fromPozo, rng];
    const now = handScore(view.hand, rules, prof.potential);
    const withTop = bestDiscard([...view.hand, view.pozoTop], view.pozoTop.id, rules, prof).score;
    return [now - withTop >= prof.pozoThreshold ? fromPozo : fromMazo, rng];
  }

  const cuts = valid.filter((a): a is Extract<ChinchonAction, { type: "cortar" }> => a.type === "cortar");
  if (cuts.length > 0 && roll() < prof.seesCut) {
    // Cortar con la carta que deja menos suelto (ideal: menos diez).
    let best = cuts[0]!;
    let bestSum = Infinity;
    for (const a of cuts) {
      const sum = bestArrangement(
        view.hand.filter((c) => c.id !== a.card),
        rules,
      ).looseSum;
      if (sum < bestSum) {
        bestSum = sum;
        best = a;
      }
    }
    return [best, rng];
  }

  const discards = valid.filter((a) => a.type === "descartar");
  if (roll() < prof.errorRate) {
    const options = discards.filter((a) => a.type === "descartar" && !a.card.startsWith("comodin"));
    return pick(rng, options.length ? options : discards);
  }
  const { card } = bestDiscard(view.hand, view.tomadaDelPozo, rules, prof);
  return [discards.find((a) => a.type === "descartar" && a.card === card.id) ?? discards[0]!, rng];
}

/** Juega una partida entera entre bots (para tests y simulaciones). */
export function playChinchonBotGame(config: ChinchonConfig, skills: readonly number[], seed: string, maxSteps = 20000): { state: ChinchonState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = chinchon.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  while (state.winner === null && steps < maxSteps) {
    const id = players[state.turn]!;
    const valid = chinchon.getValidActions(state, id);
    const [action, next] = chooseChinchonAction(chinchon.getPlayerView(state, id), valid, rng, skills[state.turn]!);
    rng = next;
    const r = chinchon.applyAction(state, id, action);
    if (!r.ok) throw new Error(`El bot hizo una jugada inválida: ${r.error}`);
    state = r.state;
    steps++;
  }
  return { state, steps };
}
