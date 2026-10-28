# MEMORY — La Mesa

Memoria de trabajo del proyecto: lo que el usuario pidió, prefirió o decidió en conversación, y lo que falta definir.
`CLAUDE.md` tiene la arquitectura y las reglas; acá va el contexto que no es obvio leyendo el código.

## Preferencias del usuario

- Idioma: todo en español rioplatense con voseo (UI, mensajes, commits en español está bien).
- Trabajo por fases, frenando al final de cada una para mostrar cómo probar y esperar su OK.
- Quiere reglas correctas y completas, no versiones simplificadas; ante la duda, preguntar.
- Variantes regionales: la de Buenos Aires por defecto, la otra configurable.
- Cartas españolas dibujadas por nosotros en SVG, nada de imágenes de mazos comerciales.
- Fuentes de referencia que pasó (no se pudieron leer: la red del entorno bloquea esos dominios):
  - Truco: https://es.wikihow.com/jugar-al-truco
  - Chinchón: https://www.nhfournier.es/como-jugar/chinchon/
  - Tutti-frutti: https://www.uncomo.com/ocio/articulo/como-jugar-al-tutifruti-38246.html
  - Casita robada: https://focusgn.com/latinoamerica/como-se-juega-a-la-casita-robada
  Las reglas del CLAUDE.md salen del brief del usuario + reglamento estándar porteño.

## Decisiones tomadas

- 2026-10-28 · Monorepo con pnpm workspaces; paquetes consumidos como fuente TS (sin build del motor).
- 2026-10-28 · Servidor: PartyServer + Cloudflare Durable Objects (pendiente de confirmación del usuario; alternativa Colyseus en Fly.io).
- 2026-10-28 · RNG: sfc32 + cyrb128, estado `[u32,u32,u32,u32]` guardado en el estado del juego. Fisher–Yates con rechazo para evitar sesgo de módulo.
- 2026-10-28 · Ids de carta legibles: `"7-oro"`, `"comodin-1"`.
- 2026-10-28 · Paleta por palo: espada azul, basto verde, oro dorado, copa rojo. Marco con pausas tradicionales (oro 0, copa 1, espada 2, basto 3).
- 2026-10-28 · Motion (`motion/react`) en lugar del paquete viejo `framer-motion` (es la misma librería, renombrada).

## Dudas abiertas (preguntar antes de implementar la fase correspondiente)

### Truco
1. ¿Quién empieza la baza siguiente a una parda? Propuesta: el que empezó la baza empardada (el más cercano a la mano).
2. Irse al mazo en primera baza sin envido cantado: ¿+1 al rival solo si se va el que es mano / antes de tirar, o siempre? Propuesta: siempre que no se haya cantado envido y se esté en primera baza, configurable.
3. Falta envido en partida a 30 estando en malas: ¿lo que falta para 15, o lo que falta para ganar el partido (30)? El brief dice "15 o 30 según la etapa" → en malas se juega a llegar a 15. Confirmar.
4. Flor: ¿"con flor me achico" / "con flor quiero"? ¿La flor obliga a cantarse? Propuesta: obligatoria, y contraflor/contraflor al resto según el brief.
5. "Pica-pica" en 6 jugadores: ¿a partir de qué puntaje (ej. entre 5 y 25) y con qué reglas exactas?

### Chinchón
6. ¿Se puede cortar con el comodín como carta boca abajo? ¿El comodín dentro de una combinación cuenta 0?
7. ¿Se puede ligar con comodín sobre las combinaciones del que cortó, y reemplazar un comodín del que cortó?
8. ¿Escalera que "da la vuelta" (12-1-2)? Propuesta: no.
9. ¿Chinchón con comodín cuenta como algo (ej. −25) o solo el chinchón limpio gana?

### Casita Robada
10. Si en la mesa hay dos cartas del mismo número que la tirada, ¿te llevás una o todas?
11. ¿Se puede "agrandar" la propia casita tirando una carta igual a la de arriba de tu casita?
12. Si dos rivales tienen arriba el mismo número, ¿elegís a cuál robar?
13. En parejas, ¿una casita por pareja o una por jugador?

### Tutti-Frutti
14. Si nadie aprieta BASTA y se acaba el tiempo, ¿se puntúa normal? Propuesta: sí.
15. Empate en la votación de rechazo: ¿se acepta la respuesta? Propuesta: sí (beneficio de la duda).
