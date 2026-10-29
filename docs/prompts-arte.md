# Prompts para generar el arte de Juegos Argentinos

Todas las imágenes que reemplazan los dibujos hechos en código. Cada una tiene el **archivo** donde va (dentro de
`apps/web/public/`), el **tamaño** y el **prompt** (en inglés: los generadores responden mejor).

## Reglas para todas

- **Mismo estilo en todo.** Empezá cada prompt con el estilo que corresponda:
  - **Estilo A (objetos, fondos, escenas):** `Highly detailed semi-realistic digital painting, warm natural light, rich textures, Argentine criollo atmosphere,`
  - **Estilo B (personajes):** `Expressive semi-realistic character portrait, digital painting, warm lighting, Argentine criollo style, friendly caricature proportions (slightly big head and eyes),`
  - **Estilo C (íconos de la interfaz):** `Polished game UI icon, painted, soft bevel and highlight, warm gold and leather tones, crisp edges, readable at small size,`
- **Sin texto, sin logos, sin marcas** reales (botellas con etiquetas inventadas o sin etiqueta) y **sin gente real**.
- **Transparencia:** donde dice *transparente*, tiene que ser **PNG con transparencia de verdad**. El cuadriculado gris y blanco
  no sirve si está pintado en la imagen. Si tu generador no la hace, pedila sobre **fondo verde liso `#00FF00`**
  (`isolated on a flat pure #00FF00 green background, no shadow on the background`) y yo le saco el fondo.
- Para los objetos transparentes agregá: `isolated object, centered, full object visible with margin, no background scenery`.
- Pasame los **archivos originales** (no capturas ni lo que se achica al mandarlo por chat).

---

## 1. La mesa (lo primero)

| Archivo | Tamaño | Fondo |
|---|---|---|
| `arte/mesa/fondo-vertical.webp` | 1290×2796 (9:19,5) | lleno |
| `arte/mesa/fondo-horizontal.webp` | 2560×1440 (16:9) | lleno |
| `arte/mesa/mate.png` | 600×600 | transparente |
| `arte/mesa/poncho.png` | 800×600 | transparente |
| `arte/mesa/cartel.png` | 800×600 | transparente |

- **Fondo de boliche** (el que ya tenés sirve; generá también la versión vertical):
  `[Estilo A] Interior of an old Argentine countryside "boliche" bar, rough wooden walls and beams, hanging oil lanterns, long wooden counter with shelves of unlabeled bottles, mate gourds and leather gear on the walls, cinematic warm lighting, slightly blurred with soft depth of field, the center of the image calm and uncluttered, no people, no text`
- **Mate:** `[Estilo A] Traditional Argentine calabash mate gourd with silver rim engraved with criollo patterns, metal bombilla straw, green yerba with a little steam, isolated object, centered`
- **Poncho doblado:** `[Estilo A] Folded Argentine handwoven wool poncho blanket, terracotta red with cream band and northern Andean geometric patterns and llamas, fringed edges, seen from a 3/4 top view, isolated object, centered`
- **Cartel:** `[Estilo A] Rustic hanging wooden sign, old weathered plank with a carved border of gaucho motifs (horses, knives, mate, boleadoras), hanging from two leather straps with brass buckles, the center of the plank completely blank and flat for text, isolated object, front view`

