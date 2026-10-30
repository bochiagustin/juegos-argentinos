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
  ["boca-juniors", "Boca Juniors", "BOC", "#103050", "#f0d030", 10],
  ["river-plate", "River Plate", "RIV", "#f0f0f0", "#f01030", 10],
  ["estudiantes-de-la-plata", "Estudiantes de La Plata", "EST", "#f01030", "#f0f0f0", 9],
  ["huracan", "Huracán", "HUR", "#f0f0f0", "#d03030", 9],
  ["independiente", "Independiente", "IND", "#f01030", "#f0f0f0", 9],
  ["racing-club", "Racing Club", "RAC", "#1090d0", "#f0f0f0", 9],
  ["rosario-central", "Rosario Central", "ROS", "#103070", "#f0d030", 9],
  ["san-lorenzo", "San Lorenzo", "SAN", "#303050", "#f03030", 9],
  ["talleres", "Talleres de Córdoba", "TAL", "#101030", "#f0f0f0", 9],
  ["velez-sarsfield", "Vélez Sarsfield", "VEL", "#f0f0f0", "#1070b0", 9],
  ["argentinos-juniors", "Argentinos Juniors", "ARG", "#f0f0f0", "#105090", 8],
  ["barracas-central", "Barracas Central", "BAR", "#f0f0f0", "#f01010", 8],
  ["belgrano", "Belgrano", "BEL", "#f0f0f0", "#10b0f0", 8],
  ["defensa-y-justicia", "Defensa y Justicia", "DEF", "#107030", "#f0d010", 8],
  ["gimnasia-y-esgrima-lp", "Gimnasia y Esgrima La Plata", "GIM", "#f0f0f0", "#9090b0", 8],
  ["independiente-rivadavia", "Independiente Rivadavia", "IND", "#301070", "#f0f0f0", 8],
  ["instituto-cordoba", "Instituto", "INS", "#d01010", "#f0f0f0", 8],
  ["lanus", "Lanús", "LAN", "#b03030", "#f0f0f0", 8],
  ["newells-old-boys", "Newell's Old Boys", "NEW", "#101010", "#f03030", 8],
  ["atletico-platense", "Platense", "PLA", "#f0f0f0", "#503010", 8],
  ["tigre", "Tigre", "TIG", "#105090", "#f03030", 8],
  ["union", "Unión de Santa Fe", "UNI", "#f0f0f0", "#f01030", 8],
  ["aldosivi", "Aldosivi", "ALD", "#f0d030", "#30b070", 7],
  ["atletico-tucuman", "Atlético Tucumán", "TUC", "#f0f0f0", "#70b0d0", 7],
  ["banfield", "Banfield", "BAN", "#109030", "#f0f0f0", 7],
  ["central-cordoba-se", "Central Córdoba de Santiago", "CEN", "#f0f0f0", "#101010", 7],
  ["deportivo-riestra", "Deportivo Riestra", "RIE", "#f0f0f0", "#303030", 7],
  ["estudiantes-de-rio-cuarto", "Estudiantes de Río Cuarto", "EST", "#f0f0f0", "#1090d0", 7],
  ["gimnasia-y-esgrima", "Gimnasia de Mendoza", "GIM", "#f0f0f0", "#101010", 7],
  ["sarmiento", "Sarmiento", "SAR", "#109050", "#f0f0f0", 7],
];

