import { clone, createRng, nextInt, type ActionResult, type GameDefinition, type PlayerId } from "../core/index.ts";
import { COLORES_EXTRA, PAISES_EXTRA } from "./colores-paises.ts";
import { DICCIONARIO } from "./diccionario.ts";
import { ANIMALES_EXTRA, APELLIDOS_EXTRA, CIUDADES_EXTRA, COMIDAS_EXTRA, FRUTAS_VERDURAS_EXTRA, MARCAS_EXTRA, NOMBRES_EXTRA } from "./listas.ts";
import { MESA, type EstadoRespuesta, type TuttiAction, type TuttiConfig, type TuttiEvent, type TuttiRoundResult, type TuttiState, type TuttiView } from "./types.ts";

export const ALFABETO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
export const CATEGORIAS_DE_FABRICA = ["Nombre", "Apellido", "País", "Ciudad", "Animal", "Fruta o Verdura", "Color", "Cosa", "Marca", "Comida"];
export const LARGO_MAXIMO = 40;

export const DEFAULT_TUTTI_CONFIG: TuttiConfig = {
  players: 2,
  categorias: CATEGORIAS_DE_FABRICA,
  excluidas: ["Ñ", "K", "Q", "W", "X", "Y", "Z"],
  cuentaRegresiva: 5,
  tiempoMaximo: 150,
  fin: { tipo: "rondas", rondas: 5 },
  votacion: false,
};

/**
 * Normaliza para comparar: minúsculas, sin acentos (la ñ se respeta), solo letras, números y espacios simples.
 * "  Ñandú " → "ñandu", "Coca-Cola" → "coca cola".
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/[^a-zñ0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Letra con la que empieza (normalizada, en mayúscula). */
export const inicial = (texto: string) => (normalizar(texto)[0] ?? "").toUpperCase();

/** Validación automática: empieza con la letra, tiene al menos dos letras y alguna vocal. */
export function esValidaAuto(texto: string, letra: string): boolean {
  const n = normalizar(texto);
  if (n.length < 2 || inicial(n) !== letra) return false;
  if (!/[aeiouy]/.test(n)) return false;
  // "aaaa", "mmmm": una sola letra repetida no es una palabra.
  if (new Set(n.replace(/ /g, "")).size < 2) return false;
  return true;
}

const separar = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Lo que se valida además del diccionario de los bots (listas grandes por categoría). */
const EXTRAS: Readonly<Record<string, readonly string[]>> = {
  nombre: separar(NOMBRES_EXTRA),
  apellido: separar(APELLIDOS_EXTRA),
  pais: PAISES_EXTRA,
  ciudad: separar(CIUDADES_EXTRA),
  animal: separar(ANIMALES_EXTRA),
  "fruta o verdura": separar(FRUTAS_VERDURAS_EXTRA),
  color: COLORES_EXTRA,
  comida: separar(COMIDAS_EXTRA),
  marca: separar(MARCAS_EXTRA),
};

/**
 * Categorías "abiertas": no hay lista que las cubra enteras (apellidos, marcas), así que lo que no se conoce
 * no se rechaza: queda dudoso (vale, salvo que la mesa lo vote en contra).
 */
const ABIERTAS = new Set(["apellido", "marca"]);

const indice: Record<string, Set<string>> = {};
function conocidas(categoria: string): Set<string> | null {
  const key = normalizar(categoria);
  const lista = DICCIONARIO[key];
  if (!lista) return null;
  return (indice[key] ??= new Set([...lista, ...(EXTRAS[key] ?? [])].map(normalizar)));
}

// ── Palabras que se cargan aparte (no viven en el estado: son datos de referencia, como el diccionario) ──

/** Léxico general del castellano para la categoría "Cosa" (lo carga la app; si no está, "Cosa" queda abierta). */
let lexico: Set<string> | null = null;
/** Palabras que el jugador reportó como válidas en este dispositivo: `categoría normalizada` → palabras. */
let propias: Map<string, Set<string>> = new Map();

