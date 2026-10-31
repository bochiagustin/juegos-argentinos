import { nextFloat, nextInt, type RngState } from "../core/index.ts";
import { chancho, tieneCuatro } from "./game.ts";
import { MESA_CHANCHO, type ChanchoAction, type ChanchoConfig, type ChanchoState, type ChanchoView } from "./types.ts";

/**
 * Bot del chancho va: junta la figura que más tiene y pasa la que menos (si se equivoca, cualquiera). El nivel también
 * marca qué tan rápido reacciona a la nariz (eso lo usa quien maneja el reloj: `demoraNariz`).
 */
export function chooseChanchoAction(view: ChanchoView, valid: readonly ChanchoAction[], rngIn: RngState, skill: number): [ChanchoAction, RngState] {
  if (valid.length === 0) throw new Error("El bot no tiene nada para hacer");
  let rng = rngIn;
  const nariz = valid.find((a) => a.type === "nariz");
  if (nariz && (view.fase === "nariz" || tieneCuatro(view.mano))) return [nariz, rng];
  const k = Math.min(10, Math.max(1, Math.round(skill)));
  const [r, r1] = nextFloat(rng);
  rng = r1;
  if (r < 0.3 * (1 - (k - 1) / 9)) {
    const [i, r2] = nextInt(rng, view.mano.length);
    return [{ type: "elegir", carta: i }, r2];
  }
  const cuenta = new Map<number, number>();
  for (const c of view.mano) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  // La figura que junto: la que más tengo (a igualdad, una al azar: si no, los bots se pasan las cartas en ronda).
  const max = Math.max(...cuenta.values());
  const empatadas = [...cuenta.keys()].filter((f) => cuenta.get(f) === max);
  const [im, r3] = nextInt(rng, empatadas.length);
  rng = r3;
  const meta = empatadas[im]!;
  // Paso una de las que menos tengo (nunca de la que junto, si hay otra); entre iguales, cualquiera.
  const candidatas = view.mano.map((c, i) => ({ c, i })).filter(({ c }) => c !== meta || view.mano.every((x) => x === meta));
  const min = Math.min(...candidatas.map(({ c }) => cuenta.get(c)!));
  const pasables = candidatas.filter(({ c }) => cuenta.get(c) === min);
  const [ip, r4] = nextInt(rng, pasables.length);
  return [{ type: "elegir", carta: pasables[ip]!.i }, r4];
}

/** Cuánto tarda un bot en tocarse la nariz (ms): de ~2,2 s en el nivel 1 a ~0,5 s en el 10, con un poco de azar. */
export function demoraNariz(skill: number, rng: RngState): [number, RngState] {
  const k = Math.min(10, Math.max(1, skill));
  const [r, next] = nextFloat(rng);
  return [Math.round((2200 - ((k - 1) * 1700) / 9) * (0.75 + r * 0.5)), next];
}

/** Partida entera entre bots (tests): la nariz se resuelve por orden de reacción. */
export function playChanchoBotGame(config: ChanchoConfig, skills: readonly number[], seed: string): { state: ChanchoState; steps: number } {
  const players = skills.map((_, i) => `bot-${i}`);
  let state = chancho.initialState(config, players, seed);
  let rng = state.rng;
  let steps = 0;
  const go = (id: string, a: ChanchoAction) => {
    const r = chancho.applyAction(state, id, a);
    if (!r.ok) throw new Error(`Jugada inválida (${id}): ${r.error}`);
    state = r.state;
    steps++;
  };
  while (state.fase !== "fin" && steps < 20000) {
    if (state.fase === "fin-ronda") {
      go(MESA_CHANCHO, { type: "seguir" });
      continue;
    }
    if (state.fase === "nariz") {
      // Reaccionan en orden de demora; el más lento se lleva la letra.
      const demoras = players
        .map((id, seat) => {
          const [d, next] = demoraNariz(skills[seat]!, rng);
          rng = next;
          return { id, seat, d };
        })
        .filter((x) => state.vivos[x.seat] && !state.nariz.includes(x.seat))
        .sort((a, b) => a.d - b.d);
      for (const x of demoras) if (state.fase === "nariz") go(x.id, { type: "nariz" });
      continue;
    }
    // Pasando: el que tiene 4 iguales se toca la nariz; si no, todos eligen y la mesa pasa.
    const conChancho = players.find((id) => chancho.getValidActions(state, id).some((a) => a.type === "nariz"));
    if (conChancho) {
      go(conChancho, { type: "nariz" });
      continue;
    }
    players.forEach((id, seat) => {
      const valid = chancho.getValidActions(state, id);
      if (!valid.length) return;
      const [a, next] = chooseChanchoAction(chancho.getPlayerView(state, id), valid, rng, skills[seat]!);
      rng = next;
      go(id, a);
    });
    go(MESA_CHANCHO, { type: "pasar" });
  }
  return { state, steps };
}