## 2. Detalles de la mesa y el marcador

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/ui/fosforo.png` | 512×128 | transparente | `[Estilo C] A single wooden matchstick lying horizontally, pale wood stick with a round red match head on the right end, side view, isolated` |
| `arte/ui/caja-fosforos.png` | 512×512 | transparente | `[Estilo A] Vintage Argentine matchbox, small cardboard box half open showing matches, worn paper label with a simple sun drawing and no text, isolated object` |
| `arte/ui/sol-de-mayo.png` | 512×512 | transparente | `[Estilo C] Sol de Mayo emblem, golden sun with a calm human face and alternating straight and wavy rays, metallic gold with soft bevel, front view, isolated` |
| `arte/ui/banderita.png` | 256×320 | transparente | `[Estilo C] Small Argentine flag waving on a short golden pole with a round finial, light blue and white stripes with a small golden sun, isolated` |
| `arte/ui/cinta.png` | 512×512 | transparente | `[Estilo C] Diagonal light blue and white satin ribbon for the corner of a frame, gently folded, covering the top-left corner, isolated` |
| `arte/ui/filete-esquina.png` | 512×512 | transparente | `[Estilo C] Porteño fileteado corner ornament, gold and cream scrolls, acanthus leaves and a small flower, designed to fit the top-left corner of a frame, isolated` |

## 3. Íconos de los botones (los de canto)

Todos **256×256, transparentes**, `[Estilo C]`, sin fondo, mirando de frente.

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/iconos/truco.png` | `a gaucho hat (black felt with flat brim)` |
| `arte/iconos/envido.png` | `a golden goblet cup like the Spanish playing card "copa"` |
| `arte/iconos/real-envido.png` | `a golden king's crown with red gems` |
| `arte/iconos/falta-envido.png` | `a golden compass rose with four points` |
| `arte/iconos/flor.png` | `a five-petal red flower with a golden center` |
| `arte/iconos/quiero.png` | `a golden check mark` |
| `arte/iconos/no-quiero.png` | `a dark red X mark` |
| `arte/iconos/mazo.png` | `a small stack of Spanish playing cards face down, red backs` |

## 4. La barra de pestañas (hoy son emojis)

Todos **256×256, transparentes**, `[Estilo C]`.

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/iconos/tab-inicio.png` | `a small rural Argentine ranch house with a tiled roof` |
| `arte/iconos/tab-jugar.png` | `a fan of three Spanish playing cards` |
| `arte/iconos/tab-logros.png` | `a golden trophy cup with light blue and white ribbon` |
| `arte/iconos/tab-mazos.png` | `a leather card case with a deck inside` |
| `arte/iconos/tab-ajustes.png` | `a brass gear with filigree` |

## 5. Rivales de la Gira (18)

**512×512, transparentes**, busto de frente o 3/4, `[Estilo B]`. Archivo: `arte/rivales/<región>-<1|2|jefe>.png`.

| Archivo | Prompt (después del estilo) |
|---|---|
| `buenos-aires-1.png` | `Coco, a cheerful Buenos Aires taxi driver in his fifties, thick moustache, flat cap, checkered shirt, arm out of a black and yellow taxi window feel` |
| `buenos-aires-2.png` | `Doña Elsa, a kind elderly woman who runs the corner grocery store, gray bun, glasses on a chain, apron, a pencil behind her ear` |
| `buenos-aires-jefe.png` | `El Polaco, an elegant tango singer from Boedo, slicked back hair, pinstripe suit, white scarf, fedora, confident half smile` |
| `cuyo-1.png` | `Mario, a Mendoza vineyard worker, sun-tanned, straw hat, holding a bunch of purple grapes` |
| `cuyo-2.png` | `Rosita, a young grape harvester, braided hair, colorful scarf, basket of grapes on her shoulder` |
| `cuyo-jefe.png` | `Don Aníbal, a wealthy old winemaker, white beard, vest and pocket watch, holding a glass of red wine` |
| `mesopotamia-1.png` | `Ñato, a fisherman from the Paraná river, fishing hat, fishing rod on his shoulder, relaxed smile` |
| `mesopotamia-2.png` | `Mirta, a yerba mate harvester from Misiones, red soil on her boots, headscarf, sack of yerba leaves` |
| `mesopotamia-jefe.png` | `El Chamamecero, a chamamé musician with an accordion, wide-brim hat, red neckerchief, joyful` |
| `norte-1.png` | `Benjamín, a folk singer from the Quebrada de Humahuaca, poncho, small drum (caja), cheeky expression` |
| `norte-2.png` | `Doña Aurora, an Andean weaver from Humahuaca, colorful woven shawl, bowler hat, kind wrinkles` |
| `norte-jefe.png` | `El Diablo del Carnaval, a festive carnival devil character from northern Argentina, colorful mask with horns, sequins and mirrors, mischievous (festive, not scary)` |
| `patagonia-1.png` | `Gonzalo, a Patagonian mountain guide, wool beanie, windbreaker jacket, rope on his shoulder, wind-blown hair` |
| `patagonia-2.png` | `Nahuel, a sheep shearer from Chubut, beret, thick sweater, shears in hand, strong and calm` |
| `patagonia-jefe.png` | `La Galesa, an elderly Welsh-Argentine lady from Gaiman, lace collar, serving tea from a porcelain teapot, sly smile` |
| `malvinas-1.png` | `Sosa, a navy sailor, sailor cap, striped shirt, rope coil, friendly` |
| `malvinas-2.png` | `Doña Inés, the ship's cook, chef hat, ladle in hand, warm and strict` |
| `malvinas-jefe.png` | `El Capitán de la Fragata, an old ship captain with a white beard, navy coat with golden buttons, captain's cap, telescope` |

