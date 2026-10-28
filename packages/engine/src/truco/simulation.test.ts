import { describe, expect, it } from "vitest";
import { clone, createRng, nextFloat, pick } from "../core/index.ts";
import { trucoDeck } from "./cards.ts";
import { botProfile, chooseTrucoAction, playBotGame } from "./bot.ts";
import { actorSeat, truco } from "./game.ts";
import { DEFAULT_TRUCO_CONFIG, type TrucoConfig, type TrucoState } from "./types.ts";

/** Invariantes que tienen que valer en cualquier momento de cualquier partida. */
function checkInvariants(s: TrucoState) {
  const r = s.round;
  const n = s.config.players;
  const played = r.tricks.flatMap((t) => t.plays.map((p) => p.card.id));
  const inHands = r.hands.flat().map((c) => c.id);
  const all = [...played, ...inHands];
  expect(new Set(all).size).toBe(all.length);
  expect(all.length).toBe(3 * n);
  const deck = new Set(trucoDeck().map((c) => c.id));
  for (const id of all) expect(deck.has(id)).toBe(true);
  // Lo repartido = lo jugado + lo que queda en la mano.
  for (let seat = 0; seat < n; seat++) {
    const dealt = r.dealt[seat]!.map((c) => c.id).sort();
    const mine = [...r.hands[seat]!.map((c) => c.id), ...r.tricks.flatMap((t) => t.plays.filter((p) => p.seat === seat).map((p) => p.card.id))].sort();
    expect(mine).toEqual(dealt);
  }
  expect(r.tricks.length).toBeLessThanOrEqual(3);
  if (s.winner === null) {
    // Exactamente un jugador tiene algo para hacer.
    const withActions = s.players.filter((id) => truco.getValidActions(s, id).length > 0);
    expect(withActions).toEqual([s.players[actorSeat(s)!]]);
  } else {
    expect(s.players.every((id) => truco.getValidActions(s, id).length === 0)).toBe(true);
  }
}

// Simulaciones largas: más tiempo que el default de 5 s.
const LONG = 120_000;

describe("simulación de partidas completas", () => {
  const configs: TrucoConfig[] = [
    { ...DEFAULT_TRUCO_CONFIG, players: 2, target: 15 },
    { ...DEFAULT_TRUCO_CONFIG, players: 2, target: 30, flor: true },
    { ...DEFAULT_TRUCO_CONFIG, players: 4, target: 30 },
    { ...DEFAULT_TRUCO_CONFIG, players: 4, target: 15, flor: true, mazoSumaEnvido: false },
    { ...DEFAULT_TRUCO_CONFIG, players: 6, target: 30, faltaEnvido: "partido" },
    { ...DEFAULT_TRUCO_CONFIG, players: 6, target: 15, flor: true },
  ];

  it("jugadores al azar: 600 partidas terminan y respetan las invariantes en cada paso", () => {
    let rng = createRng("al-azar");
    for (let g = 0; g < 600; g++) {
      const config = configs[g % configs.length]!;
      const players = Array.from({ length: config.players }, (_, i) => `p${i}`);
      let s = truco.initialState(config, players, `azar-${g}`);
      let prevScore = [0, 0];
      for (let step = 0; s.winner === null; step++) {
        expect(step).toBeLessThan(3000);
        checkInvariants(s);
        const id = players[actorSeat(s)!]!;
        const valid = truco.getValidActions(s, id);
        // Que no se vayan al mazo todo el tiempo, así se juegan manos enteras.
        const [roll, r1] = nextFloat(rng);
        const options = roll < 0.97 ? valid.filter((a) => a.type !== "mazo") : valid;
        const [a, r2] = pick(r1, options.length ? options : valid);
        rng = r2;
        const res = truco.applyAction(s, id, a);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        s = res.state;
        expect(s.score[0]).toBeGreaterThanOrEqual(prevScore[0]!);
        expect(s.score[1]).toBeGreaterThanOrEqual(prevScore[1]!);
        prevScore = [s.score[0], s.score[1]];
      }
      checkInvariants(s);
      expect(Math.max(...s.score)).toBeGreaterThanOrEqual(config.target);
      expect(s.score[s.winner]).toBeGreaterThanOrEqual(config.target);
    }
  }, LONG);

  it("los bots siempre eligen jugadas válidas, en todos los niveles y formatos", () => {
    for (let g = 0; g < 60; g++) {
      const config = configs[g % configs.length]!;
      const skills = Array.from({ length: config.players }, (_, i) => ((g + i * 3) % 10) + 1);
      const { state } = playBotGame(config, skills, `bots-${g}`);
      expect(state.winner).not.toBeNull();
    }
  }, LONG);

  it("el nivel 10 le gana al nivel 1 más del 70% de las veces", () => {
    const config: TrucoConfig = { ...DEFAULT_TRUCO_CONFIG, players: 2, target: 15 };
    let strongWins = 0;
    const games = 300;
    for (let g = 0; g < games; g++) {
      // Alterna quién es el fuerte para no favorecer un asiento.
      const strongSeat = g % 2;
      const skills = strongSeat === 0 ? [10, 1] : [1, 10];
      const { state } = playBotGame(config, skills, `fuerza-${g}`);
      if (state.winner === strongSeat) strongWins++;
    }
    expect(strongWins / games).toBeGreaterThan(0.7);
  }, LONG);

  it("los niveles intermedios quedan en el medio", () => {
    const config: TrucoConfig = { ...DEFAULT_TRUCO_CONFIG, players: 2, target: 15 };
    let wins = 0;
    const games = 200;
    for (let g = 0; g < games; g++) {
      const s5 = g % 2;
      const { state } = playBotGame(config, s5 === 0 ? [5, 1] : [1, 5], `medio-${g}`);
      if (state.winner === s5) wins++;
    }
    expect(wins / games).toBeGreaterThan(0.55);
  }, LONG);

  it("el perfil escala con el nivel", () => {
    expect(botProfile(1).errorRate).toBeGreaterThan(botProfile(10).errorRate);
    expect(botProfile(10).samples).toBeGreaterThan(botProfile(3).samples);
    expect(botProfile(0).skill).toBe(1);
    expect(botProfile(99).skill).toBe(10);
  });

  it("el bot no hace trampa: decide igual sin importar las cartas ocultas de los demás", () => {
    const config: TrucoConfig = { ...DEFAULT_TRUCO_CONFIG, players: 2 };
    const s = truco.initialState(config, ["a", "b"], "trampa");
    const alt = clone(s);
    // Cambiamos las cartas del rival por otras que no están en juego.
    const used = new Set([...s.round.hands.flat()].map((c) => c.id));
    const free = trucoDeck().filter((c) => !used.has(c.id));
    const other = s.round.mano === 0 ? 1 : 0;
    alt.round.hands[other] = free.slice(0, 3);
    alt.round.dealt[other] = free.slice(0, 3);
    const id = s.players[s.round.mano]!;
    const rng = createRng("decision");
    const a = chooseTrucoAction(truco.getPlayerView(s, id), truco.getValidActions(s, id), rng, 10)[0];
    const b = chooseTrucoAction(truco.getPlayerView(alt, id), truco.getValidActions(alt, id), rng, 10)[0];
    expect(a).toEqual(b);
  });
});
