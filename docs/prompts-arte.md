# Prompts para generar el arte de Juegos Argentinos

Todas las imágenes que reemplazan los dibujos hechos en código. Cada una tiene el **nombre** con el que conviene
subirla, el **tamaño** y el **prompt**, listo para copiar y pegar (y para corregir lo que quieras).

**Cómo pasármelas:** subí los archivos originales a la raíz del repo en GitHub (*Add file → Upload files*). Yo les saco
el fondo, las recorto, las paso a WebP y las pongo en su lugar.

✅ = ya está en la app · ⬜ = falta · 🔁 = conviene rehacerla

---

## Lo que falta (resumen)

| | Qué | Sección |
|---|---|---|
| ⬜ | **50 rivales** de la Gira (ahora son 10 por región) | 5 |
| ⬜ | Ícono de la pestaña **Logros** | 4 |
| ⬜ | Tarjetas de **Chinchón, Casita Robada, Escoba y Tutti-Frutti** | 8 |
| ⬜ | Fondos: **refugio**, **costa** y **cataratas** (de costa y cataratas falta el archivo original) | 10 |
| 🔁 | Fondos: **café** (tiene el logo de Clarín) y **vereda** (tiene un cartel con nombre y gente) | 10 |
| ⬜ | La **versión vertical** de todos los fondos (hoy se recorta la horizontal) | 10 |
| ⬜ | Mate, poncho y cartel de la mesa (los originales) | 1 |
| ⬜ | Fondo de la portada (la pampa) | 7 |
| ⬜ | Avatares del jugador (12) | 6 |

---

## Reglas para todas

- **Mismo estilo en todo.** Empezá cada prompt con el estilo que corresponda:
  - **Estilo A (objetos, fondos y escenas):** `Pintura digital semirrealista muy detallada, luz natural cálida, texturas ricas, ambiente criollo argentino,`
  - **Estilo B (personajes):** `Retrato expresivo semirrealista en pintura digital, luz cálida, estilo criollo argentino, proporciones de caricatura simpática (cabeza y ojos un poco grandes),`
  - **Estilo C (íconos de la interfaz):** `Ícono pulido de videojuego, pintado, con relieve suave y brillo, tonos dorados y de cuero, bordes nítidos, que se entienda en tamaño chico,`
- **Sin texto, sin logos, sin marcas** reales (botellas con etiquetas inventadas o sin etiqueta) y **sin gente real**.
  La única excepción es la placa con el nombre de los rivales.
- **Transparencia:** donde dice *transparente*, lo ideal es un **PNG con transparencia de verdad**. Si tu generador pinta el
  cuadriculado gris y blanco, también sirve: se lo saco yo. Otra opción es pedirla sobre **fondo verde liso**
  (`aislado sobre un fondo verde liso puro #00FF00, sin sombra sobre el fondo`).
- A los objetos transparentes agregales: `objeto aislado, centrado, completo y con margen alrededor, sin paisaje de fondo`.
- Pasame los **archivos originales**, no capturas ni lo que se achica al mandarlo por chat.

---

## 1. La mesa

| | Nombre | Tamaño | Fondo |
|---|---|---|---|
| ✅ | Fondo de boliche | — | ahora es el fondo `boliche` de la sección 10 |
| ⬜ | `mate.png` | 600×600 | transparente |
| ⬜ | `poncho.png` | 800×600 | transparente |
| ⬜ | `cartel.png` | 800×600 | transparente |

Los que me mandaste por chat llegaron achicados. Si ya los tenés, subí los originales al repo y listo.

- **Mate:** `[Estilo A] Mate de calabaza tradicional argentino con virola de plata grabada con guardas criollas, bombilla de metal, yerba verde con un poco de vapor, objeto aislado, centrado`
- **Poncho doblado:** `[Estilo A] Poncho argentino de lana tejido a mano, doblado, color terracota con una franja crema, guardas geométricas andinas del norte y llamas, flecos en los bordes, visto desde arriba en tres cuartos, objeto aislado, centrado`
- **Cartel:** `[Estilo A] Cartel de madera rústico para colgar, tabla vieja y gastada con un borde tallado con motivos gauchos (caballos, facones, mate, boleadoras), colgado de dos correas de cuero con hebillas de bronce, el centro de la tabla completamente liso y vacío para poner texto, objeto aislado, visto de frente`

