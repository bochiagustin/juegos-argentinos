import { club } from "./clubes.ts";
import { filaVacia, fixture, LIBRE, mezclar, nivelClub, posiciones, simular, sumar, YO_CLUB, type Cruce, type FilaTabla } from "./torneo.ts";

/**
 * Copas del Ascenso: un motor para todas. Opcionalmente una fase de grupos (todos contra todos, a una o dos ruedas; el
 * sorteo es por bombos según el nivel) y después eliminación directa a partido único. Se juega de a un "paso" (una fecha
 * de grupos o una ronda de cruces); los partidos de la máquina se simulan y el mío lo pone quien llama.
 */

export type CopaId = "supercopa" | "recopa" | "copa-argentina" | "copa-liga" | "libertadores" | "sudamericana";

export const COPAS: { id: CopaId; nombre: string; corto: string; icono: string; color: string; internacional: boolean }[] = [
  { id: "supercopa", nombre: "Supercopa Argentina", corto: "Supercopa", icono: "⭐", color: "#f59e0b", internacional: false },
  { id: "recopa", nombre: "Recopa Sudamericana", corto: "Recopa", icono: "🌎", color: "#0ea5e9", internacional: true },
  { id: "copa-argentina", nombre: "Copa Argentina", corto: "Copa Argentina", icono: "🏆", color: "#63b3ed", internacional: false },
  { id: "copa-liga", nombre: "Copa de la Liga", corto: "Copa de la Liga", icono: "🥇", color: "#22c55e", internacional: false },
  { id: "libertadores", nombre: "Copa Libertadores", corto: "Libertadores", icono: "🏆", color: "#eab308", internacional: true },
  { id: "sudamericana", nombre: "Copa Sudamericana", corto: "Sudamericana", icono: "🏆", color: "#3b82f6", internacional: true },
];

export const copaInfo = (id: CopaId) => COPAS.find((c) => c.id === id)!;

export interface Copa {
  id: CopaId;
  /** Fase de grupos (`null` = eliminación directa desde el arranque). */
  grupos: string[][] | null;
  ruedas: 1 | 2;
  /** Cuántos pasan de cada grupo. */
  pasan: number;
  tabla: Record<string, FilaTabla>;
  /** Fechas de grupos ya jugadas. */
  fecha: number;
  rondas: Cruce[][];
  campeon: string | null;
}

/** Nombre de una ronda de eliminación según cuántos quedan. */
export function nombreRonda(equipos: number): string {
  return equipos === 2 ? "Final" : equipos === 4 ? "Semifinal" : equipos === 8 ? "Cuartos de final" : equipos === 16 ? "Octavos de final" : `${equipos / 2}avos de final`;
}

const LETRAS = "ABCDEFGH";
export const letraGrupo = (g: number) => LETRAS[g]!;

/** Copa a eliminación directa: los cruces salen del orden de `equipos` (sorteado antes). */
export function copaEliminacion(id: CopaId, equipos: string[]): Copa {
  const rondas = [Array.from({ length: equipos.length / 2 }, (_, i) => ({ a: equipos[2 * i]!, b: equipos[2 * i + 1]! }))];
  return { id, grupos: null, ruedas: 1, pasan: 0, tabla: {}, fecha: 0, rondas, campeon: null };
}

const pais = (id: string) => club(id)?.pais ?? "Argentina";

/**
 * Copa con grupos: sorteo por bombos (los mejores, uno por grupo). Como en la Conmebol, se evita que caigan dos del
 * mismo país en un grupo (si el bombo lo permite).
 */
export function copaGrupos(id: CopaId, equipos: string[], grupos: number, ruedas: 1 | 2, pasan: number, clave: string): Copa {
  const porNivel = mezclar(equipos, `${clave}:bombos`).sort((a, b) => nivelClub(b) - nivelClub(a));
  const g: string[][] = Array.from({ length: grupos }, () => []);
  for (let b = 0; b * grupos < porNivel.length; b++) {
    const bombo = mezclar(porNivel.slice(b * grupos, (b + 1) * grupos), `${clave}:bombo:${b}`);
    // Busca el reparto del bombo con menos choques de compatriotas (8 equipos: búsqueda chica).
    let mejor: number[] | null = null;
    let menos = Infinity;
    const asignado: number[] = [];
    const usados = new Set<number>();
    const buscar = (i: number, choques: number) => {
      if (choques >= menos) return;
      if (i === bombo.length) {
        menos = choques;
        mejor = asignado.slice();
        return;
      }
      for (let k = 0; k < grupos; k++) {
        if (usados.has(k)) continue;
        usados.add(k);
        asignado.push(k);
        buscar(i + 1, choques + g[k]!.filter((y) => pais(y) === pais(bombo[i]!)).length);
        asignado.pop();
        usados.delete(k);
        if (menos === 0) return;
      }
    };
    buscar(0, 0);
    bombo.forEach((x, i) => g[mejor![i]!]!.push(x));
  }
  return { id, grupos: g, ruedas, pasan, tabla: Object.fromEntries(equipos.map((x) => [x, filaVacia()])), fecha: 0, rondas: [], campeon: null };
}

const conLibre = (grupo: string[]) => (grupo.length % 2 ? [...grupo, LIBRE] : grupo);

export function fechasDeGrupos(c: Copa): number {
  if (!c.grupos) return 0;
  return (conLibre(c.grupos[0]!).length - 1) * c.ruedas;
}

/** Cuántos pasos tiene la copa entera (fechas de grupos + rondas de cruces). */
export function pasosCopa(c: Copa): number {
  const cruces = c.grupos ? c.grupos.length * c.pasan : c.rondas[0]!.length * 2;
  return fechasDeGrupos(c) + Math.log2(cruces);
}

