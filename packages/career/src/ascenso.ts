import { CATEGORIAS, CLUBES, club, NOMBRE_CATEGORIA, type Categoria } from "./clubes.ts";
import { GIRAS } from "./data.ts";
import type { CareerGame } from "./types.ts";

/**
 * El Ascenso: tu club arranca en la Primera C y juega temporadas de 20 equipos a una rueda (19 fechas, 3 puntos por
 * victoria, sin empates). El 1º asciende directo; del 2º al 8º juegan el Reducido (cuartos, semis y final; el 2º pasa
 * directo a semis) y el campeón también sube. Los dos últimos descienden (en la C no hay a dónde). En Primera, el 1º
 * sale campeón. En el calendario se meten las 5 rondas de la Copa Argentina (32 clubes de todas las categorías).
 * Los partidos entre clubes de la máquina se simulan según el nivel. Todo es puro y determinístico (semilla).
 */

export const YO_CLUB = "yo";
export const EQUIPOS = 20;

export interface FilaTabla {
  pj: number;
  pg: number;
  pp: number;
  pts: number;
}

export interface Cruce {
  a: string;
  b: string;
  ganador?: string;
}

export interface Reducido {
  /** Del 2º al 8º de la tabla, en ese orden. */
  sembrados: string[];
  rondas: Cruce[][];
}

export type ResultadoTemporada = "campeon" | "ascenso" | "ascenso-reducido" | "reducido" | "queda" | "descenso";

export interface ResumenTemporada {
  temporada: number;
  categoria: Categoria;
  puesto: number;
  resultado: ResultadoTemporada;
  /** Hasta qué ronda llegaste en la Copa (0 = 16avos … 4 = final, 5 = campeón). */
  copa: number;
  /** Dónde jugás la temporada que viene. */
  nueva: Categoria;
}

export interface AscensoProgress {
  version: 1;
  temporada: number;
  semilla: string;
  /** Los 20 clubes de cada categoría esta temporada (`YO_CLUB` sos vos). */
  categorias: Record<Categoria, string[]>;
  /** Orden del fixture de mi categoría (método del círculo). */
  orden: string[];
  /** Por dónde va el calendario (índice en `CALENDARIO`). */
  paso: number;
  /** Tabla de mi categoría. */
  tabla: Record<string, FilaTabla>;
  /** Cuadro de la Copa: copa[0] son los 32, copa[r + 1] los que ganaron la ronda r. */
  copa: string[][];
  fase: "liga" | "reducido" | "fin";
  reducido: Reducido | null;
  /** Cómo terminó la temporada (en la fase "fin"). */
  resumen: ResumenTemporada | null;
  historial: ResumenTemporada[];
}

export type Fecha = { tipo: "liga"; fecha: number } | { tipo: "copa"; ronda: number };

export const RONDAS_COPA = ["16avos de final", "Octavos de final", "Cuartos de final", "Semifinal", "Final"] as const;
export const RONDAS_REDUCIDO = ["Cuartos de final", "Semifinal", "Final"] as const;
const COPA_DESPUES_DE = [3, 7, 11, 15, 18];

/** 19 fechas con las 5 rondas de la Copa intercaladas. */
export const CALENDARIO: readonly Fecha[] = Array.from({ length: EQUIPOS - 1 }, (_, i) => i + 1).flatMap((fecha): Fecha[] => {
  const r = COPA_DESPUES_DE.indexOf(fecha);
  return r === -1 ? [{ tipo: "liga", fecha }] : [{ tipo: "liga", fecha }, { tipo: "copa", ronda: r }];
});

// --- Azar determinístico ---

function azar(clave: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < clave.length; i++) {
    const ch = clave.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 2 ** 53;
}

function mezclar<T>(xs: readonly T[], clave: string): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar(`${clave}:${i}`) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function nivelClub(id: string): number {
  return club(id)?.nivel ?? 5;
}

/** Partido entre dos clubes de la máquina: gana más seguido el de mejor nivel (3 niveles de diferencia ≈ 80%). */
function simular(a: string, b: string, clave: string): string {
  const p = 1 / (1 + Math.exp(-0.45 * (nivelClub(a) - nivelClub(b))));
  return azar(clave) < p ? a : b;
}

const clave = (p: AscensoProgress, ...partes: (string | number)[]) => [p.semilla, p.temporada, ...partes].join(":");

// --- Liga ---