## 2. Detalles de la mesa y el marcador (opcionales)

Hoy están dibujados en código y se ven bien; estos los mejorarían.

| | Nombre | Tamaño | Fondo | Prompt |
|---|---|---|---|---|
| ⬜ | `fosforo.png` | 512×128 | transparente | `[Estilo C] Un solo fósforo de madera acostado en horizontal, palito de madera clara con la cabeza roja y redonda en la punta derecha, visto de costado, aislado` |
| ⬜ | `caja-fosforos.png` | 512×512 | transparente | `[Estilo A] Caja de fósforos argentina antigua, de cartón, entreabierta y mostrando los fósforos, etiqueta de papel gastada con un sol dibujado y sin texto, objeto aislado` |
| ⬜ | `sol-de-mayo.png` | 512×512 | transparente | `[Estilo C] Emblema del Sol de Mayo, sol dorado con cara humana serena y rayos rectos y ondulados intercalados, dorado metálico con relieve suave, visto de frente, aislado` |
| ⬜ | `banderita.png` | 256×320 | transparente | `[Estilo C] Banderita argentina flameando en un mástil corto dorado con remate redondo, franjas celestes y blanca con un solcito dorado, aislada` |
| ⬜ | `cinta.png` | 512×512 | transparente | `[Estilo C] Cinta de raso celeste y blanca en diagonal para la esquina de un marco, apenas plegada, cubriendo la esquina superior izquierda, aislada` |
| ⬜ | `filete-esquina.png` | 512×512 | transparente | `[Estilo C] Adorno de fileteado porteño para una esquina, volutas doradas y crema, hojas de acanto y una florcita, pensado para la esquina superior izquierda de un marco, aislado` |

## 3. Íconos de los botones (los de canto) ✅

Están los ocho: truco, envido, real envido, falta envido, flor, quiero, no quiero e irse al mazo.

## 4. La barra de pestañas

Están Inicio, Jugar, Mazos y Ajustes. Falta uno:

| | Nombre | Tamaño | Fondo | Prompt |
|---|---|---|---|---|
| ⬜ | `tab-logros.png` | 1024×1024 | transparente | `[Estilo C] Una copa trofeo dorada con dos asas y una cinta celeste y blanca atada, apoyada sobre una base ovalada de bronce tallado con filigrana (igual a la de los otros íconos de la barra), vista en tres cuartos desde arriba, objeto aislado, centrado, completo y con margen alrededor, sin paisaje de fondo` |

## 5. Rivales de la Gira (60)

La Gira tiene **10 rivales por región** (9 y el jefe), en un ranking. ✅ Están 10. **Faltan 50.**
Mientras falte el retrato, se ve un emoji.

**Cuadrados (1024×1024), con fondo lleno**, igual que los que ya hiciste: busto en tres cuartos, una escena de su región
detrás y abajo un marco de madera tallada de lado a lado con un medallón en el centro y una plaquita con el nombre.
Agregá esto al final de cada prompt (cambiando NOMBRE por el nombre del rival):

`retrato de busto en tres cuartos mirando a cámara, encuadre cuadrado; abajo, de lado a lado, un marco de madera tallada con un medallón de bronce en el centro y a la derecha una plaquita azul oscuro con el nombre "NOMBRE" en letra cursiva dorada; personaje inventado, que no se parezca a nadie real`

Si querés, empezá por los que vas a cruzar primero: los de Buenos Aires.

