import { desvio, nextFloat, pick, type Rasgos, type RngState, type SuitedCard } from "../core/index.ts";
import { casita, sonCompaneros } from "./game.ts";
import type { CasitaAction, CasitaConfig, CasitaState, CasitaView } from "./types.ts";

/**
 * Bot de casita robada. Con nivel alto pesa el riesgo: cuántas cartas de ese número quedan sin ver
 * (la de arriba de tu casita queda expuesta a que te la roben) y qué le regala a los demás lo que deja en la mesa.
 */

/** Rasgos en la casita: el agresivo va a robar siempre que puede; el pescador cuida más su casita. */
export function casitaProfile(skill: number, rasgos?: Rasgos) {
  const t = (Math.min(10, Math.max(1, Math.round(skill))) - 1) / 9;
  // Medido en simulación: un peso de riesgo bajo (≤1,5) ayuda un poco; más alto hace que deje de levantar y pierda.
  const riesgo = 0.1 + 0.9 * t;
  if (!rasgos) return { errorRate: 0.35 * (1 - t) + 0.02, riesgo, ganasDeRobar: 1 };
  return { errorRate: 0.35 * (1 - t) + 0.02, riesgo: riesgo * (1 + 0.5 * desvio(rasgos.pescador)), ganasDeRobar: 1 + 0.3 * desvio(rasgos.agresivo) };
}

function unseenOfRank(view: CasitaView, rank: number): number {
  let seen = 0;
  for (const c of view.hand) if (c.rank === rank) seen++;
  for (const c of view.mesa) if (c.rank === rank) seen++;
  for (const p of view.players) if (p.top?.rank === rank) seen++;
  return Math.max(0, 4 - seen);
}

export function chooseCasitaAction(view: CasitaView, valid: readonly CasitaAction[], rngIn: RngState, skill: number, profile?: ReturnType<typeof casitaProfile>): [CasitaAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  const prof = profile ?? casitaProfile(skill);
  let rng = rngIn;
  const [roll, r1] = nextFloat(rng);
  rng = r1;
  if (roll < prof.errorRate) return pick(rng, valid);

  const rivals = view.players.filter((p) => p.seat !== view.seat && !sonCompaneros(view.config, view.seat, p.seat));
  const rivalCards = rivals.reduce((a, p) => a + p.cards, 0);
  const unknown = Math.max(1, 40 - view.hand.length - view.mesa.length - view.players.reduce((a, p) => a + p.casita, 0));
  /** Probabilidad aproximada de que algún rival tenga una carta de ese número. */
  const exposure = (rank: number) => Math.min(1, (unseenOfRank(view, rank) * rivalCards) / unknown);
  const me = view.players[view.seat]!;
  const mine = me.casita;
  /** Pérdida esperada si mi casita queda con ese número arriba (me la pueden robar). */
  const loss = (rank: number | undefined, size: number) => (rank === undefined || size === 0 ? 0 : exposure(rank) * size);

  let best = valid[0]!;
  let bestScore = -Infinity;
  for (const a of valid) {
    const card = view.hand.find((c) => c.id === a.card) as SuitedCard;
    const j = a.jugada;
    let gain: number;
    let risk: number;
    if (j.tipo === "robar") {
      const victim = view.players[j.de]!.casita;
      // Lo que gano yo y lo que pierde el rival.
      gain = (2 * victim + 1) * prof.ganasDeRobar;
      risk = loss(card.rank, mine + victim + 1);
    } else if (j.tipo === "mesa") {
      const taken = view.config.levantar === "todas" ? view.mesa.filter((c) => c.rank === card.rank).length : 1;
      gain = taken + 1;
      risk = loss(card.rank, mine + taken + 1);
    } else if (j.tipo === "propia") {
      gain = 1;
      risk = loss(card.rank, mine + 1);
    } else {
      // Dejarla en la mesa: mi casita sigue expuesta como está y el rival puede levantar esa carta.
      gain = -2 * exposure(card.rank);
      risk = loss(me.top?.rank, mine);
    }
    const score = gain - prof.riesgo * risk;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return [best, rng];
}

export function playCasitaBotGame(config: CasitaConfig, skills: readonly number[], seed: string): { state: CasitaState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = casita.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  while (state.result === null && steps < 500) {
    const id = players[state.turn]!;
    const [action, next] = chooseCasitaAction(casita.getPlayerView(state, id), casita.getValidActions(state, id), rng, skills[state.turn]!);
    rng = next;
    const r = casita.applyAction(state, id, action);
    if (!r.ok) throw new Error(`El bot hizo una jugada inválida: ${r.error}`);
    state = r.state;
    steps++;
  }
  return { state, steps };
}
