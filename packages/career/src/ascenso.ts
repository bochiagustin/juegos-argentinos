import { clasico } from "./clasicos.ts";
import { CATEGORIAS, CLUBES, club, EXTERIOR, NOMBRE_CATEGORIA, TAMANO, type Categoria } from "./clubes.ts";
import {
  alcanceEnCopa,
  COPAS,
  copaEliminacion,
  copaGrupos,
  copaInfo,
  esFinal,
  jugarPasoCopa,
  nombrePaso,
  partidosDelPaso,
  fechasDeGrupos,
  nombreRonda,
  pasoActual,
  pasosCopa,
  rivalEnCopa,
  sigoEnCopa,
  type Copa,
  type CopaId,
} from "./copas.ts";
import { GIRAS } from "./data.ts";
import { fixture, filaVacia, mezclar, nivelClub, posiciones, simular, sumar, YO_CLUB, type Cruce, type FilaTabla } from "./torneo.ts";
import type { CareerGame } from "./types.ts";

export { YO_CLUB, fixture, nivelClub, type Cruce, type FilaTabla } from "./torneo.ts";

/**
 * El Ascenso: elegís cualquier club y arranca en la Primera C (el lugar que deja lo ocupa el mejor de la categoría de
 * abajo, en cascada). Cada categoría tiene su cantidad real de equipos (`TAMANO`) y juega a una rueda (n − 1 fechas, 3 puntos
 * por victoria, sin empates). El 1º asciende directo; del 2º al 8º juegan el Reducido (cuartos, semis y final; el 2º pasa
 * directo a semis) y el campeón también sube. Los dos últimos descienden (en la C no hay a dónde). En Primera, el 1º
 * sale campeón.
 * En la temporada también se juegan (y se simulan si no estás) la Supercopa y la Recopa (al arrancar), la Copa Argentina
 * (32 de todas las categorías), la Copa de la Liga (los de Primera, 2 zonas y cruces), la Libertadores y la Sudamericana
 * (32: 6 argentinos + 26 de afuera, 8 grupos y cruces). A la Libertadores van el campeón de la Copa de la Liga, el de la Copa
 * Argentina y del 1º al 4º de Primera (y los siguientes de la tabla hasta completar 6); a la Sudamericana, los 6 que siguen.
 * Las finales y la Libertadores son un nivel más difíciles. Todo es puro y determinístico (semilla).
 */

export type Jornada = { t: "liga"; fecha: number } | { t: "copa"; id: CopaId };

export type TituloId = CopaId | `liga-${Categoria}` | `reducido-${Categoria}`;

export interface Titulo {
  id: TituloId;
  temporada: number;
}

export interface Reducido {
  /** Del 2º al 8º de la tabla, en ese orden. */
  sembrados: string[];
  rondas: Cruce[][];
}

/** Quiénes juegan las copas de la temporada que viene. */
export interface Clasificados {
  libertadores: string[];
  sudamericana: string[];
  supercopa: string[];
  recopa: string[];
}

export type ResultadoTemporada = "campeon" | "ascenso" | "ascenso-reducido" | "reducido" | "queda" | "descenso";

export interface ResumenTemporada {
  temporada: number;
  categoria: Categoria;
  puesto: number;
  resultado: ResultadoTemporada;
  /** Hasta dónde llegué en cada copa que jugué. */
  copas: { id: CopaId; alcance: string }[];
  titulos: TituloId[];
  /** Copas internacionales a las que clasifiqué para la temporada que viene. */
  clasificado: CopaId[];
  /** Dónde jugás la temporada que viene. */
  nueva: Categoria;
}

/** Un partido mío ya jugado esta temporada: en qué lugar del calendario (o ronda del Reducido) y cómo salió. */
export interface Jugado {
  slot?: number;
  reducido?: number;
  rival: string;
  gane: boolean;
  local: boolean;
}

export interface AscensoProgress {
  version: 3;
  /** El club que elegiste (id de `CLUBES`); en las listas figura como `YO_CLUB`. */
  miClub: string;
  temporada: number;
  semilla: string;
  /** Los clubes de cada categoría esta temporada (`YO_CLUB` sos vos). */
  categorias: Record<Categoria, string[]>;
  /** Orden del fixture de mi categoría (método del círculo). */
  orden: string[];
  /** Las fechas de la liga y los pasos de cada copa, en orden. */
  calendario: Jornada[];
  /** Por dónde va el calendario. */
  paso: number;
  /** Tabla de mi categoría. */
  tabla: Record<string, FilaTabla>;
  copas: Partial<Record<CopaId, Copa>>;
  /** Quiénes juegan las copas de la temporada que viene (se calcula al cerrar). */
  siguiente: Clasificados;
  fase: "liga" | "reducido" | "fin";
  reducido: Reducido | null;
  /** Cómo terminó la temporada (en la fase "fin"). */
  resumen: ResumenTemporada | null;
  historial: ResumenTemporada[];
  /** La vitrina. */
  titulos: Titulo[];
  /** Sorteos que ya se mostraron (para el bolillero). */
  vistos: string[];
  /** Mis partidos de esta temporada (para el calendario). */
  jugados?: Jugado[];
}

