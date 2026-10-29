# Prompts para generar el arte de Juegos Argentinos

Todas las imágenes que reemplazan los dibujos hechos en código. Cada una tiene el **archivo** donde va (dentro de
`apps/web/public/`), el **tamaño** y el **prompt**, listo para copiar y pegar (y para corregir lo que quieras).

## Reglas para todas

- **Mismo estilo en todo.** Empezá cada prompt con el estilo que corresponda:
  - **Estilo A (objetos, fondos y escenas):** `Pintura digital semirrealista muy detallada, luz natural cálida, texturas ricas, ambiente criollo argentino,`
  - **Estilo B (personajes):** `Retrato expresivo semirrealista en pintura digital, luz cálida, estilo criollo argentino, proporciones de caricatura simpática (cabeza y ojos un poco grandes),`
  - **Estilo C (íconos de la interfaz):** `Ícono pulido de videojuego, pintado, con relieve suave y brillo, tonos dorados y de cuero, bordes nítidos, que se entienda en tamaño chico,`
- **Sin texto, sin logos, sin marcas** reales (botellas con etiquetas inventadas o sin etiqueta) y **sin gente real**.
- **Transparencia:** donde dice *transparente*, tiene que ser **PNG con transparencia de verdad**. El cuadriculado gris y blanco
  no sirve si está pintado en la imagen. Si tu generador no la hace, pedila sobre **fondo verde liso**
  (`aislado sobre un fondo verde liso puro #00FF00, sin sombra sobre el fondo`) y yo le saco el fondo.
- A los objetos transparentes agregales: `objeto aislado, centrado, completo y con margen alrededor, sin paisaje de fondo`.
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
  `[Estilo A] Interior de un viejo boliche de campo argentino, paredes y vigas de madera rústica, faroles a querosén colgando, un mostrador largo de madera con estantes de botellas sin etiqueta, mates y aperos de cuero colgados en las paredes, luz cálida de cine, fondo un poco desenfocado con poca profundidad de campo, el centro de la imagen tranquilo y despejado, sin gente, sin texto`
- **Mate:** `[Estilo A] Mate de calabaza tradicional argentino con virola de plata grabada con guardas criollas, bombilla de metal, yerba verde con un poco de vapor, objeto aislado, centrado`
- **Poncho doblado:** `[Estilo A] Poncho argentino de lana tejido a mano, doblado, color terracota con una franja crema, guardas geométricas andinas del norte y llamas, flecos en los bordes, visto desde arriba en tres cuartos, objeto aislado, centrado`
- **Cartel:** `[Estilo A] Cartel de madera rústico para colgar, tabla vieja y gastada con un borde tallado con motivos gauchos (caballos, facones, mate, boleadoras), colgado de dos correas de cuero con hebillas de bronce, el centro de la tabla completamente liso y vacío para poner texto, objeto aislado, visto de frente`

## 2. Detalles de la mesa y el marcador

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/ui/fosforo.png` | 512×128 | transparente | `[Estilo C] Un solo fósforo de madera acostado en horizontal, palito de madera clara con la cabeza roja y redonda en la punta derecha, visto de costado, aislado` |
| `arte/ui/caja-fosforos.png` | 512×512 | transparente | `[Estilo A] Caja de fósforos argentina antigua, de cartón, entreabierta y mostrando los fósforos, etiqueta de papel gastada con un sol dibujado y sin texto, objeto aislado` |
| `arte/ui/sol-de-mayo.png` | 512×512 | transparente | `[Estilo C] Emblema del Sol de Mayo, sol dorado con cara humana serena y rayos rectos y ondulados intercalados, dorado metálico con relieve suave, visto de frente, aislado` |
| `arte/ui/banderita.png` | 256×320 | transparente | `[Estilo C] Banderita argentina flameando en un mástil corto dorado con remate redondo, franjas celestes y blanca con un solcito dorado, aislada` |
| `arte/ui/cinta.png` | 512×512 | transparente | `[Estilo C] Cinta de raso celeste y blanca en diagonal para la esquina de un marco, apenas plegada, cubriendo la esquina superior izquierda, aislada` |
| `arte/ui/filete-esquina.png` | 512×512 | transparente | `[Estilo C] Adorno de fileteado porteño para una esquina, volutas doradas y crema, hojas de acanto y una florcita, pensado para la esquina superior izquierda de un marco, aislado` |

## 3. Íconos de los botones (los de canto)

Todos **256×256, transparentes**, con el `[Estilo C]` adelante, sin fondo, vistos de frente.

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/iconos/truco.png` | `un sombrero de gaucho de fieltro negro con ala plana` |
| `arte/iconos/envido.png` | `una copa dorada como la del palo de copas de la baraja española` |
| `arte/iconos/real-envido.png` | `una corona de rey dorada con piedras rojas` |
| `arte/iconos/falta-envido.png` | `una rosa de los vientos dorada de cuatro puntas` |
| `arte/iconos/flor.png` | `una flor roja de cinco pétalos con el centro dorado` |
| `arte/iconos/quiero.png` | `una tilde dorada (marca de correcto)` |
| `arte/iconos/no-quiero.png` | `una cruz roja oscura (marca de incorrecto)` |
| `arte/iconos/mazo.png` | `una pilita de cartas españolas boca abajo, con dorso rojo` |