/** Los partidos de una fecha (1–19) con el método del círculo. */
export function fixture(orden: readonly string[], fecha: number): [string, string][] {
  const n = orden.length;
  const resto = orden.slice(1);
  const arr = [orden[0]!, ...resto.map((_, i) => resto[(i + fecha - 1) % (n - 1)]!)];
  return Array.from({ length: n / 2 }, (_, i) => (fecha % 2 ? [arr[i]!, arr[n - 1 - i]!] : [arr[n - 1 - i]!, arr[i]!]) as [string, string]);
}

const filaVacia = (): FilaTabla => ({ pj: 0, pg: 0, pp: 0, pts: 0 });

function sumar(tabla: Record<string, FilaTabla>, ganador: string, perdedor: string) {
  const g = (tabla[ganador] ??= filaVacia());
  const q = (tabla[perdedor] ??= filaVacia());
  g.pj++;
  g.pg++;
  g.pts += 3;
  q.pj++;
  q.pp++;
}

/** La tabla ordenada: puntos y, a igualdad, un sorteo fijo de la temporada. */
export function posiciones(tabla: Record<string, FilaTabla>, ids: readonly string[], sorteo: string): string[] {
  const f = (id: string) => tabla[id] ?? filaVacia();
  return ids.slice().sort((a, b) => f(b).pts - f(a).pts || f(b).pg - f(a).pg || azar(sorteo + a) - azar(sorteo + b));
}

export function miCategoria(p: AscensoProgress): Categoria {
  return CATEGORIAS.find((c) => p.categorias[c].includes(YO_CLUB))!;
}

export function tablaOrdenada(p: AscensoProgress): { id: string; puesto: number; fila: FilaTabla }[] {
  return posiciones(p.tabla, p.categorias[miCategoria(p)], clave(p, "sorteo")).map((id, i) => ({ id, puesto: i + 1, fila: p.tabla[id] ?? filaVacia() }));
}

function simularTemporada(ids: readonly string[], k: string): string[] {
  const tabla: Record<string, FilaTabla> = {};
  const orden = mezclar(ids, `${k}:fixture`);
  for (let f = 1; f < EQUIPOS; f++) for (const [a, b] of fixture(orden, f)) {
    const g = simular(a, b, `${k}:${f}:${a}`);
    sumar(tabla, g, g === a ? b : a);
  }
  return posiciones(tabla, ids, `${k}:sorteo`);
}

// --- Reducido ---

function siguienteRonda(red: Reducido) {
  const s = red.sembrados;
  const seed = (id: string) => s.indexOf(id);
  const ganadores = (r: Cruce[]) => r.map((c) => c.ganador!).sort((a, b) => seed(a) - seed(b));
  if (red.rondas.length === 0) red.rondas.push([{ a: s[1]!, b: s[6]! }, { a: s[2]!, b: s[5]! }, { a: s[3]!, b: s[4]! }]);
  else if (red.rondas.length === 1) {
    const [w0, w1, w2] = ganadores(red.rondas[0]!);
    red.rondas.push([{ a: s[0]!, b: w2! }, { a: w0!, b: w1! }]);
  } else {
    const [w0, w1] = ganadores(red.rondas[1]!);
    red.rondas.push([{ a: w0!, b: w1! }]);
  }
}

/** Simula lo que no me toca jugar. Devuelve true si el Reducido terminó. */
function avanzarReducido(red: Reducido, k: string): boolean {
  for (;;) {
    if (red.rondas.length === 0) siguienteRonda(red);
    const ronda = red.rondas[red.rondas.length - 1]!;
    const pendientes = ronda.filter((c) => !c.ganador);
    if (pendientes.some((c) => c.a === YO_CLUB || c.b === YO_CLUB)) return false;
    for (const c of pendientes) c.ganador = simular(c.a, c.b, `${k}:red:${red.rondas.length}:${c.a}`);
    if (ronda.length === 1) return true;
    siguienteRonda(red);
  }
}

export function campeonReducido(red: Reducido | null): string | null {
  const final = red?.rondas[2]?.[0];
  return final?.ganador ?? null;
}

// --- Copa Argentina ---

function armarCopa(categorias: Record<Categoria, string[]>, k: string): string[][] {
  const part: string[] = [];
  for (const cat of CATEGORIAS) {
    const ids = categorias[cat];
    const yo = ids.includes(YO_CLUB);
    part.push(...mezclar(ids.filter((x) => x !== YO_CLUB), `${k}:copa:${cat}`).slice(0, yo ? 7 : 8));
    if (yo) part.push(YO_CLUB);
  }
  return [mezclar(part, `${k}:cuadro`)];
}

