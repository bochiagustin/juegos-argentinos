import { desvio, type Rasgos } from "../core/rasgos.ts";
import { nextFloat, nextInt, type RngState } from "../core/rng.ts";
import { conocida, DEFAULT_TUTTI_CONFIG, palabrasPara, tuttiFrutti } from "./game.ts";
import { MESA, type TuttiAction, type TuttiConfig, type TuttiState, type TuttiView } from "./types.ts";

export interface TuttiProfile {
  /** Probabilidad de que se le ocurra algo en una categoría (si hay palabras con esa letra). */
  conoce: number;
  /** Segundos promedio por respuesta. */
  segundos: number;
  /** Probabilidad de buscar una palabra menos común (para no repetir). */
  rareza: number;
}

/** Rasgos en el tutti-frutti: el agresivo escribe más rápido; el pescador busca palabras raras para quedarse solo. */
export function tuttiProfile(skill: number, rasgos?: Rasgos): TuttiProfile {
  const t = (Math.min(10, Math.max(1, skill)) - 1) / 9;
  const p = { conoce: 0.45 + 0.5 * t, segundos: 20 - 13 * t, rareza: 0.1 + 0.75 * t };
  if (rasgos) {
    p.segundos *= 1 - 0.2 * desvio(rasgos.agresivo);
    p.rareza = Math.min(1, Math.max(0, p.rareza + 0.2 * desvio(rasgos.pescador)));
  }
  return p;
}

export interface TuttiPlan {
  /** Lo que va a escribir en cada categoría ("" si no se le ocurre nada). */
  respuestas: string[];
  /** En qué orden y a los cuántos milisegundos de empezada la ronda escribe cada una. */
  pasos: { categoria: number; ms: number }[];
}

/** Plan de un bot para la ronda: qué contesta y cuándo. Juega limpio: solo usa la letra y las categorías. */
export function planTutti(view: TuttiView, rng: RngState, skill: number, rasgos?: Rasgos): [TuttiPlan, RngState] {
  const p = tuttiProfile(skill, rasgos);
  let r = rng;
  const rand = () => {
    const [x, n] = nextFloat(r);
    r = n;
    return x;
  };
  const respuestas = view.config.categorias.map((cat) => {
    const opciones = palabrasPara(cat, view.letra);
    if (opciones.length === 0 || rand() >= p.conoce) return "";
    const comunes = Math.min(3, opciones.length);
    const [i, n] = rand() < p.rareza ? nextInt(r, opciones.length) : nextInt(r, comunes);
    r = n;
    return opciones[i]!;
  });
  // Orden al azar; cada respuesta le lleva un rato.
  const orden = view.config.categorias.map((_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const [j, n] = nextInt(r, i + 1);
    r = n;
    [orden[i], orden[j]] = [orden[j]!, orden[i]!];
  }
  let ms = 1500;
  const pasos: TuttiPlan["pasos"] = [];
  for (const c of orden) {
    ms += Math.round(p.segundos * 1000 * (0.55 + 0.9 * rand()));
    if (respuestas[c]) pasos.push({ categoria: c, ms });
  }
  return [{ respuestas, pasos }, r];
}

/** Votos de un bot en la revisión: rechaza a veces lo que no conoce (el mentiroso, más seguido); nunca lo que conoce. */
export function votosTutti(view: TuttiView, valid: readonly TuttiAction[], rng: RngState, skill: number, rasgos?: Rasgos): [TuttiAction[], RngState] {
  let r = rng;
  const out: TuttiAction[] = [];
  const rev = view.revision;
  if (!rev) return [valid.some((a) => a.type === "listo") ? [{ type: "listo" }] : [], r];
  const exigencia = Math.min(0.95, 0.25 + 0.05 * skill + (rasgos ? 0.2 * desvio(rasgos.mentiroso) : 0));
  for (const a of valid) {
    if (a.type !== "votar" || !a.rechazar) continue;
    if (!rev.dudosas[a.autor]?.[a.categoria]) continue;
    const texto = rev.respuestas[a.autor]![a.categoria]!;
    if (conocida(view.config.categorias[a.categoria]!, texto) !== false) continue;
    const [x, n] = nextFloat(r);
    r = n;
    if (x < exigencia) out.push(a);
  }
  if (valid.some((a) => a.type === "listo")) out.push({ type: "listo" });
  return [out, r];
}

/**
 * Partida completa entre bots, simulando el reloj (para tests y para medir la fuerza de los niveles).
 * Quien completa todo primero canta ¡BASTA! y la mesa cierra después de la cuenta regresiva.
 */
export function playTuttiBotGame(config: Partial<TuttiConfig>, skills: readonly number[], seed: string, rngSeed: RngState = [1, 2, 3, 4]): TuttiState {
  const cfg: TuttiConfig = { ...DEFAULT_TUTTI_CONFIG, ...config, players: skills.length };
  const ids = skills.map((_, i) => `bot-${i}`);
  let s = tuttiFrutti.initialState(cfg, ids, seed);
  let rng = rngSeed;
  const aplicar = (id: string, a: TuttiAction) => {
    const res = tuttiFrutti.applyAction(s, id, a);
    if (!res.ok) throw new Error(`${id} ${JSON.stringify(a)}: ${res.error}`);
    s = res.state;
  };
  for (let guard = 0; guard < 200 && !tuttiFrutti.isGameOver(s); guard++) {
    if (s.fase === "escribiendo") {
      const planes = ids.map((id, i) => {
        const [plan, n] = planTutti(tuttiFrutti.getPlayerView(s, id), rng, skills[i]!);
        rng = n;
        return plan;
      });
      // Quién termina primero (con todo completo) canta basta.
      const finales = planes.map((p) => (p.respuestas.every(Boolean) ? Math.max(...p.pasos.map((x) => x.ms)) : Infinity));
      const primero = Math.min(...finales);
      const cierre = Math.min(cfg.tiempoMaximo * 1000, primero + cfg.cuentaRegresiva * 1000);
      const pasos = planes.flatMap((p, i) => p.pasos.map((x) => ({ ...x, i, texto: p.respuestas[x.categoria]! }))).sort((a, b) => a.ms - b.ms);
      for (const x of pasos) {
        if (x.ms > cierre) break;
        aplicar(ids[x.i]!, { type: "escribir", categoria: x.categoria, texto: x.texto });
        if (s.fase === "escribiendo" && x.ms === primero && finales[x.i] === primero) aplicar(ids[x.i]!, { type: "basta" });
      }
      aplicar(MESA, { type: "cerrar" });
    } else if (s.fase === "revision") {
      for (const [i, id] of ids.entries()) {
        if (s.fase !== "revision") break;
        const [votos, n] = votosTutti(tuttiFrutti.getPlayerView(s, id), tuttiFrutti.getValidActions(s, id), rng, skills[i]!);
        rng = n;
        for (const v of votos) if (s.fase === "revision") aplicar(id, v);
      }
    } else if (s.fase === "resultado") {
      for (const id of ids) if (s.fase === "resultado") aplicar(id, { type: "listo" });
    }
  }
  return s;
}