## 4. La barra de pestañas (hoy son emojis)

Todos **256×256, transparentes**, con el `[Estilo C]` adelante.

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/iconos/tab-inicio.png` | `una casita de campo argentina con techo de tejas` |
| `arte/iconos/tab-jugar.png` | `un abanico de tres cartas españolas` |
| `arte/iconos/tab-logros.png` | `una copa trofeo dorada con una cinta celeste y blanca` |
| `arte/iconos/tab-mazos.png` | `un estuche de cuero para cartas con un mazo adentro` |
| `arte/iconos/tab-ajustes.png` | `un engranaje de bronce con filigrana` |

## 5. Rivales de la Gira (18)

**512×512, transparentes**, busto de frente o en tres cuartos, con el `[Estilo B]` adelante.
Archivo: `arte/rivales/<región>-<1|2|jefe>.png`.

| Archivo | Prompt (después del estilo) |
|---|---|
| `buenos-aires-1.png` | `Coco, un tachero porteño simpático de unos cincuenta años, bigote tupido, gorra plana, camisa a cuadros, con el aire de un taxi negro y amarillo` |
| `buenos-aires-2.png` | `Doña Elsa, una señora mayor muy amable que atiende el almacén de la esquina, rodete gris, anteojos con cadenita, delantal, un lápiz detrás de la oreja` |
| `buenos-aires-jefe.png` | `El Polaco, un cantor de tango elegante de Boedo, pelo engominado para atrás, traje a rayas, bufanda blanca, sombrero, media sonrisa canchera` |
| `cuyo-1.png` | `Mario, un viñatero mendocino curtido por el sol, sombrero de paja, con un racimo de uvas moradas en la mano` |
| `cuyo-2.png` | `Rosita, una joven cosechera de uvas, trenzas, pañuelo de colores, un canasto de uvas al hombro` |
| `cuyo-jefe.png` | `Don Aníbal, un bodeguero viejo y adinerado, barba blanca, chaleco y reloj de bolsillo, con una copa de vino tinto` |
| `mesopotamia-1.png` | `Ñato, un pescador del río Paraná, sombrero de pesca, la caña al hombro, sonrisa tranquila` |
| `mesopotamia-2.png` | `Mirta, una tarefera de yerba mate de Misiones, botas con tierra colorada, pañuelo en la cabeza, una bolsa de hojas de yerba` |
| `mesopotamia-jefe.png` | `El Chamamecero, un músico de chamamé con acordeón, sombrero de ala ancha, pañuelo rojo al cuello, muy alegre` |
| `norte-1.png` | `Benjamín, un coplero de la Quebrada de Humahuaca, poncho, una caja (tambor chico), cara de pícaro` |
| `norte-2.png` | `Doña Aurora, una tejedora andina de Humahuaca, manta tejida de colores, sombrero bombín, arrugas amables` |
| `norte-jefe.png` | `El Diablo del Carnaval, el personaje festivo del carnaval del norte argentino, máscara colorida con cuernos, lentejuelas y espejitos, travieso (de fiesta, no de miedo)` |
| `patagonia-1.png` | `Gonzalo, un guía de montaña patagónico, gorro de lana, campera rompeviento, una soga al hombro, pelo revuelto por el viento` |
| `patagonia-2.png` | `Nahuel, un esquilador de Chubut, boina, pulóver grueso, tijera de esquilar en la mano, fuerte y tranquilo` |
| `patagonia-jefe.png` | `La Galesa, una señora mayor galesa-argentina de Gaiman, cuello de encaje, sirviendo té de una tetera de porcelana, sonrisa pícara` |
| `malvinas-1.png` | `Sosa, un marinero de la Armada, gorro de marinero, camiseta a rayas, un rollo de soga, simpático` |
| `malvinas-2.png` | `Doña Inés, la cocinera del buque, gorro de cocinera, cucharón en la mano, cálida y estricta` |
| `malvinas-jefe.png` | `El Capitán de la Fragata, un capitán viejo de barba blanca, saco azul marino con botones dorados, gorra de capitán, un catalejo` |

Son personajes **inventados**: que no se parezcan a nadie real.

## 6. Avatares del jugador (12)

**512×512, transparentes**, con el `[Estilo B]` adelante y el mismo encuadre de busto. Archivo: `arte/avatares/<n>.png` (del 1 al 12).

1. `una mujer joven tomando mate`
2. `un hombre barbudo con sombrero de gaucho`
3. `una abuela tejiendo`
4. `un abuelo con boina`
5. `un adolescente con camiseta de fútbol (sin escudos ni marcas)`
6. `una mujer con una guitarra`
7. `un hombre con delantal de asador y una pinza en la mano, al lado de la parrilla`
8. `una bailarina de tango con una flor en el pelo`
9. `un chacarero con sombrero de paja`
10. `un nene sonriente con un barrilete`
11. `una llama con un ponchito`
12. `un perro alegre con un pañuelo al cuello`

## 7. Portada, logo e ícono

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/portada/fondo-vertical.png` | 1080×1920 | lleno | `[Estilo A] La pampa argentina en la hora dorada, pastizales infinitos, un ombú, una estancia a lo lejos, cielo amplio y dramático, el tercio de abajo despejado para poner un menú, sin gente, sin texto` |
| `arte/portada/fondo-horizontal.png` | 1920×1080 | lleno | `(el mismo prompt, en formato apaisado)` |
| `arte/portada/gaucho.png` | 900×1200 | transparente | `[Estilo B] Un gaucho simpático sentado en un banquito de madera, con un mate en una mano y un abanico de cartas españolas en la otra, poncho, sombrero y botas, cuerpo entero, aislado` |
| `arte/logo.png` | 1024×512 | transparente | `[Estilo C] Marco decorativo de fileteado porteño para el logo de un juego, volutas doradas, cintas celestes y blancas, un pequeño Sol de Mayo arriba, el centro VACÍO (el texto se pone en código), aislado` |
| `arte/icono.png` | 1024×1024 | lleno | `[Estilo C] Ícono de app: un abanico de tres cartas españolas con un mate adelante, sobre un círculo de paño verde con borde dorado, centrado con un 20% de margen alrededor, fondo verde oscuro` |

