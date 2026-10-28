# Juegos Argentinos — truco, chinchón, casita robada y tutti-frutti

Web app mobile-first (PWA, anda sin internet) para jugar a **Truco, Chinchón, Casita Robada y Tutti-Frutti**:
**contra la IA offline** (que se vuelve más competitiva a medida que ganás), en un **modo carrera** ("Gira Nacional",
con rivales, regiones y logros para desbloquear) y, al final, **online con amigos**.
Tiene que sentirse como una juntada de verdad: rápida, divertida, con animaciones, sonidos y onda argentina.
Textos de la UI en **español rioplatense con voseo** ("Tirá una carta", "¿Querés?", "Te toca"), sin marcar género
cuando no hace falta ("¡Hola!" en vez de "¡Bienvenido!").

> Leé también `MEMORY.md`: preferencias del usuario, decisiones tomadas en conversación y dudas pendientes.
> Plan aprobado de la reorientación: IA offline + carrera + rediseño criollo (resumen en "Estado de avance").

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
pnpm build            # build de producción (incluye service worker de la PWA)
pnpm --filter @juegos-argentinos/web preview   # sirve el build: para probar offline/instalable
pnpm --filter @juegos-argentinos/engine test:watch
python3 tools/extraer-mazos.py <pdf> <id>      # recorta un Mazo Argento de su PDF (poppler + Pillow)
```

## Arquitectura

Monorepo pnpm (`@juegos-argentinos/*`), TypeScript estricto en todo (`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`). Los paquetes se consumen como fuente TS (sin build intermedio; imports con extensión `.ts`).

```
packages/engine   Motor de reglas puro (sin UI, sin red) + bots. Vitest.
packages/career   (Fase 3) Gira Nacional, logros y fósforos. Lógica pura.
apps/web          React 19 + Vite + Tailwind v4 + Motion + vite-plugin-pwa. Deploy en Vercel. Corre el motor en el navegador (offline).
apps/server       (Fase 7) Servidor autoritativo de salas online.
tools/            Scripts sueltos (extraer mazos de PDF).
docs/             arte.md (checklist de ilustraciones), licencias/.
```

### Motor (`packages/engine`)

- Cada juego implementa `GameDefinition<Config, State, Action, View>` (`src/core/game.ts`):
  `initialState(config, players, seed)`, `getValidActions(state, playerId)`, `applyAction(state, playerId, action)`,
  `getPlayerView(state, playerId)`, `isGameOver(state)`.
- **Puro y determinístico**: prohibido `Math.random`, `Date.now`, mutar el estado recibido o tener I/O.
  El azar sale de `RngState` (sfc32 sembrado con cyrb128, `src/core/rng.ts`), que vive **dentro del estado** y es JSON.
  Una partida se reproduce con semilla + lista de acciones. El tiempo (timeouts de turno) entra como acciones.
- Estado 100% serializable a JSON. Cartas: objetos planos con `id` estable (`"1-espada"`, `"12-copa"`, `"comodin-1"`).
- `getPlayerView` **nunca** incluye cartas ocultas de otros jugadores ni el orden del mazo (solo cantidades).
- Archivos actuales: `core/cards.ts`, `core/deck.ts` (mazos 40/48 + comodines, Fisher–Yates, repartir), `core/rng.ts`, `core/game.ts`.
- Cada juego irá en `src/<juego>/` con tests al lado, un bot (`bot.ts`) y una simulación de miles de partidas bot vs bot.
- `applyAction` va a devolver también `events` (para logros de la carrera: "cantaste 33", "chinchón", "robaste una casita").

### IA (bots, desde la Fase 2)

- `chooseAction(view, valid, rng, skill)`: **juega limpio**, solo con la vista de su jugador (nunca ve cartas ocultas).
- `skill` 1–10 combina `errorRate`, `memory` (recuerda cartas jugadas), `bluff` (mentir truco/envido), `aggression`, `lookahead`.
  Niveles altos de Truco/Chinchón: Monte Carlo con determinización (reparte con semilla las cartas que no ve y simula).
- Carrera: skill fijo por rival, sube por región; el jefe tiene +2 y estilo propio. Partida rápida: skill adaptativo por rating tipo Elo.
- Tutti-Frutti offline: diccionarios rioplatenses por categoría y letra (`src/tutti-frutti/data/`).

### Carrera y logros (Fase 3, `packages/career`)

- Una **gira por juego**: Buenos Aires → Cuyo → Mesopotamia → Norte → Patagonia → Malvinas; 2 rivales + 1 jefe por región.
  Región se desbloquea por puntos de gira **y** ganándole al jefe anterior. Config de cada gira como datos.
- **Fósforos** (moneda del juego, sin pagos) para cosmética: mazos, dorsos, paños, avatares. Los Mazo Argento se desbloquean acá.
- **Logros** compartidos entre juegos, como predicados sobre los `events` del motor.

### Web (`apps/web`)

- Navegación por pila sin router (`src/nav.tsx`), integrada con el historial (el "atrás" de Android funciona).
  Pantallas en `src/screens/`: Inicio, Juegos, Juego (modos + "Cómo se juega"), Perfil, Ajustes, Mazos.
- Catálogo de juegos y modos en `src/games.ts` (`modos.ia/carrera/amigos`: "disponible" | "proximamente").
- Guardado local en `src/save/` (`save.ts`): una clave de localStorage, esquema versionado con `MIGRATIONS`, todo en try/catch,
  normaliza lo leído. `SaveContext.tsx` lo expone (`useSave`) y aplica tema, sonido y vibración. Tests en `save.test.ts`.
- Tema por tokens CSS en `src/index.css` (`--fondo`, `--superficie`, `--texto`…; `data-theme="claro"`), expuestos a Tailwind con
  `@theme inline` (`bg-fondo`, `text-texto-suave`, …). Paleta criolla fija: tierra, paño, celeste, naranja, tinta.
- Fuentes empaquetadas (sin CDN): Rye (títulos, `font-criolla`), Fraunces (índices de cartas), Nunito (UI).
- Sonidos sintetizados con Web Audio en `src/audio/sfx.ts` (`playSfx`, `vibrate`); sin archivos de audio.
- **Arte del usuario**: `src/art/manifest.ts` (ids → `public/arte/...`), `<Art id fallback>` muestra un placeholder o un dibujo
  propio mientras falte el archivo. Checklist en `docs/arte.md`.
- **Mazos** (`src/cards/decks.ts`): `criolla` (SVG propio) y los tres **Mazo Argento** (`argento-nuevo`, `argento-memes`,
  `argento-campeon`, imágenes en `public/mazos/<id>/<cardId>.webp` + `dorso.webp`, usados con licencia: `docs/licencias/mazo-argento.md`).
  `<SpanishCard card width deck?>` dibuja con el mazo del `DeckContext` (el elegido en Ajustes); si falta una imagen, cae a la Criolla.
- **La Criolla** (`src/cards/`): `SpanishCard.tsx` (SVG 200×300, índice en dos esquinas, marco con pausas oro 0 / copa 1 /
  espada 2 / basto 3, ases fileteados, dorso fileteado), `suits.tsx` (oro con Sol de Mayo, copa con filete, espada con gavilanes,
  basto de algarrobo), `figures.tsx` (Sota = peón con boina, Caballo = gaucho en un overo, Rey = patrón con bigotón y rastra;
  caricatura, el color del palo en la ropa), `filete.tsx` (voluta, hoja, cinta celeste y blanca, borla).
- **PWA** (`vite.config.ts`): precachea app y fuentes; `mazos/` y `arte/` van con caché en tiempo de ejecución (CacheFirst) y
  al elegir un mazo se precargan sus 51 imágenes. Íconos provisorios en `public/icons/` (hasta que llegue `arte/icono.png`).
- Mobile-first: blancos táctiles ≥ 44px, sin scroll horizontal, `100dvh`, safe areas.

### Servidor (`apps/server`, Fase 7) — decisión: PartyServer + Cloudflare Durable Objects

- Una sala = un Durable Object. Es el **único** que tiene el estado completo; valida toda acción contra `getValidActions`
  y manda a cada conexión solo su `getPlayerView`. Chat, reacciones y señas aparte (señas solo al compañero).
- Identidad sin registro: `playerToken` secreto + apodo + avatar en el guardado local, para reconectar.

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

- [x] **Fase 0** — Monorepo, modelo de cartas, RNG con semilla, mezclar/repartir (24 tests), primera baraja SVG.
- [x] **Fase 1** — App "Juegos Argentinos": Inicio, Elegí un juego, ficha de cada juego con modos ("Próximamente") y
  "Cómo se juega", Perfil (apodo + avatar), Ajustes (sonido, vibración, tema paño/claro/auto, mazo, borrar datos),
  Mazos (Criolla + 3 Mazo Argento), guardado versionado (7 tests), sonidos Web Audio, PWA offline, placeholders de arte.
  *Esperando OK del usuario.*
- [ ] **Fase 2** — Truco: motor completo + bot con niveles + jugar contra la IA (1v1 y 2v2 con compañero bot).
- [ ] **Fase 3** — Gira Nacional del Truco + fósforos + logros (`packages/career`).
- [ ] **Fase 4** — Chinchón (motor, bot, gira).
- [ ] **Fase 5** — Casita Robada (motor, bot, gira).
- [ ] **Fase 6** — Tutti-Frutti (motor, bot con diccionario, gira).
- [ ] **Fase 7** — Online con amigos: salas con código + WhatsApp, lobby, reconexión, timer, chat/reacciones/señas, revancha.
- [ ] **Fase 8** — Pulido, resultados con momentos destacados, accesibilidad, deploy final (Vercel + Cloudflare).