### Buenos Aires

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ✅ | `buenos-aires-1.png` | Coco, tachero de Constitución |
| ✅ | `buenos-aires-2.png` | Doña Elsa, la del almacén de la esquina |
| ⬜ | `buenos-aires-3.png` | `Tito, un canillita flaco y charlatán de unos treinta años, gorrita de lana, chaleco con bolsillos llenos de diarios, una pila de diarios sin texto legible bajo el brazo; detrás, un puesto de diarios en una esquina de Flores` |
| ⬜ | `buenos-aires-4.png` | `Rulo, un colectivero corpulento y apurado de unos cuarenta años, pelo enrulado, camisa celeste de uniforme con las mangas arremangadas, un mate en la mano; detrás, el volante y el parabrisas de un colectivo porteño` |
| ⬜ | `buenos-aires-5.png` | `La Turca, una peluquera de unos cincuenta y cinco años, pelo batido color caoba, aros grandes, uñas pintadas, una tijera en la mano y mirada pícara; detrás, una peluquería de barrio con espejos y secadores de pie` |
| ⬜ | `buenos-aires-6.png` | `Pocho, un parrillero grandote y bonachón de unos cincuenta años, delantal manchado, repasador al hombro, pinza de parrilla en la mano; detrás, un carrito de choripanes con humo y el río de la Costanera` |
| ⬜ | `buenos-aires-7.png` | `Señorita Marcela, una maestra de unos cincuenta y cinco años, guardapolvo blanco, anteojos de lectura en la punta de la nariz, una tiza en la mano; detrás, un aula con pizarrón verde y un mapa de la Argentina` |
| ⬜ | `buenos-aires-8.png` | `Fito, un relojero viejito y flaco, pelo blanco despeinado, una lupa de relojero en un ojo, chaleco con cadena; detrás, un taller lleno de relojes de pared y engranajes` |
| ⬜ | `buenos-aires-9.png` | `La Rusa, una mujer de unos cuarenta años, rubia de pelo muy corto, campera deportiva de club de barrio, mirada desafiante y media sonrisa, sosteniendo un trofeo chico; detrás, el buffet de un club con una vitrina de copas` |
| ✅ | `buenos-aires-jefe.png` | El Polaco, tanguero de Boedo |

### Cuyo

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ✅ | `cuyo-1.png` | Mario, viñatero de Maipú |
| ✅ | `cuyo-2.png` | Rosita, cosechera de la vendimia |
| ⬜ | `cuyo-3.png` | `Don Cirilo, un olivicultor sanjuanino de unos setenta años, sombrero de ala ancha gastado, bigote blanco, camisa arremangada, con una rama de olivo con aceitunas; detrás, un olivar antiguo con cerros áridos` |
| ⬜ | `cuyo-4.png` | `Yamila, una baqueana de montaña de unos treinta años, piel curtida, trenza larga, pañuelo al cuello, campera de abrigo, las riendas de una mula en la mano; detrás, la cordillera nevada y un sendero de montaña` |
| ⬜ | `cuyo-5.png` | `El Gringo Lucero, un chacarero rubio y colorado de unos cuarenta y cinco años, sombrero de paja, camisa abierta, sonrisa de vendedor, con un melón en cada mano; detrás, un puesto de frutas al costado de una ruta con álamos` |
| ⬜ | `cuyo-6.png` | `Chela, una señora de unos sesenta años, cachetes colorados, delantal floreado, pañuelo en la cabeza, revolviendo una olla de cobre con una cuchara de madera; detrás, una cocina de campo con frascos de dulce` |
| ⬜ | `cuyo-7.png` | `Facundo, un cantor cuyano de unos treinta y cinco años, pelo largo atado, bigote fino, poncho liviano al hombro, una guitarra criolla; detrás, una peña con farolitos y gente bailando cueca a lo lejos` |
| ⬜ | `cuyo-8.png` | `Nicanor, un ex minero de unos sesenta y cinco años, cara surcada de arrugas, casco de minero viejo con lámpara colgando del cuello, campera gastada; detrás, un pueblo de adobe con cerros áridos` |
| ⬜ | `cuyo-9.png` | `Delfina, una sommelier elegante de unos treinta y cinco años, pelo recogido, delantal de cuero de sommelier, una copa de vino tinto a la altura de la nariz; detrás, una cava con barricas y luz de velas` |
| ✅ | `cuyo-jefe.png` | Don Aníbal, bodeguero de toda la vida |