export function usarLexico(palabras: Iterable<string> | null): void {
  lexico = palabras ? new Set([...palabras].map(normalizar).filter(Boolean)) : null;
}

export function usarPalabrasPropias(lista: readonly { categoria: string; palabra: string }[]): void {
  propias = new Map();
  for (const { categoria, palabra } of lista) {
    const k = normalizar(categoria);
    if (!propias.has(k)) propias.set(k, new Set());
    propias.get(k)!.add(normalizar(palabra));
  }
}

/** ¿La máquina conoce esta respuesta? (null si la categoría no está en el diccionario) */
export function conocida(categoria: string, texto: string): boolean | null {
  const k = normalizar(categoria);
  const n = normalizar(texto);
  if (propias.get(k)?.has(n)) return true;
  if (k === "cosa" && lexico?.has(n)) return true;
  const set = conocidas(categoria);
  return set ? set.has(n) : null;
}

const LETRAS = "abcdefghijklmnñopqrstuvwxyz ";

/** Las palabras a una falta de ortografía (una letra de más, de menos, cambiada o dos dadas vuelta), con la misma inicial. */
function aUnaFalta(n: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= n.length; i++) {
    for (const l of LETRAS) {
      out.add(n.slice(0, i) + l + n.slice(i)); // de menos
      if (i < n.length) out.add(n.slice(0, i) + l + n.slice(i + 1)); // cambiada
    }
    if (i < n.length) out.add(n.slice(0, i) + n.slice(i + 1)); // de más
    if (i + 1 < n.length) out.add(n.slice(0, i) + n[i + 1] + n[i] + n.slice(i + 2)); // dadas vuelta
  }
  out.delete(n);
  return new Set([...out].filter((x) => x[0] === n[0] && x.trim() === x && !x.includes("  ")));
}

/** Largo mínimo para perdonar una falta (en palabras cortas, una letra cambia todo: "oso" / "ojo"). */
const LARGO_PARA_PERDONAR = 4;

/**
 * Qué dice el diccionario de una respuesta que ya pasó la validación automática (letra, vocales):
 * - "conocida": está tal cual (sin contar acentos ni mayúsculas).
 * - "perdonada": tiene una falta de ortografía; vale como `correccion`.
 * - "dudosa": no la conoce, pero la categoría es abierta (apellidos, marcas) o no tiene diccionario cargado.
 * - "desconocida": no está ni con una falta: se rechaza.
 * Categorías propias (sin diccionario): siempre "conocida".
 */
export function veredicto(categoria: string, texto: string): { tipo: "conocida" | "perdonada" | "dudosa" | "desconocida"; correccion: string | null } {
  const k = normalizar(categoria);
  const n = normalizar(texto);
  const curada = conocidas(categoria);
  const sets = [curada, propias.get(k) ?? null, k === "cosa" ? lexico : null].filter((x): x is Set<string> => x !== null);
  if (sets.length === 0) return { tipo: "conocida", correccion: null };
  if (sets.some((s) => s.has(n))) return { tipo: "conocida", correccion: null };
  if (n.replace(/ /g, "").length >= LARGO_PARA_PERDONAR) {
    for (const v of aUnaFalta(n)) if (sets.some((s) => s.has(v))) return { tipo: "perdonada", correccion: v };
  }
  if (ABIERTAS.has(k) || (k === "cosa" && !lexico)) return { tipo: "dudosa", correccion: null };
  return { tipo: "desconocida", correccion: null };
}

/** Palabras del diccionario para una categoría y una letra (las más comunes primero). */
export function palabrasPara(categoria: string, letra: string): readonly string[] {
  const lista = DICCIONARIO[normalizar(categoria)] ?? [];
  return lista.filter((p) => inicial(p) === letra);
}

export function letrasDisponibles(config: TuttiConfig, usadas: readonly string[]): string[] {
  const fuera = new Set(config.excluidas.map((l) => l.toUpperCase()));
  return ALFABETO.filter((l) => !fuera.has(l) && !usadas.includes(l));
}

