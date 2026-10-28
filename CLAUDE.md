# La Mesa — juegos de cartas argentinos online con amigos

Web app mobile-first (PWA) para jugar online con amigos a **Truco, Chinchón, Casita Robada y Tutti-Frutti**.
Tiene que sentirse como una juntada de verdad: rápida, divertida, con animaciones, sonidos y onda argentina.
Textos de la UI en **español rioplatense con voseo** ("Tirá una carta", "¿Querés?", "Te toca").

> Leé también `MEMORY.md`: preferencias del usuario, decisiones tomadas en conversación y dudas pendientes.

## Cómo trabajamos

- Se trabaja **por fases**. Al terminar cada fase: frenar, explicar cómo probarla y **esperar el OK del usuario** antes de seguir.
- Mantener este archivo actualizado (sección "Estado de avance") al cerrar cada tarea relevante.
- Si una regla tiene variantes regionales: usar la más común en **Buenos Aires** y dejar la otra como opción configurable.
- Si una regla es ambigua: **preguntar antes de inventar** (anotarla en "Dudas abiertas" de `MEMORY.md`).
- Nada de versiones simplificadas de los juegos: la lógica tiene que ser correcta y completa.

## Comandos

```bash
pnpm install          # instala todo el monorepo (pnpm 10, Node >= 22)
pnpm dev              # levanta la web (apps/web) en http://localhost:5173
pnpm test             # tests de todos los paquetes (Vitest)
pnpm typecheck        # tsc estricto en todos los paquetes
pnpm --filter @la-mesa/engine test:watch
```

## Arquitectura

Monorepo pnpm, TypeScript estricto en todo (`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`). Los paquetes se consumen como fuente TS (sin build intermedio; imports con extensión `.ts`).

```
packages/engine   Motor de reglas puro (sin UI, sin red). Vitest.
apps/server       Servidor autoritativo de salas (Fase 1).
apps/web          React 19 + Vite + Tailwind v4 + Motion (ex Framer Motion). Deploy en Vercel.
```

### Motor (`packages/engine`)

- Cada juego implementa `GameDefinition<Config, State, Action, View>` (`src/core/game.ts`):
  `initialState(config, players, seed)`, `getValidActions(state, playerId)`, `applyAction(state, playerId, action)`,
  `getPlayerView(state, playerId)`, `isGameOver(state)`.
- **Puro y determinístico**: prohibido `Math.random`, `Date.now`, mutar el estado recibido o tener I/O.
  El azar sale de `RngState` (sfc32 sembrado con cyrb128, `src/core/rng.ts`), que vive **dentro del estado** y es JSON.
  Una partida se reproduce con semilla + lista de acciones. El tiempo (timeouts de turno) entra como acciones que manda el servidor.
- Estado 100% serializable a JSON (se guarda en el storage del Durable Object).
- Cartas: objetos planos con `id` estable (`"1-espada"`, `"12-copa"`, `"comodin-1"`). Las acciones referencian cartas por id.
- `getPlayerView` **nunca** incluye cartas ocultas de otros jugadores ni el orden del mazo (solo cantidades).
- Archivos actuales: `core/cards.ts` (modelo), `core/deck.ts` (mazos 40/48 + comodines, Fisher–Yates, repartir), `core/rng.ts`, `core/game.ts`.
- Cada juego irá en `src/<juego>/` con sus tests al lado (`*.test.ts`), más un bot (`src/<juego>/bot.ts`) y un test de simulación de partidas completas bot vs bot.

### Servidor (`apps/server`) — decisión: PartyServer + Cloudflare Durable Objects

- Una sala = un Durable Object (id derivado del código de sala). Es el **único** que tiene el estado completo.
- Por qué: WebSockets con hibernación (barato cuando la sala está quieta), `alarm()` para temporizadores de turno y
  timeout de reconexión, storage transaccional por sala, latencia baja en Sudamérica (edge), cero servidores que mantener,
  free tier generoso. Colyseus en Fly.io queda como alternativa si algo de DO nos limita.
- Protocolo: el cliente manda `{type: "action", action}`; el servidor valida contra `getValidActions` (nunca confiar en el cliente),
  aplica, persiste y manda a cada conexión **solo** su `getPlayerView`. Chat, reacciones y señas son mensajes aparte
  (las señas y el chat de equipo solo se reenvían al compañero).
- Identidad sin registro: el cliente genera y guarda en `localStorage` un `playerToken` secreto + apodo + avatar; con eso se reconecta a su lugar.