### Mesopotamia

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ✅ | `mesopotamia-1.png` | Ñato, pescador del Paraná |
| ✅ | `mesopotamia-2.png` | Mirta, yerbatera de Misiones |
| ⬜ | `mesopotamia-3.png` | `Pirí, un canoero correntino de unos treinta años, piel morena, sombrero de paja, remera holgada, una pértiga larga en la mano; detrás, los esteros con camalotes, un carpincho y un yacaré asomando` |
| ⬜ | `mesopotamia-4.png` | `Doña Ramona, una señora misionera de unos sesenta años, sonrisa enorme, delantal blanco, canasta de mimbre llena de chipá cubierta con un repasador; detrás, una terminal de ómnibus de pueblo` |
| ⬜ | `mesopotamia-5.png` | `Toto, un bañero entrerriano de unos cuarenta años, panzón y relajado, gorrito de baño, toalla al cuello, silbato colgando, ojotas; detrás, piletas termales con vapor y palmeras` |
| ⬜ | `mesopotamia-6.png` | `La Negra Ojeda, una comparsera de unos treinta años, tocado de plumas de colores, lentejuelas y brillos, maquillaje de carnaval, sonrisa enorme; detrás, el corsódromo de noche con luces y papel picado` |
| ⬜ | `mesopotamia-7.png` | `Ezequiel, un guardaparque de unos treinta y cinco años, barba prolija, uniforme verde oliva con sombrero de ala, binoculares al cuello, una libreta en la mano; detrás, los esteros con ciervos de los pantanos` |
| ⬜ | `mesopotamia-8.png` | `Benítez, un arriero correntino de unos cincuenta años, sombrero aludo, pañuelo rojo al cuello, bombacha de campo, un rebenque en la mano; detrás, un camino de tierra con vacas y palmeras yatay` |
| ⬜ | `mesopotamia-9.png` | `La Gringa Kessler, una chacarera entrerriana de unos cuarenta y cinco años, rubia de trenzas recogidas, cara pecosa, vestido sencillo con delantal, un manojo de trigo; detrás, un campo de trigo dorado con un molino` |
| ✅ | `mesopotamia-jefe.png` | El Chamamecero, acordeón en mano, de Corrientes |

### Norte

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ✅ | `norte-1.png` | Benjamín, coplero de la Quebrada |
| ⬜ | `norte-2.png` | `Doña Aurora, una tejedora coya de Humahuaca de unos sesenta años, cara redonda con arrugas amables y sonrisa tranquila, trenzas largas negras con canas, sombrero de fieltro marrón de ala corta, manta tejida a mano de colores vivos sobre los hombros, con un ovillo de lana de llama y agujas en las manos; detrás, un telar de madera con un tejido a medio hacer y por la ventana los cerros de colores de la Quebrada a la tarde` |
| ⬜ | `norte-3.png` | `Sixto, un empanadero salteño de unos cincuenta años, bigote, gorro blanco de cocinero, delantal, una fuente de empanadas recién horneadas; detrás, la plaza de Salta con la catedral a lo lejos` |
| ⬜ | `norte-4.png` | `Florinda, una pastora de la Puna de unos cuarenta años, cara curtida por el sol, sombrero de ala ancha con pompones de colores, manta tejida, una llama con borlas de colores a su lado; detrás, la Puna con salinas y cerros` |
| ⬜ | `norte-5.png` | `El Chango Ríos, un violinero santiagueño de unos treinta años, pelo negro revuelto, sonrisa pícara, camisa blanca y pañuelo al cuello, un violín rústico apoyado en el hombro; detrás, un patio de tierra con un algarrobo y un bombo legüero` |
| ⬜ | `norte-6.png` | `Doña Pocha, una señora salteña de unos sesenta años, pelo canoso recogido, poncho salteño rojo y negro sobre los hombros, una jarra de barro en la mano; detrás, una peña con guitarras colgadas y paredes de adobe` |
| ⬜ | `norte-7.png` | `Ulises, un guarda de tren de unos cincuenta años, gorra de guarda, saco con botones dorados, bigote prolijo, una pinza de boletos en la mano; detrás, un tren antiguo cruzando un viaducto entre cerros` |
| ⬜ | `norte-8.png` | `Celestino, un artesano jujeño de unos setenta años, cara surcada de arrugas, sombrero de fieltro, poncho marrón, tallando una pieza de madera de cardón; detrás, una feria artesanal con cardones y cerros de colores` |
| ⬜ | `norte-9.png` | `Amancay, una bailarina de folklore de unos veinticinco años, vestido de paisana con volados, trenza con flores, un pañuelo blanco en alto, sonrisa desafiante; detrás, un escenario de festival con farolitos y cerros verdes` |
| ⬜ | `norte-jefe.png` | `El Diablo del Carnaval, el personaje festivo del carnaval de la Quebrada de Humahuaca, máscara colorida con cuernos chicos y una sonrisa enorme y pícara, traje lleno de lentejuelas, espejitos y cintas de colores, una ramita de albahaca en la oreja; detrás, el carnaval de un pueblo norteño con serpentinas, talco en el aire y cerros al fondo; travieso y de fiesta, no de miedo, nada oscuro ni terrorífico` |