Son personajes **inventados**: que no se parezcan a nadie real.

## 6. Avatares del jugador (12)

**512×512, transparentes**, `[Estilo B]`, mismo encuadre de busto. Archivo: `arte/avatares/<n>.png` (1 a 12).
`a young woman drinking mate` · `a bearded man with a gaucho hat` · `an elderly grandmother with knitting` · `a grandfather with a beret`
· `a teenager with a football jersey (no logos)` · `a woman with a guitar` · `a man with a chef apron holding tongs at a grill`
· `a woman tango dancer with a flower in her hair` · `a farmer with a straw hat` · `a smiling kid with a kite` · `a llama wearing a tiny poncho`
· `a cheerful dog wearing a neckerchief`

## 7. Portada, logo e ícono

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/portada/fondo-vertical.png` | 1080×1920 | lleno | `[Estilo A] Argentine pampa at golden hour, endless grassland, an ombú tree, a distant estancia, wide dramatic sky, empty lower third for a menu, no people, no text` |
| `arte/portada/fondo-horizontal.png` | 1920×1080 | lleno | `(el mismo, apaisado)` |
| `arte/portada/gaucho.png` | 900×1200 | transparente | `[Estilo B] A friendly gaucho sitting on a wooden stool, holding a mate in one hand and a fan of Spanish playing cards in the other, poncho, hat, boots, full body, isolated` |
| `arte/logo.png` | 1024×512 | transparente | `[Estilo C] Decorative fileteado porteño frame for a game logo, gold scrolls, light blue and white ribbons, a small Sol de Mayo on top, the center EMPTY (the text goes in code), isolated` |
| `arte/icono.png` | 1024×1024 | lleno | `[Estilo C] App icon: a fan of three Spanish playing cards with a mate gourd in front, on a green felt circle with a golden rim, centered with 20% margin around, dark green background` |

## 8. Tarjetas de cada juego (en "Elegí un juego")

**800×500, lleno**, `[Estilo A]`, sin texto, con lugar libre a la derecha (ahí va el nombre).

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/juegos/truco.png` | `close-up of a truco game on green felt: three Spanish cards (ace of swords, ace of clubs, seven of swords), matchsticks used to keep score, a mate nearby, the right half darker and empty` |
| `arte/juegos/chinchon.png` | `a hand of seven Spanish cards forming a run of cups, a discard pile and a joker card on a wooden table, the right half empty` |
| `arte/juegos/casita-robada.png` | `a tall stack of Spanish cards like a little house, a hand stealing it playfully, wooden table, the right half empty` |
| `arte/juegos/escoba.png` | `a small straw broom sweeping Spanish cards off green felt, the seven of coins shining, the right half empty` |
| `arte/juegos/tutti-frutti.png` | `a sheet of paper with columns, a pencil, an hourglass and scattered wooden letter tiles on a kitchen table, the right half empty` |

