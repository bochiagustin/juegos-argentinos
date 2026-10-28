# Arte que falta (checklist)

Las **cartas no hacen falta**: la Criolla está dibujada en código y los Mazo Argento ya están en `apps/web/public/mazos/`.
Esto es lo que se necesita para la portada, los juegos y la Gira. Mientras no esté, la app muestra un dibujo o un
placeholder del mismo tamaño, así que se puede ir sumando de a poco.

**Formato:** PNG o WebP al doble de resolución, todas del mismo artista y estilo, con derecho a usarlas.
**Dónde van:** exactamente en la ruta indicada, dentro de `apps/web/public/`. La lista sale de `apps/web/src/art/manifest.ts`.

## Imprescindibles

| ✓ | Archivo | Tamaño | Fondo | Qué es |
|---|---|---|---|---|
| ☐ | `arte/logo.png` | 1024×512 | transparente | Logo "Juegos Argentinos" |
| ☐ | `arte/icono.png` | 1024×1024 | lleno | Ícono de la app, con ~20% de margen (los Android lo recortan en círculo) |
| ☐ | `arte/portada/fondo-vertical.png` | 1080×1920 | lleno | Pampa, sin personajes ni texto (celular) |
| ☐ | `arte/portada/fondo-horizontal.png` | 1920×1080 | lleno | Pampa, sin personajes ni texto (compu) |
| ☐ | `arte/portada/gaucho.png` | ~900×1200 | transparente | Gaucho con mate y cartas, recortado |
| ☐ | `arte/juegos/truco.png` | 800×500 | lleno | Tarjeta del Truco, sin texto |
| ☐ | `arte/juegos/chinchon.png` | 800×500 | lleno | Tarjeta del Chinchón, sin texto |
| ☐ | `arte/juegos/casita-robada.png` | 800×500 | lleno | Tarjeta de la Casita Robada, sin texto |
| ☐ | `arte/juegos/tutti-frutti.png` | 800×500 | lleno | Tarjeta del Tutti-Frutti, sin texto |
| ☐ | `arte/mapa/base.png` | 1080×2400 | lleno | Mapa de Argentina con Malvinas, sin textos ni candados |
| ☐ | `arte/mapa/region-<id>.png` ×6 | 1080×2400 | transparente | Cada región sola, alineada exacto sobre el mapa base |
| ☐ | `arte/rivales/<region>-<1\|2\|jefe>.png` ×18 | 512×512 | transparente | Busto de cada rival |

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
