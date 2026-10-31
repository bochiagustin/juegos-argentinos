# Escudos del Ascenso

Los 116 clubes de las cuatro categorías y los 52 de afuera de la Libertadores y la Sudamericana (Primera 30, Primera Nacional 36, B Metropolitana 22, Primera C 28) salen de
[FootyLogos](https://www.footylogos.com/es/country/argentina), temporada 2026. El id de cada club en
`packages/career/src/clubes.ts` es el mismo que usa FootyLogos, así los escudos se bajan solos:

```bash
pip install cairosvg pillow
python3 tools/bajar-escudos.py            # baja los que falten → apps/web/public/arte/escudos/<id>.webp (256 px)
python3 tools/bajar-escudos.py river-plate  # o uno en particular (para actualizarlo)
```

Hace falta acceso a `www.footylogos.com` y `assets.footylogos.com`. Si un club cambia de escudo, se vuelve a bajar.
Para sumar un club: agregarlo en `clubes.ts` con su id de FootyLogos (y ajustar `TAMANO` para que la categoría quede par).
Escudos propios a mano: `python3 tools/escudos.py <carpeta>` (reconoce el club por el nombre del archivo).

Derechos: ver `docs/licencias/escudos.md`.

## Logos de ligas y copas

`python3 tools/bajar-escudos.py --torneos` baja los de las 4 ligas, la Libertadores y la Sudamericana a
`apps/web/public/arte/torneos/<id>.webp`. La Copa Argentina, la Copa de la Liga, la Supercopa y la Recopa no están en
FootyLogos: la app dibuja un emblema propio (`apps/web/src/ascenso/LogoTorneo.tsx`). Si conseguís esos logos con permiso,
guardalos como `copa-argentina.webp`, `copa-liga.webp`, `supercopa.webp` y `recopa.webp` en esa carpeta y sumalos a
`CON_IMAGEN`.
