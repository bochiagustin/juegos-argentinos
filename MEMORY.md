# MEMORY — Juegos Argentinos

Memoria de trabajo del proyecto: lo que el usuario pidió, prefirió o decidió en conversación, y lo que falta definir.
`CLAUDE.md` tiene la arquitectura y las reglas; acá va el contexto que no es obvio leyendo el código.

## Preferencias del usuario

- Idioma: todo en español rioplatense con voseo (UI, mensajes, commits en español está bien).
- Trabajo por fases, frenando al final de cada una para mostrar cómo probar y esperar su OK.
- Quiere reglas correctas y completas, no versiones simplificadas; ante la duda, preguntar.
- Variantes regionales: la de Buenos Aires por defecto, la otra configurable.
- La app se llama **Juegos Argentinos**. Al entrar se elige el juego.
- Prioridad: **offline contra la IA primero**, después modo carrera con logros, y el online con amigos al final.
- La IA tiene que volverse más competitiva a medida que el jugador avanza.
- Modo carrera tipo "Gira Nacional" (referencia: mapa de Argentina por regiones con candados "En N pts"): **una gira por juego**,
  logros y fósforos compartidos.
- Estética: referencia del mockup "Truco Argentino" (gaucho con mate, paño verde, madera, paleta tierra/paño/celeste/naranja,
  títulos tipo western). Cartas: **criollo caricatura** (peón, gaucho a caballo, patrón; fileteado porteño en los ases).
- Las **ilustraciones grandes las provee el usuario** (portada, tarjetas de juegos, mapa, 18 rivales). Checklist en `docs/arte.md`.
- Mandó 3 PDFs de **Mazo Argento** (Nuevo, Memes, Campeón del Mundo) y **declaró tener licencia** de sus autores.
  Se recortaron provisoriamente de los PDFs; quedan como mazos desbloqueables. Falta el permiso escrito y los originales
  (`docs/licencias/mazo-argento.md`). Tienen personas reales: confirmar derechos de imagen antes de publicar.
