import { normalizarAscenso, registrarAscenso } from "./ascenso.ts";
import { club } from "./clubes.ts";
import type { Rasgos } from "@juegos-argentinos/engine";
import { GIRAS, LOGROS, PERSONAJES, personaje, puntosPorVictoria, REGALO_BUENOS_AIRES, TIENDA } from "./data.ts";
import { CAREER_GAMES, REGION_IDS, SLOTS, YO, type CareerGame, type CareerState, type GiraDef, type GiraProgress, type Hecho, type Personaje, type Premio, type RegionId, type Reporte } from "./types.ts";

export const FOSFOROS_INICIALES = 100;

export function defaultCareer(): CareerState {
  return { version: 1, fosforos: FOSFOROS_INICIALES, giras: {}, ascensos: {}, logros: {}, contadores: {}, desbloqueados: [] };
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const nonNeg = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);

/** Valida y completa una carrera leída del guardado. Nunca lanza. */
export function normalizeCareer(raw: unknown): CareerState {
  const d = defaultCareer();
  if (!isRec(raw)) return d;
  const giras: CareerState["giras"] = {};
  const ids = new Set(PERSONAJES.map((x) => x.id));
  if (isRec(raw.giras)) {
    for (const g of CAREER_GAMES) {
      const p = raw.giras[g];
      if (!isRec(p)) continue;
      const vencidos: Record<string, number> = {};
      if (isRec(p.vencidos)) for (const [k, v] of Object.entries(p.vencidos)) if (ids.has(k)) vencidos[k] = nonNeg(v);
      const puestos: GiraProgress["puestos"] = {};
      if (isRec(p.puestos)) {
        for (const region of REGION_IDS) {
          const lista = p.puestos[region];
          const esperado = [...idsDeRegion(region), YO];
          // Solo si es exactamente la región con sus 10 rivales y yo, sin repetidos; si no, se rearma.
          if (Array.isArray(lista) && lista.length === esperado.length && esperado.every((id) => lista.includes(id))) puestos[region] = lista as string[];
        }
      }
      giras[g] = { puntos: nonNeg(p.puntos), vencidos, jugadas: nonNeg(p.jugadas), puestos };
    }
  }
  const ascensos: CareerState["ascensos"] = {};
  if (isRec(raw.ascensos))
    for (const g of CAREER_GAMES) {
      const a = normalizarAscenso(raw.ascensos[g]);
      if (a) ascensos[g] = a;
    }
  const logros: Record<string, number> = {};
  if (isRec(raw.logros)) for (const l of LOGROS) if (typeof raw.logros[l.id] === "number") logros[l.id] = raw.logros[l.id] as number;
  const contadores: Record<string, number> = {};
  if (isRec(raw.contadores)) for (const [k, v] of Object.entries(raw.contadores)) contadores[k] = nonNeg(v);
  const validos = new Set(TIENDA.map((t) => t.id));
  const desbloqueados = Array.isArray(raw.desbloqueados) ? [...new Set(raw.desbloqueados.filter((x): x is string => typeof x === "string" && validos.has(x)))] : [];
  return { version: 1, fosforos: nonNeg(raw.fosforos, d.fosforos), giras, ascensos, logros, contadores, desbloqueados };
}

export const PREFIJO_ASCENSO = "ascenso:";

/** Rasgos del rival de la carrera (los clubes del Ascenso no tienen: juegan "normal"). */
export function rasgosRival(rivalId: string): Rasgos | undefined {
  return PERSONAJES.find((x) => x.id === rivalId)?.rasgos;
}

/** Quién es el rival, en una línea: la bajada del personaje o la categoría del club. */
export function bajadaRival(rivalId: string): string {
  const pj = PERSONAJES.find((x) => x.id === rivalId);
  if (pj) return pj.bajada;
  const c = club(rivalId.slice(PREFIJO_ASCENSO.length));
  return c ? `Ascenso · Nivel ${c.nivel}` : "";
}

export function progresoDe(s: CareerState, game: CareerGame): GiraProgress {
  return s.giras[game] ?? { puntos: 0, vencidos: {}, jugadas: 0, puestos: {} };
}

