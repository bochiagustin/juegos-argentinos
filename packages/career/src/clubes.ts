/**
 * Clubes del Ascenso. Los escudos los aportó el usuario, que declaró tener permiso para usarlos
 * (ver docs/licencias/escudos.md); van en apps/web/public/escudos/<id>.webp. Sin escudo, la app dibuja uno con los colores.
 * La categoría es la de arranque (después cada temporada suben y bajan). El nivel del bot es fijo por club:
 * la C juega de 1 a 4, la B Metro de 3 a 6, la Primera Nacional de 5 a 8 y Primera de 7 a 10.
 */
export const CATEGORIAS = ["c", "b", "nacional", "primera"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  c: "Primera C",
  b: "Primera B Metropolitana",
  nacional: "Primera Nacional",
  primera: "Primera División",
};

export interface Club {
  id: string;
  nombre: string;
  /** Sigla de 3 letras (para el escudo dibujado y la tabla). */
  corto: string;
  /** Color principal y secundario de la camiseta. */
  colores: [string, string];
  categoria: Categoria;
  /** Nivel del bot, 1–10. */
  nivel: number;
}

type Fila = [id: string, nombre: string, corto: string, c1: string, c2: string, nivel: number];

const PRIMERA: Fila[] = [
  ["river-plate", "River Plate", "RIV", "#ffffff", "#d71920", 10],
  ["boca-juniors", "Boca Juniors", "BOC", "#0b2a6f", "#f9c80e", 10],
  ["racing-club", "Racing Club", "RAC", "#7cc4ef", "#ffffff", 9],
  ["independiente", "Independiente", "IND", "#d71920", "#ffffff", 9],
  ["san-lorenzo", "San Lorenzo", "SLO", "#1d2f6f", "#c8102e", 9],
  ["estudiantes-lp", "Estudiantes de La Plata", "EST", "#d71920", "#ffffff", 9],
  ["velez-sarsfield", "Vélez Sarsfield", "VEL", "#ffffff", "#1d4fa0", 9],
  ["talleres", "Talleres", "TAL", "#0b2a6f", "#ffffff", 9],
  ["rosario-central", "Rosario Central", "CEN", "#1d4fa0", "#f9c80e", 8],
  ["newells", "Newell's Old Boys", "NOB", "#d71920", "#111111", 8],
  ["huracan", "Huracán", "HUR", "#ffffff", "#d71920", 8],
  ["lanus", "Lanús", "LAN", "#7a1f2b", "#ffffff", 8],
  ["argentinos-juniors", "Argentinos Juniors", "ARG", "#d71920", "#ffffff", 8],
  ["belgrano", "Belgrano", "BEL", "#5bb7e8", "#ffffff", 8],
  ["defensa-y-justicia", "Defensa y Justicia", "DYJ", "#f9c80e", "#1f8a3b", 8],
  ["gimnasia-lp", "Gimnasia y Esgrima La Plata", "GEL", "#ffffff", "#0b2a6f", 7],
  ["banfield", "Banfield", "BAN", "#1f8a3b", "#ffffff", 7],
  ["platense", "Platense", "PLA", "#ffffff", "#5a3a1e", 7],
  ["tigre", "Tigre", "TIG", "#0b2a6f", "#d71920", 7],
  ["union", "Unión de Santa Fe", "UNI", "#d71920", "#ffffff", 7],
];

const NACIONAL: Fila[] = [
  ["colon", "Colón", "COL", "#d71920", "#111111", 8],
  ["quilmes", "Quilmes", "QUI", "#ffffff", "#0b2a6f", 7],
  ["chacarita", "Chacarita Juniors", "CHA", "#d71920", "#111111", 7],
  ["ferro", "Ferro Carril Oeste", "FER", "#1f8a3b", "#ffffff", 7],
  ["arsenal", "Arsenal de Sarandí", "ARS", "#5bb7e8", "#d71920", 7],
  ["all-boys", "All Boys", "ALL", "#ffffff", "#111111", 6],
  ["almirante-brown", "Almirante Brown", "ALM", "#f9c80e", "#111111", 6],
  ["atlanta", "Atlanta", "ATL", "#0b2a6f", "#f9c80e", 6],
  ["nueva-chicago", "Nueva Chicago", "NCH", "#1f8a3b", "#111111", 6],
  ["san-martin-tucuman", "San Martín de Tucumán", "SMT", "#d71920", "#ffffff", 7],
  ["patronato", "Patronato", "PAT", "#d71920", "#111111", 6],
  ["temperley", "Temperley", "TEM", "#5bb7e8", "#ffffff", 6],
  ["deportivo-moron", "Deportivo Morón", "MOR", "#ffffff", "#d71920", 6],
  ["estudiantes-ba", "Estudiantes de Buenos Aires", "EBA", "#111111", "#ffffff", 5],
  ["chaco-for-ever", "Chaco For Ever", "CFE", "#111111", "#ffffff", 5],
  ["agropecuario", "Agropecuario", "AGR", "#1f8a3b", "#ffffff", 5],
  ["defensores-belgrano", "Defensores de Belgrano", "DEF", "#d71920", "#111111", 5],
  ["tristan-suarez", "Tristán Suárez", "TRI", "#5bb7e8", "#ffffff", 5],
  ["los-andes", "Los Andes", "AND", "#d71920", "#ffffff", 5],
  ["deportivo-maipu", "Deportivo Maipú", "MAI", "#d71920", "#ffffff", 5],
];