## 8. Tarjetas de cada juego (en "Elegí un juego")

**800×500, lleno**, con el `[Estilo A]` adelante, sin texto y con lugar libre a la derecha (ahí va el nombre).

| Archivo | Prompt (después del estilo) |
|---|---|
| `arte/juegos/truco.png` | `primer plano de una partida de truco sobre paño verde: tres cartas españolas (ancho de espada, ancho de basto y siete de espada), fósforos para anotar los puntos y un mate al lado, la mitad derecha más oscura y vacía` |
| `arte/juegos/chinchon.png` | `una mano de siete cartas españolas formando una escalera de copas, el pozo de descarte y un comodín sobre una mesa de madera, la mitad derecha vacía` |
| `arte/juegos/casita-robada.png` | `una pila alta de cartas españolas como si fuera una casita, una mano que se la roba en broma, mesa de madera, la mitad derecha vacía` |
| `arte/juegos/escoba.png` | `una escobita de paja barriendo cartas españolas de un paño verde, el siete de oro brillando, la mitad derecha vacía` |
| `arte/juegos/tutti-frutti.png` | `una hoja de papel con columnas, un lápiz, un reloj de arena y letras de madera desparramadas sobre una mesa de cocina, la mitad derecha vacía` |

## 9. Mapa de la Gira

| Archivo | Tamaño | Fondo | Prompt |
|---|---|---|---|
| `arte/mapa/base.png` | 1080×2400 | lleno | `[Estilo A] Mapa ilustrado antiguo de la Argentina con las Islas Malvinas, sobre papel pergamino, relieve de la cordillera de los Andes, ríos, el mar con olitas y una rosa de los vientos, sin nombres, sin texto, sin límites de provincias` |

## 10. Fondos desbloqueables (15)

Dos versiones de cada uno: **vertical 1290×2796** y **horizontal 2560×1440**, lleno.
Archivo: `arte/fondos/<id>-vertical.webp` y `arte/fondos/<id>-horizontal.webp`. Empezá con el `[Estilo A]` y agregale al final:
`luz cálida de cine, fondo un poco desenfocado con poca profundidad de campo, el centro tranquilo y despejado (encima va una mesa de cartas), sin gente, sin texto, sin logos`.

