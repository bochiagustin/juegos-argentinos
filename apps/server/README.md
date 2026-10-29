# @juegos-argentinos/server

Servidor autoritativo de salas para jugar online con amigos.

- `src/sala.ts`: toda la lógica de una sala (lobby, partida, bots, relojes de turno, chat, señas, revancha). No sabe
  nada de la red: recibe mensajes y manda texto. Valida cada acción con el motor y le manda a cada uno solo su vista.
- `src/juegos.ts`: los cinco juegos online (motor, cantidades, cómo se sanea la configuración del host, bots, pausas).
- `src/protocolo.ts`: los mensajes (también los usa la app).
- `src/worker.ts`: producción en Cloudflare (PartyServer + Durable Objects): `wss://<host>/parties/sala/<CODIGO>`.
- `src/dev.ts`: lo mismo sobre Node + `ws`, para desarrollo y tests: `ws://localhost:8787/parties/sala/<CODIGO>`.

```bash
pnpm --filter @juegos-argentinos/server dev      # servidor local
pnpm --filter @juegos-argentinos/server test     # tests de la sala con reloj falso
pnpm --filter @juegos-argentinos/server run deploy   # Cloudflare (wrangler login antes)
```

Ver `docs/deploy.md` para publicar.