export const RONDAS_REDUCIDO = ["Cuartos de final", "Semifinal", "Final"] as const;

/** Fósforos por salir campeón. */
const PREMIO_TITULO: Record<CopaId, number> = { supercopa: 150, recopa: 300, "copa-argentina": 250, "copa-liga": 300, libertadores: 1000, sudamericana: 500 };

export function nombreTitulo(id: TituloId): string {
  if (id.startsWith("liga-")) {
    const cat = id.slice(5) as Categoria;
    return cat === "primera" ? "Campeón de Primera División" : `Campeón de la ${NOMBRE_CATEGORIA[cat]}`;
  }
  if (id.startsWith("reducido-")) return `Reducido de la ${NOMBRE_CATEGORIA[id.slice(9) as Categoria]}`;
  return copaInfo(id as CopaId).nombre;
}

const clave = (p: AscensoProgress, ...partes: (string | number)[]) => [p.semilla, p.temporada, ...partes].join(":");

/** El id real de un club de las listas (`YO_CLUB` → el que elegí). */
export function idReal(p: AscensoProgress, id: string): string {
  return id === YO_CLUB ? p.miClub : id;
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
  for (let f = 1; f < ids.length; f++)
    for (const [a, b] of fixture(orden, f)) {
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
  return red?.rondas[2]?.[0]?.ganador ?? null;
}

// --- Copas y calendario ---

function armarCopaArgentina(categorias: Record<Categoria, string[]>, k: string): Copa {
  const part: string[] = [];
  for (const cat of CATEGORIAS) {
    const ids = categorias[cat];
    const yo = ids.includes(YO_CLUB);
    part.push(...mezclar(ids.filter((x) => x !== YO_CLUB), `${k}:copa:${cat}`).slice(0, yo ? 7 : 8));
    if (yo) part.push(YO_CLUB);
  }
  return copaEliminacion("copa-argentina", mezclar(part, `${k}:cuadro`));
}

/** 6 argentinos + 26 del exterior (los de esa copa; si faltan, de la otra). */
function participantesInternacional(id: "libertadores" | "sudamericana", argentinos: string[], k: string): string[] {
  const propios = mezclar(EXTERIOR.filter((c) => c.copa === id).map((c) => c.id), `${k}:${id}:pool`);
  const otros = mezclar(EXTERIOR.filter((c) => c.copa !== id).map((c) => c.id), `${k}:${id}:otros`);
  const fuera = [...propios, ...otros].filter((x) => !argentinos.includes(x));
  return [...argentinos, ...fuera.slice(0, 32 - argentinos.length)];
}

/**
 * Reparte los pasos de cada copa a lo largo de la liga: la Supercopa y la Recopa antes de la fecha 1, y las demás
 * parejas entre las fechas, terminando antes de la última.
 */
export function armarCalendario(fechas: number, copas: Partial<Record<CopaId, Copa>>): Jornada[] {
  const despues: Jornada[][] = Array.from({ length: fechas + 1 }, () => []);
  for (const { id } of COPAS) {
    const c = copas[id];
    if (!c) continue;
    if (id === "supercopa" || id === "recopa") {
      despues[0]!.push({ t: "copa", id });
      continue;
    }
    const n = pasosCopa(c);
    for (let j = 0; j < n; j++) despues[Math.max(1, Math.min(fechas - 1, Math.round((fechas * (j + 1)) / (n + 1))))]!.push({ t: "copa", id });
  }
  const out: Jornada[] = [...despues[0]!];
  for (let f = 1; f <= fechas; f++) out.push({ t: "liga", fecha: f }, ...despues[f]!);
  return out;
}

/** Cuántas fechas de liga tiene mi temporada. */
export function fechasLiga(p: AscensoProgress): number {
  return p.categorias[miCategoria(p)].length - 1;
}

/** Fechas de liga ya jugadas. */
export function fechasJugadas(p: AscensoProgress): number {
  return p.calendario.slice(0, p.paso).filter((s) => s.t === "liga").length;
}

// --- Temporadas ---

function arrancarTemporada(p: AscensoProgress) {
  const k = clave(p);
  p.orden = mezclar(p.categorias[miCategoria(p)], `${k}:fixture`);
  p.tabla = Object.fromEntries(p.orden.map((id) => [id, filaVacia()]));
  const s = p.siguiente;
  p.copas = {
    supercopa: copaEliminacion("supercopa", s.supercopa.slice(0, 2)),
    recopa: copaEliminacion("recopa", s.recopa.slice(0, 2)),
    "copa-argentina": armarCopaArgentina(p.categorias, k),
    "copa-liga": copaGrupos("copa-liga", p.categorias.primera, 2, 1, 4, `${k}:copa-liga`),
    libertadores: copaGrupos("libertadores", participantesInternacional("libertadores", s.libertadores, k), 8, 2, 2, `${k}:libertadores`),
    sudamericana: copaGrupos("sudamericana", participantesInternacional("sudamericana", s.sudamericana, k), 8, 2, 2, `${k}:sudamericana`),
  };
  p.calendario = armarCalendario(fechasLiga(p), p.copas);
  p.paso = 0;
  p.fase = "liga";
  p.reducido = null;
  p.resumen = null;
  p.jugados = [];
  saltarSinMi(p);
}

/** Los clasificados de la primera temporada: los de Primera por nivel, y los mejores de afuera para la Recopa. */
function clasificadosIniciales(categorias: Record<Categoria, string[]>, k: string): Clasificados {
  const primera = mezclar(categorias.primera, `${k}:inicial`).sort((a, b) => nivelClub(b) - nivelClub(a));
  const mejor = (id: "libertadores" | "sudamericana") => mezclar(EXTERIOR.filter((c) => c.copa === id).map((c) => c.id), `${k}:recopa:${id}`).sort((a, b) => nivelClub(b) - nivelClub(a))[0]!;
  return { libertadores: primera.slice(0, 6), sudamericana: primera.slice(6, 12), supercopa: primera.slice(0, 2), recopa: [mejor("libertadores"), mejor("sudamericana")] };
}

/**
 * Arranca con el club que elegiste en la Primera C. Si era de una categoría más alta, su lugar lo ocupa el mejor de la
 * categoría de abajo (y así hasta la C), para que cada una conserve su cantidad de equipos.
 */
export function iniciarAscenso(semilla: string, miClub: string): AscensoProgress {
  const elegido = club(miClub);
  if (!elegido?.categoria) throw new Error(`Club desconocido: ${miClub}`);
  const categorias = Object.fromEntries(CATEGORIAS.map((c) => [c, CLUBES.filter((x) => x.categoria === c).map((x) => x.id)])) as Record<Categoria, string[]>;
  const mejor = (cat: Categoria) => categorias[cat].reduce((a, b) => (nivelClub(b) > nivelClub(a) ? b : a));
  categorias[elegido.categoria] = categorias[elegido.categoria].filter((id) => id !== miClub);
  for (let hueco = CATEGORIAS.indexOf(elegido.categoria); hueco > 0; hueco--) {
    const abajo = CATEGORIAS[hueco - 1]!;
    const sube = mejor(abajo);
    categorias[abajo] = categorias[abajo].filter((id) => id !== sube);
    categorias[CATEGORIAS[hueco]!].push(sube);
  }
  categorias.c.push(YO_CLUB);
  const p: AscensoProgress = {
    version: 3,
    miClub,
    temporada: 1,
    semilla,
    categorias,
    orden: [],
    calendario: [],
    paso: 0,
    tabla: {},
    copas: {},
    siguiente: clasificadosIniciales(categorias, `${semilla}:1`),
    fase: "liga",
    reducido: null,
    resumen: null,
    historial: [],
    titulos: [],
    vistos: [],
  };
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
  copa?: CopaId;
  /** "Fecha 5", "Copa Libertadores · Fecha 2 de grupos", "Reducido · Final". */
  titulo: string;
  /** Nivel del rival en este partido (las finales y la Libertadores, uno más). */
  nivel: number;
  final: boolean;
  /** El nombre del clásico, si el rival es el de toda la vida ("Superclásico"). */
  clasico: string | null;
}

export function proximoPartido(p: AscensoProgress): Partido | null {
  if (p.fase === "fin") return null;
  const partido = (rival: string, etapa: Partido["etapa"], titulo: string, final: boolean, copa?: CopaId): Partido => ({
    rival,
    etapa,
    titulo,
    final,
    // Las finales y la Libertadores, un nivel más; los clásicos, otro más.
    nivel: Math.min(10, nivelClub(rival) + (final || copa === "libertadores" ? 1 : 0) + (clasico(p.miClub, rival) ? 1 : 0)),
    clasico: clasico(p.miClub, rival),
    ...(copa ? { copa } : {}),
  });
  if (p.fase === "reducido") {
    const n = p.reducido?.rondas.length ?? 0;
    const c = p.reducido?.rondas[n - 1]?.find((x) => !x.ganador && (x.a === YO_CLUB || x.b === YO_CLUB));
    return c ? partido(c.a === YO_CLUB ? c.b : c.a, "reducido", `Reducido · ${RONDAS_REDUCIDO[n - 1]}`, n === 3) : null;
  }
  const s = p.calendario[p.paso];
  if (!s) return null;
  if (s.t === "liga") {
    const par = fixture(p.orden, s.fecha).find((x) => x.includes(YO_CLUB))!;
    return partido(par[0] === YO_CLUB ? par[1] : par[0], "liga", `Fecha ${s.fecha}`, false);
  }
  const c = p.copas[s.id]!;
  const rival = rivalEnCopa(c);
  if (!rival) return null;
  return partido(rival, "copa", `${copaInfo(s.id).nombre} · ${nombrePaso(pasoActual(c)!)}`, esFinal(c), s.id);
}

/** Un sorteo que todavía no se mostró: el grupo o el cruce del partido que viene. */
export function sorteoPendiente(p: AscensoProgress): { clave: string; partido: Partido; grupo: string[] | null } | null {
  const prox = proximoPartido(p);
  if (!prox || prox.etapa === "liga") return null;
  let k: string;
  let grupo: string[] | null = null;
  if (prox.etapa === "reducido") k = `${p.temporada}:reducido:${p.reducido!.rondas.length}`;
  else {
    const c = p.copas[prox.copa!]!;
    const paso = pasoActual(c)!;
    if (paso.tipo === "grupos") {
      if (paso.fecha > 1) return null;
      k = `${p.temporada}:${c.id}:grupos`;
      grupo = c.grupos!.find((g) => g.includes(YO_CLUB)) ?? null;
    } else k = `${p.temporada}:${c.id}:${paso.ronda}`;
  }
  return p.vistos.includes(k) ? null : { clave: k, partido: prox, grupo };
}

export function marcarSorteoVisto(p: AscensoProgress, k: string): AscensoProgress {
  return p.vistos.includes(k) ? p : { ...p, vistos: [...p.vistos.slice(-40), k] };
}

export interface ResultadoAscenso {
  progreso: AscensoProgress;
  lineas: string[];
  fosforos: number;
  /** Para los logros. */
  ascendi: boolean;
  llegueAPrimera: boolean;
  /** Títulos que se ganaron con este partido (o al cerrar la temporada). */
  titulos: TituloId[];
  /** Si fue un clásico: cuál y si lo gané. */
  clasico: { nombre: string; gane: boolean } | null;
}

function ganarTitulo(p: AscensoProgress, r: ResultadoAscenso, id: TituloId) {
  p.titulos.push({ id, temporada: p.temporada });
  r.titulos.push(id);
}

/**
 * Registra mi partido contra `rival`. Si no es el partido que me toca (ej. una revancha), no cuenta: devuelve null.
 * Simula el resto de la fecha, los pasos de las copas en los que no juego, el Reducido y el cierre de la temporada.
 */
export function registrarAscenso(p0: AscensoProgress, rival: string, ganada: boolean): ResultadoAscenso | null {
  const prox = proximoPartido(p0);
  if (!prox || prox.rival !== rival) return null;
  const p = copia(p0);
  const r: ResultadoAscenso = { progreso: p, lineas: [], fosforos: 0, ascendi: false, llegueAPrimera: false, titulos: [], clasico: null };
  if (prox.clasico) {
    r.clasico = { nombre: prox.clasico, gane: ganada };
    r.lineas.push(ganada ? `🔥 ¡Ganaste el ${prox.clasico}!` : `😤 Perdiste el ${prox.clasico}…`);
    if (ganada) r.fosforos += 50;
  }
  const cat = miCategoria(p);
  const nombre = club(rival)?.nombre ?? rival;
  (p.jugados ??= []).push({
    ...(prox.etapa === "reducido" ? { reducido: p.reducido!.rondas.length } : { slot: p.paso }),
    rival,
    gane: ganada,
    local: soyLocal(p),
  });
  if (prox.etapa === "liga") {
    const s = p.calendario[p.paso] as Extract<Jornada, { t: "liga" }>;
    for (const [a, b] of fixture(p.orden, s.fecha)) {
      const g = a === YO_CLUB || b === YO_CLUB ? (ganada ? YO_CLUB : rival) : simular(a, b, clave(p, "liga", s.fecha, a));
      sumar(p.tabla, g, g === a ? b : a);
    }
    p.paso++;
    const puesto = tablaOrdenada(p).find((x) => x.id === YO_CLUB)!.puesto;
    r.lineas.push(ganada ? `⚽ Fecha ${s.fecha}: le ganaste a ${nombre}, +3 puntos` : `Fecha ${s.fecha}: perdiste con ${nombre}, 0 puntos`);
    r.lineas.push(`📊 Vas ${puesto}º en la ${NOMBRE_CATEGORIA[cat]}`);
    if (ganada) r.fosforos += 10;
  } else if (prox.etapa === "copa") {
    const id = prox.copa!;
    const info = copaInfo(id);
    const antes = p.copas[id]!;
    const paso = pasoActual(antes)!;
    const c = jugarPasoCopa(antes, clave(p), ganada ? YO_CLUB : rival);
    p.copas[id] = c;
    p.paso++;
    if (paso.tipo === "grupos") {
      r.lineas.push(`${info.icono} ${info.corto}, ${nombrePaso(paso).toLowerCase()}: ${ganada ? `le ganaste a ${nombre}` : `perdiste con ${nombre}`}`);
      if (ganada) r.fosforos += 15;
      // Se terminó la fase de grupos.
      if (antes.rondas.length === 0 && c.rondas.length === 1) r.lineas.push(sigoEnCopa(c) ? `🔥 ¡Pasaste a ${nombrePaso(pasoActual(c)!).toLowerCase()}!` : "Quedaste afuera en la fase de grupos");
    } else if (!ganada) r.lineas.push(`Quedaste afuera de la ${info.nombre} en ${nombrePaso(paso).toLowerCase()}`);
    else if (c.campeon === YO_CLUB) {
      r.lineas.push(`🏆 ¡Campeón de la ${info.nombre}!`);
      r.fosforos += PREMIO_TITULO[id];
      ganarTitulo(p, r, id);
    } else {
      r.lineas.push(`${info.icono} ${info.corto}: pasaste a ${nombrePaso(pasoActual(c)!).toLowerCase()}`);
      r.fosforos += 10 + 10 * paso.ronda;
    }
  } else {
    const red = p.reducido!;
    const ronda = red.rondas[red.rondas.length - 1]!;
    const c = ronda.find((x) => !x.ganador && (x.a === YO_CLUB || x.b === YO_CLUB))!;
    c.ganador = ganada ? YO_CLUB : rival;
    r.lineas.push(ganada ? `🔥 Reducido: ganaste la ${prox.titulo.split(" · ")[1]!.toLowerCase()}` : `Reducido: te eliminó ${nombre}`);
    if (ganada) r.fosforos += 25;
    if (ganada && prox.final) ganarTitulo(p, r, `reducido-${cat}`);
  }
  avanzar(p, r);
  return r;
}

/** En el partido que viene, ¿juego de local? (el primero del par). */
function soyLocal(p: AscensoProgress): boolean {
  if (p.fase === "reducido") {
    const ronda = p.reducido!.rondas[p.reducido!.rondas.length - 1]!;
    return ronda.find((x) => !x.ganador && (x.a === YO_CLUB || x.b === YO_CLUB))?.a === YO_CLUB;
  }
  const s = p.calendario[p.paso];
  if (!s) return true;
  const pares = s.t === "liga" ? fixture(p.orden, s.fecha) : partidosDelPaso(p.copas[s.id]!);
  return pares.find((x) => x.includes(YO_CLUB))?.[0] === YO_CLUB;
}

/** Juega solos los pasos de copa en los que no estoy (o tengo fecha libre). */
function saltarSinMi(p: AscensoProgress) {
  for (let s = p.calendario[p.paso]; s?.t === "copa"; s = p.calendario[p.paso]) {
    const c = p.copas[s.id]!;
    if (rivalEnCopa(c)) return;
    p.copas[s.id] = jugarPasoCopa(c, clave(p));
    p.paso++;
  }
}

function avanzar(p: AscensoProgress, r: ResultadoAscenso) {
  if (p.fase === "liga") {
    saltarSinMi(p);
    if (p.paso < p.calendario.length) return;
    if (miCategoria(p) === "primera") return cerrar(p, r);
    const orden = tablaOrdenada(p).map((x) => x.id);
    p.reducido = { sembrados: orden.slice(1, 8), rondas: [] };
    p.fase = "reducido";
    if (p.reducido.sembrados.includes(YO_CLUB)) r.lineas.push("🔥 ¡Entraste al Reducido!");
  }
  if (p.fase === "reducido" && avanzarReducido(p.reducido!, clave(p))) cerrar(p, r);
}

const unicos = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

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

  // Clasificados para las copas de la temporada que viene.
  const primera = finales.primera.orden;
  const campeon = (id: CopaId) => p.copas[id]?.campeon ?? null;
  const libertadores = unicos([campeon("copa-liga"), campeon("copa-argentina"), ...primera.slice(0, 4)]);
  for (const x of primera) if (libertadores.length < 6 && !libertadores.includes(x)) libertadores.push(x);
  const sudamericana = primera.filter((x) => !libertadores.includes(x)).slice(0, 6);
  const ca = campeon("copa-argentina");
  p.siguiente = {
    libertadores: libertadores.slice(0, 6),
    sudamericana,
    supercopa: [primera[0]!, ca && ca !== primera[0] ? ca : primera[1]!],
    recopa: unicos([campeon("libertadores"), campeon("sudamericana")]).length === 2 ? [campeon("libertadores")!, campeon("sudamericana")!] : p.siguiente.recopa,
  };

  const puesto = finales[mia].orden.indexOf(YO_CLUB) + 1;
  const i = CATEGORIAS.indexOf(mia);
  const resultado: ResultadoTemporada =
    mia === "primera" && puesto === 1
      ? "campeon"
      : mia !== "primera" && puesto === 1
        ? "ascenso"
        : finales[mia].reducido === YO_CLUB
          ? "ascenso-reducido"
          : i > 0 && puesto > finales[mia].orden.length - 2
            ? "descenso"
            : mia !== "primera" && puesto <= 8
              ? "reducido"
              : "queda";
  if (puesto === 1) ganarTitulo(p, r, `liga-${mia}`);
  p.categorias = nuevas;
  const nueva = miCategoria(p);
  const clasificado = (["libertadores", "sudamericana"] as const).filter((id) => p.siguiente[id].includes(YO_CLUB));
  const copas = COPAS.flatMap(({ id }) => {
    const c = p.copas[id];
    const alcance = c ? alcanceEnCopa(c) : null;
    return alcance ? [{ id, alcance }] : [];
  });
  p.resumen = { temporada: p.temporada, categoria: mia, puesto, resultado, copas, titulos: p.titulos.filter((t) => t.temporada === p.temporada).map((t) => t.id), clasificado, nueva };
  p.historial.push(p.resumen);
  p.fase = "fin";
  if (resultado === "campeon") {
    r.lineas.push("👑 ¡Campeón de Primera División!");
    r.fosforos += 400;
  } else if (resultado === "ascenso" || resultado === "ascenso-reducido") {
    r.lineas.push(`🎉 ¡Ascendiste a la ${NOMBRE_CATEGORIA[nueva]}!`);
    r.fosforos += 150 + 50 * i;
    r.ascendi = true;
    r.llegueAPrimera = nueva === "primera";
  } else if (resultado === "descenso") r.lineas.push(`😞 Descendiste a la ${NOMBRE_CATEGORIA[nueva]}`);
  else r.lineas.push(`Terminó la temporada: ${puesto}º en la ${NOMBRE_CATEGORIA[mia]}`);
  for (const id of clasificado) r.lineas.push(`🌎 ¡Clasificaste a la ${copaInfo(id).nombre}!`);
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
const IDS_COPA = new Set<string>(COPAS.map((c) => c.id));

function copaValida(c: unknown): boolean {
  if (!isRec(c) || !IDS_COPA.has(c.id as string) || !Array.isArray(c.rondas) || !isRec(c.tabla) || !entero(c.fecha, 0, 100)) return false;
  if (c.grupos !== null && !(Array.isArray(c.grupos) && c.grupos.every(strs))) return false;
  return c.rondas.every((r) => Array.isArray(r) && r.every((x) => isRec(x) && typeof x.a === "string" && typeof x.b === "string"));
}

/** Valida un Ascenso leído del guardado; si algo no cierra, devuelve null (se arranca de nuevo). */
export function normalizarAscenso(raw: unknown): AscensoProgress | null {
  if (!isRec(raw) || raw.version !== 3 || typeof raw.semilla !== "string" || !entero(raw.temporada, 1, 1e6)) return null;
  if (!isRec(raw.categorias) || typeof raw.miClub !== "string" || !club(raw.miClub)?.categoria) return null;
  const todos = new Set([...CLUBES.map((c) => c.id).filter((id) => id !== raw.miClub), YO_CLUB]);
  const vistos = new Set<string>();
  for (const cat of CATEGORIAS) {
    const ids = raw.categorias[cat];
    if (!strs(ids) || ids.length !== TAMANO[cat]) return null;
    for (const id of ids) {
      if (!todos.has(id) || vistos.has(id)) return null;
      vistos.add(id);
    }
  }
  if (vistos.size !== todos.size) return null;
  if (!["liga", "reducido", "fin"].includes(raw.fase as string)) return null;
  if (!strs(raw.orden) || !isRec(raw.tabla) || !Array.isArray(raw.historial) || !Array.isArray(raw.titulos) || !strs(raw.vistos)) return null;
  if (!Array.isArray(raw.calendario) || !entero(raw.paso, 0, raw.calendario.length)) return null;
  if (!isRec(raw.copas) || !Object.values(raw.copas).every(copaValida)) return null;
  if (!isRec(raw.siguiente) || !["libertadores", "sudamericana", "supercopa", "recopa"].every((k) => strs((raw.siguiente as Rec)[k]))) return null;
  const p = raw as unknown as AscensoProgress;
  const mia = CATEGORIAS.find((c) => p.categorias[c].includes(YO_CLUB))!;
  // Al cerrar la temporada los clubes cambian de categoría: el orden viejo solo vale en la fase "fin".
  if (p.fase !== "fin" && (p.orden.length !== p.categorias[mia].length || !p.orden.every((id) => p.categorias[mia].includes(id)))) return null;
  for (const f of Object.values(p.tabla)) if (!isRec(f) || !["pj", "pg", "pp", "pts"].every((k) => entero(f[k], 0, 1000))) return null;
  if (p.fase === "reducido" && !(isRec(p.reducido) && strs(p.reducido.sembrados) && Array.isArray(p.reducido.rondas))) return null;
  const jugados = Array.isArray(p.jugados) ? p.jugados.filter((j) => isRec(j) && typeof j.rival === "string" && typeof j.gane === "boolean") : [];
  return copia({ ...p, reducido: p.reducido ?? null, resumen: p.resumen ?? null, jugados });
}

// --- Calendario con fechas (de enero a diciembre) ---

export interface DiaDePartido {
  /** "AAAA-MM-DD". */
  fecha: string;
  etapa: "liga" | "copa" | "reducido";
  copa?: CopaId;
  /** "Fecha 5", "Octavos de final"… */
  titulo: string;
  /** El rival, si ya se sabe. */
  rival: string | null;
  local: boolean | null;
  /** Si ya se jugó: lo gané o lo perdí. */
  gane?: boolean;
  /** Es el partido que viene. */
  proximo: boolean;
  /** El nombre del clásico, si lo es. */
  clasico?: string | null;
}

/** El año de la temporada (la primera es 2026). */
export const anioTemporada = (p: AscensoProgress) => 2025 + p.temporada;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** El primer domingo del año, más `semanas` semanas y `dias` días. */
function diaDelAnio(anio: number, semanas: number, dias = 0): string {
  const d = new Date(Date.UTC(anio, 0, 1));
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7) + semanas * 7 + dias);
  return iso(d);
}