const seatOf = (s: TuttiState, id: PlayerId) => s.players.indexOf(id);
const clave = (autor: number, categoria: number) => `${autor}-${categoria}`;

function validarConfig(c: TuttiConfig, players: number) {
  if (players < 2 || players > 10 || players !== c.players) throw new RangeError("El tutti-frutti es de 2 a 10 jugadores");
  if (c.categorias.length < 1 || c.categorias.length > 15) throw new RangeError("Entre 1 y 15 categorías");
  if (letrasDisponibles(c, []).length === 0) throw new RangeError("No queda ninguna letra para sortear");
}

/** Sortea la letra y abre una ronda nueva. */
function abrirRonda(s: TuttiState, ev: TuttiEvent[]) {
  const libres = letrasDisponibles(s.config, s.usadas);
  const [i, rng] = nextInt(s.rng, libres.length);
  s.rng = rng;
  s.letra = libres[i]!;
  s.usadas.push(s.letra);
  s.ronda += 1;
  s.fase = "escribiendo";
  s.respuestas = s.players.map(() => s.config.categorias.map(() => ""));
  s.bastaPor = null;
  s.rechazos = {};
  s.listos = s.players.map(() => false);
  ev.push({ type: "nueva-ronda", ronda: s.ronda, letra: s.letra });
}

/** Estado de cada respuesta antes de los votos (con el diccionario: faltas perdonadas, desconocidas y dudosas). */
function evaluar(s: TuttiState): { estados: EstadoRespuesta[][]; dudosas: boolean[][]; correcciones: (string | null)[][] } {
  const dudosas: boolean[][] = [];
  const correcciones: (string | null)[][] = [];
  const estados = s.respuestas.map((rs, p) => {
    dudosas.push([]);
    correcciones.push([]);
    return rs.map((r, c): EstadoRespuesta => {
      let estado: EstadoRespuesta = normalizar(r) === "" ? "vacia" : esValidaAuto(r, s.letra) ? "valida" : "invalida";
      let correccion: string | null = null;
      let dudosa = false;
      if (estado === "valida") {
        const v = veredicto(s.config.categorias[c]!, r);
        if (v.tipo === "desconocida") estado = "desconocida";
        correccion = v.correccion;
        dudosa = v.tipo === "dudosa";
      }
      dudosas[p]!.push(dudosa);
      correcciones[p]!.push(correccion);
      return estado;
    });
  });
  return { estados, dudosas, correcciones };
}

/** Rechazada si la mayoría de los demás votó en contra (empate: se acepta). */
export function rechazadaPorVotos(votos: number, players: number): boolean {
  return votos * 2 > players - 1;
}

/** Puntaje de una categoría: 20 si sos el único válido, 10 única, 5 repetida, 0 vacía o rechazada. */
export function puntuarCategoria(respuestas: readonly string[], validas: readonly boolean[]): number[] {
  const quienes = respuestas.map((_, i) => i).filter((i) => validas[i]);
  return respuestas.map((r, i) => {
    if (!validas[i]) return 0;
    if (quienes.length === 1) return 20;
    const n = normalizar(r);
    const iguales = quienes.filter((j) => normalizar(respuestas[j]!) === n).length;
    return iguales > 1 ? 5 : 10;
  });
}

function terminaPartida(s: TuttiState): boolean {
  const sinLetras = letrasDisponibles(s.config, s.usadas).length === 0;
  const max = Math.max(...s.score);
  const lideres = s.score.filter((p) => p === max).length;
  const cumplido = s.config.fin.tipo === "rondas" ? s.ronda >= s.config.fin.rondas : max >= s.config.fin.puntos;
  // Si hay empate arriba se juega otra ronda de desempate, mientras queden letras.
  return sinLetras || (cumplido && lideres === 1);
}