const NACIONAL: Fila[] = [
  ["colon-santa-fe", "Colón", "COL", "#101010", "#f01010", 8],
  ["godoy-cruz", "Godoy Cruz", "GOD", "#d0d0d0", "#1070b0", 8],
  ["san-martin-sj", "San Martín de San Juan", "SAN", "#101010", "#50b030", 8],
  ["san-martin-tucuman", "San Martín de Tucumán", "SAN", "#f0f0f0", "#b01010", 8],
  ["almirante-brown", "Almirante Brown", "ALM", "#f0f010", "#101010", 7],
  ["atletico-atlanta", "Atlanta", "ATL", "#303090", "#f0b010", 7],
  ["atletico-de-rafaela", "Atlético de Rafaela", "RAF", "#f0f0f0", "#1090d0", 7],
  ["chacarita-juniors", "Chacarita Juniors", "CHA", "#101010", "#d01010", 7],
  ["deportivo-madryn", "Deportivo Madryn", "MAD", "#101010", "#f0d010", 7],
  ["deportivo-moron", "Deportivo Morón", "MOR", "#f0f0f0", "#b01030", 7],
  ["ferro-carril-oeste", "Ferro Carril Oeste", "FER", "#f0f0f0", "#107030", 7],
  ["gimnasia-de-jujuy", "Gimnasia de Jujuy", "GIM", "#101010", "#f0f0f0", 7],
  ["gimnasia-y-tiro", "Gimnasia y Tiro", "GIM", "#f0f0f0", "#1090f0", 7],
  ["nueva-chicago", "Nueva Chicago", "NUE", "#301030", "#10b050", 7],
  ["patronato", "Patronato", "PAT", "#101010", "#d01010", 7],
  ["quilmes", "Quilmes", "QUI", "#f0f0f0", "#101050", 7],
  ["agropecuario-argentino", "Agropecuario", "AGR", "#109050", "#f01030", 6],
  ["all-boys", "All Boys", "ALL", "#f0f0f0", "#101010", 6],
  ["almagro", "Almagro", "ALM", "#101010", "#f0f0f0", 6],
  ["chaco-for-ever", "Chaco For Ever", "CHA", "#f0f0f0", "#101010", 6],
  ["defensores-de-belgrano", "Defensores de Belgrano", "DEF", "#101010", "#f03030", 6],
  ["deportivo-maipu", "Deportivo Maipú", "MAI", "#101010", "#f01010", 6],
  ["estudiantes-de-buenos-aires", "Estudiantes de Buenos Aires", "EST", "#f0f0f0", "#101010", 6],
  ["guemes", "Güemes", "GUE", "#105090", "#f01010", 6],
  ["los-andes", "Los Andes", "AND", "#f01010", "#f0f0f0", 6],
  ["mitre-santiago-del-estero", "Mitre de Santiago del Estero", "MIT", "#f0d010", "#101010", 6],
  ["racing", "Racing de Córdoba", "RAC", "#f0f0f0", "#10b0d0", 6],
  ["temperley", "Temperley", "TEM", "#f0f0f0", "#10b0f0", 6],
  ["tristan-suarez", "Tristán Suárez", "TRI", "#101050", "#f0f0f0", 6],
  ["acassuso", "Acassuso", "ACA", "#f0f0f0", "#303090", 5],
  ["central-norte", "Central Norte", "CEN", "#101010", "#f0f0f0", 5],
  ["ciudad-de-bolivar", "Ciudad de Bolívar", "CIU", "#1010f0", "#f0f0f0", 5],
  ["colegiales", "Colegiales", "COL", "#303090", "#f01030", 5],
  ["ferrocarril-midland", "Ferrocarril Midland", "FER", "#f0f0f0", "#101010", 5],
  ["san-miguel", "San Miguel", "SAN", "#109050", "#f0f0f0", 5],
  ["san-telmo", "San Telmo", "SAN", "#105090", "#10b0f0", 5],
];

const B_METRO: Fila[] = [
  ["arsenal-de-sarandi", "Arsenal de Sarandí", "ARS", "#10b0f0", "#f03030", 6],
  ["brown-de-adrogue", "Brown de Adrogué", "BRO", "#d01010", "#303010", 6],
  ["villa-dalmine", "Villa Dálmine", "VIL", "#501070", "#f0f0f0", 6],
  ["comunicaciones", "Comunicaciones", "COM", "#f0f0f0", "#f0d010", 5],
  ["deportivo-armenio", "Deportivo Armenio", "ARM", "#f0f0f0", "#101010", 5],
  ["deportivo-merlo", "Deportivo Merlo", "MER", "#f0f0f0", "#301070", 5],
  ["talleres-remedios-de-escalada", "Talleres de Remedios de Escalada", "TAL", "#f0f0f0", "#f01010", 5],
  ["uai-urquiza", "UAI Urquiza", "UAI", "#30b0f0", "#701030", 5],
  ["villa-san-carlos", "Villa San Carlos", "VIL", "#3090f0", "#f0f0f0", 5],
  ["argentino-de-quilmes", "Argentino de Quilmes", "ARG", "#f0f0f0", "#10b0f0", 4],
  ["defensores-unidos", "Defensores Unidos", "DEF", "#1090d0", "#d0f0f0", 4],
  ["deportivo-laferrere", "Deportivo Laferrere", "LAF", "#f0f0f0", "#109030", 4],
  ["dock-sud", "Dock Sud", "DOC", "#f0d010", "#1010f0", 4],
  ["excursionistas", "Excursionistas", "EXC", "#107030", "#f0f0f0", 4],
  ["flandria", "Flandria", "FLA", "#f0d010", "#101010", 4],
  ["real-pilar", "Real Pilar", "REA", "#f0f0f0", "#505050", 4],
  ["san-martin-de-burzaco", "San Martín de Burzaco", "SAN", "#f0f0f0", "#101050", 4],
  ["argentino-de-merlo", "Argentino de Merlo", "ARG", "#f0f0f0", "#10d0f0", 3],
  ["deportivo-camioneros", "Deportivo Camioneros", "CAM", "#f0f0f0", "#709070", 3],
  ["ituzaingo", "Ituzaingó", "ITU", "#109030", "#f0f0f0", 3],
  ["liniers", "Liniers", "LIN", "#1090f0", "#f0f0f0", 3],
  ["sportivo-italiano", "Sportivo Italiano", "ITA", "#103070", "#f0f0f0", 3],
];

