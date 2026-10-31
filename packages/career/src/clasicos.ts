/**
 * Los clásicos del Ascenso: cuando tu club se cruza con su rival de toda la vida (en la liga o en una copa), el partido se
 * marca como clásico, el rival juega un nivel más arriba y ganarlo da fósforos extra y logros.
 */
const CLASICOS: [a: string, b: string, nombre: string][] = [
  ["river-plate", "boca-juniors", "Superclásico"],
  ["racing-club", "independiente", "Clásico de Avellaneda"],
  ["rosario-central", "newells-old-boys", "Clásico rosarino"],
  ["estudiantes-de-la-plata", "gimnasia-y-esgrima-lp", "Clásico platense"],
  ["san-lorenzo", "huracan", "Clásico de barrios"],
  ["talleres", "belgrano", "Clásico cordobés"],
  ["belgrano", "instituto-cordoba", "Clásico cordobés"],
  ["talleres", "instituto-cordoba", "Clásico cordobés"],
  ["colon-santa-fe", "union", "Clásico santafesino"],
  ["banfield", "lanus", "Clásico del Sur"],
  ["temperley", "banfield", "Clásico del Sur"],
  ["los-andes", "temperley", "Clásico del Sur"],
  ["velez-sarsfield", "ferro-carril-oeste", "Clásico del Oeste"],
  ["godoy-cruz", "independiente-rivadavia", "Clásico mendocino"],
  ["gimnasia-y-esgrima", "independiente-rivadavia", "Clásico mendocino"],
  ["godoy-cruz", "gimnasia-y-esgrima", "Clásico mendocino"],
  ["atletico-tucuman", "san-martin-tucuman", "Clásico tucumano"],
  ["chacarita-juniors", "atletico-atlanta", "Clásico de Villa Crespo"],
  ["all-boys", "atletico-atlanta", "Clásico de Floresta"],
  ["nueva-chicago", "deportivo-moron", "Clásico del Oeste"],
  ["quilmes", "argentino-de-quilmes", "Clásico quilmeño"],
  ["defensores-de-belgrano", "excursionistas", "Clásico del Bajo Belgrano"],
  ["tigre", "atletico-platense", "Clásico de Zona Norte"],
  ["gimnasia-y-tiro", "central-norte", "Clásico salteño"],
  ["central-cordoba-se", "mitre-santiago-del-estero", "Clásico santiagueño"],
  ["dock-sud", "san-telmo", "Clásico de la Isla Maciel"],
  ["deportivo-merlo", "argentino-de-merlo", "Clásico de Merlo"],
];

/** El nombre del clásico entre dos clubes, o null si no son rivales. */
export function clasico(a: string, b: string): string | null {
  return CLASICOS.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2] ?? null;
}

/** Los rivales clásicos de un club (para la ficha). */
export function rivalesClasicos(id: string): { rival: string; nombre: string }[] {
  return CLASICOS.flatMap(([x, y, nombre]) => (x === id ? [{ rival: y, nombre }] : y === id ? [{ rival: x, nombre }] : []));
}