function jugarRondaCopa(p: AscensoProgress, ronda: number, mio?: string) {
  const vivos = p.copa[ronda]!;
  const pasan: string[] = [];
  for (let i = 0; i < vivos.length; i += 2) {
    const a = vivos[i]!;
    const b = vivos[i + 1]!;
    pasan.push(a === YO_CLUB || b === YO_CLUB ? mio! : simular(a, b, clave(p, "copa", ronda, a)));
  }
  p.copa[ronda + 1] = pasan;
}

/** Hasta dónde llegué en la Copa: 0 = 16avos … 5 = campeón. */
export function rondaCopa(p: AscensoProgress): number {
  let r = 0;
  for (let i = 0; i < p.copa.length; i++) if (p.copa[i]!.includes(YO_CLUB)) r = i;
  return r;
}

// --- Temporadas ---

function arrancarTemporada(p: AscensoProgress) {
  const k = clave(p);
  p.orden = mezclar(p.categorias[miCategoria(p)], `${k}:fixture`);
  p.tabla = Object.fromEntries(p.orden.map((id) => [id, filaVacia()]));
  p.copa = armarCopa(p.categorias, k);
  p.paso = 0;
  p.fase = "liga";
  p.reducido = null;
  p.resumen = null;
}

export function iniciarAscenso(semilla: string): AscensoProgress {
  const categorias = Object.fromEntries(CATEGORIAS.map((c) => [c, CLUBES.filter((x) => x.categoria === c).map((x) => x.id)])) as Record<Categoria, string[]>;
  categorias.c.push(YO_CLUB);
  const p: AscensoProgress = { version: 1, temporada: 1, semilla, categorias, orden: [], paso: 0, tabla: {}, copa: [], fase: "liga", reducido: null, resumen: null, historial: [] };
  arrancarTemporada(p);
  return p;
}

/** Después del resumen: la temporada siguiente, con los que subieron y bajaron. */
export function nuevaTemporada(p0: AscensoProgress): AscensoProgress {
  const p = copia(p0);
  if (p.fase !== "fin") return p;
  p.temporada++;
  arrancarTemporada(p);
  return p;
}

export interface Partido {
  rival: string;
  etapa: "liga" | "copa" | "reducido";
  /** "Fecha 5", "Copa Argentina · Octavos de final", "Reducido · Final". */
  titulo: string;
}

export function proximoPartido(p: AscensoProgress): Partido | null {
  if (p.fase === "fin") return null;
  if (p.fase === "reducido") {
    const n = p.reducido?.rondas.length ?? 0;
    const c = p.reducido?.rondas[n - 1]?.find((x) => !x.ganador && (x.a === YO_CLUB || x.b === YO_CLUB));
    return c ? { rival: c.a === YO_CLUB ? c.b : c.a, etapa: "reducido", titulo: `Reducido · ${RONDAS_REDUCIDO[n - 1]}` } : null;
  }
  const f = CALENDARIO[p.paso];
  if (!f) return null;
  if (f.tipo === "liga") {
    const par = fixture(p.orden, f.fecha).find((x) => x.includes(YO_CLUB))!;
    return { rival: par[0] === YO_CLUB ? par[1] : par[0], etapa: "liga", titulo: `Fecha ${f.fecha}` };
  }
  const vivos = p.copa[f.ronda]!;
  const i = vivos.indexOf(YO_CLUB);
  return { rival: vivos[i ^ 1]!, etapa: "copa", titulo: `Copa Argentina · ${RONDAS_COPA[f.ronda]}` };
}

export interface ResultadoAscenso {
  progreso: AscensoProgress;
  lineas: string[];
  fosforos: number;
  /** Para los logros. */
  ascendi: boolean;
  llegueAPrimera: boolean;
  campeon: boolean;
  copa: boolean;
}

/**
 * Registra mi partido contra `rival`. Si no es el partido que me toca (ej. una revancha), no cuenta: devuelve null.
 * Simula el resto de la fecha y, si hace falta, las rondas de copa sin mí, el Reducido y el cierre de la temporada.
 */