### Web (`apps/web`)

- React 19 + Vite + Tailwind v4 (`@tailwindcss/vite`, tema en `src/index.css`) + `motion` (`import { motion } from "motion/react"`).
- Fuentes empaquetadas (sin CDN, para PWA offline): Fraunces (display, índices de cartas) y Nunito (UI).
- Cartas: `src/cards/` — `SpanishCard.tsx` (SVG 200×300), `suits.tsx` (íconos de palos en caja 100×100),
  `figures.tsx` (Sota, Caballo, Rey en caja 108×240), `palette.ts` (colores por palo).
  Diseño propio: índice grande en dos esquinas, marco con **pausas** (oro 0, copa 1, espada 2, basto 3),
  pips de espada/basto levemente cruzados, aces con medallón (los anchos con rayos dorados), dorso bordó con sol "La Mesa".
- Mobile-first: blancos táctiles ≥ 44px, sin scroll horizontal, `100dvh`.
- Actualización optimista solo visual (animar la carta saliendo); el estado real lo decide el servidor.

## Reglas de los juegos (fuente de verdad para el motor)

### Truco argentino

- Mazo de 40 (sin 8, 9 ni comodines). 2, 4 o 6 jugadores (1v1, 2v2, 3v3), equipos alternados en la mesa.
- **Jerarquía** (mayor a menor): 1 espada > 1 basto > 7 espada > 7 oro > los 3 > los 2 > 1 copa = 1 oro > los 12 > los 11 > los 10 >
  7 copa = 7 basto > los 6 > los 5 > los 4. Cartas del mismo escalón empatan (parda).
- 3 cartas por jugador, hasta 3 bazas. Gana la mano el equipo que gana 2 bazas.
- **Pardas**: empata 1ª → gana quien gane la 2ª; empatan 1ª y 2ª → define la 3ª; alguien ganó la 1ª y se empata la 2ª o la 3ª → gana el que ganó la 1ª;
  se empatan las tres → gana el equipo que es mano. Si se empata la 1ª y la 2ª la gana alguien, termina ahí.
- En cada baza empieza quien ganó la anterior; si fue parda, empieza el que tiró primero en la baza empardada (el más cercano a la mano). *(confirmar, ver MEMORY.md)*
- La mano rota en sentido antihorario cada ronda.
- **Truco**: Truco (2) → Retruco (3) → Vale Cuatro (4). Solo puede subir el equipo que aceptó el último canto. Respuestas: Quiero / No quiero / subir.
  No querido: el que cantó cobra lo que valía antes (1, 2 o 3). Mano sin truco = 1 punto.
- **Envido**: solo en la primera baza, antes de que el jugador que canta haya tirado su carta.
  "El envido está primero": si cantan truco en primera baza, el que responde puede cantar envido antes de contestar el truco.
  - Tanto: dos del mismo palo = 20 + valores (10, 11, 12 valen 0). Sin dos del mismo palo: la carta más alta (figuras 0). Máximo 33.
    Con tres del mismo palo (sin flor) se toman las dos más altas.
  - Valores querido: Envido 2, Envido-Envido 4, Real Envido 3, Envido-Real Envido 5, Envido-Envido-Real Envido 7,
    Falta Envido = lo que le falta al que va ganando para llegar a 15 (malas) o a 30 (buenas) según la etapa.
  - No querido: se cobra lo aceptado antes del último canto (mínimo 1). Ej.: Envido-Envido-Real no querido = 4.
  - Se dicen los tantos en orden empezando por la mano; quien no gana puede decir "Son buenas". Empate: gana la mano.
    Los tantos se muestran al final de la ronda.
- **Flor** (opcional, configurable): tres del mismo palo. Flor 3, Contraflor, Contraflor al resto. La flor anula el envido.
- **Irse al mazo** en cualquier momento: el rival cobra lo que corresponda al truco; si es en primera baza sin envido cantado,
  +1 por el envido no cantado (regla estándar, configurable).
- Partida a 15 o a 30 ("malas y buenas"). Marcador con fósforos (grupos de 5 en cuadradito).
- 4 y 6 jugadores: **señas** que solo ve el compañero (guiño, labios, cejas, etc.) y chat de equipo privado. 6 jugadores: "pica-pica" opcional.
- UI: quién es mano, solo botones de cantos válidos, qué está en juego, puntaje; cantos como globos grandes sobre el avatar con sonido.