function cerrarRevision(s: TuttiState, ev: TuttiEvent[]) {
  const { estados, dudosas, correcciones } = evaluar(s);
  const n = s.players.length;
  for (let p = 0; p < n; p++)
    for (let c = 0; c < s.config.categorias.length; c++)
      if (estados[p]![c] === "valida" && rechazadaPorVotos(s.rechazos[clave(p, c)]?.length ?? 0, n)) estados[p]![c] = "rechazada";
  const puntos: number[][] = s.players.map(() => []);
  s.config.categorias.forEach((_, c) => {
    // Las perdonadas cuentan como la palabra bien escrita (así "Arjentina" y "Argentina" son repetidas).
    const pts = puntuarCategoria(
      s.respuestas.map((rs, p) => correcciones[p]![c] ?? rs[c]!),
      estados.map((e) => e[c] === "valida"),
    );
    pts.forEach((x, p) => puntos[p]!.push(x));
  });
  const total = puntos.map((ps) => ps.reduce((a, b) => a + b, 0));
  s.score = s.score.map((x, p) => x + total[p]!);
  const result: TuttiRoundResult = { ronda: s.ronda, letra: s.letra, respuestas: clone(s.respuestas), estados, dudosas, correcciones, puntos, total, score: [...s.score], bastaPor: s.bastaPor };
  s.history.push(result);
  ev.push({ type: "fin-ronda", result });
  s.listos = s.players.map(() => false);
  if (terminaPartida(s)) {
    const max = Math.max(...s.score);
    s.ganadores = s.score.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
    s.fase = "fin";
    ev.push({ type: "fin-partida", ganadores: s.ganadores, score: [...s.score] });
  } else {
    s.fase = "resultado";
  }
}

function cerrarEscritura(s: TuttiState, ev: TuttiEvent[]) {
  ev.push({ type: "cierre", ronda: s.ronda });
  if (s.config.votacion) {
    s.fase = "revision";
    s.listos = s.players.map(() => false);
  } else {
    cerrarRevision(s, ev);
  }
}

/** ¿Este jugador puede cantar ¡BASTA!? (todas las categorías completas y empezando con la letra) */
export function puedeBasta(s: TuttiState, seat: number): boolean {
  return s.fase === "escribiendo" && (s.respuestas[seat]?.every((r) => esValidaAuto(r, s.letra)) ?? false);
}

function computeValidActions(s: TuttiState, id: PlayerId): TuttiAction[] {
  if (s.fase === "fin") return [];
  if (id === MESA) {
    if (s.fase === "escribiendo" || s.fase === "basta") return [{ type: "cerrar" }];
    return [{ type: "seguir" }];
  }
  const seat = seatOf(s, id);
  if (seat < 0) return [];
  const out: TuttiAction[] = [];
  if (s.fase === "escribiendo" || s.fase === "basta") {
    // Representativas: el texto es libre (hasta LARGO_MAXIMO caracteres).
    s.config.categorias.forEach((_, c) => out.push({ type: "escribir", categoria: c, texto: "" }));
    if (puedeBasta(s, seat)) out.push({ type: "basta" });
  } else if (s.fase === "revision") {
    const { estados } = evaluar(s);
    estados.forEach((es, autor) => {
      if (autor === seat) return;
      es.forEach((e, c) => {
        if (e !== "valida") return;
        const ya = s.rechazos[clave(autor, c)]?.includes(seat) ?? false;
        out.push({ type: "votar", autor, categoria: c, rechazar: !ya });
      });
    });
    if (!s.listos[seat]) out.push({ type: "listo" });
  } else if (s.fase === "resultado" && !s.listos[seat]) {
    out.push({ type: "listo" });
  }
  return out;
}

function siguiente(s: TuttiState, ev: TuttiEvent[]) {
  if (s.fase === "revision") cerrarRevision(s, ev);
  else if (s.fase === "resultado") abrirRonda(s, ev);
}

