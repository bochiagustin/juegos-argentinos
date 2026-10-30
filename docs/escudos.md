# Escudos del Ascenso

Un archivo por club, **PNG con fondo transparente** (sirve también JPG/WebP con fondo blanco liso), cuadrado o
vertical, de **512 px o más**. El nombre del archivo puede ser el nombre del club ("River Plate.png", "Velez.png") o
su id ("river-plate.png"): el script los reconoce solo y avisa los que no.

1. Subí todos a una carpeta `ESCUDOS/` en la raíz del repo.
2. Se procesan con `python3 tools/escudos.py ESCUDOS` (recorta, saca el fondo blanco y guarda
   `apps/web/public/arte/escudos/<id>.webp` a 256 px) y la carpeta original se borra del repo.
3. Los que falten se siguen viendo con un escudo dibujado con los colores del club.

Uso declarado con permiso del dueño del proyecto: ver `docs/licencias/escudos.md`.

Los planteles de cada categoría son los de arranque (aproximados a la temporada 2025; se cambian en
`packages/career/src/clubes.ts`). Entre paréntesis, el nivel del bot.

## Primera División (20)

- [ ] River Plate — `river-plate` (10)
- [ ] Boca Juniors — `boca-juniors` (10)
- [ ] Racing Club — `racing-club` (9)
- [ ] Independiente — `independiente` (9)
- [ ] San Lorenzo — `san-lorenzo` (9)
- [ ] Estudiantes de La Plata — `estudiantes-lp` (9)
- [ ] Vélez Sarsfield — `velez-sarsfield` (9)
- [ ] Talleres — `talleres` (9)
- [ ] Rosario Central — `rosario-central` (8)
- [ ] Newell's Old Boys — `newells` (8)
- [ ] Huracán — `huracan` (8)
- [ ] Lanús — `lanus` (8)
- [ ] Argentinos Juniors — `argentinos-juniors` (8)
- [ ] Belgrano — `belgrano` (8)
- [ ] Defensa y Justicia — `defensa-y-justicia` (8)
- [ ] Gimnasia y Esgrima La Plata — `gimnasia-lp` (7)
- [ ] Banfield — `banfield` (7)
- [ ] Platense — `platense` (7)
- [ ] Tigre — `tigre` (7)
- [ ] Unión de Santa Fe — `union` (7)

## Primera Nacional (20)

- [ ] Colón — `colon` (8)
- [ ] Quilmes — `quilmes` (7)
- [ ] Chacarita Juniors — `chacarita` (7)
- [ ] Ferro Carril Oeste — `ferro` (7)
- [ ] Arsenal de Sarandí — `arsenal` (7)
- [ ] All Boys — `all-boys` (6)
- [ ] Almirante Brown — `almirante-brown` (6)
- [ ] Atlanta — `atlanta` (6)
- [ ] Nueva Chicago — `nueva-chicago` (6)
- [ ] San Martín de Tucumán — `san-martin-tucuman` (7)
- [ ] Patronato — `patronato` (6)
- [ ] Temperley — `temperley` (6)
- [ ] Deportivo Morón — `deportivo-moron` (6)
- [ ] Estudiantes de Buenos Aires — `estudiantes-ba` (5)
- [ ] Chaco For Ever — `chaco-for-ever` (5)
- [ ] Agropecuario — `agropecuario` (5)
- [ ] Defensores de Belgrano — `defensores-belgrano` (5)
- [ ] Tristán Suárez — `tristan-suarez` (5)
- [ ] Los Andes — `los-andes` (5)
- [ ] Deportivo Maipú — `deportivo-maipu` (5)

## Primera B Metropolitana (20)

- [ ] Comunicaciones — `comunicaciones` (5)
- [ ] Deportivo Armenio — `deportivo-armenio` (5)
- [ ] Excursionistas — `excursionistas` (4)
- [ ] Villa Dálmine — `villa-dalmine` (6)
- [ ] Colegiales — `colegiales` (4)
- [ ] Fénix — `fenix` (4)
- [ ] Acassuso — `acassuso` (4)
- [ ] Talleres de Remedios de Escalada — `talleres-re` (4)
- [ ] Sacachispas — `sacachispas` (3)
- [ ] Dock Sud — `dock-sud` (3)
- [ ] UAI Urquiza — `uai-urquiza` (4)
- [ ] Argentino de Quilmes — `argentino-quilmes` (4)
- [ ] Flandria — `flandria` (4)
- [ ] San Miguel — `san-miguel` (5)
- [ ] Deportivo Merlo — `deportivo-merlo` (4)
- [ ] Defensores Unidos — `defensores-unidos` (4)
- [ ] Real Pilar — `real-pilar` (3)
- [ ] Brown de Adrogué — `brown-adrogue` (6)
- [ ] Ferrocarril Midland — `midland` (3)
- [ ] Liniers — `liniers` (3)

## Primera C (19)

- [ ] Deportivo Español — `deportivo-espanol` (4)
- [ ] Victoriano Arenas — `victoriano-arenas` (3)
- [ ] Sportivo Italiano — `sportivo-italiano` (3)
- [ ] Lugano — `lugano` (2)
- [ ] Central Córdoba de Rosario — `central-cordoba-rosario` (3)
- [ ] Argentino de Rosario — `argentino-rosario` (3)
- [ ] El Porvenir — `el-porvenir` (3)
- [ ] Cañuelas — `canuelas` (2)
- [ ] Leandro N. Alem — `leandro-n-alem` (2)
- [ ] Juventud Unida — `juventud-unida` (2)
- [ ] Berazategui — `berazategui` (2)
- [ ] Luján — `lujan` (2)
- [ ] Ituzaingó — `ituzaingo` (2)
- [ ] Argentino de Merlo — `argentino-merlo` (3)
- [ ] Claypole — `claypole` (1)
- [ ] Sportivo Barracas — `sportivo-barracas` (1)
- [ ] Deportivo Laferrere — `laferrere` (2)
- [ ] General Lamadrid — `general-lamadrid` (1)
- [ ] Centro Español — `centro-espanol` (1)