### Chinchón

- Mazo de 48 + 2 comodines (configurable: con/sin comodines, 40 o 48). 2 a 6 jugadores. 7 cartas a cada uno, se da vuelta una al pozo.
- Turno: robar del mazo o la última del pozo, y descartar una.
- Combinaciones: escalera de 3+ consecutivas del mismo palo; grupo de 3 o 4 del mismo número.
  Comodín reemplaza cualquier carta; no dos comodines en la misma combinación (configurable).
  Con mazo de 40, el 7 y el 10 son consecutivos.
- **Cortar**: si las cartas sin combinar suman ≤ 5 (configurable 5 o 7), descartando una boca abajo.
  Los demás muestran y pueden **ligar** sus sueltas a las combinaciones del que cortó.
- Puntaje: suma de sueltas (valor = número de la carta). Cortar con todo combinado ("menos diez") = −10.
  Comodín suelto = 50 (configurable 25). **Chinchón** = escalera de 7 del mismo palo sin comodín → gana la partida.
- Llegar a 100 → eliminado. "Reenganche" opcional (vuelve con el puntaje del que más tiene). Gana el último que queda.
- Si se acaba el mazo: se mezcla el pozo (menos la última) y se sigue.
- UX: ordenar arrastrando, orden automático (palo / número), resaltado de combinaciones, contador de puntos sueltos y "ya podés cortar".

### Casita Robada

- Mazo de 40. 2 a 4 jugadores (individual o parejas, configurable).
- 3 cartas a cada uno y 4 boca arriba en la mesa. Al quedarse todos sin cartas se reparten 3 más (la mesa no se repone).
- Tirás una carta: si coincide en número con una de la mesa, te llevás las dos a tu casita (boca arriba). Si coincide con la carta de arriba
  de la casita de un rival, le robás **toda** la casita. Si no coincide con nada, queda en la mesa.
- Si podés levantar de la mesa y robar casita, elegís vos (prioridad configurable).
- Cartas que quedan en la mesa al final: para el último que levantó, o de nadie (configurable).
- Gana quien tiene más cartas en su casita.
- UX: casitas visibles con la carta de arriba grande y el contador; animación dramática al robar.

### Tutti-Frutti (Basta)

- 2 a 10 jugadores. Categorías por defecto: Nombre, Apellido, País, Ciudad, Animal, Fruta o Verdura, Color, Cosa, Marca, Comida; se pueden agregar propias.
- Letra al azar con ruleta; excluidas por defecto Ñ, K, Q, W, X, Y, Z (configurable); sin repetir en la partida.
- Todos completan a la vez; el primero que completa todo aprieta **¡BASTA!** → cuenta regresiva de 3-5 s (configurable). Tiempo máximo por ronda.
- Validación automática (empieza con la letra; normaliza mayúsculas, acentos y espacios) + revisión con votación por mayoría para rechazar.
  Repetidas detectadas con la misma normalización.
- Puntaje: 10 válida única, 5 repetida, 20 si sos el único con respuesta válida en la categoría, 0 vacía o rechazada.
- Partida a N rondas o a X puntos, con tabla de posiciones animada entre rondas.

## Criterios de calidad

- Nunca confiar en el cliente: toda acción se valida en el servidor contra `getValidActions`.
- Tests del motor con casos borde de cada juego (pardas, envido no querido encadenado, ligar al cortar, robo de casita con elección, repetidas en tutti-frutti…).
- Antes de cerrar cada fase de juego: simular partidas completas bot vs bot (miles, con semillas fijas) y verificar invariantes
  (no se pierden ni duplican cartas, puntajes consistentes, siempre hay una acción válida o la partida terminó).

## Estado de avance

- [x] **Fase 0** — Monorepo, CLAUDE.md/MEMORY.md, modelo de cartas, RNG con semilla, mezclar/repartir (24 tests), diseño SVG de las 50 cartas + dorso, página de muestra en `apps/web`.
- [ ] **Fase 1** — Común: inicio, salas con código + WhatsApp, lobby, reconexión, timer, chat/reacciones, bots, revancha, sonidos, animaciones, tutorial, PWA.
- [ ] **Fase 2** — Truco.
- [ ] **Fase 3** — Chinchón.
- [ ] **Fase 4** — Casita Robada.
- [ ] **Fase 5** — Tutti-Frutti.
- [ ] **Fase 6** — Pulido, resultados con momentos destacados, temas, deploy final.