const C: Fila[] = [
  ["central-cordoba-rosario", "Central Córdoba de Rosario", "CEN", "#103050", "#f0f0f0", 4],
  ["deportivo-espanol", "Deportivo Español", "ESP", "#101010", "#b01010", 4],
  ["el-porvenir", "El Porvenir", "POR", "#f0f0f0", "#101010", 4],
  ["fenix", "Fénix", "FEN", "#f0f0f0", "#101010", 4],
  ["sacachispas", "Sacachispas", "SAC", "#f0f0f0", "#d090f0", 4],
  ["victoriano-arenas", "Victoriano Arenas", "VIC", "#10b0f0", "#f0f0f0", 4],
  ["argentino-de-rosario", "Argentino de Rosario", "ARG", "#1070d0", "#f0f0f0", 3],
  ["berazategui", "Berazategui", "BER", "#f05010", "#f0f0f0", 3],
  ["canuelas", "Cañuelas", "CAN", "#d03030", "#f0f0f0", 3],
  ["deportivo-muniz", "Deportivo Muñiz", "MUN", "#f01010", "#f0f0f0", 3],
  ["deportivo-paraguayo", "Deportivo Paraguayo", "PAR", "#f0f0f0", "#303090", 3],
  ["jj-urquiza", "J. J. Urquiza", "URQ", "#1090f0", "#f0f0f0", 3],
  ["leandro-n-alem", "Leandro N. Alem", "LEA", "#1030b0", "#f0d010", 3],
  ["lugano", "Lugano", "LUG", "#f0f0f0", "#f05010", 3],
  ["atlas-argentina", "Atlas", "ATL", "#301010", "#f0f0f0", 2],
  ["central-ballester", "Central Ballester", "CEN", "#303090", "#f0f010", 2],
  ["claypole", "Claypole", "CLA", "#f0f0f0", "#101010", 2],
  ["defensores-de-cambaceres", "Defensores de Cambaceres", "DEF", "#f01010", "#f0b0b0", 2],
  ["juventud-unida-san-miguel", "Juventud Unida", "JUV", "#f0f0f0", "#f01010", 2],
  ["lujan", "Luján", "LUJ", "#101010", "#f0f0f0", 2],
  ["sportivo-barracas", "Sportivo Barracas", "BAR", "#f0f0f0", "#101070", 2],
  ["yupanqui", "Yupanqui", "YUP", "#70d0f0", "#d01010", 2],
  ["centro-espanol", "Centro Español", "CEN", "#103070", "#507090", 1],
  ["club-mercedes", "Club Mercedes", "MER", "#f0f0f0", "#101010", 1],
  ["estrella-del-sur", "Estrella del Sur", "EST", "#101010", "#f0f0f0", 1],
  ["general-lamadrid", "General Lamadrid", "GEN", "#101030", "#f0f0f0", 1],
  ["leones-de-rosario", "Leones de Rosario", "LEO", "#101010", "#f0f0f0", 1],
  ["puerto-nuevo", "Puerto Nuevo", "PUE", "#1010f0", "#f0d010", 1],
];

const armar = (filas: Fila[], categoria: Categoria): Club[] =>
  filas.map(([id, nombre, corto, c1, c2, nivel]) => ({ id, nombre, corto, colores: [c1, c2], categoria, nivel }));

/** Cuántos equipos tiene cada categoría (todos pares: el fixture es a una rueda). */
export const TAMANO: Record<Categoria, number> = { primera: 30, nacional: 36, b: 22, c: 28 };

/** Los 116 clubes, de Primera a la C. */
export const CLUBES: Club[] = [...armar(PRIMERA, "primera"), ...armar(NACIONAL, "nacional"), ...armar(B_METRO, "b"), ...armar(C, "c")];

export function club(id: string): Club | undefined {
  return CLUBES.find((c) => c.id === id);
}