export function registrarAscenso(p0: AscensoProgress, rival: string, ganada: boolean): ResultadoAscenso | null {
  const prox = proximoPartido(p0);
  if (!prox || prox.rival !== rival) return null;
  const p = copia(p0);
  const r: ResultadoAscenso = { progreso: p, lineas: [], fosforos: 0, ascendi: false, llegueAPrimera: false, campeon: false, copa: false };
  const cat = miCategoria(p);
  const nombre = club(rival)?.nombre ?? rival;
  if (prox.etapa === "liga") {
    const f = CALENDARIO[p.paso] as Extract<Fecha, { tipo: "liga" }>;
    for (const [a, b] of fixture(p.orden, f.fecha)) {
      const g = a === YO_CLUB || b === YO_CLUB ? (ganada ? YO_CLUB : rival) : simular(a, b, clave(p, "liga", f.fecha, a));
      sumar(p.tabla, g, g === a ? b : a);
    }
    p.paso++;
    const puesto = tablaOrdenada(p).find((x) => x.id === YO_CLUB)!.puesto;
    r.lineas.push(ganada ? `⚽ Fecha ${f.fecha}: le ganaste a ${nombre}, +3 puntos` : `Fecha ${f.fecha}: perdiste con ${nombre}, 0 puntos`);
    r.lineas.push(`📊 Vas ${puesto}º en la ${NOMBRE_CATEGORIA[cat]}`);
    if (ganada) r.fosforos += 10;
  } else if (prox.etapa === "copa") {
    const ronda = (CALENDARIO[p.paso] as Extract<Fecha, { tipo: "copa" }>).ronda;
    jugarRondaCopa(p, ronda, ganada ? YO_CLUB : rival);
    p.paso++;
    if (!ganada) r.lineas.push(`Quedaste afuera de la Copa Argentina en ${RONDAS_COPA[ronda]!.toLowerCase()}`);
    else if (ronda === RONDAS_COPA.length - 1) {
      r.lineas.push("🏆 ¡Campeón de la Copa Argentina!");
      r.fosforos += 250;
      r.copa = true;
    } else {
      r.lineas.push(`🏆 Copa Argentina: pasaste a ${RONDAS_COPA[ronda + 1]!.toLowerCase()}`);
      r.fosforos += 10 + 10 * ronda;
    }
  } else {
    const red = p.reducido!;
    const ronda = red.rondas[red.rondas.length - 1]!;
    const c = ronda.find((x) => !x.ganador && (x.a === YO_CLUB || x.b === YO_CLUB))!;
    c.ganador = ganada ? YO_CLUB : rival;
    r.lineas.push(ganada ? `🔥 Reducido: ganaste la ${prox.titulo.split(" · ")[1]!.toLowerCase()}` : `Reducido: te eliminó ${nombre}`);
    if (ganada) r.fosforos += 25;
  }
  avanzar(p, r);
  return r;
}

function avanzar(p: AscensoProgress, r: ResultadoAscenso) {
  if (p.fase === "liga") {
    // Las rondas de copa en las que ya no estoy se juegan solas.
    for (let f = CALENDARIO[p.paso]; f?.tipo === "copa" && !p.copa[f.ronda]!.includes(YO_CLUB); f = CALENDARIO[p.paso]) {
      jugarRondaCopa(p, f.ronda);
      p.paso++;
    }
    if (p.paso < CALENDARIO.length) return;
    if (miCategoria(p) === "primera") return cerrar(p, r);
    const orden = tablaOrdenada(p).map((x) => x.id);
    p.reducido = { sembrados: orden.slice(1, 8), rondas: [] };
    p.fase = "reducido";
    if (p.reducido.sembrados.includes(YO_CLUB)) r.lineas.push("🔥 ¡Entraste al Reducido!");
  }
  if (p.fase === "reducido" && avanzarReducido(p.reducido!, clave(p))) cerrar(p, r);
}

