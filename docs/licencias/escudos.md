# Licencia: escudos y nombres de clubes (modo Ascenso)

El modo Ascenso usa **nombres reales de clubes del fútbol argentino** y, cuando el usuario los sube, sus **escudos**
(`apps/web/public/arte/escudos/<id>.webp`). Son marcas de cada club y no son obra de este proyecto.

- **2026-10-30:** el dueño del proyecto eligió usar clubes reales con sus escudos y declaró que va a subir él los escudos
  con permiso para usarlos. Se le avisó que el repo es público, que la app está publicada y que los escudos y nombres
  son marcas registradas (riesgo de reclamo).
- **Origen:** los 116 escudos se bajaron de [FootyLogos](https://www.footylogos.com) (`tools/bajar-escudos.py`), a
  pedido del dueño del proyecto. FootyLogos es un índice: aclara que descargar un archivo **no** da licencia de marca ni de
  derechos de autor y que los derechos son de cada club. El uso en la app queda bajo la responsabilidad del dueño del proyecto.
- **Pendiente:** guardar acá el permiso, si lo hay (alcance, si cubre distribución pública).
- Mientras falte un escudo, la app dibuja uno genérico con los colores y la sigla del club (`ascenso/Escudo.tsx`).

Si hay un reclamo o el permiso no se confirma: borrar `apps/web/public/arte/escudos/` (queda el escudo dibujado) y,
si hace falta, cambiar los nombres en `packages/career/src/clubes.ts` por clubes inventados (los ids pueden quedar).