/**
 * Las fechas de cada lugar del calendario: la liga los domingos, de fines de enero a fines de noviembre; las copas
 * entre semana (martes a viernes) después de su fecha de liga; la Supercopa y la Recopa en enero; el Reducido en diciembre.
 */
export function fechasDelCalendario(p: AscensoProgress): string[] {
  const anio = anioTemporada(p);
  // Las fechas de liga de este calendario (al cerrar la temporada, mi categoría ya puede ser otra).
  const F = p.calendario.filter((s) => s.t === "liga").length;
  const semana = (f: number) => 4 + Math.round(((f - 1) * 43) / Math.max(1, F - 1));
  let ultimaLiga = 0;
  let entreSemana = 0;
  let previas = 0;
  return p.calendario.map((s) => {
    if (s.t === "liga") {
      ultimaLiga = s.fecha;
      entreSemana = 0;
      return diaDelAnio(anio, semana(s.fecha));
    }
    if (ultimaLiga === 0) return diaDelAnio(anio, 1 + previas++, 3);
    return diaDelAnio(anio, semana(ultimaLiga), 2 + Math.min(3, entreSemana++));
  });
}

/** El domingo de cada ronda del Reducido (diciembre). */
export function fechaReducido(p: AscensoProgress, ronda: number): string {
  return diaDelAnio(anioTemporada(p), 48 + ronda);
}