### Patagonia

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ⬜ | `patagonia-1.png` | `Gonzalo, un guía de montaña de Bariloche de unos treinta y cinco años, barba corta, pelo revuelto por el viento, gorro de lana con pompón, campera rompeviento roja, una soga de escalar enrollada al hombro, cara de tranquilo; detrás, un lago azul con cerros nevados y un bosque de coihues` |
| ⬜ | `patagonia-2.png` | `Nahuel, un esquilador de Chubut de unos cuarenta años, fuerte y tranquilo, cara curtida por el viento, boina negra, pulóver grueso de lana cruda, una tijera de esquilar antigua en la mano y un vellón de lana al hombro; detrás, el galpón de esquila de chapa y madera, ovejas merino y la estepa patagónica` |
| ⬜ | `patagonia-3.png` | `Ailén, una chocolatera de unos treinta años, pelo castaño en rodete, delantal marrón con manchas de chocolate, una bandeja de bombones; detrás, una chocolatería de madera con vitrinas y un ventanal a un lago con montañas` |
| ⬜ | `patagonia-4.png` | `Don Evaristo, un crianzero neuquino de unos sesenta y cinco años, cara muy curtida, boina, poncho de lana gruesa, un cayado de madera; detrás, chivas en la cordillera con volcanes nevados` |
| ⬜ | `patagonia-5.png` | `Brenda, una operaria petrolera de unos treinta años, casco de seguridad, mameluco naranja con cintas reflectivas, guantes de trabajo, cara manchada de grasa y sonrisa decidida; detrás, un pozo petrolero con el cielo patagónico y el mar a lo lejos` |
| ⬜ | `patagonia-6.png` | `Lalo, un guía de avistaje de ballenas de unos cuarenta años, barba canosa, gorro de lana, campera impermeable amarilla, binoculares al cuello; detrás, el golfo con una ballena saltando y una lancha` |
| ⬜ | `patagonia-7.png` | `Hilda, una maquinista de unos cincuenta años, gorra de maquinista a rayas, pañuelo rojo al cuello, cara tiznada de carbón, guantes gruesos; detrás, una locomotora a vapor antigua echando humo en la estepa` |
| ⬜ | `patagonia-8.png` | `Ernesto, un guardaparque de unos cincuenta años, barba blanca prolija, gorro de lana, uniforme de abrigo verde con parche de parque nacional sin texto, mirada serena; detrás, un glaciar enorme celeste y un lago con témpanos` |
| ⬜ | `patagonia-9.png` | `La Vasca Urrutia, una asadora patagónica de unos cincuenta años, robusta, boina vasca, delantal de cuero, un facón en la cintura, junto a un cordero al asador en cruz; detrás, un fogón con brasas y el lago Argentino` |
| ⬜ | `patagonia-jefe.png` | `La Galesa del té, una señora mayor galesa-argentina de Gaiman, pelo blanco recogido, cuello de encaje, delantal bordado, sirviendo té de una tetera de porcelana floreada con una sonrisa pícara de quien esconde algo; detrás, una casa de té galesa con cortinas de puntilla, una mesa con torta negra galesa y scones, y por la ventana el valle del río Chubut con álamos` |