## 9. Mapa de la Gira

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/mapa/base.png` | 1080×2400 | lleno | `[Estilo A] Illustrated vintage map of Argentina including the Malvinas Islands, parchment paper, relief of the Andes, rivers, ocean with small waves and a compass rose, no labels, no text, no borders between provinces` |
| `arte/mapa/region-<id>.png` ×6 | 1080×2400 | transparente | **Mejor no generarlas:** cada región sola tiene que calzar exacto sobre el mapa y los generadores no lo logran. Con el mapa base solo alcanza; las regiones las marco yo encima. |

## 10. Fondos desbloqueables (10)

Dos versiones de cada uno: **vertical 1290×2796** y **horizontal 2560×1440**, lleno. Archivo: `arte/fondos/<id>-vertical.webp`
y `arte/fondos/<id>-horizontal.webp`. A cada prompt agregale al final:
`cinematic warm lighting, slightly blurred with soft depth of field, the center calm and uncluttered (a card table goes on top), no people, no text, no logos`.

| id | Se desbloquea | Prompt (después del estilo A) |
|---|---|---|
| `boliche` | Desde el arranque | `Interior of an old Argentine countryside "boliche" bar, wooden walls and beams, hanging oil lanterns, long counter with shelves of unlabeled bottles, mate gourds and leather gear` |
| `bodegon` | Ganarle al jefe de Buenos Aires | `Traditional Buenos Aires bodegón in San Telmo, black and white checkered floor, dark wood bar with brass, fileteado ornaments on old mirrors, soft yellow lamps` |
| `cafe` | Tienda, 300 fósforos | `Classic Buenos Aires neighborhood café at night, marble tables, bentwood chairs, big window to a rainy cobblestone street with old streetlights` |
| `estancia` | Tienda, 500 fósforos | `Covered veranda of an old estancia in the pampa at sunset, wooden columns, a grill with glowing embers, saddles and ponchos hanging, golden grassland and an ombú tree` |
| `bodega` | Abrir Cuyo | `Rustic wine cellar in Mendoza, oak barrels in rows, stone walls, candlelight, a window to vineyards and the snowy Andes at golden hour` |
| `litoral` | Abrir Mesopotamia | `Rustic ranch veranda in the Argentine Mesopotamia over a calm river, lush subtropical plants, a hammock, an accordion resting on a bench, humid golden evening` |
| `pena` | Abrir Norte | `Folk "peña" in Salta, adobe walls, colorful ponchos and a charango on the walls, clay pots, a window to the multicolored mountains of Purmamarca, firelight` |
| `refugio` | Abrir Patagonia | `Wooden mountain lodge in Patagonia, stone fireplace with burning logs, sheepskin rugs, big window to a turquoise glacial lake and snowy peaks` |
| `puerto` | Abrir Malvinas | `Old harbor tavern in Ushuaia, ropes and lanterns on the walls, window to the Beagle Channel with snowy mountains and a red and white lighthouse, blue evening` |
| `fogon` | Completar una gira | `Night campfire in the open Argentine countryside, sparks rising, logs as benches, a guitar and a kettle by the fire, a sky full of stars and the Milky Way, horses in the distance` |

## 11. Opcionales (si te sobran ganas)

- **Victoria y derrota**, 1080×1080, lleno, `[Estilo A]`: `gauchos celebrating raising their hats under fireworks` /
  `a sad gaucho shrugging next to a horse at dusk, humorous`.
- **Caras de los rivales** contento y enojado (mismo prompt del rival + `laughing happily` / `frowning, annoyed`), archivo
  `<región>-<slot>-contento.png` y `-enojado.png`.

## Orden recomendado

1. La mesa (sección 1) → se nota enseguida en el truco.
2. Íconos de botones y detalles (secciones 2 y 3).
3. Rivales (5) y avatares (6).
4. Portada, logo, ícono y tarjetas (7 y 8).
5. Mapa (9) y fondos desbloqueables (10).
