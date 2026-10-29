# Cómo publicar Juegos Argentinos

Hay dos partes que se publican por separado:

| Parte | Qué es | Dónde va |
|---|---|---|
| La app (`apps/web`) | La PWA: los cinco juegos contra la máquina, la Gira, los logros. Anda sin internet. | **Vercel** (gratis) |
| El servidor de salas (`apps/server`) | Solo para jugar **con amigos**: una sala = un Durable Object. | **Cloudflare Workers** (plan gratis alcanza para empezar) |

Sin el servidor, la app funciona igual; lo único que no anda es "Con amigos".

## 1. Subir el código a GitHub

1. Creá un repositorio vacío en GitHub (por ejemplo `juegos-argentinos`, privado si querés).
2. Desde la carpeta del proyecto:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/juegos-argentinos.git
   git push -u origin main
   ```
3. GitHub Actions corre solo el **CI** (`.github/workflows/ci.yml`): typecheck, tests y build en cada push.

## 2. El servidor de salas en Cloudflare

1. Creá una cuenta en <https://dash.cloudflare.com> (gratis).
2. En tu compu, una sola vez:
   ```bash
   pnpm install
   pnpm --filter @juegos-argentinos/server exec wrangler login
   pnpm --filter @juegos-argentinos/server run deploy
   ```
3. Al terminar, wrangler muestra la dirección, algo como `https://juegos-argentinos-salas.<tu-cuenta>.workers.dev`.
   La de la app es la misma con **`wss://`** adelante: `wss://juegos-argentinos-salas.<tu-cuenta>.workers.dev`.
4. (Opcional) Deploy automático: en GitHub → Settings → Secrets and variables → Actions, cargá
   `CLOUDFLARE_API_TOKEN` (un token con permiso "Edit Cloudflare Workers") y `CLOUDFLARE_ACCOUNT_ID`.
   Desde ahí, cada cambio del servidor en `main` se sube solo (`.github/workflows/servidor.yml`).

## 3. La app en Vercel

1. Entrá a <https://vercel.com> con tu cuenta de GitHub → **Add New → Project** → elegí el repositorio.
2. No cambies nada de "Build & Output": ya está todo en `vercel.json` (pnpm, build de `apps/web`, salida `apps/web/dist`).
3. En **Environment Variables** agregá `VITE_SERVIDOR_SALAS` = `wss://juegos-argentinos-salas.<tu-cuenta>.workers.dev`.
4. **Deploy**. Cada push a `main` publica una versión nueva (y cada rama, una vista previa).

## 4. Probar

- Abrí la dirección de Vercel en el celu → menú del navegador → **Instalar app / Agregar a pantalla de inicio**.
- Modo avión: tiene que abrir y dejarte jugar contra la máquina.
- Con amigos: elegí un juego → **Con amigos** → **Crear sala** → **Invitar por WhatsApp**. El link abre la sala directo.

## Desarrollo local

```bash
pnpm dev                                    # la app en http://localhost:5173
pnpm --filter @juegos-argentinos/server dev # el servidor de salas en ws://localhost:8787
```

En la red local (`localhost`, `192.168.x.x`) la app usa sola el servidor de desarrollo del puerto 8787.
También se puede poner otra dirección a mano en **Ajustes → Online**.

## Antes de hacerlo público

- Los **Mazo Argento** se usan con la licencia que declaraste (`docs/licencias/mazo-argento.md`): confirmá que cubra
  una publicación abierta.
- Los rivales de la Gira son personajes inventados; si usás ilustraciones de personas reales, que tengan permiso.