| id | Se desbloquea | Prompt (entre el estilo y el final) |
|---|---|---|
| `boliche` | Desde el arranque | `Interior de un viejo boliche de campo argentino, paredes y vigas de madera, faroles a querosén colgando, un mostrador largo con estantes de botellas sin etiqueta, mates y aperos de cuero` |
| `bodegon` | Ganarle al jefe de Buenos Aires | `Bodegón porteño tradicional en San Telmo, piso de baldosas blancas y negras, barra de madera oscura con bronces, espejos viejos con adornos de fileteado, lámparas amarillas suaves` |
| `cafe` | Tienda, 300 fósforos | `Café de barrio porteño de noche, mesas de mármol, sillas de madera curvada, un ventanal a una calle empedrada mojada por la lluvia con faroles antiguos` |
| `estancia` | Tienda, 500 fósforos | `Galería de una vieja estancia en la pampa al atardecer, columnas de madera, una parrilla con brasas encendidas, monturas y ponchos colgados, pastizales dorados y un ombú` |
| `bodega` | Abrir Cuyo | `Bodega rústica en Mendoza, toneles de roble en hileras, paredes de piedra, luz de velas, una ventana a los viñedos y la cordillera nevada en la hora dorada` |
| `litoral` | Abrir Mesopotamia | `Galería de un rancho del litoral argentino sobre un río tranquilo, vegetación subtropical frondosa, una hamaca paraguaya, un acordeón apoyado en un banco, atardecer húmedo y dorado` |
| `pena` | Abrir Norte | `Peña folclórica en Salta, paredes de adobe, ponchos de colores y un charango colgados, vasijas de barro, una ventana a los cerros de colores de Purmamarca, luz de fogón` |
| `refugio` | Abrir Patagonia | `Refugio de montaña de madera en la Patagonia, hogar de piedra con leños encendidos, cueros de oveja en el piso, un ventanal a un lago glaciar turquesa y picos nevados` |
| `puerto` | Abrir Malvinas | `Vieja cantina de puerto en Ushuaia, sogas y faroles en las paredes, una ventana al Canal Beagle con montañas nevadas y un faro rojo y blanco, atardecer azulado` |
| `fogon` | Completar una gira | `Fogón de noche en el campo argentino, chispas que suben, troncos como bancos, una guitarra y una pava junto al fuego, un cielo lleno de estrellas con la Vía Láctea, caballos a lo lejos` |
| `patio` | Desde el arranque (de día) | `Patio criollo a pleno sol, una parra con racimos de uva dando sombra, macetas con malvones, un aljibe, paredes blancas encaladas y piso de ladrillo` |
| `quincho` | Tienda, 400 fósforos (de día) | `Quincho de verano al mediodía, techo de paja, parrilla de ladrillo, pileta y jardín verde, sillas de madera, luz clara` |
| `costa` | Conseguir 10 logros (de día) | `Parador de madera frente al mar en la costa atlántica, sombrillas de paja, arena clara, cielo celeste con gaviotas, mañana luminosa` |
| `vereda` | Ganar 10 partidas (de día) | `Vereda empedrada de un barrio porteño en primavera, jacarandás en flor, mesitas de café en la vereda, balcones con hierro forjado, luz de la tarde` |
| `cataratas` | Completar las cinco giras (de día) | `Mirador de madera frente a las Cataratas del Iguazú, selva verde, un arcoíris en la bruma, mariposas de colores, sol de la mañana` |

Para los de día, en vez del final de arriba usá: `luz de día clara y alegre, cielo celeste, colores vivos pero suaves, el centro tranquilo y despejado (encima va una mesa de cartas), sin gente, sin texto, sin logos`.

## 11. Opcionales (si te sobran ganas)

- **Victoria y derrota**, 1080×1080, lleno, con el `[Estilo A]` adelante:
  `gauchos festejando con los sombreros en alto bajo fuegos artificiales` /
  `un gaucho triste encogiéndose de hombros al lado de su caballo al atardecer, con humor`.
- **Caras de los rivales** contento y enojado: el mismo prompt del rival más `riéndose feliz` o `con el ceño fruncido, enojado`.
  Archivo `<región>-<slot>-contento.png` y `-enojado.png`.

## Orden recomendado

1. La mesa (sección 1): se nota enseguida en el truco.
2. Íconos de los botones y detalles (secciones 2 y 3).
3. Rivales (5) y avatares (6).
4. Portada, logo, ícono y tarjetas (7 y 8).
5. Mapa (9) y fondos desbloqueables (10).