export type PasoCopa = { tipo: "grupos"; fecha: number } | { tipo: "cruces"; ronda: number; equipos: number };

export function pasoActual(c: Copa): PasoCopa | null {
  if (c.campeon) return null;
  if (c.grupos && c.fecha < fechasDeGrupos(c)) return { tipo: "grupos", fecha: c.fecha + 1 };
  const r = c.rondas.length - 1;
  return { tipo: "cruces", ronda: r, equipos: c.rondas[r]!.length * 2 };
}

export function nombrePaso(paso: PasoCopa): string {
  return paso.tipo === "grupos" ? `Fecha ${paso.fecha} de grupos` : nombreRonda(paso.equipos);
}

/** Los partidos del paso que viene (sin los de "libre"). */
export function partidosDelPaso(c: Copa): [string, string][] {
  const paso = pasoActual(c);
  if (!paso) return [];
  if (paso.tipo === "cruces") return c.rondas[paso.ronda]!.filter((x) => !x.ganador).map((x) => [x.a, x.b]);
  const n = conLibre(c.grupos![0]!).length - 1;
  const f = ((paso.fecha - 1) % n) + 1;
  return c.grupos!.flatMap((g) => fixture(conLibre(g), f)).filter(([a, b]) => a !== LIBRE && b !== LIBRE);
}

/** Mi rival en el paso que viene, o null si no juego (no estoy, quedé afuera o tengo fecha libre). */
export function rivalEnCopa(c: Copa): string | null {
  const par = partidosDelPaso(c).find((x) => x.includes(YO_CLUB));
  return par ? (par[0] === YO_CLUB ? par[1] : par[0]) : null;
}

export function sigoEnCopa(c: Copa): boolean {
  if (c.campeon) return c.campeon === YO_CLUB;
  if (c.grupos && c.fecha < fechasDeGrupos(c)) return c.grupos.some((g) => g.includes(YO_CLUB));
  const r = c.rondas[c.rondas.length - 1];
  return !!r?.some((x) => x.a === YO_CLUB || x.b === YO_CLUB);
}

export function esFinal(c: Copa): boolean {
  const p = pasoActual(c);
  return p?.tipo === "cruces" && p.equipos === 2;
}

export function tablaGrupo(c: Copa, g: number): { id: string; fila: FilaTabla }[] {
  return posiciones(c.tabla, c.grupos![g]!, `${c.id}:grupo`).map((id) => ({ id, fila: c.tabla[id] ?? filaVacia() }));
}

/** Los cruces después de los grupos, armados para que los primeros se crucen con segundos de otro grupo. */
function armarCruces(c: Copa): Cruce[] {
  const t = c.grupos!.map((_, g) => tablaGrupo(c, g).map((x) => x.id));
  if (c.grupos!.length === 2) {
    // Dos zonas, pasan 4: 1A-4B, 2B-3A | 1B-4A, 2A-3B (los primeros solo se cruzan en la final).
    const [A, B] = t as [string[], string[]];
    return [
      { a: A[0]!, b: B[3]! },
      { a: B[1]!, b: A[2]! },
      { a: B[0]!, b: A[3]! },
      { a: A[1]!, b: B[2]! },
    ];
  }
  // Grupos de a pares (A-B, C-D…): 1º de uno contra 2º del otro, y los primeros de cada par en mitades distintas.
  const arriba: Cruce[] = [];
  const abajo: Cruce[] = [];
  for (let g = 0; g < t.length; g += 2) {
    arriba.push({ a: t[g]![0]!, b: t[g + 1]![1]! });
    abajo.push({ a: t[g + 1]![0]!, b: t[g]![1]! });
  }
  return [...arriba, ...abajo];
}

/**
 * Juega el paso que viene: los partidos de la máquina se simulan y el mío (si hay) lo gana `ganadorMio`.
 * Devuelve la copa nueva (no muta la de entrada).
 */
export function jugarPasoCopa(c0: Copa, clave: string, ganadorMio?: string): Copa {
  const c: Copa = JSON.parse(JSON.stringify(c0)) as Copa;
  const paso = pasoActual(c);
  if (!paso) return c;
  const gana = (a: string, b: string, k: string) => (a === YO_CLUB || b === YO_CLUB ? ganadorMio! : simular(a, b, `${clave}:${c.id}:${k}:${a}`));
  if (paso.tipo === "grupos") {
    for (const [a, b] of partidosDelPaso(c)) {
      const g = gana(a, b, `g${paso.fecha}`);
      sumar(c.tabla, g, g === a ? b : a);
    }
    c.fecha++;
    if (c.fecha === fechasDeGrupos(c)) c.rondas.push(armarCruces(c));
    return c;
  }
  const ronda = c.rondas[paso.ronda]!;
  for (const x of ronda) x.ganador ??= gana(x.a, x.b, `r${paso.ronda}`);
  if (ronda.length === 1) c.campeon = ronda[0]!.ganador!;
  else c.rondas.push(Array.from({ length: ronda.length / 2 }, (_, i) => ({ a: ronda[2 * i]!.ganador!, b: ronda[2 * i + 1]!.ganador! })));
  return c;
}

/** Hasta dónde llegué, en palabras ("Campeón", "Semifinal", "Fase de grupos"), o null si no la jugué. */
export function alcanceEnCopa(c: Copa): string | null {
  if (c.campeon === YO_CLUB) return "Campeón";
  for (let r = c.rondas.length - 1; r >= 0; r--) if (c.rondas[r]!.some((x) => x.a === YO_CLUB || x.b === YO_CLUB)) return nombreRonda(c.rondas[r]!.length * 2);
  if (c.grupos?.some((g) => g.includes(YO_CLUB))) return "Fase de grupos";
  return null;
}