### Malvinas

| | Nombre | Prompt (después del `[Estilo B]` y antes del final de arriba) |
|---|---|---|
| ⬜ | `malvinas-1.png` | `Sosa, un marinero joven y simpático, gorro de marinero blanco, camiseta a rayas azules y blancas debajo de una tricota azul, un rollo de soga gruesa al hombro, cachetes colorados por el frío; detrás, la cubierta de un velero con el mar austral gris verdoso, gaviotas y nubes bajas; sin escudos ni insignias militares` |
| ⬜ | `malvinas-2.png` | `Doña Inés, la cocinera de un barco, una señora de unos cincuenta y cinco años, cálida pero estricta, gorro de cocinera, delantal blanco con manchas de guiso, un cucharón de madera en la mano y una ceja levantada; detrás, la cocina chica de un barco con ollas humeantes colgadas y un ojo de buey redondo que da al mar` |
| ⬜ | `malvinas-3.png` | `Paz, una bióloga de unos treinta años, anteojos, gorro de lana con orejeras, campera polar roja, un contador manual y una planilla en la mano; detrás, una colonia de pingüinos en una playa de piedras con mar gris` |
| ⬜ | `malvinas-4.png` | `Teodoro, un farero viejo de barba blanca larga, pulóver grueso de cuello alto, gorro de lana, un farol antiguo en la mano; detrás, un faro rojo y blanco sobre una roca en un canal con montañas nevadas` |
| ⬜ | `malvinas-5.png` | `Carola, una pescadora de centollas de unos cuarenta años, pelo atado con un pañuelo, overol de goma amarillo, botas, levantando una centolla enorme; detrás, el puerto de Ushuaia con barquitos y montañas nevadas` |
| ⬜ | `malvinas-6.png` | `Rómulo, un trompetista de banda de unos cuarenta años, cachetes inflados, bigote prolijo, uniforme azul de gala con botones dorados sin escudos, una trompeta brillante; detrás, la cubierta de un buque con banderines de colores` |
| ⬜ | `malvinas-7.png` | `Valentina, una navegante de unos treinta y cinco años, pelo negro recogido, saco azul marino, un compás de navegación y una carta náutica en las manos; detrás, el puente de un barco con instrumentos de bronce y el mar por las ventanas` |
| ⬜ | `malvinas-8.png` | `Belisario, un ovejero fueguino de unos cincuenta años, boina, bufanda gruesa, campera de cuero de oveja, con un perro ovejero blanco y negro a su lado; detrás, una estancia con ovejas y montañas nevadas bajo un cielo de viento` |
| ⬜ | `malvinas-9.png` | `Mónica, una invernante antártica de unos cuarenta años, cara curtida por el frío, gorro de piel, campera polar naranja con capucha, antiparras en la frente; detrás, una base antártica con casillas rojas, nieve y pingüinos` |
| ⬜ | `malvinas-jefe.png` | `El Capitán de la Fragata, un capitán viejo de barba blanca tupida y mirada desafiante, saco azul marino con botones dorados, gorra de capitán con visera, un catalejo de bronce en la mano, pipa en la boca; detrás, el puente de mando de un velero antiguo con un timón de madera, el mar del sur con témpanos a lo lejos y un cielo de tormenta; sin escudos ni insignias militares` |

## 6. Avatares del jugador (12)

**512×512, transparentes**, con el `[Estilo B]` adelante y el mismo encuadre de busto. Nombre: `avatar-1.png` … `avatar-12.png`.

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