/** En qué paso de su copa cae cada lugar del calendario (0, 1, 2…). */
function pasoDeSlot(p: AscensoProgress, i: number): number {
  const s = p.calendario[i]!;
  return s.t === "copa" ? p.calendario.slice(0, i).filter((x) => x.t === "copa" && x.id === s.id).length : -1;
}

function nombreDePaso(c: Copa, k: number): string {
  const g = fechasDeGrupos(c);
  if (k < g) return `Fecha ${k + 1} de grupos`;
  const cruces = c.grupos ? c.grupos.length * c.pasan : c.rondas[0]!.length * 2;
  return nombreRonda(cruces / 2 ** (k - g));
}

/**
 * Mis partidos de la temporada con su día: los jugados (con el resultado), el que viene y los que siguen (la liga
 * entera; de las copas, los pasos que me tocan si sigo en carrera, con el rival "a definir" hasta el sorteo).
 */
export function agenda(p: AscensoProgress): DiaDePartido[] {
  const fechas = fechasDelCalendario(p);
  const prox = proximoPartido(p);
  const jugados = p.jugados ?? [];
  const out: DiaDePartido[] = [];
  p.calendario.forEach((s, i) => {
    const titulo = s.t === "liga" ? `Fecha ${s.fecha}` : nombreDePaso(p.copas[s.id]!, pasoDeSlot(p, i));
    const base = { fecha: fechas[i]!, etapa: s.t === "liga" ? ("liga" as const) : ("copa" as const), titulo, ...(s.t === "copa" ? { copa: s.id } : {}) };
    const j = jugados.find((x) => x.slot === i);
    if (j) return out.push({ ...base, rival: j.rival, local: j.local, gane: j.gane, proximo: false });
    if (i < p.paso) return;
    const esProximo = i === p.paso && p.fase === "liga" && !!prox;
    if (s.t === "liga") {
      const par = fixture(p.orden, s.fecha).find((x) => x.includes(YO_CLUB))!;
      return out.push({ ...base, rival: par[0] === YO_CLUB ? par[1] : par[0], local: par[0] === YO_CLUB, proximo: esProximo });
    }
    const c = p.copas[s.id]!;
    if (!sigoEnCopa(c)) return;
    if (esProximo) return out.push({ ...base, rival: prox!.rival, local: soyLocal(p), proximo: true });
    // Un paso futuro de una copa en la que sigo: en grupos el rival sale del fixture; en cruces, a definir.
    const k = pasoDeSlot(p, i);
    const g = fechasDeGrupos(c);
    if (c.grupos && k < g) {
      const grupo = c.grupos.find((x) => x.includes(YO_CLUB))!;
      const n = (grupo.length % 2 ? grupo.length + 1 : grupo.length) - 1;
      const par = fixture(grupo.length % 2 ? [...grupo, "-"] : grupo, (k % n) + 1).find((x) => x.includes(YO_CLUB));
      if (!par || par.includes("-")) return;
      return out.push({ ...base, rival: par[0] === YO_CLUB ? par[1] : par[0], local: par[0] === YO_CLUB, proximo: false });
    }
    // El cruce que se está jugando ya tiene rival (aunque antes me toque otro partido).
    const paso = pasoActual(c);
    if (paso?.tipo === "cruces" && k === g + paso.ronda) {
      const par = partidosDelPaso(c).find((x) => x.includes(YO_CLUB));
      if (par) return out.push({ ...base, rival: par[0] === YO_CLUB ? par[1] : par[0], local: par[0] === YO_CLUB, proximo: false });
    }
    out.push({ ...base, rival: null, local: null, proximo: false });
  });
  for (const j of jugados.filter((x) => x.reducido !== undefined))
    out.push({ fecha: fechaReducido(p, j.reducido!), etapa: "reducido", titulo: `Reducido · ${RONDAS_REDUCIDO[j.reducido! - 1]}`, rival: j.rival, local: j.local, gane: j.gane, proximo: false });
  if (prox?.etapa === "reducido") {
    const n = p.reducido!.rondas.length;
    out.push({ fecha: fechaReducido(p, n), etapa: "reducido", titulo: prox.titulo, rival: prox.rival, local: soyLocal(p), proximo: true });
  }
  return out.map((d) => ({ ...d, clasico: d.rival ? clasico(p.miClub, d.rival) : null })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** "Hoy" en el calendario: el día del partido que viene, o el 31 de diciembre si terminó la temporada. */
export function hoy(p: AscensoProgress): string {
  return agenda(p).find((d) => d.proximo)?.fecha ?? `${anioTemporada(p)}-12-31`;
}