export const tuttiFrutti: GameDefinition<TuttiConfig, TuttiState, TuttiAction, TuttiView, TuttiEvent> = {
  id: "tutti-frutti",

  initialState(config, players, seed) {
    validarConfig(config, players.length);
    const s: TuttiState = {
      config: clone(config),
      players: [...players],
      rng: createRng(seed),
      ronda: 0,
      letra: "",
      usadas: [],
      fase: "escribiendo",
      respuestas: [],
      bastaPor: null,
      rechazos: {},
      listos: [],
      score: players.map(() => 0),
      history: [],
      ganadores: null,
    };
    abrirRonda(s, []);
    return s;
  },

  getValidActions(state, playerId) {
    return computeValidActions(state, playerId);
  },

  applyAction(state, playerId, action): ActionResult<TuttiState, TuttiEvent> {
    if (state.fase === "fin") return { ok: false, error: "La partida terminó" };
    const s = clone(state);
    const ev: TuttiEvent[] = [];
    const seat = seatOf(s, playerId);
    const esMesa = playerId === MESA;
    if (!esMesa && seat < 0) return { ok: false, error: "No estás en la partida" };

    switch (action.type) {
      case "escribir": {
        if (esMesa || (s.fase !== "escribiendo" && s.fase !== "basta")) return { ok: false, error: "Ya no se puede escribir" };
        if (!Number.isInteger(action.categoria) || action.categoria < 0 || action.categoria >= s.config.categorias.length) return { ok: false, error: "Categoría inválida" };
        if (typeof action.texto !== "string" || action.texto.length > LARGO_MAXIMO) return { ok: false, error: "Respuesta muy larga" };
        s.respuestas[seat]![action.categoria] = action.texto;
        break;
      }
      case "basta": {
        if (esMesa || !puedeBasta(s, seat)) return { ok: false, error: "Para cantar ¡BASTA! tenés que completar todo con la letra" };
        s.fase = "basta";
        s.bastaPor = seat;
        ev.push({ type: "basta", seat });
        break;
      }
      case "cerrar": {
        if (!esMesa || (s.fase !== "escribiendo" && s.fase !== "basta")) return { ok: false, error: "No se puede cerrar ahora" };
        cerrarEscritura(s, ev);
        break;
      }
      case "votar": {
        if (esMesa || s.fase !== "revision") return { ok: false, error: "No se está votando" };
        const valida = computeValidActions(s, playerId).some((a) => a.type === "votar" && a.autor === action.autor && a.categoria === action.categoria);
        if (!valida) return { ok: false, error: "No podés votar esa respuesta" };
        const k = clave(action.autor, action.categoria);
        const actuales = (s.rechazos[k] ?? []).filter((x) => x !== seat);
        s.rechazos[k] = action.rechazar ? [...actuales, seat].sort((a, b) => a - b) : actuales;
        break;
      }
      case "listo": {
        if (esMesa || (s.fase !== "revision" && s.fase !== "resultado") || s.listos[seat]) return { ok: false, error: "No hace falta" };
        s.listos[seat] = true;
        if (s.listos.every(Boolean)) siguiente(s, ev);
        break;
      }
      case "seguir": {
        if (!esMesa || (s.fase !== "revision" && s.fase !== "resultado")) return { ok: false, error: "No se puede seguir ahora" };
        siguiente(s, ev);
        break;
      }
      default:
        return { ok: false, error: "Acción desconocida" };
    }
    return { ok: true, state: s, events: ev };
  },

  getPlayerView(state, playerId): TuttiView {
    const seat = seatOf(state, playerId);
    const s = state;
    const revision = s.fase === "revision" ? { respuestas: clone(s.respuestas), ...evaluar(s), rechazos: clone(s.rechazos) } : null;
    return {
      config: clone(s.config),
      seat,
      players: s.players.map((_, p) => ({ seat: p, llenas: s.respuestas[p]?.filter((r) => normalizar(r) !== "").length ?? 0, listo: s.listos[p] ?? false })),
      ronda: s.ronda,
      letra: s.letra,
      usadas: [...s.usadas],
      fase: s.fase,
      misRespuestas: seat >= 0 ? [...s.respuestas[seat]!] : [],
      bastaPor: s.bastaPor,
      revision,
      score: [...s.score],
      history: clone(s.history),
      ganadores: s.ganadores ? [...s.ganadores] : null,
    };
  },

  isGameOver(state) {
    return state.fase === "fin";
  },
};