| | Nombre | Tamaño | Fondo | Prompt |
|---|---|---|---|---|
| ⬜ | `portada-vertical.png` | 1080×1920 | lleno | `[Estilo A] La pampa argentina en la hora dorada, pastizales infinitos, un ombú, una estancia a lo lejos, cielo amplio y dramático, el tercio de abajo despejado para poner un menú, sin gente, sin texto` |
| ⬜ | `portada-horizontal.png` | 1920×1080 | lleno | `(el mismo prompt, en formato apaisado)` |
| ✅ | Gaucho de la portada | | | |
| ✅ | Marco del logo | | | |
| ✅ | Ícono de la app | | | |

## 8. Tarjetas de cada juego (en "Elegí un juego")

**1600×1000 (o 800×500), lleno**, con el `[Estilo A]` adelante, sin texto. Lo importante tiene que quedar **en el centro**
(la tarjeta se recorta en un rectángulo casi cuadrado) y la mitad derecha más oscura y vacía.

| | Nombre | Prompt (después del estilo) |
|---|---|---|
| ✅ | Truco | |
| ⬜ | `chinchon.png` | `una mano de siete cartas españolas abiertas en abanico formando una escalera de copas, el pozo de descarte con una carta boca arriba y un comodín con cara de bufón asomando, sobre una mesa de madera con un mate al costado, luz cálida de lámpara, la mitad derecha más oscura y vacía` |
| ⬜ | `casita-robada.png` | `una pila alta y prolija de cartas españolas boca arriba que parece una casita, una mano que se la lleva en broma por el costado, otras cartas desparramadas en un paño verde, luz cálida, la mitad derecha más oscura y vacía` |
| ⬜ | `escoba.png` | `una escobita de paja barriendo cartas españolas de un paño verde, el siete de oro brillando con destellos dorados, cartas que vuelan un poco por el barrido, luz cálida, la mitad derecha más oscura y vacía` |
| ⬜ | `tutti-frutti.png` | `una hoja de papel con columnas dibujadas a mano y renglones vacíos, un lápiz mordido, un reloj de arena y letras de madera desparramadas sobre una mesa de cocina con un mantel a cuadros, luz de la tarde, la mitad derecha más oscura y vacía; en la hoja no hay palabras escritas` |

## 9. Mapa de la Gira ✅

Ya está. Las regiones las marca la app encima: no hace falta generar nada más.

## 10. Fondos desbloqueables (15)

Dos versiones de cada uno: **vertical 1290×2796** y **horizontal 2560×1440**, lleno. Nombre: `<id>-vertical.png` y
`<id>-horizontal.png`. Empezá con el `[Estilo A]` y agregale al final:

- **De noche:** `luz cálida de cine, fondo un poco desenfocado con poca profundidad de campo, el centro tranquilo y despejado (encima va una mesa de cartas), sin gente, sin texto, sin logos`
- **De día:** `luz de día clara y alegre, cielo celeste, colores vivos pero suaves, el centro tranquilo y despejado (encima va una mesa de cartas), sin gente, sin texto, sin logos`

Los que están ✅ tienen solo la versión horizontal, y chica (la del chat). Si tenés los originales en alta y las verticales, mejor.