const regionIndex = (id: RegionId) => REGION_IDS.indexOf(id);
const vencido = (p: GiraProgress, id: string) => (p.vencidos[id] ?? 0) > 0;
const idsDeRegion = (region: RegionId) => SLOTS.map((slot) => `${region}-${slot}`);

/**
 * El ranking de una región, del primero al último: el guardado o, si todavía no jugaste ahí, el inicial
 * (el jefe arriba, del "9" al "1" y vos último). Si ya le habías ganado a alguno (partidas de antes del ranking),
 * arrancás arriba del mejor que venciste.
 */
export function puestosDe(p: GiraProgress, region: RegionId): string[] {
  const guardado = p.puestos[region];
  if (guardado) return guardado.slice();
  const lista = idsDeRegion(region).reverse();
  const i = lista.findIndex((id) => vencido(p, id));
  lista.splice(i === -1 ? lista.length : i, 0, YO);
  return lista;
}

export function regionAbierta(gira: GiraDef, p: GiraProgress, i: number): boolean {
  if (i === 0) return true;
  const prev = gira.regiones[i - 1]!.region.id;
  return p.puntos >= gira.regiones[i]!.region.umbral && vencido(p, `${prev}-jefe`);
}

export interface EstadoRival {
  personaje: Personaje;
  skill: number;
  victorias: number;
  /** Se lo puede desafiar: está abajo mío o justo arriba (y la región está abierta). */
  abierto: boolean;
  /** Puesto en el ranking de la región (1 = primero). */
  puesto: number;
  /** Está arriba mío: ganarle me da su puesto. */
  arriba: boolean;
}

export interface EstadoRegion {
  index: number;
  id: RegionId;
  nombre: string;
  reglas: string;
  abierta: boolean;
  completa: boolean;
  /** Puntos que faltan para entrar (0 si ya alcanza). */
  faltanPuntos: number;
  /** Hay que ganarle al jefe anterior para entrar. */
  faltaJefeAnterior: boolean;
  /** Mi puesto en el ranking de la región (1 = primero). */
  miPuesto: number;
  /** Los rivales en el orden del ranking (yo voy en `miPuesto`). */
  rivales: EstadoRival[];
}

/**
 * Cómo está la gira: qué regiones están abiertas y el ranking de cada una. En una región abierta podés desafiar
 * a cualquiera de abajo y al que está justo arriba tuyo; el jefe arranca primero.
 */
export function estadoGira(gira: GiraDef, p: GiraProgress): EstadoRegion[] {
  return gira.regiones.map((r, i) => {
    const abierta = regionAbierta(gira, p, i);
    const puestos = puestosDe(p, r.region.id);
    const mio = puestos.indexOf(YO);
    const prev = i > 0 ? `${gira.regiones[i - 1]!.region.id}-jefe` : null;
    return {
      index: i,
      id: r.region.id,
      nombre: r.region.nombre,
      reglas: r.reglas,
      abierta,
      completa: vencido(p, `${r.region.id}-jefe`),
      faltanPuntos: Math.max(0, r.region.umbral - p.puntos),
      faltaJefeAnterior: prev !== null && !vencido(p, prev),
      miPuesto: mio + 1,
      rivales: puestos.flatMap((id, k) => {
        if (id === YO) return [];
        const pj = personaje(id);
        return [{ personaje: pj, skill: r.skills[pj.slot], victorias: p.vencidos[id] ?? 0, abierto: abierta && (k > mio || k === mio - 1), puesto: k + 1, arriba: k < mio }];
      }),
    };
  });
}

export function rivalAbierto(gira: GiraDef, p: GiraProgress, rivalId: string): boolean {
  return estadoGira(gira, p).some((r) => r.rivales.some((x) => x.personaje.id === rivalId && x.abierto));
}

export function tiene(s: CareerState, itemId: string): boolean {
  return s.desbloqueados.includes(itemId);
}