function cerrar(p: AscensoProgress, r: ResultadoAscenso) {
  const mia = miCategoria(p);
  const k = clave(p, "cierre");
  const finales = Object.fromEntries(
    CATEGORIAS.map((cat) => {
      if (cat === mia) return [cat, { orden: tablaOrdenada(p).map((x) => x.id), reducido: campeonReducido(p.reducido) }];
      const orden = simularTemporada(p.categorias[cat], `${k}:${cat}`);
      if (cat === "primera") return [cat, { orden, reducido: null }];
      const red: Reducido = { sembrados: orden.slice(1, 8), rondas: [] };
      avanzarReducido(red, `${k}:${cat}`);
      return [cat, { orden, reducido: campeonReducido(red) }];
    }),
  ) as Record<Categoria, { orden: string[]; reducido: string | null }>;

  const suben = (i: number) => (i < CATEGORIAS.length - 1 ? [finales[CATEGORIAS[i]!].orden[0]!, finales[CATEGORIAS[i]!].reducido!] : []);
  const bajan = (i: number) => (i > 0 ? finales[CATEGORIAS[i]!].orden.slice(-2) : []);
  const nuevas = Object.fromEntries(
    CATEGORIAS.map((cat, i) => {
      const fuera = new Set([...suben(i), ...bajan(i)]);
      return [cat, [...p.categorias[cat].filter((id) => !fuera.has(id)), ...(i > 0 ? suben(i - 1) : []), ...(i < CATEGORIAS.length - 1 ? bajan(i + 1) : [])]];
    }),
  ) as Record<Categoria, string[]>;

  const puesto = finales[mia].orden.indexOf(YO_CLUB) + 1;
  const i = CATEGORIAS.indexOf(mia);
  const resultado: ResultadoTemporada =
    mia === "primera" && puesto === 1
      ? "campeon"
      : mia !== "primera" && puesto === 1
        ? "ascenso"
        : finales[mia].reducido === YO_CLUB
          ? "ascenso-reducido"
          : i > 0 && puesto > EQUIPOS - 2
            ? "descenso"
            : mia !== "primera" && puesto <= 8
              ? "reducido"
              : "queda";
  p.categorias = nuevas;
  const nueva = miCategoria(p);
  p.resumen = { temporada: p.temporada, categoria: mia, puesto, resultado, copa: rondaCopa(p), nueva };
  p.historial.push(p.resumen);
  p.fase = "fin";
  if (resultado === "campeon") {
    r.lineas.push("👑 ¡Campeón de Primera División!");
    r.fosforos += 400;
    r.campeon = true;
  } else if (resultado === "ascenso" || resultado === "ascenso-reducido") {
    r.lineas.push(`🎉 ¡Ascendiste a la ${NOMBRE_CATEGORIA[nueva]}!`);
    r.fosforos += 150 + 50 * i;
    r.ascendi = true;
    r.llegueAPrimera = nueva === "primera";
  } else if (resultado === "descenso") r.lineas.push(`😞 Descendiste a la ${NOMBRE_CATEGORIA[nueva]}`);
  else r.lineas.push(`Terminó la temporada: ${puesto}º en la ${NOMBRE_CATEGORIA[mia]}`);
}

/** Cómo se juega cada partido: las reglas de la región de la Gira equivalente (la C = Buenos Aires … Primera = Norte). */
export function reglasAscenso(game: CareerGame, cat: Categoria): { reglas: string; config: unknown } {
  const r = GIRAS[game].regiones[CATEGORIAS.indexOf(cat)]!;
  return { reglas: r.reglas, config: r.config };
}

function copia(p: AscensoProgress): AscensoProgress {
  return JSON.parse(JSON.stringify(p)) as AscensoProgress;
}

// --- Guardado ---

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const strs = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const entero = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Valida un Ascenso leído del guardado; si algo no cierra, devuelve null (se arranca de nuevo). */
export function normalizarAscenso(raw: unknown): AscensoProgress | null {
  if (!isRec(raw) || raw.version !== 1 || typeof raw.semilla !== "string" || !entero(raw.temporada, 1, 1e6) || !entero(raw.paso, 0, CALENDARIO.length)) return null;
  if (!isRec(raw.categorias)) return null;
  const todos = new Set([...CLUBES.map((c) => c.id), YO_CLUB]);
  const vistos = new Set<string>();
  for (const cat of CATEGORIAS) {
    const ids = raw.categorias[cat];
    if (!strs(ids) || ids.length !== EQUIPOS) return null;
    for (const id of ids) {
      if (!todos.has(id) || vistos.has(id)) return null;
      vistos.add(id);
    }
  }
  if (vistos.size !== todos.size) return null;
  if (!["liga", "reducido", "fin"].includes(raw.fase as string)) return null;
  if (!strs(raw.orden) || !isRec(raw.tabla) || !Array.isArray(raw.copa) || !raw.copa.every(strs) || !Array.isArray(raw.historial)) return null;
  const p = raw as unknown as AscensoProgress;
  const mia = CATEGORIAS.find((c) => p.categorias[c].includes(YO_CLUB))!;
  if (p.orden.length !== EQUIPOS || !p.orden.every((id) => p.categorias[mia].includes(id))) {
    // La temporada ya cerró (los clubes cambiaron de categoría) o el orden está roto: solo vale en la fase "fin".
    if (p.fase !== "fin") return null;
  }
  for (const f of Object.values(p.tabla)) if (!isRec(f) || !["pj", "pg", "pp", "pts"].every((k) => entero(f[k], 0, 1000))) return null;
  if (p.copa.length === 0 || p.copa[0]!.length !== 32) return null;
  if (p.fase === "reducido" && !(isRec(p.reducido) && strs(p.reducido.sembrados) && Array.isArray(p.reducido.rondas))) return null;
  return copia({ ...p, reducido: p.reducido ?? null, resumen: p.resumen ?? null });
}