| | id | Luz | Se desbloquea | Prompt (entre el estilo y el final) |
|---|---|---|---|---|
| ✅ | `boliche` | noche | Desde el arranque | `Interior de un viejo boliche de campo argentino, paredes y vigas de madera, faroles a querosén colgando, un mostrador largo con estantes de botellas sin etiqueta, mates y aperos de cuero` |
| ✅ | `patio` | día | Desde el arranque | `Patio criollo a pleno sol, una parra con racimos de uva dando sombra, macetas con malvones, un aljibe, paredes blancas encaladas y piso de ladrillo` |
| ✅ | `bodegon` | noche | Ganarle al jefe de Buenos Aires | `Bodegón porteño tradicional en San Telmo, piso de baldosas blancas y negras, barra de madera oscura con bronces, espejos viejos con adornos de fileteado, lámparas amarillas suaves` |
| ✅ | `bodega` | noche | Llegar a Cuyo | `Bodega rústica en Mendoza, toneles de roble en hileras, paredes de piedra, luz de velas, una ventana a los viñedos y la cordillera nevada en la hora dorada` |
| ✅ | `litoral` | día | Llegar a Mesopotamia | `Galería de un rancho del litoral argentino sobre un río tranquilo, vegetación subtropical frondosa, una hamaca paraguaya, un acordeón apoyado en un banco, atardecer húmedo y dorado` |
| ✅ | `pena` | noche | Llegar al Norte | `Peña folclórica en Salta, paredes de adobe, ponchos de colores y un charango colgados, vasijas de barro, una ventana a los cerros de colores de Purmamarca, luz de fogón` |
| ⬜ | `refugio` | noche | Llegar a Patagonia | `Refugio de montaña de madera en la Patagonia, hogar de piedra con leños encendidos, cueros de oveja en el piso, un ventanal a un lago glaciar turquesa y picos nevados` |
| ✅ | `puerto` | noche | Llegar a Malvinas | `Vieja cantina de puerto en Ushuaia, sogas y faroles en las paredes, una ventana al Canal Beagle con montañas nevadas y un faro rojo y blanco, atardecer azulado` |
| ✅ | `fogon` | noche | Completar una gira | `Fogón de noche en el campo argentino, chispas que suben, troncos como bancos, una guitarra y una pava junto al fuego, un cielo lleno de estrellas con la Vía Láctea, caballos a lo lejos` (si lo rehacés, sin gente) |
| ⬜ | `costa` | día | Conseguir 10 logros | `Parador de madera frente al mar en la costa atlántica, sombrillas de paja, arena clara, cielo celeste con gaviotas, mañana luminosa` (el del chat está bien: falta el archivo) |
| 🔁 | `vereda` | día | Ganar 10 partidas | `Vereda empedrada de un barrio porteño en primavera, jacarandás en flor, mesitas de café vacías en la vereda, balcones con hierro forjado, luz de la tarde, sin carteles` |
| 🔁 | `cafe` | noche | Tienda, 300 fósforos | `Café de barrio porteño de noche, mesas de mármol vacías, sillas de madera curvada, un ventanal a una calle empedrada mojada por la lluvia con faroles antiguos, sin diarios ni carteles` |
| ✅ | `quincho` | día | Tienda, 400 fósforos | `Quincho de verano al mediodía, techo de paja, parrilla de ladrillo, pileta y jardín verde, sillas de madera, luz clara` |
| ✅ | `estancia` | día | Tienda, 500 fósforos | `Galería de una vieja estancia en la pampa al atardecer, columnas de madera, una parrilla con brasas encendidas, monturas y ponchos colgados, pastizales dorados y un ombú` |
| ⬜ | `cataratas` | día | Completar las cinco giras | `Mirador de madera frente a las Cataratas del Iguazú, selva verde, un arcoíris en la bruma, mariposas de colores, sol de la mañana` (el del chat está bien: falta el archivo) |

## 11. Opcionales (si te sobran ganas)

- **Victoria y derrota**, 1080×1080, lleno, con el `[Estilo A]` adelante:
  `gauchos festejando con los sombreros en alto bajo fuegos artificiales` /
  `un gaucho triste encogiéndose de hombros al lado de su caballo al atardecer, con humor`.
- **Caras de los rivales** contento y enojado: el mismo prompt del rival más `riéndose feliz` o `con el ceño fruncido, enojado`.
  Nombre `<región>-<slot>-contento.png` y `-enojado.png`.

## Orden recomendado (lo que falta)

1. Los rivales (sección 5), empezando por Buenos Aires: se ven en toda la Gira.
2. El ícono de Logros (4) y las 4 tarjetas de juego (8).
3. Los fondos que faltan o hay que rehacer (10), y las verticales.
4. Mate, poncho y cartel (1), portada (7) y avatares (6).