export function comprar(s: CareerState, itemId: string): { ok: true; state: CareerState } | { ok: false; error: string } {
  const item = TIENDA.find((t) => t.id === itemId);
  if (!item) return { ok: false, error: "Eso no está a la venta" };
  if (tiene(s, itemId)) return { ok: false, error: "Ya lo tenés" };
  if (s.fosforos < item.precio) return { ok: false, error: `Te faltan ${item.precio - s.fosforos} fósforos` };
  const next = structuredCloneish(s);
  next.fosforos -= item.precio;
  next.desbloqueados.push(itemId);
  return { ok: true, state: next };
}

function structuredCloneish(s: CareerState): CareerState {
  return JSON.parse(JSON.stringify(s)) as CareerState;
}

const hecho = <T extends Hecho["tipo"]>(r: Reporte, tipo: T) => r.hechos.filter((h): h is Extract<Hecho, { tipo: T }> => h.tipo === tipo);

/** Condición de cada logro, mirando la carrera ya actualizada y la partida que se acaba de jugar. */
function cumple(id: string, s: CareerState, r: Reporte): boolean {
  const c = s.contadores;
  const giraCompleta = (g: CareerGame) => vencido(progresoDe(s, g), "malvinas-jefe");
  switch (id) {
    case "primera-victoria":
      return (c.ganadas ?? 0) >= 1;
    case "diez-victorias":
      return (c.ganadas ?? 0) >= 10;
    case "cincuenta-victorias":
      return (c.ganadas ?? 0) >= 50;
    case "remontada":
      return r.ganada && !!r.remontada;
    case "paliza":
      return r.ganada && !!r.paliza;
    case "pasaporte":
      return CAREER_GAMES.some((g) => regionAbierta(GIRAS[g], progresoDe(s, g), 1));
    case "gira-completa":
      return CAREER_GAMES.some(giraCompleta);
    case "campeon-nacional":
      return CAREER_GAMES.every(giraCompleta);
    case "coleccionista":
      return s.desbloqueados.some((d) => d.startsWith("fondo:"));
    case "treinta-y-tres":
      return hecho(r, "truco-tanto").some((h) => h.valor === 33);
    case "vale-cuatro":
      return hecho(r, "truco-vale-cuatro-ganado").length > 0;
    case "ancho-en-tercera":
      return hecho(r, "truco-ancho-en-tercera").length > 0;
    case "chinchon":
      return hecho(r, "chinchon").length > 0;
    case "menos-diez":
      return hecho(r, "menos-diez").length > 0;
    case "ligador":
      return hecho(r, "ligadas").some((h) => h.cantidad >= 3);
    case "ladron":
      return hecho(r, "casita-robos").some((h) => h.cantidad >= 3);
    case "intocable":
      return r.ganada && r.game === "casita-robada" && hecho(r, "casita-me-robaron").some((h) => h.cantidad === 0);
    case "barrendero":
      return hecho(r, "escoba-escobas").some((h) => h.cantidad >= 5);
    case "escoba-de-mano":
      return hecho(r, "escoba-de-mano").length > 0;
    case "la-setenta":
      return hecho(r, "escoba-cuatro-sietes").length > 0;
    case "tutti-pleno":
      return hecho(r, "tutti-pleno").length > 0;
    case "tutti-rayo":
      return hecho(r, "tutti-basta").some((h) => h.segundos < 60);
    case "tutti-solo":
      return hecho(r, "tutti-solo").some((h) => h.cantidad >= 3);
    case "ascenso":
      return (c.ascensos ?? 0) >= 1;
    case "a-primera":
      return (c["llegadas-primera"] ?? 0) >= 1;
    case "campeon-primera":
      return (c.titulos ?? 0) >= 1;
    case "copa-argentina":
      return (c.copas ?? 0) >= 1;
    case "casa-grande":
      return hecho(r, "casita-cartas").some((h) => h.cantidad >= 25);
    default:
      return false;
  }
}

/**
 * Registra una partida terminada: estadísticas, puntos de gira, fósforos, desbloqueos y logros.
 * Pura: devuelve la carrera nueva y qué se ganó (para mostrarlo).
 */
