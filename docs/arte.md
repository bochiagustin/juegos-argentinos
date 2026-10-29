# Arte que falta (checklist)

Las **cartas no hacen falta**: la Criolla está dibujada en código y los Mazo Argento ya están en `apps/web/public/mazos/`.
Esto es lo que se necesita para la portada, los juegos y la Gira. Mientras no esté, la app muestra un dibujo o un
placeholder del mismo tamaño, así que se puede ir sumando de a poco.

**Formato:** PNG o WebP al doble de resolución, todas del mismo artista y estilo, con derecho a usarlas.
**Dónde van:** exactamente en la ruta indicada, dentro de `apps/web/public/`. La lista sale de `apps/web/src/art/manifest.ts`.

## Imprescindibles

| ✓ | Archivo | Tamaño | Fondo | Qué es |
|---|---|---|---|---|
| ✅ | `arte/logo-marco.webp` | 1200×561 | transparente | Marco del logo (el texto va en código) |
| ✅ | `arte/icono.png` | 1024×1024 | lleno | Ícono de la app, con ~20% de margen (los Android lo recortan en círculo) |
| ☐ | `arte/portada/fondo-vertical.png` | 1080×1920 | lleno | Pampa, sin personajes ni texto (celular) |
| ☐ | `arte/portada/fondo-horizontal.png` | 1920×1080 | lleno | Pampa, sin personajes ni texto (compu) |
| ✅ | `arte/portada/gaucho.webp` | ~900×1200 | transparente | Gaucho con mate y cartas, recortado |
| ✅ | `arte/juegos/truco.webp` | 800×500 | lleno | Tarjeta del Truco, sin texto |
| ☐ | `arte/juegos/chinchon.png` | 800×500 | lleno | Tarjeta del Chinchón, sin texto |
| ☐ | `arte/juegos/casita-robada.png` | 800×500 | lleno | Tarjeta de la Casita Robada, sin texto |
| ☐ | `arte/juegos/escoba.png` | 800×500 | lleno | Tarjeta de la Escoba de 15, sin texto |
| ☐ | `arte/juegos/tutti-frutti.png` | 800×500 | lleno | Tarjeta del Tutti-Frutti, sin texto |
| ✅ | `arte/mapa/base.webp` | 1080×2400 | lleno | Mapa de Argentina con Malvinas, sin textos ni candados |
| ◐ | `arte/rivales/<region>-<1…9\|jefe>.webp` ×60 | 512×512 | lleno | Busto de cada rival (10 por región). Están 10; los prompts de los 50 que faltan, en `docs/prompts-arte.md` §5 |

Ids de región: `buenos-aires`, `cuyo`, `mesopotamia`, `norte`, `patagonia`, `malvinas`.

## Rivales propuestos (para encargarle al artista)

| Región | Rival 1 | Rival 2 | Jefe |
|---|---|---|---|
| Buenos Aires | Coco, el tachero | Doña Elsa, la del almacén | El Polaco, tanguero de Boedo |
| Cuyo | Mario, viñatero mendocino | Rosita, cosechera de uvas | Don Aníbal, el bodeguero |
| Mesopotamia | Ñato, pescador del Paraná | Mirta, yerbatera misionera | El Chamamecero, acordeón en mano |
| Norte | Benjamín, coplero de la Quebrada | Doña Aurora, tejedora de Humahuaca | El Diablo del Carnaval |
| Patagonia | Gonzalo, guía de montaña | Nahuel, esquilador de Chubut | La Galesa del té de Gaiman |
| Malvinas | Sosa, marinero | Doña Inés, la cocinera del buque | El Capitán de la Fragata |

Son personajes inventados, sin gente real. Si querés otros, se cambian.

## Opcionales

- Cada rival con 3 caras: `<region>-<slot>-contento.png` y `<region>-<slot>-enojado.png`.
- Íconos del mapa (~256 px, transparentes): cataratas, glaciar, fragata, vides, cerros.
- Fondos de mesa por región (1080×1920).
- Victoria y derrota (1080×1080).
- 8 a 12 avatares para el jugador (512×512, transparentes).


## Mesa (look de boliche) — opcionales

| Archivo | Tamaño | Notas |
|---|---|---|
| `apps/web/public/arte/fondos/<id>-vertical.webp` | 1290×2796 | Fondo de mesa (ids y desbloqueos en `packages/career/src/fondos.ts` y `docs/prompts-arte.md` §10) |
| `apps/web/public/arte/fondos/<id>-horizontal.webp` | 2560×1440 | Lo mismo, apaisado. Si falta el vertical, se recorta el horizontal |
| `apps/web/public/arte/mesa/mate.png` | 600×600, transparente | Mate con bombilla |
| `apps/web/public/arte/mesa/poncho.png` | 800×600, transparente | Poncho o manta doblada |
| `apps/web/public/arte/mesa/cartel.png` | 600×800, transparente | Cartel de madera **sin texto** (el texto va en código) |

Mientras falten, la app usa madera con luz cálida, un mate dibujado y un cartel de madera hecho en CSS.

## Íconos (ya están, salvo uno)

Íconos de canto (truco, envido, real envido, falta envido, flor, irse al mazo, quiero, no quiero) y pestañas (inicio, jugar,
mazos, ajustes) en `arte/iconos/`. **Falta `tab-logros`**: un trofeo en el mismo estilo (dorado con cuero, fondo transparente).

Para sumar arte nuevo: subí los originales a la raíz del repo y se procesan con `python3 tools/recortar-arte.py <carpeta>`.