- 2026-10-28 · Pidió sumar la **Escoba de 15** (referencia https://www.ludoteka.com/juegos/escoba/reglas, bloqueada por la red del entorno).
- Mazos temáticos con palos cambiados están bien siempre que cada palo mantenga su color y el índice grande.
- Fuentes de referencia que pasó (no se pudieron leer: la red del entorno bloquea esos dominios):
  - Truco: https://es.wikihow.com/jugar-al-truco
  - Chinchón: https://www.nhfournier.es/como-jugar/chinchon/
  - Tutti-frutti: https://www.uncomo.com/ocio/articulo/como-jugar-al-tutifruti-38246.html
  - Casita robada: https://focusgn.com/latinoamerica/como-se-juega-a-la-casita-robada
  Las reglas del CLAUDE.md salen del brief del usuario + reglamento estándar porteño.

## Decisiones tomadas

- 2026-10-28 · Monorepo con pnpm workspaces; paquetes consumidos como fuente TS (sin build del motor).
- 2026-10-28 · Servidor (Fase 7): PartyServer + Cloudflare Durable Objects (alternativa Colyseus en Fly.io).
- 2026-10-28 · RNG: sfc32 + cyrb128, estado `[u32,u32,u32,u32]` guardado en el estado del juego. Fisher–Yates con rechazo para evitar sesgo de módulo.
- 2026-10-28 · Ids de carta legibles: `"7-oro"`, `"comodin-1"`.
- 2026-10-28 · Paleta por palo: espada azul, basto verde, oro dorado, copa rojo. Marco con pausas tradicionales (oro 0, copa 1, espada 2, basto 3).
- 2026-10-28 · Motion (`motion/react`) en lugar del paquete viejo `framer-motion` (es la misma librería, renombrada).

- 2026-10-28 · Reorientación aprobada: fases nuevas (1 app · 2 Truco vs IA · 3 carrera · 4 Chinchón · 5 Casita · 6 Escoba · 7 Tutti-Frutti · 8 online · 9 pulido).
- 2026-10-28 · Escoba entra como Fase 6, después de Casita Robada (comparten la mecánica de levantar de la mesa).
- 2026-10-28 · Paquetes renombrados a `@juegos-argentinos/*`.
- 2026-10-28 · Sin router: navegación por pila + historial del navegador. Guardado en localStorage versionado (v1: perfil, ajustes, mazo).
- 2026-10-28 · Sonidos sintetizados con Web Audio (cero archivos). PWA con vite-plugin-pwa; imágenes de mazos/arte con caché en runtime.
- 2026-10-28 · Hasta la Fase 3 (carrera) todos los mazos están disponibles; después los Mazo Argento se desbloquean con fósforos/logros.

- 2026-10-28 · Mandó mockups (cuero cosido, paño con textura, botones de bronce, pestañas abajo, cartas tipo pergamino) y pidió
  "mejorá las imágenes y arrancá la fase 2": se aplicó ese estilo con texturas procedurales propias.
- 2026-10-28 · Fase 2 arrancó sin respuesta a las dudas del truco: se usaron las propuestas como default (configurables las que
  tienen variante). Fuerza medida de los bots (300 partidas a 15): nivel 10 vs 1 gana 76%, 10 vs 5 60%, 5 vs 1 62%.

- 2026-10-28 · Pidió las fases 3, 4 y 5 juntas. Dudas de chinchón y casita sin responder → se usaron las propuestas como
  default y casi todo quedó configurable. Decisiones nuevas: ligar automático al corte; reenganche automático una vez;
  en la casita levantar es obligatorio si se puede; no se puede tirar la carta recién levantada del pozo.
- 2026-10-28 · Los Mazo Argento pasaron a ser desbloqueables (fósforos o premio de la gira). Se arranca con 100 fósforos.
- 2026-10-28 · Las giras de chinchón y casita son mano a mano (2 jugadores) en todas las regiones.
- 2026-10-28 · Fase 6 (Escoba) sin respuesta a las dudas 16–20 → defaults: levantar opcional (configurable), escoba de mano
  en cada reparto de ronda (no en los repartos de 3 a mitad de ronda), sin bonus especiales, a 15. La gira sube a 21 y 31
  y en algunas regiones levantar es obligatorio. Mano a mano en toda la gira.

- 2026-10-29 · Pidió "completá todas las fases y después vemos qué hay que corregir": fases 7, 8 y 9 seguidas, sin frenar.
- 2026-10-29 · Tutti-Frutti (dudas 14 y 15 sin respuesta → propuestas): si se acaba el tiempo se puntúa normal; empate en la
  votación = se acepta. Contra la IA la votación viene apagada: lo que la máquina no conoce vale (marcado 🤔 "dudosa");
  con "Votar las dudosas" la máquina puede rechazarlo. Tiempo por ronda 2:30, cuenta de 5 s, 5 rondas por defecto.

## Dudas abiertas (preguntar antes de implementar la fase correspondiente)

### Truco (implementado con la propuesta; confirmar)
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

### Escoba de 15
16. ¿Levantar es obligatorio si se puede sumar 15? Propuesta: no, es opcional.
17. Las 4 de la mesa del reparto inicial que suman 15: ¿escoba para el que reparte? Propuesta: sí (y dos si suman 30). ¿Y en los repartos siguientes?
18. Bonus: ¿"todos los oros" (los 10) o "los cuatro sietes" valen más de 1? Propuesta: no, 1 punto común; variante configurable.
19. ¿Se juega a 15, 21 o 31 por defecto? Propuesta: 15.
20. En 3 jugadores, ¿se saca alguna carta del mazo para que el reparto cierre? Con 40 cartas, 4 a la mesa y 3 por cabeza cierra justo (36 = 4×9): no hace falta.

### Tutti-Frutti
14. Si nadie aprieta BASTA y se acaba el tiempo, ¿se puntúa normal? Propuesta: sí.
15. Empate en la votación de rechazo: ¿se acepta la respuesta? Propuesta: sí (beneficio de la duda).