const B_METRO: Fila[] = [
  ["comunicaciones", "Comunicaciones", "COM", "#f9c80e", "#111111", 5],
  ["deportivo-armenio", "Deportivo Armenio", "ARM", "#d71920", "#0b2a6f", 5],
  ["excursionistas", "Excursionistas", "EXC", "#1f8a3b", "#ffffff", 4],
  ["villa-dalmine", "Villa Dálmine", "VDA", "#7a1f2b", "#ffffff", 6],
  ["colegiales", "Colegiales", "CLG", "#d71920", "#0b2a6f", 4],
  ["fenix", "Fénix", "FEN", "#0b2a6f", "#ffffff", 4],
  ["acassuso", "Acassuso", "ACA", "#5bb7e8", "#ffffff", 4],
  ["talleres-re", "Talleres de Remedios de Escalada", "TRE", "#d71920", "#ffffff", 4],
  ["sacachispas", "Sacachispas", "SAC", "#7a2a8a", "#ffffff", 3],
  ["dock-sud", "Dock Sud", "DOC", "#5bb7e8", "#ffffff", 3],
  ["uai-urquiza", "UAI Urquiza", "UAI", "#d71920", "#ffffff", 4],
  ["argentino-quilmes", "Argentino de Quilmes", "AQU", "#5bb7e8", "#ffffff", 4],
  ["flandria", "Flandria", "FLA", "#1f8a3b", "#ffffff", 4],
  ["san-miguel", "San Miguel", "SMI", "#1f8a3b", "#ffffff", 5],
  ["deportivo-merlo", "Deportivo Merlo", "MER", "#5bb7e8", "#ffffff", 4],
  ["defensores-unidos", "Defensores Unidos", "DUN", "#d71920", "#0b2a6f", 4],
  ["real-pilar", "Real Pilar", "RPI", "#0b2a6f", "#ffffff", 3],
  ["brown-adrogue", "Brown de Adrogué", "BRO", "#f9c80e", "#111111", 6],
  ["midland", "Ferrocarril Midland", "MID", "#5bb7e8", "#0b2a6f", 3],
  ["liniers", "Liniers", "LIN", "#111111", "#ffffff", 3],
];

const C: Fila[] = [
  ["deportivo-espanol", "Deportivo Español", "ESP", "#d71920", "#f9c80e", 4],
  ["victoriano-arenas", "Victoriano Arenas", "VAR", "#0b2a6f", "#ffffff", 3],
  ["sportivo-italiano", "Sportivo Italiano", "ITA", "#5bb7e8", "#ffffff", 3],
  ["lugano", "Lugano", "LUG", "#5bb7e8", "#d71920", 2],
  ["central-cordoba-rosario", "Central Córdoba de Rosario", "CCR", "#0b2a6f", "#d71920", 3],
  ["argentino-rosario", "Argentino de Rosario", "ARO", "#ffffff", "#0b2a6f", 3],
  ["el-porvenir", "El Porvenir", "POR", "#111111", "#ffffff", 3],
  ["canuelas", "Cañuelas", "CAÑ", "#d71920", "#ffffff", 2],
  ["leandro-n-alem", "Leandro N. Alem", "ALE", "#5bb7e8", "#ffffff", 2],
  ["juventud-unida", "Juventud Unida", "JUV", "#1f8a3b", "#ffffff", 2],
  ["berazategui", "Berazategui", "BER", "#1f8a3b", "#ffffff", 2],
  ["lujan", "Luján", "LUJ", "#ffffff", "#7a1f2b", 2],
  ["ituzaingo", "Ituzaingó", "ITU", "#1f8a3b", "#ffffff", 2],
  ["argentino-merlo", "Argentino de Merlo", "AME", "#5bb7e8", "#ffffff", 3],
  ["claypole", "Claypole", "CLA", "#ffffff", "#d71920", 1],
  ["sportivo-barracas", "Sportivo Barracas", "SBA", "#1f8a3b", "#d71920", 1],
  ["laferrere", "Deportivo Laferrere", "LAF", "#1f8a3b", "#ffffff", 2],
  ["general-lamadrid", "General Lamadrid", "GLA", "#111111", "#ffffff", 1],
  ["centro-espanol", "Centro Español", "CES", "#d71920", "#f9c80e", 1],
];

const armar = (filas: Fila[], categoria: Categoria): Club[] =>
  filas.map(([id, nombre, corto, c1, c2, nivel]) => ({ id, nombre, corto, colores: [c1, c2], categoria, nivel }));

/** 79 clubes: 20 por categoría y 19 en la C (el lugar 20 es el tuyo). */
export const CLUBES: Club[] = [...armar(PRIMERA, "primera"), ...armar(NACIONAL, "nacional"), ...armar(B_METRO, "b"), ...armar(C, "c")];

export function club(id: string): Club | undefined {
  return CLUBES.find((c) => c.id === id);
}
