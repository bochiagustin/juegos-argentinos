# Juegos Argentinos — truco, chinchón, casita robada, escoba y tutti-frutti

Web app mobile-first (PWA, anda sin internet) para jugar a **Truco, Chinchón, Casita Robada, Escoba de 15 y Tutti-Frutti**:
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
pnpm --filter @juegos-argentinos/server dev     # servidor de salas local (ws://localhost:8787), para "Con amigos"
pnpm --filter @juegos-argentinos/server run deploy   # sube el servidor a Cloudflare (ver docs/deploy.md)
python3 tools/extraer-mazos.py <pdf> <id>      # recorta un Mazo Argento de su PDF (poppler + Pillow)
```

## Arquitectura

Monorepo pnpm (`@juegos-argentinos/*`), TypeScript estricto en todo (`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`). Los paquetes se consumen como fuente TS (sin build intermedio; imports con extensión `.ts`).

```
packages/engine   Motor de reglas puro (sin UI, sin red) + bots. Vitest.
packages/career   Gira Nacional, logros, fósforos y tienda. Lógica pura (depende del motor solo por tipos).
apps/web          React 19 + Vite + Tailwind v4 + Motion + vite-plugin-pwa. Deploy en Vercel. Corre el motor en el navegador (offline).
apps/server       Servidor autoritativo de salas online (Cloudflare Durable Objects con PartyServer; en desarrollo, Node + ws).
tools/            Scripts sueltos (extraer mazos de PDF).
docs/             arte.md (checklist de ilustraciones), deploy.md (cómo publicar), licencias/, capturas por fase.
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
- Archivos: `core/cards.ts`, `core/deck.ts` (mazos 40/48 + comodines, Fisher–Yates, repartir), `core/rng.ts`, `core/game.ts`,
  `core/clone.ts` (copia profunda: `applyAction` trabaja sobre una copia, así el motor sigue puro).
- Subpaths por juego: `@juegos-argentinos/engine/{truco,chinchon,casita,escoba,tutti-frutti}`. Cada carpeta: `types.ts`, `game.ts` (la máquina de
  estados), `bot.ts` (`choose…Action`, perfil por nivel, `play…BotGame`), tests de reglas y simulaciones.
- Truco (`src/truco/`): `cards.ts` (jerarquía, tanto, flor), `types.ts`,
  `game.ts` (la máquina de estados `truco`), `bot.ts` (`chooseTrucoAction`, `botProfile`, `playBotGame`), tests
  (`game.test.ts`: reglas y casos borde; `simulation.test.ts`: 600 partidas al azar con invariantes en cada paso + fuerza de los bots).
- Cada juego irá en `src/<juego>/` con tests al lado, un bot (`bot.ts`) y una simulación de miles de partidas bot vs bot.
- `applyAction` devuelve `events` públicos (cantos, jugadas, bazas, tantos, puntos, fin de ronda/partida): la UI los usa para
  animar y sonar, y la carrera los va a usar para logros.

- Chinchón (`src/chinchon/`): `melds.ts` busca la mejor combinación exacta (DP sobre subconjuntos: grupos, escaleras,
  comodines con límite por combinación, 7-10 seguidos con 40 cartas) y el ligar (`bestWithLayoff`). El ligar al corte es
  **automático** (el motor elige lo mejor para cada uno). Reenganche automático (una vez) si está habilitado.
  Bot: peso del "futuro" de las cartas medido en simulación (~1): más alto o más bajo juega peor.
- Casita Robada (`src/casita/`): jugadas por carta (`jugadasPara`: mesa / robar a cada rival / propia / dejar); levantar es
  obligatorio si se puede. Bot: ganancia menos riesgo relativo de quedar expuesto; es un juego de mucha suerte
  (nivel 10 vs 1 ≈ 54% de victorias, 44% derrotas).
- Escoba (`src/escoba/`): `combinaciones(mesa, valor)` lista todos los grupos de la mesa que suman 15 con la carta tirada
  (la acción lleva `levanta: CardId[]`, vacío = dejarla). Escoba de mano al dar cada ronda (15 → 1, 30 partible → 2).
  Puntaje por bando (individual o parejas); empate en una categoría no la cobra nadie. Bot: valor de lo levantado +
  bonus de escoba − riesgo de dejarle escoba al rival (con las cartas que no vio). Nivel 10 vs 1 ≈ 87%, 10 vs 5 ≈ 72%.

- Tutti-Frutti (`src/tutti-frutti/`): `diccionario.ts` (rioplatense, 10 categorías, las más comunes primero),
  `game.ts` (fases escribiendo → basta → [revision] → resultado → fin; `normalizar`, `esValidaAuto`, `puntuarCategoria`,
  `conocida`). El tiempo no está en el motor: la **mesa** (`MESA`, el servidor o la app) manda `cerrar` (tiempo o cuenta
  regresiva) y `seguir`. El texto de `escribir` es libre (las acciones válidas son representativas); `applyAction` valida.
  Respuestas que la máquina no conoce = "dudosas": valen igual salvo que se voten (votación por mayoría, empate se acepta).
  Bot: `planTutti` (qué escribe y a qué ms), `votosTutti`; nivel = cuánto sabe y qué tan rápido escribe (20 s → 7 s por respuesta).

### Truco: decisiones de implementación

- Contesta un canto el **siguiente rival en el orden de juego** (en 2v2/3v3 no contesta "cualquiera del equipo").
- **Irse al mazo** concede la mano para todo el equipo. El rival cobra lo que vale la mano (o lo anterior si había un truco sin contestar).
- Después de una **parda** empieza el que había empezado la baza empardada. Dentro del mismo equipo, dos cartas iguales no son parda.
- Los **tantos** se cantan solos, en orden desde la mano: cada uno dice el suyo solo si supera al mejor; si no, "son buenas".
  No se puede mentir el tanto. Las cartas de quien declaró se muestran en el resumen de la mano.
- Si el envido (o la flor) lleva a alguien a los puntos, la partida termina en el acto.
- Con flor habilitada, el que tiene flor no puede ir al envido (canta flor). Flor sola: 3 por cada flor del equipo.
  Achicarse: 4. Contraflor querida: 6 a la mejor. Contraflor al resto querida: lo que vale la falta. Contraflor no querida: 4.
  *(provisorio, ver MEMORY.md)*
- Señas, chat de equipo y pica-pica quedan para el online (Fase 8): contra bots no aportan.

### IA (bots, desde la Fase 2)

- `chooseAction(view, valid, rng, skill)`: **juega limpio**, solo con la vista de su jugador (nunca ve cartas ocultas).
- `skill` 1–10 combina `errorRate`, `memory` (recuerda cartas jugadas), `bluff` (mentir truco/envido), `aggression`, `lookahead`.
  Niveles altos de Truco/Chinchón: Monte Carlo con determinización (reparte con semilla las cartas que no ve y simula).
- Carrera: skill fijo por rival, sube por región; el jefe tiene +2 y estilo propio. Partida rápida: skill adaptativo por rating tipo Elo.
- Tutti-Frutti offline: diccionarios rioplatenses por categoría y letra (`src/tutti-frutti/data/`).

### Carrera y logros (`packages/career`)

- `data.ts`: 6 regiones con umbrales (0/300/900/1700/2700/3900), 18 personajes inventados (id = `${region}-${slot}`,
  con frase y estilo: parejo/mentiroso/conservador/agresivo), giras de los cinco juegos (reglas por región,
  niveles 2→10), 18 logros, tienda (Mazo Argento 250/400/600 fósforos; el Nuevo se regala al ganarle al jefe de Buenos Aires).
- `career.ts`: `estadoGira`, `registrarPartida(state, reporte)` → `{state, premio}` (puntos, fósforos, logros, región
  desbloqueada, regalo), `comprar`, `normalizeCareer`. Los juegos mandan `Hecho`s (ej. `truco-tanto`, `menos-diez`, `casita-robos`).
- En la web: `src/carrera/` (`Gira.tsx` con mapa SVG propio `MapaGira.tsx`, `Logros.tsx`, `useCerrarPartida.ts`),
  `src/partidas/` (partida contra bots genérica `match.ts` + `useBotMatch.ts`, `FinPartida.tsx` común).
  Guardado v3 con `carrera`. Los Mazo Argento están bloqueados hasta comprarlos o ganarlos.

### Carrera y logros (diseño original)

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
- **Tutti-Frutti en la web** (`src/tutti/`): `TuttiSetup.tsx` (jugadores, rondas/puntos, tiempo, cuenta, categorías propias,
  letras), `TuttiMesa.tsx` (ruleta, reloj, bots que escriben con su plan, ¡BASTA! con cuenta regresiva, revisión con votos,
  resumen por categoría; controlador propio porque es en tiempo real).
- **Escoba en la web** (`src/escoba/`): `EscobaSetup.tsx`, `EscobaMesa.tsx` (sobre `useBotMatch`: tocás una carta y aparecen
  los grupos que suman 15 para elegir, cartel de escoba, resumen de ronda por categorías, hechos para los logros).
- **Online** (`src/online/`): `conexion.ts` (`ConexionSala`: WebSocket con reconexión y backoff, snapshot para
  `useSyncExternalStore`, lotes de eventos numerados para no perder ninguno), `Amigos.tsx` (crear / entrar con código),
  `Sala.tsx` (presentarse si no hay apodo, lobby, mesa online, reloj de turno, chat/reacciones/señas, fin con revancha).
  Servidor: `VITE_SERVIDOR_SALAS`, o Ajustes → Online, o en la red local `ws://<host>:8787`.
- **Mesas online**: las mismas mesas de cada juego con un `Remoto` (`partidas/remoto.ts`: vista, acciones válidas, lotes de
  eventos, mi asiento, relojes). `useBotMatch` y `useTrucoMatch` tienen modo local y remoto; `yo` reemplaza al asiento 0
  (el truco dibuja la mesa relativa a mi asiento). El fin espera a que se cierre el último resumen (`pendiente`).
- **Accesibilidad**: `Modal` es un diálogo (foco adentro, Escape), foco visible, `MotionConfig` respeta "reducir movimiento"
  y Ajustes → Accesibilidad (menos animaciones, letra más grande con `html[data-texto=grande]`).
- **Momentos de la partida** (`partidas/momentos.ts`): lo destacado de cada juego en la pantalla final (local y online).
- **Truco en la web** (`src/truco/`): `partida.ts` (partida contra la IA guardada en localStorage para retomarla, nombres de rivales),
  `useTrucoMatch.ts` (controlador: el motor en el navegador, los bots piensan 0,75–1,5 s, globos, voz y sonidos por evento,
  pausa con el resumen de cada mano), `TrucoMesa.tsx` (mesa 1v1/2v2/3v3, marcador con fósforos, solo botones válidos,
  cartas que vuelan a la mesa, resumen, fin con revancha), `TrucoSetup.tsx`, `ReglasTruco.tsx` (reglamento + jerarquía con cartas), `Fosforos.tsx`.
- **Nivel adaptativo** (`src/ia/nivel.ts`): rating tipo Elo por juego, guardado en `save.juegos[juego]` (guardado v2).
- **Voz** (`src/audio/voz.ts`): cantos y tantos con `speechSynthesis` (voz es-AR si hay); se apaga con el sonido.
- **Materiales** (`src/index.css`, en `@layer components` para que las utilidades de Tailwind les ganen): `.pano`, `.cuero`
  (+ `cuero-verde/rojo/azul/violeta/mostaza/oscuro`, con costura), `.madera`, `.bronce`, `.titulo-criollo`, `.btn-criollo`.
  Texturas procedurales en `public/texturas/` (`tools/generar-texturas.py`). Barra de pestañas en `Screen tab=…`.
  Las cartas de la Criolla tienen papel envejecido (degradé + textura).
- **PWA** (`vite.config.ts`): precachea app, fuentes y texturas; `mazos/` y `arte/` van con caché en tiempo de ejecución (CacheFirst) y
  al elegir un mazo se precargan sus 51 imágenes. Íconos provisorios en `public/icons/` (hasta que llegue `arte/icono.png`).
- Mobile-first: blancos táctiles ≥ 44px, sin scroll horizontal, `100dvh`, safe areas.

### Servidor (`apps/server`) — PartyServer + Cloudflare Durable Objects

- Una sala = un Durable Object (`worker.ts`, `SalaServer`, sin hibernación porque los relojes viven en memoria).
  `sala.ts` tiene toda la lógica y no sabe de red (recibe `mensaje(conn, texto)`, manda con `enviar`): la misma clase corre en
  Cloudflare y en Node (`dev.ts` con `ws`, mismas URLs `/parties/sala/<CODIGO>`). Tests con reloj falso (`sala.test.ts`).
- Es el **único** que tiene el estado completo: valida toda acción con `applyAction` del motor y manda a cada conexión solo su
  `getPlayerView` + `getValidActions` (no reenvía si la vista no cambió: cada tecla del tutti-frutti).
- `juegos.ts`: por juego, cantidades válidas, `sanear` (la config del host se limpia campo por campo), quién juega (`actor`),
  bot y pausas después de ciertos eventos (resumen de mano). Turno con reloj (20–90 s; desconectado 12 s): al vencer juega
  la máquina por vos (nivel 3). Tutti-frutti: el servidor es la "mesa" (ruleta, tiempo máximo, cuenta del basta, revisión).
- Lobby: el primero es el host (pasa a otro si se va); elige juego, reglas, tiempo por turno; agrega/saca máquinas; mueve
  asientos (equipos alternados). Revancha cuando la piden todos los humanos; el host puede volver a la sala.
- Chat (general o de equipo), reacciones (emojis fijos), señas del truco 2v2/3v3 (solo al compañero). Límite de 40 mensajes/s.
- Identidad sin registro: token secreto por dispositivo (`online/conexion.ts`, localStorage) + apodo + avatar. Reconectar con
  el mismo token devuelve el asiento y la vista. Código de sala: 5 letras (sin I ni O); link `?sala=CODIGO`.
- Protocolo en `src/protocolo.ts` (la web lo importa como `@juegos-argentinos/server/protocolo`).

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

### Escoba de 15

*(El usuario pasó https://www.ludoteka.com/juegos/escoba/reglas pero la red del entorno bloquea ese dominio; reglas del
reglamento rioplatense estándar, dudas en `MEMORY.md`.)*

- Mazo de 40. **Valores**: 1 a 7 su número; sota (10) = 8, caballo (11) = 9, rey (12) = 10.
- 2, 3 o 4 jugadores individuales, o 4 por parejas (compañeros enfrentados). Configurable.
- Reparto: 3 cartas a cada uno y 4 boca arriba en la mesa. Si las 4 de la mesa suman 15 (o 30, dos grupos de 15),
  el que reparte se las lleva y cuenta como escoba (dos, si son 30).
- Turno: tirás una carta. Si con esa carta y **una o más** cartas de la mesa sumás exactamente 15, levantás ese grupo
  (tu carta + las de la mesa). Si hay varias combinaciones posibles, elegís cuál. Si no levantás, la carta queda en la mesa.
- **Escoba**: si al levantar dejás la mesa vacía, 1 punto (se marca dejando una carta boca arriba en tu pila).
- Cuando todos se quedan sin cartas se reparten 3 más (la mesa no se repone) hasta terminar el mazo.
  Al final, lo que queda en la mesa se lo lleva el último que levantó (**no** cuenta como escoba).
- **Puntos de la ronda**: 1 por cada escoba; 1 a quien tiene más cartas; 1 a quien tiene más oros; 1 por el **7 de oro**
  ("el siete bello"); 1 a quien tiene más sietes. En empate de una categoría, nadie la cobra.
- La mano (quien reparte) rota en sentido antihorario. Partida a **15** puntos (configurable 21/31);
  si dos pasan la meta en la misma ronda, gana el que más tiene.
- UX: resaltar las combinaciones que suman 15 con la carta elegida, elegir grupo tocando cartas de la mesa,
  contador de escobas visible, animación de "¡ESCOBA!" con la mesa barriéndose.

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
- [x] **Fase 1** — App "Juegos Argentinos": Inicio, Elegí un juego, ficha de cada juego (5, Escoba incluida) con modos ("Próximamente") y
  "Cómo se juega", Perfil (apodo + avatar), Ajustes (sonido, vibración, tema paño/claro/auto, mazo, borrar datos),
  Mazos (Criolla + 3 Mazo Argento), guardado versionado (7 tests), sonidos Web Audio, PWA offline, placeholders de arte.
- [x] **Fase 2** — Truco contra la IA: motor completo (truco/retruco/vale 4, envido con cadenas y falta, "el envido está primero",
  flor opcional, pardas, mazo, malas y buenas), bot de niveles 1–10 con Monte Carlo, 1v1/2v2/3v3, nivel adaptativo,
  partida guardada, voz y lavado de cara (cuero, paño, madera, bronce, pestañas). 64 tests del motor + 14 de la web.
- [x] **Fase 3** — Gira Nacional (truco, chinchón y casita), 18 rivales con estilo, fósforos, 18 logros, tienda de mazos,
  pestaña Logros, mapa de la gira.
- [x] **Fase 4** — Chinchón: motor completo (combinaciones exactas, comodines, ligar, menos diez, chinchón, eliminación,
  reenganche, rebarajar), bot, mesa con mano reordenable y combinaciones resaltadas, gira.
- [x] **Fase 5** — Casita Robada: motor (levantar una/todas, robar con elección o prioridad, agrandar propia, parejas,
  sobrantes), bot, mesa con robos dramáticos, gira. 127 tests en total.
  *Fases 3, 4 y 5 hechas juntas a pedido del usuario.*
- [x] **Fase 6** — Escoba de 15: motor (combinaciones a elección, escoba de mano, sobrantes al último que levantó, 2/3/4 o
  parejas, a 15/21/31, levantar obligatorio opcional), bot, mesa con combinaciones y "¡ESCOBA!", resumen por categorías,
  gira y 3 logros. 146 tests en total.
- [x] **Fase 7** — Tutti-Frutti: motor (ruleta sin repetir, basta + cuenta, validación, repetidas, 20/10/5, votación,
  rondas o puntos con desempate), diccionario rioplatense, bot por nivel, mesa en tiempo real, gira y 3 logros.
- [x] **Fase 8** — Online con amigos: servidor de salas (Cloudflare Durable Objects + Node para desarrollo), los cinco juegos,
  salas con código + WhatsApp, lobby con máquinas y equipos, reconexión, reloj de turno, chat/reacciones/señas, revancha.
- [x] **Fase 9** — Pulido: momentos destacados, accesibilidad (diálogos, foco, menos animaciones, letra grande), CI, configs de
  deploy (publicado: app en Vercel, servidor en `juegos-argentinos-salas.agustinbochi20.workers.dev`; `vercel.json` + `tools/copiar-dist.mjs`: el build queda también en `./dist`, `wrangler.jsonc`, GitHub Actions) y guía `docs/deploy.md`. 177 tests.
  *Fases 7, 8 y 9 hechas seguidas a pedido del usuario ("completá todas las fases"). Esperando correcciones.*