export function registrarPartida(state: CareerState, r: Reporte): { state: CareerState; premio: Premio } {
  const s = structuredCloneish(state);
  const inc = (k: string, by = 1) => (s.contadores[k] = (s.contadores[k] ?? 0) + by);
  inc("partidas");
  inc(`partidas:${r.game}`);
  if (r.ganada) {
    inc("ganadas");
    inc(`ganadas:${r.game}`);
  }
  const premio: Premio = { puntos: 0, fosforos: r.ganada ? 15 : 3, logros: [], regionDesbloqueada: null, giraCompleta: false, regalo: null, puesto: null, ascenso: null };

  const ascenso = r.rivalId?.startsWith(PREFIJO_ASCENSO) && (CAREER_GAMES as readonly string[]).includes(r.game) ? s.ascensos[r.game as CareerGame] : undefined;
  if (ascenso) {
    const res = registrarAscenso(ascenso, r.rivalId!.slice(PREFIJO_ASCENSO.length), r.ganada);
    if (res) {
      s.ascensos[r.game as CareerGame] = res.progreso;
      premio.fosforos += res.fosforos;
      premio.ascenso = { lineas: res.lineas };
      if (res.ascendi) inc("ascensos");
      if (res.llegueAPrimera) inc("llegadas-primera");
      if (res.campeon) inc("titulos");
      if (res.copa) inc("copas");
    }
  }

  if (r.rivalId && (CAREER_GAMES as readonly string[]).includes(r.game) && PERSONAJES.some((x) => x.id === r.rivalId)) {
    const game = r.game as CareerGame;
    const gira = GIRAS[game];
    const before = estadoGira(gira, progresoDe(s, game));
    const p = progresoDe(s, game);
    p.jugadas++;
    const rival = personaje(r.rivalId);
    const abierto = rivalAbierto(gira, p, r.rivalId);
    const puestos = puestosDe(p, rival.region);
    const yo = puestos.indexOf(YO);
    const el = puestos.indexOf(r.rivalId);
    if (r.ganada && abierto) {
      const idx = regionIndex(rival.region);
      const primera = !vencido(p, r.rivalId);
      premio.puntos = Math.round(puntosPorVictoria(idx, rival.slot, el < yo) * (r.paliza ? 1.25 : 1));
      p.puntos += premio.puntos;
      p.vencidos[r.rivalId] = (p.vencidos[r.rivalId] ?? 0) + 1;
      premio.fosforos += primera ? (rival.slot === "jefe" ? 100 + 50 * idx : 15 + 5 * idx) : 5;
      // Le gané al de arriba: me quedo con su puesto y él baja uno.
      if (el < yo) {
        puestos.splice(yo, 1);
        puestos.splice(el, 0, YO);
      }
      if (primera && r.rivalId === "malvinas-jefe") premio.giraCompleta = true;
      if (primera && r.rivalId === "buenos-aires-jefe" && !tiene(s, REGALO_BUENOS_AIRES)) {
        s.desbloqueados.push(REGALO_BUENOS_AIRES);
        premio.regalo = REGALO_BUENOS_AIRES;
      }
    } else if (!r.ganada && abierto && el > yo) {
      // Perdí con uno de abajo: me pasa.
      puestos.splice(el, 1);
      puestos.splice(yo, 0, r.rivalId);
    }
    p.puestos[rival.region] = puestos;
    const ahora = puestos.indexOf(YO);
    if (ahora !== yo) premio.puesto = { region: rival.region, antes: yo + 1, despues: ahora + 1 };
    s.giras[game] = p;
    const after = estadoGira(gira, p);
    const nueva = after.find((x, i) => x.abierta && !before[i]!.abierta);
    premio.regionDesbloqueada = nueva?.id ?? null;
  }

  for (const l of LOGROS) {
    if (s.logros[l.id] !== undefined) continue;
    if (cumple(l.id, s, r)) {
      s.logros[l.id] = r.ahora;
      premio.logros.push(l);
      premio.fosforos += l.fosforos;
    }
  }
  s.fosforos += premio.fosforos;
  return { state: s, premio };
}
